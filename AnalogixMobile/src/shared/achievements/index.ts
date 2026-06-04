import type { Achievement } from "../types/achievement";

export const ACHIEVEMENTS: Achievement[] = [];

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

export function getAchievementsByCategory(category: Achievement["category"]): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.category === category);
}
