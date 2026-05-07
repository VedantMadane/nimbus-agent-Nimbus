import { expect, test } from "bun:test";

import { RateLimitError, UnauthenticatedError } from "../sync/types.ts";
import {
  createMemoryIndexDb,
  createStubVault,
  describeWithFetchRestore,
  expectServiceItemCount,
  type SyncTestFetchParams,
  silentSyncContextExtras,
  testConnectorSyncNoop,
  urlFromFetchInput,
} from "./connector-sync-test-helpers.ts";
import { createGithubSyncable } from "./github-sync.ts";

const USER_ENDPOINT = "https://api.github.com/user";

function userResponse(login: string): Response {
  return new Response(JSON.stringify({ login }), {
    status: 200,
    headers: { "Content-Type": "application/json", etag: '"user-etag"' },
  });
}

function pullRequestEventsResponse(etag = '"w1"'): Response {
  return new Response(
    JSON.stringify([
      {
        id: "e1",
        type: "PullRequestEvent",
        repo: { full_name: "nimbus/repo" },
        payload: {
          pull_request: {
            number: 9,
            title: "Fix sync",
            html_url: "https://github.com/nimbus/repo/pull/9",
            updated_at: "2026-04-01T12:00:00Z",
            state: "open",
            user: { login: "alice" },
          },
        },
      },
    ]),
    { status: 200, headers: { etag } },
  );
}

