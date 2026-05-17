# SonarCloud Cleanup — `asafgolombek_Nimbus`

**Date:** 2026-05-17
**Goal:** Flip the SonarCloud Quality Gate from ERROR to OK by (a) clearing the 11 unreviewed security hotspots and (b) raising `new_coverage` from 63.1% to ≥80%.

## Current State

Quality Gate: **ERROR**. Two failing conditions on new code:

| Metric | Threshold | Actual |
|---|---|---|
| `new_coverage` | ≥ 80% | 63.1% |
| `new_security_hotspots_reviewed` | 100% | 0% (11 unreviewed) |

Passing on new code: reliability A, security A, maintainability A, duplication 0.6%.

## Phase 1 — 11 hotspots marked SAFE in SonarCloud

All 11 are defensively safe today; **no code change**. The user clicks "Mark as Safe" in the SonarCloud UI with the per-hotspot justification below.

### 9× regex super-linear backtracking (`typescript:S5852`)

All anchored with bounded character classes or use `.` which does not span newlines in JS — linear time. Inputs are local-only (markdown files in user vaults, TOML config siblings).

| File:line | Pattern | Justification |
|---|---|---|
| `packages/gateway/src/connectors/obsidian-daily-note.ts:73` | `/[/\\]+$/` | Anchored, bounded char class — linear |
| `packages/gateway/src/connectors/obsidian-parsing.ts:5` | `/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/` | Lazy `[\s\S]*?` is bounded by the literal `\r?\n---` follow text; input is FS-bounded markdown |
| `packages/gateway/src/connectors/obsidian-parsing.ts:6` | `/^#\s+(.+)$/m` | `.` doesn't span newlines — linear per line |
| `packages/gateway/src/connectors/obsidian-vault-id.ts:15` | `/[/\\]+$/` | Same as line 1 |
| `packages/gateway/src/connectors/openapi-indexer-service-name.ts:24` | `/^-+\|-+$/g` | Anchored both sides, bounded |
| `packages/gateway/src/connectors/openapi-indexer-service-name.ts:35` | `/^service\s*=\s*"([^"]*)"\s*$/` | Anchored, `[^"]*` is the non-greedy bounded character class — linear |
| `packages/mcp-connectors/obsidian/src/server.ts:115` | `/[/\\]+$/` | Same as line 1 |
| `packages/mcp-connectors/obsidian/src/server.ts:169` | `/^#\s+(.+)$/m` | Same as line 3 |
| `packages/mcp-connectors/obsidian/src/server.ts:394` | `/[/\\]+$/` | Same as line 1 |

### 2× `Math.random` (`typescript:S2245`) — **fixed in code**

Used as a heredoc-delimiter token wrapped in a `do...while` collision-check loop. Replace `Math.random().toString(36).slice(2)` with `crypto.randomUUID().replaceAll("-", "")` in both files. Keeps the `do...while` loop unchanged — the collision-check is a structural guarantee against adversarial output, cheap to retain. `crypto.randomUUID` is already idiomatic in the gateway (`connector-spawns.ts` uses it for every `MCPClient` id), and the swap retires both S2245 hotspots natively without UI clicks.

| File:line | Change |
|---|---|
| `packages/github-actions/annotate-action/src/main.ts:100` | `Math.random().toString(36).slice(2)` → `crypto.randomUUID().replaceAll("-", "")` |
| `packages/github-actions/preflight-query/src/main.ts:142` | Same swap |

## Phase 2 — `connector-spawns.ts` deep test pass

**Target file:** `packages/gateway/src/connectors/lazy-mesh/connector-spawns.ts` (515 uncovered lines, 7.4% coverage, 662 ncloc).

**New test file:** `packages/gateway/test/unit/connectors/lazy-mesh/connector-spawns.test.ts`.

The source file contains 18 nearly-identical `ensureXxxMcp(ctx: MeshSpawnContext)` functions — Phase 3 bundle, Google bundle, Microsoft bundle, GitHub, GitLab, Bitbucket, Slack, Linear, Jira, Notion, Confluence, Discord, Jenkins, CircleCI, PagerDuty, Kubernetes, Obsidian.

Per function, three baseline tests:

