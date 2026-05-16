# S6-F1 Updater Wiring Implementation Plan — Review

**Review Date:** 2026-05-15
**Target Plan:** `2026-05-15-s6-f1-updater-wiring.md`

The implementation plan is extremely thorough and accurately maps the design specification (and previous design review) to actionable steps. It correctly addresses the privacy leak risk in the startup check catch block and the hardcoded literal "0.1.0" foot-gun.

Here are a few open questions and suggestions to improve the robustness of the implementation:

## 1. `GATEWAY_VERSION` Release Pipeline Automation

**Observation:** Task 1 creates `packages/gateway/src/version.ts` with a hardcoded `GATEWAY_VERSION = "0.1.0"` and adds a comment: *"Bump in lockstep with `packages/gateway/package.json` `version` on every release."*

**Suggestion:** If the project uses `release-please` (or a similar automated release pipeline), simply adding the comment won't prevent version drift. `release-please` will automatically bump `package.json`, but it won't know to bump `version.ts` unless configured to do so. 
*Actionable step:* Add a note/step to update the release pipeline configuration (e.g., `release-please-config.json`'s `extra-files` array) to include `packages/gateway/src/version.ts` so the `GATEWAY_VERSION` string literal is automatically bumped during the release process.

## 2. Test Resource Leaks in `Bun.serve` (Task 6)

**Observation:** In Task 6 (Step 6.1), the integration test spins up a mock manifest server via `Bun.serve(...)` and tears it down in `afterEach` using `server?.stop()`.

**Suggestion:** `server.stop()` stops accepting *new* connections but waits for active connections (like HTTP keep-alive sockets from the `fetch` client) to drain. This can occasionally cause the test runner process to hang or delay exiting.
*Actionable step:* Update the teardown logic in `afterEach` to call `server?.stop(true)`. The `true` argument forcefully closes all active connections immediately, ensuring the test suite exits cleanly without hanging.

## 3. Explicit Export of `GATEWAY_VERSION` for Downstream Packages

**Observation:** The plan creates `version.ts` inside `packages/gateway/src/`.

**Question:** Do other internal packages (like `cli` or `ui`) rely on knowing the Gateway's version from an IPC connection, or do they share this constant? If it's an IPC response (e.g., during connection handshake), then keeping `version.ts` purely internal to the `gateway` package is perfectly fine. The plan appears correct here assuming the CLI/UI clients consume it dynamically via IPC, but it's worth a brief mental check to ensure no other mono-repo packages were implicitly relying on the `package.json` for the gateway version.

## Summary
The plan is in great shape. The incorporation of `redactUrlUserinfo` in Task 5 perfectly addresses the security invariant concerns from the design review. Applying the `release-please` configuration step for the version bump is the only structural piece missing to fully "close the loop" on Task 1.
