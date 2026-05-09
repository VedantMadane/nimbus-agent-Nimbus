import { IPCClient } from "../ipc-client/index.ts";
import { readGatewayState } from "../lib/gateway-process.ts";
import { registerInteractiveCliIpcHandlers } from "../lib/interactive-ipc-handlers.ts";
import { getCliPlatformPaths } from "../paths.ts";
import { type ImpactBrief, isImpactBrief } from "../types/agents.ts";

export type ImpactCliArgs = {
  fileOrPrUrl: string;
  json: boolean;
  depth?: number;
  service?: string;
};

export function parseImpactArgs(args: string[]): ImpactCliArgs {
  const positional: string[] = [];
  let json = false;
  let depth: number | undefined;
  let service: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--json") {
      json = true;
      continue;
    }
    if (a === "--depth") {
      const n = Number(args[i + 1]);
      if (!Number.isInteger(n) || n < 1 || n > 5) {
        throw new Error("--depth must be an integer in 1..5");
      }
      depth = n;
      i += 1;
      continue;
    }
    if (a === "--service") {
      const v = args[i + 1];
      if (typeof v !== "string" || v.trim().length === 0) {
        throw new Error("--service requires a non-empty value");
      }
      service = v.trim();
      i += 1;
      continue;
    }
    if (a !== undefined && !a.startsWith("--")) positional.push(a);
  }
  const fileOrPrUrl = positional.join(" ").trim();
  if (fileOrPrUrl.length === 0) {
    throw new Error(
      'Usage: nimbus impact "<file-or-PR-url>" [--json] [--depth <N>] [--service <id>]',
    );
  }
  const out: ImpactCliArgs = { fileOrPrUrl, json };
  if (depth !== undefined) out.depth = depth;
  if (service !== undefined) out.service = service;
  return out;
}

const TIMEOUT_MS = 30_000;

export async function runImpactCli(args: string[]): Promise<void> {
  const parsed = parseImpactArgs(args);

  const paths = getCliPlatformPaths();
  const state = await readGatewayState(paths);
  if (state === undefined) {
    process.stderr.write("Gateway is not running. Start with: nimbus start\n");
    process.exit(1);
  }

  const client = new IPCClient(state.socketPath);
  await client.connect();
  registerInteractiveCliIpcHandlers(client);

  let timeout: ReturnType<typeof setTimeout> | undefined;

  const briefPromise = new Promise<{ brief: string; findings: ImpactBrief }>((resolve, reject) => {
    timeout = setTimeout(() => reject(new Error("Agent timed out after 30 s")), TIMEOUT_MS);
    client.onNotification("impact.briefReady", (params: unknown) => {
      const p = params as { sessionId?: string; brief?: string; findings?: unknown };
      if (typeof p.brief !== "string" || !isImpactBrief(p.findings)) {
        reject(new Error("Malformed impact.briefReady payload"));
        return;
      }
      resolve({ brief: p.brief, findings: p.findings });
    });
    client.onNotification("impact.briefError", (params: unknown) => {
      const p = params as { error?: string };
      reject(new Error(p.error ?? "Agent failed"));
    });
  });

  const callParams: { fileOrPrUrl: string; depth?: number; service?: string } = {
    fileOrPrUrl: parsed.fileOrPrUrl,
  };
  if (parsed.depth !== undefined) callParams.depth = parsed.depth;
  if (parsed.service !== undefined) callParams.service = parsed.service;

  try {
    await client.call<{ sessionId: string }>("agents.impact", callParams);
    const { brief, findings } = await briefPromise;
    if (parsed.json) {
      process.stdout.write(`${JSON.stringify(findings, null, 2)}\n`);
      return;
    }
    if (findings.gaps.some((g) => g.category === "empty_index")) {
      process.stderr.write("No data indexed yet — run `nimbus connector sync <service>` first.\n");
      process.exit(1);
    }
    process.stdout.write(`${brief}\n`);
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(2);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
    await client.disconnect();
  }
}
