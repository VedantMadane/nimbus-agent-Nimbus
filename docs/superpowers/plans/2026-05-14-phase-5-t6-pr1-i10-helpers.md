# Phase 5 T6 PR 1 — I10 Timing-Safe Helper Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the I10 invariant consolidation — every constant-time compare helper in the gateway lives in one util module (`packages/gateway/src/util/timing-safe-compare.ts`); `ipc/lan-pairing.ts` and `ipc/http-auth.ts` drop their local helpers and import the canonical ones; `extensions/verify-extensions.ts` and `updater/updater.ts` keep their existing wiring but update the import path; a new `I10` enforcement block in `security-invariants.test.ts` pins all four call sites.

**Architecture:** `util/hex-compare.ts` renames to `util/timing-safe-compare.ts` (broader module purpose). The existing `sha256HexEqualConstantTime(a, b)` export keeps its name — callers update import paths only. A new `constantTimeStringEqual(a, b)` export lifts the Buffer-based shape from `http-auth.ts` (with the length-mismatch burn cycle that masks length differences from timing-side-channels). `lan-pairing.ts`'s char-level XOR helper is replaced by the canonical Buffer-based one — semantically equivalent for the ASCII base58 pairing codes it compares, and strictly stronger because of the burn cycle. A new `describe("I10 — ...")` block in `security-invariants.test.ts` asserts each of the four call sites imports from the canonical module AND no longer defines a local helper, so a future regression fails CI.

**Tech Stack:** Bun v1.2+, TypeScript 6.x strict (no `any`), `bun:test`, `bun:sqlite` (not touched), Node `crypto.timingSafeEqual` (Buffer-based primitive).

**Source spec:** [`docs/superpowers/specs/2026-05-14-phase-5-t6-design.md`](../specs/2026-05-14-phase-5-t6-design.md) §2 PR 1. The §7 review-disposition row 3.1a (FIX) locked the rename of `util/hex-compare.ts` → `util/timing-safe-compare.ts`.

**Worktree:** `.worktrees/phase-5-t6-pr1-i10-helpers/`, branch `dev/asafgolombek/phase-5-t6-pr1-i10-helpers` (branched off the T6 sequencing-spec branch so this plan can reference the committed spec; will rebase onto `main` once the sequencing-spec PR merges).

---

## File Structure

### Files created

| Path | Responsibility |
|---|---|
| `packages/gateway/src/util/timing-safe-compare.ts` | Canonical module — exports `sha256HexEqualConstantTime` (kept from the renamed file) and the new `constantTimeStringEqual`. Single wiring site for invariant I10. |
| `packages/gateway/src/util/timing-safe-compare.test.ts` | Unit tests covering both exports — equal/unequal cases, length-mismatch burn cycle, multi-byte UTF-8, empty strings, malformed hex inputs. |

### Files renamed / deleted

| From | To |
|---|---|
| `packages/gateway/src/util/hex-compare.ts` | `packages/gateway/src/util/timing-safe-compare.ts` (via `git mv` so history is preserved as a rename, then content extended in the same commit) |
| `packages/gateway/src/util/hex-compare.test.ts` | Deleted (its content is folded into the new `timing-safe-compare.test.ts` written in Task 2). |

### Files modified

| Path | Change |
|---|---|
| `packages/gateway/src/extensions/verify-extensions.ts` | Update import path: `"../util/hex-compare.ts"` → `"../util/timing-safe-compare.ts"`. No logic changes. |
| `packages/gateway/src/updater/updater.ts` | Update import path: `"../util/hex-compare.ts"` → `"../util/timing-safe-compare.ts"`. No logic changes. |
| `packages/gateway/src/ipc/lan-pairing.ts` | Delete the local `timingSafeEqual` function (lines 59-66). Import `constantTimeStringEqual` from `"../util/timing-safe-compare.ts"`. Replace the call site `timingSafeEqual(code, this.code)` (line 53) with `constantTimeStringEqual(code, this.code)`. |
| `packages/gateway/src/ipc/http-auth.ts` | Delete the local `constantTimeStringEqual` function (lines 41-53). Import the canonical from `"../util/timing-safe-compare.ts"`. Drop the `timingSafeEqual` import from `node:crypto` if no other caller in the file uses it (the `createHash` import stays). |
| `packages/gateway/src/security-invariants.test.ts` | Add a new `describe("I10 — Constant-time compare helpers live in util/timing-safe-compare.ts", ...)` block with six assertions (four import-path positives + two local-helper-absence negatives). |
| `docs/SECURITY-INVARIANTS.md` | Update the I10 row: "Wired at" column points at `util/timing-safe-compare.ts` (single source); call sites listed in the rationale; anti-pattern column extended to ban local re-definitions outside the util module. |

### Files NOT modified

- `packages/gateway/src/updater/updater.test.ts` — the existing test `"S6-F10 — sha256HexEqualConstantTime is used (mismatch still rejected)"` (line 481) keeps working because the export name doesn't change.
- `packages/gateway/src/ipc/lan-pairing.test.ts`, `packages/gateway/src/ipc/http-auth.test.ts` (if they exist) — function behaviour is preserved; only the wiring source changes.
- `scripts/structure-audit/check-nimbus-invariants.ts` — its existing scope (I1 `spawn` rule + vault-key allow-list) is untouched; PR 1 does not add a static-time complement for I10. The runtime invariant test is the enforcement.

---

## Task 1 — Verify baseline

**Files:** none.

- [ ] **Step 1.1: Verify branch and clean working tree**

Run from the worktree root:

```bash
git rev-parse --abbrev-ref HEAD
git status --short
```

Expected:

```
dev/asafgolombek/phase-5-t6-pr1-i10-helpers
(no output from git status)
```

If branch is wrong: stop and ask the user. If working tree has unstaged changes: stop.

- [ ] **Step 1.2: Confirm the T6 sequencing spec is on this branch**

Run:

```bash
ls docs/superpowers/specs/2026-05-14-phase-5-t6-design.md
```

Expected: the file exists. If not, the worktree was branched off the wrong base — stop and re-create it from `dev/asafgolombek/phase-5-t6-sequencing`.

- [ ] **Step 1.3: Confirm baseline typecheck is green**

Run:

```bash
bun run typecheck
```

