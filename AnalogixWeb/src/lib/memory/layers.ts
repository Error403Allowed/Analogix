import { createToolsClient } from '@/lib/supabase/tools-client';
import type {
  MemoryLayer,
  MemoryType,
  MemoryFragment,
  EducationalMemory,
  WorkspaceMemory,
  SemanticMemory,
  ExecutionMemory,
  MemoryRetrievalOptions,
  RetrievedMemory,
} from '@/types/memory';

export class MemorySystem {
  private userId: string;
  private supabase: ReturnType<typeof createToolsClient> | null;

  constructor(userId: string) {
    this.userId = userId;
    this.supabase = null;
  }

  private getClient() {
    if (!this.supabase) {
      this.supabase = createToolsClient();
    }
    return this.supabase;
  }

  async store(
    content: string,
    type: MemoryType,
    layer: MemoryLayer,
    options?: {
      importance?: number;
      subjectId?: string;
      sessionId?: string;
      relatedEntityType?: string;
      relatedEntityId?: string;
    }
  ): Promise<string> {
    const supabase = this.getClient();

    const memoryPayload = {
      user_id: this.userId,
      content,
      memory_type: type,
      importance: options?.importance ?? 0.5,
      subject_id: options?.subjectId,
      session_id: options?.sessionId,
      related_entity_type: options?.relatedEntityType,
      related_entity_id: options?.relatedEntityId,
      created_at: new Date().toISOString(),
    } as const;

    const { data, error } = await supabase
      .from('ai_memory_fragments')
      .insert(memoryPayload as any)
      .select('id')
      .single() as { data: { id: string } | null; error: { message: string } | null };

    if (error) throw new Error(`Failed to store memory: ${error.message}`);
    return data?.id ?? '';
  }

  async retrieve(options: MemoryRetrievalOptions): Promise<RetrievedMemory[]> {
    const supabase = this.getClient();
    const { layers, query, subject_ids, limit = 10, min_importance = 0 } = options;

    let dbQuery = supabase
      .from('ai_memory_fragments')
      .select('*')
      .eq('user_id', this.userId)
      .gte('importance', min_importance)
      .order('importance', { ascending: false })
      .limit(limit * 2);

    if (layers && layers.length > 0) {
      const layerTypes: Record<MemoryLayer, MemoryType[]> = {
        conversational: ['context'],
        educational: ['strength', 'weakness', 'learning_style', 'study_pattern'],
        workspace: ['fact'],
        semantic: ['preference', 'goal', 'skill'],
        execution: ['context'],
      };

      const allowedTypes = layers.flatMap(l => layerTypes[l] || []);
      if (allowedTypes.length > 0) {
        dbQuery = dbQuery.in('memory_type', allowedTypes);
      }
    }

    if (subject_ids && subject_ids.length > 0) {
      dbQuery = dbQuery.in('subject_id', subject_ids);
    }

    const { data: memories, error } = await dbQuery;

    if (error || !memories) {
      console.error('[MemorySystem] retrieve error:', error);
      return [];
    }

    interface MemoryFragmentRow {
      id: string;
      user_id: string;
      content: string;
      memory_type: string;
      importance: number;
      reinforcement_count?: number;
      last_accessed_at?: string;
      created_at: string;
      subject_id?: string;
    }

    let results = memories.map((m: MemoryFragmentRow) => {
      const memoryType = m.memory_type as MemoryType;
      return {
        fragment: {
          id: m.id,
          user_id: m.user_id,
          content: m.content,
          memory_type: memoryType,
          layer: this.inferLayer(memoryType),
          importance: m.importance,
          reinforced_count: m.reinforcement_count || 0,
          last_accessed_at: m.last_accessed_at || m.created_at,
          created_at: m.created_at,
          subject_id: m.subject_id,
        },
        relevance_score: m.importance,
        layer: this.inferLayer(memoryType),
      };
    });

    if (query) {
      const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 3);
      results = results
        .map(r => {
          const contentLower = r.fragment.content.toLowerCase();
          const relevance = keywords.filter(k => contentLower.includes(k)).length / Math.max(keywords.length, 1);
          return { ...r, relevance_score: r.relevance_score * (0.5 + relevance * 0.5) };
        })
        .filter(r => r.relevance_score > min_importance)
        .sort((a, b) => b.relevance_score - a.relevance_score);
    }

