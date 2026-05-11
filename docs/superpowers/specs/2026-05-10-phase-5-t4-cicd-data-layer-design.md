# Phase 5 — T4 CI/CD Data Layer Design

> **Status:** Draft for review
> **Author:** asafgolombek
> **Date:** 2026-05-10
> **Type:** Implementation spec — produces a published OpenAPI 3.1 schema, a new `nimbus metrics dora` CLI command + IPC method, a separate-repo GitHub Action (`nimbus-dev/query-action`), a pre-commit hook template, and `nimbus query` CI usage docs. Read-only; no HITL surface; no new connectors.
> **Parent:** Phase 5 sequencing spec — [`2026-05-06-phase-5-sequencing-design.md`](./2026-05-06-phase-5-sequencing-design.md). T4 is sub-project #4 in Phase 5 Core, after T1 (sequencing), T3 (Team Intelligence), and Wave A (API Surface + Obsidian).

## Purpose

T4 makes Nimbus a first-class data layer for CI/CD without expanding the connector mesh and without adding any write surface. The deliverables exploit data the index already holds — `pr`, `ci_run`, `incident`, `git_commit` — and expose it through:

1. A published, contract-stable HTTP surface (the OpenAPI 3.1 schema) so external tooling (CI scripts, future agents, contributors) can integrate without reading source.
2. A computed-on-demand DORA metrics command that turns the indexed data into the four canonical engineering-throughput numbers.
3. Reference automation packages — a self-hosted-runner GitHub Action and a pre-commit hook template — that demonstrate the integration patterns and unblock the Phase 5 acceptance criteria for "Nimbus as a CI/CD data layer."

T4 is the second Phase 5 sub-project (after T3) that ships without any new connector. It also unblocks the **Phase 7 Engineering Excellence** scope: the `[metrics.dora.<service-id>]` config table introduced here becomes the authoritative input that Phase 7's formal service catalog reads when it lands.

## Locked decisions (from brainstorming)

Five architectural choices that frame the rest of this spec, all settled before writing began:

| # | Decision | Reading |
|---|---|---|
| 1 | **Self-hosted runner only.** GitHub Actions in T4 assume a Gateway is already running on the runner host (CLI shell-out for invocations, `127.0.0.1:7474` for HTTP). The roadmap text already accepts this constraint. Hosted-runner support is explicitly deferred — re-evaluated in Phase 6 alongside Marketplace v2. | A |
| 2 | **Deploys are inferred from a workflow-name regex, never written.** The roadmap's "post-deploy annotation" deliverable is reframed: any `ci_run` whose `title` matches the configured `deploy_workflow_pattern` regex and whose service maps to the queried service id counts as a deploy. **Important:** the original brainstorming locked-decision proposed `pipeline_run.environment === "production"` as the filter; codebase verification (2026-05-10) showed (a) the indexed item type is `ci_run`, not `pipeline_run`, and (b) none of the four CI connectors (`github-actions-sync.ts`, `gitlab-sync.ts`, `jenkins-sync.ts`, `circleci-sync.ts`) populate an `environment` field on the indexed metadata today. The regex-against-`title` approach uses fields all four connectors do populate. No new write surface, no new HITL action type, no `nimbus deployment record` command. The post-deploy-annotation GitHub Action is dropped. | A |
| 3 | **Service identity via config-driven map.** A new `[metrics.dora.<service-id>]` table in `nimbus.toml` maps the abstract service id to `repos` (multi-provider URN list), `pagerduty_services`, and behaviour overrides. Phase 7 will consume the same table when the formal service catalog lands; T4's config does not become tech debt. | A |
| 4 | **Three sequenced PRs.** PR 1: foundations (OpenAPI schema + drift CI gate + CI docs + hook template). PR 2: DORA (CLI + IPC + four metric calculators + config). PR 3: `nimbus-dev/query-action` (separate repo + e2e against a real Gateway). Mirrors T3's PR-1/2/3 cadence. | A |
| 5 | **Handwritten OpenAPI YAML + drift CI gate.** Schema lives at `packages/gateway/openapi/v1.yaml`. A new `audit:openapi-drift` script asserts every documented `path × method` has a corresponding handler and vice-versa. Generated-from-Zod is deferred — too heavy for ~7 stable read-only routes. | A |

Each entry's "Reading" letter references the option label the user picked during brainstorming.

## Architecture overview

