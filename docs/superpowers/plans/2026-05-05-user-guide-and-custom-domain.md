# User Guide + Custom Domain — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Point `nimbus-agent.dev` at the existing Astro Starlight site (`packages/docs/`), restructure the sidebar into User Guide / Reference / Developer, and write the ~13 new User Guide pages so a new user landing on the docs site can install Nimbus, connect their first service, run their first query, and find help.

**Architecture:** Light infra changes (Astro `base` + `site` + CNAME + GitHub Pages custom domain) plus content writing. All pages live in `packages/docs/src/content/docs/`. The Astro Starlight `sidebar:` config is the only place sidebar order is defined — moving a page between User Guide / Reference / Developer is a config edit, not a file move (Starlight matches by URL path; we keep paths stable).

**Tech Stack:** Astro 6 + Starlight, Cloudflare DNS, GitHub Pages, MDX for content.

**Source spec:** [`docs/superpowers/specs/2026-05-05-v0.1.0-release-readiness-design.md`](../specs/2026-05-05-v0.1.0-release-readiness-design.md) — Workstream C.

---

## File structure (new files in `packages/docs/`)

```
packages/docs/
├── astro.config.mjs                       MODIFY: base, site, sidebar
├── public/
│   ├── CNAME                              CREATE: nimbus-agent.dev
│   ├── favicon.svg                        CREATE
│   ├── favicon-32x32.png                  CREATE
│   ├── apple-touch-icon.png               CREATE
│   └── og.png                             CREATE: 1200×630 OpenGraph image
└── src/content/docs/
    ├── index.mdx                          MODIFY: reframe as What is Nimbus
    ├── user-guide/
    │   ├── install.mdx                    CREATE
    │   ├── verify-your-download.mdx       CREATE
    │   ├── first-run-setup.mdx            CREATE
    │   ├── connect-your-first-service.mdx CREATE
    │   ├── your-first-query.mdx           CREATE
    │   ├── hitl-and-safety.mdx            CREATE
    │   ├── watchers.mdx                   CREATE
    │   ├── workflows.mdx                  CREATE
    │   ├── profiles.mdx                   CREATE
    │   ├── voice.mdx                      CREATE
    │   ├── vscode-extension.mdx           CREATE
    │   ├── connectors.mdx                 CREATE: landing
    │   └── troubleshooting.mdx            CREATE
    ├── faq.mdx                            REFRAME (existing)
    ├── getting-started.mdx                KEEP — sidebar moves it under User Guide
    ├── query-and-http.mdx                 KEEP — under Reference
    ├── telemetry.mdx                      KEEP — under Reference
    ├── architecture-overview.mdx          KEEP — under Developer
    ├── client-library.mdx                 KEEP — under Developer
    └── connectors/                        KEEP — under Reference
```

Plus:
- Modify: `.github/workflows/deploy-docs.yml` — add post-deploy smoke step.
- Out-of-band: Cloudflare DNS record + GitHub Pages custom-domain config.

---

## Task 1: Astro config — `base` + `site` change

**Files:**
- Modify: `packages/docs/astro.config.mjs`

- [ ] **Step 1: Read current config**

Run: `cat packages/docs/astro.config.mjs`
Expected: file contains `base: '/Nimbus/'` and `site: 'https://asafgolombek.github.io'`.

- [ ] **Step 2: Update both fields**

Change:
```js
site: "https://asafgolombek.github.io",
base: "/Nimbus/",
```

To:
```js
site: "https://nimbus-agent.dev",
base: "/",
```

Also update the leading comment block (lines 1-3) to reflect the new URL.

- [ ] **Step 3: Verify the build still passes**

Run: `cd packages/docs && bunx astro build`
Expected: build succeeds with no errors. The new `dist/` should not contain the `/Nimbus/` prefix in any URL.

- [ ] **Step 4: Verify locally**

Run: `cd packages/docs && bunx astro preview`
Open the printed URL; confirm pages load correctly without the `/Nimbus/` base path.

- [ ] **Step 5: Commit**

```bash
git add packages/docs/astro.config.mjs
git commit -m "docs: switch Astro base/site to nimbus-agent.dev"
```

