import { NextResponse } from "next/server";
import { runText } from "@/lib/ai";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

const VALID_SUBJECT_IDS = [
  "math", "biology", "history", "physics", "chemistry", "english",
  "computing", "economics", "business", "commerce", "pdhpe",
  "geography", "engineering", "medicine", "languages",
];

export async function POST(request: Request) {
  try {
    try {
      await requireUser();
    } catch {
      // Subject detection is harmless - work for anonymous users too.
    }
    const body = await request.json();
    const message: string = body.message || "";
    if (!message.trim()) {
      return NextResponse.json({ subject: null });
    }

    const { text } = await runText({
      system:
        "You are a subject classifier for an Australian secondary school app. " +
        "Given a student message, return ONLY the most appropriate subject ID from this list: " +
        "math, biology, history, physics, chemistry, english, computing, economics, business, " +
        "commerce, pdhpe, geography, engineering, medicine, languages. " +
        "Respond with ONLY the subject ID, nothing else. If unsure, return the closest match.",
      prompt: `Student message: "${message.slice(0, 300)}"`,
      taskType: "lightweight",
      temperature: 0,
      maxTokens: 10,
    });

    const raw = (text || "").trim().toLowerCase().replace(/[^a-z]/g, "");
    const subject = VALID_SUBJECT_IDS.find((s) => s === raw) ?? null;
    return NextResponse.json({ subject });
  } catch (error) {
    console.error("[/api/ai/detect-subject] Error:", error);
    return NextResponse.json({ subject: null });
  }
}
