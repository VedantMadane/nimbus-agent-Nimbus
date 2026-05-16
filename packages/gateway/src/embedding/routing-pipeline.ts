import type { Database } from "bun:sqlite";
import type { SqliteEmbeddingPipeline } from "./pipeline.ts";
import { isProseHeavy, PROSE_HEAVY_TYPES } from "./routing.ts";
import type { EmbeddingPipeline, IndexedItem } from "./types.ts";

/**
 * Routes each item to the local (MiniLM 384) or OpenAI (1536) inner pipeline
 * based on `(service, type)` membership in `PROSE_HEAVY_TYPES`. Implements
 * `EmbeddingPipeline` so the lazy / worker runtimes treat it as a drop-in
 * replacement for `SqliteEmbeddingPipeline`.
 */
export class RoutingEmbeddingPipeline implements EmbeddingPipeline {
  constructor(
    private readonly db: Database,
    private readonly local: SqliteEmbeddingPipeline,
    private readonly openai: SqliteEmbeddingPipeline,
  ) {}

  async embedItem(item: IndexedItem): Promise<void> {
    const target = isProseHeavy(item.service, item.type) ? this.openai : this.local;
    await target.embedItem(item);
  }

  async deleteItemEmbeddings(itemId: string): Promise<void> {
    // The dim-aware delete triggers on `embedding_chunk` (V30) fan out to
    // vec_items_384 / vec_items_1536 automatically; one delete is enough.
    this.db.run(`DELETE FROM embedding_chunk WHERE item_id = ?`, [itemId]);
  }

  async backfillAll(onProgress?: (done: number, total: number) => void): Promise<void> {
    const proseKeys = Array.from(PROSE_HEAVY_TYPES);
    await this.openai.backfillForRoutingKeys({ in: proseKeys }, onProgress);
    await this.local.backfillForRoutingKeys({ notIn: proseKeys }, onProgress);
  }
}
