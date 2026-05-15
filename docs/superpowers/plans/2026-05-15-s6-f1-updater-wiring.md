# S6-F1 Updater Wiring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instantiate the existing `Updater` state machine in gateway startup so `nimbus update --check` and the startup `updater.updateAvailable` notification work against a live state object instead of returning `ERR_UPDATER_NOT_CONFIGURED`.

**Architecture:** New factory + platform-target derivation under `packages/gateway/src/updater/`. New `IPCServer` members (`setUpdater` + `broadcast`) so `assemble.ts` can attach the Updater after the IPC server starts and wire the notification-broadcast channel. Hardcoded `"0.1.0"` literals consolidated into a single `GATEWAY_VERSION` constant.

**Tech Stack:** Bun + TypeScript 6 strict, `bun:test`, existing `@nimbus-dev/sdk` test fixtures (`makeKeypair`).

**Spec:** [`docs/superpowers/specs/2026-05-15-s6-f1-updater-wiring-design.md`](../specs/2026-05-15-s6-f1-updater-wiring-design.md)
**Review:** [`docs/superpowers/specs/2026-05-15-s6-f1-updater-wiring-design-review.md`](../specs/2026-05-15-s6-f1-updater-wiring-design-review.md)

**Branch:** `dev/asafgolombek/phase-4-s6-f1-updater-wiring` (already checked out; spec + review folded in commits `ec905ff4` and `3b24dfc0`).

---

## File Map

**New:**
- `packages/gateway/src/version.ts` — single-export `GATEWAY_VERSION` constant
- `packages/gateway/src/updater/platform-target.ts` — `derivePlatformTarget()` mapping `process.platform` + `process.arch` to the 4-value `PlatformTarget` union
- `packages/gateway/src/updater/platform-target.test.ts`
- `packages/gateway/src/updater/factory.ts` — `createUpdaterFromConfig(...)`
- `packages/gateway/src/updater/factory.test.ts`
- `packages/gateway/test/integration/updater/wiring.test.ts` — factory + dispatch against a Bun.serve mock manifest

**Modified:**
- `packages/gateway/src/ipc/types.ts` — add `setUpdater` + `broadcast` to `IPCServer`
- `packages/gateway/src/ipc/server/server.ts` — implement the two new members
- `packages/gateway/src/platform/assemble.ts` — wire factory after `createIpcServer`; replace two existing `"0.1.0"` literals with `GATEWAY_VERSION`
- `docs/roadmap.md` — flip S6-F1 `[ ]` → `[x]`; rewrite L408/L412 prose; add four follow-up entries

---

## Task 1: `GATEWAY_VERSION` constant

Single source of truth for the gateway version string. Migrate the two existing literal sites at the same time so the new factory becomes the third *consumer* of the constant rather than the third independent literal.

**Files:**
- Create: `packages/gateway/src/version.ts`
- Modify: `packages/gateway/src/platform/assemble.ts:364`, `packages/gateway/src/platform/assemble.ts:388`

- [ ] **Step 1.1: Create `version.ts`**

```ts
// packages/gateway/src/version.ts

/**
 * Gateway version string — single source of truth, gateway-internal.
 *
 * Consumed by:
 * - `platform/assemble.ts` IPC server `version` field (surfaced via
 *   `gateway.ping` to clients)
 * - `platform/assemble.ts` telemetry collector `gatewayVersion` field
 * - `updater/factory.ts` Updater `currentVersion` field
 *
 * Bump in lockstep with `packages/gateway/package.json` `version` on every
 * gateway release. The CLI / UI / SDK never import gateway internals (per
 * the package-dependency rules in CLAUDE.md — IPC-only) and consume the
 * version dynamically through `gateway.ping`, so the constant is correctly
 * gateway-package-private.
 *
 * Known gap: `release-please` does not currently track the gateway as a
 * component, so neither `package.json` nor this constant is auto-bumped on
 * release. Single-sourcing reduces the manual hand-edit burden from two
 * sites to one (was: assemble.ts:364 and :388 — both inline literals).
 * Adding the gateway as a release-please component + listing this file in
 * `extra-files` is tracked as a separate follow-up (see roadmap).
 */
export const GATEWAY_VERSION = "0.1.0";
```

- [ ] **Step 1.2: Migrate the two existing literal sites**

In `packages/gateway/src/platform/assemble.ts`, find the two `"0.1.0"` string literals (around L364 in the `ipcOpts` block and L388 in the `startTelemetryFlushScheduler` block) and replace each with `GATEWAY_VERSION`. Add the import at the top of the file with the other `..` imports:

```ts
import { GATEWAY_VERSION } from "../version.ts";
```

The two replacements:

```ts
// L364 — was: version: "0.1.0",
version: GATEWAY_VERSION,
```

```ts
// L388 — was: gatewayVersion: "0.1.0",
gatewayVersion: GATEWAY_VERSION,
```

- [ ] **Step 1.3: Verify the codebase still builds**

Run: `bun run typecheck`
Expected: no new errors. If the typecheck was already failing on unrelated files before this PR, the new file additions should not increase the error count.

- [ ] **Step 1.4: Search for any other `"0.1.0"` literal in the gateway source**

Run: `grep -rn '"0\.1\.0"' packages/gateway/src/ --include='*.ts' | grep -v '\.test\.ts'`
Expected: only the new `version.ts` line. If any other production source still has the literal, migrate it too.

- [ ] **Step 1.5: Commit**

```bash
git add packages/gateway/src/version.ts packages/gateway/src/platform/assemble.ts
git commit -m "refactor(gateway): single-source GATEWAY_VERSION constant

PR 4 (S6-F1 wiring) adds a third consumer of the gateway version
literal. Consolidate the two existing sites in assemble.ts (IPC server
version + telemetry gatewayVersion) into one constant in version.ts so
the new Updater factory becomes the third *consumer* rather than the
third independent literal. Future bumps flip one line."
```

---

## Task 2: `derivePlatformTarget()`

Pure function mapping `process.platform` + `process.arch` to the 4-value `PlatformTarget` union, with optional argument injection for tests.

**Files:**
- Create: `packages/gateway/src/updater/platform-target.ts`
- Create: `packages/gateway/src/updater/platform-target.test.ts`

- [ ] **Step 2.1: Write the failing test**

```ts
// packages/gateway/src/updater/platform-target.test.ts
import { describe, expect, test } from "bun:test";
import { derivePlatformTarget } from "./platform-target.ts";

describe("derivePlatformTarget", () => {
  test("darwin + x64 → darwin-x86_64", () => {
    expect(derivePlatformTarget("darwin", "x64")).toBe("darwin-x86_64");
  });

  test("darwin + arm64 → darwin-aarch64", () => {
    expect(derivePlatformTarget("darwin", "arm64")).toBe("darwin-aarch64");
  });

  test("linux + x64 → linux-x86_64", () => {
    expect(derivePlatformTarget("linux", "x64")).toBe("linux-x86_64");
  });

  test("win32 + x64 → windows-x86_64", () => {
    expect(derivePlatformTarget("win32", "x64")).toBe("windows-x86_64");
  });

  // Explicitly-deferred unsupported combos — return undefined so the
  // factory can skip wiring without crashing the gateway.
  test("linux + arm64 → undefined (linux-aarch64 deferred)", () => {
    expect(derivePlatformTarget("linux", "arm64")).toBeUndefined();
  });

  test("win32 + arm64 → undefined (Copilot+/WoA deferred — needs PlatformTarget union update + manifest schema + Windows ARM build target)", () => {
    expect(derivePlatformTarget("win32", "arm64")).toBeUndefined();
  });

  test("freebsd + x64 → undefined (no FreeBSD release)", () => {
    expect(derivePlatformTarget("freebsd", "x64")).toBeUndefined();
  });

  test("with no arguments uses process.platform + process.arch (smoke)", () => {
    // The result depends on the host the test runs on. Just verify it
    // returns either a known target or undefined — never throws.
    const result = derivePlatformTarget();
    if (result !== undefined) {
      expect([
        "darwin-x86_64",
        "darwin-aarch64",
        "linux-x86_64",
        "windows-x86_64",
      ]).toContain(result);
    }
  });
});
```

- [ ] **Step 2.2: Run the test to verify it fails**

Run: `bun test packages/gateway/src/updater/platform-target.test.ts`
Expected: FAIL with `Cannot find module './platform-target.ts'` or equivalent.

- [ ] **Step 2.3: Write the minimal implementation**

