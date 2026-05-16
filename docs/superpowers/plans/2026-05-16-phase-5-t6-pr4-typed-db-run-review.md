# Review of Phase 5 T6 PR 4 — Typed `dbRun` / `dbExec` Migration Implementation Plan

**Date:** 2026-05-16
**Status:** Review Feedback

The implementation plan is exceptionally thorough and provides a clear, step-by-step path for this large mechanical refactor. The addition of `dbStmtRun` to handle prepared statements directly addresses a key gap identified in the design review.

Here are a few suggestions for improvement and open questions:

### 1. `dbRun` Signature: Named Object Parameters

Task 1 defines `dbRun` with `params?: unknown[]`. 
*   **Observation**: `bun:sqlite` also supports object bindings (e.g., `{ $id: 1 }`).
*   **Suggestion**: Update the signature and logic in Task 1 to support `unknown[] | Record<string, unknown>`. Ensure the check for "non-empty params" works for both types (e.g., using `params && (Array.isArray(params) ? params.length > 0 : Object.keys(params).length > 0)`).

### 2. Transaction Commit Exceptions

Task 6 handles `db.transaction` shells by migrating their inner calls.
*   **Question**: If a transaction succeeds in its inner `dbRun` calls but fails with `SQLITE_FULL` during the implicit `COMMIT` (when the returned function is executed), will that error be caught and translated?
*   **Suggestion**: Consider if `db.transaction(() => { ... })()` call sites themselves should be wrapped in a helper or a `try/catch` that routes to `handleWriteError`. At minimum, Task 11 should include an integration test case for a transaction block failing at commit time due to a full disk.

### 3. Task 9 Regex: Handling `this.db.run`

The plan's Task 9 Step 3 uses the regex `/\bdb\.(?:run|exec)\s*\(/`.
*   **Observation**: Some sites might use `this.db.run(` (as noted in Task 4's Step 3 description).
*   **Suggestion**: Ensure the regex in the audit script is robust enough to catch `this.db.run` and other common variations (e.g., `/\b(?:this\.)?db\.(?:run|exec)\s*\(/`). The plan mentions this in some parts but the Step 3 snippet shows a simpler regex.

### 4. Integration Test Coverage for Prepared Statements

Task 11 adds great integration tests.
*   **Suggestion**: Add one explicit test case in Task 11 that triggers a `DiskFullError` via `dbStmtRun` using a prepared statement. This ensures the new helper is also correctly translating errors in a "live" scenario.

### 5. `dbStmtRun` Parameter Handling

The plan introduces `dbStmtRun(stmt, ...params)`.
*   **Suggestion**: Similar to `dbRun`, ensure `dbStmtRun` correctly handles both positional and named parameters if they are used in prepared statements. (Most prepared statements in the hit-list seem to use positional parameters, but it's good to be forward-compatible).
