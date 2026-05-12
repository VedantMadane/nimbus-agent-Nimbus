# Sub-project B — Docs Site Publish + Package READMEs + Wiki Disposition + Splash Refresh

**Date:** 2026-05-12
**Status:** Draft — pending user review
**Author:** asafgolombek
**Phase / Sub-project:** Phase 5 → Repo Improvement Program → Sub-project B
**Depends on:** Sub-project A (README hero redesign) for the wordmark + architecture SVG assets reused by PR 5; Sub-project A's branch may or may not be merged before B starts — see §4 sequencing.
**Type:** Documentation + CI sub-project. No Gateway / CLI / UI / SDK / connector source code changes. No new IPC methods, no Vault keys, no security-invariant impact.

---

## 1. Purpose

Make `https://nimbus-agent.dev` a live, premium-feeling docs site that backs every link the new README hero will introduce; standardize per-package READMEs across the monorepo so every package surface (npm, VS Code Marketplace, GitHub package directory) reads as a deliberate landing page; retire the GitHub Wiki; align the Starlight splash to the README hero's aesthetic so visitors arriving via README badges do not experience a context-switch.

Sub-project A's README hero links to `https://nimbus-agent.dev` from its badge row and CTAs. Without Sub-project B's PR 1, those links 404. B's first PR is therefore on A's critical path; the remaining four PRs of B are content + polish work that can ship independently.

---

## 2. Locked decisions (from brainstorming, 2026-05-12)

