import { describe, expect, test } from "bun:test";
import { runIndexCmd } from "./index-cmd.ts";

describe("nimbus index", () => {
  test("help prints usage", async () => {
    const orig = console.log;
    const lines: string[] = [];
    console.log = (s: unknown) => {
      lines.push(String(s));
    };
    try {
      await runIndexCmd(["help"]);
    } finally {
      console.log = orig;
    }
    expect(lines.join("\n")).toContain("nimbus index reembed");
  });

  test("unknown subcommand throws", async () => {
    await expect(runIndexCmd(["bogus"])).rejects.toThrow(/Unknown index subcommand/);
  });

  test("reembed without --model throws usage error", async () => {
    await expect(runIndexCmd(["reembed"])).rejects.toThrow(/--model/);
  });

  test("reembed without --yes / --dry-run prints planned action and returns", async () => {
    const orig = console.log;
    const lines: string[] = [];
    console.log = (s: unknown) => {
      lines.push(String(s));
    };
    try {
      await runIndexCmd(["reembed", "--model", "Xenova/all-MiniLM-L6-v2"]);
    } finally {
      console.log = orig;
    }
    expect(lines.join("\n")).toMatch(/Planned reembed/);
    expect(lines.join("\n")).toMatch(/--yes/);
  });
});
