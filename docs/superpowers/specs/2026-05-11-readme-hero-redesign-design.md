# README hero redesign — design

**Sub-project A** of the repo-improvement program. Decomposes from the brainstorming session on 2026-05-11.

| | |
|---|---|
| **Branch** | `dev/asafgolombek/readme-hero-redesign` |
| **Worktree** | `.claude/worktrees/dev+asafgolombek+readme-hero-redesign` |
| **Sequence** | A (this) → B (docs site) → C (contributor onramp) → D (CI/CD visibility) → E (discoverability) |
| **Folded into B** | F (Wiki strategy), G (per-package READMEs) |

## 1. Context

The current root README (`docs/README.md`, 749 lines) does the work of both a README *and* a documentation site in a single file. The Starlight docs site under `packages/docs/` exists but is not yet published. The result: the README is encyclopedic, scans poorly, and burns the first-time visitor's attention on installation novellas, eight redundant example sessions, exhaustive tech stack tables, and a 16-section structure.

`v0.1.0` is a strong release — 12 wired security invariants, three-OS CI matrix, Scorecard + Provenance + SBOM, audit-log chained signing, structural HITL. The substance is there. **The README's failure is making that substance scan-able at first contact.**

Sub-project A is a focused redesign of the root README and its supporting hero assets. It does not build the docs site (that is B), does not touch CI signal surfacing (that is D), and does not change per-package READMEs (folded into B).

## 2. Audience priority

From the brainstorming session, in order:

1. **Potential users** (DevOps / SRE / SecOps / Platform / Data Eng) evaluating adoption.
2. **OSS contributors** considering a PR or connector.
3. **Investors / partners / acquirers** evaluating commercial potential.

## 3. Goals

- A first-time visitor understands the product in under 30 seconds.
- The install command works on first read; no second-pass required.
- The README is ≤ 300 lines (target ~280).
- One demo asset (asciinema cast) does the work of eight example bash snippets.
- Trust signals (AGPL, OS keystore, structural HITL, audit log) land in one paragraph with two links — not a 30-line section.
- All assets render correctly under: GitHub light theme, GitHub dark theme, GitHub mobile renderer, no-JavaScript, and screen readers.
- Every claim in the README is traceable to a runnable command or a committed test. No marketing-language inflation.

## 4. Non-goals

- Building the Starlight docs site (sub-project B).
- Per-package README polish (sub-project B → G follow-up).
- GitHub topics, awesome-list submissions (sub-project E).
- Status pages, public benchmark publishing, automated changelog (sub-project D).
- Changing the Wiki configuration (decided as part of B).
- Replacing the `☁️` cloud emoji with a custom-designed logo. Reserved as a future project once a designer is engaged.
- Changing any code in `packages/`. This sub-project is documentation, prose, and asset only.

## 5. Design overview

### 5.1 Hero shape

The hero adopts a **product-led split layout** (Option B from the brainstorm): pitch on the left, embedded asciinema cast on the right.

```
☁️ Nimbus                            ┌────────────────────────────────────┐
On-call intelligence. Local-first.   │ $ nimbus ask "what changed?"       │
                                     │ ▸ PagerDuty: P1 — 8m ago           │
[docs] [release] [license] [Phase 5] │ ▸ Last deploy: v2.14.1 — 23m ago   │
                                     │ ▸ PR #312 @elena                   │
Cross-service incident context in    │ ⚠ Post to #incidents? [y/n]: y     │
under 100ms. Consent-gated           │   ✅ Posted.                       │
automation. Your credentials never   │                                    │
leave the machine.                   │ ▶ play recording (asciinema)       │
                                     └────────────────────────────────────┘
[Install]  [Docs]
```

### 5.2 README structure — "Punchy" depth

Target ~280 lines, 8 sections.

