# BUG-009 — Ship `sqlite-vec` as a sidecar binary alongside the compiled gateway

**Status:** approved · **Author:** asafgolombek · **Date:** 2026-05-08

## Problem

`bun build --compile` produces a self-contained `nimbus-gateway.exe` by bundling all imported JS into the binary's embedded virtual filesystem. Native dependencies that are loaded via `require.resolve()` at runtime — specifically `sqlite-vec`'s platform-specific shared library (`vec0.dll` on Windows, `vec0.so` on Linux, `vec0.dylib` on macOS) — do **not** survive the compile: the JS shim still calls `require.resolve("sqlite-vec-windows-x64/vec0.dll")`, but at runtime that resolves to a path inside the embedded VFS where SQLite's `loadExtension` cannot read the file as a real OS binary.

Observable consequences in the production gateway binary:

- `tryLoadSqliteVec(db)` returns `false`.
- `ensureSqliteVecForConnection` returns `false`.
- `SessionMemoryStore.ensureReady()` returns `false` → both `append()` and `getRecentTurns()` silently no-op (root cause of BUG-005-c, currently worked around by a vec-decoupled split that is intentionally not in `main`).
- Semantic recall is disabled across the board.

This spec covers `sqlite-vec` only. ONNX / `@xenova/transformers` (the embedding worker) has the same shape of failure but is tracked separately and stays out of scope.

## Goals

- `db.loadExtension(...)` succeeds in the compiled gateway binary on every supported platform.
- After the fix, the per-platform release artifacts in `dist/` contain everything required to boot the gateway with vec available — no separate `npm install` step on the user's machine.
- The fix is invisible at the API surface: callers of `tryLoadSqliteVec` continue to call it the same way; only the resolver underneath changes.
- Failure mode when `vec0.{ext}` is missing remains "silent degrade" — identical to today's behavior. No new noisy startup errors, no new ways to refuse to start.

## Non-goals

- Bundling ONNX runtime / `@xenova/transformers` native deps. Tracked as a separate follow-up.
- Adding a `nimbus doctor` check for the missing native binary. Adjacent and useful, but adjacent scope.
- Changing the dev-mode load path (`bun run`, `bun test`). Those keep using the upstream `sqlite-vec` package's `require.resolve` from `node_modules` and stay unchanged.
- Cross-platform fat binaries. One install carries one platform's `vec0` file.

## Design

### 1. Compile script — copy `vec0.{ext}` into `dist/`

`packages/gateway/compile-gateway.ts` already orchestrates `bun build --compile --outfile ../../dist/nimbus-gateway`. After the build succeeds, add a copy step:

