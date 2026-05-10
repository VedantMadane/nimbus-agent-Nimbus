import { expect, test } from "bun:test";
import { HITL_REQUIRED } from "./executor.ts";

test("obsidian.note.append is gated by HITL_REQUIRED", () => {
  expect(HITL_REQUIRED.has("obsidian.note.append")).toBe(true);
});
