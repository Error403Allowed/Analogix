"use client";
import { isSameDay, isToday, format } from "date-fns";
import { cn } from "@/lib/utils";
import type { AppEvent } from "@/types/events";
import { EventChip } from "./EventChip";

export function WeekGridView({ days, events, allTypes, onSelectDay, onSelectEvent, onClickCreate }: {
  days: Date[]; events: AppEvent[]; allTypes: Record<string,{color:string;label:string;icon:string}>;
  onSelectDay: (d: Date) => void; onSelectEvent: (e: AppEvent) => void;
  onClickCreate: (d: Date) => void;
}) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="grid grid-cols-7 flex-1 overflow-auto">
        {days.map((day, i) => {
          const dayEvents = events.filter(e => isSameDay(new Date(e.date), day));
          const isTod = isToday(day);
          return (
            <div key={i}
              onClick={() => onSelectDay(day)} onDoubleClick={() => onClickCreate(day)}
              className={cn("min-h-[200px] p-1.5 border-b border-r border-border/30 cursor-pointer transition-colors hover:bg-muted/20 flex flex-col gap-1",
                isTod && "bg-primary/4 ring-1 ring-inset ring-primary/30", (i + 1) % 7 === 0 && "border-r-0")}>
              <span className={cn("self-start text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all",
                isTod ? "bg-primary text-primary-foreground" : "text-foreground/80")}>
                {format(day, "d")}
              </span>
              {dayEvents.slice(0, 6).map(e => (
                <EventChip key={e.id} event={e} allTypes={allTypes} onClick={() => onSelectEvent(e)} />
              ))}
              {dayEvents.length > 6 && (
                <span className="text-[8px] text-muted-foreground/60 font-semibold pl-1.5">+{dayEvents.length - 6} more</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
