# Review: Phase 5 Wave A — PR 2: Obsidian Vault Connector Implementation Plan

**Reviewers:** Gemini CLI (initial pass) + Claude (verification + fix-or-defer pass)
**Date:** 2026-05-10
**Status:** All findings have a verdict — `✅ Fixed inline` (plan edited) or `⏭ Deferred` (rationale recorded).

The plan covers every spec requirement, but two passes uncovered eleven findings: **five real bugs** that would have stalled the engineer, **five deliberate trade-offs** worth recording, and **one style/consistency note**. Each is below with a verdict.

Mirrors the structure of [`2026-05-10-phase-5-wave-a-pr1-openapi-indexer-review.md`](./2026-05-10-phase-5-wave-a-pr1-openapi-indexer-review.md).

---

## Verdict legend

- **✅ Fixed inline** — the plan has been edited; the engineer who follows it will not hit this issue.
- **⏭ Deferred** — known, acceptable for PR 2; the rationale is captured here so a future reviewer doesn't re-flag it.
- **👍 Praise** — non-issue; called out so reviewers' mental models match the writer's.

---

## Findings — bugs (must fix)

### F1 — Wrong consent-channel shape and execute-error contract in Task 17 — **✅ Fixed inline**

**Severity:** correctness — the test as originally written would not compile against the real interfaces and would fail even when the code under test was correct.

**What was wrong:** the original Task 17 test mocked `consent.request: async () => ({ status: "approved" })`, but the real interface (verified at `packages/gateway/src/engine/executor.ts:185, 199–217`) is:

```ts
interface ConsentChannel {
  requestApproval(prompt: string, details?: Record<string, unknown>): Promise<boolean>;
}
```

— returns a boolean, not a `{ status }` object. Worse, `ToolExecutor.execute()` (executor.ts:244–249) **does not throw** on rejection — it returns `Promise<ActionResult>` with `{ status: "rejected", reason }`. The original test asserted `.rejects.toBeDefined()`; that assertion would fail even when the gate worked correctly.

**Fix applied (Task 17):** rewrote the tests to:
- Mock `consent.requestApproval = async () => true | false`.
- Expect `execute()` to return an `ActionResult` and assert `result.status === "rejected"` instead of awaiting a throw.
- Compare call-order via spies on `recordAudit` and `dispatch` to verify executor.ts:228–247's "audit BEFORE dispatch" contract.

### F2 — Path-traversal in `obsidian_get` — **✅ Fixed inline**

**Severity:** security — a user-controlled `path` argument could read arbitrary files outside the vault. Read tools are not HITL-gated, so this is unmitigated.

**What was wrong:** Task 15's `obsidian_get` handler called `readFileSync(join(v.root, rel))` where `rel` came directly from `parsed.path` (user input). A caller passing `"../../../etc/passwd"` reads outside the vault.

**Fix applied (Task 15):** added an `assertWithinVault(vaultRoot, relPath)` helper that resolves the candidate via `path.resolve` and asserts the result starts with `vaultRoot + path.sep`. Throws on traversal. The same guard is applied defensively in `obsidian_append_to_daily_note` (Task 16) — even though the daily-note path is server-derived, the `folder` field in user-supplied `daily-notes.json` could contain `..` segments. HITL is the structural defense for the write path, but defense-in-depth is cheap.

### F3 — `CURRENT_SCHEMA_VERSION` bump was missing — **✅ Fixed inline**

**Severity:** correctness — production DBs would never apply V26 on Gateway startup.

**What was wrong:** original Task 2 only added the migration step to `INDEXED_SCHEMA_STEPS`. But `LocalIndex.ensureSchema(db)` calls `runIndexedSchemaMigrations(db, LocalIndex.SCHEMA_VERSION)`, and `SCHEMA_VERSION` is `CURRENT_SCHEMA_VERSION` (in `local-index.ts`), pinned at `25`. Without bumping that constant, the runner sees `targetVersion = 25` and exits before reaching the V26 step.

