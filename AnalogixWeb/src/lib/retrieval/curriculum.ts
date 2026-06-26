import { createToolsClient } from '@/lib/supabase/tools-client';
import { generateEmbedding } from '@/lib/rag/embedder';

export interface CurriculumSearchFilter {
  subject?: string;
  grade?: string;
  state?: string;
  topic?: string;
  chunkType?: string;
}

export interface CurriculumSearchResult {
  id: string;
  content: string;
  subject: string;
  grade: string;
  strand: string;
  topic: string;
  acaraCode: string;
  state: string;
  chunkType: string;
  score: number;
}

function applyFilters(queryParams: Record<string, unknown>, filters: CurriculumSearchFilter): void {
  if (filters.subject) queryParams.filter_subject = filters.subject;
  if (filters.grade) queryParams.filter_grade = filters.grade;
  if (filters.state) queryParams.filter_state = filters.state;
  if (filters.chunkType) queryParams.filter_chunk_type = filters.chunkType;
}

export class CurriculumRetriever {
  async retrieve(
    query: string,
    filters: CurriculumSearchFilter = {},
    limit = 5
  ): Promise<CurriculumSearchResult[]> {
    if (!query || query.trim().length === 0) return [];

    const embedding = await generateEmbedding(query);
    const supabase = createToolsClient();

    const embeddingStr = `[${embedding.join(',')}]`;

    const params: Record<string, unknown> = {
      query_table: 'curriculum_chunks',
      query_embedding: embeddingStr,
      query_text: query,
      match_threshold: 0.4,
      match_count: limit * 2,
      vector_weight: 0.7,
    };
    applyFilters(params, filters);

    const { data, error } = await (supabase.rpc as any)('hybrid_search', params);

    if (error) {
      console.error('[CurriculumRetriever] Error:', error);
      return [];
    }

    const rows = (data || []) as Record<string, unknown>[];
    const results: CurriculumSearchResult[] = rows
      .filter((r) => Number(r.score) > 0.3)
      .slice(0, limit)
      .map((r) => {
        const meta = (r.metadata as Record<string, unknown>) || {};
        return {
          id: String(r.id),
          content: String(r.content || ''),
          subject: String(meta.subject || ''),
          grade: String(meta.grade || ''),
          strand: String(meta.strand || ''),
          topic: String(meta.topic || ''),
          acaraCode: String(meta.acara_code || ''),
          state: String(meta.state || 'NATIONAL'),
          chunkType: String(meta.chunk_type || ''),
          score: Number(r.score || 0),
        };
      });

    return results;
  }

  formatContext(results: CurriculumSearchResult[]): string {
    if (results.length === 0) return '';
    const lines = ['━━━ CURRICULUM CONTENT ━━━'];
    for (const r of results) {
      const subjectLine = `${r.subject} Year ${r.grade}${r.acaraCode ? ` (${r.acaraCode})` : ''}`;
      const topicLine = r.topic ? `${r.strand} > ${r.topic}` : r.strand;
      const sourceLine = `[${r.state}]`;
      lines.push(`  ${subjectLine} ${sourceLine}`);
      lines.push(`    ${topicLine}`);
      lines.push(`    ${r.content}`);
      lines.push('');
    }
    lines.push('━━━ END CURRICULUM ━━━');
    return lines.join('\n');
  }
}

export function createCurriculumRetriever(): CurriculumRetriever {
  return new CurriculumRetriever();
}
