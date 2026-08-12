import { createToolsClient } from '@/lib/supabase/tools-client';

export interface HybridSearchOptions {
  table: string;
  queryEmbedding: number[];
  queryText: string;
  filters?: Record<string, unknown>;
  matchThreshold?: number;
  matchCount?: number;
  vectorWeight?: number;
}

export interface HybridSearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export async function hybridSearch(
  options: HybridSearchOptions
): Promise<HybridSearchResult[]> {
  const {
    table,
    queryEmbedding,
    queryText,
    matchThreshold = 0.5,
    matchCount = 10,
    vectorWeight = 0.7,
  } = options;

  const supabase = createToolsClient();
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  const params: Record<string, unknown> = {
    query_table: table,
    query_embedding: embeddingStr,
    query_text: queryText,
    match_threshold: matchThreshold,
    match_count: matchCount,
    vector_weight: vectorWeight,
  };

  const { data, error } = await (supabase.rpc as any)('hybrid_search', params);

  if (error) {
    console.error(`[hybridSearch] Error on ${table}:`, error);
    return [];
  }

  return ((data || []) as Record<string, unknown>[]).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    content: String(row.content || ''),
    score: Number(row.score || 0),
    metadata: (row.metadata as Record<string, unknown>) || {},
  }));
}

export async function upsertEmbedding(
  table: string,
  id: string,
  embedding: number[],
  extraFields?: Record<string, unknown>
): Promise<boolean> {
  const supabase = createToolsClient();
  const embeddingStr = `[${embedding.join(',')}]`;

  const payload: Record<string, unknown> = {
    id,
    embedding: embeddingStr,
    ...extraFields,
  };

  const { error } = await (supabase.from(table) as any).upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error(`[upsertEmbedding] Error on ${table}:`, error);
    return false;
  }
  return true;
}

export async function deleteEmbedding(
  table: string,
  id: string
): Promise<boolean> {
  const supabase = createToolsClient();
  const { error } = await (supabase.from(table) as any).delete().eq('id', id);
  if (error) {
    console.error(`[deleteEmbedding] Error on ${table}:`, error);
    return false;
  }
  return true;
}
