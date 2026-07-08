import { GraphQLError } from "graphql";
import { z } from "zod";
import { requireUser } from "./_helpers.js";
import type { GraphQLContext } from "../context.js";
import { callGroqChat } from "../ai/groq.js";
import { executeTools as runTools } from "../ai/executeTools.js";
import { logger } from "../logger.js";
import { createCurriculumRetriever } from "../retrieval/curriculum.js";
import { buildValidSubjectsPrompt } from "@analogix/shared/curriculum";
import {
  StudyScheduleInput,
  AssessmentGuideInput,
  ReexplainInput,
  ExtractTextInput,
  TutorInput,
  SearchResearchInput,
  SpeakInput,
} from "@analogix/shared/schemas";

const safeMath: Record<string, (...args: number[]) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sqrt: Math.sqrt, log: Math.log, log10: Math.log10,
  exp: Math.exp, abs: Math.abs, floor: Math.floor,
  ceil: Math.ceil, round: Math.round, pow: Math.pow,
};

function createSafeContext() {
  const ctx: Record<string, unknown> = { ...safeMath };
  ctx.linspace = (start: number, end: number, num = 50) => {
    const step = num > 1 ? (end - start) / (num - 1) : 0;
    return Array.from({ length: num }, (_, i) => start + i * step);
  };
  ctx.arange = (start: number, end: number, step = 1) => {
    const result: number[] = [];
    for (let i = start; i < end; i += step) result.push(i);
    return result;
  };
  ctx.sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  ctx.mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  ctx.min = (arr: number[]) => Math.min(...arr);
  ctx.max = (arr: number[]) => Math.max(...arr);
  ctx.len = (arr: unknown[]) => arr.length;
  return ctx;
}

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
      const mimeType = parsed.mimeType ?? "text/plain";
      return {
        text,
        fileName: parsed.fileName ?? null,
        mimeType,
        format: mimeType,
      };
    },

    tutor: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const parsed = TutorInput.parse(args.input);
      // Fetch user context (subjects, grade, state, hobbies) for system prompt tailoring
      const { data: profile } = await ctx.supabase!.from("profiles").select("*").eq("id", user.id).maybeSingle();

      // Retrieve curriculum context via RAG
      let curriculumContext = "";
      try {
        const retriever = createCurriculumRetriever(ctx.supabase!);
        const subjects = Array.isArray(profile?.subjects) ? profile.subjects : [];
        const filters: { subject?: string; grade?: string } = {};
        if (subjects.length > 0) filters.subject = String(subjects[0]);
        if (profile?.grade) filters.grade = String(profile.grade);
        const results = await retriever.retrieve(parsed.question, filters, 5);
        curriculumContext = retriever.formatContext(results);
      } catch (err) {
        logger.warn({ err }, "[tutor] curriculum RAG failed");
      }

      const prompt = buildTutorSystemPrompt(parsed, profile, curriculumContext);
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
      logger.warn("[tts] speak mutation called — TTS service not yet wired");
      return { audioUrl: "", duration: 0 };
    },

    executePython: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      requireUser(ctx);
      logger.warn("[executePython] Disabled for security — server-side code execution is not available");
      return { stdout: "", stderr: "", error: "Code execution is disabled", durationMs: 0 };
    },

    generateBanner: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      requireUser(ctx);
      const userName = String(args.input?.userName ?? args.input?.name ?? "Student");
      const subjects = Array.isArray(args.input?.subjects) ? args.input.subjects : [];
      const response = await callGroqChat({
        messages: [
          {
            role: "system",
            content: "You generate EXACTLY 3 lines for a banner. CRITICAL: Output must be exactly 3 lines, no more, no less. Each line 4-7 words, each ending with a period. No extra text, labels, quotes, or preface. Output ONLY the 3 lines separated by newlines. Be motivating and concise.",
          },
          {
            role: "user",
            content: `Student: ${userName}, Studying: ${subjects.join(", ")}.`,
          },
        ],
        maxTokens: 50,
        temperature: 1.0,
      });
      return { text: response || "" };
    },

    generateGreeting: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      requireUser(ctx);
      const userName = String(args.input?.userName ?? args.input?.name ?? "Student");
      const streak = Number(args.input?.streak ?? 0);
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
      const styles = ["friendly and energetic", "casual and relaxed", "warm and encouraging", "cheerful and upbeat"];
      const style = styles[Math.floor(Math.random() * styles.length)];
      const response = await callGroqChat({
        messages: [
          {
            role: "system",
            content: `You are Analogix AI, a concise tutor. Generate a short, one-sentence greeting for a student. Keep it under 8 words. Do not use emojis. Be ${style}. Reference the time of day if appropriate.`,
          },
          {
            role: "user",
            content: `Student name: ${userName}, Streak: ${streak} days, Time: ${timeOfDay}. Give a varied greeting different from your last one.`,
          },
        ],
        maxTokens: 30,
        temperature: 0.7,
      });
      return { text: response || `Welcome back, ${userName}.` };
    },

    executeTools: async (_: unknown, args: { tools: { name: string; args: Record<string, unknown> }[] }, ctx: GraphQLContext) => {
      requireUser(ctx);
      return runTools(args.tools, ctx);
    },

    generateTitle: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      requireUser(ctx);
      // Strip TOOL_CALLS blocks from conversation to avoid JSON leaking into title gen
      const stripToolCalls = (text: string) => text.replace(/TOOL_CALLS:\s*\[[\s\S]*?\]/g, "").trim();
      const conversation = stripToolCalls(String(args.input?.conversation ?? ""));
      const latestMessage = stripToolCalls(String(args.input?.latestMessage ?? ""));
      const systemPrompt = "You are naming a study chat session. Write a short 3-6 word title capturing the SPECIFIC topic being studied. Be concrete — not \"Math Help\" but \"Quadratic Formula Confusion\", \"WW2 Causes Breakdown\", \"Python List Indexing\". No quotes, no punctuation, just the title.";
      let response = await callGroqChat({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Conversation:\n${conversation}\n\nLatest: ${latestMessage}\n\nTitle:` },
        ],
        maxTokens: 30,
        temperature: 0.5,
      });
      let title = response.trim();
      title = title.replace(/^["'`]|["'`]$/g, "").trim();
      title = title.replace(/^(Title:|Here'?s?( a title)?:|The title is:?)/i, "").trim();
      title = title.replace(/[.!?]$/, "").trim();
      title = title.slice(0, 50);
      if (!title || title.length < 2) {
        const words = latestMessage.trim().split(/\s+/).slice(0, 4).join(" ");
        title = words || "New chat";
      }
      return { title };
    },
  },
};

function buildTutorSystemPrompt(
  input: z.infer<typeof TutorInput>,
  profile: Record<string, unknown> | null,
  curriculumContext?: string
): string {
  const subjects = Array.isArray(profile?.subjects) ? profile.subjects.join(", ") : "general";
  const grade = profile?.grade ?? "7-12";
  const state = profile?.state ?? null;
  const context = input.contextText ? `\n\nWorkspace context:\n${input.contextText.slice(0, 8_000)}` : "";
  const curriculumSection = curriculumContext ? `\n\n${curriculumContext}\n\nReference this curriculum content in your answer. Mention the ACARA code (e.g. AC9M8G03) when relevant. Ensure your explanations match the specified grade level and syllabus outcomes.` : "";
  const validSubjectsPrompt = buildValidSubjectsPrompt();
  const subjectsContext = Array.isArray(profile?.subjects) && profile.subjects.length > 0
    ? `\n\nThe user is enrolled in: ${(profile.subjects as string[]).join(", ")}. Only create data in these subjects.`
    : "";
  return `You are Analogix AI, an expert tutor for Australian secondary students. ` +
    `The student is in Year ${grade}${state ? ` in ${state}` : ""} studying ${subjects}. ` +
    `Be clear, structured, encouraging, and use LaTeX ($...$) for math. ` +
    `Use analogies when they genuinely help.${context}${curriculumSection}` +
    `\n\n${validSubjectsPrompt}${subjectsContext}`;
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
