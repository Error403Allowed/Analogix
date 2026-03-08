import { callHfChatStream, formatError, classifyTaskType } from "../_utils";
import type { ChatMessage, UserContext } from "@/types/chat";
import { getFormulaSheetContext } from "@/data/formulaSheets";

export const runtime = "nodejs";

// Re-use the exact same system prompt builder as the non-streaming route.
// Keeping it in _utils would be cleaner long-term, but co-locating here avoids
// touching the existing route and breaking anything.
function buildSystemPrompt(
  userContext: Partial<UserContext> & { analogyIntensity?: number; analogyAnchor?: string },
  messages: ChatMessage[],
): string {
  const analogyIntensity = userContext?.analogyIntensity ?? 1;
  const studentGrade = userContext?.grade || "7-12";
  const studentState = userContext?.state || null;

  const STATE_FULL_NAMES: Record<string, string> = {
    NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland",
    WA: "Western Australia", SA: "South Australia", TAS: "Tasmania",
    ACT: "Australian Capital Territory", NT: "Northern Territory",
  };
  const stateFullName = studentState ? (STATE_FULL_NAMES[studentState] || studentState) : null;
  const studentLocation = stateFullName ? `${stateFullName}, Australia` : "Australia";

  const curriculumContext = stateFullName
    ? `The student is in Year ${studentGrade} in ${stateFullName} (${studentState}), Australia. Always align explanations, examples, terminology, and curriculum references to the ${stateFullName} syllabus and Australian educational standards for Year ${studentGrade}. Use Australian spelling and terminology (e.g. "maths" not "math", "Year" not "Grade").`
    : `The student is in Year ${studentGrade} in Australia. Always align explanations to the Australian curriculum for Year ${studentGrade}. Use Australian spelling and terminology.`;

  const interestList = userContext?.hobbies?.filter(Boolean) ?? [];
  const allowedInterests = interestList.length > 0 ? interestList.join(", ") : "General";

  const findExplicitInterest = (text: string, interests: string[]) => {
    const lower = text.toLowerCase();
    let best: { interest: string; index: number } | null = null;
    for (const interest of interests) {
      const idx = lower.indexOf(interest.toLowerCase());
      if (idx >= 0 && (!best || idx < best.index)) best = { interest, index: idx };
    }
    return best?.interest ?? null;
  };

  const latestUser = [...messages].reverse().find(m => m.role === "user")?.content || "";
  const explicitFromContext = userContext?.analogyAnchor?.trim() || null;
  const explicitFromMessage = latestUser ? findExplicitInterest(latestUser, interestList) : null;
  const randomInterest = interestList.length > 0 ? interestList[Math.floor(Math.random() * interestList.length)] : null;
  const analogyAnchor = explicitFromContext || explicitFromMessage || randomInterest || undefined;

  const analogyGuidance = ["Use no analogies at all.", "Use minimal analogies.", "Use analogies as the primary teaching tool — lead with a hobby-based analogy.", "Use frequent analogies.", "Use extensive analogies.", "Use only analogies."][analogyIntensity];

  const primarySubjectForFormulas = userContext?.subjects?.[0] || null;
  const formulaSheetContext = primarySubjectForFormulas ? getFormulaSheetContext(primarySubjectForFormulas) : "";

  return `You are "Analogix AI", a brilliant, empathetic, and slightly quirky AI tutor. You don't just teach; you make lightbulbs go off.

Student Location & Curriculum: ${curriculumContext}
Today's date: ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}.

Allowed Interests (verbatim): ${allowedInterests}
Analogy Anchor: ${analogyAnchor || "Choose one from Allowed Interests."}
Analogy Intensity: ${analogyIntensity}/5 — ${analogyGuidance}

Core rules:
- Warm, conversational tone. Sound like a smart friend.
- Match Year ${studentGrade} vocabulary. Australian English always.
- Use LaTeX for ALL maths: inline $x$, display $$\\frac{a}{b}$$.
- No emojis in body text.
${analogyIntensity > 0 ? `- Lead with an analogy from the student's interests. Build understanding through it, then close the loop.` : ""}

GRAPHING RULE: When explaining any plottable function or equation, include a Desmos block BEFORE the explanation:
\`\`\`desmos
y=x^2
[bounds: -10,10,-6,6]
\`\`\`
One expression per line. Only when it genuinely helps.

REMEMBER: You are the bridge between what they love and what they need to learn.${formulaSheetContext ? `\n\n--- FORMULA REFERENCE ---\n${formulaSheetContext}\n--- END FORMULA REFERENCE ---` : ""}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages: ChatMessage[] = body.messages || [];
    const userContext: Partial<UserContext> & { analogyIntensity?: number; analogyAnchor?: string } = body.userContext || {};

    const systemPrompt = buildSystemPrompt(userContext, messages);
    const primarySubject = userContext?.subjects?.[0];
    const taskType = classifyTaskType(messages, primarySubject);

    const upstreamStream = await callHfChatStream(
      {
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.filter(m => m.role !== "system"),
        ],
        max_tokens: 4096,
        temperature: 0.55,
      },
      taskType,
    );

    // Pipe the upstream SSE stream straight to the client.
    // Each chunk is already in `data: {...}\n\n` SSE format from Groq.
    return new Response(upstreamStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/groq/chat-stream]", message);
    return new Response(
      `data: ${JSON.stringify({ error: message })}\n\n`,
      { status: 500, headers: { "Content-Type": "text/event-stream" } },
    );
  }
}
