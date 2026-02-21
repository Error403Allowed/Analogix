import { createClient } from "@/lib/supabase/client";

export interface UserStats {
  quizzesDone: number;
  currentStreak: number;
  accuracy: number;
  conversationsCount: number;
  topSubject: string;
  subjectCounts: Record<string, number>;
}

const DEFAULT_STATS: UserStats = {
  quizzesDone: 0, currentStreak: 0, accuracy: 0,
  conversationsCount: 0, topSubject: "None", subjectCounts: {},
};

const LOCAL_KEY = "analogix_user_stats_v1";

const toRow = (s: UserStats) => ({
  quizzes_done: s.quizzesDone,
  current_streak: s.currentStreak,
  accuracy: s.accuracy,
  conversations_count: s.conversationsCount,
  top_subject: s.topSubject,
  subject_counts: s.subjectCounts,
  updated_at: new Date().toISOString(),
});

const fromRow = (row: any): UserStats => ({
  quizzesDone: row.quizzes_done ?? 0,
  currentStreak: row.current_streak ?? 0,
  accuracy: row.accuracy ?? 0,
  conversationsCount: row.conversations_count ?? 0,
  topSubject: row.top_subject ?? "None",
  subjectCounts: row.subject_counts ?? {},
});

export const statsStore = {
  get: async (): Promise<UserStats> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) return fromRow(data);
    }

    // Fallback to localStorage
    try {
      const saved = localStorage.getItem(LOCAL_KEY);
      if (!saved) return DEFAULT_STATS;
      return { ...DEFAULT_STATS, ...JSON.parse(saved) };
    } catch { return DEFAULT_STATS; }
  },

  update: async (updates: Partial<UserStats>) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const current = await statsStore.get();
    const updated = { ...current, ...updates };

    if (user) {
      await supabase.from("user_stats").upsert({
        user_id: user.id,
        ...toRow(updated),
      }, { onConflict: "user_id" });
    }

    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(updated)); } catch {}
    window.dispatchEvent(new Event("statsUpdated"));
  },

  addQuiz: async (score: number) => {
    const current = await statsStore.get();
    const newTotal = current.quizzesDone + 1;
    const newAccuracy = Math.round(((current.accuracy * current.quizzesDone) + score) / newTotal);
    await statsStore.update({ quizzesDone: newTotal, accuracy: newAccuracy });
  },

  recordChat: async (subject: string) => {
    const current = await statsStore.get();
    const counts = { ...current.subjectCounts };
    counts[subject] = (counts[subject] || 0) + 1;
    let top = current.topSubject;
    let max = 0;
    for (const s in counts) {
      if (counts[s] > max) { max = counts[s]; top = s; }
    }
    await statsStore.update({ conversationsCount: current.conversationsCount + 1, topSubject: top, subjectCounts: counts });
  },

  updateStreak: async (newStreak: number) => {
    await statsStore.update({ currentStreak: newStreak });
  },
};