```
┌─ Gateway (already running on host) ─────────────────────────────┐
│                                                                 │
│  HTTP API :7474 (existing, 127.0.0.1 only)                      │
│   ├─ GET /v1/openapi.json   ← NEW (PR 1)                        │
│   ├─ GET /v1/items, /v1/connectors, ...   (existing)            │
│   └─ GET /v1/metrics/dora   ← NEW (PR 2)                        │
│                                                                 │
│  IPC (JSON-RPC, existing)                                       │
│   └─ metrics.dora           ← NEW (PR 2)                        │
│                                                                 │
│  Local index (existing)                                         │
│   └─ ci_run.title + .metadata.conclusion, pr.*, incident.*      │
└─────────────────────────────────────────────────────────────────┘
        ▲                                  ▲
        │ HTTP / CLI                       │ CLI shell-out
        │                                  │
┌─ Self-hosted runner (same host) ──────────────────────────────┐
│ nimbus-dev/query-action  (PR 3)         pre-commit hook       │
└───────────────────────────────────────────────────────────────┘
```

### Components added

| Path | Purpose | PR |
|---|---|---|
| `packages/gateway/openapi/v1.yaml` | Handwritten OpenAPI 3.1 schema for the seven existing read-only endpoints. Reserves the `/v1/metrics/dora` slot with a `x-nimbus-status: "reserved"` tag so PR 2 fills it in without re-reviewing path declarations. | 1 |
| `packages/gateway/src/ipc/http-server.ts` (modify) | Add `GET /v1/openapi.json` route that loads the YAML once at startup, parses with `js-yaml`, returns cached JSON. No per-request work. Add `GET /v1/metrics/dora` in PR 2. | 1, 2 |
| `scripts/structure-audit/check-openapi-drift.ts` | New audit; parses `v1.yaml` against `dispatchReadOnlyGet`'s exported route table. Wires into `audit:openapi-drift`. | 1 |
| `docs/cli/use-in-ci.md` | Worked examples for GitHub Actions (self-hosted), GitLab CI, Jenkins. | 1 |
| `docs/templates/nimbus-pre-commit.sh` | Bash hook calling `nimbus query --json` for related-ticket / active-incident / failing-pipeline checks. Configurable warn-vs-block via env. | 1 |
| `packages/gateway/src/metrics/dora.ts` | Four pure metric calculators: `deploymentFrequency`, `leadTimeForChanges`, `changeFailureRate`, `mttr`. Each returns `{ value: number \| null, sample: number, gap: GapNote \| null, unit: string }`. | 2 |
| `packages/gateway/src/config/nimbus-toml.ts` (modify) | Parse `[metrics.dora.<service-id>]` table. Schema-validated at startup. | 2 |
| `packages/gateway/src/ipc/metrics-rpc.ts` | New `dispatchMetricsRpc` handler; method `metrics.dora` returns the four metrics. | 2 |
| `packages/cli/src/commands/metrics.ts` | `nimbus metrics dora --service X [--since 30d] [--json]`. Pretty mode renders a four-row card; JSON mode emits IPC payload verbatim. | 2 |
| `nimbus-dev/query-action` (separate repo) | Composite GitHub Action declaration + TypeScript entry hitting `127.0.0.1:7474/v1/items?...`. README leads with the self-hosted-runner caveat. | 3 |

### Non-goals (explicit)

- **Hosted-runner support.** GitHub-hosted runners cannot reach a developer's `127.0.0.1`. The action's README states this explicitly; we do not ship a hosted-runner workaround in T4.
- **Any write surface.** No `nimbus deployment record`, no new HITL action type. All four DORA metrics are pure SELECTs.
- **A formal service catalog.** `[metrics.dora.<service-id>]` is the interim model; Phase 7 reads it into Backstage/Cortex.
- **Generated OpenAPI from Zod.** Deferred; the drift CI gate is sufficient for ~7 stable read-only routes.
- **Marketplace publication of `nimbus-dev/query-action`.** Repo created and consumable; not advertised on GitHub Marketplace until Phase 6 review.
- **Performance-level mapping.** DORA's "Elite / High / Medium / Low" categorisation is not computed — it maps onto deployment culture, not raw numbers. Dashboards layer it on top.

## DORA inputs, service mapping, edge cases

### Config shape

