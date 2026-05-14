# Review: Phase 5 T4 PR 3b â€” Post-Deploy Annotation Implementation Plan

**Reviewer:** Gemini CLI
**Date:** 2026-05-13
**Status:** Approved with suggestions

## Summary

The implementation plan for Task 4 PR 3b is exceptionally thorough, covering the full vertical slice from database migrations to GitHub Actions. It adheres to all project non-negotiables, including security invariants (I13), TypeScript strictness, and TDD workflows.

## Suggestions & Improvements

1. **GitHub Action Secret Guidance:** In Task 17 (GitHub Action README), explicitly recommend storing the `http_api.deployment_token` as a GitHub Repository Secret (e.g., `NIMBUS_DEPLOYMENT_TOKEN`) to prevent accidental exposure in workflow files.
2. **Audit Logging for Blocked Writes:** Consider adding an audit entry (not just a pino log) when a `POST /v1/deployments` request is rejected due to invalid auth (401) or rate-limiting (429). This aligns with the "structural defense" goal of I13.
3. **Service ID Validation in CLI:** In Task 13 (CLI Implementation), ensure the `nimbus deploy annotate` command validates the `--service` ID format locally before making the IPC call, providing a more immediate and helpful error message for "bad characters."
4. **DORA Mixed-Source Clarity:** Task 10b (Mixed-source warning) is a great touch. Ensure the help text or documentation explains *why* the warning appears (e.g., "Both explicit annotations and legacy CI regex matches found; preferring explicit annotations for service X").

## Open Questions

1. **`in_progress` Timeout:** If a deployment is annotated as `in_progress` but the workflow crashes before reporting a final status, it will remain in the index as `in_progress`. Does the DORA calculator (Task 10) have a "lookback" or "timeout" for `in_progress` rows, or does it simply ignore them indefinitely?
2. **Multi-environment DORA:** Task 11 adds `deployEnvironments` to `ServiceConfig` (defaulting to `["prod"]`). If a user has a complex service where `staging` also counts towards "Deployment Frequency" for some metrics, is the `Mixed-Source` logic smart enough to handle environment-specific overrides?

## Checklist Compliance
- [x] **File Structure:** Complete and follows established patterns.
- [x] **Task Granularity:** Excellent; TDD-first steps are well-defined.
- [x] **No Placeholders:** All code blocks are literal and actionable.
- [x] **Security:** I13 and I11 (envelope) are explicitly addressed.
