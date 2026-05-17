import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";

// Hardcoded allowlist of output names this Action declares in action.yml.
// Any other name is rejected — guards against an attacker-controlled call
// site smuggling a new output key into GITHUB_OUTPUT.
export const ALLOWED_OUTPUT_NAMES: ReadonlySet<string> = new Set([
  "external-id",
  "is-new",
  "dora-eligible",
]);

export function setOutput(name: string, value: string): void {
  if (!ALLOWED_OUTPUT_NAMES.has(name)) {
    throw new Error(`refusing to set unknown output: ${name}`);
  }
  const outFile = process.env.GITHUB_OUTPUT;
  if (outFile === undefined) return;
  // Loop until the random delimiter is collision-free with the (possibly
  // tainted) value, matching @actions/core's prepareKeyValueMessage. The
  // collision probability is astronomically low, but the loop turns a
  // dataflow risk into a structural guarantee that the heredoc parser
  // cannot be escaped by adversarial output content.
  let delim: string;
  do {
    delim = `EOF_${randomUUID().replaceAll("-", "")}`;
  } while (value.includes(delim));
  appendFileSync(outFile, `${name}<<${delim}\n${value}\n${delim}\n`);
}
