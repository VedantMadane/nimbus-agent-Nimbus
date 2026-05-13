# Sub-project C — Community Pack: Contributor Onboarding Scaffolding

**Date:** 2026-05-12
**Status:** Draft — pending user review
**Author:** asafgolombek
**Phase / Sub-project:** Phase 5 → Repo Improvement Program → Sub-project C
**Depends on:** Sub-project A (merged 2026-05-12, PR #258) for the screenshot checklist in the existing PR template; Sub-project B (merged 2026-05-12, PR #265) for the `docs/SECURITY.md` that `config.yml`'s Security contact link points to.
**Type:** Community-config + ops sub-project. No Gateway / CLI / UI / SDK / connector source code changes. No new IPC methods, no Vault keys, no security-invariant impact.

---

## 1. Purpose

Make the repo's contributor on-ramp deliberate. A first-time visitor who hits an "Issues" tab, a "Discussions" tab, or a contributor doc should land somewhere shaped for them, not into GitHub defaults. The three A §12 items (issue/PR templates beyond the screenshot checklist, Discussions setup, `good first issue` curation) cluster with adjacent community-health gaps (`ISSUE_TEMPLATE/config.yml`, `SUPPORT.md`, discussion templates) into one cohesive "community pack" sub-project.

Sub-project A's PR template already has the README screenshot checklist. Sub-project C polishes the rest of the template surface and adds the bridges (Issue→Discussion redirects, SUPPORT.md decision tree, GFI criteria) that turn enabled-but-empty community features into a usable on-ramp.

---

## 2. Locked decisions (from brainstorming, 2026-05-12)

| # | Decision | Resolution |
|---|---|---|
| 1 | Scope | **Full community pack.** Three A §12 items + adjacent gaps: `ISSUE_TEMPLATE/config.yml`, `SUPPORT.md`, discussion templates, optional doc-issue form. |
| 2 | Issue templates | **Migrate to GitHub Issue Forms (YAML)** — required-field enforcement and dropdowns. Replace all three existing markdown templates; add a fourth for documentation issues. |
| 3 | GFI curation | **Criteria doc + seed batch (8–12 issues).** Criteria appended to `docs/CONTRIBUTING.md`; seed issues created across ≥3 packages. |
| 4 | Discussions reshape | **Curate set + seed pinned threads.** Slim to 5 categories (drop Polls, rename Show-and-tell → "Show your workflow", toggle Ideas + Q&A to answerable). 4 pinned seed threads. Discussion templates for Q&A and Ideas. |
| 5 | FUNDING.yml | **Skip.** Defer until GitHub Sponsors / Open Collective is real; an empty FUNDING.yml shows a broken Sponsor button. Tracked in §9. |
| 6 | Community files location (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, **new** `SUPPORT.md`) | **Leave in `docs/`.** GitHub auto-discovers them there for the Community Standards detector. Moving to `.github/` adds churn without functional benefit. New `SUPPORT.md` (added by C) follows the same convention — placed at `docs/SUPPORT.md`. |
| 7 | Approach shape | **Three-PR train** (code-side config → Discussions infra + ops → GFI on-ramp). Approach 1 from the brainstorm. |

---

## 3. Goals and non-goals

### Goals

- Every new issue picker entry on GitHub uses a structured Issue Form with required fields; the picker offers no blank-issue option.
- A "how do I…?" question hitting the issue picker is directed to Discussions Q&A; a "I think I found a vulnerability" question is directed to `docs/SECURITY.md`'s private channel.
- The Discussions tab shows 5 purpose-built categories and 4 pinned seed threads (welcome, FAQ, roadmap input, show-your-workflow starter) within 24 h of PR 2's merge.
- `docs/CONTRIBUTING.md` defines what makes a Nimbus GFI; 8–12 seeded GFI issues are open across ≥3 distinct `pkg:*` labels within 24 h of PR 3's merge.
- A new contributor can find `docs/SUPPORT.md` (linked from the GitHub Community Profile sidebar) or Discussions from the repo's root navigation within 30 seconds.

### Non-goals

- CI badges row in the README → Sub-project D.
- Public benchmark publishing → D.
- Automated CHANGELOG (note: `release-please` may already cover this; verify when D is designed) → D.
- GitHub topics, awesome-list submissions → E.
- Docs site SEO → E.
- Per-package READMEs → already shipped by Sub-project B.
- `release-please` configuration, signing workflows → release-tooling sub-project, not C.
- Bespoke logo → future / optional.
- A bot to auto-unassign stale GFI claimants → future enhancement (called out as a risk-mitigation deferred item in §7).
- Moving `docs/CONTRIBUTING.md` / `CODE_OF_CONDUCT.md` / `SECURITY.md` to `.github/` or repo root — current locations are auto-discovered by GitHub Community Standards.

---

## 4. Approach overview — three-PR train

| PR | Scope | Size | Sequencing |
|---|---|---|---|
| **1 — code-side config files** | 4 Issue Forms (`bug_report.yml`, `feature_request.yml`, `connector_request.yml`, `documentation_issue.yml`), `ISSUE_TEMPLATE/config.yml`, PR template polish (one new section), `SUPPORT.md`. | Small | Independent. No GitHub-side prerequisite. |
| **2 — Discussions infra + reshape** | 2 discussion templates (`q-a.yml`, `ideas.yml`). Ops checklist: category restructure (drop Polls, rename Show-and-tell, toggle answerable on Q&A + Ideas), 4 pinned seed threads. | Small file diff, **medium ops weight**. | Depends on PR 1 (so `config.yml`'s Discussions contact-links resolve against the reshaped category set). |
| **3 — GFI on-ramp** | One `docs/CONTRIBUTING.md` section addition. Ops checklist: re-audit 4 existing GFIs against new criteria, seed 8–12 new GFI issues across ≥3 packages. | Small file diff, **medium ops weight**. | Independent of PR 2 (touches different surfaces). Can ship in parallel with PR 2 after PR 1. |

**Sequencing recommendation:**

- **PR 1 ships first.** Self-contained, no GitHub-side ops. Establishes the redirect bridges.
- **PR 2 and PR 3 can open in parallel** after PR 1 merges. They touch disjoint surfaces (Discussions vs. CONTRIBUTING.md + GitHub Issues).

---

## 5. Component design

### 5.1 — Architecture summary

Sub-project C introduces eight new files, modifies two existing files, and applies ~16–20 GitHub-side operational changes (Issue Form smoke tests, Discussions category reshape, 4 pinned threads, ~12 seed GFI issues, audit of 4 existing GFIs).

| Component | Location | Purpose | Owned by PR |
|---|---|---|---|
| Bug report Issue Form | `.github/ISSUE_TEMPLATE/bug_report.yml` | Required fields: title, description, steps, expected/actual. Dropdowns: OS, component. | 1 |
| Feature request Issue Form | `.github/ISSUE_TEMPLATE/feature_request.yml` | Required: summary, problem, proposed solution. Checkboxes: non-negotiables. Dropdown: roadmap phase. | 1 |
| Connector request Issue Form | `.github/ISSUE_TEMPLATE/connector_request.yml` | Required: service name, use cases. Checkboxes: read/write ops. Dropdown: willing to build. | 1 |
| Documentation Issue Form | `.github/ISSUE_TEMPLATE/documentation_issue.yml` | Required: page/path, what's wrong, suggested fix. Auto-labels: `documentation`, `needs-triage`. | 1 |
| Issue picker config | `.github/ISSUE_TEMPLATE/config.yml` | `blank_issues_enabled: false`; contact links to Discussions Q&A, Ideas, General, and `docs/SECURITY.md`. | 1 |
| PR template polish | `.github/PULL_REQUEST_TEMPLATE.md` | Add one new optional section: `## Linked Discussion`, between `## Related Issue` and `## Type of Change`. | 1 |
| Support decision tree | `docs/SUPPORT.md` | ~50 lines. Routes usage questions → Discussions Q&A; bugs → Issues; features → Discussions Ideas or Issues; security → SECURITY.md; chat → Discussions General. Lives in `docs/` to match the §2 #6 decision; GitHub Community Standards auto-discovers it there. | 1 |
| Q&A discussion template | `.github/DISCUSSION_TEMPLATE/q-a.yml` | Prompts: what are you trying to do, what have you tried, environment. Title prefix `Q&A: `. Labels: `question`, `needs-triage`. | 2 |
| Ideas discussion template | `.github/DISCUSSION_TEMPLATE/ideas.yml` | Prompts: problem, proposed solution, fit with local-first model, willing to build. Title prefix `Idea: `. Labels: `enhancement`, `needs-triage`. | 2 |
| GFI criteria section | `docs/CONTRIBUTING.md` | New `## What makes a good first issue?` section between "Find Something to Work On" and "Development Workflow". | 3 |

**Cross-cutting properties:**

- **No source-code changes.** Gateway, CLI, UI, SDK, Client, MCP connectors — untouched.
- **No security-invariant impact.** C does not touch `executor.ts`, `vault/`, `lan-server.ts`, `gateway_bridge.rs`, or any of the I1–I12 wiring sites.
- **No new dependencies.** Issue Forms are GitHub-native YAML; no validator package needed (CI cannot validate them; verification is via a draft issue on the live repo).
- **PAL-clean.** No platform-specific code anywhere in C.

### 5.2 — PR 1: Code-side config files

**Files (6 new + 1 modified):**

| File | Change |
|---|---|
| `.github/ISSUE_TEMPLATE/bug_report.yml` | **New.** Replaces `bug_report.md` (delete in same commit). |
| `.github/ISSUE_TEMPLATE/feature_request.yml` | **New.** Replaces `feature_request.md` (delete in same commit). |
| `.github/ISSUE_TEMPLATE/connector_request.yml` | **New.** Replaces `connector_request.md` (delete in same commit). |
| `.github/ISSUE_TEMPLATE/documentation_issue.yml` | **New.** No predecessor — pure addition. |
| `.github/ISSUE_TEMPLATE/config.yml` | **New.** Blank-issue disable + 4 contact links. |
| `.github/PULL_REQUEST_TEMPLATE.md` | **Modified.** Add `## Linked Discussion` section. |
| `docs/SUPPORT.md` | **New.** Decision-tree document. |

**Bug report Issue Form shape (illustrative — exact field set lifted from current `bug_report.md`):**

```yaml
name: Bug Report
description: Something is broken or behaving unexpectedly
title: "fix: "
labels: ["bug", "needs-triage"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to report a bug. Please fill out every required
        field — they make triage faster and prevent the back-and-forth round trips.
  - type: textarea
    id: description
    attributes:
      label: Description
      description: A clear, concise description of the bug.
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: Steps to Reproduce
      placeholder: |
        1.
        2.
        3.
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected Behaviour
    validations:
      required: true
  - type: textarea
    id: actual
    attributes:
      label: Actual Behaviour
      description: Include the full error output or stack trace.
      render: shell
    validations:
      required: true
  - type: dropdown
    id: os
    attributes:
      label: Operating System
      options:
        - Windows 10
        - Windows 11
        - macOS 13 (Ventura)
        - macOS 14 (Sonoma)
        - macOS 15 (Sequoia)
        - Ubuntu 22.04
        - Ubuntu 24.04
        - Other Linux
        - Other (specify in additional context)
    validations:
      required: true
  - type: input
    id: bun_version
    attributes:
      label: Bun version
      placeholder: "1.2.x — run `bun --version`"
    validations:
      required: true
  - type: input
    id: nimbus_version
    attributes:
      label: Nimbus version / commit
      placeholder: "v0.1.0 or short SHA from `git rev-parse --short HEAD`"
    validations:
      required: true
  - type: checkboxes
    id: components
    attributes:
      label: Component (check all that apply)
      options:
        - label: Gateway / Engine
        - label: HITL consent gate
        - label: Vault / credential storage
        - label: IPC server
        - label: CLI
        - label: MCP connector (specify in additional context)
        - label: Extension system
        - label: Platform Abstraction Layer (PAL)
        - label: CI / build
        - label: Other (specify in additional context)
  - type: checkboxes
    id: platform_repro
    attributes:
      label: Platform reproduction
      options:
        - label: Reproduces on Windows
        - label: Reproduces on macOS
        - label: Reproduces on Linux
        - label: Unknown / only tested on one platform
  - type: textarea
    id: additional
    attributes:
      label: Additional Context
      description: |
        Logs, screenshots, related issues, anything else that helps.

        **Highly recommended:** paste the output of `nimbus diag --json` here — it's a structured snapshot (gateway version, index metrics, connector health, recent slow queries) with credentials redacted. It's the fastest path to a diagnosis.
```

Why `nimbus diag --json` rather than a free-form log file: the CLI command exists today, the output is structured (parseable for triage), and the redaction is already enforced by the structured logger (no leaked credentials). There is no canonical user-facing `nimbus.log` file path — logs are written by the structured logger to platform-specific locations, and asking new users to find them is friction we don't need.

The same migration pattern applies to `feature_request.yml` (checkbox group for non-negotiables, dropdown for roadmap phase) and `connector_request.yml` (checkbox groups for read/write ops, dropdown for willing-to-build). `documentation_issue.yml` is a slim form (3 required textareas + a `pkg:*` dropdown).

**`config.yml` shape:**

```yaml
blank_issues_enabled: false
contact_links:
  - name: Usage question or "how do I…?"
    url: https://github.com/nimbus-agent/Nimbus/discussions/categories/q-a
    about: Ask a usage question in Discussions Q&A. The community + maintainers triage there faster than Issues for "how do I" questions.
  - name: Idea / roadmap input
    url: https://github.com/nimbus-agent/Nimbus/discussions/categories/ideas
    about: Propose a new capability or weigh in on the Phase 6+ roadmap in Discussions Ideas.
  - name: Security vulnerability (private)
    url: https://github.com/nimbus-agent/Nimbus/blob/main/docs/SECURITY.md
    about: Do NOT open a public issue for vulnerabilities. See SECURITY.md for the private reporting channel.
  - name: General chat
    url: https://github.com/nimbus-agent/Nimbus/discussions/categories/general
    about: Talking-shop, casual questions, "is anyone else seeing X?".
```

**Note on absolute URLs in `config.yml`:** GitHub's `config.yml` schema does **not** support relative URLs in `contact_links` — every link must be absolute. This means a fork of the repo with Issues enabled will surface contact links pointing back to upstream `nimbus-agent/Nimbus` (forks would see "Q&A in nimbus-agent/Nimbus Discussions" rather than their own). This is intentional and desirable here: security reports and Q&A traffic from forks should reach the upstream maintainer team, not be silently scattered into per-fork Issues. Recorded explicitly so future readers don't try to "fix" it with relative URLs.

**PR template addition (single new section):**

Insert this **between** `## Related Issue` and `## Type of Change`:

```markdown
## Linked Discussion

<!-- Optional but encouraged. If this PR implements an idea agreed in Discussions Ideas, answers a Q&A, or addresses something flagged in General, paste the discussion URL here so a maintainer can update or mark-answered the thread after merge. Note: GitHub does NOT auto-close Discussions from PR merges (only Issues via `Closes #N`); this is a manual step. -->
```

Why the prompt mentions manual update: `Closes #N` keywords only resolve Issues, not Discussions. A merge does not auto-mark a Discussions Ideas thread as "built" — that's a maintainer follow-up step. Calling it out in the template avoids the misconception that linking a Discussion does the right thing automatically.

Everything else in the existing PR template — the screenshot checklist, non-negotiables, coverage requirements, testing section — stays untouched. The "screenshot checklist" callout from A §12 is the existing `## Non-Negotiables Checklist` bullet about README-touching PRs; that bullet remains as-is.

**`SUPPORT.md` shape (~50 lines):**

```markdown
# Where to ask for help with Nimbus

Different kinds of questions go to different places. Pick the channel that matches your need.

## "How do I use Nimbus to do X?" — usage question
→ [Discussions → Q&A](https://github.com/nimbus-agent/Nimbus/discussions/categories/q-a)

Maintainers and the community triage Q&A faster than the issue tracker for "how do I" questions. Search the FAQ thread (pinned at the top) before posting.

## "Nimbus did something unexpected / crashed / produced wrong output" — bug
→ [Open a bug report](https://github.com/nimbus-agent/Nimbus/issues/new?template=bug_report.yml)

The Issue Form will prompt you for OS, Bun version, Nimbus version, and reproduction steps. All required.

## "I have an idea for a new capability" — feature request
→ Discuss first, then file: [Discussions → Ideas](https://github.com/nimbus-agent/Nimbus/discussions/categories/ideas), or directly via [feature request form](https://github.com/nimbus-agent/Nimbus/issues/new?template=feature_request.yml)

Large features benefit from a Discussions Ideas thread before a PR. Small features can go straight to the Issue Form.

## "Nimbus should integrate with [service X]" — connector request
→ [Connector request form](https://github.com/nimbus-agent/Nimbus/issues/new?template=connector_request.yml)

## "I want to contribute" — contributor onboarding
→ [`CONTRIBUTING.md`](./CONTRIBUTING.md) and look for issues labeled [`good first issue`](https://github.com/nimbus-agent/Nimbus/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

## "I think I found a security vulnerability" — DO NOT open a public issue
→ [`SECURITY.md`](./SECURITY.md)

The file documents the private reporting channel and disclosure timeline.

## "I just want to chat about Nimbus"
→ [Discussions → General](https://github.com/nimbus-agent/Nimbus/discussions/categories/general)

## Anything else
→ Default to [Discussions → Q&A](https://github.com/nimbus-agent/Nimbus/discussions/categories/q-a). A maintainer will redirect if needed.
```

**Three load-bearing details:**

1. **Delete the three `.md` issue templates in the same commit as the `.yml` migration.** If both exist, GitHub renders duplicate picker entries.
2. **`config.yml` is the bridge.** Without it, every "how do I…?" lands in Issues. The `contact_links` array surfaces in the Issue type picker above the structured forms.
3. **Issue Forms cannot be validated in CI.** GitHub's schema is server-side only; locally `gh issue create --web` does not validate forms. Verification is via a draft issue on the live repo within ~1 h of PR merge. PR description includes a rollback PR pre-staged as a safety net.

**Verification (PR 1):**

- Picker shows 4 structured forms + 4 contact links + no blank-issue option after merge.
- Submitting each form sets the correct labels and uses the title prefix from the form.
- `lychee` link-check on `SUPPORT.md` passes (all 6 URLs resolve).

**PR-1-specific risks:**

| Risk | Mitigation |
|---|---|
| Issue Forms YAML schema mistake ships broken to main | Smoke-test each form via a draft issue within 1 h of merge. Pre-stage a revert PR. |
| `.md` and `.yml` templates coexist after partial merge | Delete `.md` files in same commit as `.yml` additions. |
| Discussions URLs in `config.yml` are dead because category slugs changed in PR 2 | PR 2's "keep slug `show-and-tell`" + non-rename of `q-a` and `ideas` slugs guarantees the URLs in PR 1's `config.yml` remain stable. |

### 5.3 — PR 2: Discussions infra + reshape ops

**Files (2 new):**

| File | Change |
|---|---|
| `.github/DISCUSSION_TEMPLATE/q-a.yml` | **New.** Q&A discussion template. |
| `.github/DISCUSSION_TEMPLATE/ideas.yml` | **New.** Ideas discussion template. |

**Q&A template shape:**

```yaml
title: "Q&A: "
labels: ["question", "needs-triage"]
body:
  - type: textarea
    id: trying_to_do
    attributes:
      label: What are you trying to do?
    validations:
      required: true
  - type: textarea
    id: tried
    attributes:
      label: What have you tried?
      description: Commands run, configuration tried, output observed.
    validations:
      required: true
  - type: textarea
    id: environment
    attributes:
      label: Environment
      placeholder: "OS, Bun version, Nimbus version/commit"
```

**Ideas template shape:**

```yaml
title: "Idea: "
labels: ["enhancement", "needs-triage"]
body:
  - type: textarea
    id: problem
    attributes:
      label: Problem you're solving
    validations:
      required: true
  - type: textarea
    id: solution
    attributes:
      label: Proposed solution
    validations:
      required: true
  - type: textarea
    id: local_first_fit
    attributes:
      label: How does this fit the local-first / HITL model?
      description: Local-first (no data leaves the machine without explicit user action) and structural HITL are non-negotiable. How does your idea respect them?
  - type: dropdown
    id: willing_to_build
    attributes:
      label: Are you willing to build this?
      options:
        - "Yes — I want to build it and would like guidance"
        - "Maybe — depends on complexity"
        - "No — requesting for someone else to build"
```

**Ops checklist (PR 2 description — performed by maintainer with admin access):**

1. **Restructure Discussions categories** (Settings → Discussions → "Manage categories"):
   - Delete `Polls` (current discussion count: 0; verify before deletion).
   - Rename `Show and tell` → `Show your workflow`. **Edit the slug field to keep `show-and-tell`** so the existing one discussion thread and any future external links don't break.
   - Toggle `Q&A` to **Answerable** (already is by default — verify).
   - Toggle `Ideas` to **Answerable** so ideas can be marked "built" / "declined" / "duplicate".
   - Final category set: `Announcements`, `General`, `Q&A` (answerable), `Ideas` (answerable), `Show your workflow` (slug `show-and-tell`).
2. **Publish & pin 4 seed threads** (authored by maintainer):
   - **Welcome to Nimbus Discussions** (Announcements). Pin first. Body: what each category is for; links to `CONTRIBUTING.md`, `SUPPORT.md`, `CODE_OF_CONDUCT.md`.
   - **FAQ — common questions** (Q&A). Pin second. 8–10 Q&As covering: where does my data live, how does HITL work, does Nimbus call external LLMs, how to add a connector, platform support, what's the difference between Issues and Discussions, how do I report a vulnerability, where's the roadmap.
   - **Roadmap input — what should Phase 6+ look like?** (Ideas). Pin third. Links to `docs/roadmap.md`. Solicits Phase 6 direction.
   - **Show your workflow — starter** (Show your workflow). Pin fourth. Maintainer-authored example (e.g., "How I use Nimbus for on-call handoffs") to set the tone.
3. **Move the one existing discussion** to the appropriate new category if needed.
4. **Smoke-test discussion templates** by opening a draft discussion in Q&A and Ideas categories — verify the template fields render.

**Three load-bearing details:**

1. **Pin order matters.** Welcome first (top of Discussions tab), FAQ second, then Roadmap and Show-your-workflow.
2. **The FAQ thread is the highest-leverage seed content.** Most repeat questions land in Discussions Q&A; pre-answering them in a pinned thread reduces triage load.
3. **Discussion template filename must match the category slug.** Q&A category has slug `q-a` → template file `q-a.yml`. Ideas slug `ideas` → `ideas.yml`. The renamed "Show your workflow" keeps slug `show-and-tell` (no template attached to it; free-form is appropriate). General and Announcements have no template.

**Verification (PR 2):**

- Opening a new discussion in Q&A auto-populates the template fields.
- Opening a new discussion in Ideas auto-populates the template fields.
- Discussions tab shows 5 categories with `Polls` absent.
- 4 pinned threads visible at the top of the Discussions tab.
- `config.yml`'s Discussions URLs (from PR 1) all resolve to 200.

**PR-2-specific risks:**

| Risk | Mitigation |
|---|---|
| Discussions reshape deletes a non-Polls category by accident | Ops checklist names categories explicitly; only `Polls` is destructive. Verify via `gh api graphql` snapshot before/after. |
| Maintainer-authored FAQ drifts from `docs/architecture.md` | FAQ thread is pinned; quarterly review feasible. Link from FAQ to architecture.md for the canonical answer. |
| Slug mismatch breaks `q-a.yml` or `ideas.yml` template | The Q&A category's slug is `q-a` already; we don't rename it. Smoke-test by submitting a draft discussion after PR merges. |
| Renaming Show-and-tell breaks the one existing discussion's URL | Keep slug `show-and-tell` when renaming (the slug is independently editable in the rename dialog). |
| Discussion templates may not honor `validations.required` the same way Issue Forms do | GitHub's docs describe discussion templates as sharing the same `body` schema as Issue Forms, but `validations.required` enforcement on discussions is not explicitly documented. Smoke test in PR 2's ops checklist: open a draft discussion in Q&A and submit with required fields blank — if it submits without error, `required` is prompt-only on discussions. Accept that outcome (the form-shape still prompts users); do not block PR 2 on it. |

### 5.4 — PR 3: GFI on-ramp

**Files (1 modified):**

| File | Change |
|---|---|
| `docs/CONTRIBUTING.md` | **Modified.** Insert new section `## What makes a good first issue?` between "Find Something to Work On" and "Development Workflow". ~40–50 lines. |

**GFI criteria section content (canonical bullets that gate the `good first issue` label):**

```markdown
## What makes a good first issue?

The `good first issue` label is a contract, not a suggestion. An issue carrying this label must satisfy every bullet below. Issues that don't satisfy them shouldn't have the label.

| Criterion | Threshold |
|---|---|
| **Scope** | 1–3 files touched, ≤ 100 LOC change |
| **Time estimate** | 1–3 hours for a first-time contributor (assumes TypeScript familiarity; no Bun/SQLite/Tauri-specific knowledge required) |
| **Mentor pinged** | Issue body names one maintainer the contributor can `@mention` for guidance. The named maintainer commits to responding within 48 h **(business days, excluding weekends and holidays)** |
| **Definition of done** | Issue body has a concrete checklist of what "complete" means (file changed + behavior verified + test added) |
| **Test surface** | Either an existing test file exists for the area, or the issue specifies the test file to add |
| **Security-invariant clear** | Issue does NOT touch `engine/executor.ts`, `vault/`, `ipc/lan-server.ts`, `ui/src-tauri/src/gateway_bridge.rs`, or any I1–I12 wiring site. Issues touching those are explicitly **not** GFI regardless of size |
| **Labels** | `good first issue` + `help wanted` (optional) + `pkg:<area>` |

If your mentor hasn't responded in 48 h (business days, excluding weekends and holidays), ping `@nimbus-agent/maintainers` on the issue.

**For maintainers:** before applying the `good first issue` label, run through the table above. If any row fails, fix the issue body or use a different label (`help wanted` is more permissive — no mentor commitment, larger scope OK).
```

**Ops checklist (PR 3 description):**

1. **Re-audit existing GFI issues** (#243, #244, #245, #246) against the new criteria. For each:
   - Add a mentor `@mention` if missing.
   - Add a concrete Definition-of-done checklist if missing.
   - Close + relabel as `help wanted` if it no longer qualifies.
2. **Seed 8–12 new GFI issues** across these source pools (target ≥3 distinct `pkg:*` labels):
   - **Under-covered test surfaces.** Source: `bun run test:coverage` output; pick modules at 80–84% line coverage where one targeted test would close the gap. Yield: 3–4 issues.
   - **CLI ergonomics polish.** Source: grep `console.log`/`process.stdout.write` in `packages/cli/src/commands/` for commands not yet respecting `NO_COLOR`; missing `--help` text. Yield: 2–3 issues.
   - **Connector error-message clarity.** Source: grep `throw new Error` in `packages/mcp-connectors/<*>/src/` for unhelpful error strings (e.g., bare `"unauthorized"`). Yield: 2–3 issues.
   - **Docs site connector pages.** Source: existing #243 issue split into per-connector issues for the 5–6 most-requested connectors. Yield: 2–3 issues.
3. **Distribute mentor names** across the 12 issues. Aim for 3–4 distinct maintainers each named on 3–4 issues — avoids any one maintainer becoming the 48-h-response bottleneck.
4. **Apply the issue template consistently** — title prefix `gfi: `, body uses: problem · definition of done · suggested approach · mentor.
5. **Track the seed batch in PR 3's description** as a literal checklist that is filled in as issues are created. Use this exact shape so reviewers can confirm completeness before merging the criteria doc:

   ```markdown
   ## Seed batch tracking (fill in as issues are created)

   Source pool: under-covered test surfaces
   - [ ] #___ (mentor: @___, pkg: ___)
   - [ ] #___ (mentor: @___, pkg: ___)
   - [ ] #___ (mentor: @___, pkg: ___)

   Source pool: CLI ergonomics polish
   - [ ] #___ (mentor: @___, pkg: ___)
   - [ ] #___ (mentor: @___, pkg: ___)

   Source pool: connector error-message clarity
   - [ ] #___ (mentor: @___, pkg: ___)
   - [ ] #___ (mentor: @___, pkg: ___)

   Source pool: docs site connector pages
   - [ ] #___ (mentor: @___, pkg: ___)
   - [ ] #___ (mentor: @___, pkg: ___)

   Mentor distribution check (each maintainer named on 3–4 issues):
   - @maintainerA: ___ issues
   - @maintainerB: ___ issues
   - @maintainerC: ___ issues
   ```

   Issue creation is **delegated**, not centralized: each maintainer creates the issues that name them as mentor (commitment is implicit in self-creation). The PR author audits the checklist before requesting final review.

**Three load-bearing details:**

1. **Criteria is a Definition, not a Manifesto.** The bullets are merge-gate criteria for the label — issues lacking them shouldn't have it. The doc itself is short and concrete.
2. **`pkg:*` distribution matters.** Newcomers self-select by area of interest; clustering all 12 issues in one package narrows the funnel. Target ≥3 packages.
3. **Mentor commitment is the trust signal.** The named maintainer commits to responding within 48 h. Without that, the on-ramp is hollow.

**Verification (PR 3):**

- After merge, `docs/CONTRIBUTING.md` lychee link-check still passes.
- After ops: querying GitHub for `is:issue is:open label:"good first issue"` returns 12–16 issues (4 existing + 8–12 new) spanning ≥3 distinct `pkg:*` labels.
- Each seeded issue has a named mentor and a Definition-of-done checklist.

**PR-3-specific risks:**

| Risk | Mitigation |
|---|---|
| Seed issues get claimed but abandoned by contributors | Manual quarterly cleanup; defer auto-unassign bot to future enhancement. |
| Criteria drift over time | Quarterly audit; the criteria section lives in `CONTRIBUTING.md`, which is touched rarely, so churn is low. |
| Maintainer named in 12 issues becomes the 48-h-response bottleneck | Distribute mentor names across 3–4 maintainers, each named on 3–4 issues. Track via the seed-batch checklist in PR 3's description. |
| Seeded issue's "test surface" can't actually be tested without touching a security-invariant area | Re-check every seed candidate against the security-invariant clear bullet before posting. Reject candidates that drift over the line. |

---

## 6. Acceptance criteria

### 6.1 — Automated (gate the merge)

- `bun --cwd packages/docs run build` exits `0` on every PR (covers PR 3's `CONTRIBUTING.md` change rendering correctly on the docs site).
- `lychee` link-check on `SUPPORT.md`, `CONTRIBUTING.md`, and `config.yml` `contact_links` resolves all URLs.
- After PR 1: the GitHub issue picker offers exactly 4 forms + 4 contact links, with no blank-issue option (smoke-test within 1 h of merge).
- After PR 2: opening a draft discussion in Q&A and Ideas categories auto-populates the template fields.
- After PR 3: querying `is:issue is:open label:"good first issue"` returns 12–16 issues across ≥ 3 distinct `pkg:*` labels.

### 6.2 — Qualitative (acceptance signals, not merge gates)

- A first-time visitor lands on the repo's root, finds Discussions or `docs/SUPPORT.md` (via the GitHub Community Profile sidebar) within 30 seconds.
- A bug report opened by a new contributor includes OS, Bun version, and Nimbus version without being asked (the form enforces it).
- A "how do I…?" question lands in Discussions Q&A rather than Issues — measured 30 days post-merge by comparing the ratio of Q&A-vs-Issues "how" questions.
- A maintainer can scan a seeded GFI issue and confirm scope/mentor/DoD without reading code first.

---

## 7. Sub-project risks (beyond per-PR)

| Risk | Mitigation |
|---|---|
| Issue Forms YAML schema mistake ships broken to main | Smoke-test each form via a draft issue within 1 h of PR 1 merge; pre-stage a revert PR before merging. |
| Discussions reshape ops accidentally deletes a non-Polls category | Ops checklist names categories explicitly; only `Polls` is destructive. Snapshot via `gh api graphql` before and after. |
| Seed GFI batch sets expectations the maintainer team can't meet (48-h SLA × 12 issues) | Distribute mentor names across 3–4 maintainers (each named on 3–4 issues); treat 48-h SLA as soft (explicitly business-days only in the criteria section); document fallback in criteria section ("If mentor hasn't responded in 48 h, ping `@nimbus-agent/maintainers`"). |
| Sub-project C lands but Discussions remains empty | The 4 pinned seed threads in PR 2 are the seeding mechanism. Track Discussions activity 30 days post-merge as the qualitative signal in §6.2. |
| `config.yml` contact links rot when Discussions URLs change | The URLs use category slugs that PR 2 explicitly preserves (§5.3 "keep slug `show-and-tell`"; Q&A and Ideas not renamed). Lychee link-check on every PR catches future breakage. |

---

## 8. File inventory (cumulative)

| PR | New | Modified | Deleted (replaced) | Total file changes |
|---|---|---|---|---|
| 1 | 6 (`bug_report.yml`, `feature_request.yml`, `connector_request.yml`, `documentation_issue.yml`, `config.yml` in `.github/ISSUE_TEMPLATE/`; `docs/SUPPORT.md`) | 1 (`.github/PULL_REQUEST_TEMPLATE.md`) | 3 (`.github/ISSUE_TEMPLATE/{bug_report,feature_request,connector_request}.md`) | 10 |
| 2 | 2 (`q-a.yml`, `ideas.yml` discussion templates) | — | — | 2 |
| 3 | — | 1 (`docs/CONTRIBUTING.md`) | — | 1 |
| **Total (union)** | **8** | **2** | **3** | **13 file changes** + **~16–20 GitHub-side ops** (4 Issue Form smoke tests + category reshape + 4 pinned threads + ~12 seed issues + audit of 4 existing GFIs) |

---

## 9. Out of scope — explicitly deferred

| Item | Future sub-project / rationale |
|---|---|
| `.github/FUNDING.yml` | Deferred until GitHub Sponsors / Open Collective is real (locked decision §2 #5). |
| Moving `docs/CONTRIBUTING.md` / `CODE_OF_CONDUCT.md` / `SECURITY.md` to `.github/` or repo root | Current locations are auto-discovered by GitHub Community Standards (locked decision §2 #6). |
| `GOVERNANCE.md` | No active need; revisit when maintainer team grows. |
| Auto-unassign-after-N-days bot for abandoned GFI claims | Future enhancement. Manual quarterly cleanup is acceptable at current scale. |
| CI badges row in the README (coverage / Scorecard / Provenance) | Sub-project D per §12 of Sub-project A. |
| Public benchmark publishing | Sub-project D. |
| Automated CHANGELOG | Sub-project D (or already covered by `release-please` — verify in D). |
| GitHub topics, awesome-list submissions, docs site SEO | Sub-project E per §12 of Sub-project A. |
| Bespoke logo replacing `☁️` emoji | Future / optional per §12 of Sub-project A. |
| Discussion templates for Announcements, General, Show-your-workflow | Free-form is appropriate; only Q&A and Ideas benefit from required-field prompts. |
| `release-please` configuration changes, signing-workflow polish | Release-tooling sub-project, not C. |

---

## 10. Cross-sub-project references

- [Sub-project A — README hero redesign design](./2026-05-11-readme-hero-redesign-design.md) — §12 names this sub-project as C and lists its in-scope items.
- [Sub-project B — Docs publish + per-package READMEs design](./2026-05-12-sub-project-B-docs-publish-design.md) — B's `docs/SECURITY.md` is the target of `config.yml`'s Security contact link.
- [Phase 5 sequencing — plan-of-plans](./2026-05-06-phase-5-sequencing-design.md)
- [Nimbus architecture reference](../../architecture.md) — unchanged by C.
- [Security invariants](../../SECURITY-INVARIANTS.md) — none touched by C.

---

## 11. Design-review reconciliation

External review of this spec ([`2026-05-12-sub-project-C-community-pack-design-review.md`](./2026-05-12-sub-project-C-community-pack-design-review.md), 2026-05-12) raised four suggestions and three open questions. Reconciled here for the record so future readers know each was weighed:

| # | Reviewer concern | Status | Resolution |
|---|---|---|---|
| 1 | `SUPPORT.md` should live in `docs/` (not `.github/`) to match the §2 #6 decision on `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` location | **Accepted** | Moved to `docs/SUPPORT.md`. §2 #6, §5.1 component table, §5.2 file row, the SUPPORT.md content example (relative links flipped from `../docs/X.md` to `./X.md`), §8 inventory, and §1 goals all updated. GitHub Community Standards auto-discovers `docs/SUPPORT.md` the same way it does the other three. |
| 2 | The 48-h GFI mentor SLA needs a "business days" clarifier to prevent maintainer weekend guilt | **Accepted** | §5.4 GFI criteria table now reads "within 48 h (business days, excluding weekends and holidays)" and the §5.4 fallback note mirrors it. §7 risk row updated to reference the business-days qualification. |
| 3 | `config.yml` uses absolute URLs that point fork users' contact links back to upstream `nimbus-agent/Nimbus` | **Accepted (documentation only)** | Added an explanatory paragraph in §5.2 after the `config.yml` shape: behavior is intentional (security reports and Q&A from forks should reach upstream maintainers, not get silently scattered into per-fork Issues). No config change — GitHub's schema doesn't support relative URLs in `contact_links`. |
| 4 | `bug_report.yml` should prompt for log attachment | **Accepted (modified)** | The "Additional Context" textarea description now recommends pasting `nimbus diag --json` output rather than free-form log files. Rationale recorded inline: the CLI exists today, output is structured (parseable for triage), and credential redaction is already enforced by the structured logger. There is no canonical `nimbus.log` path users could be pointed to. |
| Q1 | Are we 100% certain discussion templates support `validations.required` and dropdowns the same as Issue Forms? | **Acknowledged + smoke-test deferred** | GitHub's docs say discussion templates share the `body` schema with Issue Forms, but `validations.required` enforcement on discussions is not explicitly documented. Added a §5.3 risk row: PR 2's smoke test opens a draft Q&A discussion with required fields blank — if it submits without error, we accept `required` as prompt-only on discussions and do not block PR 2. |
| Q2 | PR 3 seed-issue coordination is hand-wavy: who creates them, how is it tracked? | **Accepted** | §5.4 ops checklist now includes a literal Markdown checklist template that PR 3's description must use, with placeholders for each issue number / mentor / pkg. Explicit instruction: "Issue creation is delegated, not centralized: each maintainer creates the issues that name them as mentor; the PR author audits the checklist before final review." |
| Q3 | The `## Linked Discussion` PR template section may be ignored without a coupled action prompt | **Accepted (prompt tightened)** | §5.2 PR template addition now has a more directive HTML comment that explicitly warns: GitHub does NOT auto-close Discussions on merge (`Closes #N` is Issues-only), so linking a Discussion implies a manual maintainer follow-up (mark answered / mark built). Calling this out avoids the misconception that linking does the right thing automatically. |
