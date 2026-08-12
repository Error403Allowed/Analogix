"use client";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths,
  isSameMonth, isSameDay, isToday, format,
  startOfMonth, endOfMonth,
} from "date-fns";
import { cn } from "@/lib/utils";
import type { AppEvent } from "@/types/events";

export function MiniCalendar({ date, events, onSelect }: { date: Date; events: AppEvent[]; onSelect: (d: Date) => void }) {
  const [navDate, setNavDate] = useState(date);
  useEffect(() => setNavDate(date), [date]);
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(navDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(navDate), { weekStartsOn: 1 }),
  });
  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/70">{format(navDate, "MMMM yyyy")}</span>
        <div className="flex gap-1">
          <button onClick={() => setNavDate(subMonths(navDate, 1))} className="w-5 h-5 rounded flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><ChevronLeft className="w-3 h-3" /></button>
          <button onClick={() => setNavDate(addMonths(navDate, 1))} className="w-5 h-5 rounded flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><ChevronRight className="w-3 h-3" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {["M","T","W","T","F","S","S"].map((d, i) => <div key={i} className="text-center text-[9px] font-bold text-muted-foreground/60 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day, i) => {
          const inMonth = isSameMonth(day, navDate);
          const isSelected = isSameDay(day, date);
          const isTod = isToday(day);
          const hasEvents = events.some(e => isSameDay(new Date(e.date), day));
          return (
            <button key={i} onClick={() => onSelect(day)}
              className={cn("w-full aspect-square flex flex-col items-center justify-center rounded-full text-[10px] font-semibold transition-all relative",
                !inMonth && "opacity-25", isSelected && "bg-primary text-primary-foreground",
                isTod && !isSelected && "text-primary font-black ring-1 ring-primary/30",
                !isSelected && inMonth && "hover:bg-muted text-foreground")}>
              {format(day, "d")}
              {hasEvents && !isSelected && <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary/60" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
