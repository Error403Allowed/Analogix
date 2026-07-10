import { z, randomUUID, normalizeSubject, validateSubject, type ToolHandler } from "./shared.js";

export const flashcardsHandlers: Record<string, ToolHandler> = {
  async list_flashcard_sets(args, userId, supabase) {
    const subjectId = args.subjectId as string | undefined;
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
    return setsWithCounts;
  },

  async create_flashcard_set(args, userId, supabase) {
    const { subjectId, name, cards } = z.object({
      subjectId: z.string(),
      name: z.string(),
      cards: z.array(z.object({ front: z.string(), back: z.string() })),
    }).parse(args);
    const normalizedSubjectId = normalizeSubject(subjectId);
    const subjectError = validateSubject(normalizedSubjectId);
    if (subjectError) throw new Error(subjectError);
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
    return { ...setData, cardCount: cardDocs.length };
  },

  async list_flashcards(args, userId, supabase) {
    const { setId, subjectId, due, limit } = z.object({
      setId: z.string().optional(),
      subjectId: z.string().optional(),
      due: z.boolean().optional(),
      limit: z.number().optional().default(50),
    }).parse(args);
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
    return data ?? [];
  },

  async create_flashcards(args, userId, supabase) {
    const { setId, cards } = z.object({
      setId: z.string(),
      cards: z.array(z.object({ front: z.string(), back: z.string() })),
    }).parse(args);
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
    return { inserted: cardDocs.length };
  },

  async delete_flashcard(args, userId, supabase) {
    const flashcardId = z.string().parse(args.flashcardId);
    const { error } = await supabase
      .from("flashcards")
      .delete()
      .eq("id", flashcardId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { deleted: true };
  },

  async delete_flashcard_set(args, userId, supabase) {
    const setId = z.string().parse(args.setId);
    const { error: cardsError } = await supabase
      .from("flashcards")
      .delete()
      .eq("set_id", setId)
      .eq("user_id", userId);
    if (cardsError) throw new Error(cardsError.message);
    const { error: setError } = await supabase
      .from("flashcard_sets")
      .delete()
      .eq("id", setId)
      .eq("user_id", userId);
    if (setError) throw new Error(setError.message);
    return { deleted: true };
  },

  async update_flashcard(args, userId, supabase) {
    const { flashcardId, front, back } = z.object({
      flashcardId: z.string(),
      front: z.string().optional(),
      back: z.string().optional(),
    }).parse(args);
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
    return data;
  },
};
