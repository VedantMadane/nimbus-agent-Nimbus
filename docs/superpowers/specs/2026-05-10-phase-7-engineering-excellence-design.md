# Phase 7 — Engineering Excellence (Design)

**Status:** Approved 2026-05-10
**Author:** Asaf Golombek (with Claude assistance)
**Scope:** Insert a new Phase 7 between the existing Phase 6 (Team) and the existing Phase 7 (The Autonomous Agent), shifting Phases 7–10 to Phases 8–11. (Subsequently shifted again on 2026-05-10 when Security Engineering and AI Engineering Loop were inserted at 8 / 9 — see `2026-05-10-phase-8-security-engineering-design.md` and `2026-05-10-phase-9-ai-engineering-loop-design.md`. The Engineering Excellence numbering at Phase 7 is unchanged.)

---

## Motivation

Phases 1–6 give Nimbus the foundations: a local index across the user's data, a connector mesh, multi-agent orchestration, a presence layer (UI + voice + desktop), and team-collaboration primitives (federation, Team Vault, shared namespaces, SSO/SCIM). What is missing — and what large engineering organisations spend a meaningful share of their tooling budget on — is the **operational layer above day-to-day work**: who owns what, how is the team performing, what's controlled by feature flags, and what reusable patterns has the team codified?

Phase 7 fills that gap. It is single-user-first: every connector and every team feature works on a solo machine and produces value with one user's index. Phase 6 federation, when present, multiplies the value (knowledge graph and automation library can sync across teammates) but is never a precondition.

## New Phase 7 — Engineering Excellence

**Goal:** Give engineers a local, queryable view of how their team operates — service ownership, DORA / SPACE health, feature-flag state, and a shared knowledge graph that turns one engineer's hard-won pattern into the team's reusable automation. **Single-user-first;** Phase 6 federation amplifies the value but is not a precondition.

### Dependencies

- Phase 4 LLM router + multi-agent orchestration (the `nimbus excellence` agent is a built-in)
- Phase 4 Plugin API v1 (long-tail vendors land as community extensions)
- Phase 3 connector mesh + relationship graph (Phase 7 connectors stack on it)
- Phase 3.5 telemetry counters (excellence dashboard reads aggregate metrics from same pipeline)
- *Optional / enhancing:* Phase 6 federation — if available, the knowledge graph and automation library sync across teammates; on a solo machine, both work as a local pattern library

### Structure — Four Ordered Waves

Waves 1 → 2 → 4 are sequential because Wave 2 references the `service` / `team` item types added in Wave 1, and Wave 4 (capstone) ties Waves 1–3 together. **Wave 3 has no dependency on Waves 1–2 and can land in parallel.**

### Wave 1 — Service Catalog & Ownership

Adds `service`, `component`, `team`, `scorecard` item types and the ownership graph used by every later wave.

| Connector | Coverage | Write tools (HITL) |
|---|---|---|
| Backstage (open source) | `Component` / `API` / `System` / `Resource` / `Group` entities; cross-link `service → repository (github)`, `service → on-call (pagerduty)`, `service → dashboard (datadog/grafana)` | `catalog.entity.update` |
| Cortex | services, scorecards, on-call mappings, ownership | `cortex.scorecard.acknowledge` |
| OpsLevel | services, rubrics, checks, levels | `opslevel.check.run` |
| Port | entities, blueprints, scorecards, action runs | `port.action.run` |

Plus:
- **Ownership graph** — extends Phase 3 relationship graph with `code_symbol → service → team` resolution
- **`nimbus services list / show`** CLI surface with `--owned-by`, `--scorecard-status`

### Wave 2 — DORA / Engineering Metrics

Builds on Wave 1's `service` / `team` item types. Privacy posture: ingest only metrics the user already has source-system access to.

