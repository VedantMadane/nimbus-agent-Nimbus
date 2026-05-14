# Sub-project D — CI/CD Visibility & Automated Benchmarks Design

**Status:** Draft
**Context:** Phase 5 ("The Extended Surface") — Sub-project D

## 1. Context and Motivation

As Nimbus matures and its surface area expands, maintaining manual documentation for performance benchmarks, terminal recordings, and release changes becomes a bottleneck and a source of drift. 

Currently:
1. **Benchmarks** (such as latency or memory usage) are manually measured and hardcoded in the README.
2. **Terminal demos** (like `docs/demos/incident-response.cast`) are recorded manually via `asciinema`. If CLI formatting changes, the recordings become silently outdated.
3. **Changelogs** and release versioning require manual coordination.

Sub-project D aims to fully automate these visibility layers in CI/CD without violating any of our architectural non-negotiables (especially the local-first constraints).

## 2. Locked Decisions

1. **Automated Changelogs via Conventional Commits:** We will adopt an automated release pipeline (e.g., `release-please` or `changesets`) that reads Conventional Commits (`feat:`, `fix:`, `docs:`) to automatically bump versions and generate `CHANGELOG.md`.
2. **Docs-Integrated Benchmark Publishing:** Benchmarks will run in GitHub Actions on `main`. The results will be exported as a structured JSON file (e.g., `docs/src/data/benchmarks.json`) which the Starlight documentation site will dynamically render.
3. **Deterministic Cast Automation:** We will replace manual `asciinema` recordings with a headless, scripted terminal recorder (e.g., `asciinema-automation` or an expect-based wrapper).
4. **Output-Hash Tripwire:** The cast automation will act as a structural tripwire. It will compare the generated output transcript against a known-good snapshot hash. Unintentional CLI formatting drift will fail the CI gate, forcing the developer to explicitly review and commit the updated `.cast` and snapshot.
5. **No Network Mocks for Benchmarks:** Benchmarks must run against the real local SQLite index to reflect actual local-first performance.

## 3. Architecture & Mechanics

### 3.1. Automated Release Management
- **Tooling:** GitHub Action `googleapis/release-please-action` (or equivalent).
- **Workflow:** 
  - On merge to `main`, the action parses commit messages.
  - It opens a continuous "Release PR" containing the updated `CHANGELOG.md` and bumped `package.json` versions.
  - When a maintainer merges the Release PR, it triggers the actual GitHub Release and publishes the CLI/Tauri binaries.

### 3.2. Benchmark Pipeline
- **Harness:** Reuse the existing B2 bench harness (`nimbus bench`, [`packages/gateway/src/perf/`](../../../packages/gateway/src/perf/)). Do **not** introduce a parallel benchmark system. The harness already covers ~20 surfaces (S1–S10) — cold start, query latency at 100k/1M, embedding throughput, RSS idle/heavy-sync, SQLite contention, sync throughput per provider — and emits a typed `HistoryLine` ([`history-line.ts`](../../../packages/gateway/src/perf/history-line.ts)) per run.
- **Trigger:** Nightly cron + on merges to `main`. PR runs are not gated on benchmarks (variance is too high — see §6.2); they remain locally invokable via `nimbus bench`.
- **Runner:** Self-hosted runners with pinned hardware. GitHub-hosted runners exhibit ~30–50% variance on the same surface across runs, which makes them unfit for the reference-protocol comparison the harness already implements (`--reference`). The harness's existing `RunnerKind` field in `HistoryLine` distinguishes runner classes so historical data stays comparable.
- **Execution:** `nimbus bench --all` writes one `HistoryLine` to `docs/perf/history.jsonl` (append-only). The pipeline then derives a `latest.json` snapshot from the tail of `history.jsonl` containing only the fields the docs site renders.
- **Publishing target:** `gh-pages` artifact only. Committing `latest.json` back to `main` would generate a nightly commit, pollute `git blame`, and create merge conflicts on every long-running branch. The Starlight build in [`packages/docs/`](../../../packages/docs/) fetches `latest.json` at build time from the deployed `gh-pages` URL (cached locally for offline builds via a checked-in `latest.fixture.json` used when `NIMBUS_DOCS_OFFLINE=1`).
- **Schema versioning:** The `latest.json` schema is a thin projection of `HistoryLine.schema_version`. Bumping `HistoryLine.schema_version` (currently `1`) is the same event as bumping the docs renderer — the renderer reads `schema_version` and refuses to render unknown versions with a clear error.

