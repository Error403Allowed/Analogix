import { z } from "zod";

export const GenerateQuizInput = z.object({
  topic: z.string().min(1).max(500),
  subjectId: z.string().min(1).optional(),
  numQuestions: z.number().int().min(1).max(50).default(5),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  types: z.array(z.enum(["multiple_choice", "short_answer", "multiple_select"])).default(["multiple_choice"]),
  contextText: z.string().max(50_000).optional(),
  documentId: z.string().optional(),
});

export const GradeShortAnswerInput = z.object({
  question: z.string().min(1),
  correctAnswer: z.string().min(1),
  userAnswer: z.string().min(1).max(5_000),
  subjectId: z.string().optional(),
});

export const QuizReviewInput = z.object({
  subjectId: z.string().min(1),
  answers: z.array(z.object({
    id: z.union([z.string(), z.number()]),
    question: z.string(),
    correctAnswer: z.string(),
    userAnswer: z.string(),
    isCorrect: z.boolean(),
  })).min(1),
});

export type GenerateQuizInputT = z.infer<typeof GenerateQuizInput>;
export type GradeShortAnswerInputT = z.infer<typeof GradeShortAnswerInput>;
export type QuizReviewInputT = z.infer<typeof QuizReviewInput>;
