import {
  listDocuments,
  getDocument,
  deleteDocument,
  updateDocument,
  createDocument,
} from "@analogix/shared/tools/handlers";
import {
  listFlashcardSets,
  createFlashcardSet,
  listFlashcards,
  createFlashcards,
  deleteFlashcard,
  deleteFlashcardSet,
  updateFlashcard,
} from "@analogix/shared/tools/handlers";
import {
  listQuizzes,
  createQuiz,
  deleteQuiz,
  getQuizAttempts,
} from "@analogix/shared/tools/handlers";
import {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  listDeadlines,
  createDeadline,
} from "@analogix/shared/tools/handlers";
import { listSubjects, updateSubjectNotes } from "@analogix/shared/tools/handlers";
import { createCurriculumRetriever } from "@/lib/retrieval/curriculum";
import { randomUUID } from "crypto";

// ============================================================================
// TOOL BINDINGS
// ----------------------------------------------------------------------------
// Every binding receives `(userId, supabase)` and executes against real app
// data via the canonical @analogix/shared handlers. Read bindings wrap the
// shared CRUD handlers with search/filter conveniences; write bindings map
// straight onto the shared handlers.
// ============================================================================

export interface ToolBindings {
  userId: string;
  supabase: any;
}

const normalizeSubjectLike = (subjectId?: string) => {
  const table = subjectId?.toLowerCase() ?? "";
  if (["eng", "english", "ela"].includes(table)) return "english";
  if (["math", "maths", "mathematics"].includes(table)) return "math";
  if (table.startsWith("science")) return "science";
  return subjectId ?? undefined;
};

