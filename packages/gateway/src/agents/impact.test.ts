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
    // Seed one item so detectEmptyIndex passes through; sub-agents will then
    // run and emit per-entity-type gaps that aggregateMissingEntityTypes folds together.
    db.run(
      "INSERT INTO item (id, service, type, external_id, title, body_preview, modified_at, synced_at, pinned) VALUES " +
        "('seed', 'github', 'pr', 'acme/x#1', 't', '', 0, 0, 0)",
    );
    const brief = await runImpact(
      { fileOrPrUrl: "src/x.ts" },
      { db, sessionId: "t-2", notify: () => {} },
    );
    const missingEntityGaps = brief.gaps.filter((g) => g.category === "missing_entity_type");
    // The aggregator collapses 2+ near-duplicates into one combined note.
    expect(missingEntityGaps.length).toBeLessThanOrEqual(1);
    if (missingEntityGaps.length === 1) {
      expect(missingEntityGaps[0]?.detail).toMatch(/categories blocked|graph entities/);
    }
  });
});
