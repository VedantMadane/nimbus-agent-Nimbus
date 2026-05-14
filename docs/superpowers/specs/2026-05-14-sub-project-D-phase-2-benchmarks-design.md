# Sub-project D — Phase 2: Benchmark Publishing & Docs Integration Design

**Status:** Approved (brainstorming complete, plan-writing next)
**Context:** Sub-project D Phase 2, follow-up to [`2026-05-13-sub-project-D-cicd-visibility-design.md`](./2026-05-13-sub-project-D-cicd-visibility-design.md)
**Date:** 2026-05-14

## 1. Why this exists

The parent Sub-project D spec §3.2 lists "implement benchmark scripts" and "update Starlight docs to render from `benchmarks.json`" as Phase 2 deliverables. A code audit during brainstorming found that the benchmark **harness, CI workflows, self-hosted runner, and PR-comment delta posting are already built** by the Phase 4 B2 perf audit (PR-C series). The parent spec was written without that context.

What is **not yet built**:

- A projection from `docs/perf/history.jsonl`'s tail into a `latest.json` snapshot the docs site can render.
- A publishing path for `latest.json` to the live docs at `https://nimbus-agent.dev/`.
- A Starlight benchmarks page.

Phase 2 of Sub-project D is the **publishing + rendering layer** on top of the existing pipeline. It does not modify the harness or its CI.

## 2. Locked decisions

These are the decisions that came out of brainstorming. They override any conflicting wording in the parent Sub-project D spec.

1. **Bake `latest.json` into the Starlight build, not a `gh-pages` branch.** The docs site at `nimbus-agent.dev` already deploys via GitHub Pages' Actions deploy model (`actions/deploy-pages` + OIDC). There is no `gh-pages` branch on this repo, and the parent spec's "publish to gh-pages" wording is incompatible with that model. Instead, `latest.json` is committed to `packages/docs/public/perf/latest.json` and ships with every docs deploy.
2. **Publish on every operator-triggered reference run, not nightly.** The existing `_perf-reference.yml` workflow already opens a PR adding a line to `docs/perf/history.jsonl` on operator dispatch. Phase 2 extends that PR to also commit a freshly-derived `latest.json`. Cadence is "whenever an operator runs the reference benchmark and merges the resulting PR" — typically far less than nightly. GHA matrix runs (`_perf.yml`) intentionally do **not** write to `latest.json` because their numbers are too noisy to publish as ground truth.
3. **Identity projection: `latest.json` is the most recent reference-machine `HistoryLine`, verbatim.** No flattening, no curation. The renderer handles per-surface metric heterogeneity. Tightest possible coupling to `HistoryLine.schema_version` — bumping the schema requires updating the renderer in the same commit.
4. **Comprehensive table on a dedicated page; no homepage numbers.** New page at `/perf/`, sidebar entry under `Reference`. One table row per surface (S1, S2-a, …, S11-b, plus 12 S8-l/b cells). No headline metrics on the homepage.
5. **Hard-fail the docs build on missing/empty/version-skewed `latest.json`.** If the file is absent, has `schema_version != 1`, or has `runner != "reference-m1air"`, `astro build` throws and `docs-publish.yml` fails. The renderer must never ship empty or garbage data.
6. **No offline fixture (`NIMBUS_DOCS_OFFLINE=1`, `latest.fixture.json`).** That concept assumed a build-time HTTP fetch from `gh-pages`. With the file committed to the repo, it's always available locally for `astro dev` and `astro build`.

## 3. Architecture

### 3.1 Data flow

```
Operator triggers _perf-reference.yml on M1 Air
      │
      ▼
bench-runner appends one HistoryLine to docs/perf/history.jsonl
      │
      ▼
NEW: derive-latest-json.ts reads tail, finds most recent
     complete reference-m1air line, writes it verbatim to
     packages/docs/public/perf/latest.json
      │
      ▼
Workflow commits BOTH files (relaxed sanity check), opens perf-labelled PR
      │
      ▼
PR merged → docs-publish.yml fires (paths: packages/docs/**)
      │
      ▼
Astro build:
  - imports packages/docs/public/perf/latest.json
  - asserts schema_version === 1 and runner === "reference-m1air"
    (HARD FAIL otherwise — build aborts, deploy does not happen)
  - renders BenchmarksTable on /perf/ page
      │
      ▼
Live at https://nimbus-agent.dev/perf/
```

