# Phase 5 T6 — B1 Hardening + Semantic Layer Prep — Review Feedback

> **Date:** 2026-05-14
> **Reviewer:** Gemini CLI
> **Status:** Review Complete

## 1. Overall Impression

The sequencing design for T6 is robust, well-reasoned, and aligns perfectly with the overarching Phase 5 sequencing strategy. The division into four discrete, logically ordered PRs is excellent for maintaining a manageable review burden and minimizing merge conflicts.

## 2. Suggestions & Observations

### 2.1 PR 2: `tool_call_log` Growth
- **Observation:** `tool_call_log` records every LLM-facing tool call result envelope.
- **Question:** Is there a risk of this table growing indefinitely in high-usage environments?
- **Suggestion:** Consider whether a retention policy (e.g., "keep last 90 days") or a cleanup mechanism should be part of the design, or if it's deferred to a future "System Maintenance" PR.

### 2.2 PR 3: Embedding Batch Error Handling
- **Observation:** `nimbus index reembed` will process items in batches.
- **Question:** How should the CLI handle partial failures (e.g., OpenAI API rate limits or transient network errors) during a large re-embedding task?
- **Suggestion:** Ensure the implementation handles partial successes gracefully, perhaps by skipping failed items and reporting them at the end, relying on the idempotent nature of the command for subsequent runs.

### 2.3 PR 4: Mechanical Migration Efficiency
- **Observation:** ~79 call sites need mechanical migration to `dbRun`/`dbExec`.
- **Suggestion:** For PR 4, consider using a structured search-and-replace or a small script to perform the bulk of the changes to ensure consistency and reduce manual error, given the repetitive nature of the task.

### 2.4 Invariant I14 & Static Audit
- **Observation:** The plan proposes a static-audit rule in `check-nimbus-invariants.ts`.
- **Confirmation:** This is a strong approach. Since it will be part of `bun run audit:invariants`, it should be sufficient to prevent regressions without needing a runtime "trap" in the database layer itself.

## 3. Technical Improvements

### 3.1 Timing-Safe Helpers (PR 1)
- **Observation:** Renaming `util/hex-compare.ts` to `util/timing-safe-compare.ts` is a good idea as it accurately reflects the broader purpose of the module.
- **Note:** Ensure that the Buffer-based `constantTimeStringEqual` handles strings of different lengths in a way that truly masks the length difference (e.g., by always performing a fixed number of comparisons or using a dummy comparison for the shorter string).

### 3.2 IPC Method `audit.toolCalls` (PR 2)
- **Observation:** The method is restricted to LAN peers and not added to the Tauri allowlist.
- **Note:** This follows the established security-in-depth patterns perfectly.

## 4. Conclusion

The design is **Approved**. The "plan-of-plans" approach provides clear direction for the next four development cycles. The suggested observations are mostly minor implementation details or long-term considerations that do not block the commencement of PR 1.
