import { NextResponse } from "next/server";
import { callHfChat } from "../_utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { base64, mimeType, text: rawText, subjectLabel, grade, state } = body;

    let extractedText = rawText || "";

    // If a PDF was uploaded, extract its text server-side
    if (!extractedText && base64 && mimeType === "application/pdf") {
      try {
        const pdfParse = (await import("pdf-parse")).default;
        const buffer = Buffer.from(base64, "base64");
        const parsed = await pdfParse(buffer);
        extractedText = parsed.text;
      } catch (e) {
        console.error("[assessment-guide] pdf-parse failed:", e);
        return NextResponse.json({ error: "Couldn't read the PDF. Try copying and pasting the text instead." }, { status: 400 });
      }
    }

    if (!extractedText?.trim()) {
      return NextResponse.json({ error: "No text could be extracted. Try pasting the text manually." }, { status: 400 });
    }

    const today = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
    const fourWeeksOut = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const systemPrompt = `You are an expert Australian high school study planner. Return ONLY valid JSON — no markdown, no backticks, no explanation whatsoever.

The JSON must follow this exact structure:
{
  "title": "Assessment title extracted from the text",
  "dueDate": "YYYY-MM-DD — extract from text, if not found use ${fourWeeksOut}",
  "rawText": "Brief 2-3 sentence summary of what the assessment requires",
  "studyGuide": [
    {
      "week": 1,
      "label": "Week 1 – e.g. Research & Planning",
      "tasks": [
        "Specific actionable task",
        "Specific actionable task",
        "Specific actionable task"
      ]
    }
  ]
}

Rules:
- studyGuide must cover from today (${today}) to the due date — minimum 2 weeks, maximum 8 weeks
- Each week must have 3-5 specific actionable tasks tailored to THIS assessment
- Tasks must reference actual topics/requirements from the notification
- Final week must focus on review, proofreading, and submission prep
- Write for a Year ${grade || "high school"} student in ${state || "Australia"}
- Use Australian curriculum language (e.g. "maths" not "math")
- Return ONLY the JSON object. Nothing else.`;

    const content = await callHfChat(
      {
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Assessment notification for ${subjectLabel}:\n\n${extractedText.slice(0, 8000)}\n\nGenerate the JSON now.`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      },
      "reasoning"
    );

    const cleaned = content.replace(/```json|```/g, "").trim();
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON in response");

    const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
    return NextResponse.json(parsed);

  } catch (err) {
    console.error("[assessment-guide] Error:", err);
    return NextResponse.json({ error: "Failed to process assessment" }, { status: 500 });
  }
}
