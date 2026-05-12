# Roadmap Expansion — Phase 5 Agent Triad + Phase 10 Autonomous Trio (Design)

> **Status:** Draft for review
> **Author:** Asaf Golombek (with Claude assistance)
> **Date:** 2026-05-11
> **Type:** Roadmap expansion. Two genuinely-new clusters plus two delta notes on already-approved specs.

## Motivation

The brainstorm that produced this doc looked across four phase themes — Phase 5 (Extended Surface), Phase 7 (Engineering Excellence), Phase 8 (Security Engineering), and Phase 10 (The Autonomous Agent) — and asked: *what compounds with existing Nimbus primitives, and what is differentiation rather than commodity?*

After reconciling with the approved specs already in [`docs/superpowers/specs/`](.), only two of the four candidate clusters survive as genuinely new design work:

- **Cluster A — Phase 5 Agent Triad** (`signal` / `rewind` / `quote`). No overlap with the Phase 5 sequencing doc or any T-series spec.
- **Cluster D — Phase 10 Autonomous Trio** (standing approvals + reversibility window + trust ledger). Phase 10 has no design doc despite Phase 9 and Phase 14 already referring to "Phase 10's standing approvals" as if they were specified. This doc is the first-mover spec for that promised feature.

Two clusters survive only as **delta notes** on already-approved specs:

- **Cluster B — Phase 7 DORA-from-CI precursor.** The approved [Phase 7 Engineering Excellence spec](2026-05-10-phase-7-engineering-excellence-design.md) Wave 2 lands DORA via vendor connectors (LinearB / Jellyfish / Swarmia / Sleuth). The delta proposed here is a *zero-vendor* DORA precursor computed from already-indexed CI runs + GitHub deploys + incident history, shipping with Phase 7 Wave 1 (service catalog) and serving as a fallback for users who do not pay for a DORA vendor.
- **Cluster C — Phase 8 additions.** The approved [Phase 8 Security Engineering spec](2026-05-10-phase-8-security-engineering-design.md) ships four built-in agents but does *not* include `nimbus blast-radius`, `nimbus access-review`, or a sensitive-content classifier invariant. This doc proposes those three additions as a Wave 5 or as in-place augmentations to existing waves.

The two delta notes are intentionally short. They exist so that when the relevant phase reaches the head of the queue, the additions are remembered and considered — they do not require a separate full spec.

## Cluster A — Phase 5 Agent Triad

### Slot

