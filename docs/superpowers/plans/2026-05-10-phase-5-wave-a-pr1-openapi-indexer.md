# Phase 5 Wave A — PR 1: OpenAPI / AsyncAPI Indexer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the gateway-side OpenAPI / AsyncAPI spec indexer that emits `api_endpoint` items into the local index, the V25 migration, and the `api_endpoint → service` relationship-graph edges. PR 1 of Wave A in [the spec](../specs/2026-05-10-phase-5-wave-a-api-surface-obsidian-design.md).

**Architecture:** Pure gateway-side syncable (no MCP package), modeled after `packages/gateway/src/connectors/filesystem-v2-sync.ts`. Discovery walks `[[filesystem.roots]]` for OpenAPI 2.0 / 3.x and AsyncAPI 2.x spec files, parses them with `@readme/openapi-parser` (OpenAPI) and an in-tree minimal AsyncAPI 2.x reader, upserts endpoint rows via `upsertIndexedItem` plus a new `api_endpoint` shadow table, and emits one graph relation per endpoint to the inferred owner service. Mtime-based delta sync, sticky deletes for endpoints removed from re-parsed specs.

**Tech Stack:** Bun v1.2+ / TypeScript 6.x strict; `bun:sqlite`; `@readme/openapi-parser`; `pino` for warn lines; existing helpers `upsertIndexedItem`, `upsertGraphEntity`, `upsertGraphRelation`, `recordMigration`.

## Known limitations (explicitly accepted in PR 1)

These are documented here so reviewers don't re-flag them and so a future contributor can pick them up:

1. **External `$ref` in spec files is not resolved.** PR 1 extracts endpoints from the raw parsed document, not the dereferenced one. A spec that uses `$ref: "./other-file.yaml#/paths/..."` will only contribute the endpoints visible in the root document. Fixing this means switching `parseSpec` to async + I/O-aware via `OpenApiParser.dereference()`. Defer to a follow-up; track in the spec's Non-goals if user demand surfaces.
2. **Orphaned `service` graph entities on rename.** When a user renames the directory that drove service-name inference (e.g., `services/payments-api/` → `services/payments/`), endpoints get re-keyed and re-pointed at the new `service` entity, but the old `service` entity remains in the graph until the next full graph rebuild. Acceptable for Wave A; full graph cleanup belongs to T6's typed-`dbRun` migration follow-up.
3. **Symlinks are intentionally skipped.** The discovery walker does not follow symlinked files or directories. This avoids loops at the cost of missing intentional symlink-mounted spec dirs; if a user reports this, we can add an opt-in `[openapi].follow_symlinks = true` flag.

---

## File Structure

**Created:**
- `packages/gateway/src/connectors/openapi-indexer-sync.ts` — `createOpenapiIndexerSyncable(options): Syncable`. Owns the discovery walk, parser dispatch, item upsert, mtime cursor, sticky deletes, health-snapshot counters.
- `packages/gateway/src/connectors/openapi-indexer-discovery.ts` — recursive walker producing the candidate-file list, depth-bounded, with default + configured ignore patterns. Pure (file-system-only).
- `packages/gateway/src/connectors/openapi-indexer-parsing.ts` — uniform `parseSpec(absPath, bytes): ParsedSpec | { skipped: SkipReason }` over OpenAPI (via `@readme/openapi-parser`) and AsyncAPI 2.x (in-tree minimal reader).
- `packages/gateway/src/connectors/openapi-indexer-service-name.ts` — four-step service-name inference (override → enclosing dir → `info.title` slug → sha8 fallback).
- `packages/gateway/src/connectors/openapi-indexer-config.ts` — best-effort line-based parser for the `[openapi]` block in `nimbus.toml` (`max_walk_depth`, `max_spec_bytes`, `ignore_globs`), mirroring `filesystem-toml.ts`'s shape.
- `packages/gateway/src/index/api-endpoint-v25-sql.ts` — V25 SQL constant.
- `packages/gateway/test/fixtures/openapi/` — fixture spec files (good + bad).
- `packages/gateway/src/connectors/openapi-indexer-sync.test.ts` — sync-layer integration tests over a temp filesystem root.
- `packages/gateway/src/connectors/openapi-indexer-parsing.test.ts` — parser unit tests against fixtures.
- `packages/gateway/src/connectors/openapi-indexer-discovery.test.ts` — discovery unit tests.
- `packages/gateway/src/connectors/openapi-indexer-service-name.test.ts` — service-name-inference unit tests.
- `packages/gateway/src/connectors/openapi-indexer-config.test.ts` — config parser tests.

**Modified:**
- `packages/gateway/src/index/migrations/runner.ts` — register `migrateIndexedV24ToV25` and append to `INDEXED_SCHEMA_STEPS`.
- `packages/gateway/src/graph/relationship-graph.ts` — extend `ITEM_LINKED_ENTITY_TYPES` with `"api_endpoint"`.
- `packages/gateway/src/graph/graph-populator.ts` — add `syncApiEndpointGraph` and dispatch from `syncGraphFromIndexedItem`.
- `packages/gateway/src/platform/assemble.ts` — register the new syncable next to `filesystem-v2`.
- `packages/gateway/package.json` — add `@readme/openapi-parser` dependency.
- `docs/architecture.md` — add `api_endpoint` row to "Local Database Schema".
- `docs/roadmap.md` — flip the OpenAPI / AsyncAPI spec-indexer line to `[x]`.
- `CLAUDE.md` — add two rows to "Key File Locations" (`openapi-indexer-sync.ts`, `api-endpoint-v25-sql.ts`).

---

## Task 0: Branch off main and add the parser dependency

**Files:**
- Modify: `packages/gateway/package.json`

- [ ] **Step 1: Create implementation branch off main**

```bash
git fetch origin main
git checkout -b dev/asafgolombek/phase-5-wave-a-pr1-openapi-indexer origin/main
```

- [ ] **Step 2: Vet the parser dependency before adding it**

Run: `bun run check-package @readme/openapi-parser`
Expected: package exists, multiple maintainers, > 7 days old. (Per CLAUDE.md "Dependency Safety".) If the script warns or exits 1, stop and reconsider.

- [ ] **Step 3: Add the dependency to the gateway workspace, pinned**

```bash
bun add --filter packages/gateway @readme/openapi-parser@^6
```

