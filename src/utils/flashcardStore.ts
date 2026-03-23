import { createClient } from "@/lib/supabase/client";
import { getAuthUser } from "./authCache";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FlashcardSet {
  id: string;
  subjectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Flashcard {
  id: string;
  setId: string;          // now required — every card belongs to a set
  subjectId: string;      // kept for quick filtering without joining
  front: string;
  back: string;
  sourceSessionId?: string | null;
  nextReview: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  createdAt: string;
  updatedAt: string;
}

export type FlashcardRating = 0 | 1 | 2 | 3 | 4 | 5;

// ── SM-2 spaced repetition ────────────────────────────────────────────────────

const sm2 = (
  card: Flashcard,
  rating: FlashcardRating,
): Pick<Flashcard, "intervalDays" | "easeFactor" | "repetitions" | "nextReview"> => {
  let { intervalDays, easeFactor, repetitions } = card;

  if (rating < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
    repetitions += 1;
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02),
  );

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + intervalDays);
  return { intervalDays, easeFactor, repetitions, nextReview: nextReview.toISOString() };
};

// ── Row mappers ───────────────────────────────────────────────────────────────

const toSet = (row: Record<string, unknown>): FlashcardSet => ({
  id:        row.id as string,
  subjectId: row.subject_id as string,
  name:      row.name as string,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

const toCard = (row: Record<string, unknown>): Flashcard => ({
  id:              row.id as string,
  setId:           (row.set_id as string) ?? "",
  subjectId:       row.subject_id as string,
  front:           row.front as string,
  back:            row.back as string,
  sourceSessionId: row.source_session_id as string | null,
  nextReview:      row.next_review as string,
  intervalDays:    row.interval_days as number,
  easeFactor:      row.ease_factor as number,
  repetitions:     row.repetitions as number,
  createdAt:       row.created_at as string,
  updatedAt:       row.updated_at as string,
});

// ── Store ─────────────────────────────────────────────────────────────────────

export const flashcardStore = {

  // ── Sets ──────────────────────────────────────────────────────────────────

  getSets: async (): Promise<FlashcardSet[]> => {
    const user = await getAuthUser();
    if (!user) return [];
    const supabase = createClient();
    const { data, error } = await supabase
      .from("flashcard_sets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) { console.warn("[flashcardStore] getSets failed:", error); return []; }
    return (data ?? []).map(toSet);
  },

  createSet: async (subjectId: string, name: string): Promise<FlashcardSet | null> => {
    const user = await getAuthUser();
    if (!user) return null;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("flashcard_sets")
      .insert({ user_id: user.id, subject_id: subjectId, name: name.trim() })
      .select()
      .single();
    if (error) { console.warn("[flashcardStore] createSet failed:", error); return null; }
    return toSet(data as Record<string, unknown>);
  },

  renameSet: async (setId: string, name: string): Promise<void> => {
    const user = await getAuthUser();
    if (!user) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("flashcard_sets")
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq("id", setId)
      .eq("user_id", user.id);
    if (error) console.warn("[flashcardStore] renameSet failed:", error);
  },

  deleteSet: async (setId: string): Promise<void> => {
    const user = await getAuthUser();
    if (!user) return;
    const supabase = createClient();
    // Cards cascade-delete via FK (set_id → flashcard_sets.id ON DELETE CASCADE)
    const { error } = await supabase
      .from("flashcard_sets")
      .delete()
      .eq("id", setId)
      .eq("user_id", user.id);
    if (error) console.warn("[flashcardStore] deleteSet failed:", error);
  },

  // ── Cards ─────────────────────────────────────────────────────────────────

  getAll: async (): Promise<Flashcard[]> => {
    const user = await getAuthUser();
    if (!user) return [];
    const supabase = createClient();
    const { data, error } = await supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) { console.warn("[flashcardStore] getAll failed:", error); return []; }
    return (data ?? []).map(toCard);
  },

  getBySet: async (setId: string): Promise<Flashcard[]> => {
    const user = await getAuthUser();
    if (!user) return [];
    const supabase = createClient();
    const { data, error } = await supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", user.id)
      .eq("set_id", setId)
      .order("created_at", { ascending: false });
    if (error) { console.warn("[flashcardStore] getBySet failed:", error); return []; }
    return (data ?? []).map(toCard);
  },

  getDue: async (): Promise<Flashcard[]> => {
    const all = await flashcardStore.getAll();
    const now = new Date().toISOString();
    return all.filter(c => c.nextReview <= now);
  },

  add: async (
    cards: Omit<Flashcard, "id" | "createdAt" | "updatedAt" | "nextReview" | "intervalDays" | "easeFactor" | "repetitions">[],
  ): Promise<Flashcard[]> => {
    const user = await getAuthUser();
    if (!user) return [];
    const supabase = createClient();

    const now = new Date().toISOString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const newCards: Flashcard[] = cards.map(c => ({
      ...c,
      id: crypto.randomUUID(),
      nextReview: tomorrow.toISOString(),
      intervalDays: 1,
      easeFactor: 2.5,
      repetitions: 0,
      createdAt: now,
      updatedAt: now,
    }));

    const { error } = await supabase.from("flashcards").insert(
      newCards.map(c => ({
        id: c.id,
        user_id: user.id,
        set_id: c.setId || null,
        subject_id: c.subjectId,
        front: c.front,
        back: c.back,
        source_session_id: c.sourceSessionId || null,
        next_review: c.nextReview,
        interval_days: c.intervalDays,
        ease_factor: c.easeFactor,
        repetitions: c.repetitions,
      })),
    );
    if (error) console.warn("[flashcardStore] add failed:", error);
    return newCards;
  },

  review: async (cardId: string, rating: FlashcardRating): Promise<void> => {
    const user = await getAuthUser();
    if (!user) return;
    const supabase = createClient();
    const all = await flashcardStore.getAll();
    const card = all.find(c => c.id === cardId);
    if (!card) return;
    const updates = sm2(card, rating);
    const { error } = await supabase.from("flashcards").update({
      next_review: updates.nextReview,
      interval_days: updates.intervalDays,
      ease_factor: updates.easeFactor,
      repetitions: updates.repetitions,
      updated_at: new Date().toISOString(),
    }).eq("id", cardId).eq("user_id", user.id);
    if (error) console.warn("[flashcardStore] review failed:", error);
  },

  update: async (cardId: string, changes: { front?: string; back?: string }): Promise<void> => {
    const user = await getAuthUser();
    if (!user) return;
    const supabase = createClient();
    const { error } = await supabase.from("flashcards").update({
      ...changes,
      updated_at: new Date().toISOString(),
    }).eq("id", cardId).eq("user_id", user.id);
    if (error) console.warn("[flashcardStore] update failed:", error);
  },

  delete: async (cardId: string): Promise<void> => {
    const user = await getAuthUser();
    if (!user) return;
    const supabase = createClient();
    const { error } = await supabase.from("flashcards").delete()
      .eq("id", cardId).eq("user_id", user.id);
    if (error) console.warn("[flashcardStore] delete failed:", error);
  },
};
