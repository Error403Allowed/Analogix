"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";

import { 
  Trophy,
  Zap,
  TrendingUp,
  MessageCircle,
  ArrowRight,
  Compass,
  Medal,
  Flag,
  Sparkles,
  Calendar as CalendarIcon,
  Laptop,
  Book,
  BookOpen,
  Plane,
  Target,
  Brain,
  Flame,
} from "lucide-react";
import { DashboardPanel } from "@/components/ui/panels";
import AchievementBadge from "@/components/AchievementBadge";
import QuizCreator from "@/components/QuizCreator";
import StudyGuideManager from "@/components/StudyGuideManager";
import CalendarWidget from "@/components/CalendarWidget";
import { TimerWidget } from "@/components/TimerWidget";
import { useRouter } from "next/navigation";
import { achievementStore } from "@/utils/achievementStore";
import { statsStore } from "@/utils/statsStore";
import type { UserStats } from "@/types/stats";
import { useAchievementChecker } from "@/hooks/useAchievementChecker";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { HOBBY_OPTIONS } from "@/utils/interests";
import { applyThemeByName } from "@/components/ThemeSelector";
import { activityLog, type DayActivity } from "@/utils/activityLog";
import TutorialOverlay from "@/components/TutorialOverlay";

type DashboardPreferences = {
  name?: string;
  subjects?: string[];
  hobbyIds?: string[];
  hobbyDetails?: Record<string, string>;
  hobbies?: string[];
};

type DashboardAchievement = Awaited<ReturnType<typeof achievementStore.getAll>>[number];

const readLocalStorageJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
};

const toNonNegativeInt = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
};

const toPercent = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
};

const normalizeSubjectCounts = (value: unknown): Record<string, number> => {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, number> = {};

  Object.entries(value as Record<string, unknown>).forEach(([key, rawCount]) => {
    const label = String(key || "").trim();
    if (!label) return;
    result[label] = toNonNegativeInt(rawCount);
  });

  return result;
};

