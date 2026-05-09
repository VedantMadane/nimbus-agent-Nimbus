# SonarCloud — CI integration, Quality Gate policy, local analysis

SonarCloud (rebranded "SonarQube Cloud") provides static analysis, security hotspot detection, duplication metrics, and a Quality Gate that fails CI on regressions. This document covers:

1. How CI runs the scan today.
2. The Quality Gate policy this repository follows.
3. How to reproduce the analysis locally before opening a PR.

## CI integration

The scan runs inside the reusable [`_test-suite.yml`](../.github/workflows/_test-suite.yml) workflow, which is invoked by both `pr-quality-ts` (PRs) and `ci-ts` (pushes to `main` / `develop`) in [`ci.yml`](../.github/workflows/ci.yml). The relevant step:

```yaml
- name: SonarQube Cloud analysis
  if: runner.os == 'Linux' && env.SONAR_TOKEN != ''
  uses: SonarSource/sonarqube-scan-action@…  # v8.0.0, SHA-pinned
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

Coverage is fed in from two sources, both produced earlier in the same job:

- `coverage/lcov.info` — written by `bun test --coverage --coverage-reporter=lcov` for `gateway`, `cli`, `sdk`, `client`, `mcp-connectors`, and `scripts`.
- `packages/ui/coverage/lcov.info` — written by `bunx vitest run --coverage`. The job rewrites `SF:src/` → `SF:packages/ui/src/` so SonarCloud resolves paths from the repo root rather than the UI sub-project root.

`sonar.qualitygate.wait=true` in [`sonar-project.properties`](../sonar-project.properties) forces the scan step to poll for the gate verdict and exit non-zero when the gate fails — without it, gate failures only surface as a side-comment from the SonarCloud GitHub App and the CI check stays green.

The scan is Linux-only on purpose; Sonar's analyser is OS-agnostic and running it three times across the OS matrix is wasted CI minutes.

## Quality Gate policy

The repository uses a custom gate named **"Nimbus Security-Critical"**, configured in the SonarCloud UI on project `asafgolombek_Nimbus`. The split between *New Code* conditions (PR diff) and *Overall Code* conditions (project-level) is intentional: New Code conditions enforce hygiene on every PR without re-litigating legacy debt, while Overall Code conditions lock the project's security posture so that hotspots and ratings cannot drift downwards even when the diff in front of you is clean.

### On New Code (fails the PR check)

| Metric | Operator | Threshold | Rationale |
|---|---|---|---|
| Coverage | < | **85%** | Matches `test:coverage:engine` (≥85%) — Sonar's New-Code coverage should be no laxer than the strictest in-repo gate |
| Duplicated Lines (%) | > | **3%** | Sonar way default; we already run `bunx jscpd` separately in `pr-quality-duplication` for fast PR feedback |
| Maintainability Rating | worse than | **A** | Code-smell debt density on new code |
| Reliability Rating | worse than | **A** | No new bugs |
| Security Rating | worse than | **A** | No new vulnerabilities |
| Security Review Rating | worse than | **A** | All new security hotspots categorised |
| Security Hotspots Reviewed | < | **100%** | Every new hotspot must be triaged before merge |

### On Overall Code (project-level health)

| Metric | Operator | Threshold | Rationale |
|---|---|---|---|
| Reliability Rating | worse than | **A** | Project-level bug count cannot drift |
| Security Rating | worse than | **A** | Project-level vulnerability count cannot drift |
| Security Review Rating | worse than | **A** | All historical hotspots categorised |
| Security Hotspots Reviewed | < | **100%** | Every legacy hotspot triaged at least once |

The Overall-Code rows are what makes this gate *security-critical* rather than "Sonar way". Without them, a project can accumulate unreviewed hotspots in legacy code indefinitely as long as new diffs stay clean — unacceptable for a local-first agent that handles credentials and orchestrates real actions.

### Editing the gate

Quality Gates are defined server-side; SonarCloud's free tier does not support gate-as-code via a file in the repo. To change the policy:

1. Open SonarCloud → **Quality Gates** → **Nimbus Security-Critical**.
2. Edit conditions; save.
3. Update the tables above in the same PR that depends on the change. Drift between this document and the live gate is treated as a bug.

### Required repo secrets

| Secret | Purpose |
|---|---|
| `SONAR_TOKEN` | SonarCloud user token with **Execute Analysis** permission on `asafgolombek_Nimbus`. The scan step is conditional on this being set, so absence silently no-ops rather than failing CI. |

## Local analysis — SonarLint (recommended)

1. Install the [SonarLint](https://www.sonarsource.com/products/sonarlint/) extension in VS Code or Cursor.
2. Open **Connected Mode** and bind the workspace to your SonarCloud project (`projectKey=asafgolombek_Nimbus`).
3. Fix issues SonarLint reports on the files you change; this aligns with the New-Code conditions of the gate above.

## Local analysis — SonarScanner CLI

For reproducing a full scan before pushing (e.g. when CI is unavailable, or to debug a gate failure that's hard to triage from the SonarCloud UI alone):

1. Install a JRE and the [SonarScanner CLI](https://docs.sonarsource.com/sonarqube-cloud/advanced-setup/ci-integration-overview/).
2. Generate a token (**My Account** → **Security**) and export it:

   ```bash
   export SONAR_TOKEN=your_token_here
   ```

3. Generate coverage so the scanner finds an `lcov.info`:

   ```bash
   bun test packages/gateway packages/cli packages/sdk packages/client packages/mcp-connectors scripts \
     --coverage --coverage-reporter=lcov
   cd packages/ui && bunx vitest run --coverage && cd -
   sed -i 's|^SF:src/|SF:packages/ui/src/|' packages/ui/coverage/lcov.info
   ```

4. Run the scanner from the repo root:

   ```bash
   sonar-scanner
   ```

   For a PR scan (so the gate evaluates against New Code rather than the whole project), pass [PR parameters](https://docs.sonarsource.com/sonarqube-cloud/enriching/branch-analysis/):

   ```bash
   sonar-scanner \
     -Dsonar.pullrequest.key=123 \
     -Dsonar.pullrequest.branch=my-branch \
     -Dsonar.pullrequest.base=main
   ```

## Notes

- Adjust `sonar.sources`, `sonar.tests`, or `sonar.typescript.tsconfigPaths` in [`sonar-project.properties`](../sonar-project.properties) if SonarCloud reports missing files or wrong TypeScript context.
- Do not commit Sonar tokens; use environment variables locally and the `SONAR_TOKEN` repo secret in CI.
- The exclusions block in `sonar-project.properties` deliberately drops `**/dist/**`, `**/src-tauri/**`, generated `nimbus-*.js` bundles, and the Astro docs site. Add new entries there — not in the gate definition — when introducing generated or vendored code.
