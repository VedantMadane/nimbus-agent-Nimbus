# Phase 5 T6 PR 2 — `tool_call_log` Audit Table (V29) Design

> **Status:** Draft for review.
> **Predecessors:**
> - [`2026-05-14-phase-5-t6-design.md`](./2026-05-14-phase-5-t6-design.md) — parent T6 sequencing spec. §2 PR 2 sketches the touchpoints; this per-PR spec locks them.
> - [`../../SECURITY-INVARIANTS.md`](../../SECURITY-INVARIANTS.md) §I11 — the `<tool_output>` envelope this PR records.
> - [`2026-05-14-phase-5-t6-pr1-i10-helpers-design.md`](./2026-05-14-phase-5-t6-pr1-i10-helpers-design.md) and [`../plans/2026-05-14-phase-5-t6-pr1-i10-helpers.md`](../plans/2026-05-14-phase-5-t6-pr1-i10-helpers.md) — cadence reference (TDD red/green flow, commit topology, exit criteria shape).

## 1. Goal

Structurally record every LLM-facing MCP-tool call's `<tool_output>` envelope so I11's defense is auditable post-hoc. Complement to I11 (the envelope), not a replacement.

The change adds:

- A new SQLite table `tool_call_log` (V29) — one row per LLM-facing tool invocation.
- A canonical write helper `writeToolCallLog(db, entry)` and read helper `readToolCallLog(db, filter)` in `packages/gateway/src/db/tool-call-log.ts`.
- Audit-write at both `wrapToolOutput` wiring sites (`engine/agent.ts:wrapToolForLlm` and `connectors/lazy-mesh/mesh.ts:listTools`) — wrapped in try/catch so a tool throw is logged with `status='error'` and re-thrown.
- A new IPC method `audit.toolCalls` exposed via a new `ipc/audit-rpc.ts` for forensic querying. **IPC-only** — not LAN-callable, not in the Tauri renderer allowlist.
- Three new assertions in the existing I11 enforcement block in `security-invariants.test.ts` — pinning both wiring sites to call `writeToolCallLog` alongside `wrapToolOutput`, and pinning the helper module's exports.

## 2. Non-goals

- **No CLI command.** `nimbus audit tool-calls` is deferred until a real consumer exists. The `audit.toolCalls` IPC method is sufficient for this PR.
- **No Tauri allowlist edits.** `audit.toolCalls` is **not** added to `ALLOWED_METHODS` in `packages/ui/src-tauri/src/gateway_bridge.rs`. Forbidden-namespace defense-in-depth — see [`nimbus-tauri-allowlist`](../../../.claude/commands/nimbus-tauri-allowlist.md).
- **No LAN exposure.** `audit` stays in `FORBIDDEN_OVER_LAN` (invariant `I5`). The brainstorm caught a contradiction in the parent T6 spec sketch ("LAN-callable") — `tool_call_log` rows hold the exact bytes the LLM saw, which is the same exfiltration shape that put `data.*` and `audit.*` on the FORBIDDEN list. The namespace stays; the LAN posture is the right one.
- **No new I-numbered invariant.** This PR strengthens the existing `I11` assertion (envelope wrap → envelope wrap **and** `tool_call_log` row write). No new row in `SECURITY-INVARIANTS.md`.
- **No planner-side dispatch logging.** The planner (`ConnectorDispatcher → ToolExecutor`) already writes HITL-gated calls to `audit_log` via `audit-chain.ts`. The two paths are disjoint by design; this PR captures only the LLM-facing surface gap that I11 exists for.
- **No `audit_log` cross-link FK.** The parent spec sketch had `audit_log_id INTEGER REFERENCES audit_log(id)`. Dropped — LLM-facing calls don't write `audit_log`, so the column would always be NULL. YAGNI; add later if a real cross-link consumer emerges.
- **No retention policy.** Table grows unbounded by design in this PR; a configurable retention window (e.g. `[audit].tool_call_log_retention_days`, default 90) plus the scheduled prune lands in a follow-up "System Maintenance" PR. Tracked via the new roadmap follow-up bullet (§9.2). Audit-table growth is real for high-traffic agents but the audit semantics need to land before the maintenance policy is designed against them.
- **No `dbRun` / `dbExec` migration of existing call sites.** That's T6 PR 4. The new `writeToolCallLog` and `readToolCallLog` helpers route through `dbRun` (forward-correct) but no other callers are migrated here.

## 3. Architecture

