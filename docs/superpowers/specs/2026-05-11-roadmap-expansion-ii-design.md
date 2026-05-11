# Roadmap Expansion II — Creation Agents, Explainability, Reliability & AI Governance (Design)

> **Status:** Draft for review
> **Author:** Asaf Golombek (with Claude assistance)
> **Date:** 2026-05-11
> **Type:** Roadmap expansion. Four proposal-depth additions across Phase 5, Phase 10, and Phase 12. No phase-number shifts.
> **Companion to:** [`2026-05-11-roadmap-expansion-design.md`](./2026-05-11-roadmap-expansion-design.md)

## Context

The first roadmap-expansion spec (earlier today) covered four clusters chosen on the "compounds with existing Nimbus primitives" criterion. This continuation spec covers four *gaps* in the existing Phase 1–14 roadmap — concerns that are genuinely missing or under-represented, not just more features inside an already-defined phase.

After scoping discussion, the four additions land **without shifting any phase numbers** — Reliability and AI Governance both land as named sub-waves of the existing Phase 12 (Enterprise), Creation Agents lands as a new T-series wave parked at the Phase 5 T6 checkpoint, and Explainability lands as a sub-wave of the existing Phase 10 (Autonomous Agent). No downstream cross-references break.

The four additions are proposal-depth, matching the Cluster B / C delta notes in the first roadmap-expansion spec. Each gets a full design when its phase activates.

## Addition 1 — Phase 12 Wave R: Reliability at Scale

### Motivation

The Phase 1–14 roadmap mentions reliability concerns scattered across phases (Phase 4 had the B2 perf bench harness; Phase 12 mentions SLAs) but never owns the topic. Power users with multi-year archives will hit scaling limits first — at 10M+ indexed items, FTS5 queries slow, vec retrieval consumes RAM, the gateway can crash on malformed connector responses, and sync schedulers thrash under flaky networks. None of this is fatal on a 100k-item index. All of it is fatal at platform-buying scale.

Phase 12's existing "SLA" bullet is too thin to be load-bearing. Wave R is the named expansion that makes Phase 12's SLA promise real.

### Scope

| Sub-area | What ships |
|---|---|
| **Index scale** | Verified-correct queries at 10M+ items across all `nimbus query` shapes (structured, FTS5, vec, hybrid); p95 < 200 ms target. **CI-enforced via synthetic corpus generator** — a `scripts/perf/synthesize-10m-corpus.ts` produces a deterministic 10M-row fixture; the existing `BenchHarness` runs against it on every PR; CI fails on regression beyond a budget delta (default ±5%). Memory ceiling documented per shape and asserted by the same harness |
| **Crash recovery** | Layered model: (a) extension / connector / sync subprocess crashes are caught by the Gateway main process and the subprocess is respawned without interrupting concurrent IPC queries or UI sessions; (b) Gateway main-process crashes are handled by the platform supervisor wired in Phase 1 PAL (systemd / launchd / Windows Service); (c) partial-write detection in `db/write.ts` extended to all mutating paths; SIGKILL-during-sync leaves the index in a consistent state via the existing pre-migration backup + transaction discipline |
| **Sync resilience** | Connectivity probe (`sync/connectivity.ts`) extended with per-connector circuit breaker, exponential backoff with jitter, partial-sync resumption (no full re-fetch after a network blip). **All thresholds tunable via a new `[sync.resilience]` block in `nimbus.toml`**: `circuit_breaker_failure_threshold`, `circuit_breaker_open_duration_seconds`, `backoff_initial_ms`, `backoff_max_ms`, `backoff_jitter_factor`. Enterprise proxy / firewall environments need this knob; defaults match a typical home-network profile |
| **Latency budgets** | Documented p95 / p99 targets per IPC method; **CI gate via the existing `BenchHarness` in `packages/gateway/src/perf/`** runs on every PR with the same synthetic corpus as the index-scale test; regression alerts on `nimbus diag slow-queries` |
| **Memory ceilings** | Per-subsystem memory budgets (engine, vec retrieval, FTS5, embedding); guard rails that fail-fast rather than thrash |
| **Index integrity** | Extend `nimbus db verify` with deeper invariants (vec / FTS / FK consistency at the row level); `nimbus db repair` covers more failure modes; pre-migration backups verified before migration runs |
| **Observability of Nimbus itself** | Local-only Datadog/Sentry-shape view of gateway health: per-IPC latency histograms, per-connector sync duration, embedding throughput, memory by subsystem — exposed via the existing Prometheus-compatible metrics endpoint |

### Slot

