import { z } from "zod";
import { createUserClient, requireUserId } from "../auth.js";
import {
  listFlashcardSets, createFlashcardSet, listFlashcards, createFlashcards,
  deleteFlashcard, deleteFlashcardSet, updateFlashcard,
} from "@analogix/shared/tools/handlers";

export const flashcardTools = [
  {
    name: "list_flashcard_sets",
    description: "List flashcard sets, optionally filtered by subject",
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
      const data = await listFlashcardSets(userId, supabase, subjectId);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
  {
    name: "create_flashcard_set",
    description: "Create a new flashcard set with initial cards",
    inputSchema: {
      type: "object",
      properties: {
        subjectId: { type: "string", description: "Subject ID" },
        name: { type: "string", description: "Flashcard set name" },
        cards: {
          type: "array",
          items: {
            type: "object",
            properties: {
              front: { type: "string", description: "Front side of the card" },
              back: { type: "string", description: "Back side of the card" },
            },
            required: ["front", "back"],
          },
          description: "Array of cards to create in the set",
        },
      },
      required: ["subjectId", "name", "cards"],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const { subjectId, name, cards } = z.object({
        subjectId: z.string(),
        name: z.string(),
        cards: z.array(z.object({ front: z.string(), back: z.string() })).max(100),
      }).parse(args);
      const supabase = createUserClient(args);
      const data = await createFlashcardSet(userId, supabase, { subjectId, name, cards });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
  {
    name: "list_flashcards",
    description: "List flashcards, optionally filtered by set, subject, or due status",
    inputSchema: {
      type: "object",
      properties: {
        setId: { type: "string", description: "Optional flashcard set ID" },
        subjectId: { type: "string", description: "Optional subject ID" },
        due: { type: "boolean", description: "Only show cards due for review" },
        limit: { type: "number", description: "Maximum number of cards (default 50)" },
      },
      required: [],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const { setId, subjectId, due, limit } = z.object({
        setId: z.string().optional(),
        subjectId: z.string().optional(),
        due: z.boolean().optional(),
        limit: z.number().optional().default(50),
      }).parse(args);
      const supabase = createUserClient(args);
      const data = await listFlashcards(userId, supabase, { setId, subjectId, due, limit });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
  {
    name: "create_flashcards",
    description: "Add flashcards to an existing set",
    inputSchema: {
      type: "object",
      properties: {
        setId: { type: "string", description: "Flashcard set ID" },
        cards: {
          type: "array",
          items: {
            type: "object",
            properties: {
              front: { type: "string" },
              back: { type: "string" },
            },
          },
        },
      },
      required: ["setId", "cards"],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const { setId, cards } = z.object({
        setId: z.string(),
        cards: z.array(z.object({ front: z.string(), back: z.string() })).max(100),
      }).parse(args);
      const supabase = createUserClient(args);
      const data = await createFlashcards(userId, supabase, { setId, cards });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
  {
    name: "delete_flashcard",
    description: "Delete a single flashcard from a set",
    inputSchema: {
      type: "object",
      properties: {
        flashcardId: { type: "string", description: "Flashcard ID to delete" },
      },
      required: ["flashcardId"],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const flashcardId = z.string().parse(args.flashcardId);
      const supabase = createUserClient(args);
      const data = await deleteFlashcard(userId, supabase, flashcardId);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
  {
    name: "delete_flashcard_set",
    description: "Delete an entire flashcard set and all its cards",
    inputSchema: {
      type: "object",
      properties: {
        setId: { type: "string", description: "Flashcard set ID to delete" },
      },
      required: ["setId"],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const setId = z.string().parse(args.setId);
      const supabase = createUserClient(args);
      const data = await deleteFlashcardSet(userId, supabase, setId);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
  {
    name: "update_flashcard",
    description: "Update a single flashcard (front, back, or SM-2 review data)",
    inputSchema: {
      type: "object",
      properties: {
        flashcardId: { type: "string", description: "Flashcard ID" },
        front: { type: "string", description: "New front text" },
        back: { type: "string", description: "New back text" },
      },
      required: ["flashcardId"],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const { flashcardId, front, back } = z.object({
        flashcardId: z.string(),
        front: z.string().optional(),
        back: z.string().optional(),
      }).parse(args);
      const supabase = createUserClient(args);
      const data = await updateFlashcard(userId, supabase, flashcardId, { front, back });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
];
