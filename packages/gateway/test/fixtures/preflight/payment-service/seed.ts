import type { Database } from "bun:sqlite";
import type { ServiceConfig } from "../../../../src/metrics/dora-config.ts";

export const PREFLIGHT_FIXTURE_NOW_MS = 1_715_000_000_000;
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function ins(
  db: Database,
  row: {
    id: string;
    service: string;
    type: string;
    external_id: string;
    title: string;
    url: string | null;
    modified_at: number;
    metadata: Record<string, unknown>;
  },
) {
  db.run(
    `INSERT INTO item (id, service, type, external_id, title, body_preview, url, canonical_url,
                       modified_at, author_id, metadata, synced_at, pinned)
     VALUES (?, ?, ?, ?, ?, '', ?, NULL, ?, NULL, ?, ?, 0)`,
    [
      row.id,
      row.service,
      row.type,
      row.external_id,
      row.title,
      row.url,
      row.modified_at,
      JSON.stringify(row.metadata),
      row.modified_at,
    ],
  );
}

/**
 * Seeds a deterministic preflight fixture for the "payment-service" config:
 *   - 2 PagerDuty incidents (1 triggered P1, 1 resolved P1)  → 1 active P1
 *   - 4 GitHub Actions CI runs (2 on main: 1 success, 1 failure; 2 on
 *     feature-x: both failures)                              → 1 failing CI on main
 *   - 3 GitHub PRs on main repo (1 dirty open, 1 clean open,
 *     1 open with null mergeable_state)                      → 1 conflict + gap
 *
 * Returns the matching `ServiceConfig` for the fixture window.
 */
export function seedPaymentServicePreflightFixture(db: Database): { config: ServiceConfig } {
  const now = PREFLIGHT_FIXTURE_NOW_MS;

  // ---- Incidents ----
  ins(db, {
    id: "pagerduty:inc_active",
    service: "pagerduty",
    type: "incident",
    external_id: "inc_active",
    title: "DB connection pool exhausted",
    url: "https://nimbus-agent.pagerduty.com/incidents/inc_active",
    modified_at: now - 10 * MIN,
    metadata: {
      status: "triggered",
      severity: "P1",
      pagerduty_service_id: "P12ABCD",
      opened_at_ms: now - 10 * MIN,
    },
  });
  ins(db, {
    id: "pagerduty:inc_resolved",
    service: "pagerduty",
    type: "incident",
    external_id: "inc_resolved",
    title: "Old P1 (resolved)",
    url: null,
    modified_at: now - 2 * DAY,
    metadata: {
      status: "resolved",
      severity: "P1",
      pagerduty_service_id: "P12ABCD",
      opened_at_ms: now - 2 * DAY - 30 * MIN,
    },
  });

  // ---- CI runs ----
  ins(db, {
    id: "github_actions:ci_main_pass",
    service: "github_actions",
    type: "ci_run",
    external_id: "ci_main_pass",
    title: "CI lint",
    url: "https://github.com/nimbus-agent/payments/actions/runs/1",
    modified_at: now - 30 * MIN,
    metadata: {
      conclusion: "success",
      branch: "main",
      headSha: "sha_main_1",
      workflow_name: "CI lint",
    },
  });
  ins(db, {
    id: "github_actions:ci_main_fail",
    service: "github_actions",
    type: "ci_run",
    external_id: "ci_main_fail",
    title: "Build and Test",
    url: "https://github.com/nimbus-agent/payments/actions/runs/2",
    modified_at: now - 20 * MIN,
    metadata: {
      conclusion: "failure",
      branch: "main",
      headSha: "sha_main_2",
      workflow_name: "Build and Test",
    },
  });
  ins(db, {
    id: "github_actions:ci_feature_fail_1",
    service: "github_actions",
    type: "ci_run",
    external_id: "ci_feature_fail_1",
    title: "Build and Test",
    url: null,
    modified_at: now - 1 * HOUR,
    metadata: {
      conclusion: "failure",
      branch: "feature-x",
      headSha: "sha_feature_1",
      workflow_name: "Build and Test",
    },
  });
  ins(db, {
    id: "github_actions:ci_feature_fail_2",
    service: "github_actions",
    type: "ci_run",
    external_id: "ci_feature_fail_2",
    title: "Lint",
    url: null,
    modified_at: now - 2 * HOUR,
    metadata: {
      conclusion: "failure",
      branch: "feature-x",
      headSha: "sha_feature_2",
      workflow_name: "Lint",
    },
  });

  // ---- PRs ----
  ins(db, {
    id: "github:pr_dirty",
    service: "github",
    type: "pr",
    external_id: "nimbus-agent/payments#100",
    title: "Refactor billing retry",
    url: "https://github.com/nimbus-agent/payments/pull/100",
    modified_at: now - 1 * HOUR,
    metadata: {
      number: 100,
      state: "open",
      repo: "nimbus-agent/payments",
      mergeable_state: "dirty",
      mergeable: false,
      labels: [],
    },
  });
  ins(db, {
    id: "github:pr_clean",
    service: "github",
    type: "pr",
    external_id: "nimbus-agent/payments#101",
    title: "Add metric",
    url: "https://github.com/nimbus-agent/payments/pull/101",
    modified_at: now - 30 * MIN,
    metadata: {
      number: 101,
      state: "open",
      repo: "nimbus-agent/payments",
      mergeable_state: "clean",
      mergeable: true,
      labels: [],
    },
  });
  ins(db, {
    id: "github:pr_unknown",
    service: "github",
    type: "pr",
    external_id: "nimbus-agent/payments#102",
    title: "WIP big refactor",
    url: null,
    modified_at: now - 6 * HOUR,
    metadata: {
      number: 102,
      state: "open",
      repo: "nimbus-agent/payments",
      mergeable_state: null,
      labels: [],
    },
  });

  const config: ServiceConfig = {
    serviceId: "payment-service",
    repos: [{ provider: "github", providerId: "nimbus-agent/payments" }],
    pagerdutyServices: ["P12ABCD"],
    deployWorkflowPattern: /^[Dd]eploy/,
    incidentWindowMinutes: 60,
    excludePrLabels: ["revert"],
  };
  return { config };
}
