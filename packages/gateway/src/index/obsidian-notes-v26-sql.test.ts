import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { OBSIDIAN_NOTES_V26_SCHEMA_SQL } from "./obsidian-notes-v26-sql.ts";

test("V26 schema creates obsidian_notes with documented columns and indexes", () => {
  const db = new Database(":memory:");
  db.exec(OBSIDIAN_NOTES_V26_SCHEMA_SQL);
  const cols = db.query(`PRAGMA table_info(obsidian_notes)`).all() as Array<{ name: string }>;
  const names = new Set(cols.map((c) => c.name));
  for (const expected of [
    "id",
    "vault_id",
    "vault_name",
    "path",
    "title",
    "frontmatter_json",
    "tags_json",
    "wikilinks_json",
    "daily_note_date",
    "last_modified",
    "created_at",
  ]) {
    expect(names.has(expected)).toBe(true);
  }
  const indexes = db
    .query(`SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='obsidian_notes'`)
    .all() as Array<{ name: string }>;
  const idxNames = new Set(indexes.map((i) => i.name));
  expect(idxNames.has("idx_obsidian_notes_vault_path")).toBe(true);
  expect(idxNames.has("idx_obsidian_notes_daily_note_date")).toBe(true);
});

test("V26 vault_path index is queryable", () => {
  const db = new Database(":memory:");
  db.exec(OBSIDIAN_NOTES_V26_SCHEMA_SQL);
  db.run(
    `INSERT INTO obsidian_notes (id, vault_id, vault_name, path, title, frontmatter_json, tags_json, wikilinks_json, daily_note_date, last_modified, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ["obsidian:abc#notes/x.md", "abc", "MyVault", "notes/x.md", "x", "{}", "[]", "[]", null, 0, 0],
  );
  const row = db
    .query("SELECT id FROM obsidian_notes WHERE vault_id = ? AND path = ?")
    .get("abc", "notes/x.md") as { id: string } | null;
  expect(row?.id).toBe("obsidian:abc#notes/x.md");
});
