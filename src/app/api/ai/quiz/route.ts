import { NextResponse } from "next/server";
import { runObject, z } from "@/lib/ai";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

const quizSchema = z.object({
  quiz: z.object({
    title: z.string(),
    subject: z.string(),
    questions: z.array(
      z.object({
        id: z.number(),
        question: z.string(),
        analogy: z.string().optional(),
        hint: z.string().optional(),
        options: z.array(
          z.object({
            id: z.string(),
            text: z.string(),
            isCorrect: z.boolean(),
          }),
        ),
        reasoning: z.string().optional(),
      }),
    ),
  }),
});

export async function POST(request: Request) {
  try {
    await requireUser();
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
    const subjectStr = subject
      ? ` This quiz is for the ${subject} subject area.`
      : "";

    const avoidStr = avoidQuestions.length > 0
      ? `\n\nAVOID these questions (already seen): ${avoidQuestions.slice(-20).join(" | ")}`
      : "";

    const systemPrompt = `You are an expert quiz creator for Australian secondary students.

Generate exactly ${numberOfQuestions} multiple-choice quiz questions about "${topic}" at Year ${gradeNum} level.${subjectStr}

Difficulty: ${difficultyDesc[difficulty] || difficultyDesc.intermediate}${hobbiesStr}${avoidStr}

For each question:
- 4 options (A, B, C, D) with exactly one correct
- Make wrong answers plausible (common misconceptions)
- Include a clear explanation for the correct answer
- Use Australian English spelling
- Include an "analogy" field: a short, relatable analogy that helps students connect the concept to everyday experiences (use student hobbies/interests when available)
- Include a "hint" field: a brief hint to guide students toward the answer without giving it away`;

    const result = await runObject<{ quiz: { title: string; subject: string; questions: unknown[] } }>({
      schema: quizSchema,
      system: systemPrompt,
      prompt: `Generate a ${numberOfQuestions}-question quiz about "${topic}" for Year ${gradeNum}.`,
      taskType: "default",
      temperature: 0.7,
      maxTokens: 4096,
    });

    if (!result?.quiz?.questions?.length) {
      return NextResponse.json({ error: "Failed to generate quiz questions" }, { status: 500 });
    }

    return NextResponse.json({ quiz: result.quiz });
  } catch (error) {
    console.error("[/api/ai/quiz] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Quiz generation failed" },
      { status: 500 },
    );
  }
}
