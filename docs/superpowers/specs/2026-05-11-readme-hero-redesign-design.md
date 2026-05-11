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

**Markup strategy.** The mockup above is the desktop view. GitHub's mobile renderer strips most CSS and forces fixed-width tables to scroll horizontally, so we cannot use `<table>` or styled `<div>` for the split. The pattern that survives GitHub's renderer (used by Bun, Astro, Tauri) is `<img align="right" width="480">` on the cast SVG immediately before the pitch prose. On desktop, text flows to the left of the floated image; on mobile, the image pushes above the text via natural reflow. The CTAs and badge row sit above the float, full-width.

Concretely, the hero markup looks like:

```html
<picture><img align="right" width="480" alt="..." src="docs/assets/hero-cast-light.svg"></picture>

# ☁️ Nimbus
On-call intelligence. Local-first.

[badges]

Cross-service incident context in under 100ms. Consent-gated automation.
Your credentials never leave the machine.

[Install](#install) · [Docs](https://docs.nimbus-agent.dev)
```

The cast `<picture>` element wraps the `<img>` to provide the dark-theme `<source>`. `align="right"` is the load-bearing attribute.

### 5.2 README structure — "Punchy" depth

Target ~280 lines, 8 sections.

| § | Section | Lines | Job |
|---|---|---|---|
| **1** | Hero | ~30 | Wordmark, headline, 1-line subhead, badge row (4), split layout (pitch + cast), two CTAs, credential footnote |
| **2** | The problem | ~25 | 3 bullets — incident response / CVE exposure / data lineage. Each ends with the one-line answer Nimbus gives |
| **3** | How it works | ~30 | One paragraph + custom SVG flowchart: connectors → SQLite index → engine + HITL → CLI/UI/voice. Names "local", "consent-gated", "MCP" |
| **4** | Quick start | ~50 | Three OS install commands stacked vertically (Linux, macOS, Windows), all visible — no collapsed sections. Then `nimbus connector auth github && nimbus ask "..."`. Build-from-source as a single link |
| **5** | Connectors | ~30 | Two-row single-color logo grid (shipped, planned) |
| **6** | Trust & security | ~20 | One paragraph naming OS keystore, structural HITL, AGPL, audit log. Two links: SECURITY.md, SECURITY-INVARIANTS.md |
| **7** | Roadmap | ~15 | 5-row table, current row highlighted |
| **8** | Contributing · License · footer | ~25 | One paragraph each, footer nav |
| | **Slack** | ~55 | Frontmatter, dividers, asides |
| | **Total** | **~280** | |

Quick-start grew by ~10 lines (three visible OS commands instead of one default + collapsed) and the slack budget shrank by the same amount; total stays at ~280.

### 5.3 What gets cut and where it goes

Critically: **"moved" means the existing content is relocated, not stubbed.** The destination files are populated with what's currently in the README — same prose, same tables, same numbers. The README links to them with confidence because the content is real. Sub-project B (docs site) then renders those files into a navigable site; until B ships, they're plain markdown that already reads cleanly on GitHub.

| Removed from README | Destination | Content state |
|---|---|---|
| 7 of 8 example bash snippets | `docs/examples.md` | Carries the current 8 example sessions verbatim, minus the one used as the hero cast |
| "Who It's For" role table | `docs/audiences.md` | Carries the current 6-row role table verbatim |
| "Why Engineers Choose Nimbus" performance table | `docs/performance.md` | Carries the existing measurements verbatim (~20–80ms search, ~5ms list, ~50–200ms semantic, ~80ms cold start). **Not a stub.** Sub-project D later replaces these with CI-published numbers; until then the existing measured values are accurate |
| "What's in v0.1.0" full delivery list | Link to release notes; one-line summary remains | Release notes already exist on GitHub Releases — no new file needed |
| Tech Stack table | Already in `docs/architecture.md` — link from README | No move; the existing architecture.md is the canonical source |
| Cross-Platform table | `docs/cross-platform.md` | Carries the current Windows/macOS/Linux feature matrix verbatim |
| Project Structure tree | Already in `docs/architecture.md` — link from README | No move; already covered |
| Testing section | `docs/testing.md` | Carries the current 5-layer pyramid + coverage gate list verbatim |
| Publishing Releases | `docs/release/` (already exists) | No new file; existing runbooks are the target |
| Full Pricing table | One-paragraph footnote in README; full table → `nimbus-agent.dev/pricing` | Pricing page exists on the marketing site; README footnote summarises in one sentence |
| Extensions section | One-line + link to `docs/contributors/extension-author-walkthrough.md` | Walkthrough already exists |

### 5.4 Visual identity

