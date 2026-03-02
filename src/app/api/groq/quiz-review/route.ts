import { NextResponse } from "next/server";
import { callHfChat, formatError } from "../_utils";
import type { QuizAnswerInput, QuizReview } from "@/types/quiz";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const grade = body.grade || "7-12";
    const subject = body.subject || "General";
    const difficulty = body.difficulty || "intermediate";
    const answers: QuizAnswerInput[] = Array.isArray(body.answers) ? body.answers : [];

    if (answers.length === 0) {
      return NextResponse.json({ review: null });
    }

    const systemPrompt = `You are Quizzy, a supportive teacher. Provide concise review feedback for each quiz question based on the student's answer.

Return ONLY valid JSON with this exact structure:
{
  "summary": "2-4 sentence overall feedback",
  "questions": [
    { "id": 1, "feedback": "1-2 sentences of feedback" }
  ]
}

Rules:
- Use a warm, encouraging tone.
- For incorrect answers, explain the key idea briefly and point out the correct concept.
- For correct answers, reinforce what they did right and one small extension tip.
- Keep feedback short and clear (max 2 sentences per question).
- Match each input question by id.
- No markdown, no extra keys, no commentary outside the JSON.`;

    const userPrompt = `Grade: Year ${grade}
Subject: ${subject}
Difficulty: ${difficulty}
Answers (JSON): ${JSON.stringify(answers)}`;

    const content = await callHfChat(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1400,
        temperature: 0.4,
      },
      "reasoning",
    );

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ review: null });

    const raw = jsonMatch[0];
    const parseReview = (text: string): QuizReview | null => {
      try {
        return JSON.parse(text);
      } catch {
        const sanitized = text.replace(/\\([a-zA-Z])/g, "\\\\$1");
        return JSON.parse(sanitized);
      }
    };

    const review = parseReview(raw);
    return NextResponse.json({ review: review || null });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/hf/quiz-review] error", message);
    return NextResponse.json({ review: null, error: message }, { status: 500 });
  }
}
