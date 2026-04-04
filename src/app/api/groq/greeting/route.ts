import { NextResponse } from "next/server";
import { callGroqChat, formatError } from "../_utils";

export const runtime = "nodejs";

// Cache greeting for 1 hour — it doesn't change often
export const revalidate = 3600;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userName: string = body.userName || "Student";
    const streak: number = body.streak || 0;

    const content = await callGroqChat({
      messages: [
        {
          role: "system",
          content: `You are Analogix AI, a concise tutor. Generate a short, one-sentence greeting for a student. Keep it under 8 words. Do not use emojis. Be warm and encouraging.`,
        },
        {
          role: "user",
          content: `Student name: ${userName}, Streak: ${streak} days.`,
        },
      ],
      max_tokens: 30,
      temperature: 0.3,
    }, "lightweight");

    return NextResponse.json({ text: content || `Welcome back, ${userName}.` });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/hf/greeting] error", message);
    return NextResponse.json({ text: "Welcome back.", error: message }, { status: 500 });
  }
}
