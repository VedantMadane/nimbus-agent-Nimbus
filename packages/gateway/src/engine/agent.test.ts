import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";

import { LocalIndex } from "../index/local-index.ts";
import { createNimbusEngineAgent } from "./agent.ts";

describe("createNimbusEngineAgent", () => {
  test("constructs Mastra + Agent with read-only tools", () => {
    const db = new Database(":memory:");
    LocalIndex.ensureSchema(db);
    const localIndex = new LocalIndex(db);
    const { mastra, agent, agentsByName } = createNimbusEngineAgent({
      localIndex,
      agentModel: "openai/gpt-4o-mini",
    });
    expect(mastra).toBeDefined();
    expect(agent.id).toBe("nimbus-q1");
    expect(agentsByName.devops.id).toBe("nimbus-devops");
    expect(agentsByName.research.id).toBe("nimbus-research");
    // Mastra does not expose tool ids on the Agent instance; tools are registered in createNimbusEngineAgent.
    localIndex.close();
  });

  test("BUG-007: every agent's instructions tell the LLM to call the tool, not ask for in-chat confirmation", async () => {
    const db = new Database(":memory:");
    LocalIndex.ensureSchema(db);
    const localIndex = new LocalIndex(db);
    const { agentsByName } = createNimbusEngineAgent({
      localIndex,
      agentModel: "openai/gpt-4o-mini",
    });

    // Mastra exposes `getInstructions()` which returns the rendered system
    // prompt. The rule must hold for every agent the engine routes to.
    for (const a of [agentsByName.nimbus, agentsByName.devops, agentsByName.research]) {
      const rendered = await a.getInstructions();
      const text = typeof rendered === "string" ? rendered : JSON.stringify(rendered);
      // The agent must be instructed that the consent gate is structural —
      // i.e. invoke the tool and let the executor surface the HITL dialog.
      expect(text).toContain("consent gate");
      expect(text).toContain("call the tool");
      // And it must NOT instruct the agent to ask for chat-style consent.
      // CLAUDE.md non-negotiable #2 says HITL is structural, not in the
      // prompt; if either of these phrases shows up, BUG-007 is back.
      expect(text).not.toMatch(/ask (?:the user )?for confirmation/i);
      expect(text).not.toMatch(/are you sure\?/i);
    }
    localIndex.close();
  });
});
