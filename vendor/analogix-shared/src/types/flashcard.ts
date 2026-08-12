export interface Flashcard {
  id: string;
  user_id: string;
  subject_id: string;
  front: string;
  back: string;
  source_session_id?: string | null;
  next_review: string;
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  created_at: string;
  updated_at: string;
  set_id?: string | null;
}

export interface FlashcardSet {
  id: string;
  user_id: string;
  subject_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface FlashcardGrade {
  cardId: string;
  quality: number;
}

export interface FlashcardReviewResult {
  card: Flashcard;
  nextReview: string;
  intervalDays: number;
}
