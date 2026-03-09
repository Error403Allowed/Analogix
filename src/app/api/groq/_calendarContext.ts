/**
 * _calendarContext.ts
 * Loads a user's calendar events + deadlines from Supabase and formats
 * them as a concise, human-readable string for injection into AI prompts.
 * Used by both /api/groq/agent and /api/groq/chat-stream.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

interface CalendarEvent {
  title: string;
  date: string;       // ISO date string
  time?: string;      // e.g. "09:00" — from the date if it has a time component
  type: string;
  subject?: string;
  description?: string;
}

interface Deadline {
  title: string;
  dueDate: string;
  subject?: string;
  priority: string;
}

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-AU", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
    });
  } catch {
    return iso;
  }
};

const formatTime = (iso: string) => {
  try {
    const d = new Date(iso);
    // If time is exactly midnight it's likely a date-only record
    if (d.getHours() === 0 && d.getMinutes() === 0) return null;
    return d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return null;
  }
};

export async function buildCalendarContext(supabase: AnySupabase, userId: string): Promise<string> {
  const now = new Date();
  // Show events from 7 days ago through 90 days ahead so the AI has enough context
  const from = new Date(now); from.setDate(from.getDate() - 7);
  const to   = new Date(now); to.setDate(to.getDate() + 90);

  // ── Fetch events ──────────────────────────────────────────────────────────
  const { data: eventRows } = await supabase
    .from("events")
    .select("title, date, type, subject, description")
    .eq("user_id", userId)
    .gte("date", from.toISOString())
    .lte("date", to.toISOString())
    .order("date", { ascending: true });

  const events: CalendarEvent[] = (eventRows ?? []).map((r: any) => ({
    title: r.title,
    date: r.date,
    type: r.type,
    subject: r.subject,
    description: r.description,
  }));

  // ── Fetch deadlines ───────────────────────────────────────────────────────
  const { data: deadlineRows } = await supabase
    .from("deadlines")
    .select("title, due_date, subject, priority")
    .eq("user_id", userId)
    .gte("due_date", from.toISOString())
    .lte("due_date", to.toISOString())
    .order("due_date", { ascending: true });

  const deadlines: Deadline[] = (deadlineRows ?? []).map((r: any) => ({
    title: r.title,
    dueDate: r.due_date,
    subject: r.subject,
    priority: r.priority,
  }));

  if (events.length === 0 && deadlines.length === 0) return "";

  const lines: string[] = [
    `Today is ${formatDate(now.toISOString())}.`,
    "",
  ];

  if (events.length > 0) {
    lines.push("UPCOMING EVENTS:");
    for (const e of events) {
      const time = formatTime(e.date);
      const dateStr = formatDate(e.date);
      const timeStr = time ? ` at ${time}` : "";
      const subjectStr = e.subject ? ` [${e.subject}]` : "";
      const descStr = e.description ? ` — ${e.description}` : "";
      const typeLabel = e.type.charAt(0).toUpperCase() + e.type.slice(1);
      lines.push(`  • ${typeLabel}: "${e.title}"${subjectStr} — ${dateStr}${timeStr}${descStr}`);
    }
    lines.push("");
  }

  if (deadlines.length > 0) {
    lines.push("DEADLINES:");
    for (const d of deadlines) {
      const dateStr = formatDate(d.dueDate);
      const subjectStr = d.subject ? ` [${d.subject}]` : "";
      const priorityStr = d.priority !== "medium" ? ` (${d.priority} priority)` : "";
      lines.push(`  • "${d.title}"${subjectStr} — due ${dateStr}${priorityStr}`);
    }
    lines.push("");
  }

  // Days-until summary for imminent items (next 14 days)
  const soon14 = new Date(now); soon14.setDate(soon14.getDate() + 14);
  const imminentEvents = events.filter(e => new Date(e.date) <= soon14);
  const imminentDeadlines = deadlines.filter(d => new Date(d.dueDate) <= soon14);

  if (imminentEvents.length > 0 || imminentDeadlines.length > 0) {
    lines.push("COMING UP IN THE NEXT 14 DAYS:");
    const combined = [
      ...imminentEvents.map(e => ({ title: e.title, date: new Date(e.date), kind: e.type })),
      ...imminentDeadlines.map(d => ({ title: d.title, date: new Date(d.dueDate), kind: "deadline" })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const item of combined) {
      const daysUntil = Math.ceil((item.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const when = daysUntil === 0 ? "TODAY" : daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`;
      lines.push(`  • ${item.kind.toUpperCase()}: "${item.title}" — ${when} (${formatDate(item.date.toISOString())})`);
    }
  }

  return lines.join("\n");
}
