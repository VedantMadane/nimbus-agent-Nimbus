import { resolve } from "node:path";
import { confirm, isCancel } from "@clack/prompts";

import { IPCClient } from "../ipc-client/index.ts";
import { readGatewayState } from "../lib/gateway-process.ts";
import { getCliPlatformPaths } from "../paths.ts";

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function takeFlagValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i < 0 || i + 1 >= args.length) return undefined;
  return args[i + 1];
}

function stripFlags(args: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--yes" || a === "-y" || a === "--json") continue;
    if (a === "--filter") {
      // skip flag + value
      i += 1;
      continue;
    }
    out.push(a as string);
  }
  return out;
}

type ExtensionListEntry = {
  id: string;
  version: string;
  enabled?: number;
  needs_reinstall?: boolean;
  disabled_reason?: string;
};

async function runExtensionList(client: IPCClient, args: string[]): Promise<void> {
  const filter = takeFlagValue(args, "--filter");
  const json = hasFlag(args, "--json");
  const params: Record<string, unknown> = {};
  if (filter !== undefined) params["filter"] = filter;
  const out = await client.call<{ extensions: ExtensionListEntry[] }>("extension.list", params);
  if (json) {
    console.log(JSON.stringify(out, undefined, 2));
    return;
  }
  const rows = out.extensions;
  if (rows.length === 0) {
    console.log("(no extensions installed)");
    return;
  }
  for (const r of rows) {
    const suffix = r.needs_reinstall === true ? " [needs-reinstall]" : "";
    const enabled = r.enabled === 0 ? " (disabled)" : "";
    console.log(`${r.id}@${r.version}${enabled}${suffix}`);
  }
}

async function runExtensionInfo(client: IPCClient, rest: string[], args: string[]): Promise<void> {
  const id = rest[0]?.trim() ?? "";
  if (id === "") {
    throw new Error("Usage: nimbus extension info <id> [--json]");
  }
  const out = await client.call<{
    extension: ExtensionListEntry;
    message?: string;
  }>("extension.info", { id });
  if (hasFlag(args, "--json")) {
    console.log(JSON.stringify(out, undefined, 2));
    return;
  }
  const e = out.extension;
  console.log(`Extension: ${e.id}`);
  console.log(`Version:   ${e.version}`);
  console.log(`Enabled:   ${e.enabled === 1 ? "yes" : "no"}`);
  if (e.needs_reinstall === true && out.message !== undefined) {
    console.log("");
    console.log(out.message);
  }
}

async function runExtensionInstall(
  client: IPCClient,
  args: string[],
  rest: string[],
): Promise<void> {
  const sourceRaw = rest[0]?.trim() ?? "";
  if (sourceRaw === "") {
    throw new Error("Usage: nimbus extension install <path> [--yes]");
  }
  const accept = hasFlag(args, "--yes") || hasFlag(args, "-y");
  if (!accept) {
    if (process.stdout.isTTY !== true) {
      throw new Error(
        "Refusing to install without confirmation in non-TTY mode. Pass --yes to proceed.",
      );
    }
    const ok = await confirm({
      message:
        "Install copies the extension into your Nimbus extensions directory. Only proceed if you trust this code.",
    });
    if (isCancel(ok) || ok !== true) {
      console.log("Cancelled.");
      return;
    }
  }
  const sourcePath = resolve(process.cwd(), sourceRaw);
  const out = await client.call<{
    id: string;
    version: string;
    installPath: string;
  }>("extension.install", { sourcePath });
  console.log(JSON.stringify(out, undefined, 2));
}

async function runExtensionEnable(client: IPCClient, rest: string[]): Promise<void> {
  const id = rest[0]?.trim() ?? "";
  if (id === "") {
    throw new Error("Usage: nimbus extension enable <id>");
  }
  const out = await client.call<{ ok: boolean }>("extension.enable", { id });
  console.log(JSON.stringify(out, undefined, 2));
}

async function runExtensionDisable(client: IPCClient, rest: string[]): Promise<void> {
  const id = rest[0]?.trim() ?? "";
  if (id === "") {
    throw new Error("Usage: nimbus extension disable <id>");
  }
  const out = await client.call<{ ok: boolean }>("extension.disable", { id });
  console.log(JSON.stringify(out, undefined, 2));
}

async function runExtensionRemove(
  client: IPCClient,
  args: string[],
  rest: string[],
): Promise<void> {
  const id = rest[0]?.trim() ?? "";
  if (id === "") {
    throw new Error("Usage: nimbus extension remove <id> [--yes]");
  }
  const accept = hasFlag(args, "--yes") || hasFlag(args, "-y");
  if (!accept) {
    if (process.stdout.isTTY !== true) {
      throw new Error(
        "Refusing to remove without confirmation in non-TTY mode. Pass --yes to proceed.",
      );
    }
    const ok = await confirm({
      message: `Remove extension "${id}" from the registry and delete its files?`,
    });
    if (isCancel(ok) || ok !== true) {
      console.log("Cancelled.");
      return;
    }
  }
  const out = await client.call<{ ok: boolean }>("extension.remove", { id });
  console.log(JSON.stringify(out, undefined, 2));
}

export async function runExtension(args: string[]): Promise<void> {
  const sub = args[0]?.trim() ?? "";
  const rest = stripFlags(args.slice(1));
  const paths = getCliPlatformPaths();
  const state = await readGatewayState(paths);
  if (state === undefined) {
    throw new Error("Gateway is not running. Start with: nimbus start");
  }

  const client = new IPCClient(state.socketPath);
  await client.connect();
  try {
    if (sub === "list" || sub === "") {
      await runExtensionList(client, args);
      return;
    }

    if (sub === "info") {
      await runExtensionInfo(client, rest, args);
      return;
    }

    if (sub === "install") {
      await runExtensionInstall(client, args, rest);
      return;
    }

    if (sub === "enable") {
      await runExtensionEnable(client, rest);
      return;
    }

    if (sub === "disable") {
      await runExtensionDisable(client, rest);
      return;
    }

    if (sub === "remove") {
      await runExtensionRemove(client, args, rest);
      return;
    }

    throw new Error(
      "Usage: nimbus extension list [--filter needs-reinstall] [--json] | info <id> [--json] | install <path> [--yes] | enable <id> | disable <id> | remove <id> [--yes]",
    );
  } finally {
    await client.disconnect();
  }
}
