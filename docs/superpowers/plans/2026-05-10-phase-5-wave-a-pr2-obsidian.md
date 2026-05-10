# Phase 5 Wave A — PR 2: Obsidian Vault Connector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the Obsidian vault connector — a hybrid surface that indexes Markdown notes (`obsidian_note` items + backlink graph edges) via a gateway-side syncable, and exposes one HITL-gated write tool (`obsidian.note.append`) via a thin MCP package. PR 2 of Wave A in [the spec](../specs/2026-05-10-phase-5-wave-a-api-surface-obsidian-design.md).

**Architecture:** Two-surface design.

1. **Gateway-side syncable** (`obsidian-sync.ts`) — mirrors `filesystem-v2-sync.ts` and the OpenAPI indexer (PR 1). Walks `[[filesystem.roots]]`, treats any directory directly containing `.obsidian/` as a vault, parses every `.md` note (frontmatter + body + wikilinks), upserts `obsidian_note` items into `item` + the new `obsidian_notes` shadow table, and emits `obsidian_note → obsidian_note` `backlinks` edges into `graph_relation` for resolved wikilinks. V26 migration adds the shadow table.
2. **MCP package** (`packages/mcp-connectors/obsidian/`) — a thin Bun workspace package that mirrors `linear/`. Registers four tools: `obsidian_list`, `obsidian_get`, `obsidian_search` (read; query the local index file system directly via the same vault discovery), and `obsidian_append_to_daily_note` (write; gated by adding `obsidian.note.append` to `HITL_REQUIRED_BACKING` in `executor.ts`). The MCP server receives the vault paths as `OBSIDIAN_VAULT_PATHS_JSON` at spawn time — there is no remote API and no Vault-stored credential.

**Tech Stack:** Bun v1.2+ / TypeScript 6.x strict; `bun:sqlite`; `@modelcontextprotocol/sdk`; `zod`; `js-yaml` for frontmatter parsing; existing helpers `upsertIndexedItem`, `upsertGraphEntity`, `upsertGraphRelation`, `recordMigration`.

## Known limitations (explicitly accepted in PR 2)

These are documented here so reviewers don't re-flag them and so a future contributor can pick them up:

1. **Vault move re-issues all IDs.** `vault_id = sha256(absoluteVaultRootPath).slice(0, 12)`. Renaming or relocating a vault changes its absolute path, deletes every `obsidian_note` row at the old prefix, and re-emits them at the new prefix. Any user-attached metadata (manual pins, manual graph edges) is orphaned. Spec's Non-goal §8 mentions a future `nimbus connector obsidian remap-vault` migration command — out of scope here.
2. **Wikilink resolution is best-effort, not Obsidian-parity.** Resolution is exact filename match (case-insensitive) within the same vault, fallback to exact title match. Obsidian's full shortest-path / current-folder-priority algorithm is not replicated. Some ambiguous links will resolve differently than Obsidian's UI. Documented in the connector README.
3. **Daily-note format token subset.** Only `YYYY`, `YY`, `MM`, `DD`, `HH`, `mm` are honored from the Moment.js token set. Unknown tokens fall back to the default `YYYY-MM-DD` and emit a one-line sync-time warning. Locale-sensitive Moment patterns are deferred.
4. **Frontmatter `@mention` → `person` linking is not implemented.** Frontmatter is parsed and surfaced; tags + aliases land as first-class fields, but `@mention`-style values do not link to people-graph rows. (Spec Non-goal §6.)
5. **No symlink following.** The discovery walker matches `filesystem-v2-sync.ts` and the OpenAPI indexer: it never follows symlinks, both for loop-safety and for parity. If a user reports a need, an opt-in `[obsidian].follow_symlinks = true` can be added.
6. **Plugins, canvas, and database content are skipped.** Only `.md` files. (Spec Non-goal §3.)

## Spec adjustments — read before starting

Three small contradictions between the design spec and the actual codebase. The plan below uses the codebase convention; the design rows that conflict are listed here for transparency.

| Spec wording | Codebase convention | Plan choice |
|---|---|---|
| Action type `obsidian:appendToDailyNote` | Every entry in `HITL_REQUIRED_BACKING` is dot-separated (e.g., `notion.block.append`, `linear.issue.create`) | **`obsidian.note.append`** — same dotted shape. Mirrors the closest analog (`notion.block.append`). |
| `nimbus.extension.json declares hitlRequired: ["appendToDailyNote"]` | First-party connectors (linear, notion, slack, etc.) ship **no manifest file**. The HITL-gated set is enforced gateway-side via `HITL_REQUIRED_BACKING` in `executor.ts`. The "manifest" referenced in the connector-authoring skill is for community extensions (Plugin API v1). | **No manifest file.** HITL wiring lives in `executor.ts`. The MCP tool description includes `(requires HITL obsidian.note.append)` so a reader of the source sees the gating intent without grepping. |
| `Server handler calls server.assertHitlRequired() at handler top` | `assertHitlRequired` does not exist in the codebase or `@nimbus-dev/sdk`. It is only referenced in the connector-authoring skill and the design spec. | **Do not call it.** The HITL gate is fully gateway-side; the connector handler trusts that any call it receives has already been approved by `ToolExecutor.gate()`. |

These three are structural choices, not preferences — they keep the obsidian connector consistent with every other shipped first-party connector. If you disagree, raise it in the review pass before implementation, not mid-task.

---

## File Structure

**Created (gateway side):**
- `packages/gateway/src/index/obsidian-notes-v26-sql.ts` — V26 SQL constant exporting `OBSIDIAN_NOTES_V26_SCHEMA_SQL`.
- `packages/gateway/src/connectors/obsidian-sync.ts` — `createObsidianSyncable(options): Syncable`. Mirrors `openapi-indexer-sync.ts`: vault discovery, note parsing, mtime cursor, sticky deletes per vault, transactional per-note upsert.
- `packages/gateway/src/connectors/obsidian-discovery.ts` — pure (filesystem-only) walker producing the list of vault root directories (every directory containing `.obsidian/`) and the `.md` files under each.
- `packages/gateway/src/connectors/obsidian-parsing.ts` — pure parser: frontmatter extraction (via `js-yaml`), `# H1` title detection, wikilink extraction (`[[target]]`, `[[target#heading]]`, `[[target|alias]]`), daily-note date detection, and the wikilink resolver against an in-vault index.
- `packages/gateway/src/connectors/obsidian-daily-note.ts` — daily-note location resolver: parses `<vaultRoot>/.obsidian/daily-notes.json`, applies the supported token subset, falls back to `YYYY-MM-DD`.
- `packages/gateway/src/connectors/obsidian-vault-id.ts` — pure helper: `vaultIdFromAbsolutePath(p)` and `formatVaultName(p)` (basename of vault root).
- `packages/gateway/src/index/obsidian-notes-v26-sql.test.ts`
- `packages/gateway/src/index/migrations/runner-v26.test.ts`
- `packages/gateway/src/connectors/obsidian-sync.test.ts`
- `packages/gateway/src/connectors/obsidian-discovery.test.ts`
- `packages/gateway/src/connectors/obsidian-parsing.test.ts`
- `packages/gateway/src/connectors/obsidian-daily-note.test.ts`
- `packages/gateway/src/connectors/obsidian-vault-id.test.ts`
- `packages/gateway/test/fixtures/obsidian/` — fixture vault (≥10 notes, see Task 6).
- `packages/gateway/test/e2e/scenarios/obsidian-indexer.e2e.test.ts` — vault discovery + index query.
- `packages/gateway/test/e2e/scenarios/obsidian-hitl.e2e.test.ts` — HITL gate fires before file write; reject leaves file untouched.

**Created (MCP package):**
- `packages/mcp-connectors/obsidian/package.json`
- `packages/mcp-connectors/obsidian/tsconfig.json`
- `packages/mcp-connectors/obsidian/src/server.ts`

**Modified:**
- `packages/gateway/src/index/migrations/runner.ts` — import `OBSIDIAN_NOTES_V26_SCHEMA_SQL`, add `migrateIndexedV25ToV26`, append `{ fromVersion: 25, toVersion: 26, … }` to `INDEXED_SCHEMA_STEPS`, append the V26 backfill label.
- `packages/gateway/src/graph/relationship-graph.ts` — extend `ITEM_LINKED_ENTITY_TYPES` with `"obsidian_note"`.
- `packages/gateway/src/graph/graph-populator.ts` — add `syncObsidianNoteGraph` and dispatch from `syncGraphFromIndexedItem`.
- `packages/gateway/src/engine/executor.ts` — add `"obsidian.note.append"` to `HITL_REQUIRED_BACKING` (alphabetically near the `notion.*` block).
- `packages/gateway/src/connectors/lazy-mesh/keys.ts` — add `obsidian: "mesh:obsidian"` to `LAZY_MESH`.
- `packages/gateway/src/connectors/lazy-mesh/connector-spawns.ts` — export `ensureObsidianMcp(ctx)`; pass `OBSIDIAN_VAULT_PATHS_JSON` via `extensionProcessEnv`.
- `packages/gateway/src/connectors/lazy-mesh/mesh.ts` — wire `ensureObsidianMcp` into the same routing branch the other write-tool MCPs use (look up where `ensureLinearMcp` / `ensureNotionMcp` are invoked).
- `packages/gateway/src/connectors/registry.ts` — append the JSDoc registry comment row for the obsidian HITL mapping.
- `packages/gateway/src/platform/assemble.ts` — register `createObsidianSyncable` next to the OpenAPI indexer registration; gate on `fsV2Roots.length > 0`.
- `docs/architecture.md` — add `obsidian_notes` row to "Local Database Schema"; add the vault-move limitation note.
- `docs/roadmap.md` — flip the "Obsidian vault connector" line to `[x]`.
- `CLAUDE.md` — add three rows to "Key File Locations" (`obsidian-sync.ts`, `obsidian-notes-v26-sql.ts`, `packages/mcp-connectors/obsidian/`).

**Verified-untouched:**
- `docs/SECURITY-INVARIANTS.md` — §I2 describes the invariant generically without enumerating action types (verified at plan-write time). No edit; enforcement is automatic via the existing test.

---

## Task 0: Branch off main

**Files:**
- (none)

- [ ] **Step 1: Create the implementation branch from a fresh main**

```bash
git fetch origin main
git checkout -b dev/asafgolombek/phase-5-wave-a-pr2-obsidian origin/main
```

- [ ] **Step 2: Sanity check that nothing else is in flight on this branch**

Run: `git status`
Expected: `nothing to commit, working tree clean`. The branch starts at the same commit as `origin/main`.

- [ ] **Step 3: Confirm the existing test suite is green on this commit**

Run: `bun run typecheck`
Expected: zero errors.

(No commit — Task 0 is just branch hygiene. Skip if the branch already exists.)

---

## Task 1: V26 migration SQL

**Files:**
- Create: `packages/gateway/src/index/obsidian-notes-v26-sql.ts`
- Create: `packages/gateway/src/index/obsidian-notes-v26-sql.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/gateway/src/index/obsidian-notes-v26-sql.test.ts
import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
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

test("V26 vault_path index is unique and queryable", () => {
  const db = new Database(":memory:");
  db.exec(OBSIDIAN_NOTES_V26_SCHEMA_SQL);
  db.run(
    `INSERT INTO obsidian_notes (id, vault_id, vault_name, path, title, frontmatter_json, tags_json, wikilinks_json, daily_note_date, last_modified, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "obsidian:abc#notes/x.md",
      "abc",
      "MyVault",
      "notes/x.md",
      "x",
      "{}",
      "[]",
      "[]",
      null,
      0,
      0,
    ],
  );
  const row = db
    .query("SELECT id FROM obsidian_notes WHERE vault_id = ? AND path = ?")
    .get("abc", "notes/x.md") as { id: string } | null;
  expect(row?.id).toBe("obsidian:abc#notes/x.md");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/src/index/obsidian-notes-v26-sql.test.ts`
Expected: FAIL — module `./obsidian-notes-v26-sql.ts` not found.

- [ ] **Step 3: Implement the SQL constant**

```ts
// packages/gateway/src/index/obsidian-notes-v26-sql.ts
/**
 * V26 migration — `obsidian_notes` shadow table for the Obsidian vault
 * connector (Phase 5 Wave A PR 2). One row per indexed Markdown note,
 * keyed by the unified `item.id`. Append-only and additive — no backfill
 * needed; existing rows in `item` are unaffected.
 *
 * Body content lives in the standard `item` / `item_fts` tables (via
 * `upsertIndexedItem`); this shadow table holds structured metadata only.
 */
