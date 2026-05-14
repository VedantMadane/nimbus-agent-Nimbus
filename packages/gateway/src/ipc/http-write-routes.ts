/**
 * Phase 5 T4 PR 3b — HTTP write-route dispatcher (invariant I13).
 *
 * This file is the single source of truth for which `POST` paths
 * `startReadOnlyHttpServer` is permitted to accept. The allowlist is
 * compile-time and the count is asserted in `security-invariants.test.ts`.
 * Adding a new write route requires editing this file and bumping the
 * count assertion in the same commit.
 */

import type { Database } from "bun:sqlite";
import { appendAuditEntry } from "../db/audit-chain.ts";
import { DeploymentRpcError, dispatchDeploymentRpc } from "./deployment-rpc.ts";
import { requireBearer, tokenFingerprint } from "./http-auth.ts";
import type { HttpWriteRateLimiter, RateLimitCheck } from "./http-rate-limit.ts";

export const WRITE_ROUTE_ALLOWLIST: readonly string[] = Object.freeze(["POST /v1/deployments"]);

const MAX_BODY_BYTES = 8 * 1024; // 8 KiB

export interface WriteRouteContext {
  readonly writeDb: Database;
  readonly expectedToken: string;
  readonly rateLimiter: HttpWriteRateLimiter;
  readonly nowMs: () => number;
  readonly deployEnvironments?: readonly string[];
  readonly knownServices: () => readonly string[];
}

function rateLimitHeaders(check: RateLimitCheck): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(check.limit),
    "X-RateLimit-Remaining": String(check.remaining),
    "X-RateLimit-Reset": String(Math.ceil(check.resetMs / 1000)),
  };
}

