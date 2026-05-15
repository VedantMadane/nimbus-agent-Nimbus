# Phase 5 T6 PR 3 — Review Feedback

**Design Document:** [`2026-05-15-phase-5-t6-pr3-vec-items-1536-design.md`](./2026-05-15-phase-5-t6-pr3-vec-items-1536-design.md)
**Reviewer:** Gemini CLI
**Date:** 2026-05-15

## Summary

The design for PR 3 is comprehensive and aligns well with the parent sequencing spec and the project's architectural standards (local-first, security invariants, technical stack). The approach to per-type routing and dual-search is pragmatic and maintainable.

## Suggestions & Improvements

### 1. V30 Migration — Trigger Safety
In §1, the migration drops and recreates `embedding_chunk_ad_delete_vec384` with a `WHEN OLD.dims = 384` clause.
- **Verification:** Ensure that all existing `embedding_chunk` rows have the `dims` column populated (it seems they do since V6, but a quick check in the runner to ensure no nulls might be safer if we ever had a partial schema).
- **Optimization:** The `DROP TRIGGER` followed by `CREATE TRIGGER` is standard, but ensure this is wrapped in the same transaction as the `vec_items_1536` creation to avoid a window where deletes don't propagate to `vec_items_384`.

### 2. `RoutingEmbeddingPipeline` — Backfill Efficiency
In §3c, `backfillAll` calls `this.allObservedRoutingKeys()`.
- **Suggestion:** If `allObservedRoutingKeys()` performs a `SELECT DISTINCT service || ':' || type FROM item`, it could be slow on large databases. Consider using `SELECT DISTINCT service, type FROM item` and joining them in JS, or ensure `(service, type)` has a covering index if it doesn't already (it does: `idx_item_service` and `idx_item_type` exist, but a composite might be better if this becomes a hot path).
- **Alternative:** Since `PROSE_HEAVY_TYPES` is a fixed set, you could just query for items where `(service || ':' || type) IN (...)` directly for the OpenAI side, and everything else for the local side.

### 3. `SqliteEmbeddingPipeline` — Hardcoded Dimensions
In §3b, the constructor gates on `384` and `1536`.
- **Suggestion:** Use constants for these (e.g., `DIM_LOCAL = 384`, `DIM_OPENAI = 1536`) to avoid magic numbers, especially since they appear in multiple files (migrations, pipeline, search).

### 4. CLI UX — `--item-type` Discriminator
In §5a, the discriminator for `--item-type` is the presence of a colon.
- **Question:** Are there any known service or type names that might contain a colon but are NOT meant to be the `service:type` separator? (Currently none in the `PROSE_HEAVY_TYPES` list, but worth a sanity check for future-proofing).

### 5. IPC `index.reembedProgress` Subscriptions
- **Question:** How will the CLI handle the async nature of the notifications? Usually, the CLI blocks until `reembedDone` or `reembedError`. Ensure the IPC client used in `runIndexCmd` correctly sets up the notification handlers before sending the `index.reembed` request.

### 6. Job Runner — Retry Logic
In §5c, the retry logic is "1 retry after 2s".
- **Suggestion:** For OpenAI's 429 (Rate Limit), they often provide a `retry-after` header. If it's missing, 2s might be too aggressive for a heavy backfill. Consider a slightly more robust exponential backoff or checking the header if available.

### 7. Security Invariants
- **Confirmation:** The use of `vecTable = "vec_items_${String(dims)}"` with a hard enum-like check is indeed I9-safe.
- **Verification:** Ensure that `index.reembed*` is explicitly added to the `I5` rejection list or that the default behavior of `checkLanMethodAllowed` correctly excludes the `index.*` namespace.

## Open Questions

1. **Orphan Cleanup:** Section 3d mentions orphaned `vec_items_384` rows. Should we add a note to the "Out of Scope" section about whether a future `db cleanup` command should handle this?
2. **Hybrid Search Balance:** As noted in 4e, raw L2 merging is an approximation. If we find that one model consistently "wins" due to distance scaling, would we consider a simple weight multiplier in `dual-search.ts`? (Deferred to Phase 6 is fine).
3. **Large Batches:** For `--batch-size`, the default is 100. Is there a maximum limit enforced by the Gateway to prevent extremely large memory usage or OpenAI payload limits?

## Conclusion

The design is solid and ready for the implementation phase. No blockers identified.
