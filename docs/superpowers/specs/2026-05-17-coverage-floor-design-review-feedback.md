# Design-Review Feedback Response (2026-05-17)

Source: [`2026-05-17-coverage-floor-design-review.md`](./2026-05-17-coverage-floor-design-review.md) → applied to [`2026-05-17-coverage-floor-design.md`](./2026-05-17-coverage-floor-design.md).

| # | Item | Verdict | Where applied |
|---|---|---|---|
| 1 | CLI subprocess coverage aggregation (Phase 5A) | **Fix** | Phase 5 table — Phase 5A rewritten to mandate in-process CLI harness |
| 2 | `min_lines` naming | **Fix** | "The Ratchet" — field renamed to `min_coverage_pct` throughout |
| 3 | Untested files missing from lcov | **Fix** | "Enforcement" — `check.ts` walks `packages/*/src/**` independently of lcov; files missing from lcov treated as 0% covered |
| 4 | OS-specific branches inside shared files | **Fix** | New "Inline OS Branches" section after "Enforcement" — PAL refactor is the canonical answer; baseline absorption is the fallback; Bun's V8 coverage doesn't support inline ignores |
| 5 | Ratchet behavior on partial improvements | **Fix (correctness bug)** | "The Ratchet" — rule set rewritten as "monotonically rising watermark"; partial gains lock in immediately |

## Item 1 — CLI Subprocess Coverage Aggregation (FIX)

**Adopted.** Reviewer correctly identified the technical capability gap. Verified against the PR #326 retrospective: the github-actions packages' e2e tests spawn `bun run src/main.ts` as a subprocess, and the swap-line coverage came back as 0% even though the subprocess executed. That's exactly the failure mode the reviewer warns about — Bun's `--coverage` instruments the test runner's process via V8 coverage; child processes spawned via `Bun.spawn` write to a separate (and unmerged) V8 coverage stream.

Phase 5A was rewritten to mandate the in-process pattern set by PR #326's `setOutput` extraction:

- Command files export their handler function (`export async function run(opts: …): Promise<void>`).
- Tests import + call the handler directly with a mocked `NimbusClient` from `@nimbus-dev/client`.
- Existing subprocess-based e2e tests remain for integration coverage of stdin/stdout wiring; they don't contribute to the per-file floor.

**Not adopted (no change needed):** the reviewer's suggestion to investigate `NODE_V8_COVERAGE` env propagation. Bun's coverage is V8-native; reading the propagated coverage data into Bun's lcov writer would require Bun runtime support that doesn't currently exist. In-process testing is the safer answer that doesn't depend on Bun roadmap.

## Item 2 — `min_lines` Naming (FIX)

**Adopted.** Renamed the JSON field to `min_coverage_pct` throughout the spec. The value is a percentage in the range 0–100, not a line count.

The reviewer also raised the percentage-vs-absolute-count question. The design keeps percentages because absolute line counts are fragile to refactors that add/remove lines without changing the logical coverage proportion — a "Prettier-style line-break refactor" could move a file from 40/80 lines covered to 40/82 lines covered (now under the watermark) without anyone changing functional behaviour. Percentages preserve the property the gate is trying to lock in.

## Item 3 — Untested Files and `lcov.info` (FIX)

**Adopted, with verification.** Reviewer correctly identified the failure mode. Confirmed by reading Bun's coverage docs: V8 coverage emits entries only for files that the runtime imports during test execution. A brand-new untested file is structurally invisible to lcov.

The Enforcement section now requires `check.ts` to walk `packages/*/src/**/*.ts(x)` independently of the lcov report and treat any non-exempt source file missing from lcov as 0% covered. This means:

- A PR that adds a new untested file → either a same-PR test (file at ≥80% → file outside baseline → gate passes) or a same-PR baseline entry at 0% (gate passes with the file locked in to climb later).
- A PR that imports a previously-untested file from a test → file appears in lcov at some coverage; if ≥80%, fine; if <80%, baseline entry required.

**Not adopted (no change needed):** the reviewer's `all: true` suggestion. That's a c8/istanbul flag, not a Bun flag. The independent source-tree walk in `check.ts` is the robust answer that doesn't depend on Bun runtime features.

## Item 4 — Inline OS Branches (FIX)

**Adopted, with two clarifications.**

Reviewer's question reveals a tension: the PR gate is Ubuntu-only, so any inline `if (process.platform === "win32") { ... }` branch in business logic will show the `win32` arm as uncovered. New "Inline OS Branches" section addresses this:

1. **PAL refactor is the canonical answer.** `nimbus-architecture.md` already mandates that OS-specific logic lives in `packages/gateway/src/platform/{win32,darwin,linux}.ts`. Inline `process.platform` checks in business logic are an architectural anti-pattern; they should be refactored to a `PlatformServices` method.

2. **Baseline absorption is the fallback.** For unavoidable inline branches (third-party library shims, etc.), the file enters the baseline at its Ubuntu coverage. Future work — not in scope here — can extend `check.ts` to merge per-OS lcov reports from the push-to-main 3-OS matrix so the `win32` branch counts as covered on a Windows runner.

**Not adopted:** the reviewer's suggestion to use `/* istanbul ignore next */` / `/* c8 ignore next */` comments. Verified: Bun's V8-native coverage does not parse these tool-specific comment markers. Until upstream Bun support lands, comment-based ignores are not a usable mitigation. The spec calls this out explicitly so a future contributor doesn't waste time on the wrong path.

## Item 5 — Ratchet Behavior on Partial Improvements (FIX — correctness bug)

**Adopted.** Reviewer caught a real bug in the original ratchet design. The old rules said "A PR may not raise any `min_lines`" — which meant partial progress was *not locked in*. A file going 40% → 70% in a PR would leave the baseline at 40%, and a later PR could regress to 41% without tripping the gate.

The ratchet is now a **monotonically rising watermark**:

| Rule | Behaviour |
|---|---|
| 1 | Files not in the baseline must be ≥80% (the floor). |
| 2 | Files in the baseline must be ≥ their `min_coverage_pct`. |
| 3 | **If actual coverage > recorded `min_coverage_pct`, the baseline must be updated upward in the same PR.** Partial improvements are locked in immediately. |
| 4 | When a baseline file's actual coverage reaches ≥80%, it must be removed from the baseline in the same PR. |
| 5 | A PR may never *lower* any `min_coverage_pct`. Watermarks are monotonically non-decreasing; the only way out is removal at 80%. |

Rule 3 is the new load-bearing rule. `bun scripts/coverage-floor/check.ts --update-baseline` produces the required diff for the PR author so the workflow is one command, not manual JSON editing.

The original framing was "monotonically decreasing baseline" (think: number of below-floor files only goes down). The revised framing is "monotonically rising per-file coverage" (every file's watermark only goes up until it exits at 80%). The two are complementary — the count of baseline entries still decreases over time, but no per-file gain can be silently lost.

## What changes for the implementation plan

- Phase 0's `check.ts` design is now bigger by ~50 lines: source-tree walker + `--update-baseline` mode + the rule-3 "must raise watermark" check.
- Phase 5A's CLI plan no longer needs a subprocess harness; the existing `@nimbus-dev/client` MockClient is enough.
- A new line in `docs/contributors/coverage.md` explains the inline-OS-branch decision tree.
- No phase count or sequencing change (still 12 PRs, ~2-3 months at one-per-week cadence).
