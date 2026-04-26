import { NextResponse } from "next/server";
import { callGroqChat, formatError } from "../_utils";
import type { QuizData, QuizQuestion } from "@/types/quiz";

export const runtime = "nodejs";

// Chunk text into smaller pieces for processing
const chunkText = (text: string, maxChunkSize: number): string[] => {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = Math.min(start + maxChunkSize, text.length);
    
    // Try to break at a sentence boundary
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
- Use Australian English spelling

Return ONLY valid JSON — no markdown, no preamble:
{
  "quiz": {
    "title": "Quiz Title Based on Document",
    "subject": "${subject || 'General'}",
    "questions": [
      {
        "id": 1,
        "question": "Question text?",
        "options": [
          { "id": "A", "text": "Option A", "isCorrect": false },
          { "id": "B", "text": "Option B", "isCorrect": true },
          { "id": "C", "text": "Option C", "isCorrect": false },
          { "id": "D", "text": "Option D", "isCorrect": false }
        ],
        "reasoning": "Detailed explanation of why B is correct and why other options are wrong"
      }
    ]
  }
}`;

    // For large documents, use chunking strategy
    const MAX_CHUNK_SIZE = 12000; // Conservative chunk size
    const allQuestions: QuizQuestion[] = [];

    if (documentContent.length > MAX_CHUNK_SIZE) {
      // Split document into chunks and generate quiz for each
      const chunks = chunkText(documentContent, MAX_CHUNK_SIZE);
      const questionsPerChunk = Math.ceil(numberOfQuestions / chunks.length);
      
      console.log(`[quiz-from-doc] Chunking: ${chunks.length} chunks for ${documentContent.length} chars`);

      for (let i = 0; i < chunks.length; i++) {
        try {
          const chunkContent = await callGroqChat(
            {
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Document: "${fileName}" (Part ${i + 1}/${chunks.length})\n\nContent:\n${chunks[i]}\n\nPlease generate ${questionsPerChunk} quiz questions based on this section.` },
              ],
              max_tokens: 2048,
              temperature: 0.6,
            },
            "reasoning"
          );

          let chunkQuiz: QuizData | null = null;
          try {
            const clean = chunkContent.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(clean);
            chunkQuiz = parsed.quiz || parsed || null;
          } catch {
            const match = chunkContent.match(/\{[\s\S]*\}/);
            if (match) {
              try {
                const parsed = JSON.parse(match[0]);
                chunkQuiz = parsed.quiz || parsed || null;
              } catch { /* skip invalid JSON */ }
            }
          }

          if (chunkQuiz?.questions) {
            allQuestions.push(...chunkQuiz.questions);
          }
        } catch (chunkError) {
          console.warn(`[quiz-from-doc] Chunk ${i + 1} failed:`, formatError(chunkError));
          // Continue with next chunk
        }
      }
      
      // Limit to requested number of questions
      const questions = allQuestions.slice(0, numberOfQuestions).map((q, i) => ({ ...q, id: i + 1 }));
      const quiz: QuizData = {
        questions,
      };
      
      return NextResponse.json({ quiz });
    }

    // Small document - single pass
    const content = await callGroqChat(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Document: "${fileName}"\n\nContent:\n${documentContent}\n\nPlease generate a ${numberOfQuestions}-question quiz based on this document.` },
        ],
        max_tokens: 3072,
        temperature: 0.6,
      },
      "reasoning"
    );

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
        } catch { /* skip invalid JSON */ }
      }
    }

    if (!quiz) {
      return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 });
    }

    return NextResponse.json({ quiz });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/groq/quiz-from-doc] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
