import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { eventStore } from "@/utils/eventStore";
import { AppEvent } from "@/types/events";
import { isSameDay } from "date-fns";
import ICSUploader from "./ICSUploader";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const CalendarWidget = () => {
  const navigate = useNavigate();
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
    <div className="h-full flex flex-col space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-muted-foreground font-black text-sm uppercase tracking-[0.2em]">
          Schedule
        </h3>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate("/calendar")}
            className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            Full View
          </button>
          <button 
            onClick={() => setShowUploader(!showUploader)}
            className="text-[10px] font-bold text-primary hover:underline"
          >
            {showUploader ? "View Calendar" : "Import ICS"}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {showUploader ? (
          <motion.div
            key="uploader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 min-h-0"
          >
            <ICSUploader />
          </motion.div>
        ) : (
          <motion.div
            key="calendar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass-card p-2 flex-1 min-h-0 flex flex-col"
          >
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border-0 p-2 w-full"
              classNames={{
                month: "space-y-4 w-full",
                head_row: "flex w-full",
                head_cell: "text-muted-foreground flex-1 text-center font-normal text-[0.7rem]",
                row: "flex w-full mt-2",
                cell: "flex-1 h-9 text-center text-xs p-0 relative focus-within:relative focus-within:z-20",
                day: cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-9 w-11 mx-auto p-0 font-normal aria-selected:opacity-100 rounded-full transition-all"
                ),
                caption_label: "text-xs font-semibold",
                nav_button: cn(
                  buttonVariants({ variant: "outline" }),
                  "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100"
                )
              }}
              modifiers={{
                event: (date) => events.some((e) => isSameDay(new Date(e.date), date))
              }}
              modifiersClassNames={{
                event: "bg-primary/10 font-bold text-primary decoration-wavy decoration-primary"
              }}
            />
            
            <div className="mt-3 border-t border-border pt-3 flex-1 min-h-0 flex flex-col">
              <h4 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">
                Today's Events
              </h4>
              <div className="space-y-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {selectedDayEvents.length > 0 ? (
                  selectedDayEvents.map((event) => (
                    <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className={`w-1.5 h-8 rounded-full ${
                        event.type === 'exam' ? 'bg-destructive' : 'bg-primary'
                      }`} />
                      <div>
                        <p className="text-sm font-semibold text-foreground leading-none">{event.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 truncate max-w-[200px]">
                          {event.description || event.type}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-2">
                    No events scheduled for this day.
                  </p>
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
