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

/**
 * Consent-handler selection options. Mirrors the fields from `WithClientOptions`
 * in `commands/data.ts` that are relevant to consent dispatch.
 */
export interface SelectConsentHandlerOptions {
  /** Auto-approve all consent prompts (--yes). Ignored when scriptConsentSource is set. */
  readonly yes: boolean;
  /**
   * Path to a JSONL file of scripted consent decisions. When set, overrides `yes`.
   * A stderr warning is emitted when both are supplied.
   */
  readonly scriptConsentSource?: string;
}

/**
 * Apply the consent-handler priority: script > yes > interactive prompt.
 * Extracted from `withClient` in `commands/data.ts` so the dispatch logic and
 * the mutual-exclusivity warning are unit-testable without a live gateway.
 *
 * Priority:
 *   1. `scriptConsentSource` set → `registerScriptConsentHandler` (emits stderr
 *      warning if `yes` is also true, since script takes precedence).
 *   2. `yes` true → `registerAutoApproveConsentHandler`.
 *   3. Neither → `registerConsentPromptHandler`.
 */
export function selectConsentHandler(client: IPCClient, opts: SelectConsentHandlerOptions): void {
  if (opts.scriptConsentSource !== undefined && opts.scriptConsentSource.length > 0) {
    if (opts.yes) {
      process.stderr.write(
        "[warn] --script-consent-source overrides --yes; consent decisions come from the JSONL file.\n",
      );
    }
    registerScriptConsentHandler(client, opts.scriptConsentSource);
    return;
  }
  if (opts.yes) {
    registerAutoApproveConsentHandler(client);
    return;
  }
  registerConsentPromptHandler(client);
}

/**
 * Consent prompts + streaming chunks — typical setup for interactive CLI commands.
 *
 * Used by: `ask`, `expert`, `impact`, `catchup`, `run-workflow`, `repl`.
 * All six commands call this helper, so the env-var dispatch below applies to
 * all of them.
 *
 * Consent dispatch priority:
 *   1. `NIMBUS_SCRIPT_CONSENT_SOURCE` env var (Phase 3 cast-tripwire harness) →
 *      `registerScriptConsentHandler` reads decisions from the JSONL file.
 *   2. Otherwise → `registerConsentPromptHandler` (interactive @clack/prompts).
 *
 * `--yes` is handled in `data.ts` only (the three subcommands that own that flag)
 * because agent commands (`ask`, `expert`, `impact`, `catchup`, `run-workflow`,
 * `repl`) intentionally don't auto-approve consent.
 */
export function registerInteractiveCliIpcHandlers(client: IPCClient): void {
  const scriptSource = process.env["NIMBUS_SCRIPT_CONSENT_SOURCE"];
  if (scriptSource !== undefined && scriptSource.length > 0) {
    registerScriptConsentHandler(client, scriptSource);
  } else {
    registerConsentPromptHandler(client);
  }
  registerAgentChunkStdout(client);
}
