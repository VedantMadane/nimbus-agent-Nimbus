import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import {
  detectEmptyIndex,
  detectMissingConnector,
  detectMissingEntityType,
  remediationForEntityType,
} from "./gap-notes.ts";

function freshDb(): Database {
  const db = new Database(":memory:");
  // Use the canonical helper — matches every existing scenario test's pattern.
  // LocalIndex.ensureSchema applies all migrations onto :memory: and gives us
  // the real table names (item / person / graph_entity / graph_relation).
  // F5: do not use ad-hoc CREATE TABLE — those table names will not match
  // what the production code expects.
  return db;
}

// Helper: applied at the top of each test that needs a real schema.
import { LocalIndex } from "../../index/local-index.ts";

function withSchema(db: Database): Database {
  LocalIndex.ensureSchema(db);
  return db;
}

describe("detectEmptyIndex", () => {
  test("returns a gap note when item is empty", () => {
    const db = withSchema(freshDb());
    const note = detectEmptyIndex(db);
    expect(note).not.toBeNull();
    expect(note?.category).toBe("empty_index");
    expect(note?.remediation).toMatch(/nimbus connector sync/);
  });

  test("returns null when item has rows", () => {
    const db = withSchema(freshDb());
    // Use a minimal upsert via the established item-store helper if available,
    // otherwise raw INSERT against the real columns from unified-item-v3-sql.ts.
    db.run(
      `INSERT INTO item (id, service, type, external_id, title, modified_at, synced_at)
       VALUES ('github:x', 'github', 'pr', 'x', 't', 0, 0)`,
    );
    expect(detectEmptyIndex(db)).toBeNull();
  });
});

describe("detectMissingConnector", () => {
  test("returns a gap note when sync_state has no row for the service", () => {
    const db = withSchema(freshDb());
    const note = detectMissingConnector(db, "pagerduty");
    expect(note?.category).toBe("missing_connector");
    expect(note?.detail).toMatch(/pagerduty/);
  });

  test("returns null when the service is registered", () => {
    const db = withSchema(freshDb());
    // F11 — sync_state's PK is connector_id (not `service`); see
    // packages/gateway/src/index/schema-sql.ts. local-index.ts passes the
    // serviceId as connector_id throughout, so the column doubles as the
    // service identifier.
    db.run("INSERT INTO sync_state (connector_id) VALUES ('pagerduty')");
    expect(detectMissingConnector(db, "pagerduty")).toBeNull();
  });
});

describe("detectMissingEntityType", () => {
  test("returns a gap note when graph_entity has no rows of the given type", () => {
    const db = withSchema(freshDb());
    const note = detectMissingEntityType(db, "incident");
    expect(note?.category).toBe("missing_entity_type");
    expect(note?.detail).toMatch(/incident/);
  });

  test("returns null when graph_entity has at least one row of the type", () => {
    const db = withSchema(freshDb());
    db.run(
      `INSERT INTO graph_entity (id, type, external_id, label, service)
       VALUES ('e1', 'incident', 'incident:1', 'PD-INC-1', 'pagerduty')`,
    );
    expect(detectMissingEntityType(db, "incident")).toBeNull();
  });
});

describe("remediationForEntityType", () => {
  test("returns a Phase-5 remediation hint for known data warehouse types", () => {
    expect(remediationForEntityType("dashboard")).toMatch(/Wave D/);
    expect(remediationForEntityType("data_model")).toMatch(/Wave D/);
  });

  test("returns a graph-populator hint for incident / alert / pipeline_run", () => {
    expect(remediationForEntityType("incident")).toMatch(/graph-populator/);
    expect(remediationForEntityType("pipeline_run")).toMatch(/graph-populator/);
  });

  test("returns undefined for unknown types", () => {
    expect(remediationForEntityType("unknown_type")).toBeUndefined();
  });
});

import type { GapNote } from "./findings.ts";
import { aggregateMissingEntityTypes } from "./gap-notes.ts";

describe("aggregateMissingEntityTypes", () => {
  test("collapses 3 missing_entity_type notes into 1 combined note", () => {
    const notes: GapNote[] = [
      {
        category: "missing_entity_type",
        detail: "No `data_model` graph entities — 0 data_models considered.",
      },
      {
        category: "missing_entity_type",
        detail: "No `dashboard` graph entities — 0 dashboards considered.",
      },
      {
        category: "missing_entity_type",
        detail: "No `pipeline_run` graph entities — 0 pipeline_runs considered.",
      },
    ];
    const out = aggregateMissingEntityTypes(notes);
    expect(out).toHaveLength(1);
    expect(out[0]?.detail).toMatch(/3 categories blocked/);
    expect(out[0]?.detail).toContain("`data_model`");
    expect(out[0]?.detail).toContain("`dashboard`");
    expect(out[0]?.detail).toContain("`pipeline_run`");
  });

  test("leaves 1-or-fewer missing_entity_type notes untouched", () => {
    const notes: GapNote[] = [
      {
        category: "missing_entity_type",
        detail: "No `incident` graph entities — 0 incidents considered.",
      },
      { category: "missing_connector", detail: "No sync_state row for `pagerduty`." },
    ];
    const out = aggregateMissingEntityTypes(notes);
    expect(out).toHaveLength(2);
  });
});
