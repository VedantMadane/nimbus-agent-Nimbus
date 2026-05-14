import type { Database } from "bun:sqlite";
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
