"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, SkipForward, Timer as TimerIcon, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TimerMode = "pomodoro" | "shortBreak" | "longBreak";

const MODES: Record<TimerMode, { label: string; shortLabel: string; duration: number }> = {
  pomodoro:   { label: "Focus",       shortLabel: "Focus",  duration: 25 * 60 },
  shortBreak: { label: "Short Break", shortLabel: "Break",  duration: 5 * 60  },
  longBreak:  { label: "Long Break",  shortLabel: "Long",   duration: 15 * 60 },
};

const MODE_COLORS: Record<TimerMode, string> = {
  pomodoro:   "hsl(var(--primary))",
  shortBreak: "#22c55e",
  longBreak:  "#f59e0b",
};

const RING_R = 54;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

function loadDurations(): Record<TimerMode, number> {
  try {
    const s = typeof window !== "undefined" && localStorage.getItem("timerDurations2");
    return s ? JSON.parse(s) : { pomodoro: 25*60, shortBreak: 5*60, longBreak: 15*60 };
  } catch { return { pomodoro: 25*60, shortBreak: 5*60, longBreak: 15*60 }; }
}

export function TimerWidget() {
  const [mode, setMode] = useState<TimerMode>("pomodoro");
  const [durations, setDurations] = useState<Record<TimerMode, number>>(loadDurations);
  const [timeLeft, setTimeLeft] = useState(() => loadDurations().pomodoro);
  const [isActive, setIsActive] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editMins, setEditMins] = useState("25");
  const [editSecs, setEditSecs] = useState("00");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    localStorage.setItem("timerDurations2", JSON.stringify(durations));
  }, [durations]);

  const advanceMode = useCallback(() => {
    const current = modeRef.current;
    const nextSessions = current === "pomodoro" ? sessions + 1 : sessions;
    if (current === "pomodoro") setSessions(nextSessions);
    const next: TimerMode = current === "pomodoro"
      ? nextSessions % 4 === 0 ? "longBreak" : "shortBreak"
      : "pomodoro";
    setMode(next);
    setIsActive(false);
    setTimeLeft(durations[next]);
    toast.success(next === "pomodoro" ? "Break done — back to it! 🎯" : "Focus session done! Take a breather 🌿");
  }, [sessions, durations]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      setIsActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
      advanceMode();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, timeLeft, advanceMode]);

  const changeMode = (m: TimerMode) => {
    setMode(m); setIsActive(false); setTimeLeft(durations[m]);
  };

  const reset = () => { setIsActive(false); setTimeLeft(durations[mode]); };
  const skip  = () => advanceMode();

  const startEdit = () => {
    setIsActive(false);
    setEditMins(String(Math.floor(timeLeft / 60)).padStart(2, "0"));
    setEditSecs(String(timeLeft % 60).padStart(2, "0"));
    setEditing(true);
  };

  const confirmEdit = () => {
    const m = Math.max(0, Math.min(99, parseInt(editMins) || 0));
    const s = Math.max(0, Math.min(59, parseInt(editSecs) || 0));
    const total = m * 60 + s || 1;
    setDurations(p => ({ ...p, [mode]: total }));
    setTimeLeft(total);
    setEditing(false);
  };

  const fmt = (n: number) => String(n).padStart(2, "0");
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = (durations[mode] - timeLeft) / durations[mode];
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const color = MODE_COLORS[mode];

  return (
    <div className="flex flex-col space-y-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-muted-foreground font-black text-sm uppercase tracking-[0.2em] flex items-center gap-2">
          <TimerIcon className="w-4 h-4 text-primary" />
          Focus Timer
        </h3>
        {/* Session dots */}
        <div className="flex items-center gap-1.5">
          {[0,1,2,3].map(i => (
            <div key={i} className={cn("w-2 h-2 rounded-full transition-all",
              i < sessions % 4 ? "bg-primary scale-110" : "bg-muted-foreground/20")} />
          ))}
          {sessions > 0 && <span className="text-[10px] text-muted-foreground font-bold ml-1">{sessions}</span>}
        </div>
      </div>

      <div className="glass-card p-6 flex flex-col items-center bg-background/40 gap-4">
        {/* Mode tabs */}
        <div className="flex gap-1 bg-muted/30 rounded-full p-1 w-full">
          {(Object.keys(MODES) as TimerMode[]).map(m => (
            <button key={m} onClick={() => changeMode(m)}
              className={cn("flex-1 text-[10px] font-black uppercase tracking-widest py-1.5 rounded-full transition-all",
                mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {MODES[m].shortLabel}
            </button>
          ))}
        </div>

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
                <input
                  className="w-10 text-center text-2xl font-black bg-transparent border-b border-primary outline-none text-foreground tabular-nums"
                  value={editMins} maxLength={2}
                  onChange={e => setEditMins(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={e => e.key === "Enter" && confirmEdit()}
                  autoFocus
                />
                <span className="text-2xl font-black text-foreground">:</span>
                <input
                  className="w-10 text-center text-2xl font-black bg-transparent border-b border-primary outline-none text-foreground tabular-nums"
                  value={editSecs} maxLength={2}
                  onChange={e => setEditSecs(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={e => e.key === "Enter" && confirmEdit()}
                />
              </div>
            ) : (
              <button onClick={startEdit} className="group flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                <span className="text-3xl font-black tabular-nums tracking-tighter text-foreground leading-none">
                  {fmt(mins)}:{fmt(secs)}
                </span>
                <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
              </button>
            )}
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {MODES[mode].label}
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
        </div>
      </div>
    </div>
  );
}
