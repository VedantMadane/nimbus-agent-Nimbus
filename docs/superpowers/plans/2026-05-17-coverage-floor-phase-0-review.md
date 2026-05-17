# Review: Coverage Floor Phase 0 Plan (2026-05-17)

Here are some open questions, suggestions, and potential improvements regarding the `2026-05-17-coverage-floor-phase-0.md` implementation plan.

## 1. Path Normalization in `parseBaseline` (Task 3)
*   **Observation:** In `parseBaseline` (`scripts/coverage-floor/baseline.ts`), the keys of the `files` object are used verbatim as file paths. While `lcov-parse.ts` explicitly normalizes backslashes to forward slashes, `parseBaseline` does not. 
*   **Suggestion:** Since `docs/structure-audit/coverage-baseline.json` will be hand-edited by contributors to fix "must-raise" requirements, someone on Windows might accidentally use a backslash in a file path. `parseBaseline` should either strictly reject backslashes and throw an error, or automatically normalize them (`path.replaceAll("\\", "/")`) to prevent frustrating OS-specific gate failures.

## 2. Properties Parsing Robustness (Task 6)
*   **Observation:** The `readSonarCoverageExclusions()` function in `check-exclusion-parity.ts` uses a naive string split and string matching logic to find `sonar.coverage.exclusions=`. 
*   **Suggestion:** If the `sonar-project.properties` file is ever modified to spread this property over multiple lines (using `\` continuation, which is valid in `.properties` files) or if spaces are added around the equals sign, this logic will break silently. Consider adding a small warning comment above the script, or use a more robust regex/parser to extract the property value.

## 3. GitHub Actions `yaml` Validation (Task 8)
*   **Observation:** Step 3 uses a short Node.js script to validate the YAML syntax using `yaml.parse()`.
*   **Open Question:** Does the local environment running this script natively have the `yaml` package installed globally or in the root `package.json`? If `yaml` is not an installed dependency, this step will fail locally during implementation.
*   **Suggestion:** If `yaml` isn't installed, you might instruct the agent/user to run `npx prettier --check .github/workflows/_test-suite.yml` or use a different built-in method to validate the YAML syntax.