---

## Task 2: Add `CNAME` file

**Files:**
- Create: `packages/docs/public/CNAME`

- [ ] **Step 1: Write the file**

```bash
echo "nimbus-agent.dev" > packages/docs/public/CNAME
```

- [ ] **Step 2: Verify it's a single line, no trailing whitespace**

Run: `cat -A packages/docs/public/CNAME`
Expected output:
```
nimbus-agent.dev$
```
(One line, ending in `$` for newline. If you see ` $` or extra `$`, fix it.)

- [ ] **Step 3: Verify Astro copies it to dist**

```bash
cd packages/docs && bunx astro build
test -f dist/CNAME && cat dist/CNAME
```
Expected: prints `nimbus-agent.dev`.

- [ ] **Step 4: Commit**

```bash
git add packages/docs/public/CNAME
git commit -m "docs: add CNAME for nimbus-agent.dev"
```

---

## Task 3: Cross-link sweep — `/Nimbus/` and `asafgolombek.github.io` literals

**Files:**
- Search-and-replace across `packages/docs/src/`

- [ ] **Step 1: Find all references**

Run: `grep -rn '/Nimbus/\|asafgolombek\.github\.io' packages/docs/src/ 2>&1 || echo "none"`
Expected: list of files + line numbers, OR "none".

- [ ] **Step 2: For each match, replace appropriately**

- `/Nimbus/path/to/thing` → `/path/to/thing`
- `https://asafgolombek.github.io/Nimbus/foo` → `https://nimbus-agent.dev/foo`
- `https://asafgolombek.github.io` (no /Nimbus/) → `https://nimbus-agent.dev`

GitHub repo URLs (`https://github.com/asafgolombek/Nimbus`) **do not change** — they correctly point to the source repository.

- [ ] **Step 3: Re-run grep to confirm zero matches**

Run: `grep -rn '/Nimbus/\|asafgolombek\.github\.io' packages/docs/src/ && exit 1 || echo "clean"`
Expected: prints `clean`.

- [ ] **Step 4: Build and verify no broken internal links**

Run: `cd packages/docs && bunx astro build 2>&1 | grep -i 'broken\|missing'`
Expected: no broken-link warnings.

- [ ] **Step 5: Commit**

```bash
git add packages/docs/src/
git commit -m "docs: sweep /Nimbus/ + github.io references → nimbus-agent.dev"
```

---

## Task 4: Add favicon + Apple touch icon + OG image

**Files:**
- Create: `packages/docs/public/favicon.svg`
- Create: `packages/docs/public/favicon-32x32.png`
- Create: `packages/docs/public/apple-touch-icon.png`
- Create: `packages/docs/public/og.png`

**Note:** the four asset files are content/branding work, not code. The implementer should obtain or create them per the project's existing brand guidelines. Placeholder dimensions:

| File | Dimensions | Purpose |
|---|---|---|
| `favicon.svg` | scalable | browser tab |
| `favicon-32x32.png` | 32×32 | browser tab fallback |
| `apple-touch-icon.png` | 180×180 | iOS home-screen |
| `og.png` | 1200×630 | OpenGraph link unfurls |

- [ ] **Step 1: Drop the four assets into `packages/docs/public/`**

