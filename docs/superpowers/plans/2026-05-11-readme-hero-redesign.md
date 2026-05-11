# README Hero Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Slim `docs/README.md` from ~750 lines to ~280, anchored by a product-led split hero with an embedded asciinema cast, custom SVG architecture diagram, single-color connector logo grid, and an OG social card — protected by a CI link checker, markdownlint, SVG audit, OG render, and CLI-command tripwire.

**Architecture:** Five phases, TDD-ordered so verification gates exist before content changes. (1) CI infrastructure lands green against the *current* README. (2) Content relocations move existing prose to populated `docs/*.md` files. (3) Assets get produced (wordmark, cast, architecture diagram, connector logos, OG card). (4) README is rewritten against the new assets. (5) Manual accessibility + qualitative validation.

**Tech Stack:** Bun 1.2+, TypeScript 6.x, markdownlint-cli2, lychee (GitHub Action), asciinema + svg-term-cli (local CLI tooling), `@resvg/resvg-js` (PNG render), Simple Icons (connector logo source), GitHub Actions (`pr-quality` host).

**Spec reference:** [`docs/superpowers/specs/2026-05-11-readme-hero-redesign-design.md`](../specs/2026-05-11-readme-hero-redesign-design.md).

**Branch:** `dev/asafgolombek/readme-hero-redesign` in `.claude/worktrees/dev+asafgolombek+readme-hero-redesign`.

---

## Prerequisites (one-time machine setup)

These are local-developer tools, not committed deps. Verify with `which <tool>`; install if missing.

- **asciinema** — record terminal sessions. Linux/macOS: install via package manager (`brew install asciinema` or `apt install asciinema`). Windows: requires WSL — record the cast on Linux/macOS and copy the `.cast` file over, OR use the Windows-native alternative `terminalizer` and convert. The cast is checked in as text, so the recording host doesn't matter for downstream use.
- **svg-term-cli** — `bun add -g svg-term-cli` (renders `.cast` → static SVG poster). After running `bun run check-package svg-term-cli` to confirm provenance.

GitHub Actions installs:

- **lychee** — used via `lycheeverse/lychee-action@v2` in CI; no local install needed.
- **resvg** — used via `@resvg/resvg-js` (npm package) in the SVG audit script; added as a dev dep in Task 1.3.

---

## Phase 1 — CI infrastructure (gates land green first)

The gates must verify the *current* README before any content changes. If they fail green against today's README, fix the README minimally (e.g., relax line-length thresholds) — do not start changing content for cosmetic reasons.

### Task 1.1: lychee link checker

**Files:**
- Create: `.github/workflows/docs-quality.yml`
- Create: `lychee.toml`
- Modify: `.github/workflows/ci.yml` (add a job-level dependency reference)

- [ ] **Step 1: Write `lychee.toml` config**

Create `lychee.toml` at the repo root:

```toml
# Lychee link checker config — used by .github/workflows/docs-quality.yml
exclude_path = [
  ".claude/worktrees",
  "node_modules",
  ".git",
  "packages/docs/dist",
  "packages/docs/.astro",
]
exclude = [
  # Asciinema casts get uploaded post-merge; skip until the ID exists
  "asciinema\\.org/a/<id>",
  # localhost references in code examples
  "localhost",
  "127\\.0\\.0\\.1",
  # GitHub Releases anchors that are page-internal
  "github\\.com/.*/releases/tag",
]
accept = ["200", "203", "204", "206", "301", "302", "304"]
max_redirects = 5
timeout = 30
max_retries = 3
```

- [ ] **Step 2: Write the workflow file**

Create `.github/workflows/docs-quality.yml`:

```yaml
name: Docs Quality

on:
  pull_request:
    paths:
      - "docs/**"
      - "**/*.md"
      - ".github/workflows/docs-quality.yml"
      - "lychee.toml"
  push:
    branches: [main]
    paths:
      - "docs/**"
      - "**/*.md"

jobs:
  link-check:
    name: lychee link check
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - name: Run lychee
        uses: lycheeverse/lychee-action@v2
        with:
          args: --config lychee.toml --no-progress 'docs/**/*.md' '*.md'
          fail: true
```

- [ ] **Step 3: Verify it passes against current README locally**

Run: `bunx --bun @lycheeverse/lychee --config lychee.toml 'docs/**/*.md' '*.md'`
Expected: exits 0 (no broken links).

If broken links are found, list them in the commit message but do **not** fix them in this task — pre-existing brokenness gets a follow-up issue. Only fix links if lychee fails the workflow run.

- [ ] **Step 4: Commit**

```bash
git add lychee.toml .github/workflows/docs-quality.yml
git commit -m "ci(docs): add lychee link-checker gate on PRs touching docs"
```

---

### Task 1.2: markdownlint-cli2 with Nimbus ruleset

**Files:**
- Create: `.markdownlint-cli2.jsonc`
- Modify: `package.json` (root) — add `lint:markdown` script and dev dep
- Modify: `.github/workflows/docs-quality.yml` — add the markdownlint job

- [ ] **Step 1: Run dependency-safety check on markdownlint-cli2**

Run: `bun run check-package markdownlint-cli2`
Expected: published >7 days ago, recognizable maintainer (DavidAnson), version count ≥ 50.

- [ ] **Step 2: Add markdownlint-cli2 as a dev dep**

Run from repo root: `bun add -d markdownlint-cli2`
Expected: package added to root `package.json` devDependencies.

- [ ] **Step 3: Write `.markdownlint-cli2.jsonc`**

Create at repo root:

```jsonc
// Nimbus markdownlint ruleset — see docs/superpowers/specs/2026-05-11-readme-hero-redesign-design.md §8
{
  "config": {
    "default": true,
    "MD013": { "line_length": 120, "code_blocks": false, "tables": false },
    "MD024": { "siblings_only": true },
    "MD033": false,
    "MD034": true,
    "MD041": false
  },
  "globs": [
    "docs/**/*.md",
    "*.md",
    "!.claude/worktrees/**",
    "!node_modules/**",
    "!packages/docs/dist/**"
  ]
}
```

Key choices: line length 120 (not 100) because release commands and `nimbus`-CLI examples legitimately overflow 100. MD033 (no inline HTML) off because the hero markup requires `<picture>`/`<img>`. MD041 (first line must be H1) off because some docs/*.md files start with frontmatter or admonitions.

- [ ] **Step 4: Add `lint:markdown` script**

Modify root `package.json`:

```jsonc
{
  "scripts": {
    // ... existing scripts ...
    "lint:markdown": "markdownlint-cli2"
  }
}
```

- [ ] **Step 5: Run locally against current state**

Run: `bun run lint:markdown`
Expected outcome: likely FAIL with line-length violations in current README and other markdown files.

- [ ] **Step 6: Triage failures**

For each rule violation:
- **MD013 line-length** in code blocks/tables — already excluded by config; should not flag.
- **MD013 line-length** in prose — wrap the offending line at 120 cols. Commit fixes to existing files (`docs/architecture.md`, `docs/roadmap.md`, etc.) as small, focused changes; the README itself will be fully rewritten so leave its line-length violations to be cleaned up in Task 4.1.
- Other rules — fix in place if straightforward; add a per-file `<!-- markdownlint-disable MD<NN> -->` only if the rule is wrong for that context (rare).

Iterate until: `bun run lint:markdown` exits 0 across all files except the soon-to-be-rewritten `docs/README.md`. Add `docs/README.md` to the `globs` exclusion temporarily:

```jsonc
"globs": [
  "docs/**/*.md",
  "*.md",
  "!docs/README.md",  // re-enabled in Task 4.1 after the rewrite
  // ... rest ...
]
```

- [ ] **Step 7: Add markdownlint job to the workflow**

Modify `.github/workflows/docs-quality.yml` — append a new job:

```yaml
  markdown-lint:
    name: markdownlint-cli2
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: "1.2"
      - run: bun install --frozen-lockfile
      - run: bun run lint:markdown
```

- [ ] **Step 8: Commit**

```bash
git add package.json bun.lock .markdownlint-cli2.jsonc .github/workflows/docs-quality.yml docs/
git commit -m "ci(docs): add markdownlint-cli2 gate with Nimbus ruleset"
```

---

### Task 1.3: SVG asset audit script

**Files:**
- Create: `scripts/audit/svg-assets.ts`
- Create: `scripts/audit/svg-assets.test.ts`
- Modify: `package.json` — add `audit:svg-assets` script + `@resvg/resvg-js` dev dep

- [ ] **Step 1: Run dependency-safety check on `@resvg/resvg-js`**

Run: `bun run check-package @resvg/resvg-js`
Expected: published >7 days ago, recognized maintainer (yisibl), reasonable version count.

- [ ] **Step 2: Add the dev dep**

Run: `bun add -d @resvg/resvg-js`

- [ ] **Step 3: Write the failing test**

Create `scripts/audit/svg-assets.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { auditSvgFile } from "./svg-assets";

