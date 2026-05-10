/**
 * V25 migration — `api_endpoint` shadow table for OpenAPI / AsyncAPI spec
 * indexer (Phase 5 Wave A PR 1). One row per indexed endpoint, keyed by the
 * unified `item.id`. Service-that-owns-the-endpoint is `service_name`;
 * `item.service` is always `"openapi"` for these rows.
 *
 * Append-only and additive — no backfill needed; existing rows in `item`
 * are unaffected.
 */

export const API_ENDPOINT_V25_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS api_endpoint (
  id            TEXT PRIMARY KEY,
  service_name  TEXT NOT NULL,
  path          TEXT NOT NULL,
  method        TEXT NOT NULL,
  operation_id  TEXT,
  tags_json     TEXT NOT NULL DEFAULT '[]',
  deprecated    INTEGER NOT NULL DEFAULT 0,
  spec_file     TEXT NOT NULL,
  spec_version  TEXT NOT NULL,
  last_modified INTEGER NOT NULL,
  created_at    INTEGER NOT NULL,
  CHECK (deprecated IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_api_endpoint_service_path_method
  ON api_endpoint (service_name, path, method);
CREATE INDEX IF NOT EXISTS idx_api_endpoint_spec_file
  ON api_endpoint (spec_file);
`;
