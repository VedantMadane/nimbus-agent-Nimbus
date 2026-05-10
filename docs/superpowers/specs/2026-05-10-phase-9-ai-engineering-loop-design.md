# Phase 9 — AI Engineering Loop (Design)

**Status:** Approved 2026-05-10
**Author:** Asaf Golombek (with Claude assistance)
**Scope:** Insert a new Phase 9 between Security Engineering (Phase 8 post-shift) and Autonomous Agent (Phase 10 post-shift).

---

## Motivation

Nimbus is itself an AI agent product, but offers nothing for users who run *their own* AI/LLM deployments in production. ML engineers, AI-product teams, and platform teams running internal LLM services need: prompt observability, eval harness state, model-monitoring signals, vector-store / RAG infrastructure, and AI-spend dashboards. None of those connect to the local index today. Phase 9 brings the AI Engineering Loop's tool surface in and ships two built-in agents that surface model and RAG health.

This phase is also a **strategic moat**: an AI agent product that helps you run your AI is a fundamentally different market position from "another agent."

## New Phase 9 — AI Engineering Loop

**Goal:** Bring the tool surface that ML engineers and AI-product teams already use into the local index, and ship `nimbus model-health` + `nimbus rag-health` to surface actionable status without a live API call. Read-first for ingestion; HITL on the few write tools (`prompt.deploy`, `model.promote-stage`, `feature.publish`) because pushing a prompt or promoting a model is a production change.

> **Composes with Phase 8 (Security Engineering):** supply-chain attestations from Phase 8 Wave 4 extend to model artifacts — a deployed model can be queried "does it have a signed SLSA provenance? what's its base-model dependency CVE state?" Cross-link in roadmap.

> **Composes with Phase 10 (Autonomous Agent):** Phase 10's incident correlation engine pulls AI-Eng Loop signals when an LLM-backed feature is in the affected scope ("the alert fired on a feature whose backing model regressed on eval-suite X two hours ago"). Phase 10's standing-approval engine can suppress noise from `nimbus model-health` after N consecutive identical decisions.

### Dependencies

- Phase 4 LLM router + multi-agent orchestration (built-in agents)
- Phase 4 Plugin API v1
- Phase 3 connector mesh + relationship graph
- Phase 7 service catalog (AI features attribute to services and route to owner teams)
- Phase 3.5 telemetry counters (cost data flows through same pipeline)

### Structure — Four Waves

