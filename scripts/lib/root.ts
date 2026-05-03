import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Repository root (parent of `scripts/`). */
export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Fail fast with a clear message if `bun install` has never been run.
 * Without this, the build dies inside `tsc` with a cryptic TS2688
 * ("Cannot find type definition file for 'bun'").
 *
 * Note: this repo uses Bun's isolated linker, so individual packages
 * (e.g. `@types/bun`) live under `node_modules/.bun/...` and are
 * symlinked into per-package `node_modules/`. Checking the root
 * `node_modules/` directory is sufficient to distinguish "never
 * installed" from "installed."
 */
export function assertWorkspaceInstalled(): void {
  if (existsSync(join(REPO_ROOT, "node_modules"))) return;
  process.stderr.write(
    "error: node_modules is missing. Run 'bun install' from the repo root before building.\n",
  );
  process.exit(1);
}

export type RunOptions = {
  /** Merged onto `process.env` for the child process. */
  env?: Record<string, string>;
};

export function run(cmd: readonly string[], cwd: string = REPO_ROOT, options?: RunOptions): void {
  const proc = Bun.spawnSync([...cmd], {
    cwd,
    stdio: ["inherit", "inherit", "inherit"],
    env: options?.env === undefined ? process.env : { ...process.env, ...options.env },
  });
  if (proc.exitCode !== 0) {
    process.exit(proc.exitCode ?? 1);
  }
}
