import { z } from "zod";

export const CreateFlashcardInput = z.object({
  subjectId: z.string().min(1),
  front: z.string().min(1).max(2_000),
  back: z.string().min(1).max(2_000),
  setId: z.string().uuid().optional(),
  sourceSessionId: z.string().uuid().optional(),
});

export const UpdateFlashcardInput = z.object({
  id: z.string().uuid(),
  front: z.string().min(1).max(2_000).optional(),
  back: z.string().min(1).max(2_000).optional(),
  setId: z.string().uuid().nullable().optional(),
});

export const GradeFlashcardInput = z.object({
  id: z.string().uuid(),
  quality: z.number().int().min(0).max(5),
});

export const CreateFlashcardSetInput = z.object({
  subjectId: z.string().min(1),
  name: z.string().min(1).max(120),
});

export const GenerateFlashcardsInput = z.object({
  topic: z.string().min(1).max(500),
  subjectId: z.string().min(1).optional(),
  setId: z.string().uuid().optional(),
  count: z.number().int().min(1).max(50).default(8),
  documentId: z.string().optional(),
  contextText: z.string().max(50_000).optional(),
});

export type CreateFlashcardInputT = z.infer<typeof CreateFlashcardInput>;
export type UpdateFlashcardInputT = z.infer<typeof UpdateFlashcardInput>;
export type GradeFlashcardInputT = z.infer<typeof GradeFlashcardInput>;
export type CreateFlashcardSetInputT = z.infer<typeof CreateFlashcardSetInput>;
export type GenerateFlashcardsInputT = z.infer<typeof GenerateFlashcardsInput>;
