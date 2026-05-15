# Phase 5 T6 PR 2 — `tool_call_log` Audit Table (V29) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the `tool_call_log` audit table (V29) — every LLM-facing MCP-tool call gets one structured row recording the `<tool_output>` envelope, duration, sessionId, and ok/error status. Complement to invariant `I11` (the envelope itself); not a replacement.

**Architecture:** A new SQLite table at V29 + a canonical helper file (`db/tool-call-log.ts` exporting `writeToolCallLog` / `readToolCallLog`) + audit-write at both existing `wrapToolOutput` wiring sites (`engine/agent.ts:wrapToolForLlm` and `connectors/lazy-mesh/mesh.ts:listTools`) wrapped in try/catch so tool errors are still logged + a new `audit.toolCalls` IPC method (extends the existing `ipc/audit-rpc.ts`) for forensic querying. Three new assertions extend the existing I11 enforcement block in `security-invariants.test.ts` to pin the audit-write at both wiring sites.

**Tech Stack:** Bun v1.2+, TypeScript 6.x strict (no `any`), `bun:test`, `bun:sqlite`, the existing `dbRun`/`dbExec` wrappers in `db/write.ts`. JSON-RPC 2.0 over the local IPC socket (NOT LAN, NOT Tauri — invariant `I5` + forbidden-namespace defense-in-depth).

**Source spec:** [`docs/superpowers/specs/2026-05-15-phase-5-t6-pr2-tool-call-log-design.md`](../specs/2026-05-15-phase-5-t6-pr2-tool-call-log-design.md). The §12 review-disposition table (Gemini CLI 2026-05-15) locked the composite `(calledAt, id)` cursor and the `sessionId: ''` NULL-session sentinel doc improvements that this plan implements.

**Worktree:** `.worktrees/phase-5-t6-pr2-tool-call-log/`, branch `dev/asafgolombek/phase-5-t6-pr2-tool-call-log` (already created off `main` at the spec-write stage; PR #292 already merged so no stacking).

---

## File Structure

### Files created

| Path | Responsibility |
|---|---|
| `packages/gateway/src/index/tool-call-log-v29-sql.ts` | Exports `TOOL_CALL_LOG_V29_SCHEMA_SQL` constant — `CREATE TABLE` + 3 indexes. |
| `packages/gateway/src/db/tool-call-log.ts` | Canonical helper module — `writeToolCallLog`, `readToolCallLog`, types, `MAX_ENVELOPE_BYTES = 65_536`, private `truncateEnvelope`. Mirrors `db/audit-chain.ts` shape. |
| `packages/gateway/src/db/tool-call-log.test.ts` | Unit tests for the helper: write+read round-trip, truncation marker, NULL-session, filter combinations, composite-cursor pagination, status='error' write path. |
| `packages/gateway/src/ipc/audit-toolcalls-rpc.test.ts` | Unit tests for the new `audit.toolCalls` handler branch: param validation (-32602 cases), default+max limit clamping, composite-cursor round-trip, `sessionId: ''` sentinel semantics. |
| `packages/gateway/test/integration/engine/agent-tool-call-log.test.ts` | Integration test asserting `wrapToolForLlm` writes a row when wrapped tool resolves; status='error' row when wrapped tool throws; return value is byte-identical to today's envelope. |
| `packages/gateway/test/integration/connectors/lazy-mesh/mesh-tool-call-log.test.ts` | Integration test asserting `listTools` writes a row with the correct `service` (extracted from the `key.split("_")[0]` rule) when a wrapped MCP tool resolves. |
| `packages/gateway/test/integration/index/migrations/migration-v29.test.ts` | Migration runner test asserting `PRAGMA user_version` reaches 29, `_schema_migrations` records V29, all 3 indexes exist, pre-migration backup is written. |

### Files modified

| Path | Change |
|---|---|
| `packages/gateway/src/index/migrations/runner.ts` | Add `migrateIndexedV28ToV29(db, now)` step + entry in `INDEXED_SCHEMA_STEPS` + new entry in `BACKFILL_LABELS`. Import `TOOL_CALL_LOG_V29_SCHEMA_SQL`. |
| `packages/gateway/src/engine/agent.ts` | Extend `NimbusEngineAgentDeps` with optional `auditDb?: Database`. `wrapToolForLlm` gains a `db?: Database` parameter closed over by `createNimbusEngineAgent`. The wrapper body becomes a try/catch + `writeToolCallLog` shape. Existing `getAgentRequestSessionId` import (line 12) is reused. |
| `packages/gateway/src/connectors/lazy-mesh/mesh.ts` | Add `auditDb?: Database` to constructor options + `private readonly auditDb` field + `createLazyConnectorMesh` factory options. `listTools`'s wrapped execute gets the same try/catch + `writeToolCallLog` shape. New imports: `getAgentRequestSessionId`, `writeToolCallLog`. |
| `packages/gateway/src/ipc/audit-rpc.ts` | Extend the existing file: new `audit.toolCalls` branch in `dispatchAuditRpc` calling `readToolCallLog(idx.getDatabase(), filter)`. New `parseAuditToolCallsParams(params)` private helper. Existing `audit.verify` / `audit.exportAll` / `audit.export` / `audit.getSummary` branches stay untouched. |
| `packages/gateway/src/ipc/server/dispatchers.ts` | Extend `tryDispatchAuditRpc` (line 158) — add `&& method !== "audit.toolCalls"` to the existing 2-method filter so the new method routes to `dispatchAuditRpc`. |
| `packages/gateway/src/index.ts` | Line 35 — extend the `createNimbusEngineAgent({...})` call to include `auditDb: platform.localIndex.getDatabase()`. |
| `packages/gateway/src/platform/assemble.ts` | Line 259 — extend the `createLazyConnectorMesh(...)` call to include `auditDb: db` (alongside the existing `healthDb: db` — same handle, different concern). |
| `packages/gateway/src/security-invariants.test.ts` | Inside the existing `describe("I11 — Tool-result envelope on the LLM-facing path")` block (lines 168–185): extend the `agent.ts` test to also `expect(src).toMatch(/writeToolCallLog\(/)`; ADD a NEW test for `mesh.ts:listTools` asserting both `wrapToolOutput` and `writeToolCallLog`; ADD a NEW test asserting `db/tool-call-log.ts` exports `writeToolCallLog` and `readToolCallLog`. |
| `docs/SECURITY-INVARIANTS.md` | I11 row's "Wired at" extends to mention `db/tool-call-log.ts` write side; the rationale paragraph after the table notes the audit complement. **No new I-number row.** |
| `docs/architecture.md` | Add `tool_call_log` to the "Local Database Schema" reference table. |
| `.claude/commands/nimbus-file-map.md` | New rows: `db/tool-call-log.ts` (under "Local Index + Migrations + DB"), `index/tool-call-log-v29-sql.ts` (same section), `ipc/audit-rpc.ts` `audit.toolCalls` branch (under "IPC"). |
| `docs/roadmap.md` | Flip T6 PR 2 sub-checkbox; extend `Last updated:` line at `roadmap.md:7` with `T6 PR2 ✅ (2026-05-15)`; append the new System Maintenance follow-up bullet (retention policy) under T6. |

### Files NOT modified

- `packages/gateway/src/engine/tool-output-envelope.ts` — `wrapToolOutput` is unchanged. The audit-write happens around it, not inside it.
- `packages/gateway/src/db/audit-chain.ts` — `audit_log` and its BLAKE3 chain are unchanged. The two paths stay disjoint.
- `packages/ui/src-tauri/src/gateway_bridge.rs` — `ALLOWED_METHODS` count unchanged; no renderer-callable surface added.
- `packages/gateway/src/ipc/lan-rpc.ts` — `FORBIDDEN_OVER_LAN` unchanged; `audit` namespace stays forbidden (`I5` enforcement intact).
- `packages/gateway/src/ipc/http-server.ts` — `audit.toolCalls` is NOT exposed via the read-only HTTP API. Same exfiltration-class posture as `vault.*`.

---

## Task 1 — Verify baseline

**Files:** none.

- [ ] **Step 1.1: Confirm worktree + branch**

```bash
git rev-parse --abbrev-ref HEAD
git status --short
```

Expected:

```
dev/asafgolombek/phase-5-t6-pr2-tool-call-log
(no output from git status — both spec commits already landed)
```

If branch is wrong: stop. If working tree has unstaged changes: stop.

- [ ] **Step 1.2: Confirm the spec is on this branch**

```bash
ls docs/superpowers/specs/2026-05-15-phase-5-t6-pr2-tool-call-log-design.md
```

Expected: file exists.

- [ ] **Step 1.3: Confirm baseline typecheck is green**

```bash
bun run typecheck
```

Expected: exits 0. If errors exist before this PR's changes, stop and report — the baseline is dirty.

- [ ] **Step 1.4: Confirm baseline `security-invariants.test.ts` is green**

```bash
bun test packages/gateway/src/security-invariants.test.ts
```

Expected: all tests pass — including the existing I11 block (3 tests at lines 168–185). The I11 block has 3 tests today; Task 5 grows it to 5.

- [ ] **Step 1.5: Confirm the two `wrapToolOutput` wiring sites match the spec's source-line references**

```bash
grep -n "wrapToolOutput" packages/gateway/src/engine/agent.ts
grep -n "wrapToolOutput" packages/gateway/src/connectors/lazy-mesh/mesh.ts
grep -n "function wrapToolForLlm" packages/gateway/src/engine/agent.ts
```

Expected (line numbers may have drifted by ±2):

```
packages/gateway/src/engine/agent.ts:18:import { wrapToolOutput } from "./tool-output-envelope.ts";
packages/gateway/src/engine/agent.ts:38:      return wrapToolOutput({ service, tool }, raw);
packages/gateway/src/connectors/lazy-mesh/mesh.ts:3:import { wrapToolOutput } from "../../engine/tool-output-envelope.ts";
packages/gateway/src/connectors/lazy-mesh/mesh.ts:409:          return wrapToolOutput({ service, tool: key }, raw);
packages/gateway/src/engine/agent.ts:28:function wrapToolForLlm<T>(service: string, tool: string, toolDef: T): T {
```

If `wrapToolOutput` is no longer at those positions, the wiring shape has shifted since the spec was written and the plan needs revisiting.

- [ ] **Step 1.6: Confirm `ipc/audit-rpc.ts` exists and currently handles 4 methods**

```bash
grep -n 'method === "audit\.' packages/gateway/src/ipc/audit-rpc.ts
```

Expected:

```
packages/gateway/src/ipc/audit-rpc.ts:28:  if (method === "audit.verify") {
packages/gateway/src/ipc/audit-rpc.ts:39:  if (method === "audit.exportAll" || method === "audit.export") {
packages/gateway/src/ipc/audit-rpc.ts:43:  if (method === "audit.getSummary") {
```

Plan extends this file with a new `audit.toolCalls` branch — does NOT create a new file.

- [ ] **Step 1.7: Confirm the `tryDispatchAuditRpc` filter shape**

```bash
grep -nA3 'export async function tryDispatchAuditRpc' packages/gateway/src/ipc/server/dispatchers.ts
```

Expected:

```
158:export async function tryDispatchAuditRpc(
159:  ctx: ServerCtx,
160:  method: string,
161:  params: unknown,
```

And around line 163:

```
163:  if (method !== "audit.verify" && method !== "audit.exportAll") return phase4RpcSkipped;
```

Task 12 extends this filter to also accept `audit.toolCalls`.

- [ ] **Step 1.8: Confirm V28 is the latest migration**

```bash
grep -nE 'migrateIndexedV[0-9]+ToV[0-9]+' packages/gateway/src/index/migrations/runner.ts | tail -3
```

Expected:

```
...
379:function migrateIndexedV27ToV28(db: Database, now: number): void {
387:const INDEXED_SCHEMA_STEPS: readonly IndexedSchemaStep[] = [
```

(Line numbers approximate.) V28 is the latest. Task 3 adds V29.

---

## Task 2 — TDD red: helper unit tests for `db/tool-call-log.ts`

**Files:**

- Create: `packages/gateway/src/db/tool-call-log.test.ts`

This task captures the full unit-test surface for the canonical helper module. Every assertion fails until Task 3 lands the implementation.

- [ ] **Step 2.1: Create the test file**

Create `packages/gateway/src/db/tool-call-log.test.ts` with:

```ts
import { Database } from "bun:sqlite";
import { beforeEach, describe, expect, test } from "bun:test";

import { TOOL_CALL_LOG_V29_SCHEMA_SQL } from "../index/tool-call-log-v29-sql.ts";
import {
  MAX_ENVELOPE_BYTES,
  type ToolCallLogEntry,
  readToolCallLog,
  writeToolCallLog,
} from "./tool-call-log.ts";

function freshDb(): Database {
  const db = new Database(":memory:");
  db.exec(TOOL_CALL_LOG_V29_SCHEMA_SQL);
  return db;
}

function entry(over: Partial<ToolCallLogEntry> = {}): ToolCallLogEntry {
  return {
    sessionId: "s-1",
    toolId: "github_repo_pr_list",
    service: "github",
    calledAt: 1_000,
    durationMs: 50,
    resultEnvelope: '<tool_output service="github" tool="github_repo_pr_list">[]</tool_output>',
    status: "ok",
    ...over,
  };
}

describe("writeToolCallLog + readToolCallLog", () => {
  let db: Database;
  beforeEach(() => {
    db = freshDb();
  });

  test("write+read round-trip preserves all fields", () => {
    writeToolCallLog(db, entry());
    const result = readToolCallLog(db, {});
    expect(result.toolCalls).toHaveLength(1);
    const row = result.toolCalls[0];
    expect(row).toBeDefined();
    if (row === undefined) throw new Error("unreachable");
    expect(row.sessionId).toBe("s-1");
    expect(row.toolId).toBe("github_repo_pr_list");
    expect(row.service).toBe("github");
    expect(row.calledAt).toBe(1_000);
    expect(row.durationMs).toBe(50);
    expect(row.resultEnvelope).toContain("<tool_output");
    expect(row.status).toBe("ok");
    expect(typeof row.id).toBe("number");
  });

  test("nullable session_id round-trip", () => {
    writeToolCallLog(db, entry({ sessionId: null }));
    const result = readToolCallLog(db, {});
    expect(result.toolCalls[0]?.sessionId).toBeNull();
  });

  test("status='error' write+read round-trip", () => {
    const errEnvelope = '<tool_output service="github" tool="x">{"error":"boom"}</tool_output>';
    writeToolCallLog(db, entry({ status: "error", resultEnvelope: errEnvelope }));
    const result = readToolCallLog(db, {});
    expect(result.toolCalls[0]?.status).toBe("error");
    expect(result.toolCalls[0]?.resultEnvelope).toContain('"error":"boom"');
  });

  test("envelope at exactly 64 KiB is NOT truncated", () => {
    const head = '<tool_output service="x" tool="y">';
    const tail = "</tool_output>";
    const fillerLen = MAX_ENVELOPE_BYTES - head.length - tail.length;
    const envelope = `${head}${"a".repeat(fillerLen)}${tail}`;
    expect(Buffer.byteLength(envelope, "utf8")).toBe(MAX_ENVELOPE_BYTES);
    writeToolCallLog(db, entry({ resultEnvelope: envelope }));
    const result = readToolCallLog(db, {});
    expect(result.toolCalls[0]?.resultEnvelope).toBe(envelope);
    expect(result.toolCalls[0]?.resultEnvelope).not.toContain("[truncated,");
  });

  test("envelope over 64 KiB is truncated with grep-able marker", () => {
    const huge = "x".repeat(100_000);
    const envelope = `<tool_output service="x" tool="y">${huge}</tool_output>`;
    writeToolCallLog(db, entry({ resultEnvelope: envelope }));
    const stored = readToolCallLog(db, {}).toolCalls[0]?.resultEnvelope ?? "";
    expect(Buffer.byteLength(stored, "utf8")).toBeLessThanOrEqual(MAX_ENVELOPE_BYTES);
    expect(stored).toContain("...[truncated,");
    expect(stored).toContain(`${Buffer.byteLength(envelope, "utf8")} bytes total]`);
  });

  test("filter by sessionId returns only the matching session", () => {
    writeToolCallLog(db, entry({ sessionId: "s-A", calledAt: 100 }));
    writeToolCallLog(db, entry({ sessionId: "s-B", calledAt: 200 }));
    const result = readToolCallLog(db, { sessionId: "s-A" });
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]?.sessionId).toBe("s-A");
  });

  test("sessionId='' sentinel returns ONLY rows with NULL session_id", () => {
    writeToolCallLog(db, entry({ sessionId: null, calledAt: 100 }));
    writeToolCallLog(db, entry({ sessionId: "s-1", calledAt: 200 }));
    const result = readToolCallLog(db, { sessionId: "" });
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]?.sessionId).toBeNull();
  });

  test("omitted sessionId returns rows from all sessions including NULL", () => {
    writeToolCallLog(db, entry({ sessionId: null, calledAt: 100 }));
    writeToolCallLog(db, entry({ sessionId: "s-1", calledAt: 200 }));
    const result = readToolCallLog(db, {});
    expect(result.toolCalls).toHaveLength(2);
  });

  test("filter by toolId returns only the matching tool", () => {
    writeToolCallLog(db, entry({ toolId: "t-A", calledAt: 100 }));
    writeToolCallLog(db, entry({ toolId: "t-B", calledAt: 200 }));
    const result = readToolCallLog(db, { toolId: "t-A" });
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]?.toolId).toBe("t-A");
  });

  test("filter by status returns only the matching status", () => {
    writeToolCallLog(db, entry({ status: "ok", calledAt: 100 }));
    writeToolCallLog(db, entry({ status: "error", calledAt: 200 }));
    const result = readToolCallLog(db, { status: "error" });
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]?.status).toBe("error");
  });

  test("filter by since/until applies inclusive bounds on called_at", () => {
    writeToolCallLog(db, entry({ calledAt: 100 }));
    writeToolCallLog(db, entry({ calledAt: 200 }));
    writeToolCallLog(db, entry({ calledAt: 300 }));
    const result = readToolCallLog(db, { since: 150, until: 250 });
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]?.calledAt).toBe(200);
  });

  test("default limit is 100", () => {
    for (let i = 0; i < 200; i++) writeToolCallLog(db, entry({ calledAt: i }));
    const result = readToolCallLog(db, {});
    expect(result.toolCalls).toHaveLength(100);
    expect(result.hasMore).toBe(true);
  });

  test("limit honored up to 1000", () => {
    for (let i = 0; i < 1500; i++) writeToolCallLog(db, entry({ calledAt: i }));
    const result = readToolCallLog(db, { limit: 1000 });
    expect(result.toolCalls).toHaveLength(1000);
    expect(result.hasMore).toBe(true);
  });

  test("ordering: called_at ASC, id ASC (deterministic across same-millisecond rows)", () => {
    writeToolCallLog(db, entry({ calledAt: 200 })); // id=1
    writeToolCallLog(db, entry({ calledAt: 100 })); // id=2
    writeToolCallLog(db, entry({ calledAt: 200 })); // id=3
    const result = readToolCallLog(db, {});
    expect(result.toolCalls.map((r) => r.calledAt)).toEqual([100, 200, 200]);
    expect(result.toolCalls.map((r) => r.id)).toEqual([2, 1, 3]);
  });

  test("pagination across hasMore using composite cursor", () => {
    for (let i = 0; i < 250; i++) writeToolCallLog(db, entry({ calledAt: i }));
    const page1 = readToolCallLog(db, { limit: 100 });
    expect(page1.toolCalls).toHaveLength(100);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).not.toBeNull();
    if (page1.nextCursor === null) throw new Error("unreachable");
    const page2 = readToolCallLog(db, { limit: 100, cursor: page1.nextCursor });
    expect(page2.toolCalls).toHaveLength(100);
    expect(page2.toolCalls[0]?.calledAt).toBe(100);
    expect(page2.hasMore).toBe(true);
  });

  test("pagination is correct across same-millisecond rows", () => {
    // 5 rows: t=100,200,200,300,400 (the two at 200 are ids 2 and 3 by insertion order)
    writeToolCallLog(db, entry({ calledAt: 100 })); // id=1
    writeToolCallLog(db, entry({ calledAt: 200 })); // id=2
    writeToolCallLog(db, entry({ calledAt: 200 })); // id=3
    writeToolCallLog(db, entry({ calledAt: 300 })); // id=4
    writeToolCallLog(db, entry({ calledAt: 400 })); // id=5

    const page1 = readToolCallLog(db, { limit: 3 });
    expect(page1.toolCalls.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).toEqual({ calledAt: 200, id: 3 });

    const page2 = readToolCallLog(db, { limit: 3, cursor: page1.nextCursor ?? undefined });
    expect(page2.toolCalls.map((r) => r.id)).toEqual([4, 5]);
    expect(page2.hasMore).toBe(false);
    expect(page2.nextCursor).toBeNull();
  });

  test("final page reports hasMore=false, nextCursor=null", () => {
    for (let i = 0; i < 50; i++) writeToolCallLog(db, entry({ calledAt: i }));
    const result = readToolCallLog(db, { limit: 100 });
    expect(result.toolCalls).toHaveLength(50);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  test("cursor + since combine without conflict", () => {
    for (let i = 0; i < 10; i++) writeToolCallLog(db, entry({ calledAt: 100 + i * 100 }));
    // First call: since=200 lower bound, limit=5 → returns t=200..600 (5 rows)
    const page1 = readToolCallLog(db, { since: 200, limit: 5 });
    expect(page1.toolCalls.map((r) => r.calledAt)).toEqual([200, 300, 400, 500, 600]);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).not.toBeNull();
    if (page1.nextCursor === null) throw new Error("unreachable");
    // Second call: same since=200 lower bound, cursor advances → returns 700..1000
    const page2 = readToolCallLog(db, { since: 200, limit: 5, cursor: page1.nextCursor });
    expect(page2.toolCalls.map((r) => r.calledAt)).toEqual([700, 800, 900, 1_000]);
    expect(page2.hasMore).toBe(false);
  });

  test("empty table returns empty result with hasMore=false, nextCursor=null", () => {
    const result = readToolCallLog(db, {});
    expect(result.toolCalls).toHaveLength(0);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  test("write swallows DiskFullError-shaped errors gracefully (does not throw)", () => {
    // Re-open with the table read-only by closing first then opening read-only — write
    // attempts will throw a constraint-shaped error. The helper's internal try/catch
    // must swallow it so the LLM-facing path is never broken.
    db.close();
    const ro = new Database(":memory:", { readonly: true });
    expect(() => writeToolCallLog(ro, entry())).not.toThrow();
    ro.close();
  });
});
```

