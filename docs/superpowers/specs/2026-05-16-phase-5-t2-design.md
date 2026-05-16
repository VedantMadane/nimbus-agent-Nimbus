# Phase 5 T2 — Sandbox + Marketplace v2 — Sequencing Design

> **Status:** Draft for review
> **Author:** asafgolombek
> **Date:** 2026-05-16
> **Type:** Plan-of-plans (T2) — locks the order of five PRs that constitute Phase 5 sub-project T2. Each PR gets its own spec → plan → implementation cycle when it reaches the head of the queue.

## Purpose

Phase 5 sub-project T2 ([roadmap §Extension sandbox hardening](../../roadmap.md#semantic-layer-enhancements) + [§Extension Marketplace v2](../../roadmap.md#extension-marketplace-v2)) bundles five discrete sub-items under "Sandbox + Marketplace v2":

1. **Extension sandbox hardening** — replace the current process-only honor-system isolation with OS-native kernel-level isolation: seccomp BPF on Linux, App Sandbox (`sandbox-exec`) on macOS, AppContainer on Windows. New manifest fields `permissions.network` and `permissions.filesystem` declare allowed hosts and paths. All 30 first-party connectors migrate to the new sandbox.
2. **Verified publisher** — manifests carry a publisher id + GPG fingerprint and a detached signature; signature verified at install AND every Gateway startup. Publisher public keys live in a registry-hosted directory.
3. **Auto-update with HITL** — Gateway polls registry for newer versions; each version bump is an independently-approved HITL action with changelog preview. No "auto-approve forever" toggle.
4. **Dependency resolution** — manifests declare `dependsOn`; installer expands the closure via a SAT solver; refuses installs that introduce conflicts or cycles. New `extension_dependency` table (V31).
5. **Community ratings** — Marketplace UI shows star average + review count; reads are bundled in the registry index fetch; writes are opt-in signed POSTs gated on explicit `nimbus extension rate` CLI invocation. Air-gap blocks both directions.

T2 is the largest single block in Phase 5 (per the parent T1 sequencing: T1 → T3 → Wave A → T4 → T6 → T2 → Wave B). It follows T6 because T6 PR 4 (typed `dbRun` / `dbExec`, I14, 2026-05-16) put every SQLite write path behind the typed wrapper — the payoff materialises here, where T2 expands the schema and writes substantially.

This document:

1. Locks the order in which the five sub-items ship as five sequential PRs.
2. Defines per-PR scope, exit criteria, and out-of-scope items so each PR can be picked up without re-reading the whole T2 thread.
3. Documents cross-cutting concerns (invariant interactions, coverage gates, migration numbering, platform equality, static-audit interactions).

Per-PR implementation specs are written when each PR reaches the head of the queue — not pre-specced now. This matches the parent sequencing spec's rule for Extended waves and the T6 sequencing precedent.

## Section 1 — PR Order (locked)

Strict serial. Sandbox first (security urgency over rebase economy). Marketplace features ordered by trust-chain dependency, smallest-feature last.

| # | PR branch                                | Sub-item                                                                                | Size estimate | Touchpoints                                                                                                                                              |
| - | ---------------------------------------- | --------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | `phase-5-t2-pr1-sandbox`                 | Sandbox PAL + 3-OS native isolation + `permissions.{network,filesystem}` + contract tests | **Largest**   | New `platform/sandbox/` (linux/darwin/win32 impls), manifest schema additions, every first-party connector declares `permissions.network`, contract tests in `@nimbus-dev/sdk` |
| 2 | `phase-5-t2-pr2-verified-publisher`      | GPG-signed manifests + registry-hosted publisher key directory + install-time signature verify | Medium        | Manifest `publisher` + sidecar `.sig`, `openpgp` JS lib, registry client fetches `<publisher>.pub.asc`, vault key cache, `install-from-local.ts` + `verify-extensions.ts` both GPG-verify |
| 3 | `phase-5-t2-pr3-auto-update`             | Version-check polling + per-bump HITL approval + changelog preview                      | Medium        | Manifest `updateChannel`, polling in `extensions/auto-update.ts`, new HITL action type `extension.autoUpdate`, Tauri allowlist `extension.checkForUpdates` + `extension.update` |
| 4 | `phase-5-t2-pr4-dependency-resolution`   | Manifest `dependsOn` + SAT solver + V31 `extension_dependency`                          | **Large**     | Solver library (build-vs-reuse locked in per-PR spec; reuse strongly preferred), `fast-check` property tests, V31 migration, install-time cycle/conflict detection, `nimbus extension info <id> --deps` |
| 5 | `phase-5-t2-pr5-ratings`                 | Read-only registry ratings fetch + UI display + `nimbus extension rate` opt-in CLI       | Smallest      | Registry index v2 schema, `Marketplace.tsx` rating cards + reviews section, IPC `marketplace.listRatings`, Ed25519 signing key in vault, anti-spam nonce |

### Ordering rationale

- **PR 1 first** because the explicit choice is security-urgency over rebase-economy. The marketplace features in PRs 2–5 build on the sandboxed extension shape (e.g., PR 2's verified-publisher signature covers the `permissions.network` field; PR 3's HITL preview shows publisher + sandbox status). Risk acknowledged: PR 1 is the biggest single PR; if review drags, the rest of T2 stalls. Mitigation: per-connector `permissions.network` declarations are mechanical (predictable diff size, well-bounded list of hosts per connector).
- **PR 2 before PR 3** because PR 3's HITL preview must show the verified-publisher status of the new version. Auto-updating an extension whose signature can't be verified is a worse posture than the status quo (manual update with implicit trust).
- **PR 4 fourth** because it depends on PR 2's manifest schema additions (publisher field) for the install path but is independent of PR 3's auto-update path. Dep resolution at install time, not update time, in this PR.
- **PR 5 last** because it's the smallest, most user-facing, least security-load-bearing piece. Closing T2 on a small PR matches the T4 "wrap-up" cadence and gives a clean recovery point if the sequence needs to stop early.

### Alternative orderings considered and rejected

- **Marketplace-first, sandbox-last (T6 PR 4 cadence — `#5 → #2 → #3 → #4 → #1`):** Sandbox touches every connector to declare `permissions.network`, so landing it last would avoid rebase pain — same rationale T6 PR 4 used for the typed `dbRun` migration. Rejected because security urgency outranks rebase economy here: shipping verified-publisher and auto-update WITHOUT sandbox hardening means an attacker-controlled extension can still exfil via network egress, even with a valid signature. The defensive posture is worse than the status quo (today, users at least know they're trusting the publisher manually). Sandbox conflicts are manageable in practice because the per-connector `permissions.network` declarations are mechanical.
- **Schema warmup PR 0 + 5 feature PRs (`#0 → #1 → #2 → #3 → #4 → #5`):** A tiny first PR that adds all the new manifest fields as schema-only (validators with no enforcement). Rejected because it adds a no-user-value PR; each feature PR's schema additions are disjoint (PR 1 = `permissions.*`; PR 2 = `publisher` + sidecar; PR 3 = `updateChannel`; PR 4 = `dependsOn`; PR 5 = no schema) so per-PR schema additions stay clean.
- **Three-PR bundling (`sandbox / verified-publisher + auto-update / dep-res + ratings`):** Fewer PRs, biggest middle and last PRs. Rejected because PRs 2+3 and PRs 4+5 each contain two independently-reviewable features; bundling them makes review and rollback harder for no scope-coherence benefit.

## Section 2 — Per-PR scope

Per-PR specs are written when each PR reaches the head of the queue. The scope sketches below lock the boundaries of each PR.

### PR 1 — Sandbox PAL + 3-OS isolation

**Goal.** Extension child processes run inside OS-native sandboxes that block network egress unless `permissions.network` declares allowed hosts, and block filesystem access outside the extension's cwd + scoped temp dir. Replaces the current process-only honor-system isolation. Defense-in-depth on top of `extensionProcessEnv` (I1).

**Touchpoints.**

- New `packages/gateway/src/platform/sandbox/` subdirectory with:
  - `sandbox-runner.ts` — `SandboxRunner` PAL interface (`spawn(cmd, args, manifest, opts): ChildProcess`).
  - `linux.ts` — seccomp BPF filter (via `seccomp` Node lib or `prctl(PR_SET_SECCOMP)`); network egress blocked via netns + routing rule per allowed host; filesystem confinement via `bwrap` (already referenced in roadmap line 1312).
  - `darwin.ts` — `sandbox-exec` with a generated `.sb` profile per extension; filesystem confinement via `(deny file-read*) (allow file-read* (subpath "<cwd>"))`.
  - `win32.ts` — AppContainer token via `CreateAppContainerProfile` + `CreateProcessAsUserW`; network capability via `internetClient` SID; filesystem via per-profile allowlist.
- Manifest schema additions in `extensions/manifest.ts`:
  - `permissions: { network?: string[]; filesystem?: { read?: string[]; write?: string[] } }` — `permissions` becomes an object (was a string array). Backwards-compat: existing array-form `permissions` auto-maps to `{}` (default-deny network + default-deny filesystem-outside-cwd).
  - Validator rejects unknown `permissions.*` keys.
- Spawn wiring: every connector spawn in `connectors/lazy-mesh/` (mesh.ts, connector-spawns.ts, phase3-config.ts, user-mcp.ts) replaces direct `spawn(..., { env: extensionProcessEnv(...) })` with `sandboxRunner.spawn(..., { manifest, env: extensionProcessEnv(...) })`. `extensionProcessEnv` stays the inner env builder; the outer wrapper is `sandboxRunner.spawn`.
- Each of the 30 first-party connectors adds `permissions.network` to its manifest. Most need hosts like `api.github.com`, `gitlab.com`, etc.; the local-files / iac-cli connectors need only `filesystem.read`/`filesystem.write` access (no network).
- Contract tests in `@nimbus-dev/sdk`:
  - `sandboxBlocksUnlistedHosts()` — spawns a test extension that tries to fetch an undeclared host; expects EPERM / ECONNREFUSED.
  - `sandboxAllowsListedHosts()` — declares one host; fetch succeeds.
  - `sandboxBlocksFilesystemOutsideCwd()` — read/write outside cwd fails with EACCES.
  - Tests run on all 3 OSes in CI.
- **New invariant I15** — "Sandbox runner is intrinsic to every extension spawn." Production wiring at every spawn site under `connectors/lazy-mesh/`; enforcement test in `security-invariants.test.ts` asserts every connector-spawn file imports `sandboxRunner` and calls `sandboxRunner.spawn(...)`. Static D10 audit rule extended to also fail on bare `spawn(` outside `sandbox-runner.ts` so I15 stays jointly enforceable at static time alongside I1.

**Out of scope.**

- Sandboxing the Gateway process itself — out of T2 (Phase 6+ territory).
- Sandboxing first-party Bun processes (CLI, IPC server) — out of T2.
- Browser/terminal automation sandbox — Phase 11 per roadmap line 1322.
- Per-connector filesystem scopes finer than read/write top-level paths — minimum-viable is whole-tree allow-deny.
- Runtime permission elevation (extension requesting `network` mid-run) — out of T2; if needed, becomes a new HITL action in a follow-up.
- Custom seccomp rules per-connector — defaults are sufficient for T2; per-connector overrides locked in PR 1's per-PR spec only if a first-party connector demonstrably needs one.
- Defense against same-uid bypasses (an extension that exec's a setuid binary) — out of scope; defense is "extensions are not setuid binaries" and the static check enforces this at extension-install time.
- Migration of currently-installed extensions onto the new sandbox — first-party connectors get `permissions.network` in this PR; third-party extensions installed pre-T2 are flagged "no sandbox declaration" and run in legacy mode until reinstalled. PR 1's per-PR spec locks the exact UX (warning at startup, badge in Marketplace).

**Exit criteria.**

- All 30 first-party connectors run with their declared `permissions.network` + default-deny filesystem.
- Sandbox contract tests pass on Windows, macOS, Linux in CI.
- I15 enforcement test green; D10 static audit catches a deliberate violation.
- `bun run test:coverage:extensions` ≥85% stays green; new `sandbox/` subdir ≥80%.
- `bun run test:ci` green on the 3-OS push matrix.

### PR 2 — Verified publisher

**Goal.** Extension manifests are GPG-signed by a registered publisher; signatures verified at install AND at every Gateway startup. Bridges the gap between "anyone can publish to the registry" and "the user knows who published this".

**Touchpoints.**

- Manifest schema additions:
  - `publisher: { id: string; fingerprint: string }` — publisher's id (DNS-style like `notion-corp`) + GPG public-key fingerprint.
  - Detached signature in sidecar file `<manifest>.sig` (ASCII-armored). Sidecar ships alongside the manifest in the registry tarball.
- New `extensions/gpg-verify.ts` — wraps the `openpgp` JS lib (not system `gpg` — locked here, no rolling our own crypto). Library choice rationale, key-import format, and the canonical "verify detached signature against a public key" call shape locked in PR 2's per-PR spec.
- `install-from-local.ts` calls GPG verify after manifest parse; failure → install refused with clear error (publisher id mismatch, fingerprint mismatch, or signature invalid).
- `verify-extensions.ts` extends startup verification to re-check GPG signature in addition to SHA-256.
- New `registry/client.ts` fetches `<publisher-id>.pub.asc` from `registry.nimbus-agent.dev/publishers/<id>.pub.asc`; cached as vault key `extension.publisher_key.<id>` (uses the per-namespace pattern already in use).
- Air-gap install path: `--publisher-key <path>` flag accepts a local key file. Air-gap is incompatible with first-install of a new publisher unless the user provides the key locally; that's the intended posture.
- **New invariant I16** — "Every installed extension with a `publisher` field has its signature verified at install AND every startup." Production wiring at `install-from-local.ts` + `verify-extensions.ts`; enforcement test asserts the GPG-verify call exists in both files.

**Out of scope.**

- Publisher revocation beyond "publisher deletes their key from the registry → next sync evicts the cache → next startup disables extensions signed by that key" — locked in PR 2's per-PR spec.
- Multi-signature manifests (two publishers must co-sign) — out of T2.
- Quorum-based publisher trust — out of T2.
- Migration of currently-installed unsigned extensions — they keep working but show "unverified publisher" badge in Marketplace + CLI. PR 2's per-PR spec locks the badge UX.

**Exit criteria.**

- Test extension signed with a test publisher key installs cleanly; tampering with the manifest causes install to refuse and startup to disable the extension.
- I16 enforcement test green.
- `bun run test:coverage:extensions` ≥85% stays green.

### PR 3 — Auto-update with per-bump HITL

**Goal.** Gateway polls the registry for newer versions of installed extensions, surfaces version bumps as HITL approvals with changelog preview, applies the bump only after user approval. Each bump is an independently-approved event — no global "trust this publisher's updates forever" toggle.

**Touchpoints.**

- Manifest schema addition: `updateChannel: "stable" | "beta"` (default `stable`).
- New `extensions/auto-update.ts` — polling daemon with configurable interval (`[extensions].update_check_interval_hours`, default 24). Honors `enforce_air_gap = true`.
- New HITL action type `extension.autoUpdate` added to `HITL_REQUIRED_BACKING` in `executor.ts` (I2/I3/I4 path). Payload: old version, new version, changelog text, publisher trust status (from PR 2).
- New IPC methods:
  - `extension.checkForUpdates` (read-only) — returns the list of available bumps.
  - `extension.update` (write — goes through HITL) — applies an approved bump.
- Both added to Tauri allowlist (I7) alphabetically; `allowlist_exact_size` assertion bumped.
- New CLI commands: `nimbus extension update [<id>] [--check]`, `nimbus extension info <id>`.
- HITL preview: changelog rendered as plain text (no markdown HTML execution); publisher status shown ("verified publisher: notion-corp" or "unverified publisher").
- Update path: download new tarball → GPG verify (re-uses PR 2 path) → SHA-256 verify → atomic swap → audit-log entry.

**Out of scope.**

- Background pre-download before approval — download happens after approval to keep the consent payload tight (changelog only, no opaque bytes pre-fetched).
- Auto-rollback on first-launch failure of a new version — minimum-viable is `nimbus extension downgrade <id> <version>`. Auto-rollback locked in PR 3's per-PR spec only if test data shows first-launch failures are common.
- "Auto-approve all updates from this publisher" toggle — explicitly out of scope per the security model (every bump is its own HITL).
- Update-channel discovery — the registry tells us what versions exist on each channel; the user picks a channel manually via `nimbus extension config <id> --channel beta`.

**Exit criteria.**

- Test extension with newer registry version surfaces HITL with changelog; approval applies bump; rejection leaves install unchanged.
- HITL action type added to executor's frozen set; `engine.test.ts` "every HITL_REQUIRED action type triggers consent" assertion still green.
- `bun run test:coverage:engine` ≥85% stays green.
- New Tauri allowlist entries land alphabetically; `allowlist_exact_size` assertion bumped.

### PR 4 — Dependency resolution (SAT solver)

**Goal.** Extensions can declare `dependsOn: { "<id>": "<semver-range>" }`; the installer expands the closure, resolves version constraints via a SAT solver, refuses installs that introduce conflicts or cycles.

**Touchpoints.**

- Manifest schema addition: `dependsOn?: Record<string, string>` where the string is a semver range.
- Solver choice — **strong preference for reuse**, locked in PR 4's per-PR spec. Candidates: a port of `pacquet`'s solver, `npm-pick-manifest` + a custom closure expander, or a `minisat-ts` adapter. Rolling our own is correctness-sensitive; reuse limits the risk and keeps the PR scope realistic.
- Property-based tests (`fast-check`) covering: cyclic deps, diamond deps, unsatisfiable constraints, redundant constraints, optional vs required deps.
- Install graph stored in a new SQLite table `extension_dependency` (V31) — bookkeeping for upgrade and remove paths. Writes through `dbRun` / `dbExec` (I14).
- CLI: `nimbus extension info <id> --deps` shows the dep graph; `nimbus extension list --tree` shows the full installed forest.
- Solver runs at install time (PR 2 path); failure → install refused with a human-readable explanation (which constraint failed, which extension caused it).
- Existing installed extensions migrated to "no deps" on first solver run (idempotent).

**Out of scope.**

- Peer dependencies (optional, version-range-shared deps) — out of T2.
- Optional dependencies — out of T2.
- Workspace-mode dep linking (npm workspaces) — N/A; extensions are not workspace packages.
- Automatic upgrade of existing installs to satisfy a new install's constraints — user must explicitly upgrade conflicting installs. PR 4's per-PR spec locks the upgrade-suggestion UX.
- Dep resolution for the extension's runtime `node_modules` — that's the extension author's problem; this PR is only about *Nimbus extension* dependencies.

**Exit criteria.**

- Test fixtures covering cycle, diamond, unsatisfiable, redundant: solver rejects with the right error class.
- New `extension_dependency` table populated for the test fixtures.
- `bun run test:coverage:extensions` ≥85% stays green; new solver code targets ≥85% as well.
- V31 migration applies and rolls back cleanly per the runner contract.

### PR 5 — Community ratings

**Goal.** Marketplace UI shows community ratings (star average + review count) per extension. Authors can submit ratings via `nimbus extension rate <id> --stars N --review "..."`. Reads come bundled in the registry index fetch; writes are opt-in signed POSTs gated on explicit user CLI invocation.

**Touchpoints.**

- Registry index v2 schema: each extension entry gains `ratings: { count: number; average: number; recent: Array<{stars, review, signature, signedBy}> }`.
- `Marketplace.tsx` renders the rating card per extension; new "Reviews" expandable section shows the 5 most recent reviews.
- New IPC method `marketplace.listRatings` — read-only, in Tauri allowlist (I7).
- New CLI command `nimbus extension rate <id> --stars N [--review "..."]` — signs the payload with the user's Ed25519 key from `~/.nimbus/ratings-key` (generated on first use, stored as vault key `ratings.signing_key`), POSTs to `registry.nimbus-agent.dev/v1/ratings`. `--dry-run` to inspect the payload first.
- Air-gap: both the read (bundled in registry index fetch) and write paths blocked by `enforce_air_gap = true`.
- Spam prevention: the ratings API requires a proof-of-installation token (locked in PR 5's per-PR spec — minimum-viable shape is a registry-issued 24-hour-valid nonce signed by the user's `ratings.signing_key` and submitted alongside the rating payload, binding the signing key to a real Nimbus installation and preventing bot-driven mass-rating).

**Out of scope.**

- Review moderation — registry-side concern.
- Edit/delete reviews — the signing key allows the registry to verify a delete request from the same key, but the API path is registry-side, not Nimbus-client side.
- Reputation system / weighted reviews — out of T2.
- Anonymous / pseudonymous reviews — every review carries the signing public key.
- UI for writing reviews — CLI-only per the explicit-user-action principle. The Marketplace UI is read-only for ratings.
- Auth/identity beyond the signing key — no email, no third-party login.

**Exit criteria.**

- Test marketplace fixture shows star average + review count; CLI `nimbus extension rate test-ext --stars 5 --review "great"` produces a valid signed payload that the registry-mock accepts.
- New Tauri allowlist entry `marketplace.listRatings` lands alphabetically; size assertion bumped.
- `nimbus diag --json` includes `extension.ratings_cache_age_seconds`.

## Section 3 — Cross-cutting concerns

### Invariant interactions

| Invariant | Touched by | What changes |
| --------- | ---------- | ------------ |
| **I1** (extensionProcessEnv) | PR 1 | Sandbox wraps the `spawn(..., { env: extensionProcessEnv(...) })` calls — `extensionProcessEnv` stays the inner env builder; the outer wrapper is `sandboxRunner.spawn`. I1's anti-pattern (`{ ...process.env }`) is unchanged. D10 static rule in `check-nimbus-invariants.ts` extended to also fail on bare `spawn(` under `connectors/` outside `sandbox-runner.ts`. |
| **I2 / I3 / I4** (HITL) | PR 3 | New action type `extension.autoUpdate` added to `HITL_REQUIRED_BACKING`. Existing "every type triggers consent channel" test stays the assertion. |
| **I5** (LAN allowlist) | PR 3, PR 4, PR 5 | No new methods exposed over LAN. `extension.update`, `extension.checkForUpdates`, `marketplace.listRatings` all go in `FORBIDDEN_OVER_LAN` (same posture as `index.reembed`). |
| **I7** (Tauri allowlist) | PR 3, PR 5 | PR 3 adds `extension.checkForUpdates` + `extension.update` (alphabetical insert, size assertion bumped 60 → 62). PR 5 adds `marketplace.listRatings` (62 → 63). `extension.install` stays OUT (chain C1). |
| **I9** (SQL parameter binding) | PR 4 | New `extension_dependency` table queries use parameter binding via `dbRun` / `dbExec` (I14 path). |
| **I11** (tool-output envelope) | — | Untouched — no new LLM-facing surface. |
| **I13** (HTTP write routes) | PR 5 | `nimbus extension rate` POSTs to an external registry — not the local HTTP write surface; `WRITE_ROUTE_ALLOWLIST` unchanged. |
| **I14** (typed dbRun) | PR 4 | New `extension_dependency` writes go through `dbRun` / `dbExec`. Static D12 audit catches violations. |
| **I15 (new, PR 1)** | PR 1 | Sandbox runner intrinsic to every extension spawn site under `connectors/`. Triple: wiring at every connector spawn + docs entry in `SECURITY-INVARIANTS.md` §I15 + assertion in `security-invariants.test.ts` greps each connector-spawn file for `sandboxRunner.spawn(`. |
| **I16 (new, PR 2)** | PR 2 | Manifest signature verified at install + every startup. Triple: wiring at `install-from-local.ts` + `verify-extensions.ts` + docs entry §I16 + enforcement assertion. |

### Coverage gates

| Subsystem | Gate | Touched by |
| --------- | ---- | ---------- |
| `packages/gateway/src/extensions/` | ≥85% (`test:coverage:extensions`) | PRs 1, 2, 3, 4, 5 — must stay green |
| `packages/gateway/src/platform/sandbox/` (new) | ≥80% target (new gate `test:coverage:sandbox`) | PR 1 |
| `packages/gateway/src/engine/` | ≥85% (`test:coverage:engine`) | PR 3 (new HITL action type) |
| `packages/ui/` Vitest | ≥80% lines / ≥75% branches | PR 3 (HITL dialog rendering), PR 5 (Marketplace ratings UI) |

### Migration numbering

| PR   | V\<N\> | File                                                                  | Notes                                                                 |
| ---- | ------ | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| PR 1 | —      | —                                                                     | Manifest-only changes; no schema migration                            |
| PR 2 | —      | —                                                                     | Vault-key namespace addition (`extension.publisher_key.*`); no SQL    |
| PR 3 | —      | —                                                                     | Polling cadence state in existing `extension_state` row; no new table |
| PR 4 | **V31** | `packages/gateway/src/index/extension-dependency-v31-sql.ts`         | New `extension_dependency` table + `(extension_id, depends_on_id)` index |
| PR 5 | —      | —                                                                     | Ratings cache in existing registry-index JSON file; no SQL            |

Single V31 migration across T2. If T6 follow-ups or PagerDuty wrap-up land a migration between T2 PRs, the next-available number is taken in order.

### Platform equality (non-negotiable #5)

PR 1 is the only multi-OS code. PAL pattern keeps OS-specific code in `platform/sandbox/{linux,darwin,win32}.ts`. The 3-OS CI matrix (`_test-suite.yml`) runs the sandbox contract tests on every push to `main`; PRs gate on Ubuntu only per the standard pattern. Risk: a sandbox bug specific to macOS or Windows escapes PR review and surfaces on push. Mitigation: contract tests are mandatory, not opt-in; CI failure on any of the 3 OSes blocks the push.

### Static-audit interactions

The `D` rules in `scripts/structure-audit/check-nimbus-invariants.ts`:

- **D1** (cross-package): PR 1's `platform/sandbox/` stays inside `packages/gateway/src/` — no new cross-package boundary.
- **D10** (spawn rule): extended in PR 1 to also fail on `spawn(` under `connectors/` outside `sandbox-runner.ts`. Keeps I1 + I15 jointly enforceable at static time.
- **D11** (vault-key allow-list): PR 2 adds `extension.publisher_key.*` to the manifest-derived `VAULT_KEY_RE` allow-list; PR 5 adds `ratings.signing_key`.
- **D12** (typed dbRun): PR 4's new `extension_dependency` writes go through `dbRun` / `dbExec` — D12 catches violations.

### Phase boundary

T2 ends when all 5 PRs merge. The new I15 + I16 invariants harden the extension surface ahead of Phase 6 (federation) and Phase 7 (Engineering Excellence) — both phases ship features that depend on third-party extensions being safely runnable.

## Section 4 — Cadence per PR

For each PR in the locked order:

1. Create worktree at `.worktrees/phase-5-t2-pr<N>-<topic>/` with branch `dev/asafgolombek/phase-5-t2-pr<N>-<topic>`.
2. Brainstorming sub-skill for the per-PR design decisions specific to that PR (covers the items flagged "locked in per-PR spec" — e.g., GPG library choice in PR 2, SAT-solver build-vs-reuse in PR 4, sandbox legacy-mode UX in PR 1).
3. Write per-PR design spec at `docs/superpowers/specs/2026-<mm-dd>-phase-5-t2-pr<N>-<topic>-design.md`.
4. Write per-PR implementation plan at `docs/superpowers/plans/2026-<mm-dd>-phase-5-t2-pr<N>-<topic>.md`.
5. Subagent-driven execution per the plan.
6. PR opened against `main`. Reviewed via `gh pr` or `/ultrareview` where useful. Merged after green CI (Ubuntu PR gate + 3-OS push matrix).
7. `docs/roadmap.md` updated: the T2 sub-checkbox for *this* PR flipped to `[x]` with a dated note + PR # (the top-level T2 row only flips on PR 5 merge per §5 below); the `Last updated:` line at `roadmap.md:7` extended with `T2 PR<N> ✅ (<date>)`. `CLAUDE.md` line 10 + `GEMINI.md` mirror updated.

Branch naming: `dev/asafgolombek/phase-5-t2-pr<N>-<topic>`. Commit message style follows the T6 + T4-wrap-up pattern (`feat(...)`, `test(...)`, `docs(...)` with `Co-Authored-By:` trailer).

## Section 5 — Roadmap interactions

### Initial roadmap edit (with this sequencing spec)

Add a T2 progress block to `docs/roadmap.md`, consolidating the existing "Extension sandbox hardening" (roadmap line 621, currently under "Semantic Layer Enhancements") and "Extension Marketplace v2" (line 639) bullets into a single T2 section. The two original bullets get cross-referenced ("see T2 above") rather than deleted, to preserve the historical context the roadmap header keeps:

```markdown
#### T2 — Sandbox + Marketplace v2

Phase 5 sub-project T2. Five sequential PRs in the order below, locked by the [T2 sequencing spec](./superpowers/specs/2026-05-16-phase-5-t2-design.md). Each PR follows the T4-wrap-up cadence (brainstorm → spec → plan → execute → PR).

- [ ] **T2 PR 1 — Sandbox PAL + 3-OS isolation + `permissions.{network,filesystem}` + contract tests (I15)** — replaces the current process-only honor-system isolation with kernel-level sandboxing (seccomp BPF / sandbox-exec / AppContainer); 30 first-party connectors declare `permissions.network`; new invariant I15 + static D10 extension.
- [ ] **T2 PR 2 — Verified publisher (GPG-signed manifests + registry-hosted publisher directory) (I16)** — `openpgp` JS lib; signature verified at install + every startup; publisher key cached as vault key `extension.publisher_key.<id>`; air-gap install via `--publisher-key <path>`.
- [ ] **T2 PR 3 — Auto-update with per-bump HITL + changelog preview** — new HITL action type `extension.autoUpdate`; polling cadence via `[extensions].update_check_interval_hours` (default 24); new Tauri-allowlist methods `extension.checkForUpdates` + `extension.update`.
- [ ] **T2 PR 4 — Dependency resolution (SAT solver) + V31 `extension_dependency`** — solver via reuse (pacquet port / npm-pick-manifest / minisat-ts adapter — locked in per-PR spec); `fast-check` property tests; CLI `nimbus extension info <id> --deps`.
- [ ] **T2 PR 5 — Community ratings (read-only fetch + opt-in signed POST CLI)** — registry index v2 ratings schema; new Tauri-allowlist `marketplace.listRatings`; CLI `nimbus extension rate <id> --stars N --review "..."` with Ed25519 key in vault.
```

### Per-PR roadmap edits

When each PR merges:

- Flip its sub-checkbox to `[x]` with a dated note + PR # (matches T6's `(2026-05-15, PR #297)` format).
- Extend the `Last updated:` header at `roadmap.md:7` with `T2 PR<N> ✅ (<date>)`.
- Update the matching `Status:` line in `CLAUDE.md` line 10 (and `GEMINI.md`).

When PR 5 merges (T2 complete):

- Flip the top-level T2 row to `[x]`.
- Replace the five individual `T2 PR<N> ✅` entries in the header with a consolidated `T2 ✅ (<date>)`.

## Section 6 — Out of scope

- Implementation detail for any of the 5 PRs — those are written when each PR reaches the head of the queue.
- Phase 6 federation (federated ratings, federated marketplace, Team Vault for extensions).
- Paid extensions — already deferred to Phase 6 per roadmap line 778.
- Browser/terminal automation sandbox — Phase 11 per roadmap line 1322.
- Calendar dates for individual PRs — the parent sequencing spec excludes calendar from plans-of-plans.
- Decisions about new I-numbered invariants beyond I15 + I16 — those are committed in this spec; further invariants are per-PR-spec calls.
- Wave B (Mobile & Frontend Engineering connectors) — comes after T2 completes per the parent T1 sequencing.

## See also

- [`../../roadmap.md`](../../roadmap.md#extension-marketplace-v2) — Phase 5 T2 sub-items (sandbox hardening + Marketplace v2 bullets).
- [`../../SECURITY-INVARIANTS.md`](../../SECURITY-INVARIANTS.md) — I1 / I7 (current); I15 / I16 (new in T2).
- [`./2026-05-14-phase-5-t6-design.md`](./2026-05-14-phase-5-t6-design.md) — T6 sequencing spec; template for this one.
- [`../../../.claude/commands/nimbus-connector-authoring.md`](../../../.claude/commands/nimbus-connector-authoring.md) — first-party connector pattern; PR 1 extends the manifest schema this skill describes.
- [`../../../.claude/commands/nimbus-security-invariants.md`](../../../.claude/commands/nimbus-security-invariants.md) — the invariant triple rule that I15 + I16 must satisfy.
- [`../../../.claude/commands/nimbus-tauri-allowlist.md`](../../../.claude/commands/nimbus-tauri-allowlist.md) — Tauri allowlist procedure; PRs 3 + 5 follow this.
