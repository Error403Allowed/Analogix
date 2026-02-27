import { createClient } from "@/lib/supabase/client";

export interface Flashcard {
  id: string;
  subjectId: string;
  front: string;   // Question / term
  back: string;    // Answer / explanation
  sourceSessionId?: string | null;
  nextReview: string;  // ISO date string
  intervalDays: number;
  easeFactor: number;  // SM-2 ease factor (starts at 2.5)
  repetitions: number;
  createdAt: string;
  updatedAt: string;
}

export type FlashcardRating = 0 | 1 | 2 | 3 | 4 | 5;
// 0 = complete blackout, 3 = correct with difficulty, 5 = perfect

const LOCAL_KEY = "analogix_flashcards_v1";

// SM-2 spaced repetition algorithm
const sm2 = (card: Flashcard, rating: FlashcardRating): Pick<Flashcard, "intervalDays" | "easeFactor" | "repetitions" | "nextReview"> => {
  let { intervalDays, easeFactor, repetitions } = card;

  if (rating < 3) {
    // Failed recall — reset
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
    repetitions += 1;
  }

  // Update ease factor
  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + intervalDays);

  return {
    intervalDays,
    easeFactor,
    repetitions,
    nextReview: nextReview.toISOString(),
  };
};

export const flashcardStore = {
  /** Get all flashcards for the current user */
  getAll: async (): Promise<Flashcard[]> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("flashcards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        return data.map((row: Record<string, unknown>) => ({
          id: row.id as string,
          subjectId: row.subject_id as string,
          front: row.front as string,
          back: row.back as string,
          sourceSessionId: row.source_session_id as string | null,
          nextReview: row.next_review as string,
          intervalDays: row.interval_days as number,
          easeFactor: row.ease_factor as number,
          repetitions: row.repetitions as number,
          createdAt: row.created_at as string,
          updatedAt: row.updated_at as string,
        }));
      }
    }

    // Local fallback
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    } catch { return []; }
  },

  /** Get cards due for review today */
  getDue: async (): Promise<Flashcard[]> => {
    const all = await flashcardStore.getAll();
    const now = new Date().toISOString();
    return all.filter(c => c.nextReview <= now);
  },

  /** Add one or more flashcards */
  add: async (cards: Omit<Flashcard, "id" | "createdAt" | "updatedAt" | "nextReview" | "intervalDays" | "easeFactor" | "repetitions">[]): Promise<Flashcard[]> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
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

    if (user) {
      await supabase.from("flashcards").insert(
        newCards.map(c => ({
          id: c.id,
          user_id: user.id,
          subject_id: c.subjectId,
          front: c.front,
          back: c.back,
          source_session_id: c.sourceSessionId || null,
          next_review: c.nextReview,
          interval_days: c.intervalDays,
          ease_factor: c.easeFactor,
          repetitions: c.repetitions,
        }))
      );
    } else {
      // Local fallback
      try {
        const existing: Flashcard[] = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
        localStorage.setItem(LOCAL_KEY, JSON.stringify([...newCards, ...existing]));
      } catch {}
    }

    return newCards;
  },

  /** Record a review result and update the card's SM-2 data */
  review: async (cardId: string, rating: FlashcardRating): Promise<void> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const all = await flashcardStore.getAll();
    const card = all.find(c => c.id === cardId);
    if (!card) return;

    const updates = sm2(card, rating);

    if (user) {
      await supabase.from("flashcards").update({
        next_review: updates.nextReview,
        interval_days: updates.intervalDays,
        ease_factor: updates.easeFactor,
        repetitions: updates.repetitions,
        updated_at: new Date().toISOString(),
      }).eq("id", cardId).eq("user_id", user.id);
    } else {
      try {
        const existing: Flashcard[] = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
        localStorage.setItem(LOCAL_KEY, JSON.stringify(
          existing.map(c => c.id === cardId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)
        ));
      } catch {}
    }
  },

  /** Update front/back text of a card */
  update: async (cardId: string, changes: { front?: string; back?: string }): Promise<void> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("flashcards").update({
        ...changes,
        updated_at: new Date().toISOString(),
      }).eq("id", cardId).eq("user_id", user.id);
    } else {
      try {
        const existing: Flashcard[] = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
        localStorage.setItem(LOCAL_KEY, JSON.stringify(
          existing.map(c => c.id === cardId ? { ...c, ...changes, updatedAt: new Date().toISOString() } : c)
        ));
      } catch {}
    }
  },

  /** Delete a card */
  delete: async (cardId: string): Promise<void> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("flashcards").delete().eq("id", cardId).eq("user_id", user.id);
    } else {
      try {
        const existing: Flashcard[] = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
        localStorage.setItem(LOCAL_KEY, JSON.stringify(existing.filter(c => c.id !== cardId)));
      } catch {}
    }
  },
};
