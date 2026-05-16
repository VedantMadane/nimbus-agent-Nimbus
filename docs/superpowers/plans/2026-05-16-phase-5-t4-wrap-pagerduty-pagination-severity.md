# Phase 5 T4 wrap — PagerDuty pagination + `severity_p1_aliases` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close both Phase 5 T4 wrap-up loose ends in a single PR — multi-page PagerDuty incident sync with monotonic cursor advance under capping, and a query-time `severity_p1_aliases` mechanism (plus urgency-gap diagnostic) on the preflight P1 filter.

**Architecture:** Two thematically related changes share one new `[pagerduty]` config block.

1. Pagination: refactor `pagerduty-sync.ts` to walk pages while honoring `parsed.more`, with `sort_by=updated_at:asc` for cursor correctness, a configurable `max_pages_per_sync` cap (default 20, range 1..100), and `SyncResult.hasMore: true` on cap-hit so the scheduler re-queues. Also writes `metadata.urgency` for the gap probe.
2. Preflight: widen `selectActiveP1Incidents` to match `LOWER(severity) IN (?, ?, ...)` over `Set("p1", ...lowercasedAliases)`, threaded via `ServiceConfig.severityP1Aliases`. Adds a gated probe query and a new `PreflightGap` union member `"pagerduty_urgency_without_priority"` to surface silent-zero diagnostics.

No migration. No new IPC. No new HTTP route. No `ALLOWED_METHODS` change. Spec: [docs/superpowers/specs/2026-05-16-phase-5-t4-wrap-pagerduty-pagination-severity-design.md](../specs/2026-05-16-phase-5-t4-wrap-pagerduty-pagination-severity-design.md).

**Tech Stack:** Bun 1.2+ runtime, TypeScript strict, bun:sqlite, bun:test. Existing patterns in `packages/gateway/src/config/nimbus-toml.ts` (hand-rolled section parser) and `packages/gateway/src/connectors/pagerduty-sync.ts` (factory + `Syncable` interface).

**Worktree:** `.claude/worktrees/phase-5-t4-wrap-pagerduty` on branch `dev/asafgolombek/phase-5-t4-wrap-pagerduty-pagination-severity`.

---

## File Structure

**Files to create:**
- `packages/gateway/src/config/nimbus-toml-pagerduty.test.ts` — parser + loader tests for the new `[pagerduty]` block (mirrors `nimbus-toml-user.test.ts`).

**Files to modify:**
- `packages/gateway/src/config/nimbus-toml.ts` — add `NimbusPagerdutyToml`, parser, defaults, loaders; thread aliases into `loadNimbusServiceConfigsFromConfigDir`.
- `packages/gateway/src/metrics/dora-config.ts` — add `severityP1Aliases: readonly string[]` to `ServiceConfig`.
- `packages/gateway/src/connectors/pagerduty-sync.ts` — add `maxPagesPerSync` factory option, pagination loop, `metadata.urgency`.
- `packages/gateway/src/connectors/pagerduty-sync.test.ts` — 4 new cases (urgency write, walks-until-more=false, cap honored, partial-failure cursor).
- `packages/gateway/src/preflight/preflight.ts` — widen P1 filter to alias union; urgency-gap probe; extend `PreflightGap`.
- `packages/gateway/test/unit/preflight/preflight.test.ts` — extend `seedIncident`/`cfg` helpers; add 4 new cases.
- `packages/gateway/test/integration/preflight/preflight-real-db.test.ts` — update `cfg()` helper if present.
- `packages/gateway/test/unit/ipc/preflight-rpc.test.ts` — update `cfg()` helper if present.
- `packages/gateway/test/integration/http/preflight-deploy-route.test.ts` — update `cfg()` helper if present.
- `packages/gateway/test/unit/metrics/dora-config.test.ts` — update test fixtures if they construct `ServiceConfig` literally.
- `packages/gateway/src/platform/assemble.ts` — load `[pagerduty]` at bootstrap, pass to sync registrations.
- `packages/gateway/src/platform/assemble-sync-registrations.ts` — accept `pagerdutyConfig`, thread `maxPagesPerSync` into `createPagerdutySyncable`.
- `docs/roadmap.md` — flip two `[ ]` rows to `[x]`.
- `CLAUDE.md` — extend Status line.

---

### Task 1: `[pagerduty]` parser, types, defaults, loaders

**Goal:** Add the standalone `NimbusPagerdutyToml` shape and parser. No production wiring yet — pure additive. Lowercases + dedupes aliases at parse time per review point #5.

**Files:**
- Create: `packages/gateway/src/config/nimbus-toml-pagerduty.test.ts`
- Modify: `packages/gateway/src/config/nimbus-toml.ts` (append new section after `loadNimbusUserFromConfigDir`, around line 750)

- [ ] **Step 1: Write the failing test file**

Create `packages/gateway/src/config/nimbus-toml-pagerduty.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_NIMBUS_PAGERDUTY_TOML,
  loadNimbusPagerdutyFromConfigDir,
  loadNimbusPagerdutyFromPath,
  parseNimbusPagerdutyToml,
} from "./nimbus-toml.ts";

describe("parseNimbusPagerdutyToml", () => {
  test("returns defaults when [pagerduty] is absent", () => {
    const out = parseNimbusPagerdutyToml("");
    expect(out).toEqual(DEFAULT_NIMBUS_PAGERDUTY_TOML);
    expect(out.maxPagesPerSync).toBe(20);
    expect(out.severityP1Aliases).toEqual([]);
  });

  test("reads max_pages_per_sync and severity_p1_aliases", () => {
    const out = parseNimbusPagerdutyToml(
      '[pagerduty]\nmax_pages_per_sync = 5\nseverity_p1_aliases = ["Critical", "SEV-1"]\n',
    );
    expect(out.maxPagesPerSync).toBe(5);
    expect(out.severityP1Aliases).toEqual(["critical", "sev-1"]);
  });

  test("ignores keys outside [pagerduty]", () => {
    const out = parseNimbusPagerdutyToml('[other]\nmax_pages_per_sync = 5\n');
    expect(out.maxPagesPerSync).toBe(20);
  });

  test("strips inline comments", () => {
    const out = parseNimbusPagerdutyToml(
      '[pagerduty]\nmax_pages_per_sync = 10  # capped\n',
    );
    expect(out.maxPagesPerSync).toBe(10);
  });

  test("throws when max_pages_per_sync is 0", () => {
    expect(() =>
      parseNimbusPagerdutyToml('[pagerduty]\nmax_pages_per_sync = 0\n'),
    ).toThrow(/max_pages_per_sync.*1\.\.100/);
  });

  test("throws when max_pages_per_sync is 101", () => {
    expect(() =>
      parseNimbusPagerdutyToml('[pagerduty]\nmax_pages_per_sync = 101\n'),
    ).toThrow(/max_pages_per_sync.*1\.\.100/);
  });

  test("throws when max_pages_per_sync is non-integer", () => {
    expect(() =>
      parseNimbusPagerdutyToml('[pagerduty]\nmax_pages_per_sync = "lots"\n'),
    ).toThrow(/max_pages_per_sync/);
  });

  test("lowercases + dedupes severity_p1_aliases", () => {
    const out = parseNimbusPagerdutyToml(
      '[pagerduty]\nseverity_p1_aliases = ["Critical", "critical", "P1"]\n',
    );
    // "P1" lowercases to "p1" which dedupes against itself; "Critical"/"critical" dedupes.
    expect(out.severityP1Aliases).toEqual(["critical", "p1"]);
  });

  test("drops empty / whitespace-only alias entries", () => {
    const out = parseNimbusPagerdutyToml(
      '[pagerduty]\nseverity_p1_aliases = ["Critical", "", "   "]\n',
    );
    expect(out.severityP1Aliases).toEqual(["critical"]);
  });
});

describe("loadNimbusPagerdutyFromPath", () => {
  test("returns defaults when file is missing", () => {
    const out = loadNimbusPagerdutyFromPath(join(tmpdir(), "does-not-exist.toml"));
    expect(out).toEqual(DEFAULT_NIMBUS_PAGERDUTY_TOML);
  });

  test("reads from disk", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-pd-toml-"));
    const p = join(dir, "nimbus.toml");
    writeFileSync(p, '[pagerduty]\nmax_pages_per_sync = 7\n', "utf8");
    const out = loadNimbusPagerdutyFromPath(p);
    expect(out.maxPagesPerSync).toBe(7);
  });

  test("falls back to defaults AND writes a stderr warning on validation error", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-pd-toml-bad-"));
    const p = join(dir, "nimbus.toml");
    writeFileSync(p, '[pagerduty]\nmax_pages_per_sync = 0\n', "utf8");
    const captured: string[] = [];
    const orig = process.stderr.write.bind(process.stderr);
    // Type assertion: process.stderr.write is overloaded; we shim the
    // chunk-as-first-arg form, which is what nimbus-toml.ts uses.
    process.stderr.write = ((chunk: string | Uint8Array) => {
      captured.push(typeof chunk === "string" ? chunk : chunk.toString());
      return true;
    }) as typeof process.stderr.write;
    try {
      const out = loadNimbusPagerdutyFromPath(p);
      expect(out).toEqual(DEFAULT_NIMBUS_PAGERDUTY_TOML);
    } finally {
      process.stderr.write = orig;
    }
    expect(captured.join("")).toContain("[pagerduty] config");
    expect(captured.join("")).toContain("max_pages_per_sync");
  });
});

describe("loadNimbusPagerdutyFromConfigDir", () => {
  test("resolves <configDir>/nimbus.toml", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-pd-cfg-"));
    writeFileSync(
      join(dir, "nimbus.toml"),
      '[pagerduty]\nmax_pages_per_sync = 3\nseverity_p1_aliases = ["SEV-1"]\n',
      "utf8",
    );
    const out = loadNimbusPagerdutyFromConfigDir(dir);
    expect(out.maxPagesPerSync).toBe(3);
    expect(out.severityP1Aliases).toEqual(["sev-1"]);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

```
bun test packages/gateway/src/config/nimbus-toml-pagerduty.test.ts
```

Expected: FAIL — every import resolves to `undefined` because the symbols don't exist yet. Error like: `Cannot find module './nimbus-toml.ts'` is unlikely (the file exists); more likely `Property 'parseNimbusPagerdutyToml' does not exist`.

- [ ] **Step 3: Implement in `packages/gateway/src/config/nimbus-toml.ts`**

Append this section AFTER `loadNimbusUserFromConfigDir` (around line 750), BEFORE the `[metrics.dora.<id>]` section that starts at line 751:

```typescript
// ---------------------------------------------------------------------------
// [pagerduty] — Top-level PagerDuty connector + preflight knobs
// (Phase 5 T4 wrap-up).
// ---------------------------------------------------------------------------

