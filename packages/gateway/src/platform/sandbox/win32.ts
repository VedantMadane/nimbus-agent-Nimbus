import type { ChildProcess } from "node:child_process";
import type { SandboxRunner, SandboxSpawnOptions } from "./sandbox-runner.ts";

export function createWin32SandboxRunner(): SandboxRunner {
  return {
    platform: "win32",
    spawn(_cmd: string, _args: string[], _opts: SandboxSpawnOptions): ChildProcess {
      throw new Error("Windows sandbox not yet implemented — see Plan Task 12");
    },
    isFullyActive: () => false,
    degradedReason: () => "not implemented",
  };
}
