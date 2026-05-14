# Phase 5 T4 Wrap-up — PagerDuty Connector Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich PagerDuty incident `metadata` with `opened_at_ms`, `pagerduty_service_id`, and `severity` so DORA Change Failure Rate / Mean Time to Restore (T4 PR 2) and Preflight active-P1 check (T4 PR 3a) compute against real data instead of silently returning `no_pagerduty_mapping` / zero findings. Closes the final open `[ ]` on the T4 roadmap line.

**Architecture:** Single-file production change in `packages/gateway/src/connectors/pagerduty-sync.ts`. Two private helpers (`pdServiceId`, `pdPriorityName`) read the nested PagerDuty REST shape via the existing `asRecord` / `stringField` `unknown`-safe utilities. The metadata object is built conditionally — fields are *omitted* (not nulled) when source data is missing, so consumer code never special-cases. `initialSyncDepthDays` bumps `14 → 30` to match DORA's standard reporting window. The function `syncPagerdutyIncidentItems` is exposed as an export so both DORA and Preflight fixtures can thread API-shaped incidents through the production parser, locking the connector contract in two integration test suites.

**Tech Stack:** Bun v1.2+, TypeScript 6.x strict (no `any`), `bun:sqlite` (`Database`), `bun:test`, pino logger, existing `ProviderRateLimiter`, the established `unknown`-safe parsing helpers in `unknown-record.ts`.

**Source spec:** [`docs/superpowers/specs/2026-05-14-phase-5-t4-pagerduty-enrichment-design.md`](../specs/2026-05-14-phase-5-t4-pagerduty-enrichment-design.md). The §10 review-disposition table is authoritative for review-feedback resolution; the FIX disposition (sync-depth bump) is baked into Task 2 below; the DEFER dispositions surface only in Task 6 (roadmap follow-up rows).

---

## File Structure

### Files modified

| Path | Responsibility |
|---|---|
| `packages/gateway/src/connectors/pagerduty-sync.ts` | Add `pdServiceId` + `pdPriorityName` helpers; build conditional metadata in `syncPagerdutyIncidentItems`; bump `initialSyncDepthDays` 14 → 30; export `syncPagerdutyIncidentItems` so fixtures can drive it directly. |
| `packages/gateway/src/connectors/pagerduty-sync.test.ts` | New unit cases enumerating the §6 / §7.1 spec matrix. |
| `packages/gateway/test/fixtures/dora/payment-service/seed.ts` | Replace four direct PagerDuty `ins(...)` SQL inserts with `buildPagerdutyIncident`-shaped payloads passed through `syncPagerdutyIncidentItems`. Hand-computed expectations in `expected-metrics.json` stay byte-identical. |
| `packages/gateway/test/fixtures/preflight/payment-service/seed.ts` | Same pattern; add one `priority: null` incident to lock in the strict-P1 exclusion. |
| `docs/roadmap.md` | Flip `[ ] PagerDuty connector enrichment` to `[x]` with dated note. Append two new `[ ]` follow-ups (paging + severity-strategy config knob) per spec §8.2. Extend the `Last updated` header status line at line 7. |

### Files created

| Path | Responsibility |
|---|---|
| `packages/gateway/test/fixtures/pagerduty/build-incident.ts` | Tiny pure helper `buildPagerdutyIncident({...})` that produces an `unknown`-typed object matching the PagerDuty REST API `GET /incidents` row shape. Shared by both fixture seeders so the API-shape contract lives in one place. |

### Files removed

None.

---

## Task 1 — Set up baseline: confirm worktree is clean and on `dev/asafgolombek/phase-5-t4-pagerduty-enrichment`

**Files:** none.

- [ ] **Step 1.1: Verify branch and clean working tree**

Run from the worktree root:

```bash
git rev-parse --abbrev-ref HEAD
git status --short
```

Expected:

```
dev/asafgolombek/phase-5-t4-pagerduty-enrichment
(no output from git status)
```

If branch is wrong: stop and ask the user. If working tree has unstaged changes: stop and ask.

- [ ] **Step 1.2: Confirm baseline typecheck is green**

Run:

```bash
bun run typecheck
```

Expected: exits 0, no errors. If errors exist before this PR's changes, stop and report — the baseline is dirty.

- [ ] **Step 1.3: Confirm the two consumer files still match the spec's line references**

Run:

```bash
grep -n "json_extract(i.metadata, '\$.pagerduty_service_id')" packages/gateway/src/metrics/dora.ts
grep -n "json_extract(metadata, '\$.severity') = 'P1'" packages/gateway/src/preflight/preflight.ts
```

Expected (line numbers may have drifted slightly):

```
packages/gateway/src/metrics/dora.ts:341:         AND json_extract(i.metadata, '$.pagerduty_service_id') IN (${placeholders})
packages/gateway/src/preflight/preflight.ts:116:    AND json_extract(metadata, '$.severity') = 'P1'
```

If either grep returns no match, stop — the consumer contract has shifted since the spec was written and the plan needs revisiting.

---

## Task 2 — Write failing unit tests for the new metadata fields (TDD red)

**Files:**

- Modify: `packages/gateway/src/connectors/pagerduty-sync.test.ts`

This task captures the ten cases in spec §7.1. Each case stubs `globalThis.fetch` with a PagerDuty-shaped payload, runs one sync cycle, and asserts the upserted `item.metadata` JSON.

- [ ] **Step 2.1: Rewrite the test file to add the new cases**

Replace the contents of `packages/gateway/src/connectors/pagerduty-sync.test.ts` with:

