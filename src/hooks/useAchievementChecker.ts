import { useEffect } from "react";
import { statsStore } from "@/utils/statsStore";
import { achievementStore } from "@/utils/achievementStore";
import { ACHIEVEMENTS_LIBRARY } from "@/data/achievements";

export const useAchievementChecker = () => {
  useEffect(() => {
    const checkAchievements = () => {
      const stats = statsStore.get();
      const unlocked = achievementStore.getUnlocked();

      ACHIEVEMENTS_LIBRARY.forEach((achievement) => {
        // If already unlocked, skip
        if (unlocked.some(u => u.id === achievement.id)) return;

        // Check milestones
        let shouldUnlock = false;

        switch (achievement.id) {
          case "quiz_1":
            if (stats.quizzesDone >= 1) shouldUnlock = true;
            break;
          case "quiz_10":
            if (stats.quizzesDone >= 10) shouldUnlock = true;
            break;
          case "quiz_100":
            if (stats.quizzesDone >= 100) shouldUnlock = true;
            break;
          case "chat_1":
            if (stats.conversationsCount >= 1) shouldUnlock = true;
            break;
          case "streak_3":
            if (stats.currentStreak >= 3) shouldUnlock = true;
            break;
          case "streak_7":
            if (stats.currentStreak >= 7) shouldUnlock = true;
            break;
          case "streak_30":
            if (stats.currentStreak >= 30) shouldUnlock = true;
            break;
          case "perfect_score":
            if (stats.accuracy >= 100 && stats.quizzesDone >= 1) shouldUnlock = true;
            break;
        }

        if (shouldUnlock) {
          achievementStore.unlock(achievement.id);
        }
      });
    };

    // Initial check
    checkAchievements();

    // Listen for stat updates
    window.addEventListener("statsUpdated", checkAchievements);
    return () => window.removeEventListener("statsUpdated", checkAchievements);
  }, []);
};
