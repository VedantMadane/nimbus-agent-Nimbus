import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { API_ENDPOINT_V25_SCHEMA_SQL } from "./api-endpoint-v25-sql.ts";

test("V25 schema creates api_endpoint with documented columns and indexes", () => {
  const db = new Database(":memory:");
  db.exec(API_ENDPOINT_V25_SCHEMA_SQL);
  const cols = db.query(`PRAGMA table_info(api_endpoint)`).all() as Array<{ name: string }>;
  const names = new Set(cols.map((c) => c.name));
  for (const expected of [
    "id",
    "service_name",
    "path",
    "method",
    "operation_id",
    "tags_json",
    "deprecated",
    "spec_file",
    "spec_version",
    "last_modified",
    "created_at",
  ]) {
    expect(names.has(expected)).toBe(true);
  }
  const indexes = db
    .query(`SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='api_endpoint'`)
    .all() as Array<{ name: string }>;
  const idxNames = new Set(indexes.map((i) => i.name));
  expect(idxNames.has("idx_api_endpoint_service_path_method")).toBe(true);
  expect(idxNames.has("idx_api_endpoint_spec_file")).toBe(true);
});

test("V25 schema CHECK constraint rejects deprecated values outside 0/1", () => {
  const db = new Database(":memory:");
  db.exec(API_ENDPOINT_V25_SCHEMA_SQL);
  expect(() => {
    db.run(
      `INSERT INTO api_endpoint (id, service_name, path, method, tags_json, deprecated, spec_file, spec_version, last_modified, created_at)
       VALUES ('x', 's', '/p', 'GET', '[]', 2, '/spec', 'openapi-3.0.0', 0, 0)`,
    );
  }).toThrow();
});
