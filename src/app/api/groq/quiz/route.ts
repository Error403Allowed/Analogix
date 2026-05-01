import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGroqChat } from "../_utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content, fileName, subject, count = 15 } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const prompt = `Generate ${count} multiple-choice quiz questions from the study content.

For each question:
- 4 options (A, B, C, D), one clearly correct
- Make wrong answers plausible traps
- Include explanation for correct answer
- Match exam style/level

OUTPUT (strict JSON):
{"questions": [{"question": "Q", "options": ["A", "B", "C", "D"], "correctIndex": 0-3, "explanation": "why correct"}]}`;

    const response = await callGroqChat(
      {
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: `Content:\n${content.slice(0, 10000)}\n\nGenerate ${count} quiz questions.` },
        ],
        max_tokens: 10000,
        temperature: 0.4,
      },
      "default"
    );

    const responseStr = typeof response === "string" ? response : String(response);
    
    // Parse JSON
    let questions: Array<{ question: string; options: string[]; correctIndex: number; explanation: string }> = [];
    try {
      const clean = responseStr.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      questions = parsed.questions || [];
    } catch {
      const match = responseStr.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          questions = JSON.parse(match[0]);
        } catch {
          // Failed
        }
      }
    }

    // Save to Supabase
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("documents")
      .insert({
        id: `quiz_${Date.now()}`,
        owner_user_id: user.id,
        subject_id: subject || "general",
        title: fileName ? `${fileName} - Quiz` : "Quiz",
        content: JSON.stringify(questions),
        role: "quiz",
        created_at: now,
        updated_at: now,
        last_edited_by: user.id,
      })
      .select()
      .single();

    if (error && !error.message.includes("duplicate")) {
      console.warn("Quiz save error:", error);
    }

    return NextResponse.json({
      questions,
      quizId: data?.id,
      count: questions.length,
    });

  } catch (error) {
    console.error("[/api/groq/quiz] Error:", error);
    return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 });
  }
}