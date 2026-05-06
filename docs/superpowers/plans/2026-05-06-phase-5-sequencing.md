# T1 — Phase 5 Sequencing Spec — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the Phase 5 sequencing spec (`docs/superpowers/specs/2026-05-06-phase-5-sequencing-design.md`) on `main` and update the project status documents (`docs/roadmap.md`, `CLAUDE.md`, `GEMINI.md`) so future contributors see that Phase 5 has begun and the order is locked.

**Architecture:** Pure documentation. The spec file already exists at `887bfd3` on `dev/asafgolombek/phase-5-sequencing-spec`. This plan covers (1) header/status edits to point at the spec, (2) commit, push, PR, merge.

**Tech stack:** Markdown, git, GitHub CLI (`gh`).

**Out of scope (intentionally):** Moving the seven deferred items (Workday, Mendeley, Apple Mail / macOS Calendar, Marketplace v2 monetization, Web clipper, ML/AI write paths, ArgoCD/Flux write paths) out of the Phase 5 list and into Phase 6. The spec's Definition of Done schedules that bookkeeping at Phase 5 close, not at T1 close — committing to deferrals before Core ships forecloses on bringing them back if scope shifts. Resist the urge to do it now.

**Files this plan touches:**

- Modify: `docs/roadmap.md` (header line, Phase 5 section pointer)
- Modify: `CLAUDE.md` (Status line at line 10)
- Modify: `GEMINI.md` (Status line at line 8)
- Already created on branch (do not re-touch): `docs/superpowers/specs/2026-05-06-phase-5-sequencing-design.md`

---

## Task 1 — Update `docs/roadmap.md` header

**Files:**
- Modify: `docs/roadmap.md:7-8`

The current header says Phase 4 is complete and Phase 5 is "next." Update it to say T1 is landed and the queue is locked.

- [ ] **Step 1: Read the current header.**

Run:
```
git --no-pager show HEAD:docs/roadmap.md | sed -n '1,12p'
```

Expected: lines 7-8 begin with `> **Last updated:** 2026-05-03 — Phase 4 complete on \`main\`; **Phase 5 (The Extended Surface)** is next.`

- [ ] **Step 2: Replace the "Last updated" header.**

Edit `docs/roadmap.md:7-8`. Replace:

```
> **Last updated:** 2026-05-03 — Phase 4 complete on `main`; **Phase 5 (The Extended Surface)** is next. Phase 4 delivered the Tauri UI, VS Code extension (`packages/vscode-extension`), voice interface, and local LLM backbone. Pass 2 adds MLflow / SageMaker / Vertex AI / Great Expectations / local data profiling to Phase 5, Monte Carlo / Bigeye to Phase 6, Data FinOps attribution and Data Incident Brief to Phase 7.
```

with:

```
> **Last updated:** 2026-05-06 — Phase 4 complete on `main`; **Phase 5 (The Extended Surface)** has begun. The Phase 5 order, scope cuts, and re-planning checkpoints are locked in [`docs/superpowers/specs/2026-05-06-phase-5-sequencing-design.md`](./superpowers/specs/2026-05-06-phase-5-sequencing-design.md) (Core: T1 → T3 → Wave A → T4 → T6 → T2 → Wave B). Phase 4 delivered the Tauri UI, VS Code extension (`packages/vscode-extension`), voice interface, and local LLM backbone. Pass 2 adds MLflow / SageMaker / Vertex AI / Great Expectations / local data profiling to Phase 5, Monte Carlo / Bigeye to Phase 6, Data FinOps attribution and Data Incident Brief to Phase 7.
```

(Leave the WS1–WS6 / WS5-C breakdown on line 8 unchanged.)

- [ ] **Step 3: Verify the edit applied.**

Run:
```
grep -n "phase-5-sequencing-design" docs/roadmap.md
```

Expected: one match on line 7.

---

## Task 2 — Update `CLAUDE.md` and `GEMINI.md` Status lines (mirrored)

**Files:**
- Modify: `CLAUDE.md:10`
- Modify: `GEMINI.md:8`

Both files carry an identical `**Status:**` line. CLAUDE.md line 12 explicitly requires updating both atomically: *"GEMINI.md mirrors this file for the same repository — update both when changing commands, roadmap rows, or non-negotiables."*

- [ ] **Step 1: Confirm both files have identical Status lines.**

Run:
```
grep -n "^\*\*Status:" CLAUDE.md GEMINI.md
```

Expected: two lines, identical content from `Status:` onward, differing only in line number.

- [ ] **Step 2: Edit `CLAUDE.md:10`.**

Replace:

```
**Status:** Phase 3.5 ✅ Complete; **Phase 4** — Presence ✅ Complete (WS1–4 ✅ · WS5-A ✅ · WS5-B ✅ · WS5-C ✅ · WS5-D ✅ · WS6 ✅ · S2 graph-aware watchers ✅ · B3 Phase 1 ✅ · B3 Phase 2 ✅)
```

with:

```
**Status:** Phase 3.5 ✅ Complete; **Phase 4** — Presence ✅ Complete (WS1–4 ✅ · WS5-A ✅ · WS5-B ✅ · WS5-C ✅ · WS5-D ✅ · WS6 ✅ · S2 graph-aware watchers ✅ · B3 Phase 1 ✅ · B3 Phase 2 ✅); **Phase 5** — Extended Surface 🔵 Active (T1 sequencing spec ✅ · T3 Team Intelligence next)
```

- [ ] **Step 3: Edit `GEMINI.md:8` to match exactly.**

Apply the same `old → new` substitution to `GEMINI.md:8`. After both edits, the two files' Status lines must be byte-identical.

- [ ] **Step 4: Verify mirror equality.**

