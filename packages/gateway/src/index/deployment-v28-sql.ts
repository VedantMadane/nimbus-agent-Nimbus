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
