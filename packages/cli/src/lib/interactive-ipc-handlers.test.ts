/**
 * BUG-002 regression coverage for the auto-approve consent handler.
 *
 * The smoke run found that `nimbus data export` deadlocked: the gateway
 * emits `consent.request` for HITL-gated actions, but `withClient` in
 * `commands/data.ts` never registered a handler for it, so neither side
 * progressed. The fix is to register an auto-approving handler when the
 * caller passes `--yes`, and an interactive prompt handler otherwise.
 *
 * This test pins the auto-approve helper in isolation: when the fake
 * IPCClient surfaces a `consent.request`, the helper must respond with
 * `consent.respond { approved: true }` and emit a stderr warning.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { IPCClient } from "../ipc-client/index.ts";
import {
  registerAutoApproveConsentHandler,
  registerInteractiveCliIpcHandlers,
} from "./interactive-ipc-handlers.ts";

interface RecordedCall {
  method: string;
  params: unknown;
}

function makeFakeClient(): {
  client: IPCClient;
  fireConsent: (params: unknown) => Promise<void>;
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];
  let consentHandler: ((params: unknown) => void | Promise<void>) | null = null;
  const fake = {
    onNotification: (method: string, handler: (params: unknown) => void | Promise<void>) => {
      if (method === "consent.request") consentHandler = handler;
    },
    call: async (method: string, params: unknown): Promise<unknown> => {
      calls.push({ method, params });
      return undefined;
    },
  };
  const fireConsent = async (params: unknown): Promise<void> => {
    if (consentHandler === null) throw new Error("no consent handler registered");
    await consentHandler(params);
  };
  return { client: fake as unknown as IPCClient, fireConsent, calls };
}

describe("registerAutoApproveConsentHandler (BUG-002)", () => {
  test("responds approved=true when gateway emits consent.request", async () => {
    const { client, fireConsent, calls } = makeFakeClient();
    registerAutoApproveConsentHandler(client);
    await fireConsent({ requestId: "req-123", prompt: "Approve data.export?" });
    expect(calls).toEqual([
      { method: "consent.respond", params: { requestId: "req-123", approved: true } },
    ]);
  });

  test("ignores malformed consent.request payloads (no requestId)", async () => {
    const { client, fireConsent, calls } = makeFakeClient();
    registerAutoApproveConsentHandler(client);
    await fireConsent({ prompt: "missing requestId" });
    expect(calls).toEqual([]);
  });

  test("emits stderr warning so non-interactive auto-approve is observable", async () => {
    const { client, fireConsent } = makeFakeClient();
    registerAutoApproveConsentHandler(client);

    let warning = "";
    const originalWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: unknown): boolean => {
      warning += typeof chunk === "string" ? chunk : String(chunk);
      return true;
    }) as typeof process.stderr.write;
    try {
      await fireConsent({ requestId: "req-xyz", prompt: "Approve action?" });
    } finally {
      process.stderr.write = originalWrite;
    }
    expect(warning).toContain("--yes");
    expect(warning).toContain("auto-approving");
  });
});

describe("registerInteractiveCliIpcHandlers env-var dispatch", () => {
  let tmpDir: string;
  const ENV_KEY = "NIMBUS_SCRIPT_CONSENT_SOURCE";
  let prevEnv: string | undefined;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "iicih-env-"));
    prevEnv = process.env[ENV_KEY];
  });

  afterEach(() => {
    if (prevEnv === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = prevEnv;
  });

  test("with NIMBUS_SCRIPT_CONSENT_SOURCE set, consumes the JSONL file on consent.request", async () => {
    const source = join(tmpDir, "decisions.jsonl");
    writeFileSync(source, '{"approved":false}\n', "utf8");
    process.env[ENV_KEY] = source;

    const { client, fireConsent, calls } = makeFakeClient();
    // Suppress stdout writes from the script handler so the test runner stays clean.
    const originalStdout = process.stdout.write.bind(process.stdout);
    process.stdout.write = (() => true) as typeof process.stdout.write;
    try {
      registerInteractiveCliIpcHandlers(client);
      await fireConsent({ requestId: "r-1", prompt: "post Slack message" });
    } finally {
      process.stdout.write = originalStdout;
    }
    expect(calls).toEqual([
      { method: "consent.respond", params: { requestId: "r-1", approved: false } },
    ]);
  });

  test("with empty NIMBUS_SCRIPT_CONSENT_SOURCE, treats env as unset (falls back to clack prompt)", () => {
    process.env[ENV_KEY] = "";

    const { client } = makeFakeClient();
    // Just verify no throw — falls through to registerConsentPromptHandler which
    // registers a handler that would call clack's confirm() on fire (we don't
    // fire it here because clack would block). Behaviour-level coverage of the
    // prompt path is intentionally out of scope; this test only pins the
    // env-empty-string fallback contract.
    expect(() => registerInteractiveCliIpcHandlers(client)).not.toThrow();
  });
});
