import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { USER_STATS } from "../graphql/queries/user";
import { ACHIEVEMENTS as ACHIEVEMENTS_QUERY, UNLOCK_ACHIEVEMENT } from "../graphql/queries/misc";
import { ACHIEVEMENTS } from "../shared/achievements";

const unlockedInSession = new Set<string>();

export function useAchievementChecker() {
  const { data: statsData, loading: statsLoading } = useQuery(USER_STATS);
  const { data: achievementsData, loading: achievementsLoading } = useQuery(ACHIEVEMENTS_QUERY);
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

    ACHIEVEMENTS.forEach((achievement) => {
      if (unlocked.has(achievement.id)) return;
      if (!achievement.condition) return;
      if (unlockedInSession.has(achievement.id)) return;
      if (achievement.condition(stats)) {
        unlockedInSession.add(achievement.id);
        unlockAchievement({ variables: { achievementId: achievement.id } }).catch(() => {});
      }
    });
  }, [statsData, achievementsData, statsLoading, achievementsLoading, unlockAchievement]);
}
