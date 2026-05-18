import { createClient } from "@/lib/supabase/server";
import type { ContextType } from "./context";

function requireAuth(ctx: ContextType) {
  if (!ctx.userId) throw new Error("Unauthorized");
  return ctx.userId;
}

async function getSupabase() {
  return await createClient();
}

// ─── Scalar resolvers ───────────────────────────────────────────────────────
export const scalars = {
  DateTime: {
    __serialize: (v: unknown) => v,
    __parseValue: (v: unknown) => v,
    __parseLiteral: (v: unknown) => v,
  },
  JSON: {
    __serialize: (v: unknown) => v,
    __parseValue: (v: unknown) => v,
    __parseLiteral: (v: unknown) => v,
  },
};

// ─── Query resolvers ────────────────────────────────────────────────────────
export const resolvers = {
  DateTime: scalars.DateTime,
  JSON: scalars.JSON,

  Query: {
    me: async (_: unknown, __: unknown, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
      return data ? mapProfile(data) : null;
    },

    userStats: async (_: unknown, __: unknown, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data } = await supabase.from("user_stats").select("*").eq("user_id", userId).single();
      return data ? mapUserStats(data) : null;
    },

    subjects: async (_: unknown, __: unknown, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data } = await supabase.from("subject_data").select("*").eq("user_id", userId).order("subject_id");
      return (data ?? []).map(mapSubjectData);
    },

    customSubjects: async (_: unknown, __: unknown, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data } = await supabase.from("custom_subjects").select("*").eq("user_id", userId);
      return (data ?? []).map(mapCustomSubject);
    },

    events: async (_: unknown, args: { startDate?: string; endDate?: string }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      let query = supabase.from("events").select("*").eq("user_id", userId).order("date");
      if (args.startDate) query = query.gte("date", args.startDate);
      if (args.endDate) query = query.lte("date", args.endDate);
      const { data } = await query;
      return (data ?? []).map(mapEvent);
    },

    deadlines: async (_: unknown, args: { subject?: string }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      let query = supabase.from("deadlines").select("*").eq("user_id", userId).order("due_date");
      if (args.subject) query = query.eq("subject", args.subject);
      const { data } = await query;
      return (data ?? []).map(mapDeadline);
    },

    achievements: async (_: unknown, __: unknown, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data } = await supabase.from("achievements").select("*").eq("user_id", userId).order("unlocked_at", { ascending: false });
      return (data ?? []).map(mapAchievement);
    },

    chatSessions: async (_: unknown, args: { subjectId?: string }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      let query = supabase.from("chat_sessions").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
      if (args.subjectId) query = query.eq("subject_id", args.subjectId);
      const { data } = await query;
      return (data ?? []).map(mapChatSession);
    },

    chatMessages: async (_: unknown, args: { sessionId: string; limit?: number }, ctx: ContextType) => {
      requireAuth(ctx);
      const supabase = await getSupabase();
      let query = supabase.from("chat_messages").select("*").eq("session_id", args.sessionId).order("created_at", { ascending: true });
      if (args.limit) query = query.limit(args.limit);
      const { data } = await query;
      return (data ?? []).map(mapChatMessage);
    },

    flashcardSets: async (_: unknown, args: { subjectId?: string }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      let query = supabase.from("flashcard_sets").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (args.subjectId) query = query.eq("subject_id", args.subjectId);
      const { data } = await query;
      return (data ?? []).map((s: Record<string, unknown>) => mapFlashcardSet(s, []));
    },

    flashcardSet: async (_: unknown, args: { id: string }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data: set } = await supabase.from("flashcard_sets").select("*").eq("id", args.id).eq("user_id", userId).single();
      if (!set) return null;
      const { data: cards } = await supabase.from("flashcards").select("*").eq("set_id", args.id).eq("user_id", userId).order("created_at");
      return mapFlashcardSet(set, (cards ?? []).map(mapFlashcard));
    },

    flashcards: async (_: unknown, args: { subjectId?: string; dueOnly?: boolean }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      let query = supabase.from("flashcards").select("*").eq("user_id", userId).order("next_review");
      if (args.subjectId) query = query.eq("subject_id", args.subjectId);
      if (args.dueOnly) query = query.lte("next_review", new Date().toISOString());
      const { data } = await query;
      return (data ?? []).map(mapFlashcard);
    },

    rooms: async (_: unknown, __: unknown, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data } = await supabase.from("study_rooms").select("*").or(`owner_user_id.eq.${userId},is_public.eq.true`).order("updated_at", { ascending: false });
      return (data ?? []).map(mapStudyRoom);
    },

    room: async (_: unknown, args: { id: string }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data } = await supabase.from("study_rooms").select("*").eq("id", args.id).or(`owner_user_id.eq.${userId},is_public.eq.true`).single();
      return data ? mapStudyRoom(data) : null;
    },

    roomMembers: async (_: unknown, args: { roomId: string }, ctx: ContextType) => {
      requireAuth(ctx);
      const supabase = await getSupabase();
      const { data } = await supabase.from("study_room_members").select("*, profiles(name, avatar_url)").eq("room_id", args.roomId).order("joined_at");
      return (data ?? []).map(mapRoomMember);
    },

    roomMessages: async (_: unknown, args: { roomId: string; limit?: number }, ctx: ContextType) => {
      requireAuth(ctx);
      const supabase = await getSupabase();
      let query = supabase.from("study_room_messages").select("*, profiles(name, avatar_url)").eq("room_id", args.roomId).order("created_at", { ascending: true });
      if (args.limit) query = query.limit(args.limit);
      const { data } = await query;
      return (data ?? []).map(mapRoomMessage);
    },

    aiPersonality: async (_: unknown, __: unknown, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data } = await supabase.from("ai_personalities").select("*").eq("user_id", userId).single();
      return data ? mapAIPersonality(data) : null;
    },

    aiMemories: async (_: unknown, args: { type?: string; limit?: number }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      let query = supabase.from("ai_memory_fragments").select("*").eq("user_id", userId).order("importance", { ascending: false }).order("created_at", { ascending: false });
      if (args.type) query = query.eq("memory_type", args.type);
      if (args.limit) query = query.limit(args.limit);
      const { data } = await query;
      return (data ?? []).map(mapAIMemoryFragment);
    },

    aiMemorySummaries: async (_: unknown, __: unknown, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data } = await supabase.from("ai_memory_summaries").select("*").eq("user_id", userId).order("end_date", { ascending: false }).limit(10);
      return (data ?? []).map(mapAIMemorySummary);
    },

    agents: async () => {
      const supabase = await getSupabase();
      const { data } = await supabase.from("ai_agents").select("*").eq("enabled", true);
      return (data ?? []).map(mapAgent);
    },

    userAgents: async (_: unknown, __: unknown, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data } = await supabase.from("user_agents").select("*").eq("user_id", userId);
      return (data ?? []).map(mapUserAgent);
    },

    pendingConfirmations: async (_: unknown, __: unknown, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data } = await supabase.from("agent_confirmations").select("*").eq("user_id", userId).eq("status", "pending").order("created_at", { ascending: false });
      return (data ?? []).map(mapAgentConfirmation);
    },

    activityLog: async (_: unknown, args: { startDate?: string; endDate?: string }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      let query = supabase.from("activity_log").select("*").eq("user_id", userId).order("date", { ascending: false });
      if (args.startDate) query = query.gte("date", args.startDate);
      if (args.endDate) query = query.lte("date", args.endDate);
      const { data } = await query;
      return (data ?? []).map(mapActivityLog);
    },

    userPreferences: async (_: unknown, __: unknown, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data } = await supabase.from("user_preferences").select("*").eq("user_id", userId).single();
      return data ? mapUserPreferences(data) : null;
    },

    userSettings: async (_: unknown, __: unknown, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data } = await supabase.from("user_settings").select("*").eq("user_id", userId).single();
      return data ? mapUserSettings(data) : null;
    },

    workspaceEntities: async (_: unknown, args: { entityType?: string }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      let query = supabase.from("workspace_entities").select("*").eq("workspace_id", userId);
      if (args.entityType) query = query.eq("entity_type", args.entityType);
      const { data } = await query;
      return (data ?? []).map(mapWorkspaceEntity);
    },

    calendarIntegrations: async (_: unknown, __: unknown, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data } = await supabase.from("calendar_integrations").select("*").eq("user_id", userId);
      return (data ?? []).map(mapCalendarIntegration);
    },

    quizPerformance: async (_: unknown, args: { limit?: number }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      let query = supabase.from("quiz_performance").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (args.limit) query = query.limit(args.limit);
      const { data } = await query;
      return (data ?? []).map(mapQuizPerformance);
    },

    studySessions: async (_: unknown, args: { limit?: number }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      let query = supabase.from("study_sessions").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (args.limit) query = query.limit(args.limit);
      const { data } = await query;
      return (data ?? []).map(mapStudySessionRecord);
    },
  },

  // ─── Mutation resolvers ─────────────────────────────────────────────────
  Mutation: {
    updateProfile: async (_: unknown, args: { input: Record<string, unknown> }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data, error } = await supabase.from("profiles").update({ ...args.input, updated_at: new Date().toISOString() }).eq("id", userId).select().single();
      if (error) throw new Error(error.message);
      return mapProfile(data);
    },

    completeOnboarding: async (_: unknown, args: { input: Record<string, unknown> }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data, error } = await supabase.from("profiles").update({ ...args.input, onboarding_complete: true, updated_at: new Date().toISOString() }).eq("id", userId).select().single();
      if (error) throw new Error(error.message);
      return mapProfile(data);
    },

    createEvent: async (_: unknown, args: { input: Record<string, unknown> }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data, error } = await supabase.from("events").insert({ user_id: userId, ...args.input }).select().single();
      if (error) throw new Error(error.message);
      return mapEvent(data);
    },

    updateEvent: async (_: unknown, args: { id: string; input: Record<string, unknown> }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data, error } = await supabase.from("events").update(args.input).eq("id", args.id).eq("user_id", userId).select().single();
      if (error) throw new Error(error.message);
      return mapEvent(data);
    },

    deleteEvent: async (_: unknown, args: { id: string }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { error } = await supabase.from("events").delete().eq("id", args.id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      return true;
    },

    createDeadline: async (_: unknown, args: { input: Record<string, unknown> }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data, error } = await supabase.from("deadlines").insert({ user_id: userId, ...args.input }).select().single();
      if (error) throw new Error(error.message);
      return mapDeadline(data);
    },

    updateDeadline: async (_: unknown, args: { id: string; input: Record<string, unknown> }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data, error } = await supabase.from("deadlines").update(args.input).eq("id", args.id).eq("user_id", userId).select().single();
      if (error) throw new Error(error.message);
      return mapDeadline(data);
    },

    deleteDeadline: async (_: unknown, args: { id: string }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { error } = await supabase.from("deadlines").delete().eq("id", args.id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      return true;
    },

    createFlashcardSet: async (_: unknown, args: { input: { subjectId: string; name: string } }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data, error } = await supabase.from("flashcard_sets").insert({ user_id: userId, ...args.input }).select().single();
      if (error) throw new Error(error.message);
      return mapFlashcardSet(data, []);
    },

    deleteFlashcardSet: async (_: unknown, args: { id: string }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { error } = await supabase.from("flashcard_sets").delete().eq("id", args.id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      return true;
    },

    createFlashcard: async (_: unknown, args: { input: Record<string, unknown> }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data, error } = await supabase.from("flashcards").insert({ user_id: userId, ...args.input }).select().single();
      if (error) throw new Error(error.message);
      return mapFlashcard(data);
    },

    updateFlashcard: async (_: unknown, args: { id: string; input: Record<string, unknown> }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data, error } = await supabase.from("flashcards").update({ ...args.input, updated_at: new Date().toISOString() }).eq("id", args.id).eq("user_id", userId).select().single();
      if (error) throw new Error(error.message);
      return mapFlashcard(data);
    },

    deleteFlashcard: async (_: unknown, args: { id: string }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { error } = await supabase.from("flashcards").delete().eq("id", args.id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      return true;
    },

    reviewFlashcard: async (_: unknown, args: { input: { flashcardId: string; rating: number } }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { flashcardId, rating } = args.input;

      const { data: existing, error: fetchError } = await supabase.from("flashcards").select("*").eq("id", flashcardId).eq("user_id", userId).single();
      if (fetchError || !existing) throw new Error("Flashcard not found");

      const { interval_days, ease_factor, repetitions } = existing as Record<string, unknown>;
      let intervalDays = (interval_days as number) ?? 1;
      let easeFactor = parseFloat(ease_factor as string) ?? 2.5;
      let reps = (repetitions as number) ?? 0;

      if (rating < 3) {
        reps = 0;
        intervalDays = 1;
      } else {
        if (reps === 0) intervalDays = 1;
        else if (reps === 1) intervalDays = 6;
        else intervalDays = Math.round(intervalDays * easeFactor);
        reps += 1;
      }
      easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02)));

      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + intervalDays);

      const { data, error } = await supabase.from("flashcards").update({
        interval_days: intervalDays,
        ease_factor: String(easeFactor),
        repetitions: reps,
        next_review: nextReview.toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", flashcardId).eq("user_id", userId).select().single();
      if (error) throw new Error(error.message);

      await supabase.from("flashcard_reviews").insert({ user_id: userId, flashcard_id: flashcardId, rating });
      return mapFlashcard(data);
    },

    createRoom: async (_: unknown, args: { input: { title: string; topic?: string; visibility?: string } }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const joinCode = generateJoinCode();
      const { data: room, error: roomError } = await supabase.from("study_rooms").insert({
        owner_user_id: userId,
        title: args.input.title,
        topic: args.input.topic ?? null,
        visibility: args.input.visibility === "private" ? "private" : "public",
        join_code: joinCode,
        timer_state: "idle",
        timer_duration_seconds: 1500,
        timer_elapsed_seconds: 0,
      }).select().single();
      if (roomError || !room) throw new Error(roomError?.message ?? "Failed to create room");
      await supabase.from("study_room_members").insert({ room_id: room.id, user_id: userId, role: "host", is_online: true });
      return mapStudyRoom(room);
    },

    joinRoom: async (_: unknown, args: { input: { joinCode: string } }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data: room, error: roomError } = await supabase.from("study_rooms").select("*").eq("join_code", args.input.joinCode.toUpperCase()).single();
      if (roomError || !room) throw new Error("Room not found");
      const { error: memberError } = await supabase.from("study_room_members").insert({ room_id: room.id, user_id: userId, role: "member", is_online: true }).single();
      if (memberError && !memberError.message?.includes("duplicate")) throw new Error(memberError.message);
      return mapStudyRoom(room);
    },

    leaveRoom: async (_: unknown, args: { roomId: string }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { error } = await supabase.from("study_room_members").delete().eq("room_id", args.roomId).eq("user_id", userId);
      if (error) throw new Error(error.message);
      return true;
    },

    sendRoomMessage: async (_: unknown, args: { input: { roomId: string; content: string; messageType?: string } }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data, error } = await supabase.from("study_room_messages").insert({
        room_id: args.input.roomId,
        user_id: userId,
        content: args.input.content,
        message_type: args.input.messageType ?? "chat",
      }).select("*, profiles(name, avatar_url)").single();
      if (error) throw new Error(error.message);
      return mapRoomMessage(data);
    },

    updateAIPersonality: async (_: unknown, args: { input: Record<string, unknown> }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      const input = args.input;
      if (input.friendliness !== undefined) updateData.friendliness = Math.max(0, Math.min(100, input.friendliness as number));
      if (input.formality !== undefined) updateData.formality = Math.max(0, Math.min(100, input.formality as number));
      if (input.humor !== undefined) updateData.humor = Math.max(0, Math.min(100, input.humor as number));
      if (input.detailLevel !== undefined) updateData.detail_level = Math.max(0, Math.min(100, input.detailLevel as number));
      if (input.patience !== undefined) updateData.patience = Math.max(0, Math.min(100, input.patience as number));
      if (input.encouragement !== undefined) updateData.encouragement = Math.max(0, Math.min(100, input.encouragement as number));
      if (input.socraticMethod !== undefined) updateData.socratic_method = input.socraticMethod;
      if (input.stepByStep !== undefined) updateData.step_by_step = input.stepByStep;
      if (input.realWorldExamples !== undefined) updateData.real_world_examples = input.realWorldExamples;
      if (input.customInstructions !== undefined) updateData.custom_instructions = (input.customInstructions as string).slice(0, 2000);
      if (input.personaDescription !== undefined) updateData.persona_description = (input.personaDescription as string).slice(0, 1000);
      if (input.useEmojis !== undefined) updateData.use_emojis = input.useEmojis;
      if (input.useAnalogies !== undefined) updateData.use_analogies = input.useAnalogies;
      if (input.analogyFrequency !== undefined) updateData.analogy_frequency = Math.max(0, Math.min(5, input.analogyFrequency as number));
      if (input.useSectionDividers !== undefined) updateData.use_section_dividers = input.useSectionDividers;

      const { data: existing } = await supabase.from("ai_personalities").select("id").eq("user_id", userId).single();
      let data, error;
      if (existing) {
        ({ data, error } = await supabase.from("ai_personalities").update(updateData).eq("user_id", userId).select().single());
      } else {
        ({ data, error } = await supabase.from("ai_personalities").insert({ user_id: userId, ...updateData }).select().single());
      }
      if (error) throw new Error(error.message);
      return mapAIPersonality(data);
    },

    createMemory: async (_: unknown, args: { input: { content: string; memoryType: string; importance?: number; sessionId?: string } }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const validTypes = ["fact", "preference", "skill", "goal", "context"];
      if (!validTypes.includes(args.input.memoryType)) throw new Error("Invalid memory_type");
      const { data, error } = await supabase.from("ai_memory_fragments").insert({
        user_id: userId,
        content: args.input.content.slice(0, 5000),
        memory_type: args.input.memoryType,
        importance: Math.max(0, Math.min(1, args.input.importance ?? 0.5)),
        session_id: args.input.sessionId ?? null,
      }).select().single();
      if (error) throw new Error(error.message);
      return mapAIMemoryFragment(data);
    },

    updateMemory: async (_: unknown, args: { id: string; input: { importance?: number; reinforce?: boolean } }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const updateData: Record<string, unknown> = {};
      if (args.input.importance !== undefined) updateData.importance = Math.max(0, Math.min(1, args.input.importance));
      if (args.input.reinforce) {
        const { data: existing } = await supabase.from("ai_memory_fragments").select("reinforcement_count").eq("id", args.id).eq("user_id", userId).single();
        if (existing) {
          updateData.reinforcement_count = ((existing as Record<string, unknown>).reinforcement_count as number ?? 0) + 1;
          updateData.last_accessed_at = new Date().toISOString();
        }
      }
      if (Object.keys(updateData).length === 0) throw new Error("No valid update fields");
      const { error } = await supabase.from("ai_memory_fragments").update(updateData).eq("id", args.id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      return true;
    },

    deleteMemory: async (_: unknown, args: { id: string }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { error } = await supabase.from("ai_memory_fragments").delete().eq("id", args.id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      return true;
    },

    upsertSubjectData: async (_: unknown, args: { input: { subjectId: string; marks?: unknown; notes?: unknown } }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const payload: Record<string, unknown> = {
        user_id: userId,
        subject_id: args.input.subjectId,
        updated_at: new Date().toISOString(),
      };
      if (args.input.marks !== undefined) payload.marks = args.input.marks;
      if (args.input.notes !== undefined) payload.notes = args.input.notes;
      const { data, error } = await supabase.from("subject_data").upsert(payload, { onConflict: "user_id,subject_id" }).select().single();
      if (error) throw new Error(error.message);
      return mapSubjectData(data);
    },

    upsertCustomSubject: async (_: unknown, args: { input: { subjectId: string; customIcon?: string; customColor?: string; customCover?: string; customTitle?: string } }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data, error } = await supabase.from("custom_subjects").upsert({
        user_id: userId,
        subject_id: args.input.subjectId,
        custom_icon: args.input.customIcon ?? null,
        custom_color: args.input.customColor ?? null,
        custom_cover: args.input.customCover ?? null,
        custom_title: args.input.customTitle ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,subject_id" }).select().single();
      if (error) throw new Error(error.message);
      return mapCustomSubject(data);
    },

    updateUserPreferences: async (_: unknown, args: { input: { mood?: string; theme?: string } }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data, error } = await supabase.from("user_preferences").upsert({ user_id: userId, ...args.input, updated_at: new Date().toISOString() }, { onConflict: "user_id" }).select().single();
      if (error) throw new Error(error.message);
      return mapUserPreferences(data);
    },

    updateUserSettings: async (_: unknown, args: { input: { settings: unknown } }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { data, error } = await supabase.from("user_settings").upsert({ user_id: userId, settings: args.input.settings, updated_at: new Date().toISOString() }, { onConflict: "user_id" }).select().single();
      if (error) throw new Error(error.message);
      return mapUserSettings(data);
    },

    incrementActivity: async (_: unknown, __: unknown, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase.rpc("increment_activity", { p_user_id: userId, p_date: today });
      if (error) throw new Error(error.message);
      return true;
    },

    confirmAgentAction: async (_: unknown, args: { confirmationId: string; approved: boolean }, ctx: ContextType) => {
      const userId = requireAuth(ctx);
      const supabase = await getSupabase();
      const { error } = await supabase.from("agent_confirmations").update({
        status: args.approved ? "approved" : "rejected",
        responded_at: new Date().toISOString(),
      }).eq("id", args.confirmationId).eq("user_id", userId);
      if (error) throw new Error(error.message);
      return true;
    },
  },
};

