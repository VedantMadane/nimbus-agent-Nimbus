# Phase 5 — T3 Team Intelligence Design

> **Status:** Draft for review
> **Author:** asafgolombek
> **Date:** 2026-05-07
> **Type:** Implementation spec — produces three CLI commands (`nimbus expert`, `nimbus impact`, `nimbus catchup`), one bridge fix (`AgentCoordinator` parallelism), and one new agent base under `packages/gateway/src/agents/`.
> **Parent:** Phase 5 sequencing spec — [`2026-05-06-phase-5-sequencing-design.md`](./2026-05-06-phase-5-sequencing-design.md). T3 is sub-project #2 in Phase 5 Core, after T1 (the sequencing spec itself).

## Purpose

T3 is the first of two sub-projects that ship without any new connector. It rides on the Phase 3 relationship graph and the Phase 4 multi-agent infrastructure to deliver three high-value CLI commands:

- `nimbus expert <topic-or-file>` — ranked list of team members with the most context on the input, with evidence drawn from the local index.
- `nimbus impact <file-or-PR-url>` — reverse-dependency blast radius across services, pipelines, dashboards, and oncall rotations.
- `nimbus catchup --since <duration>` — personalised retrospective digest weighted by the user's historical involvement.

T3's secondary purpose, made explicit by the sequencing spec, is to **surface gaps in the relationship graph and connector coverage** that downstream Phase 5 waves are then prioritised to fill. The gap-surfacing mechanism is structural — every sub-agent is required to return either evidence or a gap note.

## Locked decisions (from brainstorming)

The five architectural choices that frame the rest of this spec, all settled before writing began:

| # | Decision | Reading |
|---|---|---|
| 1 | **Hybrid output.** Deterministic findings always available via `--json`; LLM synthesis is a presentation layer for Markdown briefs that degrades gracefully to deterministic rendering when no LLM is available. | C |
| 2 | **Strict pattern compliance with coordinator fix.** Use `AgentCoordinator` for parallel sub-task dispatch; T3's scope includes fixing `AgentCoordinator.run` to actually run sub-tasks in parallel (today it's a sequential `for` loop). The fix lives in the engine, benefits every later built-in agent. | A |
| 3 | **Inline gap surfacing.** Each command's brief contains a per-query `## Gaps` section. No separate aggregate `nimbus diag agent-gaps` command in this scope. | A |
| 4 | **Three sequenced PRs.** PR 1: shared infra + coordinator fix + `expert`. PR 2: `impact`. PR 3: `catchup`. Each independently reviewable and mergeable. | A |
| 5 | **Hybrid self-person resolution (catchup-only).** Auto-resolve "the user" from OAuth-grant emails through the existing people linker; allow an explicit `[user] me_person_id` config override for multi-identity profiles. | C |

## Architecture overview

```
[CLI] nimbus expert <topic-or-file>
        │ JSON-RPC: agents.expert { topicOrFile, json? }
        ▼
[Gateway IPC] packages/gateway/src/ipc/agents-rpc.ts
        │
        ▼
[Agent] packages/gateway/src/agents/expert.ts
        │
        ├── Stage 1 (deterministic, parallel via fixed AgentCoordinator):
        │     SQL/graph queries → produces structured Findings
        │
        ├── Stage 2 (deterministic): rank & dedupe findings
        │
        ├── Stage 3 (optional, gated): LLM synthesis → Markdown brief
        │     (falls back to template render if LLM unavailable)
        │
        └── Emits IPC notification:
              expert.briefReady { sessionId, brief: string, findings: ExpertBrief }
```

Key shape decisions:

