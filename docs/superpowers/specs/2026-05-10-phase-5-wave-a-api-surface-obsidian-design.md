# Phase 5 — Wave A: API Surface + Obsidian Design

> **Status:** Draft for review
> **Author:** asafgolombek
> **Date:** 2026-05-10
> **Type:** Sub-project design — Phase 5 Core item 3 (per [Phase 5 sequencing spec](./2026-05-06-phase-5-sequencing-design.md))
> **Sequenced after:** T3 — Team Intelligence (`expert` / `impact` / `catchup`) ✅
> **Sequenced before:** T4 — CI/CD Data Layer

## Purpose

Wave A delivers two read-only first-party MCP connectors that add `api_endpoint` and `obsidian_note` items to the local index. Both ride on `[[filesystem.roots]]` as the discovery surface, neither introduces a new credential, and both feed the relationship graph that Phase 5 T3's commands (`nimbus expert`, `nimbus impact`, `nimbus catchup`) already consume.

The graph payoff is the explicit reason this wave is sequenced before T4 / T6 / T2 in the [T1 sequencing spec](./2026-05-06-phase-5-sequencing-design.md): the cheapest read-only ships that most enrich the relationship graph.

## Non-goals

The following are explicitly **out of scope** for Wave A. They are deferred or moved to follow-up work, not "TODO".

1. **Remote-repo spec discovery** — no `getFileBytes` tool added to github/gitlab connectors. The OpenAPI indexer does not pull spec content from indexed remote repos in this wave. Re-evaluate at the end-of-Core checkpoint.
2. **`code_symbol` ↔ `api_endpoint` cross-linking** — the relationship-graph edge that connects an OpenAPI endpoint to the function that implements it is deferred until after T6's typed-`dbRun` migration cleans up the graph-edge write path.
3. **Obsidian plugins / canvas / database content** — only Markdown notes (`.md`) are indexed.
4. **AsyncAPI semantic validation** — the AsyncAPI parser produces structural items only; it does not validate channels against producer/consumer semantics.
5. **AsyncAPI 3.0 support** — PR 1 covers AsyncAPI **2.x only**. AsyncAPI 3.0 decouples `channels` from `operations` and requires a different reader; defer to a Phase 5 Extended pass once 3.0 adoption is observed in indexed corpora.
6. **Obsidian frontmatter `@mention` → `person` linking** — frontmatter is parsed and tags surfaced, but linking notes to people graph rows is deferred.
7. **Multi-vault per filesystem-root migration tooling** — nested vaults are supported, but there is no in-product tool to move notes between vaults.
8. **Vault-move recovery (`nimbus connector obsidian remap-vault`)** — Obsidian's `.obsidian/` directory has no built-in stable vault identifier, so `vault_id` is derived from the absolute path. Moving a vault therefore re-issues all `obsidian_note` IDs at the new path (delete-then-upsert). A future remap CLI command could preserve user-attached metadata across moves; out of scope here. The limitation is documented in PR 2 below.

## Settled decisions

These decisions framed the design and are not re-litigated below.

