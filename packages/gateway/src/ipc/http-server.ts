/**
 * Read-only local HTTP API — dedicated SQLITE_OPEN_READONLY connection.
 * Binds 127.0.0.1 only.
 */

import { Database } from "bun:sqlite";
import { resolve } from "node:path";
import { loadNimbusServiceConfigsFromConfigDir } from "../config/nimbus-toml.ts";
import { getAllConnectorHealth } from "../connectors/health.ts";
import { dbRun } from "../db/write.ts";
import { buildItemListSql, parseRelativeSinceToWindowMs } from "../index/item-list-query.ts";
import { HttpWriteRateLimiter } from "./http-rate-limit.ts";
import { dispatchWriteRoute, WRITE_ROUTE_ALLOWLIST } from "./http-write-routes.ts";
import { dispatchMetricsRpc, MetricsRpcError } from "./metrics-rpc.ts";
import { loadOpenApiJsonBytes } from "./openapi-loader.ts";
import { dispatchPreflightRpc, PreflightRpcError } from "./preflight-rpc.ts";

/**
 * Optional context for the read-only HTTP server. Threaded through to handlers
 * that need configDir-scoped helpers (e.g. `/v1/metrics/dora` resolves
 * `[metrics.dora.<service>]` sections from `<configDir>/nimbus.toml`).
 */
export type ReadOnlyHttpServerOptions = {
  readonly configDir?: string;
  readonly nowMs?: () => number;
  /**
   * Resolves the bearer token from the vault when the write surface is
   * configured. Returns `""` when the vault key is absent — the write
   * surface stays mounted but returns `503 write_surface_disabled`.
   * Omitted entirely when this Gateway has no write surface at all
   * (`POST /v1/deployments` will then return 405 Method Not Allowed).
   */
  readonly resolveDeploymentToken?: () => Promise<string>;
};

