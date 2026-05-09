import { wrapToolOutput } from "../../engine/tool-output-envelope.ts";
import type { ExpertBrief } from "./findings.ts";
import { renderExpert } from "./render.ts";

export type SynthesizerLlm = {
  generateMarkdown: (prompt: string) => Promise<string | null>;
};

export type SynthesizeOpts = {
  llm?: SynthesizerLlm;
};

const SYNTHESIS_INSTRUCTIONS = [
  "You are presenting structured findings from a Nimbus built-in agent.",
  "Rewrite the deterministic Markdown into a more readable brief.",
  "Rules:",
  "- Never invent evidence rows; only paraphrase or reorder what is already in the JSON.",
  "- Keep all section headings.",
  "- For each GapNote, include its `remediation` field if present, in plain English.",
  "- If the JSON contains zero ranked findings, say so plainly; do not pad.",
  "- Output Markdown only — no preamble, no code fences around the whole answer.",
].join("\n");

// PR 2 / PR 3 widen this to ImpactBrief / CatchupBrief as their renderers land.
export async function synthesize(brief: ExpertBrief, opts: SynthesizeOpts = {}): Promise<string> {
  const deterministic = renderExpert(brief);
  if (opts.llm === undefined) return deterministic;

  // Invariant I11: any structured payload reaching the LLM is wrapped.
  const wrapped = wrapToolOutput({ service: "nimbus", tool: "agents.expert" }, brief);
  const prompt = [
    SYNTHESIS_INSTRUCTIONS,
    "",
    "Findings:",
    wrapped,
    "",
    "Deterministic fallback rendering (use as a structural template — do not copy verbatim):",
    deterministic,
  ].join("\n");

  try {
    const out = await opts.llm.generateMarkdown(prompt);
    if (out === null || out.trim().length === 0) return deterministic;
    return out;
  } catch {
    return deterministic;
  }
}
