import { z } from "zod";
import { createUserClient, requireUserId } from "../auth.js";
import { randomUUID } from "crypto";
import { validateSubject, normalizeSubject } from "../valid-subjects.js";

export const quizTools = [
  {
    name: "list_quizzes",
    description: "List quizzes, optionally filtered by subject",
    inputSchema: {
      type: "object",
      properties: {
        subjectId: { type: "string", description: "Optional subject ID to filter by" },
      },
      required: [],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const subjectId = args.subjectId as string | undefined;
      const supabase = createUserClient(args);
      let query = supabase
        .from("quizzes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (subjectId) query = query.eq("subject_id", subjectId);
      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const quizzes = (data ?? []) as any[];
      const withCounts = (quizzes as any[]).map((quiz) => {
        const rawQuestions = (quiz as any).questions;
        const questions = typeof rawQuestions === "string"
          ? JSON.parse(rawQuestions)
          : (rawQuestions ?? []);
        return { ...quiz, questionCount: Array.isArray(questions) ? questions.length : 0 };
      });
      return { content: [{ type: "text", text: JSON.stringify(withCounts) }] };
    },
  },
  {
    name: "get_quiz",
    description: "Get a specific quiz by ID with all questions and answers",
    inputSchema: {
      type: "object",
      properties: {
        quizId: { type: "string", description: "Quiz ID" },
      },
      required: ["quizId"],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const quizId = z.string().parse(args.quizId);
      const supabase = createUserClient(args);
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", quizId)
        .eq("user_id", userId)
        .single();
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data as any) }] };
    },
  },
  {
    name: "create_quiz",
    description: "Create a new quiz with questions",
    inputSchema: {
      type: "object",
      properties: {
        subjectId: { type: "string", description: "Subject ID" },
        title: { type: "string", description: "Quiz title" },
        difficulty: { type: "string", description: "Difficulty level: 'beginner', 'intermediate', or 'advanced'" },
        questions: {
          type: "array",
          description: "Array of question objects",
          items: {
            type: "object",
            properties: {
              type: { type: "string", description: "Question type: 'multiple-choice', 'short-answer', or 'true-false'" },
              question: { type: "string", description: "The question text" },
              options: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    text: { type: "string" },
                    isCorrect: { type: "boolean" },
                  },
                },
                description: "Answer options (for multiple-choice)",
              },
              correctAnswer: { type: "string", description: "Correct answer (for short-answer)" },
              explanation: { type: "string", description: "Explanation of the answer" },
            },
            required: ["type", "question"],
          },
        },
      },
      required: ["subjectId", "title", "questions"],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const { subjectId, title, difficulty, questions } = z.object({
        subjectId: z.string(),
        title: z.string(),
        difficulty: z.string().optional().default("intermediate"),
        questions: z.array(z.record(z.string(), z.unknown())),
      }).parse(args);
      const normalizedSubjectId = normalizeSubject(subjectId);
      const subjectError = validateSubject(normalizedSubjectId);
      if (subjectError) throw new Error(subjectError);
      const supabase = createUserClient(args);
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
      return { content: [{ type: "text", text: JSON.stringify(data as any) }] };
    },
  },
  {
    name: "delete_quiz",
    description: "Delete a quiz by ID",
    inputSchema: {
      type: "object",
      properties: {
        quizId: { type: "string", description: "Quiz ID to delete" },
      },
      required: ["quizId"],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const quizId = z.string().parse(args.quizId);
      const supabase = createUserClient(args);
      const { error } = await supabase
        .from("quizzes")
        .delete()
        .eq("id", quizId)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify({ deleted: true }) }] };
    },
  },
  {
    name: "get_quiz_attempts",
    description: "Get quiz attempt history, optionally filtered by quiz",
    inputSchema: {
      type: "object",
      properties: {
        quizId: { type: "string", description: "Optional quiz ID to filter by" },
      },
      required: [],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const quizId = args.quizId as string | undefined;
      const supabase = createUserClient(args);
      let query = supabase
        .from("quiz_attempts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (quizId) query = query.eq("quiz_id", quizId);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data ?? []) }] };
    },
  },
];
