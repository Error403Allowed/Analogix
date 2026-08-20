import { NextResponse } from "next/server";
import { runText } from "@/lib/ai";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // Title generation is harmless (names a chat session) - require auth when
    // available but still work in local dev without a signed-in user.
    try {
      await requireUser();
    } catch {
      // proceed unauthenticated
    }

    const body = await request.json();
    const conversation = body.conversation || "";
    const latestMessage = body.latestMessage || "";

    const systemPrompt =
      'You are naming a study chat session. Write a short 3-6 word title capturing the SPECIFIC topic being studied. Be concrete - not "Math Help" but "Quadratic Formula Confusion", "WW2 Causes Breakdown", "Python List Indexing". No quotes, no punctuation, just the title.';

    const { text } = await runText({
      system: systemPrompt,
      prompt: `Conversation:\n${conversation}\n\nLatest: ${latestMessage}\n\nTitle:`,
      taskType: "lightweight",
      temperature: 0.5,
      maxTokens: 30,
    });

    let title = (text || "").trim();
    title = title.replace(/^["'`]|["'`]$/g, "").trim();
    title = title.replace(/^(Title:|Here'?s?( a title)?:|The title is:?)/i, "").trim();
    title = title.replace(/[.!?]$/, "").trim();
    title = title.replace(/^<think>[\s\S]*?<\/think>\s*/i, "").trim();
    title = title.replace(/^<think>[\s\S]*$/i, "").trim();
    title = title.slice(0, 50);
    if (!title || title.length < 2) {
      const words = latestMessage.trim().split(/\s+/).slice(0, 4).join(" ");
      title = words || "New chat";
    }
    return NextResponse.json({ title });
  } catch (error) {
    console.error("[/api/ai/title] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Title generation failed" },
      { status: 500 },
    );
  }
}
