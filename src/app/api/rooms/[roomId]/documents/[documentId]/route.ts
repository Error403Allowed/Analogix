import { NextResponse } from "next/server";
import { getDocumentById } from "@/lib/server/documents";
import { listRoomSharedDocuments, requireRoomMembership } from "@/lib/rooms/server";

async function ensureSharedDocument(
  roomId: string,
  documentId: string,
) {
  const membership = await requireRoomMembership(roomId);
  const { supabase } = membership;
  const { data: share } = await supabase
    .from("study_room_shared_documents")
    .select("*")
    .eq("room_id", roomId)
    .eq("document_id", documentId)
    .maybeSingle();

  if (!share) {
    throw new Error("Document is not shared to this room");
  }

  return { ...membership, share };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ roomId: string; documentId: string }> },
) {
  try {
    const { roomId, documentId } = await context.params;
    const { supabase } = await ensureSharedDocument(roomId, documentId);
    const document = await getDocumentById(supabase, documentId);
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json({ document });
  } catch (error) {
    console.error("[api/rooms/[roomId]/documents/[documentId]] GET failed:", error);
    return NextResponse.json({ error: "Failed to load shared document" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ roomId: string; documentId: string }> },
) {
  try {
    const { roomId, documentId } = await context.params;
    const { supabase, user } = await ensureSharedDocument(roomId, documentId);
    const body = await request.json();

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      last_edited_by: user.id,
    };
    if (body.title !== undefined) payload.title = String(body.title || "").trim() || "Untitled";
    if (body.content !== undefined) payload.content = String(body.content ?? "");
    if (body.contentJson !== undefined) payload.content_json = body.contentJson;
    if (body.contentText !== undefined) payload.content_text = body.contentText;
    if (body.contentFormat !== undefined) payload.content_format = body.contentFormat;
    if (body.role !== undefined) payload.role = body.role === "study-guide" ? "study-guide" : "notes";

    const { error } = await supabase.from("documents").update(payload).eq("id", documentId);
    if (error) throw error;

    const document = await getDocumentById(supabase, documentId);
    return NextResponse.json({ document });
  } catch (error) {
    console.error("[api/rooms/[roomId]/documents/[documentId]] PATCH failed:", error);
    return NextResponse.json({ error: "Failed to update shared document" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ roomId: string; documentId: string }> },
) {
  try {
    const { roomId, documentId } = await context.params;
    const { supabase, user, isOwner, share } = await ensureSharedDocument(roomId, documentId);
    const document = await getDocumentById(supabase, documentId);
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const canRemove = isOwner || document.owner_user_id === user.id || String(share.shared_by) === user.id;
    if (!canRemove) {
      return NextResponse.json({ error: "Only the host, sharer, or owner can remove a shared document" }, { status: 403 });
    }

    const { error } = await supabase
      .from("study_room_shared_documents")
      .delete()
      .eq("room_id", roomId)
      .eq("document_id", documentId);
    if (error) throw error;

    const documents = await listRoomSharedDocuments(supabase, roomId);
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("[api/rooms/[roomId]/documents/[documentId]] DELETE failed:", error);
    return NextResponse.json({ error: "Failed to remove shared document" }, { status: 500 });
  }
}
