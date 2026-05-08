import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { sidecarFilename, sidecarPath } from "./sqlite-vec-load.ts";

describe("sidecarFilename", () => {
  test("win32 → vec0.dll", () => {
    expect(sidecarFilename("win32")).toBe("vec0.dll");
  });
  test("darwin → vec0.dylib", () => {
    expect(sidecarFilename("darwin")).toBe("vec0.dylib");
  });
  test("linux → vec0.so", () => {
    expect(sidecarFilename("linux")).toBe("vec0.so");
  });
  test("any other Unix-shaped platform → vec0.so", () => {
    expect(sidecarFilename("freebsd")).toBe("vec0.so");
  });
});

describe("sidecarPath", () => {
  test("returns vec0.{ext} adjacent to the given exec path", () => {
    expect(sidecarPath("/opt/nimbus/bin/nimbus-gateway", "linux")).toBe(
      join("/opt/nimbus/bin", "vec0.so"),
    );
  });
  test("works for a Windows-style path", () => {
    expect(sidecarPath("C:\\Program Files\\Nimbus\\nimbus-gateway.exe", "win32")).toBe(
      join("C:\\Program Files\\Nimbus", "vec0.dll"),
    );
  });
});
