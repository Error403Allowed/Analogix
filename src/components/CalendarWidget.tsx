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
import { Plus, X } from "lucide-react";
import { getTermInfo, getNextTerm, getStoredState } from "@/utils/termData";

interface CalendarWidgetProps {
  streak?: number;
  streakLabel?: string;
}

type Tab = "day" | "add";

const TermBadge = () => {
  const userState = getStoredState();
  if (!userState) return null;
  const now = new Date();
  const info = getTermInfo(now, userState);
  const next = !info ? getNextTerm(now, userState) : null;

  if (info) {
    const pct = Math.round((info.week / info.weeksTotal) * 100);
    return (
      <div className="px-2 py-1.5 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between gap-3">
        <div>
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-primary/70">{info.term.label} · {userState}</p>
          <p className="text-[10px] font-black text-foreground leading-tight">Week {info.week} <span className="text-muted-foreground font-medium">of {info.weeksTotal}</span></p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[9px] font-black text-primary">{pct}%</span>
          <div className="w-16 h-1 bg-primary/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    );
  }

  if (next) {
    const daysUntil = Math.ceil((next.start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return (
      <div className="px-3 py-2.5 rounded-2xl bg-card/80 border border-border/70 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">School Holidays · {userState}</p>
          <p className="text-sm font-black text-foreground leading-tight">{next.label} in {daysUntil} day{daysUntil !== 1 ? "s" : ""}</p>
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
  const [tab, setTab] = useState<Tab>("day");

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

  // Pre-fill date when switching to add tab
  const handleTabSwitch = (t: Tab) => {
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

  const tabConfig: { id: Tab; label: string; count?: number }[] = [
    { id: "day",  label: date && isToday(date) ? "Today" : date ? format(date, "MMM d") : "Day", count: selectedDayEvents.length || undefined },
    { id: "add",  label: "Add Event" },
  ];

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex gap-4">
          <button onClick={() => router.push("/calendar")}
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all">
            Full View
          </button>
          <button onClick={() => setShowUploader(!showUploader)}
            className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-all">
            {showUploader ? "View Calendar" : "Import ICS"}
          </button>
        </div>
      </div>

      {/* Term badge */}
      <TermBadge />

      <AnimatePresence mode="wait">
        {showUploader ? (
          <motion.div key="uploader" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <ICSUploader />
          </motion.div>
        ) : (
          <motion.div key="calendar" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="glass-card p-2 flex flex-col bg-card/85 border border-border/70">
            <Calendar
              mode="single" selected={date} onSelect={setDate}
              className="rounded-3xl border-0 p-0 w-full"
              classNames={{
                month: "space-y-0.5 w-full",
                head_row: "flex w-full mb-0.5",
                head_cell: "text-foreground/75 flex-1 text-center font-black text-[0.6rem] uppercase tracking-widest",
                row: "flex w-full mt-0.5 gap-0.5",
                cell: "flex-1 h-7 text-center text-xs p-0 relative",
                day: cn(buttonVariants({ variant: "ghost" }), "h-7 w-7 mx-auto p-0 font-bold aria-selected:opacity-100 rounded-lg transition-all hover:bg-primary/10 hover:text-primary text-xs"),
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-lg",
                day_today: "bg-muted text-foreground",
                caption_label: "text-xs font-black uppercase tracking-widest text-foreground",
                nav_button: cn(buttonVariants({ variant: "outline" }), "h-6 w-6 bg-card/80 border-border/70 p-0 opacity-85 hover:opacity-100 rounded-lg"),
                table: "w-full border-collapse space-y-0",
              }}
              modifiers={{ event: d => events.some(e => isSameDay(new Date(e.date), d)) }}
              modifiersClassNames={{ event: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full" }}
            />

            {/* Tabs */}
            <div className="mt-1.5 border-t border-border/10 pt-1.5">
              <div className="flex items-center gap-1 mb-1.5">
                {tabConfig.map(t => (
                  <button key={t.id} onClick={() => handleTabSwitch(t.id)}
                    className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full transition-all flex items-center gap-1",
                      tab === t.id ? "bg-primary/12 text-primary" : "bg-card/50 text-foreground/75 hover:text-foreground")}>
                    {t.id === "add" && <Plus className="w-2.5 h-2.5" />}
                    {t.label}
                    {t.count != null && (
                      <span className="ml-0.5 bg-primary text-primary-foreground rounded-full px-1.5 py-px text-[9px]">{t.count}</span>
                    )}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {tab === "day" && (
                  <motion.div key="day" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}
                    className="space-y-1 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                    {selectedDayEvents.length > 0
                      ? selectedDayEvents.map(e => <EventRow key={e.id} event={e} onDelete={() => eventStore.remove(e.id)} />)
                      : <EmptyState text="No events for this day." />}
                  </motion.div>
                )}
                {tab === "add" && (
                  <motion.div key="add" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
                    <div className="p-3 rounded-2xl bg-card/70 border border-border/60 space-y-2">
                      <input value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="Event title..."
                        className="w-full bg-transparent text-xs font-semibold text-foreground placeholder:text-foreground/55 outline-none border-b border-border/50 pb-1" />
                      <div className="flex gap-2">
                        <input type="date" value={evDate} onChange={e => setEvDate(e.target.value)}
                          className="flex-1 bg-background/70 text-xs text-foreground outline-none border border-border/60 rounded-lg px-2 py-1" />
                        <input type="time" value={evTime} onChange={e => setEvTime(e.target.value)}
                          className="w-20 bg-background/70 text-xs text-foreground outline-none border border-border/60 rounded-lg px-2 py-1" />
                      </div>
                      <input value={evSubject} onChange={e => setEvSubject(e.target.value)} placeholder="Subject (optional)"
                        className="w-full bg-background/70 text-xs text-foreground/80 placeholder:text-foreground/55 outline-none border border-border/60 rounded-lg px-2 py-1" />
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          {(["event", "exam", "assignment"] as AppEvent["type"][]).map(t => (
                            <button key={t} onClick={() => setEvType(t)}
                              className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full transition-all",
                                evType === t
                                  ? t === "exam" ? "bg-destructive/15 text-destructive"
                                    : t === "assignment" ? "bg-amber-500/15 text-amber-400"
                                    : "bg-primary/15 text-primary"
                                  : "text-foreground/75 hover:text-foreground bg-card/60 border border-border/50")}>
                              {t}
                            </button>
                          ))}
                        </div>
                        <button onClick={handleAddEvent} disabled={!evTitle.trim() || !evDate}
                          className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-all hover:bg-primary/90">
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
  const isExam = event.type === "exam";
  return (
    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-card/70 border border-border/60 hover:bg-card/90 transition-all group">
      <div className={cn("w-1 self-stretch rounded-full shrink-0",
        isExam ? "bg-destructive" : event.type === "assignment" ? "bg-amber-500" : "bg-primary")} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground leading-tight truncate">{event.title}</p>
        <p className="text-[10px] text-foreground/70 mt-0.5 truncate uppercase tracking-tighter">{event.subject || event.type}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-foreground/70 font-medium">{format(new Date(event.date), "h:mma")}</span>
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 transition-opacity text-foreground/60 hover:text-destructive">
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

const EmptyState = ({ text }: { text: string }) => (
  <div className="py-5 text-center">
    <p className="text-[10px] text-foreground/70 font-medium italic">{text}</p>
  </div>
);

export default CalendarWidget;
