# Sub-project D — Phase 2: Benchmark Publishing & Docs Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish reference-machine benchmark numbers to the live docs site at `https://nimbus-agent.dev/perf/`, automatically refreshed on every operator-triggered reference benchmark run.

**Architecture:** A new projection script (`derive-latest-json.ts`) reads the tail of `docs/perf/history.jsonl`, finds the most recent **complete** `reference-m1air` line, and writes it verbatim to `packages/docs/public/perf/latest.json`. The existing `_perf-reference.yml` workflow is extended to invoke that script after the bench runs and to commit both files in one PR. A new Astro component (`BenchmarksTable.astro`) imports `latest.json` at build time and renders a table on a new `/perf/` page; the build hard-fails if the file is missing or has the wrong schema. No `gh-pages` branch and no offline fixture — `latest.json` lives in the repo.

**Tech Stack:** Bun (projection script + tests via `bun test`), TypeScript (no `any` per Non-Negotiable #7), Astro 6 + Starlight 0.38 (renderer), GitHub Actions (workflow change + existing `docs-quality.yml` Starlight-build job verifies the renderer at PR time).

**Source of truth:** [`docs/superpowers/specs/2026-05-14-sub-project-D-phase-2-benchmarks-design.md`](../specs/2026-05-14-sub-project-D-phase-2-benchmarks-design.md).

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `packages/gateway/src/perf/derive-latest-json.ts` | Create | Pure projection function `selectLatestReferenceLine` + atomic writer `writeLatestJson` + CLI wrapper. Treats parsed JSON as `unknown` and validates with a runtime guard before returning a `HistoryLine`. |
| `packages/gateway/src/perf/derive-latest-json.test.ts` | Create | Bun unit tests: identity projection; skips placeholder / GHA / incomplete lines; errors on no qualifying line; atomic write (no `.tmp` left behind). |
| `packages/docs/public/perf/latest.json` | Create | Generated locally during Task 2 from the post-Task-0 `history.jsonl`. Real reference data, committed to the repo. |
| `packages/docs/src/components/BenchmarksTable.astro` | Create | Imports `latest.json` at build time, validates it as `unknown`, renders one table row per surface with metric formatting that depends on the surface family (latency / throughput / RSS / LLM / S10 retries). Unknown surface IDs go in an "Other surfaces" raw-JSON block. |
| `packages/docs/src/content/docs/perf.mdx` | Create | New `/perf/` page. Frontmatter + intro paragraph + `<BenchmarksTable />` + a "How these are measured" link to `reference-runner-setup.md`. |
| `packages/docs/astro.config.mjs` | Modify | Add `{ label: "Performance benchmarks", link: "/perf/" }` to the `Reference` sidebar group, immediately after `{ label: "Telemetry", link: "/telemetry/" }`. |
| `.github/workflows/_perf-reference.yml` | Modify | Insert a "Derive latest.json projection" step after the bench step. Rewrite the sanity-check step to handle 1-file (incomplete-tail) and 2-file (complete-tail) diffs, and to assert `latest.json` semantically equals what a fresh re-derive would produce. Update the `git add` line to stage both files. |
| `docs/perf/reference-runner-setup.md` | Modify | Append one paragraph noting the docs site rebuilds within ~5 minutes of merging a reference-run PR. |

**No changes** to `packages/gateway/src/perf/types.ts`, `history-line.ts`, `_perf.yml`, `docs-publish.yml`, `deploy-docs.yml`, or `docs-quality.yml` (the `Starlight build test` job in `docs-quality.yml` already covers `packages/docs/**` PRs and gives us the PR-time renderer-build verification the spec calls for).

---

## Task 0: Prerequisite — operator action (NOT code)

**Files:** none in this task — operator dispatches an existing workflow.

This task is the prerequisite from §3.2 of the spec. It must complete and the resulting bot PR must be merged to `main` before Task 1 begins. Otherwise `derive-latest-json.test.ts`'s smoke step fails and `BenchmarksTable.astro` fails the docs build.

- [ ] **Step 0.1: Confirm `docs/perf/history.jsonl` lacks a real reference line**

```bash
tail -n 5 docs/perf/history.jsonl | jq -r 'select(.runner == "reference-m1air")' | head -1
```

Expected: empty output (only the placeholder `_comment` line is present today). If you see a JSON object with `runner: "reference-m1air"`, the prerequisite already exists — skip to Step 0.5.

- [ ] **Step 0.2: Trigger the reference benchmark run**

Operator (with access to the registered M1 Air self-hosted runner) follows [`docs/perf/reference-runner-setup.md`](../../perf/reference-runner-setup.md) §"Pre-flight checklist" and §"Trigger a run". Concretely:

1. Complete the §4.2 protocol checklist (AC, no Spotlight, fresh reboot, etc.).
2. Confirm the runner is online: `gh api /repos/nimbus-agent/Nimbus/actions/runners | jq '.runners[] | select(.labels[].name == "reference-m1air")'`.
3. Dispatch: `gh workflow run _perf-reference.yml -f protocol_attested=true -f notes="bootstrap for sub-project D phase 2"`.

- [ ] **Step 0.3: Wait for the workflow to finish and open a PR**

```bash
gh run list --workflow=_perf-reference.yml --limit 1
gh pr list --label perf --state open
```

Expected: one open PR titled `perf: reference benchmark run YYYY-MM-DD (<sha>)` with one `+1` line added to `docs/perf/history.jsonl`.

- [ ] **Step 0.4: Review and merge the bot PR**

```bash
gh pr view <PR-number> --json files,additions,deletions
gh pr merge <PR-number> --squash --delete-branch
```

- [ ] **Step 0.5: Pull `main` into the Phase 2 worktree**

```bash
git fetch origin main
git rebase origin/main
```

Expected: rebase succeeds and `tail -n 1 docs/perf/history.jsonl | jq .runner` prints `"reference-m1air"`.

---

## Task 1: Projection script + tests (test-first)

**Files:**
- Create: `packages/gateway/src/perf/derive-latest-json.ts`
- Create: `packages/gateway/src/perf/derive-latest-json.test.ts`

This is a pure-function module: read a JSONL string, walk backwards, return the first object that satisfies the "complete reference-m1air line" predicate. The CLI wrapper around it does file I/O. Validation happens in TypeScript at the `unknown → HistoryLine` boundary, not via `as` casts.

- [ ] **Step 1.1: Write the test file with all eight test cases**

Create `packages/gateway/src/perf/derive-latest-json.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  deriveLatestJson,
  NoQualifyingLineError,
  selectLatestReferenceLine,
  writeLatestJson,
} from "./derive-latest-json.ts";
import type { HistoryLine } from "./history-line.ts";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "derive-latest-json-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

const referenceLine: HistoryLine = {
  schema_version: 1,
  run_id: "ref-001",
  timestamp: "2026-05-14T10:00:00Z",
  runner: "reference-m1air",
  os_version: "macOS 14.5",
  nimbus_git_sha: "abc1234",
  bun_version: "1.2.0",
  surfaces: {
    S1: { samples_count: 3, p50_ms: 412, p95_ms: 487, p99_ms: 511, max_ms: 530 },
  },
};

const olderReferenceLine: HistoryLine = {
  ...referenceLine,
  run_id: "ref-000",
  timestamp: "2026-05-13T10:00:00Z",
  nimbus_git_sha: "def5678",
};

const ghaLine: HistoryLine = {
  ...referenceLine,
  run_id: "gha-001",
  runner: "gha-ubuntu",
};

const incompleteReferenceLine: HistoryLine = {
  ...referenceLine,
  run_id: "ref-002",
  incomplete: true,
  incomplete_reason: "operator interrupted",
};

const placeholderLine = `{"schema_version":1,"_comment":"Perf bench history."}`;

function writeHistory(...lines: (HistoryLine | string)[]): string {
  const path = join(tmpDir, "history.jsonl");
  const body = `${lines.map((l) => (typeof l === "string" ? l : JSON.stringify(l))).join("\n")}\n`;
  writeFileSync(path, body, "utf8");
  return path;
}

describe("selectLatestReferenceLine", () => {
  test("returns the only line when it is a complete reference run", () => {
    const got = selectLatestReferenceLine(`${JSON.stringify(referenceLine)}\n`);
    expect(got).toEqual(referenceLine);
  });

  test("skips placeholder lines without a runner field", () => {
    const got = selectLatestReferenceLine(
      `${[placeholderLine, JSON.stringify(referenceLine)].join("\n")}\n`,
    );
    expect(got).toEqual(referenceLine);
  });

  test("skips GHA-runner lines and returns the most recent reference line", () => {
    const got = selectLatestReferenceLine(
      `${[JSON.stringify(referenceLine), JSON.stringify(ghaLine)].join("\n")}\n`,
    );
    expect(got).toEqual(referenceLine);
  });

  test("walks past incomplete reference lines to the previous complete one", () => {
    const got = selectLatestReferenceLine(
      `${[JSON.stringify(olderReferenceLine), JSON.stringify(incompleteReferenceLine)].join("\n")}\n`,
    );
    expect(got).toEqual(olderReferenceLine);
  });

  test("treats incomplete: false the same as absent", () => {
    // Construct with incomplete: false at runtime — the public type only
    // permits incomplete?: true, so we cast through `unknown` to avoid a
    // type error while still exercising the runtime branch.
    const raw = { ...referenceLine, incomplete: false } as unknown as HistoryLine;
    const got = selectLatestReferenceLine(`${JSON.stringify(raw)}\n`);
    expect(got.run_id).toBe(referenceLine.run_id);
  });

  test("throws when the file contains only a placeholder line", () => {
    expect(() => selectLatestReferenceLine(`${placeholderLine}\n`)).toThrow();
  });

  test("throws when the file contains only GHA lines", () => {
    expect(() => selectLatestReferenceLine(`${JSON.stringify(ghaLine)}\n`)).toThrow();
  });

  test("throws when every reference line is incomplete", () => {
    expect(() => selectLatestReferenceLine(`${JSON.stringify(incompleteReferenceLine)}\n`)).toThrow();
  });
});

describe("writeLatestJson", () => {
  test("creates parent directories and writes JSON + trailing newline", () => {
    const out = join(tmpDir, "nested/dir/latest.json");
    writeLatestJson(out, referenceLine);
    const written = readFileSync(out, "utf8");
    expect(written).toBe(`${JSON.stringify(referenceLine)}\n`);
  });

  test("overwrites atomically (no .tmp file left behind)", () => {
    const out = join(tmpDir, "latest.json");
    writeLatestJson(out, referenceLine);
    writeLatestJson(out, olderReferenceLine);
    expect(existsSync(`${out}.tmp`)).toBe(false);
    expect(JSON.parse(readFileSync(out, "utf8"))).toEqual(olderReferenceLine);
  });
});

describe("deriveLatestJson (end-to-end)", () => {
  test("writes the most recent complete reference line to output", () => {
    const historyPath = writeHistory(placeholderLine, ghaLine, olderReferenceLine, referenceLine);
    const outputPath = join(tmpDir, "latest.json");
    deriveLatestJson({ historyPath, outputPath });
    expect(JSON.parse(readFileSync(outputPath, "utf8"))).toEqual(referenceLine);
  });

  test("throws NoQualifyingLineError when no complete reference line exists", () => {
    const historyPath = writeHistory(placeholderLine, ghaLine);
    const outputPath = join(tmpDir, "latest.json");
    expect(() => deriveLatestJson({ historyPath, outputPath })).toThrow(NoQualifyingLineError);
    expect(existsSync(outputPath)).toBe(false);
  });

  test("throws when the history file does not exist", () => {
    expect(() =>
      deriveLatestJson({
        historyPath: join(tmpDir, "missing.jsonl"),
        outputPath: join(tmpDir, "latest.json"),
      }),
    ).toThrow(/not found/);
  });
});
```

- [ ] **Step 1.2: Run tests and verify they all fail with module-not-found**

```bash
bun test packages/gateway/src/perf/derive-latest-json.test.ts
```

Expected: `error: Cannot find module './derive-latest-json.ts'`. Every test fails. This confirms the test file imports the right path.

- [ ] **Step 1.3: Write the implementation**

Create `packages/gateway/src/perf/derive-latest-json.ts`:

```typescript
/**
 * Reads docs/perf/history.jsonl, finds the most recent complete
 * reference-m1air HistoryLine, and writes it verbatim to --output.
 *
 * Used by .github/workflows/_perf-reference.yml to produce
 * packages/docs/public/perf/latest.json after each operator-attested
 * reference benchmark run. Pure functions live here for unit tests;
 * the CLI wrapper at the bottom is the workflow entry point.
 *
 * Per Non-Negotiable #7, parsed JSON is treated as `unknown` and
 * validated by isCompleteReferenceLine before being returned as
 * HistoryLine. There are no `as HistoryLine` casts.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { HistoryLine } from "./history-line.ts";

export interface DeriveOptions {
  historyPath: string;
  outputPath: string;
}

export class NoQualifyingLineError extends Error {
  constructor(historyPath: string) {
    super(`no complete reference-m1air line found in ${historyPath}`);
    this.name = "NoQualifyingLineError";
  }
}

/**
 * Runtime predicate: `value` is a HistoryLine for a complete
 * reference-m1air run (the only kind we publish to the docs site).
 *
 * "Complete" = `incomplete` is absent or explicitly `false`. Only
 * `incomplete === true` triggers the skip — this matches the spec
 * §6 wording.
 */
function isCompleteReferenceLine(value: unknown): value is HistoryLine {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.schema_version === 1 &&
    v.runner === "reference-m1air" &&
    v.incomplete !== true &&
    typeof v.run_id === "string" &&
    typeof v.timestamp === "string" &&
    typeof v.os_version === "string" &&
    typeof v.nimbus_git_sha === "string" &&
    typeof v.bun_version === "string" &&
    typeof v.surfaces === "object" &&
    v.surfaces !== null
  );
}

/**
 * Returns the most recent complete reference-m1air line in `historyJsonl`.
 * Throws (caller catches and rewraps as NoQualifyingLineError) when none exists.
 */
export function selectLatestReferenceLine(historyJsonl: string): HistoryLine {
  const lines = historyJsonl.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const raw = lines[i].trim();
    if (raw === "") continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    if (isCompleteReferenceLine(parsed)) return parsed;
  }
  throw new Error("no complete reference-m1air line found");
}

/**
 * Writes `JSON.stringify(line) + "\n"` to outputPath atomically:
 * write to <outputPath>.tmp, then rename. This means a crash mid-write
 * cannot leave a partial file in place.
 */
export function writeLatestJson(outputPath: string, line: HistoryLine): void {
  const parent = dirname(outputPath);
  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true });
  }
  const tmp = `${outputPath}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(line)}\n`, "utf8");
  renameSync(tmp, outputPath);
}

/** End-to-end: read history file, select line, write output. */
export function deriveLatestJson({ historyPath, outputPath }: DeriveOptions): void {
  if (!existsSync(historyPath)) {
    throw new Error(`history file not found: ${historyPath}`);
  }
  const contents = readFileSync(historyPath, "utf8");
  let line: HistoryLine;
  try {
    line = selectLatestReferenceLine(contents);
  } catch {
    throw new NoQualifyingLineError(historyPath);
  }
  writeLatestJson(outputPath, line);
}

/** CLI: bun derive-latest-json.ts --history <path> --output <path> */
function parseArgs(argv: string[]): DeriveOptions {
  let historyPath: string | undefined;
  let outputPath: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--history") historyPath = argv[++i];
    else if (a === "--output") outputPath = argv[++i];
  }
  if (!historyPath || !outputPath) {
    throw new Error(
      "usage: bun derive-latest-json.ts --history <path> --output <path>",
    );
  }
  return { historyPath, outputPath };
}

if (import.meta.main) {
  try {
    deriveLatestJson(parseArgs(process.argv.slice(2)));
    console.log("derive-latest-json: OK");
  } catch (err) {
    console.error(
      `derive-latest-json: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  }
}
```

- [ ] **Step 1.4: Run tests and verify they all pass**

```bash
bun test packages/gateway/src/perf/derive-latest-json.test.ts
```

Expected: all 13 tests pass (8 in `selectLatestReferenceLine`, 2 in `writeLatestJson`, 3 in `deriveLatestJson`).

- [ ] **Step 1.5: Run typecheck on the perf module**

```bash
bun run typecheck
```

Expected: passes. Confirms no `any` leaked in and the type guard satisfies TypeScript.

- [ ] **Step 1.6: Run Biome lint**

```bash
bun run lint
```

Expected: passes (or auto-fixable; if so run `bun run lint:fix`).

- [ ] **Step 1.7: DO NOT COMMIT YET — Task 2 produces `latest.json` for the same commit**

Per spec §3.2, Commit A includes the script + tests **and** the first `latest.json`. Move to Task 2 before committing.

---

## Task 2: Generate the first `latest.json` and commit (Commit A)

**Files:**
- Create: `packages/docs/public/perf/latest.json`

- [ ] **Step 2.1: Run the script against the real history file**

```bash
mkdir -p packages/docs/public/perf
bun packages/gateway/src/perf/derive-latest-json.ts \
  --history docs/perf/history.jsonl \
  --output  packages/docs/public/perf/latest.json
