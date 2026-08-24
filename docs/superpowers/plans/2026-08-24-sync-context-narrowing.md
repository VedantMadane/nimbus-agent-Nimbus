# SyncContext Narrowing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the raw `vault` and `db` handles on `SyncContext` with per-service scoped capabilities, so a syncable can reach exactly the secrets and tables the gateway sanctions for it.

**Architecture:** `SyncContext` becomes generic over a `ConnectorServiceId`. `vault` is replaced by `getSecret(key)`, scoped gateway-side to the calling service; `db` is replaced by `upsertItem`, `resolvePerson` and two structured writers. Capabilities are bound where the context is already built per job — `sync/scheduler.ts` `runJob` — so scoping needs no new plumbing. Old and new members coexist until the final task removes the handles.

**Tech Stack:** Bun 1.2+, TypeScript 7 strict, Biome, bun:test, bun:sqlite.

**Spec:** [`docs/superpowers/specs/2026-08-24-connector-extraction-design.md`](../specs/2026-08-24-connector-extraction-design.md) — §5 (narrowing), §6 (the 20 `ctx.db` users), §9 steps 1–3.

**Scope:** This is **Plan 1 of 2**. It ships standalone value — a real tightening of non-negotiable #3 — and moves no files between repos. The extraction plan is written after this lands, when the final context shape is known rather than predicted.

## Global Constraints

- **No `any`.** `unknown` for external data. TypeScript strict is non-negotiable.
- **No raw-SQL escape hatch on the context.** I9 and I14 are enforced by what the gateway will execute; an arbitrary-SQL method defeats the entire narrowing. Rejected in spec §6.
- **The service id is supplied by the gateway, never by the caller.** A caller-supplied service id makes `getSecret` a vault handle with extra steps.
- **Do not lose compile-time key checking.** `readConnectorSecret<S>(vault, id, key: ConnectorSecretKeyOf<S>)` is type-safe today; `getSecret(key: string)` would silently discard that.
- **Invariant sites do not move.** `upsertIndexedItemForSync` (V48/V49), `db/write.ts` (I14), `egress/sync-egress.ts` (I29), `extensions/spawn-env.ts` (I1) stay where they are.
- Every task ends green: `bun run preflight:fast` plus the named tests.
- Commit per task. Never commit on `main` — branch `dev/<you>/sync-context-narrowing`.

## File Structure

| File | Responsibility | Task |
| --- | --- | --- |
| `packages/gateway/src/mcp-connectors/*/package.json` ×94 | add `private: true` | 1 |
| `packages/gateway/src/sync/types.ts` | `SyncContext<S>` — the interface being narrowed | 2, 7 |
| `packages/gateway/src/sync/sync-capabilities.ts` **(new)** | builds the scoped capability set for one service | 2 |
| `packages/gateway/src/sync/sync-capabilities.test.ts` **(new)** | proves scoping and key typing | 2 |
| `packages/gateway/src/platform/assemble.ts` | `syncBase` construction site | 3 |
| `packages/gateway/src/sync/scheduler.ts` | `runJob`'s per-job `runCtx` — where scoping binds | 3 |
| `packages/gateway/src/connectors/*-sync.ts` | 73 secret readers, 10 OAuth, 20 db users | 4, 4b, 5, 6 |
| `packages/gateway/src/connectors/obsidian-store.ts` **(new)** | `obsidian_notes` / `obsidian_links` SQL | 6 |
| `packages/gateway/src/connectors/openapi-store.ts` **(new)** | `api_endpoint` SQL | 6 |
| `scripts/structure-audit/check-nimbus-invariants.ts` | static rule: no raw handles on the context | 7 |

---

### Task 1: Disarm the 94 connector packages

No connector package is published and no workflow publishes one, but all 94 lack `private: true`. This removes the possibility that one ever goes out by accident — including under a name we do not own, which already happened once in documentation form.

**Files:**

