# Per-File 80% Coverage Floor — Workspace-Wide

**Date:** 2026-05-17
**Goal:** Every executable source file in the Nimbus workspace reaches ≥80% line coverage. Locked in by a ratcheting CI gate that fails on regressions but accepts a monotonically-decreasing baseline of currently-below-floor files.

## Why

`bun run test:ci` gates a handful of subsystems at 80–90% (engine, vault, sync, embedding, etc.). The gates are package-aggregate, not per-file. As a result:

- 78 gateway source files sit below 80% individually while the package totals pass.
- The biggest absolute uncovered-line counts are in OAuth handlers, the IPC dispatcher, the LLM router, the Mastra agent surface, the MCP mesh core, and ~20 cloud connector sync handlers — all security-adjacent or correctness-critical.
- The PR #326 retrospective surfaced the precise failure mode: SonarCloud's `new_coverage` measures *the diff against main*, so a file at 9% overall coverage that gets a 2-line tweak can drag the gate to red. A per-file floor avoids that surprise — once a file hits 80%, every subsequent diff against it stays at ≥80%.

## Non-Goals

- 100% coverage. Diminishing returns past 80%; the gate stays at 80% as a hard floor.
- Branch coverage. The floor is on line coverage only — same metric SonarCloud and Bun report.
- Mutation testing, property-based tests, fuzzing. Out of scope.
- Changing the existing per-subsystem gates (engine ≥85%, vault ≥90%, etc.). The per-file floor is *additive*: per-subsystem gates remain; per-file gate adds an additional constraint.
- UI E2E coverage. Per-file 80% applies to unit/integration coverage. Playwright E2E coverage is not enforced.

## Structural Exclusions

A registry file `scripts/coverage-floor/exclusions.ts` lists path globs that are exempt from the floor by construction. Justifications below.

| Pattern | Why exempt |
|---|---|
| `packages/gateway/src/vault/{win32,darwin,linux}.ts` | DPAPI / Keychain / libsecret bindings. Only one runs per OS, so a single CI host's lcov cannot reach 80%. The CI matrix tests all three collectively; the static-invariants test verifies the dispatcher (`vault/factory.ts`) selects the right one. |
| `packages/gateway/src/platform/{win32,darwin,linux,browser}.ts` | Same rationale — OS-specific path resolution. `browser.ts` exists for Astro docs site builds. |
| `packages/gateway/src/perf/**` | Reference benchmarks that run via `nimbus bench` (interactive protocol confirmation per the WS5 design), not under `bun test`. Already in `sonar.coverage.exclusions`. |
| `packages/gateway/src/index/*-v[0-9]*-sql.ts` | SQL migration constants — one big template string per file, no executable JS/TS. Already in `sonar.coverage.exclusions`. |
| `**/*types*.ts`, `**/types/**` | Type-only declaration files (`types.ts`, `*-types.ts`). No executable code — coverage is meaningless. |
| `packages/github-actions/*/src/main.ts` | Top-level `await main()` makes in-process unit testing impossible without process exit. Helpers extracted to sibling files (e.g. `output.ts`) and tested in-process; the entry-point file itself is e2e-tested only. Sets the precedent established by PR #326. |
| `**/*.test.ts`, `**/*.test.tsx` | Test files themselves — never counted as "source." |
| Files explicitly listed in the ratchet baseline | Pre-existing low-coverage files; the gate fails on regression but allows the current value (see "The Ratchet"). |

The exclusion registry is the single source of truth — `sonar-project.properties` already encodes most of it via `sonar.coverage.exclusions`, and the new per-file CI gate reads the same registry. Drift between the two is prevented by a static check (`scripts/coverage-floor/check-exclusion-parity.ts`).

## The Ratchet

`docs/structure-audit/coverage-baseline.json` lists every non-exempt source file currently below 80%, with its current line coverage percentage as a watermark:

```json
{
  "version": 1,
  "generated_at": "2026-05-17T...",
  "files": {
    "packages/gateway/src/connectors/slack-sync.ts":                              { "min_coverage_pct": 4.35 },
    "packages/gateway/src/connectors/lazy-mesh/credential-orchestration.ts":      { "min_coverage_pct": 4.44 }
  }
}
```

