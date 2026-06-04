import { GraphQLError } from "graphql";
import { requireUser } from "./_helpers.js";
import type { GraphQLContext } from "../context.js";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: "first-chat", title: "First Chat", description: "Start your first AI tutoring session", icon: "chat", category: "starter" },
  { id: "quiz-novice", title: "Quiz Novice", description: "Complete your first quiz", icon: "order-bool-ascending-variant", category: "starter" },
  { id: "flashcard-debut", title: "Flashcard Debut", description: "Create your first flashcard", icon: "cards-outline", category: "starter" },
  { id: "streak-3", title: "3-Day Streak", description: "Study for 3 days in a row", icon: "fire", category: "streak" },
  { id: "streak-7", title: "Week Warrior", description: "Study for 7 days in a row", icon: "fire", category: "streak" },
  { id: "streak-30", title: "Monthly Master", description: "Study for 30 days in a row", icon: "fire", category: "streak" },
  { id: "perfect-quiz", title: "Perfect Score", description: "Get 100% on any quiz", icon: "star", category: "mastery" },
  { id: "quiz-10", title: "Quiz Hunter", description: "Complete 10 quizzes", icon: "order-bool-ascending-variant", category: "mastery" },
  { id: "formula-saved", title: "Formula Collector", description: "Save your first formula", icon: "sigma", category: "mastery" },
  { id: "room-joined", title: "Study Buddy", description: "Join a study room", icon: "account-group", category: "social" },
  { id: "room-created", title: "Host", description: "Create your own study room", icon: "account-star", category: "social" },
  { id: "doc-shared", title: "Collaborator", description: "Share a document with others", icon: "share-variant", category: "social" },
];

export const achievementResolvers = {
  Query: {
    achievements: async () => ACHIEVEMENTS,
    unlockedAchievements: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!
        .from("achievements")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw new GraphQLError(error.message);
      return (data ?? []).map((a) => ({
        id: a.id,
        achievementId: a.achievement_id,
        unlockedAt: a.unlocked_at,
      }));
    },
  },
  Mutation: {
    unlockAchievement: async (_: unknown, args: { achievementId: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!
        .from("achievements")
        .upsert(
          {
            id: crypto.randomUUID(),
            user_id: user.id,
            achievement_id: args.achievementId,
            unlocked_at: new Date().toISOString(),
          },
          { onConflict: "user_id,achievement_id" }
        )
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return {
        id: data.id,
        achievementId: data.achievement_id,
        unlockedAt: data.unlocked_at,
      };
    },
  },
};
