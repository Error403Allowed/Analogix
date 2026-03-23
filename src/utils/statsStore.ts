import { createClient } from "@/lib/supabase/client";
import { activityLog } from "./activityLog";
import { getAuthUser } from "./authCache";

export interface UserStats {
  quizzesDone: number;
  currentStreak: number;
  accuracy: number;
  conversationsCount: number;
  topSubject: string;
  subjectCounts: Record<string, number>;
}

const DEFAULT_STATS: UserStats = {
  quizzesDone: 0,
  currentStreak: 0,
  accuracy: 0,
  conversationsCount: 0,
  topSubject: "None",
  subjectCounts: {},
};

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
    const user = await getAuthUser();
    if (!user) return DEFAULT_STATS;
    const supabase = createClient();

    const { data, error } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) console.warn("[statsStore] get failed:", error);
    return data ? fromRow(data) : DEFAULT_STATS;
  },

  update: async (updates: Partial<UserStats>): Promise<void> => {
    const user = await getAuthUser();
    if (!user) return;
    const supabase = createClient();

    const current = await statsStore.get();
    const updated = { ...current, ...updates };

    const { error } = await supabase.from("user_stats").upsert({
      user_id: user.id,
      ...toRow(updated),
    }, { onConflict: "user_id" });

    if (error) console.warn("[statsStore] update failed:", error);
    window.dispatchEvent(new Event("statsUpdated"));
  },

  addQuiz: async (score: number): Promise<void> => {
    const current = await statsStore.get();
    const newTotal = current.quizzesDone + 1;
    const newAccuracy = Math.round(((current.accuracy * current.quizzesDone) + score) / newTotal);
    await activityLog.record();
    const newStreak = await statsStore.computeStreak();
    await statsStore.update({ quizzesDone: newTotal, accuracy: newAccuracy, currentStreak: newStreak });
  },

  recordChat: async (subject: string): Promise<void> => {
    const current = await statsStore.get();
    const counts = { ...current.subjectCounts };
    counts[subject] = (counts[subject] || 0) + 1;
    let top = current.topSubject;
    let max = 0;
    for (const s in counts) {
      if (counts[s] > max) { max = counts[s]; top = s; }
    }
    await activityLog.record();
    const newStreak = await statsStore.computeStreak();
    await statsStore.update({ conversationsCount: current.conversationsCount + 1, topSubject: top, subjectCounts: counts, currentStreak: newStreak });
  },

  /** Recompute streak from activity log: count consecutive days up to and including today */
  computeStreak: async (): Promise<number> => {
    const user = await getAuthUser();
    if (!user) return 0;
    const supabase = createClient();

    // Fetch last 365 days of activity
    const { data } = await supabase
      .from("activity_log")
      .select("date, count")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(365);

    if (!data || data.length === 0) return 1; // first ever use = 1 day streak

    const activeDates = new Set(data.filter((r: any) => r.count > 0).map((r: any) => r.date as string));

    let streak = 0;
    const d = new Date();
    // Walk backwards from today — include today immediately (counts as day 1)
    while (true) {
      const iso = d.toISOString().slice(0, 10);
      if (activeDates.has(iso)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    // Always count at least 1 (the act of calling this means they used the app today)
    return Math.max(streak, 1);
  },

  updateStreak: async (newStreak: number): Promise<void> => {
    await statsStore.update({ currentStreak: newStreak });
  },
};