```

Expected stdout: `derive-latest-json: OK` and exit 0. If you see `no complete reference-m1air line found`, Task 0 was not performed — go back and complete it.

- [ ] **Step 2.2: Sanity-check the produced file**

```bash
jq '.schema_version, .runner, .nimbus_git_sha, (.surfaces | length)' packages/docs/public/perf/latest.json
```

Expected output (values vary):

```
1
"reference-m1air"
"<7-or-more-char SHA>"
<some integer ≥ 1>
```

If `schema_version` is not `1`, the schema bumped — return to the design and update the renderer assertions in lockstep.

- [ ] **Step 2.3: Commit A**

```bash
git add packages/gateway/src/perf/derive-latest-json.ts \
        packages/gateway/src/perf/derive-latest-json.test.ts \
        packages/docs/public/perf/latest.json
git commit -m "$(cat <<'EOF'
feat(perf): derive-latest-json projection + first published snapshot

Adds packages/gateway/src/perf/derive-latest-json.ts (pure projection +
CLI) and unit tests covering the placeholder/GHA/incomplete-line skips
required by the spec §6 edge cases.

Generates the first packages/docs/public/perf/latest.json from the
post-prerequisite history.jsonl. The renderer (Task 3-5) hard-fails the
docs build when this file is missing or has the wrong schema, so it has
to land in this commit.

