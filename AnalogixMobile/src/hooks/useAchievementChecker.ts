import { useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { USER_STATS } from "../graphql/queries/user";
import { ACHIEVEMENTS, UNLOCK_ACHIEVEMENT } from "../graphql/queries/misc";

type Stats = {
  currentStreak?: number;
  quizzesCompleted?: number;
  cardsReviewed?: number;
  conversationsCount?: number;
};

const RULES: { id: string; check: (stats: Stats) => boolean }[] = [
  { id: "first-chat", check: (s) => (s.conversationsCount ?? 0) >= 1 },
  { id: "quiz-novice", check: (s) => (s.quizzesCompleted ?? 0) >= 1 },
  { id: "flashcard-debut", check: (s) => (s.cardsReviewed ?? 0) >= 1 },
  { id: "streak-3", check: (s) => (s.currentStreak ?? 0) >= 3 },
  { id: "streak-7", check: (s) => (s.currentStreak ?? 0) >= 7 },
  { id: "streak-30", check: (s) => (s.currentStreak ?? 0) >= 30 },
  { id: "quiz-10", check: (s) => (s.quizzesCompleted ?? 0) >= 10 },
];

export function useAchievementChecker() {
  const { data: statsData } = useQuery(USER_STATS);
  const { data: achievementsData } = useQuery(ACHIEVEMENTS);
  const [unlockAchievement] = useMutation(UNLOCK_ACHIEVEMENT);

  useEffect(() => {
    const stats = statsData?.userStats as Stats | undefined;
    if (!stats) return;

    const unlocked = new Set(
      (achievementsData?.unlockedAchievements ?? []).map((a: { achievementId: string }) => a.achievementId)
    );

    RULES.forEach(({ id, check }) => {
      if (unlocked.has(id)) return;
      if (check(stats)) {
        unlockAchievement({ variables: { achievementId: id } }).catch(() => {});
      }
    });
  }, [statsData, achievementsData, unlockAchievement]);
}