// ─── Mapping functions ──────────────────────────────────────────────────────

function mapProfile(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: row.name as string | null,
    grade: row.grade as string | null,
    state: row.state as string | null,
    subjects: (row.subjects as string[]) ?? [],
    hobbies: (row.hobbies as string[]) ?? [],
    hobbyDetails: row.hobby_details,
    interests: row.interests,
    timezone: row.timezone as string | null,
    onboardingComplete: (row.onboarding_complete as boolean) ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUserStats(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    quizzesDone: (row.quizzes_done as number) ?? 0,
    currentStreak: (row.current_streak as number) ?? 0,
    accuracy: (row.accuracy as number) ?? 0,
    conversationsCount: (row.conversations_count as number) ?? 0,
    topSubject: row.top_subject as string | null,
    subjectCounts: row.subject_counts,
    updatedAt: row.updated_at,
  };
}

function mapSubjectData(row: Record<string, unknown>) {
  return { id: String(row.id), userId: String(row.user_id), subjectId: String(row.subject_id), marks: row.marks, notes: row.notes, updatedAt: row.updated_at };
}

function mapCustomSubject(row: Record<string, unknown>) {
  return { id: String(row.id), userId: String(row.user_id), subjectId: String(row.subject_id), customIcon: row.custom_icon, customColor: row.custom_color, customCover: row.custom_cover, customTitle: row.custom_title, createdAt: row.created_at, updatedAt: row.updated_at };
}

