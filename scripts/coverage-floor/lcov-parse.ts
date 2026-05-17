// Pure LCOV-format parser. Consumes the merged coverage/lcov.info written by
// the CI test step (which concatenates per-package lcov reports after
// rewriting their SF: prefixes to be workspace-relative).
//
// We only consume two record kinds:
//   SF:<relPath>     start of a file's record
//   DA:<line>,<hit>  per-line hit count
//   end_of_record    terminates the file's record
//
// Other record kinds (TN, FN, FNDA, FNF, FNH, BRDA, BRF, BRH, LF, LH) are
// ignored. We compute lines + covered from the DA records ourselves rather
// than trusting LF/LH, because the floor's contract is "fraction of
// executable source lines covered" and LF/LH semantics vary slightly across
// emitters.

export interface FileCoverage {
  readonly lines: number; // count of DA records
  readonly covered: number; // count of DA records with hit > 0
  readonly pct: number; // 100 * covered / lines, or 100 when lines === 0
}

export function parseLcov(text: string): Map<string, FileCoverage> {
  const out = new Map<string, FileCoverage>();
  let currentFile: string | null = null;
  let lines = 0;
  let covered = 0;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "") continue;
    if (line.startsWith("SF:")) {
      currentFile = line.slice(3).replaceAll("\\", "/");
      lines = 0;
      covered = 0;
      continue;
    }
    if (line.startsWith("DA:") && currentFile !== null) {
      const comma = line.indexOf(",");
      if (comma === -1) continue;
      lines += 1;
      const hit = Number.parseInt(line.slice(comma + 1), 10);
      if (Number.isFinite(hit) && hit > 0) covered += 1;
      continue;
    }
    if (line === "end_of_record" && currentFile !== null) {
      const pct = lines === 0 ? 100 : Math.round(((100 * covered) / lines) * 100) / 100; // 2 decimal places
      // Duplicate SF: last-wins (mirrors typical lcov-merge semantics).
      out.set(currentFile, { lines, covered, pct });
      currentFile = null;
      lines = 0;
      covered = 0;
    }
  }
  return out;
}
