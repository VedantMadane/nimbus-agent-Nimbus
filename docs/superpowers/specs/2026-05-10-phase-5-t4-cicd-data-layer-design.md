# Phase 5 — T4 CI/CD Data Layer Design

> **Status:** Draft for review
> **Author:** asafgolombek
> **Date:** 2026-05-10
> **Type:** Implementation spec — produces a published OpenAPI 3.1 schema, a new `nimbus metrics dora` CLI command + IPC method, a separate-repo GitHub Action (`nimbus-dev/query-action`), a pre-commit hook template, and `nimbus query` CI usage docs. Read-only; no HITL surface; no new connectors.
> **Parent:** Phase 5 sequencing spec — [`2026-05-06-phase-5-sequencing-design.md`](./2026-05-06-phase-5-sequencing-design.md). T4 is sub-project #4 in Phase 5 Core, after T1 (sequencing), T3 (Team Intelligence), and Wave A (API Surface + Obsidian).

## Purpose

T4 makes Nimbus a first-class data layer for CI/CD without expanding the connector mesh and without adding any write surface. The deliverables exploit data the index already holds — `pr`, `pipeline_run`, `incident`, `git_commit` — and expose it through:

1. A published, contract-stable HTTP surface (the OpenAPI 3.1 schema) so external tooling (CI scripts, future agents, contributors) can integrate without reading source.
2. A computed-on-demand DORA metrics command that turns the indexed data into the four canonical engineering-throughput numbers.
3. Reference automation packages — a self-hosted-runner GitHub Action and a pre-commit hook template — that demonstrate the integration patterns and unblock the Phase 5 acceptance criteria for "Nimbus as a CI/CD data layer."

T4 is the second Phase 5 sub-project (after T3) that ships without any new connector. It also unblocks the **Phase 7 Engineering Excellence** scope: the `[metrics.dora.<service-id>]` config table introduced here becomes the authoritative input that Phase 7's formal service catalog reads when it lands.

## Locked decisions (from brainstorming)

Five architectural choices that frame the rest of this spec, all settled before writing began:

| # | Decision | Reading |
|---|---|---|
| 1 | **Self-hosted runner only.** GitHub Actions in T4 assume a Gateway is already running on the runner host (CLI shell-out for invocations, `127.0.0.1:7474` for HTTP). The roadmap text already accepts this constraint. Hosted-runner support is explicitly deferred — re-evaluated in Phase 6 alongside Marketplace v2. | A |
| 2 | **Deploys are inferred, never written.** The roadmap's "post-deploy annotation" deliverable is reframed: any `pipeline_run` whose `environment` field equals the configured `deploy_environment` (default `production`) and whose `service` is mapped to the queried service id counts as a deploy. No new write surface, no new HITL action type, no `nimbus deployment record` command. The post-deploy-annotation GitHub Action is dropped. | A |
| 3 | **Service identity via config-driven map.** A new `[metrics.dora.<service-id>]` table in `nimbus.toml` maps the abstract service id to `github_repos`, `pagerduty_services`, and behaviour overrides. Phase 7 will consume the same table when the formal service catalog lands; T4's config does not become tech debt. | A |
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
│   └─ pipeline_run.environment, pr.merged_at, incident.*         │
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
github_repos = ["nimbus-agent/payments", "nimbus-agent/payments-go"]
pagerduty_services = ["P12ABCD"]
deploy_environment = "production"        # default; override for staging audits
incident_window_minutes = 60             # default; override for chatty alerting
exclude_pr_labels = ["revert"]           # default ["revert"]; merged but excluded from Lead Time
```

Validation runs at Gateway startup. Bad shapes (unknown keys, wrong types) fail the Gateway with a `nimbus config validate` pointer — the existing pattern used by other `[*]` tables.

### Inputs each metric reads

No new tables, no new sync.

| Metric | Read from | Filter |
|---|---|---|
| Deployment Frequency | `pipeline_run` items | `service ∈ github_repos`, `environment = deploy_environment`, `conclusion = success`, in `--since` window |
| Lead Time for Changes | `pr` items + `pipeline_run` items + `git_commit` graph edges | PR `merged_at` not null, `repo ∈ github_repos`, label not in `exclude_pr_labels`, joined to first successful prod deploy whose `head_sha` matches `pr.merge_commit_sha` (or any commit reachable from it through `git_commit` graph edges) |
| Change Failure Rate | `pipeline_run` (deploys) + `incident` items | Deploy `conclusion = success`, then any `incident` in `pagerduty_services` opened ∈ `[deploy_at, deploy_at + incident_window_minutes]` |
| MTTR | `incident` items | `pagerduty_service ∈ pagerduty_services`, `resolved_at` not null |

### Edge cases

| Case | Resolution |
|---|---|
| PR merged to a branch that's not `deploy_environment`'s ref | Excluded from Lead Time (no deploy join produces a result) |
| One deploy ships N PRs | Each PR's lead time = `merged_at → that deploy's deploy_at`; deploy not double-counted in Frequency |
| Multiple successful deploys for the same SHA (re-deploy) | First success wins for Lead Time; later ones still count for Frequency |
| Reverted PR | Excluded from Lead Time when label matches `exclude_pr_labels`. CFR still attributes the incident to whichever deploy carried the bug |
| Deploy + incident separated by ≥ `incident_window_minutes` | Not attributed (CFR is local-time, not causal) |
| Incident opened *before* the next deploy fixed it | MTTR uses `opened_at → resolved_at`; deploy correlation is CFR's job, not MTTR's |
| Service has no PagerDuty mapping configured | CFR + MTTR return `{ value: null, sample: 0, gap: "no_pagerduty_mapping" }`; Frequency + Lead Time still compute |
| Service has no GitHub repos configured | All four metrics return `null` with `gap: "no_github_repos"`; CLI exit code `0` (informational) |
| `--since` window contains < 3 deploys | Frequency / Lead Time / CFR return values but include `gap: "low_sample"` so dashboards can grey out instead of mislead |
| Window contains < 3 resolved incidents | MTTR returns `null` with `gap: "low_sample"` — DORA's median is meaningless on N<3 |
| `git_commit` graph edge missing for a merge commit | Lead Time falls back to exact `pr.merge_commit_sha → pipeline_run.head_sha` match; emits `gap: "approximate_lead_time"` to surface the limitation |

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

