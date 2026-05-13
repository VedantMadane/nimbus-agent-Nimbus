# Phase 5 T4 PR 3b — Post-Deploy Annotation Design

> **Status:** Design, ready for review.
> **Predecessor:** [`2026-05-12-phase-5-t4-pr3a-preflight-design.md`](./2026-05-12-phase-5-t4-pr3a-preflight-design.md) — pre-deploy read surface (shipped 2026-05-13).
> **Companion to T4 PR 2 (DORA):** upgrades `selectDeploys` to prefer explicit annotations over the existing `ci_run.title` regex match.

## 1. Goal

Ship the **post-deploy annotation** surface that closes the T4 GitHub-Actions story:

- `nimbus-agent/annotate-action` GitHub Action that writes a deployment event into the local index after a CI deploy completes.
- `POST /v1/deployments` HTTP endpoint that backs the Action.
- `nimbus deploy annotate ...` CLI subcommand that mirrors the surface for non-GitHub CI providers (Jenkins, GitLab CI, CircleCI, shell scripts).
- New `deployment` item type, first-class in the local index, with its own shadow table.
- DORA `selectDeploys` upgrade: prefer `type = "deployment"` items when present, fall back to the existing `ci_run` regex match, surface `gap: "mixed_source"` when both have rows in the same window.
- Bearer-token auth at the HTTP boundary, vault-backed, rate-limited, audit-logged.
- New security invariant `I13`: HTTP write routes go through a compile-time allowlist + bearer auth, never the readonly handle.

The Action is the operator's primary integration point; the CLI is the equivalence path; the IPC method `deployment.annotate` is the single converged write entry point all three surfaces call.

## 2. Non-goals

- LAN-reachable write surface (still loopback-only; existing `LanServer` `I5` is the right gate when we get there).
- Token-rotation CLI subcommands (`nimbus deploy annotate-token create | revoke`). Operators set the vault key directly in this PR; lifecycle CLI deferred.
- mTLS / per-service signing keys.
- Backfilling historic deploys from existing `ci_run` rows.
- A "post-incident annotation" companion (`POST /v1/incidents`). PagerDuty connector enrichment (T4 PR 4) is the right next step.
- Adding `deployment.annotate` to the Tauri renderer allowlist. The desktop UI never initiates deploys; the surface stays Gateway-internal + HTTP-external.

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Operator's GitHub Actions / GitLab / Jenkins / shell script        │
│                                                                     │
│   ┌──────────────────────┐         ┌──────────────────────────┐    │
│   │ nimbus-agent/        │         │ nimbus deploy annotate   │    │
│   │   annotate-action    │  HTTP   │   (CLI subcommand)       │    │
│   └──────────┬───────────┘   POST  └────────────┬─────────────┘    │
│              │                                  │ IPC               │
└──────────────┼──────────────────────────────────┼───────────────────┘
               │                                  │
               ▼                                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  Gateway (loopback :7474)                                    │
   │                                                              │
   │   GET routes ──► readonly DB handle (existing)               │
   │   POST /v1/deployments ──► writable DB handle (NEW)          │
   │           │                                                  │
   │           ▼                                                  │
   │   ┌────────────────────────┐   ┌────────────────────────┐   │
   │   │ Bearer-token auth      │──►│ deployment.annotate    │   │
   │   │ (vault key)            │   │  IPC handler           │   │
   │   └────────────────────────┘   └───────────┬────────────┘   │
   │                                            │                │
   │                                            ▼                │
   │                              ┌──────────────────────────┐   │
   │                              │ item table:              │   │
   │                              │   type = "deployment"    │   │
   │                              │ deployment_items shadow  │   │
   │                              │ audit_log row            │   │
   │                              └────────────┬─────────────┘   │
   │                                           │                 │
   │                                           ▼                 │
   │                              ┌──────────────────────────┐   │
   │                              │ DORA selectDeploys()     │   │
   │                              │   prefers `deployment`   │   │
   │                              │   items when present     │   │
   │                              └──────────────────────────┘   │
   └──────────────────────────────────────────────────────────────┘
