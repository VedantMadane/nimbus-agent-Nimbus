/**
 * Phase 5 T3 PR 2 — `nimbus impact` end-to-end (in-process).
 *
 * Seeds a tiny graph: one repo entity, one PR entity that links to the repo,
 * and one ci_run entity that the repo `triggers`. Calls runImpact directly and
 * asserts the brief shape, the downstream-repo + pipeline buckets, gap-note
 * aggregation, latency budget (<10 s), and the structural HITL-free contract.
 */

import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { isImpactBrief } from "../../../src/agents/_lib/findings.ts";
import { runImpact } from "../../../src/agents/impact.ts";
import { LocalIndex } from "../../../src/index/local-index.ts";

function seedGraph(db: Database): void {
  // Insert a repo, a PR (with service-prefixed external_id matching what
  // graph-populator.ts:45 writes — see itemPrimaryKey at item-store.ts:25),
  // a ci_run, and one `triggers` relation.
  const now = Date.now();
  db.run(
    "INSERT INTO graph_entity (id, type, external_id, label, service, metadata) VALUES " +
      "('graph:repo:acme/payment', 'repo',   'github:acme/payment',         'acme/payment',       'github', '{}')," +
      "('graph:pr:acme/payment#501','pr',    'github:acme/payment#501',     'mitigate retry bug', 'github', '{}')," +
      "('graph:ci_run:acme/payment#42','ci_run','github:acme/payment#42',  'payment CI run #42', 'github', '{}')",
  );
  db.run(
    "INSERT INTO graph_relation (from_id, to_id, type, weight, created_at) VALUES (?, ?, 'triggers', 1.0, ?)",
    ["graph:repo:acme/payment", "graph:ci_run:acme/payment#42", now],
  );
  // Also seed an item so detectEmptyIndex passes.
  db.run(
    "INSERT INTO item (id, service, type, external_id, title, body_preview, modified_at, synced_at, pinned) " +
      "VALUES ('seed', 'github', 'pr', 'acme/payment#501', 't', '', ?, ?, 0)",
    [now, now],
  );
}

describe("nimbus impact (e2e, in-process)", () => {
  test("PR URL resolves to the pr entity; downstream_repo + pipeline findings emitted; latency < 10 s; HITL-free", async () => {
    const db = new Database(":memory:");
    LocalIndex.ensureSchema(db);
    seedGraph(db);

    const start = performance.now();
    const brief = await runImpact(
      { fileOrPrUrl: "https://github.com/acme/payment/pull/501" },
      { db, sessionId: "e2e-impact-1", notify: () => {} },
    );
    const elapsedMs = performance.now() - start;

    expect(elapsedMs).toBeLessThan(10_000);
    expect(isImpactBrief(brief)).toBe(true);
    expect(brief.startEntityId).toBe("graph:pr:acme/payment#501");

    // Downstream-repo bucket from the PR's repo linkage.
    const services = brief.affected.filter((a) => a.category === "service");
    expect(services.some((s) => s.affectedItemId === "graph:repo:acme/payment")).toBe(true);

    // Pipeline bucket from repo → triggers → ci_run.
    const pipelines = brief.affected.filter((a) => a.category === "pipeline");
    expect(pipelines.some((p) => p.affectedItemId === "graph:ci_run:acme/payment#42")).toBe(true);

    // Aggregated gap note for missing entity types (dashboard / pipeline_run /
    // depends_on relation gap). At least one combined missing-entity-type or
    // missing-relation-emit note must be present.
    expect(brief.gaps.length).toBeGreaterThan(0);
  });

  test("file path that resolves nothing reports empty affected list and a startEntityId of null", async () => {
    const db = new Database(":memory:");
    LocalIndex.ensureSchema(db);
    db.run(
      "INSERT INTO item (id, service, type, external_id, title, body_preview, modified_at, synced_at, pinned) " +
        "VALUES ('seed', 'github', 'pr', 'acme/x#1', 'unrelated', '', 0, 0, 0)",
    );
    const brief = await runImpact(
      { fileOrPrUrl: "src/never/exists.ts" },
      { db, sessionId: "e2e-impact-2", notify: () => {} },
    );
    expect(brief.startEntityId).toBeNull();
    expect(brief.affected.length).toBe(0);
  });

  test("structural HITL-free: impact.ts must not import ToolExecutor or HITL_REQUIRED", () => {
    const source = require("node:fs").readFileSync(
      require("node:path").resolve(__dirname, "../../../src/agents/impact.ts"),
      "utf8",
    ) as string;
    expect(source).not.toContain("ToolExecutor");
    expect(source).not.toContain("HITL_REQUIRED");
  });

  test("--service filter: only findings matching the requested service survive", async () => {
    const db = new Database(":memory:");
    LocalIndex.ensureSchema(db);
    seedGraph(db);
    const brief = await runImpact(
      { fileOrPrUrl: "https://github.com/acme/payment/pull/501", service: "pagerduty" },
      { db, sessionId: "e2e-impact-3", notify: () => {} },
    );
    expect(brief.affected.every((a) => a.serviceId === "pagerduty")).toBe(true);
  });
});