```ts
import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import {
  createMemoryIndexDb,
  createStubVault,
  describeWithFetchRestore,
  EMPTY_NIMBUS_VAULT,
  silentSyncContextExtras,
  syncTestContext,
  testConnectorSyncNoop,
  urlFromFetchInput,
} from "./connector-sync-test-helpers.ts";
import { createPagerdutySyncable } from "./pagerduty-sync.ts";

type IncidentMetadata = {
  status: string | null;
  incidentId: string;
  opened_at_ms?: number;
  pagerduty_service_id?: string;
  severity?: string;
};

function readIncidentMetadata(db: Database, externalId: string): IncidentMetadata {
  const row = db
    .prepare("SELECT metadata FROM item WHERE service = ? AND external_id = ?")
    .get("pagerduty", externalId) as { metadata: string };
  return JSON.parse(row.metadata) as IncidentMetadata;
}

function stubPagerdutyIncidents(incidents: unknown[]): void {
  globalThis.fetch = async (input: Parameters<typeof fetch>[0]) => {
    const url = urlFromFetchInput(input);
    if (!url.startsWith("https://api.pagerduty.com/incidents")) {
      throw new Error(`unexpected fetch: ${url}`);
    }
    return new Response(JSON.stringify({ incidents }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

async function runOneSync(incidents: unknown[]): Promise<Database> {
  stubPagerdutyIncidents(incidents);
  const db = createMemoryIndexDb();
  const sync = createPagerdutySyncable({ ensurePagerdutyMcpRunning: async () => {} });
  const vault = createStubVault({ "pagerduty.api_token": "test-token" });
  await sync.sync(syncTestContext(db, vault), null);
  return db;
}

describeWithFetchRestore("pagerduty-sync", () => {
  testConnectorSyncNoop(
    "no-op when credentials missing",
    () => createPagerdutySyncable({ ensurePagerdutyMcpRunning: async () => {} }),
    EMPTY_NIMBUS_VAULT,
  );

  test("no-op when token is empty string", async () => {
    const sync = createPagerdutySyncable({ ensurePagerdutyMcpRunning: async () => {} });
    const ctx = {
      vault: createStubVault({ "pagerduty.api_token": "" }),
      db: createMemoryIndexDb(),
      ...silentSyncContextExtras(),
    };
    const r = await sync.sync(ctx, null);
    expect(r.itemsUpserted).toBe(0);
  });

  test("enriches with opened_at_ms, pagerduty_service_id, severity on happy path", async () => {
    const db = await runOneSync([
      {
        id: "PT4KHLK",
        title: "High error rate on payment-service",
        created_at: "2026-05-10T18:30:21Z",
        updated_at: "2026-05-10T18:45:00Z",
        status: "triggered",
        html_url: "https://acme.pagerduty.com/incidents/PT4KHLK",
        priority: { id: "P53ZZH5", type: "priority_reference", name: "P1" },
        service: { id: "PJK1HJ8", type: "service_reference", summary: "payment-service" },
      },
    ]);
    const meta = readIncidentMetadata(db, "PT4KHLK");
    expect(meta.opened_at_ms).toBe(Date.parse("2026-05-10T18:30:21Z"));
    expect(meta.pagerduty_service_id).toBe("PJK1HJ8");
    expect(meta.severity).toBe("P1");
    expect(meta.status).toBe("triggered");
    expect(meta.incidentId).toBe("PT4KHLK");
  });

  test("omits severity when priority is null", async () => {
    const db = await runOneSync([
      {
        id: "PT_NULL_PRI",
        title: "Unprioritised incident",
        created_at: "2026-05-10T18:30:21Z",
        updated_at: "2026-05-10T18:30:21Z",
        status: "triggered",
        priority: null,
        service: { id: "PJK1HJ8" },
      },
    ]);
    const meta = readIncidentMetadata(db, "PT_NULL_PRI");
    expect(meta.severity).toBeUndefined();
    expect(meta.opened_at_ms).toBe(Date.parse("2026-05-10T18:30:21Z"));
    expect(meta.pagerduty_service_id).toBe("PJK1HJ8");
  });

  test("omits severity when priority.name missing", async () => {
    const db = await runOneSync([
      {
        id: "PT_NO_NAME",
        title: "Priority object without name",
        created_at: "2026-05-10T18:30:21Z",
        updated_at: "2026-05-10T18:30:21Z",
        status: "triggered",
        priority: { id: "P53ZZH5" },
        service: { id: "PJK1HJ8" },
      },
    ]);
    const meta = readIncidentMetadata(db, "PT_NO_NAME");
    expect(meta.severity).toBeUndefined();
  });

  test("omits pagerduty_service_id when service object missing", async () => {
    const db = await runOneSync([
      {
        id: "PT_NO_SVC",
        title: "Defensive: no service",
        created_at: "2026-05-10T18:30:21Z",
        updated_at: "2026-05-10T18:30:21Z",
        status: "triggered",
        priority: { name: "P1" },
      },
    ]);
    const meta = readIncidentMetadata(db, "PT_NO_SVC");
    expect(meta.pagerduty_service_id).toBeUndefined();
    expect(meta.opened_at_ms).toBe(Date.parse("2026-05-10T18:30:21Z"));
    expect(meta.severity).toBe("P1");
  });

  test("omits pagerduty_service_id when service.id missing", async () => {
    const db = await runOneSync([
      {
        id: "PT_NO_SVC_ID",
        title: "Service summary only",
        created_at: "2026-05-10T18:30:21Z",
        updated_at: "2026-05-10T18:30:21Z",
        status: "triggered",
        priority: { name: "P1" },
        service: { summary: "payment-service" },
      },
    ]);
    const meta = readIncidentMetadata(db, "PT_NO_SVC_ID");
    expect(meta.pagerduty_service_id).toBeUndefined();
  });

  test("passes severity through verbatim for non-P1 names", async () => {
    const db = await runOneSync([
      {
        id: "PT_P2",
        title: "P2 verbatim",
        created_at: "2026-05-10T18:30:21Z",
        updated_at: "2026-05-10T18:30:21Z",
        status: "acknowledged",
        priority: { id: "PXX", name: "P2" },
        service: { id: "PJK1HJ8" },
      },
    ]);
    const meta = readIncidentMetadata(db, "PT_P2");
    expect(meta.severity).toBe("P2");
  });

  test("omits opened_at_ms when created_at is malformed", async () => {
    const db = await runOneSync([
      {
        id: "PT_BAD_TIME",
        title: "Garbled timestamp",
        created_at: "yesterday",
        updated_at: "2026-05-10T18:30:21Z",
        status: "triggered",
        priority: { name: "P1" },
        service: { id: "PJK1HJ8" },
      },
    ]);
    const meta = readIncidentMetadata(db, "PT_BAD_TIME");
    expect(meta.opened_at_ms).toBeUndefined();
    expect(meta.severity).toBe("P1");
    expect(meta.pagerduty_service_id).toBe("PJK1HJ8");
  });

  test("omits opened_at_ms when created_at absent", async () => {
    const db = await runOneSync([
      {
        id: "PT_NO_CREATED",
        title: "No created_at",
        updated_at: "2026-05-10T18:30:21Z",
        status: "triggered",
        priority: { name: "P1" },
        service: { id: "PJK1HJ8" },
      },
    ]);
    const meta = readIncidentMetadata(db, "PT_NO_CREATED");
    expect(meta.opened_at_ms).toBeUndefined();
  });

  test("cursor advancement still works with new metadata", async () => {
    stubPagerdutyIncidents([
      {
        id: "PT_A",
        title: "First",
        created_at: "2026-05-10T10:00:00Z",
        updated_at: "2026-05-10T10:01:00Z",
        status: "triggered",
        priority: { name: "P1" },
        service: { id: "PJK1HJ8" },
      },
      {
        id: "PT_B",
        title: "Second (newer)",
        created_at: "2026-05-10T11:00:00Z",
        updated_at: "2026-05-10T11:05:00Z",
        status: "acknowledged",
        priority: { name: "P2" },
        service: { id: "PJK1HJ8" },
      },
    ]);
    const db = createMemoryIndexDb();
    const sync = createPagerdutySyncable({ ensurePagerdutyMcpRunning: async () => {} });
    const vault = createStubVault({ "pagerduty.api_token": "test-token" });
    const r = await sync.sync(syncTestContext(db, vault), null);
    expect(r.itemsUpserted).toBe(2);
    expect(r.cursor).toContain("2026-05-10T11:05:00Z");
  });

  test("does not throw on entirely malformed row", async () => {
    const db = await runOneSync([{ id: "PT_BARE" }]);
    const meta = readIncidentMetadata(db, "PT_BARE");
    expect(meta.incidentId).toBe("PT_BARE");
    expect(meta.opened_at_ms).toBeUndefined();
    expect(meta.pagerduty_service_id).toBeUndefined();
    expect(meta.severity).toBeUndefined();
  });

  test("fresh install uses 30-day backfill window", async () => {
    let capturedUrl: string | undefined;
    globalThis.fetch = async (input: Parameters<typeof fetch>[0]) => {
      capturedUrl = urlFromFetchInput(input);
      return new Response(JSON.stringify({ incidents: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    const db = createMemoryIndexDb();
    const sync = createPagerdutySyncable({ ensurePagerdutyMcpRunning: async () => {} });
    const vault = createStubVault({ "pagerduty.api_token": "test-token" });
    const before = Date.now();
    await sync.sync(syncTestContext(db, vault), null);
    const after = Date.now();
    expect(capturedUrl).toBeDefined();
    const since = new URL(capturedUrl as string).searchParams.get("since");
    expect(since).toBeDefined();
    const sinceMs = Date.parse(since as string);
    // Allow ±2s slack for the assertion window since `now` is computed inside sync().
    const expectedMin = before - 30 * 86_400_000 - 2000;
    const expectedMax = after - 30 * 86_400_000 + 2000;
    expect(sinceMs).toBeGreaterThanOrEqual(expectedMin);
    expect(sinceMs).toBeLessThanOrEqual(expectedMax);
  });
});
```

