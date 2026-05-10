# Phase 8 — Security Engineering (Design)

**Status:** Approved 2026-05-10
**Author:** Asaf Golombek (with Claude assistance)
**Scope:** Insert a new Phase 8 between the new Phase 7 (Engineering Excellence) and the existing Phase 8 (The Autonomous Agent). After this round, Autonomous Agent → Phase 10, Sovereign Mesh → 11, Enterprise → 12, Desktop Distribution → 13, and a new Phase 14 (AI v2) is added at the end.

---

## Motivation

The Nimbus non-negotiables explicitly name "security practitioner" alongside "on-call engineer" and "platform engineer" as the target user. Yet through Phase 7 the connector mesh has zero security-tooling coverage. SAST/DAST findings, CSPM posture, IR/SOC incident state, supply-chain attestation — all live in tools the security practitioner already pays for. Without first-party connectors, those tools never enter the local index and the agent cannot reason across them. Phase 8 closes this gap and ships four built-in security agents that compose with the rest of the local index.

## New Phase 8 — Security Engineering

**Goal:** Bring the security practitioner's tool surface into the local index and ship the four built-in agents that turn that surface into actionable briefs. Read-first; every write tool gates on HITL with rich diff preview because security writes (acknowledging vulnerabilities, rotating secrets, suppressing findings) are decisions with downstream consequences.

> **Composes with Phase 7 (Engineering Excellence):** Phase 7 scorecards consume security-posture metrics produced here (e.g. "open-vuln count", "secret-rotation overdue count"). Phase 8 service-attribution joins back to the Phase 7 service catalog so a finding can be routed to its owner team without a live API call.

> **Composes with Phase 10 (Autonomous Agent post-shift):** Phase 10's incident correlation engine queries security findings from the Phase 8 index. The two `nimbus incident*` agents are deliberately distinct — Phase 8's `nimbus incident` is security-shaped (attacker indicators, exposed endpoints, vuln CVEs, IR runbooks); Phase 10's `nimbus incident-brief` is operational (deploy → PR → commit → CI → Slack). When both ship, each brief includes a section sourced from the other domain.

### Dependencies

- Phase 4 LLM router + multi-agent orchestration (built-in agents)
- Phase 4 Plugin API v1 (long-tail vendors as community extensions)
- Phase 3 connector mesh + relationship graph
- Phase 7 service catalog (`service` / `team` item types — security findings attribute to services and route to owner teams)
- Phase 3.5 telemetry counters

### Structure — Four Waves

Waves 1 → 2 → 3 → 4 are independent and can land in any order; the recommended order matches user incident frequency (code findings most common, supply-chain least common).

### Wave 1 — Code & Dependency Scanning

Adds `security_finding`, `dependency`, `cve` item types.

| Connector | Coverage | Write tools (HITL) |
|---|---|---|
| Snyk (Code + Open Source + Container) | SAST findings, SCA vulns, container scan results | `snyk.issue.ignore` |
| Semgrep | SAST rules, findings per repo, custom rule packs | `semgrep.finding.suppress` |
| SonarQube | code-quality + security hotspots, coverage gates | `sonar.hotspot.review` |
| GitGuardian | secret findings, severity, validation status | `gg.incident.resolve`, `gg.secret.invalidate` |
| TruffleHog (open source, self-hostable) | secret findings, regex/entropy hits | `trufflehog.finding.suppress` |
| Dependabot / Renovate state (read-only) | open dependency PRs, severity, age | (read-only) |

Plus:
- **`nimbus security <repo|service>`** — parallel sub-agents over scanner connectors; ranks open findings by severity × exploitability × age; surfaces top-N as Markdown brief; emits `agents.security.briefReady`

### Wave 2 — Cloud & Container Security Posture

Adds `posture_finding`, `iac_finding`, `cluster_finding` item types.

| Connector | Coverage | Write tools (HITL) |
|---|---|---|
| Wiz | CSPM findings, attack-path graph, identity over-permissions | `wiz.issue.assign`, `wiz.issue.resolve` |
| Prisma Cloud | CSPM, CWPP, CIEM | `prisma.alert.acknowledge` |
| Trivy (open source, self-hostable) | container/image scan, IaC scan, license check | (read-only; Trivy is offline) |
| Checkov | IaC misconfig findings (Terraform, CloudFormation, Helm, Kubernetes manifests) | `checkov.finding.suppress` |
| Sysdig / Falco (cluster runtime) | runtime threat detections, policy violations | `sysdig.alert.silence` |

Plus:
- **`nimbus posture <cloud-account|cluster>`** — parallel sub-agents over CSPM + IaC + runtime connectors; ranks by exploitability × blast radius × asset criticality; emits `agents.posture.briefReady`

### Wave 3 — Incident Response & SOC

Adds `security_incident`, `siem_event`, `threat_indicator` item types.

| Connector | Coverage | Write tools (HITL) |
|---|---|---|
| FireHydrant | incidents, runbooks, retros, severity, affected services | `firehydrant.incident.update`, `firehydrant.incident.resolve` |
| Rootly | incidents, retro templates, action items | `rootly.incident.update` |
| Tines (SOAR) | story runs, action history, story metadata | `tines.story.run` (HITL — running an automation is a write) |
| Splunk Search (read-only SIEM) | saved searches, recent results, alert configurations | (read-only) |
| Microsoft Sentinel (read-only) | incidents, analytic rules, recent alerts | (read-only) |
| VirusTotal | hash / IP / domain reputation, recent submissions | (read-only) |

