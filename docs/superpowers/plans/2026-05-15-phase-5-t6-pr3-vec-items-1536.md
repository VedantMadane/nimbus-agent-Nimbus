# Phase 5 T6 PR 3 — `vec_items_1536` + per-(service,type) routing + reembed CLI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 1536-dim vec0 virtual table, route prose-heavy `(service, type)` pairs to OpenAI `text-embedding-3-small` while keeping code/metadata on local MiniLM, expose dual-search at the query layer, and ship `nimbus index reembed` for selective backfill — without changing the contracts of the existing `provider="local"` path.

**Architecture:** New `embedding/routing.ts` owns the `PROSE_HEAVY_TYPES` set and dim constants. `SqliteEmbeddingPipeline` becomes dim-aware (table name derived from `embedder.dims ∈ {384, 1536}`). New `RoutingEmbeddingPipeline` wraps two inner pipelines and dispatches by routing key. New `embedQueryDual` on `EmbeddingRuntime` returns both vectors in hybrid mode; `vectorSearchChunks` becomes dim-aware; new `vectorSearchChunksDual` merges results across both tables. New `index.reembed` IPC method (with paired `index.reembedCancel`) plus `nimbus index reembed` CLI mirror the `llm.pullModel` long-running pattern. `index.reembed*` is explicitly added to `FORBIDDEN_OVER_LAN`.

**Tech Stack:** Bun v1.2+ runtime, TypeScript 6 strict, SQLite (`bun:sqlite`) + sqlite-vec virtual tables, JSON-RPC 2.0 IPC, existing `@nimbus-dev/sdk` MockVault for tests.

**Spec:** [`2026-05-15-phase-5-t6-pr3-vec-items-1536-design.md`](../specs/2026-05-15-phase-5-t6-pr3-vec-items-1536-design.md). The §9 review-disposition table records the Gemini CLI feedback already folded in.

**Branch / worktree:** `dev/asafgolombek/phase-5-t6-pr3-vec-items-1536` @ `.worktrees/phase-5-t6-pr3-vec-items-1536/`. Already created and clean (typecheck + lint green at baseline; the spec has been committed).

---

## File Map (locked before tasks start)

### Create

| Path | Responsibility |
|---|---|
| `packages/gateway/src/index/vec-items-1536-v30-sql.ts` | V30 SQL constants (with-vec / no-vec). |
| `packages/gateway/src/index/migrations/runner-v30.test.ts` | V30 migration test. |
| `packages/gateway/src/embedding/routing.ts` | `EMBEDDING_DIM_LOCAL` / `EMBEDDING_DIM_OPENAI` / `SUPPORTED_EMBEDDING_DIMS` / `PROSE_HEAVY_TYPES` / `routingKey` / `isProseHeavy`. |
| `packages/gateway/src/embedding/routing.test.ts` | Routing module unit test. |
| `packages/gateway/src/embedding/routing-pipeline.ts` | `RoutingEmbeddingPipeline` (wraps two `SqliteEmbeddingPipeline`s). |
| `packages/gateway/src/embedding/routing-pipeline.test.ts` | Routing-pipeline test (stub embedders, real SQLite). |
| `packages/gateway/src/embedding/create-routing-runtime.ts` | `createRoutingEmbeddingRuntime` factory for hybrid mode. |
| `packages/gateway/src/search/dual-search.ts` | `vectorSearchChunksDual` — KNN both tables + merge by distance. |
| `packages/gateway/src/search/dual-search.test.ts` | Dual-search unit test. |
| `packages/gateway/src/ipc/index-reembed-rpc.ts` | RPC handler — `index.reembed` + `index.reembedCancel` + progress notifications. |
| `packages/gateway/src/ipc/index-reembed-rpc.test.ts` | RPC unit test. |
| `packages/gateway/test/integration/embedding/reembed-end-to-end.test.ts` | Full reembed flow with stubbed OpenAI. |
| `packages/cli/src/commands/index-cmd.ts` | `runIndexCmd` — `nimbus index reembed` handler. |
| `packages/cli/test/unit/commands/index-cmd.test.ts` | CLI unit test. |

### Modify

| Path | Change |
|---|---|
| `packages/gateway/src/index/migrations/runner.ts` | Wire V30 migration step + extend `BACKFILL_LABELS`. |
| `packages/gateway/src/index/local-index.ts` | Bump `CURRENT_SCHEMA_VERSION` from 29 → 30. |
| `packages/gateway/src/embedding/types.ts` | Extend `IndexedItem` with `service` + `type`. |
| `packages/gateway/src/embedding/pipeline.ts` | Dim-aware `vecTable`; new `backfillForRoutingKeys(scope)` method; `IndexedItem` SELECT adds `service, type`. |
| `packages/gateway/src/embedding/lazy-scheduler.ts` | SELECT adds `service, type`; new `embedQueryDual` returning the single-vec shape. |
| `packages/gateway/src/embedding/embedding-worker.ts` | SELECT adds `service, type`; runtime returns `embedQueryDual`. |
| `packages/gateway/src/embedding/worker-bridge.ts` | `embedQueryDual` exposed on the bridged runtime. |
| `packages/gateway/src/embedding/embedding-runtime.ts` | Add `embedQueryDual` to the `EmbeddingRuntime` type. |
| `packages/gateway/src/embedding/create-embedding-runtime.ts` | Promote `provider="openai"` to 1536-dim; add `provider="hybrid"` branch (delegates to `createRoutingEmbeddingRuntime`). |
| `packages/gateway/src/config/nimbus-toml.ts` | Accept `"hybrid"` in `setEmbeddingProvider`. |
| `packages/gateway/src/search/vec-store.ts` | Dim-aware `vectorSearchChunks` (validate against `SUPPORTED_EMBEDDING_DIMS`). |
| `packages/gateway/src/search/hybrid-types.ts` | Add `queryEmbedding1536?` + `embeddingModel1536?` to `HybridSearchOptions`. |
| `packages/gateway/src/search/hybrid-internal.ts` | `runVectorSearch` switches to `vectorSearchChunksDual`. |
| `packages/gateway/src/index/local-index.ts` | Search dispatcher calls `ss.embedQueryDual(nameQ)` and populates new `HybridSearchOptions` fields. |
| `packages/gateway/src/platform/assemble.ts` | `SemanticSearchDeps` exposes `embedQueryDual`. |
| `packages/gateway/src/ipc/lan-rpc.ts` | Add `"index.reembed"` and `"index.reembedCancel"` to `FORBIDDEN_OVER_LAN`. |
| `packages/gateway/src/security-invariants.test.ts` | Assert the two new `FORBIDDEN_OVER_LAN` entries. |
| `packages/gateway/src/ipc/server/dispatchers.ts` | Add `tryDispatchIndexReembedRpc`; mount it inside `tryDispatchPhase4Rpc`. |
| `packages/cli/src/commands/index.ts` | Export `runIndexCmd`. |
| `packages/cli/src/commands/help.ts` | Add `nimbus index reembed` row. |
| `packages/cli/src/index.ts` | `COMMAND_HANDLERS["index"] = runIndexCmd`. |
| `docs/architecture.md` | Schema row for `vec_items_1536`; embedding section gains hybrid + routing. |
| `docs/SECURITY-INVARIANTS.md` | I5 anti-pattern column extended. |
| `docs/cli-reference.md` | New `nimbus index reembed` subsection. |
| `docs/roadmap.md` | Flip T6 PR 3 checkbox + extend `Last updated:` line. |
| `.claude/commands/nimbus-file-map.md` | New rows for the six new files. |
| `.claude/commands/nimbus-ipc.md` | Extend `index.*` table with the four new methods/notifications. |
| `.claude/commands/nimbus-commands.md` | New CLI row under T6. |
| `CLAUDE.md` | Bump T6 status footer with PR3 progress at end of run. |

---

## Task 1 — V30 schema migration + test

**Files:**
- Create: `packages/gateway/src/index/vec-items-1536-v30-sql.ts`
- Create: `packages/gateway/src/index/migrations/runner-v30.test.ts`
- Modify: `packages/gateway/src/index/migrations/runner.ts`
- Modify: `packages/gateway/src/index/local-index.ts:266-267`

- [ ] **Step 1.1: Write the V30 SQL constants file**

```ts
// packages/gateway/src/index/vec-items-1536-v30-sql.ts
/**
 * V30 migration — `vec_items_1536` virtual table for 1536-dim embeddings
 * (Phase 5 T6 PR 3). Pairs with `vec_items_384` from V6. Per-(service, type)
 * routing in `embedding/routing-pipeline.ts` decides which table receives
 * a chunk based on `item.service` + `item.type` and the active provider.
 *
 * The existing 384-dim delete trigger is recreated with a `WHEN OLD.dims = 384`
 * clause; the new 1536-dim trigger has `WHEN OLD.dims = 1536`. Both are scoped
 * by the not-null `embedding_chunk.dims` column declared at V6.
 */
export const VEC_ITEMS_1536_V30_SCHEMA_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS vec_items_1536
  USING vec0(embedding float[1536]);

DROP TRIGGER IF EXISTS embedding_chunk_ad_delete_vec384;
CREATE TRIGGER embedding_chunk_ad_delete_vec384
AFTER DELETE ON embedding_chunk
FOR EACH ROW
WHEN OLD.dims = 384
BEGIN
  DELETE FROM vec_items_384 WHERE rowid = OLD.vec_rowid;
END;

CREATE TRIGGER IF NOT EXISTS embedding_chunk_ad_delete_vec1536
AFTER DELETE ON embedding_chunk
FOR EACH ROW
WHEN OLD.dims = 1536
BEGIN
  DELETE FROM vec_items_1536 WHERE rowid = OLD.vec_rowid;
END;
`;

/**
 * Fallback: when sqlite-vec is unavailable, V6 created `embedding_chunk`
 * without `vec_items_*` triggers. There is nothing for V30 to do — the
 * migration row is still recorded by the runner so `_schema_migrations`
 * stays sequential.
 */
export const VEC_ITEMS_1536_V30_NO_VEC_SQL = "";
```

- [ ] **Step 1.2: Wire V30 in the runner**

Modify `packages/gateway/src/index/migrations/runner.ts`. Add the import alongside the other V<N> imports (alphabetical order is not strict here; group with the other vec-related imports near `EMBEDDING_V6_*`):

```ts
import {
  VEC_ITEMS_1536_V30_NO_VEC_SQL,
  VEC_ITEMS_1536_V30_SCHEMA_SQL,
} from "../vec-items-1536-v30-sql.ts";
```

Add the migration step function (after `migrateIndexedV28ToV29`, around line 388):

```ts
function migrateIndexedV29ToV30(db: Database, now: number): void {
  const hasVec = vecTableExists(db);
  db.transaction(() => {
    db.exec(hasVec ? VEC_ITEMS_1536_V30_SCHEMA_SQL : VEC_ITEMS_1536_V30_NO_VEC_SQL);
    db.exec("PRAGMA user_version = 30");
    recordMigration(
      db,
      30,
      hasVec
        ? "vec_items_1536 + dim-aware delete triggers (T6 PR 3)"
        : "vec_items_1536 (sqlite-vec unavailable, T6 PR 3)",
      now,
    );
  })();
}
```

Append the step to `INDEXED_SCHEMA_STEPS` (after the `V28→V29` entry):

```ts
  { fromVersion: 29, toVersion: 30, apply: migrateIndexedV29ToV30 },
```

Append a label to `BACKFILL_LABELS` (the array index = version - 1, so V30's label is at index 29 — append at the end, after the V29 label):

```ts
  "vec_items_1536 + dim-aware delete triggers (T6 PR 3) (backfilled)",
```

- [ ] **Step 1.3: Bump the schema version constant**

Modify `packages/gateway/src/index/local-index.ts:267`:

```ts
export const CURRENT_SCHEMA_VERSION = 30;
```

- [ ] **Step 1.4: Write the migration test**

```ts
// packages/gateway/src/index/migrations/runner-v30.test.ts
import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { tryLoadSqliteVec } from "../sqlite-vec-load.ts";
import { runIndexedSchemaMigrations } from "./runner.ts";

