# Phase 5 T4 PR 3a — Pre-Deploy Index Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `nimbus deploy preflight --service <id> --target-ref <branch>` end-to-end (CLI → `deploy.preflight` IPC → `GET /v1/preflight/deploy` → pure calculator over `pr` / `ci_run` / `incident` items) plus a first-party `nimbus-agent/query-action` GitHub Action that wraps the HTTP endpoint.

**Architecture:** Pure-SELECT calculator in `packages/gateway/src/preflight/preflight.ts` reads from the existing local index. Reuses `[metrics.dora.<id>]` config (renaming `DoraServiceConfig` to `ServiceConfig` with a back-compat alias) and adds a new `[ci.service.<id>]` block parser. New IPC method `deploy.preflight` + new HTTP route `GET /v1/preflight/deploy` + new CLI `nimbus deploy preflight`. The GitHub Action is a thin JS wrapper that calls the HTTP endpoint and sets exit code based on operator-chosen `mode`.

**Tech Stack:** Bun v1.2+, TypeScript 6.x strict, `bun:sqlite`, hand-written TOML parser pattern (already in `nimbus-toml.ts`), `js-yaml` (already in T4 PR 1), the existing `[Bun.serve]` HTTP server, JSON-RPC 2.0 over Unix socket / named pipe, Node 20 for the GitHub Action runtime.

**Source spec:** [`docs/superpowers/specs/2026-05-12-phase-5-t4-pr3a-preflight-design.md`](../specs/2026-05-12-phase-5-t4-pr3a-preflight-design.md). The review-disposition table at §12 is the authoritative resolution for each Gemini-CLI review item; the FIX dispositions are baked into the tasks below.

---

## File Structure

### Files created

| Path | Responsibility |
|---|---|
| `packages/gateway/src/preflight/preflight.ts` | Pure preflight calculator: three checks (active P1 incidents, failing CI on target ref, open PRs with merge conflicts), verdict rule (count-only — gaps are informational), `computeDeployPreflight` wrapper. SELECT-only against `item`. |
| `packages/gateway/src/ipc/preflight-rpc.ts` | `dispatchPreflightRpc` + `PreflightRpcError`. Validates params, calls calculator, emits the envelope. Same shape as `metrics-rpc.ts`. |
| `packages/gateway/test/fixtures/preflight/payment-service/seed.ts` | Programmatic fixture seeder: 2 P1 incidents (1 resolved, 1 triggered), 4 failing CI runs (2 on target_ref, 2 on other branches), 3 open PRs (1 dirty, 1 clean, 1 with null mergeable_state). |
| `packages/gateway/test/fixtures/preflight/payment-service/expected-envelope.json` | Hand-computed expected `DeployPreflightResult` for the fixture window. |
| `packages/gateway/test/unit/preflight/preflight.test.ts` | Per-check unit tests covering every gap branch + verdict ok/warn boundaries. |
| `packages/gateway/test/unit/config/ci-service-toml.test.ts` | `[ci.service.<id>]` alias parser tests + same-id conflict rule. |
| `packages/gateway/test/unit/connectors/github-sync-mergeable.test.ts` | `extractPrMetadataForIndex` captures `mergeable_state` + freshness/concurrency contract tests. |
| `packages/gateway/test/integration/preflight/preflight-real-db.test.ts` | Fresh SQLite + fixture + assert envelope matches expected exactly. |
| `packages/gateway/test/unit/ipc/preflight-rpc.test.ts` | Method dispatch + param validation. |
| `packages/gateway/test/integration/http/preflight-deploy-route.test.ts` | `GET /v1/preflight/deploy` round-trip + 400 missing-service + generic 500 on internal error. |
| `packages/cli/src/commands/deploy.ts` | `nimbus deploy preflight --service X [--target-ref Y] [--mode warn\|block\|off] [--json]`. Pretty card + JSON modes; respects `NO_COLOR`. |
| `packages/cli/src/commands/deploy.test.ts` | CLI arg parser tests. |
| `packages/cli/test/e2e/deploy.smoke.e2e.test.ts` | No-Gateway smoke (gateway not running, missing args, unknown mode, help integration). |
| `packages/gateway/test/e2e/scenarios/preflight-deploy.e2e.test.ts` | In-process e2e: fixture-seeded service → IPC → envelope assertion. |
| `packages/github-actions/preflight-query/action.yml` | Action manifest (inputs/outputs/runs). |
| `packages/github-actions/preflight-query/package.json` | `@nimbus-dev/action-preflight` (private, published-via-tag). |
| `packages/github-actions/preflight-query/src/main.ts` | Action entry: fetches the HTTP endpoint, renders, sets exit code per mode. |
| `packages/github-actions/preflight-query/src/render.ts` | Envelope → annotation list + summary markdown. |
| `packages/github-actions/preflight-query/src/render.test.ts` | Pure rendering tests. |
| `packages/github-actions/preflight-query/src/main.test.ts` | Mock-fetch exit-code per mode. |
| `packages/github-actions/preflight-query/dist/index.js` | Bundled, committed. GH Actions runtime requirement. |
| `packages/github-actions/preflight-query/README.md` | Usage examples + minimum-Gateway version. |

### Files modified

| Path | Change |
|---|---|
| `packages/gateway/src/metrics/dora-config.ts` | Rename `DoraServiceConfig` → `ServiceConfig`; export `DoraServiceConfig` as a type alias for back-compat. |
| `packages/gateway/src/config/nimbus-toml.ts` | Add `parseNimbusCiServiceToml` + `loadNimbusServiceConfigsFromConfigDir` (unions `[metrics.dora.<id>]` + `[ci.service.<id>]`); conflict-rule: `[ci.service.<id>]` wins with a startup warning. |
| `packages/gateway/src/connectors/github-sync.ts` | Extend `extractPrMetadataForIndex` to capture `mergeable` + `mergeable_state`; add detail-fetch path for open PRs whose state is missing or stale (7d window / 24h freshness). |
| `packages/gateway/src/ipc/server/context.ts` | Add `preflightRpcSkipped` sentinel. |
| `packages/gateway/src/ipc/server/dispatchers.ts` | Wire `tryDispatchPreflightRpc` into `tryDispatchPhase4Rpc` after `tryDispatchMetricsRpc`. |
| `packages/gateway/src/ipc/http-server.ts` | Add `handleDeployPreflight` + route dispatch. Reuses `ReadOnlyHttpServerOptions` from the T4 PR 2 fix. |
| `packages/gateway/src/ipc/http-routes.ts` | Append `{ method: "GET", path: "/v1/preflight/deploy" }` alphabetically. |
| `packages/gateway/src/ipc/http-routes.test.ts` | Bump expected route list. |
| `packages/gateway/openapi/v1.yaml` | Add `/v1/preflight/deploy` operation + `DeployPreflightResult` + `PreflightCheck*` + `*Finding` component schemas. |
| `packages/cli/src/index.ts` | Register `deploy` subcommand. |
| `packages/cli/src/commands/help.ts` | Add `nimbus deploy preflight` to help output. |
| `packages/cli/src/commands/registry.ts` | Register the CLI command (PR 258 pattern). |
| `package.json` (root) | Add `test:coverage:preflight` script. |
| `scripts/lib/ci-tests.ts` | Append `test:coverage:preflight` to the coverage-gates array. |
| `.github/workflows/_test-suite.yml` | Add `Preflight → test:coverage:preflight` matrix entry. |
| `.claude/commands/nimbus-file-map.md` | Add preflight files to the Metrics section (rename to "Metrics + CI/CD"). |
| `.claude/commands/nimbus-commands.md` | Add `test:coverage:preflight` and `nimbus deploy preflight` references. |
| `CLAUDE.md` + `GEMINI.md` | Append `· T4 PR 3a pre-deploy check ✅` to status line. |
| `docs/roadmap.md` | Flip "Pre-deploy index check" bullet to `[x]`. |

---

## Task 1: Rename `DoraServiceConfig` → `ServiceConfig` + `[ci.service.<id>]` TOML alias

**Files:**
- Modify: `packages/gateway/src/metrics/dora-config.ts`
- Modify: `packages/gateway/src/config/nimbus-toml.ts` (append at end alongside existing DORA loaders)
- Test: `packages/gateway/test/unit/config/ci-service-toml.test.ts`

- [ ] **Step 1: Write the failing alias-parser test**

Create `packages/gateway/test/unit/config/ci-service-toml.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import {
  loadNimbusServiceConfigsFromConfigDir,
  parseNimbusCiServiceToml,
  parseNimbusDoraToml,
} from "../../../src/config/nimbus-toml.ts";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("[ci.service.<id>] alias parser", () => {
  it("parses one service entry with all keys", () => {
    const raw = `
[ci.service.payment-service]
repos = ["github:nimbus-agent/payments"]
pagerduty_services = ["P12ABCD"]
deploy_workflow_pattern = "^Release"
incident_window_minutes = 90
exclude_pr_labels = ["revert", "rollback"]
`;
    const parsed = parseNimbusCiServiceToml(raw);
    expect(parsed.size).toBe(1);
    const cfg = parsed.get("payment-service");
    if (cfg === undefined) throw new Error("payment-service missing");
    expect(cfg.repos.map((r) => `${r.provider}:${r.providerId}`)).toEqual([
      "github:nimbus-agent/payments",
    ]);
    expect(cfg.pagerdutyServices).toEqual(["P12ABCD"]);
    expect(cfg.incidentWindowMinutes).toBe(90);
  });

  it("returns an empty Map when no [ci.service.*] tables present", () => {
    expect(parseNimbusCiServiceToml("[user]\nme_person_id = \"alice\"\n").size).toBe(0);
  });

  it("rejects an unknown key", () => {
    const raw = `
[ci.service.bad]
repos = ["github:org/svc"]
mystery = "yes"
`;
    expect(() => parseNimbusCiServiceToml(raw)).toThrow(/unknown key/i);
  });
});

describe("loadNimbusServiceConfigsFromConfigDir", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "nimbus-cfg-"));
  });
  afterEach(() => {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* non-fatal */ }
  });

  it("unions [metrics.dora.<id>] and [ci.service.<id>] blocks", () => {
    writeFileSync(
      join(dir, "nimbus.toml"),
      `[metrics.dora.svc-a]
repos = ["github:org/a"]

[ci.service.svc-b]
repos = ["gitlab:org/b"]
`,
    );
    const merged = loadNimbusServiceConfigsFromConfigDir(dir);
    expect(merged.size).toBe(2);
    expect(merged.get("svc-a")?.repos[0]?.provider).toBe("github");
    expect(merged.get("svc-b")?.repos[0]?.provider).toBe("gitlab");
  });

  it("on same id, [ci.service.<id>] wins and a warning is logged", () => {
    writeFileSync(
      join(dir, "nimbus.toml"),
      `[metrics.dora.svc-a]
repos = ["github:org/dora-version"]

[ci.service.svc-a]
repos = ["gitlab:org/ci-version"]
`,
    );
    const warnings: string[] = [];
    const orig = console.warn;
    console.warn = (msg: unknown) => warnings.push(String(msg));
    try {
      const merged = loadNimbusServiceConfigsFromConfigDir(dir);
      expect(merged.get("svc-a")?.repos[0]?.provider).toBe("gitlab");
    } finally {
      console.warn = orig;
    }
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toMatch(/svc-a/);
    expect(warnings[0]).toMatch(/ci\.service/);
  });

  it("returns empty Map when nimbus.toml is missing", () => {
    expect(loadNimbusServiceConfigsFromConfigDir(dir).size).toBe(0);
  });
});

describe("DoraServiceConfig type alias for back-compat", () => {
  it("parses dora blocks through the renamed ServiceConfig shape", () => {
    const raw = `
[metrics.dora.svc-c]
repos = ["github:org/c"]
`;
    const parsed = parseNimbusDoraToml(raw);
    const cfg = parsed.get("svc-c");
    if (cfg === undefined) throw new Error("svc-c missing");
    // The rename is type-level only; runtime shape is identical.
    expect(cfg.serviceId).toBe("svc-c");
  });
});
```

Add the missing imports at the top of the test file:

```ts
import { afterEach, beforeEach } from "bun:test";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/gateway/test/unit/config/ci-service-toml.test.ts`
Expected: FAIL — `parseNimbusCiServiceToml` and `loadNimbusServiceConfigsFromConfigDir` are not exported.

- [ ] **Step 3: Rename `DoraServiceConfig` → `ServiceConfig` with back-compat alias**

Modify `packages/gateway/src/metrics/dora-config.ts`:

Replace the existing `DoraServiceConfig` type declaration with:

```ts
export type ServiceConfig = {
  /** Stable service id from the table key. */
  readonly serviceId: string;
  readonly repos: readonly ParsedDoraRepoUrn[];
  readonly pagerdutyServices: readonly string[];
  readonly deployWorkflowPattern: RegExp;
  readonly incidentWindowMinutes: number;
  readonly excludePrLabels: readonly string[];
};

/** Back-compat alias. New code should import `ServiceConfig`. */
export type DoraServiceConfig = ServiceConfig;
```

Search for any non-import references to `DoraServiceConfig` inside `dora-config.ts` itself and switch them to `ServiceConfig`. Do **not** touch `dora.ts`, `metrics-rpc.ts`, or the DORA fixtures/tests — they keep their existing `DoraServiceConfig` imports, which now resolve to the alias.

- [ ] **Step 4: Append the `[ci.service.<id>]` parser to `nimbus-toml.ts`**

Modify `packages/gateway/src/config/nimbus-toml.ts`. Find the end of the existing DORA section. Append:

```ts
// ---------------------------------------------------------------------------
// [ci.service.<service-id>] — Generic service map for CI/CD features
// (Phase 5 T4 PR 3a). Same fields and semantics as [metrics.dora.<id>];
// reading either block yields a ServiceConfig.
// ---------------------------------------------------------------------------

const CI_SERVICE_TABLE_PREFIX = "[ci.service.";

export function parseNimbusCiServiceToml(raw: string): Map<string, ServiceConfig> {
  const lines = raw.split(/\r?\n/);
  const accum: Map<string, Record<string, string>> = new Map();
  let currentId: string | undefined;
  for (const line of lines) {
    const trimmed = stripComment(line).trim();
    if (trimmed === "") continue;
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      if (trimmed.startsWith(CI_SERVICE_TABLE_PREFIX) && trimmed.endsWith("]")) {
        const id = trimmed.slice(CI_SERVICE_TABLE_PREFIX.length, -1);
        if (id.length === 0) throw new Error("empty service id in [ci.service.<id>]");
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
      throw new Error(`unknown key '${key}' in [ci.service.${currentId}]`);
    }
    const bucket = accum.get(currentId);
    if (bucket === undefined) continue;
    bucket[key] = trimmed.slice(eq + 1).trim();
  }
  return materializeServiceConfigs(accum, "ci.service");
}

/**
 * Loads service configs from `<configDir>/nimbus.toml`, unioning the
 * `[metrics.dora.<id>]` and `[ci.service.<id>]` blocks. When a service id
 * appears under both keys, the `[ci.service.<id>]` block wins and a warning
 * is logged once naming the conflict.
 */
export function loadNimbusServiceConfigsFromConfigDir(
  configDir: string,
): Map<string, ServiceConfig> {
  const tomlPath = join(configDir, "nimbus.toml");
  if (!existsSync(tomlPath)) return new Map();
  const raw = readFileSync(tomlPath, "utf8");
  const dora = parseNimbusDoraToml(raw);
  const ci = parseNimbusCiServiceToml(raw);
  const merged: Map<string, ServiceConfig> = new Map(dora);
  for (const [id, cfg] of ci.entries()) {
    if (merged.has(id)) {
      console.warn(
        `[ci.service.${id}] and [metrics.dora.${id}] both define service '${id}'; ` +
        `using [ci.service.${id}].`,
      );
    }
    merged.set(id, cfg);
  }
  return merged;
}
```

Now extract the shared materializer so both `parseNimbusDoraToml` and `parseNimbusCiServiceToml` use it. Inside `nimbus-toml.ts`, refactor the existing `parseNimbusDoraToml` to call a new private helper. Add this helper next to it:

```ts
/**
 * Shared materialization of accumulated key-value pairs into ServiceConfig
 * instances. Used by both `[metrics.dora.<id>]` and `[ci.service.<id>]` parsers.
 *
 * `blockLabel` is the table-prefix label used in error messages
 * (e.g. "metrics.dora" or "ci.service").
 */
function materializeServiceConfigs(
  accum: Map<string, Record<string, string>>,
  blockLabel: string,
): Map<string, ServiceConfig> {
  const out: Map<string, ServiceConfig> = new Map();
  for (const [serviceId, kv] of accum.entries()) {
    const reposRaw = kv["repos"];
    if (reposRaw === undefined) {
      throw new Error(`[${blockLabel}.${serviceId}] missing required 'repos'`);
    }
    const repos = parseStringArray(reposRaw).map(parseDoraRepoUrn);
    const pagerdutyServices =
      kv["pagerduty_services"] === undefined
        ? []
        : parseStringArray(kv["pagerduty_services"]);
    const patternSrc =
      kv["deploy_workflow_pattern"] === undefined
        ? DEFAULT_DEPLOY_WORKFLOW_PATTERN
        : parseString(kv["deploy_workflow_pattern"]);
    let deployWorkflowPattern: RegExp;
    try {
      deployWorkflowPattern = new RegExp(patternSrc);
    } catch (e) {
      throw new Error(
        `[${blockLabel}.${serviceId}].deploy_workflow_pattern is not a valid regex: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
    const windowRaw = kv["incident_window_minutes"];
    const windowMins =
      windowRaw === undefined
        ? DEFAULT_INCIDENT_WINDOW_MINUTES
        : parseIntDec(windowRaw);
    if (windowMins === undefined || windowMins < 1 || windowMins > 1440) {
      throw new Error(
        `[${blockLabel}.${serviceId}].incident_window_minutes must be 1..1440, got '${windowRaw}'`,
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
```

Then update `parseNimbusDoraToml` so it ends with `return materializeServiceConfigs(accum, "metrics.dora");` instead of the inline materialization loop. (Delete the inline loop; replace with the function call.)

Also at the top of the file (alongside the existing `dora-config.ts` import), make sure `ServiceConfig` is imported:

```ts
import {
  DEFAULT_DEPLOY_WORKFLOW_PATTERN,
  DEFAULT_EXCLUDE_PR_LABELS,
  DEFAULT_INCIDENT_WINDOW_MINUTES,
  type ServiceConfig,
  parseDoraRepoUrn,
} from "../metrics/dora-config.ts";
```

(Drop the `type DoraServiceConfig` import in favor of `type ServiceConfig`. If existing code in `nimbus-toml.ts` references `DoraServiceConfig`, replace those references with `ServiceConfig` in the same edit.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test packages/gateway/test/unit/config/ci-service-toml.test.ts`
Expected: PASS — all cases green.

- [ ] **Step 6: Run the DORA-config tests to confirm no regression**

Run: `bun test packages/gateway/test/unit/metrics/dora-config.test.ts`
Expected: PASS — the existing 12 cases still green (rename + alias are back-compat).

- [ ] **Step 7: Typecheck**

Run: `bun run typecheck`
Expected: PASS. Any `DoraServiceConfig` callers compile via the alias.

- [ ] **Step 8: Commit**

```bash
git add packages/gateway/src/metrics/dora-config.ts \
        packages/gateway/src/config/nimbus-toml.ts \
        packages/gateway/test/unit/config/ci-service-toml.test.ts
git commit -m "$(cat <<'EOF'
feat(config): [ci.service.<id>] alias + ServiceConfig rename

Renames DoraServiceConfig → ServiceConfig with a back-compat type alias
so DORA callers compile unchanged. Adds parseNimbusCiServiceToml and
loadNimbusServiceConfigsFromConfigDir that union both block types.
When a service id appears under both keys, [ci.service.<id>] wins
with a startup warning. Materialization is factored into a shared
helper used by both parsers (Phase 5 T4 PR 3a).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `github-sync.ts` `mergeable_state` enrichment + detail-fetch policy

**Files:**
- Modify: `packages/gateway/src/connectors/github-sync.ts`
- Test: `packages/gateway/test/unit/connectors/github-sync-mergeable.test.ts`

**Context:** The GitHub PR list endpoint (`GET /repos/{owner}/{repo}/pulls`) does **not** include `mergeable_state` — only the per-PR detail endpoint (`GET /repos/{owner}/{repo}/pulls/{n}`) does. Policy (sub-option **b** from the spec brainstorm): for any open PR whose indexed `mergeable_state` is missing or older than 24h, **and** whose `updated_at` is within the last 7 days, fetch detail. Run those fetches in parallel up to the existing `RateLimiter` cap. PRs older than 7d with no `mergeable_state` indexed get left as `null`.

- [ ] **Step 1: Write the failing extraction test**

Create `packages/gateway/test/unit/connectors/github-sync-mergeable.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { extractPrMetadataForIndex } from "../../../src/connectors/github-sync.ts";

describe("github-sync: PR mergeable_state enrichment", () => {
  it("captures mergeable + mergeable_state when present on a merged PR", () => {
    const pr = {
      number: 42,
      state: "open",
      merged: false,
      mergeable: true,
      mergeable_state: "clean",
      labels: [],
      user: { login: "alice" },
      draft: false,
    };
    const out = extractPrMetadataForIndex("nimbus-agent/payments", pr);
    expect(out.mergeable).toBe(true);
    expect(out.mergeable_state).toBe("clean");
  });

  it("captures mergeable_state='dirty' on a conflict PR", () => {
    const pr = {
      number: 7,
      state: "open",
      merged: false,
      mergeable: false,
      mergeable_state: "dirty",
      labels: [],
      user: { login: "bob" },
      draft: false,
    };
    const out = extractPrMetadataForIndex("nimbus-agent/payments", pr);
    expect(out.mergeable).toBe(false);
    expect(out.mergeable_state).toBe("dirty");
  });

  it("omits mergeable + mergeable_state when not present on input (list-endpoint shape)", () => {
    const pr = {
      number: 9,
      state: "open",
      merged: false,
      labels: [],
      user: { login: "alice" },
      draft: false,
    };
    const out = extractPrMetadataForIndex("nimbus-agent/payments", pr);
    expect(out.mergeable).toBeUndefined();
    expect(out.mergeable_state).toBeUndefined();
  });

  it("ignores non-string mergeable_state defensively", () => {
    const pr = {
      number: 10,
      state: "open",
      merged: false,
      mergeable: true,
      mergeable_state: 42,
      labels: [],
      user: { login: "alice" },
      draft: false,
    };
    const out = extractPrMetadataForIndex("nimbus-agent/payments", pr);
    expect(out.mergeable_state).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/test/unit/connectors/github-sync-mergeable.test.ts`
Expected: FAIL — `extractPrMetadataForIndex` doesn't read these fields yet.

- [ ] **Step 3: Extend `extractPrMetadataForIndex` to capture the fields**

Modify `packages/gateway/src/connectors/github-sync.ts`. Find the `extractPrMetadataForIndex` helper (added in T4 PR 2 Task 2). After the existing `labels` extraction, before the `if (merged)` block, add:

```ts
  const mergeable = pr["mergeable"];
  if (typeof mergeable === "boolean") {
    out.mergeable = mergeable;
  }
  const mergeableState = stringField(pr, "mergeable_state");
  if (mergeableState !== undefined && mergeableState.length > 0) {
    out.mergeable_state = mergeableState;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/gateway/test/unit/connectors/github-sync-mergeable.test.ts`
Expected: PASS (4 cases).

- [ ] **Step 5: Write the failing detail-fetch policy test**

Append to `github-sync-mergeable.test.ts`:

```ts
import { shouldRefreshMergeableState } from "../../../src/connectors/github-sync.ts";

describe("github-sync: shouldRefreshMergeableState policy", () => {
  const DAY = 86_400_000;
  const HOUR = 3_600_000;

  it("returns true when mergeable_state is null and PR was updated in the last 7d", () => {
    const now = 1_715_000_000_000;
    expect(
      shouldRefreshMergeableState({
        mergeableState: null,
        mergeableStateFetchedAtMs: null,
        updatedAtMs: now - 3 * DAY,
        nowMs: now,
      }),
    ).toBe(true);
  });

  it("returns false when mergeable_state is null but PR was last updated >7d ago", () => {
    const now = 1_715_000_000_000;
    expect(
      shouldRefreshMergeableState({
        mergeableState: null,
        mergeableStateFetchedAtMs: null,
        updatedAtMs: now - 10 * DAY,
        nowMs: now,
      }),
    ).toBe(false);
  });

  it("returns true when indexed mergeable_state is older than 24h", () => {
    const now = 1_715_000_000_000;
    expect(
      shouldRefreshMergeableState({
        mergeableState: "clean",
        mergeableStateFetchedAtMs: now - 25 * HOUR,
        updatedAtMs: now - 1 * DAY,
        nowMs: now,
      }),
    ).toBe(true);
  });

  it("returns false when indexed mergeable_state was fetched <24h ago (thrash guard)", () => {
    const now = 1_715_000_000_000;
    expect(
      shouldRefreshMergeableState({
        mergeableState: "clean",
        mergeableStateFetchedAtMs: now - 12 * HOUR,
        updatedAtMs: now - 1 * DAY,
        nowMs: now,
      }),
    ).toBe(false);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `bun test packages/gateway/test/unit/connectors/github-sync-mergeable.test.ts`
Expected: FAIL — `shouldRefreshMergeableState` not exported.

- [ ] **Step 7: Implement `shouldRefreshMergeableState`**

Add to `packages/gateway/src/connectors/github-sync.ts`, near the `extractPrMetadataForIndex` helper:

```ts
// Tuning knobs for the mergeable_state refresh policy. Hardcoded for v0.1.0;
// could be promoted to per-connector config (e.g., a [github.sync] block)
// in a follow-up if user feedback asks for it — see plan review §3.2.
const MERGEABLE_STATE_REFRESH_FRESHNESS_MS = 24 * 60 * 60 * 1000; // 24h
const MERGEABLE_STATE_UPDATED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7d

export type MergeableStateRefreshInput = {
  readonly mergeableState: string | null;
  readonly mergeableStateFetchedAtMs: number | null;
  readonly updatedAtMs: number;
  readonly nowMs: number;
};

/**
 * Decides whether an open PR needs a detail-endpoint fetch to refresh
 * `mergeable_state` (Phase 5 T4 PR 3a). Returns true iff:
 *   - mergeable_state is null OR was fetched > 24h ago (thrash guard),
 *   - AND the PR's `updated_at` is within the last 7 days
 *     (avoids re-fetching long-stale PRs nobody is working on).
 */
export function shouldRefreshMergeableState(input: MergeableStateRefreshInput): boolean {
  const updatedAge = input.nowMs - input.updatedAtMs;
  if (updatedAge > MERGEABLE_STATE_UPDATED_WINDOW_MS) return false;
  if (input.mergeableState === null) return true;
  if (input.mergeableStateFetchedAtMs === null) return true;
  const refreshAge = input.nowMs - input.mergeableStateFetchedAtMs;
  return refreshAge > MERGEABLE_STATE_REFRESH_FRESHNESS_MS;
}
```

- [ ] **Step 8: Wire `mergeable_state_fetched_at_ms` into `extractPrMetadataForIndex`**

When the helper sees `mergeable_state` in the input, it should also capture a fetch-time. The simplest stamp is whatever the caller passes for "now"; in practice the caller is `upsertFromPullRequest`, which already has a sync time available. Modify the helper signature to accept an optional `nowMs` parameter (defaults to `Date.now()` for back-compat with existing callers including the T4 PR 2 test):

```ts
export function extractPrMetadataForIndex(
  repoFull: string,
  pr: Record<string, unknown>,
  nowMs: number = Date.now(),
): Record<string, unknown> {
  // ... existing body unchanged through `labels` extraction ...

  const mergeable = pr["mergeable"];
  if (typeof mergeable === "boolean") {
    out.mergeable = mergeable;
  }
  const mergeableState = stringField(pr, "mergeable_state");
  if (mergeableState !== undefined && mergeableState.length > 0) {
    out.mergeable_state = mergeableState;
    out.mergeable_state_fetched_at_ms = nowMs;
  }

  // ... existing merged-PR block unchanged ...
}
```

(Only set the timestamp when the field is actually present; leaving an unset field means "we never observed it.")

- [ ] **Step 9: Re-run the mergeable test file**

Run: `bun test packages/gateway/test/unit/connectors/github-sync-mergeable.test.ts`
Expected: PASS (8 cases total).

- [ ] **Step 10: Update the existing T4 PR 2 metadata test to assert the new fields are absent on inputs that don't carry them**

Open `packages/gateway/test/unit/connectors/github-sync-pr-metadata.test.ts`. In the "omits merged_at and merge_commit_sha when PR is open" test (or its closest equivalent), add lines asserting `out.mergeable` and `out.mergeable_state` are both `undefined` when input lacks them. This locks in the absence semantic so future refactors don't quietly start emitting placeholder values.

```ts
    expect(out.mergeable).toBeUndefined();
    expect(out.mergeable_state).toBeUndefined();
```

Run: `bun test packages/gateway/test/unit/connectors/github-sync-pr-metadata.test.ts`
Expected: PASS (existing tests + the new assertions).

- [ ] **Step 11: Wire the detail-fetch into the sync loop**

Find the function in `github-sync.ts` that drives the PR upsert pass (the function that iterates the list-endpoint result and calls `upsertFromPullRequest` per item). At the end of that loop, before returning the sync result, add a parallel detail-fetch pass for open PRs whose state needs refreshing.

Pseudocode for the wiring (adapt to the actual function names and rate-limiter API in the file — read it first):

```ts
  // After the main list-pass: refresh mergeable_state for open PRs that need it.
  const candidates = openPrIds
    .map((id) => db.query("SELECT id, metadata FROM item WHERE id = ?").get(id))
    .filter(/* parse metadata, apply shouldRefreshMergeableState */);
  // Run details concurrently up to the per-provider RateLimiter cap. Use
  // allSettled so a single deleted PR (404) or transient 403 doesn't abort
  // the entire batch — surviving PRs still get refreshed.
  const results = await Promise.allSettled(
    candidates.map((c) =>
      rateLimiter.run("github", async () => {
        try {
          const detail = await fetchPrDetail(c.repoFull, c.number);
          const enriched = extractPrMetadataForIndex(c.repoFull, detail, Date.now());
          upsertItemMetadata(db, c.id, enriched);
        } catch (e) {
          // Handle 404 (deleted PR) and 403 (private/archived repo) as
          // expected outcomes: skip this candidate, leave its existing
          // metadata in place. Re-throw 429 so the RateLimiter / connector
          // health path picks it up; re-throw 5xx so the sync cycle's
          // outer error envelope sees it.
          if (isHttpStatus(e, 404) || isHttpStatus(e, 403)) return;
          throw e;
        }
      }),
    ),
  );
  // Optional: count + log silently-dropped candidates for visibility.
  const dropped = results.filter((r) => r.status === "rejected").length;
  if (dropped > 0) {
    logger.warn({ dropped }, "github mergeable_state refresh: some details unavailable");
  }
```

(`isHttpStatus(e, n)` is a tiny helper — implement next to `fetchPrDetail`: `return e instanceof HttpError && e.status === n` or equivalent, using whatever error shape the connector's fetch wrapper already throws.)

**This step has the most file-dependent shape.** Before writing code, read `github-sync.ts` carefully:
- Find the existing PR sync loop and the RateLimiter call site (used by the list-endpoint requests).
- Match the existing pattern — same `RateLimiter` instance, same connector-id string, same error-handling envelope (a 429 should still flip the connector to `rate_limited`).
- **Verify the `RateLimiter` actually supports concurrent in-flight requests for a single provider key.** If it serializes (e.g., a mutex per provider rather than a token bucket with a concurrency cap), the `Promise.allSettled` above still works correctly — it just degrades to sequential behavior. That's acceptable for v0.1.0; the contract test in Step 12 should still pass. If you want true concurrency, the RateLimiter's per-provider behavior is a separate change outside this PR's scope.

If the file's existing structure makes this wiring awkward (e.g., the sync function is a generator, not a flat list-pass), **report back as DONE_WITH_CONCERNS** noting the structural mismatch — the spec's contract test below will catch any wiring mistake regardless.

- [ ] **Step 12: Write a contract test asserting the rate-limit behavior**

Add this test block at the end of `packages/gateway/test/unit/connectors/github-sync-mergeable.test.ts` (only the parts that don't need network — they can run against the existing mock github-API harness used elsewhere in the connector tests):

```ts
describe("github-sync: mergeable_state detail-fetch contract", () => {
  it("runs detail fetches concurrently up to the RateLimiter cap (smoke)", async () => {
    // Use the existing mock-github harness pattern. Schedule 5 open PRs that all
    // need detail refresh. Assert the harness observed <= rateLimiter.cap()
    // concurrent in-flight requests at any time.
    // The exact harness API depends on what's already in the test directory —
    // mirror github-sync.test.ts's mock setup.
  });

  it("a 429 from the detail endpoint transitions the connector to rate_limited", async () => {
    // Mirror github-sync.test.ts's existing 429 → rate_limited test for the list
    // endpoint. Reuse the same connector health assertion.
  });
});
```

The exact test bodies depend on the github-sync test harness already in the repo. If the harness doesn't exist or has a fundamentally different shape, replace this step with a smaller-scope contract assertion (e.g., `shouldRefreshMergeableState` is called with the right freshness inputs) and report the gap.

- [ ] **Step 13: Run the full github-sync test suite to confirm no regression**

Run: `bun test packages/gateway/test/unit/connectors/github-sync`
Expected: PASS — existing tests + the new mergeable tests all green.

- [ ] **Step 14: Commit**

```bash
git add packages/gateway/src/connectors/github-sync.ts \
        packages/gateway/test/unit/connectors/github-sync-mergeable.test.ts \
        packages/gateway/test/unit/connectors/github-sync-pr-metadata.test.ts
git commit -m "$(cat <<'EOF'
feat(github): enrich open PRs with mergeable_state via detail fetch

The list-endpoint doesn't return mergeable_state, but the DORA-style
preflight check needs it to identify merge conflicts. Adds:

- extractPrMetadataForIndex now captures mergeable + mergeable_state +
  mergeable_state_fetched_at_ms when present on the input.
- shouldRefreshMergeableState policy: refresh if state is null OR
  >24h old, AND the PR's updated_at is within the last 7d (skip
  long-stale PRs nobody is working on).
- The sync loop runs candidate detail-fetches concurrently up to the
  per-provider RateLimiter cap rather than serially.

Phase 5 T4 PR 3a.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Pure preflight calculator (`preflight.ts`)

**Files:**
- Create: `packages/gateway/src/preflight/preflight.ts`
- Test: `packages/gateway/test/unit/preflight/preflight.test.ts`

- [ ] **Step 1: Write the failing calculator tests**

Create `packages/gateway/test/unit/preflight/preflight.test.ts`:

```ts
import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runIndexedSchemaMigrations } from "../../../src/index/migrations/runner.ts";
import { computeDeployPreflight } from "../../../src/preflight/preflight.ts";
import type { ServiceConfig } from "../../../src/metrics/dora-config.ts";

function seedIncident(db: Database, id: string, opts: {
  status: "triggered" | "acknowledged" | "resolved";
  severity: string;
  pagerdutyServiceId: string;
  openedAtMs: number;
  title?: string;
  url?: string;
}) {
  const meta = {
    status: opts.status,
    severity: opts.severity,
    pagerduty_service_id: opts.pagerdutyServiceId,
    opened_at_ms: opts.openedAtMs,
  };
  db.run(
    `INSERT INTO item (id, service, type, external_id, title, body_preview, url, canonical_url,
                       modified_at, author_id, metadata, synced_at, pinned)
     VALUES (?, 'pagerduty', 'incident', ?, ?, '', ?, NULL, ?, NULL, ?, ?, 0)`,
    [
      id,
      id,
      opts.title ?? "Incident",
      opts.url ?? null,
      opts.openedAtMs,
      JSON.stringify(meta),
      opts.openedAtMs,
    ],
  );
}

function seedCiRun(db: Database, id: string, opts: {
  service: string;
  title: string;
  conclusion: "success" | "failure" | "cancelled" | "timed_out";
  branch: string;
  headSha?: string;
  workflowName?: string;
  modifiedAtMs: number;
  url?: string;
}) {
  const meta: Record<string, unknown> = {
    conclusion: opts.conclusion,
    branch: opts.branch,
  };
  if (opts.headSha) meta.headSha = opts.headSha;
  if (opts.workflowName) meta.workflow_name = opts.workflowName;
  db.run(
    `INSERT INTO item (id, service, type, external_id, title, body_preview, url, canonical_url,
                       modified_at, author_id, metadata, synced_at, pinned)
     VALUES (?, ?, 'ci_run', ?, ?, '', ?, NULL, ?, NULL, ?, ?, 0)`,
    [id, opts.service, id, opts.title, opts.url ?? null, opts.modifiedAtMs, JSON.stringify(meta), opts.modifiedAtMs],
  );
}

function seedPr(db: Database, id: string, opts: {
  service: string;
  repo?: string;
  project?: string;
  number: number;
  state: "open" | "closed";
  title?: string;
  mergeableState?: string | null;
  modifiedAtMs: number;
  url?: string;
}) {
  const meta: Record<string, unknown> = {
    number: opts.number,
    state: opts.state,
  };
  if (opts.repo) meta.repo = opts.repo;
  if (opts.project) meta.project = opts.project;
  if (opts.mergeableState !== undefined) meta.mergeable_state = opts.mergeableState;
  db.run(
    `INSERT INTO item (id, service, type, external_id, title, body_preview, url, canonical_url,
                       modified_at, author_id, metadata, synced_at, pinned)
     VALUES (?, ?, 'pr', ?, ?, '', ?, NULL, ?, NULL, ?, ?, 0)`,
    [id, opts.service, id, opts.title ?? `PR #${opts.number}`, opts.url ?? null, opts.modifiedAtMs, JSON.stringify(meta), opts.modifiedAtMs],
  );
}

function cfg(overrides: Partial<ServiceConfig> = {}): ServiceConfig {
  return {
    serviceId: "payment-service",
    repos: [{ provider: "github", providerId: "nimbus-agent/payments" }],
    pagerdutyServices: ["P12ABCD"],
    deployWorkflowPattern: /^[Dd]eploy/,
    incidentWindowMinutes: 60,
    excludePrLabels: ["revert"],
    ...overrides,
  };
}

describe("computeDeployPreflight: verdict + envelope", () => {
  let dir: string;
  let db: Database;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "nimbus-preflight-"));
    db = new Database(join(dir, "nimbus.db"));
    runIndexedSchemaMigrations(db, 27);
  });
  afterEach(() => {
    db.close();
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* non-fatal */ }
  });

  it("returns verdict='ok' when every check has count===0 even with gaps present", () => {
    const now = 1_715_000_000_000;
    // No pagerduty services configured → no_pagerduty_mapping gap, but verdict still ok.
    const out = computeDeployPreflight(db, cfg({ pagerdutyServices: [] }), "main", now, 10);
    expect(out.verdict).toBe("ok");
    expect(out.checks.active_p1_incidents.count).toBe(0);
    expect(out.checks.active_p1_incidents.gap).toBe("no_pagerduty_mapping");
    expect(out.service).toBe("payment-service");
    expect(out.target_ref).toBe("main");
    expect(out.computed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns verdict='warn' when any check has count>0", () => {
    const now = 1_715_000_000_000;
    seedIncident(db, "pagerduty:inc_1", {
      status: "triggered",
      severity: "P1",
      pagerdutyServiceId: "P12ABCD",
      openedAtMs: now - 60_000,
    });
    const out = computeDeployPreflight(db, cfg(), "main", now, 10);
    expect(out.verdict).toBe("warn");
    expect(out.checks.active_p1_incidents.count).toBe(1);
  });
});

describe("computeDeployPreflight: active_p1_incidents check", () => {
  let dir: string;
  let db: Database;
  const now = 1_715_000_000_000;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "nimbus-preflight-inc-"));
    db = new Database(join(dir, "nimbus.db"));
    runIndexedSchemaMigrations(db, 27);
  });
  afterEach(() => {
    db.close();
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* non-fatal */ }
  });

  it("counts triggered + acknowledged P1 incidents on the configured PD service", () => {
    seedIncident(db, "pagerduty:inc_1", {
      status: "triggered",
      severity: "P1",
      pagerdutyServiceId: "P12ABCD",
      openedAtMs: now - 60_000,
    });
    seedIncident(db, "pagerduty:inc_2", {
      status: "acknowledged",
      severity: "P1",
      pagerdutyServiceId: "P12ABCD",
      openedAtMs: now - 120_000,
    });
    seedIncident(db, "pagerduty:inc_3", {
      status: "resolved",
      severity: "P1",
      pagerdutyServiceId: "P12ABCD",
      openedAtMs: now - 180_000,
    });
    seedIncident(db, "pagerduty:inc_4", {
      status: "triggered",
      severity: "P2",
      pagerdutyServiceId: "P12ABCD",
      openedAtMs: now - 240_000,
    });
    const out = computeDeployPreflight(db, cfg(), "main", now, 10);
    expect(out.checks.active_p1_incidents.count).toBe(2);
    expect(out.checks.active_p1_incidents.gap).toBeNull();
  });

  it("excludes incidents on other PagerDuty services", () => {
    seedIncident(db, "pagerduty:other_svc", {
      status: "triggered",
      severity: "P1",
      pagerdutyServiceId: "P-OTHER",
      openedAtMs: now - 60_000,
    });
    const out = computeDeployPreflight(db, cfg(), "main", now, 10);
    expect(out.checks.active_p1_incidents.count).toBe(0);
  });

  it("emits gap='no_pagerduty_mapping' when cfg.pagerdutyServices is empty", () => {
    const out = computeDeployPreflight(db, cfg({ pagerdutyServices: [] }), "main", now, 10);
    expect(out.checks.active_p1_incidents.count).toBe(0);
    expect(out.checks.active_p1_incidents.gap).toBe("no_pagerduty_mapping");
  });

  it("caps findings to max_findings (most recent first)", () => {
    for (let i = 0; i < 15; i++) {
      seedIncident(db, `pagerduty:inc_${i}`, {
        status: "triggered",
        severity: "P1",
        pagerdutyServiceId: "P12ABCD",
        openedAtMs: now - i * 60_000,
      });
    }
    const out = computeDeployPreflight(db, cfg(), "main", now, 5);
    expect(out.checks.active_p1_incidents.count).toBe(15);
    expect(out.checks.active_p1_incidents.findings.length).toBe(5);
    // Most-recent first → first finding is the most recently opened (smallest age).
    expect(out.checks.active_p1_incidents.findings[0]?.id).toBe("pagerduty:inc_0");
  });
});

describe("computeDeployPreflight: failing_ci_runs check", () => {
  let dir: string;
  let db: Database;
  const now = 1_715_000_000_000;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "nimbus-preflight-ci-"));
    db = new Database(join(dir, "nimbus.db"));
    runIndexedSchemaMigrations(db, 27);
  });
  afterEach(() => {
    db.close();
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* non-fatal */ }
  });

  it("counts only failing/cancelled/timed_out runs on the target branch", () => {
    seedCiRun(db, "github_actions:r1", {
      service: "github_actions",
      title: "Deploy production",
      conclusion: "failure",
      branch: "main",
      workflowName: "Deploy production",
      modifiedAtMs: now - 60_000,
    });
    seedCiRun(db, "github_actions:r2", {
      service: "github_actions",
      title: "CI lint",
      conclusion: "success",
      branch: "main",
      workflowName: "CI lint",
      modifiedAtMs: now - 30_000,
    });
    seedCiRun(db, "github_actions:r3", {
      service: "github_actions",
      title: "Deploy production",
      conclusion: "failure",
      branch: "feature-x",
      workflowName: "Deploy production",
      modifiedAtMs: now - 90_000,
    });
    const out = computeDeployPreflight(db, cfg(), "main", now, 10);
    expect(out.checks.failing_ci_runs.count).toBe(1);
  });

  it("groups by workflow_name and keeps only the most recent failing run per workflow", () => {
    // Three failures on the same workflow → count should be 1 (latest only).
    seedCiRun(db, "github_actions:old", {
      service: "github_actions",
      title: "Deploy production",
      conclusion: "failure",
      branch: "main",
      workflowName: "Deploy production",
      modifiedAtMs: now - 3 * 60_000,
    });
    seedCiRun(db, "github_actions:mid", {
      service: "github_actions",
      title: "Deploy production",
      conclusion: "failure",
      branch: "main",
      workflowName: "Deploy production",
      modifiedAtMs: now - 2 * 60_000,
    });
    seedCiRun(db, "github_actions:newest", {
      service: "github_actions",
      title: "Deploy production",
      conclusion: "failure",
      branch: "main",
      workflowName: "Deploy production",
      modifiedAtMs: now - 60_000,
    });
    const out = computeDeployPreflight(db, cfg(), "main", now, 10);
    expect(out.checks.failing_ci_runs.count).toBe(1);
    expect(out.checks.failing_ci_runs.findings[0]?.id).toBe("github_actions:newest");
  });

  it("falls back to title when workflow_name is missing", () => {
    seedCiRun(db, "github_actions:no_wf", {
      service: "github_actions",
      title: "Build and Test",
      conclusion: "failure",
      branch: "main",
      modifiedAtMs: now - 60_000,
    });
    seedCiRun(db, "github_actions:no_wf_2", {
      service: "github_actions",
      title: "Build and Test",
      conclusion: "failure",
      branch: "main",
      modifiedAtMs: now - 120_000,
    });
    const out = computeDeployPreflight(db, cfg(), "main", now, 10);
    // Same title → grouped to one workflow → 1 failing run (the latest).
    expect(out.checks.failing_ci_runs.count).toBe(1);
  });

  it("emits gap='no_repos' when cfg.repos is empty", () => {
    const out = computeDeployPreflight(db, cfg({ repos: [] }), "main", now, 10);
    expect(out.checks.failing_ci_runs.count).toBe(0);
    expect(out.checks.failing_ci_runs.gap).toBe("no_repos");
  });
});

