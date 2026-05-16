# Phase 5 T6 PR 3 — `vec_items_1536` + per-`(service,type)` routing + reembed CLI — Design

> **Status:** Draft for review
> **Author:** asafgolombek
> **Date:** 2026-05-15
> **Parent sequencing spec:** [`2026-05-14-phase-5-t6-design.md`](./2026-05-14-phase-5-t6-design.md) §2 PR 3
> **Branch / worktree:** `dev/asafgolombek/phase-5-t6-pr3-vec-items-1536` @ `.worktrees/phase-5-t6-pr3-vec-items-1536/`

## Purpose

T6 PR 3 adds a second sqlite-vec virtual table (`vec_items_1536`) and per-`(service, type)` embedding-model routing so prose-heavy item types (Slack messages, emails, Notion / Confluence / Obsidian pages, PagerDuty incidents, Linear / Jira / GitHub / GitLab / Bitbucket issues, Discord and Teams messages) can use OpenAI `text-embedding-3-small` at its native 1536-dim while code- and metadata-heavy types stay on the local MiniLM-L6-v2 (384-dim). It also adds a `nimbus index reembed` CLI for selective backfill and a corresponding IPC method.

PR 3 is the third of four PRs in T6 (after PR 1 I10-helpers ✅ and PR 2 `tool_call_log` V29 ✅; before PR 4 typed-`dbRun` mega-PR). The parent sequencing spec locks the strict serial order; this document locks the implementation choices that the parent spec deferred to "PR 3's per-PR spec".

The work is bounded: one schema migration (V30), one new routing module + one wrapper pipeline + dim-aware updates to the existing pipeline + a dim-aware update to the existing vector-search helper + one merge helper, one IPC method pair (one request + one cancel + three notifications), one CLI subcommand, and the corresponding tests / docs. No new I-numbered invariant; the I9 wiring stays as today because table names are derived from a numeric embedder dim (enum-equivalent), not caller-supplied input.

## Section 1 — V30 migration

**Migration number.** V30 (latest on `main` is V29 — `tool_call_log` from T6 PR 2).

**New file.** `packages/gateway/src/index/vec-items-1536-v30-sql.ts` exporting two SQL strings, mirroring the V6 pattern:

```sql
-- VEC_ITEMS_1536_V30_SCHEMA_SQL — applied when sqlite-vec is loaded
CREATE VIRTUAL TABLE IF NOT EXISTS vec_items_1536
  USING vec0(embedding float[1536]);

-- Update the existing 384-dim trigger so it only fires on dim-match
DROP TRIGGER IF EXISTS embedding_chunk_ad_delete_vec384;
CREATE TRIGGER embedding_chunk_ad_delete_vec384
AFTER DELETE ON embedding_chunk
FOR EACH ROW
WHEN OLD.dims = 384
BEGIN
  DELETE FROM vec_items_384 WHERE rowid = OLD.vec_rowid;
END;

-- New 1536-dim trigger
CREATE TRIGGER IF NOT EXISTS embedding_chunk_ad_delete_vec1536
AFTER DELETE ON embedding_chunk
FOR EACH ROW
WHEN OLD.dims = 1536
BEGIN
  DELETE FROM vec_items_1536 WHERE rowid = OLD.vec_rowid;
END;

-- VEC_ITEMS_1536_V30_NO_VEC_SQL — applied when sqlite-vec is unavailable
-- (empty body; the no-vec embedding_chunk schema has no triggers to update)
```

**Runner wiring.** `packages/gateway/src/index/migrations/runner.ts`:

- New `migrateIndexedV29ToV30` mirroring `migrateIndexedV28ToV29`. Uses `vecTableExists(db)` to decide which SQL constant to apply (consistent with the V10 sqlite-vec-absent fork).
- Appended to `INDEXED_SCHEMA_STEPS`.
- `BACKFILL_LABELS` extended with one new entry (`"vec_items_1536 + dim-aware delete triggers (T6 PR 3) (backfilled)"`).

**Schema target bump.** `packages/gateway/src/index/local-index.ts`: `CURRENT_SCHEMA_VERSION = 30`.

**sqlite-vec-absent fallback.** When `tryLoadSqliteVec` fails (macOS CI without notarised extension, etc.), the migration applies `VEC_ITEMS_1536_V30_NO_VEC_SQL` (an empty string — there is no shadow schema to update because the no-vec V6 fallback already created `embedding_chunk` without triggers). `vec_items_1536` is absent, the `_schema_migrations` row is still recorded, and runtime routing falls back to MiniLM-only (see §3).

**Migration test.** `packages/gateway/src/index/migrations/runner-v30.test.ts` (matches existing per-version pattern):

1. Running migrations on a fresh `:memory:` DB advances `user_version` to 30.
2. V30 records a row in `_schema_migrations` with `description` containing `vec_items_1536`.
3. When sqlite-vec is loaded, `vec_items_1536` exists; the 384-dim trigger has the `WHEN OLD.dims = 384` clause (verified via `sqlite_master.sql`); the 1536-dim trigger exists.
4. When sqlite-vec is unavailable (`NIMBUS_FORCE_NO_VEC=1` or the absent-vec path), `vec_items_1536` does not exist but the migration row is still recorded.

**Pre-conditions already guaranteed by V6 + the runner.** Two safety properties the V30 migration relies on without re-asserting them:

