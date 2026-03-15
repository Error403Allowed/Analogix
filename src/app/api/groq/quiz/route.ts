import { NextResponse } from "next/server";
import { callHfChat, formatError } from "../_utils";
import type { QuizData } from "@/types/quiz";
import { getPastPaperSnippets } from "@/lib/pastPapers";
import type { PastPaperSnippet } from "@/lib/pastPapers";
import type { AustralianState } from "@/utils/termData";
import type { SubjectId } from "@/constants/subjects";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input: string = body.input || "";
    const userContext = body.userContext || {};
    const numberOfQuestions: number = body.numberOfQuestions || 5;
    const options = body.options || {};

    const subject = userContext.subject || "General";
    const state = (userContext.state || null) as AustralianState | null;
    const subjectId = (userContext.subject || null) as SubjectId | null;
    const difficulty = userContext.difficulty || "intermediate";
    const diversitySeed =
      options?.diversitySeed || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const avoidList = (options?.avoidQuestions || []).slice(0, 20);
    const pastPaperSnippets = await Promise.race<PastPaperSnippet[]>([
      getPastPaperSnippets({
        state,
        grade: userContext.grade,
        subject: subjectId || undefined,
        limit: 4,
      }),
      new Promise<PastPaperSnippet[]>((resolve) => {
        setTimeout(() => resolve([]), 5000);
      }),
    ]);
    const sourceBlock = pastPaperSnippets.length
      ? pastPaperSnippets
          .map((snippet, index) => `${index + 1}. ${snippet.text}`)
          .join("\n")
      : "None available.";

    // Grade-appropriate difficulty descriptions
    const gradeNum = parseInt(userContext.grade || "9");
    const isLowerSecondary = gradeNum <= 9;
    const isUpperSecondary = gradeNum >= 11;
    
    const difficultyDescription = {
      foundational: isLowerSecondary 
        ? "Basic recall and simple calculations. Use simple numbers and single-step problems." 
        : "Foundational concepts with straightforward applications.",
      intermediate: isLowerSecondary
        ? "Standard problems requiring 1-2 reasoning steps. Use realistic numbers."
        : isUpperSecondary
          ? "Complex problems with multiple concepts combined. Include real-world applications."
          : "Standard curriculum level with moderate reasoning required.",
      advanced: isLowerSecondary
        ? "Challenging problems that extend beyond basic concepts. Multi-step reasoning."
        : "Extension-level problems requiring deep understanding and complex reasoning. Include edge cases and nuanced concepts."
    };

    const systemPrompt = `You are Analogix AI, generating a high-quality ${numberOfQuestions}-question quiz for a Year ${userContext.grade || "7-12"} student studying ${subject}.

CRITICAL QUALITY REQUIREMENTS:
1. EVERY answer MUST be 100% factually accurate. Double-check ALL calculations, facts, and explanations.
2. For multiple_choice: EXACTLY ONE option must have "isCorrect": true
3. For multiple_select: At least TWO options must have "isCorrect": true (clearly indicate "Select all that apply")
4. ALL distractors (wrong answers) must be plausible - use common misconceptions, NOT obviously wrong answers
5. Questions must vary in type and topic - do NOT repeat the same concept

SEED FOR VARIETY: ${diversitySeed}
Use this seed to generate DIFFERENT questions each time. Vary:
- Which concepts are tested
- The specific numbers/values used in questions
- The wording and framing of questions
- Which distractors are offered

Grade Level: Year ${userContext.grade}
- ${difficultyDescription[difficulty as keyof typeof difficultyDescription]}

Return ONLY valid JSON with this exact structure:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "text",
      "analogy": "A clear, vivid analogy that bridges the concept to a SPECIFIC moment, scene, or character from the student's interests: ${userContext.hobbies?.join(", ") || "everyday life"}.",
      "options": [
        {"id": "a", "text": "option", "isCorrect": true},
        {"id": "b", "text": "option", "isCorrect": false},
        {"id": "c", "text": "option", "isCorrect": false},
        {"id": "d", "text": "option", "isCorrect": false}
      ],
      "hint": "A gentle nudge that helps them think (no spoilers!)",
      "explanation": "Detailed explanation of why the correct answer is correct and why others are wrong"
    },
    {
      "id": 2,
      "type": "multiple_select",
      "question": "text (should imply multiple answers possible, e.g., 'Which of the following... Select all that apply.')",
      "analogy": "Analogy tied to the student's interests",
      "options": [
        {"id": "a", "text": "option", "isCorrect": true},
        {"id": "b", "text": "option", "isCorrect": true},
        {"id": "c", "text": "option", "isCorrect": false},
        {"id": "d", "text": "option", "isCorrect": true}
      ],
      "hint": "Helpful hint",
      "explanation": "Detailed explanation"
    },
    {
      "id": 3,
      "type": "short_answer",
      "question": "text",
      "analogy": "Analogy tied to the student's interests",
      "correctAnswer": "Concise correct answer",
      "hint": "Helpful hint",
      "explanation": "Detailed explanation"
    }
  ]
}

Question Type Distribution:
- ~50% multiple_choice (single correct answer, radio buttons)
- ~30% multiple_select (multiple correct answers, checkboxes - MUST have 2+ correct)
- ~20% short_answer (text input)

Quality & Tone Rules:
- Use a warm, encouraging tone in the questions and analogies.
- ANALOGY PERSISTENCE: Connect concepts to the student's specific interests. NEVER use generic analogies.
- Every question must be factually accurate and level-appropriate for Year ${userContext.grade || "7-12"}.
- Difficulty: ${difficulty}. ${difficultyDescription[difficulty as keyof typeof difficultyDescription]}
- Use the provided past-paper excerpts ONLY as inspiration. Paraphrase heavily and create original questions; do NOT copy wording.
- Multiple Choice: exactly 4 options, exactly 1 correct. Distractors should be common mistakes.
- Multiple Select: 4-5 options, 2-4 correct answers. Make it clear in the question that multiple answers are possible.
- LaTeX: Use $x^2$ for inline, $$equation$$ for display. Double-escape backslashes (\\\\\\\\).
- Avoid repeating these questions: ${avoidList.slice(0, 10).join("; ")}
- Vary question topics across the quiz - don't test the same concept repeatedly`;

    const userPrompt = `Topic: ${input}
Subject: ${subject}
State: ${state || "Unknown"}
Grade: Year ${userContext.grade || "7-12"}
Difficulty: ${difficulty}
Interests: ${userContext.hobbies?.join(", ") || ""}
Seed: ${diversitySeed}

Past paper excerpts (for inspiration only, do not copy):
${sourceBlock}`;

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
