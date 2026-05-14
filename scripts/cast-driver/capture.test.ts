import { describe, expect, test } from "bun:test";
import { spawnCapture } from "./capture.ts";

describe("spawnCapture", () => {
  test("captures stdout in time-ordered chunks", async () => {
    const result = await spawnCapture({
      cmd: ["bun", "-e", "console.log('hello'); await Bun.sleep(20); console.log('world');"],
      env: process.env as Record<string, string>,
      timeoutMs: 5000,
    });
    expect(result.exitCode).toBe(0);
    expect(result.chunks.length).toBeGreaterThanOrEqual(1);
    const text = result.chunks.map((c) => c.data).join("");
    expect(text).toContain("hello");
    expect(text).toContain("world");
  });

  test("returns non-zero exit code when subprocess fails", async () => {
    const result = await spawnCapture({
      cmd: ["bun", "-e", "process.exit(2)"],
      env: process.env as Record<string, string>,
      timeoutMs: 5000,
    });
    expect(result.exitCode).toBe(2);
  });

  test("times out on a hanging process", async () => {
    const result = await spawnCapture({
      cmd: ["bun", "-e", "await new Promise(() => {})"],
      env: process.env as Record<string, string>,
      timeoutMs: 200,
    });
    expect(result.timedOut).toBe(true);
  });

  test("captures stderr separately", async () => {
    const result = await spawnCapture({
      cmd: ["bun", "-e", "console.error('oops')"],
      env: process.env as Record<string, string>,
      timeoutMs: 5000,
    });
    expect(result.stderr).toContain("oops");
    expect(result.chunks.map((c) => c.data).join("")).not.toContain("oops");
  });
});
