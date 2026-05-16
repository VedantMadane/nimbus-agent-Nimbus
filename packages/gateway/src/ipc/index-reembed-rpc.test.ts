import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import pino from "pino";
import { runIndexedSchemaMigrations } from "../index/migrations/runner.ts";
import { tryLoadSqliteVec } from "../index/sqlite-vec-load.ts";
import { MockVault } from "../vault/mock.ts";
import { dispatchIndexReembedRpc, IndexReembedRpcError } from "./index-reembed-rpc.ts";

function freshCtx() {
  const db = new Database(":memory:");
  tryLoadSqliteVec(db);
  runIndexedSchemaMigrations(db, 30);
  const events: Array<{ method: string; params: unknown }> = [];
  const ctx = {
    db,
    vault: new MockVault(),
    paths: { dataDir: "/tmp/nimbus-test" },
    logger: pino({ level: "silent" }),
    notify: (method: string, params: unknown) => {
      events.push({ method, params });
    },
  };
  return { db, ctx, events };
}

describe("dispatchIndexReembedRpc", () => {
  test("returns { kind: 'miss' } for unknown methods", async () => {
    const { ctx } = freshCtx();
    const out = await dispatchIndexReembedRpc("foo.bar", null, ctx);
    expect(out.kind).toBe("miss");
  });

  test("rejects missing model param", async () => {
    const { ctx } = freshCtx();
    await expect(dispatchIndexReembedRpc("index.reembed", {}, ctx)).rejects.toBeInstanceOf(
      IndexReembedRpcError,
    );
  });

  test("dryRun returns { jobId } and emits done notification", async () => {
    const { ctx, events } = freshCtx();
    const out = await dispatchIndexReembedRpc(
      "index.reembed",
      { model: "Xenova/all-MiniLM-L6-v2", dryRun: true, batchSize: 100 },
      ctx,
    );
    expect(out.kind).toBe("hit");
    const hit = (out as { kind: "hit"; value: { jobId: string } }).value;
    expect(hit.jobId).toMatch(/^reembed_/);
    await new Promise((r) => setTimeout(r, 50));
    expect(events.find((e) => e.method === "index.reembedDone")).toBeDefined();
  });

  test("openai:* without vault key yields fatal error", async () => {
    const { ctx, events } = freshCtx();
    const out = await dispatchIndexReembedRpc(
      "index.reembed",
      { model: "openai:text-embedding-3-small", batchSize: 100 },
      ctx,
    );
    expect(out.kind).toBe("hit");
    await new Promise((r) => setTimeout(r, 50));
    const err = events.find((e) => e.method === "index.reembedError");
    expect(err).toBeDefined();
    expect((err?.params as { message?: string }).message).toMatch(/openai\.api_key/);
  });

  test("cancel for unknown jobId returns { cancelled: false }", async () => {
    const { ctx } = freshCtx();
    const out = await dispatchIndexReembedRpc(
      "index.reembedCancel",
      { jobId: "reembed_does_not_exist" },
      ctx,
    );
    expect(out.kind).toBe("hit");
    expect((out as { kind: "hit"; value: { cancelled: boolean } }).value.cancelled).toBe(false);
  });
});
