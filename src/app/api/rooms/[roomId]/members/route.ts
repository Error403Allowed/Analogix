import { NextResponse } from "next/server";
import { listRoomMembers, requireRoomMembership } from "@/lib/rooms/server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await context.params;
    const { supabase, user, isOwner } = await requireRoomMembership(roomId);
    if (!isOwner) {
      return NextResponse.json({ error: "Only the room host can change roles" }, { status: 403 });
    }

    const body = await request.json();
    const targetUserId = typeof body.userId === "string" ? body.userId : "";
    const role = body.role === "cohost" ? "cohost" : "member";
    if (!targetUserId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    if (targetUserId === user.id) {
      return NextResponse.json({ error: "The host role cannot be reassigned" }, { status: 400 });
    }

    const { error } = await supabase
      .from("study_room_members")
      .update({ role, last_seen: new Date().toISOString() })
      .eq("room_id", roomId)
      .eq("user_id", targetUserId);
    if (error) throw error;

    const members = await listRoomMembers(supabase, roomId);
    return NextResponse.json({ members });
  } catch (error) {
    console.error("[api/rooms/[roomId]/members] PATCH failed:", error);
    return NextResponse.json({ error: "Failed to update room member" }, { status: 500 });
  }
}
