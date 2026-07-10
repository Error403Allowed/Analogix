"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, Check, Tag, Pencil } from "lucide-react";
import { format, addMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DEFAULT_EVENT_DURATION_MINUTES, TIME_GRID_SNAP_MINUTES, formatMinutesForTimeInput,
} from "@/views/calendar/timeGridUtils";
import { PRESET_COLORS } from "../constants";
import type { AppEvent } from "@/types/events";
import type { CustomEventType } from "../types";
import { TagEditorPanel } from "./TagEditorPanel";

export function CreateEventModal({ defaultDate, defaultStartMin, defaultEndMin, allTypes, onClose, onSave, onManageTags, onCreateTag }: {
  defaultDate: Date;
  defaultStartMin?: number;
  defaultEndMin?: number;
  allTypes: Record<string,{color:string;label:string;icon:string}>;
  onClose: () => void; onSave: (event: AppEvent) => void;
  onManageTags: () => void;
  onCreateTag: (label: string, icon: string, color: string) => CustomEventType | null;
}) {
  const startMin = defaultStartMin ?? 9 * 60;
  const endMin = defaultEndMin ?? Math.min(startMin + DEFAULT_EVENT_DURATION_MINUTES, 23 * 60 + 45);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(format(defaultDate, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(formatMinutesForTimeInput(startMin));
  const [endTime, setEndTime] = useState(formatMinutesForTimeInput(endMin));
  const [hasEndTime, setHasEndTime] = useState(true);
  const [type, setType] = useState(Object.keys(allTypes)[0] || "event");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showQuickTagCreator, setShowQuickTagCreator] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  const handleSave = () => {
    if (!title.trim() || !date) return;
    const startDate = new Date(`${date}T${startTime}`);
    let endDate = hasEndTime ? new Date(`${date}T${endTime}`) : undefined;

    if (endDate && endDate.getTime() <= startDate.getTime()) {
      endDate = addMinutes(startDate, TIME_GRID_SNAP_MINUTES);
    }

    onSave({
      id: crypto.randomUUID(),
      title: title.trim(),
      date: startDate,
      endDate,
      type,
      subject: subject.trim() || undefined,
      description: description.trim() || undefined,
      source: "manual",
    });
    onClose();
  };

  const meta = allTypes[type] ?? { color: "#3b82f6", label: type, icon: "📌" };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
        className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden z-10"
        onClick={e => e.stopPropagation()}>
        <div className="h-1 w-full transition-colors duration-300" style={{ backgroundColor: meta.color }} />
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-foreground">New Event</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-3">
            <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave()} placeholder="Event title…"
              className="w-full text-sm font-semibold bg-muted/40 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50" />
            <div className="relative">
              <button onClick={() => setShowTypeMenu(s => !s)}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all"
                style={{ backgroundColor: meta.color + "15", borderColor: meta.color + "40", color: meta.color }}>
                <span className="text-sm">{meta.icon}</span>{meta.label}
                <ChevronDown className="w-3.5 h-3.5 ml-auto" />
              </button>
              <AnimatePresence>
                {showTypeMenu && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-xl z-20 overflow-hidden max-h-48 overflow-y-auto">
                    {Object.entries(allTypes).map(([key, m]) => (
                      <button key={key} onClick={() => { setType(key); setShowTypeMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold hover:bg-muted transition-colors text-left">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                        <span className="text-sm">{m.icon}</span><span>{m.label}</span>
                        {type === key && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex justify-end">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickTagCreator((current) => !current)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-muted transition-colors"
                >
                  <Tag className="w-3 h-3" />
                  {showQuickTagCreator ? "Close new tag" : "New tag"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickTagCreator(false);
                    setShowTypeMenu(false);
                    onManageTags();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-muted transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Manage tags
                </button>
              </div>
            </div>
            {showQuickTagCreator && (
              <div className="rounded-xl border border-border bg-muted/25 p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Create Tag</p>
                <TagEditorPanel
                  currentLabel=""
                  currentColor={PRESET_COLORS[0]}
                  currentIcon="🏷️"
                  saveLabel="Create tag"
                  onSave={(nextLabel, color, icon) => {
                    const created = onCreateTag(nextLabel ?? "", icon, color);
                    if (!created) return;
                    setType(created.key);
                    setShowQuickTagCreator(false);
                    setShowTypeMenu(false);
                  }}
                  onCancel={() => setShowQuickTagCreator(false)}
                />
              </div>
            )}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full text-xs bg-muted/40 border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Start time</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} step={TIME_GRID_SNAP_MINUTES * 60}
                  className="w-full text-xs bg-muted/40 border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">End time</label>
                  <button onClick={() => setHasEndTime(v => !v)} className={cn("text-[9px] font-bold transition-colors", hasEndTime ? "text-primary" : "text-muted-foreground/50")}>{hasEndTime ? "On" : "Off"}</button>
                </div>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} disabled={!hasEndTime} step={TIME_GRID_SNAP_MINUTES * 60}
                  className="w-full text-xs bg-muted/40 border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-40" />
              </div>
            </div>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject (optional)"
              className="w-full text-xs bg-muted/40 border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add a description…" rows={2}
              className="w-full text-xs bg-muted/40 border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 resize-none placeholder:text-muted-foreground/40" />
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={onClose} className="text-xs font-semibold px-4 py-2 rounded-xl border border-border hover:bg-muted transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={!title.trim() || !date}
              className="text-xs font-bold px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all">Save</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
