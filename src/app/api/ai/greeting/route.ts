import { NextResponse } from "next/server";
import { runText } from "@/lib/ai";
import { requireUser } from "@/lib/api-auth";

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

    const style = GREETING_STYLES[Math.floor(Math.random() * GREETING_STYLES.length)];
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

    const { text } = await runText({
      system:
        `You are Analogix AI, a concise tutor. Generate a short, one-sentence greeting for a student. Keep it under 8 words. Do not use emojis. Be ${style}. Reference the time of day if appropriate.`,
      prompt: `Student name: ${userName}, Streak: ${streak} days, Time: ${timeOfDay}. Give a varied greeting different from your last one.`,
      taskType: "lightweight",
      temperature: 0.7,
      maxTokens: 30,
    });

    return NextResponse.json({ text: text || `Welcome back, ${userName}.` });
  } catch (error) {
    console.error("[/api/ai/greeting] error", error);
    return NextResponse.json(
      { text: "Welcome back.", error: error instanceof Error ? error.message : "Greeting failed" },
      { status: 500 },
    );
  }
}