| Connector | Coverage | Write tools (HITL) |
|---|---|---|
| LinearB | DORA metrics, deploy frequency, cycle time, deploy events, team rosters | (read-only) |
| Jellyfish | engineering allocation, deliverable progress, team metrics (SSO-gated) | (read-only) |
| Swarmia | DORA dashboards, work-item flow, investment dimensions | (read-only) |
| Sleuth | deploy tracking, change failure rate, recovery time, lead time | `sleuth.incident.acknowledge` |

Plus:
- **Engineering metrics dashboard** — Tauri panel + TUI pane: 4-metric DORA grid × 7d/30d/90d windows, all from local index
- **Privacy contract test** — asserts no individual-engineer-keyed metric is indexed unless source-system role grants access

### Wave 3 — Feature Flags & Experimentation

Independent of Waves 1-2. Write tools are production-impacting; HITL gating is non-negotiable and the consent UI must show before/after rollout %, environments affected, and segment scope.

| Connector | Coverage | Write tools (all HITL) |
|---|---|---|
| LaunchDarkly | flags, environments, segments, rollout rules, kill switches | `flag.toggle`, `flag.rollout.update`, `flag.environment.override`, `flag.kill-switch.fire` |
| Split.io | splits, treatments, experiments, metric impacts | `split.killswitch.fire` |
| Flagsmith (open source, self-hostable) | flags, environments, segments | `flag.toggle` |
| Unleash (open source, self-hostable) | toggles, strategies, gradual rollouts | `toggle.update` |
| Statsig | feature gates, dynamic configs, experiments | `gate.update`, `experiment.publish` |

Plus:
- **Stale flag watcher** — fires on flags at 100% rollout > N days (default 90); surfaces in the morning briefing
- **`nimbus flags list / show`** CLI with `--stale` / `--service` / `--environment`

### Wave 4 — Shared Knowledge Graph + Automation Library + `nimbus excellence`

Capstone. Single-user-first; if Phase 6 federation is available, the knowledge graph and automation library sync across teammates.

- **Cross-team dependency graph** — extends Phase 3 relationship graph with team boundaries; resolves "what other teams' services depend on mine?" without a live catalog API call
- **Automation template library** — local store of reusable watcher + workflow templates (e.g. "CI failure → Slack thread → rerun once → if still failing, escalate"); user can publish a template to a named local library; templates are pure declarative TOML, no embedded credentials
- **Pattern recognition** — agent identifies repeated incident-response patterns from indexed history; surfaces them as automation template candidates ("you've followed this same 3-step recovery 4 times — save as template?"); explicit user confirm required (no silent learning)
- **Team policy library** — shared policy fragments (HITL thresholds, connector allowlists, retention floors) consumable by the Phase 6 policy engine when available; on a solo machine, used as user-level config presets
- **`nimbus excellence` built-in agent** — read-only, parallel sub-agents over: service catalog, DORA metrics, feature flags, recent deploy/incident activity; emits `agents.excellence.briefReady` notification; CLI surface `nimbus excellence [--service <name> | --team <name>]` (mirrors `nimbus expert / impact / catchup` per `nimbus-agent-patterns`)
- **Excellence dashboard** — Tauri page combining DORA grid + service-catalog browser + stale-flag list + automation template list

---

## Cross-References Between Phase 6 and Phase 7

Phase 6 and Phase 7 are **independent for shipping** but **mutually amplifying when both are present**. The roadmap calls this out in both directions.

### Phase 6 (Team) → Phase 7 (Engineering Excellence)

- **Phase 6 ChatOps** — when Phase 7 ships, the `@nimbus excellence` shortcut surfaces the excellence brief inside Slack/Teams; same HITL gating as `@nimbus rollback` for any flag toggle initiated from chat
- **Phase 6 admin console** — when Phase 7 ships, the admin console embeds the DORA grid and service-catalog browser as additional panels; team-wide rollup view requires Phase 6 federation
- **Phase 6 federation** — when Phase 7 ships, the knowledge graph and automation library can be published to a named shared namespace; teammates subscribe via the existing federation protocol; no new transport
- **Phase 6 org-level policy engine** — Phase 7's team policy library produces fragments the Phase 6 engine consumes