- `embedding_chunk.dims INTEGER NOT NULL` was declared at V6 (`embedding-v6-sql.ts:16`). Every existing row has a non-null `dims` value, so the new `WHEN OLD.dims = 384` and `WHEN OLD.dims = 1536` clauses are well-defined for all rows.
- Every migration step in `runner.ts` runs inside a single `db.transaction(() => { db.exec(...); db.exec("PRAGMA user_version = N"); recordMigration(...); })()` (see `migrateIndexedV5ToV6` at `runner.ts:146` for the pattern). The `DROP TRIGGER` + `CREATE TRIGGER` + `CREATE VIRTUAL TABLE` sequence in V30 is therefore atomic — there is no window where `DELETE FROM embedding_chunk` would miss its propagation to `vec_items_384`.

## Section 2 — Routing module

**New file.** `packages/gateway/src/embedding/routing.ts`:

```typescript
/** Embedding dimensions for the two supported provider tracks.
 *  Used to derive `vec_items_<dim>` table names (the only valid values),
 *  and to validate query embeddings before KNN. Bumping this list requires
 *  a corresponding `vec_items_<dim>` migration. */
export const EMBEDDING_DIM_LOCAL = 384 as const;
export const EMBEDDING_DIM_OPENAI = 1536 as const;
export const SUPPORTED_EMBEDDING_DIMS = new Set<number>([
  EMBEDDING_DIM_LOCAL,
  EMBEDDING_DIM_OPENAI,
]);

/** Items whose primary content is natural language prose.
 *  Keys are "<service>:<type>" pairs derived from item.service + item.type.
 *  When provider="hybrid" AND openai.api_key is in vault, these route to
 *  OpenAI text-embedding-3-small (1536-dim); everything else stays on
 *  MiniLM-L6-v2 (384-dim). */
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

`SUPPORTED_EMBEDDING_DIMS` is the single source of truth consumed by `pipeline.ts` (constructor gate), `vec-store.ts` (query-dim gate), and `dual-search.ts` (validation). When future providers introduce new dimensions, this set + the corresponding `vec_items_<dim>` migration are the only places that need to change.

**Why a separate module:** keeps the set as a single-screen, grep-able diff; provides a single home for the helper functions used by both the pipeline and the search path. Membership changes are reviewable in the diff alone, not via TOML / UI surface.

**Tests.** `routing.test.ts`:

- Membership: every expected key is present (14 entries); no unexpected keys.
- `isProseHeavy("slack", "message") === true`, `isProseHeavy("github", "git_commit") === false`, `isProseHeavy("obsidian", "obsidian_note") === true`.
- `routingKey("a", "b") === "a:b"`.

**No TOML config surface.** Adding or removing entries is a code change. Phase 6 Marketplace v2 (in T2) can later let extensions declare additional entries via manifest; out of scope here.

## Section 3 — Routing-aware pipeline

### 3a. `types.ts` — extend `IndexedItem`

```typescript
export type IndexedItem = {
  id: string;
  service: string;   // NEW — routing input
  type: string;      // NEW — routing input
  title: string;
  body_preview: string | null;
};
```

Every `SELECT … FROM item` that materialises an `IndexedItem` adds `service, type`:

- `packages/gateway/src/embedding/pipeline.ts` `backfillAll` query.
- `packages/gateway/src/embedding/lazy-scheduler.ts` `scheduleItemEmbedding` query.
- `packages/gateway/src/embedding/embedding-worker.ts` items it fetches for embedding.

Mechanical; covered by the existing test bodies after the type expansion.

### 3b. `pipeline.ts` — `SqliteEmbeddingPipeline` becomes dim-aware

Today the pipeline hardcodes `vec_items_384`. Two changes:

```typescript
import { SUPPORTED_EMBEDDING_DIMS } from "./routing.ts";

constructor(options) {
  …
  if (!SUPPORTED_EMBEDDING_DIMS.has(this.embedder.dims)) {
    throw new Error(`unsupported embedding dim: ${String(this.embedder.dims)}`);
  }
  this.vecTable = `vec_items_${String(this.embedder.dims)}`;
}

async embedItem(item) {
  …
  this.db.transaction(() => {
    this.db.run(`DELETE FROM embedding_chunk WHERE item_id = ? AND model = ?`, [itemId, model]);
    const maxRow = this.db
      .query(`SELECT COALESCE(MAX(rowid), 0) AS m FROM ${this.vecTable}`)
      .get();
    …
    const insertVec = this.db.prepare(
      `INSERT INTO ${this.vecTable}(rowid, embedding) VALUES (?, vec_f32(?))`,
    );
    …
  })();
}
```

**I9 safety.** The `vecTable` string is built from a numeric `dims` value the embedder reports, gated by a hard check that rejects anything other than 384 or 1536. No caller-supplied string reaches the SQL. This is the same enum-equivalent pattern the runner already uses for `vec_items_384` (see `vecTableExists`); the I9 row in `SECURITY-INVARIANTS.md` does not change.

### 3c. New `routing-pipeline.ts` — wrapper implementing `EmbeddingPipeline`

```typescript
export class RoutingEmbeddingPipeline implements EmbeddingPipeline {
  constructor(
    private readonly db: Database,
    private readonly local: SqliteEmbeddingPipeline,   // MiniLM 384
    private readonly openai: SqliteEmbeddingPipeline,  // OpenAI 1536
  ) {}

  get embeddingModel() { return this.local.embeddingModel; }   // primary
  get embeddingDims()  { return this.local.embeddingDims; }