Expected: exits 0. If errors exist before this PR's changes, stop and report — the baseline is dirty.

- [ ] **Step 1.4: Confirm baseline `security-invariants.test.ts` is green**

Run:

```bash
bun test packages/gateway/src/security-invariants.test.ts
```

Expected: all tests pass.

- [ ] **Step 1.5: Confirm the four I10 wiring sites match the spec's source-line references**

Run each grep and confirm the line numbers:

```bash
grep -n "sha256HexEqualConstantTime" packages/gateway/src/extensions/verify-extensions.ts
grep -n "sha256HexEqualConstantTime" packages/gateway/src/updater/updater.ts
grep -n "function timingSafeEqual" packages/gateway/src/ipc/lan-pairing.ts
grep -n "function constantTimeStringEqual" packages/gateway/src/ipc/http-auth.ts
```

Expected output (line numbers may have drifted by ±2):

```
packages/gateway/src/extensions/verify-extensions.ts:14:import { sha256HexEqualConstantTime } from "../util/hex-compare.ts";
packages/gateway/src/extensions/verify-extensions.ts:51:    if (!sha256HexEqualConstantTime(manifestHex, row.manifest_hash)) {
packages/gateway/src/extensions/verify-extensions.ts:82:    if (!sha256HexEqualConstantTime(entryHex, row.entry_hash)) {
packages/gateway/src/extensions/verify-extensions.ts:116:  if (!sha256HexEqualConstantTime(sha256HexOfBytes(manifestBytes), row.manifest_hash)) return false;
packages/gateway/src/extensions/verify-extensions.ts:128:  return sha256HexEqualConstantTime(sha256HexOfBytes(entryBytes), row.entry_hash);
packages/gateway/src/updater/updater.ts:1:import { sha256HexEqualConstantTime } from "../util/hex-compare.ts";
packages/gateway/src/updater/updater.ts:173:    if (!sha256HexEqualConstantTime(computedSha, asset.sha256)) {
packages/gateway/src/ipc/lan-pairing.ts:59:function timingSafeEqual(a: string, b: string): boolean {
packages/gateway/src/ipc/http-auth.ts:41:function constantTimeStringEqual(a: string, b: string): boolean {
```

If any of the four grep results return nothing, stop — the wiring shape has shifted since the spec was written and the plan needs revisiting.

---

## Task 2 — Write unit tests for the canonical util module (TDD red)

**Files:**

- Create: `packages/gateway/src/util/timing-safe-compare.test.ts`

This task captures both:

1. **Regression-lock tests** for the existing `sha256HexEqualConstantTime` semantics (so the rename is provably non-behavioural).
2. **New tests** for the new `constantTimeStringEqual` export, including the length-mismatch burn-cycle behaviour locked in the spec.

- [ ] **Step 2.1: Create the test file**

Create `packages/gateway/src/util/timing-safe-compare.test.ts` with:

```ts
import { expect, test } from "bun:test";
import {
  constantTimeStringEqual,
  sha256HexEqualConstantTime,
} from "./timing-safe-compare.ts";

// ─── sha256HexEqualConstantTime — regression-lock from hex-compare.ts ────────

test("sha256HexEqualConstantTime: returns true for equal 64-char hex", () => {
  const h = "a".repeat(64);
  expect(sha256HexEqualConstantTime(h, h)).toBe(true);
});

test("sha256HexEqualConstantTime: returns false for unequal hex of equal length", () => {
  const a = "a".repeat(64);
  const b = "b".repeat(64);
  expect(sha256HexEqualConstantTime(a, b)).toBe(false);
});

test("sha256HexEqualConstantTime: returns false when first input is not 64 chars", () => {
  const short = "a".repeat(63);
  const ok = "a".repeat(64);
  expect(sha256HexEqualConstantTime(short, ok)).toBe(false);
});

test("sha256HexEqualConstantTime: returns false when second input is not 64 chars", () => {
  const ok = "a".repeat(64);
  const short = "a".repeat(63);
  expect(sha256HexEqualConstantTime(ok, short)).toBe(false);
});

test("sha256HexEqualConstantTime: returns false when both inputs are empty", () => {
  expect(sha256HexEqualConstantTime("", "")).toBe(false);
});

test("sha256HexEqualConstantTime: returns false for malformed hex (non-hex chars)", () => {
  // 64 chars but contains a non-hex character.
  const malformed = `${"a".repeat(63)}Z`;
  const ok = "a".repeat(64);
  expect(sha256HexEqualConstantTime(malformed, ok)).toBe(false);
});

test("sha256HexEqualConstantTime: differs by a single character in the middle", () => {
  const a = "a".repeat(64);
  const b = `${"a".repeat(32)}b${"a".repeat(31)}`;
  expect(sha256HexEqualConstantTime(a, b)).toBe(false);
});

// ─── constantTimeStringEqual — new canonical helper ─────────────────────────

test("constantTimeStringEqual: returns true for equal strings", () => {
  expect(constantTimeStringEqual("hello", "hello")).toBe(true);
});

test("constantTimeStringEqual: returns false for different strings of same length", () => {
  expect(constantTimeStringEqual("hello", "world")).toBe(false);
});

test("constantTimeStringEqual: returns false for different lengths", () => {
  expect(constantTimeStringEqual("abc", "abcd")).toBe(false);
  expect(constantTimeStringEqual("abcd", "abc")).toBe(false);
});

test("constantTimeStringEqual: returns true for two empty strings", () => {
  expect(constantTimeStringEqual("", "")).toBe(true);
});

test("constantTimeStringEqual: returns false when only one input is empty", () => {
  expect(constantTimeStringEqual("", "x")).toBe(false);
  expect(constantTimeStringEqual("x", "")).toBe(false);
});

test("constantTimeStringEqual: handles UTF-8 multi-byte characters correctly", () => {
  // The new canonical helper is Buffer-based (UTF-8 byte compare), which means
  // multi-byte characters are compared byte-for-byte. Locked in the T6 spec §2 PR 1
  // ("Buffer-based, with length-mismatch burn cycle to match the defensive shape
  // of `http-auth.ts`'s helper").
  expect(constantTimeStringEqual("café", "café")).toBe(true);
  expect(constantTimeStringEqual("café", "cafe")).toBe(false); // differs in last byte (length differs)
  // Two visually distinct multi-byte strings of the same UTF-8 byte length.
  expect(constantTimeStringEqual("café", "cafè")).toBe(false);
});

test("constantTimeStringEqual: returns true for typical base58 pairing-code shapes", () => {
  // Locks in compatibility for lan-pairing's existing call site (20-char base58).
  const code = "BqSv9KQwz8m3Y4r2Lh1n";
  expect(constantTimeStringEqual(code, code)).toBe(true);
  expect(constantTimeStringEqual(code, "BqSv9KQwz8m3Y4r2Lh1m")).toBe(false); // differs last char
});

test("constantTimeStringEqual: returns true for typical bearer-token shapes", () => {
  // Locks in compatibility for http-auth's existing call site (long opaque token).
  const t = "n1mb_dep1oy_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  expect(constantTimeStringEqual(t, t)).toBe(true);
  expect(constantTimeStringEqual(t, t.slice(0, -1) + "Z")).toBe(false);
});
```

