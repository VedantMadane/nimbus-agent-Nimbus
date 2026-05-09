import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { LocalIndex } from "../index/local-index.ts";
import { runImpact } from "./impact.ts";

function freshDb(): Database {
  const db = new Database(":memory:");
  LocalIndex.ensureSchema(db);
  return db;
}

describe("runImpact", () => {
  test("returns a structurally valid ImpactBrief on an empty index", async () => {
    const db = freshDb();
    const brief = await runImpact(
      { fileOrPrUrl: "src/billing/retry.ts" },
      { db, sessionId: "t-1", notify: () => {} },
    );
    expect(brief.kind).toBe("impact");
    expect(brief.agentVersion).toBe(1);
    expect(brief.query.fileOrPrUrl).toBe("src/billing/retry.ts");
    expect(Array.isArray(brief.affected)).toBe(true);
    expect(Array.isArray(brief.gaps)).toBe(true);
    // Empty index → at least one empty_index gap.
    expect(brief.gaps.some((g) => g.category === "empty_index")).toBe(true);
    // Latency captured.
    expect(typeof brief.latencyMs).toBe("number");
  });

  test("aggregates near-duplicate missing-entity gaps into one combined note", async () => {
    const db = freshDb();
    // Seed one item so detectEmptyIndex passes.
    db.run(
      "INSERT INTO item (id, service, type, external_id, title, body_preview, modified_at, synced_at, pinned) VALUES " +
        "('seed', 'github', 'pr', 'acme/x#1', 't', '', 0, 0, 0)",
    );
    // Seed a `symbol` graph_entity so resolveStartEntity returns non-null and
    // sub-agents reach their SQL bodies (instead of early-returning on null start).
    // subPipelines will emit detectMissingEntityType(db, "pipeline_run") gap;
    // subDashboards will emit detectMissingEntityType(db, "dashboard") gap.
    // Two missing_entity_type gaps → aggregateMissingEntityTypes folds them into one.
    db.run(
      "INSERT INTO graph_entity (id, type, external_id, label, service, metadata) VALUES " +
        "('graph:symbol:test', 'symbol', 'item:filesystem:src/x.ts', 'src/x.ts', 'filesystem', '{}')",
    );
    const brief = await runImpact(
      { fileOrPrUrl: "src/x.ts" },
      { db, sessionId: "t-2", notify: () => {} },
    );
    // Two missing_entity_type gaps fire (pipeline_run + dashboard); aggregator
    // collapses them into exactly one combined note.
    const missingEntityGaps = brief.gaps.filter((g) => g.category === "missing_entity_type");
    expect(missingEntityGaps.length).toBe(1);
    expect(missingEntityGaps[0]?.detail).toMatch(/categories blocked/);
  });
});
