"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Plus, X } from "lucide-react";
import { eventStore } from "@/utils/eventStore";
import { AppEvent } from "@/types/events";
import { format, isToday, isTomorrow, differenceInCalendarDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";

const label = (date: Date) => {
  if (isToday(date))    return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  const diff = differenceInCalendarDays(date, new Date());
  if (diff <= 7)        return `${format(date, "EEE")}`;
  return format(date, "d MMM");
};

const dot = (type: AppEvent["type"]) =>
  type === "exam"       ? "bg-destructive"  :
  type === "assignment" ? "bg-amber-500"    :
                          "bg-primary";

export default function UpcomingEvents() {
  const router = useRouter();
  const [events, setEvents] = useState<AppEvent[]>([]);

  useEffect(() => {
    const load = () =>
      eventStore.getAll().then(all => {
        const now   = new Date();
        const limit = addDays(now, 30);
        setEvents(
          all
            .filter(e => new Date(e.date) >= now && new Date(e.date) <= limit)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 6)
        );
      });
    load();
    window.addEventListener("eventsUpdated", load);
    return () => window.removeEventListener("eventsUpdated", load);
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Upcoming
          </span>
        </div>
        <button
          onClick={() => router.push("/calendar")}
          className="text-[10px] font-bold text-primary/70 hover:text-primary transition-colors"
        >
          Full view →
        </button>
      </div>

      {/* Event list */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-4">
            <p className="text-xs text-muted-foreground/40">No upcoming events</p>
            <button
              onClick={() => router.push("/calendar")}
              className="mt-2 flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary transition-colors"
            >
              <Plus className="w-3 h-3" /> Add one
            </button>
          </div>
        ) : (
          events.map(e => (
            <div
              key={e.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors group"
            >
              {/* Date badge */}
              <div className="shrink-0 text-right w-[3.8rem]">
                <p className="text-[8px] font-black uppercase text-muted-foreground/50 leading-none tracking-wider">
                  {label(new Date(e.date))}
                </p>
                <p className="text-[9px] font-bold text-muted-foreground/60 tabular-nums leading-tight">
                  {format(new Date(e.date), "h:mma").toLowerCase()}
                </p>
              </div>

              {/* Colour bar */}
              <div className={cn("w-0.5 self-stretch rounded-full shrink-0", dot(e.type))} />

              {/* Title */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-foreground truncate leading-tight">{e.title}</p>
                {e.subject && (
                  <p className="text-[9px] text-muted-foreground/50 truncate">{e.subject}</p>
                )}
              </div>

              {/* Delete on hover */}
              <button
                onClick={() => eventStore.remove(e.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/30 hover:text-destructive shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
