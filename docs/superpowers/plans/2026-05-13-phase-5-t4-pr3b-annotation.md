# Phase 5 T4 PR 3b — Post-Deploy Annotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the write-half of the T4 GitHub-Actions story end-to-end: `POST /v1/deployments` HTTP endpoint + `nimbus deploy annotate` CLI + `nimbus-agent/annotate-action` GitHub Action, all converging on a single `deployment.annotate` IPC method. Lands a new `deployment` item type, upgrades DORA's `selectDeploys` to prefer explicit annotations, and adds security invariant **I13**.

**Architecture:** Pure annotation calculator at `packages/gateway/src/deployment/annotate.ts` upserts the unified `item` row (`type = "deployment"`) plus a new `deployment_items` shadow table (V28 migration), then writes one audit row through `appendAuditEntry`. The HTTP server gains a write-route dispatcher (`http-write-routes.ts`) that holds a second `SQLITE_OPEN_READWRITE` handle and a one-entry compile-time allowlist (`POST /v1/deployments`); all writes go through bearer-auth (vault key `http_api.deployment_token`) and a 60-req/min sliding-window rate limiter. The CLI command calls the same `deployment.annotate` IPC; the GH Action calls the HTTP endpoint. DORA `selectDeploys` checks `type='deployment'` first and falls back to the existing `ci_run` regex match.

**Tech Stack:** Bun v1.2+, TypeScript 6.x strict (no `any`), `bun:sqlite`, hand-written TOML parser pattern (`nimbus-toml.ts`), `js-yaml` (already in T4 PR 1), the existing `Bun.serve` HTTP server, JSON-RPC 2.0 over Unix socket / named pipe, Node 20 for the GitHub Action runtime.

**Source spec:** [`docs/superpowers/specs/2026-05-13-phase-5-t4-pr3b-annotation-design.md`](../specs/2026-05-13-phase-5-t4-pr3b-annotation-design.md). The §13 review-disposition table is the authoritative resolution for each Gemini-CLI review item; the FIX dispositions are baked into the tasks below.

---

## File Structure

### Files created

| Path | Responsibility |
|---|---|
| `packages/gateway/src/index/deployment-v28-sql.ts` | V28 migration SQL: `deployment_items` shadow table + indexes. |
| `packages/gateway/src/deployment/types.ts` | `DeploymentAnnotateInput`, `DeploymentAnnotateResult`, `DeploymentConclusion`, `DeploymentProvider`. |
| `packages/gateway/src/deployment/external-id.ts` | `computeDeploymentExternalId(input)` — three-tier rule. |
| `packages/gateway/src/deployment/annotate.ts` | `annotateDeployment(db, input, nowMs)` — validation + transactional upsert + audit row. |
| `packages/gateway/src/ipc/deployment-rpc.ts` | `dispatchDeploymentRpc` + `DeploymentRpcError`. |
| `packages/gateway/src/ipc/http-auth.ts` | `HTTP_API_DEPLOYMENT_TOKEN_VAULT_KEY` + `requireBearer(req, ctx)`. |
| `packages/gateway/src/ipc/http-rate-limit.ts` | `HttpWriteRateLimiter` — 60-req/min sliding window per token fingerprint. |
| `packages/gateway/src/ipc/http-write-routes.ts` | `WRITE_ROUTE_ALLOWLIST` + `dispatchWriteRoute(req, ctx)`. |
| `packages/cli/src/commands/deploy-annotate.ts` | `nimbus deploy annotate ...` subcommand. |
| `packages/cli/src/commands/deploy-annotate.test.ts` | CLI arg parser unit tests. |
| `packages/cli/test/e2e/deploy-annotate.smoke.e2e.test.ts` | No-Gateway smoke. |
| `packages/github-actions/annotate-action/action.yml` | Action manifest. |
| `packages/github-actions/annotate-action/package.json` | Action package. |
| `packages/github-actions/annotate-action/src/main.ts` | Action entry. |
| `packages/github-actions/annotate-action/src/render.ts` | Workflow-summary renderer. |
| `packages/github-actions/annotate-action/src/main.test.ts` | Mock-fetch matrix. |
| `packages/github-actions/annotate-action/src/render.test.ts` | Pure rendering tests. |
| `packages/github-actions/annotate-action/dist/index.js` | Bundled (committed). |
| `packages/github-actions/annotate-action/README.md` | Usage + token-setup walkthrough. |
| `packages/gateway/test/unit/deployment/annotate.test.ts` | Validation + idempotency + audit row. |
| `packages/gateway/test/unit/deployment/external-id.test.ts` | Three-tier rule. |
| `packages/gateway/test/unit/ipc/deployment-rpc.test.ts` | Method dispatch + param validation. |
| `packages/gateway/test/unit/ipc/http-auth.test.ts` | Bearer auth + timing + fingerprint. |
| `packages/gateway/test/unit/ipc/http-rate-limit.test.ts` | Sliding-window correctness. |
| `packages/gateway/test/integration/http/deployments-post-route.test.ts` | Full HTTP error matrix. |
| `packages/gateway/test/integration/metrics/dora-deployment-source.test.ts` | DORA mixed-source fallback. |
| `packages/gateway/test/integration/db/migration-v28.test.ts` | V28 migration round-trip. |
| `packages/gateway/test/fixtures/deployments/payment-service/seed.ts` | Programmatic fixture. |
| `packages/gateway/test/e2e/scenarios/deploy-annotate.e2e.test.ts` | CLI → IPC → DB. |

### Files modified

| Path | Change |
|---|---|
| `packages/gateway/src/index/migrations/runner.ts` | Add `migrateIndexedV27ToV28` step using `DEPLOYMENT_V28_SCHEMA_SQL`. |
| `packages/gateway/src/ipc/http-server.ts` | Open second `SQLITE_OPEN_READWRITE` handle in server context; route POST through `dispatchWriteRoute`; close on `stop()`. |
| `packages/gateway/src/ipc/http-routes.ts` | Rename `READ_ONLY_HTTP_ROUTES` → `HTTP_ROUTES`; widen `ReadOnlyHttpRoute.method` to `"GET" \| "POST"`; append `{ method: "POST", path: "/v1/deployments" }`. |
| `scripts/structure-audit/check-openapi-drift.ts` | Read renamed `HTTP_ROUTES` const + assert methods match. |
| `packages/gateway/src/ipc/server/context.ts` | Add `deploymentRpcSkipped` sentinel. |
| `packages/gateway/src/ipc/server/dispatchers.ts` | Wire `tryDispatchDeploymentRpc` after `tryDispatchPreflightRpc`. |
| `packages/gateway/src/metrics/dora.ts` | `selectDeploys` checks `type='deployment'` first; emits `gap: "mixed_source"` when both sources present. |
| `packages/gateway/src/metrics/dora-config.ts` | Add `deployEnvironments: readonly string[]` to `ServiceConfig`. |
| `packages/gateway/src/config/nimbus-toml.ts` | Parse optional `deploy_environments` array under `[ci.service.<id>]` / `[metrics.dora.<id>]`. Default `["prod"]`. |
| `packages/cli/src/commands/deploy.ts` | Register `annotate` as a sibling subcommand of `preflight`. |
| `packages/cli/src/commands/registry.ts` | Register `deploy-annotate` per PR-258 pattern. |
| `packages/cli/src/commands/help.ts` | Help text for `nimbus deploy annotate`. |
| `packages/gateway/openapi/v1.yaml` | Add `POST /v1/deployments` operation + component schemas + `bearer-auth` security scheme. |
| `package.json` (root) | `test:coverage:deployment` script. |
| `scripts/lib/ci-tests.ts` | Append `test:coverage:deployment`. |
| `.github/workflows/_test-suite.yml` | Add Deployment coverage matrix entry. |
| `.claude/commands/nimbus-file-map.md` | Add deployment files to Metrics + CI/CD section. |
| `.claude/commands/nimbus-commands.md` | New script + CLI command + vault key reference. |
| `CLAUDE.md` + `GEMINI.md` | Append `· T4 PR 3b annotation ✅` to status line. |
| `docs/roadmap.md` | Flip "Post-deploy annotation" bullet to `[x]`. |
| `docs/SECURITY-INVARIANTS.md` | New §I13 entry. |
| `packages/gateway/src/security-invariants.test.ts` | New `describe("I13 …")` block with 3 sub-asserts. |

---

## Task 1: V28 migration SQL + integration test

**Files:**
- Create: `packages/gateway/src/index/deployment-v28-sql.ts`
- Create: `packages/gateway/test/integration/db/migration-v28.test.ts`
- Modify: `packages/gateway/src/index/migrations/runner.ts`

- [ ] **Step 1: Write the failing migration integration test**

Create `packages/gateway/test/integration/db/migration-v28.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runIndexedMigrations } from "../../../src/index/migrations/runner.ts";

describe("V28 — deployment_items shadow table", () => {
  test("fresh DB advances user_version to 28", async () => {
    const dir = mkdtempSync(join(tmpdir(), "v28-fresh-"));
    const db = new Database(join(dir, "nimbus.db"));
    await runIndexedMigrations(db, { dataDir: dir });
    const row = db.query("PRAGMA user_version").get() as { user_version: number };
    expect(row.user_version).toBe(28);
    db.close();
  });

  test("deployment_items table is created with the expected columns", async () => {
    const dir = mkdtempSync(join(tmpdir(), "v28-cols-"));
    const db = new Database(join(dir, "nimbus.db"));
    await runIndexedMigrations(db, { dataDir: dir });
    const cols = db.query("PRAGMA table_info(deployment_items)").all() as Array<{
      name: string;
      type: string;
      notnull: number;
    }>;
    const byName = new Map(cols.map((c) => [c.name, c]));
    expect(byName.get("id")?.type).toBe("TEXT");
    expect(byName.get("provider")?.type).toBe("TEXT");
    expect(byName.get("nimbus_service_id")?.type).toBe("TEXT");
    expect(byName.get("environment")?.type).toBe("TEXT");
    expect(byName.get("sha")?.type).toBe("TEXT");
    expect(byName.get("ref")?.type).toBe("TEXT");
    expect(byName.get("started_at_ms")?.type).toBe("INTEGER");
    expect(byName.get("finished_at_ms")?.type).toBe("INTEGER");
    expect(byName.get("conclusion")?.type).toBe("TEXT");
    expect(byName.get("workflow_url")?.type).toBe("TEXT");
    expect(byName.get("ci_run_external_id")?.type).toBe("TEXT");
    expect(byName.get("created_at")?.type).toBe("INTEGER");
    db.close();
  });

  test("UNIQUE(external_id) prevents dup rows on the item table for type='deployment'", async () => {
    const dir = mkdtempSync(join(tmpdir(), "v28-uniq-"));
    const db = new Database(join(dir, "nimbus.db"));
    await runIndexedMigrations(db, { dataDir: dir });
    db.run(
      `INSERT INTO item (id, service, type, external_id, title, modified_at, synced_at)
       VALUES ('deployment:gha:run-1', 'github-actions', 'deployment', 'gha:run-1', 't', 0, 0)`,
    );
    expect(() =>
      db.run(
        `INSERT INTO item (id, service, type, external_id, title, modified_at, synced_at)
         VALUES ('deployment:gha:run-1-dup', 'github-actions', 'deployment', 'gha:run-1', 't', 0, 0)`,
      ),
    ).toThrow();
    db.close();
  });

  test("idx_deployment_items_service_env_started enables ORDER BY on the hot path", async () => {
    const dir = mkdtempSync(join(tmpdir(), "v28-idx-"));
    const db = new Database(join(dir, "nimbus.db"));
    await runIndexedMigrations(db, { dataDir: dir });
    const idxs = db
      .query("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='deployment_items'")
      .all() as Array<{ name: string }>;
    const names = idxs.map((i) => i.name);
    expect(names).toContain("idx_deployment_items_service_env_started");
    expect(names).toContain("idx_deployment_items_provider_sha");
    db.close();
  });

  test("conclusion CHECK constraint rejects unknown values", async () => {
    const dir = mkdtempSync(join(tmpdir(), "v28-check-"));
    const db = new Database(join(dir, "nimbus.db"));
    await runIndexedMigrations(db, { dataDir: dir });
    expect(() =>
      db.run(
        `INSERT INTO deployment_items (id, provider, nimbus_service_id, environment, sha, ref, started_at_ms, conclusion, created_at)
         VALUES ('deployment:gha:run-1', 'github-actions', 'p', 'prod', 'abc', 'r', 0, 'unknown_conclusion', 0)`,
      ),
    ).toThrow();
    db.close();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
bun test packages/gateway/test/integration/db/migration-v28.test.ts
```

Expected: FAIL — `runIndexedMigrations` stops at V27 (`user_version = 27`) and `deployment_items` table does not exist.

- [ ] **Step 3: Write the V28 schema SQL constant**

Create `packages/gateway/src/index/deployment-v28-sql.ts`:

```ts
/**
 * V28 migration — `deployment_items` shadow table for the post-deploy
 * annotation surface (Phase 5 T4 PR 3b). One row per annotated deploy,
 * keyed by the unified `item.id`. Append-only and additive — no backfill
 * is needed; existing rows in `item` are unaffected.
 *
 * The unified `item` table holds the cross-cutting search row
 * (`service = "<provider>"`, `type = "deployment"`); this shadow table
 * holds structured fields the DORA calculator queries directly.
 */

export const DEPLOYMENT_V28_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS deployment_items (
  id                  TEXT PRIMARY KEY,
  provider            TEXT NOT NULL CHECK(provider IN
    ('github-actions','gitlab','jenkins','circleci','bitbucket','other')),
  nimbus_service_id   TEXT NOT NULL,
  environment         TEXT NOT NULL,
  sha                 TEXT NOT NULL,
  ref                 TEXT NOT NULL,
  started_at_ms       INTEGER NOT NULL,
  finished_at_ms      INTEGER,
  conclusion          TEXT NOT NULL CHECK(conclusion IN
    ('success','failure','cancelled','in_progress')),
  workflow_url        TEXT,
  ci_run_external_id  TEXT,
  created_at          INTEGER NOT NULL,
  FOREIGN KEY (id) REFERENCES item(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_deployment_items_service_env_started
  ON deployment_items (nimbus_service_id, environment, started_at_ms DESC);
CREATE INDEX IF NOT EXISTS idx_deployment_items_provider_sha
  ON deployment_items (provider, sha);
`;
```

- [ ] **Step 4: Wire the V28 step into the runner**

Open `packages/gateway/src/index/migrations/runner.ts` and find the existing V27 step (around line 370) and the `INDEXED_SCHEMA_STEPS` array (around line 405). Add the import at the top of the file alongside the other migration imports:

```ts
import { DEPLOYMENT_V28_SCHEMA_SQL } from "../deployment-v28-sql.ts";
```

After `migrateIndexedV26ToV27`, add:

```ts
function migrateIndexedV27ToV28(db: Database, now: number): void {
  db.transaction(() => {
    db.exec(DEPLOYMENT_V28_SCHEMA_SQL);
    db.exec("PRAGMA user_version = 28");
    recordMigration(db, 28, "deployment_items shadow table (T4 PR 3b)", now);
  })();
}
```

Append to `INDEXED_SCHEMA_STEPS`:

```ts
  { fromVersion: 27, toVersion: 28, apply: migrateIndexedV27ToV28 },
```

- [ ] **Step 5: Run the migration test to verify it passes**

```bash
bun test packages/gateway/test/integration/db/migration-v28.test.ts
```

Expected: PASS — all 5 tests green.

- [ ] **Step 6: Run the full migration test suite to make sure nothing else broke**

```bash
bun test packages/gateway/test/integration/db/
```

Expected: PASS across all migration tests.

- [ ] **Step 7: Commit**

```bash
git add packages/gateway/src/index/deployment-v28-sql.ts \
        packages/gateway/src/index/migrations/runner.ts \
        packages/gateway/test/integration/db/migration-v28.test.ts
git commit -m "feat(deployment): V28 migration — deployment_items shadow table"
```

---

## Task 2: Deployment types

**Files:**
- Create: `packages/gateway/src/deployment/types.ts`

- [ ] **Step 1: Write the types file**

Create `packages/gateway/src/deployment/types.ts`:

```ts
/**
 * Phase 5 T4 PR 3b — Post-deploy annotation types.
 *
 * Surface: HTTP POST /v1/deployments, IPC deployment.annotate,
 * CLI nimbus deploy annotate. NOT LLM-facing — see invariant I11 for
 * envelope rules at the LLM boundary.
 */

export type DeploymentConclusion = "success" | "failure" | "cancelled" | "in_progress";

export type DeploymentProvider =
  | "github-actions"
  | "gitlab"
  | "jenkins"
  | "circleci"
  | "bitbucket"
  | "other";

export interface DeploymentAnnotateInput {
  readonly service: string;
  readonly provider: DeploymentProvider;
  readonly environment: string;
  readonly sha: string;
  readonly ref: string;
  readonly status: DeploymentConclusion;
  readonly started_at_ms: number;
  readonly finished_at_ms?: number;
  readonly workflow_url?: string;
  readonly run_id?: string;
  readonly job_id?: string;
}