describe("computeDeployPreflight: merge_conflicts check", () => {
  let dir: string;
  let db: Database;
  const now = 1_715_000_000_000;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "nimbus-preflight-pr-"));
    db = new Database(join(dir, "nimbus.db"));
    runIndexedSchemaMigrations(db, 27);
  });
  afterEach(() => {
    db.close();
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* non-fatal */ }
  });

  it("counts open PRs with mergeable_state='dirty' on matching repos", () => {
    seedPr(db, "github:pr_1", {
      service: "github",
      repo: "nimbus-agent/payments",
      number: 1,
      state: "open",
      mergeableState: "dirty",
      modifiedAtMs: now - 60_000,
    });
    seedPr(db, "github:pr_2", {
      service: "github",
      repo: "nimbus-agent/payments",
      number: 2,
      state: "open",
      mergeableState: "clean",
      modifiedAtMs: now - 30_000,
    });
    seedPr(db, "github:pr_3_closed", {
      service: "github",
      repo: "nimbus-agent/payments",
      number: 3,
      state: "closed",
      mergeableState: "dirty",
      modifiedAtMs: now - 90_000,
    });
    const out = computeDeployPreflight(db, cfg(), "main", now, 10);
    expect(out.checks.merge_conflicts.count).toBe(1);
    expect(out.checks.merge_conflicts.gap).toBeNull();
  });

  it("emits gap='unknown_mergeable_state' when any matching open PR has null mergeable_state", () => {
    seedPr(db, "github:pr_dirty", {
      service: "github",
      repo: "nimbus-agent/payments",
      number: 1,
      state: "open",
      mergeableState: "dirty",
      modifiedAtMs: now - 60_000,
    });
    seedPr(db, "github:pr_unknown", {
      service: "github",
      repo: "nimbus-agent/payments",
      number: 2,
      state: "open",
      mergeableState: null,
      modifiedAtMs: now - 30_000,
    });
    const out = computeDeployPreflight(db, cfg(), "main", now, 10);
    expect(out.checks.merge_conflicts.count).toBe(1); // Only dirty counts.
    expect(out.checks.merge_conflicts.gap).toBe("unknown_mergeable_state");
  });

  it("excludes PRs from non-matching repos", () => {
    seedPr(db, "github:other_repo", {
      service: "github",
      repo: "nimbus-agent/other",
      number: 1,
      state: "open",
      mergeableState: "dirty",
      modifiedAtMs: now - 60_000,
    });
    const out = computeDeployPreflight(db, cfg(), "main", now, 10);
    expect(out.checks.merge_conflicts.count).toBe(0);
  });
});

