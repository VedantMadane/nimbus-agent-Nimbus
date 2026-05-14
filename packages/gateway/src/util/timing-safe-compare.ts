import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time SHA-256 hex string equality.
 *
 * S6-F10 / S7-F8 — replaces direct `!==` comparison of hash hex strings,
 * which can leak partial-match timing information across many calls.
 *
 * Returns `false` (not throws) on length mismatch, non-64-char inputs, or
 * malformed hex — invalid hex is rejected before reaching `timingSafeEqual`
 * so the constant-time guarantee only covers the valid-input fast path.
 */
export function sha256HexEqualConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length || a.length !== 64) return false;
  let bufA: Buffer;
  let bufB: Buffer;
  try {
    bufA = Buffer.from(a, "hex");
    bufB = Buffer.from(b, "hex");
  } catch {
    return false;
  }
  if (bufA.length !== 32 || bufB.length !== 32) return false;
  // Buffer.from(hex) silently drops invalid characters and produces a
  // shorter buffer — so the length check above also catches malformed hex.
  return timingSafeEqual(bufA, bufB);
}

/**
 * Constant-time UTF-8 string equality.
 *
 * Canonical helper for invariant I10. Use for pairing codes, bearer tokens,
 * and any other opaque-string compare where a `===` would leak prefix-match
 * timing information.
 *
 * On length mismatch the function burns the same number of CPU cycles a real
 * compare would (by running `timingSafeEqual(aBuf, aBuf)` and discarding the
 * result) so observers see only "not equal" — never the byte position where
 * the inputs diverged or which input was the longer one.
 */
export function constantTimeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) {
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}
