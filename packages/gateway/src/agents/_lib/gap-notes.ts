import type { Database } from "bun:sqlite";
import type { GapNote } from "./findings.ts";

const ENTITY_TYPE_REMEDIATIONS: Readonly<Record<string, string>> = Object.freeze({
  // Phase 5 Wave D — read-only data warehouses (Metabase / Superset / dbt schema /
  // BigQuery schema / Athena). Populates `dashboard`, `data_model`, `upstream_refs`.
  dashboard: "Phase 5 Wave D will populate `dashboard` via Metabase / Superset connectors.",
  data_model: "Phase 5 Wave D will populate `data_model` via dbt-schema / warehouse connectors.",
  upstream_refs: "Phase 5 Wave D will populate `upstream_refs` alongside data-warehouse coverage.",
  // Graph-populator follow-ups: types defined in ITEM_LINKED_ENTITY_TYPES but not
  // dispatched in syncGraphFromIndexedItem today.
  incident: "Tracked as a graph-populator follow-up on existing PagerDuty / Sentry connectors.",
  alert: "Tracked as a graph-populator follow-up on existing observability connectors.",
  pipeline_run: "Tracked as a graph-populator follow-up on the existing CI/CD connectors.",
});

export function remediationForEntityType(kind: string): string | undefined {
  return ENTITY_TYPE_REMEDIATIONS[kind];
}

// All SQL below uses the real production table/column names (F1, F2, F3):
//   items table is `item` (singular); see packages/gateway/src/index/unified-item-v3-sql.ts
//   graph table is `graph_entity` (singular) with column `type`, NOT `kind`/`ref`
//   the relations table is `graph_relation` with from_id/to_id/type.

export function detectEmptyIndex(db: Database): GapNote | null {
  const row = db.query("SELECT 1 AS n FROM item LIMIT 1").get() as { n?: number } | null;
  if (row !== null) return null;
  return {
    category: "empty_index",
    detail: "No items in the local index yet.",
    remediation: "Run `nimbus connector sync <service>` for at least one connector.",
  };
}

export function detectMissingConnector(db: Database, service: string): GapNote | null {
  // sync_state's PK column is `connector_id`, not `service` — see
  // packages/gateway/src/index/schema-sql.ts. The connector id IS the
  // service id throughout local-index.ts, so a single column does double
  // duty here.
  const row = db
    .query("SELECT 1 AS n FROM sync_state WHERE connector_id = ? LIMIT 1")
    .get(service) as { n?: number } | null;
  if (row !== null) return null;
  return {
    category: "missing_connector",
    detail: `No sync_state row for service \`${service}\`.`,
    remediation: `Run \`nimbus connector auth ${service}\` to register and sync.`,
  };
}

export function detectMissingEntityType(db: Database, type: string): GapNote | null {
  const row = db.query("SELECT 1 AS n FROM graph_entity WHERE type = ? LIMIT 1").get(type) as {
    n?: number;
  } | null;
  if (row !== null) return null;
  const remediation = remediationForEntityType(type);
  const note: GapNote = {
    category: "missing_entity_type",
    detail: `No \`${type}\` graph entities — 0 ${type}s considered.`,
  };
  if (remediation !== undefined) note.remediation = remediation;
  return note;
}

/**
 * Returns a gap note when a relation type is registered in graph_relation_type
 * but no rows have been emitted into graph_relation. Used by subPrReviewed
 * (`reviewed` is a valid type but the populator does not emit it today —
 * spec § Sub-agent decomposition).
 */
export function detectMissingRelationEmit(
  db: Database,
  relationType: string,
  remediation?: string,
): GapNote | null {
  const row = db
    .query("SELECT 1 AS n FROM graph_relation WHERE type = ? LIMIT 1")
    .get(relationType) as { n?: number } | null;
  if (row !== null) return null;
  const note: GapNote = {
    category: "missing_relation_emit",
    detail: `\`${relationType}\` edges are defined in the schema but not yet emitted by the graph populator.`,
  };
  if (remediation !== undefined) note.remediation = remediation;
  return note;
}

/**
 * Aggregate near-duplicate `missing_entity_type` notes into a single combined note,
 * to avoid 3+ lines reading like "no X" / "no Y" / "no Z" when one summary line is
 * clearer (per spec § Sub-agent decomposition for `impact`).
 */
export function aggregateMissingEntityTypes(notes: GapNote[]): GapNote[] {
  const missing = notes.filter((n) => n.category === "missing_entity_type");
  if (missing.length < 2) return notes;
  const others = notes.filter((n) => n.category !== "missing_entity_type");
  const kinds = missing.map((n) => {
    const m = n.detail.match(/`([^`]+)`/);
    return m?.[1] ?? "?";
  });
  const remediations = Array.from(new Set(missing.map((n) => n.remediation).filter(Boolean)));
  const combined: GapNote = {
    category: "missing_entity_type",
    detail: `${missing.length} categories blocked: ${kinds.map((k) => `\`${k}\``).join(" / ")}`,
  };
  if (remediations.length > 0) combined.remediation = remediations.join(" ");
  return [...others, combined];
}
