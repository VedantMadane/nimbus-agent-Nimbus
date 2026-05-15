# S6-F1 Updater Wiring — Design

**Date:** 2026-05-15
**Phase:** 4 (Presence) — B1 audit follow-up
**Status:** spec

## Problem

`Updater` (`packages/gateway/src/updater/updater.ts`) is fully implemented and tested but **never instantiated in production**. `dispatchUpdaterRpc` reads `ctx.options.updater` and bails with `ERR_UPDATER_NOT_CONFIGURED` when undefined — so `nimbus update --check`, `updater.checkNow`, `updater.applyUpdate`, and the startup `updater.updateAvailable` notification all error out.

The B1 audit follow-up item S6-F1 (deferred to Phase 5 alongside Phase 4 close-out) calls for instantiating the state machine in gateway startup. The roadmap entry at `docs/roadmap.md` L412 says: *"instantiate the `Updater` state machine in gateway startup so `nimbus update --check` and `updater.updateAvailable` run against a live state object"*.

## Scope (MVP)

This spec covers the **wiring only**. Three larger pieces remain follow-ups, each tracked separately:

| Follow-up | Why deferred | Tracked as |
|---|---|---|
| `latest.json` publishing in `release.yml` | Release pipeline change; no manifest endpoint exists today | New roadmap entry |
| Linux `invokeInstaller` | Distinct platform-specific work; binary swap + restart pattern | New roadmap entry |
| macOS + Windows `invokeInstaller` | Gated on signing certs (Phase 13) | Existing Phase 13 entry |
| `recordUpdateEvent` audit log integration | Useful but not on the S6-F1 critical path | New roadmap entry |

After PR 4 merges:
- `nimbus update --check` returns a real network result (likely 404 against the un-published `latest.json`, or a real manifest once it ships).
- `updater.checkNow` IPC call returns live state (no longer `ERR_UPDATER_NOT_CONFIGURED`).
- `updater.applyUpdate` returns a clean "installer not configured" error (clearer signal than today's blanket "updater not configured").
- The startup `updater.updateAvailable` notification fires when the configured manifest URL returns a newer version.

## Surface

### New files

- **`packages/gateway/src/updater/factory.ts`** — `createUpdaterFromConfig({ updaterCfg, currentVersion, emit })` returns `Updater | undefined`. Returns `undefined` when `updaterCfg.enabled === false` or when `derivePlatformTarget()` returns `undefined`. Loads the embedded public key via `loadUpdaterPublicKey()` and uses a 30 s default `timeoutMs`.

- **`packages/gateway/src/updater/platform-target.ts`** — `derivePlatformTarget()` maps `process.platform` + `process.arch` to one of the four supported `PlatformTarget` literals (`darwin-x86_64` / `darwin-aarch64` / `linux-x86_64` / `windows-x86_64`). Returns `undefined` for unsupported combos (e.g., `linux-aarch64`) so the factory can skip wiring without crashing.

### Modified files

- **`packages/gateway/src/ipc/types.ts`** — add two members to `IPCServer`:
  - `setUpdater(u: Updater): void`
  - `broadcast(method: string, params: Record<string, unknown>): void`

- **`packages/gateway/src/ipc/server/server.ts`** — `setUpdater` mutates the closure-captured `options.updater` (existing `dispatchers.ts:149` reads `ctx.options.updater` per-call, so a setter that mutates the shared `options` object surfaces the change without touching dispatch wiring). `broadcast` is a thin wrapper around the existing `broadcastNotification` closure (rename only if needed — both names occur in the codebase; pick `broadcast` for the public method and leave the closure named as it is).

- **`packages/gateway/src/platform/assemble.ts`** — after `createIpcServer` returns:
  1. Call `loadNimbusUpdaterFromConfigDir(paths.configDir)` to get the user's `[updater]` config.
  2. Build `emit = (name, payload) => ipc.broadcast(name, payload ?? {})`.
  3. Call `createUpdaterFromConfig({ updaterCfg, currentVersion: "0.1.0", emit, logger: syncLogger })`.
  4. If returned, call `ipc.setUpdater(updater)`.
  5. If `updaterCfg.checkOnStartup`, fire `void updater.checkNow().catch(err => syncLogger.warn({ err: err instanceof Error ? err.message : String(err) }, "updater startup check failed"))` — non-blocking; failures log only.

- **`docs/roadmap.md`** — L420 already marks the related Polish item complete; flip L412 from `[ ]` to `[x]` (with PR number) and rewrite the prose to enumerate the four follow-ups above. The "Gates `v0.1.0`" claim is removed since v0.1.0 already shipped — replaced with an honest "wiring exists; full auto-update awaits the four follow-up items".

### Tests

- **`packages/gateway/src/updater/factory.test.ts`** — covers (a) `enabled: false` returns `undefined`; (b) `enabled: true` with supported platform returns an `Updater`; (c) unsupported platform returns `undefined` with a logged warning; (d) `NIMBUS_UPDATER_DISABLE=1` env override is honored via the existing `parseNimbusUpdaterToml` path.

- **`packages/gateway/src/updater/platform-target.test.ts`** — covers all four supported (platform, arch) combinations; covers two unsupported (`linux-aarch64`, `freebsd-x86_64`).

- **Integration: `packages/gateway/test/integration/updater-wiring.test.ts`** — boots a gateway against a mock manifest HTTP server, calls `updater.checkNow` IPC, asserts it returns a live `CheckNowResult` (no `ERR_UPDATER_NOT_CONFIGURED`). Second case: with `NIMBUS_UPDATER_DISABLE=1`, asserts `ERR_UPDATER_NOT_CONFIGURED` is still returned (verifies the disable path).

### Coverage

Existing gates: `bun run test:coverage:updater` (≥80%) — already includes `updater/`. New files added under `updater/` are covered by the same gate.

## Edge cases

- **`checkOnStartup` failure must not block startup.** Wrap in `void Promise.resolve().then(() => updater.checkNow()).catch(...)` — never await.
- **`derivePlatformTarget()` returning `undefined`** — log once at warn level, skip wiring. The dispatcher continues to return `ERR_UPDATER_NOT_CONFIGURED` for `updater.*` calls, which is the correct signal on an unsupported architecture.
- **Manifest URL with userinfo** — the existing `redactUrlUserinfo` in `updater.ts` handles this; the factory does not need its own redaction layer.
- **Race: setUpdater called before any client subscribes.** Notifications use `broadcastNotification` which iterates current sessions; if no clients are connected yet, the notification is dropped (same behavior as `connector.healthChanged` and `voice.microphoneActive`). Acceptable — clients explicitly call `updater.checkNow` to query state.

## Non-goals

- No change to the hardcoded `"0.1.0"` gateway-version string (`assemble.ts:364`, `:388`). It's a pre-existing smell; sourcing from `package.json` is a separate refactor.
- No change to the embedded public key or signature-verification logic.
- No change to the dispatcher contract or the `updater.*` IPC method names.
- No change to the `[updater]` TOML schema or env-var names.

## Acceptance

- `bun run test:coverage:updater` passes with ≥ 80 % line coverage.
- `bun run test:integration` passes (new integration test included).
- Manual: with default config, `nimbus update --check` returns a network result instead of `ERR_UPDATER_NOT_CONFIGURED`.
- Manual: with `NIMBUS_UPDATER_DISABLE=1`, `nimbus update --check` still returns `ERR_UPDATER_NOT_CONFIGURED`.
- `docs/roadmap.md` S6-F1 entry flipped to `[x]` with PR number; four follow-ups enumerated.
