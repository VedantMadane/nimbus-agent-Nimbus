/**
 * DORA service-config types + URN helpers.
 *
 * `[metrics.dora.<service-id>]` in nimbus.toml maps an abstract service id
 * to: a list of repo URNs (multi-provider), PagerDuty service ids, a deploy
 * workflow name regex, and behaviour overrides.
 *
 * Provider URN format: `<provider>:<provider-specific-id>`. The provider
 * prefix is used to compute the `service` column filter on the unified
 * `item` table (verified 2026-05-10 against the four CI connectors).
 */

export type DoraProvider = "github" | "gitlab" | "bitbucket" | "jenkins" | "circleci";

export type ParsedDoraRepoUrn = {
  readonly provider: DoraProvider;
  readonly providerId: string;
};

export type DoraServiceConfig = {
  /** Stable service id from the table key. */
  readonly serviceId: string;
  readonly repos: readonly ParsedDoraRepoUrn[];
  readonly pagerdutyServices: readonly string[];
  readonly deployWorkflowPattern: RegExp;
  readonly incidentWindowMinutes: number;
  readonly excludePrLabels: readonly string[];
};

export const DEFAULT_DEPLOY_WORKFLOW_PATTERN = "^[Dd]eploy";
export const DEFAULT_INCIDENT_WINDOW_MINUTES = 60;
export const DEFAULT_EXCLUDE_PR_LABELS: readonly string[] = ["revert"];

const KNOWN_PROVIDERS: readonly DoraProvider[] = [
  "github",
  "gitlab",
  "bitbucket",
  "jenkins",
  "circleci",
];

export function parseDoraRepoUrn(raw: string): ParsedDoraRepoUrn {
  const colon = raw.indexOf(":");
  if (colon <= 0) {
    throw new Error(`invalid URN '${raw}': missing 'provider:id' separator`);
  }
  const provider = raw.slice(0, colon);
  const providerId = raw.slice(colon + 1);
  if (!(KNOWN_PROVIDERS as readonly string[]).includes(provider)) {
    throw new Error(
      `unknown provider '${provider}' in URN '${raw}'. Known: ${KNOWN_PROVIDERS.join(", ")}`,
    );
  }
  if (providerId.length === 0) {
    throw new Error(`invalid URN '${raw}': empty provider-specific id`);
  }
  return { provider: provider as DoraProvider, providerId };
}

/**
 * Maps a provider URN prefix to the `service` column values it covers
 * on the indexed `item` table. Asymmetric for GitHub: PRs live under
 * `github`, CI runs under `github_actions`.
 */
export function providerServiceColumns(provider: DoraProvider): {
  prServices: readonly string[];
  ciServices: readonly string[];
} {
  switch (provider) {
    case "github":
      return { prServices: ["github"], ciServices: ["github_actions"] };
    case "gitlab":
      return { prServices: ["gitlab"], ciServices: ["gitlab"] };
    case "bitbucket":
      return { prServices: ["bitbucket"], ciServices: ["bitbucket"] };
    case "jenkins":
      return { prServices: [], ciServices: ["jenkins"] };
    case "circleci":
      return { prServices: [], ciServices: ["circleci"] };
  }
}
