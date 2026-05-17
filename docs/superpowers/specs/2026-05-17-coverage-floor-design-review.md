# Review: Coverage Floor Design (2026-05-17)

Here are some open questions, suggestions, and potential improvements regarding the `2026-05-17-coverage-floor-design.md` specification.

## 1. CLI Subprocess Coverage Aggregation (Phase 5A)
*   **Open Question:** In Phase 5A, it mentions testing `packages/cli` via a "CLI-invocation harness (subprocess via `Bun.spawn` against a mock Gateway)." Does the current coverage tooling (`bun test:coverage`) correctly capture and aggregate coverage from spawned Bun subprocesses? 
*   **Suggestion:** Standard `c8` or `istanbul` tools usually require specific configuration to trace subprocesses (like setting `NODE_V8_COVERAGE`). If `Bun.spawn` doesn't pass coverage data back to the parent test runner natively, these CLI tests might result in 0% reported coverage for the CLI source files despite being exercised. Verify this technical capability early, or consider running CLI handlers directly in-process for coverage purposes if subprocess tracing is unreliable.

## 2. Baseline Metric Clarification (`min_lines` vs `%`)
*   **Observation:** The JSON snippet in "The Ratchet" section uses `{"min_lines": 4.35}`. The value `4.35` appears to be a percentage (4.35%), but the key is named `min_lines` (which implies an integer count of covered lines). 
*   **Suggestion:** Clarify the metric. If it is a percentage, consider renaming the key to `min_coverage_pct` to avoid confusion. If it is an absolute line count, it should be an integer. Using percentages is generally safer across refactors that add/remove lines without changing the logical coverage proportion.

## 3. Untested Files and `lcov.info`
*   **Open Question:** If a developer adds a brand-new source file but forgets to write any tests for it, will it appear in `lcov.info` with 0% coverage?
*   **Suggestion:** Ensure that the underlying coverage tool (`bun test:coverage`) is configured with the equivalent of the `all: true` flag. If it isn't, the coverage reporter might only emit data for files that were loaded by at least one test. The `check.ts` script should also actively scan the workspace source directories and fail if a source file is entirely missing from `lcov.info`.

## 4. OS-Specific Branches in Shared Files
*   **Observation:** The design correctly excludes purely OS-specific files (`vault/win32.ts`, etc.) from the Ubuntu-based PR gate. 
*   **Open Question:** How will OS-specific branching *within* shared files (e.g., `if (process.platform === "win32") { ... }`) be handled? Since the PR gate runs on Ubuntu, the `win32` branch will be a coverage miss.
*   **Suggestion:** Establish a clear convention in `docs/contributors/coverage.md` for using inline ignores (like `/* istanbul ignore next */` or Bun's equivalent) for OS-specific branches, ensuring developers aren't penalized on the Ubuntu gate for Windows/macOS logic.

## 5. Ratchet Behavior on Partial Improvements
*   **Observation:** Rule 5 states "A PR may not raise any `min_lines`." This implies that if a file at 40% coverage is improved to 70% in a PR, the baseline must remain at 40%. 
*   **Suggestion:** Clarify whether developers are *encouraged* or *allowed* to voluntarily update the baseline to lock in partial improvements (e.g., manually editing the JSON to 70%). If the baseline strictly cannot be raised, the "ratchet" only locks in at the final 80% mark, leaving partial improvements vulnerable to regression in subsequent PRs without triggering the gate.
