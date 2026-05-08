/**
 * BUG-001 regression coverage.
 *
 * `nimbus diag --json` (and any other JSON-emitting command) must not wrap
 * its body with the Clack `intro("Nimbus")` header or the `outro("Done.")`
 * footer when stdout is non-TTY or when `--json` is in the argv. The smoke
 * run on Windows (2026-05-07) caught this: every consumer that piped CLI
 * stdout into `ConvertFrom-Json` / `jq` / a shell pipeline choked on the
 * banner prefix.
 *
 * These tests spawn the real CLI entry point with stdout piped (so isTTY
 * is false in the child) and assert the banner bytes never appear.
 */

import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const cliEntry = fileURLToPath(new URL("../../src/index.ts", import.meta.url));

async function spawnCli(
  args: readonly string[],
  env: Record<string, string> = {},
): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  const proc = Bun.spawn({
    cmd: [process.execPath, "run", cliEntry, ...args],
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...env },
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { stdout, stderr, exitCode };
}

describe("CLI banner suppression (BUG-001)", () => {
  test("non-TTY stdout suppresses Clack intro/outro", async () => {
    const { stdout, exitCode } = await spawnCli(["help"]);
    expect(exitCode).toBe(0);
    // The Clack outro renders `Done.` on its own line. Any `Done.` substring
    // in stdout means the outro fired. The CLI's help text never uses that
    // word, so this is a clean signal.
    expect(stdout).not.toContain("Done.");
    // The Clack intro renders the title prefixed with a box-drawing glyph
    // (`┌  Nimbus`, possibly downgraded to `T  Nimbus` on Windows). The help
    // output starts with `Nimbus CLI` (no glyph prefix), so we assert the
    // first non-empty line does not begin with the banner shape.
    const firstLine = stdout.split("\n").find((l) => l.trim().length > 0) ?? "";
    expect(firstLine).not.toMatch(/^\s*[┌T│|]\s+Nimbus\s*$/);
  });

  test("--json arg suppresses banner even when TTY heuristic would otherwise fire", async () => {
    const { stdout, exitCode } = await spawnCli(["help", "--json"]);
    expect(exitCode).toBe(0);
    expect(stdout).not.toContain("Done.");
  });

  test("NIMBUS_QUIET=1 suppresses banner", async () => {
    const { stdout, exitCode } = await spawnCli(["help"], { NIMBUS_QUIET: "1" });
    expect(exitCode).toBe(0);
    expect(stdout).not.toContain("Done.");
  });
});
