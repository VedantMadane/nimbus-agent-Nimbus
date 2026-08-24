# Connector extraction (Project A) — design

**Status:** design, approved to write. No files move until a plan exists and is approved.
**Predecessor:** [Project B](./2026-08-23-standalone-connector-hardening-design.md), shipped in
`v2.15.0` / `v2.16.0`. Its §12 costed A and deferred it; this document supersedes that section.

---

## 1. What this is for

Three goals, all of them in scope. They are listed in the order they constrain the design, not in
order of importance:

1. **Third-party distribution** — someone with no Nimbus gateway installs a connector from npm and
   uses it in their own MCP client.
2. **Contributor velocity** — a connector author works in one repo, without the monorepo's five
   path-resolving gates and 209 connector test files.
3. **Monorepo hygiene** — the gateway repo gets smaller and faster to navigate.

Goal 2 is why this design takes the **fat move** (§4). A thin extraction would deliver 1 and 3 and
leave "add a connector" as majority-gateway work, which is most of what makes it slow today.

## 2. Decisions already taken

| Decision | Choice | Consequence |
| --- | --- | --- |
| Package granularity | **One package**, `@nimbus-dev/connectors`, with a launcher | One version, one release, one changelog. `shared/` never crosses a package boundary, which deletes §12's largest objection outright. |
| Repo boundary | **Fat** — sync and mapping move too | A connector becomes self-contained. Requires the injection design in §5. |
| Entry point | `npx @nimbus-dev/connectors <connector-id>` | Single discoverable command. |

**Discovery note.** A single package is weaker on npm search than 94 packages would be. That
matters less than it appears: MCP servers are discovered through the **MCP Registry**, where this
project is already listed as `io.github.nimbus-agent/nimbus`, not through npm keyword search.

## 3. Naming — settled, and not casually

`nimbus-mcp` on npm **belongs to an unrelated third party** (`h4cd0c3`, v1.6.0, an AWS
security-assessment MCP server). The standalone README instructed users to `npx nimbus-mcp`, which
executed that stranger's code; fixed in #1323. Separately, our own `@nimbus-dev/mcp` already ships
a **bin** named `nimbus-mcp` that launches the gateway's MCP server — a different program.

Therefore:

- Package: **`@nimbus-dev/connectors`** (verified available 2026-08-24).
- Bin: **`nimbus-connector`** — never `nimbus-mcp`, which is taken twice over.
- **Rule:** `npm view <name>` before any name is written into a document or a `package.json`. Both
  the package namespace and the **bin** namespace must be checked; the bin collision here was ours.

The 94 per-connector names (`nimbus-mcp-<service>`) are all still free but are **not** claimed by
this design — a single package needs none of them. They currently lack `private: true`, which is a
loaded gun; §9 disarms it.

## 4. What moves, and what does not

**Moves to the connector repo:**

- `packages/mcp-connectors/**` — 188 source files, 209 test files, plus `shared/` and `standalone/`.
- `packages/gateway/src/connectors/<service>-sync.ts` and `<service>-mapping.ts` — the per-service
  sync intelligence, the bulk of the 351 files in that directory.

**Stays in the gateway, deliberately:**

- Every security-invariant enforcement site. Named explicitly because this is the risk the fat move
  creates and the design's job is to neutralise it:
  - `index/item-store.ts` — `upsertIndexedItemForSync`, the **V48/V49** body-depth chokepoint.
  - `db/write.ts` — **I14**.
  - `egress/sync-egress.ts` — **I29**'s per-run sync appender.
  - `extensions/spawn-env.ts` — **I1** child-process env scoping.
  - `vault/*` — non-negotiable #3; credentials never leave the gateway.
- The connector registry, secrets manifest, catalog, credential probe and spawner.

## 5. The injection design — the heart of this document

The fat move's whole difficulty is that sync code calls gateway internals. Measured, the surface is
small and dominated by two modules:

