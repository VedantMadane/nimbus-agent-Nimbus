# Phase 5 T6 PR 3 — Plan Review Feedback

**Plan Document:** [`2026-05-15-phase-5-t6-pr3-vec-items-1536.md`](./2026-05-15-phase-5-t6-pr3-vec-items-1536.md)
**Reviewer:** Gemini CLI
**Date:** 2026-05-15

## Summary

The implementation plan is exceptionally detailed and directly addresses the requirements and implementation choices locked in the design document. It follows established project patterns and includes robust testing and security verification steps.

## Suggestions & Improvements

### 1. SQLite Optimization — `backfillForRoutingKeys` (Step 4.2)
The plan uses `(i.service || ':' || i.type) IN (?,?,...)` in the `WHERE` clause.
- **Concern:** String concatenation in a filter usually prevents SQLite from using existing indexes on `service` or `type` columns.
- **Suggestion:** For better performance on large databases, consider using a composite filter:
  ```sql
  WHERE (i.service = ? AND i.type = ?) 
     OR (i.service = ? AND i.type = ?)
     ...
  ```
  Or, if the number of types is large, use a temporary table/CTE and join on it. Given `PROSE_HEAVY_TYPES` is currently 14 items, a series of `OR` clauses or a `VALUES` clause (if supported) might be more index-friendly.

### 2. Migration Transactionality (Step 1.1)
The V30 SQL constants include `DROP TRIGGER` and `CREATE TRIGGER`.
- **Verification:** Ensure the `runIndexedSchemaMigrations` runner executes these within a single transaction alongside the `CREATE VIRTUAL TABLE` statement. This prevents any inconsistency where deletes fail to propagate to one of the tables during the migration window.

### 3. CLI Subscription Handling (Step 13.1)
The plan correctly places the `subscribe` calls *before* the `index.reembed` request.
- **Self-Correction:** This addresses the race condition concern raised during the design review.

### 4. Constants Usage (Task 2)
The plan defines `EMBEDDING_DIM_LOCAL` and `EMBEDDING_DIM_OPENAI`.
- **Suggestion:** Ensure Task 4 (`SqliteEmbeddingPipeline`) and Task 8 (`vectorSearchChunks`) actually import and use these constants instead of the literal `384` and `1536` values shown in the snippets.

### 5. OpenAI Batch Clamping (Step 11.2)
The `clamped 1..256` logic for `batchSize` is good.
- **Note:** Ensure that if `skipped` count is high due to 429s, the CLI/RPC returns a clear summary as planned.

## Open Questions

1. **`allObservedRoutingKeys` Implementation:** Will this use a cached set of keys or query the DB every time? If querying, ensure it uses `SELECT DISTINCT service, type` to leverage indexes.
2. **`MockVault` Import:** Ensure the import path for `MockVault` in Task 14 matches the project's actual test utility location.

## Conclusion

The plan is high-quality and ready for execution. The few suggestions above are minor optimizations for performance and robustness.
