import { NextResponse } from "next/server";
import { listRoomMessages, requireRoomMembership } from "@/lib/rooms/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await context.params;
    const { supabase } = await requireRoomMembership(roomId);
    const messages = await listRoomMessages(supabase, roomId);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("[api/rooms/[roomId]/messages] GET failed:", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await context.params;
    const { supabase, user } = await requireRoomMembership(roomId);
    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    const { error } = await supabase.from("study_room_messages").insert({
      room_id: roomId,
      user_id: user.id,
      message_type: "chat",
      content,
      metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
    });
    if (error) throw error;

    const messages = await listRoomMessages(supabase, roomId);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("[api/rooms/[roomId]/messages] POST failed:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
