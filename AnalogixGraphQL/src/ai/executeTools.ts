import { z } from "zod";
import { randomUUID } from "crypto";
import { GraphQLError } from "graphql";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolCall, ToolResult, ToolExecutionResult } from "@analogix/shared/types";
import type { GraphQLContext } from "../context.js";

// ── Subject validation & normalisation (mirrors packages/analogix-mcp/src/valid-subjects.ts) ──

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

// ── Handler type ──

type ToolHandler = (
  args: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient,
) => Promise<unknown>;

// ── Tool handlers ──

const handlers: Record<string, ToolHandler> = {

  // ── SUBJECTS ──

  async list_subjects(_args, userId, supabase) {
    const { data, error } = await supabase
      .from("subject_data")
      .select("subject_id, marks, notes")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async get_subject(args, userId, supabase) {
    const subjectId = z.string().parse(args.subjectId);
    const { data, error } = await supabase
      .from("subject_data")
      .select("subject_id, marks, notes")
      .eq("user_id", userId)
      .eq("subject_id", subjectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? { subject_id: subjectId, marks: [], notes: {} };
  },

  async update_subject_notes(args, userId, supabase) {
    const { subjectId, content, title } = z.object({
      subjectId: z.string(),
      content: z.string(),
      title: z.string().optional(),
    }).parse(args);
    const normalizedSubjectId = normalizeSubject(subjectId);
    const { data: existing } = await supabase
      .from("subject_data")
      .select("notes")
      .eq("user_id", userId)
      .eq("subject_id", normalizedSubjectId)
      .maybeSingle();
    const existingNotes = (existing?.notes as Record<string, unknown>) ?? {};
    const { data, error } = await supabase
      .from("subject_data")
      .upsert({
        user_id: userId,
        subject_id: normalizedSubjectId,
        notes: {
          ...existingNotes,
          content,
          title: title ?? (existingNotes.title as string),
          lastUpdated: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,subject_id" })
      .select("subject_id, notes")
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  // ── DOCUMENTS ──

  async list_documents(args, userId, supabase) {
    const subjectId = args.subjectId as string | undefined;
    let query = supabase
      .from("documents")
      .select("*")
      .eq("owner_user_id", userId)
      .order("updated_at", { ascending: false });
    if (subjectId) query = query.eq("subject_id", subjectId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async create_document(args, userId, supabase) {
    const { subjectId, title, content, contentFormat, role } = z.object({
      subjectId: z.string(),
      title: z.string(),
      content: z.string(),
      contentFormat: z.string().optional(),
      role: z.string().optional(),
    }).parse(args);
    const normalizedSubjectId = normalizeSubject(subjectId);
    const subjectError = validateSubject(normalizedSubjectId);
    if (subjectError) throw new Error(subjectError);
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("documents")
      .insert({
        id: randomUUID(),
        owner_user_id: userId,
        subject_id: normalizedSubjectId,
        title,
        content,
        content_text: content.replace(/<[^>]*>/g, ""),
        content_format: contentFormat ?? "html",
        role: role ?? "notes",
        updated_at: now,
        created_at: now,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async get_document(args, userId, supabase) {
    const documentId = z.string().parse(args.documentId);
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("owner_user_id", userId)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async delete_document(args, userId, supabase) {
    const documentId = z.string().parse(args.documentId);
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId)
      .eq("owner_user_id", userId);
    if (error) throw new Error(error.message);
    return { deleted: true };
  },

  async update_document(args, userId, supabase) {
    const { documentId, title, content, contentFormat } = z.object({
      documentId: z.string(),
      title: z.string().optional(),
      content: z.string().optional(),
      contentFormat: z.string().optional(),
    }).parse(args);
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) update.title = title;
    if (content !== undefined) {
      update.content = content;
      update.content_text = content.replace(/<[^>]*>/g, "");
    }
    if (contentFormat !== undefined) update.content_format = contentFormat;
    const { data, error } = await supabase
      .from("documents")
      .update(update)
      .eq("id", documentId)
      .eq("owner_user_id", userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  // ── FLASHCARDS ──

  async list_flashcard_sets(args, userId, supabase) {
    const subjectId = args.subjectId as string | undefined;
    let query = supabase
      .from("flashcard_sets")
      .select("id, user_id, subject_id, name, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (subjectId) query = query.eq("subject_id", subjectId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const sets = data ?? [];
    const setsWithCounts = await Promise.all(
      sets.map(async (set) => {
        const { count } = await supabase
          .from("flashcards")
          .select("*", { count: "exact", head: true })
          .eq("set_id", set.id)
          .eq("user_id", userId);
        return { ...set, cardCount: count ?? 0 };
      })
    );
    return setsWithCounts;
  },

  async create_flashcard_set(args, userId, supabase) {
    const { subjectId, name, cards } = z.object({
      subjectId: z.string(),
      name: z.string(),
      cards: z.array(z.object({ front: z.string(), back: z.string() })),
    }).parse(args);
    const normalizedSubjectId = normalizeSubject(subjectId);
    const subjectError = validateSubject(normalizedSubjectId);
    if (subjectError) throw new Error(subjectError);
    const setId = randomUUID();
    const now = new Date().toISOString();
    const { data: setData, error: setError } = await supabase
      .from("flashcard_sets")
      .insert({
        id: setId,
        user_id: userId,
        subject_id: normalizedSubjectId,
        name,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();
    if (setError) throw new Error(`Failed to create set: ${setError.message}`);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextReview = tomorrow.toISOString();
    const cardDocs = cards.map((card) => ({
      id: randomUUID(),
      user_id: userId,
      set_id: setId,
      subject_id: normalizedSubjectId,
      front: card.front.trim(),
      back: card.back.trim(),
      next_review: nextReview,
      interval_days: 1,
      ease_factor: 2.5,
      repetitions: 0,
      created_at: now,
      updated_at: now,
    }));
    const { error: cardsError } = await supabase.from("flashcards").insert(cardDocs);
    if (cardsError) throw new Error(`Failed to insert cards: ${cardsError.message}`);
    return { ...setData, cardCount: cardDocs.length };
  },

  async list_flashcards(args, userId, supabase) {
    const { setId, subjectId, due, limit } = z.object({
      setId: z.string().optional(),
      subjectId: z.string().optional(),
      due: z.boolean().optional(),
      limit: z.number().optional().default(50),
    }).parse(args);
    let query = supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (setId) query = query.eq("set_id", setId);
    if (subjectId) query = query.eq("subject_id", subjectId);
    if (due) query = query.lte("next_review", new Date().toISOString());
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async create_flashcards(args, userId, supabase) {
    const { setId, cards } = z.object({
      setId: z.string(),
      cards: z.array(z.object({ front: z.string(), back: z.string() })),
    }).parse(args);
    const now = new Date().toISOString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { data: setData } = await supabase
      .from("flashcard_sets")
      .select("subject_id")
      .eq("id", setId)
      .eq("user_id", userId)
      .single();
    if (!setData) throw new Error("Flashcard set not found");
    const cardDocs = cards.map((card) => ({
      id: randomUUID(),
      user_id: userId,
      set_id: setId,
      subject_id: setData.subject_id,
      front: card.front.trim(),
      back: card.back.trim(),
      next_review: tomorrow.toISOString(),
      interval_days: 1,
      ease_factor: 2.5,
      repetitions: 0,
      created_at: now,
      updated_at: now,
    }));
    const { error } = await supabase.from("flashcards").insert(cardDocs);
    if (error) throw new Error(`Failed to insert cards: ${error.message}`);
    return { inserted: cardDocs.length };
  },

  async delete_flashcard(args, userId, supabase) {
    const flashcardId = z.string().parse(args.flashcardId);
    const { error } = await supabase
      .from("flashcards")
      .delete()
      .eq("id", flashcardId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { deleted: true };
  },

  async delete_flashcard_set(args, userId, supabase) {
    const setId = z.string().parse(args.setId);
    const { error: cardsError } = await supabase
      .from("flashcards")
      .delete()
      .eq("set_id", setId)
      .eq("user_id", userId);
    if (cardsError) throw new Error(cardsError.message);
    const { error: setError } = await supabase
      .from("flashcard_sets")
      .delete()
      .eq("id", setId)
      .eq("user_id", userId);
    if (setError) throw new Error(setError.message);
    return { deleted: true };
  },

  async update_flashcard(args, userId, supabase) {
    const { flashcardId, front, back } = z.object({
      flashcardId: z.string(),
      front: z.string().optional(),
      back: z.string().optional(),
    }).parse(args);
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (front !== undefined) update.front = front;
    if (back !== undefined) update.back = back;
    const { data, error } = await supabase
      .from("flashcards")
      .update(update)
      .eq("id", flashcardId)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  // ── QUIZZES ──

  async list_quizzes(args, userId, supabase) {
    const subjectId = args.subjectId as string | undefined;
    let query = supabase
      .from("quizzes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (subjectId) query = query.eq("subject_id", subjectId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const quizzes = (data ?? []) as any[];
    return quizzes.map((quiz) => {
      const rawQuestions = (quiz as any).questions;
      const questions = typeof rawQuestions === "string"
        ? JSON.parse(rawQuestions)
        : (rawQuestions ?? []);
      return { ...quiz, questionCount: Array.isArray(questions) ? questions.length : 0 };
    });
  },

  async get_quiz(args, userId, supabase) {
    const quizId = z.string().parse(args.quizId);
    const { data, error } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", quizId)
      .eq("user_id", userId)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async create_quiz(args, userId, supabase) {
    const { subjectId, title, difficulty, questions } = z.object({
      subjectId: z.string(),
      title: z.string(),
      difficulty: z.string().optional().default("intermediate"),
      questions: z.array(z.record(z.unknown())),
    }).parse(args);
    const normalizedSubjectId = normalizeSubject(subjectId);
    const subjectError = validateSubject(normalizedSubjectId);
    if (subjectError) throw new Error(subjectError);
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("quizzes")
      .insert({
        id: randomUUID(),
        user_id: userId,
        subject_id: normalizedSubjectId,
        title,
        difficulty,
        questions,
        created_at: now,
      } as any)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async delete_quiz(args, userId, supabase) {
    const quizId = z.string().parse(args.quizId);
    const { error } = await supabase
      .from("quizzes")
      .delete()
      .eq("id", quizId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { deleted: true };
  },

  async get_quiz_attempts(args, userId, supabase) {
    const quizId = args.quizId as string | undefined;
    let query = supabase
      .from("quiz_attempts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (quizId) query = query.eq("quiz_id", quizId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  // ── CALENDAR ──

  async list_events(args, userId, supabase) {
    const { from, to } = z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }).parse(args);
    let query = supabase
      .from("events")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: true });
    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async create_event(args, userId, supabase) {
    const { title, date, endDate, type, subject, color, description } = z.object({
      title: z.string(),
      date: z.string(),
      endDate: z.string().optional(),
      type: z.string().optional().default("other"),
      subject: z.string().optional(),
      color: z.string().optional(),
      description: z.string().optional(),
    }).parse(args);
    const subjectError = validateOptionalSubject(subject);
    if (subjectError) throw new Error(subjectError);
    const normalizedSubject = subject ? normalizeSubject(subject) : null;
    const { data, error } = await supabase
      .from("events")
      .insert({
        id: randomUUID(),
        user_id: userId,
        title,
        date,
        end_date: endDate ?? null,
        type,
        subject: normalizedSubject,
        color: color ?? null,
        description: description ?? null,
        source: "manual",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async update_event(args, userId, supabase) {
    const { eventId, ...fields } = z.object({
      eventId: z.string(),
      title: z.string().optional(),
      date: z.string().optional(),
      endDate: z.string().optional(),
      type: z.string().optional(),
      subject: z.string().optional(),
      color: z.string().optional(),
      description: z.string().optional(),
    }).parse(args);
    const normalizedSubjectField = fields.subject ? normalizeSubject(fields.subject) : undefined;
    const subjectError = validateOptionalSubject(normalizedSubjectField);
    if (subjectError) throw new Error(subjectError);
    const update: Record<string, unknown> = {};
    if (fields.title !== undefined) update.title = fields.title;
    if (fields.date !== undefined) update.date = fields.date;
    if (fields.endDate !== undefined) update.end_date = fields.endDate;
    if (fields.type !== undefined) update.type = fields.type;
    if (normalizedSubjectField !== undefined) update.subject = normalizedSubjectField;
    if (fields.color !== undefined) update.color = fields.color;
    if (fields.description !== undefined) update.description = fields.description;
    const { data, error } = await supabase
      .from("events")
      .update(update)
      .eq("id", eventId)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async delete_event(args, userId, supabase) {
    const eventId = z.string().parse(args.eventId);
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { deleted: true };
  },

  async list_deadlines(_args, userId, supabase) {
    const { data, error } = await supabase
      .from("deadlines")
      .select("*")
      .eq("user_id", userId)
      .order("due_date", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async create_deadline(args, userId, supabase) {
    const { title, dueDate, subject, priority } = z.object({
      title: z.string(),
      dueDate: z.string(),
      subject: z.string().optional(),
      priority: z.string().optional().default("medium"),
    }).parse(args);
    const subjectError = validateOptionalSubject(subject);
    if (subjectError) throw new Error(subjectError);
    const normalizedSubject = subject ? normalizeSubject(subject) : null;
    const { data, error } = await supabase
      .from("deadlines")
      .insert({
        id: randomUUID(),
        user_id: userId,
        title,
        due_date: dueDate,
        subject: normalizedSubject,
        priority,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
};

// ── Public API ──

export async function executeTools(
  tools: ToolCall[],
  ctx: GraphQLContext,
): Promise<ToolExecutionResult> {
  if (!ctx.user || !ctx.supabase) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED", http: { status: 401 } },
    });
  }
  const userId = ctx.user.id;
  const supabase = ctx.supabase;

  const results: ToolResult[] = [];

  for (const tool of tools) {
    try {
      const handler = handlers[tool.name];
      if (!handler) throw new Error(`Unknown tool: ${tool.name}`);
      const data = await handler(tool.args, userId, supabase);
      results.push({ toolName: tool.name, success: true, data });
    } catch (err) {
      results.push({
        toolName: tool.name,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return { results };
}
