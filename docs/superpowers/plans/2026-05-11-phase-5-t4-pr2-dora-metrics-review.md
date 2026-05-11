# Review: Phase 5 T4 PR 2 — DORA Metrics Implementation Plan

**Reviewer:** Gemini CLI  
**Date:** 2026-05-11  
**Status:** ✅ Approved with minor suggestions

The plan for DORA Metrics implementation is comprehensive, well-structured, and aligns perfectly with Nimbus's architectural patterns (pure calculators, local-first index, strict TDD).

## Strengths
- **Empirical Gap Analysis:** Correctly identified that `merged_at` and `merge_commit_sha` were missing from the current schema/connectors and added tasks (1 & 2) to resolve this.
- **Pure Calculators:** Keeping the metrics logic in `packages/gateway/src/metrics/dora.ts` I/O-free (taking `Database` and `config`) ensures high testability.
- **Config Validation:** Comprehensive validation in the TOML parser (Task 3) prevents the Gateway from starting with a broken config.
- **Fixture-Driven Integration:** Using a synthetic 30-day window fixture (Task 5) is the right way to verify metric correctness before the connectors are fully enriched.

## Suggestions / Observations

### 1. Security & Invariants
- The plan focuses on `SELECT` queries, so **I2 (HITL)** is not triggered.
- Ensure that the new `metrics.dora` RPC method is correctly excluded from HITL requirements in `ToolExecutor.gate()` if the gateway defaults to "deny-all" for new namespaces (it currently gates on a whitelist, so verify `metrics.dora` isn't accidentally blocked or requires consent if it's read-only).

### 2. Lead Time Logic
- The "exact-SHA" join is a solid first step. The plan notes that transitive commit walking is out of scope. This is a reasonable trade-off for PR 2.
- **Observation:** If a PR is merged via "Rebase and Merge", the `merge_commit_sha` might not exist or might point to a commit that isn't the one deployed if the CI runs on the source branch. The fallback to `approximate_lead_time` is a good way to handle these edge cases.

### 3. PagerDuty Connector Enrichment
- Task 4 correctly identifies that `metadata.opened_at_ms` and `metadata.pagerduty_service_id` are missing from the current connector.
- Since the fixture seeds these, the tests will pass. Ensure the follow-up task for the PagerDuty connector is tracked in the project's backlog (or `docs/roadmap.md`).

### 4. CLI Output
- The `formatPretty` function in Task 8 uses manual padding. Consider if existing CLI table helpers (if any) should be used for consistency, though manual padding is fine for a simple card view.

### 5. Performance
- `selectDeploys` and `selectResolvedIncidents` use `JSON.parse` in a loop. For very large indexes (e.g., thousands of CI runs), this might become a bottleneck. Since DORA is typically run on-demand for a specific service and window, this is likely fine for now, but something to watch.

## Questions for Implementation
- **Task 9 Step 1:** Does `test:ci` already exist in the root `package.json`? If not, ensure it's created or the aggregate command is updated correctly.
- **Task 7 Step 3:** Is `json` helper already available in `http-server.ts`? If not, it should be defined or the standard `Response` constructor used.

## Final Verdict
The plan is ready for execution. Recommend using **Subagent-Driven Development** for the implementation phase due to the distinct boundaries between DB, Gateway, and CLI tasks.
