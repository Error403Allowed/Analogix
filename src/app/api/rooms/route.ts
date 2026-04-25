import { NextResponse } from "next/server";
import { generateJoinCode, mapStudyRoom, requireServerUser } from "@/lib/rooms/server";

export async function GET() {
  try {
    const { supabase, user } = await requireServerUser();
    const [{ data: rooms, error: roomsError }, { data: memberships, error: membershipsError }] = await Promise.all([
      supabase.from("study_rooms").select("*").order("updated_at", { ascending: false }),
      supabase.from("study_room_members").select("room_id, role").eq("user_id", user.id),
    ]);

    if (roomsError) throw roomsError;
    if (membershipsError) throw membershipsError;

    const membershipMap = new Map(
      (memberships ?? []).map((row) => [String(row.room_id), String(row.role)]),
    );

    const mapped = (rooms ?? []).map((room) => {
      const viewerRole = String(room.owner_user_id) === user.id
        ? "host"
        : ((membershipMap.get(String(room.id)) ?? null) as "host" | "cohost" | "member" | null);
      return mapStudyRoom(room as Record<string, unknown>, viewerRole, String(room.owner_user_id) === user.id);
    });

    return NextResponse.json({
      rooms: mapped,
      publicRooms: mapped.filter((room) => room.visibility === "public"),
      memberRooms: mapped.filter((room) => room.isOwner || room.viewerRole),
    });
  } catch (error) {
    console.error("[api/rooms] GET failed:", error);
    return NextResponse.json({ error: "Failed to load rooms" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireServerUser();
    const body = await request.json();
    const title = typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : "Study room";
    const topic = typeof body.topic === "string" && body.topic.trim() ? body.topic.trim() : null;
    const visibility = body.visibility === "private" ? "private" : "public";

    let joinCode = generateJoinCode();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data: existing } = await supabase
        .from("study_rooms")
        .select("id")
        .eq("join_code", joinCode)
        .maybeSingle();
      if (!existing) break;
      joinCode = generateJoinCode();
    }

    const { data: room, error: roomError } = await supabase
      .from("study_rooms")
      .insert({
        owner_user_id: user.id,
        title,
        topic,
        visibility,
        join_code: joinCode,
        timer_state: "idle",
        timer_duration_seconds: 1500,
        timer_elapsed_seconds: 0,
      })
      .select("*")
      .single();

    if (roomError || !room) {
      throw roomError || new Error("Failed to create room");
    }

    const { error: memberError } = await supabase.from("study_room_members").insert({
      room_id: room.id,
      user_id: user.id,
      role: "host",
      is_online: true,
    });
    if (memberError) throw memberError;

    const { error: canvasError } = await supabase.from("study_room_canvas").insert({
      room_id: room.id,
      title: `${title} canvas`,
      content: "<p></p>",
      last_edited_by: user.id,
    });
    if (canvasError) throw canvasError;

    return NextResponse.json({
      room: mapStudyRoom(room as Record<string, unknown>, "host", true),
    });
  } catch (error) {
    console.error("[api/rooms] POST failed:", error);
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
