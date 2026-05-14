# Phase 5 T4 Wrap-up — PagerDuty Connector Enrichment Design

> **Status:** Design, ready for review.
> **Predecessors:**
> - [`2026-05-10-phase-5-t4-cicd-data-layer-design.md`](./2026-05-10-phase-5-t4-cicd-data-layer-design.md) — parent T4 CI/CD data-layer design covering PR 1/2/3. DORA's `selectResolvedIncidents` (shipped in PR 2, 2026-05-12) already reads `metadata.opened_at_ms` and `metadata.pagerduty_service_id` from incident rows; today both are unpopulated, so CFR / MTTR silently return `no_pagerduty_mapping`.
> - [`2026-05-12-phase-5-t4-pr3a-preflight-design.md`](./2026-05-12-phase-5-t4-pr3a-preflight-design.md) — pre-deploy active-P1 check (shipped 2026-05-13). `selectActiveP1Incidents` reads the same two fields plus `metadata.severity`; today all three are unpopulated, so the check silently returns zero findings.
> - [`2026-05-13-phase-5-t4-pr3b-annotation-design.md`](./2026-05-13-phase-5-t4-pr3b-annotation-design.md) — post-deploy annotation (shipped 2026-05-14). Names PagerDuty enrichment as "the right next step" in §2 Non-goals.

## 1. Goal

Make Nimbus's DORA Change Failure Rate / Mean Time to Restore (T4 PR 2) and Preflight active-P1 check (T4 PR 3a) compute against real PagerDuty data instead of silently returning `no_pagerduty_mapping` / zero findings in production. Close the only remaining open `[ ]` on the T4 roadmap line and unblock the documented "Phase 5 T4 PR 2 ships against fixture-seeded incidents; production accuracy depends on this follow-up" caveat.

The fix is a single-file enrichment in `packages/gateway/src/connectors/pagerduty-sync.ts`: write three new fields into each indexed incident's `metadata` object — `opened_at_ms`, `pagerduty_service_id`, and `severity` — using the existing `unknown`-safe parsing helpers. Downstream consumers (`metrics/dora.ts`, `preflight/preflight.ts`) already query these field names; no consumer edits are required.

## 2. Non-goals

- **No PagerDuty MCP server changes.** The MCP package at `packages/mcp-connectors/pagerduty/` is untouched. This PR is purely about the gateway-side sync that populates the local index.
- **No new metadata fields beyond what DORA / Preflight need.** No `urgency`, no `assignments[]`, no `incident_number`, no `incident_key`. Richer metadata for `nimbus expert` / `nimbus impact` is a separate, demand-driven follow-up.
- **No schema change, no migration, no V<N> entry.** Only `metadata` (a JSON-encoded column) is touched.
- **No backfill code path.** Pre-existing rows are overwritten on the next sync cycle as the cursor's `since` re-fetches their `updated_at` window. Documented as expected behaviour.
- **No `[pagerduty].severity_strategy` config knob.** This PR uses strict `priority.name`. A configurable strategy (urgency-fallback, custom name → P1 map) is a follow-up if real users on non-`"P1"`-labelled priorities ask for it.
- **No paging fix for >50 incidents between syncs.** The existing `limit=50, hasMore: false` behaviour predates this PR and is out of scope. Same data-loss profile as today. **Tracked as a planned roadmap follow-up** under T4 wrap-up (paragraph added in §8.1) so the gap is visible — not just buried as an inline TODO that rots.
- **No urgency-aware severity gap warning.** Gemini-CLI review §2.2 proposed warning when an incident has `urgency: "high"` but no `priority.name` — useful, but it changes the *preflight* contract (different file, different test surface) and requires deciding what fraction of urgency-only incidents should count as P1. **Tracked as part of the future `[pagerduty].severity_strategy` config-knob PR**, alongside the configurable `priority.name` → P1 alias map. Today this PR ships the strict rule; the future PR adds both the alias map *and* the urgency-gap warning together.
- **No `<tool_output>` envelope wrapping.** This code path is not LLM-facing — it writes to the local index, not to the agent context. Invariant `I11` does not apply.
- **No security-invariant touch.** No new defense, no new wiring, no new test under `security-invariants.test.ts`.

## 3. Architecture