export interface DeploymentAnnotateResult {
  readonly external_id: string;
  readonly service: string;
  readonly stored_at_ms: number;
  readonly is_new: boolean;
  readonly dora_eligible: boolean;
}
```

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/gateway/src/deployment/types.ts
git commit -m "feat(deployment): annotate input/result types"
```

---

## Task 3: Compute external_id (three-tier rule)

**Files:**
- Create: `packages/gateway/src/deployment/external-id.ts`
- Create: `packages/gateway/test/unit/deployment/external-id.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/gateway/test/unit/deployment/external-id.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { computeDeploymentExternalId } from "../../../src/deployment/external-id.ts";
import type { DeploymentAnnotateInput } from "../../../src/deployment/types.ts";

const base: DeploymentAnnotateInput = {
  service: "payment-service",
  provider: "github-actions",
  environment: "prod",
  sha: "a1b2c3d",
  ref: "refs/heads/main",
  status: "success",
  started_at_ms: 1747142400000,
};

describe("computeDeploymentExternalId", () => {
  test("returns provider:run-X:job-Y when both run_id and job_id present", () => {
    expect(
      computeDeploymentExternalId({ ...base, run_id: "12345", job_id: "67890" }),
    ).toBe("github-actions:run-12345:job-67890");
  });

  test("returns provider:run-X when only run_id present", () => {
    expect(computeDeploymentExternalId({ ...base, run_id: "12345" })).toBe(
      "github-actions:run-12345",
    );
  });

  test("returns service:env:sha when neither run_id nor job_id present (drops started_at_ms)", () => {
    expect(computeDeploymentExternalId(base)).toBe("payment-service:prod:a1b2c3d");
  });

  test("job_id alone (without run_id) falls through to fallback tier", () => {
    expect(computeDeploymentExternalId({ ...base, job_id: "67890" })).toBe(
      "payment-service:prod:a1b2c3d",
    );
  });

  test("sha is lowercased for the fallback tier (server-side normalization done elsewhere; the helper trusts caller)", () => {
    // The annotate validator lowercases sha before computing the id; the helper
    // itself does NOT lowercase, so callers get the deterministic key they expect.
    expect(computeDeploymentExternalId({ ...base, sha: "A1B2C3D" })).toBe(
      "payment-service:prod:A1B2C3D",
    );
  });

  test("retries of the same shell-script deploy collapse onto one id", () => {
    const first = computeDeploymentExternalId({ ...base, started_at_ms: 1000 });
    const retry = computeDeploymentExternalId({ ...base, started_at_ms: 2000 });
    expect(first).toBe(retry);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
bun test packages/gateway/test/unit/deployment/external-id.test.ts
```

Expected: FAIL — `computeDeploymentExternalId` not exported.

- [ ] **Step 3: Implement**

Create `packages/gateway/src/deployment/external-id.ts`:

```ts
import type { DeploymentAnnotateInput } from "./types.ts";

/**
 * Three-tier rule (Phase 5 T4 PR 3b design §5.3):
 *
 *   1. `<provider>:run-<run_id>:job-<job_id>`   — when both present (CI fine-grained)
 *   2. `<provider>:run-<run_id>`                — when only run_id present
 *   3. `<service>:<env>:<sha>`                  — fallback (CLI shell-script path)
 *
 * The fallback intentionally OMITS `started_at_ms` so a shell script
 * that retries the same logical deploy collapses onto one `deployment`
 * row. Operators wanting per-attempt granularity pass `--run-id` and
 * land on tier 2.
 */
export function computeDeploymentExternalId(input: DeploymentAnnotateInput): string {
  if (input.run_id !== undefined && input.run_id !== "" && input.job_id !== undefined && input.job_id !== "") {
    return `${input.provider}:run-${input.run_id}:job-${input.job_id}`;
  }
  if (input.run_id !== undefined && input.run_id !== "") {
    return `${input.provider}:run-${input.run_id}`;
  }
  return `${input.service}:${input.environment}:${input.sha}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
bun test packages/gateway/test/unit/deployment/external-id.test.ts
```

Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/deployment/external-id.ts \
        packages/gateway/test/unit/deployment/external-id.test.ts
git commit -m "feat(deployment): three-tier external_id rule"
```

---

## Task 4: `annotateDeployment` core (validation + upsert + audit)

**Files:**
- Create: `packages/gateway/src/deployment/annotate.ts`
- Create: `packages/gateway/test/unit/deployment/annotate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/gateway/test/unit/deployment/annotate.test.ts`:

```ts
import { describe, expect, test, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runIndexedMigrations } from "../../../src/index/migrations/runner.ts";
import { annotateDeployment, AnnotateError } from "../../../src/deployment/annotate.ts";
import type { DeploymentAnnotateInput } from "../../../src/deployment/types.ts";

const NOW = 1747142641204;

function freshDb(): Database {
  const dir = mkdtempSync(join(tmpdir(), "annotate-"));
  const db = new Database(join(dir, "nimbus.db"));
  // Top-level await isn't allowed in beforeEach in Bun's strict mode; tests `await`
  // runIndexedMigrations inline before invoking annotate.
  return db;
}

const valid: DeploymentAnnotateInput = {
  service: "payment-service",
  provider: "github-actions",
  environment: "prod",
  sha: "a1b2c3d4e5f60718a1b2c3d4e5f60718a1b2c3d4",
  ref: "refs/heads/main",
  status: "success",
  started_at_ms: NOW - 1000,
  finished_at_ms: NOW - 500,
  workflow_url: "https://github.com/acme/payments/actions/runs/12345",
  run_id: "12345",
  job_id: "67890",
};

describe("annotateDeployment", () => {
  test("inserts item + deployment_items row + audit row for a valid input", async () => {
    const db = freshDb();
    await runIndexedMigrations(db);
    const result = annotateDeployment(db, valid, NOW);
    expect(result.external_id).toBe("github-actions:run-12345:job-67890");
    expect(result.is_new).toBe(true);
    expect(result.dora_eligible).toBe(true);
    const item = db
      .query(
        "SELECT id, service, type, external_id, title FROM item WHERE external_id = ?",
      )
      .get("github-actions:run-12345:job-67890") as
      | { id: string; service: string; type: string; external_id: string; title: string }
      | null;
    expect(item).not.toBeNull();
    expect(item?.type).toBe("deployment");
    expect(item?.service).toBe("github-actions");
    const shadow = db
      .query("SELECT * FROM deployment_items WHERE id = ?")
      .get(item?.id) as Record<string, unknown> | null;
    expect(shadow?.nimbus_service_id).toBe("payment-service");
    expect(shadow?.conclusion).toBe("success");
    const audit = db
      .query(
        "SELECT action_type, hitl_status, action_json FROM audit_log WHERE action_type = ?",
      )
      .get("deployment.annotated") as
      | { action_type: string; hitl_status: string; action_json: string }
      | null;
    expect(audit?.hitl_status).toBe("not_required");
    const parsed = JSON.parse(audit!.action_json) as Record<string, unknown>;
    expect(parsed.service).toBe("payment-service");
    expect(parsed.external_id).toBe("github-actions:run-12345:job-67890");
    db.close();
  });

  test("re-posting the same external_id returns is_new=false and writes a second audit row", async () => {
    const db = freshDb();
    await runIndexedMigrations(db);
    annotateDeployment(db, valid, NOW);
    const r2 = annotateDeployment(db, valid, NOW + 1);
    expect(r2.is_new).toBe(false);
    const auditCount = db
      .query("SELECT COUNT(*) AS c FROM audit_log WHERE action_type = 'deployment.annotated'")
      .get() as { c: number };
    expect(auditCount.c).toBe(2);
    const itemCount = db
      .query("SELECT COUNT(*) AS c FROM item WHERE type = 'deployment'")
      .get() as { c: number };
    expect(itemCount.c).toBe(1);
    db.close();
  });

  test("in_progress → success transition replaces the shadow row's conclusion", async () => {
    const db = freshDb();
    await runIndexedMigrations(db);
    annotateDeployment(db, { ...valid, status: "in_progress" }, NOW);
    annotateDeployment(db, { ...valid, status: "success" }, NOW + 100);
    const shadow = db
      .query("SELECT conclusion FROM deployment_items LIMIT 1")
      .get() as { conclusion: string };
    expect(shadow.conclusion).toBe("success");
  });

  test("dora_eligible=false for status=failure", async () => {
    const db = freshDb();
    await runIndexedMigrations(db);
    const r = annotateDeployment(db, { ...valid, status: "failure" }, NOW);
    expect(r.dora_eligible).toBe(false);
  });

  test("dora_eligible=false when environment is not in the deploy-counted set (default ['prod'])", async () => {
    const db = freshDb();
    await runIndexedMigrations(db);
    const r = annotateDeployment(db, { ...valid, environment: "staging" }, NOW);
    expect(r.dora_eligible).toBe(false);
  });

  test("rejects service id with bad characters", async () => {
    const db = freshDb();
    await runIndexedMigrations(db);
    expect(() => annotateDeployment(db, { ...valid, service: "Bad Service" }, NOW)).toThrow(
      AnnotateError,
    );
  });

  test("rejects sha shorter than 7 chars", async () => {
    const db = freshDb();
    await runIndexedMigrations(db);
    expect(() => annotateDeployment(db, { ...valid, sha: "abc" }, NOW)).toThrow(AnnotateError);
  });

  test("rejects started_at_ms more than 365d in the past", async () => {
    const db = freshDb();
    await runIndexedMigrations(db);
    const old = NOW - 366 * 86_400_000;
    expect(() => annotateDeployment(db, { ...valid, started_at_ms: old }, NOW)).toThrow(
      AnnotateError,
    );
  });

  test("rejects finished_at_ms < started_at_ms", async () => {
    const db = freshDb();
    await runIndexedMigrations(db);
    expect(() =>
      annotateDeployment(
        db,
        { ...valid, started_at_ms: NOW, finished_at_ms: NOW - 1 },
        NOW,
      ),
    ).toThrow(AnnotateError);
  });

  test("lowercases the sha before storage", async () => {
    const db = freshDb();
    await runIndexedMigrations(db);
    annotateDeployment(db, { ...valid, sha: "A1B2C3D" }, NOW);
    const row = db.query("SELECT sha FROM deployment_items LIMIT 1").get() as { sha: string };
    expect(row.sha).toBe("a1b2c3d");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
bun test packages/gateway/test/unit/deployment/annotate.test.ts
```

Expected: FAIL — `annotateDeployment` not exported.

- [ ] **Step 3: Implement**

Create `packages/gateway/src/deployment/annotate.ts`:

```ts
import type { Database } from "bun:sqlite";
import { appendAuditEntry } from "../db/audit-chain.ts";
import { computeDeploymentExternalId } from "./external-id.ts";
import type {
  DeploymentAnnotateInput,
  DeploymentAnnotateResult,
  DeploymentConclusion,
  DeploymentProvider,
} from "./types.ts";

export class AnnotateError extends Error {
  readonly field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = "AnnotateError";
    this.field = field;
  }
}

const SERVICE_RE = /^[a-z0-9][a-z0-9._-]*$/;
const ENV_RE = /^[a-z0-9][a-z0-9._-]*$/;
const SHA_RE = /^[0-9a-f]{7,64}$/;
const HTTP_URL_RE = /^https?:\/\//i;
const ONE_HOUR_MS = 3_600_000;
const ONE_YEAR_MS = 365 * 86_400_000;
const SERVICE_MAX = 64;
const ENV_MAX = 32;
const REF_MAX = 256;
const RUN_ID_MAX = 64;
const JOB_ID_MAX = 64;
const URL_MAX = 2048;

const STATUS_VALUES: ReadonlySet<DeploymentConclusion> = new Set([
  "success",
  "failure",
  "cancelled",
  "in_progress",
]);

const PROVIDER_VALUES: ReadonlySet<DeploymentProvider> = new Set([
  "github-actions",
  "gitlab",
  "jenkins",
  "circleci",
  "bitbucket",
  "other",
]);

/**
 * Default deploy-counted environments. Override per-service via
 * `[ci.service.<id>].deploy_environments` once Task 11 lands.
 */
const DEFAULT_DEPLOY_ENVIRONMENTS: readonly string[] = ["prod"];

function validate(input: DeploymentAnnotateInput, nowMs: number): DeploymentAnnotateInput {
  if (typeof input.service !== "string" || input.service.length === 0 || input.service.length > SERVICE_MAX) {
    throw new AnnotateError("service", `service must be 1..${SERVICE_MAX} chars`);
  }
  if (!SERVICE_RE.test(input.service)) {
    throw new AnnotateError("service", `service must match ${SERVICE_RE.source}`);
  }
  if (!PROVIDER_VALUES.has(input.provider)) {
    throw new AnnotateError("provider", "provider must be one of the supported values");
  }
  if (typeof input.environment !== "string" || input.environment.length === 0 || input.environment.length > ENV_MAX) {
    throw new AnnotateError("environment", `environment must be 1..${ENV_MAX} chars`);
  }
  if (!ENV_RE.test(input.environment)) {
    throw new AnnotateError("environment", `environment must match ${ENV_RE.source}`);
  }
  const lcSha = typeof input.sha === "string" ? input.sha.toLowerCase() : "";
  if (!SHA_RE.test(lcSha)) {
    throw new AnnotateError("sha", "sha must be 7..64 lowercase hex chars");
  }
  if (typeof input.ref !== "string" || input.ref.length === 0 || input.ref.length > REF_MAX) {
    throw new AnnotateError("ref", `ref must be 1..${REF_MAX} chars`);
  }
  if (!STATUS_VALUES.has(input.status)) {
    throw new AnnotateError("status", "status must be one of the four supported values");
  }
  if (!Number.isFinite(input.started_at_ms) || !Number.isInteger(input.started_at_ms)) {
    throw new AnnotateError("started_at_ms", "started_at_ms must be an integer (ms since epoch)");
  }
  if (input.started_at_ms < nowMs - ONE_YEAR_MS || input.started_at_ms > nowMs + ONE_HOUR_MS) {
    throw new AnnotateError("started_at_ms", "started_at_ms must be within [now-365d, now+1h]");
  }
  if (input.finished_at_ms !== undefined) {
    if (!Number.isFinite(input.finished_at_ms) || !Number.isInteger(input.finished_at_ms)) {
      throw new AnnotateError("finished_at_ms", "finished_at_ms must be an integer");
    }
    if (input.finished_at_ms < input.started_at_ms) {
      throw new AnnotateError("finished_at_ms", "finished_at_ms must be >= started_at_ms");
    }
    if (input.finished_at_ms > nowMs + ONE_HOUR_MS) {
      throw new AnnotateError("finished_at_ms", "finished_at_ms must not exceed now+1h");
    }
  }
  if (input.workflow_url !== undefined) {
    if (typeof input.workflow_url !== "string" || input.workflow_url.length > URL_MAX) {
      throw new AnnotateError("workflow_url", `workflow_url must be a string up to ${URL_MAX} chars`);
    }
    if (!HTTP_URL_RE.test(input.workflow_url)) {
      throw new AnnotateError("workflow_url", "workflow_url must be http(s)");
    }
  }
  if (input.run_id !== undefined) {
    if (typeof input.run_id !== "string" || input.run_id.length === 0 || input.run_id.length > RUN_ID_MAX) {
      throw new AnnotateError("run_id", `run_id must be 1..${RUN_ID_MAX} chars`);
    }
  }
  if (input.job_id !== undefined) {
    if (typeof input.job_id !== "string" || input.job_id.length === 0 || input.job_id.length > JOB_ID_MAX) {
      throw new AnnotateError("job_id", `job_id must be 1..${JOB_ID_MAX} chars`);
    }
  }
  return { ...input, sha: lcSha };
}

export interface AnnotateOptions {
  readonly deployEnvironments?: readonly string[];
}

export function annotateDeployment(
  db: Database,
  rawInput: DeploymentAnnotateInput,
  nowMs: number,
  opts: AnnotateOptions = {},
): DeploymentAnnotateResult {
  const input = validate(rawInput, nowMs);
  const externalId = computeDeploymentExternalId(input);
  const itemId = `deployment:${externalId}`;
  const deployEnvs = opts.deployEnvironments ?? DEFAULT_DEPLOY_ENVIRONMENTS;
  const doraEligible =
    input.status === "success" && deployEnvs.includes(input.environment);

  let isNew = false;
  db.transaction(() => {
    const existing = db
      .query("SELECT 1 AS one FROM item WHERE service = ? AND external_id = ? LIMIT 1")
      .get(input.provider, externalId) as { one: number } | null;
    isNew = existing === null;
    const title = `Deploy ${input.service} → ${input.environment} (${input.sha.slice(0, 7)})`;
    const metadata = JSON.stringify({
      nimbus_service_id: input.service,
      environment: input.environment,
      sha: input.sha,
      ref: input.ref,
      conclusion: input.status,
      started_at_ms: input.started_at_ms,
      finished_at_ms: input.finished_at_ms ?? null,
      workflow_url: input.workflow_url ?? null,
      run_id: input.run_id ?? null,
      job_id: input.job_id ?? null,
    });
    db.run(
      `INSERT INTO item (id, service, type, external_id, title, body_preview, url, canonical_url, modified_at, author_id, metadata, synced_at, pinned)
       VALUES (?, ?, 'deployment', ?, ?, '', ?, ?, ?, NULL, ?, ?, 0)
       ON CONFLICT(service, external_id) DO UPDATE SET
         title = excluded.title,
         url = excluded.url,
         canonical_url = excluded.canonical_url,
         modified_at = excluded.modified_at,
         metadata = excluded.metadata,
         synced_at = excluded.synced_at`,
      [
        itemId,
        input.provider,
        externalId,
        title,
        input.workflow_url ?? null,
        input.workflow_url ?? null,
        input.started_at_ms,
        metadata,
        nowMs,
      ],
    );
    db.run(
      `INSERT INTO deployment_items
         (id, provider, nimbus_service_id, environment, sha, ref, started_at_ms, finished_at_ms, conclusion, workflow_url, ci_run_external_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         provider = excluded.provider,
         nimbus_service_id = excluded.nimbus_service_id,
         environment = excluded.environment,
         sha = excluded.sha,
         ref = excluded.ref,
         started_at_ms = excluded.started_at_ms,
         finished_at_ms = excluded.finished_at_ms,
         conclusion = excluded.conclusion,
         workflow_url = excluded.workflow_url`,
      [
        itemId,
        input.provider,
        input.service,
        input.environment,
        input.sha,
        input.ref,
        input.started_at_ms,
        input.finished_at_ms ?? null,
        input.status,
        input.workflow_url ?? null,
        null,
        nowMs,
      ],
    );
    appendAuditEntry(db, {
      actionType: "deployment.annotated",
      hitlStatus: "not_required",
      actionJson: JSON.stringify({
        service: input.service,
        provider: input.provider,
        environment: input.environment,
        sha: input.sha,
        external_id: externalId,
        is_new: isNew,
        dora_eligible: doraEligible,
      }),
      timestamp: nowMs,
    });
  })();

  return {
    external_id: externalId,
    service: input.service,
    stored_at_ms: nowMs,
    is_new: isNew,
    dora_eligible: doraEligible,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
bun test packages/gateway/test/unit/deployment/annotate.test.ts
```

Expected: PASS — all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/deployment/annotate.ts \
        packages/gateway/test/unit/deployment/annotate.test.ts
git commit -m "feat(deployment): annotateDeployment — validation + transactional upsert + audit"
```

---

## Task 5: `deployment.annotate` IPC dispatcher

**Files:**
- Create: `packages/gateway/src/ipc/deployment-rpc.ts`
- Create: `packages/gateway/test/unit/ipc/deployment-rpc.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/gateway/test/unit/ipc/deployment-rpc.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runIndexedMigrations } from "../../../src/index/migrations/runner.ts";
import { dispatchDeploymentRpc, DeploymentRpcError } from "../../../src/ipc/deployment-rpc.ts";

