import { z, randomUUID, normalizeSubject, validateSubject, type ToolHandler } from "./shared.js";

export const quizzesHandlers: Record<string, ToolHandler> = {
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
};
