import { wrapToolOutput } from "../../engine/tool-output-envelope.ts";
import type { ExpertBrief, ImpactBrief } from "./findings.ts";
import { renderExpert, renderImpact } from "./render.ts";

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

type SynthInput = ExpertBrief | ImpactBrief;

function deterministicRender(brief: SynthInput): string {
  if (brief.kind === "expert") return renderExpert(brief);
  return renderImpact(brief);
}

function toolNameFor(brief: SynthInput): string {
  return brief.kind === "expert" ? "agents.expert" : "agents.impact";
}

// PR 3 widens this further to accept CatchupBrief once renderCatchup lands.
export async function synthesize(brief: SynthInput, opts: SynthesizeOpts = {}): Promise<string> {
  const deterministic = deterministicRender(brief);
  if (opts.llm === undefined) return deterministic;

  // Invariant I11: any structured payload reaching the LLM is wrapped.
  const wrapped = wrapToolOutput({ service: "nimbus", tool: toolNameFor(brief) }, brief);
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
