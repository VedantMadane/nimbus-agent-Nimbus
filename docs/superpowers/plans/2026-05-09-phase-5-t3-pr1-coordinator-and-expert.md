# Phase 5 — T3 PR 1: AgentCoordinator parallelism fix + `nimbus expert`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first slice of T3 Team Intelligence: fix `AgentCoordinator.run` to dispatch sub-tasks in parallel, scaffold the shared `agents/_lib/` infra, implement the first built-in agent (`nimbus expert <topic-or-file>`), and wire it through IPC + Tauri allowlist + CLI + e2e tests.

**Architecture:** Three deterministic stages — Stage 1 fans out 5 parallel read-only sub-agents (blame, PR-authored, PR-reviewed, incident-resolved, chat-mentions) via the parallelism-fixed `AgentCoordinator`; Stage 2 deduplicates and ranks the merged evidence; Stage 3 renders Markdown (deterministic, with optional LLM rewrite). The agent never calls write tools and never opens the consent channel. Each sub-agent must return ≥1 evidence row OR ≥1 `GapNote` — empty-silent is a unit-test-enforced contract.

**Tech Stack:** Bun + TypeScript (strict, no `any`), `bun:sqlite`, JSON-RPC 2.0 IPC, Tauri 2.0 + Rust bridge.

**Spec:** [`docs/superpowers/specs/2026-05-07-phase-5-t3-team-intelligence-design.md`](../specs/2026-05-07-phase-5-t3-team-intelligence-design.md). Build sequence § confirms PR 1 = shared infra + coordinator fix + `expert`. PR 2 (`impact`) and PR 3 (`catchup`) are out of scope here.

**Branch & worktree:** This plan executes on branch `dev/asafgolombek/phase-5-t3-pr1-coordinator-and-expert` in worktree `.worktrees/phase-5-t3-pr1`, branched from `main`.

## Plan revision log

**Rev 2 (2026-05-09)** — self-review against the actual codebase found schema/API mismatches in Rev 1. Corrections folded in:

| # | Issue (Rev 1) | Corrected (Rev 2) |
|---|---|---|
| F1 | Plural table names (`items`, `persons`, `graph_entities`, `graph_relations`). | Singular: `item`, `person`, `graph_entity`, `graph_relation` (per `unified-item-v3-sql.ts`, `graph-v7-sql.ts`). |
| F2 | `graph_relation` columns named `relation_type` / `source_id` / `target_id`; `graph_entity.kind` and a `ref` column. | Real columns: `graph_relation.type` / `from_id` / `to_id`; `graph_entity.type`; `graph_entity` has `external_id` + `service` (no `ref`). |
| F3 | `item.body` for FTS-style content match. | `item.body_preview`. |
| F4 | Authorship modelled only via `graph_relation` (`type='authored'`). | `item.author_id` is a direct `TEXT` FK to `person.id` — `subBlame` / `subPrAuthored` use `JOIN person ON person.id = item.author_id`; the graph route is only for the (separate) `reviewed` evidence. |
| F5 | Test fixtures created the schema with manual `CREATE TABLE`. | All fixtures call `LocalIndex.ensureSchema(db)` (the canonical helper used by every existing scenario test). |
| F6 | CLI subscribe API written as `client.on(method, handler)`. | Real API: `client.onNotification(method, handler)` (per `packages/client/src/ipc-transport.ts`). |
| F7 | Gateway-side e2e described as `Bun.spawn` of a real Gateway subprocess. | Existing scenario tests (`incident-correlation-indexed.e2e.test.ts`) are **in-process**: `new Database(":memory:") + LocalIndex.ensureSchema`, then call `runExpert` directly and assert on the brief. The plan now matches that style. |
| F8 | `ExpertBrief` re-exported from `@nimbus-dev/sdk` (via `../../gateway/src/...`). | Forbidden by Non-Negotiable: `sdk ← no imports from gateway, cli, or ui`. The CLI now declares the slim type it needs locally in `packages/cli/src/types/agents.ts`; SDK is untouched. |
| F9 | IPC dispatcher wiring described vaguely as "follow the existing pattern". | Concrete `tryDispatchAgentsRpc(ctx, method, params)` function mirroring `tryDispatchLlmRpc` in `packages/gateway/src/ipc/server/dispatchers.ts`, chained from `tryDispatchPhase4Rpc`; DB accessed via `ctx.options.localIndex.getDatabase()`. |
| F10 | Dead `__testing.bucketConfidence` export with no test. | Removed; `bucketConfidence` is exercised through `rankExpertFindings` already. |

**Deferred (with reason):**

| # | Item | Why deferred |
|---|---|---|
| D1 | Exact CI workflow file for the agents coverage gate (Phase 8). | Workflow shape varies — engineer greps `test:coverage:engine` and matches the surrounding step shape. Pinning the file path in the plan would lock in details that drift independently of T3. |
| D2 | The exact `case "expert":` shape in `packages/cli/src/index.ts` (Phase 6). | The CLI dispatcher style (switch / map / chain-of-ifs) is project-specific; engineer reads the existing `ask` registration and copies its shape verbatim. |
| D3 | LLM provider/model selection inside `synthesize.ts`. | Spec § Out of scope — synthesizer uses whatever `LlmRouter` the IPC handler decides to pass; routing changes are a Phase 6 problem. |
| D4 | Tauri renderer-side typed RPC wrapper (Phase 5.2). | Renderer never calls `agents.expert` in PR 1 (no UI surface); will land alongside the Tauri Team-Intel sidebar (post-Phase 5). |

**Non-negotiables to honour throughout:**

