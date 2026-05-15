# `docs/assets/` — README asset regeneration

Every artifact here is a committed render — CI verifies the OG card stays in sync ([`.github/workflows/docs-quality.yml`](../../.github/workflows/docs-quality.yml) `og-card-render` job), and the hero cast SVGs are checked in alongside their source recording. Nothing here is regenerated on every build.

## Hero cast (`hero-cast-{light,dark}.svg`)

Rendered from [`../demos/incident-response.cast`](../demos/incident-response.cast) (an [asciinema](https://asciinema.org/) recording) into two animated standalone SVGs. The README embeds them via `<picture>` with `prefers-color-scheme` to switch between solarized-light and solarized-dark palettes.

### Rerendering

Run [`scripts/render-hero-cast.ts`](../../scripts/render-hero-cast.ts):

```bash
bun run render:hero-cast
```

This reads the canonical `.cast` (does NOT modify it), re-maps the four event timestamps to a watchable schedule with multi-second reading dwells between text blocks (the captured cast has only ~232 ms between events because it's recorded from a fake-gateway test run — no reading pauses), pipes the stretched cast through `termsvg`, and writes both the light + dark SVGs.

#### Prerequisite — install `termsvg`

We use [`termsvg`](https://github.com/MrMarble/termsvg) — a Go CLI that reads asciinema's `.cast` format and emits a standalone animated SVG. It replaces the unmaintained `svg-term-cli` we used during initial authoring (its transitive tree pulled in 11 unlicensed packages + 6 HIGH/CRITICAL CVEs).

Option 1 — release binary (recommended on Windows):

1. Download `termsvg-<version>-<os>-<arch>.zip` from [the releases page](https://github.com/MrMarble/termsvg/releases/latest).
2. Verify against `termsvg-<version>-checksums.txt` (also on the release page).
3. Extract and put `termsvg` (or `termsvg.exe`) on your `$PATH`.

Option 2 — Go install (requires Go on `$PATH`):

```bash
go install github.com/mrmarble/termsvg/cmd/termsvg@latest
```

#### Tuning the dwell schedule

The per-event schedule (in seconds) lives in `SCHEDULE_SECONDS` at the top of [`scripts/render-hero-cast.ts`](../../scripts/render-hero-cast.ts). If you add or remove a cast event in `../demos/incident-response.cast`, update the schedule array length to match — the script fails fast if they disagree. Total animation length = last schedule entry + `TRAILING_PAD_SECONDS`.

Sanity check the result by opening each SVG in a browser — it should play automatically, loop infinitely, and each text block should be readable. Each file should land in the 10–30 KiB range; significantly smaller means the cast didn't render properly.

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
