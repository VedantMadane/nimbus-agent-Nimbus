# Plan Review: SyncContext Narrowing

**Date:** 2026-08-24  
**Status:** Plan Review / Feedback  
**Target Plan:** [2026-08-24-sync-context-narrowing.md](./2026-08-24-sync-context-narrowing.md)

---

## 1. Summary of Feedback

The narrowing plan is exceptionally well-structured, using a multi-step incremental migration strategy with green checkpoints at each step. It solves the hard dependency on `vault` and `db` handles (non-negotiable #3) via scoped dependency injection without breaking local test suites or moving files prematurely.

This review highlights specific optimizations, particularly around the Workday OAuth token helper and the custom-table store separation.

---

## 2. Detailed Feedback & Open Questions

### Q1. Workday `loadAccessToken` Mock Simplifying (Task 4b)

In Task 4b Step 3, the plan notes:
> `options.loadAccessToken(ctx.vault)` is a caller-injected function that takes the vault, so it cannot be mechanically rewritten.

- **Analysis:**
  - Checking the codebase reveals that `loadAccessToken` is called only inside `workday-sync.ts`.
  - In production (`assemble-sync-registrations.ts`), this option is **never** passed.
  - In the unit tests (`workday-sync.test.ts`), it is passed to mock access tokens (e.g. `loadAccessToken: async () => "tok"`). The mock implementation never actually inspects the `vault` parameter.
- **Suggestion:**
  - Simplify the signature of `loadAccessToken` in `WorkdaySyncableOptions` to:

    ```ts
    loadAccessToken?: () => Promise<string>;
    ```

    This completely removes the need to pass `vault` (or `SyncContext`) into the option parameter, resolving the design question cleanly.

### Q2. Directory Structure for Custom-Table Stores (Task 6)

Task 6 creates `obsidian-store.ts` and `openapi-store.ts` to hold the custom SQL queries and migrations.

- **Suggestion:**
  - Since these files only handle DB schemas and query executions that must remain gateway-side (violating no raw SQL boundaries), place them under `packages/gateway/src/index/` or a dedicated DB folder rather than `packages/gateway/src/connectors/`.
  - Keeping them in `connectors/` might confuse future extraction passes (Plan 2) which expect everything under `connectors/` to move out. Placing them explicitly in a gateway database/indexing directory keeps the boundary clear.

### Q3. Static Rule Audit Naming in Task 7

Task 7 introduces a new static rule (D24) and tests it:

```ts
expect(checkNimbusInvariants(root).map((v) => v.rule)).toContain("sync-context-no-raw-handles");
```

- **Check:**
  - Ensure the rule ID matches the pattern used in `SECURITY-INVARIANTS.md` and the existing checks.
  - Explicitly document the naming convention in `check-nimbus-invariants.ts`.

---

## 3. Recommended Actions

- Adopt the `loadAccessToken?: () => Promise<string>` signature simplification for Workday to simplify Task 4b.
- Organize the custom database store scripts (`obsidian-store.ts`, etc.) into gateway database paths rather than the connector packages path to aid Phase 2 extraction hygiene.