```
LLM invokes a tool via the Mastra agent or the lazy-mesh tool map
       │
       ▼
┌────────────────────────────────────────────────────────────────────────┐
│  agent.ts:wrapToolForLlm   OR   mesh.ts:listTools                      │
│  (both wrappers follow the same shape)                                 │
│                                                                        │
│   const sessionId  = getAgentRequestSessionId() ?? null;               │
│   const calledAt   = Date.now();                                       │
│   let raw, status = 'ok', envelope;                                    │
│   try {                                                                │
│     raw = await original(input, ctx);                                  │
│     envelope = wrapToolOutput({ service, tool }, raw);                 │
│   } catch (err) {                                                      │
│     status   = 'error';                                                │
│     envelope = wrapToolOutput({ service, tool }, { error: String(err) });│
│     if (auditDb !== undefined) {                                       │
│       writeToolCallLog(auditDb, {                                      │
│         sessionId, toolId: tool, service,                              │
│         calledAt, durationMs: Date.now() - calledAt,                   │
│         resultEnvelope: envelope, status,                              │
│       });                                                              │
│     }                                                                  │
│     throw err;     // re-throw so existing error handling is unchanged │
│   }                                                                    │
│   const durationMs = Date.now() - calledAt;                            │
│   if (auditDb !== undefined) writeToolCallLog(auditDb, { ... });       │
│   return envelope; // unchanged — same string shape as before          │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
                    ┌────────────────────────────────────┐
                    │  packages/gateway/src/db/          │
                    │    tool-call-log.ts                │
                    │                                    │
                    │  writeToolCallLog(db, entry):      │
                    │    truncate envelope at 64 KiB;    │
                    │    dbRun(db, INSERT INTO ...);     │
                    │                                    │
                    │  readToolCallLog(db, filter):      │
                    │    parameterised SELECT;           │
                    │    pagination by called_at;        │
                    └────────────────┬───────────────────┘
                                     ▼
                       tool_call_log (V29 SQLite table)
                                     ▲
                                     │
                       ipc/audit-rpc.ts
                       dispatchAuditRpc('audit.toolCalls', params, ctx)
                       └─→ readToolCallLog(db, filter)
                       └─→ { toolCalls, hasMore, nextSince }
```

**Three load-bearing properties of this shape.**

1. **The audit write does not change `return envelope`.** The wrappers' return string is byte-identical to today. No LLM-facing behaviour changes.
2. **Errors are logged then re-thrown.** Tools that throw still surface their error to the caller exactly as today; the only added effect is one row in `tool_call_log` with `status='error'`. The error envelope (`{ error: String(err) }`) is persisted but never returned to the LLM (the throw short-circuits the wrapper before the return).
3. **`auditDb` is optional.** When unset (unit tests, future call paths that build the agent without a gateway DB), the wrappers degrade to today's behaviour silently. The I11 enforcement test ensures the audit-write *call site* is present in the source — it does not mandate that production wires `auditDb` (`platform/assemble.ts` does that).

### Why the helper file (`db/tool-call-log.ts`) is its own module

Mirrors the `db/audit-chain.ts` shape — one file per logical table. The two-helper pair (`writeToolCallLog` + `readToolCallLog`) is consumed by exactly three files (`agent.ts`, `mesh.ts`, `audit-rpc.ts`). Keeping the truncation rule, column order, and parameter binding inside one helper means the I11 enforcement test only needs to grep the import line at each wiring site, not match the SQL shape.

## 4. File-level changes

### 4.1 Files created

| Path | Purpose |
|---|---|
| `packages/gateway/src/index/tool-call-log-v29-sql.ts` | Exports `TOOL_CALL_LOG_V29_SCHEMA_SQL` constant — `CREATE TABLE` + 3 indexes. |
| `packages/gateway/src/db/tool-call-log.ts` | `writeToolCallLog`, `readToolCallLog`, `ToolCallLogEntry`, `ToolCallLogFilter`, `ToolCallLogReadResult`, `MAX_ENVELOPE_BYTES = 65_536`, private `truncateEnvelope`. `writeToolCallLog` wraps its `dbRun` in an internal try/catch — a thrown `DiskFullError` or constraint violation is logged at WARN via the supplied `logger?: Logger` option and discarded. The wrapper degrades gracefully so the LLM-facing path is never broken by an audit-write failure (forensic completeness is best-effort; functional correctness is mandatory — see §7.1). |
| `packages/gateway/src/db/tool-call-log.test.ts` | Unit tests: write+read round-trip, truncation marker, NULL-session round-trip, filter combinations, pagination across `hasMore`, status='error' write path. |
| `packages/gateway/src/ipc/audit-rpc.ts` | `dispatchAuditRpc(method, params, ctx) → { kind: 'miss' } | { kind: 'hit'; value: ToolCallLogReadResult }`. Mirrors `dispatchMetricsRpc` shape. |
| `packages/gateway/src/ipc/audit-rpc.test.ts` | Param validation (-32602 cases), default+max limit clamping, `nextSince` math, array-payload rejection, sentinel-empty-string filter for NULL session_id. |

### 4.2 Files modified

