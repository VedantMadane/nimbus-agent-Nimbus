/**
 * Fixture seeder for the `payment-service` DORA scenario.
 *
 * Seeds 30 days of synthetic data into the unified `item` table:
 * - 13 deploys (8 GitHub Actions + 4 GitLab + 1 Jenkins)
 * - 22 merged PRs (8 GitHub + 4 GitLab + 7 "extra" GitHub sharing SHAs + 3 revert-labeled)
 * - 4 PagerDuty incidents (3 within the 60-min CFR window, 1 outside)
 *
 * Expected values are hand-computed and stored in `expected-metrics.json`.
 * The fixture timestamp `FIXTURE_NOW_MS` is frozen so the test is deterministic.
 */

import type { Database } from "bun:sqlite";
import type { DoraServiceConfig } from "../../../../src/metrics/dora-config.ts";

export const FIXTURE_NOW_MS = 1_715_000_000_000;
const DAY = 86_400_000;

type ItemRow = {
  id: string;
  service: string;
  type: string;
  external_id: string;
  title: string;
  modified_at: number;
  metadata: Record<string, unknown>;
  synced_at?: number;
};

function ins(db: Database, row: ItemRow): void {
  db.run(
    `INSERT INTO item (id, service, type, external_id, title, body_preview, url, canonical_url,
                       modified_at, author_id, metadata, synced_at, pinned)
     VALUES (?, ?, ?, ?, ?, '', NULL, NULL, ?, NULL, ?, ?, 0)`,
    [
      row.id,
      row.service,
      row.type,
      row.external_id,
      row.title,
      row.modified_at,
      JSON.stringify(row.metadata),
      row.synced_at ?? row.modified_at,
    ],
  );
}

