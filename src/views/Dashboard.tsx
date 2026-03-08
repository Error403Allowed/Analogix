"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, Zap, Target, Brain, Flame,
} from "lucide-react";
import { DashboardPanel } from "@/components/ui/panels";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { TimerWidget } from "@/components/TimerWidget";
import UpcomingEvents from "@/components/UpcomingEvents";
import RecentDocs from "@/components/RecentDocs";
import QuickLinks from "@/components/QuickLinks";
import { useRouter } from "next/navigation";
import { achievementStore } from "@/utils/achievementStore";
import { statsStore } from "@/utils/statsStore";
import type { UserStats } from "@/types/stats";
import { useAchievementChecker } from "@/hooks/useAchievementChecker";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { applyThemeByName } from "@/components/ThemeSelector";
import { activityLog, type DayActivity } from "@/utils/activityLog";
import TutorialOverlay from "@/components/TutorialOverlay";

// ── helpers ──────────────────────────────────────────────────────────────────

const readJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const p = JSON.parse(raw);
    return (p !== null && typeof p === "object") ? (p as T) : fallback;
  } catch { return fallback; }
};

const toInt   = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0; };
const toPct   = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0; };

const DAY_SH  = ["S","M","T","W","T","F","S"];
const dayLabel = (iso: string) => DAY_SH[new Date(`${iso}T12:00:00`).getDay()] || "";

// ── Dashboard ─────────────────────────────────────────────────────────────────

type Prefs = { name?: string; subjects?: string[] };

