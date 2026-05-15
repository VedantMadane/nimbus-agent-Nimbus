/**
 * Phase 5 T4 PR 3b — `nimbus deploy annotate` end-to-end (in-process).
 *
 * Mirrors the in-process e2e pattern used by `metrics-dora.e2e.test.ts` and
 * `preflight-deploy.e2e.test.ts`: builds a fresh SQLite DB with index
 * migrations applied through V28 (the post-deploy annotation schema), then
 * dispatches `deployment.annotate` via the same handler the IPC server uses.
 *
 * Asserts the CLI → IPC → DB round-trip persists three rows (`item`,
 * `deployment_items`, `audit_log`) on first call and idempotency on retry
 * (is_new=false, single `item` row, two `audit_log` rows — the contract
 * the GitHub Action retry path relies on).
 */

import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DeploymentAnnotateInput } from "../../../src/deployment/types.ts";
import { runIndexedSchemaMigrations } from "../../../src/index/migrations/runner.ts";
import { dispatchDeploymentRpc } from "../../../src/ipc/deployment-rpc.ts";

const NOW = 1747142641204;
const TARGET_SCHEMA_VERSION = 29;

describe("E2E (in-process): nimbus deploy annotate", () => {
  let dir: string;
  let db: Database;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "nimbus-deploy-annotate-e2e-"));
    db = new Database(join(dir, "nimbus.db"));
    runIndexedSchemaMigrations(db, TARGET_SCHEMA_VERSION);
  });

  afterEach(() => {
    db.close();
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* non-fatal */
    }
  });

  test("writes item + deployment_items + audit rows; retry returns is_new=false", async () => {
    const payload: DeploymentAnnotateInput = {
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

    const first = await dispatchDeploymentRpc("deployment.annotate", payload, {
      db,
      nowMs: () => NOW,
    });
    if (first.kind !== "hit") throw new Error("expected hit on first call");
    expect(first.value.is_new).toBe(true);
    expect(first.value.dora_eligible).toBe(true);
    expect(first.value.external_id).toBe("github-actions:run-12345:job-67890");

    const second = await dispatchDeploymentRpc("deployment.annotate", payload, {
      db,
      nowMs: () => NOW + 1000,
    });
    if (second.kind !== "hit") throw new Error("expected hit on retry");
    expect(second.value.is_new).toBe(false);
    expect(second.value.external_id).toBe(first.value.external_id);

    // DB state: exactly one item, one deployment_items row, two audit rows.
    const items = db.query("SELECT COUNT(*) AS c FROM item WHERE type = 'deployment'").get() as {
      c: number;
    };
    expect(items.c).toBe(1);

    const shadow = db.query("SELECT COUNT(*) AS c FROM deployment_items").get() as { c: number };
    expect(shadow.c).toBe(1);

    const audit = db
      .query("SELECT COUNT(*) AS c FROM audit_log WHERE action_type = 'deployment.annotated'")
      .get() as { c: number };
    expect(audit.c).toBe(2);
  });
});
