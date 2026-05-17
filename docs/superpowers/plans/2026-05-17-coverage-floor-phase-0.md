# Coverage Floor — Phase 0 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the workspace-wide per-file 80% line-coverage floor as a CI gate, with a ratcheting baseline that accepts current state and locks in monotonically rising per-file watermarks. No tests are added to production source files in this PR — Phase 0 only ships the gate itself.

**Architecture:** Three Bun scripts under `scripts/coverage-floor/`: a pure lcov parser, a baseline reader/writer, and a main `check.ts` that walks `packages/*/src/**` independently of the lcov, applies the ratchet rules, and exits non-zero on any violation. A fourth script (`check-exclusion-parity.ts`) keeps the exclusion registry in sync with `sonar-project.properties`. CI wires the gate into the existing `test` job after the unit-test step that produces `coverage/lcov.info`. The seeded baseline accepts every currently-below-80% file so the gate goes green on merge.

**Tech Stack:** Bun (script runtime + `bun:test` framework), TypeScript 6.x strict, Biome (lint/format), no third-party deps. The lcov parser is hand-rolled; the source walker reuses `scripts/structure-audit/lib.ts:iterateSourceFiles` with extra exclusions.

**Spec:** [`docs/superpowers/specs/2026-05-17-coverage-floor-design.md`](../specs/2026-05-17-coverage-floor-design.md) + review feedback in [`...-review-feedback.md`](../specs/2026-05-17-coverage-floor-design-review-feedback.md).

---

## File Structure

| Path | Purpose | New / Modify |
|---|---|---|
| `scripts/coverage-floor/exclusions.ts` | Structural exclusion registry — array of path glob/regex matchers + `isExempt(relPath)` helper | New |
| `scripts/coverage-floor/exclusions.test.ts` | Unit tests for the exemption matcher | New |
| `scripts/coverage-floor/lcov-parse.ts` | Pure lcov parser: text → `Map<relPath, { lines: number; covered: number; pct: number }>` | New |
| `scripts/coverage-floor/lcov-parse.test.ts` | Unit tests for parser | New |
| `scripts/coverage-floor/baseline.ts` | Baseline JSON read/write + diff helpers; the typed shape and the `--update-baseline` rewriter | New |
| `scripts/coverage-floor/baseline.test.ts` | Unit tests for read/write/diff | New |
| `scripts/coverage-floor/check.ts` | Main entry point — orchestrates lcov + source walk + baseline rules → reports + exit code | New |
| `scripts/coverage-floor/check.test.ts` | End-to-end behavioural tests for the check (fixture-driven) | New |
| `scripts/coverage-floor/check-exclusion-parity.ts` | Drift detector — `sonar.coverage.exclusions` ↔ `scripts/coverage-floor/exclusions.ts` | New |
| `scripts/coverage-floor/check-exclusion-parity.test.ts` | Unit tests for parity check | New |
| `docs/structure-audit/coverage-baseline.json` | Seeded baseline JSON (1 file per currently-below-floor source file across the workspace) | New (generated) |
| `docs/contributors/coverage.md` | Contributor docs: what the gate is, how to fix a regression, how to request an exclusion | New |
| `package.json` (root) | Add `audit:coverage-floor` and `audit:coverage-floor:update-baseline` scripts | Modify |
| `.github/workflows/_test-suite.yml` | Add a coverage-floor step inside the `test` job, after the UI vitest coverage step | Modify |

**Design boundaries:** `exclusions.ts` is pure data + matcher (no I/O). `lcov-parse.ts` is pure text → data (no I/O). `baseline.ts` reads/writes JSON via `Bun.file` (one I/O boundary). `check.ts` is the orchestration boundary — it imports the other three and is the only file that exits the process. This keeps each file under 200 lines and easy to test in isolation.

---

## Task 1: Scaffold the directory and the exclusion registry

**Files:**
- Create: `scripts/coverage-floor/exclusions.ts`
- Create: `scripts/coverage-floor/exclusions.test.ts`

The exclusion registry lists path patterns exempt from the floor by construction. Source-of-truth for the spec's "Structural Exclusions" table.

- [ ] **Step 1: Create the exclusions module with the exemption matcher**

Create `scripts/coverage-floor/exclusions.ts`:

```typescript
// Structural exclusion registry for the per-file coverage floor.
//
// Source of truth for the spec §"Structural Exclusions" table. Kept in sync
// with sonar-project.properties' sonar.coverage.exclusions via the parity
// check in check-exclusion-parity.ts.
//
// Patterns are matched against forward-slash repo-relative paths
// (e.g. "packages/gateway/src/vault/win32.ts"). Each entry is one of:
//   - exact path (string)
//   - directory prefix (string ending "/")  → all files under that dir
//   - basename regex (`/^pat$/`)              → matched against path.basename(p)
//   - path regex     (`/^pat$/`)              → matched against the full relPath
//
// Test files (*.test.ts, *.test.tsx) are filtered upstream by the source
// walker; they need not appear here.

export type ExclusionPattern =
  | { kind: "exact"; path: string }
  | { kind: "dirPrefix"; prefix: string }
  | { kind: "basenameRegex"; re: RegExp }
  | { kind: "pathRegex"; re: RegExp };

export const EXCLUSIONS: readonly ExclusionPattern[] = Object.freeze([
  // Platform-specific PAL implementations — only one runs per OS.
  { kind: "exact", path: "packages/gateway/src/vault/win32.ts" },
  { kind: "exact", path: "packages/gateway/src/vault/darwin.ts" },
  { kind: "exact", path: "packages/gateway/src/vault/linux.ts" },
  { kind: "exact", path: "packages/gateway/src/platform/win32.ts" },
  { kind: "exact", path: "packages/gateway/src/platform/darwin.ts" },
  { kind: "exact", path: "packages/gateway/src/platform/linux.ts" },
  { kind: "exact", path: "packages/gateway/src/platform/browser.ts" },

  // Reference benches — run via `nimbus bench` interactive protocol, not bun test.
  { kind: "dirPrefix", prefix: "packages/gateway/src/perf/" },

  // SQL migration constants — one big template string per file, no executable JS.
  { kind: "pathRegex", re: /^packages\/gateway\/src\/index\/[^/]+-v\d+-sql\.ts$/ },

  // Type-only declaration files.
  { kind: "basenameRegex", re: /^types\.ts$/ },
  { kind: "basenameRegex", re: /-types\.ts$/ },

  // GitHub Actions entry points — top-level `await main()` makes in-process
  // testing impossible; helpers extracted to siblings (precedent: PR #326).
  { kind: "pathRegex", re: /^packages\/github-actions\/[^/]+\/src\/main\.ts$/ },
]);

export function isExempt(relPath: string): boolean {
  const normalized = relPath.replaceAll("\\", "/");
  const basename = normalized.split("/").pop() ?? "";
  for (const pattern of EXCLUSIONS) {
    switch (pattern.kind) {
      case "exact":
        if (normalized === pattern.path) return true;
        break;
      case "dirPrefix":
        if (normalized.startsWith(pattern.prefix)) return true;
        break;
      case "basenameRegex":
        if (pattern.re.test(basename)) return true;
        break;
      case "pathRegex":
        if (pattern.re.test(normalized)) return true;
        break;
    }
  }
  return false;
}
```

- [ ] **Step 2: Write the failing tests**