```
PagerDuty REST API
       │ GET /incidents?since=<cursor>
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  packages/gateway/src/connectors/pagerduty-sync.ts              │
│                                                                 │
│   parsePagerdutyIncidents(text)  ─ unchanged                    │
│           │                                                     │
│           ▼                                                     │
│   syncPagerdutyIncidentItems(ctx, incidents, since, now)        │
│           │                                                     │
│           │   for each incident row:                            │
│           │     id              ← stringField(row, "id")        │
│           │     title           ← stringField(row, "title")     │
│           │     status          ← stringField(row, "status")    │
│           │     html_url        ← stringField(row, "html_url")  │
│           │     updated_at      ← stringField(row, "updated_at")│
│           │                                                     │
│           │     ── NEW (this PR) ─────────────────────────      │
│           │     created_at      ← stringField(row, "created_at")│
│           │     opened_at_ms    ← Date.parse(created_at)        │
│           │     pagerduty_service_id ← pdServiceId(row)         │
│           │     severity        ← pdPriorityName(row)           │
│           │     (each conditionally added to metadata)          │
│           │     ──────────────────────────────────────────      │
│           │                                                     │
│           ▼                                                     │
│   upsertIndexedItemForSync(ctx, { service: "pagerduty",         │
│                                    type:    "incident", ... })  │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
                  item table (existing schema, no migration)
                  ──────────────────────────────────────────
                  Stored in JSON-encoded metadata column:
                    {                                             
                      status: "triggered" | "acknowledged"        
                              | "resolved",                       
                      incidentId: "<pd id>",                      
                      opened_at_ms: 1747250421000,    ← NEW      
                      pagerduty_service_id: "PJK1HJ8", ← NEW      
                      severity: "P1"                   ← NEW      
                    }
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                                             ▼
     metrics/dora.ts                              preflight/preflight.ts
     selectResolvedIncidents:                     selectActiveP1Incidents:
       reads opened_at_ms                           reads opened_at_ms
       reads pagerduty_service_id                   reads pagerduty_service_id
                                                    reads severity ('P1' literal)
```

**Single touchpoint.** No new files, no IPC method, no allowlist edit, no schema migration. The only production-code change is inside one function in one file.

**Downstream consumers are already correct.** `dora.ts:341` and `preflight.ts:114-116` already match on the field names we add. The PR's most load-bearing test is that the existing DORA + Preflight integration tests stay green after the fixture re-shaping — proof that the connector now produces what the consumers were waiting for.

## 4. File-level changes

### 4.1 Files modified

| Path | Change |
|---|---|
| `packages/gateway/src/connectors/pagerduty-sync.ts` | (1) Add two private helpers `pdServiceId(row)` and `pdPriorityName(row)`; (2) inside `syncPagerdutyIncidentItems`, build a `metadata` object conditionally containing the three new fields; (3) bump `initialSyncDepthDays` from `14` to `30` so a fresh install's first DORA `--since 30d` window is populated immediately instead of after a 16-day backfill lag (Gemini-CLI review §2.3). |
| `packages/gateway/src/connectors/pagerduty-sync.test.ts` | Add unit cases enumerating the §6 edge-case matrix. |
| `packages/gateway/test/fixtures/dora/payment-service/seed.ts` | Replace hand-built incident metadata objects with `buildPagerdutyIncident(...)`-shaped payloads fed through the production parsing path. The hand-computed expectations in `expected-metrics.json` stay byte-identical. |
| `packages/gateway/test/fixtures/preflight/payment-service/seed.ts` | Same shape change. Adds at least one `priority: null` incident to prove the strict-priority rule excludes it from the P1 filter. |
| `docs/roadmap.md` | Flip the existing `[ ] **PagerDuty connector enrichment**` line at the bottom of T4 to `[x]` with the dated note. Extend the header status line at `roadmap.md:7` with "T4 wrap-up: PagerDuty enrichment ✅ (2026-05-14)". |

### 4.2 Files created

None.

### 4.3 Files removed

None.

## 5. Data shape

### 5.1 PagerDuty `GET /incidents` payload (excerpt)

```json
{
  "incidents": [
    {
      "id": "PT4KHLK",
      "incident_number": 423,
      "title": "High error rate on payment-service",
      "created_at": "2026-05-10T18:30:21Z",
      "updated_at": "2026-05-10T18:45:00Z",
      "status": "triggered",
      "html_url": "https://acme.pagerduty.com/incidents/PT4KHLK",
      "urgency": "high",
      "priority": {
        "id": "P53ZZH5",
        "type": "priority_reference",
        "name": "P1"
      },
      "service": {
        "id": "PJK1HJ8",
        "type": "service_reference",
        "summary": "payment-service"
      }
    }
  ]
}
```