Plus:
- **`nimbus incident <alert-id|incident-id>`** — security-incident-shaped: attacker indicators (IPs, hashes, domains), affected services + owners, exposed endpoints, recent vulnerable deploys, IR runbook recommendations; emits `agents.security_incident.briefReady`. **Distinct** from Phase 10's `nimbus incident-brief` (operational shape).

### Wave 4 — Supply Chain & Identity

Adds `sbom_artifact`, `attestation`, `identity_event` item types.

| Connector | Coverage | Write tools (HITL) |
|---|---|---|
| Sigstore Rekor | signed artifacts, transparency-log entries | (read-only — Rekor is append-only globally) |
| in-toto / SLSA provenance | build provenance, attestation graph | (read-only) |
| Okta logs (System Log API) | sign-in events, MFA challenges, admin actions | `okta.user.suspend` (HITL) |
| Azure AD audit | sign-in events, conditional-access decisions, role assignments | (read-only in Phase 8; writes deferred) |
| HashiCorp Vault audit log | secret reads, role bindings, policy changes | (read-only) |
| Doppler | secret access events, environment configs | `doppler.secret.rotate` (HITL) |

Plus:
- **`nimbus supply-chain <repo|artifact>`** — SBOM diff against last release, signed-vs-unsigned dependencies, attestation gaps, license-policy violations, transparency-log presence; emits `agents.supply_chain.briefReady`

### Schema Migrations

Continuing from Phase 7's last migration number (call it M):

| # | Objects added | Wave |
|---|---|---|
| M+1 | `security_finding` table + indexes (severity, status, service_id) | 1 |
| M+2 | `dependency` + `cve` tables, `dependency_cve` join | 1 |
| M+3 | `posture_finding` + `iac_finding` + `cluster_finding` tables | 2 |
| M+4 | `security_incident` + `siem_event` + `threat_indicator` tables | 3 |
| M+5 | `sbom_artifact` + `attestation` + `identity_event` tables | 4 |
| M+6 | New relation kinds (`code_symbol → security_finding`, `dependency → cve`, `service → finding`, `incident → service`) | all |

All append-only, single-transaction, pre-migration backup, per `nimbus-db-migrations` skill.

### Acceptance Criteria

- A connected Snyk org with 100+ open vulns indexes in under 60 s; `nimbus security my-service` returns the top-N ranked open findings from the local index without a live API call
- `nimbus posture aws-prod` returns CSPM + IaC + runtime findings ranked by exploitability × blast radius from the local index in under 15 s
- A FireHydrant incident closure via `nimbus` requires HITL with a structured before/after diff; rejection logs `hitl_status = 'rejected'`
- `nimbus incident` (security-shaped) returns a Markdown brief with attacker indicators + affected services + recent deploys in under 15 s; verified distinct from Phase 10's `nimbus incident-brief` shape via e2e test
- `nimbus supply-chain my-service` returns the SBOM diff + attestation gaps + license-policy violations in under 15 s, all from the local index
- Sigstore Rekor entries are verified before the local index records `sbom_artifact.is_signed = true` (no trust-on-first-use)
- Privacy contract: identity-event ingestion is read-only by default; the only write operations are HITL-gated `okta.user.suspend` and `doppler.secret.rotate`

### Stretch (does not gate phase completion)

- **Long-tail vendors as community extensions:** Lacework, Orca, Aqua, Anchore, Mend, FOSSA, Black Duck, Tracecat, Torq, Recorded Future, MISP
- **`nimbus security --remediate <finding-id>`** — agent proposes a fix PR for the highest-confidence findings (lockfile bump for SCA, secret rotation flow for GitGuardian); HITL-gated; experimental
- **STIX/TAXII threat-intel feed** — read-only ingestion of community threat-intel feeds into the `threat_indicator` table

## Acceptance — security-posture invariant

A security-defense Nimbus relies on must follow the **invariant triple rule** (`docs/SECURITY-INVARIANTS.md` + production wiring + enforcement test). Every write tool added in this phase obeys the existing HITL frozen-set rule (invariant `I2`); the phase introduces no new structural defenses but does add `security_finding.status` writes that go through the standard `ToolExecutor.gate()` path.

## Open Questions

- **Snyk org-level vs project-level scoping** — defer to phase implementation; spec assumes org-level read with project filtering at query time
- **Splunk SPL vs saved-search read** — start with saved-search read; raw SPL execution is too risky to ship without per-search HITL, defer to a later iteration
- **STIX/TAXII** — listed as stretch; community demand will determine if it lifts to core in a future point release

## Approval

User confirmed via brainstorming session 2026-05-10:
- Sub-themes: all four (Code & Dependency · Cloud & Container Posture · IR & SOC · Supply Chain & Identity)
- Connector breadth: comprehensive (3–4 per sub-theme)
- Built-in agents: all four (`nimbus security`, `nimbus posture`, `nimbus incident`, `nimbus supply-chain`)
- Placement: New Phase 8 (push Autonomous Agent → 10, etc.)
- Incident agent split: distinct agents with complementary data; cross-reference both ways
