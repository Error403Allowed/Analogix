"use client";
import {
  startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth,
  isSameMonth, isSameDay, isToday, format,
} from "date-fns";
import { cn } from "@/lib/utils";
import type { AppEvent } from "@/types/events";
import { EventChip } from "./EventChip";

export function MonthView({ date, events, allTypes, onSelectDay, onSelectEvent, onClickCreate }: {
  date: Date; events: AppEvent[]; allTypes: Record<string,{color:string;label:string;icon:string}>;
  onSelectDay: (d: Date) => void; onSelectEvent: (e: AppEvent) => void;
  onClickCreate: (d: Date) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(date), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(date), { weekStartsOn: 1 }),
  });
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border/50">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
          <div key={d} className="py-2.5 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1 overflow-auto">
        {days.map((day, i) => {
          const dayEvents = events.filter(e => isSameDay(new Date(e.date), day));
          const inMonth = isSameMonth(day, date);
          const isSelected = isSameDay(day, date);
          const isTod = isToday(day);
          return (
            <div key={i}
              onClick={() => onSelectDay(day)} onDoubleClick={() => onClickCreate(day)}
              className={cn("min-h-[110px] p-1.5 border-b border-r border-border/30 cursor-pointer transition-colors hover:bg-muted/20 flex flex-col gap-1",
                !inMonth && "opacity-30", isSelected && "bg-primary/4 ring-1 ring-inset ring-primary/30", (i + 1) % 7 === 0 && "border-r-0")}>
              <span className={cn("self-start text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all",
                isTod && "bg-primary text-primary-foreground", isSelected && !isTod && "text-primary font-black", !isTod && !isSelected && "text-foreground/80")}>
                {format(day, "d")}
              </span>
              {dayEvents.slice(0, 3).map(e => (
                <EventChip key={e.id} event={e} allTypes={allTypes} onClick={() => onSelectEvent(e)} />
              ))}
              {dayEvents.length > 3 && <span className="text-[8px] text-muted-foreground/60 font-semibold pl-1.5">+{dayEvents.length - 3} more</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
