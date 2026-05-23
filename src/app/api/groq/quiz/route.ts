import { NextResponse } from "next/server";
import { callGroqChat, formatError } from "../_utils";
import type { QuizData } from "@/types/quiz";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input: string = body.input || "";
    const userContext = body.userContext || {};
    const numberOfQuestions: number = body.numberOfQuestions || 5;
    const options = body.options || {};

    const topic = input || userContext?.subject || "general";
    const grade = userContext?.grade || "7";
    const subject = userContext?.subject || "";
    const difficulty = userContext?.difficulty || "intermediate";
    const hobbies: string[] = userContext?.hobbies || [];
    const avoidQuestions: string[] = options?.avoidQuestions || [];

    const gradeNum = parseInt(grade, 10) || 7;

    const difficultyDesc: Record<string, string> = {
      foundational: "Basic recall and understanding questions",
      intermediate: "Standard curriculum-level questions requiring application",
      advanced: "Complex analysis and synthesis questions",
    };

    const hobbiesStr = hobbies.length > 0
      ? `\n\nStudent interests: ${hobbies.join(", ")}. Use these to create relatable examples where appropriate.`
      : "";

    const avoidStr = avoidQuestions.length > 0
      ? `\n\nAVOID these questions (already seen): ${avoidQuestions.slice(-20).join(" | ")}`
      : "";

    const systemPrompt = `You are an expert quiz creator for Australian secondary students.

Generate exactly ${numberOfQuestions} multiple-choice quiz questions about "${topic}" at Year ${gradeNum} level.

Difficulty: ${difficultyDesc[difficulty] || difficultyDesc.intermediate}${hobbiesStr}${avoidStr}

For each question:
- 4 options (A, B, C, D) with exactly one correct
- Make wrong answers plausible (common misconceptions)
- Include a clear explanation for the correct answer
- Use Australian English spelling
- Include an "analogy" field: a short, relatable analogy that helps students connect the concept to everyday experiences (use student hobbies/interests when available)
- Include a "hint" field: a brief hint to guide students toward the answer without giving it away

Return ONLY valid JSON — no markdown, no preamble:
{
  "quiz": {
    "title": "Quiz on ${topic}",
    "subject": "${subject || topic}",
    "questions": [
      {
        "id": 1,
        "question": "Question text?",
        "analogy": "Think of it like...",
        "hint": "Consider what happens when...",
        "options": [
          { "id": "A", "text": "Option A", "isCorrect": false },
          { "id": "B", "text": "Option B", "isCorrect": true },
          { "id": "C", "text": "Option C", "isCorrect": false },
          { "id": "D", "text": "Option D", "isCorrect": false }
        ],
        "reasoning": "Explanation of why the correct answer is right"
      }
    ]
  }
}`;

    console.log(`[quiz] Generating ${numberOfQuestions} questions about "${topic}" for Year ${gradeNum}`);

    const content = await callGroqChat(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a ${numberOfQuestions}-question quiz about "${topic}" for Year ${gradeNum}.` },
        ],
        max_tokens: 4096,
        temperature: 0.7,
      },
      "default"
    );

    console.log(`[quiz] Got response, length: ${content.length}`);

    let quiz: QuizData | null = null;
    try {
      const clean = content.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      quiz = parsed.quiz || parsed || null;
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          quiz = parsed.quiz || parsed || null;
        } catch {
          console.warn("[quiz] Failed to parse JSON from response");
        }
      }
    }

    if (!quiz?.questions?.length) {
      console.error("[quiz] No questions generated. Response:", content.slice(0, 500));
      return NextResponse.json({ error: "Failed to generate quiz questions" }, { status: 500 });
    }

    console.log(`[quiz] Generated ${quiz.questions.length} questions`);
    return NextResponse.json({ quiz });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/groq/quiz] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
