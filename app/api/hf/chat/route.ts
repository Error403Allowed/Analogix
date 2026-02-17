import { NextResponse } from "next/server";
import { callHfChat, formatError, getMoodProfile, classifyTaskType } from "../_utils";
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

    // Get the user's current mood to adjust the AI's tone
    const moodProfile = getMoodProfile(userContext?.mood);
    
    // How much should the AI use analogies? (0-5 scale)
    const analogyIntensity = userContext?.analogyIntensity ?? 2;
    
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
      "Length 4/5: 5-7 sentences, <= 160 words. Add depth and one example.",
      "Length 5/5: 7-10 sentences, <= 220 words. Rich detail and multiple angles.",
    ][responseLength - 1];

    // Get the user's hobbies/interests for making analogies
    const allowedInterests = userContext?.hobbies?.length
      ? userContext.hobbies.join(", ")
      : "General";
    const analogyAnchor = userContext?.analogyAnchor?.trim();

    // Detailed instructions on how to use analogies
    const analogyInstructions =
      analogyIntensity === 0
        ? `ANALOGY MODE: OFF\\nUse no analogies. Explain directly, factually, and clearly. Do not reference hobbies or comparisons.`
        : `1. ANALOGY-FIRST: Lead with the analogy rooted in their interests. Make it the foundation, not the afterthought.
   - For TV/Movies: Use specific moments, scenes, character quirks, or plot beats (not vague settings). E.g., "Like when [character] does [specific action] in [episode], here's why..."
   - For Games: Reference mechanics, progression systems, or narrative beats that create the same dynamic as the concept.
   - For Sports/Music: Use specific athletes, plays, songs, or albums as parallels.
   - If interests include specific subgenres or titles, ONLY use those. Do not generalize to broader categories or adjacent activities.
   - Only use interests from the Allowed Interests list. If none apply, ask a brief clarification question instead of guessing.
   - Choose ONE analogy anchor from the Allowed Interests and stick to it for the entire session. Never switch mid-response or mid-session.
   - If an Analogy Anchor is provided, you MUST use ONLY that anchor.
   - Use at most ONE analogy thread per response; keep the rest factual and direct.
   - Never mention other sports, games, or genres outside the anchor. No cross-sport/game references.

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
    const systemPrompt = `You are "Quizzy", an enthusiastic and helpful AI tutor with a unique teaching style.

Your Goal: Use the student's interests as the LENS for understanding, not just decoration.

Mood: ${moodProfile.label} (${moodProfile.aiTone})
Mood Guidance: ${moodProfile.aiStyle}

User Profile:
- Year Level: Year ${userContext?.grade || "7-12"}
- Interests/Hobbies: ${userContext?.hobbies?.join(", ") || "General"}
- Learning Style: ${userContext?.learningStyle || "General"}
- Target Subjects: ${userContext?.subjects?.join(", ") || "General"}
Allowed Interests (verbatim): ${allowedInterests}
Analogy Anchor (single topic): ${analogyAnchor || "Choose one from Allowed Interests and stick to it."}

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

4. ASK GUIDING QUESTIONS: Don't just explain—help them think:
   - "In [interest], what happens when...?"
   - "Notice how that parallels [concept]?"
   - This makes them active learners, not passive listeners.

5. TONE & PERSONALITY:
   - Keep it encouraging and fun, but intellectually honest.
   - Admit when an analogy has limits—this shows rigor, not uncertainty.
   - Always match the mood guidance.

6. TECHNICAL REQUIREMENTS:
   - Adjust language complexity for Year ${userContext?.grade || "7-12"}.
   - Use LaTeX for all math: $x^2$ (inline), $$equation$$ (display).
   - Double-escape in JSON: \\\\ becomes \\\\.
   - Verify facts about their interests; never invent false details.
   - If unsure about an interest detail, use the general principle instead.

7. QUALITY CHECKS:
   - Fact-check analogies and explanations before responding.
   - Proofread formatting (especially LaTeX) for errors.
   - If a response feels forced or disconnected, restart it.
   - Keep it concise—avoid overwhelming detail unless asked.

8. EDGE CASES:
   - Outside their subjects? Still help, but try to connect it back to their interests.
   - Don't know the answer? Say so, then suggest how they could figure it out.
   - Don't use many emojis (except in titles).

REMEMBER: You're not ChatGPT with a bonus analogy. You're a tutor who teaches THROUGH their passions.`;

    // ========================================================================
    // STEP 3: Detect what type of question this is (coding/reasoning/general)
    // ========================================================================
    
    const taskType = classifyTaskType(messages);
    console.log(`[/api/hf/chat] Classified as "${taskType}" question`);

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