The field name is `min_coverage_pct` (percent, range 0–100), not `min_lines`. Percentage is robust to refactors that add/remove lines without changing the logical coverage proportion.

CI rules — **monotonically rising watermark**, exit at 80%:

1. **Files not in the baseline must be ≥80%** (the floor).
2. **Files in the baseline must be ≥ their `min_coverage_pct`** (must not regress).
3. **If a baseline file's actual coverage is *higher* than its recorded `min_coverage_pct`, the baseline entry must be updated upward in the same PR.** Partial improvements are locked in immediately — they can't silently regress later. `bun scripts/coverage-floor/check.ts --update-baseline` produces the diff for the PR author.
4. **When a baseline file's actual coverage reaches ≥80%, it must be *removed* from the baseline in the same PR** (the file is now subject to the full floor).
5. **A PR may never lower any `min_coverage_pct` value.** Watermarks are monotonically non-decreasing; the only way out is removal at 80%.

The "update upward in the same PR" rule is what makes partial progress sticky. Without it, a PR that takes a file from 40% to 70% would leave the baseline at 40%, and a later PR could regress back to 41% without tripping the gate — the gap the original rule 5 left open.

The ratchet means the gate flips on at Phase 0 merge without breaking CI immediately, and locks in every gain one file at a time.

## Enforcement

New CI gate `coverage-floor` in `.github/workflows/_test-suite.yml`, running after the existing per-subsystem coverage jobs:

```bash
bun run test:coverage      # produces coverage/lcov.info (root) + packages/ui/coverage/lcov.info
bun scripts/coverage-floor/check.ts --baseline docs/structure-audit/coverage-baseline.json
```

`check.ts` walks `packages/*/src/**/*.ts(x)` independently of the lcov report. Bun's V8-based coverage only emits entries for source files imported by at least one test, so a brand-new untested source file is *invisible* in lcov — it would silently escape the floor. The walker treats any non-exempt source file missing from lcov as **0% covered**: either the file goes into the baseline at 0% (blocked from regression and required to climb to 80% in subsequent PRs), or the PR author writes a test in the same diff.

Exit code 1 on:
- Any non-exempt, non-baseline source file below 80% in lcov.
- Any non-exempt source file in `packages/*/src/**` that is **not present** in any lcov report and not in the baseline.
- Any baseline file below its recorded `min_coverage_pct`.
- Any baseline file whose actual coverage exceeds its recorded `min_coverage_pct` without a same-PR update raising the watermark (the monotonic-rise enforcement).
- Any baseline file whose actual coverage is ≥80% without removal from the baseline in the same PR.

The gate is **PR-blocking on Ubuntu (`pr-quality` job)** and runs on the full 3-OS matrix on push to `main`. Note: PR-gate runs Ubuntu-only, so files with inline `process.platform === "win32"` branches will show the win32 branch as uncovered. See "Inline OS Branches" below.

## Inline OS Branches

The project's PAL convention (`nimbus-architecture.md`) already mandates that OS-specific logic lives in `packages/gateway/src/platform/{win32,darwin,linux}.ts` and is accessed via `PlatformServices`. Inline `if (process.platform === "win32")` checks in business logic are an architectural anti-pattern — they should be refactored to a PAL method during this coverage program when encountered.