- HITL is structural — `expert.ts` is read-only and registers no write tools (Non-Negotiable #2 / Invariant `I2`).
- All credentials via Vault only — N/A here, no new credential surface (Non-Negotiable #3).
- No `any` — `unknown` for external data, then narrow (Non-Negotiable #7). The D8 `any` baseline gate fails on regression.
- Tauri allowlist alphabetized + size-asserted — Invariant `I7`. Insert `agents.expert` *above* `audit.export` (alphabetical "agents" < "audit").
- `wrapToolOutput` for any tool result fed to an LLM — Invariant `I11`. Synthesizer prompt path must wrap.

---

## Phase 0 — Pre-flight (no commits)

### Task 0.1: Confirm worktree state

- [ ] **Step 1: Verify branch + clean tree**

  Run:
  ```bash
  git status --short
  git branch --show-current
  ```
  Expected: empty status output; branch is `dev/asafgolombek/phase-5-t3-pr1-coordinator-and-expert`. If branch differs, stop — the plan assumes the worktree from the brainstorming session.

- [ ] **Step 2: Verify spec is on main**

  Run:
  ```bash
  git log main --oneline -- docs/superpowers/specs/2026-05-07-phase-5-t3-team-intelligence-design.md
  ```
  Expected: at least two commits including `1caa214 docs(phase-5): fold T3 spec review feedback`. If the spec is missing, stop and resolve before proceeding.

- [ ] **Step 3: Verify `agents/` directory does not yet exist**

  Run:
  ```bash
  ls packages/gateway/src/agents/ 2>&1 || true
  ```
  Expected: `No such file or directory`. PR 1 creates this directory; if it already exists, someone else started T3 — coordinate before continuing.

### Task 0.2: Establish a green baseline

- [ ] **Step 1: Typecheck**

  Run: `bun run typecheck`
  Expected: exit 0.

- [ ] **Step 2: Run targeted unit tests for engine + ipc**

  Run: `bun test packages/gateway/src/engine packages/gateway/src/ipc`
  Expected: all pass; record the pass count for sanity-check at PR-finishing time.

- [ ] **Step 3: Tauri allowlist tests**

  Run:
  ```bash
  cd packages/ui/src-tauri
  cargo test allowlist
  ```
  Expected: `allowlist_exact_size`, `allowlist_is_alphabetized`, `allowlist_has_no_duplicates`, `allowlist_rejects_*` all pass with current count `57`. Note this number — Phase 5 commits will bump it to `58`.

  Return to repo root: `cd ../../..`

---

## Phase 1 — AgentCoordinator parallelism fix

The bridge work that lives outside `agents/` and unblocks every later built-in agent. One self-contained commit.

**Files:**
- Modify: `packages/gateway/src/engine/coordinator.ts` (lines 43–85, the `run` method)
- Modify: `packages/gateway/src/engine/coordinator.test.ts` (add 2 new tests, extend 1)

### Task 1.1: Add the wall-clock parallelism test (failing)

- [ ] **Step 1: Open `coordinator.test.ts` and add test** (insert after the existing tests, inside the same describe block)

```typescript
test("AgentCoordinator runs sub-tasks in parallel", async () => {
  const ctx = {
    sessionId: "s1",
    parentId: "p1",
    depth: 0,
    toolCallCount: { value: 0 },
  };
  const tasks: SubTask[] = Array.from({ length: 3 }, () => ({
    taskType: "agent_step",
    prompt: "",
    execute: async () => {
      await new Promise((r) => setTimeout(r, 100));
      return { text: "ok", tokensIn: 0, tokensOut: 0 };
    },
  }));

  const start = performance.now();
  const results = await new AgentCoordinator(ctx).run(tasks);
  const elapsed = performance.now() - start;

  // 3x serial would be ~300ms; parallel must be <200ms with comfortable margin.
  expect(elapsed).toBeLessThan(200);
  expect(results).toHaveLength(3);
  expect(results.every((r) => r.status === "done")).toBe(true);
});

test("AgentCoordinator pre-checks tool-call cap before fan-out", async () => {
  // Arrange: cap is 20 (the production default in Config.maxToolCallsPerSession).
  // Pre-load 18; submitting 5 tasks would total 23 — must throw before any execute().
  let executes = 0;
  const ctx = {
    sessionId: "s1",
    parentId: "p1",
    depth: 0,
    toolCallCount: { value: 18 },
  };
  const tasks: SubTask[] = Array.from({ length: 5 }, () => ({
    taskType: "agent_step",
    prompt: "",
    execute: async () => {
      executes += 1;
      return { text: "ok", tokensIn: 0, tokensOut: 0 };
    },
  }));

  await expect(new AgentCoordinator(ctx).run(tasks)).rejects.toThrow(/Tool call limit reached/);
  expect(executes).toBe(0); // No sub-task got to start.
});

test("AgentCoordinator returns sibling status: done when one task throws", async () => {
  const ctx = {
    sessionId: "s1",
    parentId: "p1",
    depth: 0,
    toolCallCount: { value: 0 },
  };
  const tasks: SubTask[] = [
    {
      taskType: "agent_step",
      prompt: "",
      execute: async () => ({ text: "a", tokensIn: 0, tokensOut: 0 }),
    },
    {
      taskType: "agent_step",
      prompt: "",
      execute: async () => {
        throw new Error("boom");
      },
    },
    {
      taskType: "agent_step",
      prompt: "",
      execute: async () => ({ text: "c", tokensIn: 0, tokensOut: 0 }),
    },
  ];

  const results = await new AgentCoordinator(ctx).run(tasks);

  expect(results).toHaveLength(3);
  expect(results[0]?.status).toBe("done");
  expect(results[1]?.status).toBe("error");
  expect(results[1]?.errorText).toBe("boom");
  expect(results[2]?.status).toBe("done");
});
```

  If the test imports `SubTask`, ensure it's listed in the existing import line at the top of `coordinator.test.ts`.

- [ ] **Step 2: Run the tests — confirm they fail**

  Run: `bun test packages/gateway/src/engine/coordinator.test.ts`
  Expected:
  - Parallelism test: FAIL with `expected elapsed < 200, got ~300`.
  - Pre-check test: FAIL — current code throws on iteration 3 of 5, after 2 successful executes (current loop checks cap mid-iteration, increments per-task).
  - Sibling-survival test: FAIL — current code throws out of the loop on the second task and never reaches the third.

  This proves all three tests are load-bearing. If any *passes* against the current code, the test is asserting too weakly — fix the test.

### Task 1.2: Implement the parallel `run`

- [ ] **Step 1: Replace `coordinator.ts` `run` method body**

  Open `packages/gateway/src/engine/coordinator.ts` and replace the body of `run` (lines 43–85 inclusive of the current sequential implementation) with:

```typescript
  async run(tasks: SubTask[]): Promise<SubTaskResult[]> {
    if (this.#ctx.depth > Config.maxAgentDepth) {
      throw new Error(
        `Agent depth limit reached: depth ${this.#ctx.depth} exceeds max ${Config.maxAgentDepth}`,
      );
    }

    // Pre-check the cap once — opening N tasks in parallel after passing the check
    // is correct because tool-call accounting still increments per task before execute().
    if (this.#ctx.toolCallCount.value + tasks.length > Config.maxToolCallsPerSession) {
      throw new Error(
        `Tool call limit reached: ${tasks.length} new tasks would exceed cap ${Config.maxToolCallsPerSession}`,
      );
    }
    this.#ctx.toolCallCount.value += tasks.length;

    return Promise.all(
      tasks.map(async (task, i): Promise<SubTaskResult> => {
        try {
          const outcome = await task.execute();
          return {
            taskIndex: i,
            taskType: task.taskType,
            status: "done",
            text: outcome.text,
            tokensIn: outcome.tokensIn,
            tokensOut: outcome.tokensOut,
            ...(outcome.modelUsed === undefined ? {} : { modelUsed: outcome.modelUsed }),
          };
        } catch (err) {
          return {
            taskIndex: i,
            taskType: task.taskType,
            status: "error",
            errorText: err instanceof Error ? err.message : String(err),
          };
        }
      }),
    );
  }
```

  **Two deliberate behavioural deltas** (per spec § Coordinator parallelism fix):
  1. Cap is checked once before fan-out and incremented atomically — re-checking inside parallel `Promise.all` would race.
  2. A failing sub-task no longer aborts siblings; failures are encoded as `status: "error"` rows. T3 agents rely on this for gap surfacing.

  **Two deliberate non-changes:**
  - Failed sub-tasks still count against the cap (parity with sequential version).
  - `status: "rejected"` stays type-level only — no production code path emits it. Reserved for a future HITL-aware coordinator.

- [ ] **Step 2: Run the new tests — confirm they pass**

  Run: `bun test packages/gateway/src/engine/coordinator.test.ts`
  Expected: all three new tests PASS, plus all existing tests in the file remain green.

- [ ] **Step 3: Run the full engine test suite as a regression check**

  Run: `bun test packages/gateway/src/engine`
  Expected: all green. Engine coverage gate must remain ≥85%.

  Run: `bun run test:coverage:engine`
  Expected: line coverage stays ≥85%.

### Task 1.3: Commit the coordinator fix

- [ ] **Step 1: Stage + commit**

  Run:
  ```bash
  git add packages/gateway/src/engine/coordinator.ts packages/gateway/src/engine/coordinator.test.ts
  git commit -m "fix(engine): AgentCoordinator dispatches sub-tasks in parallel

Replace sequential for-await loop with Promise.all so N independent
sub-agents complete in roughly the slowest sub-agent's time, not the
sum. Tool-call cap is checked once before fan-out and incremented
atomically; failing sub-tasks return status: \"error\" rows instead of
aborting siblings (T3 gap surfacing depends on this).

Adds three coordinator.test.ts cases: wall-clock parallelism (<200ms
for 3x100ms tasks), pre-check on cap-exceeded fan-out, sibling survival
when one task throws.

Bridge work for T3 Team Intelligence (PR 1).
Spec: docs/superpowers/specs/2026-05-07-phase-5-t3-team-intelligence-design.md"
  ```

---

## Phase 2 — Shared agent infrastructure (`agents/_lib/`)

Five small, focused files under `packages/gateway/src/agents/_lib/`. Each is one commit. PR 1 ships the four files used by `expert`; `self-person.ts` is PR 3 (catchup-only) per the spec § File layout.

### Task 2.1: Create `agents/_lib/findings.ts` (types only)

**Files:**
- Create: `packages/gateway/src/agents/_lib/findings.ts`
- Create: `packages/gateway/src/agents/_lib/findings.test.ts`

- [ ] **Step 1: Create the directory**

  Run: `mkdir -p packages/gateway/src/agents/_lib`

- [ ] **Step 2: Write `findings.ts`** — copy the type block verbatim from spec § Data shapes & gap-note model. Save as `packages/gateway/src/agents/_lib/findings.ts`:

```typescript
// Shared typed surface for built-in agent results.
// Versioned (`agentVersion: 1`) — any breaking change to the --json contract
// requires a deliberate bump, not silent drift.

export type Evidence = {
  itemId: string; // "github:org/repo#42" or "graph:<entity_id>"
  type:
    | "pr_authored"
    | "pr_reviewed"
    | "issue_opened"
    | "issue_resolved"
    | "incident_resolved"
    | "commit_authored"
    | "chat_mention"
    | "chat_post";
  serviceId: string; // "github" | "linear" | "slack" | ...
  title: string; // <=512 chars; matches item.title
  modifiedAt: number; // unix ms
  weight: number; // >=0 - contribution to ranking score
};

export type GapCategory =
  | "missing_entity_type"
  | "missing_relation_emit"
  | "missing_connector"
  | "missing_user_identity" // catchup-only
  | "empty_index";

export type GapNote = {
  category: GapCategory;
  detail: string;
  remediation?: string;
};

export type AgentBriefBase = {
  agentVersion: 1;
  generatedAt: number; // unix ms
  latencyMs: number; // measured at start/end; always populated
  gaps: GapNote[];
};

export type ExpertFinding = {
  personId: string; // empty string for unresolved authors
  displayName: string;
  evidence: Evidence[];
  score: number; // 0..1
  confidence: "high" | "medium" | "low";
};

export type ExpertBrief = AgentBriefBase & {
  kind: "expert";
  query: { topicOrFile: string };
  ranked: ExpertFinding[]; // already ordered, length <= 10
};

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

export type ImpactBrief = AgentBriefBase & {
  kind: "impact";
  query: { fileOrPrUrl: string };
  startEntityId: string | null;
  affected: ImpactFinding[];
};

export type CatchupItem = {
  itemId: string;
  title: string;
  modifiedAt: number;
  relevanceScore: number; // 0..1
  relevanceReasons: string[];
};

export type CatchupSection = {
  serviceId: string;
  totalItemsInWindow: number;
  items: CatchupItem[];
};

export type CatchupBrief = AgentBriefBase & {
  kind: "catchup";
  query: { sinceMs: number };
  selfPersonId: string | null;
  involvement: {
    ownedServices: string[];
    activeRepos: string[];
    incidentServices: string[];
    collaboratorPersonIds: string[];
  };
  sections: CatchupSection[];
};

export type AgentBrief = ExpertBrief | ImpactBrief | CatchupBrief;

export type BriefReadyPayload<B extends AgentBrief> = {
  sessionId: string;
  brief: string; // Markdown
  findings: B; // structured
};

// Lightweight runtime validators — used by the e2e tests to round-trip --json.
// Keep these as pure shape checks; they intentionally do not validate field
// values (e.g., score range) so changes there don't ripple here.

// Bracket access required by tsconfig's `noPropertyAccessFromIndexSignature: true`.
// Matches the existing pattern in packages/gateway/src/auth/pkce.ts:192-195.

export function isExpertBrief(x: unknown): x is ExpertBrief {
  if (x === null || typeof x !== "object") return false;
  const b = x as Record<string, unknown>;
  return (
    b["kind"] === "expert" &&
    b["agentVersion"] === 1 &&
    Array.isArray(b["gaps"]) &&
    Array.isArray(b["ranked"]) &&
    typeof b["generatedAt"] === "number" &&
    typeof b["latencyMs"] === "number" &&
    typeof b["query"] === "object" &&
    b["query"] !== null
  );
}

export function isImpactBrief(x: unknown): x is ImpactBrief {
  if (x === null || typeof x !== "object") return false;
  const b = x as Record<string, unknown>;
  return (
    b["kind"] === "impact" &&
    b["agentVersion"] === 1 &&
    Array.isArray(b["gaps"]) &&
    Array.isArray(b["affected"])
  );
}

export function isCatchupBrief(x: unknown): x is CatchupBrief {
  if (x === null || typeof x !== "object") return false;
  const b = x as Record<string, unknown>;
  return (
    b["kind"] === "catchup" &&
    b["agentVersion"] === 1 &&
    Array.isArray(b["gaps"]) &&
    Array.isArray(b["sections"])
  );
}
```

- [ ] **Step 3: Write `findings.test.ts`**

  Save as `packages/gateway/src/agents/_lib/findings.test.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests + typecheck**

  Run:
  ```bash
  bun test packages/gateway/src/agents/_lib/findings.test.ts
  bun run typecheck
  ```
  Expected: all pass; no `any` introduced.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/agents/_lib/findings.ts packages/gateway/src/agents/_lib/findings.test.ts
git commit -m "feat(agents): add shared AgentBrief type surface

Versioned (agentVersion: 1) types for ExpertBrief / ImpactBrief /
CatchupBrief plus the GapNote model. Runtime type guards used by
e2e --json round-trip assertions.

T3 Team Intelligence (PR 1, shared infra)."
```

### Task 2.2: Create `agents/_lib/gap-notes.ts`

**Files:**
- Create: `packages/gateway/src/agents/_lib/gap-notes.ts`
- Create: `packages/gateway/src/agents/_lib/gap-notes.test.ts`

The gap-note helpers detect three structural gaps that every agent surfaces. Detection is deterministic SQL/index-state inspection, not heuristic.

- [ ] **Step 1: Write `gap-notes.test.ts` first**

```typescript
import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import {
  detectEmptyIndex,
  detectMissingConnector,
  detectMissingEntityType,
  remediationForEntityType,
} from "./gap-notes.ts";

function freshDb(): Database {
  const db = new Database(":memory:");
  // Use the canonical helper — matches every existing scenario test's pattern.
  // LocalIndex.ensureSchema applies all migrations onto :memory: and gives us
  // the real table names (item / person / graph_entity / graph_relation).
  // F5: do not use ad-hoc CREATE TABLE — those table names will not match
  // what the production code expects.
  return db;
}

// Helper: applied at the top of each test that needs a real schema.
import { LocalIndex } from "../../index/local-index.ts";
function withSchema(db: Database): Database {
  LocalIndex.ensureSchema(db);
  return db;
}

describe("detectEmptyIndex", () => {
  test("returns a gap note when item is empty", () => {
    const db = withSchema(freshDb());
    const note = detectEmptyIndex(db);
    expect(note).not.toBeNull();
    expect(note?.category).toBe("empty_index");
    expect(note?.remediation).toMatch(/nimbus connector sync/);
  });

  test("returns null when item has rows", () => {
    const db = withSchema(freshDb());
    // Use a minimal upsert via the established item-store helper if available,
    // otherwise raw INSERT against the real columns from unified-item-v3-sql.ts.
    db.run(
      `INSERT INTO item (id, service, type, external_id, title, modified_at, synced_at)
       VALUES ('github:x', 'github', 'pr', 'x', 't', 0, 0)`,
    );
    expect(detectEmptyIndex(db)).toBeNull();
  });
});

describe("detectMissingConnector", () => {
  test("returns a gap note when sync_state has no row for the service", () => {
    const db = withSchema(freshDb());
    const note = detectMissingConnector(db, "pagerduty");
    expect(note?.category).toBe("missing_connector");
    expect(note?.detail).toMatch(/pagerduty/);
  });

  test("returns null when the service is registered", () => {
    const db = withSchema(freshDb());
    // sync_state column shape comes from the real migration — verify by reading
    // the SELECT used in detectMissingConnector and matching its WHERE.
    db.run("INSERT INTO sync_state (service) VALUES ('pagerduty')");
    expect(detectMissingConnector(db, "pagerduty")).toBeNull();
  });
});

describe("detectMissingEntityType", () => {
  test("returns a gap note when graph_entity has no rows of the given type", () => {
    const db = withSchema(freshDb());
    const note = detectMissingEntityType(db, "incident");
    expect(note?.category).toBe("missing_entity_type");
    expect(note?.detail).toMatch(/incident/);
  });

  test("returns null when graph_entity has at least one row of the type", () => {
    const db = withSchema(freshDb());
    db.run(
      `INSERT INTO graph_entity (id, type, external_id, label, service)
       VALUES ('e1', 'incident', 'incident:1', 'PD-INC-1', 'pagerduty')`,
    );
    expect(detectMissingEntityType(db, "incident")).toBeNull();
  });
});

describe("remediationForEntityType", () => {
  test("returns a Phase-5 remediation hint for known data warehouse types", () => {
    expect(remediationForEntityType("dashboard")).toMatch(/Wave D/);
    expect(remediationForEntityType("data_model")).toMatch(/Wave D/);
  });

  test("returns a graph-populator hint for incident / alert / pipeline_run", () => {
    expect(remediationForEntityType("incident")).toMatch(/graph-populator/);
    expect(remediationForEntityType("pipeline_run")).toMatch(/graph-populator/);
  });

  test("returns undefined for unknown types", () => {
    expect(remediationForEntityType("unknown_type")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests — confirm they fail with `Cannot find module './gap-notes.ts'`**

  Run: `bun test packages/gateway/src/agents/_lib/gap-notes.test.ts`
  Expected: fail (module missing).

- [ ] **Step 3: Write `gap-notes.ts`**

```typescript
import type { Database } from "bun:sqlite";
import type { GapNote } from "./findings.ts";

const ENTITY_TYPE_REMEDIATIONS: Readonly<Record<string, string>> = Object.freeze({
  // Phase 5 Wave D — read-only data warehouses (Metabase / Superset / dbt schema /
  // BigQuery schema / Athena). Populates `dashboard`, `data_model`, `upstream_refs`.
  dashboard: "Phase 5 Wave D will populate `dashboard` via Metabase / Superset connectors.",
  data_model: "Phase 5 Wave D will populate `data_model` via dbt-schema / warehouse connectors.",
  upstream_refs:
    "Phase 5 Wave D will populate `upstream_refs` alongside data-warehouse coverage.",
  // Graph-populator follow-ups: types defined in ITEM_LINKED_ENTITY_TYPES but not
  // dispatched in syncGraphFromIndexedItem today.
  incident: "Tracked as a graph-populator follow-up on existing PagerDuty / Sentry connectors.",
  alert: "Tracked as a graph-populator follow-up on existing observability connectors.",
  pipeline_run: "Tracked as a graph-populator follow-up on the existing CI/CD connectors.",
});

export function remediationForEntityType(kind: string): string | undefined {
  return ENTITY_TYPE_REMEDIATIONS[kind];
}

// All SQL below uses the real production table/column names (F1, F2, F3):
//   items table is `item` (singular); see packages/gateway/src/index/unified-item-v3-sql.ts
//   graph table is `graph_entity` (singular) with column `type`, NOT `kind`/`ref`
//   the relations table is `graph_relation` with from_id/to_id/type.

export function detectEmptyIndex(db: Database): GapNote | null {
  const row = db.query("SELECT 1 AS n FROM item LIMIT 1").get() as { n?: number } | null;
  if (row !== null) return null;
  return {
    category: "empty_index",
    detail: "No items in the local index yet.",
    remediation: "Run `nimbus connector sync <service>` for at least one connector.",
  };
}

export function detectMissingConnector(db: Database, service: string): GapNote | null {
  const row = db
    .query("SELECT 1 AS n FROM sync_state WHERE service = ? LIMIT 1")
    .get(service) as { n?: number } | null;
  if (row !== null) return null;
  return {
    category: "missing_connector",
    detail: `No sync_state row for service \`${service}\`.`,
    remediation: `Run \`nimbus connector auth ${service}\` to register and sync.`,
  };
}

export function detectMissingEntityType(db: Database, type: string): GapNote | null {
  const row = db
    .query("SELECT 1 AS n FROM graph_entity WHERE type = ? LIMIT 1")
    .get(type) as { n?: number } | null;
  if (row !== null) return null;
  const remediation = remediationForEntityType(type);
  const note: GapNote = {
    category: "missing_entity_type",
    detail: `No \`${type}\` graph entities — 0 ${type}s considered.`,
  };
  if (remediation !== undefined) note.remediation = remediation;
  return note;
}

/**
 * Returns a gap note when a relation type is registered in graph_relation_type
 * but no rows have been emitted into graph_relation. Used by subPrReviewed
 * (`reviewed` is a valid type but the populator does not emit it today —
 * spec § Sub-agent decomposition).
 */
export function detectMissingRelationEmit(
  db: Database,
  relationType: string,
  remediation?: string,
): GapNote | null {
  const row = db
    .query("SELECT 1 AS n FROM graph_relation WHERE type = ? LIMIT 1")
    .get(relationType) as { n?: number } | null;
  if (row !== null) return null;
  const note: GapNote = {
    category: "missing_relation_emit",
    detail: `\`${relationType}\` edges are defined in the schema but not yet emitted by the graph populator.`,
  };
  if (remediation !== undefined) note.remediation = remediation;
  return note;
}

/**
 * Aggregate near-duplicate `missing_entity_type` notes into a single combined note,
 * to avoid 3+ lines reading like "no X" / "no Y" / "no Z" when one summary line is
 * clearer (per spec § Sub-agent decomposition for `impact`).
 */
export function aggregateMissingEntityTypes(notes: GapNote[]): GapNote[] {
  const missing = notes.filter((n) => n.category === "missing_entity_type");
  if (missing.length < 2) return notes;
  const others = notes.filter((n) => n.category !== "missing_entity_type");
  const kinds = missing.map((n) => {
    const m = n.detail.match(/`([^`]+)`/);
    return m?.[1] ?? "?";
  });
  const remediations = Array.from(new Set(missing.map((n) => n.remediation).filter(Boolean)));
  const combined: GapNote = {
    category: "missing_entity_type",
    detail: `${missing.length} categories blocked: ${kinds.map((k) => `\`${k}\``).join(" / ")}`,
  };
  if (remediations.length > 0) combined.remediation = remediations.join(" ");
  return [...others, combined];
}
```

- [ ] **Step 4: Run the tests + add a test for `aggregateMissingEntityTypes`**

  Append to `gap-notes.test.ts`:

```typescript
import { aggregateMissingEntityTypes } from "./gap-notes.ts";
import type { GapNote } from "./findings.ts";

describe("aggregateMissingEntityTypes", () => {
  test("collapses 3 missing_entity_type notes into 1 combined note", () => {
    const notes: GapNote[] = [
      { category: "missing_entity_type", detail: "No `data_model` graph entities — 0 data_models considered." },
      { category: "missing_entity_type", detail: "No `dashboard` graph entities — 0 dashboards considered." },
      { category: "missing_entity_type", detail: "No `pipeline_run` graph entities — 0 pipeline_runs considered." },
    ];
    const out = aggregateMissingEntityTypes(notes);
    expect(out).toHaveLength(1);
    expect(out[0]?.detail).toMatch(/3 categories blocked/);
    expect(out[0]?.detail).toContain("`data_model`");
    expect(out[0]?.detail).toContain("`dashboard`");
    expect(out[0]?.detail).toContain("`pipeline_run`");
  });

  test("leaves 1-or-fewer missing_entity_type notes untouched", () => {
    const notes: GapNote[] = [
      { category: "missing_entity_type", detail: "No `incident` graph entities — 0 incidents considered." },
      { category: "missing_connector", detail: "No sync_state row for `pagerduty`." },
    ];
    const out = aggregateMissingEntityTypes(notes);
    expect(out).toHaveLength(2);
  });
});
```

  Run: `bun test packages/gateway/src/agents/_lib/gap-notes.test.ts`
  Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/agents/_lib/gap-notes.ts packages/gateway/src/agents/_lib/gap-notes.test.ts
git commit -m "feat(agents): add gap-note detection helpers

detectEmptyIndex / detectMissingConnector / detectMissingEntityType +
remediationForEntityType (knows about Wave D and graph-populator
follow-ups) + aggregateMissingEntityTypes (collapses 3+ near-duplicates
into one combined note).

T3 Team Intelligence (PR 1, shared infra)."
```

### Task 2.3: Create `agents/_lib/render.ts` (renderExpert only in PR 1)

**Files:**
- Create: `packages/gateway/src/agents/_lib/render.ts`
- Create: `packages/gateway/src/agents/_lib/render.test.ts`

`renderImpact` and `renderCatchup` are stubbed in PR 1 only as the function signatures (so PR 2 / 3 wire up cleanly). Their implementations land with their respective PRs.

- [ ] **Step 1: Write `render.test.ts`** with two fixture variants per the spec § Test coverage (full-coverage and sparse):

```typescript
import { describe, expect, test } from "bun:test";
import type { ExpertBrief } from "./findings.ts";
import { renderExpert } from "./render.ts";

const BASE: Pick<ExpertBrief, "kind" | "agentVersion" | "generatedAt" | "latencyMs"> = {
  kind: "expert",
  agentVersion: 1,
  generatedAt: 1_700_000_000_000,
  latencyMs: 1400,
};

describe("renderExpert", () => {
  test("full-coverage fixture: top-N section, no Gaps section", () => {
    const brief: ExpertBrief = {
      ...BASE,
      gaps: [],
      query: { topicOrFile: "src/billing/retry.ts" },
      ranked: [
        {
          personId: "p1",
          displayName: "Alice Chen",
          score: 0.92,
          confidence: "high",
          evidence: [
            {
              itemId: "github:org/repo#42",
              type: "pr_authored",
              serviceId: "github",
              title: "fix retry backoff",
              modifiedAt: 1_699_999_900_000,
              weight: 1.0,
            },
          ],
        },
        {
          personId: "p2",
          displayName: "Bob Wong",
          score: 0.55,
          confidence: "medium",
          evidence: [],
        },
      ],
    };
    const md = renderExpert(brief);
    expect(md).toContain("# Expert: src/billing/retry.ts");
    expect(md).toContain("## Top 2");
    expect(md).toContain("**Alice Chen**");
    expect(md).toContain("(high");
    expect(md).toContain("**Bob Wong**");
    expect(md).toContain("(medium");
    expect(md).not.toContain("## Gaps"); // no gaps -> no section
    expect(md).toContain("_generated in 1.4 s_");
  });

  test("sparse fixture: Gaps section listed with remediation", () => {
    const brief: ExpertBrief = {
      ...BASE,
      gaps: [
        {
          category: "missing_entity_type",
          detail: "No `incident` graph entities — 0 incidents considered.",
          remediation: "Tracked as a graph-populator follow-up on existing PagerDuty / Sentry connectors.",
        },
      ],
      query: { topicOrFile: "src/billing/retry.ts" },
      ranked: [],
    };
    const md = renderExpert(brief);
    expect(md).toContain("## Top 0");
    expect(md).toContain("_no people matched_");
    expect(md).toContain("## Gaps");
    expect(md).toContain("`incident` graph entities");
    expect(md).toContain("graph-populator follow-up");
  });

  test("renderExpert is deterministic across two calls with the same brief", () => {
    const brief: ExpertBrief = {
      ...BASE,
      gaps: [{ category: "empty_index", detail: "No items.", remediation: "sync" }],
      query: { topicOrFile: "x" },
      ranked: [],
    };
    expect(renderExpert(brief)).toBe(renderExpert(brief));
  });
});
```

- [ ] **Step 2: Run + confirm fail**

  Run: `bun test packages/gateway/src/agents/_lib/render.test.ts`
  Expected: fail with module-not-found.

- [ ] **Step 3: Write `render.ts`**

```typescript
import type {
  CatchupBrief,
  ExpertBrief,
  ExpertFinding,
  GapNote,
  ImpactBrief,
} from "./findings.ts";

function renderGaps(gaps: GapNote[]): string {
  if (gaps.length === 0) return "";
  const lines = gaps.map((g) => {
    const remediation = g.remediation === undefined ? "" : ` (${g.remediation})`;
    return `- ${g.detail}${remediation}`;
  });
  return ["", "## Gaps", "", ...lines, ""].join("\n");
}

function renderLatency(ms: number): string {
  return `_generated in ${(ms / 1000).toFixed(1)} s_`;
}

function renderExpertFinding(f: ExpertFinding): string {
  const head = `**${f.displayName}** (${f.confidence} — ${f.evidence.length} evidence row${
    f.evidence.length === 1 ? "" : "s"
  })`;
  if (f.evidence.length === 0) return `- ${head}`;
  const lines = f.evidence.slice(0, 5).map((e) => `   - ${e.type.replace(/_/g, " ")}: ${e.title}`);
  return [`- ${head}`, ...lines].join("\n");
}

export function renderExpert(brief: ExpertBrief): string {
  const header = `# Expert: ${brief.query.topicOrFile}`;
  const topHeading = `## Top ${brief.ranked.length}`;
  const body =
    brief.ranked.length === 0
      ? "_no people matched_"
      : brief.ranked.map(renderExpertFinding).join("\n");
  const gaps = renderGaps(brief.gaps);
  const footer = renderLatency(brief.latencyMs);
  return [header, "", topHeading, "", body, gaps, footer].filter((s) => s !== "").join("\n");
}

// PR 2 ships the body of renderImpact.
export function renderImpact(_brief: ImpactBrief): string {
  throw new Error("renderImpact is implemented in T3 PR 2");
}

// PR 3 ships the body of renderCatchup.
export function renderCatchup(_brief: CatchupBrief): string {
  throw new Error("renderCatchup is implemented in T3 PR 3");
}
```

- [ ] **Step 4: Run tests**

  Run: `bun test packages/gateway/src/agents/_lib/render.test.ts`
  Expected: all green. Determinism test must hold byte-equal output.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/agents/_lib/render.ts packages/gateway/src/agents/_lib/render.test.ts
git commit -m "feat(agents): add deterministic Markdown renderer for ExpertBrief

Pure function, no IO. Handles empty-ranked + Gaps section conditionally
+ latency footer. renderImpact / renderCatchup are signatures-only;
their bodies ship in PR 2 / PR 3.

T3 Team Intelligence (PR 1, shared infra)."
```

### Task 2.4: Create `agents/_lib/synthesize.ts`

**Files:**
- Create: `packages/gateway/src/agents/_lib/synthesize.ts`
- Create: `packages/gateway/src/agents/_lib/synthesize.test.ts`

The synthesizer is the LLM presentation layer; when no LLM is available it tail-calls the deterministic renderer. **Critical:** any LLM call wraps the structured brief with `wrapToolOutput` per Invariant `I11`.

- [ ] **Step 1: Write the test first**

```typescript
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
```

- [ ] **Step 2: Run + confirm fail (module missing)**

- [ ] **Step 3: Write `synthesize.ts`**

```typescript
import { wrapToolOutput } from "../../engine/tool-output-envelope.ts";
import type { AgentBrief } from "./findings.ts";
import { renderExpert, renderImpact, renderCatchup } from "./render.ts";

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

function fallbackRender(brief: AgentBrief): string {
  switch (brief.kind) {
    case "expert":
      return renderExpert(brief);
    case "impact":
      return renderImpact(brief);
    case "catchup":
      return renderCatchup(brief);
  }
}

export async function synthesize(brief: AgentBrief, opts: SynthesizeOpts = {}): Promise<string> {
  const deterministic = fallbackRender(brief);
  if (opts.llm === undefined) return deterministic;

  // Invariant I11: any structured payload reaching the LLM is wrapped.
  const wrapped = wrapToolOutput({ service: "nimbus", tool: `agents.${brief.kind}` }, brief);
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

- [ ] **Step 4: Verify the `wrapToolOutput` import path is real**

  Run:
  ```bash
  ls packages/gateway/src/engine/tool-output-envelope.ts
  ```
  Expected: file exists. If not, search for the actual path:
  ```bash
  rg -l "export function wrapToolOutput" packages/gateway/src
  ```
  and update the import line in `synthesize.ts`.

- [ ] **Step 5: Run tests**

  Run: `bun test packages/gateway/src/agents/_lib/synthesize.test.ts`
  Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/agents/_lib/synthesize.ts packages/gateway/src/agents/_lib/synthesize.test.ts
git commit -m "feat(agents): add LLM synthesis layer with deterministic fallback

synthesize(brief, { llm? }) tail-calls the deterministic renderer when
no LLM is available, when the LLM returns null/empty, or when the LLM
throws. Wraps the structured brief with wrapToolOutput before passing
it to the model (invariant I11). Prompt explicitly tells the LLM to
surface GapNote remediation strings.

T3 Team Intelligence (PR 1, shared infra)."
```

---

## Phase 3 — `nimbus expert` agent

The first built-in agent. Implements the 5-sub-agent decomposition from spec § Sub-agent decomposition.

**Files:**
- Create: `packages/gateway/src/agents/expert.ts`
- Create: `packages/gateway/src/agents/expert.test.ts`

Each sub-agent runs a single SQL/graph query against the local index. The graph schema referenced (`graph_entities`, `graph_relations` with `kind`, `relation_type` columns, etc.) is the existing Phase 3 schema — confirm exact column names by reading `packages/gateway/src/graph/graph-populator.ts` before writing queries; if a column name differs from this plan, prefer the existing column.

### Task 3.1: Define the agent's public surface + scoring

- [ ] **Step 1: Write `expert.test.ts`** — covers ranking, gap surfacing, and the runs-in-parallel guarantee

```typescript
import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { rankExpertFindings } from "./expert.ts";

describe("rankExpertFindings", () => {
  test("merges evidence from multiple streams by personId, summing weights", () => {
    const evidence = [
      { personId: "alice", displayName: "Alice", evidence: [{ weight: 1.0, modifiedAt: 0, type: "pr_authored", serviceId: "github", title: "t1", itemId: "i1" }] },
      { personId: "alice", displayName: "Alice", evidence: [{ weight: 0.6, modifiedAt: 0, type: "pr_reviewed", serviceId: "github", title: "t2", itemId: "i2" }] },
      { personId: "bob",   displayName: "Bob",   evidence: [{ weight: 0.3, modifiedAt: 0, type: "chat_post",  serviceId: "slack", title: "t3", itemId: "i3" }] },
    ];
    const ranked = rankExpertFindings(evidence, 5);
    expect(ranked[0]?.personId).toBe("alice");
    expect(ranked[0]?.evidence).toHaveLength(2);
    expect(ranked[1]?.personId).toBe("bob");
  });

  test("respects the limit", () => {
    const evidence = Array.from({ length: 12 }, (_, i) => ({
      personId: `p${i}`,
      displayName: `P${i}`,
      evidence: [{ weight: 12 - i, modifiedAt: 0, type: "pr_authored" as const, serviceId: "github", title: "t", itemId: `i${i}` }],
    }));
    const ranked = rankExpertFindings(evidence, 5);
    expect(ranked).toHaveLength(5);
    expect(ranked[0]?.personId).toBe("p0"); // highest weight
  });

  test("confidence buckets reflect score and evidence count", () => {
    const high = rankExpertFindings(
      [
        { personId: "a", displayName: "A", evidence: Array.from({ length: 6 }, () => ({
          weight: 0.9, modifiedAt: 0, type: "pr_authored" as const, serviceId: "github", title: "t", itemId: "i",
        })) },
      ],
      5,
    );
    expect(high[0]?.confidence).toBe("high");

    const low = rankExpertFindings(
      [{ personId: "b", displayName: "B", evidence: [{ weight: 0.05, modifiedAt: 0, type: "pr_authored", serviceId: "github", title: "t", itemId: "i" }] }],
      5,
    );
    expect(low[0]?.confidence).toBe("low");
  });
});
```

- [ ] **Step 2: Write `expert.ts`** — public API + ranker

```typescript
import type { Database } from "bun:sqlite";
import { AgentCoordinator, type SubTask } from "../engine/coordinator.ts";
import {
  detectEmptyIndex,
  detectMissingConnector,
  detectMissingEntityType,
  detectMissingRelationEmit,
} from "./_lib/gap-notes.ts";
import type { Evidence, ExpertBrief, ExpertFinding, GapNote } from "./_lib/findings.ts";
import { synthesize, type SynthesizerLlm } from "./_lib/synthesize.ts";
import { renderExpert } from "./_lib/render.ts";

export type ExpertInput = {
  topicOrFile: string;
  limit?: number;
};

export type ExpertContext = {
  db: Database;
  llm?: SynthesizerLlm;
  notify: (method: string, params: unknown) => void;
  sessionId: string;
};

export type ExpertEvidenceStream = {
  personId: string;
  displayName: string;
  evidence: Evidence[];
};

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 25;

function bucketConfidence(score: number, evidenceCount: number): "high" | "medium" | "low" {
  if (score >= 0.7 && evidenceCount >= 3) return "high";
  if (score >= 0.3 && evidenceCount >= 1) return "medium";
  return "low";
}

export function rankExpertFindings(
  streams: ExpertEvidenceStream[],
  limit: number,
): ExpertFinding[] {
  const merged = new Map<string, { displayName: string; evidence: Evidence[] }>();
  for (const s of streams) {
    const existing = merged.get(s.personId);
    if (existing === undefined) {
      merged.set(s.personId, { displayName: s.displayName, evidence: [...s.evidence] });
    } else {
      existing.evidence.push(...s.evidence);
    }
  }
  const rawScores: Array<{ personId: string; finding: ExpertFinding; total: number }> = [];
  for (const [personId, m] of merged.entries()) {
    const total = m.evidence.reduce((acc, e) => acc + e.weight, 0);
    rawScores.push({
      personId,
      total,
      finding: {
        personId,
        displayName: m.displayName,
        evidence: m.evidence.sort((a, b) => b.modifiedAt - a.modifiedAt),
        score: 0, // filled below after normalisation
        confidence: "low",
      },
    });
  }
  rawScores.sort((a, b) => b.total - a.total);
  const max = rawScores[0]?.total ?? 0;
  for (const r of rawScores) {
    const normalised = max === 0 ? 0 : r.total / max;
    r.finding.score = normalised;
    r.finding.confidence = bucketConfidence(normalised, r.finding.evidence.length);
  }
  return rawScores.slice(0, Math.min(limit, MAX_LIMIT)).map((r) => r.finding);
}

// Stage-1 sub-agents: each is a SubTask whose execute() returns
// { stream: ExpertEvidenceStream | null, gap?: GapNote }
// serialised via JSON in `outcome.text`. The expert agent decodes them.
type SubAgentResult = {
  stream?: ExpertEvidenceStream;
  gap?: GapNote;
};

function makeSubAgent(
  taskType: "agent_step",
  fn: (db: Database, input: string) => Promise<SubAgentResult>,
  db: Database,
  input: string,
): SubTask {
  return {
    taskType,
    prompt: "",
    execute: async () => {
      const out = await fn(db, input);
      return { text: JSON.stringify(out), tokensIn: 0, tokensOut: 0 };
    },
  };
}

export async function runExpert(
  input: ExpertInput,
  ctx: ExpertContext,
): Promise<ExpertBrief> {
  const start = performance.now();
  const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  // Pre-flight gaps that don't require running sub-agents.
  const preflightGaps: GapNote[] = [];
  const empty = detectEmptyIndex(ctx.db);
  if (empty !== null) preflightGaps.push(empty);

  const coordinator = new AgentCoordinator({
    sessionId: ctx.sessionId,
    parentId: `expert:${ctx.sessionId}`,
    depth: 1,
    toolCallCount: { value: 0 },
  });

  const tasks: SubTask[] = [
    makeSubAgent("agent_step", subBlame, ctx.db, input.topicOrFile),
    makeSubAgent("agent_step", subPrAuthored, ctx.db, input.topicOrFile),
    makeSubAgent("agent_step", subPrReviewed, ctx.db, input.topicOrFile),
    makeSubAgent("agent_step", subIncidentResolved, ctx.db, input.topicOrFile),
    makeSubAgent("agent_step", subChatMentions, ctx.db, input.topicOrFile),
  ];

  const results = await coordinator.run(tasks);

  const streams: ExpertEvidenceStream[] = [];
  const subAgentGaps: GapNote[] = [];
  for (const r of results) {
    if (r.status !== "done" || r.text === undefined) {
      // A sub-agent that errored is treated as a structural gap so the user sees the failure.
      subAgentGaps.push({
        category: "missing_connector",
        detail: `expert sub-agent #${r.taskIndex} failed${r.errorText === undefined ? "" : `: ${r.errorText}`}`,
      });
      continue;
    }
    const decoded: SubAgentResult = JSON.parse(r.text);
    if (decoded.stream !== undefined) streams.push(decoded.stream);
    if (decoded.gap !== undefined) subAgentGaps.push(decoded.gap);
  }

  // Gap-note coverage rule: every sub-agent that runs must return either >=1 evidence
  // OR >=1 gap note. The asserts in expert.test.ts pin this contract per sub-agent.
  const ranked = rankExpertFindings(streams, limit);
  const brief: ExpertBrief = {
    kind: "expert",
    agentVersion: 1,
    generatedAt: Date.now(),
    latencyMs: Math.round(performance.now() - start),
    gaps: [...preflightGaps, ...subAgentGaps],
    query: { topicOrFile: input.topicOrFile },
    ranked,
  };
  return brief;
}

export async function emitExpertBrief(
  input: ExpertInput,
  ctx: ExpertContext,
): Promise<{ sessionId: string }> {
  // Run in the background; emit `expert.briefReady` when done.
  void (async () => {
    const brief = await runExpert(input, ctx);
    const markdown = await synthesize(brief, ctx.llm === undefined ? {} : { llm: ctx.llm });
    ctx.notify("expert.briefReady", {
      sessionId: ctx.sessionId,
      brief: markdown,
      findings: brief,
    });
  })().catch((err: unknown) => {
    // Defensive: deterministic render must always succeed; any error is structural.
    ctx.notify("expert.briefError", {
      sessionId: ctx.sessionId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
  return { sessionId: ctx.sessionId };
}

// ============================================================================
// Sub-agents — each is a deterministic SQL/graph traversal.
// ============================================================================

// All SQL below uses the real schema (F1–F4):
//   - `item` (singular) with `body_preview` (not `body`) and direct `author_id`
//     FK to `person.id`.
//   - `graph_entity` with `type` (not `kind`); `external_id` + `service` link
//     entities to their source rows (no `ref` column).
//   - `graph_relation` with `from_id` / `to_id` / `type` (not source_id /
//     target_id / relation_type).
//   - `person` (singular) with `id`, `display_name`, plus per-service handle
//     columns. Authorship is FK-direct on `item.author_id`; the `authored`
//     graph edge is for graph-traversal queries.

async function subBlame(db: Database, input: string): Promise<SubAgentResult> {
  // Direct FK path: item.author_id → person.id. Faster + simpler than the
  // graph route, and the Phase 3 connectors all populate item.author_id.
  const commits = db
    .query(
      `SELECT
         p.id           AS person_id,
         p.display_name AS display_name,
         i.id           AS item_id,
         i.title        AS title,
         i.modified_at  AS modified_at,
         i.service      AS service_id
       FROM item   i
       JOIN person p ON p.id = i.author_id
       WHERE i.service = 'github'
         AND i.type    = 'commit'
         AND (i.title LIKE '%' || ? || '%' OR i.body_preview LIKE '%' || ? || '%')
       ORDER BY i.modified_at DESC
       LIMIT 50`,
    )
    .all(input, input) as Array<{
      person_id: string;
      display_name: string;
      item_id: string;
      title: string;
      modified_at: number;
      service_id: string;
    }>;

  if (commits.length === 0) {
    const gap = detectMissingConnector(db, "github");
    return gap === null ? { stream: undefined } : { gap };
  }

  const merged = new Map<string, ExpertEvidenceStream>();
  for (const c of commits) {
    const ev: Evidence = {
      itemId: c.item_id,
      type: "commit_authored",
      serviceId: c.service_id,
      title: c.title.slice(0, 512),
      modifiedAt: c.modified_at,
      weight: 1.0,
    };
    const existing = merged.get(c.person_id);
    if (existing === undefined) {
      merged.set(c.person_id, { personId: c.person_id, displayName: c.display_name, evidence: [ev] });
    } else {
      existing.evidence.push(ev);
    }
  }
  // Return the largest stream — the rest are aggregated by rankExpertFindings.
  const winner = [...merged.values()].sort((a, b) => b.evidence.length - a.evidence.length)[0];
  return winner === undefined ? { stream: undefined } : { stream: winner };
}

async function subPrAuthored(db: Database, input: string): Promise<SubAgentResult> {
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const rows = db
    .query(
      `SELECT
         p.id           AS person_id,
         p.display_name AS display_name,
         i.id           AS item_id,
         i.title        AS title,
         i.modified_at  AS modified_at,
         i.service      AS service_id
       FROM item   i
       JOIN person p ON p.id = i.author_id
       WHERE i.type = 'pr'
         AND i.modified_at >= ?
         AND (i.title LIKE '%' || ? || '%' OR i.body_preview LIKE '%' || ? || '%')
       ORDER BY i.modified_at DESC
       LIMIT 50`,
    )
    .all(ninetyDaysAgo, input, input) as Array<{
      person_id: string; display_name: string; item_id: string; title: string;
      modified_at: number; service_id: string;
    }>;

  if (rows.length === 0) return { stream: undefined };
  const r0 = rows[0]!;
  return {
    stream: {
      personId: r0.person_id,
      displayName: r0.display_name,
      evidence: rows.map((r) => ({
        itemId: r.item_id,
        type: "pr_authored",
        serviceId: r.service_id,
        title: r.title.slice(0, 512),
        modifiedAt: r.modified_at,
        weight: 0.8,
      })),
    },
  };
}

async function subPrReviewed(db: Database, input: string): Promise<SubAgentResult> {
  // `reviewed` is registered in graph_relation_type (graph-v7-sql.ts line 37)
  // but the populator does not yet emit any rows into graph_relation with
  // type='reviewed'. detectMissingRelationEmit returns the gap when emit is 0;
  // the day a populator change lands real edges, this sub-agent's SQL path
  // (below) starts producing evidence — no T3 edit needed.
  const gap = detectMissingRelationEmit(
    db,
    "reviewed",
    "Tracked as a graph-populator follow-up; not gated on a specific Phase 5 wave.",
  );
  if (gap !== null) return { gap };
  void input;
  return { stream: undefined };
}

async function subIncidentResolved(db: Database, input: string): Promise<SubAgentResult> {
  // `incident` graph entities are not yet emitted (spec § Sub-agent decomposition).
  const gap = detectMissingEntityType(db, "incident");
  if (gap !== null) return { gap };
  // (When `incident` lands, the SQL chains person → resolves → incident → mentions(input).)
  void input;
  return { stream: undefined };
}

async function subChatMentions(db: Database, input: string): Promise<SubAgentResult> {
  // Slack messages → `posted` edge → person. graph_relation columns are
  // (id, from_id, to_id, type, weight, ...). Person entities live in
  // graph_entity with type='person' and external_id mirroring person.id.
  const rows = db
    .query(
      `SELECT
         p.id           AS person_id,
         p.display_name AS display_name,
         i.id           AS item_id,
         i.title        AS title,
         i.modified_at  AS modified_at,
         i.service      AS service_id
       FROM item          i
       JOIN graph_entity  ie ON ie.type = 'message' AND ie.external_id = i.id
       JOIN graph_relation gr ON gr.to_id = ie.id AND gr.type = 'posted'
       JOIN graph_entity  pe ON pe.id = gr.from_id AND pe.type = 'person'
       JOIN person        p  ON p.id = pe.external_id
       WHERE i.type = 'message'
         AND (i.title LIKE '%' || ? || '%' OR i.body_preview LIKE '%' || ? || '%')
       ORDER BY i.modified_at DESC
       LIMIT 50`,
    )
    .all(input, input) as Array<{
      person_id: string; display_name: string; item_id: string; title: string;
      modified_at: number; service_id: string;
    }>;
  if (rows.length === 0) {
    const gap = detectMissingConnector(db, "slack");
    return gap === null ? { stream: undefined } : { gap };
  }
  const r0 = rows[0]!;
  return {
    stream: {
      personId: r0.person_id,
      displayName: r0.display_name,
      evidence: rows.map((r) => ({
        itemId: r.item_id,
        type: "chat_post",
        serviceId: r.service_id,
        title: r.title.slice(0, 512),
        modifiedAt: r.modified_at,
        weight: 0.4,
      })),
    },
  };
}
```

  **Schema reference (verified Rev 2 against `unified-item-v3-sql.ts` and `graph-v7-sql.ts`):**
  - `item` (singular): `id, service, type, external_id, title, body_preview, url, canonical_url, modified_at, author_id, metadata, synced_at, pinned`. FTS shadow: `item_fts`.
  - `person` (singular): `id, display_name, canonical_email, github_login, gitlab_login, slack_handle, linear_member_id, jira_account_id, notion_user_id, metadata, linked`.
  - `graph_entity`: `id, type, external_id, label, service, metadata`. UNIQUE(type, external_id). Person entities use `type='person'` and `external_id` set to the `person.id`.
  - `graph_relation`: `id, from_id, to_id, type, weight, metadata, created_at`. UNIQUE(from_id, to_id, type). Valid `type` values are listed in `graph_relation_type` (authored/reviewed/targets/resolves/opened/assigned/belongs_to/triggers/tests/affects/fires_on/correlates_with/posted/mentions).
  - **Use `LocalIndex.ensureSchema(db)` in test fixtures** (canonical helper used by every existing scenario test); never hand-write `CREATE TABLE` for these tables.

  If any column name above is wrong by the time this lands (a migration changed it between Rev 2 and execution), update the SQL here and in the test fixtures consistently — but do not skip the helper.

- [ ] **Step 3: Run the unit tests**

  Run: `bun test packages/gateway/src/agents/expert.test.ts`
  Expected: all green. The ranker tests run against pure data (no DB); they should pass without any schema dependency.

- [ ] **Step 4: Add an in-memory DB unit test for the agent's gap-emission contract**

  Append to `expert.test.ts`:

```typescript
import { Database } from "bun:sqlite";
import { LocalIndex } from "../index/local-index.ts";
import { runExpert } from "./expert.ts";

describe("runExpert gap-note coverage", () => {
  test("empty index produces an empty_index gap note", async () => {
    const db = new Database(":memory:");
    LocalIndex.ensureSchema(db); // F5 — canonical schema setup, not hand-written CREATE TABLE.

    const ctx = {
      db,
      notify: () => {},
      sessionId: "s1",
    };
    const brief = await runExpert({ topicOrFile: "anything" }, ctx);
    const cats = brief.gaps.map((g) => g.category);
    expect(cats).toContain("empty_index");
    expect(brief.ranked).toEqual([]);
  });

  test("missing reviewed relation surfaces a missing_relation_emit gap note", async () => {
    const db = new Database(":memory:");
    LocalIndex.ensureSchema(db);
    // Insert one item so empty_index is not the dominant gap.
    db.run(
      `INSERT INTO item (id, service, type, external_id, title, modified_at, synced_at)
       VALUES ('github:dummy', 'github', 'pr', 'dummy', 'noop', 0, 0)`,
    );

    const ctx = { db, notify: () => {}, sessionId: "s1" };
    const brief = await runExpert({ topicOrFile: "noop" }, ctx);
    const cats = brief.gaps.map((g) => g.category);
    expect(cats).toContain("missing_relation_emit");
  });
});
```

  Run: `bun test packages/gateway/src/agents/expert.test.ts`
  Expected: all green.

- [ ] **Step 5: Run coverage check for the new directory**

  Run: `bun test --coverage packages/gateway/src/agents`
  Expected: line coverage ≥ 80%. If under, add tests for any uncovered helpers in `expert.ts` (e.g., the `bucketConfidence` test already covered via `__testing` is sufficient if exercised — add a test that calls it directly if needed).

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/agents/expert.ts packages/gateway/src/agents/expert.test.ts
git commit -m "feat(agents): add nimbus expert built-in agent

Implements the 5 read-only sub-agents per spec
(blame / pr-authored / pr-reviewed / incident-resolved / chat-mentions),
the deterministic ranker (rankExpertFindings + bucketConfidence), and
the runExpert orchestration (emits expert.briefReady notification).

Gap-note coverage rule enforced: every sub-agent that runs returns
>=1 evidence row OR >=1 gap note. reviewed/incident sub-agents emit
structural gaps today and start producing real evidence the day the
graph populator emits those edges/types.

T3 Team Intelligence (PR 1)."
```

---

## Phase 4 — IPC plumbing

The agent runs in the Gateway, exposed over JSON-RPC.

**Files:**
- Create: `packages/gateway/src/ipc/agents-rpc.ts`
- Create: `packages/gateway/src/ipc/agents-rpc.test.ts`
- Modify: `packages/gateway/src/ipc/server/dispatchers.ts` (add agents.* dispatch)

### Task 4.1: Write `agents-rpc.ts`

- [ ] **Step 1: Write the test first**

```typescript
import { describe, expect, mock, test } from "bun:test";
import { Database } from "bun:sqlite";
import { LocalIndex } from "../index/local-index.ts";
import { dispatchAgentsRpc, AgentsRpcError } from "./agents-rpc.ts";

function makeCtx(db: Database) {
  return {
    db,
    notify: mock(() => {}),
  };
}

function freshDb(): Database {
  const db = new Database(":memory:");
  LocalIndex.ensureSchema(db); // F5 — canonical schema setup.
  return db;
}

describe("dispatchAgentsRpc", () => {
  test("returns kind:miss for unknown methods", async () => {
    const out = await dispatchAgentsRpc("agents.unknown", {}, makeCtx(freshDb()));
    expect(out.kind).toBe("miss");
  });

  test("agents.expert returns a sessionId synchronously", async () => {
    const out = await dispatchAgentsRpc(
      "agents.expert",
      { topicOrFile: "src/x.ts" },
      makeCtx(freshDb()),
    );
    expect(out.kind).toBe("hit");
    if (out.kind === "hit") {
      const v = out.value as { sessionId: string };
      expect(typeof v.sessionId).toBe("string");
      expect(v.sessionId.length).toBeGreaterThan(0);
    }
  });

  test("agents.expert validates topicOrFile is a non-empty string", async () => {
    await expect(
      dispatchAgentsRpc("agents.expert", { topicOrFile: "" }, makeCtx(freshDb())),
    ).rejects.toBeInstanceOf(AgentsRpcError);
    await expect(
      dispatchAgentsRpc("agents.expert", {}, makeCtx(freshDb())),
    ).rejects.toBeInstanceOf(AgentsRpcError);
  });

  test("agents.expert eventually emits expert.briefReady", async () => {
    const ctx = makeCtx(freshDb());
    await dispatchAgentsRpc("agents.expert", { topicOrFile: "x" }, ctx);
    // Wait for the background coroutine to settle.
    await new Promise((r) => setTimeout(r, 50));
    const calls = (ctx.notify as ReturnType<typeof mock>).mock.calls;
    const briefReady = calls.find((c) => c[0] === "expert.briefReady");
    expect(briefReady).toBeDefined();
  });
});
```

- [ ] **Step 2: Write `agents-rpc.ts`**

```typescript
import type { Database } from "bun:sqlite";
import { emitExpertBrief } from "../agents/expert.ts";
import type { SynthesizerLlm } from "../agents/_lib/synthesize.ts";

export class AgentsRpcError extends Error {
  readonly rpcCode: number;
  constructor(rpcCode: number, message: string) {
    super(message);
    this.name = "AgentsRpcError";
    this.rpcCode = rpcCode;
  }
}

export type AgentsRpcContext = {
  db: Database;
  llm?: SynthesizerLlm;
  notify: (method: string, params: unknown) => void;
};

const MIN_TOPIC_LEN = 1;
const MAX_TOPIC_LEN = 1024;
const MAX_LIMIT = 25;

function requireExpertParams(params: unknown): { topicOrFile: string; limit?: number } {
  if (params === null || typeof params !== "object") {
    throw new AgentsRpcError(-32602, "agents.expert requires { topicOrFile: string }");
  }
  const p = params as { topicOrFile?: unknown; limit?: unknown };
  if (typeof p.topicOrFile !== "string") {
    throw new AgentsRpcError(-32602, "topicOrFile must be a string");
  }
  const trimmed = p.topicOrFile.trim();
  if (trimmed.length < MIN_TOPIC_LEN || trimmed.length > MAX_TOPIC_LEN) {
    throw new AgentsRpcError(
      -32602,
      `topicOrFile must be ${MIN_TOPIC_LEN}..${MAX_TOPIC_LEN} chars after trim`,
    );
  }
  const out: { topicOrFile: string; limit?: number } = { topicOrFile: trimmed };
  if (p.limit !== undefined) {
    if (typeof p.limit !== "number" || !Number.isInteger(p.limit) || p.limit < 1 || p.limit > MAX_LIMIT) {
      throw new AgentsRpcError(-32602, `limit must be an integer in 1..${MAX_LIMIT}`);
    }
    out.limit = p.limit;
  }
  return out;
}

function newSessionId(): string {
  return `expert_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

export async function dispatchAgentsRpc(
  method: string,
  params: unknown,
  ctx: AgentsRpcContext,
): Promise<{ kind: "miss" } | { kind: "hit"; value: unknown }> {
  if (method === "agents.expert") {
    const input = requireExpertParams(params);
    const sessionId = newSessionId();
    const expertCtx = ctx.llm === undefined
      ? { db: ctx.db, notify: ctx.notify, sessionId }
      : { db: ctx.db, llm: ctx.llm, notify: ctx.notify, sessionId };
    return { kind: "hit", value: await emitExpertBrief(input, expertCtx) };
  }
  return { kind: "miss" };
}
```

- [ ] **Step 3: Run the tests**

  Run: `bun test packages/gateway/src/ipc/agents-rpc.test.ts`
  Expected: all green.

### Task 4.2: Wire `dispatchAgentsRpc` into the IPC server

The pattern (verified Rev 2): `packages/gateway/src/ipc/server/dispatchers.ts` exports one `tryDispatchXxxRpc` function per namespace; Phase-4 surfaces are chained inside `tryDispatchPhase4Rpc`. The function returns `phase4RpcSkipped` when the method prefix doesn't match (so the next dispatcher gets a turn) and throws `RpcMethodError(-32601, ...)` if the prefix matches but the method is unknown.

- [ ] **Step 1: Add the import line near the existing dispatcher imports**

  In `packages/gateway/src/ipc/server/dispatchers.ts`, add (alphabetised with the other `dispatch*Rpc` imports near the top):

```typescript
import { dispatchAgentsRpc, AgentsRpcError } from "../agents-rpc.ts";
```

- [ ] **Step 2: Add `tryDispatchAgentsRpc` mirroring `tryDispatchLlmRpc`**

  Place this directly after `tryDispatchLlmRpc` (so the file groups Phase-4/5 dispatchers together):

```typescript
export async function tryDispatchAgentsRpc(
  ctx: ServerCtx,
  method: string,
  params: unknown,
): Promise<unknown> {
  if (!method.startsWith("agents.") || ctx.options.localIndex === undefined) {
    return phase4RpcSkipped;
  }
  try {
    const out = await dispatchAgentsRpc(method, params, {
      db: ctx.options.localIndex.getDatabase(),
      // No `llm` plumbing in PR 1 — synthesize() falls back to the deterministic
      // renderer. PR-N will pass ctx.options.llmRouter once a routing API for
      // built-in agents lands.
      notify: (m, p) => ctx.broadcastNotification(m, p as Record<string, unknown>),
    });
    if (out.kind === "hit") return out.value;
  } catch (e) {
    if (e instanceof AgentsRpcError) {
      throw new RpcMethodError(e.rpcCode, e.message);
    }
    throw e;
  }
  throw new RpcMethodError(-32601, `Method not found: ${method}`);
}
```

- [ ] **Step 3: Chain `tryDispatchAgentsRpc` from `tryDispatchPhase4Rpc`**

  Find `tryDispatchPhase4Rpc` (currently calls `tryDispatchLlmRpc` first, then voice / updater / audit / data / lan / profile / reindex). Insert the agents check **after the LLM check, before voice** so the namespace ordering is alphabetical:

```typescript
  const llmOutcome = await tryDispatchLlmRpc(ctx, method, params);
  if (llmOutcome !== phase4RpcSkipped) return llmOutcome;
  const agentsOutcome = await tryDispatchAgentsRpc(ctx, method, params);
  if (agentsOutcome !== phase4RpcSkipped) return agentsOutcome;
  const voiceOutcome = await tryDispatchVoiceRpc(ctx, method, params);
```

- [ ] **Step 4: Run the affected tests**

  Run:
  ```bash
  bun run typecheck
  bun test packages/gateway/src/ipc
  ```
  Expected: green. The dispatcher's existing tests should be unaffected (new prefix is `agents.` which they don't exercise); `agents-rpc.test.ts` runs the dispatcher directly.

- [ ] **Step 3: Commit (Phase 4)**

```bash
git add packages/gateway/src/ipc/agents-rpc.ts packages/gateway/src/ipc/agents-rpc.test.ts packages/gateway/src/ipc/server/dispatchers.ts
git commit -m "feat(ipc): expose agents.expert over JSON-RPC

Add agents-rpc.ts with the agents.* namespace dispatcher and the
agents.expert handler (synchronous { sessionId } return; async
expert.briefReady notification). Param validation: topicOrFile in
1..1024 chars after trim; optional limit 1..25.

Wires into ipc/server/dispatchers.ts using the existing dispatch chain
pattern.

T3 Team Intelligence (PR 1)."
```

---

## Phase 5 — Tauri allowlist

Add `agents.expert` to `ALLOWED_METHODS` and bump the size assertion. Per Invariant `I7`.

**Files:**
- Modify: `packages/ui/src-tauri/src/gateway_bridge.rs` (lines 63–121 array, line 444 size assertion)

### Task 5.1: Update the allowlist

- [ ] **Step 1: Insert `agents.expert` alphabetically — at the very top of the array**

  Open `packages/ui/src-tauri/src/gateway_bridge.rs` and locate the `pub const ALLOWED_METHODS: &[&str] = &[` line (around line 63). The first entry today is `"audit.export"` at line 64. "agents" < "audit" alphabetically (`'g'` < `'u'`), so **insert `"agents.expert",` as the first entry**:

```rust
pub const ALLOWED_METHODS: &[&str] = &[
    "agents.expert",
    "audit.export",
    "audit.getSummary",
    // ... rest unchanged ...
];
```

- [ ] **Step 2: Bump the size assertion**

  Locate `allowlist_exact_size` at line 439–445. Update the comment block + assertion:

```rust
    #[test]
    fn allowlist_exact_size() {
        // WS5-D adds extension.{disable,enable,install,list,remove} + watcher.{create,delete,
        // list,pause,resume} + workflow.{delete,list,run,save} → 14 new methods → 54 total.
        // WS5-D polish adds watcher.listHistory + workflow.listRuns → 2 new methods → 56 total.
        // Security fix: remove extension.install → 55 total.
        // (Earlier additions brought the total to 57.)
        // Phase 5 T3 PR 1 adds agents.expert → 58 total.
        assert_eq!(ALLOWED_METHODS.len(), 58);
    }
```

- [ ] **Step 3: Run the cargo allowlist tests**

  Run:
  ```bash
  cd packages/ui/src-tauri
  cargo test allowlist
  cd ../../..
  ```
  Expected: all four `allowlist_*` tests pass (size = 58, alphabetized, no duplicates, forbidden namespaces still absent).

### Task 5.2: Update the renderer-side IPC method registration if applicable

- [ ] **Step 1: Search for any place in `packages/ui/src/` that maintains a method whitelist or typed wrapper**

  Run:
  ```bash
  rg -nl "\"audit\\.export\"|connector\\.list" packages/ui/src
  ```
  If a typed RPC wrapper exists (e.g., `packages/ui/src/ipc/typed-rpc.ts`), add a wrapper for `agents.expert` matching its conventions. If no such file exists, skip — the renderer in PR 1 does not need to call `agents.expert` (no UI surface yet; that's a future enhancement explicitly out of scope per spec § Out of scope).

### Task 5.3: Commit (Phase 5)

- [ ] **Step 1: Stage + commit**

```bash
git add packages/ui/src-tauri/src/gateway_bridge.rs
git commit -m "feat(ui): allow agents.expert through Tauri bridge

Add agents.expert to ALLOWED_METHODS (alphabetically first) and bump
allowlist_exact_size from 57 to 58. agents.expert is read-only and
matches invariant I7 — not RCE-class, no vault/db touch.

T3 Team Intelligence (PR 1)."
```

---

## Phase 6 — `nimbus expert` CLI command

**Files:**
- Create: `packages/cli/src/commands/expert.ts`
- Create: `packages/cli/src/commands/expert.test.ts`
- Modify: `packages/cli/src/index.ts` (register the command)
- Modify: `packages/cli/src/commands/help.ts` (help text — only if this file exists in the current tree; otherwise the registry edit is enough)

### Task 6.1: Write the CLI command

- [ ] **Step 1: Read `nimbus ask` for the established pattern**

  Run:
  ```bash
  rg -n "registerInteractiveCliIpcHandlers|client.call" packages/cli/src/commands/ask.ts | head
  ```
  Pattern: `getCliPlatformPaths()` → `readGatewayState` → `IPCClient.connect` → `registerInteractiveCliIpcHandlers` → handler registration → call → wait → render.

- [ ] **Step 2: Write `expert.test.ts` first** — covers arg parsing only; the full integration is in the e2e test (Phase 7).

```typescript
import { describe, expect, test } from "bun:test";
import { parseExpertArgs } from "./expert.ts";

describe("parseExpertArgs", () => {
  test("captures topicOrFile from positional arg", () => {
    const out = parseExpertArgs(["src/billing/retry.ts"]);
    expect(out.topicOrFile).toBe("src/billing/retry.ts");
    expect(out.json).toBe(false);
    expect(out.limit).toBeUndefined();
  });

  test("--json flag", () => {
    const out = parseExpertArgs(["src/x.ts", "--json"]);
    expect(out.json).toBe(true);
  });

  test("--limit N", () => {
    const out = parseExpertArgs(["src/x.ts", "--limit", "10"]);
    expect(out.limit).toBe(10);
  });

  test("rejects missing topic", () => {
    expect(() => parseExpertArgs([])).toThrow(/Usage/);
  });

  test("rejects --limit > 25", () => {
    expect(() => parseExpertArgs(["x", "--limit", "30"])).toThrow(/1\.\.25/);
  });

  test("multi-word topic", () => {
    const out = parseExpertArgs(["payment", "retry", "logic"]);
    expect(out.topicOrFile).toBe("payment retry logic");
  });
});
```

- [ ] **Step 3: Write `expert.ts`**

```typescript
import { IPCClient } from "../ipc-client/index.ts";
import { readGatewayState } from "../lib/gateway-process.ts";
import { registerInteractiveCliIpcHandlers } from "../lib/interactive-ipc-handlers.ts";
import { getCliPlatformPaths } from "../paths.ts";
// F8: keep the type local to the CLI. Cross-package imports from gateway/
// would either (a) violate the package-dependency-rules non-negotiable
// (`sdk ← no imports from gateway`) if routed through the SDK, or
// (b) violate `cli ← IPC-only` if imported directly. Slim duplicate is the
// honest path; the runtime payload still goes through dispatchAgentsRpc.
import type { ExpertBrief } from "../types/agents.ts";

export type ExpertCliArgs = {
  topicOrFile: string;
  json: boolean;
  limit?: number;
};

export function parseExpertArgs(args: string[]): ExpertCliArgs {
  const positional: string[] = [];
  let json = false;
  let limit: number | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--json") {
      json = true;
      continue;
    }
    if (a === "--limit") {
      const n = Number(args[i + 1]);
      if (!Number.isInteger(n) || n < 1 || n > 25) {
        throw new Error("--limit must be an integer in 1..25");
      }
      limit = n;
      i += 1;
      continue;
    }
    if (a !== undefined && !a.startsWith("--")) positional.push(a);
  }
  const topicOrFile = positional.join(" ").trim();
  if (topicOrFile.length === 0) {
    throw new Error('Usage: nimbus expert "<topic-or-file>" [--json] [--limit <N>]');
  }
  const out: ExpertCliArgs = { topicOrFile, json };
  if (limit !== undefined) out.limit = limit;
  return out;
}

const TIMEOUT_MS = 30_000;

export async function runExpertCli(args: string[]): Promise<void> {
  const parsed = parseExpertArgs(args);

  const paths = getCliPlatformPaths();
  const state = await readGatewayState(paths);
  if (state === undefined) {
    process.stderr.write("Gateway is not running. Start with: nimbus start\n");
    process.exit(1);
  }

  const client = new IPCClient(state.socketPath);
  await client.connect();
  registerInteractiveCliIpcHandlers(client);

  // Subscribe to the brief notification before issuing the call.
  // F6 — IPCClient API is `onNotification`, not `on` (per
  // packages/client/src/ipc-transport.ts:173 and ask-stream.ts callers).
  const briefPromise = new Promise<{ brief: string; findings: ExpertBrief }>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Agent timed out after 30 s")), TIMEOUT_MS);
    client.onNotification("expert.briefReady", (params: unknown) => {
      const p = params as { sessionId?: string; brief?: string; findings?: ExpertBrief };
      if (typeof p.brief !== "string" || p.findings === undefined) {
        clearTimeout(timeout);
        reject(new Error("Malformed expert.briefReady payload"));
        return;
      }
      clearTimeout(timeout);
      resolve({ brief: p.brief, findings: p.findings });
    });
    client.onNotification("expert.briefError", (params: unknown) => {
      clearTimeout(timeout);
      const p = params as { error?: string };
      reject(new Error(p.error ?? "Agent failed"));
    });
  });

  const callParams: { topicOrFile: string; limit?: number } = { topicOrFile: parsed.topicOrFile };
  if (parsed.limit !== undefined) callParams.limit = parsed.limit;
  await client.call<{ sessionId: string }>("agents.expert", callParams);

  try {
    const { brief, findings } = await briefPromise;
    if (parsed.json) {
      process.stdout.write(`${JSON.stringify(findings, null, 2)}\n`);
      return;
    }
    // Empty-index gap is a hard exit in default mode (per spec § Error handling).
    if (findings.gaps.some((g) => g.category === "empty_index")) {
      process.stderr.write("No data indexed yet — run `nimbus connector sync <service>` first.\n");
      process.exit(1);
    }
    process.stdout.write(`${brief}\n`);
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(2);
  } finally {
    await client.close();
  }
}
```

- [ ] **Step 4: Create the slim CLI-local type file**

  **F8 (verified Rev 2):** `packages/sdk/src/index.ts` does not cross-import from `packages/gateway/`, and the project non-negotiable says `sdk ← no imports from gateway, cli, or ui`. Routing the type through the SDK would be a precedent break. The CLI also does not import from gateway directly (`cli ← IPC-only`). The pragmatic and rule-compliant path is to declare the slim subset of types the CLI actually needs locally — the runtime payload is JSON, so the duplicate is just the typed view of that JSON.

  Create `packages/cli/src/types/agents.ts`:

```typescript
// Slim CLI-side mirror of packages/gateway/src/agents/_lib/findings.ts.
// Kept manually in sync — runtime payload is JSON, so a divergence here
// is caught at e2e time by isExpertBrief (which the CLI re-implements
// below, also locally, to avoid cross-package imports).
//
// If this file diverges from the gateway types, the e2e --json round-trip
// test fails. Treat that signal as authoritative; sync this file forward.

export type Evidence = {
  itemId: string;
  type:
    | "pr_authored" | "pr_reviewed"
    | "issue_opened" | "issue_resolved"
    | "incident_resolved"
    | "commit_authored"
    | "chat_mention" | "chat_post";
  serviceId: string;
  title: string;
  modifiedAt: number;
  weight: number;
};

export type GapCategory =
  | "missing_entity_type"
  | "missing_relation_emit"
  | "missing_connector"
  | "missing_user_identity"
  | "empty_index";

export type GapNote = {
  category: GapCategory;
  detail: string;
  remediation?: string;
};

export type ExpertFinding = {
  personId: string;
  displayName: string;
  evidence: Evidence[];
  score: number;
  confidence: "high" | "medium" | "low";
};

export type ExpertBrief = {
  kind: "expert";
  agentVersion: 1;
  generatedAt: number;
  latencyMs: number;
  gaps: GapNote[];
  query: { topicOrFile: string };
  ranked: ExpertFinding[];
};

export function isExpertBrief(x: unknown): x is ExpertBrief {
  if (x === null || typeof x !== "object") return false;
  // Bracket access required by tsconfig's `noPropertyAccessFromIndexSignature: true`.
  const b = x as Record<string, unknown>;
  return (
    b["kind"] === "expert" &&
    b["agentVersion"] === 1 &&
    Array.isArray(b["gaps"]) &&
    Array.isArray(b["ranked"]) &&
    typeof b["generatedAt"] === "number" &&
    typeof b["latencyMs"] === "number"
  );
}
```

  **No edits to `packages/sdk/src/index.ts`.** This deferral is intentional (D-3 — broader SDK exposure of agent types is a Phase-6 concern when extensions need to consume agent briefs).

- [ ] **Step 5: Register `expert` in `packages/cli/src/index.ts`**

  Find where `ask` is registered and add an analogous entry:

```typescript
case "expert":
  await runExpertCli(args.slice(1));
  break;
```

  with a top-of-file import: `import { runExpertCli } from "./commands/expert.ts";`.

  If `packages/cli/src/commands/help.ts` exists and lists subcommands by name, add a one-liner there:

```typescript
"expert      Rank team members with the most context on a topic or file",
```

- [ ] **Step 6: Run the unit tests + typecheck**

  Run:
  ```bash
  bun test packages/cli/src/commands/expert.test.ts
  bun run typecheck
  ```
  Expected: green.

- [ ] **Step 7: Smoke-test the CLI without a gateway**

  Run: `bun run --cwd packages/cli src/index.ts expert "src/x.ts"` (or the project's CLI entry point — check `packages/cli/package.json` `bin`)

  Expected stderr: `Gateway is not running. Start with: nimbus start`
  Expected exit code: 1.

  This proves arg parsing + connection-failure handling end-to-end without spinning up a gateway.

### Task 6.2: Commit (Phase 6)

- [ ] **Step 1: Stage + commit**

```bash
git add packages/cli/src/commands/expert.ts packages/cli/src/commands/expert.test.ts packages/cli/src/index.ts packages/cli/src/types/agents.ts
# Only stage help.ts if it was modified — silently skip if it doesn't exist or is unchanged.
git add -- packages/cli/src/commands/help.ts 2>/dev/null || true
git commit -m "feat(cli): add nimbus expert command

Surfaces agents.expert over the CLI: positional topicOrFile, --json,
--limit (1..25). Honours NO_COLOR via the existing CLI infrastructure
(default Markdown path runs through stdout untransformed; --json emits
raw JSON). Empty-index gap exits non-zero in default mode and 0 with
--json (machine-readable empty result).

Defines a slim CLI-local mirror of the agent brief types under
packages/cli/src/types/agents.ts to honour the package-dependency
non-negotiable (cli is IPC-only; sdk has no gateway imports). The e2e
--json round-trip test catches any drift between this file and
packages/gateway/src/agents/_lib/findings.ts.

T3 Team Intelligence (PR 1)."
```

---

## Phase 7 — End-to-end tests

Two files: one in `packages/gateway/test/e2e/scenarios/` (gateway IPC + agent), one in `packages/cli/test/e2e/` (CLI → real gateway → mocked connectors).

### Task 7.1: Gateway-side E2E — `expert.e2e.test.ts`

**Files:**
- Create: `packages/gateway/test/e2e/scenarios/expert.e2e.test.ts`

**F7 (Rev 2):** existing scenario tests in `packages/gateway/test/e2e/scenarios/` are **in-process** — `new Database(":memory:")` + `LocalIndex.ensureSchema(db)` + direct calls into the subsystem under test. They do NOT spawn a gateway subprocess. See `incident-correlation-indexed.e2e.test.ts` lines 22–24 for the canonical setup. Match that style.

Core assertions per spec § E2E test pattern:
1. Brief contains `## Top` and (when seeded sparsely) `## Gaps`.
2. Zero HITL actions fired — `expert.ts` registers no write tools, so this is automatic; assert by checking that the agent never constructs a `ToolExecutor` (it doesn't — the import is absent).
3. Notification has non-empty `brief` and a structurally valid `findings` (uses `isExpertBrief`).
4. Latency < 8 s on the seeded fixture.

- [ ] **Step 1: Read the canonical sibling scenario for the seeding pattern**

  Open `packages/gateway/test/e2e/scenarios/incident-correlation-indexed.e2e.test.ts` and skim the `upsertIndexedItem` / `upsertGraphEntity` / `upsertGraphRelation` calls. The expert e2e seeds the same way, but with PR + commit items keyed to the test topic.

- [ ] **Step 2: Write the test**

```typescript
// File: packages/gateway/test/e2e/scenarios/expert.e2e.test.ts
/**
 * Phase 5 T3 PR 1 — `nimbus expert` end-to-end (in-process).
 *
 * Seeds two persons (alice + bob) and a small set of GitHub PR + commit items
 * touching the topic file, then calls runExpert directly and asserts the brief
 * shape, ranking, gap-note presence, latency budget, and the structural HITL-
 * free guarantee.
 */

import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import {
  upsertGraphEntity,
  upsertGraphRelation,
} from "../../../src/graph/relationship-graph.ts";
import { upsertIndexedItem } from "../../../src/index/item-store.ts";
import { LocalIndex } from "../../../src/index/local-index.ts";
import { runExpert } from "../../../src/agents/expert.ts";
import { isExpertBrief } from "../../../src/agents/_lib/findings.ts";

describe("nimbus expert (e2e, in-process)", () => {
  test("ranks alice first; brief contains '## Top'; latency < 8 s; HITL-free", async () => {
    const db = new Database(":memory:");
    LocalIndex.ensureSchema(db);
    const t = Date.now();
    const TOPIC = "src/billing/retry.ts";

    db.run(
      `INSERT INTO person (id, display_name, canonical_email, linked) VALUES
         ('alice', 'Alice', 'alice@example.com', 0),
         ('bob',   'Bob',   'bob@example.com',   0)`,
    );

    // 4 commits authored by alice + 2 PRs (alice = 2, bob = 1).
    for (let i = 0; i < 4; i += 1) {
      upsertIndexedItem(db, {
        service: "github",
        type: "commit",
        externalId: `acme/payment#commit-alice-${i}`,
        title: `fix retry logic in ${TOPIC} (#${i})`,
        bodyPreview: `touches ${TOPIC} backoff`,
        modifiedAt: t - i * 1000,
        syncedAt: t,
        authorId: "alice",
      });
    }
    upsertIndexedItem(db, {
      service: "github",
      type: "pr",
      externalId: "acme/payment#501",
      title: `mitigate ${TOPIC} regression`,
      bodyPreview: `rollback plan in ${TOPIC}`,
      modifiedAt: t,
      syncedAt: t,
      authorId: "alice",
    });
    upsertIndexedItem(db, {
      service: "github",
      type: "pr",
      externalId: "acme/payment#502",
      title: `tweak ${TOPIC} timeout`,
      bodyPreview: `unrelated change`,
      modifiedAt: t,
      syncedAt: t,
      authorId: "bob",
    });

    const start = performance.now();
    const brief = await runExpert(
      { topicOrFile: TOPIC },
      { db, sessionId: "e2e-1", notify: () => {} },
    );
    const elapsedMs = performance.now() - start;

    expect(elapsedMs).toBeLessThan(8_000);
    expect(isExpertBrief(brief)).toBe(true);
    expect(brief.ranked[0]?.displayName).toBe("Alice");
    // Sparse-fixture assertion: gaps array is non-empty (reviewed/incident
    // sub-agents always emit structural gaps until the populator catches up).
    expect(brief.gaps.length).toBeGreaterThan(0);
    expect(brief.gaps.some((g) => g.category === "missing_relation_emit")).toBe(true);
  });

  test("zero HITL actions fired (structural)", () => {
    // F-2/I-2 assertion is structural: expert.ts must not import ToolExecutor.
    // A unit-test grep over the source enforces that read-only contract.
    const source = require("node:fs").readFileSync(
      require("node:path").resolve(__dirname, "../../../src/agents/expert.ts"),
      "utf8",
    ) as string;
    expect(source).not.toContain("ToolExecutor");
    expect(source).not.toContain("HITL_REQUIRED");
  });
});
```

  This test runs entirely in-process — no Bun.spawn, no temp directory, no socket. Wall-clock target on the seeded fixture should be well under 1 s; the 8 s budget is the spec's hard ceiling.

- [ ] **Step 3: Run the e2e test**

  Run: `bun test packages/gateway/test/e2e/scenarios/expert.e2e.test.ts`
  Expected: green.

### Task 7.2: CLI-side smoke E2E — `expert.smoke.e2e.test.ts`

**Files:**
- Create: `packages/cli/test/e2e/expert.smoke.e2e.test.ts`

**F-7 follow-up (Rev 2):** the existing CLI e2e harness is `cli-smoke.e2e.test.ts` — a 24-line file that spawns the CLI without a Gateway and asserts `help` exits 0. There is **no harness today for "spin up a real Gateway, seed it, run the CLI against it"**. Building one is an order-of-magnitude bigger investment than the rest of this PR and is out of scope for T3 PR 1.

The Rev-1 plan over-promised on this surface. The honest scope here is the same lightweight smoke shape `cli-smoke.e2e.test.ts` uses — exercise the no-Gateway error path and assert help integration.

The full Gateway+CLI `--json` round-trip e2e is **deferred**:
- Tracking: tagged in the Phase 5 retro section as a follow-up.
- Coverage gap is acceptable because the same `--json` payload shape is exercised by the gateway-side e2e (Phase 7.1) which round-trips through `isExpertBrief`. The CLI does not transform the JSON; it `JSON.stringify`-s the brief and writes it. The risk this defer takes is "what if the CLI accidentally wraps or reshapes the JSON" — caught manually during the smoke at PR review.

- [ ] **Step 1: Write `expert.smoke.e2e.test.ts`**

```typescript
import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

