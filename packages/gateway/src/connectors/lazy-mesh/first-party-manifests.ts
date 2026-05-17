/**
 * Static manifest registry for first-party connectors spawned by
 * `lazy-mesh/` (T2 PR 1 §6).
 *
 * **Why this file exists (and why it is hard-coded for PR 1):**
 *
 * The T2 sequencing spec calls for each first-party connector to ship its
 * own `nimbus.extension.json` declaring `permissions.network` and
 * `permissions.filesystem`. That mechanical migration is a Task 14
 * deliverable. PR 1 needs the I15 wiring (every lazy-mesh ServerSpec
 * sandboxed) to land BEFORE the manifests exist on disk, otherwise we
 * either ship I15 with the wiring inert (defeats the invariant), or block
 * the sandbox PR on the 30-file manifest sweep (defeats the sequencing).
 *
 * Resolution: this file is the single source of truth for first-party
 * connector permissions until Task 14 replaces it with disk loading. Each
 * row mirrors what the connector would declare in its
 * `nimbus.extension.json` once Task 14 lands. Hosts are conservative —
 * when in doubt, we leave a row default-deny rather than over-grant.
 *
 * **Hostname conventions:**
 *
 * - Empty `network: []` ⇒ the connector has zero network reach (Linux
 *   `--unshare-net`, macOS sandbox-exec policy denies all network,
 *   Windows AppContainer with no `internetClient` cap).
 * - Each listed host is matched as an RFC 1123 hostname — no wildcards
 *   in object form per `permissions-validator.ts`.
 * - For services whose hostnames are user-configurable (self-hosted
 *   GitLab, Jira, Confluence, Bitbucket Server, Jenkins, Sentry,
 *   Grafana, Kubernetes API server), the row lists the SaaS default and
 *   leaves the user-host augmentation to Task 14 (the configured host
 *   will be read from vault / TOML and merged into the in-memory manifest
 *   at spawn time).
 *
 * **Filesystem permissions:**
 *
 * - Empty `filesystem.read` / `filesystem.write` ⇒ the connector sees only
 *   its cwd + a scoped temp dir (always-on per sandbox runner).
 * - The Obsidian connector needs read access to user vault paths; those
 *   are supplied at runtime via `[[filesystem.roots]]` and threaded into
 *   the manifest at spawn time (NOT baked into the registry here).
 * - The `filesystem` connector (built-in MCP-filesystem) gets read access
 *   to `paths.dataDir` — also threaded at spawn time, not baked here.
 *
 * The exhaustive Task 14 manifest sweep will replace this file's data.
 */
import type { ExtensionManifest } from "../../extensions/manifest.ts";

const DEFAULT_DENY: ExtensionManifest["permissions"] = {
  network: [],
  filesystem: { read: [], write: [] },
};

function baseManifest(
  id: string,
  permissions: ExtensionManifest["permissions"],
): ExtensionManifest {
  return {
    id,
    version: "1.0.0",
    permissions,
  };
}

/**
 * Map of `serviceId` (the lazy-mesh `servers` key — `github`, `slack`,
 * `aws`, etc.) → resolved manifest. The keys MUST match the strings used
 * as `servers` keys in `lazy-mesh/` so `manifestForFirstParty(serviceId)`
 * returns the right row.
 *
 * Hostnames are conservative SaaS defaults. Self-hosted instances are
 * not yet covered — Task 14 will read configured hosts from vault/TOML
 * and extend the network list at spawn time.
 */