- [ ] **Step 2.2: Run the tests and verify they fail (TDD red)**

```bash
bun test packages/gateway/src/db/tool-call-log.test.ts
```

Expected: every test fails with module-not-found errors for both `../index/tool-call-log-v29-sql.ts` and `./tool-call-log.ts`. Bun's test loader prints the import error per file.

If you see passing tests, stop — that means either file exists already and the next task's work is misaligned.

- [ ] **Step 2.3: Commit the failing test file**

```bash
git add packages/gateway/src/db/tool-call-log.test.ts
git commit -m "$(cat <<'EOF'
test(db): TDD red — tool_call_log helper unit tests

Adds 19 unit cases covering the canonical writeToolCallLog +
readToolCallLog helpers the next commit lands. Cases enumerate the
spec §8.1 matrix:

- Round-trip: all fields, nullable session_id, status='error'.
- Truncation: at-cap (no truncation), over-cap (marker present + total
  bytes echoed in marker text).
- Filtering: sessionId, sessionId='' NULL-sentinel, omitted sessionId,
  toolId, status, since+until window.
- Limits: default 100, max 1000.
- Ordering: called_at ASC then id ASC (same-millisecond determinism).
- Pagination: composite (calledAt, id) cursor across hasMore boundary,
  same-millisecond cursor correctness, final-page null cursor,
  cursor+since composing without conflict.
- Empty: empty-table returns null cursor.
- Failure-mode: write swallows DiskFullError-shaped errors so the
  LLM-facing path is never broken.

All 19 fail intentionally — neither tool-call-log-v29-sql.ts nor
tool-call-log.ts exists yet.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — TDD green: V29 SQL constant + migration runner step + helper implementation

**Files:**

- Create: `packages/gateway/src/index/tool-call-log-v29-sql.ts`
- Create: `packages/gateway/src/db/tool-call-log.ts`
- Modify: `packages/gateway/src/index/migrations/runner.ts`

- [ ] **Step 3.1: Create the V29 SQL constant file**

Create `packages/gateway/src/index/tool-call-log-v29-sql.ts` with:

```ts
/**
 * V29 migration — `tool_call_log` audit table for LLM-facing tool calls
 * (Phase 5 T6 PR 2). Complement to invariant `I11` (the `<tool_output>`
 * envelope): the envelope wraps the LLM-facing result string at runtime;
 * this table records the envelope's contents at audit time.
 *
 * Posture: write-only from `engine/agent.ts:wrapToolForLlm` and
 * `connectors/lazy-mesh/mesh.ts:listTools`; read-only from `audit.toolCalls`
 * (IPC-only — NOT LAN-callable per `I5`, NOT in Tauri allowlist per `I7`).
 */