function jsonResponse(
  body: unknown,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

/**
 * Writes a rejection audit row. The `appendAuditEntry` helper carries the
 * BLAKE3 chain so brute-force probes are tamper-evident (S2 disposition).
 * Failures of the audit write itself never break the response — the row
 * is best-effort. The catch is silent rather than logging to stderr so
 * a corrupted audit chain cannot fingerprint the rejection path.
 */
function recordRejection(
  ctx: WriteRouteContext,
  args: {
    readonly tokenFingerprint: string;
    readonly resultCode: number;
    readonly reason: string;
    readonly externalId?: string;
    readonly service?: string;
  },
): void {
  try {
    appendAuditEntry(ctx.writeDb, {
      actionType: "deployment.annotation_rejected",
      hitlStatus: "not_required",
      actionJson: JSON.stringify({
        token_fingerprint: args.tokenFingerprint,
        source_ip: "127.0.0.1",
        result_code: args.resultCode,
        reason: args.reason,
        service: args.service ?? null,
        external_id: args.externalId ?? null,
      }),
      timestamp: ctx.nowMs(),
    });
  } catch {
    /* audit best-effort */
  }
}

export async function dispatchWriteRoute(req: Request, ctx: WriteRouteContext): Promise<Response> {
  const url = new URL(req.url);
  const key = `${req.method} ${url.pathname}`;
  if (!WRITE_ROUTE_ALLOWLIST.includes(key)) {
    // Path is a known write path served on a different method, OR an unknown path.
    // Distinguish 405 from 404 by checking whether ANY method in the allowlist matches the path.
    const pathMatchesAny = WRITE_ROUTE_ALLOWLIST.some((r) => r.endsWith(` ${url.pathname}`));
    if (pathMatchesAny) {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "POST" },
      });
    }
    return new Response("Not Found", { status: 404 });
  }

  const auth = requireBearer(req, { expectedToken: ctx.expectedToken });
  if (auth.surfaceDisabled === true) {
    // No audit row here: the surface isn't on, so brute-forcing it is
    // structurally impossible. Logging a row per probe would create a
    // disk-fill vector for an attacker that can't actually authenticate.
    return jsonResponse(
      {
        error: "write_surface_disabled",
        hint: "set http_api.deployment_token via 'nimbus vault set http_api.deployment_token <value>'",
      },
      503,
    );
  }
  if (!auth.ok) {
    recordRejection(ctx, {
      tokenFingerprint: auth.fingerprint,
      resultCode: 401,
      reason: "unauthorized",
    });
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const limit = ctx.rateLimiter.check(auth.fingerprint);
  if (!limit.allowed) {
    const retryAfter = Math.max(0, Math.ceil((limit.resetMs - ctx.nowMs()) / 1000));
    recordRejection(ctx, {
      tokenFingerprint: auth.fingerprint,
      resultCode: 429,
      reason: "rate_limited",
    });
    return jsonResponse({ error: "rate_limited" }, 429, {
      ...rateLimitHeaders(limit),
      "Retry-After": String(retryAfter),
    });
  }

  // Body parsing with 8 KiB cap.
  const lenHeader = req.headers.get("content-length");
  if (lenHeader !== null) {
    const n = Number.parseInt(lenHeader, 10);
    if (Number.isInteger(n) && n > MAX_BODY_BYTES) {
      recordRejection(ctx, {
        tokenFingerprint: auth.fingerprint,
        resultCode: 413,
        reason: "payload_too_large",
      });
      return jsonResponse({ error: "payload_too_large" }, 413, rateLimitHeaders(limit));
    }
  }
  let text: string;
  try {
    text = await req.text();
  } catch {
    recordRejection(ctx, {
      tokenFingerprint: auth.fingerprint,
      resultCode: 400,
      reason: "invalid_body",
    });
    return jsonResponse({ error: "invalid_body" }, 400, rateLimitHeaders(limit));
  }
  if (text.length > MAX_BODY_BYTES) {
    recordRejection(ctx, {
      tokenFingerprint: auth.fingerprint,
      resultCode: 413,
      reason: "payload_too_large",
    });
    return jsonResponse({ error: "payload_too_large" }, 413, rateLimitHeaders(limit));
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    recordRejection(ctx, {
      tokenFingerprint: auth.fingerprint,
      resultCode: 400,
      reason: "invalid_json",
    });
    return jsonResponse({ error: "invalid_json" }, 400, rateLimitHeaders(limit));
  }

  if (key === "POST /v1/deployments") {
    // Unknown-service check happens against the configured set first so the
    // 400 carries the helpful `known_services` list before validation runs.
    const svc =
      parsed !== null && typeof parsed === "object" && "service" in parsed
        ? (parsed as { service?: unknown }).service
        : undefined;
    if (typeof svc === "string" && svc.length > 0) {
      const known = ctx.knownServices();
      if (!known.includes(svc)) {
        recordRejection(ctx, {
          tokenFingerprint: auth.fingerprint,
          resultCode: 400,
          reason: "unknown_service",
          service: svc,
        });
        return jsonResponse(
          { error: "unknown_service", service: svc, known_services: known.slice(0, 25) },
          400,
          rateLimitHeaders(limit),
        );
      }
    }
    try {
      const out = await dispatchDeploymentRpc("deployment.annotate", parsed, {
        db: ctx.writeDb,
        nowMs: ctx.nowMs,
        ...(ctx.deployEnvironments === undefined
          ? {}
          : { deployEnvironments: ctx.deployEnvironments }),
      });
      if (out.kind === "hit") {
        // Success audit is written INSIDE annotateDeployment — do not
        // double-write here.
        return jsonResponse(out.value, 200, rateLimitHeaders(limit));
      }
      recordRejection(ctx, {
        tokenFingerprint: auth.fingerprint,
        resultCode: 500,
        reason: "internal_error_miss",
      });
      return jsonResponse({ error: "internal_error" }, 500, rateLimitHeaders(limit));
    } catch (e) {
      if (e instanceof DeploymentRpcError) {
        recordRejection(ctx, {
          tokenFingerprint: auth.fingerprint,
          resultCode: 400,
          reason: e.field === undefined ? "invalid_request" : `invalid_${e.field}`,
          ...(typeof svc === "string" ? { service: svc } : {}),
        });
        return jsonResponse(
          {
            error: "invalid_request",
            details:
              e.field === undefined
                ? [{ reason: e.message }]
                : [{ field: e.field, reason: e.message }],
          },
          400,
          rateLimitHeaders(limit),
        );
      }
      // Suppress internal details from the response body. The token
      // fingerprint and audit row capture forensic context.
      recordRejection(ctx, {
        tokenFingerprint: auth.fingerprint,
        resultCode: 500,
        reason: "internal_error",
      });
      return jsonResponse({ error: "internal_error" }, 500, rateLimitHeaders(limit));
    }
  }
  // Defensive — unreachable because of the allowlist check above.
  return jsonResponse({ error: "internal_error" }, 500, rateLimitHeaders(limit));
}

export { tokenFingerprint };
