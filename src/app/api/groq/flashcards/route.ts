import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGroqChat } from "../_utils";
import { buildFullCurriculumPrompt } from "@/lib/curriculum";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content, fileName, subject, count = 15, grade = "7" } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Build curriculum context
    const gradeNum = parseInt(grade, 10) || 7;
    const curriculumPrompt = subject && gradeNum >= 7 && gradeNum <= 10
      ? buildFullCurriculumPrompt(subject, gradeNum)
      : "";
    const curriculumSection = curriculumPrompt
      ? `\n\nYou have deep knowledge of the ACARA Australian Curriculum for ${subject} Year ${gradeNum}. Use this to ensure flashcards align with curriculum standards.\n\n${curriculumPrompt}`
      : "";

    const prompt = `You are an expert educational content creator.${curriculumSection}

Generate ${count} high-quality flashcards from the following study content.

Each flashcard must:
- Have a clear question (front) and answer (back)
- Be testable in 10-30 seconds
- Use exact terminology from the source
- Focus on exam-relevant content

OUTPUT (strict JSON):
{"flashcards": [{"front": "Question", "back": "Answer"}, ...]}`;

    const response = await callGroqChat(
      {
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: `Content:\n${content.slice(0, 10000)}\n\nGenerate ${count} flashcards.` },
        ],
        max_tokens: 8000,
        temperature: 0.4,
      },
      "default"
    );

    const responseStr = typeof response === "string" ? response : String(response);
    
    // Parse JSON
    let flashcards: Array<{ front: string; back: string }> = [];
    try {
      const clean = responseStr.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      flashcards = parsed.flashcards || [];
    } catch {
      // Try extraction
      const match = responseStr.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          flashcards = JSON.parse(match[0]);
        } catch {
          // Failed
        }
      }
    }

    // Save to Supabase
    const now = new Date().toISOString();
    const cardDocs = flashcards.slice(0, count).map((card: { front: string; back: string }, idx: number) => ({
      id: `card_${Date.now()}_${idx}`,
      owner_user_id: user.id,
      subject_id: subject || "general",
      title: `Flashcard ${idx + 1}`,
      content: JSON.stringify(card),
      role: "flashcard",
      created_at: now,
      updated_at: now,
      last_edited_by: user.id,
    }));

    if (cardDocs.length > 0) {
      const { error } = await supabase.from("documents").insert(cardDocs);
      if (error) console.warn("Flashcard save error:", error);
    }

    return NextResponse.json({
      flashcards,
      count: flashcards.length,
    });

  } catch (error) {
    console.error("[/api/groq/flashcards] Error:", error);
    return NextResponse.json({ error: "Failed to generate flashcards" }, { status: 500 });
  }
}