| Imported by `*-sync.ts` | Count | Disposition |
| --- | ---: | --- |
| `sync/types.ts` | 97 | **types only** → moves into `@nimbus-dev/sdk` |
| `index/item-store.ts` | 67 | **65 are `upsertIndexedItemForSync`** → injected |
| `sync/pass-cursor-sync-result.ts` | 12 | pure helper → moves |
| `people/linker.ts` | 11 | injected |
| `extensions/spawn-env.ts` | 6 | injected (I1) |
| `config/filesystem-toml.ts` | 4 | types + injected reader |
| `auth/google-access-token.ts` | 4 | injected (vault-backed) |
| `auth/microsoft-access-token.ts` | 3 | injected (vault-backed) |
| `db/write.ts`, `vault/nimbus-vault.ts` | 3 files total | see §6 |
| string helpers | ~7 | pure → move |

**So: do not move the chokepoints. Invert the dependency by injection.** The connector repo
declares the interface; the gateway supplies the implementation.

```ts
// @nimbus-dev/sdk — declared in the connector repo's dependency, implemented by the gateway
export interface SyncContext {
  /** V48/V49 body-depth chokepoint. The gateway's own upsertIndexedItemForSync, passed in. */
  upsertItem(item: IndexedItem, opts?: UpsertOptions): Promise<void>;
  linkPeople(input: PersonLinkInput): Promise<void>;
  /** I1 — env scoping stays the gateway's to decide. */
  spawnEnv(extra?: Record<string, string>): Record<string, string>;
  googleAccessToken(): Promise<string>;
  microsoftAccessToken(): Promise<string>;
}

export interface Syncable {
  connectorId: string;
  syncInterval: number;
  sync(ctx: SyncContext, cursor: string | null): Promise<SyncResult>;
}
```

Why this is the right shape, and not merely the convenient one:

- **Every invariant site keeps its current home and its current test.** The I29 sync-egress
  appender still wraps the call in `sync/scheduler.ts`; V48/V49 still live in `item-store.ts`. No
  `docs/SECURITY-INVARIANTS.md` row changes, and no static rule (`D10`–`D23`) needs relaxing.
- **A capability the gateway does not pass cannot be reached.** Today a sync file can import
  anything in the gateway; afterwards it can reach exactly what `SyncContext` grants. The fat move
  makes the connector surface *narrower*, not wider — which is the opposite of the usual outcome
  and is the strongest argument for doing it this way.
- It is the pattern the codebase already prefers: dependency injection over `mock.module`, which
  CLAUDE.md mandates for exactly this class of problem.

## 6. The three exceptions

`jira-sync.ts`, `obsidian-sync.ts` and `openapi-indexer-sync.ts` reach `db/write.ts` or the vault
directly. Each is designed individually rather than by rule:

- **jira** — audit what it writes; if it is item rows, it belongs behind `ctx.upsertItem`.
- **obsidian** / **openapi-indexer** — both are `LOCAL_ONLY_SYNC_SERVICES` under I29, so they make
  no outbound request. Their direct writes are the reason to check them first: a local-only
  syncable with raw DB access is the least constrained thing in this migration.

**No file moves until each of the three has a named disposition.** Migrating them by pattern-match
is how an invariant gets quietly relocated.

## 7. The gates, the tests, and the 84 references

From §12 of the predecessor spec, re-verified where cheap:

- **~90 files** reference the `mcp-connectors` path from outside `packages/mcp-connectors/` itself,
  spread across `scripts/`, `docs/`, `packages/gateway/`, plus `biome.json`, `knip.json`,
  `.github/labeler.yml` and two workflows. The predecessor spec said 84; a re-count on 2026-08-24
  over `*.ts`/`*.json`/`*.md`/`*.yml` gave 90. The figures are close enough that the conclusion is
  unchanged and far enough apart that **the migration must derive this list mechanically rather
  than work from either number** — whichever is right, "84 references" is not a checklist.