| Asset | Decision | Source path | Notes |
|---|---|---|---|
| Wordmark | Custom SVG + ☁️ emoji | `docs/assets/nimbus-wordmark.svg` | JetBrains Mono rendered to SVG. Dark + light variants via `<picture>` |
| Badge row | 4 badges, fixed order | inline in `docs/README.md` | docs · release · license · status |
| Hero cast | Static SVG poster + asciinema.org link | `docs/demos/incident-response.cast` (source) + `docs/assets/hero-cast-{light,dark}.svg` (rendered) | Re-renderable from `.cast` via `svg-term-cli` |
| §3 diagram | Custom SVG flowchart (light + dark variants) | `docs/assets/architecture-{light,dark}.svg` | Hand-authored SVG; uses the same `#7c3aed` accent and JetBrains Mono lettering as the wordmark. Mermaid was considered and rejected — its default rendering would clash with the rest of the polished hero, and themed Mermaid still carries the Mermaid geometric idiom. Trade-off accepted: SVG is harder to diff than Mermaid source, but the architecture (connectors → index → engine → clients) is load-bearing and stable; updates will be rare |
| Connector grid | Two-row table of single-color SVG logos | `docs/assets/connectors/<name>.svg` | Sourced from [Simple Icons](https://simpleicons.org/) (CC0-licensed, designed for exactly this monochrome-OSS-grid use case) or each service's officially-provided monochrome variant. **Not recoloured color logos** — Slack, GitHub, AWS, Microsoft brand guidelines all restrict recoloring; Simple Icons sidesteps that entirely |
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
6. **CLI-command tripwire** — a bun script `scripts/audit/readme-cli-commands.ts` that greps `docs/README.md` for every `nimbus <subcommand>` literal and asserts each subcommand exists in `packages/cli/src/index.ts`'s command registry. Catches the failure mode where a command is renamed or removed and the README — and therefore the cast — silently drifts. New `audit:readme-cli` script. Runs on PR.

   Note on a deferred heavier tripwire: an end-to-end test that runs `nimbus ask "what changed?"` against mocked connectors and hashes the output transcript would catch deeper drift (output formatting changes, ordering swaps), but the LLM router introduces non-determinism that would require mocking the LLM with a fixed transcript — multi-day plumbing. Deferred to sub-project D (CI/CD visibility), where the mock infrastructure to publish public benches will also support deterministic cast-drift snapshots.

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
| Cast scenario drifts from real CLI output | Two-layer mitigation. **Now:** the §8 CLI-command tripwire fails CI if any `nimbus <subcommand>` mentioned in the README disappears from the CLI registry. **Deferred to D:** end-to-end snapshot test that hashes the full `nimbus ask` output transcript against mocked connectors and a stubbed LLM transcript |
| Slim README hides info contributors need | `CONTRIBUTING.md` and `docs/architecture.md` are untouched; sub-project B is the safety net |
| Punchy structure feels too marketing for OSS audience | Every claim must be traceable to a runnable command or test; no inflated language |
| GitHub strips OG card in some preview surfaces | OG card is fallback-aware: README share also has the social preview set in repo settings as a redundant signal |
| Asciinema.org outage | Cast source is in-repo; can re-render to GIF as backup; future docs site (B) can self-host the player |
| Existing readers see "broken links" if docs move targets don't exist yet | Per §5.3 — destination files are populated with the relocated content, not stubbed. Every link resolves to real prose on day one |
| Custom SVG architecture diagram is harder to update than a Mermaid source | Architecture is load-bearing and stable (connectors → index → engine → clients has not changed since Phase 1); updates will be rare. The SVG source is checked in and editable in any vector editor or by hand for typography tweaks |

## 11. File inventory

**Files modified:**

- `docs/README.md` — full rewrite to ~280 lines per §5.2 structure.
- `package.json` — add `lint:markdown`, `audit:svg-assets` scripts.
- `.github/pull_request_template.md` — add README screenshot checklist item (if template exists; otherwise create).
- `.github/workflows/_test-suite.yml` *or* a new `_docs-quality.yml` — wire the new checks into PR gating.

**Files added:**

- `docs/superpowers/specs/2026-05-11-readme-hero-redesign-design.md` (this file).
- `docs/assets/nimbus-wordmark-light.svg`
- `docs/assets/nimbus-wordmark-dark.svg`
- `docs/assets/hero-cast-light.svg` (rendered from cast)
- `docs/assets/hero-cast-dark.svg` (rendered from cast)
- `docs/assets/architecture-light.svg` (custom-authored, replaces the rejected Mermaid)
- `docs/assets/architecture-dark.svg`
- `docs/assets/og-card.svg`
- `docs/og-card.png` (rendered from `og-card.svg`)
- `docs/assets/connectors/*.svg` (~30 service logos sourced from Simple Icons or official monochrome variants)
- `docs/demos/incident-response.cast`
- `docs/examples.md` (relocated from README — carries existing example sessions verbatim)
- `docs/audiences.md` (relocated from README — carries existing role table verbatim)
- `docs/performance.md` (relocated from README — carries existing measurements verbatim, **not a stub**)
- `docs/cross-platform.md` (relocated from README — carries existing platform-feature matrix verbatim)
- `docs/testing.md` (relocated from README — carries existing 5-layer pyramid verbatim)
- `scripts/audit/svg-assets.ts`
- `scripts/audit/readme-cli-commands.ts` (CLI-command tripwire, §8 item 6)

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
   - Render cast SVGs (light + dark) via `svg-term-cli`.
   - Architecture diagram SVG (light + dark) — hand-authored, matching wordmark typography and `#7c3aed` accent.
   - Source connector logos from Simple Icons (or official monochrome variants where Simple Icons is unavailable).
   - Design OG card SVG; render PNG via `resvg`.
2. **Content extraction**: relocate cut sections into populated `docs/*.md` files (carries existing prose verbatim — not stubs).
3. **README rewrite**: full rewrite per §5.2 against the produced assets, using the `<img align="right">` markup strategy from §5.1.
4. **CI additions**: `lychee`, `markdownlint`, `audit:svg-assets`, OG card render, `audit:readme-cli` tripwire.
5. **PR template addition**.
6. **Repo settings**: upload OG PNG via GitHub settings → Social preview (manual step; documented in PR description).
7. **Manual accessibility verification**: dark mode, mobile (real device), screen reader, contrast.
8. **Manual qualitative validation**: show three SRE/Platform engineers, capture feedback.

The writing-plans skill will turn this sequence into a step-by-step plan with verification gates.
