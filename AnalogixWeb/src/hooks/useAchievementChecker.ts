import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { USER_STATS } from "@/graphql/queries/user";
import { ACHIEVEMENTS, UNLOCK_ACHIEVEMENT } from "@/graphql/queries/user";
import { ACHIEVEMENTS_LIBRARY } from "@/data/achievements";
import { toast } from "sonner";

const shownInSession = new Set<string>();

export const useAchievementChecker = () => {
  const { data: statsData, loading: statsLoading } = useQuery(USER_STATS);
  const { data: achievementsData, loading: achievementsLoading } = useQuery(ACHIEVEMENTS);
  const [unlockAchievement] = useMutation(UNLOCK_ACHIEVEMENT);
  const ran = useRef(false);

  useEffect(() => {
    if (statsLoading || achievementsLoading) return;
    if (ran.current) return;
    ran.current = true;

    const stats = statsData?.userStats;
    if (!stats) return;

    const unlocked = new Set(
      (achievementsData?.unlockedAchievements ?? []).map(
        (a: { achievementId: string }) => a.achievementId
      )
    );

    ACHIEVEMENTS_LIBRARY.forEach((achievement) => {
      if (unlocked.has(achievement.id)) return;
      if (!achievement.condition) return;
      if (shownInSession.has(achievement.id)) return;
      if (achievement.condition(stats)) {
        shownInSession.add(achievement.id);
        unlockAchievement({ variables: { achievementId: achievement.id } }).catch(() => {});
        toast.success(`Achievement Unlocked: ${achievement.title}!`, {
          description: achievement.description,
          duration: 5000,
        });
      }
    });
  }, [statsData, achievementsData, statsLoading, achievementsLoading, unlockAchievement]);
};
