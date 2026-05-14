/**
 * Phase 5 T4 PR 3b — Sliding-window rate limiter for the HTTP write surface.
 *
 * Keyed by `token_fingerprint` (sha256(token).slice(0,8)). 60 req/min per
 * fingerprint by default. Used by `dispatchWriteRoute` to set the
 * X-RateLimit-* headers on every response and enforce 429 on overflow.
 */

export interface HttpWriteRateLimitConfig {
  readonly maxRequests: number;
  readonly windowMs: number;
}

export interface RateLimitCheck {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetMs: number;
  readonly limit: number;
}

export class HttpWriteRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly now: () => number;
  constructor(
    private readonly cfg: HttpWriteRateLimitConfig,
    now?: () => number,
  ) {
    this.now = now ?? (() => Date.now());
  }

  /**
   * Returns the rate-limit decision and headers metadata for `fingerprint`.
   * Side effect: when `allowed=true`, this call IS counted (it appends to
   * the window). When `allowed=false`, nothing is appended (caller is being
   * rejected).
   */
  check(fingerprint: string): RateLimitCheck {
    const t = this.now();
    const cutoff = t - this.cfg.windowMs;
    const prev = this.hits.get(fingerprint) ?? [];
    const live = prev.filter((ts) => ts > cutoff);
    if (live.length >= this.cfg.maxRequests) {
      const earliest = live[0] ?? t;
      return {
        allowed: false,
        remaining: 0,
        resetMs: earliest + this.cfg.windowMs,
        limit: this.cfg.maxRequests,
      };
    }
    live.push(t);
    this.hits.set(fingerprint, live);
    return {
      allowed: true,
      remaining: this.cfg.maxRequests - live.length,
      resetMs: (live[0] ?? t) + this.cfg.windowMs,
      limit: this.cfg.maxRequests,
    };
  }
}