- [ ] **Step 2.2: Run the test file and verify it fails (TDD red)**

Run:

```bash
bun test packages/gateway/src/util/timing-safe-compare.test.ts
```

**Expected outcome — module not found.** The import `from "./timing-safe-compare.ts"` resolves to nothing because the file does not exist yet (the production source is still at `hex-compare.ts`). Bun's reporter shows the import error as a test-loader failure for every test in the file.

If you see passing tests, stop — that means the production rename happened out of order. The TDD-red signal is the central proof that Task 3's rename closes a real gap.

- [ ] **Step 2.3: Commit the failing test file**

```bash
git add packages/gateway/src/util/timing-safe-compare.test.ts
git commit -m "$(cat <<'EOF'
test(util): TDD red — timing-safe-compare unit tests

Adds fifteen unit cases covering both exports the canonical util
module will own after the Task 3 rename + extension:

- sha256HexEqualConstantTime regression-lock (equal / unequal /
  length-violation / malformed-hex / off-by-one-middle cases).
- constantTimeStringEqual new-export coverage (equal / unequal /
  length-mismatch / empty-both / empty-one / UTF-8 multi-byte /
  base58 pairing-code shape / bearer-token shape).

All fifteen fail intentionally before Task 3 lands the
production-side rename + new export.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — Rename + add new export + update import-only callers (TDD green for Task 2)

**Files:**

- Rename: `packages/gateway/src/util/hex-compare.ts` → `packages/gateway/src/util/timing-safe-compare.ts`
- Modify (after rename): `packages/gateway/src/util/timing-safe-compare.ts`
- Delete: `packages/gateway/src/util/hex-compare.test.ts`
- Modify: `packages/gateway/src/extensions/verify-extensions.ts`
- Modify: `packages/gateway/src/updater/updater.ts`

- [ ] **Step 3.1: Rename the source file via `git mv`**

```bash
git mv packages/gateway/src/util/hex-compare.ts packages/gateway/src/util/timing-safe-compare.ts
```

- [ ] **Step 3.2: Delete the old test file (its coverage moved to `timing-safe-compare.test.ts`)**

```bash
git rm packages/gateway/src/util/hex-compare.test.ts
```

- [ ] **Step 3.3: Replace the renamed file's contents**

Open `packages/gateway/src/util/timing-safe-compare.ts` and replace its contents with:

```ts
import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time SHA-256 hex string equality.
 *
 * S6-F10 / S7-F8 — replaces direct `!==` comparison of hash hex strings,
 * which can leak partial-match timing information across many calls.
 *
 * Returns `false` (not throws) on length mismatch, non-64-char inputs, or
 * malformed hex — invalid hex is rejected before reaching `timingSafeEqual`
 * so the constant-time guarantee only covers the valid-input fast path.
 */
export function sha256HexEqualConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length || a.length !== 64) return false;
  let bufA: Buffer;
  let bufB: Buffer;
  try {
    bufA = Buffer.from(a, "hex");
    bufB = Buffer.from(b, "hex");
  } catch {
    return false;
  }
  if (bufA.length !== 32 || bufB.length !== 32) return false;
  // Buffer.from(hex) silently drops invalid characters and produces a
  // shorter buffer — so the length check above also catches malformed hex.
  return timingSafeEqual(bufA, bufB);
}

/**
 * Constant-time UTF-8 string equality.
 *
 * Canonical helper for invariant I10. Use for pairing codes, bearer tokens,
 * and any other opaque-string compare where a `===` would leak prefix-match
 * timing information.
 *
 * On length mismatch the function burns the same number of CPU cycles a real
 * compare would (by running `timingSafeEqual(aBuf, aBuf)` and discarding the
 * result) so observers see only "not equal" — never the byte position where
 * the inputs diverged or which input was the longer one.
 */
