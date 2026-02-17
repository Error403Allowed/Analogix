"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save, 
  FileText, 
  TrendingUp, 
  History,
  GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SUBJECT_CATALOG, SubjectId } from "@/constants/subjects";
import { subjectStore, SubjectMark } from "@/utils/subjectStore";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SubjectDetail() {
  const params = useParams();
  const router = useRouter();
  const subjectId = (params?.id as string) || "";
  const subject = SUBJECT_CATALOG.find((s) => s.id === subjectId);

  const [data, setData] = useState(subjectStore.getSubject(subjectId));
  const [newMark, setNewMark] = useState({ title: "", score: "", total: "" });
  const [notes, setNotes] = useState(data.notes.content);

  useEffect(() => {
    setNotes(data.notes.content);
  }, [data.notes.content]);

  if (!subject) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <GraduationCap className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-black text-foreground mb-2">Subject not found</h2>
        <Button onClick={() => router.push("/subjects")}>Go back to subjects</Button>
      </div>
    );
  }

  const handleAddMark = () => {
    if (!newMark.title || !newMark.score || !newMark.total) {
      toast.error("Please fill in all fields");
      return;
    }
    const score = parseFloat(newMark.score);
    const total = parseFloat(newMark.total);
    if (isNaN(score) || isNaN(total)) {
      toast.error("Marks must be numbers");
      return;
    }

    subjectStore.addMark(subjectId, {
      title: newMark.title,
      score,
      total,
      date: new Date().toISOString()
    });
    
    setData(subjectStore.getSubject(subjectId));
    setNewMark({ title: "", score: "", total: "" });
    toast.success("Mark added successfully!");
  };

  const handleSaveNotes = () => {
    subjectStore.updateNotes(subjectId, notes);
    toast.success("Notes saved!");
  };

  const Icon = subject.icon;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={() => router.push("/subjects")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground shadow-lg shrink-0">
               <Icon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-foreground tracking-tight">{subject.label}</h1>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Subject Overview</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Notes & History */}
        <div className="lg:col-span-2 space-y-8">
          {/* Notes Section */}
          <section className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
               <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                 <FileText className="w-5 h-5 text-primary" />
                 Subject Notes
               </h3>
               <Button size="sm" onClick={handleSaveNotes} className="gradient-primary">
                 <Save className="w-4 h-4 mr-2" />
                 Save
               </Button>
            </div>
            <Textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Jot down formulas, concepts, or reminders here..."
              className="min-h-[400px] bg-muted/30 border-none rounded-2xl focus:ring-2 focus:ring-primary/50 text-base leading-relaxed"
            />
          </section>

          {/* Analogy History (Placeholder for now) */}
          <section className="glass-card p-6 space-y-4 opacity-75">
             <h3 className="text-lg font-black text-foreground flex items-center gap-2">
               <History className="w-5 h-5 text-primary" />
               Analogy History
             </h3>
             <div className="p-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-2xl">
                Coming soon: View your past conversations and key analogies for {subject.label}.
             </div>
          </section>
        </div>

        {/* Right Column: Marks & Performance */}
        <div className="space-y-8">
           <section className="glass-card p-6 space-y-6">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Assessment Tracker
              </h3>

              <div className="space-y-4">
                <AnimatePresence>
                  {data.marks.map((mark) => (
                    <motion.div 
                      key={mark.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-foreground">{mark.title}</p>
                        <p className="text-xs text-muted-foreground">{new Date(mark.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-primary">{mark.score}/{mark.total}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{Math.round((mark.score/mark.total)*100)}%</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <div className="p-4 rounded-2xl border-2 border-dashed border-border space-y-4">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest text-center">Add assessment</p>
                    <div className="space-y-3">
                        <Input 
                          placeholder="Exam, Essay, Quiz..." 
                          value={newMark.title}
                          onChange={(e) => setNewMark({...newMark, title: e.target.value})}
                          className="bg-background/50 h-9 text-xs"
                        />
                        <div className="flex gap-2">
                            <Input 
                              placeholder="Score" 
                              type="number"
                              value={newMark.score}
                              onChange={(e) => setNewMark({...newMark, score: e.target.value})}
                              className="bg-background/50 h-9 text-xs"
                            />
                            <Input 
                              placeholder="Total" 
                              type="number"
                              value={newMark.total}
                              onChange={(e) => setNewMark({...newMark, total: e.target.value})}
                              className="bg-background/50 h-9 text-xs"
                            />
                        </div>
                        <Button 
                          onClick={handleAddMark}
                          className="w-full gradient-primary h-9 text-xs font-bold"
                        >
                          Add Mark
                        </Button>
                    </div>
                </div>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
}
