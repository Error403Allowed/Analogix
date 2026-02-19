"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { getMoodProfile, getStoredMoodId, moodProfiles } from "@/utils/mood";

type DashboardPreferences = {
  name?: string;
  subjects?: string[];
  hobbyIds?: string[];
  hobbyDetails?: Record<string, string>;
  hobbies?: string[];
};

type DashboardAchievement = ReturnType<typeof achievementStore.getAll>[number];

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

const Dashboard = () => {
  const router = useRouter();
  const [showQuizCreator, setShowQuizCreator] = useState(false);
  const [quizCreatorMode, setQuizCreatorMode] = useState<'custom' | 'learning'>('custom');
  const [recentAchievements, setRecentAchievements] = useState<DashboardAchievement[]>([]);
  const [selectedMood, setSelectedMood] = useState(() => getStoredMoodId());
  const [userPrefs, setUserPrefs] = useState<DashboardPreferences>(() => readLocalStorageJson("userPreferences", {}));

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
  // Start Achievement Sync
  useAchievementChecker();

  const userName = userPrefs.name || "Student";
  const [statsData, setStatsData] = useState(() => statsStore.get());

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
    const handleStatsUpdate = () => {
      setStatsData(statsStore.get());
    };
    
    const handleAchievementsUpdate = () => {
      const latestUnlocked = achievementStore
        .getAll()
        .filter((achievement) => achievement.unlocked)
        .sort((a, b) => {
          const aTime = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
          const bTime = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
          return aTime - bTime;
        })
        .slice(-4);

      setRecentAchievements(latestUnlocked);
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
    const profile = getMoodProfile(selectedMood);
    applyThemeByName(profile.theme);
    localStorage.setItem("mood-theme", selectedMood);
    window.dispatchEvent(new Event("moodUpdated"));
  }, [selectedMood]);

  const moodProfile = getMoodProfile(selectedMood);

  const moodOptions = useMemo(
    () =>
      Object.entries(moodProfiles).map(([id, profile]) => ({
        id,
        label: profile.label
      })),
    []
  );


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

  const [moodChosen, setMoodChosen] = useState(() => {
    if (typeof window === "undefined") return false;
    // Show mood bar only if user has NEVER picked a mood (no key in storage)
    return !!localStorage.getItem("mood-theme");
  });

  return (
    <div className="min-h-full relative overflow-x-hidden flex flex-col">
      <div className="w-full relative z-10 flex-1 min-h-0 flex flex-col">

        <div className="flex flex-col gap-4 min-h-0 flex-1 overflow-y-auto pb-12 custom-scrollbar px-1">
            
            {/* Mood Bar — fades away once a mood is chosen */}
            <AnimatePresence>
            {!moodChosen && (
            <motion.div
              key="mood-bar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0, overflow: "hidden" }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
              className="dashboard-panel px-6 py-4"
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-6 flex-wrap flex-1 min-w-0">
                  <div className="shrink-0">
                    <div className="text-sm font-black uppercase tracking-[0.2em] text-foreground mb-1">Mood bar</div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Pick a vibe. The UI and tutor adapt.</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                    {moodOptions.map((mood) => {
                      const isActive = selectedMood === mood.id;
                      return (
                        <button
                          key={mood.id}
                          onClick={() => {
                            setSelectedMood(mood.id as keyof typeof moodProfiles);
                            setTimeout(() => setMoodChosen(true), 600);
                          }}
                          className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                            isActive
                              ? "border-primary bg-primary/10 text-primary shadow-sm"
                              : "border-white/5 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10"
                          }`}
                        >
                          {mood.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Button 
                  onClick={() => setShowQuizCreator(true)}
                  className="rounded-full gradient-primary font-black uppercase tracking-widest text-[10px] px-8 shadow-xl shrink-0"
                >
                  New Quiz
                </Button>
              </div>
            </motion.div>
            )}
            </AnimatePresence>

            {/* Top Section: Calendar + Timer */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
              {/* Calendar Section */}
              <motion.div variants={itemVariants} className="xl:col-span-7 dashboard-panel p-8 flex flex-col">
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  {moodProfile.dashboard.calendarTitle}
                </div>
                <div className="flex-1">
                   <CalendarWidget streak={normalizedStats.currentStreak} streakLabel={streakLabel} />
                </div>
              </motion.div>

              {/* Timer & Streak Column */}
              <div className="xl:col-span-5 flex flex-col gap-4">
                <motion.div variants={itemVariants} className="dashboard-panel p-6 flex flex-col items-center justify-center">
                   <TimerWidget />
                </motion.div>
                
                <motion.div 
                  variants={itemVariants}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="dashboard-panel p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group min-h-[140px] border border-amber-500/10 bg-amber-500/5 shadow-[0_20px_50px_rgba(245,158,11,0.05)]"
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
                </motion.div>
              </div>
            </div>

            {/* Middle Section: Subjects (Persistent & Prominent) */}
            <motion.div variants={itemVariants} className="dashboard-panel p-6">
               <SubjectGrid />
            </motion.div>

            {/* Bottom Section: AI Tutor + Quizzes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

              {/* AI Tutor */}
              <motion.div variants={itemVariants} className="dashboard-panel p-8 flex flex-col min-h-[500px]">
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-muted-foreground mb-8">
                  <Sparkles className="w-4 h-4 text-primary" />
                  AI Tutor
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-3xl font-black text-foreground mb-3 leading-tight tracking-tighter">Personal Study Assistant</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {moodProfile.dashboard.tutorSubtitle}
                    </p>
                  </div>
                  <div className="mt-8 space-y-4">
                    <div className="p-5 rounded-[2rem] bg-primary/5 border border-primary/10 shadow-inner">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Quick Action</p>
                      <p className="text-xs font-semibold text-foreground/80">I can explain complex topics through simple analogies. Just ask.</p>
                    </div>
                    <Button onClick={() => router.push("/chat")} className="w-full h-14 rounded-full gradient-primary font-black uppercase tracking-widest text-[11px] shadow-xl hover:scale-[1.02] transition-transform">
                      Continue Session
                    </Button>
                  </div>
                </div>
              </motion.div>

              {/* Quizzes */}
              <motion.div variants={itemVariants} className="dashboard-panel p-8 flex flex-col min-h-[500px]">
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-muted-foreground mb-8">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Knowledge Lab
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="mb-12">
                    <h4 className="text-3xl font-black text-foreground mb-3 leading-tight tracking-tighter">Test Your Limits</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">Challenge yourself with dynamic, AI-generated assessments tailored to your progress.</p>
                  </div>
                  <div className="mt-auto grid grid-cols-1 gap-4">
                    <Button
                      onClick={() => { setQuizCreatorMode('learning'); setShowQuizCreator(true); }}
                      className="h-14 rounded-full gradient-primary font-black uppercase tracking-widest text-[11px] shadow-xl hover:scale-[1.02] transition-transform"
                    >
                      Instant Assessment
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { setQuizCreatorMode('custom'); setShowQuizCreator(true); }}
                      className="h-14 rounded-full font-black uppercase tracking-widest text-[11px] bg-background/50 border-white/10 shadow-sm hover:bg-muted/50"
                    >
                      Create Custom Quiz
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
      <Dialog open={showQuizCreator} onOpenChange={setShowQuizCreator}>
        <DialogContent className="max-w-2xl bg-transparent border-none p-0 shadow-none">
           <DialogHeader className="hidden">
             <DialogTitle>Create Custom Quiz</DialogTitle>
           </DialogHeader>
           <QuizCreator 
             hideContentInput={quizCreatorMode === 'learning'}
             onCreateQuiz={(config) => {
               setShowQuizCreator(false);
               sessionStorage.setItem(
                 "pendingQuizConfig",
                 JSON.stringify({
                   topic: config.content,
                   subject: config.subject,
                   numQuestions: config.numQuestions,
                   timerDuration: config.timerDuration,
                 }),
               );
               router.push("/quiz");
             }} 
           />
        </DialogContent>
      </Dialog>
    </div>
  </div>
);
};

export default Dashboard;
