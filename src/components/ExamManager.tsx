import { useState, useEffect } from "react";
import { Plus, X, Calendar, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { eventStore } from "@/utils/eventStore";
import { AppEvent } from "@/types/events";

const ExamManager = () => {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newType, setNewType] = useState<"exam" | "event" | "assignment">("exam");

  const userPrefs =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("userPreferences") || "{}")
      : {};
  const subjects = userPrefs.subjects || ["General"];

  useEffect(() => {
    const loadEvents = () => {
      eventStore.getAll().then(allEvents => {
        const academicKeywords = ["exam", "assessment", "quiz", "test", "midterm", "final", "assignment", "project", "deadline", "paper", "presentation", "lab", "due"];
        const upcoming = allEvents
          .filter(e => {
            const isFuture = new Date(e.date).setHours(0,0,0,0) >= new Date().setHours(0,0,0,0);
            const combined = (e.title + " " + (e.description || "")).toLowerCase();
            const hasKeyword = academicKeywords.some(kw => combined.includes(kw));
            const isAcademicType = e.type === 'exam' || e.type === 'assignment';
            const isManual = e.source === 'manual';
            return isFuture && (hasKeyword || isAcademicType || isManual);
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 5);
        setEvents(upcoming);
      });
    };
    loadEvents();
    window.addEventListener("eventsUpdated", loadEvents);
    return () => window.removeEventListener("eventsUpdated", loadEvents);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newDate) {
      toast.error("Please fill in name and date");
      return;
    }

    const event: AppEvent = {
      id: Date.now().toString(),
      title: newName,
      subject: newSubject || (newType === "event" ? "General" : subjects[0]),
      date: new Date(newDate),
      type: newType,
      source: "manual"
    };

    eventStore.add(event);
    setIsAdding(false);
    setNewName(""); setNewSubject(""); setNewDate(""); setNewType("exam");
    toast.success("Added to your schedule!");
  };

  const handleDelete = (id: string) => {
    eventStore.remove(id);
    toast.success("Event removed");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          Deadlines
        </h2>
        <Button size="sm" variant="ghost" className="text-primary gap-1 font-bold" onClick={() => setIsAdding(true)}>
          <Plus className="w-6 h-4" /> Add
        </Button>
      </div>

      {isAdding && (
        <div className="glass-card p-4 space-y-4 relative border-primary/20 shadow-xl bg-background/80 backdrop-blur-xl">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 h-8 w-8 rounded-full" 
            onClick={() => setIsAdding(false)}
          >
            <X className="w-4 h-4" />
          </Button>
          
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">Title</label>
              <Input 
                placeholder="Ex: History Exam, Pizza Night..." 
                value={newName} 
                onChange={e => setNewName(e.target.value)}
                className="h-9 text-sm glass font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">Type</label>
                <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                  <SelectTrigger className="h-9 text-sm glass">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                    <SelectItem value="event">General Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">Subject</label>
                <Select value={newSubject} onValueChange={setNewSubject}>
                  <SelectTrigger className="h-9 text-sm glass">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    {subjects.map((s: string) => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">Date</label>
              <Input 
                type="date" 
                value={newDate} 
                onChange={e => setNewDate(e.target.value)}
                className="h-9 text-sm glass"
              />
            </div>
          </div>

          <Button className="w-full h-10 gradient-primary font-bold shadow-lg" onClick={handleSubmit}>
            Save to Schedule
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className={`relative group flex items-start gap-3 glass p-3 rounded-2xl border-l-4 transition-all hover:bg-muted/20 ${
            event.type === 'exam' ? 'border-l-primary' : 
            event.type === 'assignment' ? 'border-l-accent' : 
            'border-l-secondary'
          }`}>
             <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-foreground leading-none">{event.title}</p>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide shadow-sm ${
                    event.type === 'exam' ? 'bg-primary text-primary-foreground' : 
                    event.type === 'assignment' ? 'bg-accent text-accent-foreground' : 
                    'bg-secondary text-secondary-foreground'
                  }`}>
                    {event.type}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-bold">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  {event.subject !== 'General' && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {event.subject}</span>}
                </div>
             </div>
             <Button 
               variant="ghost" 
               size="icon" 
               className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive rounded-full" 
               onClick={() => handleDelete(event.id)}
             >
               <X className="w-4 h-4" />
             </Button>
          </div>
        ))}
        {events.length === 0 && !isAdding && (
          <div className="text-center py-8 glass-card border-dashed border-2">
            <Calendar className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-bold text-muted-foreground">You've got nothing apparently.</p>
            <p className="text-xs text-muted-foreground/60">Enjoy your freedom!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamManager;