  async embedTexts(texts: string[]): Promise<Float32Array[]> {
    return this.local.embedTexts(texts);  // queries go through 384 by default;
                                          // dual-search invokes the OpenAI side
                                          // separately via embedQueryDual
  }

  async embedItem(item: IndexedItem): Promise<void> {
    const target = isProseHeavy(item.service, item.type) ? this.openai : this.local;
    await target.embedItem(item);
  }

  async deleteItemEmbeddings(itemId: string): Promise<void> {
    this.db.run(`DELETE FROM embedding_chunk WHERE item_id = ?`, [itemId]);
    // dim-aware triggers (§1) fan out to vec_items_384 / vec_items_1536
    // automatically; no explicit per-table cleanup needed.
  }

  async backfillAll(onProgress?): Promise<void> {
    // Routing-aware backfill: each inner pipeline backfills only items that
    // ROUTE to it, not items that "happen to be missing this model". The
    // PROSE_HEAVY_TYPES set is fixed at module load, so each inner call uses
    // it directly with `IN (...)` / `NOT IN (...)` — no DISTINCT scan over
    // `item` is needed.
    const proseKeys = Array.from(PROSE_HEAVY_TYPES);
    await this.openai.backfillForRoutingKeys({ in: proseKeys }, onProgress);
    await this.local.backfillForRoutingKeys({ notIn: proseKeys }, onProgress);
  }
}
```

A new method on `SqliteEmbeddingPipeline`:

```typescript
type RoutingScope =
  | { in: readonly string[] }     // include items whose (service||':'||type) IS in this set
  | { notIn: readonly string[] }; // include items whose (service||':'||type) is NOT in this set

async backfillForRoutingKeys(scope: RoutingScope, onProgress?): Promise<void> {
  // Same query shape as backfillAll, plus a WHERE filter:
  //   AND (i.service || ':' || i.type) IN  (?,?,?,…)   -- scope.in
  //   AND (i.service || ':' || i.type) NOT IN (?,?,?,…)  -- scope.notIn
  // Same `WHERE NOT EXISTS … model = ?` semantics so re-runs are idempotent.
  // No DISTINCT pass over `item`; the existing `idx_item_service` /
  // `idx_item_type` indexes plus the NOT EXISTS sub-select cover the access pattern.
}
```

This keeps backfill correctness clean: a Slack message that has an OpenAI-1536 chunk is never *also* MiniLM-embedded, even though it's "missing" a MiniLM chunk by the old criterion. The two scopes are disjoint by construction (one is the literal complement of the other against the fixed `PROSE_HEAVY_TYPES` set), so an item is only ever considered by one inner pipeline.

### 3d. `create-embedding-runtime.ts` — provider switch

The TOML `[embedding].provider` field gains a third value: `"hybrid"`. The existing `"openai"` value is promoted from 384-dim to 1536-dim (now that `vec_items_1536` exists). Resolution:

| `provider` | `openai.api_key` in vault? | Result |
|---|---|---|
| `"local"` | — | MiniLM-L6-v2 only → `vec_items_384`. Unchanged from today. |
| `"openai"` | present | OpenAI 1536-dim only → `vec_items_1536`. **Behaviour change**: was 384-dim. |
| `"openai"` | missing | Warn + fall back to MiniLM-only (mirrors today's failure mode). |
| `"hybrid"` | present | `RoutingEmbeddingPipeline`(local, openai-1536) — per-`(service,type)` routing. |
| `"hybrid"` | missing | Warn + fall back to MiniLM-only. |

Concretely:

```typescript
if (tomlEmbedding.provider === "hybrid") {
  const openai = await tryCreateOpenAIEmbedderForRouting(vault, logger, 1536);
  if (openai === null) {
    logger.warn("Hybrid embedding: openai.api_key missing; routing falls back to MiniLM-only");
    return createLazyEmbeddingRuntime(db, paths.dataDir, logger, slice);
  }
  return createRoutingEmbeddingRuntime(db, paths.dataDir, logger, slice, openai);
}
if (tomlEmbedding.provider === "openai") {
  // Promoted from 384 → 1536. createOpenAIEmbedder({ apiKey, model, dimensions: 1536 }).
  // …
}
// default: provider === "local" — unchanged.
```

The OpenAI embedder factory's default `dimensions` stays at 384 (back-compat for any direct callers in tests). `create-embedding-runtime.ts` always passes `1536` explicitly when building the OpenAI side for either `"openai"` or `"hybrid"` mode.

**Provider value validation.** `nimbus-toml.ts` `setEmbeddingProvider` already gates on `"local" | "openai"`; extend it to accept `"hybrid"`. Invalid values keep the current "silently ignore" behaviour (fall through to the default `"local"`).

**Upgrade story for existing `provider="openai"` users.** Their existing 384-dim embeddings in `vec_items_384` remain queryable (model tag `openai:text-embedding-3-small`), but newly-synced items now land in `vec_items_1536` with the same model tag. To consolidate, the operator runs `nimbus index reembed --model openai:text-embedding-3-small`, which (a) re-embeds existing items to 1536-dim and (b) replaces their chunks — leaving the now-orphaned `vec_items_384` rows referenced by *no* `embedding_chunk` (because the chunks were re-inserted with `dims = 1536`). The orphans are visible in `db.verify` output if needed; cleanup is not automated in this PR (out of scope).

### 3e. Tests — `routing-pipeline.test.ts`

- Slack message → routes to OpenAI inner pipeline (verified by checking which inner pipeline's `embedItem` was called via spy/fake).
- GitHub `git_commit` → routes to MiniLM inner pipeline.
- Vault-key-missing in hybrid mode → `createEmbeddingRuntime` warns + returns the local-only runtime (verified by inspecting `provider` of the resulting runtime).
- Idempotent re-run: after the routing pipeline embeds 5 prose-heavy + 5 non-prose items, a second `backfillAll` produces zero new embeddings.
- Delete a Slack message → `embedding_chunk` row gone, `vec_items_1536` rowid gone (via dim-aware trigger).

All tests use a stub `Embedder` — no real HTTP to OpenAI.

## Section 4 — Dual-search on the query side

### 4a. `vec-store.ts` — `vectorSearchChunks` becomes dim-aware

```typescript
import { SUPPORTED_EMBEDDING_DIMS } from "../embedding/routing.ts";

