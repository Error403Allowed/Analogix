"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar as CalendarIcon, Upload, FileUp, X, Clock, MapPin, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, startOfMonth, endOfMonth, isSameMonth, isSameDay, format } from "date-fns";
import ICSUploader from "@/components/ICSUploader";
import TypewriterText from "@/components/TypewriterText";
import { cn } from "@/lib/utils";
import { eventStore } from "@/utils/eventStore";
import { AppEvent } from "@/types/events";

type CalendarView = 'day' | 'week' | 'month' | 'term';

const TERMS = [
  { id: 1, label: "Term 1", start: new Date(2026, 0, 27), end: new Date(2026, 3, 10) },
  { id: 2, label: "Term 2", start: new Date(2026, 3, 27), end: new Date(2026, 6, 3) },
  { id: 3, label: "Term 3", start: new Date(2026, 6, 20), end: new Date(2026, 8, 25) },
  { id: 4, label: "Term 4", start: new Date(2026, 9, 12), end: new Date(2026, 11, 18) },
];

const getTermInfo = (date: Date) => {
  const term = TERMS.find(t => date >= t.start && date <= t.end);
  if (!term) return null;
  const daysDiff = Math.floor((date.getTime() - term.start.getTime()) / (1000 * 60 * 60 * 24));
  const weekNum = Math.floor(daysDiff / 7) + 1;
  return { ...term, weekNum };
};

