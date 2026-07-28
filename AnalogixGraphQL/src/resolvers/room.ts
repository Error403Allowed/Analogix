import { GraphQLError } from "graphql";
import { requireUser, throwSanitized } from "./_helpers.js";
import type { GraphQLContext } from "../context.js";

export const roomResolvers = {
  Query: {
    rooms: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!
        .from("study_rooms")
        .select("*")
        .or(`owner_user_id.eq.${user.id},visibility.eq.public`)
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throwSanitized(error, ctx);
      return (data ?? []).map((r) => mapRoom(r, user.id));
    },
    publicRooms: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!
        .from("study_rooms")
        .select("*")
        .eq("visibility", "public")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throwSanitized(error, ctx);
      return (data ?? []).map((r) => mapRoom(r, user.id));
    },
    room: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      await requireRoomMember(ctx, args.id, user.id);
      const { data, error } = await ctx.supabase!.from("study_rooms").select("*").eq("id", args.id).maybeSingle();
      if (error) throwSanitized(error, ctx);
      return data ? mapRoom(data, user.id) : null;
    },
    publicRoomInfo: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!.from("study_rooms").select("*").eq("id", args.id).maybeSingle();
      if (error) throwSanitized(error, ctx);
      if (!data) throw new GraphQLError("Room not found");
      if (data.visibility !== "public") throw new GraphQLError("Room is not public");
      return mapRoom(data, user.id);
    },
    roomMembers: async (_: unknown, args: { roomId: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      await requireRoomMember(ctx, args.roomId, user.id);
      const data = await ctx.loaders!.roomMembersByRoomId.load(args.roomId);
      return data.map((m) => ({
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
      if (error) throwSanitized(error, ctx);
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
      if (error) throwSanitized(error, ctx);
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
      const shareRows = await ctx.loaders!.roomSharedDocumentsByRoomId.load(args.roomId);
      return resolveRoomSharedDocuments(ctx, shareRows);
    },
    roomDocument: async (_: unknown, args: { roomId: string; documentId: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      await requireRoomMember(ctx, args.roomId, user.id);
      const shareRows = await ctx.loaders!.roomSharedDocumentsByRoomId.load(args.roomId);
      const shared = shareRows.find((d: any) => String(d.document_id) === args.documentId);
      if (!shared) throw new GraphQLError("Document not shared to this room");
      const { data, error } = await ctx.supabase!
        .from("documents")
        .select("*")
        .eq("id", args.documentId)
        .maybeSingle();
      if (error || !data) throwSanitized(error ?? new Error("Document not found"), ctx);
      return {
        id: data.id,
        subjectId: data.subject_id,
        title: data.title,
        content: data.content,
        contentJson: data.content_json,
        contentText: data.content_text,
        contentFormat: data.content_format,
        role: data.role,
        icon: data.icon,
        cover: data.cover,
        createdAt: data.created_at,
        lastUpdated: data.updated_at,
        lastEditedBy: data.last_edited_by,
      };
    },
  },

  Mutation: {
    deleteRoom: async (_: unknown, args: { roomId: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const role = await getUserRoleInRoom(ctx, args.roomId, user.id);
      if (role !== "host" && role !== "cohost") {
        throw new GraphQLError("Only the host or a co-host can delete this room");
      }
      const { error } = await ctx.supabase!.from("study_rooms").delete().eq("id", args.roomId);
      if (error) throwSanitized(error, ctx);
      return { success: true };
    },
    createRoom: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const title = typeof args.input.title === "string" && args.input.title.trim() ? args.input.title : "Study room";
      const visibility = args.input.visibility === "private" ? "private" : "public";
      const joinCode = generateJoinCode();
      const now = new Date().toISOString();
      const { data, error } = await ctx.supabase!
        .from("study_rooms")
        .insert({
          id: crypto.randomUUID(),
          title,
          topic: typeof args.input.topic === "string" ? args.input.topic : null,
          visibility,
          join_code: joinCode,
          owner_user_id: user.id,
          timer_state: "idle",
          timer_duration_seconds: 1500,
          timer_elapsed_seconds: 0,
          timer_started_at: null,
          permissions: JSON.stringify({
            canShareDocuments: true,
            canInviteMembers: false,
            canManageRoles: false,
            canDeleteMessages: false,
            canControlTimer: false,
          }),
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();
      if (error) throwSanitized(error, ctx);

      await ctx.supabase!.from("study_room_members").insert({
        room_id: data.id,
        user_id: user.id,
        role: "host",
        is_online: true,
      });

      await ctx.supabase!.from("study_room_canvas").insert({
        room_id: data.id,
        title: `${title} canvas`,
        content: "<p></p>",
        last_edited_by: user.id,
      });

      return mapRoom(data, user.id);
    },
    joinRoom: async (_: unknown, args: { joinCode?: string; roomId?: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      let room: Record<string, unknown> | null = null;

      if (args.joinCode) {
        const { data, error } = await ctx.supabase!.from("study_rooms").select("*").eq("join_code", args.joinCode).maybeSingle();
        if (error || !data) throw new GraphQLError("Room not found");
        room = data;
      } else if (args.roomId) {
        const { data, error } = await ctx.supabase!.from("study_rooms").select("*").eq("id", args.roomId).maybeSingle();
        if (error || !data) throw new GraphQLError("Room not found");
        if (data.visibility !== "public") throw new GraphQLError("Private rooms require a join code");
        room = data;
      } else {
        throw new GraphQLError("joinCode or roomId is required");
      }

      const { error: upsertError } = await ctx.supabase!.from("study_room_members").upsert(
        {
          id: crypto.randomUUID(),
          room_id: (room as Record<string, unknown>).id,
          user_id: user.id,
          role: "member",
          joined_at: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          is_online: true,
        },
        { onConflict: "room_id,user_id" }
      );
      if (upsertError) throwSanitized(upsertError, ctx);
      const { data: updatedRoom } = await ctx.supabase!.from("study_rooms").select("*").eq("id", (room as Record<string, unknown>).id).single();
      const presenceMember = {
        id: crypto.randomUUID(),
        roomId: (room as Record<string, unknown>).id,
        userId: user.id,
        role: "member",
        name: "",
        avatarUrl: null,
        isOnline: true,
        lastSeen: new Date().toISOString(),
        user: null,
      };
      await ctx.pubsub.publish(`room.${(room as Record<string, unknown>).id}.presence`, { roomPresenceStream: presenceMember });
      return mapRoom(updatedRoom ?? (room as Record<string, unknown>), user.id);
    },
    leaveRoom: async (_: unknown, args: { roomId: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { error } = await ctx.supabase!.from("study_room_members").delete().eq("room_id", args.roomId).eq("user_id", user.id);
      if (error) throwSanitized(error, ctx);
      const leaveEvent = {
        id: crypto.randomUUID(),
        roomId: args.roomId,
        userId: user.id,
        role: "",
        name: "",
        avatarUrl: null,
        isOnline: false,
        lastSeen: new Date().toISOString(),
        user: null,
      };
      await ctx.pubsub.publish(`room.${args.roomId}.presence`, { roomPresenceStream: leaveEvent }).catch(() => {});
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
      if (error) throwSanitized(error, ctx);
      const room = mapRoom(data, user.id);
      await ctx.pubsub.publish(`room.${args.roomId}.timer`, { roomTimerStream: room });
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
        .from("study_room_shared_documents")
        .insert({
          id: crypto.randomUUID(),
          room_id: args.roomId,
          document_id: args.documentId,
          shared_by: user.id,
          shared_at: now,
        })
        .select()
        .single();
      if (error) throwSanitized(error, ctx);
      return {
        id: data.id,
        roomId: data.room_id,
        documentId: data.document_id,
        subjectId: args.subjectId,
        title: doc.title ?? "Untitled",
        role: doc.role ?? "notes",
        icon: doc.icon,
        cover: doc.cover,
        sharedBy: data.shared_by,
        sharedAt: data.shared_at,
        ownerUserId: user.id,
        updatedAt: now,
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
      if (error) throwSanitized(error, ctx);
      const { data: profile } = await ctx.supabase!.from("profiles").select("id, name, avatar_url").eq("id", user.id).maybeSingle();
      const msg = {
        id: data.id,
        roomId: data.room_id,
        userId: data.user_id,
        messageType: data.message_type,
        content: data.content,
        name: profile?.name ?? "",
        avatarUrl: profile?.avatar_url ?? null,
        createdAt: data.created_at,
        user: profile
          ? { id: profile.id, name: profile.name, avatarUrl: profile.avatar_url }
          : { id: user.id, name: null, avatarUrl: null },
      };
      await ctx.pubsub.publish(`room.${args.roomId}.messages`, { roomMessagesStream: msg });
      return msg;
    },
    updateRoomMemberRole: async (_: unknown, args: { roomId: string; userId: string; role: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const callerRole = await getUserRoleInRoom(ctx, args.roomId, user.id);
      if (callerRole !== "host" && callerRole !== "cohost") {
        throw new GraphQLError("Only the host or a co-host can change roles");
      }
      if (!["member", "cohost"].includes(args.role)) {
        throw new GraphQLError("Invalid role. Must be 'member' or 'cohost'");
      }
      if (callerRole === "cohost" && args.role === "cohost") {
        throw new GraphQLError("Co-hosts cannot promote members to co-host");
      }
      const { data, error } = await ctx.supabase!
        .from("study_room_members")
        .update({ role: args.role })
        .eq("room_id", args.roomId)
        .eq("user_id", args.userId)
        .select()
        .single();
      if (error) throwSanitized(error, ctx);
      const member = {
        id: data.id,
        roomId: data.room_id,
        userId: data.user_id,
        role: data.role,
        name: data.name ?? "",
        avatarUrl: data.avatar_url,
        isOnline: data.is_online ?? false,
        lastSeen: data.last_seen,
        user: null,
      };
      await ctx.pubsub.publish(`room.${args.roomId}.presence`, { roomPresenceStream: member });
      return member;
    },

    updateRoomCanvas: async (_: unknown, args: { roomId: string; input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      await requireRoomMember(ctx, args.roomId, user.id);
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString(), last_edited_by: user.id };
      if (typeof args.input.title === "string") updates.title = args.input.title;
      if (typeof args.input.content === "string") updates.content = args.input.content;
      if (typeof args.input.contentJson === "string") updates.content_json = args.input.contentJson;
      const { data, error } = await ctx.supabase!
        .from("study_room_canvas")
        .update(updates)
        .eq("room_id", args.roomId)
        .select()
        .single();
      if (error) throwSanitized(error, ctx);
      return {
        roomId: data.room_id,
        title: data.title,
        content: data.content,
        contentJson: data.content_json,
        updatedAt: data.updated_at,
        lastEditedBy: data.last_edited_by,
      };
    },

    updateRoom: async (_: unknown, args: { roomId: string; input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      await requireRoomMember(ctx, args.roomId, user.id);
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (args.input.title !== undefined) payload.title = String(args.input.title || "").trim() || "Study room";
      if (args.input.topic !== undefined) payload.topic = args.input.topic ? String(args.input.topic).trim() : null;
      if (args.input.visibility !== undefined) {
        payload.visibility = args.input.visibility === "private" ? "private" : "public";
      }
      const { data, error } = await ctx.supabase!
        .from("study_rooms")
        .update(payload)
        .eq("id", args.roomId)
        .select()
        .single();
      if (error) throwSanitized(error, ctx);
      return mapRoom(data, user.id);
    },

    removeSharedDocument: async (_: unknown, args: { roomId: string; documentId: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      await requireRoomMember(ctx, args.roomId, user.id);
      const { data: share } = await ctx.supabase!
        .from("study_room_shared_documents")
        .select("*")
        .eq("room_id", args.roomId)
        .eq("document_id", args.documentId)
        .maybeSingle();
      if (!share) throw new GraphQLError("Document not shared to this room");
      const { error: deleteError } = await ctx.supabase!
        .from("study_room_shared_documents")
        .delete()
        .eq("room_id", args.roomId)
        .eq("document_id", args.documentId);
      if (deleteError) throwSanitized(deleteError, ctx);
      const shareRows = await ctx.loaders!.roomSharedDocumentsByRoomId.load(args.roomId);
      return resolveRoomSharedDocuments(ctx, shareRows);
    },

    updatePresence: async (_: unknown, args: { roomId: string; isOnline: boolean }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      await requireRoomMember(ctx, args.roomId, user.id);
      const { error } = await ctx.supabase!
        .from("study_room_members")
        .update({
          is_online: args.isOnline,
          last_seen: new Date().toISOString(),
        })
        .eq("room_id", args.roomId)
        .eq("user_id", user.id);
      if (error) throwSanitized(error, ctx);
      await ctx.pubsub.publish(`room.${args.roomId}.presence`, {
        roomPresenceStream: {
          id: crypto.randomUUID(),
          roomId: args.roomId,
          userId: user.id,
          role: "",
          name: "",
          avatarUrl: null,
          isOnline: args.isOnline,
          lastSeen: new Date().toISOString(),
          user: null,
        },
      }).catch(() => {});
      return { success: true };
    },
  },

  Subscription: {
    roomMessagesStream: {
      subscribe: async (_: unknown, args: { roomId: string }, ctx: GraphQLContext) => {
        const user = requireUser(ctx);
        await requireRoomMember(ctx, args.roomId, user.id);
        return ctx.pubsub.asyncIterableIterator([`room.${args.roomId}.messages`]);
      },
    },
    roomPresenceStream: {
      subscribe: async (_: unknown, args: { roomId: string }, ctx: GraphQLContext) => {
        const user = requireUser(ctx);
        await requireRoomMember(ctx, args.roomId, user.id);
        return ctx.pubsub.asyncIterableIterator([`room.${args.roomId}.presence`]);
      },
    },
    roomTimerStream: {
      subscribe: async (_: unknown, args: { roomId: string }, ctx: GraphQLContext) => {
        const user = requireUser(ctx);
        await requireRoomMember(ctx, args.roomId, user.id);
        return ctx.pubsub.asyncIterableIterator([`room.${args.roomId}.timer`]);
      },
    },
  },

  StudyRoom: {
    // Mobile-facing convenience resolvers — fetch members / messages / shared docs on demand.
    members: async (parent: { id: string }, _: unknown, ctx: GraphQLContext) => {
      const data = await ctx.loaders!.roomMembersByRoomId.load(parent.id);
      const userIds = [...new Set(data.map((m: any) => m.user_id).filter(Boolean))];
      const profiles = userIds.length > 0
        ? await Promise.all(userIds.map((uid) => ctx.loaders!.profileById.load(uid)))
        : [];
      const profileMap = new Map(profiles.filter(Boolean).map((p: any) => [p.id, p]));
      return data.map((m: any) => {
        const profile = profileMap.get(m.user_id);
        return {
          id: m.id,
          roomId: m.room_id,
          userId: m.user_id,
          role: m.role,
          name: profile?.name ?? "",
          avatarUrl: profile?.avatar_url ?? null,
          isOnline: Boolean(m.is_online),
          lastSeen: m.last_seen,
          user: profile
            ? { id: profile.id, name: profile.name, avatarUrl: profile.avatar_url }
            : { id: m.user_id, name: null, avatarUrl: null },
        };
      });
    },
    messages: async (parent: { id: string }, args: { limit?: number }, ctx: GraphQLContext) => {
      const limit = Math.min(args.limit ?? 50, 200);
      const { data, error } = await ctx.supabase!
        .from("study_room_messages")
        .select("*")
        .eq("room_id", parent.id)
        .order("created_at", { ascending: true })
        .limit(limit);
      if (error) throwSanitized(error, ctx);
      const userIds = [...new Set((data ?? []).map((m: any) => m.user_id).filter(Boolean))];
      const profiles = userIds.length > 0
        ? await Promise.all(userIds.map((uid) => ctx.loaders!.profileById.load(uid)))
        : [];
      const profileMap = new Map(profiles.filter(Boolean).map((p: any) => [p.id, p]));
      return (data ?? []).map((m: any) => {
        const profile = profileMap.get(m.user_id);
        return {
          id: m.id,
          roomId: m.room_id,
          userId: m.user_id,
          messageType: m.message_type,
          content: m.content,
          name: profile?.name ?? "",
          avatarUrl: profile?.avatar_url ?? null,
          createdAt: m.created_at,
          text: m.content,
          user: profile
            ? { id: profile.id, name: profile.name, avatarUrl: profile.avatar_url }
            : m.user_id ? { id: m.user_id, name: null, avatarUrl: null } : null,
        };
      });
    },
    documents: async (parent: { id: string }, _: unknown, ctx: GraphQLContext) => {
      const shareRows = await ctx.loaders!.roomSharedDocumentsByRoomId.load(parent.id);
      return resolveRoomSharedDocuments(ctx, shareRows);
    },
    canvas: async (parent: { id: string }, _: unknown, ctx: GraphQLContext) => {
      const { data, error } = await ctx.supabase!
        .from("study_room_canvas")
        .select("*")
        .eq("room_id", parent.id)
        .maybeSingle();
      if (error || !data) return null;
      return {
        roomId: data.room_id,
        title: data.title,
        content: data.content,
        contentJson: data.content_json,
        updatedAt: data.updated_at,
        lastEditedBy: data.last_edited_by,
      };
    },
  },

  StudyRoomMember: {
    user: (parent: { user?: { id: string; name: string | null; avatarUrl: string | null } | null }) => parent.user ?? null,
  },

  StudyRoomMessage: {
    user: (parent: { user?: { id: string; name: string | null; avatarUrl: string | null } | null }) => parent.user ?? null,
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
  let permissions = {
    canShareDocuments: true,
    canInviteMembers: false,
    canManageRoles: false,
    canDeleteMessages: false,
    canControlTimer: false,
  };
  if (typeof row.permissions === "object" && row.permissions) {
    const p = row.permissions as Record<string, unknown>;
    permissions = {
      canShareDocuments: p.canShareDocuments !== false,
      canInviteMembers: p.canInviteMembers === true,
      canManageRoles: p.canManageRoles === true,
      canDeleteMessages: p.canDeleteMessages === true,
      canControlTimer: p.canControlTimer === true,
    };
  }
  return {
    id: String(row.id),
    title: String(row.title ?? "Study room"),
    topic: (row.topic as string | null) ?? null,
    visibility: String(row.visibility ?? "public"),
    joinCode: String(row.join_code ?? ""),
    ownerUserId: String(row.owner_user_id),
    memberCount: Number(row.member_count ?? 1),
    permissions,
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

async function getUserRoleInRoom(ctx: GraphQLContext, roomId: string, userId: string): Promise<string | null> {
  const { data: room } = await ctx.supabase!.from("study_rooms").select("owner_user_id").eq("id", roomId).maybeSingle();
  if (!room) return null;
  if (room.owner_user_id === userId) return "host";
  const { data: member } = await ctx.supabase!
    .from("study_room_members")
    .select("role")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();
  return member?.role ?? null;
}

async function resolveRoomSharedDocuments(ctx: GraphQLContext, shareRows: any[]) {
  shareRows.sort((a: any, b: any) => new Date(b.shared_at).getTime() - new Date(a.shared_at).getTime());
  const documentIds = [...new Set(shareRows.map((d: any) => String(d.document_id)))];
  const documents = documentIds.length > 0
    ? await Promise.all(documentIds.map((did) => ctx.loaders!.documentsById.load(did)))
    : [];
  const documentMap = new Map(documents.filter(Boolean).map((d: any) => [String(d.id), d]));
  return shareRows.map((d: any) => {
    const doc = documentMap.get(String(d.document_id));
    return {
      id: String(d.id),
      roomId: String(d.room_id),
      documentId: String(d.document_id),
      subjectId: String(doc?.subject_id ?? ""),
      title: String(doc?.title ?? "Untitled"),
      role: doc?.role === "study-guide" ? "study-guide" : "notes",
      icon: typeof doc?.icon === "string" ? doc.icon : null,
      cover: typeof doc?.cover === "string" ? doc.cover : null,
      sharedBy: String(d.shared_by),
      sharedAt: String(d.shared_at),
      ownerUserId: String(doc?.owner_user_id ?? ""),
      updatedAt: String(doc?.updated_at ?? new Date().toISOString()),
    };
  });
}