```ts
// packages/gateway/src/updater/platform-target.ts
import type { PlatformTarget } from "./types.ts";

/**
 * Map `process.platform` + `process.arch` to a `PlatformTarget` literal
 * (or `undefined` when the combination is not in the supported release set).
 *
 * Unsupported combos (`linux-aarch64`, `windows-aarch64`, `freebsd-*`) return
 * `undefined` so the factory can skip wiring without crashing. The dispatcher
 * then returns `ERR_UPDATER_NOT_CONFIGURED` for `updater.*` calls — the
 * correct signal on an unsupported architecture.
 *
 * Adding a new supported combo requires (a) extending the `PlatformTarget`
 * union in `types.ts`, (b) adding the corresponding asset entry to the
 * manifest schema, and (c) building the binary in the release pipeline.
 */
export function derivePlatformTarget(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): PlatformTarget | undefined {
  if (platform === "darwin" && arch === "x64") return "darwin-x86_64";
  if (platform === "darwin" && arch === "arm64") return "darwin-aarch64";
  if (platform === "linux" && arch === "x64") return "linux-x86_64";
  if (platform === "win32" && arch === "x64") return "windows-x86_64";
  return undefined;
}
```

- [ ] **Step 2.4: Run the test to verify it passes**

Run: `bun test packages/gateway/src/updater/platform-target.test.ts`
Expected: 8 pass, 0 fail.

- [ ] **Step 2.5: Commit**

```bash
git add packages/gateway/src/updater/platform-target.ts packages/gateway/src/updater/platform-target.test.ts
git commit -m "feat(updater): derivePlatformTarget() with explicit unsupported-combo coverage"
```

---

## Task 3: `IPCServer` interface — `setUpdater` + `broadcast`

Two additive members. `setUpdater` mutates the closure-captured `options.updater`; `broadcast` is a thin wrapper around the existing `broadcastNotification` closure.

**Files:**
- Modify: `packages/gateway/src/ipc/types.ts`
- Modify: `packages/gateway/src/ipc/server/server.ts`

- [ ] **Step 3.1: Add the two members to the `IPCServer` interface**

Edit `packages/gateway/src/ipc/types.ts`. Add the import for `Updater` and the two new members. The full file becomes:

```ts
import type { Updater } from "../updater/updater.ts";
import type { AgentInvokeHandler } from "./agent-invoke.ts";
import type { ConsentCoordinator } from "./consent.ts";
import type { WorkflowRunHandler } from "./workflow-invoke.ts";

export interface IPCServer {
  readonly listenPath: string;
  readonly consent: ConsentCoordinator;
  start(): Promise<void>;
  stop(): Promise<void>;
  setAgentInvokeHandler(handler: AgentInvokeHandler | undefined): void;
  setWorkflowRunHandler(handler: WorkflowRunHandler | undefined): void;
  setUpdater(updater: Updater): void;
  broadcast(method: string, params: Record<string, unknown>): void;
}
```

- [ ] **Step 3.2: Implement the two members in `server.ts`**

Open `packages/gateway/src/ipc/server/server.ts`. The `createIpcServer` function returns an object literal at the end of the file. Find the `return` statement that builds the `IPCServer` and add the two new members. You will also need to mutate `options.updater` in `setUpdater` so the dispatcher (which reads `ctx.options.updater` per-call) sees the change.

Example shape (the existing `setAgentInvokeHandler` / `setWorkflowRunHandler` show the mutation pattern; follow it):

```ts
// Inside createIpcServer, in the returned object literal:
setUpdater(updater) {
  options.updater = updater;
},
broadcast(method, params) {
  broadcastNotification(method, params);
},
```

- [ ] **Step 3.3: Verify the project still typechecks**

Run: `bun run typecheck`
Expected: no new TypeScript errors. If `CreateIpcServerOptions` does not currently include `updater?: Updater`, that's expected — the dispatcher already reads `ctx.options.updater` (per `dispatchers.ts:149`); add `updater?: Updater` to the `CreateIpcServerOptions` type in `packages/gateway/src/ipc/server/options.ts` if needed.

- [ ] **Step 3.4: Commit**

```bash
git add packages/gateway/src/ipc/types.ts packages/gateway/src/ipc/server/server.ts packages/gateway/src/ipc/server/options.ts
git commit -m "feat(ipc): add IPCServer.setUpdater + broadcast for late attachment"
```

---

## Task 4: `createUpdaterFromConfig` factory

Returns `Updater | undefined`. Honors `updaterCfg.enabled` and `derivePlatformTarget()` returning `undefined`.

**Files:**
- Create: `packages/gateway/src/updater/factory.ts`
- Create: `packages/gateway/src/updater/factory.test.ts`

- [ ] **Step 4.1: Write the failing test**

