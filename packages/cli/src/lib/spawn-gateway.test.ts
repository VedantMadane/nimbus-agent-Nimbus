import { describe, expect, test } from "bun:test";

import { stripInspectorEnv } from "./spawn-gateway.ts";

describe("stripInspectorEnv", () => {
  test("removes Bun inspector env vars set by VS Code auto-attach", () => {
    const env: NodeJS.ProcessEnv = {
      PATH: "/usr/bin",
      BUN_INSPECT: "ws+unix:///tmp/bun.sock",
      BUN_INSPECT_BRK: "1",
      BUN_INSPECT_NOTIFY: "ws+unix:///tmp/notify.sock",
      BUN_INSPECT_PRELOAD: "/some/preload.js",
      BUN_INSPECT_CONNECT_TO: "ws://127.0.0.1:63855",
      BUN_INSPECT_DISABLE: "0",
      NODE_INSPECT_RESUME_ON_START: "1",
      NODE_OPTIONS: "--inspect=63855",
    };
    const out = stripInspectorEnv(env);
    expect(out["PATH"]).toBe("/usr/bin");
    expect(out["BUN_INSPECT"]).toBeUndefined();
    expect(out["BUN_INSPECT_BRK"]).toBeUndefined();
    expect(out["BUN_INSPECT_NOTIFY"]).toBeUndefined();
    expect(out["BUN_INSPECT_PRELOAD"]).toBeUndefined();
    expect(out["BUN_INSPECT_CONNECT_TO"]).toBeUndefined();
    expect(out["BUN_INSPECT_DISABLE"]).toBeUndefined();
    expect(out["NODE_INSPECT_RESUME_ON_START"]).toBeUndefined();
    expect(out["NODE_OPTIONS"]).toBeUndefined();
  });

  test("leaves the input env untouched", () => {
    const env: NodeJS.ProcessEnv = { BUN_INSPECT: "1", PATH: "/usr/bin" };
    stripInspectorEnv(env);
    expect(env["BUN_INSPECT"]).toBe("1");
  });

  test("returns a copy with non-inspector keys preserved", () => {
    const env: NodeJS.ProcessEnv = {
      PATH: "/usr/bin",
      HOME: "/home/me",
      NIMBUS_PROFILE: "work",
    };
    const out = stripInspectorEnv(env);
    expect(out).toEqual(env);
    expect(out).not.toBe(env);
  });
});
