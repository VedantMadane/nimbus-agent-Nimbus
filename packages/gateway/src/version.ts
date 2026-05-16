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
