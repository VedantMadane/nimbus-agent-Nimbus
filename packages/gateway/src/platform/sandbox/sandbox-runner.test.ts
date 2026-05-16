import { describe, expect, it } from "bun:test";
import { createSandboxRunner } from "./sandbox-runner";

describe("createSandboxRunner", () => {
  it("returns a runner matching the current platform", () => {
    const runner = createSandboxRunner();
    expect(runner.platform).toBe(process.platform as "linux" | "darwin" | "win32");
  });

  it("exposes the SandboxRunner shape", () => {
    const runner = createSandboxRunner();
    expect(typeof runner.spawn).toBe("function");
    expect(typeof runner.isFullyActive).toBe("function");
    expect(typeof runner.degradedReason).toBe("function");
  });
});