export const bindings: Record<string, (ctx: ToolBindings, args: any) => Promise<unknown>> = {
  // ── Reads ─────────────────────────────────────────────────────────────────
  async searchDocuments({ userId, supabase }, { query, subjectId }) {
    const docs = await listDocuments(userId, supabase, normalizeSubjectLike(subjectId));
    const q = query.toLowerCase();
    return docs
      .filter(
        (d: any) =>
          (d.title || "").toLowerCase().includes(q) ||
          (d.preview || d.content || "").toLowerCase().includes(q),
      )
      .slice(0, 10)
      .map((d: any) => ({
        id: d.id,
        title: d.title,
        subjectId: d.subject_id,
        preview: (d.preview || d.content || "").slice(0, 400),
      }));
  },

  async getDocument({ userId, supabase }, { documentId }) {
    return getDocument(userId, supabase, documentId);
  },

  async listFlashcardSets({ userId, supabase }, { subjectId }) {
    return listFlashcardSets(userId, supabase, normalizeSubjectLike(subjectId));
  },

  async listFlashcards({ userId, supabase }, { setId, subjectId, due, limit }) {
    return listFlashcards(userId, supabase, {
      setId,
      subjectId: normalizeSubjectLike(subjectId),
      due,
      limit,
    });
  },

  async listQuizzes({ userId, supabase }, { subjectId }) {
    return listQuizzes(userId, supabase, normalizeSubjectLike(subjectId));
  },

  async getQuizAttempts({ userId, supabase }, { quizId }) {
    return getQuizAttempts(userId, supabase, quizId);
  },

  async getQuizPerformance({ userId, supabase }, { subjectId, limit = 10 }) {
    const attempts = await getQuizAttempts(userId, supabase);
    const recent = attempts.slice(0, limit);
    const subjectMap = new Map<string, { attempts: number; correct: number; total: number }>();
    for (const attempt of recent) {
      const quiz = attempt.quiz;
      const subj = quiz?.subject_id ?? "unknown";
      if (subjectId && subj !== normalizeSubjectLike(subjectId)) continue;
      const entry = subjectMap.get(subj) ?? { attempts: 0, correct: 0, total: 0 };
      entry.attempts += 1;
      entry.correct += attempt.correct_answers ?? 0;
      entry.total += attempt.total_questions ?? 0;
      subjectMap.set(subj, entry);
    }
    return Array.from(subjectMap.entries()).map(([subj, e]) => ({
      subjectId: subj,
      attempts: e.attempts,
      correctAnswers: e.correct,
      totalQuestions: e.total,
      accuracy: e.total > 0 ? Math.round((e.correct / e.total) * 100) : 0,
    }));
  },

  async getWeakAreas({ userId, supabase }, { subjectId }) {
    const performance = await bindings.getQuizPerformance(
      { userId, supabase },
      { subjectId, limit: 15 },
    ) as Array<{ subjectId: string; attempts: number; accuracy: number }>;
    return performance
      .filter((p) => p.attempts > 0 && p.accuracy < 70)
      .map((p) => ({
        subjectId: p.subjectId,
        accuracy: p.accuracy,
        reason: "Performance below 70% suggests this subject needs more practice.",
      }));
  },

  async listEvents({ userId, supabase }, { from, to }) {
    return listEvents(userId, supabase, from, to);
  },

  async listDeadlines({ userId, supabase }, { from, to }) {
    return listDeadlines(userId, supabase, from, to);
  },

  async listSubjects({ userId, supabase }) {
    return listSubjects(userId, supabase);
  },

  async searchCurriculum(_ctx, { query, subject, grade }) {
    const retriever = createCurriculumRetriever();
    const results = await retriever.retrieve(query, { subject, grade }, 5);
    return retriever.formatContext(results);
  },

  async searchWorkspace({ userId, supabase }, { query, subjectId }) {
    const normalizedSubject = normalizeSubjectLike(subjectId);
    const q = query.toLowerCase();
    const [docs, sets, quizzes] = await Promise.all([
      listDocuments(userId, supabase, normalizedSubject),
      listFlashcardSets(userId, supabase, normalizedSubject),
      listQuizzes(userId, supabase, normalizedSubject),
    ]);
    return {
      documents: docs
        .filter(
          (d: any) =>
            (d.title || "").toLowerCase().includes(q) ||
            (d.preview || d.content || "").toLowerCase().includes(q),
        )
        .slice(0, 5)
        .map((d: any) => ({ id: d.id, title: d.title, subjectId: d.subject_id })),
      flashcardSets: sets
        .filter((s: any) => (s.name || "").toLowerCase().includes(q))
        .slice(0, 5)
        .map((s: any) => ({ id: s.id, name: s.name, cardCount: s.cardCount })),
      quizzes: quizzes
        .filter(
          (quiz: any) =>
            (quiz.title || "").toLowerCase().includes(q) ||
            (quiz.subject_id || "").toLowerCase().includes(q),
        )
        .slice(0, 5)
        .map((quiz: any) => ({ id: quiz.id, title: quiz.title, subjectId: quiz.subject_id })),
    };
  },

  // ── Writes ────────────────────────────────────────────────────────────────
  async createFlashcardSet({ userId, supabase }, args) {
    return createFlashcardSet(userId, supabase, args);
  },

  async addFlashcards({ userId, supabase }, args) {
    return createFlashcards(userId, supabase, args);
  },

  async updateFlashcard({ userId, supabase }, { flashcardId, front, back }) {
    return updateFlashcard(userId, supabase, flashcardId, { front, back });
  },

  async deleteFlashcard({ userId, supabase }, { flashcardId }) {
    return deleteFlashcard(userId, supabase, flashcardId);
  },

  async deleteFlashcardSet({ userId, supabase }, { setId }) {
    return deleteFlashcardSet(userId, supabase, setId);
  },

  async createQuiz({ userId, supabase }, args) {
    return createQuiz(userId, supabase, args);
  },

  async deleteQuiz({ userId, supabase }, { quizId }) {
    return deleteQuiz(userId, supabase, quizId);
  },

  async createEvent({ userId, supabase }, args) {
    return createEvent(userId, supabase, args);
  },

  async updateEvent({ userId, supabase }, { eventId, ...fields }) {
    return updateEvent(userId, supabase, eventId, fields);
  },

  async deleteEvent({ userId, supabase }, { eventId }) {
    return deleteEvent(userId, supabase, eventId);
  },

  async createDeadline({ userId, supabase }, args) {
    return createDeadline(userId, supabase, args);
  },

  async createDocument({ userId, supabase }, args) {
    return createDocument(userId, supabase, args);
  },

  async updateDocument({ userId, supabase }, { documentId, title, content }) {
    return updateDocument(userId, supabase, documentId, {
      ...(title !== undefined ? { title } : {}),
      ...(content !== undefined ? { content } : {}),
    });
  },

  async deleteDocument({ userId, supabase }, { documentId }) {
    return deleteDocument(userId, supabase, documentId);
  },

  async updateSubjectNotes({ userId, supabase }, { subjectId, notes }) {
    return updateSubjectNotes(userId, supabase, normalizeSubjectLike(subjectId)!, notes);
  },

  async storeMemory({ userId, supabase }, { content, memoryType = "fact", importance = 0.5, subjectId }) {
    const { data, error } = await supabase
      .from("ai_memory_fragments")
      .insert({
        id: randomUUID(),
        user_id: userId,
        content,
        memory_type: memoryType,
        importance,
        subject_id: normalizeSubjectLike(subjectId) ?? null,
        session_id: null,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: data?.id, stored: true };
  },
};