| § | Section | Lines | Job |
|---|---|---|---|
| **1** | Hero | ~30 | Wordmark, headline, 1-line subhead, badge row (4), split layout (pitch + cast), two CTAs, credential footnote |
| **2** | The problem | ~25 | 3 bullets — incident response / CVE exposure / data lineage. Each ends with the one-line answer Nimbus gives |
| **3** | How it works | ~30 | One paragraph + Mermaid flowchart: 27 connectors → SQLite index → engine + HITL → CLI/UI/voice. Names "local", "consent-gated", "MCP" |
| **4** | Quick start | ~40 | One install command per OS (`<details>` for non-default platforms), then `nimbus connector auth github && nimbus ask "..."` |
| **5** | Connectors | ~30 | Two-row grayscale logo grid (shipped, planned) |
| **6** | Trust & security | ~20 | One paragraph naming OS keystore, structural HITL, AGPL, audit log. Two links: SECURITY.md, SECURITY-INVARIANTS.md |
| **7** | Roadmap | ~15 | 5-row table, current row highlighted |
| **8** | Contributing · License · footer | ~25 | One paragraph each, footer nav |
| | **Slack** | ~65 | Frontmatter, dividers, asides |
| | **Total** | **~280** | |

### 5.3 What gets cut and where it goes

| Removed from README | Destination |
|---|---|
| 7 of 8 example bash snippets | Hero cast covers incident response; others move to `docs/examples.md` (later surfaced on docs site B) |
| "Who It's For" role table | `docs/audiences.md` |
| "Why Engineers Choose Nimbus" — 4 sub-sections | Collapses into §2 (problem) and §6 (trust); performance table moves to `docs/performance.md` with link to CI-published benches (sub-project D) |
| "What's in v0.1.0" full delivery list | Link to release notes; one-line summary remains |
| Tech Stack table | `docs/architecture.md` already has this — link from README |
| Cross-Platform table | `docs/cross-platform.md` (extracted) |
| Project Structure tree | `docs/architecture.md` (already covered) |
| Testing section | `docs/testing.md` (extracted) |
| Publishing Releases | `docs/release/` (already exists) |
| Full Pricing table | One-paragraph footnote; full table → `nimbus-agent.dev/pricing` |
| Extensions section | One-line + link to `docs/contributors/extension-author-walkthrough.md` |

### 5.4 Visual identity

| Asset | Decision | Source path | Notes |
|---|---|---|---|
| Wordmark | Custom SVG + ☁️ emoji | `docs/assets/nimbus-wordmark.svg` | JetBrains Mono rendered to SVG. Dark + light variants via `<picture>` |
| Badge row | 4 badges, fixed order | inline in `docs/README.md` | docs · release · license · status |
| Hero cast | Static SVG poster + asciinema.org link | `docs/demos/incident-response.cast` (source) + `docs/assets/hero-cast.svg` (rendered) | Re-renderable from `.cast` via `svg-term-cli` |
| §3 diagram | Mermaid flowchart | inline in `docs/README.md` | ~12 lines of mermaid source |
| Connector grid | Two-row table of grayscale SVG logos | `docs/assets/connectors/<name>.svg` | Logos sourced from each service's brand guidelines |
| OG / social card | 1200×630 PNG, SVG source | `docs/assets/og-card.svg` (source), `docs/og-card.png` (rendered) | CI step renders PNG; repo settings → Social preview points to the PNG |

### 5.5 Color & typography

- Single accent color: **`#7c3aed`** (the `blueviolet` already in the docs badge). Used for the wordmark, cast prompt color, badge accent, OG card highlight. No additional palette.
- Cast theme: tuned variant of `solarized-dark` with `#7c3aed` for the `nimbus` prompt. No fake macOS chrome.
- Typography: GitHub-default for prose. JetBrains Mono (SVG-rendered) for the wordmark only.

## 6. Asciinema cast — content & production

**Scenario:** Incident response — *"the payment-service alert just fired — what changed in the last 2 hours?"*

**Why this scenario:** Universal across SRE, Platform, and SecOps audiences. Demonstrates local-first speed (sub-100ms cross-service correlation) **and** the structural HITL gate (the consent prompt before posting to Slack) in one narrative arc. Most viscerally familiar pain.

**Constraints:**

