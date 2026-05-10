# Phase 5 T3 PR 3 — `nimbus catchup` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the third built-in agent — `nimbus catchup [--since <duration>] [--json] [--service <id>]` — answering "what changed since I was last paying attention, weighted by my involvement". Read-only. HITL-free. JSON-mode round-trippable. Latency budget < 15 s on the seeded fixture. Closes the T3 epic.

**Architecture:**
The agent runs a synchronous Stage 0 self-person resolution (override → `git config user.email` → OS username) and then fans out **five** parallel sub-agents through the (already-fixed) `AgentCoordinator` over the local index — `s_owned_services`, `s_active_repos`, `s_responded_incidents`, `s_collaborators`, `s_window_items`. Stage 2 scores each window item against the involvement signals, groups by service, orders sections by aggregate relevance, and emits a deterministic Markdown brief via the existing `renderCatchup` (replacing today's stub) plus the LLM-routed `synthesize` (which this PR widens to accept `CatchupBrief`). Output flows over a new `agents.catchup` JSON-RPC method, surfaces via a `catchup.briefReady` notification, and adds **one** entry to the Tauri renderer allowlist (count 59 → 60).

**Tech Stack:**
- Bun v1.2+ / TypeScript strict (no `any`)
- `bun:sqlite` raw SQL against existing `item`, `graph_relation`, `graph_entity`, `person`, `sync_state` tables
- `Bun.spawn` for `git config user.email`; Node `os.userInfo()` for OS username
- Rust unit tests for the Tauri bridge (`cargo test` in `packages/ui/src-tauri/`)
- `bun:test` for unit + e2e

**Spec reference:** [`docs/superpowers/specs/2026-05-07-phase-5-t3-team-intelligence-design.md`](../specs/2026-05-07-phase-5-t3-team-intelligence-design.md), §"`nimbus catchup --since <duration>`" + §"PR 3: `catchup`". Reviewer feedback addressed: [`docs/superpowers/specs/2026-05-07-phase-5-t3-team-intelligence-review-feedback.md`](../specs/2026-05-07-phase-5-t3-team-intelligence-review-feedback.md) §4 (self-person fallback chain).

**Brainstorm decisions baked in (delta over locked spec):**

| Decision | Rationale |
|---|---|
| Self-person chain is **override → git email → OS username** | The spec's "OAuth-grant emails through `people/linker.ts`" assumed grantee-email plumbing that does not yet exist in the codebase (no `grantee_email` field, no OAuth-grant store). The git+OS chain works out of the box for the common case (the user is a git user) without expanding scope by ~150 lines of OAuth grant-store work. |
| **No `meta_store` cache** for the resolver result | The cache would require extending `ALLOWED_META_KEYS` (S4-F1 explicit allowlist). Each resolution is three quick I/O ops (~10 ms total). Per call cost is negligible; complexity isn't worth it. Tracked as a deferred follow-up. |
| **Five** parallel sub-agents (not six) | `s_self` from the spec collapses into a synchronous Stage 0 (mirroring `resolveStartEntity` in `impact.ts`) — the other five sub-agents need `selfPersonId` as a precondition, so resolving it as a sub-agent in the same parallel batch is incorrect. |
| Extend `parseSinceDurationToMs` to support `w` | Spec says `--since` accepts `s`/`m`/`h`/`d`/`w`. Existing parser supports `s`/`m`/`h`/`d`/`ms`. Add `w` to the regex + switch. |

**Starting state verified before plan was written:**
- `packages/gateway/src/agents/_lib/findings.ts:79-104, 151-164` — `CatchupBrief` / `CatchupItem` / `CatchupSection` types and `isCatchupBrief` already exist (PR 1).
- `packages/gateway/src/agents/_lib/render.ts:86-88` — `renderCatchup` is a thrown stub waiting for this PR.
- `packages/gateway/src/agents/_lib/synthesize.ts:24-35` — `SynthInput` is `ExpertBrief | ImpactBrief` with a "PR 3 widens this further to accept CatchupBrief" comment.
- `packages/gateway/src/agents/_lib/gap-notes.ts` — `detectMissingConnector`, `detectEmptyIndex` already exist and are tested.
- `packages/gateway/src/engine/coordinator.ts:43-83` — `AgentCoordinator.run(tasks)` is parallel via `Promise.all` (PR 1). Default caps: `Config.maxAgentDepth` and `Config.maxToolCallsPerSession`.
- `packages/gateway/src/ipc/agents-rpc.ts` — handles `agents.expert` + `agents.impact` (PR 1+2). The dispatcher (`packages/gateway/src/ipc/server/dispatchers.ts:84-108`) already routes `agents.*` to it.
- `packages/gateway/src/people/person-store.ts:65-85` — `findPersonByCanonicalEmail`, `findPersonByGithubLogin`, `normalizeEmail` already exist.
- `packages/cli/src/lib/parse-since.ts:4-29` — `parseSinceDurationToMs` already exists; current units are `d`/`h`/`m`/`s`/`ms` (no `w`).
- `packages/cli/src/commands/expert.ts` + `packages/cli/src/commands/impact.ts` — established CLI shape.
- `packages/cli/src/types/agents.ts` — mirrors `ExpertBrief` and `ImpactBrief` only.
- `packages/ui/src-tauri/src/gateway_bridge.rs:63-123` — `ALLOWED_METHODS` has 59 entries (assertion at `gateway_bridge.rs:448`); `agents.expert` at line 64, `agents.impact` at line 65.
- `CLAUDE.md` references `T3 PR 3 nimbus catchup next`; no `ALLOWED_METHODS (N)` count line in this file currently — **double-check before bumping**.
- Skill `.claude/commands/nimbus-tauri-allowlist.md` lines 38 + 41 reference the count of 59 (recently updated for PR 2).

**Out of scope for this plan:**
- OAuth grant-email storage / surfacing — defer to a future patch; the git+OS chain is sufficient for first-impression use.
- A `meta_store` cache for self-person resolution — defer until there is actual evidence of latency cost.
- A first-run wizard prompting for `me_person_id` — separate post-T3 quality-of-life patch.
- Tauri UI panel for `catchup` — the IPC + ALLOWED_METHODS row makes it addable later with no further gateway changes.
- LLM routing wiring — `synthesize()` is widened to accept `CatchupBrief`, but the e2e test calls it with no `llm` (deterministic path only).
- A new graph entity type for "involvement" — Stage 0 results are computed in-memory and only emitted via the `involvement` field of `CatchupBrief`.

---

## File Structure

### Files to create

| Path | Purpose |
|---|---|
| `packages/gateway/src/config/nimbus-toml-user.test.ts` | Tests for `[user] me_person_id` TOML parser |
| `packages/gateway/src/agents/_lib/self-person.ts` | Resolver: override → git → OS username; pure functions + `resolveSelfPerson` orchestrator |
| `packages/gateway/src/agents/_lib/self-person.test.ts` | Unit tests for each tier individually + fall-through behaviour |
| `packages/gateway/src/agents/catchup.ts` | Agent core: `runCatchup`, `emitCatchupBrief`, 5 sub-agents, stage-2 scoring + grouping |
| `packages/gateway/src/agents/catchup.test.ts` | Unit tests for the scoring/grouping helper, gap aggregation, and `runCatchup` against in-memory DB |
| `packages/gateway/test/e2e/scenarios/catchup.e2e.test.ts` | Gateway e2e: seeded two-service graph, `runCatchup` direct call, latency + HITL-free + brief-shape + first-section-ordering acceptance assertion |
| `packages/cli/src/commands/catchup.ts` | CLI command: arg parsing, IPC call, notification handling, output |
| `packages/cli/src/commands/catchup.test.ts` | Unit tests for `parseCatchupArgs` |
| `packages/cli/test/e2e/catchup.smoke.e2e.test.ts` | CLI no-Gateway smoke + help-text presence + missing-positional handling |

### Files to modify

| Path | Why |
|---|---|
| `packages/cli/src/lib/parse-since.ts` | Extend regex/switch to support `w` (weeks) |
| `packages/cli/src/lib/parse-since.test.ts` | Add a test pinning the new `w` unit (creating the file if it does not exist) |
| `packages/gateway/src/config/nimbus-toml.ts` | Add `NimbusUserToml`, `DEFAULT_NIMBUS_USER_TOML`, `parseNimbusUserToml`, `loadNimbusUserFromPath`, `loadNimbusUserFromConfigDir` |
| `packages/gateway/src/agents/_lib/render.ts` | Replace `renderCatchup` stub with real impl |
| `packages/gateway/src/agents/_lib/render.test.ts` | Add `renderCatchup` full-coverage + sparse fixture tests |
| `packages/gateway/src/agents/_lib/synthesize.ts` | Widen `SynthInput` to `ExpertBrief \| ImpactBrief \| CatchupBrief`; route to `renderCatchup`; tool name `agents.catchup` |
| `packages/gateway/src/agents/_lib/synthesize.test.ts` | Add fallback test for `CatchupBrief` path; add wrap-tool-name test |
| `packages/gateway/src/ipc/agents-rpc.ts` | Add `requireCatchupParams` + `agents.catchup` branch; widen `newSessionId` kind union; widen `AgentsRpcContext` with `configDir`; load `[user] me_person_id` |
| `packages/gateway/src/ipc/agents-rpc.test.ts` | Add `agents.catchup` validation, sessionId, and notification tests |
| `packages/gateway/src/ipc/server/dispatchers.ts` | Pass `ctx.options.configDir` through to `dispatchAgentsRpc` so the catchup branch can read TOML |
| `packages/cli/src/types/agents.ts` | Add `CatchupItem`, `CatchupSection`, `CatchupBrief` mirrors + `isCatchupBrief` shape check |
| `packages/cli/src/commands/index.ts` | Export `runCatchupCli` |
| `packages/cli/src/index.ts` | Register `catchup: runCatchupCli` in `COMMAND_HANDLERS`; import from `./commands/index.ts` |
| `packages/cli/src/commands/help.ts` | Add `nimbus catchup` line beneath the `impact` line |
| `packages/ui/src-tauri/src/gateway_bridge.rs` | Insert `"agents.catchup"` alphabetically (between `audit.export` and `agents.impact`); bump `ALLOWED_METHODS.len()` assertion 59 → 60; update inline comment |
| `.claude/commands/nimbus-tauri-allowlist.md` | Update count refs at lines 38 + 41 from 59 to 60 |
| `CLAUDE.md` | Flip status line `T3 PR 3 nimbus catchup next` → `T3 PR 3 nimbus catchup ✅`; bump Phase 5 status mirror |
| `docs/roadmap.md:556` | Tick the `nimbus catchup` checkbox; append a status mirror line |

---

## Task 1: Extend `parseSinceDurationToMs` to support `w` (weeks)

The CLI flag `--since 2w` must work. The shared parser currently only accepts `d/h/m/s/ms`. Smallest possible TDD cycle.

**Files:**
- Modify: `packages/cli/src/lib/parse-since.ts:6,14-28`
- Modify: `packages/cli/src/lib/parse-since.test.ts` (the test file does not exist today — it will be created in this task)

- [ ] **Step 1: Write the failing tests for `parseSinceDurationToMs`**

Create a new file `packages/cli/src/lib/parse-since.test.ts` with the full content below (we are pinning current behaviour as well so the regex extension does not silently widen the surface):

```typescript
import { describe, expect, test } from "bun:test";
import { parseSinceDurationToMs } from "./parse-since.ts";

describe("parseSinceDurationToMs", () => {
  test("supports d/h/m/s/ms units (existing contract)", () => {
    expect(parseSinceDurationToMs("7d")).toBe(7 * 24 * 60 * 60 * 1000);
    expect(parseSinceDurationToMs("24h")).toBe(24 * 60 * 60 * 1000);
    expect(parseSinceDurationToMs("30m")).toBe(30 * 60 * 1000);
    expect(parseSinceDurationToMs("90s")).toBe(90 * 1000);
    expect(parseSinceDurationToMs("250ms")).toBe(250);
  });

  test("supports w (weeks) — new in PR 3", () => {
    expect(parseSinceDurationToMs("1w")).toBe(7 * 24 * 60 * 60 * 1000);
    expect(parseSinceDurationToMs("2w")).toBe(2 * 7 * 24 * 60 * 60 * 1000);
  });

  test("rejects unknown units with a helpful message", () => {
    expect(() => parseSinceDurationToMs("5x")).toThrow(/Invalid --since/);
    expect(() => parseSinceDurationToMs("")).toThrow(/Invalid --since/);
  });

  test("rejects negative values", () => {
    expect(() => parseSinceDurationToMs("-1d")).toThrow(/Invalid --since/);
  });
});
```

- [ ] **Step 2: Run tests to verify the new `w` test fails**

Run: `bun test packages/cli/src/lib/parse-since.test.ts`
Expected: the `supports w (weeks)` test FAILs with `Invalid --since value "1w"` (the regex does not accept `w` yet). The other three tests pass.

- [ ] **Step 3: Add `w` to the regex and switch**

Edit `packages/cli/src/lib/parse-since.ts`. Two changes:

Replace line 6:
```typescript
  const m = /^(\d+)\s*(d|h|m|s|ms)$/i.exec(s);
```
with:
```typescript
  const m = /^(\d+)\s*(w|d|h|m|s|ms)$/i.exec(s);
```

In the `switch (unit)` block (lines 15-27), add a `case "w"` clause **before** `case "d"`:
```typescript
    case "w":
      return Math.floor(n * 7 * 24 * 60 * 60 * 1000);
    case "d":
      return Math.floor(n * 24 * 60 * 60 * 1000);
```

- [ ] **Step 4: Run tests to verify they all pass**

Run: `bun test packages/cli/src/lib/parse-since.test.ts`
Expected: PASS — 4 tests, all green.

Also re-run any consumer's tests to confirm no regression:
Run: `bun test packages/cli/src/commands/diag.test.ts`
Expected: PASS (the existing `--since 7d` consumer is unaffected).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/lib/parse-since.ts packages/cli/src/lib/parse-since.test.ts
git commit -m "feat(cli): support w (weeks) suffix in parseSinceDurationToMs"
```

---

## Task 2: Add `[user] me_person_id` TOML config section

The self-person resolver's first tier reads `[user] me_person_id` from the active profile's `nimbus.toml`. We mirror the existing single-section parser pattern (`parseNimbusTomlAutomationSection` / `loadNimbusAutomationFromConfigDir`).

**Files:**
- Modify: `packages/gateway/src/config/nimbus-toml.ts:682` (append new section)
- Create: `packages/gateway/src/config/nimbus-toml-user.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/gateway/src/config/nimbus-toml-user.test.ts`:

```typescript
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import {
  DEFAULT_NIMBUS_USER_TOML,
  loadNimbusUserFromConfigDir,
  loadNimbusUserFromPath,
  parseNimbusUserToml,
} from "./nimbus-toml.ts";

describe("parseNimbusUserToml", () => {
  test("returns defaults when [user] is absent", () => {
    const out = parseNimbusUserToml("");
    expect(out).toEqual(DEFAULT_NIMBUS_USER_TOML);
    expect(out.mePersonId).toBeUndefined();
  });

  test("reads me_person_id when set", () => {
    const out = parseNimbusUserToml('[user]\nme_person_id = "person-123"\n');
    expect(out.mePersonId).toBe("person-123");
  });

  test("ignores keys outside [user]", () => {
    const out = parseNimbusUserToml('[other]\nme_person_id = "ignored"\n');
    expect(out.mePersonId).toBeUndefined();
  });

  test("strips inline comments", () => {
    const out = parseNimbusUserToml('[user]\nme_person_id = "p1"  # my id\n');
    expect(out.mePersonId).toBe("p1");
  });

  test("ignores empty string values (treats as unset)", () => {
    const out = parseNimbusUserToml('[user]\nme_person_id = ""\n');
    expect(out.mePersonId).toBeUndefined();
  });
});

describe("loadNimbusUserFromPath", () => {
  test("returns defaults when file is missing", () => {
    const out = loadNimbusUserFromPath(join(tmpdir(), "does-not-exist.toml"));
    expect(out).toEqual(DEFAULT_NIMBUS_USER_TOML);
  });

  test("reads me_person_id from disk", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-user-toml-"));
    const p = join(dir, "nimbus.toml");
    writeFileSync(p, '[user]\nme_person_id = "person-abc"\n', "utf8");
    const out = loadNimbusUserFromPath(p);
    expect(out.mePersonId).toBe("person-abc");
  });

  test("returns defaults on parse error (treats malformed file as absent)", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-user-toml-bad-"));
    const p = join(dir, "nimbus.toml");
    writeFileSync(p, "not actually toml ============", "utf8");
    expect(() => loadNimbusUserFromPath(p)).not.toThrow();
  });
});

