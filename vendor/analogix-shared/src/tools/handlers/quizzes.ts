import { normalizeSubject, validateSubject } from "./validate-subject.js";
import { randomUUID } from "crypto";

export async function listQuizzes(userId: string, supabase: any, subjectId?: string) {
  let query = supabase
    .from("quizzes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (subjectId) query = query.eq("subject_id", subjectId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const quizzes = (data ?? []) as any[];
  return quizzes.map((quiz: any) => {
    const rawQuestions = quiz.questions;
    const questions = typeof rawQuestions === "string"
      ? JSON.parse(rawQuestions)
      : (rawQuestions ?? []);
    return { ...quiz, questionCount: Array.isArray(questions) ? questions.length : 0 };
  });
}

export async function getQuiz(userId: string, supabase: any, quizId: string) {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .eq("user_id", userId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createQuiz(
  userId: string, supabase: any,
  args: { subjectId: string; title: string; difficulty?: string; questions: any[] },
) {
  const normalizedSubjectId = normalizeSubject(args.subjectId);
  const subjectError = validateSubject(normalizedSubjectId);
  if (subjectError) throw new Error(subjectError);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("quizzes")
    .insert({
      id: randomUUID(),
      user_id: userId,
      subject_id: normalizedSubjectId,
      title: args.title,
      difficulty: args.difficulty ?? "intermediate",
      questions: args.questions,
      created_at: now,
    } as any)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteQuiz(userId: string, supabase: any, quizId: string) {
  const { error } = await supabase
    .from("quizzes")
    .delete()
    .eq("id", quizId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return { deleted: true };
}

export async function getQuizAttempts(userId: string, supabase: any, quizId?: string) {
  // Embed the related quiz so consumers can aggregate by subject (the quiz is
  // the only FK to quizzes, so the nested select is unambiguous).
  let query = supabase
    .from("quiz_attempts")
    .select("*, quiz:quizzes(subject_id, title)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (quizId) query = query.eq("quiz_id", quizId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