function mapEvent(row: Record<string, unknown>) {
  return { id: String(row.id), userId: String(row.user_id), title: String(row.title), date: row.date, endDate: row.end_date, type: row.type, subject: row.subject, location: row.location, description: row.description, color: row.color, source: row.source, createdAt: row.created_at };
}

function mapDeadline(row: Record<string, unknown>) {
  return { id: String(row.id), userId: String(row.user_id), title: String(row.title), dueDate: row.due_date, subject: row.subject, priority: row.priority, createdAt: row.created_at };
}

function mapAchievement(row: Record<string, unknown>) {
  return { id: String(row.id), userId: String(row.user_id), achievementId: String(row.achievement_id), unlockedAt: row.unlocked_at };
}

function mapChatSession(row: Record<string, unknown>) {
  return { id: String(row.id), userId: String(row.user_id), subjectId: String(row.subject_id), title: row.title, createdAt: row.created_at, updatedAt: row.updated_at };
}

function mapChatMessage(row: Record<string, unknown>) {
  return { id: String(row.id), sessionId: String(row.session_id), userId: String(row.user_id), role: String(row.role), content: String(row.content), createdAt: row.created_at };
}

function mapFlashcard(row: Record<string, unknown>) {
  return { id: String(row.id), userId: String(row.user_id), subjectId: String(row.subject_id), setId: row.set_id ? String(row.set_id) : null, front: String(row.front), back: String(row.back), sourceSessionId: row.source_session_id ? String(row.source_session_id) : null, nextReview: row.next_review, intervalDays: (row.interval_days as number) ?? 1, easeFactor: parseFloat(row.ease_factor as string) ?? 2.5, repetitions: (row.repetitions as number) ?? 0, createdAt: row.created_at, updatedAt: row.updated_at };
}

