"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { eventStore } from "@/utils/eventStore";
import { deadlineStore, Deadline } from "@/utils/deadlineStore";
import { AppEvent } from "@/types/events";
import { isSameDay, isFuture, isToday, formatDistanceToNow, format } from "date-fns";
import ICSUploader from "./ICSUploader";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Flag, Plus, X, AlertCircle } from "lucide-react";

interface CalendarWidgetProps {
  streak?: number;
  streakLabel?: string;
}

type Tab = "day" | "upcoming" | "deadlines";

const PRIORITY_COLORS = {
  high:   { bar: "bg-destructive",  badge: "bg-destructive/10 text-destructive",  label: "High"   },
  medium: { bar: "bg-amber-500",    badge: "bg-amber-500/10 text-amber-400",      label: "Medium" },
  low:    { bar: "bg-primary",      badge: "bg-primary/10 text-primary",          label: "Low"    },
};

const CalendarWidget = ({ streak = 0, streakLabel = "days" }: CalendarWidgetProps) => {
  const router = useRouter();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [tab, setTab] = useState<Tab>("day");

  // Add deadline form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newPriority, setNewPriority] = useState<Deadline["priority"]>("medium");

  useEffect(() => {
    const loadEvents = () => setEvents(eventStore.getAll());
    const loadDeadlines = () => setDeadlines(deadlineStore.getAll());
    loadEvents(); loadDeadlines();
    window.addEventListener("eventsUpdated", loadEvents);
    window.addEventListener("deadlinesUpdated", loadDeadlines);
    return () => {
      window.removeEventListener("eventsUpdated", loadEvents);
      window.removeEventListener("deadlinesUpdated", loadDeadlines);
    };
  }, []);

  const selectedDayEvents = events.filter(e => date && isSameDay(new Date(e.date), date));

  const upcomingEvents = events
    .filter(e => isToday(new Date(e.date)) || isFuture(new Date(e.date)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 8);

  const activeDeadlines = deadlines
    .filter(d => isToday(new Date(d.dueDate)) || isFuture(new Date(d.dueDate)))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const handleAddDeadline = () => {
    if (!newTitle.trim() || !newDate) return;
    deadlineStore.add({
      title: newTitle.trim(),
      dueDate: new Date(newDate).toISOString(),
      subject: newSubject.trim() || undefined,
      priority: newPriority,
    });
    setNewTitle(""); setNewDate(""); setNewSubject(""); setNewPriority("medium");
    setShowAddForm(false);
  };

  const tabConfig: { id: Tab; label: string; count?: number }[] = [
    { id: "day",       label: date && isToday(date) ? "Today" : date ? format(date, "MMM d") : "Day", count: selectedDayEvents.length || undefined },
    { id: "upcoming",  label: "Upcoming",  count: upcomingEvents.length  || undefined },
    { id: "deadlines", label: "Deadlines", count: activeDeadlines.length || undefined },
  ];

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-muted-foreground font-black text-sm uppercase tracking-[0.2em]">Schedule</h3>
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

      <AnimatePresence mode="wait">
        {showUploader ? (
          <motion.div key="uploader" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="min-h-[300px]">
            <ICSUploader />
          </motion.div>
        ) : (
          <motion.div key="calendar" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="glass-card p-4 flex flex-col bg-background/40">
            <Calendar
              mode="single" selected={date} onSelect={setDate}
              className="rounded-3xl border-0 p-0 w-full"
              classNames={{
                month: "space-y-6 w-full",
                head_row: "flex w-full mb-2",
                head_cell: "text-muted-foreground flex-1 text-center font-black text-[0.65rem] uppercase tracking-widest",
                row: "flex w-full mt-2 gap-1",
                cell: "flex-1 h-12 text-center text-xs p-0 relative",
                day: cn(buttonVariants({ variant: "ghost" }), "h-12 w-12 mx-auto p-0 font-bold aria-selected:opacity-100 rounded-2xl transition-all hover:bg-primary/10 hover:text-primary"),
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-lg",
                day_today: "bg-muted text-foreground",
                caption_label: "text-sm font-black uppercase tracking-widest text-foreground",
                nav_button: cn(buttonVariants({ variant: "outline" }), "h-8 w-8 bg-background/50 p-0 opacity-70 hover:opacity-100 rounded-xl"),
                table: "w-full border-collapse space-y-1",
              }}
              modifiers={{ event: d => events.some(e => isSameDay(new Date(e.date), d)) }}
              modifiersClassNames={{ event: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full" }}
            />

            {/* Tabs */}
            <div className="mt-6 border-t border-border/10 pt-4">
              <div className="flex items-center gap-1 mb-4">
                {tabConfig.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all flex items-center gap-1",
                      tab === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
                    {t.id === "deadlines" && <Flag className="w-2.5 h-2.5" />}
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
                    className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                    {selectedDayEvents.length > 0
                      ? selectedDayEvents.map(e => <EventRow key={e.id} event={e} showDate={false} />)
                      : <EmptyState text="No events for this day." />}
                  </motion.div>
                )}
                {tab === "upcoming" && (
                  <motion.div key="upcoming" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}
                    className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                    {upcomingEvents.length > 0
                      ? upcomingEvents.map(e => <EventRow key={e.id} event={e} showDate={true} />)
                      : <EmptyState text="No upcoming events." />}
                  </motion.div>
                )}
                {tab === "deadlines" && (
                  <motion.div key="deadlines" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
                    {/* Add button */}
                    <div className="flex justify-end mb-2">
                      <button onClick={() => setShowAddForm(f => !f)}
                        className={cn("flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all",
                          showAddForm ? "bg-muted text-foreground" : "bg-primary/10 text-primary hover:bg-primary/20")}>
                        <Plus className="w-3 h-3" /> {showAddForm ? "Cancel" : "Add Deadline"}
                      </button>
                    </div>

                    {/* Add form */}
                    <AnimatePresence>
                      {showAddForm && (
                        <motion.div key="form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-3">
                          <div className="p-3 rounded-2xl bg-muted/20 border border-white/5 space-y-2">
                            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Deadline title..."
                              className="w-full bg-transparent text-xs font-semibold text-foreground placeholder:text-muted-foreground outline-none border-b border-border/20 pb-1" />
                            <div className="flex gap-2">
                              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                                className="flex-1 bg-transparent text-xs text-foreground outline-none border border-border/20 rounded-lg px-2 py-1" />
                              <input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Subject (opt.)"
                                className="flex-1 bg-transparent text-xs text-muted-foreground placeholder:text-muted-foreground/60 outline-none border border-border/20 rounded-lg px-2 py-1" />
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex gap-1">
                                {(["high","medium","low"] as Deadline["priority"][]).map(p => (
                                  <button key={p} onClick={() => setNewPriority(p)}
                                    className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full transition-all",
                                      newPriority === p ? PRIORITY_COLORS[p].badge : "text-muted-foreground hover:text-foreground bg-muted/30")}>
                                    {p}
                                  </button>
                                ))}
                              </div>
                              <button onClick={handleAddDeadline} disabled={!newTitle.trim() || !newDate}
                                className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full gradient-primary text-primary-foreground disabled:opacity-40 transition-all">
                                Save
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Deadline list */}
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                      {activeDeadlines.length > 0
                        ? activeDeadlines.map(d => <DeadlineRow key={d.id} deadline={d} onRemove={() => deadlineStore.remove(d.id)} />)
                        : <EmptyState text="No deadlines yet. Add one above." />}
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

const EventRow = ({ event, showDate }: { event: AppEvent; showDate: boolean }) => {
  const dueDate = new Date(event.date);
  const isExam = event.type === "exam";
  const dueSoon = showDate && (dueDate.getTime() - Date.now()) < 1000 * 60 * 60 * 48;
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/20 border border-white/5 hover:bg-muted/30 transition-all group">
      <div className={cn("w-1 self-stretch rounded-full shrink-0 transition-transform group-hover:scale-y-110",
        isExam ? "bg-destructive" : dueSoon ? "bg-amber-500" : "bg-primary")} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground leading-tight truncate">{event.title}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate uppercase tracking-tighter">{event.description || event.type}</p>
      </div>
      {showDate && (
        <span className={cn("text-[10px] font-bold shrink-0 px-2 py-0.5 rounded-full",
          isToday(dueDate) ? "bg-destructive/10 text-destructive" : dueSoon ? "bg-amber-500/10 text-amber-400" : "text-muted-foreground")}>
          {isToday(dueDate) ? "Today" : formatDistanceToNow(dueDate, { addSuffix: true })}
        </span>
      )}
    </div>
  );
};

const DeadlineRow = ({ deadline, onRemove }: { deadline: Deadline; onRemove: () => void }) => {
  const dueDate = new Date(deadline.dueDate);
  const colors = PRIORITY_COLORS[deadline.priority];
  const dueSoon = (dueDate.getTime() - Date.now()) < 1000 * 60 * 60 * 48;
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/20 border border-white/5 hover:bg-muted/30 transition-all group">
      <div className={cn("w-1 self-stretch rounded-full shrink-0", colors.bar)} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground leading-tight truncate">{deadline.title}</p>
        {deadline.subject && <p className="text-[10px] text-muted-foreground mt-0.5 truncate uppercase tracking-tighter">{deadline.subject}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
          isToday(dueDate) ? "bg-destructive/10 text-destructive" : dueSoon ? "bg-amber-500/10 text-amber-400" : "text-muted-foreground")}>
          {isToday(dueDate) ? "Today" : formatDistanceToNow(dueDate, { addSuffix: true })}
        </span>
        <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

const EmptyState = ({ text }: { text: string }) => (
  <div className="py-5 text-center">
    <p className="text-[10px] text-muted-foreground font-medium italic">{text}</p>
  </div>
);

export default CalendarWidget;