For unavoidable inline branches (e.g. third-party library compatibility shims that can't reasonably move to the PAL), two coping strategies:

1. **Preferred: baseline absorption.** The file enters the coverage baseline at its actual Ubuntu coverage. Push-to-main runs the 3-OS matrix; future work (out of scope for this design) can extend `check.ts` to merge lcov reports across the matrix so the win32 branch counts as covered on a Windows runner.

2. **Comment-based ignore.** Bun's V8 coverage does NOT natively support `/* c8 ignore next */` or `/* istanbul ignore next */` markers. Until upstream support lands, inline ignores are not an option — option 1 is the only path. `docs/contributors/coverage.md` documents this and points at the open Bun issue if/when it changes.

The PAL refactor path is encouraged in the PR description for any file where inline branches are the reason for a baseline entry.

## Test Harnesses (Phase 2 + 3 backbone)

Two shared harnesses provide the fixture surface for connector and IPC RPC tests respectively. Each lives in `packages/gateway/test/helpers/` and is exported from a single entry point.

### `connector-sync-harness.ts`

```typescript
export interface ConnectorSyncFixture {
  readonly db: Database;             // fresh in-memory SQLite with full schema
  readonly vault: NimbusVault;       // MockVault, pre-seeded with creds
  readonly mcp: MockMcpClient;       // canned tool responses + call log
  readonly notifications: NotificationLog;
  cleanup(): void;
}
export function createConnectorSyncFixture(opts?: { seedVault?: Record<string, string> }): ConnectorSyncFixture;
```

`MockMcpClient` accepts canned responses keyed by `(tool, params)` shape and records every call. Connector sync tests stage canned tool responses, run the sync handler, then assert on `db` rows + `notifications` (e.g. `connector.healthChanged` payloads).

### `rpc-harness.ts`

```typescript
export interface RpcFixture {
  readonly ctx: ServerCtx;           // real LocalIndex + MockVault + stubbed platform paths
  readonly notifications: NotificationLog;
  cleanup(): void;
}
export function createRpcFixture(opts?: { seedItems?: ReadonlyArray<...> }): RpcFixture;
```

RPC handler tests call `dispatchXxxRpc(method, params, ctx)` directly; the harness handles the LocalIndex + Vault setup that's currently boilerplate-duplicated across the existing `*-rpc.test.ts` files.

Both harnesses live in `packages/gateway/test/helpers/` (not in `src/`) so they aren't subject to the per-file floor themselves.

## Phasing

12 PRs across 2-3 months at ~one-per-week cadence (1 foundation + 2 critical + 3 sync + 2 RPC + 1 long-tail + 3 non-gateway). Each implementation PR lands a ratchet-baseline reduction.

### Phase 0 — Foundation (PR 0)

- `scripts/coverage-floor/check.ts` — lcov parser + baseline ratchet enforcement.
- `scripts/coverage-floor/exclusions.ts` — structural exclusion registry.
- `scripts/coverage-floor/check-exclusion-parity.ts` — verifies `sonar-project.properties` and the registry agree.
- `docs/structure-audit/coverage-baseline.json` — seeded with every non-exempt file currently below 80% across the entire workspace.
- New CI gate `coverage-floor` in `_test-suite.yml`, PR-blocking on Ubuntu.
- `docs/contributors/coverage.md` — how to read the gate, how to update the baseline, how to request an exclusion.

**Acceptance**: CI green on `main` immediately after merge (baseline accepts current state); CI red on a synthetic regression test that adds a 50% file or raises a baseline entry.

### Phase 1 — Critical paths (PRs 1A + 1B)

| PR | Files | Uncovered |
|---|---|---|
| 1A | `engine/router.ts`, `engine/agent.ts`, `ipc/server/dispatchers.ts` | ~656 |
| 1B | `ipc/connector-rpc-handlers/auth.ts`, `auth/pkce.ts`, `connectors/lazy-mesh/credential-orchestration.ts`, `db/snapshot.ts`, `db/repair.ts` | ~1162 |

Test infrastructure: per-file. Mostly mocks of `Agent`, OAuth-flow doubles, temp-dir SQLite for `db/snapshot.ts`.

### Phase 2 — Connector-sync harness + apply (PRs 2A + 2B + 2C)

| PR | Scope |
|---|---|
| 2A | Build `connector-sync-harness.ts`. Apply to `slack-sync.ts` end-to-end (proves the harness; 396 → 0 uncovered). |
| 2B | Messaging + source-control: discord, teams, github, gitlab, bitbucket, gmail, outlook, onedrive, google-drive, google-photos. ~10 files. |
| 2C | CI + observability + cloud: jenkins, circleci, github-actions, jenkins-api-jobs, aws, azure, gcp, datadog, sentry, newrelic, grafana, pagerduty, kubernetes. ~13 files. |

### Phase 3 — IPC RPC harness + apply (PRs 3A + 3B)

| PR | Scope |
|---|---|
| 3A | Build `rpc-harness.ts`. Apply to `ipc/diagnostics-rpc.ts` (267 uncovered) end-to-end. |
| 3B | Remaining RPC handlers: `automation-rpc`, `people-rpc`, `connector-rpc-handlers/{status,config}`, `inline-handlers`, `socket-listeners`. ~10 files. |

### Phase 4 — Long tail (PR 4)

All remaining gateway files in the 50–80% range: `voice/tts.ts`, `voice/wake-word.ts`, `telemetry/flush-scheduler.ts`, `embedding/{worker-bridge,create-embedding-runtime,model}.ts`, `config/{session-toml,nimbus-toml}.ts`, `db/{backups-list,verify}.ts`, `vault/factory.ts`, `connectors/{user-mcp-store,connector-catalog,sync-watermark-cursor-v1}.ts`, etc. ~25 files at 1–3 tests each.

### Phase 5 — Non-gateway packages (PRs 5A + 5B + 5C)

| PR | Package | Notes |
|---|---|---|
| 5A | `packages/cli` | **In-process CLI harness** — import each command function directly with a mocked `NimbusClient` from `@nimbus-dev/client`. Subprocess-based testing (`Bun.spawn`) does NOT propagate coverage from the child process to the parent's lcov (Bun's V8 coverage instruments the test runner's process only — confirmed by PR #326's github-actions e2e regression). The pattern set by PR #326's `setOutput` extraction applies here: command files should export their handler function so it can be invoked in-process. Existing subprocess e2e tests remain for integration coverage of stdin/stdout wiring, but they don't count toward the floor. |
| 5B | `packages/ui` | Vitest + Testing Library. Per-file 80% on `src/{pages,components,hooks,store}/**`. Excludes routing scaffolds (`App.tsx`) which require E2E. |
| 5C | `packages/vscode-extension` | Uses `vscode-shim`. Per-file 80% on `src/{chat,connection,hitl,status-bar}/**`. |

