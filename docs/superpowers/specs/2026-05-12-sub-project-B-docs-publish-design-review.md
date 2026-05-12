# Review: Sub-project B — Docs Site Publish Design

The design for Sub-project B is well thought out, breaking down a complex set of documentation and CI tasks into a logical, 5-PR sequence. The isolation of the critical path (PR 1) from the bulk of the content work is a great strategy.

Here are a few open questions, suggestions, and improvements:

## 1. Starlight Hero Image Light/Dark Mode (PR 5)
**Observation:** In Section 5.6, the risk table mentions that Starlight's `hero.image.file` might not support light/dark variants, suggesting a hand-rolled `<picture>` fallback.
**Improvement:** Starlight actually supports light and dark image variants natively in its frontmatter. You can update the planned `index.mdx` frontmatter to use this, avoiding the need for a custom MDX `<picture>` implementation:
```yaml
hero:
  image:
    light: ../../assets/architecture-light.svg
    dark: ../../assets/architecture-dark.svg
    alt: 30 connectors → local SQLite index → engine + HITL → CLI · UI · voice
```

## 2. Preventing Asset Duplication Debt (PR 5)
**Observation:** The spec acknowledges that copying the SVG assets from `docs/assets/` to `packages/docs/src/assets/` introduces duplication and drift, marking it as an acceptable debt to be fixed later.
**Suggestion:** Since Nimbus already uses Bun and Node scripts extensively, you can easily avoid committing these duplicate files. Instead of a manual copy and commit, add a "prebuild" or "predev" step to `packages/docs/package.json` that copies the assets at build time. 
Alternatively, since Astro supports importing from outside the project root (depending on Vite's `server.fs.allow` settings), you might be able to reference `../../../docs/assets/` directly in the MDX. If copying is preferred, automating it via a simple script in PR 5 is trivial and prevents technical debt from the start.

## 3. README Lint Forgiveness (PR 2)
**Observation:** The lint script in Task 5.3 extracts H2 headings and normalizes them to lowercase to check for required sections (e.g., `Quickstart`).
**Suggestion:** Developers often vary slightly in their heading naming (e.g., `Quick Start` vs `Quickstart`, or extra trailing spaces). The lint script's matching logic should be slightly forgiving (e.g., stripping spaces or matching regex `/quick\s*start/i`) to reduce contributor frustration while still enforcing the structural requirement. The error message should also explicitly list the exact expected strings.

## 4. Generator Link Validation (PR 4)
**Observation:** The connector README generator links to the specific connector page on the docs site *if* the page exists, otherwise falling back to the overview.
**Question:** How does the generator determine if the page exists during the one-shot run? 
**Improvement:** Explicitly note in the spec that the script will use `node:fs` to check for the existence of `packages/docs/src/content/docs/connectors/<slug>.mdx` (or `.md`) to make this routing decision dynamically.

## 5. GitHub Pages Artifact Path (PR 1)
**Observation:** The `docs-publish.yml` workflow correctly targets `packages/docs/dist`.
**Confirmation:** This is perfectly aligned with Astro/Starlight's default output directory. No changes needed here, just confirming that the paths are accurate and the use of the apex domain (`nimbus-agent.dev`) means no `base` path configuration is required in `astro.config.mjs`.
