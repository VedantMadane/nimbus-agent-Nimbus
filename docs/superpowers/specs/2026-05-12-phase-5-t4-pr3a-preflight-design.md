# Phase 5 T4 PR 3a — Pre-Deploy Index Check (`nimbus-dev/query-action`)

**Date:** 2026-05-12
**Status:** Draft — pending user review
**Phase / Sub-project:** Phase 5 → T4 (CI/CD Data Layer) → PR 3a
**Depends on:** T4 PR 1 (Published OpenAPI surface) and T4 PR 2 (`[metrics.dora.<id>]` config + `github-sync` PR metadata enrichment), both shipped.

---

## 1. Purpose

Ship the first **active** CI/CD integration for Nimbus: a GitHub Action that calls the local Gateway's HTTP API before a deploy job runs and surfaces three signals — active P1 incidents on the target service, failing CI runs on the target branch, open PRs with merge conflicts — as workflow annotations + a job summary, with operator-controlled blocking behavior.

The Action is a thin wrapper over a new portable composite check exposed on three Gateway surfaces (IPC method, HTTP route, CLI subcommand), mirroring the T4 PR 2 DORA shape. The pure calculator stays I/O-free below the `Database` handle.

PR 3b (Post-deploy annotation) is **out of scope** here and gets its own design — it introduces a write path that demands separate review.

---

## 2. Goals and non-goals

### Goals

- A configured Nimbus service (matching `[metrics.dora.<id>]` or the new `[ci.service.<id>]` alias) can be queried for pre-deploy readiness via `GET /v1/preflight/deploy?service=<id>&target_ref=<branch>`.
- The same logic is callable from `nimbus deploy preflight --service <id> --target-ref <branch>` and over IPC `deploy.preflight`.
- A first-party GitHub Action published at `nimbus-agent/query-action` wraps the HTTP endpoint, sets a workflow exit code based on operator-chosen `mode` (`warn` / `block` / `off`), and emits annotations + a job summary.
- The check stays usable in `warn` mode without any operator action beyond installing the Action and running the Gateway on a self-hosted runner — i.e. day-one onboarding has no false-block risk.
- All four surfaces share one canonical envelope shape (`DeployPreflightResult`).

### Non-goals

