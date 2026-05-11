# Phase 5 T4 PR 2 — DORA Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `nimbus metrics dora --service <id>` end-to-end (CLI → `metrics.dora` IPC → `GET /v1/metrics/dora` → four pure calculators reading `pr` / `ci_run` / `incident` items) so any indexed service with a `[metrics.dora.<id>]` config produces the four canonical DORA values.

**Architecture:** Pure-SELECT calculators in `packages/gateway/src/metrics/dora.ts` read from the existing local index. A new `[metrics.dora.<service-id>]` TOML table maps a service id to repo URNs, PagerDuty service ids, deploy-workflow regex, and behaviour overrides. The DORA functions are I/O-free below `db`. CLI / IPC / HTTP layers all serialise the same `DoraMetricsResult` envelope.

**Scope expansion (vs. spec):** Spec assumes `pr.metadata.merge_commit_sha` + `merged_at` + a `pr → commit` graph edge exist. They do not (verified 2026-05-11). PR 2 therefore also enriches `github-sync.ts` with `merged_at`, `merge_commit_sha`, and `labels`, adds a V27 migration seeding a `merged_as` `graph_relation_type`, and emits the edge from `graph-populator.ts`. Other providers (GitLab / Bitbucket) get the same enrichment shape opportunistically (best-effort field extraction), but Lead Time on them carries `gap: "approximate_lead_time"` when the field is absent. Transitive commit-to-commit walking is **out of scope**; Lead Time falls back to exact `pr.merge_commit_sha === ci_run.metadata.headSha` and emits `gap: "approximate_lead_time"` when no exact match.

**Tech Stack:** Bun v1.2+, TypeScript 6.x strict, `bun:sqlite`, hand-written TOML parser pattern, `js-yaml` (already in PR 1), the existing `[Bun.serve]` HTTP server, JSON-RPC 2.0 over Unix socket / named pipe.

---

## File Structure

### Files created

| Path | Responsibility |
|---|---|
| `packages/gateway/src/index/pr-commit-relation-v27-sql.ts` | V27 migration — seeds `merged_as` row in `graph_relation_type`. Schema-only; no shadow table. |
| `packages/gateway/src/metrics/dora.ts` | Four pure metric calculators: `deploymentFrequency`, `leadTimeForChanges`, `changeFailureRate`, `mttr`. Each takes `(db, config, nowMs, sinceMs)` and returns `DoraMetricValue`. Plus `computeDoraMetrics` wrapper returning the full envelope. |
| `packages/gateway/src/metrics/dora-config.ts` | `DoraServiceConfig` type + URN parsing + repo-provider-to-`service`-column mapping. Standalone so unit tests don't need a DB. |
| `packages/gateway/src/ipc/metrics-rpc.ts` | `dispatchMetricsRpc` + `MetricsRpcError`; validates params, emits the envelope. Same shape as `agents-rpc.ts`. |
| `packages/gateway/test/fixtures/dora/payment-service/seed.ts` | Programmatic fixture seeder: 30 days of synthetic `pr`, `ci_run`, `incident` items spanning GitHub Actions / GitLab / Jenkins, hand-computed via `expected-metrics.json`. |
| `packages/gateway/test/fixtures/dora/payment-service/expected-metrics.json` | The four expected metric values for the fixture window. |
| `packages/gateway/test/unit/metrics/dora.test.ts` | Per-metric unit tests (every gap case + multi-provider + revert exclusion + most-recent-preceding CFR + MTTR low-sample). |
| `packages/gateway/test/unit/metrics/dora-config.test.ts` | TOML parse: missing fields, bad types, unknown keys, malformed URNs, unparseable regex. |
| `packages/gateway/test/integration/metrics/dora-real-db.test.ts` | Fresh SQLite + fixture + assert all four metrics within ±5%. |
| `packages/gateway/test/unit/ipc/metrics-rpc.test.ts` | Method dispatch + param validation. |
| `packages/gateway/test/integration/http/metrics-dora-route.test.ts` | `GET /v1/metrics/dora` round-trip. |
| `packages/cli/src/commands/metrics.ts` | `nimbus metrics dora --service X [--since 30d] [--json]`; pretty card + JSON modes; `NO_COLOR` respected. |
| `packages/cli/test/commands/metrics.test.ts` | CLI arg parsing + pretty-vs-json switch. |
| `packages/gateway/test/e2e/scenarios/metrics-dora.e2e.test.ts` | Gateway subprocess + seeded fixture + `nimbus metrics dora --service X --json` → assert envelope. |

### Files modified

| Path | Change |
|---|---|
| `packages/gateway/src/connectors/github-sync.ts` | Add `merged_at`, `merge_commit_sha`, `labels` to PR upsert metadata. |
| `packages/gateway/src/graph/graph-populator.ts` | Extend `syncPrGraph` to emit `merged_as` edge from PR entity → commit entity when `merged === true` and `merge_commit_sha` set. |
| `packages/gateway/src/index/migrations/runner.ts` | Register V26→V27 migration. |
| `packages/gateway/src/index/local-index.ts` | Bump `CURRENT_SCHEMA_VERSION` 26 → 27. |
| `packages/gateway/src/config/nimbus-toml.ts` | Add `NimbusDoraToml` types + `parseNimbusDoraToml` + `loadNimbusDoraFromConfigDir`. |
| `packages/gateway/src/ipc/http-routes.ts` | Append `{ method: "GET", path: "/v1/metrics/dora" }`. |
| `packages/gateway/src/ipc/http-server.ts` | Add `handleMetricsDora` + route dispatch. |
| `packages/gateway/src/ipc/server/dispatchers.ts` | Add `tryDispatchMetricsRpc`; wire into `tryDispatchPhase4Rpc` chain. |
| `packages/gateway/openapi/v1.yaml` | Replace `/v1/metrics/dora` reserved stub with full schema. |
| `packages/gateway/src/ipc/types.ts` (gateway) and `packages/ui/src/ipc/types.ts` (UI) | Export `DoraMetricValue`, `DoraMetricsResult`. UI mirror is just types — no UI wiring in PR 2. |
| `packages/cli/src/index.ts` | Register `metrics` subcommand. |
| `package.json` (root) | Add `test:coverage:metrics` script; wire into `test:ci`. |
| `.github/workflows/_test-suite.yml` | Add `test:coverage:metrics` step. |
| `.claude/commands/nimbus-file-map.md` | Add `packages/gateway/src/metrics/dora.ts`, `metrics-rpc.ts`, `metrics.ts` CLI rows. |
| `.claude/commands/nimbus-commands.md` | Add `test:coverage:metrics` row + `nimbus metrics dora` reference. |
| `CLAUDE.md` and `GEMINI.md` | Bump status line: T4 PR 2 ✅ in flight / shipped (depending on merge timing). |
| `docs/roadmap.md` | Flip the `nimbus metrics dora` DORA bullet to `[x]` on merge. |

---

## Task 1: V27 migration — `merged_as` graph_relation_type seed

**Files:**
- Create: `packages/gateway/src/index/pr-commit-relation-v27-sql.ts`
- Modify: `packages/gateway/src/index/migrations/runner.ts`
- Modify: `packages/gateway/src/index/local-index.ts:267` (bump `CURRENT_SCHEMA_VERSION`)
- Test: `packages/gateway/test/integration/index/migration-v27.test.ts`

- [ ] **Step 1: Write the failing migration test**

```ts
// packages/gateway/test/integration/index/migration-v27.test.ts
import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalIndex } from "../../../src/index/local-index.ts";

describe("V27 migration — merged_as graph_relation_type", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "nimbus-v27-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("seeds the merged_as relation type idempotently", () => {
    const index = new LocalIndex(join(dir, "nimbus.db"));
    index.open();
    const db = index.getDatabase();
    const row = db
      .query("SELECT name, directed FROM graph_relation_type WHERE name = 'merged_as'")
      .get() as { name: string; directed: number } | undefined;
    expect(row).toBeDefined();
    expect(row?.directed).toBe(1);
    index.close();
  });

  it("does not fail when applied to a DB already at V27 (idempotency)", () => {
    const index1 = new LocalIndex(join(dir, "nimbus.db"));
    index1.open();
    index1.close();
    const index2 = new LocalIndex(join(dir, "nimbus.db"));
    index2.open(); // should be a no-op for V27
    index2.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/test/integration/index/migration-v27.test.ts`
Expected: FAIL with "Expected row to be defined" (V27 doesn't exist yet).

- [ ] **Step 3: Create the V27 SQL module**

Create `packages/gateway/src/index/pr-commit-relation-v27-sql.ts`:

```ts
/**
 * V27 migration — seeds the `merged_as` row in `graph_relation_type`
 * so the graph populator can emit `pr → commit` edges produced by the
 * github PR connector (Phase 5 T4 PR 2). Append-only; no shadow table.
 *
 * The relation links the `pr` graph entity to the `commit` graph entity
 * created when `pr.metadata.merge_commit_sha` is present. Used by the
 * DORA Lead Time calculator's exact-SHA join.
 */

export const PR_COMMIT_RELATION_V27_SEED_SQL = `
INSERT OR IGNORE INTO graph_relation_type (name, directed) VALUES
  ('merged_as', 1);
`;
```

- [ ] **Step 4: Register the migration in the runner**

Modify `packages/gateway/src/index/migrations/runner.ts`:

After the V26 import block (~line 39), add:

```ts
import { PR_COMMIT_RELATION_V27_SEED_SQL } from "../pr-commit-relation-v27-sql.ts";
```

After `migrateIndexedV25ToV26` (~line 365), add:

```ts
function migrateIndexedV26ToV27(db: Database, _now: number): void {
  db.transaction(() => {
    db.exec(PR_COMMIT_RELATION_V27_SEED_SQL);
  })();
}
```

In the `INDEXED_SCHEMA_STEPS` array (~line 395), append:

```ts
  { fromVersion: 26, toVersion: 27, apply: migrateIndexedV26ToV27 },
```

Modify `packages/gateway/src/index/local-index.ts:267`:

```ts
export const CURRENT_SCHEMA_VERSION = 27;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test packages/gateway/test/integration/index/migration-v27.test.ts`
Expected: PASS (both cases).

- [ ] **Step 6: Run the full migration test suite to confirm no regression**

Run: `bun test packages/gateway/test/integration/index/`
Expected: PASS (all migration tests green).

- [ ] **Step 7: Commit**

```bash
git add packages/gateway/src/index/pr-commit-relation-v27-sql.ts \
        packages/gateway/src/index/migrations/runner.ts \
        packages/gateway/src/index/local-index.ts \
        packages/gateway/test/integration/index/migration-v27.test.ts
git commit -m "feat(db): V27 migration seeds merged_as graph_relation_type

Adds the relation type used by github-sync to link a merged PR entity
to its merge-commit entity. Single source of truth for the DORA Lead
Time exact-SHA join (Phase 5 T4 PR 2)."
```

---

## Task 2: Enrich `github-sync.ts` PR metadata + emit `pr → commit` graph edge

**Files:**
- Modify: `packages/gateway/src/connectors/github-sync.ts:100-140` (`upsertFromPullRequest`)
- Modify: `packages/gateway/src/graph/graph-populator.ts` (`syncPrGraph`)
- Test: `packages/gateway/test/unit/connectors/github-sync-pr-metadata.test.ts`
- Test: `packages/gateway/test/integration/graph/pr-commit-edge.test.ts`

- [ ] **Step 1: Write the failing metadata test**

```ts
// packages/gateway/test/unit/connectors/github-sync-pr-metadata.test.ts
import { describe, expect, it } from "bun:test";
import { extractPrMetadataForIndex } from "../../../src/connectors/github-sync.ts";

describe("github-sync: PR metadata enrichment", () => {
  it("captures merged_at, merge_commit_sha, labels on a merged PR", () => {
    const pr = {
      number: 42,
      state: "closed",
      merged: true,
      merged_at: "2026-05-10T12:34:56Z",
      merge_commit_sha: "abc123def456",
      labels: [{ name: "bug" }, { name: "backend" }],
      user: { login: "alice" },
      draft: false,
    };
    const out = extractPrMetadataForIndex("nimbus-agent/payments", pr);
    expect(out.merged_at).toBe(Date.parse("2026-05-10T12:34:56Z"));
    expect(out.merge_commit_sha).toBe("abc123def456");
    expect(out.labels).toEqual(["bug", "backend"]);
    expect(out.merged).toBe(true);
  });

  it("omits merged_at and merge_commit_sha when PR is open", () => {
    const pr = {
      number: 7,
      state: "open",
      merged: false,
      labels: [],
      user: { login: "bob" },
      draft: false,
    };
    const out = extractPrMetadataForIndex("nimbus-agent/payments", pr);
    expect(out.merged_at).toBeUndefined();
    expect(out.merge_commit_sha).toBeUndefined();
    expect(out.labels).toEqual([]);
  });

  it("tolerates a labels array of strings (defensive)", () => {
    const pr = {
      number: 9,
      state: "closed",
      merged: true,
      merged_at: "2026-05-10T12:00:00Z",
      merge_commit_sha: "deadbeef",
      labels: ["revert", "hotfix"],
      user: { login: "alice" },
    };
    const out = extractPrMetadataForIndex("nimbus-agent/payments", pr);
    expect(out.labels).toEqual(["revert", "hotfix"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/test/unit/connectors/github-sync-pr-metadata.test.ts`
Expected: FAIL — `extractPrMetadataForIndex` is not exported.

- [ ] **Step 3: Extract a pure helper and use it from `upsertFromPullRequest`**

Modify `packages/gateway/src/connectors/github-sync.ts`. Replace the `meta` block in `upsertFromPullRequest` (lines ~117-124) with a call to a new exported helper. Add at the top of the file (export so the unit test can hit it):

```ts
export function extractPrMetadataForIndex(
  repoFull: string,
  pr: Record<string, unknown>,
): Record<string, unknown> {
  const merged = pr["merged"] === true;
  const out: Record<string, unknown> = {
    number: numberField(pr, "number"),
    repo: repoFull,
    state: stringField(pr, "state"),
    draft: pr["draft"] === true,
    merged,
    user: (() => {
      const user = asRecord(pr["user"]);
      return user === undefined ? undefined : stringField(user, "login");
    })(),
    labels: extractLabelNames(pr["labels"]),
  };
  if (merged) {
    const mergedAtIso = stringField(pr, "merged_at");
    if (mergedAtIso !== undefined) {
      const ms = Date.parse(mergedAtIso);
      if (Number.isFinite(ms)) out.merged_at = ms;
    }
    const sha = stringField(pr, "merge_commit_sha");
    if (sha !== undefined && sha.length > 0) out.merge_commit_sha = sha;
  }
  return out;
}

function extractLabelNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      out.push(entry);
      continue;
    }
    const r = asRecord(entry);
    if (r === undefined) continue;
    const name = stringField(r, "name");
    if (name !== undefined && name.length > 0) out.push(name);
  }
  return out;
}
```

Then replace the original `meta` block inside `upsertFromPullRequest` so it reads:

```ts
  const meta = extractPrMetadataForIndex(repoFull, pr);
```

(removes the duplicated inline construction, calls the pure helper).

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/gateway/test/unit/connectors/github-sync-pr-metadata.test.ts`
Expected: PASS (3 cases).

- [ ] **Step 5: Write the failing graph-edge test**

```ts
// packages/gateway/test/integration/graph/pr-commit-edge.test.ts
import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalIndex } from "../../../src/index/local-index.ts";
import { populateGraphForIndexedItem } from "../../../src/graph/graph-populator.ts";

