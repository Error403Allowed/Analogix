import { NextResponse } from "next/server";
import { mapStudyRoom, requireRoomControl } from "@/lib/rooms/server";

const currentElapsedSeconds = (room: Record<string, unknown>) => {
  const base = Number(room.timer_elapsed_seconds ?? 0);
  if (room.timer_state !== "running" || typeof room.timer_started_at !== "string") {
    return base;
  }
  const startedAt = new Date(room.timer_started_at).getTime();
  if (!Number.isFinite(startedAt)) return base;
  return base + Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await context.params;
    const { supabase, room, viewerRole, isOwner } = await requireRoomControl(roomId);
    const body = await request.json();
    const action = typeof body.action === "string" ? body.action : "start";
    const durationSeconds = Math.max(60, Number(body.durationSeconds ?? room.timer_duration_seconds ?? 1500));
    const nowIso = new Date().toISOString();
    const elapsed = currentElapsedSeconds(room as Record<string, unknown>);

    let payload: Record<string, unknown>;

    switch (action) {
      case "pause":
        payload = {
          timer_state: "paused",
          timer_elapsed_seconds: elapsed,
          timer_started_at: null,
          updated_at: nowIso,
        };
        break;
      case "resume":
        payload = {
          timer_state: "running",
          timer_started_at: nowIso,
          updated_at: nowIso,
        };
        break;
      case "reset":
        payload = {
          timer_state: "idle",
          timer_duration_seconds: durationSeconds,
          timer_elapsed_seconds: 0,
          timer_started_at: null,
          updated_at: nowIso,
        };
        break;
      case "start":
      default:
        payload = {
          timer_state: "running",
          timer_duration_seconds: durationSeconds,
          timer_elapsed_seconds: 0,
          timer_started_at: nowIso,
          updated_at: nowIso,
        };
        break;
    }

    const { data: updatedRoom, error } = await supabase
      .from("study_rooms")
      .update(payload)
      .eq("id", roomId)
      .select("*")
      .single();
    if (error || !updatedRoom) throw error || new Error("Failed to update timer");

    return NextResponse.json({
      room: mapStudyRoom(updatedRoom as Record<string, unknown>, viewerRole, isOwner),
    });
  } catch (error) {
    console.error("[api/rooms/[roomId]/timer] PATCH failed:", error);
    return NextResponse.json({ error: "Failed to update timer" }, { status: 500 });
  }
}
