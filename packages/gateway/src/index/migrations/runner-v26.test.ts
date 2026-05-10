import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { runIndexedSchemaMigrations } from "./runner.ts";

describe("V26 migration — obsidian_notes shadow table", () => {
  test("running migrations on a fresh DB advances user_version to 26", () => {
    const db = new Database(":memory:");
    runIndexedSchemaMigrations(db, 26);
    const row = db.query("PRAGMA user_version").get() as { user_version: number };
    expect(row.user_version).toBe(26);
  });

  test("V26 records an applied row in _schema_migrations", () => {
    const db = new Database(":memory:");
    runIndexedSchemaMigrations(db, 26);
    const row = db
      .query("SELECT version, description, applied_at FROM _schema_migrations WHERE version = 26")
      .get() as { version: number; description: string; applied_at: number } | null;
    expect(row?.version).toBe(26);
    expect(row?.description).toContain("obsidian_notes");
    expect(row?.applied_at).toBeGreaterThan(0);
  });

  test("V26 creates the obsidian_notes table reachable by the migration runner", () => {
    const db = new Database(":memory:");
    runIndexedSchemaMigrations(db, 26);
    const cols = db.query("PRAGMA table_info(obsidian_notes)").all() as Array<{ name: string }>;
    expect(cols.length).toBeGreaterThan(0);
    const names = new Set(cols.map((c) => c.name));
    expect(names.has("id")).toBe(true);
    expect(names.has("vault_id")).toBe(true);
  });
});