export const TOOL_CALL_LOG_V29_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tool_call_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id      TEXT,
  tool_id         TEXT NOT NULL,
  service         TEXT NOT NULL,
  called_at       INTEGER NOT NULL,
  duration_ms     INTEGER NOT NULL,
  result_envelope TEXT NOT NULL,
  status          TEXT NOT NULL CHECK(status IN ('ok','error'))
);
CREATE INDEX IF NOT EXISTS idx_tool_call_log_session   ON tool_call_log(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_call_log_tool_time ON tool_call_log(tool_id, called_at);
CREATE INDEX IF NOT EXISTS idx_tool_call_log_called_at ON tool_call_log(called_at);
`;
```

- [ ] **Step 3.2: Create the canonical helper module**

Create `packages/gateway/src/db/tool-call-log.ts` with:

```ts
/**
 * Canonical helper for the `tool_call_log` audit table (V29). Owns both the
 * write side (called from the two `wrapToolOutput` wiring sites) and the
 * read side (called from the `audit.toolCalls` IPC handler).
 *
 * Mirrors the `db/audit-chain.ts` shape: pure functions over a `Database`
 * handle, no class, no module-private state.
 */

import type { Database } from "bun:sqlite";

import { dbRun } from "./write.ts";

/** Per-row envelope cap (bytes). 64 KiB; the truncation marker fits inside. */
export const MAX_ENVELOPE_BYTES = 65_536;

/** Reserve room for the marker so the final string never exceeds the cap. */
const TRUNCATION_HEAD_BYTES = 65_504;

export interface ToolCallLogEntry {
  /** Active session, or null when no agentRequestContext.run is in scope. */
  sessionId: string | null;
  /** Mastra-namespaced tool id (e.g. "github_repo_pr_list", "searchLocalIndex"). */
  toolId: string;
  /** Connector / service id (e.g. "github", "filesystem", "local"). */
  service: string;
  /** Unix ms when the wrapped tool was invoked. */
  calledAt: number;
  /** Wall-clock ms from invocation to envelope emission. */
  durationMs: number;
  /** Full <tool_output>...</tool_output> envelope, capped at 64 KiB. */
  resultEnvelope: string;
  /** 'ok' on resolve; 'error' on throw (envelope wraps the error message). */
  status: "ok" | "error";
}

export interface ToolCallLogReadEntry extends ToolCallLogEntry {
  id: number;
}

export interface ToolCallLogFilter {
  /** Inclusive lower bound on called_at (unix ms). */
  since?: number;
  /** Inclusive upper bound on called_at (unix ms). */
  until?: number;
  /** 1..1000, default 100. */
  limit?: number;
  /**
   * sessionId='' (empty string) → ONLY rows with NULL session_id.
   * sessionId='s-x' (non-empty) → ONLY rows with that exact session.
   * Omit field entirely → no session filter.
   */
  sessionId?: string;
  /** Exact-match filter on tool_id. */
  toolId?: string;
  /** Exact-match filter on status. */
  status?: "ok" | "error";
  /** Resumption cursor from a previous nextCursor. */
  cursor?: { calledAt: number; id: number };
}

export interface ToolCallLogReadResult {
  toolCalls: ToolCallLogReadEntry[];
  hasMore: boolean;
  nextCursor: { calledAt: number; id: number } | null;
}

/**
 * Truncate `envelope` to `MAX_ENVELOPE_BYTES` UTF-8 bytes if needed,
 * appending a grep-able `...[truncated, N bytes total]` marker.
 *
 * Mid-multi-byte cuts may emit U+FFFD at the cut point; documented as
 * expected behaviour in the spec §5.2 ("Multi-byte cut behaviour").
 */
function truncateEnvelope(envelope: string): string {
  const total = Buffer.byteLength(envelope, "utf8");
  if (total <= MAX_ENVELOPE_BYTES) return envelope;
  const head = Buffer.from(envelope, "utf8")
    .subarray(0, TRUNCATION_HEAD_BYTES)
    .toString("utf8");
  return `${head}...[truncated, ${String(total)} bytes total]`;
}

const INSERT_SQL = `
INSERT INTO tool_call_log
  (session_id, tool_id, service, called_at, duration_ms, result_envelope, status)
VALUES (?, ?, ?, ?, ?, ?, ?)
`.trim();

/**
 * Write one row into `tool_call_log`. Internal try/catch swallows
 * `DiskFullError` and constraint violations so the LLM-facing path is
 * never broken by an audit-write failure (forensic completeness is
 * best-effort; functional correctness is mandatory).
 */
export function writeToolCallLog(db: Database, entry: ToolCallLogEntry): void {
  const envelope = truncateEnvelope(entry.resultEnvelope);
  try {
    dbRun(db, INSERT_SQL, [
      entry.sessionId,
      entry.toolId,
      entry.service,
      entry.calledAt,
      entry.durationMs,
      envelope,
      entry.status,
    ]);
  } catch {
    // Best-effort. The two wiring sites are not allowed to throw because of
    // an audit-write failure — the user's tool call must still complete.
  }
}

/**
 * Read rows from `tool_call_log` with filtering + pagination.
 *
 * Pagination uses a composite (called_at, id) cursor — see spec §6.2 for
 * the rationale (bare-timestamp cursor would re-return same-millisecond
 * rows or skip them, with no way for the caller to disambiguate).
 */
export function readToolCallLog(db: Database, filter: ToolCallLogFilter): ToolCallLogReadResult {
  const limit = clampLimit(filter.limit);
  const where: string[] = [];
  const args: unknown[] = [];

  if (filter.since !== undefined) {
    where.push("called_at >= ?");
    args.push(filter.since);
  }
  if (filter.until !== undefined) {
    where.push("called_at <= ?");
    args.push(filter.until);
  }
  if (filter.sessionId !== undefined) {
    if (filter.sessionId === "") {
      where.push("session_id IS NULL");
    } else {
      where.push("session_id = ?");
      args.push(filter.sessionId);
    }
  }
  if (filter.toolId !== undefined) {
    where.push("tool_id = ?");
    args.push(filter.toolId);
  }
  if (filter.status !== undefined) {
    where.push("status = ?");
    args.push(filter.status);
  }
  if (filter.cursor !== undefined) {
    where.push("(called_at > ? OR (called_at = ? AND id > ?))");
    args.push(filter.cursor.calledAt, filter.cursor.calledAt, filter.cursor.id);
  }

  const whereClause = where.length === 0 ? "" : `WHERE ${where.join(" AND ")}`;
  // Fetch limit+1 so we can detect hasMore without a second query.
  const sql = `
SELECT id, session_id, tool_id, service, called_at, duration_ms, result_envelope, status
FROM tool_call_log
${whereClause}
ORDER BY called_at ASC, id ASC
LIMIT ?
`.trim();

  type Row = {
    id: number;
    session_id: string | null;
    tool_id: string;
    service: string;
    called_at: number;
    duration_ms: number;
    result_envelope: string;
    status: "ok" | "error";
  };

  const rows = db.query(sql).all(...args, limit + 1) as Row[];
  const hasMore = rows.length > limit;
  const visible = hasMore ? rows.slice(0, limit) : rows;

  const toolCalls: ToolCallLogReadEntry[] = visible.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    toolId: r.tool_id,
    service: r.service,
    calledAt: r.called_at,
    durationMs: r.duration_ms,
    resultEnvelope: r.result_envelope,
    status: r.status,
  }));

  const last = toolCalls.at(-1);
  const nextCursor = hasMore && last !== undefined ? { calledAt: last.calledAt, id: last.id } : null;
  return { toolCalls, hasMore, nextCursor };
}

function clampLimit(raw: number | undefined): number {
  if (raw === undefined) return 100;
  if (!Number.isInteger(raw) || raw < 1) return 100;
  if (raw > 1_000) return 1_000;
  return raw;
}
```

- [ ] **Step 3.3: Add the V29 migration step in the runner**

Open `packages/gateway/src/index/migrations/runner.ts`. Find the import block (lines 16–57) and add the import in alphabetical order (it sorts after `SUB_TASK_RESULTS_V17_SQL` and before `UNIFIED_ITEM_V3_*`):

```ts
import { TOOL_CALL_LOG_V29_SCHEMA_SQL } from "../tool-call-log-v29-sql.ts";
```

Find the last `migrateIndexedV<N>ToV<N+1>` function (currently `migrateIndexedV27ToV28` around line 379). Immediately after it, before the `INDEXED_SCHEMA_STEPS` array, add:

```ts
function migrateIndexedV28ToV29(db: Database, now: number): void {
  db.transaction(() => {
    db.exec(TOOL_CALL_LOG_V29_SCHEMA_SQL);
    db.exec("PRAGMA user_version = 29");
    recordMigration(db, 29, "tool_call_log audit table (T6 PR 2)", now);
  })();
}
```

In `INDEXED_SCHEMA_STEPS`, append the new entry (after the V27→V28 line):

```ts
  { fromVersion: 27, toVersion: 28, apply: migrateIndexedV27ToV28 },
  { fromVersion: 28, toVersion: 29, apply: migrateIndexedV28ToV29 },
];
```

In `BACKFILL_LABELS`, append:

```ts
  "deployment_items shadow table (T4 PR 3b) (backfilled)",
  "tool_call_log audit table (T6 PR 2) (backfilled)",
];
```

- [ ] **Step 3.4: Run the helper tests and verify they all pass (TDD green for Task 2)**

```bash
bun test packages/gateway/src/db/tool-call-log.test.ts
```

Expected: all 19 tests pass.

If any case fails, read the assertion and fix the implementation — do NOT weaken the test. Common failure modes:
- Truncation cap off-by-one: re-check `MAX_ENVELOPE_BYTES` vs `TRUNCATION_HEAD_BYTES` arithmetic; the marker text length is constant for any given total-byte value, so `head + marker ≤ cap` must hold for all `total > cap`.
- Cursor not skipping same-millisecond rows: check the WHERE clause has the `(called_at > ? OR (called_at = ? AND id > ?))` shape.
- `sessionId === ''` not finding NULL rows: confirm the helper checks `=== ""` BEFORE binding the parameter, otherwise `WHERE session_id = ''` returns zero rows (NULL doesn't equal empty string).

- [ ] **Step 3.5: Typecheck**

```bash
bun run typecheck
```

Expected: exits 0. If errors reference a missing import in `runner.ts`, double-check the path of the new SQL constant file.

- [ ] **Step 3.6: Commit the implementation**

```bash
git add packages/gateway/src/index/tool-call-log-v29-sql.ts \
        packages/gateway/src/db/tool-call-log.ts \
        packages/gateway/src/index/migrations/runner.ts
git commit -m "$(cat <<'EOF'
feat(db): tool_call_log V29 schema + write/read helpers

Lands the canonical helper module + V29 migration step. No production
callers yet — Tasks 6, 8, and 11 wire the two wrapToolOutput sites and
the audit.toolCalls IPC handler. Standalone, reviewable as a unit.

- index/tool-call-log-v29-sql.ts: TOOL_CALL_LOG_V29_SCHEMA_SQL constant
  with the table + 3 indexes (session, (tool_id, called_at), called_at).
  Schema honors the spec §5 lock: session_id nullable, no audit_log_id
  FK, duration_ms NOT NULL.
- db/tool-call-log.ts: writeToolCallLog + readToolCallLog + types +
  MAX_ENVELOPE_BYTES = 65_536. Write side truncates envelopes >64 KiB
  with a grep-able '...[truncated, N bytes total]' marker; internal
  try/catch swallows DiskFullError so the LLM-facing path is never
  broken by an audit-write failure. Read side supports filtered
  pagination with a composite (calledAt, id) cursor (Gemini CLI review
  §2.3 — bare timestamp cursor would re-return same-millisecond rows).
- index/migrations/runner.ts: V28→V29 step + entries in
  INDEXED_SCHEMA_STEPS and BACKFILL_LABELS. Pre-migration backup is
  automatic via the existing writePreMigrationBackup path.

The Task 2 helper tests now pass (TDD green).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — Migration runner integration test

**Files:**

- Create: `packages/gateway/test/integration/index/migrations/migration-v29.test.ts`

This test runs the actual migration runner against a fresh DB and asserts the V29 step lands the right ledger entry, indexes, and pre-migration backup.

- [ ] **Step 4.1: Confirm the test directory exists**

```bash
ls packages/gateway/test/integration/ 2>&1 | head -10
```

Expected: directory exists with subdirectories. If no `index/migrations/` subdirectory exists, `mkdir -p` it before creating the file. The test path mirrors the source path under `src/index/migrations/`.

- [ ] **Step 4.2: Create the migration test**

Create `packages/gateway/test/integration/index/migrations/migration-v29.test.ts` with:

```ts
import { Database } from "bun:sqlite";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  readIndexedUserVersion,
  runIndexedSchemaMigrations,
} from "../../../../src/index/migrations/runner.ts";

describe("V29 — tool_call_log audit table migration", () => {
  let tmpDir: string;
  let dbPath: string;
  let db: Database;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "nimbus-v29-"));
    dbPath = join(tmpDir, "nimbus.db");
    db = new Database(dbPath);
  });

  afterEach(() => {
    try {
      db.close();
    } catch {
      /* ignore */
    }
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  test("PRAGMA user_version reaches 29 after running migrations through V29", () => {
    runIndexedSchemaMigrations(db, 29);
    expect(readIndexedUserVersion(db)).toBe(29);
  });

  test("_schema_migrations records V29 with the correct description", () => {
    runIndexedSchemaMigrations(db, 29);
    const row = db
      .query("SELECT version, description FROM _schema_migrations WHERE version = 29")
      .get() as { version: number; description: string } | null;
    expect(row).not.toBeNull();
    expect(row?.version).toBe(29);
    expect(row?.description).toContain("tool_call_log");
  });

  test("tool_call_log table exists with the expected columns", () => {
    runIndexedSchemaMigrations(db, 29);
    const cols = db.query("PRAGMA table_info(tool_call_log)").all() as Array<{
      name: string;
      type: string;
      notnull: number;
    }>;
    const colMap = new Map(cols.map((c) => [c.name, c]));
    expect(colMap.get("id")?.type).toBe("INTEGER");
    expect(colMap.get("session_id")?.notnull).toBe(0); // nullable per spec §5.1
    expect(colMap.get("tool_id")?.notnull).toBe(1);
    expect(colMap.get("service")?.notnull).toBe(1);
    expect(colMap.get("called_at")?.notnull).toBe(1);
    expect(colMap.get("duration_ms")?.notnull).toBe(1);
    expect(colMap.get("result_envelope")?.notnull).toBe(1);
    expect(colMap.get("status")?.notnull).toBe(1);
  });

  test("the three expected indexes exist", () => {
    runIndexedSchemaMigrations(db, 29);
    const indexes = db
      .query(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'tool_call_log' AND name NOT LIKE 'sqlite_%'",
      )
      .all() as Array<{ name: string }>;
    const names = indexes.map((i) => i.name).sort();
    expect(names).toEqual([
      "idx_tool_call_log_called_at",
      "idx_tool_call_log_session",
      "idx_tool_call_log_tool_time",
    ]);
  });

  test("pre-migration backup is written when backupOptions is provided", () => {
    // Step from V28 → V29 specifically. Run V0→V28 first WITHOUT backup so we
    // can assert ONLY the V29 backup lands.
    runIndexedSchemaMigrations(db, 28);
    expect(readIndexedUserVersion(db)).toBe(28);

    const backupDir = join(tmpDir, "backups");
    runIndexedSchemaMigrations(db, 29, { backupDir, dbPath });

    const entries = readdirSync(backupDir);
    const v29Backup = entries.find(
      (n) => n.startsWith("pre-migration-29-") && n.endsWith(".db.gz"),
    );
    expect(v29Backup).toBeDefined();
  });

  test("status CHECK constraint rejects values outside ('ok','error')", () => {
    runIndexedSchemaMigrations(db, 29);
    expect(() =>
      db
        .query(
          "INSERT INTO tool_call_log (tool_id, service, called_at, duration_ms, result_envelope, status) VALUES ('t', 's', 0, 0, 'e', 'maybe')",
        )
        .run(),
    ).toThrow();
  });
});
```

- [ ] **Step 4.3: Run the migration test**

```bash
bun test packages/gateway/test/integration/index/migrations/migration-v29.test.ts
```

Expected: all 6 tests pass.

If a test fails complaining about `sqlite-vec`-related side effects (the runner calls `tryLoadSqliteVec(db)` for V5→V6), confirm `tryLoadSqliteVec` returns `false` cleanly when the extension isn't loadable in the test environment — this is the expected behaviour (`EMBEDDING_V6_NO_VEC_MIGRATION_SQL` runs instead). The V29 migration is independent of vec0.

- [ ] **Step 4.4: Commit the migration test**

```bash
git add packages/gateway/test/integration/index/migrations/migration-v29.test.ts
git commit -m "$(cat <<'EOF'
test(migrations): V29 tool_call_log integration test