`priority` is **nullable** — many PagerDuty accounts do not have priority levels enabled by an admin. `service` is always present on incidents from `GET /incidents` per the PagerDuty REST contract, but defensive code treats it as nullable anyway (a missing `service` simply produces a row that no service-id config can match — invisible to DORA/Preflight, which is the right outcome).

### 5.2 New metadata fields (added to `metadata` on every upsert)

| Field | Source expression | Type | Source-missing / malformed handling |
|---|---|---|---|
| `opened_at_ms` | `Date.parse(incident.created_at)` | `number` | **Omitted** (no key written) if `created_at` absent or `Date.parse` returns NaN. Downstream: `dora.ts:351` falls back to `r.synced_at`; `preflight.ts:142` falls back to `0` in the rendered finding. |
| `pagerduty_service_id` | `incident.service?.id` via `asRecord` + `stringField` | `string` | **Omitted** if `service` missing or `service.id` non-string or empty. Downstream: the row simply won't satisfy `json_extract(metadata, '$.pagerduty_service_id') IN (?,...)`, which is correct — config didn't claim ownership of an unknown service. |
| `severity` | `incident.priority?.name` via `asRecord` + `stringField` (strict, no urgency fallback) | `string` | **Omitted** if `priority` is null/absent or `priority.name` missing/empty. Downstream: preflight's `severity = 'P1'` filter naturally excludes it. |

### 5.3 "Omitted vs stored as null" rationale

All three fields are *omitted from the metadata object* when their source data is missing — we never write `opened_at_ms: null` or `severity: null`. Two reasons:

1. **Downstream code already tolerates missing keys.** `dora.ts:350-353` and `preflight.ts:142-144` use `typeof === 'number'` / `'string'` guards on `json_extract` results, which return `null` for missing keys. Storing explicit `null` adds no signal and bloats the JSON.
2. **Structural compatibility with pre-PR rows.** Rows indexed before this PR have `metadata: { status, incidentId }` — no `opened_at_ms` key. Omitting (rather than writing `null`) for malformed payloads means the missing-field case is structurally identical to a pre-PR row, so consumer code never special-cases.

### 5.4 Concrete diff at `pagerduty-sync.ts:75-88`

Existing (lines 75-88):

```ts
upsertIndexedItemForSync(ctx, {
  service: SERVICE_ID,
  type: "incident",
  externalId: id,
  title: title.length > 512 ? title.slice(0, 512) : title,
  bodyPreview: status ?? "",
  url: htmlUrl ?? null,
  canonicalUrl: htmlUrl ?? null,
  modifiedAt: Number.isFinite(modifiedAt) ? modifiedAt : now,
  authorId: null,
  metadata: { status: status ?? null, incidentId: id },
  pinned: false,
  syncedAt: now,
});
```

New (replaces the metadata literal with a built object; everything else byte-identical):

```ts
const createdAt = stringField(row, "created_at");
const openedAtMs = createdAt !== undefined ? Date.parse(createdAt) : Number.NaN;
const serviceId = pdServiceId(row);
const severity = pdPriorityName(row);

const metadata: Record<string, unknown> = { status: status ?? null, incidentId: id };
if (Number.isFinite(openedAtMs)) metadata.opened_at_ms = openedAtMs;
if (serviceId !== undefined && serviceId !== "") metadata.pagerduty_service_id = serviceId;
if (severity !== undefined && severity !== "") metadata.severity = severity;

upsertIndexedItemForSync(ctx, {
  service: SERVICE_ID,
  type: "incident",
  externalId: id,
  title: title.length > 512 ? title.slice(0, 512) : title,
  bodyPreview: status ?? "",
  url: htmlUrl ?? null,
  canonicalUrl: htmlUrl ?? null,
  modifiedAt: Number.isFinite(modifiedAt) ? modifiedAt : now,
  authorId: null,
  metadata,
  pinned: false,
  syncedAt: now,
});
```

Plus a one-line constant change at the top of the syncable to align the cold-start backfill with DORA's standard window:

```ts
// before
const initialSyncDepthDays = 14;
// after
const initialSyncDepthDays = 30;
```

This only affects installs without a stored cursor (i.e. a fresh PagerDuty connection). Installs with an existing cursor continue from their `lastUpdated` checkpoint, so this is **not** a re-sync trigger for existing users. Network cost: at most one extra `GET /incidents` call (50 incidents per page; tail loss past page 1 is the pre-existing `hasMore: false` issue called out in §2 Non-goals).

Plus two private helpers in the same file, reusing the existing `asRecord` / `stringField` utilities from `unknown-record.ts`:

```ts
function pdServiceId(row: Record<string, unknown>): string | undefined {
  const svc = asRecord(row["service"]);
  return svc !== undefined ? stringField(svc, "id") : undefined;
}

function pdPriorityName(row: Record<string, unknown>): string | undefined {
  const pri = asRecord(row["priority"]);
  return pri !== undefined ? stringField(pri, "name") : undefined;
}
```

## 6. Edge cases

| # | Edge case | Behaviour |
|---|---|---|
| 1 | `priority: null` (unprioritised incident, common case) | `severity` omitted; preflight P1 filter skips; DORA still uses it for CFR/MTTR if resolved |
| 2 | `priority` field absent entirely | Identical to #1 (`asRecord(undefined)` → `undefined`) |
| 3 | `priority` object present but `name` missing or non-string | `severity` omitted (`stringField` returns `undefined`) |
| 4 | `service` field absent entirely | `pagerduty_service_id` omitted; row indexed but won't match any config |
| 5 | `service.id` missing or non-string | Same as #4 |
| 6 | `created_at` malformed (`"yesterday"`, `""`, missing) | `Date.parse` → NaN → `Number.isFinite` filters → `opened_at_ms` omitted |
| 7 | `created_at` in the future (clock skew) | Stored as-is — future timestamps are mathematically valid; DORA's window filter handles the cutoff |
| 8 | `priority.name = "Critical"` or `"SEV-1"` (non-standard label) | Stored verbatim as `severity`. Preflight's `severity = 'P1'` filter excludes — correct per the user's exact-match semantics. Future config knob can map. |
| 9 | Resolved incident with missing `created_at` (contract violation, defensive) | `opened_at_ms` omitted → DORA `opened = r.synced_at` fallback → row included in MTTR with `synced_at`-derived opened time. Slightly imprecise; doesn't crash. |
| 10 | Pre-PR row (`metadata: { status, incidentId }` only) | Survives intact; not matched by service-id WHERE filter until natural re-sync overwrites it |

### 6.1 Failure-mode invariants we commit to

1. **Never throw on a malformed incident.** Every field read goes through `unknown`-safe helpers. The sync cycle as a whole succeeds even if every incident in the response is half-baked.
2. **Never drop the existing fields.** `status` and `incidentId` continue to land for every parseable incident, preserving behaviour for any consumer we don't know about.
3. **Never store invalid values.** `opened_at_ms: NaN`, empty-string `pagerduty_service_id`, empty-string `severity` are all filtered before they reach SQLite, because consumer code does direct numeric and string-equality comparison.

## 7. Test plan

### 7.1 Unit tests — `pagerduty-sync.test.ts`

Extends the existing test file. Each case feeds a real-shaped incident payload through one sync cycle and asserts the upserted `item.metadata` row.

| Case name | Payload variation | Assertions |
|---|---|---|
| `enriches with opened_at_ms, pagerduty_service_id, severity on happy path` | Full incident with `created_at`, `service.id`, `priority.name = "P1"` | All three fields land with exact values; `opened_at_ms === Date.parse(created_at)` |
| `omits severity when priority is null` | `priority: null` | `metadata.severity === undefined`; `opened_at_ms`, `pagerduty_service_id` present |
| `omits severity when priority.name missing` | `priority: { id: "X" }` (no `name`) | Same as above |
| `omits pagerduty_service_id when service object missing` | No `service` field | `metadata.pagerduty_service_id === undefined`; other fields present |
| `omits pagerduty_service_id when service.id missing` | `service: { summary: "..." }` (no `id`) | Same as above |
| `passes severity through verbatim for non-P1 names` | `priority.name = "P2"` | `metadata.severity === "P2"` (proves no hard-coded `"P1"` in the source) |
| `omits opened_at_ms when created_at is malformed` | `created_at: "yesterday"` | `metadata.opened_at_ms === undefined`; `modifiedAt` row column still uses `now` fallback |
| `omits opened_at_ms when created_at absent` | `created_at` removed | Same as above |
| `cursor advancement still works with new metadata` | Two-incident payload with distinct `updated_at` | Returned cursor's `lastUpdated` matches the max `updated_at`; new fields don't disturb the cursor |
| `does not throw on entirely malformed row` | `{ id: "X" }` only — every other field missing | Sync result returns successfully with `upserted >= 1`; no exception |
| `fresh install uses 30-day backfill window` | First sync with `cursor: null` and `now` fixed | The `since` query parameter on the captured `fetch` URL equals `new Date(now - 30 * 86_400_000).toISOString()` — locks in the §5.4 constant change so a future revert is caught at unit-test time |

