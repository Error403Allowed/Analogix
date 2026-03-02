import { NextResponse } from "next/server";
import { callHfChat, formatError, classifyTaskType } from "../_utils";
import type { ChatMessage, UserContext } from "@/types/chat";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages: ChatMessage[] = body.messages || [];
    const userContext: Partial<UserContext> & {
      analogyIntensity?: number;
      chosenAnchor?: string;
      previousExplanation?: string;
    } = body.userContext || {};

    const studentGrade = userContext?.grade || "7-12";
    const studentState = userContext?.state || null;
    const STATE_FULL_NAMES: Record<string, string> = {
      NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland",
      WA: "Western Australia", SA: "South Australia", TAS: "Tasmania",
      ACT: "Australian Capital Territory", NT: "Northern Territory",
    };
    const stateFullName = studentState ? (STATE_FULL_NAMES[studentState] || studentState) : null;

    const interestList = userContext?.hobbies?.filter(Boolean) ?? [];
    const chosenAnchor = userContext?.chosenAnchor?.trim() || null;
    const previousExplanation = userContext?.previousExplanation || "";

    const anchorInstruction = chosenAnchor
      ? `You MUST anchor your entire explanation to: "${chosenAnchor}". Every concept must be explained through that specific lens.`
      : `Choose a DIFFERENT analogy anchor from this list: ${interestList.join(", ")}. Do NOT use the same anchor as the previous explanation.`;

    const systemPrompt = `You are "Quizzy", a brilliant AI tutor who can explain any concept in multiple creative ways.

${stateFullName ? `The student is in Year ${studentGrade} in ${stateFullName}, Australia. Use the ${stateFullName} curriculum and Australian English.` : `The student is in Year ${studentGrade} in Australia. Use Australian English.`}

Your job: Re-explain the SAME concept from the conversation but in a completely fresh way.

Rules:
- Do NOT repeat the same analogies, examples, or framing from the previous explanation.
- ${anchorInstruction}
- Start with a completely different hook or entry point into the concept.
- Use natural paragraphs — no headings or bullet points.
- Match vocabulary to Year ${studentGrade}.
- Be warm, conversational, and curious — like a smart friend finding a new angle.
- Use LaTeX for all maths: inline $x$ and display $$\\frac{a}{b}$$.

Previous explanation (DO NOT repeat this approach):
${previousExplanation}`;

    const primarySubject = userContext?.subjects?.[0];
    const taskType = classifyTaskType(messages, primarySubject);

    const content = await callHfChat(
      {
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.filter(m => m.role !== "system"),
        ],
        max_tokens: 1024,
        temperature: 0.75,
      },
      taskType
    );

    return NextResponse.json({ role: "assistant", content });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/hf/reexplain] Error:", message);
    return NextResponse.json(
      { role: "assistant", content: "Couldn't reach the AI service. Try again in a moment.", error: message },
      { status: 500 }
    );
  }
}
