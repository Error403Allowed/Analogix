"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Plus, Clock, CalendarDays,
  Trash2, Search, X, Upload, Tag, LayoutGrid,
  List, AlignLeft, Columns, Check, ChevronDown, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks,
  startOfMonth, endOfMonth, addMonths, subMonths,
  isSameMonth, isSameDay, isToday, format,
  startOfDay, addDays, subDays, setHours, setMinutes,
} from "date-fns";
import ICSUploader from "@/components/ICSUploader";
import { eventStore } from "@/utils/eventStore";
import { AppEvent } from "@/types/events";
import { layoutEvents, type LayoutEvent } from "@/views/calendar/layoutEvents";
import { getTermInfo, getStoredState } from "@/utils/termData";

type CalendarView = "month" | "week" | "day" | "schedule";

// ─── Built-in types + custom tag storage ──────────────────────────────────────
const BUILTIN_TYPES: Record<string, { color: string; label: string; icon: string }> = {
  exam:       { color: "#ef4444", label: "Exam",       icon: "🎯" },
  assignment: { color: "#f59e0b", label: "Assignment",  icon: "📝" },
  event:      { color: "#3b82f6", label: "Event",       icon: "📌" },
  class:      { color: "#10b981", label: "Class",       icon: "🎓" },
  lesson:     { color: "#10b981", label: "Lesson",      icon: "📚" },
  reminder:   { color: "#8b5cf6", label: "Reminder",    icon: "🔔" },
  sport:      { color: "#f97316", label: "Sport",       icon: "⚽" },
  meeting:    { color: "#06b6d4", label: "Meeting",     icon: "👥" },
};

export interface CustomEventType {
  key: string;
  color: string;
  label: string;
  icon: string;
}

const CUSTOM_TYPES_KEY = "analogix_custom_event_types";

function loadCustomTypes(): CustomEventType[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CUSTOM_TYPES_KEY) || "[]"); } catch { return []; }
}
function saveCustomTypes(types: CustomEventType[]) {
  localStorage.setItem(CUSTOM_TYPES_KEY, JSON.stringify(types));
}

function getAllTypes(customTypes: CustomEventType[]): Record<string, { color: string; label: string; icon: string }> {
  const result = { ...BUILTIN_TYPES };
  for (const t of customTypes) result[t.key] = { color: t.color, label: t.label, icon: t.icon };
  return result;
}

const PRESET_COLORS = [
  "#ef4444","#f97316","#f59e0b","#eab308","#84cc16",
  "#10b981","#06b6d4","#3b82f6","#8b5cf6","#ec4899","#6b7280",
];

// ─── useNow: live clock updating every 30s ────────────────────────────────────
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function getTypeMeta(type: string, allTypes: Record<string, { color: string; label: string; icon: string }>) {
  return allTypes[type] ?? { color: "#3b82f6", label: type || "Event", icon: "📌" };
}

