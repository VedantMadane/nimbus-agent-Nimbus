/**
 * V27 migration — seeds the `merged_as` row in `graph_relation_type`
 * so the graph populator can emit `pr → commit` edges produced by the
 * github PR connector (Phase 5 T4 PR 2). Append-only; no shadow table.
 *
 * The relation links the `pr` graph entity to the `commit` graph entity
 * created when `pr.metadata.merge_commit_sha` is present. Used by the
 * DORA Lead Time calculator's exact-SHA join.
 */

export const PR_COMMIT_RELATION_V27_SEED_SQL = `
INSERT OR IGNORE INTO graph_relation_type (name, directed) VALUES
  ('merged_as', 1);
`;
