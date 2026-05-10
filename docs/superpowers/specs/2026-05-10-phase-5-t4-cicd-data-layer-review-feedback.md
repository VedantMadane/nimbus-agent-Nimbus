# Feedback: Phase 5 — T4 CI/CD Data Layer Design

> **Reviewer:** Gemini CLI
> **Date:** 2026-05-10
> **Target Spec:** `2026-05-10-phase-5-t4-cicd-data-layer-design.md`

## Summary

The design for T4 is architecturally sound and leverages the existing Nimbus infrastructure (Phase 3.5 HTTP API and unified index) effectively. The "zero-new-connectors" approach is a high-ROI strategy. The separation of the OpenAPI surface from the DORA logic and the external action is well-structured.

## Questions & Suggestions

### 1. DORA: Multi-Provider Support (GitHub/GitLab/Bitbucket)
The current `[metrics.dora.<service-id>]` config only defines `github_repos`. Since Phase 2 delivered GitHub, GitLab, and Bitbucket connectors, we should ensure the DORA metrics can consume data from all three.
- **Suggestion:** Rename `github_repos` to `repos` and use URNs (e.g., `github:owner/repo`, `gitlab:id`) or maintain per-provider lists (`github_repos`, `gitlab_projects`, `bitbucket_repos`).
- **Impact:** Ensures the CI/CD data layer isn't "GitHub-only" by accident.

### 2. DORA: Deployment Attribution for CFR
The Change Failure Rate (CFR) logic attributes an incident to any deploy within the `incident_window_minutes`.
- **Question:** If two successful deploys happen 5 minutes apart, and an incident opens 10 minutes later, will it be attributed to both?
- **Suggestion:** The logic should probably attribute an incident to the *most recent successful deployment* preceding the incident's `opened_at` time, provided it falls within the window.

### 3. DORA: Lead Time & Squash Merges
The lead time calculation mentions joining `pr.merged_at` to the first successful prod deploy whose `head_sha` matches `pr.merge_commit_sha`.
- **Question:** How does this handle squash-merges where the `merge_commit_sha` is the only commit on the target branch, but the `git_commit` graph might not have edges to the individual PR commits yet?
- **Suggestion:** Explicitly document the "Exact SHA match" fallback as the primary path for squash-merged repos.

### 4. DORA: MTTR Sample Size
The spec requires N < 3 resolved incidents to return `null` with `gap: "low_sample"`. 
- **Question:** Is there a reason for 3 specifically? For small teams, even 1 or 2 incidents might be useful to see as a "point-in-time" MTTR, even if the median isn't statistically significant.
- **Suggestion:** Consider allowing MTTR to compute for N >= 1 but keeping the `low_sample` gap note as a warning until N >= 3.

### 5. Config: Environment Normalization
`deploy_environment` defaults to `"production"`.
- **Question:** Different CI providers use different strings (e.g., `prod`, `Production`, `Live`).
- **Suggestion:** Allow `deploy_environment` to be a list of strings or a regex to capture common variants without manual per-service overrides.

### 6. OpenAPI: Handler vs. Schema Parity
The `audit:openapi-drift` script is a great addition.
- **Suggestion:** Ensure the script also checks for parameter parity (e.g., if the schema says `/v1/items` takes `since`, but the handler doesn't read it). This avoids "phantom parameters" in the docs.

### 7. Pre-commit Hook: Local Discovery
The pre-commit hook template calls `nimbus query --json`.
- **Question:** Does the hook assume the `nimbus` binary is in the PATH?
- **Suggestion:** Add a check in `nimbus-pre-commit.sh` to locate the binary or use `nimbus start --status` to verify the Gateway is reachable before attempting the query.

## Minor Improvements

- **Gap Notes:** Add a `"no_deployment_data"` gap note if `repos` are configured but zero `pipeline_run` items match the `deploy_environment`. This distinguishes between "nothing deployed" and "nothing configured".
- **CLI Output:** For `nimbus metrics dora`, if `NO_COLOR` is set, consider using a simpler ASCII layout for the "four-row card" to ensure readability.

## Final Verdict

**Approved with comments.** The design is ready for PR 1 once the multi-provider repository mapping (Point 1) is clarified.
