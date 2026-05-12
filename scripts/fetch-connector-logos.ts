#!/usr/bin/env bun
// One-shot fetcher for connector logos.
// Sources monochrome SVGs from cdn.simpleicons.org, rewrites the brand-color
// fill attribute to `currentColor` so the README hero grid can be re-tinted by
// CSS / GitHub theme.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

interface ConnectorEntry {
  // Output filename (without .svg). Matches the connector display name slug.
  name: string;
  // Simple Icons slug. Empty string means: skip the fetch (hand-authored or omitted).
  slug: string;
  // Optional override note for the provenance README.
  note?: string;
}

const ENTRIES: ConnectorEntry[] = [
  // Phase 1-2 shipped
  {
    name: "filesystem",
    slug: "",
    note: "hand-authored generic folder icon (Simple Icons has no entry)",
  },
  { name: "google-drive", slug: "googledrive" },
  { name: "gmail", slug: "gmail" },
  { name: "google-photos", slug: "googlephotos" },
  { name: "onedrive", slug: "microsoftonedrive" },
  { name: "outlook", slug: "microsoftoutlook" },
  { name: "microsoft-teams", slug: "microsoftteams" },
  { name: "github", slug: "github" },
  { name: "gitlab", slug: "gitlab" },
  { name: "bitbucket", slug: "bitbucket" },
  { name: "slack", slug: "slack" },
  { name: "linear", slug: "linear" },
  { name: "jira", slug: "jira" },
  { name: "notion", slug: "notion" },
  { name: "confluence", slug: "confluence" },
  { name: "discord", slug: "discord" },

  // Phase 3 shipped
  { name: "jenkins", slug: "jenkins" },
  { name: "github-actions", slug: "githubactions" },
  { name: "circleci", slug: "circleci" },
  { name: "gitlab-ci", slug: "gitlab", note: "same Simple Icons slug as gitlab; alias" },
  { name: "aws", slug: "amazonwebservices" },
  { name: "azure", slug: "microsoftazure" },
  { name: "gcp", slug: "googlecloud" },
  { name: "kubernetes", slug: "kubernetes" },
  { name: "terraform", slug: "terraform" },
  { name: "pulumi", slug: "pulumi" },
  {
    name: "cloudformation",
    slug: "amazonwebservices",
    note: "no dedicated Simple Icons entry; aliased to amazonwebservices",
  },
  { name: "datadog", slug: "datadog" },
  { name: "grafana", slug: "grafana" },
  { name: "sentry", slug: "sentry" },
  { name: "pagerduty", slug: "pagerduty" },
  { name: "new-relic", slug: "newrelic" },

  // Phase 5 planned
  { name: "databricks", slug: "databricks" },
  { name: "airflow", slug: "apacheairflow" },
  { name: "prefect", slug: "prefect" },
  { name: "dagster", slug: "dagster" },
  { name: "metabase", slug: "metabase" },
  { name: "superset", slug: "apachesuperset" },
  { name: "kibana", slug: "kibana" },
  { name: "elasticsearch", slug: "elasticsearch" },
  {
    name: "cloudwatch",
    slug: "amazonwebservices",
    note: "no dedicated Simple Icons entry; aliased to amazonwebservices",
  },
  {
    name: "google-cloud-logging",
    slug: "googlecloud",
    note: "no dedicated Simple Icons entry; aliased to googlecloud",
  },
  { name: "bigquery", slug: "googlebigquery" },
  {
    name: "athena",
    slug: "amazonwebservices",
    note: "no dedicated Simple Icons entry; aliased to amazonwebservices",
  },
  { name: "dbt-cloud", slug: "dbt" },
  { name: "mlflow", slug: "mlflow" },
  {
    name: "sagemaker",
    slug: "amazonwebservices",
    note: "no dedicated Simple Icons entry; aliased to amazonwebservices",
  },
  {
    name: "vertex-ai",
    slug: "googlecloud",
    note: "no dedicated Simple Icons entry; aliased to googlecloud",
  },
  {
    name: "great-expectations",
    slug: "",
    note: "no Simple Icons entry; hand-authored placeholder (square + check)",
  },
];

const OUT_DIR = join("docs", "assets", "connectors");

const FILESYSTEM_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" role="img" aria-label="Local Filesystem">
  <title>Local Filesystem</title>
  <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
</svg>
`;

const GREAT_EXPECTATIONS_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" role="img" aria-label="Great Expectations">
  <title>Great Expectations</title>
  <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm4.5 9.5l-2-2-1.4 1.4L9.5 17l8-8-1.4-1.4z"/>
</svg>
`;

