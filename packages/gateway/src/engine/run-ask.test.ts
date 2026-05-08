import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Agent } from "@mastra/core/agent";

import { LocalIndex } from "../index/local-index.ts";
import type { ConsentCoordinator } from "../ipc/consent.ts";
import type { SessionChunk, SessionMemoryStore } from "../memory/session-memory-store.ts";
import type { PlatformPaths } from "../platform/paths.ts";
import { agentRequestContext } from "./agent-request-context.ts";
import { runAsk } from "./run-ask.ts";
import type { ConnectorDispatcher } from "./types.ts";

const stubBase = join(tmpdir(), "nimbus-run-ask-test");
const stubPaths: PlatformPaths = {
  configDir: join(stubBase, "cfg"),
  dataDir: join(stubBase, "data"),
  logDir: join(stubBase, "logs"),
  socketPath: join(stubBase, "gateway.sock"),
  extensionsDir: join(stubBase, "ext"),
  tempDir: join(stubBase, "tmp"),
};

const stubConsent: ConsentCoordinator = {
  async requestConsent(): Promise<boolean> {
    return false;
  },
  rejectAllPending(): void {},
  pendingCount(): number {
    return 0;
  },
};

const stubDispatcher: ConnectorDispatcher = {
  async dispatch(): Promise<unknown> {
    return null;
  },
};

/**
 * Minimal Mastra Agent stub for the conversational path. Returns a fixed
 * reply via both `generate` (non-stream) and `stream` (yields nothing then
 * resolves the text promise). The test only cares that runAsk completes
 * the conversational turn and then writes turns to the session store.
 */
function fakeConversationalAgent(reply = "agent reply"): Agent {
  // Hand-rolled empty AsyncIterable instead of an empty `async function*` —
  // biome's `useYield` rule (correctly) flags a generator that yields nothing,
  // and we want this stub to be a real iterable, not need a suppress-comment.
  const emptyAsyncIterable: AsyncIterable<unknown> = {
    [Symbol.asyncIterator]() {
      return {
        next(): Promise<IteratorResult<unknown>> {
          return Promise.resolve({ done: true, value: undefined });
        },
      };
    },
  };
  return {
    generate: async () => ({ text: reply }),
    stream: async () => ({
      fullStream: emptyAsyncIterable,
      text: Promise.resolve(reply),
    }),
  } as unknown as Agent;
}

/**
 * Spy `SessionMemoryStore` that records every `append` call. We don't
 * exercise embedding/recall here — only that runAsk writes both turns
 * when a sessionId is present.
 */
function spySessionMemoryStore(): {
  store: SessionMemoryStore;
  appended: SessionChunk[];
} {
  const appended: SessionChunk[] = [];
  const store = {
    append: async (chunk: SessionChunk) => {
      appended.push(chunk);
    },
  } as unknown as SessionMemoryStore;
  return { store, appended };
}

describe("runAsk", () => {
  test("returns onboarding guidance when index has zero items (no LLM path)", async () => {
    const db = new Database(":memory:");
    LocalIndex.ensureSchema(db);
    const localIndex = new LocalIndex(db);
    const out = await runAsk({
      input: "What did I work on yesterday?",
      stream: false,
      clientId: "test-client",
      paths: stubPaths,
      consentCoordinator: stubConsent,
      localIndex,
      dispatcher: stubDispatcher,
      sendChunk: () => {},
    });
    expect(out.reply).toContain("No data indexed yet");
    expect(out.reply).toContain("nimbus connector auth");
    localIndex.close();
  });

  test("BUG-005: appends user input + assistant reply to SessionMemoryStore when sessionId is in the request context", async () => {
    const db = new Database(":memory:");
    LocalIndex.ensureSchema(db);
    // Seed a row so the empty-index guidance branch doesn't short-circuit
    // before the conversational agent runs.
    db.run(
      "INSERT INTO item (id, service, type, external_id, title, modified_at, synced_at) VALUES ('x:1', 'x', 'note', '1', 't', 1, 1)",
    );
    const localIndex = new LocalIndex(db);
    const { store, appended } = spySessionMemoryStore();

    await agentRequestContext.run({ sessionId: "sess-runask" }, async () => {
      await runAsk({
        input: "draft a gmail to me",
        stream: false,
        clientId: "test-client",
        paths: stubPaths,
        consentCoordinator: stubConsent,
        localIndex,
        dispatcher: stubDispatcher,
        sendChunk: () => {},
        conversationalAgent: fakeConversationalAgent("ok, draft created"),
        sessionMemoryStore: store,
      });
    });

    expect(appended.length).toBe(2);
    expect(appended[0]).toMatchObject({
      sessionId: "sess-runask",
      role: "user",
      text: "draft a gmail to me",
    });
    expect(appended[1]).toMatchObject({
      sessionId: "sess-runask",
      role: "assistant",
      text: "ok, draft created",
    });

    localIndex.close();
  });

  test("BUG-005: skips append when sessionId is absent (preserves the no-memory path)", async () => {
    const db = new Database(":memory:");
    LocalIndex.ensureSchema(db);
    db.run(
      "INSERT INTO item (id, service, type, external_id, title, modified_at, synced_at) VALUES ('x:1', 'x', 'note', '1', 't', 1, 1)",
    );
    const localIndex = new LocalIndex(db);
    const { store, appended } = spySessionMemoryStore();

    // Note: NOT wrapped in agentRequestContext.run() — sessionId is undefined.
    await runAsk({
      input: "draft a gmail to me",
      stream: false,
      clientId: "test-client",
      paths: stubPaths,
      consentCoordinator: stubConsent,
      localIndex,
      dispatcher: stubDispatcher,
      sendChunk: () => {},
      conversationalAgent: fakeConversationalAgent("ok, draft created"),
      sessionMemoryStore: store,
    });

    expect(appended.length).toBe(0);
    localIndex.close();
  });
});
