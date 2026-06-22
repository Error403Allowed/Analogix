"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Plus } from "lucide-react";
import { format, isToday, isTomorrow, differenceInCalendarDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type CalendarEvent = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
};

const label = (date: Date) => {
  if (isToday(date))    return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  const diff = differenceInCalendarDays(date, new Date());
  if (diff <= 7)        return `${format(date, "EEE")}`;
  return format(date, "d MMM");
};

const dot = "bg-primary";

export default function UpcomingEvents() {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const supabase = createClient();
      const now = new Date().toISOString();
      const limit = addDays(new Date(), 30).toISOString();
      const { data } = await supabase
        .from("events")
        .select("id, title, start_at, end_at")
        .gte("start_at", now)
        .lte("start_at", limit)
        .order("start_at", { ascending: true })
        .limit(6);
      setEvents(data || []);
    };
    fetchEvents();
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
                  {label(new Date(e.start_at))}
                </p>
                <p className="text-[9px] font-bold text-muted-foreground/60 tabular-nums leading-tight">
                  {format(new Date(e.start_at), "h:mma").toLowerCase()}
                </p>
              </div>

              {/* Colour bar */}
              <div className={cn("w-0.5 self-stretch rounded-full shrink-0", dot)} />

              {/* Title */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-foreground truncate leading-tight">{e.title}</p>
                <p className="text-[9px] text-muted-foreground/50 truncate">
                  Ends {format(new Date(e.end_at), "h:mma").toLowerCase()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