### 3.2 Implementation ordering

Hard-fail (decision §6) plus identity projection (decision §3) means the renderer cannot land before `latest.json` exists with real data. The plan **must** sequence work as:

1. **Step 0 (operator, prerequisite).** Trigger `_perf-reference.yml` per [`docs/perf/reference-runner-setup.md`](../../../docs/perf/reference-runner-setup.md). Merge the resulting bot PR. After this step, `docs/perf/history.jsonl` contains at least one valid reference-m1air line. **No code from Phase 2 is written or merged before this step.**
2. **Step 1 (Phase 2 PR, Commit A).** `derive-latest-json.ts` + tests + the first `latest.json` produced locally by running the script against the post-Step-0 `history.jsonl`. `latest.json` is committed to the repo as real data.
3. **Step 2 (Phase 2 PR, Commit B).** Astro renderer (`BenchmarksTable.astro`, `perf.mdx`, sidebar entry). Local `bun --cwd packages/docs run build` succeeds because Commit A put real data at the expected path.
4. **Step 3 (Phase 2 PR, Commit C).** Workflow change to `_perf-reference.yml` + the operator-facing note in `reference-runner-setup.md`.

Pre-merge verification splits into two parts:

- **Renderer build (Commit A + Commit B):** verifiable at PR time. `bun --cwd packages/docs run build` runs the same Astro build that ships to production, including the schema assertions and the `latest.json` import. This catches schema-version mismatches, missing-file failures, and shape errors in `BenchmarksTable.astro` before merge. The plan adds this build to the PR CI lane (or extends an existing docs-quality lane to cover it) so reviewers see the result on every push.
- **Workflow change (Commit C):** cannot be verified pre-merge. GitHub Actions `workflow_dispatch` reads workflow files from the default branch, so the modified `_perf-reference.yml` can only be exercised after the PR merges. Verification path: merge → dispatch a fresh reference run → observe both files committed in the resulting bot PR → observe the site rebuild after merging that bot PR.

## 4. File inventory

