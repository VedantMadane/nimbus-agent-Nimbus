# Phase 5 T3 PR 2 — `nimbus impact` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the second built-in agent — `nimbus impact <file-or-PR-url>` — answering "if I change this, what breaks?" by querying the local relationship graph for downstream services, pipelines, dashboards, oncall rotations, and downstream repos. Read-only. HITL-free. JSON-mode round-trippable. Latency budget < 10 s on the seeded fixture.

**Architecture:**
The agent runs five parallel sub-agents through the (already-fixed) `AgentCoordinator`, returning structured `ImpactFinding`s grouped into five buckets, plus aggregated gap notes for graph types/relations that the populator does not yet emit. A deterministic `renderImpact` produces Markdown; `synthesize()` upgrades it to LLM prose when an `LlmRouter` is wired (today: deterministic only). Output flows over a new `agents.impact` JSON-RPC method, surfaces via an `impact.briefReady` notification, and adds **one** entry to the Tauri renderer allowlist (count 58 → 59).

**Tech Stack:**
- Bun v1.2+ / TypeScript strict (no `any`)
- `bun:sqlite` raw SQL against existing `item`, `graph_entity`, `graph_relation`, `person` tables
- Rust unit tests for the Tauri bridge (`cargo test` in `packages/ui/src-tauri/`)
- `bun:test` for unit + e2e

**Spec reference:** [`docs/superpowers/specs/2026-05-07-phase-5-t3-team-intelligence-design.md`](../specs/2026-05-07-phase-5-t3-team-intelligence-design.md), §"`nimbus impact <file-or-PR-url>`" + §"PR 2: `impact`".

**Starting state verified before plan was written:**
- `packages/gateway/src/agents/_lib/findings.ts` — `ImpactBrief` / `ImpactFinding` / `ImpactCategory` types and `isImpactBrief` already exist (PR 1).
- `packages/gateway/src/agents/_lib/render.ts:38` — `renderImpact` is a thrown stub waiting for this PR.
- `packages/gateway/src/agents/_lib/synthesize.ts` — `synthesize()` currently typed `ExpertBrief`-only with a "PR 2 / PR 3 widen this" comment.
- `packages/gateway/src/agents/_lib/gap-notes.ts` — `aggregateMissingEntityTypes`, `detectMissingEntityType`, `detectMissingRelationEmit`, `detectMissingConnector`, `detectEmptyIndex` all exist and are tested.
- `packages/gateway/src/engine/coordinator.ts` — `AgentCoordinator.run` is parallel (PR 1).
- `packages/gateway/src/ipc/agents-rpc.ts` — only handles `agents.expert`. The dispatcher (`packages/gateway/src/ipc/server/dispatchers.ts:84`) already routes `agents.*` to it.
- `packages/ui/src-tauri/src/gateway_bridge.rs` — `ALLOWED_METHODS` has 58 entries (assertion at line 446); `agents.expert` already present at line 64.
- `packages/cli/src/commands/expert.ts` — established CLI shape; `packages/cli/src/types/agents.ts` mirrors `ExpertBrief` only.
- `CLAUDE.md` line 186 references the `ALLOWED_METHODS (58)` count.
- Skill `.claude/commands/nimbus-tauri-allowlist.md` lines 38 + 41 reference the count of 58.

**Out of scope for this plan:**
- `nimbus catchup` (PR 3).
- New graph entity types (`data_model`, `dashboard`, `pipeline_run`, `upstream_refs` populator emits) — these are downstream-wave / graph-populator follow-ups; this PR surfaces their absence as gap notes and the agent self-heals when the populator catches up.
- A `depends_on` relation row emit — also downstream; the sub-agent emits the gap and self-heals later.
- Tauri UI panels for impact — the `ALLOWED_METHODS` entry plus IPC contract makes that a future patch with no further gateway changes.
- LLM routing wiring — `synthesize()` is widened to accept `ImpactBrief`, but the e2e tests call it with no `llm` (deterministic path).

---

## File Structure

### Files to create

| Path | Purpose |
|---|---|
| `packages/gateway/src/agents/impact.ts` | Agent core: `runImpact`, `emitImpactBrief`, 5 sub-agents, stage-2 bucketing |
| `packages/gateway/src/agents/impact.test.ts` | Unit tests for the bucketing helper, gap aggregation, and `runImpact` against an in-memory DB |
| `packages/gateway/test/e2e/scenarios/impact.e2e.test.ts` | Gateway e2e: seeded graph, `runImpact` direct call, latency + HITL-free + brief-shape assertions |
| `packages/cli/src/commands/impact.ts` | CLI command: arg parsing, IPC call, notification handling, output |
| `packages/cli/src/commands/impact.test.ts` | Unit tests for `parseImpactArgs` |
| `packages/cli/test/e2e/impact.smoke.e2e.test.ts` | CLI no-Gateway smoke + help-text presence |

### Files to modify

| Path | Why |
|---|---|
| `packages/gateway/src/agents/_lib/render.ts` | Replace `renderImpact` stub with real impl |
| `packages/gateway/src/agents/_lib/render.test.ts` | Add `renderImpact` full-coverage + sparse fixture tests |
| `packages/gateway/src/agents/_lib/synthesize.ts` | Widen signature to `ExpertBrief \| ImpactBrief`; route to corresponding renderer |
| `packages/gateway/src/agents/_lib/synthesize.test.ts` | Add fallback test for `ImpactBrief` path |
| `packages/gateway/src/ipc/agents-rpc.ts` | Add `requireImpactParams` + `agents.impact` branch in `dispatchAgentsRpc` |
| `packages/gateway/src/ipc/agents-rpc.test.ts` | Add `agents.impact` validation, sessionId, and notification tests |
| `packages/cli/src/types/agents.ts` | Add `ImpactBrief` mirror types + `isImpactBrief` shape check |
| `packages/cli/src/commands/index.ts` | Export `runImpactCli` |
| `packages/cli/src/index.ts` | Register `impact: runImpactCli` in `COMMAND_HANDLERS`; import from `./commands/index.ts` |
| `packages/cli/src/commands/help.ts` | Add `nimbus impact` line beneath the `expert` line |
| `packages/ui/src-tauri/src/gateway_bridge.rs` | Insert `"agents.impact"` alphabetically; bump `ALLOWED_METHODS.len()` assertion 58 → 59; update inline comment |
| `CLAUDE.md` | Update line 186 — `ALLOWED_METHODS (58)` → `ALLOWED_METHODS (59)` |
| `.claude/commands/nimbus-tauri-allowlist.md` | Update count refs at lines 38 + 41 from 58 to 59 |
| `docs/roadmap.md` | Tick the `nimbus impact` checkbox; append a status mirror line |

---

## Task 1: Add `renderImpact` (deterministic Markdown renderer)

The renderer is the **golden** — synthesis falls back to it when no LLM is wired, and the e2e test asserts on its output. Build it first so every later task can render against it.

**Files:**
- Modify: `packages/gateway/src/agents/_lib/render.ts:38-40`
- Modify: `packages/gateway/src/agents/_lib/render.test.ts`

- [ ] **Step 1: Write the failing tests for `renderImpact`**

Append to `packages/gateway/src/agents/_lib/render.test.ts`:

```typescript
import type { ImpactBrief } from "./findings.ts";
import { renderImpact } from "./render.ts";

const IMPACT_BASE: Pick<ImpactBrief, "kind" | "agentVersion" | "generatedAt" | "latencyMs"> = {
  kind: "impact",
  agentVersion: 1,
  generatedAt: 1_700_000_000_000,
  latencyMs: 2400,
};

describe("renderImpact", () => {
  test("full-coverage fixture: per-bucket sections, no Gaps, latency footer", () => {
    const brief: ImpactBrief = {
      ...IMPACT_BASE,
      gaps: [],
      query: { fileOrPrUrl: "src/billing/retry.ts" },
      startEntityId: "graph:code_symbol#1",
      affected: [
        {
          category: "service",
          affectedItemId: "graph:repo#payment",
          affectedTitle: "payment-service",
          serviceId: "github",
          hops: 1,
          pathSummary: "code_symbol → defined_in → repo",
        },
        {
          category: "pipeline",
          affectedItemId: "github:acme/payment#actions/runs/42",
          affectedTitle: "payment CI run #42",
          serviceId: "github",
          hops: 2,
          pathSummary: "code_symbol → defined_in → repo → triggers → ci_run",
        },
        {
          category: "oncall_rotation",
          affectedItemId: "pagerduty:schedule/PXYZ",
          affectedTitle: "Payment oncall",
          serviceId: "pagerduty",
          hops: 2,
          pathSummary: "service → belongs_to → oncall_rotation",
        },
      ],
    };
    const md = renderImpact(brief);
    expect(md).toContain("# Impact: src/billing/retry.ts");
    expect(md).toContain("## Services");
    expect(md).toContain("payment-service");
    expect(md).toContain("## Pipelines");
    expect(md).toContain("payment CI run #42");
    expect(md).toContain("## Oncall");
    expect(md).toContain("Payment oncall");
    expect(md).not.toContain("## Gaps");
    expect(md).toContain("_generated in 2.4 s_");
  });

  test("sparse fixture: aggregated gap note rendered with remediation", () => {
    const brief: ImpactBrief = {
      ...IMPACT_BASE,
      gaps: [
        {
          category: "missing_entity_type",
          detail: "3 categories blocked: `data_model` / `dashboard` / `pipeline_run`",
          remediation:
            "Phase 5 Wave D will populate `data_model` via dbt-schema / warehouse connectors. " +
            "Phase 5 Wave D will populate `dashboard` via Metabase / Superset connectors. " +
            "Tracked as a graph-populator follow-up on the existing CI/CD connectors.",
        },
      ],
      query: { fileOrPrUrl: "src/billing/retry.ts" },
      startEntityId: null,
      affected: [],
    };
    const md = renderImpact(brief);
    expect(md).toContain("# Impact: src/billing/retry.ts");
    expect(md).toContain("_no downstream impact resolved_");
    expect(md).toContain("## Gaps");
    expect(md).toContain("3 categories blocked");
    expect(md).toContain("Phase 5 Wave D");
    expect(md).toContain("graph-populator follow-up");
  });

  test("renderImpact is deterministic across two calls with the same brief", () => {
    const brief: ImpactBrief = {
      ...IMPACT_BASE,
      gaps: [],
      query: { fileOrPrUrl: "x" },
      startEntityId: null,
      affected: [],
    };
    expect(renderImpact(brief)).toBe(renderImpact(brief));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/gateway/src/agents/_lib/render.test.ts`
Expected: FAIL — `renderImpact is implemented in T3 PR 2` (the existing stub throws).

- [ ] **Step 3: Replace the `renderImpact` stub with the real renderer**

In `packages/gateway/src/agents/_lib/render.ts`, replace lines 37-40 (the stub) with:

```typescript
const IMPACT_BUCKET_HEADINGS: Readonly<Record<ImpactCategory, string>> = Object.freeze({
  service: "## Services",
  pipeline: "## Pipelines",
  dashboard: "## Dashboards",
  oncall_rotation: "## Oncall",
  downstream_repo: "## Downstream Repos",
});

const IMPACT_BUCKET_ORDER: readonly ImpactCategory[] = [
  "service",
  "downstream_repo",
  "pipeline",
  "dashboard",
  "oncall_rotation",
];

function renderImpactFinding(f: ImpactFinding): string {
  return `- **${f.affectedTitle}** (\`${f.serviceId}\`, ${f.hops} hop${
    f.hops === 1 ? "" : "s"
  }) — _${f.pathSummary}_`;
}

export function renderImpact(brief: ImpactBrief): string {
  const header = `# Impact: ${brief.query.fileOrPrUrl}`;
  const sections: string[] = [];
  if (brief.affected.length === 0) {
    sections.push("_no downstream impact resolved_");
  } else {
    for (const cat of IMPACT_BUCKET_ORDER) {
      const rows = brief.affected.filter((a) => a.category === cat);
      if (rows.length === 0) continue;
      sections.push(IMPACT_BUCKET_HEADINGS[cat]);
      sections.push("");
      sections.push(...rows.map(renderImpactFinding));
      sections.push("");
    }
  }
  const gaps = renderGaps(brief.gaps);
  const footer = renderLatency(brief.latencyMs);
  return [header, "", ...sections, gaps, footer].filter((s) => s !== "").join("\n");
}
```

Then update the `import` at the top of the file so `ImpactCategory` and `ImpactFinding` are actually imported (currently only `ImpactBrief` is). Replace line 1 of `render.ts`:

```typescript
import type {
  CatchupBrief,
  ExpertBrief,
  ExpertFinding,
  GapNote,
  ImpactBrief,
  ImpactCategory,
  ImpactFinding,
} from "./findings.ts";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/gateway/src/agents/_lib/render.test.ts`
Expected: PASS — all four `renderImpact` tests + every existing `renderExpert` test green.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/agents/_lib/render.ts packages/gateway/src/agents/_lib/render.test.ts
git commit -m "feat(agents): implement renderImpact with bucket-ordered Markdown"
```

---

## Task 2: Widen `synthesize()` to accept `ImpactBrief`

The renderer is in place; now widen the synthesizer so the agent core can call `synthesize(brief)` regardless of `kind`.

**Files:**
- Modify: `packages/gateway/src/agents/_lib/synthesize.ts`
- Modify: `packages/gateway/src/agents/_lib/synthesize.test.ts`

- [ ] **Step 1: Read the current synthesize test to learn the pattern**

Run: `cat packages/gateway/src/agents/_lib/synthesize.test.ts`

This shows you the existing fallback test for `ExpertBrief`. The new test mirrors it for `ImpactBrief`.

- [ ] **Step 2: Write the failing test for `synthesize(impact)` fallback**

Append to `packages/gateway/src/agents/_lib/synthesize.test.ts`:

```typescript
import type { ImpactBrief } from "./findings.ts";

describe("synthesize(ImpactBrief)", () => {
  const baseImpact: ImpactBrief = {
    kind: "impact",
    agentVersion: 1,
    generatedAt: 0,
    latencyMs: 0,
    gaps: [],
    query: { fileOrPrUrl: "src/x.ts" },
    startEntityId: null,
    affected: [],
  };

  test("falls back to renderImpact when no LLM is provided", async () => {
    const out = await synthesize(baseImpact);
    expect(out).toContain("# Impact: src/x.ts");
    expect(out).toContain("_no downstream impact resolved_");
  });

  test("falls back to renderImpact when LLM returns null", async () => {
    const out = await synthesize(baseImpact, {
      llm: { generateMarkdown: async () => null },
    });
    expect(out).toContain("# Impact: src/x.ts");
  });

  test("falls back to renderImpact when LLM throws", async () => {
    const out = await synthesize(baseImpact, {
      llm: {
        generateMarkdown: async () => {
          throw new Error("boom");
        },
      },
    });
    expect(out).toContain("# Impact: src/x.ts");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bun test packages/gateway/src/agents/_lib/synthesize.test.ts`
Expected: FAIL — TypeScript error (`synthesize` rejects `ImpactBrief`) **or** runtime error from the renderer.

- [ ] **Step 4: Widen `synthesize()` to dispatch by `kind`**

Replace the entire body of `packages/gateway/src/agents/_lib/synthesize.ts` (the file is small) with:

```typescript
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test packages/gateway/src/agents/_lib/synthesize.test.ts`
Expected: PASS — both the existing `ExpertBrief` tests and the new `ImpactBrief` tests.

- [ ] **Step 6: Run typecheck on the gateway package**

Run: `bun run typecheck`
Expected: 0 errors (the existing `expert.ts` call site still compiles because `ExpertBrief` is in the union).

- [ ] **Step 7: Commit**

```bash
git add packages/gateway/src/agents/_lib/synthesize.ts packages/gateway/src/agents/_lib/synthesize.test.ts
git commit -m "feat(agents): widen synthesize to accept ImpactBrief"
```

---

## Task 3: Build the impact agent core (types, sub-agents, runImpact, emitImpactBrief)

This is the largest task. We TDD it in two phases: (a) put a passing skeleton in place that returns an empty brief with all five gap notes, (b) layer the real SQL onto each sub-agent in turn.

**Files:**
- Create: `packages/gateway/src/agents/impact.ts`
- Create: `packages/gateway/src/agents/impact.test.ts`

- [ ] **Step 1: Write a failing skeleton test for `runImpact`**

Create `packages/gateway/src/agents/impact.test.ts`:

```typescript
import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { LocalIndex } from "../index/local-index.ts";
import { runImpact } from "./impact.ts";

function freshDb(): Database {
  const db = new Database(":memory:");
  LocalIndex.ensureSchema(db);
  return db;
}

describe("runImpact", () => {
  test("returns a structurally valid ImpactBrief on an empty index", async () => {
    const db = freshDb();
    const brief = await runImpact(
      { fileOrPrUrl: "src/billing/retry.ts" },
      { db, sessionId: "t-1", notify: () => {} },
    );
    expect(brief.kind).toBe("impact");
    expect(brief.agentVersion).toBe(1);
    expect(brief.query.fileOrPrUrl).toBe("src/billing/retry.ts");
    expect(Array.isArray(brief.affected)).toBe(true);
    expect(Array.isArray(brief.gaps)).toBe(true);
    // Empty index → at least one empty_index gap.
    expect(brief.gaps.some((g) => g.category === "empty_index")).toBe(true);
    // Latency captured.
    expect(typeof brief.latencyMs).toBe("number");
  });

  test("aggregates near-duplicate missing-entity gaps into one combined note", async () => {
    const db = freshDb();
    // Seed one item so detectEmptyIndex passes through; sub-agents will then
    // run and emit per-entity-type gaps that aggregateMissingEntityTypes folds together.
    db.run(
      "INSERT INTO item (id, service, type, external_id, title, body_preview, modified_at, synced_at, pinned) VALUES " +
        "('seed', 'github', 'pr', 'acme/x#1', 't', '', 0, 0, 0)",
    );
    const brief = await runImpact(
      { fileOrPrUrl: "src/x.ts" },
      { db, sessionId: "t-2", notify: () => {} },
    );
    const missingEntityGaps = brief.gaps.filter((g) => g.category === "missing_entity_type");
    // The aggregator collapses 2+ near-duplicates into one combined note.
    expect(missingEntityGaps.length).toBeLessThanOrEqual(1);
    if (missingEntityGaps.length === 1) {
      expect(missingEntityGaps[0]?.detail).toMatch(/categories blocked|graph entities/);
    }
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `bun test packages/gateway/src/agents/impact.test.ts`
Expected: FAIL — module `./impact.ts` does not exist.

- [ ] **Step 3: Create the agent skeleton with all five sub-agents stubbed to gap notes**

Create `packages/gateway/src/agents/impact.ts`:

```typescript
import type { Database } from "bun:sqlite";
import { AgentCoordinator, type SubTask } from "../engine/coordinator.ts";
import type { GapNote, ImpactBrief, ImpactCategory, ImpactFinding } from "./_lib/findings.ts";
import {
  aggregateMissingEntityTypes,
  detectEmptyIndex,
  detectMissingConnector,
  detectMissingEntityType,
  detectMissingRelationEmit,
} from "./_lib/gap-notes.ts";
import { type SynthesizerLlm, synthesize } from "./_lib/synthesize.ts";

export type ImpactInput = {
  fileOrPrUrl: string;
  depth?: number;
  service?: string;
};

export type ImpactContext = {
  db: Database;
  llm?: SynthesizerLlm;
  notify: (method: string, params: unknown) => void;
  sessionId: string;
};

const DEFAULT_DEPTH = 2;
const MAX_DEPTH = 5;

type ResolvedStart = {
  entityId: string;
  entityType: string; // "code_symbol" | "pr" | "topic"
  repoIds: string[]; // graph_entity.id values for any repo entities tied to the start
};

type SubAgentResult = {
  findings?: ImpactFinding[];
  gap?: GapNote;
};

function makeSubAgent(
  fn: (db: Database, input: ImpactInput, start: ResolvedStart | null) => Promise<SubAgentResult>,
  db: Database,
  input: ImpactInput,
  start: ResolvedStart | null,
): SubTask {
  return {
    taskType: "agent_step",
    prompt: "",
    execute: async () => {
      const out = await fn(db, input, start);
      return { text: JSON.stringify(out), tokensIn: 0, tokensOut: 0 };
    },
  };
}

export async function runImpact(input: ImpactInput, ctx: ImpactContext): Promise<ImpactBrief> {
  const start = performance.now();
  const depth = Math.min(input.depth ?? DEFAULT_DEPTH, MAX_DEPTH);
  void depth; // depth is observed by sub-agents that want it; current sub-agents are 1- or 2-hop.

  const preflightGaps: GapNote[] = [];
  const empty = detectEmptyIndex(ctx.db);
  if (empty !== null) preflightGaps.push(empty);

  const resolved = resolveStartEntity(ctx.db, input.fileOrPrUrl);

  const coordinator = new AgentCoordinator({
    sessionId: ctx.sessionId,
    parentId: `impact:${ctx.sessionId}`,
    depth: 1,
    toolCallCount: { value: 0 },
  });

  const tasks: SubTask[] = [
    makeSubAgent(subDownstreamCode, ctx.db, input, resolved),
    makeSubAgent(subPipelines, ctx.db, input, resolved),
    makeSubAgent(subOncall, ctx.db, input, resolved),
    makeSubAgent(subDashboards, ctx.db, input, resolved),
    makeSubAgent(subDownstreamRepos, ctx.db, input, resolved),
  ];

  const results = await coordinator.run(tasks);

  const allFindings: ImpactFinding[] = [];
  const subAgentGaps: GapNote[] = [];
  for (const r of results) {
    if (r.status !== "done" || r.text === undefined) {
      subAgentGaps.push({
        category: "missing_connector",
        detail: `impact sub-agent #${r.taskIndex} failed${
          r.errorText === undefined ? "" : `: ${r.errorText}`
        }`,
      });
      continue;
    }
    const decoded: SubAgentResult = JSON.parse(r.text);
    if (decoded.findings !== undefined) allFindings.push(...decoded.findings);
    if (decoded.gap !== undefined) subAgentGaps.push(decoded.gap);
  }

  const filtered =
    input.service === undefined
      ? allFindings
      : allFindings.filter((f) => f.serviceId === input.service);

  const gaps = aggregateMissingEntityTypes([...preflightGaps, ...subAgentGaps]);

  return {
    kind: "impact",
    agentVersion: 1,
    generatedAt: Date.now(),
    latencyMs: Math.round(performance.now() - start),
    gaps,
    query: { fileOrPrUrl: input.fileOrPrUrl },
    startEntityId: resolved === null ? null : resolved.entityId,
    affected: filtered,
  };
}

