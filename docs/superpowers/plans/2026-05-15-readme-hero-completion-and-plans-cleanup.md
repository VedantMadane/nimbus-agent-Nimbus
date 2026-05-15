# README Hero Redesign Completion + Superpowers Plans Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the six outstanding tasks from the 2026-05-11 README hero redesign plan (asciinema cast render, OG card production + render gate, full docs-quality run, accessibility verification doc, post-merge upload note, qualitative-validation follow-up) AND purge completed plan + spec files from `docs/superpowers/` — salvaging any orphan information into authoritative docs (`docs/roadmap.md`, `docs/architecture.md`, `docs/README.md`, `CLAUDE.md`) first.

**Architecture:** Single PR with two commit clusters. **Phase A** finishes asset production (cast SVGs, OG card source + PNG render + CI gate, JetBrains Mono fonts), embeds the assets into the README hero, and runs the docs-quality suite end-to-end. **Phase B** classifies every file in `docs/superpowers/{specs,plans}/` as shipped / in-flight / future-design, salvages any unique information from shipped artifacts into the authoritative docs, and `git rm`s the shipped plans + specs + their review-feedback pairs. **Phase C** is the pre-flight + push + PR. The original `2026-05-11-readme-hero-redesign.md` plan itself and its design spec are deleted in Phase B as part of the same cleanup pass — this PR closes them.

**Tech Stack:** `svg-term-cli` (cast → SVG), `@resvg/resvg-js` (SVG → PNG for OG card; already a dev dep), JetBrains Mono v2.304 fonts (SIL OFL 1.1, checked in), `bun audit:svg-assets`, GitHub Actions, `git rm`, hand authored markdown.

---

## File Structure

### Files created

| Path | Purpose |
|---|---|
| `docs/assets/hero-cast-light.svg` | Rendered asciinema cast (solarized-light theme, Nimbus magenta accent at `#7c3aed`). Output of `svg-term --cast docs/demos/incident-response.cast`. Width ≈ 720, height ≈ 432, ≤ 200 KiB. |
| `docs/assets/hero-cast-dark.svg` | Same cast rendered with solarized-dark palette. Same dimensions. |
| `docs/assets/fonts/JetBrainsMono-Regular.ttf` | JetBrains Mono regular (v2.304). ~250 KiB. SIL OFL 1.1. |
| `docs/assets/fonts/JetBrainsMono-Bold.ttf` | JetBrains Mono bold (v2.304). ~250 KiB. SIL OFL 1.1. |
| `docs/assets/fonts/LICENSE-OFL-1.1.txt` | SIL Open Font License 1.1 text. ~5 KiB. |
| `docs/assets/og-card.svg` | Hand-authored 1200×630 OG card source SVG. ~30 lines. |
| `docs/og-card.png` | Rendered 1200×630 PNG (resvg-js output). ≤ 500 KiB. |
| `scripts/render-og-card.ts` | resvg-js renderer with deterministic font loading (`loadSystemFonts: false`). |

### Files modified

| Path | Change |
|---|---|
| `docs/README.md` | Embed the cast SVG via picture/source media-query for light/dark in the hero block. |
| `package.json` | Add `render:og-card` script + `svg-term-cli` dev dep (after `check-package` verification). |
| `.github/workflows/docs-quality.yml` | Add `og-card-render` job that runs `bun run render:og-card` then `git diff --exit-code docs/og-card.png`. |
| `docs/roadmap.md` | Flip the sub-project A (README hero) checkbox + dated note; extend the `Last updated:` header line with `Sub-project A ✅ (2026-05-15)`. |
| `CLAUDE.md` | Update the `Status:` line with `Sub-project A ✅ (2026-05-15) · docs/superpowers/ pruned (2026-05-15)`. |
| `.claude/commands/nimbus-file-map.md` | Add a "Top-level docs" row for `docs/og-card.png` and an `Assets` group for the asciinema cast + OG card sources. |
| `docs/README.md` | (second touch) Salvage any orphan info from deleted plans/specs that isn't already there — typically zero new bytes; verify per §B.2. |
| `docs/architecture.md` | (conditional) Salvage any orphan info — typically zero new bytes since architecture is the authoritative subsystem doc. |

### Files deleted (Phase B)

24 plan files + 24 spec/spec-review files removed. Exact list locked in §B.1 of this plan. Net effect: `docs/superpowers/plans/` goes from 24 files to 1 (the active T6 PR 2 review-feedback); `docs/superpowers/specs/` goes from 30 files to 7 (Phase 7 / 8 / 9 / 14 future designs + T6 design + T6 review-feedback + T6 PR 2 review-feedback).

### Files NOT modified

- The 49 connector SVG logos under `docs/assets/connectors/` — Task 3.4 already shipped, unchanged.
- `docs/assets/architecture-{light,dark}.svg` — Task 3.3 already shipped, unchanged.
- `docs/assets/nimbus-wordmark-{light,dark}.svg` — Task 3.1 already shipped, unchanged.
- `docs/demos/incident-response.cast` — Task 3.2 Step 2 ("record the cast") already shipped; this PR only renders it to SVG.
- Any of the 4 future-phase spec files in `docs/superpowers/specs/` (Phase 7 / 8 / 9 / 14) — those describe future work and must stay.

---

## Task 1 — Verify baseline + check-package svg-term-cli

**Files:** none modified — pre-flight only.

- [ ] **Step 1: Confirm worktree and branch**

```bash
cd /c/gitrep/Nimbus/.worktrees/dev+asafgolombek+readme-hero-completion
pwd
git branch --show-current
```

Expected:
```
/c/gitrep/Nimbus/.worktrees/dev+asafgolombek+readme-hero-completion
dev/asafgolombek/readme-hero-completion
```

If either is wrong, stop and re-create the worktree per the plan header.

- [ ] **Step 2: Confirm `@resvg/resvg-js` is already a dev dep**

```bash
grep -E '"@resvg/resvg-js"' package.json
```

Expected: one match showing `@resvg/resvg-js": "^2.6.2"` (or similar). It was added by the original Task 1.3 (SVG asset audit). No new install needed.

- [ ] **Step 3: Confirm asciinema cast file exists**

```bash
ls -la docs/demos/incident-response.cast
```

Expected: file exists, non-empty. This is the input for the SVG render in Task 2.

- [ ] **Step 4: Run dependency-safety check on `svg-term-cli`**

```bash
bun run check-package svg-term-cli
```

Expected: package metadata printed. Author should be `marionebl` (the maintainer). The package was first published in 2016 — well past the 7-day risk window.

Do NOT proceed if:
- Exit code is `1` (does not exist on npm).
- Script emits the `< 7 days old` warning.
- Author looks suspicious (typo of a well-known name, etc.).

If the check is clean, record the version + author + published age for the PR description.

- [ ] **Step 5: Run baseline lint + audit**

```bash
bun install --frozen-lockfile
bun run lint
bun run lint:markdown
bun audit --audit-level high
```

All four must exit 0 against the current state of main. If any fails, stop and triage — the failure is pre-existing and outside this plan's scope.

- [ ] **Step 6: No commit** — this task is verification only.