### 3.3. Output-Hash Tripwire & Cast Recording
- **Scripts:** Terminal inputs are defined deterministically in YAML (e.g., `docs/demos/scripts/incident-response.yaml`) with `steps: [{ input, expect?, waitFor? }]`. The format supports waiting for a specific output substring before sending the next input, so recordings do not depend on wall-clock timing.
- **Execution:** A new CI job (`docs-quality / cast-tripwire`) runs each script headless against a Gateway subprocess wired to mock MCP servers (same pattern as the existing E2E CLI suite). The cast is the *byproduct*; the hashed transcript is the *contract*.
- **Determinism (normalization pass).** Raw terminal output is not hashable directly — every run drifts on environmental noise. Before hashing, the transcript passes through a normalizer that:
  - Sets `NO_COLOR=1`, `FORCE_COLOR=0`, `TERM=dumb`, `COLUMNS=120`, `LINES=40`, and a fixed `LANG=C.UTF-8` for the subprocess.
  - Strips any remaining ANSI escape sequences (defense-in-depth in case `NO_COLOR` is honored partially).
  - Replaces absolute paths matching the runner's temp/home prefix with `<TMP>` / `<HOME>` tokens.
  - Replaces ISO-8601 timestamps and Unix-epoch ms (≥10 digits) with `<TS>`.
  - Replaces UUIDs, ULIDs, session ids, stream ids, and Gateway PIDs with `<ID>`.
  - Replaces version strings (`nimbus vX.Y.Z`, `Bun vX.Y.Z`, git SHAs) with `<VERSION>` / `<SHA>`.
  - Normalizes line endings to `\n` and trims trailing whitespace per line.
- **Validation:**
  - The normalized transcript is hashed (SHA-256) and compared against `docs/demos/snapshots/<name>.hash`.
  - If the hash differs, the job fails and uploads two artifacts: (a) the normalized transcript and (b) a unified diff against the previous snapshot, so the reviewer can see *what* drifted without re-running locally.
  - The cast file itself (`.cast`) is also written and uploaded; it is not part of the hash contract but is the human-readable artifact for docs.
- **Updating intentionally.** `bun run record-casts --update-snapshots` runs the same pipeline locally, writes the new `.cast` and `.hash`, and prints a one-line summary per script (`incident-response: hash changed: <old> → <new>`). The developer commits both the `.cast` and the `.hash` in the same change.
- **What this does NOT validate.** The tripwire only detects unintentional output drift. It is not a functional test — see §3.5 on what the cast tripwire and HITL replay tests cover separately.

### 3.4. Scope of `release-please`

`release-please` owns version bumps and `CHANGELOG.md` generation **only for the npm packages** (`@nimbus-dev/client`, `@nimbus-dev/sdk`) and the source-tagged `v<X.Y.Z>` release entry. It does **not** own:

- **Binary signing.** Ed25519 signing for the auto-updater ([`packages/gateway/src/updater/signature-verifier.ts`](../../../packages/gateway/src/updater/)) and platform code-signing for Windows/macOS continue to be driven by the existing release workflow.
- **VS Code extension publish.** `vscode-v<X.Y.Z>` tag flow (Marketplace + Open VSX) stays in `.github/workflows/release.yml` as today.
- **Tauri desktop binaries.** Per the roadmap, `desktop-v0.1.0` is deferred to Phase 13; when it lands it joins the existing release workflow, not release-please.

Conventional Commits is already informally adopted (recent commits: `chore(codeql):`, `fix(action):`). Phase 1 of the rollout is enabling release-please on the npm-package subset; broader enforcement (commitlint on PR titles) is out of scope for sub-project D.

