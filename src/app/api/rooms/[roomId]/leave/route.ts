import { NextResponse } from "next/server";
import { requireRoomMembership } from "@/lib/rooms/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await context.params;
    const { supabase, user, isOwner } = await requireRoomMembership(roomId);

    if (isOwner) {
      const { error } = await supabase.from("study_rooms").delete().eq("id", roomId);
      if (error) throw error;
      return NextResponse.json({ success: true, deletedRoom: true });
    }

    const { error } = await supabase
      .from("study_room_members")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", user.id);
    if (error) throw error;

    return NextResponse.json({ success: true, deletedRoom: false });
  } catch (error) {
    console.error("[api/rooms/[roomId]/leave] POST failed:", error);
    return NextResponse.json({ error: "Failed to leave room" }, { status: 500 });
  }
}
