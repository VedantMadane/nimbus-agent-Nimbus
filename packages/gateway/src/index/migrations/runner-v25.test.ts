import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { runIndexedSchemaMigrations } from "./runner.ts";

describe("V25 migration — api_endpoint shadow table", () => {
  test("running migrations on a fresh DB advances user_version to 25", () => {
    const db = new Database(":memory:");
    runIndexedSchemaMigrations(db, 25);
    const row = db.query("PRAGMA user_version").get() as { user_version: number };
    expect(row.user_version).toBe(25);
  });

  test("V25 records an applied row in _schema_migrations", () => {
    const db = new Database(":memory:");
    runIndexedSchemaMigrations(db, 25);
    const row = db
      .query("SELECT version, description, applied_at FROM _schema_migrations WHERE version = 25")
      .get() as { version: number; description: string; applied_at: number } | null;
    expect(row?.version).toBe(25);
    expect(row?.description).toContain("api_endpoint");
    expect(row?.applied_at).toBeGreaterThan(0);
  });

  test("V25 creates the api_endpoint table reachable by the migration runner", () => {
    const db = new Database(":memory:");
    runIndexedSchemaMigrations(db, 25);
    const cols = db.query("PRAGMA table_info(api_endpoint)").all() as Array<{ name: string }>;
    expect(cols.length).toBeGreaterThan(0);
    const names = new Set(cols.map((c) => c.name));
    expect(names.has("id")).toBe(true);
    expect(names.has("service_name")).toBe(true);
  });
});
