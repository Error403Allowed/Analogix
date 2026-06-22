import { useEffect } from "react";
import { statsStore } from "@/utils/statsStore";
import { achievementStore } from "@/utils/achievementStore";
import { ACHIEVEMENTS_LIBRARY } from "@/data/achievements";

export const useAchievementChecker = () => {
  useEffect(() => {
    const checkAchievements = async () => {
      const [stats, unlocked] = await Promise.all([
        statsStore.get(),
        achievementStore.getUnlocked(),
      ]);

      ACHIEVEMENTS_LIBRARY.forEach((achievement) => {
        if (unlocked.some(u => u.id === achievement.id)) return;
        if (!achievement.condition) return;
        if (achievement.condition(stats)) {
          achievementStore.unlock(achievement.id);
        }
      });
    };

    checkAchievements();
    window.addEventListener("statsUpdated", checkAchievements);
    return () => window.removeEventListener("statsUpdated", checkAchievements);
  }, []);
};
