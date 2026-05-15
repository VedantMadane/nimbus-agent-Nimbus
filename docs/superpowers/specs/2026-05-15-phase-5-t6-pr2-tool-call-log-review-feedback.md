# Phase 5 T6 PR 2 — `tool_call_log` Audit Table — Review Feedback

> **Date:** 2026-05-15
> **Reviewer:** Gemini CLI
> **Status:** Review Complete

## 1. Overall Impression

The design is excellent. It provides a robust audit complement to the I11 security invariant (LLM-facing tool result envelope) without introducing any functional regressions or violating security boundaries. The use of a per-row size cap and the deferral of the retention policy are sensible scoping decisions.

## 2. Suggestions & Observations

### 2.1 Multi-byte Truncation (Section 5.2)
- **Observation:** `Buffer.slice(0, 65_504).toString("utf8")` may truncate in the middle of a multi-byte UTF-8 character, resulting in a trailing replacement character ().
- **Note:** For audit purposes, this is acceptable. However, if precise character boundaries were needed, one would need to use `string.slice` and then check the byte length, or use a decoder that handles partial characters. Given the 64 KiB budget, the single-byte loss is negligible.

### 2.2 IPC Sentinel for NULL Session (Section 6.1 / 7.0 Case 9)
- **Observation:** `sessionId: ''` (empty string) is used as a sentinel in the IPC request to find rows where `session_id IS NULL`.
- **Suggestion:** This is a clean approach for JSON-RPC which can be finicky with `null` params in some client libraries. Ensure this sentinel is explicitly documented in the `audit.toolCalls` RPC schema/docs so users don't mistake it for "all sessions".

### 2.3 Pagination Cursor Stability (Section 10.2)
- **Observation:** The plan mentions an internal `AND id > ?` clause to handle stable pagination across same-millisecond rows.
- **Suggestion:** Ensure the `ToolCallLogReadResult` (and internal helpers) includes the `id` of the last seen row so the next request can truly be stable. If `nextSince` is just the timestamp, a second call with `since = nextSince` might return the same rows if they share that millisecond. The internal logic should ideally use a composite cursor `(called_at, id)`.

### 2.4 Error Envelope Persistence (Section 7.0 Case 1)
- **Observation:** Errors are logged then re-thrown. The error envelope `{ error: String(err) }` is persisted.
- **Confirmation:** This is correct. It ensures that even "invisible" failures (where the tool crashed before returning a result) are forensic-visible in the audit table.

## 3. Technical Improvements

### 3.1 `dbRun` Usage
- **Observation:** The design correctly notes that T6 PR 4 will migrate all call sites to `dbRun`, but this PR (PR 2) will use `dbRun` for its new helpers from day one.
- **Note:** This is the correct "forward-correct" approach.

## 4. Conclusion

The design is **Approved**. It is well-scoped and adheres to all project non-negotiables, particularly regarding security and local-first principles. It is ready for the implementation planning phase.
