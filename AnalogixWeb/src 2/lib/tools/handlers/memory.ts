import { createToolsClient } from '@/lib/supabase/tools-client';

export interface StoreMemoryParams {
  content: string;
  memoryType: 'fact' | 'preference' | 'goal' | 'skill';
  importance?: number;
  subjectId?: string;
}

export async function storeMemory(
  userId: string,
  params: StoreMemoryParams
): Promise<{ success: boolean; memoryId?: string; error?: string }> {
  const supabase = createToolsClient();

  try {
    const { data, error } = await supabase
      .from('ai_memory_fragments')
      .insert({
        user_id: userId,
        content: params.content,
        memory_type: params.memoryType,
        importance: params.importance ?? 0.5,
        created_at: new Date().toISOString(),
      } as any)
      .select('id')
      .single() as { data: { id: string } | null; error: unknown };

    if (error) {
      console.error('[storeMemory] Error:', error);
      return { success: false, error: (error as Error).message };
    }

    if (params.subjectId && data) {
      try {
        const sb: any = supabase;
        await sb.from('ai_memory_fragments').update({ subject_id: params.subjectId }).eq('id', data.id);
      } catch (e) {
        console.warn('[storeMemory] Failed to update subject_id:', e);
      }
    }

    return { success: true, memoryId: data?.id };
  } catch (err) {
    console.error('[storeMemory] Exception:', err);
    return { success: false, error: 'Failed to store memory' };
  }
}

export async function retrieveRelevantMemories(
  userId: string,
  query?: string,
  limit = 5
): Promise<{ content: string; memory_type: string; importance: number }[]> {
  const supabase = createToolsClient();

  const dbQuery = supabase
    .from('ai_memory_fragments')
    .select('content, memory_type, importance')
    .eq('user_id', userId)
    .gte('importance', 0.5)
    .order('importance', { ascending: false })
    .limit(limit);

  const { data, error } = await dbQuery as { data: Array<{ content: string; memory_type: string; importance: number }> | null; error: unknown };

  if (error || !data) {
    console.error('[retrieveRelevantMemories] Error:', error);
    return [];
  }

  if (!query) {
    return data;
  }

  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/).filter(k => k.length > 3);

  return data
    .map(m => {
      const contentLower = m.content.toLowerCase();
      const relevance = keywords.filter(k => contentLower.includes(k)).length / keywords.length;
      return { ...m, relevance };
    })
    .filter(m => m.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit)
    .map(({ relevance, ...rest }) => rest);
}