export type NimbusPagerdutyToml = {
  /** Hard cap on pages walked per `pagerduty-sync.ts` invocation. 1..100. */
  maxPagesPerSync: number;
  /**
   * Priority names that preflight should treat as equivalent to "P1".
   * Stored lowercased + deduplicated. Empty by default (preflight matches
   * the verbatim "P1" string only, identical to pre-existing behavior).
   */
  severityP1Aliases: readonly string[];
};

export const DEFAULT_NIMBUS_PAGERDUTY_TOML: NimbusPagerdutyToml = {
  maxPagesPerSync: 20,
  severityP1Aliases: [],
};

function parseNimbusPagerdutySection(source: string): Partial<NimbusPagerdutyToml> {
  const lines = source.split(/\r?\n/);
  let inSection = false;
  const out: { maxPagesPerSync?: number; severityP1Aliases?: readonly string[] } = {};
  for (const line of lines) {
    const trimmed = stripComment(line).trim();
    if (trimmed === "") continue;
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      inSection = trimmed === "[pagerduty]";
      continue;
    }
    if (!inSection) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const valRaw = trimmed.slice(eq + 1).trim();
    if (key === "max_pages_per_sync") {
      const n = parseIntDec(valRaw);
      if (n === undefined || n < 1 || n > 100) {
        throw new Error(
          `[pagerduty].max_pages_per_sync must be an integer in 1..100, got '${valRaw}'`,
        );
      }
      out.maxPagesPerSync = n;
    } else if (key === "severity_p1_aliases") {
      // Reuse parseStringArray (defined later in this file) — already drops empty entries.
      const raw = parseStringArray(valRaw);
      const seen = new Set<string>();
      const collected: string[] = [];
      for (const v of raw) {
        const lower = v.trim().toLowerCase();
        if (lower === "") continue;
        if (seen.has(lower)) continue;
        seen.add(lower);
        collected.push(lower);
      }
      out.severityP1Aliases = collected;
    }
  }
  return out;
}

export function parseNimbusPagerdutyToml(
  raw: string,
  defaults: NimbusPagerdutyToml = DEFAULT_NIMBUS_PAGERDUTY_TOML,
): NimbusPagerdutyToml {
  return { ...defaults, ...parseNimbusPagerdutySection(raw) };
}

export function loadNimbusPagerdutyFromPath(tomlPath: string): NimbusPagerdutyToml {
  if (!existsSync(tomlPath)) {
    return structuredClone(DEFAULT_NIMBUS_PAGERDUTY_TOML);
  }
  try {
    const raw = readFileSync(tomlPath, "utf8");
    return parseNimbusPagerdutyToml(raw);
  } catch (err) {
    // Surface validation errors (e.g. max_pages_per_sync out of range) so
    // operators don't silently fall back to defaults. Matches the
    // ci.service / metrics.dora conflict-warning pattern used elsewhere in
    // this file (see loadNimbusServiceConfigsFromConfigDir).
    process.stderr.write(
      `nimbus: [pagerduty] config in ${tomlPath} rejected, using defaults: ` +
        `${err instanceof Error ? err.message : String(err)}\n`,
    );
    return structuredClone(DEFAULT_NIMBUS_PAGERDUTY_TOML);
  }
}

export function loadNimbusPagerdutyFromConfigDir(configDir: string): NimbusPagerdutyToml {
  return loadNimbusPagerdutyFromPath(join(configDir, "nimbus.toml"));
}
```

**Forward reference note:** `parseStringArray` is defined later in the same file (around line 766) — that's fine in TypeScript; function hoisting works at module scope. If your editor flags it as "used before defined," ignore — it compiles and runs correctly.

- [ ] **Step 4: Run the test, verify it passes**

```
bun test packages/gateway/src/config/nimbus-toml-pagerduty.test.ts
```

Expected: PASS — all 12 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/config/nimbus-toml.ts packages/gateway/src/config/nimbus-toml-pagerduty.test.ts
git commit -m "feat(config): [pagerduty] TOML block — max_pages_per_sync + severity_p1_aliases

Phase 5 T4 wrap-up groundwork. Parser, types, defaults, loaders, and 12
tests covering: defaults, parse-with-keys, missing-section ignore, comment
strip, max_pages bounds (0/101/non-integer), alias lowercase+dedup,
empty-entry drop, on-disk loading."
```

---

### Task 2: Add `severityP1Aliases` to `ServiceConfig`

**Goal:** Extend the `ServiceConfig` type with the new field. Default `[]` in `materializeServiceConfigs` so existing TOML callers behave unchanged. Update every test fixture that constructs a `ServiceConfig` literally.

**Files:**
- Modify: `packages/gateway/src/metrics/dora-config.ts:20-35`
- Modify: `packages/gateway/src/config/nimbus-toml.ts:846-855` (the `materializeServiceConfigs` return)
- Modify: `packages/gateway/test/unit/preflight/preflight.test.ts:120-131` (the `cfg()` helper)
- Possibly modify: other test files (audit + patch all `ServiceConfig`-construction sites)

- [ ] **Step 1: Identify every test file constructing `ServiceConfig` literally**

Run:
```
grep -rn "serviceId:" packages/gateway/test packages/gateway/src --include="*.test.ts" --include="*.ts" | grep -v "\.serviceId" | grep -v "node_modules"
```

Take note of every test file with object literals that need `severityP1Aliases: []` added. The known set is:
- `packages/gateway/test/unit/preflight/preflight.test.ts` (the `cfg()` helper)
- `packages/gateway/test/integration/preflight/preflight-real-db.test.ts` (if it has its own `cfg()` helper)
- `packages/gateway/test/unit/ipc/preflight-rpc.test.ts` (if applicable)
- `packages/gateway/test/integration/http/preflight-deploy-route.test.ts` (if applicable)
- `packages/gateway/test/unit/metrics/dora-config.test.ts` (if applicable)

For each match, treat it as a fixture site that needs the new field.

- [ ] **Step 2: Add the field to `ServiceConfig`**

In `packages/gateway/src/metrics/dora-config.ts`, replace lines 20-35:

```typescript
export type ServiceConfig = {
  /** Stable service id from the table key. */
  readonly serviceId: string;
  readonly repos: readonly ParsedDoraRepoUrn[];
  readonly pagerdutyServices: readonly string[];
  readonly deployWorkflowPattern: RegExp;
  readonly incidentWindowMinutes: number;
  readonly excludePrLabels: readonly string[];
  /**
   * Logical deploy environments this service ships to (e.g. `["prod"]`,
   * `["staging", "prod"]`). Sourced from the optional `deploy_environments`
   * key in `[ci.service.<id>]` / `[metrics.dora.<id>]`. Defaults to
   * `["prod"]` when omitted.
   */
  readonly deployEnvironments: readonly string[];
  /**
   * Lowercased, deduplicated priority-name aliases that preflight treats as
   * P1. Sourced org-wide from `[pagerduty].severity_p1_aliases` and copied
   * onto every materialized ServiceConfig at load time. Empty default
   * preserves the pre-existing strict `severity = 'P1'` filter behavior.
   * Phase 5 T4 wrap-up.
   */
  readonly severityP1Aliases: readonly string[];
};
```

- [ ] **Step 3: Add the default to `materializeServiceConfigs`**

In `packages/gateway/src/config/nimbus-toml.ts:846-855`, replace the `out.set(serviceId, { ... })` block with:

```typescript
    out.set(serviceId, {
      serviceId,
      repos,
      pagerdutyServices,
      deployWorkflowPattern,
      incidentWindowMinutes: windowMins,
      excludePrLabels,
      deployEnvironments,
      severityP1Aliases: [], // attached by loadNimbusServiceConfigsFromConfigDir
    });
```

- [ ] **Step 4: Update the preflight unit-test `cfg()` helper**

In `packages/gateway/test/unit/preflight/preflight.test.ts:120-131`, replace:

```typescript
function cfg(overrides: Partial<ServiceConfig> = {}): ServiceConfig {
  return {
    serviceId: "payment-service",
    repos: [{ provider: "github", providerId: "nimbus-agent/payments" }],
    pagerdutyServices: ["P12ABCD"],
    deployWorkflowPattern: /^[Dd]eploy/,
    incidentWindowMinutes: 60,
    excludePrLabels: ["revert"],
    deployEnvironments: ["prod"],
    severityP1Aliases: [],
    ...overrides,
  };
}
```

- [ ] **Step 5: Run typecheck, fix every fixture site**

```
bun run typecheck
```

Expected on first run: errors at every site missing `severityP1Aliases`. Add `severityP1Aliases: []` (after `deployEnvironments`) to each one. Re-run until clean.

- [ ] **Step 6: Run the full gateway test suite, verify still green**

```
bun test packages/gateway
```

Expected: all PASS. The default `[]` aliases means every existing test sees identical behavior.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(config): add severityP1Aliases field to ServiceConfig

Phase 5 T4 wrap-up groundwork. Type field + default empty array in
materializeServiceConfigs; fixture updates in every cfg() helper that
constructs ServiceConfig literally. Behavior unchanged — empty array
preserves the verbatim severity='P1' filter at the SQL site."
```

---

### Task 3: Thread `[pagerduty]` aliases via `loadNimbusServiceConfigsFromConfigDir`

**Goal:** Production wiring step. Read `[pagerduty]` block from the same TOML buffer the loader already parses for `[metrics.dora.<id>]` + `[ci.service.<id>]`, and attach the lowercased aliases to every materialized `ServiceConfig`.

**Files:**
- Modify: `packages/gateway/src/config/nimbus-toml.ts:948-967`
- Create: `packages/gateway/src/config/nimbus-toml-service-configs.test.ts` (or extend an existing test file — see below)

- [ ] **Step 1: Check whether a test file already exercises `loadNimbusServiceConfigsFromConfigDir`**

```
grep -rln "loadNimbusServiceConfigsFromConfigDir" packages/gateway --include="*.test.ts"
```

If a test file exists, extend it. If not, create `packages/gateway/src/config/nimbus-toml-service-configs.test.ts` with this content:

```typescript
import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadNimbusServiceConfigsFromConfigDir } from "./nimbus-toml.ts";

