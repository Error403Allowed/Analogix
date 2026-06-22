import { NextResponse } from "next/server";
import { callGroqChatStream, formatError, classifyTaskType } from "../_utils";
import type { ChatMessage, UserContext } from "@/types/chat";
import { getFormulaSheetContext } from "@/data/formulaSheets";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages: ChatMessage[] = body.messages || [];
    const userContext: Partial<UserContext> & {
      analogyIntensity?: number;
      responseLength?: number;
      analogyAnchor?: string;
      pageContext?: string;
    } = body.userContext || {};

    const analogyIntensity = userContext?.analogyIntensity ?? 1;
    const studentGrade = userContext?.grade || "7-12";
    const studentState = userContext?.state || null;

    const STATE_FULL_NAMES: Record<string, string> = {
      NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland",
      WA: "Western Australia", SA: "South Australia", TAS: "Tasmania",
      ACT: "Australian Capital Territory", NT: "Northern Territory",
    };
    const stateFullName = studentState ? (STATE_FULL_NAMES[studentState] || studentState) : null;

    const curriculumContext = stateFullName
      ? `The student is in Year ${studentGrade} in ${stateFullName} (${studentState}), Australia. Always align explanations, examples, terminology, and curriculum references to the ${stateFullName} syllabus and Australian educational standards for Year ${studentGrade}. Use Australian spelling and terminology.`
      : `The student is in Year ${studentGrade} in Australia. Always align explanations to the Australian curriculum for Year ${studentGrade}. Use Australian spelling and terminology.`;

    const analogyGuidance = [
      "Use no analogies at all - focus exclusively on raw facts and concepts.",
      "Use minimal analogies - mostly facts with rare hobby-based comparisons.",
      "Use some analogies - balance facts with occasional hobby-based analogies.",
      "Use frequent analogies - explain most concepts using hobby-based analogies.",
      "Use extensive analogies with DIRECT MAPPING - show point-by-point correspondence between concept parts and analogy parts.",
      "Use only analogies with DIRECT MAPPING - every concept maps to an analogy component.",
    ][analogyIntensity];

    const primarySubjectForFormulas = userContext?.subjects?.[0] || null;
    const formulaSheetContext = primarySubjectForFormulas
      ? getFormulaSheetContext(primarySubjectForFormulas)
      : "";

    const maxTokens = 4096;
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

    const latestUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const explicitFromMessage = latestUserMessage ? findExplicitInterest(latestUserMessage, interestList) : null;
    const explicitFromContext = userContext?.analogyAnchor?.trim() || null;
    const randomInterest = interestList.length > 0 ? interestList[Math.floor(Math.random() * interestList.length)] : null;
    const analogyAnchor = explicitFromContext || explicitFromMessage || randomInterest || undefined;

    const analogyInstructions =
      analogyIntensity === 0
        ? `ANALOGY MODE: OFF\nUse no analogies. Explain directly, factually, and clearly.`
        : `1. ANALOGY-OPTIONAL: Use an analogy only when it improves clarity.\n   - Use ONLY the Analogy Anchor provided.\n   - Build the explanation through the analogy.\n   - Keep it natural and conversational.`;

    const teachingApproach = analogyIntensity === 0
      ? "Build understanding through clear, direct explanations grounded in facts."
      : "Build understanding THROUGH the analogy, not around it.";

    const complexityGuidance = analogyIntensity === 0
      ? `2. LAYER COMPLEXITY GRADUALLY:\n   - Start: Plain-language summary\n   - Deepen: The mechanism\n   - Clarify: Edge cases`
      : `2. LAYER COMPLEXITY GRADUALLY:\n   - Start: Simple parallel\n   - Deepen: The mechanism\n   - Acknowledge: Where the analogy breaks`;

    const systemPrompt = `You are "Analogix AI", a brilliant, empathetic AI tutor helping a student write their document.

Student Location & Curriculum:
${curriculumContext}

Today's date: ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}.

Your Mission: Help the student understand and write about their subject. Provide clear, well-formatted explanations that they can use in their document.

Response Style:
- Tone: warm, conversational, encouraging
- Format: Use proper Markdown with LaTeX for math
- Math: Use $...$ for inline and $$...$$ for display math
- Length: ${analogyGuidance}

CORE TEACHING PHILOSOPHY:
${teachingApproach}

Instructions:
${analogyInstructions}
${complexityGuidance}

Technical Requirements:
- Use LaTeX for ALL math expressions
- Inline Math: $E=mc^2$ or $x$
- Display Math: $$\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$
- Double-escape backslashes: \\\\ becomes \\\\\\\\
- Use Markdown formatting (bold, lists, headings) appropriately

Allowed Interests: ${allowedInterests}
Analogy Anchor: ${analogyAnchor || "Choose one from Allowed Interests"}

${formulaSheetContext ? `\n--- FORMULA REFERENCE ---\n${formulaSheetContext}\n--- END FORMULA REFERENCE ---` : ""}`;

    const primarySubject = userContext?.subjects?.[0];
    const taskType = classifyTaskType(messages, primarySubject);

    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    (async () => {
      try {
        const stream = await callGroqChatStream(
          {
            messages: [
              {
                role: "system",
                content: systemPrompt + (userContext?.pageContext
                  ? `\n\n--- PAGE CONTEXT ---\n${userContext.pageContext}\n--- END PAGE CONTEXT ---`
                  : ""),
              },
              ...messages.filter(m => m.role !== "system"),
            ],
            max_tokens: maxTokens,
            temperature: 0.55,
          },
          taskType
        );

        const reader = stream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = new TextDecoder().decode(value);
          await writer.write(encoder.encode(`data: ${chunk}\n\n`));
        }
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        const message = formatError(error);
        console.error("[/api/groq/doc-chat] Stream error:", message);
        await writer.write(encoder.encode(`data: {"error": "${message.replace(/"/g, '\\"')}" }\n\n`));
      } finally {
        await writer.close();
      }
    })();

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    const message = formatError(error);
    console.error("[/api/groq/doc-chat] Error:", message);
    return NextResponse.json(
      { role: "assistant", content: "AI service unavailable.", error: message },
      { status: 500 },
    );
  }
}
