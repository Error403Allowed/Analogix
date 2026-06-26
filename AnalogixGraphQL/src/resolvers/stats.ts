import { GraphQLError } from "graphql";
import { requireUser } from "./_helpers.js";
import type { GraphQLContext } from "../context.js";

export const statsResolvers = {
  Query: {
    userStats: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const [{ data, error }, { data: memories }] = await Promise.all([
        ctx.supabase!.from("user_stats").select("*").eq("user_id", user.id).maybeSingle(),
        ctx.supabase!.from("user_memories").select("*").eq("user_id", user.id).order("last_used_at", { ascending: false }),
      ]);
      if (error) throw new GraphQLError(error.message);
      const row =
        data ?? {
          user_id: user.id,
          quizzes_done: 0,
          current_streak: 0,
          accuracy: 0,
          conversations_count: 0,
          top_subject: "None",
          subject_counts: {},
        };
      // Attach memories as a hidden field on the parent; the UserStats.memories
      // resolver below picks it up.
      return { ...row, _memories: memories ?? [] };
    },
    activityLog: async (_: unknown, args: { days?: number }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const days = Math.min(args.days ?? 60, 365);
      const from = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
      const { data, error } = await ctx.supabase!
        .from("activity_log")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", from)
        .order("date", { ascending: true });
      if (error) throw new GraphQLError(error.message);
      return data ?? [];
    },
  },

  Mutation: {
    incrementActivity: async (_: unknown, args: { date: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { error } = await ctx.supabase!.rpc("increment_activity", {
        p_user_id: user.id,
        p_date: args.date,
      });
      if (error) throw new GraphQLError(error.message);
      // Recompute streak from activity_log.
      // Use the client-provided date as "today" so the streak walk matches
      // the timezone the client stores dates in (local, not UTC).
      const { data: activity } = await ctx.supabase!
        .from("activity_log")
        .select("date, count")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(365);
      const activeDates = new Set((activity ?? []).filter((r: any) => r.count > 0).map((r: any) => String(r.date).slice(0, 10)));
      let streak = 0;
      const cursor = new Date(args.date + "T12:00:00Z");
      while (true) {
        const iso = cursor.toISOString().slice(0, 10);
        if (activeDates.has(iso)) { streak++; cursor.setDate(cursor.getDate() - 1); }
        else break;
      }
      streak = Math.max(streak, 1);
      await ctx.supabase!.from("user_stats").upsert(
        { user_id: user.id, current_streak: streak, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      return { success: true };
    },
    upsertUserStats: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!
        .from("user_stats")
        .upsert({ user_id: user.id, ...args.input, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return data;
    },
    forgetMemory: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { error } = await ctx.supabase!.from("user_memories").delete().eq("id", args.id).eq("user_id", user.id);
      if (error) throw new GraphQLError(error.message);
      return { success: true };
    },
    rememberMemory: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const key = String(args.input.key ?? "");
      const value = String(args.input.value ?? "");
      if (!key.trim() || !value.trim()) throw new GraphQLError("Key and value are required");
      const id = crypto.randomUUID?.() ?? `${Date.now()}`;
      const now = new Date().toISOString();
      const { data, error } = await ctx.supabase!
        .from("user_memories")
        .insert({ id, user_id: user.id, key, value, created_at: now, last_used_at: now })
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return { id: data.id, key: data.key, value: data.value, createdAt: data.created_at, lastUsedAt: data.last_used_at };
    },
  },

  UserStats: {
    userId: (s: { user_id?: string }) => s.user_id,
    quizzesDone: (s: { quizzes_done?: number }) => s.quizzes_done ?? 0,
    currentStreak: (s: { current_streak?: number }) => s.current_streak ?? 0,
    accuracy: (s: { accuracy?: number }) => s.accuracy ?? 0,
    conversationsCount: (s: { conversations_count?: number }) => s.conversations_count ?? 0,
    topSubject: (s: { top_subject?: string }) => s.top_subject ?? "None",
    subjectCounts: (s: { subject_counts?: Record<string, number> }) => s.subject_counts ?? {},
    updatedAt: (s: { updated_at?: string }) => s.updated_at,
    // Mobile-facing extensions — derived fields
    xp: (s: { quizzes_done?: number; cards_reviewed?: number; minutes_studied?: number }) =>
      (s.quizzes_done ?? 0) * 50 + (s.cards_reviewed ?? 0) * 2 + Math.floor((s.minutes_studied ?? 0) / 5),
    level: (s: { quizzes_done?: number; cards_reviewed?: number }) => {
      const derivedXp = (s.quizzes_done ?? 0) * 50 + (s.cards_reviewed ?? 0) * 2;
      return Math.max(1, Math.floor(Math.sqrt(derivedXp / 100)));
    },
    quizzesCompleted: (s: { quizzes_done?: number }) => s.quizzes_done ?? 0,
    cardsReviewed: (s: { cards_reviewed?: number }) => s.cards_reviewed ?? 0,
    minutesStudied: (s: { minutes_studied?: number }) => s.minutes_studied ?? 0,
    memories: (s: { _memories?: { id: string; key: string; value: string; created_at: string; last_used_at: string }[] }) =>
      (s._memories ?? []).map((m) => ({
        id: m.id,
        key: m.key,
        value: m.value,
        createdAt: m.created_at,
        lastUsedAt: m.last_used_at,
      })),
  },

  UserMemory: {
    id: (m: { id: string }) => m.id,
    key: (m: { key: string }) => m.key,
    value: (m: { value: string }) => m.value,
    createdAt: (m: { created_at: string }) => m.created_at,
    lastUsedAt: (m: { last_used_at: string }) => m.last_used_at,
  },

  ActivityLog: {
    id: (a: { id: string }) => a.id,
    date: (a: { date: string }) => a.date,
    count: (a: { count: number }) => a.count,
  },
};