```toml
# nimbus.toml — repeated per service
[metrics.dora.payment-service]
# Multi-provider repos via URN. Supported providers: github, gitlab, bitbucket, jenkins, circleci.
# Format: "<provider>:<provider-specific-id>".
repos = [
  "github:nimbus-agent/payments",
  "gitlab:nimbus-agent/payments",
  "jenkins:payment-service/deploy-prod",
  "circleci:gh/nimbus-agent/payments",
]
pagerduty_services = ["P12ABCD"]
# Workflow/job name regex; matched against `ci_run.title`. The default `^[Dd]eploy`
# matches workflows literally named "Deploy", "deploy-prod", "Deploy production",
# etc. Override per service when a project's deploy workflow uses a different name.
deploy_workflow_pattern = "^[Dd]eploy"
incident_window_minutes = 60             # default; override for chatty alerting
exclude_pr_labels = ["revert"]           # default ["revert"]; merged but excluded from Lead Time
```

Validation runs at Gateway startup. Bad shapes (unknown keys, wrong types, malformed URNs, unparseable regex) fail the Gateway with a `nimbus config validate` pointer — the existing pattern used by other `[*]` tables.

URN parsing accepts only the five providers listed above; an unknown provider prefix is a validation error. The provider prefix maps to one or more `service` column values (verified against the existing connectors on 2026-05-10):

| URN prefix | `service` values covered | Notes |
|---|---|---|
| `github:` | `"github"` (PRs) **and** `"github_actions"` (CI runs) | Asymmetric: GitHub PRs and Actions ship as separate connectors; one URN must cover both |
| `gitlab:` | `"gitlab"` (PRs **and** CI runs — single connector) | `gitlab-sync.ts` emits both types under one service |
| `bitbucket:` | `"bitbucket"` | |
| `jenkins:` | `"jenkins"` (CI runs only) | Jenkins does not sync PRs; PR-side queries return zero rows for a Jenkins-only URN |
| `circleci:` | `"circleci"` (CI runs only) | Same caveat as Jenkins |

The provider-specific id is matched against `metadata.repo` (GitHub / Bitbucket), `metadata.project` (GitLab), `metadata.jobName` (Jenkins), or the title slug (CircleCI fallback). The exact field per provider is documented in the implementation plan.

### Inputs each metric reads

