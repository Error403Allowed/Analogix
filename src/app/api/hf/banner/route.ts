import { NextResponse } from "next/server";
import { callHfChat, formatError } from "../_utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userName: string = body.userName || "Student";
    const subjects: string[] = Array.isArray(body.subjects) ? body.subjects : [];

    const content = await callHfChat({
      messages: [
        {
          role: "system",
          content: `You generate EXACTLY 3 lines for a banner. CRITICAL: Output must be exactly 3 lines, no more, no less. Each line 4-7 words, each ending with a period. No extra text, labels, quotes, or preface. Output ONLY the 3 lines separated by newlines. Be motivating and concise.`,
        },
        {
          role: "user",
          content: `Student: ${userName}, Studying: ${subjects.join(", ")}.`,
        },
      ],
      max_tokens: 50,
      temperature: 1.0,
    });

    return NextResponse.json({ text: content || "" });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/hf/banner] error", message);
    return NextResponse.json({ text: "", error: message }, { status: 500 });
  }
}