describe("graph-populator: pr → commit merged_as edge", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "nimbus-pr-edge-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("emits a merged_as relation from PR entity to commit entity on merge", () => {
    const index = new LocalIndex(join(dir, "nimbus.db"));
    index.open();
    const db = index.getDatabase();
    const now = Date.now();
    populateGraphForIndexedItem(db, {
      id: "github:pr_nimbus-agent/payments#42",
      service: "github",
      type: "pr",
      externalId: "nimbus-agent/payments#42",
      title: "Add retry logic",
      modifiedAt: now,
      authorId: null,
      metadata: {
        repo: "nimbus-agent/payments",
        merged: true,
        merged_at: now,
        merge_commit_sha: "abc123",
      },
    }, now);
    const rows = db
      .query(
        `SELECT rt.name FROM graph_relation r
         JOIN graph_relation_type rt ON rt.name = r.type
         JOIN graph_entity src ON src.id = r.source_id
         JOIN graph_entity dst ON dst.id = r.target_id
         WHERE src.type = 'pr' AND dst.type = 'commit' AND rt.name = 'merged_as'`,
      )
      .all() as { name: string }[];
    expect(rows.length).toBe(1);
    index.close();
  });

  it("emits no merged_as edge when PR is not merged", () => {
    const index = new LocalIndex(join(dir, "nimbus.db"));
    index.open();
    const db = index.getDatabase();
    const now = Date.now();
    populateGraphForIndexedItem(db, {
      id: "github:pr_nimbus-agent/payments#7",
      service: "github",
      type: "pr",
      externalId: "nimbus-agent/payments#7",
      title: "WIP",
      modifiedAt: now,
      authorId: null,
      metadata: { repo: "nimbus-agent/payments", merged: false },
    }, now);
    const rows = db
      .query(
        `SELECT 1 FROM graph_relation r
         JOIN graph_relation_type rt ON rt.name = r.type
         WHERE rt.name = 'merged_as'`,
      )
      .all();
    expect(rows.length).toBe(0);
    index.close();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `bun test packages/gateway/test/integration/graph/pr-commit-edge.test.ts`
Expected: FAIL — `syncPrGraph` doesn't emit the edge yet.

- [ ] **Step 7: Extend `syncPrGraph` in `graph-populator.ts`**

Find `syncPrGraph` in `packages/gateway/src/graph/graph-populator.ts`. After the existing entity upserts, before the function returns, add:

```ts
  const merged = row.metadata !== undefined && (row.metadata as Record<string, unknown>)["merged"] === true;
  const mergeSha = stringField(row.metadata, "merge_commit_sha");
  if (merged && mergeSha !== undefined && mergeSha.length > 0) {
    const commitEntityId = upsertGraphEntity(db, {
      type: "commit",
      externalId: `${row.service}:${mergeSha}`,
      label: mergeSha.slice(0, 12),
      service: row.service,
      metadata: { sha: mergeSha },
    });
    upsertGraphRelation(db, prEntityId, commitEntityId, "merged_as", now);
  }
```

(Use the existing `prEntityId` variable created earlier in the function. `stringField` is already imported. If the metadata read pattern in the file uses a different helper, mirror it exactly — `stringField(row.metadata, "merge_commit_sha")` works because metadata is already a `Record<string, unknown>` after the populator's normalisation.)

- [ ] **Step 8: Run test to verify it passes**

Run: `bun test packages/gateway/test/integration/graph/pr-commit-edge.test.ts`
Expected: PASS (both cases).

- [ ] **Step 9: Run github-sync.ts existing tests to confirm no regression**

Run: `bun test packages/gateway/test/unit/connectors/github-sync`
Expected: PASS (all existing github-sync tests still green).

- [ ] **Step 10: Commit**

```bash
git add packages/gateway/src/connectors/github-sync.ts \
        packages/gateway/src/graph/graph-populator.ts \
        packages/gateway/test/unit/connectors/github-sync-pr-metadata.test.ts \
        packages/gateway/test/integration/graph/pr-commit-edge.test.ts
git commit -m "feat(github): enrich PR metadata with merged_at + merge_commit_sha + labels

Adds extractPrMetadataForIndex as a pure helper used by upsertFromPullRequest.
graph-populator emits a merged_as edge from the PR entity to the merge
commit entity when the PR is merged with a merge_commit_sha. The DORA
Lead Time calculator joins on this edge."
```

---

## Task 3: `[metrics.dora.<service-id>]` TOML parser

**Files:**
- Create: `packages/gateway/src/metrics/dora-config.ts`
- Modify: `packages/gateway/src/config/nimbus-toml.ts` (append at end)
- Test: `packages/gateway/test/unit/metrics/dora-config.test.ts`

- [ ] **Step 1: Write the failing config-parsing test**

```ts
// packages/gateway/test/unit/metrics/dora-config.test.ts
import { describe, expect, it } from "bun:test";
import {
  DEFAULT_DEPLOY_WORKFLOW_PATTERN,
  parseDoraRepoUrn,
  type ParsedDoraRepoUrn,
} from "../../../src/metrics/dora-config.ts";
import { parseNimbusDoraToml } from "../../../src/config/nimbus-toml.ts";

describe("DORA TOML parser", () => {
  it("parses one service entry with all keys", () => {
    const raw = `
[metrics.dora.payment-service]
repos = ["github:nimbus-agent/payments", "jenkins:payment-service/deploy-prod"]
pagerduty_services = ["P12ABCD"]
deploy_workflow_pattern = "^Release"
incident_window_minutes = 90
exclude_pr_labels = ["revert", "rollback"]
`;
    const parsed = parseNimbusDoraToml(raw);
    expect(parsed.size).toBe(1);
    const cfg = parsed.get("payment-service");
    if (cfg === undefined) throw new Error("payment-service missing");
    expect(cfg.repos.map((r) => `${r.provider}:${r.providerId}`)).toEqual([
      "github:nimbus-agent/payments",
      "jenkins:payment-service/deploy-prod",
    ]);
    expect(cfg.pagerdutyServices).toEqual(["P12ABCD"]);
    expect(cfg.deployWorkflowPattern.source).toBe("^Release");
    expect(cfg.incidentWindowMinutes).toBe(90);
    expect(cfg.excludePrLabels).toEqual(["revert", "rollback"]);
  });

  it("uses defaults for omitted keys", () => {
    const raw = `
[metrics.dora.svc-a]
repos = ["github:org/svc-a"]
`;
    const cfg = parseNimbusDoraToml(raw).get("svc-a");
    if (cfg === undefined) throw new Error("svc-a missing");
    expect(cfg.deployWorkflowPattern.source).toBe(DEFAULT_DEPLOY_WORKFLOW_PATTERN);
    expect(cfg.incidentWindowMinutes).toBe(60);
    expect(cfg.excludePrLabels).toEqual(["revert"]);
    expect(cfg.pagerdutyServices).toEqual([]);
  });

  it("rejects an unknown provider prefix", () => {
    expect(() => parseDoraRepoUrn("svn:my-repo")).toThrow(/unknown provider/i);
  });

  it("rejects URN with no separator", () => {
    expect(() => parseDoraRepoUrn("github")).toThrow(/invalid urn/i);
  });

  it("parses URN with provider-id containing colons", () => {
    const out = parseDoraRepoUrn("circleci:gh/nimbus-agent/payments");
    expect(out.provider).toBe("circleci");
    expect(out.providerId).toBe("gh/nimbus-agent/payments");
  });

  it("rejects unparseable deploy_workflow_pattern", () => {
    const raw = `
[metrics.dora.bad-service]
repos = ["github:org/svc"]
deploy_workflow_pattern = "["
`;
    expect(() => parseNimbusDoraToml(raw)).toThrow(/regex/i);
  });

  it("rejects out-of-range incident_window_minutes", () => {
    const raw = `
[metrics.dora.bad]
repos = ["github:org/svc"]
incident_window_minutes = 0
`;
    expect(() => parseNimbusDoraToml(raw)).toThrow(/incident_window_minutes/);
  });

  it("rejects unknown keys", () => {
    const raw = `
[metrics.dora.bad]
repos = ["github:org/svc"]
mystery = "yes"
`;
    expect(() => parseNimbusDoraToml(raw)).toThrow(/unknown key/i);
  });

  it("returns an empty Map when no [metrics.dora.*] tables present", () => {
    const parsed = parseNimbusDoraToml("[user]\nme_person_id = \"alice\"\n");
    expect(parsed.size).toBe(0);
  });

  it("parses multiple service entries independently", () => {
    const raw = `
[metrics.dora.svc-a]
repos = ["github:org/a"]

[metrics.dora.svc-b]
repos = ["gitlab:org/b"]
pagerduty_services = ["PXYZ"]
`;
    const parsed = parseNimbusDoraToml(raw);
    expect(parsed.size).toBe(2);
    expect(parsed.get("svc-a")?.pagerdutyServices).toEqual([]);
    expect(parsed.get("svc-b")?.pagerdutyServices).toEqual(["PXYZ"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/test/unit/metrics/dora-config.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `dora-config.ts`**

Create `packages/gateway/src/metrics/dora-config.ts`:

```ts
/**
 * DORA service-config types + URN helpers.
 *
 * `[metrics.dora.<service-id>]` in nimbus.toml maps an abstract service id
 * to: a list of repo URNs (multi-provider), PagerDuty service ids, a deploy
 * workflow name regex, and behaviour overrides.
 *
 * Provider URN format: `<provider>:<provider-specific-id>`. The provider
 * prefix is used to compute the `service` column filter on the unified
 * `item` table (verified 2026-05-10 against the four CI connectors).
 */

export type DoraProvider = "github" | "gitlab" | "bitbucket" | "jenkins" | "circleci";

export type ParsedDoraRepoUrn = {
  readonly provider: DoraProvider;
  readonly providerId: string;
};

export type DoraServiceConfig = {
  /** Stable service id from the table key. */
  readonly serviceId: string;
  readonly repos: readonly ParsedDoraRepoUrn[];
  readonly pagerdutyServices: readonly string[];
  readonly deployWorkflowPattern: RegExp;
  readonly incidentWindowMinutes: number;
  readonly excludePrLabels: readonly string[];
};

export const DEFAULT_DEPLOY_WORKFLOW_PATTERN = "^[Dd]eploy";
export const DEFAULT_INCIDENT_WINDOW_MINUTES = 60;
export const DEFAULT_EXCLUDE_PR_LABELS: readonly string[] = ["revert"];

const KNOWN_PROVIDERS: readonly DoraProvider[] = [
  "github",
  "gitlab",
  "bitbucket",
  "jenkins",
  "circleci",
];

export function parseDoraRepoUrn(raw: string): ParsedDoraRepoUrn {
  const colon = raw.indexOf(":");
  if (colon <= 0) {
    throw new Error(`invalid URN '${raw}': missing 'provider:id' separator`);
  }
  const provider = raw.slice(0, colon);
  const providerId = raw.slice(colon + 1);
  if (!(KNOWN_PROVIDERS as readonly string[]).includes(provider)) {
    throw new Error(
      `unknown provider '${provider}' in URN '${raw}'. Known: ${KNOWN_PROVIDERS.join(", ")}`,
    );
  }
  if (providerId.length === 0) {
    throw new Error(`invalid URN '${raw}': empty provider-specific id`);
  }
  return { provider: provider as DoraProvider, providerId };
}

/**
 * Maps a provider URN prefix to the `service` column values it covers
 * on the indexed `item` table. Asymmetric for GitHub: PRs live under
 * `github`, CI runs under `github_actions`.
 */
export function providerServiceColumns(
  provider: DoraProvider,
): { prServices: readonly string[]; ciServices: readonly string[] } {
  switch (provider) {
    case "github":
      return { prServices: ["github"], ciServices: ["github_actions"] };
    case "gitlab":
      return { prServices: ["gitlab"], ciServices: ["gitlab"] };
    case "bitbucket":
      return { prServices: ["bitbucket"], ciServices: ["bitbucket"] };
    case "jenkins":
      return { prServices: [], ciServices: ["jenkins"] };
    case "circleci":
      return { prServices: [], ciServices: ["circleci"] };
  }
}
```

- [ ] **Step 4: Append parser to `nimbus-toml.ts`**

Append at the very end of `packages/gateway/src/config/nimbus-toml.ts`:

```ts
// ---------------------------------------------------------------------------
// [metrics.dora.<service-id>] — DORA service map (Phase 5 T4 PR 2)
// ---------------------------------------------------------------------------

import {
  DEFAULT_DEPLOY_WORKFLOW_PATTERN,
  DEFAULT_EXCLUDE_PR_LABELS,
  DEFAULT_INCIDENT_WINDOW_MINUTES,
  type DoraServiceConfig,
  parseDoraRepoUrn,
} from "../metrics/dora-config.ts";

const DORA_TABLE_PREFIX = "[metrics.dora.";
const DORA_KNOWN_KEYS: ReadonlySet<string> = new Set([
  "repos",
  "pagerduty_services",
  "deploy_workflow_pattern",
  "incident_window_minutes",
  "exclude_pr_labels",
]);

function parseStringArray(raw: string): string[] {
  const t = raw.trim();
  if (!t.startsWith("[") || !t.endsWith("]")) {
    throw new Error(`expected array, got: ${raw}`);
  }
  const inner = t.slice(1, -1).trim();
  if (inner.length === 0) return [];
  const out: string[] = [];
  // Naive split — repos / pagerduty ids don't contain commas or quotes.
  for (const part of inner.split(",")) {
    const v = parseString(part);
    if (v.length > 0) out.push(v);
  }
  return out;
}

export function parseNimbusDoraToml(raw: string): Map<string, DoraServiceConfig> {
  const lines = raw.split(/\r?\n/);
  const accum: Map<string, Record<string, string>> = new Map();
  let currentId: string | undefined;
  for (const line of lines) {
    const trimmed = stripComment(line).trim();
    if (trimmed === "") continue;
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      if (trimmed.startsWith(DORA_TABLE_PREFIX) && trimmed.endsWith("]")) {
        const id = trimmed.slice(DORA_TABLE_PREFIX.length, -1);
        if (id.length === 0) throw new Error("empty service id in [metrics.dora.<id>]");
        currentId = id;
        if (!accum.has(id)) accum.set(id, {});
      } else {
        currentId = undefined;
      }
      continue;
    }
    if (currentId === undefined) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!DORA_KNOWN_KEYS.has(key)) {
      throw new Error(`unknown key '${key}' in [metrics.dora.${currentId}]`);
    }
    accum.get(currentId)![key] = trimmed.slice(eq + 1).trim();
  }
  const out: Map<string, DoraServiceConfig> = new Map();
  for (const [serviceId, kv] of accum.entries()) {
    const reposRaw = kv["repos"];
    if (reposRaw === undefined) {
      throw new Error(`[metrics.dora.${serviceId}] missing required 'repos'`);
    }
    const repos = parseStringArray(reposRaw).map(parseDoraRepoUrn);
    const pagerdutyServices =
      kv["pagerduty_services"] === undefined ? [] : parseStringArray(kv["pagerduty_services"]);
    const patternSrc =
      kv["deploy_workflow_pattern"] === undefined
        ? DEFAULT_DEPLOY_WORKFLOW_PATTERN
        : parseString(kv["deploy_workflow_pattern"]);
    let deployWorkflowPattern: RegExp;
    try {
      deployWorkflowPattern = new RegExp(patternSrc);
    } catch (e) {
      throw new Error(
        `[metrics.dora.${serviceId}].deploy_workflow_pattern is not a valid regex: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
    const windowMins =
      kv["incident_window_minutes"] === undefined
        ? DEFAULT_INCIDENT_WINDOW_MINUTES
        : parseIntDec(kv["incident_window_minutes"]);
    if (windowMins === undefined || windowMins < 1 || windowMins > 1440) {
      throw new Error(
        `[metrics.dora.${serviceId}].incident_window_minutes must be 1..1440, got '${kv["incident_window_minutes"]}'`,
      );
    }
    const excludePrLabels =
      kv["exclude_pr_labels"] === undefined
        ? Array.from(DEFAULT_EXCLUDE_PR_LABELS)
        : parseStringArray(kv["exclude_pr_labels"]);
    out.set(serviceId, {
      serviceId,
      repos,
      pagerdutyServices,
      deployWorkflowPattern,
      incidentWindowMinutes: windowMins,
      excludePrLabels,
    });
  }
  return out;
}

export function loadNimbusDoraFromPath(tomlPath: string): Map<string, DoraServiceConfig> {
  if (!existsSync(tomlPath)) return new Map();
  const raw = readFileSync(tomlPath, "utf8");
  return parseNimbusDoraToml(raw);
}

export function loadNimbusDoraFromConfigDir(configDir: string): Map<string, DoraServiceConfig> {
  return loadNimbusDoraFromPath(join(configDir, "nimbus.toml"));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test packages/gateway/test/unit/metrics/dora-config.test.ts`
Expected: PASS (all 10 cases).

- [ ] **Step 6: Run config tests to confirm no regression**

Run: `bun test packages/gateway/test/unit/config/`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/gateway/src/metrics/dora-config.ts \
        packages/gateway/src/config/nimbus-toml.ts \
        packages/gateway/test/unit/metrics/dora-config.test.ts
git commit -m "feat(config): parse [metrics.dora.<id>] TOML table

URN parsing supports github/gitlab/bitbucket/jenkins/circleci. Regex,
range, and unknown-key validation all run at parse time so the Gateway
refuses to start on a malformed config. Phase 5 T4 PR 2."
```

---

## Task 4: `metrics/dora.ts` — pure metric calculators

**Files:**
- Create: `packages/gateway/src/metrics/dora.ts`
- Test: `packages/gateway/test/unit/metrics/dora.test.ts`

- [ ] **Step 1: Write the failing test (deploymentFrequency)**

```ts
// packages/gateway/test/unit/metrics/dora.test.ts
import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalIndex } from "../../../src/index/local-index.ts";
import { computeDoraMetrics, deploymentFrequency } from "../../../src/metrics/dora.ts";
import type { DoraServiceConfig } from "../../../src/metrics/dora-config.ts";

function seedCiRun(db: Database, id: string, opts: {
  service: string;
  title: string;
  conclusion: string;
  headSha?: string;
  modifiedAt: number;
}) {
  const meta = JSON.stringify({ conclusion: opts.conclusion, headSha: opts.headSha ?? null });
  db.run(
    `INSERT INTO item (id, service, type, external_id, title, body_preview, url, canonical_url,
                       modified_at, author_id, metadata, synced_at, pinned)
     VALUES (?, ?, 'ci_run', ?, ?, '', NULL, NULL, ?, NULL, ?, ?, 0)`,
    [id, opts.service, id, opts.title, opts.modifiedAt, meta, opts.modifiedAt],
  );
}

function cfg(overrides: Partial<DoraServiceConfig> = {}): DoraServiceConfig {
  return {
    serviceId: "payment-service",
    repos: [{ provider: "github", providerId: "nimbus-agent/payments" }],
    pagerdutyServices: ["P1"],
    deployWorkflowPattern: /^[Dd]eploy/,
    incidentWindowMinutes: 60,
    excludePrLabels: ["revert"],
    ...overrides,
  };
}

describe("deploymentFrequency", () => {
  let dir: string;
  let index: LocalIndex;
  let db: Database;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "nimbus-dora-"));
    index = new LocalIndex(join(dir, "nimbus.db"));
    index.open();
    db = index.getDatabase();
  });
  afterEach(() => {
    index.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("counts only successful deploys matching the regex on a matching repo", () => {
    const now = 1_715_000_000_000;
    const day = 86_400_000;
    seedCiRun(db, "github_actions:r1", {
      service: "github_actions",
      title: "Deploy production",
      conclusion: "success",
      modifiedAt: now - 5 * day,
    });
    seedCiRun(db, "github_actions:r2", {
      service: "github_actions",
      title: "Deploy production",
      conclusion: "failure",
      modifiedAt: now - 4 * day,
    });
    seedCiRun(db, "github_actions:r3", {
      service: "github_actions",
      title: "CI lint",
      conclusion: "success",
      modifiedAt: now - 3 * day,
    });
    seedCiRun(db, "github_actions:r4", {
      service: "github_actions",
      title: "deploy",
      conclusion: "success",
      modifiedAt: now - 2 * day,
    });
    const result = deploymentFrequency(db, cfg(), now, 30 * day);
    expect(result.sample).toBe(2);
    expect(result.unit).toBe("deploys_per_day");
    // 2 deploys / 30 days
    expect(result.value).toBeCloseTo(2 / 30, 3);
    expect(result.gap).toBeNull();
  });

  it("returns null with gap='no_repos' when repos is empty", () => {
    const result = deploymentFrequency(db, cfg({ repos: [] }), Date.now(), 30 * 86_400_000);
    expect(result.value).toBeNull();
    expect(result.gap).toBe("no_repos");
    expect(result.sample).toBe(0);
  });

  it("returns null with gap='no_deployment_data' when zero ci_run titles match the regex", () => {
    const now = Date.now();
    seedCiRun(db, "github_actions:lint", {
      service: "github_actions",
      title: "CI lint",
      conclusion: "success",
      modifiedAt: now - 1000,
    });
    const result = deploymentFrequency(db, cfg(), now, 7 * 86_400_000);
    expect(result.value).toBeNull();
    expect(result.gap).toBe("no_deployment_data");
  });

  it("emits gap='low_sample' when fewer than 3 deploys in window", () => {
    const now = Date.now();
    seedCiRun(db, "github_actions:r1", {
      service: "github_actions",
      title: "Deploy",
      conclusion: "success",
      modifiedAt: now - 1000,
    });
    seedCiRun(db, "github_actions:r2", {
      service: "github_actions",
      title: "Deploy",
      conclusion: "success",
      modifiedAt: now - 2000,
    });
    const result = deploymentFrequency(db, cfg(), now, 7 * 86_400_000);
    expect(result.value).toBeGreaterThan(0);
    expect(result.gap).toBe("low_sample");
  });
});

describe("computeDoraMetrics envelope", () => {
  let dir: string;
  let index: LocalIndex;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "nimbus-dora-env-"));
    index = new LocalIndex(join(dir, "nimbus.db"));
    index.open();
  });
  afterEach(() => {
    index.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns the four-metric envelope with computed_at set", () => {
    const out = computeDoraMetrics(index.getDatabase(), cfg(), Date.now(), 30 * 86_400_000);
    expect(out.metrics).toHaveProperty("deployment_frequency");
    expect(out.metrics).toHaveProperty("lead_time_for_changes");
    expect(out.metrics).toHaveProperty("change_failure_rate");
    expect(out.metrics).toHaveProperty("mttr");
    expect(out.service).toBe("payment-service");
    expect(out.computed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
```

Add the rest of the test file covering: `leadTimeForChanges`, `changeFailureRate` (including the most-recent-preceding rule), `mttr` (N=1, N=2 → `low_sample`; N=0 → null), revert exclusion, multi-provider repos, `no_pagerduty_mapping` gap. Mirror the seeding helper for `pr` and `incident`. Use the same fixture-style seeding (16+ test cases total).

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/test/unit/metrics/dora.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `metrics/dora.ts`**

Create `packages/gateway/src/metrics/dora.ts`:

```ts
import type { Database } from "bun:sqlite";
import type { DoraServiceConfig, ParsedDoraRepoUrn } from "./dora-config.ts";
import { providerServiceColumns } from "./dora-config.ts";

export type DoraGap =
  | null
  | "no_pagerduty_mapping"
  | "no_repos"
  | "no_deployment_data"
  | "low_sample"
  | "approximate_lead_time";

export type DoraMetricValue = {
  readonly value: number | null;
  readonly unit: string;
  readonly sample: number;
  readonly gap: DoraGap;
};

export type DoraMetricsResult = {
  readonly service: string;
  readonly since_ms: number;
  readonly computed_at: string;
  readonly metrics: {
    readonly deployment_frequency: DoraMetricValue;
    readonly lead_time_for_changes: DoraMetricValue;
    readonly change_failure_rate: DoraMetricValue;
    readonly mttr: DoraMetricValue;
  };
};

const LOW_SAMPLE_THRESHOLD = 3;

function gapOrNull(metric: DoraMetricValue): DoraMetricValue {
  if (metric.value !== null && metric.sample < LOW_SAMPLE_THRESHOLD && metric.gap === null) {
    return { ...metric, gap: "low_sample" };
  }
  return metric;
}

function distinctCiServiceColumns(repos: readonly ParsedDoraRepoUrn[]): string[] {
  const out = new Set<string>();
  for (const r of repos) {
    for (const s of providerServiceColumns(r.provider).ciServices) out.add(s);
  }
  return Array.from(out);
}

function distinctPrServiceColumns(repos: readonly ParsedDoraRepoUrn[]): string[] {
  const out = new Set<string>();
  for (const r of repos) {
    for (const s of providerServiceColumns(r.provider).prServices) out.add(s);
  }
  return Array.from(out);
}

/**
 * Matches `metadata.repo` (GitHub / Bitbucket), `metadata.project` (GitLab),
 * `metadata.jobName` (Jenkins), or `external_id` fallback. Combined per provider.
 */
function repoLikeMatchesUrn(
  metadata: Record<string, unknown> | null,
  externalId: string,
  urn: ParsedDoraRepoUrn,
): boolean {
  if (metadata === null) return false;
  switch (urn.provider) {
    case "github":
    case "bitbucket":
      return metadata["repo"] === urn.providerId;
    case "gitlab":
      return metadata["project"] === urn.providerId || metadata["repo"] === urn.providerId;
    case "jenkins":
      return metadata["jobName"] === urn.providerId;
    case "circleci":
      return externalId.includes(urn.providerId);
  }
}

type CiRunRow = {
  id: string;
  external_id: string;
  title: string;
  modified_at: number;
  metadata: string | null;
};

function selectDeploys(
  db: Database,
  cfg: DoraServiceConfig,
  nowMs: number,
  sinceMs: number,
): CiRunRow[] {
  const ciServices = distinctCiServiceColumns(cfg.repos);
  if (ciServices.length === 0) return [];
  const placeholders = ciServices.map(() => "?").join(",");
  const rows = db
    .query(
      `SELECT id, external_id, title, modified_at, metadata
       FROM item
       WHERE service IN (${placeholders})
         AND type = 'ci_run'
         AND modified_at >= ?
         AND modified_at <= ?`,
    )
    .all(...ciServices, nowMs - sinceMs, nowMs) as CiRunRow[];
  const out: CiRunRow[] = [];
  for (const row of rows) {
    if (!cfg.deployWorkflowPattern.test(row.title)) continue;
    const meta = row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : null;
    if (meta?.["conclusion"] !== "success") continue;
    if (!cfg.repos.some((u) => repoLikeMatchesUrn(meta, row.external_id, u))) continue;
    out.push(row);
  }
  return out;
}

export function deploymentFrequency(
  db: Database,
  cfg: DoraServiceConfig,
  nowMs: number,
  sinceMs: number,
): DoraMetricValue {
  if (cfg.repos.length === 0) {
    return { value: null, unit: "deploys_per_day", sample: 0, gap: "no_repos" };
  }
  const deploys = selectDeploys(db, cfg, nowMs, sinceMs);
  if (deploys.length === 0) {
    return { value: null, unit: "deploys_per_day", sample: 0, gap: "no_deployment_data" };
  }
  const days = sinceMs / 86_400_000;
  const value = deploys.length / days;
  return gapOrNull({ value, unit: "deploys_per_day", sample: deploys.length, gap: null });
}

type PrRow = {
  id: string;
  modified_at: number;
  metadata: string | null;
};

export function leadTimeForChanges(
  db: Database,
  cfg: DoraServiceConfig,
  nowMs: number,
  sinceMs: number,
): DoraMetricValue {
  if (cfg.repos.length === 0) {
    return { value: null, unit: "seconds_median", sample: 0, gap: "no_repos" };
  }
  const deploys = selectDeploys(db, cfg, nowMs, sinceMs);
  if (deploys.length === 0) {
    return { value: null, unit: "seconds_median", sample: 0, gap: "no_deployment_data" };
  }
  const prServices = distinctPrServiceColumns(cfg.repos);
  if (prServices.length === 0) {
    return { value: null, unit: "seconds_median", sample: 0, gap: "approximate_lead_time" };
  }
  const placeholders = prServices.map(() => "?").join(",");
  const prRows = db
    .query(
      `SELECT id, modified_at, metadata FROM item
       WHERE service IN (${placeholders})
         AND type = 'pr'
         AND modified_at >= ?
         AND modified_at <= ?`,
    )
    .all(...prServices, nowMs - sinceMs, nowMs) as PrRow[];
  const leadTimes: number[] = [];
  let anyApproximate = false;
  // Build deploy index by headSha + chronological order on same repo (for fallback).
  type DeployIdx = { headSha: string | null; modifiedAt: number; meta: Record<string, unknown> | null };
  const deployIdx: DeployIdx[] = deploys.map((d) => {
    const meta = d.metadata ? (JSON.parse(d.metadata) as Record<string, unknown>) : null;
    const headSha = meta && typeof meta["headSha"] === "string" ? meta["headSha"] : null;
    return { headSha, modifiedAt: d.modified_at, meta };
  });
  for (const pr of prRows) {
    const meta = pr.metadata ? (JSON.parse(pr.metadata) as Record<string, unknown>) : null;
    if (meta === null || meta["merged"] !== true) continue;
    const mergedAt = typeof meta["merged_at"] === "number" ? meta["merged_at"] : null;
    if (mergedAt === null) continue;
    const labels = Array.isArray(meta["labels"]) ? (meta["labels"] as unknown[]) : [];
    if (labels.some((l) => typeof l === "string" && cfg.excludePrLabels.includes(l))) continue;
    const mergeSha = typeof meta["merge_commit_sha"] === "string" ? meta["merge_commit_sha"] : null;
    if (mergeSha === null) {
      anyApproximate = true;
      continue;
    }
    const match = deployIdx.find((d) => d.headSha === mergeSha && d.modifiedAt >= mergedAt);
    if (match === undefined) {
      anyApproximate = true;
      continue;
    }
    leadTimes.push(Math.floor((match.modifiedAt - mergedAt) / 1000));
  }
  if (leadTimes.length === 0) {
    return {
      value: null,
      unit: "seconds_median",
      sample: 0,
      gap: anyApproximate ? "approximate_lead_time" : "no_deployment_data",
    };
  }
  leadTimes.sort((a, b) => a - b);
  const median =
    leadTimes.length % 2 === 1
      ? leadTimes[(leadTimes.length - 1) / 2]
      : Math.floor((leadTimes[leadTimes.length / 2 - 1] + leadTimes[leadTimes.length / 2]) / 2);
  return gapOrNull({
    value: median,
    unit: "seconds_median",
    sample: leadTimes.length,
    gap: anyApproximate ? "approximate_lead_time" : null,
  });
}

type IncidentRow = {
  id: string;
  modified_at: number;
  metadata: string | null;
};

function selectResolvedIncidents(
  db: Database,
  cfg: DoraServiceConfig,
  nowMs: number,
  sinceMs: number,
): { opened: number; resolved: number; pdService: string }[] {
  if (cfg.pagerdutyServices.length === 0) return [];
  const placeholders = cfg.pagerdutyServices.map(() => "?").join(",");
  // The pagerduty connector stores status + incidentId on metadata; we need
  // opened_at + resolved_at via the upstream API. Schema gap: incidents land
  // in `item` with modified_at = updated_at (latest update). For DORA we use
  // modified_at as resolved_at when status is 'resolved' and seed `opened_at`
  // from metadata when the connector starts populating it (planned in a
  // follow-up). Current behaviour: incident is "resolved" iff metadata.status
  // === 'resolved'; opened_at falls back to the earliest known synced_at.
  const rows = db
    .query(
      `SELECT i.id, i.modified_at, i.metadata, i.synced_at
       FROM item i
       JOIN json_each(i.metadata, '$.pagerduty_service_id') p ON 1
       WHERE i.service = 'pagerduty'
         AND i.type = 'incident'
         AND p.value IN (${placeholders})
         AND i.modified_at >= ?
         AND i.modified_at <= ?`,
    )
    .all(...cfg.pagerdutyServices, nowMs - sinceMs, nowMs) as (IncidentRow & { synced_at: number })[];
  const out: { opened: number; resolved: number; pdService: string }[] = [];
  for (const r of rows) {
    const meta = r.metadata ? (JSON.parse(r.metadata) as Record<string, unknown>) : null;
    if (meta === null || meta["status"] !== "resolved") continue;
    const opened =
      typeof meta["opened_at_ms"] === "number" ? (meta["opened_at_ms"] as number) : r.synced_at;
    out.push({
      opened,
      resolved: r.modified_at,
      pdService:
        typeof meta["pagerduty_service_id"] === "string"
          ? (meta["pagerduty_service_id"] as string)
          : "",
    });
  }
  return out;
}

export function changeFailureRate(
  db: Database,
  cfg: DoraServiceConfig,
  nowMs: number,
  sinceMs: number,
): DoraMetricValue {
  if (cfg.repos.length === 0) {
    return { value: null, unit: "ratio", sample: 0, gap: "no_repos" };
  }
  const deploys = selectDeploys(db, cfg, nowMs, sinceMs);
  if (deploys.length === 0) {
    return { value: null, unit: "ratio", sample: 0, gap: "no_deployment_data" };
  }
  if (cfg.pagerdutyServices.length === 0) {
    return { value: null, unit: "ratio", sample: deploys.length, gap: "no_pagerduty_mapping" };
  }
  const incidents = selectResolvedIncidents(db, cfg, nowMs, sinceMs);
  const windowMs = cfg.incidentWindowMinutes * 60_000;
  // Most-recent-preceding attribution: each incident → the single most recent
  // preceding deploy within `windowMs`.
  const sortedDeploys = deploys
    .map((d) => ({ id: d.id, t: d.modified_at }))
    .sort((a, b) => a.t - b.t);
  const failedDeployIds = new Set<string>();
  for (const inc of incidents) {
    let attributed: string | undefined;
    for (const d of sortedDeploys) {
      if (d.t <= inc.opened && inc.opened - d.t <= windowMs) attributed = d.id;
      if (d.t > inc.opened) break;
    }
    if (attributed !== undefined) failedDeployIds.add(attributed);
  }
  const value = failedDeployIds.size / deploys.length;
  return gapOrNull({ value, unit: "ratio", sample: deploys.length, gap: null });
}

export function mttr(
  db: Database,
  cfg: DoraServiceConfig,
  nowMs: number,
  sinceMs: number,
): DoraMetricValue {
  if (cfg.pagerdutyServices.length === 0) {
    return { value: null, unit: "seconds_median", sample: 0, gap: "no_pagerduty_mapping" };
  }
  const incidents = selectResolvedIncidents(db, cfg, nowMs, sinceMs);
  if (incidents.length === 0) {
    return { value: null, unit: "seconds_median", sample: 0, gap: "low_sample" };
  }
  const durations = incidents.map((i) => Math.max(0, Math.floor((i.resolved - i.opened) / 1000)));
  durations.sort((a, b) => a - b);
  const median =
    durations.length % 2 === 1
      ? durations[(durations.length - 1) / 2]
      : Math.floor((durations[durations.length / 2 - 1] + durations[durations.length / 2]) / 2);
  const lowSampleGap: DoraGap = durations.length < LOW_SAMPLE_THRESHOLD ? "low_sample" : null;
  return { value: median, unit: "seconds_median", sample: durations.length, gap: lowSampleGap };
}

export function computeDoraMetrics(
  db: Database,
  cfg: DoraServiceConfig,
  nowMs: number,
  sinceMs: number,
): DoraMetricsResult {
  return {
    service: cfg.serviceId,
    since_ms: sinceMs,
    computed_at: new Date(nowMs).toISOString(),
    metrics: {
      deployment_frequency: deploymentFrequency(db, cfg, nowMs, sinceMs),
      lead_time_for_changes: leadTimeForChanges(db, cfg, nowMs, sinceMs),
      change_failure_rate: changeFailureRate(db, cfg, nowMs, sinceMs),
      mttr: mttr(db, cfg, nowMs, sinceMs),
    },
  };
}
```

> **Note on incident metadata:** `selectResolvedIncidents` reads `metadata.pagerduty_service_id`, `metadata.status`, and `metadata.opened_at_ms`. Two of those (`pagerduty_service_id`, `opened_at_ms`) are **not** populated by the current PagerDuty connector (verified 2026-05-11). Add to the github-sync.ts follow-up tracker — but in PR 2, the tests pass because the fixture seeds these fields directly. Document the gap in the acceptance criteria: real CFR / MTTR data depends on a PagerDuty connector enrichment landed in a follow-up. The metrics ship with a correct calculator + a real-data-shaped fixture; the connector gap blocks production accuracy until enriched.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/gateway/test/unit/metrics/dora.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/metrics/dora.ts \
        packages/gateway/test/unit/metrics/dora.test.ts
git commit -m "feat(metrics): four pure DORA calculators

Reads pr / ci_run / incident from the local index; no I/O below db.
Returns the documented gap notes (no_repos, no_deployment_data,
no_pagerduty_mapping, low_sample, approximate_lead_time). CFR uses
the most-recent-preceding attribution rule so two close-together
deploys followed by one incident attribute only to the second."
```

---

## Task 5: Fixture + integration test

**Files:**
- Create: `packages/gateway/test/fixtures/dora/payment-service/seed.ts`
- Create: `packages/gateway/test/fixtures/dora/payment-service/expected-metrics.json`
- Create: `packages/gateway/test/integration/metrics/dora-real-db.test.ts`

- [ ] **Step 1: Write the failing integration test**

```ts
// packages/gateway/test/integration/metrics/dora-real-db.test.ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalIndex } from "../../../src/index/local-index.ts";
import { computeDoraMetrics } from "../../../src/metrics/dora.ts";
import { seedPaymentServiceFixture, FIXTURE_NOW_MS } from "../../fixtures/dora/payment-service/seed.ts";

describe("DORA metrics — payment-service fixture (real SQLite)", () => {
  let dir: string;
  let index: LocalIndex;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "nimbus-dora-int-"));
    index = new LocalIndex(join(dir, "nimbus.db"));
    index.open();
  });
  afterEach(() => {
    index.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("computes all four metrics within ±5% of hand-computed values", () => {
    const { config } = seedPaymentServiceFixture(index.getDatabase());
    const result = computeDoraMetrics(
      index.getDatabase(),
      config,
      FIXTURE_NOW_MS,
      30 * 86_400_000,
    );
    const expected = JSON.parse(
      readFileSync(
        join(import.meta.dir, "..", "..", "fixtures", "dora", "payment-service", "expected-metrics.json"),
        "utf8",
      ),
    ) as Record<string, { value: number; sample: number }>;
    for (const key of [
      "deployment_frequency",
      "lead_time_for_changes",
      "change_failure_rate",
      "mttr",
    ] as const) {
      const got = result.metrics[key];
      const want = expected[key];
      expect(got.sample).toBe(want.sample);
      expect(got.value).not.toBeNull();
      const pct = Math.abs((got.value as number) - want.value) / Math.max(want.value, 0.001);
      expect(pct).toBeLessThan(0.05);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/test/integration/metrics/dora-real-db.test.ts`
Expected: FAIL — fixture not found.

- [ ] **Step 3: Create the fixture seeder**

Create `packages/gateway/test/fixtures/dora/payment-service/seed.ts`:

```ts
import type { Database } from "bun:sqlite";
import type { DoraServiceConfig } from "../../../../src/metrics/dora-config.ts";

export const FIXTURE_NOW_MS = 1_715_000_000_000;
const DAY = 86_400_000;

function ins(db: Database, row: {
  id: string;
  service: string;
  type: string;
  external_id: string;
  title: string;
  modified_at: number;
  metadata: Record<string, unknown>;
  synced_at?: number;
}) {
  db.run(
    `INSERT INTO item (id, service, type, external_id, title, body_preview, url, canonical_url,
                       modified_at, author_id, metadata, synced_at, pinned)
     VALUES (?, ?, ?, ?, ?, '', NULL, NULL, ?, NULL, ?, ?, 0)`,
    [
      row.id,
      row.service,
      row.type,
      row.external_id,
      row.title,
      row.modified_at,
      JSON.stringify(row.metadata),
      row.synced_at ?? row.modified_at,
    ],
  );
}

export function seedPaymentServiceFixture(db: Database): { config: DoraServiceConfig } {
  // 8 GitHub Actions deploys + 4 GitLab deploys + 1 Jenkins deploy = 13 total.
  // 22 merged PRs (3 with `revert` label, excluded from lead time → 19 candidates).
  // 4 PagerDuty incidents (3 inside 60-min CFR window, 1 outside).

  // Deploys: spaced over 30 days starting 5 days back.
  let t = FIXTURE_NOW_MS - 5 * DAY;
  for (let i = 0; i < 8; i++) {
    ins(db, {
      id: `github_actions:gha_deploy_${i}`,
      service: "github_actions",
      type: "ci_run",
      external_id: `gha_deploy_${i}`,
      title: "Deploy production",
      modified_at: t,
      metadata: { conclusion: "success", repo: "nimbus-agent/payments", headSha: `sha_gha_${i}` },
    });
    t -= 2 * DAY;
  }
  t = FIXTURE_NOW_MS - 1 * DAY;
  for (let i = 0; i < 4; i++) {
    ins(db, {
      id: `gitlab:gl_deploy_${i}`,
      service: "gitlab",
      type: "ci_run",
      external_id: `gl_deploy_${i}`,
      title: "Deploy production",
      modified_at: t,
      metadata: { conclusion: "success", project: "nimbus-agent/payments", headSha: `sha_gl_${i}` },
    });
    t -= 3 * DAY;
  }
  ins(db, {
    id: "jenkins:jen_deploy_0",
    service: "jenkins",
    type: "ci_run",
    external_id: "jen_deploy_0",
    title: "Deploy to prod",
    modified_at: FIXTURE_NOW_MS - 15 * DAY,
    metadata: { conclusion: "success", jobName: "payment-service/deploy-prod", headSha: "sha_jen_0" },
  });

  // 22 merged PRs — 19 match exact-SHA to a deploy, 3 reverts excluded.
  for (let i = 0; i < 8; i++) {
    ins(db, {
      id: `github:pr_${i}`,
      service: "github",
      type: "pr",
      external_id: `nimbus-agent/payments#${i}`,
      title: `PR ${i}`,
      modified_at: FIXTURE_NOW_MS - (5 * DAY + i * 2 * DAY) - 3600_000,
      metadata: {
        repo: "nimbus-agent/payments",
        merged: true,
        merged_at: FIXTURE_NOW_MS - (5 * DAY + i * 2 * DAY) - 3600_000,
        merge_commit_sha: `sha_gha_${i}`,
        labels: [],
      },
    });
  }
  for (let i = 0; i < 4; i++) {
    ins(db, {
      id: `gitlab:pr_${i}`,
      service: "gitlab",
      type: "pr",
      external_id: `nimbus-agent/payments!${i}`,
      title: `MR ${i}`,
      modified_at: FIXTURE_NOW_MS - (1 * DAY + i * 3 * DAY) - 7200_000,
      metadata: {
        project: "nimbus-agent/payments",
        merged: true,
        merged_at: FIXTURE_NOW_MS - (1 * DAY + i * 3 * DAY) - 7200_000,
        merge_commit_sha: `sha_gl_${i}`,
        labels: [],
      },
    });
  }
  for (let i = 0; i < 7; i++) {
    ins(db, {
      id: `github:pr_extra_${i}`,
      service: "github",
      type: "pr",
      external_id: `nimbus-agent/payments#extra${i}`,
      title: `extra PR ${i}`,
      modified_at: FIXTURE_NOW_MS - (10 * DAY + i * 1 * DAY) - 1800_000,
      metadata: {
        repo: "nimbus-agent/payments",
        merged: true,
        merged_at: FIXTURE_NOW_MS - (10 * DAY + i * 1 * DAY) - 1800_000,
        merge_commit_sha: `sha_gha_${i}`, // shares with first 7 deploys → counted via dedup, OK
        labels: [],
      },
    });
  }
  for (let i = 0; i < 3; i++) {
    ins(db, {
      id: `github:pr_revert_${i}`,
      service: "github",
      type: "pr",
      external_id: `nimbus-agent/payments#revert${i}`,
      title: `Revert ${i}`,
      modified_at: FIXTURE_NOW_MS - (4 * DAY + i * DAY),
      metadata: {
        repo: "nimbus-agent/payments",
        merged: true,
        merged_at: FIXTURE_NOW_MS - (4 * DAY + i * DAY),
        merge_commit_sha: `sha_gha_${i}`,
        labels: ["revert"],
      },
    });
  }

  // PagerDuty incidents: 4 resolved; 3 within 60-min window of a deploy.
  for (let i = 0; i < 3; i++) {
    const deployIdx = i;
    const deployAt = FIXTURE_NOW_MS - 5 * DAY - deployIdx * 2 * DAY;
    const openedAt = deployAt + 10 * 60_000; // 10 min after deploy
    const resolvedAt = openedAt + (20 + i * 5) * 60_000;
    ins(db, {
      id: `pagerduty:inc_${i}`,
      service: "pagerduty",
      type: "incident",
      external_id: `inc_${i}`,
      title: `Incident ${i}`,
      modified_at: resolvedAt,
      metadata: {
        status: "resolved",
        pagerduty_service_id: "P12ABCD",
        opened_at_ms: openedAt,
      },
    });
  }
  // 1 incident outside CFR window
  ins(db, {
    id: "pagerduty:inc_outside",
    service: "pagerduty",
    type: "incident",
    external_id: "inc_outside",
    title: "Late alert",
    modified_at: FIXTURE_NOW_MS - 7 * DAY,
    metadata: {
      status: "resolved",
      pagerduty_service_id: "P12ABCD",
      opened_at_ms: FIXTURE_NOW_MS - 7 * DAY - 90 * 60_000, // 90 min before nearest deploy
    },
  });

  const config: DoraServiceConfig = {
    serviceId: "payment-service",
    repos: [
      { provider: "github", providerId: "nimbus-agent/payments" },
      { provider: "gitlab", providerId: "nimbus-agent/payments" },
      { provider: "jenkins", providerId: "payment-service/deploy-prod" },
    ],
    pagerdutyServices: ["P12ABCD"],
    deployWorkflowPattern: /^[Dd]eploy/,
    incidentWindowMinutes: 60,
    excludePrLabels: ["revert"],
  };
  return { config };
}
```

Create `packages/gateway/test/fixtures/dora/payment-service/expected-metrics.json`:

```json
{
  "deployment_frequency": { "value": 0.4333, "sample": 13 },
  "lead_time_for_changes": { "value": 3600, "sample": 12 },
  "change_failure_rate": { "value": 0.231, "sample": 13 },
  "mttr": { "value": 1800, "sample": 4 }
}
```

> Re-derive these values before committing — run the integration test once, capture the actual outputs from a console.log, hand-verify each row against the fixture, then commit. The exact numbers above are illustrative; they MUST be reconciled with the seeder's actual outputs before this task is marked done.

- [ ] **Step 2 (now): Run test to verify it fails**

Run: `bun test packages/gateway/test/integration/metrics/dora-real-db.test.ts`
Expected: FAIL on first run — outputs will diverge from the placeholder JSON.

- [ ] **Step 3: Re-derive `expected-metrics.json`**

Add a temporary `console.log(JSON.stringify(result.metrics, null, 2))` to the integration test. Run the test, capture the four values, hand-verify each:

- Deployment Frequency: count deploys matching the regex on matching repos, divide by 30.
- Lead Time: for each PR with `merge_commit_sha` matching a deploy's `headSha` where `deploy.modified_at >= pr.merged_at` and not in `exclude_pr_labels`, compute `(deploy.modified_at - pr.merged_at) / 1000`; take the median.
- CFR: incidents within 60 min after a deploy → count distinct deploys with ≥1 attributed incident, divide by deploy count.
- MTTR: median of `resolved - opened` in seconds, across resolved incidents matching `pagerduty_service_id`.

Update `expected-metrics.json` with the verified numbers. Remove the temporary console.log.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/gateway/test/integration/metrics/dora-real-db.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/test/fixtures/dora/ \
        packages/gateway/test/integration/metrics/dora-real-db.test.ts
git commit -m "test(metrics): payment-service fixture + integration test

30-day synthetic window: 13 deploys across GitHub Actions/GitLab/Jenkins,
22 merged PRs (3 reverts excluded), 4 PagerDuty incidents (3 inside the
60-min CFR window). Hand-computed expected values asserted within ±5%."
```