```ts
// packages/gateway/src/updater/factory.test.ts
import { describe, expect, test } from "bun:test";
import type { Logger } from "pino";
import type { NimbusUpdaterToml } from "../config/nimbus-toml.ts";
import { DEFAULT_NIMBUS_UPDATER_TOML } from "../config/nimbus-toml.ts";
import { createUpdaterFromConfig } from "./factory.ts";

const noopLogger = {
  warn: () => {},
  info: () => {},
  error: () => {},
  debug: () => {},
} as unknown as Logger;

const noopEmit = (): void => {};

const baseArgs = {
  currentVersion: "0.1.0",
  emit: noopEmit,
  logger: noopLogger,
};

describe("createUpdaterFromConfig", () => {
  test("returns undefined when [updater].enabled = false", () => {
    const updaterCfg: NimbusUpdaterToml = {
      ...DEFAULT_NIMBUS_UPDATER_TOML,
      enabled: false,
    };
    const result = createUpdaterFromConfig({ ...baseArgs, updaterCfg });
    expect(result).toBeUndefined();
  });

  test("returns Updater when enabled and platform supported", () => {
    const updaterCfg: NimbusUpdaterToml = {
      ...DEFAULT_NIMBUS_UPDATER_TOML,
      enabled: true,
    };
    // Platform override forces a supported target so the test runs on
    // any host. The production callsite uses no override so it picks up
    // the actual `process.platform` + `process.arch`.
    const result = createUpdaterFromConfig({
      ...baseArgs,
      updaterCfg,
      _platformOverride: "linux-x86_64",
    });
    expect(result).toBeDefined();
    expect(result?.getStatus().currentVersion).toBe("0.1.0");
    expect(result?.getStatus().configUrl).toBe(updaterCfg.url);
  });

  test("returns undefined and logs a warning when platform is unsupported", () => {
    const warnings: unknown[] = [];
    const captureLogger = {
      warn: (...args: unknown[]) => warnings.push(args),
      info: () => {},
      error: () => {},
      debug: () => {},
    } as unknown as Logger;
    const updaterCfg: NimbusUpdaterToml = {
      ...DEFAULT_NIMBUS_UPDATER_TOML,
      enabled: true,
    };
    const result = createUpdaterFromConfig({
      ...baseArgs,
      updaterCfg,
      logger: captureLogger,
      _platformOverride: undefined, // explicit "unsupported"
      _forceUnsupported: true,
    });
    expect(result).toBeUndefined();
    expect(warnings.length).toBe(1);
  });
});
```

- [ ] **Step 4.2: Run the test to verify it fails**

Run: `bun test packages/gateway/src/updater/factory.test.ts`
Expected: FAIL with `Cannot find module './factory.ts'`.

- [ ] **Step 4.3: Write the implementation**

```ts
// packages/gateway/src/updater/factory.ts
import type { Logger } from "pino";
import type { NimbusUpdaterToml } from "../config/nimbus-toml.ts";
import { derivePlatformTarget } from "./platform-target.ts";
import { loadUpdaterPublicKey } from "./public-key.ts";
import type { PlatformTarget } from "./types.ts";
import { Updater, type UpdaterEmit } from "./updater.ts";

const DEFAULT_TIMEOUT_MS = 30_000;

export interface CreateUpdaterFromConfigArgs {
  updaterCfg: NimbusUpdaterToml;
  currentVersion: string;
  emit: UpdaterEmit;
  logger: Logger;
  /** Test-only override: pin the resolved platform target. */
  _platformOverride?: PlatformTarget | undefined;
  /** Test-only: force the unsupported-platform path even on a supported host. */
  _forceUnsupported?: boolean;
}

/**
 * Build an `Updater` from the user's `[updater]` config. Returns `undefined`
 * when `enabled` is false or the host architecture is not in the supported
 * release set. The dispatcher then returns `ERR_UPDATER_NOT_CONFIGURED` for
 * `updater.*` calls — the correct signal in both cases.
 */
export function createUpdaterFromConfig(
  args: CreateUpdaterFromConfigArgs,
): Updater | undefined {
  const { updaterCfg, currentVersion, emit, logger } = args;

  if (!updaterCfg.enabled) {
    return undefined;
  }

  const target = args._forceUnsupported
    ? undefined
    : (args._platformOverride ?? derivePlatformTarget());
  if (target === undefined) {
    logger.warn(
      { platform: process.platform, arch: process.arch },
      "updater: unsupported platform/arch combo; auto-update disabled for this host",
    );
    return undefined;
  }

  return new Updater({
    currentVersion,
    manifestUrl: updaterCfg.url,
    publicKey: loadUpdaterPublicKey(),
    target,
    emit,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  });
}
```