| # | Decision | Reason |
|---|---|---|
| D1 | **Spec shape — one Wave A spec, multi-PR plan** | Mirrors how T3 was specced as one epic with three PRs; cleaner than two specs sequencing each other. |
| D2 | **Both deliverables ship as first-party MCP connectors** | Matches `nimbus-connector-authoring.md` exactly; uniform lifecycle, registry, scaffold. Even though OpenAPI parsing is local, treating it as a connector keeps the engine ↔ data boundary clean (non-negotiable #4). |
| D3 | **Discovery is filesystem-only in PR 1** | Avoids expanding the github/gitlab MCP surface; dogfoodable in this very repo; remote-repo spec discovery is a clean follow-up if user demand emerges. |
| D4 | **Two PRs: OpenAPI then Obsidian** | Each PR fully shippable, matches T3 PR2/PR3 size, and OpenAPI's graph payoff lands first to enrich `nimbus impact` answers immediately. |
| D5 | **Obsidian's `appendToDailyNote` write path is in-scope for Wave A** | The T1 spec's "no write-capable connector before T2" rule (Section 2 rule 1) explicitly scopes to **Extended** waves. Posture C's sandbox concern is about untrusted remote credentials, not local filesystem writes the user owns. The HITL gate (invariant `I2`) is the structural defense for this path. |

## Architecture

Both connectors follow the standard Nimbus connector contract (`nimbus-connector-authoring.md`):

```
Engine (Mastra) ──► ToolExecutor ──► ConnectorDispatcher ──► MCP server process
                          │                                          │
                          └─ HITL gate (executor.ts)                 └─ filesystem only
                          │  (writes only — Obsidian append)         (no network)
```

Neither connector reads credentials. Neither makes a network call. Both are spawned by the lazy-mesh based on the presence of `[[filesystem.roots]]` and (for Obsidian) the discovery of at least one vault.

```
[[filesystem.roots]] ──► filesystem connector (existing)
                    │
                    ├──► openapi-indexer connector (Wave A PR 1)
                    │      └─ scans for openapi.* / swagger.* / asyncapi.* under each root
                    │      └─ emits `api_endpoint` items
                    │
                    └──► obsidian connector (Wave A PR 2)
                           └─ scans for `.obsidian/` directories under each root
                           └─ emits `obsidian_note` items + backlink edges
                           └─ exposes `appendToDailyNote` (HITL-gated write)
```

---

## PR 1 — `openapi-indexer` connector

| Aspect | Decision |
|---|---|
| Package | `packages/mcp-connectors/openapi-indexer/` |
| MCP server entry | `src/server.ts` → `dist/server.js` |
| Discovery | Recursive walk of `[[filesystem.roots]]`. Filename match (case-insensitive): `openapi.{yaml,yml,json}`, `swagger.{yaml,yml,json}`, `asyncapi.{yaml,yml,json}`. Default-ignored directory names: `node_modules/`, `.git/`, `dist/`, `build/`, `target/`, `.next/`, `out/`, `vendor/`, `.cache/`. Walk is depth-bounded: `[openapi].max_walk_depth` (default `8`) and a `[openapi].ignore_globs` array (default `[]`) are configurable in `nimbus.toml` so users with deep monorepos can adjust both bounds and exclusions. |
| Parser | `@readme/openapi-parser` (handles OpenAPI 2.0 / 3.0 / 3.1, including `$ref` resolution). A small in-tree AsyncAPI 2.x reader (parses `channels` + `operations` only — no semantic validation). AsyncAPI 3.0 is not supported in PR 1 (see Non-goals). |
| Item type | `api_endpoint` |
| `api_endpoint` fields | `path` (string), `method` (string — `GET`/`POST`/...; `PUBLISH`/`SUBSCRIBE` for AsyncAPI), `operationId` (string?), `tags` (string[]), `deprecated` (bool), `service` (string — inferred), `spec_file` (string — absolute path), `spec_version` (string — e.g. `openapi-3.1.0` / `asyncapi-2.6.0`), `last_modified` (unix ms) |
| Item ID format | `openapi:<sha256-of-absolute-spec-path-first-12-hex>#<METHOD>:<path>` — stable across syncs as long as the spec file is not moved. If the file is moved, the old IDs are deleted on the next sync and new IDs emitted at the new path; this is the same delete-then-upsert behavior used for endpoints removed from a re-parsed spec. |
| Service inference | (1) Per-spec override in a sibling `nimbus.openapi.toml` (`service = "..."`) if present; (2) spec file's enclosing directory name when the spec is not at a filesystem-root top level (e.g., `services/payments-api/openapi.yaml` → `payments-api`); (3) the spec's `info.title` slugified; (4) deterministic fallback `service-<sha256-of-absolute-spec-path-first-8-hex>` when none of the above produce a non-empty value — guarantees collision-freeness across roots when both the enclosing directory and `info.title` are missing. |
| MCP tools (read) | `list({ service?, deprecated? })`, `get({ id })`, `search({ query, limit })`. All three mandatory per `nimbus-connector-authoring.md`. |
| MCP tools (write) | None. No HITL declaration in manifest. |
| Sync handler | `ConnectorSyncHandler.sync(db, lastSyncToken)`: walk discovery roots, stat each candidate file, re-parse files whose mtime > `lastSyncToken`. Upsert endpoints by id. Delete endpoints absent from the new parse for any spec file that *was* re-parsed (sticky deletes — endpoints in unchanged spec files are preserved). `nextSyncToken` = max mtime seen. |
| DB migration | **V25** — adds `api_endpoints` shadow table (one row per endpoint with structured columns) plus standard `items` rows for cross-cutting search. Composite index on `(service, path, method)`. See migration detail below. |
| Graph edges | Emit `api_endpoint` → `service` (M:1) edges into the existing graph table on every upsert. `api_endpoint` → `repo_file` (M:1, via `spec_file`) is left as a future enrichment. |
| Coverage gate | ≥70% line (connector standard; see `nimbus-testing.md`). |
| Contract tests | `runContractTests()` from `@nimbus-dev/sdk` — manifest validity, mandatory tool surface, item-ID format, `SyncResult` shape. |
| Parsing fixture suite | OpenAPI 3.0, OpenAPI 3.1, Swagger 2.0, AsyncAPI 2.6 — at least one fixture per format with `$ref` resolution exercised. Plus an explicit **bad-input fixture suite**: invalid YAML, valid YAML that isn't a spec, OpenAPI with unresolvable `$ref`, OpenAPI 3.1 webhook-only doc, oversize spec (exceeds the configured limit) — each must fail soft and be skipped without aborting the sync. |
| Spec size limit | Configurable via `[openapi].max_spec_bytes` in `nimbus.toml` (default `5_242_880` = 5 MiB). Enterprise specs that exceed this can raise the limit; specs above the limit are skipped with a one-line warning and counted in the connector's health snapshot so users can see how many are silently skipped. |
| Integration test | Boot a real Gateway, point it at a temp `[[filesystem.roots]]` containing two specs, assert `api_endpoint` items appear in the index and a `list({ service: "..." })` call returns them. |

**Why this is a connector and not a gateway subsystem.** The non-negotiable says the engine never reads cloud APIs directly. Even though spec parsing is local, treating it as a connector keeps the boundary uniform — same lifecycle, same registry, same MCP surface, same scaffold (`nimbus scaffold extension`). The integration cost is one entry in `connectors/registry.ts`. The `CONNECTOR_VAULT_SECRET_KEYS` manifest is not touched, since the connector has no credentials.

### V25 migration detail

```sql
CREATE TABLE api_endpoints (
  id           TEXT PRIMARY KEY,           -- matches items.id
  service      TEXT NOT NULL,
  path         TEXT NOT NULL,
  method       TEXT NOT NULL,
  operation_id TEXT,
  tags_json    TEXT NOT NULL DEFAULT '[]', -- stringified string[]
  deprecated   INTEGER NOT NULL DEFAULT 0, -- 0/1
  spec_file    TEXT NOT NULL,
  spec_version TEXT NOT NULL,
  last_modified INTEGER NOT NULL,           -- unix ms
  created_at   INTEGER NOT NULL,
  CHECK (deprecated IN (0, 1))
);

CREATE INDEX idx_api_endpoints_service_path_method
  ON api_endpoints (service, path, method);

CREATE INDEX idx_api_endpoints_spec_file
  ON api_endpoints (spec_file);
```

Per `nimbus-db-migrations.md`: append-only schema, single transaction, pre-migration backup is automatic.

### Acceptance criteria — PR 1

- [ ] Package `packages/mcp-connectors/openapi-indexer/` created via `nimbus scaffold extension`.
- [ ] `nimbus.extension.json` declares `permissions: ["filesystem:read"]`, no `hitlRequired` entries.
- [ ] Mandatory `list`, `get`, `search` tools exposed; no write tools.
- [ ] Item IDs follow `openapi:<sha-prefix>#<METHOD>:<path>`.
- [ ] Parser fixture suite green for OpenAPI 3.0 / 3.1, Swagger 2.0, AsyncAPI 2.6 (AsyncAPI 3.0 explicitly skipped — see Non-goals).
- [ ] Bad-input fixture suite green: each malformed/oversized spec is skipped without aborting the sync.
- [ ] Discovery walk respects `[openapi].max_walk_depth` (default 8) and `[openapi].ignore_globs`; default-ignored directory list (`node_modules/`, `.git/`, `dist/`, `build/`, `target/`, `.next/`, `out/`, `vendor/`, `.cache/`) is exercised by a fixture with one of each.
- [ ] Spec-size threshold honors `[openapi].max_spec_bytes` (default 5 MiB); skipped-by-size count surfaces in the connector health snapshot.
- [ ] Service inference falls through the four-step chain (override → enclosing dir → `info.title` slug → `service-<sha8>` deterministic fallback); a fixture exercises each step.
- [ ] V25 migration applied; `api_endpoints` table and indexes present.
- [ ] `api_endpoint` → `service` graph edges emitted on upsert.
- [ ] `runContractTests()` green.
- [ ] Integration test: real Gateway + temp filesystem root + two specs → endpoints queryable.
- [ ] Coverage ≥70% on `packages/mcp-connectors/openapi-indexer/`.
- [ ] Connector registered in `packages/gateway/src/connectors/registry.ts`.
- [ ] `docs/architecture.md` schema reference updated with `api_endpoints` table row.
- [ ] `docs/roadmap.md` "OpenAPI / AsyncAPI spec indexer" line flipped to `[x]`.
- [ ] `CLAUDE.md` "Key File Locations" updated.
- [ ] Preflight `bun run test:ci` green before push.

---

## PR 2 — `obsidian` connector

| Aspect | Decision |
|---|---|
| Package | `packages/mcp-connectors/obsidian/` |
| MCP server entry | `src/server.ts` → `dist/server.js` |
| Discovery | Recursive walk of `[[filesystem.roots]]`. A directory is a vault iff it directly contains a `.obsidian/` directory. Nested vaults supported. Vaults under `node_modules/` / `.git/` ignored. |
| Item type | `obsidian_note` |
| `obsidian_note` fields | `vault_id` (string), `vault_name` (string — vault root directory's basename, used in HITL summaries), `path` (string — relative to vault), `title` (string — from `# H1` or filename), `frontmatter_json` (string — stringified YAML object), `tags` (string[]), `wikilinks` (string[] — resolved targets where possible), `daily_note_date` (string?, ISO date if filename matches a known daily-note pattern), `last_modified` (unix ms) |
| Item ID format | `obsidian:<vault-id>#<relative-path>` — `vault-id` = first 12 hex of sha256 of absolute vault root path. **Caveat:** moving a vault changes its absolute path and therefore re-issues all `vault-id`s, which deletes and re-upserts every note's `obsidian_note` row at the new ID. Any user-attached metadata (manual pins, comments, manual graph edges in the UI) is orphaned. Obsidian itself does not provide a stable vault GUID, so there is no avoiding this without writing a Nimbus marker into the user's vault — which we explicitly choose not to do. A future `nimbus connector obsidian remap-vault <old-path> <new-path>` migration command may bridge old and new IDs; out of scope for PR 2. |
| Vault detection | Presence of `.obsidian/` directory at the vault root (Obsidian's own marker). |
| Body content indexing | The full Markdown body of each note (frontmatter stripped) is indexed in the standard `items` table (so it is reachable by FTS5 hybrid search and semantic search via the existing item-text → embedding path). The `obsidian_notes` shadow table holds structured metadata only (no body); body lives in `items.text` exactly as it does for every other indexed item type. This matches `api_endpoint`'s wiring: structured columns in the shadow table, full searchable surface in `items`. |
| MCP tools (read) | `list({ vault?, tag? })`, `get({ id })`, `search({ query, limit })`. Three mandatory tools. |
| MCP tools (write) | `appendToDailyNote({ content, vault_id })` — **HITL gated**. Resolves the daily-note destination via the chain in "Daily-note location" below. Always appends — never overwrites. If the destination file is non-empty and does not end in `\n`, a leading newline is prepended to keep separation. The connector does **not** auto-prepend a timestamp or a "Nimbus" attribution tag; the caller (Engine / agent prompt) is responsible for whatever provenance text it wants written, so the user sees exactly what gets appended in the HITL preview. If the destination file does not exist, it is created with the appended content as the entire body. |
| Daily-note location | Resolution chain: (1) read `<vaultRoot>/.obsidian/daily-notes.json` if present; honour the `folder` (relative path under vault root, default `""`) and `format` (Moment.js token string, default `"YYYY-MM-DD"`) keys; (2) fall back to `<vaultRoot>/<YYYY-MM-DD>.md` if the JSON is missing or malformed. Format tokens supported in PR 2: `YYYY`, `YY`, `MM`, `DD`, `HH`, `mm` (the most common subset; complex Moment locales are deferred). Unknown tokens fail soft, falling back to the default format and emitting a one-line warning at sync time. |
| HITL declaration | `obsidian:appendToDailyNote` added to `HITL_REQUIRED` frozen set in `packages/gateway/src/engine/executor.ts`. Manifest declares `hitlRequired: ["appendToDailyNote"]`. Server handler calls `server.assertHitlRequired()` at the top of `appendToDailyNote`. The HITL request `summary` field is built from `vault_name` + the resolved daily-note relative path (e.g., `Append to "Daily/2026-05-10.md" in vault "My Notes"`), never the raw `vault_id`, so the consent UI never asks the user to verify an opaque hash. |
| Backlinks | Parse `[[wikilink]]`, `[[wikilink#heading]]`, and `[[wikilink\|alias]]`. Resolution is **best-effort**, not strict parity with Obsidian's `MetadataCache`: PR 2 resolves a wikilink target by exact filename match (case-insensitive) within the same vault, falling back to exact title match. Obsidian's full shortest-path / current-folder-priority algorithm is not replicated — we accept that some ambiguous links will resolve differently than Obsidian's UI does, and document this in the connector README. Unresolved wikilinks are stored as raw strings in `wikilinks[]`. |
| Frontmatter | Parse YAML frontmatter (top-of-file `---` block). Surface `tags` and `aliases`. Other keys preserved in `frontmatter_json` for query but not first-class. |
| Sync handler | Mtime-based per-note. Markdown files are small enough that on-change full re-parse is acceptable (no incremental parse). `nextSyncToken` = max mtime seen across all vaults. |
| DB migration | **V26** — adds `obsidian_notes` shadow table; backlink edges land in the existing graph edge table (no new edge table). |
| Edge diffing | On a per-note re-parse: all existing graph edges originating from that note are deleted, then the freshly-resolved edges are inserted in the same transaction. On a per-note delete: all outgoing edges from the deleted note are removed, **and** edges pointing at the deleted note from other notes are also removed (cascade). Edge churn is therefore bounded by the per-note change set, not the whole vault. |
| Coverage gate | ≥70% line. |
| Contract tests | `runContractTests()` — including the HITL declaration check on `appendToDailyNote`. |
| Vault fixture | At minimum 10 notes covering: frontmatter with tags + aliases, wikilinks (resolved + unresolved + with-heading + with-alias), one daily note matching pattern `YYYY-MM-DD.md`, one note in a nested folder, one note with code-block-only content, one empty note. |
| HITL e2e | Boot Gateway with the obsidian connector + a fixture vault. Call `appendToDailyNote` via IPC. Assert (1) the action is gated through the consent channel, (2) the audit log entry is written *before* the file write, (3) the file is not modified until consent is granted, (4) reject leaves the file untouched and writes an audit entry with `hitl_status = 'rejected'`. |

### V26 migration detail

```sql
CREATE TABLE obsidian_notes (
  id                TEXT PRIMARY KEY,           -- matches items.id
  vault_id          TEXT NOT NULL,
  vault_name        TEXT NOT NULL,              -- vault root basename, used in HITL summaries
  path              TEXT NOT NULL,              -- relative to vault root
  title             TEXT NOT NULL,
  frontmatter_json  TEXT NOT NULL DEFAULT '{}',
  tags_json         TEXT NOT NULL DEFAULT '[]',
  wikilinks_json    TEXT NOT NULL DEFAULT '[]',
  daily_note_date   TEXT,                       -- ISO date or NULL
  last_modified     INTEGER NOT NULL,           -- unix ms
  created_at        INTEGER NOT NULL
);

CREATE INDEX idx_obsidian_notes_vault_path
  ON obsidian_notes (vault_id, path);

CREATE INDEX idx_obsidian_notes_daily_note_date
  ON obsidian_notes (daily_note_date)
  WHERE daily_note_date IS NOT NULL;
```

### HITL action and security-invariant impact

Adding `obsidian:appendToDailyNote` to `HITL_REQUIRED` is the first new action type added to the frozen set in this wave. Per `nimbus-security-invariants.md`'s **invariant triple rule**:

1. **Production wiring** — the action type is added to the static `HITL_REQUIRED_BACKING` source declaration in `engine/executor.ts`. The set is `Object.freeze`d and remains module-private. No runtime configuration. (Invariant `I2`.)
2. **Docs entry** — `docs/SECURITY-INVARIANTS.md` §I2 is updated to note the new action type if its action-type list is enumerated; the invariant statement itself does not change.
3. **Enforcement test** — the existing assertion in `packages/gateway/src/security-invariants.test.ts` that checks "every `HITL_REQUIRED` member triggers the consent channel" automatically covers the new action; we add a targeted unit test in the obsidian connector test suite that calls `appendToDailyNote` and asserts the gate fires before any filesystem mutation.

The gate consults `action.type === "obsidian:appendToDailyNote"` only — never `payload.mcpToolId` (invariant `I3`). `hitlStatus` is set only by the consent gate (invariant `I4`).

### Acceptance criteria — PR 2

- [ ] Package `packages/mcp-connectors/obsidian/` created via `nimbus scaffold extension`.
- [ ] `nimbus.extension.json` declares `permissions: ["filesystem:read", "filesystem:append-daily-note"]` and `hitlRequired: ["appendToDailyNote"]`.
- [ ] Mandatory `list`, `get`, `search` tools exposed.
- [ ] `appendToDailyNote` calls `server.assertHitlRequired()` at handler top.
- [ ] Item IDs follow `obsidian:<vault-id>#<relative-path>`.
- [ ] V26 migration applied; `obsidian_notes` table and indexes present.
- [ ] Wikilink resolution works for in-vault targets via the documented best-effort algorithm (filename → title); unresolved wikilinks preserved as raw strings.
- [ ] Backlink edges emitted into the graph table for resolved wikilinks only; per-note re-parse deletes-then-inserts the note's outgoing edges in one transaction; deleting a note cascades to incoming edges.
- [ ] Frontmatter `tags` + `aliases` surfaced in items.
- [ ] Daily-note destination resolves through the documented chain (`.obsidian/daily-notes.json` `folder` + `format` → fallback `<vaultRoot>/<YYYY-MM-DD>.md`).
- [ ] `appendToDailyNote` prepends a leading newline when the existing file does not end in one; never auto-prepends a timestamp or attribution tag.
- [ ] HITL summary for `appendToDailyNote` shows vault name + resolved daily-note relative path, not the raw `vault_id`.
- [ ] Note body content is reachable through the standard FTS5 hybrid-search path via the `items` table (verified by an integration test that searches a fixture vault and matches on body text).
- [ ] Vault-move limitation documented in the connector README and the spec's caveat is mirrored in `docs/architecture.md`'s `obsidian_notes` row.
- [ ] HITL e2e green: gate fires, audit log precedes write, reject leaves file untouched.
- [ ] `obsidian:appendToDailyNote` added to `HITL_REQUIRED` in `executor.ts`.
- [ ] `runContractTests()` green.
- [ ] Coverage ≥70% on `packages/mcp-connectors/obsidian/`.
- [ ] Connector registered in `packages/gateway/src/connectors/registry.ts`.
- [ ] `docs/architecture.md` schema reference updated with `obsidian_notes` table row.
- [ ] `docs/SECURITY-INVARIANTS.md` updated if §I2's action-type enumeration is touched.
- [ ] `docs/roadmap.md` "Obsidian vault connector" line flipped to `[x]`.
- [ ] `CLAUDE.md` "Key File Locations" updated.
- [ ] Preflight `bun run test:ci` green before push.

---

## Cross-cutting requirements (both PRs)

| Concern | Action |
|---|---|
| Connector authoring contract | Both follow `nimbus-connector-authoring.md`. |
| Migration contract | Both follow `nimbus-db-migrations.md` — V25 then V26, sequential, no gaps. |
| HITL contract | PR 2 follows `nimbus-security-invariants.md`'s triple rule. |
| Test placement | All tests follow `nimbus-testing.md` layer rules. |
| Phase boundary | This is Phase 5 work — does not touch any Phase 4 unfinished item. |
| Architecture doc | New tables added to "Local Database Schema" in `docs/architecture.md`. |
| Roadmap | Each PR flips its own line in `docs/roadmap.md` Phase 5 → Wave A; Wave A is "done" when both lines are `[x]`. |
| CLAUDE.md | "Key File Locations" gets one row per package and one row per migration. |
| Preflight | Both PRs run `bun run test:ci` before push (per `feedback_preflight_before_pr.md`). |

## Sequencing

```
T3 ✅
  └─► PR 1 — openapi-indexer (this design)
        └─► PR 2 — obsidian (this design)
              └─► T4 — CI/CD Data Layer (next sub-project)
```

**Wave A is "done"** when both PRs are merged to `main`, both roadmap lines are `[x]`, and the `docs/architecture.md` schema reference has both new tables. There is no re-planning checkpoint inside Wave A — the next checkpoint is "End of T6 / before T2" per the [T1 sequencing spec](./2026-05-06-phase-5-sequencing-design.md#re-planning-checkpoints).

## Out-of-scope items, formally restated

These are deferred — not "TODO" — and are not blockers for declaring Wave A done:

- Remote-repo spec discovery (would require expanding github/gitlab MCP surface; defer until user demand).
- `code_symbol` ↔ `api_endpoint` cross-linking (depends on T6 typed-`dbRun` migration).
- Obsidian frontmatter `@mention` → `person` linking (defer to a Phase 5 Extended pass after Wave B).
- AsyncAPI semantic validation (parser produces structural items only).
- Obsidian plugin / canvas / database content (markdown notes only).

If any of these surface as user requests during Wave A implementation, they are added to the bottom of the Phase 5 Extended queue per the T1 spec's scope-guard rule, not inserted into Wave A.