```

**Three entry points, one IPC method.** `deployment.annotate` is the single write entry point. Both `POST /v1/deployments` and `nimbus deploy annotate` are thin wrappers that call it. Same validation, same audit row, same dedup, same response envelope.

**Read-only invariant becomes per-route, not per-server.** `http-server.ts` keeps its `SQLITE_OPEN_READONLY` connection for `GET` routes. Write routes are mounted from a small allowlist (one entry in this PR: `POST /v1/deployments`); any other method/path combo returns `405`. A second SQLite handle is opened with `SQLITE_OPEN_READWRITE` and held in the server context — closed on `stop()`.

## 4. File map

### Files created

| Path | Responsibility |
|---|---|
| `packages/gateway/src/index/deployment-v28-sql.ts` | V28 migration SQL: `deployment_items` shadow table (provider, nimbus_service_id, environment, sha, ref, started_at_ms, finished_at_ms, conclusion, workflow_url, ci_run_external_id) + indexes on `(nimbus_service_id, environment, started_at_ms DESC)` and `(provider, sha)`. `UNIQUE(external_id)` for idempotency. |
| `packages/gateway/src/deployment/annotate.ts` | Pure `annotateDeployment(db, input, nowMs)` — validates input, computes `external_id`, upserts the `item` row (`type = "deployment"`) and `deployment_items` shadow row inside a single transaction, writes the audit row, returns the canonical envelope. SELECT/INSERT only, no I/O beyond the DB. |
| `packages/gateway/src/deployment/types.ts` | `DeploymentAnnotateInput`, `DeploymentAnnotateResult`, `DeploymentConclusion` (`success` \| `failure` \| `cancelled` \| `in_progress`). `DeploymentProvider` enum. |
| `packages/gateway/src/deployment/external-id.ts` | `computeDeploymentExternalId(input)` — the three-tier rule from §5.3. Pure function with its own unit tests. |
| `packages/gateway/src/ipc/deployment-rpc.ts` | `dispatchDeploymentRpc` + `DeploymentRpcError`. Validates RPC params, calls `annotateDeployment`. Same shape as `metrics-rpc.ts` / `preflight-rpc.ts`. |
| `packages/gateway/src/ipc/http-write-routes.ts` | `WRITE_ROUTE_ALLOWLIST` (`readonly ["POST /v1/deployments"]`) + `dispatchWriteRoute(req, ctx)` — single source of truth for which `POST` paths the HTTP server accepts. Calls `requireBearer` then `dispatchDeploymentRpc`. |
| `packages/gateway/src/ipc/http-auth.ts` | `requireBearer(req, ctx)` — extracts `Authorization: Bearer <token>`, constant-time-compares against the cached vault value, returns `401` with audit-logged fingerprint on failure. Cached at server start. |
| `packages/gateway/src/ipc/http-rate-limit.ts` | `HttpWriteRateLimiter` — sliding-window 60-req/min per `token_fingerprint`. Same shape as `LanRateLimiter` (`ipc/lan-rate-limit.ts`). |
| `packages/cli/src/commands/deploy-annotate.ts` | `nimbus deploy annotate --service X --sha Y --target-ref Z --env E --status S [--workflow-url U] [--started-at TS] [--finished-at TS] [--provider P] [--run-id R] [--job-id J] [--json]`. Goes through IPC, not HTTP. |
| `packages/cli/src/commands/deploy-annotate.test.ts` | CLI arg parser tests. |
| `packages/cli/test/e2e/deploy-annotate.smoke.e2e.test.ts` | No-Gateway smoke (gateway not running, missing required args, unknown status, help text integration). |
| `packages/github-actions/annotate-action/action.yml` | Action manifest (inputs/outputs/runs). |
| `packages/github-actions/annotate-action/package.json` | `@nimbus-dev/action-annotate` (private, published-via-tag). |
| `packages/github-actions/annotate-action/src/main.ts` | Action entry: reads inputs, builds payload, POSTs to the configured Gateway URL, sets outputs, respects `allow-gateway-failure`. |
| `packages/github-actions/annotate-action/src/render.ts` | Response → workflow-summary Markdown. |
| `packages/github-actions/annotate-action/src/main.test.ts` | Mock-fetch matrix: `200`, `200 is_new=false`, `401`, `429`, `503`, network-fail × `allow-gateway-failure` true/false. |
| `packages/github-actions/annotate-action/src/render.test.ts` | Pure rendering tests. |
| `packages/github-actions/annotate-action/dist/index.js` | Bundled, committed. GH Actions runtime requirement. |
| `packages/github-actions/annotate-action/README.md` | Usage examples + minimum-Gateway version + token-setup walkthrough + masking note. |
| `packages/gateway/test/unit/deployment/annotate.test.ts` | Per-field validation + idempotency + audit row asserted. |
| `packages/gateway/test/unit/deployment/external-id.test.ts` | Three-tier external-id rule. |
| `packages/gateway/test/unit/ipc/deployment-rpc.test.ts` | Method dispatch + param validation + error codes. |
| `packages/gateway/test/unit/ipc/http-auth.test.ts` | Missing / malformed / wrong / right bearer; constant-time-compare assertion; `token_fingerprint` shape; `401` audit row. |
| `packages/gateway/test/unit/ipc/http-rate-limit.test.ts` | 60/min sliding window; per-token isolation; `Retry-After` header value. |
| `packages/gateway/test/integration/http/deployments-post-route.test.ts` | `POST /v1/deployments` round-trip + the full error matrix from §5.5. |
| `packages/gateway/test/integration/metrics/dora-deployment-source.test.ts` | DORA prefers `deployment` items when present + falls back to `ci_run` regex + `mixed_source` gap when both have rows in the window. |
| `packages/gateway/test/integration/db/migration-v27.test.ts` | V28 migration runs cleanly + idempotent rerun + pre-migration backup written + rollback on injected throw. |
| `packages/gateway/test/fixtures/deployments/payment-service/seed.ts` | Programmatic fixture: 3 annotated deploys (2 prod, 1 staging) + 2 `ci_run` rows matching the regex (one in window, one outside) — drives the mixed-source test. |
| `packages/gateway/test/e2e/scenarios/deploy-annotate.e2e.test.ts` | In-process e2e: CLI → IPC → fixture-seeded service → query `item` + `deployment_items` rows. |

### Files modified

| Path | Change |
|---|---|
| `packages/gateway/src/index/migrations/runner.ts` | Append `INDEXED_SCHEMA_STEPS` entry for V28 deployment shadow table. |
| `packages/gateway/src/ipc/http-server.ts` | Open second `SQLITE_OPEN_READWRITE` handle in server context; route `POST` paths through `dispatchWriteRoute`; return `405` for unlisted writes; mount only when `http_api.deployment_token` is present in the vault (otherwise return `503 write_surface_disabled`); close write handle on `stop()`. |
| `packages/gateway/src/ipc/http-routes.ts` | Rename `READ_ONLY_HTTP_ROUTES` → `HTTP_ROUTES`; append `{ method: "POST", path: "/v1/deployments" }`. Update `nimbus-file-map` skill note accordingly. |
| `scripts/structure-audit/check-openapi-drift.ts` | Read the renamed `HTTP_ROUTES` const. Verify methods match (not just paths). |
| `packages/gateway/src/ipc/server/dispatchers.ts` | Wire `tryDispatchDeploymentRpc` into the phase-4 dispatch chain after `tryDispatchPreflightRpc` (for in-socket `deployment.annotate` calls the CLI makes). |
| `packages/gateway/src/ipc/server/context.ts` | Add `deploymentRpcSkipped` sentinel. |
| `packages/gateway/src/metrics/dora.ts` | `selectDeploys` checks for `type = "deployment"` rows first, falls back to existing `ci_run` regex when none found; emits `gap: "mixed_source"` when both sources have rows in the same window. |
| `packages/gateway/src/metrics/dora.test.ts` | New unit tests for the three branches: annotated-only, regex-only, mixed. |
| `packages/gateway/src/ipc/http-auth.ts` (NEW, listed above) | Owns the `HTTP_API_DEPLOYMENT_TOKEN_VAULT_KEY = "http_api.deployment_token"` constant. System-level key — does **not** belong in `connector-secrets-manifest.ts` (which is keyed by `ConnectorServiceId`). The static vault-key allow-list audit (`scripts/structure-audit/check-nimbus-invariants.ts`) builds its regex from connector-manifest value suffixes (`oauth`, `pat`, `api_token`, …); `deployment_token` is not one of those suffixes, so this key is not subject to the D11 audit and no allow-list entry is needed. |
| `packages/gateway/src/config/nimbus-toml.ts` | Extend the `[ci.service.<id>]` (and the back-compat `[metrics.dora.<id>]`) parser with an optional `deploy_environments` array. Default: `["prod"]`. Validation: each entry matches `^[a-z0-9][a-z0-9._-]*$`. |
| `packages/gateway/src/metrics/dora-config.ts` | Add `deployEnvironments: readonly string[]` to `ServiceConfig`. Default applied by the loader when the key is omitted. |
| `packages/gateway/openapi/v1.yaml` | Add `POST /v1/deployments` operation + `DeploymentAnnotateInput` / `DeploymentAnnotateResult` component schemas + `bearer-auth` security scheme. |
| `packages/cli/src/index.ts` | Register `deploy annotate` as a sibling subcommand of `deploy preflight`. |
| `packages/cli/src/commands/registry.ts` | Add the new command per the PR-258 pattern. |
| `packages/cli/src/commands/help.ts` | Add `nimbus deploy annotate` to help output. |
| `package.json` (root) | Add `test:coverage:deployment` script. |
| `scripts/lib/ci-tests.ts` | Append `test:coverage:deployment` to the coverage-gates array. |
| `.github/workflows/_test-suite.yml` | Add `Deployment → test:coverage:deployment` matrix entry. |
| `.claude/commands/nimbus-file-map.md` | Add deployment files to the Metrics + CI/CD section. |
| `.claude/commands/nimbus-commands.md` | Add `test:coverage:deployment`, `nimbus deploy annotate`, and the `http_api.deployment_token` vault key reference. |
| `CLAUDE.md` + `GEMINI.md` | Append `· T4 PR 3b annotation ✅` to the status line. |
| `docs/roadmap.md` | Flip "Post-deploy annotation" bullet to `[x]` with the date + PR pointer. |
| `docs/SECURITY-INVARIANTS.md` | Add `I13` row: "HTTP write routes go through `WRITE_ROUTE_ALLOWLIST` + bearer auth; readonly handle never executes writes." Wiring: `http-server.ts`. Test: `security-invariants.test.ts`. |
| `packages/gateway/src/security-invariants.test.ts` | Add I13 assertion (three sub-asserts — see §5.7). |

### Files explicitly NOT touched

- `packages/ui/src-tauri/src/gateway_bridge.rs` — `deployment.annotate` is NOT added to `ALLOWED_METHODS`. Renderer never initiates deploys.
- `packages/gateway/src/engine/executor.ts` (`HITL_REQUIRED`) — this is not an LLM-initiated action; the HTTP write surface lives outside the executor. Audit row uses the existing `hitl_status = "not_required"` value (the column has a CHECK constraint); the "external_write" semantic is encoded in `action_type` (`"deployment.annotated"`).

## 5. Contracts

### 5.1. HTTP request

```http
POST /v1/deployments HTTP/1.1
Host: 127.0.0.1:7474
Authorization: Bearer <vault://http_api.deployment_token>
Content-Type: application/json

