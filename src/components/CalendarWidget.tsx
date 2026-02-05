import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { eventStore } from "@/utils/eventStore";
import { AppEvent } from "@/types/events";
import { isSameDay, parseISO } from "date-fns";
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
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
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
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <ICSUploader />
          </motion.div>
        ) : (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass-card p-3"
          >
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border-0"
              modifiers={{
                event: (date) => events.some((e) => isSameDay(new Date(e.date), date))
              }}
              modifiersClassNames={{
                event: "bg-primary/10 font-bold text-primary decoration-wavy decoration-primary"
              }}
            />
            
            <div className="mt-4 border-t border-border pt-4">
              <h4 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">
                Upcoming Events
              </h4>
              <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                {selectedDayEvents.length > 0 ? (
                  selectedDayEvents.map((event) => (
                    <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className={`w-1.5 h-8 rounded-full ${
                        event.type === 'exam' ? 'bg-destructive' : 'bg-primary'
                      }`} />
                      <div>
                        <p className="text-sm font-semibold text-foreground leading-none">{event.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 truncate max-w-[180px]">
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
