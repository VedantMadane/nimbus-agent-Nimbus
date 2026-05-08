import type { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { sidecarFilename, sidecarPath, tryLoadFromSidecar } from "./sqlite-vec-load.ts";

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

describe("tryLoadFromSidecar", () => {
  test("calls db.loadExtension with the sidecar path when the file exists", () => {
    const tmp = mkdtempSync(join(tmpdir(), "nimbus-vec-sidecar-"));
    const fname = sidecarFilename(process.platform);
    writeFileSync(join(tmp, fname), "");
    const calls: string[] = [];
    const fakeDb = {
      loadExtension: (p: string) => {
        calls.push(p);
      },
    } as unknown as Database;

    const ok = tryLoadFromSidecar(fakeDb, tmp);

    expect(ok).toBe(true);
    expect(calls).toEqual([join(tmp, fname)]);
  });

  test("returns false silently when the sidecar file is missing", () => {
    const tmp = mkdtempSync(join(tmpdir(), "nimbus-vec-sidecar-empty-"));
    const fakeDb = {
      loadExtension: (_p: string) => {
        throw new Error("should not be called when sidecar is absent");
      },
    } as unknown as Database;

    const ok = tryLoadFromSidecar(fakeDb, tmp);

    expect(ok).toBe(false);
  });

  test("returns false when db.loadExtension throws (e.g. corrupt binary)", () => {
    const tmp = mkdtempSync(join(tmpdir(), "nimbus-vec-sidecar-corrupt-"));
    writeFileSync(join(tmp, sidecarFilename(process.platform)), "");
    const fakeDb = {
      loadExtension: (_p: string) => {
        throw new Error("not a valid extension");
      },
    } as unknown as Database;

    const ok = tryLoadFromSidecar(fakeDb, tmp);

    expect(ok).toBe(false);
  });

  test("falls back to dirname(process.execPath) as default baseDir", () => {
    // process.execPath in tests is the Bun binary; vec0.{ext} won't be next to it,
    // so the function must return false without throwing — exercising the default-arg branch.
    const fakeDb = {
      loadExtension: (_p: string) => {
        throw new Error("should not be called when sidecar is absent");
      },
    } as unknown as Database;

    expect(tryLoadFromSidecar(fakeDb)).toBe(false);
  });
});
