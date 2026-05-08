# BUG-009 — sqlite-vec Sidecar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `sqlite-vec` extension load successfully inside the compiled `nimbus-gateway` binary by shipping `vec0.{dll|so|dylib}` next to the executable and falling back to that path when the upstream npm resolver fails.

**Architecture:** The npm `sqlite-vec` shim uses `require.resolve()` which is broken when the gateway is bundled via `bun build --compile`. We add a sidecar fallback in the load wrapper that resolves `vec0.{ext}` via `dirname(process.execPath)`, and a post-compile step in `compile-gateway.ts` that copies the platform-specific `vec0` from `node_modules` into `dist/`. Dev-mode load (via `node_modules`) stays unchanged; the fallback is only exercised when the upstream resolver throws.

**Tech Stack:** Bun 1.2+, TypeScript strict, `bun:sqlite`, `sqlite-vec` 0.1.x, `pino` for logs, `bun:test`.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `packages/gateway/src/index/sqlite-vec-load.ts` | Modify | Add `sidecarFilename`, `sidecarPath`, `tryLoadFromSidecar`; chain it into existing `tryLoadSqliteVec`. Add pino debug logs. |
| `packages/gateway/src/index/sqlite-vec-load.test.ts` | Create | Unit tests for the new helpers. |
| `packages/gateway/compile-gateway.ts` | Modify | After `bun build --compile` succeeds, copy `node_modules/sqlite-vec-{os}-{arch}/vec0.{ext}` into `<repoRoot>/dist/vec0.{ext}`. |
| `docs/release/v0.1.0-smoke-bugs.md` | Modify | Add BUG-009 entry to the index table and a section after BUG-007. |

No new dependencies. No schema changes. No public-API changes.

---

## Task 1: Pure helpers — `sidecarFilename` and `sidecarPath`

**Files:**
- Modify: `packages/gateway/src/index/sqlite-vec-load.ts`
- Test: `packages/gateway/src/index/sqlite-vec-load.test.ts`

These are platform-suffix and path-join helpers. Pure functions, easy TDD.

- [ ] **Step 1: Write the failing test**

Create `packages/gateway/src/index/sqlite-vec-load.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { sidecarFilename, sidecarPath } from "./sqlite-vec-load.ts";

describe("sidecarFilename", () => {
  test("win32 → vec0.dll", () => {
    expect(sidecarFilename("win32")).toBe("vec0.dll");
  });
  test("darwin → vec0.dylib", () => {
    expect(sidecarFilename("darwin")).toBe("vec0.dylib");
  });
  test("linux → vec0.so", () => {
    expect(sidecarFilename("linux")).toBe("vec0.so");
  });
  test("any other Unix-shaped platform → vec0.so", () => {
    expect(sidecarFilename("freebsd")).toBe("vec0.so");
  });
});

describe("sidecarPath", () => {
  test("returns vec0.{ext} adjacent to the given exec path", () => {
    expect(sidecarPath("/opt/nimbus/bin/nimbus-gateway", "linux")).toBe(
      join("/opt/nimbus/bin", "vec0.so"),
    );
  });
  test("works for a Windows-style path", () => {
    expect(sidecarPath("C:\\Program Files\\Nimbus\\nimbus-gateway.exe", "win32")).toBe(
      join("C:\\Program Files\\Nimbus", "vec0.dll"),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
bun test packages/gateway/src/index/sqlite-vec-load.test.ts
```

