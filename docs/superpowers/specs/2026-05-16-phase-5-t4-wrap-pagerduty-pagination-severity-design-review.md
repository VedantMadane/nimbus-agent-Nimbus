# Design Review: Phase 5 T4 wrap-up — PagerDuty pagination + `severity_p1_aliases`

## Overview
The proposed design elegantly addresses two critical silent-failure modes (pagination drops and strict priority taxonomy filtering) within the PagerDuty connector. The threading of configuration is minimal and respects the existing architectural boundaries.

Here are a few open questions, edge cases, and suggestions to consider before implementation.

## Open Questions & Suggestions

### 1. Pagination: Offset vs. Cursor-based
- **Context:** The design uses `offset` based pagination (`offset = pagesFetched * 100`). PagerDuty API docs state the maximum offset is 10,000. The proposed `max_pages_per_sync` cap of 100 perfectly guards against HTTP 400 errors from exceeding this limit (100 * 100 = 10,000).
- **Risk:** `offset` pagination is vulnerable to dataset shifting. If incidents are created or updated during the API walk, items can shift into or out of the current page, causing duplicates or missed items. 
- **Suggestion:** Does PagerDuty's official cursor-based pagination (using the `cursor` parameter instead of `offset`) fit this use-case better? If we stick to `offset`, since we use SQLite `upsert`, duplicates are harmless, but missing an item during a shift might require the next sync to catch it. It may be worth explicitly documenting why `offset` was chosen over `cursor`.

### 2. Cursor Resolution & Timestamp Collisions
- **Context:** The loop tracks `maxUpdated` to use as the `since` parameter for the next sync if capped.
- **Risk:** If a large number of incidents (e.g., >100) share the exact same `updated_at` timestamp, and the `maxPagesPerSync` cap stops the walk halfway through those incidents, the next sync will start with `since = maxUpdated` (which is that same timestamp).
- **Suggestion:** Verify PagerDuty's behavior with `since` (is it inclusive or exclusive?). If it's inclusive (`>=`), SQLite `UPSERT` will naturally handle the overlapping duplicates from the previous sync, which is safe. If it's exclusive (`>`), we might silently drop the rest of the incidents sharing that timestamp.

### 3. Preflight Urgency Gap Probe Performance
- **Context:** The urgency gap probe adds a `SELECT COUNT(*) FROM item WHERE service = 'pagerduty' AND type = 'incident' AND ...` query iff the P1 count is 0.
- **Question:** Does the `item` table have a composite index on `(service, type)` to efficiently support this query without a full table scan? Preflight runs are synchronously awaited by the user/CLI, so this query needs to be fast even if the user has 100,000 indexed incidents.

### 4. Dynamic SQL `IN` Clause Generation
- **Context:** The design states `LOWER(json_extract(metadata, '$.severity')) IN (?, ?, ...)` where the parameters are `"p1"` plus the aliases.
- **Suggestion:** Just a minor implementation detail reminder to ensure the number of `?` placeholders dynamically matches `1 + cfg.severityP1Aliases.length`, and that the array passed to the SQL runner matches exactly.

### 5. `severity_p1_aliases` Edge Case
- **Context:** The TOML parser allows empty entries to be dropped, and strings are lowercased.
- **Question:** What happens if a user configures an alias like `"p1"` or `"P1"`?
- **Suggestion:** The resulting array might contain duplicates like `['p1', 'p1']`, which results in `IN ('p1', 'p1')`. This is harmless in SQLite, as noted in the design ("degrades to a redundant SQL IN placeholder, which is harmless"), but confirming this behavior during testing would be a good sanity check.

## Conclusion
The design is robust and clearly aligns with the local-first, non-destructive principles of the project. Addressing the `offset` vs. `cursor` pagination and timestamp collision behavior will ensure complete data integrity for high-volume orgs.