- **Three separate agent files** (`expert.ts`, `impact.ts`, `catchup.ts`) per the patterns-skill convention. They share a `_lib/` subfolder for the findings types, the gap-surfacing helper, the deterministic Markdown renderer, the LLM synthesis wrapper, and the self-person resolver.
- **One IPC namespace** — `agents.*` — with three methods. Rust `ALLOWED_METHODS` gets three new entries (the bridge change + count assertion). All three are read-only, so safe for the renderer.
- **Hybrid output everywhere.** The IPC notification carries *both* `brief` (Markdown) and `findings` (structured). CLI uses `brief` by default, `findings` when `--json`. UI gets both for free.
- **Coordinator parallelism fix lives in the engine, not in `agents/`.** It's a bridge change that benefits every later built-in agent. Ships in PR 1.
- **No new graph entity types or migrations.** T3 works with what `graph-populator.ts`'s `syncGraphFromIndexedItem` dispatcher actually emits today: `pr`, `issue`, `git_commit`, `dependency`, `code_symbol`, `message` (plus their secondary entities: `repo`, `person`, `commit`, `channel`). It surfaces everything else as gap notes — including `incident`, `alert`, `ci_run`, `deployment`, `error_issue`, which are in `ITEM_LINKED_ENTITY_TYPES` but never reach a sync handler today, and `data_model` / `pipeline_run` / `dashboard` / `upstream_refs`, which aren't even in the type list. Each missing type is a populator follow-up that downstream waves (Wave D for warehouse types) or a graph-populator pass (for the silently-dropped types) will fill.
- **No new connectors.** Pure read-only over the existing index — matches the sequencing-spec rationale ("zero new connectors; rides on the Phase 3 relationship graph").

## Sub-agent decomposition

Each agent decomposes its Stage-1 work into independent, scope-restricted sub-agents that run via the (parallelism-fixed) `AgentCoordinator`. Tool scopes are listed exactly — no broad scopes "for flexibility".

### `nimbus expert <topic-or-file>`

| Sub-agent | Tool scope | Produces |
|---|---|---|
| `s_blame` | `searchLocalIndex`, `traverseGraph` | Authors of `git_commit` items touching the file (via `defined_in` → `commit` → `authored` chain). Falls back to FTS over commit messages when no `code_symbol` row matches. |
| `s_pr_authored` | `traverseGraph` | People with `authored` edges into `pr` items linked to the file's repo. Last-90-day window. |
| `s_pr_reviewed` | `traverseGraph` | People with `reviewed` edges into the same PR set. (Note: `reviewed` is in the relation-type table but not yet emitted by `graph-populator.ts` — this surfaces as a gap.) |
| `s_incident_resolved` | `traverseGraph` | People with `resolves` edges into `incident` items mentioning the topic/file. **Today this always returns zero** — `incident` is in `ITEM_LINKED_ENTITY_TYPES` but never dispatched in `syncGraphFromIndexedItem`. Sub-agent runs and emits a `missing_entity_type` gap note. The wiring is structural so the day a populator follow-up fills `incident`, the sub-agent starts producing real evidence with no T3 code change. |
| `s_chat_mentions` | `searchLocalIndex` (`itemType: "message"`), `traverseGraph` | People with `posted` edges into `message` items containing the topic string. |

Stage 2 (deterministic ranking) merges the five evidence streams per `person.id`, scores by recency × edge-type weight × cross-stream redundancy, and emits the top-N (default 5).

### `nimbus impact <file-or-PR-url>`

| Sub-agent | Tool scope | Produces |
|---|---|---|
| `s_resolve` | `searchLocalIndex`, `traverseGraph` | Resolves the input to a graph entity. PR URL → `pr` entity by `external_id`; file path → `code_symbol` entities defined in that file; topic → top FTS hit. |
| `s_downstream_code` | `traverseGraph` (`relationTypes: ["depends_on"]`) | Reverse `depends_on` traversal from the resolved code_symbol(s) — produces the set of code symbols that import / call the changed code. |
| `s_pipelines` | `traverseGraph` (`relationTypes: ["triggers", "in_repo"]`) | From the resolved repo, walk `triggers` to `ci_run` / `pipeline_run` items. (`pipeline_run` not yet emitted → gap.) |
| `s_oncall` | `traverseGraph` (`relationTypes: ["belongs_to"]`), `searchLocalIndex` (`service: "pagerduty"`) | Owning oncall rotation via PagerDuty schedule items linked to the affected services. |
| `s_dashboards` | `traverseGraph` (`relationTypes: ["upstream_refs"]`) | Dashboards reading from affected data models. (`data_model`, `dashboard`, `upstream_refs` not yet emitted → gap; the sub-agent runs but always reports zero today, with a single combined gap note.) |

Stage 2 buckets findings by category (`service`, `pipeline`, `dashboard`, `oncall_rotation`, `downstream_repo`) and renders blast radius per bucket. The gap notes from the missing entity types are aggregated so the user sees one note ("3 categories blocked: `data_model` / `dashboard` / `pipeline_run` — `data_model` and `dashboard` will be populated by Phase 5 Wave D's read-only data-warehouse connectors; `pipeline_run` is a graph-populator follow-up on the existing CI/CD connectors") rather than three near-duplicates.

### `nimbus catchup --since <duration>`