End-to-end migration runner assertions:
- PRAGMA user_version reaches 29.
- _schema_migrations records V29 with the right description.
- All 8 expected columns present with the correct nullability
  (session_id nullable per spec §5.1; everything else NOT NULL).
- All 3 indexes (session, (tool_id, called_at), called_at) exist.
- Pre-migration backup is written to backupDir when backupOptions
  is supplied — exercises the existing writePreMigrationBackup path
  to confirm V29 doesn't bypass the rollback safety net.
- status CHECK constraint rejects values outside {'ok','error'}.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — TDD red: extend I11 enforcement test (3 new assertions)

**Files:**

- Modify: `packages/gateway/src/security-invariants.test.ts`

The existing I11 block (lines 168–185) has 3 assertions today. This task adds 3 more — one extension to the agent.ts test, and two new tests for mesh.ts and the helper module. After this commit:
- The `db/tool-call-log.ts` assertion passes (Task 3 already created the file).
- The `agent.ts` assertion fails (Task 7 wires it).
- The `mesh.ts` assertion fails (Task 9 wires it).

- [ ] **Step 5.1: Locate the existing I11 block**

```bash
grep -nE 'describe\("I11' packages/gateway/src/security-invariants.test.ts
```

Expected:

```
168:describe("I11 — Tool-result envelope on the LLM-facing path", () => {
```

- [ ] **Step 5.2: Edit the I11 block**

Open `packages/gateway/src/security-invariants.test.ts`. Replace the current `agent.ts` test (around line 181):

```ts
  test("agent.ts wraps tool results with the envelope on the LLM-facing path", async () => {
    const src = await read("packages/gateway/src/engine/agent.ts");
    expect(src).toMatch(/wrapToolOutput\(/);
  });
```

with:

```ts
  test("agent.ts both wraps with envelope AND writes tool_call_log on the LLM-facing path", async () => {
    const src = await read("packages/gateway/src/engine/agent.ts");
    expect(src).toMatch(/wrapToolOutput\(/);
    expect(src).toMatch(/writeToolCallLog\(/);
  });

  test("mesh.ts:listTools both wraps with envelope AND writes tool_call_log", async () => {
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

The closing `});` of the I11 block stays where it is.

- [ ] **Step 5.3: Run the security-invariants test and verify the expected red/green split**

```bash
bun test packages/gateway/src/security-invariants.test.ts
```

Expected: I11 block reports **3 pass / 2 fail** (the 2 existing wrapToolOutput-only tests + the new db/tool-call-log assertion pass; agent.ts and mesh.ts new combined assertions fail because neither file imports `writeToolCallLog` yet).

If you see a different split (e.g., the db/tool-call-log assertion fails too), check that the file from Task 3 has the literal export keywords `export function writeToolCallLog` and `export function readToolCallLog` (NOT `export const X = function`).

- [ ] **Step 5.4: Commit the failing extension**

```bash
git add packages/gateway/src/security-invariants.test.ts
git commit -m "$(cat <<'EOF'
test(security-invariants): TDD red — I11 audit-write extension

Extends the existing I11 enforcement block with three assertions
that pin the audit complement to the envelope wrap:

- agent.ts (existing test extended): now asserts BOTH wrapToolOutput
  AND writeToolCallLog are present.
- mesh.ts:listTools (new test): same combined assertion.
- db/tool-call-log.ts (new test): exports both writeToolCallLog and
  readToolCallLog — pins the helper module's surface.

The db/tool-call-log assertion passes (Task 3 created the file).
The agent.ts and mesh.ts combined assertions fail intentionally —
Tasks 7 and 9 wire the audit-write at each site.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — TDD red: agent.ts wrapToolForLlm integration test

**Files:**

- Create: `packages/gateway/test/integration/engine/agent-tool-call-log.test.ts`

This test asserts the contract for the agent.ts wiring site. Fails until Task 7 lands the implementation.

- [ ] **Step 6.1: Create the test file**

Create `packages/gateway/test/integration/engine/agent-tool-call-log.test.ts` with:

```ts
import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";

import { agentRequestContext } from "../../../src/engine/agent-request-context.ts";
import { createNimbusEngineAgent } from "../../../src/engine/agent.ts";
import { readToolCallLog } from "../../../src/db/tool-call-log.ts";
import { TOOL_CALL_LOG_V29_SCHEMA_SQL } from "../../../src/index/tool-call-log-v29-sql.ts";
import type { LocalIndex } from "../../../src/index/local-index.ts";

function freshAuditDb(): Database {
  const db = new Database(":memory:");
  db.exec(TOOL_CALL_LOG_V29_SCHEMA_SQL);
  return db;
}

// Minimal LocalIndex stub — createNimbusEngineAgent uses it for searchLocalIndex
// metadata, not for the audit-write path. We only need the methods the
// constructor actually touches.
function stubLocalIndex(): LocalIndex {
  return {
    search: () => ({ rows: [], total: 0 }),
    fetchMore: () => ({ rows: [], total: 0 }),
    traverseGraph: () => ({ entities: [], relations: [] }),
    getDatabase: () => new Database(":memory:"),
  } as unknown as LocalIndex;
}

describe("agent.ts wrapToolForLlm — tool_call_log audit-write", () => {
  test("writes a tool_call_log row when the wrapped tool resolves", async () => {
    const auditDb = freshAuditDb();
    const { agent } = createNimbusEngineAgent({
      localIndex: stubLocalIndex(),
      agentModel: "openai/gpt-4o-mini",
      auditDb,
    });
    const tools = (await agent.listTools()) as Record<
      string,
      { execute?: (input: unknown, ctx?: unknown) => Promise<string> }
    >;
    // Pick searchLocalIndex — a deterministic tool whose execute returns
    // structured data. The wrapped execute should land an audit row.
    const searchExecute = tools["searchLocalIndex"]?.execute;
    expect(searchExecute).toBeDefined();
    if (searchExecute === undefined) throw new Error("unreachable");

    await agentRequestContext.run({ sessionId: "s-test-1" }, async () => {
      const out = await searchExecute({ name: "x", limit: 1 });
      expect(typeof out).toBe("string");
      expect(out).toContain("<tool_output");
    });

    const result = readToolCallLog(auditDb, {});
    expect(result.toolCalls).toHaveLength(1);
    const row = result.toolCalls[0];
    if (row === undefined) throw new Error("unreachable");
    expect(row.sessionId).toBe("s-test-1");
    expect(row.toolId).toBe("searchLocalIndex");
    expect(row.status).toBe("ok");
    expect(row.resultEnvelope).toContain("<tool_output");
  });

  test("writes a status='error' row when the wrapped tool throws (and re-throws)", async () => {
    const auditDb = freshAuditDb();
    // Use a localIndex whose `search` throws. createNimbusEngineAgent's
    // searchLocalIndex tool calls localIndex.search(query) — when search
    // throws, the wrapper catches, logs, and re-throws.
    const throwingIndex = {
      ...stubLocalIndex(),
      search: () => {
        throw new Error("simulated tool failure");
      },
    } as unknown as LocalIndex;
    const { agent } = createNimbusEngineAgent({
      localIndex: throwingIndex,
      agentModel: "openai/gpt-4o-mini",
      auditDb,
    });
    const tools = (await agent.listTools()) as Record<
      string,
      { execute?: (input: unknown, ctx?: unknown) => Promise<string> }
    >;
    const searchExecute = tools["searchLocalIndex"]?.execute;
    if (searchExecute === undefined) throw new Error("unreachable");

    await agentRequestContext.run({ sessionId: "s-test-err" }, async () => {
      await expect(searchExecute({ name: "x", limit: 1 })).rejects.toThrow(
        "simulated tool failure",
      );
    });

    const result = readToolCallLog(auditDb, {});
    expect(result.toolCalls).toHaveLength(1);
    const row = result.toolCalls[0];
    if (row === undefined) throw new Error("unreachable");
    expect(row.status).toBe("error");
    expect(row.sessionId).toBe("s-test-err");
    expect(row.resultEnvelope).toContain("simulated tool failure");
  });

  test("writes sessionId=null when no agentRequestContext.run is in scope", async () => {
    const auditDb = freshAuditDb();
    const { agent } = createNimbusEngineAgent({
      localIndex: stubLocalIndex(),
      agentModel: "openai/gpt-4o-mini",
      auditDb,
    });
    const tools = (await agent.listTools()) as Record<
      string,
      { execute?: (input: unknown, ctx?: unknown) => Promise<string> }
    >;
    const searchExecute = tools["searchLocalIndex"]?.execute;
    if (searchExecute === undefined) throw new Error("unreachable");
    // Call WITHOUT agentRequestContext.run — getAgentRequestSessionId returns undefined.
    await searchExecute({ name: "x", limit: 1 });

    const result = readToolCallLog(auditDb, {});
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]?.sessionId).toBeNull();
  });

  test("does not break the LLM-facing path when auditDb is undefined", async () => {
    // No auditDb passed in deps — wrapper degrades gracefully.
    const { agent } = createNimbusEngineAgent({
      localIndex: stubLocalIndex(),
      agentModel: "openai/gpt-4o-mini",
    });
    const tools = (await agent.listTools()) as Record<
      string,
      { execute?: (input: unknown, ctx?: unknown) => Promise<string> }
    >;
    const searchExecute = tools["searchLocalIndex"]?.execute;
    if (searchExecute === undefined) throw new Error("unreachable");
    const out = await searchExecute({ name: "x", limit: 1 });
    expect(typeof out).toBe("string");
    expect(out).toContain("<tool_output");
    // No assertion on the audit table because there's none.
  });
});
```

- [ ] **Step 6.2: Run the agent integration test and verify it fails (TDD red)**

```bash
bun test packages/gateway/test/integration/engine/agent-tool-call-log.test.ts
```

Expected: all 4 tests fail. The first three fail because `auditDb` is not in `NimbusEngineAgentDeps` (TypeScript will reject the property at compile time). The fourth test may compile but no row gets written since the wiring is absent.

If TypeScript errors block the test from running at all, that's still "red" — record the error message and proceed to Task 7.

- [ ] **Step 6.3: Commit the failing test**

```bash
git add packages/gateway/test/integration/engine/agent-tool-call-log.test.ts
git commit -m "$(cat <<'EOF'
test(engine): TDD red — agent.ts wrapToolForLlm tool_call_log integration

Asserts the contract for the agent.ts wiring site:

- Wrapped tool resolves → one tool_call_log row with status='ok',
  the correct sessionId from agentRequestContext.run, the correct
  toolId, and an envelope-shaped resultEnvelope.
- Wrapped tool throws → one tool_call_log row with status='error',
  envelope wraps the error message; the throw is re-raised so caller
  error handling stays byte-identical.
- No agentRequestContext.run in scope → sessionId column is NULL.
- auditDb undefined → wrapper degrades gracefully, returns the
  envelope, no audit table touched.

All 4 fail until Task 7 extends NimbusEngineAgentDeps + wraps the
existing wrapToolForLlm with the audit-write logic.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 — TDD green: wire writeToolCallLog at agent.ts

**Files:**

- Modify: `packages/gateway/src/engine/agent.ts`

- [ ] **Step 7.1: Add the new imports**

Open `packages/gateway/src/engine/agent.ts`. Below the existing imports (line 18 ends with `wrapToolOutput`), add:

```ts
import type { Database } from "bun:sqlite";

import { writeToolCallLog } from "../db/tool-call-log.ts";
import { getAgentRequestSessionId } from "./agent-request-context.ts";
```

There's already an import for `getAgentRequestSessionId` at line 12 — **do NOT duplicate**. Confirm with `grep -n getAgentRequestSessionId packages/gateway/src/engine/agent.ts`. If it exists, only add the `Database` and `writeToolCallLog` imports.

- [ ] **Step 7.2: Extend `NimbusEngineAgentDeps`**

Find the `export type NimbusEngineAgentDeps = { ... }` block (around line 64). Add the new optional field at the end, before the closing `};`:

```ts
  /** Database handle for tool_call_log audit writes (Phase 5 T6 PR 2). */
  auditDb?: Database;
```

The full block now reads:

```ts
export type NimbusEngineAgentDeps = {
  localIndex: LocalIndex;
  agentModel?: string;
  /** Defaults to {@link Config.engineContextWindowItems}. */
  contextWindowItems?: number;
  /** Defaults to {@link Config.searchServicePriorityMap}. */
  searchServicePriority?: ReadonlyMap<string, number>;
  /** When set, exposes recall/append session memory tools (requires `agent.invoke` sessionId). */
  sessionMemoryStore?: SessionMemoryStore;
  /** Database handle for tool_call_log audit writes (Phase 5 T6 PR 2). */
  auditDb?: Database;
};
```

- [ ] **Step 7.3: Rewrite `wrapToolForLlm` with the audit-write try/catch**

Replace the entire `wrapToolForLlm` function (lines 28–41) with:

```ts
/**
 * S8-F3 / chain C4 — wrap a tool definition so its execute returns a
 * `<tool_output>`-tagged string. The LLM is instructed by the system prompt
 * to treat envelope contents as data, never instructions.
 *
 * Phase 5 T6 PR 2 — when `auditDb` is supplied, also writes a `tool_call_log`
 * row capturing the envelope, duration, sessionId, and ok/error status.
 * Errors are logged then re-thrown so the existing LLM-facing error
 * handling path is unchanged.
 */
