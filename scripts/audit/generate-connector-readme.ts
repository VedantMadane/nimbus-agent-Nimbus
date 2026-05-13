import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const SLUGS = [
  "aws",
  "azure",
  "bitbucket",
  "circleci",
  "confluence",
  "datadog",
  "discord",
  "gcp",
  "github",
  "github-actions",
  "gitlab",
  "gmail",
  "google-drive",
  "google-photos",
  "grafana",
  "iac",
  "jenkins",
  "jira",
  "kubernetes",
  "linear",
  "newrelic",
  "notion",
  "obsidian",
  "onedrive",
  "outlook",
  "pagerduty",
  "sentry",
  "slack",
  "teams",
];

function toDisplayName(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function main() {
  const rootDir = process.cwd();

  for (const slug of SLUGS) {
    const dirPath = join(rootDir, "packages", "mcp-connectors", slug);
    if (!existsSync(dirPath)) continue;

    const displayName = toDisplayName(slug);
    const description = `Nimbus MCP connector for ${displayName}. Indexes and provides context from ${displayName} to the Nimbus agent.`;

    const docPathMdx = join(
      rootDir,
      "packages",
      "docs",
      "src",
      "content",
      "docs",
      "connectors",
      `${slug}.mdx`,
    );
    const docPathMd = join(
      rootDir,
      "packages",
      "docs",
      "src",
      "content",
      "docs",
      "connectors",
      `${slug}.md`,
    );

    let seeAlsoUrl = "https://nimbus-agent.dev/user-guide/connectors/";
    if (existsSync(docPathMdx) || existsSync(docPathMd)) {
      seeAlsoUrl = `https://nimbus-agent.dev/user-guide/connectors/${slug}/`;
    }

    const readmeContent = `# ${displayName} Connector

## What this is

${description}

## Install

Bundled with Nimbus — no separate install required.

## Quickstart

\`\`\`bash
nimbus connector auth ${slug}
nimbus ask "Summarize my recent activity in ${displayName}"
\`\`\`

## See also

- [${displayName} Connector Documentation](${seeAlsoUrl})
- [Nimbus Architecture Overview](https://nimbus-agent.dev/architecture-overview/)
- [HITL and Safety](https://nimbus-agent.dev/user-guide/hitl-and-safety/)

## License

AGPL-3.0
`;

    await writeFile(join(dirPath, "README.md"), readmeContent, "utf-8");
    console.log(`Generated README for ${slug}`);
  }
}

main().catch(console.error);
