import { createClient } from "@/lib/supabase/server";
import type {
  RoomMemberRole,
  RoomSharedDocument,
  StudyRoom,
  StudyRoomCanvas,
  StudyRoomMember,
  StudyRoomMessage,
} from "@/types/rooms";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

function profileName(profile: Record<string, unknown> | null | undefined, fallback = "Student") {
  if (!profile) return fallback;
  if (typeof profile.full_name === "string" && profile.full_name.trim()) return profile.full_name;
  if (typeof profile.name === "string" && profile.name.trim()) return profile.name;
  return fallback;
}

export function mapStudyRoom(
  row: Record<string, unknown>,
  viewerRole?: RoomMemberRole | null,
  isOwner?: boolean,
): StudyRoom {
  return {
    id: String(row.id),
    title: String(row.title ?? "Untitled room"),
    topic: typeof row.topic === "string" ? row.topic : null,
    visibility: row.visibility === "public" ? "public" : "private",
    joinCode: String(row.join_code ?? ""),
    ownerUserId: String(row.owner_user_id ?? ""),
    memberCount: Number(row.member_count ?? 0),
    timerState:
      row.timer_state === "running" || row.timer_state === "paused" ? row.timer_state : "idle",
    timerDurationSeconds: Number(row.timer_duration_seconds ?? 1500),
    timerElapsedSeconds: Number(row.timer_elapsed_seconds ?? 0),
    timerStartedAt: typeof row.timer_started_at === "string" ? row.timer_started_at : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
    viewerRole: viewerRole ?? null,
    isOwner: Boolean(isOwner),
  };
}

export async function requireServerUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return { supabase, user };
}

export async function fetchProfilesMap(supabase: ServerSupabase, userIds: string[]) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return {};

  const { data, error } = await supabase.from("profiles").select("*").in("id", uniqueIds);
  if (error) {
    console.warn("[rooms] fetchProfilesMap failed:", error);
    return {};
  }

  return (data ?? []).reduce<Record<string, Record<string, unknown>>>((acc, row) => {
    acc[String(row.id)] = row as Record<string, unknown>;
    return acc;
  }, {});
}

