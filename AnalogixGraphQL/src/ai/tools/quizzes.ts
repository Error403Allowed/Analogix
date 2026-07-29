import { z, type ToolHandler } from "./shared.js";
import {
  listQuizzes, getQuiz, createQuiz, deleteQuiz, getQuizAttempts,
} from "@analogix/shared/tools/handlers";

export const quizzesHandlers: Record<string, ToolHandler> = {
  async list_quizzes(args, userId, supabase) {
    const subjectId = args.subjectId as string | undefined;
    return await listQuizzes(userId, supabase, subjectId);
  },

  async get_quiz(args, userId, supabase) {
    const quizId = z.string().parse(args.quizId);
    return await getQuiz(userId, supabase, quizId);
  },

  async create_quiz(args, userId, supabase) {
    const { subjectId, title, difficulty, questions } = z.object({
      subjectId: z.string(),
      title: z.string(),
      difficulty: z.string().optional().default("intermediate"),
      questions: z.array(z.record(z.string(), z.unknown())),
    }).parse(args);
    return await createQuiz(userId, supabase, { subjectId, title, difficulty, questions });
  },

  async delete_quiz(args, userId, supabase) {
    const quizId = z.string().parse(args.quizId);
    return await deleteQuiz(userId, supabase, quizId);
  },

  async get_quiz_attempts(args, userId, supabase) {
    const quizId = args.quizId as string | undefined;
    return await getQuizAttempts(userId, supabase, quizId);
  },
};
