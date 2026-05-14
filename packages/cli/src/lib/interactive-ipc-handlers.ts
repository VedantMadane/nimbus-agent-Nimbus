import { readFileSync } from "node:fs";

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

interface ScriptDecision {
  readonly approved: boolean;
  readonly note?: string;
}

/**
 * Read consent decisions from a JSONL file and dispatch consent.respond
 * in arrival order of consent.request notifications. The CLI's normal
 * IPC client is the source of the consent.respond call, satisfying the
 * Gateway's clientId scoping (packages/gateway/src/ipc/consent.ts:85).
 *
 * Used by the Phase 3 cast-tripwire driver. The driver pre-writes the
 * JSONL file with decisions in YAML script order before spawning the CLI.
 *
 * All lines are read and parsed eagerly at registration time so malformed
 * JSONL is detected before any consent.request arrives.
 */
export function registerScriptConsentHandler(client: IPCClient, source: string): void {
  let decisions: ReadonlyArray<ScriptDecision>;
  try {
    const text = readFileSync(source, "utf8");
    decisions = text
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line, lineIdx) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(line);
        } catch (err) {
          throw new Error(
            `--script-consent-source: malformed JSONL on line ${lineIdx + 1}: ${(err as Error).message}`,
          );
        }
        if (typeof parsed !== "object" || parsed === null) {
          throw new Error(
            `--script-consent-source: malformed JSONL on line ${lineIdx + 1}: not an object`,
          );
        }
        const o = parsed as Record<string, unknown>;
        if (typeof o["approved"] !== "boolean") {
          throw new Error(
            `--script-consent-source: malformed JSONL on line ${lineIdx + 1}: missing or non-boolean "approved"`,
          );
        }
        return {
          approved: o["approved"],
          ...(typeof o["note"] === "string" ? { note: o["note"] as string } : {}),
        };
      });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`--script-consent-source: script consent source not found: ${source}`);
    }
    throw err;
  }
  let cursor = 0;
  client.onNotification("consent.request", async (params: unknown) => {
    const p = params as { requestId?: string; prompt?: string };
    if (typeof p.requestId !== "string") {
      return;
    }
    if (cursor >= decisions.length) {
      throw new Error(
        `--script-consent-source: no scripted decision for consent request "${p.requestId}" (exhausted at line ${cursor})`,
      );
    }
    const decision = decisions[cursor];
    if (decision === undefined) {
      throw new Error(
        `--script-consent-source: internal error reading decision at cursor ${cursor}`,
      );
    }
    cursor += 1;
    const promptText = typeof p.prompt === "string" ? p.prompt : "(no prompt)";
    const decisionWord = decision.approved ? "approve" : "reject";
    const noteSuffix = decision.note !== undefined ? ` — ${decision.note}` : "";
    process.stdout.write(
      `[consent.request] ${promptText}\n[scripted: ${decisionWord}]${noteSuffix}\n`,
    );
    await client.call("consent.respond", {
      requestId: p.requestId,
      approved: decision.approved,
    });
  });
}

/** Consent prompts + streaming chunks — typical setup for interactive CLI commands. */
export function registerInteractiveCliIpcHandlers(client: IPCClient): void {
  registerConsentPromptHandler(client);
  registerAgentChunkStdout(client);
}