| Sub-agent | Tool scope | Produces |
|---|---|---|
| `s_self` | `resolvePerson`, `meta_store` read | Resolves "the user" → `person.id`. Reads `[user] me_person_id` first; falls back to OAuth-derived emails through `people/linker.ts`. Caches in `meta_store` keyed by config-hash. |
| `s_owned_services` | `traverseGraph` | Services where self has the highest authorship density in the last 90 days. |
| `s_active_repos` | `traverseGraph` | Repos where self has ≥1 `authored` PR in the last 90 days. |
| `s_responded_incidents` | `traverseGraph` | Services where self has ≥1 `resolves` edge into an incident in the last 90 days. |
| `s_collaborators` | `traverseGraph` | Other `person.id`s that self has ≥3 review-interactions or shared-thread interactions with in the last 90 days. |
| `s_window_items` | `searchLocalIndex` (no service filter, `since`-bound) | Every item with `modified_at >= now - sinceMs`, all services, capped at a per-service quota to keep latency bounded. |

Stage 2 scores each window item against the involvement signals (owned-service match: high; active-repo match: high; collaborator-author match: medium; nothing: low), groups by service, and orders by score within each section.

### Two structural notes

1. Every sub-agent is **read-only** (search + traverse + meta_store-read; no write tools, no consent channel touched). The coordinator's HITL skip path is therefore never exercised — but its presence is asserted by an e2e test that seeds a write-tool stub and verifies it's filtered out before sub-agent dispatch.
2. **Per-sub-agent latency budget** is roughly `total_command_budget / sub_agent_count` — for `expert` (5 sub-agents, 8 s budget) that's ≈1.6 s per sub-agent, well within parallel SQL/graph reach. The budgets are checked in the e2e tests, not just the totals.

## Data shapes & gap-note model

All three agents share a small typed surface in `packages/gateway/src/agents/_lib/findings.ts`. The shapes are versioned (`agentVersion: 1`) so any future breaking change to the `--json` contract requires a deliberate bump, not silent drift.

```typescript
// findings.ts

export type Evidence = {
  itemId: string;          // "github:org/repo#42" or "graph:<entity_id>"
  type:
    | "pr_authored" | "pr_reviewed"
    | "issue_opened" | "issue_resolved"
    | "incident_resolved"
    | "commit_authored"
    | "chat_mention" | "chat_post";
  serviceId: string;       // "github" | "linear" | "slack" | ...
  title: string;           // ≤512 chars; matches item.title
  modifiedAt: number;      // unix ms
  weight: number;          // ≥ 0 — contribution to ranking score
};

export type GapCategory =
  | "missing_entity_type"      // graph type referenced in design but not emitted by populator
  | "missing_relation_emit"    // relation type defined in migration but not populated
  | "missing_connector"        // no sync_state row for required service
  | "missing_user_identity"    // catchup-only — couldn't resolve self.person_id
  | "empty_index";             // no items at all

export type GapNote = {
  category: GapCategory;
  detail: string;              // e.g. "no `dashboard` graph entities — 0 dashboards considered"
  remediation?: string;        // e.g. "Phase 5 Wave D will populate `dashboard` via Metabase/Superset connectors"
};

export type AgentBriefBase = {
  agentVersion: 1;
  generatedAt: number;         // unix ms — set just before the agent emits the notification
  latencyMs: number;            // measured by the agent at start/end; always populated regardless of `--json` mode
  gaps: GapNote[];
};

export type ExpertFinding = {
  personId: string;            // person.id — empty string for unresolved authors
  displayName: string;         // best-known label
  evidence: Evidence[];
  score: number;               // 0..1
  confidence: "high" | "medium" | "low";   // bucketed from score + evidence count
};

export type ExpertBrief = AgentBriefBase & {
  kind: "expert";
  query: { topicOrFile: string };
  ranked: ExpertFinding[];     // already ordered, length ≤ 10
};

export type ImpactCategory =
  | "service" | "pipeline" | "dashboard" | "oncall_rotation" | "downstream_repo";

export type ImpactFinding = {
  category: ImpactCategory;
  affectedItemId: string;
  affectedTitle: string;
  serviceId: string;
  hops: number;                // BFS depth from start node
  pathSummary: string;         // "code_symbol → defined_in → repo → triggers → ci_run"
};

export type ImpactBrief = AgentBriefBase & {
  kind: "impact";
  query: { fileOrPrUrl: string };
  startEntityId: string | null;     // null when resolution failed
  affected: ImpactFinding[];
};

export type CatchupItem = {
  itemId: string;
  title: string;
  modifiedAt: number;
  relevanceScore: number;          // 0..1
  relevanceReasons: string[];      // e.g. ["owned_service:billing", "collaborator:alice"]
};

export type CatchupSection = {
  serviceId: string;
  totalItemsInWindow: number;      // before per-service quota
  items: CatchupItem[];
};

export type CatchupBrief = AgentBriefBase & {
  kind: "catchup";
  query: { sinceMs: number };
  selfPersonId: string | null;     // null when auto-resolution + override both failed
  involvement: {
    ownedServices: string[];
    activeRepos: string[];
    incidentServices: string[];
    collaboratorPersonIds: string[];
  };
  sections: CatchupSection[];      // ordered by aggregate section relevance
};

export type AgentBrief = ExpertBrief | ImpactBrief | CatchupBrief;
```