    return results.slice(0, limit);
  }

  private inferLayer(memoryType: MemoryType): MemoryLayer {
    switch (memoryType) {
      case 'strength':
      case 'weakness':
      case 'learning_style':
      case 'study_pattern':
        return 'educational';
      case 'preference':
      case 'goal':
        return 'semantic';
      case 'skill':
        return 'educational';
      case 'context':
        return 'conversational';
      case 'fact':
        return 'workspace';
      default:
        return 'semantic';
    }
  }

  async getEducationalMemory(): Promise<EducationalMemory> {
    const supabase = this.getClient();

    const { data: eduMemories } = await supabase
      .from('educational_memory')
      .select('*')
      .eq('user_id', this.userId)
      .order('importance', { ascending: false }) as { data: Array<{
        memory_type: string;
        subject_id?: string;
        content: string;
        importance: number;
      }> | null };

    const { data: quizPerformance } = await supabase
      .from('quiz_performance')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
      .limit(20) as { data: Array<Record<string, unknown>> | null };

    const strengths = eduMemories?.filter(m => m.memory_type === 'strength') || [];
    const weakAreas = eduMemories?.filter(m => m.memory_type === 'weakness') || [];
    const studyPatterns = eduMemories?.filter(m => m.memory_type === 'study_pattern') || [];

    return {
      strengths: strengths.map(s => ({
        subject_id: s.subject_id || '',
        memory_type: 'strength',
        content: s.content,
        evidence: [],
        importance: s.importance,
      })),
      weak_areas: weakAreas.map(w => ({
        subject_id: w.subject_id || '',
        topic: w.content,
        description: w.content,
        related_quiz_ids: [],
        recommended_actions: [],
      })),
      study_patterns: studyPatterns.map(p => ({
        subject_id: p.subject_id || '',
        pattern_type: p.memory_type,
        description: p.content,
        confidence: p.importance,
        data_points: [],
      })),
      quiz_performance: (quizPerformance || []).map(q => ({
        quiz_id: String(q.quiz_id ?? ''),
        subject_id: String(q.subject_id ?? ''),
        topic: String(q.topic ?? ''),
        score: Number(q.score ?? 0),
        total_questions: Number(q.total_questions ?? 0),
        correct_answers: Number(q.correct_answers ?? 0),
        weak_topics: [],
        created_at: String(q.created_at ?? new Date().toISOString()),
      })),
    };
  }

  async reinforce(id: string): Promise<void> {
    const supabase = this.getClient();

    const { data: memory } = await supabase
      .from('ai_memory_fragments')
      .select('reinforcement_count, importance')
      .eq('id', id)
      .single() as { data: { reinforcement_count?: number; importance: number } | null };

    if (memory) {
      const newCount = (memory.reinforcement_count || 0) + 1;
      const newImportance = Math.min(1, memory.importance + 0.05);

      await supabase
        .from('ai_memory_fragments')
        .update({
          reinforcement_count: newCount,
          importance: newImportance,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', id);
    }
  }

  async consolidate(): Promise<{ newSummaries: string[]; prunedCount: number }> {
    const supabase = this.getClient();

    const { data: oldMemories } = await supabase
      .from('ai_memory_fragments')
      .select('id, created_at, importance, reinforcement_count')
      .eq('user_id', this.userId)
      .lt('importance', 0.3)
      .lt('reinforcement_count', 2)
      .order('created_at', { ascending: true }) as { data: Array<{ id: string }> | null };

    if (oldMemories && oldMemories.length > 0) {
      const oldIds = oldMemories.map(m => m.id);
      await supabase
        .from('ai_memory_fragments')
        .delete()
        .in('id', oldIds);

      return { newSummaries: [], prunedCount: oldIds.length };
    }

    return { newSummaries: [], prunedCount: 0 };
  }
}

export function createMemorySystem(userId: string): MemorySystem {
  return new MemorySystem(userId);
}

export async function buildMemoryContext(
  userId: string,
  query?: string
): Promise<string> {
  const memory = createMemorySystem(userId);
  const memories = await memory.retrieve({
    layers: ['educational', 'semantic', 'workspace'],
    query,
    limit: 5,
  });

  if (memories.length === 0) return '';

  const parts: string[] = [];
  const byType = {
    fact: [] as string[],
    preference: [] as string[],
    goal: [] as string[],
    strength: [] as string[],
    weakness: [] as string[],
  };

  for (const m of memories) {
    const type = m.fragment.memory_type;
    if (type in byType) {
      byType[type as keyof typeof byType].push(m.fragment.content.slice(0, 100));
    }
  }

  if (byType.fact.length) parts.push(`Facts: ${byType.fact.join(' | ')}`);
  if (byType.preference.length) parts.push(`Prefs: ${byType.preference.join(' | ')}`);
  if (byType.strength.length) parts.push(`Strengths: ${byType.strength.join(', ')}`);
  if (byType.weakness.length) parts.push(`Weak areas: ${byType.weakness.join(', ')}`);

  return parts.length > 0 ? `[Memory] ${parts.join(' | ')}` : '';
}