{
  "service": "payment-service",
  "provider": "github-actions",
  "environment": "prod",
  "sha": "a1b2c3d4e5f60718a1b2c3d4e5f60718a1b2c3d4",
  "ref": "refs/heads/main",
  "status": "success",
  "started_at_ms": 1747142400000,
  "finished_at_ms": 1747142640000,
  "workflow_url": "https://github.com/acme/payments/actions/runs/12345",
  "run_id": "12345",
  "job_id": "67890"
}
```

### 5.2. Validation rules (rejected with `400 invalid_request`)

| Field | Rule |
|---|---|
| `service` | Non-empty string ≤64 chars; `^[a-z0-9][a-z0-9._-]*$`. Must resolve to a `[ci.service.<id>]` or `[metrics.dora.<id>]` block — unknown service → `400 unknown_service`. Service configs are loaded **per request** via `loadNimbusServiceConfigsFromConfigDir` (same pattern as the PR 3a preflight handler), so adding a new service to `nimbus.toml` is visible on the next post — **no Gateway restart required**. |
| `provider` | One of `github-actions` \| `gitlab` \| `jenkins` \| `circleci` \| `bitbucket` \| `other`. |
| `environment` | Non-empty ≤32 chars; `^[a-z0-9][a-z0-9._-]*$`. |
| `sha` | Hex string, 7–64 chars. Lower-cased server-side. |
| `ref` | Non-empty ≤256 chars. |
| `status` | One of `success` \| `failure` \| `cancelled` \| `in_progress`. |
| `started_at_ms` | Integer, finite, in `[now - 365d, now + 1h]` (clock-skew tolerance). |
| `finished_at_ms` | Optional. If present: integer, `>= started_at_ms`, in `[now - 365d, now + 1h]`. |
| `workflow_url` | Optional. Must parse as `http(s)://...`. |
| `run_id`, `job_id` | Optional strings ≤64 chars. |