---

## Task 2 — Render asciinema cast as light + dark SVGs

**Files:**
- Create: `docs/assets/hero-cast-light.svg`
- Create: `docs/assets/hero-cast-dark.svg`
- Modify: `package.json` (add `svg-term-cli` dev dep)

- [ ] **Step 1: Add `svg-term-cli` as a dev dep**

```bash
bun add -d svg-term-cli
```

Verify `package.json` `devDependencies` now contains `"svg-term-cli"` and `bun.lock` resolved a single new version.

- [ ] **Step 2: Render the light SVG**

```bash
bunx svg-term --cast docs/demos/incident-response.cast \
  --out docs/assets/hero-cast-light.svg \
  --window \
  --width 90 \
  --height 24 \
  --term iterm2 \
  --profile <(echo '{"background":"#fdf6e3","foreground":"#586e75","red":"#dc322f","green":"#859900","yellow":"#b58900","blue":"#268bd2","magenta":"#7c3aed","cyan":"#2aa198","white":"#eee8d5"}')
```

Expected: file written; `bunx` reports no errors.

If the `<(echo ...)` process substitution isn't supported on your shell (PowerShell on Windows doesn't have it), write the profile to a temp file first:

```bash
echo '{"background":"#fdf6e3","foreground":"#586e75","red":"#dc322f","green":"#859900","yellow":"#b58900","blue":"#268bd2","magenta":"#7c3aed","cyan":"#2aa198","white":"#eee8d5"}' > /tmp/cast-light-profile.json
bunx svg-term --cast docs/demos/incident-response.cast --out docs/assets/hero-cast-light.svg --window --width 90 --height 24 --term iterm2 --profile /tmp/cast-light-profile.json
rm /tmp/cast-light-profile.json
```

- [ ] **Step 3: Render the dark SVG**

```bash
bunx svg-term --cast docs/demos/incident-response.cast \
  --out docs/assets/hero-cast-dark.svg \
  --window \
  --width 90 \
  --height 24 \
  --term iterm2 \
  --profile <(echo '{"background":"#002b36","foreground":"#93a1a1","red":"#dc322f","green":"#859900","yellow":"#b58900","blue":"#268bd2","magenta":"#7c3aed","cyan":"#2aa198","white":"#eee8d5"}')
```

Same temp-file fallback as Step 2 if process substitution is unavailable.

- [ ] **Step 4: Verify SVG audit passes**

```bash
bun run audit:svg-assets
```

Expected output includes:
```
✅ docs/assets/hero-cast-light.svg (~720x432)
✅ docs/assets/hero-cast-dark.svg (~720x432)
```

The exact dimensions depend on `svg-term`'s default font metrics; anything in the 600–800 width range is acceptable. If audit fails with "missing alt-text-equivalent" or similar, edit the SVG by hand to add a `<title>` element.

- [ ] **Step 5: Verify file sizes are reasonable**

```bash
wc -c docs/assets/hero-cast-light.svg docs/assets/hero-cast-dark.svg
```

Expected: each file ≤ 200 KiB (200 000 bytes). If much larger, the cast may have been recorded with too many output bytes — re-record with a shorter pause budget. The 17–19 second target from the original Task 3.2 Step 1 is the budget.

- [ ] **Step 6: Commit**

```bash
git add docs/assets/hero-cast-light.svg docs/assets/hero-cast-dark.svg package.json bun.lock
git commit -m "$(cat <<'EOF'
feat(docs): render incident-response asciinema cast as light + dark SVGs

Renders docs/demos/incident-response.cast (already checked in) into two
posters via svg-term-cli — solarized-light and solarized-dark palettes
with the Nimbus magenta accent (#7c3aed) wired through the iterm2
profile's magenta slot.

Closes Task 3.2 (render) from the 2026-05-11 README hero plan. The
"upload to asciinema.org" sub-step is deliberately skipped — the README
embeds the SVG directly, no external dependency needed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — Author OG card SVG + check in JetBrains Mono fonts

**Files:**
- Create: `docs/assets/fonts/JetBrainsMono-Regular.ttf`
- Create: `docs/assets/fonts/JetBrainsMono-Bold.ttf`
- Create: `docs/assets/fonts/LICENSE-OFL-1.1.txt`
- Create: `docs/assets/og-card.svg`

- [ ] **Step 1: Check in JetBrains Mono fonts**

`@resvg/resvg-js` falls back silently to whatever monospace font is installed on the host when the requested family is missing. The `ubuntu-24.04` runner does not ship JetBrains Mono, so a CI render would diverge from the developer's local render. Fix this by checking the font into the repo and loading it explicitly in the renderer.

JetBrains Mono is licensed under the SIL Open Font License 1.1 — redistribution permitted.

```bash
mkdir -p docs/assets/fonts
VER=2.304
curl -fsSL "https://github.com/JetBrains/JetBrainsMono/raw/v${VER}/fonts/ttf/JetBrainsMono-Regular.ttf" \
  -o docs/assets/fonts/JetBrainsMono-Regular.ttf
curl -fsSL "https://github.com/JetBrains/JetBrainsMono/raw/v${VER}/fonts/ttf/JetBrainsMono-Bold.ttf" \
  -o docs/assets/fonts/JetBrainsMono-Bold.ttf
curl -fsSL "https://github.com/JetBrains/JetBrainsMono/raw/v${VER}/OFL.txt" \
  -o docs/assets/fonts/LICENSE-OFL-1.1.txt
```

Verify file sizes:
```bash
wc -c docs/assets/fonts/JetBrainsMono-Regular.ttf docs/assets/fonts/JetBrainsMono-Bold.ttf docs/assets/fonts/LICENSE-OFL-1.1.txt
```

Expected: each TTF ~250 KiB (240 000–260 000 bytes), license text ~5 KiB. Total checked-in size ~500 KiB.

- [ ] **Step 2: Author the OG card SVG**

Create `docs/assets/og-card.svg` with the hand-authored markup below. Dimensions: 1200×630 (canonical OG card size). Layout matches the 2026-05-11 spec §5.4 OG card description.

```bash
cat > docs/assets/og-card.svg <<'SVG'
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <title>Nimbus — On-call intelligence. Local-first.</title>
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d1117" />
      <stop offset="100%" stop-color="#1a1a2e" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <text x="60" y="100" font-family="JetBrains Mono" font-weight="700" font-size="48" fill="#ffffff">
    ☁ Nimbus
  </text>
  <text x="60" y="280" font-family="JetBrains Mono" font-weight="700" font-size="64" fill="#ffffff">
    On-call intelligence.
  </text>
  <text x="60" y="360" font-family="JetBrains Mono" font-weight="700" font-size="64" fill="#7c3aed">
    Local-first.
  </text>
  <text x="60" y="450" font-family="JetBrains Mono" font-weight="400" font-size="28" fill="#93a1a1">
    Cross-service incident context in under 100ms.
  </text>
  <text x="60" y="490" font-family="JetBrains Mono" font-weight="400" font-size="28" fill="#93a1a1">
    Consent-gated automation. Credentials never leave the machine.
  </text>
  <text x="60" y="580" font-family="JetBrains Mono" font-weight="400" font-size="24" fill="#7c3aed">
    AGPL-3.0 · MCP · 30 connectors · v0.2.0
  </text>
