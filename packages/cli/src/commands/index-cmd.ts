import { withGatewayIpc } from "../lib/with-gateway-ipc.ts";

type ReembedSummary = {
  jobId: string;
  succeeded: number;
  skipped: number;
  durationMs: number;
  planned?: number;
  dryRun?: boolean;
};

function takeFlag(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i < 0 || i + 1 >= args.length) return undefined;
  return args[i + 1];
}

function takeBool(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function parseInteger(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function printPlannedAction(p: {
  model: string;
  itemType?: string;
  service?: string;
  limit?: number;
  batchSize?: number;
}): void {
  console.log(`Planned reembed:`);
  console.log(`  model      = ${p.model}`);
  if (p.itemType !== undefined) console.log(`  item-type  = ${p.itemType}`);
  if (p.service !== undefined) console.log(`  service    = ${p.service}`);
  if (p.limit !== undefined) console.log(`  limit      = ${String(p.limit)}`);
  if (p.batchSize !== undefined) console.log(`  batch-size = ${String(p.batchSize)}`);
  console.log("Re-run with --yes to execute, or --dry-run to compute the candidate count.");
}

async function runReembed(args: string[]): Promise<void> {
  const model = takeFlag(args, "--model");
  if (model === undefined || model === "") {
    throw new Error(
      "Usage: nimbus index reembed --model <id> [--item-type <key>] [--service <name>] [--limit N] [--batch-size N] [--dry-run] [--yes] [--json]",
    );
  }
  const itemType = takeFlag(args, "--item-type");
  const service = takeFlag(args, "--service");
  const limit = parseInteger(takeFlag(args, "--limit"));
  const batchSize = parseInteger(takeFlag(args, "--batch-size"));
  const dryRun = takeBool(args, "--dry-run");
  const yes = takeBool(args, "--yes");
  const isJson = takeBool(args, "--json");

  if (!dryRun && !yes) {
    const planned: {
      model: string;
      itemType?: string;
      service?: string;
      limit?: number;
      batchSize?: number;
    } = { model };
    if (itemType !== undefined) planned.itemType = itemType;
    if (service !== undefined) planned.service = service;
    if (limit !== undefined) planned.limit = limit;
    if (batchSize !== undefined) planned.batchSize = batchSize;
    printPlannedAction(planned);
    return;
  }

  const params: Record<string, unknown> = { model, dryRun };
  if (itemType !== undefined) params["itemType"] = itemType;
  if (service !== undefined) params["service"] = service;
  if (limit !== undefined) params["limit"] = limit;
  if (batchSize !== undefined) params["batchSize"] = batchSize;

  const summary = await withGatewayIpc(async (c) => {
    return await new Promise<ReembedSummary>((resolve, reject) => {
      let jobId: string | undefined;
      c.onNotification("index.reembedProgress", (n: unknown) => {
        const p = n as { jobId: string; done: number; total: number; skipped: number };
        if (jobId === undefined || p.jobId !== jobId) return;
        if (!isJson) {
          console.log(
            `progress: ${String(p.done)}/${String(p.total)} (skipped ${String(p.skipped)})`,
          );
        }
      });
      c.onNotification("index.reembedDone", (n: unknown) => {
        const p = n as ReembedSummary;
        if (jobId === undefined || p.jobId !== jobId) return;
        resolve(p);
      });
      c.onNotification("index.reembedError", (n: unknown) => {
        const p = n as { jobId: string; code: number; message: string };
        if (jobId === undefined || p.jobId !== jobId) return;
        reject(new Error(`ERROR: ${p.message}`));
      });
      c.call<{ jobId: string }>("index.reembed", params)
        .then((r) => {
          jobId = r.jobId;
        })
        .catch(reject);
    });
  });

  if (isJson) {
    console.log(JSON.stringify(summary));
  } else if (summary.dryRun === true) {
    console.log(`Dry run: ${String(summary.planned ?? 0)} item(s) would be reembedded.`);
  } else {
    console.log(
      `Reembedded ${String(summary.succeeded)} item(s); skipped ${String(summary.skipped)} ` +
        `(${String(summary.durationMs)} ms).`,
    );
  }
}

function printIndexHelp(): void {
  console.log(`nimbus index — local index maintenance (Gateway IPC)

Usage:
  nimbus index reembed --model <id>
                       [--item-type <key>]   ("service:type" exact, or "type" alone)
                       [--service <name>]
                       [--limit N]
                       [--batch-size N]      (default 100, clamped 1..256)
                       [--dry-run]
                       [--yes]               (required for non-dry runs)
                       [--json]

Models (v1):
  openai:text-embedding-3-small  (1536-dim; needs vault key openai.api_key)
  Xenova/all-MiniLM-L6-v2        (384-dim; local, no key required)

Exit codes:
  0  run completed (any number of skips); operator re-runs to retry skipped items
  1  fatal abort (vault key missing, unknown model, auth failure, gateway down)
`);
}

export async function runIndexCmd(args: string[]): Promise<void> {
  const sub = args[0];
  const tail = args.slice(1);
  if (sub === undefined || sub === "help" || sub === "--help" || sub === "-h") {
    printIndexHelp();
    return;
  }
  if (sub === "reembed") {
    await runReembed(tail);
    return;
  }
  throw new Error(`Unknown index subcommand: ${sub}. Try: nimbus index help`);
}