// Hand-authored placeholders for connectors Simple Icons has removed under
// brand-policy enforcement. Each is a distinct geometric mark drawn with
// currentColor so the README hero grid stays theme-friendly.
function letterMark(label: string, letters: string): string {
  // Rounded square with monogram letters. Two letters keep the mark legible
  // at hero-grid sizes (~24-28 px).
  const fontSize = letters.length === 1 ? 16 : 12;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" role="img" aria-label="${label}">
  <title>${label}</title>
  <rect x="1" y="1" width="22" height="22" rx="4" ry="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="12" y="16" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="${fontSize}" font-weight="600" fill="currentColor">${letters}</text>
</svg>
`;
}

const PLACEHOLDERS: Record<string, { svg: string; note: string }> = {
  slack: {
    svg: letterMark("Slack", "Sl"),
    note: "removed from Simple Icons (brand policy); hand-authored monogram placeholder",
  },
  onedrive: {
    svg: letterMark("OneDrive", "OD"),
    note: "removed from Simple Icons (brand policy); hand-authored monogram placeholder",
  },
  outlook: {
    svg: letterMark("Outlook", "Ol"),
    note: "removed from Simple Icons (brand policy); hand-authored monogram placeholder",
  },
  "microsoft-teams": {
    svg: letterMark("Microsoft Teams", "Te"),
    note: "removed from Simple Icons (brand policy); hand-authored monogram placeholder",
  },
  aws: {
    svg: letterMark("AWS", "AW"),
    note: "removed from Simple Icons (brand policy); hand-authored monogram placeholder",
  },
  azure: {
    svg: letterMark("Azure", "Az"),
    note: "removed from Simple Icons (brand policy); hand-authored monogram placeholder",
  },
  cloudformation: {
    svg: letterMark("CloudFormation", "Cf"),
    note: "no Simple Icons entry; hand-authored monogram placeholder",
  },
  dagster: {
    svg: letterMark("Dagster", "Da"),
    note: "no Simple Icons entry; hand-authored monogram placeholder",
  },
  cloudwatch: {
    svg: letterMark("CloudWatch Logs", "Cw"),
    note: "no Simple Icons entry; hand-authored monogram placeholder",
  },
  athena: {
    svg: letterMark("Athena", "At"),
    note: "no Simple Icons entry; hand-authored monogram placeholder",
  },
  "dbt-cloud": {
    svg: letterMark("dbt Cloud", "dbt"),
    note: "removed from Simple Icons; hand-authored monogram placeholder",
  },
  sagemaker: {
    svg: letterMark("SageMaker", "Sm"),
    note: "no Simple Icons entry; hand-authored monogram placeholder",
  },
};

interface FetchOutcome {
  name: string;
  slug: string;
  status: "fetched" | "hand-authored" | "failed";
  note?: string;
}

async function fetchSlug(slug: string): Promise<string> {
  const url = `https://cdn.simpleicons.org/${slug}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const body = await res.text();
  if (!body.trim().startsWith("<svg")) {
    throw new Error(`response is not an SVG (got: ${body.slice(0, 80)})`);
  }
  return body;
}

function toMonochrome(svg: string): string {
  // Replace the brand-color fill on the root <svg> tag with currentColor so the
  // README hero grid can be tinted by GitHub light/dark theme.
  // Simple Icons SVGs use a single fill on the root <svg> element.
  return svg.replace(/<svg([^>]*)\sfill="#[0-9A-Fa-f]{3,8}"/, '<svg$1 fill="currentColor"');
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  const outcomes: FetchOutcome[] = [];

  for (const entry of ENTRIES) {
    const path = join(OUT_DIR, `${entry.name}.svg`);

    if (entry.name === "filesystem") {
      await writeFile(path, FILESYSTEM_SVG, "utf-8");
      outcomes.push({ name: entry.name, slug: "", status: "hand-authored", note: entry.note });
      console.log(`[hand]   ${entry.name}.svg`);
      continue;
    }

    if (entry.name === "great-expectations") {
      await writeFile(path, GREAT_EXPECTATIONS_SVG, "utf-8");
      outcomes.push({ name: entry.name, slug: "", status: "hand-authored", note: entry.note });
      console.log(`[hand]   ${entry.name}.svg`);
      continue;
    }

    if (entry.slug === "") {
      const placeholder = PLACEHOLDERS[entry.name];
      if (!placeholder) {
        throw new Error(`empty slug for ${entry.name} but no placeholder defined`);
      }
      await writeFile(path, placeholder.svg, "utf-8");
      outcomes.push({
        name: entry.name,
        slug: "",
        status: "hand-authored",
        note: placeholder.note,
      });
      console.log(`[hand]   ${entry.name}.svg`);
      continue;
    }

    try {
      const raw = await fetchSlug(entry.slug);
      const mono = toMonochrome(raw);
      await writeFile(path, `${mono}\n`, "utf-8");
      outcomes.push({ name: entry.name, slug: entry.slug, status: "fetched", note: entry.note });
      console.log(`[ok]     ${entry.name}.svg <- simpleicons:${entry.slug}`);
    } catch (err) {
      const placeholder = PLACEHOLDERS[entry.name];
      if (placeholder) {
        await writeFile(path, placeholder.svg, "utf-8");
        outcomes.push({
          name: entry.name,
          slug: entry.slug,
          status: "hand-authored",
          note: placeholder.note,
        });
        console.log(
          `[fallback] ${entry.name}.svg (simpleicons:${entry.slug} -> ${(err as Error).message})`,
        );
      } else {
        outcomes.push({
          name: entry.name,
          slug: entry.slug,
          status: "failed",
          note: `${entry.note ?? ""} (fetch error: ${(err as Error).message})`.trim(),
        });
        console.error(
          `[fail]   ${entry.name}.svg <- simpleicons:${entry.slug} (${(err as Error).message})`,
        );
      }
    }
  }

  // Summary
  const fetched = outcomes.filter((o) => o.status === "fetched").length;
  const hand = outcomes.filter((o) => o.status === "hand-authored").length;
  const failed = outcomes.filter((o) => o.status === "failed").length;
  console.log(
    `\nSummary: ${fetched} fetched, ${hand} hand-authored, ${failed} failed (${outcomes.length} total)`,
  );

  if (failed > 0) {
    console.error("\nFailed entries:");
    for (const o of outcomes.filter((o) => o.status === "failed")) {
      console.error(`  ${o.name} (slug=${o.slug}): ${o.note}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
