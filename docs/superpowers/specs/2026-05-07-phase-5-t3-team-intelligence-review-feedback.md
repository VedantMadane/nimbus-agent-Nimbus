# Review Feedback — Phase 5 T3 Team Intelligence Design

**Date:** 2026-05-07  
**Reviewer:** Gemini CLI  
**Subject Document:** `docs/superpowers/specs/2026-05-07-phase-5-t3-team-intelligence-design.md`

## Summary of Review
The T3 Team Intelligence design is a high-signal follow-up to Phase 4. It leverages existing infrastructure (relationship graph, multi-agent coordinator) to provide immediate user value without the overhead of new connectors. The "gap surfacing" mechanism is a clever way to prioritize future development. The architectural choice to keep findings deterministic while using the LLM as a presentation layer ensures reliability.

---

## Open Questions & Clarifications

### 1. Graph Populator Discrepancy (`incident` and `alert`)
*   **Question:** The design states that `graph-populator.ts` already emits `incident` and `alert` types. Is this correct?
*   **Observation:** A review of `packages/gateway/src/graph/graph-populator.ts` shows that while these types are defined in the `ITEM_LINKED_ENTITY_TYPES` constant, there is currently no logic in the `syncGraphFromIndexedItem` dispatcher to handle them.
*   **Impact:** If T3 expects these to be present, they will initially show up as `missing_entity_type` gaps.
*   **Suggestion:** Clarify if T3 PR 1 should include adding the sync logic for `incident` (from PagerDuty) and `alert`, or if they should remain gaps as part of the "surface gaps" goal.

### 2. `AgentCoordinator` Parallelism — Tool Call Cap Race
*   **Question:** In the parallel `Promise.all` fix, the tool call cap is checked once for the entire batch. What happens if a sub-agent *itself* spawns more sub-agents (recursion)?
*   **Observation:** The current fix increments `toolCallCount.value` by `tasks.length` at the start. This is correct for the immediate fan-out. However, if depth > 0, the recursive calls will each check the cap individually.
*   **Clarification:** Ensure that the "batch increment" doesn't accidentally over-consume the cap if some sub-tasks fail early or are rejected before their own internal tool calls happen.

### 3. `nimbus impact` BFS Depth for Dashboards
*   **Question:** Is a default BFS depth of 2 sufficient for `s_dashboards`?
*   **Context:** BI lineage can sometimes be deep (e.g., `code_symbol` → `data_model` → `intermediate_model` → `dashboard`). 
*   **Suggestion:** Consider allowing the sub-agent to use a slightly higher depth (e.g., 3 or 4) for specific relation types like `upstream_refs` to ensure reachability across BI layers.

### 4. Self-person Resolution Fallback
*   **Question:** For `nimbus catchup`, if OAuth emails and the `me_person_id` override both fail, is there a local fallback?
*   **Suggestion:** Consider a fallback that attempts to match the current OS username or the `git config user.email` if available. While OAuth is the primary source of truth, a "best effort" local identity resolution might reduce `missing_user_identity` gaps for new users.

---

## Suggestions for Improvement

### 1. LLM Synthesis of Gap Notes
*   **Improvement:** In Stage 3 (Synthesize), ensure the LLM prompt explicitly instructs the agent to explain the **remediation** part of a `GapNote` if present.
*   **Reason:** This turns a technical error/gap into a roadmap-aware explanation for the user (e.g., "I couldn't find any dashboards because the Metabase connector is planned for Wave D").

### 2. Coordinator Fix — `status: "rejected"`
*   **Improvement:** The `SubTaskResult` type includes `status: "rejected"`. The new parallel loop handles `done` and `error`.
*   **Suggestion:** Explicitly handle or assert how `rejected` (from the HITL path) fits into the parallel batch, even though T3 agents are currently read-only. This future-proofs the coordinator for write-capable agents.

### 3. CLI Output: `--json` with Latency
*   **Improvement:** Ensure that when `--json` is used, the `latencyMs` field in `AgentBriefBase` is populated accurately by the Gateway.
*   **Reason:** This allows developers and power users to monitor agent performance without parsing logs.

### 4. Deterministic Render Snapshots
*   **Improvement:** Add a "Golden Path" test suite that verifies the deterministic Markdown output for each agent against a known "Full Coverage" fixture (where no gaps exist).
*   **Reason:** This ensures the presentation layer stays clean as the graph population grows.

---

## Technical Invariants Check
*   **I11 (Tool Output Wrapping):** The design explicitly mentions wrapping the structured brief via `wrapToolOutput`. This is a critical security win.
*   **I7 (Tauri Allowlist):** The method count update (57 → 60) and alphabetization check are correctly identified as required steps.

## Closing Note
The PR sequencing (PR 1 infra, then individual agents) is excellent for maintainability. The focus on fixing the `AgentCoordinator` first is a high-leverage move that pays off for the entire engine.
