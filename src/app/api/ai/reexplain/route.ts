import { NextResponse } from "next/server";
import { runText, type TaskType } from "@/lib/ai";
import { requireUser } from "@/lib/api-auth";
import type { ChatMessage } from "@/types/chat";

export const runtime = "nodejs";

const STATE_FULL_NAMES: Record<string, string> = {
  NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland",
  WA: "Western Australia", SA: "South Australia", TAS: "Tasmania",
  ACT: "Australian Capital Territory", NT: "Northern Territory",
};

interface ReexplainUserContext {
  grade?: string;
  state?: string;
  hobbies?: string[];
  interests?: { byCategory?: Record<string, string[]> };
  chosenAnchor?: string;
  previousExplanation?: string;
  subjects?: string[];
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json();
    const messages: ChatMessage[] = body.messages || [];
    const userContext: ReexplainUserContext = body.userContext || {};

    const studentGrade = userContext?.grade || "7-12";
    const studentState = userContext?.state || null;
    const stateFullName = studentState ? STATE_FULL_NAMES[studentState] || studentState : null;

    const rawInterests =
      userContext?.interests && typeof userContext.interests === "object"
        ? userContext.interests.byCategory ?? {}
        : {};
    const interestPool = [
      ...Object.values(rawInterests).flat(),
      ...(userContext?.hobbies?.filter(Boolean) ?? []),
    ].filter((v, i, arr) => v && arr.indexOf(v) === i);
    const chosenAnchor = userContext?.chosenAnchor?.trim() || null;
    const previousExplanation = userContext?.previousExplanation || "";

    const anchorInstruction = chosenAnchor
      ? `You MUST build your entire explanation around the student's actual interest: "${chosenAnchor}". Every concept must be explained through that specific lens.`
      : `Choose ONE interest from this list and explain the concept through it: ${interestPool.join(", ")}. Do NOT use the same framing as the previous explanation.`;

    const systemPrompt = `You are "Analogix AI", a brilliant AI tutor who can explain any concept in multiple creative ways.

${stateFullName ? `The student is in Year ${studentGrade} in ${stateFullName}, Australia. Use the ${stateFullName} curriculum and Australian English.` : `The student is in Year ${studentGrade} in Australia. Use Australian English.`}

Your job: Re-explain the SAME concept from the conversation but in a completely fresh way.

Rules:
- Do NOT repeat the same analogies, examples, or framing from the previous explanation.
- ${anchorInstruction}
- Start with a completely different hook or entry point into the concept.
- Use natural paragraphs - no headings or bullet points.
- Match vocabulary to Year ${studentGrade}.
- Be warm, conversational, and curious - like a smart friend finding a new angle. Talk to the student directly, make it feel like a fresh conversation, not a rewritten essay.
- Use LaTeX for all maths: inline $x$ and display $$\\frac{a}{b}$$.
- VALID LATEX ONLY (the renderer uses KaTeX): only well-formed, standard KaTeX commands; always balance $ / $$; never use & or \\\\ outside an environment like \\begin{aligned}...\\end{aligned} or \\begin{cases}...\\end{cases} inside the $$ block; never emit \\begin{align}/\\begin{equation} directly (use \\begin{aligned}); if given broken LaTeX, silently fix it rather than describing the error.

Previous explanation (DO NOT repeat this approach):
${previousExplanation}`;

    const taskType: TaskType = "reasoning";

    const { text } = await runText({
      system: systemPrompt,
      messages: messages.filter((m) => m.role !== "system") as ChatMessage[],
      taskType,
      userModel: null,
      temperature: 0.75,
      maxTokens: 4096,
    });

    return NextResponse.json({ role: "assistant", content: text });
  } catch (error) {
    console.error("[/api/ai/reexplain] Error:", error);
    return NextResponse.json(
      {
        role: "assistant",
        content: "Couldn't reach the AI service. Try again in a moment.",
        error: error instanceof Error ? error.message : "Re-explain failed",
      },
      { status: 500 },
    );
  }
}
