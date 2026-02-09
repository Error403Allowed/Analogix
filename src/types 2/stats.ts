export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "starter" | "streak" | "mastery" | "social";
  condition?: (stats: UserStats) => boolean;
}

export interface UserStats {
  conversationsCount: number;
  quizzesDone: number;
  currentStreak: number;
  topSubject: string;
  // Dynamic subject counts
  subjectCounts: Record<string, number>; 
  accuracy?: number; // Optional derived stat
}
