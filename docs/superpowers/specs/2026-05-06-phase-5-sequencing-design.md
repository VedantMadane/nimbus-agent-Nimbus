# Phase 5 — Sequencing & Scope Design

> **Status:** Draft for review
> **Author:** asafgolombek
> **Date:** 2026-05-06
> **Type:** Plan-of-plans (T1) — locks the order in which Phase 5 sub-projects ship; each sub-project gets its own spec → plan → implementation cycle when it reaches the head of the queue.

## Purpose

`docs/roadmap.md` lists Phase 5 as a flat set of ~30 connectors plus team-intelligence commands, a CI/CD data layer, sandbox hardening, Marketplace v2, and B1 audit follow-ups. That list is the *maximum* scope, not a commitment, and it is too large for a single design or a single contributor to ship as one unit.

This document does three things:

1. **Cuts** items from Phase 5 and moves them to Phase 6.
2. **Orders** the remaining work as a strict linear queue, split into `Core` (committed) and `Extended` (priority queue, no per-item commitment).
3. **Defines** exit criteria, re-planning checkpoints, and a scope-guard rule to prevent drift.

Nothing in this document specifies *how* a sub-project is implemented. Implementation specs are written when each sub-project reaches the head of the queue.

## Settled inputs

Three decisions framed every choice below:

| Input | Decision | Reason |
|---|---|---|
| **Sandbox posture** | **C — split by data sensitivity.** Read-only connectors ship as first-party packages now, under the existing process+env restriction. Write-capable / HITL-heavy connectors wait for the new sandbox (T2) and ship as community extensions. | Avoids the future migration cost of "first-party-first / sandbox-parallel," and avoids the multi-month delay of "sandbox-first / community-first." |
| **Ordering rule (within a wave)** | **Hybrid — cheapest × graph-payoff.** Lead with the cheapest read-only ships, but inside that, prefer connectors that most enrich the relationship graph (so `expert` / `catchup` / `impact` get better fast). | Builds shipping cadence early, and biases connector spend toward the graph that powers Phase 5's user-visible features. |
| **Doc shape** | **A — strict linear queue.** Phase 5 is a single ordered list. Each sub-project completes before the next starts. | Phase 5 is solo. "Parallel streams" is fiction without a second contributor. Honesty about gaps beats fictional cadence. |

## Section 1 — Scope cuts (deferrals to Phase 6)

The following items are removed from Phase 5 and explicitly moved to Phase 6 in `docs/roadmap.md` as part of Phase 5's Definition of Done:

1. **Workday** — restricted API surface, low ROI for the engineering effort. Defer to Phase 6 alongside the broader HR push.
2. **Mendeley** — Elsevier sunset Mendeley Desktop sync; the official API is now read-only and limited. Drop entirely. Keep Zotero only.
3. **Apple Mail + macOS Calendar** — macOS-only. Breaks the platform-equality non-negotiable for any user-visible feature on Linux/Windows. Move to a Phase 6 "macOS native" track where it can sit alongside other macOS-only optimisations.
4. **Marketplace v2 monetization** (paid extensions, license-key enforcement, revenue sharing) — the most complex Marketplace v2 sub-feature, with the lowest ROI before there's an extension ecosystem to monetize. Ship Marketplace v2 *without* monetization in Phase 5; re-evaluate for Phase 6 once external publishers exist.
5. **Web clipper browser extension** — different distribution channel (Chrome Web Store + Firefox AMO + Safari), separate reviewer process, separate UX surface. Carve out as its own initiative outside the Phase 5 connector-mesh model.
6. **ML/AI write paths** (`ml.model.promote`, `ml.endpoint.update`, `ml.pipeline.cancel`) for MLflow / SageMaker / Vertex AI — keep read-only metadata indexing in Phase 5 (Wave D); defer write paths to Phase 6 alongside the rest of the post-sandbox write-capable suite.
7. **ArgoCD / Flux write paths** (sync, rollback, reconcile) — keep read-only health/history indexing in Phase 5; defer write paths to Phase 6.

Net effect: Phase 5 ships ~22 connectors + 3 team-intel commands + the CI/CD data layer + sandbox + Marketplace v2 (no monetization) + B1 hardening. Phase 6 inherits the seven deferred items above plus whatever Extended items don't ship.

## Section 2 — Linear queue ordering

Strict serial. Solo. Hybrid rule. Posture C.

Phase 5 splits into **Core** (committed; required for Phase 5 to be considered done) and **Extended** (queued in priority order; runs after Core; no per-item commitment).

### Phase 5 Core (committed; in this order)

