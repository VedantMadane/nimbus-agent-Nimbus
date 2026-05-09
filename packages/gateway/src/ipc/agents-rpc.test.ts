import { Database } from "bun:sqlite";
import { describe, expect, mock, test } from "bun:test";
import { LocalIndex } from "../index/local-index.ts";
import { AgentsRpcError, dispatchAgentsRpc } from "./agents-rpc.ts";

function makeCtx(db: Database) {
  return {
    db,
    notify: mock(() => {}),
  };
}

function freshDb(): Database {
  const db = new Database(":memory:");
  LocalIndex.ensureSchema(db); // F5 — canonical schema setup.
  return db;
}

describe("dispatchAgentsRpc", () => {
  test("returns kind:miss for unknown methods", async () => {
    const out = await dispatchAgentsRpc("agents.unknown", {}, makeCtx(freshDb()));
    expect(out.kind).toBe("miss");
  });

  test("agents.expert returns a sessionId synchronously", async () => {
    const out = await dispatchAgentsRpc(
      "agents.expert",
      { topicOrFile: "src/x.ts" },
      makeCtx(freshDb()),
    );
    expect(out.kind).toBe("hit");
    if (out.kind === "hit") {
      const v = out.value as { sessionId: string };
      expect(typeof v.sessionId).toBe("string");
      expect(v.sessionId.length).toBeGreaterThan(0);
    }
  });

  test("agents.expert validates topicOrFile is a non-empty string", async () => {
    await expect(
      dispatchAgentsRpc("agents.expert", { topicOrFile: "" }, makeCtx(freshDb())),
    ).rejects.toBeInstanceOf(AgentsRpcError);
    await expect(dispatchAgentsRpc("agents.expert", {}, makeCtx(freshDb()))).rejects.toBeInstanceOf(
      AgentsRpcError,
    );
  });

  test("agents.expert eventually emits expert.briefReady", async () => {
    const ctx = makeCtx(freshDb());
    await dispatchAgentsRpc("agents.expert", { topicOrFile: "x" }, ctx);
    // Wait for the background coroutine to settle.
    await new Promise((r) => setTimeout(r, 50));
    const calls = (ctx.notify as ReturnType<typeof mock>).mock.calls;
    const briefReady = calls.find((c) => c[0] === "expert.briefReady");
    expect(briefReady).toBeDefined();
  });
});
