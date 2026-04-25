import { NextResponse } from "next/server";
import { callGroqChat } from "@/app/api/groq/_utils";
import { getDocumentPreviewText, getDocumentPlainText } from "@/lib/document-content";
import { listDocumentsByIds } from "@/lib/server/documents";
import {
  getRoomCanvas,
  listRoomMessages,
  listRoomSharedDocuments,
  requireRoomMembership,
} from "@/lib/rooms/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await context.params;
    const { supabase, user, room } = await requireRoomMembership(roomId);
    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const [canvas, messages, sharedDocuments] = await Promise.all([
      getRoomCanvas(supabase, roomId),
      listRoomMessages(supabase, roomId, 20),
      listRoomSharedDocuments(supabase, roomId),
    ]);

    const sharedDocRows = await listDocumentsByIds(
      supabase,
      sharedDocuments.map((document) => document.documentId),
    );

    const sharedDocContext = sharedDocRows.length > 0
      ? sharedDocRows
          .map((document) => {
            const preview = getDocumentPreviewText(
              {
                content: document.content,
                contentJson: document.content_json,
                contentText: document.content_text,
                contentFormat: document.content_format,
                role: document.role,
                studyGuideData: document.study_guide_data,
              },
              420,
            );
            return `${document.title}: ${preview}`;
          })
          .join("\n")
      : "No shared documents.";

    const canvasText = canvas
      ? getDocumentPlainText({
          content: canvas.content,
          contentJson: canvas.contentJson,
        })
      : "";

    const recentMessages = messages
      .slice(-12)
      .map((message) => `${message.name}: ${message.content}`)
      .join("\n");

    const answer = await callGroqChat(
      {
        messages: [
          {
            role: "system",
            content: `You are Analogix AI inside a shared study room. Explain clearly to the whole group and keep answers useful for collaborative study.

Room title: ${String(room.title ?? "Study room")}
Room topic: ${typeof room.topic === "string" ? room.topic : "No topic set"}

Canvas notes:
${canvasText || "No canvas notes yet."}

Shared documents:
${sharedDocContext}

Recent room conversation:
${recentMessages || "No recent conversation."}

Answer as a tutor speaking to the group. Keep it concise but complete.`,
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 1400,
        temperature: 0.3,
      },
      "reasoning",
    );

    const now = new Date();
    const promptCreatedAt = now.toISOString();
    const answerCreatedAt = new Date(now.getTime() + 1).toISOString();

    const { error } = await supabase.from("study_room_messages").insert([
      {
        room_id: roomId,
        user_id: user.id,
        message_type: "chat",
        content: prompt,
        metadata: { scope: "ai" },
        created_at: promptCreatedAt,
      },
      {
        room_id: roomId,
        user_id: null,
        message_type: "ai",
        content: answer,
        metadata: { scope: "ai" },
        created_at: answerCreatedAt,
      },
    ]);
    if (error) throw error;

    const updatedMessages = await listRoomMessages(supabase, roomId);
    return NextResponse.json({ answer, messages: updatedMessages });
  } catch (error) {
    console.error("[api/rooms/[roomId]/ai] POST failed:", error);
    return NextResponse.json({ error: "Failed to ask room AI" }, { status: 500 });
  }
}