### IPC notification shape

The `briefReady` notification carries both the rendered Markdown and the structured findings, so the CLI never needs a follow-up call:

```typescript
type BriefReadyPayload<B extends AgentBrief> = {
  sessionId: string;
  brief: string;                  // Markdown — rendered by Stage 3
  findings: B;                    // structured — produced by Stage 2
};
```

Notification names are exactly `expert.briefReady`, `impact.briefReady`, `catchup.briefReady` — matching the patterns-skill convention.

### Gap-note coverage rule

Every sub-agent that runs must, on its way out, return either ≥1 evidence row OR ≥1 gap note. "Empty silent" is forbidden; a unit test asserts this at the agent-base level. This is the mechanism that makes "T3 surfaces gaps" a real behavioural property and not just a docstring.

### Renderer & synthesizer (Stage 3)

- `_lib/render.ts` exports `renderExpert(b: ExpertBrief): string`, `renderImpact(b: ImpactBrief): string`, `renderCatchup(b: CatchupBrief): string`. Pure functions — no LLM, no IO. These are the **fallback** when the LLM is unavailable, and the **golden** for snapshot testing.
- `_lib/synthesize.ts` exports `synthesize(brief: AgentBrief, opts: { llm?: LlmRouter }): Promise<string>`. When `opts.llm === undefined` or routing returns no provider, it tail-calls the corresponding `render*` function unchanged. When an LLM is available, it passes the structured `brief` (already wrapped via `wrapToolOutput` per invariant `I11`) and asks for a Markdown rewrite, with the deterministic render included as a fallback in the prompt. **The synthesis prompt explicitly instructs the LLM to surface the `remediation` field of every `GapNote` it renders** — so a user reading the brief sees "I couldn't find any dashboards because the Metabase connector lands in Phase 5 Wave D" instead of an opaque "no data".

This means: **the Markdown produced by an offline run is byte-identical to a snapshot test**, while the Markdown produced with an LLM is a valid prose rewrite of the same evidence — never a hallucination, because the LLM only sees the structured findings, never raw connector output.

## Coordinator parallelism fix + IPC contract

This is the bridge work that lives outside `agents/`. It ships in PR 1 alongside `expert`.

### Coordinator fix

Today `AgentCoordinator.run` iterates sub-tasks in a `for` loop with `await` per task — so three 1.5-second SQL sub-agents take ~4.5 s instead of ~1.5 s. The fix substitutes `Promise.all`, preserves the depth/tool-call guards, and keeps the per-task `try/catch` so one sub-task's failure still produces a `status: "error"` row in the result array.

