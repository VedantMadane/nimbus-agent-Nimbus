import { expect, test } from "bun:test";
import { isItemLinkedGraphType } from "./relationship-graph.ts";

test("obsidian_note is a recognised item-linked graph type", () => {
  expect(isItemLinkedGraphType("obsidian_note")).toBe(true);
});