- Duration: ~18 seconds.
- Terminal size: 90 columns × 24 rows (does not overflow GitHub's rendered width on mobile).
- Recording: real time, no fast-forward fakery, no synthetic typing.
- Theme: tuned `solarized-dark` with the `#7c3aed` accent.
- No personally identifiable data in the cast — uses fixture service names already in the README (`payment-service`, `#incidents`, `@elena`).

**Output artifacts:**

| File | Purpose |
|---|---|
| `docs/demos/incident-response.cast` | Asciinema source — checked in, re-renderable |
| `docs/assets/hero-cast-light.svg` | Static poster, light theme |
| `docs/assets/hero-cast-dark.svg` | Static poster, dark theme |
| asciinema.org upload | Live scrubbable playback target |

**README embed:**

```html
<a href="https://asciinema.org/a/<id>" title="Play recording">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/hero-cast-dark.svg">
    <img src="docs/assets/hero-cast-light.svg" alt="nimbus ask 'payment-service alert — what changed?' — incident response in 18 seconds">
  </picture>
</a>
```

## 7. Accessibility requirements

Non-negotiable. Verify each before merge.

| Concern | Requirement | Verification |
|---|---|---|
| No-JS rendering | All hero assets must render statically — no JS-dependent components | `curl https://github.com/nimbus-agent/Nimbus | grep -c '<img'` matches asset count |
| Dark mode | Every SVG asset has light + dark variants via `<picture>` | Manual: toggle GitHub theme, verify each asset |
| Mobile | Connector grid degrades to flowed list; no fixed-width tables | Open README on phone (iOS Safari + Android Chrome) |
| Alt text | Cast SVG: full descriptive alt; wordmark: `"Nimbus"`; OG card: full descriptive in meta tag | Manual review of each `<img>` |
| Screen reader | Page reads: wordmark → headline → subhead → trust line → cast description → CTAs | VoiceOver (macOS) and NVDA (Windows) pass |
| Color contrast | `#7c3aed` on dark and on white passes WCAG AA 4.5:1 for normal text | axe DevTools or webaim.org/resources/contrastchecker |

## 8. Validation pipeline (CI additions)

These additions land alongside the README content changes in this sub-project. They are minimal and Ubuntu-only — the existing `pr-quality` job is the host.

1. **`lychee` link checker** — extend the existing `audit:doc-references` step or add a new job. Fails on any broken link in `README.md`, `docs/**/*.md`, or the new asset paths.
2. **`markdownlint-cli2`** — Nimbus-specific ruleset: 100-col line length, no bare URLs, no trailing whitespace. New `lint:markdown` script in root `package.json`.
3. **SVG render smoke** — small bun script: open each `docs/assets/*.svg`, parse, assert non-zero dimensions. New `audit:svg-assets` script.
4. **OG card PNG render** — CI step using `resvg` (or `sharp`): render `docs/assets/og-card.svg` → `docs/og-card.png`. Commit if changed. New job in `release.yml` and on PRs that touch `docs/assets/og-card.svg`.
5. **README screenshot in PR template** — `.github/pull_request_template.md` gains a checklist item: "If this PR touches `docs/README.md`, attach a screenshot of the rendered page (light + dark)."

## 9. Success criteria

| Signal | Type | Target |
|---|---|---|
| First-time visitor understands the product in <30s | Qualitative | 3 of 3 SRE/Platform engineers asked describe Nimbus as "incident context across tools, local" or close |
| Install command runs on first read | Qualitative | At least 2 of 3 viewers complete install without re-reading the section |
| Cast holds attention to consent prompt | Asciinema analytics | >60% completion rate on asciinema.org page |
| Star/visitor ratio | GitHub traffic insights, week-over-week | +20% star/unique-visitor ratio in 2 weeks |
| Social shares render correctly | OG card debugger (opengraph.xyz) | Card renders on Slack, Twitter, LinkedIn, HN |
| Lighthouse on rendered README | Lighthouse on `github.com/.../Nimbus` | Performance ≥ 90, Accessibility = 100 |

Qualitative tests are the real ones; metrics are tiebreakers.

## 10. Risks

| Risk | Mitigation |
|---|---|
| Cast scenario drifts from real CLI output | `docs/demos/incident-response.cast` is re-recordable; future automation can diff the cast transcript against a mock-gateway smoke test |
| Slim README hides info contributors need | `CONTRIBUTING.md` and `docs/architecture.md` are untouched; sub-project B is the safety net |
| Punchy structure feels too marketing for OSS audience | Every claim must be traceable to a runnable command or test; no inflated language |
| GitHub strips OG card in some preview surfaces | OG card is fallback-aware: README share also has the social preview set in repo settings as a redundant signal |
| Asciinema.org outage | Cast source is in-repo; can re-render to GIF as backup; future docs site (B) can self-host the player |
| Existing readers see "broken links" if docs move targets don't exist yet | Pre-create the destination `docs/*.md` stub files in this sub-project, even if they only contain "Moved from README; full content in sub-project B" — keeps every link reachable |

## 11. File inventory

**Files modified:**

- `docs/README.md` — full rewrite to ~280 lines per §5.2 structure.
- `package.json` — add `lint:markdown`, `audit:svg-assets` scripts.
- `.github/pull_request_template.md` — add README screenshot checklist item (if template exists; otherwise create).
- `.github/workflows/_test-suite.yml` *or* a new `_docs-quality.yml` — wire the new checks into PR gating.

**Files added:**

- `docs/superpowers/specs/2026-05-11-readme-hero-redesign-design.md` (this file).
- `docs/assets/nimbus-wordmark.svg`
- `docs/assets/nimbus-wordmark-dark.svg`
- `docs/assets/hero-cast-light.svg` (rendered from cast)
- `docs/assets/hero-cast-dark.svg` (rendered from cast)
- `docs/assets/og-card.svg`
- `docs/og-card.png` (rendered from `og-card.svg`)
- `docs/assets/connectors/*.svg` (~27 service logos)
- `docs/demos/incident-response.cast`
- `docs/examples.md` (relocated from README)
- `docs/audiences.md` (relocated from README)
- `docs/performance.md` (relocated from README; stub until D ships real benches)
- `docs/cross-platform.md` (relocated from README)
- `docs/testing.md` (relocated from README)
- `scripts/audit/svg-assets.ts`

**Files unchanged:**

- All `packages/**` source.
- `CLAUDE.md`, `GEMINI.md`.
- `docs/architecture.md`, `docs/SECURITY.md`, `docs/SECURITY-INVARIANTS.md`, `docs/roadmap.md`, `docs/cli-reference.md`.
- `docs/CONTRIBUTING.md`, `docs/CODE_OF_CONDUCT.md`.

## 12. Out of scope (folded into later sub-projects)

| Item | Sub-project |
|---|---|
| Starlight docs site itself + GitHub Pages publish | B |
| GitHub Wiki disposition (redirect / kill / use) | B |
| Per-package READMEs (`packages/client/README.md`, `packages/sdk`, `packages/mcp-connectors/*`, `packages/docs`, `installers/`, `packages/gateway/src/perf/fixtures/`) | B (then G follow-up) |
| Issue / PR templates beyond the README-screenshot checklist | C |
| GitHub Discussions setup | C |
| `good first issue` curation | C |
| CI badges row in the README (coverage / Scorecard / Provenance) | D |
| Public benchmark publishing | D |
| Automated CHANGELOG | D |
| Status page | D |
| GitHub topics, awesome-list submissions | E |
| Docs site SEO | E |
| Real logo design (replace `☁️` emoji with bespoke mark) | future, optional |

## 13. Sequencing within sub-project A

A reasonable implementation order, expressed for the future writing-plans pass:

1. **Asset production** (parallel-friendly):
   - Wordmark SVG (light + dark).
   - Record `incident-response.cast`.
   - Render cast SVGs (light + dark).
   - Source connector logos.
   - Design OG card SVG; render PNG.
2. **Content extraction**: move cut sections into `docs/*.md` stub destinations so links resolve.
3. **README rewrite**: full rewrite per §5.2 against the produced assets.
4. **CI additions**: `lychee`, `markdownlint`, `audit:svg-assets`, OG card render.
5. **PR template addition**.
6. **Repo settings**: upload OG PNG via GitHub settings → Social preview (manual step; documented in PR description).
7. **Manual accessibility verification**: dark mode, mobile, screen reader, contrast.
8. **Manual qualitative validation**: show three SRE/Platform engineers, capture feedback.

The writing-plans skill will turn this sequence into a step-by-step plan with verification gates.