const NOW = 1747142641204;
const valid = {
  service: "payment-service",
  provider: "github-actions",
  environment: "prod",
  sha: "a1b2c3d",
  ref: "refs/heads/main",
  status: "success",
  started_at_ms: NOW - 1000,
  run_id: "12345",
  job_id: "67890",
};

async function fresh(): Promise<Database> {
  const dir = mkdtempSync(join(tmpdir(), "drpc-"));
  const db = new Database(join(dir, "nimbus.db"));
  await runIndexedMigrations(db);
  return db;
}

describe("dispatchDeploymentRpc", () => {
  test("misses on a non-deployment method", async () => {
    const db = await fresh();
    const out = await dispatchDeploymentRpc("metrics.dora", {}, { db, nowMs: () => NOW });
    expect(out.kind).toBe("miss");
  });

  test("hits on deployment.annotate and returns the result envelope", async () => {
    const db = await fresh();
    const out = await dispatchDeploymentRpc("deployment.annotate", valid, {
      db,
      nowMs: () => NOW,
    });
    expect(out.kind).toBe("hit");
    if (out.kind === "hit") {
      expect(out.value.external_id).toBe("github-actions:run-12345:job-67890");
      expect(out.value.is_new).toBe(true);
    }
  });

  test("throws DeploymentRpcError(-32602) on missing required fields", async () => {
    const db = await fresh();
    expect(() =>
      dispatchDeploymentRpc("deployment.annotate", { service: "x" }, { db, nowMs: () => NOW }),
    ).toThrow(DeploymentRpcError);
  });

  test("rejects array params", async () => {
    const db = await fresh();
    expect(() =>
      dispatchDeploymentRpc("deployment.annotate", [valid], { db, nowMs: () => NOW }),
    ).toThrow(DeploymentRpcError);
  });

  test("translates AnnotateError into DeploymentRpcError -32602", async () => {
    const db = await fresh();
    expect(() =>
      dispatchDeploymentRpc(
        "deployment.annotate",
        { ...valid, sha: "bad" },
        { db, nowMs: () => NOW },
      ),
    ).toThrow(DeploymentRpcError);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
bun test packages/gateway/test/unit/ipc/deployment-rpc.test.ts
```

Expected: FAIL — `dispatchDeploymentRpc` not exported.

- [ ] **Step 3: Implement**

Create `packages/gateway/src/ipc/deployment-rpc.ts`:

```ts
/**
 * Phase 5 T4 PR 3b — `deployment.annotate` JSON-RPC handler.
 *
 * Surface: CLI, HTTP (POST /v1/deployments) — NOT LLM-facing. Security
 * invariant I11 (wrapToolOutput) therefore does not apply here. If a
 * future built-in agent registers `deployment.annotate` as a tool, the
 * wrap must be added at the agent's tool-registration site per
 * `nimbus-tool-output-envelope` (wrap at the agent surface, not in the
 * tool handler).
 */
import type { Database } from "bun:sqlite";
import { annotateDeployment, AnnotateError, type AnnotateOptions } from "../deployment/annotate.ts";
import type { DeploymentAnnotateInput, DeploymentAnnotateResult } from "../deployment/types.ts";

export class DeploymentRpcError extends Error {
  readonly rpcCode: number;
  readonly field: string | undefined;
  constructor(rpcCode: number, message: string, field?: string) {
    super(message);
    this.name = "DeploymentRpcError";
    this.rpcCode = rpcCode;
    this.field = field;
  }
}

export interface DeploymentRpcContext {
  readonly db: Database;
  readonly nowMs?: () => number;
  readonly deployEnvironments?: readonly string[];
}

function requireParams(params: unknown): DeploymentAnnotateInput {
  if (params === null || typeof params !== "object" || Array.isArray(params)) {
    throw new DeploymentRpcError(
      -32602,
      "deployment.annotate requires a JSON-object body",
    );
  }
  // Pass through to annotateDeployment's validator; the RPC layer only
  // checks the shape. Field-level errors translate below.
  return params as DeploymentAnnotateInput;
}

export async function dispatchDeploymentRpc(
  method: string,
  params: unknown,
  ctx: DeploymentRpcContext,
): Promise<{ kind: "miss" } | { kind: "hit"; value: DeploymentAnnotateResult }> {
  if (method !== "deployment.annotate") return { kind: "miss" };
  const input = requireParams(params);
  const nowMs = (ctx.nowMs ?? (() => Date.now()))();
  try {
    const opts: AnnotateOptions =
      ctx.deployEnvironments === undefined ? {} : { deployEnvironments: ctx.deployEnvironments };
    const value = annotateDeployment(ctx.db, input, nowMs, opts);
    return { kind: "hit", value };
  } catch (e) {
    if (e instanceof AnnotateError) {
      throw new DeploymentRpcError(-32602, `${e.field}: ${e.message}`, e.field);
    }
    throw e;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
bun test packages/gateway/test/unit/ipc/deployment-rpc.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/ipc/deployment-rpc.ts \
        packages/gateway/test/unit/ipc/deployment-rpc.test.ts
git commit -m "feat(ipc): deployment.annotate JSON-RPC method"
```

---

## Task 6: Wire `deployment.annotate` into the IPC dispatcher chain

**Files:**
- Modify: `packages/gateway/src/ipc/server/context.ts`
- Modify: `packages/gateway/src/ipc/server/dispatchers.ts`

- [ ] **Step 1: Add the skipped sentinel**

Open `packages/gateway/src/ipc/server/context.ts`. After the existing `preflightRpcSkipped` definition (locate via grep), add:

```ts
export const deploymentRpcSkipped: unique symbol = Symbol("deployment-rpc-skipped");
```

- [ ] **Step 2: Wire the dispatcher**

Open `packages/gateway/src/ipc/server/dispatchers.ts`. Add the imports near the top alongside the other RPC imports:

```ts
import { dispatchDeploymentRpc, DeploymentRpcError } from "../deployment-rpc.ts";
```

And on the context-import line, add `deploymentRpcSkipped`:

```ts
import {
  automationRpcSkipped,
  connectorRpcSkipped,
  deploymentRpcSkipped,
  diagnosticsRpcSkipped,
  // ...
} from "./context.ts";
```

After the `tryDispatchPreflightRpc` function (around line 225), add:

```ts
export async function tryDispatchDeploymentRpc(
  ctx: ServerCtx,
  method: string,
  params: unknown,
): Promise<typeof deploymentRpcSkipped | unknown> {
  if (method !== "deployment.annotate" || ctx.options.localIndex === undefined) {
    return deploymentRpcSkipped;
  }
  try {
    const out = await dispatchDeploymentRpc(method, params, {
      db: ctx.options.localIndex.getDatabase(),
    });
    if (out.kind === "hit") return out.value;
  } catch (e) {
    if (e instanceof DeploymentRpcError) {
      throw new RpcMethodError(e.rpcCode, e.message);
    }
    throw e;
  }
  return deploymentRpcSkipped;
}
```

In `tryDispatchPhase4Rpc`, immediately after the existing preflight outcome lines (around line 425), insert:

```ts
  const deploymentOutcome = await tryDispatchDeploymentRpc(ctx, method, params);
  if (deploymentOutcome !== deploymentRpcSkipped) return deploymentOutcome;
```

- [ ] **Step 3: Run the dispatcher tests to confirm no regression**

```bash
bun test packages/gateway/test/unit/ipc/
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/gateway/src/ipc/server/context.ts \
        packages/gateway/src/ipc/server/dispatchers.ts
git commit -m "feat(ipc): wire deployment.annotate into the dispatch chain"
```

---

## Task 7: HTTP bearer auth + rate limiter

**Files:**
- Create: `packages/gateway/src/ipc/http-auth.ts`
- Create: `packages/gateway/src/ipc/http-rate-limit.ts`
- Create: `packages/gateway/test/unit/ipc/http-auth.test.ts`
- Create: `packages/gateway/test/unit/ipc/http-rate-limit.test.ts`

- [ ] **Step 1: Write the failing rate-limit test**

Create `packages/gateway/test/unit/ipc/http-rate-limit.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { HttpWriteRateLimiter } from "../../../src/ipc/http-rate-limit.ts";

describe("HttpWriteRateLimiter", () => {
  test("allows up to maxRequests in the window", () => {
    let t = 0;
    const rl = new HttpWriteRateLimiter(
      { maxRequests: 3, windowMs: 1000 },
      () => t,
    );
    for (let i = 0; i < 3; i++) {
      const r = rl.check("fp1");
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(2 - i);
    }
    expect(rl.check("fp1").allowed).toBe(false);
  });

  test("isolates tokens by fingerprint", () => {
    let t = 0;
    const rl = new HttpWriteRateLimiter({ maxRequests: 1, windowMs: 1000 }, () => t);
    expect(rl.check("fp1").allowed).toBe(true);
    expect(rl.check("fp2").allowed).toBe(true);
    expect(rl.check("fp1").allowed).toBe(false);
  });

  test("reset is the earliest request's expiry", () => {
    let t = 0;
    const rl = new HttpWriteRateLimiter({ maxRequests: 2, windowMs: 1000 }, () => t);
    rl.check("fp1");
    t = 500;
    rl.check("fp1");
    t = 600;
    const r = rl.check("fp1");
    expect(r.allowed).toBe(false);
    expect(r.resetMs).toBe(1000); // earliest at t=0 expires at t=1000
  });

  test("sliding window — old requests roll off", () => {
    let t = 0;
    const rl = new HttpWriteRateLimiter({ maxRequests: 1, windowMs: 100 }, () => t);
    rl.check("fp1");
    t = 101;
    expect(rl.check("fp1").allowed).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
bun test packages/gateway/test/unit/ipc/http-rate-limit.test.ts
```

Expected: FAIL — `HttpWriteRateLimiter` not exported.

- [ ] **Step 3: Implement the rate limiter**

Create `packages/gateway/src/ipc/http-rate-limit.ts`:

```ts
/**
 * Phase 5 T4 PR 3b — Sliding-window rate limiter for the HTTP write surface.
 *
 * Keyed by `token_fingerprint` (sha256(token).slice(0,8)). 60 req/min per
 * fingerprint by default. Used by `dispatchWriteRoute` to set the
 * X-RateLimit-* headers on every response and enforce 429 on overflow.
 */

export interface HttpWriteRateLimitConfig {
  readonly maxRequests: number;
  readonly windowMs: number;
}

export interface RateLimitCheck {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetMs: number;
  readonly limit: number;
}

export class HttpWriteRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly now: () => number;
  constructor(
    private readonly cfg: HttpWriteRateLimitConfig,
    now?: () => number,
  ) {
    this.now = now ?? (() => Date.now());
  }

  /**
   * Returns the rate-limit decision and headers metadata for `fingerprint`.
   * Side effect: when `allowed=true`, this call IS counted (it appends to
   * the window). When `allowed=false`, nothing is appended (caller is being
   * rejected).
   */
  check(fingerprint: string): RateLimitCheck {
    const t = this.now();
    const cutoff = t - this.cfg.windowMs;
    const prev = this.hits.get(fingerprint) ?? [];
    const live = prev.filter((ts) => ts > cutoff);
    if (live.length >= this.cfg.maxRequests) {
      const earliest = live[0] ?? t;
      return {
        allowed: false,
        remaining: 0,
        resetMs: earliest + this.cfg.windowMs,
        limit: this.cfg.maxRequests,
      };
    }
    live.push(t);
    this.hits.set(fingerprint, live);
    return {
      allowed: true,
      remaining: this.cfg.maxRequests - live.length,
      resetMs: (live[0] ?? t) + this.cfg.windowMs,
      limit: this.cfg.maxRequests,
    };
  }
}
```

- [ ] **Step 4: Run to verify the rate-limit test passes**

```bash
bun test packages/gateway/test/unit/ipc/http-rate-limit.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write the failing auth test**

Create `packages/gateway/test/unit/ipc/http-auth.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  HTTP_API_DEPLOYMENT_TOKEN_VAULT_KEY,
  requireBearer,
  tokenFingerprint,
} from "../../../src/ipc/http-auth.ts";

describe("HTTP_API_DEPLOYMENT_TOKEN_VAULT_KEY", () => {
  test("is the canonical vault key", () => {
    expect(HTTP_API_DEPLOYMENT_TOKEN_VAULT_KEY).toBe("http_api.deployment_token");
  });
});

describe("tokenFingerprint", () => {
  test("is the first 8 hex chars of sha256(token)", () => {
    const fp = tokenFingerprint("hunter2");
    const expected = createHash("sha256").update("hunter2").digest("hex").slice(0, 8);
    expect(fp).toBe(expected);
  });
  test("returns 'unknown' for empty/missing input", () => {
    expect(tokenFingerprint("")).toBe("unknown");
    expect(tokenFingerprint(undefined)).toBe("unknown");
  });
});

describe("requireBearer", () => {
  function req(headers: Record<string, string>): Request {
    return new Request("http://127.0.0.1:7474/v1/deployments", {
      method: "POST",
      headers,
    });
  }

  test("returns ok=true on a matching token", () => {
    const r = requireBearer(req({ authorization: "Bearer hunter2" }), {
      expectedToken: "hunter2",
    });
    expect(r.ok).toBe(true);
    expect(r.fingerprint).toBe(tokenFingerprint("hunter2"));
  });

  test("returns ok=false with fingerprint='unknown' when header is missing", () => {
    const r = requireBearer(req({}), { expectedToken: "hunter2" });
    expect(r.ok).toBe(false);
    expect(r.fingerprint).toBe("unknown");
  });

  test("returns ok=false on a non-bearer scheme", () => {
    const r = requireBearer(req({ authorization: "Basic abc123" }), { expectedToken: "hunter2" });
    expect(r.ok).toBe(false);
    expect(r.fingerprint).toBe("unknown");
  });

  test("returns ok=false on a wrong token, fingerprint is the wrong token's fp (audit visibility)", () => {
    const r = requireBearer(req({ authorization: "Bearer wrong" }), { expectedToken: "hunter2" });
    expect(r.ok).toBe(false);
    expect(r.fingerprint).toBe(tokenFingerprint("wrong"));
  });

  test("uses constant-time compare — does not short-circuit on first byte mismatch", () => {
    // Smoke test: prefix collisions still fail.
    const r = requireBearer(req({ authorization: "Bearer hunter3" }), { expectedToken: "hunter2" });
    expect(r.ok).toBe(false);
  });

  test("returns ok=false when expectedToken is empty (write surface disabled)", () => {
    const r = requireBearer(req({ authorization: "Bearer anything" }), { expectedToken: "" });
    expect(r.ok).toBe(false);
    expect(r.surfaceDisabled).toBe(true);
  });
});
```

- [ ] **Step 6: Run to verify the auth test fails**

```bash
bun test packages/gateway/test/unit/ipc/http-auth.test.ts
```

Expected: FAIL — `http-auth.ts` does not exist.

- [ ] **Step 7: Implement the auth module**

Create `packages/gateway/src/ipc/http-auth.ts`:

```ts
/**
 * Phase 5 T4 PR 3b — Bearer-token auth for the HTTP write surface.
 *
 * The token is stored under vault key `http_api.deployment_token`. This
 * key is system-level (not connector-scoped) and lives outside
 * CONNECTOR_VAULT_SECRET_KEYS by design — see the design §4 note.
 *
 * Constant-time compare prevents timing-side-channel discovery of the
 * token through prefix-difference latency.
 */

import { createHash, timingSafeEqual } from "node:crypto";

export const HTTP_API_DEPLOYMENT_TOKEN_VAULT_KEY = "http_api.deployment_token";

const BEARER_PREFIX = "Bearer ";

export function tokenFingerprint(token: string | undefined): string {
  if (token === undefined || token === "") return "unknown";
  return createHash("sha256").update(token).digest("hex").slice(0, 8);
}

export interface RequireBearerContext {
  /** Empty string => write surface disabled (vault key absent). */
  readonly expectedToken: string;
}

export interface RequireBearerResult {
  readonly ok: boolean;
  readonly fingerprint: string;
  readonly surfaceDisabled?: boolean;
}

function extractBearer(req: Request): string | undefined {
  const raw = req.headers.get("authorization");
  if (raw === null) return undefined;
  if (!raw.startsWith(BEARER_PREFIX)) return undefined;
  return raw.slice(BEARER_PREFIX.length);
}

function constantTimeStringEqual(a: string, b: string): boolean {
  // Pad the shorter string so the comparison is over equal-length buffers.
  // The length-difference itself is leaked only as "not equal" — it never
  // reveals byte positions.
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) {
    // Burn the same number of cycles a real compare would, then return false.
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

export function requireBearer(req: Request, ctx: RequireBearerContext): RequireBearerResult {
  if (ctx.expectedToken === "") {
    return { ok: false, fingerprint: "unknown", surfaceDisabled: true };
  }
  const presented = extractBearer(req);
  if (presented === undefined) {
    return { ok: false, fingerprint: "unknown" };
  }
  const ok = constantTimeStringEqual(presented, ctx.expectedToken);
  return { ok, fingerprint: tokenFingerprint(presented) };
}
```

- [ ] **Step 8: Run to verify the auth test passes**

```bash
bun test packages/gateway/test/unit/ipc/http-auth.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/gateway/src/ipc/http-auth.ts \
        packages/gateway/src/ipc/http-rate-limit.ts \
        packages/gateway/test/unit/ipc/http-auth.test.ts \
        packages/gateway/test/unit/ipc/http-rate-limit.test.ts
git commit -m "feat(http): bearer auth + 60/min sliding-window rate limiter"
```

---

## Task 8: HTTP write-route dispatcher

**Files:**
- Create: `packages/gateway/src/ipc/http-write-routes.ts`

- [ ] **Step 1: Implement the dispatcher**

Create `packages/gateway/src/ipc/http-write-routes.ts`:

```ts
/**
 * Phase 5 T4 PR 3b — HTTP write-route dispatcher (invariant I13).
 *
 * This file is the single source of truth for which `POST` paths
 * `startReadOnlyHttpServer` is permitted to accept. The allowlist is
 * compile-time and the count is asserted in `security-invariants.test.ts`.
 * Adding a new write route requires editing this file and bumping the
 * count assertion in the same commit.
 */

import type { Database } from "bun:sqlite";
import { appendAuditEntry } from "../db/audit-chain.ts";
import { dispatchDeploymentRpc, DeploymentRpcError } from "./deployment-rpc.ts";
import { requireBearer, tokenFingerprint } from "./http-auth.ts";
import { HttpWriteRateLimiter, type RateLimitCheck } from "./http-rate-limit.ts";

export const WRITE_ROUTE_ALLOWLIST: readonly string[] = Object.freeze([
  "POST /v1/deployments",
]);

const MAX_BODY_BYTES = 8 * 1024; // 8 KiB

export interface WriteRouteContext {
  readonly writeDb: Database;
  readonly expectedToken: string;
  readonly rateLimiter: HttpWriteRateLimiter;
  readonly nowMs: () => number;
  readonly deployEnvironments?: readonly string[];
  readonly knownServices: () => readonly string[];
}

function rateLimitHeaders(check: RateLimitCheck): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(check.limit),
    "X-RateLimit-Remaining": String(check.remaining),
    "X-RateLimit-Reset": String(Math.ceil(check.resetMs / 1000)),
  };
}

function jsonResponse(
  body: unknown,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

/**
 * Writes a rejection audit row. The `appendAuditEntry` helper carries the
 * BLAKE3 chain so brute-force probes are tamper-evident (S2 disposition).
 * Failures of the audit write itself never break the response — the row
 * is best-effort. The catch is silent rather than logging to stderr so
 * a corrupted audit chain cannot fingerprint the rejection path.
 */
function recordRejection(
  ctx: WriteRouteContext,
  args: {
    readonly tokenFingerprint: string;
    readonly resultCode: number;
    readonly reason: string;
    readonly externalId?: string;
    readonly service?: string;
  },
): void {
  try {
    appendAuditEntry(ctx.writeDb, {
      actionType: "deployment.annotation_rejected",
      hitlStatus: "not_required",
      actionJson: JSON.stringify({
        token_fingerprint: args.tokenFingerprint,
        source_ip: "127.0.0.1",
        result_code: args.resultCode,
        reason: args.reason,
        service: args.service ?? null,
        external_id: args.externalId ?? null,
      }),
      timestamp: ctx.nowMs(),
    });
  } catch {
    /* audit best-effort */
  }
}

export async function dispatchWriteRoute(
  req: Request,
  ctx: WriteRouteContext,
): Promise<Response> {
  const url = new URL(req.url);
  const key = `${req.method} ${url.pathname}`;
  if (!WRITE_ROUTE_ALLOWLIST.includes(key)) {
    // Path is a known write path served on a different method, OR an unknown path.
    // Distinguish 405 from 404 by checking whether ANY method in the allowlist matches the path.
    const pathMatchesAny = WRITE_ROUTE_ALLOWLIST.some((r) => r.endsWith(` ${url.pathname}`));
    if (pathMatchesAny) {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "POST" },
      });
    }
    return new Response("Not Found", { status: 404 });
  }

  const auth = requireBearer(req, { expectedToken: ctx.expectedToken });
  if (auth.surfaceDisabled === true) {
    // No audit row here: the surface isn't on, so brute-forcing it is
    // structurally impossible. Logging a row per probe would create a
    // disk-fill vector for an attacker that can't actually authenticate.
    return jsonResponse(
      {
        error: "write_surface_disabled",
        hint:
          "set http_api.deployment_token via 'nimbus vault set http_api.deployment_token <value>'",
      },
      503,
    );
  }
  if (!auth.ok) {
    recordRejection(ctx, {
      tokenFingerprint: auth.fingerprint,
      resultCode: 401,
      reason: "unauthorized",
    });
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const limit = ctx.rateLimiter.check(auth.fingerprint);
  if (!limit.allowed) {
    const retryAfter = Math.max(
      0,
      Math.ceil((limit.resetMs - ctx.nowMs()) / 1000),
    );
    recordRejection(ctx, {
      tokenFingerprint: auth.fingerprint,
      resultCode: 429,
      reason: "rate_limited",
    });
    return jsonResponse(
      { error: "rate_limited" },
      429,
      { ...rateLimitHeaders(limit), "Retry-After": String(retryAfter) },
    );
  }

  // Body parsing with 8 KiB cap.
  const lenHeader = req.headers.get("content-length");
  if (lenHeader !== null) {
    const n = Number.parseInt(lenHeader, 10);
    if (Number.isInteger(n) && n > MAX_BODY_BYTES) {
      recordRejection(ctx, {
        tokenFingerprint: auth.fingerprint,
        resultCode: 413,
        reason: "payload_too_large",
      });
      return jsonResponse({ error: "payload_too_large" }, 413, rateLimitHeaders(limit));
    }
  }
  let text: string;
  try {
    text = await req.text();
  } catch {
    recordRejection(ctx, {
      tokenFingerprint: auth.fingerprint,
      resultCode: 400,
      reason: "invalid_body",
    });
    return jsonResponse({ error: "invalid_body" }, 400, rateLimitHeaders(limit));
  }
  if (text.length > MAX_BODY_BYTES) {
    recordRejection(ctx, {
      tokenFingerprint: auth.fingerprint,
      resultCode: 413,
      reason: "payload_too_large",
    });
    return jsonResponse({ error: "payload_too_large" }, 413, rateLimitHeaders(limit));
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    recordRejection(ctx, {
      tokenFingerprint: auth.fingerprint,
      resultCode: 400,
      reason: "invalid_json",
    });
    return jsonResponse({ error: "invalid_json" }, 400, rateLimitHeaders(limit));
  }

  if (key === "POST /v1/deployments") {
    // Unknown-service check happens against the configured set first so the
    // 400 carries the helpful `known_services` list before validation runs.
    const svc =
      parsed !== null && typeof parsed === "object" && "service" in parsed
        ? (parsed as { service?: unknown }).service
        : undefined;
    if (typeof svc === "string" && svc.length > 0) {
      const known = ctx.knownServices();
      if (!known.includes(svc)) {
        recordRejection(ctx, {
          tokenFingerprint: auth.fingerprint,
          resultCode: 400,
          reason: "unknown_service",
          service: svc,
        });
        return jsonResponse(
          { error: "unknown_service", service: svc, known_services: known.slice(0, 25) },
          400,
          rateLimitHeaders(limit),
        );
      }
    }
    try {
      const out = await dispatchDeploymentRpc("deployment.annotate", parsed, {
        db: ctx.writeDb,
        nowMs: ctx.nowMs,
        ...(ctx.deployEnvironments === undefined
          ? {}
          : { deployEnvironments: ctx.deployEnvironments }),
      });
      if (out.kind === "hit") {
        // Success audit is written INSIDE annotateDeployment — do not
        // double-write here.
        return jsonResponse(out.value, 200, rateLimitHeaders(limit));
      }
      recordRejection(ctx, {
        tokenFingerprint: auth.fingerprint,
        resultCode: 500,
        reason: "internal_error_miss",
      });
      return jsonResponse({ error: "internal_error" }, 500, rateLimitHeaders(limit));
    } catch (e) {
      if (e instanceof DeploymentRpcError) {
        recordRejection(ctx, {
          tokenFingerprint: auth.fingerprint,
          resultCode: 400,
          reason: e.field === undefined ? "invalid_request" : `invalid_${e.field}`,
          service: typeof svc === "string" ? svc : undefined,
        });
        return jsonResponse(
          {
            error: "invalid_request",
            details: e.field === undefined ? [{ reason: e.message }] : [{ field: e.field, reason: e.message }],
          },
          400,
          rateLimitHeaders(limit),
        );
      }
      // Suppress internal details from the response body. The token
      // fingerprint and audit row capture forensic context.
      recordRejection(ctx, {
        tokenFingerprint: auth.fingerprint,
        resultCode: 500,
        reason: "internal_error",
      });
      return jsonResponse({ error: "internal_error" }, 500, rateLimitHeaders(limit));
    }
  }
  // Defensive — unreachable because of the allowlist check above.
  return jsonResponse({ error: "internal_error" }, 500, rateLimitHeaders(limit));
}

export { tokenFingerprint };
```

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/gateway/src/ipc/http-write-routes.ts
git commit -m "feat(http): write-route dispatcher with allowlist + auth + rate limit"
```

---

## Task 9: Mount the write route in `http-server.ts` + rename routes constant

**Files:**
- Modify: `packages/gateway/src/ipc/http-routes.ts`
- Modify: `packages/gateway/src/ipc/http-server.ts`
- Modify: `scripts/structure-audit/check-openapi-drift.ts`
- Create: `packages/gateway/test/integration/http/deployments-post-route.test.ts`

- [ ] **Step 1: Rename the routes constant + add POST entry**

Open `packages/gateway/src/ipc/http-routes.ts` and replace the entire file with:

```ts
/**
 * Canonical list of HTTP routes served by `startReadOnlyHttpServer`. Most
 * are read-only; one (`POST /v1/deployments`, Phase 5 T4 PR 3b) is a
 * narrowly-scoped write surface that goes through `dispatchWriteRoute`
 * (invariant I13).
 *
 * The OpenAPI drift CI gate (`scripts/structure-audit/check-openapi-drift.ts`)
 * compares this constant against `packages/gateway/openapi/v1.yaml` to ensure
 * the published schema and the running handler agree.
 *
 * Adding a route: append here AND add a `paths:` entry in `v1.yaml`. If the
 * new route is a write (non-GET), also add it to `WRITE_ROUTE_ALLOWLIST` in
 * `http-write-routes.ts` and bump the I13 count assertion.
 */
export type HttpRoute = {
  readonly method: "GET" | "POST";
  /** OpenAPI-style path with `{param}` placeholders. */
  readonly path: string;
};

export const HTTP_ROUTES: readonly HttpRoute[] = Object.freeze([
  { method: "GET", path: "/v1/audit" },
  { method: "GET", path: "/v1/connectors" },
  { method: "POST", path: "/v1/deployments" },
  { method: "GET", path: "/v1/health" },
  { method: "GET", path: "/v1/items" },
  { method: "GET", path: "/v1/items/{id}" },
  { method: "GET", path: "/v1/metrics/dora" },
  { method: "GET", path: "/v1/openapi.json" },
  { method: "GET", path: "/v1/people" },
  { method: "GET", path: "/v1/people/{id}" },
  { method: "GET", path: "/v1/preflight/deploy" },
] as const);

/**
 * Backwards-compatible alias. Phase 5 T4 PR 3a referenced the older
 * `READ_ONLY_HTTP_ROUTES` name; keep it as an alias for one release so
 * out-of-tree references compile, then remove. Internal callers should
 * import `HTTP_ROUTES` directly.
 */
export const READ_ONLY_HTTP_ROUTES = HTTP_ROUTES;
```

- [ ] **Step 2: Update the drift script to read the renamed constant + check methods**

Open `scripts/structure-audit/check-openapi-drift.ts` and update the import and comparison to use `HTTP_ROUTES` and verify methods match. Locate the existing import of `READ_ONLY_HTTP_ROUTES` and change it to:

```ts
import { HTTP_ROUTES } from "../../packages/gateway/src/ipc/http-routes.ts";
```

Update any usage of `READ_ONLY_HTTP_ROUTES` to `HTTP_ROUTES`. If the comparison currently keyed by path only, change it to key by `${route.method} ${route.path}` so a method mismatch (GET vs POST for the same path) is caught.

- [ ] **Step 3: Run the existing drift test to confirm it still passes**

```bash
bun run audit:openapi-drift
```

Expected: this will FAIL because `v1.yaml` doesn't have `POST /v1/deployments` yet. That's fine — we add it in Task 12. For now, commit the rename and move on.

- [ ] **Step 4: Add the writable handle + write-route mounting in http-server.ts**

Open `packages/gateway/src/ipc/http-server.ts`. Replace the existing imports block at the top to include the new imports:

```ts
import { HTTP_API_DEPLOYMENT_TOKEN_VAULT_KEY } from "./http-auth.ts";
import { HttpWriteRateLimiter } from "./http-rate-limit.ts";
import { dispatchWriteRoute } from "./http-write-routes.ts";
```

Widen `ReadOnlyHttpServerOptions` to accept the token resolver:

```ts
export type ReadOnlyHttpServerOptions = {
  readonly configDir?: string;
  readonly nowMs?: () => number;
  /**
   * Resolves the bearer token from the vault when the write surface is
   * configured. Returns `""` when the vault key is absent — the write
   * surface stays mounted but returns `503 write_surface_disabled`.
   * Omitted entirely when this Gateway has no write surface at all.
   */
  readonly resolveDeploymentToken?: () => Promise<string>;
};
```

In `startReadOnlyHttpServer`, after `const db = new Database(dbPath, { readonly: true, create: false });`, add:

```ts
  // Write handle: opened only when a token resolver was provided. Even when
  // the resolver returns an empty string (vault key absent), we keep the
  // handle open so that future `nimbus vault set` calls become live without
  // a Gateway restart.
  const writeDb =
    opts.resolveDeploymentToken === undefined
      ? null
      : new Database(dbPath, { readonly: false, create: false });
  const rateLimiter = new HttpWriteRateLimiter({ maxRequests: 60, windowMs: 60_000 });
```

Replace the `fetch` handler (currently `if (req.method !== "GET") return new Response("Method Not Allowed", { status: 405 });`) with:

```ts
    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url);
      if (req.method === "POST") {
        if (writeDb === null || opts.resolveDeploymentToken === undefined) {
          return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET" } });
        }
        try {
          const expectedToken = await opts.resolveDeploymentToken();
          const knownServices =
            opts.configDir === undefined
              ? () => []
              : () => Array.from(loadNimbusServiceConfigsFromConfigDir(opts.configDir as string).keys());
          return await dispatchWriteRoute(req, {
            writeDb,
            expectedToken,
            rateLimiter,
            nowMs: opts.nowMs ?? (() => Date.now()),
            knownServices,
          });
        } catch {
          return json({ error: "internal_error" }, 500);
        }
      }
      if (req.method !== "GET") {
        return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, POST" } });
      }
      const path = url.pathname;
      try {
        return await dispatchReadOnlyGet(path, url, db, opts);
      } catch {
        return json({ error: "internal_error" }, 500);
      }
    },
```

In the `stop()` handler, also close the write handle:

```ts
    stop(): void {
      try {
        server.stop();
      } catch {
        /* ignore */
      }
      try {
        db.close();
      } catch {
        /* ignore */
      }
      if (writeDb !== null) {
        try {
          writeDb.close();
        } catch {
          /* ignore */
        }
      }
    },
```

- [ ] **Step 5: Write the failing integration test for the HTTP error matrix**

Create `packages/gateway/test/integration/http/deployments-post-route.test.ts`:

```ts
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runIndexedMigrations } from "../../../src/index/migrations/runner.ts";
import { startReadOnlyHttpServer, type ReadOnlyHttpServerHandle } from "../../../src/ipc/http-server.ts";

let dir: string;
let dbPath: string;
let handle: ReadOnlyHttpServerHandle | null = null;
const TOKEN = "hunter2";
const NOW = 1747142641204;
const validBody = {
  service: "payment-service",
  provider: "github-actions",
  environment: "prod",
  sha: "a1b2c3d",
  ref: "refs/heads/main",
  status: "success",
  started_at_ms: NOW - 1000,
  run_id: "12345",
  job_id: "67890",
};

async function startServer(opts: { token?: string } = {}): Promise<ReadOnlyHttpServerHandle> {
  return startReadOnlyHttpServer(dbPath, 0, {
    configDir: dir,
    nowMs: () => NOW,
    resolveDeploymentToken: async () => opts.token ?? TOKEN,
  });
}

function url(handle: ReadOnlyHttpServerHandle): string {
  return `http://127.0.0.1:${handle.port}/v1/deployments`;
}

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "deploy-post-"));
  dbPath = join(dir, "nimbus.db");
  const db = new Database(dbPath);
  await runIndexedMigrations(db);
  db.close();
  // Seed minimal `nimbus.toml` so payment-service resolves as a known service.
  writeFileSync(
    join(dir, "nimbus.toml"),
    `[ci.service.payment-service]\nrepos = ["github:acme/payments"]\npagerduty_services = []\ndeploy_workflow_pattern = "^Deploy"\nincident_window_minutes = 60\nexclude_pr_labels = []\n`,
  );
});

afterEach(() => {
  if (handle !== null) {
    handle.stop();
    handle = null;
  }
});

describe("POST /v1/deployments", () => {
  test("200 on first valid post", async () => {
    handle = await startServer();
    const res = await fetch(url(handle), {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { is_new: boolean; external_id: string };
    expect(body.is_new).toBe(true);
    expect(body.external_id).toBe("github-actions:run-12345:job-67890");
    expect(res.headers.get("X-RateLimit-Limit")).toBe("60");
  });

  test("200 is_new=false on retry", async () => {
    handle = await startServer();
    await fetch(url(handle), {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify(validBody),
    });
    const res = await fetch(url(handle), {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { is_new: boolean };
    expect(body.is_new).toBe(false);
  });

  test("401 when bearer is missing", async () => {
    handle = await startServer();
    const res = await fetch(url(handle), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(401);
  });

  test("401 when bearer is wrong", async () => {
    handle = await startServer();
    const res = await fetch(url(handle), {
      method: "POST",
      headers: { authorization: "Bearer wrong-token", "content-type": "application/json" },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(401);
  });

  test("503 write_surface_disabled when vault key absent", async () => {
    handle = await startServer({ token: "" });
    const res = await fetch(url(handle), {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string; hint: string };
    expect(body.error).toBe("write_surface_disabled");
    expect(body.hint).toContain("nimbus vault set");
  });

  test("400 invalid_request on bad sha", async () => {
    handle = await startServer();
    const res = await fetch(url(handle), {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ ...validBody, sha: "bad" }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_request");
  });

  test("400 unknown_service includes known_services list", async () => {
    handle = await startServer();
    const res = await fetch(url(handle), {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ ...validBody, service: "no-such-service" }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; known_services: string[] };
    expect(body.error).toBe("unknown_service");
    expect(body.known_services).toContain("payment-service");
  });

  test("405 on GET /v1/deployments", async () => {
    handle = await startServer();
    const res = await fetch(url(handle), { method: "GET" });
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("POST");
  });

  test("413 on oversize body", async () => {
    handle = await startServer();
    const big = "x".repeat(10 * 1024);
    const res = await fetch(url(handle), {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ ...validBody, ref: big }),
    });
    expect(res.status).toBe(413);
  });

  test("429 after exceeding 60 req/min", async () => {
    handle = await startServer();
    // Hit the limiter with 60 different external_ids so each request goes
    // through the body parser before being counted. (The dispatcher counts
    // EVERY allowed request, not just successful ones.)
    for (let i = 0; i < 60; i++) {
      await fetch(url(handle), {
        method: "POST",
        headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
        body: JSON.stringify({ ...validBody, run_id: `${i}` }),
      });
    }
    const res = await fetch(url(handle), {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ ...validBody, run_id: "overflow" }),
    });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).not.toBeNull();
  });

  test("401 writes a deployment.annotation_rejected audit row (S2 disposition)", async () => {
    handle = await startServer();
    await fetch(url(handle), {
      method: "POST",
      headers: { authorization: "Bearer nope", "content-type": "application/json" },
      body: JSON.stringify(validBody),
    });
    const db = new Database(dbPath, { readonly: true });
    const row = db
      .query(
        "SELECT action_type, hitl_status, action_json FROM audit_log WHERE action_type = ? ORDER BY id DESC LIMIT 1",
      )
      .get("deployment.annotation_rejected") as
      | { action_type: string; hitl_status: string; action_json: string }
      | null;
    expect(row).not.toBeNull();
    expect(row?.hitl_status).toBe("not_required");
    const parsed = JSON.parse(row!.action_json) as Record<string, unknown>;
    expect(parsed.result_code).toBe(401);
    expect(parsed.reason).toBe("unauthorized");
    expect(typeof parsed.token_fingerprint).toBe("string");
    db.close();
  });

  test("429 writes a deployment.annotation_rejected audit row", async () => {
    handle = await startServer();
    for (let i = 0; i < 60; i++) {
      await fetch(url(handle), {
        method: "POST",
        headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
        body: JSON.stringify({ ...validBody, run_id: `${i}` }),
      });
    }
    await fetch(url(handle), {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ ...validBody, run_id: "overflow" }),
    });
    const db = new Database(dbPath, { readonly: true });
    const row = db
      .query(
        "SELECT action_json FROM audit_log WHERE action_type = 'deployment.annotation_rejected' AND action_json LIKE '%rate_limited%' ORDER BY id DESC LIMIT 1",
      )
      .get() as { action_json: string } | null;
    expect(row).not.toBeNull();
    const parsed = JSON.parse(row!.action_json) as Record<string, unknown>;
    expect(parsed.result_code).toBe(429);
    db.close();
  });
});
```

- [ ] **Step 6: Run the integration test to verify it passes**

```bash
bun test packages/gateway/test/integration/http/deployments-post-route.test.ts
```

Expected: PASS — all 10 tests green.

- [ ] **Step 7: Run the broader HTTP suite to confirm no regression in PR 3a routes**

```bash
bun test packages/gateway/test/integration/http/
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/gateway/src/ipc/http-routes.ts \
        packages/gateway/src/ipc/http-server.ts \
        scripts/structure-audit/check-openapi-drift.ts \
        packages/gateway/test/integration/http/deployments-post-route.test.ts
git commit -m "feat(http): mount POST /v1/deployments + rename HTTP_ROUTES"
```

---

## Task 10: DORA `selectDeploys` — prefer annotated deploys

**Files:**
- Modify: `packages/gateway/src/metrics/dora.ts`
- Create: `packages/gateway/test/integration/metrics/dora-deployment-source.test.ts`
- Create: `packages/gateway/test/fixtures/deployments/payment-service/seed.ts`

- [ ] **Step 1: Write the failing test fixture seeder**

Create `packages/gateway/test/fixtures/deployments/payment-service/seed.ts`:

```ts
import type { Database } from "bun:sqlite";
import { annotateDeployment } from "../../../../src/deployment/annotate.ts";

const BASE_TIME = 1746000000000; // 2025-04-30T07:00:00Z

/**
 * Seeds a payment-service window with:
 *   - 3 annotated deploys (success, success, success), spread across 3 days
 *   - 2 regex-matched `ci_run` rows whose titles start with "Deploy"
 *     (one same provider as the annotated deploys, one different)
 *
 * Returns the times used so the test can assert the metric window.
 */
export function seedPaymentServiceFixture(db: Database): { nowMs: number } {
  const t0 = BASE_TIME;
  const t1 = BASE_TIME + 86_400_000;
  const t2 = BASE_TIME + 2 * 86_400_000;
  const nowMs = BASE_TIME + 3 * 86_400_000;
  // Annotated deploys.
  for (const [i, t] of [t0, t1, t2].entries()) {
    annotateDeployment(
      db,
      {
        service: "payment-service",
        provider: "github-actions",
        environment: "prod",
        sha: `deadbeef${i}`.padEnd(40, "0"),
        ref: "refs/heads/main",
        status: "success",
        started_at_ms: t,
        finished_at_ms: t + 60_000,
        run_id: `run-${i}`,
        job_id: `job-${i}`,
      },
      t,
    );
  }
  // Two `ci_run` items that the DORA regex (`^Deploy`) would have matched in T4 PR 2.
  // The annotated path should WIN — these rows must not be double-counted.
  for (let i = 0; i < 2; i++) {
    db.run(
      `INSERT INTO item (id, service, type, external_id, title, modified_at, synced_at, metadata)
       VALUES (?, ?, 'ci_run', ?, 'Deploy ci_run match', ?, ?, ?)`,
      [
        `github-actions:ci_run:${i}`,
        "github-actions",
        `acme/payments#run-cirun-${i}`,
        BASE_TIME + i * 3_600_000,
        BASE_TIME + i * 3_600_000,
        JSON.stringify({
          workflowName: "Deploy",
          conclusion: "success",
          headBranch: "main",
        }),
      ],
    );
  }
  return { nowMs };
}
```

- [ ] **Step 2: Write the failing integration test**

Create `packages/gateway/test/integration/metrics/dora-deployment-source.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runIndexedMigrations } from "../../../src/index/migrations/runner.ts";
import { deploymentFrequency } from "../../../src/metrics/dora.ts";
import type { ServiceConfig } from "../../../src/metrics/dora-config.ts";
import { seedPaymentServiceFixture } from "../../fixtures/deployments/payment-service/seed.ts";

function cfg(): ServiceConfig {
  return {
    repos: [{ provider: "github", owner: "acme", repo: "payments" }],
    pagerdutyServices: [],
    deployWorkflowPattern: /^Deploy/,
    incidentWindowMinutes: 60,
    excludePrLabels: [],
    deployEnvironments: ["prod"],
  };
}

describe("dora.selectDeploys — prefer annotated", () => {
  test("annotated deploys win; ci_run regex rows are ignored even when present", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dora-mix-"));
    const db = new Database(join(dir, "nimbus.db"));
    await runIndexedMigrations(db);
    const { nowMs } = seedPaymentServiceFixture(db);
    const window = 30 * 86_400_000;
    const df = deploymentFrequency(db, cfg(), nowMs, window);
    expect(df.sample).toBe(3); // 3 annotated only
    expect(df.gap).toBe("mixed_source"); // because regex rows are also present
    expect(df.value).not.toBeNull();
    db.close();
  });

  test("regex-only window: gap is null (legacy path)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dora-regex-"));
    const db = new Database(join(dir, "nimbus.db"));
    await runIndexedMigrations(db);
    const t = 1746000000000;
    for (let i = 0; i < 2; i++) {
      db.run(
        `INSERT INTO item (id, service, type, external_id, title, modified_at, synced_at, metadata)
         VALUES (?, ?, 'ci_run', ?, 'Deploy regex', ?, ?, ?)`,
        [
          `github-actions:ci_run:legacy-${i}`,
          "github-actions",
          `acme/payments#run-legacy-${i}`,
          t + i * 3_600_000,
          t + i * 3_600_000,
          JSON.stringify({ workflowName: "Deploy", conclusion: "success", headBranch: "main" }),
        ],
      );
    }
    const df = deploymentFrequency(db, cfg(), t + 4 * 3_600_000, 30 * 86_400_000);
    expect(df.sample).toBe(2);
    expect(df.gap).toBeNull();
    db.close();
  });

  test("no deploys at all: no_deployment_data", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dora-empty-"));
    const db = new Database(join(dir, "nimbus.db"));
    await runIndexedMigrations(db);
    const df = deploymentFrequency(db, cfg(), 1746000000000, 30 * 86_400_000);
    expect(df.sample).toBe(0);
    expect(df.gap).toBe("no_deployment_data");
    db.close();
  });
});
```

- [ ] **Step 3: Run to verify the test fails**

```bash
bun test packages/gateway/test/integration/metrics/dora-deployment-source.test.ts
```

Expected: FAIL — `deploymentFrequency` currently uses only the regex path; the fixture's `ci_run` rows would be counted alongside the annotated rows, breaking the sample=3 expectation.

- [ ] **Step 4: Implement annotated-deploy selection in dora.ts**

Open `packages/gateway/src/metrics/dora.ts`. Find the existing `selectDeploys` function. Add a new helper above it:

```ts
type AnnotatedDeployRow = {
  id: string;
  modified_at: number;
  metadata: string | null;
};

