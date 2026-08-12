import { useEffect, useRef, useState } from "react";
import { statsStore } from "@/utils/statsStore";
import { achievementStore } from "@/utils/achievementStore";
import { ACHIEVEMENTS_LIBRARY } from "@/data/achievements";

const shownInSession = new Set<string>();

export const useAchievementChecker = () => {
  const [stats, setStats] = useState<any>(null);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const ran = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [loadedStats, loadedUnlocked] = await Promise.all([
        statsStore.get(),
        achievementStore.getUnlocked(),
      ]);
      if (cancelled) return;
      setStats(loadedStats);
      setUnlocked(new Set(loadedUnlocked.map((a) => a.id)));
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!stats || ran.current) return;
    ran.current = true;

    ACHIEVEMENTS_LIBRARY.forEach((achievement) => {
      if (unlocked.has(achievement.id)) return;
      if (!achievement.condition) return;
      if (shownInSession.has(achievement.id)) return;
      if (achievement.condition(stats)) {
        shownInSession.add(achievement.id);
        void achievementStore.unlock(achievement.id);
      }
    });
  }, [stats, unlocked]);
};