function wrapToolForLlm<T>(
  service: string,
  tool: string,
  toolDef: T,
  auditDb: Database | undefined,
): T {
  const td = toolDef as unknown as {
    execute?: (input: unknown, ctx?: unknown) => Promise<unknown>;
  };
  const original = td.execute;
  if (original === undefined) return toolDef;
  return {
    ...(toolDef as object),
    execute: async (input: unknown, ctx?: unknown): Promise<string> => {
      const sessionId = getAgentRequestSessionId() ?? null;
      const calledAt = Date.now();
      let raw: unknown;
      let status: "ok" | "error" = "ok";
      let envelope: string;
      try {
        raw = await original(input, ctx);
        envelope = wrapToolOutput({ service, tool }, raw);
      } catch (err) {
        status = "error";
        envelope = wrapToolOutput({ service, tool }, { error: String(err) });
        if (auditDb !== undefined) {
          writeToolCallLog(auditDb, {
            sessionId,
            toolId: tool,
            service,
            calledAt,
            durationMs: Date.now() - calledAt,
            resultEnvelope: envelope,
            status,
          });
        }
        throw err;
      }
      if (auditDb !== undefined) {
        writeToolCallLog(auditDb, {
          sessionId,
          toolId: tool,
          service,
          calledAt,
          durationMs: Date.now() - calledAt,
          resultEnvelope: envelope,
          status,
        });
      }
      return envelope;
    },
  } as unknown as T;
}
```

- [ ] **Step 7.4: Update every `wrapToolForLlm` caller to pass `deps.auditDb`**

Search for callers in `agent.ts`:

```bash
grep -n "wrapToolForLlm(" packages/gateway/src/engine/agent.ts
```

Expected: multiple `wrapToolForLlm("service", "tool", toolDef)` calls inside `createNimbusEngineAgent`. For EACH call site, add `deps.auditDb` as the fourth argument:

Before:
```ts
wrapToolForLlm("local", "searchLocalIndex", searchLocalIndex)
```

After:
```ts
wrapToolForLlm("local", "searchLocalIndex", searchLocalIndex, deps.auditDb)
```

Apply the same transform to **every** `wrapToolForLlm(` call in the file. None should be missed — TypeScript will fail the build if any caller still has the 3-arg signature.

- [ ] **Step 7.5: Typecheck**

```bash
bun run typecheck
```

Expected: exits 0. If a caller was missed, TypeScript reports `Expected 4 arguments, but got 3` at the offending line.

- [ ] **Step 7.6: Run the agent integration test (TDD green for Task 6)**

```bash
bun test packages/gateway/test/integration/engine/agent-tool-call-log.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 7.7: Run the security-invariants test — agent.ts I11 assertion now passes**

```bash
bun test packages/gateway/src/security-invariants.test.ts
```

Expected: I11 block reports **4 pass / 1 fail** (agent.ts now writes both, mesh.ts still missing — Task 9 closes it).

- [ ] **Step 7.8: Run the existing agent.ts unit tests — make sure no regression**

```bash
bun test packages/gateway/src/engine/agent.test.ts packages/gateway/src/engine/agent-audit-redaction.test.ts
```

Expected: green. The behaviour of `agent.listTools()` is unchanged from the LLM's perspective — tools still return envelope-wrapped strings; only the side-effect (audit-write) is added.

- [ ] **Step 7.9: Commit**

```bash
git add packages/gateway/src/engine/agent.ts
git commit -m "$(cat <<'EOF'
feat(engine): write tool_call_log at agent.ts wrapToolForLlm

Wires the audit-write at the first of two wrapToolOutput sites.

- NimbusEngineAgentDeps: new optional auditDb?: Database. Production
  wires it from platform.localIndex.getDatabase() in Task 10.
- wrapToolForLlm: new 4th param auditDb threaded through from
  createNimbusEngineAgent. Wraps the existing await + wrapToolOutput
  in try/catch; writes one tool_call_log row per invocation with
  sessionId from getAgentRequestSessionId(), wall-clock duration,
  the envelope (capped at 64 KiB inside writeToolCallLog), and
  status='ok' or 'error'. On error: logs first, then re-throws so
  upstream error handling is byte-identical.
- All wrapToolForLlm callers updated to pass deps.auditDb.

The Task 6 agent integration test passes. The I11 enforcement
agent.ts assertion goes green. Mesh.ts assertion still fails until
Task 9.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8 — TDD red: mesh.ts:listTools integration test

**Files:**

- Create: `packages/gateway/test/integration/connectors/lazy-mesh/mesh-tool-call-log.test.ts`

- [ ] **Step 8.1: Create the test file**

Create `packages/gateway/test/integration/connectors/lazy-mesh/mesh-tool-call-log.test.ts` with:

```ts
import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";

import { createLazyConnectorMesh } from "../../../../src/connectors/lazy-mesh/mesh.ts";
import { readToolCallLog } from "../../../../src/db/tool-call-log.ts";
import { TOOL_CALL_LOG_V29_SCHEMA_SQL } from "../../../../src/index/tool-call-log-v29-sql.ts";
import { agentRequestContext } from "../../../../src/engine/agent-request-context.ts";
import type { PlatformPaths } from "../../../../src/platform/paths.ts";
import { MockVault } from "../../../mocks/mock-vault.ts";

function freshAuditDb(): Database {
  const db = new Database(":memory:");
  db.exec(TOOL_CALL_LOG_V29_SCHEMA_SQL);
  return db;
}

function stubPaths(): PlatformPaths {
  return {
    socketPath: "/tmp/mock.sock",
    configDir: "/tmp/mock-config",
    dataDir: "/tmp/mock-data",
    logDir: "/tmp/mock-logs",
  } as unknown as PlatformPaths;
}

describe("mesh.ts:listTools — tool_call_log audit-write", () => {
  test("writes one tool_call_log row when a wrapped mesh tool resolves", async () => {
    const auditDb = freshAuditDb();
    const mesh = await createLazyConnectorMesh(stubPaths(), new MockVault(), {
      listUserMcpConnectors: () => [],
      auditDb,
    });

    // Inject a synthetic tool into the mesh's listTools output by stubbing
    // listToolsForDispatcher at the prototype level. listTools() wraps each
    // execute with the audit-write wrapper.
    const fakeKey = "github_repo_pr_list";
    const meshAny = mesh as unknown as {
      listToolsForDispatcher: () => Promise<
        Record<string, { execute?: (input: unknown, ctx?: unknown) => Promise<unknown> }>
      >;
    };
    const originalListToolsForDispatcher = meshAny.listToolsForDispatcher.bind(mesh);
    meshAny.listToolsForDispatcher = async () => ({
      [fakeKey]: { execute: async () => ({ prs: [{ id: 42 }] }) },
    });

    try {
      const tools = await mesh.listTools();
      const exec = tools[fakeKey]?.execute;
      expect(exec).toBeDefined();
      if (exec === undefined) throw new Error("unreachable");

      await agentRequestContext.run({ sessionId: "s-mesh-1" }, async () => {
        const out = await exec({});
        expect(typeof out).toBe("string");
        expect(out).toContain("<tool_output");
        expect(out).toContain('"prs":');
      });
    } finally {
      meshAny.listToolsForDispatcher = originalListToolsForDispatcher;
      await mesh.disconnect();
    }

    const result = readToolCallLog(auditDb, {});
    expect(result.toolCalls).toHaveLength(1);
    const row = result.toolCalls[0];
    if (row === undefined) throw new Error("unreachable");
    expect(row.sessionId).toBe("s-mesh-1");
    expect(row.toolId).toBe(fakeKey);
    // service is derived from key.split("_")[0] in mesh.ts:listTools
    expect(row.service).toBe("github");
    expect(row.status).toBe("ok");
  });

  test("writes status='error' when a wrapped mesh tool throws", async () => {
    const auditDb = freshAuditDb();
    const mesh = await createLazyConnectorMesh(stubPaths(), new MockVault(), {
      listUserMcpConnectors: () => [],
      auditDb,
    });
    const fakeKey = "slack_channel_post";
    const meshAny = mesh as unknown as {
      listToolsForDispatcher: () => Promise<
        Record<string, { execute?: (input: unknown, ctx?: unknown) => Promise<unknown> }>
      >;
    };
    const originalListToolsForDispatcher = meshAny.listToolsForDispatcher.bind(mesh);
    meshAny.listToolsForDispatcher = async () => ({
      [fakeKey]: {
        execute: async () => {
          throw new Error("rate limit exceeded");
        },
      },
    });

    try {
      const tools = await mesh.listTools();
      const exec = tools[fakeKey]?.execute;
      if (exec === undefined) throw new Error("unreachable");
      await agentRequestContext.run({ sessionId: "s-mesh-err" }, async () => {
        await expect(exec({})).rejects.toThrow("rate limit exceeded");
      });
    } finally {
      meshAny.listToolsForDispatcher = originalListToolsForDispatcher;
      await mesh.disconnect();
    }

    const result = readToolCallLog(auditDb, {});
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]?.status).toBe("error");
    expect(result.toolCalls[0]?.service).toBe("slack");
    expect(result.toolCalls[0]?.resultEnvelope).toContain("rate limit exceeded");
  });
});
```

If `MockVault` does not exist at `packages/gateway/test/mocks/mock-vault.ts`, locate the equivalent in the existing test surface:

```bash
grep -rln "class MockVault" packages/gateway/test packages/gateway/src 2>&1 | head -3
```

Use the path that exists. If multiple paths exist, prefer the one already used by other integration tests in `packages/gateway/test/integration/`.

- [ ] **Step 8.2: Run the test and verify it fails (TDD red)**

```bash
bun test packages/gateway/test/integration/connectors/lazy-mesh/mesh-tool-call-log.test.ts
```

Expected: both tests fail. TypeScript may reject `auditDb` as not-a-property of the mesh's options type — that's the "red" signal.

- [ ] **Step 8.3: Commit the failing test**

```bash
git add packages/gateway/test/integration/connectors/lazy-mesh/mesh-tool-call-log.test.ts
git commit -m "$(cat <<'EOF'
test(connectors): TDD red — mesh.ts listTools tool_call_log integration

Asserts the contract for the second wrapToolOutput wiring site:

- Wrapped mesh tool resolves → one tool_call_log row with the correct
  service (extracted from the mesh's key.split("_")[0] rule), the
  sessionId from agentRequestContext.run, status='ok', and an
  envelope-shaped resultEnvelope.
- Wrapped mesh tool throws → status='error' row, envelope wraps the
  error message, the throw is re-raised.

Both fail until Task 9 extends LazyConnectorMesh's constructor with
auditDb and wires the audit-write inside listTools.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9 — TDD green: wire writeToolCallLog at mesh.ts:listTools

**Files:**

- Modify: `packages/gateway/src/connectors/lazy-mesh/mesh.ts`

- [ ] **Step 9.1: Add the new imports**

Open `packages/gateway/src/connectors/lazy-mesh/mesh.ts`. Below the existing import for `wrapToolOutput` (line 3), add:

```ts
import { writeToolCallLog } from "../../db/tool-call-log.ts";
import { getAgentRequestSessionId } from "../../engine/agent-request-context.ts";
```

The existing `import("bun:sqlite").Database` inline-import (used for `healthDb`) covers the new `auditDb` field too — no new top-level `Database` import is needed.

- [ ] **Step 9.2: Extend the constructor options + private field**

Find the constructor signature (line 50–67) and add the `auditDb` field. The full constructor block becomes:

```ts
  constructor(
    paths: PlatformPaths,
    private readonly vault: NimbusVault,
    options?: {
      inactivityMs?: number;
      listUserMcpConnectors?: () => readonly UserMcpConnectorRow[];
      /** S8-F9 — when supplied, args_json parse failures call transitionHealth. */
      healthDb?: import("bun:sqlite").Database;
      /** S8-F9 — when supplied, args_json parse failures emit a warn line. */
      logger?: MeshLogger;
      /** Phase 5 T6 PR 2 — when supplied, listTools' wrapped execute writes tool_call_log rows. */
      auditDb?: import("bun:sqlite").Database;
      /**
       * Wave A PR 2 — absolute paths of `[[filesystem.roots]]` discovered at
       * gateway boot. Threaded into `MeshSpawnContext.obsidianVaultPaths`
       * for `ensureObsidianMcp`. Empty/undefined → obsidian MCP not started.
       */
      obsidianVaultPaths?: readonly string[];
    },
  ) {
```

In the existing private fields block (around line 43–48), add the new field next to `healthDb`:

```ts
  /** S8-F9 — optional db + logger so args_json failures can transition health and log. */
  private readonly healthDb: import("bun:sqlite").Database | undefined;
  /** Phase 5 T6 PR 2 — when supplied, listTools' wrapped execute writes tool_call_log rows. */
  private readonly auditDb: import("bun:sqlite").Database | undefined;
  private readonly logger: MeshLogger | undefined;
```

In the constructor body (line 68–71), add the field assignment next to the `healthDb` one:

```ts
    this.inactivityMs = options?.inactivityMs ?? 300_000;
    this.listUserMcpConnectors = options?.listUserMcpConnectors ?? (() => []);
    this.healthDb = options?.healthDb;
    this.auditDb = options?.auditDb;
    this.logger = options?.logger;
```

- [ ] **Step 9.3: Extend the `createLazyConnectorMesh` factory options**

Find the factory function (line 428–440) and add `auditDb` to its options:

```ts
export async function createLazyConnectorMesh(
  paths: PlatformPaths,
  vault: NimbusVault,
  options?: {
    inactivityMs?: number;
    listUserMcpConnectors?: () => readonly UserMcpConnectorRow[];
    healthDb?: import("bun:sqlite").Database;
    auditDb?: import("bun:sqlite").Database;
    logger?: MeshLogger;
    obsidianVaultPaths?: readonly string[];
  },
): Promise<LazyConnectorMesh> {
  return new LazyConnectorMesh(paths, vault, options);
}
```

- [ ] **Step 9.4: Rewrite the `listTools` wrapper with the audit-write try/catch**

Find the `listTools` method (lines 396–414). Replace the inner `for` loop with the audit-aware shape:

```ts
  async listTools(): Promise<
    Record<string, { execute?: (input: unknown, context?: unknown) => Promise<unknown> }>
  > {
    const merged = await this.listToolsForDispatcher();
    const auditDb = this.auditDb;
    for (const key of Object.keys(merged)) {
      const value = merged[key];
      if (value === undefined) continue;
      const inner = value.execute;
      if (inner === undefined) continue;
      const service = key.split("_")[0] ?? "mcp";
      merged[key] = {
        execute: async (input: unknown, ctx?: unknown): Promise<string> => {
          const sessionId = getAgentRequestSessionId() ?? null;
          const calledAt = Date.now();
          let raw: unknown;
          let status: "ok" | "error" = "ok";
          let envelope: string;
          try {
            raw = await inner(input, ctx);
            envelope = wrapToolOutput({ service, tool: key }, raw);
          } catch (err) {
            status = "error";
            envelope = wrapToolOutput({ service, tool: key }, { error: String(err) });
            if (auditDb !== undefined) {
              writeToolCallLog(auditDb, {
                sessionId,
                toolId: key,
                service,
                calledAt,
                durationMs: Date.now() - calledAt,
                resultEnvelope: envelope,
                status,
              });
            }
            throw err;
          }
          if (auditDb !== undefined) {
            writeToolCallLog(auditDb, {
              sessionId,
              toolId: key,
              service,
              calledAt,
              durationMs: Date.now() - calledAt,
              resultEnvelope: envelope,
              status,
            });
          }
          return envelope;
        },
      };
    }
    return merged;
  }
```

- [ ] **Step 9.5: Typecheck**

```bash
bun run typecheck
```

Expected: exits 0.

- [ ] **Step 9.6: Run the mesh integration test (TDD green for Task 8)**

```bash
bun test packages/gateway/test/integration/connectors/lazy-mesh/mesh-tool-call-log.test.ts
```

Expected: both tests pass.

- [ ] **Step 9.7: Run security-invariants — all 5 I11 assertions now pass**

```bash
bun test packages/gateway/src/security-invariants.test.ts
```

Expected: all green. I11 block: 5 pass.

- [ ] **Step 9.8: Run the existing mesh tests — make sure no regression**

```bash
bun test packages/gateway/src/connectors/lazy-mesh/
```

Expected: green. Tools still return envelope-wrapped strings; only the side-effect is added.

- [ ] **Step 9.9: Commit**

```bash
git add packages/gateway/src/connectors/lazy-mesh/mesh.ts
git commit -m "$(cat <<'EOF'
feat(connectors): write tool_call_log at mesh.ts:listTools

Wires the audit-write at the second of two wrapToolOutput sites.

- LazyConnectorMesh constructor + createLazyConnectorMesh factory:
  new optional auditDb? (mirrors the existing healthDb? pattern).
  Production wires it from db in Task 10.
- listTools' inner per-key wrapper: now wraps the await +
  wrapToolOutput in try/catch; writes one tool_call_log row per
  invocation with sessionId from getAgentRequestSessionId(),
  wall-clock duration, the envelope, and status='ok' or 'error'.
  On error: logs first, then re-throws so upstream error handling
  is byte-identical.
- service is derived from key.split("_")[0] (existing rule).

The Task 8 mesh integration test passes. All 5 I11 enforcement
assertions go green (agent.ts and mesh.ts both wrap+log; helper
module exports both functions).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10 — Wire production `auditDb` at gateway startup

**Files:**

- Modify: `packages/gateway/src/index.ts`
- Modify: `packages/gateway/src/platform/assemble.ts`

Both wiring sites use the SAME database handle (`platform.localIndex.getDatabase()` ↔ `db` in `assemble.ts`). The two sites are intentionally separate calls because the agent and mesh are constructed in different files at different lifecycle stages.

- [ ] **Step 10.1: Wire `auditDb` for the agent (in `index.ts`)**

Open `packages/gateway/src/index.ts`. Find the `createNimbusEngineAgent({...})` call (line 35). Replace with:

```ts
  const engine = createNimbusEngineAgent({
    localIndex: platform.localIndex,
    auditDb: platform.localIndex.getDatabase(),
    ...(platform.sessionMemoryStore === undefined
      ? {}
      : { sessionMemoryStore: platform.sessionMemoryStore }),
  });
```

The `auditDb` line goes right after `localIndex`. The `sessionMemoryStore` spread stays at the end so its conditional shape is preserved.

- [ ] **Step 10.2: Wire `auditDb` for the mesh (in `assemble.ts`)**

Open `packages/gateway/src/platform/assemble.ts`. Find the `createLazyConnectorMesh(...)` call (line 259). Replace with:

```ts
  const connectorMesh = await createLazyConnectorMesh(paths, vault, {
    listUserMcpConnectors: () => listUserMcpConnectors(db),
    // S8-F9 — pass db + logger so args_json failures surface as
    // persistent_error in connector health and a warn log line.
    healthDb: db,
    // Phase 5 T6 PR 2 — same db handle used for tool_call_log audit writes
    // from listTools' wrapped execute path. Two distinct field names so
    // the two concerns stay readable.
    auditDb: db,
    logger: syncLogger,
    // Wave A PR 2 — thread the absolute filesystem-root paths so the
    // obsidian MCP child can discover `.obsidian/` markers itself.
    obsidianVaultPaths: fsV2Roots.map((r) => r.path),
  });
```

- [ ] **Step 10.3: Typecheck**

```bash
bun run typecheck
```

Expected: exits 0.

- [ ] **Step 10.4: Run the engine + mesh integration tests against production wiring**

```bash
bun test packages/gateway/test/integration/engine/agent-tool-call-log.test.ts \
         packages/gateway/test/integration/connectors/lazy-mesh/mesh-tool-call-log.test.ts
```

Expected: still green. (Tasks 6 and 8 already exercised the wiring with explicitly-supplied `auditDb`; this task just wires production to do the same.)

- [ ] **Step 10.5: Commit**

```bash
git add packages/gateway/src/index.ts packages/gateway/src/platform/assemble.ts
git commit -m "$(cat <<'EOF'
feat(platform): wire localIndex.db to agent + mesh as auditDb

Production wiring for Phase 5 T6 PR 2's tool_call_log audit-write.

- index.ts: createNimbusEngineAgent({ ..., auditDb: platform.localIndex.getDatabase() }).
- assemble.ts: createLazyConnectorMesh(..., { ..., auditDb: db }).

Both sites use the SAME db handle. The two distinct field names
(auditDb vs healthDb) keep the concerns readable for future readers.
auditDb is optional in both call sites' types — when unset (e.g. unit
tests), the wrappers degrade to today's behaviour silently.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11 — TDD red: audit-rpc.ts handler unit tests

**Files:**

- Create: `packages/gateway/src/ipc/audit-toolcalls-rpc.test.ts`

Existing `audit-rpc.ts` has no test file dedicated to its `audit.toolCalls` branch (Task 12 adds the branch). This test pins the IPC contract for the new method.

- [ ] **Step 11.1: Create the test file**

Create `packages/gateway/src/ipc/audit-toolcalls-rpc.test.ts` with:

```ts
import { Database } from "bun:sqlite";
import { beforeEach, describe, expect, test } from "bun:test";

import { writeToolCallLog } from "../db/tool-call-log.ts";
import { TOOL_CALL_LOG_V29_SCHEMA_SQL } from "../index/tool-call-log-v29-sql.ts";
import type { LocalIndex } from "../index/local-index.ts";
import { AuditRpcError, dispatchAuditRpc } from "./audit-rpc.ts";

function indexCtxFromDb(db: Database): { index: LocalIndex } {
  return {
    index: { getDatabase: () => db } as unknown as LocalIndex,
  };
}

function freshDb(): Database {
  const db = new Database(":memory:");
  db.exec(TOOL_CALL_LOG_V29_SCHEMA_SQL);
  return db;
}

describe("audit.toolCalls dispatcher branch", () => {
  let db: Database;
  beforeEach(() => {
    db = freshDb();
  });

  test("returns hit envelope with empty result on empty table", async () => {
    const out = await dispatchAuditRpc("audit.toolCalls", {}, indexCtxFromDb(db));
    expect(out.kind).toBe("hit");
    if (out.kind !== "hit") throw new Error("unreachable");
    const value = out.value as {
      toolCalls: unknown[];
      hasMore: boolean;
      nextCursor: unknown;
    };
    expect(value.toolCalls).toHaveLength(0);
    expect(value.hasMore).toBe(false);
    expect(value.nextCursor).toBeNull();
  });

  test("misses on other audit methods (e.g. audit.foo)", async () => {
    const out = await dispatchAuditRpc("audit.foo", {}, indexCtxFromDb(db));
    expect(out.kind).toBe("miss");
  });

  test("rejects null params with -32602", async () => {
    await expect(dispatchAuditRpc("audit.toolCalls", null, indexCtxFromDb(db))).rejects.toThrow(
      AuditRpcError,
    );
  });

  test("rejects array params with -32602", async () => {
    await expect(dispatchAuditRpc("audit.toolCalls", [], indexCtxFromDb(db))).rejects.toThrow(
      AuditRpcError,
    );
  });

  test("rejects non-string sessionId", async () => {
    await expect(
      dispatchAuditRpc("audit.toolCalls", { sessionId: 42 }, indexCtxFromDb(db)),
    ).rejects.toThrow(AuditRpcError);
  });

  test("rejects non-integer limit", async () => {
    await expect(
      dispatchAuditRpc("audit.toolCalls", { limit: 1.5 }, indexCtxFromDb(db)),
    ).rejects.toThrow(AuditRpcError);
  });

  test("rejects limit < 1 and limit > 1000", async () => {
    await expect(
      dispatchAuditRpc("audit.toolCalls", { limit: 0 }, indexCtxFromDb(db)),
    ).rejects.toThrow(AuditRpcError);
    await expect(
      dispatchAuditRpc("audit.toolCalls", { limit: 1_001 }, indexCtxFromDb(db)),
    ).rejects.toThrow(AuditRpcError);
  });

  test("rejects status not in {'ok','error'}", async () => {
    await expect(
      dispatchAuditRpc("audit.toolCalls", { status: "maybe" }, indexCtxFromDb(db)),
    ).rejects.toThrow(AuditRpcError);
  });

  test("rejects until < since", async () => {
    await expect(
      dispatchAuditRpc("audit.toolCalls", { since: 200, until: 100 }, indexCtxFromDb(db)),
    ).rejects.toThrow(AuditRpcError);
  });

  test("rejects malformed cursor (missing fields, non-integer, negative)", async () => {
    for (const bad of [
      { cursor: {} },
      { cursor: { calledAt: 1 } },
      { cursor: { calledAt: 1, id: 1.5 } },
      { cursor: { calledAt: -1, id: 1 } },
      { cursor: { calledAt: 1, id: -1 } },
      { cursor: "string" },
    ]) {
      await expect(
        dispatchAuditRpc("audit.toolCalls", bad, indexCtxFromDb(db)),
      ).rejects.toThrow(AuditRpcError);
    }
  });

  test("default limit is 100", async () => {
    for (let i = 0; i < 200; i++) {
      writeToolCallLog(db, {
        sessionId: "s",
        toolId: "t",
        service: "x",
        calledAt: i,
        durationMs: 0,
        resultEnvelope: '<tool_output service="x" tool="t">[]</tool_output>',
        status: "ok",
      });
    }
    const out = await dispatchAuditRpc("audit.toolCalls", {}, indexCtxFromDb(db));
    if (out.kind !== "hit") throw new Error("unreachable");
    const value = out.value as { toolCalls: unknown[]; hasMore: boolean };
    expect(value.toolCalls).toHaveLength(100);
    expect(value.hasMore).toBe(true);
  });

  test("nextCursor is composite (calledAt, id) of the LAST row when hasMore=true", async () => {
    for (let i = 0; i < 5; i++) {
      writeToolCallLog(db, {
        sessionId: "s",
        toolId: "t",
        service: "x",
        calledAt: i * 100,
        durationMs: 0,
        resultEnvelope: '<tool_output service="x" tool="t">[]</tool_output>',
        status: "ok",
      });
    }
    const out = await dispatchAuditRpc("audit.toolCalls", { limit: 3 }, indexCtxFromDb(db));
    if (out.kind !== "hit") throw new Error("unreachable");
    const value = out.value as {
      toolCalls: Array<{ calledAt: number; id: number }>;
      hasMore: boolean;
      nextCursor: { calledAt: number; id: number } | null;
    };
    expect(value.hasMore).toBe(true);
    expect(value.nextCursor).not.toBeNull();
    if (value.nextCursor === null) throw new Error("unreachable");
    const last = value.toolCalls[value.toolCalls.length - 1];
    if (last === undefined) throw new Error("unreachable");
    expect(value.nextCursor.calledAt).toBe(last.calledAt);
    expect(value.nextCursor.id).toBe(last.id);
  });

  test("cursor passed back from previous nextCursor advances correctly", async () => {
    for (let i = 0; i < 5; i++) {
      writeToolCallLog(db, {
        sessionId: "s",
        toolId: "t",
        service: "x",
        calledAt: i * 100,
        durationMs: 0,
        resultEnvelope: '<tool_output service="x" tool="t">[]</tool_output>',
        status: "ok",
      });
    }
    const page1 = await dispatchAuditRpc(
      "audit.toolCalls",
      { limit: 3 },
      indexCtxFromDb(db),
    );
    if (page1.kind !== "hit") throw new Error("unreachable");
    const v1 = page1.value as {
      hasMore: boolean;
      nextCursor: { calledAt: number; id: number } | null;
    };
    expect(v1.hasMore).toBe(true);
    if (v1.nextCursor === null) throw new Error("unreachable");
    const page2 = await dispatchAuditRpc(
      "audit.toolCalls",
      { limit: 3, cursor: v1.nextCursor },
      indexCtxFromDb(db),
    );
    if (page2.kind !== "hit") throw new Error("unreachable");
    const v2 = page2.value as {
      toolCalls: Array<{ calledAt: number }>;
      hasMore: boolean;
      nextCursor: unknown;
    };
    expect(v2.toolCalls).toHaveLength(2);
    expect(v2.hasMore).toBe(false);
    expect(v2.nextCursor).toBeNull();
  });

  test("sessionId='' filter returns ONLY rows with NULL session_id", async () => {
    writeToolCallLog(db, {
      sessionId: null,
      toolId: "t",
      service: "x",
      calledAt: 100,
      durationMs: 0,
      resultEnvelope: '<tool_output service="x" tool="t">[]</tool_output>',
      status: "ok",
    });
    writeToolCallLog(db, {
      sessionId: "s-1",
      toolId: "t",
      service: "x",
      calledAt: 200,
      durationMs: 0,
      resultEnvelope: '<tool_output service="x" tool="t">[]</tool_output>',
      status: "ok",
    });
    const out = await dispatchAuditRpc(
      "audit.toolCalls",
      { sessionId: "" },
      indexCtxFromDb(db),
    );
    if (out.kind !== "hit") throw new Error("unreachable");
    const value = out.value as { toolCalls: Array<{ sessionId: string | null }> };
    expect(value.toolCalls).toHaveLength(1);
    expect(value.toolCalls[0]?.sessionId).toBeNull();
  });
});
```

