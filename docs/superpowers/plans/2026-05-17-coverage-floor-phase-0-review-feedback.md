# Plan-Review Feedback Response (2026-05-17)

Source: [`2026-05-17-coverage-floor-phase-0-review.md`](./2026-05-17-coverage-floor-phase-0-review.md) → applied to [`2026-05-17-coverage-floor-phase-0.md`](./2026-05-17-coverage-floor-phase-0.md).

| # | Item | Verdict | Where applied |
|---|---|---|---|
| 1 | Path normalization in `parseBaseline` | **Fix (hard-reject)** | Task 3 — `parseBaseline` rejects backslash-keyed paths with an actionable error; new test covers it |
| 2 | `.properties` parsing robustness | **Fix (minor)** | Task 6 — regex tolerates whitespace around `=` and skips `#`/`!` comment lines; multi-line continuation documented as a fail-closed limitation |
| 3 | YAML validation depends on `yaml` package | **No-action (documented)** | Task 8 Step 3 — clarified that `yaml@^2.9.0` is already in root `devDependencies`; added a fallback note for fresh checkouts that haven't run `bun install` |

## Item 1 — Path Normalization in `parseBaseline` (FIX, hard-reject)

**Adopted with the stricter of the reviewer's two suggested behaviours.** The risk is real: a Windows contributor hand-editing `coverage-baseline.json` could typo a backslash in a key. Silent acceptance would produce a misleading downstream error (`evaluateCheck` would compare the backslash-keyed baseline entry against forward-slash lcov paths, find no match, and surface a "regressed from X% to 0%" violation that misidentifies the root cause).

The reviewer suggested two options — reject + throw, or auto-normalize. **Choosing reject + throw** for three reasons:

1. **Predictability of the baseline diff.** Auto-normalize would silently rewrite paths during a `--update-baseline` pass, producing a "path normalized" diff mixed with substantive watermark changes. Reviewers reading the PR would have to distinguish the two. Hard-reject keeps the diff clean — either the input is forward-slash and parses, or it errors out.

2. **The error message can guide the fix.** The new error reads:
   > `baseline entry contains backslash separator: "packages\\gateway\\src\\foo.ts" — use forward slashes (e.g. "packages/gateway/src/foo.ts")`
   This is actionable. Silent normalization gives the contributor no signal that they did anything unusual.

3. **The use case is genuinely rare.** `--update-baseline` always emits forward slashes (it derives paths from `Bun.Glob.scan` + `.replaceAll("\\", "/")`). Hand-editing is the only path to introduce a backslash. The cost of a clear error in that rare case is lower than the cost of a misleading downstream failure or a noisy PR diff.

A test was added to `baseline.test.ts`:

```typescript
test("rejects backslash-separated paths with an actionable error", () => {
  const json = JSON.stringify({
    version: 1,
    generated_at: "x",
    files: { "packages\\gateway\\src\\foo.ts": { min_coverage_pct: 50 } },
  });
  expect(() => parseBaseline(json)).toThrow(/use forward slashes/);
});
```

The expected-tests count in Task 3 Step 4 bumped from 13 to 14.

## Item 2 — `.properties` Parsing Robustness (FIX, minor)

**Adopted with limited scope.** Reviewer correctly identified that `.properties` files support multi-line continuation via `\` and that the original `line.startsWith("sonar.coverage.exclusions=")` check is too brittle (no whitespace tolerance, fragile to comment-prefixed forms).

The fix relaxes the parser to:

- Tolerate whitespace around the `=` (`\s*=\s*`).
- Skip lines starting with `#` or `!` (the two `.properties` comment markers).
- Strip leading/trailing whitespace from the line.

```typescript
const re = /^\s*sonar\.coverage\.exclusions\s*=\s*(.*?)\s*$/;
for (const rawLine of text.split(/\r?\n/)) {
  if (rawLine.startsWith("#") || rawLine.startsWith("!")) continue;
  const m = re.exec(rawLine);
  if (m === null) continue;
  // ...
}
```

**Deliberately not adopted: full `.properties` spec support** (multi-line `\` continuation, unicode `\uXXXX` escapes, key-with-spaces-via-backslash, etc.). Three reasons:

1. **YAGNI.** `sonar-project.properties` is project-controlled. The current file uses none of these features for `sonar.coverage.exclusions` — it's a single-line declaration. Implementing a full parser for a hypothetical future shape is speculative work.

2. **Fail-closed is acceptable.** If a future edit introduces a continuation, this script fails *closed* — it reports the patterns it can see as gaps, which surfaces the issue on the first CI run after the change. The maintainer then either reverts the continuation or extends the parser. No silent regression.

3. **The comment above the function documents the limitation explicitly** so a future contributor doesn't waste time debugging:
   > `Tolerates optional whitespace around the = and a leading !/#-prefixed comment line, but does NOT implement the full Java .properties spec (no multi-line \ continuation, no unicode escapes). [...] if a future edit introduces a continuation, this script fails CLOSED [...]`

## Item 3 — YAML Validation Dependency (No-action, documented)

**Verified before responding.** `grep -E '"yaml"' package.json` returns `"yaml": "^2.9.0"` from the root `devDependencies`. So `bun -e "const yaml = require('yaml'); ..."` works in any worktree where `bun install` has been run.

No code change needed, but Task 8 Step 3 now documents the dependency explicitly so a future reader (agentic or human) doesn't second-guess whether they need to install something:

> The `yaml` package is in root `devDependencies` (verified: `"yaml": "^2.9.0"` in `package.json`), so no install step is needed.
>
> [the validation command]
>
> If `bun install` hasn't been run in this worktree yet (e.g. fresh checkout), run that first; otherwise `require('yaml')` will fail with `Cannot find module`.

**Not adopted: switching to `prettier --check` or another tool.** Prettier is not a project dep (the project uses Biome for formatting and lint). Pulling in `prettier` for one validation step would add a transitive dep with no other use. The `yaml.parse` approach is the minimum-dependency option that catches the failure mode (malformed YAML) we care about.

## What this means for the work

- **Task 3** gains one test (14 total instead of 13) and one new validation branch in `parseBaseline`.
- **Task 6** gains a clearer comment and a slightly more permissive regex; behaviour against the current `sonar-project.properties` is unchanged.
- **Task 8** gains a documentation note; no behaviour change.

No task count or sequencing change. Phase 0 still lands in one PR.
