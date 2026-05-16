import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { upsertIndexedItem } from "../index/item-store.ts";
import { LocalIndex } from "../index/local-index.ts";
import { runIndexedSchemaMigrations } from "../index/migrations/runner.ts";
import { isVecLoaded, tryLoadSqliteVec } from "../index/sqlite-vec-load.ts";
import { SqliteEmbeddingPipeline } from "./pipeline.ts";
import type { Embedder } from "./types.ts";

function vecAvailable(): boolean {
  const db = new Database(":memory:");
  tryLoadSqliteVec(db);
  const ok = isVecLoaded(db);
  db.close();
  return ok;
}
const VEC_AVAILABLE = vecAvailable();

function mockEmbedder(dim: number, model: string): Embedder {
  return {
    model,
    dims: dim,
    async embed(texts: string[]) {
      return texts.map(() => new Float32Array(dim).fill(0.01));
    },
  };
}

describe.skipIf(!VEC_AVAILABLE)("SqliteEmbeddingPipeline", () => {
  test("embedItem writes chunks and vectors; item delete cascades", async () => {
    const db = new Database(":memory:");
    LocalIndex.ensureSchema(db);
    const now = Date.now();
    upsertIndexedItem(db, {
      service: "filesystem",
      type: "file",
      externalId: "f1",
      title: "alpha",
      bodyPreview: "beta gamma",
      modifiedAt: now,
      syncedAt: now,
    });
    const itemId = "filesystem:f1";

    const pipeline = new SqliteEmbeddingPipeline({
      db,
      embedder: mockEmbedder(384, "test-model"),
    });
    await pipeline.embedItem({
      id: itemId,
      service: "filesystem",
      type: "file",
      title: "alpha",
      body_preview: "beta gamma",
    });

    const chunkCount = db.query("SELECT COUNT(*) AS c FROM embedding_chunk").get() as { c: number };
    expect(chunkCount.c).toBeGreaterThanOrEqual(1);
    const vecCount = db.query("SELECT COUNT(*) AS c FROM vec_items_384").get() as { c: number };
    expect(vecCount.c).toBe(chunkCount.c);

    db.run("DELETE FROM item WHERE id = ?", [itemId]);
    expect((db.query("SELECT COUNT(*) AS c FROM embedding_chunk").get() as { c: number }).c).toBe(
      0,
    );
    expect((db.query("SELECT COUNT(*) AS c FROM vec_items_384").get() as { c: number }).c).toBe(0);
  });

  test("deleteItemEmbeddings removes rows without deleting item", async () => {
    const db = new Database(":memory:");
    LocalIndex.ensureSchema(db);
    const now = Date.now();
    upsertIndexedItem(db, {
      service: "s",
      type: "file",
      externalId: "x",
      title: "t",
      modifiedAt: now,
      syncedAt: now,
    });
    const itemId = "s:x";
    const pipeline = new SqliteEmbeddingPipeline({ db, embedder: mockEmbedder(384, "m2") });
    await pipeline.embedItem({
      id: itemId,
      service: "s",
      type: "file",
      title: "t",
      body_preview: null,
    });
    await pipeline.deleteItemEmbeddings(itemId);
    expect((db.query("SELECT COUNT(*) AS c FROM embedding_chunk").get() as { c: number }).c).toBe(
      0,
    );
    const row = db.query("SELECT id FROM item WHERE id = ?").get(itemId);
    expect(row).not.toBeNull();
  });

  test("backfillAll embeds items missing the current model", async () => {
    const db = new Database(":memory:");
    LocalIndex.ensureSchema(db);
    const now = Date.now();
    for (const ext of ["a", "b"]) {
      upsertIndexedItem(db, {
        service: "s",
        type: "file",
        externalId: ext,
        title: `title ${ext}`,
        modifiedAt: now,
        syncedAt: now,
      });
    }
    const pipeline = new SqliteEmbeddingPipeline({
      db,
      embedder: mockEmbedder(384, "bf"),
      backfillBatchSize: 1,
    });
    let last: [number, number] = [0, 0];
    await pipeline.backfillAll((done, total) => {
      last = [done, total];
    });
    expect(last[1]).toBe(2);
    expect(last[0]).toBe(2);
    const c = db
      .query("SELECT COUNT(DISTINCT item_id) AS c FROM embedding_chunk WHERE model = 'bf'")
      .get() as {
      c: number;
    };
    expect(c.c).toBe(2);
  });
});

