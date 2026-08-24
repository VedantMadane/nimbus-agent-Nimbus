# Design Review: Connector Extraction (Project A)

**Date:** 2026-08-24  
**Status:** Design Review / Feedback  
**Target Spec:** [2026-08-24-connector-extraction-design.md](./2026-08-24-connector-extraction-design.md)

---

## 1. Summary of Feedback

The proposed design for **Connector Extraction** is a solid path toward achieving third-party distribution, monorepo hygiene, and contributor velocity. By utilizing dependency injection (`SyncContext`), it successfully keeps security-critical chokepoints and the Vault within the gateway while allowing the sync and mapping intelligence to move out.

This review highlights several crucial details to address in the injection interface before proceeding, specifically:

- Secret retrieval for non-OAuth connectors.
- Custom database table access for filesystem/local-only connectors (`obsidian`, `openapi-indexer`).
- Return values for person resolution.
- Standalone execution credential pathways.

---

## 2. Detailed Feedback & Open Questions

### Q1. Secret Retrieval for Non-OAuth Connectors

The proposed `SyncContext` provides specific OAuth helpers (`googleAccessToken()`, `microsoftAccessToken()`). However, dozens of other connectors (Jira, Confluence, Airflow, ArgoCD, Slack, etc.) require custom secrets such as API keys, tokens, usernames, and passwords via `readConnectorSecret(ctx.vault, serviceId, keyName)`.

- **Concerns:**
  - Since `vault/*` stays in the gateway and credentials cannot leave the gateway, the connector package has no direct access to `NimbusVault`.
  - If the context does not supply a way to retrieve service-specific secrets, these syncables will fail to authenticate.
- **Suggestions:**
  - Add a scoped secret-retrieval helper to `SyncContext`:

    ```ts
    getSecret(keyName: string): Promise<string | null>;
    ```

  - In the gateway's implementation of `SyncContext`, automatically prefix and scope this lookup to the caller's service ID (e.g., when the `jira` connector sync calls `ctx.getSecret("api_token")`, the gateway resolves it to the vault key `jira.api_token`). This prevents one connector from reading secrets belonging to another.

---

### Q2. DB Access for Special-Case Connectors (`obsidian`, `openapi-indexer`)

As highlighted in §6, `obsidian-sync.ts` and `openapi-indexer-sync.ts` write directly to custom DB tables (`obsidian_notes`, `obsidian_links`, `api_endpoint`) using `dbRun(ctx.db, ...)`.

- **Concerns:**
  - Since `db/*` is staying in the gateway, these files cannot import `dbRun` or query `ctx.db` directly once moved to `@nimbus-dev/connectors`.
  - Exposing raw DB access (`ctx.db` or a raw SQL execution method on the context) would bypass the dependency inversion boundary and violate monorepo isolation.
- **Suggestions:**
  - **Option A (Recommended):** Add high-level, structured upsert/delete methods on `SyncContext` for these specific local-only indexes:

    ```ts
    upsertObsidianNote(note: ObsidianNoteInput): Promise<void>;
    upsertApiEndpoint(endpoint: ApiEndpointInput): Promise<void>;
    ```

    This keeps the SQL dialect and database schema mapping entirely inside the gateway, leaving the connector to only gather and parse spec files/notes.
  - **Option B:** Provide a strictly scoped query execution helper on `SyncContext` (e.g., `runMigrationQuery`), though this is harder to sandbox and audit.

---

### Q3. Person Resolution & Linker Integration

`resolvePersonForSync` (used by Jira, GitHub, GitLab, etc. to map contributors) returns a `string | null` representing the resolved `personId`. This ID is then set as the `authorId` on the `IndexedItem` (e.g., `jiraIndexOneIssue`).

- **Concerns:**
  - The proposed `SyncContext` defines `linkPeople(input: PersonLinkInput): Promise<void>`. Because it returns `void`, the connector cannot retrieve the resolved `personId` to attach to its items.
- **Suggestions:**
  - Change the interface signature to return the ID:

    ```ts
    resolvePerson(hints: PersonSyncHints): Promise<string | null>;
    ```

---

### Q4. Standalone Mode vs. Sync Mode Credentials

Goal 1 allows third parties to run connectors standalone via an MCP client (e.g. `npx @nimbus-dev/connectors <connector-id>`).

- **Concerns:**
  - In standalone mode (off-gateway), there is no gateway `SyncContext` to supply secrets.
  - Standalone execution runs the tool/MCP server, not the sync loop. The MCP server reads credentials directly from process env vars (e.g., `GITHUB_PAT`).
- **Suggestions:**
  - Define a clean separation:
    - **Sync engine code:** Only executes inside the gateway using the injected `SyncContext`.
    - **MCP/Tool code:** Executes in standalone or spawned mode, reading credentials from process environment variables.
  - Ensure the shared SDK types or base configurations clearly document this boundary so third-party developers do not try to run or configure the sync loop outside the gateway.

---

### Q5. Skew Detection Gate (`audit:connector-version-skew`)

Section 8 recommends a drift/skew gate to ensure the gateway's pinned connector version matches the registry.

- **Suggestions:**
  - Define a concrete check `audit:connector-version-skew` that compares the package version in `packages/gateway/package.json` against the latest published version of `@nimbus-dev/connectors` on npm (or our private registry), failing CI on minor/major mismatches.
  - Wire this check directly into the path-resolving gates before Step 5 (Move) is executed.

---

## 3. Checklist for Implementation

- [ ] Define `getSecret(keyName: string): Promise<string | null>` on `SyncContext` with gateway-side namespace enforcement.
- [ ] Abstract `obsidian` and `openapi-indexer` database writes into structured methods on `SyncContext` (Option A).
- [ ] Update `SyncContext.resolvePerson` to return `Promise<string | null>`.
- [ ] Standardize the runtime dependency boundary for `@nimbus-dev/sdk`.
- [ ] Implement the `audit:connector-version-skew` CI check.
- [ ] Complete "Step 3 (Invert, in place)" of the sequencing plan, proving the injection works while all tests still run locally.
