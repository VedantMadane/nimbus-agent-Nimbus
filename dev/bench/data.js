window.BENCHMARK_DATA = {
  "lastUpdate": 1784808669095,
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
      }
    ]
  }
}