| File | Status | Responsibility |
|---|---|---|
| `packages/gateway/src/perf/derive-latest-json.ts` | Create | Pure projection function + CLI. Reads `docs/perf/history.jsonl`, walks backwards to the most recent complete reference-m1air line (`runner === "reference-m1air"`, `schema_version === 1`, `incomplete !== true`), writes it verbatim to `--output`. Exits non-zero with a clear message if no qualifying line exists. Each parsed line is treated as `unknown` and validated against the `HistoryLine` schema before use, per Nimbus Non-Negotiable #7 — no `as HistoryLine` casts. |
| `packages/gateway/src/perf/derive-latest-json.test.ts` | Create | Unit tests, test-first. Covers: identity projection on a single line; skips placeholder lines without `runner` field; skips GHA lines; walks past `incomplete: true` to the next complete line; errors on empty file; errors when no reference-m1air line exists; overwrites target file atomically (write to `<target>.tmp`, then rename). |
| `.github/workflows/_perf-reference.yml` | Modify | Two changes: (a) new step between "Run reference benchmark" and "Sanity-check history.jsonl diff" that runs the projection script. (b) Sanity check relaxed per §5 below. |
| `packages/docs/public/perf/latest.json` | Create (Commit A) | Real reference-machine data, derived locally during Commit A from the post-Step-0 `history.jsonl`. Subsequent reference runs overwrite this file via the workflow. |
| `packages/docs/src/content/docs/perf.mdx` | Create | New `/perf/` page. Frontmatter `title: "Performance benchmarks"`. Body: short intro paragraph, the `<BenchmarksTable />` component, a "How these are measured" link to the reference-runner setup doc. |
| `packages/docs/src/components/BenchmarksTable.astro` | Create | Astro component. Imports `latest.json` at build time, treats the imported value as `unknown` and validates against the `HistoryLine` schema (per Non-Negotiable #7) before asserting schema invariants (hard-fail). Renders one `<table>` with one row per surface. Per-row metric formatting: latency surfaces show `p50/p95/p99` ms; throughput surfaces show `items/sec`; rss surfaces show `MB p95`; LLM surface shows `tokens/sec` and `first-token ms`; S10 also shows `busy_retries`. Unknown surface IDs render in an "Other surfaces" group with raw JSON for inspection. |
| `packages/docs/astro.config.mjs` | Modify | Add `{ label: "Performance benchmarks", link: "/perf/" }` to the `Reference` sidebar group, after `{ label: "Telemetry", link: "/telemetry/" }`. |
| `docs/perf/reference-runner-setup.md` | Modify | Append one paragraph noting that after merging a reference-run PR, `https://nimbus-agent.dev/perf/` rebuilds within ~5 minutes and shows the new numbers. |

**No changes:**

- `packages/gateway/src/perf/types.ts`, `history-line.ts` — schema is what we project.
- `_perf.yml` (GHA matrix workflow) — those runs intentionally do not write to `latest.json`.
- `docs-publish.yml`, `deploy-docs.yml` — already trigger on `packages/docs/**`, which `latest.json` lives under.

## 5. The `_perf-reference.yml` change

The existing workflow (lines 80–112 of `_perf-reference.yml`) enforces a strict "exactly one file changed" invariant on the post-bench diff. Phase 2 needs to relax this to two files without weakening the safety properties.

### 5.1 New step

Inserted between "Run reference benchmark" and "Sanity-check history.jsonl diff":

```yaml
- name: Derive latest.json projection
  shell: bash
  run: |
    set -euo pipefail
    bun packages/gateway/src/perf/derive-latest-json.ts \
      --history "${{ github.workspace }}/docs/perf/history.jsonl" \
      --output  "${{ github.workspace }}/packages/docs/public/perf/latest.json"
```

### 5.2 Relaxed sanity check

The existing step asserts:

1. Exactly one file modified (`docs/perf/history.jsonl`).
2. Exactly one line added.
3. Last line is a valid JSON record with the expected runner + SHA + populated `os_version`.

Phase 2 changes the assertions to:

1. Exactly **two** files modified, and they are **exactly** `docs/perf/history.jsonl` and `packages/docs/public/perf/latest.json`. Any other diff fails.
2. `history.jsonl`: still exactly one line added (unchanged).
3. `latest.json` is **semantically equal to the line `derive-latest-json.ts` would select on a fresh run** — i.e., the most recent complete reference-m1air line in `history.jsonl`. Verified by re-running the projection script into a temp file (`latest.json.expected`), normalizing both through `jq -S .`, and comparing the resulting strings. Semantic (not byte-literal) equality avoids spurious failures from `JSON.stringify` key-ordering differences.

This phrasing handles both flavors of new tail uniformly:

- **Complete tail** (the common case): the projection picks the new tail, `latest.json` is updated, and the equality check passes against the new tail.
- **Incomplete tail** (`incomplete: true`): the projection walks past the new line to the previous complete reference line. `derive-latest-json.ts` writes the same content already in `latest.json`, so the file shows no diff (the file is rewritten but git sees no change). The equality check still passes — `latest.json` matches the line the projection would select.

Sanity check #1 is therefore rephrased in step terms: the diff must contain `docs/perf/history.jsonl` plus **either** `packages/docs/public/perf/latest.json` (new-tail-complete case, exactly two files) **or** nothing else (new-tail-incomplete case, exactly one file). Any other diff fails. This preserves the existing behavior of letting incomplete runs land in `history.jsonl` for audit purposes while keeping `latest.json` pinned to the most recent complete data.

## 6. Edge cases

| Case | Behavior |
|---|---|
| `history.jsonl` is the placeholder line only (no `runner` field, just `_comment`) | `derive-latest-json.ts` exits non-zero with `"no reference-m1air line found in <path>"`. Workflow fails before commit. Operator must run the prerequisite reference benchmark. |
| `history.jsonl` contains only GHA lines | Same as above. The projection filter is `runner === "reference-m1air"`; GHA lines are skipped. |
| Most recent reference line has `incomplete: true` | Skipped. A line is considered **complete** when `incomplete` is absent or explicitly `false`; only `incomplete === true` triggers the skip. The script walks backwards until it finds the most recent complete reference line. If none exists, error as above. Matches the spec § 4.2 protocol — incomplete runs are not authoritative. |
| `latest.json.schema_version` becomes `2` in the future (HistoryLine bumps) | `BenchmarksTable.astro`'s assertion `schema_version === 1` throws; `astro build` fails; `docs-publish.yml` fails. The renderer must be updated in the same commit that bumps `HistoryLine.schema_version`. |
| Operator commits unrelated changes alongside the bot-generated diff | Workflow's relaxed sanity check fails (asserts exactly the two expected files). Operator must rebase out the unrelated edits. |
| Operator manually pre-generates a stale `latest.json` (e.g., committed locally before triggering the bench) | Workflow sanity check fails: the post-bench re-projection (§5.2 #3) selects a different line than the stale committed `latest.json`, the `jq -S .` comparison mismatches, and the workflow refuses to push. Forces `latest.json` to always reflect the current `history.jsonl` state. |
| Renderer encounters a surface family the table doesn't know about (future S12) | Component handles known surface IDs (S1, S2-*, …, S11-b); unknown IDs render in an "Other surfaces" group with raw JSON for inspection. Soft-degrade because adding surfaces is a routine harness change. |

## 7. Out of scope

| Item | Why excluded |
|---|---|
| Cast tripwire (`docs-quality / cast-tripwire`) | Sub-project D **Phase 3**, separate plan. Depends on `consent.respond` IPC plumbing orthogonal to benchmarks. |
| Curated headline numbers on the homepage | Rejected during brainstorming — comprehensive table only, no homepage change. |
| Offline build fixture (`NIMBUS_DOCS_OFFLINE=1`, `latest.fixture.json`) | Moot — `latest.json` is in the repo, always available locally. |
| Trend charts / "compare to last reference run" UX | YAGNI. Single snapshot table is what was asked for. Re-evaluate if the audience asks for trend rendering. |
| Historical browse (paginated `history.jsonl` viewer) | YAGNI. Raw `history.jsonl` is in the repo for anyone who wants it. |
| Auto-deduplication of `docs-publish.yml` ↔ `deploy-docs.yml` | Pre-existing duplication unrelated to Phase 2. Flagged in the plan as a side note, not fixed. |
| Schema-version structure-audit guard | Single assertion site; the build failure is loud enough. Re-evaluate if there are ever ≥3 schema-coupled call sites. |
| Triggering the first reference run via automation | Intentional. The reference run requires an operator at the M1 Air following the §4.2 protocol. The plan lists it as Step 0; the operator action itself is out of code scope. |

## 8. Non-blocking items to flag in the plan

1. **`history.jsonl` placeholder line.** The current first line is a comment placeholder (`{"schema_version":1,"_comment":"..."}`). The projection script must skip lines without a `runner` field. Tests must cover this case explicitly.
2. **PR-C-2b coupling.** [`docs/perf/reference-runner-setup.md:72`](../../../docs/perf/reference-runner-setup.md) refers to "PR-C-2b" populating `SLO_THRESHOLDS` from the new line. That is unrelated to Phase 2's renderer work but is a separate obligation worth confirming is tracked elsewhere.
3. **`docs-publish.yml` ↔ `deploy-docs.yml` duplication.** Two near-identical workflows trigger on the same `packages/docs/**` paths. Pre-existing; harmless but wasteful. Worth a separate housekeeping issue.

## 9. References

- Parent spec: [`docs/superpowers/specs/2026-05-13-sub-project-D-cicd-visibility-design.md`](./2026-05-13-sub-project-D-cicd-visibility-design.md) §3.2, §5.2, §6 (open questions).
- Phase 4 B2 perf audit (existing harness + workflows): [`packages/gateway/src/perf/`](../../../packages/gateway/src/perf/), [`.github/workflows/_perf.yml`](../../../.github/workflows/_perf.yml), [`.github/workflows/_perf-reference.yml`](../../../.github/workflows/_perf-reference.yml).
- Reference runner setup: [`docs/perf/reference-runner-setup.md`](../../../docs/perf/reference-runner-setup.md).
- Schema source of truth: [`packages/gateway/src/perf/history-line.ts`](../../../packages/gateway/src/perf/history-line.ts).
