# Sub-project C — Community Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land Sub-project C — the community pack — as three sequential GitHub PRs that together establish a deliberate contributor on-ramp: Issue Forms with required fields, an Issue→Discussion redirect bridge, polished PR template, decision-tree SUPPORT doc, Discussions infrastructure (templates + reshape ops + seed threads), and a good-first-issue criteria section + seed batch.

**Architecture:** Three-PR train. **PR 1** lands seven file-only community-config changes (4 new Issue Forms in `.github/ISSUE_TEMPLATE/`, `config.yml`, modified `PULL_REQUEST_TEMPLATE.md`, new `docs/SUPPORT.md`) and deletes three replaced markdown templates. **PR 2** lands two discussion templates (`.github/DISCUSSION_TEMPLATE/{q-a,ideas}.yml`) and carries an operational checklist for Discussions category reshape + four pinned seed threads. **PR 3** lands a GFI criteria section in `docs/CONTRIBUTING.md` and carries an operational checklist for re-auditing four existing GFI issues and seeding 8-12 new ones across ≥3 packages. PR 1 ships first (it's independent and is the redirect-bridge PR); PR 2 and PR 3 can ship in parallel after PR 1 merges (they touch disjoint surfaces).

**Tech Stack:** GitHub Issue Forms (YAML schema), GitHub Discussion templates (YAML schema, same `body` shape as Issue Forms), GitHub Discussions GraphQL API (via `gh api graphql`), `bun` + `js-yaml` for local YAML parse-validation, `gh` CLI for issue creation and PR management. No new dependencies, no source-code changes, no security-invariant impact.

---

## Spec reference

This plan implements [`docs/superpowers/specs/2026-05-12-sub-project-C-community-pack-design.md`](../specs/2026-05-12-sub-project-C-community-pack-design.md). Every locked decision in §2 of the spec, every file in §5.1's component table, every ops bullet in §5.3 and §5.4, and every acceptance criterion in §6.1 maps to a task below.

---

## File structure

```
.github/ISSUE_TEMPLATE/
  bug_report.yml             NEW (Task 1)    — Issue Form; replaces bug_report.md
  feature_request.yml        NEW (Task 2)    — Issue Form; replaces feature_request.md
  connector_request.yml      NEW (Task 3)    — Issue Form; replaces connector_request.md
  documentation_issue.yml    NEW (Task 4)    — Issue Form; no predecessor
  config.yml                 NEW (Task 5)    — picker config: blank-issues off + 4 contact links
  bug_report.md              DELETED (Task 1) — same-commit deletion
  feature_request.md         DELETED (Task 2) — same-commit deletion
  connector_request.md       DELETED (Task 3) — same-commit deletion

.github/
  PULL_REQUEST_TEMPLATE.md   MODIFIED (Task 6) — add "## Linked Discussion" section

.github/DISCUSSION_TEMPLATE/
  q-a.yml                    NEW (Task 9)    — Q&A discussion template
  ideas.yml                  NEW (Task 10)   — Ideas discussion template

docs/
  SUPPORT.md                 NEW (Task 7)    — Decision-tree document (~50 lines)
  CONTRIBUTING.md            MODIFIED (Task 12) — add "## What makes a good first issue?" section
```

---

## PR boundaries and sequencing

| PR | Tasks | Branch (example) | Depends on |
|---|---|---|---|
| **PR 1 — Code-side config files** | 1-8 | `dev/<you>/sub-project-C-pr1-config-files` | nothing (ships first) |
| **PR 2 — Discussions infra + ops** | 9-11 | `dev/<you>/sub-project-C-pr2-discussions` | PR 1 merged (so `config.yml`'s Discussions contact-links resolve end-to-end) |
| **PR 3 — GFI on-ramp** | 12-13 | `dev/<you>/sub-project-C-pr3-gfi` | PR 1 merged (independent of PR 2; can ship parallel) |

**Sequencing rule:** Do NOT open PR 2 or PR 3 against `main` until PR 1 is merged. Each PR is created from a fresh branch off `main` (use whatever worktree mechanism is appropriate — `EnterWorktree`, `git worktree add`, or a plain branch). The plan assumes the executor sets up isolation via the `superpowers:using-git-worktrees` skill at execution time.

---

# PR 1 — Code-side config files

Open a fresh branch off `main` for this PR (e.g. `dev/<you>/sub-project-C-pr1-config-files`). All tasks below commit to this branch.

## Task 1: Migrate bug_report to Issue Form

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Delete: `.github/ISSUE_TEMPLATE/bug_report.md`

- [ ] **Step 1: Write `.github/ISSUE_TEMPLATE/bug_report.yml`**

Create the file with this exact content:

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

        Looking for help with a usage question instead? Open a Q&A in
        [Discussions](https://github.com/nimbus-agent/Nimbus/discussions/categories/q-a).

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
      description: What should have happened?
    validations:
      required: true

  - type: textarea
    id: actual
    attributes:
      label: Actual Behaviour
      description: What happened instead? Include the full error output or stack trace.
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

- [ ] **Step 2: Verify YAML parses**

Run:

```bash
bun -e "const yaml = require('js-yaml'); const fs = require('node:fs'); const doc = yaml.load(fs.readFileSync('.github/ISSUE_TEMPLATE/bug_report.yml', 'utf8')); console.log('Top-level keys:', Object.keys(doc).sort().join(', ')); console.log('Body element count:', doc.body.length);"
```

Expected output:

```
Top-level keys: body, description, labels, name, title
Body element count: 11
```

If the script throws or the body count is wrong, the YAML structure is broken — re-read Step 1's content.

- [ ] **Step 3: Delete the replaced `.md` template**

Run:

```bash
git rm .github/ISSUE_TEMPLATE/bug_report.md
```

Expected output:

```
rm '.github/ISSUE_TEMPLATE/bug_report.md'
```

- [ ] **Step 4: Stage the new YAML and verify both changes are queued**

Run:

```bash
git add .github/ISSUE_TEMPLATE/bug_report.yml
git status --short
```

Expected output (order may vary):

```
A  .github/ISSUE_TEMPLATE/bug_report.yml
D  .github/ISSUE_TEMPLATE/bug_report.md
```

Both `A` (added YAML) and `D` (deleted .md) must appear. If `bug_report.md` isn't shown as deleted, re-run Step 3.

- [ ] **Step 5: Commit**

Run:

```bash
git commit -m "feat(github): migrate bug_report to Issue Form

Required fields (description, steps, expected, actual, OS, Bun version,
Nimbus version) enforced via Issue Forms schema. OS becomes a dropdown;
component and platform-repro stay as checkbox groups. Additional-context
field recommends \`nimbus diag --json\` rather than free-form logs.

Replaces .github/ISSUE_TEMPLATE/bug_report.md (deleted in same commit
to avoid duplicate picker entries).

Part of Sub-project C PR 1."
```

Expected: the commit succeeds (one file added, one deleted, no other paths touched).

---

## Task 2: Migrate feature_request to Issue Form

**Files:**
- Create: `.github/ISSUE_TEMPLATE/feature_request.yml`
- Delete: `.github/ISSUE_TEMPLATE/feature_request.md`

- [ ] **Step 1: Write `.github/ISSUE_TEMPLATE/feature_request.yml`**

Create the file with this exact content:

```yaml
name: Feature Request
description: Propose a new capability or improvement
title: "feat: "
labels: ["enhancement", "needs-triage"]
body:
  - type: markdown
    attributes:
      value: |
        For large features, please open a [Discussions Ideas thread](https://github.com/nimbus-agent/Nimbus/discussions/categories/ideas)
        first to gauge interest and align on shape. Small, well-scoped features
        can go straight to this form.

  - type: textarea
    id: summary
    attributes:
      label: Summary
      description: One sentence — what do you want Nimbus to be able to do?
    validations:
      required: true

  - type: textarea
    id: problem
    attributes:
      label: Problem / Motivation
      description: What problem does this solve? Who is affected and how often?
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: Proposed Solution
      description: Describe the feature you have in mind. Be as specific as you can.
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives Considered
      description: What other approaches did you think about? Why did you prefer this one?

  - type: checkboxes
    id: non_negotiables
    attributes:
      label: Non-Negotiables Check
      description: Every feature must be consistent with the project's architectural constraints.
      options:
        - label: "**Local-first** — no user data or credentials leave the machine without an explicit user action"
        - label: "**HITL is structural** — if this involves a destructive or outgoing action, it must go through the consent gate in `executor.ts`"
        - label: "**No plaintext credentials** — any credential handling goes through the Vault only"
        - label: "**MCP as connector standard** — if this requires a cloud API, it belongs in an MCP connector, not the Engine"
        - label: "**Platform equality** — this works on Windows, macOS, and Linux"

  - type: dropdown
    id: roadmap_phase
    attributes:
      label: Roadmap Phase
      description: Which phase does this belong to? Features outside the active phase will be deferred.
      options:
        - "Phase 5 — The Extended Surface (Active)"
        - "Phase 6 — Team"
        - "Phase 7 — Engineering Excellence"
        - "Phase 8 — Security Engineering"
        - "Phase 9 — AI Engineering Loop"
        - "Phase 10 — The Autonomous Agent"
        - "Phase 11 — Sovereign Mesh"
        - "Phase 12 — Enterprise"
        - "Phase 13 — Desktop Distribution"
        - "Phase 14 — Agent Evolution / AI v2"
        - "Unsure / cross-phase"

  - type: textarea
    id: additional
    attributes:
      label: Additional Context
      description: Mockups, related issues, prior art in other tools, anything that helps.
```

- [ ] **Step 2: Verify YAML parses**

Run:

```bash
bun -e "const yaml = require('js-yaml'); const fs = require('node:fs'); const doc = yaml.load(fs.readFileSync('.github/ISSUE_TEMPLATE/feature_request.yml', 'utf8')); console.log('Top-level keys:', Object.keys(doc).sort().join(', ')); console.log('Body element count:', doc.body.length);"
```

Expected output:

```
Top-level keys: body, description, labels, name, title
Body element count: 8
```

- [ ] **Step 3: Delete the replaced `.md` template**

Run:

```bash
git rm .github/ISSUE_TEMPLATE/feature_request.md
```

Expected output:

```
rm '.github/ISSUE_TEMPLATE/feature_request.md'
```

- [ ] **Step 4: Stage and verify**

Run:

```bash
git add .github/ISSUE_TEMPLATE/feature_request.yml
git status --short
```

Expected output should include both:

```
A  .github/ISSUE_TEMPLATE/feature_request.yml
D  .github/ISSUE_TEMPLATE/feature_request.md
```

- [ ] **Step 5: Commit**

Run:

```bash
git commit -m "feat(github): migrate feature_request to Issue Form

Required fields (summary, problem, proposed solution) enforced via Issue
Forms schema. Non-negotiables become a structured checkbox group; roadmap
phase becomes a dropdown that drops completed phases from the option set.

Replaces .github/ISSUE_TEMPLATE/feature_request.md (deleted in same commit).

Part of Sub-project C PR 1."
```

---

## Task 3: Migrate connector_request to Issue Form

**Files:**
- Create: `.github/ISSUE_TEMPLATE/connector_request.yml`
- Delete: `.github/ISSUE_TEMPLATE/connector_request.md`

- [ ] **Step 1: Write `.github/ISSUE_TEMPLATE/connector_request.yml`**

Create the file with this exact content:

```yaml
name: Connector / Extension Request
description: Request a new MCP connector for a cloud service or third-party integration
title: "connector: "
labels: ["connector", "needs-triage"]
body:
  - type: markdown
    attributes:
      value: |
        Want to scope the connector together first? Open a
        [Discussions Ideas thread](https://github.com/nimbus-agent/Nimbus/discussions/categories/ideas)
        before filing this form for non-trivial connectors.

  - type: input
    id: service_name
    attributes:
      label: Service name
      placeholder: "e.g. Notion, Dropbox, Slack, GitHub"
    validations:
      required: true

  - type: input
    id: service_website
    attributes:
      label: Service website

  - type: input
    id: api_docs
    attributes:
      label: API / developer docs URL

  - type: textarea
    id: use_cases
    attributes:
      label: Use cases
      description: What would you want Nimbus to do with this service? Give 2–3 concrete examples.
      placeholder: |
        1.
        2.
        3.
    validations:
      required: true

  - type: dropdown
    id: auth_type
    attributes:
      label: Authentication type
      options:
        - OAuth 2.0
        - API key / PAT
        - Other (specify below)
        - Unknown

  - type: dropdown
    id: api_availability
    attributes:
      label: API availability
      options:
        - Public (generally available)
        - Beta / preview
        - Requires approval
        - Unknown

  - type: textarea
    id: auth_scopes_and_limits
    attributes:
      label: Auth scopes / rate limits
      description: Relevant API scopes the connector would need; known rate limits.

  - type: checkboxes
    id: read_ops
    attributes:
      label: Read operations
      options:
        - label: List files / items
        - label: Read file content
        - label: Search
        - label: Other (specify in additional context)

  - type: checkboxes
    id: write_ops
    attributes:
      label: Write operations (will require HITL consent gate)
      options:
        - label: Create
        - label: Update / rename
        - label: Delete
        - label: Send / publish
        - label: Other (specify in additional context)

  - type: textarea
    id: existing_sdk
    attributes:
      label: Existing SDK / libraries
      description: Are there existing npm packages for this service's API that could be used?

  - type: dropdown
    id: willing_to_build
    attributes:
      label: Are you willing to build this?
      options:
        - "Yes — I want to build it and would like guidance"
        - "Possibly — depends on complexity"
        - "No — requesting for someone else to build"
    validations:
      required: true

  - type: textarea
    id: additional
    attributes:
      label: Additional context
      description: Related issues, prior art, anything else that helps prioritise or scope this.
```

- [ ] **Step 2: Verify YAML parses**

Run:

```bash
bun -e "const yaml = require('js-yaml'); const fs = require('node:fs'); const doc = yaml.load(fs.readFileSync('.github/ISSUE_TEMPLATE/connector_request.yml', 'utf8')); console.log('Top-level keys:', Object.keys(doc).sort().join(', ')); console.log('Body element count:', doc.body.length);"
```

Expected output:

```
Top-level keys: body, description, labels, name, title
Body element count: 13
```

- [ ] **Step 3: Delete the replaced `.md` template**

Run:

```bash
git rm .github/ISSUE_TEMPLATE/connector_request.md
```

- [ ] **Step 4: Stage and verify**

Run:

```bash
git add .github/ISSUE_TEMPLATE/connector_request.yml
git status --short
```

Expected output should include both:

```
A  .github/ISSUE_TEMPLATE/connector_request.yml
D  .github/ISSUE_TEMPLATE/connector_request.md
```

- [ ] **Step 5: Commit**

Run:

```bash
git commit -m "feat(github): migrate connector_request to Issue Form

Required fields (service name, use cases, willing-to-build) enforced via
Issue Forms schema. Auth type and API availability become dropdowns;
read/write ops become structured checkbox groups so triage can grep them.

Replaces .github/ISSUE_TEMPLATE/connector_request.md (deleted in same
commit).

Part of Sub-project C PR 1."
```

---

## Task 4: Add documentation_issue Issue Form

**Files:**
- Create: `.github/ISSUE_TEMPLATE/documentation_issue.yml`

No `.md` predecessor — this is a new addition.

- [ ] **Step 1: Write `.github/ISSUE_TEMPLATE/documentation_issue.yml`**

Create the file with this exact content:

```yaml
name: Documentation Issue
description: Something in the docs is wrong, missing, or unclear
title: "docs: "
labels: ["documentation", "needs-triage"]
body:
  - type: markdown
    attributes:
      value: |
        Use this form for issues in the project's documentation — the docs site
        at https://nimbus-agent.dev, the per-package READMEs, `docs/*.md`
        files, or the inline CLI `--help` text.

  - type: input
    id: page_or_path
    attributes:
      label: Page or file path
      description: URL on the docs site, or repo path like `docs/architecture.md` or `packages/cli/README.md`.
    validations:
      required: true

  - type: textarea
    id: whats_wrong
    attributes:
      label: What's wrong?
      description: Describe the problem — incorrect information, missing section, broken link, unclear wording, outdated example.
    validations:
      required: true

  - type: textarea
    id: suggested_fix
    attributes:
      label: Suggested fix
      description: What should the docs say instead? A specific suggestion is more actionable than "this is confusing".

  - type: dropdown
    id: package
    attributes:
      label: Package / area
      options:
        - "Docs site (packages/docs/)"
        - "Gateway (packages/gateway/)"
        - "CLI (packages/cli/)"
        - "UI (packages/ui/)"
        - "SDK (packages/sdk/)"
        - "Client (packages/client/)"
        - "MCP connector (packages/mcp-connectors/*)"
        - "Repo-root docs (docs/*.md)"
        - "Other / cross-cutting"
```

- [ ] **Step 2: Verify YAML parses**

Run:

```bash
bun -e "const yaml = require('js-yaml'); const fs = require('node:fs'); const doc = yaml.load(fs.readFileSync('.github/ISSUE_TEMPLATE/documentation_issue.yml', 'utf8')); console.log('Top-level keys:', Object.keys(doc).sort().join(', ')); console.log('Body element count:', doc.body.length);"
```

Expected output:

```
Top-level keys: body, description, labels, name, title
Body element count: 5
```

- [ ] **Step 3: Stage and verify**

Run:

```bash
git add .github/ISSUE_TEMPLATE/documentation_issue.yml
git status --short
```

Expected output:

```
A  .github/ISSUE_TEMPLATE/documentation_issue.yml
```

- [ ] **Step 4: Commit**

Run:

```bash
git commit -m "feat(github): add documentation_issue Issue Form

New form (no .md predecessor). Required: page/path, what's wrong.
Optional: suggested fix, package dropdown. Auto-labels: documentation,
needs-triage.

Fills a gap — previously, doc issues filed as bug_report or feature_request
mismatched the form fields. The package dropdown helps the labeler workflow
auto-apply pkg:* labels for triage.

Part of Sub-project C PR 1."
```

---

## Task 5: Add ISSUE_TEMPLATE/config.yml

**Files:**
- Create: `.github/ISSUE_TEMPLATE/config.yml`

- [ ] **Step 1: Write `.github/ISSUE_TEMPLATE/config.yml`**

Create the file with this exact content:

```yaml
blank_issues_enabled: false

contact_links:
  - name: Usage question or "how do I…?"
    url: https://github.com/nimbus-agent/Nimbus/discussions/categories/q-a
    about: Ask a usage question in Discussions Q&A. The community and maintainers triage there faster than Issues for "how do I" questions.

  - name: Idea / roadmap input
    url: https://github.com/nimbus-agent/Nimbus/discussions/categories/ideas
    about: Propose a new capability or weigh in on the Phase 6+ roadmap in Discussions Ideas.

  - name: Security vulnerability (private — do NOT open a public issue)
    url: https://github.com/nimbus-agent/Nimbus/blob/main/docs/SECURITY.md
    about: See SECURITY.md for the private reporting channel. Public issues for vulnerabilities create disclosure risk.

  - name: General chat
    url: https://github.com/nimbus-agent/Nimbus/discussions/categories/general
    about: Talking-shop, casual questions, "is anyone else seeing X?".
```

- [ ] **Step 2: Verify YAML parses and contact_links has 4 entries**

Run:

```bash
bun -e "const yaml = require('js-yaml'); const fs = require('node:fs'); const doc = yaml.load(fs.readFileSync('.github/ISSUE_TEMPLATE/config.yml', 'utf8')); console.log('blank_issues_enabled:', doc.blank_issues_enabled); console.log('contact_links count:', doc.contact_links.length); console.log('contact_link names:', doc.contact_links.map(l => l.name).join(' | '));"
```

Expected output:

```
blank_issues_enabled: false
contact_links count: 4
contact_link names: Usage question or "how do I…?" | Idea / roadmap input | Security vulnerability (private — do NOT open a public issue) | General chat
```

If `blank_issues_enabled` is `true` or `contact_links count` is not 4, re-check Step 1.

- [ ] **Step 3: Verify contact-link URLs resolve (3 of the 4)**

Three of the four URLs point to Discussions categories that already exist; the fourth points to `docs/SECURITY.md` which exists. Confirm each returns 200:

Run:

```bash
for url in \
  "https://github.com/nimbus-agent/Nimbus/discussions/categories/q-a" \
  "https://github.com/nimbus-agent/Nimbus/discussions/categories/ideas" \
  "https://github.com/nimbus-agent/Nimbus/discussions/categories/general" \
  "https://github.com/nimbus-agent/Nimbus/blob/main/docs/SECURITY.md"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" -L "$url")
    echo "$status  $url"
done
```

Expected output: all four lines should begin with `200`.

If any returns `404`, the URL is broken — verify Discussions categories exist by running `gh api graphql -f query='{repository(owner:"nimbus-agent",name:"Nimbus"){discussionCategories(first:20){nodes{slug}}}}'` and check that `q-a`, `ideas`, `general` slugs are in the list. (`docs/SECURITY.md` should exist on main; if not, see the spec's "depends on Sub-project B" line.)

- [ ] **Step 4: Stage and commit**

Run:

```bash
git add .github/ISSUE_TEMPLATE/config.yml
git commit -m "feat(github): add ISSUE_TEMPLATE/config.yml redirect bridge

blank_issues_enabled: false stops blank issues at the picker. Four
contact_links route at the picker:
  - usage questions -> Discussions Q&A
  - ideas / roadmap input -> Discussions Ideas
  - security vulnerabilities -> docs/SECURITY.md (private channel)
  - general chat -> Discussions General

This is the Issue->Discussion redirect bridge. Without it, every
'how do I...?' lands in Issues. URLs are absolute by GitHub's
config.yml schema; forks see upstream URLs (intentional - security
reports should reach upstream).

Part of Sub-project C PR 1."
```

---

## Task 6: Add Linked Discussion section to PR template

**Files:**
- Modify: `.github/PULL_REQUEST_TEMPLATE.md`

- [ ] **Step 1: Inspect current PR template**

Run:

```bash
cat .github/PULL_REQUEST_TEMPLATE.md
```

Expected: the file starts with `## Summary`, has `## Related Issue`, then `## Type of Change`. The Linked Discussion section gets inserted between `## Related Issue` and `## Type of Change`.

- [ ] **Step 2: Modify the file**

Use your editor to insert a new section between the existing `Closes #` line (end of `## Related Issue`) and the `## Type of Change` heading. The exact text to add:

```markdown
## Linked Discussion

<!-- Optional but encouraged. If this PR implements an idea agreed in Discussions Ideas, answers a Q&A, or addresses something flagged in General, paste the discussion URL here so a maintainer can update or mark-answered the thread after merge. Note: GitHub does NOT auto-close Discussions from PR merges (only Issues via `Closes #N`); this is a manual maintainer follow-up. -->

```

After insertion, the relevant region of the file should look like this (verify with `grep -A 10 'Related Issue' .github/PULL_REQUEST_TEMPLATE.md`):

```markdown
## Related Issue

<!-- Link the issue this PR addresses: "Closes #123" or "Relates to #456" -->

Closes #

## Linked Discussion

<!-- Optional but encouraged. If this PR implements an idea agreed in Discussions Ideas, answers a Q&A, or addresses something flagged in General, paste the discussion URL here so a maintainer can update or mark-answered the thread after merge. Note: GitHub does NOT auto-close Discussions from PR merges (only Issues via `Closes #N`); this is a manual maintainer follow-up. -->

## Type of Change
```

- [ ] **Step 3: Verify nothing else changed**

Run:

```bash
git diff .github/PULL_REQUEST_TEMPLATE.md
```

Expected: the diff should show exactly one inserted block (`## Linked Discussion` heading + the HTML comment + one blank line). Every existing section header (`## Summary`, `## Related Issue`, `## Type of Change`, `## Non-Negotiables Checklist`, `## Coverage`, `## Testing`, `## Screenshots / Output`, `## Notes for Reviewers`) must still be present unchanged.

If the diff shows anything other than the new block (e.g. trailing-whitespace changes, line-ending changes), undo and retry.

- [ ] **Step 4: Stage and commit**

Run:

```bash
git add .github/PULL_REQUEST_TEMPLATE.md
git commit -m "docs(github): add Linked Discussion section to PR template

New optional section between Related Issue and Type of Change.
Includes directive HTML comment explaining that GitHub does NOT
auto-close Discussions on merge (Closes #N is Issues-only) - linking
a Discussion implies a manual maintainer follow-up to mark the
thread answered or built.

The existing screenshot-checklist bullet under Non-Negotiables
stays as-is.

Part of Sub-project C PR 1."
```

---

## Task 7: Add docs/SUPPORT.md

**Files:**
- Create: `docs/SUPPORT.md`

Per the design's §2 #6 decision, `SUPPORT.md` lives in `docs/` (alongside `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`) rather than `.github/`. GitHub Community Standards auto-discovers it there.

- [ ] **Step 1: Write `docs/SUPPORT.md`**

Create the file with this exact content:

```markdown
# Where to ask for help with Nimbus

Different kinds of questions go to different places. Pick the channel that matches your need.

## "How do I use Nimbus to do X?" — usage question

→ [Discussions → Q&A](https://github.com/nimbus-agent/Nimbus/discussions/categories/q-a)

Maintainers and the community triage Q&A faster than the issue tracker for "how do I" questions. Search the FAQ thread (pinned at the top) before posting.

## "Nimbus did something unexpected / crashed / produced wrong output" — bug

→ [Open a bug report](https://github.com/nimbus-agent/Nimbus/issues/new?template=bug_report.yml)

The Issue Form will prompt you for OS, Bun version, Nimbus version, and reproduction steps — all required.

## "I have an idea for a new capability" — feature request

→ Discuss first, then file: [Discussions → Ideas](https://github.com/nimbus-agent/Nimbus/discussions/categories/ideas), or directly via the [feature request form](https://github.com/nimbus-agent/Nimbus/issues/new?template=feature_request.yml)

Large features benefit from a Discussions Ideas thread before a PR. Small, well-scoped features can go straight to the Issue Form.

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

- [ ] **Step 2: Verify the file builds in the docs site**

The Starlight docs build picks up `docs/*.md`. Verify:

```bash
bun --cwd packages/docs run build 2>&1 | tail -20
```

Expected: the last lines should include a "✓ Completed" or equivalent success message, no errors about `SUPPORT.md`. If Starlight is configured to only render specific paths (and `docs/SUPPORT.md` is outside its content collection), an error here is fine — the file is for GitHub Community Standards discovery, not the docs site. Verify by reading `packages/docs/astro.config.mjs` if there's a build error mentioning `SUPPORT.md`.

- [ ] **Step 3: Verify all links resolve via a `gh api`/curl spot-check**

Run:

```bash
for url in \
  "https://github.com/nimbus-agent/Nimbus/discussions/categories/q-a" \
  "https://github.com/nimbus-agent/Nimbus/issues/new?template=bug_report.yml" \
  "https://github.com/nimbus-agent/Nimbus/discussions/categories/ideas" \
  "https://github.com/nimbus-agent/Nimbus/issues/new?template=feature_request.yml" \
  "https://github.com/nimbus-agent/Nimbus/issues/new?template=connector_request.yml" \
  "https://github.com/nimbus-agent/Nimbus/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22" \
  "https://github.com/nimbus-agent/Nimbus/discussions/categories/general"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" -L "$url")
    echo "$status  $url"
done
```

Expected: all lines start with `200`. (The `issues/new?template=*.yml` URLs return 200 even before the corresponding forms exist on `main` — GitHub returns the picker page; once PR 1 merges and the forms are on main, those URLs auto-fill the picker.)

The two relative links (`./CONTRIBUTING.md`, `./SECURITY.md`) point to sibling files that already exist in `docs/`. Verify with:

```bash
ls docs/CONTRIBUTING.md docs/SECURITY.md
```

Expected: both files listed, no "No such file" errors.

- [ ] **Step 4: Stage and commit**

Run:

```bash
git add docs/SUPPORT.md
git commit -m "docs: add SUPPORT.md decision tree

Routes contributor questions to the right channel:
- usage questions -> Discussions Q&A
- bugs -> bug_report Issue Form
- features -> Discussions Ideas or feature_request form
- connector requests -> connector_request form
- contributing -> CONTRIBUTING.md + GFI label
- security -> SECURITY.md (private channel)
- general chat -> Discussions General

Lives in docs/ (matching CONTRIBUTING.md, CODE_OF_CONDUCT.md,
SECURITY.md). GitHub Community Standards auto-discovers it there
and surfaces a 'Support' link in the repo's Community Profile.

Part of Sub-project C PR 1."
```

---

## Task 8: Open PR 1 and post-merge smoke test

**No file changes.** This task opens PR 1 with all seven Tasks 1-7 commits, then runs the post-merge verification.

- [ ] **Step 1: Push the branch and open the PR**

Run:

```bash
git push -u origin HEAD
gh pr create --title "feat(community): Sub-project C PR 1 - code-side config files" --body "$(cat <<'EOF'
## Summary

PR 1 of Sub-project C (community pack). Code-side community-config changes only — no GitHub-side ops in this PR.

- Migrates `bug_report.md`, `feature_request.md`, `connector_request.md` → GitHub Issue Forms (YAML)
- Adds new `documentation_issue.yml` Issue Form
- Adds `.github/ISSUE_TEMPLATE/config.yml` — disables blank issues, adds 4 contact links (Q&A, Ideas, Security, General)
- Adds `## Linked Discussion` section to the PR template (between Related Issue and Type of Change)
- Adds `docs/SUPPORT.md` decision tree

## Related Issue

Closes # (no tracking issue; tracked in the design spec)

## Linked Discussion

(none — this is the spec-driven sub-project)

## Type of Change

- [ ] Bug fix
- [x] New feature (community-config addition)
- [ ] Breaking change
- [ ] Refactor
- [ ] Test improvement
- [x] Documentation only (for the PR template + SUPPORT.md additions)
- [ ] CI / tooling

## Spec reference

Implements `docs/superpowers/specs/2026-05-12-sub-project-C-community-pack-design.md` §5.2.

## Post-merge smoke test checklist

Run within ~1 h of merge (Issue Forms cannot be validated locally — server-side schema only):

- [ ] Visit `https://github.com/nimbus-agent/Nimbus/issues/new/choose`. Verify the picker shows exactly 4 forms (`Bug Report`, `Feature Request`, `Connector / Extension Request`, `Documentation Issue`) and 4 contact links (`Usage question or "how do I…?"`, `Idea / roadmap input`, `Security vulnerability (private — do NOT open a public issue)`, `General chat`). No blank-issue option.
- [ ] Click `Bug Report`. Verify the form loads with the title prefix `fix: `, all required fields are marked, and the OS dropdown shows the 9 expected options.
- [ ] Click `Feature Request`. Verify title prefix `feat: ` and the roadmap-phase dropdown shows Phase 5-14.
- [ ] Click `Connector / Extension Request`. Verify title prefix `connector: ` and the read-ops + write-ops checkbox groups render.
- [ ] Click `Documentation Issue`. Verify title prefix `docs: ` and the package dropdown shows 9 options.
- [ ] Click each of the 4 contact links — verify each navigates correctly (Q&A → discussions/q-a, Ideas → discussions/ideas, Security → blob/main/docs/SECURITY.md, General → discussions/general).
- [ ] If any form is broken, immediately open a revert PR for the affected `.yml` file(s).

## Non-Negotiables Checklist

- [x] `bun run typecheck` — N/A (no TypeScript changes)
- [x] `bun run lint` — N/A (no source code changed)
- [x] All existing tests pass — N/A
- [x] New behaviour is covered by tests — verification is server-side smoke test per spec §5.2
- [x] No `any` types introduced
- [x] No credentials, tokens, or secret values
- [x] Platform-specific code is behind PlatformServices — N/A
- [x] HITL consent gate not weakened
- [x] PR touches docs/README.md → screenshot — N/A (only `docs/SUPPORT.md` is touched; not the hero README)

## Notes for Reviewers

- All seven Tasks 1-7 commits are independent and reviewable in order.
- The `.md` → `.yml` migrations delete the `.md` in the same commit as the `.yml` add (avoids duplicate picker entries during deploy).
- Issue Forms are not locally testable — verification is the post-merge smoke test above.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected output: PR URL like `https://github.com/nimbus-agent/Nimbus/pull/<N>`.

- [ ] **Step 2: Wait for CI checks to complete**

Run:

```bash
gh pr checks --watch
```

Expected: all checks green, especially `docs-quality / lychee link check` (which lychee-checks `docs/SUPPORT.md`) and `docs-quality / docs-build` (which validates the docs site builds with the new SUPPORT.md). If lychee fails on any URL, fix the URL in the relevant file and amend the commit before merging.

- [ ] **Step 3: After CI passes, merge the PR**

Run:

```bash
gh pr merge --squash --auto
```

Or merge manually via the GitHub UI if the repo's merge settings differ.

Expected: PR merged into `main`.

- [ ] **Step 4: Run the post-merge smoke test from the PR description**

Execute every checkbox in the "Post-merge smoke test checklist" section of the PR (the same list from Step 1). Tick each item in the PR description as you confirm it. **Total time: ~10 minutes.**

If a form is broken, immediately open a revert PR — `git revert <task-N-commit-sha>` for the affected task's commit. Then re-do the affected task with corrections.

- [ ] **Step 5: Update the PR description with smoke-test results**

Manually tick the checkboxes in the PR description via the GitHub UI as you confirm each smoke-test item. Add a final comment to the PR summarizing: "Smoke test green — N forms render correctly, M contact links resolve."

PR 1 is complete. PR 2 and PR 3 can now start (in parallel, after a fresh worktree from main).

---

# PR 2 — Discussions infra + ops

**Prerequisite:** PR 1 is merged to `main`.

Open a fresh branch off `main` for this PR (e.g. `dev/<you>/sub-project-C-pr2-discussions`).

## Task 9: Add Q&A discussion template

**Files:**
- Create: `.github/DISCUSSION_TEMPLATE/q-a.yml`

The filename must be `q-a.yml` to match the existing Q&A category's slug. Verify the slug before writing:

```bash
gh api graphql -f query='{repository(owner:"nimbus-agent",name:"Nimbus"){discussionCategories(first:20){nodes{name slug}}}}' --jq '.data.repository.discussionCategories.nodes[] | select(.name=="Q&A") | .slug'
```

Expected output: `q-a`.

- [ ] **Step 1: Create the directory if it doesn't exist and write the file**

Run:

```bash
mkdir -p .github/DISCUSSION_TEMPLATE
```

Then create `.github/DISCUSSION_TEMPLATE/q-a.yml` with this content:

```yaml
title: "Q&A: "
labels: ["question", "needs-triage"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for asking — the more context you give, the faster a maintainer
        or community member can help. The FAQ pinned at the top of this
        category answers many common questions; check it first.

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

- [ ] **Step 2: Verify YAML parses**

Run:

```bash
bun -e "const yaml = require('js-yaml'); const fs = require('node:fs'); const doc = yaml.load(fs.readFileSync('.github/DISCUSSION_TEMPLATE/q-a.yml', 'utf8')); console.log('Top-level keys:', Object.keys(doc).sort().join(', ')); console.log('Body element count:', doc.body.length);"
```

Expected output:

```
Top-level keys: body, labels, title
Body element count: 4
```

- [ ] **Step 3: Stage and commit**

Run:

```bash
git add .github/DISCUSSION_TEMPLATE/q-a.yml
git commit -m "feat(github): add Q&A discussion template

Required prompts: what are you trying to do, what have you tried,
environment. Title prefix 'Q&A: '. Labels: question, needs-triage.

Filename q-a.yml matches the existing Q&A category slug (verified
via gh api graphql before write). If the slug ever changes, this
template silently stops auto-applying - guarded by the PR 2 ops
checklist's smoke test (open a draft discussion in Q&A, verify
template renders).

Note: GitHub's docs describe discussion templates as sharing the
body schema with Issue Forms, but validations.required enforcement
on discussions is not explicitly documented. If the smoke test
shows required fields submit blank without error, accept the
form-shape as prompt-only on discussions.

Part of Sub-project C PR 2."
```

---

## Task 10: Add Ideas discussion template

**Files:**
- Create: `.github/DISCUSSION_TEMPLATE/ideas.yml`

The filename must be `ideas.yml` to match the existing Ideas category's slug:

```bash
gh api graphql -f query='{repository(owner:"nimbus-agent",name:"Nimbus"){discussionCategories(first:20){nodes{name slug}}}}' --jq '.data.repository.discussionCategories.nodes[] | select(.name=="Ideas") | .slug'
```

Expected output: `ideas`.

- [ ] **Step 1: Write `.github/DISCUSSION_TEMPLATE/ideas.yml`**

Create the file with this exact content:

```yaml
title: "Idea: "
labels: ["enhancement", "needs-triage"]
body:
  - type: markdown
    attributes:
      value: |
        Ideas are how the roadmap gets shaped. Large features get discussed
        here before a PR. The local-first and structural-HITL constraints
        are non-negotiable — be explicit about how your idea respects them.

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
      description: |
        Local-first means no user data or credentials leave the machine without an explicit user action.
        Structural HITL means any destructive or outgoing action goes through the consent gate.
        How does your idea respect both?

  - type: dropdown
    id: willing_to_build
    attributes:
      label: Are you willing to build this?
      options:
        - "Yes — I want to build it and would like guidance"
        - "Maybe — depends on complexity"
        - "No — requesting for someone else to build"
```

- [ ] **Step 2: Verify YAML parses**

Run:

```bash
bun -e "const yaml = require('js-yaml'); const fs = require('node:fs'); const doc = yaml.load(fs.readFileSync('.github/DISCUSSION_TEMPLATE/ideas.yml', 'utf8')); console.log('Top-level keys:', Object.keys(doc).sort().join(', ')); console.log('Body element count:', doc.body.length);"
```

Expected output:

```
Top-level keys: body, labels, title
Body element count: 5
```

- [ ] **Step 3: Stage and commit**

Run:

```bash
git add .github/DISCUSSION_TEMPLATE/ideas.yml
git commit -m "feat(github): add Ideas discussion template

Required prompts: problem you're solving, proposed solution.
Optional: how the idea fits local-first/HITL, willing-to-build
dropdown. Title prefix 'Idea: '. Labels: enhancement, needs-triage.

Filename ideas.yml matches the existing Ideas category slug.

The local-first/HITL prompt sets the conversation tone upfront -
ideas that don't account for those constraints get redirected at
the conversation level rather than being silently merged.

Part of Sub-project C PR 2."
```

---

## Task 11: Open PR 2, execute ops checklist, post-merge smoke test

**No file changes** in this task. PR 2 has only two file commits (Tasks 9-10). The bulk of PR 2's work is the operational checklist run by a maintainer with repo admin access.

- [ ] **Step 1: Push the branch and open the PR**

Run:

```bash
git push -u origin HEAD
gh pr create --title "feat(community): Sub-project C PR 2 - Discussions infra + reshape ops" --body "$(cat <<'EOF'
## Summary

PR 2 of Sub-project C (community pack). Adds Discussion templates for Q&A and Ideas, and carries an operational checklist for restructuring Discussions categories and publishing 4 pinned seed threads.

- Adds `.github/DISCUSSION_TEMPLATE/q-a.yml`
- Adds `.github/DISCUSSION_TEMPLATE/ideas.yml`

## Related Issue

Closes # (no tracking issue; tracked in the design spec)

## Linked Discussion

(none — this is the spec-driven sub-project)

## Type of Change

- [x] New feature (Discussion templates + ops)
- [ ] Bug fix
- [ ] Breaking change
- [ ] Refactor
- [ ] Test improvement
- [ ] Documentation only
- [ ] CI / tooling

## Spec reference

Implements `docs/superpowers/specs/2026-05-12-sub-project-C-community-pack-design.md` §5.3.

## Operational checklist (perform after merge; requires repo admin access)

### 1. Restructure Discussions categories

Settings → Discussions → "Manage categories":

- [ ] Snapshot the current category state for record:
  ```bash
  gh api graphql -f query='{repository(owner:"nimbus-agent",name:"Nimbus"){discussionCategories(first:20){nodes{name slug description emoji isAnswerable}}}}' > /tmp/discussion-categories-before.json
  cat /tmp/discussion-categories-before.json
  ```
- [ ] Delete the `Polls` category. (Current discussion count: 0. Verify before deletion.)
- [ ] Rename `Show and tell` → `Show your workflow`. **In the rename dialog, edit the slug field to keep `show-and-tell`** so the one existing discussion thread and any future external links don't break.
- [ ] Verify `Q&A` is set to **Answerable** (default — should already be).
- [ ] Toggle `Ideas` to **Answerable** (lets maintainers mark ideas as built / declined / duplicate).
- [ ] Confirm the final category set: `Announcements`, `General`, `Q&A` (answerable), `Ideas` (answerable), `Show your workflow` (slug `show-and-tell`). 5 categories total.
- [ ] Snapshot the resulting category state:
  ```bash
  gh api graphql -f query='{repository(owner:"nimbus-agent",name:"Nimbus"){discussionCategories(first:20){nodes{name slug description emoji isAnswerable}}}}' > /tmp/discussion-categories-after.json
  diff /tmp/discussion-categories-before.json /tmp/discussion-categories-after.json
  ```
  Expected diff: only the Polls category removed, Show-and-tell renamed (slug preserved), Ideas isAnswerable flipped to true.

### 2. Publish & pin 4 seed threads

All four are authored by a maintainer.

- [ ] **Welcome to Nimbus Discussions** (category: Announcements). Pin at the top. Body content covers: what each of the 5 categories is for; links to `CONTRIBUTING.md`, `SUPPORT.md`, `CODE_OF_CONDUCT.md`. ~30 lines. Markdown only — no template applies to Announcements.
- [ ] **FAQ — common questions** (category: Q&A). Pin second. 8–10 Q&As covering:
  - Where does my data live? (local SQLite index)
  - How does HITL work? (consent gate in executor.ts; not bypassable)
  - Does Nimbus call external LLMs? (depends on config; local-first by default)
  - How do I add a connector? (`nimbus scaffold extension`)
  - What platforms are supported? (Windows 10+, macOS 13+, Ubuntu 22.04+)
  - What's the difference between Issues and Discussions? (links to SUPPORT.md)
  - How do I report a vulnerability? (links to SECURITY.md)
  - Where's the roadmap? (links to docs/roadmap.md)
  - How do I update? (`nimbus update`)
  - How do I run a remote query over LAN? (links to LAN remote-access docs)
- [ ] **Roadmap input — what should Phase 6+ look like?** (category: Ideas). Pin third. Links to `docs/roadmap.md`. Body solicits Phase 6+ direction; explicitly notes Phase 5 is in progress so ideas land in Phase 6.
- [ ] **Show your workflow — starter** (category: Show your workflow, slug `show-and-tell`). Pin fourth. Maintainer-authored example titled something like "How I use Nimbus for on-call handoffs" — describes a real workflow with HITL touchpoints. Invites others to share theirs.

### 3. Move the one existing discussion if needed

- [ ] Check whether the one pre-existing discussion (count was 1 at design time) is in a category that still exists. If it was in Polls, move it to General. If in Show-and-tell (now "Show your workflow"), no action needed — slug preserved.

### 4. Smoke-test discussion templates

- [ ] Open a draft discussion in **Q&A**. Verify the `q-a.yml` template auto-populates with the 4 prompts (markdown intro + 3 textareas).
- [ ] Open a draft discussion in **Ideas**. Verify the `ideas.yml` template auto-populates with the 5 prompts (markdown intro + 3 textareas + 1 dropdown).
- [ ] **Required-field check (Q1 from design review):** in the Q&A draft, leave all 3 textareas blank and click submit. Note the outcome:
  - If GitHub blocks submit with a "required field" error → `validations.required` enforces on discussions same as Issue Forms. Good.
  - If submit succeeds → `validations.required` is prompt-only on discussions. Accept this; do NOT change the template.
  Record the result in this PR as a comment.

## Verification

- [x] `bun run typecheck` — N/A
- [x] `bun run lint` — N/A
- [x] All existing tests pass — N/A
- [x] No `any`, no credentials, HITL not touched
- Smoke tests in operational checklist sections 1, 2, 4 above.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL printed.

- [ ] **Step 2: Wait for CI checks**

Run:

```bash
gh pr checks --watch
```

Expected: all green.

- [ ] **Step 3: Merge the PR**

Run:

```bash
gh pr merge --squash --auto
```

- [ ] **Step 4: Execute the operational checklist sections 1–4 from the PR description**

Tick each box in the PR description as you go. Total time: ~30–40 minutes (mostly writing the 4 pinned thread bodies).

Per section:

1. **Discussions categories restructure** (~5 min). Settings → Discussions → Manage categories. The snapshot-before / snapshot-after `gh api graphql` calls are the audit trail.
2. **4 pinned seed threads** (~25 min — most of the work is authoring the FAQ + workflow example).
3. **Move existing discussion** (~1 min).
4. **Smoke-test templates** (~5 min). Submit a draft in each category to verify auto-population. Record the required-field-enforcement result as a comment on the PR.

- [ ] **Step 5: Verify post-merge state via gh API**

Run:

```bash
gh api graphql -f query='{repository(owner:"nimbus-agent",name:"Nimbus"){discussionCategories(first:20){nodes{name slug isAnswerable}}}}' --jq '.data.repository.discussionCategories.nodes'
```

Expected: 5 categories returned. `Polls` is NOT in the list. `Ideas` has `isAnswerable: true`. `Show your workflow` has `slug: "show-and-tell"`. Q&A and Ideas slugs are unchanged.

Optionally also verify pinned threads are visible by opening `https://github.com/nimbus-agent/Nimbus/discussions` in a browser — the 4 pinned threads should appear at the top of the page.

PR 2 is complete.

---

# PR 3 — GFI on-ramp

**Prerequisite:** PR 1 is merged to `main` (so `docs/SUPPORT.md` links to GFI work). Independent of PR 2 — can ship in parallel.

Open a fresh branch off `main` (e.g. `dev/<you>/sub-project-C-pr3-gfi`).

## Task 12: Add GFI criteria section to docs/CONTRIBUTING.md

**Files:**
- Modify: `docs/CONTRIBUTING.md`

- [ ] **Step 1: Find the insertion point**

Run:

```bash
grep -n "Find Something to Work On\|Development Workflow" docs/CONTRIBUTING.md
```

Expected output: two line numbers. The GFI section is inserted between them — after the end of "Find Something to Work On" (and its `---` separator if present) and before `## Development Workflow`.

- [ ] **Step 2: Insert the new section**

Add this exact content immediately before the `## Development Workflow` heading:

```markdown
## What makes a good first issue?

The `good first issue` label is a contract, not a suggestion. An issue carrying this label must satisfy every bullet below. Issues that don't satisfy them shouldn't have the label.

| Criterion | Threshold |
|---|---|
| **Scope** | 1–3 files touched, ≤ 100 LOC change |
| **Time estimate** | 1–3 hours for a first-time contributor (assumes TypeScript familiarity; no Bun/SQLite/Tauri-specific knowledge required) |
| **Mentor pinged** | Issue body names one maintainer the contributor can `@mention` for guidance. The named maintainer commits to responding within 48 h (business days, excluding weekends and holidays) |
| **Definition of done** | Issue body has a concrete checklist of what "complete" means (file changed + behaviour verified + test added) |
| **Test surface** | Either an existing test file exists for the area, or the issue specifies the test file to add |
| **Security-invariant clear** | Issue does NOT touch `engine/executor.ts`, `vault/`, `ipc/lan-server.ts`, `ui/src-tauri/src/gateway_bridge.rs`, or any I1–I12 wiring site. Issues touching those are explicitly **not** GFI regardless of size |
| **Labels** | `good first issue` + `help wanted` (optional) + `pkg:<area>` |

If your mentor hasn't responded in 48 h (business days, excluding weekends and holidays), ping `@nimbus-agent/maintainers` on the issue.

**For maintainers:** before applying the `good first issue` label, run through the table above. If any row fails, fix the issue body or use a different label (`help wanted` is more permissive — no mentor commitment, larger scope OK).

---

```

The trailing `---` separator matches the style of the existing sections in `CONTRIBUTING.md`.

- [ ] **Step 3: Verify the insertion**

Run:

```bash
grep -A 2 "Find Something to Work On\|What makes a good first issue\|Development Workflow" docs/CONTRIBUTING.md | head -20
```

Expected: the three headings appear in this order — `Find Something to Work On`, `What makes a good first issue?`, `Development Workflow`. The order must be correct.

- [ ] **Step 4: Verify the docs site still builds**

Run:

```bash
bun --cwd packages/docs run build 2>&1 | tail -10
```

Expected: success message, no errors about `CONTRIBUTING.md`.

- [ ] **Step 5: Verify the markdown table renders**

Look at the diff:

```bash
git diff docs/CONTRIBUTING.md
```

Confirm:
- The heading `## What makes a good first issue?` is present.
- The 7-row markdown table is intact (all `|` columns balance — 3 columns per row).
- The trailing `---` is present.

- [ ] **Step 6: Stage and commit**

Run:

```bash
git add docs/CONTRIBUTING.md
git commit -m "docs(contributing): add good first issue criteria

New section between Find Something to Work On and Development
Workflow. Defines the seven criteria an issue must satisfy to
carry the 'good first issue' label: scope (1-3 files, <=100 LOC),
time estimate (1-3 h for a first-timer), named mentor with 48 h
business-day SLA, concrete Definition of Done, identified test
surface, no security-invariant touchpoints, correct labels.

The criteria is a contract for the label, not a suggestion - the
spec is explicit that issues lacking the criteria shouldn't carry
the label. The 48 h SLA is qualified 'business days, excluding
weekends and holidays' to prevent maintainer weekend guilt.

Part of Sub-project C PR 3."
```

---

## Task 13: Open PR 3, execute seed-batch ops checklist

**No file changes.** PR 3 has only one file commit (Task 12). The bulk of PR 3's work is the seed-batch operational checklist.

- [ ] **Step 1: Push the branch and open the PR**

Run:

```bash
git push -u origin HEAD
gh pr create --title "docs(contributing): Sub-project C PR 3 - GFI on-ramp" --body "$(cat <<'EOF'
## Summary

PR 3 of Sub-project C (community pack). Adds the "good first issue" criteria section to `docs/CONTRIBUTING.md` and carries an operational checklist to:
1. Re-audit the 4 existing GFI issues (#243, #244, #245, #246) against the new criteria.
2. Seed 8-12 new GFI issues across ≥3 distinct `pkg:*` labels.

## Related Issue

Closes # (no tracking issue; tracked in the design spec)

## Linked Discussion

(none — this is the spec-driven sub-project)

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Refactor
- [ ] Test improvement
- [x] Documentation only
- [ ] CI / tooling

## Spec reference

Implements `docs/superpowers/specs/2026-05-12-sub-project-C-community-pack-design.md` §5.4.

## Operational checklist (perform after merge)

### 1. Re-audit existing GFI issues

Confirm each of these still meets the new criteria. For each:
- Verify a maintainer is `@mentioned` (add one if missing).
- Verify a Definition-of-Done checklist is present (add one if missing).
- If the issue no longer qualifies, change the label from `good first issue` to `help wanted`.

- [ ] #243 — docs(site): add per-connector docs pages
- [ ] #244 — docs(site): add screenshots to user-guide pages
- [ ] #245 — docs: add a table-of-contents to docs/architecture.md
- [ ] #246 — docs(site): cross-check verify-your-download walkthrough

### 2. Seed batch tracking (fill in as issues are created)

Each maintainer creates the issues that name themselves as mentor (commitment is implicit in self-creation). The PR author audits the checklist below before requesting final review.

**Source pool: under-covered test surfaces** (3-4 issues — find modules at 80-84% line coverage; pick test gaps that a single targeted test would close)

- [ ] #___ (mentor: @___, pkg: ___)
- [ ] #___ (mentor: @___, pkg: ___)
- [ ] #___ (mentor: @___, pkg: ___)

**Source pool: CLI ergonomics polish** (2-3 issues — grep `packages/cli/src/commands/` for commands not respecting `NO_COLOR`; missing `--help` text gaps)

- [ ] #___ (mentor: @___, pkg: ___)
- [ ] #___ (mentor: @___, pkg: ___)

**Source pool: connector error-message clarity** (2-3 issues — grep `packages/mcp-connectors/<*>/src/` for unhelpful `throw new Error("...")` strings)

- [ ] #___ (mentor: @___, pkg: ___)
- [ ] #___ (mentor: @___, pkg: ___)

**Source pool: docs site connector pages** (2-3 issues — split existing #243 into per-connector issues for the 5-6 most-requested connectors)

- [ ] #___ (mentor: @___, pkg: ___)
- [ ] #___ (mentor: @___, pkg: ___)

**Mentor distribution check** (each maintainer named on 3-4 issues to avoid bottleneck):

- @___: ___ issues
- @___: ___ issues
- @___: ___ issues

### 3. Each seeded issue must use this body template

```markdown
## Problem

<!-- 1-2 sentence description of what's wrong / missing -->

## Definition of done

<!-- Concrete checklist of what 'complete' looks like -->

- [ ] File X modified to do Y
- [ ] Behaviour verified by running Z
- [ ] Test added at path/to/test.ts

## Suggested approach

<!-- 2-4 bullet points pointing at the relevant files / patterns -->

## Mentor

@<maintainer-handle> — pings will be answered within 48 h (business days). If silent for 48 h, ping `@nimbus-agent/maintainers`.

## Labels

`good first issue`, `help wanted` (optional), `pkg:<area>`
```

Title format: `gfi: <short imperative description>`. Example: `gfi: add NO_COLOR support to nimbus connector reindex output`.

## Verification

- [x] `bun run typecheck` — N/A
- [x] `bun run lint` — N/A
- [x] All tests pass — N/A
- [x] No `any`, no credentials, HITL not touched
- [x] `bun --cwd packages/docs run build` — verified locally in Task 12 Step 4
- [x] CONTRIBUTING.md change lychee-link-checks in CI

## Notes for reviewers

- The criteria section is the merge-gate deliverable; the seed-batch ops is a follow-up that completes after merge.
- The 48 h "business days" qualification on the mentor SLA was raised by the design review and accepted (see spec §11 reconciliation row 2).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL printed.

- [ ] **Step 2: Wait for CI**

Run:

```bash
gh pr checks --watch
```

Expected: all green (especially `docs-quality / docs-build` and `docs-quality / lychee link check`).

- [ ] **Step 3: Merge**

Run:

```bash
gh pr merge --squash --auto
```

- [ ] **Step 4: Execute the operational checklist 1–3 from the PR description**

This is the slowest part of Sub-project C — ~2–3 hours total, distributed across 3-4 maintainers:

1. **Re-audit 4 existing GFIs** (~15 min — one maintainer can do this).
2. **Seed batch creation** (~2 hours — distributed across maintainers). Each maintainer creates the issues that name them as mentor. Track in the PR description's checklist as you create each.
3. **Apply the body template to each seeded issue** (built into Step 2).

- [ ] **Step 5: Audit the seed-batch tracking checklist**

Once all 8-12 seed issues are created, audit the checklist in the PR description:

```bash
gh issue list --label "good first issue" --state open --limit 50 --json number,title,labels,assignees | bun -e "
const stdin = require('node:fs').readFileSync(0, 'utf-8');
const issues = JSON.parse(stdin);
console.log('Total open GFI issues:', issues.length);
const pkgs = new Set();
for (const i of issues) {
  for (const l of i.labels) {
    if (l.name.startsWith('pkg:')) pkgs.add(l.name);
  }
}
console.log('Distinct pkg:* labels covered:', [...pkgs].sort().join(', '));
console.log('Total distinct packages:', pkgs.size);
"
```

Expected output:

```
Total open GFI issues: 12–16
Distinct pkg:* labels covered: pkg:cli, pkg:gateway, pkg:mcp, ...
Total distinct packages: 3 or more
```

If the package count is below 3, the seed batch failed its diversity target — open additional issues from underrepresented packages.

- [ ] **Step 6: Update the PR description with the audit result**

Tick the boxes in section 2 of the PR description as you confirm each issue is created with the correct labels, mentor, and body template. Add a final comment to the PR linking to all 8-12 issues for the audit trail.

PR 3 is complete. Sub-project C is shipped.

---

## Post-completion checks (apply after all three PRs are merged)

- [ ] All 13 file changes are on `main`:

```bash
git fetch origin && git diff origin/main -- \
  .github/ISSUE_TEMPLATE/bug_report.yml \
  .github/ISSUE_TEMPLATE/feature_request.yml \
  .github/ISSUE_TEMPLATE/connector_request.yml \
  .github/ISSUE_TEMPLATE/documentation_issue.yml \
  .github/ISSUE_TEMPLATE/config.yml \
  .github/PULL_REQUEST_TEMPLATE.md \
  .github/DISCUSSION_TEMPLATE/q-a.yml \
  .github/DISCUSSION_TEMPLATE/ideas.yml \
  docs/SUPPORT.md \
  docs/CONTRIBUTING.md
```

Expected: empty diff (all files present and matching).

- [ ] The three deleted `.md` files are gone:

```bash
ls .github/ISSUE_TEMPLATE/bug_report.md \
   .github/ISSUE_TEMPLATE/feature_request.md \
   .github/ISSUE_TEMPLATE/connector_request.md 2>&1 | grep -i "no such file"
```

Expected: three "No such file" lines (one for each .md).

- [ ] Acceptance criteria from spec §6.1 all green:
  - Issue picker shows 4 forms + 4 contact links + no blank-issue option ✓
  - Discussions categories are 5 (Polls absent) ✓
  - GFI label returns 12–16 issues across ≥3 packages ✓
  - `bun --cwd packages/docs run build` exits 0 ✓
  - `lychee` link-check on `SUPPORT.md`, `CONTRIBUTING.md`, and `config.yml`'s `contact_links` URLs all return 200 ✓

- [ ] Update `CLAUDE.md` and `GEMINI.md`'s status line: change `Phase 5 (Extended Surface) 🔵 Active` to mention "Sub-project C ✅" alongside the existing T4 / Wave-A / B references, if those mirrors track sub-project state at this granularity. (Skip if neither file currently tracks per-sub-project status.)

- [ ] Track Discussions activity 30 days post-merge as the qualitative success signal (per spec §6.2 and §7). A sub-project that lands and leaves Discussions empty hasn't moved the needle; the 4 pinned seed threads from PR 2 are the seeding mechanism.

---

## Self-review notes

This plan was self-reviewed for spec coverage, placeholder content, and type consistency before being saved:

- **Spec coverage:** Every locked decision in §2 maps to a task. §5.2's six files → Tasks 1-7. §5.3's two discussion templates + ops → Tasks 9-11. §5.4's CONTRIBUTING.md section + ops → Tasks 12-13. §6.1's automated acceptance gates → embedded in each task's verification step or the post-completion check.
- **Placeholder scan:** No `TBD`, `TODO`, or "implement later" in the actionable steps. The only `___` placeholders are intentional — they appear inside the PR 3 description template's `seed batch tracking` checklist, where each maintainer fills in the issue number / mentor handle / pkg label as they create issues.
- **Consistency:** File paths match across tasks (e.g. `.github/ISSUE_TEMPLATE/config.yml` is spelled identically in Task 5 and the post-completion checks). Commit-message format is `<type>(<scope>): <summary>` matching the repo's Conventional Commits convention. PR 2 and PR 3 both correctly note their PR 1 dependency. The 48-h SLA is qualified as "business days, excluding weekends and holidays" everywhere it appears.
