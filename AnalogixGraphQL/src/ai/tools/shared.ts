import { z } from "zod";
import { randomUUID } from "crypto";
import { GraphQLError } from "graphql";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolCall, ToolResult, ToolExecutionResult } from "@analogix/shared/types";
import type { GraphQLContext } from "../../context.js";

const VALID_SUBJECTS = new Set([
  "mathematics", "maths", "math", "english", "science",
  "digital technologies", "digital", "computing", "hass",
  "history", "geography", "economics", "business",
  "civics", "physics", "chemistry", "biology",
  "design and technologies", "design", "visual arts", "arts",
  "music", "health and physical education", "health", "pe", "pdhpe",
  "languages", "french", "japanese", "mandarin", "chinese",
  "german", "italian", "indonesian", "spanish",
  "mathematics advanced", "mathematics extension 1", "mathematics extension 2",
  "mathematical methods", "specialist mathematics", "further mathematics",
  "english advanced", "english extension 1", "english extension 2", "english standard",
  "business studies", "modern history", "legal studies",
  "ancient history", "accounting", "drama", "dance",
]);

const SUBJECT_NORMALIZER: Record<string, string> = {
  "mathematics": "math", "maths": "math", "math": "math",
  "english": "english",
  "science": "science",
  "biology": "biology",
  "chemistry": "chemistry",
  "physics": "physics",
  "history": "history",
  "geography": "geography",
  "economics": "economics",
  "business": "business",
  "computing": "computing",
  "digital technologies": "computing", "digital": "computing",
  "hass": "hass",
  "visual arts": "visual-arts", "arts": "visual-arts",
  "music": "music",
  "pdhpe": "pdhpe", "pe": "pdhpe", "health": "pdhpe",
  "health and physical education": "pdhpe",
  "languages": "languages",
  "french": "languages",
  "japanese": "languages",
  "mandarin": "languages", "chinese": "languages",
  "german": "languages",
  "italian": "languages",
  "indonesian": "languages",
  "spanish": "languages",
  "civics": "civics",
  "design and technologies": "design", "design": "design",
  "engineering": "engineering",
  "medicine": "medicine",
  "commerce": "commerce",
  "mathematics advanced": "math",
  "mathematics extension 1": "math",
  "mathematics extension 2": "math",
  "mathematical methods": "math",
  "specialist mathematics": "math",
  "further mathematics": "math",
  "english advanced": "english",
  "english extension 1": "english",
  "english extension 2": "english",
  "english standard": "english",
  "business studies": "business",
  "modern history": "history",
  "legal studies": "legal-studies",
  "ancient history": "history",
  "accounting": "business",
  "drama": "drama",
  "dance": "dance",
};

function normalizeSubject(subjectId: string): string {
  const lower = subjectId.toLowerCase().trim();
  return SUBJECT_NORMALIZER[lower] || lower;
}

function validateSubject(subjectId: string): string | null {
  const lower = subjectId.toLowerCase().trim();
  if (VALID_SUBJECTS.has(lower)) return null;
  for (const valid of VALID_SUBJECTS) {
    if (lower.includes(valid) || valid.includes(lower)) return null;
  }
  return `"${subjectId}" is not a recognised Australian Curriculum subject. Valid subjects include: Mathematics, English, Science, Biology, Chemistry, Physics, History, Geography, Economics, Business, Digital Technologies, HASS, Visual Arts, Music, PDHPE, Languages, etc.`;
}

function validateOptionalSubject(subjectId?: string): string | null {
  if (!subjectId) return null;
  return validateSubject(subjectId);
}

export type ToolHandler = (
  args: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient,
) => Promise<unknown>;

export { z, randomUUID, GraphQLError };
export type { SupabaseClient, ToolCall, ToolResult, ToolExecutionResult, GraphQLContext };
export { VALID_SUBJECTS, SUBJECT_NORMALIZER, normalizeSubject, validateSubject, validateOptionalSubject };
