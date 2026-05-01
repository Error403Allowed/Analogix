/* eslint-disable @typescript-eslint/no-explicit-any */
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

    // Fetch existing cards to deduplicate against
    const existing = await flashcardStore.getAll();
    const existingKeys = new Set(
      existing.map(c => `${c.setId}:${c.front.trim().toLowerCase()}:${c.back.trim().toLowerCase()}`)
    );

    // Filter out duplicates (same set + same front + same back, case-insensitive)
    const uniqueCards = cards.filter(c => {
      const key = `${c.setId}:${c.front.trim().toLowerCase()}:${c.back.trim().toLowerCase()}`;
      if (existingKeys.has(key)) return false;
      existingKeys.add(key); // prevent duplicates within the batch too
      return true;
    });

    if (uniqueCards.length === 0) return [];

    const now = new Date().toISOString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const newCards: Flashcard[] = uniqueCards.map(c => ({
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
    if (error) {
      console.warn("[flashcardStore] add failed:", error);
      return [];
    }
    return newCards;
  },

  /**
   * Remove duplicate flashcards for the current user.
   * Keeps the oldest copy of each duplicate group (same set + front + back).
   * Returns the number of duplicates removed.
   */
  removeDuplicates: async (): Promise<number> => {
    const user = await getAuthUser();
    if (!user) return 0;
    const supabase = createClient();

    const all = await flashcardStore.getAll();
    const seen = new Map<string, Flashcard>();
    const duplicates: Flashcard[] = [];

    // Sort by createdAt ascending so we keep the oldest
    all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    for (const card of all) {
      const key = `${card.setId}:${card.front.trim().toLowerCase()}:${card.back.trim().toLowerCase()}`;
      if (seen.has(key)) {
        duplicates.push(card);
      } else {
        seen.set(key, card);
      }
    }

    if (duplicates.length === 0) return 0;

    // Delete duplicates in batches
    const batchSize = 50;
    for (let i = 0; i < duplicates.length; i += batchSize) {
      const batch = duplicates.slice(i, i + batchSize);
      const { error } = await supabase
        .from("flashcards")
        .delete()
        .in("id", batch.map(c => c.id))
        .eq("user_id", user.id);
      if (error) {
        console.warn("[flashcardStore] removeDuplicates batch failed:", error);
      }
    }

    console.log(`[flashcardStore] Removed ${duplicates.length} duplicate cards`);
    return duplicates.length;
  },

  /**
   * Remove orphaned cards (cards with set_id = null or referencing a deleted set).
   * Returns the number of orphaned cards removed.
   */
  removeOrphans: async (): Promise<number> => {
    const user = await getAuthUser();
    if (!user) return 0;
    const supabase = createClient();

    // Get all valid sets for this user
    const { data: sets } = await supabase
      .from("flashcard_sets")
      .select("id")
      .eq("user_id", user.id);

    const validSetIds = new Set((sets || []).map((s: any) => s.id));

    // Get all cards
    const allCards = await flashcardStore.getAll();

    // Find orphans: cards with no set_id or set_id not in valid sets
    const orphans = allCards.filter(c => !c.setId || !validSetIds.has(c.setId));

    if (orphans.length === 0) return 0;

    // Delete orphans in batches
    const batchSize = 50;
    for (let i = 0; i < orphans.length; i += batchSize) {
      const batch = orphans.slice(i, i + batchSize);
      const { error } = await supabase
        .from("flashcards")
        .delete()
        .in("id", batch.map(c => c.id))
        .eq("user_id", user.id);
      if (error) {
        console.warn("[flashcardStore] removeOrphans batch failed:", error);
      }
    }

    console.log(`[flashcardStore] Removed ${orphans.length} orphaned cards`);
    return orphans.length;
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