export type ReadOnlyHttpServerHandle = {
  /**
   * The actual TCP port the server bound to. When the caller passed `port = 0`,
   * this is the OS-assigned free port — useful for integration tests that want
   * to avoid the flake of picking a random port that may collide on shared CI
   * runners.
   */
  readonly port: number;
  readonly stop: () => void;
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function parsePositiveInt(raw: string | null, fallback: number, max: number): number {
  if (raw === null || raw === "") {
    return fallback;
  }
  return Math.min(max, Math.max(1, Math.floor(Number.parseInt(raw, 10))));
}

function parseItemsListTimeFilters(
  url: URL,
  nowMs: number,
): {
  sinceMs: number | undefined;
  untilMs: number | undefined;
} {
  let sinceMs: number | undefined;
  const sinceRel = url.searchParams.get("since");
  if (sinceRel !== null && sinceRel.trim() !== "") {
    const rel = parseRelativeSinceToWindowMs(sinceRel, nowMs);
    if (rel !== undefined) {
      sinceMs = rel;
    }
  }
  const sinceMsParam = url.searchParams.get("sinceMs");
  if (sinceMs === undefined && sinceMsParam !== null && sinceMsParam !== "") {
    const n = Number(sinceMsParam);
    if (Number.isFinite(n)) {
      sinceMs = Math.floor(n);
    }
  }
  let untilMs: number | undefined;
  const untilMsParam = url.searchParams.get("untilMs");
  if (untilMsParam !== null && untilMsParam !== "") {
    const n = Number(untilMsParam);
    if (Number.isFinite(n)) {
      untilMs = Math.floor(n);
    }
  }
  return { sinceMs, untilMs };
}

function handleItemsList(url: URL, db: Database): Response {
  const services = url.searchParams.getAll("service");
  const type = url.searchParams.get("type") ?? undefined;
  const types = type === undefined || type === "" ? [] : [type];
  const limit = parsePositiveInt(url.searchParams.get("limit"), 50, 1000);
  const { sinceMs, untilMs } = parseItemsListTimeFilters(url, Date.now());
  const { sql, vals } = buildItemListSql({
    services,
    types,
    limit,
    ...(sinceMs === undefined ? {} : { sinceMs }),
    ...(untilMs === undefined ? {} : { untilMs }),
  });
  const rows = db.query(sql).all(...vals) as Record<string, unknown>[];
  return json({ data: rows, meta: { total: rows.length, limit, offset: 0 } });
}

function handleItemByPath(path: string, db: Database): Response {
  const id = decodeURIComponent(path.slice("/v1/items/".length));
  if (id === "") {
    return json({ error: "missing id" }, 400);
  }
  const row = db
    .query("SELECT * FROM item WHERE id = ? OR external_id = ? LIMIT 1")
    .get(id, id) as Record<string, unknown> | null;
  return json({ data: row });
}

function handleConnectors(db: Database): Response {
  const health = getAllConnectorHealth(db);
  return json({
    data: health,
    meta: { total: health.length, limit: health.length, offset: 0 },
  });
}

function handlePeopleList(db: Database): Response {
  const rows = db
    .query("SELECT * FROM person ORDER BY display_name COLLATE NOCASE LIMIT 500")
    .all() as Record<string, unknown>[];
  return json({ data: rows, meta: { total: rows.length, limit: rows.length, offset: 0 } });
}

function handlePersonByPath(path: string, db: Database): Response {
  const id = decodeURIComponent(path.slice("/v1/people/".length));
  if (id === "") {
    return json({ error: "missing id" }, 400);
  }
  const row = db.query("SELECT * FROM person WHERE id = ?").get(id) as Record<
    string,
    unknown
  > | null;
  return json({ data: row });
}

function handleAudit(url: URL, db: Database): Response {
  const lim = parsePositiveInt(url.searchParams.get("limit"), 50, 200);
  const rows = db
    .query(
      "SELECT id, action_type, hitl_status, action_json, timestamp FROM audit_log ORDER BY id DESC LIMIT ?",
    )
    .all(lim) as Record<string, unknown>[];
  return json({ data: rows, meta: { total: rows.length, limit: lim, offset: 0 } });
}

const OPENAPI_YAML_PATH = resolve(import.meta.dir, "..", "..", "openapi", "v1.yaml");

function handleOpenApiJson(): Response {
  const bytes = loadOpenApiJsonBytes(OPENAPI_YAML_PATH);
  return new Response(bytes, {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function handleMetricsDora(
  url: URL,
  db: Database,
  opts: ReadOnlyHttpServerOptions,
): Promise<Response> {
  const service = url.searchParams.get("service");
  if (service === null || service === "") {
    return json({ error: "missing required query param: service" }, 400);
  }
  const sinceRaw = url.searchParams.get("since");
  const since = sinceRaw === null || sinceRaw === "" ? "30d" : sinceRaw;
  let out: Awaited<ReturnType<typeof dispatchMetricsRpc>>;
  try {
    out = await dispatchMetricsRpc(
      "metrics.dora",
      { service, since },
      {
        db,
        loadConfig: () =>
          opts.configDir === undefined
            ? new Map()
            : loadNimbusServiceConfigsFromConfigDir(opts.configDir),
        ...(opts.nowMs === undefined ? {} : { nowMs: opts.nowMs }),
      },
    );
  } catch (e) {
    // Only validation errors are surfaced to the client. Any other error
    // bubbles to the outer `fetch` catch which returns a generic 500 —
    // prevents internal details (paths, SQL fragments, stack frames) from
    // reaching the response body.
    if (e instanceof MetricsRpcError) {
      return json({ error: e.message }, 400);
    }
    throw e;
  }
  if (out.kind === "miss") {
    // `metrics.dora` should always hit; treat a miss as an internal error
    // and let the outer catch produce a generic 500 response.
    throw new Error("metrics.dora dispatcher returned miss");
  }
  return json(out.value);
}

async function handleDeployPreflight(
  url: URL,
  db: Database,
  opts: ReadOnlyHttpServerOptions,
): Promise<Response> {
  const service = url.searchParams.get("service");
  if (service === null || service === "") {
    return json({ error: "missing required query param: service" }, 400);
  }
  const targetRef = url.searchParams.get("target_ref");
  if (targetRef === null || targetRef === "") {
    return json({ error: "missing required query param: target_ref" }, 400);
  }
  const maxFindingsRaw = url.searchParams.get("max_findings");
  const maxFindings =
    maxFindingsRaw === null || maxFindingsRaw === ""
      ? undefined
      : Number.parseInt(maxFindingsRaw, 10);
  if (maxFindings !== undefined && !Number.isInteger(maxFindings)) {
    return json({ error: "max_findings must be an integer" }, 400);
  }
  let out: Awaited<ReturnType<typeof dispatchPreflightRpc>>;
  try {
    out = await dispatchPreflightRpc(
      "deploy.preflight",
      maxFindings === undefined
        ? { service, target_ref: targetRef }
        : { service, target_ref: targetRef, max_findings: maxFindings },
      {
        db,
        loadConfig: () =>
          opts.configDir === undefined
            ? new Map()
            : loadNimbusServiceConfigsFromConfigDir(opts.configDir),
        ...(opts.nowMs === undefined ? {} : { nowMs: opts.nowMs }),
      },
    );
  } catch (e) {
    // Same safe-error pattern as handleMetricsDora: only PreflightRpcError
    // surfaces as 400. Everything else bubbles to the outer fetch catch
    // which returns a generic 500.
    if (e instanceof PreflightRpcError) {
      return json({ error: e.message }, 400);
    }
    throw e;
  }
  if (out.kind === "miss") {
    throw new Error("deploy.preflight dispatcher returned miss");
  }
  return json(out.value);
}

async function dispatchReadOnlyGet(
  path: string,
  url: URL,
  db: Database,
  opts: ReadOnlyHttpServerOptions,
): Promise<Response> {
  if (path === "/v1/health") {
    return json({ status: "ok", gateway: "read_only_http" });
  }
  if (path === "/v1/items") {
    return handleItemsList(url, db);
  }
  if (path.startsWith("/v1/items/")) {
    return handleItemByPath(path, db);
  }
  if (path === "/v1/connectors") {
    return handleConnectors(db);
  }
  if (path === "/v1/people") {
    return handlePeopleList(db);
  }
  if (path.startsWith("/v1/people/")) {
    return handlePersonByPath(path, db);
  }
  if (path === "/v1/audit") {
    return handleAudit(url, db);
  }
  if (path === "/v1/metrics/dora") {
    return handleMetricsDora(url, db, opts);
  }
  if (path === "/v1/preflight/deploy") {
    return handleDeployPreflight(url, db, opts);
  }
  if (path === "/v1/openapi.json") {
    return handleOpenApiJson();
  }
  return new Response("Not Found", { status: 404 });
}

/**
 * @param dbPath Absolute path to `nimbus.db`
 * @param port   TCP port to bind on `127.0.0.1`. Pass `0` to let the OS pick a
 *               free port; the actual port is exposed on the returned
 *               `handle.port` (preferred for integration tests).
 * @param opts   Optional context — `configDir` enables config-aware routes
 *               (e.g. `/v1/metrics/dora`); `nowMs` is a clock injector for tests.
 */
export function startReadOnlyHttpServer(
  dbPath: string,
  port: number,
  opts: ReadOnlyHttpServerOptions = {},
): ReadOnlyHttpServerHandle {
  const db = new Database(dbPath, { readonly: true, create: false });
  dbRun(db, "PRAGMA query_only = ON");

  // Second handle is opened ONLY when the caller wires the write surface.
  // The read-only handle above remains the default — every GET still runs
  // against `SQLITE_OPEN_READONLY`. The write handle is reachable only
  // through `dispatchWriteRoute` which enforces the allowlist (invariant
  // I13), bearer auth, rate limit, and body cap before any SQL runs.
  const writeDb =
    opts.resolveDeploymentToken === undefined
      ? null
      : new Database(dbPath, { create: false, readwrite: true });
  const rateLimiter = new HttpWriteRateLimiter({ maxRequests: 60, windowMs: 60_000 });

  const server = Bun.serve({
    hostname: "127.0.0.1",
    port,
    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url);
      if (req.method === "POST") {
        if (writeDb === null || opts.resolveDeploymentToken === undefined) {
          return new Response("Method Not Allowed", {
            status: 405,
            headers: { Allow: "GET" },
          });
        }
        try {
          const expectedToken = await opts.resolveDeploymentToken();
          // Capture configDir into a stable local so the closure doesn't
          // re-narrow `opts.configDir` on every request.
          const cfgDir = opts.configDir;
          const knownServices =
            cfgDir === undefined
              ? (): readonly string[] => []
              : (): readonly string[] =>
                  Array.from(loadNimbusServiceConfigsFromConfigDir(cfgDir).keys());
          return await dispatchWriteRoute(req, {
            writeDb,
            expectedToken,
            rateLimiter,
            nowMs: opts.nowMs ?? ((): number => Date.now()),
            knownServices,
          });
        } catch {
          return json({ error: "internal_error" }, 500);
        }
      }
      if (req.method !== "GET") {
        // Hint both supported verbs when a write surface is mounted, GET
        // only otherwise. Avoids advertising POST when it would 405 anyway.
        const allow = writeDb !== null ? "GET, POST" : "GET";
        return new Response("Method Not Allowed", { status: 405, headers: { Allow: allow } });
      }
      const path = url.pathname;
      // If a GET targets a path that is only served under a non-GET verb
      // (e.g. `GET /v1/deployments`), respond 405 with the correct `Allow`
      // hint rather than letting it fall through to 404.
      if (WRITE_ROUTE_ALLOWLIST.some((r) => r.endsWith(` ${path}`))) {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: { Allow: "POST" },
        });
      }
      try {
        return await dispatchReadOnlyGet(path, url, db, opts);
      } catch {
        return json({ error: "internal_error" }, 500);
      }
    },
  });

  // Bun's server.port is typed `number | undefined` to cover unix-socket-style
  // servers; for the hostname+port style we always use here it is always set.
  const actualPort = server.port;
  if (typeof actualPort !== "number") {
    throw new Error(
      `startReadOnlyHttpServer: Bun.serve did not bind a TCP port (server.port=${String(actualPort)})`,
    );
  }
  return {
    port: actualPort,
    stop(): void {
      try {
        server.stop();
      } catch {
        /* ignore */
      }
      try {
        db.close();
      } catch {
        /* ignore */
      }
      if (writeDb !== null) {
        try {
          writeDb.close();
        } catch {
          /* ignore */
        }
      }
    },
  };
}