- [ ] **Step 11.2: Run the test and verify it fails (TDD red)**

```bash
bun test packages/gateway/src/ipc/audit-toolcalls-rpc.test.ts
```

Expected: most tests fail because `dispatchAuditRpc` returns `{ kind: "miss" }` for `audit.toolCalls` today. The "misses on other audit methods" test passes (it's the only one that asserts a miss).

- [ ] **Step 11.3: Commit the failing tests**

```bash
git add packages/gateway/src/ipc/audit-toolcalls-rpc.test.ts
git commit -m "$(cat <<'EOF'
test(ipc): TDD red — audit.toolCalls handler unit tests

Pins the IPC contract for the new audit.toolCalls dispatcher branch:

- Empty-table envelope shape (hasMore=false, nextCursor=null).
- Miss on other audit methods (kind: 'miss').
- Param validation (-32602): null params, array params, non-string
  sessionId, non-integer limit, limit < 1, limit > 1000, invalid
  status, until < since, malformed cursor (5 shapes).
- Default limit = 100; hasMore=true when table has more.
- nextCursor is the composite (calledAt, id) of the LAST row.
- cursor round-trip: page1.nextCursor → page2.cursor advances
  through the rows.
- sessionId='' sentinel filter returns NULL-session rows only.

All but one fail until Task 12 lands the audit.toolCalls branch in
dispatchAuditRpc and threads the new method through dispatchers.ts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12 — TDD green: extend audit-rpc.ts + dispatchers.ts to add audit.toolCalls

**Files:**

- Modify: `packages/gateway/src/ipc/audit-rpc.ts`
- Modify: `packages/gateway/src/ipc/server/dispatchers.ts`

- [ ] **Step 12.1: Extend `audit-rpc.ts` with the `audit.toolCalls` branch**

Open `packages/gateway/src/ipc/audit-rpc.ts`. Add the new import at the top (after the existing imports):

```ts
import {
  type ToolCallLogFilter,
  type ToolCallLogReadResult,
  readToolCallLog,
} from "../db/tool-call-log.ts";
```

Add the param-parser helper before `dispatchAuditRpc`:

```ts
function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}

function parseAuditToolCallsParams(params: unknown): ToolCallLogFilter {
  const p = asRecord(params);
  if (p === undefined) {
    throw new AuditRpcError(-32602, "audit.toolCalls requires an object payload");
  }
  const out: ToolCallLogFilter = {};

  if (p["since"] !== undefined) {
    if (typeof p["since"] !== "number" || !Number.isInteger(p["since"])) {
      throw new AuditRpcError(-32602, "audit.toolCalls: since must be an integer");
    }
    out.since = p["since"];
  }
  if (p["until"] !== undefined) {
    if (typeof p["until"] !== "number" || !Number.isInteger(p["until"])) {
      throw new AuditRpcError(-32602, "audit.toolCalls: until must be an integer");
    }
    out.until = p["until"];
  }
  if (out.since !== undefined && out.until !== undefined && out.until < out.since) {
    throw new AuditRpcError(-32602, "audit.toolCalls: until must be >= since");
  }
  if (p["limit"] !== undefined) {
    const lim = p["limit"];
    if (typeof lim !== "number" || !Number.isInteger(lim) || lim < 1 || lim > 1_000) {
      throw new AuditRpcError(-32602, "audit.toolCalls: limit must be an integer in 1..1000");
    }
    out.limit = lim;
  }
  if (p["sessionId"] !== undefined) {
    if (typeof p["sessionId"] !== "string") {
      throw new AuditRpcError(-32602, "audit.toolCalls: sessionId must be a string");
    }
    out.sessionId = p["sessionId"];
  }
  if (p["toolId"] !== undefined) {
    if (typeof p["toolId"] !== "string") {
      throw new AuditRpcError(-32602, "audit.toolCalls: toolId must be a string");
    }
    out.toolId = p["toolId"];
  }
  if (p["status"] !== undefined) {
    if (p["status"] !== "ok" && p["status"] !== "error") {
      throw new AuditRpcError(-32602, "audit.toolCalls: status must be 'ok' or 'error'");
    }
    out.status = p["status"];
  }
  if (p["cursor"] !== undefined) {
    const c = asRecord(p["cursor"]);
    if (c === undefined) {
      throw new AuditRpcError(-32602, "audit.toolCalls: cursor must be an object");
    }
    const calledAt = c["calledAt"];
    const id = c["id"];
    if (
      typeof calledAt !== "number" ||
      !Number.isInteger(calledAt) ||
      calledAt < 0 ||
      typeof id !== "number" ||
      !Number.isInteger(id) ||
      id < 0
    ) {
      throw new AuditRpcError(
        -32602,
        "audit.toolCalls: cursor must be { calledAt: int>=0, id: int>=0 }",
      );
    }
    out.cursor = { calledAt, id };
  }
  return out;
}
```

Inside `dispatchAuditRpc`, add the new branch immediately before the final `return { kind: "miss" };`:

```ts
  if (method === "audit.toolCalls") {
    const idx = ensureIndex(ctx);
    const filter = parseAuditToolCallsParams(params);
    const value: ToolCallLogReadResult = readToolCallLog(idx.getDatabase(), filter);
    return { kind: "hit", value };
  }
  return { kind: "miss" };
```

- [ ] **Step 12.2: Extend `dispatchers.ts` filter to forward `audit.toolCalls`**

Open `packages/gateway/src/ipc/server/dispatchers.ts`. Find `tryDispatchAuditRpc` (line 158). Extend the filter on line 163:

Before:
```ts
  if (method !== "audit.verify" && method !== "audit.exportAll") return phase4RpcSkipped;
```

After:
```ts
  if (
    method !== "audit.verify" &&
    method !== "audit.exportAll" &&
    method !== "audit.toolCalls"
  ) {
    return phase4RpcSkipped;
  }
```

No other changes needed in this file — `dispatchAuditRpc` is already imported (line 7) and called with `{ index: ctx.options.localIndex }` (line 165). The new branch derives db internally via `idx.getDatabase()` so the existing context shape works.

- [ ] **Step 12.3: Typecheck**

```bash
bun run typecheck
```

Expected: exits 0.

- [ ] **Step 12.4: Run the audit RPC tests (TDD green for Task 11)**

```bash
bun test packages/gateway/src/ipc/audit-toolcalls-rpc.test.ts
```

Expected: all tests pass.

- [ ] **Step 12.5: Run the existing audit-rpc consumers — make sure no regression**

```bash
grep -rl "dispatchAuditRpc\|audit.verify\|audit.exportAll" packages/gateway/src packages/gateway/test 2>&1 | head -20
```

If existing tests cover `audit.verify` / `audit.exportAll`, run them:

```bash
bun test packages/gateway/src/ipc/audit-rpc.test.ts 2>/dev/null || true
bun test packages/gateway/test 2>&1 | tail -20
```

Expected: no regression in `audit.verify` / `audit.exportAll` callers. The new `audit.toolCalls` branch is additive.

- [ ] **Step 12.6: Commit**

```bash
git add packages/gateway/src/ipc/audit-rpc.ts packages/gateway/src/ipc/server/dispatchers.ts
git commit -m "$(cat <<'EOF'
feat(ipc): audit.toolCalls JSON-RPC handler

Extends the existing audit-rpc.ts (was 4 methods: audit.verify /
audit.exportAll / audit.export / audit.getSummary) with a fifth
audit.toolCalls branch backed by the Phase 5 T6 PR 2 helpers.

- audit-rpc.ts: new parseAuditToolCallsParams() validates the
  request envelope per spec §6.3 (-32602 on null/array params,
  non-integer/out-of-range limit, until<since, invalid status,
  malformed cursor). New audit.toolCalls branch derives db via
  idx.getDatabase() and calls readToolCallLog.
- server/dispatchers.ts: filter on line 163 extended to also
  forward audit.toolCalls. No context-shape change — the
  existing { index: ctx.options.localIndex } wiring covers it.

Posture stays IPC-only:
- audit.* remains in FORBIDDEN_OVER_LAN (invariant I5 — unchanged).
- audit.* is NOT in Tauri ALLOWED_METHODS (invariant I7 — unchanged).
- audit.toolCalls is NOT exposed via http-server.ts read-only HTTP
  routes (same exfiltration-class posture as vault.*).

The Task 11 audit-rpc tests pass.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13 — Update docs (SECURITY-INVARIANTS.md, architecture.md, nimbus-file-map.md, roadmap.md)

**Files:**

- Modify: `docs/SECURITY-INVARIANTS.md`
- Modify: `docs/architecture.md`
- Modify: `.claude/commands/nimbus-file-map.md`
- Modify: `docs/roadmap.md`

- [ ] **Step 13.1: Extend `docs/SECURITY-INVARIANTS.md` I11 row**

```bash
grep -nE '^## I11' docs/SECURITY-INVARIANTS.md
```

Find the I11 section (currently around line 135). Find the line:

```
**Wired at:** the agent's tool wrapper in `packages/gateway/src/engine/agent.ts`. The planner-side `ConnectorDispatcher` returns the bare result on its own path (gated by HITL); the envelope is applied at the LLM-facing boundary only.
```

Replace with:

```
**Wired at:** the agent's tool wrapper in `packages/gateway/src/engine/agent.ts` and the lazy-mesh tool wrapper in `packages/gateway/src/connectors/lazy-mesh/mesh.ts:listTools`. Both sites also write a `tool_call_log` row via `packages/gateway/src/db/tool-call-log.ts` `writeToolCallLog` immediately after wrapping (Phase 5 T6 PR 2 — audit complement to the envelope). The planner-side `ConnectorDispatcher` returns the bare result on its own path (gated by HITL); the envelope and audit-write are applied at the LLM-facing boundary only.
```

Also find the "**Anti-pattern:**" line and extend it:

```
**Anti-pattern:** building a new agent surface that calls a tool and feeds the raw result to the LLM, OR wiring `wrapToolOutput` without also calling `writeToolCallLog` at the same site. S8-F3 / chain C4 documented exactly the first variant (no envelope present despite the doc claim) — the prompt-injection defense was a soft barrier (LLM-SDK message typing) only. The second variant (envelope without audit) silently regresses post-incident forensics — the I11 enforcement test now pins both calls at both wiring sites.
```

- [ ] **Step 13.2: Add `tool_call_log` to the architecture schema reference**

```bash
grep -nE 'Local Database Schema|tool_call_log' docs/architecture.md | head -10
```

Find the "Local Database Schema" section. Find the row for the most-recent table (`deployment_items` from V28). Below it, add a new row:

```markdown
| `tool_call_log` (V29, T6 PR 2) | `id INTEGER PK AUTOINCREMENT`, `session_id TEXT` (nullable), `tool_id TEXT NOT NULL`, `service TEXT NOT NULL`, `called_at INTEGER NOT NULL`, `duration_ms INTEGER NOT NULL`, `result_envelope TEXT NOT NULL` (capped at 64 KiB), `status TEXT NOT NULL CHECK ('ok','error')`. Indexes: `(session_id)`, `(tool_id, called_at)`, `(called_at)`. One row per LLM-facing MCP-tool call written from `engine/agent.ts:wrapToolForLlm` and `connectors/lazy-mesh/mesh.ts:listTools`; queried via `audit.toolCalls` IPC method (IPC-only — not LAN, not Tauri). Audit complement to invariant I11. |
```

The exact column structure of the existing schema reference may differ. Adjust to match (e.g., if it uses `Table | Owner | Description` format, restructure accordingly). Keep the new row brief enough that it's parseable in a glance.

- [ ] **Step 13.3: Add file-map rows**

Open `.claude/commands/nimbus-file-map.md`. Find the "Local Index + Migrations + DB" section. Add two rows next to the migration constants entry:

