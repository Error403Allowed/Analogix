import { NextResponse } from "next/server";
import { runText } from "@/lib/ai";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json();
    const userName: string = body.userName || "Student";
    const subjects: string[] = Array.isArray(body.subjects) ? body.subjects : [];

    const { text } = await runText({
      system:
        `You generate EXACTLY 3 lines for a banner. CRITICAL: Output must be exactly 3 lines, no more, no less. Each line 4-7 words, each ending with a period. No extra text, labels, quotes, or preface. Output ONLY the 3 lines separated by newlines. Be motivating and concise.`,
      prompt: `Student: ${userName}, Studying: ${subjects.join(", ")}.`,
      taskType: "lightweight",
      temperature: 1.0,
      maxTokens: 50,
    });

    return NextResponse.json({ text: text || "" });
  } catch (error) {
    console.error("[/api/ai/banner] error", error);
    return NextResponse.json(
      { text: "", error: error instanceof Error ? error.message : "Banner generation failed" },
      { status: 500 },
    );
  }
}
