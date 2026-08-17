import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
import { generateEmbedding } from '@/lib/rag/embedder';

export type EntityEmbeddingType =
  | 'document'
  | 'flashcard'
  | 'formula'
  | 'calendar'
  | 'subject'
  | 'memory'
  | 'quiz';

export interface IndexEntityInput {
  ownerUserId?: string | null;
  entityType: EntityEmbeddingType;
  entityId: string;
  subjectId?: string | null;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface EntitySearchFilter {
  entityTypes?: EntityEmbeddingType[];
  subjectId?: string | null;
  threshold?: number;
  limit?: number;
  vectorWeight?: number;
}

export interface EntitySearchResult {
  id: string;
  entityType: string;
  entityId: string;
  subjectId: string;
  title: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

/**
 * Upsert a single entity embedding into the unified index.
 * Idempotent via (entity_type, entity_id, owner_user_id) unique key.
 * Runs synchronously - callers opt into embedding-on-save by invoking this.
 *
 * Documents are special-cased: they have their own `documents.embedding`
 * column and hybrid_search('documents') branch, so they are written there
 * rather than into entity_embeddings.
 */
export async function indexEntity(input: IndexEntityInput): Promise<boolean> {
  const { ownerUserId = null, entityType, entityId, subjectId = null, content, metadata = {} } = input;
  if (!content || content.trim().length === 0) return true;

  let embedding: number[];
  try {
    embedding = await generateEmbedding(content.trim().slice(0, 8000));
  } catch (err) {
    console.warn('[indexEntity] Embedding unavailable, skipping:', err instanceof Error ? err.message : err);
    return false;
  }

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch {
    const { createToolsClient } = await import('@/lib/supabase/tools-client');
    supabase = createToolsClient();
  }

  const embeddingStr = `[${embedding.join(',')}]`;

  if (entityType === 'document') {
    const { error } = await supabase
      .from('documents')
      .update({ embedding: embeddingStr, updated_at: new Date().toISOString() })
      .eq('id', entityId)
      .eq('owner_user_id', ownerUserId);
    if (error) {
      console.error('[indexEntity] Document embedding update error:', error);
      return false;
    }
    return true;
  }

  const { error } = await supabase
    .from('entity_embeddings')
    .upsert(
      {
        owner_user_id: ownerUserId,
        entity_type: entityType,
        entity_id: entityId,
        subject_id: subjectId,
        content: content.trim().slice(0, 8000),
        metadata,
        embedding: embeddingStr,
      },
      { onConflict: 'entity_type,entity_id,owner_user_id' }
    );

  if (error) {
    console.error('[indexEntity] Upsert error:', error);
    return false;
  }
  return true;
}

/** Remove a single entity embedding from the unified index. */
export async function unindexEntity(
  entityType: EntityEmbeddingType,
  entityId: string,
  ownerUserId?: string | null
): Promise<boolean> {
  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch {
    const { createToolsClient } = await import('@/lib/supabase/tools-client');
    supabase = createToolsClient();
  }

  if (entityType === 'document') {
    const { error } = await supabase
      .from('documents')
      .update({ embedding: null, updated_at: new Date().toISOString() })
      .eq('id', entityId);
    if (error) {
      console.error('[unindexEntity] Document embedding clear error:', error);
      return false;
    }
    return true;
  }

  let query = supabase
    .from('entity_embeddings')
    .delete()
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (ownerUserId !== undefined && ownerUserId !== null) {
    query = query.eq('owner_user_id', ownerUserId);
  }

  const { error } = await query;
  if (error) {
    console.error('[unindexEntity] Delete error:', error);
    return false;
  }
  return true;
}

/** Best-effort bulk index (used by backfill/ingest scripts). */
export async function indexEntities(rows: IndexEntityInput[]): Promise<{ indexed: number; skipped: number }> {
  let indexed = 0;
  let skipped = 0;
  for (const row of rows) {
    try {
      const ok = await indexEntity(row);
      if (ok) indexed++;
      else skipped++;
    } catch {
      skipped++;
    }
  }
  return { indexed, skipped };
}

/**
 * Vector search over the unified entity index. Returns the caller's own
 * rows plus shared (owner NULL) corpus rows such as formulas.
 */
export async function searchEntities(
  query: string,
  ownerUserId: string | null,
  filter: EntitySearchFilter = {}
): Promise<EntitySearchResult[]> {
  if (!query || query.trim().length === 0) return [];

  const {
    entityTypes,
    subjectId = null,
    threshold = 0.4,
    limit = 10,
    vectorWeight = 0.7,
  } = filter;

  let embedding: number[];
  try {
    embedding = await generateEmbedding(query);
  } catch (err) {
    console.warn('[searchEntities] Embedding unavailable:', err instanceof Error ? err.message : err);
    return [];
  }

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch {
    const { createToolsClient } = await import('@/lib/supabase/tools-client');
    supabase = createToolsClient();
  }

  const params: Record<string, unknown> = {
    query_table: 'entity_embeddings',
    query_embedding: `[${embedding.join(',')}]`,
    query_text: query,
    match_threshold: threshold,
    match_count: limit * 2,
    vector_weight: vectorWeight,
    p_owner_user_id: ownerUserId,
    p_subject_id: subjectId || null,
    p_entity_types: entityTypes?.length ? entityTypes : null,
  };

  const { data, error } = await (supabase.rpc as any)('hybrid_search', params);
  if (error) {
    console.error('[searchEntities] Error:', error);
    return [];
  }

  return ((data || []) as Record<string, unknown>[])
    .filter((r) => Number(r.score) > 0.25)
    .slice(0, limit)
    .map((r) => {
      const meta = (r.metadata as Record<string, unknown>) || {};
      return {
        id: String(r.id),
        entityType: String(meta.entity_type || ''),
        entityId: String(meta.entity_id || ''),
        subjectId: String(meta.subject_id || ''),
        title: String(meta.title || ''),
        content: String(r.content || ''),
        score: Number(r.score || 0),
        metadata: meta,
      };
    });
}