const DAY_SH = ["S","M","T","W","T","F","S"];
const dayLabel = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`).getDay();
  return DAY_SH[d] || "";
};

const Sparkline = ({ data }: { data: number[] }) => {
  const W = 320;
  const H = 120;
  const pad = 8;
  if (data.length < 2) {
    return <div className="h-full flex items-center justify-center text-xs text-muted-foreground/60">No activity yet</div>;
  }
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = H - pad - (v / max) * (H - pad * 2);
    return { x, y };
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${pts[pts.length - 1].x} ${H - pad} L ${pts[0].x} ${H - pad} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="w-full h-full">
      <defs>
        <linearGradient id="weekly-sparkline" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#weekly-sparkline)" />
      <path d={line} fill="none" stroke="var(--chart-1)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 3} fill="white" stroke="var(--chart-1)" strokeWidth="2" />
      ))}
    </svg>
  );
};

const Dashboard = () => {
  const router = useRouter();
  const [showQuizCreator, setShowQuizCreator] = useState(false);
  const [quizCreatorMode, setQuizCreatorMode] = useState<'custom' | 'learning'>('custom');
  const [recentAchievements, setRecentAchievements] = useState<DashboardAchievement[]>([]);
  const [userPrefs, setUserPrefs] = useState<DashboardPreferences>(() => readLocalStorageJson("userPreferences", {}));
  const [showTutorial, setShowTutorial] = useState(false);
  const [weekActivity, setWeekActivity] = useState<DayActivity[]>([]);

  useEffect(() => {
    const handlePrefsUpdate = () => {
      setUserPrefs(readLocalStorageJson("userPreferences", {}));
    };
    window.addEventListener("userPreferencesUpdated", handlePrefsUpdate);
    window.addEventListener("storage", handlePrefsUpdate);
    return () => {
      window.removeEventListener("userPreferencesUpdated", handlePrefsUpdate);
      window.removeEventListener("storage", handlePrefsUpdate);
    };
  }, []);

  // Show tutorial once right after onboarding
  useEffect(() => {
    const tutorialDone = localStorage.getItem("tutorialComplete");
    if (!tutorialDone) {
      // Small delay so the dashboard has painted before the overlay appears
      const t = setTimeout(() => setShowTutorial(true), 600);
      return () => clearTimeout(t);
    }
  }, []);
  // Start Achievement Sync
  useAchievementChecker();

  const userName = userPrefs.name || "Student";
  const [statsData, setStatsData] = useState<import("@/utils/statsStore").UserStats>({
    quizzesDone: 0, currentStreak: 0, accuracy: 0,
    conversationsCount: 0, topSubject: "None", subjectCounts: {},
  });

  const normalizedStats = useMemo(() => {
    return {
      quizzesDone: toNonNegativeInt(statsData.quizzesDone),
      currentStreak: toNonNegativeInt(statsData.currentStreak),
      accuracy: toPercent(statsData.accuracy),
      conversationsCount: toNonNegativeInt(statsData.conversationsCount),
      subjectCounts: normalizeSubjectCounts(statsData.subjectCounts),
      topSubject: typeof statsData.topSubject === "string" ? statsData.topSubject : "None"
    } as UserStats;
  }, [statsData]);

  useEffect(() => {
    const handleStatsUpdate = async () => {
      const stats = await statsStore.get();
      setStatsData(stats);
      setWeekActivity(await activityLog.getLast7());
    };
    
    const handleAchievementsUpdate = async () => {
      try {
        const allAchievements = await achievementStore.getAll();
        const latestUnlocked = allAchievements
          .filter((achievement) => achievement.unlocked)
          .sort((a, b) => {
            const aTime = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
            const bTime = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
            return aTime - bTime;
          })
          .slice(-4);

        setRecentAchievements(latestUnlocked);
      } catch {
        setRecentAchievements([]);
      }
    };

    window.addEventListener("statsUpdated", handleStatsUpdate);
    window.addEventListener("achievementsUpdated", handleAchievementsUpdate);
    
    // Initial Load
    handleStatsUpdate();
    handleAchievementsUpdate();
    
    return () => {
      window.removeEventListener("statsUpdated", handleStatsUpdate);
      window.removeEventListener("achievementsUpdated", handleAchievementsUpdate);
    };
  }, [userName]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme") || "Cosmic Aurora";
    applyThemeByName(savedTheme);
  }, []);


  const subjectLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    SUBJECT_CATALOG.forEach((subject) => map.set(subject.id, subject.label));
    return map;
  }, []);

  const subjectIdByLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    SUBJECT_CATALOG.forEach((subject) => map.set(subject.label.toLowerCase(), subject.id));
    return map;
  }, []);

  const subjectLabels = useMemo(() => {
    const prefsSubjects = Array.isArray(userPrefs.subjects) ? userPrefs.subjects : [];
    if (prefsSubjects.length > 0) {
      const labels = prefsSubjects
        .map((id) => subjectLabelMap.get(id) || id)
        .map((value) => String(value || "").trim())
        .filter(Boolean);
      return Array.from(new Set(labels));
    }
    return Object.keys(normalizedStats.subjectCounts);
  }, [normalizedStats.subjectCounts, subjectLabelMap, userPrefs.subjects]);

  const subjectPerformance = useMemo(() => {
    const counts = normalizedStats.subjectCounts;
    const rows = subjectLabels.map((label) => ({
      label,
      count: counts[label] || counts[subjectIdByLabelMap.get(label.toLowerCase()) || ""] || 0
    }));
    const max = Math.max(1, ...rows.map((row) => row.count));
    return rows.map((row) => ({
      ...row,
      percent: Math.round((row.count / max) * 100)
    }));
  }, [normalizedStats.subjectCounts, subjectIdByLabelMap, subjectLabels]);

  const hasSubjectActivity = useMemo(
    () => subjectPerformance.some((subject) => subject.count > 0),
    [subjectPerformance]
  );

  const subjectPerformanceDesc = useMemo(
    () => [...subjectPerformance].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    [subjectPerformance]
  );

  const weakestSubjects = useMemo(() => {
    if (!hasSubjectActivity) return [];
    return [...subjectPerformance].sort((a, b) => a.count - b.count).slice(0, 2);
  }, [hasSubjectActivity, subjectPerformance]);

  const activityLabel = normalizedStats.conversationsCount === 1 ? "analogy" : "analogies";
  const streakLabel = normalizedStats.currentStreak === 1 ? "day" : "days";

  const hobbyIconMap = useMemo(
    () => ({
      tech: Laptop,
      reading: Book,
      travel: Plane
    }),
    []
  );

  const hobbyIdToLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    HOBBY_OPTIONS.forEach((hobby) => map.set(hobby.id, hobby.label));
    return map;
  }, []);

  const hobbyLabelToIdMap = useMemo(() => {
    const map = new Map<string, string>();
    HOBBY_OPTIONS.forEach((hobby) => map.set(hobby.label.toLowerCase(), hobby.id));
    return map;
  }, []);

  const interestCards = useMemo(() => {
    const hobbyIds = Array.isArray(userPrefs.hobbyIds) ? userPrefs.hobbyIds : [];
    const hobbies = Array.isArray(userPrefs.hobbies) ? userPrefs.hobbies : [];
    const unique = new Map<string, string>();

    if (hobbyIds.length > 0) {
      hobbyIds.forEach((id) => {
        const label = hobbyIdToLabelMap.get(id) || id;
        const normalized = label.trim();
        if (!normalized) return;
        unique.set(normalized.toLowerCase(), normalized);
      });
    }

    if (hobbies.length > 0) {
      hobbies.forEach((entry: string) => {
        const baseLabel = entry.split("(")[0]?.trim() || entry.trim();
        if (!baseLabel) return;
        unique.set(baseLabel.toLowerCase(), baseLabel);
      });
    }

    return Array.from(unique.entries()).map(([normalizedLabel, label]) => {
      const hobbyId = hobbyLabelToIdMap.get(normalizedLabel);
      const icon = hobbyId ? hobbyIconMap[hobbyId as keyof typeof hobbyIconMap] || Sparkles : Sparkles;
      return { label, icon };
    });
  }, [hobbyIconMap, hobbyIdToLabelMap, hobbyLabelToIdMap, userPrefs.hobbies, userPrefs.hobbyIds]);

  const weeklyCounts = useMemo(() => weekActivity.map((d) => d.count), [weekActivity]);
  const weeklyTotal = useMemo(() => weeklyCounts.reduce((sum, v) => sum + v, 0), [weeklyCounts]);

  const handleTutorialComplete = useCallback(() => {
    localStorage.setItem("tutorialComplete", "1");
    setShowTutorial(false);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 30 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { 
        type: "spring" as const,
        stiffness: 100,
        damping: 15
      }
    }
  };

  const statCardVariants = {
    hover: { 
      scale: 1.02, 
      y: -5,
      transition: { type: "spring" as const, stiffness: 400, damping: 10 }
    }
  };

  return (
    <>
    <div className="min-h-full relative overflow-x-hidden flex flex-col">
      <div className="w-full relative z-10 flex-1 min-h-0 flex flex-col">       
        <div className="flex flex-col gap-6 min-h-0 flex-1 overflow-y-auto pt-6 pb-6 custom-scrollbar px-6">

          {/* ── Page heading ─────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-muted-foreground/60 mb-0.5">Welcome back</p>
              <h1 className="text-3xl font-display font-black text-foreground tracking-tight leading-none">{userName}</h1>
            </div>
            <div className="text-right">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60">Today</p>
              <p className="text-sm font-bold text-foreground">{new Date().toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}</p>
            </div>
          </div>

          {/* ── Stats row ────────────────────────────────────────── */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 xl:grid-cols-4 gap-3 items-stretch"
          >
            {/* Streak */}
            <motion.div variants={itemVariants} whileHover={statCardVariants.hover} className="h-full">
              <DashboardPanel className="h-full p-5 relative overflow-hidden group border border-amber-500/15 bg-amber-500/5">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[var(--radius)]" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center shadow-inner">
                      <Zap className="w-5 h-5 text-amber-500 fill-amber-500/30" />
                    </div>
                    {normalizedStats.currentStreak > 0 && (
                      <div className="flex gap-0.5 items-center">
                        {Array.from({ length: Math.min(normalizedStats.currentStreak, 7) }, (_, i) => (
                          <div key={i} className={`rounded-full transition-all ${i < Math.min(normalizedStats.currentStreak, 7) ? "w-1.5 h-3 bg-amber-500" : "w-1.5 h-1.5 bg-amber-500/20"}`}
                            style={{ height: `${6 + (i / Math.min(normalizedStats.currentStreak, 7)) * 10}px` }} />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-3xl font-display font-black text-foreground tracking-tighter leading-none mb-1">{normalizedStats.currentStreak}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/80">{streakLabel} streak</p>
                  <div className="mt-3 flex gap-1 items-end">
                    {weekActivity.length > 0
                      ? weekActivity.map((d, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                            <div className={`w-full rounded-sm transition-all ${d.count > 0 ? "bg-amber-500" : "bg-amber-500/15"}`}
                              style={{ height: `${d.count > 0 ? Math.max(4, Math.min(16, 4 + d.count * 3)) : 4}px` }} />
                            <span className="text-[8px] text-muted-foreground/40 font-bold">{dayLabel(d.date)}</span>
                          </div>
                        ))
                      : Array.from({ length: 7 }, (_, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                            <div className="w-full rounded-sm bg-amber-500/15" style={{ height: "4px" }} />
                            <span className="text-[8px] text-muted-foreground/40 font-bold">{DAY_SH[i]}</span>
                          </div>
                        ))
                    }
                  </div>
                </div>
              </DashboardPanel>
            </motion.div>

            {/* Quizzes done */}
            <motion.div variants={itemVariants} whileHover={statCardVariants.hover} className="h-full">
              <DashboardPanel className="h-full p-5 relative overflow-hidden group border border-primary/10 bg-primary/5">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[var(--radius)]" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center shadow-inner mb-3">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-3xl font-display font-black text-foreground tracking-tighter leading-none mb-1">{normalizedStats.quizzesDone}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">Quizzes done</p>
                </div>
              </DashboardPanel>
            </motion.div>

            {/* Accuracy */}
            <motion.div variants={itemVariants} whileHover={statCardVariants.hover} className="h-full">
              <DashboardPanel className="h-full p-5 relative overflow-hidden group border border-emerald-500/15 bg-emerald-500/5">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[var(--radius)]" />
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center shadow-inner mb-3">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-3xl font-display font-black text-foreground tracking-tighter leading-none mb-1">{normalizedStats.accuracy}<span className="text-lg text-muted-foreground font-bold">%</span></p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/80">Accuracy</p>
                  {normalizedStats.accuracy > 0 && (
                    <div className="mt-3 h-1.5 bg-emerald-500/15 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${normalizedStats.accuracy}%` }} />
                    </div>
                  )}
                </div>
              </DashboardPanel>
            </motion.div>

            {/* Analogies / conversations */}
            <motion.div variants={itemVariants} whileHover={statCardVariants.hover} className="h-full">
              <DashboardPanel className="h-full p-5 relative overflow-hidden group border border-violet-500/15 bg-violet-500/5">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[var(--radius)]" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-10 h-10 rounded-2xl bg-violet-500/15 flex items-center justify-center shadow-inner mb-3">
                    <Brain className="w-5 h-5 text-violet-500" />
                  </div>
                  <p className="text-3xl font-display font-black text-foreground tracking-tighter leading-none mb-1">{normalizedStats.conversationsCount}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-500/80">{activityLabel}</p>
                  {normalizedStats.topSubject && normalizedStats.topSubject !== "None" && (
                    <div className="mt-3">
                      <span className="text-[9px] text-violet-500/70 font-bold">Most discussed: </span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-500 font-bold">
                        {normalizedStats.topSubject}
                      </span>
                    </div>
                  )}
                </div>
              </DashboardPanel>
            </motion.div>
          </motion.div>

          {/* ── Calendar + Timer ─────────────────────────────────── */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch"
          >
            <DashboardPanel
              as={motion.div}
              variants={itemVariants}
              data-tutorial="calendar"
              className="xl:col-span-7 p-6 flex flex-col"
            >
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">
                <CalendarIcon className="w-4 h-4 text-primary" />
                Calendar
              </div>
              <div className="flex-1 min-h-0">
                <CalendarWidget streak={normalizedStats.currentStreak} streakLabel={streakLabel} />
              </div>
            </DashboardPanel>

            <div className="xl:col-span-5 flex flex-col gap-4">
              <DashboardPanel
                as={motion.div}
                variants={itemVariants}
                data-tutorial="timer"
                className="flex-1 p-6 flex flex-col items-center justify-center"
              >
                <TimerWidget />
              </DashboardPanel>

              {/* Weekly activity sparkline */}
              {weeklyTotal > 0 && (
                <DashboardPanel as={motion.div} variants={itemVariants} className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">This week</p>
                    <p className="text-[10px] font-black text-primary">{weeklyTotal} sessions</p>
                  </div>
                  <div className="h-16">
                    <Sparkline data={weeklyCounts} />
                  </div>
                </DashboardPanel>
              )}
            </div>
          </motion.div>

          {/* ── Subject performance ──────────────────────────────── */}
          {hasSubjectActivity && (
            <DashboardPanel as={motion.div} variants={itemVariants} className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Subject activity</h3>
              </div>
              <div className="space-y-3">
                {subjectPerformanceDesc.map(s => (
                  <div key={s.label} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{s.label}</span>
                      <span className="text-[10px] font-black text-muted-foreground">{s.count} sessions</span>
                    </div>
                    <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${s.percent}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </DashboardPanel>
          )}

          {/* ── Study Guides ─────────────────────────────────────── */}
          <DashboardPanel as={motion.div} variants={itemVariants} className="p-6">
            <StudyGuideManager />
          </DashboardPanel>

        </div>
      </div>
    </div>

    {showTutorial && <TutorialOverlay onComplete={handleTutorialComplete} />}
    </>
  );
};

export default Dashboard;