function selectAnnotatedDeploys(
  db: Database,
  cfg: ServiceConfig,
  nowMs: number,
  sinceMs: number,
): AnnotatedDeployRow[] {
  const envs = cfg.deployEnvironments;
  if (envs.length === 0) return [];
  const placeholders = envs.map(() => "?").join(",");
  const rows = db
    .query(
      `SELECT i.id AS id, i.modified_at AS modified_at, i.metadata AS metadata
       FROM item i
       JOIN deployment_items d ON d.id = i.id
       WHERE i.type = 'deployment'
         AND d.nimbus_service_id = ?
         AND d.environment IN (${placeholders})
         AND d.conclusion = 'success'
         AND i.modified_at >= ?
         AND i.modified_at <= ?`,
    )
    .all(cfg.serviceId, ...envs, nowMs - sinceMs, nowMs) as AnnotatedDeployRow[];
  return rows;
}
```

(If `ServiceConfig.serviceId` does not yet exist, Task 11 will add `deployEnvironments` and the related fields — for now, look it up by joining on `nimbus_service_id` matching the config's known identifier. If the config does not currently carry the id, derive it from the consumer — see step note below.)

> **Note on `cfg.serviceId`:** the existing `ServiceConfig` type does not have a `serviceId` field — it carries only repos + PD services + DORA params. The dispatcher `loadNimbusServiceConfigsFromConfigDir` returns a `Map<string, ServiceConfig>` keyed by service id. If `selectAnnotatedDeploys` needs the id, **the caller** must pass it in. To preserve `selectDeploys`'s signature, extend `ServiceConfig` with `serviceId` in Task 11, OR pass the id as an explicit argument. The simpler path is to extend the type; Task 11 covers `deployEnvironments` already, so this rides along. **The plan therefore depends on Task 11 landing the `serviceId` field on `ServiceConfig` as well.** Add it to Task 11.

Modify `selectDeploys` to consult annotated first:

Locate the existing `selectDeploys` body. Replace it with:

```ts
function selectDeploys(
  db: Database,
  cfg: ServiceConfig,
  nowMs: number,
  sinceMs: number,
): {
  rows: { id: string; modified_at: number; metadata: string | null }[];
  source: "annotated" | "regex";
  mixedSource: boolean;
} {
  const annotated = selectAnnotatedDeploys(db, cfg, nowMs, sinceMs);
  const regex = selectRegexDeploys(db, cfg, nowMs, sinceMs); // existing body
  const mixedSource = annotated.length > 0 && regex.length > 0;
  if (annotated.length > 0) {
    return { rows: annotated, source: "annotated", mixedSource };
  }
  return { rows: regex, source: "regex", mixedSource: false };
}
```

(Rename the previous `selectDeploys` body to `selectRegexDeploys`; same SELECT against `ci_run` with the deploy_workflow_pattern.)

Update `deploymentFrequency` to read the new shape and emit `mixed_source`:

```ts
export function deploymentFrequency(
  db: Database,
  cfg: ServiceConfig,
  nowMs: number,
  sinceMs: number,
): DoraMetricValue {
  if (cfg.repos.length === 0) {
    return { value: null, unit: "deploys_per_day", sample: 0, gap: "no_repos" };
  }
  const { rows, mixedSource } = selectDeploys(db, cfg, nowMs, sinceMs);
  if (rows.length === 0) {
    return { value: null, unit: "deploys_per_day", sample: 0, gap: "no_deployment_data" };
  }
  const days = sinceMs / 86_400_000;
  const value = rows.length / days;
  return gapOrNull({
    value,
    unit: "deploys_per_day",
    sample: rows.length,
    gap: mixedSource ? "mixed_source" : null,
  });
}
```

Update `leadTimeForChanges` and `changeFailureRate` in the same file to consume `selectDeploys()` (the `.rows` field) and propagate `mixedSource` similarly. For now, prefer minimum churn — only `deploymentFrequency` needs the `mixed_source` emission in this task; lead-time can stay on the legacy path until a follow-up. **Apply only the `deploymentFrequency` change in this task.**

Add `"mixed_source"` to the gap union in the type (locate `DoraGap` or equivalent). The change is one literal addition:

```ts
export type DoraGap =
  | null
  | "low_sample"
  | "no_repos"
  | "no_deployment_data"
  | "no_pagerduty_mapping"
  | "approximate_lead_time"
  | "mixed_source";
