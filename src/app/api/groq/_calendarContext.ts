/**
 * _calendarContext.ts
 * Loads a user's calendar events + deadlines from Supabase and formats
 * them as a concise, human-readable string for injection into AI prompts.
 * Used by both /api/groq/agent and /api/groq/chat-stream.
 */

 
type AnySupabase = any;

interface CalendarEvent {
  title: string;
  date: string;
  time?: string;
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

const getTimeOfDay = (date: Date): string => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 14) return "midday";
  if (hour >= 14 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
};

const formatDate = (iso: string | Date) => {
  try {
    const d = iso instanceof Date ? iso : new Date(iso + (iso.includes("Z") || iso.includes("+") ? "" : "+00:00"));
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString("en-AU", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
    });
  } catch {
    return String(iso);
  }
};

const formatTime = (iso: string | Date) => {
  try {
    const d = iso instanceof Date ? iso : new Date(iso + (iso.includes("Z") || iso.includes("+") ? "" : "+00:00"));
    if (d.getHours() === 0 && d.getMinutes() === 0) return null;
    return d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return null;
  }
};

export async function buildCalendarContext(supabase: AnySupabase, userId: string): Promise<string> {
  const now = new Date();
  const timeOfDay = getTimeOfDay(now);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const from = new Date(now); from.setDate(from.getDate() - 180);
  const to   = new Date(now); to.setDate(to.getDate() + 180);

  // ── Fetch events ──────────────────────────────────────────────────────────
  const { data: eventRows } = await supabase
    .from("events")
    .select("title, date, type, subject, description")
    .eq("user_id", userId)
    .gte("date", from.toISOString())
    .lte("date", to.toISOString())
    .order("date", { ascending: true });

  interface CalendarRow {
  title: string;
  date: string;
  type: string;
  subject: string | null;
  description: string | null;
}

interface DeadlineRow {
  title: string;
  due_date: string;
  subject: string | null;
  priority: string;
}

const events: CalendarEvent[] = (eventRows ?? []).map((r: CalendarRow) => ({
    title: r.title,
    date: r.date,
    type: r.type || "event",
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

  const deadlines: Deadline[] = (deadlineRows ?? []).map((r: DeadlineRow) => ({
    title: r.title,
    dueDate: r.due_date,
    subject: r.subject,
    priority: r.priority || "medium",
  }));

  if (events.length === 0 && deadlines.length === 0) return "";

  // Find the very next event/deadline for quick reference
  const allItems = [
    ...events.map(e => ({ title: e.title, date: new Date(e.date), type: e.type, kind: "event" as const, subject: e.subject, description: e.description })),
    ...deadlines.map(d => ({ title: d.title, date: new Date(d.dueDate), type: "deadline", kind: "deadline" as const, subject: d.subject })),
  ].filter(i => !isNaN(i.date.getTime())).sort((a, b) => a.date.getTime() - b.date.getTime());

  // Find what's happening RIGHT NOW
  const currentEvent = allItems.find(i => {
    const eventStart = i.date;
    const eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000); // Assume 1 hour duration
    return now >= eventStart && now < eventEnd;
  });

  // Find next event/deadline
  const nextItem = allItems.find(i => i.date >= now);
  
  // Find next class/lesson specifically
  const nextClass = allItems.find(i => i.date >= now && (i.type === "class" || i.type === "lesson" || i.title.toLowerCase().includes("class") || i.title.toLowerCase().includes("lesson")));

  // Today's events
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const todayEvents = events.filter(e => {
    const d = new Date(e.date);
    return d >= todayStart && d < todayEnd;
  });

  // Build the context string
  const lines: string[] = [];
  
  // === RIGHT NOW SECTION ===
  const rightNowLines: string[] = [];
  rightNowLines.push(`It's currently ${timeOfDay} (${now.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })} on ${formatDate(now.toISOString())}).`);
  
  if (currentEvent) {
    const eventEnd = new Date(currentEvent.date.getTime() + 60 * 60 * 1000);
    const minsUntilEnd = Math.round((eventEnd.getTime() - now.getTime()) / 60000);
    rightNowLines.push(`RIGHT NOW: You have "${currentEvent.title}"${currentEvent.subject ? ` [${currentEvent.subject}]` : ""} happening. ${minsUntilEnd > 0 ? `Ends in ${minsUntilEnd} minutes.` : "Just ended."}`);
  }
  
  if (todayEvents.length > 0) {
    const upcomingToday = todayEvents.filter(e => new Date(e.date) > now).slice(0, 3);
    if (upcomingToday.length > 0) {
      const nextToday = upcomingToday[0];
      const timeUntil = Math.round((new Date(nextToday.date).getTime() - now.getTime()) / 60000);
      rightNowLines.push(`NEXT TODAY: "${nextToday.title}"${nextToday.subject ? ` [${nextToday.subject}]` : ""} ${timeUntil < 60 ? `in ${timeUntil} minutes` : `at ${formatTime(nextToday.date)}`}.`);
    }
  }
  
  if (nextItem) {
    const daysUntil = Math.ceil((nextItem.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const timeStr = formatTime(nextItem.date) || "";
    if (daysUntil === 0) {
      rightNowLines.push(`NEXT: "${nextItem.title}"${nextItem.subject ? ` [${nextItem.subject}]` : ""} today${timeStr ? ` at ${timeStr}` : ""}.`);
    } else if (daysUntil === 1) {
      rightNowLines.push(`NEXT: "${nextItem.title}"${nextItem.subject ? ` [${nextItem.subject}]` : ""} tomorrow${timeStr ? ` at ${timeStr}` : ""}.`);
    } else {
      rightNowLines.push(`NEXT: "${nextItem.title}"${nextItem.subject ? ` [${nextItem.subject}]` : ""} on ${formatDate(nextItem.date.toISOString())}.`);
    }
  }
  
  lines.push(...rightNowLines);
  lines.push("");

  if (nextClass && nextClass !== currentEvent && nextClass !== nextItem) {
    const classDays = Math.ceil((nextClass.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (classDays <= 3) {
      lines.push(`NEXT CLASS: "${nextClass.title}"${nextClass.subject ? ` [${nextClass.subject}]` : ""} ${classDays === 0 ? "today" : classDays === 1 ? "tomorrow" : `on ${formatDate(nextClass.date.toISOString())}`}.`);
      lines.push("");
    }
  }

  if (events.length > 0) {
    // Extract and highlight classes/lessons separately
    const classes = events.filter(e => e.type === "class" || e.type === "lesson" || e.title.toLowerCase().includes("class") || e.title.toLowerCase().includes("lesson"));
    const otherEvents = events.filter(e => !classes.includes(e));
    
    if (classes.length > 0) {
      lines.push("CLASSES:");
      for (const c of classes.slice(0, 10)) {
        const time = formatTime(c.date);
        const dateStr = formatDate(c.date);
        const timeStr = time ? ` at ${time}` : "";
        const subjectStr = c.subject ? ` [${c.subject}]` : "";
        const descStr = c.description ? ` — ${c.description}` : "";
        lines.push(`  • "${c.title}"${subjectStr} — ${dateStr}${timeStr}${descStr}`);
      }
      if (classes.length > 10) {
        lines.push(`  ... and ${classes.length - 10} more classes`);
      }
      lines.push("");
    }
    
    if (otherEvents.length > 0) {
      lines.push("OTHER EVENTS:");
      for (const e of otherEvents.slice(0, 10)) {
        const time = formatTime(e.date);
        const dateStr = formatDate(e.date);
        const timeStr = time ? ` at ${time}` : "";
        const subjectStr = e.subject ? ` [${e.subject}]` : "";
        const descStr = e.description ? ` — ${e.description}` : "";
        const typeLabel = e.type.charAt(0).toUpperCase() + e.type.slice(1);
        lines.push(`  • ${typeLabel}: "${e.title}"${subjectStr} — ${dateStr}${timeStr}${descStr}`);
      }
      if (otherEvents.length > 10) {
        lines.push(`  ... and ${otherEvents.length - 10} more events`);
      }
      lines.push("");
    }
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