Expected: FAIL with `Export named 'sidecarFilename' not found in module ...sqlite-vec-load.ts` (the symbols don't exist yet).

- [ ] **Step 3: Implement the pure helpers**

Add to `packages/gateway/src/index/sqlite-vec-load.ts` (append at the end of the file, BEFORE the existing `ensureSqliteVecForConnection` export — order doesn't matter functionally but keeps the file readable):

```ts
import { dirname, join } from "node:path";

/**
 * Native filename of the sqlite-vec shared library for the given platform.
 * Mirrors upstream `sqlite-vec/index.cjs::extensionSuffix(platform)`.
 */
export function sidecarFilename(platform: NodeJS.Platform): string {
  if (platform === "win32") return "vec0.dll";
  if (platform === "darwin") return "vec0.dylib";
  return "vec0.so";
}

/**
 * Path where the gateway expects the sidecar `vec0.{ext}` at runtime —
 * adjacent to the running executable. Used when the upstream npm resolver
 * fails (compiled-binary case).
 */
export function sidecarPath(execPath: string, platform: NodeJS.Platform): string {
  return join(dirname(execPath), sidecarFilename(platform));
}
```

- [ ] **Step 4: Run test to verify it passes**

```
bun test packages/gateway/src/index/sqlite-vec-load.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```
git add packages/gateway/src/index/sqlite-vec-load.ts packages/gateway/src/index/sqlite-vec-load.test.ts
git commit -m "feat(gateway): add sidecarFilename + sidecarPath helpers (BUG-009)"
```

---

## Task 2: `tryLoadFromSidecar` — fallback that loads vec0 from disk

**Files:**
- Modify: `packages/gateway/src/index/sqlite-vec-load.ts`
- Test: `packages/gateway/src/index/sqlite-vec-load.test.ts`

The fallback loader takes a `baseDir` parameter (defaulting to `dirname(process.execPath)`) so tests can drive it deterministically with a temp directory.

- [ ] **Step 1: Write the failing test**

Append to `packages/gateway/src/index/sqlite-vec-load.test.ts`:

```ts
import type { Database } from "bun:sqlite";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

import { tryLoadFromSidecar } from "./sqlite-vec-load.ts";

describe("tryLoadFromSidecar", () => {
  test("calls db.loadExtension with the sidecar path when the file exists", () => {
    const tmp = mkdtempSync(join(tmpdir(), "nimbus-vec-sidecar-"));
    const fname = sidecarFilename(process.platform);
    writeFileSync(join(tmp, fname), "");
    const calls: string[] = [];
    const fakeDb = {
      loadExtension: (p: string) => {
        calls.push(p);
      },
    } as unknown as Database;

    const ok = tryLoadFromSidecar(fakeDb, tmp);

    expect(ok).toBe(true);
    expect(calls).toEqual([join(tmp, fname)]);
  });

  test("returns false silently when the sidecar file is missing", () => {
    const tmp = mkdtempSync(join(tmpdir(), "nimbus-vec-sidecar-empty-"));
    const fakeDb = {
      loadExtension: (_p: string) => {
        throw new Error("should not be called when sidecar is absent");
      },
    } as unknown as Database;

    const ok = tryLoadFromSidecar(fakeDb, tmp);

    expect(ok).toBe(false);
  });

  test("returns false when db.loadExtension throws (e.g. corrupt binary)", () => {
    const tmp = mkdtempSync(join(tmpdir(), "nimbus-vec-sidecar-corrupt-"));
    writeFileSync(join(tmp, sidecarFilename(process.platform)), "");
    const fakeDb = {
      loadExtension: (_p: string) => {
        throw new Error("not a valid extension");
      },
    } as unknown as Database;

    const ok = tryLoadFromSidecar(fakeDb, tmp);

    expect(ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
bun test packages/gateway/src/index/sqlite-vec-load.test.ts
```

Expected: FAIL with `Export named 'tryLoadFromSidecar' not found`.

- [ ] **Step 3: Implement `tryLoadFromSidecar` + the pino debug logger**

In `packages/gateway/src/index/sqlite-vec-load.ts`, add at the top of the file (just under the existing `import` statements):

```ts
import { existsSync } from "node:fs";
import pino from "pino";

const log = pino({
  name: "sqlite-vec-load",
  level: process.env["NIMBUS_LOG_LEVEL"] ?? "info",
});
```

Then add the function (after `sidecarPath`, before `ensureSqliteVecForConnection`):

```ts
/**
 * Compiled-binary fallback: load `vec0.{ext}` from the directory adjacent to
 * the running executable. Used when the upstream `loadSqliteVec(db)` throws
 * because `bun build --compile` doesn't preserve native deps reachable via
 * `require.resolve()`. Returns `false` silently on any failure — the caller
 * is expected to disable vec-dependent features (semantic memory).
 *
 * `baseDir` defaults to `dirname(process.execPath)` and is overridable for
 * tests; production callers should not supply it.
 */
export function tryLoadFromSidecar(
  db: Database,
  baseDir: string = dirname(process.execPath),
): boolean {
  const path = join(baseDir, sidecarFilename(process.platform));
  if (!existsSync(path)) {
    log.debug({ sidecar: path }, "sqlite-vec sidecar not found; semantic memory disabled");
    return false;
  }
  try {
    db.loadExtension(path);
    log.debug({ via: "sidecar", sidecar: path }, "sqlite-vec loaded");
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.debug({ sidecar: path, err: msg }, "sqlite-vec sidecar load failed");
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```
bun test packages/gateway/src/index/sqlite-vec-load.test.ts
```

Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```
git add packages/gateway/src/index/sqlite-vec-load.ts packages/gateway/src/index/sqlite-vec-load.test.ts
git commit -m "feat(gateway): add tryLoadFromSidecar fallback for compiled binary (BUG-009)"
```

---

## Task 3: Chain the fallback into `tryLoadSqliteVec`

**Files:**
- Modify: `packages/gateway/src/index/sqlite-vec-load.ts`
- Test: `packages/gateway/src/index/sqlite-vec-load.test.ts`

Existing `tryLoadSqliteVec` only calls upstream `loadSqliteVec(db)`. Chain to `tryLoadFromSidecar` when upstream throws.

- [ ] **Step 1: Write the failing test**

Append to `packages/gateway/src/index/sqlite-vec-load.test.ts`:

```ts
// IMPORTANT: this test exercises tryLoadSqliteVec end-to-end with a real
// in-memory db. On any platform where the upstream `sqlite-vec` package is
// installed (every dev / CI machine), upstream succeeds and the fallback is
// never reached. We assert the success-via-upstream path here; the
// fallback chain is covered by tryLoadFromSidecar's own tests above.
import { Database } from "bun:sqlite";
import { tryLoadSqliteVec } from "./sqlite-vec-load.ts";

describe("tryLoadSqliteVec — upstream-first chain", () => {
  test("returns true on a fresh db when upstream sqlite-vec is installed", () => {
    const db = new Database(":memory:");
    const ok = tryLoadSqliteVec(db);
    expect(ok).toBe(true);
    db.close();
  });
});
```

- [ ] **Step 2: Run test to verify it passes (upstream already wired)**

```
bun test packages/gateway/src/index/sqlite-vec-load.test.ts
```

Expected: PASS — this test is a regression guard, not a RED step. The chain change in step 3 must not break it.

- [ ] **Step 3: Update `tryLoadSqliteVec` to chain to the sidecar**

In `packages/gateway/src/index/sqlite-vec-load.ts`, replace the existing `tryLoadSqliteVec`:

```ts
export function tryLoadSqliteVec(db: Database): boolean {
  try {
    loadSqliteVec(db);
    log.debug({ via: "npm" }, "sqlite-vec loaded");
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.debug({ err: msg }, "upstream sqlite-vec load failed; trying sidecar");
    return tryLoadFromSidecar(db);
  }
}
```

(The existing `loadSqliteVecOrThrow`, `isVecLoaded`, and `ensureSqliteVecForConnection` are unchanged — they all delegate to `tryLoadSqliteVec` indirectly via the same module surface.)

- [ ] **Step 4: Run the full test file to verify nothing regressed**

```
bun test packages/gateway/src/index/sqlite-vec-load.test.ts
```

Expected: PASS, 10 tests (6 helpers + 3 sidecar + 1 chain).

- [ ] **Step 5: Run the broader gateway memory tests to confirm no regressions**

```
bun test packages/gateway/src/memory/session-memory-store.test.ts packages/gateway/src/engine/run-ask.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```
git add packages/gateway/src/index/sqlite-vec-load.ts packages/gateway/src/index/sqlite-vec-load.test.ts
git commit -m "feat(gateway): tryLoadSqliteVec falls back to sidecar on upstream failure (BUG-009)"
```

---

## Task 4: Post-compile sidecar copy in `compile-gateway.ts`

**Files:**
- Modify: `packages/gateway/compile-gateway.ts`

The compile script currently runs `bun build --compile` and exits with the build's status code. After a successful build (status 0), copy the platform-matching `vec0.{ext}` from `packages/gateway/node_modules/sqlite-vec-{os}-{arch}/vec0.{ext}` into `<repoRoot>/dist/vec0.{ext}`. Hard-fail with a clear stderr message if the optional dep is missing.

This is a build-time script; it doesn't have a unit test. We verify it by running the build and checking the artifact.

> **CI note:** This step assumes `bun install` on the build runner has already populated `packages/gateway/node_modules/sqlite-vec-{os}-{arch}/`. Each `compile-gateway` matrix job in `.github/workflows/release.yml` runs on its **target's native runner** (`ubuntu-24.04`, `macos-15-intel`, `macos-15`, `windows-2025`); each runner's own `bun install` automatically picks up its matching `sqlite-vec-{os}-{arch}` optional dep. There is no cross-compile step in our pipeline. If you adapt this script for a single-runner cross-build later, you'll need an explicit `bun add sqlite-vec-{target-os}-{target-arch}` before the compile.

- [ ] **Step 1: Add the copy logic at the bottom of `compile-gateway.ts`**

In `packages/gateway/compile-gateway.ts`, change the import line:

```ts
import { copyFileSync, existsSync, renameSync, statSync, unlinkSync } from "node:fs";
```

Add these helpers above `main()`:

```ts
/**
 * The npm `os` segment of the platform-specific sqlite-vec subpackage.
 * Mirrors upstream `sqlite-vec/index.cjs::platformPackageName`. Note that
 * `process.platform` is `"win32"` but the npm package uses `"windows"`.
 */
function npmOsSegment(platform: NodeJS.Platform): string {
  if (platform === "win32") return "windows";
  if (platform === "darwin") return "darwin";
  return "linux";
}

function vec0Filename(platform: NodeJS.Platform): string {
  if (platform === "win32") return "vec0.dll";
  if (platform === "darwin") return "vec0.dylib";
  return "vec0.so";
}

/**
 * Resolve the platform-specific vec0 binary in node_modules. Throws with a
 * clear, actionable message if the optional dep wasn't installed for this
 * platform — the resulting gateway would fail to load semantic memory.
 *
 * Two-step resolve: `sqlite-vec-{os}-{arch}` is an `optionalDependency` of
 * `sqlite-vec`, not of `@nimbus/gateway`, so a `createRequire` rooted at
 * `compile-gateway.ts` can't see it under Bun's isolated install layout
 * (`node_modules/.bun/<pkg>@<ver>/...`). We resolve `sqlite-vec` first (a
 * direct gateway dep), then `createRequire` rooted at that file to find the
 * sister platform package — same trick upstream `sqlite-vec/index.cjs` uses.
 */
function resolveVec0SourceOrThrow(): string {
  const pkg = `sqlite-vec-${npmOsSegment(process.platform)}-${process.arch}`;
  const fname = vec0Filename(process.platform);
  try {
    const sqliteVecIndex = createRequire(import.meta.url).resolve("sqlite-vec");
    const reqFromVec = createRequire(sqliteVecIndex);
    return reqFromVec.resolve(`${pkg}/${fname}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `compile-gateway: native dep "${pkg}" not found in node_modules (${msg}); ` +
        `bun install may have skipped it on this platform — the resulting gateway binary cannot load semantic memory.`,
    );
  }
}

function copyVec0Sidecar(): void {
  const src = resolveVec0SourceOrThrow();
  const dest = join(distDir, vec0Filename(process.platform));
  copyFileSync(src, dest);
  const size = statSync(dest).size;
  process.stdout.write(
    `compile-gateway: copied ${src} → ${dest} (${String(size)} bytes)\n`,
  );
}
```

Add the import at the top:

```ts
import { createRequire } from "node:module";
```

Replace the final lines of `main()` (the `process.exit(...)` after `spawnSync`):

```ts
  const status = r.status === null ? 1 : r.status;
  if (status !== 0) {
    process.exit(status);
  }
  copyVec0Sidecar();
  process.exit(0);
```

- [ ] **Step 2: Kill any running gateway and run the build**

```
# kill stale processes that hold the binary
tasklist 2>&1 | grep -iE "nimbus" | awk '{print $2}' | xargs -I{} taskkill //PID {} //F 2>&1   # Windows (Bash tool / mingw)
# OR  pkill -f nimbus-gateway   # macOS / Linux

bun run build
```

Expected output (last few lines):

```
compile-gateway: copied <repoRoot>/packages/gateway/node_modules/.bun/sqlite-vec-windows-x64@0.1.9/node_modules/sqlite-vec-windows-x64/vec0.dll → <repoRoot>/dist/vec0.dll (NNNNNN bytes)
@nimbus/gateway build: Exited with code 0
```

(Exact paths vary by platform; `vec0.so` on Linux, `vec0.dylib` on macOS.)

- [ ] **Step 3: Verify the sidecar exists in `dist/`**

```
ls -la dist/vec0.* dist/nimbus-gateway*
```

Expected: a `dist/vec0.{dll|so|dylib}` matching the host platform, sized in the low MB range, and `dist/nimbus-gateway{.exe}` next to it.

- [ ] **Step 4: Smoke-test the binary loads vec via the sidecar**

```
# Stop any running gateway
./packages/cli/dist/nimbus stop  || true   # OK if not running
./packages/cli/dist/nimbus start
bun scripts/diagnose-bug-005.ts
```

Expected `[diag]` output to include:

```
[diag] sqlite-vec loaded on fresh connection: false
[diag] tryLoadSqliteVec(db) -> true
```

(The "fresh connection" line is `false` because the diagnostic opens a brand-new connection and vec isn't auto-loaded; the manual `tryLoadSqliteVec` call then succeeds via the npm package OR the sidecar fallback. Both pass.)

Then submit a single TUI prompt to exercise the gateway-side load:

```
./packages/cli/dist/nimbus tui
# type: hi
# wait for reply, then Ctrl+C twice
```

Re-run the diagnostic:

```
bun scripts/diagnose-bug-005.ts
```

Expected `[summary]` line: `✅ session_memory has N rows across recent sessions.` (was `zero rows` before this fix.)

- [ ] **Step 5: Commit**

```
git add packages/gateway/compile-gateway.ts
git commit -m "build(gateway): copy vec0.{ext} sidecar into dist/ after compile (BUG-009)"
```

---

## Task 5: Bug log entry for BUG-009

**Files:**
- Modify: `docs/release/v0.1.0-smoke-bugs.md`

- [ ] **Step 1: Add a row to the bug index table**

Open `docs/release/v0.1.0-smoke-bugs.md`. Find the index table (top of the file). Add a row after the BUG-007 row:

```markdown
| BUG-009 | `sqlite-vec` native binary doesn't survive `bun build --compile`; semantic memory silently disabled in shipped gateway | high (root cause of BUG-005-c, blocks semantic recall) | gateway / build pipeline | fixed |
```

- [ ] **Step 2: Add the BUG-009 section at the bottom of the file**

Append at the end of `docs/release/v0.1.0-smoke-bugs.md`:

```markdown
---

## BUG-009 — `sqlite-vec` native binary doesn't survive `bun build --compile`

**Severity:** high. Root cause of BUG-005-c (memory writes silently no-op'd in the compiled binary) and the blocker for any future feature that depends on a native dep packaged via npm `optionalDependencies` plus `require.resolve`.
**Surface:** gateway compile pipeline + the sqlite-vec load wrapper.
**Status:** fixed. (a) `packages/gateway/compile-gateway.ts` now copies the platform-matching `vec0.{dll|so|dylib}` from `node_modules/sqlite-vec-{os}-{arch}/` into `<repoRoot>/dist/` next to `nimbus-gateway`. (b) `packages/gateway/src/index/sqlite-vec-load.ts` falls back to `dirname(process.execPath) + vec0.{ext}` when the upstream `loadSqliteVec(db)` throws (which it always does in the compiled binary because `require.resolve` can't see node_modules from inside the embedded VFS). (c) Pino `debug`-level logs cover the load chain (`via:"npm"`, `via:"sidecar"`, `sidecar not found`) so future support has observability without changing the silent-degrade UX. Regression coverage in `packages/gateway/src/index/sqlite-vec-load.test.ts` (10 tests). Design + review-feedback table at `docs/superpowers/specs/2026-05-08-bug-009-sqlite-vec-sidecar-design.md`.
**First seen:** investigation of BUG-005-c, 2026-05-08.

### Repro

Pre-fix, with the gateway running from the compiled binary:

```powershell
bun scripts/diagnose-bug-005.ts
# [diag] sqlite-vec loaded on fresh connection: false
# [diag] tryLoadSqliteVec(db) -> true   # works in dev (this script)
# but the gateway's own connection: ensureReady() returns false → 0 rows
```

In a TUI session, multi-turn memory was silently broken even though the JS-side `append` and `getRecentTurns` looked correct — `ensureSqliteVecForConnection` returned `false` because vec wasn't loadable, gating every store method.

### Workaround until fixed

None at the binary level. Workarounds were the layered fixes in BUG-005 (TUI sessionId threading, embedding decoupling, schema-only readiness split) — only the schema-only split can be partially undone now that the root cause is fixed.

### Verification

- After fix: `dist/vec0.{ext}` is present after `bun run build`.
- After fix: `bun scripts/diagnose-bug-005.ts` reports `session_memory has N rows` after a TUI session run against the compiled gateway.
- After fix: `packages/gateway/src/index/sqlite-vec-load.test.ts` covers `sidecarFilename`, `sidecarPath`, `tryLoadFromSidecar` (success / missing-file / load-throws), and `tryLoadSqliteVec` upstream success.

### Out-of-scope follow-ups

- **BUG-009-b:** ship the ONNX runtime native deps the same way so `@xenova/transformers` works in the compiled binary and the embedding worker initializes successfully. Without this, semantic recall stays disabled even with vec working — but literal-turn replay (the BUG-005 primary use case) doesn't need it.
- **`nimbus doctor` vec check:** at gateway start (or via the `doctor` command), probe `vec_version()` on a fresh connection and surface an actionable warning if it fails.
```

- [ ] **Step 3: Commit**

```
git add docs/release/v0.1.0-smoke-bugs.md
git commit -m "docs(release): record BUG-009 (sqlite-vec native dep sidecar) as fixed"
```

---

## Task 6: Preflight, push, open PR

**Files:**
- (no source changes; this is shipping the work)

- [ ] **Step 1: Run preflight (CI-parity targeted subset, per the project's durable rule)**

```
bun run typecheck
bun run lint
bun test packages/gateway/src/index/sqlite-vec-load.test.ts \
         packages/gateway/src/memory/session-memory-store.test.ts \
         packages/gateway/src/engine/run-ask.test.ts
```

Expected:
- `typecheck` exits 0 across all packages.
- `lint` exits 0.
- All listed tests pass.

If any step fails, fix and re-run before pushing.

- [ ] **Step 2: Push the branch**

```
git push -u origin dev/asafgolombek/v0.1.0-bug-009-sqlite-vec-sidecar
```

- [ ] **Step 3: Open the PR**

```
gh pr create \
  --title "fix(gateway): ship sqlite-vec as sidecar binary alongside the compiled gateway (BUG-009)" \
  --body "$(cat docs/superpowers/specs/2026-05-08-bug-009-sqlite-vec-sidecar-design.md | head -60)

Full design: docs/superpowers/specs/2026-05-08-bug-009-sqlite-vec-sidecar-design.md
Implementation plan: docs/superpowers/plans/2026-05-08-bug-009-sqlite-vec-sidecar.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

Note the PR URL it returns and watch CI from there.

---

## Self-Review

**Spec coverage:** Each design section maps to a task.

| Spec section | Plan task |
|---|---|
| §1 Compile script copies vec0.{ext} | Task 4 |
| §2 Load wrapper sidecar fallback | Task 1 (helpers) + Task 2 (fallback) + Task 3 (chain) |
| §3 Coverage | Task 1, 2, 3 unit tests + Task 4 manual smoke |
| §4 Failure mode silent degrade | Task 2 step 3 (returns false silently with debug log only) |
| Review-feedback dispositions | Task 4 step 1 has the verbatim error string (item 8); Task 2 step 3 has debug logs (item 4); Task 4 step 1 has the `npmOsSegment` mapping comment (item 6); deferred items are tracked in the spec only — no plan tasks |

**Placeholder scan:** No "TBD" / "TODO" / "implement later" / vague-error-handling / "similar to Task N" patterns.

**Type consistency:** `sidecarFilename(platform)`, `sidecarPath(execPath, platform)`, `tryLoadFromSidecar(db, baseDir)` all keep the same signatures across Tasks 1–3. The compile-script helpers (`npmOsSegment`, `vec0Filename`) are local to `compile-gateway.ts` and don't collide with the runtime helpers.

**Scope check:** One PR. Single feature: sidecar-bundle vec0 + load-from-sidecar fallback. ONNX and `nimbus doctor` are explicitly deferred and listed as out-of-scope follow-ups.

---

## Responses to external review feedback (round 2)

External review of this plan at `docs/superpowers/plans/2026-05-08-bug-009-sqlite-vec-sidecar-feedback.md` (Gemini CLI, 2026-05-08). Each item verified against the codebase before disposition.

| # | Item | Disposition | Reason |
|---|---|---|---|
| 1 | CI cross-compile safety pre-check | **Fix** | Added a "CI note" callout in Task 4 above the implementation step. Confirms the build script runs on each target's native runner (per the verified `release.yml` matrix from the spec-feedback round) and points future contributors at the explicit-`bun add` workaround if they ever adapt the script for cross-compile. No code change in the script itself. |
| 2 | Add `nimbus doctor` `vec_version()` check now (re-iterated) | **Defer** | User scoped this out in the brainstorm and confirmed it again in the spec-feedback round. Per the receiving-code-review framework, repeated suggestions don't override the user's decision. The follow-up is tracked in the spec under "Out-of-scope follow-ups" and in the BUG-009 entry of `v0.1.0-smoke-bugs.md`. |
| 3 | Bump sidecar-missing log to `warn`/`info` | **Defer** | Conflicts with the user's explicit brainstorm choice: "Silent degrade … no noisy errors, but also no signal." The `debug`-level lines added in Task 2 step 3 are already a compromise on the stated preference (justified because `debug` isn't visible at default log levels). Bumping further deviates from intent. |
| 4 | `.prev` binary cleanup / sidecar version mismatch | **Verified — not an issue** | The `.prev` rename in `compile-gateway.ts` is a **Windows file-lock workaround** (rename the running binary out of the way so `bun build` can write the replacement), not a rollback artifact. `copyFileSync` then atomically overwrites `dist/vec0.{ext}` on every build, so there's no scenario where a stale `vec0` pairs with a fresh gateway binary. |
| 5 | Tauri sidecar config | **Defer to Phase 6** | Same disposition as the spec-feedback round. Tauri release vehicle is deferred from `v0.1.0` to Phase 6 (`desktop-v0.1.0`) per the CLAUDE.md non-negotiables table. |
| 6 | Linux musl variant for `npmOsSegment` | **Defer (with technical pushback)** | Verified directly against `packages/gateway/node_modules/sqlite-vec/package.json`. The `optionalDependencies` field is exactly: `{ "sqlite-vec-darwin-x64", "sqlite-vec-linux-x64", "sqlite-vec-darwin-arm64", "sqlite-vec-windows-x64", "sqlite-vec-linux-arm64" }`. There is **no `sqlite-vec-linux-x64-musl` package** for sqlite-vec 0.1.9. The reviewer's claim is incorrect for this version. The musl/glibc concern is real for Alpine users but inherited from upstream — our pipeline doesn't introduce or worsen it. If/when upstream ships a musl variant, the existing `npmOsSegment` mapping needs an extension; until then it's a non-issue. |
