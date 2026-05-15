import type { PlatformTarget } from "./types.ts";

/**
 * Map `process.platform` + `process.arch` to a `PlatformTarget` literal
 * (or `undefined` when the combination is not in the supported release set).
 *
 * Unsupported combos (`linux-aarch64`, `windows-aarch64`, `freebsd-*`) return
 * `undefined` so the factory can skip wiring without crashing. The dispatcher
 * then returns `ERR_UPDATER_NOT_CONFIGURED` for `updater.*` calls — the
 * correct signal on an unsupported architecture.
 *
 * Adding a new supported combo requires (a) extending the `PlatformTarget`
 * union in `types.ts`, (b) adding the corresponding asset entry to the
 * manifest schema, and (c) building the binary in the release pipeline.
 */
export function derivePlatformTarget(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): PlatformTarget | undefined {
  if (platform === "darwin" && arch === "x64") return "darwin-x86_64";
  if (platform === "darwin" && arch === "arm64") return "darwin-aarch64";
  if (platform === "linux" && arch === "x64") return "linux-x86_64";
  if (platform === "win32" && arch === "x64") return "windows-x86_64";
  return undefined;
}