function mapFlashcardSet(row: Record<string, unknown>, cards: unknown[]) {
  return { id: String(row.id), userId: String(row.user_id), subjectId: String(row.subject_id), name: String(row.name), cards, cardCount: cards.length, createdAt: row.created_at, updatedAt: row.updated_at };
}

function mapStudyRoom(row: Record<string, unknown>) {
  return { id: String(row.id), title: String(row.title), description: row.description, subjectId: row.subject_id, ownerUserId: String(row.owner_user_id), isPublic: row.is_public, maxMembers: row.max_members, currentMembers: row.current_members, studyTopic: row.study_topic, studyNotes: row.study_notes, timerDuration: row.timer_duration, timerStartedAt: row.timer_started_at, timerPausedAt: row.timer_paused_at, timerElapsed: row.timer_elapsed, joinCode: row.join_code, visibility: row.visibility, memberCount: row.member_count, timerState: row.timer_state, timerDurationSeconds: row.timer_duration_seconds, timerElapsedSeconds: row.timer_elapsed_seconds, createdAt: row.created_at, updatedAt: row.updated_at };
}

function mapRoomMember(row: Record<string, unknown>) {
  const profile = row.profiles as Record<string, unknown> | null;
  const lastSeen = String(row.last_seen ?? row.joined_at);
  const lastSeenMs = new Date(lastSeen).getTime();
  const isRecent = Number.isFinite(lastSeenMs) && Date.now() - lastSeenMs < 45_000;
  return { id: String(row.id), roomId: String(row.room_id), userId: String(row.user_id), role: row.role, joinedAt: row.joined_at, lastSeen: row.last_seen, isOnline: (row.is_online as boolean) && isRecent, name: (profile?.name as string) ?? "Student", avatarUrl: (profile?.avatar_url as string) ?? null };
}

