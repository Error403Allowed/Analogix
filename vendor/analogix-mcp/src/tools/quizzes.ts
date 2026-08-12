import { z } from "zod";
import { createUserClient, requireUserId } from "../auth.js";
import {
  listQuizzes, getQuiz, createQuiz, deleteQuiz, getQuizAttempts,
} from "@analogix/shared/tools/handlers";

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
      const data = await listQuizzes(userId, supabase, subjectId);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
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
      const data = await getQuiz(userId, supabase, quizId);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
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
        difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional().default("intermediate"),
        questions: z.array(z.record(z.string(), z.unknown())).max(50),
      }).parse(args);
      const supabase = createUserClient(args);
      const data = await createQuiz(userId, supabase, { subjectId, title, difficulty, questions });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
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
      const data = await deleteQuiz(userId, supabase, quizId);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
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
      const data = await getQuizAttempts(userId, supabase, quizId);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
];
