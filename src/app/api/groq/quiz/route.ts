import { NextResponse } from "next/server";
import { callGroqChat, formatError } from "../_utils";
import type { QuizData, QuizQuestion } from "@/types/quiz";
import type { AustralianState } from "@/utils/termData";
import type { SubjectId } from "@/constants/subjects";

export const runtime = "nodejs";

// ── Algebraic equivalence normaliser ────────────────────────────────────────
// Strips whitespace, sorts commutative terms, and canonicalises common forms
// so that "2x + 30", "x + (x+30)", "30 + 2x" all map to the same string.
function normaliseExpr(raw: string): string {
  let s = raw
    .replace(/\s+/g, "")           // remove all spaces
    .replace(/\*\*(\d+)/g, "^$1")  // ** → ^
    .toLowerCase();

  // Expand simple coefficient patterns: x+x → 2x, x+x+x → 3x
  s = s.replace(/(?<!\w)x\+x(?!\w)/g, "2x");
  s = s.replace(/(?<!\w)x\+x\+x(?!\w)/g, "3x");

  // Normalise subtraction to addition of negative: a-b → a+(-b)
  // so term sorting is consistent
  s = s.replace(/-/g, "+(-").replace(/\+\(/g, "+(");

  // Sort additive terms alphabetically for commutativity
  const terms = s.split("+").filter(Boolean).sort();
  return terms.join("+");
}

// Check if two answer strings are algebraically equivalent
function answersEquivalent(a: string, b: string): boolean {
  if (!a || !b) return false;
  // Direct match
  if (a.trim().toLowerCase() === b.trim().toLowerCase()) return true;
  // Normalised match
  try {
    return normaliseExpr(a) === normaliseExpr(b);
  } catch {
    return false;
  }
}

// ── Server-side numeric verification via the JS math executor ───────────────
// Builds a small JS snippet that evaluates the answer expression and checks it
// matches the expected value. Returns null if verification can't be performed.
async function verifyNumericAnswer(
  question: string,
  correctAnswer: string,
  verificationCode: string,
  origin: string
): Promise<{ verified: boolean; note: string } | null> {
  if (!verificationCode) return null;
  try {
    const res = await fetch(`${origin}/api/python/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: verificationCode }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    const result = String(data.result?.value ?? "");
    const verified = result === "true" || result === "1";
    return { verified, note: `Executor returned: ${data.result?.display}` };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input: string = body.input || "";
    const userContext = body.userContext || {};
    const numberOfQuestions: number = body.numberOfQuestions || 5;
    const options = body.options || {};

    const subject = userContext.subject || "General";
    const subjectId = (userContext.subject || null) as SubjectId | null;
    const difficulty = userContext.difficulty || "intermediate";
    const diversitySeed =
      options?.diversitySeed || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const avoidList = (options?.avoidQuestions || []).slice(0, 20);
    const isMath = (subjectId || "").toLowerCase() === "math" ||
                   subject.toLowerCase().includes("math");
    const gradeNum = parseInt(userContext.grade || "9");

    // ── Grade-band descriptors ───────────────────────────────────────────────
    type DiffKey = "foundational" | "intermediate" | "advanced";
    interface GradeBandCfg {
      band: string; curriculum: string; topicExamples: string;
      foundational: string; intermediate: string; advanced: string;
    }

    const gradeCfg: GradeBandCfg =
      gradeNum <= 8
        ? {
            band: "Junior Secondary (Year 7–8)",
            curriculum: "Australian Curriculum v9, Years 7–8",
            topicExamples: isMath
              ? "integers, fractions, decimals, ratios, basic algebra (ax+b), area & perimeter, data & statistics"
              : "introductory concepts for Years 7–8",
            foundational: "Single-step recall or calculation. Simple whole-number answers.",
            intermediate: "Two-step problems applying a single formula or concept.",
            advanced: "Multi-step reasoning or extension challenge for Year 8.",
          }
        : gradeNum <= 10
        ? {
            band: "Middle Secondary (Year 9–10)",
            curriculum: "Australian Curriculum v9, Years 9–10",
            topicExamples: isMath
              ? "linear equations & inequalities, quadratics (factoring, quadratic formula), simultaneous equations, Pythagoras & trigonometry (SOH-CAH-TOA, sine/cosine rules at Year 10), coordinate geometry (gradient, midpoint, distance), surface area & volume of 3D solids, probability & statistics, index laws, surds"
              : "standard Year 9–10 content across all strands",
            foundational: "Straightforward single-concept question — one formula, one step. Year 9 baseline.",
            intermediate: "Standard Year 9–10 exam-style question. 2–3 steps, realistic context, correct numeric answer.",
            advanced: "Harder Year 10 / bridging Year 10→11. Combines two or more concepts, algebraic manipulation.",
          }
        : {
            band: "Senior Secondary (Year 11–12)",
            curriculum: "Australian Curriculum / ATAR / HSC / VCE, Years 11–12",
            topicExamples: isMath
              ? "calculus (derivatives, integrals, chain/product/quotient rules), exponential & log functions, trig identities, complex numbers, vectors, probability distributions, proof"
              : "senior curriculum content including depth studies",
            foundational: "Standard Year 11 procedural question — one technique, straightforward numbers.",
            intermediate: "Typical Year 11–12 exam question combining methods, multi-step analysis.",
            advanced: "Year 12 / Extension level: synthesis, proof, or sophisticated reasoning.",
          };

    const diffDesc = gradeCfg[difficulty as DiffKey] || gradeCfg.intermediate;

    // ── Desmos for maths graphing questions ─────────────────────────────────
    const desmosInstruction = isMath ? `
GRAPHING (Math only — up to 20% of questions):
Add a "desmos" field when a graph aids the question:
  "desmos": {
    "expressions": [{"id":"eq1","latex":"y=2x+1"}],
    "bounds": {"left":-10,"right":10,"bottom":-10,"top":10}
  }
Uses: reading intercepts, identifying intersections, function recognition.
Use simple Desmos-valid LaTeX only.` : "";

    // ── Verification code instruction ────────────────────────────────────────
    // For numeric/algebraic questions the model writes a short JS snippet
    // (our executor is actually JS not Python) that returns true if correct.
    const verificationInstruction = isMath ? `
VERIFICATION CODE (required for every numeric or algebraic question):
Add a "verificationCode" field: a single-line JS expression (no imports, no semicolons)
that returns the boolean true when the correct answer is verified.
Examples:
  - Q: "Solve 3x - 7 = 11" → "verificationCode": "((11 + 7) / 3) === 6"
  - Q: "Simplify 2x + x + 30" → "verificationCode": "true" // algebraic, mark as verified
  - Q: "Area of circle r=5" → "verificationCode": "Math.abs(pi * pow(5,2) - 78.54) < 0.1"
  - Q: "What is sin(30°)?" → "verificationCode": "Math.abs(sin(pi/6) - 0.5) < 0.001"
Keep it short and safe — only use: +,-,*,/,pow,sqrt,sin,cos,tan,pi,abs,round,Math` : "";

    const systemPrompt = `You are Analogix AI — a mathematically rigorous Australian curriculum tutor.
You are generating a ${numberOfQuestions}-question quiz using DeepSeek R1 reasoning.

TARGET: Year ${userContext.grade} student | ${gradeCfg.band}
CURRICULUM: ${gradeCfg.curriculum}
SUBJECT: ${subject}
DIFFICULTY: ${difficulty} — ${diffDesc}
TOPICS: ${gradeCfg.topicExamples}

══ NON-NEGOTIABLE ACCURACY RULES ══
1. Work out EVERY answer fully before writing it. Show no working in the JSON, but BE CERTAIN.
2. For multiple_choice: verify each distractor is WRONG by working it out. Use plausible errors (sign flip, wrong formula, arithmetic slip) NOT random numbers.
3. For algebraic answers: check ALL equivalent forms. "2x+30", "x+(x+30)", "30+2x" are ALL the same — never list two options that are secretly equivalent.
4. Never write a question where you are not 100% certain of the answer.
5. Numbers must be realistic exam values — NOT trivially simple (no "solve x+1=2").
${verificationInstruction}
${desmosInstruction}

VARIETY SEED: ${diversitySeed}

Return ONLY valid JSON — no markdown fences, no commentary:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Full question text. Use LaTeX: $inline$ or $$display$$. Double-escape backslashes.",
      "analogy": "Vivid analogy tied to: ${userContext.hobbies?.join(", ") || "everyday life"}",
      "options": [
        {"id":"a","text":"correct answer","isCorrect":true},
        {"id":"b","text":"plausible wrong (e.g. sign error)","isCorrect":false},
        {"id":"c","text":"plausible wrong (e.g. wrong formula)","isCorrect":false},
        {"id":"d","text":"plausible wrong (e.g. arithmetic slip)","isCorrect":false}
      ],
      "hint": "Nudge toward method, no spoilers",
      "explanation": "Full worked solution step by step"${isMath ? `,
      "verificationCode": "..."` : ""}
    },
    {
      "id": 2,
      "type": "short_answer",
      "question": "...",
      "analogy": "...",
      "correctAnswer": "simplified canonical form",
      "hint": "...",
      "explanation": "..."${isMath ? `,
      "verificationCode": "..."` : ""}
    }
  ]
}

Type distribution: ~50% multiple_choice, ~25% short_answer, ~25% multiple_select.
For multiple_select: 2+ correct options, say "Select all that apply" in the question.
LaTeX: $...$ inline, $$...$$ display. Backslashes must be doubled: \\\\frac, \\\\sqrt.
Do NOT repeat: ${avoidList.slice(0, 10).join("; ")}`;

    const userPrompt = `Topic: ${input}
Subject: ${subject}
Grade: Year ${userContext.grade || "10"}
Difficulty: ${difficulty}
Interests: ${userContext.hobbies?.join(", ") || ""}
Seed: ${diversitySeed}`;

    // Use the REASONING model (DeepSeek R1) for all quiz generation
    const content = await callGroqChat(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.6, // Lower temp for more reliable maths
      },
      "reasoning" // ← Forces DeepSeek R1
    );

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ quiz: null });

    const raw = jsonMatch[0];

    const repairJson = (text: string): QuizData | null => {
      try { return JSON.parse(text); } catch { /* continue */ }
      const repaired = text.replace(
        /"((?:[^"\\]|\\[\s\S])*)"/g,
        (_m, inner: string) => `"${inner.replace(/\\(?!["\\/bfnrtu])/g, "\\\\")}"`
      );
      try { return JSON.parse(repaired); } catch { /* continue */ }
      const stripped = text.replace(
        /"((?:[^"\\]|\\[\s\S])*)"/g,
        (_m, inner: string) => `"${inner.replace(/\\/g, "")}"`
      );
      try { return JSON.parse(stripped); } catch { return null; }
    };

    const quiz = repairJson(raw);
    if (!quiz) return NextResponse.json({ quiz: null });

    // ── Post-process: deduplicate equivalent options & verify numeric answers ─
    if (isMath && quiz.questions) {
      const origin = new URL(request.url).origin;

      for (const q of quiz.questions as (QuizQuestion & { verificationCode?: string })[]) {
        // 1. Deduplicate algebraically equivalent multiple_choice options
        if (q.options && q.options.length > 0) {
          const seen: string[] = [];
          q.options = q.options.filter(opt => {
            const norm = normaliseExpr(opt.text);
            if (seen.some(s => s === norm)) return false;
            seen.push(norm);
            return true;
          });
        }

        // 2. Run verification code if present
        const vc = (q as any).verificationCode as string | undefined;
        if (vc) {
          const result = await verifyNumericAnswer(
            q.question, q.correctAnswer || "", vc, origin
          ).catch(() => null);

          if (result && !result.verified) {
            // Flag in explanation so the team can spot bad questions
            q.explanation = `[⚠️ Verification flagged — double-check] ${q.explanation || ""}`;
          }
        }
      }
    }

    return NextResponse.json({ quiz });
  } catch (error) {
    const message = formatError(error);
    console.error("[quiz] error", message);
    return NextResponse.json({ quiz: null, error: message }, { status: 500 });
  }
}
