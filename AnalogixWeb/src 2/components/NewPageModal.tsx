"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, GraduationCap, FileText, Sparkles } from "lucide-react";
import { subjectStore, type SubjectData } from "@/utils/subjectStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NewPageModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (subjectId: string, title: string) => void;
}) {
  const [subjects, setSubjects] = useState<Record<string, SubjectData>>({});
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (open) {
      subjectStore.getAll().then(setSubjects);
      setTitle("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-md px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
            <h3 className="text-sm font-semibold text-foreground">Create New Page</h3>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Page Title</label>
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Untitled"
                className="w-full bg-transparent border-none text-xl font-bold outline-none placeholder:text-muted-foreground/20"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Select Subject</label>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {Object.values(subjects).length === 0 && (
                  <p className="text-xs text-muted-foreground italic p-4 text-center">No subjects found. Please add subjects in your profile first.</p>
                )}
                {Object.values(subjects).map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSubject(s.id)}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-xl text-left transition-all border",
                      selectedSubject === s.id 
                        ? "bg-primary/10 border-primary/30 text-primary" 
                        : "bg-muted/30 border-transparent hover:bg-muted/60 text-foreground/70"
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-sm shadow-sm">
                      🎓
                    </div>
                    <span className="text-sm font-medium">{s.id.charAt(0).toUpperCase() + s.id.slice(1)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-muted/30 flex justify-end gap-3 border-t border-border">
            <Button variant="ghost" onClick={onClose} className="rounded-lg h-9 text-xs">Cancel</Button>
            <Button 
              disabled={!selectedSubject || !title.trim()}
              onClick={() => onCreate(selectedSubject, title)}
              className="rounded-lg h-9 text-xs px-6 bg-primary text-primary-foreground shadow-sm"
            >
              Create Page
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