```typescript
async run(tasks: SubTask[]): Promise<SubTaskResult[]> {
  if (this.#ctx.depth > Config.maxAgentDepth) {
    throw new Error(`Agent depth limit reached: depth ${this.#ctx.depth} ...`);
  }

  // Pre-check the cap once — opening N tasks in parallel after passing the check
  // is correct because tool-call accounting still increments per task before execute().
  if (this.#ctx.toolCallCount.value + tasks.length > Config.maxToolCallsPerSession) {
    throw new Error(
      `Tool call limit reached: ${tasks.length} new tasks would exceed cap ${Config.maxToolCallsPerSession}`,
    );
  }
  this.#ctx.toolCallCount.value += tasks.length;

  return Promise.all(tasks.map(async (task, i): Promise<SubTaskResult> => {
    try {
      const outcome = await task.execute();
      return {
        taskIndex: i, taskType: task.taskType, status: "done",
        text: outcome.text, tokensIn: outcome.tokensIn, tokensOut: outcome.tokensOut,
        ...(outcome.modelUsed === undefined ? {} : { modelUsed: outcome.modelUsed }),
      };
    } catch (err) {
      return {
        taskIndex: i, taskType: task.taskType, status: "error",
        errorText: err instanceof Error ? err.message : String(err),
      };
    }
  }));
}
```

**Two behavioural deltas, both deliberate:**

1. The tool-call cap is now checked **before** the parallel fan-out (and incremented atomically), instead of being re-checked inside the loop on every iteration. This is correct: with parallel execution, all tasks have already "started" before any can complete, so re-checking inside the loop would race. The cap stays load-bearing — we just check it once for the whole batch.
2. A single failing sub-task no longer aborts the rest. Today's sequential loop returns whatever rows it had collected before throwing; the parallel version always returns `tasks.length` rows, with failures encoded as `status: "error"`. T3 agents *rely* on this — a missing `dashboard` entity type should yield a gap note, not abort the whole `impact` run.

**Two non-changes, both deliberate:**

- **Failed sub-tasks still count against the cap.** This matches the sequential version, which also pre-incremented `toolCallCount` *before* `await task.execute()` and so charged failures the same as successes. Preserving that parity keeps loop-protection semantics stable.
- **`SubTaskResult.status: "rejected"` remains type-level only.** The original sequential coordinator never emits "rejected", and the parallel rewrite preserves that. The status is reserved for a future HITL-aware coordinator; built-in agents are HITL-free per the patterns skill, so designing for it now is YAGNI. When a write-capable agent ships, the rejected path lands alongside the actual consent plumbing.

### Tests added to `coordinator.test.ts`

- New: three sub-tasks each `await new Promise(r => setTimeout(r, 100))` resolve in <200 ms (asserts wall-clock parallelism).
- New: cap exceeded by `tasks.length` rejects before any `execute()` is called.
- Extended: one throwing sub-task does not prevent siblings from returning `status: "done"`.

### IPC contract

Three new IPC methods under the `agents.*` namespace, all read-only, all renderer-safe.

| Method | Params | Return | Notification on completion |
|---|---|---|---|
| `agents.expert` | `{ topicOrFile: string, json?: boolean }` | `{ sessionId: string }` | `expert.briefReady` |
| `agents.impact` | `{ fileOrPrUrl: string, json?: boolean }` | `{ sessionId: string }` | `impact.briefReady` |
| `agents.catchup` | `{ sinceMs: number, json?: boolean }` | `{ sessionId: string }` | `catchup.briefReady` |

The method returns `{ sessionId }` synchronously; the agent runs in the background and emits `*.briefReady` when done. This matches `engine.askStream`'s pattern, so the existing CLI streaming infrastructure works without modification.

**Param validation** (in `params.ts` style):

- `topicOrFile`: 1..1024 chars; trimmed; non-empty after trim.
- `fileOrPrUrl`: 1..2048 chars; if it parses as a URL, it must match a small allow-list of host patterns (`github.com`, `gitlab.com`, `*.atlassian.net`, etc.) — otherwise it's treated as a file path.
- `sinceMs`: integer ≥ 0, ≤ 90 days. Defaults to 3 days (`259_200_000`) when missing.
- `json`: optional boolean; default `false`. Affects only the *rendering* path — the structured `findings` is always produced.

Errors use the existing JSON-RPC error code conventions (`-32602` for validation, `-32603` for internal). No new codes.

### `ALLOWED_METHODS` in the Tauri bridge

Three new entries added alphabetically to `packages/ui/src-tauri/src/gateway_bridge.rs`. Current count (verified at `gateway_bridge.rs:444`) is **57**; new count is **60**. The `cargo test allowlist_exact_size` assertion is updated in the same commit. Per security invariant **I7**, none of `agents.expert` / `agents.impact` / `agents.catchup` is RCE-class — they're pure read-only methods. Adding them is safe under the Tauri capability model.

### `NO_TIMEOUT_METHODS`

`agents.catchup` may legitimately take ~15 s on a large index. The current `NO_TIMEOUT_METHODS` set has 4 entries (long-running ops). The three new methods are **not** added to it — the 30 s default Tauri timeout is sufficient and we want a real timeout path if a sub-agent hangs. If the e2e tests show flakes >15 s, we revisit per-method timeouts in T3 PR 3 rather than here.

## CLI surface, error handling, output

Three new CLI commands under `packages/cli/src/commands/`. All three follow the existing `nimbus ask` pattern: read gateway state → connect IPC → register the brief notification handler → call the IPC method → wait for the notification → render → exit.

### Command surfaces

```
nimbus expert <topic-or-file> [--json] [--limit <N>]
nimbus impact <file-or-PR-url> [--json] [--depth <N>] [--service <id>]
nimbus catchup [--since <duration>] [--json] [--service <id>]
```

| Flag | Default | Notes |
|---|---|---|
| `--json` | off | Print `findings` JSON instead of Markdown. Suppresses the LLM synthesis path entirely. |
| `--limit` (expert) | 5 | Top-N people in the ranked list, max 25. |
| `--depth` (impact) | 2 | BFS hops in the graph traversal, max 5. |
| `--service` | none | Restrict to one service id; only filters `findings.sections` (catchup) or `findings.affected[].serviceId` (impact). Not exposed for `expert` because the cross-service ranking is the point. |
| `--since` (catchup) | `3d` | Accepts `s`/`m`/`h`/`d`/`w` suffixes (e.g. `36h`, `2w`). Same parser as `nimbus diag slow-queries`. |

`NO_COLOR` is honoured for the Markdown path; `--json` always emits raw JSON regardless of `NO_COLOR`. Per the patterns-skill checklist.

### Output

**Default (Markdown to stdout):**

```markdown
# Expert: src/billing/retry.ts

