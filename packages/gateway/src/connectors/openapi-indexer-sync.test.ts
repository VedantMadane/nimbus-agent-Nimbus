import { expect, test } from "bun:test";
import { copyFileSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createMemoryIndexDb,
  EMPTY_NIMBUS_VAULT,
  syncTestContext,
  testConnectorSyncNoop,
} from "./connector-sync-test-helpers.ts";
import { DEFAULT_OPENAPI_CONFIG } from "./openapi-indexer-config.ts";
import { createOpenapiIndexerSyncable } from "./openapi-indexer-sync.ts";

const FIX = join(import.meta.dir, "..", "..", "test", "fixtures", "openapi");

testConnectorSyncNoop(
  "no-op when no roots configured",
  () => createOpenapiIndexerSyncable({ roots: [], config: DEFAULT_OPENAPI_CONFIG }),
  EMPTY_NIMBUS_VAULT,
);

test("indexes endpoints from a Petstore 3.0 spec under a configured root", async () => {
  const root = mkdtempSync(join(tmpdir(), "openapi-sync-"));
  copyFileSync(join(FIX, "petstore-3.0.yaml"), join(root, "openapi.yaml"));
  const sync = createOpenapiIndexerSyncable({
    roots: [
      {
        path: root,
        gitAware: false,
        codeIndex: false,
        dependencyGraph: false,
        exclude: [],
      },
    ],
    config: DEFAULT_OPENAPI_CONFIG,
  });
  const db = createMemoryIndexDb();
  const r = await sync.sync(syncTestContext(db, EMPTY_NIMBUS_VAULT), null);
  expect(r.itemsUpserted).toBe(2);
  const items = db
    .query("SELECT title, type, service FROM item WHERE service = 'openapi' ORDER BY title")
    .all() as Array<{ title: string; type: string; service: string }>;
  expect(items.length).toBe(2);
  for (const it of items) {
    expect(it.type).toBe("api_endpoint");
  }
  const shadow = db
    .query("SELECT method, path FROM api_endpoint ORDER BY method, path")
    .all() as Array<{ method: string; path: string }>;
  expect(shadow).toEqual([
    { method: "DELETE", path: "/pets/{id}" },
    { method: "GET", path: "/pets" },
  ]);
});

test("re-running with no file changes upserts zero items", async () => {
  const root = mkdtempSync(join(tmpdir(), "openapi-sync-delta-"));
  copyFileSync(join(FIX, "petstore-3.0.yaml"), join(root, "openapi.yaml"));
  const sync = createOpenapiIndexerSyncable({
    roots: [{ path: root, gitAware: false, codeIndex: false, dependencyGraph: false, exclude: [] }],
    config: DEFAULT_OPENAPI_CONFIG,
  });
  const db = createMemoryIndexDb();
  const ctx = syncTestContext(db, EMPTY_NIMBUS_VAULT);
  const first = await sync.sync(ctx, null);
  expect(first.itemsUpserted).toBe(2);
  const second = await sync.sync(ctx, first.cursor);
  expect(second.itemsUpserted).toBe(0);
  expect(second.itemsDeleted).toBe(0);
});

test("removing an endpoint from a re-parsed spec deletes it; unchanged specs preserve their endpoints", async () => {
  const root = mkdtempSync(join(tmpdir(), "openapi-sync-sticky-"));
  copyFileSync(join(FIX, "petstore-3.0.yaml"), join(root, "openapi.yaml"));
  // swagger.yaml matches SPEC_FILENAME_RE so it is discovered alongside openapi.yaml.
  copyFileSync(join(FIX, "petstore-3.1.yaml"), join(root, "swagger.yaml"));
  const sync = createOpenapiIndexerSyncable({
    roots: [{ path: root, gitAware: false, codeIndex: false, dependencyGraph: false, exclude: [] }],
    config: DEFAULT_OPENAPI_CONFIG,
  });
  const db = createMemoryIndexDb();
  const ctx = syncTestContext(db, EMPTY_NIMBUS_VAULT);
  const first = await sync.sync(ctx, null);
  expect(first.itemsUpserted).toBe(3);

  // Rewrite openapi.yaml to remove the DELETE endpoint, bump mtime.
  writeFileSync(
    join(root, "openapi.yaml"),
    `openapi: 3.0.0
info: { title: Petstore API, version: 1.0.0 }
paths:
  /pets:
    get:
      operationId: listPets
      responses: { "200": { description: ok } }
`,
  );
  const future = new Date(Date.now() + 60_000);
  utimesSync(join(root, "openapi.yaml"), future, future);

  const second = await sync.sync(ctx, first.cursor);
  expect(second.itemsDeleted).toBe(1);
  const remaining = db.query("SELECT method FROM api_endpoint ORDER BY method").all() as Array<{
    method: string;
  }>;
  expect(remaining.map((r) => r.method).sort()).toEqual(["GET", "GET"]);
});
