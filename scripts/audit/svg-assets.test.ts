import { describe, expect, test } from "bun:test";
import { auditSvgFile } from "./svg-assets.ts";

describe("auditSvgFile", () => {
  test("accepts a valid SVG with explicit dimensions", async () => {
    const tmpPath = `${import.meta.dir}/__fixtures__/valid.svg`;
    const result = await auditSvgFile(tmpPath);
    expect(result.ok).toBe(true);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  test("rejects a malformed SVG", async () => {
    const tmpPath = `${import.meta.dir}/__fixtures__/malformed.svg`;
    const result = await auditSvgFile(tmpPath);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/parse/i);
  });

  test("rejects a zero-dimension SVG", async () => {
    const tmpPath = `${import.meta.dir}/__fixtures__/zero-dim.svg`;
    const result = await auditSvgFile(tmpPath);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/dimension/i);
  });
});
