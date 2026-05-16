/**
 * Shared interface for in-process lazy embedding vs Bun worker embedding.
 */
export type EmbeddingRuntime = {
  scheduleItemEmbedding: (itemId: string) => void;
  embedQuery: (text: string) => Promise<Float32Array | null>;
  /** Hybrid-aware: returns whichever vectors the runtime can produce.
   *  - local-only:  { vec384, null, model384, null }
   *  - openai-only: { null, vec1536, null, model1536 }
   *  - hybrid:      both populated (one OpenAI HTTP call per query) */
  embedQueryDual: (text: string) => Promise<{
    vec384: Float32Array | null;
    vec1536: Float32Array | null;
    model384: string | null;
    model1536: string | null;
  }>;
  /** Model tag stored in `embedding_chunk.model` / used for hybrid search filtering. */
  getEmbeddingModel: () => string;
  getEmbeddingDims: () => number;
  /** Best-effort progress from background backfill (worker only). */
  getBackfillProgress: () => { done: number; total: number } | null;
  /** Idempotent — worker backfills automatically; lazy runtime starts backfill here. */
  startBackgroundJobs: () => void;
  terminate: () => void;
};
