import { GraphQLError } from "graphql";
import { requireUser } from "./_helpers.js";
import { serviceClient } from "../supabase.js";
import type { GraphQLContext } from "../context.js";

export const userResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw new GraphQLError(error.message);
      return data;
    },
    myPreferences: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw new GraphQLError(error.message);
      return data ?? { user_id: user.id, mood: "focus", theme: "Cosmic Aurora" };
    },
  },

  Mutation: {
    updateProfile: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const snakePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      for (const [key, val] of Object.entries(args.input)) {
        const snake = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
        snakePayload[snake] = val;
      }
      const { data, error } = await ctx.supabase!
        .from("profiles")
        .upsert({ id: user.id, ...snakePayload }, { onConflict: "id" })
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return data;
    },
    updatePreferences: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!
        .from("user_preferences")
        .upsert({ user_id: user.id, ...args.input, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return data;
    },
    updateAiPersonality: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!
        .from("profiles")
        .upsert(
          { id: user.id, ai_personality: args.input, updated_at: new Date().toISOString() },
          { onConflict: "id" }
        )
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return data;
    },
    markToursCompleted: async (_: unknown, args: { tourIds: string[] }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data: current } = await ctx.supabase!
        .from("profiles")
        .select("tours_completed")
        .eq("id", user.id)
        .maybeSingle();
      const existing: string[] = (current?.tours_completed as string[]) ?? [];
      const merged = [...new Set([...existing, ...args.tourIds])];
      const { data, error } = await ctx.supabase!
        .from("profiles")
        .upsert(
          { id: user.id, tours_completed: merged, updated_at: new Date().toISOString() },
          { onConflict: "id" }
        )
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return data;
    },
    deleteAccount: async (_: unknown, args: { confirmation?: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      if (args.confirmation !== "DELETE") {
        throw new GraphQLError("Must provide confirmation: 'DELETE' to delete your account.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }
      const { error } = await serviceClient.auth.admin.deleteUser(user.id);
      if (error) throw new GraphQLError(error.message);
      return { success: true };
    },
  },

  Profile: {
    id: (p: { id: string }) => p.id,
    email: (p: Record<string, unknown>, a: unknown, ctx: GraphQLContext) => ctx.user?.email ?? null,
    avatarUrl: (p: { avatar_url?: string | null }) => p.avatar_url ?? null,
    hobbyIds: (p: { hobby_ids?: string[] }) => p.hobby_ids ?? [],
    hobbyDetails: (p: { hobby_details?: unknown }) => p.hobby_details ?? {},
    onboardingComplete: (p: { onboarding_complete?: boolean }) => Boolean(p.onboarding_complete),
    toursCompleted: (p: { tours_completed?: string[] }) => p.tours_completed ?? [],
    createdAt: (p: { created_at?: string }) => p.created_at,
    updatedAt: (p: { updated_at?: string }) => p.updated_at,
    aiPersonality: (p: { ai_personality?: { tone?: string; focus?: string; verbosity?: number; creativity?: number } | null }) =>
      p.ai_personality
        ? {
            tone: p.ai_personality.tone ?? "friendly",
            focus: p.ai_personality.focus ?? "balanced",
            verbosity: p.ai_personality.verbosity ?? 50,
            creativity: p.ai_personality.creativity ?? 50,
          }
        : { tone: "friendly", focus: "balanced", verbosity: 50, creativity: 50 },
  },

  AiPersonality: {
    tone: (p: { tone: string }) => p.tone,
    focus: (p: { focus: string }) => p.focus,
    verbosity: (p: { verbosity: number }) => p.verbosity,
    creativity: (p: { creativity: number }) => p.creativity,
  },
};