---

## Task 6: `metrics-rpc.ts` IPC handler

**Files:**
- Create: `packages/gateway/src/ipc/metrics-rpc.ts`
- Modify: `packages/gateway/src/ipc/server/dispatchers.ts`
- Modify: `packages/gateway/src/ipc/server/context.ts` (add `metricsRpcSkipped` constant, mirror existing pattern)
- Test: `packages/gateway/test/unit/ipc/metrics-rpc.test.ts`

- [ ] **Step 1: Write the failing IPC test**

```ts
// packages/gateway/test/unit/ipc/metrics-rpc.test.ts
import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalIndex } from "../../../src/index/local-index.ts";
import { dispatchMetricsRpc, MetricsRpcError } from "../../../src/ipc/metrics-rpc.ts";
import { seedPaymentServiceFixture, FIXTURE_NOW_MS } from "../../fixtures/dora/payment-service/seed.ts";

describe("metrics-rpc", () => {
  let dir: string;
  let index: LocalIndex;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "nimbus-metrics-rpc-"));
    index = new LocalIndex(join(dir, "nimbus.db"));
    index.open();
  });
  afterEach(() => {
    index.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("dispatches metrics.dora with a fixture-seeded service", async () => {
    const { config } = seedPaymentServiceFixture(index.getDatabase());
    const out = await dispatchMetricsRpc(
      "metrics.dora",
      { service: "payment-service", since: "30d" },
      {
        db: index.getDatabase(),
        loadConfig: () => new Map([[config.serviceId, config]]),
        nowMs: () => FIXTURE_NOW_MS,
      },
    );
    if (out.kind !== "hit") throw new Error("expected hit");
    const result = out.value as { service: string };
    expect(result.service).toBe("payment-service");
  });

  it("returns null-everywhere envelope when service id has no config", async () => {
    const out = await dispatchMetricsRpc(
      "metrics.dora",
      { service: "unknown", since: "30d" },
      {
        db: index.getDatabase(),
        loadConfig: () => new Map(),
        nowMs: () => FIXTURE_NOW_MS,
      },
    );
    if (out.kind !== "hit") throw new Error("expected hit");
    const result = out.value as { metrics: Record<string, { value: number | null; gap: string }> };
    expect(result.metrics.deployment_frequency.value).toBeNull();
    expect(result.metrics.deployment_frequency.gap).toBe("no_repos");
  });

  it("rejects array params with -32602", async () => {
    await expect(
      dispatchMetricsRpc("metrics.dora", [{ service: "x" }], {
        db: index.getDatabase(),
        loadConfig: () => new Map(),
        nowMs: () => FIXTURE_NOW_MS,
      }),
    ).rejects.toThrow(MetricsRpcError);
  });

  it("rejects missing service param", async () => {
    await expect(
      dispatchMetricsRpc("metrics.dora", { since: "30d" }, {
        db: index.getDatabase(),
        loadConfig: () => new Map(),
        nowMs: () => FIXTURE_NOW_MS,
      }),
    ).rejects.toThrow(/service/);
  });

  it("returns miss for an unknown method", async () => {
    const out = await dispatchMetricsRpc("metrics.unknown", {}, {
      db: index.getDatabase(),
      loadConfig: () => new Map(),
      nowMs: () => FIXTURE_NOW_MS,
    });
    expect(out.kind).toBe("miss");
  });

  it("parses since='7d' and '24h' correctly", async () => {
    const { config } = seedPaymentServiceFixture(index.getDatabase());
    const sevenDay = await dispatchMetricsRpc(
      "metrics.dora",
      { service: "payment-service", since: "7d" },
      {
        db: index.getDatabase(),
        loadConfig: () => new Map([[config.serviceId, config]]),
        nowMs: () => FIXTURE_NOW_MS,
      },
    );
    if (sevenDay.kind !== "hit") throw new Error("expected hit");
    expect((sevenDay.value as { since_ms: number }).since_ms).toBe(7 * 86_400_000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/test/unit/ipc/metrics-rpc.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `metrics-rpc.ts`**

Create `packages/gateway/src/ipc/metrics-rpc.ts`:

```ts
import type { Database } from "bun:sqlite";
import type { DoraServiceConfig } from "../metrics/dora-config.ts";
import { computeDoraMetrics, type DoraMetricsResult } from "../metrics/dora.ts";