export function constantTimeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) {
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}
```

- [ ] **Step 3.4: Update import path in `extensions/verify-extensions.ts`**

Open `packages/gateway/src/extensions/verify-extensions.ts` line 14 and change:

```ts
import { sha256HexEqualConstantTime } from "../util/hex-compare.ts";
```

to:

```ts
import { sha256HexEqualConstantTime } from "../util/timing-safe-compare.ts";
```

No other changes in this file.

- [ ] **Step 3.5: Update import path in `updater/updater.ts`**

Open `packages/gateway/src/updater/updater.ts` line 1 and change:

```ts
import { sha256HexEqualConstantTime } from "../util/hex-compare.ts";
```

to:

```ts
import { sha256HexEqualConstantTime } from "../util/timing-safe-compare.ts";
```

No other changes in this file.

- [ ] **Step 3.6: Run the new util tests and verify they all pass (TDD green for Task 2)**

```bash
bun test packages/gateway/src/util/timing-safe-compare.test.ts
```

Expected: all 15 tests pass.

If any case is still failing, read the assertion and fix the implementation — do NOT weaken the test.

- [ ] **Step 3.7: Run the existing updater test that references `sha256HexEqualConstantTime`**

```bash
bun test packages/gateway/src/updater/updater.test.ts
```

Expected: green — including the test at line 481 (`"S6-F10 — sha256HexEqualConstantTime is used (mismatch still rejected)"`). The function name is unchanged so this is a regression check that the rename didn't break anything observable.

- [ ] **Step 3.8: Typecheck**

```bash
bun run typecheck
```

Expected: exits 0. A TypeScript error referencing `hex-compare.ts` from anywhere in the gateway means an import path was missed — re-grep with the next step.

- [ ] **Step 3.9: Confirm no stale `hex-compare` references remain anywhere in-repo**

Code sites (must be zero matches — any hit is a missed import path):

```bash
grep -rn "hex-compare" packages/gateway/src packages/cli/src packages/ui/src packages/sdk/src packages/client/src packages/mcp-connectors scripts
```

Expected: zero matches. If matches remain, fix the import path or static reference before commit.

Documentation / config sites (matches expected only in the spec + this plan + this PR's review-feedback narrative):

```bash
grep -rn "hex-compare" docs .claude/commands package.json 2>/dev/null
```

Expected matches:

- `docs/SECURITY-INVARIANTS.md` — the I10 row's old wiring file name. **Task 6 updates this row** in the same commit pipeline; do not fix here.
- `docs/superpowers/specs/2026-05-14-phase-5-t6-design.md` — intentional historical reference in §2 PR 1 (the rename is described in the past tense).
- `docs/superpowers/plans/2026-05-14-phase-5-t6-pr1-i10-helpers.md` — this plan, in Task 1's verification grep + Task 3's commands.
- `docs/superpowers/plans/2026-05-14-phase-5-t6-pr1-i10-helpers-review-feedback.md` (if landed) — the review narrative.

Any **other** match — `.claude/commands/*.md` skill files, `docs/architecture.md`, `docs/roadmap.md`, `package.json`, etc. — must be either (a) updated to `timing-safe-compare` in Task 6's commit, or (b) explicitly excluded from the rename here with a documented reason. **Do not commit Task 3** until either condition is true for every doc-side match.

- [ ] **Step 3.10: Commit the rename + new export + import-path updates**

```bash
git add packages/gateway/src/util/timing-safe-compare.ts \
        packages/gateway/src/extensions/verify-extensions.ts \
        packages/gateway/src/updater/updater.ts
git commit -m "$(cat <<'EOF'
refactor(util): rename hex-compare.ts → timing-safe-compare.ts + add constantTimeStringEqual

- Renames util/hex-compare.ts → util/timing-safe-compare.ts (the
  broader name reflects the module's expanded purpose). Export
  name sha256HexEqualConstantTime stays so existing callers update
  import paths only.
- Adds constantTimeStringEqual(a, b) export — Buffer-based UTF-8
  compare with the length-mismatch burn cycle from the
  to-be-deleted http-auth.ts helper. Canonical for invariant I10.
- Updates the two existing I10 callers (extensions/verify-
  extensions.ts and updater/updater.ts) to import from the new
  path. No logic changes.
- Removes the old util/hex-compare.test.ts; its coverage is folded
  into util/timing-safe-compare.test.ts (already committed in the
  preceding TDD-red commit).

The Task 2 util tests now pass (TDD green).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — Write I10 enforcement assertions (TDD red)

**Files:**

- Modify: `packages/gateway/src/security-invariants.test.ts`

`I10` currently has **no** assertions in the security-invariants test file (verified at plan-write time: `describe("I` blocks exist for I1–I6, I8, I11, I13 only). This task adds a complete `describe("I10 — ...")` block that locks all four wiring sites AND asserts the absence of local helpers in `lan-pairing.ts` / `http-auth.ts`. The block fails until Task 5 deletes the local helpers.

- [ ] **Step 4.1: Inspect the existing file to find the right insertion point**

```bash
grep -nE 'describe\("I[0-9]+' packages/gateway/src/security-invariants.test.ts
```

Expected output (at the time this plan was written):

```
35:describe("I1 — extensionProcessEnv is the only env source for spawned MCP children", () => {
56:describe("I2 — HITL frozen-set membership", () => {
68:describe("I3 — HITL gate consults action.type (not payload.mcpToolId)", () => {
84:describe("I4 — hitlStatus is consent-output-only in production paths", () => {
91:describe("I5 — LAN method allowlist is intrinsic to LanServer", () => {
106:describe("I6 — LAN bind defaults to loopback", () => {
114:describe("I8 — Tauri renderer CSP is restrictive", () => {
127:describe("I11 — Tool-result envelope on the LLM-facing path", () => {
146:describe("I13 — HTTP write routes go through allowlist + bearer auth", () => {
```

Insert the new I10 block between the `I8` block (ends around the start of the `I11` block) and the `I11` block. This keeps invariants in numerical order.

- [ ] **Step 4.2: Add the new I10 describe block**

Find the line `describe("I11 — Tool-result envelope on the LLM-facing path", () => {` (around line 127). Immediately above it, insert:

```ts
describe("I10 — Constant-time compare helpers live in util/timing-safe-compare.ts", () => {
  test("extensions/verify-extensions.ts imports sha256HexEqualConstantTime from util/timing-safe-compare", async () => {
    const src = await read("packages/gateway/src/extensions/verify-extensions.ts");
    expect(src).toMatch(
      /import\s*\{\s*sha256HexEqualConstantTime\s*\}\s*from\s*["']\.\.\/util\/timing-safe-compare(?:\.ts)?["']/,
    );
  });

  test("updater/updater.ts imports sha256HexEqualConstantTime from util/timing-safe-compare", async () => {
    const src = await read("packages/gateway/src/updater/updater.ts");
    expect(src).toMatch(
      /import\s*\{\s*sha256HexEqualConstantTime\s*\}\s*from\s*["']\.\.\/util\/timing-safe-compare(?:\.ts)?["']/,
    );
  });

  test("ipc/lan-pairing.ts imports constantTimeStringEqual from util/timing-safe-compare", async () => {
    const src = await read("packages/gateway/src/ipc/lan-pairing.ts");
    expect(src).toMatch(
      /import\s*\{[^}]*\bconstantTimeStringEqual\b[^}]*\}\s*from\s*["']\.\.\/util\/timing-safe-compare(?:\.ts)?["']/,
    );
  });

  test("ipc/http-auth.ts imports constantTimeStringEqual from util/timing-safe-compare", async () => {
    const src = await read("packages/gateway/src/ipc/http-auth.ts");
    expect(src).toMatch(
      /import\s*\{[^}]*\bconstantTimeStringEqual\b[^}]*\}\s*from\s*["']\.\.\/util\/timing-safe-compare(?:\.ts)?["']/,
    );
  });

  test("ipc/lan-pairing.ts does NOT define a local timingSafeEqual or constantTimeStringEqual", async () => {
    const src = await read("packages/gateway/src/ipc/lan-pairing.ts");
    expect(src).not.toMatch(/function\s+timingSafeEqual\s*\(/);
    expect(src).not.toMatch(/function\s+constantTimeStringEqual\s*\(/);
  });

  test("ipc/http-auth.ts does NOT define a local constantTimeStringEqual", async () => {
    const src = await read("packages/gateway/src/ipc/http-auth.ts");
    expect(src).not.toMatch(/function\s+constantTimeStringEqual\s*\(/);
  });
});
```

The `read()` helper is already defined at the top of the file (line 9) — no new imports required.

- [ ] **Step 4.3: Run the security-invariants test and verify the new block fails (TDD red)**

```bash
bun test packages/gateway/src/security-invariants.test.ts
```

Expected: **2 pass, 4 fail** within the new `I10` block:

| # | Test | Why pre-Task-5 |
|---|---|---|
| 1 | `extensions/verify-extensions.ts imports … from util/timing-safe-compare` | **PASS** — Task 3 already updated this import |
| 2 | `updater/updater.ts imports … from util/timing-safe-compare` | **PASS** — Task 3 already updated this import |
| 3 | `ipc/lan-pairing.ts imports constantTimeStringEqual from util/timing-safe-compare` | **FAIL** — file still defines its own local `timingSafeEqual` and never imports the canonical |
| 4 | `ipc/http-auth.ts imports constantTimeStringEqual from util/timing-safe-compare` | **FAIL** — file still defines its own local `constantTimeStringEqual` and never imports the canonical |
| 5 | `ipc/lan-pairing.ts does NOT define a local timingSafeEqual or constantTimeStringEqual` | **FAIL** — `function timingSafeEqual(` still present at line 59 |
| 6 | `ipc/http-auth.ts does NOT define a local constantTimeStringEqual` | **FAIL** — `function constantTimeStringEqual(` still present at line 41 |

Tests in other I-numbered blocks must remain green. If any non-I10 test fails here, stop and investigate — that indicates collateral damage from Task 3's rename and must be fixed before Task 5.

If you see something other than the 2-pass / 4-fail split (e.g., a syntax error from the inserted block, or all six pass), read the output before proceeding.

- [ ] **Step 4.4: Commit the failing I10 enforcement block**

```bash
git add packages/gateway/src/security-invariants.test.ts
git commit -m "$(cat <<'EOF'
test(security-invariants): TDD red — I10 enforcement block

Adds the first I10 enforcement block to security-invariants.test.ts.
Six assertions:

- 4× import-path positive: each of the four I10 call sites
  (extensions/verify-extensions.ts, updater/updater.ts,
  ipc/lan-pairing.ts, ipc/http-auth.ts) imports from
  util/timing-safe-compare.
- 2× local-helper-absence negative: ipc/lan-pairing.ts and
  ipc/http-auth.ts do NOT define their own local timingSafeEqual
  or constantTimeStringEqual.

Two import-path assertions pass (verify-extensions + updater were
migrated in Task 3). Four assertions fail intentionally until
Task 5 migrates lan-pairing.ts and http-auth.ts.

This is the first runtime test for I10 — the prior B1 audit
found I10 had no enforcement test at all (only the wiring sites
and the SECURITY-INVARIANTS.md row existed). This block closes
the invariant triple for I10.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — Migrate `lan-pairing.ts` and `http-auth.ts` (TDD green for Task 4)

**Files:**

- Modify: `packages/gateway/src/ipc/lan-pairing.ts`
- Modify: `packages/gateway/src/ipc/http-auth.ts`

- [ ] **Step 5.1: Migrate `ipc/lan-pairing.ts`**

Open `packages/gateway/src/ipc/lan-pairing.ts`. Replace the entire file with:

```ts
import { randomBytes } from "node:crypto";
import bs58 from "bs58";
import { constantTimeStringEqual } from "../util/timing-safe-compare.ts";

/** 120-bit entropy → 20 base58 characters. */
export function generatePairingCode(): string {
  const raw = new Uint8Array(randomBytes(15)); // 15 bytes = 120 bits
  const encoded = bs58.encode(raw);
  if (encoded.length >= 20) return encoded.slice(0, 20);
  return encoded.padStart(20, "1");
}

