import { NextResponse } from "next/server";
import { getRoomState, requireServerUser } from "@/lib/rooms/server";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireServerUser();
    const body = await request.json();
    const joinCode = typeof body.joinCode === "string" ? body.joinCode.trim() : "";
    const roomId = typeof body.roomId === "string" ? body.roomId.trim() : "";

    let resolvedRoomId = roomId;

    if (joinCode) {
      const { data, error } = await supabase.rpc("join_study_room_by_code", {
        p_join_code: joinCode,
      });
      if (error || !data) {
        throw error || new Error("Room not found");
      }
      resolvedRoomId = String(data);
    } else if (resolvedRoomId) {
      const { data: room, error: roomError } = await supabase
        .from("study_rooms")
        .select("id, visibility")
        .eq("id", resolvedRoomId)
        .maybeSingle();
      if (roomError || !room) {
        throw roomError || new Error("Room not found");
      }
      if (room.visibility !== "public") {
        return NextResponse.json({ error: "Private rooms require a join code" }, { status: 403 });
      }
      const { error: memberError } = await supabase.from("study_room_members").upsert(
        {
          room_id: resolvedRoomId,
          user_id: user.id,
          role: "member",
          last_seen: new Date().toISOString(),
          is_online: true,
        },
        { onConflict: "room_id,user_id" },
      );
      if (memberError) throw memberError;
    } else {
      return NextResponse.json({ error: "joinCode or roomId is required" }, { status: 400 });
    }

    const state = await getRoomState(resolvedRoomId);
    return NextResponse.json({
      room: state.room,
      members: state.members,
      messages: state.messages,
      canvas: state.canvas,
      sharedDocuments: state.sharedDocuments,
    });
  } catch (error) {
    console.error("[api/rooms/join] POST failed:", error);
    return NextResponse.json({ error: "Failed to join room" }, { status: 500 });
  }
}