### Phase 7 (Engineering Excellence) → Phase 6 (Team)

- **Wave 1 ownership graph** — solo machine: the user's own indexed services + cross-team dependencies inferred from Phase 5 OpenAPI / AsyncAPI specs. With Phase 6 federation: federated peers' service catalogs merge into the local view, producing a fuller cross-team picture
- **Wave 4 knowledge graph + automation library** — solo machine: local pattern library only. With Phase 6 federation: published shared namespaces propagate templates and policy fragments to teammates
- **Wave 4 `nimbus excellence` agent** — solo machine: queries one user's index. With Phase 6 federation: optionally aggregates DORA snapshots and stale-flag counts across federated peers' indexes (still no relay server, still LAN-bounded)

---

## Schema Migrations

Continuing from Phase 6's last migration number (call it M):

| # | Objects added | Wave |
|---|---|---|
| M+1 | `service` table + indexes | 1 |
| M+2 | `team` + `scorecard` tables | 1 |
| M+3 | `dora_metric` + `engineering_metric_snapshot` tables | 2 |
| M+4 | `feature_flag` + `experiment` tables | 3 |
| M+5 | `automation_template` table | 4 |
| M+6 | New relation kinds in `relationship_graph` (`service.owned_by → team`, `code_symbol → service`, `feature_flag → service`) | 4 |

All append-only, single-transaction, pre-migration backup, per `nimbus-db-migrations` skill.

## Acceptance Criteria

- A connected Backstage instance with 50+ services indexes in under 60 seconds; `nimbus services list --owned-by my-team` returns the correct subset from the local index without a live API call
- `nimbus ask "who owns src/billing/retry.ts?"` resolves the chain `code_symbol → repository → service → team` from the local relationship graph in under 200 ms
- DORA dashboard renders 4-metric × 7d/30d/90d grid for one indexed team without a live API call to LinearB / Jellyfish / Swarmia / Sleuth
- Toggling a LaunchDarkly flag via `nimbus flag toggle <key>` requires HITL; the consent dialog shows before/after rollout %, environments affected, and segments scoped; rejection logs `hitl_status = 'rejected'` to the audit chain
- A stale-flag watcher fires on a flag at 100% rollout for the configured threshold; surfaces in the morning briefing without a separate query
- An automation template saved from a recognised incident pattern can be applied to a fresh incident matching the same pattern; user explicitly approves application
- `nimbus excellence --team my-team` returns a Markdown brief with: top 3 services by recent change, 4-metric DORA snapshot, stale flag count, open-incident count — all from the local index, in under 15 s on a mid-range laptop
- Privacy contract test passes: no individual-engineer-keyed metric is indexed unless source-system role grants the user access

## Stretch (does not gate phase completion)

- **Long-tail vendors as community extensions** — Atlassian Compass, Roadie (managed Backstage), Configu, Hatica, Code Climate Velocity, GitClear; ship via Marketplace v2 per the "comprehensive then community" model
- **Self-hosted preference path** — Flagsmith / Unleash / Backstage self-hosted variants documented as the recommended privacy-conservative defaults
- **Cross-vendor DORA harmonisation** — when two DORA connectors are connected (e.g. LinearB + Sleuth), the engine reconciles overlapping metrics with a configurable preference order; surfaces a "DORA confidence" indicator

## Approval

User confirmed via brainstorming session 2026-05-10:
- Theme: Engineering Excellence
- Sub-themes: all four (service catalog, DORA, feature flags, knowledge graph)
- Independence: fully independent of Phase 6 federation (single-user-first)
- Connector breadth: comprehensive (3-4 per sub-theme)
- Structure: four ordered waves
- Cross-references: yes, both directions
