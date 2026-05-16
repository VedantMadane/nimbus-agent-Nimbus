# Phase 5 T6 PR 4 — Typed `dbRun` / `dbExec` Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route every production `db.run(` / `db.exec(` / `prepared-statement.run(` call site under `packages/gateway/src/` through the centralised `dbRun` / `dbExec` / `dbStmtRun` wrappers in `db/write.ts`, so `SQLITE_FULL` is universally translated to `DiskFullError`. Lock the property in with invariant `I14` (static `D12` binary rule + runtime test).

**Architecture:** Widen `dbRun` to return Bun's `RunResult` shape (`{ changes, lastInsertRowid }`); add a third helper `dbStmtRun(stmt, ...params)` for the three production prepared-statement hot loops; mechanically migrate 94 `db.run` + 66 `db.exec` + 3 prepared-statement writes across 28 production files; promote the existing D12 census in `check-nimbus-invariants.ts` to a binary CI gate with a one-entry allow-list; add `I14` to `docs/SECURITY-INVARIANTS.md` and three runtime assertions in `security-invariants.test.ts`; add 8 representative-subsystem disk-full integration tests.

**Tech Stack:** Bun v1.2+, TypeScript 6.x strict, `bun:sqlite`, Biome. Static-audit script in `scripts/structure-audit/`. Test runner `bun test` for unit + integration; CI parity via `bun run test:ci`.

**Source spec:** [`docs/superpowers/specs/2026-05-16-phase-5-t6-pr4-typed-db-run-design.md`](../specs/2026-05-16-phase-5-t6-pr4-typed-db-run-design.md). The spec is authoritative; this plan is the execution recipe.

**Worktree:** `.worktrees/phase-5-t6-pr4-typed-db-run/` on branch `dev/asafgolombek/phase-5-t6-pr4-typed-db-run` (already created, rebased onto `main`). All work happens in this worktree.

---

## File Structure

| File | Role | Action |
| --- | --- | --- |
| `packages/gateway/src/db/write.ts` | Wrapper destination — `dbRun`, `dbExec`, `dbStmtRun`, `DiskFullError`, disk-warning state | Modify (Task 1, 2) |
| `packages/gateway/src/db/write.test.ts` | Unit tests for wrapper translation + return-value shape | **Create** (Task 1, 2) |
| `packages/gateway/src/db/audit-chain.ts` | `appendAuditEntry` INSERT | Modify (Task 3) |
| `packages/gateway/src/db/repair.ts` | `nimbus db repair` writes | Modify (Task 3) |
| `packages/gateway/src/db/snapshot.ts` | VACUUM INTO | Modify (Task 3) |
| `packages/gateway/src/db/verify.ts` | FTS5 integrity check + PRAGMA foreign_keys | Modify (Task 3) |
| `packages/gateway/src/sync/scheduler-store.ts` | Scheduler writes | Modify (Task 4) |
| `packages/gateway/src/people/{person-store,linker,prune}.ts` | People-graph writes | Modify (Task 4) |
| `packages/gateway/src/memory/session-memory-store.ts` | Session-memory writes | Modify (Task 4) |
| `packages/gateway/src/llm/registry.ts` | `llm_models` upsert | Modify (Task 4) |
| `packages/gateway/src/ipc/http-server.ts` | `PRAGMA query_only = ON` | Modify (Task 4) |
| `packages/gateway/src/platform/assemble.ts` | `PRAGMA busy_timeout` | Modify (Task 4) |
| `packages/gateway/src/perf/perf-fixture.ts` | Fixture seed (`db.exec`, `db.run` BEGIN/COMMIT, prepared-statement INSERT) | Modify (Task 4 + Task 7) |
| `packages/gateway/src/deployment/annotate.ts` | Deployment annotation write | Modify (Task 4) |
| `packages/gateway/src/index/item-store.ts` | `upsertIndexedItem`, deletes | Modify (Task 5) |
| `packages/gateway/src/index/local-index.ts` | `LocalIndex` write surface | Modify (Task 5) |
| `packages/gateway/src/index/migrations/runner.ts` | Migration runner — 3 `db.run` + 65 `db.exec` + 1 prepared-statement UPDATE | Modify (Task 6) |
| `packages/gateway/src/graph/{graph-populator,relationship-graph}.ts` | Graph writes | Modify (Task 7) |
| `packages/gateway/src/engine/sub-agent.ts` | `sub_task_results` lifecycle | Modify (Task 7) |
| `packages/gateway/src/embedding/{pipeline,routing-pipeline}.ts` | Embedding writes + 2 prepared-statement inserts in `pipeline.ts` | Modify (Task 7) |
| `packages/gateway/src/connectors/{health,remove-intent,user-mcp-store,openapi-indexer-sync,obsidian-sync}.ts` | Connector writes | Modify (Task 8) |
| `packages/gateway/src/automation/{extension-store,watcher-store,workflow-store,workflow-run-history}.ts` | Automation writes | Modify (Task 8) |
| `scripts/structure-audit/check-nimbus-invariants.ts` | D12 census → binary, broaden regex, add `DB_RUN_EXEC_ALLOW_LIST` | Modify (Task 9) |
| `scripts/structure-audit/check-nimbus-invariants.test.ts` | D12 binary unit test | **Create** (Task 9) |
| `packages/gateway/src/security-invariants.test.ts` | Three I14 runtime assertions | Modify (Task 10) |
| `docs/SECURITY-INVARIANTS.md` | I14 row + rationale section | Modify (Task 10) |
| `CLAUDE.md` | I14 row in compact table | Modify (Task 10) |
| `docs/architecture.md` | One-sentence note in db section | Modify (Task 10) |
| `.claude/commands/nimbus-db-migrations.md` | Update Large Backfill Pattern snippet + checklist | Modify (Task 10) |
| `packages/gateway/test/integration/db/disk-full-propagation.test.ts` | 8 representative-subsystem tests | **Create** (Task 11) |
| `docs/structure-audit/db-run-census.json` | Refresh — now empty array | Modify (Task 12) |
| `docs/roadmap.md` | Flip T6 PR 4 checkbox, flip top-level T6 row, consolidate header | Modify (Task 12) |

---

## Task 1: Widen `dbRun` to return `RunResult` (TDD)

**Files:**
- Modify: `packages/gateway/src/db/write.ts:95-105`
- Create: `packages/gateway/src/db/write.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/gateway/src/db/write.test.ts`:

```ts
import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { dbExec, dbRun, DiskFullError } from "./write.ts";

describe("dbRun", () => {
  test("returns Bun's RunResult shape on a normal INSERT", () => {
    const db = new Database(":memory:");
    db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY, n INTEGER)");
    const result = dbRun(db, "INSERT INTO t (n) VALUES (?)", [42]);
    expect(result).toBeDefined();
    expect(result.changes).toBe(1);
    expect(Number(result.lastInsertRowid)).toBe(1);
    db.close();
  });

  test("returns RunResult for parameterless statements", () => {
    const db = new Database(":memory:");
    db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY)");
    db.exec("INSERT INTO t DEFAULT VALUES");
    const result = dbRun(db, "DELETE FROM t");
    expect(result.changes).toBe(1);
    db.close();
  });

  test("returns RunResult with changes=0 on UPDATE that matches no rows", () => {
    const db = new Database(":memory:");
    db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY, n INTEGER)");
    const result = dbRun(db, "UPDATE t SET n = 99 WHERE id = ?", [999]);
    expect(result.changes).toBe(0);
    db.close();
  });

  test("propagates non-SQLITE_FULL errors verbatim", () => {
    const db = new Database(":memory:");
    expect(() => dbRun(db, "INSERT INTO does_not_exist (x) VALUES (?)", [1])).toThrow();
    db.close();
  });
});

describe("dbExec", () => {
  test("executes multi-statement SQL", () => {
    const db = new Database(":memory:");
    dbExec(db, "CREATE TABLE t (id INTEGER); INSERT INTO t (id) VALUES (1);");
    const row = db.query("SELECT COUNT(*) AS c FROM t").get() as { c: number };
    expect(row.c).toBe(1);
    db.close();
  });
});

describe("DiskFullError translation", () => {
  test("dbRun translates SQLITE_FULL into DiskFullError", () => {
    const db = new Database(":memory:");
    db.exec("CREATE TABLE t (n BLOB)");
    db.exec("PRAGMA max_page_count = 4");
    // Fill the DB until SQLITE_FULL fires.
    let caught: unknown;
    try {
      const big = new Uint8Array(64 * 1024);
      for (let i = 0; i < 100; i++) dbRun(db, "INSERT INTO t (n) VALUES (?)", [big]);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(DiskFullError);
    db.close();
  });

  test("dbExec translates SQLITE_FULL into DiskFullError", () => {
    const db = new Database(":memory:");
    db.exec("CREATE TABLE t (n BLOB)");
    db.exec("PRAGMA max_page_count = 4");
    let caught: unknown;
    try {
      const big = "x".repeat(64 * 1024);
      for (let i = 0; i < 100; i++) dbExec(db, `INSERT INTO t (n) VALUES ('${big}')`);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(DiskFullError);
    db.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/src/db/write.test.ts`

