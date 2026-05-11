import { readFileSync } from "node:fs";
import yaml from "js-yaml";

/**
 * Loads `packages/gateway/openapi/v1.yaml` once per absolute path and returns
 * the JSON-encoded bytes. Subsequent calls with the same path return the
 * cached bytes (`===` identity preserved).
 *
 * Throws with a wrapped error if the file is missing, unreadable, or contains
 * malformed YAML. The Gateway should fail to start on that error rather than
 * serve a stale or empty schema.
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

/** Test-only — clears the in-memory cache. Not exported in the runtime path. */
export function _clearOpenApiCache(): void {
  cache.clear();
}