`gap` is one of: `null`, `"no_pagerduty_mapping"`, `"no_github_repos"`, `"low_sample"`, `"approximate_lead_time"`. The OpenAPI schema enumerates the set so external tools can branch on it.

## PR breakdown

### PR 1 — Foundations

**Goal:** ship the published HTTP surface contract + the CI integration docs + the pre-commit hook template. No new gateway logic; pure surface + docs.

**Changes:**
- New `packages/gateway/openapi/v1.yaml` with seven existing endpoints fully documented and the `/v1/metrics/dora` slot reserved (`x-nimbus-status: "reserved"`).
- Modify `packages/gateway/src/ipc/http-server.ts` to add `GET /v1/openapi.json` (cached YAML→JSON parse at startup) and to export the route table as a constant the drift detector can read.
- New `scripts/structure-audit/check-openapi-drift.ts` + `audit:openapi-drift` script in `package.json`.
- New `docs/cli/use-in-ci.md` with three worked examples: GitHub Actions self-hosted, GitLab CI, Jenkins. Each shows the `nimbus query --json | jq` pattern for incident-gate, PR-conflict-gate, failing-CI-gate.
- New `docs/templates/nimbus-pre-commit.sh` Bash hook checking related Linear/Jira tickets, active incidents, failing pipeline on the current branch via `nimbus query --json`. Configurable warn-vs-block via `NIMBUS_HOOK_BLOCK_ON_INCIDENT`, `NIMBUS_HOOK_BLOCK_ON_FAILING_CI`.
- Update `nimbus-file-map` skill and `CLAUDE.md` to point at the new files.
- Update `nimbus-commands` skill: list `audit:openapi-drift` + the hook-template install command.

**Tests:** unit (drift detector against fixture; YAML parse), integration (`GET /v1/openapi.json` returns parseable doc; bytes are stable across requests — cached), audit-gate test (introduces a fake handler without a schema entry; asserts `audit:openapi-drift` fails non-zero with annotation output).

**Coverage gate:** none new in PR 1 — the drift script joins `bun run test:scripts`.

### PR 2 — DORA Metrics

**Goal:** ship the four metric calculators behind a CLI + IPC + HTTP surface, gated by the existing config-validate path.

**Changes:**
- New `packages/gateway/src/metrics/dora.ts` with four pure functions: `deploymentFrequency`, `leadTimeForChanges`, `changeFailureRate`, `mttr`. Each takes `(db, serviceConfig, since)` and returns `{ value, unit, sample, gap }`. No I/O beyond the DB.
- Modify `packages/gateway/src/config/nimbus-toml.ts` to parse the new `[metrics.dora.<service-id>]` block into a typed `Map<string, DoraServiceConfig>`. Validation: known keys only; types match; `incident_window_minutes` ∈ [1, 1440]; `deploy_environment` non-empty.
- New `packages/gateway/src/ipc/metrics-rpc.ts` with `dispatchMetricsRpc` handler. Method `metrics.dora { service: string, since?: string, configOverride?: DoraServiceConfig }` returns the four-metric envelope. Append `MetricsDoraResult` etc. to `ipc/types.ts`.
- New `packages/cli/src/commands/metrics.ts` with `dora` subcommand. Pretty mode renders a four-row card (label · value · unit · sample · gap-pill). JSON mode emits the IPC payload verbatim. Respect `NO_COLOR`.
- Update `packages/gateway/openapi/v1.yaml` to fill in the `/v1/metrics/dora` slot reserved by PR 1 (replace `x-nimbus-status: "reserved"` with full schema). The OpenAPI drift CI gate verifies parity with the new HTTP route.
- Modify `packages/gateway/src/ipc/http-server.ts` to add `GET /v1/metrics/dora?service=X&since=30d`.
- Update `nimbus-commands` skill, `nimbus-file-map` skill, `CLAUDE.md` to reference `metrics/dora.ts`, the new coverage gate, and the new IPC method.

