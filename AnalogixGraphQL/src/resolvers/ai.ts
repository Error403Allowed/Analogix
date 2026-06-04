import { GraphQLError } from "graphql";
import { z } from "zod";
import { requireUser } from "./_helpers.js";
import type { GraphQLContext } from "../context.js";
import { callGroqChat } from "../ai/groq.js";
import { logger } from "../logger.js";
import {
  StudyScheduleInput,
  AssessmentGuideInput,
  ReexplainInput,
  ExtractTextInput,
  TutorInput,
  SearchResearchInput,
  SpeakInput,
} from "@analogix/shared/schemas";

export const aiResolvers = {
  Mutation: {
    generateStudySchedule: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      requireUser(ctx);
      const parsed = StudyScheduleInput.parse(args.input);
      const prompt = `Generate a ${parsed.days}-day study schedule based on the following events/deadlines:\n\n` +
        `${parsed.events.map((e) => `- ${e.date}: ${e.title} (${e.type ?? "general"})`).join("\n")}\n\n` +
        `Return JSON: { days: [{ day, date, tasks: [String], durationMinutes }], summary }`;
      const response = await callGroqChat({
        messages: [
          { role: "system", content: "You create realistic study schedules. Return ONLY valid JSON." },
          { role: "user", content: prompt },
        ],
        maxTokens: 1500,
        temperature: 0.4,
      });
      const json = safeParseJson(response);
      return {
        days: Array.isArray(json?.days) ? json.days : [],
        summary: typeof json?.summary === "string" ? json.summary : "",
      };
    },

    generateAssessmentGuide: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      requireUser(ctx);
      const parsed = AssessmentGuideInput.parse(args.input);
      const prompt = `You are a senior study coach. Create a week-by-week study guide for this assessment.\n\n` +
        `Assessment text:\n"""\n${parsed.text.slice(0, 14_000)}\n"""\n\n` +
        `Return JSON: { weeks: [{ week, label, tasks: [String] }], summary }`;
      const response = await callGroqChat({
        messages: [
          { role: "system", content: "You produce concrete, week-by-week study guides. Return ONLY valid JSON." },
          { role: "user", content: prompt },
        ],
        maxTokens: 2000,
        temperature: 0.4,
      });
      const json = safeParseJson(response);
      return {
        weeks: Array.isArray(json?.weeks) ? json.weeks : [],
        summary: typeof json?.summary === "string" ? json.summary : "",
      };
    },

    reexplain: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      requireUser(ctx);
      const parsed = ReexplainInput.parse(args.input);
      const prompt = `Re-explain the following concept in a "${parsed.style}" style. Keep the same level of academic accuracy but adjust tone and structure.\n\n` +
        `Concept:\n"""\n${parsed.text}\n"""`;
      const response = await callGroqChat({
        messages: [
          { role: "system", content: "You rephrase concepts to make them clearer. Return ONLY the new explanation — no JSON." },
          { role: "user", content: prompt },
        ],
        maxTokens: 800,
        temperature: 0.6,
      });
      return { text: response.trim(), style: parsed.style };
    },

    extractText: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      requireUser(ctx);
      const parsed = ExtractTextInput.parse(args.input);
      // Heavy lifting delegated to a service-role helper that uses pdf-parse
      // for PDFs and mammoth for DOCX. The base64 path is used by mobile uploads.
      const { extractTextFromPayload } = await import("../ai/extractText.js");
      const text = await extractTextFromPayload({
        base64: parsed.base64,
        url: parsed.url,
        mimeType: parsed.mimeType,
        fileName: parsed.fileName,
      });
      return {
        text,
        fileName: parsed.fileName ?? null,
        mimeType: parsed.mimeType,
      };
    },

    tutor: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const parsed = TutorInput.parse(args.input);
      // Fetch user context (subjects, grade, state, hobbies) for system prompt tailoring
      const { data: profile } = await ctx.supabase!.from("profiles").select("*").eq("id", user.id).maybeSingle();
      const prompt = buildTutorSystemPrompt(parsed, profile);
      const response = await callGroqChat({
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: parsed.question },
        ],
        maxTokens: 1500,
        temperature: 0.7,
      });
      return { text: response, model: "llama-3.3-70b-versatile" };
    },

    searchResearch: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      requireUser(ctx);
      const parsed = SearchResearchInput.parse(args.input);
      // Delegate to a service module that hits OpenAlex + Crossref + Semantic Scholar
      const { searchAcademicPapers } = await import("../ai/research.js");
      const sources = await searchAcademicPapers({
        query: parsed.query,
        limit: parsed.limit,
        yearFrom: parsed.yearFrom,
        yearTo: parsed.yearTo,
        openAccessOnly: parsed.openAccessOnly,
      });
      return { query: parsed.query, total: sources.length, sources };
    },

    speak: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      requireUser(ctx);
      const parsed = SpeakInput.parse(args.input);
      // The mobile app uses expo-speech directly for TTS. The BFF exposes
      // this mutation for parity with the web app's /api/tts/speak.
      // For v1 we delegate to a simple TTS service (or return a data: URL
      // if no service is configured). Implementation TBD per requirements.
      logger.warn("[tts] speak mutation called — TTS service not yet wired");
      return { audioUrl: "", duration: 0 };
    },
  },
};

function buildTutorSystemPrompt(input: z.infer<typeof TutorInput>, profile: Record<string, unknown> | null): string {
  const subjects = Array.isArray(profile?.subjects) ? profile.subjects.join(", ") : "general";
  const grade = profile?.grade ?? "7-12";
  const state = profile?.state ?? null;
  const context = input.contextText ? `\n\nWorkspace context:\n${input.contextText.slice(0, 8_000)}` : "";
  return `You are Analogix AI, an expert tutor for Australian secondary students. ` +
    `The student is in Year ${grade}${state ? ` in ${state}` : ""} studying ${subjects}. ` +
    `Be clear, structured, encouraging, and use LaTeX ($...$) for math. ` +
    `Use analogies when they genuinely help.${context}`;
}

function safeParseJson(raw: string): Record<string, unknown> | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}