Run:
```
diff <(grep "^\*\*Status:" CLAUDE.md) <(grep "^\*\*Status:" GEMINI.md)
```

Expected: no output (files match).

---

## Task 3 — Commit the doc updates

**Files:** none added; modifying `docs/roadmap.md`, `CLAUDE.md`, `GEMINI.md` from prior tasks.

- [ ] **Step 1: Confirm staged diff is what you expect.**

Run:
```
git status
git diff
```

Expected:
- `docs/roadmap.md` — single header line changed.
- `CLAUDE.md` — single Status line extended with the `**Phase 5** — Extended Surface 🔵 Active …` segment.
- `GEMINI.md` — same Status-line extension as CLAUDE.md.
- No other files modified.

- [ ] **Step 2: Stage explicitly (not `git add -A`).**

Run:
```
git add docs/roadmap.md CLAUDE.md GEMINI.md
git status
```

Expected: three files staged; nothing else.

- [ ] **Step 3: Create the commit.**

Run:
```
git commit -m "$(cat <<'EOF'
docs(phase-5): mark T1 landed; update status mirrors

* docs/roadmap.md header points at the T1 sequencing spec.
* CLAUDE.md + GEMINI.md status lines extended with Phase 5 row
  (kept byte-identical per the GEMINI.md mirror rule).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit succeeds; `git log --oneline -2` shows two commits on the branch (`887bfd3` spec + the new status-update commit).

---

## Task 4 — Push branch, open PR, await CI + merge

**Files:** none. Operations on remote.

- [ ] **Step 0: Verify `gh` CLI is installed and authenticated.**

Run:
```
gh auth status
```

Expected: shows "Logged in to github.com account ..." with a non-expired token. If not, run `gh auth login` before proceeding.

- [ ] **Step 1: Push the branch with upstream tracking.**

Run:
```
git push -u origin dev/asafgolombek/phase-5-sequencing-spec
```

Expected: push succeeds; remote tracking branch created.

- [ ] **Step 2: Confirm the branch diverged from `main` only with the two T1 commits.**

Run:
```
git log --oneline main..HEAD
```

Expected: exactly two commits — the spec commit (`887bfd3`) and the status-mirror commit from Task 3.

- [ ] **Step 3: Open the PR.**

Run:
```
gh pr create --title "docs(phase-5): T1 sequencing spec — lock Phase 5 order" --body "$(cat <<'EOF'
## Summary

* Adds `docs/superpowers/specs/2026-05-06-phase-5-sequencing-design.md` — the Phase 5 sequencing spec (T1).
* Locks Phase 5 Core order: T1 → T3 → Wave A → T4 → T6 → T2 → Wave B. Extended is a priority queue running after Core.
* Posture **C** — read-only first-party connectors before T2 (sandbox + Marketplace v2); write-capable connectors as community extensions after.
* Hybrid ordering rule (cheapest × graph-payoff) within each wave.
* Strict linear queue (solo); three re-planning checkpoints; scope-guard rule routes new ideas to the bottom of Extended.
* Defers seven items to Phase 6 — execution of those deferrals happens at Phase 5 close, not in this PR.
* Updates `CLAUDE.md` and `GEMINI.md` status mirrors.

## Test plan

- [ ] CI passes (the only gates relevant to docs-only PRs are markdown link / structure checks; no behavioural tests).
- [ ] `git diff main..HEAD` shows only the spec file + three header/status updates.
- [ ] `diff <(grep "^\*\*Status:" CLAUDE.md) <(grep "^\*\*Status:" GEMINI.md)` returns no output (mirror invariant).
- [ ] `docs/roadmap.md` header links resolve when previewed on GitHub.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL returned. Capture it for follow-up.

- [ ] **Step 4: Wait for CI to pass, address any review feedback, then merge.**

This step is interactive — wait for status checks. Run:

```
gh pr checks --watch
```

Expected: all required checks turn green. If any fail, investigate; do not merge with red checks.

- [ ] **Step 5: Merge the PR.**

Once CI is green and any review comments are resolved, run:

```
gh pr merge --squash --delete-branch
```

Expected: PR merged into `main`; remote branch deleted; local branch should be deleted in Task 5.

---

## Task 5 — Post-merge verification

**Files:** none. Repo-level checks.

- [ ] **Step 1: Sync local `main` and confirm the spec is on it.**

Run:
```
git checkout main
git pull --ff-only
ls docs/superpowers/specs/2026-05-06-phase-5-sequencing-design.md
```

Expected: file present; pull succeeds with no merge.

- [ ] **Step 2: Confirm status mirrors stayed identical post-merge.**

Run:
```
diff <(grep "^\*\*Status:" CLAUDE.md) <(grep "^\*\*Status:" GEMINI.md)
```

Expected: no output.

- [ ] **Step 3: Delete the local feature branch.**

Run:
```
git branch -d dev/asafgolombek/phase-5-sequencing-spec
```

Expected: branch deleted (uses `-d`, not `-D` — only deletes if fully merged).

- [ ] **Step 4: Prune stale remote-tracking refs.**

`gh pr merge --delete-branch` removed the remote branch in Task 4, but the local remote-tracking ref (`origin/dev/asafgolombek/phase-5-sequencing-spec`) lingers until pruned.

Run:
```
git fetch --prune
```

Expected: output includes `- [deleted] origin/dev/asafgolombek/phase-5-sequencing-spec` (or no output if the ref was already pruned).

- [ ] **Step 5: T1 is done. Next sub-project is T3 (Team Intelligence).**

T3's brainstorming session begins fresh in a new conversation. T3 produces its own spec under `docs/superpowers/specs/` and its own plan under `docs/superpowers/plans/`. Do not begin T3 design inside this conversation — it would conflate two sub-project contexts and breach the linear-queue discipline established in T1.