// ─── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({ date, events, onSelect }: { date: Date; events: AppEvent[]; onSelect: (d: Date) => void }) {
  const [navDate, setNavDate] = useState(date);
  useEffect(() => setNavDate(date), [date]);
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(navDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(navDate), { weekStartsOn: 1 }),
  });
  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/70">{format(navDate, "MMMM yyyy")}</span>
        <div className="flex gap-1">
          <button onClick={() => setNavDate(subMonths(navDate, 1))} className="w-5 h-5 rounded flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><ChevronLeft className="w-3 h-3" /></button>
          <button onClick={() => setNavDate(addMonths(navDate, 1))} className="w-5 h-5 rounded flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><ChevronRight className="w-3 h-3" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {["M","T","W","T","F","S","S"].map((d, i) => <div key={i} className="text-center text-[9px] font-bold text-muted-foreground/60 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day, i) => {
          const inMonth = isSameMonth(day, navDate);
          const isSelected = isSameDay(day, date);
          const isTod = isToday(day);
          const hasEvents = events.some(e => isSameDay(new Date(e.date), day));
          return (
            <button key={i} onClick={() => onSelect(day)}
              className={cn("w-full aspect-square flex flex-col items-center justify-center rounded-full text-[10px] font-semibold transition-all relative",
                !inMonth && "opacity-25", isSelected && "bg-primary text-primary-foreground",
                isTod && !isSelected && "text-primary font-black ring-1 ring-primary/30",
                !isSelected && inMonth && "hover:bg-muted text-foreground")}>
              {format(day, "d")}
              {hasEvents && !isSelected && <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary/60" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── EventChip (month grid) ───────────────────────────────────────────────────
function EventChip({ event, allTypes, onClick }: { event: AppEvent; allTypes: Record<string, {color:string;label:string;icon:string}>; onClick?: () => void }) {
  const meta = getTypeMeta(event.type, allTypes);
  return (
    <button onClick={onClick}
      className="w-full text-left flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[9px] font-semibold truncate hover:opacity-80 transition-opacity group"
      style={{ backgroundColor: meta.color + "18", color: meta.color }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
      <span className="truncate">{event.title}</span>
    </button>
  );
}

// ─── TimeBlock (week/day) ─────────────────────────────────────────────────────
function TimeBlock({ event, allTypes, col, totalCols, height, onDelete, onSelect }: {
  event: AppEvent; allTypes: Record<string,{color:string;label:string;icon:string}>;
  col: number; totalCols: number; height: number;
  onDelete: () => void; onSelect: () => void;
}) {
  const meta = getTypeMeta(event.type, allTypes);
  const colW = 100 / totalCols;
  const left = `${col * colW + 0.5}%`;
  const width = `${colW - 1}%`;
  return (
    <div onClick={onSelect}
      className="absolute rounded-md px-1.5 py-1 overflow-hidden cursor-pointer group hover:brightness-110 transition-all shadow-sm"
      style={{ left, width, backgroundColor: meta.color + "22", borderLeft: `3px solid ${meta.color}` }}>
      <p className="text-[10px] font-bold truncate leading-tight" style={{ color: meta.color }}>{event.title}</p>
      {height >= 36 && <p className="text-[9px] opacity-70 leading-tight" style={{ color: meta.color }}>{format(new Date(event.date), "h:mm a")}</p>}
      <button onClick={e => { e.stopPropagation(); onDelete(); }}
        className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 rounded flex items-center justify-center hover:bg-black/10">
        <X className="w-2.5 h-2.5" style={{ color: meta.color }} />
      </button>
    </div>
  );
}

// ─── Event detail modal ────────────────────────────────────────────────────────
function EventDetail({ event, allTypes, onClose, onDelete }: { event: AppEvent; allTypes: Record<string,{color:string;label:string;icon:string}>; onClose: () => void; onDelete: () => void }) {
  const meta = getTypeMeta(event.type, allTypes);
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl overflow-hidden z-10" onClick={e => e.stopPropagation()}>
        <div className="h-1.5 w-full" style={{ backgroundColor: meta.color }} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: meta.color }}>{meta.label}</span>
                {event.subject && <span className="flex items-center gap-1 text-[9px] text-muted-foreground font-semibold"><Tag className="w-2.5 h-2.5" />{event.subject}</span>}
              </div>
              <h3 className="text-base font-bold text-foreground">{event.title}</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>
          {event.description && <p className="text-xs text-muted-foreground leading-relaxed mb-4">{event.description}</p>}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>{format(new Date(event.date), "EEEE, MMMM d 'at' h:mm a")}</span>
          </div>
          {event.endDate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Clock className="w-3.5 h-3.5 opacity-0" />
              <span>Ends {format(new Date(event.endDate), "h:mm a")}</span>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end">
          <button onClick={() => { onDelete(); onClose(); }}
            className="flex items-center gap-1.5 text-xs text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-colors font-semibold">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Manage Tags modal ────────────────────────────────────────────────────────
function ManageTagsModal({ customTypes, onClose, onChange }: {
  customTypes: CustomEventType[];
  onClose: () => void;
  onChange: (types: CustomEventType[]) => void;
}) {
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("🏷️");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const handleAdd = () => {
    if (!label.trim()) return;
    const key = label.trim().toLowerCase().replace(/\s+/g, "-");
    if (BUILTIN_TYPES[key] || customTypes.find(t => t.key === key)) return;
    const updated = [...customTypes, { key, label: label.trim(), icon, color }];
    onChange(updated);
    saveCustomTypes(updated);
    setLabel(""); setIcon("🏷️"); setColor(PRESET_COLORS[0]);
  };

  const handleRemove = (key: string) => {
    const updated = customTypes.filter(t => t.key !== key);
    onChange(updated);
    saveCustomTypes(updated);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
        className="relative w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl z-10 overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold">Manage Tags</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>
          {/* Built-in types (read-only) */}
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">Built-in</p>
          <div className="space-y-1 mb-4">
            {Object.entries(BUILTIN_TYPES).map(([key, m]) => (
              <div key={key} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/30">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                <span className="text-xs font-semibold text-foreground">{m.icon} {m.label}</span>
              </div>
            ))}
          </div>
          {/* Custom types */}
          {customTypes.length > 0 && (
            <>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">Custom</p>
              <div className="space-y-1 mb-4">
                {customTypes.map(t => (
                  <div key={t.key} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/30 group">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                    <span className="text-xs font-semibold text-foreground flex-1">{t.icon} {t.label}</span>
                    <button onClick={() => handleRemove(t.key)} className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive/60 hover:text-destructive p-0.5 rounded">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          {/* Add new */}
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">Add New Tag</p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="🏷️"
                className="w-12 text-center text-sm bg-muted/40 border border-border rounded-lg px-2 py-2 outline-none focus:ring-2 focus:ring-primary/20" maxLength={2} />
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Tag name"
                onKeyDown={e => e.key === "Enter" && handleAdd()}
                className="flex-1 text-xs bg-muted/40 border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={cn("w-5 h-5 rounded-full transition-all", color === c && "ring-2 ring-offset-1 ring-primary")}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <button onClick={handleAdd} disabled={!label.trim()}
              className="w-full text-xs font-bold py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all">
              Add Tag
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Create Event Modal ────────────────────────────────────────────────────────
function CreateEventModal({ defaultDate, defaultHour, allTypes, onClose, onSave }: {
  defaultDate: Date; defaultHour?: number; allTypes: Record<string,{color:string;label:string;icon:string}>;
  onClose: () => void; onSave: (event: AppEvent) => void;
}) {
  const startH = defaultHour ?? 9;
  const endH = Math.min(startH + 1, 23);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(format(defaultDate, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(`${String(startH).padStart(2, "0")}:00`);
  const [endTime, setEndTime] = useState(`${String(endH).padStart(2, "0")}:00`);
  const [hasEndTime, setHasEndTime] = useState(true);
  const [type, setType] = useState(Object.keys(allTypes)[0] || "event");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  const handleSave = () => {
    if (!title.trim() || !date) return;
    const startDate = new Date(`${date}T${startTime}`);
    const endDate = hasEndTime ? new Date(`${date}T${endTime}`) : undefined;
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
            {/* Type selector */}
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
            {/* Date + times */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full text-xs bg-muted/40 border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Start time</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                  className="w-full text-xs bg-muted/40 border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">End time</label>
                  <button onClick={() => setHasEndTime(v => !v)} className={cn("text-[9px] font-bold transition-colors", hasEndTime ? "text-primary" : "text-muted-foreground/50")}>{hasEndTime ? "On" : "Off"}</button>
                </div>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} disabled={!hasEndTime}
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

// ─── Time grid (week + day) — proper overlap columns + live now line ──────────
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_H = 56;

function TimeGrid({ days, events, allTypes, now, onDelete, onSelect, onClickTime }: {
  days: Date[]; events: AppEvent[];
  allTypes: Record<string,{color:string;label:string;icon:string}>;
  now: Date; onDelete: (id: string) => void; onSelect: (e: AppEvent) => void;
  onClickTime: (day: Date, hour: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNow = days.some(d => isToday(d));

  // Scroll to now on mount
  useEffect(() => {
    const scrollTop = Math.max(0, nowMinutes * (HOUR_H / 60) - 200);
    containerRef.current?.scrollTo({ top: scrollTop, behavior: "smooth" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className="flex overflow-y-auto flex-1 min-h-0">
      {/* Time labels */}
      <div className="w-14 shrink-0 relative bg-background z-10">
        <div style={{ height: HOUR_H / 2 }} /> {/* half-hour offset for label alignment */}
        {HOURS.map(h => (
          <div key={h} className="relative" style={{ height: HOUR_H }}>
            {h > 0 && (
              <span className="absolute -top-2.5 right-2 text-[9px] font-semibold text-muted-foreground/60 tabular-nums select-none">
                {format(setHours(setMinutes(new Date(), 0), h), "h a")}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Grid columns */}
      <div className="flex flex-1 relative">
        {/* Live now indicator */}
        {showNow && (
          <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
            style={{ top: HOUR_H / 2 + nowMinutes * (HOUR_H / 60) }}>
            <div className="w-2 h-2 rounded-full bg-red-500 ml-0.5 shrink-0" />
            <div className="flex-1 h-px bg-red-500/70" />
          </div>
        )}

        {days.map((day, di) => {
          const dayEvents = events.filter(e => isSameDay(new Date(e.date), day));
          const laid = layoutEvents(dayEvents, HOUR_H);
          return (
            <div key={di} className="relative flex-1 border-r border-border/40 last:border-r-0">
              {/* Hour cells — click to create */}
              <div style={{ height: HOUR_H / 2 }} />
              {HOURS.map(h => (
                <div key={h}
                  className="border-t border-border/20 hover:bg-primary/5 transition-colors cursor-pointer group relative"
                  style={{ height: HOUR_H }}
                  onClick={() => onClickTime(day, h)}
                >
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="text-[9px] font-bold text-primary/50">+</span>
                  </span>
                </div>
              ))}
              {/* Half-hour lines */}
              {HOURS.map(h => (
                <div key={`half-${h}`} className="absolute left-0 right-0 border-t border-border/10 pointer-events-none"
                  style={{ top: HOUR_H / 2 + h * HOUR_H + HOUR_H / 2 }} />
              ))}
              {/* Events with overlap layout */}
              {laid.map(({ event, top, height, col, totalCols }) => (
                <div key={event.id} className="absolute left-0 right-0" style={{ top: top + HOUR_H / 2, height }}>
                  <TimeBlock
                    event={event} allTypes={allTypes}
                    col={col} totalCols={totalCols} height={height}
                    onDelete={() => onDelete(event.id)}
                    onSelect={() => onSelect(event)}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week Grid View (same chip layout as Month) ───────────────────────────────
function WeekGridView({ days, events, allTypes, onSelectDay, onSelectEvent, onClickCreate }: {
  days: Date[]; events: AppEvent[]; allTypes: Record<string,{color:string;label:string;icon:string}>;
  onSelectDay: (d: Date) => void; onSelectEvent: (e: AppEvent) => void;
  onClickCreate: (d: Date) => void;
}) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="grid grid-cols-7 flex-1 overflow-auto">
        {days.map((day, i) => {
          const dayEvents = events.filter(e => isSameDay(new Date(e.date), day));
          const isSelected = isSameDay(day, days[0]); // unused but kept for parity
          const isTod = isToday(day);
          return (
            <div key={i}
              onClick={() => onSelectDay(day)}
              onDoubleClick={() => onClickCreate(day)}
              className={cn(
                "min-h-[200px] p-1.5 border-b border-r border-border/30 cursor-pointer transition-colors hover:bg-muted/20 flex flex-col gap-1",
                isTod && "bg-primary/4 ring-1 ring-inset ring-primary/30",
                (i + 1) % 7 === 0 && "border-r-0"
              )}>
              <span className={cn(
                "self-start text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all",
                isTod ? "bg-primary text-primary-foreground" : "text-foreground/80"
              )}>
                {format(day, "d")}
              </span>
              {dayEvents.slice(0, 6).map(e => (
                <EventChip key={e.id} event={e} allTypes={allTypes} onClick={() => onSelectEvent(e)} />
              ))}
              {dayEvents.length > 6 && (
                <span className="text-[8px] text-muted-foreground/60 font-semibold pl-1.5">+{dayEvents.length - 6} more</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Month View ────────────────────────────────────────────────────────────────
function MonthView({ date, events, allTypes, onSelectDay, onSelectEvent, onClickCreate }: {
  date: Date; events: AppEvent[]; allTypes: Record<string,{color:string;label:string;icon:string}>;
  onSelectDay: (d: Date) => void; onSelectEvent: (e: AppEvent) => void;
  onClickCreate: (d: Date) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(date), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(date), { weekStartsOn: 1 }),
  });
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border/50">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
          <div key={d} className="py-2.5 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1 overflow-auto">
        {days.map((day, i) => {
          const dayEvents = events.filter(e => isSameDay(new Date(e.date), day));
          const inMonth = isSameMonth(day, date);
          const isSelected = isSameDay(day, date);
          const isTod = isToday(day);
          return (
            <div key={i}
              onClick={() => onSelectDay(day)}
              onDoubleClick={() => onClickCreate(day)}
              className={cn("min-h-[110px] p-1.5 border-b border-r border-border/30 cursor-pointer transition-colors hover:bg-muted/20 flex flex-col gap-1",
                !inMonth && "opacity-30", isSelected && "bg-primary/4 ring-1 ring-inset ring-primary/30", (i + 1) % 7 === 0 && "border-r-0")}>
              <span className={cn("self-start text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all",
                isTod && "bg-primary text-primary-foreground", isSelected && !isTod && "text-primary font-black", !isTod && !isSelected && "text-foreground/80")}>
                {format(day, "d")}
              </span>
              {dayEvents.slice(0, 3).map(e => (
                <EventChip key={e.id} event={e} allTypes={allTypes} onClick={() => onSelectEvent(e)} />
              ))}
              {dayEvents.length > 3 && <span className="text-[8px] text-muted-foreground/60 font-semibold pl-1.5">+{dayEvents.length - 3} more</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Schedule View ─────────────────────────────────────────────────────────────
function ScheduleView({ events, allTypes, onSelectEvent, onDelete }: {
  events: AppEvent[]; allTypes: Record<string,{color:string;label:string;icon:string}>;
  onSelectEvent: (e: AppEvent) => void; onDelete: (id: string) => void;
}) {
  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const byDate = sorted.reduce((acc, e) => {
    const key = format(new Date(e.date), "yyyy-MM-dd");
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {} as Record<string, AppEvent[]>);

  if (sorted.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
          <CalendarDays className="w-7 h-7 text-muted-foreground/40" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">No events to show</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {Object.entries(byDate).map(([dateKey, dayEvents]) => {
        const d = new Date(dateKey);
        const isTod = isToday(d);
        return (
          <div key={dateKey} className="flex">
            <div className="w-[110px] shrink-0 sticky top-0 self-start pt-5 pl-4 pr-3">
              <p className={cn("text-[9px] font-black uppercase tracking-widest mb-0.5", isTod ? "text-primary" : "text-muted-foreground/60")}>
                {isTod ? "Today" : format(d, "EEE")}
              </p>
              <p className={cn("text-2xl font-black tabular-nums leading-none", isTod ? "text-primary" : "text-foreground/80")}>{format(d, "d")}</p>
              <p className="text-[9px] text-muted-foreground/50 mt-0.5 font-medium">{format(d, "MMM yyyy")}</p>
            </div>
            <div className="flex-1 border-l border-border/30 py-3 pr-4 space-y-2">
              {dayEvents.map(e => {
                const meta = getTypeMeta(e.type, allTypes);
                return (
                  <motion.div key={e.id} layout initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    className="group flex items-start gap-3 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors border border-transparent hover:border-border/40"
                    onClick={() => onSelectEvent(e)}>
                    <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">{e.title}</p>
                        <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: meta.color }}>{meta.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />{format(new Date(e.date), "h:mm a")}
                          {e.endDate && ` – ${format(new Date(e.endDate), "h:mm a")}`}
                        </span>
                        {e.subject && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Tag className="w-2.5 h-2.5" />{e.subject}</span>}
                      </div>
                    </div>
                    <button onClick={ev => { ev.stopPropagation(); onDelete(e.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main CalendarPage ─────────────────────────────────────────────────────────
const CalendarPage = () => {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("week");
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<{ date: Date; hour?: number } | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [showManageTags, setShowManageTags] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [customTypes, setCustomTypes] = useState<CustomEventType[]>(() => loadCustomTypes());
  const searchRef = useRef<HTMLInputElement>(null);
  const now = useNow();

  const allTypes = useMemo(() => getAllTypes(customTypes), [customTypes]);

  const loadEvents = useCallback(() => eventStore.getAll().then(setEvents), []);
  useEffect(() => {
    loadEvents();
    window.addEventListener("eventsUpdated", loadEvents);
    return () => window.removeEventListener("eventsUpdated", loadEvents);
  }, [loadEvents]);

  const [termInfo, setTermInfo] = useState<ReturnType<typeof getTermInfo> | null>(null);
  useEffect(() => {
    const userState = getStoredState();
    setTermInfo(userState ? getTermInfo(date, userState) : null);
  }, [date]);

  const filteredEvents = useMemo(() => events.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.title.toLowerCase().includes(q) || e.subject?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q);
    const matchType = filterType === "all" || e.type === filterType;
    return matchSearch && matchType;
  }), [events, search, filterType]);

  const upcomingEvents = useMemo(() =>
    filteredEvents.filter(e => new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 8),
    [filteredEvents, now]);

  const openCreate = (day: Date, hour?: number) => {
    setCreateDefaults({ date: day, hour });
    setShowCreate(true);
  };

  const handleSaveEvent = (e: AppEvent) => { eventStore.add(e); loadEvents(); };
  const handleDelete = (id: string) => { if (confirm("Delete this event?")) { eventStore.remove(id); loadEvents(); } };

  const navigate = (dir: 1 | -1) => {
    if (view === "month") setDate(d => dir === 1 ? addMonths(d, 1) : subMonths(d, 1));
    else if (view === "week") setDate(d => dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1));
    else setDate(d => dir === 1 ? addDays(d, 1) : subDays(d, 1));
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 }),
  });

  const navLabel =
    view === "month" ? format(date, "MMMM yyyy")
    : view === "week" ? `${format(weekDays[0], "MMM d")} – ${format(weekDays[6], "MMM d, yyyy")}`
    : view === "schedule" ? "All Events"
    : format(date, "EEEE, MMMM d");

  const viewIcons: Record<CalendarView, React.ReactNode> = {
    month:    <LayoutGrid className="w-3.5 h-3.5" />,
    week:     <Columns className="w-3.5 h-3.5" />,
    day:      <AlignLeft className="w-3.5 h-3.5" />,
    schedule: <List className="w-3.5 h-3.5" />,
  };

  const selectedDayEvents = filteredEvents
    .filter(e => isSameDay(new Date(e.date), date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Current time display — computed client-side only to avoid hydration mismatch
  const [timeStr, setTimeStr] = useState("");
  const [tzStr, setTzStr] = useState("");
  useEffect(() => {
    setTimeStr(format(now, "h:mm a"));
    setTzStr(Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " "));
  }, [now]);

  return (
    <div className="flex bg-background overflow-hidden" style={{ height: "100%" }}>

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-[220px] shrink-0 border-r border-border/40 flex flex-col gap-5 px-4 py-5 overflow-y-auto">
        <button onClick={() => openCreate(date)}
          className="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:bg-primary/90 transition-all hover:shadow-md active:scale-[0.98]">
          <Plus className="w-4 h-4" /> Create
        </button>

        {/* Live clock */}
        <div className="text-center">
          <p className="text-lg font-black text-foreground tabular-nums">{timeStr}</p>
          <p className="text-[9px] text-muted-foreground/50 font-medium">{tzStr}</p>
        </div>

        <MiniCalendar date={date} events={filteredEvents} onSelect={setDate} />

        {termInfo && (
          <div className="rounded-xl bg-primary/8 border border-primary/20 px-3 py-2.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-primary/70 mb-0.5">Current Term</p>
            <p className="text-xs font-bold text-primary">{termInfo.term.label}</p>
            <p className="text-[10px] text-primary/70 font-medium">Week {termInfo.week}</p>
          </div>
        )}

        {/* Type filters */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Tags</p>
            <button onClick={() => setShowManageTags(true)} className="text-[9px] font-bold text-primary hover:underline flex items-center gap-0.5">
              <Pencil className="w-2.5 h-2.5" /> Manage
            </button>
          </div>
          <div className="space-y-0.5">
            <button onClick={() => setFilterType("all")}
              className={cn("w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left",
                filterType === "all" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
              <span className="w-2 h-2 rounded-full bg-foreground/30" /> All Events
            </button>
            {Object.entries(allTypes).map(([key, m]) => (
              <button key={key} onClick={() => setFilterType(filterType === key ? "all" : key)}
                className={cn("w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left",
                  filterType === key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                {m.label}
                {filterType === key && <Check className="w-3 h-3 ml-auto text-primary" />}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto space-y-1">
          <button onClick={() => setShowUploader(s => !s)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
            <Upload className="w-3.5 h-3.5" /> Import .ics
          </button>
          <AnimatePresence>
            {showUploader && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <ICSUploader />
              </motion.div>
            )}
          </AnimatePresence>
          {events.length > 0 && (
            <button onClick={() => { if (confirm(`Clear all ${events.length} events?`)) eventStore.clearAll(); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-destructive/20 text-xs font-semibold text-destructive/70 hover:text-destructive hover:bg-destructive/5 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          )}
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setDate(new Date())}
              className={cn("px-3 h-8 rounded-lg border text-xs font-bold transition-all",
                isToday(date) ? "border-primary/40 bg-primary/8 text-primary" : "border-border hover:bg-muted text-muted-foreground hover:text-foreground")}>
              Today
            </button>
            <button onClick={() => navigate(1)} className="w-8 h-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <h2 className="text-base font-black text-foreground min-w-[180px]">{navLabel}</h2>
          <div className="ml-auto flex items-center gap-2">
            <AnimatePresence>
              {showSearch && (
                <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 200, opacity: 1 }} exit={{ width: 0, opacity: 0 }}>
                  <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events…"
                    className="w-full text-xs bg-muted/50 border border-border rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/20" />
                </motion.div>
              )}
            </AnimatePresence>
            <button onClick={() => { setShowSearch(s => !s); if (!showSearch) setTimeout(() => searchRef.current?.focus(), 100); }}
              className={cn("w-8 h-8 rounded-lg border flex items-center justify-center transition-colors",
                showSearch ? "bg-muted border-border text-foreground" : "border-border hover:bg-muted text-muted-foreground hover:text-foreground")}>
              <Search className="w-3.5 h-3.5" />
            </button>
            <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border/50">
              {(["month","week","day","schedule"] as CalendarView[]).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all",
                    view === v ? "bg-background text-foreground shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground")}>
                  {viewIcons[v]}<span className="hidden sm:inline capitalize">{v}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Day header */}
        {view === "day" && (
          <div className="flex items-center justify-center gap-4 py-3 border-b border-border/40 shrink-0">
            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{format(date, "EEEE")}</p>
              <p className={cn("text-3xl font-black", isToday(date) ? "text-primary" : "text-foreground/80")}>{format(date, "d")}</p>
              <p className="text-[10px] text-muted-foreground/60">{format(date, "MMMM yyyy")}</p>
            </div>
          </div>
        )}

        {/* Calendar body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={view + format(date, "yyyy-MM")} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {view === "month" && <MonthView date={date} events={filteredEvents} allTypes={allTypes} onSelectDay={setDate} onSelectEvent={setSelectedEvent} onClickCreate={d => openCreate(d)} />}
              {view === "week" && (
                <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                  {/* Week header — lives inside the flex-1 area, never overlaps right panel */}
                  <div className="flex shrink-0 border-b border-border/40">
                    <div className="w-14 shrink-0" />
                    {weekDays.map((day) => {
                      const isTod = isToday(day);
                      const isSelected = isSameDay(day, date);
                      return (
                        <button key={day.toISOString()} onClick={() => setDate(day)}
                          className={cn("flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-colors hover:bg-muted/30 border-r border-border/30 last:border-r-0", isSelected && "bg-primary/5")}>
                          <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">{format(day, "EEE")}</span>
                          <span className={cn("text-sm font-black w-7 h-7 flex items-center justify-center rounded-full transition-all",
                            isTod ? "bg-primary text-primary-foreground" : isSelected ? "text-primary" : "text-foreground/80")}>
                            {format(day, "d")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <TimeGrid days={weekDays} events={filteredEvents} allTypes={allTypes} now={now} onDelete={handleDelete} onSelect={setSelectedEvent} onClickTime={(day, hour) => openCreate(day, hour)} />
                </div>
              )}
              {view === "day" && <TimeGrid days={[date]} events={filteredEvents} allTypes={allTypes} now={now} onDelete={handleDelete} onSelect={setSelectedEvent} onClickTime={(day, hour) => openCreate(day, hour)} />}
              {view === "schedule" && <ScheduleView events={filteredEvents} allTypes={allTypes} onSelectEvent={setSelectedEvent} onDelete={handleDelete} />}
            </motion.div>
          </AnimatePresence>

          {/* Right panel */}
          {(view === "month" || view === "week") && (
            <aside className="w-[260px] shrink-0 border-l border-border/40 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-border/40">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{format(date, "EEEE")}</p>
                    <p className="text-sm font-black text-foreground">{format(date, "MMMM d")}</p>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{selectedDayEvents.length}</span>
                </div>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {selectedDayEvents.length === 0
                    ? <p className="text-[10px] text-muted-foreground/50 text-center py-4">Nothing here</p>
                    : selectedDayEvents.map(e => {
                        const meta = getTypeMeta(e.type, allTypes);
                        return (
                          <button key={e.id} onClick={() => setSelectedEvent(e)}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left group">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold text-foreground truncate">{e.title}</p>
                              <p className="text-[9px] text-muted-foreground/60">{format(new Date(e.date), "h:mm a")}{e.endDate && ` – ${format(new Date(e.endDate), "h:mm a")}`}</p>
                            </div>
                          </button>
                        );
                      })}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Upcoming</p>
                  <button onClick={() => setView("schedule")} className="text-[9px] font-bold text-primary hover:underline">View all</button>
                </div>
                <div className="space-y-1.5">
                  {upcomingEvents.length === 0
                    ? <p className="text-[10px] text-muted-foreground/50 text-center py-6">No upcoming events</p>
                    : upcomingEvents.map(e => {
                        const meta = getTypeMeta(e.type, allTypes);
                        return (
                          <button key={e.id} onClick={() => setSelectedEvent(e)}
                            className="w-full flex items-start gap-2 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left">
                            <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: meta.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold text-foreground truncate">{e.title}</p>
                              <p className="text-[9px] text-muted-foreground/60">
                                {isToday(new Date(e.date)) ? "Today" : format(new Date(e.date), "MMM d")} · {format(new Date(e.date), "h:mm a")}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreate && <CreateEventModal
          defaultDate={createDefaults?.date ?? date}
          defaultHour={createDefaults?.hour}
          allTypes={allTypes}
          onClose={() => { setShowCreate(false); setCreateDefaults(null); }}
          onSave={handleSaveEvent}
        />}
        {selectedEvent && <EventDetail event={selectedEvent} allTypes={allTypes} onClose={() => setSelectedEvent(null)} onDelete={() => { handleDelete(selectedEvent.id); setSelectedEvent(null); }} />}
        {showManageTags && <ManageTagsModal customTypes={customTypes} onClose={() => setShowManageTags(false)} onChange={setCustomTypes} />}
      </AnimatePresence>
    </div>
  );
};

export default CalendarPage;
