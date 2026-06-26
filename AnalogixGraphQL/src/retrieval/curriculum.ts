import { logger } from "../logger.js";
import { generateEmbedding } from "../rag/embedder.js";
import type { SupabaseClient } from "@supabase/supabase-js";

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

export class CurriculumRetriever {
  constructor(private supabase: SupabaseClient) {}

  async retrieve(
    query: string,
    filters: { subject?: string; grade?: string; state?: string } = {},
    limit = 5
  ): Promise<CurriculumSearchResult[]> {
    if (!query || query.trim().length === 0) return [];

    const embedding = await generateEmbedding(query);
    const embeddingStr = `[${embedding.join(",")}]`;

    const params: Record<string, unknown> = {
      query_table: "curriculum_chunks",
      query_embedding: embeddingStr,
      query_text: query,
      match_threshold: 0.4,
      match_count: limit * 2,
      vector_weight: 0.7,
      filter_subject: filters.subject ?? null,
      filter_grade: filters.grade ?? null,
      filter_state: filters.state ?? null,
      filter_chunk_type: null,
    };

    const { data, error } = await (this.supabase.rpc as any)("hybrid_search", params);

    if (error) {
      logger.error({ error }, "[CurriculumRetriever] RPC error");
      return [];
    }

    const rows = (data || []) as Record<string, unknown>[];
    return rows
      .filter((r) => Number(r.score) > 0.3)
      .slice(0, limit)
      .map((r) => {
        const meta = (r.metadata as Record<string, unknown>) || {};
        return {
          id: String(r.id),
          content: String(r.content || ""),
          subject: String(meta.subject || ""),
          grade: String(meta.grade || ""),
          strand: String(meta.strand || ""),
          topic: String(meta.topic || ""),
          acaraCode: String(meta.acara_code || ""),
          state: String(meta.state || "NATIONAL"),
          chunkType: String(meta.chunk_type || ""),
          score: Number(r.score || 0),
        };
      });
  }

  formatContext(results: CurriculumSearchResult[]): string {
    if (results.length === 0) return "";
    const lines = ["━━━ CURRICULUM CONTENT ━━━"];
    for (const r of results) {
      const subjectLine = `${r.subject} Year ${r.grade}${r.acaraCode ? ` (${r.acaraCode})` : ""}`;
      const topicLine = r.topic ? `${r.strand} > ${r.topic}` : r.strand;
      lines.push(`  ${subjectLine} [${r.state}]`);
      lines.push(`    ${topicLine}`);
      lines.push(`    ${r.content}`);
      lines.push("");
    }
    lines.push("━━━ END CURRICULUM ━━━");
    return lines.join("\n");
  }
}

export function createCurriculumRetriever(supabase: SupabaseClient): CurriculumRetriever {
  return new CurriculumRetriever(supabase);
}
