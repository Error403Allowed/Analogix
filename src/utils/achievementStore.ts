import { ACHIEVEMENTS_LIBRARY, Achievement } from "@/data/achievements";
import { toast } from "sonner";

const STORAGE_KEY = "userAchievements";

interface UnlockedAchievement {
  id: string;
  unlockedAt: string; // ISO date string
}

export const achievementStore = {
  getUnlocked: (): UnlockedAchievement[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  },

  getAll: (): (Achievement & { unlocked: boolean; unlockedAt?: string })[] => {
    const unlocked = achievementStore.getUnlocked();
    return ACHIEVEMENTS_LIBRARY.map((ach) => {
      const isUnlocked = unlocked.find((u) => u.id === ach.id);
      return {
        ...ach,
        unlocked: !!isUnlocked,
        unlockedAt: isUnlocked?.unlockedAt
      };
    });
  },

  unlock: (id: string) => {
    const unlocked = achievementStore.getUnlocked();
    if (unlocked.some((u) => u.id === id)) return; // Already unlocked

    const achievement = ACHIEVEMENTS_LIBRARY.find((a) => a.id === id);
    if (!achievement) return;

    unlocked.push({ id, unlockedAt: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
    
    // Show Toast
    toast.success(`Achievement Unlocked: ${achievement.title}!`, {
      description: achievement.description,
      icon: achievement.icon,
      duration: 5000,
    });

    window.dispatchEvent(new Event("achievementsUpdated"));
  },

  reset: () => {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("achievementsUpdated"));
  }
};
