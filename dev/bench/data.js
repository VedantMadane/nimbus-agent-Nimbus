window.BENCHMARK_DATA = {
  "lastUpdate": 1781625160351,
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
      }
    ]
  }
}