- Post-deploy annotation (writes into the index). That's PR 3b.
- Hosted-runner support (calling a local Gateway from `ubuntu-latest`). Local-first invariant blocks the tunnel patterns required.
- Jenkins / GitLab CI plugin packages. The CLI is portable to those today; only the GH Action JS wrapper is in scope.
- Marketplace listing automation. We publish the repo + tag; the operator-driven Marketplace listing is a one-time UI step done after the first tag is up.
- A `service.<id>` block refactor (the long-term unification with Phase 7's service catalog). The `[ci.service.<id>]` alias here is the minimal forward-leaning move.

---

## 3. Architecture overview

Four cooperating surfaces, identical to the DORA shape:

| Surface | Location | Role |
|---|---|---|
| **IPC method** `deploy.preflight` | `packages/gateway/src/ipc/preflight-rpc.ts` | Validates params (`service`, `target_ref`, optional `max_findings`), calls the pure calculator, returns the envelope. Wired into `tryDispatchPhase4Rpc` via a new `preflightRpcSkipped` sentinel. |
| **HTTP route** `GET /v1/preflight/deploy` | `packages/gateway/src/ipc/http-server.ts` + `http-routes.ts` + `openapi/v1.yaml` | Thin wrapper over `dispatchPreflightRpc`. Query params `service` (required), `target_ref` (required), `max_findings` (optional, 1..50). Catches only `PreflightRpcError` and returns it as 400; everything else propagates to the outer `fetch` catch which returns a generic 500 (the CodeQL pattern from the DORA HTTP fix). |
| **CLI** `nimbus deploy preflight` | `packages/cli/src/commands/deploy.ts` | New `deploy` subcommand with `preflight` first action. Pretty card + `--json` + `NO_COLOR` respect. Exit code 0 by default; `--mode block` exits 1 when verdict is `warn`. |
| **GitHub Action** `nimbus-agent/query-action` | Source: `packages/github-actions/preflight-query/`. Published via release-on-tag to separate `nimbus-agent/query-action` repo. | Calls the HTTP endpoint, renders annotations + job summary, sets exit code per `mode`. |

**Pure calculator:** `packages/gateway/src/preflight/preflight.ts` exports `computeDeployPreflight(db, cfg, targetRef, nowMs, maxFindings) → DeployPreflightResult`. SELECT-only against `item`; no I/O below `db`. Same architectural rule as `dora.ts`.

**Connector enrichment:** `packages/gateway/src/connectors/github-sync.ts` learns to detail-fetch `mergeable` / `mergeable_state` for open PRs (the only signal that identifies merge conflicts). Section 5.2 covers the policy.

---

## 4. Composite endpoint contract

### 4.1 — Envelope types

```ts
export type PreflightGap =
  | null
  | "no_repos"
  | "no_pagerduty_mapping"
  | "no_target_ref"
  | "unknown_mergeable_state";

export type IncidentFinding = {
  readonly id: string;                  // pagerduty:<incident_id>
  readonly title: string;
  readonly status: "triggered" | "acknowledged";
  readonly severity: string;            // raw PagerDuty severity, "P1" for our filter
  readonly opened_at_ms: number;
  readonly pagerduty_service_id: string;
  readonly url: string | null;
};

export type CiFinding = {
  readonly id: string;                  // github_actions:<run_id> | gitlab:... | jenkins:...
  readonly title: string;               // workflow name
  readonly conclusion: "failure" | "cancelled" | "timed_out";
  readonly modified_at_ms: number;
  readonly branch: string;
  readonly head_sha: string | null;
  readonly url: string | null;
};

export type PrFinding = {
  readonly id: string;                  // github:pr_<repo>#<number>
  readonly title: string;
  readonly number: number;
  readonly mergeable_state: string;     // "dirty" | "blocked" | etc.
  readonly modified_at_ms: number;
  readonly url: string | null;
};

export type PreflightCheck<F> = {
  readonly count: number;               // total findings in scope, NOT length of findings
  readonly findings: readonly F[];      // capped to max_findings, most-recent-first
  readonly gap: PreflightGap;
};

export type DeployPreflightResult = {
  readonly service: string;
  readonly target_ref: string;
  readonly computed_at: string;         // ISO 8601, from nowMs
  readonly verdict: "ok" | "warn";      // server never emits "block"
  readonly checks: {
    readonly active_p1_incidents: PreflightCheck<IncidentFinding>;
    readonly failing_ci_runs: PreflightCheck<CiFinding>;
    readonly merge_conflicts: PreflightCheck<PrFinding>;
  };
};
```

### 4.2 — Verdict rule

`verdict = "ok"` iff every check has `count === 0` **and** every check has `gap === null`. Otherwise `verdict = "warn"`. Any non-null gap counts as a warn signal so a misconfigured service still surfaces visibly. The server never emits `"block"` — that mapping happens client-side based on the Action's `mode`.

### 4.3 — Query semantics

1. **Active P1 incidents** — `service='pagerduty' AND type='incident' AND json_extract(metadata, '$.pagerduty_service_id') IN (cfg.pagerdutyServices) AND json_extract(metadata, '$.status') IN ('triggered','acknowledged') AND json_extract(metadata, '$.severity') = 'P1'`. Two queries: `COUNT(*)` for `count`, then `SELECT ... LIMIT max_findings` ordered by `opened_at_ms DESC` for the sample. `gap = "no_pagerduty_mapping"` when `cfg.pagerdutyServices.length === 0`.

2. **Failing CI runs on `target_ref`** — `service IN (cfg.repos → providerServiceColumns().ciServices) AND type='ci_run' AND json_extract(metadata, '$.branch') = ? AND json_extract(metadata, '$.conclusion') IN ('failure','cancelled','timed_out')`. Filter to the **most recent run per workflow name**: the same workflow can have many failing historical runs, but only the latest matters for "is it safe to deploy *now*". Implementation: SQL window over `workflow_name`, `branch`, `service`, picking `MAX(modified_at_ms)`. `gap = "no_repos"` when the URN-to-service-column map is empty. `gap = "no_target_ref"` is rejected at param-validation time (target_ref is required), so this gap appears only when the caller omits it via raw CLI/IPC use without the Action; param validation makes it unreachable via HTTP.

3. **Open PRs with merge conflicts** — `service IN (cfg.repos → prServices) AND type='pr' AND json_extract(metadata, '$.state') = 'open' AND json_extract(metadata, '$.mergeable_state') = 'dirty'`. A separate `SELECT COUNT(*)` over the same `service IN (...) AND type='pr' AND state='open' AND mergeable_state IS NULL` populates a secondary counter. If that counter > 0, emit `gap = "unknown_mergeable_state"` and document in the response: operators learn that the index is incomplete and the `count` they're seeing is a lower bound.

### 4.4 — `max_findings` parameter

Default 10 per check. Range 1..50. Enforced at param validation; out-of-range throws `PreflightRpcError(-32602, ...)`. The Action exposes this as `max-findings` input (default 10) and uses the cap directly to size its annotation list.

### 4.5 — Example response

```json
{
  "service": "payment-service",
  "target_ref": "main",
  "computed_at": "2026-05-12T10:15:30.000Z",
  "verdict": "warn",
  "checks": {
    "active_p1_incidents": {
      "count": 1,
      "findings": [
        {
          "id": "pagerduty:Q1ABCD",
          "title": "DB connection pool exhausted",
          "status": "triggered",
          "severity": "P1",
          "opened_at_ms": 1715000000000,
          "pagerduty_service_id": "P12ABCD",
          "url": "https://nimbus-agent.pagerduty.com/incidents/Q1ABCD"
        }
      ],
      "gap": null
    },
    "failing_ci_runs": { "count": 0, "findings": [], "gap": null },
    "merge_conflicts": { "count": 2, "findings": [], "gap": null }
  }
}
```

---

## 5. Config alias + `github-sync` enrichment

### 5.1 — `[ci.service.<id>]` alias

`packages/gateway/src/metrics/dora-config.ts` renames `DoraServiceConfig` to `ServiceConfig`, keeping `export type DoraServiceConfig = ServiceConfig;` for back-compat. `dora.ts`, `metrics-rpc.ts`, the DORA fixtures, and all existing call sites compile unchanged.

`packages/gateway/src/config/nimbus-toml.ts` keeps `parseNimbusDoraToml` (handles `[metrics.dora.<id>]`) and adds `parseNimbusCiServiceToml` (handles `[ci.service.<id>]`). Same fields: `repos`, `pagerduty_services`, `deploy_workflow_pattern`, `incident_window_minutes`, `exclude_pr_labels`. A new `loadNimbusServiceConfigsFromConfigDir(configDir)` returns the union.

**Conflict rule:** if a service id appears under both `[metrics.dora.<id>]` and `[ci.service.<id>]`, the `[ci.service.<id>]` block wins (forward-leaning). On Gateway startup, a single warning line is logged naming the conflict and the chosen block. A unit test asserts both halves: which wins, and that the warning is emitted exactly once.

**Caller updates:** `metrics-rpc.ts` and the new `preflight-rpc.ts` both call `loadNimbusServiceConfigsFromConfigDir` (DORA gets the alias automatically).

### 5.2 — `github-sync.ts` PR `mergeable_state` enrichment

`extractPrMetadataForIndex` learns to read `mergeable` (boolean) and `mergeable_state` (string) from the input PR record. These fields are **only present on the GitHub PR detail endpoint** (`GET /repos/{owner}/{repo}/pulls/{n}`), not the list endpoint.

Policy (sub-option **b** from the brainstorm):

- For an open PR returned from the list endpoint with `mergeable_state` missing **and** `updated_at` within the last 7 days, fetch detail.
- For an open PR whose indexed metadata already has `mergeable_state` set with a freshness timestamp < 24h, skip the detail fetch.
- For an open PR older than 7 days with no `mergeable_state` indexed, leave `mergeable_state` as `null` and accept the lower-bound count + `unknown_mergeable_state` gap.

This bounds detail-API cost to roughly the number of recently active open PRs per sync cycle while keeping the freshest signals up to date. A new contract test asserts:

- The detail fetch is rate-limited via the existing `RateLimiter`.
- A 429 from the detail endpoint transitions the github connector to `rate_limited` health (same path the list endpoint uses).
- `mergeable_state_fetched_at_ms` is captured alongside `mergeable_state` in the indexed metadata so the 24h freshness check is self-contained.

No DB migration: the new metadata fields ride on the existing `item.metadata` JSON blob.

---

## 6. GitHub Action

### 6.1 — Source layout

```
packages/github-actions/preflight-query/
├── action.yml
├── package.json            (private; published-via-tag)
├── src/
│   ├── main.ts
│   ├── render.ts           (envelope → annotations + summary)
│   └── render.test.ts
├── dist/
│   └── index.js            (bundled, committed — GH Actions runtime requirement)
└── README.md
```

### 6.2 — `action.yml` inputs

| Input | Type | Required | Default | Notes |
|---|---|---|---|---|
| `service` | string | yes | — | Nimbus service id (matches `[metrics.dora.<id>]` / `[ci.service.<id>]`). |
| `target-ref` | string | no | `${{ github.ref_name }}` | The branch/ref being deployed. |
| `gateway-url` | string | no | `http://localhost:7474` | Base URL of the Gateway's read-only HTTP API. Self-hosted runner default. |
| `mode` | string | no | `warn` | One of `warn`, `block`, `off`. `off` always exits 0; useful for soft rollout. |
| `max-findings` | string | no | `10` | Cap on findings per check rendered as annotations (1..50). |
| `timeout-ms` | string | no | `10000` | HTTP timeout. Beyond this → "Gateway unreachable" annotation + exit code per `mode`. |

### 6.3 — `action.yml` outputs

| Output | Notes |
|---|---|
| `verdict` | `ok`, `warn`, or `block` — the Action's interpretation of the server-side `verdict` combined with the configured `mode`. |
| `incident-count`, `failing-ci-count`, `merge-conflict-count` | Raw counts for downstream steps. |
| `result-json` | Full envelope serialized. |

### 6.4 — `runs:` block

`using: "node20"`, `main: "dist/index.js"`. Standard JS action (composite-only doesn't support the branching mode logic cleanly).

### 6.5 — Exit-code mapping

| `mode` | server `verdict='ok'` | server `verdict='warn'` | Gateway unreachable |
|---|---|---|---|
| `off` | 0 | 0 | 0 (annotation only) |
| `warn` (default) | 0 | 0 (annotations + summary) | 0 (annotation: degraded) |
| `block` | 0 | 1 | 1 (treats unreachable as failure) |

### 6.6 — Rendering

- **Job summary** (markdown appended to `$GITHUB_STEP_SUMMARY`): one table row per check (count + first finding's title); collapsed details block per check with the full capped list.
- **Annotations** (`::warning` or `::error` per `mode`): one per finding. Failing CI annotations link the workflow run URL; PR conflict annotations link the PR URL; incident annotations link the PagerDuty URL.
- **Gateway unreachable**: single `::warning` "Nimbus Gateway unreachable at `${gateway-url}` after `${timeout-ms}`ms — pre-deploy index check skipped." For `mode: block`, the level becomes `::error` + exit 1.

### 6.7 — Publishing flow

1. Source authored in the Nimbus monorepo (`packages/github-actions/preflight-query/`). PR review path; `dist/index.js` committed alongside source.
2. Bundle via `bun build --target=node` (or `ncc`) into `dist/index.js`.
3. Release tag `preflight-action-v0.1.0` on the monorepo triggers a workflow that copies `action.yml` + `dist/` + `README.md` to a separate `nimbus-agent/query-action` checkout, commits, and tags `v0.1.0` there.
4. Operators reference: `uses: nimbus-agent/query-action@v0.1.0`.
5. The Marketplace listing is created by hand from the GitHub UI after the first tag is up. No code change required for v0.1.0.

### 6.8 — Auth / network model

None required. The Gateway is local-only; the runner reaches it via `http://localhost:7474` on the same machine (self-hosted runner). The README documents this prominently and rejects hosted-runner usage explicitly — calling a local Gateway from `ubuntu-latest` is not in scope for v0.1.0.

### 6.9 — Usage example

```yaml
- name: Pre-deploy index check
  uses: nimbus-agent/query-action@v0.1.0
  with:
    service: payment-service
    mode: warn          # use 'block' once you trust the signal
  # Self-hosted runner. Gateway must be running locally.
```

---

## 7. Testing and coverage

| Layer | Location | Approximate count |
|---|---|---|
| Unit — preflight calculator | `packages/gateway/test/unit/preflight/preflight.test.ts` | ~15 cases — one per check × every gap branch + verdict ok/warn boundaries |
| Unit — TOML alias parser | `packages/gateway/test/unit/config/ci-service-toml.test.ts` | ~6 cases — same-id conflict, both keys, alias type compatibility |
| Unit — github-sync mergeable enrichment | `packages/gateway/test/unit/connectors/github-sync-mergeable.test.ts` | ~4 cases — captures fields, tolerates absence, respects freshness cutoff |
| Integration — fixture-seeded calculator | `packages/gateway/test/fixtures/preflight/payment-service/seed.ts` + `dora-real-db.test.ts` analog | 1 envelope-shape assertion; ~6 expect calls |
| Unit — IPC | `packages/gateway/test/unit/ipc/preflight-rpc.test.ts` | ~6 cases — param validation, verdict propagation, unknown-service envelope, array rejection, miss path |
| Integration — HTTP | `packages/gateway/test/integration/http/preflight-deploy-route.test.ts` | ~4 cases — 200 envelope, 400 missing-service, 400 missing-target_ref, generic 500 on internal error |
| Unit — CLI | `packages/cli/src/commands/deploy.test.ts` | ~6 cases — arg parser |
| Smoke — CLI | `packages/cli/test/e2e/deploy.smoke.e2e.test.ts` | ~4 cases — gateway-not-running, missing-service, unknown-mode, help integration |
| E2E — in-process | `packages/gateway/test/e2e/scenarios/preflight-deploy.e2e.test.ts` | ~2 cases — fixture-seeded service, verdict transitions |
| Action rendering | `packages/github-actions/preflight-query/src/render.test.ts` + `main.test.ts` | ~8 cases — pure rendering + mock-fetch exit-code per `mode` |

**Coverage gate:** `bun run test:coverage:preflight` ≥ **80%**. Wired into `scripts/lib/ci-tests.ts` between `:metrics` and the next gate. Same shape as the DORA gate; same matrix entry in `.github/workflows/_test-suite.yml`.

**Approximate total:** ~55 new tests. The DORA PR landed ~50 across the same surfaces.

---

## 8. Acceptance criteria

- [ ] `GET /v1/preflight/deploy?service=payment-service&target_ref=main` returns the envelope with status 200 for a configured service.
- [ ] `nimbus deploy preflight --service payment-service --target-ref main --json` prints the same envelope. Pretty mode renders a labelled card; `--mode block` exits 1 when `verdict='warn'`.
- [ ] `nimbus-agent/query-action@v0.1.0` is tagged on the separate repo; a sample workflow exercising the seeded payment-service fixture passes through `mode: warn` and `mode: block` correctly (exit code + annotations + job summary).
- [ ] `bun run test:coverage:preflight` ≥ 80%. All new tests + the existing suites green.
- [ ] `bun run audit:openapi-drift` clean — `/v1/preflight/deploy` added to both `READ_ONLY_HTTP_ROUTES` and `v1.yaml`.
- [ ] `[ci.service.<id>]` alias documented in `docs/architecture.md` config section; same-id conflict rule + chosen winner documented.
- [ ] `github-sync.ts` `mergeable_state` enrichment merged with a unit test covering the 7d/24h freshness rule and the rate-limit contract.
- [ ] Roadmap "Pre-deploy index check" bullet flipped to `[x]` with date and PR ref; "Post-deploy annotation" bullet remains `[ ]` (PR 3b).
- [ ] CLAUDE.md + GEMINI.md status line gains `· T4 PR 3a pre-deploy check ✅`.

---

## 9. Out of scope (explicitly deferred)

1. **Post-deploy annotation** — PR 3b. Requires a write-side HTTP endpoint and its own design pass; introduces audit logging and a HITL-classification decision (does writing a deploy event need consent?).
2. **Hosted-runner support** — calling a local Gateway from `ubuntu-latest` requires a tunneling pattern that breaks the local-first invariant. README documents self-hosted-only.
3. **PagerDuty connector enrichment** (the follow-up tracked from T4 PR 2) — still depends on `opened_at_ms` and `pagerduty_service_id` on indexed incidents. PR 3a does not block on this: the preflight check uses `status` + the existing `pagerduty_service_id` via `json_extract` (same path the DORA fix proved). If `pagerduty_service_id` is absent on real-data incidents, the preflight check returns `count: 0` for incidents — same fixture-seeded story as DORA. The PagerDuty enrichment remains a single shared follow-up benefiting both surfaces.
4. **Multi-CI provider Actions** (Jenkins, GitLab CI) — `nimbus deploy preflight` CLI works in any CI today; only the GH Action JS wrapper is in scope. Jenkins / GitLab examples land in `docs/cli/use-in-ci.md` as a follow-up doc, not a packaged integration.
5. **Marketplace listing automation** — the listing UI step is one-time and operator-driven after the first tag.
6. **`[service.<id>]` block refactor** — the long-term unification with Phase 7's service catalog. The `[ci.service.<id>]` alias here is the minimal forward-leaning move; the unification belongs with Phase 7.

---

## 10. Open questions to revisit in the implementation plan

- **`workflow_name` on the failing-CI query** — the github_actions connector stores workflow identifiers as part of the `title` field, not as a structured metadata key. Implementation plan needs to verify whether `metadata.workflow_name` exists or whether we group by `title` instead. If neither is stable, fall back to "most recent CI run per (head_sha, branch)" — coarser but never wrong.
- **`updated_at` source for the github-sync 7d freshness cutoff** — confirm the existing list-endpoint sync captures `updated_at`. If it's stored on the indexed item as `modified_at`, the cutoff trivially holds; if it's on `metadata.updated_at`, we need to make sure it's populated.
- **`max_findings` per check vs across the envelope** — current spec is per-check. An operator with 200 failing CI runs and 0 of anything else gets 10 CI annotations. Verify this is what we want vs. a single envelope-wide cap.
- **Pretty-mode rendering of `gap` notes** — DORA renders `[gap_name]` next to the value. Preflight has structured findings, not a single value. Confirm whether the CLI pretty card shows gaps inline next to counts or in a footer.

These belong in the implementation plan's "design choices" section, not in this spec — they don't block the architecture being correct, only the surface details.

---

## 11. References

- `docs/superpowers/specs/2026-05-06-phase-5-sequencing-design.md` — Phase 5 Core order; T4 sequencing.
- `docs/superpowers/specs/2026-05-10-phase-5-t4-cicd-data-layer-design.md` — original T4 design.
- `docs/superpowers/plans/2026-05-11-phase-5-t4-pr2-dora-metrics.md` — DORA implementation plan (mirror this shape).
- `.claude/commands/nimbus-ipc.md`, `.claude/commands/nimbus-testing.md`, `.claude/commands/nimbus-connector-authoring.md` — cross-cutting authoring contracts.