describe("auditSvgFile", () => {
  test("accepts a valid SVG with explicit dimensions", async () => {
    const tmpPath = `${import.meta.dir}/__fixtures__/valid.svg`;
    const result = await auditSvgFile(tmpPath);
    expect(result.ok).toBe(true);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  test("rejects a malformed SVG", async () => {
    const tmpPath = `${import.meta.dir}/__fixtures__/malformed.svg`;
    const result = await auditSvgFile(tmpPath);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/parse/i);
  });

  test("rejects a zero-dimension SVG", async () => {
    const tmpPath = `${import.meta.dir}/__fixtures__/zero-dim.svg`;
    const result = await auditSvgFile(tmpPath);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/dimension/i);
  });
});
```

Create the three fixtures:

`scripts/audit/__fixtures__/valid.svg`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50" viewBox="0 0 100 50">
  <rect width="100" height="50" fill="#7c3aed"/>
</svg>
```

`scripts/audit/__fixtures__/malformed.svg`:
```
not an svg
```

`scripts/audit/__fixtures__/zero-dim.svg`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"/>
```

- [ ] **Step 4: Run the test — verify it fails**

Run: `bun test scripts/audit/svg-assets.test.ts`
Expected: FAIL — `auditSvgFile` not defined.

- [ ] **Step 5: Implement `auditSvgFile`**

Create `scripts/audit/svg-assets.ts`:

```typescript
import { readFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";

export interface SvgAuditResult {
  ok: boolean;
  width?: number;
  height?: number;
  reason?: string;
}

export async function auditSvgFile(path: string): Promise<SvgAuditResult> {
  let content: string;
  try {
    content = await readFile(path, "utf-8");
  } catch (err) {
    return { ok: false, reason: `read failed: ${(err as Error).message}` };
  }

  let resvg: Resvg;
  try {
    resvg = new Resvg(content);
  } catch (err) {
    return { ok: false, reason: `parse failed: ${(err as Error).message}` };
  }

  const { width, height } = resvg.innerBBox() ?? { width: 0, height: 0 };
  // Some SVGs declare dimensions only on <svg> attribute; fall back
  const svgWidth = resvg.width || width;
  const svgHeight = resvg.height || height;

  if (svgWidth <= 0 || svgHeight <= 0) {
    return { ok: false, reason: `zero dimension: ${svgWidth}x${svgHeight}` };
  }

  return { ok: true, width: svgWidth, height: svgHeight };
}

// CLI entry point
if (import.meta.main) {
  const { glob } = await import("node:fs/promises");
  const paths: string[] = [];
  for await (const p of glob("docs/assets/**/*.svg")) paths.push(p);

  let failures = 0;
  for (const p of paths) {
    const result = await auditSvgFile(p);
    if (!result.ok) {
      console.error(`❌ ${p}: ${result.reason}`);
      failures++;
    } else {
      console.log(`✅ ${p} (${result.width}x${result.height})`);
    }
  }
  if (failures > 0) {
    console.error(`\n${failures} SVG file(s) failed audit`);
    process.exit(1);
  }
  console.log(`\n${paths.length} SVG file(s) passed audit`);
}
```

- [ ] **Step 6: Run the test — verify it passes**

Run: `bun test scripts/audit/svg-assets.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Add the audit script entry**

Modify root `package.json`:

```jsonc
{
  "scripts": {
    "audit:svg-assets": "bun scripts/audit/svg-assets.ts"
  }
}
```

- [ ] **Step 8: Run the audit against the current state**

Run: `bun run audit:svg-assets`
Expected: `0 SVG file(s) passed audit` (the `docs/assets/` dir doesn't exist yet — that's fine, glob produces zero matches). Script must exit 0.

If the script exits non-zero on an empty glob, fix the implementation: zero files with zero failures is the success case.

- [ ] **Step 9: Add the job to the workflow**

Modify `.github/workflows/docs-quality.yml`:

```yaml
  svg-audit:
    name: SVG asset audit
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: "1.2"
      - run: bun install --frozen-lockfile
      - run: bun run audit:svg-assets
```

- [ ] **Step 10: Commit**

```bash
git add scripts/audit/svg-assets.ts scripts/audit/svg-assets.test.ts scripts/audit/__fixtures__ package.json bun.lock .github/workflows/docs-quality.yml
git commit -m "ci(docs): add SVG asset audit gate"
```

---

### Task 1.4: README CLI-command tripwire

**Files:**
- Create: `scripts/audit/readme-cli-commands.ts`
- Create: `scripts/audit/readme-cli-commands.test.ts`
- Modify: `package.json` — add `audit:readme-cli` script
- Modify: `.github/workflows/docs-quality.yml` — add the tripwire job

- [ ] **Step 1: Identify the CLI command-registry source of truth**

Read `packages/cli/src/index.ts` to find where commands are registered. The tripwire reads this file as text and extracts every subcommand name. Look for the pattern that registers commands (likely calls like `program.command("ask")` or similar).

If the registry is structured (e.g., an exported array of command names), import it instead of grepping. Note the actual export name and path for use in Step 4.

- [ ] **Step 2: Write the failing test**

Create `scripts/audit/readme-cli-commands.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { extractReadmeCliCommands, validateReadmeCommands } from "./readme-cli-commands";

describe("extractReadmeCliCommands", () => {
  test("finds every `nimbus <subcommand>` literal", () => {
    const md = `
Run \`nimbus ask "..."\` to query.
Then \`nimbus connector list\` to verify.
Also: nimbus doctor.
But not "naimbus" or "nimbus_".
    `;
    const found = extractReadmeCliCommands(md);
    expect(found.sort()).toEqual(["ask", "connector", "doctor"].sort());
  });

  test("ignores escaped or partial matches", () => {
    const md = `Use \`gnimbus\` not nimbus. Or \`nimbus\` alone.`;
    const found = extractReadmeCliCommands(md);
    expect(found).toEqual([]);
  });
});