**Tests:** unit (each metric: nominal, empty inputs, `low_sample`, `no_pagerduty_mapping`, multi-PR-per-deploy, revert exclusion, multi-repo-per-service, fallback exact-match Lead Time), unit (TOML parse: missing fields, bad types, unknown keys), integration (real SQLite, seed 30d of synthetic PRs/runs/incidents, assert metrics within ±5% of hand-computed expected values), e2e (`nimbus metrics dora --service X --json` against a Gateway subprocess).

**Coverage gate:** new `bun run test:coverage:metrics` ≥ 80%, wired into `bun run test:ci` and the `_test-suite.yml` matrix.

### PR 3 — `nimbus-dev/query-action`

**Goal:** ship the reference GitHub Action that demonstrates the read-only HTTP API as a CI integration point.

**Changes (separate repo `nimbus-dev/query-action`):**
- New `action.yml` — composite action declaration with three checks (each toggleable via inputs):
  - `block-on-active-p1: 'true' | 'false' | 'warn'` (default `true`) — fails when `GET /v1/items?service=X&type=incident&since=24h` returns ≥1 incident with `severity = "p1"`.
  - `block-on-failing-ci: 'true' | 'false' | 'warn'` (default `warn`) — fails when failing `pipeline_run` exists on the target branch.
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
| 2 | Unit (`packages/gateway/test/unit/metrics/dora.test.ts`) | Each metric: nominal, empty, `low_sample` gap, `no_pagerduty_mapping` gap, multi-PR-per-deploy, revert exclusion, multi-repo-per-service |
| 2 | Unit (`packages/gateway/test/unit/config/dora-config.test.ts`) | TOML parse: missing fields, bad types, unknown keys, range validation |
| 2 | Integration (`packages/gateway/test/integration/metrics/dora-real-db.test.ts`) | Fresh SQLite, seed 30d of synthetic PRs/runs/incidents, assert all four metrics within ±5% of hand-computed expected values |
| 2 | E2E (`packages/gateway/test/e2e/scenarios/metrics-dora.e2e.test.ts`) | `nimbus metrics dora --service X --json` against a Gateway subprocess |
| 3 | Unit (in `nimbus-dev/query-action` repo) | Action policies: each `--block-on-*` toggle, exit-code matrix, missing-Gateway error message |
| 3 | E2E (`packages/gateway/test/e2e/scenarios/query-action.e2e.test.ts`) | Real Gateway subprocess + seeded P1 incident → `Bun.spawn` the Action's `index.ts` → assert non-zero exit when `block-on-active-p1=true` |

### Fixtures

`packages/gateway/test/fixtures/dora/payment-service/` — synthetic 30d window with 13 successful prod deploys, 22 merged PRs (3 reverts, excluded), 4 PagerDuty incidents (3 within 60-min CFR window, 1 outside). Hand-computed expected values committed alongside as `expected-metrics.json`. Reused by both PR 2 unit tests and integration tests — single source of seed truth.

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
7. New `bun run test:coverage:metrics` gate ≥ 80%.
8. Phase 5 sequencing doc and `docs/roadmap.md` both updated to mark T4 as ✅ when all three PRs land. The Phase 5 status line in `CLAUDE.md` and `GEMINI.md` includes `T4 ✅`.

## Risks & mitigations

- **Risk:** Lead-time computation requires `git_commit` graph edges, which are populated by the existing `pr` indexer but coverage on real repos varies.
  - **Mitigation:** fall back to `pr.merge_commit_sha → pipeline_run.head_sha` exact match when the graph edge is missing; emit `gap: "approximate_lead_time"` to surface the limitation.
- **Risk:** `nimbus-dev/query-action` repo creation requires GitHub org admin.
  - **Mitigation:** PR 3 includes a "create repo" checklist item separate from the code; can be done by the org owner without blocking PR 1 + 2.
- **Risk:** Handwritten OpenAPI YAML drifting between PR 1 merge and PR 2 — six new fields land in PR 2.
  - **Mitigation:** PR 1 reserves the `/v1/metrics/dora` slot with stub schemas marked `x-nimbus-status: "reserved"`; PR 2 fills them in without touching path/method declarations. The drift CI gate explicitly exempts `reserved`-tagged paths.
- **Risk:** Defaulting `block-on-active-p1` to `true` might trip CI for users adopting the action without first wiring up a PagerDuty connector. Conversely, an unconfigured PagerDuty connector returns zero incidents — silently passing the gate when the user thinks it's protecting them.
  - **Mitigation:** the action queries `/v1/connectors` first and emits an explicit `"PagerDuty connector not enabled — block-on-active-p1 cannot protect this deploy"` warning when the connector is absent, regardless of `--block-on-active-p1` value. The action exits `0` when zero incidents are found *and* PagerDuty is enabled (true negative); exits `0` with the warning when PagerDuty is disabled (informational); exits `1` only on a real positive. Documented in the action README.
- **Risk:** The `[metrics.dora.<service-id>]` config could become stale once Phase 7 lands.
  - **Mitigation:** Phase 7 will read these mappings into the formal service catalog as one source. The config remains valid as an override in Phase 7+.

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