Expected: the three `dbRun returns ...` tests FAIL with `expect(received).toBeDefined()` / `expect(received).toBe(1)` because `dbRun` currently returns `void`. `DiskFullError translation` tests should pass (translation logic is already in place). `dbExec` test should pass.

- [ ] **Step 3: Update the `dbRun` signature**

Edit `packages/gateway/src/db/write.ts` — replace lines 95-105:

```ts
export function dbRun(
  db: Database,
  sql: string,
  params?: unknown[],
): ReturnType<Database["run"]> {
  try {
    if (params !== undefined && params.length > 0) {
      return db.run(sql, params as Parameters<Database["run"]>[1]);
    }
    return db.run(sql);
  } catch (err) {
    handleWriteError(err);
  }
}
```

The `handleWriteError` function already declares `: never`, so TypeScript accepts the missing return in the catch branch.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/gateway/src/db/write.test.ts`

Expected: all tests PASS.

- [ ] **Step 5: Typecheck**

Run: `bun run typecheck`

Expected: green. No existing caller reads the `dbRun` return value yet, so widening the type is forward-compatible.

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/db/write.ts packages/gateway/src/db/write.test.ts
git commit -m "$(cat <<'EOF'
feat(db): widen dbRun to return RunResult (T6 PR 4)

Switches dbRun's signature from `void` to `ReturnType<Database["run"]>`
({ changes, lastInsertRowid }) so call sites that already read .changes /
.lastInsertRowid (setWatcherEnabled, tryPersistStart, pruneConnectorHealthHistory,
repair.ts row-count checks) can migrate mechanically. handleWriteError stays
the only translation path; existing SQLITE_FULL → DiskFullError tests still pass.

Also adds packages/gateway/src/db/write.test.ts covering the new return
shape and re-asserting the disk-full translation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add `dbStmtRun` helper (TDD)

**Files:**
- Modify: `packages/gateway/src/db/write.ts` — append new helper
- Modify: `packages/gateway/src/db/write.test.ts` — append new describe block

- [ ] **Step 1: Write the failing test**

Append to `packages/gateway/src/db/write.test.ts`:

```ts
import { dbStmtRun } from "./write.ts";