export async function emitImpactBrief(
  input: ImpactInput,
  ctx: ImpactContext,
): Promise<{ sessionId: string }> {
  void (async () => {
    const brief = await runImpact(input, ctx);
    const markdown = await synthesize(brief, ctx.llm === undefined ? {} : { llm: ctx.llm });
    ctx.notify("impact.briefReady", {
      sessionId: ctx.sessionId,
      brief: markdown,
      findings: brief,
    });
  })().catch((err: unknown) => {
    ctx.notify("impact.briefError", {
      sessionId: ctx.sessionId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
  return { sessionId: ctx.sessionId };
}

// ============================================================================
// Stage 1 — start-entity resolution + 5 sub-agents.
// All SQL uses the real schema (item, graph_entity, graph_relation, person).
// ============================================================================

const PR_URL_RE = /^https?:\/\/[^/]+\/([^/]+)\/([^/]+)\/pull\/(\d+)/i;

function resolveStartEntity(db: Database, fileOrPrUrl: string): ResolvedStart | null {
  // Branch 1 — PR URL ⇒ graph_entity{type='pr', external_id=<owner/repo#N>}.
  const m = fileOrPrUrl.match(PR_URL_RE);
  if (m !== null) {
    const externalId = `${m[1]}/${m[2]}#${m[3]}`;
    const row = db
      .query(
        "SELECT id FROM graph_entity WHERE type = 'pr' AND external_id = ? LIMIT 1",
      )
      .get(externalId) as { id?: string } | null;
    if (row?.id !== undefined) {
      return { entityId: row.id, entityType: "pr", repoIds: repoIdsForRepoLabel(db, `${m[1]}/${m[2]}`) };
    }
  }

  // Branch 2 — file path ⇒ first matching code_symbol entity.
  const codeSym = db
    .query(
      "SELECT id, metadata FROM graph_entity WHERE type = 'code_symbol' AND label LIKE '%' || ? || '%' LIMIT 1",
    )
    .get(fileOrPrUrl) as { id?: string; metadata?: string } | null;
  if (codeSym?.id !== undefined) {
    return { entityId: codeSym.id, entityType: "code_symbol", repoIds: [] };
  }

  // Branch 3 — topic FTS over item.title.
  const topic = db
    .query(
      "SELECT i.id AS item_id FROM item i WHERE i.title LIKE '%' || ? || '%' OR i.body_preview LIKE '%' || ? || '%' ORDER BY i.modified_at DESC LIMIT 1",
    )
    .get(fileOrPrUrl, fileOrPrUrl) as { item_id?: string } | null;
  if (topic?.item_id !== undefined) {
    return { entityId: `item:${topic.item_id}`, entityType: "topic", repoIds: [] };
  }
  return null;
}

function repoIdsForRepoLabel(db: Database, repoLabel: string): string[] {
  const rows = db
    .query("SELECT id FROM graph_entity WHERE type = 'repo' AND label = ? LIMIT 5")
    .all(repoLabel) as Array<{ id: string }>;
  return rows.map((r) => r.id);
}

async function subDownstreamCode(
  db: Database,
  _input: ImpactInput,
  start: ResolvedStart | null,
): Promise<SubAgentResult> {
  // depends_on is registered nowhere in graph_relation_type today (graph-v7-sql.ts
  // line 35-49). detectMissingRelationEmit returns the gap when emit is 0.
  const gap = detectMissingRelationEmit(
    db,
    "depends_on",
    "Tracked as a graph-populator follow-up alongside Phase 5 Wave A's API-surface indexer.",
  );
  if (gap !== null) return { gap };
  if (start === null) return {};
  // (When `depends_on` lands, traverse from start.entityId.)
  return {};
}

async function subPipelines(
  db: Database,
  _input: ImpactInput,
  start: ResolvedStart | null,
): Promise<SubAgentResult> {
  // pipeline_run is missing from ITEM_LINKED_ENTITY_TYPES dispatch — emit gap.
  const gap = detectMissingEntityType(db, "pipeline_run");
  if (gap !== null) return { gap };
  if (start === null) return {};

  // When pipeline_run exists, the SQL chain is:
  //   start.entityId → triggers → ci_run / pipeline_run.
  const rows = db
    .query(
      `SELECT
         e.id          AS entity_id,
         e.label       AS title,
         COALESCE(e.service, 'github') AS service_id
       FROM graph_relation r
       JOIN graph_entity   e ON e.id = r.to_id AND e.type IN ('ci_run', 'pipeline_run')
       WHERE r.from_id = ? AND r.type = 'triggers'
       LIMIT 50`,
    )
    .all(start.entityId) as Array<{ entity_id: string; title: string; service_id: string }>;
  if (rows.length === 0) return {};
  return {
    findings: rows.map((r) => ({
      category: "pipeline" as ImpactCategory,
      affectedItemId: r.entity_id,
      affectedTitle: r.title,
      serviceId: r.service_id,
      hops: 2,
      pathSummary: "code_symbol → defined_in → repo → triggers → ci_run",
    })),
  };
}

async function subOncall(
  db: Database,
  _input: ImpactInput,
  start: ResolvedStart | null,
): Promise<SubAgentResult> {
  // PagerDuty schedules require the connector. If absent, gap; else traverse
  // service → belongs_to → oncall_rotation.
  const gap = detectMissingConnector(db, "pagerduty");
  if (gap !== null) return { gap };
  if (start === null) return {};

  const rows = db
    .query(
      `SELECT
         e.id   AS entity_id,
         e.label AS title
       FROM graph_relation r
       JOIN graph_entity   e ON e.id = r.to_id AND e.type = 'oncall_rotation'
       WHERE r.from_id = ? AND r.type = 'belongs_to'
       LIMIT 50`,
    )
    .all(start.entityId) as Array<{ entity_id: string; title: string }>;
  if (rows.length === 0) return {};
  return {
    findings: rows.map((r) => ({
      category: "oncall_rotation" as ImpactCategory,
      affectedItemId: r.entity_id,
      affectedTitle: r.title,
      serviceId: "pagerduty",
      hops: 2,
      pathSummary: "service → belongs_to → oncall_rotation",
    })),
  };
}

async function subDashboards(
  db: Database,
  _input: ImpactInput,
  start: ResolvedStart | null,
): Promise<SubAgentResult> {
  // dashboard / data_model / upstream_refs are all populator-pending. We only
  // surface ONE gap per sub-agent — `aggregateMissingEntityTypes` will fold any
  // missing-entity gaps from sibling sub-agents into a single combined note.
  const gap = detectMissingEntityType(db, "dashboard");
  if (gap !== null) return { gap };
  if (start === null) return {};

  const rows = db
    .query(
      `SELECT
         e.id   AS entity_id,
         e.label AS title,
         COALESCE(e.service, 'unknown') AS service_id
       FROM graph_relation r
       JOIN graph_entity   e ON e.id = r.to_id AND e.type = 'dashboard'
       WHERE r.from_id = ? AND r.type = 'upstream_refs'
       LIMIT 50`,
    )
    .all(start.entityId) as Array<{ entity_id: string; title: string; service_id: string }>;
  if (rows.length === 0) return {};
  return {
    findings: rows.map((r) => ({
      category: "dashboard" as ImpactCategory,
      affectedItemId: r.entity_id,
      affectedTitle: r.title,
      serviceId: r.service_id,
      hops: 2,
      pathSummary: "data_model → upstream_refs → dashboard",
    })),
  };
}

async function subDownstreamRepos(
  db: Database,
  _input: ImpactInput,
  start: ResolvedStart | null,
): Promise<SubAgentResult> {
  // Repos a PR / commit touches — direct service-level finding when the start
  // is itself a `pr` entity with a known repo. No graph traversal needed.
  if (start === null || start.repoIds.length === 0) return {};
  const placeholders = start.repoIds.map(() => "?").join(",");
  const rows = db
    .query(
      `SELECT id, label, COALESCE(service, 'github') AS service_id
         FROM graph_entity
         WHERE id IN (${placeholders})`,
    )
    .all(...start.repoIds) as Array<{ id: string; label: string; service_id: string }>;
  if (rows.length === 0) return {};
  return {
    findings: rows.map((r) => ({
      category: "service" as ImpactCategory,
      affectedItemId: r.id,
      affectedTitle: r.label,
      serviceId: r.service_id,
      hops: 1,
      pathSummary: "pr → in_repo → repo",
    })),
  };
}
```

- [ ] **Step 4: Run the impact unit tests**

Run: `bun test packages/gateway/src/agents/impact.test.ts`
Expected: PASS — both tests green. (The sub-agents emit only gap notes on the empty-index path; the aggregator combines them.)

- [ ] **Step 5: Verify shared `_lib` tests still pass**

Run: `bun test packages/gateway/src/agents/_lib/`
Expected: PASS — every existing `_lib` test continues to pass.

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/agents/impact.ts packages/gateway/src/agents/impact.test.ts
git commit -m "feat(agents): add nimbus impact built-in agent (5 parallel sub-agents)"
```

---

## Task 4: Wire `agents.impact` into the IPC dispatcher

The dispatcher (`packages/gateway/src/ipc/server/dispatchers.ts:84`) already routes `agents.*` to `dispatchAgentsRpc`. We only need to add the new method branch and parameter validator.

**Files:**
- Modify: `packages/gateway/src/ipc/agents-rpc.ts`
- Modify: `packages/gateway/src/ipc/agents-rpc.test.ts`

- [ ] **Step 1: Write the failing IPC tests**

Append to `packages/gateway/src/ipc/agents-rpc.test.ts`:

```typescript
describe("dispatchAgentsRpc — agents.impact", () => {
  test("agents.impact returns a sessionId synchronously", async () => {
    const out = await dispatchAgentsRpc(
      "agents.impact",
      { fileOrPrUrl: "src/x.ts" },
      makeCtx(freshDb()),
    );
    expect(out.kind).toBe("hit");
    if (out.kind === "hit") {
      const v = out.value as { sessionId: string };
      expect(typeof v.sessionId).toBe("string");
      expect(v.sessionId.length).toBeGreaterThan(0);
    }
  });

  test("agents.impact validates fileOrPrUrl is a non-empty string", async () => {
    await expect(
      dispatchAgentsRpc("agents.impact", { fileOrPrUrl: "" }, makeCtx(freshDb())),
    ).rejects.toBeInstanceOf(AgentsRpcError);
    await expect(
      dispatchAgentsRpc("agents.impact", {}, makeCtx(freshDb())),
    ).rejects.toBeInstanceOf(AgentsRpcError);
  });

  test("agents.impact rejects array payloads with a clear message", async () => {
    await expect(
      dispatchAgentsRpc("agents.impact", ["not", "an", "object"], makeCtx(freshDb())),
    ).rejects.toMatchObject({
      rpcCode: -32602,
      message: expect.stringContaining("requires { fileOrPrUrl: string }"),
    });
  });

  test("agents.impact validates depth is an integer in 1..5", async () => {
    await expect(
      dispatchAgentsRpc(
        "agents.impact",
        { fileOrPrUrl: "x", depth: 0 },
        makeCtx(freshDb()),
      ),
    ).rejects.toBeInstanceOf(AgentsRpcError);
    await expect(
      dispatchAgentsRpc(
        "agents.impact",
        { fileOrPrUrl: "x", depth: 6 },
        makeCtx(freshDb()),
      ),
    ).rejects.toBeInstanceOf(AgentsRpcError);
  });

  test("agents.impact validates service if provided is a non-empty string", async () => {
    await expect(
      dispatchAgentsRpc(
        "agents.impact",
        { fileOrPrUrl: "x", service: "" },
        makeCtx(freshDb()),
      ),
    ).rejects.toBeInstanceOf(AgentsRpcError);
  });

  test("agents.impact eventually emits impact.briefReady", async () => {
    const ctx = makeCtx(freshDb());
    await dispatchAgentsRpc("agents.impact", { fileOrPrUrl: "x" }, ctx);
    await new Promise((r) => setTimeout(r, 50));
    const calls = (ctx.notify as ReturnType<typeof mock>).mock.calls;
    const briefReady = calls.find((c) => c[0] === "impact.briefReady");
    expect(briefReady).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the IPC tests to verify they fail**

Run: `bun test packages/gateway/src/ipc/agents-rpc.test.ts`
Expected: FAIL — `agents.impact` returns `kind: "miss"`.

- [ ] **Step 3: Add the validator and method branch**

Open `packages/gateway/src/ipc/agents-rpc.ts`. After the existing `requireExpertParams` function (line 52), add:

```typescript
const MIN_FILE_LEN = 1;
const MAX_FILE_LEN = 2048;
const MIN_DEPTH = 1;
const MAX_IMPACT_DEPTH = 5;
const MAX_SERVICE_LEN = 64;

function requireImpactParams(
  params: unknown,
): { fileOrPrUrl: string; depth?: number; service?: string } {
  if (params === null || typeof params !== "object" || Array.isArray(params)) {
    throw new AgentsRpcError(-32602, "agents.impact requires { fileOrPrUrl: string }");
  }
  const p = params as { fileOrPrUrl?: unknown; depth?: unknown; service?: unknown };
  if (typeof p.fileOrPrUrl !== "string") {
    throw new AgentsRpcError(-32602, "fileOrPrUrl must be a string");
  }
  const trimmed = p.fileOrPrUrl.trim();
  if (trimmed.length < MIN_FILE_LEN || trimmed.length > MAX_FILE_LEN) {
    throw new AgentsRpcError(
      -32602,
      `fileOrPrUrl must be ${MIN_FILE_LEN}..${MAX_FILE_LEN} chars after trim`,
    );
  }
  const out: { fileOrPrUrl: string; depth?: number; service?: string } = { fileOrPrUrl: trimmed };
  if (p.depth !== undefined) {
    if (
      typeof p.depth !== "number" ||
      !Number.isInteger(p.depth) ||
      p.depth < MIN_DEPTH ||
      p.depth > MAX_IMPACT_DEPTH
    ) {
      throw new AgentsRpcError(
        -32602,
        `depth must be an integer in ${MIN_DEPTH}..${MAX_IMPACT_DEPTH}`,
      );
    }
    out.depth = p.depth;
  }
  if (p.service !== undefined) {
    if (
      typeof p.service !== "string" ||
      p.service.trim().length === 0 ||
      p.service.length > MAX_SERVICE_LEN
    ) {
      throw new AgentsRpcError(
        -32602,
        `service must be a non-empty string up to ${MAX_SERVICE_LEN} chars`,
      );
    }
    out.service = p.service.trim();
  }
  return out;
}
```

Then change the `newSessionId` function so it accepts a kind label (the existing call site passes `"expert"`):

```typescript
function newSessionId(kind: "expert" | "impact"): string {
  return `${kind}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}
```

Update the existing `agents.expert` branch (currently the only branch) so the call to `newSessionId` becomes `newSessionId("expert")`.

Add a new import at the top of the file (just below the `emitExpertBrief` import):

```typescript
import { emitImpactBrief } from "../agents/impact.ts";
```

Add the new branch inside `dispatchAgentsRpc`, immediately after the `agents.expert` branch:

```typescript
  if (method === "agents.impact") {
    const input = requireImpactParams(params);
    const sessionId = newSessionId("impact");
    const impactCtx =
      ctx.llm === undefined
        ? { db: ctx.db, notify: ctx.notify, sessionId }
        : { db: ctx.db, llm: ctx.llm, notify: ctx.notify, sessionId };
    return { kind: "hit", value: await emitImpactBrief(input, impactCtx) };
  }
```

- [ ] **Step 4: Run the IPC tests to verify they pass**

Run: `bun test packages/gateway/src/ipc/agents-rpc.test.ts`
Expected: PASS — every new `agents.impact` test plus every existing `agents.expert` test.

- [ ] **Step 5: Run typecheck and the full agents test directory**

Run in parallel:
- `bun run typecheck`
- `bun test packages/gateway/src/agents/ packages/gateway/src/ipc/agents-rpc.test.ts`

Expected: 0 typecheck errors; all gateway agent + IPC tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/ipc/agents-rpc.ts packages/gateway/src/ipc/agents-rpc.test.ts
git commit -m "feat(ipc): expose agents.impact over JSON-RPC"
```

---

## Task 5: Add `agents.impact` to the Tauri renderer allowlist

`agents.impact` is read-only and HITL-free, so it is safe in `ALLOWED_METHODS`. The Rust assertion at line 446 is the integrity gate; we update both it and the comment.

**Files:**
- Modify: `packages/ui/src-tauri/src/gateway_bridge.rs`

- [ ] **Step 1: Open the Rust source**

Run: `cat packages/ui/src-tauri/src/gateway_bridge.rs | head -80`

Verify line 64 is `"agents.expert",` and lines around 440-447 hold the count assertion.

- [ ] **Step 2: Insert `"agents.impact"` alphabetically**

In `packages/ui/src-tauri/src/gateway_bridge.rs`, the array is alphabetized. `"agents.impact"` sorts after `"agents.expert"` and before `"audit.export"`. Edit line 64 region from:

```rust
pub const ALLOWED_METHODS: &[&str] = &[
    "agents.expert",
    "audit.export",
```

to:

```rust
pub const ALLOWED_METHODS: &[&str] = &[
    "agents.expert",
    "agents.impact",
    "audit.export",
```

- [ ] **Step 3: Bump the size assertion and update the comment**

Edit lines 441-446 (the `allowlist_exact_size` test) from:

```rust
    fn allowlist_exact_size() {
        // WS5-D adds extension.{disable,enable,install,list,remove} + watcher.{create,delete,
        // list,pause,resume} + workflow.{delete,list,run,save} → 14 new methods → 54 total.
        // WS5-D polish adds watcher.listHistory + workflow.listRuns → 2 new methods → 56 total.
        // Security fix: remove extension.install → 55 total.
        // Phase 5 T3 PR 1 adds agents.expert → 58 total.
        assert_eq!(ALLOWED_METHODS.len(), 58);
    }
```

to:

```rust
    fn allowlist_exact_size() {
        // WS5-D adds extension.{disable,enable,install,list,remove} + watcher.{create,delete,
        // list,pause,resume} + workflow.{delete,list,run,save} → 14 new methods → 54 total.
        // WS5-D polish adds watcher.listHistory + workflow.listRuns → 2 new methods → 56 total.
        // Security fix: remove extension.install → 55 total.
        // Phase 5 T3 PR 1 adds agents.expert → 58 total.
        // Phase 5 T3 PR 2 adds agents.impact → 59 total.
        assert_eq!(ALLOWED_METHODS.len(), 59);
    }
```

- [ ] **Step 4: Run the four allowlist tests**

Run: `cd packages/ui/src-tauri && cargo test --lib allowlist`
Expected: 4 tests pass — `allowlist_exact_size`, `allowlist_is_alphabetized`, `allowlist_has_no_duplicates`, `allowlist_rejects_empty_and_unknown`.

If `cargo` complains about workspace flags, fall back to `cargo test --manifest-path packages/ui/src-tauri/Cargo.toml --lib allowlist`.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src-tauri/src/gateway_bridge.rs
git commit -m "feat(ui): allow agents.impact through the Tauri bridge"
```

---

## Task 6: Mirror `ImpactBrief` types in the CLI

Per F8 in the PR-1 design, the CLI keeps a slim local mirror of the gateway types so it does not violate the package-dependency rule (`cli ← IPC-only`). Extend the existing mirror.

**Files:**
- Modify: `packages/cli/src/types/agents.ts`

- [ ] **Step 1: Read the existing mirror**

Run: `cat packages/cli/src/types/agents.ts`

Confirms the file currently mirrors only `ExpertBrief` and `isExpertBrief`.

- [ ] **Step 2: Append the impact mirror**

Append to `packages/cli/src/types/agents.ts`:

```typescript
export type ImpactCategory =
  | "service"
  | "pipeline"
  | "dashboard"
  | "oncall_rotation"
  | "downstream_repo";

export type ImpactFinding = {
  category: ImpactCategory;
  affectedItemId: string;
  affectedTitle: string;
  serviceId: string;
  hops: number;
  pathSummary: string;
};

export type ImpactBrief = {
  kind: "impact";
  agentVersion: 1;
  generatedAt: number;
  latencyMs: number;
  gaps: GapNote[];
  query: { fileOrPrUrl: string };
  startEntityId: string | null;
  affected: ImpactFinding[];
};

export function isImpactBrief(x: unknown): x is ImpactBrief {
  if (x === null || typeof x !== "object") return false;
  const b = x as Record<string, unknown>;
  return (
    b["kind"] === "impact" &&
    b["agentVersion"] === 1 &&
    Array.isArray(b["gaps"]) &&
    Array.isArray(b["affected"]) &&
    typeof b["generatedAt"] === "number" &&
    typeof b["latencyMs"] === "number"
  );
}
```

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors. The existing CLI is untouched; we only added new exports.

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/types/agents.ts
git commit -m "feat(cli): mirror ImpactBrief types for the CLI surface"
```

---

## Task 7: Build the `nimbus impact` CLI command

Mirror `packages/cli/src/commands/expert.ts` line-for-line, swapping in the impact param/notification names.

**Files:**
- Create: `packages/cli/src/commands/impact.ts`
- Create: `packages/cli/src/commands/impact.test.ts`

- [ ] **Step 1: Write the failing arg-parser test**

Create `packages/cli/src/commands/impact.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { parseImpactArgs } from "./impact.ts";

describe("parseImpactArgs", () => {
  test("parses positional fileOrPrUrl", () => {
    const a = parseImpactArgs(["src/billing/retry.ts"]);
    expect(a.fileOrPrUrl).toBe("src/billing/retry.ts");
    expect(a.json).toBe(false);
    expect(a.depth).toBeUndefined();
    expect(a.service).toBeUndefined();
  });

  test("recognises --json flag", () => {
    const a = parseImpactArgs(["src/x.ts", "--json"]);
    expect(a.json).toBe(true);
  });

  test("parses --depth as integer in 1..5", () => {
    expect(parseImpactArgs(["x", "--depth", "3"]).depth).toBe(3);
  });

  test("rejects --depth out of range", () => {
    expect(() => parseImpactArgs(["x", "--depth", "0"])).toThrow();
    expect(() => parseImpactArgs(["x", "--depth", "6"])).toThrow();
    expect(() => parseImpactArgs(["x", "--depth", "abc"])).toThrow();
  });

  test("parses --service", () => {
    expect(parseImpactArgs(["x", "--service", "github"]).service).toBe("github");
  });

  test("requires non-empty fileOrPrUrl", () => {
    expect(() => parseImpactArgs([])).toThrow();
    expect(() => parseImpactArgs(["--json"])).toThrow();
  });

  test("joins multiple positionals with spaces (PR URLs are single tokens, but topics may have spaces)", () => {
    expect(parseImpactArgs(["foo", "bar", "--json"]).fileOrPrUrl).toBe("foo bar");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/cli/src/commands/impact.test.ts`
Expected: FAIL — module `./impact.ts` does not exist.

- [ ] **Step 3: Create the CLI command**

Create `packages/cli/src/commands/impact.ts`:

```typescript
import { IPCClient } from "../ipc-client/index.ts";
import { readGatewayState } from "../lib/gateway-process.ts";
import { registerInteractiveCliIpcHandlers } from "../lib/interactive-ipc-handlers.ts";
import { getCliPlatformPaths } from "../paths.ts";
import { type ImpactBrief, isImpactBrief } from "../types/agents.ts";

export type ImpactCliArgs = {
  fileOrPrUrl: string;
  json: boolean;
  depth?: number;
  service?: string;
};

export function parseImpactArgs(args: string[]): ImpactCliArgs {
  const positional: string[] = [];
  let json = false;
  let depth: number | undefined;
  let service: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--json") {
      json = true;
      continue;
    }
    if (a === "--depth") {
      const n = Number(args[i + 1]);
      if (!Number.isInteger(n) || n < 1 || n > 5) {
        throw new Error("--depth must be an integer in 1..5");
      }
      depth = n;
      i += 1;
      continue;
    }
    if (a === "--service") {
      const v = args[i + 1];
      if (typeof v !== "string" || v.trim().length === 0) {
        throw new Error("--service requires a non-empty value");
      }
      service = v.trim();
      i += 1;
      continue;
    }
    if (a !== undefined && !a.startsWith("--")) positional.push(a);
  }
  const fileOrPrUrl = positional.join(" ").trim();
  if (fileOrPrUrl.length === 0) {
    throw new Error(
      'Usage: nimbus impact "<file-or-PR-url>" [--json] [--depth <N>] [--service <id>]',
    );
  }
  const out: ImpactCliArgs = { fileOrPrUrl, json };
  if (depth !== undefined) out.depth = depth;
  if (service !== undefined) out.service = service;
  return out;
}

const TIMEOUT_MS = 30_000;

export async function runImpactCli(args: string[]): Promise<void> {
  const parsed = parseImpactArgs(args);

  const paths = getCliPlatformPaths();
  const state = await readGatewayState(paths);
  if (state === undefined) {
    process.stderr.write("Gateway is not running. Start with: nimbus start\n");
    process.exit(1);
  }

  const client = new IPCClient(state.socketPath);
  await client.connect();
  registerInteractiveCliIpcHandlers(client);

  let timeout: ReturnType<typeof setTimeout> | undefined;

  const briefPromise = new Promise<{ brief: string; findings: ImpactBrief }>((resolve, reject) => {
    timeout = setTimeout(() => reject(new Error("Agent timed out after 30 s")), TIMEOUT_MS);
    client.onNotification("impact.briefReady", (params: unknown) => {
      const p = params as { sessionId?: string; brief?: string; findings?: unknown };
      if (typeof p.brief !== "string" || !isImpactBrief(p.findings)) {
        reject(new Error("Malformed impact.briefReady payload"));
        return;
      }
      resolve({ brief: p.brief, findings: p.findings });
    });
    client.onNotification("impact.briefError", (params: unknown) => {
      const p = params as { error?: string };
      reject(new Error(p.error ?? "Agent failed"));
    });
  });

  const callParams: { fileOrPrUrl: string; depth?: number; service?: string } = {
    fileOrPrUrl: parsed.fileOrPrUrl,
  };
  if (parsed.depth !== undefined) callParams.depth = parsed.depth;
  if (parsed.service !== undefined) callParams.service = parsed.service;

  try {
    await client.call<{ sessionId: string }>("agents.impact", callParams);
    const { brief, findings } = await briefPromise;
    if (parsed.json) {
      process.stdout.write(`${JSON.stringify(findings, null, 2)}\n`);
      return;
    }
    if (findings.gaps.some((g) => g.category === "empty_index")) {
      process.stderr.write("No data indexed yet — run `nimbus connector sync <service>` first.\n");
      process.exit(1);
    }
    process.stdout.write(`${brief}\n`);
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(2);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
    await client.disconnect();
  }
}
```

- [ ] **Step 4: Run the parser tests to verify they pass**

Run: `bun test packages/cli/src/commands/impact.test.ts`
Expected: PASS — all seven `parseImpactArgs` tests.

- [ ] **Step 5: Run typecheck on the CLI package**

Run: `bun run typecheck`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/impact.ts packages/cli/src/commands/impact.test.ts
git commit -m "feat(cli): add nimbus impact command"
```

---

## Task 8: Wire the `impact` command into the CLI dispatcher and help text

**Files:**
- Modify: `packages/cli/src/commands/index.ts`
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/src/commands/help.ts`

- [ ] **Step 1: Export the new command from the barrel**

In `packages/cli/src/commands/index.ts`, add a new export line alphabetically — the file is alphabetized by export name. The existing `export { runExpertCli } from "./expert.ts";` line is at line 14; add this immediately below the line for `runExtension`, on a new line, in proper alphabetical order. Specifically, replace:

```typescript
export { runExpertCli } from "./expert.ts";
export { runExtension } from "./extension.ts";
```

with:

```typescript
export { runExpertCli } from "./expert.ts";
export { runExtension } from "./extension.ts";
export { runImpactCli } from "./impact.ts";
```

- [ ] **Step 2: Register `impact` in the CLI handler map**

In `packages/cli/src/index.ts`, add `runImpactCli` to the import block at the top (alphabetised; sits between `runExpertCli` and `runExtension`). Replace the import block lines:

```typescript
  runExpertCli,
  runExtension,
```

with:

```typescript
  runExpertCli,
  runExtension,
  runImpactCli,
```

Then add the dispatch entry. The `COMMAND_HANDLERS` map is not strictly alphabetical in the source, but `expert` is at line 77 followed by `vault`. Add after the `expert` line:

```typescript
  expert: runExpertCli,
  impact: runImpactCli,
  vault: runVault,
```

- [ ] **Step 3: Add the help-text line**

In `packages/cli/src/commands/help.ts`, immediately after the existing `nimbus expert <topic>` line (line 20), insert a new line:

```typescript
  nimbus expert <topic>     Rank team members with the most context on a topic or file
  nimbus impact <file>      Reverse-dependency blast radius across services / pipelines / dashboards
  nimbus vault set <k> <v>  Store a secret
```

- [ ] **Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors.

- [ ] **Step 5: Smoke-test the help output and unknown-command path**

Run:
```bash
bun run packages/cli/src/index.ts help
```

Expected stdout: contains `nimbus impact <file>` line.

Run:
```bash
bun run packages/cli/src/index.ts impact 2>&1 || true
```

Expected stderr (or stdout): the "Usage: nimbus impact …" message from the parser, with exit code != 0. (The Gateway is not running; the parser fails first because no positional was provided.)

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/index.ts packages/cli/src/index.ts packages/cli/src/commands/help.ts
git commit -m "feat(cli): register impact subcommand and help line"
```

---

## Task 9: Gateway e2e test for `runImpact`

Mirror the structure of `packages/gateway/test/e2e/scenarios/expert.e2e.test.ts`. Seed a small graph: one repo, one PR linked to it, one ci_run linked to the repo via `triggers`. Assert downstream-repo + pipeline findings appear, latency < 10 s, structural HITL-free.

**Files:**
- Create: `packages/gateway/test/e2e/scenarios/impact.e2e.test.ts`

- [ ] **Step 1: Write the e2e test**

Create `packages/gateway/test/e2e/scenarios/impact.e2e.test.ts`:

```typescript
/**
 * Phase 5 T3 PR 2 — `nimbus impact` end-to-end (in-process).
 *
 * Seeds a tiny graph: one repo entity, one PR entity that links to the repo,
 * and one ci_run entity that the repo `triggers`. Calls runImpact directly and
 * asserts the brief shape, the downstream-repo + pipeline buckets, gap-note
 * aggregation, latency budget (<10 s), and the structural HITL-free contract.
 */

import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { isImpactBrief } from "../../../src/agents/_lib/findings.ts";
import { runImpact } from "../../../src/agents/impact.ts";
import { LocalIndex } from "../../../src/index/local-index.ts";

function seedGraph(db: Database): void {
  // Insert a repo, a PR, a ci_run, and the relations.
  // graph_relation_type defines: authored, reviewed, targets, resolves, opened,
  // assigned, belongs_to, triggers, tests, affects, fires_on, correlates_with,
  // posted, mentions. We use only `triggers` here.
  const now = Date.now();
  db.run(
    "INSERT INTO graph_entity (id, type, external_id, label, service, metadata) VALUES " +
      "('graph:repo:acme/payment', 'repo',   'acme/payment',         'acme/payment',       'github', '{}')," +
      "('graph:pr:acme/payment#501','pr',    'acme/payment#501',     'mitigate retry bug', 'github', '{}')," +
      "('graph:ci_run:acme/payment#42','ci_run','acme/payment#42',  'payment CI run #42', 'github', '{}')",
  );
  db.run(
    "INSERT INTO graph_relation (from_id, to_id, type, weight, created_at) VALUES (?, ?, 'triggers', 1.0, ?)",
    ["graph:repo:acme/payment", "graph:ci_run:acme/payment#42", now],
  );
  // Also seed an item so detectEmptyIndex passes.
  db.run(
    "INSERT INTO item (id, service, type, external_id, title, body_preview, modified_at, synced_at, pinned) " +
      "VALUES ('seed', 'github', 'pr', 'acme/payment#501', 't', '', ?, ?, 0)",
    [now, now],
  );
}

describe("nimbus impact (e2e, in-process)", () => {
  test("PR URL resolves to the pr entity; downstream_repo + pipeline findings emitted; latency < 10 s; HITL-free", async () => {
    const db = new Database(":memory:");
    LocalIndex.ensureSchema(db);
    seedGraph(db);

    const start = performance.now();
    const brief = await runImpact(
      { fileOrPrUrl: "https://github.com/acme/payment/pull/501" },
      { db, sessionId: "e2e-impact-1", notify: () => {} },
    );
    const elapsedMs = performance.now() - start;

    expect(elapsedMs).toBeLessThan(10_000);
    expect(isImpactBrief(brief)).toBe(true);
    expect(brief.startEntityId).toBe("graph:pr:acme/payment#501");

    // Downstream-repo bucket from the PR's repo linkage.
    const services = brief.affected.filter((a) => a.category === "service");
    expect(services.some((s) => s.affectedItemId === "graph:repo:acme/payment")).toBe(true);

    // Pipeline bucket from repo → triggers → ci_run.
    const pipelines = brief.affected.filter((a) => a.category === "pipeline");
    expect(pipelines.some((p) => p.affectedItemId === "graph:ci_run:acme/payment#42")).toBe(true);

    // Aggregated gap note for missing entity types (dashboard / pipeline_run /
    // depends_on relation gap). At least one combined missing-entity-type or
    // missing-relation-emit note must be present.
    expect(brief.gaps.length).toBeGreaterThan(0);
  });

  test("file path that resolves nothing reports empty affected list and a startEntityId of null", async () => {
    const db = new Database(":memory:");
    LocalIndex.ensureSchema(db);
    db.run(
      "INSERT INTO item (id, service, type, external_id, title, body_preview, modified_at, synced_at, pinned) " +
        "VALUES ('seed', 'github', 'pr', 'acme/x#1', 'unrelated', '', 0, 0, 0)",
    );
    const brief = await runImpact(
      { fileOrPrUrl: "src/never/exists.ts" },
      { db, sessionId: "e2e-impact-2", notify: () => {} },
    );
    expect(brief.startEntityId).toBeNull();
    expect(brief.affected.length).toBe(0);
  });

  test("structural HITL-free: impact.ts must not import ToolExecutor or HITL_REQUIRED", () => {
    const source = require("node:fs").readFileSync(
      require("node:path").resolve(__dirname, "../../../src/agents/impact.ts"),
      "utf8",
    ) as string;
    expect(source).not.toContain("ToolExecutor");
    expect(source).not.toContain("HITL_REQUIRED");
  });

  test("--service filter: only findings matching the requested service survive", async () => {
    const db = new Database(":memory:");
    LocalIndex.ensureSchema(db);
    seedGraph(db);
    const brief = await runImpact(
      { fileOrPrUrl: "https://github.com/acme/payment/pull/501", service: "pagerduty" },
      { db, sessionId: "e2e-impact-3", notify: () => {} },
    );
    expect(brief.affected.every((a) => a.serviceId === "pagerduty")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the e2e test**

Run: `bun test packages/gateway/test/e2e/scenarios/impact.e2e.test.ts`
Expected: PASS — all four tests.

- [ ] **Step 3: Confirm no regressions in the broader e2e suite**

Run: `bun test packages/gateway/test/e2e/scenarios/`
Expected: every existing scenario still passes.

- [ ] **Step 4: Commit**

```bash
git add packages/gateway/test/e2e/scenarios/impact.e2e.test.ts
git commit -m "test(agents): add e2e coverage for nimbus impact"
```

---

## Task 10: CLI smoke e2e — no-Gateway exit + help integration

Mirror `packages/cli/test/e2e/expert.smoke.e2e.test.ts`.

**Files:**
- Create: `packages/cli/test/e2e/impact.smoke.e2e.test.ts`

- [ ] **Step 1: Write the smoke test**

Create `packages/cli/test/e2e/impact.smoke.e2e.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Lightweight smoke for `nimbus impact`: spawn the CLI without a running
 * Gateway and verify the "Gateway is not running" exit path + help integration.
 *
 * Mirrors expert.smoke.e2e.test.ts. Full Gateway+CLI round-trip e2e is
 * deferred to a follow-up alongside the same harness work that expert
 * deferred (per F-7 in the T3 design doc).
 */
describe("nimbus impact e2e (no-Gateway smoke)", () => {
  const cliEntry = fileURLToPath(new URL("../../src/index.ts", import.meta.url));

  function emptyEnvOverrides(): Record<string, string> {
    const root = mkdtempSync(join(tmpdir(), "nimbus-no-gateway-"));
    return {
      LOCALAPPDATA: root,
      APPDATA: root,
      XDG_DATA_HOME: root,
      XDG_CONFIG_HOME: root,
      XDG_RUNTIME_DIR: root,
      HOME: root,
    };
  }

  test("impact exits non-zero with 'Gateway is not running' on stderr when no gateway", async () => {
    const proc = Bun.spawn({
      cmd: [process.execPath, "run", cliEntry, "impact", "src/billing/retry.ts"],
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, ...emptyEnvOverrides() },
    });
    const code = await proc.exited;
    const stderr = await new Response(proc.stderr).text();
    expect(code).not.toBe(0);
    expect(stderr).toContain("Gateway is not running");
  });

  test("help text mentions 'impact' subcommand", async () => {
    const proc = Bun.spawn({
      cmd: [process.execPath, "run", cliEntry, "help"],
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const code = await proc.exited;
    expect(code).toBe(0);
    expect(stdout.toLowerCase()).toContain("impact");
  });

  test("impact with no positional fails with usage hint", async () => {
    const proc = Bun.spawn({
      cmd: [process.execPath, "run", cliEntry, "impact"],
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, ...emptyEnvOverrides() },
    });
    const code = await proc.exited;
    const stderr = await new Response(proc.stderr).text();
    expect(code).not.toBe(0);
    expect(stderr.toLowerCase()).toContain("usage: nimbus impact");
  });
});
```

- [ ] **Step 2: Run the smoke test**

Run: `bun test packages/cli/test/e2e/impact.smoke.e2e.test.ts`
Expected: PASS — all three tests.

- [ ] **Step 3: Run the full CLI test directory**

Run: `bun test packages/cli/test/`
Expected: every existing CLI test plus the new ones pass.

- [ ] **Step 4: Commit**

```bash
git add packages/cli/test/e2e/impact.smoke.e2e.test.ts
git commit -m "test(cli): add no-gateway smoke for nimbus impact"
```

---

## Task 11: Update doc references that hard-code the `ALLOWED_METHODS` count

The Rust assertion already moved from 58 to 59 in Task 5; three documentation references still say 58. Sync them in one commit so the next AI assistant inheriting this context does not propose stale numbers (per the tauri-allowlist skill checklist).

**Files:**
- Modify: `CLAUDE.md`
- Modify: `.claude/commands/nimbus-tauri-allowlist.md`
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Update `CLAUDE.md`**

Find line 186 in `CLAUDE.md`:

```
| `packages/ui/src-tauri/src/gateway_bridge.rs` | Rust IPC bridge — `ALLOWED_METHODS` (58), `NO_TIMEOUT_METHODS` (4), `GLOBAL_BROADCAST_METHODS` (`profile.switched`), `rpc_call`, reconnect loop |
```

Replace `(58)` with `(59)`.

- [ ] **Step 2: Update the tauri-allowlist skill — two count references**

In `.claude/commands/nimbus-tauri-allowlist.md`, replace **two** strings:

a. The phrase `Currently 58 entries.` (around line 38) becomes `Currently 59 entries.`.

b. The assertion description `assertion that fails if a known wiring site stops calling` is at a different line — the literal we want to update is at line 41: `**Size-asserted** — \`allowlist_exact_size\` checks \`ALLOWED_METHODS.len() == 58\`.`. Replace `== 58` with `== 59`.

Use `Edit` with `replace_all: false` for each, or two `Edit` calls.

- [ ] **Step 3: Update the Phase-5 status mirror line in CLAUDE.md**

`CLAUDE.md` line 7 reads: `**Status:** Phase 3.5 ✅ Complete; **Phase 4** ... Phase 5 — Extended Surface 🔵 Active (T1 sequencing spec ✅ · T3 PR 1 coordinator parallelism + \`nimbus expert\` ✅ · T3 PRs 2+ next)`. Replace the trailing parenthetical with:

```
(T1 sequencing spec ✅ · T3 PR 1 coordinator parallelism + `nimbus expert` ✅ · T3 PR 2 `nimbus impact` ✅ · T3 PR 3 `nimbus catchup` next)
```

- [ ] **Step 4: Tick the roadmap checkbox for `nimbus impact`**

In `docs/roadmap.md` around the Team Intelligence section (line 555–557), the `nimbus impact` row is `- [ ] **\`nimbus impact <file-or-PR-url>\`** ...`. Replace `- [ ]` with `- [x]` for that one row only. Leave the `catchup` row unchanged.

- [ ] **Step 5: Verify no other count references slipped through**

Run: `grep -rn "ALLOWED_METHODS.*58\|allowlist.*58\|58 entries\|== 58" CLAUDE.md docs/ .claude/ packages/ui/src-tauri/`

Expected: no matches. (Comments inside `gateway_bridge.rs` that say `→ 58 total.` as part of the historical comment chain in Task 5 are fine — those are history, not the current value, and the new "59 total" line follows them.)

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md .claude/commands/nimbus-tauri-allowlist.md docs/roadmap.md
git commit -m "docs(phase-5): bump tauri-allowlist count 58 to 59 + tick impact row"
```

---

## Task 12: Pre-PR validation gauntlet

Run every gate the project pre-PR checks expect. Fix issues inline before opening the PR.

- [ ] **Step 1: Typecheck**

Run: `bun run typecheck`
Expected: 0 errors.

- [ ] **Step 2: Lint**

Run: `bun run lint`
Expected: clean. If Biome flags any issue, run `bun run lint:fix` and review the diff.

- [ ] **Step 3: Static-time invariant audit**

Run: `bun run audit:invariants`
Expected: pass — no new connector code added, so I1 (`extensionProcessEnv`) is unaffected; we did not touch the vault-key list.

- [ ] **Step 4: `any` budget**

Run: `bun scripts/structure-audit/count-any-usage.ts --check`
Expected: pass — none of the new code uses `any`. If it fails, identify the offending line; the spec is "no `any`" per CLAUDE.md non-negotiable #7.

- [ ] **Step 5: Rust allowlist tests**

Run: `cd packages/ui/src-tauri && cargo test --lib allowlist`
Expected: 4 tests pass.

- [ ] **Step 6: Full project CI test parity**

Run: `bun run test:ci`
Expected: every test green. This is the gate set in user memory `feedback_preflight_before_pr.md` — never push without it.

- [ ] **Step 7: Coverage gate for `agents`**

Run: `bun run test:coverage:agents`
Expected: ≥ 80% line coverage on `packages/gateway/src/agents/`. The new `impact.ts` is exercised by both unit tests and the e2e scenario, so coverage should rise rather than drop.

- [ ] **Step 8: Coverage gate for `engine`**

Run: `bun run test:coverage:engine`
Expected: ≥ 85% line coverage on `packages/gateway/src/engine/`. The coordinator tests inherited from PR 1 still hold; this PR did not modify `coordinator.ts`.

- [ ] **Step 9: Gateway docs-reference drift check (if present)**

Run: `bun run test:scripts 2>&1 | tail -30`
Expected: pass. If a `regen-doc-references` test fails, run the indicated regen command and re-commit.

- [ ] **Step 10: Open the PR**

Run:
```bash
git push -u origin "$(git rev-parse --abbrev-ref HEAD)"
gh pr create --title "feat: Phase 5 T3 PR 2 — nimbus impact built-in agent" --body "$(cat <<'EOF'
## Summary
- New `agents.impact` IPC method + `nimbus impact` CLI command (read-only, HITL-free).
- 5 parallel sub-agents over the existing relationship graph (`downstream_code`, `pipelines`, `oncall`, `dashboards`, `downstream_repos`); aggregates near-duplicate gap notes per spec.
- Tauri renderer allowlist bumped 58 → 59 (`agents.impact` is read-only and renderer-safe).
- Mirrors PR 1's shape — same notification contract (`impact.briefReady` / `impact.briefError`), same JSON-mode fallback, same e2e + smoke layout.

Spec: `docs/superpowers/specs/2026-05-07-phase-5-t3-team-intelligence-design.md` § PR 2.

## Test plan
- [ ] `bun run typecheck` clean
- [ ] `bun run lint` clean
- [ ] `bun run test:ci` green
- [ ] `bun run test:coverage:agents` ≥ 80%
- [ ] `cd packages/ui/src-tauri && cargo test --lib allowlist` green
- [ ] Manual smoke: `nimbus impact "https://github.com/<seeded>/<repo>/pull/<n>"` against a Gateway with the seeded fixture returns the brief and exits 0.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL printed; CI starts.

---

## Self-Review Notes

**Spec coverage** — every PR 2 requirement in `2026-05-07-phase-5-t3-team-intelligence-design.md` traced to a task:

| Spec line | Task |
|---|---|
| § Sub-agent decomposition for `impact` (5 sub-agents, scope tables) | Task 3 step 3 |
| § Stage 2 buckets findings + aggregated gap notes | Task 3 step 3 (`aggregateMissingEntityTypes` call) |
| § "the gap notes from the missing entity types are aggregated so the user sees one note" | Task 3 step 3 + Task 9 step 1 (e2e assertion) |
| IPC contract — `agents.impact` returns `{ sessionId }`; emits `impact.briefReady` | Task 4 |
| Param validation — `fileOrPrUrl` 1..2048 chars, integer `depth`, allow-list-style URL parse | Task 4 step 3 (validator) + Task 3 step 3 (`PR_URL_RE`) |
| ALLOWED_METHODS in Tauri bridge — 58 → 59 + count assertion bump | Task 5 |
| CLI surface `nimbus impact <file-or-PR-url> [--json] [--depth <N>] [--service <id>]` | Task 7 |
| Empty-index gap → exit 1 default mode; exit 0 in `--json` | Task 7 step 3 (CLI logic) |
| E2E test asserts brief sections, zero HITL, latency < 10 s, aggregated gap | Task 9 |
| `--json` round-trip via `isImpactBrief` | Task 6 (mirror) + Task 7 step 3 (CLI uses it) + Task 9 (round-trip path) |
| Three sequenced PRs — independently reviewable, no DB migration | implicit; this plan adds no migrations |
| Coverage gate `packages/gateway/src/agents/` ≥ 80% | Task 12 step 7 |

**Placeholder scan** — none. Every code block is concrete.

**Type consistency** — `ImpactBrief`, `ImpactFinding`, `ImpactCategory`, `runImpact`, `emitImpactBrief`, `requireImpactParams`, `parseImpactArgs`, `runImpactCli`, `isImpactBrief`, `renderImpact`, `ImpactInput`, `ImpactContext`, `ImpactCliArgs` — all match across tasks.

**Scope check** — single sub-project. PR 3 (`catchup`) has its own future plan.
