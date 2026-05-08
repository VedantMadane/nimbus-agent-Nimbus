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

1. Resolve the platform-specific package path via `require.resolve("sqlite-vec-{os}-{arch}/vec0.{ext}")` from the gateway package directory. The naming convention matches upstream `sqlite-vec/index.cjs:platformPackageName(...)`.
2. Copy the resolved file to `<repoRoot>/dist/vec0.{dll|so|dylib}` next to the gateway binary.
3. Log the source path, destination, and file size on stdout. If `require.resolve` throws (because the optional dep wasn't installed for this platform), emit a clear stderr line and exit non-zero — the build artifact would be unusable.

Per-platform extension mapping (mirrors upstream `extensionSuffix(platform)`):

| `process.platform` | extension |
|---|---|
| `win32` | `.dll` |
| `darwin` | `.dylib` |
| (everything else: `linux`, etc.) | `.so` |

### 2. Load wrapper — sidecar fallback

`packages/gateway/src/index/sqlite-vec-load.ts` keeps its current public API. The change is internal: `tryLoadSqliteVec` chains to a sidecar resolver if the upstream loader throws.

```ts
export function tryLoadSqliteVec(db: Database): boolean {
  try {
    loadSqliteVec(db);   // upstream — works in dev (node_modules present)
    return true;
  } catch {
    return tryLoadFromSidecar(db);   // works in compiled binary (vec0 next to .exe)
  }
}

function tryLoadFromSidecar(db: Database): boolean {
  try {
    const sidecar = join(dirname(process.execPath), sidecarFilename());
    if (!existsSync(sidecar)) return false;
    db.loadExtension(sidecar);
    return true;
  } catch {
    return false;
  }
}

function sidecarFilename(): string {
  if (process.platform === "win32") return "vec0.dll";
  if (process.platform === "darwin") return "vec0.dylib";
  return "vec0.so";
}
```

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
