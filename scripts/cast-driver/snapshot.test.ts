import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { atomicWriteFile, sha256Hex, unifiedDiff } from "./snapshot.ts";

let tmpDir: string;
beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "snapshot-test-"));
});
afterEach(() => {
  // OS-managed cleanup; isolation via fresh dir per test
});

describe("sha256Hex", () => {
  test("produces 64 lowercase hex chars", async () => {
    const h = await sha256Hex("hello");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  test("known vector for 'hello'", async () => {
    expect(await sha256Hex("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  test("stable across calls", async () => {
    expect(await sha256Hex("x")).toBe(await sha256Hex("x"));
  });
});

describe("unifiedDiff", () => {
  test("no diff when texts are identical", () => {
    expect(unifiedDiff("a\nb\n", "a\nb\n", "old", "new")).toBe("");
  });

  test("produces a context-style unified diff for differences", () => {
    const d = unifiedDiff("a\nb\nc\n", "a\nX\nc\n", "old.txt", "new.txt");
    expect(d).toContain("--- old.txt");
    expect(d).toContain("+++ new.txt");
    expect(d).toContain("-b");
    expect(d).toContain("+X");
  });

  test("handles a missing baseline (first-run)", () => {
    const d = unifiedDiff(null, "new content\n", "old.txt", "new.txt");
    expect(d).toContain("first-run");
  });
});

describe("atomicWriteFile", () => {
  test("writes content to the target path", async () => {
    const p = join(tmpDir, "out.txt");
    await atomicWriteFile(p, "hello");
    expect(readFileSync(p, "utf8")).toBe("hello");
  });

  test("does not leave a .tmp file behind on success", async () => {
    const p = join(tmpDir, "out.txt");
    await atomicWriteFile(p, "x");
    const entries = readdirSync(tmpDir);
    expect(entries.filter((e) => e.includes(".tmp-"))).toEqual([]);
  });

  test("overwrites an existing file", async () => {
    const p = join(tmpDir, "out.txt");
    writeFileSync(p, "old");
    await atomicWriteFile(p, "new");
    expect(readFileSync(p, "utf8")).toBe("new");
  });

  test("creates parent directory if missing", async () => {
    const p = join(tmpDir, "nested", "deep", "out.txt");
    await atomicWriteFile(p, "x");
    expect(existsSync(p)).toBe(true);
  });
});