Create `scripts/coverage-floor/exclusions.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";

import { EXCLUSIONS, isExempt } from "./exclusions.ts";

describe("isExempt — platform-specific PAL files", () => {
  test("vault/win32.ts is exempt", () => {
    expect(isExempt("packages/gateway/src/vault/win32.ts")).toBe(true);
  });
  test("vault/darwin.ts is exempt", () => {
    expect(isExempt("packages/gateway/src/vault/darwin.ts")).toBe(true);
  });
  test("vault/linux.ts is exempt", () => {
    expect(isExempt("packages/gateway/src/vault/linux.ts")).toBe(true);
  });
  test("platform/{win32,darwin,linux,browser}.ts are exempt", () => {
    for (const f of ["win32", "darwin", "linux", "browser"]) {
      expect(isExempt(`packages/gateway/src/platform/${f}.ts`)).toBe(true);
    }
  });
  test("vault/factory.ts is NOT exempt (it's the dispatcher, testable)", () => {
    expect(isExempt("packages/gateway/src/vault/factory.ts")).toBe(false);
  });
});

describe("isExempt — perf bench harness", () => {
  test("perf/bench-cli.ts is exempt", () => {
    expect(isExempt("packages/gateway/src/perf/bench-cli.ts")).toBe(true);
  });
  test("nested perf/surfaces/* are exempt", () => {
    expect(isExempt("packages/gateway/src/perf/surfaces/bench-query-latency.ts")).toBe(true);
  });
  test("a non-perf file under gateway/src is NOT exempt", () => {
    expect(isExempt("packages/gateway/src/engine/router.ts")).toBe(false);
  });
});

describe("isExempt — SQL migration constants", () => {
  test("vec-items-1536-v30-sql.ts is exempt", () => {
    expect(isExempt("packages/gateway/src/index/vec-items-1536-v30-sql.ts")).toBe(true);
  });
  test("audit-session-v24-sql.ts is exempt", () => {
    expect(isExempt("packages/gateway/src/index/audit-session-v24-sql.ts")).toBe(true);
  });
  test("a non-migration file under index/ is NOT exempt", () => {
    expect(isExempt("packages/gateway/src/index/local-index.ts")).toBe(false);
  });
});

describe("isExempt — type-only declaration files", () => {
  test("basename types.ts is exempt", () => {
    expect(isExempt("packages/gateway/src/engine/types.ts")).toBe(true);
  });
  test("basename ending in -types.ts is exempt", () => {
    expect(isExempt("packages/gateway/src/search/hybrid-types.ts")).toBe(true);
  });
  test("a file that merely contains 'type' in its name is NOT exempt", () => {
    expect(isExempt("packages/gateway/src/metrics/dora-config.ts")).toBe(false);
  });
});

describe("isExempt — github-actions entry points", () => {
  test("annotate-action/src/main.ts is exempt", () => {
    expect(isExempt("packages/github-actions/annotate-action/src/main.ts")).toBe(true);
  });
  test("preflight-query/src/main.ts is exempt", () => {
    expect(isExempt("packages/github-actions/preflight-query/src/main.ts")).toBe(true);
  });
  test("annotate-action/src/output.ts is NOT exempt (extracted helper)", () => {
    expect(isExempt("packages/github-actions/annotate-action/src/output.ts")).toBe(false);
  });
});

describe("isExempt — path-separator normalization", () => {
  test("backslash-separated paths (Windows) are normalized", () => {
    expect(isExempt("packages\\gateway\\src\\vault\\win32.ts")).toBe(true);
  });
});

describe("EXCLUSIONS — registry shape", () => {
  test("registry is frozen", () => {
    expect(() => {
      // @ts-expect-error — mutating a frozen array must throw in strict mode
      (EXCLUSIONS as unknown as { push: (x: unknown) => void }).push({});
    }).toThrow();
  });
});
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `bun test scripts/coverage-floor/exclusions.test.ts`
Expected: all green (the implementation in Step 1 was written to match these tests).

- [ ] **Step 4: Commit**

```bash
git add scripts/coverage-floor/exclusions.ts scripts/coverage-floor/exclusions.test.ts
git commit -m "feat(coverage-floor): exclusion registry + matcher