export function seedPaymentServiceFixture(db: Database): { config: DoraServiceConfig } {
  // ---------------------------------------------------------------------------
  // Deploys: 13 total
  // ---------------------------------------------------------------------------
  // 8 GitHub Actions deploys, every 2 days starting at FIXTURE_NOW_MS - 5*DAY
  let t = FIXTURE_NOW_MS - 5 * DAY;
  for (let i = 0; i < 8; i++) {
    ins(db, {
      id: `github_actions:gha_deploy_${i}`,
      service: "github_actions",
      type: "ci_run",
      external_id: `gha_deploy_${i}`,
      title: "Deploy production",
      modified_at: t,
      metadata: {
        conclusion: "success",
        repo: "nimbus-agent/payments",
        headSha: `sha_gha_${i}`,
      },
    });
    t -= 2 * DAY;
  }

  // 4 GitLab deploys, every 3 days starting at FIXTURE_NOW_MS - 1*DAY
  t = FIXTURE_NOW_MS - 1 * DAY;
  for (let i = 0; i < 4; i++) {
    ins(db, {
      id: `gitlab:gl_deploy_${i}`,
      service: "gitlab",
      type: "ci_run",
      external_id: `gl_deploy_${i}`,
      title: "Deploy production",
      modified_at: t,
      metadata: {
        conclusion: "success",
        project: "nimbus-agent/payments",
        headSha: `sha_gl_${i}`,
      },
    });
    t -= 3 * DAY;
  }

  // 1 Jenkins deploy at FIXTURE_NOW_MS - 15*DAY
  ins(db, {
    id: "jenkins:jen_deploy_0",
    service: "jenkins",
    type: "ci_run",
    external_id: "jen_deploy_0",
    title: "Deploy to prod",
    modified_at: FIXTURE_NOW_MS - 15 * DAY,
    metadata: {
      conclusion: "success",
      jobName: "payment-service/deploy-prod",
      headSha: "sha_jen_0",
    },
  });

  // ---------------------------------------------------------------------------
  // Merged PRs: 22 total (3 reverts excluded from lead time)
  // ---------------------------------------------------------------------------
  // 8 GitHub PRs, each merged 1 hour (3600 s) before the matching GHA deploy.
  for (let i = 0; i < 8; i++) {
    const deployAt = FIXTURE_NOW_MS - 5 * DAY - i * 2 * DAY;
    const mergedAt = deployAt - 3600_000;
    ins(db, {
      id: `github:pr_${i}`,
      service: "github",
      type: "pr",
      external_id: `nimbus-agent/payments#${i}`,
      title: `PR ${i}`,
      modified_at: mergedAt,
      metadata: {
        repo: "nimbus-agent/payments",
        merged: true,
        merged_at: mergedAt,
        merge_commit_sha: `sha_gha_${i}`,
        labels: [],
      },
    });
  }

  // 4 GitLab PRs, each merged 2 hours (7200 s) before the matching GitLab deploy.
  for (let i = 0; i < 4; i++) {
    const deployAt = FIXTURE_NOW_MS - 1 * DAY - i * 3 * DAY;
    const mergedAt = deployAt - 7200_000;
    ins(db, {
      id: `gitlab:pr_${i}`,
      service: "gitlab",
      type: "pr",
      external_id: `nimbus-agent/payments!${i}`,
      title: `MR ${i}`,
      modified_at: mergedAt,
      metadata: {
        project: "nimbus-agent/payments",
        merged: true,
        merged_at: mergedAt,
        merge_commit_sha: `sha_gl_${i}`,
        labels: [],
      },
    });
  }

  // 7 "extra" GitHub PRs share SHAs with the first 7 GHA deploys but are merged
  // 10+ days back so each one matches the same-SHA deploy with a larger lead-time
  // delta. The calculator's find() picks the FIRST deploy with matching SHA where
  // deploy.modifiedAt >= pr.merged_at — in our insertion order, that's gha_deploy_i.
  for (let i = 0; i < 7; i++) {
    const mergedAt = FIXTURE_NOW_MS - (10 * DAY + i * 1 * DAY) - 1800_000;
    ins(db, {
      id: `github:pr_extra_${i}`,
      service: "github",
      type: "pr",
      external_id: `nimbus-agent/payments#extra${i}`,
      title: `extra PR ${i}`,
      modified_at: mergedAt,
      metadata: {
        repo: "nimbus-agent/payments",
        merged: true,
        merged_at: mergedAt,
        merge_commit_sha: `sha_gha_${i}`, // shares SHA with gha_deploy_${i}
        labels: [],
      },
    });
  }

  // 3 revert-labeled PRs sharing SHAs with the first 3 GHA deploys — excluded by label.
  for (let i = 0; i < 3; i++) {
    const mergedAt = FIXTURE_NOW_MS - (4 * DAY + i * DAY);
    ins(db, {
      id: `github:pr_revert_${i}`,
      service: "github",
      type: "pr",
      external_id: `nimbus-agent/payments#revert${i}`,
      title: `Revert ${i}`,
      modified_at: mergedAt,
      metadata: {
        repo: "nimbus-agent/payments",
        merged: true,
        merged_at: mergedAt,
        merge_commit_sha: `sha_gha_${i}`,
        labels: ["revert"],
      },
    });
  }

  // ---------------------------------------------------------------------------
  // PagerDuty incidents: 4 total (3 inside CFR window, 1 outside)
  // ---------------------------------------------------------------------------
  // 3 incidents, each opened 10 min after the first 3 GHA deploys.
  // Resolution durations: 20, 25, 30 minutes (1200, 1500, 1800 seconds).
  for (let i = 0; i < 3; i++) {
    const deployAt = FIXTURE_NOW_MS - 5 * DAY - i * 2 * DAY;
    const openedAt = deployAt + 10 * 60_000;
    const resolvedAt = openedAt + (20 + i * 5) * 60_000;
    ins(db, {
      id: `pagerduty:inc_${i}`,
      service: "pagerduty",
      type: "incident",
      external_id: `inc_${i}`,
      title: `Incident ${i}`,
      modified_at: resolvedAt,
      metadata: {
        status: "resolved",
        pagerduty_service_id: "P12ABCD",
        opened_at_ms: openedAt,
      },
    });
  }

  // 1 incident opened 90 minutes BEFORE its nearest preceding deploy — so no
  // deploy precedes it within the 60-min window, and it does NOT attribute.
  // It is still a valid resolved incident, so MTTR includes it.
  // Duration: 30 minutes (1800 s).
  const outsideOpened = FIXTURE_NOW_MS - 7 * DAY - 90 * 60_000;
  ins(db, {
    id: "pagerduty:inc_outside",
    service: "pagerduty",
    type: "incident",
    external_id: "inc_outside",
    title: "Late alert",
    modified_at: outsideOpened + 30 * 60_000,
    metadata: {
      status: "resolved",
      pagerduty_service_id: "P12ABCD",
      opened_at_ms: outsideOpened,
    },
  });

  const config: DoraServiceConfig = {
    serviceId: "payment-service",
    repos: [
      { provider: "github", providerId: "nimbus-agent/payments" },
      { provider: "gitlab", providerId: "nimbus-agent/payments" },
      { provider: "jenkins", providerId: "payment-service/deploy-prod" },
    ],
    pagerdutyServices: ["P12ABCD"],
    deployWorkflowPattern: /^[Dd]eploy/,
    incidentWindowMinutes: 60,
    excludePrLabels: ["revert"],
  };
  return { config };
}
