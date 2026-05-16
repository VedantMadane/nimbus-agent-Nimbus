# Review of Phase 5 T6 PR 4 — Typed `dbRun` / `dbExec` Migration Design

**Date:** 2026-05-16
**Status:** Review Feedback

Overall, the design is highly comprehensive, mechanical, and well-scoped. The triple-lock invariant (production wiring + docs + static/runtime enforcement) is an excellent approach to prevent regressions.

Here are a few open questions and suggestions for improvement before moving to execution:

### 1. Support for Named Parameters in `dbRun`

In Section 2, the proposed wrapper signature is:
```ts
export function dbRun(
  db: Database,
  sql: string,
  params?: unknown[],
): ReturnType<Database["run"]> {
  // ...
  if (params !== undefined && params.length > 0) { ... }
}
```
`bun:sqlite` supports passing objects for named parameters (e.g., `db.run("... $id", { $id: 1 })`). 
*   **Question**: Does the codebase currently use any named object parameters in its 94 `db.run` calls? 
*   **Suggestion**: If object bindings are used (or might be used in the future), `params` should be typed as something like `unknown[] | Record<string, unknown>`. Additionally, checking `params.length > 0` will fail if `params` is an object. Consider explicitly checking for arrays or simply passing `params` directly if it's defined and not empty.

### 2. What about `db.prepare(...).run()`?

The static audit rule `D12` and the migration focus exclusively on direct `db.run(` and `db.exec(` calls.
*   **Question**: Does the Gateway ever use prepared statements for writes (e.g., `const stmt = db.prepare("INSERT..."); stmt.run();`)? 
*   **Suggestion**: If prepared statements are used for writes, they will bypass the `dbRun` wrapper and could still swallow `SQLITE_FULL` errors. The design should explicitly call out `db.prepare` as out-of-scope (and why), or the static audit rule should be updated to flag `stmt.run()` usage if write statements are prepared.

### 3. Implicit Commits in `db.transaction(...)()`

The design mentions that `db.transaction(() => { ... })()` shells are out of scope.
*   **Question**: Can a `SQLITE_FULL` error be thrown during the implicit `COMMIT` of a transaction, even if the inner `dbRun` calls succeed?
*   **Suggestion**: If `bun:sqlite` defers writing and throws `SQLITE_FULL` when committing the transaction block, the outer transaction wrapper might need its own `try/catch` to route to `handleWriteError(err)`. It's worth validating this behavior in `bun:sqlite` during the implementation phase.

### 4. Edge Case: Result Typing for `db.run` inside Callbacks

In Section 4, the tactic mentions looking out for "a `db.run` inside a Promise callback where types shift." 
*   **Suggestion**: If any callbacks or interfaces expect a function returning `void`, changing the return type to `RunResult` might cause TypeScript strict mode to complain about returning a value where `void` is expected. File-by-file manual migration is indeed the right tactic here to catch these implicit type check failures.