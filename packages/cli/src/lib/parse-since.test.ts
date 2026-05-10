import { describe, expect, test } from "bun:test";
import { parseSinceDurationToMs } from "./parse-since.ts";

describe("parseSinceDurationToMs", () => {
  test("supports d/h/m/s/ms units (existing contract)", () => {
    expect(parseSinceDurationToMs("7d")).toBe(7 * 24 * 60 * 60 * 1000);
    expect(parseSinceDurationToMs("24h")).toBe(24 * 60 * 60 * 1000);
    expect(parseSinceDurationToMs("30m")).toBe(30 * 60 * 1000);
    expect(parseSinceDurationToMs("90s")).toBe(90 * 1000);
    expect(parseSinceDurationToMs("250ms")).toBe(250);
  });

  test("supports w (weeks) — new in PR 3", () => {
    expect(parseSinceDurationToMs("1w")).toBe(7 * 24 * 60 * 60 * 1000);
    expect(parseSinceDurationToMs("2w")).toBe(2 * 7 * 24 * 60 * 60 * 1000);
  });

  test("rejects unknown units with a helpful message", () => {
    expect(() => parseSinceDurationToMs("5x")).toThrow(/Invalid --since/);
    expect(() => parseSinceDurationToMs("")).toThrow(/Invalid --since/);
  });

  test("rejects negative values", () => {
    expect(() => parseSinceDurationToMs("-1d")).toThrow(/Invalid --since/);
  });
});