function mapRoomMessage(row: Record<string, unknown>) {
  const profile = row.profiles as Record<string, unknown> | null;
  return { id: String(row.id), roomId: String(row.room_id), userId: row.user_id ? String(row.user_id) : null, content: String(row.content), messageType: row.message_type, aiContext: row.ai_context, createdAt: row.created_at, name: row.message_type === "ai" ? "Analogix AI" : row.message_type === "system" ? "System" : ((profile?.name as string) ?? "Student"), avatarUrl: (profile?.avatar_url as string) ?? null };
}

function mapAIPersonality(row: Record<string, unknown>) {
  return { id: row.id ? String(row.id) : null, userId: row.user_id ? String(row.user_id) : null, friendliness: (row.friendliness as number) ?? 70, formality: (row.formality as number) ?? 30, humor: (row.humor as number) ?? 50, detailLevel: (row.detail_level as number) ?? 50, patience: (row.patience as number) ?? 70, encouragement: (row.encouragement as number) ?? 70, socraticMethod: (row.socratic_method as boolean) ?? false, stepByStep: (row.step_by_step as boolean) ?? true, realWorldExamples: (row.real_world_examples as boolean) ?? true, customInstructions: (row.custom_instructions as string) ?? "", personaDescription: (row.persona_description as string) ?? "", useEmojis: (row.use_emojis as boolean) ?? true, useAnalogies: (row.use_analogies as boolean) ?? true, analogyFrequency: (row.analogy_frequency as number) ?? 3, useSectionDividers: (row.use_section_dividers as boolean) ?? null, createdAt: row.created_at, updatedAt: row.updated_at };
}

