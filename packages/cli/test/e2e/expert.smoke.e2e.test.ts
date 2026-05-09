import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Lightweight smoke: spawn the CLI without a running Gateway and verify the
 * "Gateway is not running" exit path + help integration. Full Gateway+CLI
 * round-trip e2e is deferred to a follow-up once the e2e harness lands.
 *
 * F-7 follow-up (Rev 2): the existing CLI e2e harness (`cli-smoke.e2e.test.ts`)
 * spawns the CLI without a Gateway and asserts `help` exits 0. There is no
 * harness today for "spin up a real Gateway, seed it, run the CLI against it".
 *
 * Note: `getCliPlatformPaths` in `packages/cli/src/paths.ts` does NOT honour
 * `NIMBUS_DATA_DIR`; it derives `dataDir` from platform-specific env vars
 * (LOCALAPPDATA on Windows, XDG_DATA_HOME on Linux, ~/Library/Application
 * Support on macOS). To deterministically force the no-gateway branch in
 * `readGatewayState`, we point those vars at an empty temp dir so
 * `<dataDir>/gateway.json` does not exist.
 */
describe("nimbus expert e2e (no-Gateway smoke)", () => {
  const cliEntry = fileURLToPath(new URL("../../src/index.ts", import.meta.url));

  function emptyEnvOverrides(): Record<string, string> {
    const root = mkdtempSync(join(tmpdir(), "nimbus-no-gateway-"));
    return {
      // Windows: dataDir = join(LOCALAPPDATA, "Nimbus", "data")
      LOCALAPPDATA: root,
      APPDATA: root,
      // Linux: dataDir = join(XDG_DATA_HOME, "nimbus")
      XDG_DATA_HOME: root,
      XDG_CONFIG_HOME: root,
      XDG_RUNTIME_DIR: root,
      // macOS: dataDir = join(HOME, "Library", "Application Support", "Nimbus")
      HOME: root,
    };
  }

  test("expert exits non-zero with 'Gateway is not running' on stderr when no gateway", async () => {
    const proc = Bun.spawn({
      cmd: [process.execPath, "run", cliEntry, "expert", "src/billing/retry.ts"],
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, ...emptyEnvOverrides() },
    });
    const code = await proc.exited;
    const stderr = await new Response(proc.stderr).text();
    expect(code).not.toBe(0);
    expect(stderr).toContain("Gateway is not running");
  });

  test("help text mentions 'expert' subcommand", async () => {
    const proc = Bun.spawn({
      cmd: [process.execPath, "run", cliEntry, "help"],
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const code = await proc.exited;
    expect(code).toBe(0);
    expect(stdout.toLowerCase()).toContain("expert");
  });
});