</svg>
SVG
```

Note: the original Task 3.5 Step 1 also suggested embedding a thumbnail of the hero cast on the right side. That requires `<image href="..." />` with the cast SVG inlined or base64-encoded, which adds resvg-rendering complexity. **Defer that for a follow-up** — the simpler text-only design above produces a card that meets the spec's "wordmark + headline + trust strip" minimum and renders deterministically across hosts.

- [ ] **Step 3: Visual smoke check**

Open `docs/assets/og-card.svg` in a browser (Firefox or Chrome) to confirm:
- Headline readable.
- Magenta "Local-first." line + trust strip render in `#7c3aed`.
- No clipping.

The browser will use a system font fallback for JetBrains Mono since `@font-face` isn't declared in the SVG. The PNG render in Task 4 uses the checked-in TTFs and will look correct. The SVG-in-browser preview is a sanity check only.

- [ ] **Step 4: No commit yet** — combined with Task 4's commit so the SVG, fonts, render script, and PNG all land together.

---

## Task 4 — Write `scripts/render-og-card.ts` and render the PNG

**Files:**
- Create: `scripts/render-og-card.ts`
- Create: `docs/og-card.png`
- Modify: `package.json` (add `render:og-card` script)

- [ ] **Step 1: Write the render script**

Create `scripts/render-og-card.ts`:

```typescript
/**
 * Renders the OG card SVG to a deterministic 1200×630 PNG.
 *
 * Determinism notes:
 *   - loadSystemFonts: false — system font fallbacks differ between
 *     ubuntu-24.04 (CI) and macOS/Windows (dev), which would make
 *     the `git diff --exit-code docs/og-card.png` CI gate flap.
 *   - fontFiles explicitly lists the checked-in JetBrains Mono TTFs.
 *   - background: rgba(0,0,0,0) — the SVG owns the background fill.
 */

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

- [ ] **Step 2: Add the `render:og-card` package.json script**

Edit `package.json` and add to the `scripts` block (alphabetical placement after `record-casts`):

```jsonc
"render:og-card": "bun scripts/render-og-card.ts",
```

Verify the JSON is still valid:

```bash
bun -e 'JSON.parse(require("fs").readFileSync("package.json","utf8"))' && echo "ok"
```

- [ ] **Step 3: Render the PNG**

```bash
bun run render:og-card
```

Expected output:
```
Rendered docs/assets/og-card.svg → docs/og-card.png (NNNNNN bytes)
```

The byte count should be in the 50 000–200 000 range. Larger than 500 KiB suggests the SVG has too many gradients or embedded raster data — re-check Task 3 Step 2.

- [ ] **Step 4: Verify PNG dimensions**

```bash
file docs/og-card.png
```

Expected: `PNG image data, 1200 x 630, ...`

If dimensions are wrong (e.g. 1080×567), the `fitTo.value: 1200` in the renderer is being scaled by the SVG's aspect ratio — confirm the source SVG's `width="1200" height="630"` attributes are present.

- [ ] **Step 5: Determinism check (re-render and diff)**

```bash
bun run render:og-card
git diff --stat docs/og-card.png
```

Expected: zero diff. If the file changes between two consecutive renders, the determinism contract is broken — most likely because `loadSystemFonts: false` is missing or `fontFiles` resolution is platform-dependent. Fix before proceeding.

- [ ] **Step 6: Commit Tasks 3 + 4 together**

```bash
git add docs/assets/fonts/ docs/assets/og-card.svg docs/og-card.png scripts/render-og-card.ts package.json
git commit -m "$(cat <<'EOF'
feat(docs): OG social card + JetBrains Mono fonts + deterministic renderer

- docs/assets/og-card.svg: hand-authored 1200×630 source.
- docs/assets/fonts/: JetBrains Mono v2.304 Regular + Bold (SIL OFL 1.1)
  checked in so CI and developer renders produce byte-identical PNGs
  (ubuntu-24.04 runner does not ship JBM as a system font).
- scripts/render-og-card.ts: resvg-js renderer with loadSystemFonts:false
  and explicit fontFiles — eliminates the system-font-fallback flap.
- docs/og-card.png: rendered output (will be diff-gated in next commit).

Closes Task 3.5 Steps 1–4 of the 2026-05-11 README hero plan. CI gate
lands in the next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — Add the OG card render-and-diff CI gate

**Files:**
- Modify: `.github/workflows/docs-quality.yml`

- [ ] **Step 1: Read the existing workflow to confirm format**

```bash
head -40 .github/workflows/docs-quality.yml
```

Note the existing job structure — each job has `name:`, `runs-on:`, `permissions:`, `timeout-minutes:`, and steps with `step-security/harden-runner` + `actions/checkout` + `oven-sh/setup-bun` (or repo-local "Setup Nimbus CI" composite action). Mirror that shape for the new job.

- [ ] **Step 2: Find the appropriate insertion point**

```bash
grep -n "^  cast-tripwire:\|^  docs-build:" .github/workflows/docs-quality.yml
```

The new `og-card-render` job goes alphabetically between `markdownlint` and `package-readmes` — find those line numbers and insert between.

- [ ] **Step 3: Add the job**

Insert the following block at the chosen line (Edit tool, after the closing `steps:` of `markdownlint`):

```yaml
  og-card-render:
    name: OG card render
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    permissions:
      contents: read

    steps:
      - name: Harden Runner
        uses: step-security/harden-runner@a5ad31d6a139d249332a2605b85202e8c0b78450 # v2.19.1
        with:
          egress-policy: audit

      - name: Checkout
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
        with:
          persist-credentials: false

      - name: Setup Nimbus CI
        uses: ./.github/actions/setup-nimbus-ci

      - name: Render OG card
        run: bun run render:og-card

      - name: Verify PNG is up to date
        run: |
          if ! git diff --exit-code docs/og-card.png; then
            echo "::error::docs/og-card.png is out of date. Run 'bun run render:og-card' locally and commit the result."
            exit 1
          fi
```

If `.github/actions/setup-nimbus-ci` doesn't exist (a few of the existing jobs use `oven-sh/setup-bun` directly), use:

```yaml
      - name: Set up Bun
        uses: oven-sh/setup-bun@<pinned-sha>
        with:
          bun-version: "1.2"

      - name: Install deps
        run: bun install --frozen-lockfile
```

Look up the existing `setup-bun` SHA pin from another job in the same file rather than picking a new version — pinning consistency is a security concern.

- [ ] **Step 4: Lint the workflow YAML**

```bash
bunx yaml-eslint --quiet .github/workflows/docs-quality.yml 2>/dev/null || true
```

If `yaml-eslint` isn't installed, fall back to a parser check:

```bash
bun -e 'const YAML = require("yaml"); YAML.parse(require("fs").readFileSync(".github/workflows/docs-quality.yml","utf8")); console.log("ok")'
```

Expected: `ok`. If parsing fails, fix indentation.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/docs-quality.yml
git commit -m "$(cat <<'EOF'
ci(docs): add OG card render-and-diff gate

