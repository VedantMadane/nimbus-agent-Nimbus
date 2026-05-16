import type { Logger } from "pino";
import type { NimbusUpdaterToml } from "../config/nimbus-toml.ts";
import { derivePlatformTarget } from "./platform-target.ts";
import { loadUpdaterPublicKey } from "./public-key.ts";
import type { PlatformTarget } from "./types.ts";
import { Updater, type UpdaterEmit } from "./updater.ts";

const DEFAULT_TIMEOUT_MS = 30_000;

export interface CreateUpdaterFromConfigArgs {
  updaterCfg: NimbusUpdaterToml;
  currentVersion: string;
  emit: UpdaterEmit;
  logger: Logger;
  /** Test-only override: pin the resolved platform target. */
  _platformOverride?: PlatformTarget | undefined;
  /** Test-only: force the unsupported-platform path even on a supported host. */
  _forceUnsupported?: boolean;
}

/**
 * Build an `Updater` from the user's `[updater]` config. Returns `undefined`
 * when `enabled` is false or the host architecture is not in the supported
 * release set. The dispatcher then returns `ERR_UPDATER_NOT_CONFIGURED` for
 * `updater.*` calls — the correct signal in both cases.
 */
export function createUpdaterFromConfig(args: CreateUpdaterFromConfigArgs): Updater | undefined {
  const { updaterCfg, currentVersion, emit, logger } = args;

  if (!updaterCfg.enabled) {
    return undefined;
  }

  const target = args._forceUnsupported
    ? undefined
    : (args._platformOverride ?? derivePlatformTarget());
  if (target === undefined) {
    logger.warn(
      { platform: process.platform, arch: process.arch },
      "updater: unsupported platform/arch combo; auto-update disabled for this host",
    );
    return undefined;
  }

  return new Updater({
    currentVersion,
    manifestUrl: updaterCfg.url,
    publicKey: loadUpdaterPublicKey(),
    target,
    emit,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  });
}
