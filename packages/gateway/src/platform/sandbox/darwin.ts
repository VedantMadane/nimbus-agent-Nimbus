import type { ChildProcess } from "node:child_process";
import type { SandboxRunner, SandboxSpawnOptions } from "./sandbox-runner.ts";

export function createDarwinSandboxRunner(): SandboxRunner {
  return {
    platform: "darwin",
    spawn(_cmd: string, _args: string[], _opts: SandboxSpawnOptions): ChildProcess {
      throw new Error("macOS sandbox not yet implemented — see Plan Task 10");
    },
    isFullyActive: () => false,
    degradedReason: () => "not implemented",
  };
}
