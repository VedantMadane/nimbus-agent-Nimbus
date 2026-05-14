/**
 * Phase 5 T4 PR 3b — Bearer-token auth for the HTTP write surface.
 *
 * The token is stored under vault key `http_api.deployment_token`. This
 * key is system-level (not connector-scoped) and lives outside
 * CONNECTOR_VAULT_SECRET_KEYS by design — see the design §4 note.
 *
 * Constant-time compare prevents timing-side-channel discovery of the
 * token through prefix-difference latency.
 */

import { createHash, timingSafeEqual } from "node:crypto";

export const HTTP_API_DEPLOYMENT_TOKEN_VAULT_KEY = "http_api.deployment_token";

const BEARER_PREFIX = "Bearer ";

export function tokenFingerprint(token: string | undefined): string {
  if (token === undefined || token === "") return "unknown";
  return createHash("sha256").update(token).digest("hex").slice(0, 8);
}

export interface RequireBearerContext {
  /** Empty string => write surface disabled (vault key absent). */
  readonly expectedToken: string;
}

export interface RequireBearerResult {
  readonly ok: boolean;
  readonly fingerprint: string;
  readonly surfaceDisabled?: boolean;
}

function extractBearer(req: Request): string | undefined {
  const raw = req.headers.get("authorization");
  if (raw === null) return undefined;
  if (!raw.startsWith(BEARER_PREFIX)) return undefined;
  return raw.slice(BEARER_PREFIX.length);
}

function constantTimeStringEqual(a: string, b: string): boolean {
  // Pad the shorter string so the comparison is over equal-length buffers.
  // The length-difference itself is leaked only as "not equal" — it never
  // reveals byte positions.
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) {
    // Burn the same number of cycles a real compare would, then return false.
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

export function requireBearer(req: Request, ctx: RequireBearerContext): RequireBearerResult {
  if (ctx.expectedToken === "") {
    return { ok: false, fingerprint: "unknown", surfaceDisabled: true };
  }
  const presented = extractBearer(req);
  if (presented === undefined) {
    return { ok: false, fingerprint: "unknown" };
  }
  const ok = constantTimeStringEqual(presented, ctx.expectedToken);
  return { ok, fingerprint: tokenFingerprint(presented) };
}
