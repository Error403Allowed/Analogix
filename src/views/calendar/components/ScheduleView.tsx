"use client";
import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Clock, Tag, CalendarDays, X } from "lucide-react";
import { format, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import type { AppEvent } from "@/types/events";
import { getTypeMeta } from "../storage";

export function ScheduleView({ events, allTypes, focusDate, onSelectEvent, onDelete }: {
  events: AppEvent[]; allTypes: Record<string,{color:string;label:string;icon:string}>;
  focusDate: Date;
  onSelectEvent: (e: AppEvent) => void; onDelete: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef(new Map<string, HTMLDivElement>());

  const { orderedKeys, byDate } = useMemo(() => {
    const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const grouped = sorted.reduce((acc, e) => {
      const key = format(new Date(e.date), "yyyy-MM-dd");
      if (!acc[key]) acc[key] = [];
      acc[key].push(e);
      return acc;
    }, {} as Record<string, AppEvent[]>);
    return { orderedKeys: Object.keys(grouped), byDate: grouped };
  }, [events]);

  const focusKey = format(focusDate, "yyyy-MM-dd");

  // Jumping to a date (Today, the arrows, picking a day in the rail) has to move
  // the agenda. There may be no events on the target day, so fall back to the
  // first day at or after it, then to the last day before it.
  const targetKey = useMemo(() => {
    if (orderedKeys.length === 0) return null;
    return (
      orderedKeys.find((key) => key >= focusKey)
      ?? orderedKeys[orderedKeys.length - 1]
    );
  }, [orderedKeys, focusKey]);

  // focusTime (not just the day key) is in the deps so that re-picking the same
  // day - tapping "Today" twice, or after scrolling away - jumps back again.
  const focusTime = focusDate.getTime();
  useEffect(() => {
    if (!targetKey) return;
    const container = scrollRef.current;
    const group = groupRefs.current.get(targetKey);
    if (!container || !group) return;
    container.scrollTo({
      top: Math.max(group.offsetTop - container.offsetTop, 0),
      behavior: "smooth",
    });
  }, [targetKey, focusTime]);

  if (orderedKeys.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
          <CalendarDays className="w-7 h-7 text-muted-foreground/40" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">No events to show</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      {orderedKeys.map((dateKey) => {
        const dayEvents = byDate[dateKey];
        const d = new Date(`${dateKey}T00:00:00`);
        const isTod = isToday(d);
        return (
          <div
            key={dateKey}
            ref={(node) => {
              if (node) groupRefs.current.set(dateKey, node);
              else groupRefs.current.delete(dateKey);
            }}
            className={cn("flex scroll-mt-4", dateKey === targetKey && "bg-primary/[0.03]")}
          >
            <div className="w-[72px] sm:w-[110px] shrink-0 sticky top-0 self-start pt-5 pl-3 pr-2 sm:pl-4 sm:pr-3">
              <p className={cn("text-[9px] font-black uppercase tracking-widest mb-0.5", isTod ? "text-primary" : "text-muted-foreground/60")}>
                {isTod ? "Today" : format(d, "EEE")}
              </p>
              <p className={cn("text-2xl font-black tabular-nums leading-none", isTod ? "text-primary" : "text-foreground/80")}>{format(d, "d")}</p>
              <p className="text-[9px] text-muted-foreground/50 mt-0.5 font-medium">{format(d, "MMM yyyy")}</p>
            </div>
            <div className="flex-1 border-l border-border/30 py-3 pr-4 space-y-2">
              {dayEvents.map(e => {
                const meta = getTypeMeta(e.type, allTypes);
                return (
                  <motion.div key={e.id} layout initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    className="group flex items-start gap-3 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors border border-transparent hover:border-border/40"
                    onClick={() => onSelectEvent(e)}>
                    <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">{e.title}</p>
                        <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: meta.color }}>{meta.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />{format(new Date(e.date), "h:mm a")}
                          {e.endDate && ` – ${format(new Date(e.endDate), "h:mm a")}`}
                        </span>
                        {e.subject && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Tag className="w-2.5 h-2.5" />{e.subject}</span>}
                      </div>
                    </div>
                    <button onClick={ev => { ev.stopPropagation(); onDelete(e.id); }}
                      aria-label={`Delete ${e.title}`}
                      className="opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-2 md:p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
