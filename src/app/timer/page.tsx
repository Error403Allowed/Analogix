"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, RotateCcw, SkipForward, Check, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { loadTimerState, saveTimerState, DEFAULT_SETTINGS } from "@/lib/timerStore";
import type { TimerPhase, TimerSettings } from "@/lib/timerStore";

const RING_R = 140;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

export default function TimerPage() {
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

  // Sync from widget tab
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

  const startEdit = () => {
    setIsActive(false);
    setEditingPhase(phase);
    setEditMins(String(Math.floor(settings[phase] / 60)).padStart(2, "0"));
    setEditSecs(String(settings[phase] % 60).padStart(2, "0"));
    setEditing(true);
  };

  const confirmEdit = () => {
    const m = Math.max(0, Math.min(99, parseInt(editMins) || 0));
    const s = Math.max(0, Math.min(59, parseInt(editSecs) || 0));
    const total = m * 60 + s || 1;
    setSettings(p => ({ ...p, [editingPhase]: total }));
    setTimeLeft(total);
    setEditing(false);
  };

  const fmt = (n: number) => String(n).padStart(2, "0");
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = (settings[phase] - timeLeft) / settings[phase];
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const color = phase === "study" ? "hsl(var(--primary))" : "#22c55e";
  const label = phase === "study" ? "Study" : "Break";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative p-8">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all font-bold text-sm uppercase tracking-widest"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Phase label */}
      <p className="text-muted-foreground font-black text-sm uppercase tracking-[0.3em] mb-10">{label}</p>

      {/* Ring */}
      <div className="relative flex items-center justify-center mb-10">
        <svg width="360" height="360" viewBox="0 0 360 360" className="-rotate-90">
          <circle cx="180" cy="180" r={RING_R} fill="none" stroke="currentColor"
            strokeWidth="8" className="text-muted/30" />
          <circle cx="180" cy="180" r={RING_R} fill="none" stroke={color}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.4s ease" }} />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                className="w-24 text-center font-black bg-transparent border-b-2 border-primary outline-none text-foreground tabular-nums text-6xl"
                value={editMins} maxLength={2}
                onChange={e => setEditMins(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && confirmEdit()}
                autoFocus
              />
              <span className="text-7xl font-black text-foreground">:</span>
              <input
                className="w-24 text-center font-black bg-transparent border-b-2 border-primary outline-none text-foreground tabular-nums text-6xl"
                value={editSecs} maxLength={2}
                onChange={e => setEditSecs(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && confirmEdit()}
              />
            </div>
          ) : (
            <button
              onClick={startEdit}
              className="font-black tabular-nums tracking-tighter text-foreground leading-none text-8xl hover:opacity-70 transition-opacity"
              title="Click to edit time"
            >
              {fmt(mins)}:{fmt(secs)}
            </button>
          )}
        </div>
      </div>

      {/* Session dots */}
      <div className="flex items-center gap-3 mb-10">
        {[0,1,2,3].map(i => (
          <div key={i} className={cn("w-3 h-3 rounded-full transition-all",
            i < sessionsCompleted % 4 ? "bg-primary scale-110" : "bg-muted-foreground/20")} />
        ))}
        {sessionsCompleted > 0 && (
          <span className="text-sm text-muted-foreground font-bold ml-2">{sessionsCompleted} sessions</span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6">
        <button onClick={reset}
          className="w-14 h-14 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
          <RotateCcw className="w-6 h-6" />
        </button>

        {editing ? (
          <button onClick={confirmEdit}
            className="flex items-center gap-2 h-16 px-10 rounded-full font-black text-lg uppercase tracking-widest gradient-primary text-primary-foreground shadow-lg hover:scale-105 transition-all">
            <Check className="w-5 h-5" /> Set
          </button>
        ) : (
          <button onClick={() => setIsActive(a => !a)}
            className={cn("flex items-center gap-2 h-16 px-12 rounded-full font-black text-lg uppercase tracking-widest shadow-lg hover:scale-105 transition-all",
              isActive ? "bg-destructive/90 text-destructive-foreground" : "gradient-primary text-primary-foreground")}>
            {isActive
              ? <><Pause className="w-5 h-5 fill-current" /> Pause</>
              : <><Play className="w-5 h-5 fill-current" /> Start</>}
          </button>
        )}

        <button onClick={advancePhase} title="Skip to next"
          className="w-14 h-14 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
          <SkipForward className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