- **Five** path-resolving gates: `gen:connector-registry`, `audit:connector-entrypoints`,
  `audit:connector-deps`, `audit:connector-registry-drift`, `test:connector-boot`.
- `scripts/ci/cross-platform-parity.test.ts` asserts `packages/mcp-connectors` appears in the
  `bun test` path list of **both** `ci.yml` and `_test-suite.yml`. That assertion must move or be
  rewritten, and it is load-bearing — see CLAUDE.md on why those two lists must stay equal.
- `audit:connector-consent` (added #1318, wired into CI #1321) moves with the connectors.
- **`test:connector-boot` is the one that matters most.** It proves the compiled binary can start a
  connector. `bun build --compile` embeds bare-specifier dynamic imports, so importing connectors
  from `@nimbus-dev/connectors` is viable — but this gate is the proof, and it must be green in the
  gateway repo against the *published* package before the monorepo copy is deleted.

## 8. Release choreography

One package, so the sequence is short — but it is a two-repo sequence and that is new:

1. Connector repo releases `@nimbus-dev/connectors@X`.
2. Gateway bumps its dependency to `X`, and `test:connector-boot` proves the compiled binary starts
   a connector from the published package.
3. Gateway releases.

**Version skew is the known failure mode**, not a hypothetical: `@nimbus-dev/sdk` is pinned at four
different floors inside this one repo today — gateway `^1.18.0`, root `^1.16.0`, cli `^1.11.1`,
connectors `^1.8.1` — against a registry at 1.20.0. A drift gate that fails when the gateway's
pinned connector version is behind the registry is **required**, not optional, and it should be
authored before the migration rather than after the first skew incident.

## 9. Sequencing

Each step ends green and independently reviewable. No step both moves files and changes behaviour.

1. **Disarm** — `private: true` on all 94 connector packages. Nothing publishes them today; this
   removes the possibility that anything ever does by accident. Standalone, trivially reviewable.
2. **Define** — land `SyncContext` and `Syncable` in `@nimbus-dev/sdk`, unused. Types only.
3. **Invert, in place** — convert `<service>-sync.ts` files to take `ctx` instead of importing
   gateway internals, **while they still live in the gateway**. This is the risky change and it
   happens with every existing test still running against it. The three exceptions in §6 are
   handled here.
4. **Prove the seam** — `test:connector-boot` against a locally-packed tarball of the new package,
   before any repo exists.
5. **Move** — create the repo, move files, rewrite the 84 references and five gates.
6. **Consume** — gateway depends on the published package; delete the monorepo copy **last**, only
   once step 4's gate is green against the published artifact.

Step 3 is where this design can fail, and it is deliberately placed before anything is unreachable
by the existing test suite.

## 10. Open questions

1. **Does the fat move include connector-owned mapping tests?** 209 test files move; the sync tests
   currently exercise gateway internals directly and will need the injected context as a fake.
2. **What does the gateway do when the published package is missing or a version behind?** Fail
   startup, or degrade to no connectors? Fail-closed is consistent with the rest of the codebase.
3. **Does the standalone launcher stay in this package** or become its own entry point? It is
   `@nimbus-dev/mcp-connector` and private as of #1323, pending this answer.
4. **The Claude Desktop bridge question.** If tools registered in Claude Desktop are proxied through
   `bridge.claudeusercontent.com`, third-party distribution to that client conflicts with
   non-negotiable #1. Unresolved; it does not block this design, but it bounds goal 1's value and
   should be settled before the package is promoted anywhere.

## 11. What would make this the wrong call

Recorded so the decision can be revisited on evidence rather than sentiment:

- If step 3 shows `SyncContext` needs more than roughly a dozen members, the sync code is more
  entangled with the gateway than the import census suggests, and the thin move becomes correct.
- If the two-repo release sequence produces skew incidents in its first quarter despite the §8 gate,
  the single-repo property was worth more than contributor velocity.