| # | Sub-project | Why here |
|---|---|---|
| 1 | **T1 — Phase 5 sequencing doc** | This document. Locks the order before any code lands. |
| 2 | **T3 — Team Intelligence** (`nimbus expert`, `nimbus catchup`, `nimbus impact`) | Zero new connectors; rides on the Phase 3 relationship graph. Highest user-visible value per week of effort. Surfaces gaps that downstream connectors should fill. |
| 3 | **Wave A — API Surface + Obsidian** (OpenAPI / AsyncAPI spec indexer + Obsidian vault) | Cheapest read-only ships (no new credential surface — Obsidian rides on `[[filesystem.roots]]`; the OpenAPI indexer reuses the existing filesystem and GitHub / GitLab connectors); biggest graph payoff (`api_endpoint`, `obsidian_note` edges) which immediately makes T3's `expert` / `impact` answers richer. |
| 4 | **T4 — CI/CD Data Layer** (published OpenAPI 3.1 schema at `/v1/openapi.json`, `nimbus-dev/query-action`, post-deploy annotation action, pre-commit hook template, `nimbus metrics dora`) | Self-contained on the Phase 3.5 HTTP API; complementary to T3. Establishes Nimbus as a CI data source while connector breadth is still small. |
| 5 | **T6 — B1 hardening + semantic layer prep** (typed `dbRun` / `dbExec` migration across the 79 production sites, `tool_call_log` audit table, `vec_items_1536` multi-model embedding, finish centralising the timing-safe hex / string compare helpers — migrate `lan-pairing.ts`'s local `timingSafeEqual` into `util/` so invariant `I10` has a single wiring site) | Bridge work. Done **before** T2 because the typed-`dbRun` migration touches every package — better to land it before T2 expands the surface, not after. Also unblocks per-item-type embedding routing for T3's prose-heavy answers, and consolidates the constant-time helpers behind `I10` before any new defense lands on top. |
| 6 | **T2 — Sandbox hardening + Marketplace v2** (seccomp BPF / App Sandbox entitlements / AppContainer; `permissions.network` declaration; community ratings & reviews; verified-publisher GPG-signed manifests; auto-update with changelog preview; extension dependency resolution; **monetization deferred to Phase 6**) | The long platform block (~3 months elapsed). Single biggest investment in Phase 5; everything after it is cheaper because new connectors ship as community extensions under the new sandbox. |
| 7 | **Wave B — Meetings & Async Video** (Zoom, Google Meet, Loom — all read-only) | Promoted into Core specifically as the **first community-extension ship**, to dogfood Marketplace v2 before any external publisher does. Without this, Marketplace v2 ships untested in production. Also extends the existing Calendar coverage with high user value. |

**Phase 5 is "done" when Core is done.** Anything further is bonus.

### Phase 5 Extended (priority queue; runs after Core)

Each entry is its own spec → plan → implementation cycle, written when it reaches the head of the queue (not pre-specced now — premature design). The ordering reflects current priority; the queue is mutable at re-planning checkpoints (Section 3).

```
C. Reading                       (Pocket, Readwise, Raindrop, Zotero)
D. Read-only Data Warehouses     (Metabase, Superset, dbt schema, BigQuery
                                  schema, AWS Athena, MLflow metadata,
                                  Local data profiling, Great Expectations
                                  CI parsing)
E. Read-only Security & Vuln     (Snyk, SonarQube / SonarCloud, Semgrep,
                                  Wiz, SBOM / supply-chain tracking,
                                  `nimbus security scan` CLI command)
F. IMAP / JMAP                   (Generic IMAP + SMTP-send-via-HITL,
                                  Fastmail JMAP, ProtonMail via Bridge)
G. CRM                           (HubSpot, Salesforce, Pipedrive)
H. Finance                       (Expensify, Ramp, Mercury, Stripe)
I. HR                            (Greenhouse, Lever)
J. Design                        (Figma, Miro, Canva)
K. Flags + GitOps writes         (LaunchDarkly, Flagsmith, ArgoCD, Flux)
L. Orchestration + Obs writes    (Databricks, Airflow / Prefect / Dagster,
                                  SageMaker, Vertex AI, CloudWatch /
                                  GCP Logging, Kibana / Elasticsearch)
M. Support + Misc                (Zendesk, Intercom, Stack Overflow Teams,
                                  Vercel, Netlify, Local DB schema indexing)
```

### Two structural rules baked into the queue

1. **No write-capable connector ships before T2.** Posture C requires write-capable connectors to run under the new sandbox. Anything in Extended that produces a write or HITL surface (Waves G, H, I, J, K, L; the SMTP-send path of Wave F; any write surface in Wave M) is structurally blocked until Core item 6 (T2) is merged. Note: under doc shape A this rule is partially redundant — strict serial already prevents any Extended wave from starting before T2 — but the rule stays as defense-in-depth against any future re-shape (e.g. if a contributor joins and parallel streams open up at a checkpoint, the rule survives the doc-shape change). Read-only Extended waves do **not** ship in parallel with T2; the linear queue stays serial through Core.
2. **Every Extended wave's first connector validates that wave's hardest credential model.** Examples: HubSpot first in Wave G (OAuth-with-refresh is harder than Pipedrive API-key); Mercury first in Wave H (banking auth is the hardest of the four); LaunchDarkly first in Wave K (toggle-via-HITL is the canonical write path). Surfaces auth-design bugs at item 1 of a wave, not item 3.

## Section 3 — Exit criteria, checkpoints, scope guard

### Per-sub-project exit criteria

| Sub-project type | Done means |
|---|---|
| **Connector wave** | Every connector in the wave: package created under `packages/mcp-connectors/<name>/` (Core / first-party) or published as a community extension (post-T2); contract tests pass; ≥70% line coverage; registered in `packages/gateway/src/connectors/registry.ts`; new item type added to the schema reference in `docs/architecture.md`; row in `docs/roadmap.md` flipped to `[x]`. |
| **CLI command (T3, T4)** | Command works against a real Gateway with mocked connectors in an e2e scenario; `--json` and `NO_COLOR` honoured; latency budget verified per `nimbus-agent-patterns.md` (≤15 s for built-in agents); coverage gate for `packages/gateway/src/agents/` stays ≥80%. |
| **Platform / migration (T6)** | Production wiring + entry in `docs/SECURITY-INVARIANTS.md` (where applicable) + assertion in `packages/gateway/src/security-invariants.test.ts` — the invariant triple rule. Coverage gates for affected packages stay green. |
| **Sandbox (T2)** | Cross-platform sandbox contract test in `@nimbus-dev/sdk` passes on the win32 / darwin / linux CI matrix; an extension declaring no `permissions.network` provably cannot make a network call (verified by attempting one in the test). |
| **Marketplace v2 (T2)** | Wave B ships through it as a community extension; `connector.install` flow works end-to-end from a fresh dev install; auto-update path verified by upgrading a published extension between two versions in CI. |

### Re-planning checkpoints

The queue is reviewed at three fixed points. Outside these, the queue is **frozen**.

1. **End of T3.** Did the Team Intelligence commands actually surface enough graph gaps to justify Wave A's specific connectors? If not, swap Wave A's content (e.g., promote OpenAPI indexer down, promote a different read-only connector up).
2. **End of T6 (before T2 begins).** Last chance to scope-trim T2. Sandbox + Marketplace v2 is the largest single block in Phase 5; if Marketplace v2 sub-features (verified publishers, dep resolution) feel like they'd push T2 past four months, drop them to Phase 6 here, not mid-T2.
3. **End of Core (after Wave B ships).** Phase 5 is technically done at this point. Decide: continue into Extended Wave C, or close Phase 5 and start Phase 6 planning. The output of this checkpoint is either a re-confirmed Extended queue or a Phase 6 spec.

### Scope guard

> **Any new Phase 5 item proposed mid-flight is added to the bottom of the Extended queue, not inserted.** Insertion is allowed only at one of the three checkpoints above.

This is the single piece of process discipline that prevents Phase 5 from drifting into a "just one more thing" pattern. The mechanism is simple — when a new connector or feature idea lands (issue, user request, etc.), the default action is to append it to the bottom of the Extended queue and move on.

### Cross-cutting requirements (referenced, not re-specified)

Every Phase 5 sub-project inherits the existing Nimbus authoring contracts. The spec below points at them rather than restating; downstream sub-project specs should do the same.

- Connector work: `.claude/commands/nimbus-connector-authoring.md`
- Built-in agents (T3): `.claude/commands/nimbus-agent-patterns.md`
- DB migrations: `.claude/commands/nimbus-db-migrations.md`
- New security defenses: `.claude/commands/nimbus-security-invariants.md`
- IPC additions: `.claude/commands/nimbus-ipc.md`
- Test placement: `.claude/commands/nimbus-testing.md`
- Phase boundary check: `.claude/commands/nimbus-phase-4.md` — read before starting any Phase 5 work to confirm the change isn't actually a Phase 4 follow-up

### Definition of Done for Phase 5

Phase 5 is declared complete and the row in `docs/roadmap.md` flipped to ✅ when **all of**:

1. Core sub-projects 1–7 (T1, T3, Wave A, T4, T6, T2, Wave B) are merged to `main`.
2. The seven deferred items in Section 1 are explicitly moved to Phase 6 in `docs/roadmap.md` — not just left in Phase 5 as `[ ]`.
3. The Phase 5 acceptance-criteria block in `docs/roadmap.md` has been pruned to match what was actually shipped (acceptance criteria for Extended items either ship with their wave or get moved to Phase 6).
4. A Phase 5 retro section is appended to `docs/roadmap.md`, mirroring how Phase 3 / Phase 4 were closed out.

## Out of scope for this document

- Implementation detail for any sub-project (those are separate specs).
- Calendar dates / quarter targets (the implementation plan, produced by the writing-plans skill, anchors calendar).
- Decisions about Phase 6 contents beyond the seven deferred items.
- Resourcing changes (this doc assumes solo; if that changes mid-Phase-5, a re-planning checkpoint is the place to revisit doc shape A → B / C).
