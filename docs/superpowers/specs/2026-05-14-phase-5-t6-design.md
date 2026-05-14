# Phase 5 T6 — B1 Hardening + Semantic Layer Prep — Sequencing Design

> **Status:** Draft for review
> **Author:** asafgolombek
> **Date:** 2026-05-14
> **Type:** Plan-of-plans (T6) — locks the order of four PRs that constitute Phase 5 Core item 5. Each PR gets its own spec → plan → implementation cycle when it reaches the head of the queue.

## Purpose

Phase 5 Core item 5 ([sequencing spec §2 row 5](./2026-05-06-phase-5-sequencing-design.md#phase-5-core-committed-in-this-order)) bundles four discrete sub-items under "B1 hardening + semantic layer prep":

1. **Typed `dbRun` / `dbExec` migration** across the ~79 production `db.run()` call sites so every SQL execution path routes through `db/write.ts`'s `SQLITE_FULL` → `DiskFullError` translation.
2. **`tool_call_log` audit table** for structured MCP-tool-call result auditing (B1 audit follow-up S8-F10) — complements the `<tool_output>` envelope (invariant I11) by recording the envelope's contents at audit time.
3. **`vec_items_1536` multi-model embedding** — add the 1536-dim virtual table for OpenAI `text-embedding-3-small` alongside the existing 384-dim MiniLM table, plus per-item-type model routing and a `nimbus index reembed --model <id>` CLI for selective backfill.
4. **Centralise timing-safe compare helpers** — finish the I10 consolidation by migrating `ipc/lan-pairing.ts`'s local `timingSafeEqual` and `ipc/http-auth.ts`'s local `constantTimeStringEqual` into one canonical util helper.

T6 is bridge work between T4 (CI/CD data layer, merged 2026-05-14) and T2 (sandbox + Marketplace v2 — Phase 5's largest single block). The parent sequencing spec names sub-item #1 as the load-bearing reason T6 precedes T2: the typed-`dbRun` migration touches every package, and is much cheaper to land before T2 expands the surface than after.

This document:

1. Locks the order in which the four sub-items ship as four sequential PRs.
2. Defines per-PR scope, exit criteria, and out-of-scope items so each PR can be picked up without re-reading the whole T6 thread.
3. Documents cross-cutting concerns (invariant interactions, coverage gates, migration numbering, platform equality).

Per-PR implementation specs are written when each PR reaches the head of the queue — not pre-specced now. This matches the parent sequencing spec's rule for Extended waves.

## Section 1 — PR Order (locked)

Strict serial. Smallest-first. Mega-PR last. The parent sequencing spec's hybrid rule ("cheapest × graph-payoff") adapts here to "cheapest × foundation-payoff": each later PR is incrementally bigger; the typed-`dbRun` migration lands last so it conflicts with nothing else in T6.

| # | PR branch                         | Sub-item                                                       | Size estimate | Touchpoints                                                                                                            |
| - | --------------------------------- | -------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1 | `phase-5-t6-pr1-i10-helpers`      | I10 timing-safe helper consolidation                           | Smallest      | ~4 files: `util/hex-compare.ts`, `ipc/lan-pairing.ts`, `ipc/http-auth.ts`, `security-invariants.test.ts`, `docs/SECURITY-INVARIANTS.md` |
| 2 | `phase-5-t6-pr2-tool-call-log`    | `tool_call_log` audit table (V29)                              | Medium        | New migration + 2 wiring sites + new IPC method + tests                                                                |
| 3 | `phase-5-t6-pr3-vec-items-1536`   | `vec_items_1536` + per-type routing + reembed CLI (V30)        | Medium-large  | New migration + `embedding/pipeline.ts` routing + new CLI subcommand + tests                                           |
| 4 | `phase-5-t6-pr4-typed-dbrun`      | Typed `dbRun` / `dbExec` migration (~79 sites)                 | Largest       | Every package touching SQLite write paths + new static-audit rule                                                      |

### Ordering rationale

- **PR 1 first** because it's the smallest, most contained change. Warming up T6 with a tight PR matches the T4-wrap-up cadence (single-file enrichment + tests + roadmap close in one PR).
- **PR 2 next** to land the audit complement to I11 before T2 introduces new sandbox-exposed tool surfaces. The audit table needs to exist before T2's permission system has anything new to log.
- **PR 3 third** so per-item-type embedding routing exists before T2's Marketplace v2 introduces extensions that may declare their own item types and embedding preferences. Marketplace v2 extensions then have a clean routing surface to opt into.
- **PR 4 last** because it touches every package. Landing it last means it conflicts with nothing in T6; if PR 4 landed first, every subsequent T6 PR would have to rebase against ~79 mechanical edits.

### Alternative orderings considered and rejected

- **Foundation-first** (`#1 → #4 → #2 → #3`): would mean PR 2 and PR 3's new write paths use `dbRun` from day one. Rejected because (a) the `dbRun` / `dbExec` helpers already exist in `db/write.ts` — PR 2 and PR 3 adopt them for new write paths without PR 4 having migrated existing sites yet; and (b) PR 4's review burden going first delays T6's first user-visible-value PR significantly.
- **Schema-migrations first** (`#2 → #3 → #4 → #1`): lands both V<N> migrations contiguously. Rejected because it starts T6 with the second-biggest PR rather than the smallest, losing the warmup. The V29 / V30 numbering doesn't change either way — these are pre-claimed in §3.

## Section 2 — Per-PR scope

Per-PR specs are written when each PR reaches the head of the queue. The scope sketches below lock the boundaries of each PR.

### PR 1 — I10 helper consolidation

**Goal.** Invariant I10 has one wiring site (the util module) instead of three local helper definitions.

**Current state (verified 2026-05-14).** `util/hex-compare.ts` exports `sha256HexEqualConstantTime` (64-char SHA-256 hex). Both `extensions/verify-extensions.ts` and `updater/updater.ts` already import from it — no change needed there. Two files still ship local helpers:

- `ipc/lan-pairing.ts:59-66` — a local string `timingSafeEqual` (codePoint-XOR loop).
- `ipc/http-auth.ts:41-53` — a local `constantTimeStringEqual` (Buffer-based, with equal-length burn-cycle for length-mismatch).

**Touchpoints.**

- Rename `util/hex-compare.ts` → `util/timing-safe-compare.ts` (the broader name reflects the module's expanded purpose — was true even at single-helper scope, accurate now with the string variant landing). Existing `sha256HexEqualConstantTime` export keeps its name; new canonical `constantTimeStringEqual(a: string, b: string): boolean` export added alongside. Buffer-based, with length-mismatch burn cycle to match the defensive shape of `http-auth.ts`'s helper.
- Migrate `ipc/lan-pairing.ts`: delete the local helper, import the canonical one. Pairing-code comparison semantics preserved (UTF-8 byte compare).
- Migrate `ipc/http-auth.ts`: delete the local helper, import the canonical one. Bearer-token compare semantics preserved.
- Update `docs/SECURITY-INVARIANTS.md` I10 row: "Wired at" column becomes the single util module; "anti-pattern" column extended to ban local re-definitions outside the util module.
- Extend `packages/gateway/src/security-invariants.test.ts`: assert `ipc/lan-pairing.ts` and `ipc/http-auth.ts` import from the util module (greps for the import line). Existing assertions for `sha256HexEqualConstantTime` stay.

**Out of scope.**

- New I-numbered invariants.
- Renaming the existing `sha256HexEqualConstantTime` helper (only the file moves; the export name stays so existing callers don't churn).
- Migrating the I10 wiring at `verify-extensions.ts` / `updater.ts` (already correct — import path updates only).

**Exit criteria.**

- Zero local `timingSafeEqual` / `constantTimeStringEqual` definitions outside the util module in production code.
- I10 row in `SECURITY-INVARIANTS.md` names one wiring site.
- `bun run test:ci` green.

### PR 2 — `tool_call_log` audit table (V29)

**Goal.** Structurally record every LLM-facing MCP-tool call's `<tool_output>` envelope so I11's defense is auditable post-hoc. Complement to I11 (the envelope), not a replacement.

**Migration number.** V29 — the latest on `main` is V28 (`deployment-v28-sql.ts` from T4 PR 3b, 2026-05-14).

**Touchpoints.**

- New `packages/gateway/src/index/tool-call-log-v29-sql.ts` exporting the schema (locked in PR 2's per-PR spec — sketch below):

  ```sql
  CREATE TABLE IF NOT EXISTS tool_call_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      TEXT NOT NULL,
    tool_id         TEXT NOT NULL,
    service         TEXT NOT NULL,
    called_at       INTEGER NOT NULL,
    duration_ms     INTEGER,
    result_envelope TEXT NOT NULL,
    status          TEXT NOT NULL CHECK(status IN ('ok','error')),
    audit_log_id    INTEGER REFERENCES audit_log(id)
  );

  CREATE INDEX IF NOT EXISTS idx_tool_call_log_session   ON tool_call_log(session_id);
  CREATE INDEX IF NOT EXISTS idx_tool_call_log_tool_time ON tool_call_log(tool_id, called_at);
  CREATE INDEX IF NOT EXISTS idx_tool_call_log_called_at ON tool_call_log(called_at);
  ```

- Migration runner wiring in `packages/gateway/src/index/migrations/runner.ts`.
- Audit write at the two `wrapToolOutput` sites: `engine/agent.ts:wrapToolForLlm` (lines 28–41) and `connectors/lazy-mesh/mesh.ts:397`. After wrapping, write a `tool_call_log` row via `dbRun`. `duration_ms` is wall-clock from tool invocation to envelope emission.
- New IPC method `audit.toolCalls` in a new `packages/gateway/src/ipc/audit-rpc.ts` — read-only, available to LAN peers per the `index.*` / `status.*` pattern. Pagination via `(since, limit)` parameters. **Not added to Tauri `ALLOWED_METHODS`** until UI demand emerges (forbidden-namespace defense-in-depth — see `nimbus-tauri-allowlist`).
- Extension to the I11 enforcement test: at both wiring sites the test now asserts both the envelope wrap AND the `tool_call_log` row write.

**Out of scope.**

- Planner-side dispatch logging — the HITL gate already writes to `audit_log` via `audit-chain.ts`; this PR records the LLM-facing surface gap specifically.
- CLI command — deferred until a real consumer exists. The `audit.toolCalls` IPC method is sufficient.
- Tauri allowlist edits.
- New I-numbered invariant — the audit table strengthens I11's existing assertion rather than introducing a new defense.
- **Retention policy** — deferred to a follow-up "System Maintenance" PR. The table grows unbounded by design in this PR; PR 2's per-PR spec opens a tracked roadmap follow-up for a configurable retention window (e.g. `[audit].tool_call_log_retention_days`, default 90) plus the scheduled prune. Audit-table growth is real for high-traffic agents but the audit semantics need to land before the maintenance policy is designed against them.

**Exit criteria.**

- Every LLM-facing tool call (both wiring sites) produces a matching `tool_call_log` row.
- `audit.toolCalls` IPC method returns rows from a real session.
- `bun run test:coverage:engine` ≥85% stays green.
- I11 enforcement test extended and passing.

### PR 3 — `vec_items_1536` + per-type routing + reembed CLI (V30)

**Goal.** Enable per-item-type embedding routing so prose-heavy item types (`obsidian_note`, `slack_message`, `email`) can use OpenAI `text-embedding-3-small` (1536-dim) while code/metadata stays on local MiniLM (384-dim).

**Migration number.** V30 (after V29 from PR 2).

**Touchpoints.**

- New `packages/gateway/src/index/vec-items-1536-v30-sql.ts` exporting the migration SQL (sketch — locked in PR 3's per-PR spec):

  ```sql
  CREATE VIRTUAL TABLE IF NOT EXISTS vec_items_1536
    USING vec0(embedding float[1536]);

  -- Remove the vector row when a chunk row is deleted (1536-dim).
  CREATE TRIGGER IF NOT EXISTS embedding_chunk_ad_delete_vec1536
  AFTER DELETE ON embedding_chunk
  FOR EACH ROW
  WHEN OLD.dims = 1536
  BEGIN
    DELETE FROM vec_items_1536 WHERE rowid = OLD.vec_rowid;
  END;
  ```

  Existing `embedding_chunk_ad_delete_vec384` trigger updated with `WHEN OLD.dims = 384` so the two triggers don't race when the table holds mixed-dim rows.
- Per-item-type routing in `embedding/pipeline.ts`: lookup table mapping `item.type` → embedding model id, gated by vault-key presence. Default = MiniLM (preserves current behaviour). When `openai.api_key` is present in vault, routing for prose-heavy types switches to `text-embedding-3-small`. Decision logged at INFO with the routing reason.
- New CLI subcommand `nimbus index reembed --model <id> [--item-type <type>] [--dry-run] [--limit N]`. Reads `embedding_chunk` rows whose `model` differs from the target, re-embeds in batches via the existing `embedding/openai-embedder.ts`, replaces rows in the matching `vec_items_<dim>` table. Idempotent — re-running with the same arguments is a no-op once the target state is reached.
- `nimbus-file-map.md` row added for the routing layer + new CLI command file.
- Migration runner wiring in `packages/gateway/src/index/migrations/runner.ts`. Sqlite-vec-absent fallback path (mirrors `EMBEDDING_V6_NO_VEC_MIGRATION_SQL`): the new virtual table is skipped, routing falls back to MiniLM only.

**Out of scope.**

- UI surfaces for model selection — no Tauri allowlist edits; CLI-only for now.
- Auto-reembed on item changes — manual via CLI only.
- New model providers beyond OpenAI — `text-embedding-3-small` is sufficient.
- Per-extension model registration — extensions still go through the connector's default routing; Marketplace v2 in T2 can revisit.
- **Partial-failure recovery strategy** — locked in PR 3's per-PR spec. The expected shape: on a batch, transient errors (rate limit, network) skip the affected item and record the failure; the CLI exits 0 with a summary `(N succeeded, M skipped)` and the operator re-runs the command — idempotent because the next run only sees rows still on the old model. Fatal errors (auth, billing) abort the run with a non-zero exit. PR 3's plan locks the exact batch size, retry policy, and exit-code semantics.

**Exit criteria.**

- Both `vec_items_384` and `vec_items_1536` populated and queryable when an OpenAI key is in vault.
- `nimbus index reembed --model text-embedding-3-small --item-type obsidian_note` works end-to-end against a mocked OpenAI embedder.
- `bun run test:coverage:embedding` ≥80% stays green.
- Existing `bun run test:coverage:metrics` and `bun run test:coverage:preflight` stay green.

### PR 4 — Typed `dbRun` / `dbExec` mega-PR

**Goal.** Every production `db.run(...)` and `db.exec(...)` call site routes through `db/write.ts:dbRun` / `dbExec` so `SQLITE_FULL` → `DiskFullError` translation is universal. Named in the parent sequencing spec as the reason T6 precedes T2.

**Touchpoints.**

- Migrate the ~79 production `db.run(` and direct `db.exec(` call sites across:
  - `packages/gateway/src/db/` (excluding `write.ts` itself + `audit-chain.ts` internal helpers — those are the wrappers).
  - `packages/gateway/src/index/migrations/runner.ts` — keep the existing `db.transaction(() => { db.exec(...) })` pattern where transactional semantics are intentional, but route the inner `db.exec` calls through `dbExec`. Migration-runner internals stay structural.
  - `packages/gateway/src/automation/`, `connectors/`, `engine/`, `ipc/`, `people/`, `memory/`, `sync/`, `embedding/`, `graph/`, `commands/`, `extensions/`.
  - `packages/cli/src/` — any CLI code that opens the DB and writes.

  Mechanical: `db.run(sql)` → `dbRun(db, sql)`; `db.run(sql, params)` → `dbRun(db, sql, params)`; `db.exec(sql)` → `dbExec(db, sql)`.
- New static-audit rule in `scripts/structure-audit/check-nimbus-invariants.ts`: ban direct `db.run(` and `db.exec(` outside of `db/write.ts`, migration-runner internals (allowlisted by file path), and test files. Failure mode: `bun run audit:invariants` exits 1 with the offending file:line.
- **Tentative new invariant I14** — "All SQLite write paths route through `dbRun` / `dbExec`". Locked in PR 4's per-PR spec based on whether the static rule + the existing `db/write.ts` wrapper jointly meet the invariant triple rule (production wiring + docs entry + enforcement test). If yes: new row in `docs/SECURITY-INVARIANTS.md` + assertion in `security-invariants.test.ts`.

**Out of scope.**

- Any new behaviour beyond the wrapper change — mechanical refactor only.
- Refactoring migration-runner internals (`db.transaction(...)` semantics stay).
- Non-production sites — tests keep direct `db.run` for terseness.
- HTTP write-route allowlist (I13's `WRITE_ROUTE_ALLOWLIST` is unchanged).

**Exit criteria.**

- Zero direct `db.run(` / `db.exec(` outside the allowlisted files in production code.
- Static-audit rule wired into `bun run audit:invariants`; `bun run audit:structure` includes the new rule.
- All existing integration tests green; new test asserts disk-full propagation via every migrated path.
- If I14 added: `SECURITY-INVARIANTS.md` row + `security-invariants.test.ts` assertion in place.
- `bun run test:ci` green.

## Section 3 — Cross-cutting concerns

### Invariant interactions

- **I10** (PR 1): wiring source consolidates from three local helpers to one util module. The `SECURITY-INVARIANTS.md` row's "Wired at" column updates; the anti-pattern column entry is extended.
- **I11** (PR 2): the existing envelope wrap (I11) gets a complement defense — the `tool_call_log` audit row. The enforcement test extends to assert both writes at the two wiring sites.
- **I14 (tentative, PR 4)**: a new invariant for "all SQLite write paths route through `dbRun` / `dbExec`" — locked in PR 4's per-PR spec.

### Coverage gates

- PR 1: no specific gate (util-module change). `bun run test:ci` parity required.
- PR 2: `bun run test:coverage:engine` ≥85% stays green.
- PR 3: `bun run test:coverage:embedding` ≥80% stays green.
- PR 4: no single gate touched; `bun run test:ci` parity required across all 18 coverage gates.

### Migration numbering

| PR   | V<N> | File                                                                 |
| ---- | ---- | -------------------------------------------------------------------- |
| PR 2 | V29  | `packages/gateway/src/index/tool-call-log-v29-sql.ts`                |
| PR 3 | V30  | `packages/gateway/src/index/vec-items-1536-v30-sql.ts`               |
| PR 1 | —    | no migration                                                         |
| PR 4 | —    | no migration                                                         |

If T2 design ever lands a migration between two T6 PRs (unlikely — T2 doesn't start until T6 ends), the next-available number is taken in order.

### Platform equality

None of the four PRs have OS-specific code paths. The platform-equality non-negotiable is satisfied automatically: PR 1 uses Node's `timingSafeEqual` (cross-platform), PR 2 / PR 3 use SQLite + sqlite-vec (cross-platform with the existing fallback), PR 4 is a pure TypeScript refactor.

### Phase boundary

T6 ends when all four PRs merge to `main`. The new static-audit rule from PR 4 also acts as defense-in-depth against T2 reintroducing direct `db.run` calls in new sandbox-related surfaces.

## Section 4 — Cadence per PR

For each PR in the locked order:

1. Create worktree at `.worktrees/phase-5-t6-pr<N>-<topic>/` with branch `dev/asafgolombek/phase-5-t6-pr<N>-<topic>`.
2. Brainstorming sub-skill for the per-PR design decisions specific to that PR.
3. Write per-PR design spec at `docs/superpowers/specs/2026-05-<date>-phase-5-t6-pr<N>-<topic>-design.md`.
4. Write per-PR implementation plan at `docs/superpowers/plans/2026-05-<date>-phase-5-t6-pr<N>-<topic>.md`.
5. Subagent-driven execution per the plan.
6. PR opened against `main`. Reviewed via `gh pr` or `/ultrareview` where useful. Merged after green CI.
7. `docs/roadmap.md` updated: T6 progress checkbox flipped; the `Last updated:` line at `roadmap.md:7` extended with `T6 PR<N> ✅ (<date>)`.

Branch naming: `dev/asafgolombek/phase-5-t6-pr<N>-<topic>`. Commit message style follows the T4 PagerDuty wrap-up pattern (`feat(...)`, `test(...)`, `docs(...)` with `Co-Authored-By:` trailer).

## Section 5 — Roadmap interactions

### Initial roadmap edit (with this sequencing spec)

Add a T6 progress block under Phase 5 Core item 5 in `docs/roadmap.md`:

```markdown
- [ ] **T6 — B1 hardening + semantic layer prep** ([sequencing spec](./superpowers/specs/2026-05-14-phase-5-t6-design.md))
  - [ ] PR 1 — I10 timing-safe helper consolidation
  - [ ] PR 2 — `tool_call_log` audit table (V29)
  - [ ] PR 3 — `vec_items_1536` + per-type routing + reembed CLI (V30)
  - [ ] PR 4 — Typed `dbRun` / `dbExec` migration (~79 sites)
```

### Per-PR roadmap edits

When each PR merges:

- Flip its sub-checkbox to `[x]` with a dated note.
- Extend the `Last updated:` header at `roadmap.md:7` with `T6 PR<N> ✅ (<date>)`.

When PR 4 merges (T6 complete):

- Flip the top-level T6 row to `[x]`.
- Replace the four individual `T6 PR<N> ✅` entries in the header with a consolidated `T6 ✅ (<date>)`.

## Section 6 — Out of scope

- Implementation detail for any of the four PRs — those are written when each PR reaches the head of the queue.
- T2 design (next sub-project after T6 completes).
- Decisions about new I-numbered invariants beyond the tentative I14 — locked in PR 4's per-PR spec.
- Calendar dates for individual PRs — the parent sequencing spec already excludes calendar from the plan-of-plans.

## Section 7 — Review disposition (Gemini CLI, 2026-05-14)

Source: [`2026-05-14-phase-5-t6-review-feedback.md`](./2026-05-14-phase-5-t6-review-feedback.md).

| Review § | Item | Disposition | Rationale & where in this spec |
| -------- | ---- | ----------- | ------------------------------ |
| 2.1 | `tool_call_log` retention policy | **DEFER** | Real concern (unbounded growth in high-traffic agents). Belongs in a "System Maintenance" follow-up PR, not the sequencing spec — audit semantics need to land before a maintenance policy is designed against them. Tracked as a new bullet under §2 PR 2 "Out of scope" — PR 2's per-PR spec opens the roadmap follow-up for a `[audit].tool_call_log_retention_days` config knob + scheduled prune. |
| 2.2 | Reembed CLI partial-failure handling | **DEFER** | PR-level design choice, not sequencing. Tracked as a new bullet under §2 PR 3 "Out of scope" with the recommended shape (skip + summary exit-0 on transient errors, abort on fatal errors, idempotent re-run). PR 3's per-PR spec locks the exact batch size, retry policy, and exit codes. |
| 2.3 | PR 4 mechanical migration via script | **DEFER** | Execution tactic, not sequencing — belongs in PR 4's implementation plan (written via `writing-plans`). The sequencing spec stays "what to build", not "how to type the edits". |
| 2.4 | I14 + static audit confirmation | **NO ACTION** | Confirmation only — the static-audit rule in `check-nimbus-invariants.ts` (already proposed in §2 PR 4) is sufficient without a runtime trap. |
| 3.1a | Rename `util/hex-compare.ts` → `util/timing-safe-compare.ts` | **FIX** | Reviewer agrees with the parenthetical option in the original draft; locked now (§2 PR 1 touchpoints). Export name `sha256HexEqualConstantTime` stays so existing callers update import paths only. |
| 3.1b | Length-mask behavior of `constantTimeStringEqual` | **NO ACTION** | Already covered — §2 PR 1 names "Buffer-based, with length-mismatch burn cycle to match the defensive shape of `http-auth.ts`'s helper." The current `http-auth.ts:41-53` implementation does exactly this; PR 1 migrates that behavior into the canonical helper rather than re-deriving it. |
| 3.2 | `audit.toolCalls` LAN posture | **NO ACTION** | Confirmation only — `nimbus-tauri-allowlist` posture is intentional. |

**Net effect on this spec:** one wording change in §2 PR 1 (rename → locked), two new "Out of scope" bullets in §2 PR 2 and §2 PR 3, and this §7 disposition table. Nothing about ordering, V<N> numbering, or PR scope changes.

## See also

- [`2026-05-06-phase-5-sequencing-design.md`](./2026-05-06-phase-5-sequencing-design.md) — parent Phase 5 sequencing spec; T6 is Core item 5.
- [`2026-05-14-phase-5-t4-pagerduty-enrichment-design.md`](./2026-05-14-phase-5-t4-pagerduty-enrichment-design.md) — cadence reference for per-PR spec shape.
- [`../../SECURITY-INVARIANTS.md`](../../SECURITY-INVARIANTS.md) — I10 / I11 rationale; I14 candidate.
- [`../../roadmap.md`](../../roadmap.md) — Phase 5 Core item 5.
