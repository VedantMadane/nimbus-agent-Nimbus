import type { ChildProcess } from "node:child_process";
import type { SandboxRunner, SandboxSpawnOptions } from "./sandbox-runner.ts";

export function createLinuxSandboxRunner(): SandboxRunner {
  return {
    platform: "linux",
    spawn(_cmd: string, _args: string[], _opts: SandboxSpawnOptions): ChildProcess {
      throw new Error("Linux sandbox not yet implemented — see Plan Task 8");
    },
    isFullyActive: () => false,
    degradedReason: () => "not implemented",
  };
}
