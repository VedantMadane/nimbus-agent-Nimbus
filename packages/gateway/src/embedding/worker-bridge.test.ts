import { describe, expect, test } from "bun:test";
import pino from "pino";

import { tryCreateEmbeddingWorkerBridge } from "./worker-bridge.ts";

describe("tryCreateEmbeddingWorkerBridge", () => {
  test("returns a bridge synchronously without blocking on worker init", () => {
    const logger = pino({ level: "silent" });
    // The worker source path resolves at runtime; with a real Bun runtime,
    // `new Worker(...)` succeeds quickly and the bridge is returned before
    // the worker reports ready. We assert the call is synchronous-fast: the
    // returned value is non-null and non-Promise, and `embedQuery`/
    // `scheduleItemEmbedding` are immediately callable as no-ops.
    const start = Date.now();
    const bridge = tryCreateEmbeddingWorkerBridge(
      ":memory:",
      "/tmp/nimbus-test",
      { chunkTokens: 256, chunkOverlapTokens: 32, backfillBatchSize: 8 },
      logger,
    );
    const elapsedMs = Date.now() - start;

    // Must return well under 1s — previously this awaited up to 600s.
    expect(elapsedMs).toBeLessThan(1000);
    expect(bridge).not.toBeNull();
    if (bridge !== null) {
      // Calls during warmup gracefully degrade.
      expect(bridge.scheduleItemEmbedding("any-id")).toBeUndefined();
      const queryResult = bridge.embedQuery("hello");
      expect(queryResult).toBeInstanceOf(Promise);
      // Don't await — we just care that it returns a promise without throwing.
      bridge.terminate();
    }
  });
});