describeWithFetchRestore("github-sync", () => {
  testConnectorSyncNoop(
    "no-op when PAT missing",
    () => createGithubSyncable({ ensureGithubMcpRunning: async () => {} }),
    createStubVault({ "github.pat": null }),
  );

  test("first sync calls /user, then /users/{login}/events; indexes events", async () => {
    const db = createMemoryIndexDb();
    const calls: string[] = [];
    globalThis.fetch = (async (
      input: SyncTestFetchParams[0],
      _init?: SyncTestFetchParams[1],
    ): Promise<Response> => {
      const u = urlFromFetchInput(input);
      calls.push(u);
      if (u === USER_ENDPOINT) {
        return userResponse("octocat");
      }
      if (u.startsWith("https://api.github.com/users/octocat/events")) {
        return pullRequestEventsResponse();
      }
      throw new Error(`unexpected fetch: ${u}`);
    }) as typeof fetch;

    const sync = createGithubSyncable({ ensureGithubMcpRunning: async () => {} });
    const ctx = {
      vault: createStubVault({ "github.pat": "ghp_test" }),
      db,
      ...silentSyncContextExtras(),
    };
    const r = await sync.sync(ctx, null);
    expect(r.itemsUpserted).toBe(1);
    expect(r.cursor).toContain("nimbus-ghub1:");
    expectServiceItemCount(db, "github", 1);
    expect(calls[0]).toBe(USER_ENDPOINT);
    expect(calls[1]).toContain("/users/octocat/events");
  });

  test("subsequent sync with cached login skips /user", async () => {
    const db = createMemoryIndexDb();
    let userCalls = 0;
    let eventCalls = 0;
    globalThis.fetch = (async (
      input: SyncTestFetchParams[0],
      _init?: SyncTestFetchParams[1],
    ): Promise<Response> => {
      const u = urlFromFetchInput(input);
      if (u === USER_ENDPOINT) {
        userCalls += 1;
        return userResponse("octocat");
      }
      if (u.startsWith("https://api.github.com/users/octocat/events")) {
        eventCalls += 1;
        return pullRequestEventsResponse(`"e${String(eventCalls)}"`);
      }
      throw new Error(`unexpected fetch: ${u}`);
    }) as typeof fetch;

    const sync = createGithubSyncable({ ensureGithubMcpRunning: async () => {} });
    const ctx = {
      vault: createStubVault({ "github.pat": "ghp_x" }),
      db,
      ...silentSyncContextExtras(),
    };
    const first = await sync.sync(ctx, null);
    const second = await sync.sync(ctx, first.cursor);
    expect(userCalls).toBe(1);
    expect(eventCalls).toBe(2);
    expect(second.cursor).toContain("nimbus-ghub1:");
  });

  test("304 uses If-None-Match and returns zero upserts", async () => {
    const db = createMemoryIndexDb();
    let eventCalls = 0;
    globalThis.fetch = (async (
      input: SyncTestFetchParams[0],
      init?: SyncTestFetchParams[1],
    ): Promise<Response> => {
      const u = urlFromFetchInput(input);
      if (u === USER_ENDPOINT) {
        return userResponse("octocat");
      }
      if (u.startsWith("https://api.github.com/users/octocat/events")) {
        eventCalls += 1;
        if (eventCalls === 1) {
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { etag: '"abc"' },
          });
        }
        const headersInit = init?.headers;
        const h = new Headers(headersInit ?? undefined);
        expect(h.get("If-None-Match")).toBe('"abc"');
        return new Response("", { status: 304 });
      }
      throw new Error(`unexpected fetch: ${u}`);
    }) as typeof fetch;

    const sync = createGithubSyncable({ ensureGithubMcpRunning: async () => {} });
    const ctx = {
      vault: createStubVault({ "github.pat": "ghp_x" }),
      db,
      ...silentSyncContextExtras(),
    };
    const first = await sync.sync(ctx, null);
    expect(first.cursor).toContain("nimbus-ghub1:");
    const second = await sync.sync(ctx, first.cursor);
    expect(second.itemsUpserted).toBe(0);
    expect(second.cursor).toBe(first.cursor);
    expect(eventCalls).toBe(2);
  });

  test("legacy cursor without login field re-resolves via /user", async () => {
    const db = createMemoryIndexDb();
    let userCalls = 0;
    globalThis.fetch = (async (
      input: SyncTestFetchParams[0],
      _init?: SyncTestFetchParams[1],
    ): Promise<Response> => {
      const u = urlFromFetchInput(input);
      if (u === USER_ENDPOINT) {
        userCalls += 1;
        return userResponse("octocat");
      }
      if (u.startsWith("https://api.github.com/users/octocat/events")) {
        return pullRequestEventsResponse();
      }
      throw new Error(`unexpected fetch: ${u}`);
    }) as typeof fetch;

    const legacyCursor = `nimbus-ghub1:${Buffer.from(JSON.stringify({ etag: '"old"' }), "utf8").toString("base64url")}`;
    const sync = createGithubSyncable({ ensureGithubMcpRunning: async () => {} });
    const ctx = {
      vault: createStubVault({ "github.pat": "ghp_x" }),
      db,
      ...silentSyncContextExtras(),
    };
    const r = await sync.sync(ctx, legacyCursor);
    expect(userCalls).toBe(1);
    expect(r.itemsUpserted).toBe(1);
  });

  test("401 from /user throws UnauthenticatedError", async () => {
    const db = createMemoryIndexDb();
    globalThis.fetch = (async () =>
      new Response("Unauthorized", { status: 401 })) as unknown as typeof fetch;

    const sync = createGithubSyncable({ ensureGithubMcpRunning: async () => {} });
    const ctx = {
      vault: createStubVault({ "github.pat": "ghp_x" }),
      db,
      ...silentSyncContextExtras(),
    };
    await expect(sync.sync(ctx, null)).rejects.toThrow(UnauthenticatedError);
  });

  test("403 with exhausted quota throws RateLimitError honoring Retry-After seconds", async () => {
    const db = createMemoryIndexDb();
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ message: "rate limit" }), {
        status: 403,
        headers: {
          "x-ratelimit-remaining": "0",
          "retry-after": "90",
        },
      })) as unknown as typeof fetch;

    const sync = createGithubSyncable({ ensureGithubMcpRunning: async () => {} });
    const ctx = {
      vault: createStubVault({ "github.pat": "ghp_x" }),
      db,
      ...silentSyncContextExtras(),
    };
    try {
      await sync.sync(ctx, null);
      expect.unreachable();
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(RateLimitError);
      const rl = e as RateLimitError;
      const delta = rl.retryAfter.getTime() - Date.now();
      expect(delta).toBeGreaterThanOrEqual(90_000 - 200);
      expect(delta).toBeLessThanOrEqual(90_000 + 200);
    }
  });
});
