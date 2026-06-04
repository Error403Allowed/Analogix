import { z } from "zod";

export const CreateSubjectInput = z.object({
  subjectId: z.string().min(1).max(100),
  marks: z.array(z.object({
    title: z.string().min(1).max(200),
    score: z.number().min(0),
    total: z.number().min(1),
    date: z.string(),
  })).default([]),
});

export const UpdateNotesInput = z.object({
  subjectId: z.string().min(1),
  content: z.string().max(1_000_000),
  title: z.string().max(500).optional(),
});

export const AddMarkInput = z.object({
  subjectId: z.string().min(1),
  title: z.string().min(1).max(200),
  score: z.number().min(0),
  total: z.number().min(1),
  date: z.string(),
});

export const CreateDocumentInput = z.object({
  subjectId: z.string().min(1),
  title: z.string().min(1).max(500),
  content: z.string().optional(),
  role: z.enum(["notes", "study-guide", "shared"]).default("notes"),
  icon: z.string().nullable().optional(),
  cover: z.string().nullable().optional(),
});

export const UpdateDocumentInput = z.object({
  documentId: z.string().uuid(),
  subjectId: z.string().min(1),
  title: z.string().min(1).max(500).optional(),
  content: z.string().max(10_000_000).optional(),
  contentJson: z.string().optional(),
  contentText: z.string().optional(),
  contentFormat: z.string().optional(),
  role: z.enum(["notes", "study-guide", "shared"]).optional(),
  icon: z.string().nullable().optional(),
  cover: z.string().nullable().optional(),
});

export type CreateSubjectInputT = z.infer<typeof CreateSubjectInput>;
export type UpdateNotesInputT = z.infer<typeof UpdateNotesInput>;
export type AddMarkInputT = z.infer<typeof AddMarkInput>;
export type CreateDocumentInputT = z.infer<typeof CreateDocumentInput>;
export type UpdateDocumentInputT = z.infer<typeof UpdateDocumentInput>;