export class PairingWindow {
  private code: string | null = null;
  private openedAt: number | null = null;
  private readonly now: () => number;
  constructor(
    private readonly windowMs: number,
    now?: () => number,
  ) {
    this.now = now ?? (() => Date.now());
  }

  open(code: string): void {
    this.code = code;
    this.openedAt = this.now();
  }

  close(): void {
    this.code = null;
    this.openedAt = null;
  }

  isOpen(): boolean {
    if (!this.code || this.openedAt === null) return false;
    return this.now() - this.openedAt <= this.windowMs;
  }

  getExpiresAt(): number | null {
    if (this.openedAt === null) return null;
    return this.openedAt + this.windowMs;
  }

  consume(code: string): boolean {
    return this.consumeAt(code, this.now());
  }

  consumeAt(code: string, nowMs: number): boolean {
    if (!this.code || this.openedAt === null) return false;
    if (nowMs - this.openedAt > this.windowMs) {
      this.close();
      return false;
    }
    if (!constantTimeStringEqual(code, this.code)) return false;
    this.close();
    return true;
  }
}
```

Key changes vs the pre-PR file:

- Added `import { constantTimeStringEqual } from "../util/timing-safe-compare.ts"`.
- Deleted the local `function timingSafeEqual(a: string, b: string): boolean { ... }` (was lines 59-66).
- `consumeAt`'s pairing-code compare now calls the canonical `constantTimeStringEqual` instead of the local helper.

Semantic note: the canonical helper is Buffer-based (UTF-8 byte compare) while the deleted local helper was char-level (codePoint XOR). Pairing codes are 20 base58 characters (ASCII subset), so the byte-level and char-level compares are equivalent for this input shape. The canonical helper additionally burns cycles on length mismatch — a strict improvement (the deleted helper short-circuited on length mismatch, leaking the "lengths differ" signal more loudly).

- [ ] **Step 5.2: Migrate `ipc/http-auth.ts`**

Open `packages/gateway/src/ipc/http-auth.ts`. Replace its contents with:

```ts
/**
 * Phase 5 T4 PR 3b — Bearer-token auth for the HTTP write surface.
 *
 * The token is stored under vault key `http_api.deployment_token`. This
 * key is system-level (not connector-scoped) and lives outside
 * CONNECTOR_VAULT_SECRET_KEYS by design — see the design §4 note.
 *
 * Constant-time compare prevents timing-side-channel discovery of the
 * token through prefix-difference latency.
 */

