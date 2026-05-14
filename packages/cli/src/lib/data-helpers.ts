/**
 * Pure helper functions for the `nimbus data` subcommands, extracted here so
 * they can be unit-tested without pulling in the IPCClient / @nimbus-dev/client
 * dependency chain.
 */

/**
 * Parse --script-consent-source <path> from args, with env-var fallback.
 * Returns the resolved path or undefined.
 *
 * Throws when the flag is supplied without a following path value (or when the
 * next token begins with `--`, indicating the path was omitted and the parser
 * consumed the next flag). Exported for unit testing.
 */
export function parseScriptConsentSource(args: string[]): string | undefined {
  const idx = args.indexOf("--script-consent-source");
  if (idx >= 0) {
    const path = args[idx + 1];
    if (path === undefined || path.startsWith("--")) {
      throw new Error("--script-consent-source requires a file path argument");
    }
    return path;
  }
  const env = process.env["NIMBUS_SCRIPT_CONSENT_SOURCE"];
  return env !== undefined && env.length > 0 ? env : undefined;
}

/**
 * Confirms `data delete` has explicit non-interactive consent before running
 * the destructive call. Throws if neither --yes nor --script-consent-source
 * is provided. Exported for test coverage.
 */
export function assertDestructiveDeleteAllowed(opts: {
  yes: boolean;
  scriptConsentSource: string | undefined;
}): void {
  if (!opts.yes && opts.scriptConsentSource === undefined) {
    throw new Error(
      "Pass --yes (or --script-consent-source for cast-driver) to confirm destructive deletion (non-interactive CLI)",
    );
  }
}
