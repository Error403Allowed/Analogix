import { NextResponse } from "next/server";
import { buildSystemPrompt, runText } from "@/lib/ai";
import { requireUser } from "@/lib/api-auth";
import type { ChatMessage, UserContext } from "@/types/chat";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json();
    const messages: ChatMessage[] = body.messages || [];
    const userContext: Partial<UserContext> & { analogyIntensity?: number; analogyAnchor?: string } =
      body.userContext || {};

    const systemPrompt = buildSystemPrompt({
      userContext: userContext as UserContext,
      messages,
    });

    const { text } = await runText({
      system: systemPrompt,
      messages: messages.filter((m) => m.role !== "system") as ChatMessage[],
      temperature: 0.75,
      maxTokens: 1024,
    });

    return NextResponse.json({ role: "assistant", content: text });
  } catch (error) {
    console.error("[/api/ai/complete] Error:", error);
    return NextResponse.json(
      {
        role: "assistant",
        content:
          "I couldn't reach the AI service. " +
          (error instanceof Error ? error.message : "").trim(),
        error: error instanceof Error ? error.message : "Completion failed",
      },
      { status: 500 },
    );
  }
}
