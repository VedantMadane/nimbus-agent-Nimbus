# `docs/assets/` — README asset regeneration

Every artifact here is a committed render — CI verifies the OG card stays in sync ([`.github/workflows/docs-quality.yml`](../../.github/workflows/docs-quality.yml) `og-card-render` job), and the hero cast SVGs are checked in alongside their source recording. Nothing here is regenerated on every build.

## Hero cast (`hero-cast-{light,dark}.svg`)

Rendered from [`../demos/incident-response.cast`](../demos/incident-response.cast) (an [asciinema](https://asciinema.org/) recording) into two animated standalone SVGs. The README embeds them via `<picture>` with `prefers-color-scheme` to switch between solarized-light and solarized-dark palettes.

### Rerendering

We use [`termsvg`](https://github.com/MrMarble/termsvg) — a Go CLI that reads asciinema's `.cast` format and emits a standalone animated SVG. It replaces the unmaintained `svg-term-cli` we used during initial authoring (its transitive tree pulled in 11 unlicensed packages + 6 HIGH/CRITICAL CVEs).

Install once:

```bash
go install github.com/mrmarble/termsvg/cmd/termsvg@latest
```

Then regenerate both SVGs:

```bash
# Light palette
termsvg export \
  --theme solarized-light \
  --output docs/assets/hero-cast-light.svg \
  docs/demos/incident-response.cast

# Dark palette
termsvg export \
  --theme solarized-dark \
  --output docs/assets/hero-cast-dark.svg \
  docs/demos/incident-response.cast
```

Verify the result by opening each SVG in a browser — it should play automatically. Width should land in the 600–800 pixel range. Each file ≤ 200 KiB. Commit both.

### Licensing note

`termsvg` is GPL-3.0. It is a **build-time CLI tool** — not bundled, not redistributed, and the SVG output is data, not derivative work of the renderer (no GPL'd code from termsvg is copied into the output). The dual-license model documented in [`../license-policy.md`](../license-policy.md) governs npm/Bun dependencies in `node_modules/`; a Go binary on a maintainer's `$PATH` is outside that scope, the same way `git`, `bun`, or `bash` are.

## OG card (`og-card.svg` → `../og-card.png`)

Source SVG is hand-authored (1200×630, JetBrains Mono). The PNG is rendered deterministically by [`scripts/render-og-card.ts`](../../scripts/render-og-card.ts) using `@resvg/resvg-js` with `loadSystemFonts: false`, so the output is byte-identical across machines.

Regenerate after editing `og-card.svg`:

```bash
bun run render:og-card
```

The `og-card-render` CI job runs the same command and fails if the committed PNG drifts.

## Fonts (`fonts/`)

[JetBrains Mono](https://www.jetbrains.com/lp/mono/) v2.304 (Regular + Bold), [SIL OFL 1.1](./fonts/LICENSE-OFL-1.1.txt). Used only by the OG card renderer.

## Wordmarks (`nimbus-wordmark-{light,dark}.svg`) and architecture diagrams (`architecture-{light,dark}.svg`)

Hand-authored SVGs — no renderer, no regeneration step. Edit in place.

## Connector logos (`connectors/`)

Trimmed/normalised brand SVGs. See [`connectors/README.md`](./connectors/README.md) for source attribution.