No new tables, no new sync. (Verified 2026-05-10: `ci_run` is the indexed item type emitted by `github-actions-sync.ts`, `gitlab-sync.ts`, `jenkins-sync.ts`, `circleci-sync.ts`. The spec's first draft used `pipeline_run`, which does not exist — that error is corrected throughout this revision.)

| Metric | Read from | Filter |
|---|---|---|
| Deployment Frequency | `ci_run` items | service URN matches one of `repos`, `metadata.conclusion = "success"`, `title` matches `deploy_workflow_pattern` regex, `modified_at` in `--since` window |
| Lead Time for Changes | `pr` items + `ci_run` items + `git_commit` graph edges | PR `merged_at` not null, repo matches one of `repos` (provider-aware), label not in `exclude_pr_labels`, joined to the first successful deploy `ci_run` (matched as above) whose `metadata.headSha` matches `pr.merge_commit_sha` (or any commit reachable from it through `git_commit` graph edges; see "Squash-merge handling" below) |
| Change Failure Rate | `ci_run` (deploys) + `incident` items | Successful deploy `ci_run`, then attribute the **single most recent successful deploy preceding the incident's `opened_at` within `incident_window_minutes`** as the cause. CFR = `count(deploys with at least one attributed incident) / count(deploys)` over the window. (Reviewer-corrected: original spec attributed one incident to N overlapping deploys, double-counting CFR.) |
| MTTR | `incident` items | `pagerduty_service ∈ pagerduty_services`, `resolved_at` not null |

**Squash-merge handling (Lead Time).** When a PR is squash-merged, `pr.merge_commit_sha` is the single squash commit on the target branch. If a deploy `ci_run` runs at exactly that SHA, the exact-match join finds it directly. If subsequent PRs merge before the deploy, the deploy's `metadata.headSha` is a descendant; resolution requires the `git_commit` graph edges to walk from the deploy SHA back to the PR's squash commit. When the graph edge is missing (the `pr` indexer hasn't populated transitive `git_commit` rows for that branch yet), Lead Time falls back to the exact-SHA-only path and emits `gap: "approximate_lead_time"` so dashboards can disclose the limitation.

### Edge cases

| Case | Resolution |
|---|---|
| PR merged to a branch where no deploy `ci_run` matches `deploy_workflow_pattern` | Excluded from Lead Time (no deploy join produces a result) |
| One deploy ships N PRs | Each PR's lead time = `merged_at → that deploy's modified_at`; the deploy `ci_run` row is counted once in Frequency |
| Multiple successful deploys for the same SHA (re-deploy) | First success wins for Lead Time; later ones still count for Frequency |
| Two successful deploys 5 min apart, incident opens 10 min after the second | The incident is attributed only to the **second** (most-recent-preceding) deploy. The first deploy is not flagged as a change failure. CFR counts each deploy at most once. |
| Reverted PR | Excluded from Lead Time when label matches `exclude_pr_labels`. CFR still attributes any incident to whichever deploy carried the bug (per the most-recent-preceding rule) |
| Deploy + incident separated by ≥ `incident_window_minutes` | Not attributed (CFR is local-time, not causal) |
| Incident opened *before* the next deploy fixed it | MTTR uses `opened_at → resolved_at`; deploy correlation is CFR's job, not MTTR's |
| Service has no PagerDuty mapping configured (`pagerduty_services = []`) | CFR + MTTR return `{ value: null, sample: 0, gap: "no_pagerduty_mapping" }`; Frequency + Lead Time still compute |
| Service has no `repos` configured | All four metrics return `null` with `gap: "no_repos"`; CLI exit code `0` (informational) |
| Service has `repos` configured but zero `ci_run` titles match the regex over `--since` | All four metrics return `null` with `gap: "no_deployment_data"` so dashboards distinguish "wrong config" (no_repos) from "nothing to deploy yet / pattern mismatch" (no_deployment_data); CLI exit code `0` (informational) |
| `--since` window contains < 3 deploys | Frequency / Lead Time / CFR compute values but include `gap: "low_sample"` so dashboards can grey out instead of mislead |
| Window contains 1 or 2 resolved incidents | MTTR computes the median (single value or two-value mean) and emits `gap: "low_sample"` — useful for small teams; threshold raised from N≥3 → N≥1 per reviewer feedback |
| Window contains 0 resolved incidents (and PagerDuty configured) | MTTR returns `null` with `gap: "low_sample"` (no datapoints) |
| `git_commit` graph edge missing for a merge commit | Lead Time falls back to exact `pr.merge_commit_sha → ci_run.metadata.headSha` match; emits `gap: "approximate_lead_time"` |

### Output shape

CLI `--json` mode == IPC response == HTTP `GET /v1/metrics/dora` body:

```json
{
  "service": "payment-service",
  "since": "30d",
  "computed_at": "2026-05-10T20:48:33Z",
  "metrics": {
    "deployment_frequency": { "value": 0.43, "unit": "deploys_per_day", "sample": 13, "gap": null },
    "lead_time_for_changes": { "value": 14823, "unit": "seconds_median", "sample": 22, "gap": null },
    "change_failure_rate": { "value": 0.077, "unit": "ratio", "sample": 13, "gap": null },
    "mttr": { "value": 1842, "unit": "seconds_median", "sample": 4, "gap": null }
  }
}
```

`gap` is one of: `null`, `"no_pagerduty_mapping"`, `"no_repos"`, `"no_deployment_data"`, `"low_sample"`, `"approximate_lead_time"`. The OpenAPI schema enumerates the set so external tools can branch on it.

CLI pretty mode renders the four metrics as a four-row table (label · value · unit · sample · gap-pill). When `NO_COLOR` is set or `stdout` is not a TTY, the renderer falls back to a plain ASCII layout (no Unicode box-drawing, no ANSI color codes) that round-trips through `cat` cleanly. The JSON shape is identical regardless of `NO_COLOR`.

## PR breakdown

### PR 1 — Foundations

**Goal:** ship the published HTTP surface contract + the CI integration docs + the pre-commit hook template. No new gateway logic; pure surface + docs.

**Changes:**
- New `packages/gateway/openapi/v1.yaml` with seven existing endpoints fully documented and the `/v1/metrics/dora` slot reserved (`x-nimbus-status: "reserved"`).
- Modify `packages/gateway/src/ipc/http-server.ts` to add `GET /v1/openapi.json` (cached YAML→JSON parse at startup) and to export the route table as a constant the drift detector can read.
- New `scripts/structure-audit/check-openapi-drift.ts` + `audit:openapi-drift` script in `package.json`.
- New `docs/cli/use-in-ci.md` with three worked examples: GitHub Actions self-hosted, GitLab CI, Jenkins. Each shows the `nimbus query --json | jq` pattern for incident-gate, PR-conflict-gate, failing-CI-gate.
- New `docs/templates/nimbus-pre-commit.sh` Bash hook checking related Linear/Jira tickets, active incidents, failing CI runs on the current branch via `nimbus query --json`. Configurable warn-vs-block via `NIMBUS_HOOK_BLOCK_ON_INCIDENT`, `NIMBUS_HOOK_BLOCK_ON_FAILING_CI`. The hook starts with two preflight checks: (a) `command -v nimbus >/dev/null 2>&1 || { echo "nimbus not in PATH; install or add to PATH" >&2; exit 0; }` — fail-open so missing-binary doesn't block the commit; (b) `nimbus diag --json >/dev/null 2>&1 || { echo "Gateway not reachable; skipping checks" >&2; exit 0; }` — fail-open when the Gateway is down so developers don't have to disable the hook to commit. Hook only blocks when the Gateway is reachable AND a check explicitly fails.
- Update `nimbus-file-map` skill and `CLAUDE.md` to point at the new files.
- Update `nimbus-commands` skill: list `audit:openapi-drift` + the hook-template install command.

**Tests:** unit (drift detector against fixture; YAML parse), integration (`GET /v1/openapi.json` returns parseable doc; bytes are stable across requests — cached), audit-gate test (introduces a fake handler without a schema entry; asserts `audit:openapi-drift` fails non-zero with annotation output).

**Coverage gate:** none new in PR 1 — the drift script joins `bun run test:scripts`.

### PR 2 — DORA Metrics

**Goal:** ship the four metric calculators behind a CLI + IPC + HTTP surface, gated by the existing config-validate path.

**Changes:**
- New `packages/gateway/src/metrics/dora.ts` with four pure functions: `deploymentFrequency`, `leadTimeForChanges`, `changeFailureRate`, `mttr`. Each takes `(db, serviceConfig, since)` and returns `{ value, unit, sample, gap }`. No I/O beyond the DB. CFR uses the most-recent-preceding-deploy attribution rule.
- Modify `packages/gateway/src/config/nimbus-toml.ts` to parse the new `[metrics.dora.<service-id>]` block into a typed `Map<string, DoraServiceConfig>`. Validation: known keys only; types match; `incident_window_minutes` ∈ [1, 1440]; `deploy_workflow_pattern` is a parseable regex (compiled once at config-load); each entry of `repos` parses as `<provider>:<id>` with provider ∈ `{github, gitlab, bitbucket, jenkins, circleci}`.
- New `packages/gateway/src/ipc/metrics-rpc.ts` with `dispatchMetricsRpc` handler. Method `metrics.dora { service: string, since?: string, configOverride?: DoraServiceConfig }` returns the four-metric envelope. Append `MetricsDoraResult` etc. to `ipc/types.ts`.
- New `packages/cli/src/commands/metrics.ts` with `dora` subcommand. Pretty mode renders a four-row card (label · value · unit · sample · gap-pill). JSON mode emits the IPC payload verbatim. Respect `NO_COLOR`.
- Update `packages/gateway/openapi/v1.yaml` to fill in the `/v1/metrics/dora` slot reserved by PR 1 (replace `x-nimbus-status: "reserved"` with full schema). The OpenAPI drift CI gate verifies parity with the new HTTP route.
- Modify `packages/gateway/src/ipc/http-server.ts` to add `GET /v1/metrics/dora?service=X&since=30d`.
- Update `nimbus-commands` skill, `nimbus-file-map` skill, `CLAUDE.md` to reference `metrics/dora.ts`, the new coverage gate, and the new IPC method.

**Tests:** unit (each metric: nominal, empty inputs, `low_sample`, `no_pagerduty_mapping`, `no_repos`, `no_deployment_data`, multi-PR-per-deploy, two-deploy-one-incident attribution to the most-recent-preceding deploy, revert exclusion, multi-provider mix in one `repos` list, regex-pattern-no-match yields `no_deployment_data`, fallback exact-match Lead Time, MTTR with N=1 and N=2 produces values plus `low_sample`), unit (TOML parse: missing fields, bad types, unknown keys, malformed URN, unparseable `deploy_workflow_pattern` regex), integration (real SQLite, seed 30d of synthetic PRs/runs/incidents — three providers in the fixture: GitHub Actions deploys, GitLab pipelines, and one Jenkins job — assert metrics within ±5% of hand-computed expected values), e2e (`nimbus metrics dora --service X --json` against a Gateway subprocess).

**Coverage gate:** new `bun run test:coverage:metrics` ≥ 80%, wired into `bun run test:ci` and the `_test-suite.yml` matrix.

### PR 3 — `nimbus-dev/query-action`

**Goal:** ship the reference GitHub Action that demonstrates the read-only HTTP API as a CI integration point.

**Changes (separate repo `nimbus-dev/query-action`):**
- New `action.yml` — composite action declaration with three checks (each toggleable via inputs):
  - `block-on-active-p1: 'true' | 'false' | 'warn'` (default `true`) — fails when `GET /v1/items?service=X&type=incident&since=24h` returns ≥1 incident with `severity = "p1"`.
  - `block-on-failing-ci: 'true' | 'false' | 'warn'` (default `warn`) — fails when a failing `ci_run` exists on the target branch.
  - `block-on-conflicted-pr: 'true' | 'false' | 'warn'` (default `warn`) — fails when target branch has open PRs with merge conflicts.
- New `src/index.ts` — TypeScript Action entry hitting `http://127.0.0.1:${input('nimbus-port')}/v1/items?...`. On HTTP failure, action fails with a clear "is the Gateway running on this runner?" message.
- New `README.md` — usage, with the self-hosted-runner caveat front and centre.
- CI: `bun test` against a mocked HTTP server fixture; no main-repo Gateway dep.

**Changes (main `nimbus-agent/Nimbus` repo):**
- New `packages/gateway/test/e2e/scenarios/query-action.e2e.test.ts` — runs a real Gateway subprocess + seeds an incident, then runs the action's `index.ts` via `Bun.spawn` against the live port. Asserts exit code reflects the configured policy.
- Update `docs/cli/use-in-ci.md` to point at the action.

**Tests in main repo:** the e2e above is the gating test. The action's own tests live in its repo and run there.

## Test strategy

### Test layers

| PR | Layer | What it covers |
|---|---|---|
| 1 | Unit (`packages/gateway/test/unit/openapi/parse.test.ts`) | YAML loads, JSON serialises, `x-nimbus-status: "reserved"` paths ignored at runtime route check |
| 1 | Unit (`scripts/structure-audit/check-openapi-drift.test.ts`) | Drift detection: handler-without-schema fails; schema-without-handler fails; `reserved` tag exempt |
| 1 | Integration (`packages/gateway/test/integration/http/openapi-route.test.ts`) | `GET /v1/openapi.json` returns parseable doc; bytes stable across requests |
| 1 | Audit (`bun run audit:openapi-drift`) | Wired into `_test-suite.yml` after `audit:doc-refs` |
| 2 | Unit (`packages/gateway/test/unit/metrics/dora.test.ts`) | Each metric: nominal, empty, `low_sample` gap, `no_pagerduty_mapping` gap, `no_repos` gap, `no_deployment_data` gap, multi-PR-per-deploy, two-deploy-one-incident attribution to most-recent-preceding, revert exclusion, multi-provider repos in one service, MTTR with N=1 and N=2, regex match against `ci_run.title` |
| 2 | Unit (`packages/gateway/test/unit/config/dora-config.test.ts`) | TOML parse: missing fields, bad types, unknown keys, range validation, malformed URN, unparseable `deploy_workflow_pattern` regex |
| 2 | Integration (`packages/gateway/test/integration/metrics/dora-real-db.test.ts`) | Fresh SQLite, seed 30d of synthetic PRs/runs/incidents — fixture spans three providers (GitHub Actions, GitLab, Jenkins) for one service to validate the multi-provider URN path — assert all four metrics within ±5% of hand-computed expected values |
| 2 | E2E (`packages/gateway/test/e2e/scenarios/metrics-dora.e2e.test.ts`) | `nimbus metrics dora --service X --json` against a Gateway subprocess |
| 3 | Unit (in `nimbus-dev/query-action` repo) | Action policies: each `--block-on-*` toggle, exit-code matrix, missing-Gateway error message |
| 3 | E2E (`packages/gateway/test/e2e/scenarios/query-action.e2e.test.ts`) | Real Gateway subprocess + seeded P1 incident → `Bun.spawn` the Action's `index.ts` → assert non-zero exit when `block-on-active-p1=true` |

### Fixtures

`packages/gateway/test/fixtures/dora/payment-service/` — synthetic 30d window with 13 successful deploy `ci_run` items spread across GitHub Actions (8), GitLab (4), and Jenkins (1); 22 merged PRs (3 reverts, excluded); 4 PagerDuty incidents (3 within 60-min CFR window — including one that follows two close-together deploys to validate the most-recent-preceding attribution rule; 1 outside the window). Hand-computed expected values committed alongside as `expected-metrics.json`. Reused by both PR 2 unit tests and integration tests — single source of seed truth.

### Coverage gates

- New: `bun run test:coverage:metrics` ≥ 80% (PR 2). Wired into `bun run test:ci` and `_test-suite.yml`.
- Existing `nimbus-file-map`, `nimbus-commands` skills, and `CLAUDE.md` get a one-line update naming `metrics/dora.ts` and the new coverage gate.

## Acceptance criteria

1. `nimbus metrics dora --service payment-service --since 30d --json` against the seeded fixture returns the four expected metric values within ±5%.
2. `bun run audit:openapi-drift` fails when a handler is added without a schema entry, and again when a schema entry is added without a handler.
3. `GET /v1/openapi.json` round-trips through `@readme/openapi-parser`'s validator without errors.
4. `nimbus-dev/query-action` blocks a deploy with exit code `1` when the local index has a P1 incident tagged to the target service.
5. The hook template installed via `cp docs/templates/nimbus-pre-commit.sh .git/hooks/pre-commit && chmod +x …` runs cleanly on a Gateway-running host and produces machine-readable output (`--format json`).
6. `nimbus metrics dora` against a service with no `[metrics.dora.<id>]` config returns `null` for all four metrics with explicit `gap` notes — exit code `0` (informational).
7. `nimbus metrics dora --service multi-provider-fixture` against a fixture with `repos = ["github:...", "gitlab:...", "jenkins:..."]` returns metrics that count deploys from all three providers (verified by the integration test's hand-computed expected values).
8. CFR with two successful deploys 5 minutes apart and one incident 10 minutes after the second deploy attributes the incident only to the second deploy (CFR = 0.5, not 1.0). Verified by a dedicated unit test.
9. MTTR with N=2 resolved incidents returns a numeric value plus `gap: "low_sample"` (not `null`).
10. New `bun run test:coverage:metrics` gate ≥ 80%.
11. Phase 5 sequencing doc and `docs/roadmap.md` both updated to mark T4 as ✅ when all three PRs land. The Phase 5 status line in `CLAUDE.md` and `GEMINI.md` includes `T4 ✅`.

## Risks & mitigations

- **Risk:** Lead-time computation requires `git_commit` graph edges, which are populated by the existing `pr` indexer but coverage on real repos varies.
  - **Mitigation:** fall back to `pr.merge_commit_sha → ci_run.metadata.headSha` exact match when the graph edge is missing; emit `gap: "approximate_lead_time"` to surface the limitation.
- **Risk:** `nimbus-dev/query-action` repo creation requires GitHub org admin.
  - **Mitigation:** PR 3 includes a "create repo" checklist item separate from the code; can be done by the org owner without blocking PR 1 + 2.
- **Risk:** Handwritten OpenAPI YAML drifting between PR 1 merge and PR 2 — six new fields land in PR 2.
  - **Mitigation:** PR 1 reserves the `/v1/metrics/dora` slot with stub schemas marked `x-nimbus-status: "reserved"`; PR 2 fills them in without touching path/method declarations. The drift CI gate explicitly exempts `reserved`-tagged paths.
- **Risk:** Defaulting `block-on-active-p1` to `true` might trip CI for users adopting the action without first wiring up a PagerDuty connector. Conversely, an unconfigured PagerDuty connector returns zero incidents — silently passing the gate when the user thinks it's protecting them.
  - **Mitigation:** the action queries `/v1/connectors` first and emits an explicit `"PagerDuty connector not enabled — block-on-active-p1 cannot protect this deploy"` warning when the connector is absent, regardless of `--block-on-active-p1` value. The action exits `0` when zero incidents are found *and* PagerDuty is enabled (true negative); exits `0` with the warning when PagerDuty is disabled (informational); exits `1` only on a real positive. Documented in the action README.
- **Risk:** The `[metrics.dora.<service-id>]` config could become stale once Phase 7 lands.
  - **Mitigation:** Phase 7 will read these mappings into the formal service catalog as one source. The config remains valid as an override in Phase 7+.
- **Risk:** `deploy_workflow_pattern` defaults to `^[Dd]eploy` — projects whose deploy job is named differently (e.g. `release-prod`, `Continuous Deployment`, `cd`) will produce `gap: "no_deployment_data"` until the user authors a per-service override.
  - **Mitigation:** the `no_deployment_data` gap note carries a hint string (`"no `ci_run` titles in <window> matched the regex `<pattern>`. Adjust [metrics.dora.<id>].deploy_workflow_pattern."`) so the failure mode is self-explanatory. Documented in the `nimbus-commands` skill and in the worked examples in `docs/cli/use-in-ci.md`.
- **Risk:** Future enhancement — populating `metadata.environment` on `ci_run` items from connectors that have it (GitHub Actions deployments API, GitLab `pipeline.environment`) — would let DORA prefer environment over title pattern. Doing it in T4 expands scope into connector territory.
  - **Mitigation:** out of scope for T4 (captured below). When a connector starts populating `metadata.environment`, DORA can be extended to prefer it (with `deploy_workflow_pattern` as fallback) without breaking existing config.
- **Risk:** Drift CI gate covers paths and methods but not parameter parity (reviewer feedback item 6). A handler could read a query param the schema doesn't document, or vice versa, without the gate noticing.
  - **Mitigation:** out of scope for T4 (deferred to a Phase 6 follow-up). The `nimbus query` E2E tests and the `query-action` E2E test are the practical safety net for parameter drift in Phase 5.

## Cross-references

- Phase 5 sequencing — [`2026-05-06-phase-5-sequencing-design.md`](./2026-05-06-phase-5-sequencing-design.md)
- T3 Team Intelligence (the agents whose `gap_note` pattern this spec reuses) — [`2026-05-07-phase-5-t3-team-intelligence-design.md`](./2026-05-07-phase-5-t3-team-intelligence-design.md)
- Wave A spec (the `service_name` inference pattern this spec mirrors) — [`2026-05-10-phase-5-wave-a-api-surface-obsidian-design.md`](./2026-05-10-phase-5-wave-a-api-surface-obsidian-design.md)
- Phase 7 Engineering Excellence design (consumer of the `[metrics.dora.<service-id>]` config) — [`2026-05-10-phase-7-engineering-excellence-design.md`](./2026-05-10-phase-7-engineering-excellence-design.md)
- Roadmap Phase 5 — [`docs/roadmap.md`](../../roadmap.md) — § "Nimbus as a CI/CD Data Layer"
- Architecture HTTP API surface — [`docs/architecture.md`](../../architecture.md) — § "Read-only HTTP API"
- Skill: `nimbus-ipc` (for the new `metrics.dora` IPC method)
- Skill: `nimbus-testing` (for the e2e + integration patterns)
- Skill: `nimbus-commands` (will be updated with the new bun script + CLI subcommand)

## Out-of-scope items captured for future planning

- Hosted-runner support for `nimbus-dev/query-action` (Phase 6).
- Marketplace publication of `nimbus-dev/query-action` (Phase 6).
- Generated OpenAPI from Zod-validated route definitions (Phase 6 if route count grows or schemas become non-trivial).
- DORA performance-level mapping (dashboard concern; not Gateway code).
- Per-PR Lead Time visualisation (dashboard concern; the underlying data is already in the metric output).
- `nimbus deployment record` write surface (deferred indefinitely — inferred deploys is the long-term shape).
- Pre-commit hook variants for Windows (PowerShell) and zsh shells (the Bash template covers the supported macOS/Linux dev surfaces; Windows pre-commit users typically run Git Bash already).
- Populating `metadata.environment` on `ci_run` items from GitHub Actions / GitLab APIs that expose deployment environment data. When this lands (likely Phase 6 alongside Marketplace v2), DORA will prefer `metadata.environment === "production"` over the title regex; the two paths coexist for backward compatibility with services using the regex.
- Parameter-level drift detection for the OpenAPI schema (handler reads a query param not documented; documented param never read by a handler). Path × method parity is the structural surface T4 cares about; param drift is a Phase 6 follow-up.
