const STORAGE_KEY = "analogix_user_stats_v1";

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
  subjectCounts: {}
};

export const statsStore = {
  get: (): UserStats => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return DEFAULT_STATS;
      const parsed = JSON.parse(saved);
      // Ensure all fields exist
      return { ...DEFAULT_STATS, ...parsed };
    } catch {
      return DEFAULT_STATS;
    }
  },

  update: (updates: Partial<UserStats>) => {
    const current = statsStore.get();
    const updated = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("statsUpdated"));
  },

  addQuiz: (score: number) => {
    const current = statsStore.get();
    const newTotal = current.quizzesDone + 1;
    const newAccuracy = Math.round(((current.accuracy * current.quizzesDone) + score) / newTotal);
    
    statsStore.update({
      quizzesDone: newTotal,
      accuracy: newAccuracy
    });
  },

  recordChat: (subject: string) => {
    const current = statsStore.get();
    const counts = { ...current.subjectCounts };
    counts[subject] = (counts[subject] || 0) + 1;
    
    // Find top subject
    let top = current.topSubject;
    let max = 0;
    for (const s in counts) {
      if (counts[s] > max) {
        max = counts[s];
        top = s;
      }
    }

    statsStore.update({
      conversationsCount: current.conversationsCount + 1,
      topSubject: top,
      subjectCounts: counts
    });
  },

  updateStreak: (newStreak: number) => {
    statsStore.update({ currentStreak: newStreak });
  }
};
