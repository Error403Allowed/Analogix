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
  GraduationCap,
  Sparkles,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SUBJECT_CATALOG, SubjectId } from "@/constants/subjects";
import { subjectStore, SubjectMark, SubjectData } from "@/utils/subjectStore";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SubjectDetail() {
  const params = useParams();
  const router = useRouter();
  const subjectId = (params?.id as string) || "";
  const subject = SUBJECT_CATALOG.find((s) => s.id === subjectId);

  const emptyData: SubjectData = { id: subjectId, marks: [], notes: { content: "", lastUpdated: new Date().toISOString() } };
  const [data, setData] = useState<SubjectData>(emptyData);
  const [newMark, setNewMark] = useState({ title: "", score: "", total: "" });
  const [notes, setNotes] = useState("");

  // Load data async on mount
  useEffect(() => {
    subjectStore.getSubject(subjectId).then(d => {
      setData(d);
      setNotes(d.notes.content);
    });
    const handler = () => subjectStore.getSubject(subjectId).then(setData);
    window.addEventListener("subjectDataUpdated", handler);
    return () => window.removeEventListener("subjectDataUpdated", handler);
  }, [subjectId]);

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

  const handleAddMark = async () => {
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

    await subjectStore.addMark(subjectId, {
      title: newMark.title,
      score,
      total,
      date: new Date().toISOString()
    });
    const updated = await subjectStore.getSubject(subjectId);
    setData(updated);
    setNewMark({ title: "", score: "", total: "" });
    toast.success("Mark added successfully!");
  };

  const handleSaveNotes = () => {
    subjectStore.updateNotes(subjectId, notes);
    toast.success("Notes saved!");
  };

  const Icon = subject.icon;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto space-y-8"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={() => router.push("/subjects")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground shadow-xl shrink-0"
            >
               <Icon className="w-7 h-7" />
            </motion.div>
            <div>
              <h1 className="text-4xl font-black text-foreground tracking-tight">{subject.label}</h1>
              <p className="text-xs text-muted-foreground font-black uppercase tracking-[0.3em]">Mastery Dashboard</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Notes & History */}
        <div className="lg:col-span-2 space-y-8">
          {/* Notes Section */}
          <motion.section variants={item} className="glass-card p-8 space-y-6">
            <div className="flex items-center justify-between">
               <h3 className="text-xl font-black text-foreground flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                   <FileText className="w-5 h-5 text-primary" />
                 </div>
                 Notes & Key Insights
               </h3>
               <Button size="sm" onClick={handleSaveNotes} className="gradient-primary px-6 rounded-full shadow-lg shadow-primary/20">
                 <Save className="w-4 h-4 mr-2" />
                 Save
               </Button>
            </div>
            <Textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Jot down formulas, concepts, or reminders here..."
              className="min-h-[450px] bg-muted/20 border-border/50 rounded-[2rem] focus-visible:ring-primary/20 p-6 text-base leading-relaxed resize-none shadow-inner"
            />
          </motion.section>

          {/* Analogy History (Premium) */}
          <motion.section variants={item} className="glass-card p-8 space-y-6 group relative overflow-hidden">
             <div className="absolute top-6 right-8">
               <div className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20 flex items-center gap-1.5">
                 <Zap className="w-3 h-3 fill-primary" />
                 Analogix Plus
               </div>
             </div>
             <h3 className="text-xl font-black text-foreground flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                 <History className="w-5 h-5 text-primary" />
               </div>
               Analogy History & Database
             </h3>
             <div className="p-16 text-center text-muted-foreground border-2 border-dashed border-border rounded-[2rem] bg-muted/5 group-hover:border-primary/20 transition-all relative overflow-hidden">
                <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-8">
                   <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Zap className="w-6 h-6 text-primary" />
                   </div>
                   <p className="font-bold text-foreground mb-1 uppercase tracking-wider">Premium Capability</p>
                   <p className="text-sm max-w-xs mx-auto text-muted-foreground">Long-term analogy memory and database syncing are exclusive to <b>Analogix Plus</b> subscribers.</p>
                   <Button variant="outline" size="sm" className="mt-6 rounded-full border-primary/20 hover:bg-primary/5 text-xs font-bold">
                     Upgrade for History
                   </Button>
                </div>
                <div className="opacity-20 blur-sm">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                     <Sparkles className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-foreground/60 mb-1">Archive Under Construction</p>
                  <p className="text-sm max-w-xs mx-auto">Soon you'll be able to revisit every connection your AI tutor made for {subject.label}.</p>
                </div>
             </div>
          </motion.section>
        </div>

        {/* Right Column: Marks & Performance */}
        <div className="space-y-8">
           <motion.section variants={item} className="glass-card p-8 space-y-8">
              <h3 className="text-xl font-black text-foreground flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                Assessment Tracker
              </h3>

              <div className="flex flex-col gap-4">
                <AnimatePresence mode="popLayout">
                  {data.marks.map((mark) => (
                    <motion.div 
                      key={mark.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                      className="p-5 rounded-[1.5rem] bg-muted/30 border border-border/50 flex items-center justify-between group"
                    >
                      <div>
                        <p className="font-black text-foreground group-hover:text-primary transition-colors">{mark.title}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{new Date(mark.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-primary">{mark.score}/{mark.total}</p>
                        <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-tighter">{Math.round((mark.score/mark.total)*100)}% Mastery</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <motion.div 
                  initial={false}
                  className="p-6 rounded-[1.5rem] border-2 border-dashed border-border bg-background/50 space-y-5"
                >
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] text-center mb-2">Record Achievement</p>
                    <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 px-1">Assessment Name</Label>
                          <Input 
                            placeholder="Unit Test, Final Exam..." 
                            value={newMark.title}
                            onChange={(e) => setNewMark({...newMark, title: e.target.value})}
                            className="bg-muted/30 border-none h-11 rounded-xl text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 px-1">Score</Label>
                              <Input 
                                placeholder="85" 
                                type="number"
                                value={newMark.score}
                                onChange={(e) => setNewMark({...newMark, score: e.target.value})}
                                className="bg-muted/30 border-none h-11 rounded-xl text-sm"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 px-1">Total</Label>
                              <Input 
                                placeholder="100" 
                                type="number"
                                value={newMark.total}
                                onChange={(e) => setNewMark({...newMark, total: e.target.value})}
                                className="bg-muted/30 border-none h-11 rounded-xl text-sm"
                              />
                            </div>
                        </div>
                        <Button 
                          onClick={handleAddMark}
                          className="w-full gradient-primary h-12 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                        >
                          Log Progress
                        </Button>
                    </div>
                </motion.div>
              </div>
           </motion.section>
        </div>
      </div>
    </motion.div>
  );
}