## Top 5

1. **Alice Chen** (high — 12 evidence rows)
   - authored 4 of the last 6 PRs touching this file
   - resolved 2 incidents tagged `payment-retry`
   - …
2. **Bob Wong** (medium — 5 evidence rows)
   - …

## Gaps

- `reviewed` edges are defined in the schema but not yet emitted by the graph populator — review evidence is missing from this ranking. (Tracked as a graph-populator follow-up; not gated on a specific Phase 5 wave.)

_generated in 1.4 s_
```

**`--json` to stdout:** the literal `ExpertBrief` from the IPC notification, pretty-printed (2-space indent), trailing newline. No CLI-specific shaping.

### Error handling

| Failure mode | CLI behaviour |
|---|---|
| Gateway not running | `"Gateway is not running. Start with: nimbus start"` to stderr; exit 1. (Same as `nimbus ask`.) |
| No connectors registered | Prints the same `nimbus connector auth …` hint that `nimbus ask` does; exit 1. |
| `--json` + agent reports `empty_index` gap | Prints the JSON brief (with the `empty_index` gap note); exit 0 — `--json` consumers want a machine-readable empty result, not a hard error. |
| Default mode + agent reports `empty_index` gap | Prints `"No data indexed yet — run \`nimbus connector sync <service>\` first."` to stderr; exit 1. |
| Agent times out (no notification within 30 s) | `"Agent timed out after 30 s"` to stderr; exit 2. |
| Validation error from gateway (`-32602`) | Prints the gateway's error message; exit 1. |
| Internal gateway error (`-32603`) | Prints `"Agent failed: <message>"`; exit 1. |
| `expert` / `impact` resolution finds zero matches | Prints a brief whose `ranked` / `affected` is empty plus a gap note (`"No graph entity matched <input>; tried code_symbol, pr, repo. Is the relevant connector synced?"`); exit 0 in `--json` mode, exit 1 otherwise. |

### CLI command-registry wiring

`packages/cli/src/index.ts` gains three new subcommand entries. Help text for each command lives in `packages/cli/src/commands/help.ts` and is exercised by the existing help snapshot test, so help-text drift is caught at PR review.

### `--json` snapshot tests

For each command, `packages/cli/test/e2e/<command>.e2e.test.ts` asserts the JSON output round-trips through the `AgentBrief` validator without throwing. This makes the `--json` contract enforceable at the CLI layer too — not just at the gateway boundary — and catches accidental drift between the gateway's `findings` payload shape and the `findings.ts` types.

### Latency budgets enforced at the CLI test boundary

- `expert`: e2e test asserts wall-clock under 8 s on the seeded fixture (deterministic, no LLM).
- `impact`: under 10 s.
- `catchup`: under 15 s (the largest budget, owing to the per-service window-scan fan-out).

These are deliberately tighter than the patterns-skill 15-second-for-all default. They enforce that the coordinator parallelism fix is paying its own cost.

## Testing, file layout, build sequence

### File layout

```
packages/gateway/src/
  agents/
    _lib/
      findings.ts                 # types from this spec
      findings.test.ts            # type-level + GapNote shape tests
      gap-notes.ts                # helper: detectMissingEntityType, detectMissingRelationEmit, …
      gap-notes.test.ts
      render.ts                   # renderExpert / renderImpact / renderCatchup (deterministic)
      render.test.ts              # snapshot tests against two fixture variants per agent:
                                  #   (a) full-coverage   — every evidence stream populated, zero gaps
                                  #   (b) sparse          — partial evidence + ≥1 gap note
                                  # together they pin renderer behaviour at both ends of the spectrum.
      synthesize.ts               # LLM synthesis with deterministic fallback
      synthesize.test.ts          # asserts fallback when LlmRouter returns no provider
      self-person.ts              # auto + override resolution for catchup
      self-person.test.ts
    expert.ts                     # PR 1
    expert.test.ts                # unit tests for the agent's stage-2 ranker
    impact.ts                     # PR 2
    impact.test.ts
    catchup.ts                    # PR 3
    catchup.test.ts
  engine/
    coordinator.ts                # PR 1 — Promise.all fix
    coordinator.test.ts           # PR 1 — parallelism wall-clock test added
  ipc/
    agents-rpc.ts                 # PR 1 — agents.expert handler; PR 2 adds impact; PR 3 adds catchup
    agents-rpc.test.ts            # one suite per PR
  test/
    e2e/scenarios/
      expert.e2e.test.ts          # PR 1
      impact.e2e.test.ts          # PR 2
      catchup.e2e.test.ts         # PR 3

