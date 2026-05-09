import { describe, expect, mock, test } from "bun:test";
import type { ExpertBrief, ImpactBrief } from "./findings.ts";
import { synthesize } from "./synthesize.ts";

const EXPERT_FIXTURE: ExpertBrief = {
  kind: "expert",
  agentVersion: 1,
  generatedAt: 0,
  latencyMs: 0,
  gaps: [],
  query: { topicOrFile: "src/x.ts" },
  ranked: [],
};

const IMPACT_FIXTURE: ImpactBrief = {
  kind: "impact",
  agentVersion: 1,
  generatedAt: 0,
  latencyMs: 0,
  gaps: [],
  query: { fileOrPrUrl: "src/x.ts" },
  startEntityId: null,
  affected: [],
};

describe("synthesize(ExpertBrief)", () => {
  test("falls back to deterministic render when no LLM provided", async () => {
    const md = await synthesize(EXPERT_FIXTURE);
    expect(md).toContain("# Expert: src/x.ts");
    expect(md).toContain("_no people matched_");
  });

  test("falls back to deterministic render when LLM returns null/empty", async () => {
    const llm = {
      generateMarkdown: mock(async () => null),
    };
    const md = await synthesize(EXPERT_FIXTURE, { llm });
    expect(md).toContain("# Expert: src/x.ts");
    expect(llm.generateMarkdown).toHaveBeenCalledTimes(1);
  });

  test("uses LLM output when provided, and wraps payload before passing to LLM", async () => {
    const seenPrompt: string[] = [];
    const llm = {
      generateMarkdown: mock(async (prompt: string) => {
        seenPrompt.push(prompt);
        return "# LLM-rewritten Markdown";
      }),
    };
    const md = await synthesize(EXPERT_FIXTURE, { llm });
    expect(md).toBe("# LLM-rewritten Markdown");
    expect(seenPrompt[0]).toMatch(
      /<tool_output service="nimbus" tool="agents\.expert">[^<]*"kind":"expert"[^<]*<\/tool_output>/,
    );
  });

  test("on LLM throw, falls back to deterministic render and does not propagate", async () => {
    const llm = {
      generateMarkdown: mock(async () => {
        throw new Error("rate limited");
      }),
    };
    const md = await synthesize(EXPERT_FIXTURE, { llm });
    expect(md).toContain("# Expert: src/x.ts");
  });
});

describe("synthesize(ImpactBrief)", () => {
  test("falls back to deterministic render when no LLM provided", async () => {
    const md = await synthesize(IMPACT_FIXTURE);
    expect(md).toContain("# Impact: src/x.ts");
    expect(md).toContain("_no downstream impact resolved_");
  });

  test("falls back to deterministic render when LLM returns null/empty", async () => {
    const llm = {
      generateMarkdown: mock(async () => null),
    };
    const md = await synthesize(IMPACT_FIXTURE, { llm });
    expect(md).toContain("# Impact: src/x.ts");
    expect(llm.generateMarkdown).toHaveBeenCalledTimes(1);
  });

  test("on LLM throw, falls back to deterministic render and does not propagate", async () => {
    const llm = {
      generateMarkdown: mock(async () => {
        throw new Error("rate limited");
      }),
    };
    const md = await synthesize(IMPACT_FIXTURE, { llm });
    expect(md).toContain("# Impact: src/x.ts");
  });

  test("wraps ImpactBrief payload with correct tool name", async () => {
    const seenPrompt: string[] = [];
    const llm = {
      generateMarkdown: mock(async (prompt: string) => {
        seenPrompt.push(prompt);
        return "# LLM-rewritten Impact Markdown";
      }),
    };
    const md = await synthesize(IMPACT_FIXTURE, { llm });
    expect(md).toBe("# LLM-rewritten Impact Markdown");
    expect(seenPrompt[0]).toMatch(
      /<tool_output service="nimbus" tool="agents\.impact">[^<]*"kind":"impact"[^<]*<\/tool_output>/,
    );
  });
});