describe("computeDeployPreflight: max_findings", () => {
  let dir: string;
  let db: Database;
  const now = 1_715_000_000_000;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "nimbus-preflight-max-"));
    db = new Database(join(dir, "nimbus.db"));
    runIndexedSchemaMigrations(db, 27);
  });
  afterEach(() => {
    db.close();
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* non-fatal */ }
  });

  it("caps findings independently per check", () => {
    for (let i = 0; i < 12; i++) {
      seedPr(db, `github:pr_${i}`, {
        service: "github",
        repo: "nimbus-agent/payments",
        number: i,
        state: "open",
        mergeableState: "dirty",
        modifiedAtMs: now - i * 60_000,
      });
    }
    const out = computeDeployPreflight(db, cfg(), "main", now, 3);
    expect(out.checks.merge_conflicts.count).toBe(12);
    expect(out.checks.merge_conflicts.findings.length).toBe(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/gateway/test/unit/preflight/preflight.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `preflight.ts`**

Create `packages/gateway/src/preflight/preflight.ts`:

```ts
/**
 * Phase 5 T4 PR 3a — Pre-deploy preflight calculator.
 *
 * Pure SELECT-only against the unified `item` table. Three checks:
 *   1. Active P1 incidents on the configured PagerDuty service(s)
 *   2. Most-recent failing CI run per workflow on the target branch
 *   3. Open PRs with mergeable_state='dirty' on the configured repos
 *
 * Verdict rule: `verdict = "ok"` iff every check has `count === 0`.
 * Gaps are informational only and do NOT flip the verdict.
 */

import type { Database } from "bun:sqlite";
import type { ParsedDoraRepoUrn, ServiceConfig } from "../metrics/dora-config.ts";
import { providerServiceColumns } from "../metrics/dora-config.ts";

export type PreflightGap =
  | null
  | "no_pagerduty_mapping"
  | "no_repos"
  | "no_target_ref"
  | "unknown_mergeable_state";

export type IncidentFinding = {
  readonly id: string;
  readonly title: string;
  readonly status: "triggered" | "acknowledged";
  readonly severity: string;
  readonly opened_at_ms: number;
  readonly pagerduty_service_id: string;
  readonly url: string | null;
};

export type CiFinding = {
  readonly id: string;
  readonly title: string;
  readonly conclusion: "failure" | "cancelled" | "timed_out";
  readonly modified_at_ms: number;
  readonly branch: string;
  readonly head_sha: string | null;
  readonly url: string | null;
};

export type PrFinding = {
  readonly id: string;
  readonly title: string;
  readonly number: number;
  readonly mergeable_state: string;
  readonly modified_at_ms: number;
  readonly url: string | null;
};

export type PreflightCheck<F> = {
  readonly count: number;
  readonly findings: readonly F[];
  readonly gap: PreflightGap;
};

export type DeployPreflightResult = {
  readonly service: string;
  readonly target_ref: string;
  readonly computed_at: string;
  readonly verdict: "ok" | "warn";
  readonly checks: {
    readonly active_p1_incidents: PreflightCheck<IncidentFinding>;
    readonly failing_ci_runs: PreflightCheck<CiFinding>;
    readonly merge_conflicts: PreflightCheck<PrFinding>;
  };
};

const FAILED_CONCLUSIONS = ["failure", "cancelled", "timed_out"] as const;

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

function repoFilterClause(repos: readonly ParsedDoraRepoUrn[]): {
  clause: string;
  params: unknown[];
} {
  // Build a disjunction:
  //   (repo IN (?...) OR project IN (?...))
  // GitHub/Bitbucket use `metadata.repo`; GitLab can use either `repo` or `project`.
  const repoIds = repos
    .filter((r) => r.provider === "github" || r.provider === "bitbucket" || r.provider === "gitlab")
    .map((r) => r.providerId);
  if (repoIds.length === 0) return { clause: "1=0", params: [] };
  const placeholders = repoIds.map(() => "?").join(",");
  return {
    clause: `(json_extract(metadata, '$.repo') IN (${placeholders}) OR json_extract(metadata, '$.project') IN (${placeholders}))`,
    params: [...repoIds, ...repoIds],
  };
}

function selectActiveP1Incidents(
  db: Database,
  cfg: ServiceConfig,
  maxFindings: number,
): { count: number; findings: IncidentFinding[]; gap: PreflightGap } {
  if (cfg.pagerdutyServices.length === 0) {
    return { count: 0, findings: [], gap: "no_pagerduty_mapping" };
  }
  const placeholders = cfg.pagerdutyServices.map(() => "?").join(",");
  const where = `
    service = 'pagerduty'
    AND type = 'incident'
    AND json_extract(metadata, '$.pagerduty_service_id') IN (${placeholders})
    AND json_extract(metadata, '$.status') IN ('triggered', 'acknowledged')
    AND json_extract(metadata, '$.severity') = 'P1'
  `;
  const countRow = db
    .query(`SELECT COUNT(*) as c FROM item WHERE ${where}`)
    .get(...cfg.pagerdutyServices) as { c: number };
  const rows = db
    .query(
      `SELECT id, title, url, metadata
       FROM item
       WHERE ${where}
       ORDER BY json_extract(metadata, '$.opened_at_ms') DESC
       LIMIT ?`,
    )
    .all(...cfg.pagerdutyServices, maxFindings) as {
      id: string;
      title: string;
      url: string | null;
      metadata: string;
    }[];
  const findings: IncidentFinding[] = rows.map((r) => {
    const meta = JSON.parse(r.metadata) as Record<string, unknown>;
    return {
      id: r.id,
      title: r.title,
      status: meta["status"] as "triggered" | "acknowledged",
      severity: typeof meta["severity"] === "string" ? meta["severity"] : "P1",
      opened_at_ms: typeof meta["opened_at_ms"] === "number" ? meta["opened_at_ms"] : 0,
      pagerduty_service_id:
        typeof meta["pagerduty_service_id"] === "string" ? meta["pagerduty_service_id"] : "",
      url: r.url,
    };
  });
  return { count: countRow.c, findings, gap: null };
}

function selectFailingCiRuns(
  db: Database,
  cfg: ServiceConfig,
  targetRef: string,
  maxFindings: number,
): { count: number; findings: CiFinding[]; gap: PreflightGap } {
  const ciServices = distinctCiServiceColumns(cfg.repos);
  if (ciServices.length === 0) {
    return { count: 0, findings: [], gap: "no_repos" };
  }
  const servicePlaceholders = ciServices.map(() => "?").join(",");
  const conclusionPlaceholders = FAILED_CONCLUSIONS.map(() => "?").join(",");
  // Window function: pick the row with MAX(modified_at) per workflow grouping key.
  // Requires SQLite ≥ 3.25 (window functions, 2018). Bun's bundled SQLite is
  // current (>= 3.39 as of Bun 1.2) so this is safely supported.
  // Grouping key (COALESCE ladder): workflow_name → title → head_sha:branch.
  const sql = `
    WITH ranked AS (
      SELECT
        id, service, type, title, url, modified_at, metadata,
        ROW_NUMBER() OVER (
          PARTITION BY service, COALESCE(
            json_extract(metadata, '$.workflow_name'),
            title,
            COALESCE(json_extract(metadata, '$.headSha'), '') || ':' || COALESCE(json_extract(metadata, '$.branch'), '')
          )
          ORDER BY modified_at DESC
        ) AS rn
      FROM item
      WHERE service IN (${servicePlaceholders})
        AND type = 'ci_run'
        AND json_extract(metadata, '$.branch') = ?
        AND json_extract(metadata, '$.conclusion') IN (${conclusionPlaceholders})
    )
    SELECT id, title, url, modified_at, metadata FROM ranked WHERE rn = 1
  `;
  const params = [...ciServices, targetRef, ...FAILED_CONCLUSIONS];
  const allLatest = db.query(sql).all(...params) as {
    id: string;
    title: string;
    url: string | null;
    modified_at: number;
    metadata: string;
  }[];
  const count = allLatest.length;
  const findings: CiFinding[] = allLatest
    .slice()
    .sort((a, b) => b.modified_at - a.modified_at)
    .slice(0, maxFindings)
    .map((r) => {
      const meta = JSON.parse(r.metadata) as Record<string, unknown>;
      return {
        id: r.id,
        title: r.title,
        conclusion: meta["conclusion"] as "failure" | "cancelled" | "timed_out",
        modified_at_ms: r.modified_at,
        branch: typeof meta["branch"] === "string" ? meta["branch"] : targetRef,
        head_sha: typeof meta["headSha"] === "string" ? meta["headSha"] : null,
        url: r.url,
      };
    });
  return { count, findings, gap: null };
}

function selectMergeConflicts(
  db: Database,
  cfg: ServiceConfig,
  maxFindings: number,
): { count: number; findings: PrFinding[]; gap: PreflightGap } {
  const prServices = distinctPrServiceColumns(cfg.repos);
  if (prServices.length === 0) {
    return { count: 0, findings: [], gap: "no_repos" };
  }
  const servicePlaceholders = prServices.map(() => "?").join(",");
  const repoFilter = repoFilterClause(cfg.repos);
  const baseWhere = `
    service IN (${servicePlaceholders})
    AND type = 'pr'
    AND json_extract(metadata, '$.state') = 'open'
    AND ${repoFilter.clause}
  `;
  // Count dirty PRs.
  const countRow = db
    .query(
      `SELECT COUNT(*) as c FROM item
       WHERE ${baseWhere}
         AND json_extract(metadata, '$.mergeable_state') = 'dirty'`,
    )
    .get(...prServices, ...repoFilter.params) as { c: number };
  // Detect any null mergeable_state on matching open PRs → gap.
  const nullRow = db
    .query(
      `SELECT COUNT(*) as c FROM item
       WHERE ${baseWhere}
         AND json_extract(metadata, '$.mergeable_state') IS NULL`,
    )
    .get(...prServices, ...repoFilter.params) as { c: number };
  const gap: PreflightGap = nullRow.c > 0 ? "unknown_mergeable_state" : null;
  const rows = db
    .query(
      `SELECT id, title, url, modified_at, metadata FROM item
       WHERE ${baseWhere}
         AND json_extract(metadata, '$.mergeable_state') = 'dirty'
       ORDER BY modified_at DESC
       LIMIT ?`,
    )
    .all(...prServices, ...repoFilter.params, maxFindings) as {
      id: string;
      title: string;
      url: string | null;
      modified_at: number;
      metadata: string;
    }[];
  const findings: PrFinding[] = rows.map((r) => {
    const meta = JSON.parse(r.metadata) as Record<string, unknown>;
    return {
      id: r.id,
      title: r.title,
      number: typeof meta["number"] === "number" ? meta["number"] : 0,
      mergeable_state:
        typeof meta["mergeable_state"] === "string" ? meta["mergeable_state"] : "dirty",
      modified_at_ms: r.modified_at,
      url: r.url,
    };
  });
  return { count: countRow.c, findings, gap };
}

export function computeDeployPreflight(
  db: Database,
  cfg: ServiceConfig,
  targetRef: string,
  nowMs: number,
  maxFindings: number,
): DeployPreflightResult {
  const incidents = selectActiveP1Incidents(db, cfg, maxFindings);
  const ciRuns = selectFailingCiRuns(db, cfg, targetRef, maxFindings);
  const conflicts = selectMergeConflicts(db, cfg, maxFindings);
  const verdict =
    incidents.count === 0 && ciRuns.count === 0 && conflicts.count === 0 ? "ok" : "warn";
  return {
    service: cfg.serviceId,
    target_ref: targetRef,
    computed_at: new Date(nowMs).toISOString(),
    verdict,
    checks: {
      active_p1_incidents: incidents,
      failing_ci_runs: ciRuns,
      merge_conflicts: conflicts,
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/gateway/test/unit/preflight/preflight.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Typecheck**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/preflight/preflight.ts \
        packages/gateway/test/unit/preflight/preflight.test.ts
git commit -m "$(cat <<'EOF'
feat(preflight): pure pre-deploy index check calculator

Reads pr / ci_run / incident from the local index; no I/O below db.
Three checks:
- active_p1_incidents: triggered/acknowledged P1 on the configured PD
  service(s)
- failing_ci_runs: most-recent failing run per workflow on target_ref
  (COALESCE ladder: metadata.workflow_name → title → head_sha:branch)
- merge_conflicts: open PRs with mergeable_state='dirty'

Verdict rule is count-only — gaps are informational and do not flip the
verdict. A user without PagerDuty gets verdict='ok' plus a
no_pagerduty_mapping gap, not perpetual warn.

Phase 5 T4 PR 3a.

## Task 4: Payment-service fixture + integration test

**Files:**
- Create: `packages/gateway/test/fixtures/preflight/payment-service/seed.ts`
- Create: `packages/gateway/test/fixtures/preflight/payment-service/expected-envelope.json`
- Create: `packages/gateway/test/integration/preflight/preflight-real-db.test.ts`

- [ ] **Step 1: Create the fixture seeder**

Create `packages/gateway/test/fixtures/preflight/payment-service/seed.ts`:

```ts
import type { Database } from "bun:sqlite";
import type { ServiceConfig } from "../../../../src/metrics/dora-config.ts";

export const PREFLIGHT_FIXTURE_NOW_MS = 1_715_000_000_000;
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function ins(db: Database, row: {
  id: string;
  service: string;
  type: string;
  external_id: string;
  title: string;
  url: string | null;
  modified_at: number;
  metadata: Record<string, unknown>;
}) {
  db.run(
    `INSERT INTO item (id, service, type, external_id, title, body_preview, url, canonical_url,
                       modified_at, author_id, metadata, synced_at, pinned)
     VALUES (?, ?, ?, ?, ?, '', ?, NULL, ?, NULL, ?, ?, 0)`,
    [
      row.id,
      row.service,
      row.type,
      row.external_id,
      row.title,
      row.url,
      row.modified_at,
      JSON.stringify(row.metadata),
      row.modified_at,
    ],
  );
}

/**
 * Seeds a deterministic preflight fixture for the "payment-service" config:
 *   - 2 PagerDuty incidents (1 triggered P1, 1 resolved P1)  → 1 active P1
 *   - 4 GitHub Actions CI runs (2 on main: 1 success, 1 failure; 2 on
 *     feature-x: both failures)                              → 1 failing CI on main
 *   - 3 GitHub PRs on main repo (1 dirty open, 1 clean open,
 *     1 open with null mergeable_state)                      → 1 conflict + gap
 *
 * Returns the matching `ServiceConfig` for the fixture window.
 */
export function seedPaymentServicePreflightFixture(
  db: Database,
): { config: ServiceConfig } {
  const now = PREFLIGHT_FIXTURE_NOW_MS;

  // ---- Incidents ----
  ins(db, {
    id: "pagerduty:inc_active",
    service: "pagerduty",
    type: "incident",
    external_id: "inc_active",
    title: "DB connection pool exhausted",
    url: "https://nimbus-agent.pagerduty.com/incidents/inc_active",
    modified_at: now - 10 * MIN,
    metadata: {
      status: "triggered",
      severity: "P1",
      pagerduty_service_id: "P12ABCD",
      opened_at_ms: now - 10 * MIN,
    },
  });
  ins(db, {
    id: "pagerduty:inc_resolved",
    service: "pagerduty",
    type: "incident",
    external_id: "inc_resolved",
    title: "Old P1 (resolved)",
    url: null,
    modified_at: now - 2 * DAY,
    metadata: {
      status: "resolved",
      severity: "P1",
      pagerduty_service_id: "P12ABCD",
      opened_at_ms: now - 2 * DAY - 30 * MIN,
    },
  });

  // ---- CI runs ----
  ins(db, {
    id: "github_actions:ci_main_pass",
    service: "github_actions",
    type: "ci_run",
    external_id: "ci_main_pass",
    title: "CI lint",
    url: "https://github.com/nimbus-agent/payments/actions/runs/1",
    modified_at: now - 30 * MIN,
    metadata: {
      conclusion: "success",
      branch: "main",
      headSha: "sha_main_1",
      workflow_name: "CI lint",
    },
  });
  ins(db, {
    id: "github_actions:ci_main_fail",
    service: "github_actions",
    type: "ci_run",
    external_id: "ci_main_fail",
    title: "Build and Test",
    url: "https://github.com/nimbus-agent/payments/actions/runs/2",
    modified_at: now - 20 * MIN,
    metadata: {
      conclusion: "failure",
      branch: "main",
      headSha: "sha_main_2",
      workflow_name: "Build and Test",
    },
  });
  ins(db, {
    id: "github_actions:ci_feature_fail_1",
    service: "github_actions",
    type: "ci_run",
    external_id: "ci_feature_fail_1",
    title: "Build and Test",
    url: null,
    modified_at: now - 1 * HOUR,
    metadata: {
      conclusion: "failure",
      branch: "feature-x",
      headSha: "sha_feature_1",
      workflow_name: "Build and Test",
    },
  });
  ins(db, {
    id: "github_actions:ci_feature_fail_2",
    service: "github_actions",
    type: "ci_run",
    external_id: "ci_feature_fail_2",
    title: "Lint",
    url: null,
    modified_at: now - 2 * HOUR,
    metadata: {
      conclusion: "failure",
      branch: "feature-x",
      headSha: "sha_feature_2",
      workflow_name: "Lint",
    },
  });

  // ---- PRs ----
  ins(db, {
    id: "github:pr_dirty",
    service: "github",
    type: "pr",
    external_id: "nimbus-agent/payments#100",
    title: "Refactor billing retry",
    url: "https://github.com/nimbus-agent/payments/pull/100",
    modified_at: now - 1 * HOUR,
    metadata: {
      number: 100,
      state: "open",
      repo: "nimbus-agent/payments",
      mergeable_state: "dirty",
      mergeable: false,
      labels: [],
    },
  });
  ins(db, {
    id: "github:pr_clean",
    service: "github",
    type: "pr",
    external_id: "nimbus-agent/payments#101",
    title: "Add metric",
    url: "https://github.com/nimbus-agent/payments/pull/101",
    modified_at: now - 30 * MIN,
    metadata: {
      number: 101,
      state: "open",
      repo: "nimbus-agent/payments",
      mergeable_state: "clean",
      mergeable: true,
      labels: [],
    },
  });
  ins(db, {
    id: "github:pr_unknown",
    service: "github",
    type: "pr",
    external_id: "nimbus-agent/payments#102",
    title: "WIP big refactor",
    url: null,
    modified_at: now - 6 * HOUR,
    metadata: {
      number: 102,
      state: "open",
      repo: "nimbus-agent/payments",
      mergeable_state: null,
      labels: [],
    },
  });

  const config: ServiceConfig = {
    serviceId: "payment-service",
    repos: [{ provider: "github", providerId: "nimbus-agent/payments" }],
    pagerdutyServices: ["P12ABCD"],
    deployWorkflowPattern: /^[Dd]eploy/,
    incidentWindowMinutes: 60,
    excludePrLabels: ["revert"],
  };
  return { config };
}
```

- [ ] **Step 2: Hand-compute the expected envelope and save it**

Hand-computed values for the seeded fixture at `target_ref="main"`, `max_findings=10`:

| Check | count | gap | findings |
|---|---|---|---|
| `active_p1_incidents` | 1 | null | `pagerduty:inc_active` (resolved one excluded) |
| `failing_ci_runs` | 1 | null | `github_actions:ci_main_fail` (the feature-x failures excluded by branch filter) |
| `merge_conflicts` | 1 | `unknown_mergeable_state` | `github:pr_dirty` (`pr_unknown` has null → triggers gap but doesn't count) |

→ `verdict = "warn"` (every count > 0)

Create `packages/gateway/test/fixtures/preflight/payment-service/expected-envelope.json`:

```json
{
  "_derivation": "Hand-derived from seedPaymentServicePreflightFixture() at PREFLIGHT_FIXTURE_NOW_MS=1715000000000 with target_ref='main' and max_findings=10. active_p1_incidents=1 (inc_active triggered P1; inc_resolved excluded by status). failing_ci_runs=1 (ci_main_fail on main; the two feature-x failures excluded by branch; ci_main_pass excluded by conclusion). merge_conflicts=1 with gap='unknown_mergeable_state' (pr_dirty is dirty; pr_unknown has null mergeable_state which triggers the gap but doesn't count; pr_clean excluded). Verdict='warn' because every count > 0.",
  "service": "payment-service",
  "target_ref": "main",
  "verdict": "warn",
  "checks": {
    "active_p1_incidents": { "count": 1, "gap": null, "first_finding_id": "pagerduty:inc_active" },
    "failing_ci_runs": { "count": 1, "gap": null, "first_finding_id": "github_actions:ci_main_fail" },
    "merge_conflicts": { "count": 1, "gap": "unknown_mergeable_state", "first_finding_id": "github:pr_dirty" }
  }
}
```

(The JSON is a structural assertion target — the integration test reads it and asserts the relevant fields, not byte-for-byte equality of the full envelope.)

- [ ] **Step 3: Write the integration test**

Create `packages/gateway/test/integration/preflight/preflight-real-db.test.ts`:

```ts
import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runIndexedSchemaMigrations } from "../../../src/index/migrations/runner.ts";
import { computeDeployPreflight } from "../../../src/preflight/preflight.ts";
import {
  PREFLIGHT_FIXTURE_NOW_MS,
  seedPaymentServicePreflightFixture,
} from "../../fixtures/preflight/payment-service/seed.ts";

describe("preflight integration: payment-service fixture (real SQLite)", () => {
  let dir: string;
  let db: Database;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "nimbus-preflight-int-"));
    db = new Database(join(dir, "nimbus.db"));
    runIndexedSchemaMigrations(db, 27);
  });
  afterEach(() => {
    db.close();
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* non-fatal */ }
  });

  it("computes the envelope exactly against the hand-computed expected values", () => {
    const { config } = seedPaymentServicePreflightFixture(db);
    const out = computeDeployPreflight(db, config, "main", PREFLIGHT_FIXTURE_NOW_MS, 10);
    const expected = JSON.parse(
      readFileSync(
        join(import.meta.dir, "..", "..", "fixtures", "preflight", "payment-service", "expected-envelope.json"),
        "utf8",
      ),
    ) as {
      service: string;
      target_ref: string;
      verdict: "ok" | "warn";
      checks: Record<string, { count: number; gap: string | null; first_finding_id: string | null }>;
    };

    expect(out.service).toBe(expected.service);
    expect(out.target_ref).toBe(expected.target_ref);
    expect(out.verdict).toBe(expected.verdict);

    for (const key of ["active_p1_incidents", "failing_ci_runs", "merge_conflicts"] as const) {
      const got = out.checks[key];
      const want = expected.checks[key];
      if (want === undefined) throw new Error(`missing expected for ${key}`);
      expect(got.count, `${key} count`).toBe(want.count);
      expect(got.gap, `${key} gap`).toBe(want.gap);
      if (want.first_finding_id !== null) {
        expect(got.findings[0]?.id, `${key} first finding`).toBe(want.first_finding_id);
      }
    }
  });
});
```

- [ ] **Step 4: Run the test**

Run: `bun test packages/gateway/test/integration/preflight/preflight-real-db.test.ts`
Expected: PASS (1 case).

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/test/fixtures/preflight/ \
        packages/gateway/test/integration/preflight/preflight-real-db.test.ts
git commit -m "$(cat <<'EOF'
test(preflight): payment-service fixture + integration test

Deterministic seed: 2 PD incidents (1 active P1, 1 resolved), 4 CI runs
(1 main failure plus 1 main pass + 2 feature-x failures excluded by
branch filter), 3 open PRs (1 dirty, 1 clean, 1 null mergeable_state
that triggers the unknown_mergeable_state gap without counting).

Expected envelope hand-derived and stored alongside the seeder with a
_derivation key documenting the math. Phase 5 T4 PR 3a.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `deploy.preflight` IPC method + dispatcher wiring

**Files:**
- Create: `packages/gateway/src/ipc/preflight-rpc.ts`
- Modify: `packages/gateway/src/ipc/server/context.ts` (add `preflightRpcSkipped` sentinel)
- Modify: `packages/gateway/src/ipc/server/dispatchers.ts` (wire `tryDispatchPreflightRpc`)
- Test: `packages/gateway/test/unit/ipc/preflight-rpc.test.ts`

- [ ] **Step 1: Write the failing IPC test**

Create `packages/gateway/test/unit/ipc/preflight-rpc.test.ts`:

```ts
import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runIndexedSchemaMigrations } from "../../../src/index/migrations/runner.ts";
import { dispatchPreflightRpc, PreflightRpcError } from "../../../src/ipc/preflight-rpc.ts";
import {
  PREFLIGHT_FIXTURE_NOW_MS,
  seedPaymentServicePreflightFixture,
} from "../../fixtures/preflight/payment-service/seed.ts";

