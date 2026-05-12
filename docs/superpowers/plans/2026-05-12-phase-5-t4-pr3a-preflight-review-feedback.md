# Phase 5 T4 PR 3a — Pre-Deploy Index Check: Implementation Plan Review

**Date:** 2026-05-12
**Reviewer:** Gemini CLI
**Status:** Feedback Provided

## 1. Summary

The implementation plan for the Pre-Deploy Index Check is exceptionally detailed, providing clear steps, code snippets, and testing strategies across all surfaces (config, connectors, calculator, IPC, HTTP, CLI, and GitHub Actions). It correctly incorporates the feedback provided during the design review phase.

## 2. Questions & Clarifications

### 2.1 — Parallel Detail Fetches (Task 2, Step 11)
The plan proposes running PR detail fetches concurrently up to the `RateLimiter` cap.
- **Clarification:** While `Promise.all` is used in the pseudocode, ensure that the `RateLimiter.run()` implementation actually supports true concurrency and doesn't serialize under the hood if it's hitting the same "github" provider key. If the `RateLimiter` is global for the provider, it should correctly manage the queue.
- **Verification:** During implementation, verify that `fetchPrDetail` handles potential 403 (Forbidden) or 404 (Not Found) errors gracefully (e.g., for deleted PRs) without crashing the entire `Promise.all` chain.

### 2.2 — Security Invariant I11 (Task 5)
- **Reminder:** Task 5 implements `deploy.preflight`. If this IPC method is intended to be used by the Agent surface (e.g., an agent checking deploy status), ensure the result is wrapped via `wrapToolOutput` at the boundary as per Security Invariant I11. If it's strictly for the CLI/Action clients, this is less critical but still good practice for future surface expansion.

### 2.3 — Window Functions in SQLite (Task 3)
The `selectFailingCiRuns` query uses a CTE with `ROW_NUMBER() OVER (...)`.
- **Constraint Check:** Ensure the project's minimum supported SQLite version (via `bun:sqlite`) supports window functions. SQLite has supported them since 3.25.0 (2018), which should be safe for modern Bun runtimes, but it's worth a quick check on the environment.

### 2.4 — CLI Exit Codes (Task 7)
- **Observation:** The CLI exits 2 for Gateway errors or malformed envelopes.
- **Refinement:** Ensure that these exit codes are consistent with other `nimbus` subcommands (e.g., `nimbus metrics dora`). Standardizing error exit codes (e.g., 1 for usage/logic errors, 2 for connection/infra errors) helps CI script authors.

## 3. Suggestions for Improvement

### 3.1 — Action Versioning (Task 8)
- **Suggestion:** In `action.yml` and `README.md`, the version `v0.1.0` is used. Consider documenting the "major version" tag pattern (e.g., `v0`) so users can follow stable releases without pinning to every patch if desired.

### 3.2 — Mergeable State Freshness (Task 2)
- **Suggestion:** In `shouldRefreshMergeableState`, the 24h freshness window is hardcoded. While appropriate for v0.1.0, consider adding a comment noting that this could eventually be a user-configurable parameter in `nimbus.toml` if sync frequency requirements change.

## 4. Conclusion

The plan is technically sound and ready for execution. The inclusion of deterministic fixtures (`payment-service/seed.ts`) and a structural expected-envelope assertion (`expected-envelope.json`) is a high-quality pattern that should be maintained across future PRs.
