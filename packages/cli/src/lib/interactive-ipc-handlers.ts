import { confirm, isCancel } from "@clack/prompts";

import type { IPCClient } from "../ipc-client/index.ts";

/** Stream agent tokens to stdout (used by `agent.invoke` / `workflow.run` with streaming). */
export function registerAgentChunkStdout(client: IPCClient): void {
  client.onNotification("agent.chunk", (params: unknown) => {
    const t = (params as { text?: string }).text;
    if (typeof t === "string" && t.length > 0) {
      process.stdout.write(t);
    }
  });
}

/** Prompt in the terminal for HITL consent and respond over IPC. */
export function registerConsentPromptHandler(client: IPCClient): void {
  client.onNotification("consent.request", async (params: unknown) => {
    const p = params as { requestId?: string; prompt?: string };
    if (typeof p.requestId !== "string") {
      return;
    }
    const message = typeof p.prompt === "string" ? p.prompt : "Approve action?";
    const ok = await confirm({ message });
    const approved = !isCancel(ok) && ok === true;
    await client.call("consent.respond", {
      requestId: p.requestId,
      approved,
    });
  });
}

/**
 * Auto-approve every HITL consent request and emit a stderr warning so the
 * action is observable in non-interactive runs (CI, scripts). Used by `nimbus
 * data export|import|delete --yes`. The Gateway audit log records every
 * `consent.respond` regardless of source, so the durable trail lives there.
 */
export function registerAutoApproveConsentHandler(client: IPCClient): void {
  client.onNotification("consent.request", async (params: unknown) => {
    const p = params as { requestId?: string; prompt?: string };
    if (typeof p.requestId !== "string") {
      return;
    }
    const detail = typeof p.prompt === "string" && p.prompt.length > 0 ? p.prompt : p.requestId;
    process.stderr.write(`[--yes] auto-approving HITL request: ${detail}\n`);
    await client.call("consent.respond", {
      requestId: p.requestId,
      approved: true,
    });
  });
}

/** Consent prompts + streaming chunks — typical setup for interactive CLI commands. */
export function registerInteractiveCliIpcHandlers(client: IPCClient): void {
  registerConsentPromptHandler(client);
  registerAgentChunkStdout(client);
}
