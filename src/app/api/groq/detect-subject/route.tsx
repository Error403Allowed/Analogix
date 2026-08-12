import { NextResponse } from "next/server";
import { callGroqChat, formatError } from "../_utils";

export const runtime = "nodejs";

const VALID_SUBJECT_IDS = [
  "math", "biology", "history", "physics", "chemistry", "english",
  "computing", "economics", "business", "commerce", "pdhpe",
  "geography", "engineering", "medicine", "languages",
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message: string = body.message || "";
    if (!message.trim()) {
      return NextResponse.json({ subject: null });
    }

    const content = await callGroqChat({
      messages: [
        {
          role: "system",
          content: "You are a subject classifier for an Australian secondary school app. " +
            "Given a student message, return ONLY the most appropriate subject ID from this list: " +
            "math, biology, history, physics, chemistry, english, computing, economics, business, " +
            "commerce, pdhpe, geography, engineering, medicine, languages. " +
            "Respond with ONLY the subject ID, nothing else. If unsure, return the closest match.",
        },
        {
          role: "user",
          content: `Student message: "${message.slice(0, 300)}"`,
        },
      ],
      max_tokens: 10,
      temperature: 0,
    }, "lightweight");

    const raw = (content || "").trim().toLowerCase().replace(/[^a-z]/g, "");
    const subject = VALID_SUBJECT_IDS.find(s => s === raw) ?? null;
    return NextResponse.json({ subject });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/groq/detect-subject] Error:", message);
    return NextResponse.json({ subject: null });
  }
}