describe("dbStmtRun", () => {
  test("returns Bun's Statement RunResult shape on a normal INSERT", () => {
    const db = new Database(":memory:");
    db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY, n INTEGER)");
    const stmt = db.prepare("INSERT INTO t (n) VALUES (?)");
    const result = dbStmtRun(stmt, 42);
    expect(result.changes).toBe(1);
    expect(Number(result.lastInsertRowid)).toBe(1);
    stmt.finalize();
    db.close();
  });

  test("forwards multiple positional bind values (BigInt, Float32Array)", () => {
    const db = new Database(":memory:");
    db.exec("CREATE TABLE t (rowid INTEGER PRIMARY KEY, blob BLOB)");
    const stmt = db.prepare("INSERT INTO t (rowid, blob) VALUES (?, ?)");
    const result = dbStmtRun(stmt, BigInt(7), new Float32Array([1, 2, 3]));
    expect(result.changes).toBe(1);
    expect(Number(result.lastInsertRowid)).toBe(7);
    stmt.finalize();
    db.close();
  });

  test("translates SQLITE_FULL into DiskFullError", () => {
    const db = new Database(":memory:");
    db.exec("CREATE TABLE t (n BLOB)");
    db.exec("PRAGMA max_page_count = 4");
    const stmt = db.prepare("INSERT INTO t (n) VALUES (?)");
    let caught: unknown;
    try {
      const big = new Uint8Array(64 * 1024);
      for (let i = 0; i < 100; i++) dbStmtRun(stmt, big);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(DiskFullError);
    stmt.finalize();
    db.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/src/db/write.test.ts`

Expected: typecheck-stage failure or `dbStmtRun is not a function` — the helper does not exist yet.

- [ ] **Step 3: Add the `dbStmtRun` helper to `write.ts`**

Append to `packages/gateway/src/db/write.ts` (after `dbExec`):

```ts
/**
 * Execute a prepared statement's `.run(...)` with the same SQLITE_FULL →
 * DiskFullError translation as `dbRun` / `dbExec`. Variadic positional args
 * so the wrapper accepts BigInt, Float32Array, and other native bind types
 * that the embedding hot loop emits.
 *
 * Used by the three production prepared-statement write loops:
 *   - index/migrations/runner.ts:283   (audit-chain backfill)
 *   - embedding/pipeline.ts:86,89      (vec + chunk inserts)
 *   - perf/perf-fixture.ts:100         (bench fixture seeding)
 */
export function dbStmtRun<S extends { run: (...args: never[]) => unknown }>(
  stmt: S,
  ...params: Parameters<S["run"]>
): ReturnType<S["run"]> {
  try {
    return stmt.run(...params) as ReturnType<S["run"]>;
  } catch (err) {
    handleWriteError(err);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/gateway/src/db/write.test.ts`

Expected: all `dbStmtRun` tests PASS along with the existing tests.

- [ ] **Step 5: Typecheck**

Run: `bun run typecheck`

Expected: green.

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/db/write.ts packages/gateway/src/db/write.test.ts
git commit -m "$(cat <<'EOF'
feat(db): add dbStmtRun wrapper for prepared-statement writes (T6 PR 4)

Three production sites today use db.prepare(...).run(...) in hot loops:
  - index/migrations/runner.ts:283 (audit-chain backfill UPDATE)
  - embedding/pipeline.ts:86,89    (vec + chunk INSERTs per chunk)
  - perf/perf-fixture.ts:100       (bench fixture INSERTs per item)

Converting these to dbRun(db, sql, params) would force bun:sqlite to
prepare-and-finalize on every iteration — a measurable regression for
embedding ingestion and migration time. dbStmtRun preserves the prepared-
statement performance while making SQLITE_FULL → DiskFullError translation
universal for prepared writes.

The variadic generic shape mirrors bun:sqlite's Statement.run signature
(accepts BigInt + Float32Array positionally) — required because the
embedding pipeline binds `BigInt(rowid)` + `new Float32Array(vec)`.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Migrate `db/` subsystem (audit-chain, repair, snapshot, verify)

**Files:**
- Modify: `packages/gateway/src/db/audit-chain.ts:60`
- Modify: `packages/gateway/src/db/repair.ts` — 7 sites
- Modify: `packages/gateway/src/db/snapshot.ts:81`
- Modify: `packages/gateway/src/db/verify.ts` — 2 sites

- [ ] **Step 1: Migrate `audit-chain.ts`**

Edit `packages/gateway/src/db/audit-chain.ts`:

Add the import at the top of the existing imports:

```ts
import { dbRun } from "./write.ts";
```

Replace the `db.run(...)` call at line 60-72 (inside `appendAuditEntry`):

```ts
  dbRun(
    db,
    `INSERT INTO audit_log (action_type, hitl_status, action_json, timestamp, row_hash, prev_hash, session_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      fields.actionType,
      fields.hitlStatus,
      fields.actionJson,
      fields.timestamp,
      rowHash,
      prevHash,
      fields.sessionId ?? null,
    ],
  );
```

- [ ] **Step 2: Migrate `repair.ts`**

Edit `packages/gateway/src/db/repair.ts`:

Add import:

```ts
import { dbRun } from "./write.ts";
```

Replace each `db.run(` → `dbRun(db,` at lines 61, 69, 88, 102, 136, 168, 195. The 7th-form sites (`const result = db.run(...)`, `const res = db.run(...)`) keep the assignment — only the function name changes:

```ts
// line 102, before
const result = db.run(...);
// after
const result = dbRun(db, ...);
```

- [ ] **Step 3: Migrate `snapshot.ts`**

Edit `packages/gateway/src/db/snapshot.ts`:

Add import:

```ts
import { dbRun } from "./write.ts";
```

Replace line 81:

```ts
dbRun(db, `VACUUM INTO ?`, [tmpPath]);
```

- [ ] **Step 4: Migrate `verify.ts`**

Edit `packages/gateway/src/db/verify.ts`:

Add import:

```ts
import { dbRun } from "./write.ts";
```

Replace the two sites:
- Line 82: `dbRun(db, "INSERT INTO item_fts(item_fts) VALUES('integrity-check')");`
- Line 212: `dbRun(db, "PRAGMA foreign_keys = ON");`

- [ ] **Step 5: Typecheck**

Run: `bun run typecheck`

Expected: green. Pay attention to errors from `db.run(...)` callers that now expect `void` but receive `RunResult` — there should be none for the `db/` files (the return values are either ignored or assigned to a local).

- [ ] **Step 6: Run the related test suites**

Run: `bun test packages/gateway/src/db/`

Expected: all `db/` unit tests green. The migration is mechanical so behavior is unchanged.

Also: `bun test packages/gateway/test/integration/db/`

Expected: green.

- [ ] **Step 7: Commit**

```bash
git add packages/gateway/src/db/audit-chain.ts packages/gateway/src/db/repair.ts packages/gateway/src/db/snapshot.ts packages/gateway/src/db/verify.ts
git commit -m "$(cat <<'EOF'
refactor(db): route audit-chain/repair/snapshot/verify through dbRun (T6 PR 4)

Eleven db.run call sites in db/ subsystem migrate to dbRun. Notable:
audit-chain.ts:60 (appendAuditEntry INSERT) was loosely-exempted in the
T6 sequencing spec but routing it through dbRun is what makes the BLAKE3
audit chain disk-full-safe — otherwise SQLITE_FULL during an audit INSERT
would silently break the chain.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Migrate "store group A" — sync, people, memory, llm, ipc, platform, perf, deployment

**Files:**
- Modify: `packages/gateway/src/sync/scheduler-store.ts` — 8 sites
- Modify: `packages/gateway/src/people/person-store.ts` — 2 sites
- Modify: `packages/gateway/src/people/linker.ts:408` — 1 site
- Modify: `packages/gateway/src/people/prune.ts` — 10 sites
- Modify: `packages/gateway/src/memory/session-memory-store.ts` — 4 sites
- Modify: `packages/gateway/src/llm/registry.ts` — 2 sites
- Modify: `packages/gateway/src/ipc/http-server.ts:156` — 1 site
- Modify: `packages/gateway/src/platform/assemble.ts:75` — 1 site
- Modify: `packages/gateway/src/perf/perf-fixture.ts` — 1 `db.exec` (line 98) + 2 `db.run` (lines 105, 110); leave the prepared-statement on line 100 for Task 7
- Modify: `packages/gateway/src/deployment/annotate.ts` — 2 sites (lines 172, 194)

- [ ] **Step 1: Add the import to each file**

For each file above, add (path adjusted per file depth):

```ts
import { dbRun } from "../db/write.ts";   // or "../../db/write.ts" depending on depth
```

For `perf-fixture.ts`, also import `dbExec`:

```ts
import { dbExec, dbRun } from "../db/write.ts";
```

- [ ] **Step 2: Replace each `db.run(` with `dbRun(db,`**

Use the census (`docs/structure-audit/db-run-census.json`) to locate every line. For `this.db.run(` → `dbRun(this.db,`. For `ctx.db.run(` → `dbRun(ctx.db,`. Result-reading sites (`const r = db.run(...)`) keep the assignment.

For `perf-fixture.ts`:
- Line 98: `db.exec(FIXTURE_SCHEMA_SQL);` → `dbExec(db, FIXTURE_SCHEMA_SQL);`
- Line 105: `db.run("BEGIN");` → `dbRun(db, "BEGIN");`
- Line 110: `db.run("COMMIT");` → `dbRun(db, "COMMIT");`
- Line 100: **leave unchanged** for Task 7 (prepared-statement `db.prepare(...)` declaration stays; the `.run(...)` call inside the loop becomes `dbStmtRun` in Task 7).

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`

Expected: green.

- [ ] **Step 4: Run the affected test suites**

Run:
```
bun test packages/gateway/src/sync/ packages/gateway/src/people/ packages/gateway/src/memory/ packages/gateway/src/llm/ packages/gateway/src/ipc/ packages/gateway/src/platform/ packages/gateway/src/perf/ packages/gateway/src/deployment/
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/sync/scheduler-store.ts packages/gateway/src/people/ packages/gateway/src/memory/session-memory-store.ts packages/gateway/src/llm/registry.ts packages/gateway/src/ipc/http-server.ts packages/gateway/src/platform/assemble.ts packages/gateway/src/perf/perf-fixture.ts packages/gateway/src/deployment/annotate.ts
git commit -m "$(cat <<'EOF'
refactor: migrate sync/people/memory/llm/ipc/platform/perf/deployment stores to dbRun (T6 PR 4)

~30 db.run sites + 1 db.exec migrate mechanically. perf-fixture.ts's
prepared-statement INSERT is left for the dbStmtRun pass (Task 7).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Migrate `index/item-store.ts` and `index/local-index.ts`

**Files:**
- Modify: `packages/gateway/src/index/item-store.ts` — 3 sites
- Modify: `packages/gateway/src/index/local-index.ts` — 11 sites

- [ ] **Step 1: Add the import**

To both files (relative path is `../db/write.ts`):

```ts
import { dbRun } from "../db/write.ts";
```

- [ ] **Step 2: Replace each call site**

`item-store.ts`:
- Line 71: `db.run(` → `dbRun(db,`
- Line 169: `db.run("DELETE FROM item WHERE id = ?", [primaryKey]);` → `dbRun(db, "DELETE FROM item WHERE id = ?", [primaryKey]);`
- Line 188: `db.run("DELETE FROM item WHERE service = ?", [service]);` → `dbRun(db, "DELETE FROM item WHERE service = ?", [service]);`

`local-index.ts`:
- Line 289: `db.run("PRAGMA foreign_keys = ON");` → `dbRun(db, "PRAGMA foreign_keys = ON");`
- Line 439: `this.db.run(` → `dbRun(this.db,`
- Line 472: `this.db.run("DELETE FROM sync_state WHERE connector_id = ?", [serviceId]);` → `dbRun(this.db, "DELETE FROM sync_state WHERE connector_id = ?", [serviceId]);`
- Lines 744, 818, 848, 873, 895, 902, 909, 923: same prefix transformation.

- [ ] **Step 3: Typecheck + tests**

Run:
```
bun run typecheck
bun test packages/gateway/src/index/ packages/gateway/test/integration/db/ packages/gateway/test/integration/index/ 2>/dev/null || bun test packages/gateway/src/index/
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add packages/gateway/src/index/item-store.ts packages/gateway/src/index/local-index.ts
git commit -m "$(cat <<'EOF'
refactor(index): migrate item-store + local-index to dbRun (T6 PR 4)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Migrate `index/migrations/runner.ts` (large file, 69 sites)

**Files:**
- Modify: `packages/gateway/src/index/migrations/runner.ts`

The runner has 3 `db.run` + 65 `db.exec` + 1 prepared-statement UPDATE (line 283). Task 6 migrates the first two categories; the prepared statement is handled in Task 7.

- [ ] **Step 1: Add the imports**

Add to `runner.ts` (relative path `../../db/write.ts`):

```ts
import { dbExec, dbRun } from "../../db/write.ts";
```

- [ ] **Step 2: Replace `db.run(` → `dbRun(db,`**

Three sites in `runner.ts`:
- Line 77 inside `recordMigration`: the multi-line `db.run("INSERT OR IGNORE INTO _schema_migrations ...", [version, description, now])` → `dbRun(db, ...)`.
- Line 119 (V3→V4 migration): replace prefix.
- Line 477 inside `writePreMigrationBackup`: `db.run(\`VACUUM INTO ?\`, [tmpPath]);` → `dbRun(db, \`VACUUM INTO ?\`, [tmpPath]);`.

- [ ] **Step 3: Replace `db.exec(` → `dbExec(db,`**

65 sites. Use `Grep` to find them all in the file, then edit each:

Run for reference: `Grep` with `pattern="\bdb\.exec\s*\("`, `path="packages/gateway/src/index/migrations/runner.ts"`, `output_mode="content"`, `-n=true`.

Each line of the form `db.exec(EXPR);` becomes `dbExec(db, EXPR);`. The `db.transaction(() => { ... })()` shells stay structurally unchanged — only the inner statement-execution calls migrate.

Example, lines 102-107 (V0→V1):

```ts
function migrateIndexedV0ToV1(db: Database, now: number): void {
  db.transaction(() => {
    dbExec(db, INITIAL_SCHEMA_SQL);
    dbExec(db, "PRAGMA user_version = 1");
    recordMigration(db, 1, "initial filesystem schema", now);
  })();
}
```

The 65 sites are scattered across ~30 `migrateIndexedV<N>ToV<N+1>` functions plus `backfillMigrationsLedger` (which uses `recordMigration` only, no direct `db.exec`).

**Leave** the prepared-statement at line 283 (`db.prepare("UPDATE audit_log ...")`) and its `update.run(...)` inside the loop body — they are Task 7.

- [ ] **Step 4: Typecheck + migration-suite tests**

Run:
```
bun run typecheck
bun test packages/gateway/src/index/migrations/
```

Expected: green. Migration runner integration tests exercise every V<N> path end-to-end.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/index/migrations/runner.ts
git commit -m "$(cat <<'EOF'
refactor(db): migrate index/migrations/runner.ts to dbRun/dbExec (T6 PR 4)

Three db.run sites + 65 db.exec sites inside the migration runner.
db.transaction(() => { ... })() shells stay structurally unchanged —
only the inner statement-execution calls go through the wrappers, so
DiskFullError propagation reaches every schema migration step.

The prepared-statement UPDATE at line 283 (backfillAuditChain) is left
for Task 7 (dbStmtRun pass).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Migrate prepared-statement writes + graph/engine/embedding

**Files:**
- Modify: `packages/gateway/src/graph/graph-populator.ts:29` — 1 site
- Modify: `packages/gateway/src/graph/relationship-graph.ts` — 3 sites
- Modify: `packages/gateway/src/engine/sub-agent.ts` — 3 sites (one returns `stmt` to read `lastInsertRowid`)
- Modify: `packages/gateway/src/embedding/pipeline.ts` — 4 `db.run` sites + 2 prepared-statement `.run(...)` sites
- Modify: `packages/gateway/src/embedding/routing-pipeline.ts:27` — 1 site
- Modify: `packages/gateway/src/index/migrations/runner.ts:283-292` — prepared-statement UPDATE
- Modify: `packages/gateway/src/perf/perf-fixture.ts:108` — prepared-statement INSERT (the `db.prepare` declaration on line 100 stays)

- [ ] **Step 1: Add imports**

For files with `db.run(` only: `import { dbRun } from "../db/write.ts";` (path-adjusted).

For files with prepared-statement writes (`embedding/pipeline.ts`, `index/migrations/runner.ts`, `perf/perf-fixture.ts`): import `dbStmtRun` too:

```ts
import { dbRun, dbStmtRun } from "../db/write.ts";   // or path-adjusted
```

`runner.ts` already imported `dbRun`/`dbExec` in Task 6; extend the import to add `dbStmtRun`:

```ts
import { dbExec, dbRun, dbStmtRun } from "../../db/write.ts";
```

`perf-fixture.ts` already imported `dbRun`/`dbExec` in Task 4; extend.

- [ ] **Step 2: Migrate `db.run` sites**

Mechanical `db.run(` → `dbRun(db,` and `this.db.run(` → `dbRun(this.db,` in all listed files. See Task 4 for the form.

- [ ] **Step 3: Migrate the three prepared-statement writes**

`packages/gateway/src/embedding/pipeline.ts:102-103` — replace inside the `for` loop:

```ts
// before
insertVec.run(BigInt(rowid), new Float32Array(vec));
insertChunk.run(itemId, i, text, rowid, model, dims, now);
// after
dbStmtRun(insertVec, BigInt(rowid), new Float32Array(vec));
dbStmtRun(insertChunk, itemId, i, text, rowid, model, dims, now);
```

The `const insertVec = this.db.prepare(...)` and `const insertChunk = this.db.prepare(...)` declarations on lines 86 and 89 stay unchanged.

`packages/gateway/src/index/migrations/runner.ts:292` — replace inside `backfillAuditChain`'s `for` loop:

```ts
// before
update.run(row, prev, r.id);
// after
dbStmtRun(update, row, prev, r.id);
```

`const update = db.prepare(...)` on line 283 stays unchanged.

`packages/gateway/src/perf/perf-fixture.ts:108` — replace inside the seeding loop:

```ts
// before
ins.run(`gh:${i}`, String(i), `Synthetic PR ${i}`, now - t, now - t);
// after
dbStmtRun(ins, `gh:${i}`, String(i), `Synthetic PR ${i}`, now - t, now - t);
```

`const ins = db.prepare(...)` on line 100 stays unchanged.

- [ ] **Step 4: Special handling for `engine/sub-agent.ts:17`**

Site 17 reads `lastInsertRowid` from the return value:

```ts
// before
const stmt = db.run(`INSERT INTO sub_task_results ...`, [...]);
return stmt.lastInsertRowid as number;
// after
const stmt = dbRun(db, `INSERT INTO sub_task_results ...`, [...]);
return stmt.lastInsertRowid as number;
```

The variable name `stmt` is preserved to minimise diff noise; `dbRun` returns `{ changes, lastInsertRowid }`.

- [ ] **Step 5: Typecheck + tests**

Run:
```
bun run typecheck
bun test packages/gateway/src/graph/ packages/gateway/src/engine/ packages/gateway/src/embedding/ packages/gateway/src/index/migrations/ packages/gateway/src/perf/
```

Expected: green. The `embedding/pipeline.test.ts` exercises `insertVec` / `insertChunk` end-to-end, which validates `dbStmtRun` in a hot loop.

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/graph/ packages/gateway/src/engine/sub-agent.ts packages/gateway/src/embedding/ packages/gateway/src/index/migrations/runner.ts packages/gateway/src/perf/perf-fixture.ts
git commit -m "$(cat <<'EOF'
refactor: migrate graph/engine/embedding + 3 prepared-statement writes (T6 PR 4)

Includes the three production prepared-statement write sites that now
route through dbStmtRun:
  - embedding/pipeline.ts:102-103 (insertVec + insertChunk per chunk)
  - index/migrations/runner.ts:292 (backfillAuditChain update)
  - perf/perf-fixture.ts:108 (synthetic-PR seed)

Prepared-statement declarations (db.prepare(...)) stay unchanged — only
the .run(...) invocations migrate. This preserves the prepare-once /
run-many performance characteristic that matters for embedding ingestion
latency and V18 audit-chain backfill time.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Migrate connectors + automation

**Files:**
- Modify: `packages/gateway/src/connectors/health.ts` — 4 sites
- Modify: `packages/gateway/src/connectors/remove-intent.ts` — 2 sites
- Modify: `packages/gateway/src/connectors/user-mcp-store.ts` — 2 sites
- Modify: `packages/gateway/src/connectors/openapi-indexer-sync.ts` — 1 site (line 88, uses `ctx.db.run`)
- Modify: `packages/gateway/src/connectors/obsidian-sync.ts` — 5 sites (lines 88, 131, 132, 134, 140)
- Modify: `packages/gateway/src/automation/extension-store.ts` — 4 sites (one reads `r.changes`)
- Modify: `packages/gateway/src/automation/watcher-store.ts` — 7 sites (two read `r.changes`)
- Modify: `packages/gateway/src/automation/workflow-store.ts` — 5 sites (one reads `r.changes`)
- Modify: `packages/gateway/src/automation/workflow-run-history.ts:79` — 1 site (reads `res.changes`)

- [ ] **Step 1: Add the import**

For each file:

```ts
import { dbRun } from "../db/write.ts";   // path-adjusted
```

- [ ] **Step 2: Replace each call site**

Same mechanical transformation as Task 4. For `ctx.db.run(...)` (`openapi-indexer-sync.ts:88`) the form is `dbRun(ctx.db, ...)`. Sites that read `.changes` keep their assignment:

```ts
// before — watcher-store.ts:80
const r = db.run(`UPDATE watcher SET enabled = ? WHERE id = ?`, [enabled ? 1 : 0, id]);
return r.changes > 0;
// after
const r = dbRun(db, `UPDATE watcher SET enabled = ? WHERE id = ?`, [enabled ? 1 : 0, id]);
return r.changes > 0;
```

- [ ] **Step 3: Typecheck + tests**

Run:
```
bun run typecheck
bun test packages/gateway/src/connectors/ packages/gateway/src/automation/
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add packages/gateway/src/connectors/ packages/gateway/src/automation/
git commit -m "$(cat <<'EOF'
refactor: migrate connectors + automation stores to dbRun (T6 PR 4)

~25 sites across connectors/health, remove-intent, user-mcp-store,
openapi-indexer-sync, obsidian-sync, plus automation/extension-store,
watcher-store, workflow-store, workflow-run-history. Sites reading
r.changes keep their assignment shape — only the function name swaps.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Promote D12 to binary (TDD)

**Files:**
- Modify: `scripts/structure-audit/check-nimbus-invariants.ts` — broaden regex, add `DB_RUN_EXEC_ALLOW_LIST`, add `--rule db-run-exec` mode, wire into `binary-only` + `all`
- Create: `scripts/structure-audit/check-nimbus-invariants.test.ts`

- [ ] **Step 1: Write the failing test (binary mode does not yet exist)**

Create `scripts/structure-audit/check-nimbus-invariants.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import {
  DB_RUN_EXEC_ALLOW_LIST,
  findDirectDbRunExec,
  type FileEntry,
} from "./check-nimbus-invariants.ts";

describe("D12 — direct db.run / db.exec outside allow-list", () => {
  test("flags a synthetic file with a bare db.run call", () => {
    const files: FileEntry[] = [
      {
        relPath: "packages/gateway/src/synthetic.ts",
        contents: "function w(db: Database) { db.run('UPDATE t SET n = 1'); }",
      },
    ];
    const hits = findDirectDbRunExec(files);
    expect(hits.length).toBe(1);
    expect(hits[0]?.file).toBe("packages/gateway/src/synthetic.ts");
  });

  test("flags a synthetic file with this.db.exec", () => {
    const files: FileEntry[] = [
      {
        relPath: "packages/gateway/src/synthetic.ts",
        contents: "class S { run() { this.db.exec('CREATE TABLE t (n INT)'); } }",
      },
    ];
    const hits = findDirectDbRunExec(files);
    expect(hits.length).toBe(1);
  });

  test("flags a synthetic file with ctx.db.run", () => {
    const files: FileEntry[] = [
      {
        relPath: "packages/gateway/src/synthetic.ts",
        contents: "function h(ctx: SyncCtx) { ctx.db.run('UPDATE t SET n = 1'); }",
      },
    ];
    const hits = findDirectDbRunExec(files);
    expect(hits.length).toBe(1);
  });

  test("does NOT flag dbRun / dbExec / dbStmtRun calls", () => {
    const files: FileEntry[] = [
      {
        relPath: "packages/gateway/src/synthetic.ts",
        contents: `
          dbRun(db, "UPDATE t SET n = 1");
          dbExec(db, "PRAGMA query_only = ON");
          dbStmtRun(stmt, 1, 2, 3);
        `,
      },
    ];
    const hits = findDirectDbRunExec(files);
    expect(hits.length).toBe(0);
  });

  test("does NOT flag calls in the allow-listed wrapper file", () => {
    const files: FileEntry[] = [
      {
        relPath: "packages/gateway/src/db/write.ts",
        contents: "function dbRun(db: Database, sql: string) { db.run(sql); }",
      },
    ];
    const hits = findDirectDbRunExec(files);
    expect(hits.length).toBe(0);
  });

  test("DB_RUN_EXEC_ALLOW_LIST contains exactly the wrapper file", () => {
    expect([...DB_RUN_EXEC_ALLOW_LIST]).toEqual(["packages/gateway/src/db/write.ts"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test scripts/structure-audit/check-nimbus-invariants.test.ts`

Expected: FAIL with "DB_RUN_EXEC_ALLOW_LIST is not exported" / "findDirectDbRunExec is not exported" — these names do not exist yet.

- [ ] **Step 3: Update `check-nimbus-invariants.ts`**

In `scripts/structure-audit/check-nimbus-invariants.ts`:

1. Add the new export above the existing `collectDbRunCensus`:

```ts
export const DB_RUN_EXEC_ALLOW_LIST: readonly string[] = [
  "packages/gateway/src/db/write.ts",
];
```

2. Replace the `DB_RUN_RE` regex (line 109) and the `collectDbRunCensus` function. The new regex matches `db.run(`, `db.exec(`, `this.db.run(`, `this.db.exec(`, and `ctx.db.run(` / `ctx.db.exec(`. (The leading `\b` already handles the boundary in the `this.` / `ctx.` cases — `.` is non-word, `d` is word — but listing the prefixes explicitly is clearer at review time.)

```ts
const DB_RUN_EXEC_RE = /\b(?:this\.|ctx\.)?db\.(?:run|exec)\s*\(/;

export type DbRunHit = {
  file: string;
  line: number;
  function: string;
  snippet: string;
};

export function findDirectDbRunExec(
  files: readonly FileEntry[],
  allowList: readonly string[] = DB_RUN_EXEC_ALLOW_LIST,
): DbRunHit[] {
  const out: DbRunHit[] = [];
  for (const f of files) {
    if (allowList.includes(f.relPath)) continue;
    const lines = f.contents.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] as string;
      if (!DB_RUN_EXEC_RE.test(line)) continue;
      out.push({
        file: f.relPath,
        line: i + 1,
        function: findEnclosingFunction(lines, i),
        snippet: line.trim(),
      });
    }
  }
  return out;
}

/** @deprecated kept for backwards compatibility — diagnostic census mode. */
export function collectDbRunCensus(files: readonly FileEntry[]): DbRunHit[] {
  return findDirectDbRunExec(files, []);
}
```

3. Extend the `Mode` type and `parseArgs`:

```ts
type Mode = "spawn" | "vault-key" | "db-run" | "db-run-exec" | "binary-only" | "all";
```

In `parseArgs`:

```ts
if (r === "spawn" || r === "vault-key" || r === "db-run" || r === "db-run-exec") return r;
```

4. Replace the `db-run` block in `run()` to also run the binary check when mode is `"db-run-exec"`, `"binary-only"`, or `"all"`:

```ts
if (mode === "db-run-exec" || mode === "binary-only" || mode === "all") {
  const v = findDirectDbRunExec(files);
  for (const e of v) {
    console.error(
      `::error file=${e.file},line=${e.line}::D12 direct db.run/db.exec outside allow-list: ${e.snippet}`,
    );
  }
  if (v.length > 0) exit = 1;
}
if (mode === "db-run" || mode === "all") {
  const census = collectDbRunCensus(files);
  const outPath = auditOutputPath("db-run-census.json");
  await Bun.write(outPath, `${JSON.stringify(census, null, 2)}\n`);
  console.log(`db-run census: ${census.length} hits → ${outPath}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test scripts/structure-audit/check-nimbus-invariants.test.ts`

Expected: all PASS.

- [ ] **Step 5: Run the binary check against the migrated tree**

Run: `bun scripts/structure-audit/check-nimbus-invariants.ts --rule db-run-exec`

Expected: exit 0, no error output. If hits remain, fix the offending sites before continuing (they were missed in Tasks 3-8).

- [ ] **Step 6: Refresh the census file**

Run: `bun run audit:db-run`

Expected: writes `docs/structure-audit/db-run-census.json` with `[]` (or near-empty if the allow-list excludes only `write.ts`; the only matches would be inside `write.ts` itself, which the allow-list filters from the binary check but **not** from the diagnostic census — the file's `db.run`/`db.exec` inside `dbRun`/`dbExec` will appear). This is fine — the binary mode is what gates CI.

- [ ] **Step 7: Run the structure-audit orchestrator**

Run: `bun run audit:invariants`

Expected: exit 0. D10 + D11 + new D12 all green.

- [ ] **Step 8: Commit**

```bash
git add scripts/structure-audit/check-nimbus-invariants.ts scripts/structure-audit/check-nimbus-invariants.test.ts docs/structure-audit/db-run-census.json
git commit -m "$(cat <<'EOF'
feat(audit): promote D12 to binary; new DB_RUN_EXEC_ALLOW_LIST (T6 PR 4)

Static-audit rule D12 graduates from census-only (always exit 0) to a
binary CI gate (exit 1 on hit outside DB_RUN_EXEC_ALLOW_LIST). The
allow-list contains exactly one entry: packages/gateway/src/db/write.ts
(the wrapper itself). The regex broadens from `\\bdb\\.run\\(` to
`\\bdb\\.(?:run|exec)\\s*\\(`, catching both forms.

The diagnostic --rule db-run census mode stays for snapshot refreshes.
bun run audit:invariants now treats direct db.run/db.exec outside the
wrapper as a build break.

Census refreshed; binary check green across the migrated tree.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Wire I14 — docs + runtime test

**Files:**
- Modify: `docs/SECURITY-INVARIANTS.md` — add I14 row + rationale section
- Modify: `CLAUDE.md` — add I14 row to compact table
- Modify: `docs/architecture.md` — append one-sentence note in db section
- Modify: `.claude/commands/nimbus-db-migrations.md` — update Large Backfill Pattern snippet + checklist
- Modify: `packages/gateway/src/security-invariants.test.ts` — add three I14 assertions

- [ ] **Step 1: Add the I14 row + rationale in `SECURITY-INVARIANTS.md`**

After the I13 section (find with `Grep` for `^## I13`), append:

```markdown
---

## I14 — All SQLite write paths route through `dbRun` / `dbExec` / `dbStmtRun`

**Defense:** `dbRun`, `dbExec`, and `dbStmtRun` in `packages/gateway/src/db/write.ts` are the only production paths that invoke `bun:sqlite`'s `Database.run` / `Database.exec` / `Statement.run`. The wrappers translate `SQLITE_FULL` (extended error code 13) into the typed `DiskFullError` and set the `_diskSpaceWarning` flag, so a full disk surfaces as a typed exception rather than a swallowed write.

**Wired at:** `packages/gateway/src/db/write.ts` (`dbRun`, `dbExec`, `dbStmtRun`). Enforced statically by D12 in `scripts/structure-audit/check-nimbus-invariants.ts` — exits 1 on any direct `db.run(` / `db.exec(` outside `DB_RUN_EXEC_ALLOW_LIST` (one entry: the wrapper file itself).

**Anti-pattern:** direct `db.run(` / `db.exec(` / prepared-statement `stmt.run(` in any production file under `packages/gateway/src/` outside `db/write.ts`. Reverting to direct calls means SQLITE_FULL is swallowed silently and the audit chain, sync state, and embeddings can end up half-written without surfacing a typed error to the gateway.

**How to comply:** every new SQL write uses `dbRun(db, sql, params?)`, `dbExec(db, sql)`, or `dbStmtRun(stmt, ...params)`. `bun run audit:invariants` fails fast on regressions; the runtime test in `security-invariants.test.ts` spot-checks three representative subsystems and the allow-list constant.
```

- [ ] **Step 2: Add the I14 row to `CLAUDE.md`'s invariant table**

Find the row for I13 (`Grep` for `^\| I13 \|`). Append after it:

```markdown
| I14 | All SQLite write paths route through `dbRun` / `dbExec` / `dbStmtRun`                       | `db/write.ts` (`dbRun`, `dbExec`, `dbStmtRun`); enforced statically by `D12` in `check-nimbus-invariants.ts` | Direct `db.run(` or `db.exec(` outside `DB_RUN_EXEC_ALLOW_LIST` — swallows `SQLITE_FULL` |
```

- [ ] **Step 3: Update `docs/architecture.md`**

Find the "Local Database Schema" section (`Grep` for "Local Database Schema") and append at the end of it:

```markdown
**SQLite write boundary.** Every production write goes through `dbRun` / `dbExec` / `dbStmtRun` in `packages/gateway/src/db/write.ts` (invariant `I14`). The wrappers translate `SQLITE_FULL` into a typed `DiskFullError`; the static-audit gate `D12` (`bun run audit:invariants`) fails the build on any direct `db.run(` / `db.exec(` outside the wrapper.
```

- [ ] **Step 4: Update `.claude/commands/nimbus-db-migrations.md`**

In the "Large Backfill Pattern" section, replace the snippet `db.transaction(() => { /* update rows */ })()` body. The example today uses raw `db.run` in passing prose; locate any inline snippet and rewrite to use `dbRun(db, ...)`. Also add a new bullet to the "New Table Checklist" section:

```markdown
- All write statements (`INSERT` / `UPDATE` / `DELETE` / `CREATE TABLE` / `CREATE INDEX`) go through `dbRun` / `dbExec` / `dbStmtRun` from `db/write.ts` (invariant `I14`). Direct `db.run(` / `db.exec(` outside the wrapper fails `bun run audit:invariants`.
```

- [ ] **Step 5: Add three I14 runtime assertions**

Append to `packages/gateway/src/security-invariants.test.ts` (after the last existing describe block):

```ts
describe("I14 — all SQLite write paths route through dbRun/dbExec/dbStmtRun", () => {
  test("migrated subsystems import dbRun or dbExec from db/write.ts", async () => {
    const samples = [
      "packages/gateway/src/sync/scheduler-store.ts",
      "packages/gateway/src/automation/watcher-store.ts",
      "packages/gateway/src/connectors/health.ts",
      "packages/gateway/src/engine/sub-agent.ts",
      "packages/gateway/src/db/audit-chain.ts",
      "packages/gateway/src/embedding/pipeline.ts",
      "packages/gateway/src/index/migrations/runner.ts",
    ];
    for (const rel of samples) {
      const src = await read(rel);
      expect(src).toMatch(/from\s+"[^"]*\/db\/write\.ts"/);
    }
  });

  test("three representative subsystems contain dbRun/dbExec/dbStmtRun calls but no direct db.run/db.exec", async () => {
    const checks = [
      "packages/gateway/src/automation/watcher-store.ts",
      "packages/gateway/src/engine/sub-agent.ts",
      "packages/gateway/src/db/audit-chain.ts",
    ];
    for (const rel of checks) {
      const src = await read(rel);
      // Positive: at least one wrapper call.
      expect(src).toMatch(/\bdb(?:Run|Exec|StmtRun)\s*\(/);
      // Negative: no direct db.run/db.exec.
      expect(src).not.toMatch(/\bdb\.(?:run|exec)\s*\(/);
    }
  });

  test("DB_RUN_EXEC_ALLOW_LIST in check-nimbus-invariants.ts is exactly the wrapper file", async () => {
    const src = await read("scripts/structure-audit/check-nimbus-invariants.ts");
    expect(src).toMatch(/DB_RUN_EXEC_ALLOW_LIST/);
    expect(src).toMatch(/"packages\/gateway\/src\/db\/write\.ts"/);
    // Negative: any allow-list entry under packages/ that is not write.ts is a regression.
    const m = src.match(/DB_RUN_EXEC_ALLOW_LIST[^\]]*?\]/s);
    expect(m).toBeTruthy();
    const block = m?.[0] ?? "";
    const extra = block.match(/"packages\/(?!gateway\/src\/db\/write\.ts")[^"]+"/g);
    expect(extra).toBeNull();
  });
});
```

- [ ] **Step 6: Typecheck + tests**

Run:
```
bun run typecheck
bun test packages/gateway/src/security-invariants.test.ts
```

Expected: green.

- [ ] **Step 7: Commit**

```bash
git add docs/SECURITY-INVARIANTS.md CLAUDE.md docs/architecture.md .claude/commands/nimbus-db-migrations.md packages/gateway/src/security-invariants.test.ts
git commit -m "$(cat <<'EOF'
feat(invariants): wire I14 — typed dbRun/dbExec/dbStmtRun (T6 PR 4)

- docs/SECURITY-INVARIANTS.md: new I14 row + rationale section
- CLAUDE.md: I14 row in invariants table
- docs/architecture.md: SQLite-write-boundary note in db section
- .claude/commands/nimbus-db-migrations.md: New-Table Checklist bullet
- security-invariants.test.ts: three I14 assertions
    (import-site grep, three-file spot check, allow-list constant shape)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Disk-full propagation integration tests

**Files:**
- Create: `packages/gateway/test/integration/db/disk-full-propagation.test.ts`

- [ ] **Step 1: Create the test file**

Create `packages/gateway/test/integration/db/disk-full-propagation.test.ts`:

```ts
import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DiskFullError } from "../../../src/db/write.ts";
import { appendAuditEntry } from "../../../src/db/audit-chain.ts";
import { runIndexedSchemaMigrations } from "../../../src/index/migrations/runner.ts";
import { setNextSyncAt, upsertSchedulerRegistration } from "../../../src/sync/scheduler-store.ts";
import { insertPerson } from "../../../src/people/person-store.ts";
import { insertWatcher, setWatcherEnabled } from "../../../src/automation/watcher-store.ts";
import { transitionHealth } from "../../../src/connectors/health.ts";
import { upsertIndexedItem } from "../../../src/index/item-store.ts";
import { SqliteEmbeddingPipeline } from "../../../src/embedding/pipeline.ts";

function makeTinyDb(): { db: Database; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "nimbus-diskfull-"));
  const dbPath = join(dir, "nimbus.db");
  const db = new Database(dbPath);
  runIndexedSchemaMigrations(db, 30);
  // Fix at 8 pages (≈32 KB) so a few row inserts exhaust the budget.
  db.exec("PRAGMA max_page_count = 8");
  return {
    db,
    cleanup: () => {
      db.close();
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        /* Windows file-handle race; harmless */
      }
    },
  };
}

function fillUntilFull(db: Database): void {
  const big = "x".repeat(8 * 1024);
  for (let i = 0; i < 200; i++) {
    try {
      // Bypass dbExec so the fill itself doesn't translate the SQLITE_FULL
      // we're provoking — we want a raw bun:sqlite SQLITE_FULL exception
      // on the *next* write through a migrated path.
      db.exec(
        `INSERT INTO item (id, service, type, external_id, title, modified_at, synced_at) VALUES ('p:${String(i)}', 'pad', 'pad', 'pad:${String(i)}', '${big}', 0, 0)`,
      );
    } catch {
      return;
    }
  }
}

describe("disk-full propagation through migrated stores", () => {
  test("audit-chain: appendAuditEntry throws DiskFullError when disk is full", () => {
    const { db, cleanup } = makeTinyDb();
    try {
      fillUntilFull(db);
      expect(() =>
        appendAuditEntry(db, {
          actionType: "test.action",
          hitlStatus: "not_required",
          actionJson: "{}",
          timestamp: Date.now(),
        }),
      ).toThrow(DiskFullError);
    } finally {
      cleanup();
    }
  });

  test("sync: setNextSyncAt throws DiskFullError when disk is full", () => {
    const { db, cleanup } = makeTinyDb();
    try {
      // Register the row pre-fill so setNextSyncAt's UPDATE has a target.
      upsertSchedulerRegistration(db, "svc", 60000, Date.now(), false);
      fillUntilFull(db);
      expect(() => setNextSyncAt(db, "svc", Date.now())).toThrow(DiskFullError);
    } finally {
      cleanup();
    }
  });

  test("people: insertPerson throws DiskFullError when disk is full", () => {
    const { db, cleanup } = makeTinyDb();
    try {
      fillUntilFull(db);
      expect(() =>
        insertPerson(db, {
          id: "p:1",
          displayName: "test",
          canonicalEmail: null,
          githubLogin: null,
          gitlabLogin: null,
          slackHandle: null,
          linearMemberId: null,
          jiraAccountId: null,
          notionUserId: null,
          linked: false,
          metadata: {},
        }),
      ).toThrow(DiskFullError);
    } finally {
      cleanup();
    }
  });

  test("automation: setWatcherEnabled throws DiskFullError when disk is full (also validates return-value path)", () => {
    const { db, cleanup } = makeTinyDb();
    try {
      // Insert a watcher first so setWatcherEnabled has a target row.
      const id = insertWatcher(db, {
        name: "w",
        enabled: 1,
        condition_type: "always",
        condition_json: "{}",
        action_type: "noop",
        action_json: "{}",
        created_at: Date.now(),
      });
      fillUntilFull(db);
      expect(() => setWatcherEnabled(db, id, false)).toThrow(DiskFullError);
    } finally {
      cleanup();
    }
  });

  test("connectors: transitionHealth/appendHistory throws DiskFullError when disk is full", () => {
    const { db, cleanup } = makeTinyDb();
    try {
      fillUntilFull(db);
      expect(() =>
        transitionHealth(db, "github", { type: "sync_success" }),
      ).toThrow(DiskFullError);
    } finally {
      cleanup();
    }
  });

  test("engine: runSubAgent persist-start INSERT throws DiskFullError when disk is full (validates lastInsertRowid path)", async () => {
    const { db, cleanup } = makeTinyDb();
    try {
      fillUntilFull(db);
      // tryPersistStart catches errors silently by design, so we can't rely on
      // its public surface to throw. Instead, exercise dbRun directly on the
      // same INSERT shape — the disk-full propagation through dbRun is what
      // I14 guarantees, and tryPersistStart's swallow behaviour is preserved.
      const { dbRun } = await import("../../../src/db/write.ts");
      expect(() =>
        dbRun(
          db,
          `INSERT INTO sub_task_results
           (session_id, parent_id, task_index, task_type, status, started_at, created_at)
           VALUES (?, ?, ?, ?, 'running', ?, ?)`,
          ["s", "p", 0, "test", Date.now(), Date.now()],
        ),
      ).toThrow(DiskFullError);
    } finally {
      cleanup();
    }
  });

  test("embedding: embedItem (via dbStmtRun on insertVec/insertChunk) throws DiskFullError when disk is full", async () => {
    const { db, cleanup } = makeTinyDb();
    try {
      fillUntilFull(db);
      // Minimal fake embedder — returns one 384-dim zero vector per chunk.
      const fakeEmbedder = {
        model: "test-model",
        dims: 384,
        async embed(texts: string[]): Promise<Float32Array[]> {
          return texts.map(() => new Float32Array(384));
        },
      };
      const pipeline = new SqliteEmbeddingPipeline({ db, embedder: fakeEmbedder });
      await expect(
        pipeline.embedItem({
          id: "item:1",
          service: "test",
          type: "doc",
          title: "test-title",
          body_preview: "test-body",
        }),
      ).rejects.toBeInstanceOf(DiskFullError);
    } finally {
      cleanup();
    }
  });

  test("index: upsertIndexedItem throws DiskFullError when disk is full", () => {
    const { db, cleanup } = makeTinyDb();
    try {
      fillUntilFull(db);
      expect(() =>
        upsertIndexedItem(db, {
          service: "github",
          type: "pr",
          externalId: "999",
          title: "test",
          modifiedAt: Date.now(),
          syncedAt: Date.now(),
        }),
      ).toThrow(DiskFullError);
    } finally {
      cleanup();
    }
  });
});
```

**Notes on the test bodies.**

- The exact arg shapes for `upsertSchedulerRegistration`, `insertWatcher`, `insertPerson`, and `SqliteEmbeddingPipeline.embedItem` are based on current `.ts` signatures (read by the plan author, 2026-05-16: `pipeline.ts` exports `embedItem(item: IndexedItem): Promise<void>` and `IndexedItem = { id, service, type, title, body_preview }`). If a signature drifted between plan-write and execution, fix the call site to match the source. The `Read` tool is the source of truth.
- `tryPersistStart` in `sub-agent.ts` swallows errors by design (the surrounding `try { ... } catch { return undefined; }`), so we cannot assert the throw propagates through `runSubAgent`. Instead, the engine test exercises `dbRun` directly on the same INSERT shape — this validates the I14 guarantee (disk-full translation for the engine's write path) while preserving `tryPersistStart`'s production swallow semantics.

- [ ] **Step 2: Run the tests**

Run: `bun test packages/gateway/test/integration/db/disk-full-propagation.test.ts`

Expected: all 8 tests PASS. Each test runs in <100ms; total ~400ms.

- [ ] **Step 3: Run `test:ci` end-to-end for parity**

Run: `bun run test:ci`

Expected: green. This catches any non-mechanical regression in the migration sweep.

- [ ] **Step 4: Commit**

```bash
git add packages/gateway/test/integration/db/disk-full-propagation.test.ts
git commit -m "$(cat <<'EOF'
test(db): disk-full propagation across 8 representative subsystems (T6 PR 4)

Each test caps a fresh SQLite DB at max_page_count=8, fills it past the
limit via raw db.exec (intentionally bypassing dbExec to provoke
SQLITE_FULL inside bun:sqlite), then calls the subsystem's public write
function and asserts DiskFullError propagates.

Covers: audit-chain (load-bearing), sync, people, automation (with
return-value path), connectors, engine (lastInsertRowid path), embedding
(dbStmtRun path), and index. ~400ms total.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Roadmap + final audit refresh

**Files:**
- Modify: `docs/structure-audit/db-run-census.json` (regenerate)
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Refresh the census file**

Run: `bun run audit:db-run`

Expected: writes an empty array `[]` (the only `db.run` hits live inside `db/write.ts`, which the diagnostic mode *does* include because it uses `allowList = []` — but `db/write.ts`'s body is intentionally the wrapper so two entries appear, which is the steady-state baseline; verify by reading the file).

If the file ends up with > 2 entries, there is a missed migration site. Fix and re-run.

- [ ] **Step 2: Update `docs/roadmap.md`**

In the active-phase section, find the T6 progress block and flip the PR 4 checkbox:

```markdown
- [x] **T6 — B1 hardening + semantic layer prep** ([sequencing spec](./superpowers/specs/2026-05-14-phase-5-t6-design.md))
  - [x] PR 1 — I10 timing-safe helper consolidation
  - [x] PR 2 — `tool_call_log` audit table (V29)
  - [x] PR 3 — `vec_items_1536` + per-type routing + reembed CLI (V30)
  - [x] PR 4 — Typed `dbRun` / `dbExec` migration (~163 sites)
```

Replace the four `T6 PR<N> ✅` entries in the `> **Last updated:**` header line at `roadmap.md:7` with a single consolidated `T6 ✅ (2026-05-16)` entry. Update the date to today.

- [ ] **Step 3: Commit**

```bash
git add docs/structure-audit/db-run-census.json docs/roadmap.md
git commit -m "$(cat <<'EOF'
docs(roadmap): T6 complete — close PR 4 + consolidate header (T6 PR 4)

- T6 PR 4 ✅ — typed dbRun/dbExec/dbStmtRun migration (163 sites, I14)
- T6 ✅ overall — all four PRs landed; header consolidates the per-PR
  ✅ entries into a single T6 ✅ (2026-05-16) line
- db-run-census.json refreshed (post-migration baseline)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Pre-PR verification + push

- [ ] **Step 1: Full CI parity**

Run: `bun run test:ci`

Expected: green. This runs the full suite + every coverage gate; matches `.github/workflows/_test-suite.yml`.

- [ ] **Step 2: Structure audit**

Run: `bun run audit:structure`

Expected: green. Catches any missed migration site.

- [ ] **Step 3: Lint**

Run: `bun run lint`

Expected: green.

- [ ] **Step 4: UI test parity**

Run: `cd packages/ui && bunx vitest run`

Expected: green. The UI suite is untouched but runs in `test:ci` parity.

- [ ] **Step 5: Push the branch and open the PR**

```bash
git push -u origin dev/asafgolombek/phase-5-t6-pr4-typed-db-run
gh pr create --title "feat(db): T6 PR 4 — route all writes through dbRun/dbExec/dbStmtRun (I14)" --body "$(cat <<'EOF'
## Summary

- Widens `dbRun` to return Bun's `RunResult` shape (`{ changes, lastInsertRowid }`).
- Adds `dbStmtRun(stmt, ...params)` for the three production prepared-statement hot loops (audit-chain backfill, embedding ingestion, perf-fixture seed).
- Migrates 94 `db.run` + 66 `db.exec` + 3 prepared-statement writes = 163 sites across 28 production files under `packages/gateway/src/`.
- Promotes static-audit rule `D12` from census to binary — `bun run audit:invariants` fails on any direct `db.run(` / `db.exec(` outside `DB_RUN_EXEC_ALLOW_LIST` (one entry: the wrapper).
- Adds invariant `I14` to `docs/SECURITY-INVARIANTS.md` and `CLAUDE.md`; three runtime assertions in `security-invariants.test.ts`.
- Adds 8 representative-subsystem disk-full propagation integration tests.
- Roadmap: T6 PR 4 ✅; T6 overall ✅.

## Test plan

- [ ] `bun run test:ci` green (full-parity gate covering all 26 coverage thresholds)
- [ ] `bun run audit:structure` green (D10 + D11 + new D12 binary)
- [ ] `bun run audit:invariants` green
- [ ] `bun run lint` green
- [ ] `cd packages/ui && bunx vitest run` green
- [ ] Manual: `bun scripts/structure-audit/check-nimbus-invariants.ts --rule db-run-exec` exits 0
- [ ] Manual: `docs/structure-audit/db-run-census.json` shows only the wrapper's internal db.run/db.exec calls

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL returned. Reviewer can then run `/ultrareview` or `gh pr` as needed.

---

## Plan review disposition (`2026-05-16-phase-5-t6-pr4-typed-db-run-review.md`)

| Review § | Item | Disposition | Where in this plan |
| -------- | ---- | ----------- | ------------------ |
| 1 | Named-parameter (`{ $id: 1 }`) object bindings in `dbRun` | **DEFER** | Inherits design-spec §13 disposition (`2026-05-16-phase-5-t6-pr4-typed-db-run-design.md`). Verified via grep against `packages/gateway/src/` on 2026-05-16: zero call sites use object-form params. Positional `unknown[]` covers every shape. Adding object-form support is YAGNI and grows the signature without a real caller. Future need can extend the signature in a follow-up without breaking existing callers (since the union would only widen the parameter type). |
| 2 | Transaction-commit-time `SQLITE_FULL` not translated | **DEFER** | Inherits design-spec §11 risk 2 / §13 disposition. SQLite typically detects `SQLITE_FULL` at the individual statement level (page-write time) — `dbRun` / `dbExec` / `dbStmtRun` cover that path universally. The implicit `COMMIT` inside `db.transaction(() => { ... })()` is a known small gap, tracked for a follow-up "transaction-level disk-full" PR introducing `runInTransaction(db, fn)`. Adding a Task 11 test for the *unfixed* COMMIT-time case would document broken behavior; better to land the fix in the follow-up and add the test there. |
| 3 | Task 9 regex doesn't explicitly mention `this.db` / `ctx.db` | **FIX** | Updated Task 9 Step 3 to `/\b(?:this\.|ctx\.)?db\.(?:run|exec)\s*\(/` and added a `ctx.db.run` synthetic-file test case in Step 1. (The original `\bdb\.` form is functionally equivalent — `\b` matches between `.` and `d` — but the explicit prefix is clearer at audit-review time.) |
| 4 | Explicit `dbStmtRun` disk-full integration test | **NO ACTION** | Already covered twice: (a) Task 2's `dbStmtRun translates SQLITE_FULL into DiskFullError` is a wrapper-level live-DB test that fills a real `bun:sqlite` Database to `PRAGMA max_page_count = 4` and asserts `DiskFullError`; (b) Task 11's embedding test (`embedding: embedItem ... throws DiskFullError`) exercises `dbStmtRun(insertVec, ...)` and `dbStmtRun(insertChunk, ...)` end-to-end via `SqliteEmbeddingPipeline.embedItem`. Adding a third dedicated test would duplicate (a) without adding coverage. |
| 5 | `dbStmtRun` parameter handling for named bindings | **NO ACTION** | The variadic signature `dbStmtRun(stmt, ...params)` transparently supports object-form bindings: a call like `dbStmtRun(stmt, { $id: 1 })` packs `params = [{ $id: 1 }]`, and `stmt.run(...params)` becomes `stmt.run({ $id: 1 })` — `bun:sqlite` handles the object form natively. No call sites use this today (verified by reading the three prepared-statement sites: `runner.ts:283`, `pipeline.ts:86`/`89`, `perf-fixture.ts:100` all use positional varargs), so no test is added, but the helper does not block adopters. |

**Net effect on this plan:** one regex tightening in Task 9 (+ one new synthetic-file test case), plus this disposition section. No new tasks, no removed tasks. The two `DEFER` items inherit design-spec §13 disposition; the two `NO ACTION` items already have coverage in Tasks 2 and 11.

---

## Verification cheatsheet

If anything fails mid-plan, these commands localise the issue fast:

```bash
# Find any remaining direct db.run / db.exec in production:
bun scripts/structure-audit/check-nimbus-invariants.ts --rule db-run-exec

# Refresh the census diagnostic file:
bun run audit:db-run

# Typecheck a single file fast:
bun run typecheck

# Single-file test:
bun test packages/gateway/src/<path>.test.ts

# Full structure-audit (D10 + D11 + D12):
bun run audit:invariants

# Full CI parity (slow):
bun run test:ci
```
