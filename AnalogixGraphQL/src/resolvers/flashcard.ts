import { GraphQLError } from "graphql";
import { requireUser } from "./_helpers.js";
import type { GraphQLContext } from "../context.js";
import { sanitizeError } from "../utils/errorHandler.js";
import { z } from "zod";
import { GenerateFlashcardsInput, CreateFlashcardInput, CreateFlashcardSetInput } from "@analogix/shared/schemas";
import { callGroqChat } from "../ai/groq.js";
import { logger } from "../logger.js";

export const flashcardResolvers = {
  Query: {
    flashcards: async (_: unknown, args: { subjectId?: string; setId?: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      let query = ctx.supabase!
        .from("flashcards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (args.subjectId) query = query.eq("subject_id", args.subjectId);
      if (args.setId) query = query.eq("set_id", args.setId);
      const { data, error } = await query;
      if (error) throw new GraphQLError(sanitizeError(error, { userId: user.id, operation: "unknown" }));
      return (data ?? []).map(mapFlashcard);
    },
    flashcardsDue: async (_: unknown, args: { subjectId?: string; limit?: number }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const now = new Date().toISOString();
      let query = ctx.supabase!
        .from("flashcards")
        .select("*")
        .eq("user_id", user.id)
        .lte("next_review", now)
        .order("next_review", { ascending: true })
        .limit(args.limit ?? 20);
      if (args.subjectId) query = query.eq("subject_id", args.subjectId);
      const { data, error } = await query;
      if (error) throw new GraphQLError(sanitizeError(error, { userId: user.id, operation: "unknown" }));
      return (data ?? []).map(mapFlashcard);
    },
    flashcardSets: async (_: unknown, args: { subjectId?: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      let query = ctx.supabase!.from("flashcard_sets").select("*, flashcards(count)").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(100);
      if (args.subjectId) query = query.eq("subject_id", args.subjectId);
      const { data, error } = await query;
      if (error) throw new GraphQLError(sanitizeError(error, { userId: user.id, operation: "unknown" }));
      return (data ?? []).map((s) => ({
        id: s.id,
        subjectId: s.subject_id,
        name: s.name,
        cardCount: Array.isArray(s.flashcards) ? (s.flashcards[0]?.count ?? s.flashcards.length) : (s.flashcards?.count ?? 0),
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }));
    },
  },

  Mutation: {
    createFlashcard: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const parsed = CreateFlashcardInput.parse(args.input);
      const now = new Date().toISOString();
      const { data, error } = await ctx.supabase!
        .from("flashcards")
        .insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          subject_id: parsed.subjectId,
          front: parsed.front,
          back: parsed.back,
          set_id: parsed.setId ?? null,
          source_session_id: parsed.sourceSessionId ?? null,
          next_review: now,
          interval_days: 1,
          ease_factor: 2.5,
          repetitions: 0,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();
      if (error) throw new GraphQLError(sanitizeError(error, { userId: user.id, operation: "unknown" }));
      return mapFlashcard(data);
    },
    updateFlashcard: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { id, ...updates } = args.input;
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof updates.front === "string") payload.front = updates.front;
      if (typeof updates.back === "string") payload.back = updates.back;
      if ("setId" in updates) payload.set_id = updates.setId;
      const { data, error } = await ctx.supabase!
        .from("flashcards")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw new GraphQLError(sanitizeError(error, { userId: user.id, operation: "unknown" }));
      return mapFlashcard(data);
    },
    deleteFlashcard: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { error } = await ctx.supabase!.from("flashcards").delete().eq("id", args.id).eq("user_id", user.id);
      if (error) throw new GraphQLError(sanitizeError(error, { userId: user.id, operation: "unknown" }));
      return { success: true };
    },
    gradeFlashcard: async (_: unknown, args: { id: string; quality: number }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data: card, error: readError } = await ctx.supabase!
        .from("flashcards")
        .select("*")
        .eq("id", args.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (readError) throw new GraphQLError(sanitizeError(readError, { userId: user.id, operation: "unknown" }));
      if (!card) throw new GraphQLError("Card not found");
      const { nextReview, intervalDays, easeFactor, repetitions } = sm2({
        quality: args.quality,
        easeFactor: Number(card.ease_factor),
        intervalDays: card.interval_days,
        repetitions: card.repetitions,
      });
      const { data, error } = await ctx.supabase!
        .from("flashcards")
        .update({
          next_review: nextReview,
          interval_days: intervalDays,
          ease_factor: easeFactor,
          repetitions,
          updated_at: new Date().toISOString(),
        })
        .eq("id", args.id)
        .select()
        .single();
      if (error) throw new GraphQLError(sanitizeError(error, { userId: user.id, operation: "unknown" }));
      return {
        card: mapFlashcard(data),
        nextReview,
        intervalDays,
      };
    },
    createFlashcardSet: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const parsed = CreateFlashcardSetInput.parse(args.input);
      const now = new Date().toISOString();
      const { data, error } = await ctx.supabase!
        .from("flashcard_sets")
        .insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          subject_id: parsed.subjectId,
          name: parsed.name,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();
      if (error) throw new GraphQLError(sanitizeError(error, { userId: user.id, operation: "unknown" }));
      return {
        id: data.id,
        subjectId: data.subject_id,
        name: data.name,
        cardCount: 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    },
    generateFlashcards: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const parsed = GenerateFlashcardsInput.parse(normalizeGenerateFlashcardsInput(args.input));
      const prompt = buildFlashcardPrompt(parsed);
      const response = await callGroqChat({
        messages: [
          {
            role: "system",
            content:
              "You generate concise flashcards. Return ONLY valid JSON in the format { cards: [{ front, back }] } with no other prose.",
          },
          { role: "user", content: prompt },
        ],
        maxTokens: 1500,
        temperature: 0.5,
      });
      const parsedCards = safeParseCards(response);
      if (!parsedCards) {
        logger.warn("[flashcards] AI returned invalid JSON, returning empty list");
        return [];
      }
      const now = new Date().toISOString();
      const inserts = parsedCards.cards.map((c) => ({
        id: crypto.randomUUID(),
        user_id: user.id,
        subject_id: parsed.subjectId ?? "general",
        set_id: parsed.setId ?? null,
        front: c.front.trim(),
        back: c.back.trim(),
        next_review: now,
        interval_days: 1,
        ease_factor: 2.5,
        repetitions: 0,
        created_at: now,
        updated_at: now,
      }));
      if (inserts.length === 0) return [];
      const { data, error } = await ctx.supabase!.from("flashcards").insert(inserts).select();
      if (error) throw new GraphQLError(sanitizeError(error, { userId: user.id, operation: "unknown" }));
      return (data ?? []).map(mapFlashcard);
    },
  },

  Flashcard: {
    subjectId: (c: { subjectId: string }) => c.subjectId,
    sourceSessionId: (c: { sourceSessionId?: string | null }) => c.sourceSessionId ?? null,
    nextReview: (c: { nextReview: string }) => c.nextReview,
    intervalDays: (c: { intervalDays: number }) => c.intervalDays,
    easeFactor: (c: { easeFactor: number }) => c.easeFactor,
    repetitions: (c: { repetitions: number }) => c.repetitions,
    setId: (c: { setId?: string | null }) => c.setId ?? null,
    createdAt: (c: { createdAt: string }) => c.createdAt,
    updatedAt: (c: { updatedAt: string }) => c.updatedAt,
  },
};

