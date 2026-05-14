import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

describe("cast-driver e2e (incident-response committed snapshot)", () => {
  test("committed snapshot files exist", () => {
    const root = process.cwd();
    expect(existsSync(join(root, "docs/demos/scripts/incident-response.yaml"))).toBe(true);
    expect(existsSync(join(root, "docs/demos/snapshots/incident-response.hash"))).toBe(true);
    expect(existsSync(join(root, "docs/demos/snapshots/incident-response.txt"))).toBe(true);
    expect(existsSync(join(root, "docs/demos/incident-response.cast"))).toBe(true);
  });

  test("--check passes against committed snapshot", async () => {
    const proc = Bun.spawn({
      cmd: ["bun", "scripts/cast-driver/run.ts", "--check"],
      stdout: "pipe",
      stderr: "pipe",
    });
    const code = await proc.exited;
    expect(code).toBe(0);
  });
});
