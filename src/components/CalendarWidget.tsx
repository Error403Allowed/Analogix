"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { eventStore } from "@/utils/eventStore";
import { AppEvent } from "@/types/events";
import { isSameDay } from "date-fns";
import ICSUploader from "./ICSUploader";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

import { Zap } from "lucide-react";

interface CalendarWidgetProps {
  streak?: number;
  streakLabel?: string;
}

const CalendarWidget = ({ streak = 0, streakLabel = "days" }: CalendarWidgetProps) => {
  const router = useRouter();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    const loadEvents = () => setEvents(eventStore.getAll());
    loadEvents();
    window.addEventListener("eventsUpdated", loadEvents);
    return () => window.removeEventListener("eventsUpdated", loadEvents);
  }, []);

  const selectedDayEvents = events.filter((e) => 
    date && isSameDay(new Date(e.date), date)
  );

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-muted-foreground font-black text-sm uppercase tracking-[0.2em]">
          Schedule
        </h3>
        <div className="flex gap-4">
          <button 
            onClick={() => router.push("/calendar")}
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all flex items-center gap-1.5"
          >
            Full View
          </button>
          <button 
            onClick={() => setShowUploader(!showUploader)}
            className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline hover:opacity-80 transition-all"
          >
            {showUploader ? "View Calendar" : "Import ICS"}
          </button>
          
        </div>
      </div>

      <AnimatePresence mode="wait">
        {showUploader ? (
          <motion.div
            key="uploader"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="min-h-[300px]"
          >
            <ICSUploader />
          </motion.div>
        ) : (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="glass-card p-6 flex flex-col bg-background/40"
          >
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-3xl border-0 p-0 w-full"
              classNames={{
                month: "space-y-6 w-full",
                head_row: "flex w-full mb-2",
                head_cell: "text-muted-foreground flex-1 text-center font-black text-[0.65rem] uppercase tracking-widest",
                row: "flex w-full mt-2 gap-1",
                cell: "flex-1 h-12 text-center text-xs p-0 relative focus-within:relative focus-within:z-20",
                day: cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-12 w-12 mx-auto p-0 font-bold aria-selected:opacity-100 rounded-2xl transition-all hover:bg-primary/10 hover:text-primary"
                ),
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-lg",
                day_today: "bg-muted text-foreground",
                caption_label: "text-sm font-black uppercase tracking-widest text-foreground",
                nav_button: cn(
                  buttonVariants({ variant: "outline" }),
                  "h-8 w-8 bg-background/50 p-0 opacity-70 hover:opacity-100 rounded-xl"
                ),
                table: "w-full border-collapse space-y-1",
              }}
              modifiers={{
                event: (date) => events.some((e) => isSameDay(new Date(e.date), date))
              }}
              modifiersClassNames={{
                event: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full"
              }}
            />
            
            <div className="mt-8 border-t border-border/10 pt-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                  Today's Events
                </h4>
                {selectedDayEvents.length > 0 && (
                   <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                     {selectedDayEvents.length} Event{selectedDayEvents.length > 1 ? 's' : ''}
                   </span>
                )}
              </div>
              <div className="space-y-3 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                {selectedDayEvents.length > 0 ? (
                  selectedDayEvents.map((event) => (
                    <div key={event.id} className="flex items-center gap-4 p-3 rounded-2xl bg-muted/20 border border-white/5 hover:bg-muted/30 transition-all cursor-pointer group">
                      <div className={`w-1 h-8 rounded-full shadow-sm transition-transform group-hover:scale-y-110 ${
                        event.type === 'exam' ? 'bg-destructive' : 'bg-primary'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground leading-tight truncate">{event.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate uppercase tracking-tighter">
                          {event.description || event.type}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-[10px] text-muted-foreground font-medium italic">
                      No events scheduled for this day.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarWidget;
