# Phase 5 T6 PR 4 — Typed `dbRun` / `dbExec` Migration — Design

> **Status:** Draft for review
> **Author:** asafgolombek
> **Date:** 2026-05-16
> **Parent:** [T6 sequencing spec](./2026-05-14-phase-5-t6-design.md) §2 PR 4
> **Branch:** `dev/asafgolombek/phase-5-t6-pr4-typed-db-run`
> **Worktree:** `.worktrees/phase-5-t6-pr4-typed-db-run/`

## Purpose

T6 PR 4 closes Phase 5 Core item 5 ("B1 hardening + semantic layer prep"). Every production `db.run(` / `db.exec(` call site in the Gateway routes through `packages/gateway/src/db/write.ts`'s `dbRun` / `dbExec` wrapper, so `SQLITE_FULL` is universally translated to `DiskFullError` — no write path silently swallows a full disk.

A new structural invariant **I14** ("All SQLite write paths route through `dbRun` / `dbExec`") locks this in with the triple defense the project requires: production wiring (`db/write.ts`), docs entry (`SECURITY-INVARIANTS.md`), and enforcement (static-audit binary `D12` + runtime test in `security-invariants.test.ts`).

The migration is mechanical — 94 `db.run` + 66 `db.exec` + 3 prepared-statement writes = **163 single-line prefix edits across 28 production files** plus the wrapper signature widening (a new `dbStmtRun` helper for the prepared-statement sites) — but it lands last in T6 specifically because it touches every package, and rebasing T6 PR 1/2/3 against it would be expensive.

## Section 1 — Scope (locked)

### In scope

- Wrapper signature change in `packages/gateway/src/db/write.ts`: `dbRun` returns Bun's `RunResult` (`ReturnType<Database["run"]>` — `{ changes: number; lastInsertRowid: number | bigint }`) instead of `void`. `dbExec` stays `void`. Translation logic in `handleWriteError` unchanged.
- New helper `dbStmtRun(stmt, ...params)` in `db/write.ts` wraps `Statement.run(...)` with the same `handleWriteError` translation, so prepared-statement writes in hot loops keep their per-iteration prepare-avoidance perf characteristic while gaining `DiskFullError` propagation. Three production sites migrate to it (§3).
- Migration of every direct `db.run(` / `db.exec(` (including `this.db.` variants) in production code under `packages/gateway/src/` outside the wrapper itself. Total: **94 `db.run` + 66 `db.exec` + 3 prepared-statement `.run()` = 163 sites across 28 files** as of 2026-05-16 (94-entry `docs/structure-audit/db-run-census.json` covers `db.run`; the 66 `db.exec` are 65 inside `index/migrations/runner.ts` + 1 in `perf/perf-fixture.ts`; the 3 prepared-statement writes are listed in §3).
- Static-audit rule `D12` in `scripts/structure-audit/check-nimbus-invariants.ts` graduates from census (always exit 0) to binary (exits 1 on hit outside allow-list). `bun run audit:invariants` becomes the CI gate.
- New invariant **I14** in `docs/SECURITY-INVARIANTS.md` + matching row in `CLAUDE.md`.
- Runtime assertions in `packages/gateway/src/security-invariants.test.ts` covering import-site presence, three representative spot-checks, and the allow-list constant.
- Eight representative-subsystem disk-full propagation integration tests in `packages/gateway/test/integration/db/disk-full-propagation.test.ts`.
- Roadmap update: flip T6 PR 4 sub-checkbox, flip top-level T6 row, consolidate per-PR header entries into `T6 ✅ (<date>)`.

### Out of scope

