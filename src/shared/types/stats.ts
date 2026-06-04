export interface UserStats {
  id?: string;
  user_id?: string;
  quizzes_done: number;
  current_streak: number;
  accuracy: number;
  conversations_count: number;
  top_subject: string;
  subject_counts: Record<string, number>;
  updated_at?: string;
}

export interface ActivityLogEntry {
  id: string;
  user_id: string;
  date: string;
  count: number;
  updated_at: string;
}
