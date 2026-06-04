import { GraphQLError } from "graphql";
import { requireUser } from "./_helpers.js";
import type { GraphQLContext } from "../context.js";
import { streamGroqChat, type GroqChatMessage } from "../ai/groq.js";
import { logger } from "../logger.js";
import { z } from "zod";

const AppendMessageSchema = z.object({
  sessionId: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(50_000),
});

export const chatResolvers = {
  Query: {
    chatSessions: async (_: unknown, args: { subjectId?: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      let query = ctx.supabase!.from("chat_sessions").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
      if (args.subjectId) query = query.eq("subject_id", args.subjectId);
      const { data: sessions, error } = await query;
      if (error) throw new GraphQLError(error.message);
      // Hydrate message count and last message in one pass
      const result = await Promise.all(
        (sessions ?? []).map(async (s) => {
          const { data: msgs } = await ctx.supabase!
            .from("chat_messages")
            .select("content, role, created_at")
            .eq("session_id", s.id)
            .order("created_at", { ascending: false })
            .limit(1);
          return {
            id: s.id,
            subjectId: s.subject_id,
            title: s.title,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
            messageCount: 0, // optional: count via separate query if needed
            lastMessage: msgs?.[0]?.content ?? null,
          };
        })
      );
      return result;
    },
    chatMessages: async (_: unknown, args: { sessionId: string; limit?: number }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!
        .from("chat_messages")
        .select("*")
        .eq("session_id", args.sessionId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(args.limit ?? 100);
      if (error) throw new GraphQLError(error.message);
      return (data ?? []).map((m) => ({
        id: m.id,
        sessionId: m.session_id,
        role: m.role,
        content: m.content,
        createdAt: m.created_at,
      }));
    },
  },

  Mutation: {
    createChatSession: async (_: unknown, args: { subjectId: string; title?: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const now = new Date().toISOString();
      const { data, error } = await ctx.supabase!
        .from("chat_sessions")
        .insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          subject_id: args.subjectId,
          title: args.title ?? "New chat",
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return {
        id: data.id,
        subjectId: data.subject_id,
        title: data.title,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        messageCount: 0,
        lastMessage: null,
      };
    },
    updateChatSession: async (_: unknown, args: { id: string; title?: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!
        .from("chat_sessions")
        .update({ title: args.title, updated_at: new Date().toISOString() })
        .eq("id", args.id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return {
        id: data.id,
        subjectId: data.subject_id,
        title: data.title,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        messageCount: 0,
        lastMessage: null,
      };
    },
    deleteChatSession: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { error } = await ctx.supabase!.from("chat_sessions").delete().eq("id", args.id).eq("user_id", user.id);
      if (error) throw new GraphQLError(error.message);
      return { success: true };
    },
    appendChatMessage: async (_: unknown, args: { sessionId: string; role: string; content: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const parsed = AppendMessageSchema.parse(args);
      const now = new Date().toISOString();
      const { data, error } = await ctx.supabase!
        .from("chat_messages")
        .insert({
          id: crypto.randomUUID(),
          session_id: parsed.sessionId,
          user_id: user.id,
          role: parsed.role,
          content: parsed.content,
          created_at: now,
        })
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      // Bump session updated_at
      await ctx.supabase!.from("chat_sessions").update({ updated_at: now }).eq("id", parsed.sessionId);
      return {
        id: data.id,
        sessionId: data.session_id,
        role: data.role,
        content: data.content,
        createdAt: data.created_at,
      };
    },
    streamChatMessage: async (_: unknown, args: { sessionId: string; content: string; model?: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const parsed = AppendMessageSchema.parse({ ...args, role: "user" });
      // 1. Persist the user's message.
      const now = new Date().toISOString();
      const { data: userMsg, error: insertError } = await ctx.supabase!
        .from("chat_messages")
        .insert({
          id: crypto.randomUUID(),
          session_id: parsed.sessionId,
          user_id: user.id,
          role: "user",
          content: parsed.content,
          created_at: now,
        })
        .select()
        .single();
      if (insertError) throw new GraphQLError(insertError.message);
      await ctx.supabase!.from("chat_sessions").update({ updated_at: now }).eq("id", parsed.sessionId);

      // 2. Build the message history for Groq.
      const { data: history } = await ctx.supabase!
        .from("chat_messages")
        .select("role, content")
        .eq("session_id", parsed.sessionId)
        .order("created_at", { ascending: true })
        .limit(40);
      const groqMessages: GroqChatMessage[] = (history ?? []).map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }));
      // Inject personality-driven system prompt if none exists yet.
      if (!groqMessages.some((m) => m.role === "system")) {
        const { data: profile } = await ctx.supabase!
          .from("profiles")
          .select("ai_personality")
          .eq("id", user.id)
          .maybeSingle();
        const personality = (profile?.ai_personality ?? {}) as {
          tone?: string;
          focus?: string;
          verbosity?: number;
          creativity?: number;
        };

        const toneMap: Record<string, string> = {
          friendly: "Be warm, encouraging, and approachable. Use positive reinforcement.",
          professional: "Be formal, precise, and structured. Use academic language.",
          socratic: "Guide the student to discover answers through probing questions rather than giving direct answers.",
          playful: "Be fun, light-hearted, and use humor and emojis to keep the student engaged.",
          concise: "Be direct and efficient. Give short, focused answers without extra elaboration.",
        };
        const focusMap: Record<string, string> = {
          "balanced": "Balance conceptual understanding with practical application.",
          "exam-prep": "Focus on test-taking strategies, common pitfalls, and high-yield facts.",
          "deep-understanding": "Prioritize deep conceptual understanding over breadth. Explore underlying principles.",
          "memorization": "Use mnemonics, repetition, and clear summaries to aid memorization.",
        };
        const verbosityGuide =
          (personality.verbosity ?? 50) < 30
            ? "Keep answers extremely brief."
            : (personality.verbosity ?? 50) > 70
              ? "Provide detailed, thorough explanations."
              : "Provide moderately detailed answers.";
        const creativityGuide =
          (personality.creativity ?? 50) < 30
            ? "Stick to well-established facts. Avoid speculation."
            : (personality.creativity ?? 50) > 70
              ? "Feel free to use creative examples and analogies."
              : "";

        const systemContent = [
          "You are Analogix — a personalized AI study companion for the user.",
          toneMap[personality.tone ?? "friendly"] ?? toneMap.friendly,
          focusMap[personality.focus ?? "balanced"] ?? focusMap.balanced,
          verbosityGuide,
          creativityGuide,
          "Respond in the same language the user writes in.",
          "Ask one follow-up question at the end to deepen understanding.",
        ]
          .filter(Boolean)
          .join(" ");

        groqMessages.unshift({ role: "system", content: systemContent });
      }

      // 3. Kick off streaming in the background; do not await.
      void triggerChatStream({
        sessionId: parsed.sessionId,
        messages: groqMessages,
        pubsub: ctx.pubsub,
        supabase: ctx.supabase!,
        userId: user.id,
        model: args.model,
      });

      return {
        id: userMsg.id,
        sessionId: userMsg.session_id,
        role: userMsg.role,
        content: userMsg.content,
        createdAt: userMsg.created_at,
      };
    },
  },

  Subscription: {
    chatStream: {
      subscribe: async (_: unknown, args: { sessionId: string }, ctx: GraphQLContext) => {
        const user = requireUser(ctx);
        const channel = `chatStream.${args.sessionId}` as const;
        // Pre-flight: verify the user can access this session before subscribing.
        const { data: session } = await ctx.supabase!
          .from("chat_sessions")
          .select("id, user_id")
          .eq("id", args.sessionId)
          .maybeSingle();
        if (!session || session.user_id !== user.id) {
          throw new GraphQLError("Not authorized to stream this session.");
        }
        // Return the asyncIterator directly. Tokens are published to chatStream.${sessionId}
        // by triggerChatStream, which is invoked from the streamChatMessage mutation.
        return (ctx.pubsub as unknown as { asyncIterator: <T>(channels: string[]) => AsyncIterator<T> }).asyncIterator<{
          token: string;
          done: boolean;
          fullText?: string;
        }>([channel]);
      },
      resolve: (payload: { token: string; done: boolean; fullText?: string }) => payload,
    },
  },
};

// -----------------------------------------------------------------------------
// Helper used by the client — invoked by the mobile app via a dedicated
// mutation to kick off a streamed response. The AI's tokens are published
// to the chatStream.${sessionId} pubsub channel; the subscription above
// forwards them to the device.
// -----------------------------------------------------------------------------
export async function triggerChatStream({
  sessionId,
  messages,
  pubsub,
  supabase,
  userId,
  model,
}: {
  sessionId: string;
  messages: GroqChatMessage[];
  pubsub: import("graphql-subscriptions").PubSub;
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
  model?: string;
}) {
  const channel = `chatStream.${sessionId}` as const;
  let fullText = "";
  try {
    const stream = streamGroqChat({ messages, maxTokens: 1500, temperature: 0.7, model });
    for await (const token of stream) {
      fullText += token;
      await pubsub.publish(channel, { token, done: false, fullText });
    }
    await pubsub.publish(channel, { token: "", done: true, fullText });
    // Persist the final assistant message
    if (fullText) {
      const now = new Date().toISOString();
      await supabase.from("chat_messages").insert({
        id: crypto.randomUUID(),
        session_id: sessionId,
        user_id: userId,
        role: "assistant",
        content: fullText,
        created_at: now,
      });
      await supabase.from("chat_sessions").update({ updated_at: now }).eq("id", sessionId);
    }
  } catch (err) {
    logger.error({ err, sessionId }, "[chat] chat stream failed");
    await pubsub.publish(channel, { token: "", done: true, fullText: "Sorry, the AI service is unavailable right now." });
  }
}
