/**
 * _calendarContext.ts
 * Loads a user's calendar events + deadlines from Supabase and formats
 * them as a concise, human-readable string for injection into AI prompts.
 * Used by both /api/groq/agent and /api/groq/chat-stream.
 */
const getTimeOfDay = (date) => {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12)
        return "morning";
    if (hour >= 12 && hour < 14)
        return "midday";
    if (hour >= 14 && hour < 18)
        return "afternoon";
    if (hour >= 18 && hour < 22)
        return "evening";
    return "night";
};
const formatDate = (iso) => {
    try {
        const d = iso instanceof Date ? iso : new Date(iso + (iso.includes("Z") || iso.includes("+") ? "" : "+00:00"));
        if (isNaN(d.getTime()))
            return String(iso);
        return d.toLocaleDateString("en-AU", {
            weekday: "short", day: "numeric", month: "short", year: "numeric",
        });
    }
    catch {
        return String(iso);
    }
};
const formatTime = (iso) => {
    try {
        const d = iso instanceof Date ? iso : new Date(iso + (iso.includes("Z") || iso.includes("+") ? "" : "+00:00"));
        if (d.getHours() === 0 && d.getMinutes() === 0)
            return null;
        return d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: true });
    }
    catch {
        return null;
    }
};
export async function buildCalendarContext(supabase, userId) {
    const now = new Date();
    const timeOfDay = getTimeOfDay(now);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const from = new Date(now);
    from.setDate(from.getDate() - 180);
    const to = new Date(now);
    to.setDate(to.getDate() + 180);
    // ── Fetch events ──────────────────────────────────────────────────────────
    const { data: eventRows } = await supabase
        .from("events")
        .select("title, date, type, subject, description")
        .eq("user_id", userId)
        .gte("date", from.toISOString())
        .lte("date", to.toISOString())
        .order("date", { ascending: true });
    const events = (eventRows ?? []).map((r) => ({
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
    const deadlines = (deadlineRows ?? []).map((r) => ({
        title: r.title,
        dueDate: r.due_date,
        subject: r.subject,
        priority: r.priority || "medium",
    }));
    if (events.length === 0 && deadlines.length === 0)
        return "";
    // Find the very next event/deadline for quick reference
    const allItems = [
        ...events.map(e => ({ title: e.title, date: new Date(e.date), type: e.type, kind: "event", subject: e.subject, description: e.description })),
        ...deadlines.map(d => ({ title: d.title, date: new Date(d.dueDate), type: "deadline", kind: "deadline", subject: d.subject })),
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
    // === RIGHT NOW SECTION (conversational, not robotic) ===
    const rightNowLines: string[] = [];
    if (currentEvent) {
        const eventEnd = new Date(currentEvent.date.getTime() + 60 * 60 * 1000);
        const minsUntilEnd = Math.round((eventEnd.getTime() - now.getTime()) / 60000);
        rightNowLines.push(`Right now: ${currentEvent.title}${currentEvent.subject ? ` (${currentEvent.subject})` : ""}${minsUntilEnd > 0 ? ` — ends in ${minsUntilEnd} mins` : ""}`);
    }
    if (todayEvents.length > 0 && !currentEvent) {
        const upcomingToday = todayEvents.filter(e => new Date(e.date) > now).slice(0, 1);
        if (upcomingToday.length > 0) {
            const nextToday = upcomingToday[0];
            const timeUntil = Math.round((new Date(nextToday.date).getTime() - now.getTime()) / 60000);
            const timeStr = timeUntil < 60 ? `in ${timeUntil} mins` : `at ${formatTime(nextToday.date)}`;
            rightNowLines.push(`Next: ${nextToday.title}${nextToday.subject ? ` (${nextToday.subject})` : ""} — ${timeStr}`);
        }
    }
    if (nextClass && !currentEvent && !rightNowLines.some(l => l.includes(nextClass.title))) {
        const classMins = Math.round((nextClass.date.getTime() - now.getTime()) / 60000);
        const classDays = Math.ceil((nextClass.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        let when = "";
        if (classMins < 60) {
            when = `in ${classMins} mins`;
        }
        else if (classDays === 0) {
            when = `today at ${formatTime(nextClass.date)}`;
        }
        else if (classDays === 1) {
            when = `tomorrow at ${formatTime(nextClass.date)}`;
        }
        else {
            when = `${formatDate(nextClass.date.toISOString())}`;
        }
        rightNowLines.push(`You've got ${nextClass.title}${nextClass.subject ? ` (${nextClass.subject})` : ""} — ${when}`);
    }
    if (rightNowLines.length > 0) {
        lines.push(...rightNowLines);
        lines.push("");
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
    const soon14 = new Date(now);
    soon14.setDate(soon14.getDate() + 14);
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
//# sourceMappingURL=_calendarContext.js.map