import { NextResponse } from "next/server";
import { runObject, z } from "@/lib/ai";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

const scheduleSchema = z.object({
  schedule: z.array(
    z.object({
      date: z.string(),
      sessions: z.array(
        z.object({
          subject: z.string(),
          duration: z.string(),
          focus: z.string(),
          tip: z.string().optional(),
        }),
      ),
    }),
  ),
  summary: z.string(),
});

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json();
    const events: Array<{ title: string; date: string; type: string; subject?: string }> = body.events || [];
    const grade: string = body.grade || "7-12";
    const state: string = body.state || "Australia";
    const today = new Date().toISOString().split("T")[0];

    const upcoming = events
      .filter((e) => e.type === "exam" || e.type === "assignment")
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8);

    if (upcoming.length === 0) {
      return NextResponse.json({ schedule: [], message: "No upcoming exams or assignments found." });
    }

    const eventList = upcoming
      .map((e) => `- ${e.type.toUpperCase()}: "${e.title}"${e.subject ? ` (${e.subject})` : ""} on ${e.date}`)
      .join("\n");

    const systemPrompt = `You are Analogix AI, a study coach for Australian high school students.
Today is ${today}. The student is in Year ${grade} in ${state}.

Your job: Create a practical, day-by-day study schedule leading up to their upcoming exams and assignments.

Rules:
- Generate study sessions for the next 14 days only.
- Spread study across multiple days - don't cram everything the night before.
- Prioritise closer deadlines and higher-stakes exams first.
- Include rest days - don't schedule study every single day.
- Keep each session focused: one subject per session, 45-90 minutes max.
- Use Australian English and curriculum terminology.
- Be encouraging but realistic.`;

    const result = await runObject<{
      schedule: Array<{ date: string; sessions: Array<{ subject: string; duration: string; focus: string; tip?: string }> }>;
      summary: string;
    }>({
      schema: scheduleSchema,
      system: systemPrompt,
      prompt: `My upcoming deadlines:\n${eventList}\n\nPlease generate my study schedule.`,
      taskType: "default",
      temperature: 0.4,
      maxTokens: 2048,
    });

    return NextResponse.json({
      schedule: result?.schedule ?? [],
      summary: result?.summary ?? "",
    });
  } catch (error) {
    console.error("[/api/ai/study-schedule] Error:", error);
    return NextResponse.json(
      { schedule: [], error: error instanceof Error ? error.message : "Schedule generation failed" },
      { status: 500 },
    );
  }
}
