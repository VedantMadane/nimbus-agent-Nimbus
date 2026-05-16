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

The migration is mechanical — 94 `db.run` + 66 `db.exec` = **160 single-line prefix edits across 28 production files** plus the wrapper signature widening — but it lands last in T6 specifically because it touches every package, and rebasing T6 PR 1/2/3 against it would be expensive.

## Section 1 — Scope (locked)

### In scope

- Wrapper signature change in `packages/gateway/src/db/write.ts`: `dbRun` returns Bun's `RunResult` (`ReturnType<Database["run"]>` — `{ changes: number; lastInsertRowid: number | bigint }`) instead of `void`. `dbExec` stays `void`. Translation logic in `handleWriteError` unchanged.
- Migration of every direct `db.run(` / `db.exec(` (including `this.db.` variants) in production code under `packages/gateway/src/` outside the wrapper itself. Total: **94 `db.run` + 66 `db.exec` = 160 sites across 28 files** as of 2026-05-16 (94-entry `docs/structure-audit/db-run-census.json` covers `db.run`; the 66 `db.exec` are 65 inside `index/migrations/runner.ts` + 1 in `perf/perf-fixture.ts`).
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
- Refactoring `db.transaction(() => { ... })()` shells — those are structural BEGIN/COMMIT wrappers, not write calls; the migration touches only the inner `db.run` / `db.exec` invocations.
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
```

`handleWriteError` already declares `never` so TypeScript accepts the missing return in the `catch` branch. No other helpers are added.

### Why mirror `Database["run"]`

Nine production sites today use `const r = db.run(...)` and read `r.changes` or `r.lastInsertRowid` (e.g. `setWatcherEnabled` at `automation/watcher-store.ts:80`, `tryPersistStart` at `engine/sub-agent.ts:17`, `pruneConnectorHealthHistory` at `connectors/health.ts:352`, `repair.ts:102` row-count checks). Returning Bun's native shape keeps the migration mechanical — a pure prefix edit — and avoids forking a Nimbus-owned type that re-derives the same fields.

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

### `packages/gateway/test/integration/db/disk-full-propagation.test.ts` (new)

Eight representative-subsystem propagation tests. Each test uses a real SQLite database with `PRAGMA max_page_count = N` set tiny, fills it to near-full with dummy data, then triggers a write through the subsystem's public function and asserts a `DiskFullError` is thrown:

```ts
describe("disk-full propagation through migrated stores", () => {
  it("sync: setNextSyncAt throws DiskFullError when disk is full", ...);
  it("people: insertPerson throws DiskFullError when disk is full", ...);
  it("automation: setWatcherEnabled throws DiskFullError when disk is full (also validates return-value path)", ...);
  it("connectors: appendHistory throws DiskFullError when disk is full", ...);
  it("engine: tryPersistStart throws DiskFullError when disk is full (validates lastInsertRowid path)", ...);
  it("embedding: pipeline upsert throws DiskFullError when disk is full", ...);
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

1. **Hidden non-mechanical wrinkle.** A `db.run` call site might have an unusual type annotation (`as any`, surrounding `Promise.resolve` shape) that fails to typecheck after the change. Mitigation: per-commit `bun run typecheck` keeps the iteration loop short.
2. **`db.exec` inside migration runner regresses BEGIN/COMMIT semantics.** Unlikely — `dbExec` is a pure delegation to `db.exec` with an exception translator. Mitigation: existing `runner-v*.test.ts` integration suite already exercises every migration end-to-end.
3. **Static-rule regex over-matches.** The regex `\b(?:this\.)?db\.(?:run|exec)\s*\(` could match irrelevant identifiers like `mydb.run(` if a user code created a local `db` variable that isn't a Database. Mitigation: the audit already runs only on `packages/gateway/src/` and the existing regex pattern has been stable across D10/D11; comment-stripping is reused.
4. **`audit-chain.ts` migration changes BLAKE3 chain semantics.** No — `dbRun` is a pass-through; the INSERT shape and parameters are unchanged. The chain construction in `computeAuditRowHash` and the surrounding read-prev/compute-hash logic are untouched.

### Rollback

Each commit is independent; revert any one without losing the others. The static-rule binary mode change (commit 4) can be reverted on its own to soften the gate temporarily, but the wrapper signature widening (commit 1) is forwards-compatible — reverting it alone would leave migrated sites that read `.changes` typed as `void` and fail the typecheck, so revert commits 2–3 first if needed.

## Section 12 — Cadence per T6 sequencing spec §4

1. Create worktree at `.worktrees/phase-5-t6-pr4-typed-db-run/` with branch `dev/asafgolombek/phase-5-t6-pr4-typed-db-run`.
2. **Writing-plans** handoff after this design is approved.
3. Subagent-driven execution per the plan.
4. PR opened against `main`. Reviewed via `gh pr` or `/ultrareview` where useful. Merged after green CI.
5. `docs/roadmap.md` updated as in §8.

## See also

- [T6 sequencing spec](./2026-05-14-phase-5-t6-design.md) §2 PR 4 — parent scope lock-in.
- [`docs/SECURITY-INVARIANTS.md`](../../SECURITY-INVARIANTS.md) — I1–I13 prior art; I14 row added by this PR.
- [`docs/structure-audit/db-run-census.json`](../../structure-audit/db-run-census.json) — 94-entry baseline (2026-05-16).
- [`packages/gateway/src/db/write.ts`](../../../packages/gateway/src/db/write.ts) — wrapper destination.
- [`scripts/structure-audit/check-nimbus-invariants.ts`](../../../scripts/structure-audit/check-nimbus-invariants.ts) — static-audit script that gets the D12 binary mode.