| Path | Change |
|---|---|
| `packages/gateway/src/index/migrations/runner.ts` | Add `migrateIndexedV28ToV29` step + entry in `INDEXED_SCHEMA_STEPS` + new entry in `BACKFILL_LABELS` ("tool_call_log audit table (T6 PR 2) (backfilled)"). Import the new SQL constant. |
| `packages/gateway/src/engine/agent.ts` | Extend `NimbusEngineAgentDeps` with optional `auditDb?: Database`. `wrapToolForLlm` gains a `db?: Database` param closed over by `createNimbusEngineAgent`. The wrapper body becomes the try/catch + `writeToolCallLog` shape from §3. Import `getAgentRequestSessionId` is already present (line 12). |
| `packages/gateway/src/connectors/lazy-mesh/mesh.ts` | Add `auditDb?: Database` to constructor options + `LazyConnectorMesh.auditDb` private field + `createLazyConnectorMesh` factory options. `listTools`'s wrapped execute gets the same try/catch + `writeToolCallLog` shape. Import `getAgentRequestSessionId` and `writeToolCallLog`. |
| `packages/gateway/src/platform/assemble.ts` | Wire `localIndex.db` to both `createNimbusEngineAgent({ ..., auditDb: localIndex.db })` and `createLazyConnectorMesh(paths, vault, { ..., auditDb: localIndex.db })`. Same handle for both. |
| `packages/gateway/src/ipc/server/dispatchers.ts` | Register `audit.toolCalls` → `dispatchAuditRpc({ db, nowMs? })` alongside the existing `dispatchMetricsRpc` / `dispatchPreflightRpc` / `dispatchDeploymentRpc` block (lines 190 / 215 / 238). Use the same try/catch error-translation shape: `AuditRpcError → JSON-RPC error envelope`. **Not** added to `ALLOWED_METHODS` in `gateway_bridge.rs`. **Not** added to `http-server.ts` read-only routes (`audit.*` posture matches `vault.*` — exfiltration-class data, IPC-socket only). **Not** removed from `FORBIDDEN_OVER_LAN` — `audit` namespace stays forbidden by `I5`. |
| `packages/gateway/src/security-invariants.test.ts` | Inside the existing `describe("I11 — Tool-result envelope on the LLM-facing path")` block (lines 168–185): (a) extend the `agent.ts` test (currently `expect(src).toMatch(/wrapToolOutput\(/)`) to also `expect(src).toMatch(/writeToolCallLog\(/)`; (b) add a NEW test for `mesh.ts:listTools` asserting both `wrapToolOutput` and `writeToolCallLog`; (c) add a NEW test asserting `db/tool-call-log.ts` exports both `writeToolCallLog` and `readToolCallLog`. |
| `docs/SECURITY-INVARIANTS.md` | I11 row's "Wired at" column extended to mention `db/tool-call-log.ts` write side; rationale paragraph updated to note the audit complement. **No new I-number row.** |
| `docs/architecture.md` | Add `tool_call_log` to the "Local Database Schema" reference table (column list + index list, V29 marker). |
| `.claude/commands/nimbus-file-map.md` | New rows under "Local Index + Migrations + DB" for `db/tool-call-log.ts`; new row under "IPC" for `ipc/audit-rpc.ts`; new row under "Local Index + Migrations + DB" for `index/tool-call-log-v29-sql.ts`. |
| `docs/roadmap.md` | Flip the T6 PR 2 sub-checkbox to `[x]` with the dated note. Extend the `Last updated:` line at `roadmap.md:7` with `T6 PR2 ✅ (2026-05-15)`. Append the new System Maintenance follow-up bullet under T6 (see §9.2). |

### 4.3 Files NOT modified

- `packages/gateway/src/engine/tool-output-envelope.ts` — `wrapToolOutput` is unchanged. The audit write happens around it, not inside it.
- `packages/gateway/src/db/audit-chain.ts` — `audit_log` and its BLAKE3 chain are unchanged. The two paths stay disjoint.
- `packages/ui/src-tauri/src/gateway_bridge.rs` — `ALLOWED_METHODS` count unchanged; no renderer-callable surface added.
- `packages/gateway/src/ipc/lan-rpc.ts` — `FORBIDDEN_OVER_LAN` unchanged; `audit` stays forbidden (`I5` enforcement intact).

## 5. Schema (V29)

```sql
CREATE TABLE IF NOT EXISTS tool_call_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id      TEXT,                                                 -- nullable
  tool_id         TEXT NOT NULL,
  service         TEXT NOT NULL,
  called_at       INTEGER NOT NULL,                                     -- unix ms
  duration_ms     INTEGER NOT NULL,
  result_envelope TEXT NOT NULL,                                        -- full <tool_output>...</tool_output>, capped at 64 KiB
  status          TEXT NOT NULL CHECK(status IN ('ok','error'))
);

CREATE INDEX IF NOT EXISTS idx_tool_call_log_session   ON tool_call_log(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_call_log_tool_time ON tool_call_log(tool_id, called_at);
CREATE INDEX IF NOT EXISTS idx_tool_call_log_called_at ON tool_call_log(called_at);
```

### 5.1 Diffs from the parent T6 spec sketch

| Field | Sketch | Locked | Why |
|---|---|---|---|
| `session_id` | `TEXT NOT NULL` | `TEXT` (nullable) | `getAgentRequestSessionId()` legitimately returns `undefined` for some paths (unit tests, maintenance scripts, future call paths that bypass `agentRequestContext.run`). Honest about the data shape. SQLite indexes NULL too — `WHERE session_id = ?` and `WHERE session_id IS NULL` both work. |
| `duration_ms` | nullable | `INTEGER NOT NULL` | We always have a duration since we wrap the await. No legitimate NULL case. |
| `audit_log_id` | `INTEGER REFERENCES audit_log(id)` | **dropped** | LLM-facing path doesn't write `audit_log`; the column would always be NULL. YAGNI. |

