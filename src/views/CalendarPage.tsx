"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Upload, X, Tag, ChevronLeft, ChevronRight,
  Plus, Clock, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks,
  startOfMonth, endOfMonth, eachDayOfInterval as eachDay,
  addMonths, subMonths, isSameMonth, isSameDay, isToday, format,
} from "date-fns";
import ICSUploader from "@/components/ICSUploader";
import { eventStore } from "@/utils/eventStore";
import { AppEvent } from "@/types/events";
import { getTermInfo, getStoredState } from "@/utils/termData";

type CalendarView = "month" | "week" | "day";

// ── Sub-components ─────────────────────────────────────────────────────────────

const EventPill = ({ event, onClick }: { event: AppEvent; onClick?: () => void }) => (
  <div
    role="button" tabIndex={0} onClick={onClick}
    onKeyDown={e => (e.key === "Enter" || e.key === " ") && onClick?.()}
    className={cn(
      "w-full text-left text-[10px] font-bold px-1.5 py-0.5 rounded-md truncate transition-all hover:brightness-110 cursor-pointer",
      event.type === "exam" ? "bg-destructive/15 text-destructive"
        : event.type === "assignment" ? "bg-amber-500/15 text-amber-400"
        : "bg-primary/15 text-primary"
    )}>
    {format(new Date(event.date), "h:mma")} {event.title}
  </div>
);

const EventCard = ({ event, onDelete }: { event: AppEvent; onDelete: () => void }) => (
  <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
    className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border/60 hover:border-border transition-all group">
    <div className={cn("w-1 self-stretch rounded-full shrink-0 mt-0.5",
      event.type === "exam" ? "bg-destructive" : event.type === "assignment" ? "bg-amber-500" : "bg-primary")} />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
          event.type === "exam" ? "bg-destructive/10 text-destructive border-destructive/20"
            : event.type === "assignment" ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
            : "bg-primary/10 text-primary border-primary/20")}>
          {event.type}
        </span>
        {event.subject && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            <Tag className="w-2.5 h-2.5" />{event.subject}
          </span>
        )}
      </div>
      <p className="text-sm font-bold text-foreground">{event.title}</p>
      {event.description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{event.description}</p>}
      <p className="text-[10px] text-muted-foreground/60 mt-1.5 font-medium">{format(new Date(event.date), "h:mm a")}</p>
    </div>
    <button onClick={onDelete}
      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-destructive/10 shrink-0">
      <X className="w-3.5 h-3.5" />
    </button>
  </motion.div>
);