Per Non-Negotiable #7 the script treats parsed JSON as unknown and
validates with isCompleteReferenceLine before returning HistoryLine —
no `as HistoryLine` casts.

Sub-project D Phase 2, Commit A.
EOF
)"
```

---

## Task 3: BenchmarksTable.astro component

**Files:**
- Create: `packages/docs/src/components/BenchmarksTable.astro`

This component imports the JSON file at build time. Astro's import resolves at compile, so the build hard-fails if the file is missing. After import, the component validates the value as `unknown` and asserts schema invariants — second hard-fail layer.

- [ ] **Step 3.1: Create the components directory**

```bash
mkdir -p packages/docs/src/components
```

- [ ] **Step 3.2: Write `BenchmarksTable.astro`**

Create `packages/docs/src/components/BenchmarksTable.astro`:

```astro
---
/**
 * Renders the most recent reference-m1air HistoryLine as a table.
 *
 * Imports packages/docs/public/perf/latest.json at build time. Hard-fails
 * the build (per Sub-project D Phase 2 spec §6) when:
 *   - the file is missing (Astro's import resolution throws)
 *   - schema_version is not 1
 *   - runner is not "reference-m1air"
 *   - any required field is missing
 *
 * Per Non-Negotiable #7, the imported value is treated as `unknown` and
 * validated by isHistoryLineForRender before rendering — no `as` casts.
 */
