import { useState, useEffect } from "react";
import { Plus, X, Calendar } from "lucide-react";
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

  const userPrefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
  const subjects = userPrefs.subjects || ["General"];

  useEffect(() => {
    const loadEvents = () => {
      const allEvents = eventStore.getAll();
      const academicKeywords = ["exam", "assessment", "quiz", "test", "midterm", "final", "assignment", "project", "deadline", "paper", "presentation", "lab"];
      
      // Filter for future academic events
      const upcoming = allEvents
        .filter(e => {
          const isFuture = new Date(e.date).setHours(0,0,0,0) >= new Date().setHours(0,0,0,0);
          const hasKeyword = academicKeywords.some(keyword => 
            e.title.toLowerCase().includes(keyword) || 
            (e.description && e.description.toLowerCase().includes(keyword))
          );
          const isExamType = e.type === 'exam';
          return isFuture && (hasKeyword || isExamType);
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3); // Show top 3
      setEvents(upcoming);
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
      subject: newSubject || "General",
      date: new Date(newDate),
      type: "exam",
      source: "manual"
    };

    eventStore.add(event);
    setIsAdding(false);
    setNewName("");
    setNewSubject("");
    setNewDate("");
    toast.success("Added to your schedule!");
  };

  const handleDelete = (id: string) => {
    eventStore.remove(id);
    toast.success("Event removed");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          📅 Upcoming
        </h2>
        <Button size="sm" variant="ghost" className="text-primary gap-1" onClick={() => setIsAdding(true)}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      {isAdding && (
        <div className="glass-card p-4 space-y-3 relative border-primary/20">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 h-6 w-6" 
            onClick={() => setIsAdding(false)}
          >
            <X className="w-3 h-3" />
          </Button>
          <div className="space-y-2">
            <Input 
              placeholder="Assessment Name" 
              value={newName} 
              onChange={e => setNewName(e.target.value)}
              className="h-8 text-xs glass"
            />
            <Select value={newSubject} onValueChange={setNewSubject}>
               <SelectTrigger className="h-8 text-xs glass w-full">
                 <SelectValue placeholder="Select Subject" />
               </SelectTrigger>
               <SelectContent>
                 {subjects.map((s: string) => (
                   <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                 ))}
               </SelectContent>
            </Select>
            <Input 
              type="date" 
              value={newDate} 
              onChange={e => setNewDate(e.target.value)}
              className="h-8 text-xs glass"
            />
          </div>
          <Button size="sm" className="w-full gradient-primary" onClick={handleSubmit}>
            Save
          </Button>
        </div>
      )}

      <div className="space-y-3 mt-4">
        {events.map((event) => (
          <div key={event.id} className="relative group flex items-center gap-3 glass p-3 rounded-xl border-l-4 border-l-primary/50">
             <div className="flex-1">
                <p className="font-bold text-sm text-foreground">{event.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(event.date).toLocaleDateString()} • {event.subject}</p>
             </div>
             <Button 
               variant="ghost" 
               size="icon" 
               className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" 
               onClick={() => handleDelete(event.id)}
             >
               <X className="w-3 h-3" />
             </Button>
          </div>
        ))}
        {events.length === 0 && !isAdding && (
          <div className="text-center py-6 glass-card border-dashed">
            <p className="text-xs text-muted-foreground">No upcoming exams.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamManager;
