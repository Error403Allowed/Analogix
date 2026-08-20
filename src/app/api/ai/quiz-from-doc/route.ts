import { NextResponse } from "next/server";
import { runObject, z } from "@/lib/ai";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

const chunkQuizSchema = z.object({
  questions: z.array(
    z.object({
      id: z.number(),
      question: z.string(),
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
});

const chunkText = (text: string, maxChunkSize: number): string[] => {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChunkSize, text.length);
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf(".", end);
      const lastNewline = text.lastIndexOf("\n", end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > start + maxChunkSize * 0.5) {
        end = breakPoint + 1;
      }
    }
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  return chunks;
};

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json();
    const documentContent: string = body.documentContent || "";
    const fileName: string = body.fileName || "Document";
    const subject: string = body.subject || "";
    const grade: string = body.grade || "7-12";
    const numberOfQuestions: number = body.numberOfQuestions || 10;

    if (!documentContent.trim()) {
      return NextResponse.json({ error: "Document content is required" }, { status: 400 });
    }

    const systemPrompt = `You are Analogix AI, an expert teacher creating quizzes for Australian high school students.

Your job: Create a comprehensive, educational quiz based on the provided document content.

The student is in Year ${grade}${subject ? ` studying ${subject}` : ""}.

Generate a ${numberOfQuestions}-question quiz:
- 40% recall questions (facts, definitions, key terms)
- 40% application questions (using concepts in new situations)
- 20% analysis questions (comparing, evaluating, explaining why)
- Multiple choice with 4 options (A, B, C, D)
- One correct answer with plausible distractors
- Detailed explanation for each answer
- Cover all major topics from the document
- Use Australian English spelling`;

    const MAX_CHUNK_SIZE = 12000;
    const allQuestions: unknown[] = [];

    if (documentContent.length > MAX_CHUNK_SIZE) {
      const chunks = chunkText(documentContent, MAX_CHUNK_SIZE);
      const questionsPerChunk = Math.ceil(numberOfQuestions / chunks.length);
      for (let i = 0; i < chunks.length; i++) {
        try {
          const result = await runObject<{ questions: unknown[] }>({
            schema: chunkQuizSchema,
            system: systemPrompt,
            prompt: `Document: "${fileName}" (Part ${i + 1}/${chunks.length})\n\nContent:\n${chunks[i]}\n\nPlease generate ${questionsPerChunk} quiz questions based on this section.`,
            taskType: "reasoning",
            temperature: 0.6,
            maxTokens: 2048,
          });
          if (result?.questions) allQuestions.push(...result.questions);
        } catch (chunkError) {
          console.warn(`[quiz-from-doc] Chunk ${i + 1} failed:`, chunkError);
        }
      }
      const questions = allQuestions.slice(0, numberOfQuestions).map((q, i) => ({ ...(q as object), id: i + 1 }));
      return NextResponse.json({ quiz: { questions } });
    }

    const result = await runObject<{ questions: unknown[] }>({
      schema: chunkQuizSchema,
      system: systemPrompt,
      prompt: `Document: "${fileName}"\n\nContent:\n${documentContent}\n\nPlease generate a ${numberOfQuestions}-question quiz based on this document.`,
      taskType: "reasoning",
      temperature: 0.6,
      maxTokens: 3072,
    });

    if (!result?.questions?.length) {
      return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 });
    }
    return NextResponse.json({ quiz: result });
  } catch (error) {
    console.error("[/api/ai/quiz-from-doc] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Quiz generation failed" },
      { status: 500 },
    );
  }
}