(Source from designer or use the existing `scripts/linux/nimbus-headless.png` cropped/scaled — that's at least a starting point.)

- [ ] **Step 2: Reference them in Starlight `head:` config**

In `packages/docs/astro.config.mjs`, add to the Starlight integration options:

```js
starlight({
  // ...
  favicon: "/favicon.svg",
  head: [
    { tag: "link", attrs: { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" } },
    { tag: "link", attrs: { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" } },
    { tag: "meta", attrs: { property: "og:image",   content: "https://nimbus-agent.dev/og.png" } },
    { tag: "meta", attrs: { property: "og:type",    content: "website" } },
    { tag: "meta", attrs: { name: "twitter:card",   content: "summary_large_image" } },
    { tag: "meta", attrs: { name: "twitter:image",  content: "https://nimbus-agent.dev/og.png" } },
  ],
})
```

- [ ] **Step 3: Build and inspect**

```bash
cd packages/docs && bunx astro build
grep -E "og:image|favicon" dist/index.html
```
Expected: each `<meta>` and `<link>` tag from Step 2 is rendered into the head of `dist/index.html`.

- [ ] **Step 4: Commit**

```bash
git add packages/docs/public/favicon.svg packages/docs/public/favicon-32x32.png packages/docs/public/apple-touch-icon.png packages/docs/public/og.png packages/docs/astro.config.mjs
git commit -m "docs: add branded favicon, apple-touch-icon, OpenGraph image"
```

---

## Task 5: Sidebar restructure (User Guide / Reference / Developer)

**Files:**
- Modify: `packages/docs/astro.config.mjs`

- [ ] **Step 1: Replace the existing `sidebar:` block**

In the Starlight integration options, replace any existing `sidebar:` config with:

```js
sidebar: [
  {
    label: "User Guide",
    items: [
      { label: "What is Nimbus", link: "/" },
      { label: "Install", link: "/user-guide/install/" },
      { label: "Verify your download", link: "/user-guide/verify-your-download/" },
      { label: "First-run setup", link: "/user-guide/first-run-setup/" },
      { label: "Connect your first service", link: "/user-guide/connect-your-first-service/" },
      { label: "Your first query", link: "/user-guide/your-first-query/" },
      { label: "HITL & safety", link: "/user-guide/hitl-and-safety/" },
      { label: "Watchers", link: "/user-guide/watchers/" },
      { label: "Workflows", link: "/user-guide/workflows/" },
      { label: "Profiles", link: "/user-guide/profiles/" },
      { label: "Voice", link: "/user-guide/voice/" },
      { label: "VS Code extension", link: "/user-guide/vscode-extension/" },
      { label: "Connectors", link: "/user-guide/connectors/" },
      { label: "Troubleshooting", link: "/user-guide/troubleshooting/" },
      { label: "FAQ", link: "/faq/" },
    ],
  },
  {
    label: "Reference",
    items: [
      { label: "Getting started", link: "/getting-started/" },
      { label: "Query & HTTP", link: "/query-and-http/" },
      { label: "Telemetry", link: "/telemetry/" },
      { label: "Connectors (per-service)", autogenerate: { directory: "connectors" } },
    ],
  },
  {
    label: "Developer",
    items: [
      { label: "Architecture overview", link: "/architecture-overview/" },
      { label: "Client library", link: "/client-library/" },
    ],
  },
],
```

- [ ] **Step 2: Build and confirm sidebar renders**

Run: `cd packages/docs && bunx astro build && bunx astro preview`
Open the preview URL; confirm three top-level sidebar groups render (some entries will 404 until later tasks create the pages — that's expected).

- [ ] **Step 3: Commit**

```bash
git add packages/docs/astro.config.mjs
git commit -m "docs: restructure sidebar (User Guide / Reference / Developer)"
```

---

## Task 6: Reframe `index.mdx` as "What is Nimbus"

**Files:**
- Modify: `packages/docs/src/content/docs/index.mdx`

- [ ] **Step 1: Read existing index**

Run: `cat packages/docs/src/content/docs/index.mdx`

- [ ] **Step 2: Replace content with**

```mdx
---
title: What is Nimbus
description: Local-first AI agent framework for engineers running production systems.
template: splash
hero:
  tagline: Your local-first AI agent. Indexes your services. Acts on your behalf — only with your consent.
  actions:
    - text: Install
      link: /user-guide/install/
      icon: right-arrow
      variant: primary
    - text: View on GitHub
      link: https://github.com/asafgolombek/Nimbus
      icon: external
---

## Why Nimbus

Nimbus is a headless agent framework that runs on **your** machine. It maintains
a private SQLite index of your data across the services you already use — Google
Drive, Gmail, GitHub, Slack, Linear, Jira, and more — and executes multi-step
workflows on your behalf.

Three things make it different:

- **Local-first.** Your machine is the source of truth. The cloud is a
  connector, never a backend. Nimbus runs offline.
- **HITL is structural.** Any action that writes data — sending a message,
  deleting a file, creating an issue — pauses for your explicit consent. The
  consent gate is in the executor, not the prompt; it cannot be bypassed.
- **No plaintext credentials.** Vault-only storage (Windows DPAPI, macOS
  Keychain, Linux libsecret). Credentials never appear in logs, config files,
  or IPC payloads.

## Get started

import { CardGrid, LinkCard } from "@astrojs/starlight/components";

<CardGrid>
  <LinkCard title="Install" href="/user-guide/install/" description="Windows, macOS, Linux. Per-user, no admin." />
  <LinkCard title="Connect a service" href="/user-guide/connect-your-first-service/" description="OAuth into your first cloud service in under a minute." />
  <LinkCard title="Your first query" href="/user-guide/your-first-query/" description="CLI and Tauri desktop, side-by-side." />
  <LinkCard title="HITL & safety" href="/user-guide/hitl-and-safety/" description="What gets gated. What doesn't. Why." />
</CardGrid>

## License

Gateway, CLI, and connectors: AGPL-3.0. SDK and client library: MIT.
```

- [ ] **Step 3: Build and visually verify the splash hero renders**

Run: `cd packages/docs && bunx astro build && bunx astro preview`
Expected: home page shows the hero, three principles, and the LinkCard grid.

- [ ] **Step 4: Commit**

```bash
git add packages/docs/src/content/docs/index.mdx
git commit -m "docs: reframe index as What is Nimbus splash + LinkCard grid"
```

---

## Tasks 7–19: Write 13 new User Guide pages

**Files (one per task):**
- 7: `packages/docs/src/content/docs/user-guide/install.mdx`
- 8: `packages/docs/src/content/docs/user-guide/verify-your-download.mdx`
- 9: `packages/docs/src/content/docs/user-guide/first-run-setup.mdx`
- 10: `packages/docs/src/content/docs/user-guide/connect-your-first-service.mdx`
- 11: `packages/docs/src/content/docs/user-guide/your-first-query.mdx`
- 12: `packages/docs/src/content/docs/user-guide/hitl-and-safety.mdx`
- 13: `packages/docs/src/content/docs/user-guide/watchers.mdx`
- 14: `packages/docs/src/content/docs/user-guide/workflows.mdx`
- 15: `packages/docs/src/content/docs/user-guide/profiles.mdx`
- 16: `packages/docs/src/content/docs/user-guide/voice.mdx`
- 17: `packages/docs/src/content/docs/user-guide/vscode-extension.mdx`
- 18: `packages/docs/src/content/docs/user-guide/connectors.mdx`
- 19: `packages/docs/src/content/docs/user-guide/troubleshooting.mdx`

For each task, follow the same five-step pattern below, varying only the page slug, title, and content brief. Do **not** batch them — one page per commit so reviewers can comment line-by-line.

### Per-page step pattern

- [ ] **Step 1: Create the file with frontmatter**

```mdx
---
title: <page title>
description: <one-sentence summary for OG tags + sidebar tooltip>
---
```

- [ ] **Step 2: Write the body** following the brief in the table below.

- [ ] **Step 3: Verify the page builds and renders**

Run: `cd packages/docs && bunx astro build`
Expected: zero errors. Then `bunx astro preview` and visit the page URL.

- [ ] **Step 4: Run any embedded code blocks against the live tool** to verify accuracy. (E.g., a `nimbus ask` example must actually produce that output — copy the real output, do not invent it.)

- [ ] **Step 5: Commit (one commit per page)**

```bash
git add packages/docs/src/content/docs/user-guide/<slug>.mdx
git commit -m "docs(user-guide): add <page-title>"
```

### Page-by-page content briefs

| # | Slug | Sections (H2-level) | Reference material |
|---|---|---|---|
| 7 | install | "Linux (.deb)", "macOS / Linux (tarball)", "Windows (zip)", "AppImage", "Verify your download" | Mirror root `README.md` install section. Cross-link to `verify-your-download`. |
| 8 | verify-your-download | "Why verify", "Get the public key", "Verify the SHA256SUMS manifest", "Verify a single file" | Use the production GPG fingerprint from Workstream A Task 3. Show full `gpg --verify` output. |
| 9 | first-run-setup | "Open the desktop app", "Onboarding wizard", "Tray icon", "Quick Query hotkey" | Each H2 needs one screenshot. Source from the existing manual-smoke checklist (`docs/release/manual-smoke-v0.1.0.md` §1). |
| 10 | connect-your-first-service | "Pick a service", "OAuth flow (Google Drive worked example)", "What gets indexed", "Authorising more services" | Show the OAuth screenshots. Note that filesystem and GitHub are alternative starting points. |
| 11 | your-first-query | "Tauri Quick Query", "CLI: `nimbus ask`", "What just happened (intent → tools → result)", "Streaming and cancel" | Real `nimbus ask` output captured from your machine. Show one query that hits the index, one that hits a connector. |
| 12 | hitl-and-safety | "Why HITL", "What's gated (the frozen set)", "What's not gated", "Approving / rejecting", "Audit log" | Reference `packages/gateway/src/engine/executor.ts` `HITL_REQUIRED` set. Don't list every action — describe the categories (file write/move/delete, message send, issue/PR creation/closing, etc.). |
| 13 | watchers | "Concept", "Worked example: Linear assignment alert", "Graph predicates (advanced)", "History of fires" | Use the V22 graph-predicate schema. Include the actual `nimbus watcher add` invocation and the resulting JSON. |
| 14 | workflows | "Concept", "Worked example: yesterday's PRs → Slack DM", "Dry-run mode", "Run history" | Include the workflow YAML. Walk through the dry-run output. |
| 15 | profiles | "Why profiles", "Create work / personal", "Switch", "What is and isn't shared", "Vault key prefixing" | Reference `packages/gateway/src/config/profiles.ts`. |
| 16 | voice | "Push-to-talk", "Wake word", "Per-OS notes (whisperPath, native TTS)", "Privacy" | macOS `say`, Windows SAPI, Linux `espeak-ng`. STT via whisper-cli. |
| 17 | vscode-extension | "Install (Marketplace + Open VSX)", "Nimbus: Ask", "Nimbus: Search", "Inline HITL", "Settings" | Mirror `packages/vscode-extension/README.md`, expand with screenshots. |
| 18 | connectors | "Supported services (table)", "How auth works (per service)", "Sync intervals", "Adding more" | Table linking to the per-connector pages already under `connectors/`. |
| 19 | troubleshooting | "`nimbus doctor`", "`nimbus diag`", "Connector errors", "Index repair (`nimbus db verify` / `db repair`)", "Where to file issues" | Real output of each command. |

---

## Task 20: Reframe `faq.mdx`

**Files:**
- Modify: `packages/docs/src/content/docs/faq.mdx`

- [ ] **Step 1: Read existing**

Run: `cat packages/docs/src/content/docs/faq.mdx`

- [ ] **Step 2: Add new questions at the top, keep existing if still accurate**

Add these specifically:
- **"Is Nimbus really local? What does it send out?"** — answer: by default, only outbound traffic is connector OAuth + connector API calls. Telemetry is opt-in. Air-gap mode is a single TOML toggle.
- **"Can I run Nimbus offline?"** — yes, with a local LLM (Ollama or llama.cpp). Connector sync pauses; queries against the local index continue.
- **"What's the difference between Nimbus and ChatGPT/Claude?"** — Nimbus indexes *your* data and runs locally. The other tools have no access to your private data and run in the cloud.
- **"Is the AGPL going to affect my company?"** — answer per your legal posture; cross-link to `LICENSE` and the SDK MIT carve-out.

- [ ] **Step 3: Build + commit**

```bash
git add packages/docs/src/content/docs/faq.mdx
git commit -m "docs(faq): add local/offline/positioning/licensing questions"
```

---

## Task 21: Add a deploy-time smoke step to `deploy-docs.yml`

**Files:**
- Modify: `.github/workflows/deploy-docs.yml`

- [ ] **Step 1: Add a final smoke step after the deploy step**

Append to the `deploy` job, after the existing `Deploy` step:

```yaml
      - name: Smoke check custom domain
        run: |
          set -e
          # Wait up to 60s for DNS / GitHub Pages to update.
          for i in $(seq 1 12); do
            response=$(curl -sSL -o /tmp/index.html -w "%{http_code}" https://nimbus-agent.dev/ || echo "000")
            if [ "$response" = "200" ]; then
              break
            fi
            sleep 5
          done
          if [ "$response" != "200" ]; then
            echo "::error::Custom domain failed to respond 200 after 60s (got $response)"
            exit 1
          fi
          if ! grep -q "Nimbus" /tmp/index.html; then
            echo "::error::Deployed page does not contain expected 'Nimbus' string"
            exit 1
          fi
          echo "✓ https://nimbus-agent.dev/ responded 200 with expected content"
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy-docs.yml
git commit -m "ci(docs): smoke-check custom domain after deploy"
```

---

## Task 22: Configure Cloudflare DNS  `[HUMAN]`

- [ ] **Step 1: Cloudflare dashboard → DNS → Records → Add record**

| Field | Value |
|---|---|
| Type | `CNAME` |
| Name | `@` (root) |
| Target | `asafgolombek.github.io` |
| Proxy status | DNS only (grey cloud) — GitHub Pages issues its own cert; Cloudflare proxy interferes |
| TTL | Auto |

(Cloudflare CNAME-flattening makes this work at the apex. If your registrar required moving DNS off Cloudflare for any reason, use ALIAS or four A records pointing at `185.199.108–111.153`.)

- [ ] **Step 2: Verify DNS**

Wait 1–2 minutes, then run:

```bash
dig nimbus-agent.dev +short
# Expected: 185.199.108.153 (or one of the four github.io IPs)
```

---

## Task 23: Configure GitHub Pages custom domain  `[HUMAN]`

- [ ] **Step 1:** GitHub repo → Settings → Pages.

- [ ] **Step 2:** Custom domain → enter `nimbus-agent.dev` → Save.

- [ ] **Step 3:** Wait for the "DNS check successful" green tick (usually under a minute).

- [ ] **Step 4:** Tick **Enforce HTTPS**. (Disabled until GitHub finishes provisioning the Let's Encrypt cert — re-check after ~10 minutes.)

- [ ] **Step 5:** Verify HTTPS:

```bash
curl -fsSL -o /dev/null -w "%{http_code}\n" https://nimbus-agent.dev/
# Expected: 200
```

---

## Task 24: Trigger the docs deploy + verify the smoke step

- [ ] **Step 1: Push the changes that trigger `deploy-docs.yml`**

If all earlier task commits are merged to `main`, the workflow already ran. If not:

```bash
git push origin main
```

- [ ] **Step 2: Watch the run**

Run: `gh run watch -w deploy-docs.yml`
Expected: build + deploy + custom-domain smoke step all green.

- [ ] **Step 3: Manual visual check**

Open https://nimbus-agent.dev/ in a browser. Confirm:
- Hero ("Your local-first AI agent...") renders.
- Sidebar shows User Guide / Reference / Developer.
- Navigate to a few User Guide pages — no 404s.
- Open a Slack/Discord/Twitter compose window and paste the URL — confirm the OG image and description render.

---

## Acceptance verification

- [ ] `nimbus-agent.dev` resolves over HTTPS with a valid Let's Encrypt cert.
- [ ] Sidebar shows three top-level groups (User Guide / Reference / Developer) with the listed pages.
- [ ] All 13 new User Guide pages live and content-complete (each with at least one worked example or screenshot where the brief calls for it).
- [ ] Existing technical pages (`getting-started`, `query-and-http`, `telemetry`, `architecture-overview`, `client-library`, `connectors/*`) still render at their original URLs.
- [ ] No broken internal links: `cd packages/docs && bunx astro build` produces zero broken-link warnings.
- [ ] OG image renders correctly in a Slack/Discord link unfurl.
- [ ] `deploy-docs.yml` smoke step passes for every push.

---

## Out of scope

- Marketing landing distinct from the Astro Starlight index (the splash hero on `/` serves both purposes).
- Multi-language (English only).
- Versioned docs (single live version for now; v0.2.x can introduce versioning if needed).
- GitHub Wiki.
- Analytics (no tracker added — privacy-respecting docs are part of the brand).
