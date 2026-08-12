"use client";
import { motion } from "framer-motion";
import { Clock, Tag, CalendarDays, X } from "lucide-react";
import { format, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import type { AppEvent } from "@/types/events";
import { getTypeMeta } from "../storage";

export function ScheduleView({ events, allTypes, onSelectEvent, onDelete }: {
  events: AppEvent[]; allTypes: Record<string,{color:string;label:string;icon:string}>;
  onSelectEvent: (e: AppEvent) => void; onDelete: (id: string) => void;
}) {
  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const byDate = sorted.reduce((acc, e) => {
    const key = format(new Date(e.date), "yyyy-MM-dd");
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {} as Record<string, AppEvent[]>);

  if (sorted.length === 0) {
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
    <div className="flex-1 overflow-y-auto">
      {Object.entries(byDate).map(([dateKey, dayEvents]) => {
        const d = new Date(dateKey);
        const isTod = isToday(d);
        return (
          <div key={dateKey} className="flex">
            <div className="w-[110px] shrink-0 sticky top-0 self-start pt-5 pl-4 pr-3">
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
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0">
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
