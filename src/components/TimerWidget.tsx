"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, RotateCcw, SkipForward, Timer as TimerIcon, Pencil, Check, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { loadTimerState, saveTimerState, DEFAULT_SETTINGS } from "@/lib/timerStore";
import type { TimerPhase, TimerSettings } from "@/lib/timerStore";

const RING_R = 54;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

export function TimerWidget() {
  const router = useRouter();
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);
  const [phase, setPhase] = useState<TimerPhase>("study");
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.study);
  const [isActive, setIsActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editingPhase, setEditingPhase] = useState<TimerPhase>("study");
  const [editMins, setEditMins] = useState("25");
  const [editSecs, setEditSecs] = useState("00");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const phaseRef = useRef(phase);
  const settingsRef = useRef(settings);
  // Guard: don't persist state until we've loaded from storage
  const loadedRef = useRef(false);
  phaseRef.current = phase;
  settingsRef.current = settings;

  // Load initial state from store
  useEffect(() => {
    const s = loadTimerState();
    setSettings(s.settings);
    setPhase(s.phase);
    setTimeLeft(s.timeLeft);
    setIsActive(s.isActive);
    setSessionsCompleted(s.sessionsCompleted);
    loadedRef.current = true;
  }, []);

  // Persist state on every relevant change — but only after initial load
  useEffect(() => {
    if (!loadedRef.current) return;
    saveTimerState({ phase, timeLeft, isActive, sessionsCompleted, settings, lastTick: Date.now() });
  }, [phase, timeLeft, isActive, sessionsCompleted, settings]);

  // Sync from other tabs (e.g. fullscreen page)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "analogix_timer_state") {
        const s = loadTimerState();
        setSettings(s.settings);
        setPhase(s.phase);
        setTimeLeft(s.timeLeft);
        setIsActive(s.isActive);
        setSessionsCompleted(s.sessionsCompleted);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const advancePhase = useCallback(() => {
    const current = phaseRef.current;
    const next: TimerPhase = current === "study" ? "break" : "study";
    if (current === "study") setSessionsCompleted(s => s + 1);
    setPhase(next);
    setIsActive(false);
    setTimeLeft(settingsRef.current[next]);
    toast.success(next === "study" ? "Break done — back to studying! 🎯" : "Study session done! Time for a break 🌿");
  }, []);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      setIsActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
      advancePhase();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, timeLeft, advancePhase]);

  const reset = () => { setIsActive(false); setTimeLeft(settings[phase]); };
  const skip = () => advancePhase();

  const startEdit = (p: TimerPhase) => {
    setIsActive(false);
    setEditingPhase(p);
    setEditMins(String(Math.floor(settings[p] / 60)).padStart(2, "0"));
    setEditSecs(String(settings[p] % 60).padStart(2, "0"));
    setEditing(true);
  };

  const confirmEdit = () => {
    const m = Math.max(0, Math.min(99, parseInt(editMins) || 0));
    const s = Math.max(0, Math.min(59, parseInt(editSecs) || 0));
    const total = m * 60 + s || 1;
    setSettings(p => ({ ...p, [editingPhase]: total }));
    if (phase === editingPhase) setTimeLeft(total);
    setEditing(false);
  };

  const fmt = (n: number) => String(n).padStart(2, "0");
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = (settings[phase] - timeLeft) / settings[phase];
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const color = phase === "study" ? "hsl(var(--primary))" : "#22c55e";

  return (
    <div className="flex flex-col space-y-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-muted-foreground font-black text-sm uppercase tracking-[0.2em] flex items-center gap-2">
          <TimerIcon className="w-4 h-4 text-primary" />
          Pomodoro
        </h3>
        <div className="flex items-center gap-1.5">
          {[0,1,2,3].map(i => (
            <div key={i} className={cn("w-2 h-2 rounded-full transition-all",
              i < sessionsCompleted % 4 ? "bg-primary scale-110" : "bg-muted-foreground/20")} />
          ))}
          {sessionsCompleted > 0 && <span className="text-[10px] text-muted-foreground font-bold ml-1">{sessionsCompleted}</span>}
        </div>
      </div>

      <div className="glass-card p-6 flex flex-col items-center bg-background/40 gap-4">
        {/* Duration setup - only show when not active */}
        {!isActive && (
          <div className="w-full bg-muted/20 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Study</span>
              <button onClick={() => startEdit("study")}
                className="flex items-center gap-1.5 hover:opacity-70 transition-opacity text-sm font-bold">
                {fmt(Math.floor(settings.study / 60))}:{fmt(settings.study % 60)}
                <Pencil className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Break</span>
              <button onClick={() => startEdit("break")}
                className="flex items-center gap-1.5 hover:opacity-70 transition-opacity text-sm font-bold">
                {fmt(Math.floor(settings.break / 60))}:{fmt(settings.break % 60)}
                <Pencil className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        {/* Ring + time display */}
        <div className="relative flex items-center justify-center">
          <svg width="160" height="160" viewBox="0 0 128 128" className="-rotate-90">
            <circle cx="64" cy="64" r={RING_R} fill="none" stroke="currentColor"
              strokeWidth="6" className="text-muted/30" />
            <circle cx="64" cy="64" r={RING_R} fill="none" stroke={color}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.4s ease" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            {editing ? (
              <div className="flex items-center gap-1">
                <input className="w-10 text-center text-2xl font-black bg-transparent border-b border-primary outline-none text-foreground tabular-nums"
                  value={editMins} maxLength={2}
                  onChange={e => setEditMins(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={e => e.key === "Enter" && confirmEdit()} autoFocus />
                <span className="text-2xl font-black text-foreground">:</span>
                <input className="w-10 text-center text-2xl font-black bg-transparent border-b border-primary outline-none text-foreground tabular-nums"
                  value={editSecs} maxLength={2}
                  onChange={e => setEditSecs(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={e => e.key === "Enter" && confirmEdit()} />
              </div>
            ) : (
              <span className={cn("font-black tabular-nums tracking-tighter text-foreground leading-none transition-all duration-300",
                isActive ? "text-2xl" : "text-3xl")}>
                {fmt(mins)}:{fmt(secs)}
              </span>
            )}
            <span className={cn("text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-opacity duration-300",
              isActive ? "opacity-0" : "opacity-100")}>
              {phase === "study" ? "Study" : "Break"}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button onClick={reset}
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
            <RotateCcw className="w-4 h-4" />
          </button>
          {editing ? (
            <button onClick={confirmEdit}
              className="flex items-center gap-2 h-12 px-8 rounded-full font-black text-sm uppercase tracking-widest gradient-primary text-primary-foreground shadow-lg hover:scale-105 transition-all">
              <Check className="w-4 h-4" /> Set
            </button>
          ) : (
            <button onClick={() => setIsActive(a => !a)}
              className={cn("flex items-center gap-2 h-12 px-8 rounded-full font-black text-sm uppercase tracking-widest shadow-lg hover:scale-105 transition-all",
                isActive ? "bg-destructive/90 text-destructive-foreground" : "gradient-primary text-primary-foreground")}>
              {isActive ? <><Pause className="w-4 h-4 fill-current" /> Pause</> : <><Play className="w-4 h-4 fill-current" /> Start</>}
            </button>
          )}
          <button onClick={skip} title="Skip to next"
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
            <SkipForward className="w-4 h-4" />
          </button>
          <button onClick={() => router.push("/timer")} title="Open fullscreen timer"
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all ml-auto">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
