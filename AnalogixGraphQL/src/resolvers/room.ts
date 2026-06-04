import { GraphQLError } from "graphql";
import { requireUser } from "./_helpers.js";
import type { GraphQLContext } from "../context.js";

export const roomResolvers = {
  Query: {
    rooms: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!.from("study_rooms").select("*").order("updated_at", { ascending: false });
      if (error) throw new GraphQLError(error.message);
      return (data ?? []).map((r) => mapRoom(r, user.id));
    },
    publicRooms: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!
        .from("study_rooms")
        .select("*")
        .eq("visibility", "public")
        .order("updated_at", { ascending: false });
      if (error) throw new GraphQLError(error.message);
      return (data ?? []).map((r) => mapRoom(r, user.id));
    },
    room: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!.from("study_rooms").select("*").eq("id", args.id).maybeSingle();
      if (error) throw new GraphQLError(error.message);
      return data ? mapRoom(data, user.id) : null;
    },
    roomMembers: async (_: unknown, args: { roomId: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      await requireRoomMember(ctx, args.roomId, user.id);
      const { data, error } = await ctx.supabase!.from("study_room_members").select("*").eq("room_id", args.roomId);
      if (error) throw new GraphQLError(error.message);
      return (data ?? []).map((m) => ({
        id: m.id,
        roomId: m.room_id,
        userId: m.user_id,
        role: m.role,
        name: "",
        avatarUrl: null,
        isOnline: Boolean(m.is_online),
        lastSeen: m.last_seen,
      }));
    },
    roomMessages: async (_: unknown, args: { roomId: string; limit?: number }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      await requireRoomMember(ctx, args.roomId, user.id);
      const { data, error } = await ctx.supabase!
        .from("study_room_messages")
        .select("*")
        .eq("room_id", args.roomId)
        .order("created_at", { ascending: true })
        .limit(args.limit ?? 100);
      if (error) throw new GraphQLError(error.message);
      return (data ?? []).map((m) => ({
        id: m.id,
        roomId: m.room_id,
        userId: m.user_id,
        messageType: m.message_type,
        content: m.content,
        name: "",
        avatarUrl: null,
        createdAt: m.created_at,
      }));
    },
    roomCanvas: async (_: unknown, args: { roomId: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      await requireRoomMember(ctx, args.roomId, user.id);
      const { data, error } = await ctx.supabase!.from("study_room_canvas").select("*").eq("room_id", args.roomId).maybeSingle();
      if (error) throw new GraphQLError(error.message);
      return data
        ? {
            roomId: data.room_id,
            title: data.title,
            content: data.content,
            contentJson: data.content_json,
            updatedAt: data.updated_at,
            lastEditedBy: data.last_edited_by,
          }
        : null;
    },
    roomDocuments: async (_: unknown, args: { roomId: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      await requireRoomMember(ctx, args.roomId, user.id);
      const { data, error } = await ctx.supabase!.from("room_shared_documents").select("*").eq("room_id", args.roomId);
      if (error) throw new GraphQLError(error.message);
      return (data ?? []).map((d) => ({
        id: d.id,
        roomId: d.room_id,
        documentId: d.document_id,
        subjectId: d.subject_id,
        title: d.title,
        role: d.role,
        icon: d.icon,
        cover: d.cover,
        sharedBy: d.shared_by,
        sharedAt: d.shared_at,
        ownerUserId: d.owner_user_id,
        updatedAt: d.updated_at,
      }));
    },
  },

  Mutation: {
    createRoom: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const title = typeof args.input.title === "string" && args.input.title.trim() ? args.input.title : "Study room";
      const visibility = args.input.visibility === "private" ? "private" : "public";
      const joinCode = generateJoinCode();
      const { data, error } = await ctx.supabase!
        .from("study_rooms")
        .insert({
          id: crypto.randomUUID(),
          title,
          topic: typeof args.input.topic === "string" ? args.input.topic : null,
          visibility,
          join_code: joinCode,
          owner_user_id: user.id,
          member_count: 1,
          timer_state: "idle",
          timer_duration_seconds: 1500,
          timer_elapsed_seconds: 0,
          timer_started_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return mapRoom(data, user.id);
    },
    joinRoom: async (_: unknown, args: { joinCode: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data: room, error } = await ctx.supabase!.from("study_rooms").select("*").eq("join_code", args.joinCode).maybeSingle();
      if (error) throw new GraphQLError(error.message);
      if (!room) throw new GraphQLError("Room not found");
      await ctx.supabase!.from("study_room_members").upsert(
        {
          id: crypto.randomUUID(),
          room_id: room.id,
          user_id: user.id,
          role: "member",
          joined_at: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          is_online: true,
        },
        { onConflict: "room_id,user_id" }
      );
      await ctx.supabase!.rpc("increment_room_member_count", { p_room_id: room.id });
      return mapRoom(room, user.id);
    },
    leaveRoom: async (_: unknown, args: { roomId: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { error } = await ctx.supabase!.from("study_room_members").delete().eq("room_id", args.roomId).eq("user_id", user.id);
      if (error) throw new GraphQLError(error.message);
      await ctx.supabase!.rpc("decrement_room_member_count", { p_room_id: args.roomId });
      return { success: true };
    },
    updateRoomTimer: async (
      _: unknown,
      args: { roomId: string; state: string; durationSeconds?: number; elapsedSeconds?: number },
      ctx: GraphQLContext
    ) => {
      const user = requireUser(ctx);
      await requireRoomMember(ctx, args.roomId, user.id);
      const { data, error } = await ctx.supabase!
        .from("study_rooms")
        .update({
          timer_state: args.state,
          timer_duration_seconds: args.durationSeconds ?? 1500,
          timer_elapsed_seconds: args.elapsedSeconds ?? 0,
          timer_started_at: args.state === "running" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", args.roomId)
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      const room = mapRoom(data, user.id);
      await ctx.pubsub.publish(`room.${args.roomId}.timer`, { roomTimerUpdated: room });
      return room;
    },
    shareDocumentToRoom: async (_: unknown, args: { roomId: string; documentId: string; subjectId: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      await requireRoomMember(ctx, args.roomId, user.id);
      const { data: doc, error: docError } = await ctx.supabase!
        .from("documents")
        .select("*")
        .eq("id", args.documentId)
        .eq("owner_user_id", user.id)
        .maybeSingle();
      if (docError || !doc) throw new GraphQLError("Document not found");
      const now = new Date().toISOString();
      const { data, error } = await ctx.supabase!
        .from("room_shared_documents")
        .insert({
          id: crypto.randomUUID(),
          room_id: args.roomId,
          document_id: args.documentId,
          subject_id: args.subjectId,
          title: doc.title,
          role: doc.role ?? "notes",
          icon: doc.icon,
          cover: doc.cover,
          shared_by: user.id,
          shared_at: now,
          owner_user_id: user.id,
          updated_at: now,
        })
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return {
        id: data.id,
        roomId: data.room_id,
        documentId: data.document_id,
        subjectId: data.subject_id,
        title: data.title,
        role: data.role,
        icon: data.icon,
        cover: data.cover,
        sharedBy: data.shared_by,
        sharedAt: data.shared_at,
        ownerUserId: data.owner_user_id,
        updatedAt: data.updated_at,
      };
    },
    sendRoomMessage: async (_: unknown, args: { roomId: string; content: string; messageType?: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      await requireRoomMember(ctx, args.roomId, user.id);
      const now = new Date().toISOString();
      const { data, error } = await ctx.supabase!
        .from("study_room_messages")
        .insert({
          id: crypto.randomUUID(),
          room_id: args.roomId,
          user_id: user.id,
          message_type: args.messageType ?? "chat",
          content: args.content,
          created_at: now,
        })
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      const msg = {
        id: data.id,
        roomId: data.room_id,
        userId: data.user_id,
        messageType: data.message_type,
        content: data.content,
        name: "",
        avatarUrl: null,
        createdAt: data.created_at,
      };
      await ctx.pubsub.publish(`room.${args.roomId}.messages`, { roomMessageSent: msg });
      return msg;
    },
  },

  Subscription: {
    roomMessagesStream: {
      subscribe: (_: unknown, args: { roomId: string }, ctx: GraphQLContext) =>
        ctx.pubsub.asyncIterator([`room.${args.roomId}.messages` as const]) as unknown as AsyncIterator<unknown>,
    },
    roomPresenceStream: {
      subscribe: (_: unknown, args: { roomId: string }, ctx: GraphQLContext) =>
        ctx.pubsub.asyncIterator([`room.${args.roomId}.presence` as const]) as unknown as AsyncIterator<unknown>,
    },
    roomTimerStream: {
      subscribe: (_: unknown, args: { roomId: string }, ctx: GraphQLContext) =>
        ctx.pubsub.asyncIterator([`room.${args.roomId}.timer` as const]) as unknown as AsyncIterator<unknown>,
    },
  },

  StudyRoom: {
    // Mobile-facing convenience resolvers — fetch members / messages / shared docs on demand.
    members: async (parent: { id: string }, _: unknown, ctx: GraphQLContext) => {
      const { data, error } = await ctx.supabase!.from("study_room_members").select("*").eq("room_id", parent.id);
      if (error) throw new GraphQLError(error.message);
      return (data ?? []).map((m) => ({
        id: m.id,
        roomId: m.room_id,
        userId: m.user_id,
        role: m.role,
        name: "",
        avatarUrl: null,
        isOnline: Boolean(m.is_online),
        lastSeen: m.last_seen,
        _userId: m.user_id,
      }));
    },
    messages: async (parent: { id: string }, _: unknown, ctx: GraphQLContext) => {
      const { data, error } = await ctx.supabase!
        .from("study_room_messages")
        .select("*")
        .eq("room_id", parent.id)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw new GraphQLError(error.message);
      return (data ?? []).map((m) => ({
        id: m.id,
        roomId: m.room_id,
        userId: m.user_id,
        messageType: m.message_type,
        content: m.content,
        name: "",
        avatarUrl: null,
        createdAt: m.created_at,
        text: m.content,
        _userId: m.user_id,
      }));
    },
    documents: async (parent: { id: string }, _: unknown, ctx: GraphQLContext) => {
      const { data, error } = await ctx.supabase!.from("room_shared_documents").select("*").eq("room_id", parent.id);
      if (error) throw new GraphQLError(error.message);
      return (data ?? []).map((d) => ({
        id: d.id,
        roomId: d.room_id,
        documentId: d.document_id,
        subjectId: d.subject_id,
        title: d.title,
        role: d.role,
        icon: d.icon,
        cover: d.cover,
        sharedBy: d.shared_by,
        sharedAt: d.shared_at,
        ownerUserId: d.owner_user_id,
        updatedAt: d.updated_at,
      }));
    },
  },

  StudyRoomMember: {
    user: async (parent: { _userId?: string; userId: string }, _: unknown, ctx: GraphQLContext) => {
      const userId = parent._userId ?? parent.userId;
      const { data } = await ctx.supabase!.from("profiles").select("id, name, avatar_url").eq("id", userId).maybeSingle();
      return data
        ? { id: data.id, name: data.name, avatarUrl: data.avatar_url }
        : { id: userId, name: null, avatarUrl: null };
    },
  },

  StudyRoomMessage: {
    user: async (parent: { _userId?: string; userId: string | null }, _: unknown, ctx: GraphQLContext) => {
      const userId = parent._userId ?? parent.userId;
      if (!userId) return null;
      const { data } = await ctx.supabase!.from("profiles").select("id, name, avatar_url").eq("id", userId).maybeSingle();
      return data
        ? { id: data.id, name: data.name, avatarUrl: data.avatar_url }
        : { id: userId, name: null, avatarUrl: null };
    },
  },
};

async function requireRoomMember(
  ctx: GraphQLContext,
  roomId: string,
  userId: string
): Promise<void> {
  if (!ctx.supabase) throw new GraphQLError("Authentication required");
  const { data: room } = await ctx.supabase.from("study_rooms").select("owner_user_id").eq("id", roomId).maybeSingle();
  if (!room) throw new GraphQLError("Room not found");
  if (room.owner_user_id === userId) return;
  const { data: member } = await ctx.supabase
    .from("study_room_members")
    .select("id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!member) throw new GraphQLError("Not a member of this room");
}

function mapRoom(row: Record<string, unknown>, userId: string) {
  const isOwner = row.owner_user_id === userId;
  return {
    id: String(row.id),
    title: String(row.title ?? "Study room"),
    topic: (row.topic as string | null) ?? null,
    visibility: String(row.visibility ?? "public"),
    joinCode: String(row.join_code ?? ""),
    ownerUserId: String(row.owner_user_id),
    memberCount: Number(row.member_count ?? 1),
    timerState: String(row.timer_state ?? "idle"),
    timerDurationSeconds: Number(row.timer_duration_seconds ?? 1500),
    timerElapsedSeconds: Number(row.timer_elapsed_seconds ?? 0),
    timerStartedAt: (row.timer_started_at as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    viewerRole: isOwner ? "host" : null,
    isOwner,
    // Mobile-facing convenience fields
    name: String(row.title ?? "Study room"),
    subject: (row.topic as string | null) ?? null,
  };
}

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}
