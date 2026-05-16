# S6-F1 Updater Wiring Design — Review

**Review Date:** 2026-05-15
**Target Spec:** `2026-05-15-s6-f1-updater-wiring-design.md`

Overall, the design is solid, clear, and respects existing invariants. However, there are a few open questions, edge cases, and improvements to consider before merging the wiring.

## 1. Privacy Leak Risk on Startup Check Failure (Critical)

In `packages/gateway/src/platform/assemble.ts` Step 5, the spec states:
> `If updaterCfg.checkOnStartup, fire void updater.checkNow().catch(err => syncLogger.warn({ err: err instanceof Error ? err.message : String(err) }, "updater startup check failed"))`

Looking at `packages/gateway/src/updater/updater.ts`, if `checkNow()` fails, it redacts the error for `this.lastError` (S6-F9) but **throws the original un-redacted error**:
```typescript
this.lastError = redactUrlUserinfo(err instanceof Error ? err.message : String(err));
throw err;
```
If `assemble.ts` catches this and logs `err.message` directly, the userinfo (credentials) might be written to the gateway logs. 
**Suggestion:** The catch block in `assemble.ts` should either use `updater.getStatus().lastError` for logging, or explicitly call `redactUrlUserinfo` on the caught error.

## 2. Startup Check Race Condition & State Retention

The spec correctly identifies a race condition:
> "setUpdater called before any client subscribes... if no clients are connected yet, the notification is dropped... Acceptable — clients explicitly call `updater.checkNow` to query state."

While acceptable, pushing the responsibility to the client (UI/CLI) to call `updater.checkNow()` on startup defeats the efficiency of the gateway's background `checkOnStartup`. `checkNow()` triggers a new network request. Furthermore, `UpdaterStatus` (via `getStatus()`) only exposes `state`, `lastCheckAt`, and `lastError`, not the `latestVersion` or `updateAvailable` boolean. 
**Suggestion:** Consider caching the `CheckNowResult` (or at least `latestVersion` and `updateAvailable`) in the `Updater` class state. This way, when a client connects, it can query `getStatus()` or a new `getLastCheckResult()` via IPC without triggering a redundant HTTP request.

## 3. Hardcoded Version String Risk

The spec lists the hardcoded `"0.1.0"` version in `assemble.ts` as a non-goal for this spec, deferring its fix to a separate refactor. 
While deferring is fine, passing a hardcoded string to `createUpdaterFromConfig({ currentVersion: "0.1.0" })` means the update logic will silently break (or never update) if developers forget to bump this literal in future releases.
**Suggestion:** Add a `TODO` comment linking to a tracking issue next to the hardcoded `"0.1.0"` literal in `assemble.ts` to ensure it isn't forgotten. Alternatively, consider injecting the version at build time (e.g., via Bun's `--define` or generating a `version.ts`) instead of reading `package.json` at runtime, which would cleanly solve the I/O concern.

## 4. Unsupported Architectures (`windows-aarch64`)

The spec mentions `derivePlatformTarget()` handles four supported combos: `darwin-x86_64`, `darwin-aarch64`, `linux-x86_64`, and `windows-x86_64`.
**Question:** Given the rise of Copilot+ PCs and Windows on ARM, is `windows-aarch64` intentionally omitted for now? If it is unsupported, the `undefined` fallback handles it gracefully, but it might be worth explicitly listing `windows-aarch64` in the `platform-target.test.ts` as an explicitly verified unsupported combo to document the intent.