Body cap: **8 KiB**. Larger → `413 payload_too_large`.

### 5.3. Idempotency key

```
external_id =
  "<provider>:run-<run_id>:job-<job_id>"             // when both run_id and job_id present
| "<provider>:run-<run_id>"                          // when only run_id present
| "<service>:<env>:<sha>"                            // fallback (CLI shell-script path)
```

The fallback intentionally **omits** `started_at_ms`: a shell script that retries the same logical deployment (same service / env / sha) collapses onto one `deployment` row, so DORA `deploymentFrequency` reflects "shipped" not "attempted N times". Operators who genuinely want per-attempt granularity (retry-as-distinct-deploy) pass `--run-id <unique>` and land on the second tier.

Same `external_id` re-posted → upsert no-op on the `item` row, replacement of the `deployment_items` shadow row (covers updates to `finished_at_ms` / `status` for `in_progress` → `success` transitions), **single new audit row per request** (so retries are observable but don't pollute the index).

### 5.4. Response — `200 OK`

```json
{
  "external_id": "github-actions:run-12345:job-67890",
  "service": "payment-service",
  "stored_at_ms": 1747142641204,
  "is_new": true,
  "audit_id": "audit_01HE...",
  "dora_eligible": true
}
```

`dora_eligible = false` when `status != "success"` OR `environment` ∉ deploy-counted set (configured per service; default `["prod"]`, configurable via `[ci.service.<id>].deploy_environments`). Operators see immediately whether a posted event will move DORA.

### 5.5. Error matrix

| Code | Trigger | Response body |
|---|---|---|
| `400 invalid_request` | Missing / malformed fields | `{ "error": "invalid_request", "details": [{ "field": "...", "reason": "..." }] }` |
| `400 unknown_service` | `service` not in any `[ci.service.<id>]` or `[metrics.dora.<id>]` block | `{ "error": "unknown_service", "service": "...", "known_services": ["payment-service", "billing", ...] }` (operator sees the list immediately; capped at 25 names to keep the response small) |
| `401 unauthorized` | Bearer missing or wrong | `{ "error": "unauthorized" }` (no token leak in body) |
| `405 method_not_allowed` | Path is a write route but method ≠ POST | `Allow: POST` header |
| `413 payload_too_large` | Body > 8 KiB | `{ "error": "payload_too_large" }` |
| `429 rate_limited` | >60 posts/min per `token_fingerprint` | `Retry-After: <s>` + `X-RateLimit-*` headers |

**Rate-limit headers** are set on **every** response (200 / 4xx / 429), not just on rejections, so the Action can back off before hitting the wall:

| Header | Value |
|---|---|
| `X-RateLimit-Limit` | `60` (current window cap) |
| `X-RateLimit-Remaining` | requests still permitted in the current sliding window for this `token_fingerprint` |
| `X-RateLimit-Reset` | unix-seconds when the oldest in-window request will fall off |
| `503 vault_unavailable` | Vault unreachable (Keychain locked, etc.) | `{ "error": "vault_unavailable" }` |
| `503 write_surface_disabled` | `http_api.deployment_token` absent from vault | `{ "error": "write_surface_disabled", "hint": "set http_api.deployment_token via 'nimbus vault set http_api.deployment_token <value>'" }` |
| `503 db_busy` | SQLite `SQLITE_BUSY` after retry | `{ "error": "db_busy" }` |

### 5.6. Audit row contract

Every request — success or failure — writes one row:

```ts
{
  event: "deployment.annotated" | "deployment.annotation_rejected",
  service: <service-id-or-null>,
  payload_sha: <sha256-of-canonical-body-prefix-16>,
  token_fingerprint: <sha256-of-token-prefix-8 | "unknown">,
  source_ip: "127.0.0.1" | "local",
  result_code: <http-status>,
  external_id: <external-id-or-null>,
  ts_ms: <now>
}
```

`token_fingerprint` is the first 8 hex chars of `sha256(token)` — enough to tell rotated tokens apart, not enough to recover the token. Logged on `401` so brute-force attempts are visible. **The raw token is never logged.**

`source_ip` is `"local"` for IPC-originated calls (CLI), `"127.0.0.1"` for HTTP-originated calls (Action + curl).

**Implementation note:** the row goes through `appendAuditEntry(db, …)` (the canonical chain-append helper at `packages/gateway/src/db/audit-chain.ts`), which writes through the BLAKE3 chain and the existing `row_hash` / `prev_hash` columns. The `hitl_status` column is CHECK-constrained to `'approved'|'rejected'|'not_required'` — annotation rows always set `hitl_status = 'not_required'` (consent does not apply), and the "external_write" semantic is conveyed by the `action_type` value (`"deployment.annotated"` vs `"deployment.annotation_rejected"`). Every field shown above except `action_type`, `hitl_status`, `timestamp` lives inside the JSON-serialized `action_json` blob.

### 5.7. DORA integration contract

`selectDeploys` becomes (sketch):

```ts
function selectDeploys(db, cfg, nowMs, sinceMs): DeployRow[] {
  const annotated = selectAnnotatedDeploys(db, cfg, nowMs, sinceMs);  // type='deployment'
  if (annotated.length > 0) {
    const regex = selectRegexDeploys(db, cfg, nowMs, sinceMs);        // existing path
    if (regex.length > 0) {
      attachGapHint(cfg, 'mixed_source');
      // The caller's gap-resolution path may downgrade to 'mixed_source' if
      // no stronger gap is already attached.
    }
    return annotated;     // explicit always wins
  }
  return selectRegexDeploys(db, cfg, nowMs, sinceMs);
}
```

`gap: "mixed_source"` is informational (the metric still returns a value). It tells operators "you have some annotated deploys and some regex-matched ones in the same window — annotate consistently or your numbers may drift". The hint string is:

> "some deploys in this window are explicit annotations; some are regex-matched. Annotate consistently for accurate DF/LT."

**CLI rendering:** when `gap === "mixed_source"`, the `nimbus metrics dora` pretty card prefixes the affected metric row with a yellow `⚠` icon (terminal-color-detected, omitted when `NO_COLOR` is set or stdout is not a TTY). The JSON shape is unchanged. The icon is local to the row; it does not change the overall verdict.

### 5.8. Three-surface equivalence

| Surface | Auth | Audit `source_ip` |
|---|---|---|
| `nimbus deploy annotate ...` (CLI) | local socket identity | `local` |
| `POST /v1/deployments` (HTTP, curl, scripts) | bearer token | `127.0.0.1` |
| `nimbus-agent/annotate-action` (GH Action) | bearer token | `127.0.0.1` |

All three converge on `annotateDeployment(db, input)` — one validator, one transaction, one audit shape.

### 5.9. I13 invariant (NEW)

**Statement:** HTTP write routes go through a compile-time allowlist + bearer auth; the readonly handle never executes writes.

- **Production wiring site:** `packages/gateway/src/ipc/http-server.ts` — any non-GET method routes through `dispatchWriteRoute` from `http-write-routes.ts`, which enforces `WRITE_ROUTE_ALLOWLIST` membership + bearer auth before touching the write handle.
- **Docs entry:** `docs/SECURITY-INVARIANTS.md` §I13 with file:line.
- **Enforcement test** (`security-invariants.test.ts`):
  1. `packages/gateway/src/ipc/http-server.ts` imports `dispatchWriteRoute` from `./http-write-routes.ts`.
  2. `packages/gateway/src/ipc/http-server.ts` source contains exactly **one** `SQLITE_OPEN_READWRITE` token, and it appears inside the server-context wiring (regex-grep scoped to that single file). Legitimate writable handles in `db/`, `sync/`, audit, etc. are explicitly out of scope — this test is about the HTTP server file alone.
  3. `WRITE_ROUTE_ALLOWLIST.length === 1` AND contains exactly `"POST /v1/deployments"`.

The third assertion is the chore-on-purpose: every future write route bumps it explicitly, the same way Tauri `ALLOWED_METHODS` count assertion forces a security checkpoint.

## 6. Failure modes & fallbacks

| Failure | Behavior | Why |
|---|---|---|
| Gateway unreachable from runner | Action exits per `allow-gateway-failure` input (default `false` → workflow fails; `true` → soft warning, workflow continues) | Mirrors PR 3a's escape hatch; runner-network noise mustn't break deploys |
| Bearer token rotated mid-workflow | First call gets `401`; Action surfaces token-rotation error in workflow log. No silent retry. | Operators want to see rotation visibility, not a fallback that masks it |
| Vault unreachable (Keychain locked on macOS during screen lock) | `503 vault_unavailable`; Action treats as gateway failure (honors `allow-gateway-failure`) | Don't fail closed when the operator's keychain blips |
| Duplicate post (same `external_id`) | `200 OK is_new: false`; single new audit row | Retries from CI shouldn't pollute the index |
| Race: two posts with same `external_id` arrive concurrently | SQLite transaction serializes; second post sees `is_new: false` | The shadow table has `UNIQUE(external_id)`; `INSERT OR REPLACE` is atomic |
| Migration V28 fails mid-run | Existing migration runner restores the pre-V28 backup and exits non-zero; the Gateway aborts startup. On the next attempted start the runner sees the rolled-back ledger row and retries from V26. Existing readonly GET surface is irrelevant at that point — startup has not progressed far enough to bind the HTTP port. | Inherits the Phase 3.5 rollback contract — no manual cleanup needed |
| Write handle exhausted / `SQLITE_BUSY` | Single retry with 50 ms backoff, then `503 db_busy` | Matches `db/write.ts` retry policy |
| `http_api.deployment_token` absent | `POST /v1/deployments` returns `503 write_surface_disabled` with a hint; GET routes continue serving | Off-by-default for safety; operator opts in by setting the vault key |

## 7. Security posture

Five-layer defense in depth:

1. **Loopback bind** — `http-server.ts` continues to bind `127.0.0.1` only (existing).
2. **Route allowlist** — `WRITE_ROUTE_ALLOWLIST` is a compile-time `readonly string[]`. Any other path returns `405`. New write routes require a code change + I13 test update — same rigor as Tauri `ALLOWED_METHODS`.
3. **Bearer auth** — vault-backed token, constant-time-compared. Brute-force visible in audit log.
4. **Rate limit** — 60/min sliding window per `token_fingerprint`. `429 Retry-After` on overflow.
5. **Body cap + strict validation** — 8 KiB max, every field in §5.2 is type-checked + length-bounded; unknown fields are silently dropped (not echoed back, never persisted), so a tampered payload cannot smuggle extra columns into the index.

### What the `<tool_output>` envelope (I11) means for this PR

The `deployment` item lands in the index untrusted-bytes-and-all (workflow_url, ref, service id can all be operator-controlled but workflows often interpolate PR titles and other user-supplied content). The envelope is applied at the LLM-facing read path (`engine/agent.ts wrapToolForLlm`) — already in place — so no extra work here.

**Test note:** the integration test seeds a deployment whose every string-valued field carries the literal substring `</tool_output>` (parameterized over `service`, `provider`, `environment`, `sha`, `ref`, `workflow_url`, `run_id`, `job_id`) and asserts the LLM-facing surface escapes each occurrence. Parameterizing the test over the input shape means that any future string field added to `DeploymentAnnotateInput` is automatically covered the moment the schema is widened — the regression check cannot silently fail to keep up.

## 8. Acceptance criteria

1. `nimbus-agent/annotate-action@v1` posts a successful prod deploy from a self-hosted runner and the row appears in the index under `type = "deployment"` within 500 ms.
2. `nimbus deploy annotate --service payment-service --sha abc1234 --target-ref refs/heads/main --env prod --status success` against a running Gateway produces the same row shape as the HTTP path. Same `external_id` rule (CLI hits the fallback tier when `run_id` is absent). Same audit row (with `source_ip = "local"`).
3. Re-posting the same `(provider, run_id, job_id)` triple returns `200 is_new: false`; the `item` row's `synced_at` updates but `created_at` does not.
4. `POST /v1/deployments` without a bearer header returns `401` and produces an audit row with `token_fingerprint = "unknown"` and `event = "deployment.annotation_rejected"`.
5. `POST /v1/deployments` to a 60/min over-quota token returns `429` with `Retry-After`.
6. `nimbus metrics dora --service payment-service` against a fixture with 3 annotated deploys + 2 regex-matched `ci_run` rows in the window returns `value` based on the 3 annotated deploys and `gap: "mixed_source"`.
7. `bun run audit:openapi-drift` passes after the new POST route + schema land; fails when one is removed without the other.
8. `cargo test allowlist_*` from `packages/ui/src-tauri/` still passes — `deployment.annotate` is NOT in `ALLOWED_METHODS`.
9. `bun test packages/gateway/test/unit/security-invariants.test.ts` passes the three new I13 sub-asserts.
10. `bun run test:coverage:deployment` ≥ 80% and the new gate is wired into `_test-suite.yml`.
11. The deployment write surface is mounted only when `http_api.deployment_token` exists in the vault. Absent → POST returns `503 write_surface_disabled`; GET routes continue serving. Documented in `nimbus-commands` skill.
12. The integration test seeds a deployment whose `workflow_url` contains the literal substring `</tool_output>` and asserts that, when the deployment is later surfaced through an LLM-facing tool, the substring is escaped — confirming I11 still holds for the new item type.

## 9. PR breakdown

Single PR. Architecture is tight enough that splitting (e.g., "land migration first, then HTTP surface") creates an awkward intermediate state where DORA changes are partially landed. The unit-test-per-step structure in the implementation plan gives reviewers a per-task diff to follow.

The companion follow-up — **T4 PR 4 (PagerDuty connector enrichment)** — remains a separate PR. It does not block this one.

## 10. Test strategy

| Layer | File | What it covers |
|---|---|---|
| Unit | `deployment/annotate.test.ts` | Every validation rule; idempotency (re-post → `is_new: false`); audit row shape; `dora_eligible` flag matrix |
| Unit | `deployment/external-id.test.ts` | Three-tier rule: both run_id+job_id; run_id only; fallback to `<service>:<env>:<sha>:<started_at_ms>` |
| Unit | `ipc/deployment-rpc.test.ts` | Method dispatch; param validation; `DeploymentRpcError` codes |
| Unit | `ipc/http-auth.test.ts` | Missing / malformed / wrong / right bearer; constant-time-compare (timing-side-channel test); `token_fingerprint` shape; `401` audit row |
| Unit | `ipc/http-rate-limit.test.ts` | 60/min sliding window; per-token isolation; `Retry-After` header value |
| Unit | `metrics/dora.test.ts` (extend) | `selectDeploys` three branches: annotated-only, regex-only, mixed (asserts `gap: "mixed_source"`) |
| Integration | `http/deployments-post-route.test.ts` | Full round-trip: `200` first post; `200 is_new=false` retry; `400` per field; `400 unknown_service`; `401` no token; `405` on GET; `413` oversize; `429` after 60/min; `503 write_surface_disabled` when vault key absent; `503 vault_unavailable` when vault read fails |
| Integration | `metrics/dora-deployment-source.test.ts` | Fixture: 3 annotated + 2 regex `ci_run` in the same 30d window; assert `deploymentFrequency` counts the 3 annotated, emits `mixed_source` |
| Integration | `db/migration-v27.test.ts` | V28 migration runs cleanly on a fresh DB; idempotent rerun; pre-migration backup written; rolls back on injected throw |
| E2E (CLI) | `e2e/scenarios/deploy-annotate.e2e.test.ts` | In-process Gateway + CLI subprocess: `nimbus deploy annotate ...` → asserts `item` + `deployment_items` rows + audit row + `200 is_new=false` on retry |
| E2E (smoke) | `cli/test/e2e/deploy-annotate.smoke.e2e.test.ts` | No-Gateway: missing args, unknown status, help text |
| Action (its own repo) | `annotate-action/src/main.test.ts` | Mock-fetch matrix: `200` / `200 is_new=false` / `401` / `429` / `503` / network-fail × `allow-gateway-failure` true/false |
| Security invariants | `security-invariants.test.ts` (extend) | I13 three sub-asserts |

**Coverage gate:** new `bun run test:coverage:deployment` ≥ **80%**. Wired into `bun run test:ci` and `_test-suite.yml`.

## 11. Risks & mitigations

- **Risk:** Token leaks via GH Actions logs (e.g. `echo $TOKEN` in a debug step).
  **Mitigation:** Action declares the input with `secret: true` so GH masks it in logs; README leads with the rotation procedure.
- **Risk:** Operator forgets to set `http_api.deployment_token` and CI starts failing.
  **Mitigation:** Acceptance criterion #11 — Gateway returns `503 write_surface_disabled` with the hint string. Action surfaces the hint verbatim in workflow logs. The Action README's "Getting Started" section opens with the exact `nimbus vault set http_api.deployment_token <value>` command and the GitHub Secrets wiring, so the happy-path setup is unambiguous.
- **Risk:** `mixed_source` gap surprises adopters of T4 PR 2 who start annotating partway through a 30d window.
  **Mitigation:** Gap note carries the explicit hint string in §5.7. Documented in the `nimbus-commands` skill addendum.
- **Risk:** `WRITE_ROUTE_ALLOWLIST.length === 1` enforcement test becomes a chore (every future write route bumps it).
  **Mitigation:** Same pattern as Tauri `ALLOWED_METHODS` count assertion — chore is intentional. New write route requires an explicit security review checkpoint.
- **Risk:** `annotateDeployment` write inside the read-mostly HTTP server contends with concurrent reads.
  **Mitigation:** SQLite WAL mode already in use; the writable handle is per-server-instance (not per-request); contention bounded by the 60/min rate limit.
- **Risk:** Reviewer pushback on putting a write surface on the same port as the read API.
  **Mitigation:** I13 is the architectural answer — the per-route allowlist + dedicated dispatcher makes the read/write split as strong as a port split would be, and operators only configure one URL. If reviewer disagrees, the implementation plan can fork a `port + 1` write server without changing the IPC method or the calculator contract — only `http-server.ts` and the Action's URL input change.
- **Risk:** `selectAnnotatedDeploys` query plan is slower than the existing `ci_run` regex match.
  **Mitigation:** V28 indexes on `(nimbus_service_id, environment, started_at_ms DESC)` make the lookup O(log n). Integration test measures wall time and fails if `dora-deployment-source.test.ts` exceeds the same latency budget as the existing `dora-real-db.test.ts`.

## 12. Out of scope (recorded)

- LAN-reachable write surface (deferred to a future PR; the existing `LanServer` `I5` model is the right gate).
- Token rotation CLI subcommands (`nimbus deploy annotate-token create | list | revoke`).
- mTLS or per-service signing keys.
- Backfilling historic deploys from existing `ci_run` rows (operators can replay their CI history if they care).
- A `POST /v1/incidents` companion. PagerDuty enrichment (T4 PR 4) is the right next step.
- Adding `deployment.annotate` to the Tauri renderer allowlist.
- **Stale `in_progress` deployment sweeper.** Annotations with `status = "in_progress"` that never receive a follow-up `success` / `failure` post (e.g. workflow crashed mid-deploy) remain in the index as `in_progress` indefinitely. DORA filters with `WHERE conclusion = 'success'`, so the four metrics are unaffected; the rows are only visible to "what's currently deploying" agent queries. A periodic sweeper (`in_progress > 24h → cancelled`) is a Phase 6 hygiene PR — the threshold needs operator input and isn't load-bearing for this PR.
- **Per-metric environment overrides.** Each service has one `deploy_environments` list applied uniformly to all four DORA metrics. Per-metric overrides (e.g. DF counts staging + prod, CFR counts prod only) are explicit scope creep — none of the four metrics is asking for it today. Revisit if operator feedback after launch surfaces a real need.

## 13. Review dispositions

Tracks the Gemini-CLI design review ([`2026-05-13-phase-5-t4-pr3b-annotation-design-review.md`](./2026-05-13-phase-5-t4-pr3b-annotation-design-review.md)).

| # | Review item | Disposition | Resolution |
|---|---|---|---|
| Q1 | Fallback `external_id` includes `started_at_ms` → shell retries duplicate items | **FIX** | §5.3 — fallback shape changed to `<service>:<env>:<sha>`; per-attempt granularity moves to opt-in `--run-id`. |
| Q2 | I13 grep scope ambiguous | **FIX (clarify)** | §5.9 — sub-assertion 2 now explicitly scopes the regex-grep to `packages/gateway/src/ipc/http-server.ts` only. |
| Q3 | `degraded` / `partially_successful` status enum | **DEFER** | Modeling canary stages requires DORA-side strategy awareness (DF / CFR accounting). Operators model today as `in_progress` → `success`/`failure` per shard. Revisit when a deploy-strategy concept lands. |
| Q4 | Does a new `[ci.service.<id>]` need a Gateway restart? | **FIX (clarify)** | §5.2 — `loadNimbusServiceConfigsFromConfigDir` runs per request (matches PR 3a). New services are visible on the next post. |
| S1 | Future-proof vault key as `http_api.tokens.deploy.global` | **DEFER** | Current name is clearer for the single-token case. Per-service tokens will be `http_api.deployment_token.<service>` beside the existing global key — same future cost, no churn now. |
| S2 | Highlight `mixed_source` in CLI pretty mode | **FIX** | §5.7 — yellow ⚠ prefix when `gap === "mixed_source"`; `NO_COLOR` and non-TTY respected. |
| S3 | `400 unknown_service` includes a hint | **FIX** | §5.5 — body carries `known_services` array (capped at 25). |
| S4 | `X-RateLimit-*` headers | **FIX** | §5.5 — set on every response; documented header semantics added. |
| S5 | I11 regression test structure | **FIX** | §7 test note — parameterize over every string field of `DeploymentAnnotateInput` so future field additions are auto-covered. |
| MN | `nimbus vault set` in Action README "Getting Started" | **FIX** | §11 mitigation row — README opens with the exact vault-set command + GH Secrets wiring. |

## 14. Cross-references

- Predecessor: [`2026-05-12-phase-5-t4-pr3a-preflight-design.md`](./2026-05-12-phase-5-t4-pr3a-preflight-design.md) (pre-deploy read).
- T4 sequencing: [`2026-05-10-phase-5-t4-cicd-data-layer-design.md`](./2026-05-10-phase-5-t4-cicd-data-layer-design.md).
- Phase 5 sequencing: [`2026-05-06-phase-5-sequencing-design.md`](./2026-05-06-phase-5-sequencing-design.md).
- Security invariants: [`docs/SECURITY-INVARIANTS.md`](../../SECURITY-INVARIANTS.md) (I13 row added in this PR).
- Tauri allowlist (untouched): [`.claude/commands/nimbus-tauri-allowlist.md`](../../../.claude/commands/nimbus-tauri-allowlist.md).
- Roadmap row: `docs/roadmap.md` → "Post-deploy annotation" (flipped to `[x]` in this PR).
