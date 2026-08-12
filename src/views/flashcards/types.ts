"use client";

import { SUBJECT_CATALOG } from "@/constants/subjects";
import type { FlashcardSet } from "@/utils/flashcardStore";

export type TopView = "library" | "subject-detail" | "set-detail" | "create-set" | "quiz-hub";
export type SetTab = "flashcards" | "learn";

export interface CardSet {
  set: FlashcardSet;
  subjectId: string;
  cards: import("@/utils/flashcardStore").Flashcard[];
  dueCount: number;
  masteredCount: number;
}

export const subjectLabel = (id: string): string =>
  SUBJECT_CATALOG.find(s => s.id === id)?.label || id;

export const subjectIconName = (id: string): string =>
  SUBJECT_CATALOG.find(s => s.id === id)?.iconName || "BookOpen";