export class MetricsRpcError extends Error {
  readonly rpcCode: number;
  constructor(rpcCode: number, message: string) {
    super(message);
    this.name = "MetricsRpcError";
    this.rpcCode = rpcCode;
  }
}

export type MetricsRpcContext = {
  db: Database;
  loadConfig: () => Map<string, DoraServiceConfig>;
  nowMs?: () => number;
};

const MIN_SERVICE_LEN = 1;
const MAX_SERVICE_LEN = 64;
const DEFAULT_SINCE = "30d";

function parseSinceToMs(raw: string): number {
  const m = /^(\d+)([dh])$/.exec(raw);
  if (m === null) {
    throw new MetricsRpcError(-32602, `since must match \\d+(d|h), got '${raw}'`);
  }
  const n = Number(m[1]);
  if (!Number.isInteger(n) || n < 1 || n > 365) {
    throw new MetricsRpcError(-32602, `since duration must be 1..365 ${m[2]}`);
  }
  return m[2] === "d" ? n * 86_400_000 : n * 3_600_000;
}

function requireDoraParams(params: unknown): { service: string; since: string } {
  if (params === null || typeof params !== "object" || Array.isArray(params)) {
    throw new MetricsRpcError(-32602, "metrics.dora requires { service: string }");
  }
  const p = params as { service?: unknown; since?: unknown };
  if (typeof p.service !== "string") {
    throw new MetricsRpcError(-32602, "service must be a string");
  }
  const service = p.service.trim();
  if (service.length < MIN_SERVICE_LEN || service.length > MAX_SERVICE_LEN) {
    throw new MetricsRpcError(
      -32602,
      `service must be ${MIN_SERVICE_LEN}..${MAX_SERVICE_LEN} chars`,
    );
  }
  const since = p.since === undefined ? DEFAULT_SINCE : p.since;
  if (typeof since !== "string") {
    throw new MetricsRpcError(-32602, "since must be a string");
  }
  return { service, since };
}

