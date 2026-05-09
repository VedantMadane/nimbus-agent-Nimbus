import { describe, expect, test } from "bun:test";
import type { ExpertBrief, GapNote } from "./findings.ts";
import { isCatchupBrief, isExpertBrief, isImpactBrief } from "./findings.ts";

describe("findings type guards", () => {
  test("isExpertBrief accepts a minimal valid brief", () => {
    const brief: ExpertBrief = {
      kind: "expert",
      agentVersion: 1,
      generatedAt: Date.now(),
      latencyMs: 0,
      gaps: [],
      query: { topicOrFile: "x" },
      ranked: [],
    };
    expect(isExpertBrief(brief)).toBe(true);
  });

  test("isExpertBrief rejects wrong kind", () => {
    expect(isExpertBrief({ ...({} as object), kind: "impact" })).toBe(false);
  });

  test("isExpertBrief rejects null and primitives", () => {
    expect(isExpertBrief(null)).toBe(false);
    expect(isExpertBrief(undefined)).toBe(false);
    expect(isExpertBrief("string")).toBe(false);
    expect(isExpertBrief(42)).toBe(false);
  });

  test("isImpactBrief and isCatchupBrief reject expert kind", () => {
    const expert: ExpertBrief = {
      kind: "expert",
      agentVersion: 1,
      generatedAt: 0,
      latencyMs: 0,
      gaps: [],
      query: { topicOrFile: "x" },
      ranked: [],
    };
    expect(isImpactBrief(expert)).toBe(false);
    expect(isCatchupBrief(expert)).toBe(false);
  });

  test("GapNote remediation is optional", () => {
    const a: GapNote = { category: "empty_index", detail: "no items" };
    const b: GapNote = { category: "empty_index", detail: "no items", remediation: "sync first" };
    expect(a.remediation).toBeUndefined();
    expect(b.remediation).toBe("sync first");
  });
});