export default function Dashboard() {
  const router = useRouter();
  useAchievementChecker();

  const [prefs,        setPrefs]        = useState<Prefs>(() => readJson("userPreferences", {}));
  const [stats,        setStats]        = useState<UserStats>({ quizzesDone:0, currentStreak:0, accuracy:0, conversationsCount:0, topSubject:"None", subjectCounts:{} });
  const [weekActivity, setWeekActivity] = useState<DayActivity[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);

  // prefs listener
  useEffect(() => {
    const update = () => setPrefs(readJson("userPreferences", {}));
    window.addEventListener("userPreferencesUpdated", update);
    window.addEventListener("storage", update);
    return () => { window.removeEventListener("userPreferencesUpdated", update); window.removeEventListener("storage", update); };
  }, []);

  // tutorial
  useEffect(() => {
    if (!localStorage.getItem("tutorialComplete")) {
      const t = setTimeout(() => setShowTutorial(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  // stats
  useEffect(() => {
    const refresh = async () => {
      setStats(await statsStore.get());
      setWeekActivity(await activityLog.getLast7());
    };
    refresh();
    window.addEventListener("statsUpdated", refresh);
    return () => window.removeEventListener("statsUpdated", refresh);
  }, []);

  // theme
  useEffect(() => {
    applyThemeByName(localStorage.getItem("app-theme") || "Cosmic Aurora");
  }, []);

  // derived
  const qs  = toInt(stats.quizzesDone);
  const str = toInt(stats.currentStreak);
  const acc = toPct(stats.accuracy);
  const con = toInt(stats.conversationsCount);
  const userName = prefs.name || "Student";

  const weeklyCounts = useMemo(() => weekActivity.map(d => d.count), [weekActivity]);

  const handleTutorialComplete = useCallback(() => {
    localStorage.setItem("tutorialComplete", "1");
    setShowTutorial(false);
  }, []);

  // ── Stat cards config ────────────────────────────────────────────────────

  const statCards = [
    {
      label: "Day streak",
      value: str,
      suffix: null,
      colour: "amber",
      icon: Zap,
      iconFill: true,
      extra: (
        <div className="flex gap-0.5 items-end mt-2">
          {weekActivity.length > 0
            ? weekActivity.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className={`w-full rounded-sm ${d.count > 0 ? "bg-amber-500" : "bg-amber-500/15"}`}
                    style={{ height: `${d.count > 0 ? Math.max(3, Math.min(12, 3 + d.count * 2)) : 3}px` }} />
                  <span className="text-[7px] text-muted-foreground/40 font-bold">{dayLabel(d.date)}</span>
                </div>))
            : Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full rounded-sm bg-amber-500/15" style={{ height: "3px" }} />
                  <span className="text-[7px] text-muted-foreground/40 font-bold">{DAY_SH[i]}</span>
                </div>))
          }
        </div>
      ),
    },
    {
      label: "Quizzes done",
      value: qs,
      suffix: null,
      colour: "primary",
      icon: Target,
      iconFill: false,
      extra: null,
    },
    {
      label: "Accuracy",
      value: acc,
      suffix: "%",
      colour: "emerald",
      icon: TrendingUp,
      iconFill: false,
      extra: acc > 0 ? (
        <div className="mt-2 h-1 bg-emerald-500/15 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${acc}%` }} />
        </div>
      ) : null,
    },
    {
      label: "Analogies",
      value: con,
      suffix: null,
      colour: "violet",
      icon: Brain,
      iconFill: false,
      extra: null,
    },
  ] as const;

  const colourMap = {
    amber:   { bg: "bg-amber-500/5 border-amber-500/15",    icon: "bg-amber-500/15",  text: "text-amber-500"   },
    primary: { bg: "bg-primary/5 border-primary/10",        icon: "bg-primary/15",    text: "text-primary"     },
    emerald: { bg: "bg-emerald-500/5 border-emerald-500/15",icon: "bg-emerald-500/15",text: "text-emerald-500" },
    violet:  { bg: "bg-violet-500/5 border-violet-500/15",  icon: "bg-violet-500/15", text: "text-violet-500"  },
  } as const;

  // ── Layout ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* FULL VIEWPORT — no scroll */}
      <div className="h-screen flex flex-col overflow-hidden px-5 pt-5 pb-4 gap-3">

        {/* ── Greeting ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/50 leading-none mb-0.5">
              Welcome back
            </p>
            <h1 className="text-2xl font-display font-black text-foreground tracking-tight leading-none">
              {userName}
            </h1>
          </div>
          <p className="text-xs font-semibold text-muted-foreground/50">
            {new Date().toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}
          </p>
        </div>

        {/* ── Stat cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3 shrink-0">
          {statCards.map(card => {
            const c = colourMap[card.colour];
            const Icon = card.icon;
            return (
              <DashboardPanel
                key={card.label}
                className={`p-4 border ${c.bg}`}
              >
                <div className={`w-7 h-7 rounded-xl ${c.icon} flex items-center justify-center mb-2`}>
                  <Icon className={`w-3.5 h-3.5 ${c.text}`} />
                </div>
                <p className="text-2xl font-display font-black text-foreground tracking-tighter leading-none">
                  {card.value}
                  {card.suffix && <span className="text-base text-muted-foreground">{card.suffix}</span>}
                </p>
                <p className={`text-[9px] font-black uppercase tracking-[0.18em] mt-0.5 ${c.text}`}>
                  {card.label}
                </p>
                {card.extra}
              </DashboardPanel>
            );
          })}
        </div>

        {/* ── Main content: 3 columns, flex-1 fills remaining height ─── */}
        <div className="flex-1 min-h-0 grid grid-cols-12 gap-3">

          {/* COL 1: Timer + Quick links */}
          <div className="col-span-3 flex flex-col gap-3 min-h-0">
            <DashboardPanel className="p-4 shrink-0 z-20 overflow-visible" data-tutorial="timer">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-2">
                Pomodoro
              </p>
              <TimerWidget compact />
            </DashboardPanel>

            {/* Quick nav */}
            <DashboardPanel className="flex-1 p-4 min-h-0 overflow-visible">
              <QuickLinks />
            </DashboardPanel>
          </div>

          {/* COL 2: Recent docs — largest column */}
          <DashboardPanel
            className="col-span-5 p-4 flex flex-col min-h-0"
            data-tutorial="docs"
          >
            <RecentDocs />
          </DashboardPanel>

          {/* COL 3: Upcoming events */}
          <DashboardPanel
            className="col-span-4 p-4 flex flex-col min-h-0"
            data-tutorial="calendar"
          >
            <UpcomingEvents />
          </DashboardPanel>

        </div>
      </div>

      {showTutorial && <TutorialOverlay onComplete={handleTutorialComplete} />}
    </>
  );
}
