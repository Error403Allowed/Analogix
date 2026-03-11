"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Upload, X, Tag, ChevronLeft, ChevronRight,
  Plus, Clock, CalendarDays, Trash2, Search, Filter,
  ChevronDown, MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks,
  startOfMonth, endOfMonth, eachDayOfInterval as eachDay,
  addMonths, subMonths, isSameMonth, isSameDay, isToday, format,
  startOfDay, endOfDay, addDays, subDays,
} from "date-fns";
import ICSUploader from "@/components/ICSUploader";
import { eventStore } from "@/utils/eventStore";
import { AppEvent } from "@/types/events";
import { getTermInfo, getStoredState } from "@/utils/termData";

type CalendarView = "month" | "week" | "day" | "agenda";

const EVENT_COLORS = {
  exam: { bg: "bg-red-500", light: "bg-red-500/10", text: "text-red-600", border: "border-red-500/20" },
  assignment: { bg: "bg-amber-500", light: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500/20" },
  event: { bg: "bg-blue-500", light: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-500/20" },
  class: { bg: "bg-emerald-500", light: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/20" },
  lesson: { bg: "bg-emerald-500", light: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/20" },
};

const getEventStyle = (event: AppEvent) => {
  const type = event.type as keyof typeof EVENT_COLORS;
  return EVENT_COLORS[type] || EVENT_COLORS.event;
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const EventPill = ({ event, onClick, compact = false }: { event: AppEvent; onClick?: () => void; compact?: boolean }) => {
  const style = getEventStyle(event);
  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-md transition-all hover:shadow-md cursor-pointer group",
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]",
        style.light, style.text, "border", style.border
      )}
    >
      <div className="flex items-center gap-1.5">
        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", style.bg)} />
        <span className="truncate font-bold">{event.title}</span>
      </div>
      {!compact && event.subject && (
        <div className="text-[9px] opacity-70 mt-0.5 truncate">{event.subject}</div>
      )}
      {!compact && (
        <div className="text-[9px] opacity-60 mt-0.5">{format(new Date(event.date), "h:mm a")}</div>
      )}
    </motion.button>
  );
};

const EventCard = ({ event, onDelete, compact = false }: { event: AppEvent; onDelete: () => void; compact?: boolean }) => {
  const style = getEventStyle(event);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "group rounded-xl border transition-all hover:shadow-md",
        compact ? "p-2" : "p-3",
        style.light, style.border
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("w-1 rounded-full shrink-0 mt-0.5", style.bg, compact ? "h-8" : "h-10")} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border", style.bg, "text-white border-transparent")}>
              {event.type}
            </span>
            {event.subject && (
              <span className="flex items-center gap-1 text-[9px] text-foreground/70 font-semibold uppercase tracking-wider">
                <Tag className="w-2.5 h-2.5" />{event.subject}
              </span>
            )}
          </div>
          <p className={cn("font-bold text-foreground", compact ? "text-xs" : "text-sm")}>{event.title}</p>
          {event.description && (
            <p className={cn("text-foreground/70 mt-1 leading-relaxed", compact ? "text-[10px] line-clamp-2" : "text-xs")}>
              {compact && event.description.length > 80 ? event.description.slice(0, 80) + "..." : event.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Clock className={cn("w-3 h-3", compact ? "w-2.5 h-2.5" : "")} />
            <span className={cn("text-foreground/70", compact ? "text-[9px]" : "text-xs")}>
              {format(new Date(event.date), "EEEE, MMMM d 'at' h:mm a")}
            </span>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10 text-foreground/40 hover:text-destructive shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

const EmptyState = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="py-12 flex flex-col items-center gap-3 text-center">
    <div className="w-14 h-14 rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center">
      <Icon className="w-6 h-6 text-foreground/40" />
    </div>
    <p className="text-sm text-foreground/60 font-medium max-w-[200px]">{text}</p>
  </div>
);

// ── Main Page ──────────────────────────────────────────────────────────────────

const CalendarPage = () => {
  const router = useRouter();
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // Add event form
  const [evTitle, setEvTitle] = useState("");
  const [evDate, setEvDate] = useState("");
  const [evTime, setEvTime] = useState("09:00");
  const [evType, setEvType] = useState<AppEvent["type"]>("event");
  const [evSubject, setEvSubject] = useState("");
  const [evDescription, setEvDescription] = useState("");

  const loadEvents = useCallback(() => eventStore.getAll().then(setEvents), []);

  useEffect(() => {
    loadEvents();
    window.addEventListener("eventsUpdated", loadEvents);
    return () => window.removeEventListener("eventsUpdated", loadEvents);
  }, [loadEvents]);

  const userState = getStoredState();
  const termInfo = userState ? getTermInfo(date, userState) : null;
  
  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchesSearch = searchQuery === "" || 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === "all" || e.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [events, searchQuery, filterType]);

  const selectedDayEvents = filteredEvents
    .filter(e => isSameDay(new Date(e.date), date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const upcomingEvents = useMemo(() => {
    return filteredEvents
      .filter(e => new Date(e.date) >= startOfDay(new Date()))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 8);
  }, [filteredEvents]);

  const handleAddEvent = () => {
    if (!evTitle.trim() || !evDate) return;
    const newEvent: AppEvent = {
      id: crypto.randomUUID(),
      title: evTitle.trim(),
      date: new Date(`${evDate}T${evTime}`),
      type: evType,
      subject: evSubject.trim() || undefined,
      description: evDescription.trim() || undefined,
      source: "manual",
    };
    eventStore.add(newEvent);
    setEvTitle(""); setEvDate(""); setEvTime("09:00");
    setEvType("event"); setEvSubject(""); setEvDescription("");
    setShowAddEvent(false);
  };

  const navigate = (dir: 1 | -1) => {
    if (view === "month") setDate(dir === 1 ? addMonths(date, 1) : subMonths(date, 1));
    else if (view === "week") setDate(dir === 1 ? addWeeks(date, 1) : subWeeks(date, 1));
    else if (view === "day") setDate(dir === 1 ? addDays(date, 1) : subDays(date, 1));
    else setDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + dir); return d; });
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 }),
  });
  const calDays = eachDay({
    start: startOfWeek(startOfMonth(date), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(date), { weekStartsOn: 1 }),
  });
  const navLabel =
    view === "month" ? format(date, "MMMM yyyy")
    : view === "week" ? `${format(weekDays[0], "MMM d")} – ${format(weekDays[6], "MMM d, yyyy")}`
    : view === "agenda" ? "Agenda"
    : format(date, "EEEE, MMMM d");

  // Get events for a specific hour in day/week view
  const getEventsForHour = (day: Date, hour: number) => {
    return filteredEvents.filter(e => {
      const eventDate = new Date(e.date);
      return isSameDay(eventDate, day) && eventDate.getHours() === hour;
    });
  };

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            {termInfo ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {termInfo.term.label} · Week {termInfo.week}
              </span>
            ) : userState ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                School Holidays
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowUploader(s => !s)}
              className={cn("flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all",
                showUploader ? "bg-muted text-foreground border-border" : "text-primary border-primary/30 hover:bg-primary/5")}>
              <Upload className="w-3.5 h-3.5" />
              {showUploader ? "Close" : "Import .ics"}
            </button>
            {events.length > 0 && (
              <button
                onClick={() => {
                  if (confirm(`Delete all ${events.length} events? This can't be undone.`)) {
                    eventStore.clearAll();
                  }
                }}
                className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
          </div>
        </div>

        {showUploader && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg">
            <ICSUploader />
          </motion.div>
        )}

        {/* ── Main toolbar ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} 
              className="w-9 h-9 rounded-lg border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setDate(new Date())} 
              className="px-4 py-2 rounded-lg border border-border bg-card text-xs font-semibold hover:bg-muted transition-colors">
              Today
            </button>
            <button onClick={() => navigate(1)} 
              className="w-9 h-9 rounded-lg border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center">
              <ChevronRight className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-bold text-foreground ml-2 min-w-[200px]">{navLabel}</h2>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 w-[220px]"
              />
            </div>
            
            {/* Filter */}
            <div className="relative">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="appearance-none pl-9 pr-8 py-2 rounded-lg border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="event">Events</option>
                <option value="exam">Exams</option>
                <option value="assignment">Assignments</option>
                <option value="class">Classes</option>
              </select>
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
            
            {/* View switcher */}
            <div className="flex bg-muted p-0.5 rounded-lg">
              {(["month", "week", "day", "agenda"] as CalendarView[]).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                    view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            
            {/* Add event button */}
            <button
              onClick={() => { setShowAddEvent(s => !s); setEvDate(format(date, "yyyy-MM-dd")); }}
              className={cn("flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition-all",
                showAddEvent ? "bg-muted text-foreground border border-border" : "bg-primary text-primary-foreground hover:bg-primary/90")}>
              <Plus className="w-4 h-4" />
              {showAddEvent ? "Cancel" : "Create"}
            </button>
          </div>
        </div>

        {/* ── Add Event Form ── */}
        <AnimatePresence>
          {showAddEvent && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="p-6 rounded-xl bg-card border border-border shadow-lg max-w-3xl">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-foreground">Create Event</p>
                  <button onClick={() => setShowAddEvent(false)} className="p-1 rounded-lg hover:bg-muted">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-4">
                  <input value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="Event title..."
                    className="w-full bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border rounded-lg px-3 py-2.5" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Date</label>
                      <input type="date" value={evDate} onChange={e => setEvDate(e.target.value)}
                        className="bg-background text-xs text-foreground outline-none border border-border rounded-lg px-3 py-2.5" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Time</label>
                      <input type="time" value={evTime} onChange={e => setEvTime(e.target.value)}
                        className="bg-background text-xs text-foreground outline-none border border-border rounded-lg px-3 py-2.5" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Type</label>
                      <div className="relative">
                        <button
                          onClick={() => setShowTypeDropdown(s => !s)}
                          className={cn("w-full text-left px-3 py-2.5 rounded-lg border text-xs font-medium flex items-center justify-between",
                            (evType as string) === "exam" ? "bg-red-500/10 border-red-500/30 text-red-600"
                              : (evType as string) === "assignment" ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                              : (evType as string) === "class" || (evType as string) === "lesson" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                              : "bg-blue-500/10 border-blue-500/30 text-blue-600")}
                        >
                          {evType}
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {showTypeDropdown && (
                          <div className="absolute top-full left-0 mt-1 w-full bg-background border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                            {(["event", "exam", "assignment", "class", "lesson"] as AppEvent["type"][]).map(t => (
                              <button
                                key={t}
                                onClick={() => { setEvType(t); setShowTypeDropdown(false); }}
                                className={cn("w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors",
                                  (t as string) === "exam" ? "text-red-600"
                                    : (t as string) === "assignment" ? "text-amber-600"
                                    : (t as string) === "class" || (t as string) === "lesson" ? "text-emerald-600"
                                    : "text-blue-600")}
                              >
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Subject</label>
                      <input value={evSubject} onChange={e => setEvSubject(e.target.value)} placeholder="Optional"
                        className="bg-background text-xs text-foreground placeholder:text-muted-foreground outline-none border border-border rounded-lg px-3 py-2.5" />
                    </div>
                  </div>
                  <textarea value={evDescription} onChange={e => setEvDescription(e.target.value)} placeholder="Description (optional)..."
                    className="w-full bg-background text-xs text-foreground placeholder:text-muted-foreground outline-none border border-border rounded-lg px-3 py-2.5 min-h-[80px] resize-none" />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowAddEvent(false)}
                      className="text-xs font-semibold px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleAddEvent} disabled={!evTitle.trim() || !evDate}
                      className="text-xs font-semibold px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 transition-all hover:bg-primary/90">
                      Save Event
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main grid: calendar + sidebar ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

          {/* ── Calendar panel ── */}
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}
              className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">

              {/* MONTH VIEW */}
              {view === "month" && (
                <div>
                  <div className="grid grid-cols-7 border-b border-border bg-muted/30">
                    {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                      <div key={d} className="py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {calDays.map((day, i) => {
                      const dayEvents = filteredEvents.filter(e => isSameDay(new Date(e.date), day));
                      const inMonth = isSameMonth(day, date);
                      const isSelected = isSameDay(day, date);
                      const isTod = isToday(day);
                      return (
                        <div key={i} role="button" tabIndex={0} onClick={() => setDate(day)}
                          onKeyDown={e => (e.key === "Enter" || e.key === " ") && setDate(day)}
                          className={cn("min-h-[120px] p-2 text-left border-b border-r border-border transition-colors hover:bg-muted/30 flex flex-col gap-1 cursor-pointer",
                            !inMonth && "opacity-30 bg-muted/20", isSelected && "bg-primary/5 ring-2 ring-primary ring-inset", (i + 1) % 7 === 0 && "border-r-0")}>
                          <span className={cn("text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors",
                            isTod ? "bg-primary text-primary-foreground" : isSelected ? "text-primary" : "text-foreground")}>
                            {format(day, "d")}
                          </span>
                          <div className="flex flex-col gap-1 w-full mt-1">
                            {dayEvents.slice(0, 4).map(e => (
                              <EventPill key={e.id} event={e} onClick={() => { setDate(day); setSelectedEvent(e); }} compact />
                            ))}
                            {dayEvents.length > 4 && (
                              <span className="text-[9px] text-muted-foreground font-medium pl-1">+{dayEvents.length - 4} more</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* WEEK VIEW - Google Calendar Style */}
              {view === "week" && (
                <div className="flex flex-col h-[700px]">
                  <div className="grid grid-cols-8 border-b border-border bg-muted/30 shrink-0">
                    <div className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-r border-border">
                      Time
                    </div>
                    {weekDays.map(day => {
                      const isTod = isToday(day);
                      const isSelected = isSameDay(day, date);
                      return (
                        <button key={day.toISOString()} onClick={() => setDate(day)}
                          className={cn("py-2 flex flex-col items-center gap-1 transition-colors hover:bg-muted/30", isSelected && "bg-primary/5")}>
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{format(day, "EEE")}</span>
                          <span className={cn("text-base font-bold w-8 h-8 flex items-center justify-center rounded-full transition-colors",
                            isTod ? "bg-primary text-primary-foreground" : isSelected ? "text-primary ring-2 ring-primary ring-inset" : "text-foreground")}>
                            {format(day, "d")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {(() => {
                      // Find the earliest and latest hour with events across all days
                      let minHour = 8; // Default start at 8 AM
                      let maxHour = 18; // Default end at 6 PM
                      weekDays.forEach(day => {
                        const dayEvents = filteredEvents.filter(e => isSameDay(new Date(e.date), day));
                        dayEvents.forEach(e => {
                          const hour = new Date(e.date).getHours();
                          minHour = Math.min(minHour, hour);
                          maxHour = Math.max(maxHour, hour + 1);
                        });
                      });
                      // Add padding: start 1 hour before first event, end 1 hour after last
                      minHour = Math.max(0, minHour - 1);
                      maxHour = Math.min(23, maxHour + 1);
                      const visibleHours = Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i);

                      return (
                        <div className="grid grid-cols-8 min-w-[800px]">
                          {/* Time labels */}
                          <div className="border-r border-border">
                            {visibleHours.map(hour => (
                              <div key={hour} className="h-16 border-b border-border/50 px-2 py-1">
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  {format(new Date().setHours(hour, 0), "h a")}
                                </span>
                              </div>
                            ))}
                          </div>
                          {/* Day columns */}
                          {weekDays.map(day => {
                            const isSelected = isSameDay(day, date);
                            return (
                              <div key={day.toISOString()} className={cn("border-r border-border last:border-r-0", isSelected && "bg-primary/5")}>
                                {visibleHours.map(hour => {
                                  const hourEvents = getEventsForHour(day, hour);
                                  return (
                                    <div key={hour} className="h-16 border-b border-border/50 p-1 space-y-1">
                                      {hourEvents.map(e => (
                                        <EventPill key={e.id} event={e} compact />
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* DAY VIEW - Google Calendar Style */}
              {view === "day" && (
                <div className="flex flex-col h-[700px]">
                  <div className="border-b border-border bg-muted/30 shrink-0 py-3">
                    <div className="flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{format(date, "EEEE")}</p>
                        <p className={cn("text-2xl font-bold", isToday(date) ? "text-primary" : "text-foreground")}>
                          {format(date, "d")}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {(() => {
                      // Find the earliest and latest hour with events
                      const dayEvents = filteredEvents.filter(e => isSameDay(new Date(e.date), date));
                      let minHour = 8; // Default start at 8 AM
                      let maxHour = 18; // Default end at 6 PM
                      
                      if (dayEvents.length > 0) {
                        dayEvents.forEach(e => {
                          const hour = new Date(e.date).getHours();
                          minHour = Math.min(minHour, hour);
                          maxHour = Math.max(maxHour, hour + 1);
                        });
                        // Add padding
                        minHour = Math.max(0, minHour - 1);
                        maxHour = Math.min(23, maxHour + 1);
                      }
                      
                      const visibleHours = Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i);

                      return (
                        <div className="flex min-w-[600px]">
                          {/* Time labels */}
                          <div className="w-20 shrink-0 border-r border-border">
                            {visibleHours.map(hour => (
                              <div key={hour} className="h-16 border-b border-border/50 px-3 py-1">
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  {format(new Date().setHours(hour, 0), "h a")}
                                </span>
                              </div>
                            ))}
                          </div>
                          {/* Events column */}
                          <div className="flex-1">
                            {visibleHours.map(hour => {
                              const hourEvents = getEventsForHour(date, hour);
                              return (
                                <div key={hour} className="h-16 border-b border-border/50 p-2 space-y-1">
                                  {hourEvents.map(e => (
                                    <EventPill key={e.id} event={e} />
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* AGENDA VIEW - Notion Calendar Style */}
              {view === "agenda" && (
                <div className="p-0">
                  <div className="border-b border-border bg-muted/30 px-4 py-3">
                    <p className="text-sm font-bold text-foreground">All Events</p>
                  </div>
                  <div className="max-h-[700px] overflow-y-auto">
                    {Object.entries(
                      filteredEvents
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .reduce((acc, event) => {
                          const dateKey = format(new Date(event.date), "MMMM d, yyyy");
                          if (!acc[dateKey]) acc[dateKey] = [];
                          acc[dateKey].push(event);
                          return acc;
                        }, {} as Record<string, AppEvent[]>)
                    ).map(([dateKey, dayEvents]) => (
                      <div key={dateKey} className="border-b border-border/50 last:border-0">
                        <div className="sticky top-0 bg-card/95 backdrop-blur px-4 py-2 border-b border-border/50">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{dateKey}</p>
                        </div>
                        <div className="p-2 space-y-1">
                          {dayEvents.map(e => (
                            <EventCard key={e.id} event={e} onDelete={() => { if (confirm("Delete?")) eventStore.remove(e.id); }} compact />
                          ))}
                        </div>
                      </div>
                    ))}
                    {filteredEvents.length === 0 && (
                      <EmptyState icon={CalendarDays} text="No events to display." />
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* ── Right sidebar ── */}
          <div className="space-y-4">

            {/* Selected day events (month/week view) */}
            {view !== "day" && view !== "agenda" && (
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{format(date, "EEEE")}</p>
                    <p className="text-base font-bold text-foreground">{format(date, "MMMM d")}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                    {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                  {selectedDayEvents.length > 0
                    ? selectedDayEvents.map(e => (
                        <EventCard key={e.id} event={e} onDelete={() => { if (confirm("Delete?")) eventStore.remove(e.id); }} compact />
                      ))
                    : <EmptyState icon={Clock} text="Nothing on this day." />}
                </div>
              </div>
            )}

            {/* Upcoming events - full height on day view, split height on month/week */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Upcoming</p>
                <button onClick={() => setView("agenda")} className="text-[10px] font-semibold text-primary hover:underline">
                  View All
                </button>
              </div>
              <div className={cn("space-y-2 overflow-y-auto pr-1 custom-scrollbar",
                view === "day" ? "max-h-[660px]" : "max-h-[340px]"
              )}>
                {upcomingEvents.length > 0
                  ? upcomingEvents.map(e => (
                      <EventCard key={e.id} event={e} onDelete={() => {}} compact />
                    ))
                  : <EmptyState icon={CalendarDays} text="No upcoming events." />}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
