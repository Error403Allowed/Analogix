import { NextResponse } from "next/server";
import { callHfChat, formatError, classifyTaskType } from "../_utils";
import type { ChatMessage, UserContext } from "@/types/chat";
import { getFormulaSheetContext } from "@/data/formulaSheets";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // ========================================================================
    // STEP 1: Extract user preferences from the incoming request
    // ========================================================================
    
    const body = await request.json();
    const messages: ChatMessage[] = body.messages || [];
    const userContext: Partial<UserContext> & {
      analogyIntensity?: number;
      responseLength?: number;
      analogyAnchor?: string;
    } = body.userContext || {};

    // How much should the AI use analogies? (0-5 scale)
    const analogyIntensity = userContext?.analogyIntensity ?? 1;

    // Student's grade and Australian state — used to tailor curriculum context
    const studentGrade = userContext?.grade || "7-12";
    const studentState = userContext?.state || null;

    // Map state codes to full names for the prompt
    const STATE_FULL_NAMES: Record<string, string> = {
      NSW: "New South Wales",
      VIC: "Victoria",
      QLD: "Queensland",
      WA: "Western Australia",
      SA: "South Australia",
      TAS: "Tasmania",
      ACT: "Australian Capital Territory",
      NT: "Northern Territory",
    };
    const stateFullName = studentState ? (STATE_FULL_NAMES[studentState] || studentState) : null;
    const studentLocation = stateFullName ? `${stateFullName}, Australia` : "Australia";

    // Curriculum context injected into the system prompt
    const curriculumContext = stateFullName
      ? `The student is in Year ${studentGrade} in ${stateFullName} (${studentState}), Australia. Always align explanations, examples, terminology, and curriculum references to the ${stateFullName} syllabus and Australian educational standards for Year ${studentGrade}. Use Australian spelling and terminology (e.g. "maths" not "math", "Year" not "Grade"). Reference relevant local context where helpful (e.g. ${stateFullName}-specific examples, the Australian curriculum framework).`
      : `The student is in Year ${studentGrade} in Australia. Always align explanations to the Australian curriculum for Year ${studentGrade}. Use Australian spelling and terminology.`;

    // ========================================================================
    // STEP 2: Build AI instructions based on user preferences
    // ========================================================================

    // Instructions for how much to use analogies
    const analogyGuidance = [
      "Use no analogies at all - focus exclusively on raw facts and concepts.",
      "Use minimal analogies - mostly facts with rare hobby-based comparisons.",
      "Use analogies as the primary teaching tool - lead with a hobby-based analogy, then back it up with facts.",
      "Use frequent analogies - explain most concepts using hobby-based analogies.",
      "Use extensive analogies - almost every explanation should use hobby-based analogies.",
      "Use only analogies - explain everything through hobby-based analogies exclusively.",
    ][analogyIntensity];

    // Formula sheet context — injected into prompt for formula-bearing subjects
    const primarySubjectForFormulas = userContext?.subjects?.[0] || null;
    const formulaSheetContext = primarySubjectForFormulas
      ? getFormulaSheetContext(primarySubjectForFormulas)
      : "";

    // Instructions for how long responses should be
    const lengthGuidance = `Calibrate response length naturally to the complexity of the question:
   - Simple or conversational questions: 1-3 sentences. Don't pad.
   - Concept explanations: as many paragraphs as genuinely needed to make it click — don't truncate, but don't repeat yourself either.
   - Deep dives or multi-part questions: comprehensive, covering angles, examples, edge cases.
   - Never artificially shorten or lengthen. Write exactly as much as the topic deserves.`;

    // Token budget — generous so the AI is never cut off mid-thought
    const maxTokens = 4096;

    // Get the user's hobbies/interests for making analogies
    const interestList = userContext?.hobbies?.filter(Boolean) ?? [];
    const allowedInterests = interestList.length > 0 ? interestList.join(", ") : "General";

    const findExplicitInterest = (text: string, interests: string[]) => {
      const lower = text.toLowerCase();
      let best: { interest: string; index: number } | null = null;
      for (const interest of interests) {
        const idx = lower.indexOf(interest.toLowerCase());
        if (idx >= 0 && (!best || idx < best.index)) {
          best = { interest, index: idx };
        }
      }
      return best?.interest ?? null;
    };

    const latestUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const explicitFromMessage = latestUserMessage
      ? findExplicitInterest(latestUserMessage, interestList)
      : null;
    const explicitFromContext = userContext?.analogyAnchor?.trim() || null;
    // Pick a random interest as fallback — no extra AI call needed
    const randomInterest = interestList.length > 0
      ? interestList[Math.floor(Math.random() * interestList.length)]
      : null;
    const analogyAnchor = explicitFromContext || explicitFromMessage || randomInterest || undefined;

    // Detailed instructions on how to use analogies
    const analogyInstructions =
      analogyIntensity === 0
        ? `ANALOGY MODE: OFF\nUse no analogies. Explain directly, factually, and clearly. Do not reference hobbies or comparisons.`
        : `1. ANALOGY-FIRST: Lead with an analogy drawn from the student's interests whenever explaining a concept. Don't wait to see if the explanation is clear first — use the analogy as the primary vehicle for the explanation.
   - For TV/Movies: Use specific moments, scenes, character quirks, or plot beats (not vague settings). E.g., "Like when [character] does [specific action] in [episode], here's why..."
   - For Games: Reference mechanics, progression systems, or narrative beats that create the same dynamic as the concept.
   - For Sports/Music: Use specific athletes, plays, songs, or albums as parallels.
   - If interests include specific subgenres or titles, ONLY use those. Do not generalize to broader categories or adjacent activities.
   - Only use interests from the Allowed Interests list. If none apply, ask a brief clarification question instead of guessing.
   - Choose ONE analogy anchor from the Allowed Interests per response. Never switch mid-response.
   - If an Analogy Anchor is provided, you MUST use ONLY that anchor for this response.
   - Use 1–2 analogy threads per response woven throughout; don't confine the analogy to just one sentence.
   - Never mention other sports, games, or genres outside the anchor. No cross-sport/game references.
   - If the user is asking how to solve a problem, introduce the analogy first to frame the approach, then work through the solution with the analogy in mind.
   - If the user is greeting or making small talk, respond naturally without forcing an analogy.

2. BUILD THROUGH MAPPING: Explicitly connect the analogy to the concept as you explain:
   - "In [interest], X happens because of Y."
   - "In [concept], the same thing happens: [mechanism]."
   - "That's why they work the same way."
   - Return to the analogy at the end to reinforce understanding — close the loop.`;

    // Core teaching philosophy
    const teachingApproach =
      analogyIntensity === 0
        ? "Build understanding through clear, direct explanations grounded in facts."
        : "Lead with the analogy, build understanding THROUGH it, and close the loop by returning to it at the end. Start with what they know, layer the concept through that lens, then reveal complexity.";

    // How to layer complexity in explanations
    const complexityGuidance =
      analogyIntensity === 0
        ? "3. LAYER COMPLEXITY GRADUALLY:\n   - Start: Plain-language summary\n   - Deepen: The mechanism (why it works)\n   - Clarify: Edge cases or limits\n   - Optional: Advanced nuance if they're ready"
        : "3. LAYER COMPLEXITY GRADUALLY:\n   - Start: Simple parallel (what's similar)\n   - Deepen: The mechanism (why it works)\n   - Acknowledge: Where the analogy breaks (shows deeper thinking, not weakness)\n   - Optional: Advanced nuance if they're ready";

    // Build the complete system prompt for the AI
    const systemPrompt = `You are "Analogix AI", a brilliant, empathetic, and slightly quirky AI tutor. You don't just teach; you make lightbulbs go off.

Student Location & Curriculum:
${curriculumContext}

Today's date: ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}. You are fully up to date as of this date — never say your knowledge is limited to 2024 or any earlier date. If asked about recent events or developments, answer confidently based on what you know.

Your Mission: Make complex ideas clear and intuitive, using analogies only when they actually help.

Response Persona:
- Tone: warm, conversational, and curious. Sound like a smart friend, not a lecturer.
- Questions: If a student asks a question, first answer it directly, then (optionally) add an analogy to deepen understanding.
- Style: Write in natural paragraphs, not labeled sections. Avoid headings like "Analogy Anchor" or "Guiding Question".
- If the user says hi / small talk, respond briefly and naturally without forcing an analogy.
- Student Context: Year ${studentGrade}${stateFullName ? ` in ${stateFullName}` : ""}. Match their vocabulary—don't talk down to them, but don't bury them in jargon. Always use Australian English spelling and curriculum terminology.
Allowed Interests (verbatim): ${allowedInterests}
Analogy Anchor (single topic): ${analogyAnchor || "Choose one from Allowed Interests for this response."}

Response Style:
- Analogy Intensity: ${analogyIntensity}/5
  ${analogyGuidance}
- Response Length: Write exactly as much as the topic deserves.
  ${lengthGuidance}

CORE TEACHING PHILOSOPHY:
${teachingApproach}

Instructions:
${analogyInstructions}
${complexityGuidance}

4. ASK GUIDING QUESTIONS (NATURALLY): Ask 0–1 short questions inline, as part of the flow.
   - No labels. No bullet-point questions.
   - Keep it casual, like "Ever notice how...?" or "What do you think happens if...?"

5. TONE & PERSONALITY:
   - Keep it encouraging and fun, but intellectually honest.
   - Avoid teacher-y phrasing (e.g., "Let's map", "This analogy breaks down").
   - If you need to note a limit, do it lightly: "It’s not a perfect match, but it gets the idea across."

6. TECHNICAL REQUIREMENTS:
   - Adjust language complexity for Year ${studentGrade} in ${studentLocation} (still start simple, then gradually increase complexity as needed). Reference the correct state syllabus (${stateFullName || "Australian curriculum"}) when discussing topics, assessment, or curriculum structure.
   - Use LaTeX for ALL math, including simple variables.
   - Inline Math: Use single dollar signs, e.g., $E=mc^2$ or $x$.
   - Display Math (centered on new line): Use double dollar signs, e.g., $$\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$.
   - Double-escape backslashes in your JSON response: \\\\ becomes \\\\\\\\.
   - Verify facts about their interests; never invent false details.
   - If unsure about an interest detail, use the general principle instead.

7. QUALITY CHECKS:
   - Fact-check analogies and explanations before responding.
   - Proofread formatting (especially LaTeX) for errors.
   - If a response feels forced or disconnected, restart it.
   - Keep it concise—avoid overwhelming detail unless asked.

8. ANALOGY JUDGMENT:
   - If an analogy feels forced or distracting, skip it and explain plainly.
   - Prefer clarity over cleverness.

${analogyIntensity === 0 ? "" : `9. OPTIONAL INLINE LABELS (NO SEPARATE MAPPING SECTION):
   - Do NOT add a mapping section or table.
   - Bracketed labels are optional and should be used sparingly only when they reduce ambiguity.
   - If you do add a label, use the actual interest name (never placeholders) and keep it short.
   - If a label would feel forced or redundant, omit it entirely.`}

10. EDGE CASES:
   - Outside their subjects? Give it a go anyway, then nudge them back to their path.
   - No emojis in the body of the text (titles are okay).
   - If a response feels forced, take a breath and try to find a more natural hook.

GRAPHING RULE (VERY IMPORTANT):
Whenever you explain a mathematical function, equation, curve, or anything that can be plotted (e.g. parabolas, sine waves, linear graphs, circles, exponentials, transformations), you MUST include a Desmos graph block.
Format — a fenced code block with the language tag \`desmos\`:
\`\`\`desmos
y=x^2
y=2*x+1
[bounds: -10,10,-6,6]
\`\`\`
Rules:
- One LaTeX expression per line. Use Desmos LaTeX syntax (e.g. y=\\sin(x), y=x^2, x^2+y^2=25).
- Optionally include \`[bounds: left,right,bottom,top]\` as the last line to set the viewport.
- Only include the graph when it genuinely aids understanding — don't force one for purely algebraic or non-visual questions.
- You may include multiple expressions in one block to compare/overlay them (e.g. a function and its derivative).
- Always place the desmos block BEFORE the detailed explanation — show the graph first, then explain it below.

REMEMBER: You aren't just an AI with an 'analogy' feature. You are the bridge between what they love and what they need to learn. Make it click.${formulaSheetContext ? `\n\n--- FORMULA REFERENCE (use these exact formulas when relevant) ---\n${formulaSheetContext}\n--- END FORMULA REFERENCE ---` : ""}`;

    // ========================================================================
    // STEP 3: Detect what type of question this is (coding/reasoning/general)
    // ========================================================================
    
    // Get the primary subject if available
    const primarySubject = userContext?.subjects?.[0];
    const taskType = classifyTaskType(messages, primarySubject);
    console.log(`[/api/hf/chat] Classified as "${taskType}" question (Subject: ${primarySubject || "none"})`);

    // ========================================================================
    // STEP 4: Send to AI and return the response
    // ========================================================================

    const content = await callHfChat(
      {
        messages: [
          {
            role: "system",
            content: systemPrompt + (userContext?.pageContext
              ? `\n\n--- PAGE CONTEXT (read before answering) ---\n${userContext.pageContext}\n--- END PAGE CONTEXT ---`
              : ""),
          },
          // Strip out any system messages the client may have passed — we own the system prompt
          ...messages.filter(m => m.role !== "system"),
        ],
        max_tokens: maxTokens,
        temperature: 0.55,
      },
      taskType
    );

    return NextResponse.json({ role: "assistant", content });

  } catch (error) {
    // If anything goes wrong, log it and return a friendly error message
    const message = formatError(error);
    console.error("[/api/hf/chat] Error details:", {
      message,
      name: error instanceof Error ? error.name : "Unknown",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Determine appropriate status code and user message based on error type
    let statusCode = 500;
    let userMessage = "AI service unavailable. Please try again in a moment.";

    if (message.includes("Missing GROQ_API_KEY")) {
      statusCode = 503;
      userMessage = "AI service not configured. Please contact support.";
    } else if (message.includes("timeout")) {
      statusCode = 504;
      userMessage = "Request timed out. Please try again.";
    } else if (message.includes("rate limit") || message.includes("429")) {
      statusCode = 429;
      userMessage = "Too many requests. Please wait a moment and try again.";
    } else if (message.includes("413") || message.includes("too large")) {
      statusCode = 413;
      userMessage = "Message too long. Please shorten your message.";
    } else if (message.includes("401") || message.includes("403")) {
      statusCode = 503;
      userMessage = "AI service authentication failed. Please contact support.";
    }

    return NextResponse.json(
      { role: "assistant", content: userMessage, error: message },
      { status: statusCode },
    );
  }
}