import latestRaw from "../../public/perf/latest.json";

interface SurfaceMetrics {
  samples_count?: number;
  p50_ms?: number;
  p95_ms?: number;
  p99_ms?: number;
  max_ms?: number;
  throughput_per_sec?: number;
  tokens_per_sec?: number;
  first_token_ms?: number;
  rss_bytes_p95?: number;
  busy_retries?: number;
  stub_reason?: string;
}

interface HistoryLineForRender {
  schema_version: 1;
  run_id: string;
  timestamp: string;
  runner: "reference-m1air";
  os_version: string;
  nimbus_git_sha: string;
  bun_version: string;
  surfaces: Record<string, SurfaceMetrics>;
}

function isHistoryLineForRender(v: unknown): v is HistoryLineForRender {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    r.schema_version === 1 &&
    r.runner === "reference-m1air" &&
    typeof r.run_id === "string" &&
    typeof r.timestamp === "string" &&
    typeof r.os_version === "string" &&
    typeof r.nimbus_git_sha === "string" &&
    typeof r.bun_version === "string" &&
    typeof r.surfaces === "object" &&
    r.surfaces !== null
  );
}

const latest: unknown = latestRaw;
if (!isHistoryLineForRender(latest)) {
  throw new Error(
    "BenchmarksTable: packages/docs/public/perf/latest.json is invalid " +
      "(expected schema_version=1, runner=reference-m1air, all required fields). " +
      "Trigger a reference benchmark run per docs/perf/reference-runner-setup.md " +
      "and merge the resulting PR before rebuilding the docs.",
  );
}

const SURFACE_LABELS: Record<string, string> = {
  S1: "Cold start",
  "S2-a": "Query latency (100k items)",
  "S2-b": "Query latency (1M items)",
  "S2-c": "Query latency (reference)",
  S3: "Dashboard first-paint",
  S4: "TUI first-paint",
  S5: "HITL popup",
  "S6-drive": "Sync throughput — Drive",
  "S6-gmail": "Sync throughput — Gmail",
  "S6-github": "Sync throughput — GitHub",
  "S7-a": "RSS — idle",
  "S7-b": "RSS — heavy sync",
  "S7-c": "RSS — multi-agent",
  S9: "LLM round-trip",
  S10: "SQLite contention writes",
  "S11-a": "CLI overhead — cold",
  "S11-b": "CLI overhead — warm",
};