- [ ] **Step 4.4: Run the test to verify it passes**

Run: `bun test packages/gateway/src/updater/factory.test.ts`
Expected: 3 pass, 0 fail.

- [ ] **Step 4.5: Commit**

```bash
git add packages/gateway/src/updater/factory.ts packages/gateway/src/updater/factory.test.ts
git commit -m "feat(updater): createUpdaterFromConfig factory with disabled + unsupported-platform paths"
```

---

## Task 5: Wire factory into `assemble.ts` with redacted catch

The piece that actually closes S6-F1. Imports `redactUrlUserinfo` to defuse the privacy leak the review flagged.

**Files:**
- Modify: `packages/gateway/src/platform/assemble.ts`

- [ ] **Step 5.1: Add the new imports**

At the top of `packages/gateway/src/platform/assemble.ts`, alongside the existing config imports, add:

```ts
import { loadNimbusUpdaterFromConfigDir } from "../config/nimbus-toml.ts";
import { createUpdaterFromConfig } from "../updater/factory.ts";
import { redactUrlUserinfo } from "../updater/updater.ts";
```

- [ ] **Step 5.2: Wire the factory call after `createIpcServer`**

In `assemblePlatformServices`, find the line that calls `createIpcServer(ipcOpts)` (currently inside the returned object literal, around line 396). Refactor that to capture the IPC server in a local variable so the wiring code can reach it:

```ts
const ipc = createIpcServer(ipcOpts);

// Updater wiring (S6-F1). Uses GATEWAY_VERSION (Task 1) so future bumps
// don't skew across the three consumers. Skips wiring when [updater].enabled
// is false or when the host arch isn't in the supported release set; the
// dispatcher returns ERR_UPDATER_NOT_CONFIGURED for `updater.*` calls in
// that case, which is the correct signal.
const updaterCfg = loadNimbusUpdaterFromConfigDir(paths.configDir);
const updater = createUpdaterFromConfig({
  updaterCfg,
  currentVersion: GATEWAY_VERSION,
  emit: (name, payload) => ipc.broadcast(name, payload ?? {}),
  logger: syncLogger,
});
if (updater !== undefined) {
  ipc.setUpdater(updater);
  if (updaterCfg.checkOnStartup) {
    // Non-blocking. `Updater.checkNow()` redacts userinfo into private
    // `lastError` but re-throws the un-redacted original — logging
    // `err.message` directly would leak credentials embedded in the
    // configured manifest URL into the gateway log file. The
    // `redactUrlUserinfo` import above is mandatory for this call site.
    void updater.checkNow().catch((err: unknown) =>
      syncLogger.warn(
        { err: redactUrlUserinfo(err instanceof Error ? err.message : String(err)) },
        "updater startup check failed",
      ),
    );
  }
}
```

Then, in the returned object literal at the end of `assemblePlatformServices`, replace:

```ts
ipc: createIpcServer(ipcOpts),
```

with:

```ts
ipc,
```

- [ ] **Step 5.3: Verify typecheck still passes**

Run: `bun run typecheck`
Expected: no new errors.

- [ ] **Step 5.4: Run the existing assemble-adjacent tests to confirm no regression**

Run: `bun test packages/gateway/src/platform packages/gateway/test/integration/gateway-smoke.integration.test.ts`
Expected: all pass.

- [ ] **Step 5.5: Commit**

```bash
git add packages/gateway/src/platform/assemble.ts
git commit -m "feat(gateway): wire Updater factory in assemblePlatformServices (S6-F1)

Closes the literal S6-F1 acceptance criterion: the Updater state machine
now exists in production gateway startup so nimbus update --check and the
startup updater.updateAvailable notification work against a live state
object instead of returning ERR_UPDATER_NOT_CONFIGURED.

The startup-check catch block applies redactUrlUserinfo before logging:
Updater.checkNow() redacts userinfo into private lastError but re-throws
the un-redacted original, so a manifest URL with credentials would
otherwise leak into the gateway log."
```

---

## Task 6: Integration test — factory + dispatch against a Bun.serve mock manifest

Mirrors the existing `air-gap.test.ts` shape but exercises the success path: configured Updater + reachable manifest → live `CheckNowResult`.

**Files:**
- Create: `packages/gateway/test/integration/updater/wiring.test.ts`

- [ ] **Step 6.1: Write the integration test**