| # | Decision | Resolution |
|---|---|---|
| 1 | Scope | Standard single B — publish + Wiki + per-package READMEs (the full §12 list from Sub-project A's design) + light site polish. One spec, multi-PR plan. |
| 2 | Publish mechanism | **GitHub Pages via Actions deploy** (`actions/deploy-pages@v4`). No `gh-pages` branch. Custom domain set in repo Settings. |
| 3 | Per-package README shape | **Full template applied to every package** in scope, tiered by audience (see §5.3). Lint enforces structure on every PR. |
| 4 | Site polish | **Splash refresh only.** Sidebar, theme, fonts, accent CSS untouched. |
| 5 | Wiki | **Kill it.** User confirmed wiki is empty — no content port needed. |
| 6 | Approach shape | **Five-PR train** (publish → template + lint → published-package READMEs → internal + connector READMEs → splash). Approach 1 from the brainstorm. |

---

## 3. Goals and non-goals

### Goals

- A configured Nimbus repo serves the Starlight site at `https://nimbus-agent.dev` over HTTPS with the apex domain.
- Every push to `main` touching `packages/docs/**` re-publishes the site within ~2 minutes.
- Every PR touching `packages/docs/**`, `docs/**`, or `packages/**/README.md` runs `bun --cwd packages/docs run build` and the package-README lint.
- The repo's wiki is disabled.
- Every package in the in-scope list (§5.3) has a `README.md` matching the template's required H2 set, enforced by a CI lint that gates merge.
- The Starlight splash at `https://nimbus-agent.dev/` visually aligns with the README hero (same wordmark, same architecture SVG, same `#7c3aed` accent, matching headline cadence).

### Non-goals

- Sidebar IA restructure — left as-is. The existing User Guide / Reference / Developer hierarchy is good enough for v0.1.
- Starlight theme / fonts / accent CSS — out of scope. Future polish sub-project.
- PR-branch preview deployments — non-trivial workaround on GitHub Pages; deferred.
- Auto-generation of connector READMEs on every connector PR (vs. one-shot generator used in PR 4) — that is the "G follow-up" tracked in Sub-project A §12.
- Marketplace listing automation for `client` / `sdk` npm publishes — lives with release-tooling.
- Site analytics / cookie banner / multi-version docs / i18n / SEO beyond Starlight defaults.

---

## 4. Approach overview — five-PR train

The work decomposes into five independently reviewable PRs in this order:

| PR | Scope | Size | Critical path |
|---|---|---|---|
| **1 — publish** | `docs-publish.yml`, `docs-quality.yml` extension, repo Settings + DNS, wiki kill | Small | **On A's critical path.** Must land before A's PR merges, or shortly after. |
| **2 — template + lint** | Template file, lint script + tests, lint CI job, 4 existing READMEs reshaped to conform | Medium | Independent of A. |
| **3 — published-package READMEs** | `client` content fill-in, new `sdk/README.md`, `vscode-extension` verification | Small | Depends on PR 1 (so cross-links resolve) + PR 2 (lint must pass). |
| **4 — internal + connector READMEs** | Generator script, `packages/docs/README.md`, 29 first-party-connector READMEs | Large | Depends on PR 2. |
| **5 — splash refresh** | `index.mdx` rewrite, 4 SVG asset copies from A | Small | Depends on PR 1 + A merging (assets in `main`). |

**Sequencing recommendation:**

- **PR 1 and PR 2 can open in parallel** — neither depends on the other. PR 1 ships the publish workflow + Pages config; PR 2 ships the template + lint.
- **PR 3 and PR 4 should branch after PR 2 merges**, so the README lint is in place from the start of each branch. PR 3 and PR 4 can be worked in parallel with each other (they touch disjoint files).
- **PR 5 depends on two upstream events:** PR 1 merged (so the `nimbus-agent.dev` URLs the splash references resolve) and Sub-project A merged (so the four SVG source files live in `main` for the asset copy).

PRs 1–4 do not need A's assets. PR 5 is the only piece that gates on A.

---

## 5. Component design

### 5.1 — Architecture summary

Sub-project B introduces seven components:

| Component | Location | Purpose | Owned by PR |
|---|---|---|---|
| Publish workflow | `.github/workflows/docs-publish.yml` | Build + deploy Starlight on push to `main` via `actions/deploy-pages@v4` | 1 |
| PR-gate docs build | `.github/workflows/docs-quality.yml` (extend) | Run `bun --cwd packages/docs run build` on PRs touching docs paths | 1 |
| Pages + DNS settings | repo Settings (manual) | Custom domain `nimbus-agent.dev`, HTTPS enforced, wiki disabled | 1 |
| README template | `docs/templates/package-README.md` | Canonical skeleton with both tiers shown in HTML comments | 2 |
| README lint | `scripts/audit/package-readmes.ts` + `.test.ts` + CI job | Verify every in-scope package has a README with the tier's required H2 sections | 2 |
| Connector README generator | `scripts/audit/generate-connector-readme.ts` | One-shot tool that reads each connector's `nimbus.extension.json` and writes a tier-public README | 4 |
| Splash page | `packages/docs/src/content/docs/index.mdx` | Starlight `template: splash` hero matching the README aesthetic | 5 |

Cross-cutting properties:

- **No source-code changes.** Gateway, CLI, UI, SDK, Client, MCP connectors — untouched.
- **No security-invariant impact.** B does not touch `executor.ts`, `vault/`, `lan-server.ts`, `gateway_bridge.rs`, or any of the I1–I12 wiring sites.
- **No new dependencies.** Starlight already ships everything PR 1 + 5 need. PR 2's lint is plain TypeScript using `node:fs/promises`.
- **PAL-clean.** Workflows run on `ubuntu-24.04` only (Pages deploy is Linux-only); local-dev builds run on whatever the contributor uses. No platform-specific code.

### 5.2 — PR 1: Publish workflow + Pages config + wiki kill

**Files:**

| File | Change |
|---|---|
| `.github/workflows/docs-publish.yml` | **New.** Workflow definition below. |
| `.github/workflows/docs-quality.yml` | **Extend.** Add `docs-build` job running `bun --cwd packages/docs run build` on PRs touching `packages/docs/**`, `docs/**`, or `packages/**/README.md`. The file already exists from Sub-project A. |
| `packages/docs/public/CNAME` | **No change.** Already contains `nimbus-agent.dev`. |
| `packages/docs/astro.config.mjs` | **No change.** `site: "https://nimbus-agent.dev"` already set. |
| PR description | Document the six manual repo-settings + DNS steps as a checklist. |

**Publish workflow:**

```yaml
name: docs-publish

on:
  push:
    branches: [main]
    paths:
      - "packages/docs/**"
      - ".github/workflows/docs-publish.yml"
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: docs-publish
  cancel-in-progress: false   # never cancel a deploy mid-flight

jobs:
  build:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: "1.2" }
      - run: bun install --frozen-lockfile
      - run: bun --cwd packages/docs run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: packages/docs/dist }

  deploy:
    needs: build
    runs-on: ubuntu-24.04
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

Three load-bearing details:

1. `concurrency.cancel-in-progress: false` — prevents a fast follow-up push from killing an in-flight deploy and leaving Pages inconsistent.
2. `id-token: write` permission — required by `deploy-pages@v4` for OIDC; without it the deploy step fails with `Resource not accessible by integration`.
3. `paths:` filter — keeps the workflow from running on unrelated changes. The workflow file itself is in the filter so a workflow edit also re-deploys.

**Manual repo-settings checklist (recorded in PR 1's description):**

1. Settings → Pages → Source: **GitHub Actions** (not "Deploy from a branch"). Without this, `deploy-pages@v4` silently no-ops.
2. Settings → Pages → Custom domain: `nimbus-agent.dev`. Should auto-populate from the `CNAME` file.
3. Settings → Pages → Enforce HTTPS: **enabled**. Lets Encrypt cert provisions automatically once DNS is verified.
4. Settings → Pages → Verified domains: verify `nimbus-agent.dev` via TXT record. Cannot serve HTTPS at custom domain without this.
5. Settings → Features → Wikis: **disabled**.
6. DNS at the registrar: apex `A` records pointing at `185.199.108.153 / 185.199.109.153 / 185.199.110.153 / 185.199.111.153`; optionally a `www` `CNAME` to `nimbus-agent.github.io`.

**Verification:**

- `curl -fsSL -o /dev/null https://nimbus-agent.dev/` returns `200` after merge.
- Wiki tab disappears from the repo nav.
- A subsequent PR touching `packages/docs/` triggers `docs-build` in `docs-quality.yml` and does **not** trigger `docs-publish.yml`.
- A merge to `main` touching `packages/docs/` triggers `docs-publish.yml` and the site updates within ~2 min.

**PR-1-specific risks:**

| Risk | Mitigation |
|---|---|
| DNS propagation delay (up to 48 h) | Do the DNS change ~6 h before merging; verify with `dig nimbus-agent.dev` before kicking off the workflow. |
| Domain not yet verified → HTTPS cert won't issue | Item 4 in the checklist; verify before merge. |
| Pages source still set to "Branch" → deploy step no-ops | Item 1 in the checklist; verify by running `workflow_dispatch` once before relying on auto-publish. |

### 5.3 — PR 2: README template + CI lint

**Tier model.** One template, two enforcement tiers determined by path:

| Tier | Paths | Required H2 sections |
|---|---|---|
| **public** | `packages/{client,sdk,vscode-extension}/`, `packages/mcp-connectors/*/` | `What this is`, `Install`, `Quickstart`, `See also`, `License` |
| **internal** | `packages/docs/`, `installers/`, `packages/gateway/src/perf/fixtures/` | `What this is`, `See also`, `License` |

Authors may add extra sections (`Tools` for connectors, `Status`, `Maintainer notes`, etc.); the lint only checks the **required** set per tier.

**Files:**

| File | Change |
|---|---|
| `docs/templates/package-README.md` | **New.** ~80 lines: single skeleton with both tiers shown in HTML comments. |
| `scripts/audit/package-readmes.ts` | **New.** Lint script described below. |
| `scripts/audit/package-readmes.test.ts` | **New.** Unit tests for `extractH2Headings` and `validatePackageReadme`. Pattern from `scripts/audit/readme-cli-commands.test.ts`. |
| `package.json` | Add `"audit:package-readmes": "bun scripts/audit/package-readmes.ts"`. |
| `.github/workflows/docs-quality.yml` | Add `package-readmes` job mirroring the `readme-cli-tripwire` shape. |
| `packages/client/README.md` | Reshape to **public** tier. Content stays; sections renamed. |
| `packages/vscode-extension/README.md` | Reshape to **public** tier. |
| `installers/README.md` | Reshape to **internal** tier. |
| `packages/gateway/src/perf/fixtures/README.md` | Reshape to **internal** tier. |

**Lint script behavior:**

```ts
const SCOPE: readonly { path: string; tier: "public" | "internal" }[] = [
  { path: "packages/client", tier: "public" },
  { path: "packages/sdk", tier: "public" },
  { path: "packages/vscode-extension", tier: "public" },
  { path: "packages/docs", tier: "internal" },
  { path: "installers", tier: "internal" },
  { path: "packages/gateway/src/perf/fixtures", tier: "internal" },
  // mcp-connectors auto-discovered by scanning packages/mcp-connectors/<dir>/nimbus.extension.json
];

const REQUIRED_SECTIONS = {
  public:   ["What this is", "Install", "Quickstart", "See also", "License"],
  internal: ["What this is", "See also", "License"],
} as const;
```

For each entry plus every dynamically-discovered connector:

- Assert `README.md` exists.
- Extract H2 headings (`/^## (.+?)$/m`, normalize to lowercase).
- Assert every required-tier section is present.
- Emit a per-package status line; exit `1` if any failed. The diagnostic enumerates the exact required-section strings for the tier — e.g. `Missing required section in 'packages/sdk/README.md': '## Quickstart'. Expected H2 headings for tier 'public' (case-insensitive): What this is, Install, Quickstart, See also, License.` — so contributors can copy-paste the canonical form rather than guess at variants. Heading matching stays strict (no regex tolerance) on purpose: tolerance would create ambiguity about which form is canonical.

**PR-2-specific risks:**

| Risk | Mitigation |
|---|---|
| Case-sensitivity divergence between heading text | Normalize to lowercase before comparison; explicit unit test for case variants. |
| New connector lands without a README → main breaks | Lint runs on every PR via `docs-quality.yml` with `packages/mcp-connectors/**` in the path filter. PR adding a connector without a README fails the lint pre-merge. |
| Template churn | Required-sections set lives in one place (`package-readmes.ts`); any change requires a follow-up sweep PR; lint refuses to merge until sweep is complete. |

### 5.4 — PR 3: Published-package READMEs

Three external-audience packages, each warranting hand-authored marketplace-quality prose:

| File | Status before PR 3 | Status after PR 3 |
|---|---|---|
| `packages/client/README.md` | Reshaped to template (PR 2) — bones present | Hand-filled marketplace content: purpose, install, code-example quickstart, see-also links to docs site, license |
| `packages/sdk/README.md` | **Does not exist** | New file, marketplace-quality content. Targets extension authors. |
| `packages/vscode-extension/README.md` | Reshaped to template (PR 2) — Marketplace content retained | Verified against VS Code Marketplace's required-fields list (gallery banner, `categories`, screenshots) |

**Scope:** 1 new file + 2 content edits. No script or workflow changes. The lint added in PR 2 already gates merge.

PR 3 depends on PR 1 (so the cross-links in `## See also` resolve at `https://nimbus-agent.dev`).

### 5.5 — PR 4: Internal + connector READMEs

The heaviest single PR in B. 30 files: 1 internal package + 29 first-party MCP connectors.

| File set | Approach |
|---|---|
| `packages/docs/README.md` (new) | Hand-author. ~30 lines. Audience is contributors who want to edit the docs site locally. |
| `packages/mcp-connectors/<29 dirs>/README.md` | **Generator-first, then hand-polish.** A one-shot script reads each connector's `nimbus.extension.json` and writes a tier-public README. Per-connector pass adds one or two lines of distinct purpose where the manifest's description is thin. |

**Generator (`scripts/audit/generate-connector-readme.ts`):**

- One-shot tool, not a CI gate.
- Reads `displayName`, `description`, `id`, `permissions`, `hitlRequired` from each connector's manifest.
- Writes a README following the **public** tier (5 required sections).
- `## Install` says "Bundled with Nimbus — no separate install" (these are first-party).
- `## Quickstart` embeds `nimbus connector auth <slug>` then `nimbus ask "..."`.
- `## See also` links to:
  - `https://nimbus-agent.dev/user-guide/connectors/<slug>/` — emitted only if the generator finds `<slug>.mdx` or `<slug>.md` under `packages/docs/src/content/docs/connectors/` via `node:fs.existsSync()`. Otherwise the bullet falls back to the connector overview page `https://nimbus-agent.dev/user-guide/connectors/`.
  - `https://nimbus-agent.dev/architecture-overview/`
  - `https://nimbus-agent.dev/user-guide/hitl-and-safety/`
- Slug derived from the directory name (`packages/mcp-connectors/github/` → `github`).

**Connector list (29):** `aws`, `azure`, `bitbucket`, `circleci`, `confluence`, `datadog`, `discord`, `gcp`, `github`, `github-actions`, `gitlab`, `gmail`, `google-drive`, `google-photos`, `grafana`, `iac`, `jenkins`, `jira`, `kubernetes`, `linear`, `newrelic`, `notion`, `obsidian`, `onedrive`, `outlook`, `pagerduty`, `sentry`, `slack`, `teams`.

**PR-4-specific risks:**

| Risk | Mitigation |
|---|---|
| Some connector docs-site pages don't exist (404 from `See also`) | Generator emits the per-connector link only when the source `.mdx` exists; otherwise links to the connector overview page. Lychee CI (from A) catches new 404s on every PR. |
| Hand-polish drift across connectors | Acceptable variance — the lint enforces structure, not depth. Future PRs improve specific connector READMEs. |
| VS Code Marketplace shape conflict | Already known-good — tag `vscode-v0.1.2` shipped through. Reshape in PR 2 keeps the published shape. |

### 5.6 — PR 5: Starlight splash refresh

**Files:**

| File | Change |
|---|---|
| `packages/docs/src/content/docs/index.mdx` | **Rewrite.** Use Starlight's `template: splash` + `hero:` frontmatter. |
| `scripts/copy-shared-docs-assets.ts` | **New.** ~20-line Bun script copying the four shared SVGs from `docs/assets/` to `packages/docs/src/assets/` at build time. Source-of-truth stays at `docs/assets/`; the copies are gitignored. |
| `packages/docs/package.json` | Add `"predev": "bun ../../scripts/copy-shared-docs-assets.ts"` and `"prebuild": "bun ../../scripts/copy-shared-docs-assets.ts"` so `bun run dev` and the publish workflow both refresh the assets before reading them. |
| `.gitignore` | Add `packages/docs/src/assets/nimbus-wordmark-*.svg` and `packages/docs/src/assets/architecture-*.svg`. |

**Splash structure (`index.mdx`):**

```mdx
---
title: Nimbus
description: On-call intelligence. Local-first.
template: splash
hero:
  tagline: |
    Cross-service incident context in under 100 ms. Consent-gated automation.
    Your credentials never leave the machine.
  image:
    light: ../../assets/architecture-light.svg
    dark: ../../assets/architecture-dark.svg
    alt: 30 connectors → local SQLite index → engine + HITL → CLI · UI · voice
  actions:
    - text: Install
      link: /user-guide/install/
      icon: rocket
      variant: primary
    - text: Watch the cast
      link: https://asciinema.org/a/MnH4zEtmLxgfOGoy
      icon: external
      variant: secondary
---

import { CardGrid, Card } from "@astrojs/starlight/components";

## What it does

Three things, in one query:

<CardGrid>
  <Card title="Incident response" icon="warning">
    PagerDuty alert → deploy → commit → author, correlated locally.
  </Card>
  <Card title="CVE exposure" icon="seti:lock">
    Indexed code search across every connected repo, no fan-out network calls.
  </Card>
  <Card title="Data lineage" icon="bars">
    Tableau → Looker → dbt → Airflow → the renamed column.
  </Card>
</CardGrid>

## Three load-bearing words

- **local** — the SQLite index, the Vault, the audit log all live on your machine.
- **consent-gated** — every destructive or outbound action is intercepted before it runs.
- **MCP** — every connector speaks the [Model Context Protocol](https://modelcontextprotocol.io/).

[Get started →](/user-guide/install/) · [Architecture →](/architecture-overview/) · [Source on GitHub →](https://github.com/nimbus-agent/Nimbus)
```

Three structural choices:

1. **Use Starlight's `template: splash` + `hero:` frontmatter** rather than hand-rolled HTML. Starlight handles dark-mode swap, mobile layout, and accessibility for the hero block already.
2. **Architecture SVG as the hero image** — same one used in the README's `## How it works`. Visual continuity.
3. **Three-card grid mirrors the README's three problem statements**, one line per card.

**Sequencing constraint:** PR 5 cannot land until A merges (the SVG source files live on A's branch). PRs 1–4 do not have this constraint.

**PR-5-specific risks:**

| Risk | Mitigation |
|---|---|
| Architecture SVG looks oversized at splash hero scale | Test with `bun --cwd packages/docs run dev`; constrain via `style="max-width: 720px"` if needed. |
| Copied assets fall out of sync with `docs/assets/` source-of-truth | Resolved by design. `scripts/copy-shared-docs-assets.ts` runs as a `predev`/`prebuild` hook in `packages/docs/package.json`; every local dev start and CI build refreshes the four SVG copies. The copies are gitignored, so the source-of-truth at `docs/assets/` is the only set of files in git. |

---

## 6. Acceptance criteria

### 6.1 — Automated (gate the merge)

- `https://nimbus-agent.dev/` returns `200` with valid HTTPS after PR 1 lands.
- Every push to `main` touching `packages/docs/**` triggers `docs-publish.yml` and the site reflects the change within ~2 min.
- A PR touching `packages/docs/**`, `docs/**`, or any `packages/**/README.md` runs `docs-build` in `docs-quality.yml`.
- `bun run audit:package-readmes` exits `0` against `main` after PR 4 lands.
- A PR adding a new connector without a README fails the lint pre-merge.
- The Starlight `starlight-links-validator` plugin passes after PR 5's splash refresh.
- `bun --cwd packages/docs run build` exits `0` on every PR.
- The wiki tab no longer appears in repo navigation after PR 1.

### 6.2 — Qualitative (acceptance signals, not merge gates)

- A visitor arriving at `nimbus-agent.dev` from a README badge does not perceive an aesthetic context-switch — the splash carries the same wordmark, accent, and architecture diagram as the README hero.
- A contributor opening `packages/<package>/README.md` understands the package's purpose, install path, and where to look for depth within ~30 seconds.
- An evaluator browsing `packages/mcp-connectors/*/README.md` can confirm whether Nimbus indexes their stack without leaving GitHub.

---

## 7. Sub-project risks (beyond per-PR)

| Risk | Mitigation |
|---|---|
| PR 1 slips on DNS / Pages setup, blocking A's premium experience | Decoupled: A holds on its branch until B's PR 1 is verified live. PR 1 is intentionally minimal so it ships fast. |
| Generator-produced connector READMEs ship without per-connector polish | Polish step explicit in PR 4 plan. Lint enforces structure only; content quality is a human review item. |
| Starlight upgrade breaks the splash hero shape | Splash uses the documented `template: splash` API. `docs-publish.yml` builds on every push to main, so an upgrade PR has its build verified in CI before merge. |
| Per-package README template churns | Required-sections list lives in one place (`scripts/audit/package-readmes.ts`). Any change requires a follow-up sweep PR; the lint refuses to merge until the sweep is complete. |
| Copied assets drift from `docs/assets/` source-of-truth | Resolved by design (see §5.6). `scripts/copy-shared-docs-assets.ts` runs from `predev`/`prebuild`; copies are gitignored. |

---

## 8. File inventory (cumulative)

| PR | New | Modified | Reshaped existing | Total touched |
|---|---|---|---|---|
| 1 | 1 (`docs-publish.yml`) | 1 (`docs-quality.yml`) | — | 2 |
| 2 | 3 (template + lint + lint test) | 2 (`package.json`, `docs-quality.yml`) | 4 (existing READMEs) | 9 |
| 3 | 1 (`sdk/README.md`) | 2 (`client` + `vscode-extension` content fill-in) | — | 3 |
| 4 | 31 (generator + `docs/README.md` + 29 connector READMEs) | — | — | 31 |
| 5 | 1 (`scripts/copy-shared-docs-assets.ts`) | 3 (`index.mdx`, `package.json`, `.gitignore`) | — | 4 |
| **Total (union)** | **37** | **8** | **4** | **~49** |

The "Reshaped" column in PR 2 overlaps with "Modified" in PR 3 for `client` + `vscode-extension` — they are touched twice across the PR train but counted once in the total union.

---

## 9. Out of scope — explicitly deferred

| Item | Future sub-project |
|---|---|
| Sidebar IA restructure | Future polish (post-B) |
| Custom Starlight theme / fonts / accent CSS | Future polish (post-B) |
| PR-branch preview deployments | Future enhancement |
| Auto-generated connector README sections from `nimbus.extension.json` on every connector PR | "G follow-up" per §12 of Sub-project A |
| Marketplace listing automation for `client` / `sdk` npm publishes | Lives with release-tooling, not docs |
| Site analytics / cookie banner | Deliberately out of scope (telemetry-cautious project) |
| Site versioning (multi-version docs) | Future when v0.2 ships |
| i18n | Future |
| Search-engine SEO beyond Starlight defaults | Sub-project E per §12 of Sub-project A |
| CI badges row in the README (coverage / Scorecard / Provenance) | Sub-project D per §12 of Sub-project A |
| GitHub Discussions setup | Sub-project C per §12 of Sub-project A |
| `good first issue` curation | Sub-project C per §12 of Sub-project A |

---

## 10. Cross-sub-project references

- [Sub-project A — README hero redesign design](./2026-05-11-readme-hero-redesign-design.md) (§12 names this sub-project as B and lists its in-scope items)
- [Phase 5 sequencing — plan-of-plans](./2026-05-06-phase-5-sequencing-design.md)
- [Nimbus architecture reference](../../architecture.md)
- [Security invariants](../../SECURITY-INVARIANTS.md) — none are touched by B

---

## 11. Design-review reconciliation

External review of this spec ([`2026-05-12-sub-project-B-docs-publish-design-review.md`](./2026-05-12-sub-project-B-docs-publish-design-review.md), 2026-05-12, Gemini CLI) raised five points. Reconciled here for the record so future readers know each was weighed:

| # | Reviewer concern | Status | Resolution |
|---|---|---|---|
| 1 | Starlight supports `hero.image.{light,dark}` natively (PR 5) | **Accepted** | §5.6's splash code block updated to use the `light`/`dark` keys. The risk row about a hand-rolled `<picture>` fallback was removed — `@astrojs/starlight@^0.38.4` (installed) supports the variant frontmatter since v0.20. |
| 2 | Prebuild copy script avoids asset duplication debt (PR 5) | **Accepted** | PR 5 restructured: a new `scripts/copy-shared-docs-assets.ts` is run from `predev`/`prebuild` hooks in `packages/docs/package.json`, copying the four SVGs from `docs/assets/` to `packages/docs/src/assets/`. The copies are gitignored; source-of-truth stays at `docs/assets/`. §5.6 file table, §5.6 risk row, §7 risk row, §8 inventory, and §9 out-of-scope all updated. |
| 3 | Lint forgiveness for heading variations (PR 2) | **Accepted (partial)** | §5.3's lint diagnostic now mandates enumerating the canonical required-section strings so contributors can copy-paste the exact form. Regex tolerance was deliberately **not** added: tolerance creates ambiguity about which heading is canonical, which is worse than a strict-but-friendly error message. |
| 4 | Generator page-existence check (PR 4) | **Accepted** | §5.5 now names the check explicitly: the generator uses `node:fs.existsSync()` to look for `<slug>.mdx` or `<slug>.md` under `packages/docs/src/content/docs/connectors/`; falls back to the connector overview page when neither exists. |
| 5 | GitHub Pages artifact path (PR 1) | **Confirmation** | Reviewer confirmed `packages/docs/dist` matches Astro's default output dir and that the apex-domain config needs no `base` change in `astro.config.mjs`. No action — recorded for posterity. |
