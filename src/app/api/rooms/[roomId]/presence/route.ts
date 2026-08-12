import { NextResponse } from "next/server";
import { requireRoomMembership } from "@/lib/rooms/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await context.params;
    const { supabase, user } = await requireRoomMembership(roomId);
    const body = await request.json().catch(() => ({}));
    const isOnline = body?.online !== false;

    const { error } = await supabase
      .from("study_room_members")
      .update({
        is_online: isOnline,
        last_seen: new Date().toISOString(),
      })
      .eq("room_id", roomId)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/rooms/[roomId]/presence] POST failed:", error);
    return NextResponse.json({ error: "Failed to update presence" }, { status: 500 });
  }
}
