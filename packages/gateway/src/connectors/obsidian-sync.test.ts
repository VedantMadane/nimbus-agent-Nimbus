import { expect, test } from "bun:test";
import { join } from "node:path";
import {
  createMemoryIndexDb,
  EMPTY_NIMBUS_VAULT,
  syncTestContext,
  testConnectorSyncNoop,
} from "./connector-sync-test-helpers.ts";
import { createObsidianSyncable } from "./obsidian-sync.ts";

const FIXTURE_ROOT = join(import.meta.dir, "..", "..", "test", "fixtures", "obsidian");

testConnectorSyncNoop(
  "no-op when no roots configured",
  () => createObsidianSyncable({ roots: [] }),
  EMPTY_NIMBUS_VAULT,
);

test("indexes notes from a fixture vault root", async () => {
  const sync = createObsidianSyncable({
    roots: [
      {
        path: FIXTURE_ROOT,
        gitAware: false,
        codeIndex: false,
        dependencyGraph: false,
        exclude: [],
      },
    ],
  });
  const db = createMemoryIndexDb();
  const r = await sync.sync(syncTestContext(db, EMPTY_NIMBUS_VAULT), null);
  expect(r.itemsUpserted).toBeGreaterThanOrEqual(10);
  const items = db
    .query("SELECT title, type, service FROM item WHERE service = 'obsidian'")
    .all() as Array<{ title: string; type: string; service: string }>;
  expect(items.length).toBeGreaterThanOrEqual(10);
  for (const it of items) {
    expect(it.type).toBe("obsidian_note");
  }
  const shadow = db
    .query("SELECT path, daily_note_date FROM obsidian_notes ORDER BY path")
    .all() as Array<{ path: string; daily_note_date: string | null }>;
  // The Daily/2026-05-10.md note has its dailyNoteDate set.
  const daily = shadow.find((s) => s.path === "Daily/2026-05-10.md");
  expect(daily?.daily_note_date).toBe("2026-05-10");
});
