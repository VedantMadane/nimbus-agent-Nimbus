# Connector logo provenance

These SVGs back the connector grid in the README hero. Each is a single-color
24×24 mark that uses `fill="currentColor"` so GitHub renders it cleanly in both
light and dark themes.

## Sources

Most logos are sourced from [Simple Icons](https://simpleicons.org/), which
publishes brand SVGs under [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
For a single-file refresh, use the CDN endpoint directly:

```bash
curl -fsSL https://cdn.simpleicons.org/<slug> -o docs/assets/connectors/<connector>.svg
```

The CDN serves the icon with the brand-color `fill` baked into the root
`<svg>` element. After download, rewrite that to `currentColor` so the README
hero grid can be re-tinted by CSS or GitHub theme — e.g. with `sed -i
's/fill="#[0-9a-fA-F]\{6\}"/fill="currentColor"/' <file>` on a per-file basis.

For a programmatic bulk refresh, the [`simple-icons`](https://www.npmjs.com/package/simple-icons)
npm package is the maintainer-friendly alternative — install transiently,
read the icons by slug, and write each `.svg` with `currentColor`. We do not
ship a bulk-fetch helper script in this repo because the
`js/http-to-file-access` CodeQL rule flags any "fetch network bytes → write
to disk" pipeline as a potential trojan-horse pattern. The curl invocation
above is an explicit, auditable one-liner — adopt the npm-import path only
if you can demonstrate the downloaded bytes are validated before writing
(e.g. parsed as SVG via `@resvg/resvg-js` and rejected if parsing fails).

## Slug map

The Simple Icons slug is not always identical to the connector name. The
non-obvious mappings:

| Connector | Simple Icons slug |
|-----------|-------------------|
| `google-drive` | `googledrive` |
| `google-photos` | `googlephotos` |
| `gcp`, `google-cloud-logging`, `vertex-ai` | `googlecloud` |
| `bigquery` | `googlebigquery` |
| `gitlab-ci` | `gitlab` (same icon) |
| `github-actions` | `githubactions` |
| `airflow` | `apacheairflow` |
| `superset` | `apachesuperset` |
| `new-relic` | `newrelic` |

## Hand-authored placeholders

The following SVGs are **not** from Simple Icons and are hand-authored in this
repo. They use the same 24×24 viewBox and `currentColor` fill as the Simple
Icons entries so the grid stays visually consistent.

- `filesystem.svg` — generic folder icon for the local filesystem connector
  (Simple Icons has no entry for "local filesystem")
- `great-expectations.svg` — square-with-check mark; Simple Icons has no entry

The remaining placeholders are monogram marks (rounded square + 1-3 letters)
covering connectors whose icons have been removed from Simple Icons under
brand-policy enforcement, or that never had a dedicated entry:

- `slack.svg` — removed from Simple Icons (brand policy)
- `onedrive.svg`, `outlook.svg`, `microsoft-teams.svg` — removed from Simple
  Icons (Microsoft brand policy)
- `azure.svg` — removed from Simple Icons (Microsoft brand policy)
- `aws.svg` — removed from Simple Icons (Amazon brand policy)
- `cloudformation.svg`, `cloudwatch.svg`, `athena.svg`, `sagemaker.svg` — no
  dedicated Simple Icons entry; AWS sub-services share the parent brand mark
- `dagster.svg` — no Simple Icons entry
- `dbt-cloud.svg` — removed from Simple Icons (dbt Labs brand policy)

When upstream brand policy changes and a connector's icon becomes available
again on Simple Icons, re-fetch that specific connector with the curl
invocation above and replace the placeholder.

## Refreshing

To refresh a single logo:

```bash
curl -fsSL https://cdn.simpleicons.org/<slug> -o docs/assets/connectors/<connector>.svg
sed -i 's/fill="#[0-9a-fA-F]\{6\}"/fill="currentColor"/g' docs/assets/connectors/<connector>.svg
bun run audit:svg-assets
```

The audit step verifies every SVG has non-zero rendered dimensions using
[`@resvg/resvg-js`](https://www.npmjs.com/package/@resvg/resvg-js).