### 3.5. Cast scripts and HITL — what they actually exercise

The cast scripts drive `nimbus` CLI commands through their normal IPC client. When a flow includes a HITL-gated action, consent is answered through the IPC `consent.respond` channel (the same path the CLI's interactive prompt uses) — **not** by piping `y` to stdin. Two consequences:

- The cast pipeline never bypasses `ToolExecutor.gate()`. The gate fires, emits the `consent.request` notification, the test driver reads it, and the driver issues a `consent.respond` IPC call with a scripted decision.
- The tripwire validates that the CLI's *rendering* of consent prompts stays stable across changes. It does not validate that the gate fires — that is the job of the existing HITL unit/integration tests in `packages/gateway/test/` and the `security-invariants.test.ts` enforcement of `I2`/`I3`/`I4`. The two layers are complementary; do not conflate them in review.

Concretely, an `incident-response.yaml` step that triggers a Slack post looks like:

```yaml
- input: nimbus ask "post incident summary to #ops"
  expect: "Slack post requires consent"
- consent: approve   # driver dispatches consent.respond, not stdin
  expect: "Posted to #ops"
```

## 4. Security & Invariant Adherence

- **Local-First (Constraint 1):** The benchmark surfaces in `nimbus bench` already exercise the real local SQLite path with seeded fixtures (`packages/gateway/src/perf/fixtures/`). The CI pipeline must not substitute a remote DB or shared cache for these runs — preserving the local SQLite path is the load-bearing requirement, not the runner location.
- **HITL (Constraint 2):** Cast scripts answer consent through the `consent.respond` IPC channel as detailed in §3.5. The `ToolExecutor` gate is exercised, not bypassed. The cast tripwire is a *rendering* check; HITL gate enforcement is covered by the existing invariant tests for `I2`/`I3`/`I4`.
- **No Credentials (Constraint 3):** Cast scripts run against mock MCP servers and a `MockVault` (`@nimbus-dev/sdk/testing`) populated with synthetic values. No real credentials are referenced at any point in the recording, normalization, or publishing pipeline.
- **Tauri allowlist (`I7`):** Out of scope for sub-project D — no new IPC methods are exposed to the renderer by this work.

## 5. Implementation Phases

1. **Phase 1: Release & Changelog Automation**
   - Configure `release-please`.
   - Seed the initial `CHANGELOG.md`.
2. **Phase 2: Benchmark CI & Docs Integration**
   - Implement benchmark scripts.
   - Update Starlight docs to render from `benchmarks.json`.
3. **Phase 3: Output-Hash Tripwire & Headless Casts**
   - Implement the headless terminal automation.
   - Migrate `incident-response.cast` to the automated pipeline.
   - Add the CI gate to `.github/workflows/`.

## 6. Open Questions for Review

1. **Cast Automation Tooling:** `asciinema-automation` covers the recording side but doesn't drive a Gateway IPC client for the `consent.respond` flow in §3.5. Likely shape: a small Bun-native driver that owns the IPC client and writes the `.cast` file via `node-pty` + the `asciinema` v2 file format. Decision needed on whether to vendor the file-format writer or shell out to `asciinema`.
2. **Self-hosted runner provisioning.** §3.2 commits to self-hosted runners for the bench pipeline. Open: does sub-project D provision them, or is that a separate piece of infra work? If separate, the bench job is feature-flagged off until the runner exists.
3. **`latest.json` projection schema.** §3.2 says it's a projection of `HistoryLine`. The exact field list (which surfaces appear, which percentiles, which RSS metrics) should be settled before Phase 2 starts so the Starlight renderer can be typed against a stable shape. Suggestion: lift `LATEST_JSON_SCHEMA` into `packages/gateway/src/perf/types.ts` so it lives next to `HistoryLine`.
4. **gh-pages deploy contention.** The Astro Starlight site may already publish to `gh-pages`. If so, the bench artifact needs a sub-path (`/perf/latest.json`) and the docs build must not clobber it. Confirm against the current Pages config before Phase 2.
