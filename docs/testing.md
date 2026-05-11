# Testing

Five-layer pyramid:

1. **Unit (`bun test`)** — Engine logic, Vault contracts, HITL invariants, manifest validation. Co-located with source. Runs in milliseconds.
2. **Integration (`bun test` + real SQLite)** — connector sync, index queries, extension loading and isolation. Each test gets a fresh temp dir + fresh DB.
3. **E2E CLI (`bun test` + Gateway subprocess)** — full CLI command flows against a real Gateway backed by mock MCP servers.
4. **UI Components (Vitest + Testing Library)** — React components in the Tauri WebView. Vitest is used here because `bun test` does not support jsdom.
5. **E2E Desktop (Playwright + Tauri WebDriver)** — full desktop flows on all three platforms. Runs on push to `main` and release tags.

Security scans: `bun audit`, `trivy`, CodeQL on every PR; Dependabot for dependency updates. HIGH/CRITICAL findings block merges.

For deeper detail on which test layer to use for each subsystem, see [`.claude/commands/nimbus-testing.md`](../.claude/commands/nimbus-testing.md).