export function vectorSearchChunks(db, options): VectorChunkHit[] {
  const dims = options.queryEmbedding.length;
  if (!SUPPORTED_EMBEDDING_DIMS.has(dims)) {
    throw new Error(`unsupported query embedding dim: ${String(dims)}`);
  }
  const vecTable = `vec_items_${String(dims)}`;   // same I9-safe pattern as §3b
  let sql = `
    SELECT ec.item_id AS itemId, …, knn.distance AS distance
    FROM (
      SELECT rowid, distance FROM ${vecTable} WHERE embedding MATCH ? AND k = ?
    ) knn
    INNER JOIN embedding_chunk ec ON ec.vec_rowid = knn.rowid AND ec.model = ?
    …
  `;
  // rest unchanged: service/itemType/since filters, top-k order.
}
```

The `embedding_chunk.model` filter is what disambiguates the two virtual tables when both are populated (each chunk's `model` tag is unique to its embedder).

### 4b. New `search/dual-search.ts` — merge KNN across both tables

```typescript
export type DualSearchOptions = {
  queryEmbedding384?: Float32Array;
  queryEmbedding1536?: Float32Array;
  model384?: string;     // e.g. "Xenova/all-MiniLM-L6-v2"
  model1536?: string;    // e.g. "openai:text-embedding-3-small"
  limit: number;
  service?: string; itemType?: string; since?: number;
};

export function vectorSearchChunksDual(db, opts: DualSearchOptions): VectorChunkHit[] {
  const hits: VectorChunkHit[] = [];
  if (opts.queryEmbedding384 !== undefined && opts.model384 !== undefined) {
    hits.push(...vectorSearchChunks(db, {
      queryEmbedding: opts.queryEmbedding384, model: opts.model384,
      limit: opts.limit, service: opts.service, itemType: opts.itemType, since: opts.since,
    }));
  }
  if (opts.queryEmbedding1536 !== undefined && opts.model1536 !== undefined) {
    hits.push(...vectorSearchChunks(db, {
      queryEmbedding: opts.queryEmbedding1536, model: opts.model1536,
      limit: opts.limit, service: opts.service, itemType: opts.itemType, since: opts.since,
    }));
  }
  hits.sort((a, b) => a.distance - b.distance);
  return hits.slice(0, opts.limit);
}
```

### 4c. `EmbeddingRuntime` extension

Add to `embedding-runtime.ts`:

```typescript
embedQueryDual: (text: string) => Promise<{
  vec384: Float32Array | null;
  vec1536: Float32Array | null;
  model384: string | null;
  model1536: string | null;
}>;
```

In `"local"` mode: returns `{ vec384, null, model384, null }`.
In `"openai"` mode (promoted 1536-dim): returns `{ null, vec1536, null, model1536 }`.
In `"hybrid"` mode: returns both `vec384` and `vec1536` (one OpenAI HTTP call per query).

Existing `embedQuery` stays for back-compat with callers that only want the primary single vector.

### 4d. Caller updates

There is exactly **one** production caller of `vectorSearchChunks` today: `packages/gateway/src/search/hybrid-internal.ts:142` (inside `runVectorSearch`). Switching it to the dual helper is a 3-layer change:

1. **`SemanticSearchDeps`** (consumed in `assemble.ts:129–132` and `local-index.ts:665`) grows two optional callbacks alongside the existing single-vector `embedQuery`:

   ```typescript
   semanticSearch = {
     model: rt.getEmbeddingModel(),                   // existing — primary tag (MiniLM in hybrid)
     embedQuery: (text) => rt.embedQuery(text),       // existing — single-vec, for back-compat
     embedQueryDual: (text) => rt.embedQueryDual(text),  // NEW — { vec384, vec1536, model384, model1536 }
   };
   ```

2. **`HybridSearchOptions`** (in `search/hybrid-types.ts`) grows optional 1536 fields:

   ```typescript
   interface HybridSearchOptions {
     …existing fields…
     queryEmbedding?: Float32Array;        // existing — 384-dim (renamed semantically: "primary")
     embeddingModel: string;               // existing — primary model tag
     queryEmbedding1536?: Float32Array;    // NEW — present iff hybrid mode + openai key
     embeddingModel1536?: string;          // NEW — paired with queryEmbedding1536
   }
   ```

3. **`runVectorSearch`** in `search/hybrid-internal.ts` switches its body from `vectorSearchChunks(db, vecOpts)` to `vectorSearchChunksDual(db, dualOpts)`. The dispatcher in `local-index.ts:665–680` calls `ss.embedQueryDual(nameQ)` instead of `ss.embedQuery(nameQ)` and populates the new `HybridSearchOptions` fields when the dual result has them.

Non-hybrid runtimes return `{ vec1536: null, model1536: null }` from `embedQueryDual`, so the populated `HybridSearchOptions` only carries the 384-dim fields and the dual helper degrades to a single-table KNN — identical results to today's path.

### 4e. Distance-scale caveat

Merging raw L2 distance across two embedding models is a known approximation: both are unit-normalised internally, so the merged ranking is "good enough" for v1. If recall suffers in real use, a future PR adds RRF (reciprocal rank fusion) or per-model min-max normalisation. PR 3 does not try to solve this; the caveat is documented in this spec for review visibility.

### 4f. Cost

Hybrid mode makes one OpenAI embedding call per search query (~50 ms cold, ~1 ms with HTTP keep-alive, cost ≈ $0.00002 per query at current pricing). The user opted in via `provider="hybrid"` so this is expected; no surprise outbound calls.

### 4g. Tests

`search/dual-search.test.ts`:

- (a) both vectors present → merged by distance ascending, `limit` truncates.
- (b) only 384 → returns identical results to a direct `vectorSearchChunks` 384 call.
- (c) only 1536 → KNN over `vec_items_1536`.
- (d) mixed-scale merge: forge known distances on both tables, verify global sort.
- (e) filters (`service`, `itemType`, `since`) propagate to both inner calls.
- (f) missing model id for a present vector → that side is skipped (no throw).

`search/vec-store.test.ts` extension:

- A 1536-dim query embedding queries `vec_items_1536`.
- A non-{384,1536} dim throws.

## Section 5 — `nimbus index reembed` CLI + IPC

### 5a. CLI surface

New file `packages/cli/src/commands/index-cmd.ts` (named `-cmd` because `commands/index.ts` is the command-registry barrel):

```
nimbus index reembed --model <id>
                     [--item-type <key>]   # "service:type" exact, or just "type"
                     [--service <name>]    # alternative filter
                     [--limit <N>]
                     [--batch-size <N>]    # default 100
                     [--dry-run]
                     [--yes]               # required for non-dry runs
                     [--json]