### 7.2 Integration — fixture re-shaping

Both fixture seeds currently fabricate synthetic metadata objects directly. We rewrite each fixture's incident insert to build incidents via a tiny `buildPagerdutyIncident({...})` helper that returns the same JSON shape PagerDuty's API returns, then thread it through `syncPagerdutyIncidentItems` so the seeded rows flow through the production parser.

| Fixture path | Re-shape |
|---|---|
| `test/fixtures/dora/payment-service/seed.ts` | Replace synthetic metadata inserts with helper-built incidents fed through the real parsing path. `expected-metrics.json` stays byte-identical. |
| `test/fixtures/preflight/payment-service/seed.ts` | Same. Add at least one `priority: null` incident to lock in the strict-priority exclusion. |

**The load-bearing test of this PR:** the existing DORA + Preflight integration tests (`test/integration/...`) stay green *without any code edit to the metric calculators*. Green tests are the proof that the connector now produces what the consumers were waiting for.

### 7.3 Coverage gates

No new gate. Work lives under `packages/gateway/src/connectors/` (no dedicated coverage threshold).

The existing `bun run test:coverage:metrics` (≥80%) and `bun run test:coverage:preflight` (≥80%) gates must stay green via the re-shaped fixtures. If `bun run test:ci` flags a drop, add unit / integration cases until both gates pass at their existing thresholds.

### 7.4 What this PR does NOT test

- Live PagerDuty API call — tests mock `fetch` as the existing PagerDuty tests do.
- Network failures, rate-limit responses — already covered by the pre-existing tests; this PR adds only payload-parsing cases.
- Cursor migration / backfill — no backfill path exists.

## 8. Roadmap & PR boundary

### 8.1 Roadmap edits

Two edits in `docs/roadmap.md`:

1. **Line item flip** (currently at `roadmap.md:569`):

   ```markdown
   - [x] **PagerDuty connector enrichment** (2026-05-14, Phase 5 T4 wrap-up) — `pagerduty-sync.ts`
     now writes `metadata.opened_at_ms` (from `incident.created_at`),
     `metadata.pagerduty_service_id` (from `incident.service.id`), and
     `metadata.severity` (from strict `incident.priority?.name`) on every indexed
     `incident` row. DORA CFR/MTTR (PR 2) and Preflight active-P1 (PR 3a) now compute
     against real PagerDuty data; both surfaces previously returned `no_pagerduty_mapping` /
     zero findings in production. No schema change, no migration — natural cursor re-sync
     overwrites pre-existing rows. Non-`"P1"` priority names (`"Critical"`, `"SEV-1"`)
     pass through verbatim; a future `[pagerduty].severity_strategy` config knob can
     map them to preflight's P1 filter if user demand emerges.
   ```

2. **Header status note** (extend the line at `roadmap.md:7`): append "T4 wrap-up: PagerDuty enrichment ✅ (2026-05-14)" to the dated `Last updated` line.

### 8.2 New roadmap follow-ups (added by this PR, not closed by it)

Two `[ ]` items appended to T4 in `docs/roadmap.md` immediately after the PagerDuty enrichment line that this PR flips to `[x]`. These capture the Gemini-CLI review §2.1 + §2.2 follow-ups in a place that won't rot:

```markdown
- [ ] **PagerDuty sync pagination** — follow `has_more` on `GET /incidents` and walk pages
  until exhausted (or until a `[pagerduty].max_pages_per_sync` cap is hit). Today the sync
  fetches the first 50 incidents updated since the cursor and drops the tail. DORA accuracy
  for high-volume orgs depends on this. No new credentials.
- [ ] **`[pagerduty].severity_strategy` config knob** — let teams map non-`"P1"` priority
  names (`"Critical"`, `"SEV-1"`) to preflight's P1 filter; emit a `gap` note in
  `deploy.preflight` when the connector sees `urgency: "high"` incidents with no
  `priority.name`, so operators can self-diagnose silent-zero preflight results. Bundles
  the alias-map and urgency-gap-warning Gemini-CLI suggested separately in §2.2.
```

### 8.3 Skill / file-map updates

None. No new file, no new IPC method, no new connector tool surface. The existing `nimbus-file-map.md` row for `connectors/pagerduty-sync.ts` already covers it.

### 8.4 Commit / PR topology