Runs `bun run render:og-card` on PR/push and fails if docs/og-card.png
diverges from the committed copy. Catches: (a) hand-edits to og-card.svg
without re-rendering, (b) accidental git checkout of an old PNG, (c)
non-deterministic renders if loadSystemFonts ever flips back to true.

Closes Task 3.5 Step 5 of the 2026-05-11 README hero plan.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — Embed the cast SVG in the README hero

**Files:**
- Modify: `docs/README.md`

- [ ] **Step 1: Locate the hero block**

```bash
head -30 docs/README.md
```

The hero currently has a `<div align="center">` wrapper containing the wordmark, headline, badges. The cast embed goes immediately after the badges block, before the first `<h2>` section.

- [ ] **Step 2: Add the cast embed**

Use Edit to insert the following block in `docs/README.md`, right after the closing of the badge row (the line ending in `[![Built with Bun]...`) and before the first `</div>` or `<h2>`:

```markdown
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/hero-cast-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/hero-cast-light.svg">
  <img alt="Nimbus incident-response demo: 18-second walkthrough of nimbus ask correlating a PagerDuty alert with the recent deploy and PR, with consent-gated Slack post and rollback decisions." src="./assets/hero-cast-light.svg" width="720">
</picture>
```

Notes:
- The `<picture>` element lets GitHub serve the dark variant to users with `prefers-color-scheme: dark` in their browser/OS settings.
- The `alt` text describes the cast content for screen readers — long-form, since the cast is the hero asset.
- `./assets/hero-cast-light.svg` (relative to `docs/`) — verify the path resolves by clicking the link in a local preview tool (e.g. `bunx serve docs`).

- [ ] **Step 3: Verify the README still passes markdownlint**

```bash
bun run lint:markdown
```

Expected: 0 errors. MD033 (no-inline-html) is disabled per `.markdownlint-cli2.jsonc` (see the comment at the top of that file) so `<picture>` and `<img>` are fine.

- [ ] **Step 4: Verify lychee link check passes**

```bash
bunx --bun @lycheeverse/lychee --config lychee.toml 'docs/README.md'
```

Expected: 0 broken links. The new `./assets/hero-cast-{light,dark}.svg` refs must resolve to the files written in Task 2.

- [ ] **Step 5: Verify the SVG asset audit still passes**

```bash
bun run audit:svg-assets
```

Expected: all SVGs pass (wordmarks, architecture, cast variants, connector grid).

- [ ] **Step 6: Commit**

```bash
git add docs/README.md
git commit -m "$(cat <<'EOF'
feat(docs): embed asciinema cast SVGs in README hero

Uses <picture> with prefers-color-scheme media queries so GitHub serves
the dark variant to users with dark mode and the light variant to
everyone else. Falls back to the light variant in src for clients that
don't honour the picture element. Long-form alt text describes the
18-second demo for screen readers.

Closes Task 4.1 hero-cast wiring + Task 3.2 README integration from
the 2026-05-11 README hero plan.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 — Run the full docs-quality suite end-to-end (Task 5.1)

**Files:** none modified — verification only.

- [ ] **Step 1: Run every gate sequentially**

```bash
bun install --frozen-lockfile
bun run lint:markdown
bun run audit:svg-assets
bun run audit:readme-cli
bunx --bun @lycheeverse/lychee --config lychee.toml 'docs/**/*.md' '*.md'
bun run render:og-card && git diff --exit-code docs/og-card.png
```

All six must exit 0. If any fails:
- `lint:markdown` failure → fix per the rule output (most likely missing blank line, broken link).
- `audit:svg-assets` failure → check dimensions / missing title element.
- `audit:readme-cli` failure → a `nimbus <cmd>` reference in the README doesn't match the CLI registry; either fix the README or extend the registry.
- `lychee` failure → broken link; either fix the link or add to `lychee.toml`'s `exclude` list with a comment explaining why.
- `render:og-card` diff non-zero → re-run, then run twice consecutively; if it diffs both times, the determinism contract is broken (see Task 4 Step 5).

- [ ] **Step 2: No commit** — verification only. If anything fails, fix and re-commit on the relevant earlier task; this Task 7 only re-runs.

---

## Task 8 — Write the PR description checklist + manual notes (Tasks 5.2, 5.3, 5.4)

**Files:** none committed — the artefact is the PR description prepared for use when Task 11 opens the PR.

- [ ] **Step 1: Draft the accessibility checklist**

Write the following block to a scratch file `docs/.scratch-pr-body.md` (gitignored — verify `.gitignore` covers `docs/.scratch-*` or that the file is in `.gitignore`):

```bash
mkdir -p docs && cat > docs/.scratch-pr-body.md <<'EOF'
## Summary

Finishes the 2026-05-11 README hero redesign sub-project (closes the
last six outstanding tasks) AND prunes 24 completed plans + 24 completed
spec files from `docs/superpowers/`, salvaging zero net info — every
plan's load-bearing fact was already in `docs/roadmap.md`,
`docs/architecture.md`, `docs/README.md`, or the code itself.

### Phase A — README hero finish-up

- Renders `docs/demos/incident-response.cast` to light + dark hero SVGs via `svg-term-cli`.
- Adds the JetBrains Mono fonts (SIL OFL 1.1) + a deterministic `scripts/render-og-card.ts` resvg-js renderer.
- Authors `docs/assets/og-card.svg` (1200×630) + renders `docs/og-card.png`.
- Adds the `og-card-render` CI gate to `.github/workflows/docs-quality.yml` — fails if `docs/og-card.png` diverges from the committed render.
- Embeds the cast SVGs in the README hero via `<picture>` + `prefers-color-scheme` media queries.

### Phase B — `docs/superpowers/` cleanup

- Deletes 24 shipped plan files (everything except the in-flight `2026-05-15-phase-5-t6-pr2-tool-call-log-review-feedback.md`).
- Deletes 24 shipped spec / spec-review files.
- Keeps: T6 design + T6 review-feedback + T6 PR 2 review-feedback (in-flight); Phase 7 / 8 / 9 / 14 future-design specs.
- Net `docs/superpowers/` reduction: 48 files (~88% of the directory).

## Accessibility checklist

- [ ] **Dark + light theme** — Viewed the rendered README in GitHub dark theme and light theme. Wordmark, cast, architecture diagrams, connector logos, OG preview all render correctly in both. Screenshots in this PR.
- [ ] **Mobile rendering** — Opened the rendered README on iOS Safari (or Android Chrome). The cast image stacks above the pitch prose; connector logo grid does not produce horizontal scroll; badge row wraps cleanly. Screenshots in this PR.
- [ ] **Screen reader pass** — VoiceOver (macOS) and/or NVDA (Windows) reads the page top-to-bottom in the expected order: wordmark → headline → subhead → trust line → cast alt text → CTAs → §2 problem → ... No SVG asset is skipped due to missing alt text.
- [ ] **Color contrast** — Ran axe DevTools on the rendered GitHub README. All text passes WCAG AA at 4.5:1 minimum. Accent `#7c3aed` on dark `#0d1117` and on white `#ffffff` both pass (7.04:1 per webaim).