### 5.2 Per-row size cap (64 KiB)

`writeToolCallLog` truncates `resultEnvelope` if its UTF-8 byte length exceeds `MAX_ENVELOPE_BYTES = 65_536`:

```typescript
function truncateEnvelope(envelope: string): string {
  const total = Buffer.byteLength(envelope, "utf8");
  if (total <= MAX_ENVELOPE_BYTES) return envelope;
  const head = Buffer.from(envelope, "utf8").slice(0, 65_504).toString("utf8");
  return `${head}...[truncated, ${total} bytes total]`;
}
```

The `65_504` head-cap leaves room for the suffix marker so the final string is always ≤ 65 536 bytes. The truncation marker is grep-able (`...[truncated,`) for forensic queries that want to find which calls hit the cap.

Why 64 KiB: empirically large enough to hold a realistic GitHub PR list (50 PRs with descriptions ≈ 30–40 KiB) or a full Slack channel scan, small enough to bound cumulative growth. Per-row cap composes with the deferred retention-by-age policy — neither alone is sufficient for high-traffic agents.

### 5.3 Indexing rationale

| Index | Query pattern it serves |
|---|---|
| `idx_tool_call_log_session` | "All tool calls in session X" — primary forensic flow. |
| `idx_tool_call_log_tool_time` | "Recent calls to tool Y" — covers `WHERE tool_id = ? ORDER BY called_at DESC` without a temp B-tree. |
| `idx_tool_call_log_called_at` | Pagination cursor (`WHERE called_at > ? ORDER BY called_at ASC LIMIT ?`). |

No FTS5 / `vec0` virtual tables — `result_envelope` is opaque audit data, not a search target. If a future need arises (e.g. "find calls whose envelope mentions secret X"), an FTS5 shadow can be added in a separate migration without touching this table.

### 5.4 Migration runner step

Append to `packages/gateway/src/index/migrations/runner.ts`:

```typescript
function migrateIndexedV28ToV29(db: Database, now: number): void {
  db.transaction(() => {
    db.exec(TOOL_CALL_LOG_V29_SCHEMA_SQL);
    db.exec("PRAGMA user_version = 29");
    recordMigration(db, 29, "tool_call_log audit table (T6 PR 2)", now);
  })();
}
```

And the corresponding entries in `INDEXED_SCHEMA_STEPS` and `BACKFILL_LABELS`. Pre-migration backup is automatic via the existing `writePreMigrationBackup` path. No backfill of existing rows — the table is empty on first migration; new entries land as tools are invoked.

## 6. IPC contract — `audit.toolCalls`

### 6.1 Request

```typescript
type AuditToolCallsParams = {
  /** Inclusive lower bound on called_at (unix ms). Default: no lower bound. */
  since?: number;
  /** Inclusive upper bound on called_at (unix ms). Default: no upper bound. */
  until?: number;
  /** 1..1000, default 100. */
  limit?: number;
  /** Exact-match filter on session_id. Use empty string '' to find rows with NULL session_id. */
  sessionId?: string;
  /** Exact-match filter on tool_id. */
  toolId?: string;
  /** Exact-match filter on status. */
  status?: "ok" | "error";
};
```

### 6.2 Response

```typescript
type AuditToolCallsResult = {
  toolCalls: ToolCallLogEntry[];
  hasMore: boolean;
  /**
   * When `hasMore`, the smallest `called_at` strictly greater than the last
   * returned row's `called_at` — pass back as `since` to fetch the next page.
   * Null when `!hasMore`.
   */
  nextSince: number | null;
};

type ToolCallLogEntry = {
  id: number;
  sessionId: string | null;
  toolId: string;
  service: string;
  calledAt: number;
  durationMs: number;
  resultEnvelope: string;
  status: "ok" | "error";
};
```

Ordering: `ORDER BY called_at ASC, id ASC` — stable across same-millisecond rows.

### 6.3 Error envelope

| Code | Trigger |
|---|---|
| `-32602` | `params` is null/array/non-object; `limit < 1`, `limit > 1000`, non-integer `limit`; `since`/`until` non-integer; `until < since`; `status` not in `{ 'ok', 'error' }`; `sessionId`/`toolId` non-string. |

Mirrors `metrics-rpc.ts`'s shape (`MetricsRpcError(rpcCode, message)` → JSON-RPC error). The dispatcher pattern at `metrics-rpc.ts:86-101` is the canonical reference for `audit-rpc.ts`.

### 6.4 Posture matrix

| Surface | Reachable? | Why |
|---|---|---|
| Local IPC socket (CLI, gateway-internal callers) | **Yes** | Default — primary forensic consumer. |
| LAN (`LanServer` / paired peers) | **No** | `audit` ∈ `FORBIDDEN_OVER_LAN`. Invariant `I5` enforces. |
| Tauri renderer (`gateway_bridge.rs` `ALLOWED_METHODS`) | **No** | Forbidden-namespace defense-in-depth. Invariant `I7` posture. |