- [ ] **Step 2.2: Run the test file and verify the new cases fail**

Run:

```bash
bun test packages/gateway/src/connectors/pagerduty-sync.test.ts
```

Expected:
- The two existing tests (`no-op when credentials missing`, `no-op when token is empty string`) pass.
- The eleven new tests fail with assertions like `expect(meta.opened_at_ms).toBe(...)` → `undefined`, `expect(meta.severity).toBe("P1")` → `undefined`, and the `fresh install uses 30-day backfill window` test fails because `sinceMs` falls in the 14-day window.

If anything else happens (e.g., type error, file-not-found), stop and read the output before continuing.

- [ ] **Step 2.3: Commit the failing tests**

```bash
git add packages/gateway/src/connectors/pagerduty-sync.test.ts
git commit -m "$(cat <<'EOF'
test(pagerduty): TDD red — assert opened_at_ms, pagerduty_service_id, severity

Adds eleven unit cases covering the spec §7.1 / §6 matrix:
opened_at_ms / pagerduty_service_id / severity enrichment, omission
on malformed / missing source data, verbatim non-P1 severity, cursor
advancement, the entirely-malformed-row defense, and a regression
guard locking the 30-day cold-start backfill window.

All eleven new cases fail intentionally before Task 3 lands the
implementation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — Implement metadata enrichment + sync-depth bump (TDD green)

**Files:**

- Modify: `packages/gateway/src/connectors/pagerduty-sync.ts`

Three production-code changes in one file: add two private helpers, build the metadata object conditionally, bump `initialSyncDepthDays` from 14 to 30. Also `export` `syncPagerdutyIncidentItems` (needed by Task 4 / 5 for fixture re-shaping).

- [ ] **Step 3.1: Apply the implementation edits**

Replace the contents of `packages/gateway/src/connectors/pagerduty-sync.ts` with:

```ts
import { upsertIndexedItemForSync } from "../index/item-store.ts";
import { type Syncable, type SyncContext, type SyncResult, syncNoopResult } from "../sync/types.ts";
import { readConnectorSecret } from "./connector-vault.ts";
import { decodeNimbusJsonCursorPayload, encodeNimbusJsonCursor } from "./nimbus-json-cursor.ts";
import { asRecord, stringField } from "./unknown-record.ts";

const SERVICE_ID = "pagerduty";
const CURSOR_PREFIX = "nimbus-pd1:";

type PdCursorV1 = { lastUpdated: string };

