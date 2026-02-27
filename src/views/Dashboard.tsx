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
  Plane
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DashboardPanel } from "@/components/ui/panels";
import Header from "@/components/Header";
import AchievementBadge from "@/components/AchievementBadge";
import QuizCreator from "@/components/QuizCreator";
import ExamManager from "@/components/ExamManager";
import CalendarWidget from "@/components/CalendarWidget";
import { TimerWidget } from "@/components/TimerWidget";
import { SubjectGrid } from "@/components/SubjectGrid";
import { useRouter } from "next/navigation";
import { achievementStore } from "@/utils/achievementStore";
import { statsStore } from "@/utils/statsStore";
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
      subjectCounts: normalizeSubjectCounts(statsData.subjectCounts)
    };
  }, [statsData]);

  useEffect(() => {
    const handleStatsUpdate = async () => {
      const stats = await statsStore.get();
      setStatsData(stats);
      setWeekActivity(activityLog.getLast7());
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
    setWeekActivity(activityLog.getLast7());
    
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
        <div className="flex flex-col gap-4 min-h-0 flex-1 overflow-y-auto pt-4 pb-6 custom-scrollbar px-4">

            {/* Top Section: Calendar + Timer — equal height via items-stretch */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
              {/* Calendar Section */}
              <DashboardPanel
                as={motion.div}
                variants={itemVariants}
                data-tutorial="calendar"
                className="xl:col-span-7 p-6 flex flex-col min-h-0"
              >
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  Calendar
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                   <CalendarWidget streak={normalizedStats.currentStreak} streakLabel={streakLabel} />
                </div>
              </DashboardPanel>

              {/* Timer & Streak Column — this drives the shared height */}
              <div className="xl:col-span-5 flex flex-col gap-4">
                <DashboardPanel
                  as={motion.div}
                  variants={itemVariants}
                  data-tutorial="timer"
                  className="flex-1 p-6 flex flex-col items-center justify-center"
                >
                   <TimerWidget />
                </DashboardPanel>
                
                <DashboardPanel
                  as={motion.div}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02, y: -5 }}
                  data-tutorial="streak"
                  className="p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group border border-amber-500/10 bg-amber-500/5 shadow-[0_20px_50px_rgba(245,158,11,0.05)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-14 h-14 rounded-[2rem] bg-amber-500/10 flex items-center justify-center mb-3 relative z-10 shadow-lg shadow-amber-500/10 group-hover:scale-110 transition-transform">
                    <Zap className="w-7 h-7 text-amber-500 fill-amber-500/20" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-4xl font-black text-foreground mb-0.5 tracking-tighter">
                      {normalizedStats.currentStreak}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/80">
                      {streakLabel} Active Streak
                    </p>
                  </div>
                </DashboardPanel>
              </div>
            </div>

            {/* Middle Section: Subjects (Persistent & Prominent) */}
            <DashboardPanel
              as={motion.div}
              variants={itemVariants}
              data-tutorial="subjects"
              className="p-6"
            >
               <SubjectGrid />
            </DashboardPanel>
            
          </div>
    </div>
  </div>

  {/* Tutorial — shown once right after onboarding */}
  {showTutorial && <TutorialOverlay onComplete={handleTutorialComplete} />}
  </>
  );
};

export default Dashboard;
