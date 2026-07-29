"use client";

import { motion } from "framer-motion";
import { BookOpen, FolderOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DynamicIcon } from "@/components/IconPicker";
import { subjectIconName, subjectLabel, type CardSet } from "./types";

export interface SubjectDetailViewProps {
  activeSubjectId: string;
  setsBySubject: Record<string, CardSet[]>;
  onOpenSet: (setId: string, tab?: "flashcards" | "learn") => void;
  onDeleteSet: (setId: string, setName: string) => void;
  onNewSet: (subjectId: string) => void;
}

export function SubjectDetailView(props: SubjectDetailViewProps) {
  const { activeSubjectId, setsBySubject } = props;
  const subjectSets = setsBySubject[activeSubjectId] || [];

  return (
    <motion.div
      key="subject-detail"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <DynamicIcon name={subjectIconName(activeSubjectId)} className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-black">{subjectLabel(activeSubjectId)}</h2>
            <p className="text-sm text-muted-foreground">
              {subjectSets.length} set{subjectSets.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button onClick={() => props.onNewSet(activeSubjectId)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> New set
        </Button>
      </div>

      {subjectSets.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/25" />
          <p className="font-black text-lg mb-1">No sets yet</p>
          <p className="text-sm text-muted-foreground mb-5">Create a set or generate one from your notes.</p>
          <Button onClick={() => props.onNewSet(activeSubjectId)}>
            <Plus className="w-4 h-4 mr-2" /> Create set
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {subjectSets.map(s => (
            <motion.div key={s.set.id}
              whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
              className="rounded-2xl border border-border bg-card p-5 cursor-pointer hover:border-primary/40 transition-all group relative"
            >
              <button onClick={e => { e.stopPropagation(); props.onDeleteSet(s.set.id, s.set.name); }}
                className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all z-10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div onClick={() => props.onOpenSet(s.set.id)}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  {s.dueCount > 0 && (
                    <span className="text-[10px] font-black bg-amber-500/15 text-amber-600 border border-amber-500/30 rounded-full px-2 py-0.5">
                      {s.dueCount} due
                    </span>
                  )}
                </div>
                <p className="font-black text-base mb-0.5 pr-6">{s.set.name}</p>
                <p className="text-xs text-muted-foreground mb-3">{s.cards.length} card{s.cards.length !== 1 ? "s" : ""}</p>
                <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full"
                    style={{ width: `${s.cards.length > 0 ? (s.masteredCount / s.cards.length) * 100 : 0}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">{s.masteredCount} mastered</p>
              </div>
            </motion.div>
          ))}
          <motion.button whileHover={{ y: -3 }}
            onClick={() => props.onNewSet(activeSubjectId)}
            className="rounded-2xl border-2 border-dashed border-border py-12 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 min-h-[140px]"
          >
            <Plus className="w-7 h-7 text-muted-foreground/30" />
            <p className="text-sm font-bold text-muted-foreground">New set</p>
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
