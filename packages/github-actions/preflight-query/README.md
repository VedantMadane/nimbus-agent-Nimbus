# nimbus-agent/query-action

First-party GitHub Action for the Nimbus pre-deploy index check. Calls the local Nimbus Gateway's `GET /v1/preflight/deploy` endpoint, surfaces findings as workflow annotations + job summary, and (optionally) blocks the deploy when verdict is `warn`.

## Requirements

- **Self-hosted runner with the Nimbus Gateway running locally** (`http://localhost:7474` by default). Hosted runners (`ubuntu-latest`) are not supported in v0.1.0 — the Gateway is local-only.
- A `[metrics.dora.<service-id>]` or `[ci.service.<service-id>]` block in `nimbus.toml` mapping the service id to its repos and (optionally) PagerDuty service ids.

## Usage

```yaml
- name: Pre-deploy index check
  uses: nimbus-agent/query-action@v0.1.0
  with:
    service: payment-service
    mode: warn          # use 'block' once you trust the signal
```

## Inputs

| Input | Required | Default | Notes |
|---|---|---|---|
| `service` | yes | — | Nimbus service id. |
| `target-ref` | no | `${{ github.ref_name }}` | Branch/ref being deployed. |
| `gateway-url` | no | `http://localhost:7474` | Base URL of the Gateway's read-only HTTP API. |
| `mode` | no | `warn` | One of `warn`, `block`, `off`. |
| `max-findings` | no | `10` | Cap on findings per check (1..50). |
| `timeout-ms` | no | `10000` | HTTP timeout. |
| `allow-gateway-failure` | no | `false` | When `true`, unreachable Gateway never fails the workflow. |

## Outputs

- `verdict` — `ok`, `warn`, or `block`.
- `incident-count`, `failing-ci-count`, `merge-conflict-count` — raw counts.
- `result-json` — full envelope JSON.

## Exit codes

| `mode` | verdict=ok | verdict=warn | unreachable, allow-gateway-failure=false | unreachable, allow-gateway-failure=true |
|---|---|---|---|---|
| `off` | 0 | 0 | 0 | 0 |
| `warn` (default) | 0 | 0 | 0 | 0 |
| `block` | 0 | 1 | 1 | 0 |

## Versioning

This release uses **fully-pinned tags** (`v0.1.0`, `v0.1.1`, …). Users should reference specific versions while the Action is in v0.x:

```yaml
uses: nimbus-agent/query-action@v0.1.0
```

A `v0` major-version moving tag is **intentionally not provided yet** — the Action's input contract may still evolve before v1.0.0. Once v1.0.0 ships, the project will adopt the `actions/checkout@v1`-style major tag pattern.

## Building from source

Source lives in the Nimbus monorepo at `packages/github-actions/preflight-query/`. Build with:

```bash
cd packages/github-actions/preflight-query
bun run build
```