```markdown
| `packages/gateway/src/db/tool-call-log.ts` | `writeToolCallLog` / `readToolCallLog` for the LLM-facing tool-call audit table (T6 PR 2); internal try/catch swallows DiskFullError so the LLM-facing path is never broken |
| `packages/gateway/src/index/tool-call-log-v29-sql.ts` | V29 schema constant — `tool_call_log` table + 3 indexes |
```

Find the "IPC" section. Find the existing row for `ipc/audit-rpc.ts` (or add it if missing). Update / add to mention `audit.toolCalls`:

```markdown
| `packages/gateway/src/ipc/audit-rpc.ts` | `dispatchAuditRpc` — `audit.verify` / `audit.exportAll` / `audit.export` / `audit.getSummary` / `audit.toolCalls` (T6 PR 2); IPC-only (forbidden over LAN per `I5`, not in Tauri allowlist per `I7`, not on read-only HTTP API) |
```

- [ ] **Step 13.4: Flip the T6 PR 2 roadmap checkbox + add follow-up bullet**

Open `docs/roadmap.md`. Find the T6 PR 2 sub-checkbox under T6:

```bash
grep -nE 'PR 2.*tool_call_log|tool_call_log.*PR 2' docs/roadmap.md
```

If the checkbox is currently `- [ ] PR 2 — tool_call_log audit table (V29)`, change to:

```markdown
- [x] PR 2 — `tool_call_log` audit table (V29) (2026-05-15)
```

Below the flipped checkbox, append the new System Maintenance follow-up bullet:

```markdown
- [ ] **`tool_call_log` retention policy** — add `[audit].tool_call_log_retention_days`
  config knob (default 90) plus a scheduled prune (e.g. daily, alongside the
  existing pre-migration backup prune). Audit-table growth is unbounded today
  and real for high-traffic agents. Prune is `DELETE FROM tool_call_log
  WHERE called_at < (now - retention_days * 86_400_000)` plus an `INSERT INTO
  audit_log` entry recording the prune count for tamper-evidence. Locked in
  the T6 sequencing spec §2 PR 2 "Out of scope" — see [`2026-05-14-phase-5-t6-design.md`](./superpowers/specs/2026-05-14-phase-5-t6-design.md).
```

Find the `Last updated:` line at `roadmap.md:7`. Append `T6 PR2 ✅ (2026-05-15)` to the existing dated note.

- [ ] **Step 13.5: Run the doc-references audit**

```bash
bun scripts/structure-audit/check-doc-references.ts --check
```

Expected: exits 0 with `Doc-reference check: <N> refs across <M> docs — all resolve.`

If it reports a broken link, re-check the path you wrote — the audit is strict about backtick paths and `[text](path)` markdown references.

- [ ] **Step 13.6: Commit the docs**

```bash
git add docs/SECURITY-INVARIANTS.md docs/architecture.md .claude/commands/nimbus-file-map.md docs/roadmap.md
git commit -m "$(cat <<'EOF'
docs(security-invariants,architecture,roadmap): T6 PR 2 — tool_call_log audit table

- SECURITY-INVARIANTS.md I11 row: extends "Wired at" to mention the
  mesh.ts wiring site AND the db/tool-call-log.ts write side. Anti-
  pattern column extended to call out wrapToolOutput-without-
  writeToolCallLog as the new regression to watch (the I11
  enforcement test pins it at runtime).
- architecture.md Local Database Schema reference: new tool_call_log
  row with column list, indexes, write/read sites, and IPC-only
  posture note.
- nimbus-file-map.md: new rows for db/tool-call-log.ts and
  index/tool-call-log-v29-sql.ts under "Local Index + Migrations
  + DB"; existing ipc/audit-rpc.ts row extended to mention the
  new audit.toolCalls branch.
- roadmap.md: T6 PR 2 sub-checkbox flipped to [x] (2026-05-15).
  Header status line at :7 extended with `T6 PR2 ✅ (2026-05-15)`.
  New follow-up bullet for the deferred retention policy (System
  Maintenance) so the gap is visible — preferred over inline TODOs
  that rot once the PR ships.

No new I-numbered invariant — this strengthens existing I11.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14 — Full CI parity check

**Files:** none.

- [ ] **Step 14.1: Coverage gate — engine ≥85%**

```bash
bun run test:coverage:engine
```

Expected: exits 0 with the engine line coverage at or above 85%. The new agent.ts try/catch is covered by the integration tests in §8.3 / Task 6.

- [ ] **Step 14.2: Coverage gate — db ≥85%**

```bash
bun run test:coverage:db
```

Expected: exits 0. The new `db/tool-call-log.ts` is covered by the unit tests in Task 2.

- [ ] **Step 14.3: Static-time invariants check**

```bash
bun run audit:invariants
```

Expected: exits 0. PR 2 doesn't add a new invariant; this catches I1 / vault-key allow-list regressions only.

- [ ] **Step 14.4: Doc-references audit**

```bash
bun scripts/structure-audit/check-doc-references.ts --check
```

Expected: exits 0.

- [ ] **Step 14.5: Lint**

```bash
bun run lint
```

Expected: exits 0. If style issues are reported, run `bun run lint:fix`, re-run `bun run lint`, then commit any auto-fixes as a separate `style: ...` commit.

- [ ] **Step 14.6: Full CI parity**

```bash
bun run test:ci
```

Expected: exits 0. This is the load-bearing pre-PR check — same sequence as `.github/workflows/_test-suite.yml`. Includes typecheck, lint, all unit + integration suites, all coverage gates.

If anything fails, fix it before pushing. Do NOT push a branch with a red local CI run.

- [ ] **Step 14.7: Recap commits**

```bash
git log --oneline main..HEAD
```

Expected: ~10 commits in this order:

```
<hash> docs(security-invariants,architecture,roadmap): T6 PR 2 — tool_call_log audit table       (Task 13)
<hash> feat(ipc): audit.toolCalls JSON-RPC handler                                                 (Task 12)
<hash> test(ipc): TDD red — audit.toolCalls handler unit tests                                     (Task 11)
<hash> feat(platform): wire localIndex.db to agent + mesh as auditDb                               (Task 10)
<hash> feat(connectors): write tool_call_log at mesh.ts:listTools                                  (Task 9)
<hash> test(connectors): TDD red — mesh.ts listTools tool_call_log integration                     (Task 8)
<hash> feat(engine): write tool_call_log at agent.ts wrapToolForLlm                                (Task 7)
<hash> test(engine): TDD red — agent.ts wrapToolForLlm tool_call_log integration                   (Task 6)
<hash> test(security-invariants): TDD red — I11 audit-write extension                              (Task 5)
<hash> test(migrations): V29 tool_call_log integration test                                        (Task 4)
<hash> feat(db): tool_call_log V29 schema + write/read helpers                                     (Task 3)
<hash> test(db): TDD red — tool_call_log helper unit tests                                         (Task 2)
<hash> docs(spec): T6 PR 2 — fold Gemini CLI review (composite cursor + sentinel + multi-byte note)  (already on branch)
<hash> docs(spec): T6 PR 2 — tool_call_log audit table (V29) design                                  (already on branch)
```

(Plus optionally a `style: ...` commit from Step 14.5 if Biome auto-fixed anything.)

---

## Task 15 — Push branch + open PR

**Files:** none.

- [ ] **Step 15.1: Push the branch with upstream tracking**

```bash
git push -u origin dev/asafgolombek/phase-5-t6-pr2-tool-call-log
```

Expected: push succeeds; the branch is reported as tracking `origin/dev/asafgolombek/phase-5-t6-pr2-tool-call-log`.

- [ ] **Step 15.2: Open the PR**

```bash
gh pr create --title "feat(audit): tool_call_log audit table for LLM-facing tool calls (T6 PR 2)" --body "$(cat <<'EOF'
## Summary

- New SQLite table `tool_call_log` (V29) — one row per LLM-facing MCP-tool call.
- Canonical helper `packages/gateway/src/db/tool-call-log.ts` exporting `writeToolCallLog` and `readToolCallLog`.
- Audit-write at both `wrapToolOutput` wiring sites (`engine/agent.ts:wrapToolForLlm` and `connectors/lazy-mesh/mesh.ts:listTools`) wrapped in try/catch — tool errors are logged with `status='error'` and re-thrown.
- New `audit.toolCalls` IPC method — extends the existing `ipc/audit-rpc.ts`. **IPC-only** (NOT LAN-callable per `I5`, NOT in Tauri `ALLOWED_METHODS` per `I7`, NOT exposed via `http-server.ts` read-only HTTP API — `audit.*` is exfiltration-class data).
- Three new assertions extend the existing I11 enforcement block in `security-invariants.test.ts` to pin the audit-write at both wiring sites + the helper module's exports.

Phase 5 T6 PR 2 of 4 — see [T6 sequencing spec](../docs/superpowers/specs/2026-05-14-phase-5-t6-design.md) §2 PR 2.

## Test plan

- [ ] `bun run test:ci` green locally (incl. `test:coverage:engine` ≥85%, `test:coverage:db` ≥85%)
- [ ] `bun run audit:invariants` green
- [ ] `bun scripts/structure-audit/check-doc-references.ts --check` green
- [ ] `bun run lint` green
- [ ] `pr-quality` CI job green on Ubuntu
- [ ] Visual review: spec at `docs/superpowers/specs/2026-05-15-phase-5-t6-pr2-tool-call-log-design.md` matches the implementation
- [ ] `audit.*` posture unchanged: still in `FORBIDDEN_OVER_LAN`, still NOT in Tauri `ALLOWED_METHODS`, still NOT on read-only HTTP API

Spec: `docs/superpowers/specs/2026-05-15-phase-5-t6-pr2-tool-call-log-design.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: the PR URL is printed. Capture it and report it back.

- [ ] **Step 15.3: Report the PR URL to the user**

Output the PR URL. No further action — the rest is review.

---

## Self-review (run after writing this plan, before handing back)

**Spec coverage check** — every spec section maps to a task:

| Spec section | Task |
|---|---|
| §1 Goal — `tool_call_log` records `<tool_output>` for forensics | Tasks 3 (helper) + 7 + 9 (wiring) |
| §2 Non-goals (no CLI, no Tauri allowlist, no LAN, no I-number, no retention) | Honored throughout — Task 12 explicitly preserves `FORBIDDEN_OVER_LAN` and Tauri allowlist; Task 13 adds the retention follow-up bullet |
| §3 Architecture (try/catch + writeToolCallLog at both sites) | Tasks 7 + 9 |
| §4.1 New files | Tasks 3 (SQL constant + helper + helper test), 11 (rpc test), 6 + 8 (integration tests), 4 (migration test) |
| §4.2 Modified files | Tasks 3 (runner), 7 (agent.ts), 9 (mesh.ts), 12 (audit-rpc + dispatchers), 10 (index.ts + assemble.ts), 5 (security-invariants test), 13 (docs) |
| §5 Schema (V29, columns, indexes, truncation) | Task 3 SQL + helper |
| §5.1 Schema diffs from sketch (nullable session, no FK) | Task 3 SQL constant |
| §5.2 64 KiB truncation with marker | Task 3 helper `truncateEnvelope` |
| §6 IPC contract (params + response + error envelope) | Task 12 `parseAuditToolCallsParams` + Task 11 tests |
| §6.1 sessionId='' sentinel | Task 3 helper read-side WHERE clause + Task 11 sentinel test |
| §6.2 composite cursor | Task 3 helper read-side WHERE clause + Task 11 round-trip test |
| §6.3 -32602 error envelope | Task 12 parser + Task 11 validation tests |
| §6.4 Posture matrix (IPC-only) | Task 12 explicitly preserves FORBIDDEN_OVER_LAN + ALLOWED_METHODS |
| §7 Edge cases | Tasks 2 (helper unit tests cover 1–11), 11 (IPC tests cover 12–13) |
| §7.1 Failure-mode invariants (audit-write failure ≠ LLM path break, errors logged then re-thrown, return byte-identical) | Task 3 helper internal try/catch + Task 6 + Task 7 + Task 9 |
| §8 Test plan (unit + integration + migration + I11) | Tasks 2, 4, 5, 6, 8, 11 |
| §8.6 I11 extension (3 assertions) | Task 5 |
| §8.7 Coverage gates | Task 14 |
| §9.1 Roadmap edits | Task 13 |
| §9.2 Retention follow-up bullet | Task 13 |
| §9.3 file-map updates | Task 13 |
| §9.4 Commit topology | Tasks 2–13 commits map 1:1 |
| §10 Worked examples | Task 11 IPC test cases mirror the worked examples |
| §12 Review disposition (composite cursor, sentinel docs, multi-byte note) | Task 3 helper (cursor + sentinel) + spec §5.2 (multi-byte note already landed) |

**Placeholder scan** — searched for "TBD", "TODO", "implement later", "similar to Task N", "Add appropriate X". Every code step shows the actual code. Every command step shows the exact command and expected output. Plan is placeholder-free.

**Type / name consistency** — `writeToolCallLog` and `readToolCallLog` named identically across Tasks 2, 3, 5, 6, 7, 8, 9, 11, 12, 13. `ToolCallLogEntry` / `ToolCallLogReadEntry` / `ToolCallLogFilter` / `ToolCallLogReadResult` named identically. `MAX_ENVELOPE_BYTES = 65_536` and `TRUNCATION_HEAD_BYTES = 65_504` consistent across spec §5.2 and Task 3 helper. `auditDb` field name consistent across `NimbusEngineAgentDeps` (Task 7) + `LazyConnectorMesh` constructor (Task 9) + `createLazyConnectorMesh` factory (Task 9) + `createNimbusEngineAgent({...})` call site (Task 10) + `createLazyConnectorMesh(...)` call site (Task 10). `nextCursor: { calledAt: number; id: number } | null` shape matches across helper return type (Task 3), helper unit tests (Task 2), agent integration tests (Task 6), mesh integration tests (Task 8), and IPC tests (Task 11).
