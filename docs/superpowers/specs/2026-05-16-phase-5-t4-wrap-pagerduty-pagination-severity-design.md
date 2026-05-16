# Phase 5 T4 wrap-up — PagerDuty pagination + `severity_p1_aliases`

**Status:** Design (rev 2, review responses folded in — see § Review responses at bottom)
**Date:** 2026-05-16
**Branch:** `dev/asafgolombek/phase-5-t4-wrap-pagerduty-pagination-severity`
**Roadmap entries closed:**

- "PagerDuty sync pagination" ([docs/roadmap.md](../../roadmap.md))
- "`[pagerduty].severity_strategy` config knob" ([docs/roadmap.md](../../roadmap.md))

This is one PR that closes both T4 wrap-up loose ends. They share the same config block (`[pagerduty]`) and touch the same two production files; splitting them would create a needless intermediate state with a single-key TOML table.

## Motivation

Two unrelated but adjacent bugs in the Phase 5 T4 PagerDuty surface degrade DORA / preflight accuracy in production:

1. **Pagination drop.** [pagerduty-sync.ts:154-191](../../../packages/gateway/src/connectors/pagerduty-sync.ts#L154-L191) requests `limit=50`, no `sort_by` direction, never follows `has_more`, and hard-codes `SyncResult.hasMore = false`. High-volume orgs silently lose every incident past the first 50 per cursor advance.

2. **Priority taxonomy assumption.** [preflight.ts:117](../../../packages/gateway/src/preflight/preflight.ts#L117) filters strictly on `metadata.severity = 'P1'`. PagerDuty priority names are user-defined; common org taxonomies use `"Critical"`, `"SEV-1"`, `"Sev1"`, etc. Active P1-equivalent incidents are silently absent from preflight, producing false-clean preflight runs before a deploy.

Today's symptom for both: silent zero. There is no operator-visible signal that data is being dropped or filtered out, so the verdict reads `"ok"` regardless.

## Goals

- Walk PagerDuty incident pages to exhaustion (or to a configurable cap), with monotonic cursor advance under capping.
- Let teams declare which PD priority names map to "P1" for preflight purposes without rewriting indexed data.
- Surface a self-diagnostic gap note when preflight returns `count: 0` but high-urgency-untagged incidents exist on the configured services.

## Non-goals

- Multi-severity routing (P2, P3, etc.). Preflight today is P1-only; nothing else needs alias mapping.
- Retroactive re-normalization of already-indexed `severity` values. Query-time evaluation is the explicit design — indexed rows stay verbatim.
- Auto-detection of priority taxonomies. The alias list is operator-declared.
- Changing how `cfg.pagerdutyServices` is mapped per DORA service.

## Configuration

New top-level TOML block in `nimbus.toml`:

```toml
[pagerduty]
max_pages_per_sync = 20         # 1..100; default 20
severity_p1_aliases = [          # default: []
  "Critical",
  "SEV-1",
]
```

Parsed by a new `parseNimbusPagerdutyToml` function in [config/nimbus-toml.ts](../../../packages/gateway/src/config/nimbus-toml.ts), modelled on the existing `parseNimbusTomlUserSection`. Loader symmetric: `loadNimbusPagerdutyFromPath` + `loadNimbusPagerdutyFromConfigDir`.

```ts
export type NimbusPagerdutyToml = {
  maxPagesPerSync: number;       // default 20
  severityP1Aliases: readonly string[]; // default []
};

export const DEFAULT_NIMBUS_PAGERDUTY_TOML: NimbusPagerdutyToml = {
  maxPagesPerSync: 20,
  severityP1Aliases: [],
};
```

Validation:

- `max_pages_per_sync` must parse as a base-10 integer in `[1, 100]`. Out-of-range or non-integer values throw at parse time with a clear message naming the key.
- `severity_p1_aliases` reuses the existing `parseStringArray`, then **lowercases and de-duplicates** before storage. Empty / whitespace-only entries are dropped. The lowercase-dedup step happens once at parse time, not at query time, so the IN-clause downstream is always minimal and deterministic. A user-supplied `"P1"` is normalized away (covered by the canonical entry in the query), so `["Critical", "critical", "P1"]` → stored as `["critical"]`.

## Part 1 — Pagination

**File:** [pagerduty-sync.ts](../../../packages/gateway/src/connectors/pagerduty-sync.ts)

**Factory signature:**

```ts
export type PagerdutySyncableOptions = {
  ensurePagerdutyMcpRunning: () => Promise<void>;
  maxPagesPerSync: number;       // NEW — supplied by gateway bootstrap from NimbusPagerdutyToml
};
```

**`sync()` body (replaces current single-fetch logic):**

```
let pagesFetched = 0
let upserted = 0
let maxUpdated = since
let lastTextLen = 0

loop:
  u = new URL("https://api.pagerduty.com/incidents")
  u.searchParams.set("limit", "100")               // bumped 50 → 100 (PD max)
  u.searchParams.set("sort_by", "updated_at:asc")  // explicit asc for cursor correctness
  u.searchParams.set("since", since)
  u.searchParams.set("offset", String(pagesFetched * 100))

  await ctx.rateLimiter.acquire("pagerduty")       // one acquire per page
  res = await fetch(u, headers...)
  text = await res.text()
  lastTextLen = text.length

  if !res.ok:
    return pagerdutyListFailureResult(advancedCursor, since, lastTextLen, t0)
    // advancedCursor encodes maxUpdated-so-far; partial progress is preserved.

  parsed = JSON.parse(text)
  incidents = parsed.incidents (array or null)
  if incidents === null:
    return SyncResult { cursor: encode(maxUpdated), upserted, hasMore: false, ... }

  { upserted: deltaU, maxUpdated: deltaMax } = syncPagerdutyIncidentItems(ctx, incidents, maxUpdated, now)
  upserted += deltaU
  maxUpdated = deltaMax
  pagesFetched += 1

  pdHasMore = parsed.more === true               // PD's pagination flag
  if !pdHasMore: break
  if pagesFetched >= options.maxPagesPerSync: break

return SyncResult {
  cursor: encode(maxUpdated),
  itemsUpserted: upserted,
  itemsDeleted: 0,
  hasMore: pagesFetched >= options.maxPagesPerSync && pdHasMore,  // true iff stopped by cap
  durationMs: round(perfNow() - t0),
  bytesTransferred: lastTextLen,                  // last-page bytes; pre-existing semantic
}
```

**Key correctness notes:**

- **`sort_by=updated_at:asc`** is the load-bearing change for capped walks. With descending order, capping at N pages would advance the cursor past every incident below the N-th newest, silently dropping them on subsequent syncs. Ascending guarantees the cursor reflects actual ingestion progress.
- **`offset` arithmetic** is `pagesFetched * pageSize`, where `pageSize = 100`. PD's `/incidents` endpoint supports offset-based pagination only — there is no `cursor` parameter on this route (cursor pagination exists on PD's audit-records and change-events endpoints, but not here). PD's documented offset ceiling is 10,000, which matches our hard maximum of 100 pages × 100 per page; the default 20 pages stays well below it.
- **Dataset-shift safety.** Because we walk ascending and the cursor advances to `maxUpdated`, an incident updated during the walk drifts toward pages we haven't yet read — never below the cursor. If it slips past us mid-walk, the next sync catches it via `since >= cursor`. SQLite `upsert` makes re-ingesting unchanged rows idempotent.
- **Inclusive `since`.** PD's `since` filter is `updated_at >= since` (inclusive). If the cap interrupts mid-batch and N incidents share `updated_at = T`, the cursor advances to `T`, the next sync re-fetches the whole batch with `since=T`, and `upsert` deduplicates the rows we already wrote. No data loss across cap boundaries.
- **`bytesTransferred`** is recorded from the last page only. This matches pre-existing semantics (sum-vs-last is a minor metric concern, not a correctness one).
- **Partial-failure cursor** uses `maxUpdated` accumulated so far, not the original `since`. A 500 on page 7 still advances the cursor past pages 1-6.
- **`hasMore: true` on cap-hit** lets the scheduler re-queue immediately and we continue forward next iteration from the advanced cursor.

**Helper extraction (refactor):** the per-page fetch + parse + upsert loop body is extracted to a named local `fetchOnePage(offset)` returning `{ pdHasMore, parseFailed, fetchFailed, lastTextLen }` to keep the `sync` method readable. Pure refactor — no behavior change beyond the loop.

## Part 2 — `severity_p1_aliases` (query-time)

**File:** [preflight.ts](../../../packages/gateway/src/preflight/preflight.ts) + [metrics/dora-config.ts](../../../packages/gateway/src/metrics/dora-config.ts)

**`ServiceConfig` field addition:**

```ts
export type ServiceConfig = {
  // ...existing fields...
  readonly severityP1Aliases: readonly string[];   // lowercased at threading time
};
```

The bootstrap reads the top-level `[pagerduty]` block once, lowercases each alias, and copies the array into every `ServiceConfig` produced by `parseNimbusDoraToml` / the `[ci.service.<id>]` parser. The alias list is org-wide, not per-service — but threading via `ServiceConfig` keeps preflight's signature unchanged and avoids passing a separate parameter through `dispatchPreflightRpc` and the HTTP handler.

This is a small additive change at the materialization call sites. The TOML parsers themselves do not learn about `[pagerduty]` — the bootstrap composes the two reads.

**`selectActiveP1Incidents` SQL change** ([preflight.ts:110-119](../../../packages/gateway/src/preflight/preflight.ts#L110-L119)):

```sql
-- before
AND json_extract(metadata, '$.severity') = 'P1'

-- after
AND LOWER(json_extract(metadata, '$.severity')) IN (?, ?, ...)
-- params: "p1", plus each lowercased alias
```

The canonical set is built as `new Set(["p1", ...cfg.severityP1Aliases])` — the aliases array is already lowercased and deduped by the bootstrap, so the Set step is belt-and-braces against a user-supplied `"P1"` overlap. The placeholder count and parameter array are both derived from the same `Array.from(set)` iteration, so they cannot drift. The same change is applied to both the count query and the listing query.

**`IncidentFinding.severity`** continues to return the raw stored value (e.g., `"Critical"`), not `"P1"` — preserves audit truth in the API response. The mapping is purely a filter widening.

**Backward compatibility:** empty `severity_p1_aliases` (the default) yields `IN ('p1')`, which case-insensitively matches the verbatim `"P1"` values written today. Pre-existing behavior is preserved bit-for-bit for users who don't set the new key.

## Part 3 — Urgency gap

**Sync side** ([pagerduty-sync.ts](../../../packages/gateway/src/connectors/pagerduty-sync.ts)): in `syncPagerdutyIncidentItems`, additionally write `metadata.urgency = stringField(row, "urgency")` when present and non-empty. Untyped fallback: skip the field if missing. This is one additional line.

**Preflight side** ([preflight.ts:102-149](../../../packages/gateway/src/preflight/preflight.ts#L102-L149)): in `selectActiveP1Incidents`, after computing `count`, run one additional probe query iff `count === 0` AND `cfg.pagerdutyServices.length > 0`:

```sql
SELECT COUNT(*) AS c FROM item
WHERE service = 'pagerduty'
  AND type = 'incident'
  AND json_extract(metadata, '$.pagerduty_service_id') IN (...)
  AND json_extract(metadata, '$.status') IN ('triggered', 'acknowledged')
  AND json_extract(metadata, '$.urgency') = 'high'
  AND (json_extract(metadata, '$.severity') IS NULL OR json_extract(metadata, '$.severity') = '')
```

If that count > 0, return `gap: "pagerduty_urgency_without_priority"`.

**Type extension** ([preflight.ts:17](../../../packages/gateway/src/preflight/preflight.ts#L17)):

```ts
export type PreflightGap =
  | null
  | "no_pagerduty_mapping"
  | "no_repos"
  | "unknown_mergeable_state"
  | "pagerduty_urgency_without_priority";   // NEW
```

Single-value `gap` stays single-value: `pagerduty_urgency_without_priority` and `no_pagerduty_mapping` are mutually exclusive by construction (the probe runs only when services are configured).

**Verdict unchanged.** Gaps never flip the verdict — same rule as before. The gap is purely diagnostic ("preflight returned 0 P1s, but you have a high-urgency incident that isn't priority-tagged; check your `severity_p1_aliases` config or PagerDuty priority setup").

## Threading summary

Two threading sites, both already-existing functions that read the TOML once:

1. **`[pagerduty].severity_p1_aliases` → `ServiceConfig.severityP1Aliases`** — threaded inside [`loadNimbusServiceConfigsFromConfigDir`](../../../packages/gateway/src/config/nimbus-toml.ts) (the canonical loader at `nimbus-toml.ts:948`). That function already reads the `nimbus.toml` raw bytes once and runs `parseNimbusDoraToml(raw)` + `parseNimbusCiServiceToml(raw)` against the same buffer. Add a third parse — `parseNimbusPagerdutyToml(raw)` — over the same buffer, lowercase its `severityP1Aliases`, then attach the lowercased array to every `ServiceConfig` entry as it's merged into the return map. Single file change; no caller changes anywhere else, because every consumer (preflight RPC, HTTP route, metrics RPC) already calls `loadNimbusServiceConfigsFromConfigDir` and receives the enriched configs transparently.

2. **`[pagerduty].max_pages_per_sync` → `createPagerdutySyncable`** — threaded at [`packages/gateway/src/platform/assemble-sync-registrations.ts:128`](../../../packages/gateway/src/platform/assemble-sync-registrations.ts#L128). That file already imports `loadNimbusUpdaterFromConfigDir`-style loaders; add `loadNimbusPagerdutyFromConfigDir(paths.configDir)` and pass `maxPagesPerSync` into the factory options bag.

No new IPC method. No new HTTP route. No migration. No `ALLOWED_METHODS` change.

## Test plan

All under `packages/gateway/test/` matching existing layout:

### `connectors/pagerduty-sync.test.ts` (extend)

- **Walks multiple pages until `more=false`.** Mock `fetch` to return `{ incidents: [...], more: true }` for pages 0 and 1 (offset 0 and 100), then `{ incidents: [...], more: false }` on page 2. Assert all three pages are upserted, cursor reflects max `updated_at` across all rows, `SyncResult.hasMore === false`, three `rateLimiter.acquire` calls.
- **Respects `max_pages_per_sync` cap.** Mock `fetch` to always return `more: true`. With `maxPagesPerSync = 2`, assert exactly 2 fetches, `SyncResult.hasMore === true`, cursor advanced past page-2 rows.
- **Writes `metadata.urgency`.** Single-page response includes `urgency: "high"` on one incident; assert the upserted row's `metadata.urgency === "high"`.
- **Partial-failure preserves progress.** Page 0 succeeds, page 1 returns 500. Assert `SyncResult.cursor` encodes the max `updated_at` from page 0 (not the original `since`), `itemsUpserted` counts page-0 rows, `hasMore: false`.

### `preflight/preflight.test.ts` (extend)

- **Alias `"Critical"` counts toward P1.** Seed one incident with `severity: "Critical"`. Pass `cfg.severityP1Aliases = ["critical"]` (already lowercased per threading contract). Assert `active_p1_incidents.count === 1`, `findings[0].severity === "Critical"` (raw preserved).
- **Case-insensitive match.** Seed `severity: "CRITICAL"` and `severity: "P1"`; assert both counted with aliases `["critical"]`.
- **Urgency-gap fires when `count===0`.** Seed one open incident with `urgency: "high"` and no `severity`. Assert `active_p1_incidents.count === 0`, `gap === "pagerduty_urgency_without_priority"`.
- **Urgency-gap suppressed when `count > 0`.** Seed one P1 + one urgency-without-priority. Assert `count === 1`, `gap === null`.
- **Urgency-gap requires configured services.** With `cfg.pagerdutyServices = []`, assert `gap === "no_pagerduty_mapping"` (unchanged); the probe doesn't run.

### `config/nimbus-toml.test.ts` (extend)

- Parses `[pagerduty]` with both keys; round-trips to expected `NimbusPagerdutyToml`.
- Defaults applied when keys absent.
- `max_pages_per_sync = 0` throws with a clear message naming the key and bounds.
- `max_pages_per_sync = 101` throws.
- `severity_p1_aliases` with whitespace-only entries drops them.
- `severity_p1_aliases = ["Critical", "critical", "P1"]` lowercases and dedupes to `["critical"]` (the `"p1"` overlap is collapsed because the canonical query entry already covers it).

## Acceptance criteria

- `bun test packages/gateway/test/unit/connectors/pagerduty-sync.test.ts` green; coverage doesn't regress.
- `bun test packages/gateway/test/unit/preflight/preflight.test.ts` green; coverage gate ≥ 80% holds.
- A fresh-install gateway with no `[pagerduty]` block in `nimbus.toml` behaves identically to today's behavior.
- A gateway with `severity_p1_aliases = ["Critical"]` and existing indexed `"Critical"`-severity rows surfaces those rows in `nimbus deploy preflight` without re-sync.
- A gateway with > 100 incidents updated since the cursor walks all of them (up to the cap) in one `sync()` call; `nimbus connector history pagerduty` shows the multi-page run.

## Out of scope (not done in this PR)

- Multi-severity routing.
- Backward-incompatible cleanup of the old `bytesTransferred = text.length` last-page semantic.
- Per-DORA-service alias overrides.
- Telemetry counter for "pages walked per sync" (could be added later if needed for ops visibility).

## Files touched

- `packages/gateway/src/config/nimbus-toml.ts` — `+~60 lines` (parser, types, defaults, loader).
- `packages/gateway/src/connectors/pagerduty-sync.ts` — refactor `sync()` loop, add page helper, add `urgency` write. `+~50 lines`, `-~20 lines`.
- `packages/gateway/src/metrics/dora-config.ts` — add `severityP1Aliases` field to `ServiceConfig` type. `+1 line`.
- `packages/gateway/src/preflight/preflight.ts` — SQL filter widening, urgency-gap probe, `PreflightGap` union extension. `+~30 lines`.
- `packages/gateway/src/config/nimbus-toml.ts` — extend `loadNimbusServiceConfigsFromConfigDir` with a third raw-buffer parse + attach `severityP1Aliases` to every materialized `ServiceConfig`. `+~10 lines`.
- `packages/gateway/src/platform/assemble-sync-registrations.ts` — load `[pagerduty]`, thread `maxPagesPerSync` into `createPagerdutySyncable(...)`. `+~5 lines`.
- `packages/gateway/test/unit/connectors/pagerduty-sync.test.ts` — 4 new cases.
- `packages/gateway/test/unit/preflight/preflight.test.ts` — 5 new cases.
- `packages/gateway/test/unit/config/nimbus-toml.test.ts` — 5 new cases.
- `docs/roadmap.md` — flip both `[ ]` rows to `[x]` with PR link and date.
- `CLAUDE.md` — Status line: add to T4 wrap-up tally (one-liner).

No migration. No new IPC method. No new HTTP route. No `ALLOWED_METHODS` change. No security invariant change.

## Review responses

Disposition of the five points raised in [2026-05-16-phase-5-t4-wrap-pagerduty-pagination-severity-design-review.md](./2026-05-16-phase-5-t4-wrap-pagerduty-pagination-severity-design-review.md):

### 1. Offset vs cursor pagination — DEFER (no change), document why

PagerDuty's REST API v2 `/incidents` endpoint only supports **offset-based** pagination via the `offset` query parameter. There is no `cursor` parameter on `/incidents` — cursor pagination exists on newer PD endpoints (audit-records, change-events) but not on incidents. The reviewer's concern about dataset-shift mid-walk is real but bounded:

- We walk **ascending by `updated_at`**, so incidents updated during the walk drift *toward* higher pages we haven't yet read, never below us.
- The cursor advances to `maxUpdated` actually ingested, so anything updated during the walk is caught next sync via `since >= cursor` regardless of whether it shifted positions.
- Duplicates are harmless: SQLite `upsert` on `(service, external_id)` makes re-ingesting an unchanged row idempotent.

The 10,000-offset PD limit is comfortably above our default (20 pages × 100 = 2,000) and equal to the configured maximum (100 pages × 100 = 10,000). Both fit.

Added a one-line clarification to the pagination section noting offset is the only choice on this endpoint.

### 2. Cursor resolution & timestamp collisions — DOCUMENT (no code change)

PagerDuty's `since` filter is **inclusive** (`updated_at >= since`), per their REST v2 docs. Cap-induced interruptions are therefore safe:

- If the cap hits mid-batch and N incidents share the same `updated_at = T`, the cursor advances to `T`.
- Next sync queries `since = T`, returning the entire batch again.
- SQLite `upsert` deduplicates: rows we already wrote are no-ops; rows we didn't reach get inserted.

The cursor encoding (`PdCursorV1.lastUpdated`) already stores the ISO timestamp string PD expects, so no encoding work is needed. Added an explicit note in the pagination section.

### 3. Probe-query performance — DOCUMENT, defer composite index

Verified against [packages/gateway/src/index/unified-item-v3-sql.ts](../../../packages/gateway/src/index/unified-item-v3-sql.ts): the `item` table has separate single-column indexes on `service` and `type` — `idx_item_service` and `idx_item_type` — and no composite `(service, type)` index. SQLite's planner will use the more selective single-column index (almost always `service`, since `'pagerduty'` is far more selective than `'incident'` once the index has more than a handful of services). With ≤ 100 indexed PD incidents, the row residue after the index scan is small and the `type` filter is cheap.

Two reasons the probe is not a real concern in this PR:

1. **Pre-existing shape.** The existing `selectActiveP1Incidents` count query already uses the identical `service='pagerduty' AND type='incident'` filter. Our probe adds *one more* query of the same shape — it does not introduce a new access pattern.
2. **Gated execution.** The probe runs **only when `count === 0`** AND `cfg.pagerdutyServices.length > 0`. Any org with at least one active P1 incident skips it entirely. The 100,000-incident-org scenario the reviewer worries about is precisely the scenario where this skip applies most often.

Adding a composite `(service, type)` index would touch every `item`-table query, not just preflight, and belongs in a separate index-tuning ticket alongside other index reviews. Deferred.

### 4. Dynamic `IN`-clause placeholder generation — ACKNOWLEDGE (folded into design)

Implementation detail, not a design issue, but tightened up in the SQL section above: the placeholder string and parameter array are now both built from `Array.from(set)` of the same `Set` instance, so they cannot drift. A test in `preflight.test.ts` exercises the case where aliases are non-empty to assert the IN-clause actually matches both `"P1"` and the alias.

### 5. Alias edge case (user-supplied `"P1"` or `"p1"`) — FIX

Folded into the parser. `severity_p1_aliases` is now lowercased AND deduplicated at parse time, so `["Critical", "critical", "P1"]` becomes `["critical"]` in storage. The Set construction in `selectActiveP1Incidents` is a second line of defense against a partial-config edit. Added a parser test case.

## Summary of changes vs rev 1

| Review point | Disposition | Action in spec |
|---|---|---|
| 1. Offset vs cursor | DEFER | Documented why offset is the only option |
| 2. Timestamp collisions | DOCUMENT | Noted inclusive `since` + UPSERT idempotency |
| 3. Probe perf / index | DOCUMENT + DEFER index | Verified index situation, documented gating |
| 4. Placeholder generation | ACKNOWLEDGE | Tightened to a single `Set` source |
| 5. Alias dedup | FIX | Parser lowercases + dedupes; test added |
