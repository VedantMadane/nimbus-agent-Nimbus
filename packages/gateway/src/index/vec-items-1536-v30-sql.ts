/**
 * V30 migration — `vec_items_1536` virtual table for 1536-dim embeddings
 * (Phase 5 T6 PR 3). Pairs with `vec_items_384` from V6. Per-(service, type)
 * routing in `embedding/routing-pipeline.ts` decides which table receives
 * a chunk based on `item.service` + `item.type` and the active provider.
 *
 * The existing 384-dim delete trigger is recreated with a `WHEN OLD.dims = 384`
 * clause; the new 1536-dim trigger has `WHEN OLD.dims = 1536`. Both are scoped
 * by the not-null `embedding_chunk.dims` column declared at V6.
 */
export const VEC_ITEMS_1536_V30_SCHEMA_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS vec_items_1536
  USING vec0(embedding float[1536]);

DROP TRIGGER IF EXISTS embedding_chunk_ad_delete_vec384;
CREATE TRIGGER embedding_chunk_ad_delete_vec384
AFTER DELETE ON embedding_chunk
FOR EACH ROW
WHEN OLD.dims = 384
BEGIN
  DELETE FROM vec_items_384 WHERE rowid = OLD.vec_rowid;
END;

CREATE TRIGGER IF NOT EXISTS embedding_chunk_ad_delete_vec1536
AFTER DELETE ON embedding_chunk
FOR EACH ROW
WHEN OLD.dims = 1536
BEGIN
  DELETE FROM vec_items_1536 WHERE rowid = OLD.vec_rowid;
END;
`;

/**
 * Fallback: when sqlite-vec is unavailable, V6 created `embedding_chunk`
 * without `vec_items_*` triggers. There is nothing for V30 to do — the
 * migration row is still recorded by the runner so `_schema_migrations`
 * stays sequential.
 */
export const VEC_ITEMS_1536_V30_NO_VEC_SQL = "";