1. Resolve the platform-specific package path via `require.resolve("sqlite-vec-{os}-{arch}/vec0.{ext}")` from the gateway package directory. The npm package's `os` segment is **`windows` on Windows**, `linux` and `darwin` elsewhere (see mapping below — `process.platform === "win32"` does NOT match the package name segment, so the build script must translate). The convention matches upstream `sqlite-vec/index.cjs:platformPackageName(...)`.
2. Copy the resolved file to `<repoRoot>/dist/vec0.{dll|so|dylib}` next to the gateway binary.
3. Log the source path, destination, and file size on stdout. If `require.resolve` throws (because the optional dep wasn't installed for this platform), emit a stderr line of the form `compile-gateway: native dep "sqlite-vec-{os}-{arch}" not found in node_modules; bun install may have skipped it on this platform — the resulting gateway binary cannot load semantic memory.` and exit non-zero. The hard-fail is intentional: silently producing a binary without `vec0` would be the same regression we're fixing.

Per-platform mapping (mirrors upstream `platformPackageName` + `extensionSuffix`):

| `process.platform` | npm `os` segment | extension |
|---|---|---|
| `win32` | `windows` | `.dll` |
| `darwin` | `darwin` | `.dylib` |
| (everything else: `linux`, etc.) | `linux` | `.so` |

### 2. Load wrapper — sidecar fallback

`packages/gateway/src/index/sqlite-vec-load.ts` keeps its current public API. The change is internal: `tryLoadSqliteVec` chains to a sidecar resolver if the upstream loader throws.

```ts
const log = pino({ name: "sqlite-vec-load", level: process.env.NIMBUS_LOG_LEVEL ?? "info" });

export function tryLoadSqliteVec(db: Database): boolean {
  try {
    loadSqliteVec(db);   // upstream — works in dev (node_modules present)
    log.debug({ via: "npm" }, "sqlite-vec loaded");
    return true;
  } catch (e) {
    log.debug({ err: (e as Error).message }, "upstream sqlite-vec load failed; trying sidecar");
    return tryLoadFromSidecar(db);   // works in compiled binary (vec0 next to .exe)
  }
}

function tryLoadFromSidecar(db: Database): boolean {
  const sidecar = join(dirname(process.execPath), sidecarFilename());
  if (!existsSync(sidecar)) {
    log.debug({ sidecar }, "sqlite-vec sidecar not found; semantic memory disabled");
    return false;
  }
  try {
    db.loadExtension(sidecar);
    log.debug({ via: "sidecar", sidecar }, "sqlite-vec loaded");
    return true;
  } catch (e) {
    log.debug({ sidecar, err: (e as Error).message }, "sqlite-vec sidecar load failed");
    return false;
  }
}

function sidecarFilename(): string {
  if (process.platform === "win32") return "vec0.dll";
  if (process.platform === "darwin") return "vec0.dylib";
  return "vec0.so";
}
```

The log lines are `debug` level by design — they don't surface to a user running `nimbus start` at default log level, but `NIMBUS_LOG_LEVEL=debug nimbus start` (or the gateway log file at debug level) shows the full attempt chain. This satisfies the "silent degrade for users, observable for support" balance.

`loadSqliteVecOrThrow` keeps its current behavior — wraps the chain and re-throws with the existing actionable message if both attempts fail.

### 3. Coverage

- **New unit test** at `packages/gateway/src/index/sqlite-vec-load.test.ts`. With a fake `db` whose `loadExtension(path)` records the path argument and `existsSync` mocked to return true for a temp directory, verify the fallback resolves to `dirname(process.execPath) + sidecarFilename()`.
- **Existing BUG-005 tests** in `packages/gateway/src/memory/session-memory-store.test.ts` continue to provide end-to-end coverage. They run with vec loadable (test mode uses upstream `sqlite-vec` from `node_modules`), so they verify the loader still works in dev mode after the wrapper changes.
- **Manual verify post-merge:** run `verify-bug-005.ps1` against the compiled gateway binary, then check `bun scripts/diagnose-bug-005.ts`. Expected: `session_memory has N rows` after a multi-turn TUI session, and `[diag] sqlite-vec loaded on fresh connection: true` against a connection opened by the running gateway.

### 4. Failure mode — silent degrade

When `vec0.{ext}` is not next to the gateway binary at runtime, `tryLoadSqliteVec` returns `false` (same as today). `SessionMemoryStore.ensureReady()` returns `false`, and semantic memory is silently disabled. No log line, no startup gate, no panic. The release-engineering side of this is "ensure the build pipeline produces the right artifact"; the runtime side accepts the consequences if it doesn't.

## Risks

- **Cross-platform release pipelines must each produce their own `vec0`.** When `release.yml` builds for Linux, macOS-x64, macOS-arm64, and Windows-x64 in matrix jobs, each job's compile step must run on a runner where `sqlite-vec-{platform}` is installed. This is implicit because each runner does its own `bun install`, but the compile script's hard-fail (point 1) makes the dependency explicit and noisy.
- **`process.execPath` semantics.** When users symlink or wrap the binary, `process.execPath` is the real path, not the link path — the sidecar must live next to the real file. Fine for our official artifacts; users who hand-package may trip on this.
- **Optional-dep install gotchas.** `bun install` may skip the platform-specific subpackage on some constrained CI containers; the build will hard-fail with a clear message rather than silently producing a broken binary.

## Out-of-scope follow-ups

- **BUG-009-b (separate spec):** ship the ONNX runtime native deps the same way, so `@xenova/transformers` works in the compiled binary and the embedding worker initializes successfully. Without this, semantic recall stays disabled even with vec working — but literal-turn replay (the BUG-005 primary path) doesn't need it.
- **`nimbus doctor` vec check:** at gateway start (or via the `doctor` command), probe `vec_version()` on a fresh connection and surface an actionable warning if it fails. Eight-line addition; defer to a follow-up so this PR stays scoped to the build/load fix.

## Responses to external review feedback

External review at `docs/superpowers/specs/2026-05-08-bug-009-sqlite-vec-sidecar-feedback.md` (Gemini CLI, 2026-05-08). Each item verified against the codebase before disposition.

| # | Item | Disposition | Reason |
|---|---|---|---|
| 1 | Cross-compilation: `bun install` may not fetch optional deps for non-host platforms | **Defer (not applicable)** | Verified `release.yml` lines 74–101: `compile-gateway` job uses a 4-platform matrix where each artifact is built on its **native** runner (`ubuntu-24.04`, `macos-15-intel`, `macos-15`, `windows-2025`). No cross-compile step exists; each runner's own `bun install` picks up its matching `sqlite-vec-{os}-{arch}` optional dep automatically. The risk Gemini flagged is real for cross-compile pipelines — ours isn't one. |
| 2 | macOS signing of `vec0.dylib` | **Defer to Phase 6** | `release.yml` has no `codesign`/`notarytool` step today — `nimbus-gateway` ships unsigned in v0.1.0. macOS code signing is owned by the Phase 6 `desktop-v0.1.0` track per CLAUDE.md non-negotiable table. When that lands, the sidecar joins the same sign-everything-in-the-bundle step. |
| 3 | Tauri bundling | **Defer to Phase 6** | Tauri release vehicle is deferred from `v0.1.0` to Phase 6 (`desktop-v0.1.0`) per CLAUDE.md. v0.1.0 ships only the headless gateway + CLI + VS Code extension; no Tauri bundle to integrate with. The sidecar will need a brief revisit when Tauri bundles the gateway-as-sidecar. |
| 4 | Logging: silent-degrade obscures support diagnosis | **Fix** | Added pino `debug`-level log lines in `tryLoadSqliteVec` and `tryLoadFromSidecar` covering all three branches (npm-resolved / sidecar-resolved / both-failed). `debug` level keeps it invisible to default users (preserves the silent-degrade UX choice) but visible at `NIMBUS_LOG_LEVEL=debug` and in the gateway log file when log level is debug. |
| 5 | Pull `nimbus doctor` vec check forward into this PR | **Defer (tracked follow-up)** | User explicitly scoped this out to keep the PR focused on the build/load fix. The follow-up is small (~20 LOC) and listed in this spec under "Out-of-scope follow-ups". |
| 6 | Explicit `win32` → `windows` mapping for npm package name segment | **Fix** | Real implementer trap. The mapping table is now explicit in §1: shows `process.platform`, the npm `os` segment, and the extension separately. Build script translates `win32` → `windows` when building the package name. |
| 7 | Linux distro variance (gnu vs musl) | **Defer (upstream limitation)** | `node_modules/sqlite-vec/package.json` lists only `linux-x64` and `linux-arm64` optional deps — no `-musl` variants. On Alpine the upstream package fails today, and our sidecar pipeline doesn't make it worse: same prebuilt artifact, same OS-level behavior. If/when upstream ships musl builds, our pipeline picks them up automatically. |
| 8 | `require.resolve` error wording | **Already addressed (strengthened)** | Spec already required exit-non-zero with a clear stderr line; the message in §1 is now spelled out verbatim ("native dep \"sqlite-vec-{os}-{arch}\" not found … the resulting gateway binary cannot load semantic memory.") so reviewers and CI logs see exactly what's missing. |
| 9 | Sidecar filename: namespacing vs upstream-compatible | **No change** | User picked the upstream-compatible name (`vec0.{ext}`) in the brainstorm; Gemini agrees ("sticking to the upstream name is likely safer for compatibility"). |
