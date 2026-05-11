import { describe, expect, it } from "bun:test";
import { extractPrMetadataForIndex } from "../../../src/connectors/github-sync.ts";

describe("github-sync: PR metadata enrichment", () => {
  it("captures merged_at, merge_commit_sha, labels on a merged PR", () => {
    const pr = {
      number: 42,
      state: "closed",
      merged: true,
      merged_at: "2026-05-10T12:34:56Z",
      merge_commit_sha: "abc123def456",
      labels: [{ name: "bug" }, { name: "backend" }],
      user: { login: "alice" },
      draft: false,
    };
    const out = extractPrMetadataForIndex("nimbus-agent/payments", pr);
    expect(out.merged_at).toBe(Date.parse("2026-05-10T12:34:56Z"));
    expect(out.merge_commit_sha).toBe("abc123def456");
    expect(out.labels).toEqual(["bug", "backend"]);
    expect(out.merged).toBe(true);
  });

  it("omits merged_at and merge_commit_sha when PR is open", () => {
    const pr = {
      number: 7,
      state: "open",
      merged: false,
      labels: [],
      user: { login: "bob" },
      draft: false,
    };
    const out = extractPrMetadataForIndex("nimbus-agent/payments", pr);
    expect(out.merged_at).toBeUndefined();
    expect(out.merge_commit_sha).toBeUndefined();
    expect(out.labels).toEqual([]);
  });

  it("tolerates a labels array of strings (defensive)", () => {
    const pr = {
      number: 9,
      state: "closed",
      merged: true,
      merged_at: "2026-05-10T12:00:00Z",
      merge_commit_sha: "deadbeef",
      labels: ["revert", "hotfix"],
      user: { login: "alice" },
    };
    const out = extractPrMetadataForIndex("nimbus-agent/payments", pr);
    expect(out.labels).toEqual(["revert", "hotfix"]);
  });
});
