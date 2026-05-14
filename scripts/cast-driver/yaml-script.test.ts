import { describe, expect, test } from "bun:test";
import { parseCastScript } from "./yaml-script.ts";

describe("parseCastScript", () => {
  test("parses a minimal valid script", () => {
    const yaml = `
name: hello
description: smoke
events: hello/events.json
steps:
  - input: nimbus expert "ratelimits"
    expect: "Investigation complete"
`;
    const compiled = parseCastScript(yaml);
    expect(compiled.script.name).toBe("hello");
    expect(compiled.script.events).toBe("hello/events.json");
    expect(compiled.inputGroups).toHaveLength(1);
    expect(compiled.inputGroups[0]?.input).toEqual({
      type: "input",
      input: 'nimbus expert "ratelimits"',
      expect: "Investigation complete",
    });
    expect(compiled.inputGroups[0]?.consents).toEqual([]);
  });

  test("groups consent steps under their preceding input", () => {
    const yaml = `
name: incident-response
description: test
events: incident-response/events.json
steps:
  - input: nimbus expert "p95"
    expect: "Investigation complete"
  - input: nimbus ask "post to #ops"
    expect: "requires consent"
  - consent: approve
    expect: "Posted to #ops"
  - consent: reject
`;
    const compiled = parseCastScript(yaml);
    expect(compiled.inputGroups).toHaveLength(2);
    expect(compiled.inputGroups[0]?.consents).toEqual([]);
    expect(compiled.inputGroups[1]?.consents).toEqual([
      { type: "consent", consent: "approve", expect: "Posted to #ops" },
      { type: "consent", consent: "reject" },
    ]);
  });

  test("rejects YAML where a consent step has no preceding input", () => {
    const yaml = `
name: bad
description: test
events: bad/events.json
steps:
  - consent: approve
`;
    expect(() => parseCastScript(yaml)).toThrow(/consent step before any input/i);
  });

  test("rejects YAML missing required fields", () => {
    expect(() => parseCastScript("name: x\n")).toThrow(/missing.*description/i);
    expect(() => parseCastScript("name: x\ndescription: y\n")).toThrow(/missing.*events/i);
    expect(() => parseCastScript("name: x\ndescription: y\nevents: z\n")).toThrow(
      /missing.*steps/i,
    );
  });

  test("rejects consent step with invalid value", () => {
    const yaml = `
name: x
description: y
events: z
steps:
  - input: nimbus query
  - consent: maybe
`;
    expect(() => parseCastScript(yaml)).toThrow(/consent must be "approve" or "reject"/i);
  });

  test("rejects YAML with both input and consent keys on the same step", () => {
    const yaml = `
name: x
description: y
events: z
steps:
  - input: a
    consent: approve
`;
    expect(() => parseCastScript(yaml)).toThrow(/cannot have both input and consent/i);
  });

  test("accepts optional timeoutMs on input steps", () => {
    const yaml = `
name: x
description: y
events: z
steps:
  - input: nimbus serve
    timeoutMs: 5000
`;
    const compiled = parseCastScript(yaml);
    expect(compiled.inputGroups[0]?.input).toMatchObject({
      input: "nimbus serve",
      timeoutMs: 5000,
    });
  });

  test("malformed YAML throws with line context", () => {
    expect(() => parseCastScript("name: [unclosed\n")).toThrow();
  });
});