```ts
// packages/gateway/test/integration/updater/wiring.test.ts
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { Server } from "bun";
import type { Logger } from "pino";
import { DEFAULT_NIMBUS_UPDATER_TOML } from "../../../src/config/nimbus-toml.ts";
import { dispatchUpdaterRpc } from "../../../src/ipc/updater-rpc.ts";
import { createUpdaterFromConfig } from "../../../src/updater/factory.ts";
import { signManifest } from "../../../src/updater/signature-verifier.ts";
import { makeKeypair } from "../../../src/updater/updater-test-fixtures.ts";

const noopLogger = {
  warn: () => {},
  info: () => {},
  error: () => {},
  debug: () => {},
} as unknown as Logger;

let server: Server | undefined;

beforeEach(() => {
  // Restart per test so the mock manifest is freshly served.
  server = undefined;
});

afterEach(() => {
  // `stop(true)` forces immediate close of active connections — without the
  // `true`, Bun.serve waits for HTTP keep-alive sockets to drain, which can
  // delay the test runner exit on Windows in particular.
  server?.stop(true);
  server = undefined;
});

describe("S6-F1: Updater wiring — factory + dispatch end-to-end", () => {
  test("configured Updater returns CheckNowResult instead of ERR_UPDATER_NOT_CONFIGURED", async () => {
    const kp = makeKeypair();
    const manifest = {
      version: "0.0.99",
      pub_date: new Date().toISOString(),
      platforms: {
        "linux-x86_64": {
          url: "http://example.invalid/nimbus-linux-x86_64.tar.gz",
          sha256: "0".repeat(64),
          signature: "AAAA",
        },
        "darwin-x86_64": {
          url: "http://example.invalid/nimbus-darwin-x86_64.tar.gz",
          sha256: "0".repeat(64),
          signature: "AAAA",
        },
        "darwin-aarch64": {
          url: "http://example.invalid/nimbus-darwin-aarch64.tar.gz",
          sha256: "0".repeat(64),
          signature: "AAAA",
        },
        "windows-x86_64": {
          url: "http://example.invalid/nimbus-windows-x86_64.zip",
          sha256: "0".repeat(64),
          signature: "AAAA",
        },
      },
    };
    const envelope = signManifest(manifest, kp.secretKey);

    server = Bun.serve({
      port: 0,
      fetch: () =>
        new Response(JSON.stringify(envelope), {
          headers: { "content-type": "application/json" },
        }),
    });

    const updaterCfg = {
      ...DEFAULT_NIMBUS_UPDATER_TOML,
      enabled: true,
      url: `http://127.0.0.1:${server.port}/latest.json`,
      // Test-only: skip the embedded prod public-key path.
      checkOnStartup: false,
    };

    const updater = createUpdaterFromConfig({
      updaterCfg,
      currentVersion: "0.1.0",
      emit: () => {},
      logger: noopLogger,
      _platformOverride: "linux-x86_64",
    });
    expect(updater).toBeDefined();

    const result = (await dispatchUpdaterRpc("updater.checkNow", {}, { updater })) as {
      currentVersion: string;
      latestVersion: string;
      updateAvailable: boolean;
    };

    expect(result.currentVersion).toBe("0.1.0");
    expect(result.latestVersion).toBe("0.0.99");
    // 0.0.99 < 0.1.0, so no update should be flagged.
    expect(result.updateAvailable).toBe(false);
  });

  test("disabled config still returns ERR_UPDATER_NOT_CONFIGURED via the dispatcher", async () => {
    const updaterCfg = { ...DEFAULT_NIMBUS_UPDATER_TOML, enabled: false };
    const updater = createUpdaterFromConfig({
      updaterCfg,
      currentVersion: "0.1.0",
      emit: () => {},
      logger: noopLogger,
    });
    expect(updater).toBeUndefined();

    // The dispatcher path mirrors `assemble.ts`: when factory returns
    // undefined, `setUpdater` is never called and `ctx.options.updater`
    // stays undefined, so the dispatcher bails with the expected error.
    await expect(
      dispatchUpdaterRpc("updater.checkNow", {}, { updater: undefined }),
    ).rejects.toMatchObject({ rpcCode: -32602 });
  });
});
```

> **Note on `signManifest` import:** if `signature-verifier.ts` does not currently export a test-helper signer, use the existing pattern from `updater-test-fixtures.ts` (or whichever helper `updater.test.ts` itself uses to build a valid envelope). The test does not need to reach the `verifyBinarySignature` path — it asserts on `checkNow` only, which validates the manifest envelope. If `checkNow` requires a valid signature, the existing `makeKeypair()` + a sign-with-secret-key helper will be enough; mirror what `updater.test.ts` does at the top of its `describe` block.

- [ ] **Step 6.2: Run the test to verify it passes**

Run: `bun test packages/gateway/test/integration/updater/wiring.test.ts`
Expected: 2 pass, 0 fail.

If it fails because of an envelope-shape mismatch, look at `packages/gateway/src/updater/updater.test.ts` to see exactly how the existing tests construct a valid manifest envelope; mirror that.

- [ ] **Step 6.3: Commit**

```bash
git add packages/gateway/test/integration/updater/wiring.test.ts
git commit -m "test(updater): integration test for S6-F1 wiring (factory + dispatch)"
```

---

## Task 7: Update `docs/roadmap.md` — flip S6-F1 + enumerate follow-ups

The S6-F1 line at L412 currently says `[ ]` and "Gates `v0.1.0`". v0.1.0 already shipped, so the prose needs to change shape: wiring done, four follow-ups enumerated.

**Files:**
- Modify: `docs/roadmap.md` (around L408 + L412)

- [ ] **Step 7.1: Read the current state of L406–L412**

Run: `bun -e "console.log(require('node:fs').readFileSync('docs/roadmap.md','utf8').split('\n').slice(405,413).join('\n'))"` (or open the file and look at the section).

You should see the prose at L408 ("S6-F1 (Updater production wiring) gates the headless `v0.1.0` tag") and the `[ ]` item at L412.

- [ ] **Step 7.2: Apply the prose + checkbox edits**

Replace L408 prose so it no longer claims S6-F1 gates v0.1.0:

```markdown
Items deferred from the Phase 4 internal security audit (B1, 2026-04-25; summary in [`docs/SECURITY.md`](./SECURITY.md#security-audits)). The High, Medium, and Low PRs (`#112`, `#113`, commit `806453a`) closed all 78 unique findings; these three remain open. S6-F1 (Updater production wiring) shipped in PR #<NN> — the `Updater` state machine is now instantiated in gateway startup, so `nimbus update --check` and the startup `updater.updateAvailable` notification run against a live state object. Full end-to-end auto-update awaits four follow-ups tracked separately (see below). The two Tauri-specific items (S4-F6, S4-F8) gate the future `desktop-v0.1.0` tag — see [§ Phase 13 → Desktop Release Vehicle](#desktop-release-vehicle).
```

Flip the L412 checkbox and rewrite the body:

```markdown
- [x] **Updater production wiring (S6-F1)** (PR #<NN>) — the `Updater` state machine is now instantiated in gateway startup via `packages/gateway/src/updater/factory.ts` and attached to the IPC server via `setUpdater`. `nimbus update --check` and `updater.checkNow` IPC now return live state instead of `ERR_UPDATER_NOT_CONFIGURED`; with `[updater].check_on_startup = true` (default), the gateway emits `updater.updateAvailable` on startup if a newer version is published at the configured manifest URL. Five follow-ups remain before end-to-end auto-update is usable in production:
  - [ ] Publish `latest.json` from `release.yml` so the default manifest URL resolves to a real envelope (today: 404)
  - [ ] Linux `invokeInstaller` — POSIX binary swap + restart helper
  - [ ] macOS + Windows `invokeInstaller` — gated on signing certs (Phase 13 entry)
  - [ ] `recordUpdateEvent` audit-log integration — wire `system.update.{start,verified,installed,failed}` rows
  - [ ] `Updater.getStatus()` to expose cached `CheckNowResult` so a late-connecting client (e.g., Tauri Updates panel) can read the startup-check result without re-fetching
  - [ ] Track the gateway as a `release-please` component so `packages/gateway/package.json` + `packages/gateway/src/version.ts` (`GATEWAY_VERSION` constant) are auto-bumped on release. Today both are hand-edited; the wiring PR collapses two hand-edit sites into one, but the manual step still exists.
```

(Replace `#<NN>` with the actual PR number once the PR is opened — Step 7.3 below.)

- [ ] **Step 7.3: Verify the doc lints clean**

Run: `bunx markdownlint-cli2 docs/roadmap.md`
Expected: 0 errors.

Run: `bun scripts/structure-audit/check-doc-references.ts --check`
Expected: all references resolve.

- [ ] **Step 7.4: Commit**

```bash
git add docs/roadmap.md
git commit -m "docs(roadmap): flip S6-F1 to [x] + enumerate the four remaining follow-ups

S6-F1 wiring shipped — see PR. Four follow-ups remain before end-to-end
auto-update is usable in production: latest.json publishing, Linux
invokeInstaller, macOS+Windows invokeInstaller (gated on signing certs),
and recordUpdateEvent audit-log integration. A fifth nice-to-have is
exposing the cached CheckNowResult from getStatus() so late-connecting
clients can read the startup-check result without re-fetching."
```

---

## Task 8: Final acceptance check + push + open PR

- [ ] **Step 8.1: Run the full updater coverage gate**

Run: `bun run --cwd packages/gateway test:coverage:updater`
Expected: green; line coverage ≥ 80% for `packages/gateway/src/updater/`.

If coverage drops below 80% on a new file, revisit the test additions for that file.

- [ ] **Step 8.2: Run typecheck + lint repo-wide**

Run: `bun run typecheck && bun run lint`
Expected: both green. (Lint may surface pre-existing infos that are unrelated; only fail on new errors.)

- [ ] **Step 8.3: Run the full integration suite**

Run: `bun run test:integration`
Expected: green.

- [ ] **Step 8.4: Push the branch**

```bash
git push -u origin dev/asafgolombek/phase-4-s6-f1-updater-wiring
```

- [ ] **Step 8.5: Open the PR**

```bash
gh pr create --title "feat(updater): S6-F1 production wiring" --body "$(cat <<'EOF'
## Summary
- Closes the literal S6-F1 acceptance criterion: the Updater state machine now exists in production gateway startup, so nimbus update --check and the startup updater.updateAvailable notification work against a live state object instead of returning ERR_UPDATER_NOT_CONFIGURED
- New factory + platform-target derivation under packages/gateway/src/updater/; IPCServer gains setUpdater + broadcast for late attachment
- Single-sources GATEWAY_VERSION across the three consumers in assemble.ts to defuse the foot-gun the design review flagged
- Four follow-ups enumerated in roadmap.md (latest.json publishing, Linux invokeInstaller, macOS/Windows invokeInstaller, recordUpdateEvent audit-log integration); the Updater.getStatus() cache is also tracked

## Spec + review
- [Design](../blob/main/docs/superpowers/specs/2026-05-15-s6-f1-updater-wiring-design.md)
- [Review](../blob/main/docs/superpowers/specs/2026-05-15-s6-f1-updater-wiring-design-review.md)
- [Plan](../blob/main/docs/superpowers/plans/2026-05-15-s6-f1-updater-wiring.md)

## Verified
- bun run --cwd packages/gateway test:coverage:updater → ≥80% line coverage
- bun run typecheck + bun run lint → green
- bun run test:integration → green
- New integration test in packages/gateway/test/integration/updater/wiring.test.ts asserts dispatchUpdaterRpc returns a live CheckNowResult (no ERR_UPDATER_NOT_CONFIGURED)

## Test plan
- [ ] Manual: with default config, nimbus update --check returns a network result instead of ERR_UPDATER_NOT_CONFIGURED
- [ ] Manual: with NIMBUS_UPDATER_DISABLE=1, nimbus update --check still returns ERR_UPDATER_NOT_CONFIGURED
- [ ] Manual: gateway startup logs do NOT contain manifest-URL credentials when checkNow fails (use a manifest URL with userinfo to verify the redactUrlUserinfo path)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

After the PR opens, edit `docs/roadmap.md` to replace the `#<NN>` placeholder with the actual PR number, commit, and push (one extra small commit on the branch).

---

## Self-Review Notes

- **Spec coverage.** Tasks 1 → 7 line up 1:1 with the spec's "Surface" section. The MVP-scope-deferral table in the spec maps to the four follow-ups added in Task 7. The race-condition deferral from the review (item 2) is captured both as the fifth follow-up in Task 7 and as the Edge-cases note already in the spec.
- **No placeholders.** `#<NN>` PR-number placeholder is replaced in a deliberate post-merge commit; it is the only intentional placeholder and is called out explicitly.
- **Type consistency.** `setUpdater(updater: Updater)` and `broadcast(method: string, params: Record<string, unknown>)` match the spec's interface block. `createUpdaterFromConfig` arg shape matches between Task 4 (definition + test) and Task 5 (call site). `derivePlatformTarget(platform?, arch?)` signature is stable across Tasks 2 and 4.
- **Test injection seams.** `_platformOverride` and `_forceUnsupported` are explicit underscore-prefixed test-only knobs; production callers use them with no args. Same idea as the existing `NIMBUS_DEV_UPDATER_PUBLIC_KEY` env override in `public-key.ts`.