**Fix applied (Task 2 step 4):** added an explicit step to bump `CURRENT_SCHEMA_VERSION` from `25` to `26`. The new test in Task 2 now verifies `user_version === 26` after a fresh-DB sync, which catches the regression.

PR 1's plan likely had the same wiring shape and the engineer caught it at implementation time; flagging here so PR 2 doesn't repeat.

### F4 — Wrong migration-runner export name — **✅ Fixed inline**

**Severity:** correctness — the test would not compile.

**What was wrong:** original Tasks 2 and 9 imported `migrateIndexedDatabase` from `./runner.ts`. That export does not exist. The actual export is `runIndexedSchemaMigrations(db, targetVersion, backupOptions?)` (verified at `runner.ts:601`).

**Fix applied:**
- Task 2: imports `runIndexedSchemaMigrations`, calls it as `runIndexedSchemaMigrations(db, 26)`. Test shape now mirrors `runner-v25.test.ts` exactly.
- Task 9: `freshDb()` helper now uses `createMemoryIndexDb()` (which calls `LocalIndex.ensureSchema` → `runIndexedSchemaMigrations`) instead of the non-existent function.

### F11 — `require("node:path")` inside an ESM test — **✅ Fixed inline**

**Severity:** correctness — Bun's ESM mode does not provide a synchronous `require` for built-ins; the test would throw at evaluation.

**What was wrong:** Task 7's third test asserted `out.absolutePath.endsWith("Daily/2026-05-10.md".replaceAll("/", require("node:path").sep))` in an attempt to be platform-agnostic. The `require()` call would fail in the Bun ESM test runner.

**Fix applied (Task 7):** rewrote the assertion as `out.absolutePath.replaceAll("\\", "/").endsWith("Daily/2026-05-10.md")` — forward-slash both sides, no module re-import needed.

---

## Findings — deliberate trade-offs (deferred)

### F5 — Daily-note format helper duplicated across gateway and MCP — **⏭ Deferred**

**Severity:** maintenance.

**What's there:** Task 7 (`obsidian-daily-note.ts`) and Task 16 (the MCP server) both implement `formatDailyNoteFilename` and the `daily-notes.json` reader. ~30 lines duplicated.

**Why deferred:** the gateway-side helper lives in the gateway workspace; the MCP server is a sibling Bun workspace. Sharing code requires either:
- exporting from `@nimbus-dev/sdk` (out of scope for PR 2 — the SDK is for community extensions, not first-party-MCP shared utilities), or
- adding the helper to `packages/mcp-connectors/shared/mcp-tool-kit.ts` (plausible, but `mcp-tool-kit.ts` is currently HTTP/JSON-shaped; daily-note format is a different category and would need design alignment with future filesystem-anchored connectors).

The duplicate is small, fully-typed, and unit-tested on the gateway side. Gemini CLI noted: "this is the correct way to keep the MCP package self-contained and independent of gateway-internal modules" — which agrees with the deferral.

**Action when this becomes wrong:** if a third caller appears (e.g., Apple Calendar or a generic IMAP daily-summary connector), extract into `packages/mcp-connectors/shared/daily-note.ts` and use it from both sides.

### F6 — MCP read tools walk filesystem on every call — **⏭ Deferred**

**Severity:** performance.

**What's there:** Task 15's `obsidian_list` and `obsidian_search` walk the vault filesystem and parse every `.md` file every time they're invoked. For a 10,000-note vault, that's ~10 k stat calls + reads per agent query.

**Why deferred:** the `nimbus-connector-authoring.md` skill makes `list`/`get`/`search` a hard contract — every MCP connector must expose them. They are correct as a fallback. The agent's primary read path for indexed content is the gateway's `searchLocalIndex` tool (sub-millisecond, hits `item` + `item_fts`), which is what `nimbus expert` / `nimbus impact` already use for any large-vault query.

