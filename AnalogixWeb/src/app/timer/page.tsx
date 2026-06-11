"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, RotateCcw, SkipForward, Check, ArrowLeft, Pencil, Timer, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { statsStore } from "@/utils/statsStore";
import { loadTimerState, saveTimerState, MAX_SESSIONS_TARGET, getDefaultTimerState } from "@/lib/timerStore";
import type { TimerPhase, TimerSettings, TimerState } from "@/lib/timerStore";

const RING_R = 140;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

export default function TimerPage() {
  const router = useRouter();
  const initialStateRef = useRef<TimerState>(getDefaultTimerState());
  const initialState = initialStateRef.current;
  const [settings, setSettings] = useState<TimerSettings>(initialState.settings);
  const [phase, setPhase] = useState<TimerPhase>(initialState.phase);
  const [timeLeft, setTimeLeft] = useState(initialState.timeLeft);
  const [isActive, setIsActive] = useState(initialState.isActive);
  const [sessionsCompleted, setSessionsCompleted] = useState(initialState.sessionsCompleted);
  const [sessionsTarget, setSessionsTarget] = useState(initialState.sessionsTarget);
  const [editing, setEditing] = useState(false);
  const [editingPhase, setEditingPhase] = useState<TimerPhase>("study");
  const [editMins, setEditMins] = useState("25");
  const [editSecs, setEditSecs] = useState("00");
  const [editingSessions, setEditingSessions] = useState(false);
  const [editSessionsValue, setEditSessionsValue] = useState(String(initialState.sessionsTarget));
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const phaseRef = useRef(phase);
  const settingsRef = useRef(settings);
  const sessionsTargetRef = useRef(sessionsTarget);
  const hasRecordedActivityRef = useRef(false);
  const timerStartedRef = useRef(false);
  phaseRef.current = phase;
  settingsRef.current = settings;
  sessionsTargetRef.current = sessionsTarget;

  useEffect(() => {
    const s = loadTimerState();
    setSettings(s.settings);
    setPhase(s.phase);
    setTimeLeft(s.timeLeft);
    setIsActive(s.isActive);
    setSessionsCompleted(s.sessionsCompleted);
    setSessionsTarget(s.sessionsTarget);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveTimerState({ phase, timeLeft, isActive, sessionsCompleted, sessionsTarget, settings, lastTick: Date.now() });
  }, [phase, timeLeft, isActive, sessionsCompleted, sessionsTarget, settings, hydrated]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "analogix_timer_state") {
        const s = loadTimerState();
        setSettings(s.settings);
        setPhase(s.phase);
        setTimeLeft(s.timeLeft);
        setIsActive(s.isActive);
        setSessionsCompleted(s.sessionsCompleted);
        setSessionsTarget(s.sessionsTarget);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const advancePhase = useCallback(() => {
    const current = phaseRef.current;
    const next: TimerPhase = current === "study" ? "break" : "study";
    if (current === "study") {
      setSessionsCompleted(s => s + 1);
      if (!hasRecordedActivityRef.current) {
        hasRecordedActivityRef.current = true;
        statsStore.recordActivity();
      }
    }
    setPhase(next);
    setIsActive(current === "study");
    setTimeLeft(settingsRef.current[next]);
  }, []);

  useEffect(() => {
    if (isActive) timerStartedRef.current = true;
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
    if (isActive) {
      toast.message("Pause the timer to edit durations.");
      return;
    }
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

  const startEditSessions = () => {
    if (isActive) {
      toast.message("Pause the timer to edit the session goal.");
      return;
    }
    setEditingSessions(true);
    setEditSessionsValue(String(sessionsTargetRef.current));
  };

  const confirmEditSessions = () => {
    const parsed = parseInt(editSessionsValue, 10);
    const next = Math.max(1, Math.min(MAX_SESSIONS_TARGET, Number.isFinite(parsed) ? parsed : 1));
    setSessionsTarget(next);
    setEditingSessions(false);
  };

  const fmt = (n: number) => String(n).padStart(2, "0");
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = (settings[phase] - timeLeft) / settings[phase];
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const color = phase === "study" ? "hsl(var(--primary))" : "#22c55e";
  const label = phase === "study" ? "Focus" : "Break";
  const cycleCount = sessionsTarget > 0 ? sessionsCompleted % sessionsTarget : 0;
  const effectiveCompleted = timerStartedRef.current ? sessionsCompleted : 0;
  const filledDots = cycleCount === 0 && effectiveCompleted > 0 ? sessionsTarget : cycleCount;

  return (
    <div className={cn(
      "min-h-screen flex flex-col items-center justify-center relative p-8 transition-colors duration-700",
      phase === "study" ? "bg-background" : "bg-emerald-950/5"
    )}>
      {/* Ambient gradient */}
      <div className={cn(
        "absolute inset-0 pointer-events-none transition-opacity duration-700",
        phase === "study"
          ? "bg-gradient-to-b from-primary/5 via-transparent to-transparent"
          : "bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent"
      )} />

      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all font-bold text-sm uppercase tracking-widest z-10"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Sessions completed badge */}
      {sessionsCompleted > 0 && (
        <div className="absolute top-6 right-6 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-border/50 text-xs font-bold text-muted-foreground">
          <Timer className="w-3.5 h-3.5" />
          {sessionsCompleted} session{sessionsCompleted !== 1 ? "s" : ""} done
        </div>
      )}

      {/* Phase label with icon */}
      <div className="flex items-center gap-3 mb-8 z-10">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          phase === "study" ? "bg-primary/15" : "bg-emerald-500/15"
        )}>
          {phase === "study" ? (
            <Timer className="w-4 h-4 text-primary" />
          ) : (
            <Coffee className="w-4 h-4 text-emerald-500" />
          )}
        </div>
        <p className={cn(
          "font-black text-sm uppercase tracking-[0.3em]",
          phase === "study" ? "text-primary" : "text-emerald-600"
        )}>{label}</p>
      </div>

      {/* Ring */}
      <div className="relative flex items-center justify-center mb-8 z-10">
        <svg width="360" height="360" viewBox="0 0 360 360" className="-rotate-90 drop-shadow-lg">
          <circle cx="180" cy="180" r={RING_R} fill="none" stroke="currentColor"
            strokeWidth="6" className="text-muted/10" />
          <circle cx="180" cy="180" r={RING_R} fill="none" stroke={color}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.4s ease" }}
            className="drop-shadow-sm" />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                className="w-24 text-center font-black bg-transparent border-b-2 border-primary outline-none text-foreground tabular-nums text-6xl"
                value={editMins} maxLength={2}
                onChange={e => setEditMins(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && confirmEdit()}
                autoFocus
              />
              <span className="text-7xl font-black text-foreground/80">:</span>
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
          {!editing && !isActive && (
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-1">
              Click to edit
            </span>
          )}
        </div>
      </div>

      {/* Session dots with labels */}
      <div className="flex flex-col items-center gap-3 mb-8 z-10">
        <div className="flex items-center gap-2.5">
          {Array.from({ length: sessionsTarget }, (_, i) => (
            <div
              key={i}
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-300",
                i < filledDots
                  ? "bg-primary scale-110 shadow-sm shadow-primary/30"
                  : "bg-muted-foreground/15"
              )}
            />
          ))}
          <div className="flex items-center gap-1.5 ml-3">
            {editingSessions ? (
              <div className="flex items-center gap-1.5">
                <input
                  className="w-12 text-center font-bold bg-transparent border-b-2 border-primary outline-none text-foreground tabular-nums text-sm"
                  value={editSessionsValue}
                  maxLength={2}
                  onChange={e => setEditSessionsValue(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={e => e.key === "Enter" && confirmEditSessions()}
                  autoFocus
                />
                <button
                  onClick={confirmEditSessions}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={startEditSessions}
                className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/50 hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                {sessionsTarget} sessions
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        {sessionsCompleted > 0 && (
          <p className="text-[11px] text-muted-foreground/50 font-medium">
            {sessionsCompleted} of {sessionsTarget} sessions completed
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6 z-10">
        <button onClick={reset}
          className="w-12 h-12 rounded-full flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-all"
          title="Reset">
          <RotateCcw className="w-5 h-5" />
        </button>

        {editing ? (
          <button onClick={confirmEdit}
            className="flex items-center gap-2 h-14 px-8 rounded-full font-black text-base uppercase tracking-widest bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:scale-105 transition-all">
            <Check className="w-5 h-5" /> Set
          </button>
        ) : (
          <button onClick={() => setIsActive(a => !a)}
            className={cn(
              "flex items-center gap-2.5 h-14 px-10 rounded-full font-black text-base uppercase tracking-widest shadow-lg hover:scale-105 transition-all duration-200",
              isActive
                ? "bg-destructive/90 text-destructive-foreground shadow-destructive/30"
                : "bg-primary text-primary-foreground shadow-primary/30"
            )}>
            {isActive
              ? <><Pause className="w-5 h-5 fill-current" /> Pause</>
              : <><Play className="w-5 h-5 fill-current" /> Start</>}
          </button>
        )}

        <button onClick={advancePhase} title="Skip to next"
          className="w-12 h-12 rounded-full flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-all">
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Settings row */}
      {!isActive && (
        <div className="mt-10 flex items-center gap-6 z-10">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
            <span>Study</span>
            <button onClick={() => { setEditingPhase("study"); setEditMins(String(Math.floor(settings.study / 60)).padStart(2, "0")); setEditSecs(String(settings.study % 60).padStart(2, "0")); setEditing(true); }}
              className="text-foreground/70 hover:text-foreground transition-colors">
              {fmt(Math.floor(settings.study / 60))}:{fmt(settings.study % 60)}
            </button>
          </div>
          <div className="w-6 h-px bg-muted-foreground/20" />
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
            <span>Break</span>
            <button onClick={() => { setEditingPhase("break"); setEditMins(String(Math.floor(settings.break / 60)).padStart(2, "0")); setEditSecs(String(settings.break % 60).padStart(2, "0")); setEditing(true); }}
              className="text-foreground/70 hover:text-foreground transition-colors">
              {fmt(Math.floor(settings.break / 60))}:{fmt(settings.break % 60)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
