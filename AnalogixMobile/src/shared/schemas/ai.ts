import { z } from "zod";

export const StudyScheduleInput = z.object({
  subjectId: z.string().min(1).optional(),
  days: z.number().int().min(1).max(60).default(14),
  events: z.array(z.object({
    title: z.string(),
    date: z.string(),
    type: z.string().optional(),
  })).default([]),
});

export const AssessmentGuideInput = z.object({
  text: z.string().min(50).max(50_000),
  subjectId: z.string().optional(),
});

export const ReexplainInput = z.object({
  text: z.string().min(1).max(20_000),
  subjectId: z.string().optional(),
  style: z.enum(["simpler", "deeper", "analogy", "example", "step-by-step"]).default("simpler"),
});

export const ExtractTextInput = z.object({
  url: z.string().url().optional(),
  base64: z.string().optional(),
  mimeType: z.string().min(1),
  fileName: z.string().optional(),
});

export const TutorInput = z.object({
  question: z.string().min(1).max(10_000),
  subjectId: z.string().min(1).optional(),
  contextText: z.string().max(50_000).optional(),
});

export const SearchResearchInput = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(50).default(10),
  yearFrom: z.number().int().optional(),
  yearTo: z.number().int().optional(),
  openAccessOnly: z.boolean().default(false),
});

export const SpeakInput = z.object({
  text: z.string().min(1).max(20_000),
  voice: z.string().optional(),
  rate: z.number().min(0.1).max(10).default(1),
});

export type StudyScheduleInputT = z.infer<typeof StudyScheduleInput>;
export type AssessmentGuideInputT = z.infer<typeof AssessmentGuideInput>;
export type ReexplainInputT = z.infer<typeof ReexplainInput>;
export type ExtractTextInputT = z.infer<typeof ExtractTextInput>;
export type TutorInputT = z.infer<typeof TutorInput>;
export type SearchResearchInputT = z.infer<typeof SearchResearchInput>;
export type SpeakInputT = z.infer<typeof SpeakInput>;