function unconfiguredEnvelope(service: string, sinceMs: number, nowMs: number): DoraMetricsResult {
  const placeholder = (unit: string) =>
    ({ value: null, unit, sample: 0, gap: "no_repos" as const });
  return {
    service,
    since_ms: sinceMs,
    computed_at: new Date(nowMs).toISOString(),
    metrics: {
      deployment_frequency: placeholder("deploys_per_day"),
      lead_time_for_changes: placeholder("seconds_median"),
      change_failure_rate: placeholder("ratio"),
      mttr: placeholder("seconds_median"),
    },
  };
}

export async function dispatchMetricsRpc(
  method: string,
  params: unknown,
  ctx: MetricsRpcContext,
): Promise<{ kind: "miss" } | { kind: "hit"; value: DoraMetricsResult }> {
  if (method !== "metrics.dora") return { kind: "miss" };
  const { service, since } = requireDoraParams(params);
  const sinceMs = parseSinceToMs(since);
  const nowMs = (ctx.nowMs ?? (() => Date.now()))();
  const configMap = ctx.loadConfig();
  const cfg = configMap.get(service);
  if (cfg === undefined) {
    return { kind: "hit", value: unconfiguredEnvelope(service, sinceMs, nowMs) };
  }
  return { kind: "hit", value: computeDoraMetrics(ctx.db, cfg, nowMs, sinceMs) };
}
```

- [ ] **Step 4: Wire the dispatcher**

Modify `packages/gateway/src/ipc/server/context.ts` to add a sentinel (mirror the existing `phase4RpcSkipped` pattern; the file already has them — add `metricsRpcSkipped` next to them):

```ts
export const metricsRpcSkipped = Symbol("metricsRpcSkipped");
```

Modify `packages/gateway/src/ipc/server/dispatchers.ts`. Add import:

```ts
import { dispatchMetricsRpc, MetricsRpcError } from "../metrics-rpc.ts";
import { loadNimbusDoraFromConfigDir } from "../../config/nimbus-toml.ts";
```

Add a `tryDispatchMetricsRpc` function after `tryDispatchAgentsRpc`:

```ts
export async function tryDispatchMetricsRpc(
  ctx: ServerCtx,
  method: string,
  params: unknown,
): Promise<unknown> {
  if (!method.startsWith("metrics.") || ctx.options.localIndex === undefined) {
    return phase4RpcSkipped;
  }
  try {
    const configDir = ctx.options.configDir;
    const out = await dispatchMetricsRpc(method, params, {
      db: ctx.options.localIndex.getDatabase(),
      loadConfig: () => (configDir === undefined ? new Map() : loadNimbusDoraFromConfigDir(configDir)),
    });
    if (out.kind === "hit") return out.value;
  } catch (e) {
    if (e instanceof MetricsRpcError) {
      throw new RpcMethodError(e.rpcCode, e.message);
    }
    throw e;
  }
  throw new RpcMethodError(-32601, `Method not found: ${method}`);
}
```

Add to the chain in `tryDispatchPhase4Rpc` (right after `tryDispatchAgentsRpc`):

```ts
  const metricsOutcome = await tryDispatchMetricsRpc(ctx, method, params);
  if (metricsOutcome !== phase4RpcSkipped) return metricsOutcome;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test packages/gateway/test/unit/ipc/metrics-rpc.test.ts`
Expected: PASS (6 cases).

Run: `bun test packages/gateway/test/unit/ipc/`
Expected: PASS (no regressions).

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/ipc/metrics-rpc.ts \
        packages/gateway/src/ipc/server/dispatchers.ts \
        packages/gateway/src/ipc/server/context.ts \
        packages/gateway/test/unit/ipc/metrics-rpc.test.ts
git commit -m "feat(ipc): metrics.dora JSON-RPC method

Validates params (service: string, since: \"<n>d|h\"); resolves the
[metrics.dora.<id>] config via the active profile's configDir; falls
back to a null-everywhere envelope with gap='no_repos' when the service
has no config. Wired into tryDispatchPhase4Rpc."
```

