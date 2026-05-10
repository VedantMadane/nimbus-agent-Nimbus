import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { readIndexedUserVersion, runIndexedSchemaMigrations } from "./runner.ts";

test("running migrations on a fresh DB advances user_version to 25", () => {
  const db = new Database(":memory:");
  runIndexedSchemaMigrations(db, 25);
  expect(readIndexedUserVersion(db)).toBe(25);
});

test("V25 records a row in _schema_migrations", () => {
  const db = new Database(":memory:");
  runIndexedSchemaMigrations(db, 25);
  const row = db
    .query("SELECT version, description, applied_at FROM _schema_migrations WHERE version = 25")
    .get() as { version: number; description: string; applied_at: number } | null;
  expect(row?.version).toBe(25);
  expect(row?.description).toContain("api_endpoint");
  expect(row?.applied_at).toBeGreaterThan(0);
});
