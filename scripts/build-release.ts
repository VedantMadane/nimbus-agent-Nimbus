#!/usr/bin/env bun
/**
 * Production build for all workspaces (`bun build --compile` where defined).
 * Run from anywhere: `bun scripts/build-release.ts` or `scripts/linux/build-release.sh` / `scripts/windows/build-release.ps1`
 *
 * Pass `--skip-tests` to skip the CI-parity test suite (faster local iteration).
 */
import { runCiTestSuite } from "./lib/ci-tests.ts";
import { assertWorkspaceInstalled, REPO_ROOT, run } from "./lib/root.ts";

const skipTests = process.argv.slice(2).includes("--skip-tests");

assertWorkspaceInstalled();
if (skipTests) {
  process.stdout.write("[build-release] --skip-tests: skipping CI test suite\n");
} else {
  await runCiTestSuite();
}
run(["bun", "run", "build"], REPO_ROOT);
