"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Timer as TimerIcon, Coffee, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak' | 'basic';

const DEFAULT_MODES: Record<TimerMode, { label: string; duration: number }> = {
  pomodoro: { label: "Study Session", duration: 25 * 60 },
  shortBreak: { label: "Short Break", duration: 5 * 60 },
  longBreak: { label: "Long Break", duration: 15 * 60 },
  basic: { label: "Focus Session", duration: 50 * 60 },
};

export function TimerWidget() {
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [customDurations, setCustomDurations] = useState<Record<TimerMode, number>>(() => {
    if (typeof window === "undefined") return {
      pomodoro: DEFAULT_MODES.pomodoro.duration,
      shortBreak: DEFAULT_MODES.shortBreak.duration,
      longBreak: DEFAULT_MODES.longBreak.duration,
      basic: DEFAULT_MODES.basic.duration,
    };
    const saved = localStorage.getItem("timerDurations");
    return saved ? JSON.parse(saved) : {
      pomodoro: DEFAULT_MODES.pomodoro.duration,
      shortBreak: DEFAULT_MODES.shortBreak.duration,
      longBreak: DEFAULT_MODES.longBreak.duration,
      basic: DEFAULT_MODES.basic.duration,
    };
  });

  const [timeLeft, setTimeLeft] = useState(customDurations[mode]);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    localStorage.setItem("timerDurations", JSON.stringify(customDurations));
  }, [customDurations]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
      toast.success("Timer finished!", {
        description: `${DEFAULT_MODES[mode].label} is complete.`
      });
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, mode]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(customDurations[mode]);
  };

  const changeMode = (newMode: TimerMode) => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(customDurations[newMode]);
  };

  const adjustDuration = (amount: number) => {
    setCustomDurations(prev => {
      const newDuration = Math.max(60, prev[mode] + amount); // Min 1 min
      setTimeLeft(newDuration);
      setIsActive(false);
      return { ...prev, [mode]: newDuration };
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((customDurations[mode] - timeLeft) / customDurations[mode]) * 100;

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-muted-foreground font-black text-sm uppercase tracking-[0.2em] flex items-center gap-2">
          <TimerIcon className="w-4 h-4 text-primary" />
          Focus Timer
        </h3>
        <div className="flex gap-1.5">
          {['pomodoro', 'shortBreak', 'basic'].map((m) => (
            <button
              key={m}
              onClick={() => changeMode(m as TimerMode)}
              className={cn(
                "text-[10px] font-bold px-3 py-1.5 rounded-full transition-all",
                mode === m ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {m === 'pomodoro' ? 'Pomodoro' : m === 'shortBreak' ? 'Break' : 'Focus'}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card p-12 flex flex-col items-center justify-center relative overflow-hidden bg-background/40 w-full">
        <div className="mb-6 text-center">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-2">{DEFAULT_MODES[mode].label}</p>
            <div className="flex items-center gap-6">
                <button 
                  onClick={() => adjustDuration(-60)}
                  className="w-10 h-10 rounded-full border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
                >
                  <span className="text-xl font-bold">-</span>
                </button>
                <div className="text-6xl font-black text-foreground font-display tabular-nums tracking-tighter">
                    {formatTime(timeLeft)}
                </div>
                <button 
                  onClick={() => adjustDuration(60)}
                  className="w-10 h-10 rounded-full border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
                >
                  <span className="text-xl font-bold">+</span>
                </button>
            </div>
        </div>

        <div className="w-full mb-8">
            <Progress value={progress} className="h-1.5 w-full bg-primary/10" />
        </div>

        <div className="flex items-center gap-4">
          <Button
            size="icon"
            variant="ghost"
            onClick={resetTimer}
            className="rounded-full h-12 w-12 hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
          <Button
            size="lg"
            onClick={toggleTimer}
            className={cn(
              "rounded-full h-16 px-10 font-black text-lg shadow-2xl hover:scale-105 transition-all",
              isActive ? "bg-destructive text-destructive-foreground" : "gradient-primary text-primary-foreground"
            )}
          >
            {isActive ? <Pause className="mr-2 w-6 h-6 fill-current" /> : <Play className="mr-2 w-6 h-6 fill-current" />}
            {isActive ? "Pause" : "Start"}
          </Button>
        </div>
        
        {/* Subtle background icon */}
        <div className="absolute -bottom-10 -right-10 opacity-[0.03] pointer-events-none rotate-12">
            {mode === 'pomodoro' ? <Brain className="w-48 h-48" /> : <Coffee className="w-48 h-48" />}
        </div>
      </div>
    </div>
  );
}

// Helper to fix missing cn in the file snippet
import { cn } from "@/lib/utils";
