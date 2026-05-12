# Example sessions

Real `nimbus` queries from on-call, security, platform, and data-engineering work. The hero cast in the [README](./README.md) covers incident response; this page collects everything else.

## Release readiness

```bash
# Release readiness — cross-service without tab-switching
nimbus ask "Which of my open PRs have failing CI and are blocking the release branch?"
```

## SecDevOps — CVE exposure

```bash
# SecDevOps — correlate security signals with your codebase
nimbus ask "Which repos have critical Dependabot alerts with open PRs touching the affected packages?"
```

**Example session:**

```text
$ nimbus ask "Critical CVE dropped for lodash — what's our exposure?"

Scanning local index: 47 repos indexed, 12 have lodash as a direct dependency
Active PRs touching lodash: 3 open PRs across payment-service, auth-gateway, api-proxy
Sentry: 2 production errors last 24h in lodash code paths (payment-service)
Jira: No active tickets for this CVE yet

Suggested next step: Create Jira tickets for affected repos?
CONSENT REQUIRED — Create 3 Jira tickets and assign to component owners.
   Proceed? [y/n]: y  Created PLAT-1847, PLAT-1848, PLAT-1849.
```

## Infrastructure — Terraform drift

```bash
# Infrastructure — query state across providers
nimbus ask "What Terraform drift has been detected since last week's deployment?"
```

## Data lineage

```bash
# Data lineage — answered from the local index, no warehouse query
nimbus ask "The Q1 revenue dashboard shows zeroes — which upstream model broke?"
```

**Example session:**

```text
$ nimbus ask "The Q1 revenue dashboard shows zeroes — which upstream model broke?"

Tableau: dashboard "Q1 Revenue" — last refresh failed 12 minutes ago
Upstream Looker view: revenue_daily → dbt model revenue_daily_agg
dbt Cloud: revenue_daily_agg — last run failed 14 minutes ago
Airflow: DAG daily_revenue_etl — task load_fact_orders failed with SQL error
GitHub PR #842 "Rename order_amount → gross_amount" — merged by @priya 28 minutes ago
   No downstream dbt model updated to match the rename.

Suggested next step: Revert PR #842 and rerun the DAG?
CONSENT REQUIRED — Revert PR #842 and trigger Airflow DAG rerun.
   Proceed? [y/n]: n  Aborted. No changes made.
```

## Expert routing

```bash
# Expert routing — find who has the most context on a topic
nimbus ask "who has the most context on the payment retry logic?"
```

## Blast radius

```bash
# Blast radius — answered from the relationship graph before you push
nimbus ask "what services depend on src/billing/retry.ts, and which dashboards or pipelines would feel a change to it?"
```

## Consent-gated automation

```bash
# Consent-gated automation — full plan preview before anything executes
nimbus run ./incident-response.yml
```

```yaml
# weekly-cleanup.yml
name: weekly-cleanup
steps:
  - Find all PDF files in Google Drive not opened in 90 days
  - Summarize them by project folder
  - Move the ones from the Zurich project to /Archive/2025
  - Send me an email with the summary
```

Before executing, Nimbus shows a full plan preview identifying every step that will require consent:

```text
Script: weekly-cleanup (4 steps)

  Step 1  Find PDFs not opened in 90 days       READ — no approval needed
  Step 2  Summarize by project folder            READ — no approval needed
  Step 3  Move 12 files to /Archive/2025         REQUIRES APPROVAL
  Step 4  Send summary email                     REQUIRES APPROVAL

Proceed? [y/n]:
```
