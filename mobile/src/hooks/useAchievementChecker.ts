import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { USER_STATS } from "../graphql/queries/user";
import { ACHIEVEMENTS, UNLOCK_ACHIEVEMENT } from "../graphql/queries/misc";

type Stats = {
  currentStreak?: number;
  quizzesCompleted?: number;
  cardsReviewed?: number;
  conversationsCount?: number;
  accuracy?: number;
};

const RULES: { id: string; check: (stats: Stats) => boolean }[] = [
  { id: "streak_1", check: (s) => (s.currentStreak ?? 0) >= 1 },
  { id: "streak_3", check: (s) => (s.currentStreak ?? 0) >= 3 },
  { id: "streak_5", check: (s) => (s.currentStreak ?? 0) >= 5 },
  { id: "streak_7", check: (s) => (s.currentStreak ?? 0) >= 7 },
  { id: "streak_14", check: (s) => (s.currentStreak ?? 0) >= 14 },
  { id: "streak_21", check: (s) => (s.currentStreak ?? 0) >= 21 },
  { id: "streak_30", check: (s) => (s.currentStreak ?? 0) >= 30 },
  { id: "quiz_1", check: (s) => (s.quizzesCompleted ?? 0) >= 1 },
  { id: "quiz_5", check: (s) => (s.quizzesCompleted ?? 0) >= 5 },
  { id: "quiz_10", check: (s) => (s.quizzesCompleted ?? 0) >= 10 },
  { id: "chat_1", check: (s) => (s.conversationsCount ?? 0) >= 1 },
  { id: "chat_5", check: (s) => (s.conversationsCount ?? 0) >= 5 },
  { id: "chat_10", check: (s) => (s.conversationsCount ?? 0) >= 10 },
  { id: "flash_1", check: (s) => (s.cardsReviewed ?? 0) >= 1 },
  { id: "flash_10", check: (s) => (s.cardsReviewed ?? 0) >= 10 },
];

const unlockedInSession = new Set<string>();

export function useAchievementChecker() {
  const { data: statsData, loading: statsLoading } = useQuery(USER_STATS);
  const { data: achievementsData, loading: achievementsLoading } = useQuery(ACHIEVEMENTS);
  const [unlockAchievement] = useMutation(UNLOCK_ACHIEVEMENT);
  const ran = useRef(false);

  useEffect(() => {
    if (statsLoading || achievementsLoading) return;
    if (ran.current) return;
    ran.current = true;

    const stats = statsData?.userStats as Stats | undefined;
    if (!stats) return;

    const unlocked = new Set(
      (achievementsData?.unlockedAchievements ?? []).map(
        (a: { achievementId: string }) => a.achievementId
      )
    );

    RULES.forEach(({ id, check }) => {
      if (unlocked.has(id)) return;
      if (unlockedInSession.has(id)) return;
      if (check(stats)) {
        unlockedInSession.add(id);
        unlockAchievement({ variables: { achievementId: id } }).catch(() => {});
      }
    });
  }, [statsData, achievementsData, statsLoading, achievementsLoading, unlockAchievement]);
}
