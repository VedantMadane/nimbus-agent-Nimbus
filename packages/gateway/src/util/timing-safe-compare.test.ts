import { expect, test } from "bun:test";
import { constantTimeStringEqual, sha256HexEqualConstantTime } from "./timing-safe-compare.ts";

// ─── sha256HexEqualConstantTime — regression-lock from hex-compare.ts ────────

test("sha256HexEqualConstantTime: returns true for equal 64-char hex", () => {
  const h = "a".repeat(64);
  expect(sha256HexEqualConstantTime(h, h)).toBe(true);
});

test("sha256HexEqualConstantTime: returns false for unequal hex of equal length", () => {
  const a = "a".repeat(64);
  const b = "b".repeat(64);
  expect(sha256HexEqualConstantTime(a, b)).toBe(false);
});

test("sha256HexEqualConstantTime: returns false when first input is not 64 chars", () => {
  const short = "a".repeat(63);
  const ok = "a".repeat(64);
  expect(sha256HexEqualConstantTime(short, ok)).toBe(false);
});

test("sha256HexEqualConstantTime: returns false when second input is not 64 chars", () => {
  const ok = "a".repeat(64);
  const short = "a".repeat(63);
  expect(sha256HexEqualConstantTime(ok, short)).toBe(false);
});

test("sha256HexEqualConstantTime: returns false when both inputs are empty", () => {
  expect(sha256HexEqualConstantTime("", "")).toBe(false);
});

test("sha256HexEqualConstantTime: returns false for malformed hex (non-hex chars)", () => {
  // 64 chars but contains a non-hex character.
  const malformed = `${"a".repeat(63)}Z`;
  const ok = "a".repeat(64);
  expect(sha256HexEqualConstantTime(malformed, ok)).toBe(false);
});

test("sha256HexEqualConstantTime: differs by a single character in the middle", () => {
  const a = "a".repeat(64);
  const b = `${"a".repeat(32)}b${"a".repeat(31)}`;
  expect(sha256HexEqualConstantTime(a, b)).toBe(false);
});

// ─── constantTimeStringEqual — new canonical helper ─────────────────────────

test("constantTimeStringEqual: returns true for equal strings", () => {
  expect(constantTimeStringEqual("hello", "hello")).toBe(true);
});

test("constantTimeStringEqual: returns false for different strings of same length", () => {
  expect(constantTimeStringEqual("hello", "world")).toBe(false);
});

test("constantTimeStringEqual: returns false for different lengths", () => {
  expect(constantTimeStringEqual("abc", "abcd")).toBe(false);
  expect(constantTimeStringEqual("abcd", "abc")).toBe(false);
});

test("constantTimeStringEqual: returns true for two empty strings", () => {
  expect(constantTimeStringEqual("", "")).toBe(true);
});

test("constantTimeStringEqual: returns false when only one input is empty", () => {
  expect(constantTimeStringEqual("", "x")).toBe(false);
  expect(constantTimeStringEqual("x", "")).toBe(false);
});

test("constantTimeStringEqual: handles UTF-8 multi-byte characters correctly", () => {
  // The new canonical helper is Buffer-based (UTF-8 byte compare), which means
  // multi-byte characters are compared byte-for-byte. Locked in the T6 spec §2 PR 1
  // ("Buffer-based, with length-mismatch burn cycle to match the defensive shape
  // of `http-auth.ts`'s helper").
  expect(constantTimeStringEqual("café", "café")).toBe(true);
  expect(constantTimeStringEqual("café", "cafe")).toBe(false); // differs in last byte (length differs)
  // Two visually distinct multi-byte strings of the same UTF-8 byte length.
  expect(constantTimeStringEqual("café", "cafè")).toBe(false);
});

test("constantTimeStringEqual: returns true for typical base58 pairing-code shapes", () => {
  // Locks in compatibility for lan-pairing's existing call site (20-char base58).
  const code = "BqSv9KQwz8m3Y4r2Lh1n";
  expect(constantTimeStringEqual(code, code)).toBe(true);
  expect(constantTimeStringEqual(code, "BqSv9KQwz8m3Y4r2Lh1m")).toBe(false); // differs last char
});

test("constantTimeStringEqual: returns true for typical bearer-token shapes", () => {
  // Locks in compatibility for http-auth's existing call site (long opaque token).
  const t = "n1mb_dep1oy_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  expect(constantTimeStringEqual(t, t)).toBe(true);
  expect(constantTimeStringEqual(t, t.slice(0, -1) + "Z")).toBe(false);
});