**Phase 12 Wave R** — explicit named wave, parallel to the existing Phase 12 work on Docker/Helm, SIEM, compliance, SCIM, admin console, security audit, SLA, GRC platforms. Wave R is the precondition for the SLA bullet to be deliverable; should land before the SLA bullet.

### Risks

- Defining a p99 latency target binds the entire gateway to it. Risk of over-promising. Mitigation: target the median-laptop hardware profile explicitly; document hardware-class-dependent targets.
- Index scale work may require migrations that touch every row (e.g., re-embedding). Phase 12 already mentions enterprise migrations — fold the heavy-lifting migration framework here.

### Out of scope (this proposal)

- P2P sync resilience — that's Phase 11 (Sovereign Mesh) territory.
- Multi-machine consistency — Phase 11 / Phase 6 (Team) territory.
- Specific connector reliability work — that lives in the per-connector spec, not Wave R.

## Addition 2 — Phase 5 Creation Agents Wave

### Motivation

Every built-in agent today *analyzes* (`expert`, `impact`, `catchup`, the proposed `signal` / `rewind` / `quote` from the first roadmap-expansion spec). None *produces*. Yet the same primitives — indexed data + LLM router + HITL on writes — that power analytical agents trivially power authorial ones: the local index already has the source material; the LLM already has the synthesis capability; HITL already gates writes.

The asymmetry feels accidental, not principled. The Creation wave fills it.

### Five agents

| Agent | What it does | HITL surface |
|---|---|---|
| `nimbus draft <topic>` | Composes a Markdown draft (doc, memo, post) using indexed prior writing as voice samples + indexed sources as evidence; outputs to stdout or a configured drafts folder | No write side-effect unless `--save-to` is passed; that write is HITL-gated |
| `nimbus pr-description <branch>` | Writes a PR description from the branch's commits + diff + linked issues; prints to stdout; optional `--apply` posts it (HITL-gated) | `--apply` triggers `github.pr.update` which is in `HITL_REQUIRED` |
| `nimbus changelog <since>` | Generates a user-facing changelog from merged PRs and tagged commits in a range; respects conventional-commits if present. **Monorepo flags:** `--path <glob>` filters commits to those touching matching paths (e.g., `--path 'packages/cli/**'`); `--tag-prefix <prefix>` recognizes per-package release tags (e.g., `--tag-prefix vscode-v` for tags like `vscode-v0.1.2`). Both flags compose; default behavior unchanged for single-package repos | Pure output; no write side-effect |
| `nimbus meeting-notes <recording-or-transcript>` | Summarizes a meeting recording (via Phase 4 voice STT) or pre-existing transcript into action items + decisions + attendees; cross-links into existing notes (Obsidian / Notion) | Pure output unless `--append-to <vault-path>`; HITL-gated on append |
| `nimbus retro <incident-id>` | Generates a draft incident retro: timeline from indexed alerts/commits/messages, contributing factors from related historical incidents, action items from open mitigations | Pure output unless `--apply-to-firehydrant` etc.; HITL-gated |

All five follow the existing [`nimbus-agent-patterns`](../../.claude/commands/nimbus-agent-patterns.md) skill: read-only by default, HITL-free reads, decomposed via `AgentCoordinator` where parallelism helps (mostly for `retro` and `meeting-notes`), Markdown output to stdout, `--apply` flag for write side-effects that always traverse the HITL gate.

### Slot

