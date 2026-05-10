import { expect, test } from "bun:test";
import { copyFileSync, mkdtempSync } from "node:fs";
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
