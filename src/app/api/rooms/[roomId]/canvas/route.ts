import { NextResponse } from "next/server";
import { getRoomCanvas, requireRoomMembership } from "@/lib/rooms/server";
import { sanitizeHtml } from "@/lib/sanitize";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await context.params;
    const { supabase, user } = await requireRoomMembership(roomId);
    const body = await request.json();

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      last_edited_by: user.id,
    };

    if (body.title !== undefined) payload.title = String(body.title || "").trim() || "Room canvas";
    if (body.content !== undefined) payload.content = sanitizeHtml(String(body.content ?? ""));
    if (body.contentJson !== undefined) payload.content_json = body.contentJson;

    const { error } = await supabase.from("study_room_canvas").upsert({
      room_id: roomId,
      ...payload,
    });
    if (error) throw error;

    const canvas = await getRoomCanvas(supabase, roomId);
    return NextResponse.json({ canvas });
  } catch (error) {
    console.error("[api/rooms/[roomId]/canvas] PATCH failed:", error);
    return NextResponse.json({ error: "Failed to update room canvas" }, { status: 500 });
  }
}