Independent waves; recommended order matches user need frequency (LLM Obs first because it's most-used today, AI Cost last because it cuts across all three).

### Wave 1 — LLM Observability & Evaluation

Adds `llm_trace`, `prompt_version`, `eval_run` item types.

| Connector | Coverage | Write tools (HITL) |
|---|---|---|
| Helicone | LLM traces, latency p50/p95/p99, cost per request, error rate | (read-only) |
| Langfuse (open source, self-hostable) | traces, sessions, prompt versions, eval datasets | `langfuse.prompt.deploy` |
| LangSmith | traces, datasets, eval-run results, prompt versions in LangSmith Hub | `langsmith.prompt.commit` |
| Braintrust | eval runs, scorers, prompt versions, regressions | `braintrust.prompt.deploy` |
| Promptfoo (open source CLI) | eval-run state from `promptfoo.yaml` runs in CI | (read-only) |

Plus:
- **Prompt-regression watcher** — fires when an eval-suite pass-rate drops below threshold (configurable; default 95% of trailing 7-day mean)

### Wave 2 — ML Model Lifecycle

Adds `ml_model`, `feature`, `monitor` item types. (Note: Phase 5/6 already index `model registry` entries from MLflow / SageMaker / Vertex AI — Phase 9 adds the *operational* signals.)

| Connector | Coverage | Write tools (HITL) |
|---|---|---|
| Arize AI | model monitors, drift signals, performance segments | `arize.monitor.acknowledge` |
| WhyLabs (open core) | data profiles, drift detections, model performance | `whylabs.monitor.silence` |
| Feast (open source) | feature views, online/offline freshness, materialisation status | `feast.feature.materialize` |
| Tecton | feature pipelines, materialisation state, online-store health | `tecton.feature.publish` |
| Fiddler | model performance, fairness/bias monitors, segment drilldowns | `fiddler.monitor.acknowledge` |

### Wave 3 — Vector Stores & RAG Infrastructure

Adds `vector_index`, `rag_eval_run`, `embedding_version` item types.

| Connector | Coverage | Write tools (HITL) |
|---|---|---|
| Pinecone | indexes, namespace stats, vector count, recent upsert/delete events | (read-only — write surface deferred) |
| Weaviate (open source, self-hostable) | classes/collections, object counts, schema versions, recent imports | (read-only) |
| Qdrant (open source, self-hostable) | collections, point counts, snapshot list | (read-only) |
| Chroma | collections, embedding-function versions, document counts | (read-only) |
| Ragas / TruLens (CLI integration) | RAG eval runs, faithfulness / answer-relevance / context-precision scores | (read-only) |

Plus:
- **Embedding-drift watcher** — fires when a vector index's embedding-function version diverges from the model that originally embedded the indexed content; surfaces in morning briefing

### Wave 4 — AI Cost & Governance

Adds `ai_spend_event`, `model_policy` item types.

| Connector | Coverage | Write tools (HITL) |
|---|---|---|
| OpenAI usage export | per-API-key, per-model spend, token counts, daily aggregates | (read-only) |
| Anthropic usage export | per-API-key spend, token counts, model breakdown | (read-only) |
| AWS Bedrock spend (via Cost Explorer) | per-model invocations, on-demand vs. provisioned spend | (read-only) |
| Vertex AI spend (via Cloud Billing export) | per-model spend, prediction unit counts | (read-only) |
| Model-policy registry (in-Nimbus) | declarative policy: which model class for which task class, redaction policy before send, data-residency mappings | `policy.update` HITL |

Plus:
- **AI cost watcher** — fires when 24 h spend exceeds 7-day rolling average by configurable threshold (default 50%); surfaces in morning briefing
- **Policy-violation watcher** — fires when an LLM call routes to a model class violating the active policy (e.g. PII data class to non-residency-compliant model); blocks via the existing LLM router air-gap mechanism

### Built-in Agents

- **`nimbus model-health [<model-name>]`** — parallel sub-agents over LLM observability + eval + cost connectors; per-model brief with latency p50/p95/p99, eval-suite pass rate trajectory, cost burn vs. budget, recent prompt regressions, drift indicators. Emits `agents.modelHealth.briefReady`. CLI mirrors `nimbus expert` / `nimbus impact`.
- **`nimbus rag-health [<rag-app-name>]`** — parallel sub-agents over vector-store + RAG-eval + ingestion connectors; per-application brief with retrieval-quality scores, embedding-version drift, vector-store health, knowledge-base freshness, recent ingestion failures. Emits `agents.ragHealth.briefReady`.

### Schema Migrations

Continuing from Phase 8's last migration number (call it M):

| # | Objects added | Wave |
|---|---|---|
| M+1 | `llm_trace` + `prompt_version` + `eval_run` tables | 1 |
| M+2 | `ml_model` + `feature` + `monitor` tables | 2 |
| M+3 | `vector_index` + `rag_eval_run` + `embedding_version` tables | 3 |
| M+4 | `ai_spend_event` + `model_policy` tables | 4 |
| M+5 | New relation kinds (`service → ml_model`, `ml_model → feature`, `prompt_version → eval_run`, `vector_index → embedding_version`) | all |

All append-only, single-transaction, pre-migration backup, per `nimbus-db-migrations` skill.

### Acceptance Criteria

- A connected Helicone account with 1M+ traces indexes recent traces (last 24 h) in under 60 s; `nimbus model-health gpt-4o-prod` returns latency p50/p95/p99 + cost burn from the local index in under 15 s with no live API call
- A prompt-regression watcher fires on a connected Braintrust suite when pass-rate drops below threshold; surfaces in morning briefing
- `nimbus rag-health my-rag-app` returns retrieval-quality scores from a connected Ragas eval-run history + vector-store stats from Pinecone in under 15 s, locally
- An embedding-drift watcher detects a Pinecone index whose embedding-function version no longer matches the indexing-time model and surfaces a structured remediation suggestion (re-index)
- AI cost watcher fires on a 50 % daily-spend spike against the 7-day rolling baseline; surfaces in morning briefing with per-key attribution
- Policy-violation watcher blocks an LLM call routing to a non-policy model class (verified via LLM router integration test); decision recorded in audit log
- Privacy contract: no LLM trace body content is exfiltrated; only per-trace metadata (latency, cost, model id, success/error) is indexed unless the user explicitly opts in via `[ai_engineering].index_trace_bodies = true`

### Stretch (does not gate phase completion)

- **Long-tail vendors as community extensions:** Aporia, Phoenix Arize, OpenLLMetry, Pezzo, Hopsworks, Featureform, Dynamic.ai, Confident AI, DeepEval
- **Eval-as-a-watcher** — `nimbus` runs Promptfoo evals locally on a configurable schedule against locally-indexed prompt versions; results feed `nimbus model-health`
- **Bring-your-own-model fine-tune trace** — when Phase 14 (AI v2) ships fine-tuning, Phase 9 indexes the resulting fine-tuned model's training-run telemetry as `ml_model` rows

## Open Questions

- **Trace-body indexing privacy floor** — default OFF (only metadata indexed); user opts in per provider. Spec leaves the threshold of "what counts as a trace body" intentionally conservative.
- **Cost data granularity** — daily aggregates initially; per-request cost attribution to specific Nimbus features is a Phase 10 (Autonomous Agent) cost-correlation extension
- **Local Promptfoo runner** — listed as stretch; may lift to core if a contributor delivers it

## Approval

User confirmed via brainstorming session 2026-05-10:
- Sub-themes: all four (LLM Obs & Eval · ML Lifecycle · Vector Stores & RAG · AI Cost & Governance)
- Connector breadth: comprehensive (3–4 per sub-theme)
- Built-in agents: `nimbus model-health` + `nimbus rag-health`
- Placement: New Phase 9 (push Autonomous Agent → 10, etc.)
