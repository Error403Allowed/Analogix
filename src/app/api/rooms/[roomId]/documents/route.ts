import { NextResponse } from "next/server";
import { getDocumentById } from "@/lib/server/documents";
import {
  listRoomSharedDocuments,
  requireRoomMembership,
} from "@/lib/rooms/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await context.params;
    const { supabase } = await requireRoomMembership(roomId);
    const documents = await listRoomSharedDocuments(supabase, roomId);
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("[api/rooms/[roomId]/documents] GET failed:", error);
    return NextResponse.json({ error: "Failed to load room documents" }, { status: 500 });
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
    const documentId = typeof body.documentId === "string" ? body.documentId : "";
    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    const document = await getDocumentById(supabase, documentId);
    if (!document || document.owner_user_id !== user.id) {
      return NextResponse.json({ error: "Only the document owner can share it to a room" }, { status: 403 });
    }

    const { error } = await supabase.from("study_room_shared_documents").upsert(
      {
        room_id: roomId,
        document_id: documentId,
        shared_by: user.id,
      },
      { onConflict: "room_id,document_id" },
    );
    if (error) throw error;

    const documents = await listRoomSharedDocuments(supabase, roomId);
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("[api/rooms/[roomId]/documents] POST failed:", error);
    return NextResponse.json({ error: "Failed to share document to room" }, { status: 500 });
  }
}
