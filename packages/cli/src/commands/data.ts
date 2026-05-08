import { IPCClient } from "../ipc-client/index.ts";
import { readGatewayState } from "../lib/gateway-process.ts";
import {
  registerAutoApproveConsentHandler,
  registerConsentPromptHandler,
} from "../lib/interactive-ipc-handlers.ts";
import { getCliPlatformPaths } from "../paths.ts";

export async function runData(args: string[]): Promise<void> {
  const [sub, ...rest] = args;
  switch (sub) {
    case "export":
      return runDataExportCli(rest);
    case "import":
      return runDataImportCli(rest);
    case "delete":
      return runDataDeleteCli(rest);
    default:
      throw new Error("Usage: nimbus data <export|import|delete> ...");
  }
}

/**
 * Open an IPC connection and register the right HITL consent handler before
 * invoking the caller. Without this, `data.export|import|delete` deadlock —
 * the Gateway emits `consent.request` and waits for `consent.respond`, while
 * the CLI waits for the IPC method's response (BUG-002).
 *
 * `yes`: when true, every consent prompt is auto-approved with a stderr
 * warning (and a Gateway-side audit entry). When false, a Clack confirm
 * prompt is shown in the terminal.
 */
async function withClient<T>(yes: boolean, fn: (c: IPCClient) => Promise<T>): Promise<T> {
  const paths = getCliPlatformPaths();
  const state = await readGatewayState(paths);
  if (state === undefined) throw new Error("Gateway is not running. Start with: nimbus start");
  const client = new IPCClient(state.socketPath);
  await client.connect();
  if (yes) {
    registerAutoApproveConsentHandler(client);
  } else {
    registerConsentPromptHandler(client);
  }
  try {
    return await fn(client);
  } finally {
    await client.disconnect();
  }
}

async function runDataExportCli(args: string[]): Promise<void> {
  const outIdx = args.indexOf("--output");
  const noIndex = args.includes("--no-index");
  const passIdx = args.indexOf("--passphrase");
  const yes = args.includes("--yes");
  if (outIdx < 0 || passIdx < 0) {
    throw new Error(
      "Usage: nimbus data export --output <path.tar.gz> --passphrase <pw> [--no-index] [--yes]",
    );
  }
  const output = args[outIdx + 1];
  const passphrase = args[passIdx + 1];
  await withClient(yes, async (client) => {
    const result = await client.call<{
      outputPath: string;
      recoverySeed: string;
      recoverySeedGenerated: boolean;
    }>("data.export", { output, passphrase, includeIndex: !noIndex });
    console.log(`[ok] wrote bundle to ${result.outputPath}`);
    if (result.recoverySeedGenerated) {
      console.log("");
      console.log("Recovery seed (store offline — shown only once):");
      console.log(`  ${result.recoverySeed}`);
    }
  });
}

async function runDataImportCli(args: string[]): Promise<void> {
  const bundlePath = args[0];
  if (bundlePath === undefined) {
    throw new Error(
      "Usage: nimbus data import <path.tar.gz> [--passphrase <pw> | --recovery-seed <mnemonic>] [--yes]",
    );
  }
  const passIdx = args.indexOf("--passphrase");
  const seedIdx = args.indexOf("--recovery-seed");
  const passphrase = passIdx >= 0 ? args[passIdx + 1] : undefined;
  const recoverySeed = seedIdx >= 0 ? args[seedIdx + 1] : undefined;
  const yes = args.includes("--yes");
  if (passphrase === undefined && recoverySeed === undefined) {
    throw new Error("Provide either --passphrase or --recovery-seed");
  }
  await withClient(yes, async (client) => {
    const result = await client.call<{ credentialsRestored: number; oauthEntriesFlagged: number }>(
      "data.import",
      { bundlePath, passphrase, recoverySeed },
    );
    // These are counts only — no credential values are logged. // lgtm[js/clear-text-logging-sensitive-data]
    console.log(`[ok] restored ${String(result.credentialsRestored)} credentials`);
    if (result.oauthEntriesFlagged > 0) {
      // lgtm[js/clear-text-logging] -- count only, no credential values
      console.log(
        `[warn] ${String(result.oauthEntriesFlagged)} OAuth entries may require re-auth on next sync`, // NOSONAR — count only, no credential values
      );
    }
  });
}

async function runDataDeleteCli(args: string[]): Promise<void> {
  const svcIdx = args.indexOf("--service");
  if (svcIdx < 0) throw new Error("Usage: nimbus data delete --service <name> [--dry-run] [--yes]");
  const service = args[svcIdx + 1];
  const dryRun = args.includes("--dry-run");
  const yes = args.includes("--yes");
  await withClient(yes, async (client) => {
    const pre = await client.call<{
      preflight: { itemsToDelete: number; vaultEntriesToDelete: number };
      deleted: boolean;
    }>("data.delete", { service, dryRun: true });
    console.log(`Service: ${service}`);
    console.log(`  Items to delete: ${String(pre.preflight.itemsToDelete)}`);
    console.log(`  Vault entries to delete: ${String(pre.preflight.vaultEntriesToDelete)}`);
    if (dryRun) return;
    if (!yes) throw new Error("Pass --yes to confirm destructive deletion (non-interactive CLI)");
    const result = await client.call<{ deleted: boolean }>("data.delete", {
      service,
      dryRun: false,
    });
    console.log(result.deleted ? "[ok] deletion complete" : "[fail] deletion did not run");
  });
}
