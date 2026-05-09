import { describe, expect, test } from "bun:test";
import type { ExpertBrief } from "./findings.ts";
import { renderExpert } from "./render.ts";

const BASE: Pick<ExpertBrief, "kind" | "agentVersion" | "generatedAt" | "latencyMs"> = {
  kind: "expert",
  agentVersion: 1,
  generatedAt: 1_700_000_000_000,
  latencyMs: 1400,
};

describe("renderExpert", () => {
  test("full-coverage fixture: top-N section, no Gaps section", () => {
    const brief: ExpertBrief = {
      ...BASE,
      gaps: [],
      query: { topicOrFile: "src/billing/retry.ts" },
      ranked: [
        {
          personId: "p1",
          displayName: "Alice Chen",
          score: 0.92,
          confidence: "high",
          evidence: [
            {
              itemId: "github:org/repo#42",
              type: "pr_authored",
              serviceId: "github",
              title: "fix retry backoff",
              modifiedAt: 1_699_999_900_000,
              weight: 1.0,
            },
          ],
        },
        {
          personId: "p2",
          displayName: "Bob Wong",
          score: 0.55,
          confidence: "medium",
          evidence: [],
        },
      ],
    };
    const md = renderExpert(brief);
    expect(md).toContain("# Expert: src/billing/retry.ts");
    expect(md).toContain("## Top 2");
    expect(md).toContain("**Alice Chen**");
    expect(md).toContain("(high");
    expect(md).toContain("**Bob Wong**");
    expect(md).toContain("(medium");
    expect(md).not.toContain("## Gaps"); // no gaps -> no section
    expect(md).toContain("_generated in 1.4 s_");
  });

  test("sparse fixture: Gaps section listed with remediation", () => {
    const brief: ExpertBrief = {
      ...BASE,
      gaps: [
        {
          category: "missing_entity_type",
          detail: "No `incident` graph entities — 0 incidents considered.",
          remediation:
            "Tracked as a graph-populator follow-up on existing PagerDuty / Sentry connectors.",
        },
      ],
      query: { topicOrFile: "src/billing/retry.ts" },
      ranked: [],
    };
    const md = renderExpert(brief);
    expect(md).toContain("## Top 0");
    expect(md).toContain("_no people matched_");
    expect(md).toContain("## Gaps");
    expect(md).toContain("`incident` graph entities");
    expect(md).toContain("graph-populator follow-up");
  });

  test("renderExpert is deterministic across two calls with the same brief", () => {
    const brief: ExpertBrief = {
      ...BASE,
      gaps: [{ category: "empty_index", detail: "No items.", remediation: "sync" }],
      query: { topicOrFile: "x" },
      ranked: [],
    };
    expect(renderExpert(brief)).toBe(renderExpert(brief));
  });

  test("truncates evidence at 5 rows per finding", () => {
    const brief: ExpertBrief = {
      ...BASE,
      gaps: [],
      query: { topicOrFile: "x" },
      ranked: [
        {
          personId: "p1",
          displayName: "Eva",
          score: 1,
          confidence: "high",
          evidence: Array.from({ length: 7 }, (_, i) => ({
            itemId: `i${i}`,
            type: "pr_authored",
            serviceId: "github",
            title: `evidence row ${i}`,
            modifiedAt: 0,
            weight: 1,
          })),
        },
      ],
    };
    const md = renderExpert(brief);
    expect(md).toContain("evidence row 0");
    expect(md).toContain("evidence row 4");
    expect(md).not.toContain("evidence row 5");
    expect(md).not.toContain("evidence row 6");
    // Confidence-line still reflects the full count (7), even though only 5 are listed.
    expect(md).toContain("(high — 7 evidence rows)");
  });
});