function labelFor(id: string): string {
  if (SURFACE_LABELS[id]) return SURFACE_LABELS[id];
  if (id.startsWith("S8-")) return `Embedding throughput (${id.slice(3)})`;
  return id;
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatMetric(m: SurfaceMetrics): string {
  if (m.stub_reason) return `stub: ${m.stub_reason}`;
  if (m.tokens_per_sec !== undefined) {
    const ft =
      m.first_token_ms !== undefined
        ? `, first-token ${m.first_token_ms.toFixed(0)} ms`
        : "";
    return `${m.tokens_per_sec.toFixed(1)} tok/sec${ft}`;
  }
  if (m.rss_bytes_p95 !== undefined) {
    return `${formatBytes(m.rss_bytes_p95)} (p95)`;
  }
  if (m.throughput_per_sec !== undefined) {
    const retries =
      m.busy_retries !== undefined ? ` (busy retries: ${m.busy_retries})` : "";
    return `${m.throughput_per_sec.toFixed(1)} items/sec${retries}`;
  }
  if (
    m.p50_ms !== undefined ||
    m.p95_ms !== undefined ||
    m.p99_ms !== undefined
  ) {
    const fmt = (n?: number) => (n === undefined ? "—" : n.toFixed(1));
    return `p50 ${fmt(m.p50_ms)} / p95 ${fmt(m.p95_ms)} / p99 ${fmt(m.p99_ms)} ms`;
  }
  return "—";
}

const surfaceEntries = Object.entries(latest.surfaces);
const knownSurfaces = surfaceEntries.filter(
  ([id]) => id in SURFACE_LABELS || id.startsWith("S8-"),
);
const unknownSurfaces = surfaceEntries.filter(
  ([id]) => !(id in SURFACE_LABELS) && !id.startsWith("S8-"),
);

const sha = latest.nimbus_git_sha.slice(0, 7);
const date = latest.timestamp.slice(0, 10);
---

<p>
  <strong>Run:</strong> <code>{sha}</code> · <strong>{latest.os_version}</strong> ·
  <strong>Bun {latest.bun_version}</strong> · <strong>{date}</strong>
</p>

<table>
  <thead>
    <tr>
      <th>Surface</th>
      <th>Metric</th>
      <th>Samples</th>
    </tr>
  </thead>
  <tbody>
    {
      knownSurfaces.map(([id, metrics]) => (
        <tr>
          <td>
            <code>{id}</code> {labelFor(id)}
          </td>
          <td>{formatMetric(metrics)}</td>
          <td>{metrics.samples_count ?? "—"}</td>
        </tr>
      ))
    }
  </tbody>
</table>

{
  unknownSurfaces.length > 0 && (
    <>
      <h3>Other surfaces</h3>
      <p>
        <em>
          Surface IDs the renderer does not have a row template for. Raw JSON is shown for
          inspection — add a label entry to <code>BenchmarksTable.astro</code> when a new
          surface family is introduced.
        </em>
      </p>
      <pre>
        <code>{JSON.stringify(Object.fromEntries(unknownSurfaces), null, 2)}</code>
      </pre>
    </>
  )
}
```

- [ ] **Step 3.3: DO NOT BUILD YET — `perf.mdx` (Task 4) provides the page that uses this component**

The component compiles in isolation only when imported by a page. Build verification happens at the end of Task 5.

---

## Task 4: `perf.mdx` page

**Files:**
- Create: `packages/docs/src/content/docs/perf.mdx`

- [ ] **Step 4.1: Write the MDX page**

Create `packages/docs/src/content/docs/perf.mdx`:

```mdx
---
title: Performance benchmarks
description: Latest reference-machine benchmark run for the Nimbus Gateway and CLI.
---

import BenchmarksTable from "../../components/BenchmarksTable.astro";

These numbers come from the most recent operator-attested reference run on the project's reference machine — a 2020 M1 MacBook Air (8 GB / 256 GB) registered as a self-hosted GitHub Actions runner with the `reference-m1air` label. They are not gathered on shared CI runners; those numbers exist for regression detection but are too noisy to publish as ground truth. Raw history is in [`docs/perf/history.jsonl`](https://github.com/nimbus-agent/Nimbus/blob/main/docs/perf/history.jsonl).

<BenchmarksTable />

### How these are measured

Each row is one of the bench surfaces defined in [`packages/gateway/src/perf/surfaces/`](https://github.com/nimbus-agent/Nimbus/tree/main/packages/gateway/src/perf/surfaces). The pre-flight protocol (AC powered, no other workloads, fresh reboot) and the full surface catalogue are documented in [the reference-runner setup guide](https://github.com/nimbus-agent/Nimbus/blob/main/docs/perf/reference-runner-setup.md).

The data file (`packages/docs/public/perf/latest.json`) is regenerated by [`packages/gateway/src/perf/derive-latest-json.ts`](https://github.com/nimbus-agent/Nimbus/blob/main/packages/gateway/src/perf/derive-latest-json.ts) on every reference run and committed alongside the new history line.
```

---

## Task 5: Sidebar entry + local docs build (Commit B)

**Files:**
- Modify: `packages/docs/astro.config.mjs`

- [ ] **Step 5.1: Add the sidebar entry**

Edit `packages/docs/astro.config.mjs`. Find the `Reference` group block:

```javascript
        {
          label: "Reference",
          items: [
            { label: "Run from source", link: "/getting-started/" },
            { label: "Query & HTTP", link: "/query-and-http/" },
            { label: "Telemetry", link: "/telemetry/" },
            { label: "Connectors (per-service)", autogenerate: { directory: "connectors" } },
          ],
        },
```

Replace it with:

```javascript
        {
          label: "Reference",
          items: [
            { label: "Run from source", link: "/getting-started/" },
            { label: "Query & HTTP", link: "/query-and-http/" },
            { label: "Telemetry", link: "/telemetry/" },
            { label: "Performance benchmarks", link: "/perf/" },
            { label: "Connectors (per-service)", autogenerate: { directory: "connectors" } },
          ],
        },
```

- [ ] **Step 5.2: Run the docs build to verify the renderer + page + sidebar**

```bash
bun --cwd packages/docs run build
```

Expected: `astro check` reports zero TypeScript errors; `astro build` completes; the output mentions `dist/perf/index.html`. If the build fails with `BenchmarksTable: packages/docs/public/perf/latest.json is invalid`, Task 2 produced a malformed file — diagnose with `jq . packages/docs/public/perf/latest.json`.

If `astro check` complains about `set:html` or unknown JSX, the BenchmarksTable component has a syntax error — re-check Task 3.2 against the literal file you created.

- [ ] **Step 5.3: Optional — visually inspect via `astro dev`**

```bash
bun --cwd packages/docs run dev
```

Open `http://localhost:4321/perf/` in a browser. Verify the table shows surface rows with the SHA / OS / Bun version header above. Stop the dev server with Ctrl+C.

This is informational — the build succeeding in Step 5.2 is the load-bearing check.

- [ ] **Step 5.4: Run typecheck across the workspace**

```bash
bun run typecheck
```

Expected: passes. Catches any type errors in the .astro file that astro check missed (the workspace tsc has stricter settings in some places).

- [ ] **Step 5.5: Commit B**

```bash
git add packages/docs/src/components/BenchmarksTable.astro \
        packages/docs/src/content/docs/perf.mdx \
        packages/docs/astro.config.mjs
git commit -m "$(cat <<'EOF'
feat(docs): render reference benchmarks at /perf/ via BenchmarksTable

Adds a new Starlight page under Reference > Performance benchmarks. The
table is rendered from packages/docs/public/perf/latest.json, which is
imported at build time and validated as `unknown` per Non-Negotiable #7.
Build hard-fails if the file is missing or has the wrong schema, so the
prerequisite reference-run PR (Commit A) must already have landed.

Sub-project D Phase 2, Commit B.
EOF
)"
```

---

## Task 6: `_perf-reference.yml` workflow change (Commit C, part 1)

**Files:**
- Modify: `.github/workflows/_perf-reference.yml`

This is the highest-risk change — it modifies an existing workflow that opens auto-PRs from the M1 Air. The relaxed sanity check needs to handle two cases (complete-tail / incomplete-tail) without weakening the existing safety properties. Per spec §3.2, this commit's modification cannot be verified pre-merge — `workflow_dispatch` reads workflow files from the default branch.

- [ ] **Step 6.1: Insert the projection step**

Read [`.github/workflows/_perf-reference.yml`](../../../.github/workflows/_perf-reference.yml) lines 67–78. Find this block:

```yaml
      - name: Run reference benchmark (3 runs, all surfaces)
        # Direct bench-runner.ts invocation matches the existing _perf.yml
        # pattern. No separate `bun run build` step needed — the bench
        # harness runs against TS source via Bun.
        run: |
          set -euo pipefail
          bun packages/gateway/src/perf/bench-runner.ts \
            --all \
            --reference \
            --runs 3 \
            --protocol-confirmed \
            --history "${{ github.workspace }}/docs/perf/history.jsonl"
```

Add **immediately after** it (before the existing "Sanity-check history.jsonl diff" step):

```yaml
      - name: Derive latest.json projection
        # Reads the new tail of history.jsonl, finds the most recent
        # complete reference-m1air line, writes it verbatim to
        # packages/docs/public/perf/latest.json. If the new tail is itself
        # incomplete, the script walks past it; latest.json is then
        # rewritten with the same content already on disk and git sees no
        # change. Sub-project D Phase 2, spec §5.
        shell: bash
        run: |
          set -euo pipefail
          bun packages/gateway/src/perf/derive-latest-json.ts \
            --history "${{ github.workspace }}/docs/perf/history.jsonl" \
            --output  "${{ github.workspace }}/packages/docs/public/perf/latest.json"
```

- [ ] **Step 6.2: Replace the "Sanity-check history.jsonl diff" step with the relaxed version**

Find the existing step (starts around line 80, ends around line 113):

```yaml
      - name: Sanity-check history.jsonl diff
        id: sanity
        shell: bash
        run: |
          set -euo pipefail
          # 1. Exactly one file modified (no incidental edits).
          changed=$(git status --porcelain | awk '{print $NF}')
          if [[ "$changed" != "docs/perf/history.jsonl" ]]; then
            echo "::error::Expected only docs/perf/history.jsonl to change; got:"
            git status --porcelain
            exit 1
          fi
          # 2. Exactly one line added (count delta — robust against whitespace
          #    diffs and file-creation header noise).
          before=$(git show HEAD:docs/perf/history.jsonl 2>/dev/null | wc -l || echo 0)
          after=$(wc -l < docs/perf/history.jsonl)
          if [[ "$((after - before))" != "1" ]]; then
            echo "::error::Expected +1 line in history.jsonl; got delta $((after - before))"
            exit 1
          fi
          # 3. Last line is a valid JSON record with the expected runner, SHA,
          #    and a populated os_version (proves auto-capture worked).
          last=$(tail -n 1 docs/perf/history.jsonl)
          echo "$last" | jq -e \
            --arg sha "$GITHUB_SHA" \
            '.runner == "reference-m1air"
             and .nimbus_git_sha == $sha
             and (.os_version | type == "string" and length > 0)' \
            >/dev/null || {
              echo "::error::history.jsonl last line failed validation:"
              echo "$last"
              exit 1
            }
          echo "branch=perf/reference-run-$(date -u +%Y-%m-%d)-${GITHUB_SHA::7}" >> "$GITHUB_OUTPUT"
```

Replace it with:

```yaml
      - name: Sanity-check history.jsonl + latest.json diff
        id: sanity
        shell: bash
        run: |
          set -euo pipefail

          # Sub-project D Phase 2 spec §5.2 — the diff must contain
          # docs/perf/history.jsonl plus EITHER packages/docs/public/perf/latest.json
          # (new-tail-complete case) OR nothing else (new-tail-incomplete case).
          # Determine which case we're in by inspecting the new tail.
          new_tail_incomplete=$(tail -n 1 docs/perf/history.jsonl | jq -r '(.incomplete == true)')
          if [[ "$new_tail_incomplete" != "true" && "$new_tail_incomplete" != "false" ]]; then
            echo "::error::Failed to parse new tail of docs/perf/history.jsonl as JSON."
            tail -n 1 docs/perf/history.jsonl
            exit 1
          fi

          # 1. Exactly the right files modified, given the case.
          changed=$(git status --porcelain | awk '{print $NF}' | sort)
          if [[ "$new_tail_incomplete" == "true" ]]; then
            expected=$(printf 'docs/perf/history.jsonl\n' | sort)
          else
            expected=$(printf 'docs/perf/history.jsonl\npackages/docs/public/perf/latest.json\n' | sort)
          fi
          if [[ "$changed" != "$expected" ]]; then
            echo "::error::Unexpected changed files (new_tail_incomplete=$new_tail_incomplete)."
            echo "expected:"
            echo "$expected"
            echo "got:"
            echo "$changed"
            exit 1
          fi

          # 2. history.jsonl: exactly one line added.
          before=$(git show HEAD:docs/perf/history.jsonl 2>/dev/null | wc -l || echo 0)
          after=$(wc -l < docs/perf/history.jsonl)
          if [[ "$((after - before))" != "1" ]]; then
            echo "::error::Expected +1 line in history.jsonl; got delta $((after - before))"
            exit 1
          fi

          # 3. When the new tail is complete: latest.json semantically equals the
          #    output of a fresh re-derive, AND has the expected runner/SHA/os.
          if [[ "$new_tail_incomplete" == "false" ]]; then
            expected_json="${RUNNER_TEMP}/latest.json.expected"
            bun packages/gateway/src/perf/derive-latest-json.ts \
              --history docs/perf/history.jsonl \
              --output  "$expected_json"
            actual_canon=$(jq -S . packages/docs/public/perf/latest.json)
            expected_canon=$(jq -S . "$expected_json")
            if [[ "$actual_canon" != "$expected_canon" ]]; then
              echo "::error::latest.json does not match the projection of the current history.jsonl."
              diff <(echo "$expected_canon") <(echo "$actual_canon") || true
              exit 1
            fi
            jq -e \
              --arg sha "$GITHUB_SHA" \
              '.schema_version == 1
               and .runner == "reference-m1air"
               and .nimbus_git_sha == $sha
               and (.os_version | type == "string" and length > 0)' \
              packages/docs/public/perf/latest.json >/dev/null || {
                echo "::error::latest.json failed sanity assertions:"
                cat packages/docs/public/perf/latest.json
                exit 1
              }
          else
            # Incomplete-tail case: confirm history.jsonl tail still has the
            # expected runner + SHA. (latest.json is unchanged — its content is
            # whatever the previous reference run committed.)
            tail -n 1 docs/perf/history.jsonl | jq -e \
              --arg sha "$GITHUB_SHA" \
              '.runner == "reference-m1air"
               and .nimbus_git_sha == $sha
               and (.os_version | type == "string" and length > 0)' \
              >/dev/null || {
                echo "::error::history.jsonl last line failed validation:"
                tail -n 1 docs/perf/history.jsonl
                exit 1
              }
          fi

          echo "branch=perf/reference-run-$(date -u +%Y-%m-%d)-${GITHUB_SHA::7}" >> "$GITHUB_OUTPUT"
          echo "new_tail_incomplete=$new_tail_incomplete" >> "$GITHUB_OUTPUT"
```

- [ ] **Step 6.3: Update the "Commit and push branch" step to stage both files**

Find the existing step (around line 115–136):

```yaml
      - name: Commit and push branch
        env:
          BRANCH: ${{ steps.sanity.outputs.branch }}
        shell: bash
        run: |
          set -euo pipefail
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          # Pre-check: branch must not already exist on origin. ...
          if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
            echo "::error::Branch $BRANCH already exists on origin. ..."
            echo "  git push origin --delete $BRANCH"
            echo "Or wait until tomorrow for a fresh branch name."
            exit 1
          fi
          git checkout -b "$BRANCH"
          git add docs/perf/history.jsonl
          git commit -m "perf: reference benchmark run $(date -u +%Y-%m-%d) (${GITHUB_SHA::7})"
          git push origin "$BRANCH"
```

Replace the body of the `run:` block with (preserves the comments, only the `git add` / `git commit -m` lines change):

```yaml
      - name: Commit and push branch
        env:
          BRANCH: ${{ steps.sanity.outputs.branch }}
          NEW_TAIL_INCOMPLETE: ${{ steps.sanity.outputs.new_tail_incomplete }}
        shell: bash
        run: |
          set -euo pipefail
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          # Pre-check: branch must not already exist on origin. If it does,
          # the operator is likely re-dispatching after a partial failure;
          # tell them exactly what to do rather than failing with a
          # cryptic git push rejection.
          if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
            echo "::error::Branch $BRANCH already exists on origin. If re-running after a partial failure, delete it first:"
            echo "  git push origin --delete $BRANCH"
            echo "Or wait until tomorrow for a fresh branch name."
            exit 1
          fi
          git checkout -b "$BRANCH"
          # Stage history.jsonl always; stage latest.json only when the new
          # tail was complete (otherwise the file is unchanged on disk and
          # git add is a no-op anyway, but keeping the conditional makes
          # intent explicit).
          git add docs/perf/history.jsonl
          if [[ "$NEW_TAIL_INCOMPLETE" == "false" ]]; then
            git add packages/docs/public/perf/latest.json
          fi
          msg_suffix=""
          if [[ "$NEW_TAIL_INCOMPLETE" == "true" ]]; then
            msg_suffix=" (incomplete — latest.json unchanged)"
          fi
          git commit -m "perf: reference benchmark run $(date -u +%Y-%m-%d) (${GITHUB_SHA::7})${msg_suffix}"
          git push origin "$BRANCH"
```

- [ ] **Step 6.4: Update the PR body to reflect the new file**

Find the "Open perf-labelled PR" step's `body=$(cat <<EOF ... EOF)` block (around line 138–171). Find this section:

```yaml
          ### History line

          One aggregated line (median across 3 runs per surface, spec §4.5) appended to \`docs/perf/history.jsonl\`.
```

Replace it with:

```yaml
          ### History line + published snapshot

          One aggregated line (median across 3 runs per surface, spec §4.5) appended to \`docs/perf/history.jsonl\`. When the run is complete, \`packages/docs/public/perf/latest.json\` is also updated to mirror that line; on merge it ships to <https://nimbus-agent.dev/perf/> within ~5 minutes via the existing docs deploy. (If the run was incomplete, \`latest.json\` is left untouched per spec §5.2.)
```

- [ ] **Step 6.5: Validate the YAML parses**

```bash
bun -e "import('node:fs').then(fs => import('js-yaml').then(yaml => yaml.default.load(fs.readFileSync('.github/workflows/_perf-reference.yml','utf8'))))" && echo "YAML OK"
```

Expected: `YAML OK`. Non-zero exit means a syntax error in the YAML — re-check the indentation of the new step.

---

## Task 7: Reference-runner setup doc note (Commit C, part 2)

**Files:**
- Modify: `docs/perf/reference-runner-setup.md`

- [ ] **Step 7.1: Append the operator-facing note**

Read [`docs/perf/reference-runner-setup.md`](../../perf/reference-runner-setup.md). Find the existing "Trigger a run" section, ending around line 72 with the line:

```markdown
4. Review and merge the PR. PR-C-2b reads the new `history.jsonl` line to populate `SLO_THRESHOLDS` workload values + `baseline.md`.
```

Add **immediately after** it (before the next `## Teardown` section):

```markdown
5. Within ~5 minutes of merging the PR, the docs site at <https://nimbus-agent.dev/perf/> rebuilds automatically and shows the new numbers. The PR contains both `docs/perf/history.jsonl` (the data line) and `packages/docs/public/perf/latest.json` (the rendered projection); merging fires the existing `docs-publish.yml` workflow which redeploys the Starlight site. If the run was incomplete (`incomplete: true` in the new history line), `latest.json` is intentionally left unchanged so the site keeps showing the most recent complete run — see Sub-project D Phase 2 spec §5.2.
```

- [ ] **Step 7.2: Run docs-quality link check locally (best-effort)**

```bash
# Skip if lychee isn't installed locally — CI will catch link errors.
command -v lychee >/dev/null && lychee --no-progress 'docs/perf/reference-runner-setup.md' || echo "lychee not installed; CI will check"
```

Expected: no broken links (or "lychee not installed" — fine, CI runs it).

- [ ] **Step 7.3: Commit C**

```bash
git add .github/workflows/_perf-reference.yml docs/perf/reference-runner-setup.md
git commit -m "$(cat <<'EOF'
ci(perf): wire derive-latest-json into _perf-reference.yml

Adds the projection step after the bench step and rewrites the sanity
check to handle the two new-tail flavors (complete vs incomplete) per
spec §5.2:

- complete tail: 2-file diff (history.jsonl + latest.json), latest.json
  semantically equals a fresh re-derive (jq -S equality)
- incomplete tail: 1-file diff (history.jsonl only), latest.json
  unchanged — preserves the audit trail without publishing partial data

Updates the bot-PR commit message to flag incomplete runs and the bot-PR
body to point reviewers at the live docs URL.

Updates docs/perf/reference-runner-setup.md with a one-paragraph note
explaining what the operator sees on the docs site after a merged
reference-run PR.

This commit's workflow modification cannot be verified pre-merge —
workflow_dispatch reads workflow files from the default branch.
Verification path is post-merge dispatch + observation. The
docs-quality.yml Starlight build job already verifies the renderer at
PR time.

Sub-project D Phase 2, Commit C.
EOF
)"
```

---

## Task 8: Push, open PR, verify CI

**Files:** none modified — git operations and PR review.

- [ ] **Step 8.1: Run the full CI parity check locally**

```bash
bun run typecheck
bun run lint
bun test packages/gateway/src/perf/derive-latest-json.test.ts
bun --cwd packages/docs run build
```

Expected: every command exits 0. If `bun run test:ci` is fast enough to run on this machine, prefer that — it mirrors the full PR CI suite.

- [ ] **Step 8.2: Push the branch**

```bash
git push -u origin dev/asafgolombek/sub-project-D-pr2-benchmarks
```

- [ ] **Step 8.3: Open the PR**

```bash
gh pr create --base main \
  --head dev/asafgolombek/sub-project-D-pr2-benchmarks \
  --title "feat(perf): publish reference benchmarks to docs site at /perf/" \
  --body "$(cat <<'EOF'
## Summary

- Adds `derive-latest-json.ts` (pure projection from `docs/perf/history.jsonl` tail to `packages/docs/public/perf/latest.json`) + tests.
- Adds a Starlight benchmarks page at `/perf/` rendered from `latest.json`. Build hard-fails on missing/version-skewed data per spec §6.
- Extends `_perf-reference.yml` so each operator-attested reference run commits both files in the bot PR; relaxed sanity check handles complete and incomplete tails.

Implements [Sub-project D Phase 2 spec](../docs/superpowers/specs/2026-05-14-sub-project-D-phase-2-benchmarks-design.md). Out of scope: cast tripwire (Phase 3), homepage headline numbers, trend charts.

**Prerequisite:** Task 0 of the plan — an operator triggered a reference benchmark on the M1 Air and merged the resulting bot PR before this work began. `latest.json` in this PR is real data from that run.

## Test plan

- [x] `bun test packages/gateway/src/perf/derive-latest-json.test.ts` — 13 tests pass locally (placeholder/GHA/incomplete skips, atomic write, end-to-end errors).
- [x] `bun --cwd packages/docs run build` succeeds locally; `dist/perf/index.html` is generated.
- [x] `bun run typecheck` and `bun run lint` pass.
- [ ] CI: `docs-quality.yml` "Starlight build test" job is green (validates the renderer at PR time).
- [ ] CI: `pr-quality` (lint + typecheck + unit tests) is green.
- [ ] **Post-merge:** dispatch a fresh `_perf-reference.yml` run on the M1 Air. Observe (a) bot PR contains both `docs/perf/history.jsonl` and `packages/docs/public/perf/latest.json`, (b) merging that PR rebuilds <https://nimbus-agent.dev/perf/> within ~5 minutes with the new numbers.
- [ ] **Post-merge:** also dispatch a deliberately incomplete run (e.g., interrupt the bench mid-flight) and verify the bot PR contains only the history line, with `latest.json` unchanged.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 8.4: Watch CI**

```bash
gh pr checks --watch
```

The two load-bearing checks:

- **`Docs Quality / Starlight build test`** — runs `bun --cwd packages/docs run build`. This catches `BenchmarksTable` schema-assertion failures or `latest.json` malformation. If it fails, re-run Task 5 Step 5.2 locally to diagnose.
- **`pr-quality`** (or whatever lane runs `bun test`) — must include the new `derive-latest-json.test.ts`. If those tests fail in CI but pass locally, suspect line-ending differences or bun version skew.

If both pass, the PR is ready for human review. **Do not auto-merge** — the workflow change in Commit C cannot be verified until after merge.

---

## Out of scope (explicit non-tasks)

These came up during design but are intentionally not implemented in this plan:

| Item | Why it is deferred |
|---|---|
| Cast tripwire (`docs-quality / cast-tripwire`) | Sub-project D **Phase 3**, separate plan. |
| Curated headline numbers on the homepage | Rejected during brainstorming. |
| Offline build fixture (`NIMBUS_DOCS_OFFLINE=1`, `latest.fixture.json`) | Moot — `latest.json` is in the repo, always available locally. |
| Trend charts / "compare to last reference run" UX | YAGNI — single snapshot table only. |
| Historical browse (paginated `history.jsonl` viewer) | YAGNI — raw JSONL is in the repo for anyone who wants it. |
| Auto-deduplication of `docs-publish.yml` ↔ `deploy-docs.yml` | Pre-existing duplication (both trigger on `packages/docs/**`); flagged in spec §8.3 but unrelated to Phase 2. |
| Static-time schema-version structure-audit guard | Single assertion site; the `astro build` failure is loud enough. Re-evaluate at ≥3 schema-coupled call sites. |
| PR-C-2b coupling — populating `SLO_THRESHOLDS` from the new reference line | Tracked separately by the PR-C series; spec §8.2 flags it but it's not in Phase 2's scope. |

---

## Self-review checklist (executed before execution begins)

- **Spec coverage:**
  - §3.1 (data flow) — Tasks 1, 2, 3, 4, 5, 6.
  - §3.2 (implementation ordering) — Task 0 (prereq), Task 2 (Commit A), Task 5 (Commit B), Task 7 (Commit C). Pre-merge renderer build is verified by `docs-quality.yml` (no plan task needed).
  - §4 (file inventory) — every row covered by exactly one task.
  - §5.1 (new step) — Task 6 Step 6.1.
  - §5.2 (relaxed sanity check) — Task 6 Step 6.2 + Step 6.3 (commit-and-push needs the conditional too).
  - §6 (edge cases) — covered by tests in Task 1 (placeholder, GHA, incomplete walk-past) and the workflow change in Task 6 (file-count, semantic equality, stale operator-staged latest.json).
  - §7 (out of scope) — restated above.
  - §8.1 (placeholder line) — explicit test in Task 1.1 (`skips placeholder lines without a runner field`).
- **Placeholder scan:** no "TBD", "TODO", "fill in details", "add appropriate handling", or "similar to Task N" in the plan body. Every code block is complete.
- **Type consistency:** `selectLatestReferenceLine`, `writeLatestJson`, `deriveLatestJson`, `NoQualifyingLineError`, `DeriveOptions` are spelled the same in the test file (Task 1.1), the implementation (Task 1.3), and the workflow invocation (Task 6.1). The `HistoryLineForRender` interface in `BenchmarksTable.astro` (Task 3.2) is intentionally a separate, narrowed copy of `HistoryLine` because Astro components cannot import gateway-package types directly (no monorepo path mapping is set up between `packages/docs` and `packages/gateway`).
- **Workflow line-number references:** `_perf-reference.yml` line numbers in Task 6 (67–78, 80–113, 115–136, 138–171) are accurate as of `main@d413e291`. If `main` advances before execution, the executor should grep for the `name:` headers (`Run reference benchmark`, `Sanity-check history.jsonl diff`, `Commit and push branch`, `Open perf-labelled PR`) rather than relying on the line numbers.
