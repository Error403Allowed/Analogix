import { NextResponse } from "next/server";
import { callGroqChat, formatError } from "../_utils";
import { requireUser, unauthResponse } from "@/lib/api-auth";

export const runtime = "nodejs";

// Cache greeting for only 5 minutes to reduce repetition
export const revalidate = 300;

const GREETING_STYLES = [
  "friendly and energetic",
  "casual and relaxed", 
  "warm and encouraging",
  "cheerful and upbeat",
  "casual with a hint of enthusiasm",
];

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json();
    const userName: string = body.userName || "Student";
    const streak: number = body.streak || 0;

    // Pick a random greeting style to add variation
    const style = GREETING_STYLES[Math.floor(Math.random() * GREETING_STYLES.length)];
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

    const content = await callGroqChat({
      messages: [
        {
          role: "system",
          content: `You are Analogix AI, a concise tutor. Generate a short, one-sentence greeting for a student. Keep it under 8 words. Do not use emojis. Be ${style}. Reference the time of day if appropriate.`,
        },
        {
          role: "user",
          content: `Student name: ${userName}, Streak: ${streak} days, Time: ${timeOfDay}. Give a varied greeting different from your last one.`,
        },
      ],
      max_tokens: 30,
      temperature: 0.7, // Higher temperature for more variation
    }, "lightweight");

    return NextResponse.json({ text: content || `Welcome back, ${userName}.` });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/hf/greeting] error", message);
    return NextResponse.json({ text: "Welcome back.", error: message }, { status: 500 });
  }
}
