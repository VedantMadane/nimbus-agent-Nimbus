/** Row shape from `item` for hybrid / semantic search (matches SQLite columns). */
export type HybridIndexedItem = {
  id: string;
  service: string;
  type: string;
  external_id: string;
  title: string;
  body_preview: string | null;
  url: string | null;
  canonical_url: string | null;
  modified_at: number;
  author_id: string | null;
  metadata: string | null;
  synced_at: number;
  pinned: number;
};

export type HybridSearchOptions = {
  query: string;
  limit: number;
  service?: string;
  itemType?: string;
  since?: number;
  /** When false, BM25 only. */
  semantic?: boolean;
  bm25Weight?: number;
  vectorWeight?: number;
  rrfK?: number;
  /** Active embedding model id (must match `embedding_chunk.model`). */
  embeddingModel: string;
  /** Required when `semantic` and KNN is used. */
  queryEmbedding?: Float32Array;
  /** Optional 1536-dim query vector for the hybrid (OpenAI side) KNN path. */
  queryEmbedding1536?: Float32Array;
  /** Model id paired with `queryEmbedding1536` (must match `embedding_chunk.model`). */
  embeddingModel1536?: string;
  /** Adjacent chunks (±N) merged into `semanticSnippet`. */
  contextChunks?: number;
};

export type HybridSearchResult = {
  item: HybridIndexedItem;
  bm25Rank: number | null;
  vectorRank: number | null;
  rrfScore: number;
  duplicates?: readonly string[];
  /** Best chunk ± context for agent consumption. */
  semanticSnippet?: string;
};