const EmptyState = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="py-12 flex flex-col items-center gap-3 text-center">
    <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center">
      <Icon className="w-5 h-5 text-muted-foreground/40" />
    </div>
    <p className="text-xs text-muted-foreground/60 font-medium max-w-[180px]">{text}</p>
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

  // Add event form
  const [showAddEvent, setShowAddEvent] = useState(false);
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
  const selectedDayEvents = events
    .filter(e => isSameDay(new Date(e.date), date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
    : format(date, "EEEE, MMMM d");

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm font-bold">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </button>
            <span className="text-border/60">·</span>
            {termInfo
              ? <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{termInfo.term.label} · Week {termInfo.week} · {userState}</span>
              : userState
              ? <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">School Holidays · {userState}</span>
              : <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Set your state in profile</span>}
          </div>
          <button onClick={() => setShowUploader(s => !s)}
            className={cn("flex items-center gap-2 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all",
              showUploader ? "bg-muted text-foreground border-border" : "text-primary border-primary/30 hover:bg-primary/5")}>
            <Upload className="w-3.5 h-3.5" />
            {showUploader ? "Close" : "Import .ics"}
          </button>
        </div>

        {showUploader && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg">
            <ICSUploader />
          </motion.div>
        )}

        {/* ── View switcher + nav + add button ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={() => setDate(new Date())} className="px-3 py-1.5 rounded-xl border border-border text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-muted transition-colors">
              Today
            </button>
            <button onClick={() => navigate(1)} className="w-8 h-8 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <h2 className="text-lg font-black text-foreground ml-2">{navLabel}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setShowAddEvent(s => !s); setEvDate(format(date, "yyyy-MM-dd")); }}
              className={cn("flex items-center gap-1.5 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all",
                showAddEvent ? "bg-muted text-foreground border-border" : "bg-primary text-primary-foreground border-primary hover:bg-primary/90")}>
              <Plus className="w-3.5 h-3.5" />{showAddEvent ? "Cancel" : "Add Event"}
            </button>
            <div className="flex bg-muted/50 p-1 rounded-xl border border-border/50">
              {(["month", "week", "day"] as CalendarView[]).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={cn("px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                    view === v ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Add Event Form ── */}
        <AnimatePresence>
          {showAddEvent && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-4 max-w-2xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">New Event</p>
                <input value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="Event title..."
                  className="w-full bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 outline-none border-b border-border/40 pb-2" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Date</label>
                    <input type="date" value={evDate} onChange={e => setEvDate(e.target.value)}
                      className="bg-transparent text-xs text-foreground outline-none border border-border/40 rounded-xl px-3 py-2" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Time</label>
                    <input type="time" value={evTime} onChange={e => setEvTime(e.target.value)}
                      className="bg-transparent text-xs text-foreground outline-none border border-border/40 rounded-xl px-3 py-2" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Type</label>
                    <div className="flex gap-1">
                      {(["event","exam","assignment"] as AppEvent["type"][]).map(t => (
                        <button key={t} onClick={() => setEvType(t)}
                          className={cn("flex-1 text-[9px] font-black uppercase px-1 py-2 rounded-xl border transition-all",
                            evType === t
                              ? t === "exam" ? "bg-destructive/15 text-destructive border-destructive/30"
                                : t === "assignment" ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                : "bg-primary/15 text-primary border-primary/30"
                              : "border-border text-muted-foreground hover:text-foreground"
                          )}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Subject</label>
                    <input value={evSubject} onChange={e => setEvSubject(e.target.value)} placeholder="Optional"
                      className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 outline-none border border-border/40 rounded-xl px-3 py-2" />
                  </div>
                </div>
                <input value={evDescription} onChange={e => setEvDescription(e.target.value)} placeholder="Description (optional)..."
                  className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 outline-none border border-border/40 rounded-xl px-3 py-2" />
                <div className="flex justify-end">
                  <button onClick={handleAddEvent} disabled={!evTitle.trim() || !evDate}
                    className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 transition-all hover:bg-primary/90">
                    Save Event
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main grid: calendar + sidebar ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

          {/* ── Calendar panel ── */}
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}
              className="rounded-2xl border border-border bg-card overflow-hidden">

              {/* MONTH VIEW */}
              {view === "month" && (
                <div>
                  <div className="grid grid-cols-7 border-b border-border">
                    {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                      <div key={d} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {calDays.map((day, i) => {
                      const dayEvents = events.filter(e => isSameDay(new Date(e.date), day));
                      const inMonth = isSameMonth(day, date);
                      const isSelected = isSameDay(day, date);
                      const isTod = isToday(day);
                      return (
                        <div key={i} role="button" tabIndex={0} onClick={() => setDate(day)}
                          onKeyDown={e => (e.key === "Enter" || e.key === " ") && setDate(day)}
                          className={cn("min-h-[100px] p-2 text-left border-b border-r border-border/40 transition-colors hover:bg-muted/30 flex flex-col gap-1 cursor-pointer",
                            !inMonth && "opacity-30", isSelected && "bg-primary/5", (i + 1) % 7 === 0 && "border-r-0")}>
                          <span className={cn("text-xs font-black w-7 h-4 flex items-center justify-center rounded-full transition-colors",
                            isTod ? "bg-primary text-primary-foreground" : isSelected ? "text-primary" : "text-foreground")}>
                            {format(day, "d")}
                          </span>
                          <div className="flex flex-col gap-0.5 w-full">
                            {dayEvents.slice(0, 3).map(e => (
                              <EventPill key={e.id} event={e} onClick={() => { setDate(day); setSelectedEvent(e); }} />
                            ))}
                            {dayEvents.length > 3 && (
                              <span className="text-[9px] text-muted-foreground font-bold pl-1">+{dayEvents.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* WEEK VIEW */}
              {view === "week" && (
                <div>
                  <div className="grid grid-cols-7 border-b border-border">
                    {weekDays.map(day => {
                      const isTod = isToday(day);
                      const isSelected = isSameDay(day, date);
                      return (
                        <button key={day.toISOString()} onClick={() => setDate(day)}
                          className={cn("py-4 flex flex-col items-center gap-1 transition-colors hover:bg-muted/30", isSelected && "bg-primary/5")}>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{format(day, "EEE")}</span>
                          <span className={cn("text-lg font-black w-9 h-9 flex items-center justify-center rounded-full",
                            isTod ? "bg-primary text-primary-foreground" : isSelected ? "text-primary" : "text-foreground")}>
                            {format(day, "d")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-7 min-h-[400px]">
                    {weekDays.map(day => {
                      const dayEvents = events.filter(e => isSameDay(new Date(e.date), day));
                      const isSelected = isSameDay(day, date);
                      return (
                        <div key={day.toISOString()} onClick={() => setDate(day)}
                          className={cn("p-2 border-r border-border/40 last:border-r-0 space-y-1 cursor-pointer hover:bg-muted/20 transition-colors", isSelected && "bg-primary/5")}>
                          {dayEvents.map(e => <EventPill key={e.id} event={e} />)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* DAY VIEW */}
              {view === "day" && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">{format(date, "EEEE")}</p>
                      <h3 className="text-3xl font-black text-foreground">{format(date, "MMMM d, yyyy")}</h3>
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {selectedDayEvents.length > 0
                      ? selectedDayEvents.map(e => (
                          <EventCard key={e.id} event={e} onDelete={() => { if (confirm("Delete event?")) eventStore.remove(e.id); }} />
                        ))
                      : <EmptyState icon={CalendarDays} text="Nothing scheduled for this day." />}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* ── Right sidebar ── */}
          <div className="space-y-4">

            {/* Selected day events (month/week view) */}
            {view !== "day" && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{format(date, "EEEE")}</p>
                    <p className="text-sm font-black text-foreground">{format(date, "MMMM d")}</p>
                  </div>
                  <span className="text-[10px] font-black px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedDayEvents.length > 0
                    ? selectedDayEvents.map(e => (
                        <EventCard key={e.id} event={e} onDelete={() => { if (confirm("Delete?")) eventStore.remove(e.id); }} />
                      ))
                    : <EmptyState icon={Clock} text="Nothing on this day." />}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
