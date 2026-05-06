import { NextResponse } from "next/server";
import { callGroqChat, formatError, classifyTaskType } from "../_utils";
import type { ChatMessage, UserContext } from "@/types/chat";
import { getFormulaSheetContext } from "@/data/formulaSheets";
import { createClient } from "@/lib/supabase/server";
import { getUserAIPersonality, buildPersonalityInstructions } from "@/lib/aiMemory";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages: ChatMessage[] = body.messages || [];
    const userContext: Partial<UserContext> = body.userContext || {};

    const lastUserMessage = messages.filter(m => m.role === "user").pop()?.content || "";
    if (!lastUserMessage.trim()) {
      return NextResponse.json({ content: "" });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    let aiPersonality: Awaited<ReturnType<typeof getUserAIPersonality>> = null;
    if (user) {
      aiPersonality = await getUserAIPersonality(user.id);
    }

    const clientData = request.headers.get("x-client-data");
    if (clientData) {
      try {
        const parsed = JSON.parse(clientData);
        if (parsed.personality && !aiPersonality) {
          aiPersonality = parsed.personality;
        }
      } catch (e) {
        // Ignore
      }
    }

    const studentGrade = userContext?.grade || "7-12";
    const studentState = userContext?.state || null;
    const analogyIntensity = userContext?.analogyIntensity ?? 1;

    let systemPrompt = `You are "Analogix AI", a friendly tutor for Australian students.

Context: Year ${studentGrade} in Australia.
Today: ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}.

You are providing a QUICK PREVIEW while the user is typing. Keep it SHORT — 2-4 sentences max.
This is not the final answer, just a preview/estimate of how you'll respond.

Rules:
- Be concise, friendly, conversational
- No emojis
- Do not mention that you're providing a preview
- Match the user's likely intent`;

    if (aiPersonality) {
      const personalityInstructions = buildPersonalityInstructions(aiPersonality, analogyIntensity);
      systemPrompt = systemPrompt + `\n\n--- PERSONALITY ---\n${personalityInstructions}\n--- END PERSONALITY ---`;
    }

    const content = await callGroqChat({
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.filter(m => m.role !== "system"),
        { role: "user", content: lastUserMessage }
      ],
      max_tokens: 150,
      temperature: 0.5,
    }, "lightweight");

    return NextResponse.json({ content: content || "" });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/groq/chat-preview] error", message);
    return NextResponse.json({ content: "", error: message }, { status: 500 });
  }
}