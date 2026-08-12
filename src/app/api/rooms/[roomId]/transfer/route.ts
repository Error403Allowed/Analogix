import { NextResponse } from "next/server";
import { getRoomState, requireRoomAccess } from "@/lib/rooms/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await context.params;
    const { supabase, user, isOwner } = await requireRoomAccess(roomId);
    if (!isOwner) {
      return NextResponse.json({ error: "Only the room owner can transfer ownership" }, { status: 403 });
    }

    const body = await request.json();
    const newOwnerUserId = typeof body.newOwnerUserId === "string" ? body.newOwnerUserId : "";
    if (!newOwnerUserId) {
      return NextResponse.json({ error: "newOwnerUserId is required" }, { status: 400 });
    }
    if (newOwnerUserId === user.id) {
      return NextResponse.json({ error: "The room already belongs to you" }, { status: 400 });
    }

    const { error } = await supabase.rpc("transfer_study_room_ownership", {
      p_room_id: roomId,
      p_new_owner_user_id: newOwnerUserId,
    });
    if (error) throw error;

    const state = await getRoomState(roomId);
    return NextResponse.json({
      room: state.room,
      members: state.members,
    });
  } catch (error) {
    console.error("[api/rooms/[roomId]/transfer] POST failed:", error);
    return NextResponse.json({ error: "Failed to transfer ownership" }, { status: 500 });
  }
}