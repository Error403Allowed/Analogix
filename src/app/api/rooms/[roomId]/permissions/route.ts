import { NextResponse } from "next/server";
import { mapStudyRoom, requireRoomControl } from "@/lib/rooms/server";
import {
  DEFAULT_ROOM_PERMISSIONS,
  type RoomPermissions,
} from "@/types/rooms";

const PERMISSION_KEYS: (keyof RoomPermissions)[] = [
  "canShareDocuments",
  "canInviteMembers",
  "canManageRoles",
  "canDeleteMessages",
  "canControlTimer",
];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await context.params;
    const { supabase, room, viewerRole, isOwner } = await requireRoomControl(roomId);
    const body = await request.json();

    const stored: Record<string, unknown> =
      typeof room.permissions === "object" && room.permissions ? room.permissions : {};
    const permissions: RoomPermissions = { ...DEFAULT_ROOM_PERMISSIONS, ...stored };

    for (const key of PERMISSION_KEYS) {
      if (typeof body[key] === "boolean") permissions[key] = body[key];
    }

    const { data: updatedRoom, error } = await supabase
      .from("study_rooms")
      .update({ permissions, updated_at: new Date().toISOString() })
      .eq("id", roomId)
      .select("*")
      .single();
    if (error || !updatedRoom) throw error || new Error("Failed to save permissions");

    return NextResponse.json({
      room: mapStudyRoom(updatedRoom, viewerRole, isOwner),
    });
  } catch (error) {
    console.error("[api/rooms/[roomId]/permissions] PATCH failed:", error);
    return NextResponse.json({ error: "Failed to save permissions" }, { status: 500 });
  }
}