describe("loadNimbusServiceConfigsFromConfigDir + [pagerduty] aliases", () => {
  test("attaches lowercased severityP1Aliases to every ServiceConfig", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-sc-aliases-"));
    writeFileSync(
      join(dir, "nimbus.toml"),
      `[pagerduty]
severity_p1_aliases = ["Critical", "SEV-1"]

[metrics.dora.payments]
repos = ["github:acme/payments"]

[ci.service.checkout]
repos = ["github:acme/checkout"]
`,
      "utf8",
    );
    const merged = loadNimbusServiceConfigsFromConfigDir(dir);
    expect(merged.size).toBe(2);
    expect(merged.get("payments")?.severityP1Aliases).toEqual(["critical", "sev-1"]);
    expect(merged.get("checkout")?.severityP1Aliases).toEqual(["critical", "sev-1"]);
  });

  test("defaults to empty array when [pagerduty] is absent", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-sc-no-pd-"));
    writeFileSync(
      join(dir, "nimbus.toml"),
      `[metrics.dora.svc]
repos = ["github:acme/svc"]
`,
      "utf8",
    );
    const merged = loadNimbusServiceConfigsFromConfigDir(dir);
    expect(merged.get("svc")?.severityP1Aliases).toEqual([]);
  });

  test("returns empty map when nimbus.toml is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-sc-missing-"));
    const merged = loadNimbusServiceConfigsFromConfigDir(dir);
    expect(merged.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

```
bun test packages/gateway/src/config/nimbus-toml-service-configs.test.ts
```

Expected: FAIL on the first case — `severityP1Aliases` is `[]` (the default from Task 2's materializer), not `["critical", "sev-1"]`.

- [ ] **Step 3: Modify `loadNimbusServiceConfigsFromConfigDir`**

In `packages/gateway/src/config/nimbus-toml.ts:948-967`, replace the function body with:

```typescript
export function loadNimbusServiceConfigsFromConfigDir(
  configDir: string,
): Map<string, ServiceConfig> {
  const tomlPath = join(configDir, "nimbus.toml");
  if (!existsSync(tomlPath)) return new Map();
  const raw = readFileSync(tomlPath, "utf8");
  const dora = parseNimbusDoraToml(raw);
  const ci = parseNimbusCiServiceToml(raw);
  // Phase 5 T4 wrap-up: read [pagerduty].severity_p1_aliases once and
  // attach to every materialized ServiceConfig. The aliases array is
  // already lowercased + deduped by parseNimbusPagerdutyToml.
  const pagerdutyCfg = parseNimbusPagerdutyToml(raw);
  const aliases = pagerdutyCfg.severityP1Aliases;
  const merged: Map<string, ServiceConfig> = new Map();
  for (const [id, cfg] of dora.entries()) {
    merged.set(id, { ...cfg, severityP1Aliases: aliases });
  }
  for (const [id, cfg] of ci.entries()) {
    if (merged.has(id)) {
      process.stderr.write(
        `[ci.service.${id}] and [metrics.dora.${id}] both define service '${id}'; ` +
          `using [ci.service.${id}].\n`,
      );
    }
    merged.set(id, { ...cfg, severityP1Aliases: aliases });
  }
  return merged;
}
```

- [ ] **Step 4: Run the test, verify it passes**

```
bun test packages/gateway/src/config/nimbus-toml-service-configs.test.ts
```

Expected: PASS — all three cases green.

- [ ] **Step 5: Run the rest of the gateway suite to be safe**

```
bun test packages/gateway
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(config): thread [pagerduty].severity_p1_aliases into ServiceConfig

Phase 5 T4 wrap-up. loadNimbusServiceConfigsFromConfigDir now reads the
new [pagerduty] block from the same TOML buffer it already parses for
[metrics.dora.<id>] / [ci.service.<id>], and attaches the lowercased,
deduped alias array to every materialized ServiceConfig — org-wide by
design. No caller changes needed since every preflight / metrics / HTTP
consumer flows through this loader."
```

---

### Task 4: Widen `selectActiveP1Incidents` to alias-aware filter

**Goal:** Update the preflight SQL site to match `LOWER(severity) IN (?, ?, ...)` over `Set("p1", ...aliases)`. Empty aliases default → `IN ("p1")`, which case-insensitively matches verbatim `"P1"` rows (zero behavior change for existing users).

**Files:**
- Modify: `packages/gateway/src/preflight/preflight.ts:102-149` (the `selectActiveP1Incidents` function)
- Modify: `packages/gateway/test/unit/preflight/preflight.test.ts` (add tests after the existing `active_p1_incidents` describe block)

- [ ] **Step 1: Write the failing tests**

In `packages/gateway/test/unit/preflight/preflight.test.ts`, append these inside the `describe("computeDeployPreflight: active_p1_incidents check"...)` block, just before the closing `});`:

```typescript
  it('alias "critical" counts toward P1 and preserves raw severity in finding', () => {
    seedIncident(db, "pagerduty:inc_crit", {
      status: "triggered",
      severity: "Critical",
      pagerdutyServiceId: "P12ABCD",
      openedAtMs: now - 60_000,
    });
    const out = computeDeployPreflight(
      db,
      cfg({ severityP1Aliases: ["critical"] }),
      "main",
      now,
      10,
    );
    expect(out.checks.active_p1_incidents.count).toBe(1);
    expect(out.checks.active_p1_incidents.findings[0]?.severity).toBe("Critical");
  });

  it("alias match is case-insensitive on both sides", () => {
    seedIncident(db, "pagerduty:inc_upper", {
      status: "triggered",
      severity: "CRITICAL",
      pagerdutyServiceId: "P12ABCD",
      openedAtMs: now - 60_000,
    });
    seedIncident(db, "pagerduty:inc_p1", {
      status: "triggered",
      severity: "P1",
      pagerdutyServiceId: "P12ABCD",
      openedAtMs: now - 120_000,
    });
    const out = computeDeployPreflight(
      db,
      cfg({ severityP1Aliases: ["critical"] }),
      "main",
      now,
      10,
    );
    expect(out.checks.active_p1_incidents.count).toBe(2);
  });

  it("empty severityP1Aliases preserves verbatim P1 behavior", () => {
    seedIncident(db, "pagerduty:inc_p1", {
      status: "triggered",
      severity: "P1",
      pagerdutyServiceId: "P12ABCD",
      openedAtMs: now - 60_000,
    });
    seedIncident(db, "pagerduty:inc_crit", {
      status: "triggered",
      severity: "Critical",
      pagerdutyServiceId: "P12ABCD",
      openedAtMs: now - 120_000,
    });
    // No aliases configured → only the verbatim "P1" row matches.
    const out = computeDeployPreflight(db, cfg(), "main", now, 10);
    expect(out.checks.active_p1_incidents.count).toBe(1);
    expect(out.checks.active_p1_incidents.findings[0]?.id).toBe("pagerduty:inc_p1");
  });
```

- [ ] **Step 2: Run the tests, verify they fail**

```
bun test packages/gateway/test/unit/preflight/preflight.test.ts
```

Expected: FAIL on the first two new tests — the existing `severity = 'P1'` filter rejects `"Critical"` / `"CRITICAL"`. The third should already pass.

- [ ] **Step 3: Modify `selectActiveP1Incidents`**

In `packages/gateway/src/preflight/preflight.ts`, replace the entire `selectActiveP1Incidents` function (lines 102-149) with:

```typescript
function selectActiveP1Incidents(
  db: Database,
  cfg: ServiceConfig,
  maxFindings: number,
): { count: number; findings: IncidentFinding[]; gap: PreflightGap } {
  if (cfg.pagerdutyServices.length === 0) {
    return { count: 0, findings: [], gap: "no_pagerduty_mapping" };
  }
  // Build the canonical set from the configured aliases (already lowercased
  // by the bootstrap) unioned with "p1". The Set step is belt-and-braces
  // against a user-supplied "P1" overlap.
  const severityMatches = Array.from(new Set(["p1", ...cfg.severityP1Aliases]));
  const sevPlaceholders = severityMatches.map(() => "?").join(",");
  const pdPlaceholders = cfg.pagerdutyServices.map(() => "?").join(",");
  const where = `
    service = 'pagerduty'
    AND type = 'incident'
    AND json_extract(metadata, '$.pagerduty_service_id') IN (${pdPlaceholders})
    AND json_extract(metadata, '$.status') IN ('triggered', 'acknowledged')
    AND LOWER(json_extract(metadata, '$.severity')) IN (${sevPlaceholders})
  `;
  const countParams = [...cfg.pagerdutyServices, ...severityMatches];
  const countRow = db
    .query(`SELECT COUNT(*) as c FROM item WHERE ${where}`)
    .get(...countParams) as { c: number };
  const rows = db
    .query(
      `SELECT id, title, url, metadata
       FROM item
       WHERE ${where}
       ORDER BY json_extract(metadata, '$.opened_at_ms') DESC
       LIMIT ?`,
    )
    .all(...countParams, maxFindings) as {
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
```

- [ ] **Step 4: Run the tests, verify they pass**

```
bun test packages/gateway/test/unit/preflight/preflight.test.ts
```

Expected: PASS — both new tests green, all pre-existing preflight tests still green.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/preflight/preflight.ts packages/gateway/test/unit/preflight/preflight.test.ts
git commit -m "feat(preflight): widen active-P1 filter to severity_p1_aliases

Phase 5 T4 wrap-up. selectActiveP1Incidents now matches
LOWER(severity) IN (\"p1\", ...lowercased-aliases). Empty aliases (the
default) preserve verbatim severity='P1' behavior. Three new tests:
'Critical' alias counts, case-insensitive match, empty-aliases default."
```

---

### Task 5: PagerDuty sync — write `metadata.urgency`

**Goal:** Capture PagerDuty's `incident.urgency` field on every indexed row. Prereq for Task 6 (urgency-gap probe).

**Files:**
- Modify: `packages/gateway/src/connectors/pagerduty-sync.ts:60-113` (the `syncPagerdutyIncidentItems` function)
- Modify: `packages/gateway/src/connectors/pagerduty-sync.test.ts` (extend the `IncidentMetadata` type + add a new case)

- [ ] **Step 1: Write the failing test**

In `packages/gateway/src/connectors/pagerduty-sync.test.ts`, first update the `IncidentMetadata` type (lines 16-22):

```typescript
type IncidentMetadata = {
  status: string | null;
  incidentId: string;
  opened_at_ms?: number;
  pagerduty_service_id?: string;
  severity?: string;
  urgency?: string;
};
```

Then add this test inside `describeWithFetchRestore("pagerduty-sync", () => { ... })`, immediately after the existing `"enriches with opened_at_ms, pagerduty_service_id, severity on happy path"` test:

```typescript
  test("writes urgency when present", async () => {
    const db = await runOneSync([
      {
        id: "PT_URGENT",
        title: "Urgent but no priority",
        created_at: "2026-05-10T18:30:21Z",
        updated_at: "2026-05-10T18:30:21Z",
        status: "triggered",
        urgency: "high",
        service: { id: "PJK1HJ8" },
      },
    ]);
    const meta = readIncidentMetadata(db, "PT_URGENT");
    expect(meta.urgency).toBe("high");
  });

  test("omits urgency when absent or empty", async () => {
    const db = await runOneSync([
      {
        id: "PT_NO_URG",
        title: "No urgency field",
        created_at: "2026-05-10T18:30:21Z",
        updated_at: "2026-05-10T18:30:21Z",
        status: "triggered",
        service: { id: "PJK1HJ8" },
      },
    ]);
    const meta = readIncidentMetadata(db, "PT_NO_URG");
    expect(meta.urgency).toBeUndefined();
  });
```

- [ ] **Step 2: Run the tests, verify they fail**

```
bun test packages/gateway/src/connectors/pagerduty-sync.test.ts
```

Expected: FAIL on `"writes urgency when present"` — `meta.urgency` is `undefined`. The omits-urgency test should pass coincidentally (the absence is already the default).

- [ ] **Step 3: Modify `syncPagerdutyIncidentItems`**

In `packages/gateway/src/connectors/pagerduty-sync.ts:85-95`, just below the existing `const severity = pdPriorityName(row);` line and the metadata population, add `urgency`:

Locate this block (around line 91-94):
```typescript
    const metadata: Record<string, unknown> = { status: status ?? null, incidentId: id };
    if (Number.isFinite(openedAtMs)) metadata["opened_at_ms"] = openedAtMs;
    if (serviceId !== undefined && serviceId !== "") metadata["pagerduty_service_id"] = serviceId;
    if (severity !== undefined && severity !== "") metadata["severity"] = severity;
```

Replace with:
```typescript
    const metadata: Record<string, unknown> = { status: status ?? null, incidentId: id };
    if (Number.isFinite(openedAtMs)) metadata["opened_at_ms"] = openedAtMs;
    if (serviceId !== undefined && serviceId !== "") metadata["pagerduty_service_id"] = serviceId;
    if (severity !== undefined && severity !== "") metadata["severity"] = severity;
    const urgency = stringField(row, "urgency");
    if (urgency !== undefined && urgency !== "") metadata["urgency"] = urgency;
```

- [ ] **Step 4: Run the tests, verify they pass**

```
bun test packages/gateway/src/connectors/pagerduty-sync.test.ts
```

Expected: PASS — both new tests green, all pre-existing sync tests still green.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/connectors/pagerduty-sync.ts packages/gateway/src/connectors/pagerduty-sync.test.ts
git commit -m "feat(pagerduty): write metadata.urgency on indexed incidents

Phase 5 T4 wrap-up groundwork. Captures incident.urgency verbatim
(\"high\" / \"low\" per PagerDuty's REST v2 schema) when present.
Prereq for the preflight urgency-gap probe in the next commit."
```

---

### Task 6: Urgency-gap probe in preflight

**Goal:** When `active_p1_incidents.count === 0` AND services are configured, run one extra probe to detect high-urgency-without-priority incidents. Surface a new `PreflightGap` variant so operators can self-diagnose silent-zero preflight results.

**Files:**
- Modify: `packages/gateway/src/preflight/preflight.ts:17` (extend `PreflightGap` union)
- Modify: `packages/gateway/src/preflight/preflight.ts` (extend `selectActiveP1Incidents` body after the count is known)
- Modify: `packages/gateway/test/unit/preflight/preflight.test.ts` (extend `seedIncident` helper; add 3 new tests)

- [ ] **Step 1: Extend the `seedIncident` helper**

In `packages/gateway/test/unit/preflight/preflight.test.ts:10-42`, replace the `seedIncident` function with one that supports optional `severity` + new `urgency` field:

```typescript
function seedIncident(
  db: Database,
  id: string,
  opts: {
    status: "triggered" | "acknowledged" | "resolved";
    severity?: string;
    urgency?: string;
    pagerdutyServiceId: string;
    openedAtMs: number;
    title?: string;
    url?: string;
  },
) {
  const meta: Record<string, unknown> = {
    status: opts.status,
    pagerduty_service_id: opts.pagerdutyServiceId,
    opened_at_ms: opts.openedAtMs,
  };
  if (opts.severity !== undefined) meta.severity = opts.severity;
  if (opts.urgency !== undefined) meta.urgency = opts.urgency;
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
```

- [ ] **Step 2: Write the failing tests**

In `packages/gateway/test/unit/preflight/preflight.test.ts`, append these inside the `describe("computeDeployPreflight: active_p1_incidents check"...)` block:

```typescript
  it('emits gap="pagerduty_urgency_without_priority" when count===0 and high-urgency incidents lack priority', () => {
    seedIncident(db, "pagerduty:no_pri", {
      status: "triggered",
      urgency: "high",
      pagerdutyServiceId: "P12ABCD",
      openedAtMs: now - 60_000,
    });
    const out = computeDeployPreflight(db, cfg(), "main", now, 10);
    expect(out.checks.active_p1_incidents.count).toBe(0);
    expect(out.checks.active_p1_incidents.gap).toBe(
      "pagerduty_urgency_without_priority",
    );
  });

  it("urgency-gap is suppressed when count > 0", () => {
    seedIncident(db, "pagerduty:has_p1", {
      status: "triggered",
      severity: "P1",
      pagerdutyServiceId: "P12ABCD",
      openedAtMs: now - 60_000,
    });
    seedIncident(db, "pagerduty:no_pri", {
      status: "triggered",
      urgency: "high",
      pagerdutyServiceId: "P12ABCD",
      openedAtMs: now - 30_000,
    });
    const out = computeDeployPreflight(db, cfg(), "main", now, 10);
    expect(out.checks.active_p1_incidents.count).toBe(1);
    expect(out.checks.active_p1_incidents.gap).toBeNull();
  });

  it('urgency-gap defers to no_pagerduty_mapping when no services configured', () => {
    seedIncident(db, "pagerduty:no_pri", {
      status: "triggered",
      urgency: "high",
      pagerdutyServiceId: "P12ABCD",
      openedAtMs: now - 60_000,
    });
    const out = computeDeployPreflight(
      db,
      cfg({ pagerdutyServices: [] }),
      "main",
      now,
      10,
    );
    expect(out.checks.active_p1_incidents.count).toBe(0);
    expect(out.checks.active_p1_incidents.gap).toBe("no_pagerduty_mapping");
  });

  it("urgency-gap requires status in (triggered, acknowledged) — resolved high-urgency does not trigger", () => {
    seedIncident(db, "pagerduty:resolved_high", {
      status: "resolved",
      urgency: "high",
      pagerdutyServiceId: "P12ABCD",
      openedAtMs: now - 60_000,
    });
    const out = computeDeployPreflight(db, cfg(), "main", now, 10);
    expect(out.checks.active_p1_incidents.count).toBe(0);
    expect(out.checks.active_p1_incidents.gap).toBeNull();
  });
```

- [ ] **Step 3: Run the tests, verify they fail**

```
bun test packages/gateway/test/unit/preflight/preflight.test.ts
```

Expected: FAIL on the first new test — `gap` is `null` instead of `"pagerduty_urgency_without_priority"`. TypeScript also rejects the literal as not in the union.

- [ ] **Step 4: Extend `PreflightGap` union**

In `packages/gateway/src/preflight/preflight.ts:17`, replace:

```typescript
export type PreflightGap = null | "no_pagerduty_mapping" | "no_repos" | "unknown_mergeable_state";
```

with:

```typescript
export type PreflightGap =
  | null
  | "no_pagerduty_mapping"
  | "no_repos"
  | "unknown_mergeable_state"
  | "pagerduty_urgency_without_priority";
```

- [ ] **Step 5: Add the probe to `selectActiveP1Incidents`**

In `packages/gateway/src/preflight/preflight.ts`, in the body of `selectActiveP1Incidents` (modified in Task 4), find the trailing `return { count: countRow.c, findings, gap: null };` line.

Replace it with the following block (which runs the gap probe when `count === 0`):

```typescript
  // Phase 5 T4 wrap-up: urgency-gap probe. When the strict + aliased
  // severity filter yields zero matches AND services are configured, check
  // whether high-urgency-without-priority incidents exist. They indicate
  // either a missing severity_p1_aliases entry or a PagerDuty priority
  // setup quirk — surface as a diagnostic gap. Probe is gated on count===0
  // so any org with at least one active P1-equivalent skips it.
  let gap: PreflightGap = null;
  if (countRow.c === 0) {
    const probeRow = db
      .query(
        `SELECT COUNT(*) as c FROM item
         WHERE service = 'pagerduty'
           AND type = 'incident'
           AND json_extract(metadata, '$.pagerduty_service_id') IN (${pdPlaceholders})
           AND json_extract(metadata, '$.status') IN ('triggered', 'acknowledged')
           AND json_extract(metadata, '$.urgency') = 'high'
           AND (json_extract(metadata, '$.severity') IS NULL
                OR json_extract(metadata, '$.severity') = '')`,
      )
      .get(...cfg.pagerdutyServices) as { c: number };
    if (probeRow.c > 0) gap = "pagerduty_urgency_without_priority";
  }
  return { count: countRow.c, findings, gap };
```

- [ ] **Step 6: Run the tests, verify they pass**

```
bun test packages/gateway/test/unit/preflight/preflight.test.ts
```

Expected: PASS — all four new urgency-gap tests green, all pre-existing tests still green.

- [ ] **Step 7: Commit**

```bash
git add packages/gateway/src/preflight/preflight.ts packages/gateway/test/unit/preflight/preflight.test.ts
git commit -m "feat(preflight): urgency-gap diagnostic probe

Phase 5 T4 wrap-up. selectActiveP1Incidents now runs a single extra
probe query when count===0 AND services are configured, detecting
high-urgency-without-priority incidents on the same PD services.
Surfaces new PreflightGap variant 'pagerduty_urgency_without_priority'
so operators can self-diagnose silent-zero preflight results."
```

---

### Task 7: PagerDuty sync — request shape (Phase A of pagination)

**Goal:** Update the per-request URL to PD's max page size (100) and explicit ascending sort. Add `maxPagesPerSync` to the factory options bag with default 20 (no behavior change yet — still one fetch per sync). Sets up the loop in Task 8.

**Files:**
- Modify: `packages/gateway/src/connectors/pagerduty-sync.ts` (factory option type + URL params)

- [ ] **Step 1: Verify the existing single-page tests still capture URL shape**

The existing "fresh install uses 30-day backfill window" test captures `capturedUrl` and inspects `since`. After this task, that test should still pass because `since` is unchanged. No new test in Phase A — Phase B drives the loop.

- [ ] **Step 2: Modify the factory option type**

In `packages/gateway/src/connectors/pagerduty-sync.ts`, replace lines 131-133:

```typescript
export type PagerdutySyncableOptions = {
  ensurePagerdutyMcpRunning: () => Promise<void>;
  /**
   * Hard cap on pages walked per sync invocation. Default 20. Range 1..100
   * enforced by config parser; not re-validated here.
   */
  maxPagesPerSync?: number;
};
```

- [ ] **Step 3: Modify the URL construction in `sync()`**

In the same file, find the URL construction block (lines 154-158):

```typescript
      const u = new URL("https://api.pagerduty.com/incidents");
      u.searchParams.set("limit", "50");
      u.searchParams.set("sort_by", "updated_at");
      u.searchParams.set("since", since);
```

Replace with:

```typescript
      const u = new URL("https://api.pagerduty.com/incidents");
      u.searchParams.set("limit", "100");
      u.searchParams.set("sort_by", "updated_at:asc");
      u.searchParams.set("since", since);
      u.searchParams.set("offset", "0");
```

Note: leaving the rest of the function unchanged at this step — the loop is added in Task 8.

- [ ] **Step 4: Run the full pagerduty-sync test suite**

```
bun test packages/gateway/src/connectors/pagerduty-sync.test.ts
```

Expected: PASS — all existing tests still pass because the response shape hasn't changed and `since` is still set the same way. The `capturedUrl` test in particular verifies `since`, which is untouched.

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/connectors/pagerduty-sync.ts
git commit -m "refactor(pagerduty): per-request shape — limit=100, sort_by=asc, offset=0

Phase 5 T4 wrap-up Phase A. Bump page size 50 -> 100 (PD max), add
explicit sort_by=updated_at:asc for cursor-correctness under capping,
add offset=0 (constant for now). Adds maxPagesPerSync option (unused
in this commit — loop arrives in Phase B). Behavior preserved."
```

---

### Task 8: PagerDuty sync — page loop (Phase B of pagination)

**Goal:** Replace the single-fetch body with a bounded loop that follows PagerDuty's `parsed.more` flag, advances `offset` by `pagesFetched * 100`, accumulates upserts + `maxUpdated`, and reports `hasMore: true` on cap-hit so the scheduler re-queues.

**Files:**
- Modify: `packages/gateway/src/connectors/pagerduty-sync.ts` (rewrite the `sync()` body)
- Modify: `packages/gateway/src/connectors/pagerduty-sync.test.ts` (3 new tests + extended fetch stub helper)

- [ ] **Step 1: Add a multi-page fetch stub helper at the top of the test file**

In `packages/gateway/src/connectors/pagerduty-sync.test.ts`, after the existing `stubPagerdutyIncidents` function (around line 42), add:

```typescript
type PdPageResponse = { incidents: unknown[]; more: boolean };

function stubPagerdutyPages(pages: readonly PdPageResponse[]): { calls: string[] } {
  const calls: string[] = [];
  let i = 0;
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
    const url = urlFromFetchInput(input);
    calls.push(url);
    if (!url.startsWith("https://api.pagerduty.com/incidents")) {
      throw new Error(`unexpected fetch: ${url}`);
    }
    const page = pages[Math.min(i, pages.length - 1)];
    i += 1;
    if (page === undefined) throw new Error("stubPagerdutyPages: no pages configured");
    return new Response(JSON.stringify(page), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  return { calls };
}
```

- [ ] **Step 2: Write the failing tests**

In the same file, append these inside `describeWithFetchRestore("pagerduty-sync", () => { ... })`:

```typescript
  test("walks pages until parsed.more=false", async () => {
    const { calls } = stubPagerdutyPages([
      {
        incidents: [
          {
            id: "P_A",
            title: "A",
            created_at: "2026-05-10T10:00:00Z",
            updated_at: "2026-05-10T10:00:00Z",
            status: "triggered",
            priority: { name: "P1" },
            service: { id: "PJK1HJ8" },
          },
        ],
        more: true,
      },
      {
        incidents: [
          {
            id: "P_B",
            title: "B",
            created_at: "2026-05-10T11:00:00Z",
            updated_at: "2026-05-10T11:00:00Z",
            status: "triggered",
            priority: { name: "P1" },
            service: { id: "PJK1HJ8" },
          },
        ],
        more: true,
      },
      {
        incidents: [
          {
            id: "P_C",
            title: "C",
            created_at: "2026-05-10T12:00:00Z",
            updated_at: "2026-05-10T12:00:00Z",
            status: "triggered",
            priority: { name: "P1" },
            service: { id: "PJK1HJ8" },
          },
        ],
        more: false,
      },
    ]);
    const db = createMemoryIndexDb();
    const sync = createPagerdutySyncable({ ensurePagerdutyMcpRunning: async () => {} });
    const vault = createStubVault({ "pagerduty.api_token": "test-token" });
    const result = await sync.sync(syncTestContext(db, vault), null);
    expect(calls.length).toBe(3);
    expect(new URL(calls[1] as string).searchParams.get("offset")).toBe("100");
    expect(new URL(calls[2] as string).searchParams.get("offset")).toBe("200");
    expect(result.itemsUpserted).toBe(3);
    expect(result.hasMore).toBe(false);
    const cursor = result.cursor as string;
    const decoded = Buffer.from(cursor.slice("nimbus-pd1:".length), "base64url").toString("utf8");
    expect(JSON.parse(decoded)).toEqual({ lastUpdated: "2026-05-10T12:00:00Z" });
  });

  test("respects maxPagesPerSync cap and emits hasMore=true", async () => {
    const { calls } = stubPagerdutyPages([
      {
        incidents: [
          {
            id: "P_A",
            title: "A",
            created_at: "2026-05-10T10:00:00Z",
            updated_at: "2026-05-10T10:00:00Z",
            status: "triggered",
            priority: { name: "P1" },
            service: { id: "PJK1HJ8" },
          },
        ],
        more: true,
      },
      {
        incidents: [
          {
            id: "P_B",
            title: "B",
            created_at: "2026-05-10T11:00:00Z",
            updated_at: "2026-05-10T11:00:00Z",
            status: "triggered",
            priority: { name: "P1" },
            service: { id: "PJK1HJ8" },
          },
        ],
        more: true,
      },
      {
        incidents: [
          {
            id: "P_C",
            title: "Never reached",
            created_at: "2026-05-10T12:00:00Z",
            updated_at: "2026-05-10T12:00:00Z",
            status: "triggered",
            priority: { name: "P1" },
            service: { id: "PJK1HJ8" },
          },
        ],
        more: true,
      },
    ]);
    const db = createMemoryIndexDb();
    const sync = createPagerdutySyncable({
      ensurePagerdutyMcpRunning: async () => {},
      maxPagesPerSync: 2,
    });
    const vault = createStubVault({ "pagerduty.api_token": "test-token" });
    const result = await sync.sync(syncTestContext(db, vault), null);
    expect(calls.length).toBe(2);
    expect(result.itemsUpserted).toBe(2);
    expect(result.hasMore).toBe(true);
    const cursor = result.cursor as string;
    const decoded = Buffer.from(cursor.slice("nimbus-pd1:".length), "base64url").toString("utf8");
    expect(JSON.parse(decoded)).toEqual({ lastUpdated: "2026-05-10T11:00:00Z" });
  });

  test("partial-failure preserves cursor progress from successful pages", async () => {
    let call = 0;
    globalThis.fetch = (async () => {
      call += 1;
      if (call === 1) {
        return new Response(
          JSON.stringify({
            incidents: [
              {
                id: "P_PAGE1",
                title: "Page 1 row",
                created_at: "2026-05-10T10:00:00Z",
                updated_at: "2026-05-10T10:00:00Z",
                status: "triggered",
                priority: { name: "P1" },
                service: { id: "PJK1HJ8" },
              },
            ],
            more: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("Internal Server Error", { status: 500 });
    }) as typeof fetch;
    const db = createMemoryIndexDb();
    const sync = createPagerdutySyncable({ ensurePagerdutyMcpRunning: async () => {} });
    const vault = createStubVault({ "pagerduty.api_token": "test-token" });
    const result = await sync.sync(syncTestContext(db, vault), null);
    expect(result.itemsUpserted).toBe(1);
    expect(result.hasMore).toBe(false);
    const cursor = result.cursor as string;
    const decoded = Buffer.from(cursor.slice("nimbus-pd1:".length), "base64url").toString("utf8");
    // Cursor advances past page-1's max updated_at, NOT back to the original since.
    expect(JSON.parse(decoded)).toEqual({ lastUpdated: "2026-05-10T10:00:00Z" });
  });
```

- [ ] **Step 3: Run the tests, verify they fail**

```
bun test packages/gateway/src/connectors/pagerduty-sync.test.ts
```

Expected: FAIL on all three new tests — the current sync fetches once and returns.

- [ ] **Step 4: Refactor the private parse helper to return `{ incidents, more }` in one pass**

In `packages/gateway/src/connectors/pagerduty-sync.ts`, find the existing private helper `parsePagerdutyIncidents` (around lines 35-48):

```typescript
function parsePagerdutyIncidents(text: string): unknown[] | null {
  let root: unknown;
  try {
    root = JSON.parse(text) as unknown;
  } catch {
    return null;
  }
  const rec = asRecord(root);
  if (rec === undefined) {
    return null;
  }
  const raw = rec["incidents"];
  return Array.isArray(raw) ? raw : null;
}
```

Replace with a unified parser that returns both `incidents` and `more` in a single JSON parse:

```typescript
function parsePagerdutyListResponse(
  text: string,
): { incidents: unknown[]; more: boolean } | null {
  let root: unknown;
  try {
    root = JSON.parse(text) as unknown;
  } catch {
    return null;
  }
  const rec = asRecord(root);
  if (rec === undefined) return null;
  const incidents = rec["incidents"];
  if (!Array.isArray(incidents)) return null;
  // PagerDuty's REST v2 list response wraps the array with a sibling
  // boolean `more`. Absent (or non-boolean) is treated as `false` so the
  // loop terminates on a malformed response.
  return { incidents, more: rec["more"] === true };
}
```

- [ ] **Step 5: Rewrite `createPagerdutySyncable`'s `sync` body**

In the same file, replace the entire `createPagerdutySyncable` function (lines 135-195) with this version:

```typescript
export function createPagerdutySyncable(options: PagerdutySyncableOptions): Syncable {
  const initialSyncDepthDays = 30;
  const maxPagesPerSync = Math.max(1, Math.min(100, options.maxPagesPerSync ?? 20));
  const PAGE_SIZE = 100;
  return {
    serviceId: SERVICE_ID,
    defaultIntervalMs: 120 * 1000,
    initialSyncDepthDays,
    async sync(ctx: SyncContext, cursor: string | null): Promise<SyncResult> {
      const t0 = performance.now();
      await options.ensurePagerdutyMcpRunning();
      const token = await readConnectorSecret(ctx.vault, "pagerduty", "api_token");
      if (token === null || token.trim() === "") {
        return syncNoopResult(cursor, t0);
      }
      const prev = decodeCursor(cursor);
      // Single `now` for the whole sync batch — standard atomic batch
      // semantics. With maxPagesPerSync=20 and the default 2-minute
      // sync interval, drift is at most seconds; `syncedAt` is the
      // sync-start timestamp by design. (Reviewer concern #3 noted.)
      const now = Date.now();
      const floorIso = new Date(now - initialSyncDepthDays * 86_400_000).toISOString();
      const since = prev?.lastUpdated ?? floorIso;

      let pagesFetched = 0;
      let totalUpserted = 0;
      let maxUpdated = since;
      let lastTextLen = 0;
      let pdHasMore = false;

      while (pagesFetched < maxPagesPerSync) {
        await ctx.rateLimiter.acquire("pagerduty");
        const u = new URL("https://api.pagerduty.com/incidents");
        u.searchParams.set("limit", String(PAGE_SIZE));
        u.searchParams.set("sort_by", "updated_at:asc");
        u.searchParams.set("since", since);
        u.searchParams.set("offset", String(pagesFetched * PAGE_SIZE));
        const res = await fetch(u.toString(), {
          headers: {
            Accept: "application/vnd.pagerduty+json;version=2",
            Authorization: `Token token=${token.trim()}`,
          },
        });
        const text = await res.text();
        lastTextLen = text.length;
        if (!res.ok) {
          ctx.logger.warn(
            { serviceId: SERVICE_ID, status: res.status, page: pagesFetched },
            "pagerduty sync: list failed",
          );
          // Preserve progress: cursor reflects pages already ingested.
          // PD `since` is inclusive (`updated_at >= since`); if the failed
          // page contained rows sharing the saved timestamp, next sync
          // re-fetches them and SQLite UPSERT on (service, external_id)
          // deduplicates idempotently.
          return {
            cursor: encodeCursor({ lastUpdated: maxUpdated }),
            itemsUpserted: totalUpserted,
            itemsDeleted: 0,
            hasMore: false,
            durationMs: Math.round(performance.now() - t0),
            bytesTransferred: lastTextLen,
          };
        }
        // Single JSON.parse per page — returns both `incidents` and `more`.
        const parsed = parsePagerdutyListResponse(text);
        if (parsed === null) {
          return {
            cursor: encodeCursor({ lastUpdated: maxUpdated }),
            itemsUpserted: totalUpserted,
            itemsDeleted: 0,
            hasMore: false,
            durationMs: Math.round(performance.now() - t0),
            bytesTransferred: lastTextLen,
          };
        }
        const { upserted, maxUpdated: pageMax } = syncPagerdutyIncidentItems(
          ctx,
          parsed.incidents,
          maxUpdated,
          now,
        );
        totalUpserted += upserted;
        maxUpdated = pageMax;
        pagesFetched += 1;
        pdHasMore = parsed.more;
        if (!pdHasMore) break;
      }

      return {
        cursor: encodeCursor({ lastUpdated: maxUpdated }),
        itemsUpserted: totalUpserted,
        itemsDeleted: 0,
        hasMore: pagesFetched >= maxPagesPerSync && pdHasMore,
        durationMs: Math.round(performance.now() - t0),
        bytesTransferred: lastTextLen,
      };
    },
  };
}
```

The existing `pagerdutyListFailureResult` helper at lines 115-129 is no longer used by the rewritten sync — delete it. Find the function definition and remove it.

- [ ] **Step 6: Run the tests, verify they pass**

```
bun test packages/gateway/src/connectors/pagerduty-sync.test.ts
```

Expected: PASS — all three new tests green, all pre-existing tests still green.

- [ ] **Step 7: Commit**

```bash
git add packages/gateway/src/connectors/pagerduty-sync.ts packages/gateway/src/connectors/pagerduty-sync.test.ts
git commit -m "feat(pagerduty): walk all incident pages per sync

Phase 5 T4 wrap-up Phase B. Replaces the single-fetch sync body with a
bounded loop that follows PD's parsed.more flag, advances offset by
pagesFetched * 100, and reports SyncResult.hasMore=true on cap-hit so
the scheduler re-queues. Parse helper refactored to return both
incidents+more in one JSON.parse pass. Three new tests: walks-until-
more=false, respects maxPagesPerSync cap, partial-failure preserves
cursor."
```

---

### Task 9: Bootstrap thread `maxPagesPerSync`

**Goal:** Wire the `[pagerduty].max_pages_per_sync` config value into the syncable factory at gateway startup.

**Files:**
- Modify: `packages/gateway/src/platform/assemble.ts` (load config, pass into registrations)
- Modify: `packages/gateway/src/platform/assemble-sync-registrations.ts` (accept new param, thread to factory)

- [ ] **Step 1: Extend the `assemble-sync-registrations.ts` signature**

In `packages/gateway/src/platform/assemble-sync-registrations.ts:33-36`, replace:

```typescript
export function registerConnectorMeshSyncables(
  syncScheduler: SyncScheduler,
  connectorMesh: LazyConnectorMesh,
): void {
```

with:

```typescript
export type ConnectorMeshSyncableOptions = {
  /** Phase 5 T4 wrap-up: hard cap on pages walked per pagerduty sync. */
  pagerdutyMaxPagesPerSync: number;
};

export function registerConnectorMeshSyncables(
  syncScheduler: SyncScheduler,
  connectorMesh: LazyConnectorMesh,
  options: ConnectorMeshSyncableOptions,
): void {
```

Then in the same file, replace the existing `createPagerdutySyncable` registration (lines 127-131):

```typescript
  syncScheduler.register(
    createPagerdutySyncable({
      ensurePagerdutyMcpRunning: () => connectorMesh.ensurePagerdutyRunning(),
    }),
  );
```

with:

```typescript
  syncScheduler.register(
    createPagerdutySyncable({
      ensurePagerdutyMcpRunning: () => connectorMesh.ensurePagerdutyRunning(),
      maxPagesPerSync: options.pagerdutyMaxPagesPerSync,
    }),
  );
```

- [ ] **Step 2: Wire it at the call site in `assemble.ts`**

In `packages/gateway/src/platform/assemble.ts`, find the existing imports from `../config/nimbus-toml.ts` (around line 11-16):

```typescript
import {
  loadNimbusAutomationFromConfigDir,
  loadNimbusEmbeddingFromPath,
  loadNimbusLlmPartialFromPath,
  loadNimbusUpdaterFromConfigDir,
  resolveNimbusTomlForProfile,
} from "../config/nimbus-toml.ts";
```

Add `loadNimbusPagerdutyFromConfigDir` to the imports:

```typescript
import {
  loadNimbusAutomationFromConfigDir,
  loadNimbusEmbeddingFromPath,
  loadNimbusLlmPartialFromPath,
  loadNimbusPagerdutyFromConfigDir,
  loadNimbusUpdaterFromConfigDir,
  resolveNimbusTomlForProfile,
} from "../config/nimbus-toml.ts";
```

Then find the `registerConnectorMeshSyncables(syncScheduler, connectorMesh)` call at line 278. Replace it with:

```typescript
  const pagerdutyCfg = loadNimbusPagerdutyFromConfigDir(paths.configDir);
  registerConnectorMeshSyncables(syncScheduler, connectorMesh, {
    pagerdutyMaxPagesPerSync: pagerdutyCfg.maxPagesPerSync,
  });
```

- [ ] **Step 3: Run typecheck**

```
bun run typecheck
```

Expected: PASS. If there are other callers of `registerConnectorMeshSyncables` — check with:

```
grep -rn "registerConnectorMeshSyncables" packages/gateway --include="*.ts"
```

Update any additional callers with the new options arg.

- [ ] **Step 4: Run the full gateway test suite**

```
bun test packages/gateway
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(gateway): wire [pagerduty].max_pages_per_sync at bootstrap

Phase 5 T4 wrap-up. assemble.ts loads the [pagerduty] block once at
startup and threads maxPagesPerSync into registerConnectorMeshSyncables,
which now takes an options bag for connector-mesh syncables. Default
20 pages per sync (parsed default in nimbus-toml.ts)."
```

---

### Task 10: Roadmap + CLAUDE.md updates

**Goal:** Flip the two `[ ]` rows in the roadmap and add a one-line entry to CLAUDE.md's Status block.

**Files:**
- Modify: `docs/roadmap.md` (two specific bullets — see grep)
- Modify: `CLAUDE.md` (Status line, ~line 13)

- [ ] **Step 1: Locate the two roadmap bullets**

```
grep -n "PagerDuty sync pagination\|severity_strategy.*config knob" docs/roadmap.md
```

Expected output: two line numbers in the "Nimbus as a CI/CD Data Layer" section. Note them.

- [ ] **Step 2: Flip the first bullet (pagination)**

In `docs/roadmap.md`, find this block (the "PagerDuty sync pagination" bullet, currently `[ ]`):

```markdown
- [ ] **PagerDuty sync pagination** — follow `has_more` on `GET /incidents` and walk pages
  until exhausted (or until a `[pagerduty].max_pages_per_sync` cap is hit). Today the sync
  fetches the first 50 incidents updated since the cursor and drops the tail. DORA accuracy
  for high-volume orgs depends on this. No new credentials.
```

Replace with:

```markdown
- [x] **PagerDuty sync pagination** (2026-05-16, Phase 5 T4 wrap-up) — `pagerduty-sync.ts`
  now walks pages with `sort_by=updated_at:asc` and `limit=100`, honoring `parsed.more`
  and capping at `[pagerduty].max_pages_per_sync` (default 20, range 1..100). On cap-hit
  the syncable returns `hasMore: true` so the scheduler re-queues; partial-failure cursors
  preserve progress from pages already ingested. No new credentials.
```

- [ ] **Step 3: Flip the second bullet (severity_strategy)**

In the same file, find this block:

```markdown
- [ ] **`[pagerduty].severity_strategy` config knob** — let teams map non-`"P1"` priority
  names (`"Critical"`, `"SEV-1"`) to preflight's P1 filter; emit a `gap` note in
  `deploy.preflight` when the connector sees `urgency: "high"` incidents with no
  `priority.name`, so operators can self-diagnose silent-zero preflight results. Bundles
  the alias-map and urgency-gap-warning Gemini-CLI suggested separately in the
  enrichment review §2.2.
```

Replace with:

```markdown
- [x] **`[pagerduty].severity_p1_aliases` config knob** (2026-05-16, Phase 5 T4 wrap-up) —
  preflight's `selectActiveP1Incidents` now matches `LOWER(severity) IN (?, ?, ...)` over
  the union of `"p1"` plus org-declared aliases (e.g. `"Critical"`, `"SEV-1"`). Aliases are
  lowercased + deduped at parse time. New `PreflightGap` variant
  `"pagerduty_urgency_without_priority"` fires when the strict filter yields zero matches
  but high-urgency-without-priority incidents exist on the configured services, so operators
  can self-diagnose silent-zero preflight results. Query-time evaluation — no re-index needed.
```

- [ ] **Step 4: Update CLAUDE.md Status line**

In `CLAUDE.md`, find the Status block (around line 13). Look for the section ending with `T6 PR 2 \`tool_call_log\` V29 ✅ (2026-05-15)`. After `T4 wrap-up: PagerDuty enrichment ✅ (2026-05-14)`, the existing text continues with `T6 sequencing spec`. Find the substring:

```
T4 wrap-up: PagerDuty enrichment ✅ (2026-05-14) · T6 sequencing spec
```

Replace with:

```
T4 wrap-up: PagerDuty enrichment ✅ (2026-05-14) · T4 wrap-up: PagerDuty pagination + severity_p1_aliases ✅ (2026-05-16) · T6 sequencing spec
```

- [ ] **Step 5: Commit**

```bash
git add docs/roadmap.md CLAUDE.md
git commit -m "docs(roadmap): flip pagination + severity_p1_aliases to [x]

Phase 5 T4 wrap-up complete. Backfills the roadmap + CLAUDE.md Status
line with what shipped today."
```

---

### Task 11: Full CI parity verification

**Goal:** Run the full CI suite locally to catch anything the per-file `bun test` runs missed.

**Files:** none directly modified.

- [ ] **Step 1: Run typecheck across the whole workspace**

```
bun run typecheck
```

Expected: PASS. If errors surface anywhere outside the files we touched, investigate — it may indicate a fixture site missed in Task 2.

- [ ] **Step 2: Run lint**

```
bun run lint
```

Expected: PASS. Apply `bun run lint:fix` if Biome flags style issues.

- [ ] **Step 3: Run the gateway test coverage gates affected by this PR**

```
bun run test:coverage:preflight
```

Expected: PASS, coverage gate ≥ 80% held.

```
bun run test:coverage:config
```

Expected: PASS, gate ≥ 80% held.

- [ ] **Step 4: Run the full unit + integration suite for the gateway**

```
bun test packages/gateway
```

Expected: PASS.

- [ ] **Step 5: Decide whether `bun run test:ci` is needed**

If steps 1-4 are green, the per-package gates have covered the critical paths. A full `bun run test:ci` is the strongest pre-PR check but takes longer; run it before opening the PR if the previous tasks took less than an hour total.

- [ ] **Step 6: Final commit if any formatting / lint-fix touched files**

```bash
git status
# If any files changed, commit:
git add -A
git commit -m "chore: biome auto-format pass after T4 wrap-up implementation"
```

- [ ] **Step 7: Inspect commit graph**

```
git log --oneline main..HEAD
```

Expected: 9-10 commits on the branch, all green-prefixed (`feat:`, `refactor:`, `docs:`, `chore:` etc.).

---

## Self-Review Notes

After writing this plan, I verified:

**Spec coverage:** Every requirement in the spec maps to a task —
- `[pagerduty]` parser + types + loader → Task 1
- `ServiceConfig.severityP1Aliases` field → Task 2
- Threading at `loadNimbusServiceConfigsFromConfigDir` → Task 3
- Preflight SQL widening → Task 4
- `metadata.urgency` writes → Task 5
- Urgency-gap probe + `PreflightGap` extension → Task 6
- Pagination request shape → Task 7
- Pagination loop + factory option + tests → Task 8
- Bootstrap threading of `maxPagesPerSync` → Task 9
- Roadmap + CLAUDE.md → Task 10
- CI parity → Task 11

**Placeholder scan:** No "TODO", "TBD", "fill in", or "similar to" found.

**Type consistency:** `severityP1Aliases` (field on `ServiceConfig`), `severityP1Aliases` (Task 2 default + Task 3 threading + Task 4 SQL consumer), `maxPagesPerSync` (option key throughout Tasks 7, 8, 9) — names match end-to-end.

**Known minor risk:** Task 2's typecheck step is the broadest — it surfaces fixtures across multiple test directories. The plan lists the likely sites but tells the engineer to use `grep` to find the actual set; this is intentional because the test fixtures are mechanical fillers, not load-bearing logic.

---

## Review responses

Disposition of the five points raised in [2026-05-16-phase-5-t4-wrap-pagerduty-pagination-severity-review.md](./2026-05-16-phase-5-t4-wrap-pagerduty-pagination-severity-review.md):

| # | Point | Disposition | Action in plan |
|---|---|---|---|
| 1 | Double JSON parse in Task 8 | **FIX** | Task 8 step 4 refactors private `parsePagerdutyIncidents` → `parsePagerdutyListResponse` returning `{ incidents, more }`; step 5's loop uses the single-parse helper |
| 2 | Cursor staging UPSERT reliance | **FIX** (clarifying comment) | Added inline code comment in the partial-failure return path of Task 8 step 5 noting PD's inclusive `since` + SQLite UPSERT idempotency |
| 3 | Stale `now` timestamp drift | **DOCUMENT** (no behavior change) | Added inline code comment in Task 8 step 5 explaining the batch-atomic `synced_at` semantic is intentional; drift is bounded to seconds at default settings |
| 4 | SQL IN clause Set usage | **ACKNOWLEDGE** (positive feedback) | No action — reviewer commended the existing design |
| 5 | Silent validation-error fallback | **FIX** | Task 1 step 3 `loadNimbusPagerdutyFromPath` now writes a stderr warning before returning defaults; Task 1 step 1 adds a test asserting the warning fires |

### 1. Double JSON parse — FIX

The reviewer is right: `parsePagerdutyIncidents(text)` was followed by a second `JSON.parse(text)` to extract `more`. Refactored to a single helper `parsePagerdutyListResponse` that returns both fields in one pass. The helper is private (not exported, no external callers verified via grep), so the rename + signature change is safe. Net effect: one `JSON.parse` per page instead of two, simpler code, and a typed return value that documents the response shape.

### 2. Cursor staging UPSERT reliance — FIX as comment

The reviewer asks for explicit acknowledgment that PD's inclusive `since` + SQLite UPSERT semantics make cross-page failure idempotent. The spec already documents this in `§Part 1`; the plan now folds a single-sentence inline code comment into the partial-failure return path so a future maintainer reading the sync body sees it in context. No behavior change.

### 3. Stale `now` timestamp drift — DOCUMENT as comment

The reviewer is correct that `now` is captured once and could drift across pages, but the impact analysis shows this is the intended batch-atomic `synced_at` semantic, not a bug:

- `syncPagerdutyIncidentItems` uses `now` for two fields: `syncedAt` (always) and `modifiedAt` (only as the fallback when `updated_at`/`created_at` are unparseable). Using a single sync-start timestamp for `synced_at` across an entire batch is standard practice — it lets `WHERE synced_at >= ?` queries identify whole sync windows cleanly.
- Preflight's `incidentWindowMinutes` is evaluated against `opened_at_ms` (derived from PD's `created_at`), not `synced_at`. Drift in `now` does not affect it.
- At default settings (20 pages × ~100ms per fetch + rate-limiter tokens), drift is bounded to a few seconds. The configured maximum (100 pages) could in theory push this to tens of seconds, but `synced_at` is not a clock-accuracy field.

Added an inline comment explaining this near the `const now = Date.now()` line so future maintainers don't second-guess it.

### 4. Set-based IN clause — ACKNOWLEDGE

Reviewer commended the `new Set(["p1", ...aliases])` pattern + the `cfg.pagerdutyServices.length === 0` guard against empty-IN SQL errors. Already in the plan as-is. No action.

### 5. Silent validation-error fallback — FIX

Real concern. `loadNimbusPagerdutyFromPath` catches every error and returns defaults, which means a misconfigured `max_pages_per_sync = 0` would silently fall back to 20 with no operator-visible signal. Added a `process.stderr.write` warning in the catch block matching the existing `[ci.service.<id>] / [metrics.dora.<id>]` conflict-warning pattern in the same file (line 959). Also added a test in Task 1 step 1 that captures `process.stderr.write` and asserts the warning contains `"[pagerduty] config"` + `"max_pages_per_sync"`, so a future refactor can't silently strip the warning.

Net: one real efficiency fix, two clarifying comments, one substantive defensive add (stderr warning + test), one acknowledgement.
