import { NextResponse } from "next/server";
import { callHfChat, formatError, getMoodProfile } from "../_utils";
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
    const moodProfile = getMoodProfile(userContext.mood);

    const systemPrompt = `You are Quizzy, an AI tutor. Generate a ${numberOfQuestions}-question mixed quiz for a Year ${userContext.grade || "7-12"} student.

Return ONLY valid JSON with this exact structure:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "text",
      "analogy": "concrete analogy referencing a specific moment, scene, character, or element from the student's interests (not generic settings like 'in X's apartment')",
      "options": [
        {"id": "a", "text": "option", "isCorrect": true},
        {"id": "b", "text": "option", "isCorrect": false},
        {"id": "c", "text": "option", "isCorrect": false},
        {"id": "d", "text": "option", "isCorrect": false}
      ],
      "hint": "hint text"
    },
    {
      "id": 2,
      "type": "short_answer",
      "question": "text",
      "analogy": "analogy tied to the student's interests",
      "correctAnswer": "short correct answer",
      "hint": "hint text"
    }
  ]
}

Quality rules:
- Take a moment to verify each question is coherent, factually correct, and grade-appropriate.
- Every question must be answerable and unambiguous.
- For multiple_choice: exactly 4 options, exactly 1 correct, no trick wording.
- For short_answer: include a clear, concise correctAnswer.
- Provide a helpful hint for every question.
- Keep questions tightly aligned to the Topic and Subject.

CRITICAL: Mood: ${moodProfile.label}. Quiz style: ${moodProfile.quizStyle}.
Each question MUST have an analogy that references a SPECIFIC moment, scene, character, or element from the student's interests (e.g. for a show: a real episode moment or running gag—never generic placeholders like "in Leonard's apartment").
Mix multiple_choice and short_answer types.
Use LaTeX for math: $x^2$ for inline, $$equation$$ for display.
Double-escape backslashes in JSON.
Do NOT repeat questions from: ${avoidList.slice(0, 3).join("; ")}`;

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