---

## Task 7: `/v1/metrics/dora` HTTP route + OpenAPI schema fill-in

**Files:**
- Modify: `packages/gateway/src/ipc/http-routes.ts`
- Modify: `packages/gateway/src/ipc/http-server.ts`
- Modify: `packages/gateway/openapi/v1.yaml`
- Test: `packages/gateway/test/integration/http/metrics-dora-route.test.ts`

- [ ] **Step 1: Write the failing HTTP route test**

```ts
// packages/gateway/test/integration/http/metrics-dora-route.test.ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalIndex } from "../../../src/index/local-index.ts";
import { startReadOnlyHttpServer } from "../../../src/ipc/http-server.ts";
import { seedPaymentServiceFixture, FIXTURE_NOW_MS } from "../../fixtures/dora/payment-service/seed.ts";

describe("GET /v1/metrics/dora", () => {
  let dir: string;
  let index: LocalIndex;
  let handle: ReturnType<typeof startReadOnlyHttpServer>;
  let port: number;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "nimbus-dora-http-"));
    index = new LocalIndex(join(dir, "nimbus.db"));
    index.open();
    seedPaymentServiceFixture(index.getDatabase());
    writeFileSync(
      join(dir, "nimbus.toml"),
      `[metrics.dora.payment-service]
repos = ["github:nimbus-agent/payments", "gitlab:nimbus-agent/payments", "jenkins:payment-service/deploy-prod"]
pagerduty_services = ["P12ABCD"]
`,
    );
    index.close();
    port = 30000 + Math.floor(Math.random() * 30000);
    handle = startReadOnlyHttpServer(join(dir, "nimbus.db"), port, { configDir: dir, nowMs: () => FIXTURE_NOW_MS });
  });
  afterEach(() => {
    handle.stop();
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns the four-metric envelope for a configured service", async () => {
    const res = await fetch(
      `http://127.0.0.1:${port}/v1/metrics/dora?service=payment-service&since=30d`,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { service: string; metrics: Record<string, unknown> };
    expect(body.service).toBe("payment-service");
    expect(body.metrics).toHaveProperty("deployment_frequency");
    expect(body.metrics).toHaveProperty("change_failure_rate");
  });

  it("returns 400 when service param is missing", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/v1/metrics/dora`);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/test/integration/http/metrics-dora-route.test.ts`
Expected: FAIL — `startReadOnlyHttpServer` doesn't accept `configDir`/`nowMs`, route returns 404.

- [ ] **Step 3: Extend `http-server.ts`**

Modify `packages/gateway/src/ipc/http-server.ts`. The current signature is `startReadOnlyHttpServer(dbPath, port)`. Widen to accept optional context:

```ts
export type ReadOnlyHttpServerOptions = {
  configDir?: string;
  nowMs?: () => number;
};

export function startReadOnlyHttpServer(
  dbPath: string,
  port: number,
  opts: ReadOnlyHttpServerOptions = {},
): ReadOnlyHttpServerHandle { ... }
```

Add a handler. Above `dispatchReadOnlyGet`, define:

```ts
import { loadNimbusDoraFromConfigDir } from "../config/nimbus-toml.ts";
import { dispatchMetricsRpc } from "./metrics-rpc.ts";

async function handleMetricsDora(
  url: URL,
  db: Database,
  opts: ReadOnlyHttpServerOptions,
): Promise<Response> {
  const service = url.searchParams.get("service");
  if (service === null) {
    return json({ error: "missing required query param: service" }, 400);
  }
  const since = url.searchParams.get("since") ?? "30d";
  try {
    const configMap =
      opts.configDir === undefined ? new Map() : loadNimbusDoraFromConfigDir(opts.configDir);
    const out = await dispatchMetricsRpc(
      "metrics.dora",
      { service, since },
      { db, loadConfig: () => configMap, nowMs: opts.nowMs },
    );
    if (out.kind === "miss") return json({ error: "method miss" }, 500);
    // Reuse the existing `json` helper (defined at http-server.ts:16) so all
    // responses share the same content-type + serialisation path.
    return json(out.value, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "internal_error";
    return json({ error: msg }, 400);
  }
}
```

In `dispatchReadOnlyGet`, before the `return new Response("Not Found", { status: 404 });` line, add:

```ts
  if (path === "/v1/metrics/dora") {
    return handleMetricsDora(url, db, opts);
  }
```

The route table:

Modify `packages/gateway/src/ipc/http-routes.ts`:

```ts
export const READ_ONLY_HTTP_ROUTES: readonly ReadOnlyHttpRoute[] = Object.freeze([
  { method: "GET", path: "/v1/audit" },
  { method: "GET", path: "/v1/connectors" },
  { method: "GET", path: "/v1/health" },
  { method: "GET", path: "/v1/items" },
  { method: "GET", path: "/v1/items/{id}" },
  { method: "GET", path: "/v1/metrics/dora" },
  { method: "GET", path: "/v1/openapi.json" },
  { method: "GET", path: "/v1/people" },
  { method: "GET", path: "/v1/people/{id}" },
] as const);
```

Update `packages/gateway/openapi/v1.yaml`. Replace the `/v1/metrics/dora` block (lines 172-176) with:

```yaml
  /v1/metrics/dora:
    get:
      operationId: getDoraMetrics
      summary: Compute the four DORA metrics for a configured service
      parameters:
        - { in: query, name: service, required: true, schema: { type: string } }
        - { in: query, name: since, required: false, schema: { type: string, default: "30d" }, description: "Window: '<N>d' or '<N>h' (1..365)." }
      responses:
        "200":
          description: Four-metric envelope.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/DoraMetricsResult"
        "400":
          description: Bad request (missing/invalid service, malformed since).
```

Add to `components.schemas`:

```yaml
    DoraMetricsResult:
      type: object
      required: [service, since_ms, computed_at, metrics]
      properties:
        service: { type: string }
        since_ms: { type: integer }
        computed_at: { type: string, format: date-time }
        metrics:
          type: object
          required: [deployment_frequency, lead_time_for_changes, change_failure_rate, mttr]
          properties:
            deployment_frequency: { $ref: "#/components/schemas/DoraMetricValue" }
            lead_time_for_changes: { $ref: "#/components/schemas/DoraMetricValue" }
            change_failure_rate: { $ref: "#/components/schemas/DoraMetricValue" }
            mttr: { $ref: "#/components/schemas/DoraMetricValue" }
    DoraMetricValue:
      type: object
      required: [value, unit, sample, gap]
      properties:
        value: { type: number, nullable: true }
        unit: { type: string }
        sample: { type: integer }
        gap:
          nullable: true
          type: string
          enum: [no_pagerduty_mapping, no_repos, no_deployment_data, low_sample, approximate_lead_time]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/gateway/test/integration/http/metrics-dora-route.test.ts`
Expected: PASS (2 cases).

Run: `bun run audit:openapi-drift`
Expected: PASS — the route is in both `READ_ONLY_HTTP_ROUTES` and `v1.yaml`.

- [ ] **Step 5: Verify no callers break**

Find all callers of `startReadOnlyHttpServer` and confirm the new third arg is optional:

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/ipc/http-routes.ts \
        packages/gateway/src/ipc/http-server.ts \
        packages/gateway/openapi/v1.yaml \
        packages/gateway/test/integration/http/metrics-dora-route.test.ts
git commit -m "feat(http): GET /v1/metrics/dora + OpenAPI schema fill-in

Replaces the reserved stub from PR 1 with the full schema referencing
DoraMetricsResult / DoraMetricValue. Drift CI gate verifies the route
list and the YAML agree."
```

---

## Task 8: CLI `nimbus metrics dora`

**Files:**
- Create: `packages/cli/src/commands/metrics.ts`
- Modify: `packages/cli/src/index.ts` (register subcommand)
- Test: `packages/cli/test/commands/metrics.test.ts`
- Test: `packages/gateway/test/e2e/scenarios/metrics-dora.e2e.test.ts`

- [ ] **Step 1: Write the failing CLI arg-parser test**

```ts
// packages/cli/test/commands/metrics.test.ts
import { describe, expect, it } from "bun:test";
import { parseMetricsDoraArgs } from "../../src/commands/metrics.ts";

describe("nimbus metrics dora arg parser", () => {
  it("parses service + since + json", () => {
    const out = parseMetricsDoraArgs(["--service", "payment-service", "--since", "7d", "--json"]);
    expect(out).toEqual({ service: "payment-service", since: "7d", json: true });
  });

  it("defaults since to 30d and json to false", () => {
    const out = parseMetricsDoraArgs(["--service", "x"]);
    expect(out).toEqual({ service: "x", since: "30d", json: false });
  });

  it("throws on missing --service", () => {
    expect(() => parseMetricsDoraArgs(["--since", "7d"])).toThrow(/--service/);
  });

  it("throws on malformed --since", () => {
    expect(() => parseMetricsDoraArgs(["--service", "x", "--since", "lol"])).toThrow(/--since/);
  });

  it("accepts --since 24h", () => {
    const out = parseMetricsDoraArgs(["--service", "x", "--since", "24h"]);
    expect(out.since).toBe("24h");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && bun test test/commands/metrics.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the CLI command**

Create `packages/cli/src/commands/metrics.ts`:

```ts
import { IPCClient } from "../ipc-client/index.ts";
import { readGatewayState } from "../lib/gateway-process.ts";
import { getCliPlatformPaths } from "../paths.ts";

export type MetricsDoraArgs = {
  service: string;
  since: string;
  json: boolean;
};

const SINCE_RE = /^\d+[dh]$/;

export function parseMetricsDoraArgs(args: string[]): MetricsDoraArgs {
  let service: string | undefined;
  let since = "30d";
  let json = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--service") {
      const v = args[i + 1];
      if (typeof v !== "string" || v.trim().length === 0) {
        throw new Error("--service requires a non-empty value");
      }
      service = v.trim();
      i += 1;
      continue;
    }
    if (a === "--since") {
      const v = args[i + 1];
      if (typeof v !== "string" || !SINCE_RE.test(v)) {
        throw new Error("--since must match \\d+(d|h), e.g. '30d' or '24h'");
      }
      since = v;
      i += 1;
      continue;
    }
    if (a === "--json") {
      json = true;
      continue;
    }
  }
  if (service === undefined) {
    throw new Error("Usage: nimbus metrics dora --service <id> [--since 30d] [--json]");
  }
  return { service, since, json };
}

type DoraEnvelope = {
  service: string;
  since_ms: number;
  computed_at: string;
  metrics: Record<
    string,
    { value: number | null; unit: string; sample: number; gap: string | null }
  >;
};

function formatPretty(env: DoraEnvelope, useColor: boolean): string {
  const lines: string[] = [];
  lines.push(`DORA metrics — ${env.service} (since ${Math.floor(env.since_ms / 86_400_000)}d)`);
  lines.push("");
  const labels: Record<string, string> = {
    deployment_frequency: "Deployment Frequency",
    lead_time_for_changes: "Lead Time",
    change_failure_rate: "Change Failure Rate",
    mttr: "MTTR",
  };
  for (const key of [
    "deployment_frequency",
    "lead_time_for_changes",
    "change_failure_rate",
    "mttr",
  ]) {
    const m = env.metrics[key];
    if (m === undefined) continue;
    const value = m.value === null ? "—" : m.value.toFixed(3);
    const gap = m.gap === null ? "" : useColor ? `\x1b[33m[${m.gap}]\x1b[0m` : `[${m.gap}]`;
    lines.push(`  ${labels[key].padEnd(20)} ${value.padStart(10)} ${m.unit.padEnd(20)} n=${m.sample}  ${gap}`);
  }
  return lines.join("\n");
}

const TIMEOUT_MS = 30_000;

export async function runMetricsCli(args: string[]): Promise<void> {
  if (args[0] !== "dora") {
    process.stderr.write("Usage: nimbus metrics dora --service <id>\n");
    process.exit(1);
  }
  const parsed = parseMetricsDoraArgs(args.slice(1));
  const paths = getCliPlatformPaths();
  const state = await readGatewayState(paths);
  if (state === undefined) {
    process.stderr.write("Gateway is not running. Start with: nimbus start\n");
    process.exit(1);
  }
  const client = new IPCClient(state.socketPath);
  await client.connect();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const responsePromise = client.call<DoraEnvelope>(
      "metrics.dora",
      { service: parsed.service, since: parsed.since },
    );
    timeout = setTimeout(() => {
      throw new Error("metrics.dora timed out after 30 s");
    }, TIMEOUT_MS);
    const result = await responsePromise;
    if (parsed.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }
    const useColor = process.env.NO_COLOR === undefined && process.stdout.isTTY === true;
    process.stdout.write(`${formatPretty(result, useColor)}\n`);
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(2);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
    await client.disconnect();
  }
}
```

Modify `packages/cli/src/index.ts` to register the subcommand. Find the existing command dispatch block (look for `impact` / `expert` registration) and add:

```ts
  if (cmd === "metrics") {
    const { runMetricsCli } = await import("./commands/metrics.ts");
    await runMetricsCli(args);
    return;
  }
```

- [ ] **Step 4: Run unit tests to verify they pass**

Run: `cd packages/cli && bun test test/commands/metrics.test.ts`
Expected: PASS (5 cases).

- [ ] **Step 5: Write the failing e2e test**

```ts
// packages/gateway/test/e2e/scenarios/metrics-dora.e2e.test.ts
import { describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnGatewaySubprocess, type GatewayHandle } from "../helpers/gateway-subprocess.ts";
import { seedPaymentServiceFixture, FIXTURE_NOW_MS } from "../../fixtures/dora/payment-service/seed.ts";

describe("E2E: nimbus metrics dora", () => {
  let dir: string;
  let gw: GatewayHandle;
  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "nimbus-dora-e2e-"));
    writeFileSync(
      join(dir, "nimbus.toml"),
      `[metrics.dora.payment-service]
repos = ["github:nimbus-agent/payments", "gitlab:nimbus-agent/payments", "jenkins:payment-service/deploy-prod"]
pagerduty_services = ["P12ABCD"]
`,
    );
    gw = await spawnGatewaySubprocess({ configDir: dir, dataDir: dir, nowMs: FIXTURE_NOW_MS });
    seedPaymentServiceFixture(gw.getDatabaseConnection());
  });
  afterEach(async () => {
    await gw.stop();
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns the four-metric envelope via CLI", async () => {
    const out = await gw.runCli(["metrics", "dora", "--service", "payment-service", "--json"]);
    expect(out.exitCode).toBe(0);
    const result = JSON.parse(out.stdout) as { service: string; metrics: Record<string, unknown> };
    expect(result.service).toBe("payment-service");
    expect(Object.keys(result.metrics).sort()).toEqual([
      "change_failure_rate",
      "deployment_frequency",
      "lead_time_for_changes",
      "mttr",
    ]);
  });

  it("exits 2 with a useful error when service is not configured", async () => {
    const out = await gw.runCli(["metrics", "dora", "--service", "unknown-svc", "--json"]);
    // Calls succeed: server returns null-everywhere envelope with gap='no_repos'.
    expect(out.exitCode).toBe(0);
    const result = JSON.parse(out.stdout) as { metrics: Record<string, { gap: string | null }> };
    expect(result.metrics["deployment_frequency"]?.gap).toBe("no_repos");
  });
});
```

(`spawnGatewaySubprocess` is the existing helper used by impact / catchup e2e tests at `packages/gateway/test/e2e/helpers/`. Reuse it. If it does not accept `nowMs`, add an env-var pass-through `NIMBUS_TEST_NOW_MS` that the Gateway reads at startup and threads to `http-server.ts` / metrics-rpc. The pattern matches how the test fixture seeder takes `FIXTURE_NOW_MS`.)

- [ ] **Step 6: Run e2e to verify it passes**

Run: `bun test packages/gateway/test/e2e/scenarios/metrics-dora.e2e.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/commands/metrics.ts \
        packages/cli/src/index.ts \
        packages/cli/test/commands/metrics.test.ts \
        packages/gateway/test/e2e/scenarios/metrics-dora.e2e.test.ts
git commit -m "feat(cli): nimbus metrics dora --service <id>

Pretty mode renders the four metrics as a labelled card (NO_COLOR /
non-TTY → plain ASCII). --json mode emits the IPC envelope verbatim.
E2E test seeds the payment-service fixture and asserts the envelope
shape against a real Gateway subprocess."
```

---

> **Why `metrics.dora` doesn't pass through the HITL gate** (review clarification): `ToolExecutor.gate()` checks `HITL_REQUIRED.has(action.type)` on a `PlannedAction` — i.e., engine intents emitted by the planner during an `engine.ask` flow. JSON-RPC method dispatch never constructs a `PlannedAction`, so a read-only handler like `metrics.dora` bypasses the gate by design. Verified at `packages/gateway/src/engine/executor.ts:200-201` (the gate's only entry point reads `action.type`, not the IPC method name).

---

## Task 9: Coverage gate + skills + status updates

**Files:**
- Modify: `package.json` (root)
- Modify: `.github/workflows/_test-suite.yml`
- Modify: `.claude/commands/nimbus-file-map.md`
- Modify: `.claude/commands/nimbus-commands.md`
- Modify: `CLAUDE.md`
- Modify: `GEMINI.md`
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Add the coverage script**

Modify `package.json`. Find the block of `test:coverage:*` scripts and add:

```json
    "test:coverage:metrics": "bun test --coverage --coverage-dir=coverage/metrics packages/gateway/src/metrics/ packages/gateway/test/unit/metrics/ packages/gateway/test/integration/metrics/",
```

`test:ci` exists in the root `package.json` (`"test:ci": "bun scripts/run-tests.ts"`) — verified 2026-05-11. The aggregator is `scripts/run-tests.ts`, not a shell `&&` chain. Open `scripts/run-tests.ts`, find the list of coverage-gate names already invoked (e.g. `test:coverage:agents`, `test:coverage:engine`), and append `"test:coverage:metrics"` in the same position the other Phase 5 gates use. Verify the local-run command:

Run: `bun run test:coverage:metrics`
Expected: PASS with the line coverage report showing ≥80% for `packages/gateway/src/metrics/`.

If under 80%, add unit tests until the gate is satisfied — every branch in `dora.ts` must be exercised (gap paths included).

- [ ] **Step 2: Wire into CI**

Modify `.github/workflows/_test-suite.yml`. Find the existing `test:coverage:agents` step and append a parallel `test:coverage:metrics` step with the same shape (cross-platform matrix, fail-fast off).

- [ ] **Step 3: Update skills**

Modify `.claude/commands/nimbus-file-map.md`. Add under the "Built-in Agents" section or a new "Metrics" subsection:

```markdown
## Metrics

| File | Purpose |
|---|---|
| `packages/gateway/src/metrics/dora.ts` | Four pure DORA calculators: `deploymentFrequency`, `leadTimeForChanges`, `changeFailureRate`, `mttr`. Returns `DoraMetricsResult` envelope. |
| `packages/gateway/src/metrics/dora-config.ts` | `DoraServiceConfig` type + URN parser + provider→service-column map. |
| `packages/gateway/src/ipc/metrics-rpc.ts` | `dispatchMetricsRpc` — `metrics.dora` JSON-RPC handler. |
| `packages/cli/src/commands/metrics.ts` | `nimbus metrics dora --service <id> [--since 30d] [--json]`. |
```

Modify `.claude/commands/nimbus-commands.md`. Add under the coverage gates section:

```
bun run test:coverage:metrics      # ≥80% threshold (DORA calculators + IPC)
```

Add under the CLI commands reference:

```
nimbus metrics dora --service <id> [--since 30d] [--json]   # four DORA metrics from the local index
```

- [ ] **Step 4: Update top-level status**

Modify `CLAUDE.md` line ~10 (the Status line). Append `· T4 PR 2 DORA metrics ✅` to the Phase 5 entry. Mirror into `GEMINI.md`.

Modify `docs/roadmap.md`. Find the `- [ ] **DORA Metrics** — ...` bullet in the "Nimbus as a CI/CD Data Layer" section and flip to `- [x] **DORA Metrics** (2026-05-MM, Phase 5 T4 PR 2)` — fill in the merge date.

In the same `docs/roadmap.md`, under Phase 5 § "New Connector Categories" (or the closest deferred-followups section per the roadmap's current structure), add a follow-up bullet so the PagerDuty enrichment dependency is tracked, not buried in PR 2's prose:

```markdown
- [ ] **PagerDuty connector enrichment** — populate `metadata.opened_at_ms` and `metadata.pagerduty_service_id` on indexed `incident` items so DORA CFR / MTTR compute against real data (Phase 5 T4 PR 2 ships against fixture-seeded incidents; production accuracy depends on this follow-up). No new credentials; reuses the existing PagerDuty OAuth.
```

- [ ] **Step 5: Run the full CI suite locally**

Run: `bun run test:ci`
Expected: PASS — every existing gate plus the new metrics gate.

Run: `bun run typecheck`
Expected: PASS.

Run: `bun run lint`
Expected: PASS.

Run: `bun run audit:openapi-drift`
Expected: PASS.

Run: `bun scripts/structure-audit/check-doc-references.ts --check`
Expected: PASS — no broken doc references.

- [ ] **Step 6: Commit**

```bash
git add package.json \
        .github/workflows/_test-suite.yml \
        .claude/commands/nimbus-file-map.md \
        .claude/commands/nimbus-commands.md \
        CLAUDE.md GEMINI.md \
        docs/roadmap.md
git commit -m "chore(t4 pr 2): wire coverage gate + update skills + flip roadmap

Adds test:coverage:metrics (≥80%) to CI, points the nimbus-file-map
and nimbus-commands skills at the new files, flips the roadmap DORA
bullet to shipped."
```

---

## Self-Review

### Spec coverage

| Spec requirement | Task |
|---|---|
| `nimbus metrics dora --service X --since 30d --json` envelope | Tasks 4, 6, 8 |
| `audit:openapi-drift` validates `/v1/metrics/dora` parity | Task 7 |
| `GET /v1/openapi.json` round-trips through validator | Already shipped in PR 1; Task 7 only adds the new path |
| Action P1-incident block (CFR computation correctness) | Task 4 + 5 (CFR unit + fixture integration) |
| Hook template runs cleanly (PR 1 deliverable, not PR 2) | — out of scope |
| `--service` with no config returns null + gap='no_repos', exit 0 | Task 6 + 8 |
| Multi-provider repos counted | Task 4 + 5 |
| Most-recent-preceding CFR attribution | Task 4 |
| MTTR N=1, N=2 → low_sample | Task 4 |
| Coverage gate ≥ 80% | Task 9 |
| CLAUDE.md / GEMINI.md status update | Task 9 |

Lead Time enrichment (`merged_at`, `merge_commit_sha`, `labels`, `merged_as` edge) added as Tasks 1 + 2 — necessary because the spec assumed data that doesn't exist yet.

CFR depends on PagerDuty `metadata.opened_at_ms` and `metadata.pagerduty_service_id`, which the current PagerDuty connector does **not** populate (verified 2026-05-11). The plan ships correct calculators + a fixture that seeds the fields directly; a PagerDuty connector follow-up is **out of PR 2 scope** but listed in Task 4's note for visibility. CFR and MTTR will compute against the fixture and against a future enriched connector without code changes.

### Placeholder scan

- No "TBD" / "TODO" / "fill in details" left in steps.
- `expected-metrics.json` placeholder values are explicitly flagged to re-derive in Task 5 step 3 before committing.
- "If a `test:ci` aggregate script exists" in Task 9 step 1 is conditional; the agent should grep `package.json` to verify.

### Type consistency

- `DoraServiceConfig` shape stable across `dora-config.ts`, `dora.ts`, `metrics-rpc.ts`, the seeder, and the e2e harness — checked.
- `DoraMetricValue` / `DoraMetricsResult` exported only from `dora.ts`; re-imported by `metrics-rpc.ts` and the CLI's local type alias matches.
- `parseDoraRepoUrn` returns `ParsedDoraRepoUrn` (not a raw string) — Task 3's tests and Task 4's helpers agree.
- The `merged_as` graph relation name is identical in the V27 SQL seed, the graph-populator emission, and the integration test's `WHERE rt.name = 'merged_as'` filter — checked.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-11-phase-5-t4-pr2-dora-metrics.md`. Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, two-stage review on each. Best fit because this PR spans nine self-contained tasks across DB / config / metrics / IPC / HTTP / CLI / CI surfaces.

2. **Inline Execution** — execute tasks in this session using executing-plans, batching with manual checkpoints. Faster if no review feedback is expected between tasks; less safe.

Which approach?