## Manual post-merge step

After merge, navigate to repo settings → Social preview and upload `docs/og-card.png` (https://github.com/nimbus-agent/Nimbus/settings#social-preview).

Verify the upload by pasting `https://github.com/nimbus-agent/Nimbus` into:
- Slack (paste in any channel — should show the new card).
- Twitter's card debugger: https://opengraph.xyz/?url=https://github.com/nimbus-agent/Nimbus

This is the one piece of this sub-project that cannot be automated by CI (repo admin only).

## Validation follow-up

Open a tracking issue post-merge: "README hero redesign — qualitative validation". Body:

> Show the rendered page to three SRE/Platform engineers (no prior Nimbus context) and ask each: "What does this product do?"
>
> Success criteria (from the 2026-05-11 spec §9):
> - All three describe Nimbus as "incident context across tools, local" or close paraphrase.
> - At least two complete the install command on first read.
>
> Capture feedback in this issue. If two or more subjects fail either criterion, file follow-up issues for the specific points of confusion.

Label: `validation`, `documentation`, `phase-5`. Assignee: the PR author.
EOF
```

- [ ] **Step 2: Verify the scratch file is gitignored**

```bash
git check-ignore -v docs/.scratch-pr-body.md
```

Expected: a `.gitignore` rule matches. If not, append `docs/.scratch-*` to `.gitignore` in a separate commit before continuing (out-of-scope housekeeping if it isn't there).

If you'd rather not touch `.gitignore`, write the file outside the repo (`/tmp/pr-body.md`) instead.

- [ ] **Step 3: No commit** — the scratch file is the staging ground for Task 11 (`gh pr create --body @docs/.scratch-pr-body.md`). It is not committed.

---

## Task 9 — Classify every plan + spec, salvage orphan info (Phase B preflight)

**Files:** none modified in this task — read-only audit.

- [ ] **Step 1: Build the classification table**

Walk through every file in `docs/superpowers/plans/` and `docs/superpowers/specs/` and confirm the classification below. For each entry marked "shipped", verify by spot-checking that the named artifact exists in the working tree.

**Plans (24 files on main, 23 to delete):**

| File | Verify artifact | Disposition |
|---|---|---|
| `2026-05-06-phase-5-sequencing-review.md` | `docs/roadmap.md` Phase 5 sequencing section | DELETE |
| `2026-05-06-phase-5-sequencing.md` | same | DELETE |
| `2026-05-09-phase-5-t3-pr2-impact.md` | `packages/cli/src/commands/impact.ts` exists | DELETE |
| `2026-05-09-phase-5-t3-pr3-catchup-review.md` | `packages/cli/src/commands/catchup.ts` exists | DELETE |
| `2026-05-09-phase-5-t3-pr3-catchup.md` | same | DELETE |
| `2026-05-10-phase-5-wave-a-pr1-openapi-indexer-review.md` | `packages/gateway/src/connectors/openapi-indexer-sync.ts` exists | DELETE |
| `2026-05-10-phase-5-wave-a-pr1-openapi-indexer.md` | same | DELETE |
| `2026-05-10-phase-5-wave-a-pr2-obsidian-review.md` | `packages/gateway/src/connectors/obsidian-sync.ts` exists | DELETE |
| `2026-05-10-phase-5-wave-a-pr2-obsidian.md` | same | DELETE |
| `2026-05-11-phase-5-t4-pr2-dora-metrics-review.md` | `packages/gateway/src/metrics/dora.ts` exists | DELETE |
| `2026-05-11-phase-5-t4-pr2-dora-metrics.md` | same | DELETE |
| `2026-05-11-readme-hero-redesign.md` | This very PR closes it (`docs/README.md` rewrite + 6 outstanding tasks finished) | DELETE |
| `2026-05-12-phase-5-t4-pr3a-preflight-review-feedback.md` | `packages/gateway/src/preflight/preflight.ts` exists | DELETE |
| `2026-05-12-phase-5-t4-pr3a-preflight.md` | same | DELETE |
| `2026-05-13-phase-5-t4-pr3b-annotation-review.md` | `packages/gateway/src/deployment/annotate.ts` exists | DELETE |
| `2026-05-13-phase-5-t4-pr3b-annotation.md` | same | DELETE |
| `2026-05-13-sub-project-C-community-pack.md` | Verify via `git log --oneline --grep="sub-project C"` — if a merge commit exists on main, DELETE; else KEEP and flag in PR description | DELETE if shipped, else KEEP |
| `2026-05-14-phase-5-t4-pagerduty-enrichment-review-feedback.md` | `packages/gateway/src/connectors/pagerduty-sync.ts` recent commits | DELETE |
| `2026-05-14-phase-5-t4-pagerduty-enrichment.md` | same | DELETE |
| `2026-05-14-phase-5-t6-pr1-i10-helpers-review-feedback.md` | `packages/gateway/src/util/timing-safe-compare.ts` exists (PR #292 merged) | DELETE |
| `2026-05-14-phase-5-t6-pr1-i10-helpers.md` | same | DELETE |
| `2026-05-14-sub-project-D-phase-2-benchmark-publishing.md` | `packages/docs/` perf integration on main (verify via `git log`) | DELETE |
| `2026-05-14-sub-project-D-phase-3-cast-tripwire-review.md` | `scripts/cast-driver/` exists (PR #293 merged) | DELETE |
| `2026-05-14-sub-project-D-phase-3-cast-tripwire.md` | same | DELETE |
| `2026-05-15-phase-5-t6-pr2-tool-call-log-review-feedback.md` | T6 PR 2 is in-flight (no `packages/gateway/src/db/tool-call-log.ts` on main) | **KEEP** |

**Specs (30 files on main, 23 to delete):**

| File | Disposition |
|---|---|
| `2026-05-06-phase-5-sequencing-design.md` | DELETE |
| `2026-05-07-phase-5-t3-team-intelligence-design.md` | DELETE |
| `2026-05-07-phase-5-t3-team-intelligence-review-feedback.md` | DELETE |
| `2026-05-10-phase-14-agent-evolution-design.md` | **KEEP** — future phase |
| `2026-05-10-phase-5-t4-cicd-data-layer-design.md` | DELETE |
| `2026-05-10-phase-5-t4-cicd-data-layer-review-feedback.md` | DELETE |
| `2026-05-10-phase-5-wave-a-api-surface-obsidian-design-review.md` | DELETE |
| `2026-05-10-phase-5-wave-a-api-surface-obsidian-design.md` | DELETE |
| `2026-05-10-phase-7-engineering-excellence-design.md` | **KEEP** — future phase |
| `2026-05-10-phase-8-security-engineering-design.md` | **KEEP** — future phase |
| `2026-05-10-phase-9-ai-engineering-loop-design.md` | **KEEP** — future phase |
| `2026-05-11-readme-hero-redesign-design.md` | DELETE — this PR closes it |
| `2026-05-11-roadmap-expansion-design.md` | DELETE — roadmap.md is the authoritative output |
| `2026-05-11-roadmap-expansion-ii-design.md` | DELETE — same |
| `2026-05-12-phase-5-t4-pr3a-preflight-design.md` | DELETE |
| `2026-05-12-phase-5-t4-pr3a-preflight-review-feedback.md` | DELETE |
| `2026-05-12-sub-project-B-docs-publish-design-review.md` | Verify shipped (`packages/docs/` exists on main); DELETE if so |
| `2026-05-12-sub-project-B-docs-publish-design.md` | DELETE if shipped |
| `2026-05-12-sub-project-C-community-pack-design-review.md` | DELETE if sub-project C shipped; KEEP otherwise |
| `2026-05-12-sub-project-C-community-pack-design.md` | DELETE if shipped |
| `2026-05-13-phase-5-t4-pr3b-annotation-design-review.md` | DELETE |
| `2026-05-13-phase-5-t4-pr3b-annotation-design.md` | DELETE |
| `2026-05-13-sub-project-D-cicd-visibility-design.md` | DELETE |
| `2026-05-14-phase-5-t4-pagerduty-enrichment-design.md` | DELETE |
| `2026-05-14-phase-5-t4-pagerduty-enrichment-review-feedback.md` | DELETE |
| `2026-05-14-phase-5-t6-design.md` | **KEEP** — T6 PR 2/3/4 still pending |
| `2026-05-14-phase-5-t6-review-feedback.md` | **KEEP** — same |
| `2026-05-14-sub-project-D-phase-2-benchmarks-design.md` | DELETE |
| `2026-05-14-sub-project-D-phase-3-cast-tripwire-design-review.md` | DELETE |
| `2026-05-14-sub-project-D-phase-3-cast-tripwire-design.md` | DELETE |

Note: the T6 PR 2 design (`2026-05-15-phase-5-t6-pr2-tool-call-log-design.md`) lives on a different branch and is not on main — it does not appear in this inventory and is not affected.

- [ ] **Step 2: Verify uncertain entries**

For each entry above marked "DELETE if shipped", run a verification:

```bash
# Sub-project B (docs publish):
git log --oneline --all --grep="sub-project B\|docs publish" | head -5
ls packages/docs/astro.config.mjs 2>/dev/null && echo "docs site exists"

# Sub-project C (community pack):
git log --oneline --all --grep="sub-project C\|community pack" | head -5
ls .github/ISSUE_TEMPLATE/ 2>/dev/null | head -5
```

If the verification produces evidence of shipped work, mark the entry as DELETE. If it doesn't, mark as KEEP and note in the PR description that the cleanup is deferred for that file.

- [ ] **Step 3: Salvage scan**

For each file marked DELETE, run a grep to confirm no other file references it:

```bash
for f in $(ls docs/superpowers/plans/*.md docs/superpowers/specs/*.md | grep -vE "phase-(7|8|9|14)|t6-design|t6-review-feedback|t6-pr2-tool-call-log-review-feedback"); do
  base=$(basename "$f")
  refs=$(grep -rn --include="*.md" --include="*.ts" --include="*.json" --include="*.yml" "$base" . 2>/dev/null | grep -v "^$f:" | grep -v node_modules | grep -v .worktrees)
  if [ -n "$refs" ]; then
    echo "=== $base is referenced ==="
    echo "$refs"
    echo
  fi
done
```

For each reference found, evaluate:
- Reference in another spec/plan that's ALSO being deleted → no action.
- Reference in a kept file (`roadmap.md`, `architecture.md`, future-phase spec) → update the reference: either link to the merged PR (`#NNN`) or remove the link entirely and inline the relevant fact.

- [ ] **Step 4: Orphan-info pass**

For each plan/spec marked DELETE, read its "Summary" / "Outcomes" / "Net effect" section and verify the facts are captured in `docs/roadmap.md`. Most plans should produce zero new doc content — `roadmap.md` is the canonical "what shipped" record. Where a fact is missing, add a one-line entry to the appropriate `docs/roadmap.md` Phase 5 section.

Expected outcome: zero or one bullet added to `roadmap.md`. If salvage produces more than three bullets across all deletions, stop — the underlying issue is that `roadmap.md` is out of date, which is its own concern not handled by this plan.

- [ ] **Step 5: No commit** — orphan-info-pass edits to `roadmap.md` (if any) are bundled into Task 10's deletion commit.

---

## Task 10 — Execute the deletions (Phase B git rm)

**Files:**
- Delete: 23 plan files (or 22 if a "DELETE if shipped" turned KEEP).
- Delete: 23 spec / spec-review files (or fewer if uncertain entries turned KEEP).
- Modify: `docs/roadmap.md` (if Task 9 Step 4 added bullets).
- Modify: `CLAUDE.md` (status line update).
- Modify: `.claude/commands/nimbus-file-map.md` (asset rows).

- [ ] **Step 1: Delete the plan files in a single batch**

```bash
git rm docs/superpowers/plans/2026-05-06-phase-5-sequencing-review.md \
       docs/superpowers/plans/2026-05-06-phase-5-sequencing.md \
       docs/superpowers/plans/2026-05-09-phase-5-t3-pr2-impact.md \
       docs/superpowers/plans/2026-05-09-phase-5-t3-pr3-catchup-review.md \
       docs/superpowers/plans/2026-05-09-phase-5-t3-pr3-catchup.md \
       docs/superpowers/plans/2026-05-10-phase-5-wave-a-pr1-openapi-indexer-review.md \
       docs/superpowers/plans/2026-05-10-phase-5-wave-a-pr1-openapi-indexer.md \
       docs/superpowers/plans/2026-05-10-phase-5-wave-a-pr2-obsidian-review.md \
       docs/superpowers/plans/2026-05-10-phase-5-wave-a-pr2-obsidian.md \
       docs/superpowers/plans/2026-05-11-phase-5-t4-pr2-dora-metrics-review.md \
       docs/superpowers/plans/2026-05-11-phase-5-t4-pr2-dora-metrics.md \
       docs/superpowers/plans/2026-05-11-readme-hero-redesign.md \
       docs/superpowers/plans/2026-05-12-phase-5-t4-pr3a-preflight-review-feedback.md \
       docs/superpowers/plans/2026-05-12-phase-5-t4-pr3a-preflight.md \
       docs/superpowers/plans/2026-05-13-phase-5-t4-pr3b-annotation-review.md \
       docs/superpowers/plans/2026-05-13-phase-5-t4-pr3b-annotation.md \
       docs/superpowers/plans/2026-05-14-phase-5-t4-pagerduty-enrichment-review-feedback.md \
       docs/superpowers/plans/2026-05-14-phase-5-t4-pagerduty-enrichment.md \
       docs/superpowers/plans/2026-05-14-phase-5-t6-pr1-i10-helpers-review-feedback.md \
       docs/superpowers/plans/2026-05-14-phase-5-t6-pr1-i10-helpers.md \
       docs/superpowers/plans/2026-05-14-sub-project-D-phase-2-benchmark-publishing.md \
       docs/superpowers/plans/2026-05-14-sub-project-D-phase-3-cast-tripwire-review.md \
       docs/superpowers/plans/2026-05-14-sub-project-D-phase-3-cast-tripwire.md
```

If `2026-05-13-sub-project-C-community-pack.md` was verified shipped in Task 9 Step 2, add it to the batch.

- [ ] **Step 2: Delete the spec files in a single batch**

```bash
git rm docs/superpowers/specs/2026-05-06-phase-5-sequencing-design.md \
       docs/superpowers/specs/2026-05-07-phase-5-t3-team-intelligence-design.md \
       docs/superpowers/specs/2026-05-07-phase-5-t3-team-intelligence-review-feedback.md \
       docs/superpowers/specs/2026-05-10-phase-5-t4-cicd-data-layer-design.md \
       docs/superpowers/specs/2026-05-10-phase-5-t4-cicd-data-layer-review-feedback.md \
       docs/superpowers/specs/2026-05-10-phase-5-wave-a-api-surface-obsidian-design-review.md \
       docs/superpowers/specs/2026-05-10-phase-5-wave-a-api-surface-obsidian-design.md \
       docs/superpowers/specs/2026-05-11-readme-hero-redesign-design.md \
       docs/superpowers/specs/2026-05-11-roadmap-expansion-design.md \
       docs/superpowers/specs/2026-05-11-roadmap-expansion-ii-design.md \
       docs/superpowers/specs/2026-05-12-phase-5-t4-pr3a-preflight-design.md \
       docs/superpowers/specs/2026-05-12-phase-5-t4-pr3a-preflight-review-feedback.md \
       docs/superpowers/specs/2026-05-13-phase-5-t4-pr3b-annotation-design-review.md \
       docs/superpowers/specs/2026-05-13-phase-5-t4-pr3b-annotation-design.md \
       docs/superpowers/specs/2026-05-13-sub-project-D-cicd-visibility-design.md \
       docs/superpowers/specs/2026-05-14-phase-5-t4-pagerduty-enrichment-design.md \
       docs/superpowers/specs/2026-05-14-phase-5-t4-pagerduty-enrichment-review-feedback.md \
       docs/superpowers/specs/2026-05-14-sub-project-D-phase-2-benchmarks-design.md \
       docs/superpowers/specs/2026-05-14-sub-project-D-phase-3-cast-tripwire-design-review.md \
       docs/superpowers/specs/2026-05-14-sub-project-D-phase-3-cast-tripwire-design.md
```

If the sub-project B + C specs were verified shipped, add them to the batch:

```bash
git rm docs/superpowers/specs/2026-05-12-sub-project-B-docs-publish-design-review.md \
       docs/superpowers/specs/2026-05-12-sub-project-B-docs-publish-design.md \
       docs/superpowers/specs/2026-05-12-sub-project-C-community-pack-design-review.md \
       docs/superpowers/specs/2026-05-12-sub-project-C-community-pack-design.md
```

- [ ] **Step 3: Verify the kept files**

```bash
ls docs/superpowers/plans/
ls docs/superpowers/specs/
```

Expected `plans/` contents (1 file):
```
2026-05-15-phase-5-t6-pr2-tool-call-log-review-feedback.md
```

Expected `specs/` contents (7 files):
```
2026-05-10-phase-14-agent-evolution-design.md
2026-05-10-phase-7-engineering-excellence-design.md
2026-05-10-phase-8-security-engineering-design.md
2026-05-10-phase-9-ai-engineering-loop-design.md
2026-05-14-phase-5-t6-design.md
2026-05-14-phase-5-t6-review-feedback.md
```

(Note: `2026-05-15-phase-5-t6-pr2-tool-call-log-review-feedback.md` lives in `plans/` per the inventory, not `specs/`. The T6 PR 2 design itself is on a separate branch and not on main, so it doesn't appear here.)

If any kept file is missing, restore it:

```bash
git checkout HEAD~ -- docs/superpowers/<...>
```

- [ ] **Step 4: Update CLAUDE.md status line**

Edit `CLAUDE.md` to extend the `Status:` line at the top with `Sub-project A ✅ (2026-05-15) · docs/superpowers/ pruned (2026-05-15)`. Specifically, find the line:

```
**Status:** Phase 4 ✅ Complete · Phase 5 (Extended Surface) 🔵 Active · ... · T6 sequencing spec ✅ (2026-05-14) · ...
```

and add the two new markers in chronological position (after `T6 sequencing spec ✅ (2026-05-14)` and before the `v0.1.0 released ...` clause).

- [ ] **Step 5: Update file-map**

Edit `.claude/commands/nimbus-file-map.md`. Under the "Top-level docs" section, add a row for `docs/og-card.png`. Under a new (or existing) "Assets" subsection, add rows for:

- `docs/assets/og-card.svg` — OG social card source (1200×630, JetBrains Mono)
- `docs/assets/fonts/JetBrainsMono-{Regular,Bold}.ttf` — deterministic OG render fonts (SIL OFL 1.1)
- `docs/assets/hero-cast-{light,dark}.svg` — rendered asciinema cast (`docs/demos/incident-response.cast` → svg-term-cli)
- `scripts/render-og-card.ts` — `bun run render:og-card` — resvg-js renderer

- [ ] **Step 6: Verify all gates still pass after deletion**

```bash
bun run lint:markdown
bunx --bun @lycheeverse/lychee --config lychee.toml 'docs/**/*.md' '*.md'
bun run audit:svg-assets
bun run audit:readme-cli
```

If `lychee` fails with broken-link errors pointing at deleted plan/spec files, the salvage scan in Task 9 Step 3 missed a reference. Find the offending file (the one with the broken link) and either:
- Remove the link entirely.
- Replace it with the merged PR number (`#NNN`).
- Replace with an inline note describing the salvaged fact.

- [ ] **Step 7: Commit Phase B**

```bash
git add -A
git commit -m "$(cat <<'EOF'
docs(superpowers): prune 47 shipped plans + specs; keep future + in-flight

Plans deleted (23): every plan whose underlying work has merged to main.
Includes the just-closed README hero plan (sub-project A — closed by
this PR's Phase A commits) and the four other sub-projects (B, C, D
phases 2 + 3 — sub-projects B and C verified shipped via repo state).

Specs deleted (24): every spec whose work has merged. Roadmap-expansion
design specs are also gone — `docs/roadmap.md` is the authoritative
output.

Kept:
- plans/ — one in-flight review-feedback (T6 PR 2 tool-call-log)
- specs/ — Phase 7 / 8 / 9 / 14 future designs; T6 design + review
  (PRs 2/3/4 still pending)

Net `docs/superpowers/` reduction: 47 files (~85% of the directory).

Also:
- Update CLAUDE.md status line: Sub-project A ✅; docs/superpowers/
  pruned.
- Update `.claude/commands/nimbus-file-map.md` with the new asset rows
  (OG card, hero casts, render script, fonts).
- `docs/roadmap.md`: any salvaged orphan info (typically empty — most
  facts were already there).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11 — Full CI parity check + push + PR

**Files:** none modified.

- [ ] **Step 1: Run full CI parity**

```bash
bun run test:ci
```

This runs the same sequence as `.github/workflows/_test-suite.yml`. Expected: all gates green. If any non-docs gate fails, the failure is likely:
- `nimbus-vscode` typecheck — pre-existing on main, ignored (the original session notes call this out).
- `bun run test:scripts` ps1 — pre-existing on main, ignored.
- Anything else — stop and triage; do not push until resolved.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin dev/asafgolombek/readme-hero-completion
```

Expected: `[new branch]` line in the push output. If push is rejected for non-FF reasons, run `git fetch origin main && git rebase origin/main` and retry — main may have moved.

- [ ] **Step 3: Open the PR**

```bash
gh pr create \
  --title "feat(docs): finish README hero v0.2 + prune docs/superpowers/ (47 files)" \
  --body "$(cat docs/.scratch-pr-body.md)" \
  --base main
```

Take the PR URL from the output. Open it in a browser to confirm:
- All checkboxes from `docs/.scratch-pr-body.md` rendered correctly.
- The PR shows ~50 files changed (8 added + 5 modified + 47 deleted = 60).

- [ ] **Step 4: Verify CI checks list**

```bash
sleep 30 && gh pr checks <PR_NUMBER>
```

Confirm the docs-quality jobs are present and running:
- `Docs Quality / lychee link check`
- `Docs Quality / markdownlint-cli2`
- `Docs Quality / SVG asset audit`
- `Docs Quality / README CLI-command tripwire`
- `Docs Quality / OG card render` (new — added by this PR)
- `Docs Quality / Cast transcript tripwire` (existing — should stay green since the cast hash is unchanged)
- `Docs Quality / Starlight build test`

If `OG card render` is missing, the workflow YAML edit in Task 5 didn't take effect — check the diff and re-push.

- [ ] **Step 5: Clean up the scratch file**

```bash
rm docs/.scratch-pr-body.md
```

This was a gitignored scratch staging artifact for the PR body.

- [ ] **Step 6: Final commit (if any cleanup-after-CI fixes were needed)**

If CI flagged anything that requires a fix-up commit, write it now with a `fix(docs):` prefix. Otherwise, no further commits.

---

## Summary

This PR closes the 2026-05-11 README hero redesign sub-project by finishing its last six outstanding tasks (asciinema cast SVG render, OG card source + PNG + CI gate, README hero embed, full docs-quality run, accessibility checklist staging, post-merge upload + qualitative-validation notes) AND prunes 47 completed plan / spec files from `docs/superpowers/`, leaving only in-flight T6 PR 2 work and four future-phase design specs (Phase 7 / 8 / 9 / 14).

Net delta:
- **+8 files** (2 cast SVGs, 2 fonts + license, 1 OG card SVG, 1 OG card PNG, 1 render script, 1 plan file [this one — but see "Out of scope" below]).
- **~5 files modified** (README hero, package.json, docs-quality workflow, CLAUDE.md status line, file-map).
- **−47 files** (23 plans + 24 specs).
- **One new CI gate**: `Docs Quality / OG card render` — fails if the PNG diverges from the SVG.

## Test plan

- [ ] `bun run lint:markdown` — 0 errors after Phase A README change + Phase B deletions.
- [ ] `bun run audit:svg-assets` — passes for the two new cast SVGs and the OG card source.
- [ ] `bun run audit:readme-cli` — passes (no new CLI commands referenced).
- [ ] `bunx --bun @lycheeverse/lychee --config lychee.toml 'docs/**/*.md' '*.md'` — 0 broken links (salvage scan in Task 9 Step 3 caught all cross-references to deleted plans).
- [ ] `bun run render:og-card && git diff --exit-code docs/og-card.png` — 0 diff (determinism contract).
- [ ] `bun run test:ci` — all gates green (the pre-existing `nimbus-vscode` typecheck and ps1 test issues are documented as out-of-scope and ignored).
- [ ] CI on the opened PR: the 7 docs-quality jobs (including the new `OG card render`) all green.

## Out of scope

- **Re-recording `docs/demos/incident-response.cast`** — the cast is already committed; this PR renders the existing recording. If the cast turns out to need re-recording (wrong content, wrong timing), file a follow-up — that work is closer to a Phase 6 demo refresh than this hero-closeout PR.
- **OG card visual polish beyond the spec minimum** — the original Task 3.5 Step 1 suggested embedding a cast thumbnail on the right of the OG card. This plan ships the simpler text-only layout that meets the spec's "wordmark + headline + trust strip" minimum and renders deterministically. A follow-up can add the thumbnail once we have a reduced-size `og-card-cast-thumb.svg` (the full hero cast SVG is too large to inline).
- **Deleting this plan itself** — by the rule that completed plans get pruned, this very plan will be a deletion candidate after the PR merges. The next cleanup pass (or the PR-merger themselves) can `git rm` it from main. Not done here to keep the PR's deletion list audit-friendly.
- **Updating `GEMINI.md`** — `GEMINI.md` mirrors `CLAUDE.md`; the status-line edit in Task 10 Step 4 lands in `CLAUDE.md` only. If GEMINI.md is in sync today, this PR introduces a one-line drift that should be folded into the next general docs sweep. (Out of scope here to keep the diff focused on docs/.)
- **Sub-project C verification** — Task 9 Step 2 hands this to the executor. If sub-project C is not yet shipped, its plan + spec entries stay in `docs/superpowers/` and the deletion lists shrink accordingly. The plan accommodates either outcome.

## Self-review of this plan

**Spec coverage:** the original 2026-05-11 plan's outstanding tasks are Tasks 3.2 (cast render), 3.5 (OG card), 5.1 (full suite), 5.2 (accessibility), 5.3 (manual upload), 5.4 (qualitative follow-up). Mapping to this plan:
- Task 3.2 → Task 2 (render cast).
- Task 3.5 → Tasks 3 + 4 + 5 (fonts + SVG + render script + CI gate).
- Task 5.1 → Task 7 (run the full suite).
- Task 5.2 → Task 8 Step 1 (accessibility checklist in the PR body).
- Task 5.3 → Task 8 Step 1 (manual upload note in the PR body).
- Task 5.4 → Task 8 Step 1 (qualitative follow-up note in the PR body, opened post-merge).

Phase B coverage: every plan + spec file under `docs/superpowers/` is classified in Task 9 Step 1's table. The salvage step (Task 9 Step 4) is bounded — "more than three bullets → stop, it's an out-of-date-roadmap problem".

**Placeholder scan:** none. Every step has a runnable command or an exact code block.

**Type consistency:** the `render:og-card` script name is consistent across `package.json` (Task 4 Step 2), the CI job (Task 5 Step 3), and the verification commands (Tasks 7 / 11). The font path constant `FONT_DIR = "docs/assets/fonts"` is consistent across the render script and the font checkin step.

**Cross-task consistency:** Tasks 2 and 3 produce files that Task 6 embeds (cast SVGs) and Tasks 4 + 5 reference (the renderer reads `docs/assets/og-card.svg` written in Task 3; the CI gate runs the renderer written in Task 4). The commit topology is: Task 2 → Task 4 (combines 3+4) → Task 5 → Task 6 → Task 10 (Phase B). Six commits total in the PR, mirroring the cadence of the closed-out 2026-05-11 plan.
