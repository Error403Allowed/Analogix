import { z, type ToolHandler } from "./shared.js";
import {
  listFlashcardSets, createFlashcardSet, listFlashcards, createFlashcards,
  deleteFlashcard, deleteFlashcardSet, updateFlashcard,
} from "@analogix/shared/tools/handlers";

export const flashcardsHandlers: Record<string, ToolHandler> = {
  async list_flashcard_sets(args, userId, supabase) {
    const subjectId = args.subjectId as string | undefined;
    return await listFlashcardSets(userId, supabase, subjectId);
  },

  async create_flashcard_set(args, userId, supabase) {
    const { subjectId, name, cards } = z.object({
      subjectId: z.string(),
      name: z.string(),
      cards: z.array(z.object({ front: z.string(), back: z.string() })),
    }).parse(args);
    return await createFlashcardSet(userId, supabase, { subjectId, name, cards });
  },

  async list_flashcards(args, userId, supabase) {
    const { setId, subjectId, due, limit } = z.object({
      setId: z.string().optional(),
      subjectId: z.string().optional(),
      due: z.boolean().optional(),
      limit: z.number().optional().default(50),
    }).parse(args);
    return await listFlashcards(userId, supabase, { setId, subjectId, due, limit });
  },

  async create_flashcards(args, userId, supabase) {
    const { setId, cards } = z.object({
      setId: z.string(),
      cards: z.array(z.object({ front: z.string(), back: z.string() })),
    }).parse(args);
    return await createFlashcards(userId, supabase, { setId, cards });
  },

  async delete_flashcard(args, userId, supabase) {
    const flashcardId = z.string().parse(args.flashcardId);
    return await deleteFlashcard(userId, supabase, flashcardId);
  },

  async delete_flashcard_set(args, userId, supabase) {
    const setId = z.string().parse(args.setId);
    return await deleteFlashcardSet(userId, supabase, setId);
  },

  async update_flashcard(args, userId, supabase) {
    const { flashcardId, front, back } = z.object({
      flashcardId: z.string(),
      front: z.string().optional(),
      back: z.string().optional(),
    }).parse(args);
    return await updateFlashcard(userId, supabase, flashcardId, { front, back });
  },
};