| Commit | Contents |
|---|---|
| `feat(pagerduty): enrich incident metadata with opened_at_ms, pagerduty_service_id, severity` | Production change + unit test cases + fixture re-shaping + roadmap flip |

One commit keeps the diff small enough to review whole and ties the production change to its tests + roadmap acknowledgement atomically. No squash-merge surprises — what reviewers see in the PR is what lands on `main`.

**PR title:** `feat(pagerduty): enrich incident metadata to unblock DORA + Preflight`
**PR branch:** `dev/asafgolombek/phase-5-t4-pagerduty-enrichment`

## 9. Open questions

None. All design decisions resolved in brainstorming:

- Severity rule: **strict `priority.name`** (no urgency fallback).
- Backfill: **none** — natural re-sync overwrites.
- Severity inclusion (beyond the roadmap line's literal `opened_at_ms` + `pagerduty_service_id`): **yes, bundled** — same code path, unblocks preflight in one PR.
- Parser extraction: **kept inline** — refactor when the MCP write-tool path actually needs it.

## 10. Review disposition (Gemini-CLI, 2026-05-14)

Source: [`2026-05-14-phase-5-t4-pagerduty-enrichment-review-feedback.md`](./2026-05-14-phase-5-t4-pagerduty-enrichment-review-feedback.md). Each suggestion is either folded into this PR (FIX) or punted to a tracked follow-up (DEFER) with rationale.

| Review § | Item | Disposition | Rationale & where in this spec |
|---|---|---|---|
| 2.1 | Paging / `has_more` follow-up beyond first 50 incidents | **DEFER** | Out of scope per spec §2 (reviewer agrees). New tracked roadmap item added in §8.2 so the gap is visible — preferred over inline `// TODO` because TODOs rot once the PR ships. |
| 2.2 | Severity strategy & "P1" hardcoding — warn when `urgency: "high"` but no `priority.name`; document in `nimbus.toml` | **DEFER** | Two-part change. The alias-map (`"Critical"` → `"P1"`) is already named as a future `[pagerduty].severity_strategy` config knob in §2 Non-goals. The new piece — emitting a `gap` note in preflight when urgency-without-priority is seen — touches a different file (`preflight/preflight.ts`) and changes the preflight contract; bundling it changes the review surface. Bundled into the same future config-knob PR (§8.2 follow-up #2). For now, the strict-`"P1"` rule is documented as expected behaviour in §6 row 8. |
| 2.3 | `initialSyncDepthDays = 14` vs DORA's standard `--since 30d` window — fresh installs lose 16 days of CFR/MTTR data | **FIX** | Strongest catch in the review. Bumped `14 → 30` in §4.1 and §5.4. Only affects fresh installs (cursor-less); existing installs continue from their stored `lastUpdated`. Network cost is negligible (one extra `GET /incidents` call max). A new unit test in §7.1 (`fresh install uses 30-day backfill window`) pins the constant so a future accidental revert fails CI. |
| 2.4 | Cursor migration confirmation (`CURSOR_PREFIX` unchanged) | **NO ACTION** | Confirmation only — already captured in §3 / §8.4 / §9. The cursor prefix stays `nimbus-pd1:` and existing cursors keep working. |
| 3.1 | Export `pdServiceId` / `pdPriorityName` for future PagerDuty MCP server reuse | **DEFER** | YAGNI — the PagerDuty MCP server at `packages/mcp-connectors/pagerduty/` doesn't currently consume these helpers, and §9 of the spec already rejected speculative parser extraction. When the MCP write-tool path actually needs the parsing, that's the right time to extract — driven by a real second caller. |
| 3.2 | `Date.parse` robustness for ISO-8601 | **NO ACTION** | Reviewer agrees the existing approach (paired with `Number.isFinite`) is correct. No change. |

**Net effect on this PR:** one production-code change (`initialSyncDepthDays 14 → 30`), one new unit test, two new tracked roadmap follow-ups, zero changes to the metadata-enrichment core. Everything else stays as-designed.

## 11. References

- `packages/gateway/src/connectors/pagerduty-sync.ts` — the file modified by this PR
- `packages/gateway/src/metrics/dora.ts:327-357` — `selectResolvedIncidents` consumer
- `packages/gateway/src/preflight/preflight.ts:102-149` — `selectActiveP1Incidents` consumer
- `packages/gateway/src/connectors/unknown-record.ts` — `asRecord` / `stringField` helpers reused for parsing
- PagerDuty REST API docs: `GET /incidents` — <https://developer.pagerduty.com/api-reference/9d0b4b12e36f9-list-incidents>