Path-based exemptions for the per-file coverage floor:
- vault/{win32,darwin,linux}.ts (one runs per OS)
- platform/{win32,darwin,linux,browser}.ts (same reason)
- perf/** (bench harness, run via interactive nimbus bench)
- index/*-v<N>-sql.ts (SQL constants, no executable JS)
- types.ts + *-types.ts (type-only declarations)
- github-actions/*/src/main.ts (top-level await main() — see PR #326)

isExempt(relPath) is the single matcher consumed by check.ts. Path
separators normalized so Windows-style paths from the source walker
match. Registry is Object.freeze'd."
```

---

## Task 2: lcov parser

**Files:**
- Create: `scripts/coverage-floor/lcov-parse.ts`
- Create: `scripts/coverage-floor/lcov-parse.test.ts`

Bun's `--coverage-reporter=lcov` emits standard LCOV format. We need a single-purpose parser: text → `Map<relPath, FileCoverage>`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/coverage-floor/lcov-parse.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";

import { parseLcov } from "./lcov-parse.ts";

describe("parseLcov", () => {
  test("returns an empty map for empty input", () => {
    expect(parseLcov("").size).toBe(0);
  });

  test("returns an empty map for whitespace-only input", () => {
    expect(parseLcov("\n\n  \n").size).toBe(0);
  });

  test("parses a single record with all DA lines hit", () => {
    const lcov = [
      "TN:",
      "SF:packages/gateway/src/foo.ts",
      "DA:1,1",
      "DA:2,1",
      "DA:3,1",
      "end_of_record",
      "",
    ].join("\n");
    const got = parseLcov(lcov);
    const rec = got.get("packages/gateway/src/foo.ts");
    expect(rec).toEqual({ lines: 3, covered: 3, pct: 100 });
  });

  test("parses a record with partial coverage and computes percent to 2 decimals", () => {
    // 3 of 7 lines covered → 42.857142...% → round to 42.86
    const lines = [
      "SF:packages/gateway/src/bar.ts",
      "DA:1,5",
      "DA:2,0",
      "DA:3,3",
      "DA:4,0",
      "DA:5,1",
      "DA:6,0",
      "DA:7,0",
      "end_of_record",
    ];
    const got = parseLcov(lines.join("\n"));
    const rec = got.get("packages/gateway/src/bar.ts");
    expect(rec).toEqual({ lines: 7, covered: 3, pct: 42.86 });
  });

  test("treats a record with zero DA lines as 100% (empty source)", () => {
    // An empty/all-comment source file still emits an SF record. With zero
    // executable lines, the coverage ratio is undefined; the floor's intent
    // is satisfied (no uncovered lines), so we report 100%.
    const lcov = "SF:packages/gateway/src/types/empty.ts\nend_of_record\n";
    const rec = parseLcov(lcov).get("packages/gateway/src/types/empty.ts");
    expect(rec).toEqual({ lines: 0, covered: 0, pct: 100 });
  });

  test("parses multiple consecutive records", () => {
    const lcov = [
      "SF:a.ts",
      "DA:1,1",
      "end_of_record",
      "SF:b.ts",
      "DA:1,0",
      "DA:2,1",
      "end_of_record",
      "",
    ].join("\n");
    const got = parseLcov(lcov);
    expect(got.get("a.ts")).toEqual({ lines: 1, covered: 1, pct: 100 });
    expect(got.get("b.ts")).toEqual({ lines: 2, covered: 1, pct: 50 });
  });

  test("ignores non-DA/SF lines (BRDA, FN, etc. are not used by the floor)", () => {
    const lcov = [
      "SF:c.ts",
      "FN:1,fooFunc",
      "FNDA:1,fooFunc",
      "FNF:1",
      "FNH:1",
      "DA:1,1",
      "DA:2,0",
      "BRDA:1,0,0,1",
      "LF:2",
      "LH:1",
      "end_of_record",
    ].join("\n");
    const rec = parseLcov(lcov).get("c.ts");
    expect(rec).toEqual({ lines: 2, covered: 1, pct: 50 });
  });

  test("normalizes backslashes in SF paths to forward slashes", () => {
    const lcov = "SF:packages\\gateway\\src\\foo.ts\nDA:1,1\nend_of_record\n";
    const got = parseLcov(lcov);
    expect(got.has("packages/gateway/src/foo.ts")).toBe(true);
    expect(got.has("packages\\gateway\\src\\foo.ts")).toBe(false);
  });

  test("a duplicate SF record (re-emitted from a second test run) keeps the last record", () => {
    // If lcov gets concatenated naively, the same SF can appear twice.
    // We pick the LAST occurrence — matches lcov-merge's "second wins" rule.
    const lcov = [
      "SF:a.ts",
      "DA:1,0",
      "end_of_record",
      "SF:a.ts",
      "DA:1,1",
      "end_of_record",
    ].join("\n");
    expect(parseLcov(lcov).get("a.ts")?.pct).toBe(100);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test scripts/coverage-floor/lcov-parse.test.ts`
Expected: FAIL with "Cannot find module './lcov-parse.ts'" or equivalent.

- [ ] **Step 3: Implement the parser**

Create `scripts/coverage-floor/lcov-parse.ts`:

```typescript
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
      const pct =
        lines === 0
          ? 100
          : Math.round(((100 * covered) / lines) * 100) / 100; // 2 decimal places
      // Duplicate SF: last-wins (mirrors typical lcov-merge semantics).
      out.set(currentFile, { lines, covered, pct });
      currentFile = null;
      lines = 0;
      covered = 0;
    }
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test scripts/coverage-floor/lcov-parse.test.ts`
Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/coverage-floor/lcov-parse.ts scripts/coverage-floor/lcov-parse.test.ts
git commit -m "feat(coverage-floor): pure lcov parser

Single-purpose text->Map<path, FileCoverage> parser. Consumes only
SF: / DA: / end_of_record records (LF/LH semantics vary across
emitters; computing covered/lines from DA directly is more portable).

Empty source files (zero DA records) report 100% — the floor's intent
is 'no uncovered lines', satisfied vacuously. Duplicate SF records
use last-wins, matching lcov-merge convention. Backslash separators
in SF paths are normalized to forward slashes so Windows-emitted
reports match repo-relative paths."
```

---

## Task 3: Baseline file format + reader/writer

**Files:**
- Create: `scripts/coverage-floor/baseline.ts`
- Create: `scripts/coverage-floor/baseline.test.ts`

The baseline lives in `docs/structure-audit/coverage-baseline.json` and is read/written by check.ts. Keep the format strict.

- [ ] **Step 1: Write the failing tests**

Create `scripts/coverage-floor/baseline.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";

import {
  type Baseline,
  computeBaselineDiff,
  parseBaseline,
  serializeBaseline,
} from "./baseline.ts";

describe("parseBaseline", () => {
  test("parses a minimal valid baseline", () => {
    const json = JSON.stringify({
      version: 1,
      generated_at: "2026-05-17T00:00:00Z",
      files: { "packages/gateway/src/foo.ts": { min_coverage_pct: 4.35 } },
    });
    const got = parseBaseline(json);
    expect(got.files.get("packages/gateway/src/foo.ts")).toBe(4.35);
    expect(got.version).toBe(1);
  });

  test("throws on missing version", () => {
    expect(() => parseBaseline(JSON.stringify({ files: {} }))).toThrow(
      /version/,
    );
  });

  test("throws on unsupported version", () => {
    expect(() =>
      parseBaseline(JSON.stringify({ version: 2, generated_at: "x", files: {} })),
    ).toThrow(/version/);
  });

  test("throws on missing generated_at", () => {
    expect(() => parseBaseline(JSON.stringify({ version: 1, files: {} }))).toThrow(
      /generated_at/,
    );
  });

  test("throws on a min_coverage_pct outside 0..100", () => {
    const json = JSON.stringify({
      version: 1,
      generated_at: "2026-05-17T00:00:00Z",
      files: { "a.ts": { min_coverage_pct: 101 } },
    });
    expect(() => parseBaseline(json)).toThrow(/min_coverage_pct/);
  });

  test("throws on invalid JSON", () => {
    expect(() => parseBaseline("not json")).toThrow();
  });

  test("rejects backslash-separated paths with an actionable error", () => {
    // Defensive: --update-baseline always emits forward slashes, but
    // a Windows contributor hand-editing the file might typo a backslash.
    // Silent acceptance would produce a misleading "regressed to 0%"
    // error downstream — hard-fail here instead.
    const json = JSON.stringify({
      version: 1,
      generated_at: "x",
      files: { "packages\\gateway\\src\\foo.ts": { min_coverage_pct: 50 } },
    });
    expect(() => parseBaseline(json)).toThrow(/use forward slashes/);
  });
});

describe("serializeBaseline", () => {
  test("round-trips through parseBaseline", () => {
    const original: Baseline = {
      version: 1,
      generated_at: "2026-05-17T00:00:00Z",
      files: new Map([
        ["packages/gateway/src/a.ts", 4.35],
        ["packages/gateway/src/b.ts", 30.0],
      ]),
    };
    const text = serializeBaseline(original);
    const reparsed = parseBaseline(text);
    expect(reparsed.files.get("packages/gateway/src/a.ts")).toBe(4.35);
    expect(reparsed.files.get("packages/gateway/src/b.ts")).toBe(30.0);
  });

  test("sorts file entries alphabetically for stable diffs", () => {
    const baseline: Baseline = {
      version: 1,
      generated_at: "2026-05-17T00:00:00Z",
      files: new Map([
        ["z/last.ts", 10],
        ["a/first.ts", 20],
        ["m/mid.ts", 30],
      ]),
    };
    const text = serializeBaseline(baseline);
    const firstIdx = text.indexOf("a/first.ts");
    const midIdx = text.indexOf("m/mid.ts");
    const lastIdx = text.indexOf("z/last.ts");
    expect(firstIdx).toBeGreaterThan(-1);
    expect(midIdx).toBeGreaterThan(firstIdx);
    expect(lastIdx).toBeGreaterThan(midIdx);
  });

  test("ends with a single trailing newline", () => {
    const text = serializeBaseline({
      version: 1,
      generated_at: "2026-05-17T00:00:00Z",
      files: new Map(),
    });
    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
  });
});

describe("computeBaselineDiff", () => {
  test("returns empty diff when actual matches baseline", () => {
    const baseline: Baseline = {
      version: 1,
      generated_at: "x",
      files: new Map([["a.ts", 50]]),
    };
    const actual = new Map<string, number>([["a.ts", 50]]);
    expect(computeBaselineDiff(baseline, actual)).toEqual({
      regressions: [],
      mustRaise: [],
      mustRemove: [],
      missingFromActual: [],
    });
  });

  test("flags a regression when actual < baseline", () => {
    const baseline: Baseline = {
      version: 1,
      generated_at: "x",
      files: new Map([["a.ts", 50]]),
    };
    const actual = new Map<string, number>([["a.ts", 40]]);
    const diff = computeBaselineDiff(baseline, actual);
    expect(diff.regressions).toEqual([{ path: "a.ts", baseline: 50, actual: 40 }]);
  });

  test("flags must-raise when actual > baseline and < 80", () => {
    const baseline: Baseline = {
      version: 1,
      generated_at: "x",
      files: new Map([["a.ts", 40]]),
    };
    const actual = new Map<string, number>([["a.ts", 65]]);
    const diff = computeBaselineDiff(baseline, actual);
    expect(diff.mustRaise).toEqual([{ path: "a.ts", baseline: 40, actual: 65 }]);
  });

  test("flags must-remove when actual >= 80", () => {
    const baseline: Baseline = {
      version: 1,
      generated_at: "x",
      files: new Map([["a.ts", 40]]),
    };
    const actual = new Map<string, number>([["a.ts", 82.5]]);
    const diff = computeBaselineDiff(baseline, actual);
    expect(diff.mustRemove).toEqual([{ path: "a.ts", actual: 82.5 }]);
    // Not also flagged as must-raise — the file is exiting the baseline.
    expect(diff.mustRaise).toEqual([]);
  });

  test("flags a baseline file missing from actual lcov (treated as 0%)", () => {
    const baseline: Baseline = {
      version: 1,
      generated_at: "x",
      files: new Map([["a.ts", 40]]),
    };
    const actual = new Map<string, number>();
    const diff = computeBaselineDiff(baseline, actual);
    // Missing means a regression from 40 to 0.
    expect(diff.regressions).toEqual([{ path: "a.ts", baseline: 40, actual: 0 }]);
    expect(diff.missingFromActual).toEqual(["a.ts"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test scripts/coverage-floor/baseline.test.ts`
Expected: FAIL with "Cannot find module './baseline.ts'".

- [ ] **Step 3: Implement the baseline module**

Create `scripts/coverage-floor/baseline.ts`:

```typescript
// Baseline JSON format + diff helpers.
//
// The baseline records the per-file coverage watermark — the minimum
// percentage each below-floor file must remain at. The ratchet rules
// (spec §"The Ratchet") are enforced by computeBaselineDiff: regressions
// fail the gate, must-raise updates fail unless the baseline JSON was
// edited in the same PR, and must-remove entries fail unless the file was
// removed from the baseline JSON in the same PR.

export interface Baseline {
  readonly version: 1;
  readonly generated_at: string; // ISO-8601
  readonly files: Map<string, number>; // relPath → min_coverage_pct
}

export interface BaselineDiff {
  readonly regressions: ReadonlyArray<{ path: string; baseline: number; actual: number }>;
  readonly mustRaise: ReadonlyArray<{ path: string; baseline: number; actual: number }>;
  readonly mustRemove: ReadonlyArray<{ path: string; actual: number }>;
  readonly missingFromActual: ReadonlyArray<string>;
}

export const FLOOR_PCT = 80;

export function parseBaseline(text: string): Baseline {
  const parsed = JSON.parse(text) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("baseline JSON must be an object");
  }
  const obj = parsed as Record<string, unknown>;
  if (obj["version"] !== 1) {
    throw new Error(`baseline version must be 1 (got ${JSON.stringify(obj["version"])})`);
  }
  if (typeof obj["generated_at"] !== "string") {
    throw new Error("baseline generated_at must be an ISO-8601 string");
  }
  const filesRaw = obj["files"];
  if (filesRaw === null || typeof filesRaw !== "object" || Array.isArray(filesRaw)) {
    throw new Error("baseline files must be an object");
  }
  const files = new Map<string, number>();
  for (const [path, entry] of Object.entries(filesRaw as Record<string, unknown>)) {
    // Reject backslash-separated paths up front. The baseline JSON is
    // normally machine-generated by --update-baseline (which always emits
    // forward slashes), but contributors occasionally hand-edit the file
    // to add or adjust entries. On Windows, a typo'd backslash would parse
    // successfully here and then silently mismatch the forward-slash paths
    // in lcov.info, surfacing as a confusing "regression from X% to 0%".
    // Hard-fail with a clear message instead.
    if (path.includes("\\")) {
      throw new Error(
        `baseline entry contains backslash separator: ${JSON.stringify(path)} — use forward slashes (e.g. "packages/gateway/src/foo.ts")`,
      );
    }
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`baseline entry ${path}: must be an object`);
    }
    const pct = (entry as Record<string, unknown>)["min_coverage_pct"];
    if (typeof pct !== "number" || !Number.isFinite(pct) || pct < 0 || pct > 100) {
      throw new Error(`baseline entry ${path}: min_coverage_pct must be a number in [0, 100]`);
    }
    files.set(path, pct);
  }
  return { version: 1, generated_at: obj["generated_at"], files };
}

export function serializeBaseline(b: Baseline): string {
  const sortedKeys = Array.from(b.files.keys()).sort();
  const files: Record<string, { min_coverage_pct: number }> = {};
  for (const k of sortedKeys) {
    const v = b.files.get(k);
    if (v !== undefined) files[k] = { min_coverage_pct: v };
  }
  return `${JSON.stringify(
    { version: b.version, generated_at: b.generated_at, files },
    null,
    2,
  )}\n`;
}

export function computeBaselineDiff(
  baseline: Baseline,
  actual: ReadonlyMap<string, number>,
): BaselineDiff {
  const regressions: Array<{ path: string; baseline: number; actual: number }> = [];
  const mustRaise: Array<{ path: string; baseline: number; actual: number }> = [];
  const mustRemove: Array<{ path: string; actual: number }> = [];
  const missingFromActual: string[] = [];
  for (const [path, minPct] of baseline.files) {
    const present = actual.has(path);
    const actualPct = actual.get(path) ?? 0;
    if (!present) missingFromActual.push(path);
    if (actualPct < minPct) {
      regressions.push({ path, baseline: minPct, actual: actualPct });
    } else if (actualPct >= FLOOR_PCT) {
      mustRemove.push({ path, actual: actualPct });
    } else if (actualPct > minPct) {
      mustRaise.push({ path, baseline: minPct, actual: actualPct });
    }
  }
  return { regressions, mustRaise, mustRemove, missingFromActual };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test scripts/coverage-floor/baseline.test.ts`
Expected: all 14 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/coverage-floor/baseline.ts scripts/coverage-floor/baseline.test.ts
git commit -m "feat(coverage-floor): baseline format + diff helpers

Strict JSON schema (version 1, generated_at, files map of relPath ->
{ min_coverage_pct }). serializeBaseline sorts keys alphabetically for
stable diffs and emits a single trailing newline.

computeBaselineDiff returns four sorted lists per the spec's monotonic
ratchet:
  - regressions: actual < baseline (gate fails)
  - mustRaise:   actual > baseline AND < 80 (PR must update upward)
  - mustRemove:  actual >= 80 (PR must remove from baseline)
  - missingFromActual: baseline entries not present in lcov

A baseline file missing from lcov is treated as 0% (regression from
its recorded min_coverage_pct), closing the gap reviewer item #3
identified."
```

---

## Task 4: Source-tree walker and main check.ts

**Files:**
- Create: `scripts/coverage-floor/check.ts`
- Create: `scripts/coverage-floor/check.test.ts`

`check.ts` is the orchestration entry point. It walks `packages/*/src/**`, intersects with lcov, applies the ratchet, and exits non-zero on any violation.

- [ ] **Step 1: Write the failing tests**

Create `scripts/coverage-floor/check.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";

import { evaluateCheck, type EvaluateInput } from "./check.ts";

const emptyBaseline = {
  version: 1 as const,
  generated_at: "2026-05-17T00:00:00Z",
  files: new Map<string, number>(),
};

function inputWith(overrides: Partial<EvaluateInput>): EvaluateInput {
  return {
    sourceFiles: [],
    actual: new Map(),
    baseline: emptyBaseline,
    ...overrides,
  };
}

describe("evaluateCheck — green paths", () => {
  test("empty workspace passes", () => {
    const r = evaluateCheck(inputWith({}));
    expect(r.exitCode).toBe(0);
    expect(r.violations).toEqual([]);
  });

  test("a non-baseline file at 80% passes", () => {
    const r = evaluateCheck(
      inputWith({
        sourceFiles: ["packages/gateway/src/foo.ts"],
        actual: new Map([["packages/gateway/src/foo.ts", 80]]),
      }),
    );
    expect(r.exitCode).toBe(0);
  });

  test("a baseline file at its watermark passes", () => {
    const r = evaluateCheck(
      inputWith({
        sourceFiles: ["packages/gateway/src/foo.ts"],
        actual: new Map([["packages/gateway/src/foo.ts", 40]]),
        baseline: {
          version: 1,
          generated_at: "x",
          files: new Map([["packages/gateway/src/foo.ts", 40]]),
        },
      }),
    );
    expect(r.exitCode).toBe(0);
  });

  test("an exempt file with no coverage passes (skipped entirely)", () => {
    const r = evaluateCheck(
      inputWith({
        sourceFiles: ["packages/gateway/src/vault/win32.ts"],
        actual: new Map(), // no lcov entry
      }),
    );
    expect(r.exitCode).toBe(0);
  });
});

describe("evaluateCheck — non-baseline file violations", () => {
  test("non-baseline file at 79.99% fails (below floor)", () => {
    const r = evaluateCheck(
      inputWith({
        sourceFiles: ["packages/gateway/src/foo.ts"],
        actual: new Map([["packages/gateway/src/foo.ts", 79.99]]),
      }),
    );
    expect(r.exitCode).toBe(1);
    expect(r.violations).toContainEqual(
      expect.objectContaining({
        kind: "below_floor",
        path: "packages/gateway/src/foo.ts",
        actual: 79.99,
      }),
    );
  });

  test("a non-exempt source file missing from lcov fails (treated as 0%)", () => {
    const r = evaluateCheck(
      inputWith({
        sourceFiles: ["packages/gateway/src/untested.ts"],
        actual: new Map(),
      }),
    );
    expect(r.exitCode).toBe(1);
    expect(r.violations).toContainEqual(
      expect.objectContaining({
        kind: "missing_from_lcov",
        path: "packages/gateway/src/untested.ts",
      }),
    );
  });
});

describe("evaluateCheck — baseline ratchet violations", () => {
  test("regression below baseline fails", () => {
    const r = evaluateCheck(
      inputWith({
        sourceFiles: ["a.ts"],
        actual: new Map([["a.ts", 30]]),
        baseline: {
          version: 1,
          generated_at: "x",
          files: new Map([["a.ts", 40]]),
        },
      }),
    );
    expect(r.exitCode).toBe(1);
    expect(r.violations).toContainEqual(
      expect.objectContaining({ kind: "regression", path: "a.ts" }),
    );
  });

  test("must-raise without baseline update fails (rule 3)", () => {
    const r = evaluateCheck(
      inputWith({
        sourceFiles: ["a.ts"],
        actual: new Map([["a.ts", 65]]),
        baseline: {
          version: 1,
          generated_at: "x",
          files: new Map([["a.ts", 40]]),
        },
      }),
    );
    expect(r.exitCode).toBe(1);
    expect(r.violations).toContainEqual(
      expect.objectContaining({ kind: "must_raise", path: "a.ts" }),
    );
  });

  test("must-remove without baseline removal fails (rule 4)", () => {
    const r = evaluateCheck(
      inputWith({
        sourceFiles: ["a.ts"],
        actual: new Map([["a.ts", 85]]),
        baseline: {
          version: 1,
          generated_at: "x",
          files: new Map([["a.ts", 40]]),
        },
      }),
    );
    expect(r.exitCode).toBe(1);
    expect(r.violations).toContainEqual(
      expect.objectContaining({ kind: "must_remove", path: "a.ts" }),
    );
  });
});

describe("evaluateCheck — exemptions and test-file filtering", () => {
  test("exempt files in the source list are skipped even when their actual coverage is < 80", () => {
    const r = evaluateCheck(
      inputWith({
        sourceFiles: [
          "packages/gateway/src/vault/win32.ts",
          "packages/gateway/src/perf/bench-cli.ts",
        ],
        actual: new Map([
          ["packages/gateway/src/vault/win32.ts", 10],
          ["packages/gateway/src/perf/bench-cli.ts", 0],
        ]),
      }),
    );
    expect(r.exitCode).toBe(0);
  });
});

describe("computeUpdatedBaseline (--update-baseline mode)", () => {
  // Imported separately so the failing test forces us to export it.
  test("raises must-raise entries and drops must-remove entries", async () => {
    const { computeUpdatedBaseline } = await import("./check.ts");
    const baseline = {
      version: 1 as const,
      generated_at: "old",
      files: new Map([
        ["raise.ts", 40],
        ["remove.ts", 30],
        ["stable.ts", 50],
        ["regress.ts", 50], // regressions are NOT auto-fixed
      ]),
    };
    const actual = new Map<string, number>([
      ["raise.ts", 70],
      ["remove.ts", 85],
      ["stable.ts", 50],
      ["regress.ts", 30],
    ]);
    const updated = computeUpdatedBaseline(baseline, actual, "new-timestamp");
    expect(updated.files.get("raise.ts")).toBe(70);
    expect(updated.files.has("remove.ts")).toBe(false);
    expect(updated.files.get("stable.ts")).toBe(50);
    // Regressions are kept at their old watermark — the regression is still
    // reported by evaluateCheck and the PR must fix the regression in code.
    expect(updated.files.get("regress.ts")).toBe(50);
    expect(updated.generated_at).toBe("new-timestamp");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test scripts/coverage-floor/check.test.ts`
Expected: FAIL with "Cannot find module './check.ts'".

- [ ] **Step 3: Implement check.ts**

Create `scripts/coverage-floor/check.ts`:

```typescript
#!/usr/bin/env bun
// Per-file coverage-floor gate. See
// docs/superpowers/specs/2026-05-17-coverage-floor-design.md.

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Glob } from "bun";

import {
  type Baseline,
  type BaselineDiff,
  computeBaselineDiff,
  FLOOR_PCT,
  parseBaseline,
  serializeBaseline,
} from "./baseline.ts";
import { isExempt } from "./exclusions.ts";
import { parseLcov } from "./lcov-parse.ts";

const REPO_ROOT = resolve(import.meta.dir, "..", "..");

// ─── Pure orchestrator (testable) ───────────────────────────────────────────

export interface EvaluateInput {
  readonly sourceFiles: ReadonlyArray<string>;
  readonly actual: ReadonlyMap<string, number>;
  readonly baseline: Baseline;
}

export type Violation =
  | { kind: "below_floor"; path: string; actual: number }
  | { kind: "missing_from_lcov"; path: string }
  | { kind: "regression"; path: string; baseline: number; actual: number }
  | { kind: "must_raise"; path: string; baseline: number; actual: number }
  | { kind: "must_remove"; path: string; actual: number };

export interface EvaluateResult {
  readonly exitCode: 0 | 1;
  readonly violations: ReadonlyArray<Violation>;
  readonly diff: BaselineDiff;
}

export function evaluateCheck(input: EvaluateInput): EvaluateResult {
  const violations: Violation[] = [];
  // Rule 1+: every non-exempt source file gets a coverage check.
  for (const path of input.sourceFiles) {
    if (isExempt(path)) continue;
    if (input.baseline.files.has(path)) continue; // baseline rules below
    const actualPct = input.actual.get(path);
    if (actualPct === undefined) {
      violations.push({ kind: "missing_from_lcov", path });
    } else if (actualPct < FLOOR_PCT) {
      violations.push({ kind: "below_floor", path, actual: actualPct });
    }
  }
  // Rule 2-5: baseline-file ratchet.
  const diff = computeBaselineDiff(input.baseline, input.actual);
  for (const r of diff.regressions) {
    violations.push({ kind: "regression", path: r.path, baseline: r.baseline, actual: r.actual });
  }
  for (const m of diff.mustRaise) {
    violations.push({ kind: "must_raise", path: m.path, baseline: m.baseline, actual: m.actual });
  }
  for (const m of diff.mustRemove) {
    violations.push({ kind: "must_remove", path: m.path, actual: m.actual });
  }
  return { exitCode: violations.length === 0 ? 0 : 1, violations, diff };
}

// `--update-baseline` mode: raise must-raise watermarks, drop must-remove
// entries. Regressions are NOT auto-fixed — the PR author must fix the
// regression in code; updating the baseline downward would silently lose
// progress (the whole point of the ratchet).
export function computeUpdatedBaseline(
  baseline: Baseline,
  actual: ReadonlyMap<string, number>,
  generatedAt: string,
): Baseline {
  const next = new Map<string, number>();
  for (const [path, minPct] of baseline.files) {
    const actualPct = actual.get(path) ?? 0;
    if (actualPct >= FLOOR_PCT) continue; // must-remove
    if (actualPct > minPct) {
      next.set(path, actualPct); // must-raise
    } else {
      next.set(path, minPct); // stable or regression (keep old watermark)
    }
  }
  return { version: 1, generated_at: generatedAt, files: next };
}

// ─── I/O boundary ───────────────────────────────────────────────────────────

async function discoverSourceFiles(): Promise<string[]> {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const glob of [
    new Glob("packages/*/src/**/*.ts"),
    new Glob("packages/*/src/**/*.tsx"),
    new Glob("packages/mcp-connectors/*/src/**/*.ts"),
  ]) {
    for await (const rawRel of glob.scan({ cwd: REPO_ROOT })) {
      const rel = rawRel.replaceAll("\\", "/");
      if (seen.has(rel)) continue;
      seen.add(rel);
      if (rel.endsWith(".test.ts")) continue;
      if (rel.endsWith(".test.tsx")) continue;
      if (rel.endsWith(".d.ts")) continue;
      if (rel.includes("/__fixtures__/")) continue;
      if (rel.includes("/test/fixtures/")) continue;
      if (rel.includes("/testing/")) continue;
      out.push(rel);
    }
  }
  return out.sort();
}

function lcovToPctMap(map: ReturnType<typeof parseLcov>): Map<string, number> {
  const out = new Map<string, number>();
  for (const [path, fc] of map) out.set(path, fc.pct);
  return out;
}

function printViolations(violations: ReadonlyArray<Violation>): void {
  for (const v of violations) {
    switch (v.kind) {
      case "below_floor":
        console.error(
          `::error file=${v.path}::coverage ${v.actual}% < ${FLOOR_PCT}% floor`,
        );
        break;
      case "missing_from_lcov":
        console.error(
          `::error file=${v.path}::file has no coverage data in lcov (treated as 0%); add a test or add to the baseline`,
        );
        break;
      case "regression":
        console.error(
          `::error file=${v.path}::coverage regressed from ${v.baseline}% to ${v.actual}%`,
        );
        break;
      case "must_raise":
        console.error(
          `::error file=${v.path}::coverage rose from ${v.baseline}% to ${v.actual}% — baseline must be raised in this PR (run: bun run audit:coverage-floor:update-baseline)`,
        );
        break;
      case "must_remove":
        console.error(
          `::error file=${v.path}::coverage is ${v.actual}% (>= ${FLOOR_PCT}%) — baseline entry must be removed in this PR (run: bun run audit:coverage-floor:update-baseline)`,
        );
        break;
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const updateMode = args.includes("--update-baseline");
  const baselinePathArg = args.find((a, i) => args[i - 1] === "--baseline");
  const baselinePath = baselinePathArg ?? "docs/structure-audit/coverage-baseline.json";
  const lcovPath = process.env.COVERAGE_LCOV_PATH ?? "coverage/lcov.info";

  const absBaseline = resolve(REPO_ROOT, baselinePath);
  const absLcov = resolve(REPO_ROOT, lcovPath);

  if (!existsSync(absLcov)) {
    console.error(`coverage-floor: lcov not found at ${lcovPath}; run \`bun run test:coverage\` first`);
    process.exit(2);
  }

  const lcovText = await Bun.file(absLcov).text();
  const actual = lcovToPctMap(parseLcov(lcovText));
  const baseline = existsSync(absBaseline)
    ? parseBaseline(await Bun.file(absBaseline).text())
    : ({ version: 1 as const, generated_at: new Date().toISOString(), files: new Map<string, number>() } as Baseline);
  const sourceFiles = await discoverSourceFiles();

  if (updateMode) {
    const next = computeUpdatedBaseline(baseline, actual, new Date().toISOString());
    await Bun.write(absBaseline, serializeBaseline(next));
    console.log(
      `coverage-floor: updated baseline at ${baselinePath} (${next.files.size} entries; was ${baseline.files.size})`,
    );
    return;
  }

  const result = evaluateCheck({ sourceFiles, actual, baseline });
  if (result.violations.length === 0) {
    console.log(
      `coverage-floor: ok (${baseline.files.size} baselined files; ${sourceFiles.length} source files scanned)`,
    );
    process.exit(0);
  }
  printViolations(result.violations);
  console.error(
    `coverage-floor: FAILED (${result.violations.length} violation${result.violations.length === 1 ? "" : "s"}). See errors above.`,
  );
  process.exit(1);
}

if (import.meta.main) {
  await main();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test scripts/coverage-floor/check.test.ts`
Expected: all 13 tests pass.

- [ ] **Step 5: Smoke-test the CLI**

Run: `bun scripts/coverage-floor/check.ts 2>&1 | head -5`
Expected: exits 2 with "lcov not found at coverage/lcov.info; run `bun run test:coverage` first" (because no coverage has been generated yet in this fresh state).

- [ ] **Step 6: Commit**

```bash
git add scripts/coverage-floor/check.ts scripts/coverage-floor/check.test.ts
git commit -m "feat(coverage-floor): orchestration entry point

Pure evaluateCheck(input) + computeUpdatedBaseline(...) (both testable
without I/O) plus a thin main() that reads lcov + baseline from disk,
walks packages/*/src/**, and exits non-zero on any violation.

Violation kinds emitted as GitHub Actions annotations
(::error file=...::message) so they surface inline on PRs:
  - below_floor:        non-baseline file < 80%
  - missing_from_lcov:  non-exempt source file absent from lcov (the
                        invisibility gap reviewer item #3 caught)
  - regression:         baseline file dropped below its watermark
  - must_raise:         baseline file rose; PR must update watermark
  - must_remove:        baseline file >= 80%; PR must drop the entry

--update-baseline mode raises must-raise watermarks and drops
must-remove entries; regressions are NOT auto-fixed (the PR author
must fix the regression in code)."
```

---

## Task 5: Seed the baseline against current workspace state

**Files:**
- Create: `docs/structure-audit/coverage-baseline.json`

The baseline must accept every currently-below-80% file so the gate flips on without breaking CI.

- [ ] **Step 1: Generate the workspace lcov**

Run: `bun run test:coverage`
Expected: produces `coverage/lcov.info` at repo root. May take 3-5 minutes; the gateway test suite is large.

- [ ] **Step 2: Generate the seeded baseline**

Run: `bun scripts/coverage-floor/check.ts --update-baseline --baseline docs/structure-audit/coverage-baseline.json`

Note: `--update-baseline` works against an absent baseline (treated as empty), so this command both creates the file and populates it with every currently-below-floor file's actual coverage.

Expected: writes `docs/structure-audit/coverage-baseline.json` with ~78 entries (matches the count from the design spec).

- [ ] **Step 3: Verify the gate now passes against the seeded baseline**

Run: `bun scripts/coverage-floor/check.ts --baseline docs/structure-audit/coverage-baseline.json`
Expected: `coverage-floor: ok (N baselined files; M source files scanned)` and exit code 0.

- [ ] **Step 4: Sanity-check the baseline file**

```bash
# Confirm structure
head -5 docs/structure-audit/coverage-baseline.json
# Expected: { "version": 1, "generated_at": "2026-...", "files": { ...

# Count entries
grep -c "min_coverage_pct" docs/structure-audit/coverage-baseline.json
# Expected: ~78 (workspace-wide; gateway-only is 78 per the design)
```

- [ ] **Step 5: Commit**

```bash
git add docs/structure-audit/coverage-baseline.json
git commit -m "chore(coverage-floor): seed initial baseline

Snapshots every currently-below-80% non-exempt source file across the
workspace at its current line-coverage percentage. The ratchet rules
in check.ts now lock in these watermarks: subsequent PRs must
raise-or-hold each entry, and entries are removed when they reach 80%.

Generated via:
  bun run test:coverage
  bun scripts/coverage-floor/check.ts --update-baseline

The baseline is checked into git deliberately. PRs that change
coverage will produce a same-PR baseline diff; reviewers see the
ratchet move in the diff."
```

---

## Task 6: Exclusion parity check

**Files:**
- Create: `scripts/coverage-floor/check-exclusion-parity.ts`
- Create: `scripts/coverage-floor/check-exclusion-parity.test.ts`

`sonar-project.properties` already encodes some of these exclusions via `sonar.coverage.exclusions`. Drift between the two sources is preventable with a static check.

- [ ] **Step 1: Read the existing sonar-project.properties exclusion patterns**

Note the current `sonar.coverage.exclusions` value (read from the file):
```
**/index/*-v[0-9]*-sql.ts,**/perf/fixtures/synthetic-*-trace.ts,**/perf/surfaces/**
```

The parity check verifies that every pattern in `sonar.coverage.exclusions` is also reflected in `EXCLUSIONS` (i.e. Sonar isn't excluding something the local gate is enforcing).

- [ ] **Step 2: Write the failing tests**

Create `scripts/coverage-floor/check-exclusion-parity.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";

import { findParityGaps } from "./check-exclusion-parity.ts";

describe("findParityGaps", () => {
  test("returns empty when both sides agree (every sonar pattern is exempt locally)", () => {
    // Patterns that match the EXCLUSIONS registry's existing entries.
    const sonarPatterns = [
      "**/index/*-v[0-9]*-sql.ts",
      "packages/gateway/src/perf/**",
    ];
    expect(findParityGaps(sonarPatterns)).toEqual([]);
  });

  test("reports a pattern that has no local exemption equivalent", () => {
    const sonarPatterns = ["**/should-not-match-any-exemption/**"];
    const gaps = findParityGaps(sonarPatterns);
    expect(gaps).toContain("**/should-not-match-any-exemption/**");
  });

  test("permits sonar patterns that are subsets of local exemptions", () => {
    // EXCLUSIONS exempts the entire perf/ directory; a sonar pattern that
    // exempts a sub-path is consistent (not a gap).
    expect(findParityGaps(["packages/gateway/src/perf/fixtures/foo.ts"])).toEqual([]);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bun test scripts/coverage-floor/check-exclusion-parity.test.ts`
Expected: FAIL with "Cannot find module './check-exclusion-parity.ts'".

- [ ] **Step 4: Implement the parity check**

Create `scripts/coverage-floor/check-exclusion-parity.ts`:

```typescript
#!/usr/bin/env bun
// Drift detector for the exclusion registry.
//
// Reads sonar-project.properties' sonar.coverage.exclusions and verifies
// that every pattern there is "covered" by an entry in
// scripts/coverage-floor/exclusions.ts. The reverse direction (a local
// exemption with no sonar counterpart) is permitted — sonar's gate is
// looser than ours; the floor adds discipline sonar wouldn't.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { isExempt } from "./exclusions.ts";

const REPO_ROOT = resolve(import.meta.dir, "..", "..");

function patternToSampleRelPaths(pattern: string): string[] {
  // Convert a glob-ish sonar exclusion to a couple of representative
  // repo-relative path samples. We just check that isExempt() returns true
  // for those samples — i.e. the local registry covers the same territory.
  //
  // We don't synthesize a full glob expander; instead, we pick canonical
  // samples for each pattern shape the project actually uses.
  const samples: string[] = [];
  // `**/index/*-v[0-9]*-sql.ts` → sample under packages/gateway/src/
  if (pattern === "**/index/*-v[0-9]*-sql.ts") {
    samples.push("packages/gateway/src/index/vec-items-1536-v30-sql.ts");
    samples.push("packages/gateway/src/index/audit-session-v24-sql.ts");
    return samples;
  }
  if (pattern === "**/perf/fixtures/synthetic-*-trace.ts") {
    samples.push("packages/gateway/src/perf/fixtures/synthetic-drive-trace.ts");
    return samples;
  }
  if (pattern === "**/perf/surfaces/**") {
    samples.push("packages/gateway/src/perf/surfaces/bench-query-latency.ts");
    return samples;
  }
  if (pattern === "packages/gateway/src/perf/**") {
    samples.push("packages/gateway/src/perf/bench-cli.ts");
    return samples;
  }
  // Direct paths: treat the pattern itself as the sample.
  samples.push(pattern);
  return samples;
}

export function findParityGaps(sonarPatterns: readonly string[]): string[] {
  const gaps: string[] = [];
  for (const pattern of sonarPatterns) {
    const samples = patternToSampleRelPaths(pattern);
    const anyCovered = samples.some((s) => isExempt(s));
    if (!anyCovered) gaps.push(pattern);
  }
  return gaps;
}

// Minimal .properties extractor. Tolerates optional whitespace around the
// `=` and a leading `!`/`#`-prefixed comment line, but does NOT implement
// the full Java .properties spec (no multi-line `\` continuation, no
// unicode escapes). sonar-project.properties is project-controlled and
// single-line for sonar.coverage.exclusions; if a future edit introduces
// a continuation, this script fails CLOSED (reports the patterns it can
// see as a gap) and the maintainer fixes the parser in the same PR.
function readSonarCoverageExclusions(): string[] {
  const propsPath = resolve(REPO_ROOT, "sonar-project.properties");
  if (!existsSync(propsPath)) return [];
  const text = readFileSync(propsPath, "utf8");
  const re = /^\s*sonar\.coverage\.exclusions\s*=\s*(.*?)\s*$/;
  for (const rawLine of text.split(/\r?\n/)) {
    if (rawLine.startsWith("#") || rawLine.startsWith("!")) continue;
    const m = re.exec(rawLine);
    if (m === null) continue;
    const value = m[1] ?? "";
    return value
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }
  return [];
}

async function main(): Promise<void> {
  const sonarPatterns = readSonarCoverageExclusions();
  if (sonarPatterns.length === 0) {
    console.log("check-exclusion-parity: sonar.coverage.exclusions is empty (no parity work)");
    process.exit(0);
  }
  const gaps = findParityGaps(sonarPatterns);
  if (gaps.length === 0) {
    console.log(`check-exclusion-parity: ok (${sonarPatterns.length} sonar patterns all covered)`);
    process.exit(0);
  }
  for (const g of gaps) {
    console.error(
      `::error file=sonar-project.properties::sonar.coverage.exclusions pattern '${g}' has no local exemption in scripts/coverage-floor/exclusions.ts`,
    );
  }
  console.error(`check-exclusion-parity: FAILED (${gaps.length} drift gap${gaps.length === 1 ? "" : "s"})`);
  process.exit(1);
}

if (import.meta.main) {
  await main();
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test scripts/coverage-floor/check-exclusion-parity.test.ts`
Expected: all 3 tests pass.

- [ ] **Step 6: Smoke-test the CLI against the real `sonar-project.properties`**

Run: `bun scripts/coverage-floor/check-exclusion-parity.ts`
Expected: `check-exclusion-parity: ok (3 sonar patterns all covered)` and exit code 0.

- [ ] **Step 7: Commit**

```bash
git add scripts/coverage-floor/check-exclusion-parity.ts scripts/coverage-floor/check-exclusion-parity.test.ts
git commit -m "feat(coverage-floor): exclusion-parity check

Verifies every pattern in sonar.coverage.exclusions has a matching
entry in scripts/coverage-floor/exclusions.ts. Drift in the opposite
direction (a local exemption with no sonar counterpart) is permitted —
the floor's exemption list is stricter than sonar's by design.

The sample-path approach avoids reimplementing a glob expander: each
pattern shape the project actually uses maps to one or two canonical
repo-relative samples that we run through isExempt(). If a new sonar
pattern shape is added, the script will fall through to treating the
pattern itself as the sample, which will fail on the first run — the
contributor updates patternToSampleRelPaths to add the new shape."
```

---

## Task 7: Wire root `package.json` scripts

**Files:**
- Modify: `package.json` (root)

Add the standard `audit:coverage-floor` script alias matching the existing audit-script naming pattern (`audit:invariants`, `audit:openapi-drift`, etc.).

- [ ] **Step 1: Read the relevant section of package.json**

Run: `grep -n '"audit:' package.json | head -10`
Note the line numbers and the existing pattern. The new scripts insert alphabetically among the existing audit entries.

- [ ] **Step 2: Add three new scripts**

Edit `package.json`'s `scripts` section. Insert these three entries alphabetically among the existing `audit:*` scripts:

```json
    "audit:coverage-floor": "bun scripts/coverage-floor/check.ts",
    "audit:coverage-floor:update-baseline": "bun scripts/coverage-floor/check.ts --update-baseline",
    "audit:exclusion-parity": "bun scripts/coverage-floor/check-exclusion-parity.ts",
```

- [ ] **Step 3: Verify the JSON is well-formed**

Run: `bun -e "JSON.parse(require('node:fs').readFileSync('package.json', 'utf8'))" && echo "ok"`
Expected: `ok`. If it fails, fix the JSON syntax (trailing commas, missing quotes).

- [ ] **Step 4: Smoke-test the new scripts**

Run: `bun run audit:exclusion-parity`
Expected: `check-exclusion-parity: ok (3 sonar patterns all covered)` and exit 0.

(Note: `audit:coverage-floor` requires a fresh `coverage/lcov.info`. If you've already deleted it after Task 5, regenerate via `bun run test:coverage`, or skip this smoke test — the CI workflow change in Task 8 will exercise it for real.)

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "chore(coverage-floor): root package.json scripts

  audit:coverage-floor                      runs the per-file 80% gate
  audit:coverage-floor:update-baseline      raises must-raise watermarks
                                            and drops must-remove entries
  audit:exclusion-parity                    sonar.coverage.exclusions <->
                                            local registry drift check

Naming mirrors the existing audit:* family (audit:invariants,
audit:openapi-drift, etc.)."
```

---

## Task 8: Wire the gate into CI

**Files:**
- Modify: `.github/workflows/_test-suite.yml`

The gate runs in the `test` job (same job that produces `coverage/lcov.info`), after the existing "UI unit coverage" step at line 229. Before the SonarCloud scan, so a failure short-circuits the rest of the job.

- [ ] **Step 1: Read the current step ordering around line 229**

Run: `sed -n '220,260p' .github/workflows/_test-suite.yml`
Note the indentation (2 spaces) and the surrounding step names so the new step lands in the right place.

- [ ] **Step 2: Insert the coverage-floor and exclusion-parity steps**

Edit `.github/workflows/_test-suite.yml`. **After** the existing step `UI unit coverage (WS5 Sub-project A)` (around line 229) and **before** the SonarCloud step, add:

```yaml
      - name: Coverage floor — per-file 80% gate
        if: runner.os == 'Linux'
        # The PR gate is Ubuntu-only (matches the pre-existing pr-quality
        # pattern). The 3-OS push matrix still runs `bun test --coverage`
        # on all three OSes, but the floor gate only runs on Linux because
        # platform-specific files (vault/{win32,darwin,linux}.ts) are
        # exempt from the registry — running the gate on Windows/macOS
        # would not change its verdict.
        shell: bash
        run: bun run audit:coverage-floor

      - name: Coverage floor — exclusion parity (sonar <-> registry)
        if: runner.os == 'Linux'
        shell: bash
        run: bun run audit:exclusion-parity
```

(If the SonarCloud step starts with `- name: SonarQube Cloud analysis`, insert the two new steps directly above it.)

- [ ] **Step 3: Validate the YAML syntax locally**

The `yaml` package is in root `devDependencies` (verified: `"yaml": "^2.9.0"` in `package.json`), so no install step is needed.

Run: `bun -e "const yaml = require('yaml'); yaml.parse(require('node:fs').readFileSync('.github/workflows/_test-suite.yml', 'utf8')); console.log('ok')"`
Expected: `ok`. If the parse throws, fix the indentation — YAML is whitespace-sensitive.

If `bun install` hasn't been run in this worktree yet (e.g. fresh checkout), run that first; otherwise `require('yaml')` will fail with `Cannot find module`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/_test-suite.yml
git commit -m "ci(coverage-floor): wire the per-file gate

Two new steps in the test job, both Linux-only (matches the
pre-existing pr-quality Ubuntu gate; OS-specific files are exempt
from the registry, so running the gate on Windows/macOS would yield
the same verdict):

  - bun run audit:coverage-floor       per-file 80% + ratchet
  - bun run audit:exclusion-parity     sonar <-> registry drift

Inserted after 'UI unit coverage' (so the merged lcov.info is on
disk) and before the SonarCloud step (so a floor failure short-
circuits the rest of the job).

The Sonar step continues to run; this gate adds discipline below
Sonar's project-wide threshold rather than replacing it."
```

---

## Task 9: Contributor documentation

**Files:**
- Create: `docs/contributors/coverage.md`

The docs explain the gate to anyone who hits a red CI run, points at the spec for full rationale, and documents the workflow for fixing each violation kind.

- [ ] **Step 1: Create the docs file**

Create `docs/contributors/coverage.md`:

```markdown
# Coverage Floor — Contributor Guide

This project enforces a **per-file 80% line-coverage floor** workspace-wide. A CI gate fails any PR that introduces a non-exempt source file below 80% or regresses a baselined file below its recorded watermark.

Design: [`docs/superpowers/specs/2026-05-17-coverage-floor-design.md`](../superpowers/specs/2026-05-17-coverage-floor-design.md).

## How the gate works

CI runs `bun run audit:coverage-floor` after the unit-test step in `_test-suite.yml`. The script:

1. Reads `coverage/lcov.info` (the merged workspace lcov).
2. Walks `packages/*/src/**` independently of the lcov — a source file absent from lcov is treated as 0% covered (Bun's V8 coverage only emits entries for imported files, so untested files would otherwise be invisible).
3. Filters out exempt paths (see `scripts/coverage-floor/exclusions.ts`).
4. Compares actual coverage against the ratcheting baseline at `docs/structure-audit/coverage-baseline.json`.
5. Exits non-zero on any violation, surfacing each as a `::error file=...::` annotation so it appears inline on the PR diff.

## Violation kinds and how to fix them

### `below_floor` — new file is below 80%

A non-baseline source file came in below 80%. Add tests until the file reaches ≥80%.

### `missing_from_lcov` — file has no coverage data

The file exists in `packages/*/src/**` but no test imports it. Either:

- Write a test for it (preferred); or
- Add it to the baseline at 0% (`bun run audit:coverage-floor:update-baseline` — only valid if you also commit to climbing the watermark in subsequent PRs).

### `regression` — baseline file dropped

Your changes lowered a baseline file's coverage. Two options:

1. Restore the lost coverage by adding/restoring tests in this PR; OR
2. Identify the deleted code that produced the apparent regression (e.g., a dead function was removed and its tests with it); in that case the regression is real but expected. Discuss with reviewers before pushing forward — the ratchet exists to catch silent regressions, so legitimate drops need a paper trail.

The script never auto-lowers a baseline. Watermarks are monotonically non-decreasing.

### `must_raise` — baseline file improved; baseline must follow

Your changes raised a baseline file's coverage above its recorded watermark. The baseline file must be updated in the same PR — otherwise a later PR could regress back to (old_baseline + 1)% without tripping the gate. Run:

```bash
bun run audit:coverage-floor:update-baseline
```

…then commit the updated `docs/structure-audit/coverage-baseline.json`.

### `must_remove` — baseline file reached 80%

A baselined file now meets the full floor. The baseline entry must be removed in the same PR. Same fix as `must_raise`:

```bash
bun run audit:coverage-floor:update-baseline
```

The script raises must-raise entries and drops must-remove entries in one pass.

## OS-specific code

The PR gate runs on Ubuntu only. Files with inline `process.platform === "win32"` branches will show the `win32` arm as uncovered.

**Preferred:** refactor OS-specific logic into `packages/gateway/src/platform/{win32,darwin,linux}.ts` per `nimbus-architecture.md`. Those files are exempt from the floor by construction.

**Fallback:** add the file to the baseline at its current Ubuntu coverage. Future work (out of scope for the foundation PR) can extend `check.ts` to merge per-OS lcov from the 3-OS push matrix so the cross-OS branch counts as covered.

Comment-based ignores (`/* c8 ignore next */`, `/* istanbul ignore next */`) are **not** supported. Bun's V8 coverage doesn't recognize these markers.

## Requesting an exclusion

If a file is structurally untestable in a single CI run (top-level side effects, OS-specific bindings, code-generation outputs), open a PR that:

1. Adds the path to `scripts/coverage-floor/exclusions.ts` with a comment explaining why.
2. Mirrors the same path in `sonar-project.properties`' `sonar.coverage.exclusions` (drift between the two is caught by `audit:exclusion-parity`).
3. Removes the path's entry from `docs/structure-audit/coverage-baseline.json` if it had one.

Exclusions are a last resort — prefer testability refactors (extract pure helpers to a sibling file, as PR #326 did for `setOutput`).

## Running the gate locally

```bash
bun run test:coverage                              # produces coverage/lcov.info
bun run audit:coverage-floor                       # the gate
bun run audit:coverage-floor:update-baseline       # raise + remove diffs
bun run audit:exclusion-parity                     # sonar drift check
```

The full CI parity command is `bun run test:ci`.
```

- [ ] **Step 2: Verify the markdown renders cleanly**

Run: `bunx markdownlint-cli2 docs/contributors/coverage.md 2>&1 | tail -5`
Expected: no errors (the project uses `markdownlint-cli2`; per the existing scripts it gates docs).

- [ ] **Step 3: Commit**

```bash
git add docs/contributors/coverage.md
git commit -m "docs(coverage-floor): contributor guide

How to read each violation kind, how to fix each (including the
\`must_raise\` and \`must_remove\` ratchet semantics), the OS-specific
branch policy (PAL refactor preferred, baseline absorption fallback,
comment-based ignores NOT supported by Bun's V8 coverage), and how
to request a structural exclusion.

Cross-links the design spec for full rationale."
```

---

## Task 10: Update CLAUDE.md and the nimbus-commands skill reference

**Files:**
- Modify: `CLAUDE.md`
- Modify: `.claude/commands/nimbus-commands.md`

Both files document the project's CI gates and scripts. Adding the new gate keeps the documentation source-of-truth accurate.

- [ ] **Step 1: Add the gate to CLAUDE.md's project status / commands section**

Read `CLAUDE.md` line by line and find the most appropriate insertion point — typically a sentence in the "Status" line or a "See Also" list. The minimal change: add `audit:coverage-floor` to whichever section enumerates the gates (search for `audit:invariants` to find the parallel reference).

For this project's CLAUDE.md, the audit gates are not enumerated in the top-level file. The right place is the `nimbus-commands` skill (next step).

- [ ] **Step 2: Update `.claude/commands/nimbus-commands.md`**

Search for the "Structure audit (Phase 4 B3)" section in the file. Add the new gates to the bash code block alongside the existing `audit:*` scripts. The minimal addition (matching the surrounding style):

```bash
bun run audit:coverage-floor            # per-file 80% line-coverage floor (with ratcheting baseline)
bun run audit:exclusion-parity          # sonar.coverage.exclusions <-> local registry drift check
```

Below the bash block, in the baselines list, add:

```
docs/structure-audit/coverage-baseline.json    # per-file coverage ratcheting baseline
```

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/nimbus-commands.md
git commit -m "docs(skill): nimbus-commands — coverage-floor + parity gates

Adds the two new audit:* scripts and the coverage-baseline.json
baseline reference to the structure-audit section. Matches the
established pattern for other audit gates."
```

---

## Task 11: Final smoke + opening the PR

**Files:** none — this task is verification only.

- [ ] **Step 1: Run the full pre-flight from a clean state**

```bash
git status                                         # should be clean
bun install                                        # ensure no missing deps
bun run typecheck                                  # full workspace typecheck
bun run lint                                       # biome
bun test scripts/coverage-floor                    # full coverage-floor test suite
```

Expected:
- `git status`: clean (or only the worktree's pre-existing `.claude/scheduled_tasks.lock` modification)
- typecheck: gateway, cli, ui, docs all exit code 0
- lint: no errors
- coverage-floor tests: all green (≥30 tests across the 4 test files)

- [ ] **Step 2: Run the gate end-to-end against the freshly-generated lcov**

```bash
bun run test:coverage             # may take several minutes
bun run audit:coverage-floor      # the gate
bun run audit:exclusion-parity    # parity check
```

Expected:
- `audit:coverage-floor` exits 0 with `coverage-floor: ok (N baselined files; M source files scanned)`
- `audit:exclusion-parity` exits 0

- [ ] **Step 3: Push the branch**

```bash
git push -u origin dev/asafgolombek/coverage-floor-design-2026-05-17
```

- [ ] **Step 4: Open the PR**

```bash
gh pr create --title "feat(coverage-floor): per-file 80% line-coverage gate (Phase 0)" --body "$(cat <<'EOF'
## Summary

Phase 0 of the workspace-wide per-file 80% line-coverage floor. Lands the CI gate with a **monotonically-rising baseline ratchet** that accepts current state and locks in every per-file gain from this PR forward.

- New: \`scripts/coverage-floor/\` (exclusions registry, lcov parser, baseline reader/writer, check + parity scripts) + tests
- New: \`docs/structure-audit/coverage-baseline.json\` seeded with currently-below-floor files
- New: \`docs/contributors/coverage.md\` contributor docs
- CI: two new steps in \`_test-suite.yml\` (\`audit:coverage-floor\` + \`audit:exclusion-parity\`)
- Root scripts: \`audit:coverage-floor\`, \`audit:coverage-floor:update-baseline\`, \`audit:exclusion-parity\`

Design + review trail:
- [\`docs/superpowers/specs/2026-05-17-coverage-floor-design.md\`](docs/superpowers/specs/2026-05-17-coverage-floor-design.md)
- [\`docs/superpowers/specs/2026-05-17-coverage-floor-design-review-feedback.md\`](docs/superpowers/specs/2026-05-17-coverage-floor-design-review-feedback.md)
- [\`docs/superpowers/plans/2026-05-17-coverage-floor-phase-0.md\`](docs/superpowers/plans/2026-05-17-coverage-floor-phase-0.md)

## What this PR does NOT do

- No new tests against production source files. Phase 0 ships the gate only.
- No change to the per-subsystem coverage gates (engine ≥85%, vault ≥90%, etc.) — those remain. The per-file floor is additive discipline.
- No change to SonarCloud's project-level gate. The local floor is stricter than Sonar's project threshold.

Phases 1-5 (critical-path tests, connector-sync harness, IPC RPC harness, long tail, non-gateway packages) each get their own follow-up PR per the spec's sequencing.

## How to verify locally

\`\`\`bash
bun run test:coverage
bun run audit:coverage-floor      # exits 0 — baseline accepts current state
bun run audit:exclusion-parity    # exits 0 — sonar/registry agree
bun test scripts/coverage-floor   # unit tests for the gate itself
\`\`\`

## Test plan

- [x] \`bun test scripts/coverage-floor\` — all tests pass (≥30 tests)
- [x] \`bun run audit:coverage-floor\` against seeded baseline — exits 0
- [x] \`bun run audit:exclusion-parity\` — exits 0
- [x] \`bun run typecheck\` — clean
- [x] \`bun run lint\` — clean
- [ ] CI green on Linux: gate runs after UI vitest step, before Sonar step
- [ ] CI green on macOS / Windows: gate skipped (Linux-only step gate)
- [ ] Synthetic regression sanity check (post-merge): introduce a 50% file in a follow-up draft PR, verify the gate fails with the expected \`below_floor\` annotation

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Confirm CI starts on the PR**

```bash
sleep 30 && gh pr view --json statusCheckRollup --jq '.statusCheckRollup[] | "\(.name): \(.status)"' | head -20
```
Expected: the `test` jobs across the 3-OS matrix are queued or running. The `coverage-floor` step is part of the `test` job — it'll show as a sub-step in the GitHub UI.

---

## Spec coverage self-review

- ✅ "scripts/coverage-floor/check.ts" — Task 4
- ✅ "scripts/coverage-floor/exclusions.ts" — Task 1
- ✅ "scripts/coverage-floor/check-exclusion-parity.ts" — Task 6
- ✅ "docs/structure-audit/coverage-baseline.json — seeded" — Task 5
- ✅ "New CI gate \`coverage-floor\` in \`_test-suite.yml\`, PR-blocking on Ubuntu" — Task 8
- ✅ "docs/contributors/coverage.md — how to read the gate, how to update the baseline, how to request an exclusion" — Task 9
- ✅ "Phase 0 acceptance: CI green on \`main\` immediately after merge" — Tasks 5 + 11
- ✅ "CI red on a synthetic regression test" — listed as a post-merge sanity check in the PR test plan; out of scope for the implementation itself
- ✅ Ratchet rules 1-5 from the spec — implemented in `evaluateCheck` + `computeUpdatedBaseline` (Task 4)
- ✅ Source-tree walker (untested-files defence — review item #3) — `discoverSourceFiles` (Task 4)
- ✅ `min_coverage_pct` naming throughout — Tasks 3 + 4 + 9
- ✅ "Bun.spawn doesn't propagate coverage" caveat documented for Phase 5A — referenced in Task 9 docs

No placeholders, all code blocks complete, all file paths exact, all expected outputs specified.
