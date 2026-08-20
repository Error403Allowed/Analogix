import { NextResponse } from "next/server";
import { runObject, z } from "@/lib/ai";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

const gradeSchema = z.object({
  isCorrect: z.boolean(),
  feedback: z.string(),
});

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json();
    const question: string = body.question || "";
    const targetAnswer: string = body.targetAnswer || "";
    const userAnswer: string = body.userAnswer || "";

    const result = await runObject<{ isCorrect: boolean; feedback: string }>({
      schema: gradeSchema,
      system:
        'You are a fair teacher. Evaluate if the student\'s answer is correct. Return ONLY this JSON: {"isCorrect": true/false, "feedback": "short sentence"}',
      prompt: `Question: ${question}\nCorrect Answer: ${targetAnswer}\nStudent Answer: ${userAnswer}`,
      taskType: "lightweight",
      temperature: 0.3,
      maxTokens: 100,
    });

    return NextResponse.json(result ?? { isCorrect: false, feedback: "Something went wrong." });
  } catch (error) {
    console.error("[/api/ai/grade] error", error);
    return NextResponse.json(
      { isCorrect: false, feedback: "Could not grade this answer.", error: error instanceof Error ? error.message : "Grading failed" },
      { status: 500 },
    );
  }
}