## 7. Edge cases

| # | Edge case | Behaviour |
|---|---|---|
| 1 | Tool throws synchronously inside `await original(...)` | `try/catch` runs; `status='error'` row written; error envelope persisted but **not returned to caller** (the `throw err` short-circuits the wrapper); existing error handling unchanged. |
| 2 | Tool throws after a partial result | Same as #1 — `raw` is undefined, the catch block synthesises the error envelope. |
| 3 | Tool returns `undefined` | `wrapToolOutput({...}, undefined)` already serialises to `<tool_output ...>null</tool_output>` (line 30 — `result ?? null`). Row written with `status='ok'`. |
| 4 | `getAgentRequestSessionId()` returns undefined (no active `agentRequestContext.run`) | `sessionId = null` is written. Row is queryable via `WHERE session_id IS NULL` or via the `sessionId: ''` empty-string sentinel in the IPC filter. |
| 5 | `auditDb === undefined` (test fixture, partial wiring) | The `if (auditDb !== undefined)` guard skips the write. Wrapper still wraps the envelope and returns it normally — degrades to today's behaviour. The I11 source-grep test still passes because the `writeToolCallLog(` token is in the source even if the runtime guard short-circuits. |
| 6 | `result_envelope` exceeds 64 KiB | `truncateEnvelope` slices to 65 504 bytes UTF-8 + appends `...[truncated, N bytes total]`. The truncated string is what's stored; the original is what flows back to the LLM. (Audit visibility differs from LLM visibility — by design, since the audit table is for forensics not replay.) |
| 7 | Concurrent tool invocations within the same session | Each invocation writes its own row independently. SQLite's `AUTOINCREMENT` ensures `id` ordering; `called_at` may collide at millisecond resolution but `(called_at, id)` ordering is stable. |
| 8 | Migration runs on a database where `audit_log` doesn't yet have row_hash (V18-or-earlier) | Migration runner steps strictly: V28 must be applied before V29. The runner's existing `INDEXED_SCHEMA_STEPS` ordering enforces this. No interaction between V29 and any earlier migration. |
| 9 | IPC caller passes `sessionId: ""` | Treated as the explicit "find NULL session rows" filter — translated to `WHERE session_id IS NULL` in `readToolCallLog`. |
| 10 | IPC caller passes `since: 0` (UNIX epoch) | Valid lower bound; matches all rows. The `0` is a number; passes type validation. |
| 11 | IPC caller passes `until` without `since` | Valid; `WHERE called_at <= ?` only. |
| 12 | Pagination: `limit` returned, `hasMore: true`, `nextSince: T` — caller paginates forward | Next call passes `since: T`; row at `called_at = T` is included by the `>=` semantics, but `id` ordering ensures no duplicate row is returned (the dispatcher's pagination logic uses `(called_at, id)` cursor pairs internally even though only `called_at` is exposed). See §10.2 for the worked example. |

### 7.1 Failure-mode invariants we commit to

1. **Audit-write failure must not break the LLM-facing path.** The `writeToolCallLog` call is wrapped in its own internal try/catch inside the helper — a `DiskFullError` or constraint violation is logged at WARN and discarded. The wrapper returns the envelope unconditionally. Forensic completeness is best-effort; functional correctness is mandatory.
2. **Errors are always logged before being re-thrown.** Catch block runs the audit write before the `throw err`, so `status='error'` rows always land even when the caller crashes.
3. **`return envelope` is byte-identical to today's behaviour.** Adding the audit write must not change what the LLM receives. The integration test in §8 asserts this directly.

## 8. Test plan

### 8.1 Unit — `db/tool-call-log.test.ts`

Each case uses a fresh in-memory `Database` with the V29 SQL applied.

| Case | Assertions |
|---|---|
| `write+read round-trip` | Insert one entry; `readToolCallLog(db, {})` returns it with all fields intact. |
| `nullable session_id round-trip` | Insert with `sessionId: null`; read back; field is `null`. |
| `truncates envelope at 64 KiB` | Insert with a 100 KiB envelope; stored value ends with `...[truncated, 102400 bytes total]`; total stored bytes ≤ 65 536. |
| `does not truncate at exactly 64 KiB` | Insert with a 65 536-byte envelope; stored value is byte-identical (no truncation marker). |
| `filter by sessionId exact match` | Insert two rows with different sessions; filter returns only the matching one. |
| `filter by sessionId === '' returns NULL session rows` | Insert one NULL-session row + one with `'s-1'`; filter `{ sessionId: '' }` returns only the NULL row. |
| `filter by toolId` | Insert two rows; filter by tool_id returns only the matching one. |
| `filter by status` | Insert one ok + one error; filter `{ status: 'error' }` returns one. |
| `filter by since/until window` | Insert three rows at t=100/200/300; filter `{ since: 150, until: 250 }` returns only t=200. |
| `pagination across hasMore` | Insert 250 rows; `limit: 100` returns first 100, `hasMore: true`, `nextSince` set; second call with `since: nextSince` returns rows 101–200. |
| `pagination is correct across same-millisecond rows` | Insert 5 rows at called_at = 100, 200, 200, 300, 400 (the two at 200 have ids 2 and 3); `limit: 3` returns rows 1–3 with `nextSince: 200`; second call with `since: 200` returns ONLY rows 4 and 5 (no duplicates of ids 2 / 3). Pins the `(called_at, id)` cursor-pair invariant called out in §10.2. |
| `final page has hasMore: false, nextSince: null` | Same fixture; third call exhausts the table. |
| `default limit is 100` | Insert 200 rows; no `limit` param returns 100. |
| `limit clamped to 1000` | Insert 2000 rows; `limit: 5000` is rejected at the IPC layer (covered in audit-rpc.test.ts) — at the helper layer, document that `readToolCallLog` trusts its caller. |
| `ordering: called_at ASC, id ASC` | Insert two rows with same `called_at`; verify deterministic order by id ASC. |
| `same envelope appears once even if written twice` | Insert two rows with identical envelope content; both are returned (no de-duplication — that's not the table's job). |

### 8.2 Unit — `ipc/audit-rpc.test.ts`

| Case | Assertions |
|---|---|
| `dispatches audit.toolCalls method` | `dispatchAuditRpc('audit.toolCalls', {}, ctx)` returns `{ kind: 'hit', value: ... }`. |
| `misses on other methods` | Returns `{ kind: 'miss' }` for `'audit.foo'`, `'metrics.dora'`, `''`. |
| `rejects null params` | -32602. |
| `rejects array params` | -32602 with message mentioning `params`. |
| `rejects non-string sessionId` | -32602. |
| `rejects non-integer limit` | -32602. |
| `rejects limit < 1` and `limit > 1000` | -32602. |
| `rejects status not in {ok, error}` | -32602. |
| `rejects until < since` | -32602. |
| `default limit is 100` | Returns at most 100 entries when limit omitted. |
| `nextSince is the largest called_at when hasMore is true` | Worked example with 5 rows, limit 3; `nextSince === rows[2].called_at`. |
| `nextSince is null when hasMore is false` | Single page exhausts table. |
| `empty result returns hasMore=false, nextSince=null` | Empty table + no filters. |

### 8.3 Integration — `engine/agent-tool-call-log.test.ts` (NEW)

Spin up `createNimbusEngineAgent` with a real `auditDb` pointing at an in-memory DB with V29 applied. Wrap a stub tool returning `{ ok: 1 }`. Inside `agentRequestContext.run({ sessionId: 's-1' })`, invoke the wrapped tool's `execute({ })` directly. Assert:

1. Return value is the byte-identical envelope `wrapToolOutput({...}, { ok: 1 })` would produce — the audit write does not change the LLM-facing string.
2. `readToolCallLog(db, {})` returns one row with `sessionId: 's-1'`, `status: 'ok'`, `service` and `tool_id` populated, `duration_ms >= 0`, `result_envelope` containing the serialised `{ ok: 1 }`.
3. Throw a stub tool error; assert the error propagates AND a row with `status: 'error'` lands with the error envelope.

### 8.4 Integration — `connectors/lazy-mesh/mesh-tool-call-log.test.ts` (NEW)

Same shape as §8.3 but for the mesh wiring. Build a `LazyConnectorMesh` with a stub MCP, `auditDb` set, invoke a tool from `listTools()`, assert one row written with the correct `service` and `tool_id` (extracted from the mesh's `key.split("_")[0]` rule).

### 8.5 Migration test — `index/migrations/migration-v29.test.ts` (NEW)

Run the migration runner against a fresh DB. Assert:
1. `PRAGMA user_version` reaches 29.
2. `_schema_migrations` has a row for V29 with the correct description.
3. The three indexes exist (`SELECT name FROM sqlite_master WHERE type = 'index'`).
4. Pre-migration backup is written to the configured `backupDir`.

### 8.6 Security-invariants — extension to existing I11 block

Three new assertions inside the existing `describe("I11 — ...")` in `packages/gateway/src/security-invariants.test.ts`:

```typescript
test("agent.ts both wraps with envelope and writes tool_call_log on the LLM-facing path", async () => {
  const src = await read("packages/gateway/src/engine/agent.ts");
  expect(src).toMatch(/wrapToolOutput\(/);
  expect(src).toMatch(/writeToolCallLog\(/);
});

test("mesh.ts:listTools both wraps with envelope and writes tool_call_log", async () => {
  const src = await read("packages/gateway/src/connectors/lazy-mesh/mesh.ts");
  expect(src).toMatch(/wrapToolOutput\(/);
  expect(src).toMatch(/writeToolCallLog\(/);
});

test("db/tool-call-log.ts exports writeToolCallLog and readToolCallLog", async () => {
  const src = await read("packages/gateway/src/db/tool-call-log.ts");
  expect(src).toMatch(/export function writeToolCallLog/);
  expect(src).toMatch(/export function readToolCallLog/);
});
```

The existing agent.ts I11 test (line 181–184) is **modified in place** — the `expect(src).toMatch(/wrapToolOutput\(/)` line is kept and a second `expect(src).toMatch(/writeToolCallLog\(/)` line is added below it. The mesh.ts and db/tool-call-log.ts tests are **new**.

### 8.7 Coverage gates

| Gate | Threshold | Stays green via |
|---|---|---|
| `bun run test:coverage:engine` | ≥85% | The two integration tests in §8.3 + §8.4 + the existing engine unit tests cover the new try/catch paths in `agent.ts` and `mesh.ts`. |
| `bun run test:coverage:db` | ≥85% | The unit tests in §8.1 cover `writeToolCallLog` + `readToolCallLog` + truncation. |

No new gate is introduced. Coverage for the new `ipc/audit-rpc.ts` lands under the (currently un-gated) IPC handler folder; cases in §8.2 should bring it above 85%.

### 8.8 What this PR does NOT test

- The `auditDb === undefined` runtime fallback at production wiring sites (covered structurally — the I11 grep doesn't depend on the runtime guard).
- LAN reachability of `audit.toolCalls` — `lan-rpc.ts` already enforces, and the existing I5 test (line 91–104) pins it.
- Tauri renderer reachability — the existing `cargo test allowlist_exact_size` enforces (the test will pass as-is because we don't touch `ALLOWED_METHODS`).

## 9. Roadmap & PR boundary

### 9.1 Roadmap edits

Two edits in `docs/roadmap.md`:

1. **Sub-checkbox flip** — under T6's nested list:
   ```markdown
   - [x] PR 2 — `tool_call_log` audit table (V29) (2026-05-15)
   ```
2. **Header status note** — extend the line at `roadmap.md:7` with `T6 PR2 ✅ (2026-05-15)`.

### 9.2 New roadmap follow-up (added by this PR, not closed by it)

Append under T6 in `docs/roadmap.md` immediately after the PR 2 sub-checkbox:

```markdown
- [ ] **`tool_call_log` retention policy** — add `[audit].tool_call_log_retention_days`
  config knob (default 90) plus a scheduled prune (e.g. daily, alongside the
  existing pre-migration backup prune). Audit-table growth is unbounded today
  and real for high-traffic agents. Prune is `DELETE FROM tool_call_log
  WHERE called_at < (now - retention_days * 86_400_000)` plus an `INSERT INTO
  audit_log` entry recording the prune count for tamper-evidence. Locked in
  the T6 sequencing spec §2 PR 2 "Out of scope" — see [`2026-05-14-phase-5-t6-design.md`](./superpowers/specs/2026-05-14-phase-5-t6-design.md).
```

### 9.3 Skill / file-map updates

`/.claude/commands/nimbus-file-map.md` gains three rows under appropriate sections:

| Section | Row |
|---|---|
| Local Index + Migrations + DB | `packages/gateway/src/db/tool-call-log.ts` — `writeToolCallLog` / `readToolCallLog` for the LLM-facing tool-call audit table (T6 PR 2) |
| Local Index + Migrations + DB | `packages/gateway/src/index/tool-call-log-v29-sql.ts` — V29 schema constant |
| IPC | `packages/gateway/src/ipc/audit-rpc.ts` — `dispatchAuditRpc` for `audit.toolCalls`; IPC-only (not LAN, not Tauri) |

### 9.4 Commit / PR topology

Following the PR 1 TDD red/green cadence:

| Commit | Contents |
|---|---|
| `feat(db): tool_call_log V29 schema + write/read helpers` | `index/tool-call-log-v29-sql.ts`, `db/tool-call-log.ts`, `db/tool-call-log.test.ts`, `index/migrations/runner.ts` migration step + label, `index/migrations/migration-v29.test.ts`. Standalone — no production callers yet. |
| `test(security-invariants): TDD red — I11 audit-write extension` | Adds the three new I11 assertions to `security-invariants.test.ts`. Two pass (the existing wrapToolOutput tests stay green). The three new ones fail intentionally until the next commit. |
| `feat(engine,connectors): write tool_call_log at both wrapToolOutput sites` | `engine/agent.ts` + deps extension + `connectors/lazy-mesh/mesh.ts` + `auditDb` option in factory. The I11 test extension goes green. |
| `feat(ipc): audit.toolCalls JSON-RPC handler` | `ipc/audit-rpc.ts` + `ipc/audit-rpc.test.ts` + dispatcher registration. |
| `feat(platform): wire localIndex.db to agent + mesh as auditDb` | `platform/assemble.ts`. Production wiring. Integration tests in §8.3 / §8.4 go green here. |
| `docs(security-invariants,architecture,roadmap): T6 PR 2 — tool_call_log audit table` | `SECURITY-INVARIANTS.md` I11 row, `architecture.md` schema reference, `nimbus-file-map.md` rows, `roadmap.md` flip + follow-up bullet. |

Six commits, smallest-first, mirroring PR 1's pattern (TDD red landed before its green counterpart so the diff in each commit is reviewable as a single concern).

**PR title:** `feat(audit): tool_call_log audit table for LLM-facing tool calls (T6 PR 2)`
**PR branch:** `dev/asafgolombek/phase-5-t6-pr2-tool-call-log` (created off `main` — PR #292 already merged, no stacking).

## 10. Worked examples

### 10.1 Forensic query — "What did the LLM see in session s-12?"

```ts
const result = await client.audit.toolCalls({ sessionId: "s-12" });
for (const call of result.toolCalls) {
  console.log(`[${new Date(call.calledAt).toISOString()}] ${call.toolId} (${call.status})`);
  console.log(call.resultEnvelope);
}
if (result.hasMore) { /* paginate with since: result.nextSince */ }
```

### 10.2 Pagination correctness across same-millisecond rows

Suppose `tool_call_log` contains five rows at `called_at` = 100, 200, 200, 300, 400 (the two at 200 have ids 2 and 3 respectively).

Call 1: `audit.toolCalls({ limit: 3 })` → returns rows id 1 (t=100), id 2 (t=200), id 3 (t=200). `hasMore: true`, `nextSince: 200` (the largest `called_at` returned).

Naively, call 2 with `since: 200` would re-return id 2 and id 3. The dispatcher prevents this by appending an internal `AND id > ?` clause when `since` matches the smallest matching row's `called_at` — implementation detail of `readToolCallLog`'s pagination, not exposed in the IPC surface. Tests in §8.1 cover this directly.

### 10.3 Truncation at 64 KiB

A `searchLocalIndex` call returning 200 items × ~500 bytes each ≈ 100 KiB envelope. `writeToolCallLog` stores:

```
<tool_output service="local" tool="searchLocalIndex">[{"id":1,"name":"…",...},…{"id":131,"name…[truncated, 102400 bytes total]
```

The audit column ends mid-token; the truncation marker is grep-able. The LLM still receives the full 100 KiB envelope at runtime (truncation is for storage, not for the model's context).

## 11. Open questions

None. All design decisions resolved in brainstorming:

- Namespace: `audit.*`, IPC-only (resolved in favour of I5 — the parent T6 spec sketch's "LAN-callable" phrasing was wrong).
- `result_envelope`: full envelope string, not body-only.
- `audit_log_id` FK: dropped — LLM-facing path doesn't write `audit_log`.
- Per-row size cap: 64 KiB with truncation marker.
- Status semantics: `'ok'|'error'`, error path envelope-wraps the error and re-throws.
- sessionId: `getAgentRequestSessionId() ?? null` at both sites; column nullable.
- DB wiring to mesh: new `auditDb?` option (matches existing `healthDb?` pattern).
- Helper module: `db/tool-call-log.ts` owns both write and read.
- IPC shape: filtered pagination with timestamp cursor; default limit 100, max 1000.
- I11 test extension: three new assertions inside the existing block.

## 12. References

- [`docs/superpowers/specs/2026-05-14-phase-5-t6-design.md`](./2026-05-14-phase-5-t6-design.md) — parent T6 sequencing spec; §2 PR 2 sketch.
- [`packages/gateway/src/engine/agent.ts`](../../../packages/gateway/src/engine/agent.ts) lines 28–41 — first wiring site (`wrapToolForLlm`).
- [`packages/gateway/src/connectors/lazy-mesh/mesh.ts`](../../../packages/gateway/src/connectors/lazy-mesh/mesh.ts) lines 396–414 — second wiring site (`listTools`).
- [`packages/gateway/src/engine/tool-output-envelope.ts`](../../../packages/gateway/src/engine/tool-output-envelope.ts) — `wrapToolOutput` (unchanged by this PR).
- [`packages/gateway/src/engine/agent-request-context.ts`](../../../packages/gateway/src/engine/agent-request-context.ts) — `getAgentRequestSessionId` (existing AsyncLocalStorage accessor).
- [`packages/gateway/src/ipc/metrics-rpc.ts`](../../../packages/gateway/src/ipc/metrics-rpc.ts) — canonical reference for `dispatchAuditRpc`'s shape.
- [`packages/gateway/src/ipc/lan-rpc.ts`](../../../packages/gateway/src/ipc/lan-rpc.ts) — `FORBIDDEN_OVER_LAN` (`audit` stays here — invariant `I5`).
- [`packages/gateway/src/security-invariants.test.ts`](../../../packages/gateway/src/security-invariants.test.ts) lines 168–185 — the existing I11 block extended in §8.6.
- [`docs/SECURITY-INVARIANTS.md`](../../SECURITY-INVARIANTS.md) §I11 — the envelope defense this PR audits.
- [`.claude/commands/nimbus-tauri-allowlist.md`](../../../.claude/commands/nimbus-tauri-allowlist.md) — forbidden-namespace defense-in-depth (`audit.*` correctly absent from `ALLOWED_METHODS`).
- [`.claude/commands/nimbus-db-migrations.md`](../../../.claude/commands/nimbus-db-migrations.md) — migration authoring conventions followed by V29.