function encodeCursor(c: PdCursorV1): string {
  return encodeNimbusJsonCursor(CURSOR_PREFIX, c);
}

function decodeCursor(raw: string | null): PdCursorV1 | null {
  if (raw === null || raw === "") {
    return null;
  }
  const parsed = decodeNimbusJsonCursorPayload(raw, CURSOR_PREFIX);
  if (parsed === undefined) {
    return null;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const rec = parsed as Record<string, unknown>;
  const lu = rec["lastUpdated"];
  if (typeof lu !== "string" || lu === "") {
    return null;
  }
  return { lastUpdated: lu };
}

function parsePagerdutyIncidents(text: string): unknown[] | null {
  let root: unknown;
  try {
    root = JSON.parse(text) as unknown;
  } catch {
    return null;
  }
  const rec = asRecord(root);
  if (rec === undefined) {
    return null;
  }
  const raw = rec["incidents"];
  return Array.isArray(raw) ? raw : null;
}

function pdServiceId(row: Record<string, unknown>): string | undefined {
  const svc = asRecord(row["service"]);
  return svc !== undefined ? stringField(svc, "id") : undefined;
}

function pdPriorityName(row: Record<string, unknown>): string | undefined {
  const pri = asRecord(row["priority"]);
  return pri !== undefined ? stringField(pri, "name") : undefined;
}

export function syncPagerdutyIncidentItems(
  ctx: SyncContext,
  incidents: unknown[],
  since: string,
  now: number,
): { upserted: number; maxUpdated: string } {
  let upserted = 0;
  let maxUpdated = since;
  for (const item of incidents) {
    const row = asRecord(item);
    if (row === undefined) {
      continue;
    }
    const id = stringField(row, "id");
    if (id === undefined || id === "") {
      continue;
    }
    const title = stringField(row, "title") ?? `Incident ${id}`;
    const status = stringField(row, "status");
    const htmlUrl = stringField(row, "html_url");
    const updated = stringField(row, "updated_at") ?? stringField(row, "created_at");
    if (updated !== undefined && updated > maxUpdated) {
      maxUpdated = updated;
    }
    const modifiedAt = updated === undefined ? now : Date.parse(updated);

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
    upserted += 1;
  }
  return { upserted, maxUpdated };
}

function pagerdutyListFailureResult(
  cursor: string | null,
  since: string,
  textLen: number,
  t0: number,
): SyncResult {
  return {
    cursor: cursor ?? encodeCursor({ lastUpdated: since }),
    itemsUpserted: 0,
    itemsDeleted: 0,
    hasMore: false,
    durationMs: Math.round(performance.now() - t0),
    bytesTransferred: textLen,
  };
}

export type PagerdutySyncableOptions = {
  ensurePagerdutyMcpRunning: () => Promise<void>;
};

export function createPagerdutySyncable(options: PagerdutySyncableOptions): Syncable {
  const initialSyncDepthDays = 30;
  return {
    serviceId: SERVICE_ID,
    defaultIntervalMs: 120 * 1000,
    initialSyncDepthDays,
    async sync(ctx: SyncContext, cursor: string | null): Promise<SyncResult> {
      const t0 = performance.now();
      await options.ensurePagerdutyMcpRunning();
      const token = await readConnectorSecret(ctx.vault, "pagerduty", "api_token");
      if (token === null || token.trim() === "") {
        return syncNoopResult(cursor, t0);
      }
      const prev = decodeCursor(cursor);
      const now = Date.now();
      const floorIso = new Date(now - initialSyncDepthDays * 86_400_000).toISOString();
      const since = prev?.lastUpdated ?? floorIso;

      await ctx.rateLimiter.acquire("pagerduty");
      const u = new URL("https://api.pagerduty.com/incidents");
      u.searchParams.set("limit", "50");
      u.searchParams.set("sort_by", "updated_at");
      u.searchParams.set("since", since);
      const res = await fetch(u.toString(), {
        headers: {
          Accept: "application/vnd.pagerduty+json;version=2",
          Authorization: `Token token=${token.trim()}`,
        },
      });
      const text = await res.text();
      if (!res.ok) {
        ctx.logger.warn(
          { serviceId: SERVICE_ID, status: res.status },
          "pagerduty sync: list failed",
        );
        return pagerdutyListFailureResult(cursor, since, text.length, t0);
      }
      const incidents = parsePagerdutyIncidents(text);
      if (incidents === null) {
        return {
          cursor: encodeCursor({ lastUpdated: since }),
          itemsUpserted: 0,
          itemsDeleted: 0,
          hasMore: false,
          durationMs: Math.round(performance.now() - t0),
          bytesTransferred: text.length,
        };
      }
      const { upserted, maxUpdated } = syncPagerdutyIncidentItems(ctx, incidents, since, now);

      return {
        cursor: encodeCursor({ lastUpdated: maxUpdated }),
        itemsUpserted: upserted,
        itemsDeleted: 0,
        hasMore: false,
        durationMs: Math.round(performance.now() - t0),
        bytesTransferred: text.length,
      };
    },
  };
}
```

Key diffs vs the pre-PR file:
- Added `pdServiceId` and `pdPriorityName` helpers at module scope.
- Promoted `syncPagerdutyIncidentItems` to an `export function` (signature unchanged).
- Inside the loop, built `metadata` conditionally from the three new sources.
- Changed `const initialSyncDepthDays = 14;` to `const initialSyncDepthDays = 30;`.

- [ ] **Step 3.2: Run the unit tests and verify they all pass**

Run:

```bash
bun test packages/gateway/src/connectors/pagerduty-sync.test.ts
```

Expected: 13 tests pass, 0 fail (2 pre-existing no-op cases + 11 new cases from Task 2).

If a case is still failing, read the output and fix the implementation — do NOT skip or weaken the test.

- [ ] **Step 3.3: Run the typecheck on the gateway**

Run:

```bash
bun run typecheck
```

Expected: exits 0.

If a type error mentions `syncPagerdutyIncidentItems` not exported elsewhere, that's expected — Task 4 / 5 will use it. The Task 3 edit only needs to introduce the export, not satisfy a downstream importer yet.

- [ ] **Step 3.4: Commit the green implementation**

```bash
git add packages/gateway/src/connectors/pagerduty-sync.ts
git commit -m "$(cat <<'EOF'
feat(pagerduty): enrich incident metadata + 30d cold-start window

- Adds opened_at_ms (from incident.created_at), pagerduty_service_id
  (from incident.service.id), and severity (from strict
  incident.priority.name) to indexed PagerDuty incident metadata.
  Unblocks DORA CFR/MTTR (T4 PR 2) and Preflight active-P1 check
  (T4 PR 3a) — both previously returned no_pagerduty_mapping/zero
  findings against real-shaped PagerDuty payloads.
- Bumps initialSyncDepthDays 14 → 30 so a fresh install's first
  `nimbus metrics dora --since 30d` window is fully populated.
  Existing installs (cursor-bearing) unaffected.
- Exports syncPagerdutyIncidentItems so DORA + Preflight fixtures
  can thread API-shaped incidents through the production parser
  (Tasks 4 & 5).

All eleven Task 2 tests now pass.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — Add shared `buildPagerdutyIncident` helper

**Files:**

- Create: `packages/gateway/test/fixtures/pagerduty/build-incident.ts`

A tiny pure builder that returns an `unknown` matching the PagerDuty REST API row shape. Centralises the shape so both DORA and Preflight fixtures share one definition.

- [ ] **Step 4.1: Create the helper file**

Create `packages/gateway/test/fixtures/pagerduty/build-incident.ts` with:

```ts
/**
 * Builder for synthetic PagerDuty REST API `GET /incidents` row payloads.
 *
 * Used by integration-test fixtures so each indexed incident flows through
 * the production parser (`syncPagerdutyIncidentItems`) instead of being
 * hand-shaped at the SQL boundary. Keeping the shape in one helper means a
 * single edit picks up new fields when the parser learns to read them.
 */

export type PagerdutyIncidentSeed = {
  id: string;
  title?: string;
  /** ISO-8601 instant. Falsy values are forwarded verbatim to exercise edge cases. */
  createdAt: string;
  /** ISO-8601 instant; defaults to `createdAt` when not provided. */
  updatedAt?: string;
  status: "triggered" | "acknowledged" | "resolved";
  htmlUrl?: string;
  /** PagerDuty priority name — typically "P1", "P2". `null` for unprioritised. */
  priorityName?: string | null;
  /** PagerDuty service id — `null` to omit the entire `service` object. */
  serviceId?: string | null;
};

export function buildPagerdutyIncident(seed: PagerdutyIncidentSeed): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: seed.id,
    title: seed.title ?? `Incident ${seed.id}`,
    created_at: seed.createdAt,
    updated_at: seed.updatedAt ?? seed.createdAt,
    status: seed.status,
  };
  if (seed.htmlUrl !== undefined) {
    row.html_url = seed.htmlUrl;
  }
  if (seed.priorityName === null) {
    row.priority = null;
  } else if (seed.priorityName !== undefined) {
    row.priority = { id: `pri_${seed.priorityName}`, name: seed.priorityName };
  }
  if (seed.serviceId !== null && seed.serviceId !== undefined) {
    row.service = { id: seed.serviceId, summary: `Service ${seed.serviceId}` };
  }
  return row;
}
```

- [ ] **Step 4.2: Typecheck**

Run:

```bash
bun run typecheck
```

Expected: exits 0.

- [ ] **Step 4.3: Commit**

```bash
git add packages/gateway/test/fixtures/pagerduty/build-incident.ts
git commit -m "$(cat <<'EOF'
test(pagerduty): shared buildPagerdutyIncident helper for fixtures

Produces an unknown-typed row matching the PagerDuty REST API
`GET /incidents` shape. DORA + Preflight fixtures thread these
payloads through syncPagerdutyIncidentItems so the connector
contract is exercised end-to-end by both integration suites.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — Re-shape DORA fixture to flow through the production parser

**Files:**

- Modify: `packages/gateway/test/fixtures/dora/payment-service/seed.ts`

The DORA fixture currently inserts four PagerDuty incidents directly via SQL with fully-formed `metadata` objects. After this task it builds them as API-shaped rows and threads them through `syncPagerdutyIncidentItems`, proving the parser produces what the DORA calculator needs. `expected-metrics.json` stays byte-identical.

- [ ] **Step 5.1: Verify the current DORA tests are green before editing**

Run:

```bash
bun test packages/gateway/test/integration/metrics/
```

Expected: all DORA integration tests pass on the pre-edit baseline. This is the comparison signal — after the fixture re-shape, these same tests must stay green.

If any test fails here, stop — the baseline is dirty.

- [ ] **Step 5.2: Replace the PagerDuty incident block in the fixture**

Open `packages/gateway/test/fixtures/dora/payment-service/seed.ts`. Two changes:

(a) Update the imports block at the top so it reads:

```ts
import type { Database } from "bun:sqlite";
import { silentSyncContextExtras } from "../../../../src/connectors/connector-sync-test-helpers.ts";
import { syncPagerdutyIncidentItems } from "../../../../src/connectors/pagerduty-sync.ts";
import { EMPTY_NIMBUS_VAULT } from "../../../../src/connectors/connector-sync-test-helpers.ts";
import type { DoraServiceConfig } from "../../../../src/metrics/dora-config.ts";
import { buildPagerdutyIncident } from "../../pagerduty/build-incident.ts";
```

(b) Change the signature of `seedPaymentServiceFixture` from `(db)` to `async (db)`, then replace the entire `// --- PagerDuty incidents` block (currently lines 193–234) with:

```ts
  // ---------------------------------------------------------------------------
  // PagerDuty incidents: 4 total (3 inside CFR window, 1 outside)
  // ---------------------------------------------------------------------------
  // Flow built incidents through the production parser so the DORA calculator
  // sees what syncPagerdutyIncidentItems would actually produce in prod.
  const pdIncidents: unknown[] = [];
  for (let i = 0; i < 3; i++) {
    const deployAt = FIXTURE_NOW_MS - 5 * DAY - i * 2 * DAY;
    const openedAt = deployAt + 10 * 60_000;
    const resolvedAt = openedAt + (20 + i * 5) * 60_000;
    pdIncidents.push(
      buildPagerdutyIncident({
        id: `inc_${i}`,
        title: `Incident ${i}`,
        createdAt: new Date(openedAt).toISOString(),
        updatedAt: new Date(resolvedAt).toISOString(),
        status: "resolved",
        serviceId: "P12ABCD",
        priorityName: "P1",
      }),
    );
  }
  const outsideOpened = FIXTURE_NOW_MS - 7 * DAY - 90 * 60_000;
  const outsideResolved = outsideOpened + 30 * 60_000;
  pdIncidents.push(
    buildPagerdutyIncident({
      id: "inc_outside",
      title: "Late alert",
      createdAt: new Date(outsideOpened).toISOString(),
      updatedAt: new Date(outsideResolved).toISOString(),
      status: "resolved",
      serviceId: "P12ABCD",
      priorityName: "P1",
    }),
  );

  syncPagerdutyIncidentItems(
    { db, vault: EMPTY_NIMBUS_VAULT, ...silentSyncContextExtras() },
    pdIncidents,
    new Date(FIXTURE_NOW_MS - 30 * DAY).toISOString(),
    FIXTURE_NOW_MS,
  );
```

The `synced_at` value historically defaulted to `row.modified_at`, but the production parser uses the `now` argument (here `FIXTURE_NOW_MS`). This is the only behavioral difference — DORA's `selectResolvedIncidents` does not key on `synced_at` so the computation is unaffected. Update `expected-metrics.json` if any per-incident `synced_at` was ever asserted (verify in Step 5.3).

- [ ] **Step 5.3: Update any DORA test that calls `seedPaymentServiceFixture(db)` to `await` it**

Run:

```bash
grep -rn "seedPaymentServiceFixture(" packages/gateway/test
```

For every call site, ensure it is `await seedPaymentServiceFixture(db)`. If a call site is not inside an `async` function, mark the function `async`. Bun's test API supports async beforeEach / test handlers natively.

- [ ] **Step 5.4: Run the DORA integration tests**

Run:

```bash
bun test packages/gateway/test/integration/metrics/
```

Expected: same passing count as Step 5.1. If a test fails:

- Compare the failing expectation against the pre-edit value. Most failures will be a `synced_at` drift; if so, fix the expectation in the same commit since the production parser is the truth source.
- If MTTR / CFR numbers shifted, that's a real regression — open the production code and verify `selectResolvedIncidents` still reads `opened_at_ms` / `pagerduty_service_id` correctly.

- [ ] **Step 5.5: Commit**

```bash
git add packages/gateway/test/fixtures/dora/payment-service/seed.ts
git add packages/gateway/test/integration/metrics/  # if any test call site touched
git commit -m "$(cat <<'EOF'
test(dora): thread PagerDuty fixture rows through production parser

Builds the four payment-service fixture incidents as PagerDuty REST
API rows via buildPagerdutyIncident, then calls
syncPagerdutyIncidentItems instead of hand-shaping metadata at the
SQL boundary. The DORA calculator now exercises the exact pipeline
production uses; an accidental field-name drift in the parser
would fail the integration tests.

expected-metrics.json unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — Re-shape Preflight fixture (+ lock in strict-P1 exclusion)

**Files:**

- Modify: `packages/gateway/test/fixtures/preflight/payment-service/seed.ts`

Same pattern as Task 5. Additionally introduces one new incident with `priority: null` to prove the strict-`"P1"` filter excludes it — this is the new contract the spec §6 row 1 commits to.

- [ ] **Step 6.1: Verify the current preflight tests are green**

Run:

```bash
bun test packages/gateway/test/integration/preflight/
```

Expected: all green.

- [ ] **Step 6.2: Replace the PagerDuty incident block in the fixture**

Open `packages/gateway/test/fixtures/preflight/payment-service/seed.ts`. Update the imports block at the top:

```ts
import type { Database } from "bun:sqlite";
import {
  EMPTY_NIMBUS_VAULT,
  silentSyncContextExtras,
} from "../../../../src/connectors/connector-sync-test-helpers.ts";
import { syncPagerdutyIncidentItems } from "../../../../src/connectors/pagerduty-sync.ts";
import type { ServiceConfig } from "../../../../src/metrics/dora-config.ts";
import { buildPagerdutyIncident } from "../../pagerduty/build-incident.ts";
```

Change the function signature from `(db)` to `async (db)`. Replace the two existing PagerDuty `ins(db, { ... })` calls (the `pagerduty:inc_active` + `pagerduty:inc_resolved` block, currently lines 53–83) with:

```ts
  // ---- Incidents ----
  // Flow built incidents through the production parser so the preflight
  // active-P1 check exercises the same pipeline production uses.
  const pdIncidents: unknown[] = [
    buildPagerdutyIncident({
      id: "inc_active",
      title: "DB connection pool exhausted",
      createdAt: new Date(now - 10 * MIN).toISOString(),
      updatedAt: new Date(now - 10 * MIN).toISOString(),
      status: "triggered",
      htmlUrl: "https://nimbus-agent.pagerduty.com/incidents/inc_active",
      serviceId: "P12ABCD",
      priorityName: "P1",
    }),
    buildPagerdutyIncident({
      id: "inc_resolved",
      title: "Old P1 (resolved)",
      createdAt: new Date(now - 2 * DAY - 30 * MIN).toISOString(),
      updatedAt: new Date(now - 2 * DAY).toISOString(),
      status: "resolved",
      serviceId: "P12ABCD",
      priorityName: "P1",
    }),
    // Strict-P1 exclusion case: triggered, urgent, on the right service, but
    // priority is null. Preflight must NOT count it as an active P1.
    buildPagerdutyIncident({
      id: "inc_no_priority",
      title: "Triggered without priority",
      createdAt: new Date(now - 5 * MIN).toISOString(),
      updatedAt: new Date(now - 5 * MIN).toISOString(),
      status: "triggered",
      serviceId: "P12ABCD",
      priorityName: null,
    }),
  ];

  syncPagerdutyIncidentItems(
    { db, vault: EMPTY_NIMBUS_VAULT, ...silentSyncContextExtras() },
    pdIncidents,
    new Date(now - 30 * DAY).toISOString(),
    now,
  );
```

The third incident is the new strict-P1 exclusion proof. The existing assertion that `result.activeP1.count === 1` will continue to hold (only `inc_active` qualifies).

- [ ] **Step 6.3: Update any preflight test that calls `seedPaymentServicePreflightFixture(db)` to `await` it**

Run:

```bash
grep -rn "seedPaymentServicePreflightFixture(" packages/gateway/test
```

For each call site: prepend `await`, mark the enclosing function `async`.

- [ ] **Step 6.4: Run the preflight integration tests**

Run:

```bash
bun test packages/gateway/test/integration/preflight/
```

Expected: all green (same count as Step 6.1, the new `inc_no_priority` row is excluded so no test count changes).

- [ ] **Step 6.5: Commit**

```bash
git add packages/gateway/test/fixtures/preflight/payment-service/seed.ts
git add packages/gateway/test/integration/preflight/  # if any test call site touched
git commit -m "$(cat <<'EOF'
test(preflight): thread PagerDuty fixture rows through production parser

Same pattern as the DORA fixture refactor: builds incidents as
PagerDuty REST API rows via buildPagerdutyIncident and calls
syncPagerdutyIncidentItems instead of hand-shaping metadata at
the SQL boundary.

Adds one new incident with priority: null on the right service in
triggered state — locks in the spec §6 row 1 contract that the
strict-P1 filter excludes unprioritised incidents.

result.activeP1.count remains 1 — only inc_active qualifies.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 — Flip roadmap line + append follow-up entries + update header status

**Files:**

- Modify: `docs/roadmap.md`

Two roadmap edits per spec §8.1 and one per §8.2.

- [ ] **Step 7.1: Locate the three edit sites**

Run:

```bash
grep -n "PagerDuty connector enrichment" docs/roadmap.md
grep -n "T4 PR 3b annotation" docs/roadmap.md
```

Expected:
- One `[ ] **PagerDuty connector enrichment**` line inside the T4 section (around line 569 on `main`; may have drifted by one or two).
- The `Last updated:` paragraph at line 7 mentions `T4 PR 3b annotation ✅`.

If either grep returns no match, stop — the roadmap has been re-numbered in a way the spec didn't anticipate.

- [ ] **Step 7.2: Flip the existing line**

Replace the existing `- [ ] **PagerDuty connector enrichment**` line and its body with:

```markdown
- [x] **PagerDuty connector enrichment** (2026-05-14, Phase 5 T4 wrap-up) — `pagerduty-sync.ts`
  now writes `metadata.opened_at_ms` (from `incident.created_at`),
  `metadata.pagerduty_service_id` (from `incident.service.id`), and
  `metadata.severity` (from strict `incident.priority?.name`) on every indexed
  `incident` row. DORA CFR/MTTR (PR 2) and Preflight active-P1 (PR 3a) now compute
  against real PagerDuty data; both surfaces previously returned `no_pagerduty_mapping` /
  zero findings in production. `initialSyncDepthDays` bumped 14 → 30 so a fresh install's
  first `nimbus metrics dora --since 30d` window is fully populated. No schema change, no
  migration — natural cursor re-sync overwrites pre-existing rows. Non-`"P1"` priority
  names (`"Critical"`, `"SEV-1"`) pass through verbatim; a future
  `[pagerduty].severity_strategy` config knob can map them to preflight's P1 filter if
  user demand emerges.
```

- [ ] **Step 7.3: Immediately after the flipped line, append two new `[ ]` follow-ups**

Insert these two bullets immediately after the line you just flipped, before the next existing roadmap item:

```markdown
- [ ] **PagerDuty sync pagination** — follow `has_more` on `GET /incidents` and walk pages
  until exhausted (or until a `[pagerduty].max_pages_per_sync` cap is hit). Today the sync
  fetches the first 50 incidents updated since the cursor and drops the tail. DORA accuracy
  for high-volume orgs depends on this. No new credentials.
- [ ] **`[pagerduty].severity_strategy` config knob** — let teams map non-`"P1"` priority
  names (`"Critical"`, `"SEV-1"`) to preflight's P1 filter; emit a `gap` note in
  `deploy.preflight` when the connector sees `urgency: "high"` incidents with no
  `priority.name`, so operators can self-diagnose silent-zero preflight results. Bundles
  the alias-map and urgency-gap-warning Gemini-CLI suggested separately in the
  enrichment review §2.2.
```

- [ ] **Step 7.4: Update the `Last updated:` header status line at line 7**

Find the substring `T4 PR 3b annotation ✅` in the long `Last updated:` paragraph (it appears once, near the front of the line). Replace it with:

```
T4 PR 3b annotation ✅ · T4 wrap-up: PagerDuty enrichment ✅ (2026-05-14)
```

- [ ] **Step 7.5: Run the doc-references audit so the new roadmap edits don't introduce broken links**

Run:

```bash
bun scripts/structure-audit/check-doc-references.ts --check
```

Expected: exits 0 (no new broken markdown links or backtick path references). If a link breaks, the most likely cause is a path you copied from the spec that doesn't exist — fix the link before committing.

- [ ] **Step 7.6: Commit**

```bash
git add docs/roadmap.md
git commit -m "$(cat <<'EOF'
docs(roadmap): close PagerDuty enrichment + open paging/severity-strategy follow-ups

- Flips `[ ] PagerDuty connector enrichment` to `[x]` with the 2026-05-14
  date and a full summary of the metadata fields enriched and the
  14 → 30 day cold-start window bump.
- Appends two tracked follow-ups (paging beyond first 50 incidents;
  `[pagerduty].severity_strategy` config knob + urgency-gap warning)
  so the Gemini-CLI review §2.1 and §2.2 deferrals stay visible.
- Updates the `Last updated:` header status line.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8 — Full CI parity check

**Files:** none.

The unit and integration suites green individually, but `bun run test:ci` exercises the coverage gates and structure audits. The two coverage gates this PR touches are:

- `bun run test:coverage:metrics` (≥80%) — DORA calculators + RPC; the re-shaped fixture must keep this gate green.
- `bun run test:coverage:preflight` (≥80%) — Preflight calculator + RPC + HTTP; same.

- [ ] **Step 8.1: Run the metrics coverage gate**

Run:

```bash
bun run test:coverage:metrics
```

Expected: passes the 80% line-coverage gate. If it dips, the most likely cause is the new `synced_at` value flowing into rows that previously had `synced_at === modifiedAt`; review whichever assertion fired and pin the new behaviour.

- [ ] **Step 8.2: Run the preflight coverage gate**

Run:

```bash
bun run test:coverage:preflight
```

Expected: passes the 80% line-coverage gate.

- [ ] **Step 8.3: Run the full CI parity sequence**

Run:

```bash
bun run test:ci
```

Expected: exits 0. This is the load-bearing check before opening the PR. If anything fails, fix it now — do not push.

- [ ] **Step 8.4: Run the lint check (biome) so the PR doesn't trip pr-quality on style**

Run:

```bash
bun run lint
```

Expected: exits 0. If style issues are reported, run `bun run lint:fix`, re-run `bun run lint`, then commit any auto-fixes as a separate `style: ...` commit.

- [ ] **Step 8.5: If any tail commits were needed in this task, recap the commit graph**

Run:

```bash
git log --oneline origin/main..HEAD
```

Expected: roughly six commits in the order: (Task 2) `test(pagerduty): TDD red`, (Task 3) `feat(pagerduty): enrich`, (Task 4) `test(pagerduty): build-incident helper`, (Task 5) `test(dora): thread fixture`, (Task 6) `test(preflight): thread fixture`, (Task 7) `docs(roadmap): close + follow-ups`. Plus the two pre-existing design + review-feedback commits.

---

## Task 9 — Push branch and open the PR

**Files:** none.

- [ ] **Step 9.1: Push the branch with upstream tracking**

Run:

```bash
git push -u origin dev/asafgolombek/phase-5-t4-pagerduty-enrichment
```

Expected: push succeeds; the branch is reported as tracking `origin/dev/asafgolombek/phase-5-t4-pagerduty-enrichment`.

- [ ] **Step 9.2: Open the PR with the spec-defined title + body**

Run:

```bash
gh pr create --title "feat(pagerduty): enrich incident metadata to unblock DORA + Preflight" --body "$(cat <<'EOF'
## Summary

- Enriches indexed PagerDuty incident `metadata` with `opened_at_ms`, `pagerduty_service_id`, and `severity` (strict `priority.name`) so DORA CFR/MTTR (T4 PR 2) and Preflight active-P1 (T4 PR 3a) compute against real data instead of silently returning `no_pagerduty_mapping`/zero findings.
- Bumps `initialSyncDepthDays` 14 → 30 so a fresh install's first `nimbus metrics dora --since 30d` window is fully populated (existing installs unaffected — cursor-bearing).
- Re-shapes both DORA + Preflight fixtures to thread API-shaped incidents through the production parser via a shared `buildPagerdutyIncident` helper, locking the connector contract in two integration test suites.

No schema change, no migration, no security-invariant touch. Closes the final open `[ ]` on the T4 roadmap line.

## Test plan

- [ ] `bun run test:ci` green locally (incl. `test:coverage:metrics` ≥80%, `test:coverage:preflight` ≥80%)
- [ ] `bun scripts/structure-audit/check-doc-references.ts --check` green
- [ ] `pr-quality` CI job green
- [ ] Visual review: spec §10 review-disposition table + roadmap follow-ups match the body of the PR

Spec: `docs/superpowers/specs/2026-05-14-phase-5-t4-pagerduty-enrichment-design.md`
Review-feedback: `docs/superpowers/specs/2026-05-14-phase-5-t4-pagerduty-enrichment-review-feedback.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: the PR URL is printed. Capture it and report it back to the user.

- [ ] **Step 9.3: Report the PR URL to the user**

Output the PR URL. No further action — the rest is review.

---

## Self-review (run after writing this plan, before handing back)

**Spec coverage check** — every spec section maps to a task:

| Spec section | Task |
|---|---|
| §3 architecture (single touchpoint) | Tasks 2 + 3 |
| §4.1 file changes | Tasks 2 / 3 / 5 / 6 / 7 |
| §4.2 new file | Task 4 |
| §5.2 three new metadata fields | Task 3 step 3.1 |
| §5.3 omit-vs-null rationale | Task 2 cases + Task 3 implementation |
| §5.4 concrete diff incl. 14→30 | Task 3 step 3.1 |
| §6 edge case matrix | Task 2 cases 1–10 |
| §7.1 unit tests | Task 2 |
| §7.2 fixture re-shape | Tasks 4 + 5 + 6 |
| §7.3 coverage gates | Task 8 steps 8.1 + 8.2 |
| §8.1 roadmap edits | Task 7 |
| §8.2 follow-up rows | Task 7 step 7.3 |
| §8.4 commit/PR topology | Tasks 2 / 3 / 4 / 5 / 6 / 7 + Task 9 |
| §10 review disposition (FIX) | Task 3 (14→30) + Task 2 (window assertion) |

**Placeholder scan** — no `TBD`, `TODO`, `implement later`, "similar to Task N", `Add appropriate X`. Every step shows the actual code or command.

**Type / name consistency** — `syncPagerdutyIncidentItems` named identically in Tasks 2, 3, 5, 6. `buildPagerdutyIncident` identical in Tasks 4, 5, 6. `pdServiceId` / `pdPriorityName` only referenced in Task 3 (helpers stay private despite the export of the surrounding function — verified by grep at execution time).