function mapAIMemoryFragment(row: Record<string, unknown>) {
  return { id: String(row.id), userId: String(row.user_id), content: String(row.content), memoryType: String(row.memory_type), importance: parseFloat(row.importance as string) ?? 0.5, reinforcementCount: (row.reinforcement_count as number) ?? 1, lastAccessedAt: row.last_accessed_at, createdAt: row.created_at, sessionId: row.session_id ? String(row.session_id) : null };
}

function mapAIMemorySummary(row: Record<string, unknown>) {
  return { id: String(row.id), userId: String(row.user_id), summary: String(row.summary), topics: (row.topics as string[]) ?? [], subjectId: row.subject_id, startDate: row.start_date, endDate: row.end_date, conversationCount: (row.conversation_count as number) ?? 1, createdAt: row.created_at };
}

function mapAgent(row: Record<string, unknown>) {
  return { id: String(row.id), name: String(row.name), description: row.description, icon: row.icon, color: row.color, systemPrompt: String(row.system_prompt), enabled: row.enabled, createdAt: row.created_at, updatedAt: row.updated_at };
}

function mapUserAgent(row: Record<string, unknown>) {
  return { id: String(row.id), userId: String(row.user_id), agentId: String(row.agent_id), enabled: row.enabled, settings: row.settings, createdAt: row.created_at, updatedAt: row.updated_at };
}