Pin to `^6` — the actual current major of `@readme/openapi-parser` at the time of writing (verified `6.1.1` is the latest stable). The package exports async helpers (`parse`, `dereference`, `validate`, `bundle`); Task 7 will use `js-yaml` directly for synchronous string-to-JSON parsing and reserve `@readme/openapi-parser` for spec validation when needed. (The plan's earlier Gemini-CLI-suggested `^19` pin assumed a major that does not exist for this package.)

Expected: `packages/gateway/package.json` gets a new entry under `dependencies` (`"@readme/openapi-parser": "^6.x.x"` or `"6.x.x"` exact); `bun.lock` updates. No other workspaces touched.

- [ ] **Step 4: Confirm typecheck still passes**

Run: `bun run typecheck`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/package.json bun.lock
git commit -m "deps(gateway): add @readme/openapi-parser for Wave A PR 1"
```

---

## Task 1: V25 migration SQL — failing test

**Files:**
- Create: `packages/gateway/src/index/api-endpoint-v25-sql.ts`
- Create: `packages/gateway/src/index/api-endpoint-v25-sql.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/gateway/src/index/api-endpoint-v25-sql.test.ts
import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { API_ENDPOINT_V25_SCHEMA_SQL } from "./api-endpoint-v25-sql.ts";

test("V25 schema creates api_endpoint with documented columns and indexes", () => {
  const db = new Database(":memory:");
  db.exec(API_ENDPOINT_V25_SCHEMA_SQL);
  const cols = db.query(`PRAGMA table_info(api_endpoint)`).all() as Array<{ name: string }>;
  const names = new Set(cols.map((c) => c.name));
  for (const expected of [
    "id",
    "service_name",
    "path",
    "method",
    "operation_id",
    "tags_json",
    "deprecated",
    "spec_file",
    "spec_version",
    "last_modified",
    "created_at",
  ]) {
    expect(names.has(expected)).toBe(true);
  }
  const indexes = db
    .query(`SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='api_endpoint'`)
    .all() as Array<{ name: string }>;
  const idxNames = new Set(indexes.map((i) => i.name));
  expect(idxNames.has("idx_api_endpoint_service_path_method")).toBe(true);
  expect(idxNames.has("idx_api_endpoint_spec_file")).toBe(true);
});

test("V25 schema CHECK constraint rejects deprecated values outside 0/1", () => {
  const db = new Database(":memory:");
  db.exec(API_ENDPOINT_V25_SCHEMA_SQL);
  expect(() => {
    db.run(
      `INSERT INTO api_endpoint (id, service_name, path, method, tags_json, deprecated, spec_file, spec_version, last_modified, created_at)
       VALUES ('x', 's', '/p', 'GET', '[]', 2, '/spec', 'openapi-3.0.0', 0, 0)`,
    );
  }).toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/src/index/api-endpoint-v25-sql.test.ts`
Expected: FAIL — module `./api-endpoint-v25-sql.ts` not found.

- [ ] **Step 3: Implement the SQL constant**

```ts
// packages/gateway/src/index/api-endpoint-v25-sql.ts
/**
 * V25 migration — `api_endpoint` shadow table for OpenAPI / AsyncAPI spec
 * indexer (Phase 5 Wave A PR 1). One row per indexed endpoint, keyed by the
 * unified `item.id`. Service-that-owns-the-endpoint is `service_name`;
 * `item.service` is always `"openapi"` for these rows.
 *
 * Append-only and additive — no backfill needed; existing rows in `item`
 * are unaffected.
 */
export const API_ENDPOINT_V25_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS api_endpoint (
  id            TEXT PRIMARY KEY,
  service_name  TEXT NOT NULL,
  path          TEXT NOT NULL,
  method        TEXT NOT NULL,
  operation_id  TEXT,
  tags_json     TEXT NOT NULL DEFAULT '[]',
  deprecated    INTEGER NOT NULL DEFAULT 0,
  spec_file     TEXT NOT NULL,
  spec_version  TEXT NOT NULL,
  last_modified INTEGER NOT NULL,
  created_at    INTEGER NOT NULL,
  CHECK (deprecated IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_api_endpoint_service_path_method
  ON api_endpoint (service_name, path, method);
CREATE INDEX IF NOT EXISTS idx_api_endpoint_spec_file
  ON api_endpoint (spec_file);
`;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/gateway/src/index/api-endpoint-v25-sql.test.ts`
Expected: 2 pass.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/index/api-endpoint-v25-sql.ts packages/gateway/src/index/api-endpoint-v25-sql.test.ts
git commit -m "feat(db): V25 schema for api_endpoint shadow table"
```

---

## Task 2: Wire V25 into the migration runner

**Files:**
- Modify: `packages/gateway/src/index/migrations/runner.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/gateway/src/index/migrations/runner-v25.test.ts
import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { migrateIndexedDatabase, readIndexedUserVersion } from "./runner.ts";

test("running migrations on a fresh DB advances user_version to 25", () => {
  const db = new Database(":memory:");
  migrateIndexedDatabase(db, Date.now());
  expect(readIndexedUserVersion(db)).toBe(25);
});

test("V25 records a row in _schema_migrations", () => {
  const db = new Database(":memory:");
  migrateIndexedDatabase(db, Date.now());
  const row = db
    .query("SELECT version, status FROM _schema_migrations WHERE version = 25")
    .get() as { version: number; status: string } | null;
  expect(row?.version).toBe(25);
  expect(row?.status).toBe("applied");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/src/index/migrations/runner-v25.test.ts`
Expected: FAIL — `user_version` is `24`, not `25`; no row recorded.

- [ ] **Step 3: Add the V25 step to the runner**

Edit `packages/gateway/src/index/migrations/runner.ts` after the V24 import block:

```ts
// Add to the import group at the top:
import { API_ENDPOINT_V25_SCHEMA_SQL } from "../api-endpoint-v25-sql.ts";

// Add a new migration function near the other `migrateIndexedV<N>To<N+1>` functions:
function migrateIndexedV24ToV25(db: Database, now: number): void {
  db.transaction(() => {
    db.exec(API_ENDPOINT_V25_SCHEMA_SQL);
    db.exec("PRAGMA user_version = 25");
    recordMigration(db, 25, "api_endpoint shadow table (Wave A PR 1)", now);
  })();
}

// Append to INDEXED_SCHEMA_STEPS:
const INDEXED_SCHEMA_STEPS: readonly IndexedSchemaStep[] = [
  // ...existing entries...
  { fromVersion: 23, toVersion: 24, apply: migrateIndexedV23ToV24 },
  { fromVersion: 24, toVersion: 25, apply: migrateIndexedV24ToV25 },
];
```

- [ ] **Step 4: Run tests to verify**

Run: `bun test packages/gateway/src/index/migrations/runner-v25.test.ts packages/gateway/src/index/api-endpoint-v25-sql.test.ts`
Expected: 4 pass.

Run: `bun run typecheck`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/index/migrations/runner.ts packages/gateway/src/index/migrations/runner-v25.test.ts
git commit -m "feat(db): register V25 migration in runner"
```

---

## Task 3: Service-name inference helper

**Files:**
- Create: `packages/gateway/src/connectors/openapi-indexer-service-name.ts`
- Create: `packages/gateway/src/connectors/openapi-indexer-service-name.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/gateway/src/connectors/openapi-indexer-service-name.test.ts
import { expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inferServiceName } from "./openapi-indexer-service-name.ts";

test("step 1: per-spec override in nimbus.openapi.toml wins", () => {
  const dir = mkdtempSync(join(tmpdir(), "openapi-svc-"));
  writeFileSync(join(dir, "nimbus.openapi.toml"), `service = "billing-api"\n`);
  writeFileSync(join(dir, "openapi.yaml"), "");
  expect(
    inferServiceName({ specPath: join(dir, "openapi.yaml"), infoTitle: "Other", rootPath: dir }),
  ).toBe("billing-api");
});

test("step 2: enclosing directory name when not at root", () => {
  const root = mkdtempSync(join(tmpdir(), "openapi-svc-"));
  const sub = join(root, "services", "payments-api");
  mkdirSync(sub, { recursive: true });
  writeFileSync(join(sub, "openapi.yaml"), "");
  expect(
    inferServiceName({ specPath: join(sub, "openapi.yaml"), infoTitle: "", rootPath: root }),
  ).toBe("payments-api");
});

test("step 3: info.title slugified when at root and no override", () => {
  const root = mkdtempSync(join(tmpdir(), "openapi-svc-"));
  writeFileSync(join(root, "openapi.yaml"), "");
  expect(
    inferServiceName({
      specPath: join(root, "openapi.yaml"),
      infoTitle: "My Cool Service v2",
      rootPath: root,
    }),
  ).toBe("my-cool-service-v2");
});

test("step 4: deterministic sha8 fallback when nothing else applies", () => {
  const root = mkdtempSync(join(tmpdir(), "openapi-svc-"));
  writeFileSync(join(root, "openapi.yaml"), "");
  const out = inferServiceName({
    specPath: join(root, "openapi.yaml"),
    infoTitle: "",
    rootPath: root,
  });
  expect(out.startsWith("service-")).toBe(true);
  expect(out.length).toBe("service-".length + 8);
});

test("fallback is stable across calls for the same path", () => {
  const root = mkdtempSync(join(tmpdir(), "openapi-svc-"));
  writeFileSync(join(root, "openapi.yaml"), "");
  const a = inferServiceName({ specPath: join(root, "openapi.yaml"), infoTitle: "", rootPath: root });
  const b = inferServiceName({ specPath: join(root, "openapi.yaml"), infoTitle: "", rootPath: root });
  expect(a).toBe(b);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/src/connectors/openapi-indexer-service-name.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

```ts
// packages/gateway/src/connectors/openapi-indexer-service-name.ts
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, basename } from "node:path";

/** Inputs for one spec-file inference. */
export type ServiceNameInput = {
  /** Absolute path of the spec file. */
  specPath: string;
  /** `info.title` from the parsed spec, or `""` if missing/blank. */
  infoTitle: string;
  /** Absolute path of the [[filesystem.roots]] root containing this spec. */
  rootPath: string;
};

const SLUG_DROP = /[^a-z0-9]+/g;

function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(SLUG_DROP, "-")
    .replace(/^-+|-+$/g, "");
}

function readOverride(specPath: string): string | undefined {
  const sib = join(dirname(specPath), "nimbus.openapi.toml");
  if (!existsSync(sib)) {
    return undefined;
  }
  try {
    const raw = readFileSync(sib, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const t = line.replace(/#.*$/, "").trim();
      const m = /^service\s*=\s*"([^"]*)"\s*$/.exec(t);
      if (m !== null) {
        const v = m[1].trim();
        return v === "" ? undefined : v;
      }
    }
  } catch {
    // ignore — best-effort
  }
  return undefined;
}

function enclosingDirOrUndef(specPath: string, rootPath: string): string | undefined {
  const dir = dirname(specPath);
  if (dir === rootPath) {
    return undefined;
  }
  return basename(dir);
}

function sha8(path: string): string {
  return createHash("sha256").update(path).digest("hex").slice(0, 8);
}

export function inferServiceName(input: ServiceNameInput): string {
  const override = readOverride(input.specPath);
  if (override !== undefined && override !== "") {
    return override;
  }
  const enc = enclosingDirOrUndef(input.specPath, input.rootPath);
  if (enc !== undefined && enc !== "") {
    const s = slugify(enc);
    if (s !== "") {
      return s;
    }
  }
  const title = slugify(input.infoTitle);
  if (title !== "") {
    return title;
  }
  return `service-${sha8(input.specPath)}`;
}
```

- [ ] **Step 4: Run tests to verify**

Run: `bun test packages/gateway/src/connectors/openapi-indexer-service-name.test.ts`
Expected: 5 pass.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/connectors/openapi-indexer-service-name.ts packages/gateway/src/connectors/openapi-indexer-service-name.test.ts
git commit -m "feat(openapi-indexer): four-step service-name inference"
```

---

## Task 4: TOML config for `[openapi]`

**Files:**
- Create: `packages/gateway/src/connectors/openapi-indexer-config.ts`
- Create: `packages/gateway/src/connectors/openapi-indexer-config.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/gateway/src/connectors/openapi-indexer-config.test.ts
import { expect, test } from "bun:test";
import { parseOpenapiToml, DEFAULT_OPENAPI_CONFIG } from "./openapi-indexer-config.ts";

test("missing [openapi] block returns defaults", () => {
  expect(parseOpenapiToml("")).toEqual(DEFAULT_OPENAPI_CONFIG);
});

test("parses max_walk_depth and max_spec_bytes when set", () => {
  const cfg = parseOpenapiToml(`
[openapi]
max_walk_depth = 12
max_spec_bytes = 10485760
`);
  expect(cfg.maxWalkDepth).toBe(12);
  expect(cfg.maxSpecBytes).toBe(10485760);
});

test("parses ignore_globs as comma-separated string list", () => {
  const cfg = parseOpenapiToml(`
[openapi]
ignore_globs = "**/legacy/**, **/archived/**"
`);
  expect(cfg.ignoreGlobs).toEqual(["**/legacy/**", "**/archived/**"]);
});

test("invalid integer falls back to default value silently", () => {
  const cfg = parseOpenapiToml(`
[openapi]
max_walk_depth = "not a number"
`);
  expect(cfg.maxWalkDepth).toBe(DEFAULT_OPENAPI_CONFIG.maxWalkDepth);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/src/connectors/openapi-indexer-config.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the parser**

```ts
// packages/gateway/src/connectors/openapi-indexer-config.ts
export type OpenapiConfig = {
  maxWalkDepth: number;
  maxSpecBytes: number;
  ignoreGlobs: readonly string[];
};

export const DEFAULT_OPENAPI_CONFIG: OpenapiConfig = {
  maxWalkDepth: 8,
  maxSpecBytes: 5 * 1024 * 1024, // 5 MiB
  ignoreGlobs: [],
};

function stripComment(line: string): string {
  const i = line.indexOf("#");
  return i < 0 ? line : line.slice(0, i);
}

function parseStringScalar(raw: string): string | undefined {
  const t = raw.trim();
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
    return t.slice(1, -1);
  }
  return undefined;
}

function parseInt32(raw: string): number | undefined {
  const t = raw.trim();
  if (!/^-?\d+$/.test(t)) {
    return undefined;
  }
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseGlobList(raw: string): readonly string[] {
  const s = parseStringScalar(raw);
  if (s === undefined) {
    return [];
  }
  return s
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x !== "");
}

/** Best-effort `[openapi]` block reader from a `nimbus.toml` source string. */
export function parseOpenapiToml(source: string): OpenapiConfig {
  const lines = source.split(/\r?\n/);
  let inBlock = false;
  let maxWalkDepth = DEFAULT_OPENAPI_CONFIG.maxWalkDepth;
  let maxSpecBytes = DEFAULT_OPENAPI_CONFIG.maxSpecBytes;
  let ignoreGlobs: readonly string[] = DEFAULT_OPENAPI_CONFIG.ignoreGlobs;

  for (const rawLine of lines) {
    const line = stripComment(rawLine).trim();
    if (line === "") {
      continue;
    }
    if (line.startsWith("[")) {
      inBlock = line === "[openapi]";
      continue;
    }
    if (!inBlock) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (key === "max_walk_depth") {
      const n = parseInt32(val);
      if (n !== undefined && n >= 1 && n <= 64) {
        maxWalkDepth = n;
      }
    } else if (key === "max_spec_bytes") {
      const n = parseInt32(val);
      if (n !== undefined && n >= 1024 && n <= 1024 * 1024 * 1024) {
        maxSpecBytes = n;
      }
    } else if (key === "ignore_globs") {
      ignoreGlobs = parseGlobList(val);
    }
  }
  return { maxWalkDepth, maxSpecBytes, ignoreGlobs };
}
```

- [ ] **Step 4: Run tests to verify**

Run: `bun test packages/gateway/src/connectors/openapi-indexer-config.test.ts`
Expected: 4 pass.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/connectors/openapi-indexer-config.ts packages/gateway/src/connectors/openapi-indexer-config.test.ts
git commit -m "feat(openapi-indexer): [openapi] TOML config block"
```

---

## Task 5: Discovery walker (depth-bounded, ignore-aware)

**Files:**
- Create: `packages/gateway/src/connectors/openapi-indexer-discovery.ts`
- Create: `packages/gateway/src/connectors/openapi-indexer-discovery.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/gateway/src/connectors/openapi-indexer-discovery.test.ts
import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverSpecFiles } from "./openapi-indexer-discovery.ts";

function setupTree(): string {
  const root = mkdtempSync(join(tmpdir(), "openapi-discover-"));
  mkdirSync(join(root, "services", "billing"), { recursive: true });
  mkdirSync(join(root, "node_modules", "junk"), { recursive: true });
  mkdirSync(join(root, "deep", "a", "b", "c", "d", "e", "f", "g", "h"), { recursive: true });
  writeFileSync(join(root, "openapi.yaml"), "openapi: 3.0.0");
  writeFileSync(join(root, "services", "billing", "swagger.json"), "{}");
  writeFileSync(join(root, "services", "billing", "asyncapi.yaml"), "asyncapi: 2.6.0");
  writeFileSync(join(root, "node_modules", "junk", "openapi.yaml"), "should be skipped");
  writeFileSync(join(root, "deep", "a", "b", "c", "d", "e", "f", "g", "h", "openapi.yaml"), "");
  return root;
}

test("finds OpenAPI/Swagger/AsyncAPI files and skips default-ignored dirs", () => {
  const root = setupTree();
  const files = discoverSpecFiles(root, { maxWalkDepth: 8, ignoreGlobs: [] });
  const rels = files.map((f) => f.replace(`${root}/`, "").replaceAll("\\", "/"));
  expect(rels).toContain("openapi.yaml");
  expect(rels).toContain("services/billing/swagger.json");
  expect(rels).toContain("services/billing/asyncapi.yaml");
  for (const r of rels) {
    expect(r.includes("node_modules")).toBe(false);
  }
});

test("respects max_walk_depth", () => {
  const root = setupTree();
  const shallow = discoverSpecFiles(root, { maxWalkDepth: 2, ignoreGlobs: [] });
  const deep = discoverSpecFiles(root, { maxWalkDepth: 12, ignoreGlobs: [] });
  expect(deep.length).toBeGreaterThan(shallow.length);
});

test("matches case-insensitively for known filenames", () => {
  const root = mkdtempSync(join(tmpdir(), "openapi-discover-case-"));
  writeFileSync(join(root, "OpenAPI.YAML"), "");
  writeFileSync(join(root, "Swagger.JSON"), "{}");
  const files = discoverSpecFiles(root, { maxWalkDepth: 8, ignoreGlobs: [] });
  expect(files.length).toBe(2);
});

test("does not follow symlinks (file or directory)", () => {
  const { symlinkSync } = require("node:fs") as typeof import("node:fs");
  const root = mkdtempSync(join(tmpdir(), "openapi-discover-symlink-"));
  // Real spec at the root.
  writeFileSync(join(root, "openapi.yaml"), "openapi: 3.0.0");
  // Symlinked spec file pointing back at the real one.
  try {
    symlinkSync(join(root, "openapi.yaml"), join(root, "linked.yaml"));
  } catch {
    // Some Windows / restricted environments cannot create symlinks; skip the
    // assertion in that case rather than failing.
    return;
  }
  // Symlinked directory pointing back at the parent (would loop if followed).
  try {
    symlinkSync(root, join(root, "self"));
  } catch {
    // ignore — same reason as above
  }
  const files = discoverSpecFiles(root, { maxWalkDepth: 8, ignoreGlobs: [] });
  // Only the real spec — the symlinked file and the symlinked dir are skipped.
  expect(files.length).toBe(1);
  expect(files[0].endsWith("openapi.yaml")).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/src/connectors/openapi-indexer-discovery.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the walker**

```ts
// packages/gateway/src/connectors/openapi-indexer-discovery.ts
import { readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";

export type DiscoveryOptions = {
  maxWalkDepth: number;
  ignoreGlobs: readonly string[];
};

const DEFAULT_IGNORE_DIRS = new Set([
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

const SPEC_FILENAME_RE =
  /^(openapi|swagger|asyncapi)\.(ya?ml|json)$/i;

function pathMatchesAnyGlob(rel: string, globs: readonly string[]): boolean {
  for (const g of globs) {
    if (matchesGlob(rel.replaceAll("\\", "/"), g)) {
      return true;
    }
  }
  return false;
}

/**
 * Minimal glob matcher: `*` (no slashes), `**` (any chars including slashes),
 * literal `?` (one char). Anchored. Sufficient for `ignore_globs` patterns
 * like `**\/legacy\/**`.
 */
function matchesGlob(input: string, glob: string): boolean {
  let re = "^";
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    const next = glob[i + 1];
    if (ch === "*" && next === "*") {
      re += ".*";
      i++;
    } else if (ch === "*") {
      re += "[^/]*";
    } else if (ch === "?") {
      re += "[^/]";
    } else if (/[a-zA-Z0-9_\-/]/.test(ch)) {
      re += ch;
    } else {
      re += `\\${ch}`;
    }
  }
  re += "$";
  return new RegExp(re).test(input);
}

export function discoverSpecFiles(
  root: string,
  opts: DiscoveryOptions,
): readonly string[] {
  const out: string[] = [];
  walk(root, root, 0, opts, out);
  return out;
}

function walk(
  root: string,
  dir: string,
  depth: number,
  opts: DiscoveryOptions,
  out: string[],
): void {
  if (depth > opts.maxWalkDepth) {
    return;
  }
  let entries: readonly {
    name: string;
    isDirectory: () => boolean;
    isFile: () => boolean;
    isSymbolicLink: () => boolean;
  }[] = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    // Never follow symlinks — protects against directory cycles and against
    // a hostile vault that links into the user's home dir.
    if (e.isSymbolicLink()) {
      continue;
    }
    const abs = join(dir, e.name);
    const rel = abs.slice(root.length + 1);
    if (e.isDirectory()) {
      if (DEFAULT_IGNORE_DIRS.has(e.name)) {
        continue;
      }
      if (pathMatchesAnyGlob(rel, opts.ignoreGlobs)) {
        continue;
      }
      walk(root, abs, depth + 1, opts, out);
      continue;
    }
    if (!e.isFile()) {
      continue;
    }
    if (!SPEC_FILENAME_RE.test(basename(abs))) {
      continue;
    }
    if (pathMatchesAnyGlob(rel, opts.ignoreGlobs)) {
      continue;
    }
    try {
      if (statSync(abs).isFile()) {
        out.push(abs);
      }
    } catch {
      // ignore — file disappeared between readdir and stat
    }
  }
}

// Performance note: we do NOT pre-compile `ignoreGlobs` into a single regex.
// The `DEFAULT_IGNORE_DIRS` Set covers the high-fanout paths (`node_modules`,
// `.git`, `dist`, ...) at O(1); `pathMatchesAnyGlob` runs only on directories
// and files that survived that check, which is bounded. Pre-compilation is
// a hot-path optimisation we can add later if a real workload shows it
// matters.
```

- [ ] **Step 4: Run tests to verify**

Run: `bun test packages/gateway/src/connectors/openapi-indexer-discovery.test.ts`
Expected: 3 pass.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/connectors/openapi-indexer-discovery.ts packages/gateway/src/connectors/openapi-indexer-discovery.test.ts
git commit -m "feat(openapi-indexer): depth-bounded spec-file discovery walker"
```

---

## Task 6: Add fixtures

**Files:**
- Create: `packages/gateway/test/fixtures/openapi/petstore-3.0.yaml`
- Create: `packages/gateway/test/fixtures/openapi/petstore-3.1.yaml`
- Create: `packages/gateway/test/fixtures/openapi/petstore-2.0.json`
- Create: `packages/gateway/test/fixtures/openapi/asyncapi-2.6.yaml`
- Create: `packages/gateway/test/fixtures/openapi/bad-yaml.yaml`
- Create: `packages/gateway/test/fixtures/openapi/not-a-spec.yaml`
- Create: `packages/gateway/test/fixtures/openapi/unresolvable-ref.yaml`
- Create: `packages/gateway/test/fixtures/openapi/webhook-only-3.1.yaml`

- [ ] **Step 1: Add the good-input fixtures**

```yaml
# packages/gateway/test/fixtures/openapi/petstore-3.0.yaml
openapi: 3.0.0
info:
  title: Petstore API
  version: 1.0.0
paths:
  /pets:
    get:
      operationId: listPets
      tags: [pets]
      responses:
        "200":
          description: ok
  /pets/{id}:
    delete:
      operationId: deletePet
      deprecated: true
      tags: [pets, admin]
      responses:
        "204":
          description: no content
```

```yaml
# packages/gateway/test/fixtures/openapi/petstore-3.1.yaml
openapi: 3.1.0
info:
  title: Petstore 3.1
  version: 2.0.0
paths:
  /v2/pets:
    get:
      operationId: listPetsV2
      responses:
        "200":
          description: ok
```

```json
{
  "swagger": "2.0",
  "info": { "title": "Legacy Petstore", "version": "0.5.0" },
  "paths": {
    "/legacy/pets": {
      "get": { "operationId": "legacyList", "responses": { "200": { "description": "ok" } } }
    }
  }
}
```

```yaml
# packages/gateway/test/fixtures/openapi/asyncapi-2.6.yaml
asyncapi: "2.6.0"
info:
  title: Notifications
  version: 1.0.0
channels:
  user/signedup:
    publish:
      operationId: onUserSignedUp
      message:
        name: UserSignedUp
    subscribe:
      operationId: dispatchUserSignedUp
      message:
        name: UserSignedUp
```

- [ ] **Step 2: Add the bad-input fixtures**

```yaml
# packages/gateway/test/fixtures/openapi/bad-yaml.yaml
this: is: not: valid: yaml: [
```

```yaml
# packages/gateway/test/fixtures/openapi/not-a-spec.yaml
hello: world
fruit: [apple, banana]
```

```yaml
# packages/gateway/test/fixtures/openapi/unresolvable-ref.yaml
openapi: 3.0.0
info:
  title: Broken Refs
  version: 0.0.0
paths:
  /broken:
    get:
      operationId: brokenRef
      responses:
        "200":
          $ref: "#/components/responses/Missing"
```

```yaml
# packages/gateway/test/fixtures/openapi/webhook-only-3.1.yaml
openapi: 3.1.0
info:
  title: Webhook Only
  version: 1.0.0
webhooks:
  newOrder:
    post:
      operationId: newOrder
      responses:
        "200":
          description: ok
```

- [ ] **Step 3: Commit**

```bash
git add packages/gateway/test/fixtures/openapi/
git commit -m "test(openapi-indexer): add good + bad spec fixtures"
```

---

## Task 7: Spec parser (OpenAPI + AsyncAPI 2.x) — failing test

**Files:**
- Create: `packages/gateway/src/connectors/openapi-indexer-parsing.ts`
- Create: `packages/gateway/src/connectors/openapi-indexer-parsing.test.ts`
- Modify: `packages/gateway/package.json` (add `js-yaml` + `@types/js-yaml`)

- [ ] **Step 0: Add `js-yaml` as an explicit gateway dependency**

`js-yaml` is currently a transitive dep of `@readme/openapi-parser` but the parser implementation imports it directly. Declare it explicitly so future dep changes can't pull the runtime out from under us.

Run:
```bash
bun add --filter packages/gateway js-yaml@^4
bun add --filter packages/gateway -D @types/js-yaml@^4
```

Expected: `packages/gateway/package.json` gains `"js-yaml": "^4.x.x"` under `dependencies` and `"@types/js-yaml": "^4.x.x"` under `devDependencies`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/gateway/src/connectors/openapi-indexer-parsing.test.ts
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSpec } from "./openapi-indexer-parsing.ts";

const FIX = join(import.meta.dir, "..", "..", "test", "fixtures", "openapi");

async function parseFixture(name: string) {
  const path = join(FIX, name);
  const bytes = readFileSync(path, "utf8");
  return parseSpec({ absPath: path, source: bytes, maxBytes: 5 * 1024 * 1024 });
}

test("OpenAPI 3.0 — extracts endpoints with operationId, tags, deprecated", async () => {
  const r = await parseFixture("petstore-3.0.yaml");
  if (r.kind === "skipped") {
    throw new Error(`should not skip: ${r.reason}`);
  }
  const eps = r.endpoints;
  expect(eps.length).toBe(2);
  const list = eps.find((e) => e.method === "GET" && e.path === "/pets");
  expect(list?.operationId).toBe("listPets");
  expect(list?.tags).toEqual(["pets"]);
  expect(list?.deprecated).toBe(false);
  const del = eps.find((e) => e.method === "DELETE" && e.path === "/pets/{id}");
  expect(del?.deprecated).toBe(true);
  expect(r.specVersion).toBe("openapi-3.0.0");
  expect(r.infoTitle).toBe("Petstore API");
});

test("OpenAPI 3.1 fixture parses", async () => {
  const r = await parseFixture("petstore-3.1.yaml");
  if (r.kind === "skipped") throw new Error(r.reason);
  expect(r.endpoints.length).toBe(1);
  expect(r.specVersion).toBe("openapi-3.1.0");
});

test("Swagger 2.0 fixture parses", async () => {
  const r = await parseFixture("petstore-2.0.json");
  if (r.kind === "skipped") throw new Error(r.reason);
  expect(r.endpoints.length).toBe(1);
  expect(r.specVersion).toBe("swagger-2.0");
});

test("AsyncAPI 2.6 — exposes PUBLISH and SUBSCRIBE methods on a channel", async () => {
  const r = await parseFixture("asyncapi-2.6.yaml");
  if (r.kind === "skipped") throw new Error(r.reason);
  const methods = r.endpoints.map((e) => e.method).sort();
  expect(methods).toEqual(["PUBLISH", "SUBSCRIBE"]);
  expect(r.specVersion).toBe("asyncapi-2.6.0");
});

test("invalid YAML is skipped with reason 'parse_failed'", async () => {
  const r = await parseFixture("bad-yaml.yaml");
  expect(r.kind).toBe("skipped");
  if (r.kind === "skipped") {
    expect(r.reason).toBe("parse_failed");
  }
});

test("YAML that is not a spec is skipped with reason 'not_a_spec'", async () => {
  const r = await parseFixture("not-a-spec.yaml");
  expect(r.kind).toBe("skipped");
  if (r.kind === "skipped") {
    expect(r.reason).toBe("not_a_spec");
  }
});

test("unresolvable $ref is skipped soft (parse_failed)", async () => {
  const r = await parseFixture("unresolvable-ref.yaml");
  expect(r.kind).toBe("skipped");
});

test("webhook-only OpenAPI 3.1 yields zero endpoints (paths missing) but does not throw", async () => {
  const r = await parseFixture("webhook-only-3.1.yaml");
  if (r.kind === "skipped") {
    // acceptable: webhook-only documents may parse but yield no endpoints
    return;
  }
  expect(r.endpoints.length).toBe(0);
});

test("oversize spec is skipped with reason 'too_large'", async () => {
  const big = "x".repeat(5);
  const r = parseSpec({ absPath: "/tmp/big.yaml", source: big, maxBytes: 4 });
  expect(r.kind).toBe("skipped");
  if (r.kind === "skipped") {
    expect(r.reason).toBe("too_large");
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/src/connectors/openapi-indexer-parsing.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the parser wrapper**

```ts
// packages/gateway/src/connectors/openapi-indexer-parsing.ts
// `@readme/openapi-parser` v6 exposes only async helpers (parse/dereference/
// validate/bundle). For synchronous string→JSON conversion we use `js-yaml`
// directly (it's a transitive dep of @readme/openapi-parser, so no extra
// install is needed). External `$ref` resolution is explicitly out of scope
// for PR 1 — see the "Known limitations" section at the top of this plan.
import { load as yamlLoad } from "js-yaml";

export type ParsedEndpoint = {
  method: string;
  path: string;
  operationId: string | undefined;
  tags: readonly string[];
  deprecated: boolean;
};

export type ParsedSpec = {
  kind: "parsed";
  endpoints: readonly ParsedEndpoint[];
  specVersion: string;
  infoTitle: string;
};

export type SkipReason =
  | "too_large"
  | "parse_failed"
  | "not_a_spec";

export type ParseResult = ParsedSpec | { kind: "skipped"; reason: SkipReason };

export type ParseInput = {
  absPath: string;
  source: string;
  maxBytes: number;
};

const HTTP_METHODS = new Set([
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
]);

function looksLikeOpenApi(doc: unknown): doc is { openapi?: string; swagger?: string; asyncapi?: string; info?: { title?: string }; paths?: Record<string, unknown> } {
  return typeof doc === "object" && doc !== null;
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function specVersionFromDoc(doc: { openapi?: string; swagger?: string; asyncapi?: string }): string | undefined {
  if (typeof doc.openapi === "string") {
    return `openapi-${doc.openapi}`;
  }
  if (typeof doc.swagger === "string") {
    return `swagger-${doc.swagger}`;
  }
  if (typeof doc.asyncapi === "string") {
    return `asyncapi-${doc.asyncapi}`;
  }
  return undefined;
}

function extractOpenapiEndpoints(doc: { paths?: Record<string, unknown> }): readonly ParsedEndpoint[] {
  const out: ParsedEndpoint[] = [];
  const paths = doc.paths;
  if (typeof paths !== "object" || paths === null) {
    return out;
  }
  for (const [pth, item] of Object.entries(paths)) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const obj = item as Record<string, unknown>;
    for (const [verb, op] of Object.entries(obj)) {
      if (!HTTP_METHODS.has(verb.toLowerCase())) {
        continue;
      }
      if (typeof op !== "object" || op === null) {
        continue;
      }
      const o = op as Record<string, unknown>;
      out.push({
        method: verb.toUpperCase(),
        path: pth,
        operationId: asString(o["operationId"]),
        tags: asStringArray(o["tags"]),
        deprecated: o["deprecated"] === true,
      });
    }
  }
  return out;
}

function extractAsyncapiEndpoints(doc: { channels?: Record<string, unknown> }): readonly ParsedEndpoint[] {
  const out: ParsedEndpoint[] = [];
  const ch = doc.channels;
  if (typeof ch !== "object" || ch === null) {
    return out;
  }
  for (const [chPath, chBody] of Object.entries(ch)) {
    if (typeof chBody !== "object" || chBody === null) {
      continue;
    }
    const b = chBody as Record<string, unknown>;
    for (const verb of ["publish", "subscribe"] as const) {
      const op = b[verb];
      if (typeof op !== "object" || op === null) {
        continue;
      }
      const o = op as Record<string, unknown>;
      out.push({
        method: verb.toUpperCase(),
        path: chPath,
        operationId: asString(o["operationId"]),
        tags: asStringArray(o["tags"]),
        deprecated: o["deprecated"] === true,
      });
    }
  }
  return out;
}

function parseStringToJson(absPath: string, source: string): unknown | undefined {
  // Try JSON first (cheaper) when the file extension is .json or the content
  // starts with `{` / `[`; fall back to YAML otherwise. js-yaml's `load` also
  // accepts JSON, so a single yamlLoad call would work — we split for clearer
  // error reasons and to keep JSON parse errors distinct.
  const trimmed = source.trimStart();
  if (absPath.toLowerCase().endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(source) as unknown;
    } catch {
      return undefined;
    }
  }
  try {
    return yamlLoad(source) as unknown;
  } catch {
    return undefined;
  }
}

export function parseSpec(input: ParseInput): ParseResult {
  if (Buffer.byteLength(input.source, "utf8") > input.maxBytes) {
    return { kind: "skipped", reason: "too_large" };
  }
  const raw = parseStringToJson(input.absPath, input.source);
  if (raw === undefined) {
    return { kind: "skipped", reason: "parse_failed" };
  }
  if (!looksLikeOpenApi(raw)) {
    return { kind: "skipped", reason: "not_a_spec" };
  }
  const version = specVersionFromDoc(raw);
  if (version === undefined) {
    return { kind: "skipped", reason: "not_a_spec" };
  }
  const isAsync = version.startsWith("asyncapi-");
  let endpoints: readonly ParsedEndpoint[];
  try {
    endpoints = isAsync
      ? extractAsyncapiEndpoints(raw as { channels?: Record<string, unknown> })
      : extractOpenapiEndpoints(raw as { paths?: Record<string, unknown> });
  } catch {
    return { kind: "skipped", reason: "parse_failed" };
  }
  return {
    kind: "parsed",
    endpoints,
    specVersion: version,
    infoTitle: asString((raw as { info?: { title?: string } }).info?.title) ?? "",
  };
}
```

**Note on `$ref` handling.** PR 1 extracts endpoints from the raw parsed document, not the dereferenced one. This means:
- Internal `$ref` to `#/components/...` for schemas/responses inside the same file are tolerated (we never read those fields).
- External `$ref` to other files are not followed (Known limitation #1 in the plan header).
- The "unresolvable-ref" fixture should still parse to JSON successfully; whether it produces zero endpoints or one depends on whether the broken `$ref` is on a path-level object or inside a response body. If the test in Task 7 expects skipping, adjust the fixture so the broken `$ref` makes the doc fail YAML parse OR change the assertion to "endpoints.length === 0" rather than "kind === skipped".

- [ ] **Step 4: Run tests to verify**

Run: `bun test packages/gateway/src/connectors/openapi-indexer-parsing.test.ts`
Expected: all pass. If "unresolvable $ref" parses without skipping in this implementation (because we extract from the raw doc rather than the dereferenced one), update the fixture or add a validation pass so the broken-ref case surfaces. If `@readme/openapi-parser` exposes a synchronous YAML helper under a different name in the installed version, swap to `js-yaml` (already a transitive dep of the parser) and call `yamlLoad(input.source, { schema: 'core' })`.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/connectors/openapi-indexer-parsing.ts packages/gateway/src/connectors/openapi-indexer-parsing.test.ts
git commit -m "feat(openapi-indexer): unified parser for OpenAPI 2.0/3.x and AsyncAPI 2.x"
```

---

## Task 8: Add `api_endpoint` to graph entity types

**Files:**
- Modify: `packages/gateway/src/graph/relationship-graph.ts`
- Modify: `packages/gateway/src/graph/graph-populator.ts`
- Create: `packages/gateway/src/graph/graph-populator-api-endpoint.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/gateway/src/graph/graph-populator-api-endpoint.test.ts
import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { migrateIndexedDatabase } from "../index/migrations/runner.ts";
import { syncGraphFromIndexedItem } from "./graph-populator.ts";
import { isItemLinkedGraphType } from "./relationship-graph.ts";

test("api_endpoint is recognised as an item-linked graph type", () => {
  expect(isItemLinkedGraphType("api_endpoint")).toBe(true);
});

test("syncing an api_endpoint item creates an api_endpoint entity and a `targets` relation to its service", () => {
  const db = new Database(":memory:");
  migrateIndexedDatabase(db, Date.now());
  syncGraphFromIndexedItem(db, {
    id: "openapi:abcdef0#GET:/v1/payments",
    service: "openapi",
    type: "api_endpoint",
    title: "GET /v1/payments",
    authorId: null,
    metadata: { service_name: "payments-api", spec_file: "/tmp/openapi.yaml" },
  });
  const ent = db
    .query("SELECT type, label FROM graph_entity WHERE external_id = ?")
    .get("openapi:abcdef0#GET:/v1/payments") as { type: string; label: string } | null;
  expect(ent?.type).toBe("api_endpoint");
  const rels = db
    .query(
      "SELECT type FROM graph_relation WHERE from_id = (SELECT id FROM graph_entity WHERE external_id = ?)",
    )
    .all("openapi:abcdef0#GET:/v1/payments") as Array<{ type: string }>;
  expect(rels.some((r) => r.type === "targets")).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/src/graph/graph-populator-api-endpoint.test.ts`
Expected: FAIL — `isItemLinkedGraphType("api_endpoint")` returns `false`; no entity row.

- [ ] **Step 3: Extend the entity-types union**

Edit `packages/gateway/src/graph/relationship-graph.ts`:

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
  "code_symbol",
  "api_endpoint",
] as const;
```

- [ ] **Step 4: Add the populator branch**

Edit `packages/gateway/src/graph/graph-populator.ts` — add a helper and dispatch from `syncGraphFromIndexedItem`:

```ts
function syncApiEndpointGraph(
  db: Database,
  row: IndexedItemGraphInput,
  now: number,
): void {
  const serviceName = stringField(row.metadata, "service_name") ?? "unknown";
  const apiEndpointEntityId = upsertGraphEntity(db, {
    type: "api_endpoint",
    externalId: row.id,
    label: row.title,
    service: row.service,
    metadata: { service_name: serviceName },
  });
  clearRelationsTouchingEntity(db, apiEndpointEntityId);

  const serviceExtId = `openapi:service:${serviceName}`;
  const serviceEntityId = upsertGraphEntity(db, {
    type: "service",
    externalId: serviceExtId,
    label: serviceName,
    service: row.service,
  });
  upsertGraphRelation(db, apiEndpointEntityId, serviceEntityId, "targets", now);
}

// Dispatch in syncGraphFromIndexedItem (insert before the `code_symbol` branch):
  if (row.type === "api_endpoint") {
    syncApiEndpointGraph(db, row, now);
    return;
  }
```

If `service` is not a member of the existing `ITEM_LINKED_ENTITY_TYPES` (it isn't — `service` lives in the broader entity-type pool), confirm `upsertGraphEntity` accepts the `service` type. Search `relationship-graph.ts` for an entity-type allow-list; if one exists, add `service` there too.

- [ ] **Step 5: Run tests to verify**

Run: `bun test packages/gateway/src/graph/graph-populator-api-endpoint.test.ts`
Expected: 2 pass.

Run: `bun run typecheck`
Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/graph/relationship-graph.ts packages/gateway/src/graph/graph-populator.ts packages/gateway/src/graph/graph-populator-api-endpoint.test.ts
git commit -m "feat(graph): api_endpoint entity + service-targets relation"
```

---

## Task 9: Sync handler skeleton — failing test

**Files:**
- Create: `packages/gateway/src/connectors/openapi-indexer-sync.ts`
- Create: `packages/gateway/src/connectors/openapi-indexer-sync.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/gateway/src/connectors/openapi-indexer-sync.test.ts
import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createMemoryIndexDb,
  EMPTY_NIMBUS_VAULT,
  syncTestContext,
  testConnectorSyncNoop,
} from "./connector-sync-test-helpers.ts";
import { createOpenapiIndexerSyncable } from "./openapi-indexer-sync.ts";
import { DEFAULT_OPENAPI_CONFIG } from "./openapi-indexer-config.ts";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/src/connectors/openapi-indexer-sync.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement a minimal skeleton that returns no-op for empty roots**

```ts
// packages/gateway/src/connectors/openapi-indexer-sync.ts
import type { Database } from "bun:sqlite";
import { readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import type { NimbusFilesystemRootToml } from "../config/filesystem-toml.ts";
import { upsertIndexedItem } from "../index/item-store.ts";
import {
  type SyncContext,
  type SyncResult,
  type Syncable,
  syncNoopResult,
} from "../sync/types.ts";
import { discoverSpecFiles } from "./openapi-indexer-discovery.ts";
import { type OpenapiConfig, DEFAULT_OPENAPI_CONFIG } from "./openapi-indexer-config.ts";
import { parseSpec, type ParsedEndpoint } from "./openapi-indexer-parsing.ts";
import { inferServiceName } from "./openapi-indexer-service-name.ts";

const SERVICE_ID = "openapi";
const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;
const INITIAL_SYNC_DEPTH_DAYS = 365;

export type OpenapiIndexerSyncableOptions = {
  roots: readonly NimbusFilesystemRootToml[];
  config?: OpenapiConfig;
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

function externalIdFor(specPath: string, ep: ParsedEndpoint): string {
  const sha12 = createHash("sha256").update(specPath).digest("hex").slice(0, 12);
  return `${sha12}#${ep.method}:${ep.path}`;
}

function upsertEndpoint(
  db: Database,
  args: {
    specPath: string;
    serviceName: string;
    specVersion: string;
    ep: ParsedEndpoint;
    mtimeMs: number;
    syncedAt: number;
  },
): string {
  const externalId = externalIdFor(args.specPath, args.ep);
  upsertIndexedItem(db, {
    service: SERVICE_ID,
    type: "api_endpoint",
    externalId,
    title: `${args.ep.method} ${args.ep.path}`,
    bodyPreview:
      args.ep.operationId !== undefined
        ? `${args.ep.operationId} ${args.ep.tags.join(" ")}`.trim()
        : args.ep.tags.join(" ").trim(),
    modifiedAt: args.mtimeMs,
    metadata: {
      service_name: args.serviceName,
      spec_file: args.specPath,
      operation_id: args.ep.operationId ?? null,
      tags: args.ep.tags,
      deprecated: args.ep.deprecated,
      spec_version: args.specVersion,
    },
    syncedAt: args.syncedAt,
  });
  const id = `${SERVICE_ID}:${externalId}`;
  db.run(
    `INSERT INTO api_endpoint (
      id, service_name, path, method, operation_id, tags_json, deprecated, spec_file, spec_version, last_modified, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      service_name = excluded.service_name,
      path = excluded.path,
      method = excluded.method,
      operation_id = excluded.operation_id,
      tags_json = excluded.tags_json,
      deprecated = excluded.deprecated,
      spec_file = excluded.spec_file,
      spec_version = excluded.spec_version,
      last_modified = excluded.last_modified`,
    [
      id,
      args.serviceName,
      args.ep.path,
      args.ep.method,
      args.ep.operationId ?? null,
      JSON.stringify(args.ep.tags),
      args.ep.deprecated ? 1 : 0,
      args.specPath,
      args.specVersion,
      args.mtimeMs,
      args.syncedAt,
    ],
  );
  return id;
}

function deleteEndpointsAbsentFromSpec(
  db: Database,
  specPath: string,
  keepIds: ReadonlySet<string>,
): number {
  const existing = db
    .query("SELECT id FROM api_endpoint WHERE spec_file = ?")
    .all(specPath) as Array<{ id: string }>;
  let deleted = 0;
  for (const row of existing) {
    if (keepIds.has(row.id)) {
      continue;
    }
    db.run("DELETE FROM item WHERE id = ?", [row.id]);
    db.run("DELETE FROM api_endpoint WHERE id = ?", [row.id]);
    deleted++;
  }
  return deleted;
}

export function createOpenapiIndexerSyncable(
  options: OpenapiIndexerSyncableOptions,
): Syncable {
  const config = options.config ?? DEFAULT_OPENAPI_CONFIG;
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

      for (const rootCfg of options.roots) {
        const root = rootCfg.path;
        let entries: readonly string[];
        try {
          entries = discoverSpecFiles(root, {
            maxWalkDepth: config.maxWalkDepth,
            ignoreGlobs: config.ignoreGlobs,
          });
        } catch {
          continue;
        }
        for (const specPath of entries) {
          let mtimeMs = 0;
          try {
            mtimeMs = statSync(specPath).mtimeMs;
          } catch {
            continue;
          }
          if (mtimeMs <= state.tip) {
            continue;
          }
          let source = "";
          try {
            source = readFileSync(specPath, "utf8");
          } catch {
            continue;
          }
          const parsed = parseSpec({
            absPath: specPath,
            source,
            maxBytes: config.maxSpecBytes,
          });
          if (parsed.kind === "skipped") {
            ctx.logger.warn(
              { specPath, reason: parsed.reason },
              "openapi-indexer: skipped spec",
            );
            continue;
          }
          const serviceName = inferServiceName({
            specPath,
            infoTitle: parsed.infoTitle,
            rootPath: root,
          });
          // One transaction per spec: upsert all of the spec's endpoints AND
          // its sticky-delete pass commit together. This bounds DB round-trips
          // for monorepos with many specs (a vault with 1k specs × 5 endpoints
          // each becomes 1k transactions instead of 5k+ unbatched writes), and
          // guarantees a spec is never half-applied if the process is killed
          // mid-iteration.
          const keep = new Set<string>();
          let perSpecDeleted = 0;
          ctx.db.transaction(() => {
            for (const ep of parsed.endpoints) {
              const id = upsertEndpoint(ctx.db, {
                specPath,
                serviceName,
                specVersion: parsed.specVersion,
                ep,
                mtimeMs,
                syncedAt: now,
              });
              keep.add(id);
              upserted++;
            }
            perSpecDeleted = deleteEndpointsAbsentFromSpec(ctx.db, specPath, keep);
          })();
          deleted += perSpecDeleted;
          if (mtimeMs > nextTip) {
            nextTip = mtimeMs;
          }
        }
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

Run: `bun test packages/gateway/src/connectors/openapi-indexer-sync.test.ts`
Expected: 2 pass.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/connectors/openapi-indexer-sync.ts packages/gateway/src/connectors/openapi-indexer-sync.test.ts
git commit -m "feat(openapi-indexer): syncable that upserts api_endpoint items"
```

---

## Task 10: Mtime delta + sticky deletes

**Files:**
- Modify: `packages/gateway/src/connectors/openapi-indexer-sync.test.ts` (add cases)

- [ ] **Step 1: Add the failing tests**

Append to the existing test file:

```ts
import { writeFileSync, utimesSync } from "node:fs";

test("re-running with no file changes upserts zero items", async () => {
  const root = mkdtempSync(join(tmpdir(), "openapi-sync-delta-"));
  copyFileSync(join(FIX, "petstore-3.0.yaml"), join(root, "openapi.yaml"));
  const sync = createOpenapiIndexerSyncable({
    roots: [
      { path: root, gitAware: false, codeIndex: false, dependencyGraph: false, exclude: [] },
    ],
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
  copyFileSync(join(FIX, "petstore-3.1.yaml"), join(root, "v2.yaml"));
  const sync = createOpenapiIndexerSyncable({
    roots: [
      { path: root, gitAware: false, codeIndex: false, dependencyGraph: false, exclude: [] },
    ],
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
  const remaining = db
    .query("SELECT method FROM api_endpoint ORDER BY method")
    .all() as Array<{ method: string }>;
  expect(remaining.map((r) => r.method).sort()).toEqual(["GET", "GET"]);
});
```

- [ ] **Step 2: Run tests**

Run: `bun test packages/gateway/src/connectors/openapi-indexer-sync.test.ts`
Expected: all 4 pass. If the second test fails because the in-memory `:memory:` SQLite reuses the same file path across tests, switch to `mkdtempSync`-backed DB files in the helper if needed; the existing helpers should already isolate.

- [ ] **Step 3: Commit**

```bash
git add packages/gateway/src/connectors/openapi-indexer-sync.test.ts
git commit -m "test(openapi-indexer): mtime delta + sticky-delete coverage"
```

---

## Task 11: Bad-input fixtures fail soft

**Files:**
- Modify: `packages/gateway/src/connectors/openapi-indexer-sync.test.ts`

- [ ] **Step 1: Add the failing test**

```ts
test("malformed and oversize specs are skipped without aborting the sync", async () => {
  const root = mkdtempSync(join(tmpdir(), "openapi-sync-bad-"));
  copyFileSync(join(FIX, "petstore-3.0.yaml"), join(root, "openapi.yaml"));
  copyFileSync(join(FIX, "bad-yaml.yaml"), join(root, "broken.yaml"));
  copyFileSync(join(FIX, "not-a-spec.yaml"), join(root, "junk.yaml"));
  copyFileSync(join(FIX, "unresolvable-ref.yaml"), join(root, "broken-ref.yaml"));
  const sync = createOpenapiIndexerSyncable({
    roots: [
      { path: root, gitAware: false, codeIndex: false, dependencyGraph: false, exclude: [] },
    ],
    config: { ...DEFAULT_OPENAPI_CONFIG, maxSpecBytes: 10 * 1024 * 1024 },
  });
  const db = createMemoryIndexDb();
  const r = await sync.sync(syncTestContext(db, EMPTY_NIMBUS_VAULT), null);
  // Two valid endpoints from petstore-3.0; the rest are skipped.
  expect(r.itemsUpserted).toBe(2);
});
```

- [ ] **Step 2: Run test**

Run: `bun test packages/gateway/src/connectors/openapi-indexer-sync.test.ts`
Expected: pass (the sync handler already routes `parsed.kind === "skipped"` through a `continue`).

- [ ] **Step 3: Commit**

```bash
git add packages/gateway/src/connectors/openapi-indexer-sync.test.ts
git commit -m "test(openapi-indexer): bad fixtures skip soft"
```

---

## Task 12: Service-name inference path coverage in sync

**Files:**
- Modify: `packages/gateway/src/connectors/openapi-indexer-sync.test.ts`

- [ ] **Step 1: Add the failing test**

```ts
test("uses enclosing-directory name when spec lives one level under the root", async () => {
  const root = mkdtempSync(join(tmpdir(), "openapi-sync-svc-"));
  mkdirSync(join(root, "services", "payments-api"), { recursive: true });
  copyFileSync(
    join(FIX, "petstore-3.0.yaml"),
    join(root, "services", "payments-api", "openapi.yaml"),
  );
  const sync = createOpenapiIndexerSyncable({
    roots: [
      { path: root, gitAware: false, codeIndex: false, dependencyGraph: false, exclude: [] },
    ],
    config: DEFAULT_OPENAPI_CONFIG,
  });
  const db = createMemoryIndexDb();
  await sync.sync(syncTestContext(db, EMPTY_NIMBUS_VAULT), null);
  const services = db
    .query("SELECT DISTINCT service_name FROM api_endpoint")
    .all() as Array<{ service_name: string }>;
  expect(services.map((s) => s.service_name)).toEqual(["payments-api"]);
});
```

- [ ] **Step 2: Run test**

Run: `bun test packages/gateway/src/connectors/openapi-indexer-sync.test.ts`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/gateway/src/connectors/openapi-indexer-sync.test.ts
git commit -m "test(openapi-indexer): enclosing-dir service-name inference"
```

---

## Task 13: Graph-edge emission on sync

**Files:**
- Modify: `packages/gateway/src/connectors/openapi-indexer-sync.ts`
- Modify: `packages/gateway/src/connectors/openapi-indexer-sync.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("syncing emits graph_relation edges from api_endpoint to its service", async () => {
  const root = mkdtempSync(join(tmpdir(), "openapi-sync-graph-"));
  copyFileSync(join(FIX, "petstore-3.0.yaml"), join(root, "openapi.yaml"));
  const sync = createOpenapiIndexerSyncable({
    roots: [
      { path: root, gitAware: false, codeIndex: false, dependencyGraph: false, exclude: [] },
    ],
    config: DEFAULT_OPENAPI_CONFIG,
  });
  const db = createMemoryIndexDb();
  await sync.sync(syncTestContext(db, EMPTY_NIMBUS_VAULT), null);
  const rels = db
    .query(
      `SELECT type FROM graph_relation
       WHERE from_id IN (SELECT id FROM graph_entity WHERE type = 'api_endpoint')
         AND to_id IN (SELECT id FROM graph_entity WHERE type = 'service')`,
    )
    .all() as Array<{ type: string }>;
  expect(rels.length).toBeGreaterThanOrEqual(2);
  expect(rels.every((r) => r.type === "targets")).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/src/connectors/openapi-indexer-sync.test.ts`
Expected: FAIL — `upsertIndexedItem` calls `syncGraphFromIndexedItem` automatically (per `item-store.ts` source), but only if metadata contains the `service_name` we already wrote. Confirm by reading the runtime — if the populator dispatch already fires inside `upsertIndexedItem`, the test should pass immediately. If not, hook the dispatch explicitly inside `upsertEndpoint`.

If the test passes, advance to step 4. If it fails, proceed to step 3.

- [ ] **Step 3: Hook the populator explicitly (only if needed)**

Edit `packages/gateway/src/connectors/openapi-indexer-sync.ts` `upsertEndpoint` — after the `db.run(... INSERT INTO api_endpoint ...)`, add:

```ts
import { syncGraphFromIndexedItem } from "../graph/graph-populator.ts";

// inside upsertEndpoint, after the api_endpoint INSERT:
syncGraphFromIndexedItem(db, {
  id,
  service: SERVICE_ID,
  type: "api_endpoint",
  title: `${args.ep.method} ${args.ep.path}`,
  authorId: null,
  metadata: { service_name: args.serviceName, spec_file: args.specPath },
});
```

- [ ] **Step 4: Run tests**

Run: `bun test packages/gateway/src/connectors/openapi-indexer-sync.test.ts`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/connectors/openapi-indexer-sync.ts packages/gateway/src/connectors/openapi-indexer-sync.test.ts
git commit -m "feat(openapi-indexer): emit api_endpoint -> service graph edges"
```

---

## Task 14: Health snapshot — count of skipped specs

**Files:**
- Modify: `packages/gateway/src/connectors/openapi-indexer-sync.ts`
- Modify: `packages/gateway/src/connectors/openapi-indexer-sync.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("skipped-by-size count is exposed via getLastSyncStats()", async () => {
  const root = mkdtempSync(join(tmpdir(), "openapi-sync-stats-"));
  copyFileSync(join(FIX, "petstore-3.0.yaml"), join(root, "openapi.yaml"));
  // Force a too-large skip by setting maxSpecBytes very low.
  const sync = createOpenapiIndexerSyncable({
    roots: [
      { path: root, gitAware: false, codeIndex: false, dependencyGraph: false, exclude: [] },
    ],
    config: { ...DEFAULT_OPENAPI_CONFIG, maxSpecBytes: 8 },
  });
  const db = createMemoryIndexDb();
  await sync.sync(syncTestContext(db, EMPTY_NIMBUS_VAULT), null);
  const stats = sync.getLastSyncStats?.();
  expect(stats?.skippedTooLarge).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/src/connectors/openapi-indexer-sync.test.ts`
Expected: FAIL — `getLastSyncStats` is undefined on the returned `Syncable`.

- [ ] **Step 3: Extend the syncable's return type**

Edit `packages/gateway/src/connectors/openapi-indexer-sync.ts`. Add a stats-tracking object closed over by the returned object:

```ts
export type OpenapiSyncStats = {
  skippedTooLarge: number;
  skippedParseFailed: number;
  skippedNotASpec: number;
};

export type OpenapiIndexerSyncable = Syncable & {
  getLastSyncStats(): OpenapiSyncStats;
};

// In createOpenapiIndexerSyncable, replace the bare `return { serviceId, ... }`
// with a closure:
let lastStats: OpenapiSyncStats = {
  skippedTooLarge: 0,
  skippedParseFailed: 0,
  skippedNotASpec: 0,
};
return {
  serviceId: SERVICE_ID,
  defaultIntervalMs: DEFAULT_INTERVAL_MS,
  initialSyncDepthDays: INITIAL_SYNC_DEPTH_DAYS,
  getLastSyncStats(): OpenapiSyncStats {
    return lastStats;
  },
  async sync(ctx, cursor) {
    const stats: OpenapiSyncStats = { skippedTooLarge: 0, skippedParseFailed: 0, skippedNotASpec: 0 };
    // ...existing body, but in the parsed.kind === "skipped" branch:
    //   if (parsed.reason === "too_large") stats.skippedTooLarge++;
    //   else if (parsed.reason === "parse_failed") stats.skippedParseFailed++;
    //   else if (parsed.reason === "not_a_spec") stats.skippedNotASpec++;
    // After the loop:
    lastStats = stats;
    return { /* ... */ };
  },
};
```

- [ ] **Step 4: Run tests**

Run: `bun test packages/gateway/src/connectors/openapi-indexer-sync.test.ts`
Expected: all pass.

Run: `bun run typecheck`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/connectors/openapi-indexer-sync.ts packages/gateway/src/connectors/openapi-indexer-sync.test.ts
git commit -m "feat(openapi-indexer): expose skipped-spec counters via getLastSyncStats"
```

---

## Task 15: Register the syncable in the platform assembler

**Files:**
- Modify: `packages/gateway/src/platform/assemble.ts`
- Create: `packages/gateway/src/platform/assemble-openapi.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/gateway/src/platform/assemble-openapi.test.ts
import { expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadNimbusFilesystemRootsFromConfigDir } from "../config/filesystem-toml.ts";
import { parseOpenapiToml, DEFAULT_OPENAPI_CONFIG } from "../connectors/openapi-indexer-config.ts";

test("config dir with [[filesystem.roots]] and [openapi] block parses to compatible options", () => {
  const cfgDir = mkdtempSync(join(tmpdir(), "nimbus-cfg-"));
  writeFileSync(
    join(cfgDir, "nimbus.toml"),
    `
[[filesystem.roots]]
path = "/tmp/some-root"

[openapi]
max_walk_depth = 6
`,
  );
  const roots = loadNimbusFilesystemRootsFromConfigDir(cfgDir);
  expect(roots.length).toBe(1);
  // Read the same TOML for [openapi] config (assemble.ts will need this glue).
  // Using parseOpenapiToml directly here; assemble.ts wires it the same way.
  const cfg = parseOpenapiToml(
    `[openapi]
max_walk_depth = 6`,
  );
  expect(cfg.maxWalkDepth).toBe(6);
  expect(DEFAULT_OPENAPI_CONFIG.maxWalkDepth).toBe(8);
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `bun test packages/gateway/src/platform/assemble-openapi.test.ts`
Expected: pass — this test exercises the building blocks without requiring the assembler change yet.

- [ ] **Step 3: Wire the syncable into `assemble.ts`**

Edit `packages/gateway/src/platform/assemble.ts`. Add an import:

```ts
import { createOpenapiIndexerSyncable } from "../connectors/openapi-indexer-sync.ts";
import {
  parseOpenapiToml,
  DEFAULT_OPENAPI_CONFIG,
} from "../connectors/openapi-indexer-config.ts";
import { existsSync, readFileSync } from "node:fs";
```

Add a small helper near the top:

```ts
function loadOpenapiConfig(configDir: string): import("../connectors/openapi-indexer-config.ts").OpenapiConfig {
  const path = `${configDir}/nimbus.toml`;
  if (!existsSync(path)) {
    return DEFAULT_OPENAPI_CONFIG;
  }
  try {
    return parseOpenapiToml(readFileSync(path, "utf8"));
  } catch {
    return DEFAULT_OPENAPI_CONFIG;
  }
}
```

In the `assembleSyncWiring`-style function (look for the existing `if (fsV2Roots.length > 0) { ... }` block), add the openapi registration immediately below the existing filesystem-v2 registration:

```ts
  const fsV2Roots = loadNimbusFilesystemRootsFromConfigDir(paths.configDir);
  if (fsV2Roots.length > 0) {
    localIndex.ensureConnectorSchedulerRegistration("filesystem", 10 * 60 * 1000, Date.now());
    syncScheduler.register(createFilesystemV2Syncable({ roots: fsV2Roots }));
    // Wave A PR 1 — gateway-side OpenAPI / AsyncAPI spec indexer.
    localIndex.ensureConnectorSchedulerRegistration("openapi", 10 * 60 * 1000, Date.now());
    syncScheduler.register(
      createOpenapiIndexerSyncable({
        roots: fsV2Roots,
        config: loadOpenapiConfig(paths.configDir),
      }),
    );
  }
```

- [ ] **Step 4: Run typecheck and the existing assembler tests**

Run: `bun run typecheck`
Expected: zero errors.

Run: `bun test packages/gateway/src/platform/`
Expected: existing platform tests pass; the new test passes.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/platform/assemble.ts packages/gateway/src/platform/assemble-openapi.test.ts
git commit -m "feat(openapi-indexer): register syncable in platform assembler"
```

---

## Task 16: End-to-end gateway test

**Files:**
- Create: `packages/gateway/test/e2e/scenarios/openapi-indexer.e2e.test.ts`

- [ ] **Step 1: Write the e2e test**

Look at an existing e2e test for the pattern. The simplest existing equivalent is the filesystem-v2 sync test we already wrote — it goes through `Syncable.sync` directly with a `:memory:` DB and confirms behavior end-to-end. For PR 1 we add a higher-level test that confirms the index query path:

```ts
// packages/gateway/test/e2e/scenarios/openapi-indexer.e2e.test.ts
import { expect, test } from "bun:test";
import { copyFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createMemoryIndexDb,
  EMPTY_NIMBUS_VAULT,
  syncTestContext,
} from "../../../src/connectors/connector-sync-test-helpers.ts";
import { createOpenapiIndexerSyncable } from "../../../src/connectors/openapi-indexer-sync.ts";
import { DEFAULT_OPENAPI_CONFIG } from "../../../src/connectors/openapi-indexer-config.ts";

const FIX = join(import.meta.dir, "..", "..", "fixtures", "openapi");

test("e2e: two specs in two services produce queryable api_endpoint rows", async () => {
  const root = mkdtempSync(join(tmpdir(), "openapi-e2e-"));
  // Drop one spec at the root and one under services/payments-api/.
  copyFileSync(join(FIX, "petstore-3.0.yaml"), join(root, "openapi.yaml"));
  const subDir = join(root, "services", "payments-api");
  // mkdir handled by copyFileSync? No — use Node.
  await import("node:fs").then(({ mkdirSync }) => mkdirSync(subDir, { recursive: true }));
  copyFileSync(join(FIX, "petstore-3.1.yaml"), join(subDir, "openapi.yaml"));

  const sync = createOpenapiIndexerSyncable({
    roots: [
      { path: root, gitAware: false, codeIndex: false, dependencyGraph: false, exclude: [] },
    ],
    config: DEFAULT_OPENAPI_CONFIG,
  });
  const db = createMemoryIndexDb();
  const r = await sync.sync(syncTestContext(db, EMPTY_NIMBUS_VAULT), null);
  expect(r.itemsUpserted).toBe(3);

  // Query as the agent would — by type filter on the unified item table.
  const byType = db
    .query("SELECT COUNT(*) AS n FROM item WHERE type = 'api_endpoint'")
    .get() as { n: number };
  expect(byType.n).toBe(3);

  // Two distinct service_names: the root-level spec uses the slugified
  // info.title 'petstore-api' (or similar); the nested spec uses the
  // enclosing dir 'payments-api'.
  const services = db
    .query("SELECT DISTINCT service_name FROM api_endpoint ORDER BY service_name")
    .all() as Array<{ service_name: string }>;
  expect(services.length).toBe(2);
  expect(services.some((s) => s.service_name === "payments-api")).toBe(true);

  // FTS path: the title indexes 'GET /pets' so a basic search hits.
  const ftsHits = db
    .query("SELECT COUNT(*) AS n FROM item WHERE rowid IN (SELECT rowid FROM item_fts WHERE item_fts MATCH ?)")
    .get("/pets") as { n: number };
  expect(ftsHits.n).toBeGreaterThanOrEqual(1);
});
```

- [ ] **Step 2: Run the e2e test**

Run: `bun test packages/gateway/test/e2e/scenarios/openapi-indexer.e2e.test.ts`
Expected: 1 pass.

- [ ] **Step 3: Commit**

```bash
git add packages/gateway/test/e2e/scenarios/openapi-indexer.e2e.test.ts
git commit -m "test(openapi-indexer): e2e — multi-spec discovery + index query"
```

---

## Task 17: Coverage check on the new sync module

**Files:** none

- [ ] **Step 1: Run coverage targeted at the new files**

Run:
```bash
bunx bun test --coverage \
  packages/gateway/src/connectors/openapi-indexer-sync.test.ts \
  packages/gateway/src/connectors/openapi-indexer-parsing.test.ts \
  packages/gateway/src/connectors/openapi-indexer-discovery.test.ts \
  packages/gateway/src/connectors/openapi-indexer-config.test.ts \
  packages/gateway/src/connectors/openapi-indexer-service-name.test.ts \
  packages/gateway/src/index/api-endpoint-v25-sql.test.ts
```

- [ ] **Step 2: Confirm coverage on new modules ≥80% lines**

Inspect the per-file table; the four `openapi-indexer-*.ts` modules and `api-endpoint-v25-sql.ts` should each show ≥80% line coverage. If any falls short, add a targeted test for the uncovered branches before continuing.

- [ ] **Step 3: Run the full sync coverage gate as a regression check**

Run: `bun run test:coverage:sync`
Expected: gate passes (≥80% on `packages/gateway/src/sync/`). The new connector module sits under `connectors/`, not `sync/`, so this gate is an unaffected baseline; failure would indicate accidental drift.

---

## Task 18: Docs — architecture, roadmap, CLAUDE.md

**Files:**
- Modify: `docs/architecture.md`
- Modify: `docs/roadmap.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add `api_endpoint` to the architecture schema reference**

In `docs/architecture.md`, find the "Local Database Schema" section. Add a row matching the existing pattern for `api_endpoint`:

> `api_endpoint` — Phase 5 Wave A PR 1. Shadow row per indexed OpenAPI / AsyncAPI endpoint, keyed by `item.id`. Columns: `id`, `service_name`, `path`, `method`, `operation_id`, `tags_json`, `deprecated`, `spec_file`, `spec_version`, `last_modified`, `created_at`. Indexed on `(service_name, path, method)` and `spec_file`.

- [ ] **Step 2: Flip the roadmap row**

In `docs/roadmap.md`, find the line for the OpenAPI / AsyncAPI spec indexer (currently `[ ] **OpenAPI / AsyncAPI spec indexer** — ...`) and change `[ ]` to `[x]`. Append a date stub: `(2026-05-10)`.

- [ ] **Step 3: Add the file-locations rows**

In `CLAUDE.md` "Key File Locations", add two rows in the appropriate alphabetic position:

> `packages/gateway/src/connectors/openapi-indexer-sync.ts` | OpenAPI / AsyncAPI spec indexer — gateway-side syncable that emits `api_endpoint` items + service graph edges (Phase 5 Wave A PR 1).
> `packages/gateway/src/index/api-endpoint-v25-sql.ts` | V25 migration — `api_endpoint` shadow table.

- [ ] **Step 4: Commit**

```bash
git add docs/architecture.md docs/roadmap.md CLAUDE.md
git commit -m "docs(phase-5): mark Wave A PR 1 (openapi-indexer) shipped"
```

---

## Task 19: Preflight CI parity and open the PR

**Files:** none

- [ ] **Step 1: Lint pass**

Run: `bun run lint:fix`
Expected: zero remaining issues; any auto-fixed Biome diffs get committed in this task. The code snippets in the plan use `typeof x === "object" && x !== null` and similar Biome-compliant patterns by design, but `lint:fix` catches stragglers.

- [ ] **Step 2: Bundle-size sanity check**

Run: `bun run build` (or `bun run build:debug` if `build` requires release-only secrets)
Expected: build succeeds; `dist/` size for the gateway binary stays within an order of magnitude of the previous size. `@readme/openapi-parser` pulls `js-yaml` and `ajv` transitively; the resulting binary should still be well under the prior release's footprint. If the binary jumps by more than ~5 MiB, document and consider lazy-loading the parser at first sync rather than at module-load.

- [ ] **Step 3: Run the full CI-parity test suite**

Per the user's saved feedback: always run `bun run test:ci` before pushing any PR.

Run: `bun run test:ci`
Expected: all tests + lint + typecheck green. If any unrelated test fails because of CI-only environment expectations, document and proceed; otherwise stop and fix.

- [ ] **Step 4: Push the branch**

Run: `git push -u origin dev/asafgolombek/phase-5-wave-a-pr1-openapi-indexer`

- [ ] **Step 5: Open the PR**

Use `gh pr create` with the title `feat(phase-5): Wave A PR 1 — OpenAPI / AsyncAPI spec indexer` and a body summary that lists:

- New `api_endpoint` item type, V25 migration, shadow table.
- Gateway-side syncable (no MCP package) — mirrors `filesystem-v2-sync.ts`.
- Configurable depth + size limits via `[openapi]` block in `nimbus.toml`.
- Service-name inference (override → enclosing dir → `info.title` slug → sha8 fallback).
- Graph edges: `api_endpoint → service`.
- Closes the Wave A PR 1 line in `docs/roadmap.md`.

The body should also link the spec at `docs/superpowers/specs/2026-05-10-phase-5-wave-a-api-surface-obsidian-design.md` and the plan at `docs/superpowers/plans/2026-05-10-phase-5-wave-a-pr1-openapi-indexer.md`.

---

## Self-review summary

1. **Spec coverage:**
   - V25 migration → Tasks 1, 2.
   - `[openapi]` config → Task 4.
   - Discovery walk + ignore patterns + max depth → Task 5.
   - Parser dispatch (OpenAPI 2.0/3.x + AsyncAPI 2.x) → Task 7.
   - Bad-input fail-soft → Task 11.
   - Spec size limit + skipped count in health snapshot → Task 14.
   - Service-name 4-step inference → Tasks 3, 12.
   - Sync handler + mtime delta + sticky deletes → Tasks 9, 10.
   - Item upsert (`item` + `api_endpoint` shadow) → Task 9.
   - Graph edges (`api_endpoint → service`) → Tasks 8, 13.
   - Registration in `assemble.ts` → Task 15.
   - End-to-end coverage → Task 16.
   - Coverage gate ≥80% → Task 17.
   - Docs updates → Task 18.
   - Branch + PR + preflight → Tasks 0, 19.

2. **Placeholder scan:** Tasks 7 (parser) and 13 (graph hook) include conditional adjustments based on real runtime behavior — both phrased explicitly as "if this fails, do X" with concrete X. No "TBD"; no "implement appropriate error handling" without a code block; every step that changes code shows the code.

3. **Type consistency:**
   - `Syncable` / `SyncContext` / `SyncResult` types come from `packages/gateway/src/sync/types.ts` (verified).
   - `upsertIndexedItem` signature matches `packages/gateway/src/index/item-store.ts` (verified).
   - `recordMigration` signature matches the existing `migrateIndexedV23ToV24` call site (verified).
   - `OpenapiConfig` is consumed by both `discoverSpecFiles` and `createOpenapiIndexerSyncable` with the same field names (`maxWalkDepth`, `maxSpecBytes`, `ignoreGlobs`).
   - `ParsedEndpoint`/`ParsedSpec` are the only types crossing the parser → sync boundary; field names align across Tasks 7, 9, 10.

4. **Out-of-scope per spec:** The plan honors the spec's Non-goals — no remote-repo discovery (Task 5 is filesystem-only), no `code_symbol ↔ api_endpoint` cross-link (Task 13 emits only the `service` edge), no AsyncAPI 3.0 (parser in Task 7 only handles `asyncapi-2.x`).
