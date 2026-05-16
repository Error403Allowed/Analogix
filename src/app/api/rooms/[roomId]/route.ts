import { NextResponse } from "next/server";
import { getRoomState, requireRoomControl } from "@/lib/rooms/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await context.params;
    const state = await getRoomState(roomId);
    return NextResponse.json({
      room: state.room,
      members: state.members,
      messages: state.messages,
      canvas: state.canvas,
      sharedDocuments: state.sharedDocuments,
    });
  } catch (error) {
    console.error("[api/rooms/[roomId]] GET failed:", error);
    return NextResponse.json({ error: "Failed to load room" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await context.params;
    const { supabase } = await requireRoomControl(roomId);
    const body = await request.json();

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) payload.title = String(body.title || "").trim() || "Study room";
    if (body.topic !== undefined) payload.topic = body.topic ? String(body.topic).trim() : null;
    if (body.visibility !== undefined) {
      payload.visibility = body.visibility === "private" ? "private" : "public";
    }

    const { error } = await supabase.from("study_rooms").update(payload).eq("id", roomId);
    if (error) throw error;

    const state = await getRoomState(roomId);
    return NextResponse.json({ room: state.room });
  } catch (error) {
    console.error("[api/rooms/[roomId]] PATCH failed:", error);
    return NextResponse.json({ error: "Failed to update room" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await context.params;
    const { supabase } = await requireRoomControl(roomId);
    const { error } = await supabase.from("study_rooms").delete().eq("id", roomId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/rooms/[roomId]] DELETE failed:", error);
    return NextResponse.json({ error: "Failed to delete room" }, { status: 500 });
  }
}
