# Using `nimbus query` in CI

> **Self-hosted runners only.** The Gateway HTTP API binds to `127.0.0.1`, so a hosted GitHub-runner / GitLab-shared-runner cannot reach it. Run a self-hosted runner with Nimbus installed and the Gateway started (`nimbus serve` or via systemd / launchd), then use the patterns below.

This page shows three ways to gate a CI step on already-indexed Nimbus data — without writing any TypeScript or running an MCP connector. Each example uses `nimbus query --json` and pipes through `jq` for the boolean check.

## Example 1 — GitHub Actions: block deploy on active P1 incident

```yaml
# .github/workflows/deploy.yml — runs on a self-hosted runner
jobs:
  deploy:
    runs-on: [self-hosted, linux, nimbus]   # tag your runner accordingly
    steps:
      - name: Block on active P1 incident
        env:
          SERVICE: payment-service
        run: |
          set -euo pipefail
          count=$(nimbus query --service pagerduty --type incident \
                              --since 24h --json \
                  | jq --arg svc "$SERVICE" \
                      '[ .[] | select(.metadata.severity == "p1" and .metadata.service == $svc) ] | length')
          if [ "$count" -gt 0 ]; then
            echo "::error::Active P1 incident on $SERVICE — blocking deploy."
            exit 1
          fi
          echo "No active P1 — proceeding."

      - name: Deploy
        run: ./deploy.sh
```

## Example 2 — GitLab CI: warn on failing CI runs for the target branch

```yaml
# .gitlab-ci.yml — runner tagged `nimbus`
deploy:
  tags: [nimbus]
  script:
    - |
      failures=$(nimbus query --service github_actions --type ci_run \
                              --since 4h --json \
                  | jq --arg branch "$CI_COMMIT_REF_NAME" \
                      '[ .[] | select(.metadata.headBranch == $branch and .metadata.conclusion == "failure") ] | length')
      if [ "$failures" -gt 0 ]; then
        echo "WARNING: $failures recent CI failures on $CI_COMMIT_REF_NAME"
      fi
    - ./deploy.sh
```

## Example 3 — Jenkins (Pipeline / `Jenkinsfile`)

```groovy
pipeline {
  agent { label 'nimbus' }
  stages {
    stage('Block on conflicted PRs') {
      steps {
        sh '''
          conflicted=$(nimbus query --service github --type pr \
                                    --json \
                       | jq '[ .[] | select(.metadata.mergeable == false) ] | length')
          if [ "$conflicted" -gt 0 ]; then
            echo "ERROR: $conflicted PRs in merge-conflict state — resolve before deploy."
            exit 1
          fi
        '''
      }
    }
    stage('Deploy') {
      steps { sh './deploy.sh' }
    }
  }
}
```

## Notes

- `nimbus query --json` emits an array of indexed-item rows; `jq` filters cleanly without extra dependencies.
- The `metadata.*` field names follow the connector's chosen shape — check `docs/architecture.md` § "Local Database Schema" or the connector source for the exact set.
- For typed access from a Node/Bun CI script, prefer `@nimbus-dev/client` (`packages/client`) over raw `nimbus query`.
- The runner needs the `nimbus` binary on `PATH`. On a fresh runner, install once via `bun run package:headless` output and `cp` the binary into `/usr/local/bin/`.