function mapFlashcard(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    subjectId: String(row.subject_id),
    front: String(row.front ?? ""),
    back: String(row.back ?? ""),
    sourceSessionId: (row.source_session_id as string | null) ?? null,
    nextReview: String(row.next_review),
    intervalDays: Number(row.interval_days ?? 1),
    easeFactor: Number(row.ease_factor ?? 2.5),
    repetitions: Number(row.repetitions ?? 0),
    setId: (row.set_id as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

// -----------------------------------------------------------------------------
// SM-2 spaced repetition
// -----------------------------------------------------------------------------
function sm2({ quality, easeFactor, intervalDays, repetitions }: { quality: number; easeFactor: number; intervalDays: number; repetitions: number }) {
  let ef = easeFactor;
  let reps = repetitions;
  let interval = intervalDays;
  if (quality < 3) {
    reps = 0;
    interval = 1;
  } else {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(interval * ef);
    reps += 1;
  }
  ef = Math.max(1.3, ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  const nextReview = new Date(Date.now() + interval * 86_400_000).toISOString();
  return { nextReview, intervalDays: interval, easeFactor: ef, repetitions: reps };
}

function buildFlashcardPrompt(input: z.infer<typeof GenerateFlashcardsInput>): string {
  const contextLine = input.contextText
    ? `Use this source material:\n"""\n${input.contextText.slice(0, 12_000)}\n"""\n\n`
    : "";
  return `${contextLine}Generate ${input.count} high-quality flashcards on "${input.topic}". ` +
    `Each front should be a single question or cue, each back a concise answer (1-3 sentences). ` +
    `Return JSON: { cards: [{ front, back }] }`;
}

function normalizeGenerateFlashcardsInput(input: Record<string, unknown>): Record<string, unknown> {
  const contextText =
    typeof input.contextText === "string"
      ? input.contextText
      : typeof input.text === "string"
        ? input.text
        : undefined;
  const topic =
    typeof input.topic === "string" && input.topic.trim()
      ? input.topic.trim()
      : contextText
        ? "the provided material"
        : "general revision";
  const count = Number(input.count ?? input.cardCount ?? 8);

  return {
    ...input,
    topic,
    setId: typeof input.setId === "string" && input.setId.trim() ? input.setId.trim() : undefined,
    count: Number.isFinite(count) ? count : 8,
    contextText,
  };
}

function safeParseCards(raw: string): { cards: Array<{ front: string; back: string }> } | null {
  const match = raw.match(/\{[\s\S]*"cards"[\s\S]*\}/);
  if (!match) return null;
  try {
    const json = JSON.parse(match[0]);
    if (!Array.isArray(json.cards)) return null;
    return {
      cards: json.cards
        .map((card: Record<string, unknown>) => ({
          front: String(card.front ?? card.term ?? card.question ?? ""),
          back: String(card.back ?? card.definition ?? card.answer ?? ""),
        }))
        .filter((card: { front: string; back: string }) => card.front.trim() && card.back.trim()),
    };
  } catch {
    return null;
  }
}
