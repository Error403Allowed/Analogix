import { NextResponse } from "next/server";
import { callHfChatStream, classifyTaskType } from "../_utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, subject } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Build a simple system prompt for writing assistance
    const systemPrompt = `You are an expert writing assistant. Your task is to help users improve their text by following their instructions precisely.
    
Rules:
- Output ONLY the rewritten or generated text — no preamble, no explanation, no markdown backticks, no code fences.
- Plain text only.
- Follow the user's instruction exactly.
- If improving text, maintain the original meaning while enhancing clarity and flow.
- If fixing, correct all spelling, grammar, and punctuation errors.
- If summarising, use bullet points with • character, one per line.
- Keep the tone and style appropriate for the context.`;

    // Classify the task (most writing tasks are "default")
    const taskType = classifyTaskType([{ role: "user", content: prompt }], subject);

    // Get the streaming response from Groq
    const stream = await callHfChatStream(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      },
      taskType
    );

    // Return the stream directly
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[/api/groq/notion-ai] Error:", error);
    return NextResponse.json(
      { error: "AI service unavailable" },
      { status: 500 }
    );
  }
}
