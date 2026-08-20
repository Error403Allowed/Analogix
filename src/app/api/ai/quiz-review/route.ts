import { NextResponse } from "next/server";
import { runObject, z } from "@/lib/ai";
import { requireUser } from "@/lib/api-auth";
import type { QuizAnswerInput } from "@/types/quiz";

export const runtime = "nodejs";

const reviewSchema = z.object({
  summary: z.string(),
  questions: z.array(
    z.object({
      id: z.union([z.number(), z.string()]),
      feedback: z.string(),
    }),
  ),
});

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json();
    const grade = body.grade || "7-12";
    const subject = body.subject || "General";
    const difficulty = body.difficulty || "intermediate";
    const answers: QuizAnswerInput[] = Array.isArray(body.answers) ? body.answers : [];

    if (answers.length === 0) {
      return NextResponse.json({ review: null });
    }

    const systemPrompt = `You are Analogix AI, a supportive teacher. Provide concise review feedback for each quiz question based on the student's answer.

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

    const review = await runObject<{ summary: string; questions: Array<{ id: number | string; feedback: string }> }>({
      schema: reviewSchema,
      system: systemPrompt,
      prompt: userPrompt,
      taskType: "reasoning",
      temperature: 0.4,
      maxTokens: 1400,
    });

    return NextResponse.json({ review: review || null });
  } catch (error) {
    console.error("[/api/ai/quiz-review] error", error);
    return NextResponse.json(
      { review: null, error: error instanceof Error ? error.message : "Review failed" },
      { status: 500 },
    );
  }
}
