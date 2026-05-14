import { createServer, type Server, type Socket } from "node:net";

/**
 * Thin JSON-RPC 2.0 server for the cast tripwire. Speaks the same wire
 * protocol the CLI's IPCClient already expects (newline-delimited JSON
 * over Unix socket / Windows named pipe). Does NOT implement any real
 * Gateway behavior: no ToolExecutor, no HITL gate, no MCP, no LLM.
 *
 * Loads an event script (events.json) that names ordered notifications
 * per input step. When the step's `trigger` method is called, emits the
 * matching step's notifications in order; pauses at consent.request until
 * the CLI sends consent.respond, then continues.
 *
 * IMPORTANT — each step declares the RPC method that triggers its
 * notification queue via the `trigger` field (defaulting to
 * `"engine.askStream"` for backward compatibility with existing scripts).
 * When `handleMessage` receives a call matching the current step's trigger,
 * it responds immediately and then emits the scripted notifications. Steps
 * whose CLI command calls a different method (e.g. `agents.expert`,
 * `agent.invoke`) must set `trigger` accordingly in events.json.
 *
 * For `engine.askStream` the response is `{ streamId }`. For all other
 * trigger methods the response comes from the step's `methodResponses`
 * map (keyed by method name) or `null` if not found.
 *
 * Spec §6.
 */

export interface ScriptedNotification {
  readonly method: string;
  readonly params: unknown;
}

export interface ScriptedStep {
  readonly input: string;
  /**
   * The JSON-RPC method whose arrival triggers this step's notification
   * queue. Defaults to `"engine.askStream"` when omitted, preserving
   * backward compatibility with existing events.json files.
   */
  readonly trigger?: string;
  /**
   * When `true`, the trigger method's RPC response is sent AFTER all
   * scripted notifications have been emitted (including waiting for any
   * `consent.request` / `consent.respond` round-trip). Use this for
   * methods like `agent.invoke` where the CLI awaits the response and
   * then immediately disconnects — notifications must arrive before the
   * response or they will be dropped.
   *
   * When `false` or absent (default), the response is sent first and
   * notifications follow asynchronously (the `engine.askStream` pattern).
   */
  readonly respondAfterNotifications?: boolean;
  readonly notifications: ReadonlyArray<ScriptedNotification>;
  readonly methodResponses?: Readonly<Record<string, unknown>>;
}

export interface EventsScript {
  readonly steps: ReadonlyArray<ScriptedStep>;
}

export interface ConsentDecision {
  readonly requestId: string;
  readonly approved: boolean;
}

export interface FakeGatewayOptions {
  readonly socketPath: string;
  readonly events: EventsScript;
}

const STATUS_GATEWAY_DEFAULT = { uptimeMs: 1000, version: "test", platform: "test" };
const STATUS_INDEX_DEFAULT = { itemCount: 0, p95Latency: 0 };

export class FakeGateway {
  private server: Server | null = null;
  private currentStepIdx = 0;
  private pendingConsent: { requestId: string; resume: () => void } | null = null;
  /**
   * Early consent.respond messages that arrived before the corresponding
   * consent.request notification was emitted (i.e. before pendingConsent was
   * set). Keyed by requestId so emitStepNotifications can drain them.
   */
  private earlyConsents = new Map<string, boolean>();
  /** All active client sockets — destroyed on stop() so server.close() resolves promptly. */
  private activeSockets = new Set<Socket>();
  readonly consentDecisions: ConsentDecision[] = [];

  constructor(private readonly opts: FakeGatewayOptions) {}

  async start(): Promise<void> {
    this.server = createServer((socket) => this.handleConnection(socket));
    await new Promise<void>((resolve, reject) => {
      this.server!.once("listening", () => resolve());
      this.server!.once("error", reject);
      this.server!.listen(this.opts.socketPath);
    });
  }

  async stop(): Promise<void> {
    if (this.server === null) return;
    const s = this.server;
    this.server = null;
    // Stop accepting new connections FIRST so anything still in the OS accept
    // queue can't land in activeSockets after we've cleared it. s.close() is
    // non-blocking; the close event resolves after all connections close.
    s.close();
    // Unblock any emitStepNotifications loop awaiting consent.respond so its
    // promise can resolve before we destroy its socket. Without this, the loop
    // would leak with a captured reference to a destroyed socket.
    if (this.pendingConsent !== null) {
      const resume = this.pendingConsent.resume;
      this.pendingConsent = null;
      resume();
    }
    // Destroy all lingering connections so server.close() can fully resolve
    // immediately rather than waiting for clients to half-close on their own.
    for (const sock of this.activeSockets) {
      sock.destroy();
    }
    this.activeSockets.clear();
    await new Promise<void>((resolve) => s.once("close", resolve));
  }

  /** Advance to the next input step's notification queue. */
  advanceStep(): void {
    this.currentStepIdx += 1;
  }

