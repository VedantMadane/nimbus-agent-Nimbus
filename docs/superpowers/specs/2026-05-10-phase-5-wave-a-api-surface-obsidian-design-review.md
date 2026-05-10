# Review: Phase 5 — Wave A: API Surface + Obsidian Design

**Reviewer:** Gemini CLI
**Date:** 2026-05-10
**Status:** Feedback / Questions

This review covers the design for the `openapi-indexer` and `obsidian` connectors. The design is well-aligned with the Nimbus core mandates, particularly the use of first-party MCP connectors and the HITL gate for local filesystem writes.

## Open Questions & Suggestions

### PR 1 — `openapi-indexer` connector

1. **Discovery Performance:** For repositories with very deep directory structures, a recursive walk of all `[[filesystem.roots]]` might be expensive. 
   - *Suggestion:* Consider adding a `maxDepth` configuration (defaulting to e.g., 5 or 8) or allowing users to exclude specific patterns via `nimbus.openapi.toml`.
2. **Service Inference Fallback:** If `info.title` is missing and the spec is at the root of a filesystem root (no enclosing directory), what is the default service name? 
   - *Suggestion:* Use "default" or "unknown", but ensure it doesn't collide with other "unknown" services.
3. **AsyncAPI Version Support:** The design mentions an "AsyncAPI 2.x reader". AsyncAPI 3.0 has significant structural changes (e.g., `channels` and `operations` are decoupled).
   - *Question:* Should we aim for AsyncAPI 3.0 support in PR 1, or is that explicitly deferred to "Phase 5 Extended"?
4. **Large Spec Files:** The design mentions skipping specs > 5 MB. 
   - *Question:* Is this 5 MB limit configurable? Some enterprise OpenAPI specs (especially those generated from large Java/C# mono-repos) can exceed this.

### PR 2 — `obsidian` connector

1. **Vault ID Stability:** `vault-id` is derived from the absolute path. If a user moves their vault, all IDs change, which "orphans" any manual pins, comments, or manual relationship edges the user might have added in the Nimbus UI.
   - *Suggestion:* If Obsidian's `.obsidian/` folder contains a unique ID (it doesn't by default, but some plugins do), we could try to use that. Otherwise, we should warn that moving vaults is a "destructive" operation for Nimbus metadata.
2. **Wikilink Resolution Parity:** Obsidian's resolution logic is nuanced (shortest path, prefers current folder, etc.). 
   - *Suggestion:* The design should explicitly state if we are aiming for "best-effort" resolution or strict parity with Obsidian's internal `MetadataCache`.
3. **Daily Note Configuration:** The design mentions `.obsidian/daily-notes.json`. 
   - *Question:* What is the fallback if this file is missing? (Obsidian's default is the vault root). Also, does it support the `folder` and `format` settings from that JSON?
4. **`appendToDailyNote` Formatting:** 
   - *Question:* Does the append operation ensure a newline separator? Does it support prepending a timestamp or a specific "Nimbus" tag to indicate the source of the append?
5. **Content Indexing:** 
   - *Question:* Will the full text of Obsidian notes be indexed in the main `items` table for FTS/Semantic search? (The design mentions `api_endpoint` does this, but doesn't explicitly confirm for `obsidian_note`).
6. **Graph Edge Diffing:** In a large vault, re-emitting all wikilink edges on every sync could be noisy for the DB. 
   - *Suggestion:* Use the `last_modified` check to only re-process edges for changed notes, but ensure that "orphaned" edges (from deleted notes or removed links) are cleaned up.

### Cross-cutting / Security

1. **HITL Payload Transparency:** 
   - *Suggestion:* Ensure the HITL popup for `appendToDailyNote` displays the vault name/path and the note title (e.g., "Append to 'Daily/2026-05-10' in vault 'My Notes'"), not just the raw `vault_id`.
2. **V25/V26 Migration Order:** 
   - *Note:* If PR 1 and PR 2 land close together, ensure the migration numbers don't collide if other PRs are in flight. (Standard Nimbus process handles this, but worth a double-check).
