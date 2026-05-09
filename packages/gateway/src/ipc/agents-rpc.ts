import type { Database } from "bun:sqlite";
import type { SynthesizerLlm } from "../agents/_lib/synthesize.ts";
import { emitExpertBrief } from "../agents/expert.ts";

export class AgentsRpcError extends Error {
  readonly rpcCode: number;
  constructor(rpcCode: number, message: string) {
    super(message);
    this.name = "AgentsRpcError";
    this.rpcCode = rpcCode;
  }
}

export type AgentsRpcContext = {
  db: Database;
  llm?: SynthesizerLlm;
  notify: (method: string, params: unknown) => void;
};

const MIN_TOPIC_LEN = 1;
const MAX_TOPIC_LEN = 1024;
const MAX_LIMIT = 25;

function requireExpertParams(params: unknown): { topicOrFile: string; limit?: number } {
  if (params === null || typeof params !== "object") {
    throw new AgentsRpcError(-32602, "agents.expert requires { topicOrFile: string }");
  }
  const p = params as { topicOrFile?: unknown; limit?: unknown };
  if (typeof p.topicOrFile !== "string") {
    throw new AgentsRpcError(-32602, "topicOrFile must be a string");
  }
  const trimmed = p.topicOrFile.trim();
  if (trimmed.length < MIN_TOPIC_LEN || trimmed.length > MAX_TOPIC_LEN) {
    throw new AgentsRpcError(
      -32602,
      `topicOrFile must be ${MIN_TOPIC_LEN}..${MAX_TOPIC_LEN} chars after trim`,
    );
  }
  const out: { topicOrFile: string; limit?: number } = { topicOrFile: trimmed };
  if (p.limit !== undefined) {
    if (
      typeof p.limit !== "number" ||
      !Number.isInteger(p.limit) ||
      p.limit < 1 ||
      p.limit > MAX_LIMIT
    ) {
      throw new AgentsRpcError(-32602, `limit must be an integer in 1..${MAX_LIMIT}`);
    }
    out.limit = p.limit;
  }
  return out;
}

function newSessionId(): string {
  return `expert_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

export async function dispatchAgentsRpc(
  method: string,
  params: unknown,
  ctx: AgentsRpcContext,
): Promise<{ kind: "miss" } | { kind: "hit"; value: unknown }> {
  if (method === "agents.expert") {
    const input = requireExpertParams(params);
    const sessionId = newSessionId();
    const expertCtx =
      ctx.llm === undefined
        ? { db: ctx.db, notify: ctx.notify, sessionId }
        : { db: ctx.db, llm: ctx.llm, notify: ctx.notify, sessionId };
    return { kind: "hit", value: await emitExpertBrief(input, expertCtx) };
  }
  return { kind: "miss" };
}
