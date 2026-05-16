"use client";

import { fetchJsonWithRetry } from "@/lib/fetch-wrapper";
import type { ResearchSource } from "@/types/research";

export const searchAcademicSources = async (
  query: string,
  limit = 8,
): Promise<ResearchSource[]> => {
  if (!query.trim()) return [];
  try {
    const data = await fetchJsonWithRetry<{ sources: ResearchSource[] }>(
      "/api/research/search",
      {
        method: "POST",
        body: { query, limit },
        timeoutMs: 20000,
        maxRetries: 1,
      }
    );
    return data?.sources || [];
  } catch {
    return [];
  }
};