import { createHash } from "node:crypto";
import { constantTimeStringEqual } from "../util/timing-safe-compare.ts";

export const HTTP_API_DEPLOYMENT_TOKEN_VAULT_KEY = "http_api.deployment_token";

const BEARER_PREFIX = "Bearer ";

export function tokenFingerprint(token: string | undefined): string {
  if (token === undefined || token === "") return "unknown";
  return createHash("sha256").update(token).digest("hex").slice(0, 8);
}

export interface RequireBearerContext {
  /** Empty string => write surface disabled (vault key absent). */
  readonly expectedToken: string;
}

export interface RequireBearerResult {
  readonly ok: boolean;
  readonly fingerprint: string;
  readonly surfaceDisabled?: boolean;
}

function extractBearer(req: Request): string | undefined {
  const raw = req.headers.get("authorization");
  if (raw === null) return undefined;
  if (!raw.startsWith(BEARER_PREFIX)) return undefined;
  return raw.slice(BEARER_PREFIX.length);
}

export function requireBearer(req: Request, ctx: RequireBearerContext): RequireBearerResult {
  if (ctx.expectedToken === "") {
    return { ok: false, fingerprint: "unknown", surfaceDisabled: true };
  }
  const presented = extractBearer(req);
  if (presented === undefined) {
    return { ok: false, fingerprint: "unknown" };
  }
  const ok = constantTimeStringEqual(presented, ctx.expectedToken);
  return { ok, fingerprint: tokenFingerprint(presented) };
}
```

Key changes vs the pre-PR file:

- Dropped `timingSafeEqual` from the `node:crypto` import (only `createHash` is still consumed directly).
- Added `import { constantTimeStringEqual } from "../util/timing-safe-compare.ts"`.
- Deleted the local `function constantTimeStringEqual(a: string, b: string): boolean { ... }` (was lines 41-53).
- `requireBearer` calls the canonical export with the same identifier — call site unchanged.

- [ ] **Step 5.3: Run the security-invariants test and verify all I10 assertions pass (TDD green for Task 4)**

```bash
bun test packages/gateway/src/security-invariants.test.ts
```

Expected: all tests pass, including the six new I10 assertions from Task 4.

- [ ] **Step 5.4: Run the LAN test surface to confirm pairing-code semantics are intact**

```bash
bun test packages/gateway/src/ipc/lan-pairing.test.ts
```

Expected: green. If this file does not exist on the branch, skip — but ensure the LAN coverage gate (Step 7.1) still passes.

- [ ] **Step 5.5: Run the HTTP auth test surface to confirm bearer-token semantics are intact**

```bash
bun test packages/gateway/src/ipc/http-auth.test.ts
```

Expected: green. If this file does not exist, skip — but the preflight/deployment coverage gates exercise the bearer path indirectly.

- [ ] **Step 5.6: Typecheck**

```bash
bun run typecheck
```

Expected: exits 0.

- [ ] **Step 5.7: Commit the migration**

```bash
git add packages/gateway/src/ipc/lan-pairing.ts packages/gateway/src/ipc/http-auth.ts
git commit -m "$(cat <<'EOF'
refactor(ipc): consolidate local timing-safe helpers under util/

Migrates the last two local constant-time string-compare helpers
into the canonical util/timing-safe-compare.ts module.

- ipc/lan-pairing.ts: deletes the local char-level timingSafeEqual
  (codePoint-XOR loop), imports the canonical Buffer-based
  constantTimeStringEqual. Pairing codes are 20-char base58
  (ASCII subset) so the byte vs char compare is equivalent; the
  canonical helper additionally burns cycles on length mismatch
  (strict improvement — the deleted helper short-circuited on
  length, leaking the "lengths differ" signal more loudly).
- ipc/http-auth.ts: deletes the local Buffer-based
  constantTimeStringEqual (which was already the canonical shape;
  this is purely deduplication). Drops the now-unused
  timingSafeEqual import from node:crypto.

Invariant I10 now has a single wiring site
(util/timing-safe-compare.ts). All four call sites
(verify-extensions, updater, lan-pairing, http-auth) import from
that one module. The Task 4 enforcement block is fully green.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — Update `docs/SECURITY-INVARIANTS.md` I10 row + sweep any other doc-side `hex-compare` mentions

**Files:**

- Modify: `docs/SECURITY-INVARIANTS.md`
- Modify (conditional, if Step 3.9 surfaced matches outside the expected set): any other `.md` / `.json` file under `docs/`, `.claude/commands/`, or repo root that still references `hex-compare` after Task 3.

- [ ] **Step 6.1: Locate the I10 row**

Run:

```bash
grep -nE '^\|\s*I10\s*\|' docs/SECURITY-INVARIANTS.md
```

Expected: a single row hit. Note the line number.

- [ ] **Step 6.2: Inspect the surrounding context so the edit fits the table shape**

Run:

```bash
sed -n '1,200p' docs/SECURITY-INVARIANTS.md | grep -nE '^\|' | head -40
```

Read the table header columns. The standard invariant table has at least three columns: ID, Invariant statement, Wired at, Anti-pattern. Confirm before editing.

- [ ] **Step 6.3: Replace the I10 row**

Open `docs/SECURITY-INVARIANTS.md`. Replace the existing I10 row with:

```markdown
| I10 | Constant-time compare for hashes / MACs / pairing codes / bearer tokens | `util/timing-safe-compare.ts` (canonical) — re-exported `sha256HexEqualConstantTime` consumed by `extensions/verify-extensions.ts` + `updater/updater.ts`; new `constantTimeStringEqual` consumed by `ipc/lan-pairing.ts` + `ipc/http-auth.ts` | `===` / `!==` on hash bytes; redefining a local `timingSafeEqual` / `constantTimeStringEqual` outside `util/timing-safe-compare.ts` instead of importing the canonical export |
```

If the row spans multiple narrative paragraphs further down the file (a section with deeper rationale beneath the table), update that section's wiring file:line references to the new path. Search:

```bash
grep -n "hex-compare" docs/SECURITY-INVARIANTS.md
```

For each match, replace `hex-compare` with `timing-safe-compare` and update line numbers if the rationale cites them.

- [ ] **Step 6.4: Run the doc-references audit to confirm no broken links**

```bash
bun scripts/structure-audit/check-doc-references.ts --check
```

Expected: exits 0. If a link breaks, fix it before committing.

- [ ] **Step 6.5: Sweep any other doc-side `hex-compare` mentions surfaced by Step 3.9**

Re-run the doc-side grep from Step 3.9:

```bash
grep -rn "hex-compare" docs .claude/commands package.json 2>/dev/null
```

For every match **outside** the four expected sites listed in Step 3.9, edit the file to replace `hex-compare` with `timing-safe-compare`. Stage each edit alongside `docs/SECURITY-INVARIANTS.md` in the upcoming commit.

If a match is in a historical artefact (a dated review-feedback file, a closed roadmap entry summarising a past PR), leave it alone — those are accurate at their date. Only narrative documentation that asserts present-tense behaviour needs updating.

- [ ] **Step 6.6: Commit the docs update**

```bash
git add docs/SECURITY-INVARIANTS.md
git commit -m "$(cat <<'EOF'
docs(security-invariants): I10 single wiring site is util/timing-safe-compare.ts

Updates the I10 row's "Wired at" column to name the canonical
util module as the single source. Call sites listed in the
rationale: verify-extensions.ts + updater.ts use
sha256HexEqualConstantTime; lan-pairing.ts + http-auth.ts use
constantTimeStringEqual.

The "Anti-pattern" column is extended to ban redefining local
timingSafeEqual / constantTimeStringEqual outside the util
module. The security-invariants test enforces this at runtime
(Task 4 + Task 5).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 — Full CI parity check

**Files:** none.

- [ ] **Step 7.1: Run the LAN coverage gate (the LAN suite exercises `lan-pairing.ts`)**

```bash
bun run test:coverage:lan
```

Expected: passes the ≥80% line-coverage gate.

- [ ] **Step 7.2: Run the deployment coverage gate (the deployment surface exercises `http-auth.ts`)**

```bash
bun run test:coverage:deployment
```

Expected: passes the ≥80% line-coverage gate.

- [ ] **Step 7.3: Run the extensions coverage gate**

```bash
bun run test:coverage:extensions
```

Expected: passes the ≥85% line-coverage gate (the `verify-extensions.ts` import path change must not hurt coverage).

- [ ] **Step 7.4: Run the updater coverage gate**

```bash
bun run test:coverage:updater
```

Expected: passes the ≥80% line-coverage gate.

- [ ] **Step 7.5: Run the structural-audit invariants check**

```bash
bun run audit:invariants
```

Expected: exits 0. This catches any regression of I1 / vault-key allow-list. I10 has no static-time complement (PR 1 stays runtime-test-only by spec design).

- [ ] **Step 7.6: Run the doc-references audit**

```bash
bun scripts/structure-audit/check-doc-references.ts --check
```

Expected: exits 0.

- [ ] **Step 7.7: Run the full CI parity sequence**

```bash
bun run test:ci
```

Expected: exits 0. This is the load-bearing pre-PR check. If anything fails, fix it now — do not push.

- [ ] **Step 7.8: Lint**

```bash
bun run lint
```

Expected: exits 0. If style issues are reported, run `bun run lint:fix`, re-run `bun run lint`, then commit any auto-fixes as a separate `style: ...` commit.

- [ ] **Step 7.9: Recap the commit graph against the base of the branch**

```bash
git log --oneline dev/asafgolombek/phase-5-t6-sequencing..HEAD
```

Expected: five commits in this order — `test(util): TDD red` (Task 2), `refactor(util): rename + add constantTimeStringEqual` (Task 3), `test(security-invariants): TDD red — I10 enforcement block` (Task 4), `refactor(ipc): consolidate local timing-safe helpers` (Task 5), `docs(security-invariants): I10 single wiring site` (Task 6). Plus optionally a `style: ...` commit from Step 7.8 if Biome auto-fixed anything.

The branch base is the T6 sequencing-spec branch (not `main`) so that the PR can reference the spec by its committed path. The PR will be rebased onto `main` once the sequencing PR merges — Task 8 covers the push decision.

---

## Task 8 — Push branch + open PR

**Files:** none.

- [ ] **Step 8.1: Decide branch base posture with the user before pushing**

Two postures, the user picks:

1. **Stacked PR.** Branch stays on top of `dev/asafgolombek/phase-5-t6-sequencing`. Open the PR; GitHub will show the base as the sequencing branch. The sequencing PR must merge to `main` first; this PR rebases onto fresh `main` afterwards (`git rebase --onto main dev/asafgolombek/phase-5-t6-sequencing`) and force-pushes.
2. **Independent PR.** Rebase onto `main` now (`git rebase --onto main dev/asafgolombek/phase-5-t6-sequencing`) before pushing. The sequencing spec must already be on the rebase target — confirm with `git log --oneline main | grep -E 'T6 sequencing'`; if the sequencing PR has not merged, stop and switch to option 1.

Ask the user before proceeding. **Do not push or rebase without an explicit answer.**

- [ ] **Step 8.2: Push the branch with upstream tracking (after user picks)**

```bash
git push -u origin dev/asafgolombek/phase-5-t6-pr1-i10-helpers
```

Expected: push succeeds; the branch is reported as tracking `origin/dev/asafgolombek/phase-5-t6-pr1-i10-helpers`.

- [ ] **Step 8.3: Open the PR**

```bash
gh pr create --title "refactor(util): I10 consolidation — single util/timing-safe-compare.ts wiring site" --body "$(cat <<'EOF'
## Summary

