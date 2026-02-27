import { NextResponse } from "next/server";
import { callHfChat, formatError } from "../_utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const conversationText: string = body.conversationText || "";
    const subjectId: string = body.subjectId || "general";
    const grade: string = body.grade || "7-12";
    const count: number = Math.min(body.count || 5, 10);

    const systemPrompt = `You are an expert educator creating flashcards from a tutoring conversation.

Your job: Extract ${count} key concepts from the provided conversation and turn them into clear, concise flashcards.

Rules:
- Each flashcard should test ONE specific concept, term, formula, or fact.
- Front: a clear question or term (not too long — max 20 words).
- Back: a concise but complete answer (2-4 sentences max). Use plain English appropriate for Year ${grade}.
- Do NOT create cards for small talk, greetings, or meta-discussion.
- Cover the most important and testable concepts from the conversation.
- Use Australian spelling and terminology.

Return ONLY valid JSON with this exact structure (no markdown, no preamble):
{
  "flashcards": [
    { "front": "What is...", "back": "It is..." },
    { "front": "Define...", "back": "..." }
  ]
}`;

    const content = await callHfChat(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Subject: ${subjectId}\n\nConversation:\n${conversationText}` },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      },
      "default"
    );

    // Parse JSON from response
    let flashcards: Array<{ front: string; back: string }> = [];
    try {
      const clean = content.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      flashcards = parsed.flashcards || [];
    } catch {
      // Fallback: try extracting JSON from within the response
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          flashcards = parsed.flashcards || [];
        } catch {}
      }
    }

    return NextResponse.json({ flashcards });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/hf/flashcard] Error:", message);
    return NextResponse.json({ flashcards: [], error: message }, { status: 500 });
  }
}