function mapAgentConfirmation(row: Record<string, unknown>) {
  return { id: String(row.id), userId: String(row.user_id), agentId: String(row.agent_id), action: String(row.action), payload: row.payload, summary: String(row.summary), status: row.status, createdAt: row.created_at, expiresAt: row.expires_at, respondedAt: row.responded_at };
}

function mapActivityLog(row: Record<string, unknown>) {
  return { id: String(row.id), userId: String(row.user_id), date: String(row.date), count: (row.count as number) ?? 1, updatedAt: row.updated_at };
}

function mapUserPreferences(row: Record<string, unknown>) {
  return { userId: String(row.user_id), mood: row.mood, theme: row.theme, updatedAt: row.updated_at };
}

function mapUserSettings(row: Record<string, unknown>) {
  return { userId: String(row.user_id), settings: row.settings, createdAt: row.created_at, updatedAt: row.updated_at };
}

function mapWorkspaceEntity(row: Record<string, unknown>) {
  return { id: String(row.id), entityType: String(row.entity_type), workspaceId: String(row.workspace_id), entityId: String(row.entity_id), entityData: row.entity_data, metadata: row.metadata, relationships: row.relationships, tags: (row.tags as string[]) ?? [], createdAt: row.created_at, updatedAt: row.updated_at };
}

function mapCalendarIntegration(row: Record<string, unknown>) {
  return { id: String(row.id), userId: String(row.user_id), provider: String(row.provider), calendarId: row.calendar_id, expiresAt: row.expires_at, lastSyncAt: row.last_sync_at, syncEnabled: row.sync_enabled, createdAt: row.created_at, updatedAt: row.updated_at };
}

function mapQuizPerformance(row: Record<string, unknown>) {
  return { id: String(row.id), userId: String(row.user_id), subjectId: row.subject_id, score: row.score ? parseFloat(row.score as string) : null, correctAnswers: row.correct_answers, totalQuestions: row.total_questions, timeTaken: row.time_taken, questionsData: row.questions_data, createdAt: row.created_at };
}

function mapStudySessionRecord(row: Record<string, unknown>) {
  return { id: String(row.id), userId: String(row.user_id), type: row.type, duration: row.duration, activities: row.activities, createdAt: row.created_at };
}

function generateJoinCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}
