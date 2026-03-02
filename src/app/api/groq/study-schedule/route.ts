import { NextResponse } from "next/server";
import { callHfChat, formatError } from "../_utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const events: Array<{ title: string; date: string; type: string; subject?: string }> = body.events || [];
    const grade: string = body.grade || "7-12";
    const state: string = body.state || "Australia";
    const today = new Date().toISOString().split("T")[0];

    const upcoming = events
      .filter(e => e.type === "exam" || e.type === "assignment")
      .filter(e => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8);

    if (upcoming.length === 0) {
      return NextResponse.json({ schedule: [], message: "No upcoming exams or assignments found." });
    }

    const eventList = upcoming
      .map(e => `- ${e.type.toUpperCase()}: "${e.title}"${e.subject ? ` (${e.subject})` : ""} on ${e.date}`)
      .join("\n");

    const systemPrompt = `You are Quizzy, a study coach for Australian high school students.
Today is ${today}. The student is in Year ${grade} in ${state}.

Your job: Create a practical, day-by-day study schedule leading up to their upcoming exams and assignments.

Rules:
- Generate study sessions for the next 14 days only.
- Spread study across multiple days — don't cram everything the night before.
- Prioritise closer deadlines and higher-stakes exams first.
- Include rest days — don't schedule study every single day.
- Keep each session focused: one subject per session, 45-90 minutes max.
- Use Australian English and curriculum terminology.
- Be encouraging but realistic.

Return ONLY valid JSON — no markdown, no preamble:
{
  "schedule": [
    {
      "date": "YYYY-MM-DD",
      "sessions": [
        {
          "subject": "Mathematics",
          "duration": "60 min",
          "focus": "Quadratic equations — practice past paper questions",
          "tip": "Use the formula sheet and time yourself"
        }
      ]
    }
  ],
  "summary": "One sentence overview of the plan"
}`;

    const content = await callHfChat(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `My upcoming deadlines:\n${eventList}\n\nPlease generate my study schedule.` },
        ],
        max_tokens: 2048,
        temperature: 0.4,
      },
      "default"
    );

    let schedule = [];
    let summary = "";
    try {
      const clean = content.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      schedule = parsed.schedule || [];
      summary = parsed.summary || "";
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          schedule = parsed.schedule || [];
          summary = parsed.summary || "";
        } catch {}
      }
    }

    return NextResponse.json({ schedule, summary });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/hf/study-schedule] Error:", message);
    return NextResponse.json({ schedule: [], error: message }, { status: 500 });
  }
}
