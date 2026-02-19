import { NextResponse } from "next/server";
import { callHfChat, formatError } from "../_utils";
import type { QuizData } from "@/types/quiz";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input: string = body.input || "";
    const userContext = body.userContext || {};
    const numberOfQuestions: number = body.numberOfQuestions || 5;
    const options = body.options || {};

    const subject = userContext.subject || "General";
    const diversitySeed =
      options?.diversitySeed || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const avoidList = (options?.avoidQuestions || []).slice(0, 20);

    const systemPrompt = `You are Quizzy, a brilliant and supportive mentor. Generate a ${numberOfQuestions}-question mixed quiz for a Year ${userContext.grade || "7-12"} student that feels more like an exploration than an exam.

Return ONLY valid JSON with this exact structure:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "text",
      "analogy": "A clear, vivid analogy that bridges the concept to a SPECIFIC moment, scene, or character from the student's interests.",
      "options": [
        {"id": "a", "text": "option", "isCorrect": true},
        {"id": "b", "text": "option", "isCorrect": false},
        {"id": "c", "text": "option", "isCorrect": false},
        {"id": "d", "text": "option", "isCorrect": false}
      ],
      "hint": "A gentle nudge that helps them think (no spoilers!)"
    },
    {
      "id": 2,
      "type": "short_answer",
      "question": "text",
      "analogy": "Analogy tied to the student's interests",
      "correctAnswer": "Concise correct answer",
      "hint": "Helpful hint"
    }
  ]
}

Quality & Tone Rules:
- Use a warm, encouraging tone in the questions and analogies.
- Use a warm, encouraging tone in the questions and analogies.
- ANALOGY PERSISTENCE: If a connection to their interests isn't obvious, think laterally. Look for structural, functional, or emotional parallels between the concept and their hobbies. NEVER omit an analogy or use a generic one like "in X's room."
- Every question must be factually accurate and level-appropriate for Year ${userContext.grade || "7-12"}.
- Multiple Choice: exactly 4 options, exactly 1 correct.
- LaTeX: Use $x^2$ for inline, $$equation$$ for display. Double-escape backslashes (\\\\).
- Avoid repeating these questions: ${avoidList.slice(0, 3).join("; ")}`;

    const userPrompt = `Topic: ${input}
Subject: ${subject}
Grade: Year ${userContext.grade || "7-12"}
Interests: ${userContext.hobbies?.join(", ") || ""}
Seed: ${diversitySeed}`;

    const content = await callHfChat({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 2400,
      temperature: 0.7,
    });

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ quiz: null });

    const raw = jsonMatch[0];
    const parseQuiz = (text: string): QuizData | null => {
      try {
        return JSON.parse(text);
      } catch {
        const sanitized = text.replace(/\\([a-zA-Z])/g, "\\\\$1");
        return JSON.parse(sanitized);
      }
    };

    const quiz = parseQuiz(raw);
    return NextResponse.json({ quiz: quiz || null });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/hf/quiz] error", message);
    return NextResponse.json({ quiz: null, error: message }, { status: 500 });
  }
}
