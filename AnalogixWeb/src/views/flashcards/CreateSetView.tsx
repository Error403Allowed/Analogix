"use client";

import { motion } from "framer-motion";
import { Check, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subjectLabel } from "./types";

interface CardRow {
  front: string;
  back: string;
}

export interface CreateSetViewProps {
  newSetName: string;
  newSetSubject: string;
  newSetCards: CardRow[];
  subjectOptions: string[];
  savingSet: boolean;
  onSetNewSetName: (name: string) => void;
  onSetNewSetSubject: (subject: string) => void;
  onUpdateCardRow: (i: number, field: "front" | "back", val: string) => void;
  onRemoveCardRow: (i: number) => void;
  onAddCardRow: () => void;
  onSaveSet: () => void;
  onCancel: () => void;
}

export function CreateSetView(props: CreateSetViewProps) {
  return (
    <motion.div
      key="create-set"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      className="space-y-6"
    >
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-black mb-1">New flashcard set</h2>
        <p className="text-xs text-muted-foreground mb-5">Name your set, pick a subject, then add cards.</p>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Set name</label>
            <input
              value={props.newSetName}
              onChange={e => props.onSetNewSetName(e.target.value)}
              placeholder="e.g. Quadratic equations, Chapter 3 vocab..."
              className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold placeholder:font-normal placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subject</label>
            <select value={props.newSetSubject} onChange={e => props.onSetNewSetSubject(e.target.value)}
              className="mt-2 w-full sm:w-72 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {props.subjectOptions.map(id => <option key={id} value={id}>{subjectLabel(id)}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {props.newSetCards.map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="rounded-2xl border border-border bg-card overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{i + 1}</span>
              {props.newSetCards.length > 1 && (
                <button onClick={() => props.onRemoveCardRow(i)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
              <div className="px-5 pb-5 pt-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Term</p>
                <textarea value={card.front} onChange={e => props.onUpdateCardRow(i, "front", e.target.value)} placeholder="Enter term" rows={2}
                  className="w-full bg-transparent text-sm font-semibold placeholder:text-muted-foreground/40 resize-none focus:outline-none border-b border-border/60 pb-1 focus:border-primary transition-colors" />
              </div>
              <div className="px-5 pb-5 pt-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Definition</p>
                <textarea value={card.back} onChange={e => props.onUpdateCardRow(i, "back", e.target.value)} placeholder="Enter definition" rows={2}
                  className="w-full bg-transparent text-sm placeholder:text-muted-foreground/40 resize-none focus:outline-none border-b border-border/60 pb-1 focus:border-primary transition-colors" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <button onClick={props.onAddCardRow} className="w-full rounded-2xl border-2 border-dashed border-border py-4 text-sm font-bold text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> Add card
      </button>
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">{props.newSetCards.filter(c => c.front.trim() && c.back.trim()).length} / {props.newSetCards.length} cards ready</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={props.onCancel}>Cancel</Button>
          <Button onClick={props.onSaveSet} disabled={props.savingSet || !props.newSetName.trim() || props.newSetCards.filter(c => c.front.trim() && c.back.trim()).length === 0}>
            {props.savingSet ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Check className="w-4 h-4 mr-2" /> Create set</>}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
