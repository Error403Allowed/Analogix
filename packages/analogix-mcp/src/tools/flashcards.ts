import { z } from "zod";
import { createUserClient, requireUserId } from "../auth.js";
import { randomUUID } from "crypto";
import { validateSubject, normalizeSubject } from "../valid-subjects.js";

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
      let query = supabase
        .from("flashcard_sets")
        .select("id, user_id, subject_id, name, created_at, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (subjectId) query = query.eq("subject_id", subjectId);
      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const sets = data ?? [];
      const setsWithCounts = await Promise.all(
        sets.map(async (set) => {
          const { count } = await supabase
            .from("flashcards")
            .select("*", { count: "exact", head: true })
            .eq("set_id", set.id)
            .eq("user_id", userId);
          return { ...set, cardCount: count ?? 0 };
        })
      );
      return { content: [{ type: "text", text: JSON.stringify(setsWithCounts) }] };
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
        cards: z.array(z.object({ front: z.string(), back: z.string() })),
      }).parse(args);
      const normalizedSubjectId = normalizeSubject(subjectId);
      const subjectError = validateSubject(normalizedSubjectId);
      if (subjectError) throw new Error(subjectError);
      const supabase = createUserClient(args);
      const setId = randomUUID();
      const now = new Date().toISOString();

      const { data: setData, error: setError } = await supabase
        .from("flashcard_sets")
        .insert({
          id: setId,
          user_id: userId,
          subject_id: normalizedSubjectId,
          name,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();
      if (setError) throw new Error(`Failed to create set: ${setError.message}`);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextReview = tomorrow.toISOString();

      const cardDocs = cards.map((card) => ({
        id: randomUUID(),
        user_id: userId,
        set_id: setId,
        subject_id: normalizedSubjectId,
        front: card.front.trim(),
        back: card.back.trim(),
        next_review: nextReview,
        interval_days: 1,
        ease_factor: 2.5,
        repetitions: 0,
        created_at: now,
        updated_at: now,
      }));

      const { error: cardsError } = await supabase.from("flashcards").insert(cardDocs);
      if (cardsError) throw new Error(`Failed to insert cards: ${cardsError.message}`);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ ...setData, cardCount: cardDocs.length }),
        }],
      };
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
      let query = supabase
        .from("flashcards")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (setId) query = query.eq("set_id", setId);
      if (subjectId) query = query.eq("subject_id", subjectId);
      if (due) query = query.lte("next_review", new Date().toISOString());
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data ?? []) }] };
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
            required: ["front", "back"],
          },
        },
      },
      required: ["setId", "cards"],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const { setId, cards } = z.object({
        setId: z.string(),
        cards: z.array(z.object({ front: z.string(), back: z.string() })),
      }).parse(args);
      const supabase = createUserClient(args);
      const now = new Date().toISOString();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: setData } = await supabase
        .from("flashcard_sets")
        .select("subject_id")
        .eq("id", setId)
        .eq("user_id", userId)
        .single();
      if (!setData) throw new Error("Flashcard set not found");

      const cardDocs = cards.map((card) => ({
        id: randomUUID(),
        user_id: userId,
        set_id: setId,
        subject_id: setData.subject_id,
        front: card.front.trim(),
        back: card.back.trim(),
        next_review: tomorrow.toISOString(),
        interval_days: 1,
        ease_factor: 2.5,
        repetitions: 0,
        created_at: now,
        updated_at: now,
      }));

      const { error } = await supabase.from("flashcards").insert(cardDocs);
      if (error) throw new Error(`Failed to insert cards: ${error.message}`);

      return {
        content: [{ type: "text", text: JSON.stringify({ inserted: cardDocs.length }) }],
      };
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
      const { error } = await supabase
        .from("flashcards")
        .delete()
        .eq("id", flashcardId)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify({ deleted: true }) }] };
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
      // Delete all cards in the set first
      const { error: cardsError } = await supabase
        .from("flashcards")
        .delete()
        .eq("set_id", setId)
        .eq("user_id", userId);
      if (cardsError) throw new Error(cardsError.message);
      // Delete the set itself
      const { error: setError } = await supabase
        .from("flashcard_sets")
        .delete()
        .eq("id", setId)
        .eq("user_id", userId);
      if (setError) throw new Error(setError.message);
      return { content: [{ type: "text", text: JSON.stringify({ deleted: true }) }] };
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
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (front !== undefined) update.front = front;
      if (back !== undefined) update.back = back;

      const { data, error } = await supabase
        .from("flashcards")
        .update(update)
        .eq("id", flashcardId)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
];