- Modify: `packages/mcp-connectors/*/package.json` (94 files)
- Test: `packages/mcp-connectors/standalone/src/launcher.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: nothing. Purely defensive.

- [ ] **Step 1: Write the failing test**

Append to `packages/mcp-connectors/standalone/src/launcher.test.ts`:

```ts
describe("no connector package can be published by accident", () => {
  // `nimbus-mcp` on npm belongs to an unrelated third party, and our README told users to npx it
  // for two releases. Nothing publishes these packages today; this makes that structural.
  test("every connector package.json is private", () => {
    const root = join(fileURLToPath(import.meta.url), "../../..");
    const offenders = readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(root, d.name, "package.json")))
      .filter((d) => {
        const pkg = JSON.parse(readFileSync(join(root, d.name, "package.json"), "utf8"));
        return pkg.private !== true;
      })
      .map((d) => d.name);
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test packages/mcp-connectors/standalone/src/launcher.test.ts`
Expected: FAIL listing ~94 package names.

- [ ] **Step 3: Add the flag**

```bash
for f in packages/mcp-connectors/*/package.json; do
  bun -e '
    const fs=require("fs"); const p=process.argv[1];
    const c=JSON.parse(fs.readFileSync(p,"utf8"));
    if (c.private !== true) { c.private = true; fs.writeFileSync(p, JSON.stringify(c,null,2)+"\n"); }
  ' "$f"
done
```

- [ ] **Step 4: Verify green and lockfile-clean**

Run: `bun test packages/mcp-connectors/standalone/src/launcher.test.ts && bun install --frozen-lockfile`
Expected: PASS, and no lockfile drift. **If the lockfile changed, commit it** — CI installs `--frozen-lockfile` and drift is a hard failure.

- [ ] **Step 5: Commit**

```bash
git add packages/mcp-connectors bun.lock
git commit -m "chore(connectors): mark all 94 connector packages private"
```

---

### Task 2: Define the scoped capability set

Build the capabilities in isolation, fully tested, before anything consumes them.

**Files:**

- Create: `packages/gateway/src/sync/sync-capabilities.ts`
- Create: `packages/gateway/src/sync/sync-capabilities.test.ts`
- Modify: `packages/gateway/src/sync/types.ts`

**Interfaces:**

- Consumes: `readConnectorSecret` from `connectors/connector-vault.ts`; `upsertIndexedItemForSync` from `index/item-store.ts`; `resolvePersonForSync` from `people/linker.ts`.
- Produces: `buildSyncCapabilities(deps, serviceId): SyncCapabilities<S>`, and the `SyncCapabilities<S>` type that Task 3 spreads into the context.

- [ ] **Step 1: Write the failing test**

Create `packages/gateway/src/sync/sync-capabilities.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";

import { buildSyncCapabilities } from "./sync-capabilities.ts";

function fakeVault(entries: Record<string, string>) {
  return {
    get: (key: string) => Promise.resolve(entries[key] ?? null),
  } as unknown as Parameters<typeof buildSyncCapabilities>[0]["vault"];
}

describe("buildSyncCapabilities", () => {
  test("getSecret prefixes the caller's own service id", async () => {
    const vault = fakeVault({ "jira.api_token": "tok", "slack.token": "other" });
    const caps = buildSyncCapabilities({ vault, db: new Database(":memory:") }, "jira");
    expect(await caps.getSecret("api_token")).toBe("tok");
  });

  test("a syncable cannot reach another service's secret by naming it", async () => {
    // The whole point of the narrowing: today ctx.vault would return this.
    const vault = fakeVault({ "slack.token": "other" });
    const caps = buildSyncCapabilities({ vault, db: new Database(":memory:") }, "jira");
    // "slack.token" is prefixed to "jira.slack.token", which does not exist.
    expect(await caps.getSecret("slack.token" as never)).toBeNull();
  });

  test("a missing key is null, not a throw", async () => {
    const caps = buildSyncCapabilities({ vault: fakeVault({}), db: new Database(":memory:") }, "jira");
    expect(await caps.getSecret("api_token")).toBeNull();
  });

  test("the capability set exposes no raw handle", () => {
    const caps = buildSyncCapabilities(
      { vault: fakeVault({}), db: new Database(":memory:") },
      "jira",
    );
    expect(Object.keys(caps)).not.toContain("vault");
    expect(Object.keys(caps)).not.toContain("db");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun test packages/gateway/src/sync/sync-capabilities.test.ts`
Expected: FAIL — `Cannot find module './sync-capabilities.ts'`.

- [ ] **Step 3: Implement**

Create `packages/gateway/src/sync/sync-capabilities.ts`:

```ts
import type { Database } from "bun:sqlite";

import type { ConnectorServiceId } from "../connectors/connector-catalog.ts";
import { readConnectorSecret } from "../connectors/connector-vault.ts";
import type { ConnectorSecretKeyOf } from "../connectors/connector-vault.ts";
import { upsertIndexedItemForSync } from "../index/item-store.ts";
import type { IndexedItem, UpsertForSyncOptions } from "../index/item-store.ts";
import { resolvePersonForSync } from "../people/linker.ts";
import type { PersonSyncHints } from "../people/linker.ts";
import type { NimbusVault } from "../vault/nimbus-vault.ts";

/**
 * The capabilities a syncable may reach, in place of the raw `vault` and `db` handles it holds
 * today. Each is bound to ONE service by the gateway; the service id is never a parameter the
 * caller supplies, because that would make `getSecret` a vault handle with extra steps.
 */
export interface SyncCapabilities<S extends ConnectorServiceId = ConnectorServiceId> {
  /** Resolves `<serviceId>.<keyName>`. Cannot name another service's key. */
  getSecret(keyName: ConnectorSecretKeyOf<S>): Promise<string | null>;
  /** V48/V49 body-depth chokepoint; the gateway's own upsert, unchanged. */
  upsertItem(item: IndexedItem, opts?: UpsertForSyncOptions): Promise<void>;
  /** SYNCHRONOUS and returns the id — callers set it as `authorId` on the item they build. */
  resolvePerson(hints: PersonSyncHints): string | null;
}

export function buildSyncCapabilities<S extends ConnectorServiceId>(
  deps: { vault: NimbusVault; db: Database },
  serviceId: S,
): SyncCapabilities<S> {
  return {
    getSecret: (keyName) => readConnectorSecret(deps.vault, serviceId, keyName),
    upsertItem: (item, opts) => upsertIndexedItemForSync(deps.db, item, opts),
    resolvePerson: (hints) => resolvePersonForSync(deps.db, hints),
  };
}
```

- [ ] **Step 4: Add the members to the context, additively**

In `packages/gateway/src/sync/types.ts`, make the interface generic and extend it. **Keep `vault` and `db` for now** — Task 7 removes them, and every one of the 83+20 call sites must migrate first.

```ts
export interface SyncContext<S extends ConnectorServiceId = ConnectorServiceId>
  extends Partial<SyncCapabilities<S>> {
  vault: NimbusVault;
  db: Database;
  // ... every existing member unchanged
}
```

`Partial<>` is deliberate and temporary: it lets Task 3 populate the capabilities at one site while 103 call sites still read the handles. Task 7 drops both the `Partial` and the handles.

- [ ] **Step 5: Verify**

Run: `bun test packages/gateway/src/sync/ && bun run typecheck`
Expected: PASS. Nothing consumes the new members yet.

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/sync
git commit -m "feat(sync): scoped capability set for syncables, unused"
```

---

### Task 3: Bind the capabilities per job

**Files:**

- Modify: `packages/gateway/src/sync/scheduler.ts` (~line 704, `runJob`)
- Modify: `packages/gateway/src/platform/assemble.ts` (~line 2365, `syncBase`)
- Test: `packages/gateway/src/sync/scheduler.test.ts`

**Interfaces:**

- Consumes: `buildSyncCapabilities` from Task 2.
- Produces: a `runCtx` on which `getSecret`/`upsertItem`/`resolvePerson` are always present and always scoped to `job.serviceId`.

- [ ] **Step 1: Write the failing test**

Append to `packages/gateway/src/sync/scheduler.test.ts`:

```ts
test("runJob scopes getSecret to the job's own service", async () => {
  // The scoping has to bind per JOB, not per gateway: `syncBase` in assemble.ts is built once and
  // shared by every service, so binding there would scope every connector to whichever id was
  // passed first.
  const seen: string[] = [];
  const scheduler = makeTestScheduler({
    onSync: async (ctx) => {
      await ctx.getSecret?.("api_token");
      return emptyResult();
    },
    vaultGet: (key: string) => {
      seen.push(key);
      return null;
    },
  });
  await scheduler.forceSync("jira");
  await scheduler.forceSync("linear");
  expect(seen).toEqual(["jira.api_token", "linear.api_token"]);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun test packages/gateway/src/sync/scheduler.test.ts -t "scopes getSecret"`
Expected: FAIL — `ctx.getSecret` is undefined.

- [ ] **Step 3: Bind in `runJob`**

In `scheduler.ts`, extend the existing per-run context:

```ts
const runCtx: SyncContext = {
  ...this.ctx,
  ...buildSyncCapabilities({ vault: this.ctx.vault, db: this.ctx.db }, job.serviceId),
  depth: this.getDepthForService(job.serviceId),
  ...(historyFloorMs === undefined ? {} : { historyFloorMs }),
};
```

- [ ] **Step 4: Leave `syncBase` alone, and say why**

Add above `syncBase` in `assemble.ts`:

```ts
// Capabilities are NOT bound here. This context is built once and shared by every service, so a
// `getSecret` bound here would carry whichever service id happened to be chosen — scoped to the
// wrong connector for all but one. They bind per job in `sync/scheduler.ts` `runJob`, which is the
// first point that knows `job.serviceId`.
```

- [ ] **Step 5: Find every OTHER consumer of the shared context**

Run: `grep -rn "syncContext\|syncBase" --include=*.ts packages/gateway/src | grep -v test`

Any consumer outside the scheduler — `sync/targeted-fetch.ts` is the expected one — reaches syncables without going through `runJob`, so it needs the same binding at its own per-service entry point. **Record each one found in the task's commit message**; an unbound consumer is a capability that is `undefined` at runtime, which `Partial<>` makes a silent no-op rather than a type error. That is the one real hazard in this task.

- [ ] **Step 6: Verify**

Run: `bun test packages/gateway/src/sync/ && bun run preflight:fast`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/gateway/src/sync packages/gateway/src/platform
git commit -m "feat(sync): bind scoped capabilities per job in runJob"
```

---

### Task 4: Migrate the 73 `readConnectorSecret` users

**83 files touch `ctx.vault`, in two shapes.** This task handles the 73 mechanical ones; Task 4b
handles the other 10, which reach the vault through an OAuth token helper and need a different
capability. Do not treat them as one job — the plan originally did, and the resulting `getSecret`
would not have served a single Google connector.

**Files:**

- Modify: `packages/gateway/src/connectors/*-sync.ts` (73 files)

**Interfaces:**

- Consumes: `ctx.getSecret` from Task 3.
- Produces: no remaining `readConnectorSecret(ctx.vault, ...)` call in any `*-sync.ts`.

**Batching.** Do not do this in one commit. Work in batches of roughly ten connectors, alphabetically, each its own commit and each green. The mechanical shape:

```ts
// before
const token = await readConnectorSecret(ctx.vault, "jira", "api_token");
// after
const token = await ctx.getSecret("api_token");
```

- [ ] **Step 1: Enumerate the work**

Run: `grep -ln "readConnectorSecret(ctx.vault" packages/gateway/src/connectors/*-sync.ts | tee /tmp/vault-users.txt | wc -l`
Expected: 73. **If it is not 73, stop** — the census moved and the plan's sizing is wrong.

- [ ] **Step 2: Migrate one batch**

For each file in the batch, replace every `readConnectorSecret(ctx.vault, "<service>", "<key>")` with `ctx.getSecret("<key>")`. **The service string must match the file's own connector** — a mismatch is exactly the cross-service read this task removes, and it will now be a compile error rather than a working call. Treat any mismatch found as a finding worth reporting, not a silent fix.

- [ ] **Step 3: Verify the batch**

Run: `bun test packages/gateway/src/connectors/<each-touched>-sync.test.ts && bun run typecheck`
Expected: PASS. Tests that construct a fake context need `getSecret` added; a fake vault becomes a map.

- [ ] **Step 4: Commit the batch**

```bash
git commit -am "refactor(connectors): scope secret reads for <batch> to ctx.getSecret"
```

- [ ] **Step 5: Repeat until the enumeration is empty**

Run: `grep -l "readConnectorSecret(ctx.vault" packages/gateway/src/connectors/*-sync.ts | wc -l`
Expected: 0.

---

### Task 4b: The 10 OAuth token-helper users

These reach the vault through a token helper rather than a secret read, so `getSecret` does not
serve them. Three distinct shapes exist, found by inspection:

```ts
await getValidGoogleAccessToken(ctx.vault, "gmail")   // gmail, google-drive, google-meet, google-photos
await getValidMicrosoftAccessToken(ctx.vault)          // onedrive, outlook, teams
await getValidWorkdayAccessToken(ctx.vault)            // workday
await options.loadAccessToken(ctx.vault)               // workday, bitrise, codemagic
```

**Files:**

- Modify: `packages/gateway/src/sync/sync-capabilities.ts`, plus the 10 connectors

**Interfaces:**

- Produces: `accessToken(): Promise<string>` on `SyncCapabilities`, resolving the right provider for
  the bound service.

- [ ] **Step 1: Enumerate and confirm the shapes**

Run:

```bash
comm -13 <(grep -ln "readConnectorSecret(ctx.vault" packages/gateway/src/connectors/*-sync.ts | sort) \
         <(grep -ln "ctx\.vault\|\.vault," packages/gateway/src/connectors/*-sync.ts | sort)
```

Expected: 10 files. Confirm each matches one of the four shapes above before writing any code.

- [ ] **Step 2: Add the capability**

The provider is a property of the service, not a caller choice, so it resolves inside
`buildSyncCapabilities` from the bound `serviceId` — the same reasoning that keeps the service id
out of `getSecret`'s parameters.

```ts
accessToken: () => resolveAccessTokenForService(deps.vault, serviceId),
```

- [ ] **Step 3: The fourth shape needs a decision, not a refactor**

`options.loadAccessToken(ctx.vault)` is a **caller-injected function that takes the vault**, so it
cannot be mechanically rewritten — whoever passes it must also be narrowed, or the vault leaks
through the parameter. Give it a named disposition before touching it, exactly as spec §6 requires
for the `ctx.db` users. This is the one place in Plan 1 where the answer is not already known.

- [ ] **Step 4: Verify**

Run: `bun test packages/gateway/src/connectors/ && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -am "refactor(connectors): resolve OAuth tokens through a scoped capability"
```

---

### Task 5: Migrate the 20 `ctx.db` users

**Files:**

- Modify: `packages/gateway/src/connectors/*-sync.ts` (20 files)

**Interfaces:**

- Consumes: `ctx.upsertItem`, `ctx.resolvePerson` from Task 3.
- Produces: `ctx.db` unused except by the two custom-table writers, which Task 6 handles.

- [ ] **Step 1: Enumerate and classify**

Run: `grep -n "ctx\.db" packages/gateway/src/connectors/*-sync.ts | tee /tmp/db-users.txt`

Classify every hit as one of: `upsertItem`, `resolvePerson`, custom-table write (Task 6), or **unclassified**. Per spec §6, **no file moves until each of the 20 has a named disposition.** An unclassified hit is a design question, not a refactor — surface it rather than inventing a method for it.

- [ ] **Step 2: Migrate the two known shapes**

```ts
// before
resolvePersonForSync(ctx.db, { canonicalEmail: email })
// after — still synchronous, still returns the id
ctx.resolvePerson({ canonicalEmail: email })

// before
await upsertIndexedItemForSync(ctx.db, item, { depth: ctx.depth })
// after
await ctx.upsertItem(item, { depth: ctx.depth })
```

- [ ] **Step 3: Verify**

Run: `bun test packages/gateway/src/connectors/ && bun run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git commit -am "refactor(connectors): reach the index and people linker through scoped capabilities"
```

---

### Task 6: Structured writers for the two custom-table connectors

**Files:**

- Create: `packages/gateway/src/connectors/obsidian-store.ts`
- Create: `packages/gateway/src/connectors/openapi-store.ts`
- Modify: `packages/gateway/src/sync/sync-capabilities.ts`, `obsidian-sync.ts`, `openapi-indexer-sync.ts`

**Interfaces:**

- Produces: `upsertObsidianNote(note)`, `upsertApiEndpoint(endpoint)` on `SyncCapabilities`.

Both connectors are `LOCAL_ONLY_SYNC_SERVICES` under I29 — they make no outbound request — but they hold the least constrained DB access in the migration, which is why the SQL moves into the gateway rather than travelling with them.

- [ ] **Step 1: Write the failing test**

Create `packages/gateway/src/connectors/obsidian-store.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";

import { upsertObsidianNote } from "./obsidian-store.ts";

describe("upsertObsidianNote", () => {
  test("writes through dbRun and is idempotent on the same path", async () => {
    const db = new Database(":memory:");
    applyMigrations(db);
    const note = { path: "a/b.md", title: "B", body: "x", links: ["c.md"], mtimeMs: 1 };
    await upsertObsidianNote(db, note);
    await upsertObsidianNote(db, note);
    expect(db.query("select count(*) as n from obsidian_notes").get()).toEqual({ n: 1 });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun test packages/gateway/src/connectors/obsidian-store.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Move the SQL**

Lift the existing statements out of `obsidian-sync.ts` verbatim into `obsidian-store.ts`, keeping every `dbRun` call (I14) and every bound parameter (I9). **Do not rewrite the SQL while moving it** — a move and a change in one step makes a regression unattributable. Repeat for `openapi-store.ts` / `api_endpoint`.

- [ ] **Step 4: Expose on the capability set**

```ts
upsertObsidianNote: (note) => upsertObsidianNote(deps.db, note),
upsertApiEndpoint: (endpoint) => upsertApiEndpoint(deps.db, endpoint),
```

- [ ] **Step 5: Verify**

Run: `bun test packages/gateway/src/connectors/obsidian-store.test.ts packages/gateway/src/connectors/obsidian-sync.test.ts packages/gateway/src/connectors/openapi-indexer-sync.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/connectors packages/gateway/src/sync
git commit -m "refactor(connectors): structured writers for obsidian and openapi tables"
```

---

### Task 7: Remove the handles, and make removal permanent

The ratchet. Until this lands, nothing is actually narrowed — a syncable can still reach `ctx.vault`.

**Files:**

- Modify: `packages/gateway/src/sync/types.ts`
- Modify: `scripts/structure-audit/check-nimbus-invariants.ts`
- Test: `scripts/structure-audit/check-nimbus-invariants.test.ts`

- [ ] **Step 1: Write the failing static-rule test**

```ts
test("D24: a syncable cannot reach a raw vault or db handle", async () => {
  const root = await fixtureRepo();
  await writeFile(
    join(root, "packages/gateway/src/connectors/evil-sync.ts"),
    "export async function sync(ctx: SyncContext) { return ctx.vault.get('slack.token'); }\n",
  );
  expect(checkNimbusInvariants(root).map((v) => v.rule)).toContain("sync-context-no-raw-handles");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun test scripts/structure-audit/check-nimbus-invariants.test.ts -t "D24"`
Expected: FAIL — rule does not exist.

- [ ] **Step 3: Drop the handles from the interface**

In `sync/types.ts`: delete `vault` and `db`, and drop the `Partial<>` so the capabilities are required.

```ts
export interface SyncContext<S extends ConnectorServiceId = ConnectorServiceId>
  extends SyncCapabilities<S> {
  // vault and db are GONE — see docs/superpowers/specs/2026-08-24-connector-extraction-design.md §5
  logger: Logger;
  // ... remaining members unchanged
}
```

`buildSyncCapabilities` keeps taking the real handles; it is the only thing that holds them.

- [ ] **Step 4: Add the static rule**

Forbid `ctx.vault` / `ctx.db` in `connectors/*-sync.ts`, with `sync/sync-capabilities.ts` the sole exemption.

- [ ] **Step 5: Verify the whole suite, not just the touched files**

Run: `bun run preflight` (full, not `:fast`)
Expected: PASS. Any straggler that still reads a handle is now a compile error, which is the point.

- [ ] **Step 6: Document the triple**

Per CLAUDE.md, wiring + docs + test land together. Add the D24 row to `docs/SECURITY-INVARIANTS.md` under I14/I9's static complement, and to the static-rule list in `CLAUDE.md` **and** `GEMINI.md` — those two mirror each other and drift if only one is edited.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(sync): remove raw vault and db handles from SyncContext"
```

---

## Self-Review

**Census corrections made while writing this plan.** Three of the spec's figures did not survive
being turned into commands, which is the point of writing commands: the 83 vault users are **73**
`readConnectorSecret` calls plus **10** OAuth token-helper calls needing a different capability
(Task 4b, which would otherwise not exist and would have left every Google connector broken);
`ConnectorServiceId` lives in `connector-catalog.ts` and `ConnectorSecretKeyOf` in
`connector-vault.ts`, not in `connector-secrets-manifest.ts` as the first draft's imports assumed.
The `ctx.db` figure of 20 was correct.

**Spec coverage.** §9 step 1 → Task 1. Step 2 → Task 2. Step 3 → Tasks 3–7. §5's `getSecret` scoping → Tasks 2–4. §6's 20 `ctx.db` users → Tasks 5–6, with the "named disposition" rule enforced as Task 5 Step 1. §6's rejection of a raw-SQL hatch → Global Constraints. §8's `audit:connector-version-skew` is **deliberately not here**: it compares a gateway pin against a published package that does not exist yet, so it would be a gate that cannot pass. It belongs to Plan 2, before the move.

**Placeholders.** None. Every code step carries the actual code; the two batch tasks carry the transformation shape plus an enumeration command that fails loudly if the census has moved.

**Type consistency.** `SyncCapabilities<S>` is named identically in Tasks 2, 3, 6 and 7. `resolvePerson` is synchronous and returns `string | null` in every appearance, matching `resolvePersonForSync`. `getSecret` takes `ConnectorSecretKeyOf<S>` throughout, preserving the compile-time key checking `readConnectorSecret` has today.

**The risk worth naming.** Task 2 Step 4's `Partial<>` is what lets 103 call sites migrate incrementally, and it is also the one thing that can hide a mistake: an unbound consumer of the shared context gets `undefined` capabilities and fails silently rather than at compile time. Task 3 Step 5 exists specifically to enumerate those consumers, and Task 7 Step 3 removes the `Partial` as soon as it is no longer needed. If Task 3 Step 5 finds consumers beyond `targeted-fetch.ts`, that is a signal to bind capabilities at a lower level than `runJob` before continuing.
