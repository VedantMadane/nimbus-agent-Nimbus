window.BENCHMARK_DATA = {
  "lastUpdate": 1781548554085,
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
      }
    ]
  }
}