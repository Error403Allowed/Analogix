import { NextResponse } from "next/server";
import { callGroqChat, formatError } from "../_utils";
import { requireUser, unauthResponse } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json();
    const conversationText: string = body.conversationText || "";
    const subjectId: string = body.subjectId || "general";
    const grade: string = body.grade || "7-12";
    const count: number = Math.max(8, Math.min(body.count || 8, 15));

    const systemPrompt = `You are an expert educator creating flashcards from a tutoring conversation.

Your job: Extract EXACTLY ${count} key concepts from the conversation and turn them into clear, concise flashcards.

NUMBER REQUIREMENT — THIS IS CRITICAL:
- You MUST generate EXACTLY ${count} flashcards. Not 1, not 2, not 5 — EXACTLY ${count}.
- Each flashcard in the JSON array counts as one. You need ${count} entries in the array.
- If the conversation is short, create flashcards covering every concept mentioned, then supplement with related concepts from the same subject area.
- NEVER return fewer than ${count} flashcards.

CONTENT RULES:
- ONLY create flashcards about actual educational topics, concepts, theories, formulas, definitions, and subject matter.
- NEVER create flashcards about administrative details (due dates, deadlines, schedules, etc.).
- Do NOT default to maths-only flashcards. Cover diverse topics — definitions, concepts, processes, relationships, factual knowledge.
- Each flashcard tests ONE specific concept, term, formula, or fact.
- Front: a clear question or term (max 20 words).
- Back: a concise but complete answer (2-4 sentences). Use plain English for Year ${grade}.
- Do NOT create cards for small talk, greetings, or meta-discussion.
- Use Australian spelling and terminology.

Return ONLY valid JSON with this exact structure (no markdown, no preamble, no explanation):
{"flashcards":[{"front":"What is...","back":"It is..."},{"front":"Define...","back":"..."}]}

The JSON array MUST contain exactly ${count} flashcard objects.`;

    const content = await callGroqChat(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Subject: ${subjectId}\n\nConversation:\n${conversationText}\n\nGenerate exactly ${count} flashcards.` },
        ],
        max_tokens: 4096,
        temperature: 0.4,
      },
      "default"
    );

    // Parse JSON from response with multiple strategies
    let flashcards: Array<{ front: string; back: string }> = [];
    
    try {
      const clean = content.replace(/```(?:json)?\s*|\s*```/g, "").trim();
      const parsed = JSON.parse(clean);
      flashcards = parsed.flashcards || [];
    } catch {
      try {
        const objMatch = content.match(/\{[\s\S]*\}/);
        if (objMatch) {
          const parsed = JSON.parse(objMatch[0]);
          flashcards = parsed.flashcards || [];
        }
      } catch {
        const fcMatch = content.match(/"flashcards"\s*:\s*(\[[\s\S]*\])/);
        if (fcMatch) {
          try {
            flashcards = JSON.parse(fcMatch[1]);
          } catch { /* skip */ }
        }
      }
    }

    flashcards = flashcards.filter(
      (fc) => fc.front?.trim() && fc.back?.trim()
    );

    console.log(`[flashcard] Generated ${flashcards.length} cards (requested ${count})`);

    return NextResponse.json({ flashcards });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/groq/flashcard] Error:", message);
    return NextResponse.json({ flashcards: [], error: message }, { status: 500 });
  }
}
