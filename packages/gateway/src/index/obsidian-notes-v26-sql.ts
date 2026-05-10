/**
 * V26 migration — `obsidian_notes` shadow table for the Obsidian vault
 * connector (Phase 5 Wave A PR 2). One row per indexed Markdown note,
 * keyed by the unified `item.id`. Append-only and additive — no backfill
 * needed; existing rows in `item` are unaffected.
 *
 * Body content lives in the standard `item` / `item_fts` tables (via
 * `upsertIndexedItem`); this shadow table holds structured metadata only.
 */

export const OBSIDIAN_NOTES_V26_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS obsidian_notes (
  id                TEXT PRIMARY KEY,
  vault_id          TEXT NOT NULL,
  vault_name        TEXT NOT NULL,
  path              TEXT NOT NULL,
  title             TEXT NOT NULL,
  frontmatter_json  TEXT NOT NULL DEFAULT '{}',
  tags_json         TEXT NOT NULL DEFAULT '[]',
  wikilinks_json    TEXT NOT NULL DEFAULT '[]',
  daily_note_date   TEXT,
  last_modified     INTEGER NOT NULL,
  created_at        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_obsidian_notes_vault_path
  ON obsidian_notes (vault_id, path);
CREATE INDEX IF NOT EXISTS idx_obsidian_notes_daily_note_date
  ON obsidian_notes (daily_note_date)
  WHERE daily_note_date IS NOT NULL;
`;

/**
 * Seeds the `backlinks` row in `graph_relation_type` so that
 * `syncObsidianNoteGraph` can write `graph_relation` rows of type
 * `'backlinks'` without an FK violation. Kept separate from the schema
 * constant so the schema can be exercised on a bare in-memory DB without
 * the prior migrations' tables; the migration runner execs both.
 */
export const OBSIDIAN_NOTES_V26_SEED_SQL = `
INSERT OR IGNORE INTO graph_relation_type (name, directed) VALUES
  ('backlinks', 1);
`;