export async function getRoomAccess(
  supabase: ServerSupabase,
  userId: string,
  roomId: string,
) {
  const [{ data: room }, { data: membership }] = await Promise.all([
    supabase.from("study_rooms").select("*").eq("id", roomId).maybeSingle(),
    supabase
      .from("study_room_members")
      .select("*")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (!room) {
    return null;
  }

  const isOwner = String(room.owner_user_id) === userId;
  const isMember = Boolean(membership);

  if (room.visibility !== "public" && !isOwner && !isMember) {
    return null;
  }

  const viewerRole = (isOwner ? "host" : membership?.role) as RoomMemberRole | null | undefined;

  return {
    room,
    membership,
    isOwner,
    viewerRole: viewerRole ?? null,
  };
}

export async function requireRoomAccess(roomId: string) {
  const { supabase, user } = await requireServerUser();
  const access = await getRoomAccess(supabase, user.id, roomId);

  if (!access) {
    throw new Error("Room not found");
  }

  return { supabase, user, ...access };
}

export async function requireRoomMembership(roomId: string) {
  const access = await requireRoomAccess(roomId);

  if (!access.isOwner && !access.membership) {
    throw new Error("Room membership required");
  }

  return access;
}

export async function requireRoomControl(roomId: string) {
  const access = await requireRoomMembership(roomId);
  const role = access.viewerRole;

  if (!access.isOwner && role !== "host" && role !== "cohost") {
    throw new Error("Host or co-host access required");
  }

  return access;
}

export async function listRoomMembers(
  supabase: ServerSupabase,
  roomId: string,
): Promise<StudyRoomMember[]> {
  const { data, error } = await supabase
    .from("study_room_members")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  if (error) {
    console.warn("[rooms] listRoomMembers failed:", error);
    return [];
  }

  const profiles = await fetchProfilesMap(
    supabase,
    (data ?? []).map((row) => String(row.user_id)),
  );

  return (data ?? []).map((row) => {
    const profile = profiles[String(row.user_id)];
    const lastSeen = String(row.last_seen ?? row.joined_at);
    const lastSeenMs = new Date(lastSeen).getTime();
    const isRecent = Number.isFinite(lastSeenMs) && Date.now() - lastSeenMs < 45_000;
    return {
      id: String(row.id),
      roomId: String(row.room_id),
      userId: String(row.user_id),
      role: row.role === "host" || row.role === "cohost" ? row.role : "member",
      joinedAt: String(row.joined_at),
      lastSeen,
      isOnline: Boolean(row.is_online) && isRecent,
      name: profileName(profile),
      avatarUrl: typeof profile?.avatar_url === "string" ? profile.avatar_url : null,
    };
  });
}

export async function listRoomMessages(
  supabase: ServerSupabase,
  roomId: string,
  limit = 100,
): Promise<StudyRoomMessage[]> {
  const { data, error } = await supabase
    .from("study_room_messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);

  if (error) {
    console.warn("[rooms] listRoomMessages failed:", error);
    return [];
  }

  const profiles = await fetchProfilesMap(
    supabase,
    (data ?? []).map((row) => String(row.user_id ?? "")).filter(Boolean),
  );

  return (data ?? []).map((row) => {
    const profile = row.user_id ? profiles[String(row.user_id)] : null;
    const metadata =
      typeof row.metadata === "object" && row.metadata ? (row.metadata as Record<string, unknown>) : null;

    return {
      id: String(row.id),
      roomId: String(row.room_id),
      userId: row.user_id ? String(row.user_id) : null,
      messageType:
        row.message_type === "ai" || row.message_type === "system" ? row.message_type : "chat",
      content: String(row.content ?? ""),
      createdAt: String(row.created_at),
      metadata,
      name:
        row.message_type === "ai"
          ? "Analogix AI"
          : row.message_type === "system"
            ? "System"
            : profileName(profile),
      avatarUrl: typeof profile?.avatar_url === "string" ? profile.avatar_url : null,
    };
  });
}

export async function getRoomCanvas(
  supabase: ServerSupabase,
  roomId: string,
): Promise<StudyRoomCanvas | null> {
  const { data, error } = await supabase
    .from("study_room_canvas")
    .select("*")
    .eq("room_id", roomId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.warn("[rooms] getRoomCanvas failed:", error);
    }
    return null;
  }

  return {
    roomId: String(data.room_id),
    title: String(data.title ?? "Room canvas"),
    content: String(data.content ?? "<p></p>"),
    contentJson: typeof data.content_json === "string" ? data.content_json : null,
    updatedAt: String(data.updated_at ?? new Date().toISOString()),
    lastEditedBy: data.last_edited_by ? String(data.last_edited_by) : null,
  };
}

export async function listRoomSharedDocuments(
  supabase: ServerSupabase,
  roomId: string,
): Promise<RoomSharedDocument[]> {
  const { data: shareRows, error } = await supabase
    .from("study_room_shared_documents")
    .select("*")
    .eq("room_id", roomId)
    .order("shared_at", { ascending: false });

  if (error) {
    console.warn("[rooms] listRoomSharedDocuments failed:", error);
    return [];
  }

  const documentIds = [...new Set((shareRows ?? []).map((row) => String(row.document_id)))];
  const { data: documents } =
    documentIds.length === 0
      ? { data: [] as Record<string, unknown>[] }
      : await supabase.from("documents").select("*").in("id", documentIds);

  const documentMap = (documents ?? []).reduce<Record<string, Record<string, unknown>>>((acc, row) => {
    acc[String(row.id)] = row as Record<string, unknown>;
    return acc;
  }, {});

  return (shareRows ?? [])
    .map((row) => {
      const document = documentMap[String(row.document_id)];
      if (!document) return null;

      return {
        id: String(row.id),
        roomId: String(row.room_id),
        documentId: String(row.document_id),
        subjectId: String(document.subject_id ?? ""),
        title: String(document.title ?? "Untitled"),
        role: document.role === "study-guide" ? "study-guide" : "notes",
        icon: typeof document.icon === "string" ? document.icon : null,
        cover: typeof document.cover === "string" ? document.cover : null,
        sharedBy: String(row.shared_by),
        sharedAt: String(row.shared_at),
        ownerUserId: String(document.owner_user_id ?? ""),
        updatedAt: String(document.updated_at ?? new Date().toISOString()),
      };
    })
    .filter((item): item is RoomSharedDocument => item !== null);
}

export function generateJoinCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export async function getRoomState(roomId: string) {
  const access = await requireRoomAccess(roomId);
  const [members, messages, canvas, sharedDocuments] = await Promise.all([
    listRoomMembers(access.supabase, roomId),
    listRoomMessages(access.supabase, roomId),
    getRoomCanvas(access.supabase, roomId),
    listRoomSharedDocuments(access.supabase, roomId),
  ]);

  return {
    ...access,
    room: mapStudyRoom(access.room as Record<string, unknown>, access.viewerRole, access.isOwner),
    members,
    messages,
    canvas,
    sharedDocuments,
  };
}