packages/cli/src/commands/
  expert.ts                       # PR 1
  expert.test.ts
  impact.ts                       # PR 2
  impact.test.ts
  catchup.ts                      # PR 3
  catchup.test.ts

packages/cli/test/e2e/
  expert.e2e.test.ts              # PR 1 — JSON round-trip + latency budget
  impact.e2e.test.ts              # PR 2
  catchup.e2e.test.ts             # PR 3

packages/ui/src-tauri/src/
  gateway_bridge.rs               # PR 1 — adds 3 entries to ALLOWED_METHODS, count assertion 38 → 41
```

### Test coverage

- **`packages/gateway/src/agents/` ≥ 80%** — patterns-skill gate. New entry in `bun run test:coverage:agents` (added to `package.json` in PR 1) parallel to `test:coverage:engine` etc. Wired into `bun run test:ci` at the same time.
- **`packages/gateway/src/engine/` already ≥ 85%** — coordinator change must keep that gate green; the new parallelism test contributes.
- **CLI commands** — covered by the per-command e2e tests; no new package-level gate.

### E2E test pattern (per the patterns skill)

Each `<command>.e2e.test.ts` follows `incident-correlation-indexed.e2e.test.ts`'s shape:

1. Spin up a real Gateway subprocess (`bun:test` + `Bun.spawn`) with a fresh temp data dir.
2. Seed the local index with deterministic fixtures via direct SQLite writes (no real connectors). For `expert`, seed `git_commit` + `pr` + `incident` items + the corresponding `graph_entity` / `graph_relation` rows. For `impact`, seed `code_symbol` + `repo` + `ci_run` + a `depends_on` chain. For `catchup`, seed two services with different activity levels for the self-person.
3. Call the IPC method, register the `*.briefReady` handler, await the notification.
4. Assertions:
   - Brief contains the expected sections (e.g. `"## Top"` for `expert`, `"## Gaps"` always present, the right service in `## ` headers for `catchup`).
   - **Zero HITL actions fired** (consent channel mock asserts no calls).
   - Notification has non-empty `brief` and a structurally valid `findings`.
   - Latency budget assertion: `expert` <8 s, `impact` <10 s, `catchup` <15 s on the seeded fixture.
   - **For `catchup` specifically** — the acceptance-criteria test from the roadmap: seed two services A and B with different activity levels for the self person; assert the brief's first section is the higher-activity service.
   - **For `impact` specifically** — assert the missing-entity-type gap notes are emitted *and* aggregated to one note (not three).

### Coordinator parallelism guard

`coordinator.test.ts` gets a wall-clock test:

```typescript
test("AgentCoordinator runs sub-tasks in parallel", async () => {
  const tasks = Array.from({ length: 3 }, () => ({
    taskType: "agent_step" as const,
    prompt: "",
    execute: async () => {
      await new Promise(r => setTimeout(r, 100));
      return { text: "ok", tokensIn: 0, tokensOut: 0 };
    },
  }));
  const start = performance.now();
  await new AgentCoordinator(ctx).run(tasks);
  const elapsed = performance.now() - start;
  expect(elapsed).toBeLessThan(200);  // 3x serial would be 300ms
});
```