1. **Credentials missing → no spawn.** Vault returns `null`/`""` for the required key(s); the function returns without calling `setLazyClient` and `MCPClient` is not constructed.
2. **Credentials present → spawn with scoped env (I1 leak-canary).** Before the test, inject `process.env.NIMBUS_TEST_LEAK_CANARY = "should-not-appear"`. Vault returns valid values; `setLazyClient` is called exactly once, the constructed `MCPClient` carries `command: "bun"`, the right `args`, and an env produced by `extensionProcessEnv` containing the expected credential env names. Assert the captured env **does not contain** `NIMBUS_TEST_LEAK_CANARY` (proves I1: a regression like `{ env: { ...process.env, ...creds } }` would fail this test — asserting credential presence alone would not).
3. **Already running → no double-spawn.** `getLazyClient(slotKey)` returns an existing client; `scheduleLazyDisconnect` fires but `setLazyClient` and `MCPClient` are not called again.

Extra coverage where the source branches on additional vault keys (Google per-service token resolution, Microsoft Outlook scopes, GitLab API base, Jenkins/Kubernetes optional context, Discord opt-in flag).

**Test infrastructure:**

- Hand-rolled `MeshSpawnContext` mock using `MockVault` from `packages/gateway/src/vault/mock.ts` for the vault dependency. Spies on `setLazyClient`, `getLazyClient`, `bumpToolsEpoch`, `scheduleLazyDisconnect`, `clearLazyIdle`.
- `mock.module("@mastra/mcp", ...)` returns a constructor that captures `{ id, servers }` and yields an instance with stubbed lifecycle methods (`connect: async () => undefined`, `disconnect: async () => undefined`, `getTools: async () => ({})`). Stubs are defensive — `ensureXxxMcp` does not call them today, but future code changes that do won't make tests hang or throw unhandled rejections.
- The captured constructor args are inspected per-test (`servers["<id>"].env`) to assert I1 — including the leak-canary check above.
- Each test gets a fresh mock context and clears the captured args (no shared state).

**Estimate:** ~55 tests; ≥85% line coverage on the source file.

## Phase 3 — gate-driving coverage on recently-changed files

**Local fast-fail loop** (do not push and wait for SonarCloud CI to report `new_coverage`):

1. `git diff --name-only v0.3.0 HEAD -- "packages/**/*.ts" ":(exclude)packages/**/test/**"` — produces the candidate file list (these are the files SonarCloud will count toward `new_coverage`).
2. `bun test --coverage --coverage-reporter=text-summary packages/<pkg>` for each affected package — gives per-file line coverage in the terminal output.
3. For any file in the candidate list with line coverage < 80%: add focused unit tests, re-run step 2, iterate until the file is ≥ 80%.
4. Final verification: `bun run test:coverage` (full run) — every per-subsystem gate listed in `nimbus-commands` must stay green; new files must each meet the 80% floor.

Likely candidates from recent activity (verified against step 1's diff at implementation time):

- `packages/gateway/src/embedding/routing-pipeline.ts` and `embedding/create-routing-runtime.ts` (T6 PR 3)
- `packages/gateway/src/ipc/http-write-routes.ts` and `http-auth.ts` / `http-rate-limit.ts` (T4 PR 3b)
- `packages/gateway/src/connectors/obsidian-sync.ts` and the smaller obsidian-* helpers (Wave A PR 2)
- `packages/gateway/src/connectors/openapi-indexer-*.ts` (Wave A PR 1)

Specific gaps and test names determined after running the coverage report; the plan defers this list to the implementation step.

## Deliverable

One PR: `dev/asafgolombek/sonar-cleanup-2026-05-17`. The PR description carries the Phase 1 regex hotspot justifications verbatim so the reviewer can verify them against the SonarCloud "SAFE" comments. Diff is test-only **plus** the two-line `crypto.randomUUID` swap in `annotate-action/main.ts` and `preflight-query/main.ts` — no other production code change.

## Out of Scope

- Reducing the 187 overall code smells (separate effort; no Quality Gate condition on the metric).
- Exhaustively testing the other large coverage offenders (`cli/commands/connector.ts`, `ipc/connector-rpc-handlers/auth.ts`, `slack-sync.ts`, `ipc/server/dispatchers.ts`) — defer.
- Changing any SonarCloud configuration (quality gate, new-code window, ruleset).