export const FIRST_PARTY_MANIFESTS: Record<string, ExtensionManifest> = {
  // Built-in MCP-filesystem child (eager). Reads under `paths.dataDir`
  // are threaded at spawn time (the dataDir is not stable across users).
  filesystem: baseManifest("com.nimbus.filesystem", DEFAULT_DENY),

  // --- Source-control + code review ---
  github: baseManifest("com.nimbus.github", {
    network: ["api.github.com", "uploads.github.com", "raw.githubusercontent.com"],
    filesystem: { read: [], write: [] },
  }),
  github_actions: baseManifest("com.nimbus.github-actions", {
    network: ["api.github.com"],
    filesystem: { read: [], write: [] },
  }),
  gitlab: baseManifest("com.nimbus.gitlab", {
    network: ["gitlab.com"],
    filesystem: { read: [], write: [] },
  }),
  bitbucket: baseManifest("com.nimbus.bitbucket", {
    network: ["api.bitbucket.org", "bitbucket.org"],
    filesystem: { read: [], write: [] },
  }),

  // --- Chat / collaboration ---
  slack: baseManifest("com.nimbus.slack", {
    network: ["slack.com", "api.slack.com", "wss-primary.slack.com", "wss-backup.slack.com"],
    filesystem: { read: [], write: [] },
  }),
  discord: baseManifest("com.nimbus.discord", {
    network: ["discord.com", "gateway.discord.gg", "cdn.discordapp.com"],
    filesystem: { read: [], write: [] },
  }),

  // --- Issue tracking + docs ---
  linear: baseManifest("com.nimbus.linear", {
    network: ["api.linear.app"],
    filesystem: { read: [], write: [] },
  }),
  jira: baseManifest("com.nimbus.jira", {
    // SaaS default; self-hosted Jira hosts will be added by Task 14
    // via the `jira.base_url` vault entry. PR 1 ships SaaS only.
    network: ["api.atlassian.com"],
    filesystem: { read: [], write: [] },
  }),
  notion: baseManifest("com.nimbus.notion", {
    network: ["api.notion.com"],
    filesystem: { read: [], write: [] },
  }),
  confluence: baseManifest("com.nimbus.confluence", {
    // Same SaaS-only caveat as Jira.
    network: ["api.atlassian.com"],
    filesystem: { read: [], write: [] },
  }),

  // --- Google bundle (Drive / Gmail / Photos) ---
  google_drive: baseManifest("com.nimbus.google-drive", {
    network: ["www.googleapis.com", "oauth2.googleapis.com", "accounts.google.com"],
    filesystem: { read: [], write: [] },
  }),
  gmail: baseManifest("com.nimbus.gmail", {
    network: ["www.googleapis.com", "gmail.googleapis.com", "oauth2.googleapis.com"],
    filesystem: { read: [], write: [] },
  }),
  google_photos: baseManifest("com.nimbus.google-photos", {
    network: ["www.googleapis.com", "photoslibrary.googleapis.com", "oauth2.googleapis.com"],
    filesystem: { read: [], write: [] },
  }),

  // --- Microsoft bundle (OneDrive / Outlook / Teams) ---
  onedrive: baseManifest("com.nimbus.onedrive", {
    network: ["graph.microsoft.com", "login.microsoftonline.com"],
    filesystem: { read: [], write: [] },
  }),
  outlook: baseManifest("com.nimbus.outlook", {
    network: ["graph.microsoft.com", "login.microsoftonline.com"],
    filesystem: { read: [], write: [] },
  }),
  teams: baseManifest("com.nimbus.teams", {
    network: ["graph.microsoft.com", "login.microsoftonline.com"],
    filesystem: { read: [], write: [] },
  }),

  // --- CI / CD / incident management ---
  jenkins: baseManifest("com.nimbus.jenkins", {
    // Jenkins is always self-hosted; the base URL comes from vault
    // (`jenkins.base_url`). PR 1 leaves the SaaS row default-deny
    // here; Task 14 reads the configured host and extends.
    network: [],
    filesystem: { read: [], write: [] },
  }),
  circleci: baseManifest("com.nimbus.circleci", {
    network: ["circleci.com", "api.circleci.com"],
    filesystem: { read: [], write: [] },
  }),
  pagerduty: baseManifest("com.nimbus.pagerduty", {
    network: ["api.pagerduty.com", "events.pagerduty.com"],
    filesystem: { read: [], write: [] },
  }),

  // --- Cloud platforms (Phase 3 bundle) ---
  // AWS / Azure / GCP hostname surfaces are huge (regional service
  // endpoints, S3 bucket-specific hostnames, etc.). PR 1 leaves these
  // default-deny — Task 14 will populate the full regional matrix, OR
  // the implementation will switch them to an IP-range allow-list rule
  // built into the helper. Default-deny means the connector loses
  // network until Task 14, which is safer than a wrong over-broad list.
  aws: baseManifest("com.nimbus.aws", DEFAULT_DENY),
  azure: baseManifest("com.nimbus.azure", DEFAULT_DENY),
  gcp: baseManifest("com.nimbus.gcp", DEFAULT_DENY),
  // IaC connector spawns terraform / pulumi as subprocesses; their
  // network needs are also out-of-scope for PR 1's default-deny.
  iac: baseManifest("com.nimbus.iac", DEFAULT_DENY),

  // --- Observability ---
  grafana: baseManifest("com.nimbus.grafana", DEFAULT_DENY),
  sentry: baseManifest("com.nimbus.sentry", {
    network: ["sentry.io"],
    filesystem: { read: [], write: [] },
  }),
  newrelic: baseManifest("com.nimbus.newrelic", {
    network: ["api.newrelic.com", "api.eu.newrelic.com"],
    filesystem: { read: [], write: [] },
  }),
  datadog: baseManifest("com.nimbus.datadog", {
    // Datadog has regional endpoints (us1/us3/us5/eu1/...) selected via
    // DD_SITE env. The default is us1 (`datadoghq.com`). Task 14 will
    // read the configured site and select the matching host.
    network: ["api.datadoghq.com"],
    filesystem: { read: [], write: [] },
  }),

  // --- Cluster management ---
  kubernetes: baseManifest("com.nimbus.kubernetes", {
    // Kubernetes API hosts are user-configured (kubeconfig); leaving
    // default-deny here for PR 1. Task 14 will read the host from
    // kubeconfig and extend the network list.
    network: [],
    filesystem: { read: [], write: [] },
  }),

  // --- Local-only ---
  obsidian: baseManifest("com.nimbus.obsidian", {
    // No network. Vault paths are filesystem-only and supplied at spawn
    // time via `[[filesystem.roots]]`, threaded into the manifest by
    // `wrap-server-spec.ts` callers.
    network: [],
    filesystem: { read: [], write: [] },
  }),
};

/**
 * Return the manifest for a first-party connector by service id. Unknown
 * service ids fall back to default-deny under `com.nimbus.<serviceId>`
 * — this ensures the I15 wiring never crashes the gateway if a new
 * lazy-mesh service id is added before its row exists here.
 */
export function manifestForFirstParty(serviceId: string): ExtensionManifest {
  const known = FIRST_PARTY_MANIFESTS[serviceId];
  if (known !== undefined) return known;
  return baseManifest(`com.nimbus.${serviceId}`, DEFAULT_DENY);
}
