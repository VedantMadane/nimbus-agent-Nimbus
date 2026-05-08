/**
 * @vitest-environment jsdom
 *
 * Regression coverage for the webview message listener in
 * src/chat/webview/main.ts.
 *
 * The previous implementation rejected every event whose
 * `event.source !== window.parent`. That guard is intuitive but is *not*
 * how VS Code's webview message broker works in practice: real
 * `MessageEvent`s arriving inside the iframe have `source` set to a window
 * proxy that does not `===` compare equal to `window.parent`. The original
 * guard therefore silently dropped every extension→webview payload —
 * userMessage, token, done, error, hitlInline — leaving the chat panel
 * visually empty even though the Gateway streamed end-to-end (verified
 * 2026-05-08 with diagnostic instrumentation; "REJECTED by source check"
 * fired on every inbound message).
 *
 * These tests pin the contract: real VS Code messages must apply, jsdom
 * harness messages (empty origin) must apply, and foreign cross-origin
 * messages must be dropped.
 */

import { beforeAll, beforeEach, describe, expect, test } from "vitest";

const CHAT_SHELL = `
<main id="root">
  <section id="empty-mount"></section>
  <section id="transcript"></section>
  <section id="hitl-mount"></section>
  <footer id="footer">
    <ul id="subtask-list"></ul>
    <span id="status"></span>
    <form id="input-form">
      <textarea id="input-text"></textarea>
      <button type="submit" id="input-send">Send</button>
      <button type="button" id="input-stop" disabled>Stop</button>
    </form>
  </footer>
</main>
`;

interface VsCodeApi {
  postMessage: (msg: unknown) => void;
  getState: () => unknown;
  setState: (s: unknown) => void;
}

function dispatch(origin: string, data: unknown): void {
  window.dispatchEvent(new MessageEvent("message", { origin, data }));
}

function transcriptHtml(): string {
  return document.querySelector("#transcript")?.innerHTML ?? "";
}

// One-time setup: re-bootstrapping main.ts cleanly between tests is awkward
// (top-level `acquireVsCodeApi()` runs once on import), so the suite shares
// a single bootstrap. Each test resets the transcript before dispatching so
// prior renders don't bleed across cases.
beforeAll(async () => {
  document.body.innerHTML = CHAT_SHELL;
  (globalThis as unknown as { acquireVsCodeApi: () => VsCodeApi }).acquireVsCodeApi = () => ({
    postMessage: () => undefined,
    getState: () => undefined,
    setState: () => undefined,
  });
  await import("../../src/chat/webview/main.js");
});

beforeEach(() => {
  const t = document.querySelector("#transcript");
  if (t !== null) t.innerHTML = "";
});

describe("webview message listener", () => {
  test("renders a userMessage payload from a vscode-webview origin", () => {
    dispatch("vscode-webview://abc", { type: "userMessage", text: "hi from extension" });
    expect(transcriptHtml()).toContain("hi from extension");
  });

  test("accepts empty origin (jsdom-style harness)", () => {
    dispatch("", { type: "userMessage", text: "from harness" });
    expect(transcriptHtml()).toContain("from harness");
  });

  test("drops messages from foreign cross-origin frames", () => {
    dispatch("https://evil.example", { type: "userMessage", text: "smuggled" });
    expect(transcriptHtml()).not.toContain("smuggled");
  });

  test("regression: source: null is accepted when origin is trusted", () => {
    // jsdom-constructed MessageEvents default to source: null. The previous
    // listener required source === window.parent and would have dropped this
    // exact event in production VS Code as well — pinning the case directly.
    const ev = new MessageEvent("message", {
      origin: "vscode-webview://xyz",
      data: { type: "userMessage", text: "no-source-payload" },
    });
    expect(ev.source).toBeNull();
    window.dispatchEvent(ev);
    expect(transcriptHtml()).toContain("no-source-payload");
  });

  test("ignores payloads that do not look like ExtensionToWebview", () => {
    dispatch("vscode-webview://abc", "not an object");
    dispatch("vscode-webview://abc", { noType: true });
    dispatch("vscode-webview://abc", null);
    expect(transcriptHtml()).toBe("");
  });
});