describe("preflight-rpc: deploy.preflight", () => {
  let dir: string;
  let db: Database;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "nimbus-preflight-rpc-"));
    db = new Database(join(dir, "nimbus.db"));
    runIndexedSchemaMigrations(db, 27);
  });
  afterEach(() => {
    db.close();
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* non-fatal */ }
  });

  it("returns a configured envelope for a fixture-seeded service", async () => {
    const { config } = seedPaymentServicePreflightFixture(db);
    const out = await dispatchPreflightRpc(
      "deploy.preflight",
      { service: "payment-service", target_ref: "main" },
      {
        db,
        loadConfig: () => new Map([[config.serviceId, config]]),
        nowMs: () => PREFLIGHT_FIXTURE_NOW_MS,
      },
    );
    if (out.kind !== "hit") throw new Error("expected hit");
    expect(out.value.service).toBe("payment-service");
    expect(out.value.verdict).toBe("warn");
  });

  it("returns an unconfigured envelope (all checks gapped) when service has no config", async () => {
    const out = await dispatchPreflightRpc(
      "deploy.preflight",
      { service: "unknown", target_ref: "main" },
      {
        db,
        loadConfig: () => new Map(),
        nowMs: () => PREFLIGHT_FIXTURE_NOW_MS,
      },
    );
    if (out.kind !== "hit") throw new Error("expected hit");
    expect(out.value.verdict).toBe("ok"); // count-only verdict; gaps don't flip it
    expect(out.value.checks.active_p1_incidents.gap).toBe("no_pagerduty_mapping");
    expect(out.value.checks.failing_ci_runs.gap).toBe("no_repos");
    expect(out.value.checks.merge_conflicts.gap).toBe("no_repos");
  });

  it("rejects array params with -32602", async () => {
    await expect(
      dispatchPreflightRpc("deploy.preflight", [{ service: "x", target_ref: "main" }], {
        db, loadConfig: () => new Map(), nowMs: () => PREFLIGHT_FIXTURE_NOW_MS,
      }),
    ).rejects.toThrow(PreflightRpcError);
  });

  it("rejects missing service param", async () => {
    await expect(
      dispatchPreflightRpc("deploy.preflight", { target_ref: "main" }, {
        db, loadConfig: () => new Map(), nowMs: () => PREFLIGHT_FIXTURE_NOW_MS,
      }),
    ).rejects.toThrow(/service/);
  });

  it("rejects missing target_ref param", async () => {
    await expect(
      dispatchPreflightRpc("deploy.preflight", { service: "x" }, {
        db, loadConfig: () => new Map(), nowMs: () => PREFLIGHT_FIXTURE_NOW_MS,
      }),
    ).rejects.toThrow(/target_ref/);
  });

  it("rejects out-of-range max_findings", async () => {
    await expect(
      dispatchPreflightRpc(
        "deploy.preflight",
        { service: "x", target_ref: "main", max_findings: 100 },
        { db, loadConfig: () => new Map(), nowMs: () => PREFLIGHT_FIXTURE_NOW_MS },
      ),
    ).rejects.toThrow(/max_findings/);
    await expect(
      dispatchPreflightRpc(
        "deploy.preflight",
        { service: "x", target_ref: "main", max_findings: 0 },
        { db, loadConfig: () => new Map(), nowMs: () => PREFLIGHT_FIXTURE_NOW_MS },
      ),
    ).rejects.toThrow(/max_findings/);
  });

  it("returns miss for an unknown method", async () => {
    const out = await dispatchPreflightRpc(
      "deploy.unknown",
      {},
      { db, loadConfig: () => new Map(), nowMs: () => PREFLIGHT_FIXTURE_NOW_MS },
    );
    expect(out.kind).toBe("miss");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/test/unit/ipc/preflight-rpc.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `preflight-rpc.ts`**

Create `packages/gateway/src/ipc/preflight-rpc.ts`:

```ts
/**
 * Phase 5 T4 PR 3a — `deploy.preflight` JSON-RPC handler.
 *
 * Surface: CLI, HTTP, and the GitHub Action — NOT LLM-facing. Security
 * invariant I11 (wrapToolOutput) therefore does not apply here. If a future
 * built-in agent registers `deploy.preflight` as a tool, the wrap must be
 * added at the agent's tool-registration site per `nimbus-tool-output-envelope`
 * (wrap at the agent surface, not in the tool handler).
 */
import type { Database } from "bun:sqlite";
import type { ServiceConfig } from "../metrics/dora-config.ts";
import { computeDeployPreflight, type DeployPreflightResult } from "../preflight/preflight.ts";

export class PreflightRpcError extends Error {
  readonly rpcCode: number;
  constructor(rpcCode: number, message: string) {
    super(message);
    this.name = "PreflightRpcError";
    this.rpcCode = rpcCode;
  }
}

export type PreflightRpcContext = {
  db: Database;
  loadConfig: () => Map<string, ServiceConfig>;
  nowMs?: () => number;
};

const MIN_SERVICE_LEN = 1;
const MAX_SERVICE_LEN = 64;
const MIN_TARGET_REF_LEN = 1;
const MAX_TARGET_REF_LEN = 255;
const DEFAULT_MAX_FINDINGS = 10;
const MIN_MAX_FINDINGS = 1;
const MAX_MAX_FINDINGS = 50;

function requireParams(
  params: unknown,
): { service: string; targetRef: string; maxFindings: number } {
  if (params === null || typeof params !== "object" || Array.isArray(params)) {
    throw new PreflightRpcError(
      -32602,
      "deploy.preflight requires { service: string, target_ref: string }",
    );
  }
  const p = params as {
    service?: unknown;
    target_ref?: unknown;
    max_findings?: unknown;
  };

  if (typeof p.service !== "string") {
    throw new PreflightRpcError(-32602, "service must be a string");
  }
  const service = p.service.trim();
  if (service.length < MIN_SERVICE_LEN || service.length > MAX_SERVICE_LEN) {
    throw new PreflightRpcError(
      -32602,
      `service must be ${MIN_SERVICE_LEN}..${MAX_SERVICE_LEN} chars`,
    );
  }

  if (typeof p.target_ref !== "string") {
    throw new PreflightRpcError(-32602, "target_ref must be a string");
  }
  const targetRef = p.target_ref.trim();
  if (
    targetRef.length < MIN_TARGET_REF_LEN ||
    targetRef.length > MAX_TARGET_REF_LEN
  ) {
    throw new PreflightRpcError(
      -32602,
      `target_ref must be ${MIN_TARGET_REF_LEN}..${MAX_TARGET_REF_LEN} chars`,
    );
  }

  const maxFindings =
    p.max_findings === undefined ? DEFAULT_MAX_FINDINGS : p.max_findings;
  if (
    typeof maxFindings !== "number" ||
    !Number.isInteger(maxFindings) ||
    maxFindings < MIN_MAX_FINDINGS ||
    maxFindings > MAX_MAX_FINDINGS
  ) {
    throw new PreflightRpcError(
      -32602,
      `max_findings must be an integer ${MIN_MAX_FINDINGS}..${MAX_MAX_FINDINGS}`,
    );
  }

  return { service, targetRef, maxFindings };
}

function unconfiguredEnvelope(
  service: string,
  targetRef: string,
  nowMs: number,
): DeployPreflightResult {
  return {
    service,
    target_ref: targetRef,
    computed_at: new Date(nowMs).toISOString(),
    verdict: "ok",
    checks: {
      active_p1_incidents: {
        count: 0,
        findings: [],
        gap: "no_pagerduty_mapping",
      },
      failing_ci_runs: { count: 0, findings: [], gap: "no_repos" },
      merge_conflicts: { count: 0, findings: [], gap: "no_repos" },
    },
  };
}

export async function dispatchPreflightRpc(
  method: string,
  params: unknown,
  ctx: PreflightRpcContext,
): Promise<{ kind: "miss" } | { kind: "hit"; value: DeployPreflightResult }> {
  if (method !== "deploy.preflight") return { kind: "miss" };
  const { service, targetRef, maxFindings } = requireParams(params);
  const nowMs = (ctx.nowMs ?? (() => Date.now()))();
  const configMap = ctx.loadConfig();
  const cfg = configMap.get(service);
  if (cfg === undefined) {
    return { kind: "hit", value: unconfiguredEnvelope(service, targetRef, nowMs) };
  }
  return {
    kind: "hit",
    value: computeDeployPreflight(ctx.db, cfg, targetRef, nowMs, maxFindings),
  };
}
```

- [ ] **Step 4: Add the dispatcher sentinel**

Modify `packages/gateway/src/ipc/server/context.ts`. Append next to the existing `metricsRpcSkipped` declaration:

```ts
export const preflightRpcSkipped: unique symbol = Symbol("preflightRpcSkipped");
```

- [ ] **Step 5: Wire `tryDispatchPreflightRpc` into the chain**

Modify `packages/gateway/src/ipc/server/dispatchers.ts`. Add imports near the existing `metrics-rpc` import block:

```ts
import { dispatchPreflightRpc, PreflightRpcError } from "../preflight-rpc.ts";
import { loadNimbusServiceConfigsFromConfigDir } from "../../config/nimbus-toml.ts";
```

(If `loadNimbusServiceConfigsFromConfigDir` is already imported because the metrics dispatcher needs it, just add the preflight import.)

Add the sentinel to the existing context-import block:

```ts
import {
  ...
  metricsRpcSkipped,
  preflightRpcSkipped,
  ...
} from "./context.ts";
```

Add `tryDispatchPreflightRpc` after `tryDispatchMetricsRpc` (mirror the metrics shape):

```ts
export async function tryDispatchPreflightRpc(
  ctx: ServerCtx,
  method: string,
  params: unknown,
): Promise<typeof preflightRpcSkipped | unknown> {
  if (!method.startsWith("deploy.") || ctx.options.localIndex === undefined) {
    return preflightRpcSkipped;
  }
  if (ctx.options.configDir === undefined) {
    throw new RpcMethodError(-32603, "configDir is required for deploy.* RPCs");
  }
  const configDir = ctx.options.configDir;
  try {
    const out = await dispatchPreflightRpc(method, params, {
      db: ctx.options.localIndex.getDatabase(),
      loadConfig: () => loadNimbusServiceConfigsFromConfigDir(configDir),
    });
    if (out.kind === "hit") return out.value;
  } catch (e) {
    if (e instanceof PreflightRpcError) {
      throw new RpcMethodError(e.rpcCode, e.message);
    }
    throw e;
  }
  return preflightRpcSkipped;
}
```

In the `tryDispatchPhase4Rpc` chain, after the metrics dispatch line, add:

```ts
  const preflightOutcome = await tryDispatchPreflightRpc(ctx, method, params);
  if (preflightOutcome !== preflightRpcSkipped) return preflightOutcome;
```

- [ ] **Step 6: Switch the metrics dispatcher to use the unified loader**

Inside `tryDispatchMetricsRpc` (also in `dispatchers.ts`), change `loadConfig: () => loadNimbusDoraFromConfigDir(configDir)` to `loadConfig: () => loadNimbusServiceConfigsFromConfigDir(configDir)`. This ensures DORA picks up `[ci.service.<id>]` aliases too, per Task 1's union loader. If `loadNimbusDoraFromConfigDir` is no longer used anywhere, leave the export in place (it's still a valid public API) but update the dispatcher to the unified loader.

Verify no test was asserting the metrics dispatcher uses the DORA-only loader; if so, update that test to the unified loader.

- [ ] **Step 7: Run tests to verify they pass**

Run: `bun test packages/gateway/test/unit/ipc/preflight-rpc.test.ts`
Expected: PASS (7 cases).

Run: `bun test packages/gateway/test/unit/ipc/metrics-rpc.test.ts`
Expected: PASS — DORA tests still green via the unified loader.

- [ ] **Step 8: Run typecheck**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/gateway/src/ipc/preflight-rpc.ts \
        packages/gateway/src/ipc/server/context.ts \
        packages/gateway/src/ipc/server/dispatchers.ts \
        packages/gateway/test/unit/ipc/preflight-rpc.test.ts
git commit -m "$(cat <<'EOF'
feat(ipc): deploy.preflight JSON-RPC method

Validates params (service: string, target_ref: string, optional
max_findings 1..50); resolves the service config via the unified
loadNimbusServiceConfigsFromConfigDir (covers both [metrics.dora.<id>]
and [ci.service.<id>] blocks); falls back to a fully-gapped envelope
with verdict='ok' when the service id has no config. Wired into
tryDispatchPhase4Rpc alongside metrics. Phase 5 T4 PR 3a.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `GET /v1/preflight/deploy` HTTP route + OpenAPI schema

**Files:**
- Modify: `packages/gateway/src/ipc/http-routes.ts`
- Modify: `packages/gateway/src/ipc/http-routes.test.ts`
- Modify: `packages/gateway/src/ipc/http-server.ts`
- Modify: `packages/gateway/openapi/v1.yaml`
- Test: `packages/gateway/test/integration/http/preflight-deploy-route.test.ts`

- [ ] **Step 1: Write the failing HTTP route test**

Create `packages/gateway/test/integration/http/preflight-deploy-route.test.ts`:

```ts
import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runIndexedSchemaMigrations } from "../../../src/index/migrations/runner.ts";
import { startReadOnlyHttpServer } from "../../../src/ipc/http-server.ts";
import {
  PREFLIGHT_FIXTURE_NOW_MS,
  seedPaymentServicePreflightFixture,
} from "../../fixtures/preflight/payment-service/seed.ts";

describe("GET /v1/preflight/deploy", () => {
  let dir: string;
  let handle: ReturnType<typeof startReadOnlyHttpServer> | undefined;
  let port: number;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "nimbus-preflight-http-"));
    const dbPath = join(dir, "nimbus.db");
    const db = new Database(dbPath);
    runIndexedSchemaMigrations(db, 27);
    seedPaymentServicePreflightFixture(db);
    db.close();
    writeFileSync(
      join(dir, "nimbus.toml"),
      `[metrics.dora.payment-service]
repos = ["github:nimbus-agent/payments"]
pagerduty_services = ["P12ABCD"]
`,
    );
    port = 30000 + Math.floor(Math.random() * 30000);
    handle = startReadOnlyHttpServer(dbPath, port, {
      configDir: dir,
      nowMs: () => PREFLIGHT_FIXTURE_NOW_MS,
    });
  });

  afterEach(() => {
    handle?.stop();
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* non-fatal */ }
  });

  it("returns the preflight envelope for a configured service", async () => {
    const res = await fetch(
      `http://127.0.0.1:${port}/v1/preflight/deploy?service=payment-service&target_ref=main`,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      service: string;
      target_ref: string;
      verdict: string;
      checks: Record<string, unknown>;
    };
    expect(body.service).toBe("payment-service");
    expect(body.target_ref).toBe("main");
    expect(body.verdict).toBe("warn");
    expect(body.checks).toHaveProperty("active_p1_incidents");
    expect(body.checks).toHaveProperty("failing_ci_runs");
    expect(body.checks).toHaveProperty("merge_conflicts");
  });

  it("returns 400 when service param is missing", async () => {
    const res = await fetch(
      `http://127.0.0.1:${port}/v1/preflight/deploy?target_ref=main`,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBeDefined();
  });

  it("returns 400 when target_ref param is missing", async () => {
    const res = await fetch(
      `http://127.0.0.1:${port}/v1/preflight/deploy?service=payment-service`,
    );
    expect(res.status).toBe(400);
  });

  it("returns generic 500 (no message leak) when the config loader throws", async () => {
    writeFileSync(
      join(dir, "nimbus.toml"),
      `[metrics.dora.payment-service]
repos = ["github:nimbus-agent/payments"]
deploy_workflow_pattern = "["
`,
    );
    const res = await fetch(
      `http://127.0.0.1:${port}/v1/preflight/deploy?service=payment-service&target_ref=main`,
    );
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("internal_error");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/gateway/test/integration/http/preflight-deploy-route.test.ts`
Expected: FAIL — route returns 404.

- [ ] **Step 3: Add the route to `http-routes.ts`**

Modify `packages/gateway/src/ipc/http-routes.ts`. Insert `{ method: "GET", path: "/v1/preflight/deploy" }` alphabetically. The full array should end up as:

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
  { method: "GET", path: "/v1/preflight/deploy" },
] as const);
```

(That puts `/v1/preflight/deploy` at the end alphabetically — after `people/{id}`.)

- [ ] **Step 4: Bump the count assertion in `http-routes.test.ts`**

Modify `packages/gateway/src/ipc/http-routes.test.ts`. Update the route-list assertion to 10 entries including `/v1/preflight/deploy` in alphabetical order. Rename the test title to reflect the new count, e.g.:

```ts
  it("includes the seven existing endpoints plus /v1/openapi.json, /v1/metrics/dora, and /v1/preflight/deploy", () => {
    const paths = READ_ONLY_HTTP_ROUTES.map((r) => r.path);
    expect(paths).toEqual([
      "/v1/audit",
      "/v1/connectors",
      "/v1/health",
      "/v1/items",
      "/v1/items/{id}",
      "/v1/metrics/dora",
      "/v1/openapi.json",
      "/v1/people",
      "/v1/people/{id}",
      "/v1/preflight/deploy",
    ]);
  });
```

- [ ] **Step 5: Add `handleDeployPreflight` and route dispatch in `http-server.ts`**

Modify `packages/gateway/src/ipc/http-server.ts`. Add a new handler next to `handleMetricsDora` (after the existing imports — `dispatchPreflightRpc` and `PreflightRpcError`):

```ts
import { dispatchPreflightRpc, PreflightRpcError } from "./preflight-rpc.ts";
import { loadNimbusServiceConfigsFromConfigDir } from "../config/nimbus-toml.ts";
```

(If `loadNimbusServiceConfigsFromConfigDir` is already imported from Task 5's metrics-rpc switch, don't duplicate the import.)

Add the handler:

```ts
async function handleDeployPreflight(
  url: URL,
  db: Database,
  opts: ReadOnlyHttpServerOptions,
): Promise<Response> {
  const service = url.searchParams.get("service");
  if (service === null || service === "") {
    return json({ error: "missing required query param: service" }, 400);
  }
  const targetRef = url.searchParams.get("target_ref");
  if (targetRef === null || targetRef === "") {
    return json({ error: "missing required query param: target_ref" }, 400);
  }
  const maxFindingsRaw = url.searchParams.get("max_findings");
  const maxFindings =
    maxFindingsRaw === null || maxFindingsRaw === ""
      ? undefined
      : Number.parseInt(maxFindingsRaw, 10);
  if (maxFindings !== undefined && !Number.isInteger(maxFindings)) {
    return json({ error: "max_findings must be an integer" }, 400);
  }
  let out: Awaited<ReturnType<typeof dispatchPreflightRpc>>;
  try {
    out = await dispatchPreflightRpc(
      "deploy.preflight",
      maxFindings === undefined
        ? { service, target_ref: targetRef }
        : { service, target_ref: targetRef, max_findings: maxFindings },
      {
        db,
        loadConfig: () =>
          opts.configDir === undefined
            ? new Map()
            : loadNimbusServiceConfigsFromConfigDir(opts.configDir),
        ...(opts.nowMs === undefined ? {} : { nowMs: opts.nowMs }),
      },
    );
  } catch (e) {
    // Same safe-error pattern as handleMetricsDora: only PreflightRpcError
    // surfaces as 400. Everything else bubbles to the outer fetch catch
    // which returns a generic 500.
    if (e instanceof PreflightRpcError) {
      return json({ error: e.message }, 400);
    }
    throw e;
  }
  if (out.kind === "miss") {
    throw new Error("deploy.preflight dispatcher returned miss");
  }
  return json(out.value);
}
```

In `dispatchReadOnlyGet`, add the new route alongside `/v1/metrics/dora`:

```ts
  if (path === "/v1/preflight/deploy") {
    return handleDeployPreflight(url, db, opts);
  }
```

- [ ] **Step 6: Replace the OpenAPI YAML stub with the full schema**

Modify `packages/gateway/openapi/v1.yaml`. If there's a reserved stub for `/v1/preflight/deploy`, replace it; otherwise append a new entry under `paths:` alphabetically. The operation:

```yaml
  /v1/preflight/deploy:
    get:
      operationId: getDeployPreflight
      summary: Pre-deploy index check for a configured service
      parameters:
        - in: query
          name: service
          required: true
          schema:
            type: string
        - in: query
          name: target_ref
          required: true
          schema:
            type: string
          description: The branch/ref being deployed.
        - in: query
          name: max_findings
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: 50
            default: 10
          description: Cap on findings per check.
      responses:
        "200":
          description: Preflight envelope.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/DeployPreflightResult"
        "400":
          description: Bad request (missing/invalid service, target_ref, or max_findings).
```

Add to `components.schemas`:

```yaml
    DeployPreflightResult:
      type: object
      required: [service, target_ref, computed_at, verdict, checks]
      properties:
        service: { type: string }
        target_ref: { type: string }
        computed_at: { type: string, format: date-time }
        verdict:
          type: string
          enum: [ok, warn]
        checks:
          type: object
          required: [active_p1_incidents, failing_ci_runs, merge_conflicts]
          properties:
            active_p1_incidents:
              $ref: "#/components/schemas/PreflightIncidentCheck"
            failing_ci_runs:
              $ref: "#/components/schemas/PreflightCiCheck"
            merge_conflicts:
              $ref: "#/components/schemas/PreflightPrCheck"
    PreflightIncidentCheck:
      type: object
      required: [count, findings, gap]
      properties:
        count: { type: integer }
        findings:
          type: array
          items: { $ref: "#/components/schemas/IncidentFinding" }
        gap: { $ref: "#/components/schemas/PreflightGap" }
    PreflightCiCheck:
      type: object
      required: [count, findings, gap]
      properties:
        count: { type: integer }
        findings:
          type: array
          items: { $ref: "#/components/schemas/CiFinding" }
        gap: { $ref: "#/components/schemas/PreflightGap" }
    PreflightPrCheck:
      type: object
      required: [count, findings, gap]
      properties:
        count: { type: integer }
        findings:
          type: array
          items: { $ref: "#/components/schemas/PrFinding" }
        gap: { $ref: "#/components/schemas/PreflightGap" }
    PreflightGap:
      nullable: true
      type: string
      enum: [no_pagerduty_mapping, no_repos, no_target_ref, unknown_mergeable_state]
    IncidentFinding:
      type: object
      required: [id, title, status, severity, opened_at_ms, pagerduty_service_id, url]
      properties:
        id: { type: string }
        title: { type: string }
        status:
          type: string
          enum: [triggered, acknowledged]
        severity: { type: string }
        opened_at_ms: { type: integer }
        pagerduty_service_id: { type: string }
        url:
          type: string
          nullable: true
    CiFinding:
      type: object
      required: [id, title, conclusion, modified_at_ms, branch, head_sha, url]
      properties:
        id: { type: string }
        title: { type: string }
        conclusion:
          type: string
          enum: [failure, cancelled, timed_out]
        modified_at_ms: { type: integer }
        branch: { type: string }
        head_sha:
          type: string
          nullable: true
        url:
          type: string
          nullable: true
    PrFinding:
      type: object
      required: [id, title, number, mergeable_state, modified_at_ms, url]
      properties:
        id: { type: string }
        title: { type: string }
        number: { type: integer }
        mergeable_state: { type: string }
        modified_at_ms: { type: integer }
        url:
          type: string
          nullable: true
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `bun test packages/gateway/test/integration/http/preflight-deploy-route.test.ts`
Expected: PASS (4 cases).

Run: `bun test packages/gateway/src/ipc/http-routes.test.ts`
Expected: PASS (3 cases — including the updated count assertion).

- [ ] **Step 8: Run the OpenAPI drift audit**

Run: `bun run audit:openapi-drift`
Expected: PASS — "schema and READ_ONLY_HTTP_ROUTES agree (10 routes)".

- [ ] **Step 9: Run typecheck**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add packages/gateway/src/ipc/http-routes.ts \
        packages/gateway/src/ipc/http-routes.test.ts \
        packages/gateway/src/ipc/http-server.ts \
        packages/gateway/openapi/v1.yaml \
        packages/gateway/test/integration/http/preflight-deploy-route.test.ts
git commit -m "$(cat <<'EOF'
feat(http): GET /v1/preflight/deploy + OpenAPI schema

Adds the read-only HTTP endpoint that wraps deploy.preflight. Mirrors
the metrics.dora pattern: only PreflightRpcError surfaces as 400;
everything else bubbles to the outer fetch catch which returns a
generic 500 (CodeQL-safe error handling).

OpenAPI v1.yaml extended with DeployPreflightResult and per-check
+ per-finding component schemas. audit:openapi-drift gate verifies
the YAML and READ_ONLY_HTTP_ROUTES agree at 10 routes.

Phase 5 T4 PR 3a.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: CLI `nimbus deploy preflight`

**Files:**
- Create: `packages/cli/src/commands/deploy.ts`
- Create: `packages/cli/src/commands/deploy.test.ts`
- Modify: `packages/cli/src/index.ts` (or whatever registers commands — adapt to current CLI structure)
- Modify: `packages/cli/src/commands/registry.ts` (per PR 258 pattern, if present)
- Modify: `packages/cli/src/commands/help.ts`
- Create: `packages/cli/test/e2e/deploy.smoke.e2e.test.ts`
- Create: `packages/gateway/test/e2e/scenarios/preflight-deploy.e2e.test.ts`

**Context:** Mirror the `nimbus metrics dora` command shape from T4 PR 2. Read `packages/cli/src/commands/metrics.ts` end-to-end before authoring `deploy.ts` so you match the existing patterns (IPC client construction, `readGatewayState`, NO_COLOR handling, error → exit code mapping).

- [ ] **Step 1: Write the failing arg-parser test**

Create `packages/cli/src/commands/deploy.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { parseDeployPreflightArgs } from "./deploy.ts";

describe("nimbus deploy preflight arg parser", () => {
  it("parses service + target-ref + json", () => {
    const out = parseDeployPreflightArgs([
      "--service", "payment-service",
      "--target-ref", "main",
      "--json",
    ]);
    expect(out).toEqual({
      service: "payment-service",
      targetRef: "main",
      mode: "warn",
      json: false === false ? true : true,
    } as unknown);
    expect(out.json).toBe(true);
    expect(out.mode).toBe("warn");
  });

  it("defaults mode to 'warn' and json to false", () => {
    const out = parseDeployPreflightArgs(["--service", "x", "--target-ref", "main"]);
    expect(out.mode).toBe("warn");
    expect(out.json).toBe(false);
  });

  it("accepts --mode block", () => {
    const out = parseDeployPreflightArgs([
      "--service", "x", "--target-ref", "main", "--mode", "block",
    ]);
    expect(out.mode).toBe("block");
  });

  it("accepts --mode off", () => {
    const out = parseDeployPreflightArgs([
      "--service", "x", "--target-ref", "main", "--mode", "off",
    ]);
    expect(out.mode).toBe("off");
  });

  it("rejects unknown --mode value", () => {
    expect(() =>
      parseDeployPreflightArgs([
        "--service", "x", "--target-ref", "main", "--mode", "explode",
      ]),
    ).toThrow(/--mode/);
  });

  it("throws on missing --service", () => {
    expect(() =>
      parseDeployPreflightArgs(["--target-ref", "main"]),
    ).toThrow(/--service/);
  });

  it("throws on missing --target-ref", () => {
    expect(() =>
      parseDeployPreflightArgs(["--service", "x"]),
    ).toThrow(/--target-ref/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && bun test src/commands/deploy.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the CLI command**

Create `packages/cli/src/commands/deploy.ts`. **Before writing, read `packages/cli/src/commands/metrics.ts`** — replicate its IPC client + `readGatewayState` + error-handling pattern exactly. Use this code, adapting only the imports/utilities to whatever `metrics.ts` actually uses:

```ts
import { IPCClient } from "../ipc-client/index.ts";
import { readGatewayState } from "../lib/gateway-process.ts";
import { getCliPlatformPaths } from "../paths.ts";

export type DeployPreflightMode = "warn" | "block" | "off";

export type DeployPreflightArgs = {
  readonly service: string;
  readonly targetRef: string;
  readonly mode: DeployPreflightMode;
  readonly json: boolean;
};

const MODES: ReadonlySet<DeployPreflightMode> = new Set(["warn", "block", "off"]);

export function parseDeployPreflightArgs(args: readonly string[]): DeployPreflightArgs {
  let service: string | undefined;
  let targetRef: string | undefined;
  let mode: DeployPreflightMode = "warn";
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
    if (a === "--target-ref") {
      const v = args[i + 1];
      if (typeof v !== "string" || v.trim().length === 0) {
        throw new Error("--target-ref requires a non-empty value");
      }
      targetRef = v.trim();
      i += 1;
      continue;
    }
    if (a === "--mode") {
      const v = args[i + 1];
      if (typeof v !== "string" || !MODES.has(v as DeployPreflightMode)) {
        throw new Error(
          "--mode must be one of: warn, block, off",
        );
      }
      mode = v as DeployPreflightMode;
      i += 1;
      continue;
    }
    if (a === "--json") {
      json = true;
      continue;
    }
  }
  if (service === undefined) {
    throw new Error(
      "Usage: nimbus deploy preflight --service <id> --target-ref <ref> [--mode warn|block|off] [--json]",
    );
  }
  if (targetRef === undefined) {
    throw new Error(
      "Usage: nimbus deploy preflight --service <id> --target-ref <ref> [--mode warn|block|off] [--json]",
    );
  }
  return { service, targetRef, mode, json };
}

type Finding = { id: string; title: string; url: string | null };
type CheckShape = {
  count: number;
  findings: readonly Finding[];
  gap: string | null;
};
type Envelope = {
  service: string;
  target_ref: string;
  verdict: "ok" | "warn";
  computed_at: string;
  checks: Record<string, CheckShape>;
};

function isEnvelope(x: unknown): x is Envelope {
  if (x === null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.service === "string" &&
    typeof o.target_ref === "string" &&
    (o.verdict === "ok" || o.verdict === "warn") &&
    typeof o.checks === "object" &&
    o.checks !== null
  );
}

function shouldUseColor(): boolean {
  if (process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== "") return false;
  return process.stdout.isTTY === true;
}

function formatPretty(env: Envelope, useColor: boolean): string {
  const lines: string[] = [];
  const verdictTag =
    env.verdict === "ok"
      ? (useColor ? "\x1b[32m[ok]\x1b[0m" : "[ok]")
      : (useColor ? "\x1b[33m[warn]\x1b[0m" : "[warn]");
  lines.push(`Deploy preflight — ${env.service} @ ${env.target_ref}  ${verdictTag}`);
  lines.push("");
  const labels: Record<string, string> = {
    active_p1_incidents: "Active P1 incidents",
    failing_ci_runs: "Failing CI runs",
    merge_conflicts: "Open PR merge conflicts",
  };
  for (const key of ["active_p1_incidents", "failing_ci_runs", "merge_conflicts"]) {
    const m = env.checks[key];
    if (m === undefined) continue;
    const gap = m.gap === null ? "" : useColor ? `\x1b[2m[${m.gap}]\x1b[0m` : `[${m.gap}]`;
    lines.push(`  ${labels[key].padEnd(28)} ${String(m.count).padStart(4)}  ${gap}`);
    for (const f of m.findings.slice(0, 3)) {
      lines.push(`      • ${f.title}${f.url ? `  ${f.url}` : ""}`);
    }
  }
  return lines.join("\n");
}

const TIMEOUT_MS = 30_000;

export async function runDeployCli(args: readonly string[]): Promise<void> {
  if (args[0] !== "preflight") {
    process.stderr.write("Usage: nimbus deploy preflight --service <id> --target-ref <ref>\n");
    process.exit(1);
  }
  let parsed: DeployPreflightArgs;
  try {
    parsed = parseDeployPreflightArgs(args.slice(1));
  } catch (e) {
    process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  }
  const paths = getCliPlatformPaths();
  const state = await readGatewayState(paths);
  if (state === undefined) {
    process.stderr.write("Gateway is not running. Start with: nimbus start\n");
    process.exit(2);
  }
  const client = new IPCClient(state.socketPath);
  await client.connect();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const responsePromise = client.call<unknown>("deploy.preflight", {
      service: parsed.service,
      target_ref: parsed.targetRef,
    });
    timeout = setTimeout(() => {
      throw new Error("deploy.preflight timed out after 30 s");
    }, TIMEOUT_MS);
    const result = await responsePromise;
    if (!isEnvelope(result)) {
      process.stderr.write("deploy.preflight returned a malformed envelope\n");
      process.exit(2);
    }
    if (parsed.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      process.stdout.write(`${formatPretty(result, shouldUseColor())}\n`);
    }
    // Exit-code convention (consistent across nimbus subcommands):
    //   0  = success (verdict ok, OR warn with mode≠block)
    //   1  = user/logic error: usage problems (handled earlier via thrown
    //        Error → exit 1) AND the explicit "block triggered" outcome.
    //        These share code 1 by design: from a CI script's POV, both
    //        mean "the deploy step should not proceed."
    //   2  = infrastructure: gateway not running, IPC error, malformed
    //        envelope. Distinguishes "couldn't check" from "checked and
    //        found things." Matches `nimbus metrics dora`'s convention.
    if (parsed.mode === "block" && result.verdict === "warn") {
      process.exit(1);
    }
    // warn (default) and off → exit 0 regardless of verdict
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(2);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
    await client.disconnect();
  }
}
```

- [ ] **Step 4: Register the subcommand**

Modify `packages/cli/src/index.ts` (or the equivalent command dispatcher). Add:

```ts
if (cmd === "deploy") {
  const { runDeployCli } = await import("./commands/deploy.ts");
  await runDeployCli(args);
  return;
}
```

If the CLI uses `packages/cli/src/commands/registry.ts` (the post-PR-258 pattern), add an entry there. Also re-export from `packages/cli/src/commands/index.ts` if other commands are re-exported there. Mirror exactly how `metrics` was wired in T4 PR 2.

- [ ] **Step 5: Update the help output**

Modify `packages/cli/src/commands/help.ts`. Find the existing `metrics dora` help line; add immediately after it:

```text
  deploy preflight  Run the pre-deploy index check for a configured service
```

(Use the same indentation/format the file currently uses.)

- [ ] **Step 6: Run the arg-parser tests**

Run: `cd packages/cli && bun test src/commands/deploy.test.ts`
Expected: PASS (7 cases).

- [ ] **Step 7: Write the smoke e2e test**

Create `packages/cli/test/e2e/deploy.smoke.e2e.test.ts`. Mirror `impact.smoke.e2e.test.ts` shape. Cover at minimum:

```ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { spawn } from "bun";

// The exact harness depends on what impact.smoke.e2e.test.ts already
// uses. The four cases to cover:
//   1. Gateway not running → exit code 2 + stderr message
//   2. Missing --service → exit code 1 + usage message
//   3. Unknown --mode value → exit code 1
//   4. `nimbus help` includes the deploy preflight line

describe("nimbus deploy preflight (no Gateway)", () => {
  it("exits 2 with a clear message when Gateway is not running", async () => {
    const proc = spawn({
      cmd: ["bun", "run", "packages/cli/src/index.ts", "deploy", "preflight",
            "--service", "payment-service", "--target-ref", "main"],
      stderr: "pipe",
      stdout: "pipe",
      env: { ...process.env, NIMBUS_HOME: "/tmp/nimbus-test-no-gateway" },
    });
    await proc.exited;
    expect(proc.exitCode).toBe(2);
    const stderr = await new Response(proc.stderr).text();
    expect(stderr).toMatch(/Gateway is not running/);
  });

  it("exits 1 on missing --service", async () => {
    const proc = spawn({
      cmd: ["bun", "run", "packages/cli/src/index.ts", "deploy", "preflight",
            "--target-ref", "main"],
      stderr: "pipe",
      stdout: "pipe",
    });
    await proc.exited;
    expect(proc.exitCode).toBe(1);
    const stderr = await new Response(proc.stderr).text();
    expect(stderr).toMatch(/--service/);
  });

  it("exits 1 on unknown --mode value", async () => {
    const proc = spawn({
      cmd: ["bun", "run", "packages/cli/src/index.ts", "deploy", "preflight",
            "--service", "x", "--target-ref", "main", "--mode", "explode"],
      stderr: "pipe",
      stdout: "pipe",
    });
    await proc.exited;
    expect(proc.exitCode).toBe(1);
    const stderr = await new Response(proc.stderr).text();
    expect(stderr).toMatch(/--mode/);
  });

  it("`nimbus help` mentions deploy preflight", async () => {
    const proc = spawn({
      cmd: ["bun", "run", "packages/cli/src/index.ts", "help"],
      stdout: "pipe",
    });
    await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    expect(stdout).toMatch(/deploy preflight/);
  });
});
```

(If `impact.smoke.e2e.test.ts` uses a different spawn harness — `Bun.spawnSync`, a helper — mirror exactly. Don't invent a new pattern.)

- [ ] **Step 8: Run smoke tests**

Run: `bun test packages/cli/test/e2e/deploy.smoke.e2e.test.ts`
Expected: PASS (4 cases).

- [ ] **Step 9: Write the in-process e2e test**

Create `packages/gateway/test/e2e/scenarios/preflight-deploy.e2e.test.ts`. Mirror `impact.e2e.test.ts` (in-process) shape. Two cases:

```ts
import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runIndexedSchemaMigrations } from "../../../src/index/migrations/runner.ts";
import { dispatchPreflightRpc } from "../../../src/ipc/preflight-rpc.ts";
import {
  PREFLIGHT_FIXTURE_NOW_MS,
  seedPaymentServicePreflightFixture,
} from "../../fixtures/preflight/payment-service/seed.ts";

describe("E2E (in-process): deploy.preflight", () => {
  let dir: string;
  let db: Database;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "nimbus-preflight-e2e-"));
    db = new Database(join(dir, "nimbus.db"));
    runIndexedSchemaMigrations(db, 27);
  });
  afterEach(() => {
    db.close();
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* non-fatal */ }
  });

  it("returns a warn-verdict envelope on the fixture", async () => {
    const { config } = seedPaymentServicePreflightFixture(db);
    const out = await dispatchPreflightRpc(
      "deploy.preflight",
      { service: "payment-service", target_ref: "main" },
      {
        db,
        loadConfig: () => new Map([[config.serviceId, config]]),
        nowMs: () => PREFLIGHT_FIXTURE_NOW_MS,
      },
    );
    if (out.kind !== "hit") throw new Error("expected hit");
    expect(out.value.verdict).toBe("warn");
    expect(out.value.checks.active_p1_incidents.count).toBe(1);
    expect(out.value.checks.failing_ci_runs.count).toBe(1);
    expect(out.value.checks.merge_conflicts.count).toBe(1);
  });

  it("returns ok+gaps envelope when the service has no config", async () => {
    const out = await dispatchPreflightRpc(
      "deploy.preflight",
      { service: "unknown-service", target_ref: "main" },
      {
        db,
        loadConfig: () => new Map(),
        nowMs: () => PREFLIGHT_FIXTURE_NOW_MS,
      },
    );
    if (out.kind !== "hit") throw new Error("expected hit");
    expect(out.value.verdict).toBe("ok");
    expect(out.value.checks.active_p1_incidents.gap).toBe("no_pagerduty_mapping");
  });
});
```

- [ ] **Step 10: Run in-process e2e**

Run: `bun test packages/gateway/test/e2e/scenarios/preflight-deploy.e2e.test.ts`
Expected: PASS (2 cases).

- [ ] **Step 11: Typecheck across all packages**

Run: `bun run typecheck`
Expected: PASS (gateway, cli, others all green).

- [ ] **Step 12: Commit**

```bash
git add packages/cli/src/commands/deploy.ts \
        packages/cli/src/commands/deploy.test.ts \
        packages/cli/src/index.ts \
        packages/cli/src/commands/help.ts \
        packages/cli/src/commands/registry.ts \
        packages/cli/src/commands/index.ts \
        packages/cli/test/e2e/deploy.smoke.e2e.test.ts \
        packages/gateway/test/e2e/scenarios/preflight-deploy.e2e.test.ts
git commit -m "$(cat <<'EOF'
feat(cli): nimbus deploy preflight --service <id> --target-ref <ref>

Pretty mode renders a labelled card (NO_COLOR / non-TTY → plain ASCII).
--json emits the IPC envelope verbatim. --mode controls exit code:
  warn (default) → exit 0
  block          → exit 1 when verdict='warn'
  off            → exit 0 always
Runtime envelope typeguard exits 2 on malformed responses.

Smoke tests cover gateway-not-running, missing args, unknown mode, and
help integration. In-process e2e validates the envelope shape against
the seeded payment-service fixture.

Phase 5 T4 PR 3a.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

> **Note** (from spec §10 open question): if `packages/cli/src/commands/index.ts` or `registry.ts` don't exist in your branch, stage only the files that do. Match what `metrics` actually wires into.

---

## Task 8: GitHub Action `nimbus-agent/query-action`

**Files:**
- Create: `packages/github-actions/preflight-query/action.yml`
- Create: `packages/github-actions/preflight-query/package.json`
- Create: `packages/github-actions/preflight-query/README.md`
- Create: `packages/github-actions/preflight-query/src/main.ts`
- Create: `packages/github-actions/preflight-query/src/render.ts`
- Create: `packages/github-actions/preflight-query/src/render.test.ts`
- Create: `packages/github-actions/preflight-query/src/main.test.ts`
- Create: `packages/github-actions/preflight-query/dist/index.js` (built — committed)

**Context:** A JS action (Node 20 runtime). Source authored in the monorepo; built artifact also committed. The release workflow that copies to `nimbus-agent/query-action` is out of scope for this PR — it's a separate infrastructure setup that happens after the v0.1.0 tag.

- [ ] **Step 1: Create the package skeleton**

Create `packages/github-actions/preflight-query/package.json`:

```json
{
  "name": "@nimbus-dev/action-preflight",
  "version": "0.1.0",
  "private": true,
  "description": "First-party GitHub Action for the Nimbus pre-deploy index check (Phase 5 T4 PR 3a).",
  "license": "AGPL-3.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "bun build src/main.ts --target=node --outfile=dist/index.js",
    "test": "bun test"
  },
  "devDependencies": {}
}
```

Create `packages/github-actions/preflight-query/action.yml`:

```yaml
name: "Nimbus pre-deploy index check"
description: >
  Queries the local Nimbus Gateway for active P1 incidents on the target
  service, failing CI runs on the target branch, and open PRs with merge
  conflicts. Annotates the workflow and (optionally) blocks the deploy.
author: "Nimbus"
branding:
  icon: shield
  color: blue

inputs:
  service:
    description: "Nimbus service id (matches [metrics.dora.<id>] or [ci.service.<id>] in nimbus.toml)."
    required: true
  target-ref:
    description: "Branch/ref being deployed."
    required: false
    default: ${{ github.ref_name }}
  gateway-url:
    description: "Base URL of the Gateway's read-only HTTP API. Self-hosted runner default."
    required: false
    default: "http://localhost:7474"
  mode:
    description: "warn | block | off (default 'warn')."
    required: false
    default: "warn"
  max-findings:
    description: "Cap on findings per check (1..50)."
    required: false
    default: "10"
  timeout-ms:
    description: "HTTP timeout in milliseconds."
    required: false
    default: "10000"
  allow-gateway-failure:
    description: "When 'true', an unreachable Gateway never fails the workflow regardless of mode."
    required: false
    default: "false"

outputs:
  verdict:
    description: "ok | warn | block"
  incident-count:
    description: "Number of active P1 incidents."
  failing-ci-count:
    description: "Number of failing CI runs on target_ref."
  merge-conflict-count:
    description: "Number of open PRs with merge conflicts."
  result-json:
    description: "Full envelope JSON serialized."

runs:
  using: "node20"
  main: "dist/index.js"
```

- [ ] **Step 2: Write the failing render tests**

Create `packages/github-actions/preflight-query/src/render.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { renderJobSummary, renderAnnotations } from "./render.ts";

const envOk = {
  service: "payment-service",
  target_ref: "main",
  computed_at: "2026-05-12T10:15:30.000Z",
  verdict: "ok" as const,
  checks: {
    active_p1_incidents: { count: 0, findings: [], gap: null },
    failing_ci_runs: { count: 0, findings: [], gap: null },
    merge_conflicts: { count: 0, findings: [], gap: null },
  },
};

const envWarn = {
  service: "payment-service",
  target_ref: "main",
  computed_at: "2026-05-12T10:15:30.000Z",
  verdict: "warn" as const,
  checks: {
    active_p1_incidents: {
      count: 1,
      findings: [{
        id: "pagerduty:inc_1",
        title: "DB connection pool exhausted",
        status: "triggered" as const,
        severity: "P1",
        opened_at_ms: 1715000000000,
        pagerduty_service_id: "P12ABCD",
        url: "https://example.pagerduty.com/incidents/inc_1",
      }],
      gap: null,
    },
    failing_ci_runs: { count: 0, findings: [], gap: null },
    merge_conflicts: { count: 0, findings: [], gap: null },
  },
};

describe("renderJobSummary", () => {
  it("renders a verdict-ok summary with three zero-count rows", () => {
    const md = renderJobSummary(envOk);
    expect(md).toContain("payment-service");
    expect(md).toContain("ok");
    expect(md).toContain("Active P1 incidents");
    expect(md).toContain("Failing CI runs");
    expect(md).toContain("Merge conflicts");
  });

  it("includes finding titles in collapsed details when a check has findings", () => {
    const md = renderJobSummary(envWarn);
    expect(md).toContain("DB connection pool exhausted");
  });

  it("includes the gap label when a check is gapped", () => {
    const env = {
      ...envOk,
      checks: {
        ...envOk.checks,
        active_p1_incidents: { count: 0, findings: [], gap: "no_pagerduty_mapping" as const },
      },
    };
    const md = renderJobSummary(env);
    expect(md).toContain("no_pagerduty_mapping");
  });
});

describe("renderAnnotations", () => {
  it("returns one ::warning per finding when verdict=warn", () => {
    const annotations = renderAnnotations(envWarn, "warn");
    expect(annotations.length).toBe(1);
    expect(annotations[0]?.level).toBe("warning");
    expect(annotations[0]?.message).toContain("DB connection pool exhausted");
  });

  it("returns one ::error per finding when mode=block (escalates level)", () => {
    const annotations = renderAnnotations(envWarn, "block");
    expect(annotations.length).toBe(1);
    expect(annotations[0]?.level).toBe("error");
  });

  it("returns no annotations when verdict=ok and no gaps", () => {
    const annotations = renderAnnotations(envOk, "warn");
    expect(annotations.length).toBe(0);
  });
});
```

- [ ] **Step 3: Run render tests to verify they fail**

Run: `cd packages/github-actions/preflight-query && bun test src/render.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `render.ts`**

Create `packages/github-actions/preflight-query/src/render.ts`:

```ts
export type PreflightMode = "warn" | "block" | "off";

export type Finding = {
  id: string;
  title: string;
  url?: string | null;
  // Per-check shape varies; the renderer only consumes id/title/url.
};

export type Check = {
  count: number;
  findings: readonly Finding[];
  gap: string | null;
};

export type Envelope = {
  service: string;
  target_ref: string;
  computed_at: string;
  verdict: "ok" | "warn";
  checks: {
    active_p1_incidents: Check;
    failing_ci_runs: Check;
    merge_conflicts: Check;
  };
};

const CHECK_LABELS: Record<string, string> = {
  active_p1_incidents: "Active P1 incidents",
  failing_ci_runs: "Failing CI runs",
  merge_conflicts: "Merge conflicts",
};

const CHECK_ORDER = [
  "active_p1_incidents",
  "failing_ci_runs",
  "merge_conflicts",
] as const;

export function renderJobSummary(env: Envelope): string {
  const lines: string[] = [];
  lines.push(`### Nimbus pre-deploy preflight — ${env.service} @ \`${env.target_ref}\``);
  lines.push("");
  lines.push(`**Verdict:** \`${env.verdict}\``);
  lines.push(`**Computed at:** ${env.computed_at}`);
  lines.push("");
  lines.push("| Check | Count | Gap |");
  lines.push("|---|---:|---|");
  for (const key of CHECK_ORDER) {
    const m = env.checks[key];
    const gap = m.gap === null ? "" : `\`${m.gap}\``;
    lines.push(`| ${CHECK_LABELS[key]} | ${m.count} | ${gap} |`);
  }
  for (const key of CHECK_ORDER) {
    const m = env.checks[key];
    if (m.findings.length === 0) continue;
    lines.push("");
    lines.push(`<details><summary>${CHECK_LABELS[key]} (${m.count})</summary>`);
    lines.push("");
    for (const f of m.findings) {
      const linkPart = f.url ? ` — ${f.url}` : "";
      lines.push(`- \`${f.id}\` — ${f.title}${linkPart}`);
    }
    lines.push("</details>");
  }
  return lines.join("\n");
}

export type Annotation = {
  level: "warning" | "error";
  message: string;
  url?: string | null;
};

export function renderAnnotations(env: Envelope, mode: PreflightMode): Annotation[] {
  if (env.verdict === "ok") return [];
  const level: Annotation["level"] = mode === "block" ? "error" : "warning";
  const out: Annotation[] = [];
  for (const key of CHECK_ORDER) {
    const m = env.checks[key];
    for (const f of m.findings) {
      out.push({
        level,
        message: `[${CHECK_LABELS[key]}] ${f.title} (${f.id})`,
        url: f.url ?? null,
      });
    }
  }
  return out;
}

/**
 * Maps server verdict + mode + reachability to the Action's exit code.
 * Per spec §6.5 (with the allow-gateway-failure escape hatch).
 */
export function decideExitCode(args: {
  verdict: "ok" | "warn";
  mode: PreflightMode;
  unreachable: boolean;
  allowGatewayFailure: boolean;
}): 0 | 1 {
  if (args.unreachable) {
    if (args.allowGatewayFailure) return 0;
    return args.mode === "block" ? 1 : 0;
  }
  if (args.mode === "block" && args.verdict === "warn") return 1;
  return 0;
}
```

- [ ] **Step 5: Re-run render tests**

Run: `cd packages/github-actions/preflight-query && bun test src/render.test.ts`
Expected: PASS.

- [ ] **Step 6: Write the failing main test**

Create `packages/github-actions/preflight-query/src/main.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { decideExitCode } from "./render.ts";

describe("decideExitCode", () => {
  it("mode=warn, verdict=ok → 0", () => {
    expect(decideExitCode({ verdict: "ok", mode: "warn", unreachable: false, allowGatewayFailure: false })).toBe(0);
  });
  it("mode=warn, verdict=warn → 0", () => {
    expect(decideExitCode({ verdict: "warn", mode: "warn", unreachable: false, allowGatewayFailure: false })).toBe(0);
  });
  it("mode=block, verdict=ok → 0", () => {
    expect(decideExitCode({ verdict: "ok", mode: "block", unreachable: false, allowGatewayFailure: false })).toBe(0);
  });
  it("mode=block, verdict=warn → 1", () => {
    expect(decideExitCode({ verdict: "warn", mode: "block", unreachable: false, allowGatewayFailure: false })).toBe(1);
  });
  it("mode=off, verdict=warn → 0", () => {
    expect(decideExitCode({ verdict: "warn", mode: "off", unreachable: false, allowGatewayFailure: false })).toBe(0);
  });
  it("mode=block, unreachable, allow-gateway-failure=false → 1", () => {
    expect(decideExitCode({ verdict: "ok", mode: "block", unreachable: true, allowGatewayFailure: false })).toBe(1);
  });
  it("mode=block, unreachable, allow-gateway-failure=true → 0", () => {
    expect(decideExitCode({ verdict: "ok", mode: "block", unreachable: true, allowGatewayFailure: true })).toBe(0);
  });
  it("mode=warn, unreachable → 0 regardless of allow-gateway-failure", () => {
    expect(decideExitCode({ verdict: "ok", mode: "warn", unreachable: true, allowGatewayFailure: false })).toBe(0);
    expect(decideExitCode({ verdict: "ok", mode: "warn", unreachable: true, allowGatewayFailure: true })).toBe(0);
  });
});
```

- [ ] **Step 7: Run main tests**

Run: `cd packages/github-actions/preflight-query && bun test src/main.test.ts`
Expected: PASS (8 cases).

- [ ] **Step 8: Implement `main.ts`**

Create `packages/github-actions/preflight-query/src/main.ts`:

```ts
import { appendFileSync } from "node:fs";
import {
  decideExitCode,
  renderAnnotations,
  renderJobSummary,
  type Envelope,
  type PreflightMode,
} from "./render.ts";

function getInput(name: string): string {
  // GitHub Actions inputs land in env as INPUT_<NAME> with hyphens → underscores.
  const envName = `INPUT_${name.toUpperCase().replaceAll("-", "_")}`;
  return process.env[envName] ?? "";
}

function getBooleanInput(name: string): boolean {
  const raw = getInput(name).toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

function getIntInput(name: string, fallback: number): number {
  const raw = getInput(name);
  if (raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) ? n : fallback;
}

function setOutput(name: string, value: string): void {
  const outFile = process.env.GITHUB_OUTPUT;
  if (outFile === undefined) return;
  // Use the delimiter form so multi-line values (result-json) work.
  const delim = `EOF_${Math.random().toString(36).slice(2)}`;
  appendFileSync(outFile, `${name}<<${delim}\n${value}\n${delim}\n`);
}

function writeJobSummary(md: string): void {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (file === undefined) return;
  appendFileSync(file, `${md}\n`);
}

function emitAnnotation(level: "warning" | "error", message: string): void {
  // GitHub Actions workflow-command format.
  process.stdout.write(`::${level}::${message}\n`);
}

function parseMode(raw: string): PreflightMode {
  if (raw === "block" || raw === "off") return raw;
  return "warn";
}

async function fetchEnvelope(
  gatewayUrl: string,
  service: string,
  targetRef: string,
  maxFindings: number,
  timeoutMs: number,
): Promise<{ status: "ok"; envelope: Envelope } | { status: "unreachable" }> {
  const url = new URL("/v1/preflight/deploy", gatewayUrl);
  url.searchParams.set("service", service);
  url.searchParams.set("target_ref", targetRef);
  url.searchParams.set("max_findings", String(maxFindings));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      // 4xx/5xx from the Gateway → treat as unreachable for exit-code purposes.
      // (A real misconfiguration would be a 400; users still want a clear log.)
      const body = await res.text();
      emitAnnotation(
        "warning",
        `Gateway returned ${res.status} for /v1/preflight/deploy: ${body.slice(0, 200)}`,
      );
      return { status: "unreachable" };
    }
    const envelope = (await res.json()) as Envelope;
    return { status: "ok", envelope };
  } catch (e) {
    emitAnnotation(
      "warning",
      `Nimbus Gateway unreachable at ${gatewayUrl}: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
    return { status: "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

export async function main(): Promise<void> {
  const service = getInput("service");
  if (service === "") {
    emitAnnotation("error", "missing required input: service");
    process.exit(1);
  }
  const targetRef = getInput("target-ref");
  if (targetRef === "") {
    emitAnnotation("error", "missing required input: target-ref");
    process.exit(1);
  }
  const gatewayUrl = getInput("gateway-url") || "http://localhost:7474";
  const mode = parseMode(getInput("mode"));
  const maxFindings = getIntInput("max-findings", 10);
  const timeoutMs = getIntInput("timeout-ms", 10_000);
  const allowGatewayFailure = getBooleanInput("allow-gateway-failure");

  const fetched = await fetchEnvelope(
    gatewayUrl,
    service,
    targetRef,
    maxFindings,
    timeoutMs,
  );

  if (fetched.status === "unreachable") {
    const code = decideExitCode({
      verdict: "ok",
      mode,
      unreachable: true,
      allowGatewayFailure,
    });
    setOutput(
      "verdict",
      code === 1 ? "block" : "warn",
    );
    setOutput("result-json", "{}");
    process.exit(code);
  }

  const env = fetched.envelope;
  writeJobSummary(renderJobSummary(env));
  for (const ann of renderAnnotations(env, mode)) {
    const msg = ann.url ? `${ann.message} — ${ann.url}` : ann.message;
    emitAnnotation(ann.level, msg);
  }

  setOutput(
    "verdict",
    env.verdict === "warn" && mode === "block" ? "block" : env.verdict,
  );
  setOutput(
    "incident-count",
    String(env.checks.active_p1_incidents.count),
  );
  setOutput(
    "failing-ci-count",
    String(env.checks.failing_ci_runs.count),
  );
  setOutput(
    "merge-conflict-count",
    String(env.checks.merge_conflicts.count),
  );
  setOutput("result-json", JSON.stringify(env));

  const code = decideExitCode({
    verdict: env.verdict,
    mode,
    unreachable: false,
    allowGatewayFailure,
  });
  process.exit(code);
}

await main();
```

- [ ] **Step 9: Bundle the Action**

Run: `cd packages/github-actions/preflight-query && bun run build`
Expected: `dist/index.js` is created. The file must be committed (GitHub Actions runs it directly — no install step).

If `bun build --target=node` doesn't produce a single-file bundle in your environment, fall back to `bunx esbuild src/main.ts --bundle --platform=node --target=node20 --outfile=dist/index.js`. Document the build command in the README.

- [ ] **Step 10: Write the README**

Create `packages/github-actions/preflight-query/README.md`:

```markdown
# nimbus-agent/query-action

First-party GitHub Action for the Nimbus pre-deploy index check. Calls the local Nimbus Gateway's `GET /v1/preflight/deploy` endpoint, surfaces findings as workflow annotations + job summary, and (optionally) blocks the deploy when verdict is `warn`.

## Requirements

- **Self-hosted runner with the Nimbus Gateway running locally** (`http://localhost:7474` by default). Hosted runners (`ubuntu-latest`) are not supported in v0.1.0 — the Gateway is local-only.
- A `[metrics.dora.<service-id>]` or `[ci.service.<service-id>]` block in `nimbus.toml` mapping the service id to its repos and (optionally) PagerDuty service ids.

## Usage

```yaml
- name: Pre-deploy index check
  uses: nimbus-agent/query-action@v0.1.0
  with:
    service: payment-service
    mode: warn          # use 'block' once you trust the signal
```

## Inputs

| Input | Required | Default | Notes |
|---|---|---|---|
| `service` | yes | — | Nimbus service id. |
| `target-ref` | no | `${{ github.ref_name }}` | Branch/ref being deployed. |
| `gateway-url` | no | `http://localhost:7474` | Base URL of the Gateway's read-only HTTP API. |
| `mode` | no | `warn` | One of `warn`, `block`, `off`. |
| `max-findings` | no | `10` | Cap on findings per check (1..50). |
| `timeout-ms` | no | `10000` | HTTP timeout. |
| `allow-gateway-failure` | no | `false` | When `true`, unreachable Gateway never fails the workflow. |

## Outputs

- `verdict` — `ok`, `warn`, or `block`.
- `incident-count`, `failing-ci-count`, `merge-conflict-count` — raw counts.
- `result-json` — full envelope JSON.

## Exit codes

| `mode` | verdict=ok | verdict=warn | unreachable, allow-gateway-failure=false | unreachable, allow-gateway-failure=true |
|---|---|---|---|---|
| `off` | 0 | 0 | 0 | 0 |
| `warn` (default) | 0 | 0 | 0 | 0 |
| `block` | 0 | 1 | 1 | 0 |

## Versioning

This release uses **fully-pinned tags** (`v0.1.0`, `v0.1.1`, …). Users should reference specific versions while the Action is in v0.x:

```yaml
uses: nimbus-agent/query-action@v0.1.0
```

A `v0` major-version moving tag is **intentionally not provided yet** — the Action's input contract may still evolve before v1.0.0. Once v1.0.0 ships, the project will adopt the `actions/checkout@v1`-style major tag pattern.

## Building from source

Source lives in the Nimbus monorepo at `packages/github-actions/preflight-query/`. Build with:

```bash
cd packages/github-actions/preflight-query
bun run build
```
```

- [ ] **Step 11: Run the full Action test suite**

Run: `cd packages/github-actions/preflight-query && bun test`
Expected: PASS (render + main tests, ~11 cases total).

- [ ] **Step 12: Commit**

```bash
git add packages/github-actions/preflight-query/
git commit -m "$(cat <<'EOF'
feat(action): nimbus-agent/query-action — pre-deploy index check

JS GitHub Action (Node 20) that calls GET /v1/preflight/deploy on the
local Nimbus Gateway, renders findings as workflow annotations + a job
summary, and sets exit code based on:
  - mode (warn / block / off)
  - server-side verdict (ok / warn)
  - reachability + allow-gateway-failure escape hatch

Source authored in the monorepo; dist/index.js committed for the
Actions runtime. Self-hosted-runner-only in v0.1.0 (the Gateway is
local-only by design).

Phase 5 T4 PR 3a.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Coverage gate + skills + roadmap flip

**Files:**
- Modify: `package.json` (root)
- Modify: `scripts/lib/ci-tests.ts`
- Modify: `.github/workflows/_test-suite.yml`
- Modify: `.claude/commands/nimbus-file-map.md`
- Modify: `.claude/commands/nimbus-commands.md`
- Modify: `CLAUDE.md`
- Modify: `GEMINI.md`
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Add the coverage script**

Modify `package.json`. Find the block of `test:coverage:*` scripts. After `test:coverage:metrics`, add:

```json
    "test:coverage:preflight": "bun test --coverage --coverage-threshold-lines=80 packages/gateway/test/unit/preflight/ packages/gateway/test/integration/preflight/ packages/gateway/test/unit/ipc/preflight-rpc.test.ts packages/gateway/test/integration/http/preflight-deploy-route.test.ts packages/gateway/test/unit/connectors/github-sync-mergeable.test.ts",
```

Match the comma placement to the surrounding scripts. Run the gate locally to confirm:

Run: `bun run test:coverage:preflight`
Expected: PASS with line coverage ≥ 80% for `packages/gateway/src/preflight/` and the new `preflight-rpc.ts`. If coverage is under 80%, return to Task 3's test file and add cases until the branches that aren't hit are covered.

- [ ] **Step 2: Wire into the CI aggregator**

Modify `scripts/lib/ci-tests.ts`. Find the `coverage-gates` array. After the `test:coverage:metrics` entry, add:

```ts
  { script: "test:coverage:preflight" },
```

(Match the existing shape — whether the array uses `{ script: ... }` or just bare strings.)

- [ ] **Step 3: Add the CI matrix entry**

Modify `.github/workflows/_test-suite.yml`. Find the `coverage-gates` job's matrix `include` block. After the `Metrics` entry, add:

```yaml
          - name: Preflight
            script: test:coverage:preflight
```

(Adapt the indentation and shape to whatever the matrix looks like — read the file's existing entries first.)

- [ ] **Step 4: Update `nimbus-file-map`**

Modify `.claude/commands/nimbus-file-map.md`. Find the existing "Metrics" section (added in T4 PR 2). Rename to "Metrics + CI/CD" and add rows for the preflight files:

```markdown
## Metrics + CI/CD

| File | Purpose |
|---|---|
| `packages/gateway/src/metrics/dora.ts` | Four pure DORA calculators: `deploymentFrequency`, `leadTimeForChanges`, `changeFailureRate`, `mttr`. Returns `DoraMetricsResult` envelope. |
| `packages/gateway/src/metrics/dora-config.ts` | `ServiceConfig` type (with `DoraServiceConfig` back-compat alias) + URN parser + provider→service-column map. |
| `packages/gateway/src/preflight/preflight.ts` | Pure pre-deploy check: three counts (active P1 incidents, failing CI on target_ref, open PR conflicts). Returns `DeployPreflightResult` envelope. |
| `packages/gateway/src/ipc/metrics-rpc.ts` | `dispatchMetricsRpc` — `metrics.dora` JSON-RPC handler. |
| `packages/gateway/src/ipc/preflight-rpc.ts` | `dispatchPreflightRpc` — `deploy.preflight` JSON-RPC handler. |
| `packages/cli/src/commands/metrics.ts` | `nimbus metrics dora --service <id> [--since 30d] [--json]`. |
| `packages/cli/src/commands/deploy.ts` | `nimbus deploy preflight --service <id> --target-ref <ref> [--mode warn\|block\|off] [--json]`. |
| `packages/github-actions/preflight-query/` | First-party GitHub Action that wraps `GET /v1/preflight/deploy`. |
```

- [ ] **Step 5: Update `nimbus-commands`**

Modify `.claude/commands/nimbus-commands.md`. Under the existing `Phase 5 T4 — CI/CD data layer` coverage-gate block, add the preflight gate next to the metrics one:

```text
bun run test:coverage:preflight       # ≥80% (preflight calculator + IPC + HTTP + github-sync mergeable enrichment)
```

Under the CLI subcommands section, after the `nimbus metrics dora` line, add:

```text
nimbus deploy preflight --service <id> --target-ref <ref> [--mode warn|block|off] [--json]   # pre-deploy index check
```

- [ ] **Step 6: Bump the status line in CLAUDE.md and GEMINI.md**

Modify `CLAUDE.md` line ~10 (the `**Status:**` line). Append `· T4 PR 3a pre-deploy check ✅` to the Phase 5 entry. Mirror the same change into `GEMINI.md`.

Example (final shape, after the change):

```text
**Status:** Phase 4 ✅ Complete · Phase 5 (Extended Surface) 🔵 Active · T4 PR 2 DORA metrics ✅ · T4 PR 3a pre-deploy check ✅ · `v0.1.0` released 2026-05-09 …
```

- [ ] **Step 7: Flip the roadmap bullet**

Modify `docs/roadmap.md`. Find the existing `- [ ] **Pre-deploy index check** — …` bullet. Replace with:

```markdown
- [x] **Pre-deploy index check** (2026-05-MM, Phase 5 T4 PR 3a) — `nimbus-dev/query-action` GitHub Action that queries the local Gateway's `GET /v1/preflight/deploy` endpoint for active P1 incidents on the target service, failing CI runs on the target branch, and open PRs with merge conflicts. `mode: warn` (default) annotates without blocking; `mode: block` exits 1 on findings; `allow-gateway-failure: true` is the escape hatch for infra noise. CLI counterpart `nimbus deploy preflight` for non-GitHub CI providers. Reuses the `[metrics.dora.<id>]` config plus a new `[ci.service.<id>]` alias.
```

Fill in `2026-05-MM` with the merge date.

The "Post-deploy annotation" bullet remains `[ ]` — it's the only T4 item left.

- [ ] **Step 8: Run the full preflight test suite + audits**

```bash
bun run test:coverage:preflight
bun run typecheck
bun run lint
bun run audit:openapi-drift
bun scripts/structure-audit/check-doc-references.ts --check
```

All must pass. If `audit:doc-refs` flags any newly added link in CLAUDE.md / GEMINI.md / roadmap.md / file-map / commands, fix it in the same commit.

- [ ] **Step 9: Commit**

```bash
git add package.json \
        scripts/lib/ci-tests.ts \
        .github/workflows/_test-suite.yml \
        .claude/commands/nimbus-file-map.md \
        .claude/commands/nimbus-commands.md \
        CLAUDE.md GEMINI.md \
        docs/roadmap.md
git commit -m "$(cat <<'EOF'
chore(t4 pr 3a): wire coverage gate + update skills + flip roadmap

Adds test:coverage:preflight (≥80%) to CI alongside the metrics gate,
points nimbus-file-map and nimbus-commands at the new preflight surface
(IPC + HTTP + CLI + GH Action), flips the roadmap "Pre-deploy index
check" bullet to shipped. Post-deploy annotation remains the only
unfinished T4 item.

Phase 5 T4 PR 3a.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

### Spec coverage

| Spec requirement | Task |
|---|---|
| `nimbus deploy preflight --service X --target-ref Y --json` envelope | Tasks 3, 5, 7 |
| `audit:openapi-drift` validates `/v1/preflight/deploy` parity | Task 6 |
| `GET /v1/openapi.json` includes the new path + schemas | Task 6 (extends `v1.yaml`; PR 1 already serves the cached schema) |
| Verdict rule — count-only (gaps don't flip verdict) — review item 2.1 FIX | Task 3 §verdict + Task 5 unconfigured envelope |
| 3-tier `COALESCE` workflow grouping — review item 2.3 FIX | Task 3 |
| github-sync `mergeable_state` enrichment with parallel detail fetches — review items 2.2/5.2 FIX | Task 2 |
| `allow-gateway-failure` Action input — review item 2.4 FIX | Task 8 |
| `[ci.service.<id>]` alias + back-compat ServiceConfig | Task 1 |
| Multi-provider repos counted | Task 3 §3 + integration fixture (Task 4) |
| `max_findings` per check, 1..50 | Tasks 3 + 5 |
| Coverage gate ≥ 80% | Task 9 |
| CLAUDE.md / GEMINI.md status update | Task 9 |
| Roadmap flip + post-deploy bullet preserved | Task 9 |

### Placeholder scan

- No "TBD" / "TODO" / "fill in details" in steps.
- `2026-05-MM` date in Task 9 is the one merge-date placeholder; explicit instruction to fill it on commit.
- Task 7 has a small structural conditional ("if `commands/index.ts` doesn't exist, stage only files that do") because the CLI's exact command-registration layout depends on whether PR 258's `registry.ts` is on the branch base. This is a structural fact, not a placeholder.

### Type consistency

- `ServiceConfig` shape stable across `dora-config.ts`, `dora.ts`, `metrics-rpc.ts`, `preflight.ts`, `preflight-rpc.ts`, fixture seeders, CLI command, and the Action — checked.
- `DeployPreflightResult` is exported only from `preflight.ts`; re-imported by `preflight-rpc.ts`; the CLI and Action use a structurally-equivalent `Envelope` type alias that asserts only the fields each surface reads.
- `PreflightMode` (`"warn" | "block" | "off"`) is identical in `deploy.ts` (CLI), `render.ts` (Action), and the `action.yml` input description — checked.
- `PreflightGap` union: `null | "no_pagerduty_mapping" | "no_repos" | "no_target_ref" | "unknown_mergeable_state"`. Identical across `preflight.ts`, the OpenAPI YAML, and the rendering layer — checked. (`no_target_ref` is structurally reachable only when callers omit `target_ref` via raw CLI; the IPC param validation rejects it before computation.)
- Default values (`mode=warn`, `max_findings=10`, `timeout-ms=10000`) consistent between `action.yml`, `deploy.ts`, and the spec — checked.

---

## Plan Review Disposition

External review (Gemini CLI, 2026-05-12) raised six items. Resolved as follows:

| # | Item | Disposition | Action |
|---|---|---|---|
| 2.1 | `Promise.all` reject-fast risk on parallel detail fetches + RateLimiter concurrency contract | **FIX** | Task 2 Step 11 switched to `Promise.allSettled` with per-result error handling. 404 (deleted PR) and 403 (private/archived repo) are treated as expected outcomes — skip that candidate, leave existing metadata. 429 and 5xx still propagate so the RateLimiter / connector health path catches them. Plan also adds an explicit "verify the RateLimiter actually supports per-provider concurrency" note for the implementer. |
| 2.2 | I11 (`wrapToolOutput`) reminder for `deploy.preflight` | **EXPLAIN** | `deploy.preflight` is CLI/HTTP/Action-facing, never LLM-facing. I11 fires at agent-tool registration, not the IPC handler. Added an explicit doc comment in Task 5's `preflight-rpc.ts` so future readers don't accidentally register it as a Mastra tool without wrapping at that registration site. |
| 2.3 | SQLite window-function version requirement | **EXPLAIN** | Bun's bundled SQLite is ≥ 3.39 as of Bun 1.2; window functions landed in 3.25 (2018). Safe. Added a one-line comment next to the `ROW_NUMBER() OVER (...)` SQL stating the minimum version. |
| 2.4 | CLI exit-code convention | **EXPLAIN** | Plan's convention is consistent with `nimbus metrics dora`: 0 = success, 1 = user/logic (usage **and** block-triggered findings — both mean "deploy step shouldn't proceed"), 2 = infrastructure. Added an explicit comment in Task 7's `deploy.ts` documenting the mapping. |
| 3.1 | `@v0` major-version tag pattern | **DEFER** | v0.1.0 is the first release; pinning to specific versions is the right default until the input contract is stable. Added a "Versioning" section to the Action's README stating the policy and the v1.0.0 plan. |
| 3.2 | Configurable mergeable_state freshness | **EXPLAIN** | YAGNI for v0.1.0. Added a code comment above the `MERGEABLE_STATE_REFRESH_FRESHNESS_MS` / `MERGEABLE_STATE_UPDATED_WINDOW_MS` constants noting that promotion to per-connector config (e.g., a `[github.sync]` block) is the natural follow-up if operators ask. |

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-12-phase-5-t4-pr3a-preflight.md`. Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, two-stage review on each. Best fit because this PR spans nine self-contained tasks across config / connector / calculator / IPC / HTTP / CLI / Action / CI surfaces.

2. **Inline Execution** — execute tasks in this session using executing-plans, batching with manual checkpoints. Faster if no review feedback is expected between tasks; less safe.

Which approach?

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---
