import { normalizeSubject, validateSubject } from "./validate-subject.js";
import { randomUUID } from "crypto";

export async function listFlashcardSets(userId: string, supabase: any, subjectId?: string) {
  let query = supabase
    .from("flashcard_sets")
    .select("id, user_id, subject_id, name, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (subjectId) query = query.eq("subject_id", subjectId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const sets = data ?? [];
  const setIds = sets.map((s: any) => s.id);
  const { data: cardCounts } = setIds.length > 0
    ? await supabase
        .from("flashcards")
        .select("set_id, id")
        .in("set_id", setIds)
        .eq("user_id", userId)
    : { data: [] };
  const countBySetId = new Map<string, number>();
  for (const card of cardCounts ?? []) {
    countBySetId.set(card.set_id, (countBySetId.get(card.set_id) ?? 0) + 1);
  }
  return sets.map((set: any) => ({ ...set, cardCount: countBySetId.get(set.id) ?? 0 }));
}

export async function createFlashcardSet(
  userId: string, supabase: any,
  args: { subjectId: string; name: string; cards: Array<{ front: string; back: string }> },
) {
  const normalizedSubjectId = normalizeSubject(args.subjectId);
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
      name: args.name,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();
  if (setError) throw new Error(`Failed to create set: ${setError.message}`);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextReview = tomorrow.toISOString();
  const cardDocs = args.cards.map((card) => ({
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
}

export async function listFlashcards(
  userId: string, supabase: any,
  opts: { setId?: string; subjectId?: string; due?: boolean; limit?: number },
) {
  const limit = opts.limit ?? 50;
  let query = supabase
    .from("flashcards")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (opts.setId) query = query.eq("set_id", opts.setId);
  if (opts.subjectId) query = query.eq("subject_id", opts.subjectId);
  if (opts.due) query = query.lte("next_review", new Date().toISOString());
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createFlashcards(
  userId: string, supabase: any,
  args: { setId: string; cards: Array<{ front: string; back: string }> },
  batchSize?: number,
) {
  const now = new Date().toISOString();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const { data: setData } = await supabase
    .from("flashcard_sets")
    .select("subject_id")
    .eq("id", args.setId)
    .eq("user_id", userId)
    .single();
  if (!setData) throw new Error("Flashcard set not found");
  const cardDocs = args.cards.map((card) => ({
    id: randomUUID(),
    user_id: userId,
    set_id: args.setId,
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
  if (batchSize && batchSize > 0) {
    for (let i = 0; i < cardDocs.length; i += batchSize) {
      const batch = cardDocs.slice(i, i + batchSize);
      const { error } = await supabase.from("flashcards").insert(batch);
      if (error) throw new Error(`Failed to insert cards: ${error.message}`);
    }
  } else {
    const { error } = await supabase.from("flashcards").insert(cardDocs);
    if (error) throw new Error(`Failed to insert cards: ${error.message}`);
  }
  return { inserted: cardDocs.length };
}

export async function deleteFlashcard(userId: string, supabase: any, flashcardId: string) {
  const { error } = await supabase
    .from("flashcards")
    .delete()
    .eq("id", flashcardId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return { deleted: true };
}

export async function deleteFlashcardSet(userId: string, supabase: any, setId: string) {
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
}

export async function updateFlashcard(
  userId: string, supabase: any, flashcardId: string,
  fields: { front?: string; back?: string },
) {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.front !== undefined) update.front = fields.front;
  if (fields.back !== undefined) update.back = fields.back;
  const { data, error } = await supabase
    .from("flashcards")
    .update(update)
    .eq("id", flashcardId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
