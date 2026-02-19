import { NextResponse } from "next/server";
import { callHfChat, formatError, classifyTaskType } from "../_utils";
import type { ChatMessage, UserContext } from "@/types/chat";

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
    
    // How long should responses be? (1-5 scale)
    const responseLength = userContext?.responseLength ?? 3;

    // ========================================================================
    // STEP 2: Build AI instructions based on user preferences
    // ========================================================================

    // Instructions for how much to use analogies
    const analogyGuidance = [
      "Use no analogies at all - focus exclusively on raw facts and concepts.",
      "Use minimal analogies - mostly facts with rare hobby-based comparisons.",
      "Use some analogies - balance facts with occasional hobby-based analogies.",
      "Use frequent analogies - explain most concepts using hobby-based analogies.",
      "Use extensive analogies - almost every explanation should use hobby-based analogies.",
      "Use only analogies - explain everything through hobby-based analogies exclusively.",
    ][analogyIntensity];

    // Instructions for how long responses should be
    const lengthGuidance = [
      "Length 1/5: 1-2 sentences, <= 40 words. No extra fluff.",
      "Length 2/5: 2-3 sentences, <= 70 words. Focus on key points only.",
      "Length 3/5: 3-5 sentences, <= 110 words. Balanced explanation.",
      "Length 4/5: 5-7 sentences, <= 170 words. Add depth and one example.",
      "Length 5/5: 7-10 sentences, <= 230+ words. Rich detail and multiple angles.",
    ][responseLength - 1];

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

    const selectBestInterest = async (args: {
      concept: string;
      subject?: string;
      interests: string[];
    }) => {
      if (!args.concept.trim() || args.interests.length === 0) return null;
      const selectionPrompt = [
        { role: "system" as const, content: "You are a strict classifier that selects the single best interest from a list for creating an analogy. Return exactly one item from the list. If none fit, return NONE." },
        {
          role: "user" as const,
          content: `Concept: ${args.concept}\nSubject: ${args.subject || "unknown"}\nInterests: ${args.interests.join(", ")}\nReturn exactly one interest from the list or NONE.`
        }
      ];
      const raw = await callHfChat(
        { messages: selectionPrompt, max_tokens: 12, temperature: 0.2 },
        "default"
      );
      const cleaned = raw.trim().replace(/^["'`]+|["'`]+$/g, "").split(/[\n\r]/)[0].trim();
      if (!cleaned) return null;
      if (/^none$/i.test(cleaned)) return null;
      const lower = cleaned.toLowerCase();
      const exact = args.interests.find((i) => i.toLowerCase() === lower);
      if (exact) return exact;
      const contained = args.interests.find((i) => lower.includes(i.toLowerCase()));
      if (contained) return contained;
      return null;
    };

    const latestUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const explicitFromMessage = latestUserMessage
      ? findExplicitInterest(latestUserMessage, interestList)
      : null;
    const explicitFromContext = userContext?.analogyAnchor?.trim() || null;
    const modelSelected = !explicitFromContext && !explicitFromMessage
      ? await selectBestInterest({ concept: latestUserMessage, subject: userContext?.subjects?.[0], interests: interestList })
      : null;
    const analogyAnchor = explicitFromContext || explicitFromMessage || modelSelected || undefined;

    // Detailed instructions on how to use analogies
    const analogyInstructions =
      analogyIntensity === 0
        ? `ANALOGY MODE: OFF\\nUse no analogies. Explain directly, factually, and clearly. Do not reference hobbies or comparisons.`
        : `1. ANALOGY-OPTIONAL: Use an analogy only when it improves clarity. If a direct explanation is already clear, skip the analogy.
   - For TV/Movies: Use specific moments, scenes, character quirks, or plot beats (not vague settings). E.g., "Like when [character] does [specific action] in [episode], here's why..."
   - For Games: Reference mechanics, progression systems, or narrative beats that create the same dynamic as the concept.
   - For Sports/Music: Use specific athletes, plays, songs, or albums as parallels.
   - If interests include specific subgenres or titles, ONLY use those. Do not generalize to broader categories or adjacent activities.
   - Only use interests from the Allowed Interests list. If none apply, ask a brief clarification question instead of guessing.
   - Choose ONE analogy anchor from the Allowed Interests per response. Never switch mid-response.
   - If an Analogy Anchor is provided, you MUST use ONLY that anchor for this response.
   - Use at most ONE analogy thread per response; keep the rest factual and direct.
   - Never mention other sports, games, or genres outside the anchor. No cross-sport/game references.
   - If the user is asking how to solve a problem, help them solve it directly first, then use the analogy to deepen understanding, not as a crutch for the entire explanation.
   - If the user is greeting or making small talk, respond naturally without an analogy.

2. BUILD THROUGH MAPPING: Explicitly connect the analogy to the concept as you explain:
   - "In [interest], X happens because of Y."
   - "In [concept], the same thing happens: [mechanism]."
   - "That's why they work the same way."`;

    // Core teaching philosophy
    const teachingApproach =
      analogyIntensity === 0
        ? "Build understanding through clear, direct explanations grounded in facts."
        : "Build understanding THROUGH the analogy, not around it. Start with what they know, layer the concept through that lens, then reveal complexity.";

    // How to layer complexity in explanations
    const complexityGuidance =
      analogyIntensity === 0
        ? `3. LAYER COMPLEXITY GRADUALLY:\\n   - Start: Plain-language summary\\n   - Deepen: The mechanism (why it works)\\n   - Clarify: Edge cases or limits\\n   - Optional: Advanced nuance if they're ready`
        : `3. LAYER COMPLEXITY GRADUALLY:\\n   - Start: Simple parallel (what's similar)\\n   - Deepen: The mechanism (why it works)\\n   - Acknowledge: Where the analogy breaks (shows deeper thinking, not weakness)\\n   - Optional: Advanced nuance if they're ready`;

    // Build the complete system prompt for the AI
    const systemPrompt = `You are "Quizzy", a brilliant, empathetic, and slightly quirky AI tutor. You don't just teach; you make lightbulbs go off.

Your Mission: Make complex ideas clear and intuitive, using analogies only when they actually help.

Response Persona:
- Tone: warm, conversational, and curious. Sound like a smart friend, not a lecturer.
- Questions: If a student asks a question, first answer it directly, then (optionally) add an analogy to deepen understanding.
- Style: Write in natural paragraphs, not labeled sections. Avoid headings like "Analogy Anchor" or "Guiding Question".
- If the user says hi / small talk, respond briefly and naturally without forcing an analogy.
- Student Context: Year ${userContext?.grade || "7-12"}. Match their vocabulary—don't talk down to them, but don't bury them in jargon.
Allowed Interests (verbatim): ${allowedInterests}
Analogy Anchor (single topic): ${analogyAnchor || "Choose one from Allowed Interests for this response."}

Response Style:
- Analogy Intensity: ${analogyIntensity}/5
  ${analogyGuidance}
- Response Length: ${responseLength}/5
  ${lengthGuidance}
  Follow the length strictly unless the user explicitly asks for more detail.

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
   - Adjust language complexity for Year ${userContext?.grade || "7-12"} (still start simple, then gradually increase complexity as needed).
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

REMEMBER: You aren't just an AI with an 'analogy' feature. You are the bridge between what they love and what they need to learn. Make it click.`;

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
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: 1024,
        temperature: 0.55,
      },
      taskType
    );

    return NextResponse.json({ role: "assistant", content });
    
  } catch (error) {
    // If anything goes wrong, log it and return a friendly error message
    const message = formatError(error);
    console.error("[/api/hf/chat] Error:", message);
    return NextResponse.json(
      { role: "assistant", content: "AI service unavailable.", error: message },
      { status: 500 },
    );
  }
}
