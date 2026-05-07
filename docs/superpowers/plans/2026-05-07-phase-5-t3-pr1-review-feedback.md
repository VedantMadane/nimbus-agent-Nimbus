# Review Feedback — T3 PR 1 Implementation Plan

**Date:** 2026-05-07  
**Reviewer:** Gemini CLI  
**Subject Document:** `docs/superpowers/plans/2026-05-07-phase-5-t3-pr1-expert-and-coordinator-fix.md`

## Summary of Review
The implementation plan for T3 PR 1 is technically excellent. It provides a surgical approach to fixing the `AgentCoordinator` while simultaneously building the necessary infrastructure for the first built-in Phase 5 agent. The "Gap Note" aggregation and the versioned findings model show strong architectural foresight.

---

## Technical Observations & Confirmations

### 1. `AgentCoordinator` Parallelism (Task 1)
*   **Correctness:** The switch to `Promise.all` and the single-check-atomic-increment for `toolCallCount` is the correct way to handle parallelism while preserving the cap logic.
*   **Validation:** The inclusion of a wall-clock performance test (`< 200 ms`) is a high-signal way to ensure the fix is functional and stays that way.

### 2. Gap-Note Aggregation (Task 3)
*   **Correctness:** The `aggregateMissingEntityTypes` helper correctly solves the "noisy gaps" problem by collapsing multiple missing types into a single readable note.
*   **Enforcement:** `requireEvidenceOrGap` is a critical guard that ensures T3 actually fulfills its secondary purpose of mapping graph gaps.

### 3. IPC & Dispatcher Wiring (Task 8)
*   **Verification:** Task 8.6 correctly identifies that the renderer-safe notification path is required. 
*   **Minor Note:** In `server.ts`, the existing pattern often uses `clientId` to route notifications. Ensure `session.writeNotification` matches the latest `server.ts` refactors from Phase 4 (WS5-C).

### 4. Tauri Allowlist (Task 12)
*   **Correctness:** The plan correctly identifies `"agents.expert"` as the new first entry in `ALLOWED_METHODS` (alphabetically) and updates the size assertion to 58.

---

## Open Questions & Suggestions

### 1. `ExpertRunResult` Sync/Async (Task 8)
*   **Observation:** The plan mentions that built-in agents run "synchronously" (awaited) inside the RPC handler because they are fast (< 8s).
*   **Suggestion:** While fine for `expert`, keep an eye on `catchup` (Task 11 latency budget: < 15s). If `catchup` starts pushing the 30s Tauri timeout, we may need to switch the IPC handler to a fire-and-forget microtask sooner rather than later.

### 2. CLI E2E Boilerplate (Task 11)
*   **Suggestion:** When copying the gateway-spawn boilerplate from `incident-correlation-indexed.e2e.test.ts`, ensure that the `NIMBUS_DATA_DIR` and `NIMBUS_LAN_PORT` overrides are handled to prevent port collisions if other tests are running in parallel.

---

## Technical Invariants Check
*   **I11 (Tool Output Wrapping):** Synthesis correctly uses `wrapToolOutput` (via Stage 3 synthesis) as defined in the design spec.
*   **I7 (Tauri Allowlist):** Correctly maintained with size assertion updates.

## Closing Note
This plan is exceptionally thorough and ready for execution. The sequencing of tasks (Infra -> Agent -> IPC -> CLI) correctly handles dependencies and ensures that each layer is testable before the next is built.