```

| Flag | Semantics |
|---|---|
| `--model` *(required)* | Accepted v1 values: `openai:text-embedding-3-small` (1536-dim) or `Xenova/all-MiniLM-L6-v2` (384-dim). Future models are added inside the Gateway, not the CLI parser. |
| `--item-type` | `slack:message` → exact `(service, type)` pair. `message` → type-only filter across services. Discriminator is the presence of a colon. |
| `--service` | Alternative scope filter; e.g. `--service slack` reembeds every Slack item regardless of type. |
| `--limit` | Maximum total items processed (after `--item-type` / `--service` filter). |
| `--batch-size` | Default 100. Server-side clamp `1 ≤ batchSize ≤ 256` (OpenAI's documented per-request input limit on `text-embedding-3-small`). Values outside the range are silently coerced; the resolved value is echoed in the run summary. |
| `--dry-run` | No HTTP calls, no DB writes. Reports the count that *would* be processed. Exit 0. |
| `--yes` | Required for non-dry runs (mirrors `nimbus db repair` safety). Without it, prints the planned action and exits 0. |
| `--json` | Emits a single final-summary JSON object instead of progress lines. |

**Colon discriminator safety.** Verified at spec time: no service id (`github`, `slack`, …) and no item `type` value (`message`, `git_commit`, `obsidian_note`, …) currently contains a colon, so a colon in `--item-type` unambiguously separates the two halves. Future service-name conventions (e.g. an `aws:lambda`-style service id) would need a different escape — flagged here so the assumption isn't silent.

**Pre-flight checks** (CLI-side):

1. Gateway running — uses `withGatewayIpc`, propagates the standard "Gateway not running" error.
2. Target model resolves — checked by the Gateway, surfaced as a typed error.

### 5b. IPC contract

New module `packages/gateway/src/ipc/index-reembed-rpc.ts`:

| Method | Type | Direction | Params / Payload |
|---|---|---|---|
| `index.reembed` | request | client → gateway | `{ model, itemType?, service?, limit?, batchSize?, dryRun }` → `{ jobId }` |
| `index.reembedCancel` | request | client → gateway | `{ jobId }` → `{ cancelled: boolean }` |
| `index.reembedProgress` | notification | gateway → client | `{ jobId, done, total, skipped }` |
| `index.reembedDone` | notification | gateway → client | `{ jobId, succeeded, skipped, durationMs }` |
| `index.reembedError` | notification | gateway → client | `{ jobId, code, message }` (fatal abort) |

**Posture** (all locked here, no exception):

- **NOT** in Tauri `ALLOWED_METHODS` (CLI-only for v1, mirroring `db.*`). Any future UI demand requires a separate Tauri-allowlist PR per `nimbus-tauri-allowlist`.
- **NOT** LAN-callable. `checkLanMethodAllowed` in `ipc/lan-rpc.ts` is **default-allow with a blocklist** (the `index` namespace is intentionally LAN-allowed for the read paths `index.search` / `index.query` / `index.getItem`). So this PR adds **two explicit full-method-name entries** to `FORBIDDEN_OVER_LAN`: `"index.reembed"` and `"index.reembedCancel"`. This mirrors the existing `"connector.addMcp"` line in that list. The read-path `index.*` methods stay LAN-callable; only the reembed writes are blocked.

**CLI subscription ordering.** Notification listeners for `index.reembedProgress` / `index.reembedDone` / `index.reembedError` must be attached **before** the CLI issues the `index.reembed` request. Otherwise an early progress notification can race ahead of the first listener registration and be dropped. The CLI matches the existing `llm.pullModel` pattern: register listeners → call → loop on listener events until `done` or `error` resolves the wait.

### 5c. Job runner inside the Gateway

```typescript
async function runReembedJob(deps, params): Promise<void> {
  // 1. Resolve embedder by `params.model`:
  //      "openai:text-embedding-3-small" → tryCreateOpenAIEmbedder({ dimensions: 1536 })
  //      "Xenova/all-MiniLM-L6-v2"       → createLocalEmbedder(cacheDir)
  //    Unknown model → fatal: notify index.reembedError + throw.
  //
  // 2. Vault key check for openai:* models. Missing → fatal.
  //
  // 3. Candidate query:
  //      SELECT id, service, type, title, body_preview FROM item i
  //      WHERE NOT EXISTS (
  //        SELECT 1 FROM embedding_chunk c
  //        WHERE c.item_id = i.id AND c.model = ?
  //      )
  //      [AND i.service = ?] [AND (i.type = ? OR (i.service || ':' || i.type) = ?)]
  //      ORDER BY i.modified_at DESC
  //      [LIMIT ?]
  //    Idempotent: re-running with the same args only sees items still
  //    missing the target model.
  //
  // 4. Loop batches of clamp(params.batchSize ?? 100, 1, 256):
  //      a. embedder.embed(texts)
  //      b. On 429 / 5xx → wait Retry-After header (or 2 s) → 1 retry.
  //         On retry-fail → skip batch, log, increment `skipped`.
  //         On 401 / 403 / billing-style → fatal: notify reembedError + throw.
  //         On network-unreachable → fatal: notify reembedError + throw.
  //      c. Transactional write: replace chunks for the affected items
  //         (delete by item_id + model, insert new chunks).
  //      d. Notify reembedProgress after each batch.
  //      e. Check the cancellation token between batches; if set, commit the
  //         current batch then exit the loop (idempotent re-run picks up the rest).
  //
  // 5. Final notify reembedDone with `{ succeeded, skipped, durationMs }`.
}
```

The job runs in-process inside the Gateway's main event loop. Embedding is I/O-bound (HTTP to OpenAI), so a worker buys little. Concurrent normal auto-backfill writes are safe — each pipeline writes inside `db.transaction(...)`, and the `embedding_chunk.model` filter prevents double-work.

### 5d. Exit codes

- `0` — job completed (any number of successes / skipped). The summary line reports how many were skipped; the operator re-runs to retry. Includes the `dryRun` and `--yes`-missing paths.
- `1` — fatal abort (vault key missing, unknown model, auth/billing 401 / 403, target table absent because V30 ran in fallback mode, Gateway not running, network unreachable mid-run).

Matches the parent sequencing spec's recommendation; richer exit codes deferred to a future PR if scripted use demands them.

### 5e. Help + registration

- `packages/cli/src/commands/index.ts` (the barrel): add `export { runIndexCmd } from "./index-cmd.ts";`.
- `packages/cli/src/index.ts`: `COMMAND_HANDLERS` gains `index: runIndexCmd`.
- `commands/help.ts`: add the `nimbus index` row.
- `docs/cli-reference.md`: new `nimbus index reembed` subsection with examples + exit codes.

### 5f. Tests

| File | Coverage |
|---|---|
| `packages/gateway/test/unit/ipc/index-reembed-rpc.test.ts` | `index.reembed` returns `{ jobId }`. Emits progress + done. Cancellation commits current batch and stops. Fatal (auth) emits `reembedError`. `dryRun:true` skips writes. |
| `packages/gateway/test/integration/embedding/reembed-end-to-end.test.ts` | Real SQLite + fresh temp dir + stubbed OpenAI embedder (200 → fake 1536-dim vector). Seed 10 prose-heavy + 10 non-prose items. Run `index.reembed model=openai:text-embedding-3-small itemType=slack:message`. Verify only Slack messages have chunks in `vec_items_1536`. Re-run is a no-op (zero new work). |
| `packages/cli/test/unit/commands/index-cmd.test.ts` | Argument parsing; `--yes` required for non-dry; `--dry-run` exits 0 with planned-count; `--json` summary shape; help text. |

## Section 6 — Coverage gates + invariants + docs

### 6a. Coverage gates

- `bun run test:coverage:embedding` ≥ 80 % — covered: `routing.ts`, `routing-pipeline.ts`, dim-aware `pipeline.ts`, dim-aware `vec-store.ts`, `dual-search.ts`, `index-reembed-rpc.ts`.
- `bun run test:ci` parity — all 18 gates green.
- No new coverage gate added.

### 6b. Security invariants

- **I7 (Tauri allowlist):** not touched — `index.reembed*` is not in `ALLOWED_METHODS`. No count assertion change in `gateway_bridge.rs`.
- **I5 (LAN method allow-list):** **wiring change.** `checkLanMethodAllowed` in `ipc/lan-rpc.ts` is default-allow with a blocklist; the `index` namespace is intentionally LAN-allowed for read paths (`index.search` / `index.query` / `index.getItem`). This PR adds **two explicit full-method-name entries** to `FORBIDDEN_OVER_LAN`: `"index.reembed"` and `"index.reembedCancel"` — mirroring the existing `"connector.addMcp"` precedent on `lan-rpc.ts:17`. The existing I5 enforcement test in `security-invariants.test.ts` already asserts `FORBIDDEN_OVER_LAN`'s membership; one new assertion line covers the two new entries. `SECURITY-INVARIANTS.md` §I5 anti-pattern column is extended to include "exposing `index.*` write methods over LAN without a full-method-name entry" so a future contributor doesn't reintroduce the gap.
- **I9 (bound parameters):** not touched — `vec_items_<dims>` strings are built from a numeric `dims` value validated against `SUPPORTED_EMBEDDING_DIMS` (enum-equivalent), never from caller-supplied data. `SECURITY-INVARIANTS.md` does not change.
- **No new invariant added.** The PR strengthens correctness through dim-aware triggers but introduces no new structural defense that would meet the I-numbered "production wiring + docs entry + enforcement test" triple-rule bar.

### 6c. Docs updates (same PR)

| File | Update |
|---|---|
| `docs/architecture.md` | "Local Database Schema": add `vec_items_1536` row; note dim-aware delete triggers. "Embedding" section: hybrid mode + routing module description. |
| `docs/cli-reference.md` | New `nimbus index reembed` subsection: examples, exit codes, vault-key prerequisites, batch-size clamp range. |
| `docs/SECURITY-INVARIANTS.md` | §I5 anti-pattern column extended to flag the `index.*` write-method blocklist requirement. |
| `docs/roadmap.md` | Flip the T6 PR 3 checkbox; extend the `Last updated:` header with `T6 PR3 ✅ (2026-05-15)`. |
| `.claude/commands/nimbus-file-map.md` | Add rows: `embedding/routing.ts`, `embedding/routing-pipeline.ts`, `search/dual-search.ts`, `index/vec-items-1536-v30-sql.ts`, `cli/commands/index-cmd.ts`, `ipc/index-reembed-rpc.ts`. |
| `.claude/commands/nimbus-ipc.md` | Extend the `index.*` section with the four new method names (request + cancel + 3 notifications). |
| `.claude/commands/nimbus-commands.md` | New row under Phase 5 T6 with the reembed command surface and exit codes. |

## Section 7 — Out of scope (locked here)

The parent sequencing spec already excluded several items; this PR3 spec confirms them and pins the open ones the parent deferred:

- **Auto-reembed on connector resync** — manual via CLI only. Existing items keep whatever embeddings they had; only newly-synced items pick up the new routing.
- **Other model providers** beyond OpenAI — `openai:text-embedding-3-small` is the only 1536-dim path for v1. Cohere / Voyage AI / etc. are future PRs.
- **Per-extension routing declarations** — Marketplace v2 in T2 revisits.
- **Tauri UI surface** — no `ALLOWED_METHODS` edits; CLI-only.
- **LAN exposure** — `index.reembed*` stays IPC-only via `I5`.
- **Per-model distance normalisation** — RRF / min-max merge deferred until empirical recall data justifies it.
- **Orphan cleanup** for 384-dim OpenAI rows after the 384→1536 upgrade — visible via existing `embedding_chunk.model` filtering; manual operator action; not automated in this PR. A future `nimbus db cleanup` subcommand is the natural home (would also subsume the existing `db.snapshots prune` ergonomics).
- **Retention policy** for `vec_items_*` — out of scope; existing item lifecycle (delete from `item` → CASCADE to `embedding_chunk` → dim-aware trigger to `vec_items_*`) is the only cleanup path.
- **PROSE_HEAVY_TYPES TOML / extension surface** — entries change via source code only in this PR.

## Section 8 — Per-PR cadence (continuation of T6 §4)

1. ✅ Worktree at `.worktrees/phase-5-t6-pr3-vec-items-1536/` on branch `dev/asafgolombek/phase-5-t6-pr3-vec-items-1536` (created 2026-05-15).
2. ✅ Brainstorming + design (this document).
3. ⏭ Implementation plan via `writing-plans` skill → `docs/superpowers/plans/2026-05-15-phase-5-t6-pr3-vec-items-1536.md`.
4. ⏭ Subagent-driven execution per the plan.
5. ⏭ PR opened against `main`. Reviewed via `gh pr` / `/ultrareview`. Merged after green CI.
6. ⏭ `docs/roadmap.md` updated: T6 PR 3 checkbox flipped; `Last updated:` line extended with `T6 PR3 ✅ (2026-05-15)`.

## See also

- [Parent sequencing spec](./2026-05-14-phase-5-t6-design.md) — locks PR order; this document fills §2 PR 3's deferred decisions.
- [`../../SECURITY-INVARIANTS.md`](../../SECURITY-INVARIANTS.md) — I5 (anti-pattern column extended) / I7 / I9.
- [`../../architecture.md`](../../architecture.md) — Local Database Schema (gets the V30 update in the same PR).
- `nimbus-db-migrations` skill — V30 numbering and runner pattern.
- `nimbus-ipc` skill — new `index.reembed*` methods follow the namespace conventions.
- `nimbus-tauri-allowlist` skill — confirms the no-allowlist-edit posture.

## Section 9 — Review disposition (Gemini CLI, 2026-05-15)

Source: [`2026-05-15-phase-5-t6-pr3-vec-items-1536-review-feedback.md`](./2026-05-15-phase-5-t6-pr3-vec-items-1536-review-feedback.md). Each suggestion is either folded into the spec (**FIX**), confirmed as already-correct (**NO ACTION**), or pushed to a future PR with explicit rationale (**DEFER**).

| Review § | Item | Disposition | Rationale & where in this spec |
|---|---|---|---|
| 1 | V30 trigger safety — `dims` null-check + transaction wrapping | **NO ACTION** | Both pre-conditions are guaranteed elsewhere: `embedding_chunk.dims INTEGER NOT NULL` was declared at V6 (`embedding-v6-sql.ts:16`), so no nulls exist; and every migration in `runner.ts` runs inside `db.transaction(...)` (see `migrateIndexedV5ToV6` at `runner.ts:146` for the pattern), so the V30 drop+recreate+create-table sequence is atomic. The reviewer's "window where deletes don't propagate" doesn't exist. §1 now states both pre-conditions explicitly so a future reader doesn't have to rediscover them. |
| 2 | `RoutingEmbeddingPipeline.backfillAll` should not do a DISTINCT scan | **FIX** | The original §3c sketch referenced a vaguely-defined `allObservedRoutingKeys()` helper. Reviewer's alternative (use the fixed `PROSE_HEAVY_TYPES` set directly with `IN (...)` for the OpenAI side and `NOT IN (...)` for the local side) is both cleaner and the actual intent — no DISTINCT scan needed. §3c rewritten: `backfillAll` now passes `{ in: proseKeys }` / `{ notIn: proseKeys }` scopes to a typed `backfillForRoutingKeys(scope)` method. The two scopes are disjoint by construction (one is the literal complement of the other against a fixed set), so an item is only considered by one inner pipeline. Existing `idx_item_service` / `idx_item_type` indexes plus the existing `NOT EXISTS` sub-select cover the access pattern. |
| 3 | Magic numbers `384` / `1536` in pipeline + migrations | **FIX** | New constants `EMBEDDING_DIM_LOCAL = 384` and `EMBEDDING_DIM_OPENAI = 1536` live in `embedding/routing.ts`, alongside a `SUPPORTED_EMBEDDING_DIMS` set. The constructor gate in `pipeline.ts` (§3b) and the query-dim gate in `vec-store.ts` (§4a) both reference the set — one source of truth. Future-provider additions touch one file (plus the corresponding `vec_items_<dim>` migration). |
| 4 | `--item-type` colon discriminator future-proofing | **NO ACTION** (with note) | Verified at spec time: no current service id and no current item `type` value contains a colon, so the discriminator is unambiguous today. §5a now flags this assumption explicitly — a future service-name convention (e.g. `aws:lambda`-style) would require a different escape. Documented, not solved. |
| 5 | CLI must register `index.reembedProgress` listeners before sending the request | **FIX** | Real implementation gotcha — early notifications could race ahead of listener registration. §5b extended with an explicit "CLI subscription ordering" paragraph naming the `llm.pullModel` precedent (register listeners → call → loop on listener events until `done` or `error`). The implementation plan will lock the exact API call order. |
| 6 | Retry policy should use exponential backoff | **NO ACTION** | The brainstorm explicitly chose "1 retry with backoff" over multi-retry exponential (recorded in the brainstorm dialog; option 2 of the AskUserQuestion was rejected). The 2 s value is only the *fallback* when OpenAI omits `Retry-After` — which is unusual in practice. Single retry bounds latency so a stuck batch doesn't stall the run; the idempotent re-run is the operator's tool for genuinely flaky periods. Adding exponential backoff would expand the test surface (timer-mocked retry-state) without changing the steady-state behaviour. |
| 7 | I5 — explicit blocklist entry for `index.reembed*` | **FIX (real defect)** | `checkLanMethodAllowed` in `ipc/lan-rpc.ts:44–55` is default-allow with a `FORBIDDEN_OVER_LAN` blocklist. The `index` namespace is intentionally LAN-allowed for read paths (`index.search` / `index.query` / `index.getItem`), so a plain "not in blocklist" stance would have left `index.reembed` reachable over LAN. §6b rewritten to specify the wiring: add `"index.reembed"` and `"index.reembedCancel"` as full-method-name entries to `FORBIDDEN_OVER_LAN` (mirroring the `"connector.addMcp"` precedent on `lan-rpc.ts:17`); extend the I5 enforcement test in `security-invariants.test.ts` to assert their membership; extend `SECURITY-INVARIANTS.md` §I5 anti-pattern column to flag the `index.*` write-method gap. Caught a genuine hole. |
| Q1 | Orphan cleanup — future `nimbus db cleanup`? | **DEFER (already documented; wording tightened)** | §7 already listed orphan cleanup as Out of Scope. Wording now names `nimbus db cleanup` as the natural home (would also subsume the existing `db.snapshots prune` ergonomics). No new PR scope. |
| Q2 | Hybrid search distance-merge balance / weight multiplier | **NO ACTION** | §4e already documents the L2-merge approximation and flags RRF / min-max as a follow-up when empirical recall data warrants it. Reviewer confirmed deferring is fine. |
| Q3 | `--batch-size` upper bound | **FIX** | OpenAI's `text-embedding-3-small` accepts up to 256 inputs per request. §5a clamps `--batch-size` to `1 ≤ N ≤ 256` server-side; values outside the range are silently coerced and the resolved value is echoed in the run summary. §5c's batch loop reads `clamp(params.batchSize ?? 100, 1, 256)`. |

**Net effect on this spec:** four targeted FIX edits (§3c rewrite, §3b + §4a + §2 constants, §5a colon note + batch-size clamp, §5b subscription-ordering paragraph, §6b I5 wiring rewrite, §6c docs row), one wording tighten in §7, and this §9 disposition table. Nothing about file structure, schema columns, or commit topology changes. PR scope unchanged.
