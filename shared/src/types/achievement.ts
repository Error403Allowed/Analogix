export type AchievementCategory = "starter" | "streak" | "mastery" | "social";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
}

export interface UnlockedAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}