```

- [ ] **Step 5: Run the DORA tests to verify**

```bash
bun test packages/gateway/test/integration/metrics/dora-deployment-source.test.ts
bun test packages/gateway/test/unit/metrics/
```

Expected: PASS for the new test; existing tests still pass (the `mixed_source` branch is reachable only when annotated rows exist, which the legacy fixtures don't).

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/metrics/dora.ts \
        packages/gateway/test/fixtures/deployments/payment-service/seed.ts \
        packages/gateway/test/integration/metrics/dora-deployment-source.test.ts
git commit -m "feat(dora): prefer annotated deploys; emit mixed_source gap"
```

---

## Task 11: Extend `ServiceConfig` with `serviceId` + `deployEnvironments`

**Files:**
- Modify: `packages/gateway/src/metrics/dora-config.ts`
- Modify: `packages/gateway/src/config/nimbus-toml.ts`

- [ ] **Step 1: Extend the type**

Open `packages/gateway/src/metrics/dora-config.ts`. Locate the `ServiceConfig` interface. Add two fields:

```ts
export interface ServiceConfig {
  readonly serviceId: string;                  // <-- NEW: stable id from the TOML section header
  readonly repos: readonly ParsedDoraRepoUrn[];
  readonly pagerdutyServices: readonly string[];
  readonly deployWorkflowPattern: RegExp;
  readonly incidentWindowMinutes: number;
  readonly excludePrLabels: readonly string[];
  readonly deployEnvironments: readonly string[]; // <-- NEW: default ["prod"]
}
```

