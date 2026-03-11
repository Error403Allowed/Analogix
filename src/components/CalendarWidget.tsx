"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { eventStore } from "@/utils/eventStore";
import { AppEvent } from "@/types/events";
import { isSameDay, isToday, format } from "date-fns";
import ICSUploader from "./ICSUploader";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Plus, X, ChevronRight } from "lucide-react";
import { getTermInfo, getNextTerm, getStoredState } from "@/utils/termData";

interface CalendarWidgetProps {
  streak?: number;
  streakLabel?: string;
}

const EVENT_COLORS = {
  exam: { bg: "bg-red-500", text: "text-red-600", light: "bg-red-500/10" },
  assignment: { bg: "bg-amber-500", text: "text-amber-600", light: "bg-amber-500/10" },
  event: { bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-500/10" },
  class: { bg: "bg-emerald-500", text: "text-emerald-600", light: "bg-emerald-500/10" },
  lesson: { bg: "bg-emerald-500", text: "text-emerald-600", light: "bg-emerald-500/10" },
};

const getEventStyle = (event: AppEvent) => {
  const type = event.type as keyof typeof EVENT_COLORS;
  return EVENT_COLORS[type] || EVENT_COLORS.event;
};

const TermBadge = () => {
  const userState = getStoredState();
  if (!userState) return null;
  const now = new Date();
  const info = getTermInfo(now, userState);
  const next = !info ? getNextTerm(now, userState) : null;

  if (info) {
    const pct = Math.round((info.week / info.weeksTotal) * 100);
    return (
      <div className="px-3 py-2 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-primary/70">{info.term.label}</p>
          <p className="text-xs font-bold text-foreground">Week {info.week} <span className="text-muted-foreground font-normal">of {info.weeksTotal}</span></p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="text-[10px] font-bold text-primary">{pct}%</span>
          <div className="w-14 h-1.5 bg-primary/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    );
  }

  if (next) {
    const daysUntil = Math.ceil((next.start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return (
      <div className="px-3 py-2.5 rounded-xl bg-card/80 border border-border/70 flex items-center gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">School Holidays</p>
          <p className="text-xs font-bold text-foreground">{next.label} in {daysUntil}d</p>
        </div>
      </div>
    );
  }
  return null;
};

const CalendarWidget = ({ streak = 0, streakLabel = "days" }: CalendarWidgetProps) => {
  const router = useRouter();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [tab, setTab] = useState<"day" | "add">("day");

  // Add event form state
  const [evTitle, setEvTitle] = useState("");
  const [evDate, setEvDate] = useState("");
  const [evTime, setEvTime] = useState("09:00");
  const [evType, setEvType] = useState<AppEvent["type"]>("event");
  const [evSubject, setEvSubject] = useState("");

  useEffect(() => {
    const load = () => eventStore.getAll().then(setEvents);
    load();
    window.addEventListener("eventsUpdated", load);
    return () => window.removeEventListener("eventsUpdated", load);
  }, []);

  const handleTabSwitch = (t: "day" | "add") => {
    if (t === "add" && date) setEvDate(format(date, "yyyy-MM-dd"));
    setTab(t);
  };

  const handleAddEvent = () => {
    if (!evTitle.trim() || !evDate) return;
    const newEvent: AppEvent = {
      id: crypto.randomUUID(),
      title: evTitle.trim(),
      date: new Date(`${evDate}T${evTime}`),
      type: evType,
      subject: evSubject.trim() || undefined,
      source: "manual",
    };
    eventStore.add(newEvent);
    setEvTitle(""); setEvDate(""); setEvTime("09:00");
    setEvType("event"); setEvSubject("");
    setTab("day");
  };

  const selectedDayEvents = events.filter(e => date && isSameDay(new Date(e.date), date));

  return (
    <div className="flex flex-col space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/calendar")}
          className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-all flex items-center gap-1">
          Full View <ChevronRight className="w-3 h-3" />
        </button>
        <button onClick={() => setShowUploader(!showUploader)}
          className="text-[10px] font-bold uppercase tracking-wider text-primary hover:opacity-80 transition-all">
          {showUploader ? "Close" : "Import ICS"}
        </button>
      </div>

      {/* Term badge */}
      <TermBadge />

      <AnimatePresence mode="wait">
        {showUploader ? (
          <motion.div key="uploader" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <ICSUploader />
          </motion.div>
        ) : (
          <motion.div key="calendar" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="glass-card p-3 flex flex-col bg-card/85 border border-border/70 rounded-2xl">
            <Calendar
              mode="single" selected={date} onSelect={setDate}
              className="rounded-xl border-0 p-0 w-full"
              classNames={{
                month: "space-y-1 w-full",
                head_row: "flex w-full mb-1",
                head_cell: "text-foreground/60 flex-1 text-center font-bold text-[0.55rem] uppercase tracking-wider",
                row: "flex w-full mt-0.5 gap-0.5",
                cell: "flex-1 h-8 text-center text-xs p-0 relative",
                day: cn(buttonVariants({ variant: "ghost" }), "h-8 w-8 mx-auto p-0 font-bold aria-selected:opacity-100 rounded-md transition-all hover:bg-primary/10 hover:text-primary text-xs"),
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-md",
                day_today: "bg-muted text-foreground font-bold",
                caption_label: "text-xs font-bold uppercase tracking-wider text-foreground",
                nav_button: cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-card/80 border-border/70 p-0 opacity-85 hover:opacity-100 rounded-md"),
                table: "w-full border-collapse space-y-0",
              }}
              modifiers={{ event: d => events.some(e => isSameDay(new Date(e.date), d)) }}
              modifiersClassNames={{ event: "relative after:absolute after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full" }}
            />

            {/* Tabs */}
            <div className="mt-2 border-t border-border/30 pt-2">
              <div className="flex items-center gap-1 mb-2">
                <button
                  onClick={() => setTab("day")}
                  className={cn("flex-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5",
                    tab === "day" ? "bg-primary/10 text-primary" : "bg-card/50 text-foreground/60 hover:text-foreground")}
                >
                  {date && isToday(date) ? "Today" : date ? format(date, "MMM d") : "Day"}
                  {selectedDayEvents.length > 0 && (
                    <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-px text-[9px]">{selectedDayEvents.length}</span>
                  )}
                </button>
                <button
                  onClick={() => handleTabSwitch("add")}
                  className={cn("flex-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5",
                    tab === "add" ? "bg-primary/10 text-primary" : "bg-card/50 text-foreground/60 hover:text-foreground")}
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>

              <AnimatePresence mode="wait">
                {tab === "day" && (
                  <motion.div key="day" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}
                    className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                    {selectedDayEvents.length > 0
                      ? selectedDayEvents.map(e => <EventRow key={e.id} event={e} onDelete={() => eventStore.remove(e.id)} />)
                      : <EmptyState text="No events today." />}
                  </motion.div>
                )}
                {tab === "add" && (
                  <motion.div key="add" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
                    <div className="p-3 rounded-xl bg-card/70 border border-border/60 space-y-2">
                      <input value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="Event title..."
                        className="w-full bg-transparent text-xs font-semibold text-foreground placeholder:text-muted-foreground outline-none border-b border-border/50 pb-1.5" />
                      <div className="flex gap-2">
                        <input type="date" value={evDate} onChange={e => setEvDate(e.target.value)}
                          className="flex-1 bg-background/70 text-xs text-foreground outline-none border border-border/60 rounded-lg px-2 py-1.5" />
                        <input type="time" value={evTime} onChange={e => setEvTime(e.target.value)}
                          className="w-20 bg-background/70 text-xs text-foreground outline-none border border-border/60 rounded-lg px-2 py-1.5" />
                      </div>
                      <input value={evSubject} onChange={e => setEvSubject(e.target.value)} placeholder="Subject (optional)"
                        className="w-full bg-background/70 text-xs text-foreground/80 placeholder:text-muted-foreground outline-none border border-border/60 rounded-lg px-2 py-1.5" />
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          {(["event", "exam", "assignment"] as AppEvent["type"][]).map(t => (
                            <button key={t} onClick={() => setEvType(t)}
                              className={cn("text-[9px] font-bold uppercase px-2 py-1 rounded-md transition-all",
                                evType === t
                                  ? t === "exam" ? "bg-red-500/15 text-red-600"
                                    : t === "assignment" ? "bg-amber-500/15 text-amber-600"
                                    : "bg-blue-500/15 text-blue-600"
                                  : "text-foreground/60 hover:text-foreground bg-card/60 border border-border/50")}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                        <button onClick={handleAddEvent} disabled={!evTitle.trim() || !evDate}
                          className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 transition-all hover:bg-primary/90">
                          Save
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const EventRow = ({ event, onDelete }: { event: AppEvent; onDelete: () => void }) => {
  const style = getEventStyle(event);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 p-2 rounded-lg bg-card/70 border border-border/60 hover:bg-card/90 transition-all group"
    >
      <div className={cn("w-1.5 self-stretch rounded-full shrink-0", style.bg)} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground leading-tight truncate">{event.title}</p>
        <p className="text-[9px] text-foreground/60 mt-0.5 truncate uppercase tracking-wider">{event.subject || event.type}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[9px] text-foreground/60 font-medium">{format(new Date(event.date), "h:mma")}</span>
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 transition-opacity text-foreground/50 hover:text-destructive p-1">
          <X className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
};

const EmptyState = ({ text }: { text: string }) => (
  <div className="py-4 text-center">
    <p className="text-[10px] text-foreground/50 font-medium italic">{text}</p>
  </div>
);

export default CalendarWidget;
