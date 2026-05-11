import { readFileSync } from "node:fs";
import yaml from "js-yaml";

/**
 * Loads an OpenAPI YAML file from an absolute path and returns the
 * JSON-encoded bytes. The result is cached per absolute path; subsequent
 * calls with the same path return the same `Uint8Array` (`===` identity
 * preserved) so HTTP handlers can serve from memory without per-request
 * parse cost.
 *
 * Throws with a wrapped error if the file is missing, unreadable, or
 * contains malformed YAML. The Gateway should fail to start on that error
 * rather than serve a stale or empty schema.
 *
 * The single production caller is `packages/gateway/src/ipc/http-server.ts`,
 * which passes the absolute path to `packages/gateway/openapi/v1.yaml`.
 */
const cache = new Map<string, Uint8Array>();

export function loadOpenApiJsonBytes(absolutePath: string): Uint8Array {
  const cached = cache.get(absolutePath);
  if (cached !== undefined) {
    return cached;
  }
  let raw: string;
  try {
    raw = readFileSync(absolutePath, "utf8");
  } catch (e) {
    const cause = e instanceof Error ? e.message : String(e);
    throw new Error(`failed to read openapi schema at ${absolutePath}: ${cause}`);
  }
  let parsed: unknown;
  try {
    parsed = yaml.load(raw, { filename: absolutePath });
  } catch (e) {
    const cause = e instanceof Error ? e.message : String(e);
    throw new Error(`failed to parse openapi schema at ${absolutePath}: ${cause}`);
  }
  const bytes = new TextEncoder().encode(JSON.stringify(parsed));
  cache.set(absolutePath, bytes);
  return bytes;
}