Proposed for the **Phase 5 Extended queue** at the end-of-T6 re-planning checkpoint. The [Phase 5 sequencing spec's scope guard](2026-05-06-phase-5-sequencing-design.md#scope-guard) blocks mid-flight insertion outside the three named checkpoints (end of T3 — past; end of T6 — not yet; end of Core — not yet). Agent Triad therefore sits as a roadmap-expansion proposal until the T6 checkpoint, when the queue is unlocked for re-planning and Agent Triad can be promoted into Extended (or, if appetite is high, into Core).

**Until promotion:** this spec is the source of record for the design; the sequencing spec carries no row for Agent Triad yet. Number to be assigned at promotion time.

### Three agents

| Agent | Decomposition | Notable |
|---|---|---|
| `nimbus signal` | 4 parallel sub-agents via `AgentCoordinator`: PR queue (`github.pr.list`), thread mentions (`slack.search`, `index.search` with `@me`), calendar conflicts (`gcal.list`), release schedule (`watcher.list` for tagged windows) | The "right now" surface — pairs with `catchup` (past) and a future `prep` (specific upcoming event) to form a temporal triad |
| `nimbus rewind <date>` | 5 parallel sub-agents: commits / PRs / docs / messages / browser-history (when present) sliced by date range | Only feasible because Nimbus indexes locally; no vendor offers this |
| `nimbus quote "..."` | Single agent with hybrid BM25 + vec retrieval across `obsidian_note`, `slack_message`, `email`, `notion_doc`, `pr_review_comment` rows; ranks by recency × match strength × people-graph proximity | Stable citations linking back to source URLs; solves the universal "I know I wrote this somewhere" problem |

**`quote` long-document handling (v1 limitation).** Retrieval is row-level: a 50-page Notion doc is one row, so `quote` returns the doc + a snippet extracted on-output via BM25 highlight (the highest-scoring paragraph around the matched terms), not chunk-level precision. True chunk-level retrieval — citing the exact paragraph in a 50-page doc — requires chunk-level embedding routing (per-paragraph rows in the vec index), which T6 does **not** currently include (T6 ships `vec_items_1536` multi-model embedding, which is per-item-type, not per-chunk). Chunk-level retrieval is a follow-up primitive worth its own spec; for v1, `quote` is row-level with BM25-highlight snippets, and the brief notes "snippet from a long source — open the link to verify the exact phrasing."

All three follow the existing [`nimbus-agent-patterns`](../../../.claude/commands/nimbus-agent-patterns.md) skill: read-only, HITL-free, decomposed via `AgentCoordinator.executeAll` for parallelism, emits `agents.<name>.briefReady` notification, CLI command at `packages/cli/src/commands/<name>.ts`.

### Dependencies

- The browser-history connector (Phase 5 Extended queue, Reading wave) is required for `rewind` to feel complete. Without it, `rewind` still works but produces a partial picture (commits / PRs / messages only — missing the "what was I reading that day" half).
- No new DB migrations.
- No new IPC namespace; reuses the existing `agents.*` surface from T3.

### Privacy surface (deferred to connector specs)

`rewind`'s output sensitivity is bounded by what its source connectors index. Two privacy concerns surface naturally — both are **out of scope for this spec** and belong in the relevant connector's design:

- **Domain / category blocklist for browser-history indexing** (e.g., banking, personal email, incognito-mode windows) — belongs in the browser-history connector spec when it reaches the head of the Extended queue Reading wave.
- **Per-row redaction at retrieval time** for any source — belongs in the sensitive-content classifier work (Cluster C, `I13`); when a row is classified `secret` / `pii` / `phi`, `rewind` will exclude it from the brief by default, matching the behavior of every other agent surface.

The Agent Triad does not introduce its own filtering rules — it inherits whatever the connectors and `I13` provide.

### Acceptance criteria

- [ ] `nimbus signal` returns a Markdown brief in < 15 s on a mid-range laptop, naming at least the top-5 actionable items across all four sub-agent sources
- [ ] `nimbus rewind 2026-04-15` returns a Markdown brief covering all five sources for that day; gracefully omits browser-history when the connector is absent
- [ ] `nimbus quote "we decided to ship the migration in two phases"` finds the source row(s) with citations, ranked by people-graph proximity to the asking user
- [ ] All three emit `agents.<name>.briefReady` notification with non-empty `brief`
- [ ] Coverage: `packages/gateway/src/agents/` stays ≥ 80%
- [ ] Latency budget for each: < 15 s on a mid-range laptop with local LLM routing

### Risk

Low. Same shape as `expert` / `impact` / `catchup`. The riskiest sub-task is `quote`'s ranking quality — fall back to BM25-only if vec retrieval is unavailable.

## Cluster B — Phase 7 DORA-from-CI precursor (delta note)

This is **not a new cluster** — it is a one-paragraph note for whoever picks up [Phase 7 Wave 2](2026-05-10-phase-7-engineering-excellence-design.md).

### Delta

The approved Phase 7 Wave 2 lands DORA via four vendor connectors (LinearB / Jellyfish / Swarmia / Sleuth). Each is a paid SaaS that requires per-engineer authentication. Users who do not buy any of those tools have no DORA story from Phase 7.

**Proposal:** Add a *zero-vendor* DORA precursor as Wave 2 sub-task 0 (before any vendor connector). Compute the four DORA metrics directly from already-indexed data:

| Metric | Source already in index |
|---|---|
| Deployment frequency | `github.actions.run` rows with `event = "deployment"` or `workflow_name LIKE '%deploy%'`; GitLab CI equivalents; CircleCI |
| Lead time for changes | `pr.merged_at − pr.first_commit_at`, joined to deploy event closest after merge |
| Change failure rate | **Preferred:** Sentry release tag / GitHub deployment status → commit SHA correlation. **Fallback:** Deploy events followed by `sentry.error.spike` / `pagerduty.incident.created` within N hours, divided by total deploys. See accuracy note below. |
| Mean time to recovery | Incident `created_at → resolved_at` across PagerDuty / OpsGenie / FireHydrant (already indexed via Phase 8 Wave 3); incident–deploy attribution uses the same correlation hierarchy as change failure rate |

**Output:** `nimbus metrics dora` (already named in [T4 of the Phase 5 sequencing doc](2026-05-06-phase-5-sequencing-design.md)) computes and prints the four metrics over a configurable window. The vendor connectors that ship later in Wave 2 *complement* this by providing higher-fidelity per-engineer / per-team breakdowns, but the baseline works on day one.

**Accuracy note (release-tag preferred over time-window).** Time-window correlation between deploys and incidents has well-known false positives — a third-party outage two hours after a deploy gets attributed to the deploy. The Phase 7 implementor should prefer release-tag correlation when the data exists: Sentry releases carry commit SHAs, GitHub Deployments carry SHAs, GitLab Environments carry SHAs. Match incidents to deploys via shared SHA first, fall through to time-window only when no release tag is present. Reports surface the correlation confidence (`high` for release-tag, `low` for time-window) so the user can read DORA numbers with appropriate skepticism.

**Why this matters:** Nimbus's DNA is *local-first computation over indexed data*. Shipping vendor connectors as the only path to DORA inverts that DNA. The DORA-from-CI precursor demonstrates that Nimbus can produce the same metric a vendor charges for, from data the user already has — which is the single strongest marketing story for the whole platform.

**Status:** This is a one-paragraph carve-out for the Phase 7 implementor. No separate spec needed. If Phase 7 implementation disagrees, the agreed compromise is to land it inside the `nimbus excellence` agent in Wave 4 instead of Wave 2.

## Cluster C — Phase 8 additions (delta note)

This is **not a new cluster** — it is a list of three additions for whoever picks up [Phase 8 Security Engineering](2026-05-10-phase-8-security-engineering-design.md).

### Addition C1 — `nimbus blast-radius <secret-or-key>`

Phase 8 Wave 3 ships `nimbus incident` (security-incident-shaped brief). It does **not** ship the inverse — "I just rotated this leaked key; where else did it appear?" — which is the most common incident-response question in practice.

**Proposal:** Add `nimbus blast-radius <secret-fingerprint-or-prefix>` as a Phase 8 Wave 1 or Wave 4 addition. Six parallel sub-agents grep across:

1. CI log archives (GitHub Actions / GitLab CI / CircleCI runs in the last N days)
2. Terraform state file contents (if indexed via filesystem connector)
3. `.env`-pattern matches in code (already indexed via GitHub / GitLab connectors)
4. S3 / GCS / Azure Blob bucket paths referenced in code
5. Container image manifest layers (if Snyk Container or Trivy is connected)
6. Kubernetes Secret resources (if cluster runtime connector exists)

**Output:** every match plus what scope of access the credential has (cross-referenced with cloud IAM via existing AWS / GCP / Azure connectors). HITL on remediation; read-only on detection.

### Addition C2 — `nimbus access-review`

Phase 8 does not address quarterly access review, which is one of the highest-value annual security tasks. The data is already in the index after Phase 8 Wave 4 (identity connectors) lands.

**Proposal:** Add `nimbus access-review` as a Wave 4 agent. Cross-connector sweep:

- People with no recent commits / messages / calendar activity AND still-active SSO accounts (Okta / Azure AD / Auth0)
- Service accounts unused in 90 days
- Over-privileged roles (e.g. `admin` permission in a repo where the user has never committed)
- Shared / generic accounts with multiple authenticators

**Output:** an SOC2-shaped evidence bundle (Markdown + JSON) that can be exported to the auditor.

### Addition C3 — Sensitive-content classifier (new invariant `I13`)

Phase 8 has zero invariant additions. The most important Phase 8 invariant — that sensitive content does not leak into LLM context windows — is currently *unspecified*.

**Proposal:** Add a new structural invariant **`I13`** alongside the existing twelve (see [`docs/SECURITY-INVARIANTS.md`](../../SECURITY-INVARIANTS.md)):

> **`I13`: Rows classified as `sensitivity_class IN ('secret', 'pci', 'phi')` are excluded from `wrapToolOutput` envelopes by default; including them requires explicit per-query HITL consent.**

Implementation:

- New columns `items.sensitivity_class` (`pii` / `phi` / `pci` / `secret` / `internal` / `public`) and `items.sensitivity_source` (`classifier` / `user_override`) — the second column makes the override path durable across re-classifier passes.
- Classifier runs at sync time as a connector post-processor (regex + small-model classifier).
- Wired in [`engine/agent.ts`](../../../packages/gateway/src/engine/agent.ts) `wrapToolForLlm` — quarantined rows are excluded before envelope wrapping.
- Enforced in `security-invariants.test.ts` with a test that fails if the filter is removed.

CLI surface:

- `nimbus query --include-sensitive` — query-time per-query elevation; prompts for HITL approval.
- `nimbus security reclassify <item-id> --to <class>` — **persistent override**; HITL-gated; sets `sensitivity_source = 'user_override'`. Rows with `sensitivity_source = 'user_override'` are skipped by the auto-classifier on subsequent passes — the user's decision is authoritative.
- `nimbus security reclassify --all-rows` — **bulk re-pass over already-indexed local rows** (no source re-fetch) using the current classifier rules. Skips `sensitivity_source = 'user_override'` rows. Used when classifier rules change (new regex, new model version) — the operator runs this once after a rule update; ordinary `nimbus connector reindex <name>` is not the right tool because that re-fetches from the source. HITL-gated when the pass is expected to flip ≥1% of rows.

This is invariant-touching work and gets the standard triple (production wiring + docs entry + enforcement test) per the [`nimbus-security-invariants`](../../../.claude/commands/nimbus-security-invariants.md) skill. The `sensitivity_source` column carries the same load-bearing role as `hitlStatus` in invariant `I4` — it must only be set to `user_override` by the `nimbus security reclassify` CLI path; no other code path may write that value. Add this rule to the `I13` enforcement test.

### Status

Three additions. C3 is invariant-touching and should land in a single dedicated PR with the standard triple. C1 and C2 are normal built-in agent PRs.

## Cluster D — Phase 10 Autonomous Trio (full design)

This is the headline cluster. Phase 10 has no existing design doc, and Phase 9 / Phase 14 both already reference "Phase 10's standing approvals" as if they were specified. This section is the first-mover spec for that promised feature.

### Concept summary

| Primitive | One-line definition | Solves |
|---|---|---|
| **Standing approval** | Signed, time-limited, quota-bounded pre-authorization for a specific action + payload pattern | "I trust Nimbus to do X without asking every time, within limits" |
| **Reversibility window** | Approved reversible actions stage for N seconds; user can `undo` before dispatch | "I clicked approve too fast" |
| **Trust ledger** | User-facing view over `audit_log` filtered to autonomous decisions, with one-click revert | "What did Nimbus do while I was asleep?" |

**Crucial design constraint:** standing approvals **do not bypass `HITL_REQUIRED`**. The executor gate still checks the frozen set first; only when an action *is* HITL-required does it consult standing approvals as an alternative *automated consent path* before falling through to the live HITL consent flow. The frozen set stays frozen. The structural defense (invariants `I2` / `I3` / `I4`) is no weaker; we have added a *user-signed* way to pre-consent for matching actions.

### Data model

Three new tables plus one column addition.

```sql
-- Migration V<N>__standing_approvals.sql
CREATE TABLE standing_approvals (
  id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,             -- must be in HITL_REQUIRED at creation time
  payload_predicate_json TEXT NOT NULL,  -- e.g. {"path":{"glob":"/tmp/exports/*"},"age_days":{"gt":90}}
  max_per_day INTEGER NOT NULL,
  max_per_session INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,           -- unix ms; required, not optional
  created_at INTEGER NOT NULL,
  created_by_signature BLOB NOT NULL,    -- Ed25519 sig over canonical JSON of all above fields
  revoked_at INTEGER,
  CHECK (max_per_day > 0 AND max_per_day <= 1000),
  CHECK (max_per_session > 0 AND max_per_session <= 100),
  CHECK (expires_at > created_at)
);
CREATE INDEX idx_standing_approvals_lookup
  ON standing_approvals(action_type, revoked_at, expires_at);

-- Migration V<N+1>__staged_actions.sql
CREATE TABLE staged_actions (
  id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  approval_source TEXT NOT NULL CHECK (approval_source IN ('hitl_approved', 'standing_approval')),
  standing_approval_id TEXT,             -- nullable; FK to standing_approvals.id
  scheduled_for INTEGER NOT NULL,        -- unix ms
  created_at INTEGER NOT NULL,
  executed_at INTEGER,                   -- nullable; mutually exclusive with cancelled_at
  cancelled_at INTEGER,                  -- nullable
  cancel_reason TEXT,
  CHECK ((executed_at IS NULL) OR (cancelled_at IS NULL))
);
CREATE INDEX idx_staged_pending
  ON staged_actions(scheduled_for)
  WHERE executed_at IS NULL AND cancelled_at IS NULL;

-- Migration V<N+2>__audit_log_standing_approval_id.sql
ALTER TABLE audit_log ADD COLUMN standing_approval_id TEXT;
```

**Trust ledger is a view, not a separate table.** It is `SELECT … FROM audit_log WHERE hitl_status = 'auto_approved' OR standing_approval_id IS NOT NULL`. This avoids maintaining two tamper-evident chains (the audit log already chain-hashes per the Phase 4 WS3 tamper-evident audit work) and avoids the duplication a second table would introduce.

**Tool registry change** (not a DB change): each tool in the registry declares `reversible: boolean` and optionally `undoTool: string`. Stored in code, not in the DB.

**Predicate language — reuse the graph-predicate parser.** `payload_predicate_json` reuses the JSON syntax and AST defined in [`packages/gateway/src/automation/graph-predicate.ts`](../../../packages/gateway/src/automation/graph-predicate.ts) (`parseGraphPredicate`, the `GraphPredicate` type). Users who have already learned watcher-condition syntax (`[automation].graph_conditions = true`) write standing-approval predicates with the same shape. **What is shared:** the parser, the AST, the validation surface. **What is not shared:** the evaluator. Graph predicates evaluate over indexed items (`itemMatchesGraphPredicate`); standing approvals evaluate over action payloads (a new `payloadMatchesApprovalPredicate` function in `engine/standing-approvals.ts`). Document the shared-parser / split-evaluator split in `automation/graph-predicate.ts`'s module header so future contributors do not duplicate the parser by accident. If extending the parser for action-payload-specific operators (e.g., glob on a `path` field) is necessary, extend in `graph-predicate.ts` so both sides benefit.

### Executor gate change

In [`engine/executor.ts`](../../../packages/gateway/src/engine/executor.ts) `ToolExecutor.gate()`:

```
1. If !HITL_REQUIRED.has(action.type) → proceed (unchanged).
2. Check standing approval match (inside BEGIN IMMEDIATE — see "concurrency" below):
   a. Find non-revoked, non-expired rows for action.type.
   b. For each, verify Ed25519 signature against user's vault-stored pubkey.  [I14]
   c. Evaluate payload_predicate against action.payload.
   d. Check max_per_day and max_per_session quotas (SELECT count from audit_log
      WHERE standing_approval_id = ? AND created_at > now() - 24h).
   e. If match → set hitlStatus = 'auto_approved', INSERT the audit row with
      standing_approval_id in the SAME transaction, COMMIT.
3. If no standing approval match → existing HITL consent flow (unchanged).
4. After consent (auto or explicit):
   a. If tool.reversible → enqueue into staged_actions, return staged-action-id.
   b. Else → dispatch immediately (unchanged).
```

The signature verification in (2b) is load-bearing. **A tampered row must be rejected, not honored.** This is the wiring site for the new invariant `I14` (see below).

**Concurrency (quota correctness under simultaneous matches).** Steps 2a–2e run inside a single `BEGIN IMMEDIATE` transaction. The `IMMEDIATE` keyword acquires SQLite's writer lock at transaction start, so two simultaneous standing-approval matches against the same approval row serialize cleanly: the second match sees the first match's audit row already committed and re-evaluates the quota with the updated count. Without `IMMEDIATE`, the naive `SELECT count → check → INSERT` pattern allows two callers to both see `count = N-1`, both succeed the check, and both INSERT — exceeding the quota by one. The `BEGIN IMMEDIATE` envelope is the structural fix; document it inline in `standing-approvals.ts` with a comment naming this race condition so a future refactor doesn't accidentally drop the `IMMEDIATE` and reintroduce the bug.

### Invariant additions

Four new structural invariants. Each gets the standard triple (production wiring + docs entry in [`docs/SECURITY-INVARIANTS.md`](../../SECURITY-INVARIANTS.md) + enforcement test in `security-invariants.test.ts`) per the [`nimbus-security-invariants`](../../../.claude/commands/nimbus-security-invariants.md) skill.

| ID | Invariant | Wiring | Anti-pattern that regresses it |
|---|---|---|---|
| **I13** | Sensitive-content rows (`sensitivity_class IN ('secret', 'pci', 'phi')`) excluded from `wrapToolOutput` envelopes by default | `engine/agent.ts` `wrapToolForLlm` (Cluster C addition; declared here for cross-reference) | Bypassing the sensitivity filter "for debugging" |
| **I14** | Standing approval rows require valid Ed25519 signature; executor verifies before honoring | `engine/standing-approvals.ts` `matchStandingApproval()` | Honoring the row without calling `verifySignature()` |
| **I15** | `hitlStatus` ∈ `{requested, approved, rejected, auto_approved}`; set only by the executor's gate (extends existing `I4`) | `engine/executor.ts` `ToolExecutor.gate()` | Setting `auto_approved` anywhere except the gate |
| **I16** | Standing approvals can only target reversible action types | `engine/standing-approvals.ts` `createStandingApproval()` | Creating an approval for an irreversible action type (e.g. `slack.message.send`) |

`I16` is the most consequence-bearing of the four: it preserves the rule that **irreversible actions always require live human consent.** An attacker who somehow obtained the user's signing key cannot use a standing approval to (e.g.) send a message — they would have to forge a live consent response, which is bounded by the existing consent channel's surface.

### IPC surface

A new namespace `autonomous.*`:

| Method | Renderer-callable? | Notes |
|---|---|---|
| `autonomous.approve.create` | **NO** | RCE-class — CLI-only, or a Rust-native flow with hardware-key signing (same pattern as `extension.install` after chain C1) |
| `autonomous.approve.list` | yes | Read-only |
| `autonomous.approve.revoke` | yes | Revocation is safer than creation; renderer-OK |
| `autonomous.staged.list` | yes | Read-only |
| `autonomous.staged.undo` | yes | Cancellation is always safer than commit |
| `autonomous.ledger` | yes | Read-only view over `audit_log` |

Notifications (all renderer-broadcast OK):

- `autonomous.actionStaged { id, action_type, scheduled_for }`
- `autonomous.actionExecuted { id }`
- `autonomous.actionCancelled { id, reason }`
- `autonomous.standingApprovalMatched { approval_id, action_id }`

The Tauri [`ALLOWED_METHODS`](../../../packages/ui/src-tauri/src/gateway_bridge.rs) array grows by **5** (4 reads + 1 revoke). `autonomous.approve.create` stays off the renderer surface for the same reason `extension.install` is off it: creating a "delete files" standing approval is destructive in exactly the way the B1 audit's chain C1 flagged, and the equivalent of the `extension.install` lesson applies. The size constants in the Rust enforcement tests must be updated when the methods are added.

### CLI surface

```
nimbus autonomous approve create \
  --type filesystem.move \
  --predicate '{"path":{"glob":"/tmp/exports/*"},"age_days":{"gt":90}}' \
  --max-per-day 10 --max-per-session 3 \
  --expires 30d

nimbus autonomous approve list
nimbus autonomous approve revoke <id>

nimbus autonomous staged                   # list pending staged actions
nimbus autonomous undo <action-id> [--reason "..."]

nimbus autonomous ledger [--since 24h] [--type ...]
```

All `nimbus autonomous` commands are CLI-only by design; the Tauri UI calls the read-side IPC methods to render the ledger and one-click-revert button, but creation flows through the CLI.

### Sequencing within Cluster D

Three PRs, in order:

**PR D1 — Reversibility infrastructure** (no standing approvals yet).

- Tool registry `reversible: boolean` flag for every existing tool
- `staged_actions` table + dispatch worker (a small Bun loop in `engine/staged-actions.ts` that scans every second)
- HITL-explicit-approved reversible actions stage for the configured default window (30 s)
- `nimbus autonomous staged` + `nimbus undo` CLI commands
- **Demo acceptance:** approving a `github.pr.merge` stages for 30 s; `nimbus undo` within window prevents the merge; after window, audit shows execution

**PR D2 — Standing approvals.**

- `standing_approvals` table + Ed25519 sign/verify infrastructure (user keypair in Vault)
- Executor gate change: standing approval matcher checked before HITL consent flow
- Invariants `I14`, `I15`, `I16` wired + tested + documented in `SECURITY-INVARIANTS.md`
- New `hitlStatus = 'auto_approved'`
- `nimbus autonomous approve create / list / revoke` CLI commands
- **Demo acceptance:** the full AC list below

**PR D3 — Trust ledger + Tauri UI.**

- `audit_log.standing_approval_id` column added
- Ledger view query + `nimbus autonomous ledger` CLI
- Tauri `/autonomous` settings page (lists today's auto-approved decisions, one-click revert for in-window staged actions)
- Tauri allowlist updated with the 5 read-side IPC methods + size assertion bumped
- **Demo acceptance:** all standing-approved actions appear in ledger; one-click revert from UI calls `autonomous.staged.undo`

**Stretch (PR D4 — out of v1):** trust budget (N autonomous decisions per day; falls back to HITL when exhausted). Excluded from v1 scope because it is independently designable later.

### Acceptance criteria

| AC | Behavior |
|---|---|
| **AC1** | `nimbus autonomous approve create …` creates a signed standing approval; `list` shows it with all constraint fields and the expiry |
| **AC2** | Action matching a standing approval auto-approves; `hitlStatus = 'auto_approved'`; audit row references `standing_approval_id` |
| **AC3** | Action matching an EXPIRED approval falls through to live HITL (does NOT auto-approve) |
| **AC4** | Standing approval row with tampered/missing signature is rejected by executor — `security-invariants.test.ts` test for `I14` |
| **AC5** | Creating standing approval for an irreversible action type is rejected at API — `security-invariants.test.ts` test for `I16` |
| **AC6** | HITL-explicit-approved reversible action is staged for configured window; appears in `nimbus autonomous staged` |
| **AC7** | `nimbus undo <id>` within the staging window cancels dispatch; after window expires, dispatch executes automatically |
| **AC8** | `nimbus autonomous ledger` lists every auto-approved decision and every staged action with terminal outcome (`executed` / `cancelled`) |
| **AC9** | Revoking an approval immediately stops matching new actions; in-flight staged actions are NOT cancelled (already authorized at the time of staging) |
| **AC10** | Coverage: `packages/gateway/src/engine/standing-approvals.ts` ≥ 90%; `packages/gateway/src/engine/staged-actions.ts` ≥ 90% |
| **AC11** | Static `tool-reversibility.test.ts` walks the tool registry and asserts (a) every tool with `reversible: true` declares an `undoTool` string, (b) the named `undoTool` exists in the registry, (c) the `undoTool` itself has `reversible: false` (you cannot undo an undo), (d) the `undoTool`'s payload schema is compatible with the original tool's payload shape. The test does not verify *semantic* reversal (does undo actually reverse the side effect?) — that requires per-tool integration testing — but it catches the most common authoring mistake: shipping a tool marked `reversible: true` with no `undoTool` declared or a typo in the `undoTool` name. |

### Risks

| Risk | Mitigation |
|---|---|
| Standing approval signature scheme has a bug; tampered rows honored | Invariant `I14` test asserts signature verification is called and that an unsigned row is rejected; this test must run on every PR |
| User signing-key leak gives attacker the ability to create approvals | Key is stored in Vault, never exfiltratable per non-negotiable #3; if compromised, all approvals can be revoked en-masse via `nimbus autonomous approve revoke --all`; consider a "panic" CLI verb that revokes everything and rotates the key |
| Reversibility flag misclassifies an irreversible action as reversible | Three layers of defense: (1) AC11's static `tool-reversibility.test.ts` catches the most common authoring mistake (missing or typo'd `undoTool`); (2) misclassification is also a code review failure; (3) default to `reversible: false` when in doubt. `I16` blocks standing approvals for actions explicitly flagged irreversible, but does not prevent semantic misclassification of reversibility itself — semantic correctness ("does undo actually reverse the side effect?") still requires per-tool integration testing |
| Dispatch worker outage leaves staged actions pending | Worker restarts on gateway startup and reprocesses all pending; if scheduled time has passed by more than the configured "stale" threshold (e.g. 5 minutes), staged action is auto-cancelled with reason `worker_stale` and surfaced in the next ledger view |
| User confused by "staged" state | UI and CLI both clearly label the action as "staged, dispatches in 27 s, click here to undo"; `nimbus autonomous staged` is a documented entry point |

### Out of scope (v1)

- **Goal-based execution** ("keep inbox under 20 unread") — separate spec; needs continuous re-planning infrastructure on top of the autonomous trio
- **Trust budget** — D4 stretch only; explicitly excluded from v1
- **Calibration loop** (tracking accept/reject rates and tuning confidence thresholds) — defer; needs accept/reject telemetry first
- **Multi-user / Team standing approvals** — Phase 6 (Team) territory
- **Hardware-key-signed approvals** (allowing UI-creation of standing approvals via WebAuthn) — defer to Phase 8 hardware-key work

## Cross-cluster sequencing

```
Cluster A (Phase 5 agent triad)            ←─ ships inside Phase 5 Core or Extended; no new primitives
Cluster B (Phase 7 DORA-from-CI note)      ←─ implementor of Phase 7 Wave 2 reads this when they start
Cluster C (Phase 8 additions)              ←─ implementor of Phase 8 reads this when they start
Cluster D (Phase 10 autonomous trio)       ←─ first-mover Phase 10 design; PR D1 → D2 → D3
```

No cluster strictly depends on another. The ordering above is the natural calendar order (Phase 5 first, Phase 10 last), not a dependency graph.

## Out of scope for this document

The brainstorm covered many ideas that are not in this doc. They are listed here so future-me does not re-propose them without remembering they were considered:

- **Phase 5 agents** beyond the triad: `inbox-triage` (parked behind IMAP connector), `customer-context` (parked behind CRM connector), `pricing-watch` (parked behind finance connector). These are reasonable but each blocks on a connector that has not landed.
- **Phase 7 agents** beyond the DORA precursor: `pr-coach`, `tech-debt`, `knowledge-gap`, `dx`. Reasonable but the existing Phase 7 spec is already broad; adding more agents needs a separate proposal once Wave 4 (`nimbus excellence`) is in flight and we know whether one mega-agent or many focused agents is the right pattern.
- **Phase 8 agents** beyond the additions: `secret-scan`, `compliance <framework>`, `cve <package>`, `phishing-check`. Reasonable; the Phase 8 spec is the natural home for them when its waves are revisited.
- **Phase 10 features** beyond the trio: `incident-correlator` continuous agent, scheduled workflows v2, FinOps connectors. These belong in subsequent Phase 10 spec rounds after the trio lands.
- **New repos / spin-off products** — explicitly scoped out by the brainstorm's first question; the user chose "deepen existing phases" rather than "spin-off products."