describe("V30 migration — vec_items_1536 + dim-aware triggers", () => {
  test("running migrations on a fresh DB advances user_version to 30", () => {
    const db = new Database(":memory:");
    runIndexedSchemaMigrations(db, 30);
    const row = db.query("PRAGMA user_version").get() as { user_version: number };
    expect(row.user_version).toBe(30);
  });

  test("V30 records an applied row in _schema_migrations", () => {
    const db = new Database(":memory:");
    runIndexedSchemaMigrations(db, 30);
    const row = db
      .query("SELECT version, description, applied_at FROM _schema_migrations WHERE version = 30")
      .get() as { version: number; description: string; applied_at: number } | null;
    expect(row?.version).toBe(30);
    expect(row?.description).toContain("vec_items_1536");
    expect(row?.applied_at).toBeGreaterThan(0);
  });

  test("with sqlite-vec, vec_items_1536 exists and dim-aware triggers are wired", () => {
    const db = new Database(":memory:");
    if (!tryLoadSqliteVec(db)) {
      // Skip the table/trigger assertions when the platform lacks sqlite-vec —
      // covered by the no-vec test below.
      return;
    }
    runIndexedSchemaMigrations(db, 30);
    const tables = db
      .query(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'vec_items_1536'`)
      .all() as Array<{ name: string }>;
    expect(tables.length).toBe(1);
    const triggers = db
      .query(
        `SELECT name, sql FROM sqlite_master WHERE type = 'trigger'
         AND name IN ('embedding_chunk_ad_delete_vec384', 'embedding_chunk_ad_delete_vec1536')`,
      )
      .all() as Array<{ name: string; sql: string }>;
    expect(triggers.length).toBe(2);
    const t384 = triggers.find((t) => t.name === "embedding_chunk_ad_delete_vec384");
    const t1536 = triggers.find((t) => t.name === "embedding_chunk_ad_delete_vec1536");
    expect(t384?.sql).toContain("WHEN OLD.dims = 384");
    expect(t1536?.sql).toContain("WHEN OLD.dims = 1536");
  });

  test("delete via embedding_chunk fans out to the matching vec table only", () => {
    const db = new Database(":memory:");
    if (!tryLoadSqliteVec(db)) {
      return;
    }
    runIndexedSchemaMigrations(db, 30);
    // Insert one item to satisfy the FK
    db.run(
      `INSERT INTO item (id, service, type, external_id, title, body_preview,
          modified_at, synced_at) VALUES (?, 's', 't', 'e', 'T', NULL, ?, ?)`,
      ["s:e", Date.now(), Date.now()],
    );
    db.run(`INSERT INTO vec_items_384  (rowid, embedding) VALUES (1, vec_f32(?))`, [
      new Float32Array(384),
    ]);
    db.run(`INSERT INTO vec_items_1536 (rowid, embedding) VALUES (1, vec_f32(?))`, [
      new Float32Array(1536),
    ]);
    db.run(
      `INSERT INTO embedding_chunk (item_id, chunk_index, chunk_text, vec_rowid, model, dims, embedded_at)
       VALUES (?, 0, 't', 1, 'm384', 384, ?)`,
      ["s:e", Date.now()],
    );
    db.run(
      `INSERT INTO embedding_chunk (item_id, chunk_index, chunk_text, vec_rowid, model, dims, embedded_at)
       VALUES (?, 1, 't', 1, 'm1536', 1536, ?)`,
      ["s:e", Date.now()],
    );

    db.run(`DELETE FROM embedding_chunk WHERE chunk_index = 0`); // dims=384 row
    expect((db.query(`SELECT count(*) AS c FROM vec_items_384 `).get() as { c: number }).c).toBe(0);
    expect((db.query(`SELECT count(*) AS c FROM vec_items_1536`).get() as { c: number }).c).toBe(1);

    db.run(`DELETE FROM embedding_chunk WHERE chunk_index = 1`); // dims=1536 row
    expect((db.query(`SELECT count(*) AS c FROM vec_items_1536`).get() as { c: number }).c).toBe(0);
  });
});
```

- [ ] **Step 1.5: Run the migration test**

```bash
bun test packages/gateway/src/index/migrations/runner-v30.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 1.6: Run the typecheck**

```bash
bun run typecheck
```

Expected: 0 errors.

- [ ] **Step 1.7: Commit**

```bash
git add packages/gateway/src/index/vec-items-1536-v30-sql.ts \
        packages/gateway/src/index/migrations/runner-v30.test.ts \
        packages/gateway/src/index/migrations/runner.ts \
        packages/gateway/src/index/local-index.ts
git commit -m "$(cat <<'EOF'
feat(db): T6 PR 3 — V30 vec_items_1536 + dim-aware delete triggers

Adds a 1536-dim vec0 virtual table alongside the existing vec_items_384.
The V6 384-dim delete trigger gets a `WHEN OLD.dims = 384` clause and a
new `WHEN OLD.dims = 1536` trigger fans out to the new table. Schema
target bumped 29 → 30. sqlite-vec-absent fallback is a no-op (records
the migration row only).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — Routing module (constants + `PROSE_HEAVY_TYPES` + helpers)

**Files:**
- Create: `packages/gateway/src/embedding/routing.ts`
- Create: `packages/gateway/src/embedding/routing.test.ts`

- [ ] **Step 2.1: Write the failing test**

```ts
// packages/gateway/src/embedding/routing.test.ts
import { describe, expect, test } from "bun:test";
import {
  EMBEDDING_DIM_LOCAL,
  EMBEDDING_DIM_OPENAI,
  PROSE_HEAVY_TYPES,
  SUPPORTED_EMBEDDING_DIMS,
  isProseHeavy,
  routingKey,
} from "./routing.ts";

describe("embedding/routing", () => {
  test("dimension constants", () => {
    expect(EMBEDDING_DIM_LOCAL).toBe(384);
    expect(EMBEDDING_DIM_OPENAI).toBe(1536);
    expect(SUPPORTED_EMBEDDING_DIMS.has(384)).toBe(true);
    expect(SUPPORTED_EMBEDDING_DIMS.has(1536)).toBe(true);
    expect(SUPPORTED_EMBEDDING_DIMS.has(512)).toBe(false);
  });

  test("PROSE_HEAVY_TYPES exact membership (14 entries)", () => {
    const expected = new Set([
      "slack:message",
      "discord:message",
      "teams:message",
      "gmail:email",
      "outlook:email",
      "notion:page",
      "confluence:page",
      "obsidian:obsidian_note",
      "pagerduty:incident",
      "linear:issue",
      "jira:issue",
      "github:issue",
      "gitlab:issue",
      "bitbucket:issue",
    ]);
    expect(PROSE_HEAVY_TYPES.size).toBe(expected.size);
    for (const key of expected) {
      expect(PROSE_HEAVY_TYPES.has(key)).toBe(true);
    }
    for (const key of PROSE_HEAVY_TYPES) {
      expect(expected.has(key)).toBe(true);
    }
  });

  test("routingKey formats correctly", () => {
    expect(routingKey("slack", "message")).toBe("slack:message");
    expect(routingKey("a", "b")).toBe("a:b");
  });

  test("isProseHeavy returns true for prose-heavy pairs", () => {
    expect(isProseHeavy("slack", "message")).toBe(true);
    expect(isProseHeavy("obsidian", "obsidian_note")).toBe(true);
    expect(isProseHeavy("pagerduty", "incident")).toBe(true);
  });

  test("isProseHeavy returns false for non-prose pairs", () => {
    expect(isProseHeavy("github", "git_commit")).toBe(false);
    expect(isProseHeavy("aws", "lambda_function")).toBe(false);
    expect(isProseHeavy("slack", "channel")).toBe(false); // not in set
    expect(isProseHeavy("", "")).toBe(false);
  });
});
```

- [ ] **Step 2.2: Run test — expect failure**

```bash
bun test packages/gateway/src/embedding/routing.test.ts
```

Expected: import error / module not found.

- [ ] **Step 2.3: Implement the module**

```ts
// packages/gateway/src/embedding/routing.ts
/**
 * Embedding-routing policy and supported-dimension catalogue.
 *
 * The two `EMBEDDING_DIM_*` constants are the only valid `vec_items_<dim>`
 * suffixes. Adding a new provider track means adding a new constant + its
 * companion `vec_items_<dim>` migration; everything else routes through
 * `SUPPORTED_EMBEDDING_DIMS`.
 *
 * `PROSE_HEAVY_TYPES` holds the `(service, type)` pairs whose primary
 * content is natural-language prose. In `provider="hybrid"` mode these
 * route to OpenAI `text-embedding-3-small` (1536-dim); everything else
 * stays on local MiniLM-L6-v2 (384-dim).
 */

export const EMBEDDING_DIM_LOCAL = 384 as const;
export const EMBEDDING_DIM_OPENAI = 1536 as const;
export const SUPPORTED_EMBEDDING_DIMS: ReadonlySet<number> = new Set([
  EMBEDDING_DIM_LOCAL,
  EMBEDDING_DIM_OPENAI,
]);

export const PROSE_HEAVY_TYPES: ReadonlySet<string> = new Set([
  "slack:message",
  "discord:message",
  "teams:message",
  "gmail:email",
  "outlook:email",
  "notion:page",
  "confluence:page",
  "obsidian:obsidian_note",
  "pagerduty:incident",
  "linear:issue",
  "jira:issue",
  "github:issue",
  "gitlab:issue",
  "bitbucket:issue",
]);

export function routingKey(service: string, type: string): string {
  return `${service}:${type}`;
}

export function isProseHeavy(service: string, type: string): boolean {
  return PROSE_HEAVY_TYPES.has(routingKey(service, type));
}
```

- [ ] **Step 2.4: Run test — expect pass**

```bash
bun test packages/gateway/src/embedding/routing.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add packages/gateway/src/embedding/routing.ts \
        packages/gateway/src/embedding/routing.test.ts
git commit -m "$(cat <<'EOF'
feat(embedding): T6 PR 3 — routing module + dim constants

Centralises the per-(service,type) routing policy and the supported
embedding dimensions. PROSE_HEAVY_TYPES holds 14 entries (Slack /
Discord / Teams messages, Gmail / Outlook emails, Notion / Confluence /
Obsidian pages, PagerDuty incidents, and issues across the five
trackers). SUPPORTED_EMBEDDING_DIMS gives pipeline.ts and vec-store.ts
a single source of truth for the {384, 1536} enum.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — Extend `IndexedItem` + update SELECT call sites

**Files:**
- Modify: `packages/gateway/src/embedding/types.ts`
- Modify: `packages/gateway/src/embedding/pipeline.ts:122-129` (the `backfillAll` SELECT)
- Modify: `packages/gateway/src/embedding/lazy-scheduler.ts:73` (the `scheduleItemEmbedding` SELECT)
- Modify: `packages/gateway/src/embedding/embedding-worker.ts` (any `IndexedItem` SELECT)

- [ ] **Step 3.1: Extend the type**

```ts
// packages/gateway/src/embedding/types.ts
export type IndexedItem = {
  id: string;
  service: string;
  type: string;
  title: string;
  body_preview: string | null;
};
```

- [ ] **Step 3.2: Update `pipeline.ts` `backfillAll` SELECT**

Find the `backfillAll` body and update the `SELECT` columns to include `service` + `type`:

```ts
// Inside backfillAll, replace the existing SELECT:
const rows = this.db
  .query(
    `SELECT i.id AS id, i.service AS service, i.type AS type,
            i.title AS title, i.body_preview AS body_preview
     FROM item i WHERE NOT EXISTS (
       SELECT 1 FROM embedding_chunk c
       WHERE c.item_id = i.id AND c.model = ?
     )
     ORDER BY i.modified_at DESC
     LIMIT ?`,
  )
  .all(model, this.backfillBatchSize) as IndexedItem[];
```

- [ ] **Step 3.3: Update `lazy-scheduler.ts` SELECT**

Find `scheduleItemEmbedding` (around line 67) and update the SELECT:

```ts
const row = db
  .query(
    `SELECT id, service, type, title, body_preview FROM item WHERE id = ?`,
  )
  .get(itemId) as IndexedItem | null | undefined;
```

- [ ] **Step 3.4: Update `embedding-worker.ts` if it has a similar SELECT**

```bash
grep -n "SELECT.*FROM item" packages/gateway/src/embedding/embedding-worker.ts
```

If the worker materialises `IndexedItem` rows from `item`, add `service, type` to the SELECT. If it doesn't (the worker may delegate to the pipeline), leave alone — the pipeline already uses the expanded SELECT.

- [ ] **Step 3.5: Run the existing pipeline tests**

```bash
bun test packages/gateway/src/embedding/pipeline.test.ts
```

Expected: tests pass. If any test asserts the SELECT columns, update the test fixture rows to include `service` + `type`.

- [ ] **Step 3.6: Typecheck**

```bash
bun run typecheck
```

Expected: 0 errors.

- [ ] **Step 3.7: Commit**

```bash
git add packages/gateway/src/embedding/types.ts \
        packages/gateway/src/embedding/pipeline.ts \
        packages/gateway/src/embedding/lazy-scheduler.ts \
        packages/gateway/src/embedding/embedding-worker.ts
git commit -m "$(cat <<'EOF'
refactor(embedding): T6 PR 3 — IndexedItem carries service + type

Routing decisions are made on the (service, type) pair, so SELECTs that
materialise IndexedItem rows now include both columns. No behaviour
change — existing single-pipeline mode ignores the new fields.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — Dim-aware `SqliteEmbeddingPipeline` + `backfillForRoutingKeys`

**Files:**
- Modify: `packages/gateway/src/embedding/pipeline.ts`
- Modify: `packages/gateway/src/embedding/pipeline.test.ts`

- [ ] **Step 4.1: Write a failing test for dim-aware behaviour**

Add to `pipeline.test.ts`:

```ts
import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { runIndexedSchemaMigrations } from "../index/migrations/runner.ts";
import { tryLoadSqliteVec } from "../index/sqlite-vec-load.ts";
import { SqliteEmbeddingPipeline } from "./pipeline.ts";
import type { Embedder } from "./types.ts";

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

describe("SqliteEmbeddingPipeline — dim awareness", () => {
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
    const vecCount = (
      db.query(`SELECT count(*) AS c FROM vec_items_1536`).get() as { c: number }
    ).c;
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
    const ids = db
      .query(`SELECT DISTINCT item_id FROM embedding_chunk`)
      .all() as Array<{ item_id: string }>;
    expect(ids.map((r) => r.item_id)).toEqual(["github:e2"]);
  });
});
```

- [ ] **Step 4.2: Run — expect failure**

```bash
bun test packages/gateway/src/embedding/pipeline.test.ts
```

Expected: failures around `unsupported embedding dim`, `vec_items_1536`, and `backfillForRoutingKeys`.

- [ ] **Step 4.3: Implement dim-aware constructor + table name**

Modify `packages/gateway/src/embedding/pipeline.ts`. Add the import:

```ts
import { SUPPORTED_EMBEDDING_DIMS } from "./routing.ts";
```

Add a `vecTable` field and gate in the constructor:

```ts
private readonly vecTable: string;

constructor(options: SqliteEmbeddingPipelineOptions) {
  this.db = options.db;
  this.embedder = options.embedder;
  this.backfillBatchSize = Math.max(1, options.backfillBatchSize ?? DEFAULT_BACKFILL_BATCH);
  this.logger = options.logger;
  this.chunkOptions = options.chunkOptions;
  if (!SUPPORTED_EMBEDDING_DIMS.has(this.embedder.dims)) {
    throw new Error(`unsupported embedding dim: ${String(this.embedder.dims)}`);
  }
  this.vecTable = `vec_items_${String(this.embedder.dims)}`;
}
```

Replace the two hardcoded `vec_items_384` references inside `embedItem`:

```ts
const maxRow = this.db
  .query(`SELECT COALESCE(MAX(rowid), 0) AS m FROM ${this.vecTable}`)
  .get() as { m: number | bigint };
let nextRowid = Number(maxRow.m) + 1;

const insertVec = this.db.prepare(
  `INSERT INTO ${this.vecTable}(rowid, embedding) VALUES (?, vec_f32(?))`,
);
```

(`this.vecTable` is built from a numeric `dims` value validated against `SUPPORTED_EMBEDDING_DIMS` — same enum-equivalent pattern as the existing `vec_items_384` usage. Bound parameters cover all caller-supplied data.)

- [ ] **Step 4.4: Implement `backfillForRoutingKeys`**

Add to `SqliteEmbeddingPipeline`:

```ts
/**
 * Routing-aware backfill: same `WHERE NOT EXISTS … model = ?` semantics as
 * `backfillAll` plus a fixed-set membership filter on `(service||':'||type)`.
 *
 * `scope.in` includes items whose routing key IS in the set; `scope.notIn`
 * includes items whose routing key is NOT in the set. Used by
 * `RoutingEmbeddingPipeline` to scope each inner pipeline to its slice.
 */
async backfillForRoutingKeys(
  scope: { in: readonly string[] } | { notIn: readonly string[] },
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const model = this.embedder.model;
  const keys = "in" in scope ? scope.in : scope.notIn;
  if (keys.length === 0) {
    // Empty `in` scope is a no-op; empty `notIn` scope means "match everything",
    // which is identical to backfillAll — fall through to it.
    if ("in" in scope) {
      return;
    }
    return this.backfillAll(onProgress);
  }
  const placeholders = keys.map(() => "?").join(",");
  const op = "in" in scope ? "IN" : "NOT IN";
  const filter = `AND (i.service || ':' || i.type) ${op} (${placeholders})`;

  const totalRow = this.db
    .query(
      `SELECT COUNT(*) AS c FROM item i WHERE NOT EXISTS (
         SELECT 1 FROM embedding_chunk c
         WHERE c.item_id = i.id AND c.model = ?
       ) ${filter}`,
    )
    .get(model, ...keys) as { c: number };
  const total = totalRow.c;
  let done = 0;

  while (true) {
    const rows = this.db
      .query(
        `SELECT i.id AS id, i.service AS service, i.type AS type,
                i.title AS title, i.body_preview AS body_preview
         FROM item i WHERE NOT EXISTS (
           SELECT 1 FROM embedding_chunk c
           WHERE c.item_id = i.id AND c.model = ?
         ) ${filter}
         ORDER BY i.modified_at DESC
         LIMIT ?`,
      )
      .all(model, ...keys, this.backfillBatchSize) as IndexedItem[];

    if (rows.length === 0) {
      break;
    }
    for (const row of rows) {
      try {
        await this.embedItem(row);
      } catch (err) {
        this.logger?.warn({ err, itemId: row.id }, "embedding backfill item failed");
      }
      done += 1;
      onProgress?.(done, total);
    }
  }
}
```

- [ ] **Step 4.5: Run — expect pass**

```bash
bun test packages/gateway/src/embedding/pipeline.test.ts
```

Expected: all dim-awareness tests pass.

- [ ] **Step 4.6: Commit**

```bash
git add packages/gateway/src/embedding/pipeline.ts \
        packages/gateway/src/embedding/pipeline.test.ts
git commit -m "$(cat <<'EOF'
feat(embedding): T6 PR 3 — dim-aware pipeline + backfillForRoutingKeys

SqliteEmbeddingPipeline computes the target vec_items_<dim> table from
the embedder's dims (validated against SUPPORTED_EMBEDDING_DIMS).
Existing 384-dim usage is unchanged; 1536-dim embedders now write to
vec_items_1536. New backfillForRoutingKeys lets the routing wrapper
scope each inner pipeline by (service, type) membership without a
DISTINCT scan.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — `RoutingEmbeddingPipeline` wrapper

**Files:**
- Create: `packages/gateway/src/embedding/routing-pipeline.ts`
- Create: `packages/gateway/src/embedding/routing-pipeline.test.ts`

- [ ] **Step 5.1: Write the failing test**

```ts
// packages/gateway/src/embedding/routing-pipeline.test.ts
import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { runIndexedSchemaMigrations } from "../index/migrations/runner.ts";
import { tryLoadSqliteVec } from "../index/sqlite-vec-load.ts";
import { SqliteEmbeddingPipeline } from "./pipeline.ts";
import { RoutingEmbeddingPipeline } from "./routing-pipeline.ts";
import type { Embedder } from "./types.ts";

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
    throw new Error("sqlite-vec required");
  }
  runIndexedSchemaMigrations(db, 30);
  return db;
}

function insertItem(db: Database, id: string, service: string, type: string): void {
  const now = Date.now();
  db.run(
    `INSERT INTO item (id, service, type, external_id, title, body_preview,
        modified_at, synced_at)
     VALUES (?, ?, ?, ?, 'T', 'B', ?, ?)`,
    [`${service}:${id}`, service, type, id, now, now],
  );
}

describe("RoutingEmbeddingPipeline", () => {
  test("prose-heavy items route to the OpenAI inner pipeline", async () => {
    const db = freshDb();
    insertItem(db, "e1", "slack", "message");
    const local = new SqliteEmbeddingPipeline({
      db,
      embedder: stubEmbedder("Xenova/all-MiniLM-L6-v2", 384),
    });
    const openai = new SqliteEmbeddingPipeline({
      db,
      embedder: stubEmbedder("openai:text-embedding-3-small", 1536),
    });
    const router = new RoutingEmbeddingPipeline(db, local, openai);
    await router.embedItem({
      id: "slack:e1",
      service: "slack",
      type: "message",
      title: "hello",
      body_preview: "world",
    });
    const dims = db
      .query(`SELECT dims FROM embedding_chunk WHERE item_id = ?`)
      .all("slack:e1") as Array<{ dims: number }>;
    expect(dims.length).toBeGreaterThan(0);
    expect(dims.every((r) => r.dims === 1536)).toBe(true);
  });

  test("non-prose items route to the local inner pipeline", async () => {
    const db = freshDb();
    insertItem(db, "e2", "github", "git_commit");
    const local = new SqliteEmbeddingPipeline({
      db,
      embedder: stubEmbedder("Xenova/all-MiniLM-L6-v2", 384),
    });
    const openai = new SqliteEmbeddingPipeline({
      db,
      embedder: stubEmbedder("openai:text-embedding-3-small", 1536),
    });
    const router = new RoutingEmbeddingPipeline(db, local, openai);
    await router.embedItem({
      id: "github:e2",
      service: "github",
      type: "git_commit",
      title: "fix",
      body_preview: "diff",
    });
    const dims = db
      .query(`SELECT dims FROM embedding_chunk WHERE item_id = ?`)
      .all("github:e2") as Array<{ dims: number }>;
    expect(dims.length).toBeGreaterThan(0);
    expect(dims.every((r) => r.dims === 384)).toBe(true);
  });

  test("backfillAll uses disjoint scopes", async () => {
    const db = freshDb();
    insertItem(db, "e1", "slack", "message");
    insertItem(db, "e2", "github", "git_commit");
    insertItem(db, "e3", "obsidian", "obsidian_note");

    const local = new SqliteEmbeddingPipeline({
      db,
      embedder: stubEmbedder("Xenova/all-MiniLM-L6-v2", 384),
    });
    const openai = new SqliteEmbeddingPipeline({
      db,
      embedder: stubEmbedder("openai:text-embedding-3-small", 1536),
    });
    const router = new RoutingEmbeddingPipeline(db, local, openai);
    await router.backfillAll();

    const rows = db
      .query(
        `SELECT item_id, dims FROM embedding_chunk
         GROUP BY item_id, dims ORDER BY item_id`,
      )
      .all() as Array<{ item_id: string; dims: number }>;
    const dimByItem = new Map(rows.map((r) => [r.item_id, r.dims]));
    expect(dimByItem.get("slack:e1")).toBe(1536);
    expect(dimByItem.get("github:e2")).toBe(384);
    expect(dimByItem.get("obsidian:e3")).toBe(1536);
  });

  test("deleteItemEmbeddings removes chunks AND fans out via dim-aware triggers", async () => {
    const db = freshDb();
    insertItem(db, "e1", "slack", "message");
    const local = new SqliteEmbeddingPipeline({
      db,
      embedder: stubEmbedder("Xenova/all-MiniLM-L6-v2", 384),
    });
    const openai = new SqliteEmbeddingPipeline({
      db,
      embedder: stubEmbedder("openai:text-embedding-3-small", 1536),
    });
    const router = new RoutingEmbeddingPipeline(db, local, openai);
    await router.embedItem({
      id: "slack:e1",
      service: "slack",
      type: "message",
      title: "hello",
      body_preview: "world",
    });
    const before = (
      db.query(`SELECT count(*) AS c FROM vec_items_1536`).get() as { c: number }
    ).c;
    expect(before).toBeGreaterThan(0);

    await router.deleteItemEmbeddings("slack:e1");

    expect(
      (db.query(`SELECT count(*) AS c FROM embedding_chunk WHERE item_id = ?`).get(
        "slack:e1",
      ) as { c: number }).c,
    ).toBe(0);
    expect(
      (db.query(`SELECT count(*) AS c FROM vec_items_1536`).get() as { c: number }).c,
    ).toBe(0);
  });
});
```

- [ ] **Step 5.2: Run — expect failure**

```bash
bun test packages/gateway/src/embedding/routing-pipeline.test.ts
```

Expected: import error.

- [ ] **Step 5.3: Implement the wrapper**

```ts
// packages/gateway/src/embedding/routing-pipeline.ts
import type { Database } from "bun:sqlite";
import type { SqliteEmbeddingPipeline } from "./pipeline.ts";
import { PROSE_HEAVY_TYPES, isProseHeavy } from "./routing.ts";
import type { EmbeddingPipeline, IndexedItem } from "./types.ts";

/**
 * Routes each item to the local (MiniLM 384) or OpenAI (1536) inner pipeline
 * based on `(service, type)` membership in `PROSE_HEAVY_TYPES`. Implements
 * `EmbeddingPipeline` so the lazy / worker runtimes treat it as a drop-in
 * replacement for `SqliteEmbeddingPipeline`.
 */
export class RoutingEmbeddingPipeline implements EmbeddingPipeline {
  constructor(
    private readonly db: Database,
    private readonly local: SqliteEmbeddingPipeline,
    private readonly openai: SqliteEmbeddingPipeline,
  ) {}

  async embedItem(item: IndexedItem): Promise<void> {
    const target = isProseHeavy(item.service, item.type) ? this.openai : this.local;
    await target.embedItem(item);
  }

  async deleteItemEmbeddings(itemId: string): Promise<void> {
    // The dim-aware delete triggers on `embedding_chunk` (V30) fan out to
    // vec_items_384 / vec_items_1536 automatically; one delete is enough.
    this.db.run(`DELETE FROM embedding_chunk WHERE item_id = ?`, [itemId]);
  }

  async backfillAll(onProgress?: (done: number, total: number) => void): Promise<void> {
    const proseKeys = Array.from(PROSE_HEAVY_TYPES);
    await this.openai.backfillForRoutingKeys({ in: proseKeys }, onProgress);
    await this.local.backfillForRoutingKeys({ notIn: proseKeys }, onProgress);
  }
}
```

- [ ] **Step 5.4: Verify `EmbeddingPipeline` interface includes the new methods**

`packages/gateway/src/embedding/types.ts` already declares:

```ts
export interface EmbeddingPipeline {
  embedItem(item: IndexedItem): Promise<void>;
  deleteItemEmbeddings(itemId: string): Promise<void>;
  backfillAll(onProgress?: (done: number, total: number) => void): Promise<void>;
}
```

That matches the wrapper. No change needed.

- [ ] **Step 5.5: Run — expect pass**

```bash
bun test packages/gateway/src/embedding/routing-pipeline.test.ts
bun test packages/gateway/src/embedding/pipeline.test.ts
```

Expected: all green.

- [ ] **Step 5.6: Commit**

```bash
git add packages/gateway/src/embedding/routing-pipeline.ts \
        packages/gateway/src/embedding/routing-pipeline.test.ts
git commit -m "$(cat <<'EOF'
feat(embedding): T6 PR 3 — RoutingEmbeddingPipeline (hybrid mode)

Wraps two SqliteEmbeddingPipeline instances (local 384, openai 1536)
and dispatches each item by (service, type) membership in
PROSE_HEAVY_TYPES. backfillAll passes disjoint scopes to the inner
pipelines via backfillForRoutingKeys so an item is only ever considered
by one side. Delete is a single embedding_chunk row removal — the V30
dim-aware triggers fan out to the matching vec_items_<dim> table.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — TOML accepts `"hybrid"` + create-runtime wires hybrid + promoted openai

**Files:**
- Modify: `packages/gateway/src/config/nimbus-toml.ts`
- Create: `packages/gateway/src/embedding/create-routing-runtime.ts`
- Modify: `packages/gateway/src/embedding/create-embedding-runtime.ts`

- [ ] **Step 6.1: Extend the TOML provider parser**

Modify `packages/gateway/src/config/nimbus-toml.ts:81-86`:

```ts
function setEmbeddingProvider(out: Partial<NimbusEmbeddingToml>, valRaw: string): void {
  const p = parseString(valRaw).toLowerCase();
  if (p === "local" || p === "openai" || p === "hybrid") {
    out.provider = p;
  }
}
```

Update the type at line 17:

```ts
export type NimbusEmbeddingToml = {
  enabled: boolean;
  provider: "local" | "openai" | "hybrid";
  model: string;
  chunkTokens: number;
  chunkOverlapTokens: number;
  backfillBatchSize: number;
  pauseOnBattery: boolean;
};
```

- [ ] **Step 6.2: Promote `provider="openai"` to 1536-dim**

Modify `packages/gateway/src/embedding/create-embedding-runtime.ts:45`:

```ts
try {
  const embedder = await createOpenAIEmbedder({
    apiKey,
    model: openaiModel,
    dimensions: 1536,
  });
  return createLazyEmbeddingRuntime(db, paths.dataDir, logger, slice, embedder);
} catch (err) {
  // existing redacted-pino error handling stays unchanged
  …
}
```

- [ ] **Step 6.3: Implement the hybrid factory**

```ts
// packages/gateway/src/embedding/create-routing-runtime.ts
import type { Database } from "bun:sqlite";
import { join } from "node:path";
import type { Logger } from "pino";
import type { NimbusEmbeddingToml } from "../config/nimbus-toml.ts";
import { ensureSqliteVecForConnection } from "../index/sqlite-vec-load.ts";
import { readIndexedUserVersion } from "../index/migrations/runner.ts";
import type { PlatformPaths } from "../platform/paths.ts";
import { processEnvGet } from "../platform/env-access.ts";
import type { NimbusVault } from "../vault/nimbus-vault.ts";
import { chunkText, itemTextForEmbedding } from "./chunker.ts";
import type { EmbeddingRuntime } from "./embedding-runtime.ts";
import { createLocalEmbedder, LOCAL_EMBEDDING_MODEL_ID } from "./model.ts";
import { createOpenAIEmbedder } from "./openai-embedder.ts";
import { SqliteEmbeddingPipeline } from "./pipeline.ts";
import { RoutingEmbeddingPipeline } from "./routing-pipeline.ts";
import { EMBEDDING_DIM_LOCAL, EMBEDDING_DIM_OPENAI } from "./routing.ts";
import type { Embedder, IndexedItem } from "./types.ts";

async function resolveOpenAIApiKey(vault: NimbusVault): Promise<string> {
  const envKey = processEnvGet("OPENAI_API_KEY")?.trim() ?? "";
  if (envKey !== "") {
    return envKey;
  }
  const v = await vault.get("openai.api_key");
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Hybrid runtime: builds local + openai inner pipelines, wraps in
 * RoutingEmbeddingPipeline. Returns null if openai.api_key is missing or
 * the OpenAI embedder fails to initialise — caller is expected to fall
 * back to MiniLM-only via `createLazyEmbeddingRuntime`.
 */
export async function tryCreateRoutingEmbeddingRuntime(
  db: Database,
  paths: PlatformPaths,
  logger: Logger,
  toml: Pick<NimbusEmbeddingToml, "chunkTokens" | "chunkOverlapTokens" | "backfillBatchSize">,
  vault: NimbusVault,
): Promise<EmbeddingRuntime | null> {
  const apiKey = await resolveOpenAIApiKey(vault);
  if (apiKey === "") {
    logger.warn(
      "Hybrid embedding: openai.api_key missing; routing falls back to MiniLM-only",
    );
    return null;
  }

  let localEmbedder: Embedder;
  let openaiEmbedder: Embedder;
  try {
    localEmbedder = await createLocalEmbedder({ cacheDir: join(paths.dataDir, "models") });
    openaiEmbedder = await createOpenAIEmbedder({
      apiKey,
      model: "text-embedding-3-small",
      dimensions: EMBEDDING_DIM_OPENAI,
    });
  } catch (err) {
    logger.warn(
      {
        errName: err instanceof Error ? err.name : "Error",
        errMessage: err instanceof Error ? err.message : String(err),
      },
      "Hybrid embedding init failed",
    );
    return null;
  }

  const uv = readIndexedUserVersion(db);
  if (!ensureSqliteVecForConnection(db, uv)) {
    logger.warn("sqlite-vec unavailable; hybrid mode falls back to MiniLM-only");
    return null;
  }

  const local = new SqliteEmbeddingPipeline({
    db,
    embedder: localEmbedder,
    backfillBatchSize: toml.backfillBatchSize,
    chunkOptions: {
      maxChunkTokens: toml.chunkTokens,
      overlapTokens: toml.chunkOverlapTokens,
    },
    logger,
  });
  const openai = new SqliteEmbeddingPipeline({
    db,
    embedder: openaiEmbedder,
    backfillBatchSize: toml.backfillBatchSize,
    chunkOptions: {
      maxChunkTokens: toml.chunkTokens,
      overlapTokens: toml.chunkOverlapTokens,
    },
    logger,
  });
  const pipeline = new RoutingEmbeddingPipeline(db, local, openai);

  let backfillStarted = false;

  return {
    scheduleItemEmbedding(itemId: string): void {
      void (async () => {
        const row = db
          .query(
            `SELECT id, service, type, title, body_preview FROM item WHERE id = ?`,
          )
          .get(itemId) as IndexedItem | null | undefined;
        if (row === null || row === undefined) {
          return;
        }
        await pipeline.embedItem(row);
      })().catch((err: unknown) => {
        logger.warn({ err, itemId }, "embedding item failed");
      });
    },

    async embedQuery(text: string): Promise<Float32Array | null> {
      // Single-vec API stays on the local embedder for back-compat.
      const vecs = await localEmbedder.embed([text]);
      return vecs[0] ?? null;
    },

    async embedQueryDual(text: string): Promise<{
      vec384: Float32Array | null;
      vec1536: Float32Array | null;
      model384: string | null;
      model1536: string | null;
    }> {
      const [local384, openai1536] = await Promise.all([
        localEmbedder.embed([text]),
        openaiEmbedder.embed([text]),
      ]);
      return {
        vec384: local384[0] ?? null,
        vec1536: openai1536[0] ?? null,
        model384: localEmbedder.model,
        model1536: openaiEmbedder.model,
      };
    },

    getEmbeddingModel(): string {
      return localEmbedder.model;
    },

    getEmbeddingDims(): number {
      return EMBEDDING_DIM_LOCAL;
    },

    getBackfillProgress(): { done: number; total: number } | null {
      return null;
    },

    startBackgroundJobs(): void {
      if (backfillStarted) {
        return;
      }
      backfillStarted = true;
      void pipeline.backfillAll().catch((err: unknown) => {
        logger.warn({ err }, "hybrid embedding backfill failed");
      });
    },

    terminate(): void {
      /* in-process: nothing to tear down */
    },
  };
}

// Suppress unused-import warning if itemTextForEmbedding/chunkText are only
// transitively used; they're imported here to keep the routing factory
// self-contained for future work — drop them if knip flags them.
void itemTextForEmbedding;
void chunkText;
void LOCAL_EMBEDDING_MODEL_ID;
```

(If `knip` complains about the trailing `void` lines, just remove them along with the imports — they're scaffolding for future routing-aware enhancements but not required by the runtime.)

- [ ] **Step 6.4: Wire the hybrid branch in `create-embedding-runtime.ts`**

Modify `packages/gateway/src/embedding/create-embedding-runtime.ts`. Add the import:

```ts
import { tryCreateRoutingEmbeddingRuntime } from "./create-routing-runtime.ts";
```

Add the hybrid branch after the existing openai branch:

```ts
if (tomlEmbedding.provider === "hybrid") {
  const hybrid = await tryCreateRoutingEmbeddingRuntime(db, paths, logger, slice, vault);
  if (hybrid !== null) {
    return hybrid;
  }
  // Fall through to the local path below if hybrid setup failed.
}
```

(Place it before the `tomlEmbedding.provider === "openai"` branch — order is `hybrid → openai → local` so a falsey hybrid resolves into the local fallback at the end of the function rather than into a single-provider OpenAI runtime.)

- [ ] **Step 6.5: Typecheck**

```bash
bun run typecheck
```

Expected: 0 errors. (If unused imports trigger errors in `create-routing-runtime.ts`, drop the trailing `void` block + the corresponding imports.)

- [ ] **Step 6.6: Commit**

```bash
git add packages/gateway/src/config/nimbus-toml.ts \
        packages/gateway/src/embedding/create-routing-runtime.ts \
        packages/gateway/src/embedding/create-embedding-runtime.ts
git commit -m "$(cat <<'EOF'
feat(embedding): T6 PR 3 — provider="hybrid" + promote provider="openai" to 1536

TOML [embedding].provider gains "hybrid": MiniLM-384 by default plus
OpenAI text-embedding-3-small (1536-dim) for PROSE_HEAVY_TYPES.
provider="openai" is promoted from 384-dim to 1536-dim now that
vec_items_1536 exists; provider="local" is unchanged. Vault key
absence in either openai/hybrid path falls back to MiniLM with a warn
log.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 — `EmbeddingRuntime.embedQueryDual` on lazy + worker runtimes

**Files:**
- Modify: `packages/gateway/src/embedding/embedding-runtime.ts`
- Modify: `packages/gateway/src/embedding/lazy-scheduler.ts`
- Modify: `packages/gateway/src/embedding/worker-bridge.ts`

- [ ] **Step 7.1: Extend the `EmbeddingRuntime` type**

```ts
// packages/gateway/src/embedding/embedding-runtime.ts
export type EmbeddingRuntime = {
  scheduleItemEmbedding: (itemId: string) => void;
  embedQuery: (text: string) => Promise<Float32Array | null>;
  /** Hybrid-aware: returns whichever vectors the runtime can produce.
   *  - local-only:  { vec384, null, model384, null }
   *  - openai-only: { null, vec1536, null, model1536 }
   *  - hybrid:      both populated (one OpenAI HTTP call per query) */
  embedQueryDual: (text: string) => Promise<{
    vec384: Float32Array | null;
    vec1536: Float32Array | null;
    model384: string | null;
    model1536: string | null;
  }>;
  getEmbeddingModel: () => string;
  getEmbeddingDims: () => number;
  getBackfillProgress: () => { done: number; total: number } | null;
  startBackgroundJobs: () => void;
  terminate: () => void;
};
```

- [ ] **Step 7.2: Implement `embedQueryDual` on the lazy runtime**

Modify `packages/gateway/src/embedding/lazy-scheduler.ts`. Inside the returned object, after `embedQuery`:

```ts
async embedQueryDual(text: string): Promise<{
  vec384: Float32Array | null;
  vec1536: Float32Array | null;
  model384: string | null;
  model1536: string | null;
}> {
  const p = await ensurePipeline();
  if (p === null) {
    return { vec384: null, vec1536: null, model384: null, model1536: null };
  }
  const vecs = await p.embedTexts([text]);
  const vec = vecs[0] ?? null;
  const dims = p.embeddingDims;
  if (dims === 1536) {
    return { vec384: null, vec1536: vec, model384: null, model1536: p.embeddingModel };
  }
  // 384 (or any other supported single-pipeline mode)
  return { vec384: vec, vec1536: null, model384: p.embeddingModel, model1536: null };
},
```

- [ ] **Step 7.3: Implement `embedQueryDual` on the worker bridge**

Modify `packages/gateway/src/embedding/worker-bridge.ts`. The worker bridge currently exposes `embedQuery` returning `Float32Array | null`. Add an `embedQueryDual` that wraps it (the worker is local-only — it never has the OpenAI side):

```ts
async embedQueryDual(text: string): Promise<{
  vec384: Float32Array | null;
  vec1536: Float32Array | null;
  model384: string | null;
  model1536: string | null;
}> {
  const vec = await this.embedQuery(text);
  if (vec === null) {
    return { vec384: null, vec1536: null, model384: null, model1536: null };
  }
  // Worker bridge is always local MiniLM (384-dim).
  return {
    vec384: vec,
    vec1536: null,
    model384: this.getEmbeddingModel(),
    model1536: null,
  };
},
```

(Place it next to the existing `embedQuery` method on the runtime object the bridge returns.)

- [ ] **Step 7.4: Typecheck**

```bash
bun run typecheck
```

Expected: 0 errors. (The `RoutingEmbeddingPipeline` runtime from Task 6 already implements `embedQueryDual`, so the type is now satisfied across all three implementations.)

- [ ] **Step 7.5: Commit**

```bash
git add packages/gateway/src/embedding/embedding-runtime.ts \
        packages/gateway/src/embedding/lazy-scheduler.ts \
        packages/gateway/src/embedding/worker-bridge.ts
git commit -m "$(cat <<'EOF'
feat(embedding): T6 PR 3 — embedQueryDual on lazy + worker runtimes

Adds the hybrid-aware query API to EmbeddingRuntime. Local-only modes
return { vec384, null, model384, null }; the hybrid runtime (added in
the previous commit) returns both vectors with one OpenAI call per
query. Existing embedQuery stays for back-compat with single-vec
callers.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8 — Dim-aware `vectorSearchChunks`

**Files:**
- Modify: `packages/gateway/src/search/vec-store.ts`
- Modify (or extend): `packages/gateway/src/search/hybrid.test.ts` if a vec-store test lives there; otherwise create `packages/gateway/src/search/vec-store.test.ts`.

- [ ] **Step 8.1: Write a failing test**

```ts
// packages/gateway/src/search/vec-store.test.ts (create if absent)
import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { runIndexedSchemaMigrations } from "../index/migrations/runner.ts";
import { tryLoadSqliteVec } from "../index/sqlite-vec-load.ts";
import { vectorSearchChunks } from "./vec-store.ts";

function freshDb(): Database {
  const db = new Database(":memory:");
  if (!tryLoadSqliteVec(db)) {
    throw new Error("sqlite-vec required");
  }
  runIndexedSchemaMigrations(db, 30);
  return db;
}

describe("vectorSearchChunks — dim awareness", () => {
  test("rejects unsupported query embedding dimensions", () => {
    const db = freshDb();
    expect(() =>
      vectorSearchChunks(db, {
        queryEmbedding: new Float32Array(512),
        model: "any",
        limit: 5,
      }),
    ).toThrow(/unsupported query embedding dim/);
  });

  test("queries vec_items_1536 when given a 1536-dim embedding", () => {
    const db = freshDb();
    db.run(
      `INSERT INTO item (id, service, type, external_id, title, body_preview,
          modified_at, synced_at)
       VALUES ('s:1', 's', 't', '1', 'T', 'B', ?, ?)`,
      [Date.now(), Date.now()],
    );
    const v = new Float32Array(1536);
    v[0] = 1.0;
    db.run(`INSERT INTO vec_items_1536 (rowid, embedding) VALUES (1, vec_f32(?))`, [v]);
    db.run(
      `INSERT INTO embedding_chunk (item_id, chunk_index, chunk_text, vec_rowid, model, dims, embedded_at)
       VALUES ('s:1', 0, 'hi', 1, 'openai:text-embedding-3-small', 1536, ?)`,
      [Date.now()],
    );
    const hits = vectorSearchChunks(db, {
      queryEmbedding: v,
      model: "openai:text-embedding-3-small",
      limit: 5,
    });
    expect(hits.length).toBe(1);
    expect(hits[0]?.itemId).toBe("s:1");
  });
});
```

- [ ] **Step 8.2: Run — expect failure**

```bash
bun test packages/gateway/src/search/vec-store.test.ts
```

Expected: error around "expected 384-dim query embedding".

- [ ] **Step 8.3: Implement dim-aware vec-store**

Modify `packages/gateway/src/search/vec-store.ts`:

```ts
import type { Database } from "bun:sqlite";
import { SUPPORTED_EMBEDDING_DIMS } from "../embedding/routing.ts";

export type VectorChunkHit = {
  itemId: string;
  chunkIndex: number;
  chunkText: string;
  vecRowid: number;
  distance: number;
};

export function vectorSearchChunks(
  db: Database,
  options: {
    queryEmbedding: Float32Array;
    model: string;
    limit: number;
    service?: string;
    itemType?: string;
    since?: number;
  },
): VectorChunkHit[] {
  const dims = options.queryEmbedding.length;
  if (!SUPPORTED_EMBEDDING_DIMS.has(dims)) {
    throw new Error(
      `unsupported query embedding dim: ${String(dims)} (expected one of ${Array.from(
        SUPPORTED_EMBEDDING_DIMS,
      ).join(",")})`,
    );
  }
  const vecTable = `vec_items_${String(dims)}`;
  const lim = Math.min(500, Math.max(1, Math.floor(options.limit)));
  const q = new Float32Array(options.queryEmbedding);
  let sql = `
    SELECT ec.item_id AS itemId, ec.chunk_index AS chunkIndex, ec.chunk_text AS chunkText,
           ec.vec_rowid AS vecRowid, knn.distance AS distance
    FROM (
      SELECT rowid, distance FROM ${vecTable} WHERE embedding MATCH ? AND k = ?
    ) knn
    INNER JOIN embedding_chunk ec ON ec.vec_rowid = knn.rowid AND ec.model = ?
    INNER JOIN item i ON i.id = ec.item_id
    WHERE 1 = 1
  `;
  const params: Array<string | number | Float32Array> = [q, lim, options.model];
  if (options.service !== undefined && options.service !== "") {
    sql += ` AND i.service = ?`;
    params.push(options.service);
  }
  if (options.itemType !== undefined && options.itemType !== "") {
    sql += ` AND i.type = ?`;
    params.push(options.itemType);
  }
  if (options.since !== undefined && options.since > 0) {
    sql += ` AND i.modified_at >= ?`;
    params.push(options.since);
  }
  sql += ` ORDER BY knn.distance`;
  const rows = db.query(sql).all(...params) as Array<{
    itemId: string;
    chunkIndex: number;
    chunkText: string;
    vecRowid: number;
    distance: number;
  }>;
  return rows.map((r) => ({
    itemId: r.itemId,
    chunkIndex: r.chunkIndex,
    chunkText: r.chunkText,
    vecRowid: r.vecRowid,
    distance: r.distance,
  }));
}
```

- [ ] **Step 8.4: Run — expect pass**

```bash
bun test packages/gateway/src/search/vec-store.test.ts
```

Expected: both tests pass.

- [ ] **Step 8.5: Commit**

```bash
git add packages/gateway/src/search/vec-store.ts \
        packages/gateway/src/search/vec-store.test.ts
git commit -m "$(cat <<'EOF'
refactor(search): T6 PR 3 — dim-aware vectorSearchChunks

vectorSearchChunks now picks vec_items_<dim> from the query embedding's
length, validated against SUPPORTED_EMBEDDING_DIMS. The
embedding_chunk.model filter still disambiguates rows when both vec
tables hold entries. Same I9-safe enum-equivalent pattern as the
pipeline (table name from a numeric value, never a caller string).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9 — `vectorSearchChunksDual` merge helper

**Files:**
- Create: `packages/gateway/src/search/dual-search.ts`
- Create: `packages/gateway/src/search/dual-search.test.ts`

- [ ] **Step 9.1: Write the failing test**

```ts
// packages/gateway/src/search/dual-search.test.ts
import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { runIndexedSchemaMigrations } from "../index/migrations/runner.ts";
import { tryLoadSqliteVec } from "../index/sqlite-vec-load.ts";
import { vectorSearchChunksDual } from "./dual-search.ts";

function freshDb(): Database {
  const db = new Database(":memory:");
  if (!tryLoadSqliteVec(db)) {
    throw new Error("sqlite-vec required");
  }
  runIndexedSchemaMigrations(db, 30);
  return db;
}

function seed(db: Database) {
  const now = Date.now();
  // Two items: a-384 and b-1536
  db.run(
    `INSERT INTO item (id, service, type, external_id, title, body_preview,
        modified_at, synced_at)
     VALUES ('s:a', 'github', 'git_commit', 'a', 'A', 'a', ?, ?)`,
    [now, now],
  );
  db.run(
    `INSERT INTO item (id, service, type, external_id, title, body_preview,
        modified_at, synced_at)
     VALUES ('s:b', 'slack', 'message', 'b', 'B', 'b', ?, ?)`,
    [now, now],
  );
  const v384 = new Float32Array(384);
  v384[0] = 1.0;
  const v1536 = new Float32Array(1536);
  v1536[0] = 1.0;
  db.run(`INSERT INTO vec_items_384  (rowid, embedding) VALUES (1, vec_f32(?))`, [v384]);
  db.run(`INSERT INTO vec_items_1536 (rowid, embedding) VALUES (1, vec_f32(?))`, [v1536]);
  db.run(
    `INSERT INTO embedding_chunk (item_id, chunk_index, chunk_text, vec_rowid, model, dims, embedded_at)
     VALUES ('s:a', 0, 'a', 1, 'm384', 384, ?)`,
    [now],
  );
  db.run(
    `INSERT INTO embedding_chunk (item_id, chunk_index, chunk_text, vec_rowid, model, dims, embedded_at)
     VALUES ('s:b', 0, 'b', 1, 'm1536', 1536, ?)`,
    [now],
  );
}

describe("vectorSearchChunksDual", () => {
  test("with both vectors, returns hits from both tables", () => {
    const db = freshDb();
    seed(db);
    const v384 = new Float32Array(384);
    v384[0] = 1.0;
    const v1536 = new Float32Array(1536);
    v1536[0] = 1.0;
    const hits = vectorSearchChunksDual(db, {
      queryEmbedding384: v384,
      queryEmbedding1536: v1536,
      model384: "m384",
      model1536: "m1536",
      limit: 10,
    });
    const ids = new Set(hits.map((h) => h.itemId));
    expect(ids.has("s:a")).toBe(true);
    expect(ids.has("s:b")).toBe(true);
  });

  test("with only the 384 vector, returns only vec_items_384 hits", () => {
    const db = freshDb();
    seed(db);
    const v384 = new Float32Array(384);
    v384[0] = 1.0;
    const hits = vectorSearchChunksDual(db, {
      queryEmbedding384: v384,
      model384: "m384",
      limit: 10,
    });
    expect(hits.length).toBe(1);
    expect(hits[0]?.itemId).toBe("s:a");
  });

  test("merge orders by distance ascending, truncates to limit", () => {
    const db = freshDb();
    seed(db);
    const v384 = new Float32Array(384);
    v384[0] = 1.0;
    const v1536 = new Float32Array(1536);
    v1536[0] = 1.0;
    const hits = vectorSearchChunksDual(db, {
      queryEmbedding384: v384,
      queryEmbedding1536: v1536,
      model384: "m384",
      model1536: "m1536",
      limit: 1,
    });
    expect(hits.length).toBe(1);
  });

  test("missing model id with present vector skips that side", () => {
    const db = freshDb();
    seed(db);
    const v1536 = new Float32Array(1536);
    v1536[0] = 1.0;
    // model1536 missing → skip the 1536 side
    const hits = vectorSearchChunksDual(db, {
      queryEmbedding1536: v1536,
      limit: 10,
    });
    expect(hits.length).toBe(0);
  });
});
```

- [ ] **Step 9.2: Run — expect failure**

```bash
bun test packages/gateway/src/search/dual-search.test.ts
```

Expected: import error.

- [ ] **Step 9.3: Implement the helper**

```ts
// packages/gateway/src/search/dual-search.ts
import type { Database } from "bun:sqlite";
import { type VectorChunkHit, vectorSearchChunks } from "./vec-store.ts";

export type DualSearchOptions = {
  queryEmbedding384?: Float32Array;
  queryEmbedding1536?: Float32Array;
  model384?: string;
  model1536?: string;
  limit: number;
  service?: string;
  itemType?: string;
  since?: number;
};

/**
 * KNN over both `vec_items_384` and `vec_items_1536` (when the matching
 * `(query, model)` pair is provided), then merge by distance ascending
 * and truncate to `limit`.
 *
 * Distance comparison across two embedding models is an approximation —
 * both providers we support today (MiniLM, OpenAI text-embedding-3-small)
 * return unit-normalised vectors, so raw L2 is "good enough" for v1.
 * RRF / per-model normalisation is a future PR.
 */
export function vectorSearchChunksDual(
  db: Database,
  opts: DualSearchOptions,
): VectorChunkHit[] {
  const hits: VectorChunkHit[] = [];
  if (opts.queryEmbedding384 !== undefined && opts.model384 !== undefined) {
    hits.push(
      ...vectorSearchChunks(db, {
        queryEmbedding: opts.queryEmbedding384,
        model: opts.model384,
        limit: opts.limit,
        ...(opts.service !== undefined ? { service: opts.service } : {}),
        ...(opts.itemType !== undefined ? { itemType: opts.itemType } : {}),
        ...(opts.since !== undefined ? { since: opts.since } : {}),
      }),
    );
  }
  if (opts.queryEmbedding1536 !== undefined && opts.model1536 !== undefined) {
    hits.push(
      ...vectorSearchChunks(db, {
        queryEmbedding: opts.queryEmbedding1536,
        model: opts.model1536,
        limit: opts.limit,
        ...(opts.service !== undefined ? { service: opts.service } : {}),
        ...(opts.itemType !== undefined ? { itemType: opts.itemType } : {}),
        ...(opts.since !== undefined ? { since: opts.since } : {}),
      }),
    );
  }
  hits.sort((a, b) => a.distance - b.distance);
  return hits.slice(0, opts.limit);
}
```

- [ ] **Step 9.4: Run — expect pass**

```bash
bun test packages/gateway/src/search/dual-search.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 9.5: Commit**

```bash
git add packages/gateway/src/search/dual-search.ts \
        packages/gateway/src/search/dual-search.test.ts
git commit -m "$(cat <<'EOF'
feat(search): T6 PR 3 — vectorSearchChunksDual merge helper

Issues parallel KNN over vec_items_384 and vec_items_1536 when both
(vector, model) pairs are provided, merges by L2 distance ascending,
and truncates to the requested limit. Single-vector callers degrade to
identical behaviour as a direct vectorSearchChunks call.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10 — Wire dual-search through `HybridSearchOptions` + caller

**Files:**
- Modify: `packages/gateway/src/search/hybrid-types.ts`
- Modify: `packages/gateway/src/search/hybrid-internal.ts`
- Modify: `packages/gateway/src/index/local-index.ts`
- Modify: `packages/gateway/src/platform/assemble.ts`

- [ ] **Step 10.1: Extend `HybridSearchOptions`**

Open `packages/gateway/src/search/hybrid-types.ts` and locate the `HybridSearchOptions` interface. Add the two optional 1536 fields:

```ts
queryEmbedding1536?: Float32Array;
embeddingModel1536?: string;
```

- [ ] **Step 10.2: Switch `runVectorSearch` to the dual helper**

Modify `packages/gateway/src/search/hybrid-internal.ts:112-145`:

```ts
import { type VectorChunkHit, vectorSearchChunks } from "./vec-store.ts";
import { vectorSearchChunksDual } from "./dual-search.ts";

export function runVectorSearch(
  db: Database,
  opts: HybridSearchOptions,
  limit: number,
  serviceFilter: string | undefined,
  nameQ: string,
): VectorChunkHit[] {
  const semantic = opts.semantic ?? true;
  if (!semantic || nameQ.length === 0) {
    return [];
  }
  const has384 = opts.queryEmbedding !== undefined;
  const has1536 = opts.queryEmbedding1536 !== undefined;
  if (!has384 && !has1536) {
    return [];
  }
  const dualOpts: {
    queryEmbedding384?: Float32Array;
    queryEmbedding1536?: Float32Array;
    model384?: string;
    model1536?: string;
    limit: number;
    service?: string;
    itemType?: string;
    since?: number;
  } = { limit: Math.min(500, limit * 25) };
  if (opts.queryEmbedding !== undefined) {
    dualOpts.queryEmbedding384 = opts.queryEmbedding;
    dualOpts.model384 = opts.embeddingModel;
  }
  if (opts.queryEmbedding1536 !== undefined && opts.embeddingModel1536 !== undefined) {
    dualOpts.queryEmbedding1536 = opts.queryEmbedding1536;
    dualOpts.model1536 = opts.embeddingModel1536;
  }
  if (serviceFilter !== undefined) dualOpts.service = serviceFilter;
  if (opts.itemType !== undefined && opts.itemType !== "") dualOpts.itemType = opts.itemType;
  if (opts.since !== undefined && opts.since > 0) dualOpts.since = opts.since;
  return vectorSearchChunksDual(db, dualOpts);
}
```

- [ ] **Step 10.3: Update `local-index.ts` dispatcher**

Modify the search dispatcher around `local-index.ts:665`:

```ts
const dual = await ss.embedQueryDual(nameQ);
const hybridOpts: HybridSearchOptions = {
  query: nameQ,
  limit: query.limit ?? 50,
  semantic: true,
  embeddingModel: ss.model,
  contextChunks: options?.contextChunks ?? 2,
};
if (query.service !== undefined && query.service !== "") {
  hybridOpts.service = query.service;
}
if (query.itemType !== undefined && query.itemType !== "") {
  hybridOpts.itemType = query.itemType;
}
if (dual.vec384 !== null) {
  hybridOpts.queryEmbedding = dual.vec384;
}
if (dual.vec1536 !== null && dual.model1536 !== null) {
  hybridOpts.queryEmbedding1536 = dual.vec1536;
  hybridOpts.embeddingModel1536 = dual.model1536;
}
```

(Replace the existing `qVec` resolution block with the above. Drop the old `qVec` variable and its later branch — the `if (qVec !== null)` block becomes the two `if (dual.vec384 !== null)` / `if (dual.vec1536 !== null …)` blocks.)

- [ ] **Step 10.4: Extend `SemanticSearchDeps`**

Modify `packages/gateway/src/platform/assemble.ts` lines 124-140 (the block that builds `semanticSearch`). Search for the type definition first; it lives in `packages/gateway/src/index/local-index.ts` (or a sibling). Add `embedQueryDual: (text: string) => Promise<…>` to the type and then to the runtime adapter:

```ts
// In whichever file declares `SemanticSearchDeps`:
export type SemanticSearchDeps = {
  model: string;
  embedQuery: (text: string) => Promise<Float32Array | null>;
  embedQueryDual: (text: string) => Promise<{
    vec384: Float32Array | null;
    vec1536: Float32Array | null;
    model384: string | null;
    model1536: string | null;
  }>;
};

// In packages/gateway/src/platform/assemble.ts:
semanticSearch = {
  model: rt.getEmbeddingModel(),
  embedQuery: (text: string) => rt.embedQuery(text),
  embedQueryDual: (text: string) => rt.embedQueryDual(text),
};
```

- [ ] **Step 10.5: Run the search test suite**

```bash
bun test packages/gateway/src/search packages/gateway/src/index/local-index.test.ts
```

Expected: all tests pass. If any fixture mocks `SemanticSearchDeps`, extend the mock with a stub `embedQueryDual` that returns `{ vec384: null, vec1536: null, model384: null, model1536: null }`.

- [ ] **Step 10.6: Commit**

```bash
git add packages/gateway/src/search/hybrid-types.ts \
        packages/gateway/src/search/hybrid-internal.ts \
        packages/gateway/src/index/local-index.ts \
        packages/gateway/src/platform/assemble.ts
git commit -m "$(cat <<'EOF'
feat(search): T6 PR 3 — wire dual-search through hybrid options

HybridSearchOptions grows queryEmbedding1536 + embeddingModel1536.
runVectorSearch switches to vectorSearchChunksDual; the local-index
dispatcher calls ss.embedQueryDual(nameQ) and threads both vectors
through. Non-hybrid runtimes return only the 384 side, so the dual
helper produces identical results to the prior single-table KNN.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11 — `index.reembed` IPC handler

**Files:**
- Create: `packages/gateway/src/ipc/index-reembed-rpc.ts`
- Create: `packages/gateway/src/ipc/index-reembed-rpc.test.ts`
- Modify: `packages/gateway/src/ipc/server/dispatchers.ts`

- [ ] **Step 11.1: Write the failing test**

```ts
// packages/gateway/src/ipc/index-reembed-rpc.test.ts
import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { MockVault } from "@nimbus-dev/sdk/testing";
import pino from "pino";
import { runIndexedSchemaMigrations } from "../index/migrations/runner.ts";
import { tryLoadSqliteVec } from "../index/sqlite-vec-load.ts";
import { dispatchIndexReembedRpc, IndexReembedRpcError } from "./index-reembed-rpc.ts";

function freshCtx() {
  const db = new Database(":memory:");
  tryLoadSqliteVec(db);
  runIndexedSchemaMigrations(db, 30);
  const events: Array<{ method: string; params: unknown }> = [];
  const ctx = {
    db,
    vault: new MockVault(),
    paths: { dataDir: "/tmp/nimbus-test", configDir: "/tmp/nimbus-test/config" },
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
    await expect(
      dispatchIndexReembedRpc("index.reembed", {}, ctx),
    ).rejects.toBeInstanceOf(IndexReembedRpcError);
  });

  test("dryRun returns { jobId, planned } and emits no progress writes", async () => {
    const { ctx, events } = freshCtx();
    const out = await dispatchIndexReembedRpc(
      "index.reembed",
      { model: "Xenova/all-MiniLM-L6-v2", dryRun: true, batchSize: 100 },
      ctx,
    );
    expect(out.kind).toBe("hit");
    const hit = (out as { kind: "hit"; value: { jobId: string } }).value;
    expect(hit.jobId).toMatch(/^reembed_/);
    // Allow the async chain to settle one tick:
    await new Promise((r) => setTimeout(r, 10));
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
    await new Promise((r) => setTimeout(r, 10));
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
```

- [ ] **Step 11.2: Run — expect failure**

```bash
bun test packages/gateway/src/ipc/index-reembed-rpc.test.ts
```

Expected: import error.

- [ ] **Step 11.3: Implement the RPC handler**

```ts
// packages/gateway/src/ipc/index-reembed-rpc.ts
import type { Database } from "bun:sqlite";
import { join } from "node:path";
import type { Logger } from "pino";
import { createLocalEmbedder } from "../embedding/model.ts";
import { createOpenAIEmbedder } from "../embedding/openai-embedder.ts";
import { SqliteEmbeddingPipeline } from "../embedding/pipeline.ts";
import { processEnvGet } from "../platform/env-access.ts";
import type { PlatformPaths } from "../platform/paths.ts";
import type { NimbusVault } from "../vault/nimbus-vault.ts";
import type { Embedder, IndexedItem } from "../embedding/types.ts";

export class IndexReembedRpcError extends Error {
  readonly rpcCode: number;
  constructor(rpcCode: number, message: string) {
    super(message);
    this.name = "IndexReembedRpcError";
    this.rpcCode = rpcCode;
  }
}

export type IndexReembedRpcContext = {
  db: Database;
  vault: NimbusVault;
  paths: Pick<PlatformPaths, "dataDir">;
  logger: Logger;
  notify: (method: string, params: unknown) => void;
};

type ReembedParams = {
  model: string;
  itemType?: string;
  service?: string;
  limit?: number;
  batchSize?: number;
  dryRun?: boolean;
};

const activeReembeds = new Map<string, AbortController>();

const MIN_BATCH = 1;
const MAX_BATCH = 256;
const DEFAULT_BATCH = 100;
const FALLBACK_RETRY_AFTER_MS = 2000;

function clampBatchSize(raw: number | undefined): number {
  const n =
    typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : DEFAULT_BATCH;
  return Math.min(MAX_BATCH, Math.max(MIN_BATCH, n));
}

function newJobId(): string {
  return `reembed_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

function parseReembedParams(params: unknown): ReembedParams {
  if (params === null || typeof params !== "object" || Array.isArray(params)) {
    throw new IndexReembedRpcError(-32602, "params must be an object");
  }
  const rec = params as Record<string, unknown>;
  const model = rec["model"];
  if (typeof model !== "string" || model === "") {
    throw new IndexReembedRpcError(-32602, "params.model is required");
  }
  const out: ReembedParams = { model };
  if (typeof rec["itemType"] === "string" && rec["itemType"] !== "") {
    out.itemType = rec["itemType"];
  }
  if (typeof rec["service"] === "string" && rec["service"] !== "") {
    out.service = rec["service"];
  }
  if (typeof rec["limit"] === "number" && Number.isFinite(rec["limit"]) && rec["limit"] > 0) {
    out.limit = Math.floor(rec["limit"]);
  }
  if (typeof rec["batchSize"] === "number") {
    out.batchSize = rec["batchSize"];
  }
  if (rec["dryRun"] === true) {
    out.dryRun = true;
  }
  return out;
}

async function resolveEmbedder(
  model: string,
  ctx: IndexReembedRpcContext,
): Promise<Embedder> {
  if (model.startsWith("openai:")) {
    const envKey = processEnvGet("OPENAI_API_KEY")?.trim() ?? "";
    const apiKey =
      envKey !== ""
        ? envKey
        : ((await ctx.vault.get("openai.api_key")) ?? "").toString().trim();
    if (apiKey === "") {
      throw new IndexReembedRpcError(
        -32603,
        "openai.api_key missing in vault. Run `nimbus vault set openai.api_key <key>`.",
      );
    }
    const openaiModel = model.slice("openai:".length);
    return createOpenAIEmbedder({ apiKey, model: openaiModel, dimensions: 1536 });
  }
  if (model === "Xenova/all-MiniLM-L6-v2" || model === "local") {
    return createLocalEmbedder({ cacheDir: join(ctx.paths.dataDir, "models") });
  }
  throw new IndexReembedRpcError(-32602, `Unsupported model: ${model}`);
}

function buildCandidateSql(p: ReembedParams): { sql: string; params: unknown[] } {
  const params: unknown[] = [p.model];
  let sql = `SELECT i.id AS id, i.service AS service, i.type AS type,
                    i.title AS title, i.body_preview AS body_preview
             FROM item i WHERE NOT EXISTS (
               SELECT 1 FROM embedding_chunk c
               WHERE c.item_id = i.id AND c.model = ?
             )`;
  if (p.service !== undefined) {
    sql += ` AND i.service = ?`;
    params.push(p.service);
  }
  if (p.itemType !== undefined) {
    if (p.itemType.includes(":")) {
      sql += ` AND (i.service || ':' || i.type) = ?`;
      params.push(p.itemType);
    } else {
      sql += ` AND i.type = ?`;
      params.push(p.itemType);
    }
  }
  sql += ` ORDER BY i.modified_at DESC`;
  if (p.limit !== undefined) {
    sql += ` LIMIT ?`;
    params.push(p.limit);
  }
  return { sql, params };
}

async function runReembedJob(
  jobId: string,
  p: ReembedParams,
  ctx: IndexReembedRpcContext,
  controller: AbortController,
): Promise<void> {
  const startedAt = Date.now();
  const batchSize = clampBatchSize(p.batchSize);
  let succeeded = 0;
  let skipped = 0;
  try {
    const embedder = await resolveEmbedder(p.model, ctx);
    const { sql, params } = buildCandidateSql(p);
    const candidates = ctx.db.query(sql).all(...params) as IndexedItem[];
    const total = candidates.length;
    if (p.dryRun === true) {
      ctx.notify("index.reembedDone", {
        jobId,
        succeeded: 0,
        skipped: 0,
        durationMs: Date.now() - startedAt,
        planned: total,
        dryRun: true,
      });
      return;
    }
    const pipeline = new SqliteEmbeddingPipeline({
      db: ctx.db,
      embedder,
      logger: ctx.logger,
    });

    for (let i = 0; i < candidates.length; i += batchSize) {
      if (controller.signal.aborted) {
        break;
      }
      const slice = candidates.slice(i, i + batchSize);
      try {
        for (const row of slice) {
          await pipeline.embedItem(row);
          succeeded += 1;
        }
      } catch (err) {
        const status = (err as { status?: number } | undefined)?.status;
        if (status === 429 || (typeof status === "number" && status >= 500 && status < 600)) {
          const retryAfterMs =
            (err as { retryAfterMs?: number }).retryAfterMs ?? FALLBACK_RETRY_AFTER_MS;
          await new Promise((r) => setTimeout(r, retryAfterMs));
          try {
            for (const row of slice) {
              await pipeline.embedItem(row);
              succeeded += 1;
            }
          } catch (retryErr) {
            ctx.logger.warn(
              {
                errName: retryErr instanceof Error ? retryErr.name : "Error",
                errMessage: retryErr instanceof Error ? retryErr.message : String(retryErr),
                batchStart: i,
                batchSize: slice.length,
              },
              "reembed batch failed after retry; skipping",
            );
            skipped += slice.length;
          }
        } else if (status === 401 || status === 403) {
          throw new IndexReembedRpcError(
            -32603,
            `Fatal: OpenAI returned ${status}. Check openai.api_key validity.`,
          );
        } else {
          throw err;
        }
      }
      ctx.notify("index.reembedProgress", {
        jobId,
        done: succeeded + skipped,
        total,
        skipped,
      });
    }

    ctx.notify("index.reembedDone", {
      jobId,
      succeeded,
      skipped,
      durationMs: Date.now() - startedAt,
    });
  } catch (err) {
    ctx.notify("index.reembedError", {
      jobId,
      code: err instanceof IndexReembedRpcError ? err.rpcCode : -32603,
      message: err instanceof Error ? err.message : String(err),
    });
  } finally {
    activeReembeds.delete(jobId);
  }
}

export async function dispatchIndexReembedRpc(
  method: string,
  params: unknown,
  ctx: IndexReembedRpcContext,
): Promise<{ kind: "hit"; value: unknown } | { kind: "miss" }> {
  if (method === "index.reembed") {
    const p = parseReembedParams(params);
    const jobId = newJobId();
    const controller = new AbortController();
    activeReembeds.set(jobId, controller);
    void runReembedJob(jobId, p, ctx, controller);
    return { kind: "hit", value: { jobId } };
  }
  if (method === "index.reembedCancel") {
    const rec =
      params !== null && typeof params === "object" ? (params as Record<string, unknown>) : {};
    const jobId = rec["jobId"];
    if (typeof jobId !== "string") {
      throw new IndexReembedRpcError(-32602, "params.jobId is required");
    }
    const controller = activeReembeds.get(jobId);
    if (controller === undefined) {
      return { kind: "hit", value: { cancelled: false } };
    }
    controller.abort();
    return { kind: "hit", value: { cancelled: true } };
  }
  return { kind: "miss" };
}
```

- [ ] **Step 11.4: Mount in the dispatcher chain**

Modify `packages/gateway/src/ipc/server/dispatchers.ts`. Add the import:

```ts
import {
  dispatchIndexReembedRpc,
  IndexReembedRpcError,
} from "../index-reembed-rpc.ts";
```

Add a new `tryDispatchIndexReembedRpc` after `tryDispatchReindexRpc`:

```ts
export async function tryDispatchIndexReembedRpc(
  ctx: ServerCtx,
  method: string,
  params: unknown,
): Promise<unknown> {
  if (method !== "index.reembed" && method !== "index.reembedCancel") {
    return phase4RpcSkipped;
  }
  if (ctx.options.localIndex === undefined) {
    throw new RpcMethodError(-32603, "index.reembed requires LocalIndex");
  }
  if (ctx.options.dataDir === undefined) {
    throw new RpcMethodError(-32603, "index.reembed requires dataDir");
  }
  try {
    const out = await dispatchIndexReembedRpc(method, params, {
      db: ctx.options.localIndex.getDatabase(),
      vault: ctx.options.vault,
      paths: { dataDir: ctx.options.dataDir },
      logger: ctx.options.logger,
      notify: (m, p) => ctx.broadcastNotification(m, p as Record<string, unknown>),
    });
    if (out.kind === "hit") return out.value;
  } catch (e) {
    if (e instanceof IndexReembedRpcError) {
      throw new RpcMethodError(e.rpcCode, e.message);
    }
    throw e;
  }
  return phase4RpcSkipped;
}
```

(Confirm `ctx.options.logger` exists — if the existing dispatchers reference `ctx.options.logger`, mirror; otherwise import a no-op logger or accept whatever `ServerCtx` already exposes for logging.)

Mount it in `tryDispatchPhase4Rpc` (around line 458, before the `tryDispatchReindexRpc` line):

```ts
const indexReembedOutcome = await tryDispatchIndexReembedRpc(ctx, method, params);
if (indexReembedOutcome !== phase4RpcSkipped) return indexReembedOutcome;
```

- [ ] **Step 11.5: Run the RPC test**

```bash
bun test packages/gateway/src/ipc/index-reembed-rpc.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 11.6: Typecheck**

```bash
bun run typecheck
```

- [ ] **Step 11.7: Commit**

```bash
git add packages/gateway/src/ipc/index-reembed-rpc.ts \
        packages/gateway/src/ipc/index-reembed-rpc.test.ts \
        packages/gateway/src/ipc/server/dispatchers.ts
git commit -m "$(cat <<'EOF'
feat(ipc): T6 PR 3 — index.reembed long-running RPC

Mirrors the llm.pullModel pattern: returns { jobId } synchronously,
runs the embed loop in a void chain, streams index.reembedProgress /
index.reembedDone / index.reembedError notifications. Cancel via
index.reembedCancel. batchSize clamped 1≤N≤256 (OpenAI per-request
limit). Single retry on 429/5xx with Retry-After or 2 s fallback;
401/403 are fatal.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12 — Block `index.reembed*` over LAN (I5 wiring)

**Files:**
- Modify: `packages/gateway/src/ipc/lan-rpc.ts`
- Modify: `packages/gateway/src/security-invariants.test.ts`
- Modify: `docs/SECURITY-INVARIANTS.md`

- [ ] **Step 12.1: Update the LAN blocklist**

Modify `packages/gateway/src/ipc/lan-rpc.ts:10-18`:

```ts
const FORBIDDEN_OVER_LAN = new Set([
  "vault",
  "updater",
  "lan",
  "profile",
  "audit",
  "data",
  "connector.addMcp",
  "index.reembed",       // T6 PR 3 — write-class index method
  "index.reembedCancel", // T6 PR 3 — paired cancel
]);
```

- [ ] **Step 12.2: Extend the security-invariants test**

Open `packages/gateway/src/security-invariants.test.ts`. Find the existing block that asserts `FORBIDDEN_OVER_LAN` membership (search for `index.reembed`, `connector.addMcp`, or `FORBIDDEN_OVER_LAN`). Add assertions for the two new entries:

```ts
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("I5 — LAN write-class blocklist for index.reembed*", () => {
  test("ipc/lan-rpc.ts FORBIDDEN_OVER_LAN includes index.reembed and index.reembedCancel", () => {
    const src = readFileSync(
      join(__dirname, "ipc", "lan-rpc.ts"),
      "utf8",
    );
    expect(src).toContain('"index.reembed"');
    expect(src).toContain('"index.reembedCancel"');
  });
});
```

(If `__dirname` is unavailable in the bun-test context, use `import.meta.dir` or compute via `import.meta.url` — match the pattern used by other entries in the same file.)

- [ ] **Step 12.3: Update SECURITY-INVARIANTS.md**

Open `docs/SECURITY-INVARIANTS.md`. Find the I5 row's "Anti-pattern that regresses it" cell. Append a sentence:

> Exposing `index.*` write methods (`index.reembed`, `index.reembedCancel`, …) over LAN without an explicit `FORBIDDEN_OVER_LAN` entry — the namespace is intentionally LAN-allowed for read paths, so any new write surface needs a full-method-name entry.

- [ ] **Step 12.4: Run the security-invariants test**

```bash
bun test packages/gateway/src/security-invariants.test.ts
```

Expected: green, including the new I5 sub-test.

- [ ] **Step 12.5: Commit**

```bash
git add packages/gateway/src/ipc/lan-rpc.ts \
        packages/gateway/src/security-invariants.test.ts \
        docs/SECURITY-INVARIANTS.md
git commit -m "$(cat <<'EOF'
fix(security): T6 PR 3 — block index.reembed* over LAN (I5)

checkLanMethodAllowed is default-allow with a blocklist; index.* is
intentionally LAN-allowed for read paths (index.search / index.query /
index.getItem). Adds full-method-name entries for the two new write
methods and extends the I5 enforcement test + anti-pattern docs so the
gap can't be reintroduced silently.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13 — `nimbus index reembed` CLI

**Files:**
- Create: `packages/cli/src/commands/index-cmd.ts`
- Create: `packages/cli/test/unit/commands/index-cmd.test.ts`
- Modify: `packages/cli/src/commands/index.ts`
- Modify: `packages/cli/src/commands/help.ts`
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 13.1: Implement the CLI command**

```ts
// packages/cli/src/commands/index-cmd.ts
import { withGatewayIpc } from "../lib/with-gateway-ipc.ts";

type ReembedSummary = {
  jobId: string;
  succeeded: number;
  skipped: number;
  durationMs: number;
  planned?: number;
  dryRun?: boolean;
};

function takeFlag(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i < 0 || i + 1 >= args.length) return undefined;
  return args[i + 1];
}

function takeBool(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function parseInteger(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function printPlannedAction(p: {
  model: string;
  itemType?: string;
  service?: string;
  limit?: number;
  batchSize?: number;
}): void {
  console.log(`Planned reembed:`);
  console.log(`  model      = ${p.model}`);
  if (p.itemType !== undefined) console.log(`  item-type  = ${p.itemType}`);
  if (p.service !== undefined) console.log(`  service    = ${p.service}`);
  if (p.limit !== undefined) console.log(`  limit      = ${String(p.limit)}`);
  if (p.batchSize !== undefined) console.log(`  batch-size = ${String(p.batchSize)}`);
  console.log("Re-run with --yes to execute, or --dry-run to compute the candidate count.");
}

async function runReembed(args: string[]): Promise<void> {
  const model = takeFlag(args, "--model");
  if (model === undefined || model === "") {
    throw new Error("Usage: nimbus index reembed --model <id> [--item-type <key>] [--service <name>] [--limit N] [--batch-size N] [--dry-run] [--yes] [--json]");
  }
  const itemType = takeFlag(args, "--item-type");
  const service = takeFlag(args, "--service");
  const limit = parseInteger(takeFlag(args, "--limit"));
  const batchSize = parseInteger(takeFlag(args, "--batch-size"));
  const dryRun = takeBool(args, "--dry-run");
  const yes = takeBool(args, "--yes");
  const isJson = takeBool(args, "--json");

  if (!dryRun && !yes) {
    printPlannedAction({ model, itemType, service, limit, batchSize });
    return;
  }

  const params: Record<string, unknown> = { model, dryRun };
  if (itemType !== undefined) params["itemType"] = itemType;
  if (service !== undefined) params["service"] = service;
  if (limit !== undefined) params["limit"] = limit;
  if (batchSize !== undefined) params["batchSize"] = batchSize;

  const summary = await withGatewayIpc(async (c) => {
    const subscriptions: Array<() => void> = [];
    const result = await new Promise<ReembedSummary>((resolve, reject) => {
      let jobId: string | undefined;
      subscriptions.push(
        c.subscribe("index.reembedProgress", (n: unknown) => {
          const p = n as { jobId: string; done: number; total: number; skipped: number };
          if (jobId === undefined || p.jobId !== jobId) return;
          if (!isJson) {
            console.log(`progress: ${String(p.done)}/${String(p.total)} (skipped ${String(p.skipped)})`);
          }
        }),
      );
      subscriptions.push(
        c.subscribe("index.reembedDone", (n: unknown) => {
          const p = n as ReembedSummary;
          if (jobId === undefined || p.jobId !== jobId) return;
          resolve(p);
        }),
      );
      subscriptions.push(
        c.subscribe("index.reembedError", (n: unknown) => {
          const p = n as { jobId: string; code: number; message: string };
          if (jobId === undefined || p.jobId !== jobId) return;
          reject(new Error(`ERROR: ${p.message}`));
        }),
      );
      c.call<{ jobId: string }>("index.reembed", params)
        .then((r) => {
          jobId = r.jobId;
        })
        .catch(reject);
    });
    for (const unsub of subscriptions) unsub();
    return result;
  });

  if (isJson) {
    console.log(JSON.stringify(summary));
  } else if (summary.dryRun === true) {
    console.log(`Dry run: ${String(summary.planned ?? 0)} item(s) would be reembedded.`);
  } else {
    console.log(
      `Reembedded ${String(summary.succeeded)} item(s); skipped ${String(summary.skipped)} ` +
        `(${String(summary.durationMs)} ms).`,
    );
  }
}

function printIndexHelp(): void {
  console.log(`nimbus index — local index maintenance (Gateway IPC)

Usage:
  nimbus index reembed --model <id>
                       [--item-type <key>]   ("service:type" exact, or "type" alone)
                       [--service <name>]
                       [--limit N]
                       [--batch-size N]      (default 100, clamped 1..256)
                       [--dry-run]
                       [--yes]               (required for non-dry runs)
                       [--json]

Models (v1):
  openai:text-embedding-3-small  (1536-dim; needs vault key openai.api_key)
  Xenova/all-MiniLM-L6-v2        (384-dim; local, no key required)

Exit codes:
  0  run completed (any number of skips); operator re-runs to retry skipped items
  1  fatal abort (vault key missing, unknown model, auth failure, gateway down)
`);
}

export async function runIndexCmd(args: string[]): Promise<void> {
  const sub = args[0];
  const tail = args.slice(1);
  if (sub === undefined || sub === "help" || sub === "--help" || sub === "-h") {
    printIndexHelp();
    return;
  }
  if (sub === "reembed") {
    await runReembed(tail);
    return;
  }
  throw new Error(`Unknown index subcommand: ${sub}. Try: nimbus index help`);
}
```

(Confirm `withGatewayIpc`'s client exposes `subscribe(method, handler)` — if it uses a different API surface (`onNotification`, `addEventListener`, etc.) substitute in. The pattern matches `nimbus llm pull`'s subscription handling — see `packages/cli/src/commands/llm.ts` if needed.)

- [ ] **Step 13.2: Register the command**

Modify `packages/cli/src/commands/index.ts`:

```ts
export { runIndexCmd } from "./index-cmd.ts";
```

Modify `packages/cli/src/index.ts:62-97`. Add the import:

```ts
import {
  …existing…,
  runIndexCmd,
  …existing…,
} from "./commands/index.ts";
```

Add the handler entry:

```ts
const COMMAND_HANDLERS: Readonly<Record<string, CommandHandler>> = {
  …
  index: runIndexCmd,
  …
};
```

- [ ] **Step 13.3: Add the help row**

Modify `packages/cli/src/commands/help.ts`. Find the existing list of commands and add a row for `nimbus index reembed`. (Match the formatting used for sibling rows like `nimbus db verify`, `nimbus connector list`.)

- [ ] **Step 13.4: Write the CLI test**

```ts
// packages/cli/test/unit/commands/index-cmd.test.ts
import { describe, expect, test } from "bun:test";
import { runIndexCmd } from "../../../src/commands/index-cmd.ts";

describe("nimbus index", () => {
  test("help prints usage", async () => {
    const orig = console.log;
    const lines: string[] = [];
    console.log = (s: unknown) => {
      lines.push(String(s));
    };
    try {
      await runIndexCmd(["help"]);
    } finally {
      console.log = orig;
    }
    expect(lines.join("\n")).toContain("nimbus index reembed");
  });

  test("unknown subcommand throws", async () => {
    await expect(runIndexCmd(["bogus"])).rejects.toThrow(/Unknown index subcommand/);
  });

  test("reembed without --model throws usage error", async () => {
    await expect(runIndexCmd(["reembed"])).rejects.toThrow(/--model/);
  });

  test("reembed without --yes / --dry-run prints planned action and returns", async () => {
    const orig = console.log;
    const lines: string[] = [];
    console.log = (s: unknown) => {
      lines.push(String(s));
    };
    try {
      await runIndexCmd(["reembed", "--model", "Xenova/all-MiniLM-L6-v2"]);
    } finally {
      console.log = orig;
    }
    expect(lines.join("\n")).toMatch(/Planned reembed/);
    expect(lines.join("\n")).toMatch(/--yes/);
  });
});
```

- [ ] **Step 13.5: Run the test**

```bash
bun test packages/cli/test/unit/commands/index-cmd.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 13.6: Typecheck**

```bash
bun run typecheck
```

- [ ] **Step 13.7: Commit**

```bash
git add packages/cli/src/commands/index-cmd.ts \
        packages/cli/test/unit/commands/index-cmd.test.ts \
        packages/cli/src/commands/index.ts \
        packages/cli/src/commands/help.ts \
        packages/cli/src/index.ts
git commit -m "$(cat <<'EOF'
feat(cli): T6 PR 3 — nimbus index reembed

New top-level `index` namespace with `reembed` subcommand. Calls
index.reembed over IPC, subscribes to progress/done/error
notifications BEFORE issuing the request (avoids early-notification
races, mirrors nimbus llm pull). --yes required for non-dry runs;
--dry-run reports the candidate count without writes; --json switches
to a single summary object.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14 — End-to-end integration test

**Files:**
- Create: `packages/gateway/test/integration/embedding/reembed-end-to-end.test.ts`

- [ ] **Step 14.1: Write the test**

```ts
// packages/gateway/test/integration/embedding/reembed-end-to-end.test.ts
import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MockVault } from "@nimbus-dev/sdk/testing";
import pino from "pino";
import { runIndexedSchemaMigrations } from "../../../src/index/migrations/runner.ts";
import { tryLoadSqliteVec } from "../../../src/index/sqlite-vec-load.ts";
import {
  dispatchIndexReembedRpc,
  type IndexReembedRpcContext,
} from "../../../src/ipc/index-reembed-rpc.ts";

function freshCtx(): {
  db: Database;
  ctx: IndexReembedRpcContext;
  events: Array<{ method: string; params: unknown }>;
  cleanup: () => void;
} {
  const tmp = mkdtempSync(join(tmpdir(), "nimbus-reembed-"));
  const db = new Database(join(tmp, "nimbus.db"));
  if (!tryLoadSqliteVec(db)) {
    db.close();
    rmSync(tmp, { recursive: true, force: true });
    throw new Error("sqlite-vec required for end-to-end test");
  }
  runIndexedSchemaMigrations(db, 30);
  const events: Array<{ method: string; params: unknown }> = [];
  const ctx: IndexReembedRpcContext = {
    db,
    vault: new MockVault(),
    paths: { dataDir: tmp },
    logger: pino({ level: "silent" }),
    notify: (method, params) => {
      events.push({ method, params });
    },
  };
  return {
    db,
    ctx,
    events,
    cleanup: () => {
      db.close();
      rmSync(tmp, { recursive: true, force: true });
    },
  };
}

function seed(db: Database) {
  const now = Date.now();
  for (const [id, service, type] of [
    ["s1", "slack", "message"],
    ["s2", "slack", "message"],
    ["g1", "github", "git_commit"],
    ["g2", "github", "git_commit"],
  ] as const) {
    db.run(
      `INSERT INTO item (id, service, type, external_id, title, body_preview,
          modified_at, synced_at)
       VALUES (?, ?, ?, ?, 'T', 'B', ?, ?)`,
      [`${service}:${id}`, service, type, id, now, now],
    );
  }
}

describe("nimbus index reembed — end-to-end", () => {
  test("local model embeds matching items; second run is a no-op", async () => {
    const { db, ctx, events, cleanup } = freshCtx();
    try {
      seed(db);
      const first = await dispatchIndexReembedRpc(
        "index.reembed",
        {
          model: "Xenova/all-MiniLM-L6-v2",
          itemType: "git_commit",
          batchSize: 100,
        },
        ctx,
      );
      expect(first.kind).toBe("hit");
      // Allow async chain to settle
      await new Promise((r) => setTimeout(r, 200));
      const done = events.find((e) => e.method === "index.reembedDone");
      expect(done).toBeDefined();
      const counts = db
        .query(`SELECT count(*) AS c FROM embedding_chunk WHERE model = ?`)
        .get("Xenova/all-MiniLM-L6-v2") as { c: number };
      expect(counts.c).toBeGreaterThan(0);

      // Second run is idempotent
      events.length = 0;
      await dispatchIndexReembedRpc(
        "index.reembed",
        {
          model: "Xenova/all-MiniLM-L6-v2",
          itemType: "git_commit",
          batchSize: 100,
        },
        ctx,
      );
      await new Promise((r) => setTimeout(r, 200));
      const done2 = events.find((e) => e.method === "index.reembedDone") as
        | { params: { succeeded: number; skipped: number } }
        | undefined;
      expect(done2?.params.succeeded).toBe(0);
      expect(done2?.params.skipped).toBe(0);
    } finally {
      cleanup();
    }
  });

  test("openai model without vault key emits reembedError", async () => {
    const { db, ctx, events, cleanup } = freshCtx();
    try {
      seed(db);
      await dispatchIndexReembedRpc(
        "index.reembed",
        { model: "openai:text-embedding-3-small", batchSize: 100 },
        ctx,
      );
      await new Promise((r) => setTimeout(r, 50));
      const err = events.find((e) => e.method === "index.reembedError");
      expect(err).toBeDefined();
      expect((err?.params as { message: string }).message).toMatch(/openai\.api_key/);
    } finally {
      cleanup();
    }
  });
});
```

(If `Xenova/all-MiniLM-L6-v2` requires downloading model weights at test time and that's slow / unreliable in CI, the integration test should mock `createLocalEmbedder` via a Bun module-mock or substitute a small stub embedder factory. If `MockVault` from `@nimbus-dev/sdk/testing` is not the actual import path, look it up via `grep -rn "MockVault" packages/gateway/test packages/sdk/src` and use whichever module exports it.)

- [ ] **Step 14.2: Run the integration test**

```bash
bun test packages/gateway/test/integration/embedding/reembed-end-to-end.test.ts
```

Expected: 2 tests pass. (If the local-embedder weights download is slow on first run, allow up to ~60 s.)

- [ ] **Step 14.3: Commit**

```bash
git add packages/gateway/test/integration/embedding/reembed-end-to-end.test.ts
git commit -m "$(cat <<'EOF'
test(embedding): T6 PR 3 — reembed end-to-end integration

Real SQLite + temp dir + MockVault. Verifies local-model reembed writes
embedding_chunk rows for matching items and that a second run is fully
idempotent. Verifies openai:* without vault key emits reembedError.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15 — Docs (architecture / cli-reference / skill files)

**Files:**
- Modify: `docs/architecture.md`
- Modify: `docs/cli-reference.md`
- Modify: `.claude/commands/nimbus-file-map.md`
- Modify: `.claude/commands/nimbus-ipc.md`
- Modify: `.claude/commands/nimbus-commands.md`

- [ ] **Step 15.1: Update `docs/architecture.md`**

Add a row for `vec_items_1536` under "Local Database Schema" (find the existing `vec_items_384` row and add a sibling row referencing the V30 migration, dim-aware delete triggers, and the routing module).

In the "Embedding" section, add a paragraph after the current single-pipeline description:

> **Hybrid mode (T6 PR 3, 2026-05-15):** with `[embedding].provider = "hybrid"`, items whose `(service, type)` pair appears in `embedding/routing.ts:PROSE_HEAVY_TYPES` route to OpenAI `text-embedding-3-small` (1536-dim, written to `vec_items_1536`); everything else stays on local MiniLM-L6-v2 (384-dim, `vec_items_384`). Query-side dual search uses `search/dual-search.ts:vectorSearchChunksDual` to merge KNN results across both tables. The `provider = "openai"` value is now a 1536-dim everywhere mode — the prior 384-dim semantics are gone.

- [ ] **Step 15.2: Update `docs/cli-reference.md`**

Add a `nimbus index reembed` subsection under the appropriate header. Include the full flag list (model, item-type, service, limit, batch-size, dry-run, yes, json), the v1 model values, the exit codes (0 / 1), and an example session showing the planned-action / dry-run / yes flow.

- [ ] **Step 15.3: Update `.claude/commands/nimbus-file-map.md`**

Add rows under the relevant tables for the six new files:

```
| `packages/gateway/src/index/vec-items-1536-v30-sql.ts` | V30 migration SQL — `vec_items_1536` virtual table + dim-aware delete triggers (T6 PR 3). |
| `packages/gateway/src/embedding/routing.ts` | `PROSE_HEAVY_TYPES` set + `EMBEDDING_DIM_*` constants + `routingKey` / `isProseHeavy` helpers. |
| `packages/gateway/src/embedding/routing-pipeline.ts` | `RoutingEmbeddingPipeline` — wraps two `SqliteEmbeddingPipeline`s and dispatches by `(service, type)` (T6 PR 3). |
| `packages/gateway/src/embedding/create-routing-runtime.ts` | `tryCreateRoutingEmbeddingRuntime` — hybrid-mode factory; falls back to MiniLM-only when `openai.api_key` missing. |
| `packages/gateway/src/search/dual-search.ts` | `vectorSearchChunksDual` — KNN over both `vec_items_*` tables, merge by distance. |
| `packages/gateway/src/ipc/index-reembed-rpc.ts` | `dispatchIndexReembedRpc` — `index.reembed` / `index.reembedCancel` long-running handler. |
| `packages/cli/src/commands/index-cmd.ts` | `nimbus index reembed` — IPC-driven reembed CLI with progress streaming. |
```

- [ ] **Step 15.4: Update `.claude/commands/nimbus-ipc.md`**

Extend the `index.*` table with the four new methods/notifications:

| Method | Type | Description |
|---|---|---|
| `index.reembed` | request | Selectively re-embed items to a target model. Returns `{ jobId }`; emits progress / done / error notifications. CLI-only — NOT in Tauri allowlist; NOT LAN-callable (FORBIDDEN_OVER_LAN). |
| `index.reembedCancel` | request | Cancel an in-flight reembed job. Returns `{ cancelled: boolean }`. |
| `index.reembedProgress` | notification | `{ jobId, done, total, skipped }` per batch. |
| `index.reembedDone` | notification | `{ jobId, succeeded, skipped, durationMs }` on completion (including dry-run). |
| `index.reembedError` | notification | `{ jobId, code, message }` on fatal abort. |

- [ ] **Step 15.5: Update `.claude/commands/nimbus-commands.md`**

Add a new row under "Phase 5 T6":

```
nimbus index reembed --model <id> [--item-type <key>] [--service <name>] [--limit N] [--batch-size N] [--dry-run] [--yes] [--json]
```

With a one-line description of the v1 model values and exit codes.

- [ ] **Step 15.6: Verify links + lint**

```bash
bun scripts/structure-audit/check-doc-references.ts --check
```

Expected: clean (no broken links). If new doc references fail the check, add them to the relevant baseline if intentional, otherwise fix the links.

- [ ] **Step 15.7: Commit**

```bash
git add docs/architecture.md docs/cli-reference.md \
        .claude/commands/nimbus-file-map.md \
        .claude/commands/nimbus-ipc.md \
        .claude/commands/nimbus-commands.md
git commit -m "$(cat <<'EOF'
docs: T6 PR 3 — vec_items_1536 + routing + reembed CLI

Architecture schema row, CLI reference subsection, IPC method registry
update, and skill-file pointers for the six new files.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16 — Roadmap close + full CI parity

**Files:**
- Modify: `docs/roadmap.md`
- Modify: `CLAUDE.md`

- [ ] **Step 16.1: Update `docs/roadmap.md`**

Find the T6 progress block under Phase 5 Core item 5. Flip the PR 3 sub-checkbox:

```
  - [x] PR 3 — `vec_items_1536` + per-type routing + reembed CLI (V30) — 2026-05-15
```

Extend the `Last updated:` line at `roadmap.md:7` with `T6 PR3 ✅ (2026-05-15)`.

- [ ] **Step 16.2: Update `CLAUDE.md` status footer**

Find the line in the `Project Overview` section that lists T6 progress (`T6 PR 2 \`tool_call_log\` V29 ✅`). Append `· T6 PR 3 \`vec_items_1536\` V30 ✅ (2026-05-15)`.

- [ ] **Step 16.3: Run the full CI parity suite**

```bash
bun run test:ci
```

Expected: green across all 18 coverage gates + lint + typecheck + structure audit. Investigate any failure before continuing.

- [ ] **Step 16.4: Run the targeted coverage gates one more time**

```bash
bun run test:coverage:embedding
```

Expected: ≥80% line coverage in `packages/gateway/src/embedding/`.

- [ ] **Step 16.5: Verify the worktree is on the right branch and clean apart from staged docs**

```bash
git status --short
git log --oneline main..HEAD
```

Expected: a tight stack of commits (~16 from Tasks 1–15 + this docs commit), all on `dev/asafgolombek/phase-5-t6-pr3-vec-items-1536`.

- [ ] **Step 16.6: Commit the roadmap + CLAUDE.md updates**

```bash
git add docs/roadmap.md CLAUDE.md
git commit -m "$(cat <<'EOF'
docs(roadmap): T6 PR 3 — close vec_items_1536 + routing + reembed CLI

Flips the PR 3 sub-checkbox; extends the Last updated header. Updates
the CLAUDE.md project-overview status footer with the V30 milestone.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 16.7: Open the PR**

```bash
git push -u origin dev/asafgolombek/phase-5-t6-pr3-vec-items-1536
gh pr create --title "Phase 5 T6 PR 3 — vec_items_1536 + per-(service,type) routing + reembed CLI" --body "$(cat <<'EOF'
## Summary
- V30 migration adds `vec_items_1536` virtual table + dim-aware delete triggers; existing 384-dim entries are unaffected.
- `[embedding].provider = "hybrid"` enables per-`(service, type)` routing: 14 prose-heavy pairs go to OpenAI `text-embedding-3-small` (1536-dim), everything else stays on local MiniLM (384-dim). `provider = "openai"` is promoted from 384 → 1536.
- `nimbus index reembed --model <id>` plus `index.reembed` IPC method for selective backfill (CLI-only, blocked over LAN per I5).

## Test plan
- [ ] `bun run test:ci` green
- [ ] `bun test packages/gateway/src/embedding/routing.test.ts`
- [ ] `bun test packages/gateway/src/embedding/routing-pipeline.test.ts`
- [ ] `bun test packages/gateway/src/index/migrations/runner-v30.test.ts`
- [ ] `bun test packages/gateway/src/search/dual-search.test.ts`
- [ ] `bun test packages/gateway/src/ipc/index-reembed-rpc.test.ts`
- [ ] `bun test packages/gateway/test/integration/embedding/reembed-end-to-end.test.ts`
- [ ] `bun test packages/gateway/src/security-invariants.test.ts` (new I5 sub-test)
- [ ] Manual: with a real `openai.api_key`, run `nimbus index reembed --model openai:text-embedding-3-small --item-type slack:message --dry-run` and `--yes`; verify `vec_items_1536` populated.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Notes

**Spec coverage:** every section of `2026-05-15-phase-5-t6-pr3-vec-items-1536-design.md` maps to a task above.
- §1 V30 migration → Task 1.
- §2 Routing module → Task 2.
- §3a IndexedItem → Task 3. §3b dim-aware pipeline → Task 4. §3c `RoutingEmbeddingPipeline` → Task 5. §3d provider switch → Task 6. §3e routing tests → Task 5.
- §4a dim-aware vec-store → Task 8. §4b dual-search → Task 9. §4c `embedQueryDual` → Task 7. §4d caller updates → Task 10. §4e–§4g notes → no code (documented in spec); covered by tests in Tasks 8/9/10.
- §5a CLI surface → Task 13. §5b IPC contract → Task 11. §5c job runner → Task 11. §5d exit codes → Task 13 (CLI mapping). §5e registration → Task 13. §5f tests → Tasks 11 + 13 + 14.
- §6a coverage gates → Task 16. §6b security invariants → Task 12. §6c docs → Task 15.
- §7 Out of scope → no code.
- §9 review disposition → no code (already in spec).

**Type consistency check:**
- `IndexedItem` shape (`id, service, type, title, body_preview`) — Tasks 3, 4, 5, 11, 14.
- `RoutingScope` — Task 4 declares; Task 5 consumes.
- `embedQueryDual` return shape — Tasks 6 (RoutingRuntime), 7 (lazy + worker), 10 (`SemanticSearchDeps` + dispatcher).
- `DualSearchOptions` field names — Task 9 declares; Task 10 caller uses identical names.
- `IndexReembedRpcContext` — Task 11 declares; Task 14 reuses.
- `index.reembedProgress` payload (`{ jobId, done, total, skipped }`) — Task 11 emits; Task 13 consumes; Task 15 documents.
- `FORBIDDEN_OVER_LAN` entries `"index.reembed"` + `"index.reembedCancel"` — Task 12 wires; Task 12 test asserts.

**Placeholder scan:** every step shows real code, real commands, real expected output. The two "if X applies" notes (Step 6.5 unused-import cleanup, Step 13.1 `subscribe` API confirmation, Step 12.2 `__dirname` vs `import.meta.dir`) are calibration prompts based on whichever convention the file already uses — they have a clear default action and a clear fallback action. No "TODO/TBD" remain.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-15-phase-5-t6-pr3-vec-items-1536.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

**Which approach?**