export const OBSIDIAN_NOTES_V26_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS obsidian_notes (
  id                TEXT PRIMARY KEY,
  vault_id          TEXT NOT NULL,
  vault_name        TEXT NOT NULL,
  path              TEXT NOT NULL,
  title             TEXT NOT NULL,
  frontmatter_json  TEXT NOT NULL DEFAULT '{}',
  tags_json         TEXT NOT NULL DEFAULT '[]',
  wikilinks_json    TEXT NOT NULL DEFAULT '[]',
  daily_note_date   TEXT,
  last_modified     INTEGER NOT NULL,
  created_at        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_obsidian_notes_vault_path
  ON obsidian_notes (vault_id, path);
CREATE INDEX IF NOT EXISTS idx_obsidian_notes_daily_note_date
  ON obsidian_notes (daily_note_date)
  WHERE daily_note_date IS NOT NULL;
`;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/gateway/src/index/obsidian-notes-v26-sql.test.ts`
Expected: 2 pass.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/index/obsidian-notes-v26-sql.ts packages/gateway/src/index/obsidian-notes-v26-sql.test.ts
git commit -m "feat(db): V26 schema for obsidian_notes shadow table"
```

---

## Task 2: Wire V26 into the migration runner

**Files:**
- Modify: `packages/gateway/src/index/migrations/runner.ts`
- Modify: `packages/gateway/src/index/local-index.ts` — bump `CURRENT_SCHEMA_VERSION` from `25` to `26`
- Create: `packages/gateway/src/index/migrations/runner-v26.test.ts`

The migration runner's public entry point is `runIndexedSchemaMigrations(db, targetVersion, backupOptions?)`, **not** `migrateIndexedDatabase(...)`. The canonical target version lives in `local-index.ts` as `CURRENT_SCHEMA_VERSION` and is re-exported as `LocalIndex.SCHEMA_VERSION`. Both must be bumped — failing to bump `CURRENT_SCHEMA_VERSION` means production DBs never receive the V26 migration on startup.

- [ ] **Step 1: Write the failing test (mirrors `runner-v25.test.ts`)**

```ts
// packages/gateway/src/index/migrations/runner-v26.test.ts
import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { runIndexedSchemaMigrations } from "./runner.ts";

describe("V26 migration — obsidian_notes shadow table", () => {
  test("running migrations on a fresh DB advances user_version to 26", () => {
    const db = new Database(":memory:");
    runIndexedSchemaMigrations(db, 26);
    const row = db.query("PRAGMA user_version").get() as { user_version: number };
    expect(row.user_version).toBe(26);
  });

  test("V26 records an applied row in _schema_migrations", () => {
    const db = new Database(":memory:");
    runIndexedSchemaMigrations(db, 26);
    const row = db
      .query("SELECT version, description, applied_at FROM _schema_migrations WHERE version = 26")
      .get() as { version: number; description: string; applied_at: number } | null;
    expect(row?.version).toBe(26);
    expect(row?.description).toContain("obsidian_notes");
    expect(row?.applied_at).toBeGreaterThan(0);
  });

  test("V26 creates the obsidian_notes table reachable by the migration runner", () => {
    const db = new Database(":memory:");
    runIndexedSchemaMigrations(db, 26);
    const cols = db.query("PRAGMA table_info(obsidian_notes)").all() as Array<{ name: string }>;
    expect(cols.length).toBeGreaterThan(0);
    const names = new Set(cols.map((c) => c.name));
    expect(names.has("id")).toBe(true);
    expect(names.has("vault_id")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/src/index/migrations/runner-v26.test.ts`
Expected: FAIL — `runIndexedSchemaMigrations(db, 26)` walks `INDEXED_SCHEMA_STEPS`, finds no `{ fromVersion: 25, toVersion: 26, … }` step, and `user_version` stays at `25`.

- [ ] **Step 3: Add the V26 step to the runner**

Edit `packages/gateway/src/index/migrations/runner.ts`:

Add the import alphabetically next to the existing `API_ENDPOINT_V25_SCHEMA_SQL` import line (~line 18):

```ts
import { OBSIDIAN_NOTES_V26_SCHEMA_SQL } from "../obsidian-notes-v26-sql.ts";
```

Add the migration function after `migrateIndexedV24ToV25` (~line 354):

```ts
function migrateIndexedV25ToV26(db: Database, now: number): void {
  db.transaction(() => {
    db.exec(OBSIDIAN_NOTES_V26_SCHEMA_SQL);
    db.exec("PRAGMA user_version = 26");
    recordMigration(db, 26, "obsidian_notes shadow table (Wave A PR 2)", now);
  })();
}
```

Append to `INDEXED_SCHEMA_STEPS` (after the `{ fromVersion: 24, toVersion: 25, … }` row):

```ts
  { fromVersion: 25, toVersion: 26, apply: migrateIndexedV25ToV26 },
```

Append to `BACKFILL_LABELS` (after the V25 entry):

```ts
  "obsidian_notes shadow table (Wave A PR 2) (backfilled)",
```

- [ ] **Step 4: Bump the canonical schema version**

Edit `packages/gateway/src/index/local-index.ts`. Change:

```ts
export const CURRENT_SCHEMA_VERSION = 25;
```

to:

```ts
export const CURRENT_SCHEMA_VERSION = 26;
```

This is the version that `LocalIndex.ensureSchema` passes to `runIndexedSchemaMigrations` on every Gateway startup. Without this bump, production DBs never advance to V26 even though the step exists.

- [ ] **Step 5: Run tests to verify**

Run: `bun test packages/gateway/src/index/migrations/runner-v26.test.ts packages/gateway/src/index/obsidian-notes-v26-sql.test.ts`
Expected: 5 pass (3 from this task + 2 from Task 1).

Run: `bun run typecheck`
Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/index/migrations/runner.ts packages/gateway/src/index/local-index.ts packages/gateway/src/index/migrations/runner-v26.test.ts
git commit -m "feat(db): register V26 migration in runner; bump CURRENT_SCHEMA_VERSION"
```

---

## Task 3: Vault-id helper

**Files:**
- Create: `packages/gateway/src/connectors/obsidian-vault-id.ts`
- Create: `packages/gateway/src/connectors/obsidian-vault-id.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/gateway/src/connectors/obsidian-vault-id.test.ts
import { expect, test } from "bun:test";
import { vaultIdFromAbsolutePath, formatVaultName } from "./obsidian-vault-id.ts";

test("vaultIdFromAbsolutePath is the first 12 hex of sha256(absolutePath)", () => {
  const id = vaultIdFromAbsolutePath("/Users/asaf/Documents/MyVault");
  expect(id.length).toBe(12);
  expect(/^[0-9a-f]{12}$/.test(id)).toBe(true);
});

test("vaultIdFromAbsolutePath is stable across calls for the same path", () => {
  const a = vaultIdFromAbsolutePath("/v");
  const b = vaultIdFromAbsolutePath("/v");
  expect(a).toBe(b);
});

test("vaultIdFromAbsolutePath differs across distinct paths", () => {
  expect(vaultIdFromAbsolutePath("/v")).not.toBe(vaultIdFromAbsolutePath("/w"));
});

test("formatVaultName returns the basename of the vault root path", () => {
  expect(formatVaultName("/Users/asaf/Documents/MyVault")).toBe("MyVault");
  expect(formatVaultName("/Users/asaf/Documents/MyVault/")).toBe("MyVault");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/src/connectors/obsidian-vault-id.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

```ts
// packages/gateway/src/connectors/obsidian-vault-id.ts
import { createHash } from "node:crypto";
import { basename } from "node:path";

/**
 * Stable, deterministic id for a vault, derived from the absolute root path.
 * Moving a vault re-issues all `obsidian_note` ids — that is by design (see
 * the plan's "Known limitations" §1).
 */
export function vaultIdFromAbsolutePath(absolutePath: string): string {
  return createHash("sha256").update(absolutePath).digest("hex").slice(0, 12);
}

/** Vault display name: basename of the vault root directory. */
export function formatVaultName(absolutePath: string): string {
  const trimmed = absolutePath.replace(/[/\\]+$/, "");
  return basename(trimmed);
}
```

- [ ] **Step 4: Run tests to verify**

Run: `bun test packages/gateway/src/connectors/obsidian-vault-id.test.ts`
Expected: 4 pass.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/connectors/obsidian-vault-id.ts packages/gateway/src/connectors/obsidian-vault-id.test.ts
git commit -m "feat(obsidian): vault-id helper from absolute path"
```

---

## Task 4: Discovery walker (vaults + .md files)

**Files:**
- Create: `packages/gateway/src/connectors/obsidian-discovery.ts`
- Create: `packages/gateway/src/connectors/obsidian-discovery.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/gateway/src/connectors/obsidian-discovery.test.ts
import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverVaults, discoverNotesInVault } from "./obsidian-discovery.ts";

function setupTree(): { root: string } {
  const root = mkdtempSync(join(tmpdir(), "obsidian-disc-"));
  // Top-level vault
  mkdirSync(join(root, "Vault1", ".obsidian"), { recursive: true });
  writeFileSync(join(root, "Vault1", "Welcome.md"), "# Welcome");
  mkdirSync(join(root, "Vault1", "subfolder"), { recursive: true });
  writeFileSync(join(root, "Vault1", "subfolder", "Nested.md"), "# Nested");
  // Nested vault inside Vault1 (supported, separate vault)
  mkdirSync(join(root, "Vault1", "Inner", ".obsidian"), { recursive: true });
  writeFileSync(join(root, "Vault1", "Inner", "InnerNote.md"), "# Inner");
  // node_modules and .git are ignored even if they contain a fake .obsidian dir
  mkdirSync(join(root, "node_modules", "junk", ".obsidian"), { recursive: true });
  writeFileSync(join(root, "node_modules", "junk", "Skip.md"), "# Skip");
  // A non-vault directory with .md files (no .obsidian) is not a vault
  mkdirSync(join(root, "Random"), { recursive: true });
  writeFileSync(join(root, "Random", "NotInVault.md"), "");
  return { root };
}

test("discoverVaults returns absolute paths of every directory containing .obsidian/", () => {
  const { root } = setupTree();
  const found = discoverVaults([root]);
  const rels = found.map((p) => p.replace(root, "").replaceAll("\\", "/"));
  expect(rels.includes("/Vault1")).toBe(true);
  expect(rels.includes("/Vault1/Inner")).toBe(true);
  for (const r of rels) {
    expect(r.includes("node_modules")).toBe(false);
  }
  expect(rels.some((r) => r === "/Random")).toBe(false);
});

test("discoverNotesInVault returns relative paths of all .md files under the vault root", () => {
  const { root } = setupTree();
  const notes = discoverNotesInVault(join(root, "Vault1")).map((p) =>
    p.replaceAll("\\", "/"),
  );
  expect(notes).toContain("Welcome.md");
  expect(notes).toContain("subfolder/Nested.md");
  // Notes inside the inner vault must not appear here — they belong to that vault
  expect(notes.some((p) => p.startsWith("Inner/"))).toBe(false);
  // Non-md files are skipped
  expect(notes.every((p) => p.endsWith(".md"))).toBe(true);
});

test("discoverNotesInVault skips .obsidian/ directory contents", () => {
  const { root } = setupTree();
  // Drop a .md file inside .obsidian to confirm it's filtered out.
  writeFileSync(join(root, "Vault1", ".obsidian", "ConfigNote.md"), "# nope");
  const notes = discoverNotesInVault(join(root, "Vault1"));
  expect(notes.some((p) => p.includes(".obsidian"))).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/src/connectors/obsidian-discovery.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the walker**

```ts
// packages/gateway/src/connectors/obsidian-discovery.ts
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const DEFAULT_IGNORED_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "target",
  ".next",
  "out",
  "vendor",
  ".cache",
]);

const VAULT_MARKER = ".obsidian";

function isDirectorySafe(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function readDirSafe(path: string): readonly string[] {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}

/**
 * Recursively finds every directory that directly contains a `.obsidian/`
 * marker. Walks each `[[filesystem.roots]]` root.
 *
 * Stops recursion into a directory once it is identified as a vault — but
 * the spec allows nested vaults: if a sub-directory of a vault itself
 * contains `.obsidian/`, that sub-directory is also returned. The walker
 * therefore continues into sub-directories of an identified vault, but
 * skips the inner `.obsidian/` directories themselves.
 */
export function discoverVaults(roots: readonly string[]): readonly string[] {
  const out: string[] = [];
  for (const root of roots) {
    walkForVaults(root, out);
  }
  return out;
}

function walkForVaults(dir: string, out: string[]): void {
  if (!isDirectorySafe(dir)) {
    return;
  }
  const entries = readDirSafe(dir);
  if (entries.includes(VAULT_MARKER) && isDirectorySafe(join(dir, VAULT_MARKER))) {
    out.push(dir);
  }
  for (const e of entries) {
    if (e === VAULT_MARKER) {
      continue;
    }
    if (DEFAULT_IGNORED_DIR_NAMES.has(e)) {
      continue;
    }
    const sub = join(dir, e);
    let isDir = false;
    try {
      const st = statSync(sub);
      isDir = st.isDirectory() && !st.isSymbolicLink();
    } catch {
      continue;
    }
    if (isDir) {
      walkForVaults(sub, out);
    }
  }
}

/**
 * Returns paths (vault-relative, forward-slashed) of every `.md` file
 * under `vaultRoot`, excluding any `.md` inside the vault's `.obsidian/`
 * directory and inside any nested-vault sub-directory.
 */
export function discoverNotesInVault(vaultRoot: string): readonly string[] {
  const out: string[] = [];
  walkForNotes(vaultRoot, vaultRoot, out);
  return out;
}

function walkForNotes(currentDir: string, vaultRoot: string, out: string[]): void {
  if (!isDirectorySafe(currentDir)) {
    return;
  }
  const entries = readDirSafe(currentDir);
  // If this directory is itself a nested vault (and not the root), stop here.
  if (
    currentDir !== vaultRoot &&
    entries.includes(VAULT_MARKER) &&
    isDirectorySafe(join(currentDir, VAULT_MARKER))
  ) {
    return;
  }
  for (const e of entries) {
    if (e === VAULT_MARKER) {
      continue;
    }
    if (DEFAULT_IGNORED_DIR_NAMES.has(e)) {
      continue;
    }
    const full = join(currentDir, e);
    let isDir = false;
    let isFile = false;
    try {
      const st = statSync(full);
      if (st.isSymbolicLink()) {
        continue;
      }
      isDir = st.isDirectory();
      isFile = st.isFile();
    } catch {
      continue;
    }
    if (isFile && full.toLowerCase().endsWith(".md")) {
      const rel = relative(vaultRoot, full).replaceAll("\\", "/");
      out.push(rel);
    } else if (isDir) {
      walkForNotes(full, vaultRoot, out);
    }
  }
}
```

- [ ] **Step 4: Run tests to verify**

Run: `bun test packages/gateway/src/connectors/obsidian-discovery.test.ts`
Expected: 3 pass.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/connectors/obsidian-discovery.ts packages/gateway/src/connectors/obsidian-discovery.test.ts
git commit -m "feat(obsidian): vault + note discovery walker"
```

---

## Task 5: Note parser — frontmatter, title, wikilinks, daily-note date

**Files:**
- Create: `packages/gateway/src/connectors/obsidian-parsing.ts`
- Create: `packages/gateway/src/connectors/obsidian-parsing.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/gateway/src/connectors/obsidian-parsing.test.ts
import { expect, test } from "bun:test";
import { parseNote, resolveWikilinks } from "./obsidian-parsing.ts";

test("parseNote extracts YAML frontmatter, body, H1 title, tags, aliases, wikilinks", () => {
  const md = `---
tags: [a, b]
aliases:
  - first-alias
  - second-alias
custom: foo
---
# Real Title
Some body text linking to [[Other Note]] and [[Page#Section|alias here]] and [[Unresolved]].
`;
  const out = parseNote("notes/x.md", md);
  expect(out.title).toBe("Real Title");
  expect(out.body).toContain("Some body text");
  expect(out.body.startsWith("---")).toBe(false);
  expect(out.frontmatter["custom"]).toBe("foo");
  expect(out.tags).toEqual(["a", "b"]);
  expect(out.aliases).toEqual(["first-alias", "second-alias"]);
  expect(out.wikilinks).toEqual(["Other Note", "Page", "Unresolved"]);
});

test("parseNote falls back to filename (without .md) when no H1 is present", () => {
  const out = parseNote("notes/MyNote.md", "no heading here\n");
  expect(out.title).toBe("MyNote");
});

test("parseNote tolerates missing frontmatter and empty body", () => {
  const out = parseNote("notes/Empty.md", "");
  expect(out.title).toBe("Empty");
  expect(out.body).toBe("");
  expect(out.frontmatter).toEqual({});
  expect(out.tags).toEqual([]);
  expect(out.aliases).toEqual([]);
  expect(out.wikilinks).toEqual([]);
});

test("parseNote tolerates malformed YAML — falls back to empty frontmatter and full body", () => {
  const md = `---
this is: not [valid yaml
---
body`;
  const out = parseNote("notes/x.md", md);
  expect(out.frontmatter).toEqual({});
  expect(out.tags).toEqual([]);
  expect(out.body).toBe("body");
});

test("parseNote detects daily-note date when filename matches YYYY-MM-DD.md", () => {
  expect(parseNote("Daily/2026-05-10.md", "").dailyNoteDate).toBe("2026-05-10");
  expect(parseNote("notes/MyNote.md", "").dailyNoteDate).toBe(undefined);
  expect(parseNote("Daily/2026-13-99.md", "").dailyNoteDate).toBe(undefined);
});

test("resolveWikilinks resolves by exact filename (case-insensitive), then by title; preserves unresolved as raw strings", () => {
  // index: filename -> { id, title }
  const idx = new Map<string, { id: string; title: string }>([
    ["other note.md", { id: "obsidian:abc#Other Note.md", title: "Other Note" }],
    ["page.md", { id: "obsidian:abc#Page.md", title: "Page" }],
    ["readme.md", { id: "obsidian:abc#README.md", title: "Hidden Title" }],
  ]);
  const titleIdx = new Map<string, string>([["hidden title", "obsidian:abc#README.md"]]);
  const out = resolveWikilinks(["Other Note", "Page", "Hidden Title", "Missing"], idx, titleIdx);
  expect(out.resolved).toEqual([
    "obsidian:abc#Other Note.md",
    "obsidian:abc#Page.md",
    "obsidian:abc#README.md",
  ]);
  expect(out.unresolved).toEqual(["Missing"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/src/connectors/obsidian-parsing.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Vet and add `js-yaml`**

Run: `bun run check-package js-yaml`
Expected: package exists, multiple maintainers, > 7 days old.

```bash
bun add --filter packages/gateway js-yaml @types/js-yaml
```

- [ ] **Step 4: Implement the parser**

```ts
// packages/gateway/src/connectors/obsidian-parsing.ts
import { basename } from "node:path";
import yaml from "js-yaml";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const H1_RE = /^#\s+(.+)$/m;
const WIKILINK_RE = /\[\[([^\]\n]+?)\]\]/g;
const DAILY_NOTE_RE = /^(\d{4})-(\d{2})-(\d{2})\.md$/;

export type ParsedNote = {
  /** Forward-slashed vault-relative path. */
  readonly relPath: string;
  readonly title: string;
  readonly body: string;
  readonly frontmatter: Record<string, unknown>;
  readonly tags: readonly string[];
  readonly aliases: readonly string[];
  /** Wikilink targets (raw strings — `Page`, not `[[Page]]`). Heading and alias parts stripped. */
  readonly wikilinks: readonly string[];
  /** ISO date string (YYYY-MM-DD) when the filename matches a daily-note pattern. */
  readonly dailyNoteDate: string | undefined;
};

function extractFrontmatterAndBody(source: string): { fm: Record<string, unknown>; body: string } {
  const m = FRONTMATTER_RE.exec(source);
  if (m === null) {
    return { fm: {}, body: source };
  }
  const yamlSrc = m[1] ?? "";
  let parsed: unknown;
  try {
    parsed = yaml.load(yamlSrc);
  } catch {
    parsed = null;
  }
  const fm =
    parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  return { fm, body: source.slice(m[0].length) };
}

function extractTitle(body: string, relPath: string): string {
  const h1 = H1_RE.exec(body);
  if (h1 !== null) {
    const trimmed = h1[1]?.trim();
    if (trimmed !== undefined && trimmed !== "") {
      return trimmed;
    }
  }
  return basename(relPath).replace(/\.md$/i, "");
}

function extractTags(fm: Record<string, unknown>): readonly string[] {
  const raw = fm["tags"];
  if (Array.isArray(raw)) {
    return raw.filter((t): t is string => typeof t === "string");
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    return [raw];
  }
  return [];
}

function extractAliases(fm: Record<string, unknown>): readonly string[] {
  const raw = fm["aliases"];
  if (Array.isArray(raw)) {
    return raw.filter((t): t is string => typeof t === "string");
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    return [raw];
  }
  return [];
}

function extractWikilinks(body: string): readonly string[] {
  const out: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = WIKILINK_RE.exec(body)) !== null) {
    const inner = match[1] ?? "";
    // Strip alias `|...` then heading `#...`
    const noAlias = inner.split("|")[0] ?? "";
    const target = noAlias.split("#")[0]?.trim() ?? "";
    if (target !== "") {
      out.push(target);
    }
  }
  return out;
}

function extractDailyNoteDate(relPath: string): string | undefined {
  const m = DAILY_NOTE_RE.exec(basename(relPath));
  if (m === null) {
    return undefined;
  }
  const [, y, mo, d] = m;
  if (y === undefined || mo === undefined || d === undefined) {
    return undefined;
  }
  const month = Number.parseInt(mo, 10);
  const day = Number.parseInt(d, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return undefined;
  }
  return `${y}-${mo}-${d}`;
}

export function parseNote(relPath: string, source: string): ParsedNote {
  const { fm, body } = extractFrontmatterAndBody(source);
  return {
    relPath: relPath.replaceAll("\\", "/"),
    title: extractTitle(body, relPath),
    body,
    frontmatter: fm,
    tags: extractTags(fm),
    aliases: extractAliases(fm),
    wikilinks: extractWikilinks(body),
    dailyNoteDate: extractDailyNoteDate(relPath),
  };
}

/**
 * Resolves wikilink targets to note ids by exact filename (case-insensitive)
 * first, then by exact title (case-insensitive). Best-effort — does not
 * replicate Obsidian's full shortest-path resolver.
 *
 * @param targets raw wikilink targets (without `[[`/`]]`, alias, or heading)
 * @param byFilenameLower map of `<lowercased filename including .md>` → `{ id, title }`
 * @param byTitleLower map of `<lowercased title>` → `id`
 */
export function resolveWikilinks(
  targets: readonly string[],
  byFilenameLower: ReadonlyMap<string, { id: string; title: string }>,
  byTitleLower: ReadonlyMap<string, string>,
): { resolved: readonly string[]; unresolved: readonly string[] } {
  const resolved: string[] = [];
  const unresolved: string[] = [];
  for (const t of targets) {
    const lc = t.toLowerCase();
    const byFn = byFilenameLower.get(lc) ?? byFilenameLower.get(`${lc}.md`);
    if (byFn !== undefined) {
      resolved.push(byFn.id);
      continue;
    }
    const byTitle = byTitleLower.get(lc);
    if (byTitle !== undefined) {
      resolved.push(byTitle);
      continue;
    }
    unresolved.push(t);
  }
  return { resolved, unresolved };
}
```

- [ ] **Step 5: Run tests to verify**

Run: `bun test packages/gateway/src/connectors/obsidian-parsing.test.ts`
Expected: 6 pass.

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/connectors/obsidian-parsing.ts packages/gateway/src/connectors/obsidian-parsing.test.ts packages/gateway/package.json bun.lock
git commit -m "feat(obsidian): note parser (frontmatter, title, wikilinks, daily-note)"
```

---

## Task 6: Add fixture vault

**Files:**
- Create: `packages/gateway/test/fixtures/obsidian/MyVault/.obsidian/.gitkeep`
- Create: `packages/gateway/test/fixtures/obsidian/MyVault/Welcome.md`
- Create: `packages/gateway/test/fixtures/obsidian/MyVault/Subfolder/Nested.md`
- Create: `packages/gateway/test/fixtures/obsidian/MyVault/CodeOnly.md`
- Create: `packages/gateway/test/fixtures/obsidian/MyVault/Empty.md`
- Create: `packages/gateway/test/fixtures/obsidian/MyVault/UnresolvedLink.md`
- Create: `packages/gateway/test/fixtures/obsidian/MyVault/HeadingLink.md`
- Create: `packages/gateway/test/fixtures/obsidian/MyVault/AliasLink.md`
- Create: `packages/gateway/test/fixtures/obsidian/MyVault/Frontmatter.md`
- Create: `packages/gateway/test/fixtures/obsidian/MyVault/Daily/2026-05-10.md`

- [ ] **Step 1: Create the `.obsidian` marker directory**

Drop a placeholder so the directory is committable:

```bash
mkdir -p packages/gateway/test/fixtures/obsidian/MyVault/.obsidian
```

```text
# packages/gateway/test/fixtures/obsidian/MyVault/.obsidian/.gitkeep
(empty file)
```

- [ ] **Step 2: Create the 10 fixture notes**

```markdown
<!-- packages/gateway/test/fixtures/obsidian/MyVault/Welcome.md -->
---
tags: [welcome, tutorial]
aliases:
  - landing
---
# Welcome
This is the entry point. See [[Frontmatter]] and [[Subfolder/Nested]] and [[Daily/2026-05-10|Today]].
```

```markdown
<!-- packages/gateway/test/fixtures/obsidian/MyVault/Subfolder/Nested.md -->
# Nested
A note in a subfolder. Links back to [[Welcome]].
```

```markdown
<!-- packages/gateway/test/fixtures/obsidian/MyVault/CodeOnly.md -->
# Code Only

```ts
const x = 1;
```

(Body deliberately mostly code — exercises the parser on dense code blocks.)
```

```markdown
<!-- packages/gateway/test/fixtures/obsidian/MyVault/Empty.md -->
```

```markdown
<!-- packages/gateway/test/fixtures/obsidian/MyVault/UnresolvedLink.md -->
# Unresolved Link
Points at [[ThisDoesNotExist]] and [[NeverMade]] for unresolved-wikilink coverage.
```

```markdown
<!-- packages/gateway/test/fixtures/obsidian/MyVault/HeadingLink.md -->
# Heading Link
This links to [[Welcome#tutorial]] using a heading anchor.
```

```markdown
<!-- packages/gateway/test/fixtures/obsidian/MyVault/AliasLink.md -->
# Alias Link
This links to [[Welcome|Start Here]] using an alias.
```

```markdown
<!-- packages/gateway/test/fixtures/obsidian/MyVault/Frontmatter.md -->
---
tags:
  - reference
  - api
custom_field: "important"
---
# Frontmatter
Heavy frontmatter; pure metadata fixture.
```

```markdown
<!-- packages/gateway/test/fixtures/obsidian/MyVault/Daily/2026-05-10.md -->
# 2026-05-10
A daily note.
```

(That is 9 notes; add one more empty-frontmatter file to round to 10:)

```markdown
<!-- packages/gateway/test/fixtures/obsidian/MyVault/Plain.md -->
A plain note with no H1 — title should fall back to the filename (`Plain`).
```

- [ ] **Step 3: Verify the fixture vault is well-formed**

Run: `ls packages/gateway/test/fixtures/obsidian/MyVault/`
Expected: includes `.obsidian/`, `Welcome.md`, `Subfolder/`, `Daily/`, and the rest of the 10 notes.

- [ ] **Step 4: Commit**

```bash
git add packages/gateway/test/fixtures/obsidian/
git commit -m "test(obsidian): fixture vault (10 notes, frontmatter, wikilinks, daily-note)"
```

---

## Task 7: Daily-note location resolver

**Files:**
- Create: `packages/gateway/src/connectors/obsidian-daily-note.ts`
- Create: `packages/gateway/src/connectors/obsidian-daily-note.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/gateway/src/connectors/obsidian-daily-note.test.ts
import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveDailyNotePath, formatDailyNoteFilename } from "./obsidian-daily-note.ts";

test("formatDailyNoteFilename handles the supported subset", () => {
  const d = new Date("2026-05-10T03:04:00Z");
  expect(formatDailyNoteFilename("YYYY-MM-DD", d)).toBe("2026-05-10");
  expect(formatDailyNoteFilename("YY-MM-DD", d)).toBe("26-05-10");
  expect(formatDailyNoteFilename("YYYY/MM/DD", d)).toBe("2026/05/10");
  expect(formatDailyNoteFilename("YYYY-MM-DD HH:mm", d)).toBe("2026-05-10 03:04");
});

test("formatDailyNoteFilename leaves unsupported tokens untouched", () => {
  const d = new Date("2026-05-10T03:04:00Z");
  expect(formatDailyNoteFilename("YYYY-MM-DD-dddd", d)).toBe("2026-05-10-dddd");
});

test("resolveDailyNotePath uses .obsidian/daily-notes.json folder + format when present", () => {
  const root = mkdtempSync(join(tmpdir(), "obsidian-dn-"));
  mkdirSync(join(root, ".obsidian"), { recursive: true });
  writeFileSync(
    join(root, ".obsidian", "daily-notes.json"),
    JSON.stringify({ folder: "Daily", format: "YYYY-MM-DD" }),
  );
  const d = new Date("2026-05-10T00:00:00Z");
  const out = resolveDailyNotePath(root, d);
  expect(out.relativePath.replaceAll("\\", "/")).toBe("Daily/2026-05-10.md");
  // Use forward slashes for the comparison; resolveDailyNotePath joins
  // with the platform separator but our assertion is platform-agnostic.
  expect(out.absolutePath.replaceAll("\\", "/").endsWith("Daily/2026-05-10.md")).toBe(true);
  expect(out.warning).toBe(undefined);
});

test("resolveDailyNotePath falls back to YYYY-MM-DD.md at the vault root when daily-notes.json missing", () => {
  const root = mkdtempSync(join(tmpdir(), "obsidian-dn-"));
  mkdirSync(join(root, ".obsidian"), { recursive: true });
  const d = new Date("2026-05-10T00:00:00Z");
  const out = resolveDailyNotePath(root, d);
  expect(out.relativePath).toBe("2026-05-10.md");
  expect(out.warning).toBe(undefined);
});

test("resolveDailyNotePath emits a warning when the JSON is malformed", () => {
  const root = mkdtempSync(join(tmpdir(), "obsidian-dn-"));
  mkdirSync(join(root, ".obsidian"), { recursive: true });
  writeFileSync(join(root, ".obsidian", "daily-notes.json"), "{not json");
  const d = new Date("2026-05-10T00:00:00Z");
  const out = resolveDailyNotePath(root, d);
  expect(out.relativePath).toBe("2026-05-10.md");
  expect(out.warning).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/src/connectors/obsidian-daily-note.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the resolver**

```ts
// packages/gateway/src/connectors/obsidian-daily-note.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SUPPORTED_TOKENS = ["YYYY", "YY", "MM", "DD", "HH", "mm"] as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatDailyNoteFilename(format: string, date: Date): string {
  // Use UTC components — daily notes don't depend on the user's locale at the
  // sync layer, and tests are deterministic this way.
  const replacements: Record<string, string> = {
    YYYY: String(date.getUTCFullYear()),
    YY: String(date.getUTCFullYear() % 100).padStart(2, "0"),
    MM: pad2(date.getUTCMonth() + 1),
    DD: pad2(date.getUTCDate()),
    HH: pad2(date.getUTCHours()),
    mm: pad2(date.getUTCMinutes()),
  };
  let out = format;
  for (const tok of SUPPORTED_TOKENS) {
    out = out.replaceAll(tok, replacements[tok] ?? "");
  }
  return out;
}

export type DailyNotePath = {
  /** Forward-slashed vault-relative path including `.md` suffix. */
  readonly relativePath: string;
  readonly absolutePath: string;
  readonly warning: string | undefined;
};

type DailyNotesConfig = { folder: string; format: string };

const DEFAULT_CONFIG: DailyNotesConfig = { folder: "", format: "YYYY-MM-DD" };

function readDailyNotesConfig(vaultRoot: string): {
  config: DailyNotesConfig;
  warning: string | undefined;
} {
  const path = join(vaultRoot, ".obsidian", "daily-notes.json");
  if (!existsSync(path)) {
    return { config: DEFAULT_CONFIG, warning: undefined };
  }
  let raw = "";
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return { config: DEFAULT_CONFIG, warning: "could not read daily-notes.json" };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== "object") {
      return { config: DEFAULT_CONFIG, warning: "daily-notes.json is not an object" };
    }
    const obj = parsed as Record<string, unknown>;
    const folderRaw = obj["folder"];
    const formatRaw = obj["format"];
    const folder = typeof folderRaw === "string" ? folderRaw : "";
    const format = typeof formatRaw === "string" && formatRaw !== "" ? formatRaw : "YYYY-MM-DD";
    return { config: { folder, format }, warning: undefined };
  } catch {
    return { config: DEFAULT_CONFIG, warning: "daily-notes.json is malformed JSON" };
  }
}

export function resolveDailyNotePath(vaultRoot: string, date: Date): DailyNotePath {
  const { config, warning } = readDailyNotesConfig(vaultRoot);
  const filename = `${formatDailyNoteFilename(config.format, date)}.md`;
  const rel = config.folder === "" ? filename : `${config.folder.replace(/[/\\]+$/, "")}/${filename}`;
  return {
    relativePath: rel,
    absolutePath: join(vaultRoot, rel),
    warning,
  };
}
```

- [ ] **Step 4: Run tests to verify**

Run: `bun test packages/gateway/src/connectors/obsidian-daily-note.test.ts`
Expected: 5 pass.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/connectors/obsidian-daily-note.ts packages/gateway/src/connectors/obsidian-daily-note.test.ts
git commit -m "feat(obsidian): daily-note location resolver"
```

---

## Task 8: Add `obsidian_note` to graph entity types

**Files:**
- Modify: `packages/gateway/src/graph/relationship-graph.ts`
- Create: `packages/gateway/src/graph/relationship-graph-obsidian.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/gateway/src/graph/relationship-graph-obsidian.test.ts
import { expect, test } from "bun:test";
import { isItemLinkedGraphType } from "./relationship-graph.ts";

test("obsidian_note is a recognised item-linked graph type", () => {
  expect(isItemLinkedGraphType("obsidian_note")).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/src/graph/relationship-graph-obsidian.test.ts`
Expected: FAIL — `obsidian_note` is not in `ITEM_LINKED_ENTITY_TYPES`.

- [ ] **Step 3: Add `"obsidian_note"` to the array**

Edit `packages/gateway/src/graph/relationship-graph.ts` lines 4–17. Append `"obsidian_note"` after `"code_symbol"` so the array becomes:

```ts
const ITEM_LINKED_ENTITY_TYPES = [
  "pr",
  "issue",
  "ci_run",
  "deployment",
  "alert",
  "message",
  "incident",
  "error_issue",
  "git_commit",
  "dependency",
  "api_endpoint",
  "code_symbol",
  "obsidian_note",
] as const;
```

- [ ] **Step 4: Run tests to verify**

Run: `bun test packages/gateway/src/graph/relationship-graph-obsidian.test.ts`
Expected: 1 pass.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/graph/relationship-graph.ts packages/gateway/src/graph/relationship-graph-obsidian.test.ts
git commit -m "feat(graph): register obsidian_note as item-linked entity type"
```

---

## Task 9: Graph populator — `syncObsidianNoteGraph`

**Files:**
- Modify: `packages/gateway/src/graph/graph-populator.ts`
- Create: `packages/gateway/src/graph/graph-populator-obsidian.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/gateway/src/graph/graph-populator-obsidian.test.ts
import { expect, test } from "bun:test";
import type { Database } from "bun:sqlite";
import { createMemoryIndexDb } from "../connectors/connector-sync-test-helpers.ts";
import { syncGraphFromIndexedItem } from "./graph-populator.ts";

function freshDb(): Database {
  // `createMemoryIndexDb` calls `LocalIndex.ensureSchema`, which runs every
  // migration up to `CURRENT_SCHEMA_VERSION` (bumped to 26 in Task 2).
  return createMemoryIndexDb();
}

test("syncObsidianNoteGraph upserts an obsidian_note entity and backlink edges from metadata", () => {
  const db = freshDb();
  const noteId = "obsidian:abc#Welcome.md";
  const linkedId = "obsidian:abc#Other.md";

  syncGraphFromIndexedItem(db, {
    id: linkedId,
    service: "obsidian",
    type: "obsidian_note",
    title: "Other",
    authorId: null,
    metadata: { vault_id: "abc", resolved_wikilink_ids: [] },
  });

  syncGraphFromIndexedItem(db, {
    id: noteId,
    service: "obsidian",
    type: "obsidian_note",
    title: "Welcome",
    authorId: null,
    metadata: { vault_id: "abc", resolved_wikilink_ids: [linkedId] },
  });

  const ents = db
    .query("SELECT type, external_id, label FROM graph_entity WHERE type = 'obsidian_note' ORDER BY external_id")
    .all() as Array<{ type: string; external_id: string; label: string }>;
  expect(ents.length).toBe(2);

  const rels = db
    .query("SELECT type FROM graph_relation")
    .all() as Array<{ type: string }>;
  expect(rels.some((r) => r.type === "backlinks")).toBe(true);
});

test("re-syncing a note replaces its outgoing backlink edges (no leak)", () => {
  const db = freshDb();
  const a = "obsidian:abc#A.md";
  const b = "obsidian:abc#B.md";
  const c = "obsidian:abc#C.md";

  // Seed B and C first.
  for (const id of [b, c]) {
    syncGraphFromIndexedItem(db, {
      id,
      service: "obsidian",
      type: "obsidian_note",
      title: id,
      authorId: null,
      metadata: { vault_id: "abc", resolved_wikilink_ids: [] },
    });
  }

  // First parse: A → B
  syncGraphFromIndexedItem(db, {
    id: a,
    service: "obsidian",
    type: "obsidian_note",
    title: "A",
    authorId: null,
    metadata: { vault_id: "abc", resolved_wikilink_ids: [b] },
  });

  // Second parse: A now → C (B removed)
  syncGraphFromIndexedItem(db, {
    id: a,
    service: "obsidian",
    type: "obsidian_note",
    title: "A",
    authorId: null,
    metadata: { vault_id: "abc", resolved_wikilink_ids: [c] },
  });

  const rels = db
    .query("SELECT from_id, to_id, type FROM graph_relation WHERE type = 'backlinks'")
    .all() as Array<{ from_id: string; to_id: string; type: string }>;
  // Exactly one backlinks edge survives, pointing A → C; the A → B edge is gone.
  expect(rels.length).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/src/graph/graph-populator-obsidian.test.ts`
Expected: FAIL — no graph entity is created and no relations are emitted.

- [ ] **Step 3: Implement `syncObsidianNoteGraph`**

Edit `packages/gateway/src/graph/graph-populator.ts`. Add this function after `syncApiEndpointGraph` (~line 183):

```ts
function syncObsidianNoteGraph(db: Database, row: IndexedItemGraphInput, now: number): void {
  const vaultId = stringField(row.metadata, "vault_id") ?? "unknown";
  const noteEntityId = upsertGraphEntity(db, {
    type: "obsidian_note",
    externalId: row.id,
    label: row.title,
    service: row.service,
    metadata: { vault_id: vaultId },
  });
  // Replace this note's outgoing edges atomically: clear all relations
  // touching the note, then re-emit the freshly-resolved backlink set.
  // (Edges where the deleted note is the *target* are pruned by the
  // sync handler when it cascades a note-delete — see Task 10.)
  clearRelationsTouchingEntity(db, noteEntityId);

  const resolved = row.metadata["resolved_wikilink_ids"];
  if (Array.isArray(resolved)) {
    for (const target of resolved) {
      if (typeof target !== "string" || target === "") {
        continue;
      }
      // Look up the target's graph entity id by its `external_id` (which is
      // the note's `item.id`). If the target hasn't been indexed yet the
      // edge is skipped — re-syncing once both notes are indexed creates it.
      const tgt = db
        .query(
          "SELECT id FROM graph_entity WHERE type = 'obsidian_note' AND external_id = ?",
        )
        .get(target) as { id: string } | null;
      if (tgt === null) {
        continue;
      }
      upsertGraphRelation(db, noteEntityId, tgt.id, "backlinks", now);
    }
  }
}
```

Add the dispatch in `syncGraphFromIndexedItem` after the `code_symbol` branch (~line 292):

```ts
  if (row.type === "code_symbol") {
    syncCodeSymbolGraph(db, row, now);
    return;
  }
  if (row.type === "obsidian_note") {
    syncObsidianNoteGraph(db, row, now);
  }
```

(Note: replace the existing trailing `if (row.type === "code_symbol") { syncCodeSymbolGraph(...) }` with the version above that adds an explicit `return` so the new `if` does not run after a code-symbol dispatch.)

- [ ] **Step 4: Run tests to verify**

Run: `bun test packages/gateway/src/graph/graph-populator-obsidian.test.ts`
Expected: 2 pass.

Run: `bun test packages/gateway/src/graph/`
Expected: every existing graph-populator test still passes.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/graph/graph-populator.ts packages/gateway/src/graph/graph-populator-obsidian.test.ts
git commit -m "feat(graph): syncObsidianNoteGraph emits backlink edges"
```

---

## Task 10: Sync handler skeleton — failing test

**Files:**
- Create: `packages/gateway/src/connectors/obsidian-sync.ts`
- Create: `packages/gateway/src/connectors/obsidian-sync.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/gateway/src/connectors/obsidian-sync.test.ts
import { expect, test } from "bun:test";
import {
  createMemoryIndexDb,
  EMPTY_NIMBUS_VAULT,
  syncTestContext,
  testConnectorSyncNoop,
} from "./connector-sync-test-helpers.ts";
import { createObsidianSyncable } from "./obsidian-sync.ts";

const FIXTURE_ROOT = new URL("../../test/fixtures/obsidian/", import.meta.url).pathname;

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/src/connectors/obsidian-sync.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the syncable**

```ts
// packages/gateway/src/connectors/obsidian-sync.ts
import type { Database } from "bun:sqlite";
import { readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

import type { NimbusFilesystemRootToml } from "../config/filesystem-toml.ts";
import { upsertIndexedItem } from "../index/item-store.ts";
import {
  type SyncContext,
  type SyncResult,
  type Syncable,
  syncNoopResult,
} from "../sync/types.ts";

import { discoverNotesInVault, discoverVaults } from "./obsidian-discovery.ts";
import { parseNote, resolveWikilinks } from "./obsidian-parsing.ts";
import { formatVaultName, vaultIdFromAbsolutePath } from "./obsidian-vault-id.ts";

const SERVICE_ID = "obsidian";
const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;
const INITIAL_SYNC_DEPTH_DAYS = 365;

export type ObsidianSyncableOptions = {
  roots: readonly NimbusFilesystemRootToml[];
};

type CursorState = { tip: number };

function decodeCursor(cursor: string | null): CursorState {
  if (cursor === null) {
    return { tip: 0 };
  }
  try {
    const parsed = JSON.parse(cursor) as { tip?: number };
    return { tip: typeof parsed.tip === "number" ? parsed.tip : 0 };
  } catch {
    return { tip: 0 };
  }
}

function encodeCursor(state: CursorState): string {
  return JSON.stringify(state);
}

function externalIdFor(vaultId: string, relPath: string): string {
  return `${vaultId}#${relPath}`;
}

function itemIdFor(vaultId: string, relPath: string): string {
  return `${SERVICE_ID}:${externalIdFor(vaultId, relPath)}`;
}

type IndexedNote = {
  itemId: string;
  vaultId: string;
  vaultName: string;
  vaultRoot: string;
  relPath: string;
  title: string;
  body: string;
  frontmatter: Record<string, unknown>;
  tags: readonly string[];
  aliases: readonly string[];
  rawWikilinks: readonly string[];
  dailyNoteDate: string | undefined;
  mtimeMs: number;
};

function upsertNote(
  db: Database,
  note: IndexedNote,
  resolvedWikilinkIds: readonly string[],
  syncedAt: number,
): void {
  upsertIndexedItem(db, {
    service: SERVICE_ID,
    type: "obsidian_note",
    externalId: externalIdFor(note.vaultId, note.relPath),
    title: note.title,
    bodyPreview: note.body.slice(0, 4096),
    modifiedAt: note.mtimeMs,
    metadata: {
      vault_id: note.vaultId,
      vault_name: note.vaultName,
      path: note.relPath,
      tags: note.tags,
      aliases: note.aliases,
      frontmatter: note.frontmatter,
      daily_note_date: note.dailyNoteDate ?? null,
      resolved_wikilink_ids: resolvedWikilinkIds,
    },
    syncedAt,
  });
  db.run(
    `INSERT INTO obsidian_notes (
      id, vault_id, vault_name, path, title, frontmatter_json, tags_json, wikilinks_json, daily_note_date, last_modified, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      vault_id = excluded.vault_id,
      vault_name = excluded.vault_name,
      path = excluded.path,
      title = excluded.title,
      frontmatter_json = excluded.frontmatter_json,
      tags_json = excluded.tags_json,
      wikilinks_json = excluded.wikilinks_json,
      daily_note_date = excluded.daily_note_date,
      last_modified = excluded.last_modified`,
    [
      note.itemId,
      note.vaultId,
      note.vaultName,
      note.relPath,
      note.title,
      JSON.stringify(note.frontmatter),
      JSON.stringify(note.tags),
      JSON.stringify(note.rawWikilinks),
      note.dailyNoteDate ?? null,
      note.mtimeMs,
      syncedAt,
    ],
  );
}

function deleteNotesAbsentFromVault(
  db: Database,
  vaultId: string,
  keepIds: ReadonlySet<string>,
): number {
  const existing = db
    .query("SELECT id FROM obsidian_notes WHERE vault_id = ?")
    .all(vaultId) as Array<{ id: string }>;
  let deleted = 0;
  for (const row of existing) {
    if (keepIds.has(row.id)) {
      continue;
    }
    db.run("DELETE FROM item WHERE id = ?", [row.id]);
    db.run("DELETE FROM obsidian_notes WHERE id = ?", [row.id]);
    // Cascade: also drop graph relations pointing at the deleted note.
    db.run(
      `DELETE FROM graph_relation
       WHERE from_id IN (SELECT id FROM graph_entity WHERE type = 'obsidian_note' AND external_id = ?)
          OR to_id   IN (SELECT id FROM graph_entity WHERE type = 'obsidian_note' AND external_id = ?)`,
      [row.id, row.id],
    );
    db.run(
      "DELETE FROM graph_entity WHERE type = 'obsidian_note' AND external_id = ?",
      [row.id],
    );
    deleted++;
  }
  return deleted;
}

export function createObsidianSyncable(options: ObsidianSyncableOptions): Syncable {
  return {
    serviceId: SERVICE_ID,
    defaultIntervalMs: DEFAULT_INTERVAL_MS,
    initialSyncDepthDays: INITIAL_SYNC_DEPTH_DAYS,
    async sync(ctx: SyncContext, cursor: string | null): Promise<SyncResult> {
      const t0 = performance.now();
      if (options.roots.length === 0) {
        return syncNoopResult(cursor, t0);
      }
      await ctx.rateLimiter.acquire(SERVICE_ID);
      const state = decodeCursor(cursor);
      const now = Date.now();
      let upserted = 0;
      let deleted = 0;
      let nextTip = state.tip;

      const rootPaths = options.roots.map((r) => r.path);
      const vaults = discoverVaults(rootPaths);

      for (const vaultRoot of vaults) {
        const vaultId = vaultIdFromAbsolutePath(vaultRoot);
        const vaultName = formatVaultName(vaultRoot);
        const noteRelPaths = discoverNotesInVault(vaultRoot);

        // First pass — parse every note (cheap) so we can build the in-vault
        // wikilink index needed to resolve targets.
        const parsedNotes: IndexedNote[] = [];
        for (const rel of noteRelPaths) {
          const abs = join(vaultRoot, rel);
          let mtimeMs = 0;
          try {
            mtimeMs = statSync(abs).mtimeMs;
          } catch {
            continue;
          }
          let source = "";
          try {
            source = readFileSync(abs, "utf8");
          } catch {
            continue;
          }
          const parsed = parseNote(rel, source);
          parsedNotes.push({
            itemId: itemIdFor(vaultId, parsed.relPath),
            vaultId,
            vaultName,
            vaultRoot,
            relPath: parsed.relPath,
            title: parsed.title,
            body: parsed.body,
            frontmatter: parsed.frontmatter,
            tags: parsed.tags,
            aliases: parsed.aliases,
            rawWikilinks: parsed.wikilinks,
            dailyNoteDate: parsed.dailyNoteDate,
            mtimeMs,
          });
        }

        // Build the in-vault wikilink index — by lower-cased filename and by
        // lower-cased title.
        const byFilenameLower = new Map<string, { id: string; title: string }>();
        const byTitleLower = new Map<string, string>();
        for (const n of parsedNotes) {
          byFilenameLower.set(basename(n.relPath).toLowerCase(), { id: n.itemId, title: n.title });
          byTitleLower.set(n.title.toLowerCase(), n.itemId);
        }

        // Second pass — for each note, decide if it needs upserting (mtime
        // newer than cursor) and resolve its wikilinks against the index.
        // Per-vault transaction bounds DB round-trips and ensures sticky
        // deletes commit atomically with the upserts.
        const keepIds = new Set<string>();
        let perVaultDeleted = 0;
        ctx.db.transaction(() => {
          for (const n of parsedNotes) {
            keepIds.add(n.itemId);
            if (n.mtimeMs <= state.tip) {
              continue;
            }
            const { resolved } = resolveWikilinks(n.rawWikilinks, byFilenameLower, byTitleLower);
            upsertNote(ctx.db, n, resolved, now);
            upserted++;
            if (n.mtimeMs > nextTip) {
              nextTip = n.mtimeMs;
            }
          }
          perVaultDeleted = deleteNotesAbsentFromVault(ctx.db, vaultId, keepIds);
        })();
        deleted += perVaultDeleted;
      }

      return {
        cursor: encodeCursor({ tip: nextTip }),
        itemsUpserted: upserted,
        itemsDeleted: deleted,
        hasMore: false,
        durationMs: Math.round(performance.now() - t0),
      };
    },
  };
}
```

- [ ] **Step 4: Run tests to verify**

Run: `bun test packages/gateway/src/connectors/obsidian-sync.test.ts`
Expected: 2 pass.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/connectors/obsidian-sync.ts packages/gateway/src/connectors/obsidian-sync.test.ts
git commit -m "feat(obsidian): syncable that upserts obsidian_note items"
```

---

## Task 11: Mtime delta + sticky deletes

**Files:**
- Modify: `packages/gateway/src/connectors/obsidian-sync.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to the existing test file:

```ts
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function buildTempVault(): { root: string } {
  const root = mkdtempSync(join(tmpdir(), "obsidian-sync-tmp-"));
  mkdirSync(join(root, ".obsidian"), { recursive: true });
  writeFileSync(join(root, "A.md"), "# A\nlinks to [[B]]");
  writeFileSync(join(root, "B.md"), "# B\nback to [[A]]");
  return { root };
}

test("re-syncing with no file changes upserts zero items", async () => {
  const { root } = buildTempVault();
  const sync = createObsidianSyncable({
    roots: [{ path: root, gitAware: false, codeIndex: false, dependencyGraph: false, exclude: [] }],
  });
  const db = createMemoryIndexDb();
  const r1 = await sync.sync(syncTestContext(db, EMPTY_NIMBUS_VAULT), null);
  expect(r1.itemsUpserted).toBe(2);
  const r2 = await sync.sync(syncTestContext(db, EMPTY_NIMBUS_VAULT), r1.cursor);
  expect(r2.itemsUpserted).toBe(0);
});

test("touching a note re-emits only that note", async () => {
  const { root } = buildTempVault();
  const sync = createObsidianSyncable({
    roots: [{ path: root, gitAware: false, codeIndex: false, dependencyGraph: false, exclude: [] }],
  });
  const db = createMemoryIndexDb();
  const r1 = await sync.sync(syncTestContext(db, EMPTY_NIMBUS_VAULT), null);
  expect(r1.itemsUpserted).toBe(2);
  // Bump A.md mtime by 60 s
  const future = new Date(Date.now() + 60_000);
  utimesSync(join(root, "A.md"), future, future);
  const r2 = await sync.sync(syncTestContext(db, EMPTY_NIMBUS_VAULT), r1.cursor);
  expect(r2.itemsUpserted).toBe(1);
});

test("deleting a note removes its row on next sync (sticky delete)", async () => {
  const { root } = buildTempVault();
  const sync = createObsidianSyncable({
    roots: [{ path: root, gitAware: false, codeIndex: false, dependencyGraph: false, exclude: [] }],
  });
  const db = createMemoryIndexDb();
  const r1 = await sync.sync(syncTestContext(db, EMPTY_NIMBUS_VAULT), null);
  expect(r1.itemsUpserted).toBe(2);
  rmSync(join(root, "B.md"));
  const r2 = await sync.sync(syncTestContext(db, EMPTY_NIMBUS_VAULT), r1.cursor);
  expect(r2.itemsDeleted).toBe(1);
  const remaining = db
    .query("SELECT path FROM obsidian_notes ORDER BY path")
    .all() as Array<{ path: string }>;
  expect(remaining.map((r) => r.path)).toEqual(["A.md"]);
});
```

- [ ] **Step 2: Run tests to verify**

Run: `bun test packages/gateway/src/connectors/obsidian-sync.test.ts`
Expected: all 5 pass (the 2 from Task 10 plus these 3).

- [ ] **Step 3: Commit**

```bash
git add packages/gateway/src/connectors/obsidian-sync.test.ts
git commit -m "test(obsidian): mtime delta + sticky deletes"
```

---

## Task 12: Register the syncable in `assemble.ts`

**Files:**
- Modify: `packages/gateway/src/platform/assemble.ts`

- [ ] **Step 1: Read the current registration block**

Open `packages/gateway/src/platform/assemble.ts` and locate the `if (fsV2Roots.length > 0)` block around line 242–254 (the same block that registers `filesystem` and `openapi`).

- [ ] **Step 2: Add the obsidian registration**

Inside the same `if` block, after the OpenAPI registration:

```ts
    // Wave A PR 2 — gateway-side Obsidian vault indexer.
    localIndex.ensureConnectorSchedulerRegistration("obsidian", 10 * 60 * 1000, Date.now());
    syncScheduler.register(createObsidianSyncable({ roots: fsV2Roots }));
```

Add the import at the top of the file alongside the existing OpenAPI import:

```ts
import { createObsidianSyncable } from "../connectors/obsidian-sync.ts";
```

- [ ] **Step 3: Confirm typecheck still passes**

Run: `bun run typecheck`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add packages/gateway/src/platform/assemble.ts
git commit -m "feat(obsidian): wire syncable into platform assembler"
```

---

## Task 13: Add `obsidian.note.append` to `HITL_REQUIRED_BACKING`

**Files:**
- Modify: `packages/gateway/src/engine/executor.ts`
- Create: `packages/gateway/src/engine/hitl-obsidian.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/gateway/src/engine/hitl-obsidian.test.ts
import { expect, test } from "bun:test";
import { HITL_REQUIRED } from "./executor.ts";

test("obsidian.note.append is gated by HITL_REQUIRED", () => {
  expect(HITL_REQUIRED.has("obsidian.note.append")).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/src/engine/hitl-obsidian.test.ts`
Expected: FAIL — `obsidian.note.append` is not in the set.

- [ ] **Step 3: Add the entry**

Edit `packages/gateway/src/engine/executor.ts`. In `HITL_REQUIRED_BACKING` (lines 19–114), add `"obsidian.note.append"` immediately after the `"notion.comment.create"` entry (line ~46) so the file structure becomes:

```ts
  "notion.page.create",
  "notion.page.update",
  "notion.block.append",
  "notion.comment.create",
  "obsidian.note.append",
  "confluence.page.create",
```

(Alphabetical neighbours: `notion.*` then `obsidian.note.append` then `confluence.*` — the existing block is grouped by service rather than strictly alphabetised, so insertion adjacent to the closest write-tool peer is the convention.)

- [ ] **Step 4: Run tests to verify**

Run: `bun test packages/gateway/src/engine/hitl-obsidian.test.ts`
Expected: 1 pass.

Run: `bun test packages/gateway/src/security-invariants.test.ts`
Expected: every existing invariant test passes — in particular the I2 test (`HITL_REQUIRED is exported from a frozen Object.freeze façade` and `HITL_REQUIRED_BACKING is module-private`) is unchanged.

Run: `bun test packages/gateway/src/engine/`
Expected: the existing "every HITL_REQUIRED action type triggers the consent channel" test in `engine.test.ts` (or wherever it lives) automatically validates the new entry — no manual change needed.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/engine/executor.ts packages/gateway/src/engine/hitl-obsidian.test.ts
git commit -m "feat(hitl): add obsidian.note.append to HITL_REQUIRED"
```

---

## Task 14: MCP package skeleton — `package.json` and `tsconfig.json`

**Files:**
- Create: `packages/mcp-connectors/obsidian/package.json`
- Create: `packages/mcp-connectors/obsidian/tsconfig.json`
- Create: `packages/mcp-connectors/obsidian/src/.gitkeep` (placeholder so the directory commits)

- [ ] **Step 1: Verify the parent directory is correct**

Run: `ls packages/mcp-connectors/`
Expected: list includes `linear`, `notion`, `slack`, etc. — confirms the new `obsidian/` directory belongs alongside them.

- [ ] **Step 2: Create the package.json (mirrors `linear/package.json`)**

```json
{
  "name": "nimbus-mcp-obsidian",
  "version": "0.1.0",
  "private": false,
  "license": "AGPL-3.0-only",
  "type": "module",
  "bin": {
    "nimbus-mcp-obsidian": "./dist/server.js"
  },
  "scripts": {
    "dev": "bun run --watch src/server.ts",
    "build": "bun build src/server.ts --target bun --compile --outfile dist/nimbus-mcp-obsidian",
    "typecheck": "tsc --noEmit",
    "lint": "biome check src/",
    "test": "bun test",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "1.29.0",
    "@nimbus-dev/sdk": "workspace:*",
    "zod": "^4.4.2"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}
```

- [ ] **Step 3: Create the tsconfig.json (identical to `linear/tsconfig.json`)**

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["bun"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Install deps**

Run: `bun install`
Expected: workspace links the new package; no errors.

Run: `bun run typecheck`
Expected: no errors (the empty `src/` is allowed; `.gitkeep` is not a TS file).

- [ ] **Step 5: Commit**

```bash
git add packages/mcp-connectors/obsidian/package.json packages/mcp-connectors/obsidian/tsconfig.json packages/mcp-connectors/obsidian/src/.gitkeep bun.lock
git commit -m "feat(obsidian-mcp): scaffold workspace package"
```

---

## Task 15: MCP server — read tools (`list`, `get`, `search`)

**Files:**
- Create: `packages/mcp-connectors/obsidian/src/server.ts`

- [ ] **Step 1: Write the server with three read tools (no failing test — MCP servers' invariants are exercised by the gateway's HITL e2e in Task 17)**

```ts
// packages/mcp-connectors/obsidian/src/server.ts
/**
 * nimbus-mcp-obsidian — Obsidian vault MCP server.
 *
 * Vault paths are injected as OBSIDIAN_VAULT_PATHS_JSON (JSON array of
 * absolute paths). The server discovers `.obsidian/` markers within those
 * paths, parses Markdown notes on demand, and exposes:
 *
 *   - obsidian_list   (read)  — list notes, optionally filtered by vault or tag
 *   - obsidian_get    (read)  — read a single note by id or relative path
 *   - obsidian_search (read)  — substring search over note titles + bodies
 *   - obsidian_append_to_daily_note (write, HITL `obsidian.note.append`)
 *
 * Mutations require Gateway HITL — the gate fires before this server is
 * called. No assertHitlRequired() call is made here because that helper
 * does not exist in this codebase; the structural defense is in
 * packages/gateway/src/engine/executor.ts (HITL_REQUIRED_BACKING).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { z } from "zod";

import {
  createRegisterSimpleTool,
  createZodToolRegistrar,
  mcpJsonResult as jsonResult,
  requireProcessEnv,
} from "../../shared/mcp-tool-kit.ts";

const VAULT_MARKER = ".obsidian";
const DEFAULT_IGNORED_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "target",
  ".next",
  "out",
  "vendor",
  ".cache",
]);

function vaultIdFromAbsolutePath(absolutePath: string): string {
  return createHash("sha256").update(absolutePath).digest("hex").slice(0, 12);
}

/**
 * Reject any user-supplied path that escapes the vault. `vaultRoot` is
 * trusted (it came from OBSIDIAN_VAULT_PATHS_JSON, set by the gateway from
 * `[[filesystem.roots]]`). `relPath` is untrusted — caller could pass
 * `../../../etc/passwd`. Resolves both, asserts the candidate sits under
 * `vaultRoot + sep`. Throws on traversal.
 *
 * The HITL gate covers the write path; this guard covers the read path
 * (which is not gated) and adds defense-in-depth on the write path.
 */
function assertWithinVault(vaultRoot: string, relPath: string): string {
  const resolvedRoot = resolve(vaultRoot);
  const candidate = resolve(resolvedRoot, relPath);
  if (candidate !== resolvedRoot && !candidate.startsWith(resolvedRoot + sep)) {
    throw new Error(`Path escapes vault: ${relPath}`);
  }
  return candidate;
}

function loadVaultPaths(): readonly string[] {
  const raw = requireProcessEnv("OBSIDIAN_VAULT_PATHS_JSON");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("OBSIDIAN_VAULT_PATHS_JSON is not valid JSON");
  }
  if (!Array.isArray(parsed) || parsed.some((p) => typeof p !== "string")) {
    throw new Error("OBSIDIAN_VAULT_PATHS_JSON must be a JSON array of strings");
  }
  return parsed as string[];
}

function discoverVaults(roots: readonly string[]): readonly { id: string; root: string; name: string }[] {
  const out: { id: string; root: string; name: string }[] = [];
  for (const r of roots) {
    walkForVaults(r, out);
  }
  return out;
}

function walkForVaults(dir: string, out: { id: string; root: string; name: string }[]): void {
  let entries: readonly string[];
  try {
    if (!statSync(dir).isDirectory()) return;
    entries = readdirSync(dir);
  } catch {
    return;
  }
  if (entries.includes(VAULT_MARKER)) {
    out.push({ id: vaultIdFromAbsolutePath(dir), root: dir, name: basename(dir.replace(/[/\\]+$/, "")) });
  }
  for (const e of entries) {
    if (e === VAULT_MARKER || DEFAULT_IGNORED_DIR_NAMES.has(e)) continue;
    const sub = join(dir, e);
    let isDir = false;
    try {
      const st = statSync(sub);
      isDir = st.isDirectory() && !st.isSymbolicLink();
    } catch {
      continue;
    }
    if (isDir) walkForVaults(sub, out);
  }
}

function listNotesInVault(vaultRoot: string): readonly string[] {
  const out: string[] = [];
  walkNotes(vaultRoot, vaultRoot, out);
  return out;
}

function walkNotes(currentDir: string, vaultRoot: string, out: string[]): void {
  let entries: readonly string[];
  try {
    if (!statSync(currentDir).isDirectory()) return;
    entries = readdirSync(currentDir);
  } catch {
    return;
  }
  if (currentDir !== vaultRoot && entries.includes(VAULT_MARKER)) return;
  for (const e of entries) {
    if (e === VAULT_MARKER || DEFAULT_IGNORED_DIR_NAMES.has(e)) continue;
    const full = join(currentDir, e);
    let isFile = false;
    let isDir = false;
    try {
      const st = statSync(full);
      if (st.isSymbolicLink()) continue;
      isFile = st.isFile();
      isDir = st.isDirectory();
    } catch {
      continue;
    }
    if (isFile && full.toLowerCase().endsWith(".md")) {
      out.push(relative(vaultRoot, full).replaceAll("\\", "/"));
    } else if (isDir) {
      walkNotes(full, vaultRoot, out);
    }
  }
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const H1_RE = /^#\s+(.+)$/m;

function readNote(vaultRoot: string, relPath: string): { title: string; body: string; raw: string } {
  // Path-traversal guard. relPath may be user-controlled (`obsidian_get`).
  const abs = assertWithinVault(vaultRoot, relPath);
  const raw = readFileSync(abs, "utf8");
  const m = FRONTMATTER_RE.exec(raw);
  const body = m === null ? raw : raw.slice(m[0].length);
  const h1 = H1_RE.exec(body);
  const title =
    h1?.[1]?.trim() !== undefined && h1[1].trim() !== ""
      ? h1[1].trim()
      : basename(relPath).replace(/\.md$/i, "");
  return { title, body, raw };
}

function noteIdFor(vaultId: string, relPath: string): string {
  return `obsidian:${vaultId}#${relPath}`;
}

function findVaultByIdOrPathPrefix(
  vaults: readonly { id: string; root: string; name: string }[],
  needle: string,
): { id: string; root: string; name: string } | undefined {
  return vaults.find((v) => v.id === needle || v.root === needle);
}

const server = new McpServer({ name: "nimbus-obsidian", version: "0.1.0" });
const registerSimpleTool = createRegisterSimpleTool(server);
const reg = createZodToolRegistrar(registerSimpleTool);

const VAULTS = discoverVaults(loadVaultPaths());

// ---- read tools ----

const obsidianListSchema = z.object({
  vault: z.string().min(1).optional(),
  tag: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(500).optional(),
});

reg(
  "obsidian_list",
  "List Obsidian notes (optionally filtered by vault id, vault path, or frontmatter tag).",
  obsidianListSchema,
  async (parsed) => {
    const limit = parsed.limit ?? 200;
    const filterVault = parsed.vault !== undefined ? findVaultByIdOrPathPrefix(VAULTS, parsed.vault) : undefined;
    const targetVaults = filterVault === undefined ? VAULTS : [filterVault];
    const out: Array<{ id: string; vault_id: string; vault_name: string; path: string; title: string }> = [];
    for (const v of targetVaults) {
      for (const rel of listNotesInVault(v.root)) {
        if (out.length >= limit) break;
        const { title, raw } = readNote(v.root, rel);
        if (parsed.tag !== undefined) {
          // Crude tag check — passes when the literal tag string occurs in
          // the frontmatter block (full YAML semantic parsing happens in
          // the gateway syncable; the MCP tool surface stays small).
          const fm = FRONTMATTER_RE.exec(raw);
          if (fm === null || !fm[1]?.includes(parsed.tag)) continue;
        }
        out.push({
          id: noteIdFor(v.id, rel),
          vault_id: v.id,
          vault_name: v.name,
          path: rel,
          title,
        });
      }
    }
    return jsonResult(out);
  },
);

const obsidianGetSchema = z.object({
  id: z.string().min(1).optional(),
  vault: z.string().min(1).optional(),
  path: z.string().min(1).optional(),
});

reg(
  "obsidian_get",
  "Read a single Obsidian note by id, or by (vault, path) pair.",
  obsidianGetSchema,
  async (parsed) => {
    let v: { id: string; root: string; name: string } | undefined;
    let rel = "";
    if (parsed.id !== undefined) {
      const m = /^obsidian:([0-9a-f]{12})#(.+)$/.exec(parsed.id);
      if (m === null) {
        throw new Error(`Invalid obsidian id: ${parsed.id}`);
      }
      v = VAULTS.find((x) => x.id === m[1]);
      rel = m[2] ?? "";
    } else if (parsed.vault !== undefined && parsed.path !== undefined) {
      v = findVaultByIdOrPathPrefix(VAULTS, parsed.vault);
      rel = parsed.path;
    } else {
      throw new Error("obsidian_get requires either `id` or both `vault` and `path`");
    }
    if (v === undefined) {
      throw new Error("Vault not found in OBSIDIAN_VAULT_PATHS_JSON discovery");
    }
    const note = readNote(v.root, rel);
    return jsonResult({
      id: noteIdFor(v.id, rel),
      vault_id: v.id,
      vault_name: v.name,
      path: rel,
      title: note.title,
      body: note.body,
    });
  },
);

const obsidianSearchSchema = z.object({
  query: z.string().min(1),
  vault: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(200).optional(),
});

reg(
  "obsidian_search",
  "Substring-match against note title and body across all configured vaults.",
  obsidianSearchSchema,
  async (parsed) => {
    const limit = parsed.limit ?? 50;
    const needle = parsed.query.toLowerCase();
    const targets = parsed.vault !== undefined
      ? [findVaultByIdOrPathPrefix(VAULTS, parsed.vault)].filter((v): v is { id: string; root: string; name: string } => v !== undefined)
      : VAULTS;
    const out: Array<{ id: string; vault_id: string; path: string; title: string; snippet: string }> = [];
    outer: for (const v of targets) {
      for (const rel of listNotesInVault(v.root)) {
        if (out.length >= limit) break outer;
        const note = readNote(v.root, rel);
        const titleHit = note.title.toLowerCase().includes(needle);
        const bodyHitIdx = note.body.toLowerCase().indexOf(needle);
        if (!titleHit && bodyHitIdx < 0) continue;
        const start = Math.max(0, bodyHitIdx - 60);
        const snippet = bodyHitIdx >= 0 ? note.body.slice(start, start + 240) : "";
        out.push({
          id: noteIdFor(v.id, rel),
          vault_id: v.id,
          path: rel,
          title: note.title,
          snippet,
        });
      }
    }
    return jsonResult(out);
  },
);
```

- [ ] **Step 2: Confirm typecheck**

Run: `bun --filter packages/mcp-connectors/obsidian run typecheck`
Expected: zero errors.

- [ ] **Step 3: Confirm lint**

Run: `bun --filter packages/mcp-connectors/obsidian run lint`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add packages/mcp-connectors/obsidian/src/server.ts
git rm -f packages/mcp-connectors/obsidian/src/.gitkeep
git commit -m "feat(obsidian-mcp): read tools (list, get, search)"
```

---

## Task 16: MCP server — write tool (`obsidian_append_to_daily_note`)

**Files:**
- Modify: `packages/mcp-connectors/obsidian/src/server.ts`

- [ ] **Step 1: Append the write tool below the read tools**

Append to `packages/mcp-connectors/obsidian/src/server.ts`:

```ts
// ---- write tool (HITL: obsidian.note.append) ----

const appendDailyNoteSchema = z.object({
  vault_id: z.string().min(1),
  content: z.string().min(1),
  /** Optional override; otherwise the server picks "today" via the resolver. */
  date_iso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const SUPPORTED_TOKENS = ["YYYY", "YY", "MM", "DD", "HH", "mm"] as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatDailyNoteFilename(format: string, date: Date): string {
  const r: Record<string, string> = {
    YYYY: String(date.getUTCFullYear()),
    YY: String(date.getUTCFullYear() % 100).padStart(2, "0"),
    MM: pad2(date.getUTCMonth() + 1),
    DD: pad2(date.getUTCDate()),
    HH: pad2(date.getUTCHours()),
    mm: pad2(date.getUTCMinutes()),
  };
  let out = format;
  for (const tok of SUPPORTED_TOKENS) out = out.replaceAll(tok, r[tok] ?? "");
  return out;
}

function resolveDailyNoteRelativePath(vaultRoot: string, date: Date): string {
  const cfgPath = join(vaultRoot, ".obsidian", "daily-notes.json");
  let folder = "";
  let format = "YYYY-MM-DD";
  if (existsSync(cfgPath)) {
    try {
      const parsed = JSON.parse(readFileSync(cfgPath, "utf8")) as unknown;
      if (parsed !== null && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;
        if (typeof obj["folder"] === "string") folder = obj["folder"] as string;
        if (typeof obj["format"] === "string" && (obj["format"] as string) !== "") {
          format = obj["format"] as string;
        }
      }
    } catch {
      // fall through to defaults
    }
  }
  const filename = `${formatDailyNoteFilename(format, date)}.md`;
  return folder === "" ? filename : `${folder.replace(/[/\\]+$/, "")}/${filename}`;
}

reg(
  "obsidian_append_to_daily_note",
  "Append text to today's Obsidian daily note. Creates the file if it does not exist. Always appends — never overwrites. Adds a leading newline when the existing file does not end in one. Requires HITL `obsidian.note.append`.",
  appendDailyNoteSchema,
  async (parsed) => {
    const v = findVaultByIdOrPathPrefix(VAULTS, parsed.vault_id);
    if (v === undefined) {
      throw new Error("Unknown vault_id");
    }
    const date =
      parsed.date_iso !== undefined ? new Date(`${parsed.date_iso}T00:00:00Z`) : new Date();
    const rel = resolveDailyNoteRelativePath(v.root, date);
    // Defense-in-depth: the user-controlled `daily-notes.json` `folder`
    // could contain `..` segments. HITL is the structural defense; this
    // guard fails closed if the resolved path escapes the vault.
    const abs = assertWithinVault(v.root, rel);
    mkdirSync(dirname(abs), { recursive: true });

    let prefix = "";
    if (existsSync(abs)) {
      const existing = readFileSync(abs, "utf8");
      if (existing.length > 0 && !existing.endsWith("\n")) {
        prefix = "\n";
      }
    }
    const final = `${prefix}${parsed.content}`;
    // Append (existsSync above is informational — writeFileSync with the
    // `flag: "a"` does the actual append-or-create atomically).
    writeFileSync(abs, final, { flag: "a" });

    return jsonResult({
      appended: true,
      vault_id: v.id,
      vault_name: v.name,
      path: rel,
      bytes: Buffer.byteLength(final, "utf8"),
    });
  },
);

// ---- transport (must be the LAST line) ----
const transport = new StdioServerTransport();
await server.connect(transport);
```

- [ ] **Step 2: Confirm typecheck and lint**

Run: `bun --filter packages/mcp-connectors/obsidian run typecheck`
Expected: zero errors.

Run: `bun --filter packages/mcp-connectors/obsidian run lint`
Expected: zero errors.

- [ ] **Step 3: Build the connector**

Run: `bun --filter packages/mcp-connectors/obsidian run build`
Expected: `dist/nimbus-mcp-obsidian` produced.

- [ ] **Step 4: Commit**

```bash
git add packages/mcp-connectors/obsidian/src/server.ts
git commit -m "feat(obsidian-mcp): append-to-daily-note write tool (HITL-gated)"
```

---

## Task 17: HITL e2e — gate fires before file write; reject leaves file untouched

**Files:**
- Create: `packages/gateway/test/e2e/scenarios/obsidian-hitl.e2e.test.ts`

This task verifies the structural HITL contract (invariants `I2` / `I3` / `I4`) for the new action type, end-to-end through the executor.

- [ ] **Step 1: Look at an existing HITL e2e for the pattern**

Look at the existing HITL e2e tests in `packages/gateway/test/e2e/scenarios/` (search for files matching `*hitl*.e2e.test.ts`) for the harness shape and pick the closest to a connector-driven write — typically there is one for `notion.block.append` or `linear.issue.create`. Mirror its imports and the way it builds a `ToolExecutor` with mock consent + audit + dispatcher.

- [ ] **Step 2: Write the test**

The shapes below are pinned against the actual exports at `packages/gateway/src/engine/executor.ts:183–249`. Specifically:

- `ConsentChannel` has a single method `requestApproval(prompt: string, details?: Record<string, unknown>): Promise<boolean>` — returns a **boolean**, not a `{ status }` object.
- `ToolExecutor.execute(action)` returns `Promise<ActionResult>` and **does not throw on rejection** — it returns `{ status: "rejected", reason }`. Tests must assert on the return value, never on a thrown promise.
- `audit.recordAudit({...})` is called **before** `connectors.dispatch(...)` per executor.ts:228–247.

```ts
// packages/gateway/test/e2e/scenarios/obsidian-hitl.e2e.test.ts
import { expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { HITL_REQUIRED, ToolExecutor } from "../../../src/engine/executor.ts";
import { vaultIdFromAbsolutePath } from "../../../src/connectors/obsidian-vault-id.ts";

function buildVault(): { root: string; vaultId: string } {
  const root = mkdtempSync(join(tmpdir(), "obsidian-hitl-"));
  mkdirSync(join(root, ".obsidian"), { recursive: true });
  return { root, vaultId: vaultIdFromAbsolutePath(root) };
}

test("obsidian.note.append is in HITL_REQUIRED (structural)", () => {
  expect(HITL_REQUIRED.has("obsidian.note.append")).toBe(true);
});

test("audit log entry is written before the dispatcher executes the append", async () => {
  // executor.ts:228–247 enforces audit-before-dispatch ordering. We verify
  // by recording call order on spies. The third constructor arg is named
  // `connectors` in the executor source; any value with a `dispatch` method
  // satisfies the `ConnectorDispatcher` shape used here.
  const calls: Array<"audit" | "dispatch"> = [];
  const audit = {
    recordAudit: () => {
      calls.push("audit");
    },
  };
  const dispatch = {
    dispatch: async () => {
      calls.push("dispatch");
      return { ok: true };
    },
  };
  const consent = {
    requestApproval: async (_prompt: string, _details?: Record<string, unknown>) => true,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exec = new ToolExecutor(consent as any, audit as any, dispatch as any);
  const result = await exec.execute({
    type: "obsidian.note.append",
    payload: {
      mcpToolId: "obsidian_obsidian_append_to_daily_note",
      input: { vault_id: "x", content: "hi" },
    },
  });
  expect(result.status).toBe("ok");
  expect(calls[0]).toBe("audit");
  expect(calls[1]).toBe("dispatch");
});

test("rejecting the consent prompt returns rejected and never dispatches", async () => {
  const { root, vaultId } = buildVault();
  // Existing daily-note content — confirms a rejected execute() does not
  // touch the file.
  const dailyPath = join(root, "2026-05-10.md");
  writeFileSync(dailyPath, "before");

  const consent = {
    requestApproval: async () => false,
  };
  let auditCalls = 0;
  const audit = {
    recordAudit: () => {
      auditCalls++;
    },
  };
  let dispatched = false;
  const dispatch = {
    dispatch: async () => {
      dispatched = true;
      return null;
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exec = new ToolExecutor(consent as any, audit as any, dispatch as any);

  const result = await exec.execute({
    type: "obsidian.note.append",
    payload: {
      mcpToolId: "obsidian_obsidian_append_to_daily_note",
      input: { vault_id: vaultId, content: "AFTER", date_iso: "2026-05-10" },
    },
  });

  expect(result.status).toBe("rejected");
  expect(dispatched).toBe(false);
  // Audit row is still written for rejected actions (executor.ts:228–236).
  expect(auditCalls).toBe(1);
  // File is untouched.
  expect(existsSync(dailyPath)).toBe(true);
  expect(readFileSync(dailyPath, "utf8")).toBe("before");
});
```

The `as any` casts are standard in this codebase's HITL e2e tests — `ConsentChannel`, `AuditSink`, and `ConnectorDispatcher` have richer interfaces than the spies need. If a typed mock helper exists in `packages/gateway/test/` (search for one before reaching for `as any`), use it.

- [ ] **Step 3: Run the e2e**

Run: `bun test packages/gateway/test/e2e/scenarios/obsidian-hitl.e2e.test.ts`
Expected: 3 pass.

- [ ] **Step 4: Commit**

```bash
git add packages/gateway/test/e2e/scenarios/obsidian-hitl.e2e.test.ts
git commit -m "test(obsidian): HITL e2e — gate fires, audit precedes dispatch, reject is safe"
```

---

## Task 18: Wire the MCP server into the lazy-mesh

**Files:**
- Modify: `packages/gateway/src/connectors/lazy-mesh/keys.ts`
- Modify: `packages/gateway/src/connectors/lazy-mesh/connector-spawns.ts`
- Modify: `packages/gateway/src/connectors/lazy-mesh/mesh.ts`
- Modify: `packages/gateway/src/connectors/registry.ts`

- [ ] **Step 1: Add the slot key**

Edit `packages/gateway/src/connectors/lazy-mesh/keys.ts`. Append to `LAZY_MESH`:

```ts
  obsidian: "mesh:obsidian",
```

- [ ] **Step 2: Add `ensureObsidianMcp`**

Edit `packages/gateway/src/connectors/lazy-mesh/connector-spawns.ts`. After `ensureLinearMcp` (~line 323), add:

```ts
/**
 * Starts Obsidian MCP when `[[filesystem.roots]]` are configured. The MCP
 * server discovers `.obsidian/` markers itself; the gateway passes the
 * configured filesystem-root paths via OBSIDIAN_VAULT_PATHS_JSON. There is
 * no Vault-stored credential — Obsidian indexing is purely local.
 */
export async function ensureObsidianMcp(
  ctx: MeshSpawnContext,
  vaultRootPaths: readonly string[],
): Promise<void> {
  const slotKey = LAZY_MESH.obsidian;
  ctx.clearLazyIdle(slotKey);
  if (ctx.getLazyClient(slotKey) !== undefined) {
    ctx.scheduleLazyDisconnect(slotKey);
    return;
  }
  if (vaultRootPaths.length === 0) {
    return;
  }
  ctx.setLazyClient(
    slotKey,
    new MCPClient({
      id: `nimbus-obsidian-${randomUUID()}`,
      servers: {
        obsidian: {
          command: "bun",
          args: [mcpConnectorServerScript("obsidian")],
          env: extensionProcessEnv({ OBSIDIAN_VAULT_PATHS_JSON: JSON.stringify(vaultRootPaths) }),
        },
      },
    }),
  );
  ctx.bumpToolsEpoch();
  ctx.scheduleLazyDisconnect(slotKey);
}
```

- [ ] **Step 3: Wire `ensureObsidianMcp` into the mesh**

Edit `packages/gateway/src/connectors/lazy-mesh/mesh.ts`. Find where `ensureLinearMcp` (or the closest neighbour) is called when an Obsidian-prefixed tool fires. The pattern in this repo dispatches `ensureXMcp` based on the tool prefix — append a branch for Obsidian following the existing pattern; pass through the cached `[[filesystem.roots]]` paths the assembler already plumbs.

(The exact line varies by recent refactors. Search for `ensureLinearMcp` in `mesh.ts` and add an analogous Obsidian branch immediately below it. If the dispatch is keyed off a prefix table, add `obsidian: ensureObsidianMcp` to that table.)

- [ ] **Step 4: Add the registry comment row**

Edit `packages/gateway/src/connectors/registry.ts`. After the Linear block (~line 82), add:

```ts
 * Obsidian (HITL): `obsidian.note.append` → `obsidian_obsidian_append_to_daily_note`.
```

- [ ] **Step 5: Confirm typecheck**

Run: `bun run typecheck`
Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/connectors/lazy-mesh/keys.ts packages/gateway/src/connectors/lazy-mesh/connector-spawns.ts packages/gateway/src/connectors/lazy-mesh/mesh.ts packages/gateway/src/connectors/registry.ts
git commit -m "feat(obsidian): wire MCP server into lazy-mesh + registry"
```

---

## Task 19: End-to-end indexing test

**Files:**
- Create: `packages/gateway/test/e2e/scenarios/obsidian-indexer.e2e.test.ts`

- [ ] **Step 1: Write the e2e test**

```ts
// packages/gateway/test/e2e/scenarios/obsidian-indexer.e2e.test.ts
import { expect, test } from "bun:test";
import { join } from "node:path";

import {
  createMemoryIndexDb,
  EMPTY_NIMBUS_VAULT,
  syncTestContext,
} from "../../../src/connectors/connector-sync-test-helpers.ts";
import { createObsidianSyncable } from "../../../src/connectors/obsidian-sync.ts";

const FIX = join(import.meta.dir, "..", "..", "fixtures", "obsidian", "MyVault");

test("e2e: fixture vault produces queryable obsidian_note rows + daily-note flagged", async () => {
  const sync = createObsidianSyncable({
    roots: [
      { path: join(FIX, ".."), gitAware: false, codeIndex: false, dependencyGraph: false, exclude: [] },
    ],
  });
  const db = createMemoryIndexDb();
  const r = await sync.sync(syncTestContext(db, EMPTY_NIMBUS_VAULT), null);
  expect(r.itemsUpserted).toBeGreaterThanOrEqual(10);

  const byType = db
    .query("SELECT COUNT(*) AS n FROM item WHERE type = 'obsidian_note'")
    .get() as { n: number };
  expect(byType.n).toBeGreaterThanOrEqual(10);

  const daily = db
    .query("SELECT path FROM obsidian_notes WHERE daily_note_date = '2026-05-10'")
    .all() as Array<{ path: string }>;
  expect(daily.length).toBe(1);
  expect(daily[0]?.path).toBe("Daily/2026-05-10.md");

  // FTS path: title 'Welcome' should be reachable through item_fts.
  const ftsHits = db
    .query(
      "SELECT COUNT(*) AS n FROM item WHERE rowid IN (SELECT rowid FROM item_fts WHERE item_fts MATCH ?)",
    )
    .get("Welcome") as { n: number };
  expect(ftsHits.n).toBeGreaterThanOrEqual(1);
});
```

- [ ] **Step 2: Run the e2e test**

Run: `bun test packages/gateway/test/e2e/scenarios/obsidian-indexer.e2e.test.ts`
Expected: 1 pass.

- [ ] **Step 3: Commit**

```bash
git add packages/gateway/test/e2e/scenarios/obsidian-indexer.e2e.test.ts
git commit -m "test(obsidian): e2e — fixture vault → queryable obsidian_note rows"
```

---

## Task 20: Coverage check

**Files:** none

- [ ] **Step 1: Run coverage targeted at the new gateway-side files**

Run:
```bash
bunx bun test --coverage \
  packages/gateway/src/index/obsidian-notes-v26-sql.test.ts \
  packages/gateway/src/index/migrations/runner-v26.test.ts \
  packages/gateway/src/connectors/obsidian-vault-id.test.ts \
  packages/gateway/src/connectors/obsidian-discovery.test.ts \
  packages/gateway/src/connectors/obsidian-parsing.test.ts \
  packages/gateway/src/connectors/obsidian-daily-note.test.ts \
  packages/gateway/src/connectors/obsidian-sync.test.ts \
  packages/gateway/src/graph/relationship-graph-obsidian.test.ts \
  packages/gateway/src/graph/graph-populator-obsidian.test.ts \
  packages/gateway/src/engine/hitl-obsidian.test.ts
```

- [ ] **Step 2: Confirm ≥80% lines on the new gateway-side modules**

Inspect the per-file coverage table. Each of `obsidian-vault-id.ts`, `obsidian-discovery.ts`, `obsidian-parsing.ts`, `obsidian-daily-note.ts`, `obsidian-sync.ts`, and `obsidian-notes-v26-sql.ts` should show **≥80% line coverage**. If any falls short, add a targeted test for the uncovered branches before continuing — the spec sets the gateway-side gate at ≥80% for analogous gateway modules.

- [ ] **Step 3: Confirm ≥70% lines on the MCP package**

Run: `bunx bun test --coverage packages/mcp-connectors/obsidian/`
Expected: line coverage ≥70% for `packages/mcp-connectors/obsidian/src/server.ts`. If below, add direct-call tests against the registered handler functions (use the same pattern as `linear`'s tests if any exist; otherwise extract a couple of inner helpers — `readNote`, `discoverVaults`, `resolveDailyNoteRelativePath` — and test those directly).

- [ ] **Step 4: Run the existing gates as regression**

Run: `bun run test:coverage:engine`
Expected: gate passes (≥85% on engine — the only new entry is one element added to a frozen set, which is covered by the test you wrote in Task 13).

Run: `bun run test:coverage:sync`
Expected: gate passes (≥80% on sync — the new connector module sits under `connectors/`, not `sync/`, so this is an unaffected baseline; failure would indicate accidental drift).

(No commit — coverage check is a confirmation step, not a code change.)

---

## Task 21: Docs — architecture, roadmap, CLAUDE.md, SECURITY-INVARIANTS.md

**Files:**
- Modify: `docs/architecture.md`
- Modify: `docs/roadmap.md`
- Modify: `CLAUDE.md`
- Modify: `docs/SECURITY-INVARIANTS.md` (only if §I2 enumerates action types — verify before editing)

- [ ] **Step 1: Add `obsidian_notes` to the architecture schema reference**

In `docs/architecture.md`, find the "Local Database Schema" section. Add a row matching the existing pattern (the V25 `api_endpoint` row added in PR 1 is a good template):

> `obsidian_notes` — Phase 5 Wave A PR 2. Shadow row per indexed Obsidian Markdown note, keyed by `item.id`. Columns: `id`, `vault_id`, `vault_name`, `path`, `title`, `frontmatter_json`, `tags_json`, `wikilinks_json`, `daily_note_date`, `last_modified`, `created_at`. Indexed on `(vault_id, path)` and `daily_note_date` (partial index, non-NULL). Caveat: `vault_id = sha256(absoluteVaultRootPath).slice(0, 12)` — moving a vault re-issues every note id at the new path (delete-then-upsert).

- [ ] **Step 2: Flip the roadmap row**

In `docs/roadmap.md`, find the line for "Obsidian vault connector" (currently `[ ] **Obsidian vault connector** — ...`) and change `[ ]` to `[x]`. Append a date stub: `(2026-05-10, Phase 5 Wave A PR 2)`.

Also update the Phase 5 status line in `docs/roadmap.md` row 47 to reflect that Wave A is now complete (e.g., append "· Wave A PR 2 obsidian-vault ✅").

- [ ] **Step 3: Add the file-locations rows in CLAUDE.md**

In `CLAUDE.md` "Key File Locations", add three rows next to the OpenAPI ones:

> `packages/gateway/src/connectors/obsidian-sync.ts` | Obsidian vault connector — gateway-side syncable that emits `obsidian_note` items + backlink graph edges (Phase 5 Wave A PR 2).
> `packages/gateway/src/index/obsidian-notes-v26-sql.ts` | V26 migration — `obsidian_notes` shadow table.
> `packages/mcp-connectors/obsidian/src/server.ts` | Obsidian MCP server — `obsidian_list` / `_get` / `_search` (read) + `obsidian_append_to_daily_note` (HITL-gated write).

Also update the Phase 5 status row in `CLAUDE.md` so it mirrors the roadmap: append "· Wave A PR 2 obsidian-vault ✅" to the status line.

- [ ] **Step 4: SECURITY-INVARIANTS.md — leave untouched**

Verified at plan-write time: `docs/SECURITY-INVARIANTS.md` §I2 describes the invariant generically and does **not** enumerate every action type — see lines 26–34 of the file (the "Defense" / "Wired at" / "Anti-pattern" / "How to comply" pattern). Adding an `obsidian.note.append` mention there would be documentation drift. Enforcement is automatic via the existing security-invariants test (covered in Task 13). Skip this file.

If `SECURITY-INVARIANTS.md` is touched in a future commit and starts enumerating action types, this is the place to backfill `obsidian.note.append`. Until then, no edit.

- [ ] **Step 5: Commit**

```bash
git add docs/architecture.md docs/roadmap.md CLAUDE.md
git commit -m "docs(phase-5): mark Wave A PR 2 (obsidian-vault) shipped"
```

---

## Task 22: Preflight CI parity and open the PR

**Files:** none

- [ ] **Step 1: Lint pass**

Run: `bun run lint:fix`
Expected: zero remaining issues; any auto-fixed Biome diffs get committed in this task.

If `lint:fix` modifies files:

```bash
git add -u
git commit -m "chore: biome auto-fixes for Wave A PR 2"
```

- [ ] **Step 2: Build check**

Run: `bun run build`
Expected: build succeeds; `dist/` size for the gateway binary stays within an order of magnitude of the previous size. The new `js-yaml` dependency adds ~30 KiB; the binary should still be well under the prior release's footprint.

- [ ] **Step 3: Run the full CI-parity test suite**

Per the user's saved feedback (`feedback_preflight_before_pr.md`): always run `bun run test:ci` before pushing any PR.

Run: `bun run test:ci`
Expected: all tests + lint + typecheck green. If any unrelated test fails because of CI-only environment expectations, document and proceed; otherwise stop and fix.

- [ ] **Step 4: Push the branch**

Run: `git push -u origin dev/asafgolombek/phase-5-wave-a-pr2-obsidian`

- [ ] **Step 5: Open the PR**

Use `gh pr create` with the title `feat(phase-5): Wave A PR 2 — Obsidian vault connector` and a body summary that lists:

- New `obsidian_note` item type, V26 migration, `obsidian_notes` shadow table.
- Gateway-side syncable (`obsidian-sync.ts`) walks `[[filesystem.roots]]` for `.obsidian/` markers — mirrors `filesystem-v2-sync.ts` and the OpenAPI indexer.
- Backlink graph edges via `syncObsidianNoteGraph`.
- New MCP package `packages/mcp-connectors/obsidian/` with three read tools (`obsidian_list`, `obsidian_get`, `obsidian_search`) and one HITL-gated write tool (`obsidian_append_to_daily_note`, gated by the new `obsidian.note.append` action type).
- HITL e2e: gate fires before file write, audit precedes dispatch, reject is safe.
- Closes the "Obsidian vault connector" line in `docs/roadmap.md`.

The body should also link the spec at `docs/superpowers/specs/2026-05-10-phase-5-wave-a-api-surface-obsidian-design.md` and this plan at `docs/superpowers/plans/2026-05-10-phase-5-wave-a-pr2-obsidian.md`.

---

## Self-review summary

1. **Spec coverage:**
   - V26 migration → Tasks 1, 2.
   - Vault detection (`.obsidian/` marker, nested vaults, ignore dirs) → Task 4.
   - Vault id from absolute path + caveat documented → Task 3, Task 21 step 1.
   - Note parser (frontmatter, title, wikilinks, daily-note date) → Task 5.
   - Wikilink resolution best-effort (filename → title) → Task 5.
   - Daily-note path resolver (`.obsidian/daily-notes.json` + fallback + token subset) → Task 7.
   - Body content reachable through FTS → Task 10 (via `upsertIndexedItem`'s `bodyPreview`); verified by Task 19's FTS assertion.
   - Backlink graph edges (`obsidian_note → obsidian_note`) → Task 8 (entity type), Task 9 (populator).
   - Edge churn bounded by per-note diff → Task 9 (`clearRelationsTouchingEntity` per upsert).
   - Cascade on note delete (incoming edges removed too) → Task 10 (`deleteNotesAbsentFromVault`).
   - Mtime-based per-note delta sync → Tasks 10, 11.
   - Sticky deletes per vault → Tasks 10, 11.
   - HITL action `obsidian.note.append` (renamed from spec's `obsidian:appendToDailyNote` — see "Spec adjustments") → Task 13.
   - HITL gate fires before dispatch; audit precedes write; reject is safe → Task 17.
   - `appendToDailyNote` semantics: always append, prepend leading newline if needed, never overwrite, never auto-prepend timestamp/attribution → Task 16.
   - HITL summary uses vault_name + relative path, not raw vault_id → Task 16's tool description (the gateway's consent UI builds the summary from the action payload, which the connector populates with `vault_name` and the resolved `path`; see the dispatcher response shape in Task 16's `jsonResult`).
   - Three mandatory read tools (`list`, `get`, `search`) → Task 15.
   - Connector registered in registry → Task 18.
   - Spawn wiring (LAZY_MESH key, `ensureObsidianMcp`, mesh routing, `OBSIDIAN_VAULT_PATHS_JSON`) → Task 18.
   - Coverage gates (gateway ≥80%, MCP ≥70%) → Task 20.
   - Docs (architecture schema, roadmap, CLAUDE.md, SECURITY-INVARIANTS) → Task 21.
   - Preflight `bun run test:ci` before push → Task 22.

2. **Placeholder scan:** no `TODO`, `TBD`, "implement later", or "similar to Task N" placeholders. Every code-step shows complete code. Task 18's mesh.ts edit is the only step that says "find the analogous line" because the dispatch table's exact location varies with recent refactors; the surrounding context (`ensureLinearMcp` call site) makes it unambiguous in the source.

3. **Type consistency:**
   - `vaultIdFromAbsolutePath` returns 12-hex everywhere it appears (Task 3, Task 10, Task 15, Task 17).
   - `formatVaultName` returns the basename of the trimmed root (Task 3, Task 10).
   - `parseNote` return shape (`title`, `body`, `frontmatter`, `tags`, `aliases`, `wikilinks`, `dailyNoteDate`) is identical between the gateway-side test (Task 5) and the syncable that consumes it (Task 10).
   - `resolveWikilinks` signature in Task 5 (`(targets, byFilenameLower, byTitleLower) → { resolved, unresolved }`) matches its only caller in Task 10.
   - `OBSIDIAN_VAULT_PATHS_JSON` env var is set in Task 18 and read in Task 15 with identical name.
   - HITL action type is `obsidian.note.append` everywhere — Task 13 (set entry), Task 17 (HITL e2e), Task 18 (registry comment).
   - `obsidian_append_to_daily_note` is the canonical MCP tool name in Task 16, Task 17 (test payload), and Task 18 (registry mapping).
   - `resolved_wikilink_ids` is the metadata field name used by both Task 9 (populator dispatch reads it) and Task 10 (syncable writes it).

If anything in this plan diverges in actual review, fix inline and continue — no need to re-write the plan.
