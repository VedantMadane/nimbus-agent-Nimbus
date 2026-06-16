window.BENCHMARK_DATA = {
  "lastUpdate": 1781653226116,
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
      }
    ]
  }
}