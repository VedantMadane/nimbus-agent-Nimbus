window.BENCHMARK_DATA = {
  "lastUpdate": 1782150128803,
  "repoUrl": "https://github.com/nimbus-agent/Nimbus",
  "entries": {
    "Benchmark": [
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "abfdfbe8c76ec59dcd3337317bc0c3241775a2db",
          "message": "feat(perf): hybrid perf-CI strategy — gate stable surfaces, trend the noisy ones (#642)\n\n## Problem\n\nPerformance Benchmarks is the single worst CI offender (~37% of `main`\nruns red), and **100% of the gating failures are spawn/IO-latency\n`delta-fail`s on shared macOS/Windows runners** — irreducible runner\njitter, not real regressions. The previous stop-gaps (#623, #628)\ngate-excluded noisy surfaces one at a time (`linuxOnlyGate`), but\nlatency surfaces flap as a *class* (S11-a proved it on a no-op release\ncommit), so whack-a-mole never converges. A red perf check today does\nnot reliably mean a real regression.\n\n## Approach — a declared `gateClass` partition\n\nClassify every SLO surface as **`gate` | `trend` | `reference`** and let\nthat single field drive the comparator, replacing the ad-hoc\n`gated`/`linuxOnlyGate` flags:\n\n- **`gate`** — deterministic in-process surfaces (S2-a/S2-b + the 12 S8\nthroughput cells). Hard-gate on every runner. A red here is a real\nregression.\n- **`trend`** — spawn/IO-noisy surfaces (S1, S4, S6-*, S7-a/b, S10,\nS11-a/b + the S3/S5 stubs). Never gate on shared GHA runners; charted on\na `github-action-benchmark` dashboard (`/dev/bench`, `perf-data` orphan\nbranch) and watched by a rolling-median **sustained-drift** detector\nthat opens an issue only on a sustained (not one-off) regression.\n- **`reference`** — recorded authoritatively by the nightly **M1 Air**\nreference run (`_perf-reference.yml` schedule cron).\n\nPlus: latency now aggregates via a **trimmed-pool p95** (drop the single\nworst run, pool the rest) so one catastrophically-contended run can't\nskew the gate; `HistoryLine.schema_version` bumped 1→2 (old\nmedian-of-per-run-p95 history is non-comparable); and `bench-ci` is\n**event-aware** — a push-to-main has no PR to attribute a regression to,\nso it publishes the baseline + feeds the trend and never gates; only\n`pull_request` events gate (gate-class only).\n\n## Key changes\n\n- `slo-thresholds.ts` — add `gateClass`; remove the redundant\n`gated`/`linuxOnlyGate` fields.\n- `threshold-comparator.ts` — `gate` fails on any runner;\n`trend`/`reference` resolve to `skipped` on GHA; full set evaluated on\n`reference-m1air`.\n- `bench-harness.ts` — `poolTrimmedSamples` + trimmed-pool p95 in\n`buildLatencyResult`.\n- `bench-ci.ts` — event-aware exit (push publishes, PR gates).\n- `scripts/perf/emit-benchmark-json.ts` — HistoryLine →\n`github-action-benchmark` JSON (trend, smaller-is-better surfaces).\n- `scripts/perf/drift-check.ts` — pure rolling-median sustained-drift\ndetector + gh-issue upsert (wired into a workflow in a follow-up).\n- `_perf.yml` (push-only trend publish) + `_perf-reference.yml` (nightly\ncron) + `docs/perf/slo.md` repointed at the dashboard.\n- Spec + 12-task TDD plan + external review notes under\n`docs/superpowers/`.\n\n**No new security invariant; no schema migration beyond the perf\nhistory-line version.** This supersedes the `linuxOnlyGate` stop-gaps\nfrom #623/#628 (#628's S11-a row reconciled during rebase — S11-a is now\n`trend`).\n\n## Verification\n\nFull local CI-parity before first push: typecheck (all pkgs) · biome ·\nlint:markdown · all static audits\n(doc-refs/openapi/boundaries/invariants/any/cross-platform/exclusion-parity/release-please/licenses/svg/readme-cli/package-readmes)\n· jscpd · build · **test:ci (full suite + coverage)** · regen-slo\n--check · lychee · **coverage-floor (Docker-Linux-authoritative, 1002\nfiles, all ≥80%)**. Whole-branch high-effort review run; one latent\nordering bug in the (unwired) drift detector found and fixed.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n## Release Notes\n\n* **New Features**\n* Nightly automated performance benchmark runs alongside manual triggers\n* Condensed gate-focused performance summary in PR comments with link to\nthe trend dashboard\n  * Sustained performance drift detection that files labeled issues\n\n* **Improvements**\n* Auto-push benchmark results to the performance dashboard branch, plus\ntrend publishing for supported push runs\n  * Updated performance history/metadata to schema v2\n* Refined gating behavior and failure evaluation based on gate vs. trend\nclassification\n\n* **Documentation**\n* Updated SLO guidance and added hybrid performance strategy\ndesign/review docs\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-15T20:43:25+03:00",
          "tree_id": "d431c2a3ca45fb925f4ebd7a2e206812dbabe9e2",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/abfdfbe8c76ec59dcd3337317bc0c3241775a2db"
        },
        "date": 1781548553320,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 309.8595217500024,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 308.15019345000326,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "24169d9928b9317bd0ed19982eaad9f0b2e5e925",
          "message": "fix(deps): clear high audit advisories (vite/protobufjs/form-data) (#644)\n\n## Problem\n\nThe `bun audit --audit-level high` CI gate is red (surfaced on the\nrelease PR #643 and on every PR + the next `main` push). Three new high\nadvisories landed in the advisory DB:\n\n| Package | Was | Now | Advisory |\n|---|---|---|---|\n| `vite` | 7.3.3 | **7.3.5** |\n[GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff)\n— `server.fs.deny` bypass on Windows alternate paths |\n| `protobufjs` | 7.5.8 | **7.6.4** |\n[GHSA-wcpc-wj8m-hjx6](https://github.com/advisories/GHSA-wcpc-wj8m-hjx6)\n— unbounded `Any` expansion DoS |\n| `form-data` | 4.0.5 | **4.0.6** |\n[GHSA-hmw2-7cc7-3qxx](https://github.com/advisories/GHSA-hmw2-7cc7-3qxx)\n— CRLF injection via field names |\n\n`vite` and `protobufjs` already had root `overrides` pinned to the\n(now-vulnerable) versions; this bumps both pins. `form-data` is a new\noverride (pulled transitively via `@vscode/vsce`, dev-only). All three\nfixes stay within the same major line — no breaking upgrades.\n\nThis is the follow-on to the `ws` bump merged in #642; the moderate/low\nadvisories (`qs`, `yaml`, `node-tar`, `@ai-sdk/provider-utils`) remain\nbelow the `--audit-level high` gate and are out of scope here.\n\n## Verification\n\n- `bun audit --audit-level high` → clean (exit 0)\n- `bun run typecheck` (all packages) → green\n- `@nimbus/docs` build (exercises vite 7.3.5) → green\n- gateway embedding tests (exercise protobufjs 7.6.4 via\n`@xenova/transformers`) → 174 pass, 0 fail\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Chores**\n* Updated dependencies: `protobufjs` (7.5.8 → 7.6.4) and `vite` (7.3.3 →\n7.3.5).\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-15T18:55:37Z",
          "tree_id": "a73d877e8c0ee79e4f0c539ea83877987a1534b3",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/24169d9928b9317bd0ed19982eaad9f0b2e5e925"
        },
        "date": 1781550576022,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 298.01959495000153,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 305.7873003999954,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "cc0490eb21a10162403048376523a61c6553a606",
          "message": "chore(main): release 0.9.0 (#645)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n##\n[0.9.0](https://github.com/nimbus-agent/Nimbus/compare/v0.8.0...v0.9.0)\n(2026-06-15)\n\n\n### Features\n\n* **perf:** hybrid perf-CI strategy — gate stable surfaces, trend the\nnoisy ones ([#642](https://github.com/nimbus-agent/Nimbus/issues/642))\n([abfdfbe](https://github.com/nimbus-agent/Nimbus/commit/abfdfbe8c76ec59dcd3337317bc0c3241775a2db))\n\n\n### Bug Fixes\n\n* **deps:** clear high audit advisories (vite/protobufjs/form-data)\n([#644](https://github.com/nimbus-agent/Nimbus/issues/644))\n([24169d9](https://github.com/nimbus-agent/Nimbus/commit/24169d9928b9317bd0ed19982eaad9f0b2e5e925))\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Chores**\n  * Version 0.9.0 released\n* Changelog updated with new release notes documenting performance\nimprovements and dependency audit advisory cleanup\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-06-16T06:57:24+03:00",
          "tree_id": "a628d9378f8d0669ec6f1059a0acaebda58e3200",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/cc0490eb21a10162403048376523a61c6553a606"
        },
        "date": 1781582936293,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 297.6278346999992,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 297.1809992500101,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "49699333+dependabot[bot]@users.noreply.github.com",
            "name": "dependabot[bot]",
            "username": "dependabot[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "d38a916a76c061c1c35c48c9564a1de544d8e76c",
          "message": "chore(deps): bump the ui-testing group with 2 updates (#646)\n\nBumps the ui-testing group with 2 updates:\n[@vitest/coverage-v8](https://github.com/vitest-dev/vitest/tree/HEAD/packages/coverage-v8)\nand\n[vitest](https://github.com/vitest-dev/vitest/tree/HEAD/packages/vitest).\n\nUpdates `@vitest/coverage-v8` from 4.1.8 to 4.1.9\n<details>\n<summary>Release notes</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/vitest-dev/vitest/releases\">@​vitest/coverage-v8's\nreleases</a>.</em></p>\n<blockquote>\n<h2>v4.1.9</h2>\n<h3>🐞 Bug Fixes</h3>\n<ul>\n<li>Fix <code>importOriginal</code> with optimizer and query import\n[backport to v4] - by <strong>Hiroshi Ogawa</strong>, <strong>David\nHarris</strong>, <strong>Codex</strong>and <strong>Vladimir</strong> in\n<a\nhref=\"https://redirect.github.com/vitest-dev/vitest/issues/10546\">vitest-dev/vitest#10546</a>\n<a href=\"https://github.com/vitest-dev/vitest/commit/a5180190c\"><!-- raw\nHTML omitted -->(a5180)<!-- raw HTML omitted --></a></li>\n<li><strong>browser</strong>:\n<ul>\n<li>Wait for orchestrator readiness before resolving browser sessions\n[backport to v4] - by <strong>Vladimir</strong> and <strong>Séamus\nO'Connor</strong> in <a\nhref=\"https://redirect.github.com/vitest-dev/vitest/issues/10555\">vitest-dev/vitest#10555</a>\n<a href=\"https://github.com/vitest-dev/vitest/commit/7fb29651a\"><!-- raw\nHTML omitted -->(7fb29)<!-- raw HTML omitted --></a></li>\n<li>Wait for iframe tester readiness before preparing [backport to v4] -\nby <strong>Vladimir</strong> and <strong>Séamus O'Connor</strong> in <a\nhref=\"https://redirect.github.com/vitest-dev/vitest/issues/10497\">vitest-dev/vitest#10497</a>\nand <a\nhref=\"https://redirect.github.com/vitest-dev/vitest/issues/10556\">vitest-dev/vitest#10556</a>\n<a href=\"https://github.com/vitest-dev/vitest/commit/fbc626c40\"><!-- raw\nHTML omitted -->(fbc62)<!-- raw HTML omitted --></a></li>\n</ul>\n</li>\n<li><strong>mocker</strong>:\n<ul>\n<li>Hoist vi.mock() for vite-plus/test imports [backport to v4] - by\n<strong>Hiroshi Ogawa</strong>, <strong>LongYinan</strong>,\n<strong>Claude Opus 4.8</strong> and <strong>Vladimir</strong> in <a\nhref=\"https://redirect.github.com/vitest-dev/vitest/issues/10548\">vitest-dev/vitest#10548</a>\n<a href=\"https://github.com/vitest-dev/vitest/commit/2c9559c02\"><!-- raw\nHTML omitted -->(2c955)<!-- raw HTML omitted --></a></li>\n</ul>\n</li>\n<li><strong>pool</strong>:\n<ul>\n<li>Prevent test run hang on worker crash [backport to v4] - by\n<strong>Ari Perkkiö</strong> and <strong>Jattioui Ismail</strong> in <a\nhref=\"https://redirect.github.com/vitest-dev/vitest/issues/10543\">vitest-dev/vitest#10543</a>\nand <a\nhref=\"https://redirect.github.com/vitest-dev/vitest/issues/10564\">vitest-dev/vitest#10564</a>\n<a href=\"https://github.com/vitest-dev/vitest/commit/934b0f587\"><!-- raw\nHTML omitted -->(934b0)<!-- raw HTML omitted --></a></li>\n</ul>\n</li>\n</ul>\n<h5><a\nhref=\"https://github.com/vitest-dev/vitest/compare/v4.1.8...v4.1.9\">View\nchanges on GitHub</a></h5>\n</blockquote>\n</details>\n<details>\n<summary>Commits</summary>\n<ul>\n<li><a\nhref=\"https://github.com/vitest-dev/vitest/commit/a7a61e78c7d0718f00173cff6800a91a344457d4\"><code>a7a61e7</code></a>\nchore: release v4.1.9 (<a\nhref=\"https://github.com/vitest-dev/vitest/tree/HEAD/packages/coverage-v8/issues/10598\">#10598</a>)</li>\n<li>See full diff in <a\nhref=\"https://github.com/vitest-dev/vitest/commits/v4.1.9/packages/coverage-v8\">compare\nview</a></li>\n</ul>\n</details>\n<br />\n\nUpdates `vitest` from 4.1.8 to 4.1.9\n<details>\n<summary>Release notes</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/vitest-dev/vitest/releases\">vitest's\nreleases</a>.</em></p>\n<blockquote>\n<h2>v4.1.9</h2>\n<h3>🐞 Bug Fixes</h3>\n<ul>\n<li>Fix <code>importOriginal</code> with optimizer and query import\n[backport to v4] - by <strong>Hiroshi Ogawa</strong>, <strong>David\nHarris</strong>, <strong>Codex</strong>and <strong>Vladimir</strong> in\n<a\nhref=\"https://redirect.github.com/vitest-dev/vitest/issues/10546\">vitest-dev/vitest#10546</a>\n<a href=\"https://github.com/vitest-dev/vitest/commit/a5180190c\"><!-- raw\nHTML omitted -->(a5180)<!-- raw HTML omitted --></a></li>\n<li><strong>browser</strong>:\n<ul>\n<li>Wait for orchestrator readiness before resolving browser sessions\n[backport to v4] - by <strong>Vladimir</strong> and <strong>Séamus\nO'Connor</strong> in <a\nhref=\"https://redirect.github.com/vitest-dev/vitest/issues/10555\">vitest-dev/vitest#10555</a>\n<a href=\"https://github.com/vitest-dev/vitest/commit/7fb29651a\"><!-- raw\nHTML omitted -->(7fb29)<!-- raw HTML omitted --></a></li>\n<li>Wait for iframe tester readiness before preparing [backport to v4] -\nby <strong>Vladimir</strong> and <strong>Séamus O'Connor</strong> in <a\nhref=\"https://redirect.github.com/vitest-dev/vitest/issues/10497\">vitest-dev/vitest#10497</a>\nand <a\nhref=\"https://redirect.github.com/vitest-dev/vitest/issues/10556\">vitest-dev/vitest#10556</a>\n<a href=\"https://github.com/vitest-dev/vitest/commit/fbc626c40\"><!-- raw\nHTML omitted -->(fbc62)<!-- raw HTML omitted --></a></li>\n</ul>\n</li>\n<li><strong>mocker</strong>:\n<ul>\n<li>Hoist vi.mock() for vite-plus/test imports [backport to v4] - by\n<strong>Hiroshi Ogawa</strong>, <strong>LongYinan</strong>,\n<strong>Claude Opus 4.8</strong> and <strong>Vladimir</strong> in <a\nhref=\"https://redirect.github.com/vitest-dev/vitest/issues/10548\">vitest-dev/vitest#10548</a>\n<a href=\"https://github.com/vitest-dev/vitest/commit/2c9559c02\"><!-- raw\nHTML omitted -->(2c955)<!-- raw HTML omitted --></a></li>\n</ul>\n</li>\n<li><strong>pool</strong>:\n<ul>\n<li>Prevent test run hang on worker crash [backport to v4] - by\n<strong>Ari Perkkiö</strong> and <strong>Jattioui Ismail</strong> in <a\nhref=\"https://redirect.github.com/vitest-dev/vitest/issues/10543\">vitest-dev/vitest#10543</a>\nand <a\nhref=\"https://redirect.github.com/vitest-dev/vitest/issues/10564\">vitest-dev/vitest#10564</a>\n<a href=\"https://github.com/vitest-dev/vitest/commit/934b0f587\"><!-- raw\nHTML omitted -->(934b0)<!-- raw HTML omitted --></a></li>\n</ul>\n</li>\n</ul>\n<h5><a\nhref=\"https://github.com/vitest-dev/vitest/compare/v4.1.8...v4.1.9\">View\nchanges on GitHub</a></h5>\n</blockquote>\n</details>\n<details>\n<summary>Commits</summary>\n<ul>\n<li><a\nhref=\"https://github.com/vitest-dev/vitest/commit/a7a61e78c7d0718f00173cff6800a91a344457d4\"><code>a7a61e7</code></a>\nchore: release v4.1.9 (<a\nhref=\"https://github.com/vitest-dev/vitest/tree/HEAD/packages/vitest/issues/10598\">#10598</a>)</li>\n<li><a\nhref=\"https://github.com/vitest-dev/vitest/commit/934b0f587cb61d8338d83f525295322692a2db40\"><code>934b0f5</code></a>\nfix(pool): prevent test run hang on worker crash (<a\nhref=\"https://github.com/vitest-dev/vitest/tree/HEAD/packages/vitest/issues/10543\">#10543</a>)\n[backport to v4] (#...</li>\n<li><a\nhref=\"https://github.com/vitest-dev/vitest/commit/7fb29651afbae2a9b0cefe6c031a9308f168ac60\"><code>7fb2965</code></a>\nfix(browser): wait for orchestrator readiness before resolving browser\nsessio...</li>\n<li><a\nhref=\"https://github.com/vitest-dev/vitest/commit/a5180190c1be7089e3705e3dd9e84fea118d09d3\"><code>a518019</code></a>\nfix: fix <code>importOriginal</code> with optimizer and query import\n[backport to v4] (#...</li>\n<li>See full diff in <a\nhref=\"https://github.com/vitest-dev/vitest/commits/v4.1.9/packages/vitest\">compare\nview</a></li>\n</ul>\n</details>\n<br />\n\n\nDependabot will resolve any conflicts with this PR as long as you don't\nalter it yourself. You can also trigger a rebase manually by commenting\n`@dependabot rebase`.\n\n[//]: # (dependabot-automerge-start)\n[//]: # (dependabot-automerge-end)\n\n---\n\n<details>\n<summary>Dependabot commands and options</summary>\n<br />\n\nYou can trigger Dependabot actions by commenting on this PR:\n- `@dependabot rebase` will rebase this PR\n- `@dependabot recreate` will recreate this PR, overwriting any edits\nthat have been made to it\n- `@dependabot show <dependency name> ignore conditions` will show all\nof the ignore conditions of the specified dependency\n- `@dependabot ignore <dependency name> major version` will close this\ngroup update PR and stop Dependabot creating any more for the specific\ndependency's major version (unless you unignore this specific\ndependency's major version or upgrade to it yourself)\n- `@dependabot ignore <dependency name> minor version` will close this\ngroup update PR and stop Dependabot creating any more for the specific\ndependency's minor version (unless you unignore this specific\ndependency's minor version or upgrade to it yourself)\n- `@dependabot ignore <dependency name>` will close this group update PR\nand stop Dependabot creating any more for the specific dependency\n(unless you unignore this specific dependency or upgrade to it yourself)\n- `@dependabot unignore <dependency name>` will remove all of the ignore\nconditions of the specified dependency\n- `@dependabot unignore <dependency name> <ignore condition>` will\nremove the ignore condition of the specified dependency and ignore\nconditions\n\n\n</details>\n\nSigned-off-by: dependabot[bot] <support@github.com>\nCo-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>",
          "timestamp": "2026-06-16T17:59:28+03:00",
          "tree_id": "8a24ef4da6d35141c88cd5a1524cdd7af6533ad0",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/d38a916a76c061c1c35c48c9564a1de544d8e76c"
        },
        "date": 1781622688333,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 296.7718288000004,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 299.5519124500039,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "49699333+dependabot[bot]@users.noreply.github.com",
            "name": "dependabot[bot]",
            "username": "dependabot[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "86d422905cece322a60428e5fa7632a553be831b",
          "message": "chore(deps): bump @biomejs/biome from 2.4.16 to 2.5.0 in the tooling group across 1 directory (#647)\n\nBumps the tooling group with 1 update in the / directory:\n[@biomejs/biome](https://github.com/biomejs/biome/tree/HEAD/packages/@biomejs/biome).\n\nUpdates `@biomejs/biome` from 2.4.16 to 2.5.0\n<details>\n<summary>Release notes</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/biomejs/biome/releases\">@​biomejs/biome's\nreleases</a>.</em></p>\n<blockquote>\n<h2>Biome CLI v2.5.0</h2>\n<h2>2.5.0</h2>\n<h3>Minor Changes</h3>\n<ul>\n<li>\n<p><a\nhref=\"https://redirect.github.com/biomejs/biome/pull/9539\">#9539</a> <a\nhref=\"https://github.com/biomejs/biome/commit/f0615fdae80fa7257fc1d0448d2027cb1acff46e\"><code>f0615fd</code></a>\nThanks <a\nhref=\"https://github.com/ematipico\"><code>@​ematipico</code></a>! -\nAdded a new reporter called <code>concise</code>. When\n<code>--reporter=concise</code> is passed the commands\n<code>format</code>, <code>lint</code>, <code>check</code> and\n<code>ci</code>, the diagnostics are printed in a compact manner:</p>\n<pre><code>! index.ts:2:10: lint/correctness/noUnusedImports: Several of\nthese imports are unused.\n! main.ts:9:7: lint/correctness/noUnusedVariables: This variable f is\nunused.\n× index.ts:8:5: lint/suspicious/noImplicitAnyLet: This variable\nimplicitly has the any type.\n× main.ts:2:10: lint/suspicious/noRedeclare: Shouldn't redeclare 'z'.\nConsider to delete it or rename it.\n</code></pre>\n</li>\n<li>\n<p><a\nhref=\"https://redirect.github.com/biomejs/biome/pull/9495\">#9495</a> <a\nhref=\"https://github.com/biomejs/biome/commit/2056b23812a17f9c9a9015e5b725faecb04647b5\"><code>2056b23</code></a>\nThanks <a\nhref=\"https://github.com/aviraldua93\"><code>@​aviraldua93</code></a>! -\nAdded the <a\nhref=\"https://biomejs.dev/linter/rules/use-key-with-click-events/\"><code>useKeyWithClickEvents</code></a>\na11y lint rule for HTML files (<code>.html</code>, <code>.vue</code>,\n<code>.svelte</code>, <code>.astro</code>). This is a port of the\nexisting JSX rule. The rule enforces that elements with an\n<code>onclick</code> handler also have at least one keyboard event\nhandler (<code>onkeydown</code>, <code>onkeyup</code>, or\n<code>onkeypress</code>) to ensure keyboard accessibility.</p>\n<p>Inherently keyboard-accessible elements (<code>&lt;a&gt;</code>,\n<code>&lt;button&gt;</code>, <code>&lt;input&gt;</code>,\n<code>&lt;select&gt;</code>, <code>&lt;textarea&gt;</code>,\n<code>&lt;option&gt;</code>) are excluded, as are elements hidden from\nassistive technologies (<code>aria-hidden</code>) or with\n<code>role=&quot;presentation&quot;</code> /\n<code>role=&quot;none&quot;</code>.</p>\n<pre lang=\"html\"><code>&lt;!-- Invalid: no keyboard handler --&gt;\n&lt;div onclick=&quot;handleClick()&quot;&gt;Click me&lt;/div&gt;\n<p>&lt;!-- Valid: has keyboard handler --&gt;<br />\n&lt;div onclick=&quot;handleClick()&quot;\nonkeydown=&quot;handleKeyDown()&quot;&gt;Click me&lt;/div&gt;</p>\n<p>&lt;!-- Valid: inherently keyboard-accessible --&gt;<br />\n&lt;button onclick=&quot;handleClick()&quot;&gt;Submit&lt;/button&gt;<br\n/>\n</code></pre></p>\n</li>\n<li>\n<p><a\nhref=\"https://redirect.github.com/biomejs/biome/pull/9152\">#9152</a> <a\nhref=\"https://github.com/biomejs/biome/commit/9ec8500dabc7305cbe04ecf27a84a1450f012c0b\"><code>9ec8500</code></a>\nThanks <a\nhref=\"https://github.com/ematipico\"><code>@​ematipico</code></a>! -\nAdded new nursery lint rule <a\nhref=\"https://biomejs.dev/linter/rules/no-undeclared-classes/\"><code>noUndeclaredClasses</code></a>\nfor HTML, JSX, and SFC files (Vue, Astro, Svelte). The rule detects CSS\nclass names used in <code>class=&quot;...&quot;</code> (or\n<code>className</code>) attributes that are not defined in any\n<code>&lt;style&gt;</code> block or linked stylesheet reachable from the\nfile.</p>\n<pre lang=\"html\"><code>&lt;!-- .typo is used but never defined --&gt;\n&lt;html&gt;\n  &lt;head&gt;\n    &lt;style&gt;\n      .button {\n        color: blue;\n      }\n    &lt;/style&gt;\n  &lt;/head&gt;\n  &lt;body&gt;\n    &lt;div class=&quot;button typo&quot;&gt;&lt;/div&gt;\n  &lt;/body&gt;\n&lt;/html&gt;\n</code></pre>\n</li>\n<li>\n<p><a\nhref=\"https://redirect.github.com/biomejs/biome/pull/9152\">#9152</a> <a\nhref=\"https://github.com/biomejs/biome/commit/9ec8500dabc7305cbe04ecf27a84a1450f012c0b\"><code>9ec8500</code></a>\nThanks <a\nhref=\"https://github.com/ematipico\"><code>@​ematipico</code></a>! -\nAdded new nursery lint rule <a\nhref=\"https://biomejs.dev/linter/rules/no-unused-classes/\"><code>noUnusedClasses</code></a>\nfor CSS. The rule detects CSS class selectors that are never referenced\nin any HTML or JSX file that imports the stylesheet. This is a\nproject-domain rule that requires the module graph.</p>\n</li>\n</ul>\n<!-- raw HTML omitted -->\n</blockquote>\n<p>... (truncated)</p>\n</details>\n<details>\n<summary>Changelog</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/biomejs/biome/blob/main/packages/@biomejs/biome/CHANGELOG.md\">@​biomejs/biome's\nchangelog</a>.</em></p>\n<blockquote>\n<h2>2.5.0</h2>\n<h3>Minor Changes</h3>\n<ul>\n<li>\n<p><a\nhref=\"https://redirect.github.com/biomejs/biome/pull/9539\">#9539</a> <a\nhref=\"https://github.com/biomejs/biome/commit/f0615fdae80fa7257fc1d0448d2027cb1acff46e\"><code>f0615fd</code></a>\nThanks <a\nhref=\"https://github.com/ematipico\"><code>@​ematipico</code></a>! -\nAdded a new reporter called <code>concise</code>. When\n<code>--reporter=concise</code> is passed the commands\n<code>format</code>, <code>lint</code>, <code>check</code> and\n<code>ci</code>, the diagnostics are printed in a compact manner:</p>\n<pre><code>! index.ts:2:10: lint/correctness/noUnusedImports: Several of\nthese imports are unused.\n! main.ts:9:7: lint/correctness/noUnusedVariables: This variable f is\nunused.\n× index.ts:8:5: lint/suspicious/noImplicitAnyLet: This variable\nimplicitly has the any type.\n× main.ts:2:10: lint/suspicious/noRedeclare: Shouldn't redeclare 'z'.\nConsider to delete it or rename it.\n</code></pre>\n</li>\n<li>\n<p><a\nhref=\"https://redirect.github.com/biomejs/biome/pull/9495\">#9495</a> <a\nhref=\"https://github.com/biomejs/biome/commit/2056b23812a17f9c9a9015e5b725faecb04647b5\"><code>2056b23</code></a>\nThanks <a\nhref=\"https://github.com/aviraldua93\"><code>@​aviraldua93</code></a>! -\nAdded the <a\nhref=\"https://biomejs.dev/linter/rules/use-key-with-click-events/\"><code>useKeyWithClickEvents</code></a>\na11y lint rule for HTML files (<code>.html</code>, <code>.vue</code>,\n<code>.svelte</code>, <code>.astro</code>). This is a port of the\nexisting JSX rule. The rule enforces that elements with an\n<code>onclick</code> handler also have at least one keyboard event\nhandler (<code>onkeydown</code>, <code>onkeyup</code>, or\n<code>onkeypress</code>) to ensure keyboard accessibility.</p>\n<p>Inherently keyboard-accessible elements (<code>&lt;a&gt;</code>,\n<code>&lt;button&gt;</code>, <code>&lt;input&gt;</code>,\n<code>&lt;select&gt;</code>, <code>&lt;textarea&gt;</code>,\n<code>&lt;option&gt;</code>) are excluded, as are elements hidden from\nassistive technologies (<code>aria-hidden</code>) or with\n<code>role=&quot;presentation&quot;</code> /\n<code>role=&quot;none&quot;</code>.</p>\n<pre lang=\"html\"><code>&lt;!-- Invalid: no keyboard handler --&gt;\n&lt;div onclick=&quot;handleClick()&quot;&gt;Click me&lt;/div&gt;\n<p>&lt;!-- Valid: has keyboard handler --&gt;<br />\n&lt;div onclick=&quot;handleClick()&quot;\nonkeydown=&quot;handleKeyDown()&quot;&gt;Click me&lt;/div&gt;</p>\n<p>&lt;!-- Valid: inherently keyboard-accessible --&gt;<br />\n&lt;button onclick=&quot;handleClick()&quot;&gt;Submit&lt;/button&gt;<br\n/>\n</code></pre></p>\n</li>\n<li>\n<p><a\nhref=\"https://redirect.github.com/biomejs/biome/pull/9152\">#9152</a> <a\nhref=\"https://github.com/biomejs/biome/commit/9ec8500dabc7305cbe04ecf27a84a1450f012c0b\"><code>9ec8500</code></a>\nThanks <a\nhref=\"https://github.com/ematipico\"><code>@​ematipico</code></a>! -\nAdded new nursery lint rule <a\nhref=\"https://biomejs.dev/linter/rules/no-undeclared-classes/\"><code>noUndeclaredClasses</code></a>\nfor HTML, JSX, and SFC files (Vue, Astro, Svelte). The rule detects CSS\nclass names used in <code>class=&quot;...&quot;</code> (or\n<code>className</code>) attributes that are not defined in any\n<code>&lt;style&gt;</code> block or linked stylesheet reachable from the\nfile.</p>\n<pre lang=\"html\"><code>&lt;!-- .typo is used but never defined --&gt;\n&lt;html&gt;\n  &lt;head&gt;\n    &lt;style&gt;\n      .button {\n        color: blue;\n      }\n    &lt;/style&gt;\n  &lt;/head&gt;\n  &lt;body&gt;\n    &lt;div class=&quot;button typo&quot;&gt;&lt;/div&gt;\n  &lt;/body&gt;\n&lt;/html&gt;\n</code></pre>\n</li>\n<li>\n<p><a\nhref=\"https://redirect.github.com/biomejs/biome/pull/9152\">#9152</a> <a\nhref=\"https://github.com/biomejs/biome/commit/9ec8500dabc7305cbe04ecf27a84a1450f012c0b\"><code>9ec8500</code></a>\nThanks <a\nhref=\"https://github.com/ematipico\"><code>@​ematipico</code></a>! -\nAdded new nursery lint rule <a\nhref=\"https://biomejs.dev/linter/rules/no-unused-classes/\"><code>noUnusedClasses</code></a>\nfor CSS. The rule detects CSS class selectors that are never referenced\nin any HTML or JSX file that imports the stylesheet. This is a\nproject-domain rule that requires the module graph.</p>\n<pre lang=\"css\"><code>/* styles.css — .ghost is never used in any\nimporting file */\n</code></pre>\n</li>\n</ul>\n<!-- raw HTML omitted -->\n</blockquote>\n<p>... (truncated)</p>\n</details>\n<details>\n<summary>Commits</summary>\n<ul>\n<li><a\nhref=\"https://github.com/biomejs/biome/commit/c0b98327a3b14e44d8fbd9a11481bf56c505b8ed\"><code>c0b9832</code></a>\nci: release (<a\nhref=\"https://github.com/biomejs/biome/tree/HEAD/packages/@biomejs/biome/issues/10499\">#10499</a>)</li>\n<li><a\nhref=\"https://github.com/biomejs/biome/commit/995c1ffeca039787c93370fed8b970a057e9c073\"><code>995c1ff</code></a>\nfeat(lint): add useFunctionComponentDefinition rule (<a\nhref=\"https://github.com/biomejs/biome/tree/HEAD/packages/@biomejs/biome/issues/10498\">#10498</a>)</li>\n<li><a\nhref=\"https://github.com/biomejs/biome/commit/311c2b28d2617a66e710ca3391f42ce62c4abfe1\"><code>311c2b2</code></a>\nfix(biome_configuration): avoid Markdown links in JSON schema\ndescriptions (#...</li>\n<li><a\nhref=\"https://github.com/biomejs/biome/commit/04c3f19b9c28f39d27412006fdf916a352ab8def\"><code>04c3f19</code></a>\nfix: docs and readme (<a\nhref=\"https://github.com/biomejs/biome/tree/HEAD/packages/@biomejs/biome/issues/10584\">#10584</a>)</li>\n<li><a\nhref=\"https://github.com/biomejs/biome/commit/961f41c9646166ce017014b0c5bc2492d13a0919\"><code>961f41c</code></a>\nrefactor(useExportType): improve docs and code (<a\nhref=\"https://github.com/biomejs/biome/tree/HEAD/packages/@biomejs/biome/issues/10569\">#10569</a>)</li>\n<li><a\nhref=\"https://github.com/biomejs/biome/commit/78075b7c7cb7490c730a96f4ee9776c9e77826e7\"><code>78075b7</code></a>\nfeat(useExportType): add style option (<a\nhref=\"https://github.com/biomejs/biome/tree/HEAD/packages/@biomejs/biome/issues/10561\">#10561</a>)</li>\n<li><a\nhref=\"https://github.com/biomejs/biome/commit/66428957e6ca393a802f365b8e643438f19a3039\"><code>6642895</code></a>\nfeat: rule promotion for v2.5 (<a\nhref=\"https://github.com/biomejs/biome/tree/HEAD/packages/@biomejs/biome/issues/10562\">#10562</a>)</li>\n<li><a\nhref=\"https://github.com/biomejs/biome/commit/9a5855e4191c98149f8278289569b2272b992684\"><code>9a5855e</code></a>\nfeat: noRestrictedDependencies (<a\nhref=\"https://github.com/biomejs/biome/tree/HEAD/packages/@biomejs/biome/issues/10467\">#10467</a>)</li>\n<li><a\nhref=\"https://github.com/biomejs/biome/commit/608a62fa78e7d2fb5c8ee7008587357fa9d8ba19\"><code>608a62f</code></a>\nMerge branch 'main' into chore/merge-main-into-next</li>\n<li><a\nhref=\"https://github.com/biomejs/biome/commit/0f29b8361ba3cd11bdbfb91f8ff722184cfadf08\"><code>0f29b83</code></a>\nfeat(linter): implement useIncludes rule (<a\nhref=\"https://github.com/biomejs/biome/tree/HEAD/packages/@biomejs/biome/issues/10516\">#10516</a>)</li>\n<li>Additional commits viewable in <a\nhref=\"https://github.com/biomejs/biome/commits/@biomejs/biome@2.5.0/packages/@biomejs/biome\">compare\nview</a></li>\n</ul>\n</details>\n<br />\n\nSigned-off-by: dependabot[bot] <support@github.com>\nCo-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>",
          "timestamp": "2026-06-16T18:03:25+03:00",
          "tree_id": "4ae3cf7bc9b95070129591b1c9c2e1217fb085e9",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/86d422905cece322a60428e5fa7632a553be831b"
        },
        "date": 1781623371658,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 297.5094588500022,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 298.20272539999786,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "49699333+dependabot[bot]@users.noreply.github.com",
            "name": "dependabot[bot]",
            "username": "dependabot[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "7d1ee91602215206e5052471140f5e850557cdaf",
          "message": "chore(deps): bump ovsx from 0.10.12 to 1.0.1 (#650)\n\n[//]: # (dependabot-start)\n⚠️  **Dependabot is rebasing this PR** ⚠️ \n\nRebasing might not happen immediately, so don't worry if this takes some\ntime.\n\nNote: if you make any changes to this PR yourself, they will take\nprecedence over the rebase.\n\n---\n\n[//]: # (dependabot-end)\n\nBumps [ovsx](https://github.com/eclipse-openvsx/openvsx/tree/HEAD/cli)\nfrom 0.10.12 to 1.0.1.\n<details>\n<summary>Release notes</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/eclipse-openvsx/openvsx/releases\">ovsx's\nreleases</a>.</em></p>\n<blockquote>\n<h2>CLI v1.0.1</h2>\n<h3>Fixes</h3>\n<ul>\n<li>Properly encode path segments in <code>getUrl</code> method (<a\nhref=\"https://redirect.github.com/eclipse/openvsx/pull/1893\">#1893</a>)</li>\n</ul>\n<h2>Frontend Library v1.0.1</h2>\n<h3>Dependencies</h3>\n<ul>\n<li>Bump qs from <code>6.15.1</code> to <code>6.15.2</code> (<a\nhref=\"https://redirect.github.com/eclipse-openvsx/openvsx/pull/1897\">#1897</a>)</li>\n<li>Bump react-router and react-router-dom from <code>6.30.3</code> to\n<code>6.30.4</code> (<a\nhref=\"https://redirect.github.com/eclipse-openvsx/openvsx/pull/1897\">#1897</a>)</li>\n</ul>\n<h2>v1.0.1</h2>\n<!-- raw HTML omitted -->\n<p>This release of Open VSX consists of:</p>\n<ul>\n<li><a href=\"https://www.npmjs.com/package/ovsx/v/1.0.1\">ovsx\nCLI</a></li>\n<li><a\nhref=\"https://www.npmjs.com/package/openvsx-webui/v/1.0.1\">openvsx-webui\nfrontend library</a></li>\n<li><a\nhref=\"https://github.com/eclipse-openvsx/openvsx/pkgs/container/openvsx-server/935307880?tag=v1.0.1\">openvsx-server\nDocker image</a></li>\n<li><a\nhref=\"https://github.com/eclipse-openvsx/openvsx/pkgs/container/openvsx-webui/935290570?tag=v1.0.1\">openvsx-webui\nDocker image</a></li>\n</ul>\n<p>Deploying the server application is documented <a\nhref=\"https://github.com/eclipse/openvsx/wiki/Deploying-Open-VSX\">in the\nWiki</a>.</p>\n<h2>What's Changed</h2>\n<h3>🏕 Features</h3>\n<ul>\n<li>Fix: evict all relevant caches when deleting an extension by <a\nhref=\"https://github.com/netomi\"><code>@​netomi</code></a> in <a\nhref=\"https://redirect.github.com/eclipse-openvsx/openvsx/pull/1890\">eclipse-openvsx/openvsx#1890</a></li>\n<li>Fix: add validation for size/offset parameters for various endpoints\nby <a href=\"https://github.com/netomi\"><code>@​netomi</code></a> in <a\nhref=\"https://redirect.github.com/eclipse-openvsx/openvsx/pull/1892\">eclipse-openvsx/openvsx#1892</a></li>\n<li>Fix: properly encode path segments in getUrl by <a\nhref=\"https://github.com/netomi\"><code>@​netomi</code></a> in <a\nhref=\"https://redirect.github.com/eclipse-openvsx/openvsx/pull/1893\">eclipse-openvsx/openvsx#1893</a></li>\n<li>chore: Update to Gradle 9.5.1 by <a\nhref=\"https://github.com/cstamas\"><code>@​cstamas</code></a> in <a\nhref=\"https://redirect.github.com/eclipse-openvsx/openvsx/pull/1894\">eclipse-openvsx/openvsx#1894</a></li>\n<li>chore(deps): bump qs and react-router by <a\nhref=\"https://github.com/netomi\"><code>@​netomi</code></a> in <a\nhref=\"https://redirect.github.com/eclipse-openvsx/openvsx/pull/1897\">eclipse-openvsx/openvsx#1897</a></li>\n</ul>\n<h3>👒 Dependencies</h3>\n<ul>\n<li>build(deps): bump the github-actions group across 1 directory with 5\nupdates by <a\nhref=\"https://github.com/dependabot\"><code>@​dependabot</code></a>[bot]\nin <a\nhref=\"https://redirect.github.com/eclipse-openvsx/openvsx/pull/1888\">eclipse-openvsx/openvsx#1888</a></li>\n<li>chore(deps): pin opentelemetry version to 1.63.0 by <a\nhref=\"https://github.com/vinokurig\"><code>@​vinokurig</code></a> in <a\nhref=\"https://redirect.github.com/eclipse-openvsx/openvsx/pull/1899\">eclipse-openvsx/openvsx#1899</a></li>\n<li>chore(deps): bump netty to 4.1.135.Final by <a\nhref=\"https://github.com/netomi\"><code>@​netomi</code></a> in <a\nhref=\"https://redirect.github.com/eclipse-openvsx/openvsx/pull/1900\">eclipse-openvsx/openvsx#1900</a></li>\n</ul>\n<h2>New Contributors</h2>\n<ul>\n<li><a href=\"https://github.com/cstamas\"><code>@​cstamas</code></a> made\ntheir first contribution in <a\nhref=\"https://redirect.github.com/eclipse-openvsx/openvsx/pull/1894\">eclipse-openvsx/openvsx#1894</a></li>\n</ul>\n<p><strong>Full Changelog</strong>: <a\nhref=\"https://github.com/eclipse-openvsx/openvsx/compare/v1.0.0...v1.0.1\">https://github.com/eclipse-openvsx/openvsx/compare/v1.0.0...v1.0.1</a></p>\n<h2>CLI v1.0.0</h2>\n<h4>Dependencies</h4>\n<ul>\n<li>Bump fast-uri from <code>3.1.0</code> to <code>3.1.2</code> (<a\nhref=\"https://redirect.github.com/eclipse/openvsx/pull/1829\">#1829</a>)</li>\n<li>Bump brace-expansion from <code>5.0.5</code> to <code>5.0.6</code>\n(<a\nhref=\"https://redirect.github.com/eclipse/openvsx/pull/1846\">#1846</a>)</li>\n<li>Bump qs from <code>6.15.0</code> to <code>6.15.2</code> (<a\nhref=\"https://redirect.github.com/eclipse/openvsx/pull/1869\">#1869</a>)</li>\n<li>Bump tmp from <code>0.2.4</code> to <code>0.2.6</code> (<a\nhref=\"https://redirect.github.com/eclipse/openvsx/pull/1877\">#1877</a>)</li>\n</ul>\n<h2>Frontend Library v1.0.0</h2>\n<h3>Added</h3>\n<!-- raw HTML omitted -->\n</blockquote>\n<p>... (truncated)</p>\n</details>\n<details>\n<summary>Changelog</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/eclipse-openvsx/openvsx/blob/main/cli/CHANGELOG.md\">ovsx's\nchangelog</a>.</em></p>\n<blockquote>\n<h3>[v1.0.1] (11/06/2026)</h3>\n<h3>Fixes</h3>\n<ul>\n<li>Properly encode path segments in <code>getUrl</code> method (<a\nhref=\"https://redirect.github.com/eclipse/openvsx/pull/1893\">#1893</a>)</li>\n</ul>\n<h3>[v1.0.0] (28/05/2026)</h3>\n<h4>Dependencies</h4>\n<ul>\n<li>Bump fast-uri from <code>3.1.0</code> to <code>3.1.2</code> (<a\nhref=\"https://redirect.github.com/eclipse/openvsx/pull/1829\">#1829</a>)</li>\n<li>Bump brace-expansion from <code>5.0.5</code> to <code>5.0.6</code>\n(<a\nhref=\"https://redirect.github.com/eclipse/openvsx/pull/1846\">#1846</a>)</li>\n<li>Bump qs from <code>6.15.0</code> to <code>6.15.2</code> (<a\nhref=\"https://redirect.github.com/eclipse/openvsx/pull/1869\">#1869</a>)</li>\n<li>Bump tmp from <code>0.2.4</code> to <code>0.2.6</code> (<a\nhref=\"https://redirect.github.com/eclipse/openvsx/pull/1877\">#1877</a>)</li>\n</ul>\n</blockquote>\n</details>\n<details>\n<summary>Commits</summary>\n<ul>\n<li><a\nhref=\"https://github.com/eclipse-openvsx/openvsx/commit/724dea02f5372a87d41e8e8528f0fca5828104af\"><code>724dea0</code></a>\nchore: prepare cli 1.0.1 release</li>\n<li><a\nhref=\"https://github.com/eclipse-openvsx/openvsx/commit/19442b0a98bab8f7481e4a47265f7b4f9369a1f9\"><code>19442b0</code></a>\nFix: properly encode path segments in getUrl (<a\nhref=\"https://github.com/eclipse-openvsx/openvsx/tree/HEAD/cli/issues/1893\">#1893</a>)</li>\n<li><a\nhref=\"https://github.com/eclipse-openvsx/openvsx/commit/89fbda8e8c7fed56395fd0978a883f36810c1a02\"><code>89fbda8</code></a>\nchore: bump to cli 1.0.0 release</li>\n<li><a\nhref=\"https://github.com/eclipse-openvsx/openvsx/commit/f79fae23a6c6af9117693a799aa5b15c6cf08823\"><code>f79fae2</code></a>\nchore: prepare for cli 0.10.13 release</li>\n<li><a\nhref=\"https://github.com/eclipse-openvsx/openvsx/commit/43521180b3ef0cfbf7b052c357cee3c72bffdd75\"><code>4352118</code></a>\nbuild(deps): bump tmp from 0.2.4 to 0.2.6 in /cli (<a\nhref=\"https://github.com/eclipse-openvsx/openvsx/tree/HEAD/cli/issues/1877\">#1877</a>)</li>\n<li><a\nhref=\"https://github.com/eclipse-openvsx/openvsx/commit/0cd46adfe4ece288405a409b52f701404b34b03f\"><code>0cd46ad</code></a>\nbuild(deps): bump qs from 6.15.0 to 6.15.2 in /cli (<a\nhref=\"https://github.com/eclipse-openvsx/openvsx/tree/HEAD/cli/issues/1869\">#1869</a>)</li>\n<li><a\nhref=\"https://github.com/eclipse-openvsx/openvsx/commit/aa41a72641b3f63a541f0a775471e38f832a3332\"><code>aa41a72</code></a>\nbuild(deps): bump brace-expansion from 5.0.5 to 5.0.6 in /cli (<a\nhref=\"https://github.com/eclipse-openvsx/openvsx/tree/HEAD/cli/issues/1846\">#1846</a>)</li>\n<li><a\nhref=\"https://github.com/eclipse-openvsx/openvsx/commit/ea274f3bdf9ba8efc5052a17eefe3f5454aab659\"><code>ea274f3</code></a>\nbuild(deps): bump fast-uri from 3.1.0 to 3.1.2 in /cli (<a\nhref=\"https://github.com/eclipse-openvsx/openvsx/tree/HEAD/cli/issues/1829\">#1829</a>)</li>\n<li>See full diff in <a\nhref=\"https://github.com/eclipse-openvsx/openvsx/commits/v1.0.1/cli\">compare\nview</a></li>\n</ul>\n</details>\n<br />\n\nSigned-off-by: dependabot[bot] <support@github.com>\nCo-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>",
          "timestamp": "2026-06-16T18:04:07+03:00",
          "tree_id": "af33ce1c7c4f5d42cce75990f7732646e1a4fca9",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/7d1ee91602215206e5052471140f5e850557cdaf"
        },
        "date": 1781624231889,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 309.07312000000275,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 306.771224400006,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "76e4a88999ddef1915b6e6c74b3c705281edf891",
          "message": "fix(ci): restore lint + license gates after Biome 2.5.0 / ovsx 1.0.1 bumps (#656)\n\n## Problem\n\nThree Dependabot bumps merged to `main` (#647 Biome 2.5.0, #649 ink\n7.0.6, #650 ovsx 1.0.1) and left two CI gates red:\n\n- **Biome lint** (`#647`): Biome 2.5.0 deprecated `linter.recommended`,\nstale-flagged the 2.4.16 `$schema`, and **newly parses `.svg` files** —\nso the connector icon assets tripped 59 parse/CSS errors (63 total).\n- **JS license compliance** (`#650`): `ovsx@1.0.1` is EPL-2.0 and its\nversion-pinned `PACKAGE_OVERRIDES` key went stale (`ovsx@0.10.12`).\n- **lychee** (`#649`): a one-off external timeout on\n`https://asciinema.org/` (0 errors, 1 timeout → exit 2) — a flake\nunrelated to the `ink` bump; no code change needed, passes on re-run.\n\n## Changes\n\n- **Biome 2.5.0:** `biome migrate` (schema → 2.5.0, `recommended` →\n`preset: \"recommended\"`) + exclude `**/*.svg` from biome (static assets,\nalready validated by the separate `audit:svg` gate). One fixable\nimport-order in a CLI test auto-fixed.\n- **ovsx license:** bump the `PACKAGE_OVERRIDES` key `ovsx@0.10.12` →\n`ovsx@1.0.1` with a justifying comment (build-only Open VSX publish CLI\ndevDependency, never bundled/linked; EPL-2.0 stays off the repo-wide\nallowlist) + sync `docs/license-policy.md`.\n\n## Verification\n\n- `bun run lint` → checks 2777 files clean.\n- `bun run audit:js-licenses` → 1490 packages, all under the allowlist.\n- `preflight:fast` typecheck ✓, lint ✓ (the `lint:markdown` failure is\npre-existing untracked Slice-8 WIP docs, not on this branch).\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-16T15:45:31Z",
          "tree_id": "7b28ccfd9bf3b6ab161261911040a0d84c5bdb1e",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/76e4a88999ddef1915b6e6c74b3c705281edf891"
        },
        "date": 1781625159746,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 315.44817725000104,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 311.4028968500046,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "71eaddb28a8eed1b635730bad823ab75576954ca",
          "message": "chore(main): release 0.9.1 (#657)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n##\n[0.9.1](https://github.com/nimbus-agent/Nimbus/compare/v0.9.0...v0.9.1)\n(2026-06-16)\n\n\n### Bug Fixes\n\n* **ci:** restore lint + license gates after Biome 2.5.0 / ovsx 1.0.1\nbumps ([#656](https://github.com/nimbus-agent/Nimbus/issues/656))\n([76e4a88](https://github.com/nimbus-agent/Nimbus/commit/76e4a88999ddef1915b6e6c74b3c705281edf891))\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n## Release Notes\n\n* **Bug Fixes**\n* Restored lint and license verification checks following recent\ndependency updates.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-06-16T19:15:02+03:00",
          "tree_id": "f098bd083dcb9f0a6db4731f46a624f22ee0e185",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/71eaddb28a8eed1b635730bad823ab75576954ca"
        },
        "date": 1781627167163,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 280.20665565000087,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 280.1991967000049,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "f5f246fb9713a023ef8c1eaf8f09ffbac6804b80",
          "message": "fix(ci): publish package managers after Release uploads assets (kill the asset-race) (#658)\n\n## Problem\n\nThe `Publish package managers` (brew/scoop + winget) and `Publish Linux\nrepo` (apt/yum) workflows trigger on `release: [released]`.\nrelease-please publishes the **(empty)** GitHub Release the instant the\nrelease PR merges, which fires `released` **~18 min before**\n`release.yml` finishes building and attaching `SHA256SUMS` / `.deb` /\n`.rpm` / `.msi` / binaries.\n\nSo the publish jobs always raced an asset-less release and died:\n\n```\ngh release download v0.9.1 ... → \"no assets to download\" → exit 1\n```\n\nThis has reddened these two jobs on **every release since v0.7.0**\n(v0.7.0, v0.8.0, v0.9.0, v0.9.1, plus sdk-*/client-* tags that have no\ninstallers at all). The assets *do* land eventually (v0.9.0 has 33), but\nthe publish jobs already failed and don't auto-retry.\n\nRoot-cause runs:\n[27631725421](https://github.com/nimbus-agent/Nimbus/actions/runs/27631725421)\n·\n[27631724623](https://github.com/nimbus-agent/Nimbus/actions/runs/27631724623).\n\n## Fix\n\nRe-trigger the publish workflows via **`workflow_run` on the `Release`\nworkflow completing**, so assets are guaranteed present before `gh\nrelease download` runs.\n\nEach job's `if` gates on:\n- `conclusion == 'success'` — never publish off a failed build\n- `startsWith(head_branch, 'v')` — installer-bearing app releases only\n(sdk-*/client-* don't trigger `release.yml` anyway → doubly excluded)\n- `!contains(head_branch, '-')` — non-prerelease only, preserving the\nold \"`released` fires only for stable\" semantics\n\nSide benefit: prerelease/failed Release runs now yield **skipped**\n(neutral) jobs instead of red, so the chronic red in the run list stops.\n\n### Details\n- Tag plumbing: `github.event.release.tag_name` →\n`github.event.workflow_run.head_branch` throughout; the\n`workflow_dispatch` tag-input path is unchanged for manual re-runs.\n- Checkout pins `ref: head_sha` (workflow_run otherwise defaults to the\ndefault branch) so helper scripts come from the released tag's tree —\nmatching the prior `release:`-event behavior.\n\n## Follow-up (not in this PR)\n- **v0.9.1 still needs a one-time manual publish** once its in-flight\nRelease build attaches assets — `workflow_run` only engages for releases\n*after* this merges to main:\n  ```\n  gh workflow run publish-package-managers.yml -f tag_name=v0.9.1\n  gh workflow run publish-linux-repo.yml      -f tag_name=v0.9.1\n  ```\n\n## Validation\n- Both workflows parse cleanly; no stray `github.event.release`\nreferences remain.\n- Pure CI-workflow change — no product code touched.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-16T19:42:20+03:00",
          "tree_id": "5cc08032c6cbadb6990d8deca7e67e321feebc67",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/f5f246fb9713a023ef8c1eaf8f09ffbac6804b80"
        },
        "date": 1781629420338,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 291.69431325000517,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 293.964792650002,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "e433ec71c9651f07cb8109e848a97b4923a8d95b",
          "message": "feat(perf): wire up the sustained-drift detector (daily _perf-drift.yml) (#659)\n\n## Problem\n\nThe hybrid perf strategy (#642) shipped a complete sustained-drift\ndetector (`scripts/perf/drift-check.ts`) but **nothing invoked it** —\nthe alerting was dormant, and its issue-filing I/O wrapper was untested.\n\n## What this does\n\nActivates the detector via a new daily workflow and clears the four\n#642-deferred refactors so the unattended issue-filing path is **tested\nbefore it goes live**.\n\n- **`scripts/perf/history-jsonl.ts`** (new) — shared\n`parseLastHistoryLine`, now used by both `emit-benchmark-json.ts` and\n`drift-check.ts` (dedup).\n- **`GhCli.issueList` + `issueCreate`** — injectable, retry-wrapped,\n`--body-file`, mirroring the existing `prComment*` methods (so the\nupsert path becomes unit-testable).\n- **`drift-check.ts`** — `rollingMedian` → shared `medianOf`; gh issue\nops routed through the injectable `GhCli`; **one v2 sample per run**\n(`parseLatestV2Line`); **create-only** upsert (an already-open issue is\nleft untouched — no daily re-comment); lazy issue fetch (no issue API\ncalls unless a surface drifts); dropped the ad-hoc\n`ghSpawn`/`ghIssueList`.\n- **`.github/workflows/_perf-drift.yml`** (new) — daily `schedule`\n(06:00 UTC) + `workflow_dispatch`; workflow-level `permissions: {}`\ndefault-deny with minimal job grants (`contents:read`, `actions:read`,\n`issues:write`); idempotent `gh label create perf-drift --force`\n(because `gh issue create --label` fails on a missing label); runs the\ndetector over `gha-ubuntu` history. Advisory — never gates a build.\n\nThresholds are **untouched** (`k=7`, `n=3`, floor 10%, 14-run window).\nNo schema migration, no new security invariant. Issue resolution is\n**manual** in this phase (auto-close deferred — these are noisy trend\nsurfaces that would flap; see spec §9).\n\n## Tests\n\nNew: `parseLastHistoryLine` (4), `GhCli.issueList/issueCreate` (5),\n`runDriftCheckMain` wrapper (3, injected `GhCli` + staged artifacts —\nexercises the real download→parse→detect→create-only pipeline). Existing\n`detectDrift` (7) stay green through the `medianOf` swap.\n\n## Verification\n\nFull local pre-flight: 278 perf tests pass; typecheck clean (all\npackages); biome clean (2766 files); markdownlint clean. Coverage-floor:\nthe only floor-gated file touched (`bench-ci-gh.ts`) is not flagged; the\nCI-Linux coverage job is authoritative.\n\nSpec: `docs/superpowers/specs/2026-06-16-perf-drift-wiring-design.md` ·\nPlan: `docs/superpowers/plans/2026-06-16-perf-drift-wiring.md`. Both\nincorporate an external design + plan review.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-16T17:05:27Z",
          "tree_id": "57c3b20db99487d8177527e74c6aa5e561715479",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/e433ec71c9651f07cb8109e848a97b4923a8d95b"
        },
        "date": 1781630277828,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 308.8634498000047,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 310.42595180000205,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "3f84f16ba98c7e3ccc21645f2d81cb4758227cbc",
          "message": "chore(main): release 0.10.0 (#660)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n##\n[0.10.0](https://github.com/nimbus-agent/Nimbus/compare/v0.9.1...v0.10.0)\n(2026-06-16)\n\n\n### Features\n\n* **perf:** wire up the sustained-drift detector (daily _perf-drift.yml)\n([#659](https://github.com/nimbus-agent/Nimbus/issues/659))\n([e433ec7](https://github.com/nimbus-agent/Nimbus/commit/e433ec71c9651f07cb8109e848a97b4923a8d95b))\n\n\n### Bug Fixes\n\n* **ci:** publish package managers after Release uploads assets (kill\nthe asset-race)\n([#658](https://github.com/nimbus-agent/Nimbus/issues/658))\n([f5f246f](https://github.com/nimbus-agent/Nimbus/commit/f5f246fb9713a023ef8c1eaf8f09ffbac6804b80))\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Release**\n  * Version 0.10.0 is now available\n\n* **Bug Fixes**\n* Fixed a timing issue in the release process where package managers\ncould receive updates before release assets were fully prepared,\nensuring more reliable and consistent package distribution\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-06-16T20:35:49+03:00",
          "tree_id": "93813677cc98d5bb6f50c239f613a02e288f0d5a",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/3f84f16ba98c7e3ccc21645f2d81cb4758227cbc"
        },
        "date": 1781632052479,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 292.073363149997,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 288.1129804500066,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c4f12d382be6e8601858605089b664f7c5604e0c",
          "message": "feat(share): Phase 6 Slice 8a — Share foundation (I27 share-gate, verify-share, V41) (#661)\n\n## Phase 6 Slice 8a — Share & Virality foundation\n\nShips the foundation of the Share subsystem: the **first deliberate\noutbound data path** in Nimbus, behind new structural invariant **I27 /\nstatic D21**, migration **V41**.\n\nAn outbound share leaves the machine only through `share/share-gate.ts`\n`createShare()`: collect session → default+caller **redaction** → the\nLOCAL owner approves the **exact redacted preview bytes** via the\n`share.publish` HITL action (I2 frozen set) → **Ed25519 sign** with a\nVault-only key → persist to `share_records` → **audit-log** the applied\nredaction set. A denied/timed-out approval persists + signs + emits\n**nothing** (fail-closed). `verify-share` reuses the same codec.\n\n### What's here\n- **`share/` subsystem** — `share-redaction` (secrets + PII families +\ncaller patterns), `safe-fetch` (SSRF-guarded, documented DNS-rebind\nresidual), `share-keypair` (Vault-only `share.signing.*`),\n`share-format` (`nimbus-share/v1` codec: canonical body, BLAKE3 hash,\nsign/verify, **advisory** expiry), `share-store` (V41 CRUD),\n`share-gate` (the I27 chokepoint) + `share-consent-broker`,\n`verify-share`.\n- **Migration V41** — `share_records` ledger. `CURRENT_SCHEMA_VERSION` →\n41.\n- **Surfaces** —\n`share.{create,verify,list,get,pubkey,prune,approvalRespond}` IPC\n(`share.create`/`prune` LAN-forbidden); `nimbus share\n<create|list|prune|pubkey|approve|reject>` + `nimbus verify-share\n<file|url>` CLI; config-pinned `[share.http_sink]`; the 4 read-only\n`share.{get,list,pubkey,verify}` on the Tauri renderer allowlist\n(mutating methods stay CLI-only, I7).\n- **Invariant I27 / static D21** — runtime block in\n`security-invariants.test.ts` (`share.publish ∈ HITL_REQUIRED`;\nLAN-forbid of create/prune) + static confinement of the `share.publish`\nliteral, the `share.signing.privkey` Vault key, and the `createShare`\ncall site, plus an assemble-wiring assertion.\n- **Docs** — I27 + D21 in `SECURITY-INVARIANTS.md`, CLAUDE.md/GEMINI.md\ninvariant list, CHANGELOG.\n\nOut of 8a scope (Waves 8b–8d): recipe, replay, peer forwarding — the\n`forwarding` field ships inert.\n\n### Verification (all green)\n- typecheck (all packages), biome, markdown lint, all `audit:*` static\ngates, jscpd, js-licenses — ✓\n- build ✓ · unit **13151**, integration **358**, gateway-e2e **140**\n(incl. a real-gateway share create→approve→verify round-trip), cli-e2e\n**26** — 0 fail\n- **coverage-floor: ok** against a Docker-Linux-authoritative lcov\n(baseline `files: {}`; every share file clears ≥80% line+branch) ·\nlychee ✓\n- `origin/main` merged in (clean).\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **New Features**\n* Added `share` and `verify-share` CLI commands enabling users to\ncreate, list, verify, and manage shared session artifacts with HITL\napproval gating and PII redaction.\n* Share artifacts now support multiple sinks (file, HTTP, peer) with\nconfigurable HTTP endpoint via `[share.http_sink]` in `nimbus.toml`.\n* Added four new IPC read-only methods for renderer access:\n`share.verify`, `share.list`, `share.get`, `share.pubkey`.\n\n* **Documentation**\n* Documented security invariant **I27** defining the single outbound\nshare emission path with mandatory owner approval, Vault-only signing,\nand automatic PII redaction.\n\n* **Chores**\n* Database schema updated to v41 with new `share_records` ledger for\npersistent share storage.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-16T19:13:33Z",
          "tree_id": "8afc92a25b9a989e7b284fd0546ca9110ee3af5f",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/c4f12d382be6e8601858605089b664f7c5604e0c"
        },
        "date": 1781638444897,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 298.51003695000327,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 293.28471820000414,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "0adc755606273f86407af8135fe303a5ef0acdba",
          "message": "chore(sonar): cleanup 8 — clear 11 smells, cut duplication, raise coverage (#662)\n\n## Summary\n\nSonarCloud hygiene pass (cleanup 8). The quality gate on `main` was\nalready **PASS** (0 bugs, 0 vulns, 0 unreviewed hotspots) — this clears\nthe 11 outstanding `CODE_SMELL` findings, reduces duplication, and\nraises coverage on the most tractable partial file. Fix-not-exclude per\nrepo convention.\n\n## Issues cleared (11)\n- **3× S3776** (cognitive complexity): `parseNimbusConnectorsToml` →\n`accumulateConnectorTables` + `resolveConnectorConfig`;\n`assemblePlatformServices` → `buildTeamCredentialContexts` +\n`bootChatopsIntoAssembly` (the late-bound `identityBootRef` became a\nholder; the two duplicated identity spreads collapsed into one);\n`aggregateContributions` → `collectPeerItems`\n- **2× S6582**: optional-chain in `invoke-gate.ts` (I19/I26 load-bearing\n— behavior identical, invariants preserved)\n- **2× S7747**: dropped redundant array-spread in\n`embedding-worker-core` `idle()`\n- **2× S6353**: `\\w` over `[A-Za-z0-9_]` in `format-audit-payload`\n(`_`-boundary semantics preserved)\n- **S4325**: removed redundant `BonjourLike` type assertion\n- **S7781**: `replaceAll` over `replace(/'/g)` in snowflake `sfLiteral`\n\n## Duplication\n- Hoisted the byte-identical GitHub Actions I/O helpers\n(`safeString`/`safeInt`/`getInput`/`getBooleanInput`/`getIntInput`/`writeJobSummary`/`emitAnnotation`)\nplus a `makeSetOutput(allowedNames)` factory into a new\n`packages/github-actions/shared/gha-io.ts`. `preflight-query` +\n`annotate-action` import and re-export what their tests need; dist\nbundles rebuilt. Kills the 83%/81% `output.ts` and the `main.ts`\nscaffolding twins.\n- `monte-carlo/search-filter` now uses the shared `fieldsFromKeys`\n(drops its duplicate `stringAt`/`fieldsOf`), matching the\nbitrise/codemagic pattern.\n\n## Coverage\n- `connector.ts` **91.2% → 95.6%**: real behavior tests for the\n`relTime`/`fmtNextSync` time buckets, `truncateText`, `fmtHealthRetry`,\nand flag-value validation edges.\n- `assemble-sync-registrations.ts` (53%) intentionally **not** chased —\nit is explicitly excluded from the coverage floor as boot wiring-glue,\nand covering its ~95 connector closures would require running 95 real\nsync paths for zero gate value.\n\n## Validation\n- Full sequential typecheck (all packages) ✓\n- Gateway full suite (10006 pass) + CLI (1693) + monte-carlo + gha (55)\n✓\n- Security-invariant structure audit (I19/I22/I25) ✓\n- **Docker Linux-authoritative coverage-floor: ok** (1002 files scanned)\n✓\n- Biome (`bunx biome check packages scripts`, 2765 files) ✓\n- Independent code review of the diff: no blocking issues ✓\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n* **Refactor**\n* Centralized GitHub Actions input/output, annotations, and job\nsummaries into a shared module; updated related actions to re-use shared\nhelpers.\n* Refined Nimbus TOML connector parsing/validation and improved gateway\ncontribution aggregation; extracted helpers across related query and\nassembly flows.\n* **Bug Fixes**\n* Tightened fine-grained GitHub credential redaction patterns and\nimproved Snowflake single-quote escaping.\n* **Tests**\n* Expanded CLI list/auth edge-case tests (time/health buckets,\nformatting, truncation) and added shared action utility unit tests.\n* **Documentation / CI**\n* Updated link checking to use an API token and improved CI coverage for\nshared action utilities.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-16T22:26:57+03:00",
          "tree_id": "e53ab24ae3f641469c1211f607821cdcba069244",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/0adc755606273f86407af8135fe303a5ef0acdba"
        },
        "date": 1781639235082,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 299.2876376000007,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 297.1360037499915,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "0870362301fecd1c6742c799ece667edf1d8f671",
          "message": "fix(ci): session-memory getRecentTurns must not require sqlite-vec (share e2e I27) (#664)\n\n## Problem\n\nThe I27 share e2e redaction round-trip (`approved create redacts PII,\nsigns, writes the file; verify reports a VALID signature`) fails\n**identically on all 3 OS legs** of the push-to-`main` matrix (run\n27642549323). It is a logic bug, not a platform flake.\n\nThe written share body carried `\"turns\":[]`, `\"toolCalls\":[]`,\n`\"redactionSet\":[]`, so redaction had no PII to strip and the\n`expect(fileText).toContain(\"[REDACTED]\")` assertion failed.\n\n## Root cause\n\n`SessionMemoryStore.getRecentTurns` gated on `ensureReady()`, which\nrequires the **optional sqlite-vec extension** to load\n(`ensureSqliteVecForConnection`). On CI runners with no sqlite-vec\nprebuilt and no `vec0.*` sidecar, the read short-circuited to `[]` —\neven though the seeded `session_memory` rows were present and the\n`SELECT` touches only the `session_memory` table, never a vec virtual\ntable.\n\nThe unit suite is `describe.skipIf(!VEC_AVAILABLE)`, so it's silently\nskipped on those runners — only the unguarded e2e test caught the\nregression. The sibling reads (`listSessions`, `deleteSession`)\ncorrectly gate on table existence (`user_version >= 10`) only.\n\n## Fix\n\nGate `getRecentTurns` on `readIndexedUserVersion(this.db) < 10` (table\nexistence) only, mirroring `listSessions()`/`deleteSession()`. The vec\ndependency was spurious for this read.\n\nThis also restores **platform equality** (Non-Negotiable #5):\nsession-transcript recall now works on any box at schema V10, regardless\nof whether the optional vec extension loaded.\n\n## Verification\n\n- `bun test packages/gateway/src/memory/session-memory-store.test.ts\npackages/gateway/test/e2e/share-e2e.test.ts` → 23 pass / 0 fail.\n- `bun run preflight:fast` → PASSED (typecheck, biome, all static\naudits, duplication).\n- The `version < 10 → []` unit case is preserved.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Bug Fixes**\n* Improved session memory retrieval to work reliably without requiring\noptional extension support, ensuring consistent access to session data\nacross all environments and configurations.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-16T22:24:17Z",
          "tree_id": "a2ef6254478c58f0754bb6f6028d441af44d3533",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/0870362301fecd1c6742c799ece667edf1d8f671"
        },
        "date": 1781649390917,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 316.8974438500041,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 318.5835399999974,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "5993765bb97b1058676e7ecde34b112d4ed33c87",
          "message": "perf: Phase 2 (Bencher) — advisory trend ingest (soak alongside github-action-benchmark) (#666)\n\n## Summary\n\nPR-1 of the **Perf Strategy Phase 2 (Bencher)** plan. Adds **advisory**\nBencher Cloud trend ingest that runs **alongside** the existing\n`github-action-benchmark` (g-a-b) dashboard during a soak window. The\nin-code `gateClass` comparator stays the **sole** gate — Bencher never\nblocks a merge.\n\n- Spec:\n`docs/superpowers/specs/2026-06-16-perf-phase2-bencher-design.md`\n- Plan:\n`docs/superpowers/plans/2026-06-16-perf-phase2-bencher-phase1.md`\n\n## What's in it\n\n- **`packages/gateway/src/perf/bencher-bmf.ts`** (+ tests) — pure\n`HistoryLine → Bencher Metric Format` mapper (floor-gated, 100%\nline+branch). Unlike the g-a-b emitter it emits **all** metric kinds, so\nthe throughput/tokens trend surfaces (S6/S8/S9/S10) get charted for the\nfirst time.\n- **`scripts/perf/emit-bencher-bmf.ts`** (+ tests) — thin CLI; reuses\n`parseLastHistoryLine` + `toBencherBmf`.\n- **`.github/workflows/_perf.yml`** — Bencher install/emit/publish steps\n(push + same-repo PR, **all matrix legs as separate testbeds**), behind\na `BENCHER_API_KEY`-presence guard + fork-PR skip + empty-BMF skip;\nevery step `continue-on-error: true`. g-a-b steps untouched (parallel\nsoak). Adds `checks: write` for Bencher's advisory check run.\n- **`.github/workflows/_perf-reference.yml`** — dormant\n`reference-m1air` ingest (activates only once that self-hosted runner is\nprovisioned).\n- CHANGELOG entry.\n\n## Advisory guarantee\n\nNo Bencher threshold is configured, and every Bencher step is\n`continue-on-error: true`, so a Bencher/SaaS outage can never red the\nperf job. PRs are still gated solely by the in-code `gateClass`\ncomparator.\n\n## Manual ops prerequisites (operator)\n\nThe Bencher steps **skip cleanly** until `BENCHER_API_KEY` exists, so\nthis PR can merge before or after setup:\n1. Create the public Bencher project `nimbus`.\n2. Pre-create the 5 measures with correct direction\n(latency/memory/first_token ↓; throughput/tokens ↑).\n3. Add a project-scoped `bencher_run_*` key as the `BENCHER_API_KEY`\nGitHub secret.\n\n## Migration\n\nPR-2 (after a ~2-week / ~10-push soak) retires g-a-b and archives the\n`perf-data` branch. Drift-check (`_perf-drift.yml`) is unaffected.\n\n## Verification\n\nScoped tests 14/14 · gateway typecheck clean · biome clean · `regen-slo\n--check` green · coverage-floor: `bencher-bmf.ts` 100/100 · markdownlint\nclean · CI-exact jscpd 3.53% < 5% · whole-branch review APPROVED ·\nrebased onto current `main` (post Slice 8a + sonar-8).\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n* **New Features**\n* Added Bencher Cloud advisory trend ingest to performance workflows,\ngated by secret availability and non-empty emitted reports.\n* Introduced conversion of benchmark run-history data into Bencher\nMetric Format (BMF) for reporting.\n\n* **CI/CD**\n* Updated performance jobs with required permissions and job-level\nBencher API key handling for reliable conditional execution.\n\n* **Tests**\n  * Added unit and CLI pipeline tests for BMF conversion and emission.\n\n* **Documentation**\n* Documented the Bencher Phase 2 design and added a changelog entry for\nthe new soak behavior.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-17T02:01:43+03:00",
          "tree_id": "dd4fcb1963d36d8234cee4283128072f9f3eefcd",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/5993765bb97b1058676e7ecde34b112d4ed33c87"
        },
        "date": 1781651620608,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 302.4616851500017,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 300.2180640499955,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "4bf93f1c9016b031d3d4614c1e5c7efe0feb7bbd",
          "message": "chore(main): release 0.11.0 (#667)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n##\n[0.11.0](https://github.com/nimbus-agent/Nimbus/compare/v0.10.0...v0.11.0)\n(2026-06-16)\n\n\n### Features\n\n* **share:** Phase 6 Slice 8a — Share foundation (I27 share-gate,\nverify-share, V41)\n([#661](https://github.com/nimbus-agent/Nimbus/issues/661))\n([c4f12d3](https://github.com/nimbus-agent/Nimbus/commit/c4f12d382be6e8601858605089b664f7c5604e0c))\n\n\n### Bug Fixes\n\n* **ci:** session-memory getRecentTurns must not require sqlite-vec\n(share e2e I27)\n([#664](https://github.com/nimbus-agent/Nimbus/issues/664))\n([0870362](https://github.com/nimbus-agent/Nimbus/commit/0870362301fecd1c6742c799ece667edf1d8f671))\n\n\n### Performance Improvements\n\n* Phase 2 (Bencher) — advisory trend ingest (soak alongside\ngithub-action-benchmark)\n([#666](https://github.com/nimbus-agent/Nimbus/issues/666))\n([5993765](https://github.com/nimbus-agent/Nimbus/commit/5993765bb97b1058676e7ecde34b112d4ed33c87))\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **New Features**\n  * Version 0.11.0 released with new features\n\n* **Bug Fixes**\n  * Includes bug fixes for improved stability\n\n* **Performance Improvements**\n  * Enhanced performance optimizations included\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-06-17T02:28:35+03:00",
          "tree_id": "dc41268175873382be98808cf53a83c5fbc67203",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/4bf93f1c9016b031d3d4614c1e5c7efe0feb7bbd"
        },
        "date": 1781653224941,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 305.2101312999981,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 302.21301004999805,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "3da460991b487b68fad2ea1febc9c32a148db807",
          "message": "fix(ci): gitleaks allowlist synthetic TestFlight PEM fixture (#670)\n\n## Summary\n\nAdds `packages/gateway/src/connectors/lazy-mesh/phase3-config.test.ts`\nto the `.gitleaks.toml` path allowlist.\n\n## Why\n\nThe lazy-mesh phase-3 connector spawn test sets a **synthetic**\nTestFlight credential:\n\n```ts\nawait vault.set(\"testflight.private_key\", \"-----BEGIN PRIVATE KEY-----\\nabc\\n\");\n```\n\nThe `-----BEGIN PRIVATE KEY-----` header trips gitleaks' default\n`private-key` rule on the full-history/all-refs scan, but the body is\nthe literal `abc` — **never a real key**. This is the same\nfalse-positive class already handled for four other fixture files\n(secret-patterns.test.ts, gateway-log-file.test.ts, etc.), so it gets\nthe same durable **path-based** allowlist (fingerprint pins break on\nsquash-merge — see the config header).\n\nThe fixture was introduced on a coverage branch and surfaced gitleaks\nfailures across unrelated PRs (e.g. a docs-only PR) because the scan\ncrosses refs. Landing the allowlist on `main` clears it for every branch\non update.\n\nNo code change; one path added to the existing allowlist.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Chores**\n* Updated security scanning configuration to accommodate test fixtures\ncontaining synthetic credentials.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-06-17T08:02:41+03:00",
          "tree_id": "f3c0c889087f92099db03147caae667b1739b06b",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/3da460991b487b68fad2ea1febc9c32a148db807"
        },
        "date": 1781673193551,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 232.36495715000018,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 230.5147353999957,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "170841b3915cf4975c2017f8769a845ee2e1865b",
          "message": "docs(roadmap): defer perf surfaces S3 + S5 to Phase 13 (#668)\n\n## Summary\n\nMoves the two stubbed perf-bench UX surfaces **S3 (dashboard first\npaint)** and **S5 (HITL popup paint)** into **Phase 13 (Desktop\nDistribution)**, as a checklist item under \"Desktop Release Vehicle.\"\n\n## Why\n\nBoth surfaces are stubbed with the same reason — `\"renderer\ninstrumentation pending (Tauri perf marks)\"`\n(`packages/gateway/src/perf/surfaces/bench-dashboard-first-paint.ts` +\n`bench-hitl-popup.ts`, both return `[]` → `samples_count=0 →\nskipped(stub)`). Faithful first-paint timing requires the **launchable\nTauri desktop UI**, which is deferred to Phase 13 — so these belong with\nthe desktop-distribution work, not the headless perf-strategy\nworkstream.\n\nFor contrast, the sibling **S4 (TUI first paint)** is *already\nimplemented* (it times the Ink terminal UI's `[tui] first-frame`\nmarker), and is unaffected.\n\nThe new item records what closing S3/S5 entails (instrument the renderer\n→ emit paint marks → implement the drivers → drop the stubs → confirm\n`gateClass`) and notes their thresholds are already pinned in\n`slo-thresholds.ts`. Closing them completes the S1–S11 surface set so\nthe reference runner can gate the full roster.\n\nDocs-only; one line added to `docs/roadmap.md`.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Documentation**\n* Updated Phase 13 desktop distribution roadmap with new performance\noptimization tracking items for desktop performance work.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-06-17T08:04:10+03:00",
          "tree_id": "3e71ff0515b32e8b62427ce2cdd091abf30c7dac",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/170841b3915cf4975c2017f8769a845ee2e1865b"
        },
        "date": 1781673805304,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 269.95864529999596,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 271.02410279998946,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "bb54d74388978f9ffce30de8b50aaf3d678628ba",
          "message": "chore(sonar): cleanup 9 — clear all 16 smells, cut top duplication, raise coverage, right-size exclusions (#669)\n\n## Summary\n\nA focused quality pass: **all 16 SonarCloud maintainability smells\nfixed**, the **four biggest duplication offenders deduped**, **coverage\nraised** (~760 new test assertions) with `sonar.coverage.exclusions`\nright-sized so the metric is measured over testable code, plus a\n**Windows `bun test` hang fix**.\n\n> Based on `dev/asafgolombek/fix-share-e2e-getrecentturns-vec` (PR #664)\nso the I27 share e2e passes in CI. That one-commit base (`5c686952`)\ndedupes once #664 merges.\n\n## Maintainability (16/16 smells → 0)\nAll were in the Slice-8a share code: S3358 nested ternaries (extracted\nshared `util/code-unit-compare.ts`; cli share-sink → early-return\nhelper), S7735 negated conditions, S4325 redundant casts, S5843\nover-complex `ips` regex (split IPv4/IPv6 under one family), S6397\n`[\\w]`→`\\w`, S6594 `match`→`exec`, S6551 `String`→`JSON.stringify`,\nS7780 `String.raw`.\n\n## Duplication (toward <0.1%)\n- Extracted a generic `ConsentBroker<TInput>` base — the Share (I27) and\nPreflight (I24) brokers were ~42–43% byte-identical; now thin\nsubclasses.\n- `warehouse-write-tools` (57.7%) → single-line builder per entry,\npreserving the I26 SSoT.\n- `oauth-registry` → `standardAuthorizeParams` + `pkceAuthorizeParams`\nhelpers collapse the repeated `buildAuthorizeParams` blocks across 8\nproviders.\n- `lan-client` → `makeSettler` (the settled+timeout+finish guard shared\nby the one-frame and two-frame exchanges).\n\n## Coverage (~91.3% → ~96.5% line / ~94.5% Sonar-blended)\n- ~760 new additive test assertions (no source logic changed):\nphase3-config 86→100%, discord-sync 88→99%, connector-spawns 95→97%,\nscheduler 86→93%, `tryDispatchShareRpc` 0%→covered (+data/tribal),\n`serializeHealthSnapshot` 0%→covered, connector-rpc-handlers/auth\nprovider arms, http-server DORA/preflight/SCIM/OPTIONS edges,\ninstall-from-local I16 fail-closed arms, cli connector flag/help/env\npaths, connector-shared `search-filter` 53→100%.\n- **Right-sized `sonar.coverage.exclusions`**: folded in the\nstructurally-untestable 0% surfaces already exempt from the per-file\nfloor — per-OS Vault PAL (`win32`/`darwin`),\n`assemble-sync-registrations`, the VS Code extension + admin-console\nUIs, GitHub-Action entrypoints, and the gateway build/terminate scripts\n— so the 97% target is measured over testable code. Registry\n(`exclusions.ts`) + parity samples updated; `audit:exclusion-parity`\ngreen (49 patterns).\n\n## Windows bun-test hang fix\nThe consent-broker TTL timer called `timer.unref()`. An awaited promise\nsettling from an `unref`'d `setTimeout` spins `bun test` forever on\nWindows (the TTL fail-closed tests await exactly that). Dropped the\n`unref` (gateway is long-lived; added `ConsentBroker.clear()` for\nshutdown/`afterEach`). The originally-hanging combined share+cli+ipc\nrun: hang → 502ms / 92 pass.\n\n## Verification (local, before push)\n- `bun run preflight:fast` → green (typecheck, biome, all audits, jscpd,\nexclusion-parity).\n- `bun run build` → green.\n- Full suite in Docker `oven/bun:latest` (Linux-authoritative) → **0\nfailures**.\n- `audit:coverage-floor` against the Docker lcov → **ok, 0 violations**\n(1015 files scanned).\n- Exclusion-adjusted line coverage from the Docker lcov: **96.55%** (CI\nwill be higher — local build omits `mcp-connectors/shared`, which CI\ncovers).\n\nThe exact Sonar coverage/duplication/smell numbers will be confirmed by\nthe CI Sonar scan on this PR.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n## Release Notes\n\n* **New Features**\n  * Added Discord connector for syncing server and message data.\n* Extended CLI argument support with short-flag aliases and improved\nhelp output.\n* Expanded OAuth provider support and phase-3 connector capabilities\nacross multiple services.\n\n* **Improvements**\n* Enhanced authentication error handling and environment variable\nfallback logic for various services.\n  * Improved CLI command formatting and validation for edge cases.\n* Refactored consent and share approval workflows for better\nmaintainability.\n\n* **Bug Fixes**\n  * Fixed IPv4 address extraction logic in safe fetch operations.\n* Corrected environment variable handling for warehouse write\noperations.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-17T05:43:22Z",
          "tree_id": "deed870114dd6feba0e667dc66c8edf39a508e4f",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/bb54d74388978f9ffce30de8b50aaf3d678628ba"
        },
        "date": 1781675771201,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 276.9426746500052,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 277.75554134999913,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "f4a9a75d6a07bb787675973c8411d9b1c0a27eef",
          "message": "chore(sonar): cleanup 9 follow-up — land the share-subsystem smell fixes + coverage/dedup orphaned by #669 (#672)\n\n@\n## Why\n\nPR #669 (\"cleanup 9 — clear all 16 smells…\") was **squash-merged but\nonly captured part of the branch**. The squash commit `bb54d743` on\n`main` does **not** touch a single `share/*` file, so SonarCloud still\nreports **16 open code smells** — all in the Slice 8a share subsystem —\ndespite the #669 title claiming they were cleared.\n\nThe fixing commit `ae48ff33` (\"clear all 16 share-subsystem\nmaintainability smells\") — plus several coverage/dedup/build-lcov\ncommits — live on the branch but never reached `main`. #669 is already\nmerged/closed, so this is a fresh PR to land the orphaned work.\n\n## What this lands\n\n- **`ae48ff33`** — clears all 16 SonarCloud share-subsystem smells:\n- **S3358** nested ternaries → extract shared `codeUnitCompare` into\n`util/code-unit-compare.ts` (kills the `share-format.ts` +\n`share-redaction.ts` duplicates) + de-nest the CLI share-sink ternary\n  - **S7735** negated conditions → positive share-sink resolution\n  - **S4325** redundant type assertions dropped in `share-format.ts`\n  - **S6551** default stringification → explicit in `share-rpc.ts`\n  - plus S5843 / S6397 / S6594 / S7780\n- Coverage/test additions (`connector.test.ts`, `discord-sync.test.ts`,\n`connector-spawns.test.ts`, `scheduler.test.ts`, etc.), `ConsentBroker`\ndedup, warehouse-write dedup, the `build-lcov` TS port, and\n`sonar-project.properties` exclusion right-sizing — all of which also\ndid not make it into #669.\n\n## Verification\n\n- `ae48ff33` recorded share unit tests (69) + `preflight:fast` green at\ncommit time.\n- CI on this PR is the authoritative gate — Sonar should flip the 16\nshare smells to resolved once `main` is re-analyzed post-merge.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n@\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n# Release Notes\n\n* **Tests**\n* Enhanced Windows-specific test coverage for path resolution and\ncross-drive scenarios.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-17T06:28:51Z",
          "tree_id": "d22e891adac549f7fddcae02f9d00ba9577d7c98",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/f4a9a75d6a07bb787675973c8411d9b1c0a27eef"
        },
        "date": 1781678942873,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 278.4447009000014,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 277.0601232000019,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "8c3bbb35f2dad3b250943de2b39dfa4b0204beaa",
          "message": "refactor(dedup): Stage A — gateway paginated-sync helper (#673)\n\n## Stage A — gateway paginated-sync helper\n\nFirst PR of the [jscpd duplication-reduction\nprogram](docs/superpowers/specs/2026-06-17-jscpd-duplication-reduction-design.md).\n**Pure dedup, zero behavior change.**\n\n### What\nExtracts the byte-identical single-pass paginated connector-sync\nscaffolding into a new gateway-internal helper\n`packages/gateway/src/connectors/_lib/paginated-sync.ts`:\n- `runSinglePassPaginatedSync<C>(ctx, cursor, spec)` — owns the\n`performance.now()` timing, noop-on-unconfigured-creds, the page loop\nwith first-page `http_error`/`parse_error` degradation, the per-item\nmap+upsert loop, and the pass-1 success return. Threads an opaque\n`pageCursor` (`\"\"` → previous page's `nextPageCursor`) so it covers\n**both** page-number and continuation-token connectors.\n- `upsertMapped(ctx, items, map)` — the per-connector `upsert*` loop.\n- `bareArrayPage(parsed, pageSize)` — the bare-array page parser.\n\nEach connector keeps only what genuinely varies (constants, creds,\nper-page path/auth, response parsing, the mapping fn) and delegates via\na thin `createXSyncable`.\n\n### Connectors migrated (20)\ngreenhouse, readwise, stackoverflow, hubspot (exemplars) + airflow,\ncanva, dependencytrack, intercom, lever, miro, mlflow, netlify,\npipedrive, prefect, raindrop, salesforce, stripe, vercel, zendesk,\nzotero.\n\n**Deferred (1):** `superset` — its pre-loop login step accumulates bytes\nand returns a distinct http-empty result on auth failure, which the\nsingle-pass helper's byte-accounting doesn't model (force-fitting would\nchange `bytesTransferred`). Left untouched.\n\nThe 9 larger Tier-2 multi-resource syncs (databricks, dbt, flagsmith,\nlaunchdarkly, mendeley, ramp, semgrep, sonarqube, wiz) remain for a\nseparate Stage A2 plan.\n\n### Measurement (strict = `bunx jscpd packages`, baseline @ `5993765b`)\n| | clones | strict % |\n| --- | --- | --- |\n| before | 711 | **5.51%** |\n| after | 648 | **5.09%** |\n\nThe `zotero-sync.ts` centroid dropped from **85 clones → 0** — the whole\nzotero-partner sync clique collapsed. The residual hotspots are now the\nMCP `server.ts` family (Stage B), oauth-registry (Stage D), and the\ncli↔gateway type pair (Stage E).\n\nThe **CI duplication gate** (`pr-quality-duplication`, lenient\n`--min-lines 10 --threshold 5`) improves **3.53% → 3.25%** and stays\ngreen. **The gate is NOT tightened in this PR** — that lands in the\nprogram's final stage once strict is under 3% with margin.\n\n### Verification\n- No behavior change: every connector's `*-sync-fake-server.test.ts`\nguardrail stays green **unedited** — full connector integration suite\n**254 pass / 0 fail**.\n- New helper has 14 dedicated unit tests covering every branch.\n- No `any` (external payloads stay `unknown` at the boundary); gateway\n`tsc --noEmit` clean; Biome clean.\n- Coverage-floor (Docker-Linux authoritative): **green** —\n`paginated-sync.ts` and all migrated connectors clear the ≥80%\nline+branch floor.\n- Whole-branch adversarial review: no real defects (the one flagged\n\"tightening\" of salesforce/hubspot stop conditions exactly reproduces\neach original's `length === 0 ||` break — verified).\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n* **Documentation**\n* Added design specification and implementation plan for code\nduplication reduction across gateway connectors.\n\n* **Refactor**\n* Consolidated paginated synchronization logic for 20 gateway connectors\ninto a shared utility, reducing duplicate code while maintaining\nexisting behavior and functionality.\n\n* **Tests**\n* Added comprehensive test suite for paginated sync utilities with\nin-memory SQLite harness.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-17T09:56:06+03:00",
          "tree_id": "d4585267901a074f9b8b6f7adad766363000f48e",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/8c3bbb35f2dad3b250943de2b39dfa4b0204beaa"
        },
        "date": 1781680166542,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 268.46059334999444,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 268.4895493999975,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c6ebd1dc885d1c358ee2920c0b8755f562ba7b2d",
          "message": "chore(main): release 0.11.1 (#674)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n##\n[0.11.1](https://github.com/nimbus-agent/Nimbus/compare/v0.11.0...v0.11.1)\n(2026-06-17)\n\n\n### Bug Fixes\n\n* **ci:** gitleaks allowlist synthetic TestFlight PEM fixture\n([#670](https://github.com/nimbus-agent/Nimbus/issues/670))\n([3da4609](https://github.com/nimbus-agent/Nimbus/commit/3da460991b487b68fad2ea1febc9c32a148db807))\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Bug Fixes**\n* Fixed TestFlight certificate handling in the continuous integration\npipeline.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-06-17T07:14:31Z",
          "tree_id": "471527c9497c13d77e37a1a34e5633c030debad5",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/c6ebd1dc885d1c358ee2920c0b8755f562ba7b2d"
        },
        "date": 1781681218745,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 302.8520562500038,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 305.03910519999374,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "fde67189a6bca3e2289f522eb981d1560d5de768",
          "message": "fix(test): remove real-resolver connector-spawns twin that reds the combined run (#675)\n\n## Problem\n\n`main` CI (macOS **Unit + Coverage** push job, [run\n27670264249](https://github.com/nimbus-agent/Nimbus/actions/runs/27670264249/job/81832818842))\nis red on two tests:\n\n- `ensureSlackMcp > no-op when no token (resolver throws → caught)`\n- `ensureSlackMcp > no-op when slack.oauth is present but malformed\n(resolver throws → caught)`\n\nBoth assert `setClients.length === 0` but get `1` — `ensureSlackMcp`\nspawned despite an absent/malformed token.\n\n## Root cause\n\n#672 added a **src-tree**\n`packages/gateway/src/connectors/lazy-mesh/connector-spawns.test.ts`\nthat drives `ensure*Mcp` through the **real** `getValid*AccessToken`\nresolvers. But sibling unit tests — the legacy\n`test/unit/.../connector-spawns.test.ts`, `slack-sync.test.ts`, and\n`google-drive-sync.test.ts` — `mock.module` those same resolvers, and\n**`mock.module` is process-global**.\n\nIn the combined `bun test packages/gateway` push job, the leaked slack\nmock returns a token regardless of vault state, so `ensureSlackMcp`\nspawns and the \"resolver throws → caught\" assertions fail.\n(`ensureSlackMcp` is the only `ensure*` without a real-vault\n`readConnectorSecret` pre-gate, so it's the one that breaks first.)\n\nPRs stayed green because the PR gate runs `bun test\npackages/gateway/src` (src-only), which **excludes** the mocking files —\nso the real resolver actually runs there.\n\n## Fix\n\nThe conflict is irreducible: any process-global mock of a resolver\nbreaks a real-resolver twin sharing the process, and the twin can't get\nthe real resolver back. The canonical mock-based `test/unit` file\nalready covers `connector-spawns.ts` at **95.3% line / 94.8% branch**\n(>80% floor) and is combined-run-safe, so the real-resolver twin is\nredundant.\n\n- Removed\n`packages/gateway/src/connectors/lazy-mesh/connector-spawns.test.ts`.\n- Added a header comment on the canonical file documenting why no\nreal-resolver twin may be re-added.\n\n## Verification\n\n- `bun test packages/gateway/src/connectors\npackages/gateway/test/unit/connectors` → 3964 pass, 0 fail.\n- Canonical file: 99 pass; biome clean.\n- `connector-spawns.ts` coverage from the canonical file alone: 95.3%\nline / 94.8% branch (measured via the istanbul preload) — comfortably\nabove the 80% floor; no source touched, so no file can drop below floor.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-17T07:44:04Z",
          "tree_id": "db5c65257475454c8c1449a67a158dbf8dd858eb",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/fde67189a6bca3e2289f522eb981d1560d5de768"
        },
        "date": 1781683076934,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 286.7576237999998,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 290.5428350000002,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "8f346bacba57e80c052cf64dabd43803372a0f5c",
          "message": "chore(main): release 0.11.2 (#676)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n##\n[0.11.2](https://github.com/nimbus-agent/Nimbus/compare/v0.11.1...v0.11.2)\n(2026-06-17)\n\n\n### Bug Fixes\n\n* **test:** remove real-resolver connector-spawns twin that reds the\ncombined run ([#675](https://github.com/nimbus-agent/Nimbus/issues/675))\n([fde6718](https://github.com/nimbus-agent/Nimbus/commit/fde67189a6bca3e2289f522eb981d1560d5de768))\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Bug Fixes**\n* Resolved an issue affecting the combined test execution that was\nimpacting test reliability.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-06-17T11:17:07+03:00",
          "tree_id": "84bfda82b893a5f83ae36a904d981286d471f800",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/8f346bacba57e80c052cf64dabd43803372a0f5c"
        },
        "date": 1781684919214,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 292.6883137500019,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 291.92522464999854,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "429eae5b30c1825f13a01c1138a9baa666d1102c",
          "message": "docs(roadmap): re-sequence Phase 7+ into a three-track spine overlay (#677)\n\n## What\n\nRe-sequences everything from **Phase 7 onward** in `docs/roadmap.md` for\n**time-to-value × differentiation (moat)** — via a new **\"Phase 7+\nSequencing Spine\"** overlay, not a renumber (the doc cross-links phase\nnumbers everywhere). Also injects four new ideas.\n\nThis is a **docs-only** change. No code, schema, invariants, or\nconnectors touched.\n\n## Why\n\nRead against the time-to-value + moat lenses, the existing 27-phase list\nhad three structural problems:\n- The deepest-moat work (Verifiable Negatives / Unexfiltratable Agent /\nProvable Governance — things a cloud relay *structurally cannot* do) sat\nat Phases 22–26, behind ~14 phases of connector breadth, even though\nseveral of their primitives are cheap.\n- The biggest 2026-model lever (computer-use / code-exec / runtime\ntool-gen — Phase 14) sat mid-list.\n- One linear list conflated near-term product with a long-range research\nmanifesto.\n\n## The three tracks\n\n- **Track 1 — Near-Term Spine (S1→S5):** harvest cheap moat primitives\nearly (egress ledger + `nimbus prove` → S1), pull the 2026-model levers\nforward (→ S2), demote API-fakeable connector breadth (Phase 8/9, Phase\n7 W1–3) to S5.\n- **Track 2 — Scale & Surface:** productization/distribution;\nDesktop/Mobile flagged independent-slot.\n- **Track 3 — Research Horizon:** the M-number manifesto (21–27) stays\nin full, but its cheap primitives are harvested into the spine (egress\nledger → S1, overnight local sub-agent fleet → S2).\n\n## Four new ideas\n\negress-ledger-as-S1-primitive · overnight local sub-agent fleets\n(zero-marginal local compute) · BYO-frontier-model routing with local\nfallback · **Nimbus as a local MCP server** (the private index as an\nendpoint Claude Code / Cursor connect *to*).\n\n## Review incorporated\n\nA design review (committed alongside) was addressed in full:\n- **MCP server** defaults to **stdio** (no network port); HTTP/SSE\nvariant must honor I6 bind + I5 `LanServer` checks + I10 pairing-token\nauth + I13 write-gate.\n- **Egress-ledger attribution corrected** — it's a **Phase 8**\ndeliverable (`prove` is the P7 W6 surface), not P22; pulling them\ntogether to S1 also resolves a pre-existing P7-reads-P8 ordering oddity.\n- **Phase 7 Wave 4** (previously unplaced) split across S1/S4/S5/Track\n2.\n\n## Notes\n\n- All 96 docs files lint clean (`markdownlint-cli2`).\n- Overlay preserves every existing \"composes-with\" cross-reference\n(numbers + prose unchanged).\n- Rationale of record:\n`docs/superpowers/specs/2026-06-17-roadmap-phase7-plus-resequence-design.md`.\n- Minor unrelated tidy: a stale `_perf.yml` line citation fixed in the\nPhase-2 Bencher spec.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n* **Documentation**\n* Updated the product roadmap with a three-track Phase 7+ sequencing\nspine, preserving existing phase numbers while redefining build order.\n* Added design specifications and implementation guidance for Phase 7+\nre-sequencing, including new roadmap initiatives and clarified placement\nacross key phases.\n* Refreshed performance testbed documentation for the ingest test step\nconfiguration/line-range references.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-17T15:30:48+03:00",
          "tree_id": "0b955d529cbe34404b8a0f71e0316f112040f311",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/429eae5b30c1825f13a01c1138a9baa666d1102c"
        },
        "date": 1781700168075,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 297.60171259999623,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 299.19493250001176,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "49132b5eec697615b08464cede135411db9f2eb9",
          "message": "refactor(dedup): Stage B1 — MCP search-tool scaffolding → shared/ (44 connectors) (#678)\n\n## Stage B1 of the jscpd duplication-reduction program\n\nSecond stage after Stage A (#673). Extracts the cloned MCP connector\n**search-tool scaffolding** into two shared helpers and sweeps the\ncanonical-shape connectors to use them. **Pure dedup — zero behavior\nchange.**\n\n### What changed\n- **New** `packages/mcp-connectors/shared/mcp-search-tool.ts` (+ unit\ntest):\n- `searchToolInputSchema(maxLimit = 100)` — collapses the inline `{\nquery, limit }` zod schema; the cap is **parameterized** so each\nconnector's exact limit (100/200/500/50/1000/2000) is preserved.\n- `matchesResult(rows, filter, opts)` — collapses the `Array.isArray(X)\n? filter(X, …) : [] → jsonResult({ matches })` tail; a verbatim\nequivalent.\n- **44 connectors swept** across 6 batches (schema-collapse and/or\ntail-collapse per each connector's audited shape).\n- **4 connectors deliberately skipped (no force-fit):** `dbt`,\n`flagsmith`, `flux` (extra schema field **and** no `Array.isArray` guard\n→ neither helper applies) and `zoom` (custom `ZoomSearchOptions` filter\ntype, tsc-incompatible with the generic helper under\n`exactOptionalPropertyTypes`).\n\n### Design correction vs. the parent design\nTarget is **`mcp-connectors/shared/`**, not `@nimbus-dev/sdk`: the MCP\nstdio bootstrap is already deduped (`run-read-only-mcp-connector.ts`)\nand `shared/` is the established 19-file precedent for\nconnector-internal helpers (avoids a new SDK export + the coverage-floor\nratchet).\n\n### Measurement (strict `bunx jscpd packages`, min-lines 5 / threshold\n3)\n- **4.98% → 4.83%** (637 → 604 clones). The zotero search clique\ncollapsed: `zotero/server.ts` **21 → 0** clones; MCP `server.ts` family\ninvolvements **313 → 247**.\n- Modest %-move as the design predicted for the search sweep (small\nper-clone line count); the bigger Stage-B clusters (email twins,\nREST/Graph blocks) are deferred to later slices.\n- **CI lenient duplication gate NOT tightened** (final program stage):\ncurrently **3.16%** vs threshold 5% — green.\n\n### Verification (all green, run before first push)\n- Full `mcp-connectors` suite: **804 pass / 0 fail** — **no connector\ntest file edited** (only the new helper test added).\n- Full monorepo typecheck (`typecheck:no-docs`): clean. Per-connector\ntsc clean for all 44.\n- Biome (`packages scripts`): clean. Static invariant audit: clean.\n- Docs gates (markdownlint + lychee on spec/plan): clean.\n- Whole-branch review: **READY**, no Critical/Important findings.\n\nSpec:\n`docs/superpowers/specs/2026-06-17-jscpd-stage-b1-search-tool-scaffolding-design.md`\nPlan:\n`docs/superpowers/plans/2026-06-17-jscpd-stage-b1-search-tool-scaffolding.md`\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n* **Refactor**\n* Standardized MCP search tool input validation and match-result\nformatting across 40+ connectors using shared search utilities,\nimproving consistency while preserving existing search behavior and\nresponse shape.\n* **Tests**\n* Added a dedicated test suite for the shared search-tool helpers to\nverify input validation, filtering behavior, and normalized `{ matches:\n[...] }` output.\n* **Documentation**\n* Added implementation plan and design specification documents covering\nthe duplication-reduction approach and rollout/testing/verification\nsteps.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-17T16:02:54+03:00",
          "tree_id": "1245e08f4dc2f03ce5fd0c620cd35954585db649",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/49132b5eec697615b08464cede135411db9f2eb9"
        },
        "date": 1781702164939,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 282.9595293999984,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 276.62135420000925,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "97573bdc2423d8687a974ccc08ad4d5f26da15df",
          "message": "feat(share): Phase 6 Slice 8b — recipe (--as-recipe declarative DAG, V42 params) (#679)\n\n## Phase 6 Slice 8b — Recipe\n\nSecond wave of Share & Virality (after 8a foundation, PR #661). Adds\n`nimbus share <session> --as-recipe`: a **deterministic, LLM-free\ndeclarative tool-call DAG** reconstructed from a session's logged tool\ncalls, redacted + signed through the **existing I27 share-gate** — no\nnew invariant, no new emit path.\n\nSpec:\n`docs/superpowers/specs/2026-06-15-slice8-share-virality-design.md` §7\n(amended — see below). Plan:\n`docs/superpowers/plans/2026-06-17-slice8b-recipe.md`.\n\n### What's in it\n- **Migration V42** — `tool_call_log.params_json` (nullable, no\nbackfill). Tool-call input params are now durably logged,\n**secret-redacted at write** via `redactAuditPayload` (the audit_log\nprecedent), with a **valid-JSON guarantee** (a `{truncated:true}`\nsentinel on overflow — never a broken string).\n- **`share/recipe.ts`** — `buildRecipeFromSession(db, sessionId, now)`:\nordered steps (`called_at ASC`) + an **advisory `dependsOn`\nvalue-matcher** (identifier-shaped leaf values in B's params appearing\nin A's result envelope; trivial scalars create no edge). `dependsOn` is\nnever load-bearing.\n- **`share/recipe-yaml.ts`** — deterministic YAML serializer (`js-yaml`,\na declared gateway dep). `verify-share` now accepts **YAML or JSON**,\nre-canonicalizing the body so verification is format-independent (no\nbypass; the dependency-light `verifyShareBytes` primitive stays\nJSON-only).\n- **Gate** — `createShare` gains a `kind:\"recipe\"` branch: redacts the\nrecipe **at the gate**, sets `body.recipe`, omits `turns`/`toolCalls`.\n**I27 fully preserved** (same `share.publish` HITL approval + audit +\nVault-signing); `collectSession` is skipped on the recipe path.\n\n### Invariants / schema\n- **No new invariant.** I27 / static D21 unchanged — recipe is just\nanother `body.kind` through the existing chokepoint.\n`security-invariants` 83/83; structure-audit exit 0.\n- **Spec amendment:** 8b now owns **V42**; 8d's `share_inbox` shifts\n**V42 → V43** (updated across spec §9/§10/§13, CHANGELOG,\narchitecture.md).\n\n### Verification (full local CI-parity before first push)\n- tsc (all packages) · biome · structure-audit (I27/D21) ·\nsecurity-invariants 83/83 · markdownlint · js-licenses · cross-platform\n· doc-refs (603 refs) · lychee · CI duplication gate **3.15% < 5%**.\n- **Coverage-floor: ok** via Docker-Linux-authoritative lcov (pristine\n`{}` baseline; new `share/recipe*.ts` + V42 sql all clear ≥80%\nline+branch).\n- Tests: share unit + integration + **e2e recipe round-trip** (real\ngateway subprocess: create `--as-recipe` → owner HITL approve → verify),\nall green.\n- Built subagent-driven (fresh implementer + two-stage review per task)\n+ a final whole-branch review on Opus (READY TO MERGE; the one Important\nfinding — a >4KB param-truncation invalid-JSON bug — was fixed in\n`af12b915`).\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n## New Features\n* Added recipe-based sharing: `nimbus share <session> --as-recipe` now\ngenerates deterministic YAML recipe files with secret-redacted tool-call\nparameters.\n* Share payload improvements for recipe kind: recipe shares omit\ntranscript fields and persist recipe-specific content end-to-end.\n* Updated output behavior: file-based share emission supports\n`.yaml`/`.yml` for recipe shares.\n\n## Bug Fixes\n* Improved tool-call logging persistence: tool-call input params are now\nstored/restored via migration V42 with safe truncation handling.\n\n## Documentation\n* Updated schema/architecture and changelog entries for Phase 6 Slice 8b\nand migration V42.\n\n## Tests\n* Added unit and e2e coverage for recipe round-trips and YAML\nverification.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-17T14:10:14Z",
          "tree_id": "1b35b97d4def2882c248fb24aa18b54fccce56b9",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/97573bdc2423d8687a974ccc08ad4d5f26da15df"
        },
        "date": 1781706221635,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 286.8438506999988,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 286.917365600005,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "93270cad4eae8c14330ca67c09947d692ecc18e8",
          "message": "fix(test): add --timeout 30000 to all coverage shards (Windows flake) (#681)\n\n## Problem\n\n`main` reddened on the push of #679 ([run\n27695190115](https://github.com/nimbus-agent/Nimbus/actions/runs/27695190115))\n— two Windows coverage shards failed:\n\n- **Coverage — Metrics (windows-2025)** — `metrics-dora-route`\n`beforeEach` timed out at 6114ms\n- **Coverage — DB layer (windows-2025)** — 5 `db/snapshot` tests timed\nout at ~5000ms\n\n## Root cause\n\nOne trap (the documented PR #541 issue): `bunfig.toml`'s `[test] timeout\n= 30000` is **not honored** when Bun runs as `bun test <explicit\npaths>`, which is how every `test:coverage:*` script runs. So all\ncoverage shards silently fall back to Bun's bare **5000ms** hook\ndefault. On a cold/slow `windows-2025` runner, heavy `beforeEach` DB\nsetup (full migration seeds) exceeds 5000ms and the hook times out.\nLocal Windows/macOS never reproduce (~400ms warm).\n\n## Fix\n\nAppend `--timeout 30000` to all 28 `bun test`-based `test:coverage:*`\nscripts in root `package.json`, restoring the intended 30s timeout at\nthe script level (skips the vitest-based\n`test:coverage:vscode-extension`). This is the durable, systematic fix —\nthe same 5000ms exposure existed for every shard, not just the two that\nflaked this run.\n\nTest-script flags only — no source, no thresholds, no test logic\ntouched.\n\n## Verification (local)\n\n- `bun run test:coverage:db` → 80 pass / 1 skip / 0 fail\n- `bun run test:coverage:metrics` → 50 pass / 0 fail\n- `package.json` validated as parseable JSON\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Chores**\n* Updated test execution timeout configuration for improved test\nstability and reliability.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-17T17:59:23+03:00",
          "tree_id": "ea7f0500f57479b3aa9945705a07b9bd008770c2",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/93270cad4eae8c14330ca67c09947d692ecc18e8"
        },
        "date": 1781709487981,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 294.1720810000061,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 288.74416960000525,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "e6cbfff9b4fdb173b3f650e8f1f98c494b985c43",
          "message": "fix(sonar): clear last 2 S7735 negated-condition smells (#683)\n\n## What\n\nSonarCloud audit of `nimbus-agent_Nimbus` showed the project is in\nexcellent shape — gate green, 0 bugs / 0 vulnerabilities / 0 security\nhotspots, 93.8% coverage, 0.2% duplication, all A ratings. The **only**\nopen issues were 2 minor `typescript:S7735` (\"unexpected negated\ncondition\") code smells.\n\nThis flips both ternaries to put the positive branch first — **no\nbehavior change**:\n\n- `stripe-sync.ts` — `nextId` computation\n- `vercel-sync.ts` — `nextPageCursor` computation\n\nTakes the project to **0 open issues**.\n\n## Verification\n\n- `bunx biome check` on both files — clean\n- `bun test` stripe-sync + vercel-sync fake-server integration suites —\n15 pass / 0 fail\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n## Release Notes\n\n* **Refactor**\n* Internal optimization of pagination cursor computation in sync\nconnectors with no impact on user-facing functionality.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-17T17:53:22Z",
          "tree_id": "22ee9e7561f68b5c5907fcfab46da7fb2c89e146",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/e6cbfff9b4fdb173b3f650e8f1f98c494b985c43"
        },
        "date": 1781719730773,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 305.7816108999985,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 307.98770365000235,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "8535f4db75a68806806813131e7fb0a34327fba7",
          "message": "feat(share): Phase 6 Slice 8c — replay (verify-share --replay, recipe-runner) (#684)\n\n## Phase 6 Slice 8c — Replay\n\nAdds **`nimbus verify-share <file|url> --replay`**: a deterministic,\nLLM-free local re-execution of a shared recipe's (or a transcript\nshare's) tool calls, classifying each step against the shared original\ninto a divergence report — *\"watch what ran on their data run on\nyours.\"*\n\nPer-step outcomes: `match` / `diverged` / `missing-connector` /\n`skipped-non-read` / `error`, plus a summary.\n\nImplements spec §8\n(`docs/superpowers/specs/2026-06-15-slice8-share-virality-design.md`);\nrealizes the spec's `share verify --replay` intent via the\nalready-shipped `verify-share` command (no duplicate verify surface).\nPlan: `docs/superpowers/plans/2026-06-17-slice8c-replay.md`.\n\n### What's new\n- **`share/read-tool-registry.ts`** — the security-load-bearing\n**POSITIVE** read-only allowlist (`isReadOnlyToolId`): a step runs only\nif its tool is positively classified read-only by connector read-verb\nnaming (`*_list`/`*_get`/`*_query`/`*_search` + a curated read surface),\n**never** by \"absent from `HITL_REQUIRED_BACKING`.\" A write tool missing\nfrom the HITL set is still skipped.\n- **`share/recipe-runner.ts`** — `stepsFromShare` (normalizes recipe or\ntranscript → ordered steps; fail-safe on malformed input),\n`replayRecipe` (per-step classification, executor invoked only past the\nread-only gate, never consults `dependsOn`), `replayShare` (entry\npoint).\n- **`share.replay` RPC** + `verify-share` loader/parse helpers\n(`loadShareBytes`, `parseShareFile`); mesh-backed `listReplayTools` ctx\ndep wired in `assemble.ts`.\n- **CLI** `verify-share --replay` + a pure `formatReplayReport`\nrenderer.\n- **E2E** recipe-replay round-trip (create `--as-recipe` → approve →\nreplay).\n\n### Safety / scope\n- **No new invariant, no migration** (schema stays V42). **I27/D21\nuntouched** — no new `share.publish` / `share.signing.privkey` /\n`createShare` references; `security-invariants` 83/83 unchanged.\n- Replay is **read-only + LLM-free**: never re-invokes the LLM, never\nfires a write/HITL action. The read-only guarantee is proven by a unit\nsecurity test (real classifier; both a HITL-absent write `acme_destroy`\nand a HITL-present write `snowflake_tag_set` are skipped, only\n`gmail_get` executes) and the e2e.\n- Deterministic: same share + same connector outcomes → identical\nreport.\n\n### Verification (all green before first push)\ngateway+cli tsc 0 · biome clean · structure-audit (D21) exit 0 ·\nsecurity-invariants 83/83 · unit (share/registry/runner/rpc) green ·\nintegration 354 pass / 0 fail · e2e 4/4 · cross-platform clean ·\nmarkdownlint 0 · CI-jscpd 3.18% (<5%) · js-licenses ✅ · lychee ✅ ·\n**Docker-Linux coverage-floor: ok** (new files clear ≥80% line+branch) ·\nwhole-branch opus review = ready-to-merge.\n\nBuilt subagent-driven (fresh implementer + two-stage review per task +\nopus whole-branch review). Deferred-Minor follow-ups (test-comment\npolish, etc.) tracked in the plan; the 3 FIX-NOW review items\n(parseShareFile `sig` null-guard, e2e handler cleanup,\nreverse-divergence assertion) are applied.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n* **New Features**\n* Added `--replay` to `nimbus verify-share <file|url>` to\ndeterministically re-run shared recipe/transcript tool calls locally and\nprint signature validity/expiry plus a per-step divergence report\n(`match`, `diverged`, `missing-connector`, `skipped-non-read`, `error`).\n* Implemented `share.replay` gateway support with read-only enforcement\nvia a positive allowlist.\n* **Bug Fixes**\n* Improved CLI robustness for local share loading (graceful failures and\ncorrect exit codes).\n* **Documentation**\n* Updated Phase 6 (Slice 8c) changelog and architecture/spec/review\nnotes for replay.\n* **Tests**\n* Added unit and end-to-end coverage for replay reporting,\nparsing/loading, dispatcher behavior, and read-only classification.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-06-17T18:20:07Z",
          "tree_id": "c1afcd41577dbe35bee2df6dc0e222151b89fa26",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/8535f4db75a68806806813131e7fb0a34327fba7"
        },
        "date": 1781721290410,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 299.99145104999695,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 299.9659380500005,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "3cc765d43521ecf8c86da23de2d8c3bdfff2f96c",
          "message": "chore(main): release 0.12.0 (#682)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n##\n[0.12.0](https://github.com/nimbus-agent/Nimbus/compare/v0.11.2...v0.12.0)\n(2026-06-17)\n\n\n### Features\n\n* **share:** Phase 6 Slice 8b — recipe (--as-recipe declarative DAG, V42\nparams) ([#679](https://github.com/nimbus-agent/Nimbus/issues/679))\n([97573bd](https://github.com/nimbus-agent/Nimbus/commit/97573bdc2423d8687a974ccc08ad4d5f26da15df))\n* **share:** Phase 6 Slice 8c — replay (verify-share --replay,\nrecipe-runner)\n([#684](https://github.com/nimbus-agent/Nimbus/issues/684))\n([8535f4d](https://github.com/nimbus-agent/Nimbus/commit/8535f4db75a68806806813131e7fb0a34327fba7))\n\n\n### Bug Fixes\n\n* **sonar:** clear last 2 S7735 negated-condition smells\n([#683](https://github.com/nimbus-agent/Nimbus/issues/683))\n([e6cbfff](https://github.com/nimbus-agent/Nimbus/commit/e6cbfff9b4fdb173b3f650e8f1f98c494b985c43))\n* **test:** add --timeout 30000 to all coverage shards (Windows flake)\n([#681](https://github.com/nimbus-agent/Nimbus/issues/681))\n([93270ca](https://github.com/nimbus-agent/Nimbus/commit/93270cad4eae8c14330ca67c09947d692ecc18e8))\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **New Features**\n  * Two new features added to v0.12.0.\n* **Bug Fixes**\n  * Two bug fixes included in v0.12.0 release.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-06-17T22:49:32+03:00",
          "tree_id": "089e24157d426874ee3a1af83ac464a145abb0ec",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/3cc765d43521ecf8c86da23de2d8c3bdfff2f96c"
        },
        "date": 1781726503967,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 284.9386581500024,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 285.2832019000074,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "4d2881d8cffba96c65690ca5f364ff0d72e25ae4",
          "message": "docs+chore: status-drift sweep + status-drift/sha-pin gates + workflow hardening (#685)\n\nSingle PR consolidating the docs / skills / scripts / CI / workflow\nimprovements from this session's audits (kept to one PR by request).\n\n## 1. Docs & skills — kill the status drift\nThe repo had moved to **v0.11.2 / schema V42 / invariant I27 / Phase 6\nnearly complete**, but the docs lagged at v0.6.1 / V40 / I26.\n\n- **CLAUDE.md, GEMINI.md, README, SECURITY.md** —\nrelease/version/badges/supported-versions corrected.\n- **architecture.md** — verbose status block → one-line CHANGELOG\npointer (per convention); `I1–I26`→`I1–I27`; added static rules\n`D18–D21`; `WRITE_ROUTE_ALLOWLIST` 5→**6**; Tauri allowlist count →\n**94**; added the Share subsystem.\n- **SECURITY-INVARIANTS.md** — allowlist size `74`→**94**; \"Current\nceiling\" header; worked example `I18`→`I28`.\n- **cli-reference.md** — **new `nimbus share` (Sharing) section** (the\nwhole Slice-8 surface was undocumented); completed the LAN\nforbidden-namespace list.\n- **Skills** — new **`nimbus-share-virality`** skill; `nimbus-file-map`\ngains the Phase-6 subsystems + CLI rows; `nimbus-architecture` IPC\nnamespace table + phase line; fixed `I1–I23`→`I1–I27`;\n**`nimbus-preflight` now states the Sonar quality gate IS blocking** (it\nwas documented as non-blocking — it `exit 1`s on ERROR) + a \"can't\nreproduce locally\" guide.\n\nAll counts verified against code (`gateway_bridge.rs` = 94,\n`http-write-routes.ts` = 6, `CURRENT_SCHEMA_VERSION` = 42,\n`security-invariants.test.ts` max = I27).\n\n## 2. New preventive gates (wired into preflight fast tier + the static\nCI job)\n- **`audit:status-drift`** — keeps the doc status surfaces in sync with\nthe canonical invariant (`I<N>`) + schema (`V<N>`) read from code. *This\nprevents the exact drift this PR fixes from recurring.*\n- **`audit:action-sha-pins`** — asserts every third-party `uses:` is a\nfull 40-hex SHA. Guards the **org-level SHA-pinning requirement** so an\nunpinned ref is caught locally, not at run time.\n\nBoth ship with unit tests (10 new, all green); the preflight drift test\npasses.\n\n## 3. Real bug found en route\n`share` + `verify-share` are dispatched in `index.ts` but were **missing\nfrom `registry.ts`'s `COMMAND_NAMES`** — caught by `audit:readme-cli`\nonce the README referenced `nimbus share`. Now registered.\n\n## 4. Misc workflow hardening\n- Local convenience wrappers: `audit:secrets` (gitleaks), `audit:links`\n(lychee).\n- Pinned floating `ubuntu-latest` runners → `ubuntu-24.04`;\n`labeler.yml` `pull_request_target` guard comment.\n- Deleted dead scripts `bump-deps.ts`, `spike-darwin-sandbox-exec.sh`.\n\n## Deferred (higher-risk, noted for a focused follow-up)\nThe 26-leg `coverage-gates` matrix dedup, a per-OS-setup composite\naction, and the macOS/Windows runner **image** bumps — these carry real\nCI-behavior risk (and the matrix one could weaken coverage enforcement),\nso they're intentionally out of this otherwise-low-risk PR.\n\n## Verification\n`bun run preflight:fast` — **all 18 gates green** (incl. the 2 new\nones). Full `typecheck`, `lint`, `lint:markdown`, `audit:doc-refs`\nclean. New audit tests + `registry.test.ts` + share CLI tests pass.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n## Release Notes\n\n* **New Features**\n* Share & Virality subsystem shipped: `nimbus share` command for\ncreating session shares with redaction, signing, and owner-gated\npublication\n  * New share verification and records management capabilities\n\n* **Documentation**\n* Phase 6 progress updated (Slices 1–8 shipped, security invariants\nthrough I27, schema V42)\n  * Expanded CLI reference with complete sharing command documentation\n* Enhanced security policy covering outbound share gates and LAN access\ncontrols\n\n* **Chores**\n  * Updated CI/CD workflows to use Ubuntu 24.04\n  * Added audit tooling for status consistency and security scanning\n  * Removed legacy scripts\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-17T23:03:24+03:00",
          "tree_id": "f93dd9b6b77a638f3605bb3ee0cee10e95a26cf0",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/4d2881d8cffba96c65690ca5f364ff0d72e25ae4"
        },
        "date": 1781727594575,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 310.197267450003,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 308.11195645000555,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "90dbf13769cbef10204022d41244139c767b905c",
          "message": "chore: housekeeping bundle — architecture.md drift + @mastra/core 1.43 + dep hygiene (#686)\n\n## Summary\n\nA low-risk housekeeping bundle from a docs/tech/architecture audit.\nThree buckets: documentation drift, dependency hygiene, and stale test\nfixtures. No production code behavior changes.\n\n### Docs (`docs/architecture.md`)\n- Promote the **Data Warehouse / Orchestration / BI & ML** section from\n\"Phase 5/6 — planned\" → \"Phase 6 Slice 7 — shipped\"; name the live\nconnector roster (delivery dates stay in `CHANGELOG.md` per convention).\n- Replace the placeholder write-tool names (`warehouse.job.trigger`, …)\nwith the **12 real wired warehouse/BI HITL action types**\n(`snowflake.tag.set` … `bigeye.issue.resolve`), pointing at\n`WAREHOUSE_BI_WRITES` / `HITL_REQUIRED_BACKING` in `engine/executor.ts`.\n\n### Dependencies\n- **`@mastra/core` 1.40.0 → 1.43.0**, **`@mastra/mcp` 1.9.1 → 1.10.0**\n(root `overrides` + gateway aligned). Resolves a silent conflict where\nthe override pinned a version *below* the gateway's declared `^1.41.0`,\nso the gateway was resolving 1.40.0 despite asking for ≥1.41.0.\n- **`@types/bun`: `\"latest\"` → `\"^1.3.14\"`** across\ngateway/cli/sdk/client — removes an unpinned surface that can redden CI\non a clean install with zero source change.\n- **astro** docs floor `^6.4.4` → `^6.4.7`; **esbuild**\n(vscode-extension) `^0.28.0` → `^0.28.1` — align declared floors with\nthe enforced override.\n\n### Test fixtures\n- Refresh stale model ids: `claude-opus-4-7` → `claude-opus-4-8`;\n`claude-3-5-sonnet-20241022` / `claude-3` → `claude-sonnet-4-6`.\nCosmetic; round-trip assertions preserved.\n\n## Verification\n- `bun run preflight` (full): typecheck (all packages) ✅, build ✅, **all\n18 static gates** ✅ (incl. `audit:doc-refs`, `audit:status-drift`), 666\ntargeted tests (engine+agents 518, config/fixtures 148) ✅.\n- Mastra 1.40→1.43 is clean — our `anthropic/<model>` string interface\ninsulates us from the AI-SDK v5/v6 provider churn underneath.\n- **One known non-blocking flake:** the full local `test:ci` recorded a\nsingle timeout in an unrelated connector-OAuth test (`auth.test.ts`) at\n~5012ms under full-suite load. It passes **14/14 @ ~200ms in isolation**\n(3× confirmed); root cause is the pre-existing Windows full-suite\ntimeout flake (`run-tests.ts` runs `bun test <paths>`, which doesn't\nhonor bunfig's `timeout=30000` — see PR #541). Unrelated to this diff;\nLinux CI runs with proper timeouts.\n\n## Risk\nDocs + `package.json`/lockfile + test-fixture strings only. The sole\nruntime-affecting change is the Mastra minor bump, verified above.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Documentation**\n* Updated architecture documentation to reflect that Data Warehouse,\nOrchestration, BI & ML connectors are now live and production-ready.\n\n* **Chores**\n  * Updated core and MCP dependencies to latest compatible versions.\n* Pinned development dependencies for improved build stability across\nmultiple packages.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-18T08:52:05+03:00",
          "tree_id": "f716e88d0af97a43c461bd70ad3d76a5f7b36b04",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/90dbf13769cbef10204022d41244139c767b905c"
        },
        "date": 1781762643291,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 305.60598839999875,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 305.8665765500024,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "18131cf9d9499614d20b10421e5c511086942618",
          "message": "feat(share): Phase 6 Slice 8d — sovereign-mesh referral (forwarding, provenance, V43 inbox) (#687)\n\n## Phase 6 Slice 8d — Sovereign-Mesh Referral (forwarding)\n\nCloses Slice 8 and **Phase 6 (Team)**. A paired gateway owner can\nforward a received share to their own peers over the existing\nauthenticated, peer-pubkey-pinned federation NaCl wire, with an\nimmutable, origin-verifiable provenance hop-chain, an attribution chip,\nand a deferred-reveal inbox that drains on first pair.\n\nSpec:\n`docs/superpowers/specs/2026-06-15-slice8-share-virality-design.md` §9 ·\nPlan: `docs/superpowers/plans/2026-06-17-slice8d-referral.md` (15-task\nTDD, subagent-driven; each task individually reviewed + an opus\nwhole-branch review).\n\n### Security model — reuses I27, **no new invariant**\n- **Two outbound-share chokepoints, both behind the owner's\n`share.publish` HITL** (I2 frozen set): `createShare` (origin emit) and\nthe new `forwardShare` (re-forward). A deny/timeout forwards + queues\nnothing (fail-closed).\n- **Static D21 extended** (not a new invariant): a new\n`D21-forwardshare-callsite` rule confines `forwardShare` to\n`share-forward.ts` + `ipc/federation-rpc.ts`, and `share.publish` may be\nnamed in `share-forward.ts`. Invariant range stays **I1–I27**.\n- **Immutable inner / advisory envelope:** a forwarder never mutates\n`body`/`sig` (byte-identical across hops). Each hop signs `contentHash\n++ its own label+pubkey ++ prior-chain` with the gateway's **own Ed25519\nshare key** (no new Vault key). A tampered hop fails its own sig while\ncontent verification stays valid.\n- **Inbound is inert:** `receiveForwardedShare` only sig-verifies +\nstores into `share_inbox` — no execution, no index-merge, no embedding,\nno HITL. A forged-body inbound share is rejected.\n- `federation.shareForward` is **LAN-forbidden** (local-only);\n`federation.shareReceive` is **answerable**.\n\n### What's included\n- `share/share-forwarding.ts` (hop append/verify),\n`share/share-forward.ts` (`forwardShare` + `receiveForwardedShare`),\n`share/share-inbox-store.ts`, `share/attribution.ts`\n- **V43 `share_inbox`** migration (additive; deferred-reveal queue +\ninert received inbox)\n- `federation.shareForward` / `federation.shareReceive` / `share.inbox`\nIPC; `nimbus share forward|inbox` CLI; `share.inbox` on the Tauri\nallowlist (read-only, count 94→95)\n- Drain-on-first-pair via a fully-guarded `PeerPairing.onPairComplete`\nseam (a drain failure never crashes pairing)\n- `verify-share` surfaces an advisory `forwarding` chain result without\naffecting content validity\n- Real-NaCl-wire e2e (two in-process gateways) proving forward → inert\nreceive → attribution → chain-verify, plus the pairing-driven drain seam\n\n### Verification (all green, pre-push)\ntsc (gw+cli) · biome · static invariants (D21+D12) · security-invariants\n83/83 · structure-audit · integration 354/0-fail · share e2e 9/0 ·\n**coverage-floor OK, 0 baselined (Docker-Linux authoritative — every new\nfile ≥80% line+branch)** · CI-jscpd <5% · js-licenses · cross-platform ·\nlychee · doc-refs · readme-cli · markdown · status-drift ·\naction-sha-pins.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n## Release Notes\n\n* **New Features**\n* Share forwarding over the federation wire with cryptographic hop-chain\nverification and fail-closed behavior.\n* New **Share inbox** to view inert (replayable) received forwarded\nartifacts.\n* CLI updates: added `nimbus share forward`, `nimbus share inbox`, and\nimproved share verification output.\n\n* **Documentation**\n* Updated security invariant and architecture specs for forwarding,\napproval gating, and LAN restrictions.\n  * Phase 6 (Team) marked complete; changelog/roadmap updated.\n\n* **Chores**\n* Upgraded local database to **schema v43** with `share_inbox` storage\nand migrations.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-06-18T11:51:49+03:00",
          "tree_id": "0dead459455343ff196756c454b4a326b8edd6f6",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/18131cf9d9499614d20b10421e5c511086942618"
        },
        "date": 1781773717092,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 286.9105905999968,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 288.5339495999906,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "3860f91eabec5a8a7804c5fc8d8b0868006b9ad4",
          "message": "chore(main): release 0.13.0 (#689)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n##\n[0.13.0](https://github.com/nimbus-agent/Nimbus/compare/v0.12.0...v0.13.0)\n(2026-06-18)\n\n\n### Features\n\n* **share:** Phase 6 Slice 8d — sovereign-mesh referral (forwarding,\nprovenance, V43 inbox)\n([#687](https://github.com/nimbus-agent/Nimbus/issues/687))\n([18131cf](https://github.com/nimbus-agent/Nimbus/commit/18131cf9d9499614d20b10421e5c511086942618))\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **New Features**\n  * Added share functionality\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-06-18T12:26:21+03:00",
          "tree_id": "931b3d3377b08ed4712f594980b29fa54346ed69",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/3860f91eabec5a8a7804c5fc8d8b0868006b9ad4"
        },
        "date": 1781775457627,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 288.7711030000035,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 290.498602700005,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "1cb4e63123e762959b9009df37b5b5c48d442f5d",
          "message": "refactor(dedup): big-PR duplication reduction — 10 clusters + coverage-infra fix + gate ratchet (#688)\n\n## Summary\n\nOne-big-PR continuation of the jscpd duplication-reduction program.\nExtracts 10 high-leverage duplicate clusters into the correct home per\ndependency rules, fixes a coverage-instrumentation gap, and ratchets the\nCI duplication gate.\n\n**Strict `bunx jscpd packages` (min-lines 5 / threshold): 4.83% →\n4.41%** (568 clones, ~550 dup-lines removed). Program-wide: 5.51% (Stage\nA start) → 4.41%.\n\n> **Scope note (deliberate):** the standing target is **< 3%**, but the\nresidual is dominated by (a) parts deferred for behavior-fidelity and\n(b) connector-template parallelism the project already treats as\nintentional (Sonar-CPD-excluded), plus one documented un-dedupable twin\n(`gateway-process` ↔ `gw-state-helpers`). Reaching < 3% requires\nwholesale connector-template restructuring — a separate future project.\nThis PR therefore **ratchets** the gate at the achieved strict % rather\nthan tightening to the not-yet-met < 3%.\n\n## What landed\n\n**Wave 0 — coverage-infra fix:** `scripts/coverage/instrument-scope.ts`\nnever instrumented `mcp-connectors/shared/` (regex required a `/src/`\nsegment), so shared-helper coverage reported 0% to SonarCloud — the gate\nthat reddened #678. One-line fix mirroring the sibling `GHA_SRC`.\n\n**10 dedup clusters (pure dedup, zero behavior change — every existing\nconnector/sync/command test stays green unedited):**\n\n| Cluster | Extraction | Home |\n| --- | --- | --- |\n| C1 | identical agent-brief types | `@nimbus-dev/sdk` |\n| C2 | gateway email-mapping `clamp`/`parseDateMs` | gateway `_lib` |\n| C3 | CLI-shell single-pass sync (cloud-logging, vertex-ai) | gateway\n`_lib` |\n| C3b | per-app build-poll sync (bitrise, codemagic, testflight) |\ngateway `_lib` |\n| C4 | cli `awaitAgentBrief`/`renderAgentBrief` + flag-parsing | cli\n`lib` |\n| C5 | federation consent gate-commons + `auth` string-helper | gateway\n`federation/_lib` (I17/D13-safe) |\n| C6 | IMAP/JMAP email tool-kit (imap, protonmail, fastmail) |\n`mcp-connectors/shared/` |\n| C7 | REST fetch helper (github, github-actions, gmail, outlook) |\n`mcp-connectors/shared/` |\n| C8 | data-profile parsing (gateway↔mcp) | `@nimbus-dev/sdk` |\n| C9 | fastmail JMAP request/response parsing (~88L, largest pair) |\n`@nimbus-dev/sdk` |\n| C10 | flux-cd + storybook parsing | `@nimbus-dev/sdk` |\n\n**Gate ratchet:** CI `pr-quality-duplication` now runs `bunx jscpd\npackages` (reads `.jscpd.json` — min-lines 5, so local == CI), threshold\nratcheted `3 → 4.5` (catches regressions; stricter than the prior\nmin-lines-10/threshold-5 gate; lowered as further dedup lands).\n\n## Deferred (behavior-fidelity / no-force-fit — documented, not lost)\ncloudwatch/sagemaker/athena sync (async per-item enrichment breaks\nbyte-accounting); onedrive/gitlab REST (divergent auth); the\nimap/protonmail server `*Client` class bodies (different interfaces);\ngoogle-meet/photos sync (GET-param vs POST-body); localdb\n`collectSqlFiles` (file I/O).\n\n## Verification\n- Per-cluster TDD with a fresh implementer + reviewer gate each (9\ncluster reviews + a whole-branch integration review = **SHIP**).\n- I17/D13 independently verified (static audit exit 0,\nsecurity-invariants 83 pass, `gate-commons` imports no\n`item-list-query`).\n- SDK purity verified (no fs/network/process in hoisted modules; I/O\nstays in callers). No `any`. No new jscpd ignores. Dep rules intact (no\nsdk→gateway/cli; mcp→sdk only).\n- Strict email-tsconfig tsc loop green for every `shared/` change; full\n`bun run typecheck` clean; biome clean.\n- Coverage-floor (Docker-Linux): the one real regression\n(`data-profile-mapping.ts` branch, from C8) fixed with a co-located\ntest; remaining floor warnings are the known false-local I/O-shell\nfiles.\n- Docs gates (markdownlint + lychee) green.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **New Features**\n* Consolidated shared CLI agent utilities for consistent brief handling\nand error reporting.\n* Added shared data-profiling and JMAP/email connector libraries to\nreduce duplication.\n\n* **Refactor**\n* Simplified CLI commands by moving common helpers to shared libraries.\n  * Reorganized connector sync implementations to use reusable patterns.\n* Migrated core type definitions to SDK for consistency across packages.\n\n* **Documentation**\n* Added comprehensive deduplication initiative plan and design\nspecifications.\n\n* **Tests**\n* Added extensive test coverage for new shared utilities and CLI\nbehaviors.\n\n* **Chores**\n  * Updated CI duplication scanning to use centralized configuration.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-18T12:56:31+03:00",
          "tree_id": "4c94bcc770db56dcf711404a6d5607783bc81f68",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/1cb4e63123e762959b9009df37b5b5c48d442f5d"
        },
        "date": 1781777425378,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 299.8316753499941,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 301.81688375000596,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "5613f7d337ca67080ec61d35400f1b4204b65bd1",
          "message": "docs: launch & community readiness — root README, launch plan, demo spec, SECURITY policy (#690)\n\n## What & why\n\nPublic-launch readiness for Nimbus. A readiness audit found the **code\nand messaging are launch-ready; the public surfaces weren't** — chiefly\nno root README, no zero-config try-it path, and the security policy not\nsurfaced. This PR closes the documentation/surface gaps so we can launch\nwithout burning first impressions.\n\n## Changes\n\n- **`README.md` (new, root)** — the keystone repo landing page.\nCLI-first (desktop is deferred to Phase 13), with tagline, quickstart\n(signed install per OS), a fully-offline-with-Ollama path, the\nthree-pillar positioning, security/trust, community links, and AGPL/MIT\nlicensing. Install commands + tagline mirror the live docs.\n- **`.github/SECURITY.md` (new)** — short stub so GitHub actually\nsurfaces the Security policy (it credits root/`.github/`, not `docs/`).\nLinks to the full `docs/SECURITY.md` + `nimbus-security`; no internal\nlinks broken, no content duplicated.\n- **`docs/superpowers/specs/2026-06-18-launch-and-community-plan.md`** —\nthe strategy: fix-then-fire sequencing, Phases 0–3, per-audience angles,\nmetrics. Flags the docs' desktop-vs-CLI inconsistency to resolve before\nposting.\n- **`docs/superpowers/specs/2026-06-18-demo-mode-design.md`** — design\nfor a zero-config `nimbus demo` (sample-data, offline, retrieval-only\nLLM fallback) so the local-first pitch is true on first run. (Spec only;\nnot implemented.)\n- **`docs/superpowers/specs/2026-06-18-launch-posts.md`** — tailored,\nready-to-queue posts (Show HN, Product Hunt, per-sub Reddit, Lobsters,\nX/Mastodon, dev.to).\n\n## Already live (org-side, separate from this PR)\n\n- Org-wide default community-health files added to\n`nimbus-agent/.github` (SECURITY/CoC/CONTRIBUTING/PR template + issue\nconfig) — all repos now inherit them.\n- MIT licenses + discoverability topics added to `homebrew-tap` /\n`scoop-bucket` / `linux-repo`.\n\n## Notes\n\n- Docs-only; no code touched. `markdownlint-cli2` passes on all changed\nfiles.\n- Private ecosystem repos are intentionally staying private (per\ndecision), so no public surface links to them.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n* **Documentation**\n  * Added a security policy and vulnerability reporting guidelines\n* Expanded the README with product overview, install instructions,\nrelease verification guidance, and connector setup\n  * Added a “nimbus demo” zero-config try-it path design specification\n* Added launch and community plan documentation and a multi-channel\nlaunch posts playbook\n* **Chores**\n* Updated link-check exclusions to reduce intermittent timeouts for\ncertain cast page URLs\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-18T14:38:11+03:00",
          "tree_id": "bc07b452729d3981d8b6d0318b450e33d9c009f8",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/5613f7d337ca67080ec61d35400f1b4204b65bd1"
        },
        "date": 1781783384340,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 276.91323760000193,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 280.145951449994,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "1409843faf6bdebb5b3fb3b4d90cd8b63261f20d",
          "message": "refactor(dedup): jscpd Wave-2 — 5 clusters + ratchet 4.5%→4.0% (strict 4.38%→3.98%) (#692)\n\n## Summary\n\nWave-2 of the jscpd duplication-reduction program (follows #688). Pure\nextraction — **zero behavior change**: every existing\nconnector/guard/sync test passes **UNEDITED**; each new shared helper\ngot a co-located TDD test. No `.jscpd.json` ignore added.\n\n**Strict `bunx jscpd packages`: 4.38% → 3.98%** (−440 dup-lines). CI\nduplication ratchet lowered **4.5% → 4.0%** to lock the gain (ci.yml\nruns the same strict `bunx jscpd packages` that reads `.jscpd.json`, so\nlocal == CI).\n\n## Clusters\n\n| # | Cluster | Extraction | Δ strict |\n|---|---|---|---|\n| C1 | agent-brief guards (`cli/types/agents.ts` ↔\n`gateway/agents/_lib/findings.ts`) | `sdk` `createBriefGuard<T>(kind,\nextra, {requireQuery})` — `requireQuery` is **per-guard** so cli\nexpert/impact/catchup keep their looser check and every gateway guard +\nthe other cli guards keep the query check (exact behaviour preserved) |\n4.38→4.32 |\n| C2 | imap/protonmail `tools.ts` | `shared/imap-tool-kit.ts`\n`registerEmailConnectorTools` (4 tool blocks; descriptions passed\nverbatim per connector) | 4.32→4.26 |\n| C3 | cloudwatch/sagemaker sync | `_lib/aws-cli.ts`\n`runAwsCliPaginatedWalk<S>` + `parseJson`/`awsNextToken`/`extractArray`;\nper-connector enrichment (`peekStreams`/`describeModel`) stays as the\ndelegated `processEntry`, preserving the two-tier byte accounting + the\nsagemaker `MAX_DESCRIBE` cap + best-effort enrichment | 4.26→4.20 |\n| C4 | gmail/outlook/onedrive `server.ts` | shared\n`createZodToolRegistrar` (kills the repeated `safeParse` guard) +\n`mcpJsonResultIfOk(label, r, 200)` (byte-identical error tail). Custom\ntails (outlook mail_send/calendar_delete, onedrive\nitem_download/item_delete) kept hand-written | 4.20→4.05 |\n| C5 | imap/protonmail email-mapping + sync | generic\n`mapImapLikeMessageToItem<S>` (imap-email-mapping.ts) + generic\n`runImapLikeSync<Cfg,Msg>` & `parsePortSecret`\n(`_lib/imap-sync-core.ts`) | 4.05→3.98 |\n\n## Deferrals (recorded, verified — not force-fit)\n\n- **C2 class-body merge** (`ImapFlowClient`/`BridgeImapClient`) + the\nimapflow-typed free funcs: `imapflow` is installed **per-connector**\n(not hoisted), and the 5 email connectors\n(gmail/outlook/teams/google-meet/google-photos) typecheck all of\n`shared/` but don't depend on imapflow — a shared imapflow import breaks\ntheir `tsc`. Confirms #688's documented deferral.\n- **C3** athena (3-level nested walk) + the cloud-logging↔vertex-ai\ngcloud spawn boilerplate (different argv/region).\n- **C5** fastmail's mapper (jmapId/receivedAt/name + different metadata)\nand the imap/protonmail `loadConfig` (different vault keys) — genuinely\ndivergent.\n- The `gateway-process` ↔ `gw-state-helpers` twin (documented\nun-dedupable) is untouched.\n\n## Verification (all green before first push)\n\nAll-package `tsc` · biome (2863 files) · static invariant audit ·\n`security-invariants` (83) · gateway-connectors (4046 tests, 0 fail) ·\nsdk/mcp/cli touched suites · coverage-floor (only the documented\nfalse-local violations:\nipc-transport/ipc/server/socket-listeners/telemetry/collector + the\nmcp-connector skip — no changed file below floor) · markdownlint ·\nlychee · opus whole-branch review (no Critical/Important findings).\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n* **Refactor**\n* Centralized brief-type validation used by CLI and gateway for\nconsistent payload checks.\n* Simplified CloudWatch and SageMaker sync paging with shared AWS-CLI\npagination helpers.\n* Reworked IMAP/ProtonMail sync and email mapping via shared core\nhelpers.\n* Standardized MCP email tool registration\n(Gmail/Outlook/IMAP/ProtonMail) with consistent schema validation and\nGraph/API result handling.\n* **Tests**\n* Added/expanded unit tests for shared guard, AWS CLI pagination, IMAP\nsync core, and connector tooling.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-20T11:34:32+03:00",
          "tree_id": "948f85637cfb650f87d72404e2015150e6b2253b",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/1409843faf6bdebb5b3fb3b4d90cd8b63261f20d"
        },
        "date": 1781945195257,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 287.8586981000033,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 289.32426240000166,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "ba1105ac4c42c3fca7bc529ad4ad9da18c13e08c",
          "message": "ci(perf): retry the bench run once on a crashed (SIGSEGV) leg (#693)\n\n## Problem\n\n[Run 27756789856 → \"Bench\n(macos-15)\"](https://github.com/nimbus-agent/Nimbus/actions/runs/27756789856/job/82120564770)\nreddened `main` with the **Run bench** step exiting **139 (SIGSEGV)**.\n\nThe whole bench is one long-lived `bun\npackages/gateway/src/perf/bench-runner.ts` process. From the logs it\ncleared S1/S2 and the soft S4/S6 failures, then `Segmentation fault: 11`\nright after S7-b — heading into the **S8 embedding / S10\nsqlite-contention** surfaces, i.e. the `bun:sqlite` Worker /\n`dlopen(sqlite-vec.dylib)` path the workflow already documents as the\nexit-139 culprit (the macOS quarantine-strip step).\n\nThat strip step **ran and succeeded**, so this is not the deterministic\nquarantine block. It is an **intermittent macOS-arm64 / Bun 1.3.14\nruntime flake**: the *identical* SHA `5613f7d3` ran 3×, failing only\nhere and passing on both subsequent reruns (runs `27816312729`,\n`27864726314`).\n\n## Fix\n\nWrap the **Run bench** step in the repo's established **retry-once\n(exit-propagating)** shell pattern — the same shape used by\n`_test-suite.yml` and `ci.yml`'s `pr-quality-cross-platform`.\n\n- A crashed bench produces no measurement, so retrying a warm process is\nnever a perf signal on any OS.\n- Attempt 2's exit code **propagates**, so two genuine failures still\nred the leg — no silent flake-hiding.\n- No history-duplication risk: SIGSEGV is uncatchable (the\n`SIGINT`/`SIGTERM` incomplete-line handler can't fire) and the single\naggregate history line is appended only on a clean finish\n(`bench-cli.ts`). The history file is also truncated before each attempt\nas a belt-and-braces guard.\n\n## Verification\n\n- YAML parses cleanly; no actionlint/yamllint gate in the repo.\n- No test or structure-audit asserts the bench step's name/body (the\n`_perf.yml` references are `gh`-run-query filename constants only).\n- Workflow-only change; no TypeScript touched.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Chores**\n* Improved performance benchmark step reliability with automatic retry\nlogic to handle transient failures gracefully.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-20T11:52:25+03:00",
          "tree_id": "9ab119981257a7daaa3d5877c37461e4293b1e82",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/ba1105ac4c42c3fca7bc529ad4ad9da18c13e08c"
        },
        "date": 1781946239320,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 287.34642079999793,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 289.0069817999982,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "6257da812df50705eaf62ba78d4fb20fa4693df0",
          "message": "fix(security): connector nextLink SSRF + email header CR/LF injection hardening (#694)\n\n## Summary\n\nHardens two **pre-existing** input-validation gaps at the MCP connector\nboundary, each fixed once at a shared chokepoint. These were surfaced as\nCodeRabbit findings on #692 (the jscpd Wave-2 PR) but pre-date it —\nthey're independent of the dedup work, so they ship here as a focused\nsecurity PR.\n\n## Defenses\n\n**(1) `nextLink` token-exfil / SSRF** — `resolveUrlWithBase`\n(`shared/fetch-bearer-json.ts`) now **origin-pins** absolute URLs: a\ncaller-supplied pagination link (`@odata.nextLink`, etc.) is fetched\nwith the connector's bearer token only when its origin matches the\nconfigured API base; a cross-origin or malformed absolute URL throws and\nis **never fetched**. One fix covers every consumer:\n- **Outlook** (4 paginated tools, via `makeRestFetcher`)\n- **Teams** (5 tools, via its `graphRequest` → `resolveUrlWithBase`)\n- **OneDrive** (2 tools — its custom `graphRequest` now routes through\n`resolveUrlWithBase`, also removing its duplicated inline resolver)\n- Relative-path callers (Gmail, Google Photos/Meet, Drive, GitHub) are\nunaffected.\n\n**(2) CR/LF email header injection** — new shared `headerLine()` Zod\nhelper (`shared/header-safe.ts`) rejects carriage-return/line-feed in\nuser-supplied header fields (`to`/`cc`/`bcc`/`subject` + comma-separated\nrecipient/attendee lists — **never `body`**, which legitimately wraps).\nApplied at:\n- `emailToolSchemas.sendArgs` (covers **imap / protonmail / fastmail**)\n- **Gmail** (`gmail_draft_create`, `gmail_message_send`)\n- **Outlook** (`outlook_mail_send`, `outlook_calendar_create` attendees)\n\n## Behaviour change\n\nA cross-origin `nextLink` or a CR/LF-bearing header field is now\nrejected (previously fetched/sent). The one edited test\n(`rest-tool-kit.test.ts`) had asserted the old cross-origin passthrough\n— updated to assert same-origin passthrough + cross-origin refusal.\n\n## Scope / design\n\n- No migration, no new **gateway** invariant — this is\nconnector-boundary input validation (the `Iₙ` framework is\ngateway-engine-scoped), guarded by co-located unit tests:\n`fetch-bearer-json.test.ts`, `header-safe.test.ts`, updated\n`rest-tool-kit.test.ts`.\n- Verified: strict `tsc` loop over all shared-including email connectors\n(gmail/outlook/teams/google-meet/google-photos/imap/protonmail/fastmail/onedrive)\nclean; 231 connector tests pass; biome + static invariant audit +\nall-package typecheck + markdownlint + lychee green.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n* **Bug Fixes**\n* Hardened email header validation in Gmail and Outlook to block CR/LF\nheader injection.\n* Improved URL handling for connector pagination and request building to\nreject cross-origin absolute URLs and reduce SSRF risk.\n* **Chores**\n  * Expanded automated tests for the new security validations.\n  * Updated the changelog with today’s security hardening notes.\n  * Refreshed dependency overrides related to HTTP/email tooling.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-20T09:17:03Z",
          "tree_id": "e8fd1c6b4d2f4539f583f7ac88c2349de560542d",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/6257da812df50705eaf62ba78d4fb20fa4693df0"
        },
        "date": 1781947729547,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 297.79290919999585,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 295.9411497499899,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "68dc62534e8fdfb645a45e9f8821c589b6717ba0",
          "message": "⚡ Optimize backfill embedding loop by processing batches concurrently (#691)\n\n💡 **What:** Replaced the sequential `for (const row of rows)` iteration\nover embedding chunks in the database backfill logic with\n`Promise.all(rows.map(async row => { ... }))`.\n🎯 **Why:** Previously, chunks were fetched and sent to the embedding\nprovider sequentially, resulting in linear delay. Network latency acts\nas a heavy bottleneck. Concurrent resolution handles network latency\nsimultaneously.\n📊 **Measured Improvement:** Simulated an embedding workload with 50\nitems and a synthetic 10ms per-item latency in a local benchmark script.\nThe baseline sequential execution took ~530ms per batch. The optimized\nconcurrent approach took just ~18ms per batch. Validated using the\nbuilt-in test suite that no logic regressions occurred.\n\n---\n*PR created automatically by Jules for task\n[1302549734161483821](https://jules.google.com/task/1302549734161483821)\nstarted by @asafgolombek*\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n## Release Notes\n\n* **New Features**\n* Added configurable concurrency control for embedding backfill\noperations to optimize performance and throughput.\n\n* **Tests**\n* Added test coverage for concurrency limiting and error handling in\nbackfill operations.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: google-labs-jules[bot] <161369871+google-labs-jules[bot]@users.noreply.github.com>\nCo-authored-by: asafgolombek <18427644+asafgolombek@users.noreply.github.com>\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-20T13:34:14+03:00",
          "tree_id": "54e946aff5e602a30a315cafcf755f25a2d3ccb4",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/68dc62534e8fdfb645a45e9f8821c589b6717ba0"
        },
        "date": 1781952117575,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 172.3617071499979,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 171.9275028999993,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "7b1bd8ff2d85bfd662ee02abf9a670b0d9f6d5fc",
          "message": "chore(main): release 0.13.1 (#695)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n##\n[0.13.1](https://github.com/nimbus-agent/Nimbus/compare/v0.13.0...v0.13.1)\n(2026-06-20)\n\n\n### Bug Fixes\n\n* **security:** connector nextLink SSRF + email header CR/LF injection\nhardening ([#694](https://github.com/nimbus-agent/Nimbus/issues/694))\n([6257da8](https://github.com/nimbus-agent/Nimbus/commit/6257da812df50705eaf62ba78d4fb20fa4693df0))\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Bug Fixes**\n  * Enhanced security hardening for connector nextLink functionality\n  * Prevented email header CR/LF injection vulnerability\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-06-20T14:16:42+03:00",
          "tree_id": "5d6ca8b2b77e881f38a913cac4d182430e3e3574",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/7b1bd8ff2d85bfd662ee02abf9a670b0d9f6d5fc"
        },
        "date": 1781954912328,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 289.2347644499972,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 289.959925700006,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "e0d3054499f1c9b5a383d50682de8401d04facf6",
          "message": "refactor(dedup): Wave A — intra-package cleanups (gitlab/google-drive/cli-dispatcher/gcloud) (#696)\n\n## Summary\n\n**Wave A** of the dedup \"realistic floor\" program — pure intra-package\nextraction, **zero behaviour change** (every existing test passes\nUNEDITED; new helpers got co-located tests). Strict `bunx jscpd\npackages` **3.97% → 3.95%**; gate left at 4.0 (ratchet tightens at\nprogram end).\n\n## Targets shipped (4)\n\n| # | Extraction |\n|---|---|\n| **A5** | `cloud-logging` + `vertex-ai` gcloud `Bun.spawn` wrapper →\nshared `_lib/gcloud-runner.ts` `runGcloudCommand(argv, credPath)`\n(env-scoped via `extensionProcessEnv`, I1) + co-located test |\n| **A1** | `gitlab/server.ts` → file-local\n`registerGitlabTool(name,desc,schema,buildUrl,buildInit?)` for the 9\nstandard `glFetch`+`mcpJsonResultIfOk` tools\n(job_trace/job_log_tail/pipeline_retry/cancel keep custom tails) |\n| **A2** | `google-drive/server.ts` → file-local\n`registerDriveTool(name,desc,schema,handler)` via the shared\n`createZodToolRegistrar` (drops the manual `safeParse` boilerplate;\nidentical thrown error text) |\n| **A4** | `catchup` + `impact` CLI → shared\n`cli/src/lib/agent-cli-dispatcher.ts` `runAgentCli(...)` (exact stderr\ntext + `exit(1\\|2)` codes preserved) + co-located test |\n\n## Deferred (documented — program forbids forcing harmful abstractions)\n\n- **A3 http-server admin bearer gate** — the three handlers' 401 bodies\ngenuinely differ (`handleAdminStatus` returns JSON; metrics/console\nreturn `text/plain`), so collapsing them would be a behaviour change and\nthe truly-shared part is sub-threshold. Left as-is.\n- **A6 peer-fanout `fanOutGeneric`** — federation/I17-sensitive for a\n~0.02pt gain; not worth the risk this wave.\n- `auth.ts`, `google-meet ↔ google-photos`, `agents-rpc.ts` — per the\nspec, genuinely parallel-by-design / forced-abstraction; kept.\n\n## Honest note on impact\n\nThe number moved only ~0.02pt because collapsing *boilerplate* leaves\nthe per-call-site specifics (URL builders, param shapes) parallel, which\njscpd still counts. Wave A is primarily a **code-quality** improvement\n(less boilerplate, single source for the dispatcher/registration\nshapes). Meaningfully lowering the metric requires the\nconnector-template codegen (Wave C), tracked separately.\n\n## Verification\n\nPer-target tsc + tests green unedited · full all-package typecheck ·\nbiome · coverage-floor (only the documented false-locals remain;\n`agent-cli-dispatcher.ts` covered by its co-located test) ·\nmarkdownlint. Spec:\n`docs/superpowers/specs/2026-06-20-dedup-wave-a-design.md`.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n* **Refactor**\n* Consolidated the catchup and impact agent CLI flows behind a shared\ndispatcher.\n* Standardized gcloud execution for cloud logging sinks and Vertex AI\nmodel listing, with optional override support.\n* Centralized GitLab and Google Drive MCP tool registration for\nconsistent validation and response formatting.\n* **Bug Fixes**\n* Improved resilience when gcloud commands fail by returning controlled\nnon-success results without crashing.\n* **Tests**\n* Added tests for the shared agent dispatcher and gcloud command runner.\n* **Documentation**\n* Added “Wave A” design documentation for the deduplication initiative.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-20T16:41:19+03:00",
          "tree_id": "457f575e32618bcbb1ccdeb9ca2a8d921b530807",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/e0d3054499f1c9b5a383d50682de8401d04facf6"
        },
        "date": 1781963600376,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 295.2505725499956,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 295.1125793499967,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "4d38898ca1c3d8235371c15a6a388d45c611a6fa",
          "message": "refactor(dedup): Wave C — shared makeRestToolRegistrar across 10 REST connectors (#697)\n\n## Summary\n\nGeneralizes Wave A's file-local REST registrars (`registerGitlabTool` /\n`registerDriveTool`, #696) into one **shared** helper,\n`makeRestToolRegistrar`\n(`packages/mcp-connectors/shared/rest-tool-kit.ts`), and applies it\nacross the **ten remaining hand-rolled REST/Graph connectors**.\n\nIt collapses the repeated standard-tool body:\n\n```ts\nreg(name, desc, schema, async (args) => {\n  const token = requireProcessEnv(<env>);\n  const res = await <fetch>(token, buildPath(args)[, buildInit(args)]);\n  return mcpJsonResultIfOk(<label>, res[, snippetMax]);\n});\n```\n\nA connector supplies its registrar, token env, service label, and\ntoken-bearing fetcher **once**; each tool then provides only its\nname/description/schema + a pure `buildPath` (and optional `buildInit`\nfor method/body). The `snippetMax` knob preserves each connector's exact\n`mcpJsonResultIfOk` body-snippet length (Graph connectors use `200`;\ndefault is `300`).\n\n**Migrated (10):** circleci, discord, github, github-actions, gmail,\ngoogle-meet, google-photos, onedrive, outlook, pagerduty.\n\nTools with a non-standard tail (custom error text, 204 tolerance,\nraw-text body, bespoke write shapes — e.g. `outlook_mail_send`,\n`github_branch_delete`, onedrive download) stay hand-written on the\nconnector's own `reg`.\n\n## Fidelity — pure dedup, zero behavior change\n\n- The fetchers are **unchanged**, so #694's `resolveUrlWithBase`\n`nextLink` SSRF origin-pinning and the `headerLine` CR/LF header-safety\nschemas are preserved byte-for-byte.\n- Every connector `*-sandbox.test.ts` / `*-search-filter.test.ts` stays\ngreen **unedited** (full connector suite 871 pass / 0 fail).\n- New co-located tests cover `makeRestToolRegistrar` (token read,\nbuildPath/buildInit forwarding, `snippetMax` on error, the `undefined →\n300` default, fail-closed on missing env).\n- A 3-angle whole-branch review (per-connector OLD-vs-NEW diff of every\nmigrated tool + the helper/tests) found **zero fidelity slips**.\n\n## Scope / invariants\n\nNo migration, **no new invariant** — the helper lives in\n`mcp-connectors/shared/` (the established connector-internal-helper\nprecedent, not the SDK; no new SDK export, no coverage-floor ratchet).\n\n## jscpd\n\nStrict `bunx jscpd packages` **3.95% → 3.93%** (CI duplication ratchet\nstays **4.0**). As the realistic-floor analysis predicted, collapsing\nthe *boilerplate* body into a factory leaves the per-tool *specifics*\n(URL builders, schemas) parallel — so jscpd barely moves; the value here\nis maintainability and headroom under the gate.\n\nDesign:\n`docs/superpowers/specs/2026-06-20-dedup-wave-c-rest-registrar-design.md`\n\n## Local gates (all green before first push)\n\nall-package tsc · biome · strict tsc on the 5 `../shared/**`-including\nemail connectors · security-invariants (83) · nimbus-invariants static\naudit · full connector suite (871/0) · markdownlint · lychee · jscpd\n3.93% (EXIT 0)\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Refactor**\n* Consolidated REST tool registration patterns across multiple\nconnectors to reduce code duplication and improve maintainability.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-20T15:08:24Z",
          "tree_id": "75f06746bf01174798d1995a420c920ce3b50e91",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/4d38898ca1c3d8235371c15a6a388d45c611a6fa"
        },
        "date": 1781968831360,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 300.3340959000037,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 301.3472597999949,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "34fb5942fd536981f58405a8e4904529addd40a3",
          "message": "feat(egress): Egress Ledger & nimbus prove (S1 Local Brain — I29/D22/V44) (#698)\n\n## Egress Ledger & `nimbus prove` (S1 \"Local Brain\" — provable-locality\nprimitive)\n\nAn always-on, append-only, BLAKE3-chained ledger of every authorized\noutbound action, written from `ToolExecutor.gate()` **before**\n`connectors.dispatch()`. A denied gate records a\n`result_status='blocked'` row; an append failure aborts the action\n(**fail-closed, never dispatches**).\n\n### What's in it\n- **Schema V44** — `egress_ledger` table (`id`, `timestamp`,\n`source_type`, `source_id`, `destination`, `method`, `payload_summary`,\n`hitl_status`, `result_status`, `row_hash`, `prev_hash`) + 3 lookup\nindexes; the chain reuses `db/audit-chain.ts`'s genesis + BLAKE3\nprimitives. `destination` is the `serviceOf()` action-type prefix (never\na raw URL); `payload_summary` is `redactAuditPayload`-scrubbed, capped\nat 256 bytes (debugging aid, **not** the security boundary).\n- **Invariant I29 + static complement D22** — the executor chokepoint is\nmade *total*: D22 confines `connectors.dispatch` to `engine/executor.ts`\nand the ledger append to `egress/*`, so a `0`-row window is a sound\nnegative. I28 is reserved (MCP-server owner-sink on the in-flight\n`phase7-mcp-gateway-server` branch); reconcile at that merge. **Count\nmoves I1–I27 → I1–I29 (I28 reserved).**\n- **Completeness wiring** — the egress sink is injected into *every*\n`ToolExecutor` that reaches a real connector dispatch (agent action path\nvia `run-ask`, chatops-approved writes, both tribal-capture executors);\ngate-only stub executors\n(vault/teamvault/reindex/data/auto-update/connector.auth) deliberately\nget no sink (local mutations, not outbound).\n- **`nimbus prove \"<query>\"`** — snapshots the ledger head before/after\na query and prints the diff (`outbound egress events during this query:\n0 ✓` for a local-only query).\n- **`nimbus egress [verify|prune|--since|--json|--sign]`** — report /\noffline chain-verify (timing-safe via `sha256HexEqualConstantTime`, I10)\n/ HITL-gated retention. A degraded chain prints `indeterminate`, never a\nfalse `0`.\n- **IPC** — 4 read verbs (`egress.head`/`list`/`verify`/`proveWindow`)\nrenderer-exposed (I7, allowlist 95→99); **`egress.prune`** — the sole\nmutation (a continuing tombstone, not a silent gap) — is in the I2 HITL\nfrozen set, gated through the owner-consent channel, NOT\nrenderer-exposed. Receipt signing reuses the Vault-only Ed25519 share\nkeypair (no new Vault key).\n\n### Deferred\nAuditor-grade portable signed export remains deferred to Phase 12.5.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **New Features**\n* Introduced an egress ledger to audit and prove outbound actions with\ntamper-evident chaining.\n* Added `nimbus prove` command to verify outbound action completeness\nwith optional cryptographic signatures.\n* Added `nimbus egress` command to list, verify, and prune egress ledger\nentries.\n* Updated schema to V44 with new security invariant I29 (egress-ledger\ncompleteness).\n\n* **Documentation**\n* Updated architecture, changelog, and security-invariants docs to\nreflect V44 schema and I29 invariant.\n* Added multiple design specifications for upcoming features (mobile\ncompanion, federation relay, sky-gapped mode, etc.).\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-21T06:09:25Z",
          "tree_id": "09b6ae0e7bd58a2ec4d4cffb2c819178bc7db941",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/34fb5942fd536981f58405a8e4904529addd40a3"
        },
        "date": 1782022893370,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 301.27279354999735,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 304.8986682499955,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "def4c74d84a5ad4371fdbfa78eecfccbf292f990",
          "message": "chore(main): release 0.14.0 (#699)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n##\n[0.14.0](https://github.com/nimbus-agent/Nimbus/compare/v0.13.1...v0.14.0)\n(2026-06-21)\n\n\n### Features\n\n* **egress:** Egress Ledger & nimbus prove (S1 Local Brain —\nI29/D22/V44) ([#698](https://github.com/nimbus-agent/Nimbus/issues/698))\n([34fb594](https://github.com/nimbus-agent/Nimbus/commit/34fb5942fd536981f58405a8e4904529addd40a3))\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **New Features**\n  * Egress Ledger & nimbus prove functionality\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-06-21T06:42:27Z",
          "tree_id": "690913fd3232b198e2bb0f649eaa1b5acad87728",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/def4c74d84a5ad4371fdbfa78eecfccbf292f990"
        },
        "date": 1782024892150,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 299.6245578500002,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 299.89566504999675,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "437569a0b1b903cba9efd9e29f7cb2f5a4e35813",
          "message": "docs: staleness sweep, superpowers cleanup, and nimbus-egress skill (#701)\n\n## Summary\n\nA docs/skills/agents/scripts staleness sweep against `main` @`34fb5942`\n(v0.13.1, Phase 6 complete, invariants I1–I29, schema V44), plus cleanup\nof shipped planning artifacts. No TS/source touched.\n\nDriven by a parallel audit (8-agent staleness sweep) + additive-doc\ndrafting; every claim was verified against the live code.\n\n### Staleness fixes\n- **Root context** — `CLAUDE.md` + `GEMINI.md` (kept mirrored):\n`v0.11.2`→`v0.13.1`, `I1–I27`→`I1–I29`; fixed GEMINI's divergent stale\nskill list. **`docs/README.md`**: release/status badges, Phase-6\nparagraph + roadmap/pricing tables.\n- **Status docs** — `SECURITY.md` (Phase 6 complete, `v0.13.x` support\ntable), `roadmap.md` (Last-updated, Active→Complete, Slice 7c/8/9\ndelivery annotations), `architecture.md` (self-contradiction\n`I1–I27`↔`I1–I29`, added `egress.*` IPC block + V44 schema bullet, Tauri\ncount 95→99, schema-version 43→44).\n- **Skills (10)** — tauri-allowlist `83`→`99`, file-map `D21`→`D22`,\narchitecture `44`→`54` commands + Phase-6-complete, ipc\n(+`share.*`/`egress.*` registry), commands / db-migrations /\nsecurity-invariants / tool-output-envelope.\n- **Agents (3)** — preflight-guard + ci-doctor `16`→`18` static gates;\ncoverage-floor `targets`-overlay note.\n- **Misc** — install/verify docs' wrong GitHub orgs (`asafgolombek` /\n`nimbus-dev` → canonical `nimbus-agent`); known-todos stale symbol.\n\n### Additive (new docs for the shipped egress-ledger subsystem, #698)\n- **New `nimbus-egress` skill** (+ rows in CLAUDE.md/GEMINI.md skill\ntables).\n- **`schema-reference.md`** backfilled V35→V44 (was frozen at V34 —\nmissing `egress_ledger`, share/tribal/lineage/team-vault tables).\n- **`cli-reference.md`** — new `nimbus prove` / `nimbus egress` section.\n\n### Cleanup\n- Deleted **56 shipped** superpowers plans/specs (each tied to a merged\nPR). Kept the unbuilt backlog (3 plans + 19 specs) **and 3 specs\ncross-linked from durable docs** (CHANGELOG / roadmap /\ncontributors-coverage). Verified `standup` + `demo-mode` are **not** on\nmain, so their specs were kept.\n- Untracked **6 regenerable** `docs/structure-audit/*.json` dumps\n(jscpd-report 1.1MB etc.) via `.gitignore` + `git rm --cached`; kept the\nratchet baselines.\n- Deleted **3 dead** `scripts/linux/*.sh` shims (unreferenced thin\nwrappers).\n\n**Deliberately skipped:** `regen-slo.ts`'s \"TBD (Phase 5)\" prose — those\ncells gate on the perf program's still-dormant *M1 Air reference run*,\nnot Phase 5, so the text is plausibly accurate and editing it would trip\nthe `regen-slo:check` gate.\n\n## Verification\nAll green: `audit:doc-refs` (614 refs resolve), `audit:status-drift`,\n`audit:readme-cli`, `lint:markdown` (0/74), `lychee --offline` (0\nerrors). Pre-push `preflight:fast` passed.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n## Release Notes\n\n* **New Features**\n* Added Egress Ledger—a tamper-evident, append-only outbound action\naccounting system with BLAKE3-chained verification\n* Added `nimbus prove` CLI command for querying egress ledger snapshots\nand proving outbound event deltas\n* Added `nimbus egress` and `nimbus egress verify` commands for ledger\ninspection and offline verification\n  * Enhanced share and virality capabilities (Phase 6 Slice 8)\n  * Expanded IPC surface with `share.*` and `egress.*` namespaces\n\n* **Documentation**\n  * Updated project to v0.13.1; Phase 6 (Team) now complete\n  * Extended security invariant coverage through I29\n  * Updated database schema (V44) with new tables and migration guidance\n\n* **Chores**\n  * Updated installation references to new GitHub repository owner\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-21T10:07:23+03:00",
          "tree_id": "3d29b55639c399696f4543cf546fca5ea3dc73fa",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/437569a0b1b903cba9efd9e29f7cb2f5a4e35813"
        },
        "date": 1782026346234,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 297.6031256000024,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 298.25646490000435,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "bccab8bf9e8f34fabed47afff3619bf6dc6802ff",
          "message": "feat(slice9-w1): HITL-gated GitOps + ML writes (ArgoCD/Flux/MLflow), generalize I26 (#700)\n\n## Phase 6 Slice 9 W1 — HITL-gated GitOps + ML writes (ArgoCD / Flux /\nMLflow)\n\nAdds six HITL-gated connector write tools, each executing **only**\nbehind the LOCAL owner's executor I2 consent gate, with a personal **+\nteam** credential path. Built by generalizing the Wave 7c\nwarehouse-write machinery to *all* connector writes — **no new invariant\nnumber, no migration (schema stays V43), no new vault keys**.\n\n**Spec:**\n[`docs/superpowers/specs/2026-06-20-slice9-w1-gitops-ml-writes-design.md`](docs/superpowers/specs/2026-06-20-slice9-w1-gitops-ml-writes-design.md)\n· **Plan:**\n[`docs/superpowers/plans/2026-06-20-slice9-w1-gitops-ml-writes.md`](docs/superpowers/plans/2026-06-20-slice9-w1-gitops-ml-writes.md)\n\n### Write tools\n| Tool | Action type (HITL) | API |\n| --- | --- | --- |\n| `argocd_app_sync` / `argocd_app_rollback` | `argocd.app.sync` /\n`argocd.app.rollback` | `POST\n/api/v1/applications/{name}/sync\\|rollback` |\n| `flux_kustomization_reconcile` / `flux_helmrelease_reconcile` |\n`flux.kustomization.reconcile` / `flux.helmrelease.reconcile` | PATCH\nthe CR with `reconcile.fluxcd.io/requestedAt` (needs the SA's `patch`\nRBAC verb) |\n| `mlflow_model_promote` / `mlflow_model_transition_stage` |\n`mlflow.model.promote` / `mlflow.model.transition_stage` | `POST\n/api/2.0/mlflow/model-versions/transition-stage` (promote defaults\n`archive_existing_versions=true`) |\n\nAll writes are **async** (the action is *requested*; verify via the next\nmetadata sync).\n\n### Architecture\n- Hoisted `ConnectorWrite` descriptor + a per-group SSoT\n(`gitops-ml-write-tools.ts`) + a union registry\n(`connector-write-registry.ts`); renamed\n`warehouse-write-{transport,dispatch}.ts` →\n`connector-write-{transport,dispatch}.ts`.\n- The six action types are in the frozen `HITL_REQUIRED_BACKING`, tied\nto the SSoT by a drift test.\n- **I26/D20 generalized in place** (\"warehouse/BI write tool ids\" →\n\"connector write tool ids, warehouse/BI ∪ GitOps/ML\"): the federated\npeer invoke gate now fail-closed rejects ANY connector write id via the\nunion `isConnectorWriteToolId` — a peer can never trigger a GitOps/ML\nwrite over the wire (proven by a functional rejection test in\n`invoke-gate.test.ts`).\n- Each connector's read tools extracted to an exported\n`register<Svc>Tools(reg)` registrar (`import.meta.main` guard runs the\nstdio server), keeping the write tools unit-testable via\n`captureTools()`.\n- `argocd`/`flux`/`mlflow` enrolled in `TEAM_CREDENTIAL_CONNECTORS` +\n`TEAM_SECRET_ANYOF_GROUPS` so the I19 localOperator team-write rail is\nreachable.\n\n### Deferred\nSageMaker + Vertex AI writes (CLI-credential connectors — no discrete\ntoken, don't fit the team-vault write model) and all destructive\n`delete`/`drop` writes.\n\n### Verification\n- Docker-Linux (`oven/bun:latest`) full test suite + coverage-floor\n(baseline `{}`): **0 violations / 1045 files**.\n- typecheck, biome, static D20 (`nimbus-invariants`), markdown-lint,\ndoc-refs: all green. Final sweep **2562 pass / 0 fail**.\n- Whole-branch multi-agent review: security model sound; the one real\nfinding (team-credential rail was unreachable) fixed in this branch.\n\nInvariant count stays **I1–I27**.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n* **New Features**\n* Added consent-gated, async connector write tools for GitOps (ArgoCD\napp sync/rollback; Flux Kustomization/HelmRelease reconcile) and ML\n(MLflow model promote/transition-stage).\n* **Security**\n* Expanded fail-closed protections so federated invocations for\nconnector write actions are blocked unless authorized by the local HITL\ngate.\n* **Configuration**\n* Enabled Nimbus team-credential support for ArgoCD, Flux, and MLflow,\nincluding required token/secret mappings.\n* **Documentation**\n* Updated changelog, security invariant documentation, architecture, and\nroadmap to reflect connector-wide write tooling.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-21T07:58:58Z",
          "tree_id": "ed95d88129bb1f79d4aca89489a7f2df5a5508bb",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/bccab8bf9e8f34fabed47afff3619bf6dc6802ff"
        },
        "date": 1782029747937,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 299.1350286500019,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 300.77311249999764,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "7e6436b20ff0a4d189ebfd1459bca6dda9c2d8e0",
          "message": "Sonar cleanup (22 issues) + raise coverage line floor 80→85% (#702)\n\nTwo related quality passes on a fresh branch off `main`.\n\n## Part 1 — clear all open SonarCloud issues (fix-not-exclude)\n\nThe quality gate was already green, but **22 issues** were open (outside\nthe new-code window). All fixed in code (no rule-excludes):\n\n- **S7763 ×9** — re-export imported SDK symbols via `export…from`\n(`data-profile-mapping`, `storybook-story-mapping`, dataprofile\n`profile`); only *pure* re-exports converted, locally-used symbols kept\nimported.\n- **S7735 ×6** — flip negated `if`/ternary conditions (`egress-prune`,\n`share-forward`, `assemble`, `verify-share`).\n- **S3776 (CRITICAL)** — `runShare` cognitive complexity 17→~8 via\nper-subcommand handler extraction (flat dispatcher).\n- **S3863 ×2** (duplicate `share-format` import), **S6582** (optional\nchain), **S6571** (redundant `| null` on `Promise<unknown>`), **S7786**\n(`TypeError` for a type check), **S1874** (stop using the deprecated\n`StorybookStoryInput` alias internally).\n\n## Part 2 — raise the per-file **line** coverage floor 80 → 85%\n\n`FLOOR_PCT` → 85 in `scripts/coverage-floor/baseline.ts`. **Branch floor\nstays 80** (separate constant) — raising the branch floor (an 83-file\nprogram) will be a **follow-up PR**.\n\nAuthoritative Docker/Linux lcov confirms the gate is green at the new\nfloor with a still-empty baseline. The 14 files below 85% line were\nresolved:\n\n- **10 raised ≥85% line with focused tests**:\n`warehouse-write-transport`, `voice/service`, `share/verify-share`,\n`chatops/chatops-bot-spawn-call`, `policy/policy-trust`,\n`telemetry/collector` (new), `auth/oauth-vault-tokens`,\n`connectors/cloudwatch-log-group-mapping` (new),\n`agents/_lib/synthesize`, `updater/signature-verifier`.\n- **4 excluded as genuine no-seam shells** (with justification):\n`cli/commands/{tribal,telemetry}` (CLI IPC wrapper shells),\n`client/src/ipc-transport` + `ipc/server/server` (unix-socket\ntransport/listener shells).\n\nAlso updates the coverage-floor unit-test fixtures for the diverged\nfloors and the floor wording in `docs/testing.md` + the\n`nimbus-coverage-floor` / `nimbus-commands` /\n`nimbus-connector-authoring` skills.\n\n## Verification\n- Typecheck: all packages clean (`preflight:fast` typecheck).\n- Biome: clean (`bunx biome check packages scripts`).\n- Tests: all new/changed test files pass; no `mock.module` leak in\ncombined runs.\n- Coverage floor: **green** at ≥85% line / ≥80% branch, verified on the\nDocker/Linux-authoritative lcov.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n## Release Notes\n\n* **Bug Fixes**\n* Improved `prove --before` validation with a clearer, formatted error\nmessage.\n* Corrected share forwarding behavior so unavailable destinations are\nqueued instead of handled as immediately deliverable.\n\n* **Documentation**\n* Raised coverage gate minimums to **≥85% line** and **≥80% branch** for\nnew source files, and updated the related CI/commands/auth connector\nguidance accordingly.\n\n* **Tests**\n* Expanded test suites and fixtures across gateway, CLI, and connectors,\nincluding additional edge cases and verification paths.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-21T08:33:53Z",
          "tree_id": "ff2f3d81103d619056f7ed6e8736525ca827aa82",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/7e6436b20ff0a4d189ebfd1459bca6dda9c2d8e0"
        },
        "date": 1782032109048,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 295.27814079999916,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 300.53370375000304,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "2e757e8143045963ba7c78cb58bcb4806071fdd9",
          "message": "fix(test): resolve LanServer gate test flake (#705)\n\nResolves the test flake in LanServer gate where the decrypted mock\nclient helper assumed single-chunk TCP replies.\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Tests**\n* Improved test infrastructure for gateway RPC communication to\ncorrectly handle fragmented TCP responses across multiple data\ncallbacks, ensuring robust validation of encrypted message reassembly.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-06-21T12:10:16+03:00",
          "tree_id": "cd2f2829532719df2b666b31c9974137254dc795",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/2e757e8143045963ba7c78cb58bcb4806071fdd9"
        },
        "date": 1782033719930,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 298.5328516999998,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 296.59319654999126,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "b1978b923fa9e5f59693adc5b915acd683d4048d",
          "message": "docs(roadmap): add Phase 9.7 Connector Write-Enablement + Phase 20 Wave 0 (#707)\n\n## What\n\nAdds two roadmap entries surfaced in a connector-strategy brainstorm.\nDocs-only; no code or invariants touched.\n\n### Phase 9.7 — Connector Write-Enablement (The Acting Roster)\nPromotes the ~88 read-only connectors into an **acting** roster. The\nwrite machinery already exists — the `I26` write-registry, the `I29`\negress ledger, the `I2` HITL chokepoint — but only ~4 connectors use it.\nThis phase systematically builds HITL-gated write tools across the\nexisting roster, ordered by blast radius:\n\n- **Wave 1** — write-authoring framework (generalize I26 registry,\nconsent preview, egress coverage, taint integration)\n- **Wave 2** — productivity writes (drafts, comments, issue\ncreate/transition, knowledge append)\n- **Wave 3** — code & change writes (VCS, incident ack/resolve, flag\ntoggles)\n- **Wave 4** — infra & production writes (k8s/IaC/deploy/data-ML;\nstrictest gating)\n\nNumbered **9.7** (fractional insert, no renumber) so it lands\nimmediately before Phase 10 — it's the write substrate the autonomy arc\n(Phases 10/16/17) already assumes but no phase delivers. Marked **Track\n1 (spine)**; the sequencing-spine S4 row now references it.\n\n### Phase 20 Wave 0 — Personal Data Sources\nThe household-federation phase assumes personal data is *already\nindexed* but nothing ingests it. This wave adds read-only,\n**non-federatable-by-default** personal connectors — finance\n(Plaid/SimpleFIN), health/wearables (Apple Health/Google\nFit/Oura/Whoop), home (Home Assistant), media (Plex/Jellyfin/photos).\nExisting federation content relabeled Wave 1.\n\n## Why\nConnector *breadth* is saturated (~92); the leverage is read→write depth\nand the local-first personal-data moat. These two entries capture that\ndirection.\n\n## Verification\n- `bun run audit:doc-refs` — ✅ 616 refs across 15 docs resolve\n- No status-drift surface touched (new `[ ]` future phases only)\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n## Documentation\n* Updated the product roadmap to reflect connector write-enablement as a\nprerequisite for autonomous agent functionality.\n* Added a new phase defining write-enablement guardrails and a four-wave\nrollout plan.\n* Extended the Phase 20 roadmap with planned personal and household data\nsource support, establishing privacy defaults.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-21T14:42:46+03:00",
          "tree_id": "20588bb667e92024ee4c0df5fca77cdb9851c475",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/b1978b923fa9e5f59693adc5b915acd683d4048d"
        },
        "date": 1782042872796,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 292.4725989999999,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 292.7491513500128,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "242612324aaf198e83943e3ced923643c1d0a142",
          "message": "chore(main): release 0.15.0 (#708)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n##\n[0.15.0](https://github.com/nimbus-agent/Nimbus/compare/v0.14.0...v0.15.0)\n(2026-06-21)\n\n\n### Features\n\n* **slice9-w1:** HITL-gated GitOps + ML writes (ArgoCD/Flux/MLflow),\ngeneralize I26\n([#700](https://github.com/nimbus-agent/Nimbus/issues/700))\n([bccab8b](https://github.com/nimbus-agent/Nimbus/commit/bccab8bf9e8f34fabed47afff3619bf6dc6802ff))\n\n\n### Bug Fixes\n\n* **test:** resolve LanServer gate test flake\n([#705](https://github.com/nimbus-agent/Nimbus/issues/705))\n([2e757e8](https://github.com/nimbus-agent/Nimbus/commit/2e757e8143045963ba7c78cb58bcb4806071fdd9))\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **New Features**\n  * Added slice9-w1 feature.\n\n* **Bug Fixes**\n  * Fixed test flake issue.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-06-21T15:41:49+03:00",
          "tree_id": "47d8224eb728b9b5b15ce7f34f2fa181d3f6b606",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/242612324aaf198e83943e3ced923643c1d0a142"
        },
        "date": 1782046427062,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 291.01356785000496,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 292.15229370000236,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "2646918570aaa52e1477765fe169df3433bdba25",
          "message": "feat(slice9): Workday connector (read-only) — workers/time-off/job-postings + RaaS reports (#709)\n\n## Phase 6 Slice 9 (sub-project B) — Workday connector (read-only)\n\nA read-only first-party MCP connector that indexes a tenant's HR data\ninto the local SQLite + embedding index: **org chart / workers,\ntime-off, job postings** (REST) plus admin-configured **RaaS reports**.\nMirrors the Mendeley OAuth lazy-mesh pattern.\n\n**No new security invariant · no schema migration · no HITL · not on the\nteam-credential rail.** Invariant count stays I1–I29.\n\n**Spec:**\n[`docs/superpowers/specs/2026-06-21-slice9-workday-connector-design.md`](docs/superpowers/specs/2026-06-21-slice9-workday-connector-design.md)\n· **Plan:**\n[`docs/superpowers/plans/2026-06-21-slice9-workday-connector.md`](docs/superpowers/plans/2026-06-21-slice9-workday-connector.md)\n\n### What it does\n- **Item types (4, all new):** `workday:worker`, `workday:time_off`,\n`workday:job_posting`, `workday:report`.\n- **Tenant-specific OAuth 2.0:** Workday's authorize/token endpoints\nembed the tenant (`/ccx/oauth2/<tenant>/token`), which the static\n`OAUTH_PROVIDERS` map can't express — handled by a\n`makeWorkdayDescriptor({tenantHost, tenant})` factory + a\n`resolveOAuthDescriptor` indirection at the registry's descriptor-build\nsites (zero behavior change for every other provider).\n- **Config:** env vars `NIMBUS_OAUTH_WORKDAY_CLIENT_ID` / `_SECRET`,\n`NIMBUS_WORKDAY_TENANT_HOST`, `NIMBUS_WORKDAY_TENANT`; only\n`workday.oauth` (token bundle) in the Vault; optional\n`[[connectors.workday.reports]]` RaaS config in `nimbus.toml`.\n- **Live MCP tools:** `workday_list` / `workday_get` / `workday_search`\n(workers); time-off / job-postings / RaaS reports are indexed by the\nGateway sync (queryable via `nimbus search`), not exposed as separate\ntools.\n\n### Security model\n- **Directory-safe PII allowlist** (`workday-field-allowlist.ts`):\nmappers emit only an explicit allowlist\n(name/title/manager/team/dept/location/work-contact/dates);\ncompensation, SSN/national-id, home address, personal contact, leave\nreasons, and the job-description body are **never indexed**. A contract\ntest fails CI if a forbidden field is ever mapped. RaaS rows get an\nexplicit per-report `fields` allowlist (admin-controlled) plus an\nalways-on PII denylist heuristic backstop.\n- **RaaS egress guard:** a configured report URL is fetched only if its\nhost equals the tenant host (`sameTenantHost`, fail-closed); off-tenant\nURLs are never fetched and report hosts are never added to the sandbox\nallowlist.\n- **Sandbox (I15):** the connector spawns via `wrapServerSpec` +\n`manifestWithExtraNetworkHosts(\"workday\", [host])` — only the tenant\nhost is added to the network allowlist.\n- **Read-only:** no write tools (`assertNoRowDataTools` + no-write\ncontract tests), no HITL action types.\n- The index-side allowlist governs the **index**; the live read tools\nreturn raw API data (envelope-wrapped, I11) bounded by the API's\nresponse — documented in the README/spec.\n\n### Verification (all green locally before push)\n- typecheck (all packages), biome (2919 files), `lint:markdown`, and all\nstatic audits: doc-refs, openapi-drift, **boundaries** (gateway does not\nimport mcp-connectors), **invariants** (incl. D11 vault-key allow-list),\n**any**, cross-platform, package-readmes, exclusion-parity, jscpd\nduplication.\n- Full test suite: **12850 pass** (986 files). Workday-specific suites\ncover mappers (PII drops), allowlist, OAuth descriptor, sync (per-domain\nisolation, cursor resume, RaaS same-host), and the spawn.\n- **Coverage-floor (Docker-Linux authoritative):** ok — 0 files\nbaselined; every new file clears ≥85% line / ≥80% branch.\n- Built via subagent-driven development with a per-task review gate + a\nfinal whole-branch review (verdict: ready to merge).\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n* **New Features**\n* Added a new first-party, read-only Workday connector that indexes\n`worker`, `time_off`, `job_posting`, and optional `report` data (via\nReporting-as-a-Service).\n* Enabled tenant-specific Workday OAuth2 authentication and added\nWorkday connector support across connector registration, OAuth handling,\nand lazy connector startup.\n* Implemented directory-safe PII allowlisting/filtering and introduced\nstructured sync cursoring for Workday data ingestion.\n* **Documentation**\n* Added Workday connector README and updated changelog/roadmap entries.\n* **Tests**\n* Added connector, sync, field-policy, and configuration parsing\ncoverage for Workday behavior.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-21T15:58:15Z",
          "tree_id": "02ad5b32745d96493a2e19da33edf35af05d7b61",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/2646918570aaa52e1477765fe169df3433bdba25"
        },
        "date": 1782058639498,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 305.85383239999936,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 304.8835868499911,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "cac512b8f03a0b7efdac3137c158c54ee33ae245",
          "message": "chore(main): release 0.16.0 (#710)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n##\n[0.16.0](https://github.com/nimbus-agent/Nimbus/compare/v0.15.0...v0.16.0)\n(2026-06-21)\n\n\n### Features\n\n* **slice9:** Workday connector (read-only) —\nworkers/time-off/job-postings + RaaS reports\n([#709](https://github.com/nimbus-agent/Nimbus/issues/709))\n([2646918](https://github.com/nimbus-agent/Nimbus/commit/2646918570aaa52e1477765fe169df3433bdba25))\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **New Features**\n* Workday connector now available with read-only access to workers,\ntime-off, job-postings, and RaaS reports.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-06-21T20:22:36+03:00",
          "tree_id": "10252a0ab43ead16dc48c565d2f86ef4d3597d9e",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/cac512b8f03a0b7efdac3137c158c54ee33ae245"
        },
        "date": 1782063268534,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 297.9386302999974,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 300.0038898499985,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "58c69e09fba285b03b94eed60f69751103da1bf3",
          "message": "feat(apple): iCloud Mail + Calendar connector (Phase 6 Slice 9-E) (#711)\n\n## Summary\n\nShips the first-party **`apple`** MCP connector: indexes iCloud **Mail\n(IMAP)** + iCloud **Calendar (CalDAV)** into the local index and exposes\n**4 HITL-gated write tools** (`apple_mail_send`,\n`apple_mail_draft_create`, `apple_calendar_event_create`,\n`apple_calendar_event_delete`). This is the **Apple Mail/Calendar** item\n(E) of Phase 6 Slice 9.\n\nPlan: `docs/superpowers/plans/2026-06-21-slice9-apple-mail-calendar.md`\n· Design:\n`docs/superpowers/specs/2026-06-21-slice9-apple-mail-calendar-design.md`\n\n## Architecture\n\n- One AGPL package `packages/mcp-connectors/apple` (stdio MCP server).\n**Mail reuses** the shared `imap-tool-kit` + the gateway's existing IMAP\nsync engine.\n- **Calendar** adds the codebase's first CalDAV path: a pure in-repo\n**iCalendar build/parse module in `@nimbus-dev/sdk`** (`icalendar.ts`,\nshared by connector + gateway — no parser duplication) + an injectable\n`CalDavClient`/transport whose real (tsdav, network) implementation is\nconfined to the coverage-excluded `server.ts` and a thin gateway\ntransport shell.\n- **Writes ride the generic email/calendar dispatch path**\n(`payload.mcpToolId = \"apple_*\"`, `action.type` = the existing\n`email.send` / `email.draft.create` / `calendar.event.create` /\n`calendar.event.delete`), protected by the **existing executor I2 HITL\ngate** — **no new invariant**, no\n`connector-write-registry`/I26/D20/SECURITY-INVARIANTS edits.\n\n## Non-negotiables / privacy\n\n- **No plaintext credentials** — single iCloud app-specific password\n(Vault keys `apple.icloud_email` / `apple.icloud_app_password`) injected\nas env vars by the lazy-mesh spawner; SMTP transport uses `requireTLS`.\n- **Forced sender** — mail writes pin `From` to the authenticated iCloud\naddress.\n- **Metadata-only PII contract** — mail = headers + attachment metadata\n+ ≤2000-char preview (never bodies/bytes); calendar =\nsummary/start/end/location/organizer/status/recurrence + ≤2000-char\nnotes + attendee emails.\n- Cross-platform (no OS gate). `apple:email` routes to 1536-dim\nembeddings; `apple:event` stays 384-dim.\n\n## Verification (full ship gate)\n\n- Rebased onto `main` **after Workday (#709) landed**; resolved all 7\nshared registration-site conflicts (catalog, secrets-manifest,\nrate-limiter, 3× lazy-mesh, assemble-sync) keeping both `workday` and\n`apple`.\n- ✅ `typecheck` (all 86 packages) · `build` · biome (verified on all\ntouched files) · jscpd 3.97% · doc-refs · package-readmes ·\ninvariants/D11 · exclusion-parity · boundaries · cross-platform.\n- ✅ **Coverage-floor: Docker-Linux-authoritative lcov → `ok` (baseline\n`{}`, every new non-excluded file ≥85% line / ≥80% branch).**\n- ✅ Whole-branch code review (subagent): rebase integrity PASS; 3\nfindings + 1 minor, **all fixed** (D11 vault-key listing +\n`readConnectorSecret`, base64 draft CTE, CalDAV filename sanitization,\nSMTP `requireTLS`).\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **New Features**\n* Apple iCloud Mail + Calendar connector now available, indexing emails\nand calendar events with metadata-only previews and attachment metadata.\n* Email and calendar write operations (send, draft creation, event\nmanagement) require user confirmation before execution.\n  * Cross-platform support (Windows, macOS, Linux).\n\n* **Documentation**\n* Added comprehensive design specifications and implementation plans for\nthe connector.\n  * Updated roadmap and changelog with connector delivery information.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-22T16:33:18Z",
          "tree_id": "f1d7d8a6a2e93f658a33df20186ab2ae52d51272",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/58c69e09fba285b03b94eed60f69751103da1bf3"
        },
        "date": 1782147298954,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 297.63269614999734,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 295.0218050500022,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "86aae5cc8d4e10c064d3e35fbe54903cecaa4594",
          "message": "docs(plan): VS Code extension repo extraction plan + review (#712)\n\n## Summary\n\nAdds the implementation plan to extract `packages/vscode-extension` into\na standalone `nimbus-agent/nimbus-vscode` repo, plus the review that\ndrove it. **Docs only** — no code or workflow changes.\n\n-\n`docs/superpowers/plans/2026-06-22-vscode-extension-repo-extraction.md`\n— step-by-step plan (Phase 0 client fix → stand up new repo → standalone\nbuild/CI → hygiene fixes → release → remove from monorepo).\n-\n`docs/superpowers/plans/2026-06-22-vscode-extension-repo-extraction-review.md`\n— the review (prior 4-point pass + an empirically-verified second pass).\n\n## Key finding (review B1 — empirically verified)\n\nThe published `@nimbus-dev/client@0.2.3` ships an unrewritten\n`\"@nimbus-dev/sdk\": \"workspace:*\"` dependency, so it is **uninstallable\noutside the monorepo**:\n\n\\`\\`\\`\n$ bun add @nimbus-dev/client@0.2.3\nerror: @nimbus-dev/sdk@workspace:* failed to resolve   (exit 1)\n\\`\\`\\`\n\n`npm publish` does not rewrite the `workspace:` protocol. The plan\ntherefore opens with a **Phase 0** that patches `publish-client.yml` to\npin internal deps to concrete semver, republishes `client@0.2.4`, and\nverifies standalone install — a hard gate before any extraction work.\n\n## Scope\n\nThis PR only lands the planning docs; executing the plan (new repo,\nMarketplace publish, monorepo removal) is separate, gated work described\nwithin.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Documentation**\n* Added comprehensive planning documentation for VS Code extension\nrepository extraction, including implementation phases, verification\ncheckpoints, and standalone release procedures.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-22T19:44:44+03:00",
          "tree_id": "ce250a02f02ad446271474ff00b847ce18d4faee",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/86aae5cc8d4e10c064d3e35fbe54903cecaa4594"
        },
        "date": 1782148184548,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 289.6322915999972,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 285.37828344999434,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "1b228abeddefa0668b15632b0bee8abe8b9233a4",
          "message": "chore(main): release sdk 1.2.0 (#714)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n##\n[1.2.0](https://github.com/nimbus-agent/Nimbus/compare/sdk-v1.1.2...sdk-v1.2.0)\n(2026-06-22)\n\n\n### Features\n\n* **apple:** iCloud Mail + Calendar connector (Phase 6 Slice 9-E)\n([#711](https://github.com/nimbus-agent/Nimbus/issues/711))\n([58c69e0](https://github.com/nimbus-agent/Nimbus/commit/58c69e09fba285b03b94eed60f69751103da1bf3))\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).",
          "timestamp": "2026-06-22T20:00:11+03:00",
          "tree_id": "1577d744fe298cd96872fcf1fdaa5c7ebbc60dfc",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/1b228abeddefa0668b15632b0bee8abe8b9233a4"
        },
        "date": 1782149126149,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 290.6011737499997,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 294.27878074999535,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "5abd57573a28d67ab676852eaac0ddb2d6e85541",
          "message": "chore(main): release client 0.2.4 (#713)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n##\n[0.2.4](https://github.com/nimbus-agent/Nimbus/compare/client-v0.2.3...client-v0.2.4)\n(2026-06-22)\n\n\n### Dependencies\n\n* The following workspace dependencies were updated\n  * dependencies\n    * @nimbus-dev/sdk bumped to 1.2.0\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Chores**\n  * Updated client package to version 0.2.4\n  * Updated SDK dependency to version 1.2.0\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-06-22T20:19:49+03:00",
          "tree_id": "83a89cd25f787b39c83b6f37a161860cd3a7e10c",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/5abd57573a28d67ab676852eaac0ddb2d6e85541"
        },
        "date": 1782150127999,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 300.7437449500023,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 302.2079078499919,
            "unit": "ms"
          }
        ]
      }
    ]
  }
}