describe("loadNimbusUserFromConfigDir", () => {
  test("resolves <configDir>/nimbus.toml", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-user-cfg-"));
    writeFileSync(join(dir, "nimbus.toml"), '[user]\nme_person_id = "p-cfg"\n', "utf8");
    const out = loadNimbusUserFromConfigDir(dir);
    expect(out.mePersonId).toBe("p-cfg");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/gateway/src/config/nimbus-toml-user.test.ts`
Expected: FAIL — exports `DEFAULT_NIMBUS_USER_TOML`, `parseNimbusUserToml`, `loadNimbusUserFromPath`, `loadNimbusUserFromConfigDir` do not exist.

- [ ] **Step 3: Add the user-section types, parser, and loaders**

Append to `packages/gateway/src/config/nimbus-toml.ts` (after the existing `loadNimbusAutomationFromConfigDir` at line 682):

```typescript
// ---------------------------------------------------------------------------
// [user] — first-class identity hint for built-in agents (T3 PR 3).
// ---------------------------------------------------------------------------

export type NimbusUserToml = {
  /** Optional override for self-person resolution; consumed by `nimbus catchup`. */
  mePersonId?: string;
};

export const DEFAULT_NIMBUS_USER_TOML: NimbusUserToml = {};

function parseNimbusTomlUserSection(source: string): Partial<NimbusUserToml> {
  const lines = source.split(/\r?\n/);
  let inSection = false;
  const out: Partial<NimbusUserToml> = {};
  for (const line of lines) {
    const trimmed = stripComment(line).trim();
    if (trimmed === "") continue;
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      inSection = trimmed === "[user]";
      continue;
    }
    if (!inSection) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const valRaw = trimmed.slice(eq + 1).trim();
    if (key === "me_person_id") {
      const v = parseString(valRaw);
      if (v.length > 0) out.mePersonId = v;
    }
  }
  return out;
}

export function parseNimbusUserToml(
  raw: string,
  defaults: NimbusUserToml = DEFAULT_NIMBUS_USER_TOML,
): NimbusUserToml {
  return { ...defaults, ...parseNimbusTomlUserSection(raw) };
}

export function loadNimbusUserFromPath(tomlPath: string): NimbusUserToml {
  if (!existsSync(tomlPath)) {
    return structuredClone(DEFAULT_NIMBUS_USER_TOML);
  }
  try {
    const raw = readFileSync(tomlPath, "utf8");
    return parseNimbusUserToml(raw);
  } catch {
    return structuredClone(DEFAULT_NIMBUS_USER_TOML);
  }
}

export function loadNimbusUserFromConfigDir(configDir: string): NimbusUserToml {
  return loadNimbusUserFromPath(join(configDir, "nimbus.toml"));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/gateway/src/config/nimbus-toml-user.test.ts`
Expected: PASS — 9 tests green.

Also re-run the sibling section tests to confirm no regression:
Run: `bun test packages/gateway/src/config/nimbus-toml-automation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/config/nimbus-toml.ts packages/gateway/src/config/nimbus-toml-user.test.ts
git commit -m "feat(config): add [user] me_person_id TOML section"
```

---

## Task 3: Implement `_lib/self-person.ts` (three-tier resolver)

Three independent resolution functions plus a `resolveSelfPerson` orchestrator. Each tier tested in isolation; orchestrator tested end-to-end with mocked git/OS branches.

**Files:**
- Create: `packages/gateway/src/agents/_lib/self-person.ts`
- Create: `packages/gateway/src/agents/_lib/self-person.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/gateway/src/agents/_lib/self-person.test.ts`:

```typescript
import { Database } from "bun:sqlite";
import { afterEach, describe, expect, mock, test } from "bun:test";
import { LocalIndex } from "../../index/local-index.ts";
import { insertPerson } from "../../people/person-store.ts";
import {
  resolveByGitEmail,
  resolveByOsUsername,
  resolveSelfPerson,
} from "./self-person.ts";

function freshDb(): Database {
  const db = new Database(":memory:");
  LocalIndex.ensureSchema(db);
  return db;
}

afterEach(() => {
  mock.restore();
});

describe("resolveByGitEmail", () => {
  test("returns null when git is unavailable", async () => {
    const out = await resolveByGitEmail(freshDb(), {
      runGit: async () => null,
    });
    expect(out).toBeNull();
  });

  test("returns null when git outputs an empty email", async () => {
    const out = await resolveByGitEmail(freshDb(), {
      runGit: async () => "",
    });
    expect(out).toBeNull();
  });

  test("returns null when no person matches the canonical email", async () => {
    const db = freshDb();
    insertPerson(db, {
      id: "p-1",
      displayName: "Alice",
      canonicalEmail: "alice@example.com",
      githubLogin: null,
      gitlabLogin: null,
      slackHandle: null,
      linearMemberId: null,
      jiraAccountId: null,
      notionUserId: null,
      bitbucketUuid: null,
      linked: false,
      metadata: {},
    });
    const out = await resolveByGitEmail(db, {
      runGit: async () => "bob@example.com",
    });
    expect(out).toBeNull();
  });

  test("returns the matching person id, normalising the email", async () => {
    const db = freshDb();
    insertPerson(db, {
      id: "p-2",
      displayName: "Alice",
      canonicalEmail: "alice@example.com",
      githubLogin: null,
      gitlabLogin: null,
      slackHandle: null,
      linearMemberId: null,
      jiraAccountId: null,
      notionUserId: null,
      bitbucketUuid: null,
      linked: false,
      metadata: {},
    });
    const out = await resolveByGitEmail(db, {
      runGit: async () => "  Alice@Example.COM  ",
    });
    expect(out).toBe("p-2");
  });
});

describe("resolveByOsUsername", () => {
  test("returns null when osUsername is empty", () => {
    const out = resolveByOsUsername(freshDb(), { osUsername: "" });
    expect(out).toBeNull();
  });

  test("returns null when no person has the github_login", () => {
    const out = resolveByOsUsername(freshDb(), { osUsername: "ghost" });
    expect(out).toBeNull();
  });

  test("returns the matching person id when github_login matches", () => {
    const db = freshDb();
    insertPerson(db, {
      id: "p-3",
      displayName: "Carol",
      canonicalEmail: null,
      githubLogin: "carol",
      gitlabLogin: null,
      slackHandle: null,
      linearMemberId: null,
      jiraAccountId: null,
      notionUserId: null,
      bitbucketUuid: null,
      linked: false,
      metadata: {},
    });
    const out = resolveByOsUsername(db, { osUsername: "carol" });
    expect(out).toBe("p-3");
  });
});

describe("resolveSelfPerson (orchestrator)", () => {
  test("override wins over all other tiers", async () => {
    const db = freshDb();
    const out = await resolveSelfPerson(db, {
      override: "p-override",
      runGit: async () => "anything@example.com",
      osUsername: "anyone",
    });
    expect(out.personId).toBe("p-override");
    expect(out.source).toBe("override");
  });

  test("falls back to git when override is undefined", async () => {
    const db = freshDb();
    insertPerson(db, {
      id: "p-git",
      displayName: "Dan",
      canonicalEmail: "dan@example.com",
      githubLogin: null,
      gitlabLogin: null,
      slackHandle: null,
      linearMemberId: null,
      jiraAccountId: null,
      notionUserId: null,
      bitbucketUuid: null,
      linked: false,
      metadata: {},
    });
    const out = await resolveSelfPerson(db, {
      runGit: async () => "dan@example.com",
      osUsername: "ignored",
    });
    expect(out.personId).toBe("p-git");
    expect(out.source).toBe("git");
  });

  test("falls back to OS username when git matches no person", async () => {
    const db = freshDb();
    insertPerson(db, {
      id: "p-os",
      displayName: "Erin",
      canonicalEmail: null,
      githubLogin: "erin",
      gitlabLogin: null,
      slackHandle: null,
      linearMemberId: null,
      jiraAccountId: null,
      notionUserId: null,
      bitbucketUuid: null,
      linked: false,
      metadata: {},
    });
    const out = await resolveSelfPerson(db, {
      runGit: async () => "ghost@example.com",
      osUsername: "erin",
    });
    expect(out.personId).toBe("p-os");
    expect(out.source).toBe("os");
  });

  test("returns null + 'unresolved' when all tiers miss", async () => {
    const out = await resolveSelfPerson(freshDb(), {
      runGit: async () => null,
      osUsername: "ghost",
    });
    expect(out.personId).toBeNull();
    expect(out.source).toBe("unresolved");
  });

  test("override is used verbatim — no validation that the person exists", async () => {
    // This is intentional: downstream sub-agents will return zero evidence and
    // emit gaps, which is the correct user-facing signal that the override is
    // wrong. We do NOT pre-validate here because doing so would add a DB read
    // on the hot path for every catchup invocation.
    const out = await resolveSelfPerson(freshDb(), {
      override: "person-does-not-exist",
      runGit: async () => null,
      osUsername: "",
    });
    expect(out.personId).toBe("person-does-not-exist");
    expect(out.source).toBe("override");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/gateway/src/agents/_lib/self-person.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `self-person.ts`**

Create `packages/gateway/src/agents/_lib/self-person.ts`:

```typescript
import type { Database } from "bun:sqlite";
import {
  findPersonByCanonicalEmail,
  findPersonByGithubLogin,
  normalizeEmail,
} from "../../people/person-store.ts";

/**
 * Self-person resolution chain for `nimbus catchup`.
 *
 * Tiers (in order):
 *   1. `[user] me_person_id` from the active profile's nimbus.toml.
 *      Used verbatim — not validated against the index. If the override
 *      is wrong, downstream sub-agents return zero evidence and emit gaps,
 *      which is the correct user-facing signal.
 *   2. `git config user.email` — looked up via person.canonical_email after
 *      `normalizeEmail` (lowercase + trim). Common case: the user is a
 *      git user and their indexed person row already carries the same
 *      canonical email.
 *   3. OS username (`os.userInfo().username`) — looked up via
 *      person.github_login (the most common convention: dev's local user
 *      matches their github handle). We do NOT fan out to every per-service
 *      handle column because the false-match rate climbs quickly and the
 *      gap-note path is preferable to a wrong identity.
 *
 * If all three miss, returns `{ personId: null, source: "unresolved" }`. The
 * caller emits a `missing_user_identity` gap note pointing at
 * `nimbus config set user.me_person_id <id>`.
 */

export type SelfPersonSource = "override" | "git" | "os" | "unresolved";

export type SelfPersonResolution = {
  personId: string | null;
  source: SelfPersonSource;
};

export type GitRunner = () => Promise<string | null>;

export type ResolveSelfPersonInput = {
  override?: string;
  runGit?: GitRunner;
  osUsername?: string;
};

export async function defaultRunGitConfigUserEmail(): Promise<string | null> {
  try {
    const proc = Bun.spawn(["git", "config", "user.email"], {
      stdout: "pipe",
      stderr: "ignore",
    });
    const out = await new Response(proc.stdout).text();
    const code = await proc.exited;
    if (code !== 0) return null;
    return out;
  } catch {
    return null;
  }
}

export async function resolveByGitEmail(
  db: Database,
  deps: { runGit: GitRunner },
): Promise<string | null> {
  const raw = await deps.runGit();
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const email = normalizeEmail(trimmed);
  const person = findPersonByCanonicalEmail(db, email);
  return person?.id ?? null;
}

export function resolveByOsUsername(
  db: Database,
  deps: { osUsername: string },
): string | null {
  const u = deps.osUsername.trim();
  if (u.length === 0) return null;
  const person = findPersonByGithubLogin(db, u);
  return person?.id ?? null;
}

export async function resolveSelfPerson(
  db: Database,
  input: ResolveSelfPersonInput,
): Promise<SelfPersonResolution> {
  if (input.override !== undefined && input.override.length > 0) {
    return { personId: input.override, source: "override" };
  }
  const runGit = input.runGit ?? defaultRunGitConfigUserEmail;
  const fromGit = await resolveByGitEmail(db, { runGit });
  if (fromGit !== null) return { personId: fromGit, source: "git" };
  const osUsername = input.osUsername ?? "";
  const fromOs = resolveByOsUsername(db, { osUsername });
  if (fromOs !== null) return { personId: fromOs, source: "os" };
  return { personId: null, source: "unresolved" };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/gateway/src/agents/_lib/self-person.test.ts`
Expected: PASS — 12 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/agents/_lib/self-person.ts packages/gateway/src/agents/_lib/self-person.test.ts
git commit -m "feat(agents): add self-person resolver (override / git / OS chain)"
```

---

## Task 4: Implement `renderCatchup` (deterministic Markdown renderer)

The renderer is the **golden** — synthesis falls back to it when no LLM is wired, and the e2e test asserts on its output. Build it next so later tasks can render against it.

**Files:**
- Modify: `packages/gateway/src/agents/_lib/render.ts:86-88`
- Modify: `packages/gateway/src/agents/_lib/render.test.ts`

- [ ] **Step 1: Write the failing tests for `renderCatchup`**

Append to `packages/gateway/src/agents/_lib/render.test.ts`:

```typescript
import type { CatchupBrief } from "./findings.ts";
import { renderCatchup } from "./render.ts";

const CATCHUP_BASE: Pick<CatchupBrief, "kind" | "agentVersion" | "generatedAt" | "latencyMs"> = {
  kind: "catchup",
  agentVersion: 1,
  generatedAt: 1_700_000_000_000,
  latencyMs: 12_400,
};

describe("renderCatchup", () => {
  test("full-coverage fixture: per-service sections, items with relevance reasons, no Gaps", () => {
    const brief: CatchupBrief = {
      ...CATCHUP_BASE,
      gaps: [],
      query: { sinceMs: 3 * 24 * 60 * 60 * 1000 },
      selfPersonId: "person-alice",
      involvement: {
        ownedServices: ["github"],
        activeRepos: ["acme/payment"],
        incidentServices: ["pagerduty"],
        collaboratorPersonIds: ["person-bob"],
      },
      sections: [
        {
          serviceId: "github",
          totalItemsInWindow: 14,
          items: [
            {
              itemId: "github:acme/payment#501",
              title: "fix retry backoff in payment-service",
              modifiedAt: 1_699_900_000_000,
              relevanceScore: 0.92,
              relevanceReasons: ["owned_service:github", "active_repo:acme/payment"],
            },
            {
              itemId: "github:acme/payment#502",
              title: "bump deps",
              modifiedAt: 1_699_800_000_000,
              relevanceScore: 0.41,
              relevanceReasons: ["active_repo:acme/payment"],
            },
          ],
        },
        {
          serviceId: "pagerduty",
          totalItemsInWindow: 2,
          items: [
            {
              itemId: "pagerduty:incident/PXYZ",
              title: "Payment Service Latency Spike",
              modifiedAt: 1_699_950_000_000,
              relevanceScore: 0.72,
              relevanceReasons: ["incident_service:pagerduty"],
            },
          ],
        },
      ],
    };
    const md = renderCatchup(brief);
    expect(md).toContain("# Catchup");
    expect(md).toContain("## github");
    expect(md).toContain("(14 items in window)");
    expect(md).toContain("fix retry backoff in payment-service");
    expect(md).toContain("owned_service:github");
    expect(md).toContain("## pagerduty");
    expect(md).toContain("Payment Service Latency Spike");
    expect(md).not.toContain("## Gaps");
    expect(md).toContain("_generated in 12.4 s_");
  });

  test("sparse fixture: missing_user_identity gap rendered with remediation", () => {
    const brief: CatchupBrief = {
      ...CATCHUP_BASE,
      gaps: [
        {
          category: "missing_user_identity",
          detail: "Could not resolve the current user — no override / git email / OS username matched a known person.",
          remediation:
            "Set `[user] me_person_id` in your active profile's nimbus.toml, or run `nimbus people search <you>` to find your person id.",
        },
      ],
      query: { sinceMs: 3 * 24 * 60 * 60 * 1000 },
      selfPersonId: null,
      involvement: {
        ownedServices: [],
        activeRepos: [],
        incidentServices: [],
        collaboratorPersonIds: [],
      },
      sections: [],
    };
    const md = renderCatchup(brief);
    expect(md).toContain("# Catchup");
    expect(md).toContain("_no activity in the requested window_");
    expect(md).toContain("## Gaps");
    expect(md).toContain("Could not resolve the current user");
    expect(md).toContain("nimbus people search");
  });

  test("renderCatchup is deterministic across two calls with the same brief", () => {
    const brief: CatchupBrief = {
      ...CATCHUP_BASE,
      gaps: [],
      query: { sinceMs: 1_000 },
      selfPersonId: "person-x",
      involvement: {
        ownedServices: [],
        activeRepos: [],
        incidentServices: [],
        collaboratorPersonIds: [],
      },
      sections: [],
    };
    expect(renderCatchup(brief)).toBe(renderCatchup(brief));
  });

  test("section header lists item count and orders items by relevance descending", () => {
    const brief: CatchupBrief = {
      ...CATCHUP_BASE,
      gaps: [],
      query: { sinceMs: 1_000 },
      selfPersonId: "p",
      involvement: {
        ownedServices: [],
        activeRepos: [],
        incidentServices: [],
        collaboratorPersonIds: [],
      },
      sections: [
        {
          serviceId: "linear",
          totalItemsInWindow: 3,
          items: [
            {
              itemId: "linear:1",
              title: "low",
              modifiedAt: 0,
              relevanceScore: 0.1,
              relevanceReasons: [],
            },
            {
              itemId: "linear:2",
              title: "high",
              modifiedAt: 0,
              relevanceScore: 0.9,
              relevanceReasons: [],
            },
          ],
        },
      ],
    };
    const md = renderCatchup(brief);
    // The first item rendered under `## linear` must be the high-scoring one.
    const linearIdx = md.indexOf("## linear");
    const highIdx = md.indexOf("**high**");
    const lowIdx = md.indexOf("**low**");
    expect(linearIdx).toBeGreaterThan(-1);
    expect(highIdx).toBeGreaterThan(linearIdx);
    expect(lowIdx).toBeGreaterThan(highIdx);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/gateway/src/agents/_lib/render.test.ts`
Expected: FAIL — `renderCatchup is implemented in T3 PR 3` (the existing stub throws).

- [ ] **Step 3: Replace the `renderCatchup` stub with the real renderer**

In `packages/gateway/src/agents/_lib/render.ts`, replace lines 85-88 (the stub) with:

```typescript
function renderCatchupItem(item: {
  title: string;
  itemId: string;
  relevanceScore: number;
  relevanceReasons: string[];
}): string {
  const head = `- **${item.title}** (\`${item.itemId}\`, score ${item.relevanceScore.toFixed(2)})`;
  if (item.relevanceReasons.length === 0) return head;
  const reasons = item.relevanceReasons.map((r) => `   - ${r}`).join("\n");
  return [head, reasons].join("\n");
}

export function renderCatchup(brief: CatchupBrief): string {
  const header = "# Catchup";
  const sections: string[] = [];
  if (brief.sections.length === 0) {
    sections.push("_no activity in the requested window_");
  } else {
    for (const s of brief.sections) {
      const heading = `## ${s.serviceId} (${s.totalItemsInWindow} items in window)`;
      const ordered = [...s.items].sort((a, b) => b.relevanceScore - a.relevanceScore);
      const block = [heading, "", ...ordered.map(renderCatchupItem)].join("\n");
      sections.push(block);
    }
  }
  const gaps = renderGaps(brief.gaps);
  const footer = renderLatency(brief.latencyMs);
  return [header, "", ...sections, gaps, footer].filter((s) => s !== "").join("\n");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/gateway/src/agents/_lib/render.test.ts`
Expected: PASS — all renderExpert / renderImpact / renderCatchup tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/agents/_lib/render.ts packages/gateway/src/agents/_lib/render.test.ts
git commit -m "feat(agents): implement renderCatchup deterministic markdown"
```

---

## Task 5: Widen `synthesize()` to accept `CatchupBrief`

The synthesizer must dispatch on `kind` to the right deterministic renderer; the LLM-wrap tool name must be `agents.catchup` for the catchup path so the I11 envelope is correctly attributed.

**Files:**
- Modify: `packages/gateway/src/agents/_lib/synthesize.ts:24-35`
- Modify: `packages/gateway/src/agents/_lib/synthesize.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `packages/gateway/src/agents/_lib/synthesize.test.ts`:

```typescript
import type { CatchupBrief } from "./findings.ts";

const CATCHUP_FIXTURE: CatchupBrief = {
  kind: "catchup",
  agentVersion: 1,
  generatedAt: 0,
  latencyMs: 0,
  gaps: [],
  query: { sinceMs: 1_000 },
  selfPersonId: "p-1",
  involvement: {
    ownedServices: [],
    activeRepos: [],
    incidentServices: [],
    collaboratorPersonIds: [],
  },
  sections: [],
};

describe("synthesize(CatchupBrief)", () => {
  test("falls back to deterministic render when no LLM provided", async () => {
    const md = await synthesize(CATCHUP_FIXTURE);
    expect(md).toContain("# Catchup");
    expect(md).toContain("_no activity in the requested window_");
  });

  test("falls back to deterministic render when LLM returns null", async () => {
    const llm = { generateMarkdown: mock(async () => null) };
    const md = await synthesize(CATCHUP_FIXTURE, { llm });
    expect(md).toContain("# Catchup");
    expect(llm.generateMarkdown).toHaveBeenCalledTimes(1);
  });

  test("on LLM throw, falls back to deterministic render", async () => {
    const llm = {
      generateMarkdown: mock(async () => {
        throw new Error("rate limited");
      }),
    };
    const md = await synthesize(CATCHUP_FIXTURE, { llm });
    expect(md).toContain("# Catchup");
  });

  test("wraps CatchupBrief payload with tool name agents.catchup (I11)", async () => {
    const seenPrompt: string[] = [];
    const llm = {
      generateMarkdown: mock(async (prompt: string) => {
        seenPrompt.push(prompt);
        return "# LLM-rewritten Catchup Markdown";
      }),
    };
    const md = await synthesize(CATCHUP_FIXTURE, { llm });
    expect(md).toBe("# LLM-rewritten Catchup Markdown");
    expect(seenPrompt[0]).toMatch(
      /<tool_output service="nimbus" tool="agents\.catchup">[^<]*"kind":"catchup"[^<]*<\/tool_output>/,
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/gateway/src/agents/_lib/synthesize.test.ts`
Expected: FAIL — TypeScript / runtime error: `synthesize` does not accept `CatchupBrief`.

- [ ] **Step 3: Widen the union and dispatch**

In `packages/gateway/src/agents/_lib/synthesize.ts`, replace lines 1-3 with:

```typescript
import { wrapToolOutput } from "../../engine/tool-output-envelope.ts";
import type { CatchupBrief, ExpertBrief, ImpactBrief } from "./findings.ts";
import { renderCatchup, renderExpert, renderImpact } from "./render.ts";
```

Replace lines 24-35 (the `SynthInput` type alias, `deterministicRender`, `toolNameFor`, and the trailing comment) with:

```typescript
type SynthInput = ExpertBrief | ImpactBrief | CatchupBrief;

function deterministicRender(brief: SynthInput): string {
  if (brief.kind === "expert") return renderExpert(brief);
  if (brief.kind === "impact") return renderImpact(brief);
  return renderCatchup(brief);
}

function toolNameFor(brief: SynthInput): string {
  if (brief.kind === "expert") return "agents.expert";
  if (brief.kind === "impact") return "agents.impact";
  return "agents.catchup";
}
```

(No other changes to `synthesize.ts` — the existing fallback / wrap / try-catch logic already operates on `SynthInput`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/gateway/src/agents/_lib/synthesize.test.ts`
Expected: PASS — Expert + Impact + Catchup suites all green.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/agents/_lib/synthesize.ts packages/gateway/src/agents/_lib/synthesize.test.ts
git commit -m "feat(agents): widen synthesize() to accept CatchupBrief"
```

---

## Task 6: Implement `agents/catchup.ts` (5 sub-agents + Stage 2 scoring)

The agent core. Stage 0 resolves the self-person synchronously. Stage 1 fans out 5 sub-agents through the coordinator. Stage 2 scores each window item against involvement signals, groups by service, orders sections by aggregate relevance.

**Files:**
- Create: `packages/gateway/src/agents/catchup.ts`
- Create: `packages/gateway/src/agents/catchup.test.ts`

- [ ] **Step 1: Write the failing unit tests**

Create `packages/gateway/src/agents/catchup.test.ts`:

```typescript
import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { LocalIndex } from "../index/local-index.ts";
import { insertPerson } from "../people/person-store.ts";
import { runCatchup, scoreAndGroup } from "./catchup.ts";

function freshDb(): Database {
  const db = new Database(":memory:");
  LocalIndex.ensureSchema(db);
  return db;
}

describe("scoreAndGroup", () => {
  test("groups items by service, orders items within section by score desc", () => {
    const involvement = {
      ownedServices: ["github"],
      activeRepos: [],
      incidentServices: [],
      collaboratorPersonIds: [],
    };
    const items = [
      {
        id: "github:1",
        service: "github",
        title: "low",
        modifiedAt: 0,
        repoLabel: null,
        authorPersonId: null,
      },
      {
        id: "github:2",
        service: "github",
        title: "high",
        modifiedAt: 0,
        repoLabel: null,
        authorPersonId: null,
      },
    ];
    const sections = scoreAndGroup(items, involvement);
    expect(sections.length).toBe(1);
    expect(sections[0]?.serviceId).toBe("github");
    // Both items match owned_service:github → both score the same and have
    // equal modifiedAt; stable sort preserves insertion order ("low" first,
    // then "high"). This test does NOT assert intra-section order — see the
    // next test for the deterministic ordering assertion.
    expect(sections[0]?.items.map((i) => i.title).sort()).toEqual(["high", "low"]);
  });

  test("ranks owned_service highest, then active_repo, then collaborator, then default", () => {
    const involvement = {
      ownedServices: ["github"],
      activeRepos: ["acme/payment"],
      incidentServices: [],
      collaboratorPersonIds: ["p-bob"],
    };
    const items = [
      {
        id: "linear:1",
        service: "linear",
        title: "default-only",
        modifiedAt: 1,
        repoLabel: null,
        authorPersonId: null,
      },
      {
        id: "github:1",
        service: "github",
        title: "owned",
        modifiedAt: 1,
        repoLabel: null,
        authorPersonId: null,
      },
      {
        id: "github:2",
        service: "github",
        title: "owned+repo",
        modifiedAt: 2, // strictly newer than `owned` so the modifiedAt tie-break is deterministic
        repoLabel: "acme/payment",
        authorPersonId: null,
      },
      {
        id: "slack:1",
        service: "slack",
        title: "collaborator",
        modifiedAt: 1,
        repoLabel: null,
        authorPersonId: "p-bob",
      },
    ];
    const sections = scoreAndGroup(items, involvement);
    // Expect three sections: github (highest aggregate), slack (collaborator),
    // linear (default-only).
    expect(sections.map((s) => s.serviceId)).toEqual(["github", "slack", "linear"]);
    // Within github: owned+repo > owned-only.
    const ghTitles = sections.find((s) => s.serviceId === "github")?.items.map((i) => i.title);
    expect(ghTitles).toEqual(["owned+repo", "owned"]);
  });

  test("returns empty array when no items", () => {
    const sections = scoreAndGroup([], {
      ownedServices: [],
      activeRepos: [],
      incidentServices: [],
      collaboratorPersonIds: [],
    });
    expect(sections).toEqual([]);
  });
});

describe("runCatchup", () => {
  test("returns a structurally valid CatchupBrief on an empty index", async () => {
    const db = freshDb();
    const brief = await runCatchup(
      { sinceMs: 3 * 24 * 60 * 60 * 1000 },
      { db, sessionId: "t-1", notify: () => {} },
    );
    expect(brief.kind).toBe("catchup");
    expect(brief.agentVersion).toBe(1);
    expect(brief.query.sinceMs).toBe(3 * 24 * 60 * 60 * 1000);
    expect(Array.isArray(brief.sections)).toBe(true);
    expect(Array.isArray(brief.gaps)).toBe(true);
    expect(brief.gaps.some((g) => g.category === "empty_index")).toBe(true);
    expect(typeof brief.latencyMs).toBe("number");
  });

  test("emits missing_user_identity gap when self-person resolution fails entirely", async () => {
    const db = freshDb();
    db.run(
      "INSERT INTO item (id, service, type, external_id, title, body_preview, modified_at, synced_at, pinned) VALUES " +
        "('seed', 'github', 'pr', 'acme/x#1', 't', '', 0, 0, 0)",
    );
    const brief = await runCatchup(
      {
        sinceMs: 3 * 24 * 60 * 60 * 1000,
        // Force the resolver miss path by injecting empty/null deps.
        runGitOverride: async () => null,
        osUsernameOverride: "",
      },
      { db, sessionId: "t-2", notify: () => {} },
    );
    expect(brief.selfPersonId).toBeNull();
    expect(brief.gaps.some((g) => g.category === "missing_user_identity")).toBe(true);
  });

  test("respects --service filter on sections", async () => {
    const db = freshDb();
    insertPerson(db, {
      id: "p-self",
      displayName: "Self",
      canonicalEmail: "self@example.com",
      githubLogin: null,
      gitlabLogin: null,
      slackHandle: null,
      linearMemberId: null,
      jiraAccountId: null,
      notionUserId: null,
      bitbucketUuid: null,
      linked: false,
      metadata: {},
    });
    const now = Date.now();
    db.run(
      "INSERT INTO item (id, service, type, external_id, title, body_preview, modified_at, synced_at, pinned) VALUES " +
        "('a', 'github', 'pr', 'acme/x#1', 'a', '', ?, ?, 0)," +
        "('b', 'linear', 'issue', 'lin-1', 'b', '', ?, ?, 0)",
      [now, now, now, now],
    );
    const brief = await runCatchup(
      {
        sinceMs: 3 * 24 * 60 * 60 * 1000,
        service: "github",
        mePersonIdOverride: "p-self",
      },
      { db, sessionId: "t-3", notify: () => {} },
    );
    expect(brief.sections.every((s) => s.serviceId === "github")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/gateway/src/agents/catchup.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `agents/catchup.ts`**

Create `packages/gateway/src/agents/catchup.ts`:

```typescript
import type { Database } from "bun:sqlite";
import { userInfo } from "node:os";
import { AgentCoordinator, type SubTask } from "../engine/coordinator.ts";
import type {
  CatchupBrief,
  CatchupItem,
  CatchupSection,
  GapNote,
} from "./_lib/findings.ts";
import { detectEmptyIndex } from "./_lib/gap-notes.ts";
import {
  type GitRunner,
  resolveSelfPerson,
} from "./_lib/self-person.ts";
import { type SynthesizerLlm, synthesize } from "./_lib/synthesize.ts";

const DEFAULT_SINCE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const MAX_SINCE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const PER_SERVICE_QUOTA = 50;

export type CatchupInput = {
  sinceMs?: number;
  service?: string;
  /** Test seam — override the active profile's [user] me_person_id. */
  mePersonIdOverride?: string;
  /** Test seam — replace the default `git config user.email` runner. */
  runGitOverride?: GitRunner;
  /** Test seam — replace the default `os.userInfo().username` lookup. */
  osUsernameOverride?: string;
};

export type CatchupContext = {
  db: Database;
  llm?: SynthesizerLlm;
  notify: (method: string, params: unknown) => void;
  sessionId: string;
};

export type Involvement = {
  ownedServices: string[];
  activeRepos: string[];
  incidentServices: string[];
  collaboratorPersonIds: string[];
};

export type WindowItem = {
  id: string;
  service: string;
  title: string;
  modifiedAt: number;
  repoLabel: string | null;
  authorPersonId: string | null;
};

type SubAgentResult = {
  // Each sub-agent returns a single typed slice of the involvement set or the
  // window-item bag. The agent merges them in the post-Promise loop.
  ownedServices?: string[];
  activeRepos?: string[];
  incidentServices?: string[];
  collaboratorPersonIds?: string[];
  windowItems?: WindowItem[];
  gap?: GapNote;
};

function makeSubAgent(
  fn: (db: Database, selfPersonId: string | null, sinceMs: number) => Promise<SubAgentResult>,
  db: Database,
  selfPersonId: string | null,
  sinceMs: number,
): SubTask {
  return {
    taskType: "agent_step",
    prompt: "",
    execute: async () => {
      const out = await fn(db, selfPersonId, sinceMs);
      return { text: JSON.stringify(out), tokensIn: 0, tokensOut: 0 };
    },
  };
}

export async function runCatchup(input: CatchupInput, ctx: CatchupContext): Promise<CatchupBrief> {
  const start = performance.now();
  const sinceMs = Math.min(input.sinceMs ?? DEFAULT_SINCE_MS, MAX_SINCE_MS);

  const preflightGaps: GapNote[] = [];
  const empty = detectEmptyIndex(ctx.db);
  if (empty !== null) preflightGaps.push(empty);

  // Stage 0 — synchronous self-person resolution. Must complete before fan-out
  // because every Stage 1 sub-agent needs `selfPersonId`.
  const osUsername = input.osUsernameOverride ?? safeOsUsername();
  const resolution = await resolveSelfPerson(ctx.db, {
    ...(input.mePersonIdOverride === undefined ? {} : { override: input.mePersonIdOverride }),
    ...(input.runGitOverride === undefined ? {} : { runGit: input.runGitOverride }),
    osUsername,
  });
  if (resolution.source === "unresolved") {
    preflightGaps.push({
      category: "missing_user_identity",
      detail:
        "Could not resolve the current user — no override / git email / OS username matched a known person.",
      remediation:
        "Set `[user] me_person_id` in your active profile's nimbus.toml, or run `nimbus people search <you>` to find your person id.",
    });
  }

  // Stage 1 — five parallel sub-agents.
  const coordinator = new AgentCoordinator({
    sessionId: ctx.sessionId,
    parentId: `catchup:${ctx.sessionId}`,
    depth: 1,
    toolCallCount: { value: 0 },
  });
  const tasks: SubTask[] = [
    makeSubAgent(subOwnedServices, ctx.db, resolution.personId, sinceMs),
    makeSubAgent(subActiveRepos, ctx.db, resolution.personId, sinceMs),
    makeSubAgent(subRespondedIncidents, ctx.db, resolution.personId, sinceMs),
    makeSubAgent(subCollaborators, ctx.db, resolution.personId, sinceMs),
    makeSubAgent(subWindowItems, ctx.db, resolution.personId, sinceMs),
  ];
  const results = await coordinator.run(tasks);

  // Merge sub-agent outputs.
  const involvement: Involvement = {
    ownedServices: [],
    activeRepos: [],
    incidentServices: [],
    collaboratorPersonIds: [],
  };
  const windowItems: WindowItem[] = [];
  const subAgentGaps: GapNote[] = [];
  for (const r of results) {
    if (r.status !== "done" || r.text === undefined) {
      subAgentGaps.push({
        category: "missing_connector",
        detail: `catchup sub-agent #${r.taskIndex} failed${
          r.errorText === undefined ? "" : `: ${r.errorText}`
        }`,
      });
      continue;
    }
    const decoded: SubAgentResult = JSON.parse(r.text);
    if (decoded.ownedServices !== undefined) involvement.ownedServices.push(...decoded.ownedServices);
    if (decoded.activeRepos !== undefined) involvement.activeRepos.push(...decoded.activeRepos);
    if (decoded.incidentServices !== undefined) involvement.incidentServices.push(...decoded.incidentServices);
    if (decoded.collaboratorPersonIds !== undefined) involvement.collaboratorPersonIds.push(...decoded.collaboratorPersonIds);
    if (decoded.windowItems !== undefined) windowItems.push(...decoded.windowItems);
    if (decoded.gap !== undefined) subAgentGaps.push(decoded.gap);
  }

  // Stage 2 — score, group, order.
  let sections = scoreAndGroup(windowItems, involvement);
  if (input.service !== undefined) {
    sections = sections.filter((s) => s.serviceId === input.service);
  }

  return {
    kind: "catchup",
    agentVersion: 1,
    generatedAt: Date.now(),
    latencyMs: Math.round(performance.now() - start),
    gaps: [...preflightGaps, ...subAgentGaps],
    query: { sinceMs },
    selfPersonId: resolution.personId,
    involvement,
    sections,
  };
}

export async function emitCatchupBrief(
  input: CatchupInput,
  ctx: CatchupContext,
): Promise<{ sessionId: string }> {
  void (async () => {
    const brief = await runCatchup(input, ctx);
    const markdown = await synthesize(brief, ctx.llm === undefined ? {} : { llm: ctx.llm });
    ctx.notify("catchup.briefReady", {
      sessionId: ctx.sessionId,
      brief: markdown,
      findings: brief,
    });
  })().catch((err: unknown) => {
    ctx.notify("catchup.briefError", {
      sessionId: ctx.sessionId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
  return { sessionId: ctx.sessionId };
}

function safeOsUsername(): string {
  try {
    return userInfo().username;
  } catch {
    return "";
  }
}

// ============================================================================
// Stage 2 — scoring + grouping.
// ============================================================================

const SCORE_OWNED_SERVICE = 1.0;
const SCORE_ACTIVE_REPO = 0.7;
const SCORE_INCIDENT_SERVICE = 0.7;
const SCORE_COLLABORATOR = 0.5;
const SCORE_DEFAULT = 0.1;

function scoreItem(
  item: WindowItem,
  involvement: Involvement,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let raw = 0;
  if (involvement.ownedServices.includes(item.service)) {
    raw += SCORE_OWNED_SERVICE;
    reasons.push(`owned_service:${item.service}`);
  }
  if (item.repoLabel !== null && involvement.activeRepos.includes(item.repoLabel)) {
    raw += SCORE_ACTIVE_REPO;
    reasons.push(`active_repo:${item.repoLabel}`);
  }
  if (involvement.incidentServices.includes(item.service)) {
    raw += SCORE_INCIDENT_SERVICE;
    reasons.push(`incident_service:${item.service}`);
  }
  if (
    item.authorPersonId !== null &&
    involvement.collaboratorPersonIds.includes(item.authorPersonId)
  ) {
    raw += SCORE_COLLABORATOR;
    reasons.push(`collaborator:${item.authorPersonId}`);
  }
  if (raw === 0) {
    raw = SCORE_DEFAULT;
    reasons.push("default");
  }
  // Normalise the bag of additive boosts into a 0..1 value. The maximum
  // possible raw is OWNED + REPO + INCIDENT + COLLAB ≈ 2.9; clamp at 1.
  const score = Math.min(raw, 1);
  return { score, reasons };
}

export function scoreAndGroup(
  items: WindowItem[],
  involvement: Involvement,
): CatchupSection[] {
  if (items.length === 0) return [];
  // Group by service, scoring each item once. Track section aggregate score
  // (sum of item scores) for cross-section ordering.
  const buckets = new Map<string, { items: CatchupItem[]; aggregate: number; total: number }>();
  for (const item of items) {
    const { score, reasons } = scoreItem(item, involvement);
    const ci: CatchupItem = {
      itemId: item.id,
      title: item.title,
      modifiedAt: item.modifiedAt,
      relevanceScore: score,
      relevanceReasons: reasons,
    };
    const slot = buckets.get(item.service);
    if (slot === undefined) {
      buckets.set(item.service, { items: [ci], aggregate: score, total: 1 });
    } else {
      slot.items.push(ci);
      slot.aggregate += score;
      slot.total += 1;
    }
  }
  // Order items within each section by score desc; tie-break on modifiedAt desc
  // to keep the most recent on top of equal-score clusters.
  const ordered = [...buckets.entries()].map(([serviceId, slot]) => ({
    serviceId,
    aggregate: slot.aggregate,
    section: {
      serviceId,
      totalItemsInWindow: slot.total,
      items: slot.items.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
        return b.modifiedAt - a.modifiedAt;
      }),
    } satisfies CatchupSection,
  }));
  ordered.sort((a, b) => b.aggregate - a.aggregate);
  return ordered.map((o) => o.section);
}

// ============================================================================
// Stage 1 — five sub-agents. Each is read-only SQL against the local index.
// All SQL uses the real schema (item, sync_state, person).
// ============================================================================

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

async function subOwnedServices(
  db: Database,
  selfPersonId: string | null,
  _sinceMs: number,
): Promise<SubAgentResult> {
  if (selfPersonId === null) return { ownedServices: [] };
  const ninetyDaysAgo = Date.now() - NINETY_DAYS_MS;
  // "Owned" approximated as: services where this person has the highest
  // authorship density in the last 90 days. We pick services where they
  // authored ≥ 5 items (a coarse threshold that defends against noise).
  const rows = db
    .query(
      `SELECT service, COUNT(*) AS n
         FROM item
         WHERE author_id = ? AND modified_at >= ?
         GROUP BY service
         HAVING n >= 5
         ORDER BY n DESC`,
    )
    .all(selfPersonId, ninetyDaysAgo) as Array<{ service: string; n: number }>;
  return { ownedServices: rows.map((r) => r.service) };
}

async function subActiveRepos(
  db: Database,
  selfPersonId: string | null,
  _sinceMs: number,
): Promise<SubAgentResult> {
  if (selfPersonId === null) return { activeRepos: [] };
  const ninetyDaysAgo = Date.now() - NINETY_DAYS_MS;
  // Repos where the user authored a PR in the last 90 days. Repo label is the
  // graph_entity row of type 'repo' linked through item.external_id stem.
  // We approximate via item.external_id LIKE matching of the form "owner/repo#NNN".
  const rows = db
    .query(
      `SELECT DISTINCT
         substr(external_id, 1, instr(external_id, '#') - 1) AS repo_label
         FROM item
         WHERE author_id = ?
           AND modified_at >= ?
           AND type = 'pr'
           AND instr(external_id, '#') > 0`,
    )
    .all(selfPersonId, ninetyDaysAgo) as Array<{ repo_label: string }>;
  return { activeRepos: rows.map((r) => r.repo_label).filter((s) => s.length > 0) };
}

async function subRespondedIncidents(
  db: Database,
  selfPersonId: string | null,
  _sinceMs: number,
): Promise<SubAgentResult> {
  if (selfPersonId === null) return { incidentServices: [] };
  const ninetyDaysAgo = Date.now() - NINETY_DAYS_MS;
  // Services where the user has a `resolves` graph edge into an incident
  // entity in the last 90 days. The edge may not exist yet (graph populator
  // follow-up); if it doesn't, this returns the empty set silently — the
  // population gap is not a per-call gap note (it would fire on every
  // `catchup`, polluting output).
  const rows = db
    .query(
      `SELECT DISTINCT i.service AS service
         FROM graph_relation r
         JOIN graph_entity   pe ON pe.id = r.from_id AND pe.type = 'person' AND pe.external_id = ?
         JOIN graph_entity   ie ON ie.id = r.to_id   AND ie.type = 'incident'
         JOIN item           i  ON i.id = ie.external_id
         WHERE r.type = 'resolves' AND i.modified_at >= ?`,
    )
    .all(selfPersonId, ninetyDaysAgo) as Array<{ service: string }>;
  return { incidentServices: rows.map((r) => r.service) };
}

async function subCollaborators(
  db: Database,
  selfPersonId: string | null,
  _sinceMs: number,
): Promise<SubAgentResult> {
  if (selfPersonId === null) return { collaboratorPersonIds: [] };
  const ninetyDaysAgo = Date.now() - NINETY_DAYS_MS;
  // Collaborators are other people whose authored items the user has touched
  // (via review or shared thread) in the last 90 days. Today's index lacks a
  // direct review_relation, so we approximate via "authors of items in repos
  // the user is also active in" — same-repo coauthors. ≥ 3 shared items is
  // the threshold; below that the relationship is too tenuous to surface.
  const rows = db
    .query(
      `SELECT author_id AS person_id, COUNT(*) AS n
         FROM item
         WHERE author_id IS NOT NULL
           AND author_id != ?
           AND modified_at >= ?
           AND instr(external_id, '#') > 0
           AND substr(external_id, 1, instr(external_id, '#') - 1) IN (
             SELECT DISTINCT substr(external_id, 1, instr(external_id, '#') - 1)
               FROM item
               WHERE author_id = ? AND modified_at >= ? AND instr(external_id, '#') > 0
           )
         GROUP BY author_id
         HAVING n >= 3`,
    )
    .all(selfPersonId, ninetyDaysAgo, selfPersonId, ninetyDaysAgo) as Array<{
    person_id: string;
    n: number;
  }>;
  return { collaboratorPersonIds: rows.map((r) => r.person_id) };
}

async function subWindowItems(
  db: Database,
  _selfPersonId: string | null,
  sinceMs: number,
): Promise<SubAgentResult> {
  const sinceCutoff = Date.now() - sinceMs;
  // All items modified in the window, capped per-service for latency.
  // Window query is the dominant cost; we use an indexed range on modified_at.
  const rows = db
    .query(
      `SELECT id, service, title, modified_at,
              CASE WHEN instr(external_id, '#') > 0
                   THEN substr(external_id, 1, instr(external_id, '#') - 1)
                   ELSE NULL END AS repo_label,
              author_id
         FROM item
         WHERE modified_at >= ?
         ORDER BY service ASC, modified_at DESC`,
    )
    .all(sinceCutoff) as Array<{
    id: string;
    service: string;
    title: string;
    modified_at: number;
    repo_label: string | null;
    author_id: string | null;
  }>;
  // Apply per-service quota in JS (cheap) so we keep fan-out latency bounded
  // even on a large index. SQLite doesn't have window-function-friendly
  // syntax in the indexed-build path we rely on, so a single ORDER BY +
  // sequential walk is cleaner than per-service subqueries.
  const perService = new Map<string, number>();
  const out: WindowItem[] = [];
  for (const r of rows) {
    const used = perService.get(r.service) ?? 0;
    if (used >= PER_SERVICE_QUOTA) continue;
    perService.set(r.service, used + 1);
    out.push({
      id: r.id,
      service: r.service,
      title: r.title,
      modifiedAt: r.modified_at,
      repoLabel: r.repo_label,
      authorPersonId: r.author_id,
    });
  }
  return { windowItems: out };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/gateway/src/agents/catchup.test.ts`
Expected: PASS — all `scoreAndGroup` and `runCatchup` tests green.

- [ ] **Step 5: Confirm typecheck clean and HITL-free**

Run: `bun run typecheck`
Expected: PASS (no `any`, no missing exports).

Run: `grep -E "ToolExecutor|HITL_REQUIRED" packages/gateway/src/agents/catchup.ts`
Expected: no matches. The agent must not import either symbol — that is the structural HITL-free contract enforced by the e2e test in Task 11.

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/agents/catchup.ts packages/gateway/src/agents/catchup.test.ts
git commit -m "feat(agents): add catchup agent with five parallel sub-agents"
```

---

## Task 7: Wire `agents.catchup` into the IPC dispatcher

The dispatcher (`packages/gateway/src/ipc/server/dispatchers.ts:84-108`) already routes any `agents.*` method to `dispatchAgentsRpc`. We need to add a third branch + a param validator + widen the `newSessionId` kind union, **and** plumb `configDir` through so the catchup branch can load `[user] me_person_id` from the active profile's `nimbus.toml`.

**Files:**
- Modify: `packages/gateway/src/ipc/agents-rpc.ts`
- Modify: `packages/gateway/src/ipc/agents-rpc.test.ts`
- Modify: `packages/gateway/src/ipc/server/dispatchers.ts:84-108` — pass `configDir`

- [ ] **Step 1: Write the failing IPC tests**

Append to `packages/gateway/src/ipc/agents-rpc.test.ts` (after the existing `agents.impact` describe block):

```typescript
describe("dispatchAgentsRpc — agents.catchup", () => {
  test("agents.catchup returns a sessionId synchronously", async () => {
    const out = await dispatchAgentsRpc("agents.catchup", {}, makeCtx(freshDb()));
    expect(out.kind).toBe("hit");
    if (out.kind === "hit") {
      const v = out.value as { sessionId: string };
      expect(typeof v.sessionId).toBe("string");
      expect(v.sessionId.length).toBeGreaterThan(0);
    }
  });

  test("agents.catchup accepts an empty object (defaults to sinceMs = 3 days)", async () => {
    const out = await dispatchAgentsRpc("agents.catchup", {}, makeCtx(freshDb()));
    expect(out.kind).toBe("hit");
  });

  test("agents.catchup rejects array payloads with a clear message", async () => {
    await expect(
      dispatchAgentsRpc("agents.catchup", ["not", "an", "object"], makeCtx(freshDb())),
    ).rejects.toMatchObject({
      rpcCode: -32602,
      message: expect.stringContaining("requires an object payload"),
    });
  });

  test("agents.catchup validates sinceMs is a non-negative integer ≤ 90 days", async () => {
    await expect(
      dispatchAgentsRpc("agents.catchup", { sinceMs: -1 }, makeCtx(freshDb())),
    ).rejects.toBeInstanceOf(AgentsRpcError);
    await expect(
      dispatchAgentsRpc(
        "agents.catchup",
        { sinceMs: 91 * 24 * 60 * 60 * 1000 },
        makeCtx(freshDb()),
      ),
    ).rejects.toBeInstanceOf(AgentsRpcError);
    await expect(
      dispatchAgentsRpc("agents.catchup", { sinceMs: 1.5 }, makeCtx(freshDb())),
    ).rejects.toBeInstanceOf(AgentsRpcError);
  });

  test("agents.catchup validates service if provided is a non-empty string ≤ 64 chars", async () => {
    await expect(
      dispatchAgentsRpc("agents.catchup", { service: "" }, makeCtx(freshDb())),
    ).rejects.toBeInstanceOf(AgentsRpcError);
    await expect(
      dispatchAgentsRpc(
        "agents.catchup",
        { service: "x".repeat(65) },
        makeCtx(freshDb()),
      ),
    ).rejects.toBeInstanceOf(AgentsRpcError);
  });

  test("agents.catchup eventually emits catchup.briefReady", async () => {
    const ctx = makeCtx(freshDb());
    await dispatchAgentsRpc("agents.catchup", {}, ctx);
    await new Promise((r) => setTimeout(r, 50));
    const calls = (ctx.notify as ReturnType<typeof mock>).mock.calls;
    const briefReady = calls.find((c) => c[0] === "catchup.briefReady");
    expect(briefReady).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/gateway/src/ipc/agents-rpc.test.ts`
Expected: FAIL — `dispatchAgentsRpc` returns `{ kind: "miss" }` for `agents.catchup` (no handler yet).

- [ ] **Step 3: Add the validator + dispatcher branch**

Edit `packages/gateway/src/ipc/agents-rpc.ts`. Several changes:

(a) Add imports at the top of the file:

Replace line 4:
```typescript
import { emitImpactBrief } from "../agents/impact.ts";
```
with:
```typescript
import { emitCatchupBrief } from "../agents/catchup.ts";
import { emitImpactBrief } from "../agents/impact.ts";
import { loadNimbusUserFromConfigDir } from "../config/nimbus-toml.ts";
```

(b) Add new constants after line 29:
```typescript
const MAX_SINCE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
```

(c) Widen `AgentsRpcContext` (line 15-19) to include the optional `configDir`:

Replace:
```typescript
export type AgentsRpcContext = {
  db: Database;
  llm?: SynthesizerLlm;
  notify: (method: string, params: unknown) => void;
};
```
with:
```typescript
export type AgentsRpcContext = {
  db: Database;
  llm?: SynthesizerLlm;
  notify: (method: string, params: unknown) => void;
  /** Active profile config dir; consulted by `agents.catchup` for `[user] me_person_id`. */
  configDir?: string;
};
```

(d) Add the validator after `requireImpactParams` (after line 109):

```typescript
function requireCatchupParams(params: unknown): {
  sinceMs?: number;
  service?: string;
} {
  if (params === null || typeof params !== "object" || Array.isArray(params)) {
    throw new AgentsRpcError(-32602, "agents.catchup requires an object payload");
  }
  const p = params as { sinceMs?: unknown; service?: unknown };
  const out: { sinceMs?: number; service?: string } = {};
  if (p.sinceMs !== undefined) {
    if (
      typeof p.sinceMs !== "number" ||
      !Number.isInteger(p.sinceMs) ||
      p.sinceMs < 0 ||
      p.sinceMs > MAX_SINCE_MS
    ) {
      throw new AgentsRpcError(
        -32602,
        `sinceMs must be a non-negative integer up to ${MAX_SINCE_MS} ms (90 days)`,
      );
    }
    out.sinceMs = p.sinceMs;
  }
  if (p.service !== undefined) {
    if (
      typeof p.service !== "string" ||
      p.service.trim().length === 0 ||
      p.service.length > MAX_SERVICE_LEN
    ) {
      throw new AgentsRpcError(
        -32602,
        `service must be a non-empty string up to ${MAX_SERVICE_LEN} chars`,
      );
    }
    out.service = p.service.trim();
  }
  return out;
}
```

(e) Widen `newSessionId`'s `kind` parameter to include `"catchup"` (line 111):

Replace:
```typescript
function newSessionId(kind: "expert" | "impact"): string {
```
with:
```typescript
function newSessionId(kind: "expert" | "impact" | "catchup"): string {
```

(f) Add the dispatcher branch after the `agents.impact` block (before the closing `return { kind: "miss" }`). Note that we merge the validated params with the configDir-derived `mePersonIdOverride` *only when present* — keeping the field absent (rather than `undefined`) so the resolver's `override !== undefined && override.length > 0` guard is honoured exactly as written:

```typescript
  if (method === "agents.catchup") {
    const input = requireCatchupParams(params);
    const sessionId = newSessionId("catchup");
    const userToml =
      ctx.configDir === undefined ? {} : loadNimbusUserFromConfigDir(ctx.configDir);
    const catchupInput =
      userToml.mePersonId === undefined
        ? input
        : { ...input, mePersonIdOverride: userToml.mePersonId };
    const catchupCtx =
      ctx.llm === undefined
        ? { db: ctx.db, notify: ctx.notify, sessionId }
        : { db: ctx.db, llm: ctx.llm, notify: ctx.notify, sessionId };
    return { kind: "hit", value: await emitCatchupBrief(catchupInput, catchupCtx) };
  }
```

- [ ] **Step 4: Plumb `configDir` through `tryDispatchAgentsRpc`**

Edit `packages/gateway/src/ipc/server/dispatchers.ts:84-108`. In the `dispatchAgentsRpc(...)` call inside `tryDispatchAgentsRpc`, add the `configDir` field to the context object. The full updated call site:

```typescript
    const out = await dispatchAgentsRpc(method, params, {
      db: ctx.options.localIndex.getDatabase(),
      // No `llm` plumbing in PR 1 — synthesize() falls back to the deterministic
      // renderer. PR-N will pass ctx.options.llmRouter once a routing API for
      // built-in agents lands.
      notify: (m, p) => ctx.broadcastNotification(m, p as Record<string, unknown>),
      // PR 3 — agents.catchup loads `[user] me_person_id` from the active
      // profile's nimbus.toml. Other branches ignore configDir.
      ...(ctx.options.configDir === undefined ? {} : { configDir: ctx.options.configDir }),
    });
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test packages/gateway/src/ipc/agents-rpc.test.ts`
Expected: PASS — `agents.expert`, `agents.impact`, `agents.catchup` all green.

Also run the dispatcher's typecheck to confirm the configDir wiring compiles:
Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/ipc/agents-rpc.ts packages/gateway/src/ipc/agents-rpc.test.ts packages/gateway/src/ipc/server/dispatchers.ts
git commit -m "feat(ipc): wire agents.catchup JSON-RPC handler with configDir plumbing"
```

---

## Task 8: Mirror `CatchupBrief` types in the CLI

The CLI maintains its own slim copy of the agent types so it does not import from the gateway package. Mirror the new `CatchupBrief` shape + add a runtime shape check.

**Files:**
- Modify: `packages/cli/src/types/agents.ts`

- [ ] **Step 1: Add the types and the runtime check**

Append to `packages/cli/src/types/agents.ts`:

```typescript
export type CatchupItem = {
  itemId: string;
  title: string;
  modifiedAt: number;
  relevanceScore: number;
  relevanceReasons: string[];
};

export type CatchupSection = {
  serviceId: string;
  totalItemsInWindow: number;
  items: CatchupItem[];
};

export type CatchupBrief = {
  kind: "catchup";
  agentVersion: 1;
  generatedAt: number;
  latencyMs: number;
  gaps: GapNote[];
  query: { sinceMs: number };
  selfPersonId: string | null;
  involvement: {
    ownedServices: string[];
    activeRepos: string[];
    incidentServices: string[];
    collaboratorPersonIds: string[];
  };
  sections: CatchupSection[];
};

export function isCatchupBrief(x: unknown): x is CatchupBrief {
  if (x === null || typeof x !== "object") return false;
  const b = x as Record<string, unknown>;
  return (
    b["kind"] === "catchup" &&
    b["agentVersion"] === 1 &&
    Array.isArray(b["gaps"]) &&
    Array.isArray(b["sections"]) &&
    typeof b["generatedAt"] === "number" &&
    typeof b["latencyMs"] === "number"
  );
}
```

- [ ] **Step 2: Verify typecheck is clean**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/types/agents.ts
git commit -m "feat(cli): mirror CatchupBrief types for the CLI surface"
```

---

## Task 9: Implement `cli/commands/catchup.ts`

The CLI command. Mirrors `impact.ts` shape: parse args (with the new `--since` parser), connect to gateway, register notification handler, call IPC, render JSON or Markdown, exit cleanly.

**Files:**
- Create: `packages/cli/src/commands/catchup.ts`
- Create: `packages/cli/src/commands/catchup.test.ts`

- [ ] **Step 1: Write the failing tests for `parseCatchupArgs`**

Create `packages/cli/src/commands/catchup.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { parseCatchupArgs } from "./catchup.ts";

describe("parseCatchupArgs", () => {
  test("defaults to sinceMs = 3 days when no flag given", () => {
    const a = parseCatchupArgs([]);
    expect(a.sinceMs).toBe(3 * 24 * 60 * 60 * 1000);
    expect(a.json).toBe(false);
    expect(a.service).toBeUndefined();
  });

  test("parses --since with weeks suffix", () => {
    const a = parseCatchupArgs(["--since", "2w"]);
    expect(a.sinceMs).toBe(2 * 7 * 24 * 60 * 60 * 1000);
  });

  test("parses --since with days suffix", () => {
    const a = parseCatchupArgs(["--since", "7d"]);
    expect(a.sinceMs).toBe(7 * 24 * 60 * 60 * 1000);
  });

  test("rejects --since with invalid syntax", () => {
    expect(() => parseCatchupArgs(["--since", "blah"])).toThrow();
    expect(() => parseCatchupArgs(["--since"])).toThrow();
  });

  test("recognises --json flag", () => {
    const a = parseCatchupArgs(["--json"]);
    expect(a.json).toBe(true);
  });

  test("parses --service", () => {
    const a = parseCatchupArgs(["--service", "github"]);
    expect(a.service).toBe("github");
  });

  test("rejects unknown positional arguments to avoid silent typos", () => {
    expect(() => parseCatchupArgs(["something"])).toThrow();
  });

  test("clamps sinceMs at 90 days", () => {
    expect(() => parseCatchupArgs(["--since", "365d"])).toThrow(/90 days/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/cli/src/commands/catchup.test.ts`
Expected: FAIL — `parseCatchupArgs` does not exist.

- [ ] **Step 3: Implement `cli/commands/catchup.ts`**

Create `packages/cli/src/commands/catchup.ts`:

```typescript
import { IPCClient } from "../ipc-client/index.ts";
import { readGatewayState } from "../lib/gateway-process.ts";
import { registerInteractiveCliIpcHandlers } from "../lib/interactive-ipc-handlers.ts";
import { parseSinceDurationToMs } from "../lib/parse-since.ts";
import { getCliPlatformPaths } from "../paths.ts";
import { type CatchupBrief, isCatchupBrief } from "../types/agents.ts";

const DEFAULT_SINCE_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_SINCE_MS = 90 * 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 30_000;

export type CatchupCliArgs = {
  sinceMs: number;
  json: boolean;
  service?: string;
};

export function parseCatchupArgs(args: string[]): CatchupCliArgs {
  let sinceMs = DEFAULT_SINCE_MS;
  let json = false;
  let service: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--json") {
      json = true;
      continue;
    }
    if (a === "--since") {
      const v = args[i + 1];
      if (typeof v !== "string") throw new Error("--since requires a value (e.g. 3d, 12h, 1w)");
      sinceMs = parseSinceDurationToMs(v);
      if (sinceMs > MAX_SINCE_MS) {
        throw new Error("--since must be at most 90 days (e.g. 90d, 12w)");
      }
      i += 1;
      continue;
    }
    if (a === "--service") {
      const v = args[i + 1];
      if (typeof v !== "string" || v.trim().length === 0) {
        throw new Error("--service requires a non-empty value");
      }
      service = v.trim();
      i += 1;
      continue;
    }
    if (a !== undefined && !a.startsWith("--")) {
      throw new Error(
        `Unknown positional argument: ${a}. Usage: nimbus catchup [--since 3d] [--json] [--service <id>]`,
      );
    }
  }
  const out: CatchupCliArgs = { sinceMs, json };
  if (service !== undefined) out.service = service;
  return out;
}

export async function runCatchupCli(args: string[]): Promise<void> {
  const parsed = parseCatchupArgs(args);

  const paths = getCliPlatformPaths();
  const state = await readGatewayState(paths);
  if (state === undefined) {
    process.stderr.write("Gateway is not running. Start with: nimbus start\n");
    process.exit(1);
  }

  const client = new IPCClient(state.socketPath);
  await client.connect();
  registerInteractiveCliIpcHandlers(client);

  let timeout: ReturnType<typeof setTimeout> | undefined;

  const briefPromise = new Promise<{ brief: string; findings: CatchupBrief }>((resolve, reject) => {
    timeout = setTimeout(() => reject(new Error("Agent timed out after 30 s")), TIMEOUT_MS);
    client.onNotification("catchup.briefReady", (params: unknown) => {
      const p = params as { sessionId?: string; brief?: string; findings?: unknown };
      if (typeof p.brief !== "string" || !isCatchupBrief(p.findings)) {
        reject(new Error("Malformed catchup.briefReady payload"));
        return;
      }
      resolve({ brief: p.brief, findings: p.findings });
    });
    client.onNotification("catchup.briefError", (params: unknown) => {
      const p = params as { error?: string };
      reject(new Error(p.error ?? "Agent failed"));
    });
  });

  const callParams: { sinceMs: number; service?: string } = { sinceMs: parsed.sinceMs };
  if (parsed.service !== undefined) callParams.service = parsed.service;

  try {
    await client.call<{ sessionId: string }>("agents.catchup", callParams);
    const { brief, findings } = await briefPromise;
    if (parsed.json) {
      process.stdout.write(`${JSON.stringify(findings, null, 2)}\n`);
      return;
    }
    if (findings.gaps.some((g) => g.category === "empty_index")) {
      process.stderr.write("No data indexed yet — run `nimbus connector sync <service>` first.\n");
      process.exit(1);
    }
    process.stdout.write(`${brief}\n`);
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(2);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
    await client.disconnect();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/cli/src/commands/catchup.test.ts`
Expected: PASS — 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/catchup.ts packages/cli/src/commands/catchup.test.ts
git commit -m "feat(cli): add nimbus catchup command"
```

---

## Task 10: Register `catchup` in the CLI dispatcher + help text

**Files:**
- Modify: `packages/cli/src/commands/index.ts`
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/src/commands/help.ts`

- [ ] **Step 1: Export `runCatchupCli` from the commands barrel**

In `packages/cli/src/commands/index.ts`, insert (in alphabetical position — before `export { runConfig } from "./config.ts";`):

```typescript
export { runCatchupCli } from "./catchup.ts";
```

- [ ] **Step 2: Register the handler in the CLI entry**

In `packages/cli/src/index.ts`:

(a) In the import list (lines 9-43), insert `runCatchupCli` alphabetically (before `runConfig`):

```typescript
  runCatchupCli,
  runConfig,
```

(b) In the `COMMAND_HANDLERS` map (lines 62-94), add the `catchup` entry near `expert` and `impact`:

Replace:
```typescript
  expert: runExpertCli,
  impact: runImpactCli,
```
with:
```typescript
  catchup: runCatchupCli,
  expert: runExpertCli,
  impact: runImpactCli,
```

- [ ] **Step 3: Add the help-text line**

In `packages/cli/src/commands/help.ts`, insert beneath the existing `nimbus impact` line (after line 22):

```typescript
  nimbus catchup [--since 3d] [--json] [--service <id>]   Personalised retrospective digest weighted by your involvement
```

- [ ] **Step 4: Verify the CLI surface compiles and the help text renders**

Run: `bun run typecheck`
Expected: PASS.

Run: `bun run --silent packages/cli/src/index.ts help`
Expected: stdout includes `nimbus catchup` line.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/index.ts packages/cli/src/index.ts packages/cli/src/commands/help.ts
git commit -m "feat(cli): register catchup subcommand and help line"
```

---

## Task 11: E2E test for the agent (acceptance-criteria scenario)

The headline test from the roadmap: seed two services with different activity levels for the self-person and assert the higher-activity service ranks first. Also asserts HITL-free, latency budget < 15 s, and brief shape.

**Files:**
- Create: `packages/gateway/test/e2e/scenarios/catchup.e2e.test.ts`

- [ ] **Step 1: Write the failing e2e test**

Create `packages/gateway/test/e2e/scenarios/catchup.e2e.test.ts`:

```typescript
/**
 * Phase 5 T3 PR 3 — `nimbus catchup` end-to-end (in-process).
 *
 * Seeds two services with different authorship density for a single
 * self-person. The roadmap acceptance criterion is: the brief's first
 * section must be the higher-activity service. Also asserts the brief
 * shape, latency budget (<15 s), and the structural HITL-free contract.
 */

import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { isCatchupBrief } from "../../../src/agents/_lib/findings.ts";
import { runCatchup } from "../../../src/agents/catchup.ts";
import { LocalIndex } from "../../../src/index/local-index.ts";
import { insertPerson } from "../../../src/people/person-store.ts";

function seedTwoServices(db: Database): void {
  const now = Date.now();
  insertPerson(db, {
    id: "p-self",
    displayName: "Self",
    canonicalEmail: "self@example.com",
    githubLogin: "self",
    gitlabLogin: null,
    slackHandle: null,
    linearMemberId: null,
    jiraAccountId: null,
    notionUserId: null,
    bitbucketUuid: null,
    linked: false,
    metadata: {},
  });
  // GitHub: 8 PRs authored in the last 90 days → service is "owned".
  // Window: each PR was modified within the last 3 days.
  const stmt = db.prepare(
    "INSERT INTO item (id, service, type, external_id, title, body_preview, modified_at, synced_at, pinned, author_id) " +
      "VALUES (?, ?, ?, ?, ?, '', ?, ?, 0, ?)",
  );
  for (let i = 0; i < 8; i++) {
    stmt.run(
      `gh:${i}`,
      "github",
      "pr",
      `acme/payment#${100 + i}`,
      `gh PR ${i}`,
      now - i * 60_000,
      now,
      "p-self",
    );
  }
  // Linear: 1 issue authored in the last 90 days → service is NOT "owned"
  // (threshold is ≥5). Window has 1 item.
  stmt.run(
    "lin:1",
    "linear",
    "issue",
    "lin-1",
    "linear issue 1",
    now - 1_000,
    now,
    "p-self",
  );
}

describe("nimbus catchup (e2e, in-process)", () => {
  test("first section is the higher-activity service; latency < 15 s; HITL-free", async () => {
    const db = new Database(":memory:");
    LocalIndex.ensureSchema(db);
    seedTwoServices(db);

    const start = performance.now();
    const brief = await runCatchup(
      {
        sinceMs: 3 * 24 * 60 * 60 * 1000,
        mePersonIdOverride: "p-self",
      },
      { db, sessionId: "e2e-catchup-1", notify: () => {} },
    );
    const elapsedMs = performance.now() - start;

    expect(elapsedMs).toBeLessThan(15_000);
    expect(isCatchupBrief(brief)).toBe(true);
    expect(brief.selfPersonId).toBe("p-self");
    expect(brief.sections.length).toBeGreaterThan(0);
    // Acceptance criterion: github ranks first because it has 8 items vs linear's 1.
    expect(brief.sections[0]?.serviceId).toBe("github");
    // Owned-service signal lifted github items above the default-only floor.
    expect(brief.involvement.ownedServices).toContain("github");
    expect(brief.involvement.ownedServices).not.toContain("linear");
  });

  test("missing_user_identity gap fires when all three resolver tiers miss", async () => {
    const db = new Database(":memory:");
    LocalIndex.ensureSchema(db);
    db.run(
      "INSERT INTO item (id, service, type, external_id, title, body_preview, modified_at, synced_at, pinned) VALUES " +
        "('seed', 'github', 'pr', 'acme/x#1', 't', '', 0, 0, 0)",
    );
    const brief = await runCatchup(
      {
        sinceMs: 3 * 24 * 60 * 60 * 1000,
        runGitOverride: async () => null,
        osUsernameOverride: "",
      },
      { db, sessionId: "e2e-catchup-2", notify: () => {} },
    );
    expect(brief.selfPersonId).toBeNull();
    expect(brief.gaps.some((g) => g.category === "missing_user_identity")).toBe(true);
  });

  test("--service filter restricts sections", async () => {
    const db = new Database(":memory:");
    LocalIndex.ensureSchema(db);
    seedTwoServices(db);
    const brief = await runCatchup(
      {
        sinceMs: 3 * 24 * 60 * 60 * 1000,
        service: "linear",
        mePersonIdOverride: "p-self",
      },
      { db, sessionId: "e2e-catchup-3", notify: () => {} },
    );
    expect(brief.sections.every((s) => s.serviceId === "linear")).toBe(true);
  });

  test("structural HITL-free: catchup.ts must not import ToolExecutor or HITL_REQUIRED", () => {
    const source = require("node:fs").readFileSync(
      require("node:path").resolve(__dirname, "../../../src/agents/catchup.ts"),
      "utf8",
    ) as string;
    expect(source).not.toContain("ToolExecutor");
    expect(source).not.toContain("HITL_REQUIRED");
  });
});
```

- [ ] **Step 2: Run the e2e test**

Run: `bun test packages/gateway/test/e2e/scenarios/catchup.e2e.test.ts`
Expected: PASS — 4 tests green, including the headline first-section ordering.

- [ ] **Step 3: Commit**

```bash
git add packages/gateway/test/e2e/scenarios/catchup.e2e.test.ts
git commit -m "test(agents): add e2e coverage for nimbus catchup"
```

---

## Task 12: CLI smoke e2e (no-Gateway path)

Mirror `impact.smoke.e2e.test.ts` so the CLI's help-text + missing-positional + no-Gateway exit paths are pinned.

**Files:**
- Create: `packages/cli/test/e2e/catchup.smoke.e2e.test.ts`

- [ ] **Step 1: Write the smoke test**

Create `packages/cli/test/e2e/catchup.smoke.e2e.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Lightweight smoke for `nimbus catchup`: spawn the CLI without a running
 * Gateway and verify the "Gateway is not running" exit path + help integration
 * + unknown-positional rejection.
 *
 * Mirrors impact.smoke.e2e.test.ts. Full Gateway+CLI round-trip e2e is
 * deferred to a follow-up alongside the same harness work that expert
 * deferred (per F-7 in the T3 design doc).
 */
describe("nimbus catchup e2e (no-Gateway smoke)", () => {
  const cliEntry = fileURLToPath(new URL("../../src/index.ts", import.meta.url));

  function emptyEnvOverrides(): Record<string, string> {
    const root = mkdtempSync(join(tmpdir(), "nimbus-no-gateway-catchup-"));
    return {
      LOCALAPPDATA: root,
      APPDATA: root,
      XDG_DATA_HOME: root,
      XDG_CONFIG_HOME: root,
      XDG_RUNTIME_DIR: root,
      HOME: root,
    };
  }

  test("catchup exits non-zero with 'Gateway is not running' on stderr", async () => {
    const proc = Bun.spawn({
      cmd: [process.execPath, "run", cliEntry, "catchup"],
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, ...emptyEnvOverrides() },
    });
    const code = await proc.exited;
    const stderr = await new Response(proc.stderr).text();
    expect(code).not.toBe(0);
    expect(stderr).toContain("Gateway is not running");
  });

  test("help text mentions 'catchup' subcommand", async () => {
    const proc = Bun.spawn({
      cmd: [process.execPath, "run", cliEntry, "help"],
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const code = await proc.exited;
    expect(code).toBe(0);
    expect(stdout.toLowerCase()).toContain("catchup");
  });

  test("catchup with an unknown positional argument fails with usage hint", async () => {
    const proc = Bun.spawn({
      cmd: [process.execPath, "run", cliEntry, "catchup", "garbage-positional"],
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, ...emptyEnvOverrides() },
    });
    const code = await proc.exited;
    const stderr = await new Response(proc.stderr).text();
    expect(code).not.toBe(0);
    expect(stderr.toLowerCase()).toContain("usage: nimbus catchup");
  });
});
```

- [ ] **Step 2: Run the smoke test**

Run: `bun test packages/cli/test/e2e/catchup.smoke.e2e.test.ts`
Expected: PASS — 3 tests green.

- [ ] **Step 3: Commit**

```bash
git add packages/cli/test/e2e/catchup.smoke.e2e.test.ts
git commit -m "test(cli): add no-gateway smoke for nimbus catchup"
```

---

## Task 13: Tauri allowlist — insert `agents.catchup` (count 59 → 60)

**Files:**
- Modify: `packages/ui/src-tauri/src/gateway_bridge.rs`

- [ ] **Step 1: Insert the new entry alphabetically**

In `packages/ui/src-tauri/src/gateway_bridge.rs`, replace the current line 64-65:

```rust
    "agents.expert",
    "agents.impact",
```
with:
```rust
    "agents.catchup",
    "agents.expert",
    "agents.impact",
```

(`agents.catchup` < `agents.expert` < `agents.impact` — alphabetically correct.)

- [ ] **Step 2: Bump the size assertion**

In the `allowlist_exact_size` test (line 441-449), update the count and append a comment line:

Replace:
```rust
        // Phase 5 T3 PR 1 adds agents.expert → 58 total.
        // Phase 5 T3 PR 2 adds agents.impact → 59 total.
        assert_eq!(ALLOWED_METHODS.len(), 59);
```
with:
```rust
        // Phase 5 T3 PR 1 adds agents.expert → 58 total.
        // Phase 5 T3 PR 2 adds agents.impact → 59 total.
        // Phase 5 T3 PR 3 adds agents.catchup → 60 total.
        assert_eq!(ALLOWED_METHODS.len(), 60);
```

- [ ] **Step 3: Run the four allowlist tests**

Run: `cargo test --manifest-path packages/ui/src-tauri/Cargo.toml allowlist`
Expected: PASS — `allowlist_exact_size`, `allowlist_is_alphabetized`, `allowlist_has_no_duplicates`, `allowlist_rejects_vault_and_raw_db_writes` all green.

If `cargo` is not available in the agent environment, run the full Rust test suite from the package folder via PowerShell:
Run: `cd packages/ui/src-tauri ; cargo test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src-tauri/src/gateway_bridge.rs
git commit -m "feat(ui): add agents.catchup to Tauri allowlist (count 59 -> 60)"
```

---

## Task 14: Update CLAUDE.md and the Tauri allowlist skill count

**Files:**
- Modify: `CLAUDE.md` line 10 (status mirror) + line 186 (`ALLOWED_METHODS (59)` → `(60)`)
- Modify: `.claude/commands/nimbus-tauri-allowlist.md` (lines 38 + 41)

- [ ] **Step 1: Update the Phase 5 status mirror in CLAUDE.md**

In `CLAUDE.md`, find the `**Status:**` line at the top of the file (around line 10) and replace `T3 PR 3 nimbus catchup next` with `T3 PR 3 nimbus catchup ✅`. The full status line should read (with the new tail):

```
... · T3 PR 1 coordinator parallelism + `nimbus expert` ✅ · T3 PR 2 `nimbus impact` ✅ · T3 PR 3 `nimbus catchup` ✅)
```

- [ ] **Step 2: Bump the ALLOWED_METHODS count in CLAUDE.md**

In `CLAUDE.md` line 186, find:

```
| `packages/ui/src-tauri/src/gateway_bridge.rs` | Rust IPC bridge — `ALLOWED_METHODS` (59), `NO_TIMEOUT_METHODS` (4), ...
```

Change `(59)` → `(60)`.

- [ ] **Step 3: Update the count refs in the Tauri allowlist skill**

In `.claude/commands/nimbus-tauri-allowlist.md`:

- Line 38 (`Currently 59 entries.`): change `59` → `60`.
- Line 41 (`checks `ALLOWED_METHODS.len() == 59`.`): change `59` → `60`.

- [ ] **Step 4: Verify**

Run: `grep -n "ALLOWED_METHODS" CLAUDE.md .claude/commands/nimbus-tauri-allowlist.md`
Expected: every numeric ref reads `60`.

Run: `grep -n "T3 PR 3" CLAUDE.md`
Expected: the status line shows `T3 PR 3 nimbus catchup ✅`.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md .claude/commands/nimbus-tauri-allowlist.md
git commit -m "docs: bump ALLOWED_METHODS count to 60 and mark T3 PR 3 done"
```

---

## Task 15: Roadmap row — flip the catchup checkbox + status mirror

**Files:**
- Modify: `docs/roadmap.md:556` and the Phase 5 Team Intelligence summary at line 552-558

- [ ] **Step 1: Flip the checkbox and append the shipped line**

In `docs/roadmap.md`, edit line 556 — replace `- [ ] **\`nimbus catchup --since <duration>\`** —` with `- [x] **\`nimbus catchup --since <duration>\`** —`.

Then append a status mirror entry **after** line 557 (the impact line), as a new bullet:

```markdown
- [x] **T3 PR 3 — `nimbus catchup`** (YYYY-MM-DD) — five-sub-agent personalised digest, weighted by self-person involvement; ships `agents.catchup` IPC method and `nimbus catchup` CLI command. T3 epic complete.
```

Replace `YYYY-MM-DD` with today's date in ISO format (US-locale for Windows: use the system's `Get-Date -Format yyyy-MM-dd`).

- [ ] **Step 2: Verify**

Run: `grep -n "nimbus catchup" docs/roadmap.md`
Expected: line 556 starts with `- [x]`; the status mirror line shows `T3 PR 3` and the date.

- [ ] **Step 3: Commit**

```bash
git add docs/roadmap.md
git commit -m "docs(roadmap): mark T3 PR 3 nimbus catchup as shipped"
```

---

## Task 16: Final pre-PR validation

Before opening the PR, run every gate that the project enforces. Each must be clean.

- [ ] **Step 1: Lint + typecheck**

Run (in parallel where possible):
- `bun run typecheck`
- `bun run lint`

Expected: both PASS.

- [ ] **Step 2: Run the full project pre-PR suite**

Run: `bun run test:ci`
Expected: PASS — every test (unit + integration + e2e + coverage gates).

If `test:ci` is too slow on the dev machine, at minimum run the agent + IPC + config + CLI slices:
- `bun test packages/gateway/src/agents`
- `bun test packages/gateway/src/ipc/agents-rpc.test.ts`
- `bun test packages/gateway/src/config/nimbus-toml-user.test.ts`
- `bun test packages/gateway/test/e2e/scenarios/catchup.e2e.test.ts`
- `bun test packages/cli/src/commands/catchup.test.ts`
- `bun test packages/cli/test/e2e/catchup.smoke.e2e.test.ts`
- `bun test packages/cli/src/lib/parse-since.test.ts`

Expected: all PASS.

- [ ] **Step 3: Coverage gate for `agents/`**

Run: `bun run test:coverage:agents`
Expected: PASS — `packages/gateway/src/agents/` line coverage ≥ 80%.

- [ ] **Step 4: Static-time security audits**

Run: `bun run audit:invariants`
Expected: PASS (the binary D10/D11 gate — no spawn-under-`connectors/` regressions; vault-key allow-list intact).

Run: `bun scripts/structure-audit/count-any-usage.ts --check`
Expected: PASS (no new `any` usage introduced; baseline either flat or reduced).

- [ ] **Step 5: Cargo Tauri allowlist tests**

Run: `cargo test --manifest-path packages/ui/src-tauri/Cargo.toml`
Expected: PASS — `allowlist_exact_size` (60), `allowlist_is_alphabetized`, `allowlist_has_no_duplicates`, `allowlist_rejects_vault_and_raw_db_writes`, `no_timeout_methods_are_subset_of_allowlist`, `no_timeout_methods_exact_size` (4) all green.

- [ ] **Step 6: Manual smoke (optional but strongly recommended)**

If a Gateway is running locally with a populated index:

```powershell
nimbus catchup --since 7d
nimbus catchup --since 1w --json | ConvertFrom-Json
nimbus catchup --service github
```

Confirm:
- Markdown brief renders with `# Catchup` header and `## <service>` sections in descending relevance order.
- `--json` output round-trips through `ConvertFrom-Json` without error.
- `--service github` restricts sections to github only.
- `NO_COLOR=1 nimbus catchup --since 1d` produces colour-free output.

- [ ] **Step 7: Open the PR**

Use a HEREDOC body so the description preserves formatting. Reference the spec + this plan + the locked design decisions.

```bash
git push -u origin dev/asafgolombek/phase-5-t3-pr3-catchup
gh pr create --title "Phase 5 T3 PR 3 — nimbus catchup (closes T3 epic)" --body "$(cat <<'EOF'
## Summary

- Ship the third built-in agent: `nimbus catchup [--since <duration>] [--json] [--service <id>]`.
- Five parallel sub-agents through `AgentCoordinator` over the local index.
- Three-tier self-person resolver: `[user] me_person_id` → `git config user.email` → OS username.
- Adds `agents.catchup` IPC method; `agents.catchup` Tauri allowlist entry (count 59 → 60).
- Closes the T3 Team Intelligence epic — Phase 5 Core item 2 of 7 done.

## Spec & plan

- Design: [`docs/superpowers/specs/2026-05-07-phase-5-t3-team-intelligence-design.md`](docs/superpowers/specs/2026-05-07-phase-5-t3-team-intelligence-design.md) §"`nimbus catchup`" + §"PR 3"
- Plan: [`docs/superpowers/plans/2026-05-09-phase-5-t3-pr3-catchup.md`](docs/superpowers/plans/2026-05-09-phase-5-t3-pr3-catchup.md)
- Reviewer feedback addressed: §4 of the T3 review-feedback doc (self-person fallback chain).

## Test plan

- [x] `bun run test:ci` clean
- [x] `bun run test:coverage:agents` clean (≥80%)
- [x] `bun run audit:invariants` clean
- [x] `bun scripts/structure-audit/count-any-usage.ts --check` clean
- [x] `cargo test` in `packages/ui/src-tauri/` clean (allowlist count 60)
- [x] E2E acceptance test green: seeded two-service fixture; higher-activity service ranks first
- [x] Manual: `nimbus catchup --since 7d` and `--json` round-trip on a real index

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Note the PR URL when complete and report it back.

---

## Spec coverage self-review

Before this plan was finalised, every section of the locked T3 design that mentions PR 3 was mapped to a task:

| Spec section | Task |
|---|---|
| `nimbus catchup` sub-agent decomposition (six sub-agents in spec) | Task 6 — collapsed `s_self` to synchronous Stage 0; remaining five sub-agents implemented |
| `CatchupBrief` data shape | Already in `findings.ts` (PR 1); CLI mirror added in Task 8 |
| Gap-note coverage rule | Tasks 6 + 11 — `missing_user_identity` + `empty_index` coverage tested |
| IPC `agents.catchup` (params, sessionId, notification) | Task 7 |
| Tauri ALLOWED_METHODS (count 59 → 60) | Task 13 |
| CLI surface (`--since`, `--json`, `--service`) | Task 9 |
| `NO_COLOR` honoured | Task 9 — Markdown path is plain text; no ANSI emitted |
| Latency budget < 15 s on seeded fixture | Task 11 — explicit assertion |
| Coverage gate `agents/` ≥ 80% | Task 16 — `test:coverage:agents` |
| Roadmap row flip + status mirror | Task 15 |
| `_schema_migrations` ledger untouched | Confirmed — no DB migration in this PR |
| Self-person resolver | Task 3 — three-tier override / git / OS chain (delta over spec; see header) |
| `parseSinceDurationToMs` supports `w` | Task 1 |
| `[user] me_person_id` config section | Task 2 |
| `synthesize` widening | Task 5 |
| `renderCatchup` deterministic Markdown | Task 4 |

No placeholder steps remain. Every code block above is complete and self-contained.