**Mitigation included in Task 15:** `obsidian_list` honours `limit` (default 200, max 500); `obsidian_search` honours `limit` (default 50, max 200). Both bound worst-case work.

**Action when this becomes wrong:** if `obsidian_search` becomes a hot path for a real user, swap its body for a query against the gateway's `item_fts` table — this requires the MCP to either reach the gateway's DB (it can't directly) or proxy through a new IPC method.

### F7 — Two-pass parse holds every note in memory simultaneously (Gemini) — **⏭ Deferred**

**Severity:** memory pressure on very large vaults.

**What's there:** Task 10's syncable does a two-pass parse: pass 1 parses every note to populate the in-vault wikilink resolver index (`byFilenameLower`, `byTitleLower`); pass 2 decides which need upserting based on mtime and resolves wikilinks. The parsed-note objects sit in `parsedNotes: IndexedNote[]` for the duration of the per-vault transaction.

**Why deferred:** for a 10,000-note vault with average 5 KiB notes (a generously-large estimate), `parsedNotes` peaks at ~50 MiB. This is well below any realistic OOM threshold on the platforms Nimbus runs on. The two-pass approach is what makes wikilink resolution correct — single-pass would resolve some links incorrectly because the target index is not yet built when the source note is parsed.

**Action when this becomes wrong:** if a user reports memory pressure on a >50 k-note vault, the optimization Gemini suggested is correct — first pass extracts only `(relPath, title)` into the resolver index; second pass full-parses only mtime-newer notes. The full-parse pass becomes proportional to *changed* notes, not vault size.

### F8 — Wikilink filename ambiguity ("Meeting.md" in two folders) (Gemini) — **⏭ Deferred**

**Severity:** correctness for a small fraction of users.

**What's there:** Task 5's wikilink resolver uses `basename(relPath).toLowerCase()` as the index key. A vault with `Work/Meeting.md` and `Personal/Meeting.md` will collide — the index holds one of them, last-writer-wins.

**Why deferred:** Obsidian's full resolver is a shortest-path algorithm parameterised by the *source note's folder* — it's significantly more code and is explicitly out of scope per the spec ("best-effort, not strict parity with Obsidian's `MetadataCache`"). The plan's Known Limitations §2 calls this out and points users at the connector README. Strict parity is a follow-up.

**Action when this becomes wrong:** if a user reports broken backlinks in the Tauri UI, surface the unresolved wikilinks at the consent-flow level (so the user sees what failed) and add a "shortest-path" mode behind a config flag.

### F9 — Vault-move re-indexes everything (spec-acknowledged, plan-acknowledged) — **⏭ Deferred**

**Severity:** UX surprise.

**What's there:** `vault_id = sha256(absoluteVaultRootPath).slice(0, 12)`. Renaming/moving a vault re-issues every note id; manual pins and graph annotations are orphaned.

**Why deferred:** the spec explicitly accepts this in Non-goal §8 and the plan calls it out in Known Limitations §1, in `docs/architecture.md` (Task 21), and in the connector README. Obsidian itself provides no stable vault GUID; the alternative is writing a Nimbus marker into the user's vault, which we explicitly choose not to do.

**Action when this becomes wrong:** when a user reports orphaned metadata after a vault move, build the `nimbus connector obsidian remap-vault <old> <new>` migration command the spec mentions.

---

## Findings — style and polish

### F10 — Search-result snippet does not strip Markdown syntax (Gemini) — **⏭ Deferred**

**Severity:** LLM input quality.

**What's there:** Task 15's `obsidian_search` returns `body.slice(start, start + 240)` as the snippet. Markdown syntax (`[[wikilinks]]`, `# headings`, code-fence backticks) bleeds into the snippet, costing tokens and confusing the LLM.

**Why deferred:** the Gateway's `<tool_output>` envelope (invariant `I11`) wraps every tool result before it reaches the LLM, and the LLM is fine-tuned to handle Markdown noise. The snippet is also bounded at 240 chars. The improvement is small and post-MVP.

**Action when this becomes wrong:** if `obsidian_search` results are visibly degrading agent answers, add a tiny strip pass that removes `[[`/`]]` framing characters and converts `# H1` → bare text. Keep code blocks intact (they have semantic meaning).

---

## Praise

### 👍 The spec-vs-codebase contradictions are called out in their own subsection

The plan's "Spec adjustments — read before starting" table explicitly diverges from three places where the design spec drifted from the codebase: action-type punctuation (`obsidian:appendToDailyNote` → `obsidian.note.append`, matching `notion.block.append`), `nimbus.extension.json` (does not exist for first-party connectors), and `server.assertHitlRequired()` (does not exist anywhere). A reviewer can read the table and immediately know whether to push back or not.

### 👍 Cascade-on-delete is explicit in Task 10

`deleteNotesAbsentFromVault` drops the `obsidian_notes` row, the `item` row, the matching `graph_entity` row, **and** any `graph_relation` rows that touch it. This avoids dangling graph-relation rows pointing at dropped notes — a class of bug the existing `clearRelationsTouchingEntity` in `graph-populator.ts` doesn't catch on its own (it only handles outgoing edges of a re-synced note, not edges *to* a deleted note).

### 👍 Nested-vault discovery is correctly handled (Gemini concur)

Task 4's `walkForNotes` stops recursion when a sub-directory is itself a vault — so the inner vault's notes belong to its own row in `obsidian_notes`, not its parent's. The walker also identifies the inner vault as a separate entry in `discoverVaults`. This is the correct Obsidian behavior and the test in Task 4 step 1 covers it explicitly.

---

## Plan changes summary

| Task | Change | Finding |
|---|---|---|
| 2 | Replaced `migrateIndexedDatabase` with `runIndexedSchemaMigrations`; added new step 4 to bump `CURRENT_SCHEMA_VERSION` 25 → 26; expanded test count from 2 → 3; commit message updated. | F3, F4 |
| 9 | `freshDb()` helper now uses `createMemoryIndexDb()` instead of the non-existent `migrateIndexedDatabase`. | F4 |
| 15 | Added `assertWithinVault` path-traversal guard helper; applied in `obsidian_get`. | F2 |
| 16 | Same guard applied defensively in `obsidian_append_to_daily_note`. | F2 |
| 17 | Rewrote HITL e2e test against the real `ConsentChannel.requestApproval` shape and `ToolExecutor.execute` non-throwing return contract. Added explicit comment that the test mirrors `executor.ts:228–247` for audit-precedes-dispatch ordering. | F1 |
| 7  | Replaced `require("node:path").sep` in the assertion with a forward-slash normalisation that works in Bun ESM. | F11 |
| 21 | Step 4 changed from conditional "verify before editing" to definitive "skip this file" with the §I2 line:lines reference. Commit's `git add` no longer touches `SECURITY-INVARIANTS.md`. The "Files Modified" header now lists it under "Verified-untouched". | (separate plan-clarity find recorded above as part of the F-series) |

(The deferred findings F5–F10 require no plan edit — their rationale is recorded here for future readers.)

---

## Going forward

The plan is now consistent with the codebase as of `b732fc1` (current `main` HEAD at plan-write time). If another in-flight PR moves `CURRENT_SCHEMA_VERSION` past 25 before this PR opens, the engineer should treat that as a rebase conflict — bump to N+1, not blindly to 26 — and the V26 step's `fromVersion` should track. The same applies to the migration-step number generally.

If the engineer hits drift not anticipated here, prefer fixing inline and pushing a small `chore(plan)` commit on the branch rather than re-running the plan-review loop.

The next architectural risk that lands after PR 2 ships is the absolute-path-derived `vault_id`. The first user who moves a vault and notices orphaned graph metadata is the trigger for the `nimbus connector obsidian remap-vault` follow-up; it is not on the roadmap yet, but should be added when that user appears.
