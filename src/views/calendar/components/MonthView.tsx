"use client";
import { useEffect, useState } from "react";
import {
  startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth,
  isSameMonth, isSameDay, isToday, format, isWeekend,
} from "date-fns";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppEvent } from "@/types/events";
import { EventChip } from "./EventChip";
import type { WeekStartsOn } from "../settings";

const WEEKDAY_HEADERS: Record<WeekStartsOn, string[]> = {
  1: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  0: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

const MAX_VISIBLE_CHIPS = 3;

export function MonthView({ date, events, allTypes, weekStartsOn = 1, showWeekends = true, onSelectDay, onSelectEvent, onClickCreate }: {
  date: Date; events: AppEvent[]; allTypes: Record<string,{color:string;label:string;icon:string}>;
  weekStartsOn?: WeekStartsOn; showWeekends?: boolean;
  onSelectDay: (d: Date) => void; onSelectEvent: (e: AppEvent) => void;
  onClickCreate: (d: Date) => void;
}) {
  const [moreDay, setMoreDay] = useState<Date | null>(null);

  useEffect(() => {
    if (!moreDay) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMoreDay(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moreDay]);

  const allDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(date), { weekStartsOn }),
    end: endOfWeek(endOfMonth(date), { weekStartsOn }),
  });
  const days = showWeekends ? allDays : allDays.filter((d) => !isWeekend(d));
  const cols = showWeekends ? 7 : 5;
  const moreDayEvents = moreDay
    ? events.filter(e => isSameDay(new Date(e.date), moreDay))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="grid border-b border-border/50" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {WEEKDAY_HEADERS[weekStartsOn]
          .filter((_, i) => showWeekends || (weekStartsOn === 1 ? i < 5 : i !== 0 && i !== 6))
          .map(d => (
            <div key={d} className="py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{d}</div>
          ))}
      </div>
      <div className="grid flex-1 overflow-auto" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {days.map((day, i) => {
          const dayEvents = events.filter(e => isSameDay(new Date(e.date), day));
          const inMonth = isSameMonth(day, date);
          const isSelected = isSameDay(day, date);
          const isTod = isToday(day);
          const overflow = dayEvents.length - MAX_VISIBLE_CHIPS;
          return (
            <div key={i}
              onClick={() => onSelectDay(day)} onDoubleClick={() => onClickCreate(day)}
              className={cn("min-h-[110px] p-1.5 border-b border-r border-border/30 cursor-pointer transition-colors hover:bg-muted/20 flex flex-col gap-1",
                !inMonth && "opacity-40", isSelected && "bg-primary/[0.06] ring-1 ring-inset ring-primary/40", (i + 1) % cols === 0 && "border-r-0")}>
              <span className={cn("self-start text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all",
                isTod && "bg-primary text-primary-foreground", isSelected && !isTod && "text-primary font-black", !isTod && !isSelected && "text-foreground/80")}>
                {format(day, "d")}
              </span>
              {dayEvents.slice(0, MAX_VISIBLE_CHIPS).map(e => (
                <EventChip key={e.id} event={e} allTypes={allTypes} onClick={() => onSelectEvent(e)} />
              ))}
              {overflow > 0 && (
                <button
                  data-testid={`month-more-${format(day, "yyyy-MM-dd")}`}
                  onClick={(e) => { e.stopPropagation(); setMoreDay(day); }}
                  className="text-[10px] text-primary font-bold pl-1.5 text-left hover:underline py-0.5"
                >
                  +{overflow} more
                </button>
              )}
            </div>
          );
        })}
      </div>

      {moreDay && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" role="dialog" aria-label={`Events on ${format(moreDay, "MMMM d")}`}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreDay(null)} data-testid="month-more-backdrop" />
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <p className="text-sm font-black text-foreground">{format(moreDay, "EEEE, MMMM d")}</p>
              <button onClick={() => setMoreDay(null)} aria-label="Close"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto overscroll-contain p-2" data-testid="month-more-list">
              {moreDayEvents.map(e => (
                <button key={e.id} onClick={() => { onSelectEvent(e); setMoreDay(null); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left">
                  <span className="text-[10px] font-bold text-muted-foreground tabular-nums shrink-0 w-16">
                    {format(new Date(e.date), "h:mm a")}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-semibold text-foreground truncate">{e.title}</span>
                    {e.location && <span className="block text-[10px] text-muted-foreground truncate">{e.location}</span>}
                  </span>
                </button>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-border/50">
              <button onClick={() => { onClickCreate(moreDay); setMoreDay(null); }}
                className="w-full text-xs font-bold py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                + New event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