- Renames `util/hex-compare.ts` → `util/timing-safe-compare.ts`. Existing `sha256HexEqualConstantTime` export name preserved so the two existing I10 callers (`extensions/verify-extensions.ts`, `updater/updater.ts`) update import paths only.
- Adds a new `constantTimeStringEqual(a, b)` export — Buffer-based UTF-8 compare with the length-mismatch burn cycle from `http-auth.ts`'s deleted local helper.
- Migrates `ipc/lan-pairing.ts` and `ipc/http-auth.ts` to import the canonical helper; deletes both files' local re-definitions.
- Adds the first I10 enforcement block to `packages/gateway/src/security-invariants.test.ts` (six assertions: 4× import-path positive, 2× local-helper-absence negative).
- Updates `docs/SECURITY-INVARIANTS.md` I10 row: single wiring site + extended anti-pattern.

Phase 5 T6 PR 1 of 4 — see [T6 sequencing spec](../docs/superpowers/specs/2026-05-14-phase-5-t6-design.md) §2 PR 1.

## Test plan

- [ ] `bun run test:ci` green locally (incl. `test:coverage:lan` ≥80%, `test:coverage:deployment` ≥80%, `test:coverage:extensions` ≥85%, `test:coverage:updater` ≥80%)
- [ ] `bun run audit:invariants` green
- [ ] `bun scripts/structure-audit/check-doc-references.ts --check` green
- [ ] `bun run lint` green
- [ ] `pr-quality` CI job green on Ubuntu
- [ ] Visual review: `SECURITY-INVARIANTS.md` I10 row matches the security-invariants test surface

Spec: `docs/superpowers/specs/2026-05-14-phase-5-t6-design.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: the PR URL is printed. Capture it and report it back to the user.

- [ ] **Step 8.4: Report the PR URL to the user**

Output the PR URL. No further action — the rest is review.

---

## Review disposition (Gemini CLI, 2026-05-14)

Source: [`2026-05-14-phase-5-t6-pr1-i10-helpers-review-feedback.md`](./2026-05-14-phase-5-t6-pr1-i10-helpers-review-feedback.md).

| Review § | Item | Disposition | Rationale & where in this plan |
| -------- | ---- | ----------- | ------------------------------ |
| 2.1 | Burn-cycle approach when lengths mismatch — masks the guess length, not the secret's length (reasoner agrees this is the standard pattern for ASCII pairing codes + opaque bearer tokens) | **NO ACTION** | Confirmation only. The plan already specifies this shape (Task 3 step 3.3's `constantTimeStringEqual` body + Task 2 step 2.1's `constantTimeStringEqual: returns false for different lengths` test). |
| 2.2 | Negative assertions ("file does NOT define a local helper") strongly prevent copy-paste regressions | **NO ACTION** | Confirmation only. Tests 5 + 6 in the I10 block already do this (Task 4 step 4.2). |
| 2.3 | Step 3.9 grep also covers `.md` / `.json` references, not just code | **FIX** | Step 3.9 now runs two greps: (a) repo-wide code search across all `packages/*/src` + `scripts` (expected: zero matches), and (b) doc/config search over `docs`, `.claude/commands`, `package.json` (expected: only the four named historical / spec / plan / review-feedback sites). Task 6 gains a new Step 6.5 that sweeps any other doc-side match into the same commit as the SECURITY-INVARIANTS.md update. Bare historical artefacts (dated review-feedback, closed roadmap entries) stay untouched — those are accurate at their date. |
| 3.1 | Naming consistency — file renamed, function name preserved to avoid caller churn | **NO ACTION** | Confirmation only. The plan locks this in Task 3 step 3.3 (file body keeps `sha256HexEqualConstantTime` export name verbatim) and Task 3 step 3.10's commit message ("Export name `sha256HexEqualConstantTime` stays so existing callers update import paths only"). |
| 4 | Overall approval — plan is ready to execute | **NO ACTION** | No change required. |

**Net effect on this plan:** Step 3.9 expanded into two scoped greps with explicit expected-match lists; Task 6 gains Step 6.5 (sweep extra doc-side matches into the same commit); Step 6.5 → Step 6.6 (commit step renumbered). Nothing in the TDD red/green flow, the file structure, or the task ordering changes.

## Self-review (run after writing this plan, before handing back)

**Spec coverage check** — every spec section maps to a task:

| T6 spec §2 PR 1 section | Task |
|---|---|
| Goal (one wiring site for I10) | Task 5 + Task 6 |
| Current state (4 sites; 2 already correct) | Task 1 step 1.5 (verifies) |
| Touchpoints: rename + add `constantTimeStringEqual` | Task 3 |
| Touchpoints: migrate `lan-pairing.ts` | Task 5 step 5.1 |
| Touchpoints: migrate `http-auth.ts` | Task 5 step 5.2 |
| Touchpoints: update `SECURITY-INVARIANTS.md` I10 row | Task 6 |
| Touchpoints: extend `security-invariants.test.ts` | Task 4 (whole new block, not just extend — see plan introduction) |
| Out of scope: new I-numbered invariants | Not added |
| Out of scope: rename existing helper name | `sha256HexEqualConstantTime` keeps its name (Task 3 step 3.3) |
| Out of scope: migrate verify-extensions / updater wiring (already correct) | Task 3 steps 3.4–3.5 update import paths only — no logic change |
| Exit criterion: zero local helpers outside util | Task 4 negative assertions enforce |
| Exit criterion: I10 row names one wiring site | Task 6 |
| Exit criterion: `bun run test:ci` green | Task 7 step 7.7 |

**Placeholder scan** — no "TBD", "TODO", "implement later", "similar to Task N", "Add appropriate X". Every code step shows the actual code. Every command step shows the exact command and expected output.

**Type / name consistency** — `sha256HexEqualConstantTime` named identically across Tasks 2, 3, 4, 6. `constantTimeStringEqual` named identically across Tasks 2, 3, 4, 5, 6. `util/timing-safe-compare.ts` path named identically across all tasks. The `read()` helper at `security-invariants.test.ts:9` is referenced only in Task 4 step 4.2 and matches the existing helper signature (no new helper introduced).