  private handleConnection(socket: Socket): void {
    this.activeSockets.add(socket);
    socket.once("close", () => this.activeSockets.delete(socket));
    let buf = "";
    socket.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      let nl = buf.indexOf("\n");
      while (nl !== -1) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (line.trim().length > 0) {
          this.handleMessage(socket, line);
        }
        nl = buf.indexOf("\n");
      }
    });
    socket.on("error", () => {
      /* ignore — client may close abruptly */
    });
  }

  private handleMessage(socket: Socket, line: string): void {
    let msg: { jsonrpc?: string; id?: number | string | null; method?: string; params?: unknown };
    try {
      msg = JSON.parse(line);
    } catch {
      this.send(socket, {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      });
      return;
    }
    if (msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
      this.send(socket, {
        jsonrpc: "2.0",
        id: msg.id ?? null,
        error: { code: -32600, message: "Invalid Request" },
      });
      return;
    }
    const id = msg.id;

    // Per-step trigger: each step declares the RPC method whose arrival
    // fires the scripted notification queue. Defaults to "engine.askStream"
    // for backward compatibility.
    const currentStep = this.opts.events.steps[this.currentStepIdx];
    const stepTrigger = currentStep?.trigger ?? "engine.askStream";
    if (msg.method === stepTrigger) {
      if (id === undefined || id === null) {
        return;
      }
      // For engine.askStream return { streamId }; for other methods use the
      // methodResponses fixture or null.
      const result =
        msg.method === "engine.askStream"
          ? { streamId: `stream-${this.currentStepIdx + 1}` }
          : (currentStep?.methodResponses?.[msg.method] ?? null);

      if (currentStep?.respondAfterNotifications === true) {
        // Emit all notifications (including consent.request pauses) BEFORE
        // sending the RPC response. Required for methods like agent.invoke
        // where the CLI immediately disconnects after the response resolves.
        void this.emitStepNotifications(socket).then(() => {
          this.send(socket, { jsonrpc: "2.0", id, result });
        });
      } else {
        // Default: respond first, then emit notifications asynchronously.
        // This is the engine.askStream pattern.
        this.send(socket, { jsonrpc: "2.0", id, result });
        void this.emitStepNotifications(socket);
      }
      return;
    }

    if (msg.method === "consent.respond") {
      const p = msg.params as { requestId?: string; approved?: boolean };
      if (typeof p.requestId === "string" && typeof p.approved === "boolean") {
        if (this.pendingConsent?.requestId === p.requestId) {
          // The consent.request notification has already been emitted and the
          // emitter is awaiting this response — record and resume immediately.
          this.consentDecisions.push({ requestId: p.requestId, approved: p.approved });
          const resume = this.pendingConsent.resume;
          this.pendingConsent = null;
          resume();
        } else if (!this.earlyConsents.has(p.requestId)) {
          // consent.respond arrived before the matching consent.request was
          // emitted (async race). Stash it; emitStepNotifications will drain
          // the queue when it reaches the consent.request notification.
          this.earlyConsents.set(p.requestId, p.approved);
        }
        // Duplicate messages (same requestId seen twice) are silently dropped.
      }
      if (id !== undefined && id !== null) {
        this.send(socket, { jsonrpc: "2.0", id, result: null });
      }
      return;
    }
    if (msg.method === "status.gateway") {
      if (id !== undefined && id !== null) {
        this.send(socket, { jsonrpc: "2.0", id, result: STATUS_GATEWAY_DEFAULT });
      }
      return;
    }
    if (msg.method === "status.index") {
      if (id !== undefined && id !== null) {
        this.send(socket, { jsonrpc: "2.0", id, result: STATUS_INDEX_DEFAULT });
      }
      return;
    }
    const step = this.opts.events.steps[this.currentStepIdx];
    const fixtureResp = step?.methodResponses?.[msg.method];
    if (fixtureResp !== undefined && id !== undefined && id !== null) {
      this.send(socket, { jsonrpc: "2.0", id, result: fixtureResp });
      return;
    }
    if (id !== undefined && id !== null) {
      this.send(socket, {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not found: ${msg.method}` },
      });
    }
  }

  private async emitStepNotifications(socket: Socket): Promise<void> {
    const step = this.opts.events.steps[this.currentStepIdx];
    if (step === undefined) return;
    for (const notif of step.notifications) {
      this.send(socket, { jsonrpc: "2.0", method: notif.method, params: notif.params });
      if (notif.method === "consent.request") {
        const p = notif.params as { requestId?: string };
        if (typeof p.requestId === "string") {
          const rid = p.requestId;
          // Check whether consent.respond already arrived early (async race).
          if (this.earlyConsents.has(rid)) {
            const approved = this.earlyConsents.get(rid)!;
            this.earlyConsents.delete(rid);
            this.consentDecisions.push({ requestId: rid, approved });
            // No pause needed — response is already here.
          } else {
            // Wait for the client's consent.respond to arrive.
            await new Promise<void>((resolve) => {
              this.pendingConsent = { requestId: rid, resume: resolve };
            });
          }
        }
      }
    }
  }

  private send(socket: Socket, msg: unknown): void {
    socket.write(`${JSON.stringify(msg)}\n`);
  }
}
