import { NextResponse } from "next/server";
import { callHfChat, formatError } from "../_utils";
import { QuizData } from "@/types/quiz";

export const runtime = "nodejs";

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

    const systemPrompt = `You are Quizzy, an expert teacher creating quizzes for Australian high school students.

Your job: Create a comprehensive, educational quiz based on the provided document content.

The student is in Year ${grade}${subject ? ` studying ${subject}` : ""}.

Generate a ${numberOfQuestions}-question quiz with the following requirements:

1. **Question Variety**:
   - 40% recall questions (facts, definitions, key terms)
   - 40% application questions (using concepts in new situations)
   - 20% analysis questions (comparing, evaluating, explaining why)

2. **Question Format**:
   - Multiple choice with 4 options (A, B, C, D)
   - One correct answer clearly identified
   - Plausible distractors (wrong answers should be believable)

3. **Content Coverage**:
   - Cover all major topics from the document
   - Focus on the most important concepts
   - Include questions at increasing difficulty levels

4. **Explanations**:
   - Each answer must have a detailed explanation
   - Explain WHY the correct answer is right
   - Briefly explain WHY wrong answers are wrong (if relevant)

5. **Australian Context**:
   - Use Australian English spelling
   - Reference Australian curriculum where relevant

Return ONLY valid JSON — no markdown, no preamble:
{
  "quiz": {
    "title": "Quiz Title Based on Document",
    "subject": "${subject || 'General'}",
    "questions": [
      {
        "id": 1,
        "question": "Question text?",
        "options": {
          "A": "Option A",
          "B": "Option B",
          "C": "Option C",
          "D": "Option D"
        },
        "correctAnswer": "A",
        "explanation": "Detailed explanation of why A is correct and why other options are wrong"
      }
    ]
  }
}`;

    const content = await callHfChat(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Document: "${fileName}"\n\nContent:\n${documentContent.slice(0, 15000)}\n\nPlease generate a ${numberOfQuestions}-question quiz based on this document.` },
        ],
        max_tokens: 4096,
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
        } catch {}
      }
    }

    if (!quiz) {
      return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 });
    }

    return NextResponse.json({ quiz });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/hf/quiz-from-doc] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