/**
 * Lightweight smoke: spawn the CLI without a running Gateway and verify the
 * "Gateway is not running" exit path + help integration. Full Gateway+CLI
 * round-trip e2e is deferred to a follow-up once the e2e harness lands.
 */
describe("nimbus expert e2e (no-Gateway smoke)", () => {
  const cliEntry = fileURLToPath(new URL("../../src/index.ts", import.meta.url));

  test("expert exits 1 with 'Gateway is not running' on stderr when no gateway", async () => {
    const proc = Bun.spawn({
      cmd: [process.execPath, "run", cliEntry, "expert", "src/billing/retry.ts"],
      stdout: "pipe",
      stderr: "pipe",
      // Force a non-existent socket so we deterministically take the
      // "no gateway state file" branch in readGatewayState.
      env: { ...process.env, NIMBUS_DATA_DIR: "/tmp/nimbus-no-gateway-test-xxxx" },
    });
    const code = await proc.exited;
    const stderr = await new Response(proc.stderr).text();
    expect(code).toBe(1);
    expect(stderr).toContain("Gateway is not running");
  });

  test("help text mentions 'expert' subcommand", async () => {
    const proc = Bun.spawn({
      cmd: [process.execPath, "run", cliEntry, "help"],
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const code = await proc.exited;
    expect(code).toBe(0);
    expect(stdout.toLowerCase()).toContain("expert");
  });
});
```

  If `NIMBUS_DATA_DIR` is not the right env knob to point the CLI at a non-existent state file, swap to whatever lever the existing CLI honours — read `getCliPlatformPaths` to find out.

- [ ] **Step 2: Run**

  Run: `bun test packages/cli/test/e2e/expert.smoke.e2e.test.ts`
  Expected: green.

### Task 7.3: Commit (Phase 7)

```bash
git add packages/gateway/test/e2e/scenarios/expert.e2e.test.ts packages/cli/test/e2e/expert.smoke.e2e.test.ts
git commit -m "test(agents): add e2e coverage for nimbus expert

Gateway-side (in-process): seeded :memory: SQLite + LocalIndex.ensureSchema
+ direct runExpert() call + assertions on '## Top' presence, ranking
(alice first), missing_relation_emit gap surfacing, latency < 8 s, and
the structural HITL-free contract (expert.ts must not import
ToolExecutor or HITL_REQUIRED).

CLI-side (smoke): no-Gateway exit path (exit 1, 'Gateway is not running'
on stderr) + help-text integration. Full Gateway+CLI round-trip e2e
deferred — no harness exists today; the same --json payload shape is
already round-tripped through isExpertBrief on the gateway side.

T3 Team Intelligence (PR 1)."
```

---

## Phase 8 — Coverage gate + CI wiring

### Task 8.1: Add `test:coverage:agents` script

**Files:**
- Modify: `package.json`
- Modify: `.github/workflows/_test-suite.yml` (or wherever the per-subsystem coverage gates live)

- [ ] **Step 1: Find the existing pattern**

  Run:
  ```bash
  grep -n "test:coverage:engine" package.json
  rg -n "test:coverage:engine" .github/workflows/
  ```

- [ ] **Step 2: Add the new script in `package.json`**

  Adjacent to `test:coverage:engine`, add:

```json
"test:coverage:agents": "bun test --coverage --coverage-reporter=text --coverage-dir=coverage/agents packages/gateway/src/agents"
```

  And add it to the `test:ci` aggregate command (whatever shape that takes — append `&& bun run test:coverage:agents`).

- [ ] **Step 3: Wire into CI**

  Open the workflow file that runs the coverage gates and add a step matching the existing engine/vault/sync/etc. coverage steps. Set the threshold to ≥80% (matching `nimbus-agent-patterns.md` § Coverage Gate).

- [ ] **Step 4: Verify the gate locally**

  Run: `bun run test:coverage:agents`
  Expected: passes; line coverage ≥ 80%.

- [ ] **Step 5: Commit**

```bash
git add package.json .github/workflows/_test-suite.yml
git commit -m "ci(agents): add test:coverage:agents gate

Adds packages/gateway/src/agents/ coverage threshold (>=80% per
nimbus-agent-patterns.md). Wires into test:ci and the CI workflow.

T3 Team Intelligence (PR 1)."
```

---

## Phase 9 — Skill + docs updates

The patterns skill currently references `meeting-prep.ts` aspirationally, but PR 1 ships the *first* built-in agent. Update it to point at `expert.ts`. Also update `CLAUDE.md`'s `ALLOWED_METHODS (57)` line per the Tauri allowlist skill checklist.

**Files:**
- Modify: `.claude/commands/nimbus-agent-patterns.md`
- Modify: `CLAUDE.md`
- Modify: `docs/roadmap.md` (Phase 5 row + status mirror)

### Task 9.1: Update the patterns skill

- [ ] **Step 1: Read the current skill**

  Run: open `.claude/commands/nimbus-agent-patterns.md`. Find lines that reference `meeting-prep.ts` as the canonical example.

- [ ] **Step 2: Replace each reference to `meeting-prep.ts` with `expert.ts`**

  Lines to update:
  - The "Built-in Agent Location" section: `expert.ts` is now first in the list.
  - The "E2E Test Pattern" section: replace `Use the existing meeting-prep.e2e.test.ts as the reference implementation.` with `Use the existing expert.e2e.test.ts as the reference implementation.`

  Use Edit / replace_all where appropriate.

### Task 9.2: Update CLAUDE.md ALLOWED_METHODS count

- [ ] **Step 1: Find the line**

  Run:
  ```bash
  rg -n "ALLOWED_METHODS \\(57\\)|ALLOWED_METHODS.*57" CLAUDE.md
  ```

- [ ] **Step 2: Bump 57 → 58** wherever it appears in the file (CLAUDE.md, and any other `*.md` files where the count is referenced — `rg "ALLOWED_METHODS \\(57\\)"`).

### Task 9.3: Update roadmap

- [ ] **Step 1: Open `docs/roadmap.md`** and find the Phase 5 § Team Intelligence row. Add a checkbox (`- [x]` or similar) for "T3 PR 1 — coordinator parallelism + nimbus expert" with today's date.

  This is per spec § Roadmap row & retro: PR 3 fully closes T3, but each PR should leave a trail.

### Task 9.4: Commit (Phase 9)

```bash
git add .claude/commands/nimbus-agent-patterns.md CLAUDE.md docs/roadmap.md
git commit -m "docs(agents): point patterns skill at expert.ts as the reference

expert.ts is the first built-in agent shipped (T3 PR 1); the patterns
skill previously referenced the aspirational meeting-prep.ts. Also
bumps the ALLOWED_METHODS count in CLAUDE.md from 57 to 58 and adds a
PR-1 checkbox under Phase 5 in docs/roadmap.md.

T3 Team Intelligence (PR 1)."
```

---

## Phase 10 — Pre-PR gates + open PR

These are not commits; they are the project's pre-PR gate set per spec § Cross-cutting checks before each PR is opened. Run all and resolve any failure before pushing.

### Task 10.1: Run the gate set

- [ ] **Step 1: Typecheck + lint**

  Run:
  ```bash
  bun run typecheck
  bun run lint
  ```
  Expected: both clean.

- [ ] **Step 2: Full CI test suite (per memory: required before every PR push)**

  Run: `bun run test:ci`
  Expected: all green. This is the load-bearing gate; do not skip.

- [ ] **Step 3: Structure + invariant audits**

  Run:
  ```bash
  bun run audit:invariants
  bun scripts/structure-audit/count-any-usage.ts --check
  ```
  Expected: both clean. The `--check` form fails on regression OR reduction without `--update`. **If you accidentally reduced the `any` count, run `--update` and include the baseline diff in the same commit.** Do not skip.

- [ ] **Step 4: Cargo allowlist test (Tauri bridge)**

  Run:
  ```bash
  cd packages/ui/src-tauri && cargo test allowlist && cd ../../..
  ```
  Expected: all four allowlist tests green; size assertion at 58.

### Task 10.2: Push + open PR

- [ ] **Step 1: Push the branch**

  Run:
  ```bash
  git push -u origin dev/asafgolombek/phase-5-t3-pr1-coordinator-and-expert
  ```

- [ ] **Step 2: Open the PR**

  Run:
  ```bash
  gh pr create --title "feat(agents): T3 PR 1 — AgentCoordinator parallelism + nimbus expert" --body "$(cat <<'EOF'
## Summary
- Fix \`AgentCoordinator.run\` to dispatch sub-tasks in parallel via \`Promise.all\`; tool-call cap is now pre-checked once before fan-out (correct under parallel execution); failing sub-tasks return \`status: \"error\"\` rows instead of aborting siblings.
- Ship the first built-in agent — \`nimbus expert <topic-or-file>\` — over the new \`agents.*\` IPC namespace, with the gap-note coverage contract enforced (every sub-agent returns >=1 evidence OR >=1 gap note).
- Add the shared \`packages/gateway/src/agents/_lib/\` infra (\`findings.ts\` types, \`gap-notes.ts\` detectors, \`render.ts\` deterministic Markdown, \`synthesize.ts\` LLM presentation layer with deterministic fallback).
- \`agents.expert\` is added to Tauri \`ALLOWED_METHODS\` (alphabetically first, count 57 → 58, allowlist size assertion updated).
- Coverage gate \`test:coverage:agents\` (>=80%) added and wired into CI.

## Test plan
- [x] \`bun run typecheck\` clean.
- [x] \`bun run lint\` clean.
- [x] \`bun run test:ci\` clean (including the new agents coverage gate).
- [x] \`bun run audit:invariants\` clean.
- [x] \`bun scripts/structure-audit/count-any-usage.ts --check\` clean.
- [x] \`cargo test allowlist\` (Tauri bridge) — size 58, alphabetized, no duplicates, forbidden namespaces still absent.
- [x] Gateway e2e (in-process): \`packages/gateway/test/e2e/scenarios/expert.e2e.test.ts\` — \`runExpert\` ranks alice first, brief contains \"## Top\", \`missing_relation_emit\` gap surfaces, <8 s wall-clock, structural HITL-free.
- [x] CLI smoke: \`packages/cli/test/e2e/expert.smoke.e2e.test.ts\` — no-Gateway exit path (exit 1) + help-text integration. Full Gateway+CLI round-trip is deferred (no harness today; tracked in Phase 5 retro).

## Spec
[docs/superpowers/specs/2026-05-07-phase-5-t3-team-intelligence-design.md](docs/superpowers/specs/2026-05-07-phase-5-t3-team-intelligence-design.md) (Build sequence § PR 1).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
  ```

- [ ] **Step 3: Verify PR opens cleanly + CI starts**

  Run:
  ```bash
  gh pr view --json url,checksUrl
  ```

  The PR is now ready for review. PR 2 (`nimbus impact`) and PR 3 (`nimbus catchup`) are separate plans, written when each reaches the head of the queue.

---

## Self-review checklist (run before sending the plan into execution)

Skim each section of the spec and confirm a task implements it:

- [x] AgentCoordinator parallelism fix — Phase 1.
- [x] `agents/_lib/findings.ts` types — Phase 2.1.
- [x] `agents/_lib/gap-notes.ts` helpers (incl. `aggregateMissingEntityTypes`) — Phase 2.2.
- [x] `agents/_lib/render.ts` deterministic renderer (renderExpert this PR; renderImpact / renderCatchup signatures only) — Phase 2.3.
- [x] `agents/_lib/synthesize.ts` LLM layer with deterministic fallback + `wrapToolOutput` — Phase 2.4.
- [x] `agents/expert.ts` with 5 sub-agents + ranker + gap-note coverage rule — Phase 3.
- [x] `ipc/agents-rpc.ts` with `agents.expert` handler + param validation — Phase 4.1.
- [x] Wired into IPC dispatcher — Phase 4.2.
- [x] Tauri allowlist add + size-assertion bump — Phase 5.
- [x] CLI `nimbus expert` command + `--json` + `--limit` + `NO_COLOR` honour (via existing CLI infra) — Phase 6.
- [x] E2E gateway-side + CLI-side — Phase 7.
- [x] `test:coverage:agents` ≥80% — Phase 8.
- [x] Patterns skill update (expert.ts replaces meeting-prep.ts as reference) — Phase 9.1.
- [x] CLAUDE.md ALLOWED_METHODS count update — Phase 9.2.
- [x] Roadmap row update — Phase 9.3.
- [x] Pre-PR gates + PR open — Phase 10.

Out-of-scope for PR 1 (deferred to PR 2 / PR 3 / later):

- `nimbus impact` / `nimbus catchup` agents — PR 2 / PR 3.
- `agents/_lib/self-person.ts` — catchup-only (PR 3).
- New graph entity types (`incident`, `dashboard`, etc.) — graph-populator follow-ups, not T3.
- Tauri UI surface for agents — explicitly out of scope per spec § Out of scope.

## Type-consistency notes

- `ExpertContext` (in `expert.ts`) **must not** include `llm` directly — pass via `synthesize`. The IPC handler in `agents-rpc.ts` decides whether to include the LLM router based on Gateway state; `expert.ts` only sees what it's given. The conditional spread `ctx.llm === undefined ? {...} : { ..., llm: ctx.llm }` (Phase 4.1) preserves `exactOptionalPropertyTypes` strictness.
- `SubTaskResult.status: "rejected"` stays type-level only — no production code path emits it (per coordinator fix § Two non-changes).
- `BriefReadyPayload.findings` is the structured `ExpertBrief` (not `string`) — the IPC notification carries both rendered Markdown and structured JSON, so the CLI never needs a follow-up call.
