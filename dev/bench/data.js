window.BENCHMARK_DATA = {
  "lastUpdate": 1785340100574,
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
          "id": "17d325e7a55729772623438fa4a914c762d810ea",
          "message": "feat(clips): web clipper gateway — POST /v1/clips, pairing auth, invariant I30 (Phase 6 Slice 9) (#718)\n\n## Web Clipper — Gateway (Plan A) · Phase 6 / Slice 9 (\"Browser &\nReading\")\n\nAdds the gateway surface that lets a browser extension push web pages\ninto the local index — the **inbound-push** analogue of the existing\nSCIM / Teams / deployment routes (no MCP connector). This is **Plan A**;\nthe Chrome + Firefox MV3 extension itself is the follow-on **Plan B**\n(`packages/browser-extension/`).\n\n### What's in this PR\n\n- **Two new I13 write routes** (`WRITE_ROUTE_ALLOWLIST` 6 → 8):\n- `POST /v1/clips` — ingests a clip as a `nimbus:web_clip` item\n(readable-article **or** text-selection body). URL canonicalized\n(tracking params stripped, root slash preserved); article re-clips\n**dedup** on the canonical URL while each selection is a distinct id.\n  - `POST /v1/clips/pair/confirm` — mints the extension's bearer token.\n- **One bearer-authed READ route** `POST /v1/clips/related` — related\nlocal items via FTS (selection-primary, own-host de-prioritized; FTS5\nsyntax neutralized via `ftsMatchQuery` escaping + bound params; **no DB\nmutation**).\n- **Pairing-handshake auth** — `nimbus clip pair [--label]` opens an\nin-memory, single-use, TTL + attempt-capped window (a singleton in\n`assemble.ts` shared by the `clip.*` IPC dispatcher and the HTTP confirm\nroute). The extension redeems the one-time code for a token in a\n**labeled Vault map** (`http_api.web_clipper_tokens`) so Chrome +\nFirefox pair concurrently. `nimbus clip status` lists label + token\n**fingerprint** (never the raw token); `nimbus clip revoke\n[<label>|--all]` is the cut-off for a lost/compromised extension.\n- **Embedding**: `nimbus:web_clip` joins `PROSE_HEAVY_TYPES`\n(OpenAI-1536, MiniLM-384 fallback).\n- **New invariant I30** — fail-closed pairing window: a token is minted\n**only** behind a live owner-opened window; no window / expired / wrong\ncode → 403, no mint (enforced in `security-invariants.test.ts` with a\n**no-mint witness**). The window is strictly in-memory (a restart drops\nit); minted tokens persist in the Vault map. Triple-rule satisfied\n(wiring + docs + test).\n\nClip ingest is **inbound** (writes the local index, no outbound egress)\n→ **not** HITL-gated, **not** egress-ledgered. **No migration**\n(`web_clip` reuses the `item` table + FTS triggers).\n\n### Verification\n\n- **281 web-clipper tests pass** (clips, http surfaces, clip-rpc,\nhttp-write-routes, http-server, security-invariants/I30, clip CLI,\nrouting). An **E2E** proves the real round-trip against a live gateway:\npair → `POST /v1/clips/pair/confirm` → `POST /v1/clips` (Bearer) →\n`nimbus search` finds the clip; plus `/v1/clips/related` 200/401/400.\n- **Preflight**: all static gates green (typecheck, biome, markdown, 13\naudits incl. `audit:invariants` + `audit:status-drift`, jscpd, build).\n- **Coverage floor** (Docker `oven/bun:latest` = CI bun 1.3.14,\nLinux-authoritative): **`coverage-floor: ok`**, baseline unchanged.\nEvery new/modified file clears line ≥85 / branch ≥80.\n\n> Note: a local `test:ci` run shows 10 failures **unrelated to this PR**\n— they are caused by this dev machine's env vars\n(`NIMBUS_DISTRIBUTION_CHANNEL=msi` → updater-dispatcher tests;\n`NIMBUS_OAUTH_GOOGLE_CLIENT_ID` set → one connector-auth test). Those\nfiles are byte-identical to `main` and pass on a clean env (proven by\nthe Docker run, which has neither var). No web-clipper test is among\nthem.\n\n### Design docs\n\n- Spec: `docs/superpowers/specs/2026-06-21-web-clipper-design.md`\n- Plan: `docs/superpowers/plans/2026-06-21-web-clipper-gateway.md`\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **New Features**\n* Added web clipper functionality enabling users to clip article content\nand selections into the local index via a browser extension\n* Introduced device pairing workflow with time-limited one-time codes\nfor browser authentication\n* Added CLI commands (`nimbus clip pair|status|revoke`) for managing\npaired devices and tokens\n* Implemented related-clips search sidecar for discovering similar\ncontent without leaving the browser tab\n\n* **Documentation**\n* Updated architecture, roadmap, changelog, and security documentation\nto reflect web clipper delivery\n  * Added comprehensive design specifications and implementation plans\n* Documented new security invariant I30 for fail-closed token minting\nduring active pairing windows\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-22T18:42:22Z",
          "tree_id": "cd1f000346c45b73449b75a7d7796b67224d0253",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/17d325e7a55729772623438fa4a914c762d810ea"
        },
        "date": 1782154582540,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 303.01826190000463,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 304.0748515000014,
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
          "id": "ac1dfa8288bac3593cf399da67018ee2e57ad36f",
          "message": "docs(clips): Plan B (web-clipper extension) → its own repo nimbus-web-clipper (#720)\n\nFollow-up to #718 (merged). Records the decision to ship the web-clipper\nbrowser extension (Plan B) as a **standalone satellite repo\n`nimbus-agent/nimbus-web-clipper`** (mirroring `nimbus-vscode`),\nsuperseding the earlier `packages/browser-extension/` monorepo\nplacement. Docs-only: updates the spec's repo-home decision + the Plan-B\nreferences in the spec, plan, roadmap, and CHANGELOG. Plan A (gateway)\nis unchanged — it shipped in #718.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-22T22:02:33+03:00",
          "tree_id": "92a53e992ae50596faf2b5e4365eb4f1ad03bd9c",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/ac1dfa8288bac3593cf399da67018ee2e57ad36f"
        },
        "date": 1782155653710,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 303.36779070000193,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 303.9090389500012,
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
          "id": "77fd00f249bd213ef126c5e29d02a41ce8066068",
          "message": "chore: extract VS Code extension to its own repo (#721)\n\n## Summary\n\nRemoves `packages/vscode-extension` from the monorepo. The extension now\nlives at\n**[nimbus-agent/nimbus-vscode](https://github.com/nimbus-agent/nimbus-vscode)**\n— released standalone as `v0.2.0` (live on the Marketplace + Open VSX)\nand consuming the published `@nimbus-dev/client@^0.2.4`.\n\nThis is the final step of the extraction (the plan + the client\n`workspace:*`→concrete publish fix already merged separately).\n\n## Changes\n- **Delete** `packages/vscode-extension/` (42 files) and\n`.github/workflows/publish-vscode.yml`.\n- **Workspace/scripts:** drop the workspace entry and the\n`test:coverage:vscode-extension` script.\n- **Audits/config:** remove vscode-extension from coverage-floor\nexclusions + the parity check, the package-READMEs audit, the JS-license\noverrides (`@vscode/vsce-sign*`, `ovsx`), the sonar coverage exclusions,\n`ci.yml` path filters, `.gitignore`, and the docs issue template.\n- **Kept** the `@nimbus-dev/client` prebuild CI step — **the CLI imports\nit**, so it's still needed; comments repointed from \"vscode-extension\"\nto \"cli\".\n- **Docs:** repoint CLAUDE.md / GEMINI.md / architecture / roadmap /\nfile-map / coverage; drop the extension's I7 rows from\nSECURITY-INVARIANTS; add a `docs/CHANGELOG.md` entry.\n\n## Verification (local)\ntypecheck (all packages) ✅ · `doc-refs` · `status-drift` ·\n`exclusion-parity` · `package-readmes` · `js-licenses` ·\n`release-please` · `lint:markdown` · biome · invariants — all green.\nFull test suite + coverage-floor run on CI (Linux-authoritative).\n\n## Follow-ups (not in this PR)\n- The monorepo's `Protected release tags` ruleset still lists\n`vscode-v*` — harmless (no such tags will be pushed); can be pruned\nlater.\n- The `VSCE_PAT` / `OVSX_PAT` secrets were already deleted from this\nrepo.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-23T03:54:39Z",
          "tree_id": "cfa8fb7d9c78077062d523c7125ec863d8ee5a65",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/77fd00f249bd213ef126c5e29d02a41ce8066068"
        },
        "date": 1782187591798,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 295.0869363499969,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 304.02637995000407,
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
          "id": "6921076df3fa2f35359b51562b3a290ff2f5237f",
          "message": "chore(main): release 0.18.0 (#723)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n##\n[0.18.0](https://github.com/nimbus-agent/Nimbus/compare/v0.17.0...v0.18.0)\n(2026-06-23)\n\n\n### Features\n\n* **clips:** web clipper gateway — POST /v1/clips, pairing auth,\ninvariant I30 (Phase 6 Slice 9)\n([#718](https://github.com/nimbus-agent/Nimbus/issues/718))\n([17d325e](https://github.com/nimbus-agent/Nimbus/commit/17d325e7a55729772623438fa4a914c762d810ea))\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **New Features**\n* Added a clips web clipper gateway with a new POST `/v1/clips` endpoint\nfor web clipping capabilities.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-06-23T15:24:18+03:00",
          "tree_id": "174b4af9892b3c3936cedbf92c7995bab6968647",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/6921076df3fa2f35359b51562b3a290ff2f5237f"
        },
        "date": 1782218420004,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 295.64957065000306,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 293.2341789500002,
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
          "id": "3a87e54a7335c1be87ecb582673183b242b97c88",
          "message": "fix(sonar): clear the SonarCloud board — S5906 sweep + long-tail code smells (#731)\n\nDrives the SonarCloud board to zero open issues.\n\n## What\n- **S5906** (most-specific assertion): finished the `.length` →\n`toHaveLength` sweep — converted the remaining ~45 equality sites (incl.\noptional-chain and regex-match forms) the earlier sweep missed.\nArithmetic length expressions (`one.length - base.length`) are correctly\nleft alone (not flaggable).\n- **S8786** (non-linear backtracking): narrowed `[^>]`→`[^<>]` in\nlink/HTML regexes; replaced unanchored trailing-trim regexes (`[...]+$`\n/ `\\n+$` / `=+$`) with linear no-regex strips — notably the\n**policy-signing canonicalizer** (exact signed bytes preserved) and the\n`data-model-key` normalizer; bounded the base64 padding strip to\n`{1,2}`; made the `kb-markdown` bullet capture deterministic (`(\\S.*)?`\nkills the `\\s+`/`.*` overlap).\n- **S3776 / S107**: extracted a `walkDomain` args object + `runDomain`\nhelper (workday-sync) and parse helpers (nimbus-toml-workday) to cut\ncognitive complexity / param count.\n- **S8782**: hooks moved above the test cases.\n- Plus the connectors/sdk/clips long-tail already on the branch.\n\n## Verification\n- `bun run typecheck` ✅ (all packages)\n- `biome check` ✅ on all changed files\n- Targeted tests for changed src + a sample of converted test files ✅\n- Behavior-preserving: signing canonicalizer and warehouse-key\nnormalizer use exact char sets (no semantic drift).\n\nCloses the open-issues backlog once merged; SonarCloud PR analysis\nconfirms.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Tests**\n* Updated test assertions to use modern matcher syntax for improved\nclarity and consistency across the test suite.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-23T13:13:01Z",
          "tree_id": "f38e4bfdd1ceb3f0bd92405e37935b68cfbd43bc",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/3a87e54a7335c1be87ecb582673183b242b97c88"
        },
        "date": 1782221801267,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 292.91285145000217,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 295.3323794499909,
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
          "id": "97549b09257de334da769b7da1dbf192cbb453b2",
          "message": "chore(ci): bump bencherdev/bencher from 0.6.7 to 0.6.8 (#728)\n\nBumps [bencherdev/bencher](https://github.com/bencherdev/bencher) from\n0.6.7 to 0.6.8.\n<details>\n<summary>Release notes</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/bencherdev/bencher/releases\">bencherdev/bencher's\nreleases</a>.</em></p>\n<blockquote>\n<h2>v0.6.8</h2>\n<ul>\n<li><strong>BREAKING CHANGE</strong> Change the default self-hosted API\nserver port from <code>61016</code> to the newly <a\nhref=\"https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=6610\">IANA-registered</a>\n<code>6610</code>. Deployments relying on the default now serve the API\non <code>6610</code>. Update clients, reverse proxies, and\n<code>--host</code>/<code>BENCHER_HOST</code> references (Docker\nCompose, devcontainer, and docs are updated to match). To stay on\n<code>61016</code>, set <code>server.bind_address</code> to\n<code>0.0.0.0:61016</code> (or run <code>bencher up --api-port\n61016</code>).</li>\n<li>Mark the remaining user API token REST endpoints (list, view,\nupdate, and revoke) as deprecated in the OpenAPI spec and API docs; they\ncontinue to work for existing tokens</li>\n</ul>\n</blockquote>\n</details>\n<details>\n<summary>Commits</summary>\n<ul>\n<li><a\nhref=\"https://github.com/bencherdev/bencher/commit/5f9d4cf890255c35e0354af1ed325108a6a0babd\"><code>5f9d4cf</code></a>\nRelease v0.6.8</li>\n<li><a\nhref=\"https://github.com/bencherdev/bencher/commit/deb634db257d475abc43f69b1f56eaaf0f4e5512\"><code>deb634d</code></a>\nAdd a <code>Continue Unlicensed</code> button to Self-Hosted\nonboarding</li>\n<li><a\nhref=\"https://github.com/bencherdev/bencher/commit/8deb121fb4c888441f1168fd9c943e425d52ef4b\"><code>8deb121</code></a>\nChange default API server port from <code>61016</code> to\n<code>6610</code> (<a\nhref=\"https://redirect.github.com/bencherdev/bencher/issues/905\">#905</a>)</li>\n<li><a\nhref=\"https://github.com/bencherdev/bencher/commit/eef36e76230f77e92f3f3a941e31cde1966604d8\"><code>eef36e7</code></a>\nMove over to Pro plan (<a\nhref=\"https://redirect.github.com/bencherdev/bencher/issues/907\">#907</a>)</li>\n<li><a\nhref=\"https://github.com/bencherdev/bencher/commit/f553ea06f7e30cec7ec7f909980093b8005e79be\"><code>f553ea0</code></a>\nResolve plan tier by base-fee presence instead of the Stripe product\nname (<a\nhref=\"https://redirect.github.com/bencherdev/bencher/issues/911\">#911</a>)</li>\n<li><a\nhref=\"https://github.com/bencherdev/bencher/commit/42cbda53f466124bcf73e19d6de7cd3834081717\"><code>42cbda5</code></a>\nAdd Console design guide (<a\nhref=\"https://redirect.github.com/bencherdev/bencher/issues/910\">#910</a>)</li>\n<li><a\nhref=\"https://github.com/bencherdev/bencher/commit/fc3e1e66b2f2f72416e2d117e8c46ef4fe31589f\"><code>fc3e1e6</code></a>\nAdd Pro plan metered usage and split out a Bencher Metrics product (<a\nhref=\"https://redirect.github.com/bencherdev/bencher/issues/909\">#909</a>)</li>\n<li><a\nhref=\"https://github.com/bencherdev/bencher/commit/131f62b3f3fe6c96eaf66e3827862f8ca62b1fb6\"><code>131f62b</code></a>\nAdd Pro plan backend: billing credits, sweep, plan PATCH, CLI (<a\nhref=\"https://redirect.github.com/bencherdev/bencher/issues/906\">#906</a>)</li>\n<li><a\nhref=\"https://github.com/bencherdev/bencher/commit/7331a55e18349d38e5f463e6f85040f1ca207acd\"><code>7331a55</code></a>\nPublish Bare Metal Runner documentation (<a\nhref=\"https://redirect.github.com/bencherdev/bencher/issues/908\">#908</a>)</li>\n<li><a\nhref=\"https://github.com/bencherdev/bencher/commit/c7fa7b18b31433494b0ef2070efe920ea4297b06\"><code>c7fa7b1</code></a>\nUpdate kernel 6.1.172 -&gt; 6.1.174 (<a\nhref=\"https://redirect.github.com/bencherdev/bencher/issues/904\">#904</a>)</li>\n<li>Additional commits viewable in <a\nhref=\"https://github.com/bencherdev/bencher/compare/ec56bb69a7f34096002ca3384d10e2f6676b063e...5f9d4cf890255c35e0354af1ed325108a6a0babd\">compare\nview</a></li>\n</ul>\n</details>\n<br />\n\n\n[![Dependabot compatibility\nscore](https://dependabot-badges.githubapp.com/badges/compatibility_score?dependency-name=bencherdev/bencher&package-manager=github_actions&previous-version=0.6.7&new-version=0.6.8)](https://docs.github.com/en/github/managing-security-vulnerabilities/about-dependabot-security-updates#about-compatibility-scores)\n\nDependabot will resolve any conflicts with this PR as long as you don't\nalter it yourself. You can also trigger a rebase manually by commenting\n`@dependabot rebase`.\n\n[//]: # (dependabot-automerge-start)\n[//]: # (dependabot-automerge-end)\n\n---\n\n<details>\n<summary>Dependabot commands and options</summary>\n<br />\n\nYou can trigger Dependabot actions by commenting on this PR:\n- `@dependabot rebase` will rebase this PR\n- `@dependabot recreate` will recreate this PR, overwriting any edits\nthat have been made to it\n- `@dependabot show <dependency name> ignore conditions` will show all\nof the ignore conditions of the specified dependency\n- `@dependabot ignore this major version` will close this PR and stop\nDependabot creating any more for this major version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this minor version` will close this PR and stop\nDependabot creating any more for this minor version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this dependency` will close this PR and stop\nDependabot creating any more for this dependency (unless you reopen the\nPR or upgrade to it yourself)\n\n\n</details>\n\nSigned-off-by: dependabot[bot] <support@github.com>\nCo-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>",
          "timestamp": "2026-06-23T16:18:18+03:00",
          "tree_id": "eeab0ffd91172e0f1437e26b3bc1953a59a223be",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/97549b09257de334da769b7da1dbf192cbb453b2"
        },
        "date": 1782222714423,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 294.74191335000506,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 292.04240255,
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
          "id": "23ee2064591da59364cdde39d395fa84018f9eed",
          "message": "chore(deps): bump jscpd from 4.2.4 to 5.0.11 (#732)\n\nBumps [jscpd](https://github.com/kucherenko/jscpd/tree/HEAD/rust/jscpd)\nfrom 4.2.4 to 5.0.11.\n<details>\n<summary>Release notes</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/kucherenko/jscpd/releases\">jscpd's\nreleases</a>.</em></p>\n<blockquote>\n<h2>Release v5.0.10</h2>\n<p>cpd (Rust) v5.0.10</p>\n<h3>Bug Fixes</h3>\n<ul>\n<li>Emit scan-root-relative paths in all reporters when <code>absolute:\nfalse</code> (or the default). Previously, <code>jscpd /abs/path</code>\nfrom a different CWD left absolute paths in\nSARIF/JSON/XML/HTML/CSV/Markdown/console output, and Windows/macOS path\ncanonicalization could leave <code>\\\\?\\</code> or <code>./</code>\nprefixes. Paths are now normalized against the canonicalized scan root\n(with CWD fallback) and stripped of any leading <code>./</code> or\n<code>.\\\\</code> component. Fixes <a\nhref=\"https://redirect.github.com/kucherenko/jscpd/issues/827\">#827</a></li>\n<li>Fix <code>--skip-local</code> to match jscpd v4 TypeScript\nsemantics: it now filters clones where both fragments are under the same\nscan root, instead of only skipping clones in the same parent\ndirectory</li>\n</ul>\n<h3>Refactoring</h3>\n<ul>\n<li>DRY duplication in reporters: extract shared helpers\n(<code>print_clone_header</code>, <code>print_clone_locations</code>,\n<code>print_snippet</code>, <code>write_report_file</code>, report\nstatistics, test fixtures, etc.) into\n<code>cpd-reporter/src/shared.rs</code>. Console, console-full, CSV,\nJSON, HTML, Markdown, silent, XML, and SARIF reporters now reuse the\nsame implementation, reducing the monorepo's reported duplication ratio\nfrom 5.0% to 0.56% and fixing a latent <code>--absolute</code> path\nrelativization bug in the same pass</li>\n<li>Move blame enrichment from <code>gitoxide</code> to <code>git blame\n--porcelain</code>; capture elapsed time after blame so timing includes\nblame work</li>\n<li>Resolve <code>needless_borrow</code> clippy warnings in CSV and\nMarkdown reporters</li>\n</ul>\n<h3>Documentation</h3>\n<ul>\n<li>Add Nix and Homebrew install instructions to Rust READMEs. <a\nhref=\"https://redirect.github.com/kucherenko/jscpd/issues/818\">#818</a></li>\n<li>Update project homepage URLs to <code>https://jscpd.dev</code> in\nall <code>Cargo.toml</code> and npm <code>package.json</code> files, add\ncurl install method to READMEs, clean up outdated badges</li>\n<li>Remove defunct Universal Analytics tracking pixels from all\nREADMEs</li>\n</ul>\n<h2>Published Packages</h2>\n<ul>\n<li><code>cpd-core@0.1.5</code> on crates.io</li>\n<li><code>cpd-finder@0.1.8</code> on crates.io</li>\n<li><code>cpd-reporter@0.1.7</code> on crates.io</li>\n<li><code>cpd-tokenizer@0.1.6</code> on crates.io</li>\n<li><code>jscpd@5.0.10</code> on crates.io</li>\n<li><code>cpd@5.0.10</code> on npm</li>\n<li><code>jscpd@5.0.10</code> on npm</li>\n<li><code>cpd-darwin-arm64@5.0.10</code> on npm</li>\n<li><code>cpd-darwin-x64@5.0.10</code> on npm</li>\n<li><code>cpd-linux-x64-gnu@5.0.10</code> on npm</li>\n<li><code>cpd-linux-arm64-gnu@5.0.10</code> on npm</li>\n<li><code>cpd-linux-x64-musl@5.0.10</code> on npm</li>\n<li><code>cpd-windows-x64-msvc@5.0.10</code> on npm</li>\n</ul>\n<h2>Install</h2>\n<pre lang=\"bash\"><code>npm install -g cpd\n# or\nnpm install -g jscpd\n# or\ncargo install jscpd\n</code></pre>\n<h2>v5.0.9</h2>\n<h3>New Features</h3>\n<ul>\n<li>GitHub Action for jscpd (Rust v5) —\n<code>jscpd-copy-paste-detector</code> action for GitHub Actions\nMarketplace. Scan your repo for copy/paste in CI with <code>uses:\nkucherenko/jscpd/.github/workflows/action.yml@v5</code></li>\n</ul>\n<!-- raw HTML omitted -->\n</blockquote>\n<p>... (truncated)</p>\n</details>\n<details>\n<summary>Changelog</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/kucherenko/jscpd/blob/master/CHANGELOG.md\">jscpd's\nchangelog</a>.</em></p>\n<blockquote>\n<h2>5.0.11</h2>\n<h3>New Features</h3>\n<ul>\n<li><strong>Razor (.razor) support</strong> — new tokenizer for Razor\nfiles in the Rust backend (thanks to <a\nhref=\"https://github.com/chrisc-onaorg\"><code>@​chrisc-onaorg</code></a>\nin <a\nhref=\"https://redirect.github.com/kucherenko/jscpd/pull/829\">#829</a>)</li>\n</ul>\n<h3>Dependencies</h3>\n<ul>\n<li><code>cpd-core</code> bumped to 0.1.6, <code>cpd-tokenizer</code>\nbumped to 0.1.7</li>\n</ul>\n<hr />\n<h2>5.0.10</h2>\n<h3>Bug Fixes</h3>\n<ul>\n<li>Emit scan-root-relative paths in all reporters when <code>absolute:\nfalse</code>. Fixes <a\nhref=\"https://redirect.github.com/kucherenko/jscpd/issues/827\">#827</a></li>\n<li>Fix <code>--skip-local</code> to match jscpd v4 TypeScript\nsemantics</li>\n</ul>\n<h3>Refactoring</h3>\n<ul>\n<li>DRY duplication in reporters: extract shared helpers into\n<code>cpd-reporter/src/shared.rs</code></li>\n<li>Move blame enrichment from <code>gitoxide</code> to <code>git blame\n--porcelain</code></li>\n</ul>\n<hr />\n<h2>5.0.9</h2>\n<h3>New Features</h3>\n<ul>\n<li>GitHub Action for jscpd (Rust v5) —\n<code>jscpd-copy-paste-detector</code> action for GitHub Actions\nMarketplace. Scan your repo for copy/paste in CI with <code>uses:\nkucherenko/jscpd/.github/workflows/action.yml@v5</code></li>\n</ul>\n<h3>Bug Fixes</h3>\n<ul>\n<li>Resolve platform binary resolution when <code>cpd</code> is\ninstalled as a nested dependency (e.g. in a project's\n<code>node_modules</code> via a parent package). The runner now\ncorrectly locates the platform-specific binary relative to the installed\npackage rather than assuming a top-level install. Fixes <a\nhref=\"https://redirect.github.com/kucherenko/jscpd/issues/816\">#816</a></li>\n</ul>\n<hr />\n<h2>5.0.8</h2>\n<h3>Bug Fixes</h3>\n<ul>\n<li>Prevent mmap exhaustion crashes when scanning repositories with more\nfiles than <code>vm.max_map_count</code> (default 131 072 on Linux). The\nwalker previously held a live <code>Mmap</code> per discovered file;\neach rayon worker now opens and drops its mapping within the processing\nclosure, capping concurrent mappings to the thread-pool size (typically\n8–32). Fixes <a\nhref=\"https://redirect.github.com/kucherenko/jscpd/issues/813\">#813</a></li>\n<li>Fix <code>--pattern</code> not matching relative paths when the scan\nroot is absolute (e.g. CWD). Patterns like <code>src/**/*.ts</code> now\nmatch correctly by comparing against both the relative path and the full\nabsolute path, and bare patterns like <code>*.ts</code> gain a\n<code>**/</code> prefix to match at any depth. Fixes <a\nhref=\"https://redirect.github.com/kucherenko/jscpd/issues/811\">#811</a></li>\n<li>Fix trailing-newline off-by-one in line-count filter: files not\nending with <code>\\n</code> now count the final line correctly</li>\n</ul>\n<hr />\n<h2>5.0.7</h2>\n<!-- raw HTML omitted -->\n</blockquote>\n<p>... (truncated)</p>\n</details>\n<details>\n<summary>Commits</summary>\n<ul>\n<li>See full diff in <a\nhref=\"https://github.com/kucherenko/jscpd/commits/v5.0.11/rust/jscpd\">compare\nview</a></li>\n</ul>\n</details>\n<br />\n\n\n[![Dependabot compatibility\nscore](https://dependabot-badges.githubapp.com/badges/compatibility_score?dependency-name=jscpd&package-manager=bun&previous-version=4.2.4&new-version=5.0.11)](https://docs.github.com/en/github/managing-security-vulnerabilities/about-dependabot-security-updates#about-compatibility-scores)\n\nDependabot will resolve any conflicts with this PR as long as you don't\nalter it yourself. You can also trigger a rebase manually by commenting\n`@dependabot rebase`.\n\n[//]: # (dependabot-automerge-start)\n[//]: # (dependabot-automerge-end)\n\n---\n\n<details>\n<summary>Dependabot commands and options</summary>\n<br />\n\nYou can trigger Dependabot actions by commenting on this PR:\n- `@dependabot rebase` will rebase this PR\n- `@dependabot recreate` will recreate this PR, overwriting any edits\nthat have been made to it\n- `@dependabot show <dependency name> ignore conditions` will show all\nof the ignore conditions of the specified dependency\n- `@dependabot ignore this major version` will close this PR and stop\nDependabot creating any more for this major version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this minor version` will close this PR and stop\nDependabot creating any more for this minor version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this dependency` will close this PR and stop\nDependabot creating any more for this dependency (unless you reopen the\nPR or upgrade to it yourself)\n\n\n</details>\n\nSigned-off-by: dependabot[bot] <support@github.com>\nCo-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>\nCo-authored-by: AsafGolombek <asafgolombek@gmail.com>",
          "timestamp": "2026-06-23T16:28:00+03:00",
          "tree_id": "b9319b4d0209d69ff03bc26d71810d0231bbaf93",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/23ee2064591da59364cdde39d395fa84018f9eed"
        },
        "date": 1782223551762,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 316.3163183499957,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 318.33118440000436,
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
          "id": "4a6edd159bdb4c81a172ba97cc77ea3723567e8c",
          "message": "chore(main): release client 0.2.5 (#735)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n##\n[0.2.5](https://github.com/nimbus-agent/Nimbus/compare/client-v0.2.4...client-v0.2.5)\n(2026-06-23)\n\n\n### Bug Fixes\n\n* **sonar:** clear the SonarCloud board — S5906 sweep + long-tail code\nsmells ([#731](https://github.com/nimbus-agent/Nimbus/issues/731))\n([3a87e54](https://github.com/nimbus-agent/Nimbus/commit/3a87e54a7335c1be87ecb582673183b242b97c88))\n\n\n### Dependencies\n\n* The following workspace dependencies were updated\n  * dependencies\n    * @nimbus-dev/sdk bumped to 1.2.1\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).",
          "timestamp": "2026-06-23T17:12:45+03:00",
          "tree_id": "706060c5d9ae333dcfd9789a0c26a9acd2d850aa",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/4a6edd159bdb4c81a172ba97cc77ea3723567e8c"
        },
        "date": 1782224662837,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 301.35451180000234,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 306.8699393000046,
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
          "id": "f0a48ad0f5ff5d7de8315f6b93eadc982c90f6a0",
          "message": "chore(deps): bump @babel/preset-typescript from 7.29.7 to 8.0.1 (#734)\n\nBumps\n[@babel/preset-typescript](https://github.com/babel/babel/tree/HEAD/packages/babel-preset-typescript)\nfrom 7.29.7 to 8.0.1.\n<details>\n<summary>Release notes</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/babel/babel/releases\">@​babel/preset-typescript's\nreleases</a>.</em></p>\n<blockquote>\n<h2>v8.0.1 (2026-06-17)</h2>\n<p>This release includes a breaking change that was in the Babel 8\nmigration guide's <a\nhref=\"https://babeljs.io/docs/v8-migration/#getting-ready\">Getting\nready</a> section and <a\nhref=\"https://babeljs.io/blog/2026/06/16/8.0.0/#extract-polyfill-injection-to-separate-packages\">in\nthe release post</a>, but the actual removal of the feature from the\ncodebase was accidentally not complete.</p>\n<h4>:boom: Breaking Change</h4>\n<ul>\n<li><code>babel-core</code>,\n<code>babel-plugin-transform-object-rest-spread</code>,\n<code>babel-plugin-transform-runtime</code>,\n<code>babel-preset-env</code>, <code>babel-standalone</code>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/18079\">#18079</a>\nActually remove <code>preset-env</code>'s <code>useBuiltIns</code> (<a\nhref=\"https://github.com/nicolo-ribaudo\"><code>@​nicolo-ribaudo</code></a>)</li>\n</ul>\n</li>\n</ul>\n<h4>Committers: 2</h4>\n<ul>\n<li>Huáng Jùnliàng (<a\nhref=\"https://github.com/JLHwung\"><code>@​JLHwung</code></a>)</li>\n<li>Nicolò Ribaudo (<a\nhref=\"https://github.com/nicolo-ribaudo\"><code>@​nicolo-ribaudo</code></a>)</li>\n</ul>\n<h2>v8.0.0 (2026-06-16)</h2>\n<p><strong>NOTE:</strong> The changelog below is relative to\nv8.0.0-rc.6. You can find a summary of all the breaking changes shipped\nin the Babel 8 release line in the <a\nhref=\"https://babeljs.io/docs/v8-migration\">migration guide for\nusers</a> and <a\nhref=\"https://babeljs.io/docs/v8-migration-api\">migration guide for\nplugin developers</a>.</p>\n<p>Read the release blog post at <a\nhref=\"http://babeljs.io/blog/2026/06/16/8.0.0\">http://babeljs.io/blog/2026/06/16/8.0.0</a>!</p>\n<h4>:eyeglasses: Spec Compliance</h4>\n<ul>\n<li><code>babel-core</code>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/18039\">#18039</a>\nperf: Only extract source map comments at the end of the file (<a\nhref=\"https://github.com/liuxingbaoyu\"><code>@​liuxingbaoyu</code></a>)</li>\n</ul>\n</li>\n</ul>\n<h4>:boom: Breaking Change</h4>\n<ul>\n<li><code>babel-cli</code>, <code>babel-node</code>,\n<code>babel-plugin-proposal-decorators</code>,\n<code>babel-plugin-transform-classes</code>,\n<code>babel-plugin-transform-function-name</code>,\n<code>babel-plugin-transform-modules-commonjs</code>,\n<code>babel-plugin-transform-object-rest-spread</code>,\n<code>babel-plugin-transform-parameters</code>,\n<code>babel-plugin-transform-react-constant-elements</code>,\n<code>babel-plugin-transform-regenerator</code>,\n<code>babel-preset-env</code>, <code>babel-register</code>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/18069\">#18069</a>\nFallback to assuming ESM support with <code>modules: auto</code> (<a\nhref=\"https://github.com/nicolo-ribaudo\"><code>@​nicolo-ribaudo</code></a>)</li>\n</ul>\n</li>\n<li><code>babel-plugin-transform-runtime</code>,\n<code>babel-runtime-corejs3</code>, <code>babel-runtime</code>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/18036\">#18036</a>\nRemove corejs exports for <code>@babe/runtime-corejs3</code> (<a\nhref=\"https://github.com/liuxingbaoyu\"><code>@​liuxingbaoyu</code></a>)</li>\n</ul>\n</li>\n<li><code>babel-parser</code>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/18034\">#18034</a>\nRemove <code>locations: &quot;packed&quot;</code> (<a\nhref=\"https://github.com/liuxingbaoyu\"><code>@​liuxingbaoyu</code></a>)</li>\n</ul>\n</li>\n</ul>\n<h4>:bug: Bug Fix</h4>\n<ul>\n<li><code>babel-generator</code>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/18046\">#18046</a>\nfix(generator): improve new callee parens check (<a\nhref=\"https://github.com/JLHwung\"><code>@​JLHwung</code></a>)</li>\n</ul>\n</li>\n<li><code>babel-plugin-transform-modules-systemjs</code>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/18032\">#18032</a>\nfix(systemjs): support <strong>proto</strong> as an export name (<a\nhref=\"https://github.com/JLHwung\"><code>@​JLHwung</code></a>)</li>\n</ul>\n</li>\n</ul>\n<h4>:memo: Documentation</h4>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/18070\">#18070</a> Add\nEOL date for Babel 7 (end of June 2027) to SECURITY.md (<a\nhref=\"https://github.com/nicolo-ribaudo\"><code>@​nicolo-ribaudo</code></a>)</li>\n</ul>\n<h4>:house: Internal</h4>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/18018\">#18018</a> ci:\nenforce yarn integrity (<a\nhref=\"https://github.com/JLHwung\"><code>@​JLHwung</code></a>)</li>\n</ul>\n<h4>:running_woman: Performance</h4>\n<ul>\n<li><code>babel-core</code>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/18039\">#18039</a>\nperf: Only extract source map comments at the end of the file (<a\nhref=\"https://github.com/liuxingbaoyu\"><code>@​liuxingbaoyu</code></a>)</li>\n</ul>\n</li>\n</ul>\n<h4>Committers: 6</h4>\n<ul>\n<li>Babel Bot (<a\nhref=\"https://github.com/babel-bot\"><code>@​babel-bot</code></a>)</li>\n<li>Huáng Jùnliàng (<a\nhref=\"https://github.com/JLHwung\"><code>@​JLHwung</code></a>)</li>\n<li>James Garbutt (<a\nhref=\"https://github.com/43081j\"><code>@​43081j</code></a>)</li>\n</ul>\n<!-- raw HTML omitted -->\n</blockquote>\n<p>... (truncated)</p>\n</details>\n<details>\n<summary>Changelog</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/babel/babel/blob/main/CHANGELOG.md\">@​babel/preset-typescript's\nchangelog</a>.</em></p>\n<blockquote>\n<h2>v8.0.1 (2026-06-17)</h2>\n<h4>:boom: Breaking Change</h4>\n<ul>\n<li><code>babel-core</code>,\n<code>babel-plugin-transform-object-rest-spread</code>,\n<code>babel-plugin-transform-runtime</code>,\n<code>babel-preset-env</code>, <code>babel-standalone</code>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/18079\">#18079</a>\nActually remove <code>preset-env</code>'s <code>useBuiltIns</code> (<a\nhref=\"https://github.com/nicolo-ribaudo\"><code>@​nicolo-ribaudo</code></a>)</li>\n</ul>\n</li>\n</ul>\n<h2>v8.0.0 (2026-06-16)</h2>\n<h4>:eyeglasses: Spec Compliance</h4>\n<ul>\n<li><code>babel-core</code>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/18039\">#18039</a>\nperf: Only extract source map comments at the end of the file (<a\nhref=\"https://github.com/liuxingbaoyu\"><code>@​liuxingbaoyu</code></a>)</li>\n</ul>\n</li>\n</ul>\n<h4>:boom: Breaking Change</h4>\n<ul>\n<li><code>babel-cli</code>, <code>babel-node</code>,\n<code>babel-plugin-proposal-decorators</code>,\n<code>babel-plugin-transform-classes</code>,\n<code>babel-plugin-transform-function-name</code>,\n<code>babel-plugin-transform-modules-commonjs</code>,\n<code>babel-plugin-transform-object-rest-spread</code>,\n<code>babel-plugin-transform-parameters</code>,\n<code>babel-plugin-transform-react-constant-elements</code>,\n<code>babel-plugin-transform-regenerator</code>,\n<code>babel-preset-env</code>, <code>babel-register</code>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/18069\">#18069</a>\nFallback to assuming ESM support with <code>modules: auto</code> (<a\nhref=\"https://github.com/nicolo-ribaudo\"><code>@​nicolo-ribaudo</code></a>)</li>\n</ul>\n</li>\n<li><code>babel-plugin-transform-runtime</code>,\n<code>babel-runtime-corejs3</code>, <code>babel-runtime</code>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/18036\">#18036</a>\nRemove corejs exports for <code>@babe/runtime-corejs3</code> (<a\nhref=\"https://github.com/liuxingbaoyu\"><code>@​liuxingbaoyu</code></a>)</li>\n</ul>\n</li>\n<li><code>babel-parser</code>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/18034\">#18034</a>\nRemove <code>locations: &quot;packed&quot;</code> (<a\nhref=\"https://github.com/liuxingbaoyu\"><code>@​liuxingbaoyu</code></a>)</li>\n</ul>\n</li>\n</ul>\n<h4>:bug: Bug Fix</h4>\n<ul>\n<li><code>babel-generator</code>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/18046\">#18046</a>\nfix(generator): improve new callee parens check (<a\nhref=\"https://github.com/JLHwung\"><code>@​JLHwung</code></a>)</li>\n</ul>\n</li>\n<li><code>babel-plugin-transform-modules-systemjs</code>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/18032\">#18032</a>\nfix(systemjs): support <strong>proto</strong> as an export name (<a\nhref=\"https://github.com/JLHwung\"><code>@​JLHwung</code></a>)</li>\n</ul>\n</li>\n</ul>\n<h4>:memo: Documentation</h4>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/18070\">#18070</a> Add\nEOL date for Babel 7 (end of June 2027) to SECURITY.md (<a\nhref=\"https://github.com/nicolo-ribaudo\"><code>@​nicolo-ribaudo</code></a>)</li>\n</ul>\n<h4>:house: Internal</h4>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/18018\">#18018</a> ci:\nenforce yarn integrity (<a\nhref=\"https://github.com/JLHwung\"><code>@​JLHwung</code></a>)</li>\n</ul>\n<h4>:running_woman: Performance</h4>\n<ul>\n<li><code>babel-core</code>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/18039\">#18039</a>\nperf: Only extract source map comments at the end of the file (<a\nhref=\"https://github.com/liuxingbaoyu\"><code>@​liuxingbaoyu</code></a>)</li>\n</ul>\n</li>\n</ul>\n<h2>v8.0.0-rc.6 (2026-05-25)</h2>\n<h4>:bug: Bug Fix</h4>\n<ul>\n<li><code>babel-generator</code>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/18011\">#18011</a>\nCatchup source map position in preserveFormat (<a\nhref=\"https://github.com/nicolo-ribaudo\"><code>@​nicolo-ribaudo</code></a>)</li>\n</ul>\n</li>\n<li><code>babel-core</code>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/17999\">#17999</a>\nfix: improve inputSourceMap URL handling (<a\nhref=\"https://github.com/JLHwung\"><code>@​JLHwung</code></a>)</li>\n</ul>\n</li>\n<li><code>babel-core</code>, <code>babel-generator</code>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/17992\">#17992</a>\nPreserve original identifier names from input sourcemaps (<a\nhref=\"https://github.com/Andarist\"><code>@​Andarist</code></a>)</li>\n</ul>\n</li>\n</ul>\n<h4>:house: Internal</h4>\n<ul>\n<li><code>babel-core</code>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/17970\">#17970</a>\nAlways use native Node.js TS support for config files (<a\nhref=\"https://github.com/nicolo-ribaudo\"><code>@​nicolo-ribaudo</code></a>)</li>\n</ul>\n</li>\n<li><code>babel-compat-data</code>, <code>babel-register</code>\n<ul>\n<li><a\nhref=\"https://redirect.github.com/babel/babel/pull/17993\">#17993</a>\nchore: use bundled dts for register and eslint-* (<a\nhref=\"https://github.com/JLHwung\"><code>@​JLHwung</code></a>)</li>\n</ul>\n</li>\n<li><code>babel-helper-transform-fixture-test-runner</code>,\n<code>babel-node</code></li>\n</ul>\n<!-- raw HTML omitted -->\n</blockquote>\n<p>... (truncated)</p>\n</details>\n<details>\n<summary>Commits</summary>\n<ul>\n<li><a\nhref=\"https://github.com/babel/babel/commit/b4be199c560f4940a3326db98e23eb547bcb120f\"><code>b4be199</code></a>\nv8.0.1</li>\n<li><a\nhref=\"https://github.com/babel/babel/commit/cd96c479396d736e6d09541ab120c577cfbffec3\"><code>cd96c47</code></a>\nchore(pkg): set <code>@​babel/core</code> peer deps to ^8.0.0 (<a\nhref=\"https://github.com/babel/babel/tree/HEAD/packages/babel-preset-typescript/issues/18076\">#18076</a>)</li>\n<li><a\nhref=\"https://github.com/babel/babel/commit/7dc825ab573c605add5a4a030b9e7828853a74f1\"><code>7dc825a</code></a>\nv8.0.0</li>\n<li><a\nhref=\"https://github.com/babel/babel/commit/827d0030bf33d6caf0afb7881452d4df02b4a152\"><code>827d003</code></a>\nChange jest <code>snapshotFormat</code> (<a\nhref=\"https://github.com/babel/babel/tree/HEAD/packages/babel-preset-typescript/issues/18029\">#18029</a>)</li>\n<li><a\nhref=\"https://github.com/babel/babel/commit/73bceefbaf0586803a0147af6e8ebb9bc67bdf9b\"><code>73bceef</code></a>\nv8.0.0-rc.6</li>\n<li><a\nhref=\"https://github.com/babel/babel/commit/c6d71f3f0e2c5754b17693c44ca11eefaa0ef87b\"><code>c6d71f3</code></a>\nEnable <code>strictFunctionTypes</code> (<a\nhref=\"https://github.com/babel/babel/tree/HEAD/packages/babel-preset-typescript/issues/17946\">#17946</a>)</li>\n<li><a\nhref=\"https://github.com/babel/babel/commit/dc91f907de56c1afab78810cd8e2a86fd997084c\"><code>dc91f90</code></a>\nv8.0.0-rc.5</li>\n<li><a\nhref=\"https://github.com/babel/babel/commit/f297c4238cb0405977d2a300c5f4297891814dfe\"><code>f297c42</code></a>\nAdd testing for plugin options (<a\nhref=\"https://github.com/babel/babel/tree/HEAD/packages/babel-preset-typescript/issues/17957\">#17957</a>)</li>\n<li><a\nhref=\"https://github.com/babel/babel/commit/b34c4e71bc74094bb59baa131aff9916dcb9f6c4\"><code>b34c4e7</code></a>\nBump typescript-eslint to 8.59.2 (<a\nhref=\"https://github.com/babel/babel/tree/HEAD/packages/babel-preset-typescript/issues/17984\">#17984</a>)</li>\n<li><a\nhref=\"https://github.com/babel/babel/commit/0e5a59d0f6afef7116f7eab7780289a6148aec65\"><code>0e5a59d</code></a>\nRequire Node.js <code>^22.18.0 || &gt;=24.11.0</code> (<a\nhref=\"https://github.com/babel/babel/tree/HEAD/packages/babel-preset-typescript/issues/17969\">#17969</a>)</li>\n<li>Additional commits viewable in <a\nhref=\"https://github.com/babel/babel/commits/v8.0.1/packages/babel-preset-typescript\">compare\nview</a></li>\n</ul>\n</details>\n<br />\n\n---------\n\nSigned-off-by: dependabot[bot] <support@github.com>\nCo-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>\nCo-authored-by: AsafGolombek <asafgolombek@gmail.com>\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-23T17:23:09+03:00",
          "tree_id": "4c1b2c382d2937678abf44344a50f8634381baaa",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/f0a48ad0f5ff5d7de8315f6b93eadc982c90f6a0"
        },
        "date": 1782225973416,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 306.4590785500066,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 307.4783968000029,
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
          "id": "2401330932fa941bdf584c87bca88ea69167fa0c",
          "message": "fix(sonar): clear the board — S3776/S8786/S7735 sweep + warehouse-mapper dedup (#743)\n\n## Summary\n\nTakes the SonarCloud board to **zero open issues** (the gate was already\nPASSED — these 6 were advisory CODE_SMELLs) and trims duplication. No\nbehavior changes; all extractions are behavior-preserving.\n\n## Sonar smells cleared (6 → 0)\n\n**S3776 — cognitive complexity:**\n- `ipc/http-server.ts` — extract `resolveExpectedToken` /\n`resolveKnownServices` / `resolveMessagingSurface` from\n`resolveWriteRouteDeps` (17 → <15).\n- `connectors/workday-sync.ts` — extract the RaaS-reports loop into\n`syncRaasReports` (19 → <15).\n- `config/nimbus-toml-workday.ts` — extract `sectionForHeader` (16 →\n<15).\n\n**S8786 — super-linear regex:**\n- `connectors/obsidian-parsing.ts` — the wikilink content class now also\nexcludes `[`, which is what Sonar flags (content overlapping the `[[`\nmatch-restart). Benchmarked: the old regex was genuinely **O(n²)** on\n`[`-heavy input (130→527→2125 ms at 20k/40k/80k); the new one is\n**O(n)** (0.08 ms at 160k). All existing wikilink tests unchanged — a\nvalid Obsidian target never contains a bare `[`.\n- `tribal/tribal-chat-capture.ts` — replace the `(\\S+)(.*)` overlap with\n`(\\S+)(?:\\s+(.*))?`. Cluster-id and `--target` parsing are identical for\nthe documented `tribal capture <id> [--target …]` format.\n\n**S7735 — negated condition:**\n- `config/nimbus-toml-workday.ts` — invert the `r.fields !== undefined`\nternary.\n\n## Duplication (jscpd 3.98% → 3.93%)\n\nExtracted the byte-identical `epochToMs` / `parseTimestampMs` / `clamp`\n+ `TITLE_MAX` / `BODY_MAX` from the three AWS warehouse mappers (athena\n/ sagemaker / cloudwatch) into a shared\n`connectors/warehouse-mapping-primitives.ts`, with a branch-complete\nunit test. (The remaining ~3.9% is inherent connector boilerplate that\nneeds codegen, not extraction.)\n\n## Verification\n\n- `tsc --noEmit` clean across all packages.\n- Biome clean (`bunx biome check packages scripts`, 2918 files).\n- Static structure/invariant audit clean; `audit:boundaries` /\n`audit:any` / `audit:exclusion-parity` / `audit:cross-platform` clean.\n- All affected tests pass (workday-sync, nimbus-toml-workday,\ntribal-chat-capture, obsidian, http-server, 3 warehouse mappers + syncs,\nnew primitives test).\n- All changed/new files pass the per-file coverage floor (new primitives\nfile: 100% line / 94% branch).\n- Independent code review confirmed every change behavior-preserving.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **New Features**\n* Added comprehensive test suite validating shared mapping utilities for\nwarehouse and ML connectors.\n\n* **Bug Fixes**\n  * Tightened Obsidian wikilink parsing to reject invalid characters.\n  * Improved Tribal chat command parsing for cluster ID extraction.\n\n* **Refactor**\n* Consolidated shared mapping utilities (timestamp parsing, field\nclamping) used across AWS connectors.\n  * Reorganized Workday report syncing logic into dedicated handler.\n  * Simplified HTTP server dependency resolution.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-23T18:25:32+03:00",
          "tree_id": "138768faf232cd6d53cdd80dc7ea16cc9f174d7a",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/2401330932fa941bdf584c87bca88ea69167fa0c"
        },
        "date": 1782229223034,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 313.95909144999933,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 318.1784813000002,
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
          "id": "469076098cd15cfbc66ad1dc6f083a1f8a8c8d06",
          "message": "chore(main): release client 0.2.6 (#745)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n##\n[0.2.6](https://github.com/nimbus-agent/Nimbus/compare/client-v0.2.5...client-v0.2.6)\n(2026-06-23)\n\n\n### Dependencies\n\n* The following workspace dependencies were updated\n  * dependencies\n    * @nimbus-dev/sdk bumped to 1.2.1\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Chores**\n  * Released client package version 0.2.6\n  * Updated workspace dependency versions\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-06-23T18:29:04+03:00",
          "tree_id": "58bb6a815f1703c97fb922a33c2ce53413e74faa",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/469076098cd15cfbc66ad1dc6f083a1f8a8c8d06"
        },
        "date": 1782229957722,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 324.44057080000096,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 324.86832155000303,
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
          "id": "d7b3b6f2e1e2d3875005a67c2b342192932db8e9",
          "message": "chore(release): combine component release PRs to stop manifest conflicts (#748)\n\n## Problem\n\nPRs like #744 (sdk) and #746 (nimbus) conflict **every time** more than\none component release is in flight at once.\n\n**Root cause:** release-please manifest mode stores all component\nversions in a single shared `.release-please-manifest.json`:\n\n```json\n{ \".\": \"0.18.0\", \"packages/client\": \"0.2.6\", \"packages/sdk\": \"1.2.0\" }\n```\n\nWith `separate-pull-requests: true`, each component (nimbus / client /\nsdk) opens its own release PR — but all of them edit that one manifest.\nrelease-please only rewrites a component's PR branch when *that*\ncomponent gets new commits. So when the client release (`0.2.5 → 0.2.6`)\nmerged to main, it did **not** refresh #744/#746, which kept a stale\n`packages/client: 0.2.5` line and now conflict with main's `0.2.6`.\n\n| | `.` | `packages/client` | `packages/sdk` |\n|---|---|---|---|\n| main | 0.18.0 | **0.2.6** | 1.2.0 |\n| #744 (sdk) | 0.18.0 | **0.2.5** | 1.2.1 |\n| #746 (nimbus) | 0.18.1 | **0.2.5** | 1.2.0 |\n\n## Fix\n\nSet `separate-pull-requests: false`. When multiple components are\npending simultaneously they land in **one** combined release PR that\nedits the manifest exactly once → no inter-PR conflicts. A single\npending component still produces a single PR, and merging still cuts\n**separate git tags + GitHub releases per component**\n(`include-component-in-tag` unchanged).\n\n## Effect on the current jam\n\nOnce this merges, the next release-please run will **supersede the\nconflicting #744 and #746 with one combined release PR** (nimbus 0.18.1\n+ sdk 1.2.1) — no hand-merging of release branches needed.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-06-23T18:42:17+03:00",
          "tree_id": "742739e6a79999c8709d6bd975b53f9406a1ef9d",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/d7b3b6f2e1e2d3875005a67c2b342192932db8e9"
        },
        "date": 1782231139646,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 297.1691791000052,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 295.88383919999467,
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
          "id": "31c05b25c17b858d14980455ad8800fbfb99e875",
          "message": "feat(client): expose egress ledger reads on NimbusClient + MockClient (#751)\n\n## Why\n\nUnblocks the **nimbus-vscode** extension (a strict thin client — it may\nonly use `@nimbus-dev/client`, never Gateway source or raw JSON-RPC) to\nbuild an **Egress \"provable locality\"** UI surface. Today no published\nclient exposes any egress/share/workflow RPC, so the extension is\nblocked.\n\nInvestigation found all three candidate surfaces (Workflow, Share,\nEgress) already exist server-side with dispatch-wired IPC — this is a\n**client-layer exposure** task, not a server build. **Egress** was\nchosen first: its exposable set is 100% pure reads, all four methods are\nalready in the Tauri allowlist, the ledger is append-only/immutable\n(most stable contract), and it needs **zero Gateway change**.\n\n## What\n\nFour typed **read-only** methods on `NimbusClient`, wrapping the\nalready-wired `egress.*` RPCs:\n\n| Client method | RPC | Returns |\n|---|---|---|\n| `egressHead()` | `egress.head` | `EgressHead` |\n| `egressList(params?)` | `egress.list` | `EgressListResult` |\n| `egressVerify()` | `egress.verify` | `EgressVerifyResult` |\n| `egressProveWindow(params?)` | `egress.proveWindow` |\n`EgressProveWindowResult` |\n\n- Mirrored request/response types (`EgressRow`, `EgressHead`,\n`EgressListParams/Result`, `EgressVerifyResult`, `EgressCompleteness`,\n`EgressReceipt`, `EgressProveWindowParams/Result`), re-exported from\n`index.ts`.\n- `MockClient` parity stubs (optional `egressHead` / `egressRows` /\n`egressVerify` / `egressProveWindow` fixtures), signatures matching\n`NimbusClient` for true drop-in use.\n- Routing / mock / surface-parity tests. README egress snippet.\n\n`egress.prune` is **intentionally not exposed** — it is a mutation,\nowner-HITL-gated, and CLI-only (off the Tauri allowlist by design).\n\n## Versioning\n\nNo hand-edit to `version`/`CHANGELOG`: this `feat(client):` commit\ndrives release-please to bump `@nimbus-dev/client` **0.3.0 → 0.4.0** and\ncut the `client-v0.4.0` tag that fires the npm publish workflow. The\nvscode extension then depends on `@nimbus-dev/client@^0.4.0`.\n\n## Verification\n\n- `bun run typecheck` ✅ · `bun test` (112 pass) ✅ · `biome check` ✅ ·\n`bun run build` ✅\n- Coverage-floor (istanbul lcov, Linux-parity): `mock-client.ts`\n100%/100%, `nimbus-client.ts` 88% line / 100% branch — both above the 85\nline / 80 branch floors.\n- High-effort code review: one drop-in-parity finding (mock stubs\nmissing optional params) — fixed.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n- **New Features**\n- Added read-only egress ledger access, including APIs to fetch the\nledger head/count, list recent rows, verify chain integrity, and\ngenerate/return time-window proofs.\n- Exposed strongly typed egress ledger and proof/verification result\ntypes for client integrations.\n- Extended the mock client with corresponding egress methods and safe\ndefault responses.\n\n- **Documentation**\n- Added a “Egress ledger (provable locality)” quickstart section with\nexample calls for head/count, recent rows, offline verification, and\nproof generation.\n\n- **Tests**\n- Expanded test coverage to confirm typed surface exposure, correct\nrequest dispatching, parameter forwarding, and mock default/fixture\nbehavior.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-14T18:16:31Z",
          "tree_id": "bef8b37cf72f58a67f5fa56bb229ef67c369d2f6",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/31c05b25c17b858d14980455ad8800fbfb99e875"
        },
        "date": 1784053819785,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 300.86539985000275,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 302.5354334000032,
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
          "id": "ed71e3ceb680e7f7b1f3e979280a27de44a08abc",
          "message": "chore: release main (#752)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n<details><summary>client: 0.4.0</summary>\n\n##\n[0.4.0](https://github.com/nimbus-agent/Nimbus/compare/client-v0.3.0...client-v0.4.0)\n(2026-07-14)\n\n\n### Features\n\n* **client:** expose egress ledger reads on NimbusClient + MockClient\n([#751](https://github.com/nimbus-agent/Nimbus/issues/751))\n([31c05b2](https://github.com/nimbus-agent/Nimbus/commit/31c05b25c17b858d14980455ad8800fbfb99e875))\n</details>\n\n<details><summary>0.20.0</summary>\n\n##\n[0.20.0](https://github.com/nimbus-agent/Nimbus/compare/v0.19.0...v0.20.0)\n(2026-07-14)\n\n\n### Features\n\n* **client:** expose egress ledger reads on NimbusClient + MockClient\n([#751](https://github.com/nimbus-agent/Nimbus/issues/751))\n([31c05b2](https://github.com/nimbus-agent/Nimbus/commit/31c05b25c17b858d14980455ad8800fbfb99e875))\n</details>\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **New Features**\n  * Added support for reading egress ledger data through the client API.\n* **Release**\n  * Released version 0.20.0, including client package version 0.4.0.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-07-14T18:34:01Z",
          "tree_id": "1899011fa674c9bad4a2611bfc3b52bd96b75723",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/ed71e3ceb680e7f7b1f3e979280a27de44a08abc"
        },
        "date": 1784054768137,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 297.0409536000014,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 300.36089364999896,
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
          "id": "5eec16c118e94667ddccc0ebb0e122f0bc31f136",
          "message": "feat(cli): add `nimbus --version` / `-v` / `version` (#753)\n\n## Why\n\nDiagnosing why `nimbus clip pair` printed the help menu on a Windows\ninstall, the root cause was a **stale binary** (pre-v0.18.0, before the\n`clip` command existed) — and the CLI had **no way to report its own\nversion**, so there was no quick way to confirm that. `nimbus --version`\ncloses that gap.\n\n## What\n\nAdds `--version`, `-v`, and bareword `version`, all printing just the\nrelease version string (e.g. `0.20.0`):\n\n- **`version.ts`** — single source of truth: imports the monorepo\n**root** `package.json` version (the one release-please bumps;\nper-package files stay at `0.1.0`). Bun inlines the JSON at `--compile`\ntime, so the shipped binary needs no runtime file access.\n- **`index.ts`** — `VERSION_ALIASES` handled in `dispatchCommand`,\nbefore the unknown-command → help fallback.\n- **`help.ts`** — documents `nimbus version`.\n- **`version.test.ts`** — asserts semver shape + exact match against\nroot `package.json`.\n\n## Verification\n\n- `bun test packages/cli/src/version.test.ts` → 2 pass\n- `biome check` on the 4 files → clean\n- `tsc --noEmit` (cli) → clean\n- Compiled a standalone binary and ran `--version` from an unrelated cwd\n→ prints the version (confirms build-time inlining, no runtime file\naccess)\n\n```\n$ nimbus --version → 0.20.0\n$ nimbus version   → 0.20.0\n$ nimbus -v        → 0.20.0\n```\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **New Features**\n* Added `nimbus version`, `--version`, and `-v` commands to display the\ninstalled Nimbus version.\n  * Updated CLI help text to document the new version options.\n\n* **Tests**\n* Added validation to ensure the reported version is present, correctly\nformatted, and matches the release version.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-14T22:46:21+03:00",
          "tree_id": "7752f608419e03094d23331c8372aab83e482aab",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/5eec16c118e94667ddccc0ebb0e122f0bc31f136"
        },
        "date": 1784059125165,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 316.805221649996,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 322.2006229999912,
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
          "id": "0f1b94d43ea1072db7aadb16ea4df48a9e39efb2",
          "message": "refactor: consume published @nimbus-dev/sdk@1.3.0; complete sdk extraction (Plan A Phase 2) (#756)\n\nPhase 2 of the sdk poly-repo extraction: the monorepo stops\ncarrying/publishing\n`@nimbus-dev/sdk` and consumes the published package from npm. Phase 1\n(standing up\n`nimbus-agent/nimbus-sdk` + publishing `1.3.0`) is already done.\n\n## What changed\n\n**Consume published sdk (Task 9)**\n- Flipped all **97** consumers (94 connectors + cli + gateway + client)\nfrom\n`\"@nimbus-dev/sdk\": \"workspace:*\"` → `\"^1.3.0\"`; dropped `packages/sdk`\nfrom\n  root `workspaces`. Lockfile resolves sdk from npm. Guard test added.\n\n**Remove sdk + stop publishing it (Task 10 + double-publish guard)**\n- Deleted `packages/sdk/**`; removed it from\n`.release-please-manifest.json`.\n- **Deleted `.github/workflows/publish-sdk.yml`** (the `sdk-v*` tag\npublisher) so\nthe monorepo can never double-publish — exactly one publisher for the\npackage.\n\n**Delete dead package (Task 11)**\n- Removed `packages/vscode-extension` (source lives in\n`nimbus-agent/nimbus-vscode`).\n\n**DX helper (Task 12)**\n- `bun run platform:link` bun-links a sibling `../nimbus-sdk` checkout\nwhen present.\n\n**Purge enumerations (Task 13)**\n- coverage-floor (glob/exclusions/build-lcov/ci-tests + paired\n`sonar.coverage.exclusions`),\n`audit:package-readmes` scope, strip-comments jsdoc prefixes,\n`_test-suite.yml` pkg\nlists, labeler + issue-template options, and docs (CLAUDE/GEMINI\nsubsystem list →\nstandalone-repos; license-policy + SECURITY-INVARIANTS now cite external\n`@nimbus-dev/sdk`).\n\n## Verification\n- `bun run typecheck` — clean across the whole monorepo (all connectors\nresolve sdk from npm).\n- `bunx biome check packages scripts` — clean (2879 files). *(The\n`.claude/worktrees` lint\nfalse-positive `biome check .` → \"0 files\" is the only preflight:fast\nfailure; validated\n  clean via the scoped invocation.)*\n- Audits green: doc-refs, status-drift, release-please, structure,\nexclusion-parity, package-readmes.\n- Scripts tests: 406 pass / 0 fail.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n* **Refactor**\n* Removed the SDK from the monorepo workspace and release automation;\npackages now reference the published `@nimbus-dev/sdk` version instead\nof local workspace links.\n* Updated gateway, CLI, client, and MCP connectors to use the published\nSDK.\n* **New Features**\n  * Added an optional workflow to link a nearby SDK checkout locally.\n* **Documentation**\n* Updated repo guidance, security invariants, licensing policy, and\nsubsystem lists to point to the standalone SDK source.\n* **Chores / Tests**\n* Disabled SDK-specific publishing, coverage, and tracking; adjusted\ncoverage/audit scripts and added checks to prevent workspace SDK\nreferences.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-16T04:11:44Z",
          "tree_id": "a116b0e7800deb65f18388fb21c3f351540eae63",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/0f1b94d43ea1072db7aadb16ea4df48a9e39efb2"
        },
        "date": 1784175657635,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 249.90542639999984,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 247.35169765000393,
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
          "id": "f5983566836ac81ce48ed0430a3826e54274c457",
          "message": "chore(deps): bump serde_with from 3.20.0 to 3.21.0 in /packages/ui/src-tauri (#755)\n\nBumps [serde_with](https://github.com/jonasbb/serde_with) from 3.20.0 to\n3.21.0.\n<details>\n<summary>Release notes</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/jonasbb/serde_with/releases\">serde_with's\nreleases</a>.</em></p>\n<blockquote>\n<h2>serde_with v3.21.0</h2>\n<h3>Security</h3>\n<ul>\n<li>\n<p><a\nhref=\"https://github.com/jonasbb/serde_with/security/advisories/GHSA-7gcf-g7xr-8hxj\">GHSA-7gcf-g7xr-8hxj</a>:\nKeyValueMap serialization panics on empty sequence or map entries\nBad or attacker controlled values could cause a panic while allocating\ntoo large values.\nFixed in <a\nhref=\"https://redirect.github.com/jonasbb/serde_with/issues/966\">#966</a>\nby setting a maximum allocation size during the creation of collections\nlike <code>Vec</code> or sets.</p>\n<p>Thanks to <a\nhref=\"https://github.com/7thParkk\"><code>@​7thParkk</code></a> for\nreporting the issue.</p>\n</li>\n</ul>\n<h3>Added</h3>\n<ul>\n<li>Add <code>NoneAsZero</code> adapter that maps\n<code>Option&lt;NonZero*&gt;</code> to a plain integer, encoding\n<code>None</code> as <code>0</code> by <a\nhref=\"https://github.com/SAY-5\"><code>@​SAY-5</code></a> (<a\nhref=\"https://redirect.github.com/jonasbb/serde_with/issues/486\">#486</a>)</li>\n</ul>\n<h3>Changed</h3>\n<ul>\n<li>Re-enable link-to-definition on docs.rs (<a\nhref=\"https://redirect.github.com/jonasbb/serde_with/issues/964\">#964</a>)</li>\n</ul>\n<h3>Fixed</h3>\n<ul>\n<li>Fix some doc links to point to the correct types (<a\nhref=\"https://redirect.github.com/jonasbb/serde_with/issues/963\">#963</a>)</li>\n<li>Re-enable <code>unused_qualifications</code> and fix the resulting\nfindings by <a\nhref=\"https://github.com/lms0806\"><code>@​lms0806</code></a> (<a\nhref=\"https://redirect.github.com/jonasbb/serde_with/issues/962\">#962</a>)</li>\n</ul>\n</blockquote>\n</details>\n<details>\n<summary>Commits</summary>\n<ul>\n<li><a\nhref=\"https://github.com/jonasbb/serde_with/commit/0f4ca67e1f8fc4679e850f3a566d454fb30953c1\"><code>0f4ca67</code></a>\nUpdate changelog for 3.21.0 (<a\nhref=\"https://redirect.github.com/jonasbb/serde_with/issues/967\">#967</a>)</li>\n<li><a\nhref=\"https://github.com/jonasbb/serde_with/commit/7654841be1d1702a65afc0f839c67c36563c8188\"><code>7654841</code></a>\nUpdate changelog for 3.21.0</li>\n<li><a\nhref=\"https://github.com/jonasbb/serde_with/commit/c8a1d820ea25df01692b367058d587343e199389\"><code>c8a1d82</code></a>\nProtect all collection creations against capacity overflow by using\n`size_hin...</li>\n<li><a\nhref=\"https://github.com/jonasbb/serde_with/commit/6ad5fa5b474270f50016b4cc983e37f25f097ba4\"><code>6ad5fa5</code></a>\nProperly feature gate the <code>vec_with_capacity_cautious</code>\nfunction</li>\n<li><a\nhref=\"https://github.com/jonasbb/serde_with/commit/ef7d1417e3eacd0077f029763109368ee05c1c22\"><code>ef7d141</code></a>\nProtect all collection creations against capacity overflow by using\n`size_hin...</li>\n<li><a\nhref=\"https://github.com/jonasbb/serde_with/commit/a348da35fe808852a1b7e6fa890b425ad001d3f1\"><code>a348da3</code></a>\nAdd serde_as deserialize_as explain (<a\nhref=\"https://redirect.github.com/jonasbb/serde_with/issues/958\">#958</a>)</li>\n<li><a\nhref=\"https://github.com/jonasbb/serde_with/commit/2e5bc20e29e1d42eb9c85ab503964130eb1ea62e\"><code>2e5bc20</code></a>\nBump the github-actions group with 3 updates (<a\nhref=\"https://redirect.github.com/jonasbb/serde_with/issues/965\">#965</a>)</li>\n<li><a\nhref=\"https://github.com/jonasbb/serde_with/commit/927a3d69c3cecdf415f7d7662a0521894d313261\"><code>927a3d6</code></a>\nBump the github-actions group with 3 updates</li>\n<li><a\nhref=\"https://github.com/jonasbb/serde_with/commit/62d14ec637834259e0fab59ea84b87ca329e81c1\"><code>62d14ec</code></a>\nEnable link-to-definition on docs.rs again, after the upstream issue was\nreso...</li>\n<li><a\nhref=\"https://github.com/jonasbb/serde_with/commit/4584d94f685b66b96bdcf07bffe76e5df0819ea2\"><code>4584d94</code></a>\nEnable link-to-definition on docs.rs again, after the upstream issue was\nreso...</li>\n<li>Additional commits viewable in <a\nhref=\"https://github.com/jonasbb/serde_with/compare/v3.20.0...v3.21.0\">compare\nview</a></li>\n</ul>\n</details>\n<br />\n\n\n[![Dependabot compatibility\nscore](https://dependabot-badges.githubapp.com/badges/compatibility_score?dependency-name=serde_with&package-manager=cargo&previous-version=3.20.0&new-version=3.21.0)](https://docs.github.com/en/github/managing-security-vulnerabilities/about-dependabot-security-updates#about-compatibility-scores)\n\nDependabot will resolve any conflicts with this PR as long as you don't\nalter it yourself. You can also trigger a rebase manually by commenting\n`@dependabot rebase`.\n\n[//]: # (dependabot-automerge-start)\n[//]: # (dependabot-automerge-end)\n\n---\n\n<details>\n<summary>Dependabot commands and options</summary>\n<br />\n\nYou can trigger Dependabot actions by commenting on this PR:\n- `@dependabot rebase` will rebase this PR\n- `@dependabot recreate` will recreate this PR, overwriting any edits\nthat have been made to it\n- `@dependabot show <dependency name> ignore conditions` will show all\nof the ignore conditions of the specified dependency\n- `@dependabot ignore this major version` will close this PR and stop\nDependabot creating any more for this major version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this minor version` will close this PR and stop\nDependabot creating any more for this minor version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this dependency` will close this PR and stop\nDependabot creating any more for this dependency (unless you reopen the\nPR or upgrade to it yourself)\nYou can disable automated security fix PRs for this repo from the\n[Security Alerts\npage](https://github.com/nimbus-agent/Nimbus/network/alerts).\n\n</details>\n\nSigned-off-by: dependabot[bot] <support@github.com>\nCo-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-16T07:15:35+03:00",
          "tree_id": "e092f9d96f48e3664ac39b3ce3bcb007e9d3c2ff",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/f5983566836ac81ce48ed0430a3826e54274c457"
        },
        "date": 1784176431820,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 313.07383290000143,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 314.9359865000024,
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
          "id": "7bb0ec7eea52c08bbe25d9146e6ef43ea9e17ad1",
          "message": "chore: release main (#757)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n<details><summary>0.21.0</summary>\n\n##\n[0.21.0](https://github.com/nimbus-agent/Nimbus/compare/v0.20.0...v0.21.0)\n(2026-07-16)\n\n\n### Features\n\n* **cli:** add `nimbus --version` / `-v` / `version`\n([#753](https://github.com/nimbus-agent/Nimbus/issues/753))\n([5eec16c](https://github.com/nimbus-agent/Nimbus/commit/5eec16c118e94667ddccc0ebb0e122f0bc31f136))\n</details>\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **New Features**\n* Added `nimbus --version` to display the CLI version, with `-v` and\n`version` aliases.\n\n* **Documentation**\n  * Updated the changelog with release information for version 0.21.0.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-07-16T04:31:30Z",
          "tree_id": "b869a414ea2dd6dd95dcfe39edc5d064da3c867c",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/7bb0ec7eea52c08bbe25d9146e6ef43ea9e17ad1"
        },
        "date": 1784177147790,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 304.481351900001,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 303.2251550500041,
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
          "id": "bc53aaa79efd2c3dcd97860bab078046d4a81c13",
          "message": "refactor: extract @nimbus-dev/client to standalone repo; consume published 0.5.0 (#758)\n\n## Summary\n\nPhase 2 (Plan B) of the poly-repo platform extraction: make the monorepo\nconsume the **published** `@nimbus-dev/client` and remove\n`packages/client` entirely. Companion to the sdk extraction (Plan A).\n\n`@nimbus-dev/client` now lives in its own repo —\n[nimbus-agent/nimbus-client](https://github.com/nimbus-agent/nimbus-client)\n— and publishes to npm on its own clock via release-please + OIDC\ntrusted-publisher (no npm token). First standalone release:\n**`@nimbus-dev/client@0.5.0`** (0.4.0 was the last version published\nfrom the monorepo).\n\n## Changes\n\n- **cli consumes the published package** — `packages/cli` dep\n`@nimbus-dev/client` `workspace:*` → `^0.5.0`; removed the dangling\n`packages/cli/tsconfig.json` paths mapping to `../client/src/index.ts`.\n`packages/cli` was the only internal consumer.\n- **Removed `packages/client`** — deleted the package tree; dropped it\nfrom root `workspaces`, the combined `test` script, and the\n`test:coverage:client` gate.\n- **Stopped publishing client from the monorepo** — removed the\n`packages/client` release-please component (config + manifest) and\n**deleted `.github/workflows/publish-client.yml`** (client\nself-publishes now).\n- **CI/coverage/tooling de-integration** — removed client build steps\nfrom `ci.yml` / `release.yml` / `_test-suite.yml` / `docs-quality.yml`;\nremoved the `client-node-compat` job from `_test-suite.yml`; removed\nclient from the coverage-floor (globs + exclusions + `build-lcov.sh` /\n`reseed-docker.sh`), `knip.json`, `ci-tests.ts`, `package-readmes`\naudit, `build-debug.ts`, `strip-comments` prefixes, and root\n`sonar-project.properties` coverage exclusions.\n- **Docs** — reframed skill docs, `architecture.md` / `README.md` trees,\n`ci-secrets.md`, security docs, the docs-site package table, the\nlabeler, and the issue template so `@nimbus-dev/client` reads as an\nexternal published package. Historical records (CHANGELOG, completed\nroadmap phases, superpowers plans) left intact.\n- **Guard** — new `scripts/structure-audit/no-workspace-client.test.ts`\nfails if any package reintroduces `@nimbus-dev/client: workspace:*`.\n\n## Verification\n\nGreen locally: full workspace `bun run typecheck`, `bunx biome check\npackages scripts`, `audit:invariants`, `audit:doc-refs` (603 refs\nresolve), `audit:status-drift`, `audit:package-readmes`,\n`audit:cross-platform`, all `scripts/structure-audit` tests, the\npreflight-gates drift test, the workspace-client guard, and cli's\nruntime import of the published `@nimbus-dev/client@0.5.0`. The external\nconsumer `nimbus-agent/nimbus-vscode` (`^0.4.0`) builds green against\n`0.5.0`. `audit:coverage-floor` runs on CI (its changes are pure\nremovals of deleted-file references — coverage-neutral for remaining\nfiles).\n\n## Notes\n\n- Depends on Plan A (sdk) being merged and `@nimbus-dev/sdk@1.3.0`\npublished — already done.\n- Pre-existing `packages/sdk` doc drift (leftover from the earlier sdk\nextraction) is **not** touched here — out of scope; worth a small\nfollow-up.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Documentation**\n* Updated project and contributor guidance to reflect the client\npackage’s standalone repository and independent publishing.\n* Revised architecture, security, licensing, CI, and release\ndocumentation.\n\n* **Chores**\n* Removed the client package from the monorepo, workspace configuration,\nrelease management, and publishing workflow.\n  * Updated CLI consumption to use the published client package.\n\n* **Tests**\n  * Removed monorepo client tests and coverage gates.\n* Added validation ensuring the client is not referenced as a workspace\ndependency.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-07-16T11:07:02Z",
          "tree_id": "9b86f83914707a3caafe70edfa934e15839b817b",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/bc53aaa79efd2c3dcd97860bab078046d4a81c13"
        },
        "date": 1784201220371,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 282.43911449999797,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 289.8514635000021,
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
          "id": "579e209ecc5e5850a74e2ad74379b30fbf65f0e4",
          "message": "docs: clean up leftover packages/sdk references (poly-repo consistency) (#759)\n\nFollow-up to the client extraction (#758). Removes the last stale\n`packages/sdk` references left behind when the SDK was extracted, so the\nmonorepo docs/config consistently reflect that **both**\n`@nimbus-dev/sdk` and `@nimbus-dev/client` are external published\npackages.\n\n- Skill docs (`nimbus-architecture`, `nimbus-file-map`) point at the\nstandalone repos instead of deleted `packages/sdk/src` files\n- `docs/contributors/coverage.md`, `docs/sonar-local.md`, docs-site\n`getting-started.mdx` — drop `packages/sdk` from package lists\n- `README.md` — reword so sdk/client read as external npm packages\n- `knip.json` — drop the dead `packages/sdk` workspace entry\n- `.dependency-cruiser.cjs` — remove the `sdk-no-import-core` rule +\n`client` alternation (neither package is in the tree)\n\nVerified: `audit:doc-refs` (603 refs), `audit:boundaries`\n(dependency-cruiser, 0 violations), biome lint, `audit:status-drift` all\ngreen.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n- **Documentation**\n- Updated architecture and file-map guidance to point SDK users to the\nstandalone `@nimbus-dev/sdk` location.\n- Adjusted contributor/getting-started docs to remove legacy monorepo\nSDK references.\n  - Refreshed README license wording to use linked package references.\n\n- **Chores**\n  - Tightened allowed SDK import targets for MCP connectors.\n  - Updated coverage and local analysis to exclude `packages/sdk`.\n  - Removed the SDK from workspace/coverage gate configuration.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-07-16T15:20:28+03:00",
          "tree_id": "01d6af8e9e0abb7a1a2ab0d9892f81a7009311a4",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/579e209ecc5e5850a74e2ad74379b30fbf65f0e4"
        },
        "date": 1784205043998,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 235.2963079500001,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 238.27779035000313,
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
          "id": "b72f96dcb862f54084927d8542edce9e0e795ad7",
          "message": "feat(cli): print the gateway URL from `nimbus clip pair` (#761)\n\n## What\n\n`nimbus clip pair` now prints the **gateway URL** next to the one-time\ncode, so the owner can copy both into the web-clipper extension's\nOptions page from a single command — instead of hunting for the URL in\nthe earlier `nimbus serve` output.\n\n```\n$ nimbus clip pair --label my-chrome\nPairing \"my-chrome\" — in the browser extension's Options page, enter:\n  Gateway URL:  http://127.0.0.1:7474\n  Pairing code: 429040\nEnter it within 2 minutes.\n```\n\nWhen the gateway runs without the HTTP surface, the command warns to\nrestart with `nimbus serve --port` — otherwise the extension has nothing\nto reach.\n\n## How\n\n- `clip.pair` echoes a new optional `gatewayUrl` field, set at boot in\n`assemble.ts` → the `clipHttpBaseUrl` IPC option →\n`ClipRpcDeps.httpBaseUrl`, derived from `NIMBUS_HTTP_PORT` (host is\nalways `127.0.0.1`, I6).\n- No new invariant, no migration, and no change to the extension's wire\ncontract (the URL is owner-facing CLI output).\n\n## Companion\n\nPairs with the web-clipper `web-clipper-ux-fixes` PR, which fixes the\nextension's Options placeholder to the matching default port (`7474`).\n\n## Verification\n\n- 32 clip tests (gateway + CLI), gateway + CLI typecheck, Biome lint,\nmarkdownlint, lychee — all green. Static invariant audit + 92\nsecurity-invariant tests passed at build time.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-16T17:59:46Z",
          "tree_id": "09df3a11d973a84745ad922da39403b5ae84bf64",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/b72f96dcb862f54084927d8542edce9e0e795ad7"
        },
        "date": 1784225505306,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 314.37637314999773,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 316.17949129999835,
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
          "id": "65e8857a27dff10ac85f9c3e63c2fd2a21628bb2",
          "message": "feat(cli): nimbus clip list + clip delete (+ clip-scoped tags) (#760)\n\n## What\n\nAdds two web-clip management commands so a user can **see** and\n**remove** their clips — previously there was no way to list clips (only\n`clip status` for paired browsers) and the only delete was the\nservice-wide `data delete --service nimbus`.\n\n- **`nimbus clip list [--tag <t>] [--limit N] [--json]`** — lists\n`web_clip` items newest-first, with a clip-scoped `--tag` filter (SQL\n`json_each`, so `--limit` is honored), and `--json` (incl. `wordCount`)\nfor scripting.\n- **`nimbus clip delete <id|url>` / `--all [--yes]`** — deletes by clip\nID (`nimbus:`-prefixed) or by page URL (the article + all its\ntext-selections, sharing a canonical URL); `--all` is guarded (reports\nthe count unless `--yes`).\n\nTwo new local-index IPC methods back these: `clip.list` and\n`clip.delete`.\n\n## How\n\n- Threads the local-index DB into `ClipRpcDeps` via\n`ctx.options.localIndex.getDatabase()` (same pattern as the `agents`\ndispatcher).\n- Deletes route **only** through `deleteItemByPrimaryKey` (graph + FTS +\nembedding/vec cascade cleanup) and are strictly `type =\n'web_clip'`-scoped — a `nimbus:` id for a non-clip item is not\ndeletable.\n- The `--tag` query is guarded with `json_valid(...)` so a\nmalformed-metadata row can't abort the listing.\n- Bound-param SQL throughout (I9). **No new invariant, no migration**\n(read + local delete is not outbound egress).\n\n## Verification\n\n- 60 tests (22 gateway `clip-rpc`, 38 CLI `clip`), gateway + CLI\ntypecheck, Biome lint, static invariant audit — all green.\n- **Linux coverage-floor** (Docker) gate: `ok`.\n- Design + plan + two review passes:\n`docs/superpowers/{specs,plans}/2026-07-16-clip-list-delete*`.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-16T18:40:10Z",
          "tree_id": "eebd9040b09fef6c652a2b5fd823b1bf076167aa",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/65e8857a27dff10ac85f9c3e63c2fd2a21628bb2"
        },
        "date": 1784227922074,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 296.0638243500049,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 298.8321568499923,
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
          "id": "d337167e6e461645526525167ed6acf77396f4e2",
          "message": "fix(gateway): report real version in `nimbus status` + stamp Windows exe metadata (#762)\n\n## Why\n\nTwo related version-reporting fixes, both surfaced from a user noticing\n`nimbus status` reported `0.1.0` while their installed release was much\nnewer, and the Windows `.exe` Details tab showing Bun's version.\n\n### 1. `nimbus status` reported a stale hardcoded version\n\n`GATEWAY_VERSION` in `packages/gateway/src/version.ts` was a\nhand-maintained constant frozen at `\"0.1.0\"` since the first GA.\n`gateway.ping` (and therefore `nimbus status` / `nimbus --version`)\nechoed it verbatim, so every release reported `0.1.0` regardless of what\nwas actually installed — it had drifted ~20 minor releases.\n\n**Fix:** wire the constant to release-please via the generic updater:\n- annotate the line with `x-release-please-version` and register\n`packages/gateway/src/version.ts` in the config's `extra-files`, so\nevery release rewrites it in lockstep with the package version;\n- set the current value to `0.21.0` to clear the existing drift now.\n\nThis is cross-platform — it fixes the reported version on\nLinux/macOS/Windows alike.\n\n### 2. Windows `.exe` Details tab showed Bun's metadata\n\nThe gateway/CLI Windows binaries are single-file `bun build --compile`\nexecutables that embed the Bun runtime, so Properties → Details showed\nBun's Product name / File version.\n\n**Fix:** pass Bun's `--windows-*` metadata flags on the Windows matrix\nlegs of `build-gateway` / `build-cli` (product name, publisher, version,\ndescription, copyright). The build step is split into a non-Windows step\n(unchanged) and a pwsh Windows step so the flags apply only where valid.\nThe version is derived from the release tag, prerelease suffix stripped\nand padded to the numeric 4-part form Windows requires (e.g.\n`0.21.1.0`). Publisher/product naming matches the existing WiX installer\n(`Nimbus Contributors`).\n\n> Linux/macOS need no equivalent: ELF and bare Mach-O have no embedded\nproduct-version resource a file manager reads. Version there comes from\nthe package metadata (`.deb`/`.rpm`/`.pkg`, already stamped from the\ntag) and from `nimbus --version`, which fix #1 corrects.\n\n## Verification\n\n- `version.ts` + config: biome clean, config is valid JSON,\n`gateway.ping`/dispatcher tests pass. No test asserted the old `\"0.1.0\"`\nvalue.\n- Windows flags: compiled a test exe locally on Windows with the exact\nflags — resulting exe reports `ProductName: Nimbus CLI`, `CompanyName:\nNimbus Contributors`, `FileVersion: 0.21.1.0`, description + copyright\ncorrect. Version-munging verified for normal and prerelease tags.\n- `release.yml` parses as valid YAML.\n\n## Publishing note\n\nThe `fix:` commit means release-please will cut a new release (→\n`0.21.1`) after this merges, which rewrites `version.ts` to match and —\nbeing a fresh tag — builds the Windows binaries with the new metadata.\nNote the repo currently has a phantom `0.21.0` (manifest/CHANGELOG\nbumped, but no `v0.21.0` git tag or published assets); the next release\nshould supersede it.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-17T19:44:44Z",
          "tree_id": "217564cd9b991fd20086863c5d90bf054975d1fc",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/d337167e6e461645526525167ed6acf77396f4e2"
        },
        "date": 1784318117587,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 288.0433927499977,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 293.3572675499956,
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
          "id": "dfd27aba74cd3581f3aebd2ac554953e507f5823",
          "message": "chore: release main (#763)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n<details><summary>0.22.0</summary>\n\n##\n[0.22.0](https://github.com/nimbus-agent/Nimbus/compare/v0.21.0...v0.22.0)\n(2026-07-18)\n\n\n### Features\n\n* **cli:** nimbus clip list + clip delete (+ clip-scoped tags)\n([#760](https://github.com/nimbus-agent/Nimbus/issues/760))\n([65e8857](https://github.com/nimbus-agent/Nimbus/commit/65e8857a27dff10ac85f9c3e63c2fd2a21628bb2))\n* **cli:** print the gateway URL from `nimbus clip pair`\n([#761](https://github.com/nimbus-agent/Nimbus/issues/761))\n([b72f96d](https://github.com/nimbus-agent/Nimbus/commit/b72f96dcb862f54084927d8542edce9e0e795ad7))\n\n\n### Bug Fixes\n\n* **gateway:** report real version in `nimbus status` + stamp Windows\nexe metadata ([#762](https://github.com/nimbus-agent/Nimbus/issues/762))\n([d337167](https://github.com/nimbus-agent/Nimbus/commit/d337167e6e461645526525167ed6acf77396f4e2))\n</details>\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **New Features**\n* Added `nimbus clip list` and `nimbus clip delete`, including support\nfor clip-scoped tags.\n  * `nimbus clip pair` now displays the gateway URL.\n\n* **Bug Fixes**\n  * Improved `nimbus status` to report the gateway’s actual version.\n  * Windows executables now include version metadata.\n\n* **Release**\n  * Released version 0.22.0.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-07-18T06:29:19+03:00",
          "tree_id": "28cddf14d33d5160bc005695f86b1a786a87befe",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/dfd27aba74cd3581f3aebd2ac554953e507f5823"
        },
        "date": 1784346072758,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 310.64510609999707,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 312.74840835,
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
          "id": "9fe045c350bd1ec4e1e3712d2a44021aedfed1a1",
          "message": "ci: enforce Conventional Commit PR titles (#764)\n\n## Enforce Conventional Commit PR titles\n\nThis repo squash-merges, so the **PR title becomes the commit on\n`main`** that Release Please reads to compute the version bump and\nchangelog. A non-conforming title (e.g. `update stuff`) silently\nproduces no release / miscategorized notes.\n\nAdds a lightweight `pull_request` workflow that validates the PR title\nwith\n[`amannn/action-semantic-pull-request`](https://github.com/amannn/action-semantic-pull-request)\n— matching repo conventions (harden-runner, `ubuntu-24.04`, SHA-pinned\naction). Default Conventional Commit type set; no scope required.\n\nPrompted by adding the same guard to the `nimbus-vscode` repo's new\nRelease Please setup — surfacing that Nimbus main has the same latent\ngap.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Chores**\n* Added automated validation to ensure pull request titles follow\nconsistent, standardized formatting.\n  * Improved project maintenance checks for incoming changes.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-18T07:46:45Z",
          "tree_id": "cbe5893ff9ef4d6b1d02d5d3fcd4d6cf9911cdcb",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/9fe045c350bd1ec4e1e3712d2a44021aedfed1a1"
        },
        "date": 1784361335407,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 235.58106515000108,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 240.0610665000044,
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
          "id": "a0b6850d6221f1012bebd73a6144e2d8230abbaf",
          "message": "refactor: clear all 128 open SonarCloud code smells (#765)\n\n## What\n\nClears **all 128 open SonarCloud code smells** on the board. The quality\ngate was already green (0 bugs, 0 vulnerabilities, 0 hotspots to review,\ncoverage 94.3%, duplication 0.2%); this drives the smell count to zero.\n126 of the 128 are mechanical test-file cleanups; only 2 touch\nproduction source.\n\n| Rule | Count | Fix |\n|---|---|---|\n| S9020 | 88 | UI/RTL `waitFor` + `getBy*` (element appearance) →\nawaited `findBy*` |\n| S8968 | 35 | gateway tests skipping via `if (cond) return;` →\n`test.skipIf(cond)` / `it.skipIf(cond)` |\n| S8980 | 3 | removed redundant `act()` wrappers around `fireEvent` |\n| S3776 | 1 | `ipc/clip-rpc.ts` `dispatchClipRpc` cognitive complexity\n21 → ~1, via the existing `dispatchByMethod` handler-map helper |\n| S8786 | 1 | `tribal/tribal-chat-capture.ts` ReDoS-prone regex\n(`(\\S+)(?:\\s+(.*))?`) → linear whitespace tokenize + a simple `--target`\nregex |\n\n## Notes\n\n- Both source refactors are **behavior-preserving** and covered by their\nexisting suites (clip-rpc 31 tests, tribal-chat-capture tests all pass).\n- A handful of Sonar-adjacent `waitFor`s that assert\n`toHaveTextContent`/state on an **already-mounted** element were\ndeliberately left as-is — `findBy*` retries on element existence only,\nso converting them would assert stale content and break the test. None\nwere in the flagged 128.\n- OnboardingConnect's fake-timer navigation test: removing the `act()`\naround the click required switching the timer advance to\n`vi.advanceTimersByTimeAsync` so the poll interval registers before the\ntimer fires.\n\n## Verification (local)\n\n- Full UI Vitest: **74 files / 506 tests, 0 fail**\n- All changed gateway suites: **138 pass / 26 platform-skip, 0 fail**\n- `tsc --noEmit`: **exit 0** for both `packages/ui` and\n`packages/gateway`\n- `biome check`: clean (84 files)\n- static invariant audit (`check-nimbus-invariants.ts`): **exit 0**\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Refactor**\n* Streamlined clip RPC request dispatching while preserving existing\nvalidation and behavior.\n  * Simplified tribal capture command parsing.\n\n* **Tests**\n  * Improved asynchronous UI test reliability with direct async queries.\n  * Standardized platform- and environment-specific test skipping.\n* Preserved existing coverage and behavioral assertions across gateway,\nUI, and integration tests.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-18T13:18:38Z",
          "tree_id": "f2e3404f96cf99535c374f05a281123189514515",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/a0b6850d6221f1012bebd73a6144e2d8230abbaf"
        },
        "date": 1784381355234,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 234.3098756000025,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 233.6090350500046,
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
          "id": "b529258f393b1eba4696439d641e4b662a295990",
          "message": "docs: prune shipped plans/specs + refresh stale status/version surfaces (#766)\n\n## What\n\nAn audit-verified documentation & tooling staleness sweep. The automated\ndrift gates (`doc-refs`, `status-drift`, `readme-cli`) were already\ngreen, so this targets **free-text staleness** the audits don't pin plus\n**obsolete planning artifacts**.\n\n### Deletions — 21 obsolete plan/spec docs (`docs/superpowers/`)\nAll describe shipped work; `docs/CHANGELOG.md` remains the historical\nrecord. Removed: clip-list-delete, web-clipper,\nvscode-extension-extraction, slice-9 apple-mail / gitops-ml / workday\nconnectors, dedup-wave-c (each design + plan + reviews).\n\n**Kept** the still-load-bearing forward designs (would have orphaned\nlive references):\n- `phase7-plus-resequence-design` — the current sequencing anchor,\nreferenced by 5 active specs + roadmap.\n- `true-coverage-program-design` (+ review) — linked from `coverage.md`;\nsub-projects C/D unshipped.\n\n### Status/version refresh (`v0.13.1` → `v0.22.0`, the real release)\n- `CLAUDE.md` + `GEMINI.md` status lines.\n- `docs/roadmap.md` header: last-updated → 2026-07-18, added\npost-Phase-6 deliveries (web clipper/I30, sdk+client extractions, clip\nCLI).\n\n### Factual fixes\n- **`architecture.md` + `nimbus-http-write-surface` skill:**\n`WRITE_ROUTE_ALLOWLIST` **6 → 8** routes — the two web-clip routes were\nmissing (verified against `http-write-routes.ts`).\n- **`nimbus-security-invariants` skill:** I29 no longer labelled\n\"(latest)\"; added the **I30** section (current highest invariant).\n- **`nimbus-commands` skill:** removed the non-existent\n`test:coverage:sdk` gate.\n- **`nimbus-testing` skill:** `MockVault` is gateway-internal, not\n`@nimbus-dev/sdk`.\n- **`nimbus-architecture` skill:** package tree drops the extracted\n`packages/sdk`, adds `admin-console` + `github-actions`.\n- **`nimbus-tool-output-envelope` + `nimbus-file-map` skills:** `I1–I29`\n→ `I1–I30`.\n- **`nimbus-coverage-floor` + `nimbus-preflight-guard` agents:** ratchet\nglob `packages/{gateway,cli,sdk,client}` →\n`{gateway,cli,mcp-connectors}` (sdk/client extracted).\n- **`.github/workflows/ci.yml`:** dropped the dead `packages/sdk` path\nalternation in the changed-path detector + corrected a stale shared-deps\ncomment.\n\n## Not changed (verified already current)\n`README.md`, `cli-reference.md` (all recent commands present),\n`scripts/` (all `packages/sdk`/`client` refs are intentional\npost-extraction guards), and 14 skills / 2 agents that carried no stale\nclaims.\n\n## Verification\n`audit:doc-refs` (603/603 resolve) · `audit:status-drift` OK ·\n`audit:readme-cli` (31/31) · `lychee --offline` (0 errors, 528 links) ·\n`markdownlint-cli2` (0 errors, 74 files) · `ci.yml` valid YAML.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-18T16:56:22+03:00",
          "tree_id": "6d57cc4ebe5d8ebe8f57c8736cdac1bc2e8c4243",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/b529258f393b1eba4696439d641e4b662a295990"
        },
        "date": 1784383581278,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 284.2824865999977,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 285.21115115000174,
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
          "id": "8466d68325da0cce1fe8e894ab6fd0f7db351960",
          "message": "docs(web-clipper): add privacy policy page (#767)\n\nAdds the hosted **privacy policy** for the Nimbus web clipper browser\nextension, which the Chrome Web Store and Firefox AMO listings link to\n(store review rejects a dead privacy URL).\n\n## What\n- New page `user-guide/web-clipper-privacy.mdx` →\n**https://nimbus-agent.dev/user-guide/web-clipper-privacy/** — documents\nthe no-data-collection posture (local-first, loopback-only to\n`127.0.0.1`, no telemetry/analytics/cloud, token stored locally and\nnever transmitted elsewhere). Content mirrors `store/privacy-policy.md`\nin the\n[nimbus-web-clipper](https://github.com/nimbus-agent/nimbus-web-clipper)\nrepo.\n- Adds a short **Privacy** section on the existing web clipper page\nlinking to it.\n\n## Why now\nThe web-clipper store listings need a live privacy URL for the first\nsubmission. The homepage already exists (`/user-guide/web-clipper/`);\nthis fills the only gap.\n\nFollows the flat `user-guide/*.mdx` convention. markdownlint clean;\ninternal links use the trailing-slash convention and resolve.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-19T05:24:22Z",
          "tree_id": "d20cb16f4eb565ed8f4cc3ed1a991c9c78daf649",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/8466d68325da0cce1fe8e894ab6fd0f7db351960"
        },
        "date": 1784439367326,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 315.46397294999696,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 316.12614615001075,
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
          "id": "241718962e707e4f236b457dc8bd2ff21a255c4c",
          "message": "feat(release-health): loud release-asset gate + weekly secret-health monitor (#768)\n\n## What\n\nSub-project 1 of the org secrets-management program — the safety net\nthat de-risks the later GitHub-App migration. It closes the exact\nfailure class behind the phantom releases (v0.17–v0.21 shipped zero\nassets because `RELEASE_PAT` had silently expired while builds went\ngreen).\n\nThree capabilities, all logic in unit-tested Bun/TS under\n`scripts/release/` (thin YAML, no new dependency):\n\n1. **Asset-completeness gate** — a hard step at the end of\n`publish-release` diffs the release's actual assets against this run's\n`dist/stage/*` and fails if any are missing/zero-byte (catches\n`action-gh-release` soft-succeeding on a bad PAT against the\npre-existing release). Sanity-asserts `SHA256SUMS` + `.asc`.\n2. **Loud failure alerting** — a new `alert-on-failure` job (`if:\nfailure()`) files a de-duped `release-health` GitHub issue for any red\nrelease run. `publish-release` stays `contents: read`; only this job\nholds `issues: write`.\n3. **Weekly secret-health monitor** (`secret-health.yml`, cron +\ndispatch) — per-secret PAT probes (authorization, not just alive:\nrepo-write permission / classic-scope / rate-limit fallback) +\n`notAfter` decoders for the GPG subkey / Windows `.pfx` / Apple `.p12`.\nSurfaces via the same de-duped issue with a state-transition guard\n(comment only on change — no weekly spam). Explicitly documents the PAT\ndead/alive caveat.\n\nNew files:\n`scripts/release/{gh-api,verify-release-assets,open-health-issue,check-secret-health}.ts`\n(+ tests), `.github/workflows/secret-health.yml`. Wiring:\n`.github/workflows/release.yml`, `docs/ci-secrets.md`, `package.json`\naliases.\n\n## Security notes\n\n- Cert decoders **never pass secrets as argv** (password via `-passin\nenv:` / `--passphrase-fd`, key material via stdin; base64 → `0600` temp\nfile; `try/finally` cleanup of temp files + `GNUPGHOME`). The final\nreview reproduced both against real `gpg`/`openssl` to confirm.\n- Alerts are GitHub issues only (no new webhook/secret added to the\nsystem being hardened).\n\n## Verification\n\n`bun test scripts/release/` → 71 pass / 0 fail (6 skips are pre-existing\n`nimbus-verify` platform guards). biome clean. Both workflows valid\nYAML; `audit:action-sha-pins` + `audit:doc-refs` OK. Built via a 6-task\nTDD plan with per-task review + a final whole-branch review + a fix wave\n(dead const, `exactOptionalPropertyTypes`, a `thresholdDays` NaN guard\nthat would otherwise silently disable all cert warnings, p12 temp-file\nmode-at-creation, and added orchestration tests).\n\nDesign + plan (with review dispositions):\n`docs/superpowers/{specs,plans}/2026-07-18-release-health-verification*.md`.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n- **New Features**\n- Releases now verify that all expected downloads are present and\nnon-empty after publishing.\n- Failed releases automatically create or update a release-health issue.\n- Added scheduled and manually triggered checks for expiring or invalid\nrelease credentials.\n- Health issues update only when the reported status changes and close\nwhen checks recover.\n\n- **Documentation**\n- Added guidance for release-health monitoring and local verification\nchecks.\n\n- **Tests**\n- Added coverage for release asset verification, credential health\nchecks, and health issue updates.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-19T06:38:17Z",
          "tree_id": "8e1f14b43e9d451390fa5bfd8ed0550ade5e4649",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/241718962e707e4f236b457dc8bd2ff21a255c4c"
        },
        "date": 1784444177998,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 275.03613804999986,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 280.64730049999815,
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
          "id": "32e59e78255f7f20ca8c9e54fe2cc3a1b442c42d",
          "message": "chore: release main (#769)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n<details><summary>0.23.0</summary>\n\n##\n[0.23.0](https://github.com/nimbus-agent/Nimbus/compare/v0.22.0...v0.23.0)\n(2026-07-19)\n\n\n### Features\n\n* **release-health:** loud release-asset gate + weekly secret-health\nmonitor ([#768](https://github.com/nimbus-agent/Nimbus/issues/768))\n([2417189](https://github.com/nimbus-agent/Nimbus/commit/241718962e707e4f236b457dc8bd2ff21a255c4c))\n</details>\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).",
          "timestamp": "2026-07-19T11:06:59+03:00",
          "tree_id": "3f879a4b4cbd541c230d9f2cb5959085b5114e28",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/32e59e78255f7f20ca8c9e54fe2cc3a1b442c42d"
        },
        "date": 1784449124024,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 306.64162950000065,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 302.3262443499989,
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
          "id": "86dd22066d14b31274131a854fea1e20bd7f711c",
          "message": "Per-route body cap so /v1/clips accepts real articles, with a matching rate-limit tightening (#771) (#773)\n\nFixes #771.\n\n## The bug\n\n`POST /v1/clips` — the web-clipper ingest surface — shared the I13 write\ndispatcher's single `MAX_BODY_BYTES = 8 * 1024` cap. Any clip whose body\nexceeded 8 KiB (i.e. most real articles) was rejected with `413\npayload_too_large`, so **the web clipper could not perform its primary\nfunction**. Found by a user clipping an ordinary article.\n\n## Why it happened\n\nThe cap predates the clip route. It was introduced 2026-05-14 in\n`59c4fce1` — a commit with **zero** clip references — when the allowlist\nheld six small control-plane JSON routes (deploy annotations, 3× SCIM,\nadmin policy, Teams events). 8 KiB is a sensible anti-abuse bound for\nthose. Slice 9 later grew the allowlist 6 → 8 to add the clip routes,\ncorrectly reusing the dispatcher for auth/rate-limit/audit — but\n`/v1/clips`, the one route whose purpose is carrying article prose,\nsilently inherited a cap sized for config payloads.\n\nNothing suggests this was deliberate: the clipper design spec never\nspecifies a size limit, and the clip E2E round-tripped a **44-byte**\nbody, so it never approached the cap it was subject to.\n\n## The change\n\n**Per-route caps** — `ResolvedRoute` gains `maxBodyBytes`, set\nexplicitly by every resolver. Both enforcement sites (the\n`content-length` pre-check and the post-read `byteLength` check) use\n`route.maxBodyBytes`.\n\n| Route | Body cap | Rate limit |\n|---|---|---|\n| `POST /v1/clips` | **1 MiB** | **20/min** |\n| everything else (deployments, SCIM ×3, admin policy, Teams events,\n`clips/pair/confirm`) | 8 KiB | 60/min |\n\n**Matching rate-limit tightening.**\n`.claude/commands/nimbus-http-write-surface.md` requires that loosening\nthe cap come with \"justification in the PR and a corresponding\nrate-limit tightening\" — so `/v1/clips` drops to 20/min, cutting\nworst-case throughput from ~60 MiB/min to ~20 MiB/min.\n`HttpWriteRateLimiter.check(fp, max?)` applies the override as\n`Math.min(configured, override)`, so a route can only ever **tighten**,\nnever raise, and the `X-RateLimit-*` headers report the effective limit.\n\n**Playbook updated.** That file is a live checklist for route authors,\nand it documented the cap as globally 8 KiB. Its request-flow steps,\nnew-route checklist, and anti-pattern row now describe the per-route\nmodel, with `/v1/clips` recorded as the sanctioned exception.\n\nThe rejection path is otherwise unchanged: both sites still\n`recordRejection({ resultCode: 413, reason: \"payload_too_large\" })` and\nreturn the identical `jsonResponse`. Only the threshold became\nper-route.\n\n## Honest note on auth ordering\n\nA comment at the constants now records something a review caught:\n`checkAuth` returns a constant fingerprint for `clipIngest` **without\nverifying the token** — verification happens in `runClipIngestRoute`,\ni.e. *after* `parseBody`. So an unauthenticated loopback caller can make\nthe gateway buffer and parse up to 1 MiB before any token check. That is\nacceptable at this size on a loopback-only, owner-paired surface, and 1\nMiB is well short of needing streaming — but it is documented rather\nthan assumed away.\n\n**Follow-up (deliberately not in this PR):** verify the clip token\nbefore `parseBody`, which would also replace the shared constant\n`\"clip\"` bucket with per-token limiting. It touches `checkAuth` ordering\nand carries its own regression risk on a security path.\n\n## Verification\n\n- 205 pass / 0 fail across `http-write-routes.test.ts`,\n`security-invariants.test.ts`, and `clips/` (baseline 201). Typecheck\nand lint clean.\n- New tests: a clip over 8 KiB now succeeds (**red before this fix**);\nthe 1 MiB boundary is pinned exactly (1 MiB → 200, 1 MiB + 1 → 413); a\ncontrol-plane route still rejects at 8 KiB; `pair/confirm` still rejects\nat 8 KiB; and 20-vs-60/min is asserted per route, proving the tightening\nis real and didn't leak globally.\n- **No existing assertion was weakened.** Nothing encoded a uniform cap;\nthe pre-existing SCIM `ReadableStream` 8 KiB test now serves as the\ncontrol-plane guard, unmodified. One assertion was corrected\ndeliberately: a clip 413 now reports `X-RateLimit-Limit: 20`.\n- The clip E2E now round-trips a realistically-sized (~40 KiB) article\nthrough a real server and verifies via FTS that the **whole** body was\nindexed — the regression guard that would have caught this originally.\n\n## Downstream\n\nThe extension side is already fixed and merged\n(`nimbus-agent/nimbus-web-clipper#17`): it now treats 413 as a terminal\n`payload_too_large` instead of a retryable `server_error`, which had\nqueued oversized clips and retried them forever behind a misleading\n\"Saved offline — will sync when Nimbus is back.\" That fix is correct\nindependently of this one — retrying a 413 is always pointless.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-19T18:13:51+03:00",
          "tree_id": "14bca438b411df7d560dedbc4bc604c3c8aa323d",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/86dd22066d14b31274131a854fea1e20bd7f711c"
        },
        "date": 1784474741006,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 300.4653618999979,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 300.97053289999315,
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
          "id": "28e66a6729a5d18924717a010cb5d4df7f41622d",
          "message": "ci: migrate release automation from PATs to org GitHub App (#772)\n\n## What\n\nMigrates the org's CI release automation off three long-lived Personal\nAccess Tokens (`RELEASE_PAT`, `RELEASE_PLEASE_PAT`,\n`PACKAGE_MANAGER_PAT`) onto a single org-owned **GitHub App** (\"Nimbus\nRelease Bot\") that mints per-job, 1-hour, least-privilege installation\ntokens via `actions/create-github-app-token` (SHA-pinned `@bcd2ba49…`\nv3.2.0).\n\n`WINGET_PAT` intentionally **stays** a classic PAT — it targets the\nexternal `microsoft/winget-pkgs` fork, which the org App cannot be\ninstalled on.\n\n## Why\n\n- No more 1-year-lived, broadly-scoped PATs sitting in org secrets (the\nroot cause of the v0.17–v0.21 phantom-release outage was an expired\n`RELEASE_PAT`).\n- Tokens are minted per job, scoped to exactly the repos + permissions\nthat job needs, and expire in an hour.\n- The secret-health monitor now probes the App's mint path directly with\na **superset** of the permissions the individual release jobs request,\nso a permission downgrade on any repo is caught before a release needs\nit.\n\n## Changes (6 tasks, subagent-driven + reviewed)\n\n| Workflow | Mint scope | Perms |\n| --- | --- | --- |\n| `release-please.yml` | `Nimbus` | contents + PRs: write |\n| `release.yml` (publish-release + update-manifest) | `Nimbus` |\ncontents: write |\n| `publish-package-managers.yml` | `homebrew-tap`, `scoop-bucket` |\ncontents: write |\n| `publish-linux-repo.yml` | `linux-repo` | contents: write |\n| `secret-health.yml` | all 4 repos | contents + PRs: write (superset\nhealth probe) |\n\n- `scripts/release/check-secret-health.ts` — retired the 3 PAT probes;\nadded a fail-closed `classifyAppMint` (`success → ok`, else `dead`) fed\nfrom `steps.app-mint.outcome`; `RELEASE_BOT_APP` health row via new\n`extraRows` param. Tests updated.\n- `docs/ci-secrets.md` — replaced the 3 PAT rows with the App entry;\nkept `WINGET_PAT` + rationale; added the setup/migration runbook\n(below).\n\n## ⚠️ DO NOT MERGE until the App exists\n\nThis is a big-bang cutover. The mint steps reference\n`secrets.RELEASE_BOT_APP_ID` / `secrets.RELEASE_BOT_PRIVATE_KEY`, which\ndo not exist yet. **Human-only setup must land first**, or the next\nrelease's mint step fails (loudly, by design — but the release won't\nship):\n\n1. Create a GitHub App **\"Nimbus Release Bot\"** under the `nimbus-agent`\norg.\n- Permissions: **Contents: Read & write**, **Pull requests: Read &\nwrite**. No Pages perm (Pages is branch-served via `git push`).\n2. Install it on: `Nimbus`, `homebrew-tap`, `scoop-bucket`,\n`linux-repo`.\n3. Generate a private key; add org (or repo) secrets\n`RELEASE_BOT_APP_ID` and `RELEASE_BOT_PRIVATE_KEY`.\n4. Org **Settings → Actions → allowed actions**: ensure\n`actions/create-github-app-token@*` is permitted (SHA-pinned here).\n5. Merge this PR.\n6. Cut one release and confirm it ships assets green (asset-verify gate\npasses).\n7. **Only then** delete `RELEASE_PAT`, `RELEASE_PLEASE_PAT`,\n`PACKAGE_MANAGER_PAT` from org secrets (staged post-first-green-release\n— **not in this PR**).\n\nFull runbook is in `docs/ci-secrets.md`.\n\n## Deferred (non-blocking, post-App-live)\n\n`release-please.yml` job-level `permissions: contents/pull-requests:\nwrite` now govern only the automatic `GITHUB_TOKEN`, which the job no\nlonger uses for writes (release-please-action uses the minted App\ntoken). These could tighten to `contents: read`. Deferred pending live\nconfirmation the action never falls back to `GITHUB_TOKEN`; the current\nsuperset is safe.\n\n## Verification\n\n`bun test scripts/release/` 89/89 · biome clean · all 5 workflows valid\nYAML · `audit:action-sha-pins` OK · `lint:markdown` 0 · `audit:doc-refs`\nOK · 0 leftover retired-PAT references across workflows.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-19T18:14:44+03:00",
          "tree_id": "e70c7f0beecdef5c81fc888655d263107365b479",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/28e66a6729a5d18924717a010cb5d4df7f41622d"
        },
        "date": 1784475264142,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 242.30129989999696,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 245.28334495000598,
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
          "id": "585d8e90b7a08839d73582552c86639c2a8e5a03",
          "message": "docs: close out Phase 6 and make the Sequencing Spine the live build order (#774)\n\nPhase 6 (Team) completed 2026-06-18, but the docs never caught up: the\nphase still sat under `## Active`, fourteen shipped items were unticked,\nand the acceptance-criteria banner still said *\"Slices 6b/6c + 7–9\nremain planned\"*. This is a status-drift sweep across the roadmap and\nevery surface that mirrors it.\n\n## `docs/roadmap.md`\n\n- **Phase 6 moves out of `## Active` into `## Shipped`.** `## Active`\nbecomes **Spine S1 — Local Brain**: delivered = the egress ledger +\n`nimbus prove` (2026-06-20, `I29`/`D22`/V44); remaining = the\nimplicit-knowledge triad, answer-quality surfaces, the ownership graph;\nplus the S3 MCP-server branch, described as **parked** (last commit\n2026-06-18) rather than in-flight.\n- **Fourteen shipped-but-unticked boxes** now checked with delivery date\n+ slice ref: the six warehouse/BI connectors (Slice 7), cloud janitor +\nblast-radius preflight (6b), tribal-knowledge extraction (6c), and the\nfive Share & Virality primitives (8a–8d).\n- **Team-owned workflow pipelines** stays unchecked but is now\nexplicitly deferred to spine slot **S4**, so \"Phase 6 complete\" doesn't\npaper over a silent gap. SageMaker/Vertex writes and paid extensions\nkeep their existing deferral reasons.\n- Acceptance criteria → all satisfied (cross-warehouse lineage ticked);\nhistorical *\"is now active\"* notes past-tensed.\n- **Web clipper:** a real browser-extension row — `v0.1.0`, satellite\nrepo `nimbus-agent/nimbus-web-clipper`, loopback-only, offline queue +\nquick-clip entry points, **store listings pending their one-time\nbootstrap** — replacing \"ships as the follow-on Plan B\".\n\n## Mirrors\n\n`CLAUDE.md` + `GEMINI.md` status line · `docs/architecture.md` (\"has\nbegun landing\" → complete; adds Slice 9 + the egress ledger; Slice 8\ndate corrected 2026-06-16 → 2026-06-15 → 06-18) · `docs/README.md` ·\n`docs/CHANGELOG.md` entry · the Starlight web-clipper page\n(developer-preview → released, install from a release zip) · the\n`nimbus-ipc` and `nimbus-commands` skills, which had **no `clip.*` IPC\nor `nimbus clip` CLI section at all**.\n\n`docs/SECURITY-INVARIANTS.md`'s worked example no longer claims `I28` is\nthe next free number (ceiling is `I30`; `I28` is reserved) — the\nsharpest self-contradiction in the docs. The four `I28` sites now say\n**parked**, not in-flight. The superseded web-clipper design spec gets a\nSUPERSEDED banner instead of a rewrite.\n\n## One code fix rode along\n\n`packages/cli/src/commands/registry.ts` was missing eight registered\ncommands (`admin`, `chatops`, `clip`, `egress`, `mcp-server`, `policy`,\n`prove`, `security`). `COMMAND_NAMES` is consumed only by\n`audit:readme-cli` + its own test, so it drifts silently from the real\ndispatch map in `index.ts` — and reds CI the moment a doc mentions one\nof the missing commands (this PR's `nimbus prove` mention did exactly\nthat). Fixed rather than papered over by deleting the doc reference.\n\n## Verification\n\n| Gate | Result |\n|---|---|\n| `lint:markdown` | 0 errors (82 files) |\n| `audit:doc-refs` | 604 refs across 15 docs — all resolve |\n| `audit:status-drift` | OK |\n| `audit:readme-cli` | 32/32 match (was 1 unregistered) |\n| `docs:build` | 55 pages, all internal links valid |\n| `typecheck` | pass (full workspace) |\n| `bunx biome check packages scripts` | 2868 files, clean |\n| `registry.test.ts` | 5 pass |\n| `lychee` | clean (only its known root-relative-link limitation on\n`.mdx`, which the Astro build validates) |\n\nNote: `bun run lint` fails inside `.claude/worktrees/` regardless of\ncontent (biome resolves `.` to 0 files) — validated with the direct\n`bunx biome check` invocation above.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-19T17:21:31Z",
          "tree_id": "85ccfc5cfe56e826053bf2ab07d36e043d125e9c",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/585d8e90b7a08839d73582552c86639c2a8e5a03"
        },
        "date": 1784482420361,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 307.9309921500004,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 308.5137719999948,
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
          "id": "6a7ecad8a9281751461f7d0f642d365085dc723d",
          "message": "docs: add the ecosystem roadmap — the sdk/client/clients delivery spine (#775)\n\n`roadmap.md` is authoritative for what the gateway *does*. Nothing was\nauthoritative for how that capability *reaches a human* — and that gap\nis now the binding constraint on the whole product:\n\n> **The gateway roadmap is 27 phases deep. The client surface is 15\nmethods wide.**\n\nThis adds `docs/ecosystem-roadmap.md` to own the width, and cross-links\nboth roadmaps so they declare their scopes instead of drifting into\noverlap.\n\n## Why now — three measured facts\n\nEach verified against source, not inferred.\n\n**1. The capability is built; it is not reachable.**\nThe gateway dispatches ~212 JSON-RPC methods. `@nimbus-dev/client`\nexposes **15**. The VS Code extension consumes **13**. Entire namespaces\nare built, dispatch-wired and mostly already Tauri-allowlisted, yet\nunreachable from any npm client: `agents.*`, `workflow.*`, `watcher.*`,\n`share.*`, `federation.*`, `connector.*`, `people.*`, `metrics.dora`,\n`deploy.preflight`.\n\nThe client has shipped **5 new methods in 4 months** against ~198\nunexposed. Adding one is ~100 lines across 5–6 files and needs **zero\ngateway changes**. *This is not a hard problem; it is an unstaffed one.*\n\n**2. The narrow waist has no enforced contract — and it is broken\ntoday.**\n\n| Layer | Says |\n|---|---|\n| `index/item-list-query.ts:37` | `SELECT * FROM item` → raw\n**snake_case** |\n| `@nimbus-dev/client` | `Record<string, unknown>[]` — the only method\nwith **no validator** |\n| `@nimbus-dev/sdk` `NimbusItem` | **camelCase**, 6-value `itemType`\nincl. `folder`/`task` |\n| `docs/schema-reference.md` | **19** types incl.\n`deployment`/`alert`/`incident`; `task` explicitly *not* emitted |\n\nConsequence, shipped and live: the VS Code Index view reads\n`rec[\"itemType\"]` and gets `undefined` every time — it has **never**\ndisplayed a type or sorted by time. It looks fine only because\n`id`/`name`/`service`/`url` collide across both casings.\n\nBehind that bug: `item_type` has **no machine-readable source of truth\nanywhere** — it lives in a SQL comment, while `roadmap.md` plans to add\n`service`, `team`, `dora_metric`, `security_finding`, `llm_trace`…\n\n**3. Nobody is using it.** VS Code extension: **3 installs**. And\n`incident` / `on-call` / `deploy` / `alert` / `SRE` appear **zero**\ntimes in its `src/`, README or `package.json` — against a product whose\nREADME opens *\"Cross-service incident context in under 100 ms\"* and\nwhose `audiences.md` ranks On-call/SRE first.\n\n## The shape\n\n**Seal the waist → open the waist → surface it → tell people**, with the\noperating principle that **every stage ends in a gate a machine can\ncheck** — because delivery is largely agent-driven, and fact 2 is\nexactly what agents-against-wrong-contracts produce when nothing is\nwatching.\n\n- **Stage 0** — single-source `ItemType` in the SDK, validated\n`queryItems`, and a client↔gateway conformance test in CI. Ships the\nIndex bug fix.\n- **Stage 1** — expose namespaces in batches. `agents.*` first: 8\nread-only methods where the SDK *already publishes* both\n`brief-types.ts` and `guard-factory.ts` runtime guards, so the two\ncostliest parts of exposing a method are already done.\n- **Stage 2** — re-cut surfaces for the ICP. Headline is the `nimbus\nwhy` lens *already specified in this repo's Phase 7*; egress receipts\n(M7 / Phase 12.5 / EAF) as the moat; LM-tool registration as the\nmultiplier.\n- **Stage 3** — distribution.\n\nLicensing fixes the contract's direction: sdk/client are MIT, gateway is\nAGPL-3.0, so shared types **must** live in the SDK and be imported by\nthe gateway. That edge already exists (`gateway → @nimbus-dev/sdk\n^1.3.0`), so Stage 0 adds no new dependency.\n\n## Notes for review\n\n- **Docs only** — no code, no behaviour change.\n- `bun run lint:markdown` clean; all internal link targets verified\npresent.\n- The doc contains an **Open decisions** section rather than pretending\nconsensus: where the `item_type` enum ultimately lives, what the\nconformance test runs against, whether the editor is even the right\nfirst home for the `why` lens (during a live page engineers are in Slack\nand PagerDuty, not VS Code), and the fact that every stage is gated on\nclient throughput that has averaged ~1.25 methods/month.\n- The 212 figure carries a footnote on how it was derived and admits a\nraw grep returns 243 including notification names.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-19T22:59:07+03:00",
          "tree_id": "e4027a875e3281e469e567f5072f2d31291eb79e",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/6a7ecad8a9281751461f7d0f642d365085dc723d"
        },
        "date": 1784491889630,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 300.31496275000063,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 299.96221599999956,
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
          "id": "bd44def209f209d4fb3fe1415ed89fb44ecf7280",
          "message": "docs: add the Stage 0 implementation plan, and a third bug it fixes (#776)\n\nFollow-up to #775. Writing the Stage 0 plan surfaced a **worse symptom\nof the same root cause** than either bug already documented, plus a\ndesign correction — so the roadmap's diagnosis is updated alongside the\nnew plan.\n\n## The third bug: the gateway silently mislabels every ops item type\n\n`packages/gateway/src/index/local-index.ts:94`:\n\n```ts\nfunction itemTypeFromRowType(raw: string): NimbusItem[\"itemType\"] {\n  if (raw === \"file\" || raw === \"folder\" || raw === \"email\" ||\n      raw === \"event\" || raw === \"photo\" || raw === \"task\") return raw;\n  return \"file\";\n}\n```\n\nBecause the old SDK union listed six values, every `deployment`,\n`alert`, `incident`, `pr`, `issue`, `pipeline_run`, `dashboard`,\n`infra_resource` and `log_alarm` read through `rowToItem` comes back\n**relabelled `\"file\"`** — mislabelled, not merely untyped.\n\nThis is worse than the VS Code bug in #775: that one loses a display\nattribute in one client; this is **silent data corruption inside the\ngateway, at its own read boundary**. The function accepts two values the\ngateway never emits (`folder`, `task`) and corrupts thirteen it does.\n\n## Design correction: the enum must be open, not closed\n\n#775 said Stage 0 would \"drop `folder`/`task`, add the 19 real types\" —\ni.e. a closed union. That's wrong on three counts:\n\n1. `schema-reference.md` already calls it *\"open enum, extended per\nconnector\"*.\n2. `roadmap.md` plans a dozen more (`service`, `team`, `scorecard`,\n`dora_metric`, `security_finding`, `llm_trace`, …). Under a closed union\n**every one of those is a breaking change**.\n3. A closed union is precisely what forces the coercion being deleted —\nit leaves no way to represent an unrecognised type except to rewrite it.\n\nSo: `KnownItemType` lists the 19 for autocomplete and exhaustiveness,\nand `ItemType = KnownItemType | (string & {})` accepts anything. This\nalso keeps the SDK release a **non-breaking `1.4.0`**, which the\ngateway's existing `^1.3.0` range resolves with no manifest edit — where\na closed union would have forced a major that `^1.3.0` could not pick\nup.\n\n## The plan\n\n`docs/superpowers/plans/2026-07-19-stage-0-seal-the-narrow-waist.md` — 5\ntasks across 4 repos, 42 TDD steps, every step with exact paths, real\ncode and expected output.\n\nTwo things worth calling out:\n\n- **The release hops are sequenced explicitly.** Two npm publishes sit\non the critical path. But `nimbus-client` already has a `verify:sdk`\nscript that builds and packs the sibling `../nimbus-sdk` checkout — so\nclient work proceeds against an unpublished SDK and only the *merge*\nwaits on npm. Tasks 2 and 3–4 run in parallel.\n- **The gate is required to be observed failing.** Task 4 Step 4 renames\na fixture key and asserts the conformance test goes red before\nreverting. A gate never seen failing is not a gate — and an unverified\ngate is how the original bug survived.\n\nExit criteria include a grep proving exactly one declaration of the\nitem-type vocabulary survives across all four repos.\n\n## Notes\n\n- Docs only. No code changes.\n- `bun run lint:markdown` clean (84 files).\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-19T23:06:42+03:00",
          "tree_id": "74753cb711e26a4ef34ab16cab419e65f0ebc045",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/bd44def209f209d4fb3fe1415ed89fb44ecf7280"
        },
        "date": 1784492384463,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 236.74800015000326,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 239.27153930000168,
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
          "id": "6984e1ec0665964f64c75f5d11db7f40763ac3d8",
          "message": "npm supply-chain assurance: weekly provenance monitoring + credential-absence guard (#777)\n\nMonorepo slice of secrets-management sub-project #3 — **npm supply-chain\nassurance**.\n\nnpm OIDC trusted publishing and SLSA provenance turned out to be\n**already live** for both packages (verified on the live registry, not\nfrom docs). So this program is *verify + harden + clean up*, not build.\n\n## What lands here\n\n- `scripts/release/check-secret-health.ts` — provenance classifiers + an\n`NPM_TOKEN` absence guard, folded into the existing weekly health table\nand its de-duped issue filer.\n- `.github/workflows/secret-health.yml` — resolves each package's\npublished version and probes provenance in **monitor** mode.\n- `docs/ci-secrets.md` — npm provenance section + a per-kind alert\nrunbook.\n- `docs/CHANGELOG.md` — dated entry.\n\n## Companion PRs (open, **not** merged)\n\n| Repo | PR | Adds |\n| --- | --- | --- |\n| `nimbus-sdk` | #12 | pre-publish preflight + post-publish provenance\ngate |\n| `nimbus-client` | #5 | same |\n| `nimbus-vscode` | #35 | weekly PAT probe, `.vsix` attestation, verify\ndocs |\n\nAlready merged: two composite actions in `nimbus-agent/.github` (pinned\n`5fb42792fa88287048fd24f704183b9a9b807a67`).\n\nDocs here deliberately describe the satellite gates in the future tense\n— they are not merged yet.\n\n## Defects caught during review (all fixed)\n\n- **False `ok`.** An unreported provenance probe (renamed step id,\nskipped step, action exiting early — all silent, no workflow error)\nclassified as `not-configured`, which sat in neither the hard nor warn\nset. The monitor would have posted \"✅ All release credentials healthy\"\nfor *\"we have no idea\"*.\n- **False alarm on a shipped artifact.** With the version-resolution\nstep allowed to fail soft, an empty version made the action request\n`…/@pkg@` → 404 → `absent` → `missing-provenance`, a hard failure. A\nroutine npm outage would have filed an issue claiming the published\npackage lost its provenance. Both probes now carry an `if:` guard.\n- **Unactionable alerts.** The action emits a `detail` explaining *why*\nprovenance failed; the workflow discarded it along with the version, so\na `source-mismatch` named neither.\n- **Overclaiming docs.** \"OIDC is the only path that can publish\" —\n`mfa=publish` blocks automation, not an interactive maintainer with an\nOTP.\n- **`npm audit signatures` in the repo root** audits the *dependency\ntree*; a package is never its own dependency, so the artifact just\npublished went cryptographically unchecked. The satellite gates now\ninstall the published version into a clean tree and audit that.\n\n## Verification\n\n18 gates green (typecheck, biome, markdown, and all 15 audits). 42/42\ntests in `check-secret-health.test.ts`, with break-it-and-watch-it-fail\nproofs on the fail-closed classifier and the detail composition.\n\n`bun run preflight` aborts early on the known `.claude/worktrees/` biome\ntrap, so gates were run individually.\n\n## Not verified\n\nThe new workflow path has never executed live — that is close-out task\nE1, together with `nimbus-vscode`'s deferred first probe run.\n\n## Follow-ups (not in this PR)\n\n- `nimbus-vscode` `publish.yml` passes publish tokens on argv (`--pat` /\n`-p`); both CLIs accept them from env.\n- The composite action writes `GITHUB_OUTPUT` as plain `key=value` with\na registry-derived `detail` — not exploitable, but it is this project's\nown named defect class.\n- `bun run test:ci` is broken on `main` (builds the deleted\n`packages/client`; surfaces on Windows as a misleading `ENOENT uv_spawn\n'bun'`). Not a CI gate.\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-20T15:21:17Z",
          "tree_id": "338955808a9b42d85b01322677f8e1c9f0c4570d",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/6984e1ec0665964f64c75f5d11db7f40763ac3d8"
        },
        "date": 1784561633529,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 313.2413361499959,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 317.88858729998975,
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
          "id": "4d723b80bad63d96016f5aeb379b465844f82f5e",
          "message": "fix(deps): clear the critical + high advisories blocking every PR (#781)\n\n`bun audit --audit-level high` began failing on **main and every open\nPR** after a batch of advisories published 2026-07-20/21. This clears\nthem.\n\nNot branch-specific: I triggered the Security workflow on `main`\ndirectly ([run\n29800230805](https://github.com/nimbus-agent/Nimbus/actions/runs/29800230805))\nand it failed on the same two jobs — `Dependency audit` and `Trivy` —\nwith the same advisory IDs. Main's last green Security run was\n2026-07-20 05:39, before these landed.\n\n## Cleared: 1 critical + 7 high\n\n| Package | Severity | Advisory |\n| --- | --- | --- |\n| `tar` | **critical** |\n[GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw)\n— decompression/parse DoS |\n| `tar` | high |\n[GHSA-8x88-c5mf-7j5w](https://github.com/advisories/GHSA-8x88-c5mf-7j5w)\n— infinite loop on negative entry size |\n| `astro` | high |\n[GHSA-vj59-8hwv-xxmv](https://github.com/advisories/GHSA-vj59-8hwv-xxmv)\n— authorization bypass |\n| `js-yaml` ×2 | high |\n[GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m)\n— quadratic merge-key CPU |\n| `shell-quote` | high |\n[GHSA-395f-4hp3-45gv](https://github.com/advisories/GHSA-395f-4hp3-45gv)\n— quadratic `parse()` DoS |\n| `brace-expansion` ×2 | high |\n[GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp)\n— exponential expansion DoS |\n\n## How each was fixed\n\n- **astro** — cleared by an in-range `bun update` (6.4.7 → 6.4.8). No\nmanifest change needed.\n- **tar**, **js-yaml** — direct `@nimbus/gateway` dependencies, ranges\nmoved to the fixed versions (`^7.5.20`, `^4.3.0`).\n- **shell-quote**, **brace-expansion**, and the transitive copies of\ntar/js-yaml — reachable only through other packages' trees, so they use\nthe repo's existing root-`overrides` mechanism.\n\nTwo choices worth scrutiny:\n\n**`brace-expansion` is pinned to 5.0.7, not 2.1.2.** GHSA-3jxr-9vmj-r5cp\ncovers *two* disjoint ranges — `>=2.0.0 <2.1.2` **and** `>=3.0.0\n<5.0.7`. The intuitive bump to 2.1.2 leaves the tree's other copy dirty,\nand 5.0.6 (then-current) is itself in the second range. I hit exactly\nthat: an override of `>=2.1.2` resolved to 5.0.6 and still audited\ndirty.\n\n**`js-yaml` is pinned top-level to 4.3.0**, which also lifts the\n`3.14.2` copies used by `gray-matter` and `@istanbuljs/load-nyc-config`.\nThis was the risky part — js-yaml 4 dropped `safeLoad`, so a 3.x\nconsumer calling it would break at runtime. Bun ignored nested/scoped\noverride syntax (`{\"parent\": {\"js-yaml\": \"...\"}}` produced no change),\nso a top-level pin was the available mechanism. **Verified empirically\nrather than assumed** — see below.\n\n## Verification\n\n| Check | Result |\n| --- | --- |\n| `bun audit --audit-level high` | ✅ clean (was 1 critical + 7 high) |\n| `typecheck` (96 packages) | ✅ |\n| `biome check packages scripts` | ✅ |\n| **`docs:build`** (astro + starlight + gray-matter) | ✅ 55 pages, all\ninternal links valid |\n| **`lint:markdown`** (markdownlint-cli2 → js-yaml) | ✅ 88 files, 0\nerrors |\n| `gateway/src/updater` + `extensions` (tar) | ✅ 460 pass |\n| `gateway/src/db` (`tar-bundle.ts`) | ✅ 251 pass |\n| `packages/cli/src` (shell-quote via react-devtools-core) | ✅ 1761 pass\n|\n\nThe docs build and markdownlint runs are the ones that matter — they\nexercise the `js-yaml` consumers I was worried about, and both pass.\n\n`packages/cli/src` also reports 8 failures in `runUpdate dispatcher`.\nThose are **pre-existing TTY-stdin mocking failures**, identical on an\nunmodified base checkout, unrelated to dependencies.\n\n## Scope\n\nOnly `--audit-level high` findings are addressed, matching what CI gates\non. Remaining moderate/low advisories (`qs`, `body-parser`,\n`markdown-it`, `protobufjs`, `yaml`, `@ai-sdk/provider-utils`, and the\nastro XSS trio) are untouched and non-blocking — worth a separate sweep.\n\nUnblocks #780 and any other open PR.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Bug Fixes**\n* Updated dependency versions and security overrides to improve\nreliability and address package maintenance needs.\n* Improved test resilience when expected response data or request\nparameters are missing.\n* Preserved validation of command-line workflows, gateway operations,\nfederation requests, and connector data handling.\n\n* **Tests**\n* Hardened automated checks for optional responses, attachment metadata,\nerror messages, and IPC payloads.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-21T16:54:37Z",
          "tree_id": "928738a887a25fba9c20a5b01366197bf44275e7",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/4d723b80bad63d96016f5aeb379b465844f82f5e"
        },
        "date": 1784653530753,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 296.05306430000417,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 296.94293054999144,
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
          "id": "008615da3ba74fec7aabf935abc57b7eabda90bb",
          "message": "fix: stop relabelling 55% of indexed items, and return NimbusItem from index.queryItems (#780)\n\nStage 0 of the ecosystem roadmap, gateway half. Fixes a data-fidelity\nbug and an IPC contract leak that share one root cause: the gateway's\nitem-type vocabulary disagreed with itself.\n\n## The bug, measured\n\n`itemTypeFromRowType()` accepted only the six values in the pre-1.4.0\nSDK union and returned `\"file\"` for everything else. Against a live\n546-row index that is **300 rows — 55% — mislabelled**:\n\n| type | rows | before |\n| --- | --- | --- |\n| `email` | 228 | preserved |\n| `ci_run` | 214 | → `\"file\"` |\n| `pr` | 79 | → `\"file\"` |\n| `file` | 13 | preserved |\n| `folder` | 5 | preserved |\n| `issue` | 5 | → `\"file\"` |\n| `web_clip` | 2 | → `\"file\"` |\n\nThis is corruption, not missing typing — the true value was discarded.\n`@nimbus-dev/sdk@1.4.0` makes `ItemType` an open enum (`KnownItemType |\n(string & {})`), so the raw column value now passes through unchanged.\nOne deletion fixes `search`, `searchRanked` and `queryItems` at once,\nsince all three map rows through `rowToItem`.\n\n## The contract leak\n\n`index.queryItems` returned raw `SELECT * FROM item` rows, leaking\nunified-V3 column names (`type`, `title`, `external_id`) over IPC —\nwhile every other read path already mapped through `rowToItem`.\nDownstream clients had to guess the wire shape, and nimbus-vscode\nguessed wrong (it reads camelCase and silently got `undefined` on every\nrow).\n\nAdds `LocalIndex.listItems()`, which owns the list SQL and the mapping\ntogether, returning:\n\n```ts\ntype IndexedItem = NimbusItem & { indexPrimaryKey: string };\n```\n\n`indexPrimaryKey` carries the `service:external_id` composite key.\n`NimbusItem.id` is the bare `external_id`, which is **not unique across\nservices**, so list consumers need it for stable identity — mirroring\nthe existing `RankedSearchItem` pattern. `rowToItem` and `ItemRow` stay\nmodule-private; `listItems` is the seam.\n\n## Breaking change\n\nThe `index.queryItems` wire shape changes from raw snake_case rows to\ncamelCase `IndexedItem`. Known consumers:\n\n- `nimbus query` — updated here.\n- **nimbus-vscode** — broken today regardless; fixed by a follow-up once\n`@nimbus-dev/client@0.6.0` ships.\n\nTwo things reviewers should know:\n\n- `GET /v1/items` still returns raw snake_case rows with all columns, so\nit and `index.queryItems` now differ in both shape and data, despite the\ndocs describing shared filter semantics. Deliberate for this stage,\nflagged for follow-up.\n- `index.queryItems` is LAN-callable by a paired peer, so a\nmixed-version pair sees the shape flip. Acceptable pre-1.0.\n\nThe narrowing is intentional: `body_preview`, `author_id`,\n`canonical_url`, `synced_at` and `pinned` are storage/provenance\nconcerns, not item identity. `index.querySql` remains for raw column\naccess and is untouched.\n\n## Regression caught in review\n\nThe whole-branch review found a user-visible regression that per-commit\nreview missed: `isItemLikeRow` gated `nimbus query`'s card rendering on\n`row[\"title\"]`, which the new payload lacks — so TTY output silently\ndegraded from numbered cards to `── #1 ──` key/value blocks with\nunformatted epoch timestamps. Fixed to accept **both** shapes (`--sql`\nlegitimately still returns raw rows). ~15 stale test fixtures that hid\nit were migrated, and the new regression test was verified to fail when\nthe fix is reverted.\n\n## Dependency change and its real blast radius\n\n`packages/gateway` moves to `^1.4.0`. The lockfile refresh also adds\nnested `@nimbus-dev/sdk@1.4.0` entries for **94 `nimbus-mcp-*`\npackages** that had none, so the connector fleet resolves 1.4.0 rather\nthan the hoisted 1.3.0. Safe — 1.4.0 only *widens* the union, so a\nconnector emitting `ci_run` gains valid typings rather than losing any —\nand it cannot be split from this PR, since `itemType: string` does not\ntypecheck against 1.3.0.\n\n## Verification\n\n| Gate | Result |\n| --- | --- |\n| `typecheck` (96 packages) | ✅ |\n| Targeted tests | ✅ 229 pass / 0 fail |\n| `packages/gateway/src/index/` | ✅ 348 pass / 0 fail |\n| `biome` (1613 files) | ✅ |\n| `lint:markdown` | ✅ |\n| All 10 `audit:*` gates | ✅ incl. `invariants`, `openapi-drift`,\n`boundaries` |\n\nCoverage of every changed file is well above the 85%/80% floor:\n`local-index.ts` 96.9%/89.9%, `diagnostics-rpc.ts` 99.0%/92.4%,\n`query.ts` 98.0%/92.5%.\n\nTwo known-red items are **pre-existing and unrelated**, both confirmed\nidentical at the branch base: 8 TTY-stdin failures in\n`cli/src/commands/update.test.ts`, and 4 `coverage-floor` violations in\nfiles this branch never touches (`update.ts`, `socket-listeners.ts`,\n`lever/search-filter.ts`).\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n* **Breaking Changes**\n* `index.queryItems` now returns camelCase `NimbusItem`-style rows with\n`indexPrimaryKey`.\n* Some previously surfaced database-specific fields are intentionally\nomitted from the narrowed wire shape.\n* SQL-style queries (`querySql` / `--sql`) continue to return raw\ndatabase-shaped results.\n* **Improvements**\n* CLI “item cards” now render correctly for both supported item row\nformats (including TTY scenarios) and improved timestamp handling.\n  * Item type values are preserved end-to-end.\n* **Documentation / Tests**\n* Updated roadmap/changelog notes and added regression coverage to\nprevent snake_case top-level fields in responses.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-21T17:12:10Z",
          "tree_id": "68666d74821329b4315ff30c5ffb328fdaf46acb",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/008615da3ba74fec7aabf935abc57b7eabda90bb"
        },
        "date": 1784654473673,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 243.97526955000066,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 237.03852389998937,
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
          "id": "b22b4952628e1ae9ac3085254ce572e5359dd658",
          "message": "Credential rotation & hardening: a manifest the weekly monitor checks against live state (#783)\n\nSub-project #4 of the secrets-management program, and the last one.\nWhere #1 monitored a handful of release credentials by name and #2/#3\nretired PATs in favour of App and OIDC minting, this one asks the\nquestion none of them could: *is the set of credentials we think exists\nthe set that actually exists?*\n\n## What it adds\n\n- **A credential manifest** (`scripts/release/credential-registry.ts`) —\nevery credential across the org, each with a three-valued `state`:\n`required` / `optional` / `forbidden`. Two values would have been wrong:\nsix credentials are legitimately referenced-but-unset today\n(Windows/Apple signing certs, `NIMBUS_CHECKS_TOKEN`, `SCORECARD_TOKEN`)\nand would all have hard-failed on day one.\n- **Live enumeration** (`credential-enumerate.ts`) via a new read-only\n`nimbus-secret-auditor` GitHub App, and a **diff**\n(`credential-audit.ts`) against the manifest.\n- **Inventory rows in the weekly monitor**, folded into #1's existing\nde-duplicated issue filer.\n- **`audit:consumed-by`** — a preflight gate that fails when the\nmanifest's `consumedBy` names a workflow that does not exist, so the\n\"who uses this?\" column cannot rot.\n- **`docs/credential-hygiene.md`** — the manual workstation audit,\ncovering what CI-side inspection structurally cannot see.\n\n## Why the scan surface is not derived from the manifest\n\nThe original design enumerated secrets from the manifest's own repo\nlist. The manifest names 3 repos; the org has 18. Fifteen — both npm\nsatellites and all six private repos — would never have been scanned, so\na secret in an undocumented repo would have been invisible *by\nconstruction* while the monitor reported everything healthy.\n`enumerateSecrets` takes no repos parameter; it discovers its surface\nfrom `/installation/repositories`.\n\n## Proven live, not just in tests\n\nThe hard-failure path never runs on a healthy monitor, so it was driven\ndeliberately — the same blind spot that hid a broken alert path in\nsub-project #3.\n\nA throwaway secret was planted in `nimbus-benchmarks`, a repo that\nappears **nowhere in the manifest**. Run\n[29849554973](https://github.com/nimbus-agent/Nimbus/actions/runs/29849554973)\nfailed with:\n\n```\n| nimbus-benchmarks/ZZ_AUDIT_PROBE | inventory | undocumented | actions secret in nimbus-benchmarks is absent from credential-registry.ts — add it or delete it |\n```\n\nUnder the manifest-derived design that row was impossible. Baseline\n[29847962142](https://github.com/nimbus-agent/Nimbus/actions/runs/29847962142)\nand recovery\n[29849794916](https://github.com/nimbus-agent/Nimbus/actions/runs/29849794916)\nboth succeeded; the probe is deleted and left no residue. De-duplication\nheld — no second issue was filed, #782's body was edited in place.\n\n## Two real findings on the first run\n\n- `Nimbus/CODECOV_TOKEN` — stale, last set 95d ago against a 90d policy.\nNeeds an interactive rotation.\n- `org/RELEASE_PLEASE_PAT` — visibility is `all`, declared `selected`.\nNarrowing was attempted and blocked by the org plan. The drift row is\ndeliberately left loud rather than declaring `all` in the manifest,\nwhich would silence a genuine over-exposure.\n\nBoth are warn-level, so the monitor stays green while issue #782 stays\nopen. That is the intended behaviour: `undocumented` is hard, drift and\nstaleness are warnings.\n\n## Live state changed by this work\n\nOne thing only: `nimbus-sdk` had secret scanning and push protection\n**off** — the only repo of 18 — and both are now enabled.\n\n`RELEASE_PAT` and `PACKAGE_MANAGER_PAT` **stay**. Their retirement is\ngated on a full release cycle going green under the GitHub App, and no\ntag-triggered workflow has run since that migration merged.\n\n## Verification\n\n`typecheck`, standalone `tsc --strict` over `scripts/` (which the\nworkspace-filtered `typecheck` does not cover), biome, `lint:markdown`,\n`audit:{doc-refs,consumed-by,status-drift,action-sha-pins,boundaries,invariants,cross-platform}`,\nand `bun test scripts/{release,lib}` → 148 pass / 6 skip / 0 fail.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-21T20:13:15+03:00",
          "tree_id": "70a354632f8f271446c324b5df976d9b024c9598",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/b22b4952628e1ae9ac3085254ce572e5359dd658"
        },
        "date": 1784655123077,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 286.17363270000243,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 286.3088461500003,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "306811640+nimbus-release-bot[bot]@users.noreply.github.com",
            "name": "nimbus-release-bot[bot]",
            "username": "nimbus-release-bot[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "6514f82cebb300443d54a1d897dd8b37aabaa299",
          "message": "chore: release main (#784)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n<details><summary>0.23.1</summary>\n\n##\n[0.23.1](https://github.com/nimbus-agent/Nimbus/compare/v0.23.0...v0.23.1)\n(2026-07-21)\n\n\n### Bug Fixes\n\n* **deps:** clear the critical + high advisories blocking every PR\n([#781](https://github.com/nimbus-agent/Nimbus/issues/781))\n([4d723b8](https://github.com/nimbus-agent/Nimbus/commit/4d723b80bad63d96016f5aeb379b465844f82f5e))\n* stop relabelling 55% of indexed items, and return NimbusItem from\nindex.queryItems\n([#780](https://github.com/nimbus-agent/Nimbus/issues/780))\n([008615d](https://github.com/nimbus-agent/Nimbus/commit/008615da3ba74fec7aabf935abc57b7eabda90bb))\n</details>\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\nCo-authored-by: nimbus-release-bot[bot] <306811640+nimbus-release-bot[bot]@users.noreply.github.com>\nCo-authored-by: Asaf <asafgolombek@gmail.com>",
          "timestamp": "2026-07-21T17:30:23Z",
          "tree_id": "39f9f28e6f46ed10a252dc683ce00b9a2fbc0169",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/6514f82cebb300443d54a1d897dd8b37aabaa299"
        },
        "date": 1784655882619,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 304.24857360000095,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 303.4729196000044,
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
          "id": "689f1299c4b9292b9fc647b4465fc312eb0cddaf",
          "message": "test:ci crashed on a deleted package, and silently skipped a coverage gate (#786)\n\nCloses #778.\n\n## The reported bug\n\n`runCiTestSuite()` opened with a build of `packages/client`, which no\nlonger exists — it was extracted to `@nimbus-dev/client` in #758.\nBecause the missing thing was the **working directory** rather than the\nexecutable, Windows reports:\n\n```\nENOENT: no such file or directory, uv_spawn 'bun'\n```\n\nwhich reads as \"bun is not on PATH\". It is; `bun --version` succeeds in\nthe same shell. The error points at the wrong problem, which is what\nmade this expensive to diagnose rather than merely broken.\n\n## The bug the report didn't mention\n\nFixing the crash alone would have left something worse in place. The\ncoverage-gate list in `ci-tests.ts` had drifted from `package.json` **in\nboth directions**:\n\n| | |\n|---|---|\n| `test:coverage:client` | wired in, script deleted with the package |\n| `test:coverage:sandbox` | declared in `package.json`, never wired in |\n\nSo beyond crashing, `test:ci` had **silently stopped running the sandbox\ncoverage gate**. That asymmetry is the point: a dead gate fails loudly\nthe moment you reach it, but a missing gate produces a clean green run\nthat simply checks less than you think. Removing `client` and adding\n`sandbox` makes the two lists agree exactly — 25 gates either way.\n\n## Why a test and not just a fix\n\nNothing forced the gate list and `package.json` to agree, which is how\nthey drifted apart in the first place. `COVERAGE_GATES` is now exported\nand `ci-tests.test.ts` asserts both directions, following the existing\n`preflight-gates.test.ts` pattern.\n\nRed/green proof — restoring the original drift (`sandbox` → `client`)\nfails both assertions, each naming the exact culprit:\n\n```\nevery test:coverage:* script in package.json is wired into test:ci\n  + [ \"test:coverage:sandbox\" ]\nevery wired gate resolves to a real package.json script\n  + [ \"test:coverage:client\" ]\n```\n\nRestored: 4 pass / 0 fail.\n\n## Verification\n\n`bun test scripts/` → 516 pass / 20 skip / 0 fail. Standalone `tsc\n--strict` over both files exits 0 (the workspace `typecheck` is filtered\nand does not cover `scripts/`). Biome clean.\n`audit:{doc-refs,consumed-by,status-drift,invariants,cross-platform}` +\n`lint:markdown` all pass. `bun run test:ci` now runs past the old crash\npoint into `typecheck` with no `ENOENT`.\n\nNote this was never a CI outage — no workflow calls `test:ci`; CI drives\n`_test-suite.yml` directly. It broke the local script contributors reach\nfor, and `preflight`'s full tier.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-21T20:42:27+03:00",
          "tree_id": "f281ce5b60798fe10a4c1695c3aff1c990d146c5",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/689f1299c4b9292b9fc647b4465fc312eb0cddaf"
        },
        "date": 1784656637725,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 295.9829926999977,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 300.5509613499977,
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
          "id": "a10de0b01ca1b2e295121301b085c88a68525efd",
          "message": "ci: one static required gate, so docs-only PRs stop needing an admin bypass (#788)\n\nEvery docs-only PR in this repo is permanently `BLOCKED` and can only be\nmerged with the OrganizationAdmin ruleset bypass. #776 and #785 both\nwent that way.\n\n## The bug\n\nBranch-protection rulesets match check names **literally**, and a job\nskipped by its own `if:` **never expands `${{ }}` in its `name:`** — it\nreports the raw template string.\n\n`_test-suite.yml` gates its six jobs with `if: inputs.run-tests` while\ninterpolating `${{ inputs.runner }}` into each name. So on a docs-only\nPR they post:\n\n```text\nPR quality — TS/Bun (ubuntu-24.04) / Static — ${{ inputs.runner }}      (skipped)\n```\n\nwhile the ruleset waits on:\n\n```text\nPR quality — TS/Bun (ubuntu-24.04) / Static — ubuntu-24.04\n```\n\nwhich is never created. Six required contexts sit on *\"Expected —\nWaiting for status to be reported\"* forever. `mergeable` reads\n`MERGEABLE`, `mergeStateStatus` reads `BLOCKED`, and nothing you do to\nthe PR can ever satisfy it.\n\nNote the redundancy the bug exposes: the runner is named twice, because\nthe caller's job name already carries it.\n\n## Why the previous fix wasn't enough\n\n`ci.yml:126` already carries a comment describing this exact failure and\na fix: always run the caller, pass `run-tests=false`, so the children\n\"always REPORT\". That was necessary but **not sufficient** — the\nchildren are still skipped *at job level*, so their names still never\nexpand. Verified on #785, which failed exactly this way with that fix in\nplace.\n\n## The fix\n\nAdds `pr-quality-required` — always runs, **static name, no\ninterpolation** — which fails if any PR gate did not succeed:\n\n```yaml\npr-quality-required:\n  name: PR quality — required gates\n  if: always() && github.event_name == 'pull_request'\n  needs: [filter, pr-quality-ts, pr-quality-rust,\n          pr-quality-cross-platform, pr-quality-duplication, pr-quality-structure]\n```\n\nOnce it is the *only* required `pr-quality-*` context, this entire class\nof bug is gone: adding, renaming, or matrix-ing a gate no longer\nrequires a ruleset edit.\n\n`skipped` counts as a pass — that is `filter` legitimately deciding a\ngate does not apply (no Rust change, docs-only diff). A gate that ran\nand failed reports `failure` and is caught.\n\n### Fail-closed, deliberately\n\nThe result list is asserted to be **exactly 6 entries** before it is\ninspected. Without that guard, a renamed job or an edited `needs:` would\nyield an empty list, `for r in $RESULTS` would not execute, and the one\njob whose entire purpose is catching failures would report green. That\nis a fail-open in the worst possible place. It now fails closed with a\nmessage naming the drift.\n\n## This PR is inert on its own\n\nThe ruleset still requires the 12 old contexts. This PR touches\n`.github/`, so `code-changed=true`, so all 12 run and report normally —\nit satisfies the *current* ruleset with no bypass. **The ruleset swap\n(12 fragile contexts → this 1) is a deliberate follow-up, applied after\nmerge**, so the repo is never left in a state where nothing can merge.\n\n## Verification\n\n| Check | Result |\n| --- | --- |\n| YAML parses; every `needs:` entry resolves to a real job | ✅ 6/6 |\n| `audit:action-sha-pins` | ✅ OK |\n| `audit:status-drift` | ✅ OK |\n| preflight-gates drift tests | ✅ 8/8 pass |\n| `typecheck` | ✅ clean |\n| `biome check packages scripts` | ✅ clean, 2876 files |\n\nThe gate script was exercised against every result shape — passing\nexactly the three that should pass:\n\n| Results | Expected | Got |\n| --- | --- | --- |\n| all `success` | pass | ✅ PASS |\n| mixed `success`/`skipped` | pass | ✅ PASS |\n| all `skipped` (docs-only PR) | pass | ✅ PASS |\n| one `failure` | fail | ✅ GATE-FAIL |\n| one `cancelled` | fail | ✅ GATE-FAIL |\n| empty list | fail | ✅ DRIFT-FAIL |\n| 3 entries | fail | ✅ DRIFT-FAIL |\n| 7 entries | fail | ✅ DRIFT-FAIL |\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-21T21:00:07+03:00",
          "tree_id": "a0738d4cb11f8fc1bf63fa93bce65576501a532e",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/a10de0b01ca1b2e295121301b085c88a68525efd"
        },
        "date": 1784657460650,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 238.5023886000021,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 242.32056864999905,
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
          "id": "9237c91063d45f5e81e9112d78988e80e0210569",
          "message": "Enable WAL on the production SQLite write handles (#789)\n\nCloses #426 (roadmap **B5**, high-priority).\n\n## Confirmed before changing anything\n\nThe issue explicitly asks for this, and it was worth doing — the finding\nwas a static code-read, so it could have been wrong. On the live 21 MB\ngateway DB:\n\n```\njournal_mode = delete\n```\n\nNot `wal`. Confirmed.\n\nThat means every handle was on SQLite's rollback journal, where readers\nand the writer block each other, the shutdown `wal_checkpoint(TRUNCATE)`\nwas a silent no-op, and `busy_timeout = 8000` was the *only* thing\nstanding between contention and an error — concurrent delta sync, query,\nand the I13 write path could stall up to 8 s before they could even\nfail.\n\n## The change\n\n`applyWritablePragmas()` in the new `db/writable-pragmas.ts` centralises\n`journal_mode = WAL` + `busy_timeout`, applied at all three production\n**writable** open sites:\n\n| Site | Handle |\n|---|---|\n| `platform/assemble.ts` | main writer |\n| `embedding/embedding-worker.ts` | embedding worker |\n| `ipc/http-server.ts` | I13 HTTP write handle |\n\nRead-only handles are deliberately untouched: `journal_mode` is a\nproperty of the database **file**, not the connection, so they cannot\nset it and do not need to — they inherit WAL once any writer has\nconverted the file. There is a test for exactly that, because it is the\nkind of thing a future reader will otherwise \"fix\" by adding a pragma to\nthe read path.\n\nIn `assemble.ts` the call is placed **before** `ensureSchema`, since\nmigrations write and this is the handle that converts the file.\n\n## It reports what SQLite adopted, not what we asked for\n\n`PRAGMA journal_mode = WAL` can be *declined* rather than raise — WAL\nneeds shared memory, so `:memory:` reports `memory`, and it is\nunavailable on some network filesystems. The helper returns the adopted\nmode so this is observable, and production deliberately does **not**\nhard-fail on it: degrading to the old blocking behaviour is worse than\nWAL but still correct, whereas refusing to start the gateway over a\nfilesystem quirk would be a worse trade. The tests assert `wal` on a\nreal file-backed handle, which is where a decline would be a genuine\nregression.\n\n## Backups: checked, not assumed\n\nWAL keeps committed data in `-wal` until checkpoint, so a **file-copy**\nbackup taken under WAL can silently lose recent commits. The issue\ndoesn't raise this, so I checked: both backup paths\n(`migrations/runner.ts` pre-migration backup and `db/snapshot.ts`) go\nthrough `vacuumAndGzip` → `VACUUM INTO`, which reads through the\nconnection and emits a self-contained file. WAL-safe. There are no raw\ncopies of `nimbus.db` anywhere in the gateway.\n\n## Regression guard — including one that didn't work\n\nA unit test of the helper proves the helper works, not that anything\ncalls it, so there is also a per-site assertion that each production\nopen site still calls it.\n\n**The first version of that guard was broken.** It asserted\n`src.toContain(\"applyWritablePragmas\")`, which is satisfied by the\nleftover `import { applyWritablePragmas }` line — so deleting the actual\ncall still passed. Caught by running the red proof rather than assuming\nit. Tightened to match the call, then re-proven:\n\n```\n(fail) production writable handles wire the pragmas > embedding/embedding-worker.ts calls applyWritablePragmas\n 7 pass, 1 fail\n```\n\nRestored: 9 pass / 0 fail.\n\n## Verification\n\n`bun test packages/gateway/src/{db,embedding,platform}/` → 572 pass / 3\nskip / 0 fail. `typecheck` clean, Biome clean,\n`audit:{invariants,boundaries,cross-platform,doc-refs,status-drift}` +\n`lint:markdown` all pass.\n\n`packages/gateway/src/ipc/` shows **1 pre-existing failure** —\n`handleConnectorAuth … google_drive` times out at 5 s under parallel\nload, passes in 238 ms alone. I verified it fails identically on\nunmodified gateway code, so it is not from this change.\n\nDocs updated to match: `architecture.md`'s honest \"not currently set\"\nstatus note is replaced, and roadmap **B5** is closed out.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-21T18:22:01Z",
          "tree_id": "e44b7bfd7ceb5549b875e817862355b0bc60ad0d",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/9237c91063d45f5e81e9112d78988e80e0210569"
        },
        "date": 1784658890955,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 294.39047039999565,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 297.42509854999736,
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
          "id": "c24364eeef534ef5037c6651af1f7b3e8bfc6697",
          "message": "Retire CODECOV_TOKEN — it never reached Codecov (#790)\n\nRefs #782. Secret already deleted; this lands the wiring and the\nmanifest.\n\n## Don't rotate it — it does nothing\n\nThe weekly monitor flagged `CODECOV_TOKEN` as stale (95d against a 90d\npolicy). The obvious response was to rotate it. That would have\nrestarted a 90-day clock on a credential with no effect.\n\n`_test-suite.yml` is a **reusable workflow**, and GitHub passes only the\nsecrets named in its `secrets:` contract:\n\n```yaml\nsecrets:\n  SONAR_TOKEN:      # ← the only one declared\n```\n\n`ci.yml` matches that — it passes `SONAR_TOKEN` and does not use\n`secrets: inherit`. So the `CODECOV_TOKEN` reference inside the reusable\nworkflow resolved to an **empty string** and never reached the action.\n\nThe run log settles it rather than leaving it as inference:\n\n```\nINPUT_TOKEN:            (empty)\nINPUT_CODECOV_TOKEN:    (empty)\nINPUT_USE_OIDC: true\nCC_FORK: false\n```\n\nagainst the action's own selection logic:\n\n```bash\nif [ \"$INPUT_USE_OIDC\" == 'true' ] && [ \"$CC_FORK\" != 'true' ]; then\n  echo \"CC_TOKEN=$CC_OIDC_TOKEN\"     # ← the branch taken\n```\n\nfollowed by `Your upload is now queued for processing`. Uploads\nauthenticate via **OIDC**, which is deliberate: `ci.yml` grants\n`id-token: write` with the comment *\"Required by `_test-suite.yml`\n(Codecov `use_oidc: true` on coverage-gates)\"*.\n\n## What changed\n\n- Both inert `token:` inputs removed from `_test-suite.yml`.\n- Manifest entry → `forbidden`, so the secret **reappearing** is a hard\nfailure rather than a shrug. Same treatment `NPM_TOKEN` got after the\nnpm OIDC migration.\n- `docs/ci-secrets.md` row and narrative updated to say retired, and\nwhy, so nobody helpfully re-adds it.\n\nOrdering was deliberate: the secret was deleted **before** this merges.\n`forbidden` + still-present is a HARD monitor failure, so flipping the\nstate first would have turned the monitor red in the gap.\nDeleted-then-merged means `optional`+absent (`\"optional, unset\"`)\nbefore, `forbidden`+absent (`\"correctly absent\"`) after — green either\nside.\n\nFork PRs are unaffected: they take Codecov's tokenless path, and the\ntoken was empty for them regardless.\n\n## One wrinkle worth flagging\n\n`audit:consumed-by` finds consumers by regexing `secrets\\.([A-Z0-9_]+)`\nover workflow text — **including comments**. My explanatory comment\noriginally wrote the `secrets.` form, which would have made the audit\nread a comment explaining that nothing uses the secret as evidence that\nsomething does. The comment now avoids the literal form and says why.\n\n## Verification\n\n`audit:{consumed-by,doc-refs,status-drift,action-sha-pins,invariants}` +\n`lint:markdown` pass. `bun test scripts/release/` → 143 pass / 6 skip /\n0 fail. Biome clean. `_test-suite.yml` re-parsed with `js-yaml`. Zero\n`secrets.CODECOV_TOKEN` references remain.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-21T21:33:33+03:00",
          "tree_id": "866bf7a6ea2009a471efff98a4acddef07dc302f",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/c24364eeef534ef5037c6651af1f7b3e8bfc6697"
        },
        "date": 1784659785440,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 318.0334547999995,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 324.5958049000001,
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
          "id": "6a209f210e654477494b0b6d9e19ac45edb6a45b",
          "message": "docs: correct the schema reference to the unified V3 `item` table (#791)\n\n`schema-reference.md` documents a table that does not exist — and that\nfiction has already cost real work.\n\n## The problem\n\nThe doc describes a table named `indexed_items` with columns\n`item_type`, `name`, `mime_type`, `size_bytes`, `created_at`,\n`parent_id`.\n\n```bash\n$ grep -rn \"indexed_items\" packages/gateway/src --include=*.ts | grep -v test\n# (no output)\n```\n\nThe real table is the unified V3 `item`\n(`index/unified-item-v3-sql.ts`):\n\n```text\nid, service, type, external_id, title, body_preview, url,\ncanonical_url, modified_at, author_id, metadata, synced_at, pinned\n```\n\nThe doc was wrong about the *legacy* shape too: the pre-V3 table was\n`items`, not `indexed_items` — see\n`UNIFIED_ITEM_V3_MIGRATE_FROM_LEGACY_SQL`, which selects from `items.`.\n\n## Why this is worth fixing now\n\nThis is not cosmetic staleness. Stage 0's original implementation plan\nwas written **from this document**, mapped `item_type` and `name`, and\nproduced a validator that **rejected all 546 rows** of a real index — a\nhard failure replacing a silent one. It was caught before merge and\ndiscarded, but only after the work was done. #785 landed the corrected\nplan and recorded the diagnosis; this PR fixes the source that caused\nit.\n\n## Changes\n\n- Replaces the `indexed_items` block with the real `item` table, its\nthree indexes, and `item_fts` (noting the triggers that maintain it).\n- Replaces the hand-maintained `item_type` comment list with a pointer\nto `@nimbus-dev/sdk` `KnownItemType`, and states plainly that the column\nis an **open enum** (`KnownItemType | (string & {})`) stored verbatim.\nThat list was a fourth copy of the very vocabulary Stage 0 exists to\nconsolidate — left in place it would simply have drifted again.\n- Records why coercion is forbidden, citing the 55%-relabelling bug #780\nfixed.\n- Fixes the matching stale table names in `architecture.md`.\n\nDeliberately **not** in scope: auditing the remaining ~40 table\ndefinitions in this file. This corrects the one that has demonstrably\ncaused damage; a full audit is a separate pass.\n\n## Verification\n\n| Gate | Result |\n| --- | --- |\n| `lint:markdown` | ✅ 0 errors, 96 files |\n| `audit:doc-refs` | ✅ 605 refs across 15 docs, all resolve |\n| `lychee` at CI scope (`--config lychee.toml 'docs/**/*.md' '*.md'`) |\n✅ 797 total, 0 errors |\n| `audit:status-drift` | ✅ OK |\n\n## Secondary purpose\n\nThis is a docs-only PR, so it is also the live proof for #788. Before\n#788, six required contexts would sit on *\"Expected — Waiting for status\nto be reported\"* forever and this PR could only merge via an\nOrganizationAdmin bypass. Expected now: `PR quality — required gates`\nreports and passes.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-21T21:33:46+03:00",
          "tree_id": "a75577c586395df4acadd0842bb1fd93a5121f70",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/6a209f210e654477494b0b6d9e19ac45edb6a45b"
        },
        "date": 1784660506398,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 317.51399165000146,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 309.58618909999205,
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
          "id": "40007ebbfc5aa5abd06e3b3345782c72f85b18fd",
          "message": "fix(deps): clear two high advisories blocking every PR (#793)\n\nTwo high advisories published **after** today's last green Security run,\nso `bun audit --audit-level high` now fails on every open PR — spotted\non #792's Dependency audit job.\n\n| Package | Have | Advisory | Fix |\n|---|---|---|---|\n| `fast-uri` | 3.1.2 | `>=3.0.0 <3.1.3` — host confusion via failed IDN\ncanonicalization\n([GHSA-4c8g-83qw-93j6](https://github.com/advisories/GHSA-4c8g-83qw-93j6))\n| **3.1.4** |\n| `linkify-it` | 5.0.1 | `<=5.0.1` — quadratic DoS in the `mailto:`\nvalidator scan loop\n([GHSA-v245-v573-v5vm](https://github.com/advisories/GHSA-v245-v573-v5vm))\n| **5.0.2** |\n\nBoth are patch bumps inside the same major, so there is no\nbreaking-change surface. `npm view` shows 4.x and 6.x exist, but neither\nis needed to clear the advisories and both would be gratuitous risk\nhere.\n\n## Why overrides rather than a dependency bump\n\nNeither is a direct dependency:\n\n- `fast-uri` arrives through `@mastra/core`,\n`@modelcontextprotocol/sdk`, `ajv`, and `@astrojs/check`. **The root\n`overrides` block already pinned it — at `3.1.2`, which is itself inside\nthe vulnerable range.** So this is a bump of an existing pin, not a new\none.\n- `linkify-it` arrives through `markdownlint-cli2 › markdown-it`.\nNothing declares it, so it needs a new override entry.\n\nThis is the same shape as #781, and the same reason Dependabot can't fix\nit on its own: it doesn't bump root overrides.\n\n## Verification\n\n`bun audit --audit-level high` → **exit 0**, no vulnerabilities reported\n(CI's exact command).\n\nRegression checks, chosen for what these packages actually feed:\n`lint:markdown` passes (it consumes `linkify-it` via `markdown-it`),\nplus `typecheck`, `biome`, `audit:doc-refs`, `audit:invariants`,\n`audit:action-sha-pins`, and the `scripts/` (516 pass) and\n`packages/gateway/src/db/` (260 pass) suites.\n\nMerging this unblocks #792 and any other open PR.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)",
          "timestamp": "2026-07-21T23:02:08+03:00",
          "tree_id": "040f5f1ea90377a09ad132aad3bfd2fff56591c4",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/40007ebbfc5aa5abd06e3b3345782c72f85b18fd"
        },
        "date": 1784664735472,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 286.19629744999986,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 286.07737224999875,
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
          "id": "c6feb351d6e904a2a03a272e97e265e0b3d05d51",
          "message": "ci: make the PR-title gate actually run (#792)\n\n## The gate has never run\n\nEvery invocation since #764 added it is `startup_failure`:\n\n```\nThe action amannn/action-semantic-pull-request@0723387… is not allowed in\nnimbus-agent/Nimbus because all actions must be from a repository owned by\nnimbus-agent, created by GitHub, verified in the GitHub Marketplace, or match\none of the patterns…\n```\n\nThis repo sets `allowed_actions: selected` with a 13-pattern allow-list\nthat doesn't include `amannn/*`. The **org** is `all` — but a repo's\nnarrower setting wins, which is why this looked fine when the App\nmigration audited org-level policy and concluded no allow-list change\nwas needed.\n\nAnd `startup_failure` is **not a required context**, so a workflow that\nnever ran was indistinguishable from one that passed.\n\n## What it cost\n\nThree unparseable PR titles reached `main` through the hole — #787,\n#789, #790. The repo squash-merges, so those became the commit subjects\nRelease Please reads. It found no user-facing commits and cut no\nrelease:\n\n```\n✔ No user facing commits found since 6514f82c - skipping\n```\n\nSo **the WAL fix in #789 has no changelog entry and is in no release**.\nThe gate's own header comment predicted this exactly: *\"a malformed one\ncan't silently break a release.\"*\n\n## The fix\n\nInline the check rather than widen the allow-list. Validating a title\nagainst a regex needs no third-party action and no checkout, so this is\nboth the smaller change and the smaller attack surface — and it leaves\nthe deliberately tight allow-list alone.\n\nTwo safety details kept from the original: `pull_request_target` so fork\nPRs are validated too, and the title passed via `env:` rather than\ninterpolated into the `run:` body, since a PR title is\nattacker-controlled text and `${{ }}` in a script body is an injection\nsink.\n\n## Verified against the real corpus\n\n| Input | Result |\n|---|---|\n| `Retire CODECOV_TOKEN — it never reached Codecov` | ❌ fail |\n| `Move App token minting off the deprecated app-id input` | ❌ fail |\n| `Enable WAL on the production SQLite write handles` | ❌ fail |\n| `fix(db): enable WAL on the production SQLite write handles` | ✅ pass\n|\n| `chore(deps)!: drop Node 20` | ✅ pass |\n| `refactor(index/migrations): split runner` | ✅ pass |\n| `feat:no space after colon` | ❌ fail |\n| `nope(scope): unknown type` | ❌ fail |\n\nThe allowed type list is derived from `git log` on `main`, not invented:\nfeat, fix, chore, docs, ci, build, test, refactor, perf, style, revert.\n\n`audit:action-sha-pins` passes; YAML re-parsed with `js-yaml`.\n\n## This PR cannot self-test — correcting an earlier claim\n\nI first wrote that this PR's own title would be the first passing run of\nthe gate. **That is wrong.** `pull_request_target` always executes the\nworkflow file from the **base** branch, so this PR is still validated by\n`main`'s broken copy — and its run is, correctly, another\n`startup_failure`.\n\nThe gate only starts working **after this merges**. The regex evidence\nabove is local (`bash` against the real title corpus); the first genuine\nend-to-end proof will be the next PR opened after merge, which should\nshow a `Validate PR title` check for the first time in this repo's\nhistory. Worth confirming on that PR rather than assuming.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)",
          "timestamp": "2026-07-21T20:27:54Z",
          "tree_id": "9e6d2063175b6d16c729ba1a128c3bc26521bddb",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/c6feb351d6e904a2a03a272e97e265e0b3d05d51"
        },
        "date": 1784666209479,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 257.9305223499956,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 265.1625038500035,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "306811640+nimbus-release-bot[bot]@users.noreply.github.com",
            "name": "nimbus-release-bot[bot]",
            "username": "nimbus-release-bot[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "27f0b2ebcbc66db6cc47d0fbd850c452c367b504",
          "message": "chore: release main (#794)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n<details><summary>0.23.2</summary>\n\n##\n[0.23.2](https://github.com/nimbus-agent/Nimbus/compare/v0.23.1...v0.23.2)\n(2026-07-21)\n\n\n### Bug Fixes\n\n* **deps:** clear two high advisories blocking every PR\n([#793](https://github.com/nimbus-agent/Nimbus/issues/793))\n([40007eb](https://github.com/nimbus-agent/Nimbus/commit/40007ebbfc5aa5abd06e3b3345782c72f85b18fd))\n</details>\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\nCo-authored-by: nimbus-release-bot[bot] <306811640+nimbus-release-bot[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-22T05:21:02+03:00",
          "tree_id": "c42bf50552194c078f06fea1a08e82fd56081b0a",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/27f0b2ebcbc66db6cc47d0fbd850c452c367b504"
        },
        "date": 1784687578411,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 303.3665053499979,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 305.2437471500081,
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
          "id": "864bb8e0eb626725ee0c917acd7b49026f12336a",
          "message": "fix(deps): clear two high advisories blocking every PR (sharp, svgo) (#796)\n\nTwo high advisories published **after** #793's last green Security run,\nso `bun audit --audit-level high` fails on every open PR again —\nincluding #795, #792's successor work, and this. Spotted on #795's\nDependency audit + Trivy jobs.\n\n| Package | Have | Advisory | Fix |\n|---|---|---|---|\n| `sharp` | 0.34.5 | `<0.35.0` — inherited libvips CVEs\n(33327/33328/35590/35591,\n[GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj))\n| **0.35.3** |\n| `svgo` | 4.0.x | `>=4.0.0 <4.0.2` — removeScripts leaves some\nexecutable scripts intact\n([GHSA-2p49-hgcm-8545](https://github.com/advisories/GHSA-2p49-hgcm-8545))\n| **4.0.2** |\n\nBoth within the same major — no breaking surface.\n\n## Why overrides\n\n- `sharp` — the root `overrides` block already pinned it, at `0.34.5`,\nwhich is inside the vulnerable range. Bump the pin.\n- `svgo` — transitive, nothing declares it, so a new override entry.\n\nSame shape as #793 / #781, and the same reason Dependabot can't do it:\nit doesn't bump root overrides.\n\n## Verification\n\n`bun audit --audit-level high` → **exit 0**. `typecheck` clean, `biome`\nclean, `audit:js-licenses` passes (both packages affect the license set\n— 1166 packages, all allow-listed). `sharp` is transitive with no direct\nimport in source, so no code path changes.\n\nMerging unblocks #795 and every other open PR.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)",
          "timestamp": "2026-07-22T06:55:24+03:00",
          "tree_id": "5a28218d445afd058fe0796e12fa688c12668303",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/864bb8e0eb626725ee0c917acd7b49026f12336a"
        },
        "date": 1784693253274,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 305.63841655000107,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 304.4422231000055,
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
          "id": "88db17f708798a03a704ac37c410bb3105409364",
          "message": "fix(db): enable WAL on production SQLite handles (changelog backfill for #789) (#795)\n\nEmpty commit. #789 enabled WAL on the three production writable SQLite\nhandles, but its squash-merge subject was not a Conventional Commit, so\nRelease Please read it as non-user-facing and cut no changelog entry.\n\nThe WAL code is on main and ships in the next release's binaries\nregardless — this only gives the fix the CHANGELOG line it should have\nhad. The lint gate that would have caught the malformed title never ran\nuntil #792 fixed it.\n\nNo code change. Verify with `git show` — the diff is empty.",
          "timestamp": "2026-07-22T04:18:29Z",
          "tree_id": "5a28218d445afd058fe0796e12fa688c12668303",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/88db17f708798a03a704ac37c410bb3105409364"
        },
        "date": 1784694446949,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 235.69023029999408,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 237.52863095000285,
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
          "id": "f2110a96a586d465f611553fb23577334503a16b",
          "message": "chore(secrets): org-scope the App secrets + retire RELEASE_PAT/PACKAGE_MANAGER_PAT (#797)\n\nFollows a live consolidation of the App credentials from per-repo\nsecrets into **org secrets**, so the private key rotates in one place\ninstead of three.\n\n## What changed live (already done)\n\n| Secret | Before | After |\n|---|---|---|\n| `RELEASE_BOT_CLIENT_ID` | repo secret on Nimbus + nimbus-client |\n**org secret, visibility all** — it's public (`GET /apps/{slug}`), so\nall-repo exposure costs nothing |\n| `RELEASE_BOT_PRIVATE_KEY` | repo secret on Nimbus + nimbus-client |\n**org secret, visibility SELECTED** → Nimbus + nimbus-client +\nnimbus-sdk |\n\nThe private key is deliberately **not** `visibility: all`: with it you\ncan mint `contents`/`PRs`/`issues:write` tokens for any repo the App is\ninstalled on, so the blast radius is kept to the three repos that\nactually mint tokens. As a bonus, nimbus-sdk (in the scope) no longer\nneeds its own secret set — only the App install.\n\nRepo-level copies deleted; org secrets take over (repo secrets override\norg, so there was no breakage window).\n\n## Why this PR exists\n\nChanging the secret topology made the weekly monitor go red **within one\ndispatch** — `RELEASE_BOT_{CLIENT_ID,PRIVATE_KEY}` showed `missing` at\nrepo scope and `undocumented` at org scope. That's the credential\nmanifest (#783) doing exactly its job. This PR updates the registry to\nmatch reality: both entries move to `scope: \"org\"` with the correct\n`expectedVisibility`, and the location counts shift **ORG 2→4 / Nimbus\n25→23**.\n\n## Verified\n\n- `secret-health`'s **\"Mint release-bot token\" step succeeds** reading\nthe org secret — proven live, so all three repos resolve it.\n- `bun test scripts/release/` 143 pass / 6 skip / 0 fail;\n`audit:consumed-by` OK; standalone `tsc --strict` exit 0; biome clean.\n\nAfter this merges, the next monitor run should show both entries `ok`\nagain and clear the four red rows.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)",
          "timestamp": "2026-07-22T17:50:46+03:00",
          "tree_id": "b98559713748c3ad4fb3e14152254b7c07f22e60",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/f2110a96a586d465f611553fb23577334503a16b"
        },
        "date": 1784732613048,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 297.6576737999949,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 299.38418309999327,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "306811640+nimbus-release-bot[bot]@users.noreply.github.com",
            "name": "nimbus-release-bot[bot]",
            "username": "nimbus-release-bot[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "2491a5d76dca4b19c96bdaca488ff20ec6a36755",
          "message": "chore: release main (#798)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n<details><summary>0.24.0</summary>\n\n##\n[0.24.0](https://github.com/nimbus-agent/Nimbus/compare/v0.23.2...v0.24.0)\n(2026-07-22)\n\n\n### Features\n\n* **apple:** iCloud Mail + Calendar connector (Phase 6 Slice 9-E)\n([#711](https://github.com/nimbus-agent/Nimbus/issues/711))\n([58c69e0](https://github.com/nimbus-agent/Nimbus/commit/58c69e09fba285b03b94eed60f69751103da1bf3))\n* **audit:** promote D12 to binary; new DB_RUN_EXEC_ALLOW_LIST (T6 PR 4)\n([10b9876](https://github.com/nimbus-agent/Nimbus/commit/10b9876a4fbd1e1a4e1c16b7bc0b3c425697a305))\n* **auth+connectors:** OAuth provider registry (PR-1) + Tier-1 connector\nbatch + Zoom planning\n([#447](https://github.com/nimbus-agent/Nimbus/issues/447))\n([9d71a62](https://github.com/nimbus-agent/Nimbus/commit/9d71a62fa5058475b8482469e82b76b8eb05615c))\n* **cli:** add `nimbus --version` / `-v` / `version`\n([#753](https://github.com/nimbus-agent/Nimbus/issues/753))\n([5eec16c](https://github.com/nimbus-agent/Nimbus/commit/5eec16c118e94667ddccc0ebb0e122f0bc31f136))\n* **client:** add searchRanked to NimbusClient + MockClient\n([#742](https://github.com/nimbus-agent/Nimbus/issues/742))\n([a378884](https://github.com/nimbus-agent/Nimbus/commit/a378884360c50b55f1d76bcd61492c1594327b86))\n* **client:** expose egress ledger reads on NimbusClient + MockClient\n([#751](https://github.com/nimbus-agent/Nimbus/issues/751))\n([31c05b2](https://github.com/nimbus-agent/Nimbus/commit/31c05b25c17b858d14980455ad8800fbfb99e875))\n* **cli:** nimbus clip list + clip delete (+ clip-scoped tags)\n([#760](https://github.com/nimbus-agent/Nimbus/issues/760))\n([65e8857](https://github.com/nimbus-agent/Nimbus/commit/65e8857a27dff10ac85f9c3e63c2fd2a21628bb2))\n* **cli:** nimbus mcp-server — expose local index to editor AIs over MCP\n([#480](https://github.com/nimbus-agent/Nimbus/issues/480))\n([003e32d](https://github.com/nimbus-agent/Nimbus/commit/003e32dd0c85ba6224acb27d0fc5f5c2e73e013c))\n* **cli:** print the gateway URL from `nimbus clip pair`\n([#761](https://github.com/nimbus-agent/Nimbus/issues/761))\n([b72f96d](https://github.com/nimbus-agent/Nimbus/commit/b72f96dcb862f54084927d8542edce9e0e795ad7))\n* **clips:** web clipper gateway — POST /v1/clips, pairing auth,\ninvariant I30 (Phase 6 Slice 9)\n([#718](https://github.com/nimbus-agent/Nimbus/issues/718))\n([17d325e](https://github.com/nimbus-agent/Nimbus/commit/17d325e7a55729772623438fa4a914c762d810ea))\n* **cli:** T6 PR 3 — nimbus index reembed\n([46f1e8c](https://github.com/nimbus-agent/Nimbus/commit/46f1e8c4e3cfc2f43d2abe8e2a2b44f60e9d292b))\n* **config:** [pagerduty] TOML block — max_pages_per_sync +\nseverity_p1_aliases\n([62eeb39](https://github.com/nimbus-agent/Nimbus/commit/62eeb3960dda99955c0a46c51928ae9e79db3a67))\n* **config:** add severityP1Aliases field to ServiceConfig\n([5dfca63](https://github.com/nimbus-agent/Nimbus/commit/5dfca63e0e6554598957977ed5e4f26ff2939c13))\n* **config:** thread [pagerduty].severity_p1_aliases into ServiceConfig\n([18e1612](https://github.com/nimbus-agent/Nimbus/commit/18e161291b4bae3acb8ee2e2e83bb7f0967d752a))\n* **connectors:** declare permissions.network for all 30 first-party\nconnectors (T2 PR 1)\n([9a5bf7a](https://github.com/nimbus-agent/Nimbus/commit/9a5bf7af56ac8cb0e75a8db885c65611cfc42739))\n* **connectors:** Mendeley connector (Phase 6 Slice 9 — sub-project A)\n([#631](https://github.com/nimbus-agent/Nimbus/issues/631))\n([1ddeae5](https://github.com/nimbus-agent/Nimbus/commit/1ddeae52ca6301d5992a915250a9189b4c61f3a4))\n* **connectors:** Phase 6 Slice 7 Wave 7b — team-shared credentials for\nwarehouse/BI connectors\n([#617](https://github.com/nimbus-agent/Nimbus/issues/617))\n([e5d1665](https://github.com/nimbus-agent/Nimbus/commit/e5d1665ef7f98203ea9f72bfe28ee2e32e602eeb))\n* **connectors:** Phase 6 Slice 7 Wave 7c — HITL-gated WRITE actions for\nwarehouse/BI connectors\n([#632](https://github.com/nimbus-agent/Nimbus/issues/632))\n([822cebc](https://github.com/nimbus-agent/Nimbus/commit/822cebc39ad17cd1b6d1605f0a1296ac1d8cb68f))\n* **coverage-floor:** baseline format + diff helpers\n([2d909cc](https://github.com/nimbus-agent/Nimbus/commit/2d909cc68c56df5322af89c8a3f89a345b070b4c))\n* **coverage-floor:** exclusion registry + matcher\n([25d7ead](https://github.com/nimbus-agent/Nimbus/commit/25d7eadd035387c6cec081d5ad73a80cab69a668))\n* **coverage-floor:** exclusion-parity check\n([f2527ef](https://github.com/nimbus-agent/Nimbus/commit/f2527efc5e8edc2b1894c42da04293f1ae907190))\n* **coverage-floor:** orchestration entry point\n([1e34574](https://github.com/nimbus-agent/Nimbus/commit/1e34574adace51054c99878337148ac4ed6efd6d))\n* **coverage-floor:** per-file 80% line-coverage gate (Phase 0)\n([5b958d5](https://github.com/nimbus-agent/Nimbus/commit/5b958d56bb1da4b56ab6c7ba4e52581554715a8d))\n* **coverage-floor:** pure lcov parser\n([f78e592](https://github.com/nimbus-agent/Nimbus/commit/f78e59279fc2c9ad356925d575d70f91524be144))\n* **coverage-floor:** scope walker to bun-tested packages; add\nbuild-lcov.sh\n([6d0dba5](https://github.com/nimbus-agent/Nimbus/commit/6d0dba548deb6136e90e9f636db34c82e3ef81d8))\n* **coverage:** branch-coverage foundation (true-coverage Sub-project A)\n([#530](https://github.com/nimbus-agent/Nimbus/issues/530))\n([49768bb](https://github.com/nimbus-agent/Nimbus/commit/49768bb99eb074810602da74763b84e7e38d9b09))\n* **db:** add dbStmtRun wrapper for prepared-statement writes (T6 PR 4)\n([3dfd2ea](https://github.com/nimbus-agent/Nimbus/commit/3dfd2ea81c51f4ee235421f747b6783f1a134763))\n* **db:** T6 PR 4 — route all writes through dbRun/dbExec/dbStmtRun\n(I14)\n([639dd64](https://github.com/nimbus-agent/Nimbus/commit/639dd64321aea479e527d48286a2b476a96e30db))\n* **db:** widen dbRun to return RunResult (T6 PR 4)\n([4511a5b](https://github.com/nimbus-agent/Nimbus/commit/4511a5bd7f81d14f740192589da8d5bf992d6068))\n* **diag/cli:** three-surface degraded label for sandbox posture (T2 PR\n1)\n([c74acbc](https://github.com/nimbus-agent/Nimbus/commit/c74acbc4d80a130069d194ab709b6f8462497262))\n* **egress:** Egress Ledger & nimbus prove (S1 Local Brain —\nI29/D22/V44) ([#698](https://github.com/nimbus-agent/Nimbus/issues/698))\n([34fb594](https://github.com/nimbus-agent/Nimbus/commit/34fb5942fd536981f58405a8e4904529addd40a3))\n* **extensions:** hard-disable pre-T2 extensions until reinstall (T2 PR\n1)\n([2e67dcc](https://github.com/nimbus-agent/Nimbus/commit/2e67dcce686e1c3e1320a6bcfcf225c7b8fdb724))\n* **extensions:** object-form permissions schema + legacy array\nnormalizer (T2 PR 1)\n([649d573](https://github.com/nimbus-agent/Nimbus/commit/649d5736de026fcbc11cd7095e7436b05d6b6d6c))\n* **gateway:** route ask through local LLM providers\n([#479](https://github.com/nimbus-agent/Nimbus/issues/479))\n([b49e7ae](https://github.com/nimbus-agent/Nimbus/commit/b49e7aeb8d55d4f98e3a128f089321852d8e5efc))\n* **gateway:** wire [pagerduty].max_pages_per_sync at bootstrap\n([ca7d65b](https://github.com/nimbus-agent/Nimbus/commit/ca7d65bee2ee6b3b02282186fe4ecdbb592773d9))\n* **gateway:** wire Updater factory in assemblePlatformServices (S6-F1)\n([5fd38bd](https://github.com/nimbus-agent/Nimbus/commit/5fd38bd73005441e75b02f0a9bff01cef4f36a76))\n* **invariants:** wire I14 — typed dbRun/dbExec/dbStmtRun (T6 PR 4)\n([eda338e](https://github.com/nimbus-agent/Nimbus/commit/eda338ea50ccae4e66e064a97ccee35ced0eebb7))\n* **ipc:** T6 PR 3 — index.reembed long-running RPC\n([26c1075](https://github.com/nimbus-agent/Nimbus/commit/26c1075eac8727a6d50ff0df183e79f7a0f9245a))\n* **lazy-mesh:** wrap MCP ServerSpec through sandbox-wrapper script (T2\nPR 1, I15)\n([95b46a0](https://github.com/nimbus-agent/Nimbus/commit/95b46a0ebebde45aa5483f70dbea4d1980533c19))\n* **pagerduty:** walk all incident pages per sync\n([e4a0720](https://github.com/nimbus-agent/Nimbus/commit/e4a0720d4764111bcb31873782cf18df2b35c82f))\n* **pagerduty:** write metadata.urgency on indexed incidents\n([596b47a](https://github.com/nimbus-agent/Nimbus/commit/596b47add2799557d93e464bcbb86e154c6b5ab1))\n* **perf:** hybrid perf-CI strategy — gate stable surfaces, trend the\nnoisy ones ([#642](https://github.com/nimbus-agent/Nimbus/issues/642))\n([abfdfbe](https://github.com/nimbus-agent/Nimbus/commit/abfdfbe8c76ec59dcd3337317bc0c3241775a2db))\n* **perf:** wire up the sustained-drift detector (daily _perf-drift.yml)\n([#659](https://github.com/nimbus-agent/Nimbus/issues/659))\n([e433ec7](https://github.com/nimbus-agent/Nimbus/commit/e433ec71c9651f07cb8109e848a97b4923a8d95b))\n* Phase 6 Slice 1 — Federation Core\n([#519](https://github.com/nimbus-agent/Nimbus/issues/519))\n([bb92960](https://github.com/nimbus-agent/Nimbus/commit/bb92960cb4e29c2290c98821d867566f0de00b03))\n* Phase 6 Slice 1 — real two-gateway over-the-wire federation\n([#521](https://github.com/nimbus-agent/Nimbus/issues/521))\n([8f61f16](https://github.com/nimbus-agent/Nimbus/commit/8f61f16e2a85fd2c813c61cba3c21be2907440b9))\n* Phase 6 Slice 3 — Identity & Access (SSO/OIDC + SCIM)\n([#523](https://github.com/nimbus-agent/Nimbus/issues/523))\n([9af95d6](https://github.com/nimbus-agent/Nimbus/commit/9af95d68ce6426984361351fad823c42120bb876))\n* **preflight:** urgency-gap diagnostic probe\n([80ef006](https://github.com/nimbus-agent/Nimbus/commit/80ef00637bfa36b5cc1540704618daed30c7a378))\n* **preflight:** widen active-P1 filter to severity_p1_aliases\n([742740d](https://github.com/nimbus-agent/Nimbus/commit/742740db5c8c560ce030a15f4c4f70bc1680cd82))\n* **release-health:** loud release-asset gate + weekly secret-health\nmonitor ([#768](https://github.com/nimbus-agent/Nimbus/issues/768))\n([2417189](https://github.com/nimbus-agent/Nimbus/commit/241718962e707e4f236b457dc8bd2ff21a255c4c))\n* **sandbox-helper:** enforce-and-exec mode + RFC 1123 + post-unshare\nseccomp (T2 PR 1)\n([c5c7fea](https://github.com/nimbus-agent/Nimbus/commit/c5c7fea29573b480e89c9847acff171126654997))\n* **sandbox-helper:** scaffold + --check-caps mode (T2 PR 1)\n([80a84d0](https://github.com/nimbus-agent/Nimbus/commit/80a84d0d15ba13ab327d3d7ed22effee393dbc7b))\n* **sandbox:** default Linux seccomp BPF filter (T2 PR 1)\n([92d821f](https://github.com/nimbus-agent/Nimbus/commit/92d821fc121554cf294baa30338053e228f82eb7))\n* **sandbox:** Linux SandboxRunner — bwrap + nimbus-sandbox-helper (T2\nPR 1)\n([6ea6c6a](https://github.com/nimbus-agent/Nimbus/commit/6ea6c6a6bf7e0b14617f8f38306dce5fda731e6f))\n* **sandbox:** macOS SandboxRunner — sandbox-exec with SBPL profile (T2\nPR 1)\n([be8b001](https://github.com/nimbus-agent/Nimbus/commit/be8b001e7c4a99faf7aacca4fa2d34ac5577885b))\n* **sandbox:** SandboxRunner PAL interface + dispatcher (T2 PR 1)\n([d4ec092](https://github.com/nimbus-agent/Nimbus/commit/d4ec092388870d2ae096d52fdfffdfaa1f1962fa))\n* **sandbox:** T2 PR 1 — Sandbox PAL + 3-OS isolation + I15\n([e668244](https://github.com/nimbus-agent/Nimbus/commit/e668244a42858d810a4e82c777c5d9565ddc3a10))\n* **sandbox:** Windows AppContainer orphan-reap helper (T2 PR 1)\n([01f16aa](https://github.com/nimbus-agent/Nimbus/commit/01f16aaec89300b53be6c9ca1215d31e3c7e27dd))\n* **sandbox:** Windows SandboxRunner — AppContainer profile + capability\nsurface (T2 PR 1)\n([1efb7e8](https://github.com/nimbus-agent/Nimbus/commit/1efb7e8d1cbc4e5842b52d9bf4393c55cf7acd84))\n* **sdk:** runSandboxContractTests + probe (T2 PR 1)\n([633b464](https://github.com/nimbus-agent/Nimbus/commit/633b464336aa8196550d8db9748858317bb385dd))\n* **search:** T6 PR 3 — wire dual-search through hybrid options\n([4570841](https://github.com/nimbus-agent/Nimbus/commit/4570841d5b1f2607203ae8286e5c5be6fac9e3e2))\n* **share:** Phase 6 Slice 8a — Share foundation (I27 share-gate,\nverify-share, V41)\n([#661](https://github.com/nimbus-agent/Nimbus/issues/661))\n([c4f12d3](https://github.com/nimbus-agent/Nimbus/commit/c4f12d382be6e8601858605089b664f7c5604e0c))\n* **share:** Phase 6 Slice 8b — recipe (--as-recipe declarative DAG, V42\nparams) ([#679](https://github.com/nimbus-agent/Nimbus/issues/679))\n([97573bd](https://github.com/nimbus-agent/Nimbus/commit/97573bdc2423d8687a974ccc08ad4d5f26da15df))\n* **share:** Phase 6 Slice 8c — replay (verify-share --replay,\nrecipe-runner)\n([#684](https://github.com/nimbus-agent/Nimbus/issues/684))\n([8535f4d](https://github.com/nimbus-agent/Nimbus/commit/8535f4db75a68806806813131e7fb0a34327fba7))\n* **share:** Phase 6 Slice 8d — sovereign-mesh referral (forwarding,\nprovenance, V43 inbox)\n([#687](https://github.com/nimbus-agent/Nimbus/issues/687))\n([18131cf](https://github.com/nimbus-agent/Nimbus/commit/18131cf9d9499614d20b10421e5c511086942618))\n* **slice9-w1:** HITL-gated GitOps + ML writes (ArgoCD/Flux/MLflow),\ngeneralize I26\n([#700](https://github.com/nimbus-agent/Nimbus/issues/700))\n([bccab8b](https://github.com/nimbus-agent/Nimbus/commit/bccab8bf9e8f34fabed47afff3619bf6dc6802ff))\n* **slice9:** Workday connector (read-only) —\nworkers/time-off/job-postings + RaaS reports\n([#709](https://github.com/nimbus-agent/Nimbus/issues/709))\n([2646918](https://github.com/nimbus-agent/Nimbus/commit/2646918570aaa52e1477765fe169df3433bdba25))\n* tool_call_log retention policy ([audit].tool_call_log_retention_days)\n([#511](https://github.com/nimbus-agent/Nimbus/issues/511))\n([83165b1](https://github.com/nimbus-agent/Nimbus/commit/83165b1764faf08ab1066abaea143a0ceba3b3b3))\n* **updater:** createUpdaterFromConfig factory with disabled +\nunsupported-platform paths\n([423fe23](https://github.com/nimbus-agent/Nimbus/commit/423fe23677615f8153ca1bd9106c4230edde7a5b))\n* **updater:** S6-F1 production wiring\n([a1c69b9](https://github.com/nimbus-agent/Nimbus/commit/a1c69b9e46d9fc0ec6c3a570b695b8f7ff53b06f))\n* **zoom:** PR-3 cloud recordings + AI transcripts (Walk B)\n([#458](https://github.com/nimbus-agent/Nimbus/issues/458))\n([21aefdd](https://github.com/nimbus-agent/Nimbus/commit/21aefdd96f8f4e6bcefa730f7f4c7d97d3ef58d8))\n\n\n### Bug Fixes\n\n* add repository field to client, sdk, and root for npm provenance\n([#633](https://github.com/nimbus-agent/Nimbus/issues/633))\n([f0e7f07](https://github.com/nimbus-agent/Nimbus/commit/f0e7f075d755c8b4a006911b513979f289fa192f))\n* **audit:** close credential-redaction boundary escapes + property lock\n(True Coverage C1)\n([#596](https://github.com/nimbus-agent/Nimbus/issues/596))\n([f974c02](https://github.com/nimbus-agent/Nimbus/commit/f974c02a33b3e29ada53319c1db36643588a5188))\n* **ci:** build @nimbus-dev/sdk before client in node-compat job\n([#640](https://github.com/nimbus-agent/Nimbus/issues/640))\n([76b9898](https://github.com/nimbus-agent/Nimbus/commit/76b98988821e11bc279f9dea8bf6ad76d99582f6))\n* **ci:** export GNUPGHOME in linux-repo publish so signing finds the\nkey ([#605](https://github.com/nimbus-agent/Nimbus/issues/605))\n([e5f5154](https://github.com/nimbus-agent/Nimbus/commit/e5f515460d95a47e237086967e5876d22ef77525))\n* **ci:** gitleaks allowlist synthetic TestFlight PEM fixture\n([#670](https://github.com/nimbus-agent/Nimbus/issues/670))\n([3da4609](https://github.com/nimbus-agent/Nimbus/commit/3da460991b487b68fad2ea1febc9c32a148db807))\n* **ci:** guard gateway daily-log async destination against unhandled\nflush errors ([#615](https://github.com/nimbus-agent/Nimbus/issues/615))\n([7a9f62c](https://github.com/nimbus-agent/Nimbus/commit/7a9f62cf733ae965e88a6614c2516990fd90de45))\n* **ci:** harden Linux apt-get against flaky Microsoft repos +\nintegration-test timeout\n([#613](https://github.com/nimbus-agent/Nimbus/issues/613))\n([209fc96](https://github.com/nimbus-agent/Nimbus/commit/209fc966b8a86286f9535a8134b6238d16d1f313))\n* **ci:** linux-repo publish verifies only the downloaded .deb/.rpm\n([#603](https://github.com/nimbus-agent/Nimbus/issues/603))\n([4d63cad](https://github.com/nimbus-agent/Nimbus/commit/4d63cada3a55d1e3bdeb2f3c1c7e434a05457f3c))\n* **ci:** publish package managers after Release uploads assets (kill\nthe asset-race)\n([#658](https://github.com/nimbus-agent/Nimbus/issues/658))\n([f5f246f](https://github.com/nimbus-agent/Nimbus/commit/f5f246fb9713a023ef8c1eaf8f09ffbac6804b80))\n* **ci:** restore lint + license gates after Biome 2.5.0 / ovsx 1.0.1\nbumps ([#656](https://github.com/nimbus-agent/Nimbus/issues/656))\n([76e4a88](https://github.com/nimbus-agent/Nimbus/commit/76e4a88999ddef1915b6e6c74b3c705281edf891))\n* **ci:** session-memory getRecentTurns must not require sqlite-vec\n(share e2e I27)\n([#664](https://github.com/nimbus-agent/Nimbus/issues/664))\n([0870362](https://github.com/nimbus-agent/Nimbus/commit/0870362301fecd1c6742c799ece667edf1d8f671))\n* **ci:** set --timeout 60000 on the integration test step\n([#610](https://github.com/nimbus-agent/Nimbus/issues/610))\n([69986c1](https://github.com/nimbus-agent/Nimbus/commit/69986c1a5eeb2b1cba00f97b3f243912d92f100f))\n* **ci:** unblock cross-platform test suite + SonarCloud reliability\ngate\n([c75dbab](https://github.com/nimbus-agent/Nimbus/commit/c75dbab037d98b9c51df38b0ea7769089c52418a))\n* **ci:** unhang the Windows gateway cross-platform leg (was 30-min\n\"cancelled\") ([#591](https://github.com/nimbus-agent/Nimbus/issues/591))\n([605e46a](https://github.com/nimbus-agent/Nimbus/commit/605e46ac2a5716b7213dc4d588e623ea7729a331))\n* **client:** bundle sdk via the \"bun\" condition so the publish build\nresolves ([#638](https://github.com/nimbus-agent/Nimbus/issues/638))\n([c1f36d2](https://github.com/nimbus-agent/Nimbus/commit/c1f36d2e1cee0f02430aab5f48e517a9882ccf4d))\n* **client:** pin internal deps on publish so the tarball installs\nstandalone ([#716](https://github.com/nimbus-agent/Nimbus/issues/716))\n([1ab1b5c](https://github.com/nimbus-agent/Nimbus/commit/1ab1b5c7912948394c51142519b0d2698447caf6))\n* **client:** widen node-compat askStream streamId poll to\nSTREAM_TIMEOUT_MS\n([#624](https://github.com/nimbus-agent/Nimbus/issues/624))\n([e86014f](https://github.com/nimbus-agent/Nimbus/commit/e86014f3ae3b2a865a0e589eda2eb997b33ca727))\n* **cli:** T6 PR 3 — drop the word \"any\" from index reembed help\n([676cbd2](https://github.com/nimbus-agent/Nimbus/commit/676cbd219f797bfd00851b3cbaf861a1ca7a6e0c))\n* **coverage-floor:** computeUpdatedBaseline seeds new below-floor\nentries\n([2ba425a](https://github.com/nimbus-agent/Nimbus/commit/2ba425accbcc19e2ebf38938180ea027d4ed5af0))\n* **coverage-floor:** drop unused\n[@ts-expect-error](https://github.com/ts-expect-error) in freeze test\n([bc26019](https://github.com/nimbus-agent/Nimbus/commit/bc26019dfa7ded9a1de2368f887b816309ccdb45))\n* **coverage-floor:** rename unused find() param to satisfy biome\n([b63c40d](https://github.com/nimbus-agent/Nimbus/commit/b63c40dae65f2e664c11e38705f6958e9aa73a44))\n* **coverage-floor:** Sonar new-code coverage — mirror local exemptions\n+ lift sandbox-contract (PR\n[#329](https://github.com/nimbus-agent/Nimbus/issues/329))\n([51b101e](https://github.com/nimbus-agent/Nimbus/commit/51b101e0c9c20462bbd7005bb863efe546647bb6))\n* **db:** enable WAL on production SQLite handles (changelog backfill\nfor [#789](https://github.com/nimbus-agent/Nimbus/issues/789))\n([#795](https://github.com/nimbus-agent/Nimbus/issues/795))\n([88db17f](https://github.com/nimbus-agent/Nimbus/commit/88db17f708798a03a704ac37c410bb3105409364))\n* **db:** T6 PR 3 — guard V30 no-vec branch against db.exec(\"\") on macOS\n([4130138](https://github.com/nimbus-agent/Nimbus/commit/4130138fedc9f06294aa88d8972ce7dcfd5fddf5))\n* **deps:** clear high audit advisories (vite/protobufjs/form-data)\n([#644](https://github.com/nimbus-agent/Nimbus/issues/644))\n([24169d9](https://github.com/nimbus-agent/Nimbus/commit/24169d9928b9317bd0ed19982eaad9f0b2e5e925))\n* **deps:** clear the critical + high advisories blocking every PR\n([#781](https://github.com/nimbus-agent/Nimbus/issues/781))\n([4d723b8](https://github.com/nimbus-agent/Nimbus/commit/4d723b80bad63d96016f5aeb379b465844f82f5e))\n* **deps:** clear two high advisories blocking every PR\n([#793](https://github.com/nimbus-agent/Nimbus/issues/793))\n([40007eb](https://github.com/nimbus-agent/Nimbus/commit/40007ebbfc5aa5abd06e3b3345782c72f85b18fd))\n* **deps:** clear two high advisories blocking every PR (sharp, svgo)\n([#796](https://github.com/nimbus-agent/Nimbus/issues/796))\n([864bb8e](https://github.com/nimbus-agent/Nimbus/commit/864bb8e0eb626725ee0c917acd7b49026f12336a))\n* **extensions:** locale-aware sort in PreT2DisabledRegistry + new-code\ncoverage push (PR\n[#329](https://github.com/nimbus-agent/Nimbus/issues/329))\n([afdc62e](https://github.com/nimbus-agent/Nimbus/commit/afdc62e8e8bb12d38567724a0a6393c25f8db1c6))\n* **extensions:** reject trailing-hyphen + empty hostnames per RFC 1123\n(T2 PR 1 code review)\n([c5966b3](https://github.com/nimbus-agent/Nimbus/commit/c5966b3be793331de61c2d5cd6da060c68d3b401))\n* **gateway:** report real version in `nimbus status` + stamp Windows\nexe metadata ([#762](https://github.com/nimbus-agent/Nimbus/issues/762))\n([d337167](https://github.com/nimbus-agent/Nimbus/commit/d337167e6e461645526525167ed6acf77396f4e2))\n* **gitleaks:** rename fake API-key fixtures to defuse generic-api-key\nrule\n([fddf720](https://github.com/nimbus-agent/Nimbus/commit/fddf7209f7064cbd8aed8b9982a27f5ad3c8363d))\n* **llm:** report fallback provider in `llm status`, fix reason labels,\nreuse IPC helper\n([#513](https://github.com/nimbus-agent/Nimbus/issues/513))\n([4bfb99a](https://github.com/nimbus-agent/Nimbus/commit/4bfb99ac019ca71f013f81ae6fb5f9e813e1c475))\n* **perf:** gate S1 + S11-b latency on Linux only to stop main bench\ndelta-flapping\n([#623](https://github.com/nimbus-agent/Nimbus/issues/623))\n([52eff98](https://github.com/nimbus-agent/Nimbus/commit/52eff98bfe540d1edbb72de78db1e51487697df6))\n* **perf:** gate S11-a latency on Linux only (completes the spawn-jitter\nset) ([#628](https://github.com/nimbus-agent/Nimbus/issues/628))\n([f107082](https://github.com/nimbus-agent/Nimbus/commit/f107082655a3f031776b7717d8509328d24111b3))\n* **perf:** median baseline over recent main runs to stop bench\ndelta-flapping\n([#618](https://github.com/nimbus-agent/Nimbus/issues/618))\n([e6c34c2](https://github.com/nimbus-agent/Nimbus/commit/e6c34c2023b9e31f74d0bc1e98a9bd6aee4eef8c))\n* **sandbox-helper:** freeaddrinfo leak on inet_ntop error +\nAUDIT_ARCH_X86_64 seccomp guard (T2 PR 1 code review)\n([f8c91a2](https://github.com/nimbus-agent/Nimbus/commit/f8c91a298d84130511400c7216ea11d60d73616a))\n* **sandbox-helper:** guard _GNU_SOURCE redefine to unblock -Werror\nbuild ([#346](https://github.com/nimbus-agent/Nimbus/issues/346))\n([6f0e231](https://github.com/nimbus-agent/Nimbus/commit/6f0e231ea39052fc28b28638525442f2dc11a478))\n* **sandbox:** allow epoll_wait + clone3, block io_uring (T2 PR 1 code\nreview)\n([dc63c7c](https://github.com/nimbus-agent/Nimbus/commit/dc63c7c1122fbcf5640ecc1e3c9a79961bb9ea78))\n* **sandbox:** AUDIT_ARCH_X86_64 guard in connector seccomp filter (T2\nPR 1 review)\n([20fb86c](https://github.com/nimbus-agent/Nimbus/commit/20fb86c6a4ff0bde9c00409bac69366ed71c3c8e))\n* **sandbox:** match platform/index.ts dispatcher idiom — node:os + .ts\nextensions (T2 PR 1 code review)\n([cd9886d](https://github.com/nimbus-agent/Nimbus/commit/cd9886da39224528b8a51d227aa4aa40ac8c734f))\n* **sandbox:** mkdtempSync for seccomp BPF tmpfile (CodeQL\njs/insecure-temporary-file)\n([7804539](https://github.com/nimbus-agent/Nimbus/commit/78045391701e8738fdcb180e0b398aa0eed68303))\n* **sdk:** drop .ts extension on testing/index re-export (T2 PR 1 CI)\n([51b218c](https://github.com/nimbus-agent/Nimbus/commit/51b218c981fec8189829fca29181c6fc0d729a30))\n* **sdk:** point published entry points at dist so the package is usable\n([#637](https://github.com/nimbus-agent/Nimbus/issues/637))\n([155b127](https://github.com/nimbus-agent/Nimbus/commit/155b127f9577d8f19a4e822ba5ee3714b2a5badd))\n* **security:** connector nextLink SSRF + email header CR/LF injection\nhardening ([#694](https://github.com/nimbus-agent/Nimbus/issues/694))\n([6257da8](https://github.com/nimbus-agent/Nimbus/commit/6257da812df50705eaf62ba78d4fb20fa4693df0))\n* **security:** T6 PR 3 — block index.reembed* over LAN (I5)\n([4f0d6c4](https://github.com/nimbus-agent/Nimbus/commit/4f0d6c4946e058c3ab14ac4b206504a519bbdef1))\n* **sonar:** clear last 2 S7735 negated-condition smells\n([#683](https://github.com/nimbus-agent/Nimbus/issues/683))\n([e6cbfff](https://github.com/nimbus-agent/Nimbus/commit/e6cbfff9b4fdb173b3f650e8f1f98c494b985c43))\n* **sonar:** clear the board — S3776/S8786/S7735 sweep +\nwarehouse-mapper dedup\n([#743](https://github.com/nimbus-agent/Nimbus/issues/743))\n([2401330](https://github.com/nimbus-agent/Nimbus/commit/2401330932fa941bdf584c87bca88ea69167fa0c))\n* **sonar:** clear the SonarCloud board — S5906 sweep + long-tail code\nsmells ([#731](https://github.com/nimbus-agent/Nimbus/issues/731))\n([3a87e54](https://github.com/nimbus-agent/Nimbus/commit/3a87e54a7335c1be87ecb582673183b242b97c88))\n* stop relabelling 55% of indexed items, and return NimbusItem from\nindex.queryItems\n([#780](https://github.com/nimbus-agent/Nimbus/issues/780))\n([008615d](https://github.com/nimbus-agent/Nimbus/commit/008615da3ba74fec7aabf935abc57b7eabda90bb))\n* **test:** add --timeout 30000 to all coverage shards (Windows flake)\n([#681](https://github.com/nimbus-agent/Nimbus/issues/681))\n([93270ca](https://github.com/nimbus-agent/Nimbus/commit/93270cad4eae8c14330ca67c09947d692ecc18e8))\n* **test:** remove real-resolver connector-spawns twin that reds the\ncombined run ([#675](https://github.com/nimbus-agent/Nimbus/issues/675))\n([fde6718](https://github.com/nimbus-agent/Nimbus/commit/fde67189a6bca3e2289f522eb981d1560d5de768))\n* **test:** resolve LanServer gate test flake\n([#705](https://github.com/nimbus-agent/Nimbus/issues/705))\n([2e757e8](https://github.com/nimbus-agent/Nimbus/commit/2e757e8143045963ba7c78cb58bcb4806071fdd9))\n* **vscode-extension:** scope tsconfig to types:[node] (fixes CI\ntypecheck) ([#446](https://github.com/nimbus-agent/Nimbus/issues/446))\n([78484a6](https://github.com/nimbus-agent/Nimbus/commit/78484a6e67bef930040afd4cc5b69d5f153aae0c))\n\n\n### Performance Improvements\n\n* Phase 2 (Bencher) — advisory trend ingest (soak alongside\ngithub-action-benchmark)\n([#666](https://github.com/nimbus-agent/Nimbus/issues/666))\n([5993765](https://github.com/nimbus-agent/Nimbus/commit/5993765bb97b1058676e7ecde34b112d4ed33c87))\n* **slo:** widen S1 noise floor 200→300 ms to absorb cold-start jitter\n([#608](https://github.com/nimbus-agent/Nimbus/issues/608))\n([b49c799](https://github.com/nimbus-agent/Nimbus/commit/b49c799af4e59ea93b2fff71d3eae2cb7c2e9caf))\n</details>\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\nCo-authored-by: nimbus-release-bot[bot] <306811640+nimbus-release-bot[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-22T15:11:34Z",
          "tree_id": "2d9dc89e7b589eb7972e238a48e4bf347ee74a25",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/2491a5d76dca4b19c96bdaca488ff20ec6a36755"
        },
        "date": 1784733818358,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 278.829036899998,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 282.4519546500054,
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
          "id": "c1a2077d073a89dad9792667700bf5bdffa6ad72",
          "message": "chore(secrets): retire RELEASE_PLEASE_PAT — the last release PAT is gone (#800)\n\nDeleted org-wide 2026-07-22. **The last long-lived credential on the\nrelease path.**\n\n## All four consumers now mint from the App\n\n| Repo | Migrated | Proven |\n|---|---|---|\n| Nimbus | #787 | ✅ |\n| nimbus-client | #8 | ✅ |\n| nimbus-sdk | #16 | ✅ live mint |\n| nimbus-vscode | #42 | ✅ live mint on main |\n\nEach shows `Mint release-bot token: success`. Zero live\n`secrets.RELEASE_PLEASE_PAT` references remain across all four repos.\n\n## The manifest earned its keep\n\nI nearly deleted this token after proving nimbus-sdk. The manifest's\n`consumedBy` listed **nimbus-vscode** as a fourth consumer — a check\nconfirmed it still used the PAT, and deleting then would have broken its\nreleases. That's the credential registry (#783) doing exactly what it's\nfor.\n\nFlipped `required → forbidden` (deletion first, so `forbidden` + absent\nreads \"correctly absent\" rather than the hard failure `forbidden` +\npresent would give).\n\n## The release credential surface is now fully App-based\n\n`RELEASE_PAT`, `PACKAGE_MANAGER_PAT`, `RELEASE_BOT_APP_ID`, and\n`RELEASE_PLEASE_PAT` are all **deleted and forbidden**. The App\ncredentials live as **org secrets** (client-id all, private-key scoped\nto the 4 release repos). Only `WINGET_PAT` remains — it forks\n`microsoft/winget-pkgs`, which the App cannot reach.\n\n## Verification\n\n`bun test scripts/release/` 11/11 registry + suite green;\n`audit:consumed-by` OK; standalone `tsc --strict` exit 0.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)",
          "timestamp": "2026-07-22T18:36:31+03:00",
          "tree_id": "c6fdd0cd8b039d4a94cbf646d891970b6501840c",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/c1a2077d073a89dad9792667700bf5bdffa6ad72"
        },
        "date": 1784735209356,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 196.47722350000004,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 198.0245463999974,
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
          "id": "f310d2a679ca7edc1f73c6abde808acd0c851931",
          "message": "feat(gateway): research briefs — staged HTTP reasoning surface with citation-validated reports (#799)\n\n## What this is\n\nThe gateway side of **Nimbus research briefs**. The `nimbus-web-clipper`\nextension lets a user write a question (\"compare MV3 service worker\nlifecycles across Chrome and Firefox\"), select some open tabs, and ship\nthe extracted text here. The gateway reasons across those pages — plus\nthe user's already-indexed clips — and returns a citation-validated\nreport of **findings, conflicts, and gaps**. All judgment lives in the\ngateway; the extension extracts, feeds, polls, and renders.\n\nSpec: `docs/superpowers/specs/2026-07-21-research-briefs-design.md` ·\nPlan: `docs/superpowers/plans/2026-07-21-research-briefs-gateway.md`\n\n## Surface\n\nFour bearer-authed loopback write routes on the I13 surface\n(`WRITE_ROUTE_ALLOWLIST` **8 → 12**) plus one bearer-gated read route:\n\n```\nPOST /v1/briefs                 → { id, status:\"collecting\", expected }\nPOST /v1/briefs/{id}/sources    → { accepted, received, expected }   (idempotent per canonical URL)\nPOST /v1/briefs/{id}/run        → { status:\"running\" }               (idempotent, fire-and-forget synthesis)\nPOST /v1/briefs/{id}/save       → { itemId }                         (nimbus:research_brief item)\nGET  /v1/briefs/{id}            → { status, report?, failureReason? }\n```\n\nStaged collection, because eleven articles is ~500 KB and an MV3 worker\nwon't survive one long request through synthesis.\n\n## Design decisions worth a reviewer's eye\n\n- **The model judges; the server verifies.** Unlike the built-in agents\n(which build a deterministic brief and let the LLM only re-render it),\nbriefs let the model reason — then constrain it structurally. Citations\nare opaque server-issued tokens (`S1`, `C2`); an unknown ref is dropped,\na zero-ref finding is dropped, a conflict needs ≥2 distinct refs, and a\nquote must be a verbatim (normalized) substring of the cited body or\nit's stripped. Source bodies enter the prompt through `wrapToolOutput`\n(**I11**) — the first load-bearing use of the envelope outside\n`agents/`.\n- **Run state is in-memory only.** Source bodies never touch disk; a\nrestart drops everything. That makes \"a brief is a question, not a save\"\nstructural, not a promise — the same argument I30 makes for the pairing\nwindow. Lazy expiry, 30-min TTL, hard caps (3 concurrent runs / 20\nsources / 256 KB per source / 4 MB per run, all counting body **+ title\n+ url**).\n- **Concurrency cap is `503 briefs_busy` with no `Retry-After`**,\ndeliberately not a 429 — a concurrency delta from run expiry is up to\n1800 s, which the client clamps to 120 s and retries into a wall.\n- **`[briefs].prefer_local` is honored independently of `[llm]`.**\nSource-text egress is the most privacy-sensitive thing here, so briefs\nprefer a local model even when the general ask-routing prefers remote,\nfalling back only when no local provider exists. When synthesis does run\nremote, a mandatory, unsuppressable disclosure gap says so.\n- **Default-off.** `[briefs].enabled` defaults false; the seam is absent\nand every route 404s (`briefs_disabled` + hint). `nimbus clip status`\nreports the enable-state.\n\n## Invariants & safety\n\nNo new invariant, no schema migration. Reuses **I6** (loopback), **I10**\n(constant-time token compare), **I11** (tool-output envelope), **I13**\n(allowlist + audit-on-rejection — every 4xx incl. 404/410/409 audits),\n**I14** (bound-param SQL). **I30** (clipper token minting) is untouched\n— briefs consume the token, never mint. A whole-branch review traced the\ntrust boundary end-to-end and confirmed no model- or source-controlled\ninput reaches the report unvalidated or escapes the I11 envelope. E2E\nleak test proves the bearer token, source body, and source URL appear in\nno response and no `audit_log` row.\n\n## Testing\n\nTDD throughout. New `packages/gateway/src/briefs/` subsystem (~11\nmodules) each unit-tested; a 10-case E2E drives the real HTTP server +\nreal SQLite + a stub LLM through the full staged round trip, caps, auth,\nand the leak proof. 717 tests pass across all touched suites; gateway +\ncli `tsc` clean; biome, `audit:doc-refs`, `audit:readme-cli` green.\n\n> ⚠️ **One gate unverified locally:** `audit:coverage-floor`\n(Linux-authoritative, istanbul shards) could not run in the dev\nenvironment (Docker daemon down). Every new file was coverage-reviewed\nindividually and `brief-test-server.ts` is coverage-excluded, but **CI\nmust confirm the floor is green** before merge. `origin/main` also\nadvanced during the build, so this relies on CI's post-push run against\ncurrent main.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **New Features**\n* Added opt-in research briefs for creating runs, submitting captured\nsources, generating citation-validated reports, checking status, and\nsaving completed reports.\n* Added support for local or remote synthesis, with disclosures when\nsource content leaves the device.\n* Added run limits, expiration handling, duplicate-source protection,\nand clear errors for unavailable or oversized requests.\n* Added `nimbus clip status` visibility for whether research briefs are\nenabled.\n\n* **Documentation**\n* Documented the research briefs workflow, configuration, status\nbehavior, and release details.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-22T18:53:56+03:00",
          "tree_id": "fef3d881e8daebb0f721fc9354970df8a61038f3",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/f310d2a679ca7edc1f73c6abde808acd0c851931"
        },
        "date": 1784736343087,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 312.7436258999969,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 316.83922359999667,
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
          "id": "825df03e6157ebfa2299984115aa68be24539fe1",
          "message": "fix: clear the SonarCloud board (15), the 6 astro XSS advisories, and the stale release line (#801)\n\nThree separable commits: Sonar board → 0, the open Dependabot\nadvisories, and a doc refresh.\n\n## 1. SonarCloud: 15 → 0\nMost landed with the research-briefs surface (#799), which merged after\nthe last cleanup pass.\n\n- **S3735 ×2** drop the `void` operator in the in-memory test vault\n(block bodies)\n- **S3776** `dispatchWriteRoute`'\\''s `route.kind` if-chain → `switch`\n(17 → under 15; a switch costs +1 total rather than +1 per branch)\n- **S6353 ×2** `[A-Za-z0-9_]` → `\\w` in the two brief-id route regexes\n- **S7781** `replaceAll`; **S4624** hoisted nested template literal;\n**S7755** `gaps.at(-1)`; **S5906 ×7** `not.toContain` / `toHaveLength`\n\nNo behavior change.\n\n## 2. Dependabot: the 6 astro XSS advisories\nGHSA-f48w-9m4c-m7f5, GHSA-7pw4-f3q4-r2p2, GHSA-4g3v-8h47-v7g6 (×2\nmanifests each). The highest patched requirement is **astro 7.1.0**, so\nthis is a coordinated major bump:\n\n- `astro` ^6.4.8 → ^7.1.3 (root + `packages/docs`)\n- `@astrojs/starlight` ^0.39.3 → ^0.41.4 (its peer is astro ^7.0.2)\n- `starlight-links-validator` 0.24.0 → 0.25.2\n- **drop the root `vite` override.** astro 7 needs vite ^8; the pin\nforced 7.3.5 into it and broke the build outright. `packages/ui` keeps\nits own `^7.3.5`, and both now resolve side by side (7.3.5 + 8.1.5) with\nno vulnerable version present.\n\nVerified with a real `docs:build`: **55 pages, all internal links\nvalid**, and `packages/ui` still typechecks on vite 7.\n\n> Note: this had to be built outside the repo tree. In a nested\n`.claude/worktrees/` checkout the SSR bundle resolves `neotraverse` up\ninto the parent repo'\\''s astro-6 `node_modules` and dies with `Export\nnamed '\\''forEach'\\'' not found`. That is a worktree-nesting artifact,\nnot an astro 7 problem — a clean checkout builds green.\n\n**Not fixed — the 7th alert (glib, RUSTSEC-2024-0429).** It is\nunreachable: `gtk 0.18.2` requires `glib ^0.18` and is pinned by tauri,\nso `cargo update -p glib --precise 0.20.0` fails outright. This is\nalready a documented, deliberately-accepted ignore in\n`src-tauri/deny.toml` (\"revisit when Tauri bumps gtk-rs to 0.20+\"); I\nre-verified that rationale rather than taking it on faith.\n\n## 3. Docs\n`CLAUDE.md`/`GEMINI.md` still claimed `v0.22.0` — four releases stale.\n`audit:status-drift` does not cover that line, so it drifted silently.\n\n## Verification\n`preflight:fast` **PASSED** (all 19 gates). Full `preflight` reports 15\ntest failures — **`origin/main` reports exactly the same `14381 pass /\n131 skip / 15 fail` in the same environment**, so this branch adds none.\nThey are Windows/clean-room artifacts (missing `gen-test-key.sh`\nfixture, a WSL config error, and the documented `mock.module`\ncontamination in the combined CLI run). Gateway `tsc` clean; briefs 157,\nhttp 136, security-invariants 92 green.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-22T18:30:27Z",
          "tree_id": "70527aa16f56e44ee51c0df00937a5486525fdae",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/825df03e6157ebfa2299984115aa68be24539fe1"
        },
        "date": 1784745808417,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 303.684352800003,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 304.9779607999968,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "306811640+nimbus-release-bot[bot]@users.noreply.github.com",
            "name": "nimbus-release-bot[bot]",
            "username": "nimbus-release-bot[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "ba851439eb12f67c02a9075423c293edf864784e",
          "message": "chore: release main (#802)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n<details><summary>0.25.0</summary>\n\n##\n[0.25.0](https://github.com/nimbus-agent/Nimbus/compare/v0.24.0...v0.25.0)\n(2026-07-22)\n\n\n### Features\n\n* **gateway:** research briefs — staged HTTP reasoning surface with\ncitation-validated reports\n([#799](https://github.com/nimbus-agent/Nimbus/issues/799))\n([f310d2a](https://github.com/nimbus-agent/Nimbus/commit/f310d2a679ca7edc1f73c6abde808acd0c851931))\n\n\n### Bug Fixes\n\n* clear the SonarCloud board (15), the 6 astro XSS advisories, and the\nstale release line\n([#801](https://github.com/nimbus-agent/Nimbus/issues/801))\n([825df03](https://github.com/nimbus-agent/Nimbus/commit/825df03e6157ebfa2299984115aa68be24539fe1))\n</details>\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\nCo-authored-by: nimbus-release-bot[bot] <306811640+nimbus-release-bot[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-22T18:50:37Z",
          "tree_id": "fbf33285bc7954f92d20153fdb0a512ae72c94fd",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/ba851439eb12f67c02a9075423c293edf864784e"
        },
        "date": 1784746935709,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 298.82235909999764,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 301.2331752999991,
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
          "id": "bdb79f858de97f7e68d519de62c2c32d496866ff",
          "message": "fix(secrets): VSCE_PAT deadline is its expiry (2026-09-20), not the decommission (#803)\n\nResolves the open question in\n[nimbus-vscode#34](https://github.com/nimbus-agent/nimbus-vscode/issues/34)\n— and fixes a monitoring gap it exposed.\n\n## The finding\nChecked the token in the Azure DevOps portal (2026-07-22): it is\n**org-scoped to `asafgolombek`**, not global.\n\nSo the 2026-12-01 *global*-PAT decommission **does not apply to us at\nall.** The entire escalation path in #34 — Azure subscription, Entra\nuser-assigned managed identity, federated credential, `vsce publish\n--azure-credential` — is unnecessary. (Consistent with the secret having\nbeen set 2026-06-22, three months after global PAT creation was blocked\non 2026-03-15.)\n\n## The real deadline, and why the monitor was silent about it\nWhat actually bites is the token'\\''s **own expiry: 2026-09-20** —\npublishing breaks then unless it is regenerated. That is routine here\n*because* it is org-scoped.\n\nThe registry recorded only the decommission date, and with\n`HARD_DEADLINE_LEAD_DAYS = 90` that date was still 132 days out — so the\nweekly health monitor reported this credential as plain `ok`, and would\nhave gone on doing so until the token died mid-release.\n\nVerified both ways against the **real** registry entry at today'\\''s\ndate:\n\n| `hardDeadline` | monitor row |\n| --- | --- |\n| **2026-09-20** (this PR) | `deadline` — \"hard deadline 2026-09-20 **in\n60d**\" |\n| 2026-12-01 (before) | `ok` — \"secret last set 29d ago\" |\n\nSo this flips the row from silent to warning, with 60 days of lead. No\nnew mechanism was needed — `hardDeadline` already drives exactly this;\nit was simply pointed at a date that was not the binding one.\n\n## Changes\n- `credential-registry.ts` — `hardDeadline` → `2026-09-20`; note records\nthe confirmed scope, why the decommission is not applicable, and why the\nexpiry is the binding date.\n- `credential-registry.test.ts` — test renamed and pinned to the expiry,\nplus an explicit assertion that it is **not** `2026-12-01`, so the real\ndeadline cannot silently regress back to the later one.\n- `docs/ci-secrets.md` — the ⚠️ row said global PATs \"cannot be\nregenerated since 2026-03-15\", which read as applying to us. Corrected.\n\n## Verification\n81 credential tests green · biome clean · `lint:markdown` 0 errors ·\n`audit:doc-refs` 606 refs resolve.\n\n(The 4 `ps1:` failures in `bun test scripts/release/` are pre-existing\nand environmental — a missing `gen-test-key.sh` fixture; `origin/main`\nfails them identically here.)\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-22T19:12:08Z",
          "tree_id": "22902eb319dc1737667a10d2fbe0501e1693e8d4",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/bdb79f858de97f7e68d519de62c2c32d496866ff"
        },
        "date": 1784748140462,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 281.2453165000006,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 278.8543202999921,
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
          "id": "91b4f581d13f795210952a663f83a9bf70cd6dae",
          "message": "refactor(agents): consume the SDK's brief types; add the fixture generator (#804)\n\nStage 1 Wave 1a, PR 3 of 3 — the piece that actually deletes the\nduplication.\nRequires `@nimbus-dev/sdk@1.5.0` (nimbus-sdk#20 + #21), **published**,\nso the lockfile resolves.\n\n## Why\n\nThe eight composed agent-brief types and their eight runtime guards were\nwritten **twice** in this\nrepo — `gateway/src/agents/_lib/findings.ts` and\n`cli/src/types/agents.ts` — and exported by neither\nthe SDK nor anything else. `@nimbus-dev/client` needed them to expose\nthe `agents.*` namespace, so\nwithout this they would have become a third hand-maintained copy.\n\n1.5.0 promoted them. This consumes them and deletes both local copies.\n\n## What changes\n\n- **`gateway/src/agents/_lib/findings.ts`** — re-exports from the SDK.\nIts public surface is\npreserved exactly: all 26 previously-importable symbols still import,\nplus `ExpertiseRank` (which\n  the file used internally but never exported).\n- **`gateway/src/federation/types.ts`** — `ExpertiseRank`'s canonical\nhome is now the SDK, because\n`GhostBrief` depends on it and it lived in this gateway-internal module.\nNote it needs an\n`import type` **plus** a local re-export, not a bare `export … from`:\nthis module *uses* the name,\nand a bare re-export doesn't bind it locally. Only `tsc` catches that —\n`bun test` passes either\n  way.\n- **`cli/src/types/agents.ts`** — same treatment. `GhostContextItem` and\n`ConflictCollision` are kept\nas aliases of the SDK's `FederatedItemLite` / `ConflictFinding`\n(identical shapes) so existing CLI\n  imports keep resolving.\n- **`scripts/gen-agent-brief-fixtures.ts`** — new. Drives the real\n`dispatchAgentsRpc` →\n`emitBriefWithSynthesis` path against an in-memory index and dumps the\neight `briefReady` payloads.\nIts output is the client's conformance fixture, so that gate is\ngenerated from gateway code rather\n  than hand-written.\n\n## Behaviour-preserving\n\nThe gateway's agent suite is **169/169, identical to the pre-change\nbaseline** captured before any\nsource was touched. CLI: 1766 pass / 8 pre-existing failures in\n`update.test.ts` (`mock.module`\ncontamination), the same 8 before and after, verified by re-running both\nrevisions.\n\nOne real behaviour change, deliberate: the CLI's `isExpertBrief` /\n`isImpactBrief` /\n`isCatchupBrief` were built **without** `requireQuery`, while all eight\ngateway guards use it. The\nCLI now consumes the strict SDK guards. No CLI test exercises a\nquery-less brief, so the green suite\nisn't evidence on its own — the safety argument is that `expert.ts`,\n`impact.ts` and `catchup.ts`\neach have exactly one brief-construction site and all unconditionally\nset `query`. Residual exposure\nis version skew, whose failure mode is an explicit \"Malformed payload\"\nerror, not silent corruption.\n\n## Verification\n\n`typecheck` clean across the workspace · gateway agents 169/169 · CLI\nagent types 14/14 ·\n`biome check packages scripts` 2905 files clean · `lint:markdown` 0\nerrors across 102 files.\n\nTwo notes on running gates locally in a worktree under `.claude/`:\n\n- `bun run lint` passes `.`, which `biome.json` ignores via\n`!**/.claude`, so it exits 1 with \"paths\nprovided but ignored\". Use explicit paths — `biome check packages\nscripts`.\n- `bun test packages/gateway/src/federation/` hangs on Windows on `main`\nand this branch alike\n(isolated to `consent-broker.test.ts` / `preflight-runner.test.ts`;\nneither imports\n`federation/types.ts`, so this change carries no risk there). Verified\nper-file instead; CI/Linux\n  is authoritative.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-23T09:00:35+03:00",
          "tree_id": "981807636837e3dc40275cdf0d69b8e04f118b52",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/91b4f581d13f795210952a663f83a9bf70cd6dae"
        },
        "date": 1784787233476,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 339.393312850003,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 341.5814185000112,
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
          "id": "1b002b516180b8ba039a5279d8db50d03e7e9227",
          "message": "fix(agents): report why a janitor resourceRef was rejected (#805)\n\n## The bug\n\n`isValidResourceRef` enforces **two** independent rules — a minimum\nlength and an allowed character\nset — but the janitor gap only ever mentioned the length:\n\n```text\nresourceRef too short or malformed (min 4 chars)\n```\n\nSo `repo:acme/payments#branch/wip` — **29 characters**, rejected because\n`#` is not in\n`/^[A-Za-z0-9_:.\\-/]+$/` — was reported as too short. Anyone debugging\nthat goes looking for a length\nproblem that doesn't exist, on a ref that is plainly long enough.\n\nFound while generating agent-brief fixtures from real gateway output:\nthe janitor brief came back\nwith that gap for a ref that was obviously not short.\n\n## The fix\n\n`describeInvalidResourceRef(ref)` returns the specific reason or `null`,\nand the janitor surfaces it:\n\n- too short → `resourceRef must be at least 4 characters (got 2)`\n- bad character → `resourceRef may contain only letters, digits, and _ :\n. - /`\n\nValidation behaviour is unchanged — exactly the same refs are accepted\nand rejected.\n`isValidResourceRef` is untouched for its other callers, and a test\nasserts the two functions always\nagree.\n\n## Tests\n\nBoth rejection paths, in both the probe and the agent:\n\n- the length case asserts the message names the **actual** length (`got\n2`);\n- the long-ref/bad-character case asserts the message says character set\n**and explicitly does not\nmention length** — the assertion that would have caught the original\nbug.\n\nGateway agents: 170/170. `biome check packages scripts` clean.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-23T09:01:39+03:00",
          "tree_id": "9863a7450ee46b9c29d02a571dfa720e44ebe0ca",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/1b002b516180b8ba039a5279d8db50d03e7e9227"
        },
        "date": 1784787949379,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 317.29723124999543,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 319.12570119999657,
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
          "id": "a3b190a321f1f19c1a9603239d6e7043fbfc7854",
          "message": "build(scripts): typecheck scripts/ + fail on agents.* brief-shape drift (#806)\n\n## The gap\n\n`typecheck` is `bun run --filter '*' --sequential typecheck` — it runs\nper **workspace package**.\n`scripts/` is not one, so its **151 TypeScript files have never been\ntypechecked by any gate**.\n\nThat is not a hypothetical exposure. Several are load-bearing:\n\n- `scripts/structure-audit/*` — the checks that gate CI, including the\nsecurity-invariant static\n  complement.\n- `scripts/gen-agent-brief-fixtures.ts` — generates the conformance\nfixture `@nimbus-dev/client`\n  validates its `agents.*` wire contract against.\n\nSame class as the two `tsconfig` fixes just landed in `nimbus-sdk` and\n`nimbus-client`: a gate that\nlooks green because it isn't looking.\n\n## What it found\n\nTurning it on surfaced **42 pre-existing errors across 17 files** — all\nreal strictness violations,\nnone suppressed:\n\n| | |\n| --- | --- |\n| 12 | `TS18048` possibly `undefined` |\n| 9 | `TS4111` index-signature access (`process.env.FOO` → `[\"FOO\"]`) |\n| 6 | `TS2532` object possibly `undefined` |\n| 5 + 4 + 3 | `TS2345` / `TS2379` / `TS2322` assignability, incl.\n`exactOptionalPropertyTypes` |\n| 2 | `TS1375` top-level `await` in a non-module |\n| 1 | `TS2769` no matching overload |\n\nFixed with **no `any`, no `!` assertions, and no suppression comments**\n— `noNonNullAssertion` is an\nerror in this repo, so each possibly-undefined case is narrowed properly\nrather than asserted away.\n\n`gen-agent-brief-fixtures.ts` was already clean, which is reassuring\ngiven what depends on it.\n\n## One deliberate behaviour change\n\n`scripts/release/credential-audit.test.ts` — the `live()` helper\nunconditionally set\n`repo: \"Nimbus\"`, and the org-scope tests overrode it with `repo:\nundefined`, which\n`exactOptionalPropertyTypes` rejects.\n\nNaively dropping the override would have left org-scoped secrets\ncarrying a stale `repo`, silently\nbreaking the entry/live match those two tests exist to assert. So the\ndefault is now conditional on\nscope: org-scoped secrets never carry a `repo`, which is the point of\nthe field being optional.\n\nThat is the only control-flow change in the diff; everything else is\ntype-level.\n\n## Wired into the gate\n\n`scripts/tsconfig.json` extends `tsconfig.base.json` and is added to the\nroot `typecheck`, so this\ncannot silently regress. It deliberately does **not** inherit the base\n`**/*.test.ts` exclude — that\nwould leave the audit tests both untypechecked and orphaned in editors,\nwhich is the exact defect\nbeing fixed.\n\n## Verification\n\n`bunx tsc -p scripts/tsconfig.json` → **0 errors** · `bun run typecheck`\n(whole monorepo) → exit 0 ·\n`bunx biome check scripts packages` → clean, 2906 files · `bun test\nscripts` → **536 pass / 0 fail**.\n\nAnd because type-fixing CI gate scripts risks breaking them at runtime,\nthe audits were spot-run\ndirectly rather than assumed: `audit:doc-refs`, `audit:status-drift`,\n`audit:invariants`,\n`audit:openapi-drift`, `audit:action-sha-pins`, `audit:js-licenses` —\nall exit 0.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n- **Bug Fixes**\n- Improved robustness across comment/source cleanup and structure/audit\nchecks by safely handling missing or malformed values.\n- Enhanced Windows environment and process termination/path handling for\nmore consistent tooling behavior.\n\n- **Tests**\n- Added snapshot-based drift protection for the agent brief “wire\ncontract,” strengthening validation of the brief payload shape.\n- Strengthened release, API, and OpenAPI/structure assertions to fail\nfast when expected issues are missing.\n\n- **Chores**\n- Expanded TypeScript typechecking to also validate the script tooling,\nnot just the main packages.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-23T10:41:54Z",
          "tree_id": "8f3088da3ff057efc870a51b732213d860b72738",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/a3b190a321f1f19c1a9603239d6e7043fbfc7854"
        },
        "date": 1784803782112,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 180.67509349999926,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 182.03194339999936,
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
          "id": "f3aa6ce6334da9363fe8611a726826e4f9f1e02b",
          "message": "docs(ecosystem): record Stage 1 complete — client surface 15 → 52 methods (#807)\n\nStage 1 of `docs/ecosystem-roadmap.md` is complete. All eight waves\nshipped across `@nimbus-dev/client` 0.7.0 → 0.11.0 in eight days;\n`agents.*`, `connector.*` and `workflow.*` — three namespaces the\ndiagnosis named as built-but-unreachable — are now reachable from npm.\n\n**Docs-only. No gateway code changed.**\n\n## What this PR does\n\nPer the document's own update rule (\"when a client method ships, move it\nfrom Stage 1's table to a shipped list and note the client version that\ncarries it\"):\n\n- Stage 1's wave table becomes a **shipped list** with the client\nversion and PR per wave.\n- The **diagnosis section keeps its original numbers** behind a\nsuperseded banner rather than being rewritten. It is the argument that\njustified the sequencing; editing it after the fact would erase the\nevidence for why the work was ordered this way.\n- **Open decision 4** (client throughput ~1.25 methods/month gates every\nstage) is *answered*, not deleted: 37 methods in 8 days. That figure\nmeasured attention, not difficulty — so Stages 2 and 3 should not be\nsequenced as though throughput-bound.\n- Two contract facts are written down because both were found by reading\ngateway source, not docs: `agents.*` resolve from a `<agent>.briefReady`\n**notification** (subscribe-before-call), and HITL-gated connector\nmethods **do not deny uniformly** (`addMcp`/`remove` resolve\n`{status:\"rejected\"}`; `reindex({depth:\"full\"})` rejects).\n- Three **gateway-side gaps** found during the client work are recorded\nas deliberately open, since each is a gateway change rather than a\nclient one.\n\n`docs/CHANGELOG.md` gets the matching dated entry, which also picks up\nthe gateway-side brief-shape drift gate (#806) that landed with this\nworkstream and was not yet logged.\n\n## Verification\n\n- `markdownlint-cli2` — 0 errors (the TOC anchor was checked; that is\nwhy the heading carries no status emoji)\n- `lychee --offline` — 0 errors across both files\n- `audit:doc-refs` — 606 refs across 15 docs, all resolve\n- `audit:status-drift` — OK\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-23T14:58:51+03:00",
          "tree_id": "4e6c45262d5dfc09a0c9a98bd1dd5534999ae8a8",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/f3aa6ce6334da9363fe8611a726826e4f9f1e02b"
        },
        "date": 1784808667647,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 322.1471976999986,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 322.0625382999911,
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
          "id": "cc2b07fb65e49bacc8cc208d8b84986527d2ae65",
          "message": "fix(ipc): the connector HITL prompts named params no caller sends (#811)\n\nCloses #808.\n\nBoth HITL-gated `connector.*` methods built their consent payload from\nparameter keys that no caller sends, so every field was `undefined`:\n\n| Method | Gate read | Handler actually reads |\n| --- | --- | --- |\n| `connector.addMcp` | `command`, `args` | `serviceId`, `commandLine`\n(derives command/args itself via `parseUserMcpCommandLine`) |\n| `connector.remove` | `service` | `serviceId` (via\n`requireRegisteredSchedulerServiceId`) |\n\n## Why this is more than a blank prompt\n\n`JSON.stringify` drops `undefined`, so `\"payload\":{}` reached all three\nsinks `executor.gate()` feeds:\n\n- the owner's consent prompt\n- the audit row (`auditPayload` → `redactAuditPayload({ action })`)\n- the BLAKE3-chained I29 egress-ledger row (`buildEgressEntry({ action,\n... })`)\n\nFor the one action class that causes the gateway to **spawn an arbitrary\nlocal process**, the prompt showed nothing about which binary was being\nauthorized — and `nimbus prove` over a window containing an `addMcp`\ncould attest that *an* addMcp was approved but not *which command*,\nwhich is most of what the proof is for.\n\n**I2/I3 were never violated.** The gate fires, on `action.type`, for\nboth methods; the frozen-set membership check is correct. What failed is\nthe *informed* half of human-in-the-loop. A gate the owner cannot read\nis a gate the owner learns to click through.\n\n## The fix\n\nEach payload now names the keys its handler consumes. `addMcp` shows the\nraw `commandLine` rather than a re-derived `command` + `args` — it is\nwhat the caller asked for, so the prompt cannot disagree with what the\nhandler goes on to parse.\n\n## Why it survived until now\n\nThe test stub recorded only `{ type }` from the gate call and threw the\npayload away, so every existing assertion looked past the one field that\nwas empty. It now records the full action.\n\nBoth new guards assert through a **JSON round-trip**, because that is\nthe transform the audit and egress sinks apply: a payload of\nall-`undefined` fields passes a naive `toEqual({})` and is precisely the\nbug.\n\n**Red-proven** — against the unfixed source, 3 failures (the two new\nguards plus the strengthened existing assertion), each reporting a\nreceived payload of `{}`.\n\n## Verification\n\n- `bun test packages/gateway/src/ipc/connector-rpc-routing.test.ts` — 15\npass\n- `bun test packages/gateway/src/engine/ packages/gateway/src/egress/\npackages/gateway/src/security-invariants.test.ts` — 501 pass, 0 fail\n(the gate's three consumers)\n- `bun run typecheck` — clean; `bunx biome check packages scripts` —\n2909 files, clean\n- `scripts/structure-audit/check-nimbus-invariants.ts` — exit 0\n\n**Unrelated pre-existing failure, not introduced here:**\n`handleConnectorAuth > google_drive reaches its provider arm...` times\nout in the combined `bun test packages/gateway/src/ipc/` run but passes\nin isolation. Confirmed identical on unmodified `main`. Filing\nseparately rather than folding a flake fix into a security change.\n\nFound while exposing `connector.*` in `@nimbus-dev/client` (Stage 1 wave\n1g).\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-23T15:25:16+03:00",
          "tree_id": "f822a10aa892a9edc8a81c7eee1ea9c248b8c91c",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/cc2b07fb65e49bacc8cc208d8b84986527d2ae65"
        },
        "date": 1784810204874,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 296.64958349999944,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 303.5437580999991,
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
          "id": "44e1c384243354593ecbcea32df5b4af6a843b0c",
          "message": "feat(graph): make resolves, mentions and correlates_with real (why-lens step 1a) (#813)\n\n## What this does\n\nThree graph relation types — `resolves`, `mentions`, `correlates_with` —\nwere declared in the SQLite schema but written by **no populator**. Any\nquery traversing them returned zero rows on every index, forever. This\nmakes them real, so the upcoming `nimbus why <file>:<line>` agent (step\n1b) can answer \"who wrote this, why, what drove it, what depends on it\"\nfrom the local index.\n\n| Edge | Traversal |\n| --- | --- |\n| `resolves` | PR title+body → issue (numeric refs and ticket keys, both\nforges) |\n| `mentions` | chat message → issue / commit |\n| `correlates_with` | deployment → incident, 2h same-service window |\n\nAlso lands: `incident` and `deployment` graph entities (which had\n**never** existed, despite both being indexed as items and listed in\n`ITEM_LINKED_ENTITY_TYPES`), a service-identity binding so\ncross-provider identifiers resolve to one nimbus service, and a\ntransactional backfill so the new edges reach already-indexed history\nrather than only newly-synced data.\n\nSpec: `docs/superpowers/specs/2026-07-23-nimbus-why-lens-design.md`\nPlan: `docs/superpowers/plans/2026-07-23-why-lens-1a-populator-edges.md`\n\n## Scope\n\nNo new migration, no new table, no new invariant, no new HITL action\ntype, no CLI/IPC surface. Every relation type and table already existed\n— this is populator work.\n\n## The reason this is larger than \"emit three edges\"\n\nEvery per-task suite passed against **fixtures that no connector\nemits**. Whole-branch review caught that two of the three edge types\nwere correct in code and unreachable against real connector data:\n\n- `correlates_with` keyed on `metadata.service`, which **no connector\nwrites** — PagerDuty writes `pagerduty_service_id`, Vercel writes\n`name`, the CI path writes `nimbus_service_id` and bypassed the\npopulator entirely.\n- The `resolves` numeric path built `${repo}#${n}` (the **PR**\nexternalId shape) while GitHub indexes issues as `${repo}#issue-${n}`.\n\nBoth are fixed and verified end-to-end against metadata copied verbatim\nfrom connector source. A standing rule is now recorded in the plan:\n**regression tests are seeded from the connector's own\n`externalId`/metadata builders, never hand-written shapes.**\n\nThree further defects were each correct in isolation and defeated by\nanother part of this same branch — the backfill deleted the edges the\nresolver created; the `expert.ts` gap-note probe was satisfied by this\nbranch's own `resolves` edges; the environment gate was undone by a `??\nmetadata.service` fallback. All three passed their own tests.\n\n## Correctness choices worth review\n\n- **`occurredAtForItem` throws** rather than defaulting to `Date.now()`.\nA fabricated timestamp would feed the correlation window and produce a\n*confidently wrong* causal claim; an exception is loud and local.\nUnreachable on the production path (`upsertIndexedItem` writes the row\nfirst, synchronously, on the same handle).\n- **The deployment environment gate fails closed.** A deployment with no\nderivable environment does not correlate. The alternative rested on\n\"Vercel always writes `target`\", which this repo's own connector\ndescription contradicts (`target (production/staging)`). Fail-closed\ncosts nothing real — the CI path *requires* `environment`, and Prefect\ncan't bind on any key anyway — and removes a dependency on an unverified\nAPI vocabulary.\n- **No `LIMIT` on counterpart lookup.** Each side clears its whole\ndirection before re-emitting, so a cap made `clear` and `emit`\nasymmetric and silently destroyed edges the other side created\n(reproduced: 30 → 20 after a re-sync). The 2h same-service window\nalready bounds the result.\n- **`${order}` interpolation** in `timelineCounterparts` is the sole\nexception to the bound-parameter rule — SQL keywords cannot be bound,\nand it is re-derived through a ternary from an `\"ASC\" | \"DESC\"` union,\nso it holds even if the parameter type widens.\n- **`SyncContext.resolveServiceId` is optional.** ~80 connectors\nconstruct `SyncContext`; absence preserves prior behaviour exactly.\n\n## Verification\n\n`tsc --noEmit` clean · **762 tests, 0 fail** · `biome` clean over 2920\nfiles · `audit:boundaries`, `audit:invariants`, `audit:any`,\n`audit:cross-platform`, `audit:doc-refs`, `audit:status-drift`,\n`audit:readme-cli`, `lint:markdown` all pass.\n\nEvery retirement guard was mutation-tested: reverting it fails exactly\nits own test and no other.\n\nRebased onto `main` with zero conflicts; the code diff is byte-identical\npre- and post-rebase.\n\n## Known-deferred (recorded for step 1b)\n\n- `annotateDeployment`'s DORA eligibility uses a raw `includes()` with\nno `production → prod` alias, so it now disagrees with correlation about\n\"production\".\n- `subIncidentResolved` still has no query of its own; it goes silent\nthe day something emits `resolves → incident`. Pre-existing structure,\nunchanged here.\n- Ticket-key extraction matches prose (`UTF-8`, `RFC-2119`, `SHA-256`) —\na precision issue, each costing one unindexed scan.\n- `REGRAPH_TYPE_ORDER` omits `obsidian_note` (near-zero risk: ordering\nonly matters when the target entity does not yet exist).\n- `regraphAllItems` has no CLI surface yet — `nimbus index regraph` is\nstep 1b.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n- **New Features**\n- Graph relationships now capture issue resolutions, message mentions,\nand incident–deployment correlations.\n- Added configurable service identity matching for more accurate\ndeployment and incident associations.\n  - Added graph backfill support for existing indexed data.\n  - Vercel deployment records now include repository information.\n\n- **Bug Fixes**\n  - Resynchronizing items no longer removes unrelated relationships.\n  - Malformed metrics configuration no longer prevents gateway startup.\n\n- **Documentation**\n- Added design and implementation plans for the Why Lens and `nimbus\nwhy` experience.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-23T13:25:54Z",
          "tree_id": "7c1d19307234f8610eb65cd6e70234a44e26377f",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/44e1c384243354593ecbcea32df5b4af6a843b0c"
        },
        "date": 1784813894036,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 308.9695420499982,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 308.90081495000595,
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
          "id": "c67a5ff4d064d5e0beeedbf416a2be81fd94d114",
          "message": "docs: Stage 2 re-cut design + PR 1 consumption plan (#814)\n\nDocs-only. Adds the approved Stage 2 design spec\n(`docs/superpowers/specs/2026-07-23-stage-2-recut-design.md`) and the\nimplementation plan for its first deliverable\n(`docs/superpowers/plans/2026-07-23-stage-2-pr1-consumption.md`),\nfollowing the Stage 0/Stage 1 convention of keeping ecosystem\nspecs/plans in this repo.\n\nScope decided 2026-07-23: mandatory client-consumption PR, then 2e-core,\n2d, 2b, 2c in full, plus a build/don't-build data-quality spike for 2a.\nPR 1 itself is already open as nimbus-vscode#45.\n\nLocal verification: lychee (4/4 links OK) + markdownlint (0 errors) on\nboth files.\n\nNote: this is a docs-only PR — the first since #788's\n`pr-quality-required` fix; it should be mergeable without bypass, which\nconfirms that fix end-to-end.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Documentation**\n* Added a detailed implementation plan for integrating the Stage 1\nclient surface into the VS Code extension.\n* Added a design specification outlining the Stage 2 roadmap,\ndeliverables, sequencing, risks, and decisions.\n* Documented planned improvements for session listing, connector health\nreporting, troubleshooting diagnostics, and restricted-mode behavior.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Fable 5 <noreply@anthropic.com>",
          "timestamp": "2026-07-23T14:34:28Z",
          "tree_id": "033f3def335ddb48c2a289d6f6aa03710730f3e8",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/c67a5ff4d064d5e0beeedbf416a2be81fd94d114"
        },
        "date": 1784818010852,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 319.43109809999515,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 319.6501751000025,
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
          "id": "f65e2fcde3b1f1b9d0fb0ff2075e9f0612558a2b",
          "message": "docs: Stage 2a spike findings — don't build the why lens yet (#815)\n\nDocs-only: the read-only data-quality spike the approved Stage 2 design\ncalled for (spec merged in #814), run against the live local index\n(nimbus.db, schema V44).\n\n**Recommendation: don't build the hover `why` lens yet.** Measured on a\nreal, actively-used machine:\n\n- `git_blame_line` (V32): **0 rows** — the lens's first hop has no data\nat all.\n- 546 items across only 5 services; PR→issue graph joins exist for 5\nissues; **1** person entity.\n- PR titles are literally `\"PR #220\"` — nothing human-readable to hover.\n- No Slack/PagerDuty/Jira lane has any data.\n\nThe report records the prerequisites (blame pipeline populated +\ninvestigated, PR title enrichment, at least one conversation/incident\nlane live) and a re-run bar (≥60% blame→PR resolution on a\nrecently-active repo) before the lens is worth building. Feeds roadmap\nOpen Decision #3.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n* **Documentation**\n* Added a new Stage 2a data-quality findings page based on read-only\nchecks against the live local index.\n* Documented current coverage across graph entities/relations, including\nlane-by-lane impact and why the hover “why” lens can’t be reliably built\nyet.\n* Listed the prerequisites and coverage thresholds required to revisit\nthe investigation, including fixes needed for missing blame and\nconversation/incident context.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Fable 5 <noreply@anthropic.com>",
          "timestamp": "2026-07-23T21:29:33+03:00",
          "tree_id": "5bf8733ea33598933a79b651d171578b93e974dd",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/f65e2fcde3b1f1b9d0fb0ff2075e9f0612558a2b"
        },
        "date": 1784832136524,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 299.60910229999934,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 301.57516455000075,
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
          "id": "a67dbf4f1d6d01cb9ff3ac26668258072ef1ac70",
          "message": "docs(ecosystem-roadmap): record Stage 2 delivery (#816)\n\nDocs-only. Updates the ecosystem roadmap per its own update rules now\nthat Stage 2 is fully merged:\n\n- **Stage 2 section**: status banner (VS Code slice complete\n2026-07-23), a shipped table mapping each item to its PR and the\nextension release that carries it (0.7.0: consumption #45 + 2e-core #46;\n0.8.0: 2d #47 + 2b #49; 0.9.0: 2c #50), the diagnosis kept as written.\n- **2a recorded as spiked-not-built** with a pointer to the merged\nfindings (#815), the prerequisites, and the reproducible re-run bar.\n- **Left-open list**: the deferred 2e tail, the untouched cross-client\nitems (statuspage/raycast), and the two gateway-side follow-ups the\nspike surfaced (empty `git_blame_line` pipeline, id-only PR titles).\n- **The headline**: dated status note — the moat and multiplier shipped,\nthe banner didn't; Stage 3's story leads with what exists.\n- **Open decision 3**: sharpened (not closed) by the spike.\n\nVerification: markdownlint 0 errors; lychee 37/37 links OK.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Fable 5 <noreply@anthropic.com>",
          "timestamp": "2026-07-23T21:36:43+03:00",
          "tree_id": "1e5ff1cd01020e1605c9b7b8e21994f26840e9d0",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/a67dbf4f1d6d01cb9ff3ac26668258072ef1ac70"
        },
        "date": 1784832866561,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 323.08504090000025,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 315.9056830499918,
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
          "id": "465bee092dcc732d72b52fd9b93adeb758edceba",
          "message": "feat(github): enrich fallback 'PR #N' titles via pull-detail fetch (#817)\n\n## Stage 2a un-park — PR A of 3 (PR-title enrichment)\n\n**Root cause.** Indexed GitHub PRs showed id-only titles like `PR #220`\nbecause the GitHub **events feed** (`PullRequestEvent` →\n`payload.pull_request`) genuinely delivers no `title`, and the only\nindexed-`pr` writer falls back to `` `PR #${num}` ``. The rows are not\nstale-from-old-code — the source data lacked the field. (Root-caused\nagainst the live dev-machine index + config + source; see the Stage 2a\nun-park design/plan on `dev/asafgolombek/stage2a-gateway-unpark`.)\n\n**Fix.** A best-effort, post-sync enrichment pass in the GitHub\nconnector. Each sync tick, up to **10** `pr` rows whose stored title is\nstill the exact `` `PR #${num}` `` fallback (newest-first) are\nre-fetched via `GET /repos/{owner}/{repo}/pulls/{number}` and\nre-upserted with their real title. One code path covers both the\nexisting 79 fallback rows and any freshly-ingested title-less event (≤1\nsync-tick latency). Source-independent — no new cloud dependency beyond\nthe user's existing PAT.\n\n### Behavior / safety\n- **Exact-match only.** `title LIKE 'PR #%'` pre-filter, then a JS\n`title === \\`PR #${num}\\`` check — a real title like `\"PR #1 revert\"` is\nnever clobbered (test included).\n- **Best-effort.** Non-OK / 404 / malformed-JSON / non-object-JSON\nresponses skip that row and leave the fallback intact. A\n`RateLimitError` propagates (honors backoff); any other error is logged\nnon-fatal and the sync tick still succeeds.\n- **Bounded.** ≤10 fetches/tick, sequential through the shared rate\nlimiter — no request storm.\n- On a `304 Not Modified` events response the tick returns early and\nenrichment resumes next non-304 tick (backfill is not time-critical).\n\n### Tests\n9 unit tests (injected `fetch`): enrich-only-fallback newest-first,\ncap-at-10 ordering, failed-fetch untouched, no-fallback no-op, `PR #1\nrevert` not clobbered, 401 → `UnauthenticatedError`, 403/rate-limit\npropagation, malformed-JSON skip, non-object-JSON skip.\n\n### Verification (local, pre-push)\n- `github-sync.ts` coverage: **97.6% line / 90.1% branch / 100% fn**\n(well above the 85%/80% floor).\n- typecheck ✓, biome ✓ (2921 files), static invariant audit ✓,\ncross-platform audit ✓, lychee ✓ (CHANGELOG links).\n- No migration; no IPC/CLI surface change; gateway-only.\n\nPart of the Stage 2a `why`-lens substrate work (PR B = whole-file blame\nindexer, PR C = root registration follow). Do not merge without the\nusual CI pass.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n- **New Features**\n- GitHub pull requests now receive accurate titles when event data only\nincludes an ID-based placeholder.\n- Recent placeholder-titled pull requests are automatically enriched\nwith details from GitHub.\n\n- **Bug Fixes**\n  - Prevents valid pull request titles from being overwritten.\n- Handles unavailable, malformed, unauthorized, and rate-limited\nresponses safely.\n\n- **Documentation**\n  - Added a changelog entry describing the GitHub connector enhancement.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-24T01:21:08Z",
          "tree_id": "0fc001ed68ee55ee9bed7020646d6be25bb99d5e",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/465bee092dcc732d72b52fd9b93adeb758edceba"
        },
        "date": 1784856892614,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 316.09650654999496,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 319.1348873499992,
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
          "id": "06c6a14476285acc8797df3a074d260fdf778fbe",
          "message": "ci(infra): P1 org CI foundation — cross-repo drift sweep + declarative rulesets (#818)\n\n## P1 — Org CI Foundation\n\nFirst sub-program of the [infrastructure\nroadmap](../blob/dev/asafgolombek/org-infrastructure-program/docs/infrastructure-roadmap.md):\nbuild the mechanism that carries a control **past the repo it was\nwritten in**, and land the immediate carve-outs. Design of record and\nplan live in `docs/superpowers/`.\n\nOperating principle: *a sub-program is done when its gate is green in CI\nand would go red if the property regressed — not when its code merges.*\n\n### What's in this PR (P1 Tasks 1–6)\n\n| Task | Change | Gate |\n| --- | --- | --- |\n| 1 (P4a) | `ci.yml` concurrency: `cancel-in-progress` only on\n`pull_request`, so consecutive `main` merges no longer cancel each\nother's validation | Every `main` commit gets a completed run |\n| 3 | New `docs/infrastructure-roadmap.md` — the third roadmap (how it\ngets built/reviewed/shipped), registered in `check-doc-references.ts`\n(15 → 16 docs) | `audit:doc-refs` |\n| 4 | `check-action-sha-pins.ts` gains `--root <path>` so the tested\naudit can be aimed at a checkout of any repo | unit-tested |\n| 5 | `.github/workflows/org-drift-sweep.yml` — scheduled matrix checks\nout every org repo and runs the same `--root` audit against it | `Org\ndrift sweep / sha-pins (<repo>)` |\n| 6 | Rulesets checked into `.github/rulesets/general-branch.json`; new\n`audit:ruleset-drift` diffs declared vs live for the 5 active code repos\n(pure diff, unit-tested; fail-soft when unauthenticated) | `Org drift\nsweep / ruleset-drift` |\n\nPlus Task 2 (already applied, remote): `nimbus-client` got the `General`\nbranch ruleset it was missing.\n\n**Task 7 (DCO) is SUPERSEDED** — the contribution-licensing decision\nresolved to a **CLA** (preserves relicensing optionality for the\nAGPL-3.0 core). The CLA is its own sub-effort under P6; it is not in\nthis PR. See the roadmap's P1 progress log.\n\n### Making the ruleset-drift gate real (org config)\n\nThe `ruleset-drift` job mints a token from the **`nimbus-release-bot`**\nApp with `permission-administration: read` (needed by `GET\n/repos/{owner}/{repo}/rulesets`).\n\n- ✅ **Done (2026-07-24):** the App was granted repository\n`Administration: read` — verified `\"administration\":\"read\"` on the org\ninstallation.\n- ⏳ **Confirm before the first post-merge run:** the App is\n`selected`-scoped and the token requests all 5 repos, so it must be\n*installed on* all of them — `Nimbus`, `nimbus-client`, `nimbus-sdk`,\n`nimbus-vscode`, `nimbus-web-clipper`. web-clipper is the one to check\n(the `RELEASE_BOT_PRIVATE_KEY` secret is shared with only the other\nfour). If it isn't in the App's Repository access, the token-mint fails\nred on that repo.\n\nThe `sha-pins` matrix half needs no token (public repos clone\nanonymously) and runs on the first post-merge schedule.\n\n### Verification (local, worktree)\n\n- `typecheck` 0 errors · `biome check scripts` clean · `lint:markdown` 0\nerrors\n- `audit:doc-refs` — 610 refs across **16 docs**, all resolve\n- `lychee` (CI scope `docs/**/*.md *.md`) — **0 errors**\n- `audit:action-sha-pins: OK` · `audit:ruleset-drift: OK (5 repos)` (run\nwith an admin token)\n- structure-audit + preflight-manifest tests — 27 pass\n- No `packages/` source touched → `coverage-floor` N/A\n\nThe `Org drift sweep` itself is dispatch/schedule-only and net-new, so\nit cannot fire from this feature branch — its first real run is\npost-merge.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-24T01:46:51Z",
          "tree_id": "94fef082903b3cffbc7d07ec7a55b018cf769998",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/06c6a14476285acc8797df3a074d260fdf778fbe"
        },
        "date": 1784858370279,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 314.7439731999992,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 312.73664794999206,
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
          "id": "4bcc0767d5e1bb452789baff27f6aee98c517a91",
          "message": "feat(blame): whole-file 90-day blame indexer (Stage 2a un-park PR B) (#819)\n\n## Stage 2a un-park — PR B of 3 (whole-file blame indexer)\n\n**Root cause.** `git_blame_line` was populated only as a sparse\nbyproduct of the security symbol-scan: ~16-line excerpt ranges around\n*exported symbols*, JS/TS only, gated behind `code_index` (default off).\nIt can't back a line-level `why` lens (\"who last touched this line\").\n(Root-caused against the live index; see the Stage 2a un-park\ndesign/plan.)\n\n**Fix.** A new `blame` **Syncable** decoupled from the symbol path. Per\nconfigured `[[filesystem.roots]]` git repo, it blames every git-tracked\nfile with a commit in the last **90 days**, **whole-file, all\nlanguages**, writing one `git_blame_line` row per line.\n\n### Design\n- **Incremental** via a per-repo last-blamed HEAD cursor\n(`nimbus-blame1:` JSON cursor). Each tick diffs `git diff --name-status\n-M <lastHead> HEAD`: modified/added files are re-blamed whole, deleted\nfiles pruned, renames expand to prune-old + blame-new.\n- **Full re-blame fallback** when the recorded head is no longer an\nancestor of HEAD (`git merge-base --is-ancestor` fails → history was\nrewritten).\n- **Bounded & sequential**: one `git blame` subprocess at a time, capped\nat **400 files/tick** (remainder picked up on later ticks; the drop is\nlogged, never silent). No FD/CPU storm on a large repo.\n- **Degrades safely**: git-missing / timeout / non-zero exit → zero\nblame for that file, no crash (30s per-subprocess timeout,\n`AbortSignal.timeout`). I1 env scoping (`extensionProcessEnv`) on every\nspawn, mirroring the existing `gitLogRecords`/`gitBlameLinePorcelain`\nhelpers.\n- **No migration** — reuses the V32 `git_blame_line` table. Registers a\nlocal-only `blame` provider in the rate limiter.\n\n### Files\n- `connectors/blame-index-sync.ts` — the Syncable + exported pure git\nhelpers (`gitHeadSha`, `isAncestor`, `gitBlameWindowFiles`,\n`gitChangedSince`, `gitBlameWholeFile`), all with injectable `spawn`.\n- `security/blame-store.ts` — `pruneBlameForFile(db, repoRoot,\nfilePath)` (idempotent re-blame + delete cleanup).\n- `platform/assemble.ts` — registers the syncable behind the existing\nempty-roots guard.\n- `sync/rate-limiter.ts` — `blame` provider.\n\n### Tests\n- `blame-store.test.ts`: prune scoping (per-file, per-repo).\n- `blame-index-sync.test.ts`: 12 helper unit tests (injected spawn: exit\ncodes, dedup, rename expansion, spawn-throws→empty) + 8\nreal-temp-git-repo integration tests (full path, incremental\nmodify/delete/add, history-rewrite fallback, non-git root skip, non-dir\nroot skip, empty-file no-op, malformed-cursor fallback).\n\n### Verification (local, pre-push, CI-Linux-authoritative floor)\n- `blame-index-sync.ts` **98.8% line / 86.1% branch**; `blame-store.ts`\n**100% / 88.5%** — both well above the 85/80 floor.\n- typecheck ✓, biome ✓ (2923 files), static invariant audit ✓,\ncross-platform ✓, lychee ✓.\n- Full suite: the only failures are pre-existing environment-specific\nupdater/OAuth cases in files this PR does not touch (the updater factory\ndetects a package-manager install on this dev box and returns undefined;\ngreen on CI Ubuntu).\n\n**Requires a configured `[[filesystem.roots]]` git repo to produce data\n— PR C (`nimbus index add` / `filesystem.ensureRoot`) makes that\nergonomic.** Do not merge without the usual CI pass.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-24T05:04:32+03:00",
          "tree_id": "e669434982b240542692a34d6ca11972da5a31a0",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/4bcc0767d5e1bb452789baff27f6aee98c517a91"
        },
        "date": 1784859375445,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 295.928685550001,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 295.88755024999483,
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
          "id": "940cb2e01c5c8ecb853c2d359c203022457a7efd",
          "message": "feat(agents): the why lens — why agent, whyPeek, on-demand blame + index regraph (step 1b) (#820)\n\n## Why lens — step 1b\n\nFollows the merged **1a** (#813), which made `resolves` / `mentions` /\n`correlates_with` real graph edges. This slice adds the agent that reads\nthem.\n\n### What ships\n- **`why` built-in agent** — six parallel lanes over the 1a graph edges\n(pull-request · ticket · discussion · driver · downstream · blame),\nmirroring `impact.ts`'s parallel sub-agent skeleton. Read-only,\nHITL-free, honest degradation with gap notes.\n- **`agents.whyPeek`** — sub-300ms line-anchored peek.\n- **On-demand single-line `git blame`** — root-fenced (spawns only\ninside `[[filesystem.roots]]`), cached, one bounded 20 s subprocess per\ncold line.\n- **Subject resolution** — `parseRef` / `matchConfiguredRoot` /\n`resolveWhySubject` (path or symbol → blame subject), with a red-proven\npath-escape fence on both the caller-path and symbol branches.\n- **`index.regraph` IPC + `nimbus index regraph` CLI** —\nresolver-threaded graph backfill (threads `configDir` through so\n`correlates_with` and friends survive).\n- **`nimbus why <path[:line] | symbol> [--line N] [--peek] [--json]`\nCLI.**\n- **IPC + Tauri allowlist** — `agents.why` / `agents.whyPeek` (allowlist\n99 → 101, TS mirror updated).\n- **1a-backlog fixes** — ticket-key prose stoplist (SHA-256 etc. no\nlonger extracted as ticket keys) + `obsidian_note` in the regraph type\norder.\n- Reuses the shared reverse-`depends_on` traversal, refactored out of\n`impact.ts` in the same PR (impact's suite passes unchanged).\n\n### Verification\n- **Whole-branch fresh-context review: no blockers.** All six cross-task\nchecks passed against re-derived populator source (lane SQL shapes,\n`resolves` both-endpoint scoping, the spawn fence, connector-verbatim\nfixtures, cross-surface drift, the `configDir` resolver wiring). Two\nreview nits fixed: the symbol-branch `file` containment fence\n(red-proven) and a whyPeek fixture `state` value corrected to the\nconnector-verbatim `\"closed\"`.\n- Gates green: tsc (gateway+cli), biome, `audit:structure` (invariants),\ncross-platform, doc-refs, readme-cli, lychee; gateway 730 / cli 34 /\nwhy.e2e 4 tests pass.\n- **Coverage floor: ok (0 violations)** — reproduced CI-faithfully via\nthe tar-into-container method (a mounted-volume Docker run under-reports\nand is unreliable).\n\n### Known-inert by design\nThe `downstream` lane ships structurally empty: the populator emits\n`depends_on` only at workspace→package granularity, never symbol→symbol,\nso `reverseDependsOn(symbolId)` returns nothing today. The lane degrades\nwith an honest gap note (remediation: symbol-level `depends_on` is a\npopulator follow-up) — this is loud-failure-over-plausible-wrong-answer,\nnot a dead lane.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Fable 5 <noreply@anthropic.com>",
          "timestamp": "2026-07-24T05:07:17+03:00",
          "tree_id": "09e168d8bcf006b91f90852173b5852ad2345909",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/940cb2e01c5c8ecb853c2d359c203022457a7efd"
        },
        "date": 1784860085783,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 303.42266929999823,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 304.4242296000022,
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
          "id": "a36afddee8c7211756a127c85203619f5cd8818d",
          "message": "ci(infra): fix ruleset-drift bypass-actor false-positive; P1 gate green (#821)\n\n## What & why\n\nFollow-up to #818 (P1 — Org CI Foundation). P1's `org-drift-sweep` had\nits **first live post-merge run**, which surfaced one issue in the\n`ruleset-drift` job.\n\n**Finding:** the job's credential is a repo-scoped `nimbus-release-bot`\nApp installation token with `Administration: read`. GitHub returns an\n**empty `bypass_actors`** to that token for org-level actors\n(`OrganizationAdmin`), so the `bypass_actor_types` diff false-failed on\n`Nimbus` / `nimbus-vscode` / `nimbus-web-clipper` — the repos that carry\nthat bypass — even though an org-owner token sees the actor exactly as\ndeclared.\n\nI tried the coverage-preserving path first (per plan): adding\n`organization-administration: read` to the token. **Proven live on this\nbranch that it does NOT restore visibility.** Reading the field\notherwise requires `Administration: write`, which a read-only audit gate\nmust not hold.\n\n## Changes\n\n- **Workflow:** revert the token step to `Administration: read` only\n(least privilege), with a comment recording the limitation.\n- **Script:** drop `bypass_actors` from `diffRuleset` (with rationale),\nand simplify the desired-file schema to a flat `repos` list (no per-repo\noverrides). Every other check — enforcement,\n`ref_name.include`/`exclude`, required rule types, PR params — reads\nreliably under the App token.\n- **JSON/roadmap:** record the intended bypass shape + the deferral\n(audit bypass actors from a higher-privilege context later) so the check\nisn't silently lost.\n- **Roadmap:** mark **P1 done** — the gate is proven green end-to-end.\n\n## Live proof\n\n`org-drift-sweep` dispatched on this branch (run `30060920603`) is\n**fully green**: all 8 `sha-pins` jobs + `ruleset-drift`\n(`audit:ruleset-drift: OK (5 repos)`). The gate now goes red only on\nreal drift.\n\n## Local verification\n\n`13 tests pass` · live gate `OK (5 repos)` · biome/scripts-tsc clean ·\n`audit:action-sha-pins: OK` · markdown `0 errors` · doc-refs resolve.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Documentation**\n* Clarified ruleset drift coverage, limitations, and planned handling of\nbypass actors.\n  * Updated infrastructure roadmap status and rollout details.\n\n* **Chores**\n  * Simplified shared ruleset configuration across repositories.\n* Improved drift auditing to focus on supported ruleset settings and\nconditions.\n\n* **Tests**\n* Updated validation to reflect the revised ruleset configuration and\nbypass-actor handling.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-24T06:31:27+03:00",
          "tree_id": "76c353cdb91f548ac5d215ce9b5384a664195d77",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/a36afddee8c7211756a127c85203619f5cd8818d"
        },
        "date": 1784864668278,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 317.2423739999998,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 323.25755139999967,
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
          "id": "67a9f75cd2765c3f3f751b9db90f04f718fa265a",
          "message": "feat: nimbus index add + filesystem.ensureRoot — register blame roots (Stage 2a PR C) (#822)\n\n## Stage 2a un-park — PR C of 3 (editor/CLI root registration)\n\n**Problem.** The blame indexer (PR B, #819) and git-commit/symbol\nsyncables only run on paths in `[[filesystem.roots]]`. On the live\nmachine that array is empty, so nothing gets blamed — and the only way\nto add a root was to hand-edit `nimbus.toml`. This PR makes registering\na repo a one-liner.\n\n**What it adds.**\n- **`nimbus index add <path>`** — resolves the path and calls the new\n`filesystem.ensureRoot` IPC method (generic `IPCClient.call`, no\n`@nimbus-dev/client` change). Reports `Registered blame root: <path>` or\n`Already registered: <path>`.\n- **`filesystem.ensureRoot` IPC** — narrows `{ path }`, canonicalizes\n(real-path + strips the Windows `\\?\\` long-path prefix so `repo_root`\nmatches `git -C`), requires an existing directory with a `.git` entry\n(structurally rejecting `C:\\` / `/`), and persists to\n`registered-roots.json`. Fail-closed on missing `configDir`.\n- **`registered-roots-store`** — persist/load + `mergeRoots(toml,\nregistered)`: dedupe by canonical path (case-folded on win32), **TOML\nwins** on collision, skip any root whose folder is gone (stderr\nwarning). Registered roots are blame-oriented (git-aware, no code-index,\nno dependency graph).\n- **Assembly wiring** — the `fsV2Roots` load site now merges TOML +\nregistered roots, so a registered repo feeds the existing\nfilesystem/git-commit/blame syncables on the next Gateway start (TOML\nwins).\n\n### Security\n- `filesystem.*` added to `FORBIDDEN_OVER_LAN` (invariant I5) — a remote\npeer can never register an indexing root on your machine. Enforcement\ntest added to `security-invariants.test.ts`; static invariant audit\ngreen.\n- Not exposed to the Tauri renderer (CLI-only), consistent with\n`index.reembed`.\n\n### Tests\n- `registered-roots-store.test.ts` (10): idempotent add, round-trip,\n`mergeRoots` (TOML-wins / missing-skip), `canonicalizeRootPath`,\nmalformed-JSON / non-array / non-string-element handling.\n- `filesystem-rpc.test.ts` (7): miss, bad params, non-resolving path,\nnon-git dir, file-not-dir, idempotent register.\n- `dispatchers.test.ts`: `filesystem.ensureRoot` reached via the Phase-4\nchain + the `configDir`-missing error bubbles.\n- `index-cmd.test.ts` (+6): usage errors, gateway-down, resolved-path\ncall, `Already registered`.\n\n### Verification (local, pre-push, CI-Linux-authoritative floor)\n- New files above floor: `registered-roots-store.ts` 100% line / 83.3%\nbranch (remaining 2 branches are win32-only), `filesystem-rpc.ts`\n100/100, `index-cmd.ts` 100 line / 94.1% branch.\n- typecheck ✓ (gateway + cli), biome ✓ (2947 files), invariant audit ✓,\n`audit:readme-cli` ✓, `audit:doc-refs` ✓ (610 refs), lychee ✓.\n- Rebased cleanly onto current `main` (resolved with #819 blame indexer\n+ #820 why-lens/index-regraph — both `tryDispatchIndexRegraphRpc` and\n`tryDispatchFilesystemRpc`, and both `index add` / `index regraph` CLI\nsubcommands, coexist).\n- The only floor/test failures in the full local run are pre-existing\nenvironment cases in files this PR does not touch (updater factory\ndetects a package-manager install on this dev box; OAuth-arm timeout) —\ngreen on CI Ubuntu.\n\nCompletes the Stage 2a un-park trio (A #817 titles, B #819 blame\nindexer, C root registration). Do not merge without the usual CI pass.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n- **New Features**\n- Added `nimbus index add <path>` to register an existing local Git repo\nas a blame/index root.\n- Registered roots persist to be applied on the next Gateway start,\nmerging with `nimbus.toml` (with `nimbus.toml` taking precedence).\n- Command output is idempotent, indicating newly added vs already\nregistered roots.\n- **Bug Fixes**\n- Validates inputs, requires an existing directory containing `.git`,\nand blocks the action over LAN.\n- **Documentation**\n  - Updated CLI reference plus IPC/architecture notes and the changelog.\n- **Tests**\n- Added end-to-end coverage for the command and IPC dispatch, plus\nregistered-roots load/merge/canonicalization cases.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-24T03:53:25Z",
          "tree_id": "62e49737d9057d2461a20405d5d64444184bcaab",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/67a9f75cd2765c3f3f751b9db90f04f718fa265a"
        },
        "date": 1784865905603,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 310.19247414999626,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 308.8217696499992,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "306811640+nimbus-release-bot[bot]@users.noreply.github.com",
            "name": "nimbus-release-bot[bot]",
            "username": "nimbus-release-bot[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "8b8b877b34693e15556c769ba7daac8bcb8a849b",
          "message": "chore: release main (#823)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n<details><summary>0.26.0</summary>\n\n##\n[0.26.0](https://github.com/nimbus-agent/Nimbus/compare/v0.25.0...v0.26.0)\n(2026-07-24)\n\n\n### Features\n\n* **agents:** the why lens — why agent, whyPeek, on-demand blame + index\nregraph (step 1b)\n([#820](https://github.com/nimbus-agent/Nimbus/issues/820))\n([940cb2e](https://github.com/nimbus-agent/Nimbus/commit/940cb2e01c5c8ecb853c2d359c203022457a7efd))\n* **blame:** whole-file 90-day blame indexer (Stage 2a un-park PR B)\n([#819](https://github.com/nimbus-agent/Nimbus/issues/819))\n([4bcc076](https://github.com/nimbus-agent/Nimbus/commit/4bcc0767d5e1bb452789baff27f6aee98c517a91))\n* **github:** enrich fallback 'PR #N' titles via pull-detail fetch\n([#817](https://github.com/nimbus-agent/Nimbus/issues/817))\n([465bee0](https://github.com/nimbus-agent/Nimbus/commit/465bee092dcc732d72b52fd9b93adeb758edceba))\n* **graph:** make resolves, mentions and correlates_with real (why-lens\nstep 1a) ([#813](https://github.com/nimbus-agent/Nimbus/issues/813))\n([44e1c38](https://github.com/nimbus-agent/Nimbus/commit/44e1c384243354593ecbcea32df5b4af6a843b0c))\n* nimbus index add + filesystem.ensureRoot — register blame roots (Stage\n2a PR C) ([#822](https://github.com/nimbus-agent/Nimbus/issues/822))\n([67a9f75](https://github.com/nimbus-agent/Nimbus/commit/67a9f75cd2765c3f3f751b9db90f04f718fa265a))\n\n\n### Bug Fixes\n\n* **agents:** report why a janitor resourceRef was rejected\n([#805](https://github.com/nimbus-agent/Nimbus/issues/805))\n([1b002b5](https://github.com/nimbus-agent/Nimbus/commit/1b002b516180b8ba039a5279d8db50d03e7e9227))\n* **ipc:** the connector HITL prompts named params no caller sends\n([#811](https://github.com/nimbus-agent/Nimbus/issues/811))\n([cc2b07f](https://github.com/nimbus-agent/Nimbus/commit/cc2b07fb65e49bacc8cc208d8b84986527d2ae65))\n* **secrets:** VSCE_PAT deadline is its expiry (2026-09-20), not the\ndecommission ([#803](https://github.com/nimbus-agent/Nimbus/issues/803))\n([bdb79f8](https://github.com/nimbus-agent/Nimbus/commit/bdb79f858de97f7e68d519de62c2c32d496866ff))\n</details>\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\nCo-authored-by: nimbus-release-bot[bot] <306811640+nimbus-release-bot[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-24T07:20:50+03:00",
          "tree_id": "4d36414269f9125b879c1f898fcda47766d5d62f",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/8b8b877b34693e15556c769ba7daac8bcb8a849b"
        },
        "date": 1784867557257,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 297.594913349998,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 296.36859405000143,
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
          "id": "afb5a6da4624ce12b8b362f12a494900819f4005",
          "message": "ci(release): auto-recover phantom releases (create missing tag + relabel) (#824)\n\n## Problem — the chronic phantom release\n\nrelease-please intermittently **merges the `chore: release main` PR**\n(bumping `.release-please-manifest.json` + CHANGELOG) **but never\ncreates the `vX.Y.Z` tag / GitHub Release**. Root cause, from the run\nlogs: an internal parse error during the run —\n\n```\n❯ error message: Error: unexpected token ' ' at 1:7, valid tokens [(, !, :]\n```\n\n— breaks its release-creation phase. After that, every subsequent run\naborts with:\n\n```\n⚠ There are untagged, merged release PRs outstanding - aborting\n```\n\nso nothing new can release either. The tell-tale state is a **merged\nrelease PR still labelled `autorelease: pending` with no matching tag**.\nThis has forced a manual recovery on ~5 consecutive releases (v0.23.1,\nv0.23.2, v0.24.0, v0.25.0, v0.26.0): `git tag vX.Y.Z <release-commit> &&\ngit push` + relabel the PR `pending → tagged`.\n\nConfirmed this session that the tag alone does **not** clear it —\nrelease-please keys the \"outstanding\" check off the **label**, so the\nrelabel is mandatory.\n\n## Fix — automate the recovery\n\nAfter the release-please step, a **reconcile step** runs the standing\nmanual playbook automatically:\n\n1. Find any merged release PR still labelled `autorelease: pending` (the\nphantom signature). If none → no-op.\n2. Read the version from `.release-please-manifest.json` at that PR's\nmerge commit.\n3. If `vX.Y.Z` doesn't exist, create it **via the App token** — which,\nunlike `GITHUB_TOKEN`, **does trigger** the tag-driven `release.yml`\nbuild.\n4. Flip the label `autorelease: pending → tagged` so release-please\nstops aborting on the next run.\n\nIdempotent — on a healthy run (nothing pending) it exits immediately.\nRobust to *whatever* breaks release-please's native step, rather than\nchasing the internal parser bug (which has recurred across releases with\ndifferent commit content → config/label-shaped, not content-shaped).\n\nAlso adds `permission-issues: write` to the minted App token: PR label\nedits are an issues-API scope for GitHub Apps (this also answers a\nlong-standing open question — the label-flip needs `issues: write`).\n\n## Notes / validation\n- Workflow-only change; takes effect once on `main` and is **fully\nexercised on the next release**. YAML validated; `audit:action-sha-pins`\ngreen; no new `uses:` actions.\n- **Dependency:** the `nimbus-release-bot` App must have **Issues:\nwrite** granted at install for the relabel (and `permission-issues:\nwrite` mint) to work. If it lacks it, the tag still gets created\n(release ships); only the auto-relabel would 403 — grant Issues:write to\nmake it fully hands-free.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Bug Fixes**\n* Improved release handling by automatically reconciling merged releases\nthat are missing their expected version tags.\n* Updated release status labels after successful tag creation, reducing\nstale pending release entries.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-24T05:00:37Z",
          "tree_id": "4a05d4e4c884ed61b7511e89bc152878feb1170c",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/afb5a6da4624ce12b8b362f12a494900819f4005"
        },
        "date": 1784869786402,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 240.54170279999963,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 239.83199744999874,
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
          "id": "f6d516a57a75b95c33924e6222e9a369c5c37315",
          "message": "refactor(agents): consume promoted why types from sdk 1.6.0 + roadmap (why-lens step 2) (#825)\n\n## Why-lens step 2 — gateway half\n\nThe `why` lens shipped on the gateway + CLI in #820; **step 2** promotes\nits types into `@nimbus-dev/sdk` (single source of truth) and exposes it\nthrough `@nimbus-dev/client`. This is the gateway slice of that hop.\n\n### What this PR does\n- **Consume the promoted types** — bumps `@nimbus-dev/sdk` to `^1.6.0`\n(published) and re-exports `WhyBrief` / `WhyFinding` / `WhyLane` /\n`WhySubject` / `WhyPeek` + `isWhyBrief` from `agents/_lib/findings.ts`.\n`agents/_lib/why-types.ts` drops its local duplicate definitions and\nre-exports the five from `findings.ts`, keeping only `WhyInput` (the\nclient-local request shape). Pure type-move — no behavior change\n(`why.ts`/`why-peek.ts`/`agents-rpc.ts` untouched; `tsc` is the proof\nthe shapes still line up).\n- **9th agent in the fixture generator** — adds `why` to\n`scripts/gen-agent-brief-fixtures.ts` PARAMS and regenerates\n`agent-brief-shape.snapshot.json` (why-only addition), so the\ngateway-generated golden fixture that `@nimbus-dev/client`'s conformance\ngate consumes carries the `why` brief.\n- **Roadmap truth-pass** — records the lens as built + client-reachable\nin `docs/ecosystem-roadmap.md`, retiring the stale \"spiked, not built\"\nframing for the reachability claim.\n- Carries the step-2 design spec, implementation plan, and the\ndesign/plan review notes.\n\n### Verification\n- Baseline 228 gateway-agent tests → 228 after the swap (exact match);\nfull why suite (agents + `agents-rpc.why` + `why.e2e`) **232 pass / 0\nfail**.\n- `tsc -p packages/gateway/tsconfig.json` clean; `audit:structure`\ndependency-cruiser OK (no import cycle from the re-export);\n`agent-brief-shape.test.ts` 10/10.\n- biome clean; `lint:markdown` 0 errors; doc-refs + readme-cli green.\n\n### Companion PRs (the rest of step 2)\n- `@nimbus-dev/sdk` **1.6.0** — promoted types (merged + published).\n- `@nimbus-dev/client` **0.12.0** — `agentsWhy` + `agentsWhyPeek`\n(nimbus-client#31).\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n* **New Features**\n* Shipped client-accessible “why” lens support, including brief and peek\nviews, routed through the gateway for the step 2 SDK→client path.\n* Extended the “why” result typing surface to align responses across\ngateway and supporting tooling.\n* Expanded “why” brief schema coverage and added new fixture parameters\nfor better response coverage.\n* **Documentation**\n* Updated the ecosystem roadmap with Stage 2a delivery status and\nclarified remaining banner/hover work.\n* Added/updated implementation plans and design reviews for the\nSDK→client integration and verification gates.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-24T09:17:20+03:00",
          "tree_id": "a59ca14dcb9dbf97391dbce3aaf7a829eaa90008",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/f6d516a57a75b95c33924e6222e9a369c5c37315"
        },
        "date": 1784874564357,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 316.95318305,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 314.69893029999366,
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
          "id": "52afca34746045f202545d0bf0d55d70483d4afa",
          "message": "feat(infra): P6a access model — team-reachability + org-settings drift gates (#826)\n\n## P6a — Access & Contribution Model (core)\n\nSecond sub-program of the [infrastructure\nroadmap](../blob/dev/asafgolombek/p6a-access-contribution-model/docs/infrastructure-roadmap.md)\n(P1 → **P6** → …). P1 built the org-wide drift sweep; P6a uses it to\nmake the org's *access model* a checked-in, drift-gated property. Design\n+ plan under `docs/superpowers/`.\n\n### What's in this PR\n\n| Piece | Change |\n| --- | --- |\n| Shared plumbing | `scripts/structure-audit/_gh-audit.ts` (`runGh`,\n`isStrict`, `strictSkip` — one definition of *loud-in-CI, soft\nlocally*); `ruleset-drift` migrated onto it + gains `--strict` |\n| **Org-settings gate** | `.github/org-access.json` (desired settings) +\n`check-org-settings-drift.ts` — diffs `members_can_create_repositories`\n/ `default_repository_permission` vs live |\n| **Team-reachability gate** | `check-team-reachability.ts` — asserts\nevery org repo is reachable through a team (paginated,\narchived-excluded, exemptions in `org-access.json`) |\n| Contributor-two switches | `$contributor_two` advisory block in\n`general-branch.json` — records the four solo→team switches (one\nreviewed diff to onboard maintainer #2) |\n| Sweep wiring | two new jobs in `org-drift-sweep.yml`, all three gate\njobs run `--strict`, App tokens scoped least-privilege\n(org-administration / members read) |\n\n### Applied + proven green\n\nThe org apply landed (org-owner): six teamless repos (`.github`,\n`linux-repo`, the four npm narrow-waist repos) granted to `maintainers`;\n`members_can_create_repositories` → false;\n`default_repository_permission` → none; App granted `members: read`.\n\n**Live proof — `org-drift-sweep` run `30071156534` is green across all\n11 jobs** (`sha-pins` ×8, `ruleset-drift`, `org-settings-drift`,\n`team-reachability`). Both new gates were **red before** the apply (they\ndetect the un-applied state) and **green after** — the gate goes red on\nregression, which is the roadmap's definition of *done*.\n\n### Deferred (documented)\n\n- The **CLA** (own spec, next).\n- A higher-privilege **bypass-actor audit** (CI App token can't read\n`bypass_actors`; a future owner-`gh`-run check, no PAT).\n- Private-repo ruleset protection — **blocked-on-Team** (Free plan).\n\n### Verification\n\n580 tests / 0 fail · tsc + biome clean · `audit:action-sha-pins` OK ·\n`audit:ruleset-drift` OK · `lint:markdown` 0 · doc-refs resolve ·\nwhole-branch lychee 0 errors. Built via subagent-driven development:\nper-task review + an opus whole-branch review (merge-with-fixes → fixes\napplied: token scoping, `isRecord` dedup, roadmap accuracy, `softFail:\nnever`).\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-24T09:23:23+03:00",
          "tree_id": "f0da15a7a752c3fed2fee1824e617254eb5463ce",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/52afca34746045f202545d0bf0d55d70483d4afa"
        },
        "date": 1784875267372,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 305.2559968999972,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 307.3981404000086,
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
          "id": "6252a26a152ac63eaec788d12c77c1cad2b5685a",
          "message": "docs(ecosystem-roadmap): Stage 4 + un-park the why lens + connector-split decision (#828)\n\n## What\n\nExtends `docs/ecosystem-roadmap.md` with the next tranche of surface\nwork, without violating the document's charter (it owns **how gateway\ncapability reaches a human** — client surfaces and delivery — never\ngateway capability itself, which stays in `roadmap.md`).\n\n## Changes\n\n- **Stage 2a rewritten** — \"spiked, not built\" → **\"prerequisites\nshipped, the data gate remains.\"** Records the shipped un-park trio\n(PR-title enrichment #817, blame lane #819, `ensureRoot` #822) and the\nwhy agent (#820). **Gate B (surface) is now cleared** by the SDK→client\nhop — `agents.why`/`whyPeek` promoted to `@nimbus-dev/sdk` 1.6.0 and\nexposed via `@nimbus-dev/client` 0.12.0 (`agentsWhy`/`agentsWhyPeek`,\ngateway re-export #825). Only **Gate A** (the ≥60% blame→PR data\nre-validation on a live repo) remains.\n- **New Stage 4 — \"reach the surfaces still dark\"** — a gate-per-row\ntable for the `why` lens (hover UI), `nimbus-postmortem` (surface only;\nthe agent is net-new gateway work, linked to `roadmap.md`),\n`nimbus-raycast`, and `nimbus-statuspage`. Supersedes the old\n\"Cross-client\" bullet under *Left open from Stage 2*.\n- **Open decision 5** — \"Do the 95 connectors leave the monorepo?\" with\nmotive, cost, a hold recommendation, and a gate — plus a *proposed*\n`nimbus-mcp-servers` repo-map row. Recorded as a spec-sized decision,\n**not** committed as a stage.\n- Contents TOC + cross-references wired.\n\n## Charter check\n\n`nimbus-sandbox` and `nimbus-quorum` (from the source brainstorm) were\ndeliberately **excluded** — both are gateway capability (and quorum\nalready shipped under I21), so they belong in `roadmap.md`, not here.\n\n## Gates (run locally, whole-branch scope)\n\n- `bun run lint:markdown` — **0 errors** (116 files)\n- `lychee --config lychee.toml 'docs/**/*.md' '*.md'` — **0 errors**\n(1089 OK)\n- `bun run audit:doc-refs` — **all 611 refs resolve**\n\nDocs-only; no code paths touched.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-24T06:35:58Z",
          "tree_id": "1da67ca0cdf53dcda0915e045961490e0bf677f2",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/6252a26a152ac63eaec788d12c77c1cad2b5685a"
        },
        "date": 1784875950604,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 299.1170983499993,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 301.201220149998,
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
          "id": "98cc6e4f335273de5838fdd7947bfe72ff9bdaed",
          "message": "docs: ecosystem Stage 3 — distribution (launch messaging + roadmap status) (#830)\n\nStage 3 (Distribution) copy that lives in this repo, plus the\nspec/plan/reviews.\n\n- **`docs/launch-messaging.md`** — reusable messaging sheet (three\npillars: banner=`why` lens, moat=egress receipts, multiplier=LM tools)\nwith load-bearing **honesty guardrails** (the egress ledger records the\nagent's *dispatched actions* at the I29 chokepoint — never \"everything\nthat left your machine\").\n- **Stage 3 roadmap status** — marketplace re-cut ✅, cross-link ROADMAPs\n✅, launch trust-story ✅; **demo GIF ⏳ deferred** (gated on the Stage 4\nhover UI).\n\nCopy/metadata only — nothing published or posted. **Companion PRs:**\nnimbus-vscode (marketplace re-cut) + nimbus-client/-sdk/-web-clipper\n(ROADMAP cross-links).\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-24T07:27:58Z",
          "tree_id": "a7f19c20990b2f87cba3d02c447e8df9dcf42133",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/98cc6e4f335273de5838fdd7947bfe72ff9bdaed"
        },
        "date": 1784878800435,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 296.5569919000012,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 296.9728493500028,
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
          "id": "e5eddb97b2ad7205199b2e28e99b2336908dc055",
          "message": "refactor(gateway): clear 10 SonarCloud smells in why/blame/assemble (#829)\n\nFix-not-exclude cleanup of all open SonarCloud code smells on the\n`nimbus-agent_Nimbus` project (10, all CODE_SMELL — no\nbugs/vulns/hotspots).\n\n## Fixes\n- **why-peek.ts / why.ts** (S6582): collapse `x === null || x.y ===\nnull` guards to `x?.y == null` optional chains.\n- **_lib/render.ts** (S3358, S4624): extract `renderWhySubjectLine`,\nremoving a nested ternary and a nested template literal.\n- **blame-index-sync.ts**: single multi-arg `changes.push()` for the\nrename D+A pair (S7778); extract `statusFromCode` (S3358); split the\n`sync` root loop into\n`blameOneRoot`/`blameRootFull`/`blameRootIncremental`, dropping\ncognitive complexity 27 → well under 15 (S3776).\n- **assemble.ts** (S3776): extract `loadServiceConfigsOrDegrade`,\ndropping `assemblePlatformServices` cognitive complexity 16 → 15.\n- **why.test.ts** (S8782): move the `afterEach` hook to the top of the\n`describe` scope.\n- **agents-rpc.why.test.ts** (S5906): `toHaveLength(0)` over a generic\n`.length` assertion.\n\n## Coverage\nAdded a git-status `A` (added-file) case plus an unknown-code (`T` →\n`M`) case to the `gitChangedSince` parse test, covering all three\n`statusFromCode` branches.\n\nAll changes behavior-preserving.\n\n## Verification\n- Gateway `tsc --noEmit` ✅\n- `biome check --error-on-warnings packages scripts` (2953 files) ✅\n- Invariants static audit (`check-nimbus-invariants.ts`) ✅\n- Full gateway suite: 8814 pass (1 unrelated 5s-timeout flake in\n`connector-rpc-handlers/auth.test.ts`, passes isolated in 204ms)\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Bug Fixes**\n* Improved blame index updates for added, deleted, renamed, and modified\nfiles.\n* Unknown file-change statuses are now handled consistently as\nmodifications.\n* Invalid service configuration no longer prevents platform startup;\naffected service bindings are skipped with a warning.\n* Preserved clear handling for unresolved code subjects and missing line\ninformation.\n\n* **Refactor**\n* Simplified internal processing of repository synchronization and\nsubject rendering without changing expected results.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-24T10:55:14+03:00",
          "tree_id": "821a5a90ae0aa563ebe3fdcb64d5fc48ae079045",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/e5eddb97b2ad7205199b2e28e99b2336908dc055"
        },
        "date": 1784880302254,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 282.8524585000021,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 283.51304285000333,
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
          "id": "2ad7828df3fc467f23d3514c1f0b25ce17a86ade",
          "message": "docs: mark ecosystem roadmap complete + prune shipped specs/plans (#831)\n\nPost-Stage-3 docs cleanup.\n\n- **`docs/ecosystem-roadmap.md`** — marked ✅ COMPLETE (Stages 0–3\ndelivered); the **Stage 4** section is removed, since the remaining\nsurfaces (why-lens hover UI, raycast, statuspage, postmortem) now live\nin each repo's own `ROADMAP.md`. The four dangling Stage-4 links are\nrepointed. Kept as the historical record.\n- **Pruned 73 shipped specs/plans** under\n`docs/superpowers/{specs,plans}` — spent scaffolding; the durable info\nis already in the canonical docs (`architecture.md` carries the why lens\n+ `agents.why`/`whyPeek` IPC; `cli-reference.md` the commands;\n`CHANGELOG.md` the dated entries; `SECURITY.md` the security model). The\n~16 references from kept docs are de-linked to plain text so nothing\ndangles.\n- **Currency:** release line `v0.24.0` → `v0.26.0` (CLAUDE + GEMINI); a\n`nimbus why` example added to the README quickstart.\n\nGates: doc-refs (612 refs resolve), markdownlint, lychee — all green.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n- **New Features**\n- Added a Quickstart example demonstrating line-provenance tracing with\nthe `nimbus why` command.\n\n- **Documentation**\n  - Updated the documented latest release from v0.24.0 to v0.26.0.\n- Refreshed changelog references, roadmap status, and contributor\nguidance.\n- Marked the ecosystem roadmap as complete and clarified ownership of\nremaining work.\n- Removed outdated implementation plans and design documents to keep\ndocumentation current.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-24T11:35:13+03:00",
          "tree_id": "56fef51f7ba24cf40c74e9461d157193af7da328",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/2ad7828df3fc467f23d3514c1f0b25ce17a86ade"
        },
        "date": 1784882638084,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 244.62413434999434,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 242.48982294999513,
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
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "distinct": true,
          "id": "a91d73ec67e9ccf839761ce4447890d3bc7492a0",
          "message": "ci(cla): add CLA Assistant workflow",
          "timestamp": "2026-07-24T15:28:21+03:00",
          "tree_id": "0c97e912e7fa20fb4e06072897e1cb9c583909ae",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/a91d73ec67e9ccf839761ce4447890d3bc7492a0"
        },
        "date": 1784896607270,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 200.06206120000314,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 188.0152399499995,
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
            "email": "asafgolombek@gmail.com",
            "name": "Asaf",
            "username": "asafgolombek"
          },
          "distinct": true,
          "id": "7176dd498255a9175037303efbf677684c8482e5",
          "message": "ci(cla): fix allowlist casing + claude, client-id",
          "timestamp": "2026-07-24T15:39:12+03:00",
          "tree_id": "c8c8ab348d44661aa753434f4f433b54e9ff5ed5",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/7176dd498255a9175037303efbf677684c8482e5"
        },
        "date": 1784897449927,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 301.32821305000505,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 301.80192215000096,
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
          "id": "d9f0a1df655b185ed8d56b925e1aa39160532678",
          "message": "docs(cla): CLA program Phase 1 — ICLA/CCLA drafts + cla-coverage drift gate (#832)\n\n## CLA Program — Phase 1 (docs + coverage gate)\n\nDelivers the source-of-truth CLA artifacts and the org-wide drift gate.\nThe live `.github/workflows/cla.yml` + CLA text on\n`nimbus-agent/.github` were already deployed to all 6 gated repos in\nPhase 2; this PR lands the in-repo templates, the design/plan/review\ndocs, and the enforcement gate.\n\n### What's in it\n- **`docs/cla/ICLA.md` + `CCLA.md`** — Individual + Corporate CLA, broad\nrelicensable grant (dual-license optionality for the AGPL-3.0 core).\nGemini legal review applied (grant to Us only; §203 termination waiver;\nmoral-rights waiver; ESIGN/UETA assent; CCLA cross-ref + version pin;\nSchedule A). Governing law: **State of Israel / Tel Aviv-Jaffa**.\n- **`docs/cla/cla.yml`** — reusable workflow template\n(contributor-assistant@v2.6.1, App-token mint via `client-id`, allowlist\n`bot*,asafgolombek,claude`).\n- **`docs/cla/README.md`** — sign-flow + version-bump SOP.\n- **`docs/CONTRIBUTING.md`** — CLA section + MIT→AGPL one-way rule.\n- **`scripts/structure-audit/check-cla-coverage.ts` (+ test)** — drift\ngate: every gated repo (6 public) must carry `cla.yml` at one pinned\nsignature version; reachability-probe based (public repos → 404 =\nabsent). Registered in `package.json` +\n`scripts/lib/preflight-gates.ts`.\n- **`.github/workflows/org-drift-sweep.yml`** — `cla-coverage` job\n(RELEASE_BOT token, `--strict`).\n- Design/plan/review docs under `docs/superpowers/`.\n\n### Verification\n- `check-cla-coverage` test: 4/4 ✅\n- preflight-gates drift test: 5/5 ✅\n- biome clean; gate typechecks clean\n- `cla-coverage` sweep proven green against all 6 repos\n\nRebased onto current `main` (the two live-deploy CLA commits + #830/#831\necosystem docs are already there).\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-24T18:27:25+03:00",
          "tree_id": "1d0d716d968f39721c1a418102906dc44afe6b4a",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/d9f0a1df655b185ed8d56b925e1aa39160532678"
        },
        "date": 1784907414604,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 207.21126539999605,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 209.76808799999634,
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
          "id": "7d2129e62387e4de74159befbc6db1f85440d9fa",
          "message": "fix(security)!: clear all high advisories (react-router v8, postcss, brace-expansion) + scope cla.yml permissions (#835)\n\nTakes the repo from **4 high advisories to 0**. `bun audit --audit-level\nhigh` and `Trivy vulnerability scan` are both **required checks** and\nwere already failing on `main`, so this also unblocks #834 and #836.\n\n## Advisories cleared\n\n| Advisory | Package | Fix |\n| --- | --- | --- |\n| GHSA-r28c-9q8g-f849 | postcss 8.5.15 | pinned **8.5.23** via\n`overrides` (transitive: astro/vite) |\n| GHSA-chx6-hx7r-mcp5 — DoS, inefficient route matching | react-router\n7.17.0 | **7.18.1** |\n| GHSA-mh99-v99m-4gvg | brace-expansion | override was pinned to exactly\n**5.0.7**, but the advisory range is `<=5.0.7` — the pin *was* the\nvulnerable version. Now **5.0.8** |\n| GHSA-qwww-vcr4-c8h2 — RSC CSRF | react-router | **v8.3.0 migration**,\nsee below |\n\nNote that `bun audit` surfaced more than GitHub's code-scanning alerts\ndid — the brace-expansion and route-matching-DoS advisories were not in\nthe Code Scanning list.\n\n## The react-router v8 migration\n\nGHSA-qwww-vcr4-c8h2's only fix is 8.3.0, and **there is no\n`react-router-dom` 8.x** — v8 discontinued the separate DOM package and\nfolded it into `react-router`. So this swaps the dependency and rewrites\nthe module specifier across **35 files** (15 `src` + 20 `test`).\n\n**No API changes were required.** Every symbol in use exists in v8 under\nthe same name: `createBrowserRouter`, `createRoutesFromElements`,\n`RouterProvider`, `Route`, `Navigate`, `Outlet`, `Link`, `NavLink`,\n`MemoryRouter`, `Routes`, `useNavigate`, `useLocation`,\n`useSearchParams`, and the `NavigateFunction` type.\n\nMarked `!` because the UI's routing dependency crosses a major version.\nNo public API is affected, and the Tauri desktop app is\nPhase-13-deferred.\n\n## Scorecard `TokenPermissions` — `cla.yml` (#151, #152)\n\n`actions` / `pull-requests` / `statuses: write` were declared at **top\nlevel**, so every job inherited them. They now sit on the single `cla`\njob; the workflow default drops to `contents: read`. Capabilities are\nunchanged, so the live required `cla` gate keeps working.\n\nThe other 9 `TokenPermissions` alerts are job-level writes that are\nstructurally required (`contents: write` for release-please, `checks:\nwrite` for test-report publishing). Scorecard scores *any* write as 0,\nso they can't be satisfied without breaking those jobs — left for a\ndismiss-with-justification decision.\n\n## Verification\n\n- **`bun audit --audit-level high`: clean, exit 0** (was 4 high)\n- `packages/ui` vitest: **506 tests across 74 files, all pass**\n- `packages/ui` `tsc --noEmit` clean; **full monorepo typecheck exit 0**\n- `vite build` succeeds (183 modules transformed)\n- `biome check` clean on 2957 files; lockfile passes `--frozen-lockfile`\n\n## Rider worth calling out\n\n`bun install` deduped `@nimbus-dev/sdk` to a single hoisted **1.6.0**,\ncollapsing ~100 per-connector 1.4.0/1.5.0 entries (hence the large\n`bun.lock` delta). All 94 connectors declare `^1.3.0` and the gateway\n`^1.6.0`, so this is semver-legal and unavoidable through bun's\nresolver.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-26T13:25:41Z",
          "tree_id": "c0ab691a2e1d7a3f74fcc77bc8068ad48d15f2c3",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/7d2129e62387e4de74159befbc6db1f85440d9fa"
        },
        "date": 1785073076084,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 304.1363660999985,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 307.1924319500089,
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
          "id": "98b03278380e946c36c4ae2c0038321969d2ff83",
          "message": "feat(infra): P2 Release Train Phase 1 — release-staleness gate (#836)\n\nShips Phase 1 of the **P2 Release Train** sub-program: an independent,\nscheduled gate that goes red when a built release has not reached a\ndistribution channel, or when a release *phantoms*. Spec + plan (design\n→ review → plan → review) are the first four commits.\n\n## What it does\n\nA declarative `.github/release-train.json` lists every propagation edge.\n`audit:release-staleness` reads three version heads and emits a per-edge\nverdict:\n\n| Head | Source |\n| --- | --- |\n| **intended** | `.release-please-manifest.json` on `main`, plus its\nbump-commit age |\n| **published** | latest stable `vX.Y.Z` Release that actually carries\nits `SHA256SUMS` asset |\n| **distributed** | each channel's live file (brew / scoop / linux apt)\nor winget dir-or-open-PR |\n\nA new `release-staleness` job runs it `--strict` on the existing weekly\n`org-drift-sweep` cron. **No App token is minted** — every read is\npublic, so `github.token` suffices.\n\n## Design decisions that matter\n\n- The **phantom edge gates on the bump commit's age**, not the\nrelease's, so a normal build window is never red.\n- **winget counts as caught-up on a merged dir OR an open PR** — the\ngate never waits on Microsoft's merge.\n- Every unreadable or unparseable input degrades to `indeterminate`,\n**never `stale`**. `Bun.semver.order` throws on non-semver, so it is\nwrapped.\n- Under `--strict`, a run that evaluated *nothing* is **red** —\n\"indeterminate\" must not read as \"all clear\" (the team-reachability\nrule).\n\n## Live proof: RED on a genuine phantom\n\n```\n::error::nimbus-gateway:phantom: manifest 0.27.0 has no built Release with assets\n(latest published: 0.26.0); bump is 54h old (> 6h grace)\n```\n\nVerified real, not a gate bug: **no `v0.27.0` tag exists**, and PR #827\n(merged 2026-07-24T06:37Z) still carries `autorelease: pending`. All\nfour channel edges evaluated `ok`. Exit 1 in both default and `--strict`\nmode.\n\nChasing that surfaced a second, worse problem — **#824's auto-reconcile\nhas been a silent no-op since it shipped**, fixed in #834. The gate did\nits job on run 1.\n\n## Also closes the CLA-coverage follow-up\n\n`_gh-audit.ts` now surfaces the `gh` HTTP status; `check-cla-coverage`\ntreats a non-404 read as *indeterminate* rather than \"cla.yml absent\",\nso a transient 5xx/rate-limit can no longer fake a \"repo lost its CLA\ngate\" red. That was an open robustness item on the infrastructure\nroadmap.\n\n## Verification\n\n- 39 unit tests for the new gate; **610 scripts tests pass**, 0 fail\n- `typecheck` clean; `biome check` clean on 2960 files\n- `audit:doc-refs` 616/616 resolve; `audit:readme-cli` clean; lychee 0\nerrors\n- Manifest key, all three channel paths and the `nimbus-headless` Debian\nformat verified against the **live** repos, not assumed from the plan\n- Red-prove: the `stale` (5) and `phantom` (4) cases assert the red\nverdicts\n\n## Remaining\n\nPhase 2 (dependency-DAG edges: sdk/client → consumers). Per the\nprogram's definition of done, P2 is only *done* once `release-staleness`\nhas run green in a scheduled sweep on `main` — a net-new job's first\nreal run is post-merge, so dispatch `org-drift-sweep.yml` after this\nlands and record the run number in the roadmap.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-26T13:47:02Z",
          "tree_id": "d95a50ba70748179237c9d0c914512e095955e9f",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/98b03278380e946c36c4ae2c0038321969d2ff83"
        },
        "date": 1785074341684,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 306.8971365499965,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 305.85458919999803,
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
          "id": "ffcec8eab8370ab6b8f908e0646a0f3975bd2194",
          "message": "fix(release): reconcile step never detected a missing tag (gh writes 422 to stdout) (#834)\n\nThe phantom-release guard added in #824 has been a **silent no-op since\nit shipped**. `v0.27.0` has been unreleased since 2026-07-24 as a direct\nresult.\n\n## The bug\n\n```bash\nexisting=$(gh api \"repos/$REPO/commits/$tag\" --jq \".sha\" 2>/dev/null || true)\n```\n\n`gh` writes its JSON error body to **stdout**, not stderr. On a missing\ntag it exits 1 *and* prints the 422 body — so `$existing` is non-empty,\nthe `[ -z \"$existing\" ]` → \"create the tag\" branch never runs, and\ncontrol falls to the \"tag points elsewhere\" guard, which `continue`s.\n\nThe live warning quotes the raw error JSON where a commit sha belongs:\n\n```\n::warning::v0.27.0 exists but points at {\"message\":\"No commit found for SHA: v0.27.0\",\n...,\"status\":\"422\"}, not PR #827's merge commit 1e0b98df; not relabelling — needs manual review.\n```\n\n(run `30105358184`). #824 was already live when #827 merged, so the\nrecovery ran and did nothing.\n\n## The fix\n\nAssign only on a zero exit, and require the result to look like a commit\nsha so no future error-body shape can impersonate a resolved tag.\n\n## Verification (against live state, read-only)\n\n| | old capture | fixed capture |\n| --- | --- | --- |\n| missing tag `v0.27.0` | `{\"message\":\"No commit found...}` → wrong\nbranch | `\"\"` → **`WOULD CREATE: v0.27.0 at 1e0b98df for PR #827`** |\n| existing tag `v0.26.0` | resolves | resolves to `8b8b877b…` —\npoints-elsewhere guard still works |\n\nAlso `bash -n` clean, and the non-match path verified safe under `set\n-euo pipefail`.\n\n## Follow-up\n\nThis does not itself tag `v0.27.0` — the pipeline stays stuck until\neither this merges and the next `release-please` run reconciles it, or\nthe manual playbook is run:\n\n```bash\ngit tag v0.27.0 1e0b98df && git push origin v0.27.0\ngh pr edit 827 --add-label \"autorelease: tagged\" --remove-label \"autorelease: pending\"\n```\n\nFound by the new `audit:release-staleness` gate on its first live run\n(see the P2 Release Train PR).\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Bug Fixes**\n  * Improved release recovery when a version tag is missing.\n* Ensured phantom releases are correctly created and pending release\nitems are relabeled after recovery.\n* Prevented API error responses from being misinterpreted as valid tags.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-26T16:47:48+03:00",
          "tree_id": "ade0d06583f4b5125da3af819b8711423e1132da",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/ffcec8eab8370ab6b8f908e0646a0f3975bd2194"
        },
        "date": 1785074888332,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 259.163999750002,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 256.31118184999906,
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
          "id": "2be97d743861edb2764d707f349522161f9cf077",
          "message": "fix(release): request workflows:write so the App can create the release tag (#837)\n\n## ⚠️ Merge order matters — grant the App permission FIRST\n\n`actions/create-github-app-token` **fails outright** if it requests a\npermission the App does not hold. Merging this before the grant breaks\n`release-please.yml` entirely.\n\n**App to change:** `nimbus-release-bot` — app_id **4339400**,\ninstallation **147619203** (org-owned, `repository_selection:\nselected`).\nGrant **Repository permissions → Workflows: write**, then approve the\nupdated permissions on the installation.\n\nCurrent grants (no `workflows` at all):\n`administration:read · contents:write · issues:write · members:read ·\nmetadata:read · organization_administration:read · pull_requests:write`\n\n## Root cause\n\nThis is the 403 that has blocked every hands-free release. GitHub\nrefuses to let a GitHub App create a ref pointing at a commit whose\n`.github/workflows/**` differs from the default branch unless the App\nholds `workflows: write` — it counts as the App \"creating or updating a\nworkflow\".\n\nA release tag **always** points at the release PR's merge commit, which\nfalls behind `main` the moment any later PR touches a workflow file. So\nthis fires on exactly the releases we care about — it is structural, not\nintermittent.\n\nFor v0.27.0 the target `1e0b98df` differs from `main` in **3** workflow\nfiles (`cla.yml`, `org-drift-sweep.yml`, `release-please.yml`), all\nchanged by #832/#834/#836 after that commit.\n\n## Evidence\n\nREST surfaces this only as an opaque `403 Resource not accessible by\nintegration` on `POST /git/refs`. The response header names the\nrequirement:\n\n```\nX-Accepted-Github-Permissions: contents=write; contents=write,workflows=write\n```\n\nTwo accepted sets — `contents=write` **or**\n`contents=write,workflows=write`. The App satisfied the first but never\nthe second.\n\nConfirmed by in-CI probe with the minted token (run `30205855632`):\n\n| probe | result |\n| --- | --- |\n| `POST refs/heads/<probe>` @ null sha | **422** `Object does not exist`\n— authorized, bad sha only |\n| same ref shape @ `main` head | **201** created |\n| same ref shape @ #827's merge commit | **403** |\n\nThe git transport spells out what REST hides: *\"refusing to allow a\nGitHub App to create or update workflow ... without `workflows`\npermission\"*.\n\n## Previously ruled out — do not re-investigate\n\n- The **\"Protected release tags\" ruleset** (15436427) is not involved:\nrules are `deletion`/`non_fast_forward`/`update` with **no `creation`\nrule**, and `rule-suites?ref=refs/tags/v0.27.0` returns `[]`, i.e. it\nwas never evaluated.\n- The mint step already requested `contents: write`, and the App already\nheld it.\n- The same token's reads in the same step always succeeded.\n\n## Likely wider impact\n\n`release-please` authenticates with this same App token. Its own\ntag-creation almost certainly hits this identical gate, which would\nexplain why it \"cannot create releases in this repo\" and has aborted on\nevery version since ~#757. If so, this grant fixes the disease at the\nsource and the reconcile step (#834) becomes a safety net rather than\nthe primary path. The `unexpected token ' '` parse error in its logs may\nbe a red herring.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Bug Fixes**\n* Improved automated release handling by granting the permissions\nrequired for release tagging.\n* Added safeguards and guidance to help prevent merged releases from\nremaining untagged or pending.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-26T17:48:43+03:00",
          "tree_id": "3f753af6b87ab3f553615c1b8d6e15ca7fc09e86",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/2be97d743861edb2764d707f349522161f9cf077"
        },
        "date": 1785078046282,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 308.5718990000023,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 316.6898606499999,
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
          "id": "5a5690ebc10b2b01e758113657b75ca0db33c295",
          "message": "docs(infra): bring the infrastructure roadmap up to date with 2026-07-26 (#838)\n\nSeveral rows in `docs/infrastructure-roadmap.md` had gone stale against\nreality. Given this file's own rule — *\"a sub-program is done when its\ngate is green in CI, not when its code merges\"* — that is a correctness\nproblem rather than cosmetics.\n\n## Changes\n\n**Status table**\n- **P6** — CLA is done *and now actually executing*; only the\nbypass-actor audit remains. (The row still said \"Remaining: CLA\".)\n- **P2** — Phase 1 red-proved on a real phantom and green after (`OK (5\nedges current)`).\n- **P5** — notes the second gate today's findings specify.\n\n**CLA progress log** — the entire \"Pending apply (org-owner)\" checklist\nwas applied 2026-07-24; rewritten as delivered, with the App id, the\n`cla-signatures` branch, and the fact that the required context name is\n**`cla`** (the job name, not \"CLA Assistant\").\n\nCritically, it now records that **the gate was dead on `Nimbus` for two\ndays**: 23 of 23 runs were `startup_failure` because the repo's Actions\nallowlist did not permit `contributor-assistant/github-action`, so the\nrequired `cla` context was never reported and **every PR was\nunmergeable**. Plus the retrigger gotcha — `startup_failure` runs cannot\nbe `gh run rerun`'d; close+reopen is the way.\n\n**P2 progress log** — records the three nested defects the red thread\nuncovered, each hidden by the one above it:\n\n1. the phantom itself (`v0.27.0` merged, never tagged);\n2. #824's auto-reconcile had been a **silent no-op since it shipped** —\n`gh` writes its error body to *stdout*, so `$(... || true)` left the\n\"tag missing\" probe non-empty and the create branch never ran (fixed\n#834);\n3. with that fixed, the create hit `403` — GitHub refuses to let an App\ncreate a ref at a commit whose `.github/workflows/**` differs from the\ndefault branch without **`Workflows: write`** (fixed #837).\n\nWith the diagnostics that cracked each, since they generalise: the\n`X-Accepted-Github-Permissions` response header,\n`rulesets/rule-suites?ref=…` returning `[]` as proof a ruleset was *not*\ninvolved, and the Workflows-vs-Actions permission confusion in the App\nUI.\n\n**Pattern table** — adds the CLA outage as a **fourth instance**, and a\nshort section arguing it is the sharpest one yet. A control that was\nwritten, deployed, made *required*, and red-proved on another repo, yet\nnever executed once. It defeats a weaker reading of this file's own bar:\n*\"the gate is green\"* is not the test, *\"the gate ran\"* is.\n`cla-coverage` was green throughout — it verifies a control's\n**presence**, which cannot detect that the control is structurally\nunable to **execute**.\n\n**New P5 progress log** — captures the two gates today implies, so the\nmotivation survives: `audit:actions-allowlist` (would have caught the\noutage on day zero; also guards the full-replace fragility of that API),\nand the health-probe **permission-superset** rule from #837 (a\npermission the probe omits is one it cannot detect being revoked). Plus\nthe `VSCE_PAT` **2026-12-01** expiry.\n\n## Still outstanding after this\n\nThe P2 log carries one deliberate placeholder: the scheduled-sweep run\nnumber. The gate is green locally against live state, so dispatching\n`org-drift-sweep.yml` and recording that number is the last formality\nbefore P2 Phase 1 is formally done.\n\n## Verification\n\n`lint:markdown` 0 errors · `audit:doc-refs` 616/616 resolve · lychee 5/5\nOK including `--include-fragments` for the two new internal anchors.\n\nDocs-only.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-26T17:48:55+03:00",
          "tree_id": "d7c47f28309c71cfc51dbd83fa09c479e0d7e4a7",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/5a5690ebc10b2b01e758113657b75ca0db33c295"
        },
        "date": 1785078796014,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 323.05936464999866,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 327.8437593999955,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "306811640+nimbus-release-bot[bot]@users.noreply.github.com",
            "name": "nimbus-release-bot[bot]",
            "username": "nimbus-release-bot[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "4f2728ca868759cb19aeeed3bdb182e2f3ad4cd7",
          "message": "chore: release main (#839)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n<details><summary>1.0.0</summary>\n\n##\n[1.0.0](https://github.com/nimbus-agent/Nimbus/compare/v0.27.0...v1.0.0)\n(2026-07-26)\n\n\n### ⚠ BREAKING CHANGES\n\n* **security:** clear all high advisories (react-router v8, postcss,\nbrace-expansion) + scope cla.yml permissions\n([#835](https://github.com/nimbus-agent/Nimbus/issues/835))\n\n### Features\n\n* **infra:** P2 Release Train Phase 1 — release-staleness gate\n([#836](https://github.com/nimbus-agent/Nimbus/issues/836))\n([98b0327](https://github.com/nimbus-agent/Nimbus/commit/98b03278380e946c36c4ae2c0038321969d2ff83))\n\n\n### Bug Fixes\n\n* **release:** reconcile step never detected a missing tag (gh writes\n422 to stdout)\n([#834](https://github.com/nimbus-agent/Nimbus/issues/834))\n([ffcec8e](https://github.com/nimbus-agent/Nimbus/commit/ffcec8eab8370ab6b8f908e0646a0f3975bd2194))\n* **release:** request workflows:write so the App can create the release\ntag ([#837](https://github.com/nimbus-agent/Nimbus/issues/837))\n([2be97d7](https://github.com/nimbus-agent/Nimbus/commit/2be97d743861edb2764d707f349522161f9cf077))\n* **security:** clear all high advisories (react-router v8, postcss,\nbrace-expansion) + scope cla.yml permissions\n([#835](https://github.com/nimbus-agent/Nimbus/issues/835))\n([7d2129e](https://github.com/nimbus-agent/Nimbus/commit/7d2129e62387e4de74159befbc6db1f85440d9fa))\n</details>\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\nCo-authored-by: nimbus-release-bot[bot] <306811640+nimbus-release-bot[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-26T15:16:06Z",
          "tree_id": "e6c32dbaf866c76644e6bf62071695de6bfdc5da",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/4f2728ca868759cb19aeeed3bdb182e2f3ad4cd7"
        },
        "date": 1785079661464,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 305.522008749998,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 307.84873534999895,
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
          "id": "f7f4fdc01184151b99945e84c0915f56ee14a243",
          "message": "docs(infra): close P2 Phase 1 (sweep run 30210246814) + correct the VSCE_PAT date (#841)\n\nTwo things, both from the sweep dispatched at 16:21Z.\n\n## P2 Phase 1 is done — green in CI\n\nRun\n[`30210246814`](https://github.com/nimbus-agent/Nimbus/actions/runs/30210246814):\nthe `release-staleness` job ran on `main` and **passed**. That completes\nthe bar this file sets — red-proved on a real phantom, green after it\nwas fixed, then green in the scheduled harness. Not \"the code merged\".\n\nP2 row flips to `✅ Phase 1 done (run 30210246814)`; Phase 2\n(dependency-DAG edges) is specced, reviewed, planned and plan-reviewed\non `dev/asafgolombek/p2-phase2-dep-dag` but not implemented.\n\n## The same run surfaced a different defect — recorded, not fixed here\n\n`cla-coverage` **failed at the App-token mint**, so its audit step was\nskipped and never ran at all:\n\n```\nFailed to create token for \"...,nimbus-agent/awesome-nimbus\": There is at least\none repository that does not exist or is not accessible to the parent installation.\n```\n\nConfirmed by elimination — `ruleset-drift` requests the same five repos\n**minus** `awesome-nimbus` and minted fine. The CLA program grew its\ngated list to six; the `nimbus-release-bot` installation stayed at five.\n\nNote *when* this appeared: P6a's green sweep was 11 jobs, and\n`cla-coverage` + `release-staleness` are the 12th and 13th — so this was\n**`cla-coverage`'s first-ever real execution**. That is the fifth\ninstance of the pattern at the top of this file, and the second today.\n\n**Fix is org-owner, not code:** add `awesome-nimbus` to the\n`nimbus-release-bot` App's repository access.\n\n## VSCE_PAT date correction\n\n`2026-09-20`, not `2026-12-01` — roughly eight weeks out rather than\nfour months.\n\nThe SSoT is `scripts/release/credential-registry.ts`, whose note is\nexplicit: the December date is the Azure DevOps **global-PAT\ndecommission**, which does not apply because the token was confirmed\n**org-scoped** in the ADO portal (2026-07-22, nimbus-vscode#34). The\nbinding date is the token's own expiry.\n\nI introduced the wrong date in #838. The registry note warns against\nexactly that substitution — at 90-day lead it would have stayed silent\npast the expiry that actually bites.\n\n## Verification\n\n`lint:markdown` 0 errors · `audit:doc-refs` 617/617 resolve · lychee\nclean including `--include-fragments`.\n\nDocs-only.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-26T16:30:36Z",
          "tree_id": "001797af06e5c57906f5bdd17c02015f4b4ae53e",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/f7f4fdc01184151b99945e84c0915f56ee14a243"
        },
        "date": 1785084141918,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 308.4715909000024,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 308.5732611999985,
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
          "id": "7ce8815952858b16f367b98941539375e0af105e",
          "message": "fix(ci): stop pending-run eviction silently cancelling main's validation (#840)\n\n## What this fixes\n\nStarted from \"3 open HIGH Code Scanning alerts\". Those turned out to be\n**stale, not live** — pinned to `d9f0a1df` (07-25), before #835 upgraded\nthe packages. `bun.lock` already had react-router 8.3.0 / postcss 8.5.23\n/ brace-expansion 5.0.8 and `bun audit --audit-level high` was clean.\nRe-scanning `main` closed all three as `state=fixed`.\n\nBut *why* a merged fix left alerts open for a day turned out to be three\nreal gaps.\n\n### 1. Pushes to `main` lost their CI run entirely — 33 of 60 (55%)\n\n`ci.yml` set `cancel-in-progress: false` for pushes, intending \"never\ncancel a merge\". That flag only protects the **in-progress** run. GitHub\npermits one *pending* run per concurrency group and cancels \"any\npreviously pending workflow in the group\" when a newer one arrives — so\nconsecutive merges evicted each other **while queued**.\n\nThe tell: the cancelled runs have **zero jobs**.\n\n```\n$ gh api repos/nimbus-agent/Nimbus/actions/runs/30207835838/jobs --jq .total_count\n0\n```\n\nAll six merges on 07-26 were cancelled this way, so the commits that\nactually shipped — **v1.0.0 among them** — were never validated\npost-merge.\n\nThe existing comment in `ci.yml` had already diagnosed the symptom\n(\"Measured at 22 cancelled / 40 runs\") and tuned `cancel-in-progress`\naccordingly. But that flag was never the mechanism, so the bug outlived\nthe fix written for it.\n\n**Fix:** pushes get a per-SHA group and never share one; PRs keep the\nper-ref group so superseded runs still cancel.\n\n```yaml\ngroup: ${{ github.workflow }}-${{ github.ref }}-${{ github.event_name == 'pull_request' && 'pr' || github.sha }}\ncancel-in-progress: ${{ github.event_name == 'pull_request' }}\n```\n\n### 2. `codeql.yml` had the same bug — with a security consequence\n\nAn evicted push run never re-uploads main's SARIF, so CodeQL alerts\nsilently go stale against a commit that no longer exists (5 of 40 push\nruns). Same per-SHA fix. The PR-ref cancel-on-supersede behaviour and\nits \"1 configuration not found\" race rationale are preserved\ndeliberately.\n\n### 3. `security.yml` never ran on push at all\n\nTrivy uploads SARIF **per ref**, so main's alerts only refreshed on the\nnightly cron. That is the direct cause of the stale alerts above — and\nit cuts both ways: a vulnerability *reaching* main would have been\nequally invisible for up to 24h. Now scans on merge too, with the same\nper-SHA concurrency.\n\n### 4. `main` was failing its own preflight (pre-existing)\n\n#835 added `CLA_BOT_CLIENT_ID` / `CLA_BOT_PRIVATE_KEY` to `cla.yml`\nwithout manifest entries, so `audit:consumed-by` had been red on `main`,\nblocking `preflight` for everyone. Confirmed pre-existing by stashing.\nBoth registered as org-scoped `visibility: selected`, verified against\nthe live org rather than assumed; pinned test counts updated (36→38\nentries, ORG 4→6).\n\n## Docs\n\n- `CLAUDE.md` + `GEMINI.md` — said `Latest release v0.26.0`; actual is\n**v1.0.0**. Updated both (CLAUDE.md requires the mirror), noting the\nmajor bump came from the react-router v8 advisory sweep, not a product\nbreak.\n- `README.md` — **no change needed**; it carries no version references\nand `audit:readme-cli` / `audit:doc-refs` pass.\n\n## Verification\n\n- `bun run preflight` (full CI parity) — all 19 static/audit gates\ngreen; the `build` gate fails **locally on Windows only** (see below)\n- lychee, exactly as `docs-quality` invokes it: **1049 links, 0 errors**\n- `bun test scripts/release/credential-*.test.ts` — 39 pass\n- Code Scanning + Dependabot: **0 open alerts**\n- Coverage-floor not run: it scans\n`packages/{gateway,cli,mcp-connectors}` only; this diff touches\n`.github/`, `scripts/release/`, and root `*.md`\n\n## Honest limits\n\n**The concurrency fix is verified by inspection, not live.** The YAML\nparses and the expressions resolve to the intended per-event groups, but\nper-SHA push behaviour cannot be proven until this merges and a real\npush event fires. The first merge after this lands is the actual test.\n\n**Pre-existing Windows-only build break, not actioned here.** `bun run\nbuild` fails locally on Windows in the docs package:\n\n```\n@nimbus/docs build: Export named 'forEach' not found in module 'node_modules\\neotraverse\\dist\\index.js'\n```\n\nConfirmed **not** caused by this branch — reproduces identically on a\nclean detached `origin/main`, and survives a fresh `bun install`. CI is\nunaffected: `Build all packages` passes on `ubuntu-24.04` in the\n`Static` job (verified on run `30207946388`). Worth a separate look\ngiven the platform-equality non-negotiable, but it is out of scope for\nthis PR.\n\n**Unrelated finding, not actioned:** `CLA_BOT_APP_ID` exists as an org\nsecret but no workflow reads it — a leftover from the deprecated\n`app-id` input, same story as the already-deleted `RELEASE_BOT_APP_ID`.\nDeleting it is an org mutation, so I left it alone. If you want it gone,\ndeleting it and marking the entry `forbidden` would match the existing\npattern.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **New Features**\n* Security scans now run automatically for direct updates to the main\ndevelopment branches.\n* Security workflow runs are better coordinated, reducing stale or\nconflicting results.\n\n* **Documentation**\n* Updated project documentation to reflect the v1.0.0 release dated July\n26, 2026.\n\n* **Chores**\n* Expanded credential coverage for release automation and updated\nvalidation checks accordingly.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-26T19:33:56+03:00",
          "tree_id": "a7c2dd8bbb2ef66c2571f006a55880867f9a61f2",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/7ce8815952858b16f367b98941539375e0af105e"
        },
        "date": 1785084869849,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 318.3474624000006,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 319.417680700004,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "306811640+nimbus-release-bot[bot]@users.noreply.github.com",
            "name": "nimbus-release-bot[bot]",
            "username": "nimbus-release-bot[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "6c7de11a9252cb3fa2094de331b5de7a4e2e6d34",
          "message": "chore: release main (#842)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n<details><summary>1.0.1</summary>\n\n##\n[1.0.1](https://github.com/nimbus-agent/Nimbus/compare/v1.0.0...v1.0.1)\n(2026-07-26)\n\n\n### Bug Fixes\n\n* **ci:** stop pending-run eviction silently cancelling main's\nvalidation ([#840](https://github.com/nimbus-agent/Nimbus/issues/840))\n([7ce8815](https://github.com/nimbus-agent/Nimbus/commit/7ce8815952858b16f367b98941539375e0af105e))\n</details>\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\nCo-authored-by: nimbus-release-bot[bot] <306811640+nimbus-release-bot[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-26T16:56:25Z",
          "tree_id": "4e8b3ac5259a3b6acde9bfd29fee85024fa47ea5",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/6c7de11a9252cb3fa2094de331b5de7a4e2e6d34"
        },
        "date": 1785085646739,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 209.75418539999774,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 211.68152849999242,
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
          "id": "1e8c9eafdcde6a9f338ce87a613d19e417de8dfa",
          "message": "feat(audit): P2 Release Train Phase 2 — dependency-DAG edges (#843)\n\n## Summary\n\nP2 Release Train **Phase 2**. Phase 1 (#836) watches whether a gateway\nrelease reaches brew/scoop/linux/winget. This extends the *same*\n`audit:release-staleness` gate to the other propagation graph the org\nruns — the npm packages `@nimbus-dev/sdk` and `@nimbus-dev/client` and\nthe repos that consume them — with two new edge kinds:\n\n- **`<pkg>:publish`** — the upstream component-prefixed release tag vs\nnpm `@latest`. Catches a package that is *tagged but never published to\nnpm*, the npm analogue of the release phantom Phase 1 catches. It has to\nbe its own edge: if a package is tagged and never published, every\nconsumer edge reads green, because npm is stale in exactly the same way\nthe consumers are.\n- **`<pkg>:<consumer>`** — each consuming repo's **lockfile-resolved**\nversion vs npm `@latest`. The lockfile, not the `package.json` range,\nbecause a range misleads in *both* directions: `^1.2.0` permits a newer\n`1.3.0` (false positive), while a caret on a `0.x` **pins the minor**,\nso `^0.5.0` cannot reach `0.12.1` at all (the live case).\n\nThe evaluation engine is unchanged — Phase 2 emits ordinary\n`EdgeResult`s into the same `decideExit`, so exit semantics, the strict\nrule, and the annotation format are identical by construction.\n\n## ⚠️ This gate ships RED, and that is the point\n\n**Do not read the red as a broken gate.** It is detecting confirmed\ndrift (owner-confirmed 2026-07-26 — drift, not deliberate pins). Phase 1\nshipped red the same way and caught a genuine phantom on its first run.\n\nLive proof, `2026-07-26 16:41Z`, verbatim:\n\n```\n::error::client:nimbus-vscode: 0.11.0 < npm 0.12.1 and no bump PR open\n::error::client:Nimbus: 0.5.0 < npm 0.12.1 and no bump PR open\nEXIT=1\n```\n\nEverything else evaluated `ok` — no `::warning::` lines, so no edge was\nindeterminate. Full edge table at run time:\n\n| edge | verdict | detail |\n| --- | --- | --- |\n| `sdk:publish` | ok | tag 1.7.0 published as 1.7.0 |\n| `sdk:nimbus-client` | ok | npm 1.7.0 within 6h grace (resolves 1.6.0)\n|\n| `sdk:nimbus-vscode` | ok | npm 1.7.0 within 6h grace (resolves 1.5.2)\n|\n| `sdk:Nimbus` | ok | npm 1.7.0 within 6h grace (resolves 1.6.0) |\n| `client:publish` | ok | tag 0.12.1 published as 0.12.1 |\n| **`client:nimbus-vscode`** | **stale** | 0.11.0 < npm 0.12.1, no bump\nPR |\n| **`client:Nimbus`** | **stale** | 0.5.0 < npm 0.12.1, no bump PR |\n\nplus all five Phase 1 edges green.\n\n**One deviation from the plan's predicted output, and it is the grace\nrule working.** The plan expected `sdk:nimbus-vscode` red as a third\nedge. Between the plan being written and the gate being run,\n`@nimbus-dev/sdk` **1.7.0 was published** (15:52Z, 0.8h before the run),\nso the 6h grace window correctly suppressed all three sdk consumer edges\n— a package published minutes ago must not red its entire consumer set.\nAll three consumers are nevertheless behind 1.7.0, so **those edges go\nred once grace expires unless they are bumped**. The drift is larger\nthan the design's snapshot recorded, not smaller.\n\n### Remediation folded in / opened alongside\n\nThe sdk drift is fixed rather than left to expire into red:\n\n- **This PR** — `bun.lock` resolves sdk 1.6.0 → **1.7.0**.\nLockfile-only: every declared range here is a caret on `1.x` (`^1.3.0`\nacross connectors, `^1.5.0` cli, `^1.6.0` gateway), all of which already\npermit 1.7.0. (`bun update` also injects sdk into the *root*\n`package.json`; that edit was reverted on purpose — the root is a\nworkspace shell that doesn't consume it.) Verified: typecheck exit 0\nacross all 96 packages, 933 connector tests pass.\n- **nimbus-agent/nimbus-client#38** — lockfile-only refresh to sdk\n1.7.0. Declared floor deliberately left at `^1.6.0`: it's a published\nlibrary, and requiring `>=1.7.0` of *its* consumers is a semver\nstatement nothing needs. 396 tests pass.\n- **nimbus-agent/nimbus-vscode#58** — `@nimbus-dev/client` `^0.11.0` →\n`^0.12.1`, which re-resolves sdk 1.5.2 → 1.7.0 underneath. This one\nneeded a **manifest** edit: a caret on a `0.x` pins the minor, so\n`^0.11.0` could never reach 0.12.1 — the range was itself the blocker,\nexactly the failure mode this gate exists to surface. 638 vitest tests\npass, bundle verified.\n\nNote the `sdk:Nimbus` edge only flips green **on merge** — the gate\nreads consumers' lockfiles from GitHub's default branch, not a working\ntree.\n\n**Still red after all of the above:** `client:Nimbus` (0.5.0 → 0.12.1 in\n`packages/cli`). Seven minors on a `0.x`, so it may touch call sites and\ndeserves its own PR with real review. P2 detects; that remediation stays\nmanual.\n\n## Notes for Reviewers\n\n**The lockfile reader is workspace-scoped, and that subtlety is\nload-bearing.** A `bun.lock` resolution key is a dependency *path*: a\nbare key is the hoisted copy, `<prefix>/<pkg>` is the copy `<prefix>`\nresolved. Only the hoisted entry plus entries whose prefix is one of the\nconsumer's **own workspace names** count. A lower version nested under a\n*third-party* package is that package's business, not ours — counting it\nwould report a version no local code resolves. Confirmed live: this\nrepo's hoisted sdk is `1.6.0` while the copy inside `@nimbus-dev/client`\nis `1.3.0`, and the gate correctly reports `1.6.0`. There is a test for\nexactly this.\n\n**`stripTrailingCommas` is a string-aware scanner, not a regex, on\npurpose.** A real `bun.lock` carries trailing commas, so plain\n`JSON.parse` throws. The obvious `/,(\\s*[}\\]])/g` fails *silently*: it\nalso eats a comma inside a string value ending in `\", }\"`, and the\ncorrupted result still parses. A corrupted-but-parseable lockfile is\nprecisely the defect class this gate exists to prevent, so the parser\nmust not introduce one. Please don't \"simplify\" it back.\n\n**Task 1 is a verbatim move, proven by test count.**\n`stripV`/`compareSemver`/`ageHours`/`decideExit` + the `EdgeResult`\nvocabulary moved into a leaf `_release-train-core.ts` so the Phase 1\nfile and the Phase 2 file can share them without an import cycle;\n`check-release-staleness.ts` re-exports them so no caller path changed.\n39 tests before the move, 39 after.\n\n**One behaviour change rides along:** `ageHours` now fails closed on a\ntimestamp with no explicit zone. `new Date(\"2026-07-26T12:00:00\")`\nparses as **local** time, so the age would differ by up to 14h between a\nlaptop and a UTC runner — enough to move an edge across the 6h grace\nboundary. Both real sources (GitHub `published_at`, npm `time[version]`)\nare `Z`-suffixed, so no production edge changes.\n\n**Failure model is fail-closed in Phase 1's direction.** Registry\nunreachable / non-JSON → `indeterminate`, never `stale`. Lockfile 404 →\n`absent` → `stale`. A lockfile that parses cleanly but has no entry for\nthe package is a **manifest error**, and says so explicitly (`remove\nthis consumer from release-train.json`) rather than sharing wording with\na read failure. A full PR page is treated as possibly-truncated, so \"no\nbump PR found\" degrades to `indeterminate` rather than manufacturing a\n`stale`. npm reads carry a mandatory 5s timeout — the registry is the\none dependency here that is neither GitHub nor local, and the gate runs\nlocally, where a hang is worse than a red.\n\n## Type of Change\n\n- [x] New feature (non-breaking change that adds functionality)\n- [x] CI / tooling\n\n## Non-Negotiables Checklist\n\n- [x] `bun run typecheck` passes with zero errors\n- [x] `bun run lint` passes (Biome) — validated as `bunx biome check\n--error-on-warnings packages scripts .github docs`, 2963 files clean;\nthe packaged `bun run lint` script reports \"Checked 0 files\" and exits 1\ninside a `.claude/worktrees/` checkout, a known local-only false-fail\n- [x] All existing tests pass — 219 pass across\n`scripts/structure-audit/` (79 are this gate's: 44 + 35); 933 connector\ntests pass against the bumped sdk\n- [x] New behaviour is covered by tests\n- [x] No `any` types introduced — external JSON is narrowed with\n`isRecord`\n- [x] No credentials, tokens, or secret values in\nlogs/IPC/config/fixtures — all reads are public and unauthenticated\n- [x] Platform-specific code behind `PlatformServices` — n/a, no\nOS-specific logic\n- [x] The HITL consent gate has not been weakened — n/a, no engine\nsurface touched\n\n## Coverage\n\nn/a — no `engine/` or `vault/` change. `scripts/` is covered by the\nexisting `bun test scripts/structure-audit/` run; no new coverage-gate\nwiring needed.\n\n## Testing\n\n- `bun test scripts/structure-audit/` — 219 pass, 0 fail (79 in the two\nfiles this PR touches: 44 in `check-release-staleness.test.ts`, 35 in\n`_release-train-dep.test.ts`).\n- `bunx tsc -p scripts/tsconfig.json --noEmit` — exit 0.\n- `bun run lint:markdown` — 0 errors; `bun run audit:doc-refs` — 618\nrefs across 16 docs all resolve; `lychee --config lychee.toml\n'docs/**/*.md' '*.md'` — 1054 links, 0 errors.\n- **Live run against the real graph** — output above, exit 1 on two\nconfirmed-stale edges.\n- **Degradation path** — with `gh` unavailable the reachability probe\nshort-circuits before any Phase 2 read: `::warning::` + exit 0 locally,\n`::error::` + exit 1 under `--strict`. No stack trace either way.\n\n## Related Issue\n\nRelates to P2 Release Train (`docs/infrastructure-roadmap.md`), Phase 1\nshipped in #836.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-26T20:25:09+03:00",
          "tree_id": "fb0b1e748d4809da51b2917d240029612653337e",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/1e8c9eafdcde6a9f338ce87a613d19e417de8dfa"
        },
        "date": 1785087527183,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 299.1007250000028,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 300.71943995000584,
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
          "id": "fd1e7ae03019158cbd3796d9e4933263d8687ea1",
          "message": "feat(audit): action-pin freshness — pinned is not the same as current (#847)\n\n## Summary\n\n`audit:action-sha-pins` proves every `uses:` is a 40-hex SHA rather than\na moving tag. It is **structurally unable** to notice that the SHA is\ntwo years old — to that gate, an ancient pin and a fresh pin are\nidentical.\n\nP1's first sweep recorded exactly this (`harden-runner` v2.20.0 vs\nv2.19.4, `actions/checkout` v7.0.1 vs v7.0.0), classified it as\n*staleness* rather than *unpinning*, and deferred a freshness check as\n**\"Plan B\"**. This is that check.\n\nThe two gates stay separate on purpose: **pinning is a security\nproperty** (a moving tag is a supply-chain hole) and is checkable\noffline, so it stays in the local fast tier. **Freshness is a\nmaintenance property** needing network, so it runs in the scheduled\nsweep.\n\n## ⚠️ Ships RED on three real stale pins\n\nA sweep gate, so red here does **not** block PRs:\n\n```\n::error::actions/cache is pinned to 27d5ce7 but v6.1.0 has been out 33d (> 30d grace) — .github/workflows/ci.yml\n::error::dtolnay/rust-toolchain is pinned to 29eef33 but v1 has been out 338d (> 30d grace) — .github/workflows/codeql.yml\n::error::actions/attest-build-provenance is pinned to a2bbfa2 but v4.1.1 has been out 30d (> 30d grace) — .github/workflows/release.yml\n```\n\nBumping them is separate, reviewed work — a pin bump needs its own CI\nrun to prove the new SHA behaves.\n\n## Three corrections that came from running it\n\nEach changed a reported number, and each is the kind of thing that only\nshows up on contact with the real graph.\n\n**1. Grace is measured from the target commit's date, not the release's\n`published_at`.** Many actions ship a **rolling major tag**:\n`dtolnay/rust-toolchain`'s latest release is `v1` from 2022, but the tag\nhas moved many times since. Using the release date reported *\"v1 has\nbeen out 1472d\"* — technically true, wildly misleading, and it makes the\ngrace window meaningless for every rolling-tag action. The commit's own\ndate answers the question the gate is actually asking — *how long has\nthe thing you should be pinned to been available?* — and now reports\n**338d**.\n\n**2. A repo that publishes no releases is skipped, not reported\n`indeterminate`.** Our own `nimbus-agent/.github` composite actions have\nnone. There is nothing to be behind, and no amount of retrying changes\nthat, so warning forever would be pure noise. (Same lesson as the\n`unverifiable` verdict in #845: a permanent unknown must not be reported\nas a transient one.)\n\n**3. `daysSince` fails closed to `+Infinity`, not `-Infinity`.** My\nfirst version had the sign inverted, so an unreadable date made the age\n*smaller* than grace and reported the pin as **current** — fail-open,\nthe exact inversion the release-train's `ageHours` comment warns about.\nThe tests caught it; the comment now explains why the direction matters.\n\n## Design notes\n\n- **Grace: 30 days**, not the release train's 6 hours. Different failure\nclasses — a release-train edge is an automated pipeline that should\npropagate in minutes, so hours of lag is a defect; an action pin moves\nwhen a human or Dependabot gets to it, and a 6-hour window would mean a\npermanently red sweep.\n- **Annotated tags are dereferenced.** A release tag can point at a *tag\nobject*, not a commit; comparing the pin against the tag object's SHA\nwould report every annotated-tag action as stale forever.\n- **Tag-pinned refs are ignored** — an unpinned ref is\n`audit:action-sha-pins`'s finding, and reporting it here too would\ndouble-count one defect.\n- **One release lookup per distinct action**, cached — the same action\nappears in a dozen workflows and the API is rate-limited.\n- Two *different* pins of the same action are both kept: that divergence\nis itself drift worth seeing.\n\n## Testing\n\n- `bun test scripts/` — **654 pass, 20 skip, 0 fail** (24 new)\n- `bunx tsc -p scripts/tsconfig.json --noEmit` — exit 0\n- biome — clean\n- Live run above; no-`gh` degradation returns `::warning::` + exit 0\nlocally, red under `--strict`\n\n## Type of Change\n\n- [x] New feature (non-breaking change that adds functionality)\n- [x] CI / tooling\n\n## Non-Negotiables Checklist\n\n- [x] `bun run typecheck` — exit 0\n- [x] `bun run lint` (Biome) — clean via `bunx biome check\n--error-on-warnings scripts .github`\n- [x] All existing tests pass — 654\n- [x] New behaviour is covered by tests — 24\n- [x] No `any` — external JSON narrowed with `isRecord`\n- [x] No credentials in logs/IPC/config — all reads public\n- [x] Platform-specific code behind `PlatformServices` — n/a\n- [x] HITL gate untouched — n/a\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)",
          "timestamp": "2026-07-26T21:11:08+03:00",
          "tree_id": "02e392dbe52879c83282a777cef711a1494085e6",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/fd1e7ae03019158cbd3796d9e4933263d8687ea1"
        },
        "date": 1785090207642,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 320.44236949999976,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 322.02784270000774,
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
          "id": "80277e5de59edc05505f4ace92f63efab8bc0faa",
          "message": "chore(deps): @nimbus-dev/client 0.5.0 → 0.12.1 in packages/cli (#848)\n\n## Summary\n\nClears the **last red edge** from the P2 Release Train Phase 2 gate\n(#843), which found the CLI resolving `@nimbus-dev/client` **0.5.0**\nagainst a published **0.12.1** — seven minors of drift accumulated\nacross the narrow-waist work, which nothing detected until the gate\nexisted. Owner-confirmed as drift, not a deliberate pin.\n\n**This needed a manifest edit, not a lockfile refresh.** A caret on a\n`0.x` version pins the **minor**, so `^0.5.0` could never resolve past\n`0.5.x` — the range was itself the blocker. That asymmetry is precisely\nwhy the Phase 2 gate reads the **lockfile** rather than the declared\nrange: a range misleads in both directions (`^1.2.0` permits a newer\n`1.3.0`; `^0.5.0` forbids `0.12.1`).\n\nContrast the sdk bumps in #843 / nimbus-client#38 / nimbus-vscode#58,\nwhich were caret-on-`1.x` and needed only `bun install`.\n\n## Why it turned out small\n\nSeven minors on a `0.x` is nominally high-risk, which is why I checked\ncall sites before assuming. The CLI's surface use is narrow —\n`IPCClient`, `MockClient`, `NimbusClient` — and `IPCClient` grew method\n**count** (15 → 32 across those releases) rather than changing shape.\nNothing needed adapting, including\n`packages/cli/src/tui/test-helpers/stub-client.ts`, which *implements*\nthe interface and was the most likely breakage.\n\n## Testing\n\n- **Full monorepo typecheck** — exit 0 (all packages)\n- **biome** — clean\n- `bun test packages/cli/src` — **1792 pass / 8 fail before AND after\nthe bump**, a zero delta\n\n### About those 8 failures\n\nThey are **pre-existing and Windows-local**, not caused by this change.\nI verified rather than assumed: stashed the bump, re-ran on clean\n`main`, and got the identical 14 pass / 8 fail in the same file.\n\nThey are all in `runUpdate dispatcher`\n(`packages/cli/src/commands/update.test.ts`), and they fail in isolation\ntoo — so this is *not* the known `mock.module` cross-file contamination.\nThe mock records **zero** IPC calls, meaning `withGatewayIpc` bails\nbefore dispatch, consistent with the named-pipe socket path on Windows.\nThere is no platform guard on the file and it is not excluded from CI,\nso Ubuntu CI should show them green.\n\nUnrelated to a dependency bump, so out of scope here — but worth its own\nlook, since a Windows-only failure in a TTY/socket path is exactly the\nclass the cross-platform non-negotiable exists to catch.\n\n## Type of Change\n\n- [x] Bug fix (non-breaking change that fixes an issue) — dependency\ndrift\n- [x] CI / tooling\n\n## Non-Negotiables Checklist\n\n- [x] `bun run typecheck` — exit 0 across the monorepo\n- [x] `bun run lint` (Biome) — clean\n- [x] All existing tests pass — zero delta vs `main` (see above)\n- [x] New behaviour is covered by tests — n/a, dependency bump with no\nsource change\n- [x] No `any` introduced — no source change\n- [x] No credentials in logs/IPC/config\n- [x] Platform-specific code behind `PlatformServices` — n/a\n- [x] HITL gate untouched\n\n## Notes for Reviewers\n\nAfter this and the three sdk bumps land, **every P2 Phase 2 edge should\nbe green**, which unblocks the sweep proof that Phase 2's definition of\n*done* requires (`org-drift-sweep.yml`, then record the run number in\nthe P2 progress log).\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)",
          "timestamp": "2026-07-26T21:15:36+03:00",
          "tree_id": "52a4e70b497a613c20987e4185b6c52b8e8dc5dd",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/80277e5de59edc05505f4ace92f63efab8bc0faa"
        },
        "date": 1785091098843,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 262.3882018999986,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 257.78689399999166,
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
          "id": "a4316ae7b65f7b16ebdad05accace9bc33099aeb",
          "message": "feat(audit): P5 gates — secret inventory + Actions allowlist (#845)\n\n## Summary\n\nTwo gates from **P5 Org Legibility**, plus the combined design spec for\nthe four-effort batch (the other three land as their own PRs).\n\n### `audit:secret-inventory` — local, runs on every PR\n\nAsserts every secret this repo's workflows consume appears in **both**\ninventories, and says **which** is missing:\n\n- `scripts/release/credential-registry.ts` — authoritative: owner, type,\nrotation policy, the `secret-health` watch-list.\n- `docs/ci-secrets.md` — the narrative consulted during an incident,\nwhich opens \"the canonical inventory of every GitHub Actions secret the\nNimbus workflows consume\".\n\nThe two failures need different repairs — \"add a row to a table\" vs\n\"this credential is unmanaged\" — so collapsing them into one message\nwould let the serious case hide behind the cosmetic one.\n\n**This axis was genuinely uncovered.** `credential-audit` compares *live\norg secrets* → registry. A secret referenced by a workflow but never\nrecorded is nobody's finding today.\n\n**One-directional on purpose.** `ci-secrets.md` is an *org-wide*\ninventory documenting `VSCE_PAT`/`OVSX_PAT`/`NPM_TOKEN`, consumed by\nother repos' workflows. Gating that direction would red on correct\nentries, and the only way to satisfy it would be deleting true\ninformation from the inventory.\n\n**Red-before → green-after inside this PR.** Five secrets were missing\nfrom the prose doc and are now documented:\n\n| Secret | Introduced by |\n| --- | --- |\n| `SECRET_AUDITOR_CLIENT_ID` / `_PRIVATE_KEY` | the secret-health probe\n**itself** |\n| `CLA_BOT_CLIENT_ID` / `_PRIVATE_KEY` | the CLA program |\n| `BENCHER_API_KEY` | the benchmark workflow |\n\nA correction worth flagging: I first wrote this up as row 3 of the\nroadmap's opening table (\"`ci-secrets.md` never grew to cover\n`secret-health.yml`'s own credentials\") still being unfixed. **Reading\nthe code disproved that** — all five were already in the registry, so\nthis was *narrative* drift, not unmanaged credentials. The spec records\nthe correction.\n\nUnlike the sweep gates, this one is local and deterministic (no token,\nno network), so it joins the preflight `fast` tier — and therefore had\nto be **green at merge**, since a red local gate breaks every subsequent\nPR.\n\n### `audit:actions-allowlist` — network, scheduled sweep\n\nThe gate for the two-day CLA outage:\n`contributor-assistant/github-action` was absent from the Actions\nallowlist, so GitHub rejected `cla.yml` **before any job ran** — 23\nconsecutive `startup_failure`s, a required check that never reported,\nevery PR silently unmergeable. `cla-coverage` was green throughout,\nbecause it verifies a control's *presence*, not its ability to\n*execute*.\n\n**Two halves, and running it live changed the design.**\n\nThe *pattern* half compares each `uses:` against `patterns_allowed` /\n`github_owned_allowed` / same-org. Live, `verified_allowed` is on and\nfive refs (`dessant/lock-threads`, `oven-sh/setup-bun`,\n`googleapis/release-please-action`, `bencherdev/bencher`) are covered\n**only** by it — and no API exposes verified-creator status. My first\nimplementation called that `indeterminate`, which under the program's\nown strict rule is red, making the gate **permanently red for a reason\nnobody can fix**. A gate that is always red is one everybody learns to\nignore, which is exactly the failure this sub-program exists to prevent.\nSo there is now a distinct `unverifiable` verdict that warns but never\nfails; `indeterminate` (a *transient* read failure, which can resolve\nnext run) stays strict-red.\n\nThe *direct* half is the one that actually closes the hole: **any\nworkflow whose most recent run ended in `startup_failure` is a hard\nfinding.** That requires no knowledge of verified status — GitHub\nrejecting the workflow *is* the observable symptom — and it catches\ncauses the pattern half cannot see at all, such as invalid workflow\nYAML. Scoped to each workflow's latest run, so a since-fixed historical\nfailure doesn't red the sweep forever.\n\nBoth are red-proved by **unit test** (including a fixture reproducing\nthe exact CLA case, where adding the pattern flips `not-permitted` →\n`ok`), because the allowlist has since been repaired and cannot\nred-prove against production. Live run is the green-after half:\n\n```\n::warning::audit:actions-allowlist: 5 action ref(s) covered only by verified_allowed (...) — no API exposes verified-creator status\naudit:actions-allowlist: OK — nimbus-agent/Nimbus: ...; no workflow is failing at startup\n```\n\n## Type of Change\n\n- [x] New feature (non-breaking change that adds functionality)\n- [x] CI / tooling\n\n## Non-Negotiables Checklist\n\n- [x] `bun run typecheck` — `bunx tsc -p scripts/tsconfig.json --noEmit`\nexit 0\n- [x] `bun run lint` (Biome) — clean via `bunx biome check\n--error-on-warnings scripts .github docs`; the packaged script reports\n\"Checked 0 files\" inside a `.claude/worktrees/` checkout, a known\nlocal-only false-fail\n- [x] All existing tests pass — **678 pass / 0 fail** across `scripts/`\n- [x] New behaviour is covered by tests — 16 (secret-inventory) + 32\n(actions-allowlist)\n- [x] No `any` — external JSON narrowed with `isRecord`\n- [x] No credentials in logs/IPC/config — the gates read secret\n**names**, never values\n- [x] Platform-specific code behind `PlatformServices` — n/a\n- [x] HITL gate untouched — n/a\n\n## Testing\n\n- `bun test scripts/` — 678 pass, 20 skip, 0 fail\n- `bunx tsc -p scripts/tsconfig.json --noEmit` — exit 0\n- `bun run lint:markdown` — 0 errors; `bun run audit:doc-refs` — 617\nrefs resolve\n- Live runs of both gates, plus the no-`gh` degradation path\n(`::warning::` + exit 0 locally)\n\n## Notes for Reviewers\n\nOne deliberate suppression: `biome-ignore-all\nlint/suspicious/noTemplateCurlyInString` in the secret-inventory tests.\nThe fixtures contain `${{ secrets.X }}` — GitHub Actions expressions,\nnot JS template literals — and writing them any other way would stop\ntesting the matcher against the exact syntax it must parse.\n\nThe spec\n(`docs/superpowers/specs/2026-07-26-p5-p3-infra-batch-design.md`) also\nrecords that **P3's stated gate is already met**: `_structure.yml` runs\n`audit:invariants` and all 17 static checks execute in CI; the one\nbranch `--binary-only` excludes is `db-run`, a census that always exits\n0. P3's real content is the monorepo's missing `.coderabbit.yaml`, which\nlands as its own PR.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **New Features**\n* Added automated audits for workflow secret inventory and Actions\nallowlist compliance.\n* Added checks for workflows that fail to start and for secrets missing\nfrom documentation or registration.\n  * Added commands and CI gates for running these audits.\n\n* **Documentation**\n  * Expanded the CI/CD secrets reference.\n  * Added an infrastructure batch design specification.\n\n* **Tests**\n* Added comprehensive coverage for secret inventory and Actions\nallowlist auditing.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-07-26T21:39:26+03:00",
          "tree_id": "fe1188b86b43b5412a4f5f57ea81e71e2aa5f619",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/a4316ae7b65f7b16ebdad05accace9bc33099aeb"
        },
        "date": 1785092995061,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 307.59834039999913,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 308.3867277999987,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "306811640+nimbus-release-bot[bot]@users.noreply.github.com",
            "name": "nimbus-release-bot[bot]",
            "username": "nimbus-release-bot[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "201e25a2de073955146abfd19b1f4744308be5a4",
          "message": "chore: release main (#850)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n<details><summary>1.1.0</summary>\n\n##\n[1.1.0](https://github.com/nimbus-agent/Nimbus/compare/v1.0.1...v1.1.0)\n(2026-07-26)\n\n\n### Features\n\n* **audit:** action-pin freshness — pinned is not the same as current\n([#847](https://github.com/nimbus-agent/Nimbus/issues/847))\n([fd1e7ae](https://github.com/nimbus-agent/Nimbus/commit/fd1e7ae03019158cbd3796d9e4933263d8687ea1))\n* **audit:** P2 Release Train Phase 2 — dependency-DAG edges\n([#843](https://github.com/nimbus-agent/Nimbus/issues/843))\n([1e8c9ea](https://github.com/nimbus-agent/Nimbus/commit/1e8c9eafdcde6a9f338ce87a613d19e417de8dfa))\n* **review:** give the monorepo a tuned CodeRabbit config\n([#846](https://github.com/nimbus-agent/Nimbus/issues/846))\n([060f50c](https://github.com/nimbus-agent/Nimbus/commit/060f50cda7c240651954cb7294c64d0a249d12a4))\n</details>\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\nCo-authored-by: nimbus-release-bot[bot] <306811640+nimbus-release-bot[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-26T21:39:54+03:00",
          "tree_id": "509b5afbaa9889035d11daaf711ffb950d2cefac",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/201e25a2de073955146abfd19b1f4744308be5a4"
        },
        "date": 1785094036782,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 329.1859893500019,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 325.8291645500005,
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
          "id": "d32a5c03706646799bc5ef03e20f996354c90343",
          "message": "chore(ci): refresh three stale action pins + fix a pin-freshness blind spot (#851)\n\n## Summary\n\nClears the three findings `audit:pin-freshness` shipped red on in #847 —\nand one of them turned out to be a flaw in **my gate**, not a stale pin.\n\n| Action | Change | Risk |\n| --- | --- | --- |\n| `actions/cache` | v5.0.5 → **v6.1.0** (6 call sites) | Major — see\nbelow |\n| `actions/attest-build-provenance` | v4.1.0 → **v4.1.1** (2 sites) |\nPatch, none |\n| `dtolnay/rust-toolchain` | → current `stable` head (3 sites) | See\nbelow |\n\nGate after: **`audit:pin-freshness: OK (30/30 pins current)`**.\n\n## The `actions/cache` major bump deserves a sentence\n\nv6.0.0 is *\"Update packages, migrate to ESM\"* — a packaging/runtime\nchange, not caching semantics. That matters here because\n`.github/actions/setup-nimbus-ci/action.yml` carries an explicit note\nabout `actions/cache@v5`'s tar pack/restore not preserving **Windows NT\njunctions**. Upstream doesn't list that behaviour as changed, so I\nbumped rather than pinned back — but CI is the proof, and the Windows\ncache steps on this PR are the thing to watch.\n\n## `dtolnay/rust-toolchain` — the gate was wrong, not the pin\n\nThe pin is commented `# stable` and deliberately tracks that **branch**.\nMy gate measured it against the newest **release**, `v1` — and `v1`\ncurrently sits **12 commits behind `stable`**:\n\n```\ncompare(stable...v1) → { ahead: 0, behind: 12 }\n```\n\nSo taking the gate at its word would have moved the pin **backwards in\ncode age** purely to turn a check green. That's the failure mode this\nwhole batch has been avoiding: a gate that can only be satisfied by\nmaking the repo worse is a broken gate.\n\nFix: actions that deliberately track a named ref are compared against\n**that ref**, via a deliberately tiny `TRACKED_REF_OVERRIDES` map. Three\ntests keep it honest:\n\n- every value must be a real ref namespace (`heads/…`/`tags/…`) — a bare\n`stable` would 404 and silently degrade the pin to `indeterminate`, i.e.\na mute button dressed as a check;\n- the map is **size-capped**, so it cannot quietly grow into a general\nsuppression list;\n- the rust-toolchain entry asserts it matches the ref its own pin\ncomment names.\n\nThis is the third instance in this batch of the same underlying lesson —\n*don't let a gate report a permanent mismatch as a fixable failure* (cf.\n`unverifiable` in #845 and the no-releases skip in #847).\n\n## Testing\n\n- `bun test scripts/` — **753 pass, 20 skip, 0 fail** (3 new)\n- `bunx tsc -p scripts/tsconfig.json --noEmit` — exit 0\n- biome — clean\n- `audit:action-sha-pins` — OK (every bumped ref is still a full 40-hex\nSHA with a version comment)\n- `audit:secret-inventory` — OK\n- Live `audit:pin-freshness` — 30/30 current\n\n## Type of Change\n\n- [x] CI / tooling\n- [x] Bug fix (the gate blind spot)\n\n## Non-Negotiables Checklist\n\n- [x] `bun run typecheck` — exit 0\n- [x] `bun run lint` (Biome) — clean\n- [x] All existing tests pass — 753\n- [x] New behaviour is covered by tests — 3\n- [x] No `any` introduced\n- [x] No credentials in logs/IPC/config\n- [x] Platform-specific code behind `PlatformServices` — n/a\n- [x] HITL gate untouched — n/a\n\n## Notes for Reviewers\n\nThis unblocks the **P2 sweep proof**: with the pins current, a\ndispatched `org-drift-sweep` should be green across every job, which is\nthe program's definition of *done* for Phase 2.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n- **Chores**\n- Updated CI, security, release, and build automation dependencies to\nnewer verified revisions.\n- Improved caching support for JavaScript, Rust, and browser tooling to\nkeep automated checks current.\n- Updated Rust toolchain references used by development and security\nvalidation workflows.\n\n- **Tests**\n- Added validation to ensure tracked automation references use correctly\nformatted refs and maintain expected stable-toolchain tracking.\n\n- **Security**\n- Refreshed build provenance attestation tooling to support current\nrelease verification practices.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-07-27T02:16:42Z",
          "tree_id": "1ba9b054b28308cd1bf322ec83ddb098356874ae",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/d32a5c03706646799bc5ef03e20f996354c90343"
        },
        "date": 1785119129688,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 251.28987035000029,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 248.29466370000154,
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
          "id": "aad4d70a134c793d0dc8376dea0a6b9798746248",
          "message": "test(cli): stop the update dispatcher tests reading the ambient install channel (#852)\n\n## Summary\n\nEight `runUpdate dispatcher` tests failed on my machine and passed in\nCI. **The cause is not the platform** — it is one environment variable.\n\n`runUpdate` resolves the install channel first and short-circuits with\nan upgrade hint *before* opening any IPC:\n\n```ts\nconst channel = opts.channel === undefined ? resolveDistributionChannel() : opts.channel;\nif (channel !== null) { console.log(channelUpgradeHint(channel)); return; }  // ← no IPC\n```\n\nThat behaviour is correct — a package-managed install must upgrade\nthrough its package manager. But those eight tests omitted\n`opts.channel`, so they called the **real**\n`resolveDistributionChannel()`, which reads\n`NIMBUS_DISTRIBUTION_CHANNEL` from the environment. This box has it set\nto `msi`, so the dispatcher returned early and the mock recorded\n**zero** calls.\n\nThe whole diagnosis in one command:\n\n```\n$ env -u NIMBUS_DISTRIBUTION_CHANNEL bun test packages/cli/src/commands/update.test.ts\n 22 pass  0 fail        # vs 14 pass / 8 fail with it set\n```\n\n**CI passed only because the variable is unset there.** The coverage was\naccidental rather than guaranteed, and any developer who had installed\nthe `.msi` — i.e. anyone dogfooding the installer program — would have\nseen eight phantom failures and gone looking for a bug that wasn't\nthere.\n\n## Fix\n\nEach dispatcher test now passes `{ channel: null }` explicitly, matching\nthe convention the **same file already uses** for the channel cases (`{\nchannel: \"homebrew\" }` at lines 132/140). Injection, not ambient state.\n\nVerified deterministic in both environments:\n\n| | result |\n| --- | --- |\n| with `NIMBUS_DISTRIBUTION_CHANNEL=msi` | 23 pass / 0 fail |\n| without it (CI's condition) | 23 pass / 0 fail |\n\n## Regression guard\n\nRather than only fixing the calls, there's now a test that forces the\nexact broken condition — `NIMBUS_DISTRIBUTION_CHANNEL=msi` — and asserts\nthe dispatcher **still** reaches `updater.applyUpdate`, restoring the\nvariable in a `finally`.\n\n**Red-proved:** dropping the explicit `{ channel: null }` from that\nguard makes it fail, so it genuinely catches the regression rather than\npassing vacuously.\n\n## Correcting my earlier note\n\nI had previously characterised these as *\"Windows-only —\n`withGatewayIpc` bails before dispatch on a named-pipe socket path\"*.\nBoth halves were wrong: nothing here is platform-specific, and the\nsocket is never involved. The named-pipe theory was a plausible-sounding\nguess I hadn't yet tested; tracing `runUpdate` to its first `return`\nshowed the real path.\n\n## Testing\n\n- `bun test packages/cli/src` — **1801 pass / 0 fail** (was 1792 / 8\nfail)\n- `bunx tsc -p packages/cli/tsconfig.json --noEmit` — exit 0\n- biome — clean\n\n## Type of Change\n\n- [x] Bug fix (non-breaking change that fixes an issue) — test-only; no\nproduct code touched\n- [x] Test improvement\n\n## Non-Negotiables Checklist\n\n- [x] `bun run typecheck` — exit 0\n- [x] `bun run lint` (Biome) — clean\n- [x] All existing tests pass — 1801\n- [x] New behaviour is covered by tests — 1 regression guard, red-proved\n- [x] No `any` introduced\n- [x] No credentials in logs/IPC/config/fixtures\n- [x] Platform-specific code behind `PlatformServices` — n/a\n- [x] HITL gate untouched — n/a\n\n## Notes for Reviewers\n\nNo product code changed. `runUpdate`'s short-circuit is correct as\nwritten, and the channel path keeps its own coverage via the existing `{\nchannel: \"homebrew\" }` cases.\n\nWorth noting the class of bug: a test that reads ambient environment\ndoesn't fail loudly — it silently stops testing what it claims to. Here\nthe dispatch path was simply never exercised on any machine with the\nvariable set.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Bug Fixes**\n* Fixed update command behavior when the distribution channel is set to\nMSI, ensuring confirmed updates are correctly applied.\n* Improved consistency across update checks, confirmations, release-note\nflows, and interactive terminal prompts.\n* Prevented ambient environment settings from causing inconsistent\nupdate command results.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->",
          "timestamp": "2026-07-27T05:24:24+03:00",
          "tree_id": "c9bdd860bdb103c5ae361d9948fcfc785a74b376",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/aad4d70a134c793d0dc8376dea0a6b9798746248"
        },
        "date": 1785119828140,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 305.88299795000205,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 307.3333941500059,
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
          "id": "f9f3451f41d6cf73fd57ad2a3d6b85d9c87f7db0",
          "message": "docs(infra): close P2 Phase 2, P5, and the P1 Plan-B follow-up (sweep 30231918767) (#853)\n\n## Summary\n\nA dispatched `org-drift-sweep` on `main` came back **15/15 green** — the\n**first fully green sweep this program has had**. That closes three open\nitems by this file's own bar: *a gate is done when it is green in CI and\nwould go red on regression, not when its code merges.*\n\n[Run\n30231918767](https://github.com/nimbus-agent/Nimbus/actions/runs/30231918767):\n\n```\nOVERALL: success\nsuccess  release-staleness      success  pin-freshness        success  actions-allowlist\nsuccess  cla-coverage           success  ruleset-drift        success  org-settings-drift\nsuccess  team-reachability      success  sha-pins (×8)\n```\n\n## What this closes\n\n**P2 Phase 2 — done.** `release-staleness` reports **`OK (12 edges\ncurrent)`**: Phase 1's five channel edges plus Phase 2's seven\ndependency edges. Red-before / green-after on real drift, then green in\nthe scheduled harness.\n\nWhat made it green was **remediation at the source, not a gate change**\n— and the two halves needed opposite fixes, which is precisely the\nasymmetry that justifies reading the lockfile rather than the declared\nrange:\n\n| Consumer | Fix | Why |\n| --- | --- | --- |\n| `client:Nimbus`, `client:nimbus-vscode` | **manifest** edit | a caret\non a `0.x` pins the *minor*, so `^0.5.0` could never reach 0.12.1 |\n| the sdk edges | lockfile refresh | `^1.3.0` already permitted 1.7.0 |\n\n**P5 — both gates delivered and green.** `audit:actions-allowlist` found\na *second* live instance of the CLA failure mode on its first correct\nrun: `Lock Threads` had been rejected at startup **every night since at\nleast 2026-07-24** because `dessant/lock-threads` was absent from the\nActions allowlist. Fixed, and proved by dispatch — the workflow now\ncompletes `success`.\n\nAlso records a correction: the five \"missing\" secrets were **narrative\ndrift, not unmanaged credentials** — all five were already in\n`credential-registry.ts`. I had first written this up as row 3 of the\nopening table still being unfixed; reading the code disproved it.\n\n**P1 — Plan B closed.** The freshness follow-up deferred from the very\nfirst sweep now exists, shipped red on three genuinely stale pins, and\nis green at 30/30.\n\n**P3 — corrected, not ticked.** Its stated gate (*\"an invariant\nviolation is caught in CI\"*) was **already met**: `_structure.yml` runs\n`audit:invariants` and all 17 static checks execute there; the one\nbranch `--binary-only` excludes is a *census* that always exits 0. The\nreal gap was the monorepo's missing `.coderabbit.yaml`, which #846\nclosed.\n\n## One rule promoted out of code comments\n\nThe batch hit the same design error **four times across three gates**,\nso it now sits in the operating principles rather than three scattered\ncomments:\n\n> **A gate must never report a permanent mismatch as a fixable\nfailure.** Distinguish a **transient** unknown (a read failed, may\nsucceed next run) from a **permanent** one (no API can answer, or the\nquestion doesn't apply). Only the transient kind may be strict-red.\n\nThe four instances: `verified_allowed` being unknowable; a repo that\npublishes no releases; a pin tracking `stable` whose newest *release* is\n12 commits behind it; and a failed date read manufacturing a `stale`.\n\nThe third is the sharpest — the gate's only route to green was **moving\na pin backwards in code age**. A gate that is always red is one\neverybody learns to ignore, which is indistinguishable from having no\ngate at all: the exact failure this document exists to prevent.\n\nInstance 4 was caught by CodeRabbit citing `_Source: Path instructions_`\n— the `.coderabbit.yaml` rule shipped in #846 one PR earlier. **The\nreview layer caught a violation of a rule the review layer had just been\ntaught**, which is the first hard evidence P3 does real work.\n\n## Testing\n\n- `bun run lint:markdown` — 0 errors\n- `bun run audit:doc-refs` — 622 refs across 16 docs, all resolve\n- `lychee --config lychee.toml 'docs/**/*.md' '*.md'` — 1066 links, **0\nerrors**\n\nDocs-only; no code changed.\n\n## Type of Change\n\n- [x] Documentation only\n\n## Non-Negotiables Checklist\n\n- [x] `bun run typecheck` — n/a, no code changed\n- [x] `bun run lint` — n/a; markdown lint clean\n- [x] All existing tests pass — n/a, docs-only\n- [x] No credentials in logs/IPC/config — secret **names** only, as\nalready documented\n\n## Notes for Reviewers\n\nRemaining after this: the P5 legibility dashboard, P4b (latency), the P6\nbypass-actor audit, and P3's open question of whether a Claude-based\nreview action is still wanted now that the config exists — which the\ndesign deliberately left to be answered by evidence.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)",
          "timestamp": "2026-07-27T05:33:32+03:00",
          "tree_id": "f4b868297cce1134b3b7f7ef5e4b621e901c053f",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/f9f3451f41d6cf73fd57ad2a3d6b85d9c87f7db0"
        },
        "date": 1785120558541,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 334.4445933999967,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 329.6601608000063,
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
          "id": "bb729c5b55f3d64823a29e1b15bdd7e6c85a110a",
          "message": "fix(ci): retry the Rust toolchain install, drop the redundant one, and close #809/#810/#812 (#855)\n\nAddresses the failure in [run\n30232465108](https://github.com/nimbus-agent/Nimbus/actions/runs/30232465108)\nand the repo's open issues. Closes #809, #810, #812. (#854 is a bot\nrelease-health alert — every row `ok` except the already-tracked\n`VSCE_PAT` 2026-09-20 deadline; nothing to fix in code.)\n\n## 1. The CI failure\n\n`Cargo deny` died in **`Setup Rust`** — cargo-deny itself never ran.\n`rustup toolchain install 1.95.0` took a TLS reset from\n`static.rust-lang.org` (`Connection reset by peer`, os error 104).\nHarden Runner is on `egress-policy: audit` here, so nothing was blocked;\nit was simply an unretried single point of failure, and there were\n**four** copies of it.\n\n**The failing step did not need to exist.** `cargo-deny-action` is a\n*Docker* action on `rust:1.85.0-alpine3.20` that brings its own cargo\nand resolves `rust-toolchain.toml` inside the container — the host\ntoolchain is never consulted. That step is deleted, with a comment so it\ndoes not come back.\n\nThe three genuine host installs now go through\n`.github/actions/setup-rust-toolchain`: three attempts, 10s then 20s\nbackoff, propagating the last exit code so a real failure still fails.\n\nTwo things were settled by experiment rather than assumption:\n\n- **Pre-warming does not work.** rustup re-syncs the channel manifest on\n*every* `toolchain install`, even for an already-installed pinned\nversion — verified by pointing `RUSTUP_DIST_SERVER` at an unresolvable\nhost with 1.95.0 already on disk; it still failed. So the retry must\nwrap the install itself.\n- **`continue-on-error` is unavailable to composite-action steps**,\nwhich is why the retry is in-script rather than the usual two-step\nwrapper.\n\nFallout worth noting:\n\n- `rust-toolchain.toml` is now the single source of truth — the action\nparses `channel` and `components` from it, so the 1.95.0 pin is no\nlonger copy-pasted into `codeql.yml` and `security.yml`, and that file's\n\"when bumping this, also update …\" comment describes something that can\nno longer drift.\n- `setup-rust-tauri` passed no `toolchain:`, so it installed\n**`stable`** and then `rust-toolchain.toml` pulled 1.95.0 down a\n*second* time on the first `cargo fmt` — two toolchains, two unretried\ndownloads. Now one.\n- `dtolnay/rust-toolchain` is unused, so its dependabot group entry and\n`TRACKED_REF_OVERRIDES` pin-freshness entry are retired. A stale\noverride is dead config no gate would catch (an override for an unpinned\naction is silently never consulted), so the test asserting the dtolnay\nentry is replaced by one asserting **every** override still names an\naction the repo actually pins, checked against the real `.github` tree.\n\n**Live proof:** dispatched `security.yml` on this branch — [run\n30280225651](https://github.com/nimbus-agent/Nimbus/actions/runs/30280225651)\nis fully green, and the `Cargo audit` log shows `Installing Rust 1.95.0\n(components: rustfmt,clippy)` parsed from the TOML.\n\n## 2. #812 — the connector-auth suite depended on winning a race\n\n`… google_drive …` timed out at 5000ms in the combined\n`packages/gateway/src/ipc/` run and passed in ~190ms alone. Not a timer\nleak and not `mock.module` — a premise that only holds when the file\nwins a race.\n\n`Config` is a module-level literal, so it snapshots every\n`NIMBUS_OAUTH_*` var **once, at first import**. The suite blanked those\nvars then imported lazily, which only works if it is the first file in\nthe process to load `config.ts`. A sibling gets there first, the\nblanking becomes a no-op, and `Config.oauthGoogleClientId` keeps\nwhatever the developer has configured. `google_drive` then walks past\nthe `clientId === \"\"` guard into `runPKCEFlow` — **a live local redirect\nlistener and a real request to Google using the developer's own\ncredentials** — and hangs. Only google failed because it is the only\nprovider most machines configure; CI never failed because CI has no\nclient id at all.\n\nProven, not inferred: adding only `NIMBUS_OAUTH_GOOGLE_CLIENT_ID=\"\"` to\nthe outer environment takes the combined run from 1341 pass / 1 fail to\n**1342 / 0**.\n\nThe issue asks for the masking to be fixed rather than the timeout\nraised, so the ordering dependency is removed: provider arms are\nasserted directly on the now-exported, pure\n`oauthClientConfigForProvider`, and the fail-closed guards are asserted\nthrough `handleConnectorAuth` with an **injected**\n`resolveOAuthClientConfig`, so emptiness is established *by the test*.\n`runPKCEFlow` is unreachable from this suite by construction, on any\nmachine.\n\nNet coverage change: the empty-client-id guard is now exercised for\n**all 12** providers instead of only those a given box leaves\nunconfigured; `workday` gains an arm test it never had; and the\nclient-secret-required guard is covered for the first time — it needs a\n*non-empty* client id, so the old env-driven suite could never reach it.\n14 tests → 29. The env-blanking preamble and its `afterAll` restore are\ngone, removing this file's own process-wide `process.env` mutation — the\nsame hazard class the failure came from.\n\n## 3. #809 / #810 — notification contracts\n\nBoth were filed against the gateway because *which* notifications are\npublic contract is a gateway decision. Payload shapes are now recorded\nin `docs/architecture.md`, read off the emit sites:\n\n- `connector.configChanged` carries the full post-mutation snapshot `{\nservice, intervalMs, depth, enabled }`.\n- `workflow.run({ stream: true })` has **no chunk method of its own** —\nit reuses the untagged `agent.chunk { text }`, the same notification\n`engine.askStream` emits. #810 asked for surface-vs-retire;\n**surfaced**, since the emission already works.\n\nThe consequence bounds what any client can offer and is stated\nexplicitly: those chunks carry no stream id, so a caller cannot\nattribute a chunk to a run. Adding one is gateway work and stays open in\nthe ecosystem roadmap.\n\nClient half: **nimbus-agent/nimbus-client#39** (green), adding\n`subscribeConnectorConfigChanged` and `workflowRunStream`.\n\n## Verification\n\nFull gateway suite **8832 pass / 0 fail** across 665 files. Typecheck,\nbiome (via `bunx biome check packages scripts` — `bun run lint` reports\n0 files inside `.claude/worktrees`), `audit:invariants`, `structure`,\n`boundaries`, `any`, `cross-platform`, `exclusion-parity`,\n`openapi-drift`, `readme-cli`, `package-readmes`, `svg-assets`,\n`consumed-by`, `release-please`, `action-sha-pins`, `actions-allowlist`,\n`doc-refs` (622 refs), markdownlint, and lychee (1008 OK / 0 errors,\nwhole branch) all clean.\n\nBoth new guards red-proven: mis-routing the google arm fails the arm\ntest, and deleting the empty-client-id guard fails the fail-closed test\nfor **every** provider. The retry loop was red-proven to exhaust 3\nattempts and propagate the exit code, and the action script was run\nend-to-end against a simulated GHA environment.\n\n**One gate I could not run locally:** `audit:coverage-floor` is\nLinux-authoritative via Docker, and Docker is not running on this\nmachine. `auth.ts` is not in the baseline (it already clears both\nfloors) and the change only adds covered paths, so it should be\nunaffected — but CI is the authority here, not that reasoning.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-27T16:40:51Z",
          "tree_id": "b3afe25a39ce9f0e48f9b4619d3d20ee43b05fe4",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/bb729c5b55f3d64823a29e1b15bdd7e6c85a110a"
        },
        "date": 1785171250420,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 321.2874537499956,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 317.09793944999257,
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
          "id": "62a8d339fc535a20e9a2fd3270958725f8e6b604",
          "message": "chore(deps): consolidate 20 dependabot PRs and stop the weekly fan-out (#878)\n\nReplaces #857, #858, #859, #860, #861, #862, #863, #864, #865, #866,\n#867, #868, #869, #870, #871, #872, #873, #874, #875, #876.\n\nEvery one of those was `BLOCKED` with `CANCELLED` checks. Twenty PRs\nopened at once, each triggering the full `pr-quality` matrix, all\nsharing a concurrency group — they cancelled each other and **none of\nthem could ever go green**. Batching is the fix; the config change stops\nit happening again.\n\n## Dependencies\n\n**GitHub Actions** — `actions/checkout` v7.0.0→v7.0.1 ·\n`actions/setup-node` v6.4.0→v7.0.0 · `softprops/action-gh-release`\nv3.0.1→v3.0.2 · `github/codeql-action` v4 SHA refresh ·\n`bencherdev/bencher` v0.6.8→v0.6.11\n\n**Cargo** — `tokio` 1.52.3→1.53.1 · `serde_json` 1.0.150→1.0.151 ·\n`thiserror` 2.0.18→2.0.19 · `tauri-plugin-log` 2.8.0→2.9.0 ·\n`tauri-plugin-dialog` 2.7.1→2.7.2\n\n**Bun** — `jsdom` ^29→^30 · `@testing-library/jest-dom` ^6→^7 · `vitest`\n+ `@vitest/coverage-v8` ^4.1.10 · `@radix-ui/react-dialog` ^1.1.23 ·\n`react-window` ^2.3.0 · `@tauri-apps/{api,cli}` · `msw` ^2.15.0 ·\n`@clack/prompts` ^1.7.0 · `markdownlint-cli2` ^0.23.2 · `@astrojs/check`\n^0.9.10 · `@biomejs/biome` ^2.5.5\n\nAlso bumps `github/codeql-action/autobuild`, which had no Dependabot PR\nof its own. `init`/`autobuild`/`analyze` must share a version, so moving\ntwo of three would have been the broken state, not the safe one.\n\n## Two things the batch caught that the individual PRs hid\n\n**#867 would have broken `main`.** `react-dom` was bumped to 19.2.8 with\nno matching `react` bump. React refuses to boot on a version mismatch —\n*\"the react and react-dom packages must have the exact same version\"* —\nand that PR **alone fails 47 of 74 UI test files**. `react` is bumped to\nmatch here, and `react`/`react-dom`/`@types/react*` are now a coupled\ngroup so a future major can't split them again.\n\n**TypeScript ^6.0.3 → ^7.0.2 is held back** (half of #861), verified\nrather than assumed. Under 7.0.2, `bun run typecheck` crashes\n`@astrojs/language-server`:\n\n```\nundefined is not an object (evaluating 'this.ts.sys.fileExists')\n  at getTsconfig (@astrojs/language-server/dist/check.js:162:69)\n```\n\nTS 7 drops the `ts.sys` surface it reaches into, and `@astrojs/check`\nstill declares `typescript: ^5.0.0 || ^6.0.0` — upstream's stated range,\nnot a local quirk. Added to `ignore` with that reasoning recorded. The\n`@biomejs/biome` half of #861 **is** included. Revisit when\n`@astrojs/check` ships TS 7 support; `CLAUDE.md` and `GEMINI.md` both\npin \"TypeScript 6.x strict\" and must move with it.\n\n## Why twenty PRs happened\n\nThree independent gaps in `dependabot.yml`, all closed:\n\n1. **`cargo` had no groups at all** — one PR per crate (5 of the 20).\n2. **The `actions` group listed `github/codeql-action`**, which does\n*not* match the `github/codeql-action/init` form the workflows actually\nuse. It also never listed `bencherdev/*`, `step-security/*`,\n`EmbarkStudios/*`. Everything unlisted got its own PR. Replaced with `*`\n— a hand-maintained roster of action names is exactly the list that\nsilently stops matching.\n3. **`bun` grouped only five families**, so every other package was its\nown PR.\n\nEach ecosystem now leads with a catch-all **minor+patch** group, listed\nfirst because Dependabot assigns a dependency to the first group it\nmatches. Majors are deliberately excluded from it: a major needs to be\nread, and burying one in a 30-package PR is how a breaking change lands\nunnoticed. The major-only groups that follow cover sets that break when\nsplit (react, ui-testing, tooling, playwright, tauri-js, types).\n\nExpected steady state: **~1–3 PRs/week instead of ~20.**\n\n## Verification\n\n| Gate | Result |\n|---|---|\n| `typecheck` | clean |\n| `biome check` (2.5.5) | clean |\n| `lint:markdown` (0.41.1) | 0 issues, 72 files |\n| UI tests | **74/74 files, 506/506 tests** — jsdom 30 + jest-dom 7 +\nradix + matched React |\n| gateway + CLI | **10633 pass / 0 fail**, 770 files |\n| `cargo check --all-targets` | clean |\n| `cargo clippy -D warnings` | clean |\n| `cargo fmt --check` | clean |\n| audits | `action-sha-pins`, `actions-allowlist`, `pin-freshness`,\n`js-licenses`, `structure`, `invariants` all OK |\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Chores**\n* Updated development, documentation, UI, testing, and build tooling\ndependencies.\n* Refreshed automated security, documentation, performance, release, and\ntesting workflows with newer action versions.\n* Improved automated dependency update grouping to reduce unnecessary\nupdate notifications and keep related packages aligned.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-27T18:19:10Z",
          "tree_id": "a0d5f978751bfae346cf50fa6f999a04349a34bb",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/62a8d339fc535a20e9a2fd3270958725f8e6b604"
        },
        "date": 1785177253707,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 315.6548265999998,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 312.34363644999974,
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
          "id": "6ffe23f3f0f9d94601ff4b9a23a48b3d3fc3f2a7",
          "message": "feat(audit): P4b — measure CI latency before tuning anything (#877)\n\n## Summary\n\n**P4b Latency**, the last un-started sub-program. This slice ships the\n*measurement layer and the regression gate* — and deliberately **no\ntuning**, because the first real measurement showed the\ndesign-of-record's proposed levers would have missed.\n\n`audit:ci-latency` samples per-job timings from the Actions API across\nthe 9 org repos, summarises them per `(repo, workflow, job)`, and fails\nwhen a job's execution median regresses beyond **its own measured noise\nband**. Committed baseline: **197 keys from 1778 observations**.\n\n## The measurement reframed the sub-program\n\nPrinciple #3 of the program is *\"reduce latency — but only against\nmeasurement, never against a hunch.\"* The design of record then offered\na hunch: cache tuning, matrix sharding, finer path filters. Breaking\ndown the slowest run (73.8 min):\n\n| | |\n| --- | --- |\n| Longest single job **execution** | **12.3 min** |\n| Longest **DAG wait** (blocked by `needs`) | **33.9 min** |\n| Longest **runner queue** (true contention) | **31.6 min** |\n\nExecution is not the binding constraint, so cache tuning and path\nfilters address the wrong thing — and **sharding would make it worse**,\nadding jobs to an already-contended pool. Contention concentrates almost\nentirely on **macOS**, which is the actionable lead for the eventual\ntuning slice.\n\n## Three design decisions worth your eye\n\n**1. Three metrics, kept separate — and `queue` is not what it looks\nlike.**\n\n```\nexec    = completed_at − started_at\nqueue   = started_at   − created_at      ← DAG-free contention\ndagWait = created_at   − run_started_at\n```\n\nA job's `created_at` marks **eligibility**, not run creation: verified\nlive, 203 of 301 sampled jobs show a shifted `created_at`, and every\nshifted one declares `needs:`. The obvious `started_at − run_started_at`\nwould bill every downstream job for its dependencies' execution — that\nerror produced an earlier \"80% of wall-clock is queueing\" claim in the\nspec, which the design review caught and this PR's docs correct.\n\n**2. Only `exec` is gated. `queue`, `dagWait` and job instability are\nobserved.** None is caused by the change under test — queue wait moves\nwith how many PRs are open. Gating them would report conditions a\ncontributor cannot fix, which is the operating rule the roadmap gained\nafter hitting it four times last batch.\n\n**3. The tolerance is a per-key noise band, not a constant.** From the\ncommitted baseline:\n\n| job | median | spread (`p90 − median`) |\n| --- | --- | --- |\n| `Static — ubuntu-24.04` | 4.57 | **0.15** |\n| `Unit + Coverage — windows-2025` | 13.2 | **10.48** |\n\nA ~70× gap between two jobs in the same workflow. No global constant\nserves both: a 3-minute cap would make the Windows job fire constantly\non its honest spread; a flat 50% would let a 6-minute Ubuntu regression\nthrough.\n\n## ⚠️ Green here is not evidence the gate works\n\nThe baseline is generated from the same window the check reads, so\n**nothing can exceed it on the first run**. The red-proof is\n`evaluate.test.ts`, which drives a real median past a real stored band\nand asserts the finding — with three complements (within-band,\nwide-band, absolute floor) that each fail if the comparison is inverted\nor the band globalised.\n\n## What review caught\n\nSix fix rounds across seven tasks, every one a real defect — and the two\nmost serious originated in the plan, not the implementation:\n\n- **Job pages truncated at 100.** Run `30232465196` reports\n`total_count: 105`. The five dropped were the `E2E Desktop` legs —\nabsent from the baseline entirely. One is a **13-minute job**, exactly\nthe long-tail work a latency gate exists to watch. Now paged, bounded by\n`MAX_JOB_PAGES`.\n- **`--update-baseline` deleted sparse keys**, conflating \"gone\" with\n\"observed but rare\". The 42 `Release ::` keys were the live case:\nregenerate in a quiet fortnight and they vanish, returning as ungated\n`new-key`. Coverage would erode into a silent false green.\n- **p90 formula.** The plan's test and implementation contradicted each\nother; the first fix changed the code to match the test, which made `p90\n≡ max` and widened the noisiest job's band ~6×. The test was the bug.\n\n## Testing\n\n- `bun test scripts/` — **817 pass / 0 fail**\n- `tsc --noEmit` exit 0 · biome clean · `audit:action-sha-pins` OK ·\n`audit:secret-inventory` OK\n- `lint:markdown` 0 errors · `audit:doc-refs` 624 refs resolve · lychee\n1071 links, **0 errors**\n- Live run exit 0; degradation paths verified (no auth → warn + exit 0;\n`--strict` → error + exit 1)\n\n## Type of Change\n\n- [x] New feature (non-breaking change that adds functionality)\n- [x] CI / tooling\n\n## Non-Negotiables Checklist\n\n- [x] `bun run typecheck` — exit 0\n- [x] `bun run lint` (Biome) — clean via `bunx biome check\n--error-on-warnings scripts .github docs` (the packaged script\nfalse-fails inside `.claude/worktrees/`)\n- [x] All existing tests pass — 817\n- [x] New behaviour is covered by tests — 56 in `scripts/ci-latency/`\n- [x] No `any` — external JSON narrowed with `isRecord`\n- [x] No credentials in logs/IPC/config — all reads public, `actions:\nread` only\n- [x] Platform-specific code behind `PlatformServices` — n/a\n- [x] HITL gate untouched — n/a\n\n## Notes for Reviewers\n\n**One residual is parked, not fixed:** `evaluate.test.ts:44` cites a\nstale spread of `14.5` where the real value is `10.48`. It's a comment —\nno assertion depends on it — but it is the third instance of this\nstale-figure class in this branch, so it deserves a one-line follow-up.\n\nThe `ci-latency` sweep job has never executed (branch-new,\ndispatch-scheduled), so its first real run is post-merge — same as every\nprior gate in this program.\n\nRemaining for P4b: the tuning slice itself, which must be justified\nagainst this data. macOS runner contention is the first lead.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n## Summary by CodeRabbit\n\n* **New Features**\n* Added a CI latency audit gate across audited repositories and\nworkflows.\n* Detects execution-time regressions using a persisted baseline, with\nsafeguards for insufficient/unreliable measurements.\n* Reports runner queue and dependency-wait metrics as informational\nwarnings (not gate failures).\n* Added commands to run the audit and update the baseline, plus a CI job\nto run the latency check.\n* **Documentation**\n* Added/expanded design, verification, and baseline/progress\ndocumentation for CI latency monitoring.\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-27T21:29:23+03:00",
          "tree_id": "a077947bab8ee8cdc8b3e3dbdbaa284d0bfb451b",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/6ffe23f3f0f9d94601ff4b9a23a48b3d3fc3f2a7"
        },
        "date": 1785179497093,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 317.75158809999704,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 319.7415669999915,
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
          "id": "30ad04cdab9ff2295978c87b38dbde2ce2521bb5",
          "message": "chore(ci): bump actions/labeler from 6.1.0 to 7.0.0 in the actions-major group (#883)\n\nBumps the actions-major group with 1 update:\n[actions/labeler](https://github.com/actions/labeler).\n\nUpdates `actions/labeler` from 6.1.0 to 7.0.0\n<details>\n<summary>Release notes</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/actions/labeler/releases\">actions/labeler's\nreleases</a>.</em></p>\n<blockquote>\n<h2>v7.0.0</h2>\n<h2>What's Changed</h2>\n<h3>Enhancements:</h3>\n<ul>\n<li>Migrate to ESM and update dependencies by <a\nhref=\"https://github.com/chiranjib-swain\"><code>@​chiranjib-swain</code></a>\nin <a\nhref=\"https://redirect.github.com/actions/labeler/pull/949\">actions/labeler#949</a></li>\n</ul>\n<p><strong>Full Changelog</strong>: <a\nhref=\"https://github.com/actions/labeler/compare/v6...v7.0.0\">https://github.com/actions/labeler/compare/v6...v7.0.0</a></p>\n<h2>v6.2.0</h2>\n<h2>What's Changed</h2>\n<h3>Bug Fix</h3>\n<ul>\n<li>Improve PR number validation and warning messages in input handling\nby <a\nhref=\"https://github.com/chiranjib-swain\"><code>@​chiranjib-swain</code></a>\nin <a\nhref=\"https://redirect.github.com/actions/labeler/pull/939\">actions/labeler#939</a></li>\n</ul>\n<h3>Dependency Updates</h3>\n<ul>\n<li>Bump js-yaml to 4.2.0, apply npm audit fix, and add undici override\nby <a href=\"https://github.com/dependabot\"><code>@​dependabot</code></a>\nin <a\nhref=\"https://redirect.github.com/actions/labeler/pull/943\">actions/labeler#943</a></li>\n<li>Bump <code>@​typescript-eslint/eslint-plugin</code> from 8.59.1 to\n8.61.1 by <a\nhref=\"https://github.com/dependabot\"><code>@​dependabot</code></a> in <a\nhref=\"https://redirect.github.com/actions/labeler/pull/942\">actions/labeler#942</a></li>\n</ul>\n<p><strong>Full Changelog</strong>: <a\nhref=\"https://github.com/actions/labeler/compare/v6.1.0...v6.2.0\">https://github.com/actions/labeler/compare/v6.1.0...v6.2.0</a></p>\n</blockquote>\n</details>\n<details>\n<summary>Commits</summary>\n<ul>\n<li><a\nhref=\"https://github.com/actions/labeler/commit/bf12e9b00b37c5c0ca2b87b79b2daf7891dbda13\"><code>bf12e9b</code></a>\nfeat: migrate to ESM and update dependencies (<a\nhref=\"https://redirect.github.com/actions/labeler/issues/949\">#949</a>)</li>\n<li><a\nhref=\"https://github.com/actions/labeler/commit/b8dd2d9be0f68b860e7dae5dae7d772984eacd6d\"><code>b8dd2d9</code></a>\nBump <code>@​typescript-eslint/eslint-plugin</code> from 8.59.1 to\n8.61.1 (<a\nhref=\"https://redirect.github.com/actions/labeler/issues/942\">#942</a>)</li>\n<li><a\nhref=\"https://github.com/actions/labeler/commit/53affe8ca4150876fc7eb7d268d3a1f74511a244\"><code>53affe8</code></a>\nBump js-yaml to 4.2.0, apply npm audit fix, and add undici override for\n0 vul...</li>\n<li><a\nhref=\"https://github.com/actions/labeler/commit/f612d9ad188e81643862c2de70f57fbb1d17abd1\"><code>f612d9a</code></a>\nFix: Improve PR number validation and warning messages in input handling\n(<a\nhref=\"https://redirect.github.com/actions/labeler/issues/939\">#939</a>)</li>\n<li>See full diff in <a\nhref=\"https://github.com/actions/labeler/compare/f27b608878404679385c85cfa523b85ccb86e213...bf12e9b00b37c5c0ca2b87b79b2daf7891dbda13\">compare\nview</a></li>\n</ul>\n</details>\n<br />\n\n\n[![Dependabot compatibility\nscore](https://dependabot-badges.githubapp.com/badges/compatibility_score?dependency-name=actions/labeler&package-manager=github_actions&previous-version=6.1.0&new-version=7.0.0)](https://docs.github.com/en/github/managing-security-vulnerabilities/about-dependabot-security-updates#about-compatibility-scores)\n\nDependabot will resolve any conflicts with this PR as long as you don't\nalter it yourself. You can also trigger a rebase manually by commenting\n`@dependabot rebase`.\n\n[//]: # (dependabot-automerge-start)\n[//]: # (dependabot-automerge-end)\n\n---\n\n<details>\n<summary>Dependabot commands and options</summary>\n<br />\n\nYou can trigger Dependabot actions by commenting on this PR:\n- `@dependabot rebase` will rebase this PR\n- `@dependabot recreate` will recreate this PR, overwriting any edits\nthat have been made to it\n- `@dependabot show <dependency name> ignore conditions` will show all\nof the ignore conditions of the specified dependency\n- `@dependabot ignore <dependency name> major version` will close this\ngroup update PR and stop Dependabot creating any more for the specific\ndependency's major version (unless you unignore this specific\ndependency's major version or upgrade to it yourself)\n- `@dependabot ignore <dependency name> minor version` will close this\ngroup update PR and stop Dependabot creating any more for the specific\ndependency's minor version (unless you unignore this specific\ndependency's minor version or upgrade to it yourself)\n- `@dependabot ignore <dependency name>` will close this group update PR\nand stop Dependabot creating any more for the specific dependency\n(unless you unignore this specific dependency or upgrade to it yourself)\n- `@dependabot unignore <dependency name>` will remove all of the ignore\nconditions of the specified dependency\n- `@dependabot unignore <dependency name> <ignore condition>` will\nremove the ignore condition of the specified dependency and ignore\nconditions\n\n\n</details>\n\nSigned-off-by: dependabot[bot] <support@github.com>\nCo-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-27T21:30:24+03:00",
          "tree_id": "965f8a12f5debaafb88d9aa8ce8b75cda58a68da",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/30ad04cdab9ff2295978c87b38dbde2ce2521bb5"
        },
        "date": 1785181923999,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 314.28911110000155,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 313.0036482499912,
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
          "id": "22938ac57788eed724d1ab6a28553bb7138b7631",
          "message": "fix(perf): stop a huggingface.co stall from blowing the 45m bench timeout (#885)\n\n## What broke\n\n[`Bench\n(ubuntu-24.04)`](https://github.com/nimbus-agent/Nimbus/actions/runs/30300911723/job/90093517497)\nwas **cancelled on the job's `timeout-minutes: 45`**, not on any\nmeasurement.\n\nWorth stating up front, because it inverts the usual read of a red perf\nleg: **individual surface failures are tolerated.** `bench-cli.ts`\nrecords them as `S<n> failed: …` and still exits 0. On Linux, S1 / S4 /\nS6-\\* / S7-a / S7-b fail on *every* run (the spawned gateway child can't\ninit the Vault), and [the green leg 90 minutes\nearlier](https://github.com/nimbus-agent/Nimbus/actions/runs/30294063937)\nhad exactly those failures and finished in 11m48s. Wall-clock is the\nonly thing that reds this job.\n\n## Root cause\n\nThe outage was the trigger; the amplifier was ours.\n\n1. **Trigger (transient)** — huggingface.co became unreachable from the\nrunner. The Harden Runner DNS trace shows `huggingface.co` returning\nAAAA-only records, re-queried every 25 s, never connecting. The 12 S8\ncells need `Xenova/all-MiniLM-L6-v2`, fetched live on a cold cache.\n2. **Amplifier (structural)** —\n`bench-embedding-throughput.ts::getEmbedder()` called\n`createLocalEmbedder()` **fresh for every cell**. With nothing on disk,\neach cell independently paid the full `@xenova/transformers` failure\nladder — **~6m45s each**, measured off consecutive log timestamps. 12 ×\nthat ≈ **81 min** of dead wall-clock.\n\nThe job died at cell 6 of 12 (`S8-l500-b1`), which is *before* the\nstep's own `for attempt in 1 2` retry could run — so no artifact and no\nhistory line either.\n\nA resource load placed inside a fan-out surface is paid N times, so a\ntransient failure is multiplied by the fan-out factor rather than\nbounded by it.\n\n## The fix\n\n**`bench-embedding-throughput.ts`** — memoise the MiniLM load per cache\ndir for the process lifetime. The **rejected** promise is cached\ndeliberately: one stall now costs one attempt instead of twelve, so the\nleg finishes and still reports its other surfaces. Injection goes\nthrough a new `opts.createEmbedder` DI seam rather than `mock.module`,\nper the repo's CI-Linux guidance.\n\n**`_perf.yml`** — belt-and-braces, `actions/cache` the weights at `${{\nrunner.temp }}/perf-models` and point the bench at them via\n`NIMBUS_EMBEDDING_MODEL_DIR`. This takes huggingface.co off the critical\npath entirely, so S8 stays *measurable* rather than merely failing fast.\nBump the key's `-v1` when the model pin in\n`embedding/load-feature-extraction-pipeline.ts` changes —\n`actions/cache` never overwrites an existing key.\n\nModel load sits outside the timed window (there's already an explicit\nwarm-up embed before `t0`), so none of this shifts what S8 measures.\n\n## Verification\n\n- **4 new tests, all red-proven** — with the memo disabled, the failure\ntest reports `Received: 12` instead of `1`.\n- `bun test packages/gateway/src/perf/` — 259 pass, 0 fail.\n- `bun run preflight:fast` — **PASSED**, all 20 gates (incl.\n`audit:action-sha-pins` for the new pinned action).\n- CI unit suite (`packages/gateway packages/cli packages/mcp-connectors\nscripts`) — **14965 pass, 1 fail**, and that one failure\n(`test/integration/updater/wiring.test.ts`) **reproduces identically on\n`main`** — pre-existing, not this diff.\n- `packages/gateway/src/perf/` is coverage-floor exempt, so no baseline\nupdate is needed.\n- No markdown touched, so the lychee link total is unchanged from\n`main`.\n\n**Not verified locally:** the `build` gate fails on this machine with\n`Export named 'forEach' not found in module 'neotraverse'` — it **fails\nidentically on `main`**, and Docs Quality is green on `main` in CI, so\nit's a local Windows ESM artifact rather than a branch regression. It\ndoes mean `test:ci` aborts before its test phases here, which is why the\nunit suite was run directly.\n\n## Left out\n\n`bench-harness.ts` has no per-surface timeout, so a future hang in a\nnon-S8 surface can still eat the 45-minute budget. That's a broader\nchange with its own flake risk (picking a default that doesn't\nfalse-trip on `S8-l5000-b64`, which legitimately runs ~6m22s on\nWindows), so it's deliberately not in scope here.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **Performance**\n* Improved embedding benchmark performance by reusing downloaded model\nweights across workflow runs.\n* Prevented repeated model loading during benchmark runs, reducing\nunnecessary setup overhead.\n* Added safeguards for model-loading failures and separate cache\nlocations.\n\n* **Tests**\n* Expanded benchmark coverage for shared model loading, isolated caches,\nfailure handling, and explicit embedder configuration.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-28T07:17:27+03:00",
          "tree_id": "c486c2136a8bfc13593fa921773508c2626200e9",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/22938ac57788eed724d1ab6a28553bb7138b7631"
        },
        "date": 1785212990899,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 318.3593852499973,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 319.5809850500074,
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
          "id": "3e51aaf9f8171415c81d97a9b77f0f0141d40c76",
          "message": "feat: zero-config onboarding — nimbus init, and the LLM demoted to optional (#887)\n\n## Summary\n\nMakes `nimbus why` work immediately after install — no credentials, no\nAPI key, no config editing.\n\nThe key finding is that **the zero-config path already existed in the\ncode and was simply unexposed**, while the README asserted the opposite.\n`synthesize.ts` returns a deterministic render when no LLM is\nconfigured, and filesystem indexing needs no credentials. So this is\npackaging, not new capability.\n\n- **`nimbus init`** — indexes the git repo in the current directory.\nAppends a `[[filesystem.roots]]` block (with `code_index = true`) to\n`nimbus.toml` rather than rewriting it, starts the gateway, syncs, and\nprints a real `file:line` from the user's own repo to try with `nimbus\nwhy`.\n- **`index.demoSymbol`** — new read-only IPC method backing that\nsuggestion. Picking from the index rather than the filesystem means a\nlockfile or binary asset can never be suggested.\n- **No-LLM is now a stated mode** — the deterministic render carries a\nfooter, and the gateway's `no_api_key` message names *both* routes\n(local Ollama, hosted key) plus the fact that indexing, `nimbus why`,\nand the agent briefs need no LLM at all.\n- **`NIMBUS_CONFIG_DIR`** now relocates the config dir in both the\ngateway's and the CLI's paths modules (config dir only — never the data\ndir or socket).\n- **README/docs rewritten** to lead with the zero-config path and demote\nthe LLM to an optional upgrade.\n\n## Related Issue\n\nRelates to the launch-funnel work — no tracking issue.\n\n## Type of Change\n\n- [ ] Bug fix (non-breaking change that fixes an issue)\n- [x] New feature (non-breaking change that adds functionality)\n- [ ] Breaking change (fix or feature that changes existing behaviour)\n- [ ] Refactor (no behaviour change)\n- [x] Test improvement\n- [x] Documentation only\n- [ ] CI / tooling\n\n## Non-Negotiables Checklist\n\n- [x] `bun run typecheck` passes with zero errors\n- [x] `bun run lint` passes (Biome — format + lint)\n- [x] All existing tests pass (`bun test`)\n- [x] New behaviour is covered by tests\n- [x] No `any` types introduced — `unknown` is used for external data\n- [x] No credentials, tokens, or secret values appear in logs, IPC\nmessages, config, or test fixtures\n- [x] Platform-specific code is behind the `PlatformServices`\nabstraction (no OS checks in business logic)\n- [x] The HITL consent gate has not been weakened, bypassed, or made\nconfigurable\n- [x] N/A — `docs/README.md` is not touched\n\n> **Note on `bun run lint`:** inside `.claude/worktrees/` Biome reports\n\"0 files processed\" and exits 1 (known worktree path issue, not a lint\nfailure). Validated with `bunx biome check packages scripts` → **2992\nfiles, 0 errors**.\n\n## Coverage (if engine/ or vault/ was changed)\n\n- [x] `bun run test:coverage:engine` passes (Engine ≥85%) —\n`engine/gateway-agent-error.ts` was modified; 372 pass / 0 fail\n- [ ] N/A — `vault/` not modified\n\nNew files are not in `docs/structure-audit/coverage-baseline.json`, so\nthey must clear the 80% line+branch floor outright. Measured with the\nistanbul preloads rather than assumed:\n\n| File | Line | Branch |\n| --- | --- | --- |\n| `cli/src/commands/init.ts` | 91.4 | 85.4 |\n| `cli/src/lib/toml-append.ts` | 97.1 | 96.4 |\n| `cli/src/paths.ts` | 100.0 | 100.0 |\n| `gateway/src/agents/_lib/demo-symbol.ts` | 100.0 | 90.0 |\n| `gateway/src/ipc/index-demo-symbol-rpc.ts` | 100.0 | 100.0 |\n| `gateway/src/ipc/server/dispatchers.ts` | 86.7 | 81.3 |\n| `gateway/src/ipc/lan-rpc.ts` | 100.0 | 90.0 |\n\n## Testing\n\nFull suite: **10,776 pass / 0 fail** across 791 files\n(`packages/gateway/src packages/cli/src packages/cli/test`).\n\nGates run individually (bare, not through a pipe):\n\n- `typecheck` — 0 errors across all packages including `@nimbus/docs`\n- `bunx biome check packages scripts` — 2992 files, 0 errors\n- `lint:markdown` — 0 issues in 84 files\n- `audit:doc-refs` — 624 refs across 16 docs, all resolve\n- `audit:readme-cli` — 32 README references match the CLI registry\n- `audit:cross-platform` — clean\n- `audit:status-drift` — OK\n- `audit:invariants` — OK\n- `lychee --config lychee.toml 'docs/**/*.md' '*.md'` — 1076 links, **0\nerrors**\n\nPlatform: developed and verified on Windows 11.\n\n## Notes for Reviewers\n\n### Two security-surface decisions, both deliberate\n\n`index.demoSymbol` is:\n\n- **NOT on the Tauri renderer allowlist (I7)** — it is a CLI onboarding\naffordance with no renderer consumer, and only `index.metrics` is\nexposed from `index.*` today. The allowlist stays minimum-necessary.\n- **`FORBIDDEN_OVER_LAN` (I5)** — `index.*` reads are default-allow over\nLAN, but a paired peer has no use for this machine's onboarding hint.\n\nBoth are recorded in `docs/architecture.md`.\n\n### Four places the plan/spec was wrong, corrected against the code\n\n1. **The spec claimed nothing writes `nimbus.toml`.** True for the\ngateway only — `packages/cli/src/lib/nimbus-toml-config.ts` already\nwrites it via `setTomlValueInFile`. The append-only contract still\nstands on its own merits.\n2. **`NIMBUS_CONFIG_DIR` was half-wired.** The earlier commit added it\nto the *gateway's* `platform/paths.ts`, but `init` resolves config\nthrough the CLI's own `paths.ts`. Left unfixed, the e2e would have\nwritten to the developer's real config directory — exactly what the\ndesign review demanded be impossible — and in production the CLI and\ngateway would disagree about where `nimbus.toml` lives whenever the\noverride is set. The `configDir: root` darwin trap recurred verbatim in\nthe CLI module.\n3. **The plan's test DDL was invented.** Real schema: `graph_entity.id`\nis `TEXT PRIMARY KEY` (not autoincrement integer), `metadata.file` is\nroot-relative, and `repoRoot` is already `resolve()`d by\n`parseNimbusTomlFilesystemRoots` before sync stores it.\n4. **The numeric-error-code route does not exist.** The plan called for\nkeying `nimbus ask` on the JSON-RPC error code, but\n`@nimbus-dev/client`'s transport rejects with a plain `Error` carrying\nonly the message — the code never reaches the CLI. The guidance now\nlives at the source (the gateway message), which is better placement\nanyway: CLI, TUI, and VS Code all surface it without each reimplementing\nit. `ask` matches an exported sentinel, pinned by a gateway test.\n\n### Two things deliberately NOT done\n\n- **The e2e stops at `init --no-sync`.** `NIMBUS_CONFIG_DIR` moves only\n`configDir`; there is no data-dir override, so a gateway spawned under\ntest would index into the developer's real database — which the design\nspec forbids. The sync + demo-symbol half is covered by `init.test.ts`\nthrough injected effects. The boundary is documented in the test file\nheader.\n- **`init` does not restart a running gateway.** A daemon that is\nalready up cannot see a root just appended (roots are read once at\nstartup in `platform/assemble.ts`). `init` says so and asks the user to\n`nimbus stop && nimbus start`, rather than syncing nothing and then\nprinting a demo line it cannot back — or killing someone's running\ndaemon.\n\n### Behaviour worth a second look\n\nEverything downstream of the config write degrades to the generic\n`nimbus why <file>:<line>` next step and still **exits 0**: gateway\nwon't start, sync errors, or index has no symbols yet. Rationale: the\nconfig edit is the durable half of the work, and a connector hiccup\nshould not undo the impression that `init` worked. Happy to flip this if\nreviewers disagree.\n\nDesign-spec open question 1 is settled empirically rather than by\ninference — `zero-config-lifecycle.test.ts` asserts config loading\nsurvives a `nimbus.toml` with no `[llm]` block, that an absent file\nloads to defaults, and that the exact block `toml-append.ts` writes\nround-trips back through the gateway's parser with `codeIndex = true`.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-28T04:54:58Z",
          "tree_id": "1e429e12fc967a68cae5a8f28f114b0253075c10",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/3e51aaf9f8171415c81d97a9b77f0f0141d40c76"
        },
        "date": 1785215048114,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 237.29068874999976,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 240.81136845000145,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "306811640+nimbus-release-bot[bot]@users.noreply.github.com",
            "name": "nimbus-release-bot[bot]",
            "username": "nimbus-release-bot[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "6116f312e22029d68a554b9b480be66cfc49a947",
          "message": "chore: release main (#886)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n<details><summary>1.3.0</summary>\n\n##\n[1.3.0](https://github.com/nimbus-agent/Nimbus/compare/v1.2.0...v1.3.0)\n(2026-07-28)\n\n\n### Features\n\n* zero-config onboarding — nimbus init, and the LLM demoted to optional\n([#887](https://github.com/nimbus-agent/Nimbus/issues/887))\n([3e51aaf](https://github.com/nimbus-agent/Nimbus/commit/3e51aaf9f8171415c81d97a9b77f0f0141d40c76))\n\n\n### Bug Fixes\n\n* **perf:** stop a huggingface.co stall from blowing the 45m bench\ntimeout ([#885](https://github.com/nimbus-agent/Nimbus/issues/885))\n([22938ac](https://github.com/nimbus-agent/Nimbus/commit/22938ac57788eed724d1ab6a28553bb7138b7631))\n</details>\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\nCo-authored-by: nimbus-release-bot[bot] <306811640+nimbus-release-bot[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-28T05:12:56Z",
          "tree_id": "7a256e06b5dacba63a58c2c6397511b254d805c2",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/6116f312e22029d68a554b9b480be66cfc49a947"
        },
        "date": 1785216345059,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 316.3507044999962,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 315.12992369999995,
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
          "id": "ad437ba28522369411d96289998e8f2b9d95d016",
          "message": "feat(demos): recut the hero cast to the zero-config path (#888)\n\n## Summary\n\nRecuts the demo cast to the zero-config path, so the thing a visitor\nclicks matches the page it sits on.\n\nSince #887 the README leads with *\"no credentials, no API key, no LLM\"*\n— but the header link and the docs-site hero both showed `nimbus expert`\n+ `nimbus ask` posting to Slack: an LLM, a connector, and credentials.\nSame contradiction #887 fixed in prose, one layer up.\n\nNew `zero-config` demo: **`nimbus init` → `connector sync filesystem` →\n`nimbus why`**, ending on the deterministic-render footer — the mode a\nfirst-time user actually lands in.\n\nLive: <https://asciinema.org/a/HBEHmA2twRB7pPzI>\n\n## Related Issue\n\nFollow-on from #887 (zero-config onboarding). No tracking issue.\n\n## Type of Change\n\n- [x] Bug fix (non-breaking change that fixes an issue)\n- [x] New feature (non-breaking change that adds functionality)\n- [ ] Breaking change (fix or feature that changes existing behaviour)\n- [ ] Refactor (no behaviour change)\n- [x] Test improvement\n- [x] Documentation only\n- [ ] CI / tooling\n\n## Non-Negotiables Checklist\n\n- [x] `bun run typecheck` passes with zero errors (`tsc -p\nscripts/tsconfig.json` clean)\n- [x] `bun run lint` passes (Biome — format + lint)\n- [x] All existing tests pass (`bun test`)\n- [x] New behaviour is covered by tests\n- [x] No `any` types introduced — `unknown` is used for external data\n- [x] No credentials, tokens, or secret values appear in logs, IPC\nmessages, config, or test fixtures\n- [x] Platform-specific code is behind the `PlatformServices`\nabstraction (no OS checks in business logic)\n- [x] The HITL consent gate has not been weakened, bypassed, or made\nconfigurable\n- [x] `docs/README.md` IS touched — see Screenshots / Output below\n\n> **Note on `bun run lint`:** inside `.claude/worktrees/` Biome reports\n\"0 files processed\" and exits 1 (known worktree path issue). Validated\nwith `bunx biome check scripts docs` → 185 files, 0 errors.\n\n## Coverage (if engine/ or vault/ was changed)\n\n- [ ] N/A — neither `engine/` nor `vault/` is touched. `scripts/` is\noutside the coverage-floor globs (`scripts/coverage-floor/check.ts`),\nconsistent with its sibling script tooling.\n\n## Testing\n\n- `bun test scripts/` → **819 pass / 0 fail** (839 incl. skips)\n- `bun run record-casts --check` → both demos OK; **`incident-response`\nhash `2cb4d6f912e7` is unchanged throughout**\n- `bunx biome check scripts docs` → 185 files, 0 errors\n- `tsc -p scripts/tsconfig.json` → clean\n- `lint:markdown` → 0 issues in 84 files\n- `audit:doc-refs` → 624 refs resolve\n- `lychee` → **1086 links, 0 errors** (the new asciinema URL resolves)\n- Both render paths exercised: `render:hero-cast` and `render:hero-cast\nincident-response`\n\nRecorded and verified on Windows 11.\n\n## Screenshots / Output\n\nThe recorded transcript (`docs/demos/snapshots/zero-config.txt`):\n\n```text\nAdded <TMP>/sample-repo to nimbus.toml (code indexing on).\n\nNext:\n  nimbus connector sync filesystem\n  nimbus why <file>:<line>\nSync requested: filesystem\n## Why: src/auth.ts:2\n\n**verifyToken** — introduced in `a1b2c3d` \"harden token check\"\n\n| Lane | Evidence |\n| --- | --- |\n| Commit | `a1b2c3d` — harden token check |\n| Pull request | #214 — Reject empty bearer tokens |\n| Ticket | AUTH-88 — Empty token accepted on /session |\n| Incident | INC-31 — auth bypass reported by on-call |\n| Downstream | 4 call sites across 2 packages |\n\n_Rendered deterministically — configure an LLM for prose synthesis._\n```\n\n`docs/README.md` embeds the regenerated `hero-cast-{light,dark}.svg` —\nplease eyeball both in light and dark.\n\n## Notes for Reviewers\n\n### Two pre-existing harness bugs, found while preparing the upload\n\nNeither is caused by this branch; nothing caught them because no\nexisting demo printed a path or was ever watched at recorded speed.\n\n1. **The `.cast` leaked the recording machine's path — and therefore its\nusername.** It was built from RAW capture chunks while only the snapshot\ngot normalized:\n\n   ```\n[0.821,\"o\",\"Added\nC:\\\\Users\\\\<user>\\\\AppData\\\\Local\\\\Temp\\\\cast-driver-yGSOR5\\\\sample-repo\n…\n   ```\n\nThe `.cast` is uploaded to asciinema and rendered into the docs hero, so\nit now gets exactly the scrubbing the snapshot gets. **This is why the\npublished cast and the committed SVGs are clean** — verified: zero\nmatches for the username, `AppData`, or `Users` in either SVG.\n\n2. **Recorded casts were unwatchable.** Harness timings are wall-clock\nfrom the test run, so all four events landed inside one second. New\nopt-in `pacingSeconds` re-times them at record time (`zero-config` uses\n3s beats, ~15s total).\n\n**Pacing deliberately does NOT affect the snapshot hash** — the tripwire\ntracks what a demo *says*, not how fast it plays, so re-pacing can never\nread as a behavioural regression. Pinned by a test.\n\n### Harness extensions are additive and defaulted\n\n`incident-response` is byte-identical throughout — hash `2cb4d6f912e7`\nbefore and after every change. I verified its `.cast` diff is only\nnondeterministic timestamps, and restored the file rather than commit\nthat churn.\n\n- **`setup.repo`** materialises a fixture git repo under the harness\ntmpdir and runs steps there. Needed because `nimbus init` refuses to run\noutside a git repository *and prints its repo root* — recorded in a\nmaintainer's checkout it would bake that machine's absolute path into\nthe snapshot. Traversing `dir`/file keys are rejected so a script cannot\nwrite outside the sandbox.\n- **`pacingSeconds`** as above; omitted ⇒ raw timings preserved.\n\n### Cross-platform correctness is proven by test, not by recording on\none OS\n\nMy first recording produced `<TMP>\\sample-repo` — a Windows backslash,\nagainst an ubuntu tripwire, which would have drifted the committed\nsnapshot on CI. Rather than record on Linux and hope, the new\n`placeholder-path-separators` rule is covered by tests asserting a\n**Windows-prefixed and a POSIX-prefixed transcript normalise to the\nidentical string**. That is a permanent guard, and it is the direct\nlesson from #887 where a Windows-only verification hid a POSIX bug.\n\n### One deviation from the obvious script\n\nThe demo runs `init --no-sync` then an explicit `connector sync\nfilesystem`, rather than plain `nimbus init`. Plain `init` starts a real\ngateway, which a recording harness cannot do reproducibly. The two-step\nform shows the same sequence the README documents, just with the halves\nvisible separately.\n\n### termsvg gotcha worth knowing\n\n`termsvg` **v0.11.0 ships no binary assets** (source tarball only).\nv0.10.0 is the newest release with prebuilt binaries — so\n`docs/assets/README.md`'s \"download from the releases page\" step lands\non a release with nothing to download if you follow `latest`. Rendering\nhere used v0.10.0, checksum-verified against\n`termsvg-0.10.0-checksums.txt`.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-28T08:59:27+03:00",
          "tree_id": "0c5b5019ff800ea7b04f2c2eae40641aa04d3330",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/ad437ba28522369411d96289998e8f2b9d95d016"
        },
        "date": 1785218909811,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 212.33535134999656,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 213.3473583000028,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "306811640+nimbus-release-bot[bot]@users.noreply.github.com",
            "name": "nimbus-release-bot[bot]",
            "username": "nimbus-release-bot[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "69ac42dc9812d52133c95694a5c5de1876188ce9",
          "message": "chore: release main (#889)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n<details><summary>1.4.0</summary>\n\n##\n[1.4.0](https://github.com/nimbus-agent/Nimbus/compare/v1.3.0...v1.4.0)\n(2026-07-28)\n\n\n### Features\n\n* **demos:** recut the hero cast to the zero-config path\n([#888](https://github.com/nimbus-agent/Nimbus/issues/888))\n([ad437ba](https://github.com/nimbus-agent/Nimbus/commit/ad437ba28522369411d96289998e8f2b9d95d016))\n</details>\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\nCo-authored-by: nimbus-release-bot[bot] <306811640+nimbus-release-bot[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-28T06:19:22Z",
          "tree_id": "fef79477ae86ca293c9c83783dc20f3e612d3205",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/69ac42dc9812d52133c95694a5c5de1876188ce9"
        },
        "date": 1785220337960,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 314.8414257499997,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 312.61675130000185,
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
          "id": "146289412bcc865d8583093a25a747c5fb979563",
          "message": "perf(ci): cut a push run 105 -> 75 jobs — CI was queueing behind its own fan-out (#894)\n\n## Summary\n\nP4b's **tuning slice**. The measurement slice shipped `audit:ci-latency`\nand deliberately stopped short of tuning, because the first measurement\ncontradicted the design of record's hunch. This slice acts on what two\nfollow-up probes actually found.\n\n**The roadmap's own stated lead was wrong.** It recorded macOS\ncontention as \"the clearest lead\". Across 45 `E2E Desktop` legs the\nbinding upstream job was ubuntu 30×, windows 15×, **macOS only 3×**, and\nrunner queue was ~10 min median on *every* OS — that uniformity is the\ntell. The real constraint is **slot starvation**: a push run demands\n~105 job slots against a pool granting 12–17, with 32–41 jobs\ncreated-but-waiting at peak. One sampled run opened with **nine\nconsecutive minutes at zero running jobs**. 72 of those 105 jobs were a\nsingle 24-entry coverage matrix run once per OS.\n\nThis also **retires the design of record's sharding proposal** —\nsharding adds jobs to the pool that *is* the constraint.\n\nThree changes:\n\n- **A — PAL-aware coverage matrix.** Threshold gates run on Linux only,\nexcept the **9** whose covered code branches on host platform. Coverage\ngates **72 → 42**; a push run **105 → 75**.\n- **B — narrow the E2E edge.** `e2e-desktop` waited on `ci-ts` (30 jobs,\n**60.5 min** median DAG wait) through an edge carrying no artifacts — it\ndoes its own checkout, install and Tauri setup. It now waits on\n`ci-rust` (**1.17–1.72 min**), the prerequisite that actually carries\nmeaning.\n- **C — `audit:coverage-gate-pal`.** A static audit so the platform\nclassification cannot decay silently.\n\n## Related Issue\n\nRelates to the Org Infrastructure Program, sub-program **P4b** —\n`docs/infrastructure-roadmap.md`.\n\n## Type of Change\n\n- [x] CI / tooling\n- [x] New feature — the `audit:coverage-gate-pal` gate\n- [x] Documentation only — roadmap record + design/plan documents\n\n## Non-Negotiables Checklist\n\n- [x] `bun run typecheck` passes with zero errors\n- [x] `bun run lint` passes (Biome) — verified as `bunx biome check\n--error-on-warnings packages scripts`; the packaged `bun run lint`\nfalse-fails inside a `.claude/worktrees/` checkout, a known local-only\nartifact\n- [x] All existing tests pass — `bun test scripts/` 881 pass / 0 fail\nacross 83 files\n- [x] New behaviour is covered by tests\n- [x] No `any` types introduced — GitHub API data is narrowed with\n`isRecord`\n- [x] No credentials, tokens, or secret values anywhere — all reads are\npublic\n- [x] Platform-specific code behind `PlatformServices` — n/a, **no\nproduction code changed**\n- [x] The HITL consent gate has not been weakened — n/a, no engine\nsurface touched\n\n## Coverage\n\nn/a — neither `engine/` nor `vault/` was modified. This PR touches CI\nworkflows, `scripts/`, and docs only.\n\n## Testing\n\n- `bun run audit:coverage-gate-pal` → OK\n- `bun test scripts/` → 881 pass / 0 fail\n- `bunx tsc -p scripts/tsconfig.json --noEmit` → exit 0\n- `bunx biome check --error-on-warnings packages scripts` → exit 0\n- `bun run lint:markdown` → exit 0, red-proved against a deliberately\ninvalid file\n- `bun run audit:doc-refs` → 625 refs across 16 docs, all resolve\n- `bun run audit:action-sha-pins`, `bun run audit:invariants` → OK\n- `bun test scripts/preflight.test.ts` → the workflow-drift guard passes\nwith the new gate registered in `PREFLIGHT_GATES`\n- Both probes were run **live against `main`** to capture the\nbefore-measurement\n\n## Notes for Reviewers\n\n**A Critical defect was caught by the whole-branch review, and it is\nworth knowing how.** The original mechanism put `matrix.gate.pal` in a\n**job-level** `if:`, where GitHub does not expose the `matrix` context —\na job condition is evaluated before the matrix expands. It would have\neither failed workflow validation or evaluated falsy on non-Linux,\n**silently skipping all 24 coverage gates on Windows and macOS,\nincluding the 9 PAL gates** whose preservation is the entire safety\nargument. Every other `matrix.`-referencing `if:` in this repo is\nstep-level.\n\nThe fix splits the matrix into `coverage-gates-pal` and\n`coverage-gates-linux`, each gated only on `inputs`. The job-name\ntemplate is byte-identical in both, so produced check-context names do\nnot change. `fromJSON` was rejected: it loses the property that a\nskipped leg still creates its check context — the trap documented at\n`ci.yml:137-144`.\n\n**The audit now constrains the mechanism it protects.** That defect\nshipped green precisely because the audit validated the `pal:` fields\nbut never read the `if:` consuming them. It now asserts both jobs'\nconditions and cross-checks the runner literal against what `ci.yml`\nactually passes, with red-proofed tests — including one that reproduces\nthe broken condition verbatim and asserts it fails.\n\n**The static classification was wrong three times during this work**,\neach caught and fixed: `doctor-core.ts` (the detector didn't match\n`import { platform } from \"node:os\"`, the dominant idiom in this\ncodebase), `packages/cli/src/paths.ts`, and then `Embedding`/`DB layer`\n(both reach `sqlite-vec-load.ts` through static imports). The design's\n\"static evidence is sufficient\" judgement is recorded alongside those\ncounter-examples rather than quietly restated.\n\n**The problem worsened mid-flight.** DAG wait measured 33.4 min on\n2026-07-27 and **60.5 min** on 2026-07-28. Cross-checked by running the\noriginal throwaway probe and the promoted one over the same window —\nidentical output, so this is real congestion growth, not an instrument\nartifact. Both captures are date-stamped in the roadmap; **60.5 is the\nbaseline** any after-comparison must use.\n\n**Two open items, both recorded in the roadmap:**\n\n1. **The after-measurement cannot be taken until this merges** and a\npush run completes under the new workflow. `audit:ci-latency` gates\n*execution*, while this slice's win lands in queue and DAG wait — so\nthat gate structurally cannot prove this worked. The two promoted probes\nare the instrument, and no predicted figure is written anywhere it could\nbe mistaken for a measurement.\n2. **One known enforcement gap.** An allowlist entry names a single\ngate, so demoting `Embedding` is caught but demoting `DB layer` is not.\nThe entry's comment states the gap rather than claiming protection the\ncode does not provide. Closing it needs a co-gate field on\n`PlatformFileEntry`.\n\n**Worth a live check after merge:** the first push run should show **75\njobs** — 24 coverage legs on ubuntu, 9 each on macOS and Windows.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n- **New Features**\n- Added automated checks to ensure platform-specific code is covered by\nthe appropriate coverage gates.\n- Added CI latency diagnostics for workflow dependencies, concurrency,\nand job wait times.\n\n- **Improvements**\n- Split coverage checks by platform requirements to reduce unnecessary\nrunner usage.\n- Streamlined desktop end-to-end workflow dependencies so checks can\nstart sooner.\n\n- **Documentation**\n- Updated infrastructure planning and review documentation with CI\ntuning results, safeguards, and operational guidance.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-28T12:29:09+03:00",
          "tree_id": "1aabb1c304ea52158509d615ec601c1b8fd384a0",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/146289412bcc865d8583093a25a747c5fb979563"
        },
        "date": 1785231702667,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 288.88237629999713,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 286.8726821500051,
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
          "id": "f16b012cd2d4af2f2bc3ccf90cf74cc34ab12a99",
          "message": "fix(gateway): nimbus init could never index — connector.sync rejected every local syncable (#895)\n\n## Summary\n\n**`nimbus init` could never actually index.** Found by running the\nzero-config funnel against a real gateway for the first time — #887\nshipped the sync step covered only by unit tests with an injected fake,\nso neither bug in here was reachable by the suite.\n\n```\n$ nimbus init\nAdded .../repo to nimbus.toml (code indexing on).\nStarting the gateway...\nIndexing this repository...\n  (indexing did not complete: Invalid serviceId)     ← the headline promise, failing\nNext:\n  nimbus connector sync filesystem                   ← and this command exits 1\n```\n\nTwo fixes, plus the end-to-end verification that should have existed\nbefore the relaunch.\n\n## Related Issue\n\nFollow-up to #887 (zero-config onboarding) and #888 (cast recut). No\ntracking issue.\n\n## Type of Change\n\n- [x] Bug fix (non-breaking change that fixes an issue)\n- [ ] New feature (non-breaking change that adds functionality)\n- [ ] Breaking change (fix or feature that changes existing behaviour)\n- [ ] Refactor (no behaviour change)\n- [x] Test improvement\n- [x] Documentation only\n- [ ] CI / tooling\n\n## Non-Negotiables Checklist\n\n- [x] `bun run typecheck` passes with zero errors (gateway + cli)\n- [x] `bun run lint` passes (Biome — format + lint)\n- [x] All existing tests pass (`bun test`)\n- [x] New behaviour is covered by tests\n- [x] No `any` types introduced — `unknown` is used for external data\n- [x] No credentials, tokens, or secret values appear in logs, IPC\nmessages, config, or test fixtures\n- [x] Platform-specific code is behind the `PlatformServices`\nabstraction — the socket override sits in `platform/paths.ts` alongside\nthe existing `NIMBUS_CONFIG_DIR` seam, applied in all three creators\n- [x] The HITL consent gate has not been weakened, bypassed, or made\nconfigurable\n- [x] N/A — `docs/README.md` is not touched\n\n> **Note on `bun run lint`:** inside `.claude/worktrees/` Biome reports\n\"0 files processed\" and exits 1 (known worktree path issue). Validated\nwith `bunx biome check packages scripts` → 2995 files, 0 errors.\n\n## Coverage (if engine/ or vault/ was changed)\n\n- [ ] N/A — neither `engine/` nor `vault/` is touched.\n\n## Testing\n\n- `bun test packages/gateway/src/{ipc,platform,connectors}` → **4170\npass / 0 fail**\n- `bun run audit:invariants` → OK\n- `lint:markdown` / `audit:doc-refs` / `audit:readme-cli` → all OK\n- `tsc` clean on gateway and cli\n\n**Verified end-to-end against a real gateway**, in an isolated config +\ndata dir (`APPDATA`/`LOCALAPPDATA` redirected, distinct socket) so it\ncould not touch a real index:\n\n```\n$ nimbus init\nAdded <sandbox>/repo to nimbus.toml (code indexing on).\nStarting the gateway...\nSocket: \\.\\pipe\\nimbus-fix-verify          ← the override, now honoured by the gateway\nIndexing this repository...\nTry it:\n  nimbus why src/auth.ts:1   # verifyToken  ← real file:line from the repo\n$ nimbus why src/auth.ts:1\n## Authorship\n- **t · b877723027bf** — 2026-07-28 · add auth helpers\n$ nimbus connector sync filesystem\nSync requested: filesystem                  ← was: Invalid serviceId, exit 1\n```\n\n## Notes for Reviewers\n\n### 1. The local syncables were unreachable over IPC\n\n`requireRegisteredSchedulerServiceId` admitted only catalog connector\nids and `mcp_*` user-MCP ids. But **four** syncables — `filesystem`,\n`blame`, `openapi`, `obsidian` — are registered straight into the\nscheduler by `assemble.ts` with no catalog entry, so none of them could\nbe synced on demand. This is wider than the init bug that surfaced it.\n\nFixed with an explicit `GATEWAY_SYNCABLE_SERVICE_IDS` SSoT rather than\nby loosening the regex, because an enumerable list is what this codebase\nuses elsewhere and it keeps the surface auditable.\n\n**Membership only widens which NAMES are addressable.** The\n`persistedConnectorStatuses(id).length === 0` check still runs\nimmediately after and is what authorises the sync — a covering test\nasserts a listed-but-unregistered id is still rejected with `Unknown\nconnector`, and that `forceSync` is never reached.\n\nThe drift test reads `assemble.ts` and fails in **both** directions: an\nid here that nothing registers, or a registered non-catalog id missing\nfrom the list.\n\n**Indexing was never broken** — the scheduler registers with `nextRunAt\n= now`, so data landed seconds later regardless. The promise was\nmistimed, not absent. Worth knowing when judging severity.\n\n### 2. `NIMBUS_GATEWAY_SOCKET` was CLI-only\n\nRead by `cli/src/paths.ts` and never by the gateway, so setting it\nproduced the worst kind of failure: the gateway comes up healthy, the\nCLI waits on a socket that will never be bound, and `nimbus start` burns\nits full 60s timeout before failing. Cost me a run before I spotted it.\n\nDeliberately kept **separate** from `NIMBUS_CONFIG_DIR` rather than\nfolding both into one \"isolation\" variable — one variable moving config\n*and* socket would let a test-isolation mistake silently reroute live\nIPC. Also documented that it does **not** move the data directory, since\na gateway started with it still reads the real index (that gap is why\nthe #887 e2e stops at `--no-sync`).\n\n### 3. Why the test suite missed both\n\n`init`'s effects are injected (`InitDeps`), which made the CLI logic\ntestable but meant `syncFilesystem` was a fake that always succeeded.\nThe demo cast (#888) didn't catch it either — it runs against a fake\ngateway that answers anything, so it happily depicted `Sync requested:\nfilesystem` for a command that returned `Invalid serviceId` in reality.\n\nBoth are reasonable test designs; neither can catch a contract mismatch\nwith the real gateway. The new `lifecycle.test.ts` cases close the\nspecific hole at the RPC boundary, but the general lesson is that this\nfunnel needs a real-gateway smoke test before the relaunch, which is\nwhat found these.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-28T12:36:01+03:00",
          "tree_id": "a6f09f81c1a79e038c67f899889a381c21e3be3f",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/f16b012cd2d4af2f2bc3ccf90cf74cc34ab12a99"
        },
        "date": 1785232445017,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 316.03490359999705,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 315.07364094999974,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "306811640+nimbus-release-bot[bot]@users.noreply.github.com",
            "name": "nimbus-release-bot[bot]",
            "username": "nimbus-release-bot[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "a39b8696f27d73a0932850441d9d51118ec187e2",
          "message": "chore: release main (#896)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n<details><summary>1.4.1</summary>\n\n##\n[1.4.1](https://github.com/nimbus-agent/Nimbus/compare/v1.4.0...v1.4.1)\n(2026-07-28)\n\n\n### Bug Fixes\n\n* **gateway:** nimbus init could never index — connector.sync rejected\nevery local syncable\n([#895](https://github.com/nimbus-agent/Nimbus/issues/895))\n([f16b012](https://github.com/nimbus-agent/Nimbus/commit/f16b012cd2d4af2f2bc3ccf90cf74cc34ab12a99))\n\n\n### Performance Improvements\n\n* **ci:** cut a push run 105 -&gt; 75 jobs — CI was queueing behind its\nown fan-out ([#894](https://github.com/nimbus-agent/Nimbus/issues/894))\n([1462894](https://github.com/nimbus-agent/Nimbus/commit/146289412bcc865d8583093a25a747c5fb979563))\n</details>\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\nCo-authored-by: nimbus-release-bot[bot] <306811640+nimbus-release-bot[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-28T09:57:21Z",
          "tree_id": "e675c08d7685950139c79a5630b5cd09a7e32b9e",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/a39b8696f27d73a0932850441d9d51118ec187e2"
        },
        "date": 1785233772322,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 317.4808936499994,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 321.9110020499931,
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
          "id": "b9d074cd25629eef66f373ad26b2469b1ba02911",
          "message": "fix(cast-driver): print the diff on DRIFT so a macOS-only failure is diagnosable (#897)\n\n## Summary\n\n`main` is red on macOS and has been since #888, but the failure was\nundiagnosable by anyone without a Mac.\n\n`Unit + Coverage — macos-15` fails on `cast-driver e2e\n(incident-response committed snapshot)`, and the entire output is:\n\n```\nincident-response: OK (hash=2cb4d6f912e7)\nzero-config: DRIFT (hash=c957257a1b7c)\n```\n\nA hash says *that* the transcript changed and nothing about *what*\nchanged. This PR does not fix the drift — it makes the drift readable,\nso the next macOS run reports the actual difference.\n\n**What is already established about the drift** (this PR does not depend\non it, but it is why the gap mattered):\n\n- **Deterministic, not flaky.** Byte-identical drift hash `c957257a1b7c`\nacross two independent runs on different commits (`30333319359`,\n`30334421390`). That rules out a leaked random temp path, which would\nvary per run.\n- **macOS only.** ubuntu and windows pass the identical check; the\ncommitted hash `52230bd9f728…` reproduces exactly on Windows.\n- So it is a stable, macOS-specific rendering difference in the\n`zero-config` cast.\n\n## The change\n\n`driver.ts` already computed a unified diff — it just wrote it to disk\n**only when `--artifacts-dir` was passed**, and the failing path\n(`scripts/cast-driver/e2e.test.ts`) does not pass it. So the diff\nexisted and was thrown away exactly when it was needed.\n\n- the diff is now computed unconditionally and carried on the `mismatch`\nsummary\n- `run.ts` prints it on DRIFT, bounded to `MAX_DIFF_LINES` (60),\npointing at `--artifacts-dir` for the full text\n- the confusing case where the hash differs but the transcript text is\n**byte-identical** now says so explicitly — a stale committed `.hash`,\nnot a content change. Previously that rendered as `DRIFT` with no\nexplanation whatsoever.\n\n## Type of Change\n\n- [x] Bug fix (non-breaking change that fixes an issue)\n- [x] CI / tooling\n\n## Non-Negotiables Checklist\n\n- [x] `bun run typecheck` passes with zero errors\n- [x] `bun run lint` passes (Biome) — verified as `bunx biome check\n--error-on-warnings scripts`\n- [x] All existing tests pass — `bun test scripts/` 903 pass / 0 fail\n- [x] New behaviour is covered by tests\n- [x] No `any` types introduced\n- [x] No credentials, tokens, or secret values appear anywhere\n- [x] Platform-specific code behind `PlatformServices` — n/a, no\nproduction code changed\n- [x] The HITL consent gate has not been touched\n\n## Coverage\n\nn/a — neither `engine/` nor `vault/` was modified.\n\n## Testing\n\nBoth drift shapes were exercised end-to-end against the real\n`zero-config` snapshot by mutating it locally and restoring afterwards.\n\n**Text differs** (the real macOS shape):\n\n```\nzero-config: DRIFT (hash=52230bd9f728)\n--- zero-config.txt\n+++ zero-config.actual.txt\n@@ -1,22 +1,21 @@\n Added <TMP>/sample-repo to nimbus.toml (code indexing on).\n```\n\n**Stale hash, identical text:**\n\n```\nzero-config: DRIFT (hash=52230bd9f728)\n  transcript text is IDENTICAL to the committed .txt — the committed .hash is stale; re-run `bun run record-casts`\n```\n\n- `bun test scripts/cast-driver/` → 74 pass / 0 fail\n- `bun test scripts/` → 903 pass / 0 fail\n- `bunx tsc -p scripts/tsconfig.json --noEmit` → exit 0\n- **Red-proved:** removing `diff` from the mismatch summary fails the\nnew test (8 pass / 1 fail). The test asserts both sides appear in the\ndiff — one side alone would be useless.\n\n## Notes for Reviewers\n\nThe two new tests deliberately pass `artifactsDir: undefined`, because\nthat is the configuration the failing CI path actually uses. A test that\npassed an artifacts dir would have gone green against the old code and\nproved nothing.\n\nThis is diagnostic instrumentation, not a fix for the underlying macOS\ndifference. Once a macOS run reports the actual diff, the root cause can\nbe fixed with evidence instead of a guess — which is the reason I did\nnot attempt the fix blind from a Windows machine.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n* **New Features**\n* CI drift reports now include readable transcript differences when\nsnapshot checks fail.\n* Long differences are truncated for concise output, with guidance for\naccessing the full diff.\n  * Reports identify stale hash files when transcript content matches.\n\n* **Bug Fixes**\n* Snapshot mismatch details are now available even without an artifacts\ndirectory.\n  * Matching snapshots no longer produce unnecessary diff output.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-28T13:27:24+03:00",
          "tree_id": "512caf6116d51276d8280549ca59e63d69331219",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/b9d074cd25629eef66f373ad26b2469b1ba02911"
        },
        "date": 1785235045874,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 277.4219272000017,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 275.46457129999544,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "306811640+nimbus-release-bot[bot]@users.noreply.github.com",
            "name": "nimbus-release-bot[bot]",
            "username": "nimbus-release-bot[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "54936cdb816f174ca2114c44e97979413e84d483",
          "message": "chore: release main (#898)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n<details><summary>1.4.2</summary>\n\n##\n[1.4.2](https://github.com/nimbus-agent/Nimbus/compare/v1.4.1...v1.4.2)\n(2026-07-28)\n\n\n### Bug Fixes\n\n* **cast-driver:** print the diff on DRIFT so a macOS-only failure is\ndiagnosable ([#897](https://github.com/nimbus-agent/Nimbus/issues/897))\n([b9d074c](https://github.com/nimbus-agent/Nimbus/commit/b9d074cd25629eef66f373ad26b2469b1ba02911))\n</details>\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\nCo-authored-by: nimbus-release-bot[bot] <306811640+nimbus-release-bot[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-28T10:44:47Z",
          "tree_id": "44fd2b1d9665c6e5b1b4b800a6eab16f200f1206",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/54936cdb816f174ca2114c44e97979413e84d483"
        },
        "date": 1785236225495,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 307.02387164999965,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 310.0832242999997,
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
          "id": "de0a5f28c3313eef2c5f54c1c5aa616586bb6d50",
          "message": "fix(cast-driver): normalize macOS's /private tmpdir alias — unbreaks main on macOS (#899)\n\n## Summary\n\nFixes the macOS-only failure that has kept `main` red since #888.\n\n`Unit + Coverage — macos-15` failed on the `zero-config` cast snapshot.\n#897 made the drift printable instead of reporting a bare hash, and on\nits very first run it showed the cause in one line:\n\n```diff\n-Added <TMP>/sample-repo to nimbus.toml (code indexing on).\n+Added /private<TMP>/sample-repo to nimbus.toml (code indexing on).\n```\n\n## Root cause\n\nOn macOS `/var` is a symlink to `/private/var`. So `os.tmpdir()` reports\n`/var/folders/…`, while any command printing a **resolved** path —\n`nimbus init` prints its repo root — emits `/private/var/folders/…`.\n\nThe `tmp-prefix` normalisation rule replaced only the unresolved prefix,\nso the resolved form was rewritten into the nonsense string\n`/private<TMP>`.\n\nubuntu and windows have no such alias, so the committed snapshot —\nrecorded there — never contained it. That is why the drift was\n**macOS-only** and **deterministic**: byte-identical hash `c957257a1b7c`\nacross two independent runs on different commits, which is what ruled\nout a leaked random temp path early on.\n\n## The fix\n\nReplace the resolved `/private`-prefixed form **first** (it is the\nlonger match), then the unresolved form. Replacing it second would\nstrand the `/private` fragment.\n\n**No re-record is required.** macOS now produces exactly what Linux\nrecorded; the committed hash `52230bd9f728` is unchanged, and `bun\nscripts/cast-driver/run.ts --check` still passes locally.\n\n## Type of Change\n\n- [x] Bug fix (non-breaking change that fixes an issue)\n- [x] CI / tooling\n\n## Non-Negotiables Checklist\n\n- [x] `bun run typecheck` passes with zero errors\n- [x] `bun run lint` passes (Biome) — verified as `bunx biome check\n--error-on-warnings scripts`\n- [x] All existing tests pass — `bun test scripts/` 913 pass / 0 fail\n- [x] New behaviour is covered by tests\n- [x] No `any` types introduced\n- [x] No credentials, tokens, or secret values appear anywhere\n- [x] Platform-specific code behind `PlatformServices` — n/a; this is\nrecording-time transcript normalisation in `scripts/`, not gateway\nbusiness logic\n- [x] The HITL consent gate has not been touched\n\n## Coverage\n\nn/a — neither `engine/` nor `vault/` was modified.\n\n## Testing\n\n- `bun test scripts/cast-driver/` → 84 pass / 0 fail\n- `bun test scripts/` → 913 pass / 0 fail\n- `bunx tsc -p scripts/tsconfig.json --noEmit` → exit 0\n- `bun scripts/cast-driver/run.ts --check` → both snapshots OK, hashes\nunchanged\n- **Red-proved:** reverting the fix fails exactly the two tests that\nassert resolved-path handling (28 pass / 2 fail → 30 pass / 0 fail\nrestored)\n\nFive tests were added, covering the resolved form, the unresolved form,\ncross-platform agreement, a negative case, and idempotency:\n\n- a resolved macOS temp path normalises to `<TMP>`, not `/private<TMP>`\n- the unresolved form still normalises, so **both spellings agree** —\notherwise the snapshot would depend on which form a given command\nhappened to print\n- a macOS transcript matches the Linux one **byte-for-byte**, which is\nthe actual regression\n- an unrelated `/private/etc/hosts` is left untouched, pinning that the\nrule keys on the harness tmpdir rather than on the literal string\n`/private`\n- idempotency, matching the existing convention in this file\n\n## Notes for Reviewers\n\nThe `/private` literal is deliberate rather than a `realpathSync` call:\n`normalize.ts` is a pure function over recorded text with no filesystem\naccess, and keeping it pure is what makes the whole rule set\nunit-testable. The alias is a documented, stable macOS property.\n\nThis is the third and final PR in a chain: #894 cut the CI fan-out, #897\nmade this drift diagnosable, and this one fixes the drift itself. It\nshould return `main` to green on all three platforms — which in turn\nunblocks the P4b after-measurement, since both latency probes sample\nonly `status=success` push runs and there has not been one since the\ntuning landed.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-28T14:08:33+03:00",
          "tree_id": "7af09243ce65dbaeb218979ee20684b121351b37",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/de0a5f28c3313eef2c5f54c1c5aa616586bb6d50"
        },
        "date": 1785237657213,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 310.8246272000033,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 314.30566919999984,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "306811640+nimbus-release-bot[bot]@users.noreply.github.com",
            "name": "nimbus-release-bot[bot]",
            "username": "nimbus-release-bot[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "dd2b021f9bdc894325df56f0e1b17d27d1f9455a",
          "message": "chore: release main (#900)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n<details><summary>1.4.3</summary>\n\n##\n[1.4.3](https://github.com/nimbus-agent/Nimbus/compare/v1.4.2...v1.4.3)\n(2026-07-28)\n\n\n### Bug Fixes\n\n* **cast-driver:** normalize macOS's /private tmpdir alias — unbreaks\nmain on macOS\n([#899](https://github.com/nimbus-agent/Nimbus/issues/899))\n([de0a5f2](https://github.com/nimbus-agent/Nimbus/commit/de0a5f28c3313eef2c5f54c1c5aa616586bb6d50))\n</details>\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\nCo-authored-by: nimbus-release-bot[bot] <306811640+nimbus-release-bot[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-28T14:47:01+03:00",
          "tree_id": "8ae22689359950da74a0d88dd1e9f39082b15ede",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/dd2b021f9bdc894325df56f0e1b17d27d1f9455a"
        },
        "date": 1785239970225,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 310.6935637500061,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 310.0937011499962,
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
          "id": "6cfee34647e8533a0628c2a752b4512efc865d6f",
          "message": "docs(launch): prove-then-launch design + execution plan (#906)\n\n## Summary\n\nNimbus is already published in every mechanical sense — public repo,\nlive docs site, npm, winget/brew/scoop/apt/yum, native installers, VS\nCode extension — and has **3 stars, 0 forks, and no known user other\nthan the author**. The bottleneck is not packaging. It is discovery,\nplus a first-run path that has never executed on a machine the author\ndoes not own.\n\nThis PR adds the design and the execution plan for closing that gap.\n**Docs only — no code changes.**\n\n- `docs/superpowers/specs/2026-07-28-launch-plan-design.md` — three\nblocking gates: foreign-machine proof, private alpha, public launch\n(Show HN last).\n- `docs/superpowers/plans/2026-07-28-launch-execution.md` — four\nengineering tasks with TDD steps, plus runbooks for the human gates.\n- Both review documents and their responses, per repo convention.\n\n## Related Issue\n\nNo tracking issue. Follows up #887 (zero-config onboarding) and #895\n(`nimbus init` could never index).\n\n## Type of Change\n\n- [ ] Bug fix (non-breaking change that fixes an issue)\n- [ ] New feature (non-breaking change that adds functionality)\n- [ ] Breaking change (fix or feature that changes existing behaviour)\n- [ ] Refactor (no behaviour change)\n- [ ] Test improvement\n- [x] Documentation only\n- [ ] CI / tooling\n\n## Non-Negotiables Checklist\n\n- [x] `bun run typecheck` — N/A, no source changed\n- [x] `bun run lint` — N/A, no source changed (`lint:markdown` clean: 95\nfiles, 0 errors)\n- [x] All existing tests pass — N/A, no source or test changed\n- [x] New behaviour is covered by tests — N/A, documentation only\n- [x] No `any` types introduced — N/A\n- [x] No credentials, tokens, or secret values appear in logs, IPC\nmessages, config, or test fixtures\n- [x] Platform-specific code is behind the `PlatformServices`\nabstraction — N/A\n- [x] The HITL consent gate has not been weakened, bypassed, or made\nconfigurable\n- [x] N/A — `docs/README.md` is not touched\n\n## Testing\n\nDoc gates run locally in the worktree:\n\n- `bun run lint:markdown` → **95 files, 0 errors**\n- `bun run audit:doc-refs` → **625 refs across 16 docs — all resolve**\n- `lychee --offline` on the five new files → **6 links, 0 errors**\n\n## Notes for Reviewers\n\nThree claims were checked against the code during planning, and two\nturned out to be wrong. They are corrected in-tree rather than left to\nmislead:\n\n1. **\"Some connectors are stubs\" — false.** No `not implemented` markers\nexist anywhere in `packages/mcp-connectors/`; the eleven 6-line\n`server.ts` files are the `runReadOnlyMcpConnector` helper with real\nlogic in a sibling `tools.ts`. The claim came from a stale Phase 6 Slice\n7 note. The honest risk is narrower: ~95 connectors implemented and\ncontract-tested, essentially none verified against a live API.\n\n2. **\"No telemetry\" — imprecise.** An opt-in, aggregate-only collector\nexists in `packages/gateway/src/telemetry/`, defaulting to `[telemetry]\nenabled = false`. The conclusion (it cannot measure the launch) is\nunchanged, but `docs/cli-reference.md` documents a default endpoint, so\nanyone grepping for URLs will find one. The plan makes stating the\ndefault-off position a pre-launch task.\n\n3. **`nimbus init` exits 0 even when indexing fails.** `syncAndPickDemo`\ncatches every error and degrades to `null` by design, because the config\nedit is the durable half of the work. This is why the planned CI\nassertion greps for `\"Try it:\"` rather than trusting the exit code —\nworth knowing before reviewing that task.\n\nThe plan's highest-value item is extending\n`.github/workflows/install-smoke.yml`: today its only product assertion\nis `nimbus --help`, which passes while indexing is entirely broken. That\nis exactly how #895 shipped. The task includes a red-prove step and\nkeeps the CI budget flat by collapsing the matrix to Ubuntu on\nsource-only PRs.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-28T16:17:01+03:00",
          "tree_id": "b4268697ce36831cce1fcb4b75dc210c642804a2",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/6cfee34647e8533a0628c2a752b4512efc865d6f"
        },
        "date": 1785245318446,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 299.5859083500003,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 301.3496907000037,
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
          "id": "644b1e424e8697f4a1922584b0532a8850b08991",
          "message": "chore(deps): bump dependency-cruiser from 17.4.3 to 18.1.0 (#903)\n\nBumps\n[dependency-cruiser](https://github.com/sverweij/dependency-cruiser)\nfrom 17.4.3 to 18.1.0.\n<details>\n<summary>Release notes</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/sverweij/dependency-cruiser/releases\">dependency-cruiser's\nreleases</a>.</em></p>\n<blockquote>\n<h2>v18.1.0</h2>\n<h2>✨ new functionality</h2>\n<ul>\n<li>65c432cc feat: adds environment inconsistency checks (<a\nhref=\"https://redirect.github.com/sverweij/dependency-cruiser/issues/1070\">#1070</a>)\ndependency-cruiser now also warns at runtime if it detects typescript is\nneeded, but (a usable version of the) typescript compiler isn't present\n(+ the same for <em>babel</em> and <em>swc</em>). It already did so on\n<code>--init</code>. Thanks <a\nhref=\"https://github.com/kbarendrecht\"><code>@​kbarendrecht</code></a>\nfor the suggestion!</li>\n<li>6bb22b6f feat(report/error-html): makes the table heads sticky</li>\n</ul>\n<blockquote>\n<p>TypeScript 7 support: typescript@7.1.0 is expected to ship with a\npublic API - so that's the\nfirst version in the TypeScript 7 (formerly tsgo) version range\ndependency-cruiser will be able\nto support.</p>\n</blockquote>\n<h2>👷 maintenance</h2>\n<ul>\n<li>f04f2fad build(npm): updates external dependencies</li>\n</ul>\n<h2>v18.0.0</h2>\n<h2>🚨 breaking changes</h2>\n<ul>\n<li>40f42e96 chore!: drops support for nodejs 20 and 25 BREAKING (<a\nhref=\"https://redirect.github.com/sverweij/dependency-cruiser/issues/1060\">#1060</a>)</li>\n</ul>\n<p>This is because we follow the Node.js <a\nhref=\"https://nodejs.org/en/about/previous-releases\">release cycle</a>\nwho dropped support for version 20 and 25 (a while ago already).</p>\n<h2>🐛 fixes</h2>\n<ul>\n<li>a25fe7f7 fix(graph-utl): makes the summary more deterministic (<a\nhref=\"https://redirect.github.com/sverweij/dependency-cruiser/issues/1066\">#1066</a>)\n- thanks <a\nhref=\"https://github.com/Sebastian-G\"><code>@​Sebastian-G</code></a> for\nraising the issue and providing the first feedback!</li>\n</ul>\n<h2>👷 maintenance</h2>\n<ul>\n<li>92d6a1f9/ ee3dc3a9/ c9974443 build(npm): updates external\ndependencies</li>\n<li>0d8becbe refactor(config-utl): only imports json5 when it's used (<a\nhref=\"https://redirect.github.com/sverweij/dependency-cruiser/issues/1062\">#1062</a>)</li>\n<li>793bd4d4 chore(ci): updates known violations</li>\n<li>41911765 chore: updates copilot instructions</li>\n</ul>\n<h2>v18.0.0-beta-2</h2>\n<h2>🐛 fixes</h2>\n<ul>\n<li>15e84477/ 878511d3 fix(graph-utl): makes the summary more\ndeterministic (thanks to <a\nhref=\"https://github.com/Sebastian-G\"><code>@​Sebastian-G</code></a> for\nraising the well-documented issue!)</li>\n</ul>\n<h2>👷 maintenacne</h2>\n<ul>\n<li>ee3dc3a9/ 92d6a1f9 build(npm): updates external dependencies and\nrefreshes package lock</li>\n<li>0d8becbe refactor(config-utl): only imports json5 when it's used (<a\nhref=\"https://redirect.github.com/sverweij/dependency-cruiser/issues/1062\">#1062</a>)</li>\n<li>793bd4d4 chore(ci): updates known violations</li>\n<li>41911765 chore: updates copilot instructions</li>\n<li>40f42e96 chore!: drops support for nodejs 20 and 25 BREAKING (<a\nhref=\"https://redirect.github.com/sverweij/dependency-cruiser/issues/1060\">#1060</a>)</li>\n</ul>\n<h2>v18.0.0-beta-1</h2>\n<h2>👷 maintenance</h2>\n<ul>\n<li>ecb63545 refactor(resolve)!: replaces tsconfig-paths-webpack-plugin\nwith enhanced-resolve's own tsconfig-paths feature SLIGHTLY BREAKING (<a\nhref=\"https://redirect.github.com/sverweij/dependency-cruiser/issues/1061\">#1061</a>)</li>\n<li>41911765 chore: updates copilot instructions</li>\n<li>92d6a1f9 build(npm): updates external dependencies</li>\n</ul>\n<!-- raw HTML omitted -->\n</blockquote>\n<p>... (truncated)</p>\n</details>\n<details>\n<summary>Commits</summary>\n<ul>\n<li><a\nhref=\"https://github.com/sverweij/dependency-cruiser/commit/26dffc05710bc7663315e4d70863dd46c009c48e\"><code>26dffc0</code></a>\n18.1.0</li>\n<li><a\nhref=\"https://github.com/sverweij/dependency-cruiser/commit/f04f2fadae1962c9b17184a09d77062ee7d83027\"><code>f04f2fa</code></a>\nbuild(npm): updates external dependencies</li>\n<li><a\nhref=\"https://github.com/sverweij/dependency-cruiser/commit/65c432cc444a850983b476c0f58e6d4082f160d8\"><code>65c432c</code></a>\nfeat: adds environment inconsistency checks (starting with typescript\nand bab...</li>\n<li><a\nhref=\"https://github.com/sverweij/dependency-cruiser/commit/6bb22b6fe0815e6bdac0d6a52e676f2b2dc4cd5e\"><code>6bb22b6</code></a>\nfeat(report/error-html): makes the table heads sticky</li>\n<li><a\nhref=\"https://github.com/sverweij/dependency-cruiser/commit/d139a8e8952195d1f4a0296b69f53f7d75f119ee\"><code>d139a8e</code></a>\n18.0.0</li>\n<li><a\nhref=\"https://github.com/sverweij/dependency-cruiser/commit/c9974443819bd8fdf9273ebef0d938302b46a662\"><code>c997444</code></a>\nbuild(npm): updates external dependencies</li>\n<li><a\nhref=\"https://github.com/sverweij/dependency-cruiser/commit/a25fe7f77ac00cb20a6f3aaff4b741c3d294ec1a\"><code>a25fe7f</code></a>\nfix(graph-utl): makes the summary more deterministic (<a\nhref=\"https://redirect.github.com/sverweij/dependency-cruiser/issues/1066\">#1066</a>)</li>\n<li><a\nhref=\"https://github.com/sverweij/dependency-cruiser/commit/ee3dc3a9dbc657669b8457ba521679c0537b7986\"><code>ee3dc3a</code></a>\nbuild(npm): updates external dependencies and refreshes package\nlock</li>\n<li><a\nhref=\"https://github.com/sverweij/dependency-cruiser/commit/7106ce608566f8caaea382768f7373591dbef2b8\"><code>7106ce6</code></a>\nrevert: &quot;refactor(resolve)!: replaces tsconfig-paths-webpack-plugin\nwith enha...</li>\n<li><a\nhref=\"https://github.com/sverweij/dependency-cruiser/commit/0d8becbe9e0aa5ba7455afff7ad8ff476dc85c13\"><code>0d8becb</code></a>\nrefactor(config-utl): only imports json5 when it's used (<a\nhref=\"https://redirect.github.com/sverweij/dependency-cruiser/issues/1062\">#1062</a>)</li>\n<li>Additional commits viewable in <a\nhref=\"https://github.com/sverweij/dependency-cruiser/compare/v17.4.3...v18.1.0\">compare\nview</a></li>\n</ul>\n</details>\n<br />\n\n\n[![Dependabot compatibility\nscore](https://dependabot-badges.githubapp.com/badges/compatibility_score?dependency-name=dependency-cruiser&package-manager=bun&previous-version=17.4.3&new-version=18.1.0)](https://docs.github.com/en/github/managing-security-vulnerabilities/about-dependabot-security-updates#about-compatibility-scores)\n\nDependabot will resolve any conflicts with this PR as long as you don't\nalter it yourself. You can also trigger a rebase manually by commenting\n`@dependabot rebase`.\n\n[//]: # (dependabot-automerge-start)\n[//]: # (dependabot-automerge-end)\n\n---\n\n<details>\n<summary>Dependabot commands and options</summary>\n<br />\n\nYou can trigger Dependabot actions by commenting on this PR:\n- `@dependabot rebase` will rebase this PR\n- `@dependabot recreate` will recreate this PR, overwriting any edits\nthat have been made to it\n- `@dependabot show <dependency name> ignore conditions` will show all\nof the ignore conditions of the specified dependency\n- `@dependabot ignore this major version` will close this PR and stop\nDependabot creating any more for this major version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this minor version` will close this PR and stop\nDependabot creating any more for this minor version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this dependency` will close this PR and stop\nDependabot creating any more for this dependency (unless you reopen the\nPR or upgrade to it yourself)\n\n\n</details>\n\nSigned-off-by: dependabot[bot] <support@github.com>\nCo-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-28T16:18:03+03:00",
          "tree_id": "f9a7338c478e9bce42ca8d6290f9b22ffd81caaf",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/644b1e424e8697f4a1922584b0532a8850b08991"
        },
        "date": 1785246315567,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 306.76286849999633,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 307.82499159999713,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "306811640+nimbus-release-bot[bot]@users.noreply.github.com",
            "name": "nimbus-release-bot[bot]",
            "username": "nimbus-release-bot[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c1cc50552fbd899249ee4bb9964d69c070965ef2",
          "message": "chore: release main (#907)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n<details><summary>1.5.0</summary>\n\n##\n[1.5.0](https://github.com/nimbus-agent/Nimbus/compare/v1.4.3...v1.5.0)\n(2026-07-28)\n\n\n### Features\n\n* **ci:** close out P4b — after-measurement, co-gate enforcement, sweep\nproof ([#901](https://github.com/nimbus-agent/Nimbus/issues/901))\n([eaa1999](https://github.com/nimbus-agent/Nimbus/commit/eaa199953e2253cf03d24b7efb82d64a12bbb872))\n</details>\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\nCo-authored-by: nimbus-release-bot[bot] <306811640+nimbus-release-bot[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-28T18:07:41+03:00",
          "tree_id": "9a6a1228e4dfbc9cdf1b4dc073b37066fc73fc0e",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/c1cc50552fbd899249ee4bb9964d69c070965ef2"
        },
        "date": 1785251989267,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 310.4413129500041,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 311.230293949999,
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
          "id": "0aafb31e9b2926b5769fe2ea61d6f4cf7c074205",
          "message": "chore: correct drifted doc counts and versions, prune shipped plans, clear 8 advisories (#908)\n\nTwo adjacent sweeps. Every claim below was verified against source\nbefore editing — no finding was taken on trust from the audit that\nproduced it.\n\n## 1. The canonical security doc understated the live write surface by\nhalf\n\n`docs/SECURITY-INVARIANTS.md` describes I13's `WRITE_ROUTE_ALLOWLIST` as\n**six entries**. `packages/gateway/src/ipc/http-write-routes.ts:50-63`\nfreezes **twelve**, and `security-invariants.test.ts` asserts\n`toHaveLength(12)` at both `:337` and `:1148`.\n\nWorse, `.claude/commands/nimbus-http-write-surface.md` was internally\ninconsistent — **eight** in one place, **six** in another, both wrong.\nThat is the skill an agent loads *before adding an I13 write route*, so\nit would have produced a wrong count bump and a red gate.\n\nSame class of drift, same cause (hand-maintained counts in prose):\n\n| Claim | Reality |\n|---|---|\n| `NO_TIMEOUT_METHODS`: 4 entries at `gateway_bridge.rs:152` | **5** at\n`:167` (`identity.login` added with the OIDC device-code flow),\n`assert_eq!(…, 5)` at `:556` |\n| `ALLOWED_METHODS.len() == 99` | **101**, asserted at\n`gateway_bridge.rs:518` |\n| `audit:invariants` checks \"D10 + D11\" | Enforces **D10 through D22** |\n\n## 2. A documented CLI command that does not exist\n\n`docs/cli-reference.md` documented `nimbus sync`. There is no handler\nand no `commands/sync.ts` — **every example in that section exits 1**.\nThe real command is `nimbus connector sync <name>`, documented correctly\nin the same file.\n\nIt survived `audit:readme-cli` only because `COMMAND_NAMES` listed\n`\"sync\"` and `\"voice\"` with nothing behind them, so **the gate was\nreporting green on broken docs**. Both removed from the registry; the\ntwo docs that consequently failed were fixed in the same pass.\n`audit:readme-cli` now reports 32 references, down exactly the two\nremoved.\n\nAlso added the genuinely missing `nimbus janitor` / `nimbus preflight`\nreference sections, and the two shipped agents (`janitor`, `preflight`)\nmissing from `architecture.md`'s catalogue.\n\n## 3. Version strings\n\n`CLAUDE.md`/`GEMINI.md` said `v1.0.0` against an actual **`v1.4.3`**;\n`docs/roadmap.md` said `v0.22.0`; `docs/README.md`'s badge said\n`v0.13.1`. The badge is now the **dynamic** shields.io release badge, so\nit cannot drift again.\n\n## 4. Dependencies — `bun audit` 10 → 2\n\nRaised three pins in the root `overrides` block, this project's\nestablished remediation mechanism (`fast-uri`, `linkify-it`,\n`brace-expansion`, `js-yaml`, `postcss` already live there):\n\n```\ntar          7.5.20  -> 7.5.22   <- the only DIRECT PRODUCTION dep affected\nhono         4.12.25 -> 4.12.32\nprotobufjs   7.6.4   -> 7.6.5\n```\n\n`protobufjs` deliberately stayed on 7.x rather than the 8.7.1 latest — a\nmajor bump under `@xenova/transformers` (the MiniLM embedding stack) is\nnot worth a moderate advisory. The embedding suite was run to confirm:\n180 pass.\n\n> **Worth knowing:** GitHub's Dependabot API returns **zero** open\nalerts for this repo while `bun audit` found **ten**. The dependency\ngraph does not resolve `bun.lock`, so Dependabot is structurally blind\nhere and `bun audit` is the authoritative signal.\n\nTwo advisories remain, both requiring a major bump and therefore left\ndeliberately: `@hono/node-server` (patched only in 2.x; the 1.x line\ntops out at 1.19.17 with no backport) and `@ai-sdk/provider-utils` (the\npublished 3.x line ends at 3.0.30, entirely inside the vulnerable range\n— and `@mastra/core` imports it under an npm *alias* that a bare\n`overrides` key cannot target).\n\n## 5. Prune — 28 shipped plan/spec docs\n\nSix fully-shipped workstreams: P2 (both phases), P4b (measurement +\ntuning), zero-config onboarding, CLA Phase 1. **Kept** the un-executed\n`launch-execution` set, the unshipped P5/P3 spec, and `cla-design.md`\n(which `infrastructure-roadmap.md` cites for deferred scope).\n\nSix inbound references were fixed to keep the prune link-closed —\nincluding `.github/release-train.json` and `ci.yml:596-599`, which the\noriginal finding list had **missed**. Had only the listed sites been\nfixed, this would have shipped two dead paths.\n\n## Verification\n\n| Gate | Result |\n|---|---|\n| `preflight:fast` | **PASSED — all 21 gates** |\n| `lychee` (CI's exact invocation) | 1092 links, **0 errors** |\n| `bun audit --audit-level high` | exit 0 |\n| `typecheck` / `lint` | pass — 3016 files |\n| embedding · tar consumers · TUI | 180 · 5 · 152 pass |\n\n## Follow-up worth doing (not in this PR)\n\n**Nothing gates version strings or hand-maintained counts in prose** —\n`audit:status-drift` guards only the `I<N>`/`V<N>` ceilings. That is why\nhalf these findings existed, and it will recur. Two cheap fixes: extend\n`check-status-drift.ts` to compare the CLAUDE.md/GEMINI.md \"Latest\nrelease\" string against `.release-please-manifest.json`, and add a test\nasserting `COMMAND_NAMES ⊆ COMMAND_HANDLERS ∪ {bench, help}`.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-28T15:35:57Z",
          "tree_id": "a2f910e00536b51b99a3dbdc3671ada04cd8683b",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/0aafb31e9b2926b5769fe2ea61d6f4cf7c074205"
        },
        "date": 1785253682747,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 306.8094265500025,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 310.09842154999717,
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
          "id": "63fd75c1bd49ec49366844ce1a5a462c173dc87a",
          "message": "docs(security): honest disclosure policy + actually serve .well-known/security.txt (#909)\n\nCompanion to nimbus-agent/nimbus-security#1, which rewrites the central\npolicy. This PR fixes the same class of problem in the flagship repo and\nmakes `security.txt` real.\n\n## Two dead channels and an unkeepable promise\n\n**1. A second nonexistent email contact.** `docs/SECURITY.md` listed as\nreporting channel 2:\n\n> **Email** — contact the maintainers at the address listed in the\nrepository profile\n\nThere is no such address:\n\n```\n$ gh api orgs/nimbus-agent --jq '{email,blog,name}'\n{\"blog\":null,\"email\":null,\"name\":null}\n```\n\nA reporter who preferred email over PVR had nowhere to go. Removed, with\nan explicit statement of *why* there is no mail/PGP contact rather than\nanother dead pointer. (No email address was invented to replace it — see\n\"Owner decisions\" below.)\n\n**2. An SLA we cannot keep.** The policy promised acknowledgement within\n**72 hours** and a status update within **7 days**. That is not\nachievable for a one-person side project, and a missed promise in a\nsecurity policy is worse than no promise. Replaced with: no guaranteed\nresponse time, severity-based prioritisation, a **30-day\nunilateral-disclosure escape hatch** so reports can't be sat on, and no\nbug bounty. Now consistent with nimbus-security and\n`.github/SECURITY.md`.\n\n**3. Supported Versions named a release line that is three majors old.**\nThe table said fixes land in the next `v0.13.x` and listed\n`v0.1`–`v0.12` as the only older line — so **v1.5.0, the actual current\nrelease, did not appear as supported at all**:\n\n```\n$ gh release list --repo nimbus-agent/Nimbus --limit 1\nv1.5.0  Latest  2026-07-28T15:36:18Z          # root package.json: \"version\": \"1.5.0\"\n```\n\nRewritten around `v1.x`, latest-only, no backport programme.\n\nAlso corrected the stale invariant ceiling in `.github/SECURITY.md`\n(I1–I27 → I1–I30, I28 reserved), verified against `CLAUDE.md` and the 29\ninvariant headings in `docs/SECURITY-INVARIANTS.md`.\n\n## `.well-known/security.txt` was decorative — now it is served\n\nIt existed only in the `nimbus-security` repo and was published at no\nURL:\n\n```\n$ curl -o /dev/null -w \"%{http_code}\" https://nimbus-agent.dev/.well-known/security.txt\n404\n```\n\nIts `Canonical:` pointed at a `github.com` blob URL, which RFC 9116 does\nnot accept — the file has to be served from the org's own domain. One\nalready exists and needs **no new infrastructure**: `nimbus-agent.dev`\nis the live docs site (Pages, HTTPS cert approved, `deploy-docs.yml`\ngreen on `main`).\n\nAdding `packages/docs/public/.well-known/security.txt` publishes it at\n`https://nimbus-agent.dev/.well-known/security.txt` on the next docs\ndeploy. Verified Astro copies dotfile directories out of `public/` (a\nplain `cp` into `public/` then `astro build` emits\n`dist/.well-known/security.txt` — dotfile dirs are not skipped, and the\nPages build type is `workflow`, so no Jekyll underscore/dot filtering\napplies).\n\n## Verification\n\n```\npreflight PASSED   # all 21 fast gates, incl. audit:doc-refs + audit:status-drift\nlychee docs/SECURITY.md → 18 Total, 18 OK, 0 Errors\n```\n\n## Owner decisions (flagged, not made)\n\n- **No email address was invented.** Your personal GitHub profile lists\na real address, but designating a personal inbox as the project's\nsecurity contact is your call, not mine — so the policy is written to\nstand without one and to accept one additively later.\n- The 30-day disclosure window, \"latest release only\" support scope, and\n\"no bug bounty\" are judgement calls; each is a one-line edit.\n- `security.txt` now exists in two places (here and `nimbus-security`).\nThe header comment names this copy as the served one and asks that they\nbe kept in sync; `Expires:` is 2027-07-01 and needs a refresh before\nthen.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n---------\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-28T19:42:31+03:00",
          "tree_id": "4be98763f35f9033de1aafc0b7608ee60a4c5066",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/63fd75c1bd49ec49366844ce1a5a462c173dc87a"
        },
        "date": 1785257682834,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 314.5747372500038,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 314.33546139999527,
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
          "id": "de4bca3b8163d3f11bf423059d0a99ea20e00a57",
          "message": "docs(infra): measurement-grounded CI/CD improvement plan (#911)\n\n## What this is\n\nA CI/CD improvement plan for the monorepo and the four satellites,\nwritten to the standard\n`docs/infrastructure-roadmap.md` § P4b set: **measurement overrules the\ndesign of record.**\nEvery proposal is labelled *measured* or *hypothesis*, and **no proposal\nadds a job to the\nrunner pool** — P4b established that the pool is the binding constraint.\n\nAnalysis + a written plan. No workflow is restructured in this PR.\n\n## How it was measured\n\n`gh run list --limit 100` covers **2.4 hours** on Nimbus (276.8\nruns/day), so it is a snapshot,\nnot a window. The plan uses **3000 Nimbus runs / 10.8 days** and 300 per\nsatellite. All 73\nNimbus failures were classified by the **names of the jobs and steps\nthat failed**, not by log\nprose. Two proposed drift gates were replayed over real `origin/main`\nhistory before either was\nrecommended.\n\n## Four findings the existing controls structurally cannot see\n\n1. **`main` was red for 4.75 hours and nothing said so.** Six\nconsecutive `CI` push runs failed\n   on 2026-07-28 (05:59Z–10:44Z), five on the identical job+step\n(`Unit + Coverage — macos-15` / cast-driver snapshot).\n`scripts/ci-latency/collect.ts`\nqueries `status=success` and then drops jobs where `conclusion !==\n\"success\"`, so a job that\n   is failing 100% of the time produces zero observations.\n2. **A scheduled workflow has never once succeeded.** `Performance\nReference Run (M1 Air)`:\n11 runs, **0 successes**, ten of them queued ~24 h (median 1462.9 min)\nthen cancelled. It is\n   not a `startup_failure`, so `audit:actions-allowlist` misses it too.\n3. **Two prose-drift surfaces, red-proved retroactively.** `CLAUDE.md`'s\n\"Latest release\" was\nstale on **152 of 158** first-parent `main` commits (96.2%) since\n2026-06-20 — worst window\n27 days and eleven minor versions behind. `COMMAND_NAMES` carried `sync`\nand `voice` with no\nhandler for **468 consecutive commits / 77 days**, cleared only today by\n#908 — and\n`audit:readme-cli` treats that list as the authority for whether a\n`nimbus <cmd>` exists.\n4. **A push to `main` demands 101 job slots, not 77.** P4b counted only\nthe `CI` workflow; six\nothers fire on the same push (Docs Quality 8, Security 7, Perf 4–5,\nCodeQL 2–3, Scorecard 1,\nrelease-please 1). Five merges landed within **63 seconds** and took\n**44–57 min** each,\nwhile isolated post-change runs take **19–22 min**. P4b's tuning is\nholding — `probe-dag` at\nn=6 gives **4.4 min** median DAG wait vs 60.5 before — the residual is a\n*different*\n   variable: batch size at the merge point.\n\n## Failure MODES (73 Nimbus failures, categorical)\n\n| mode | share |\n| --- | --- |\n| Ambient dependency advisory (`Dependency audit` / Trivy / `Cargo\ndeny`) | **26%** |\n| Docs quality (lychee / markdownlint) | 18% |\n| Platform-specific test (macOS ×6, Windows ×4) | 14% |\n| PR-quality aggregate | 10% |\n| Credential / deadline · Dependabot infra | 7% each |\n\nPlus **88 `startup_failure` runs** — excluded from every rate because\nthey are not failures in\nany API sense: `Lint PR Title` 55, `CLA Assistant` 24, `Lock Threads` 9.\nAlso measured:\n**retries are effectively unused** — 9 of 3000 runs (0.3%) reached\nattempt 2 — so \"re-run the\nflake\" has no precedent here and is not proposed as a remedy.\n\n## Verdicts on the four named candidates\n\n| candidate | verdict |\n| --- | --- |\n| Credential liveness gate | **ACCEPT, narrowed** — generalise to\n`VSCE_PAT`/`OVSX_PAT`; **reject for `NPM_TOKEN`** (registry state is\n`forbidden`, publishing is OIDC-only — nothing to probe). Load-bearing\nconstraint: **do not** fold it into `secret-health`, which is red every\nMonday on the `VSCE_PAT` 2026-09-20 deadline row for eight more weeks,\nso a newly dead credential would be indistinguishable from the standing\nred. |\n| Doc-drift gate | **ACCEPT both**, with a correction: automate before\ngating. A strict-equality release-string check would red on every\nrelease commit; mark the token with `x-release-please-version` +\n`extra-files` so the gate becomes a regression detector rather than a\nchore generator. |\n| Required-check consistency | **ACCEPT the property, REJECT the\nframing.** Parity across 10/6/5/4/3 required contexts is permanently\nunsatisfiable — the anti-pattern the roadmap names. The checkable\nproperty is **coverage with declared exceptions**, and it finds three\nreal gaps, including one the brief did not anticipate: **`Validate PR\ntitle` is required on no repo**, against a measured **10.7%**\nunparseable-title rate on `main` since 2026-06-01. |\n| Scorecard `DangerousWorkflowID` restructure | **REJECT.** Verified\nfrom source: `release.yml` triggers only on `push: tags: v*`; the\npublish workflows' `workflow_run` names only `Release` and gates on\n`conclusion == 'success'`. The generic pwn-request premise does not\nhold. The split would roughly double those workflows' jobs — added to\nthe measured binding constraint — against a threat model needing repo\n**write**. Instead: dismiss with a written premise **and gate the\npremise**, so it fails if `release.yml` ever gains a non-tag trigger. |\n\n## What could NOT be measured\n\nStated explicitly in the plan so nothing reads as grounded when it is\nnot: the runner-pool\nceiling (no API exposes it), whether contention is self-inflicted or\norg-wide, cost/billing,\nwhether collapsing the 42 coverage-gate legs is net-positive (Task 7 is\na **probe**, not a\nchange), the self-hosted runner's state, and whether merge queue is\navailable on this plan.\n\n## Owner decisions flagged, not invented\n\n- Promoting `Validate PR title` to required on Nimbus + nimbus-vscode\n(changes merge-blocking).\n- Dismissing the three Scorecard alerts (do it *after* the premise gate\nis live).\n- `nimbus-vscode` uniquely requires the third-party `CodeRabbit` context\n— recorded, not changed.\n- Adding a `creation` rule to the release-tag ruleset would close the\nreal residual but could\nbreak release-please's own tag reconcile unless the App is a bypass\nactor.\n\n## Verification\n\n- `bun run lint:markdown` → `0 issues`\n- `bun run audit:doc-refs` → `627 refs across 16 docs — all resolve`\n- `bun run audit:status-drift` → `OK`\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)",
          "timestamp": "2026-07-28T20:07:22+03:00",
          "tree_id": "db1b58c18854b599cc2dd0b4385b3a6903e75878",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/de4bca3b8163d3f11bf423059d0a99ea20e00a57"
        },
        "date": 1785259148718,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 300.5081358500032,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 301.85324340000733,
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
          "id": "84d4f3d70017d5749a32f6c5b54bb5421cfef933",
          "message": "docs(ci-secrets): correct the release-environment scope claim (#910)\n\n## Why\n\nWhile adding deployment branch policies to the `release` environments\nacross the org, I checked this repo's claim against the live API and the\nworkflow sources. The intro of `docs/ci-secrets.md` was wrong, and wrong\nin a way that would break a release if someone followed it.\n\nIt said:\n\n> Release/publish secrets are scoped to the **`release`** GitHub\ndeployment environment (jobs that read them declare `environment:\nrelease`); add those under **Settings → Environments → release →\nEnvironment secrets**.\n\nTwo problems:\n\n1. **The `release` environment holds zero environment secrets.** All\nseven repo secrets sit at repository scope:\n   ```\n   $ gh api repos/nimbus-agent/Nimbus/environments/release/secrets\n   {\"total_count\":0,\"secrets\":[]}\n   ```\n2. **Most of them cannot move there as the workflows stand.** Only three\njobs declare `environment: release` — `release.yml`'s `publish-release`\nand `update-manifest`, and `secret-health.yml`'s `check`. Every other\nconsumer would stop seeing the secret.\n\nThe second point is the dangerous one, because an environment secret\ninvisible to a job **resolves to the empty string rather than\nerroring**. Following the old instruction for `GPG_SIGNING_SUBKEY` would\nnot break the environment-scoped `publish-release` job — it would break\n`release.yml`'s `build-gateway` job, which is what actually signs the\nartifacts.\n\nThe page was also self-contradictory: the RELEASE_BOT_* section already\nexplains this exact mechanism correctly (\"`release-please.yml` … mint a\ntoken without declaring `environment: release`, so an environment-scoped\nsecret would be invisible to them\"). Only the intro was stale.\n\n## What changed\n\nDocs only — one section of `docs/ci-secrets.md`. It now states the real\nscope, warns about the silent-empty failure mode, and carries a\nper-secret table naming the job that blocks each move:\n\n| Secret | Blocked by |\n|---|---|\n| `SECRET_AUDITOR_CLIENT_ID` / `SECRET_AUDITOR_PRIVATE_KEY` | — **safe\nto move today** |\n| `GPG_SIGNING_SUBKEY`, `GPG_PASSPHRASE` | `release:build-gateway`,\n`publish-linux-repo` |\n| `UPDATER_SIGNING_KEY` | `release:build-gateway` |\n| `WINGET_PAT` | `publish-package-managers:winget` |\n| `WINDOWS_CERT_*` | `release:build-msi` |\n| `APPLE_*` (7) | `release:build-pkg` |\n| `RELEASE_BOT_*` | `release-please`, `publish-package-managers`,\n`publish-linux-repo`, `org-drift-sweep` |\n\nDerived by parsing every workflow, attributing each `secrets.*`\nreference to its job, and checking that job's `environment:` key — not\nby reading prose.\n\n## Also done (API, outside this PR)\n\nThe `release` environment had `protection_rules: []` and\n`deployment_branch_policy: null` — no gate at all. It now has a\ndeployment branch policy mirroring how `github-pages` is already\nconfigured in this repo (`custom_branch_policies: true` + explicit\npolicies):\n\n```\nPUT  /repos/nimbus-agent/Nimbus/environments/release\n     {\"deployment_branch_policy\":{\"protected_branches\":false,\"custom_branch_policies\":true}}\nPOST /repos/nimbus-agent/Nimbus/environments/release/deployment-branch-policies  {\"name\":\"v*\",\"type\":\"tag\"}\nPOST /repos/nimbus-agent/Nimbus/environments/release/deployment-branch-policies  {\"name\":\"main\",\"type\":\"branch\"}\n```\n\n`main` is included deliberately: `secret-health.yml` declares\n`environment: release` and runs on a Monday cron, which executes from\nthe default branch. A tags-only policy would have broken that job.\n\n## Not done — needs your call\n\nMaking the release credentials genuinely non-readable by every job\nrequires adding `environment: release` to `build-gateway`, `build-msi`,\n`build-pkg`, `publish-linux-repo` and `publish-package-managers:winget`,\nthen moving the secrets. That restructures the release pipeline of a\nrepo that cut v1.5.0 today, so I did not do it unilaterally. Happy to\nopen it as a follow-up if you want it.\n\n## Verification\n\n- `bun run audit:secret-inventory` — `OK (24 secrets referenced, all\ndocumented)`\n- `bun test scripts/structure-audit/check-secret-inventory.test.ts` — 16\npass, 0 fail\n- `bun run audit:doc-refs` — 627 refs across 16 docs, all resolve\n- No new links introduced (the one external link is reused from the text\nit replaced)\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-28T20:07:41+03:00",
          "tree_id": "b90837d7e5719f9be65ee5e0e2d9af2b761dec47",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/84d4f3d70017d5749a32f6c5b54bb5421cfef933"
        },
        "date": 1785259845629,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 311.8752297499959,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 314.9176818000109,
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
          "id": "bf543612d63697dadd6dd20f70678f47343999cf",
          "message": "docs(credentials): credential health design, plan, and both review rounds (#912)\n\nDesign of record and implementation plan for **credential health**:\nmaking Nimbus notice a connector credential is dead, dying, or\nunverifiable instead of discovering it when something fails.\n\nDocs only — no runtime code. Four files, two review rounds applied.\n\n## Why\n\nOn 2026-07-28 the web-clipper v0.2.0 release failed at **both**\nstore-upload steps on credentials recorded as \"configured\" since 07-19\nand never once exercised. Three independent defects, none visible to any\ncontrol:\n\n1. **Silent expiry** — an OAuth refresh token minted while the consent\nscreen was in *Testing* mode; the provider expires those after 7 days.\nIt died on 07-26.\n2. **Partial rotation** — the client secret was rotated and stored while\nthe freshly minted token was not. A credential set half-updated with no\nsignal.\n3. **Shape damage** — an issuer stored with one trailing whitespace\ncharacter.\n\nFour rounds of hypothesis failed. What found all three, first run, was\ninstrumenting the real environment and printing what was actually\nstored.\n\nThe generalisable defect: **presence treated as validity.** Every\ncredential control in this codebase answers \"is a secret set?\" — none\nanswers \"does it work?\"\n\n## What is designed\n\nOne record, three writers, two readers, one pre-existing fix path.\n\n- **Writer 1 — sync observer.** Free: every sync already authenticates,\nso health is a by-product. No scheduler, no daemon, no new network\ncalls.\n- **Writer 2 — declared expiry.** The only mechanism that makes a known\ndeadline on an opaque token visible. `VSCE_PAT` expires 2026-09-20 and\nis guarded today by human memory alone.\n- **Writer 3 — active probe.** **One** implementation, not 97, because\n`list`/`get`/`search` are contractually mandatory per the connector\ncontract test.\n- **Readers** — `nimbus creds` plus one line in `nimbus doctor`.\n\n### It never writes a credential\n\n`vault.set` and `vault.delete` are in the HITL frozen set\n(`engine/executor.ts:107-108`, I2/I4). Unattended rotation would require\nweakening a non-negotiable. The only operation touching a secret is the\nexisting `nimbus connector auth` flow, invoked by explicit delegation\nfrom `nimbus creds fix` so the gate still applies. Final verification\nincludes `rg \"vault\\.(set|delete)\"` over the new subsystem returning\n**nothing** — a mechanical check that the non-goal held.\n\n## Measured, not assumed\n\n| Fact | Value | Source |\n| --- | --- | --- |\n| Connectors declaring secrets | 97 | `connector-secrets-manifest.ts` |\n| Opaque token/key/secret keys | 53 | ditto |\n| `OAuthProvider` union members | 12 | `auth/oauth-registry.ts` |\n| Distinct `*.oauth` vault keys | 22 | gateway-wide (Google/Microsoft\nfan out per service) |\n\nOpaque credentials substantially outnumber refreshable ones, and only\nOAuth credentials self-heal or report their own expiry — so the design\ntargets the opaque majority.\n\n## Two blockers found while mapping the real seams\n\nNow Tasks 1–2 rather than surprises mid-implementation:\n\n- **`connectorFetch` discards the error body.** `FetchOutcome` was `{\nkind: \"http_error\"; bytes; status }`. Google returns `invalid_grant`\nwith HTTP **400**, so without widening that type the classifier would\nhave silently degraded to status-codes-only and missed the exact failure\nthat started this.\n- **`CONNECTOR_VAULT_SECRET_KEYS` mixes credentials with configuration**\n— `jira: [\"jira.api_token\", \"jira.email\", \"jira.base_url\"]` — with no\nmarker. The attribution rule had nothing to key off. Task 1 adds the\nsplit behind a guard that fails when a new key matches neither set.\n\n## Review rounds\n\nTwo rounds, both applied. Highlights:\n\n- **The design review caught a false green in the spec itself.** My\nclassifier ended `ok : anything else that returned data`, so a 400 from\na changed request schema would have been classified **healthy**. `ok`\nnow means 2xx; everything else non-2xx is `indeterminate` → `unknown`.\n- **The plan review caught the same class again** in `parse_error`:\nmapping it straight to `ok` would let a server answering an expired\nsession with *200 + a login page* read healthy. The auth-marker check\nnow runs ahead of the 2xx short-circuit.\n- **One suggestion was rejected as written.** Switching `suffixOf` to\n`lastIndexOf` would have introduced the bug it guarded against — for\n`a.b.c` it returns a name *fragment*. Verified all 174 keys have exactly\none dot, kept `indexOf`, and added a guard test pinning the invariant.\n\nAcross both rounds, **seven of twelve changes close paths where the\nsystem could have reported health it had not observed.**\n\n## Files\n\n| File | |\n| --- | --- |\n| `docs/superpowers/specs/2026-07-28-credential-health-design.md` |\ndesign of record |\n| `docs/superpowers/specs/…-design-review.md` | round 1 |\n| `docs/superpowers/specs/…-design-review-response.md` | round 1 applied\n|\n| `docs/superpowers/plans/2026-07-28-credential-health.md` | 14 tasks,\n86 TDD steps |\n| `docs/superpowers/plans/…-review.md` / `…-review-response.md` | round\n2 |\n\nTasks 1–9 are a shippable milestone on their own (passive observation +\n`nimbus creds`); 10–14 add declared expiry, the probe, config and the\nauth-time prompt.\n\n## Verification\n\n`lint:markdown` 0 issues · `audit:doc-refs` 627 refs all resolve ·\n`lychee` 8/8 links OK\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n<!-- This is an auto-generated comment: release notes by coderabbit.ai\n-->\n\n## Summary by CodeRabbit\n\n- **Documentation**\n- Added comprehensive Credential Health design and implementation\nplanning documentation.\n- Documented credential status reporting, expiry tracking, active\nchecks, configurable staleness thresholds, and connector cleanup\nbehavior.\n- Clarified handling for authentication failures, transient errors,\nmalformed responses, and XML/SOAP error messages.\n- Recorded design and implementation review decisions, testing\nexpectations, concurrency safeguards, and security requirements for\nredacted error details.\n\n<!-- end of auto-generated comment: release notes by coderabbit.ai -->\n\n---------\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-28T18:33:49Z",
          "tree_id": "97daf72160712127bc0c87da4a1c4208ec64241b",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/bf543612d63697dadd6dd20f70678f47343999cf"
        },
        "date": 1785264136713,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 238.99155889999602,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 239.81172170000028,
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
          "id": "b68254a2261c0caadab3d562c42b64da994c42bf",
          "message": "docs: retire the ecosystem roadmap, fold sequencing into the product roadmap (#913)\n\nDeletes `docs/ecosystem-roadmap.md` and gives each of its two jobs a\nreal home.\n\n## Why\n\nIt **closed on 2026-07-24** — but never went away. Four days later three\nrepositories still cited it, and two of them called it *authoritative*,\nin the present tense:\n\n| Repo | Said |\n|---|---|\n| `docs/ecosystem-roadmap.md` | \"Closed… each surface owned by its own\nrepo's `ROADMAP.md`\" |\n| `nimbus-client/ROADMAP.md` | closed — **and claims** the vacated\ncross-surface role |\n| `nimbus-vscode/docs/ROADMAP.md` | \"**it owns** the client-surfaces /\ndelivery plan across all Nimbus clients\" |\n| `nimbus-sdk/docs/ROADMAP.md` | \"the cross-surface plan… **lives in**\nthe gateway repo's Ecosystem Roadmap\" |\n\nA closed document that three repos treat as live is worse than no\ndocument.\n\n## Where each job went\n\n**Sequencing folds into `roadmap.md`.** The Scope note used to delegate\n\"how capability reaches a human\" elsewhere. It no longer does — which\nsurface should exist next is a product question, and splitting it into a\nsecond sequencing document is precisely how two files came to claim the\nsame authority.\n\nThat note also claimed the client surface is **\"15 methods wide\"**. It\nis **58**, as of client 0.13.0.\n\n**Architecture moves to org level.** How the ecosystem fits together —\nthe repo map, the one-way MIT-into-AGPL contract rule — is not the\nbusiness of one of the repositories it describes. It now lives in\n[`nimbus-agent/.github`\n`ECOSYSTEM.md`](https://github.com/nimbus-agent/.github/blob/main/ECOSYSTEM.md)\n(.github#7, merged), which also corrected two things the old map had\nwrong: it listed 8 repositories when there are **18**, and called\n`nimbus-mcp-servers` \"proposed\" when it exists.\n\n## Other changes\n\n- `infrastructure-roadmap.md` said *\"Three roadmaps, three axes\"* and\n**yielded to** the ecosystem roadmap on client reachability. Now two\naxes, with a note recording where the third went so the change is\nlegible to anyone who remembers it.\n- `docs/CHANGELOG.md`'s historical entry is **delinked rather than\nrewritten**. It is a dated record of what happened, and the file it\nreferenced was real at the time — a link would 404, but the text stays\ntrue.\n- `docs/README.md`'s tree entry removed.\n\n## Verification\n\n`lint:markdown` 0 issues · `audit:doc-refs` **626** refs all resolve\n(down exactly one, as expected) · `lychee` 1062 links, **0 errors**\n\n## Companion PRs\n\nTwelve files across three satellites referenced the deleted document.\nRepointed at whichever successor each actually meant:\n\n- nimbus-agent/nimbus-sdk#53\n- nimbus-agent/nimbus-client#42\n- nimbus-agent/nimbus-vscode#61\n\n**Merge those first** — this PR is what makes their links 404.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-28T18:44:25Z",
          "tree_id": "83967435ac0b8fd1d9f34016ed2fab2e3119de85",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/b68254a2261c0caadab3d562c42b64da994c42bf"
        },
        "date": 1785265036456,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 313.151608700004,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 315.8476614499999,
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
          "id": "e684541cc4fb6efaab93283f72795e3de7eeac67",
          "message": "docs(roadmap): sequence the client surfaces (#914)\n\nFollow-up to #913, which merged before this commit landed on the branch.\n#913 deleted `ecosystem-roadmap.md` and declared that the Spine now owns\nsurface sequencing; **this is that ownership made real rather than\nasserted.**\n\nAdds a **Client surfaces** table to Track 2 (Scale & Surface), where\nproductization already lives.\n\n## The order, and why\n\nSequenced by thesis fit, not by ease:\n\n| Surface | State | Position |\n|---|---|---|\n| `nimbus-vscode` · `nimbus-web-clipper` | ✅ shipping | — |\n| **`nimbus-statuspage`** | 🧱 scaffold | **First.** \"On-call\nintelligence for DevOps and platform teams\" is the Nimbus repo's own\ndescription, and statuspage is that sentence rendered. Its entire data\ndependency already ships — the DORA calculators, `incident`/`alert`\nitems — and it is read-only, so it cannot violate an invariant. |\n| `nimbus-postmortem` | 🧱 scaffold | Second. Same thesis, same read-only\nshape, but needs incident-narrative assembly over the relationship graph\nthat doesn't exist yet. |\n| `nimbus-raycast` | 🧱 scaffold | Third. Pleasant but generic — a\nquick-ask surface differentiates least, and it's macOS-only. |\n\n## What changed outside this PR\n\nAll three scaffolds are now **public and MIT**, with private\nvulnerability reporting enabled to match the other public repos.\n`nimbus-postmortem` was **created** — it was named in the retired\necosystem roadmap and handed off to \"its own repo's `ROADMAP.md`\",\nexcept the repository didn't exist. It now carries the same\nvision-README + build-prompt shape its two siblings already had.\n\n## One deliberate omission\n\n**None of the three gets its own `ROADMAP.md`.** A vision README, a\nbuild prompt *and* a roadmap is three documents answering one question\nin a repo with no code — which is precisely how `ecosystem-roadmap.md`,\n`nimbus-client` and `nimbus-vscode` ended up claiming the same\nauthority. The scaffolds say what they are; this table says when they\nget built.\n\nVerification: `lint:markdown` 0 issues · `audit:doc-refs` 626 refs all\nresolve · `lychee` 78 links, 0 errors.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-28T22:00:34+03:00",
          "tree_id": "7e4ab389ec240cf03f0d2f6e559c0a8a17248d54",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/e684541cc4fb6efaab93283f72795e3de7eeac67"
        },
        "date": 1785266122731,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 315.7374384000024,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 309.3038538500008,
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
          "id": "393e7de7982e1a74f5544c1571b463bf66207c52",
          "message": "fix(docs): serve .well-known/security.txt by disabling Jekyll filtering (#915)\n\n`security.txt` was added to `packages/docs/public/.well-known/` in #909,\nthe docs deploy succeeded — and the file **404s**:\n\n```\nGET https://nimbus-agent.dev/.well-known/security.txt   → 404\nGET https://nimbus-agent.dev/perf/latest.json           → 200\n```\n\nBoth live in `packages/docs/public/`. Both are emitted by the same\nbuild. The only difference is the **leading dot** — GitHub Pages filters\ndot-directories out of the published site unless a `.nojekyll` marker is\npresent, and `public/` had none.\n\nFix: an empty `packages/docs/public/.nojekyll`, which Astro copies to\n`dist/` and which disables that filtering. Verified locally — `dist/`\nnow contains both `.nojekyll` and `.well-known/security.txt`.\n\n## How this was missed\n\nThe original verification was that `astro build` **produced**\n`dist/.well-known/security.txt`. It did. That proved nothing about what\nPages *serves*.\n\nBuilding a file and serving it are different claims, and only one of\nthem was checked — the same presence-vs-validity error behind today's\nother failures: seven store secrets that existed but didn't work, and\nDependabot reporting zero alerts while `bun audit` found ten.\n\n## Post-merge check\n\n```bash\ncurl -o /dev/null -w '%{http_code}' https://nimbus-agent.dev/.well-known/security.txt\n```\n\nMust return **200**. Until it does, RFC 9116 discovery doesn't work and\nthe org's public disclosure policy has no machine-readable entry point —\nwhich was the entire point of publishing it.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-28T22:01:00+03:00",
          "tree_id": "dce32267c8bf23468b1ace63905471190bcfeb0f",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/393e7de7982e1a74f5544c1571b463bf66207c52"
        },
        "date": 1785266875734,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 308.1464588500006,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 313.8771685500084,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "306811640+nimbus-release-bot[bot]@users.noreply.github.com",
            "name": "nimbus-release-bot[bot]",
            "username": "nimbus-release-bot[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "8514fa228a8b670919e2b9f479fb375bdd6f7bb9",
          "message": "chore: release main (#916)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n<details><summary>1.5.1</summary>\n\n##\n[1.5.1](https://github.com/nimbus-agent/Nimbus/compare/v1.5.0...v1.5.1)\n(2026-07-28)\n\n\n### Bug Fixes\n\n* **docs:** serve .well-known/security.txt by disabling Jekyll filtering\n([#915](https://github.com/nimbus-agent/Nimbus/issues/915))\n([393e7de](https://github.com/nimbus-agent/Nimbus/commit/393e7de7982e1a74f5544c1571b463bf66207c52))\n</details>\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\nCo-authored-by: nimbus-release-bot[bot] <306811640+nimbus-release-bot[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-28T19:38:16Z",
          "tree_id": "77621f2c4ceaf0eddf38fd235812129cd5314fdd",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/8514fa228a8b670919e2b9f479fb375bdd6f7bb9"
        },
        "date": 1785268303937,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 310.0149639499963,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 307.9984760500003,
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
          "id": "04961ba9edf1d2ba0ccd2a9c4f122996df546783",
          "message": "feat(ci): widen audit:org-settings-drift from 2 settings to 12 across 4 endpoints (#918)\n\n## Why\n\n`audit:org-settings-drift` exists because \"manual UI settings revert\nsilently\" — that is its own docstring. It watched **2** settings. `GET\n/orgs/nimbus-agent` returns ~20 security-relevant ones, and the org\nActions policy endpoints (which hold `sha_pinning_required`,\n`default_workflow_permissions` and the fork-PR approval policy) were\n**not consulted at all**.\n\nThe org is on the Free plan, so `GET /orgs/{org}/audit-log` is\nunavailable: a revert of any of the other eighteen is both undetected\n*and* unreconstructable after the fact. The gate wasn't wrong — it was\nscoped to the two settings whose reversion had bitten at the time it was\nwritten, which is the pattern this roadmap's opening table exists to\nbreak.\n\n## What\n\n`.github/org-access.json` grows from 2 declared settings to 12, across 4\nread endpoints.\n\n| Endpoint | Newly gated |\n| --- | --- |\n| `orgs/nimbus-agent` | `two_factor_requirement_enabled`,\n`members_can_fork_private_repositories`,\n`members_can_delete_repositories`, `members_can_change_repo_visibility`,\n`members_can_create_public_repositories`,\n`members_can_create_private_repositories` |\n| `orgs/nimbus-agent/actions/permissions` | `sha_pinning_required` |\n| `orgs/nimbus-agent/actions/permissions/workflow` |\n`default_workflow_permissions`, `can_approve_pull_request_reviews` |\n| `orgs/nimbus-agent/actions/permissions/fork-pr-contributor-approval` |\n`approval_policy` |\n\n`sha_pinning_required` is the highest-value entry: it is a single UI\ntoggle and the only real-time unpinned-`uses:` control covering the\npublic repos **outside** the 8-repo `sha-pins` matrix. Disarming it\ntoday is invisible to every gate in the program.\n\n`ORG_SETTING_SOURCES` is the one place the endpoint → declared-block\nmapping lives, and `diffOrgSettings` is reused **unchanged** — it\nalready looped over whatever keys the JSON declares. Adding a further\nsetting on an already-listed endpoint is therefore a one-line JSON\nchange with no code edit.\n\n## Failure classification (the part worth reviewing)\n\n`decideExit` mirrors the shape already in `check-ruleset-drift.ts`:\n\n- drift found on a readable endpoint is **never** discarded because a\n*different* endpoint's `gh` call failed;\n- a **404** on a declared endpoint is a finding — it was declared, so\nits disappearance is drift of exactly the kind this gate catches;\n- a **403 / 5xx / network** failure is `indeterminate`: it warns, and is\nnever silently recorded as compliance;\n- only \"nothing readable at all\" degrades to the pre-existing soft-local\n/ strict-CI skip, so an unauthenticated local run behaves\n**byte-identically** to before.\n\n`buildJqProjection` validates every declared key against\n`^[a-z][a-z0-9_]*$` before interpolating it into the jq program, and a\ntest asserts no endpoint carries a leading slash (Git Bash rewrites\n`/orgs/...` into a filesystem path — that failure would classify as\n`indeterminate`, i.e. a silently unwatched setting).\n\n## Token permissions — no workflow change needed\n\nThe sweep already mints its App token with\n`permission-organization-administration: read`, which is what all three\nActions endpoints require. `org-drift-sweep.yml` is untouched. **Watch\nthe first scheduled run**: if any Actions endpoint 403s, the gate warns\nand stays green rather than going red, and the fix is a token-permission\nchange, not a revert.\n\n## `approval_policy` is deliberately recorded at its *current* value\n\nLive is `first_time_contributors`. Declaring it means a **loosening** is\ncaught. The settings audit separately recommends tightening to\n`all_external_contributors` — that is an owner decision and a separate,\ndeliberate change to this file **and** the org setting in one reviewed\ndiff, not something this PR smuggles in.\n\n## Verification\n\n- `bun test scripts/structure-audit/` → **357 pass, 0 fail** (26 files)\n- `tsc -p scripts/tsconfig.json` → clean\n- `bunx biome check packages scripts .github docs` → 3005 files, clean\n- `bunx markdownlint-cli2` → 0 issues\n- `bun scripts/preflight.ts --fast` → `typecheck` ✓ (the `lint` leg is\nthe documented `.claude/worktrees/` biome false-fail — \"Checked 0\nfiles\"; validated via the direct invocation above)\n- **Live green:** `bun\nscripts/structure-audit/check-org-settings-drift.ts` →\n`audit:org-settings-drift: OK (4 sources)` against the real org\n- **Red-proved:** flipping the declared `sha_pinning_required` and\n`two_factor_requirement_enabled` in a copy of the file exits **1** and\nnames both the source and the field:\n\n  ```text\naudit:org-settings-drift: org: two_factor_requirement_enabled: expected\nfalse, got true\naudit:org-settings-drift: actions/permissions: sha_pinning_required:\nexpected false, got true\n  ```\n\nNo new npm script, so `scripts/lib/preflight-gates.ts` needs no manifest\nentry — `audit:org-settings-drift` is already listed there as\nsweep-only.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-29T18:06:16+03:00",
          "tree_id": "4b0306ac946325926551e08396dbe1ad6af853c2",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/04961ba9edf1d2ba0ccd2a9c4f122996df546783"
        },
        "date": 1785338464920,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 310.4083240999997,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 309.8841382500024,
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
          "id": "0f0b14029396f4bc6cc5f73ce6427f115d03d1e5",
          "message": "feat(audit): detect when main is red (#917)\n\nNothing in this repo answered **\"is `main` broken?\"** — and on\n2026-07-28 `main` was red for **4.75 hours across six consecutive\npushes**, noticed only because a human happened to be looking.\n\n## The blindness is structural\n\n`collect.ts:157` requests:\n\n```\nactions/runs?...&event=push&status=success\n```\n\nFailed runs are **never fetched at all**, and the collector then drops\nany job whose conclusion isn't `success`. A workflow that fails 100% of\nthe time therefore produces **zero observations** and is reported as\n*nothing* rather than as *broken*.\n\nThat is not hypothetical either: the scheduled `Performance Reference\nRun` has **11 runs and 0 successes** and is invisible to every existing\ncontrol for exactly this reason.\n\n## What this adds\n\n`assessMainHealth()` — pure, clock injected — plus a fetcher that asks\nfor push runs on `main` **without the status filter**. The missing\nfilter is the entire point.\n\nFour deliberate behaviours, each with a **red-proved** test:\n\n| Behaviour | Why |\n|---|---|\n| A **cancelled** run is neutral — skipped entirely, neither starting\nnor ending a red streak | Cancellations here are usually concurrency\nevictions. Counting them red manufactures outages from ordinary CI\nbehaviour; counting them green lets a cancel mask a real failure behind\nit. |\n| An **in-progress** run is ignored, not treated as failing | Otherwise\nthe gate flaps every time a push is mid-flight. |\n| **No completed run yields `known: false`, not green** | Absence of\nevidence reported as absence — the same rule the credential-health\ndesign turns on, and the exact failure mode this gate exists to close. |\n| **`startup_failure` counts as a failure** | A workflow that dies at\nstartup is precisely what a success-only collector cannot see. |\n\n## Where it runs, and when it fails\n\nWired into the existing `audit:ci-latency` entry point — **adds no CI\njob.** That job already runs on a schedule, so the assessment rides\nalong.\n\n**Reported always; fails only under `--strict`** (the scheduled sweep).\nA contributor's PR cannot fix a `main` that someone else broke, and a\ngate that reds for something nobody can act on is one everybody learns\nto ignore. That's the same rule `check.ts` already applies to queue and\nDAG wait, stated in its own header.\n\n## Verification\n\n9 new tests (96 across the module) · `typecheck` exit 0 · `lint` exit 0\n\nBoth load-bearing guards were red-proved — breaking the\ncancelled-is-neutral rule fails 1 test, breaking absence-is-not-health\nfails 2.\n\nImplements Finding B from the CI/CD improvement plan (#911).\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>",
          "timestamp": "2026-07-29T18:06:51+03:00",
          "tree_id": "abfd2be2d3da82756fbda329834f248311cd1240",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/0f0b14029396f4bc6cc5f73ce6427f115d03d1e5"
        },
        "date": 1785339272236,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 318.3387241500033,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 314.9621900500009,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "306811640+nimbus-release-bot[bot]@users.noreply.github.com",
            "name": "nimbus-release-bot[bot]",
            "username": "nimbus-release-bot[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "daca5bc8ebd4edfdc32f5145dbdecb9c24c367b4",
          "message": "chore: release main (#919)\n\n:robot: I have created a release *beep* *boop*\n---\n\n\n<details><summary>1.6.0</summary>\n\n##\n[1.6.0](https://github.com/nimbus-agent/Nimbus/compare/v1.5.1...v1.6.0)\n(2026-07-29)\n\n\n### Features\n\n* **audit:** detect when main is red\n([#917](https://github.com/nimbus-agent/Nimbus/issues/917))\n([0f0b140](https://github.com/nimbus-agent/Nimbus/commit/0f0b14029396f4bc6cc5f73ce6427f115d03d1e5))\n* **ci:** widen audit:org-settings-drift from 2 settings to 12 across 4\nendpoints ([#918](https://github.com/nimbus-agent/Nimbus/issues/918))\n([04961ba](https://github.com/nimbus-agent/Nimbus/commit/04961ba9edf1d2ba0ccd2a9c4f122996df546783))\n</details>\n\n---\nThis PR was generated with [Release\nPlease](https://github.com/googleapis/release-please). See\n[documentation](https://github.com/googleapis/release-please#release-please).\n\nCo-authored-by: nimbus-release-bot[bot] <306811640+nimbus-release-bot[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-29T15:31:06Z",
          "tree_id": "32a24d587af520de5be6d2894cc5aeafa3f0f8a3",
          "url": "https://github.com/nimbus-agent/Nimbus/commit/daca5bc8ebd4edfdc32f5145dbdecb9c24c367b4"
        },
        "date": 1785340099201,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "S11-a p95",
            "value": 319.8467996500029,
            "unit": "ms"
          },
          {
            "name": "S11-b p95",
            "value": 322.81307100000487,
            "unit": "ms"
          }
        ]
      }
    ]
  }
}