- Test files (already excluded by `iterateSourceFiles()` in the audit script).
- `packages/cli/src/` — zero `db.run` / `db.exec` hits; the CLI never opens the database directly.
- `packages/mcp-connectors/*` — connectors have no DB access by design.
- `packages/sdk/`, `packages/client/`, `packages/ui/`, `packages/vscode-extension/` — none touch SQLite directly.
- Refactoring `db.transaction(() => { ... })()` shells — those are structural BEGIN/COMMIT wrappers, not write calls; the migration touches only the inner `db.run` / `db.exec` invocations. Implicit-COMMIT-time `SQLITE_FULL` is a known small gap (§11.2) — deferred to a follow-up.
- Named-parameter (`{ $id: ... }`) bindings in `dbRun` — no production site uses object-form params (verified via grep, 2026-05-16); positional `unknown[]` matches every call shape in the codebase. Adding object-form support is YAGNI for this PR.
- Read-path prepared statements (`db.prepare(...).get()` / `.all()` / `.values()` / `.iterate()`) — reads cannot hit `SQLITE_FULL`; `dbStmtRun` covers writes only.
- Any new behaviour beyond the wrapper change. Pure mechanical refactor.
- `WRITE_ROUTE_ALLOWLIST` (invariant I13) — unchanged; HTTP write surface is orthogonal to the SQL-write surface.
- Retention / pruning policies for any of the affected tables.

## Section 2 — Wrapper signature change

### Before (current state)

```ts
// packages/gateway/src/db/write.ts
export function dbRun(db: Database, sql: string, params?: unknown[]): void { ... }
export function dbExec(db: Database, sql: string): void { ... }
```

### After

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

export function dbExec(db: Database, sql: string): void { ... }   // unchanged

