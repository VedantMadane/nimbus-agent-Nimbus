import { describe, expect, mock, test } from "bun:test";
import type { ExpertBrief } from "./findings.ts";
import { synthesize } from "./synthesize.ts";

const FIXTURE: ExpertBrief = {
  kind: "expert",
  agentVersion: 1,
  generatedAt: 0,
  latencyMs: 0,
  gaps: [],
  query: { topicOrFile: "src/x.ts" },
  ranked: [],
};

describe("synthesize", () => {
  test("falls back to deterministic render when no LLM provided", async () => {
    const md = await synthesize(FIXTURE);
    expect(md).toContain("# Expert: src/x.ts");
    expect(md).toContain("_no people matched_");
  });

  test("falls back to deterministic render when LLM returns null/empty", async () => {
    const llm = {
      generateMarkdown: mock(async () => null),
    };
    const md = await synthesize(FIXTURE, { llm });
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
    const md = await synthesize(FIXTURE, { llm });
    expect(md).toBe("# LLM-rewritten Markdown");
    expect(seenPrompt[0]).toContain("<tool_output");
    expect(seenPrompt[0]).toContain("</tool_output>");
    expect(seenPrompt[0]).toContain('"kind":"expert"');
  });

  test("on LLM throw, falls back to deterministic render and does not propagate", async () => {
    const llm = {
      generateMarkdown: mock(async () => {
        throw new Error("rate limited");
      }),
    };
    const md = await synthesize(FIXTURE, { llm });
    expect(md).toContain("# Expert: src/x.ts");
  });
});