`packages/sdk` and `packages/client` are already at 80% (existing gates) — verify only.

## Risks

| Risk | Mitigation |
|---|---|
| Tests written purely for coverage are low-value (test that the code is what's written, not what it should do) | Phase 1 prioritizes security-adjacent paths where test value is highest; the per-PR review process catches gratuitous tests. The harnesses (Phases 2+3) enforce a meaningful assertion surface (db rows, notification payloads, typed error codes) — not just "function was called." |
| Harness investment is wasted if the sync handlers diverge | All current `*-sync.ts` files follow the same shape (fetch → upsert → emit). New connectors are explicitly required to follow `nimbus-connector-authoring` skill conventions, so the harness covers future additions too. |
| Per-file gate generates churn on small refactors | The baseline ratchet absorbs small dips; if a refactor genuinely uncovers lines, the gate forces the author to either re-cover or move the file into the baseline at the new (lower) coverage — which then can't regress further. |
| Platform-specific files become a coverage blind spot | The CI matrix runs on Windows + macOS + Ubuntu, and each generates its own lcov; the per-OS coverage is verified by the existing `_test-suite.yml` matrix, just not aggregated into the per-file gate. Static invariants (`check-nimbus-invariants.ts`) cover what runtime tests can't. |
| One-PR-per-week cadence stalls (real work intrudes) | The ratchet design means stalling is safe — partial progress is locked in, never reverted. No "all-or-nothing" pressure. |

## Out of Scope

- Reducing the 187 SonarCloud code smells (`sqle_index` is 1184 minutes ≈ 19.7h; separate cleanup effort).
- Mutation testing.
- Branch coverage.
- Property-based testing.
- Coverage for `packages/docs` (Astro static site).
- E2E test coverage (Playwright runs on push to `main` only).
- Performance benchmarks coverage.