function stubEmbedder(model: string, dims: number): Embedder {
  return {
    model,
    dims,
    async embed(texts) {
      return texts.map(() => new Float32Array(dims));
    },
  };
}

function freshDb(): Database {
  const db = new Database(":memory:");
  if (!tryLoadSqliteVec(db)) {
    throw new Error("sqlite-vec required for these tests");
  }
  runIndexedSchemaMigrations(db, 30);
  return db;
}

describe.skipIf(!VEC_AVAILABLE)("SqliteEmbeddingPipeline — dim awareness", () => {
  test("rejects unsupported dims at construction", () => {
    const db = freshDb();
    expect(
      () =>
        new SqliteEmbeddingPipeline({
          db,
          embedder: stubEmbedder("bogus", 512),
        }),
    ).toThrow(/unsupported embedding dim/);
  });

  test("writes 1536-dim vectors to vec_items_1536", async () => {
    const db = freshDb();
    db.run(
      `INSERT INTO item (id, service, type, external_id, title, body_preview,
          modified_at, synced_at)
       VALUES (?, 'slack', 'message', 'e1', 'hello world', 'body', ?, ?)`,
      ["slack:e1", Date.now(), Date.now()],
    );
    const pipeline = new SqliteEmbeddingPipeline({
      db,
      embedder: stubEmbedder("openai:text-embedding-3-small", 1536),
    });
    await pipeline.embedItem({
      id: "slack:e1",
      service: "slack",
      type: "message",
      title: "hello world",
      body_preview: "body",
    });
    const chunks = db
      .query(`SELECT model, dims FROM embedding_chunk WHERE item_id = ?`)
      .all("slack:e1") as Array<{ model: string; dims: number }>;
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]?.dims).toBe(1536);
    const vecCount = (db.query(`SELECT count(*) AS c FROM vec_items_1536`).get() as { c: number })
      .c;
    expect(vecCount).toBe(chunks.length);
  });

  test("backfillForRoutingKeys with `in` scope only embeds matching items", async () => {
    const db = freshDb();
    const now = Date.now();
    const insertItem = (id: string, service: string, type: string) =>
      db.run(
        `INSERT INTO item (id, service, type, external_id, title, body_preview,
            modified_at, synced_at)
         VALUES (?, ?, ?, ?, 'T', NULL, ?, ?)`,
        [`${service}:${id}`, service, type, id, now, now],
      );
    insertItem("e1", "slack", "message");
    insertItem("e2", "github", "git_commit");
    insertItem("e3", "obsidian", "obsidian_note");

    const pipeline = new SqliteEmbeddingPipeline({
      db,
      embedder: stubEmbedder("openai:text-embedding-3-small", 1536),
    });
    await pipeline.backfillForRoutingKeys({
      in: ["slack:message", "obsidian:obsidian_note"],
    });

    const ids = db
      .query(`SELECT DISTINCT item_id FROM embedding_chunk ORDER BY item_id`)
      .all() as Array<{ item_id: string }>;
    expect(ids.map((r) => r.item_id)).toEqual(["obsidian:e3", "slack:e1"]);
  });

  test("backfillForRoutingKeys with `notIn` scope skips matching items", async () => {
    const db = freshDb();
    const now = Date.now();
    db.run(
      `INSERT INTO item (id, service, type, external_id, title, body_preview,
          modified_at, synced_at)
       VALUES (?, 'slack', 'message', 'e1', 'T', NULL, ?, ?)`,
      ["slack:e1", now, now],
    );
    db.run(
      `INSERT INTO item (id, service, type, external_id, title, body_preview,
          modified_at, synced_at)
       VALUES (?, 'github', 'git_commit', 'e2', 'T', NULL, ?, ?)`,
      ["github:e2", now, now],
    );
    const pipeline = new SqliteEmbeddingPipeline({
      db,
      embedder: stubEmbedder("Xenova/all-MiniLM-L6-v2", 384),
    });
    await pipeline.backfillForRoutingKeys({ notIn: ["slack:message"] });
    const ids = db.query(`SELECT DISTINCT item_id FROM embedding_chunk`).all() as Array<{
      item_id: string;
    }>;
    expect(ids.map((r) => r.item_id)).toEqual(["github:e2"]);
  });
});