// New: prepared-statement write wrapper. Variadic to match Bun's `Statement.run`.
export function dbStmtRun<S extends { run: (...args: unknown[]) => unknown }>(
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

`handleWriteError` already declares `never` so TypeScript accepts the missing return in the `catch` branch. `dbStmtRun` is the third (and final) helper.

### Why mirror `Database["run"]`

Nine production sites today use `const r = db.run(...)` and read `r.changes` or `r.lastInsertRowid` (e.g. `setWatcherEnabled` at `automation/watcher-store.ts:80`, `tryPersistStart` at `engine/sub-agent.ts:17`, `pruneConnectorHealthHistory` at `connectors/health.ts:352`, `repair.ts:102` row-count checks). Returning Bun's native shape keeps the migration mechanical — a pure prefix edit — and avoids forking a Nimbus-owned type that re-derives the same fields.

### Why `dbStmtRun` exists (and is not just inline `dbRun`)

Three production sites use `db.prepare(...).run(...)` inside hot loops:

- `index/migrations/runner.ts:283` — `backfillAuditChain` UPDATE re-run per audit-log row (one-shot during V18 migration; thousands of rows on existing installs).
- `embedding/pipeline.ts:86,89` — `insertVec` and `insertChunk` re-run per chunk during embedding ingestion (every indexed item; latency-sensitive).
- `perf/perf-fixture.ts:100` — bench-fixture INSERT re-run per synthetic item (1k+ per call for the medium tier).

Converting these to `dbRun(db, sql, params)` would force `bun:sqlite` to prepare-and-finalize the statement on every iteration — a measurable regression for ingestion latency and migration time. `dbStmtRun` preserves the prepared-statement performance while making `SQLITE_FULL` translation universal for prepared writes.

The variadic generic signature mirrors `Statement.run`'s native shape (which accepts positional bind values, including `Float32Array` / `BigInt`, not arrays) — required because `pipeline.ts:102` calls `insertVec.run(BigInt(rowid), new Float32Array(vec))` with mixed-type positional args.

## Section 3 — Migrated files (production hit-list)

The full list from `docs/structure-audit/db-run-census.json` (`db.run` hits) plus the `db.exec` survey (`Grep`-confirmed, 2026-05-16):

| Subsystem | File | Hits |
| --- | --- | --- |
| sync | `sync/scheduler-store.ts` | 8 |
| people | `people/person-store.ts`, `people/linker.ts`, `people/prune.ts` | 13 |
| memory | `memory/session-memory-store.ts` | 4 |
| llm | `llm/registry.ts` | 2 |
| ipc | `ipc/http-server.ts` | 1 |
| index | `index/item-store.ts`, `index/local-index.ts` | ~14 |
| index/migrations | `index/migrations/runner.ts` | 3 `db.run` + 65 `db.exec` (inner calls inside `db.transaction(...)` shells) |
| graph | `graph/graph-populator.ts`, `graph/relationship-graph.ts` | 4 |
| engine | `engine/sub-agent.ts` | 3 |
| embedding | `embedding/pipeline.ts`, `embedding/routing-pipeline.ts` | 5 |
| db | `db/audit-chain.ts`, `db/repair.ts`, `db/snapshot.ts`, `db/verify.ts` | 11 |
| connectors | `connectors/health.ts`, `connectors/remove-intent.ts`, `connectors/user-mcp-store.ts`, `connectors/openapi-indexer-sync.ts`, `connectors/obsidian-sync.ts` | ~10 |
| automation | `automation/extension-store.ts`, `automation/watcher-store.ts`, `automation/workflow-run-history.ts`, `automation/workflow-store.ts` | ~15 |
| deployment | `deployment/annotate.ts` | 1+ |
| platform | `platform/assemble.ts` | 1 |
| perf | `perf/perf-fixture.ts` | 2 + 1 |

### Prepared-statement writes (migrate to `dbStmtRun`)

| File | Line | Statement | Loop context |
| --- | --- | --- | --- |
| `index/migrations/runner.ts` | 283 | `db.prepare(\`UPDATE audit_log SET row_hash = ?, prev_hash = ? WHERE id = ?\`)` | `backfillAuditChain` per-row in V18 migration |
| `embedding/pipeline.ts` | 86 | `db.prepare(\`INSERT INTO ${vecTable}(rowid, embedding) VALUES (?, vec_f32(?))\`)` | inside `db.transaction()` per-chunk loop |
| `embedding/pipeline.ts` | 89 | `db.prepare(\`INSERT INTO embedding_chunk ...\`)` | inside `db.transaction()` per-chunk loop |
| `perf/perf-fixture.ts` | 100 | `db.prepare(\`INSERT INTO item ...\`)` | per-synthetic-item loop in `buildSyntheticIndex` |

The call form changes from `stmt.run(...)` → `dbStmtRun(stmt, ...)`. The `db.prepare(...)` declaration line itself is unchanged.

The implementation plan will enumerate the exact per-site edits; this design locks the scope.

### Allow-list

Compile-time constant in `scripts/structure-audit/check-nimbus-invariants.ts`:

```ts
const DB_RUN_EXEC_ALLOW_LIST = [
  "packages/gateway/src/db/write.ts",   // the wrapper itself
] as const;
```

One entry. `db.transaction(() => { ... })()` does not match the `db.(run|exec)(` regex, so the migration runner needs no exemption — its inner `db.run` / `db.exec` calls all migrate to `dbRun` / `dbExec`.

## Section 4 — Mechanical migration shape

The edit per site is purely textual. Three forms cover everything:

```ts
// Form 1 — no params, ignored result
-  db.run("PRAGMA foreign_keys = ON");
+  dbRun(db, "PRAGMA foreign_keys = ON");

// Form 2 — params, ignored result
-  db.run(`DELETE FROM watcher WHERE id = ?`, [id]);
+  dbRun(db, `DELETE FROM watcher WHERE id = ?`, [id]);

// Form 3 — params, result read (changes / lastInsertRowid)
-  const r = db.run(`UPDATE watcher SET enabled = ? WHERE id = ?`, [enabled ? 1 : 0, id]);
+  const r = dbRun(db, `UPDATE watcher SET enabled = ? WHERE id = ?`, [enabled ? 1 : 0, id]);

// db.exec variant (no parameters)
-  db.exec(INITIAL_SCHEMA_SQL);
+  dbExec(db, INITIAL_SCHEMA_SQL);

// Form 4 — prepared-statement write (variadic positional args)
-  insertVec.run(BigInt(rowid), new Float32Array(vec));
+  dbStmtRun(insertVec, BigInt(rowid), new Float32Array(vec));
```

`this.db.run(...)` → `dbRun(this.db, ...)`. Equivalent prefix transformation.

Each migrated file adds one import (path adjusted per file depth):

```ts
import { dbExec, dbRun } from "../db/write.ts";
```

### Tactic

Hand-edited, file-by-file (not script-driven). A regex-replace could land most of it, but file-by-file editing preserves the chance to spot non-mechanical wrinkles (a wrapped result currently typed `any`, a `db.run` inside a Promise callback where types shift, etc.). Each commit is reviewable independently.

## Section 5 — Static-audit rule (D12 promoted to binary)

`scripts/structure-audit/check-nimbus-invariants.ts` currently has a `db-run` rule that produces `docs/structure-audit/db-run-census.json` and always exits 0 (census mode). PR 4 changes that:

- Rename `collectDbRunCensus()` → `findDirectDbRunExec()` and broaden the regex from `\bdb\.run\s*\(` to `\b(?:this\.)?db\.(?:run|exec)\s*\(`.
- Add the new `DB_RUN_EXEC_ALLOW_LIST` constant (§3).
- Keep the existing `--rule db-run` mode for diagnostics — it still writes the census JSON and exits 0. This is the diagnostic surface for future regressions and for refreshing the baseline.
- Add a new binary mode: `--rule db-run-exec` and inclusion in `--binary-only` + `all`. Both fail with exit 1 when the production hit list is non-empty after allow-listing.
- Reporting follows the existing D10/D11 GitHub Actions format:
  ```
  ::error file=packages/gateway/src/sync/scheduler-store.ts,line=53::D12 direct db.run/db.exec outside allow-list: db.run(
  ```
- `package.json`'s `audit:invariants` script (already `--binary-only`) inherits the new D12 binary check. The structure-audit orchestrator `bun run audit:structure` runs `audit:invariants` and so picks up the gate.

The census `docs/structure-audit/db-run-census.json` is rewritten by PR 4 with an empty array (no hits remain), and the existing CI step `audit:db-run` continues to refresh it.

## Section 6 — Invariant I14

### `docs/SECURITY-INVARIANTS.md`

New row in the I-table, with full rationale in the body section per the file's existing style:

| # | Invariant | Wired at | Anti-pattern |
| --- | --- | --- | --- |
| I14 | All SQLite write paths route through `dbRun` / `dbExec` so `SQLITE_FULL` is universally translated to `DiskFullError` | `db/write.ts` (`dbRun`, `dbExec`); enforced by static rule `D12` in `scripts/structure-audit/check-nimbus-invariants.ts` | Direct `db.run(` or `db.exec(` outside the wrapper allow-list — including in `audit-chain.ts`, store helpers, or new connectors |

### `CLAUDE.md`

The invariants table at the top of `CLAUDE.md` gets the same row appended. (`CLAUDE.md` already mirrors I1–I13 from `SECURITY-INVARIANTS.md`.)

### Runtime enforcement — `packages/gateway/src/security-invariants.test.ts`

Three assertions for I14:

1. **Import-site grep across all migrated files.** Read each file in the migrated-list constant and assert it imports `dbRun` or `dbExec` from `db/write.ts`. Detects "someone removed the import and reverted to `db.run` in this file."

2. **Spot-check on three representative subsystems.** For `automation/watcher-store.ts`, `engine/sub-agent.ts`, and `db/audit-chain.ts`: assert the file contains at least one `dbRun(` / `dbExec(` call AND zero direct `db.run(` / `db.exec(` calls. Detects partial reversion.

3. **Allow-list constant shape.** Read `DB_RUN_EXEC_ALLOW_LIST` from `check-nimbus-invariants.ts` (via dynamic import) and assert it equals `["packages/gateway/src/db/write.ts"]`. Detects "someone added their file to the allow-list to silence the audit."

Together these three runtime assertions plus the static `D12` binary rule provide the triple-rule lock-in (production wiring at `db/write.ts` + docs entry in `SECURITY-INVARIANTS.md` + enforcement test). Matches the shape used by I1 (spawn invariant: static `D10` + runtime test).

## Section 7 — Tests

Three deltas to the test suite:

### `packages/gateway/src/db/write.test.ts`

- Existing SQLITE_FULL translation tests stay (already cover the wrapper-level behavior).
- Add one test asserting `dbRun` returns `{ changes, lastInsertRowid }` for a normal INSERT (validates the signature widening).
- Add one test asserting `dbStmtRun` translates SQLITE_FULL → `DiskFullError` for a prepared INSERT, and returns Bun's `RunResult` shape on success.

### `packages/gateway/test/integration/db/disk-full-propagation.test.ts` (new)

Eight representative-subsystem propagation tests. Each test uses a real SQLite database with `PRAGMA max_page_count = N` set tiny, fills it to near-full with dummy data, then triggers a write through the subsystem's public function and asserts a `DiskFullError` is thrown:

```ts
describe("disk-full propagation through migrated stores", () => {
  it("sync: setNextSyncAt throws DiskFullError when disk is full", ...);
  it("people: insertPerson throws DiskFullError when disk is full", ...);
  it("automation: setWatcherEnabled throws DiskFullError when disk is full (also validates return-value path)", ...);
  it("connectors: appendHistory throws DiskFullError when disk is full", ...);
  it("engine: tryPersistStart throws DiskFullError when disk is full (validates lastInsertRowid path)", ...);
  it("embedding: pipeline upsert (via dbStmtRun on the prepared insertVec / insertChunk) throws DiskFullError when disk is full", ...);
  it("index: upsertIndexedItem throws DiskFullError when disk is full", ...);
  it("audit: appendAuditEntry throws DiskFullError when disk is full (load-bearing — audit chain must not silently break)", ...);
});
```

Each test independently sets up a fresh tiny DB. Estimated wall-clock: ~50ms each, ~400ms total.

### Static-rule unit test

Either extend `scripts/structure-audit/check-nimbus-invariants.test.ts` (if it exists) or add a new test file alongside, asserting:
- The rule fires on a synthetic file containing `db.run(` outside the allow-list (and exits 1 in binary mode).
- The rule is silent on `db/write.ts`.
- The allow-list constant exists and contains exactly the wrapper path.

### Coverage gates

No coverage gate is changed. Engine, vault, db, automation, connectors, embedding, sync, rate-limiter, people, embedding, workflow, watcher, health, config, client, telemetry, doctor, tui, mcp, sdk, updater, lan, perf, metrics, preflight, deployment — every existing gate stays at its current threshold because the migration is mechanical and the call counts inside each file are unchanged. `bun run test:ci` parity is the full gate.

## Section 8 — Docs + skill updates

- **`docs/SECURITY-INVARIANTS.md`** — new I14 row + rationale section.
- **`CLAUDE.md`** — I14 row appended to the invariants table.
- **`docs/architecture.md`** — one-sentence note in the SQLite / db section that all writes go through `dbRun` / `dbExec`.
- **`.claude/commands/nimbus-db-migrations.md`** — update the "Large Backfill Pattern" example so the snippet uses `dbRun` instead of `db.run`, and add a one-line rule in the "New Table Checklist" section.
- **`docs/roadmap.md`** — flip T6 PR 4 sub-checkbox to `[x]`, flip top-level T6 row to `[x]`, consolidate the four `T6 PR<N> ✅` entries in the header into a single `T6 ✅ (<date>)`.

No new docs files created. Skill files `nimbus-security-invariants.md` and `nimbus-db-migrations.md` cover the relevant patterns already; the I14 update inherits naturally from the invariants-table mirror.

## Section 9 — Commit decomposition

~5 reviewable commits:

1. **`feat(db): widen dbRun to return RunResult`** — `db/write.ts` signature change + `db/write.test.ts` update.
2. **`refactor(db): migrate audit-chain, repair, snapshot, verify to dbRun/dbExec`** — `db/` subsystem.
3. **`refactor: migrate stores to dbRun/dbExec`** — sync, people, memory, llm, ipc, index, index/migrations/runner, graph, engine, embedding, connectors, automation, deployment, platform, perf. One large mechanical commit; biome auto-format may follow as a fixup.
4. **`feat(audit): D12 promoted to binary; I14 wired`** — `scripts/structure-audit/check-nimbus-invariants.ts` + `security-invariants.test.ts` + docs (`SECURITY-INVARIANTS.md`, `CLAUDE.md`, `architecture.md`, `nimbus-db-migrations` skill).
5. **`test(db): disk-full propagation across 8 representative subsystems`** — new integration test.

Roadmap edit (`docs/roadmap.md`) lands as a final commit on the branch just before merge, mirroring T6 PR 3.

## Section 10 — Pre-merge checklist

- `bun run typecheck` — green.
- `bun run lint` — green (biome).
- `bun run audit:invariants` — green (D10 + D11 + new D12 binary).
- `bun run audit:structure` — green.
- `bun run test:ci` — green (full-parity gate; covers all 26 coverage thresholds).
- `cd packages/ui && bunx vitest run` — green (UI Vitest gate stays untouched but runs in CI parity).
- Manual sanity: `bun run audit:db-run` still produces a census file, now containing an empty array.

## Section 11 — Risks + rollback

### Risks

1. **Hidden non-mechanical wrinkle.** A `db.run` call site might have an unusual type annotation (`as any`, surrounding `Promise.resolve` shape) that fails to typecheck after the change. Mitigation: per-commit `bun run typecheck` keeps the iteration loop short. The variadic `dbStmtRun` generic also needs care for sites where `Statement.run`'s parameter shape is intentionally narrowed by an upstream type assertion — file-by-file editing is the response.
2. **Known small gap: implicit-COMMIT `SQLITE_FULL` inside `db.transaction(...)()`.** SQLite typically detects `SQLITE_FULL` at the individual statement level (page-write time), and the per-statement `dbRun` / `dbExec` wrappers cover that path. But the implicit `COMMIT` that fires when the transaction callback returns is not routed through any wrapper — if SQLite defers a page write to COMMIT (rare; primarily WAL-mode journal-checkpoint contention), the raw error escapes `db.transaction(() => { ... })()` without setting `_diskSpaceWarning`. Quantified gap: ~50 transaction call sites across the gateway. Mitigation: deferred to a follow-up "transaction-level disk-full" PR that introduces `runInTransaction(db, fn)` wrapping `db.transaction(fn)()` in a try/catch. Acceptable for this PR because (a) per-statement detection covers the common case, (b) adding the wrapper would balloon the mechanical edit scope, and (c) the existing `db/health.ts` disk-space poller catches the global state independently.
3. **`db.exec` inside migration runner regresses BEGIN/COMMIT semantics.** Unlikely — `dbExec` is a pure delegation to `db.exec` with an exception translator. Mitigation: existing `runner-v*.test.ts` integration suite already exercises every migration end-to-end.
4. **Static-rule regex over-matches.** The regex `\b(?:this\.)?db\.(?:run|exec)\s*\(` could match irrelevant identifiers like `mydb.run(` if a user code created a local `db` variable that isn't a Database. Mitigation: the audit already runs only on `packages/gateway/src/` and the existing regex pattern has been stable across D10/D11; comment-stripping is reused.
5. **Static rule does not catch prepared-statement writes (`stmt.run(...)` where `stmt` is `db.prepare(...)`).** The D12 binary regex only flags `db.run(` / `db.exec(` — a future contributor who adds a new prepared-statement write outside `dbStmtRun` will not trip the gate. Mitigation: documented as a known limitation. The three current sites are explicitly migrated; the disk-full propagation test on `embedding/pipeline.ts` exercises `dbStmtRun` end-to-end so any reversion fails the integration suite. A future audit pass can add an AST-level lint if regressions appear.
6. **`audit-chain.ts` migration changes BLAKE3 chain semantics.** No — `dbRun` is a pass-through; the INSERT shape and parameters are unchanged. The chain construction in `computeAuditRowHash` and the surrounding read-prev/compute-hash logic are untouched.

### Rollback

Each commit is independent; revert any one without losing the others. The static-rule binary mode change (commit 4) can be reverted on its own to soften the gate temporarily, but the wrapper signature widening (commit 1) is forwards-compatible — reverting it alone would leave migrated sites that read `.changes` typed as `void` and fail the typecheck, so revert commits 2–3 first if needed.

## Section 12 — Cadence per T6 sequencing spec §4

1. Create worktree at `.worktrees/phase-5-t6-pr4-typed-db-run/` with branch `dev/asafgolombek/phase-5-t6-pr4-typed-db-run`.
2. **Writing-plans** handoff after this design is approved.
3. Subagent-driven execution per the plan.
4. PR opened against `main`. Reviewed via `gh pr` or `/ultrareview` where useful. Merged after green CI.
5. `docs/roadmap.md` updated as in §8.

## Section 13 — Review disposition (`2026-05-16-phase-5-t6-pr4-typed-db-run-design-review.md`)

| Review § | Item | Disposition | Where in this spec |
| -------- | ---- | ----------- | ------------------ |
| 1 | Object-form (named-parameter) bindings in `dbRun` | **DEFER** | §1 "Out of scope" — verified via `grep db\.run\s*\([^,)]+,\s*\{` against `packages/gateway/src/` (2026-05-16): zero production call sites use object-form params. Positional `unknown[]` matches every existing shape. Adding object-form support is YAGNI; future need can extend the signature in a follow-up. |
| 2 | `db.prepare(...).run()` bypasses `dbRun` | **FIX** | §1 in-scope adds `dbStmtRun(stmt, ...params)`; §2 specifies the variadic generic shape; §3 lists the three production prepared-write sites (`runner.ts:283`, `pipeline.ts:86`/`89`, `perf-fixture.ts:100`); §4 adds Form 4 for the call-site shape; §7 adds wrapper test + extends the embedding propagation test to exercise `dbStmtRun`; §11 risk 5 documents the static rule's reach limitation. |
| 3 | Implicit-COMMIT `SQLITE_FULL` inside `db.transaction(...)()` | **DEFER** | §11 risk 2 documents this as a known small gap with rationale (page-write `SQLITE_FULL` is the common case and is covered per-statement; COMMIT-time failures are rare and would already have surfaced as per-statement errors). Tracked for a follow-up "transaction-level disk-full" PR that introduces `runInTransaction(db, fn)`. |
| 4 | Result-type-shift in callbacks | **NO ACTION** | Already covered in §4 "Tactic" — file-by-file editing is the response. Confirmation only. |

**Net effect on this spec:** one wrapper added (`dbStmtRun`), three prepared-statement sites added to §3, one new form in §4, one new wrapper test + one extended propagation test in §7, two new entries in §11 risks (one for COMMIT-time gap, one for the static-rule reach limitation), plus this §13 disposition table. Total site count moves from 160 → 163.

## See also

- [T6 sequencing spec](./2026-05-14-phase-5-t6-design.md) §2 PR 4 — parent scope lock-in.
- [`docs/SECURITY-INVARIANTS.md`](../../SECURITY-INVARIANTS.md) — I1–I13 prior art; I14 row added by this PR.
- [`docs/structure-audit/db-run-census.json`](../../structure-audit/db-run-census.json) — 94-entry baseline (2026-05-16).
- [`packages/gateway/src/db/write.ts`](../../../packages/gateway/src/db/write.ts) — wrapper destination.
- [`scripts/structure-audit/check-nimbus-invariants.ts`](../../../scripts/structure-audit/check-nimbus-invariants.ts) — static-audit script that gets the D12 binary mode.
- [`2026-05-16-phase-5-t6-pr4-typed-db-run-design-review.md`](./2026-05-16-phase-5-t6-pr4-typed-db-run-design-review.md) — review feedback dispositioned in §13.