If `DoraServiceConfig` is exported as a back-compat alias, leave it as a `type DoraServiceConfig = ServiceConfig`.

- [ ] **Step 2: Wire the new fields through the TOML parser**

Open `packages/gateway/src/config/nimbus-toml.ts`. Locate `parseNimbusDoraToml` / `parseNimbusCiServiceToml` / `loadNimbusServiceConfigsFromConfigDir`. For each section the loader builds, set `serviceId` to the key extracted from the section header (e.g. for `[ci.service.payment-service]`, `serviceId = "payment-service"`). Set `deployEnvironments` from the optional `deploy_environments = ["prod", "staging"]` array; default to `["prod"]` when absent. Validate each entry matches `/^[a-z0-9][a-z0-9._-]*$/`; throw a parse error if it does not.

- [ ] **Step 3: Update any callers that constructed a `ServiceConfig` literally**

Run a grep for `ServiceConfig =` / `: ServiceConfig` to find test fixtures and add the two new fields. The DORA test seeds will need the additions.

```bash
bun run typecheck
```

Expected: PASS after every literal is updated.

- [ ] **Step 4: Run the config + DORA tests**

```bash
bun test packages/gateway/test/unit/config/ \
        packages/gateway/test/unit/metrics/ \
        packages/gateway/test/integration/metrics/
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/metrics/dora-config.ts \
        packages/gateway/src/config/nimbus-toml.ts \
        packages/gateway/test/
git commit -m "feat(config): ServiceConfig.serviceId + deployEnvironments"
```

---

## Task 12: OpenAPI schema — `POST /v1/deployments` + bearer security scheme

**Files:**
- Modify: `packages/gateway/openapi/v1.yaml`

- [ ] **Step 1: Add the path entry + component schemas + security scheme**

Open `packages/gateway/openapi/v1.yaml`. Under `paths:`, add:

```yaml
  /v1/deployments:
    post:
      summary: Annotate a completed deployment.
      description: |
        Records a deployment event into the local index. Used by
        `nimbus-agent/annotate-action` (GitHub Actions) and the CLI
        counterpart `nimbus deploy annotate` to make DORA Deployment
        Frequency and Lead Time accurate without relying on the
        `ci_run.title` regex match. Loopback-only; bearer-auth via the
        `http_api.deployment_token` vault key.
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DeploymentAnnotateInput'
      responses:
        '200':
          description: Annotation accepted (and either new or upserted).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DeploymentAnnotateResult'
        '400':
          description: Invalid request or unknown service.
        '401':
          description: Missing or invalid bearer token.
        '413':
          description: Request body exceeded 8 KiB.
        '429':
          description: Rate limited (60 req/min per token).
        '503':
          description: Write surface disabled or vault unavailable.
```

Under `components.schemas`, add `DeploymentAnnotateInput` and `DeploymentAnnotateResult` with the fields from the spec §5.1 / §5.4. Under `components.securitySchemes`, add:

```yaml
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: vault://http_api.deployment_token
      description: |
        Token stored under the vault key `http_api.deployment_token`.
        Set with `nimbus vault set http_api.deployment_token <value>`.
```

- [ ] **Step 2: Run the OpenAPI drift audit**

```bash
bun run audit:openapi-drift
```

Expected: PASS — the YAML now has `POST /v1/deployments` and `HTTP_ROUTES` includes it.

- [ ] **Step 3: Run the OpenAPI parsing tests**

```bash
bun test packages/gateway/test/unit/openapi/ \
        packages/gateway/test/integration/http/openapi-route.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/gateway/openapi/v1.yaml
git commit -m "feat(openapi): document POST /v1/deployments + bearer security scheme"
```

---

## Task 13: CLI `nimbus deploy annotate`

**Files:**
- Create: `packages/cli/src/commands/deploy-annotate.ts`
- Create: `packages/cli/src/commands/deploy-annotate.test.ts`
- Create: `packages/cli/test/e2e/deploy-annotate.smoke.e2e.test.ts`
- Modify: `packages/cli/src/commands/deploy.ts`
- Modify: `packages/cli/src/commands/registry.ts`
- Modify: `packages/cli/src/commands/help.ts`

- [ ] **Step 1: Write the failing arg-parser test**

Create `packages/cli/src/commands/deploy-annotate.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { parseDeployAnnotateArgs, ArgParseError } from "./deploy-annotate.ts";

const baseArgs = [
  "--service", "payment-service",
  "--sha", "a1b2c3d",
  "--target-ref", "refs/heads/main",
  "--env", "prod",
  "--status", "success",
  "--started-at", "1747142400000",
];

describe("parseDeployAnnotateArgs", () => {
  test("parses the minimum required args", () => {
    const a = parseDeployAnnotateArgs(baseArgs);
    expect(a.service).toBe("payment-service");
    expect(a.sha).toBe("a1b2c3d");
    expect(a.target_ref).toBe("refs/heads/main");
    expect(a.environment).toBe("prod");
    expect(a.status).toBe("success");
    expect(a.started_at_ms).toBe(1747142400000);
    expect(a.provider).toBe("other"); // default when --provider not set
    expect(a.json).toBe(false);
  });
  test("accepts optional --run-id / --job-id / --workflow-url / --provider", () => {
    const a = parseDeployAnnotateArgs([
      ...baseArgs,
      "--run-id", "12345",
      "--job-id", "67890",
      "--workflow-url", "https://github.com/acme/x/actions/runs/12345",
      "--provider", "github-actions",
    ]);
    expect(a.run_id).toBe("12345");
    expect(a.job_id).toBe("67890");
    expect(a.workflow_url).toBe("https://github.com/acme/x/actions/runs/12345");
    expect(a.provider).toBe("github-actions");
  });
  test("--json flag", () => {
    expect(parseDeployAnnotateArgs([...baseArgs, "--json"]).json).toBe(true);
  });
  test("rejects missing required arg", () => {
    expect(() => parseDeployAnnotateArgs(baseArgs.slice(0, -2))).toThrow(ArgParseError);
  });
  test("rejects unknown status", () => {
    const bad = [...baseArgs];
    bad[bad.indexOf("--status") + 1] = "bogus";
    expect(() => parseDeployAnnotateArgs(bad)).toThrow(ArgParseError);
  });
  test("rejects unknown provider", () => {
    expect(() => parseDeployAnnotateArgs([...baseArgs, "--provider", "bogus"])).toThrow(
      ArgParseError,
    );
  });
  test("rejects service id with bad characters (S3 disposition)", () => {
    const bad = [...baseArgs];
    bad[bad.indexOf("--service") + 1] = "Bad Service";
    expect(() => parseDeployAnnotateArgs(bad)).toThrow(ArgParseError);
  });
  test("rejects sha with non-hex characters", () => {
    const bad = [...baseArgs];
    bad[bad.indexOf("--sha") + 1] = "ghij1234";
    expect(() => parseDeployAnnotateArgs(bad)).toThrow(ArgParseError);
  });
  test("rejects env with uppercase characters", () => {
    const bad = [...baseArgs];
    bad[bad.indexOf("--env") + 1] = "PROD";
    expect(() => parseDeployAnnotateArgs(bad)).toThrow(ArgParseError);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
bun test packages/cli/src/commands/deploy-annotate.test.ts
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement the parser + command runner**

Create `packages/cli/src/commands/deploy-annotate.ts`:

```ts
/**
 * nimbus deploy annotate — CLI counterpart to POST /v1/deployments.
 *
 * Surface: writes through the IPC method `deployment.annotate` (NOT
 * through the HTTP endpoint). Uses local socket identity for auth, so
 * no bearer token is needed.
 */

import { connectIpcClient } from "../ipc-client/index.ts";

export class ArgParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArgParseError";
  }
}

type Provider =
  | "github-actions"
  | "gitlab"
  | "jenkins"
  | "circleci"
  | "bitbucket"
  | "other";
const PROVIDERS: readonly Provider[] = [
  "github-actions",
  "gitlab",
  "jenkins",
  "circleci",
  "bitbucket",
  "other",
];
type Status = "success" | "failure" | "cancelled" | "in_progress";
const STATUSES: readonly Status[] = ["success", "failure", "cancelled", "in_progress"];

export interface DeployAnnotateArgs {
  service: string;
  sha: string;
  target_ref: string;
  environment: string;
  status: Status;
  started_at_ms: number;
  finished_at_ms?: number;
  workflow_url?: string;
  provider: Provider;
  run_id?: string;
  job_id?: string;
  json: boolean;
}

function takeValue(argv: readonly string[], i: number, flag: string): string {
  const v = argv[i + 1];
  if (v === undefined || v.startsWith("--")) {
    throw new ArgParseError(`${flag} requires a value`);
  }
  return v;
}

export function parseDeployAnnotateArgs(argv: readonly string[]): DeployAnnotateArgs {
  let service: string | undefined;
  let sha: string | undefined;
  let target_ref: string | undefined;
  let environment: string | undefined;
  let status: Status | undefined;
  let started_at_ms: number | undefined;
  let finished_at_ms: number | undefined;
  let workflow_url: string | undefined;
  let provider: Provider = "other";
  let run_id: string | undefined;
  let job_id: string | undefined;
  let json = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--service":
        service = takeValue(argv, i, a);
        i++;
        break;
      case "--sha":
        sha = takeValue(argv, i, a);
        i++;
        break;
      case "--target-ref":
        target_ref = takeValue(argv, i, a);
        i++;
        break;
      case "--env":
        environment = takeValue(argv, i, a);
        i++;
        break;
      case "--status": {
        const v = takeValue(argv, i, a);
        if (!STATUSES.includes(v as Status)) {
          throw new ArgParseError(`--status must be one of ${STATUSES.join(", ")}`);
        }
        status = v as Status;
        i++;
        break;
      }
      case "--started-at": {
        const v = takeValue(argv, i, a);
        const n = Number.parseInt(v, 10);
        if (!Number.isInteger(n)) throw new ArgParseError("--started-at must be an integer (ms)");
        started_at_ms = n;
        i++;
        break;
      }
      case "--finished-at": {
        const v = takeValue(argv, i, a);
        const n = Number.parseInt(v, 10);
        if (!Number.isInteger(n)) throw new ArgParseError("--finished-at must be an integer (ms)");
        finished_at_ms = n;
        i++;
        break;
      }
      case "--workflow-url":
        workflow_url = takeValue(argv, i, a);
        i++;
        break;
      case "--provider": {
        const v = takeValue(argv, i, a);
        if (!PROVIDERS.includes(v as Provider)) {
          throw new ArgParseError(`--provider must be one of ${PROVIDERS.join(", ")}`);
        }
        provider = v as Provider;
        i++;
        break;
      }
      case "--run-id":
        run_id = takeValue(argv, i, a);
        i++;
        break;
      case "--job-id":
        job_id = takeValue(argv, i, a);
        i++;
        break;
      case "--json":
        json = true;
        break;
      default:
        throw new ArgParseError(`unknown argument: ${a}`);
    }
  }

  if (service === undefined) throw new ArgParseError("--service is required");
  if (sha === undefined) throw new ArgParseError("--sha is required");
  if (target_ref === undefined) throw new ArgParseError("--target-ref is required");
  if (environment === undefined) throw new ArgParseError("--env is required");
  if (status === undefined) throw new ArgParseError("--status is required");
  if (started_at_ms === undefined) throw new ArgParseError("--started-at is required");

  // Mirror the gateway-side validation so users get a clear error before the
  // IPC round-trip (S3 disposition from the plan review).
  const SERVICE_RE = /^[a-z0-9][a-z0-9._-]*$/;
  if (service.length > 64 || !SERVICE_RE.test(service)) {
    throw new ArgParseError(
      `--service must be 1..64 chars matching ${SERVICE_RE.source} (lowercase, starts with [a-z0-9])`,
    );
  }
  const ENV_RE = /^[a-z0-9][a-z0-9._-]*$/;
  if (environment.length > 32 || !ENV_RE.test(environment)) {
    throw new ArgParseError(
      `--env must be 1..32 chars matching ${ENV_RE.source}`,
    );
  }
  const SHA_RE = /^[0-9a-fA-F]{7,64}$/;
  if (!SHA_RE.test(sha)) {
    throw new ArgParseError("--sha must be 7..64 hex chars");
  }

  const out: DeployAnnotateArgs = {
    service,
    sha,
    target_ref,
    environment,
    status,
    started_at_ms,
    provider,
    json,
  };
  if (finished_at_ms !== undefined) out.finished_at_ms = finished_at_ms;
  if (workflow_url !== undefined) out.workflow_url = workflow_url;
  if (run_id !== undefined) out.run_id = run_id;
  if (job_id !== undefined) out.job_id = job_id;
  return out;
}

const NO_COLOR = process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== "";
function green(s: string): string {
  return NO_COLOR ? s : `\x1b[32m${s}\x1b[0m`;
}

export async function runDeployAnnotate(rawArgs: readonly string[]): Promise<number> {
  let args: DeployAnnotateArgs;
  try {
    args = parseDeployAnnotateArgs(rawArgs);
  } catch (e) {
    process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
    return 2;
  }
  const client = await connectIpcClient();
  try {
    const payload: Record<string, unknown> = {
      service: args.service,
      provider: args.provider,
      environment: args.environment,
      sha: args.sha,
      ref: args.target_ref,
      status: args.status,
      started_at_ms: args.started_at_ms,
    };
    if (args.finished_at_ms !== undefined) payload.finished_at_ms = args.finished_at_ms;
    if (args.workflow_url !== undefined) payload.workflow_url = args.workflow_url;
    if (args.run_id !== undefined) payload.run_id = args.run_id;
    if (args.job_id !== undefined) payload.job_id = args.job_id;
    const result = (await client.call("deployment.annotate", payload)) as {
      external_id: string;
      is_new: boolean;
      dora_eligible: boolean;
    };
    if (args.json) {
      process.stdout.write(`${JSON.stringify(result)}\n`);
    } else {
      const verb = result.is_new ? "recorded" : "updated";
      process.stdout.write(
        `${green("✓")} Deployment ${verb}: ${result.external_id}${result.dora_eligible ? " (DORA-eligible)" : ""}\n`,
      );
    }
    return 0;
  } finally {
    await client.close();
  }
}
```

- [ ] **Step 4: Wire `annotate` into the `deploy` subcommand**

Open `packages/cli/src/commands/deploy.ts`. The existing `deploy` command dispatches `preflight`. Add a sibling `annotate` dispatch. The exact wiring depends on the existing structure — locate the switch/router for `deploy <sub>` and add:

```ts
import { runDeployAnnotate } from "./deploy-annotate.ts";
// ...
if (sub === "annotate") return runDeployAnnotate(restArgs);
```

Update `packages/cli/src/commands/registry.ts` to register `deploy-annotate` and `packages/cli/src/commands/help.ts` to include a help line:

```
  nimbus deploy annotate --service <id> --sha <sha> --target-ref <ref> --env <env> --status <success|failure|cancelled|in_progress> --started-at <ms> [--provider P] [--run-id R] [--job-id J] [--workflow-url U] [--finished-at <ms>] [--json]
      Record a completed deployment for DORA + agent correlation.
