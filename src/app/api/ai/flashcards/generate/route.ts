import { NextResponse } from "next/server";
import { runObject, z } from "@/lib/ai";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

const flashcardSchema = z.object({
  flashcards: z.array(
    z.object({
      front: z.string(),
      back: z.string(),
    }),
  ),
});

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

NUMBER REQUIREMENT - THIS IS CRITICAL:
- You MUST generate EXACTLY ${count} flashcards. Not 1, not 2, not 5 - EXACTLY ${count}.
- Each flashcard in the JSON array counts as one. You need ${count} entries in the array.
- If the conversation is short, create flashcards covering every concept mentioned, then supplement with related concepts from the same subject area.
- NEVER return fewer than ${count} flashcards.

CONTENT RULES:
- ONLY create flashcards about actual educational topics, concepts, theories, formulas, definitions, and subject matter.
- NEVER create flashcards about administrative details (due dates, deadlines, schedules, etc.).
- Do NOT default to maths-only flashcards. Cover diverse topics - definitions, concepts, processes, relationships, factual knowledge.
- Each flashcard tests ONE specific concept, term, formula, or fact.
- Front: a clear question or term (max 20 words).
- Back: a concise but complete answer (2-4 sentences). Use plain English for Year ${grade}.
- Do NOT create cards for small talk, greetings, or meta-discussion.
- Use Australian spelling and terminology.`;

    const result = await runObject<{ flashcards: Array<{ front: string; back: string }> }>({
      schema: flashcardSchema,
      system: systemPrompt,
      prompt: `Subject: ${subjectId}\n\nConversation:\n${conversationText}\n\nGenerate exactly ${count} flashcards.`,
      taskType: "default",
      temperature: 0.4,
      maxTokens: 4096,
    });

    const flashcards = (result?.flashcards ?? []).filter(
      (fc) => fc.front?.trim() && fc.back?.trim(),
    );

    return NextResponse.json({ flashcards });
  } catch (error) {
    console.error("[/api/ai/flashcards/generate] Error:", error);
    return NextResponse.json(
      { flashcards: [], error: error instanceof Error ? error.message : "Flashcard generation failed" },
      { status: 500 },
    );
  }
}