**Proposed for the Phase 5 Extended queue at the end-of-T6 re-planning checkpoint.** Same treatment as the Agent Triad in the first roadmap-expansion spec — the [Phase 5 sequencing scope guard](2026-05-06-phase-5-sequencing-design.md#scope-guard) blocks mid-flight insertion. At the T6 checkpoint, both this wave and the Agent Triad become eligible for promotion into Extended (or, if appetite is high, into Core after Wave B).

Until promotion, this section is the source of record; no row in the sequencing spec yet.

### Risks

- **Hallucination at output.** A draft, PR description, or retro that fabricates facts is worse than no draft. Mitigation: every claim in the output cites a source row (the same citation discipline as `expert` / `impact`); a "low-confidence" section appended to the output flags claims with weak source support; the user sees draft *plus* citations every time.
- **Voice drift.** `draft` borrowing the user's prior writing as voice samples will produce something close-to-but-not-the-user's-voice — uncanny-valley territory. Mitigation: ship without voice modeling in v1; output is neutral-tone unless `--voice <sample-path>` is explicitly passed (and even then, only emulate at the sentence-rhythm level, not vocabulary).
- **HITL fatigue.** Creation agents that always require HITL on every write will train users to click-through without reading. Mitigation: the agent never auto-applies; the user always *manually* invokes `--apply` or copies the output. **External writes** (publishing a PR description via `github.pr.update`, applying a retro via `firehydrant.incident.update`) are irreversible and therefore not standing-approvable per `I16` from the first roadmap-expansion spec. **Local writes** via `--save-to <local-path>` *are* reversible (the file can be `filesystem.delete`d) and are therefore standing-approvable through the trio's existing mechanism — a user who wants overnight draft generation can create a standing approval scoped to a specific drafts folder, and Nimbus stages each draft write through the reversibility window as designed. No special-casing in this wave; the Cluster D primitives already cover the case.

### Out of scope (this proposal)

- Image / diagram generation — that's Phase 14 (Multimodal Core, image-output sub-feature).
- Voice-output agents — Phase 4 already ships TTS; voiced versions of these agents come later.
- Live-collaborative drafting — Phase 6 (Team) territory.

## Addition 3 — Phase 12 Wave AG: AI Governance

### Motivation

Phase 12 lists GRC platforms (Drata / Vanta / Secureframe) and compliance frameworks (SOC2, HIPAA, ISO27001) but the AI-specific governance surface is thin. In 2026, the highest-frequency enterprise-buying objection for an AI agent platform is **"how do we govern this AI?"** — not "how do we govern access to this platform" (Phase 6 + 12 cover that) but specifically:

1. Which LLM models is each role allowed to use?
2. What's the audit trail per AI output (which model, which prompt, which sources)?
3. How are hallucinations detected and tracked over time?
4. What stops sensitive data from reaching an external LLM?
5. What's the training-data provenance of each model in use?

The first roadmap-expansion spec's `I13` (sensitive-content classifier) addresses #4 partially. Everything else is unspecified.

Wave AG is the named expansion that makes Phase 12 enterprise-acceptable for the AI-skeptical buyer.

### Scope

| Sub-area | What ships |
|---|---|
| **Model usage policy** | `[ai_governance]` config block in `nimbus.toml`: per-role allow-list of models for `classification` / `reasoning` / `generation` task types; Phase 6 SSO/SCIM-resolved roles feed this; enforced in `llm/router.ts` |
| **Per-output AI audit** | Existing `audit_log` extended with `ai_model_used`, `ai_prompt_hash`, `ai_source_row_ids[]`, `ai_token_count_in / out`. The hash, not the prompt — prompt content can contain sensitive data and itself is gated by the existing audit-payload redaction; only the hash is logged unless the org-policy allows full-prompt retention. **SIEM export:** AI audit rows route through the existing Phase 12 SIEM connector (Splunk / Datadog / Elastic / Sentinel) — no separate retention or export infrastructure needed; the SIEM connector's egress contract already filters on `audit_log` columns, and the new `ai_*` columns are first-class participants |
| **Hallucination tracking** | Per-agent counter: how often a user marks an output "incorrect" (via `nimbus feedback <output-id> --incorrect`) or implicitly rejects it (closing a draft without `--apply`); trend over time per model per agent; surfaces in `nimbus diag ai-governance` |
| **PII-in-prompt detection** | Pre-LLM scan: outgoing prompts are run through the `I13` sensitive-content classifier. **Scoped to remote providers only** — a local LLM (Ollama, llama.cpp) cannot exfiltrate by definition, and blocking PII from local models would actively undermine the local-first value proposition (the whole point of running a local model is processing sensitive data without leaving the machine). For a remote provider, if `secret` / `pci` / `phi` content is detected, the LLM call is blocked unless explicitly approved per query (same HITL surface as `nimbus query --include-sensitive`). New invariant **`I17`**: no LLM call to a **remote** provider dispatches with classifier-detected sensitive content unless `hitl_status = 'approved'` for that specific outbound prompt. Local LLM dispatches are exempt from `I17`. The remote-vs-local distinction is read from `LlmProvider.locality` (a field added in Phase 4's LLM router); the invariant test asserts the check uses `provider.locality === 'remote'`, not a hardcoded provider id list, so adding a new remote provider does not require a new test |
| **Training-data provenance** | `llm_models` table extended with `training_data_provenance_json` (manifest from the model vendor — currently absent for most open models, surface "unknown" honestly). **Provenance freshness:** the JSON is populated from the model registry at model-load time (Ollama tag manifest, HuggingFace model card via the model's `id`, llama.cpp embedded metadata in the GGUF header); refreshed on every `llm.loadModel` call. Manual refresh available via `nimbus model provenance refresh <model-id>`. The `provenance_last_refreshed_at` timestamp is queryable so admins can surface stale provenance. Admin-facing query: which models in current use have unknown / non-attributable / non-permissive / stale training data |
| **Model usage policy enforcement test** | `security-invariants.test.ts` extended with `I18`: every `llm.generate` call passes through `router.checkPolicy(role, taskType, modelId)`; a code path that calls a model directly without the router check is a structural regression |

### Slot

**Phase 12 Wave AG** — parallel to Wave R (Reliability), parallel to the existing GRC/compliance work. Naturally pairs with the existing Phase 9 (AI Engineering Loop) `nimbus model-health` agent — Wave AG is the *governance* layer atop the *observability* Phase 9 already provides.

### Risks

- **Per-output AI audit volume.** Every agent invocation writing a multi-field audit row will pressure `audit_log` size. Mitigation: the row carries hash + ids, not prompt body; archival is handled by the Phase 12 SIEM connector streaming rows out — local rows can be pruned after confirmed export.
- **Org-policy bypass via direct extension calls.** An extension that calls its own LLM bypasses `llm/router.ts`. Mitigation: extension manifest must declare `permissions.llm` capability; without it, the extension cannot reach any LLM through SDK-provided helpers; invariant `I18` is wired in the router *and* in the SDK's LLM-helper surface so neither can be bypassed alone.

### Out of scope (this proposal)

- Custom fine-tuning governance — that's Phase 14 Stretch (local fine-tune).
- Multi-tenant model governance — Phase 6 (Team) covers per-team, not per-output.
- Model jailbreak / red-team automation — out of v1 scope; reserve for a future security-engineering wave.

## Addition 4 — Phase 10 Explainability Sub-wave

### Motivation

The first roadmap-expansion spec's Cluster D introduced the autonomous trio (standing approvals + reversibility window + trust ledger). The trust ledger surfaces *what* Nimbus did autonomously. It does not surface *why*.

For a user to deeply trust standing approvals — to set them up generously enough that Nimbus is meaningfully autonomous — they need to understand the agent's reasoning before granting that trust. The trust ledger is a backward-looking accountability surface; explainability is the forward-looking trust-building surface. Both are needed.

Explainability is therefore a precondition for *deep* adoption of the autonomous trio, even though it isn't a precondition for *shipping* the trio. The trio lands first (PRs D1–D3 in the first roadmap-expansion spec); explainability is the natural follow-on inside Phase 10 before Phase 10 closes.

### Scope

| Sub-area | What ships |
|---|---|
| **Reasoning trace** | A `reasoning_trace` object captured at agent-execution time and persisted to `reasoning_traces` for every agent invocation (not opt-in — see "Trace capture timing" below). Contains: sub-agent decomposition (which sub-tasks ran, in what order), source-row ids cited and their retrieval weights, rejected sub-task hypotheses (with reason), per-step token counts |
| **`nimbus explain <action-id>`** | CLI: given an action id from the audit log or trust ledger, loads the **already-captured** trace from `reasoning_traces` and renders it. Works for any past action (no opt-in at invocation time) |
| **Tauri reasoning panel** | New `/reasoning/:action-id` route in the Tauri UI; same data as the CLI, rendered with source-row cards (click to open original), sub-agent decomposition tree, rejected-hypothesis list |
| **`--explain` at agent invocation** | Controls whether the trace is **displayed inline** with the agent's brief output. Does **not** control trace capture — capture is always-on. Default off to keep briefs short |
| **Counterfactual preview** | Before an autonomous action dispatches (during the reversibility window), `nimbus autonomous staged --explain <id>` renders the captured trace; lets the user undo with full context, not blind |

**Trace capture timing — must be at execution, not reconstruction.** The trace is captured live during agent execution and persisted before the action commits. Reconstructing a trace after the fact would be wrong: the indexed rows, embeddings, and people-graph relationships drift between execution and the `nimbus explain` call, so a post-hoc reconstruction would describe what the agent *would do now*, not what it *did then*. The captured trace is the authoritative record. Storage budget per trace is small (decomposition graph + source ids + token counts; not full source-row content — that's resolved on-demand from the live index when rendering). `reasoning_traces` inherits the rollover/retention policy of `audit_log`.

**SDK-published trace schema for extension interop.** The `reasoning_trace` JSON shape is published as a typed export from `@nimbus-dev/sdk` (`ReasoningTraceFragment` interface plus the parent `ReasoningTrace` shape). Extensions invoked during agent decomposition can return a `ReasoningTraceFragment` from their tool handler — the coordinator appends fragments to the unified trace under the originating sub-task. This is forward-compat infrastructure: v1 ships the schema and the append surface; no extension uses it yet. Documented in the SDK changelog as part of Plugin API v1.x; extensions adopting it can do so without an SDK major-version bump.

### Slot

**Phase 10 sub-wave**, after the autonomous trio (PRs D1–D3) lands. PR ordering inside Phase 10:

1. PR D1 — Reversibility infrastructure *(first roadmap-expansion spec)*
2. PR D2 — Standing approvals *(first roadmap-expansion spec)*
3. PR D3 — Trust ledger + UI *(first roadmap-expansion spec)*
4. **PR D5 — Reasoning trace + `nimbus explain` + Tauri panel** *(this proposal)*
5. PR D6 — Counterfactual preview integration *(this proposal — depends on D5)*

(D4 — trust budget — remains stretch as documented in the first spec.)

### Risks

- **Reasoning trace size.** A 5-sub-agent decomposition can produce a kilobyte-scale trace. Mitigation: per-trace size cap; truncation with `[truncated, run with --full-explain]` marker; the `reasoning_traces` table inherits the size budget from the per-row budget already in use for `audit_log`.
- **LLM-generated rationales are post-hoc.** The "rejected hypotheses" list as currently designed is reconstructed by asking the LLM after the fact; that's not real introspection of the planner. Mitigation: the coordinator's actual decomposition graph (what it dispatched, what dependencies were considered) is recorded *during* execution, not reconstructed; only the natural-language explanation of *why* a sub-task ran is post-hoc-generated; this distinction is documented in the user-facing copy ("source weights and decomposition are real; the prose explanation is a generated summary, not introspection").
- **Privacy of reasoning traces.** Traces include source row ids and excerpts — sensitive in the same way `audit_log` content is. Mitigation: `reasoning_traces` inherits the same `I11` envelope wrapping for LLM-facing surfaces, and `I13` sensitive-content classification — traces with classified-sensitive sources are quarantined the same way the underlying rows are.

### Out of scope (this proposal)

- Real-time streaming of reasoning trace during agent execution (interesting UX but adds latency; defer to a follow-up).
- Reasoning-trace comparison across runs ("why did the agent give a different answer last week?") — interesting but Phase 14-territory.

## Cross-cutting sequencing

```
Phase 5 — Creation Agents wave            ←─ parked at T6 checkpoint (no commitment yet)
Phase 10 — Autonomous trio                ←─ PRs D1, D2, D3 from first roadmap-expansion spec
Phase 10 — Explainability sub-wave        ←─ PRs D5, D6 (this spec) — after D3
Phase 12 — Wave R: Reliability at Scale   ←─ named Phase 12 wave; precondition for the SLA bullet
Phase 12 — Wave AG: AI Governance         ←─ named Phase 12 wave; pairs with Phase 9 model-health
```

Dependencies:

- **Wave AG depends on `I13`** (sensitive-content classifier from the first roadmap-expansion spec) — PII-in-prompt detection reuses the classifier. If Phase 8 ships `I13` first, Wave AG inherits it; if Wave AG ships first, it must implement `I13`.
- **Explainability sub-wave depends on the autonomous trio** — the reasoning trace surface is partially about explaining standing-approval decisions, which don't exist until D2 lands.
- **Wave R depends on nothing here** — pure infrastructure work; could land at any time.
- **Creation Agents wave depends on nothing here** — could land alongside the Agent Triad if T6 checkpoint promotes both.

## Out of scope for this document

The brainstorm that produced this doc considered three more gaps that are intentionally not promoted to the roadmap here:

- **Gap 6 — Personal / Consumer track.** Household calendar sharing, personal finance reasoning, learning/study assistant. The local-first DNA suits consumer use *better* than enterprise, but turning Nimbus into a dual-persona product is a packaging / distribution problem, not a phase. Defer to a spin-off product spec if pursued. Belongs in the "new repo" branch of the original brainstorm that the user explicitly scoped out.
- **Gap 7 — Agent Mesh (federation with other AI agents).** Subscribing to a Cursor session's output, ingesting Anthropic Operator outputs, federating Nimbus instances. Interesting; very early in the MCP ecosystem to be load-bearing. Defer to Phase 15+ or its own spec when an actual second AI-agent integration target exists.
- **Gap 3 — Ecosystem economics + extension DX.** Phase 5 sequencing already defers marketplace monetization to Phase 6; Phase 6 doesn't actually own it. A dedicated phase for revenue share, payment infrastructure, extension certifications, etc. is justifiable but premature — there's no extension ecosystem to monetize yet. Defer until the marketplace has external publishers.