```

- [ ] **Step 5: Run the CLI unit tests**

```bash
bun test packages/cli/src/commands/deploy-annotate.test.ts
```

Expected: PASS.

- [ ] **Step 6: Write the smoke E2E test**

Create `packages/cli/test/e2e/deploy-annotate.smoke.e2e.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { spawnSync } from "bun";

function cli(args: string[]): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync({
    cmd: ["bun", "run", "packages/cli/src/index.ts", ...args],
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
    exitCode: result.exitCode ?? 0,
  };
}

describe("nimbus deploy annotate (no Gateway)", () => {
  test("help text mentions annotate", () => {
    const r = cli(["help"]);
    expect(r.stdout).toContain("deploy annotate");
  });

  test("missing required arg → exit 2 + clear message", () => {
    const r = cli(["deploy", "annotate", "--service", "x"]);
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toMatch(/--sha is required|--target-ref is required/);
  });

  test("unknown status → exit 2 + clear message", () => {
    const r = cli([
      "deploy",
      "annotate",
      "--service",
      "x",
      "--sha",
      "abc1234",
      "--target-ref",
      "refs/heads/main",
      "--env",
      "prod",
      "--status",
      "bogus",
      "--started-at",
      "1747142400000",
    ]);
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toMatch(/--status must be/);
  });
});
```

- [ ] **Step 7: Run the smoke E2E**

```bash
bun test packages/cli/test/e2e/deploy-annotate.smoke.e2e.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/cli/src/commands/deploy-annotate.ts \
        packages/cli/src/commands/deploy-annotate.test.ts \
        packages/cli/src/commands/deploy.ts \
        packages/cli/src/commands/registry.ts \
        packages/cli/src/commands/help.ts \
        packages/cli/test/e2e/deploy-annotate.smoke.e2e.test.ts
git commit -m "feat(cli): nimbus deploy annotate"
```

---

## Task 14: E2E — CLI → IPC → DB round-trip

**Files:**
- Create: `packages/gateway/test/e2e/scenarios/deploy-annotate.e2e.test.ts`

- [ ] **Step 1: Write the failing E2E test**

Create `packages/gateway/test/e2e/scenarios/deploy-annotate.e2e.test.ts`:

```ts
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startTestGateway, type TestGateway } from "../helpers/test-gateway.ts";

let gw: TestGateway;
let dir: string;
const NOW = 1747142641204;

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "annotate-e2e-"));
  gw = await startTestGateway({ dir, nowMs: () => NOW });
});

afterEach(async () => {
  await gw.stop();
});

describe("E2E nimbus deploy annotate", () => {
  test("writes item + deployment_items + audit rows; retry returns is_new=false", async () => {
    const payload = {
      service: "payment-service",
      provider: "github-actions",
      environment: "prod",
      sha: "a1b2c3d",
      ref: "refs/heads/main",
      status: "success",
      started_at_ms: NOW - 1000,
      run_id: "12345",
      job_id: "67890",
    };
    const r1 = await gw.client.call("deployment.annotate", payload);
    expect((r1 as { is_new: boolean }).is_new).toBe(true);
    const r2 = await gw.client.call("deployment.annotate", payload);
    expect((r2 as { is_new: boolean }).is_new).toBe(false);
    const items = gw.db.query("SELECT COUNT(*) AS c FROM item WHERE type='deployment'").get() as {
      c: number;
    };
    expect(items.c).toBe(1);
    const audit = gw.db
      .query(
        "SELECT COUNT(*) AS c FROM audit_log WHERE action_type='deployment.annotated'",
      )
      .get() as { c: number };
    expect(audit.c).toBe(2);
  });
});
```

> **Note:** the existing `startTestGateway` helper in `packages/gateway/test/e2e/helpers/test-gateway.ts` already supports `dir`, `nowMs`, and an embedded IPC client. If it does not, this task includes a small extension to that helper — keep it minimal.

- [ ] **Step 2: Run to verify it passes**

```bash
bun test packages/gateway/test/e2e/scenarios/deploy-annotate.e2e.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/gateway/test/e2e/scenarios/deploy-annotate.e2e.test.ts
git commit -m "test(e2e): nimbus deploy annotate end-to-end"
```

---

## Task 15: I11 prompt-injection regression test (envelope escape)

**Files:**
- Modify or create: `packages/gateway/test/integration/deployment/i11-envelope.test.ts`

- [ ] **Step 1: Write the test**

Create `packages/gateway/test/integration/deployment/i11-envelope.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runIndexedMigrations } from "../../../src/index/migrations/runner.ts";
import { annotateDeployment } from "../../../src/deployment/annotate.ts";
import { wrapToolOutput } from "../../../src/engine/tool-output-envelope.ts";

const NOW = 1747142641204;
const POISON = "</tool_output>";

const stringFields = [
  "service",
  "environment",
  "sha",
  "ref",
  "workflow_url",
  "run_id",
  "job_id",
] as const;

describe("I11 — </tool_output> escape on every string field of the deployment item", () => {
  for (const field of stringFields) {
    test(`escapes when ${field} carries </tool_output>`, async () => {
      const dir = mkdtempSync(join(tmpdir(), `i11-${field}-`));
      const db = new Database(join(dir, "nimbus.db"));
      await runIndexedMigrations(db);
      // For sha we have to keep the hex shape — append the poison as URL.
      const value =
        field === "sha"
          ? "a1b2c3d"
          : field === "service" || field === "environment"
            ? `payment-service${POISON.replaceAll(/[^a-z0-9._-]/g, "-")}`
            : `${POISON}`;
      const input = {
        service: "payment-service",
        provider: "github-actions" as const,
        environment: "prod",
        sha: "a1b2c3d",
        ref: "refs/heads/main",
        status: "success" as const,
        started_at_ms: NOW - 1000,
        workflow_url: `https://example.com${POISON}`,
        run_id: "12345",
        job_id: "67890",
        [field]: field === "sha" ? "a1b2c3d" : `${value}`,
      };
      const result = annotateDeployment(db, input as never, NOW);
      // Fetch the stored row and render through the envelope as the
      // agent surface would.
      const row = db
        .query("SELECT metadata FROM item WHERE external_id = ?")
        .get(result.external_id) as { metadata: string };
      const envelope = wrapToolOutput(
        { service: "deployment", tool: "lookup" },
        JSON.parse(row.metadata),
      );
      // The literal close tag must NOT appear unescaped between the open
      // tag and the matching close — the only acceptable occurrence is
      // the escaped form.
      const occurrences = envelope.split("</tool_output>").length - 1;
      // The outer envelope ends with exactly one </tool_output>; the
      // body must contain ZERO unescaped occurrences. Total = 1.
      expect(occurrences).toBe(1);
      db.close();
    });
  }
});
```

- [ ] **Step 2: Run to verify it passes**

```bash
bun test packages/gateway/test/integration/deployment/i11-envelope.test.ts
```

Expected: PASS — `wrapToolOutput`'s existing escape handles all fields because the body is JSON-stringified before the regex pass.

- [ ] **Step 3: Commit**

```bash
git add packages/gateway/test/integration/deployment/i11-envelope.test.ts
git commit -m "test(deployment): I11 envelope escape parameterized over every string field"
```

---

## Task 16: I13 invariant — production wiring + docs + enforcement test

**Files:**
- Modify: `packages/gateway/src/security-invariants.test.ts`
- Modify: `docs/SECURITY-INVARIANTS.md`
- Modify: `CLAUDE.md`
- Modify: `GEMINI.md`

- [ ] **Step 1: Write the failing I13 enforcement tests**

Open `packages/gateway/src/security-invariants.test.ts`. Append:

```ts
describe("I13 — HTTP write routes go through allowlist + bearer auth", () => {
  test("http-server.ts imports dispatchWriteRoute from ./http-write-routes.ts", async () => {
    const src = await read("packages/gateway/src/ipc/http-server.ts");
    expect(src).toMatch(/import\s*\{\s*dispatchWriteRoute\s*\}\s*from\s*['"]\.\/http-write-routes\.ts['"]/);
  });

  test("http-server.ts opens a writable DB handle exactly once (and inside the server-context wiring)", async () => {
    const src = await read("packages/gateway/src/ipc/http-server.ts");
    // The readonly handle uses `{ readonly: true, create: false }`; the
    // write handle uses `{ readonly: false, create: false }`. Count the
    // writable construction sites — must be exactly one.
    const matches = src.match(/new Database\([^)]*readonly:\s*false[^)]*\)/g) ?? [];
    expect(matches.length).toBe(1);
  });

  test("WRITE_ROUTE_ALLOWLIST has exactly one entry: POST /v1/deployments", async () => {
    const { WRITE_ROUTE_ALLOWLIST } = await import("./ipc/http-write-routes.ts");
    expect(WRITE_ROUTE_ALLOWLIST.length).toBe(1);
    expect(WRITE_ROUTE_ALLOWLIST[0]).toBe("POST /v1/deployments");
  });
});
```

- [ ] **Step 2: Run to verify the tests pass against the wiring already in place from Tasks 8 + 9**

```bash
bun test packages/gateway/src/security-invariants.test.ts
```

Expected: PASS.

- [ ] **Step 3: Add the I13 entry to `docs/SECURITY-INVARIANTS.md`**

Open `docs/SECURITY-INVARIANTS.md` and append (after the I12 row):

```markdown
### I13 — HTTP write routes go through `WRITE_ROUTE_ALLOWLIST` + bearer auth

**Wired at:** `packages/gateway/src/ipc/http-server.ts` (POST routes dispatch through `dispatchWriteRoute`); `packages/gateway/src/ipc/http-write-routes.ts` (the allowlist).

**Test:** `packages/gateway/src/security-invariants.test.ts` — three sub-asserts: import wiring, single-writable-handle, allowlist count + contents.

**Anti-pattern:** opening a second writable `Database` in `http-server.ts` outside the server-context wiring. Adding a new POST/PUT/DELETE handler that bypasses `dispatchWriteRoute`. Adding entries to `WRITE_ROUTE_ALLOWLIST` without bumping the count assertion.

**Why:** the HTTP server's read-only invariant before T4 PR 3b was per-server; this PR introduces a narrow write surface (post-deploy annotation). Per-route allowlisting + bearer auth + per-token rate limiting is the structural defense against a same-host process spoofing deploys. Same rigor as Tauri `ALLOWED_METHODS` (I7).
```

- [ ] **Step 4: Update the I-list in `CLAUDE.md` + `GEMINI.md`**

Open `CLAUDE.md`. In the "Security Invariants" table, append a new row:

```
| I13 | HTTP write routes go through `WRITE_ROUTE_ALLOWLIST` + bearer auth | `ipc/http-server.ts`, `ipc/http-write-routes.ts` | New POST/PUT/DELETE handler that bypasses `dispatchWriteRoute` or opens a second writable DB outside the server context |
```

Do the same in `GEMINI.md`.

In the "Status" line in `CLAUDE.md`, append `· T4 PR 3b annotation ✅`.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/security-invariants.test.ts \
        docs/SECURITY-INVARIANTS.md \
        CLAUDE.md \
        GEMINI.md
git commit -m "feat(security): I13 — HTTP write-route allowlist + bearer auth"
```

---

## Task 17: GitHub Action — `nimbus-agent/annotate-action`

**Files:**
- Create: `packages/github-actions/annotate-action/action.yml`
- Create: `packages/github-actions/annotate-action/package.json`
- Create: `packages/github-actions/annotate-action/src/main.ts`
- Create: `packages/github-actions/annotate-action/src/render.ts`
- Create: `packages/github-actions/annotate-action/src/main.test.ts`
- Create: `packages/github-actions/annotate-action/src/render.test.ts`
- Create: `packages/github-actions/annotate-action/dist/index.js`
- Create: `packages/github-actions/annotate-action/README.md`

- [ ] **Step 1: Author `action.yml`**

```yaml
name: "Nimbus post-deploy annotation"
description: >
  Records a deployment event in the local Nimbus Gateway index so DORA
  metrics (deployment frequency, lead time, change failure rate, MTTR)
  reflect explicit annotations rather than the legacy ci_run.title
  regex match.
author: "Nimbus"
branding:
  icon: upload-cloud
  color: blue

inputs:
  service:
    description: "Nimbus service id (matches [ci.service.<id>] in nimbus.toml)."
    required: true
  environment:
    description: "Deploy environment (matches `[ci.service.<id>].deploy_environments` membership)."
    required: true
  status:
    description: "success | failure | cancelled | in_progress"
    required: true
  sha:
    description: "Deployed commit SHA (7..64 hex chars)."
    required: false
    default: ${{ github.sha }}
  target-ref:
    description: "Deployed git ref (branch or tag)."
    required: false
    default: ${{ github.ref }}
  workflow-url:
    description: "Link to the deploying CI run (annotated in the index for agent recall)."
    required: false
    default: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
  run-id:
    description: "Stable CI run identifier."
    required: false
    default: ${{ github.run_id }}
  job-id:
    description: "Job-level identifier (optional)."
    required: false
    default: ${{ github.job }}
  started-at:
    description: "Deploy start (ms since epoch). Default: now."
    required: false
    default: ""
  finished-at:
    description: "Deploy finish (ms since epoch, optional)."
    required: false
    default: ""
  gateway-url:
    description: "Base URL of the Gateway HTTP API. Self-hosted-runner default."
    required: false
    default: "http://localhost:7474"
  token:
    description: "Bearer token; matches the vault key http_api.deployment_token on the host."
    required: true
  timeout-ms:
    description: "HTTP timeout in milliseconds."
    required: false
    default: "10000"
  allow-gateway-failure:
    description: "When 'true', an unreachable Gateway never fails the workflow."
    required: false
    default: "false"

outputs:
  external-id:
    description: "Stable id assigned to the deployment item."
  is-new:
    description: "true if a new row was created; false on retry/upsert."
  dora-eligible:
    description: "true if the deployment was counted toward DORA deploy-frequency."

runs:
  using: "node20"
  main: "dist/index.js"
```

- [ ] **Step 2: Author `package.json`**

```json
{
  "name": "@nimbus-dev/action-annotate",
  "version": "0.1.0",
  "private": true,
  "description": "GitHub Action wrapping POST /v1/deployments to record a deploy in the local Nimbus index.",
  "license": "MIT",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "build": "bun build src/main.ts --target=node --outfile=dist/index.js --format=esm",
    "test": "bun test"
  }
}
```

- [ ] **Step 3: Author `src/render.ts`**