const CalendarPage = () => {
  const router = useRouter();
  const [date, setDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [view, setView] = useState<CalendarView>('month');

  const renderEventCard = (event: AppEvent) => (
    <motion.div
      key={event.id}
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-card p-6 border-l-8 border-l-primary/40 flex flex-col md:flex-row md:items-center justify-between gap-6"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
           <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
             event.type === 'exam' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
           }`}>
             {event.type}
           </span>
           {event.subject && (
             <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
               <Tag className="w-3 h-3" />
               {event.subject}
             </span>
           )}
        </div>
        <h3 className="text-xl font-bold text-foreground">{event.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          {event.description || "No additional details provided."}
        </p>
      </div>

      <div className="flex items-center gap-4 text-muted-foreground shrink-0 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
         <div className="flex flex-col items-center min-w-[60px]">
            <Clock className="w-4 h-4 mb-2 text-primary/60" />
            <span className="text-xs font-black text-foreground">
              {format(new Date(event.date), 'h:mm a')}
            </span>
         </div>
         <Button 
           variant="ghost" 
           size="icon" 
           className="text-muted-foreground hover:text-destructive"
           onClick={() => {
             if(confirm("Delete this event?")) eventStore.remove(event.id);
           }}
         >
           <X className="w-4 h-4" />
         </Button>
      </div>
    </motion.div>
  );

  const renderNoEvents = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-card p-12 text-center border-dashed"
    >
       <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-muted-foreground opacity-20" />
       </div>
       <h3 className="text-lg font-bold text-foreground mb-2">No plans yet!</h3>
       <p className="text-muted-foreground max-w-xs mx-auto">
          There are no exams or events scheduled for this time. Relax or add something new!
       </p>
    </motion.div>
  );

  const userPrefs =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("userPreferences") || "{}")
      : {};
  const userName = userPrefs.name || "Student";

  useEffect(() => {
    const loadEvents = () => setEvents(eventStore.getAll());
    loadEvents();
    window.addEventListener("eventsUpdated", loadEvents);
    return () => window.removeEventListener("eventsUpdated", loadEvents);
  }, []);

  const selectedDayEvents = events.filter((e) => 
    date && isSameDay(new Date(e.date), date)
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="min-h-screen pb-12 relative overflow-hidden">
      <div className="liquid-blob w-[500px] h-[500px] bg-primary/20 -top-48 -left-48 fixed blur-3xl opacity-10" />
      <div className="liquid-blob w-[400px] h-[400px] bg-accent/20 bottom-20 right-10 fixed blur-3xl opacity-10" style={{ animationDelay: "-3s" }} />
      
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 relative z-10">
        {/* Header removed as it is in DashLayout */}

        <div className="mb-8">
           <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-primary gap-2" onClick={() => router.push("/dashboard")}>
             <ArrowLeft className="w-4 h-4" /> Back to Dashboard
           </Button>

            <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
              <div>
                <h1 className="text-4xl font-black text-foreground mb-2 flex items-center gap-3">
                  <CalendarIcon className="w-8 h-8 text-primary" />
                  <TypewriterText text="Calendar" delay={120} />
                </h1>
                <p className="text-muted-foreground">Term {getTermInfo(date)?.id || "?"} • Week {getTermInfo(date)?.weekNum || "?"}</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <div className="flex bg-muted/50 p-1 rounded-2xl border border-border/50 mr-2">
                  {(['day', 'week', 'month', 'term'] as CalendarView[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={cn(
                        "px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                        view === v ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  className="gap-2 rounded-2xl glass"
                  onClick={() => setShowUploader(!showUploader)}
                >
                  <Upload className="w-4 h-4" />
                  {showUploader ? "View Calendar" : "Import"}
                </Button>
              </div>
            </div>

           <div className="grid grid-cols-1 gap-8">
              {showUploader ? (
                <div className="max-w-xl mx-auto w-full">
                  <ICSUploader />
                </div>
              ) : (
                <div className="space-y-6">
                  {view === 'month' && (
                    <div className="grid grid-cols-12 gap-8">
                      {/* Original Month View */}
                      <div className="col-span-12 lg:col-span-4">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(d) => d && setDate(d)}
                          className="rounded-xl border-none p-0 scale-105 origin-top"
                          modifiers={{
                            event: (date) => events.some((e) => isSameDay(new Date(e.date), date))
                          }}
                          modifiersClassNames={{
                            event: "bg-primary/10 font-bold text-primary relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full"
                          }}
                        />
                      </div>
                      <div className="col-span-12 lg:col-span-8 space-y-4">
                        <div className="flex items-center justify-between mb-4">
                           <h2 className="text-2xl font-black text-foreground">{format(date, 'MMMM do, yyyy')}</h2>
                           <div className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
                             {selectedDayEvents.length} Events
                           </div>
                        </div>
                        {selectedDayEvents.length > 0 ? (
                           selectedDayEvents.map(renderEventCard)
                        ) : (
                           renderNoEvents()
                        )}
                      </div>
                    </div>
                  )}

                  {view === 'week' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-7 gap-4">
                        {eachDayOfInterval({
                          start: startOfWeek(date, { weekStartsOn: 1 }),
                          end: endOfWeek(date, { weekStartsOn: 1 })
                        }).map((day) => {
                          const dayEvents = events.filter(e => isSameDay(new Date(e.date), day));
                          const isToday = isSameDay(day, new Date());
                          const isSelected = isSameDay(day, date);
                          
                          return (
                            <div 
                              key={day.toISOString()} 
                              className={cn(
                                "glass-card p-4 min-h-[300px] flex flex-col cursor-pointer transition-all",
                                isSelected ? "ring-2 ring-primary" : "hover:border-primary/30",
                                isToday && "bg-primary/5"
                              )}
                              onClick={() => setDate(day)}
                            >
                              <div className="text-center mb-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{format(day, 'EEE')}</p>
                                <p className={cn("text-2xl font-black", isToday ? "text-primary" : "text-foreground")}>{format(day, 'd')}</p>
                              </div>
                              <div className="flex-1 space-y-2">
                                {dayEvents.map(e => (
                                  <div key={e.id} className="text-[10px] p-2 rounded-lg bg-primary/10 border border-primary/20 line-clamp-2">
                                    <span className="font-black block uppercase tracking-tighter">{format(new Date(e.date), 'h:mm a')}</span>
                                    {e.title}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {view === 'day' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                       <div className="text-center mb-8">
                          <h2 className="text-4xl font-black text-foreground mb-2">{format(date, 'EEEE, MMMM do')}</h2>
                          <p className="text-muted-foreground font-medium uppercase tracking-[0.2em]">Daily Schedule</p>
                       </div>
                       <div className="space-y-4">
                          {selectedDayEvents.length > 0 ? (
                            selectedDayEvents.map(renderEventCard)
                          ) : (
                            renderNoEvents()
                          )}
                       </div>
                    </div>
                  )}

                  {view === 'term' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {TERMS.map(term => {
                         const currentTerm = getTermInfo(date);
                         const isCurrent = currentTerm?.id === term.id;

                         return (
                           <div key={term.id} className={cn("glass-card p-6 border-t-4", isCurrent ? "border-t-primary" : "border-t-muted")}>
                              <div className="flex items-center justify-between mb-4">
                                 <div>
                                    <h3 className="text-xl font-black text-foreground">{term.label}</h3>
                                    <p className="text-xs text-muted-foreground">{format(term.start, 'MMM d')} - {format(term.end, 'MMM d')}</p>
                                 </div>
                                 {isCurrent && <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Active</span>}
                              </div>
                              <div className="grid grid-cols-5 gap-2">
                                 {Array.from({ length: 10 }).map((_, i) => (
                                   <div key={i} className="aspect-square rounded-xl bg-muted/30 border border-border/50 flex items-center justify-center text-[10px] font-black text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer">
                                      W{i+1}
                                   </div>
                                 ))}
                              </div>
                           </div>
                         );
                       })}
                    </div>
                  )}
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
