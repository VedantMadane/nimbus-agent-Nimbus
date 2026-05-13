import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runIndexedSchemaMigrations } from "../../../src/index/migrations/runner.ts";

describe("V28 — deployment_items shadow table", () => {
  test("fresh DB advances user_version to 28", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-v28-"));
    const db = new Database(join(dir, "nimbus.db"));
    runIndexedSchemaMigrations(db, 28);
    const row = db.query("PRAGMA user_version").get() as { user_version: number };
    expect(row.user_version).toBe(28);
    db.close();
  });

  test("deployment_items table is created with the expected columns", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-v28-"));
    const db = new Database(join(dir, "nimbus.db"));
    runIndexedSchemaMigrations(db, 28);
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

  test("item.UNIQUE(service, external_id) blocks duplicate deployment rows", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-v28-"));
    const db = new Database(join(dir, "nimbus.db"));
    runIndexedSchemaMigrations(db, 28);
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

  test("idx_deployment_items_service_env_started enables ORDER BY on the hot path", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-v28-"));
    const db = new Database(join(dir, "nimbus.db"));
    runIndexedSchemaMigrations(db, 28);
    const idxs = db
      .query("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='deployment_items'")
      .all() as Array<{ name: string }>;
    const names = idxs.map((i) => i.name);
    expect(names).toContain("idx_deployment_items_service_env_started");
    expect(names).toContain("idx_deployment_items_provider_sha");
    db.close();
  });

  test("conclusion CHECK constraint rejects unknown values", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-v28-"));
    const db = new Database(join(dir, "nimbus.db"));
    runIndexedSchemaMigrations(db, 28);
    expect(() =>
      db.run(
        `INSERT INTO deployment_items (id, provider, nimbus_service_id, environment, sha, ref, started_at_ms, conclusion, created_at)
         VALUES ('deployment:gha:run-1', 'github-actions', 'p', 'prod', 'abc', 'r', 0, 'unknown_conclusion', 0)`,
      ),
    ).toThrow();
    db.close();
  });
});