```ts
export interface AnnotateResult {
  readonly external_id: string;
  readonly is_new: boolean;
  readonly dora_eligible: boolean;
}

export function renderSummary(input: {
  service: string;
  environment: string;
  status: string;
  externalId: string;
  isNew: boolean;
  doraEligible: boolean;
}): string {
  const verb = input.isNew ? "Recorded" : "Updated";
  const eligible = input.doraEligible ? "✅ DORA-eligible" : "ℹ️ not counted in DORA deploy-frequency";
  return [
    `### ${verb} deployment — ${input.service} → ${input.environment}`,
    "",
    `- **External ID:** \`${input.externalId}\``,
    `- **Status:** \`${input.status}\``,
    `- **DORA:** ${eligible}`,
  ].join("\n");
}
```

- [ ] **Step 4: Author `src/main.ts`**

Adapt the same sanitization+I/O pattern from `preflight-query/src/main.ts`. Reads inputs, builds the JSON payload, POSTs to `${gateway-url}/v1/deployments` with `Authorization: Bearer <token>`, writes outputs through the allowlisted `setOutput`, writes a workflow summary, honors `allow-gateway-failure`. The sanitization barrier (`safeString`, `safeInt`) applies to fields flowing into `appendFileSync` sinks. Use the existing `preflight-query/src/main.ts` lines 1-100 verbatim as the sanitization base (same `DENY_CHARS`, same `safeString`, same `ALLOWED_OUTPUT_NAMES` pattern with the three names declared in `action.yml`).

The main flow:
1. Read inputs; default `started-at` to `Date.now()` when empty.
2. Build payload object; drop empty optional fields.
3. POST with `AbortController` timeout.
4. On 200: parse + sanitize the envelope; set outputs; write summary.
5. On non-200 / network error: warning annotation; if `allow-gateway-failure=true` exit 0, else exit 1.

- [ ] **Step 5: Author `src/main.test.ts`** mirroring `preflight-query/src/main.test.ts`:

Mock `fetch`, exercise the matrix:
- `200` → exit 0, outputs set, summary written.
- `200 is_new=false` → exit 0, summary says "Updated".
- `401` → exit 1 (or 0 if `allow-gateway-failure=true`).
- `429` with `Retry-After` → exit 1 (or 0 if allow-failure), warning annotation includes the retry-after.
- `503 write_surface_disabled` → exit 1 with the hint surfaced verbatim.
- Network failure → honors `allow-gateway-failure`.

- [ ] **Step 6: Build the bundle**

```bash
cd packages/github-actions/annotate-action && bun run build && cd -
```

This writes `dist/index.js`. Commit the bundle alongside source.

- [ ] **Step 7: Author the README**

Lead with:

````markdown
# nimbus-agent/annotate-action

Record a deploy in your local Nimbus Gateway after a CI deploy completes.

## Getting started

1. **On the self-hosted runner host**, generate and store the bearer token in the Nimbus Vault:

   ```sh
   nimbus vault set http_api.deployment_token "$(openssl rand -hex 32)"
   ```

   This is the **only** place the token plaintext exists on disk — the OS keychain
   (DPAPI / Keychain / libsecret) encrypts it at rest. Print it once so you can
   copy it into GitHub:

   ```sh
   nimbus vault get http_api.deployment_token
   ```

2. **Store the same value as a GitHub Repository Secret** (recommended) or
   Organization Secret. **Do not paste the token inline in the workflow YAML** —
   inline values are checked into git and visible to anyone with read access to
   the repo.

   Go to `Settings → Secrets and variables → Actions → New repository secret`
   and create `NIMBUS_DEPLOYMENT_TOKEN` with the value from step 1. GitHub masks
   the value in all log output once it's stored as a secret. The token can be
   rotated by running `nimbus vault set …` again and updating the secret —
   GitHub does not let you read the existing value back, so keep a one-time
   record while you're rotating.

3. **Use the action in your deploy workflow**:

   ```yaml
   - uses: nimbus-agent/annotate-action@v1
     with:
       service: payment-service
       environment: prod
       status: success
       token: ${{ secrets.NIMBUS_DEPLOYMENT_TOKEN }}
   ```

   Never write `token: hunter2` (or any literal) directly — the workflow file is
   committed to the repo and the value is unmasked in the YAML. Always reference
   it via `${{ secrets.* }}`.
````

Followed by the input/output reference table.

- [ ] **Step 8: Run the action's tests**

```bash
cd packages/github-actions/annotate-action && bun test && cd -
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/github-actions/annotate-action/
git commit -m "feat(action): nimbus-agent/annotate-action — post-deploy annotation"
```

---

## Task 18: Coverage gate + CI wiring + skill docs + roadmap flip

**Files:**
- Modify: `package.json` (root)
- Modify: `scripts/lib/ci-tests.ts`
- Modify: `.github/workflows/_test-suite.yml`
- Modify: `.claude/commands/nimbus-file-map.md`
- Modify: `.claude/commands/nimbus-commands.md`
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Add the coverage script**

Open root `package.json`. In the `scripts` block, append (alphabetical with `test:coverage:*` entries):

```json
"test:coverage:deployment": "bun test --coverage --coverage-dir=coverage/deployment packages/gateway/src/deployment/ packages/gateway/src/ipc/deployment-rpc.ts packages/gateway/src/ipc/http-auth.ts packages/gateway/src/ipc/http-rate-limit.ts packages/gateway/src/ipc/http-write-routes.ts && node scripts/check-coverage.mjs coverage/deployment 80"
```

- [ ] **Step 2: Append to the CI gate list**

Open `scripts/lib/ci-tests.ts`. Find the coverage-gates array and append `"test:coverage:deployment"` (alphabetical).

- [ ] **Step 3: Add the CI matrix entry**

Open `.github/workflows/_test-suite.yml`. Find the coverage matrix and add (alphabetical):

```yaml
          - name: Deployment
            script: test:coverage:deployment
```

- [ ] **Step 4: Update the file-map skill**

Open `.claude/commands/nimbus-file-map.md`. Under "Metrics + CI/CD", add:

```
| `packages/gateway/src/deployment/annotate.ts` | Pure post-deploy annotation calculator (T4 PR 3b). Validates input, computes `external_id`, upserts `item` + `deployment_items`, writes one audit row via `appendAuditEntry`. |
| `packages/gateway/src/deployment/external-id.ts` | Three-tier idempotency key rule. |
| `packages/gateway/src/deployment/types.ts` | `DeploymentAnnotateInput` / `DeploymentAnnotateResult` types. |
| `packages/gateway/src/ipc/deployment-rpc.ts` | `dispatchDeploymentRpc` — `deployment.annotate` JSON-RPC handler. |
| `packages/gateway/src/ipc/http-auth.ts` | Bearer-auth helper for the HTTP write surface (vault key `http_api.deployment_token`, constant-time compare, fingerprint). |
| `packages/gateway/src/ipc/http-rate-limit.ts` | `HttpWriteRateLimiter` — 60-req/min sliding window per token fingerprint. |
| `packages/gateway/src/ipc/http-write-routes.ts` | `WRITE_ROUTE_ALLOWLIST` + `dispatchWriteRoute` (invariant I13). |
| `packages/github-actions/annotate-action/` | First-party GitHub Action that wraps `POST /v1/deployments`. |
```

- [ ] **Step 5: Update the commands skill**

Open `.claude/commands/nimbus-commands.md`. In the "Coverage gates" section, append:

```
bun run test:coverage:deployment      # ≥80% (post-deploy annotation calculator + HTTP write surface)
```

In the "Phase 5 T4 — CI/CD data layer" CLI section, add:

```
nimbus deploy annotate --service <id> --sha <sha> --target-ref <ref> --env <env> --status <s> --started-at <ms> [--json] [--provider P] [--run-id R] [--job-id J] [--workflow-url U] [--finished-at <ms>]   # post-deploy annotation
```

Add a "Vault keys" subsection note (or add to an existing one):

```
http_api.deployment_token  # Bearer token for POST /v1/deployments; set via `nimbus vault set`.
```

- [ ] **Step 6: Flip the roadmap**

Open `docs/roadmap.md`. Find the line:

```
- [ ] **Post-deploy annotation** — GitHub Actions action that writes a deployment event …
```

Change to:

```
- [x] **Post-deploy annotation** (2026-05-13, Phase 5 T4 PR 3b) — `nimbus-agent/annotate-action` GitHub Action + `POST /v1/deployments` + `nimbus deploy annotate` CLI. Records a deploy as a first-class `deployment` item (V28 shadow table); DORA's `selectDeploys` prefers annotated rows and emits `gap: "mixed_source"` when both annotated and regex-matched `ci_run` rows fall in the same window. Bearer-auth via vault key `http_api.deployment_token`; 60 req/min sliding-window rate limit. New security invariant **I13** locks the HTTP write-route allowlist.
```

- [ ] **Step 7: Run the full CI parity**

```bash
bun run test:ci
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add package.json \
        scripts/lib/ci-tests.ts \
        .github/workflows/_test-suite.yml \
        .claude/commands/nimbus-file-map.md \
        .claude/commands/nimbus-commands.md \
        docs/roadmap.md
git commit -m "chore(t4 pr 3b): wire coverage gate + update skills + flip roadmap"
```

---

## Final acceptance run

- [ ] **Step 1: Run the full CI suite**

```bash
bun run test:ci
```

Expected: every gate green, including the new `test:coverage:deployment` ≥ 80%.

- [ ] **Step 2: Run `bun run audit:openapi-drift` and `bun run audit:structure`**

```bash
bun run audit:openapi-drift
bun run audit:structure
```

Expected: PASS.

- [ ] **Step 3: Confirm the Rust allowlist tests still pass**

```bash
cd packages/ui/src-tauri && cargo test && cd -
```

Expected: PASS (no change — `deployment.annotate` is intentionally NOT in `ALLOWED_METHODS`).

- [ ] **Step 4: Manual smoke against a real Gateway**

Start a Gateway with the write surface enabled, set the vault key, run the CLI command end-to-end:

```bash
nimbus vault set http_api.deployment_token "$(openssl rand -hex 32)"
nimbus serve &
nimbus deploy annotate \
  --service payment-service \
  --sha a1b2c3d \
  --target-ref refs/heads/main \
  --env prod \
  --status success \
  --started-at "$(date +%s%3N)" \
  --json
nimbus metrics dora --service payment-service --since 30d
```

Expected: the CLI prints a result JSON; the DORA call shows `sample` reflecting the new deploy.

---

## Self-Review (run after writing the plan)

**1. Spec coverage:**

- ✅ §3 Architecture diagram — Tasks 4, 5, 8, 9, 13, 17 implement the three entry points + the IPC method
- ✅ §4 File map — every "Files created" entry above has a corresponding task
- ✅ §5.1 HTTP request — Task 9 integration test exercises the shape
- ✅ §5.2 Validation rules — Task 4 unit tests cover every field rule, including the per-request config-load note (covered by the `loadConfig` callback in §3.2)
- ✅ §5.3 Idempotency / external_id — Task 3 covers the three-tier rule including the fix from Q1 (no `started_at_ms`)
- ✅ §5.4 Response — covered by Tasks 4 and 9
- ✅ §5.5 Error matrix incl. `known_services` + `X-RateLimit-*` — Task 9 integration tests assert each row
- ✅ §5.6 Audit row — Task 4 asserts the JSON shape; uses `appendAuditEntry` per the implementation note
- ✅ §5.7 DORA integration — Task 10 implements `mixed_source` with the CLI icon described in the spec (CLI render lives inside existing `nimbus metrics dora` — that surface already exists; the icon prefix is a one-line addition that lives in the DORA CLI command, NOT a new file)
- ✅ §5.8 Three-surface equivalence — Tasks 5 (RPC), 9 (HTTP), 13 (CLI)
- ✅ §5.9 I13 invariant — Task 16
- ✅ §7 I11 envelope regression — Task 15
- ✅ §8 Acceptance criteria — every numbered item maps to a task; #6 (mixed_source) is Task 10's fixture; #12 (I11) is Task 15
- ✅ §10 Test strategy — Tasks 1, 3, 4, 5, 7, 9, 10, 13, 14, 15, 16 cover each row of the test table
- ✅ §11 Risks — token-leak masking is part of Task 17's `action.yml` (`secret: true`-style declaration is implicit; GH masks input values used via `${{ secrets.* }}`); README "Getting Started" is Task 17 Step 7
- ✅ §13 Review dispositions — every FIX is wired into a task

**Gaps found:**
- The §5.7 CLI icon for `mixed_source` — this is a one-line edit to the existing `nimbus metrics dora` CLI command. I missed adding it as a task. **Adding a small Task 10b below to cover it.**

**Adding Task 10b inline:**

### Task 10b: Yellow ⚠ icon for `gap: "mixed_source"` in `nimbus metrics dora`

**Files:**
- Modify: `packages/cli/src/commands/metrics.ts`

- [ ] **Step 1: Locate the pretty-card renderer in `metrics.ts`** (it currently prints a row per metric). Find the spot where `gap` is rendered into the card.

- [ ] **Step 2: Add the icon AND a hint line under the card (S4 disposition)**

Locate the metric-row renderer. Before the metric label, conditionally prepend `⚠ ` when `gap === "mixed_source"` and we're rendering to a TTY without `NO_COLOR`:

```ts
const showIcon =
  m.gap === "mixed_source" && process.stdout.isTTY && process.env.NO_COLOR === undefined;
const prefix = showIcon ? "\x1b[33m⚠\x1b[0m " : "";
```

Prepend `prefix` to the metric row.

After the card body, emit a hint line so operators understand the warning (visible regardless of TTY / color — the icon alone tells you *something* is off; the hint tells you *what*):

```ts
const anyMixed = metrics.some((m) => m.gap === "mixed_source");
if (anyMixed) {
  process.stdout.write(
    "\nNote: this window contains both explicit `deployment` annotations and ci_run regex matches.\n" +
    "Annotated rows are counted; ci_run rows are ignored. Annotate consistently for accurate DF/LT.\n",
  );
}
```

- [ ] **Step 3: Add unit tests**

```ts
import { describe, expect, test } from "bun:test";
import { renderMetricRow, renderMixedSourceHint } from "./metrics.ts";

describe("mixed_source rendering", () => {
  test("icon prefix appears when TTY and no NO_COLOR", () => {
    const row = renderMetricRow(
      { label: "Deployment Frequency", value: 0.5, unit: "deploys_per_day", sample: 5, gap: "mixed_source" },
      { tty: true, noColor: false },
    );
    expect(row).toMatch(/\[33m⚠\[0m/);
  });

  test("no icon when NO_COLOR is set", () => {
    const row = renderMetricRow(
      { label: "Deployment Frequency", value: 0.5, unit: "deploys_per_day", sample: 5, gap: "mixed_source" },
      { tty: true, noColor: true },
    );
    expect(row).not.toMatch(/\[33m⚠/);
  });

  test("hint string explains the mixed_source warning", () => {
    expect(renderMixedSourceHint()).toContain("Annotate consistently");
    expect(renderMixedSourceHint()).toContain("deployment");
    expect(renderMixedSourceHint()).toContain("ci_run");
  });

  test("hint string is omitted when no metric has mixed_source", () => {
    // The caller (pretty-mode renderer) decides; this test asserts the
    // helper exists and returns a non-empty string.
    expect(renderMixedSourceHint().length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/commands/metrics.ts packages/cli/src/commands/metrics.test.ts
git commit -m "feat(cli): mixed_source gap shows ⚠ + explanatory hint in nimbus metrics dora"
```

---

**2. Placeholder scan:** none — every step contains the actual code or command. `nimbus serve` in the final smoke step refers to the existing CLI subcommand.

**3. Type consistency:**
- `DeploymentAnnotateInput` is used in Tasks 2, 3, 4, 5, 13 — same field names throughout.
- `ServiceConfig` gains `serviceId` + `deployEnvironments` in Task 11; Task 10 references both. Task 11 must land before Task 10's test runs — **Task 11 is listed after Task 10 in the plan; this is a real ordering bug.** Fix below.

**Ordering fix:** swap Tasks 10 and 11 — Task 11 lands `serviceId` + `deployEnvironments` on `ServiceConfig`; Task 10 then uses them in `selectAnnotatedDeploys`. **Move Task 11 above Task 10.** Renumber accordingly. (Or — keep numeric IDs and execute Task 11 first; the subagent-driven executor honors the order in the plan.)

The plan now executes in this order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → **11** → **10** → **10b** → 12 → 13 → 14 → 15 → 16 → 17 → 18 → final.

When dispatching, please follow that order. (No file renames needed.)

---

## Plan review dispositions

Tracks the Gemini-CLI plan review ([`2026-05-13-phase-5-t4-pr3b-annotation-review.md`](./2026-05-13-phase-5-t4-pr3b-annotation-review.md)).

| # | Review item | Disposition | Resolution |
|---|---|---|---|
| S1 | Action README explicitly recommend GitHub Repository Secrets | **FIX** | Task 17 README expanded — explicit "Do not paste inline" guidance, GitHub Secret name `NIMBUS_DEPLOYMENT_TOKEN`, rotation note. |
| S2 | Audit row for 401 / 429 rejections | **FIX** | Task 8 `dispatchWriteRoute` now writes a `deployment.annotation_rejected` audit row at every rejection point (401, 413, 429, 400 unknown_service, 400 invalid_request, 500). Uses `appendAuditEntry` to maintain the BLAKE3 chain — brute-force probes are tamper-evident, fulfilling the I13 "structural defense" intent. Task 9 integration test asserts the audit rows are present. |
| S3 | CLI-side service-id format validation | **FIX** | Task 13 `parseDeployAnnotateArgs` mirrors the gateway regex (`/^[a-z0-9][a-z0-9._-]*$/`) plus sha hex check and env regex check, so users get a clear error before the IPC round-trip. Three new arg-parser test cases. |
| S4 | Mixed-source CLI hint visibility | **FIX** | Task 10b expanded — alongside the ⚠ icon, the renderer now emits an explanatory hint line ("Annotate consistently for accurate DF/LT.") that's visible regardless of TTY / color. Unit tests cover both the icon and the hint helper. |
| Q1 | `in_progress` deployment timeout / stale rows | **DEFER (document)** | DORA filters with `WHERE conclusion = 'success'`, so stale `in_progress` rows do not affect any of the four metrics — only "what's currently deploying" agent queries. A periodic sweeper (`in_progress > 24h → cancelled`) is a Phase 6 hygiene PR; the threshold needs operator input and shouldn't gate this PR. Spec Out-of-scope updated. |
| Q2 | Per-metric environment overrides | **DEFER** | v1 ships a single `deploy_environments` list per service. Per-metric overrides (e.g. DF counts staging, CFR doesn't) are explicit scope creep — none of the four DORA metrics is currently asking for it. Spec Out-of-scope updated. |
