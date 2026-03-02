import { NextResponse } from "next/server";
import { callHfChat, formatError } from "../_utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const question: string = body.question || "";
    const targetAnswer: string = body.targetAnswer || "";
    const userAnswer: string = body.userAnswer || "";

    const content = await callHfChat({
      messages: [
        {
          role: "system",
          content:
            'You are a fair teacher. Evaluate if the student\'s answer is correct. Return ONLY this JSON: {"isCorrect": true/false, "feedback": "short sentence"}',
        },
        {
          role: "user",
          content: `Question: ${question}\nCorrect Answer: ${targetAnswer}\nStudent Answer: ${userAnswer}`,
        },
      ],
      max_tokens: 100,
      temperature: 0.3,
    });

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch
      ? jsonMatch[0]
      : '{"isCorrect": false, "feedback": "Something went wrong."}';
    return NextResponse.json(JSON.parse(jsonStr));
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/hf/grade] error", message);
    return NextResponse.json(
      { isCorrect: false, feedback: "Could not grade this answer.", error: message },
      { status: 500 },
    );
  }
}