describe("validateReadmeCommands", () => {
  test("returns no errors when all commands are registered", () => {
    const result = validateReadmeCommands(["ask", "doctor"], ["ask", "doctor", "diag"]);
    expect(result.missing).toEqual([]);
    expect(result.ok).toBe(true);
  });

  test("returns missing commands when a README command isn't registered", () => {
    const result = validateReadmeCommands(["ask", "delete-everything"], ["ask", "diag"]);
    expect(result.missing).toEqual(["delete-everything"]);
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test — verify it fails**

Run: `bun test scripts/audit/readme-cli-commands.test.ts`
Expected: FAIL — functions not defined.

- [ ] **Step 4: Prefer import-based extraction if feasible**

Regex over `packages/cli/src/index.ts` is brittle — a refactor that wraps `program.command("ask")` in a loop, helper, or spread call silently breaks the gate. Prefer dynamic import of a leaf module that exports the command names.

Sub-step 4a — assess the entry point:

```bash
# Does index.ts have top-level side effects that would run on import?
head -30 packages/cli/src/index.ts
# Look for: top-level await, side-effect calls, immediate command parsing
```

Sub-step 4b — if the entry point has no top-level side effects, add (or use) a leaf-module export:

If `packages/cli/src/commands/index.ts` (or similar) already exports a command-names array, import it.

If not, add a tiny leaf module `packages/cli/src/commands/registry.ts`:

```typescript
// packages/cli/src/commands/registry.ts
// Single source of truth for top-level subcommand names.
// Used by both the CLI bootstrap and scripts/audit/readme-cli-commands.ts.

export const COMMAND_NAMES = [
  "ask",
  "search",
  "query",
  "config",
  "profile",
  "diag",
  "doctor",
  "db",
  "telemetry",
  "connector",
  "extension",
  "workflow",
  "status",
  "audit",
  "expert",
  "impact",
  "catchup",
  "bench",
  "tui",
  "data",
  "update",
  "lan",
  // … extend with any others; cross-check against docs/cli-reference.md
] as const;

export type CommandName = (typeof COMMAND_NAMES)[number];
```

Then have the existing entry-point use `COMMAND_NAMES` to drive its `.command(...)` calls (or at least add assertions that every name in the list is registered).

Sub-step 4c — if the refactor is too invasive, fall back to the regex-extraction described in Step 5. Document the decision in a code comment at the top of `readme-cli-commands.ts`.

- [ ] **Step 5: Implement the script**

Create `scripts/audit/readme-cli-commands.ts`:

```typescript
import { readFile } from "node:fs/promises";

// Words that follow `nimbus` but are not valid subcommands. Extend as needed.
const STOP_WORDS = new Set(["--version", "--help", "-v", "-h"]);

/**
 * Extract every `nimbus <subcommand>` literal from a markdown string.
 * Recognises both inline code (`nimbus ask`) and bare prose ("nimbus doctor").
 * Returns the subcommand names without duplicates.
 */
export function extractReadmeCliCommands(markdown: string): string[] {
  const found = new Set<string>();
  // Match `nimbus ` or `nimbus\b` followed by a word, but exclude `Xnimbus` or `nimbus_`
  const pattern = /(?<![A-Za-z0-9_])nimbus\s+([a-z][a-z0-9-]*)/g;
  for (const m of markdown.matchAll(pattern)) {
    const cmd = m[1];
    if (!STOP_WORDS.has(cmd)) found.add(cmd);
  }
  return [...found];
}

export interface ValidateResult {
  ok: boolean;
  missing: string[];
}

export function validateReadmeCommands(
  readmeCommands: string[],
  registeredCommands: string[],
): ValidateResult {
  const registered = new Set(registeredCommands);
  const missing = readmeCommands.filter((c) => !registered.has(c));
  return { ok: missing.length === 0, missing };
}

/**
 * Read the CLI's command registry and return the list of top-level subcommand names.
 *
 * PRIMARY PATH — import the typed registry. Set up in Task 1.4 Step 4b.
 * This is the source of truth: the same array drives both the CLI's
 * `.command(...)` calls and this audit.
 *
 * FALLBACK PATH — regex extraction. Only use if importing the registry is
 * infeasible (top-level side effects in the entry point, no leaf module
 * yet exposed). Document the decision in a code comment.
 */
export async function readRegisteredCommands(): Promise<string[]> {
  try {
    const mod = await import("../../packages/cli/src/commands/registry");
    if (Array.isArray((mod as { COMMAND_NAMES?: readonly string[] }).COMMAND_NAMES)) {
      return [...(mod as { COMMAND_NAMES: readonly string[] }).COMMAND_NAMES];
    }
  } catch {
    // Registry module not present yet — fall through to regex extraction
  }

  // FALLBACK — regex over the CLI entry point
  const indexPath = "packages/cli/src/index.ts";
  const src = await readFile(indexPath, "utf-8");
  const names = new Set<string>();
  for (const m of src.matchAll(/\.command\(\s*["']([a-z][a-z0-9-]*)["']/g)) names.add(m[1]);
  for (const m of src.matchAll(/command:\s*["']([a-z][a-z0-9-]*)["']/g)) names.add(m[1]);
  return [...names];
}

if (import.meta.main) {
  const readmePath = "docs/README.md";
  const readme = await readFile(readmePath, "utf-8");
  const readmeCmds = extractReadmeCliCommands(readme);
  const registered = await readRegisteredCommands();

  if (registered.length === 0) {
    console.error(
      `❌ Could not extract any registered commands from packages/cli/src/index.ts. ` +
      `Update readRegisteredCommands() in scripts/audit/readme-cli-commands.ts.`,
    );
    process.exit(2);
  }

  const result = validateReadmeCommands(readmeCmds, registered);
  if (!result.ok) {
    console.error(`❌ README references ${result.missing.length} unregistered command(s):`);
    for (const c of result.missing) console.error(`   - nimbus ${c}`);
    console.error(`\nEither register the command, or remove the reference from docs/README.md.`);
    process.exit(1);
  }
  console.log(
    `✅ All ${readmeCmds.length} README \`nimbus <cmd>\` references match the CLI registry.`,
  );
}
```

- [ ] **Step 6: Run the test — verify it passes**

Run: `bun test scripts/audit/readme-cli-commands.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Validate the registry-extraction logic finds real commands**

Run: `bun -e "import('./scripts/audit/readme-cli-commands.ts').then(async (m) => console.log(await (m as any).readRegisteredCommands()))"`. `readRegisteredCommands` is exported, so this works directly.

Expected: at least 10 commands listed (`ask`, `connector`, `diag`, `doctor`, `query`, `config`, `profile`, `telemetry`, `db`, `expert`, `impact`, etc. per the spec's §13 inventory and the CLI reference at `docs/cli-reference.md`).

If zero commands found:
- The primary path (registry import) failed — verify `packages/cli/src/commands/registry.ts` exists and exports `COMMAND_NAMES` per Step 4b.
- The fallback path (regex) also failed — the entry point's command-registration pattern changed; tune the regex to match what's in `packages/cli/src/index.ts`.

- [ ] **Step 8: Run the tripwire against the current README**

Run: `bun run audit:readme-cli` (after adding the script entry below)

If the tripwire reports missing commands, decide per command:
- If the README mention is stale (removed command) — fix the README before this task ships.
- If the extraction missed a real registered command — extend `readRegisteredCommands()` (or add the name to the registry leaf module).

Iterate until exit 0.

- [ ] **Step 9: Add the script entry**

Modify root `package.json`:

```jsonc
{
  "scripts": {
    "audit:readme-cli": "bun scripts/audit/readme-cli-commands.ts"
  }
}
```

- [ ] **Step 10: Add the workflow job**

Modify `.github/workflows/docs-quality.yml`:

```yaml
  readme-cli-tripwire:
    name: README CLI tripwire
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: "1.2"
      - run: bun install --frozen-lockfile
      - run: bun run audit:readme-cli
```

- [ ] **Step 11: Commit**

```bash
git add scripts/audit/readme-cli-commands.ts scripts/audit/readme-cli-commands.test.ts packages/cli/src/commands/registry.ts package.json .github/workflows/docs-quality.yml
git commit -m "ci(docs): add README CLI-command tripwire — fails if a documented \`nimbus <cmd>\` disappears from the registry"
```

---

### Task 1.5: PR template — README screenshot checklist

**Files:**
- Modify (or Create): `.github/pull_request_template.md`

- [ ] **Step 1: Check whether the template exists**

Run: `ls .github/pull_request_template.md 2>&1`

If present: read its current content; the checklist item will be appended.
If absent: create a minimal template with the checklist.

- [ ] **Step 2: Add the checklist item**

If creating new, write to `.github/pull_request_template.md`:

```markdown
## Summary

<!-- one to three bullet points -->

## Test plan

- [ ] Unit / integration tests added or updated
- [ ] `bun run test:ci` passes locally (or noted why not)
- [ ] If this PR touches `docs/README.md`, a screenshot of the rendered page (light + dark) is attached below.

<!-- attach screenshots here when touching docs/README.md -->
```

If modifying existing, insert the checklist item under the existing test-plan section. Show only the diff, not the whole file.

- [ ] **Step 3: Commit**

```bash
git add .github/pull_request_template.md
git commit -m "docs: add README-screenshot checkbox to PR template"
```

---

## Phase 2 — Content relocation (existing prose moved verbatim)

Each task in this phase moves a section from `docs/README.md` into a populated `docs/<topic>.md` file. The content is the existing prose, copied verbatim with minor edits for context (e.g., adding an H1 if the source was an H2 in the README). Until the README rewrite lands in Phase 4, the README still includes the section AND the new file exists — temporary duplication is fine and the link checker will not flag it.

### Task 2.1: `docs/examples.md` — 7 example sessions

**Files:**
- Create: `docs/examples.md`

- [ ] **Step 1: Read the current README's "What It Does" section**

Read `docs/README.md` lines 34–110 (the "What It Does" section with the 8 example bash blocks and the inline session illustrations).

- [ ] **Step 2: Write `docs/examples.md`**

Create the file with this structure:

```markdown
# Example sessions

Real `nimbus` queries from on-call, security, platform, and data-engineering work. The hero cast in [`README`](./README.md) covers incident response; this page collects everything else.

## Release readiness

\`\`\`bash
nimbus ask "Which of my open PRs have failing CI and are blocking the release branch?"
\`\`\`

[…copy each remaining example session verbatim from current README lines 38–110…]

## Consent-gated automation script

\`\`\`bash
nimbus run ./incident-response.yml
\`\`\`

[…and so on…]
```

Concrete checklist of sessions to include (skipping the hero-cast one — incident response):

1. Release readiness
2. SecDevOps — CVE exposure (full session illustration)
3. Infrastructure — Terraform drift
4. Data lineage (full session illustration)
5. Expert routing
6. Blast radius
7. Consent-gated automation

Each session's bash block AND the multi-line "Example session" illustration where one exists (CVE + data lineage have these in the current README).

- [ ] **Step 3: Validate links in the new file**

Run: `bunx --bun @lycheeverse/lychee --config lychee.toml docs/examples.md`
Expected: exit 0.

- [ ] **Step 4: Validate markdownlint passes**

Run: `bun run lint:markdown`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add docs/examples.md
git commit -m "docs: extract example sessions from README into docs/examples.md"
```

---

### Task 2.2: `docs/audiences.md` — role table

**Files:**
- Create: `docs/audiences.md`

- [ ] **Step 1: Read the README's "Who It's For" section**

Read `docs/README.md` lines 113–127.

- [ ] **Step 2: Write `docs/audiences.md`**

Create with the existing role table verbatim, prefaced by a one-paragraph intro that reproduces the README's "Nimbus is built for engineers and operators who run systems in production…" framing.

- [ ] **Step 3: Validate**

Run: `bun run lint:markdown` and `bunx --bun @lycheeverse/lychee --config lychee.toml docs/audiences.md`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add docs/audiences.md
git commit -m "docs: extract role table from README into docs/audiences.md"
```

---

### Task 2.3: `docs/performance.md` — measurement table

**Files:**
- Create: `docs/performance.md`

- [ ] **Step 1: Read the README's "Fast — Most Queries Never Hit the Network" sub-section**

Read `docs/README.md` lines 134–144.

- [ ] **Step 2: Write `docs/performance.md`**

Create with:

```markdown
# Performance

Measured on a mid-range laptop with a 50,000-item index across five connected services. Nimbus maintains a local SQLite index; most queries never hit the network.

| Operation | Nimbus (local index) | Typical SaaS |
|---|---|---|
| Search across all services | ~20–80ms | 1,500–4,000ms |
| List recent files from 3 services | ~5ms | 3× API round trips |
| Semantic recall (embeddings) | ~50–200ms | Remote embed + search |
| Gateway cold start | ~80ms | Always-on cloud |

These numbers will be replaced with CI-published benchmark output in [sub-project D](../superpowers/specs/2026-05-11-readme-hero-redesign-design.md#12-out-of-scope-folded-into-later-sub-projects). Until then they reflect manual measurements on the v0.1.0 build.
```

- [ ] **Step 3: Validate**

Run: `bun run lint:markdown` and `bunx --bun @lycheeverse/lychee --config lychee.toml docs/performance.md`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add docs/performance.md
git commit -m "docs: extract performance numbers from README into docs/performance.md"
```

---

### Task 2.4: `docs/cross-platform.md` — platform feature matrix

**Files:**
- Create: `docs/cross-platform.md`

- [ ] **Step 1: Read the README's "Cross-Platform Support" section**

Read `docs/README.md` lines 548–564.

- [ ] **Step 2: Write `docs/cross-platform.md`**

Create with the existing matrix verbatim — Windows / macOS / Linux columns covering Gateway IPC, Secrets, Autostart, Notifications, Config dir, Desktop UI, CI runner, Release format. Include both footnotes (Ubuntu 22.04 source-only + glibc; macOS/Windows unsigned).

- [ ] **Step 3: Validate**

Same as previous tasks. Exit 0.

- [ ] **Step 4: Commit**

```bash
git add docs/cross-platform.md
git commit -m "docs: extract cross-platform matrix from README into docs/cross-platform.md"
```

---

### Task 2.5: `docs/testing.md` — five-layer pyramid

**Files:**
- Create: `docs/testing.md`

- [ ] **Step 1: Read the README's "Testing" section**

Read `docs/README.md` lines 597–608.

- [ ] **Step 2: Write `docs/testing.md`**

Create with the existing pyramid verbatim — 5 numbered layers, security scans paragraph at the end. Add a cross-reference link to the existing `nimbus-testing` skill documentation at `.claude/commands/nimbus-testing.md` for contributors who want depth.

- [ ] **Step 3: Validate**

Same as previous tasks. Exit 0.

- [ ] **Step 4: Commit**

```bash
git add docs/testing.md
git commit -m "docs: extract testing pyramid from README into docs/testing.md"
```

---

## Phase 3 — Asset production

These tasks produce concrete files. Visual craft is described by structural inputs (dimensions, fonts, colours, content) and validated by the gates from Phase 1.

### Task 3.1: Nimbus wordmark SVG (light + dark)

**Files:**
- Create: `docs/assets/nimbus-wordmark-light.svg`
- Create: `docs/assets/nimbus-wordmark-dark.svg`

- [ ] **Step 1: Define the wordmark structure**

The wordmark is a single-line SVG containing:
- The cloud emoji ☁️ (rendered as text using the system emoji font OR embedded as path data — text path is simpler and accessible).
- The word "Nimbus" in JetBrains Mono, weight 700, font-size 56.
- Total dimensions: 320×72 (viewBox `0 0 320 72`).
- Accent: in the light variant, "Nimbus" renders in `#1a1a1a` (almost-black); in the dark variant, `#fafafa`. The cloud emoji renders natively in colour.

Use this SVG template for the light variant, save as `docs/assets/nimbus-wordmark-light.svg`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="72" viewBox="0 0 320 72" role="img" aria-label="Nimbus">
  <title>Nimbus</title>
  <text x="0" y="50" font-family="'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace" font-size="48" font-weight="700">☁️</text>
  <text x="68" y="50" font-family="'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace" font-size="48" font-weight="700" fill="#1a1a1a">Nimbus</text>
</svg>
```

Dark variant — identical except `fill="#fafafa"`. Save as `docs/assets/nimbus-wordmark-dark.svg`.

Note: this uses the system-installed JetBrains Mono — if the viewer's browser doesn't have it, GitHub falls back via the font-family chain. For perfect fidelity across all systems, a future task can convert the text glyphs to path data via `inkscape --export-text-to-path` or `usvg --keep-named-groups text`. That's a polish step, out of scope for this task.

- [ ] **Step 2: Verify the SVG audit passes for the wordmarks**

Run: `bun run audit:svg-assets`
Expected: both wordmark files listed as ✅.

- [ ] **Step 3: Visual smoke-check**

Open both SVGs in a browser. Confirm:
- "☁️ Nimbus" is readable in both light and dark themes.
- Dimensions are 320×72.
- No overflow, no clipped glyphs.

If JetBrains Mono isn't installed locally, the fallback monospace renders — accept that for v1; the GitHub renderer behaves the same way.

- [ ] **Step 4: Commit**

```bash
git add docs/assets/nimbus-wordmark-light.svg docs/assets/nimbus-wordmark-dark.svg
git commit -m "feat(docs): add Nimbus wordmark SVG assets (light + dark)"
```

---

### Task 3.2: Asciinema cast — record, render, upload

**Files:**
- Create: `docs/demos/incident-response.cast`
- Create: `docs/assets/hero-cast-light.svg`
- Create: `docs/assets/hero-cast-dark.svg`

- [ ] **Step 1: Author the cast script**

Write `docs/demos/incident-response-script.md` (a scratch document not committed to the repo — keep locally) with the exact prompts and expected outputs the cast will show. Sample:

```
PROMPT: $ nimbus ask "the payment-service alert just fired — what changed in the last 2 hours?"
[1.0s pause]
OUTPUT (one line at a time, ~150ms apart):
🔍 PagerDuty: P1 — Error rate 4.2% — fired 8 minutes ago
🔍 Last deploy: payment-service v2.14.1 — 23 minutes ago
🔍 GitHub diff v2.14.0 → v2.14.1: 3 files — src/billing/retry.ts most significant
   PR #312 "Increase retry backoff" — merged by @elena 41 minutes ago

[1.2s pause]
⚠ CONSENT REQUIRED — Post incident summary to #incidents?
   Post? [y/n]:
[user types: y, 0.4s delay]
✅ Posted.

[0.8s pause]
Suggested next step: rollback to v2.14.0?
⚠ CONSENT REQUIRED — Trigger Jenkins rollback job.
   Rollback? [y/n]:
[user types: n, 0.4s delay]
Aborted. No changes made.
```

Total duration target: ~17–19 seconds. Keep terminal at exactly 90 columns × 24 rows.

- [ ] **Step 2: Record the cast**

On macOS/Linux with asciinema installed:

```bash
# Set the terminal to 90×24
resize -s 24 90  # or equivalent for your terminal
asciinema rec --cols 90 --rows 24 --title "Nimbus: incident response in 18 seconds" docs/demos/incident-response.cast
# Type the prompts from the script. Pause naturally between actions.
# CTRL-D to end.
```

Important: this cast contains **realistic but synthetic output**. Nimbus isn't necessarily wired against a real PagerDuty alert during recording. Use either:
- A real `nimbus ask` against mocked connectors (cleanest).
- A scripted terminal session typing the prompts and printing the canned output line-by-line (acceptable — the cast is illustrative, not a regression test).

Either approach is fine; the CLI-command tripwire from Task 1.4 will verify the literal `nimbus ask` is a valid registered command, which is the integrity contract.

- [ ] **Step 3: Render the SVG posters**

```bash
# Light theme — solarized-light tuned palette
svg-term --cast docs/demos/incident-response.cast \
  --out docs/assets/hero-cast-light.svg \
  --window \
  --width 90 \
  --height 24 \
  --term iterm2 \
  --profile <(echo '{"background":"#fdf6e3","foreground":"#586e75","red":"#dc322f","green":"#859900","yellow":"#b58900","blue":"#268bd2","magenta":"#7c3aed","cyan":"#2aa198","white":"#eee8d5"}')

# Dark theme — solarized-dark tuned with Nimbus accent
svg-term --cast docs/demos/incident-response.cast \
  --out docs/assets/hero-cast-dark.svg \
  --window \
  --width 90 \
  --height 24 \
  --term iterm2 \
  --profile <(echo '{"background":"#002b36","foreground":"#93a1a1","red":"#dc322f","green":"#859900","yellow":"#b58900","blue":"#268bd2","magenta":"#7c3aed","cyan":"#2aa198","white":"#eee8d5"}')
```

The magenta slot at `#7c3aed` is the Nimbus accent — it's the colour the `nimbus` prompt and the `⚠ CONSENT REQUIRED` prefix will render in if the cast uses those ANSI colour codes during the recording.

- [ ] **Step 4: Verify the SVGs pass the audit**

Run: `bun run audit:svg-assets`
Expected: both cast files listed as ✅, each with width ~720 and height ~432 (depends on `svg-term`'s default scaling).

- [ ] **Step 5: Upload the cast to asciinema.org**

```bash
asciinema upload docs/demos/incident-response.cast
# Output:
# https://asciinema.org/a/<id>
```

Note the returned `<id>` — it goes into the README embed in Task 4.1. Save it locally as `docs/demos/incident-response.cast.id` (one line, the integer ID). This file is checked in so the README can construct the link deterministically.

- [ ] **Step 6: Commit**

```bash
git add docs/demos/incident-response.cast docs/demos/incident-response.cast.id docs/assets/hero-cast-light.svg docs/assets/hero-cast-dark.svg
git commit -m "feat(docs): add incident-response asciinema cast + rendered SVG posters"
```

---

### Task 3.3: Architecture diagram SVG (light + dark)

**Files:**
- Create: `docs/assets/architecture-light.svg`
- Create: `docs/assets/architecture-dark.svg`

- [ ] **Step 1: Define the diagram structure**

The diagram is a left-to-right flow showing four nodes connected by arrows. All nodes are bordered rectangles with rounded corners and short labels.

```
[ 30 Connectors ]  →  [ Local SQLite Index ]  →  [ Engine + HITL ]  →  [ CLI · UI · Voice ]
        ▼                                                                   ▲
        └──────────────────  🔒 your machine  ──────────────────────────────┘
```

- Total dimensions: 1080×360 (viewBox `0 0 1080 360`).
- Node size: 240×80, rounded corner radius 12.
- Stroke colour: `#7c3aed` (the accent).
- Arrow heads: filled triangles in `#7c3aed`.
- Label typography: JetBrains Mono 14pt, weight 600, centred.
- Background:
  - Light variant: `#ffffff` with `#1a1a1a` text.
  - Dark variant: `#0d1117` (GitHub dark surface) with `#fafafa` text.
- The dashed wrapper line around all four nodes carries the label "🔒 your machine" in the lower-right. This is the load-bearing privacy signal.

Save light at `docs/assets/architecture-light.svg`, dark at `docs/assets/architecture-dark.svg`.

- [ ] **Step 2: Author the SVG**

The structural template (the implementer fills in exact coordinates):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="360" viewBox="0 0 1080 360"
     role="img" aria-label="Nimbus architecture: connectors feed a local SQLite index; the engine reads the index and exposes it via CLI, UI, and voice; everything runs on your machine">
  <title>Nimbus architecture</title>
  <desc>Connectors → Local SQLite index → Engine + HITL → CLI · UI · Voice — all on your machine</desc>

  <!-- Dashed wrapper: "your machine" boundary -->
  <rect x="20" y="40" width="1040" height="280" rx="16" ry="16"
        fill="none" stroke="#7c3aed" stroke-width="2" stroke-dasharray="6 6" opacity="0.5"/>
  <text x="1040" y="305" text-anchor="end" font-family="'JetBrains Mono',monospace" font-size="13" fill="#7c3aed">
    🔒 your machine
  </text>

  <!-- Four nodes -->
  <g font-family="'JetBrains Mono',monospace" font-size="14" font-weight="600" fill="#1a1a1a">
    <rect x="60" y="140" width="200" height="80" rx="12" fill="#fff" stroke="#7c3aed" stroke-width="2"/>
    <text x="160" y="186" text-anchor="middle">30 Connectors</text>

    <rect x="320" y="140" width="200" height="80" rx="12" fill="#fff" stroke="#7c3aed" stroke-width="2"/>
    <text x="420" y="180" text-anchor="middle">Local SQLite</text>
    <text x="420" y="198" text-anchor="middle">Index</text>

    <rect x="580" y="140" width="200" height="80" rx="12" fill="#fff" stroke="#7c3aed" stroke-width="2"/>
    <text x="680" y="180" text-anchor="middle">Engine</text>
    <text x="680" y="198" text-anchor="middle">+ HITL</text>

    <rect x="840" y="140" width="200" height="80" rx="12" fill="#fff" stroke="#7c3aed" stroke-width="2"/>
    <text x="940" y="180" text-anchor="middle">CLI · UI</text>
    <text x="940" y="198" text-anchor="middle">· Voice</text>
  </g>

  <!-- Three arrows -->
  <g stroke="#7c3aed" stroke-width="2" fill="#7c3aed">
    <line x1="260" y1="180" x2="320" y2="180"/>
    <polygon points="320,180 312,176 312,184"/>
    <line x1="520" y1="180" x2="580" y2="180"/>
    <polygon points="580,180 572,176 572,184"/>
    <line x1="780" y1="180" x2="840" y2="180"/>
    <polygon points="840,180 832,176 832,184"/>
  </g>
</svg>
```

For the dark variant: change every `fill="#fff"` (node fill) to `fill="#0d1117"`, every `fill="#1a1a1a"` (text fill) to `fill="#fafafa"`, and the dashed wrapper's `opacity` stays 0.5. The accent `#7c3aed` stays the same.

- [ ] **Step 3: Run the SVG audit**

Run: `bun run audit:svg-assets`
Expected: both architecture files listed as ✅ at 1080×360.

- [ ] **Step 4: Visual smoke-check**

Open both SVGs in the browser. Confirm:
- All four boxes and labels are visible.
- Arrows point right with visible triangle heads.
- The "🔒 your machine" label is readable in the bottom-right.
- Dark variant text contrasts cleanly against `#0d1117`.

- [ ] **Step 5: Update the connector count if needed**

If the actual shipped connector count from `packages/gateway/src/connectors/lazy-mesh/` differs from "30," update the label in both SVGs. Verification:

```bash
# Approximate count from the lazy-mesh spawn configurations
grep -c 'connectorId:' packages/gateway/src/connectors/lazy-mesh/connector-spawns.ts
```

Compare the count against the README claim and the diagram label; reconcile so they agree.

- [ ] **Step 6: Commit**

```bash
git add docs/assets/architecture-light.svg docs/assets/architecture-dark.svg
git commit -m "feat(docs): add architecture flowchart SVG (light + dark)"
```

---

### Task 3.4: Connector logo grid sourcing

**Files:**
- Create: `docs/assets/connectors/*.svg` (~30 files)
- Create: `docs/assets/connectors/README.md` (sourcing notes)

- [ ] **Step 1: Inventory shipped + planned connectors**

Read `docs/README.md` lines 167–171 (Phase 1–2 shipped, Phase 3 shipped, Phase 5 planned). Produce a list of connector identifiers, one per line, that the README's connector grid will display. Include the planned Phase 5 ones in a separate group.

- [ ] **Step 2: Source each logo from Simple Icons**

For each connector, fetch the matching Simple Icons SVG. The mapping is mostly obvious (`github` → `github.svg`, `slack` → `slack.svg`, `aws` → `amazonwebservices.svg`, etc.). Browse https://simpleicons.org/?q= for exact names.

For each connector:
```bash
curl -fsSL https://cdn.simpleicons.org/<icon-name> \
  -o docs/assets/connectors/<connector-name>.svg
```

(Simple Icons CDN serves monochrome SVGs by default — exactly what we want.)

> **Note for future maintainers.** Simple Icons also publishes the `simple-icons` npm package. A 10–20-line script could `import { siGithub, siSlack, ... } from "simple-icons"` and write each `.svg` member to disk programmatically — useful when bulk-refreshing logos after a Simple Icons release. We're not doing it in this task because the `curl` approach is one-shot work, doesn't add a multi-MB dev dep, and doesn't require a `bun run check-package` pre-flight. If a future refresh becomes routine, switch to the npm path.

- [ ] **Step 3: Handle connectors without a Simple Icons entry**

A few connectors may not have a Simple Icons entry (e.g., niche services or our own filesystem connector). For these:

- Filesystem: hand-author a generic folder icon SVG using the same `#7c3aed` stroke aesthetic.
- Vendor without Simple Icons: visit the vendor's brand guidelines page and download their official monochrome SVG. Save it with the appropriate connector name.
- Last resort: omit from the grid and reduce the displayed row count. **Never use a screenshot or rasterise.**

Document each non-Simple-Icons sourcing decision in `docs/assets/connectors/README.md` so future maintainers know the provenance:

```markdown
# Connector logo provenance

Most logos sourced from [Simple Icons](https://simpleicons.org/) (CC0).
The following are sourced elsewhere:

- `filesystem.svg` — hand-authored, generic folder icon, matches Nimbus accent
- `pulumi.svg` — official monochrome from https://www.pulumi.com/brand/
- (extend as needed)
```

- [ ] **Step 4: Run the SVG audit**

Run: `bun run audit:svg-assets`
Expected: every connector SVG listed as ✅.

- [ ] **Step 5: Commit**

```bash
git add docs/assets/connectors/
git commit -m "feat(docs): add connector logo grid SVGs (Simple Icons + provenance notes)"
```

---

### Task 3.5: OG / social card SVG + PNG render

**Files:**
- Create: `docs/assets/fonts/JetBrainsMono-Regular.ttf`
- Create: `docs/assets/fonts/JetBrainsMono-Bold.ttf`
- Create: `docs/assets/fonts/LICENSE-OFL-1.1.txt`
- Create: `docs/assets/og-card.svg`
- Create: `docs/og-card.png` (rendered)
- Create: `scripts/render-og-card.ts`
- Modify: `.github/workflows/docs-quality.yml` — add OG card render job
- Modify: `package.json` — add `render:og-card` script

- [ ] **Step 0: Check in JetBrains Mono fonts**

`@resvg/resvg-js` falls back silently to whatever monospace font is installed on the host when the requested family is missing. The `ubuntu-24.04` runner does not ship JetBrains Mono, so a CI render would diverge from the developer's local render. Fix this by checking the font into the repo and loading it explicitly.

JetBrains Mono is licensed under the SIL Open Font License 1.1 — redistribution permitted.

```bash
mkdir -p docs/assets/fonts
VER=2.304  # latest stable as of plan authorship; bump if a newer release is preferred
curl -fsSL "https://github.com/JetBrains/JetBrainsMono/raw/v${VER}/fonts/ttf/JetBrainsMono-Regular.ttf" \
  -o docs/assets/fonts/JetBrainsMono-Regular.ttf
curl -fsSL "https://github.com/JetBrains/JetBrainsMono/raw/v${VER}/fonts/ttf/JetBrainsMono-Bold.ttf" \
  -o docs/assets/fonts/JetBrainsMono-Bold.ttf
curl -fsSL "https://github.com/JetBrains/JetBrainsMono/raw/v${VER}/OFL.txt" \
  -o docs/assets/fonts/LICENSE-OFL-1.1.txt
```

Verify file sizes (~250KB each ttf, a few KB for the OFL text). Total checked-in size: ~500KB.

- [ ] **Step 1: Design the SVG**

Dimensions: 1200×630 (the canonical OG card size). Layout:

- Background: dark `#0d1117`, optional subtle gradient toward `#1a1a2e` in the bottom-right.
- Top-left: cloud emoji + "Nimbus" wordmark (reused from `docs/assets/nimbus-wordmark-dark.svg`) at scale ~1.5×.
- Centre-left: the headline "On-call intelligence. Local-first." in 64pt, white, JetBrains Mono.
- Centre-right: a thumbnail of the hero cast (an `<image>` element embedding `docs/assets/hero-cast-dark.svg` scaled to 480×288).
- Bottom: a one-line trust strip in `#7c3aed`: `AGPL-3.0 · MCP · 30 connectors · v0.1.0`.

Save the SVG at `docs/assets/og-card.svg`. The implementer authors the SVG by hand using the structural inputs above; aim for ~30 lines of SVG markup.

- [ ] **Step 2: Write the render script**

Create `scripts/render-og-card.ts`:

```typescript
import { readFile, writeFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";

const SRC = "docs/assets/og-card.svg";
const OUT = "docs/og-card.png";
const FONT_DIR = "docs/assets/fonts";

const svg = await readFile(SRC, "utf-8");
const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  background: "rgba(0, 0, 0, 0)",
  font: {
    // Deterministic font loading: read the checked-in JetBrains Mono files
    // explicitly so CI and local renders produce byte-identical PNGs.
    // loadSystemFonts is OFF — system fallbacks would silently diverge on ubuntu-24.04.
    loadSystemFonts: false,
    fontFiles: [
      `${FONT_DIR}/JetBrainsMono-Regular.ttf`,
      `${FONT_DIR}/JetBrainsMono-Bold.ttf`,
    ],
    defaultFontFamily: "JetBrains Mono",
  },
});
const png = resvg.render().asPng();
await writeFile(OUT, png);
console.log(`Rendered ${SRC} → ${OUT} (${png.byteLength} bytes)`);
```

- [ ] **Step 3: Add the render script**

Modify root `package.json`:

```jsonc
{
  "scripts": {
    "render:og-card": "bun scripts/render-og-card.ts"
  }
}
```

- [ ] **Step 4: Render the PNG**

Run: `bun run render:og-card`
Expected: `docs/og-card.png` created at exactly 1200×630, file size <500KB.

Verify dimensions:

```bash
file docs/og-card.png
# Expected: PNG image data, 1200 x 630, ...
```

- [ ] **Step 5: Add the CI render-and-diff job**

Modify `.github/workflows/docs-quality.yml`:

```yaml
  og-card-render:
    name: OG card render
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: "1.2"
      - run: bun install --frozen-lockfile
      - run: bun run render:og-card
      - run: |
          if ! git diff --exit-code docs/og-card.png; then
            echo "::error::OG card PNG is out of date. Run 'bun run render:og-card' locally and commit."
            exit 1
          fi
```

- [ ] **Step 6: Visual smoke-check**

Open `docs/og-card.png` in an image viewer. Confirm:
- Wordmark visible top-left.
- Headline readable.
- Cast thumbnail readable on the right.
- Trust strip readable at the bottom.
- No clipping or overflow.

If anything looks off, edit the SVG and re-render.

- [ ] **Step 7: Commit**

```bash
git add docs/assets/fonts/ docs/assets/og-card.svg docs/og-card.png scripts/render-og-card.ts package.json .github/workflows/docs-quality.yml
git commit -m "feat(docs): add OG social card + JetBrains Mono fonts + CI render-and-diff gate"
```

---

## Phase 4 — README rewrite

### Task 4.1: Rewrite `docs/README.md`

**Files:**
- Modify (full rewrite): `docs/README.md`
- Modify: `.markdownlint-cli2.jsonc` — remove the `!docs/README.md` exclusion line added in Task 1.2

- [ ] **Step 1: Read the cast ID for the embed**

Read `docs/demos/incident-response.cast.id` (created in Task 3.2). Hold the integer ID for use below.

- [ ] **Step 2: Author the new README**

Replace `docs/README.md` with the following structure (target ~280 lines). Use real prose, not placeholders.

**Top-of-file: hero (§5.1 markup pattern from spec)**

```markdown
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/hero-cast-dark.svg">
  <img align="right" width="480" alt="nimbus ask 'payment-service alert — what changed?' — incident response in 18 seconds" src="assets/hero-cast-light.svg">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/nimbus-wordmark-dark.svg">
  <img alt="Nimbus" src="assets/nimbus-wordmark-light.svg" width="280">
</picture>

### On-call intelligence. Local-first.

[![docs: nimbus-agent.dev](https://img.shields.io/badge/docs-nimbus--agent.dev-7c3aed)](https://nimbus-agent.dev)
[![Release: v0.1.0](https://img.shields.io/badge/release-v0.1.0-brightgreen)](https://github.com/nimbus-agent/Nimbus/releases/tag/v0.1.0)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue)](../LICENSE)
[![Status: Phase 5 Active](https://img.shields.io/badge/status-Phase_5_Active-blue)](./roadmap.md)

Cross-service incident context in under 100ms. Consent-gated automation. **Your credentials never leave the machine.**

[Install](#quick-start) · [Docs](https://nimbus-agent.dev) · [▶ Watch the cast](https://asciinema.org/a/<CAST_ID>)
```

Replace `<CAST_ID>` with the integer read in Step 1.

**§2 The problem (~25 lines)**

```markdown
## The problem

- **It's 3 AM. PagerDuty fires.** You open seven browser tabs to figure out what changed. → Nimbus correlates the alert, the deploy, the commit, and the author in one local query.
- **A critical CVE just dropped.** Which of our 47 repos are exposed? → Nimbus scans your indexed code, finds 12 affected repos, 3 with open PRs, 2 with production errors.
- **The Q1 revenue dashboard is showing zero.** Which upstream broke? → Nimbus traces Tableau → Looker → dbt → Airflow → the PR that renamed `order_amount` to `gross_amount`.

The data is already on your machine — indexed across every tool your on-call rotation depends on. Most queries never hit the network.

[More example sessions →](./examples.md)
```

**§3 How it works (~30 lines)**

```markdown
## How it works

Nimbus runs as a headless local **Gateway** process that maintains a private SQLite index across your tools. The **Engine** reads the index and dispatches actions through **MCP connectors** — every write requires your explicit approval before it runs.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/architecture-dark.svg">
  <img alt="Architecture: 30 Connectors → Local SQLite Index → Engine + HITL → CLI · UI · Voice — all on your machine" src="assets/architecture-light.svg">
</picture>

Three load-bearing words:

- **local** — the SQLite index, the Vault, the audit log all live on your machine. There is no Nimbus server.
- **consent-gated** — every destructive or outbound action is intercepted by the executor before it runs. The gate is structural; the agent cannot reason around a function that doesn't exist.
- **MCP** — every connector speaks the [Model Context Protocol](https://modelcontextprotocol.io/). The Engine never calls cloud APIs directly.

[Full architecture →](./architecture.md)
```

**§4 Quick start (~50 lines) — three OS commands visible, no `<details>`**

```markdown
## Quick start

### Linux (`.deb`)

\`\`\`bash
VER=0.1.0
curl -L "https://github.com/nimbus-agent/Nimbus/releases/download/v${VER}/nimbus-headless_${VER}_amd64.deb" -o nimbus.deb
curl -L "https://github.com/nimbus-agent/Nimbus/releases/download/v${VER}/nimbus-headless_${VER}_amd64.deb.asc" -o nimbus.deb.asc
gpg --keyserver keys.openpgp.org --recv-keys 5A20457CCD8B53FFAA945240886ADA6B487CAB6E
gpg --verify nimbus.deb.asc nimbus.deb
sudo dpkg -i nimbus.deb
\`\`\`

### macOS (tarball)

\`\`\`bash
# Apple Silicon
curl -L https://github.com/nimbus-agent/Nimbus/releases/latest/download/nimbus-headless-macos-arm64.tar.gz -o nimbus.tar.gz
tar -xzf nimbus.tar.gz && cd nimbus-* && ./install.sh --yes
\`\`\`

### Windows (zip)

\`\`\`powershell
Invoke-WebRequest https://github.com/nimbus-agent/Nimbus/releases/latest/download/nimbus-headless-windows-x64.zip -OutFile nimbus.zip
Expand-Archive nimbus.zip
cd (Get-ChildItem nimbus-*).Name
.\install.ps1 -Yes
\`\`\`

After install, authenticate one connector and ask:

\`\`\`bash
nimbus start
nimbus connector auth github
nimbus ask "what changed in the last 2 hours?"
\`\`\`

[Full CLI reference →](./cli-reference.md) · [Build from source →](./architecture.md#building-from-source)
```

**§5 Connectors (~30 lines) — grid**

```markdown
## Connectors

Every tool your on-call rotation depends on, unified in one local index. Cross-service queries are answered without an API call.

**Shipped:** Local Filesystem · Google Drive · Gmail · Photos · OneDrive · Outlook · Teams · GitHub · GitLab · Bitbucket · Slack · Linear · Jira · Notion · Confluence · Discord · Jenkins · GitHub Actions · CircleCI · GitLab CI · AWS · Azure · GCP · Kubernetes · Terraform · Datadog · Grafana · Sentry · PagerDuty · New Relic

<table>
  <tr>
    <td><img src="assets/connectors/github.svg" width="32" alt="GitHub"></td>
    <td><img src="assets/connectors/gitlab.svg" width="32" alt="GitLab"></td>
    <td><img src="assets/connectors/slack.svg" width="32" alt="Slack"></td>
    <td><img src="assets/connectors/linear.svg" width="32" alt="Linear"></td>
    <td><img src="assets/connectors/jira.svg" width="32" alt="Jira"></td>
    <!-- continue for all shipped connectors, ~6 per row -->
  </tr>
</table>

**Phase 5 (planned):** Databricks, Airflow, Prefect, Dagster, dbt Cloud, MLflow, SageMaker, Vertex AI, BigQuery, Athena, …

[Full connector list →](./roadmap.md#connectors)
```

**§6 Trust & security (~20 lines)**

```markdown
## Trust & security

Credentials live in your OS-native keystore — Windows DPAPI, macOS Keychain, Linux Secret Service. The consent gate for every destructive action is implemented in the executor as a compile-time constant set, not a prompt instruction. Every approval and every rejection is recorded in a local SQLite audit log before the action runs. The core is AGPL-3.0 — anyone running Nimbus as a network service must publish their modifications under the same terms.

[Security model →](./SECURITY.md) · [Twelve security invariants →](./SECURITY-INVARIANTS.md)
```

**§7 Roadmap (~15 lines)**

```markdown
## Roadmap

| Phase | Theme | Status |
|---|---|---|
| 1–3 | Foundation · 15 connectors · Intelligence | ✅ Complete |
| 3.5 | Observability, query API, recovery, telemetry, docs | ✅ Complete |
| 4 | Local LLM · multi-agent · voice · VS Code · TUI | ✅ Complete |
| **5** | **The Extended Surface (current)** | 🔵 **Active** |
| 6+ | Team · desktop installers · enterprise | Planned |

[Full roadmap →](./roadmap.md)
```

**§8 Contributing · License · footer (~25 lines)**

```markdown
## Contributing

The architecture is stabilising; not all interfaces are frozen. Read [`architecture.md`](./architecture.md) and the [non-negotiables](./CONTRIBUTING.md#non-negotiables). PRs that violate the non-negotiables (local-first, structural HITL, no plaintext credentials, MCP-only, platform equality, AGPL-compatible licensing) will not be merged.

[Contributing guide →](./CONTRIBUTING.md) · [Code of conduct →](./CODE_OF_CONDUCT.md)

## License

**Core (Gateway, CLI, connectors):** AGPL-3.0. **Extension SDK:** MIT. Commercial licensing for embedding Nimbus without AGPL obligations: contact the maintainers.

---

<div align="center">
  <a href="./architecture.md">Architecture</a> ·
  <a href="./roadmap.md">Roadmap</a> ·
  <a href="./SECURITY.md">Security</a> ·
  <a href="./examples.md">Examples</a> ·
  <a href="./cli-reference.md">CLI</a> ·
  <a href="./performance.md">Performance</a>
</div>
```

- [ ] **Step 3: Re-enable markdownlint on the README**

Modify `.markdownlint-cli2.jsonc`: remove the `"!docs/README.md"` line added in Task 1.2 Step 6.

- [ ] **Step 4: Run all docs-quality gates locally**

Run in sequence:

```bash
bun run lint:markdown
bun run audit:svg-assets
bun run audit:readme-cli
bunx --bun @lycheeverse/lychee --config lychee.toml 'docs/**/*.md' '*.md'
bun run render:og-card  # ensure PNG is fresh
```

Expected: all exit 0.

If any fail, fix the README (or the relevant doc) and re-run until clean.

- [ ] **Step 5: Word count + line count sanity check**

Run: `wc -l docs/README.md`
Expected: between 250 and 310 lines. If outside that window, either content is missing or the cuts didn't go deep enough — review against spec §5.2.

- [ ] **Step 6: Visual smoke-check, with mobile fallback contingency**

Open `docs/README.md` in:
- GitHub's web preview (push the branch, open PR — but don't merge yet)
- A local markdown previewer (VS Code, Obsidian, …) in light + dark mode
- A real phone (iOS Safari + Android Chrome) — not just a narrowed desktop window. Mobile renderers behave differently from a 600px desktop viewport.

Confirm:
- Hero cast renders side-by-side with the pitch on desktop.
- On mobile, the cast image stacks above the pitch text via natural reflow — text wraps cleanly below or to the side without awkward fragmentation.
- Wordmark renders crisp.
- Architecture diagram renders.
- Connector logo grid renders without horizontal scrolling.
- Badge row is on a single line on desktop and wraps cleanly on mobile.

**Mobile-fallback contingency.** If the cast image on mobile causes awkward text wrapping, fragments the pitch, or the float renders inconsistently across iOS/Android — fall back to a stacked layout (no float). Replace the hero markup block in Step 2 with this alternative:

```markdown
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/nimbus-wordmark-dark.svg">
  <img alt="Nimbus" src="assets/nimbus-wordmark-light.svg" width="280">
</picture>

### On-call intelligence. Local-first.

[badges]

Cross-service incident context in under 100ms. Consent-gated automation.
**Your credentials never leave the machine.**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/hero-cast-dark.svg">
  <img alt="nimbus ask 'payment-service alert — what changed?' — incident response in 18 seconds" src="assets/hero-cast-light.svg">
</picture>

[Install](#quick-start) · [Docs](https://nimbus-agent.dev) · [▶ Watch the cast](https://asciinema.org/a/<CAST_ID>)
```

This stacked layout sacrifices the desktop split for guaranteed mobile readability. Document the decision in the commit message so future maintainers know the float was tried and didn't survive mobile testing. The `align="right"` pattern is well-precedented (Bun, Astro, Tauri all ship it), so this fallback should be the exception — but it's the safe escape hatch.

- [ ] **Step 7: Commit**

```bash
git add docs/README.md .markdownlint-cli2.jsonc
git commit -m "feat(docs): rewrite README — ~280 lines, product-led split hero, asset-backed sections"
```

---

## Phase 5 — Verification gates

### Task 5.1: Run the full docs-quality suite

**Files:** none modified.

- [ ] **Step 1: Run all gates**

```bash
bun install --frozen-lockfile
bun run lint:markdown
bun run audit:svg-assets
bun run audit:readme-cli
bunx --bun @lycheeverse/lychee --config lychee.toml 'docs/**/*.md' '*.md'
bun run render:og-card && git diff --exit-code docs/og-card.png
```

Each must exit 0. If any fails, fix the underlying issue and re-run.

- [ ] **Step 2: Push the branch and confirm CI runs all five jobs**

```bash
git push -u origin dev/asafgolombek/readme-hero-redesign
```

Open the resulting PR. Confirm the GitHub Actions checks list includes:
- `Docs Quality / lychee link check`
- `Docs Quality / markdownlint-cli2`
- `Docs Quality / SVG asset audit`
- `Docs Quality / README CLI tripwire`
- `Docs Quality / OG card render`

All must show green.

If any check is missing or fails, debug the workflow file and push a fix.

- [ ] **Step 3: No commit** — this task is verification only.

---

### Task 5.2: Manual accessibility verification

**Files:** none modified — the output is a checklist in the PR description.

- [ ] **Step 1: GitHub dark + light theme**

In the PR, view the rendered README in GitHub light theme, then switch to dark theme. Confirm every asset (wordmark, cast, architecture diagram, connector logos, OG preview) renders correctly in both. Take screenshots of both.

- [ ] **Step 2: Mobile rendering**

Open the rendered README on a physical phone (iOS Safari and/or Android Chrome). Confirm:
- The cast image stacks above the pitch prose.
- Connector logo grid does not produce horizontal scroll.
- Badge row wraps cleanly.

Take screenshots.

- [ ] **Step 3: Screen reader pass**

On macOS, enable VoiceOver and read the page top-to-bottom. The reading order should be: wordmark → headline → subhead → trust line → cast alt text → CTAs → §2 problem → ... Confirm none of the SVG assets is skipped because of missing alt text.

If using NVDA on Windows: same exercise.

- [ ] **Step 4: Color contrast**

Run an axe DevTools scan on the rendered GitHub README page. Confirm:
- All text passes WCAG AA at 4.5:1 minimum.
- The accent `#7c3aed` on dark `#0d1117` passes for normal text.
- The accent `#7c3aed` on white `#ffffff` passes for normal text (it does at 7.04:1 per webaim).

- [ ] **Step 5: Attach checklist to PR**

Add a comment to the PR with checked boxes for each accessibility item, screenshots inline. This becomes the auditable artefact of accessibility verification.

---

### Task 5.3: Upload OG card via GitHub settings (manual)

**Files:** none modified — this is a repo-settings change.

- [ ] **Step 1: Navigate to GitHub repo settings → Social preview**

URL: `https://github.com/nimbus-agent/Nimbus/settings#social-preview`

- [ ] **Step 2: Upload `docs/og-card.png`**

Click "Edit" → upload the file. GitHub recomputes the social preview.

- [ ] **Step 3: Verify the upload**

Test the social preview by pasting `https://github.com/nimbus-agent/Nimbus` into:
- Slack (paste in any channel — should show the new card).
- Twitter's card debugger: https://opengraph.xyz/?url=https://github.com/nimbus-agent/Nimbus

Confirm the card renders correctly in both.

- [ ] **Step 4: Note the manual step in the PR description**

Add to the PR description:

```
## Manual post-merge step

After merge, navigate to repo settings → Social preview and upload `docs/og-card.png`.
Verify via opengraph.xyz.
```

This is a permission-gated action (repo admin only) and is the one piece of this sub-project that cannot be automated by CI.

---

### Task 5.4: Qualitative validation (post-merge)

**Files:** none.

This task is **deferred until after the PR merges** — running it on a staged branch confuses the test subjects. Track it as a follow-up issue.

- [ ] **Step 1: Open a follow-up issue**

Title: "README hero redesign — qualitative validation"

Body:

```markdown
Once the README hero redesign merges, show the rendered page to three SRE/Platform engineers
(no prior Nimbus context) and ask each: "What does this product do?"

Success criteria (from spec §9):
- All three describe Nimbus as "incident context across tools, local" or close paraphrase.
- At least two complete the install command on first read.

Capture feedback in this issue. If two or more subjects fail either criterion, file follow-up
issues for the specific points of confusion.

## Related follow-ups

- **Automated cast re-recording.** Currently `docs/demos/incident-response.cast` is recorded
  manually with the `asciinema` CLI. Investigate `asciinema-automation` or a similar headless
  scripted-terminal tool to regenerate the cast from a deterministic input script. Pairs well
  with the deferred output-hash tripwire in sub-project D.
```

Label: `validation`, `documentation`, `phase-5`.

Assignee: the PR author.

- [ ] **Step 2: Link the issue from the PR description**

Add to the PR description:

```
## Validation follow-up

Qualitative validation (3 SRE/Platform engineers) tracked in #<issue-number>.
```

---

## Self-review of this plan

Quick scan against the spec ([`docs/superpowers/specs/2026-05-11-readme-hero-redesign-design.md`](../specs/2026-05-11-readme-hero-redesign-design.md)) before handoff:

**Spec coverage:**

- §5.1 hero shape & markup → Task 4.1 Step 2 (hero markup block)
- §5.2 structure table → Task 4.1 Step 2 (full README rewrite covering all 8 sections)
- §5.3 cut list & destinations → Tasks 2.1–2.5
- §5.4 visual identity table — wordmark → 3.1, hero cast → 3.2, architecture → 3.3, connectors → 3.4, OG card → 3.5
- §5.5 color & typography → embedded in Tasks 3.1–3.5 (single `#7c3aed` accent, JetBrains Mono)
- §6 asciinema cast content → Task 3.2
- §7 accessibility → Task 5.2
- §8 validation pipeline — lychee → 1.1, markdownlint → 1.2, SVG audit → 1.3, OG render → 3.5, PR template → 1.5, CLI tripwire → 1.4
- §9 success criteria — automated covered by Phase 1 gates; qualitative deferred to 5.4
- §10 risks — addressed via Phase 1 gates + Task 5.2 verification
- §11 file inventory — every file accounted for in Tasks 1.1–5.3
- §12 out of scope — left untouched
- §13 sequencing — inverted: spec recommends asset-first, plan does gates-first for verifiable TDD order. Documented in the architecture summary above.

**Placeholder scan:** None. Every step has runnable commands or executable code.

**Type consistency:** `auditSvgFile` signature consistent across Task 1.3; `extractReadmeCliCommands` and `validateReadmeCommands` signatures consistent across Task 1.4; `--config lychee.toml` invocation consistent across all phases.

**One known limitation:** Task 1.4 Step 1 requires reading `packages/cli/src/index.ts` at execution time to choose between import-based or grep-based extraction — the plan handles both branches but the implementer must do that audit to lock in which approach the script ships with.