This is the test that makes the parallelism fix structural: a future regression to a `for` loop fails CI.

### Build sequence — three PRs

| PR | Adds | New tests | Coverage gates affected | Tauri bridge | Notes |
|---|---|---|---|---|---|
| **PR 1: shared infra + `expert`** | `agents/_lib/*`, `agents/expert.ts`, `ipc/agents-rpc.ts` (1 method), CLI `expert`, coordinator parallelism fix, `gateway_bridge.rs` (`agents.expert` row + count 57→58) | unit + e2e for `expert`; coordinator parallelism test | new `test:coverage:agents` ≥80%; engine ≥85% stays green | +1 row | Largest of the three PRs because it ships the shared infra. |
| **PR 2: `impact`** | `agents/impact.ts`, IPC handler, CLI `impact`, `gateway_bridge.rs` (`agents.impact` + count 58→59) | unit + e2e for `impact` | agents ≥80% stays green | +1 row | Adds zero new shared infra. |
| **PR 3: `catchup`** | `agents/catchup.ts`, IPC handler, CLI `catchup`, `agents/_lib/self-person.ts` and its tests, `gateway_bridge.rs` (`agents.catchup` + count 59→60) | unit + e2e for `catchup` | agents ≥80% stays green | +1 row | Self-person resolver is `catchup`-specific so it ships here, not in PR 1. |

Each PR is independently mergeable in this order. None of the three involves a DB migration, so the `_schema_migrations` ledger is untouched.

### Cross-cutting checks before each PR is opened

- `bun run typecheck` and `bun run lint` clean.
- `bun run test:ci` clean (project pre-PR gate).
- `bun run audit:invariants` clean (the binary D10/D11 gate).
- `bun run audit:any --check` clean (no new `any` introduced).
- `cargo test allowlist_exact_size` clean inside `packages/ui/src-tauri/`.

### Roadmap row & retro

When PR 3 lands, `docs/roadmap.md` Phase 5 row "Team Intelligence" gets all three checkboxes flipped to `[x]` and a one-line summary line ("T3 — Team Intelligence (`nimbus expert` / `impact` / `catchup`) shipped 2026-MM-DD") added to Phase 5's status mirror. T3 is then "done" per the sequencing-spec exit criteria.

## Inherited contracts (referenced, not re-specified)

Per the sequencing spec's cross-cutting requirements, every Phase 5 sub-project inherits the existing Nimbus authoring contracts. T3 specifically depends on:

- **Built-in agent shape** — `.claude/commands/nimbus-agent-patterns.md`. T3 is the first ship; it establishes the actual reference implementation for every later built-in agent (replacing the aspirational `meeting-prep.ts` reference in the skill).
- **IPC additions** — `.claude/commands/nimbus-ipc.md`. The `agents.*` namespace is new; the three method-naming and Tauri-bridge rules apply.
- **Test placement** — `.claude/commands/nimbus-testing.md`. E2E scenarios under `packages/gateway/test/e2e/scenarios/`.
- **Phase boundary check** — `.claude/commands/nimbus-phase-4.md`. Confirmed: the multi-agent infrastructure (Phase 4 WS5-A coordinator + sub-agent persistence) is complete, so T3 does not block on a Phase 4 follow-up.

## Out of scope for this document

- Implementation of any further built-in agents (`meeting-prep`, `oncall-brief`, `standup`) — those are separate sub-projects, not sequenced before Phase 6.
- New graph entity types (`data_model`, `pipeline_run`, `dashboard`, `upstream_refs`) and the populator changes that would emit them — `data_model` / `dashboard` land with Phase 5 Wave D (read-only data warehouses); `pipeline_run` is a graph-populator follow-up on the existing CI/CD connectors; `upstream_refs` lands alongside data warehouse coverage.
- The aggregate `nimbus diag agent-gaps` command — explicitly deferred (per locked decision #3 above: inline gap surfacing only).
- A Tauri Team-Intel sidebar UI — the IPC + ALLOWED_METHODS work in PR 1–3 makes this addable later, but no UI is in scope here.
- LLM provider/model selection or routing changes — `synthesize.ts` uses whatever `LlmRouter` provides today.
