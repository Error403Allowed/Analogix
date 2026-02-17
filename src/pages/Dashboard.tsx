"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Trophy,
  Target,
  Zap,
  TrendingUp,
  MessageCircle,
  ArrowRight,
  Compass,
  Medal,
  Flag,
  Sparkles,
  Calendar,
  Dumbbell,
  Gamepad2,
  Music,
  CookingPot,
  Palette,
  Film,
  Leaf,
  Laptop,
  Book,
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
  const [showInsights, setShowInsights] = useState(false);
  
  // Start Achievement Sync
  useAchievementChecker();

  const userPrefs = readLocalStorageJson<DashboardPreferences>("userPreferences", {});
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

  const masteryPercent = useMemo(() => {
    if (normalizedStats.quizzesDone > 0) {
      return normalizedStats.accuracy;
    }
    return 0;
  }, [normalizedStats.accuracy, normalizedStats.quizzesDone]);

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
      sports: Dumbbell,
      gaming: Gamepad2,
      music: Music,
      cooking: CookingPot,
      art: Palette,
      movies: Film,
      nature: Leaf,
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
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="h-[100dvh] bg-background dashboard-stage pb-2 relative overflow-x-hidden flex flex-col">
      {/* Background Decor */}
      <div className="liquid-blob w-[500px] h-[500px] bg-primary/20 -top-48 -left-48 fixed blur-3xl opacity-20" />
      <div className="liquid-blob w-[400px] h-[400px] bg-accent/20 bottom-20 right-10 fixed blur-3xl opacity-20" style={{ animationDelay: "-3s" }} />
      
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="w-full pt-3 relative z-10 flex-1 min-h-0 flex flex-col">

        {/* Mood Bar */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="dashboard-panel px-4 py-3 mb-2"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">Mood bar</div>
              <div className="text-xs text-muted-foreground">Pick a vibe. The UI and tutor adapt.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {moodOptions.map((mood) => {
                const isActive = selectedMood === mood.id;
                return (
                  <button
                    key={mood.id}
                    onClick={() => setSelectedMood(mood.id as keyof typeof moodProfiles)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground hover:border-primary/40"
                    }`}
                  >
                    {mood.label}
                  </button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInsights((prev) => !prev)}
              className="h-8 rounded-full font-semibold bg-background/70"
            >
              {showInsights ? "Hide insights" : "Show insights"}
            </Button>
          </div>
        </motion.div>

        {!showInsights ? (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-stretch min-h-0 flex-1">
            {/* Calendar + Deadlines */}
            <motion.div variants={itemVariants} className="xl:col-span-3 dashboard-panel p-4 flex flex-col h-full min-h-0 overflow-hidden">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                <Calendar className="w-4 h-4 text-primary" />
                {moodProfile.dashboard.calendarTitle}
              </div>
              <div className="flex-1 min-h-0">
                 <CalendarWidget />
              </div>
              <div className="mt-3 pt-3 border-t border-border/40 flex-1 min-h-0">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                    <Target className="w-4 h-4 text-primary" />
                    {moodProfile.dashboard.deadlinesTitle}
                  </div>
                  <div className="h-40 overflow-y-auto pr-1">
                    <ExamManager />
                  </div>
              </div>
            </motion.div>

            {/* Timer Widget */}
            <motion.div variants={itemVariants} className="xl:col-span-3 dashboard-panel p-4 flex flex-col h-full min-h-0 overflow-hidden">
               <TimerWidget />
            </motion.div>

            {/* Progress at a glance */}
            <motion.div variants={itemVariants} className="xl:col-span-3 dashboard-panel p-4 flex flex-col h-full min-h-0 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Target className="w-4 h-4 text-primary" />
                  Progress
                </div>
                <span className="text-xs text-muted-foreground">Overall mastery</span>
              </div>
              <div className="flex flex-1 flex-col justify-between gap-4">
                <div className="grid gap-4 items-center">
                  <div
                    className="progress-ring w-24 h-24 xl:w-28 xl:h-28 mx-auto"
                    style={{
                      background: `conic-gradient(hsl(var(--primary)) ${masteryPercent}%, hsl(var(--border)) ${masteryPercent}% 100%)`
                    }}
                  >
                    <div className="progress-ring-inner w-16 h-16 xl:w-20 xl:h-20">
                      <div className="text-xl font-display text-foreground">
                        {normalizedStats.quizzesDone > 0 ? `${masteryPercent}%` : "—"}
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        Mastery
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-2">
                      <div className="rounded-xl border border-border/60 bg-muted/40 p-2 text-center">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Streak</div>
                        <div className="text-xl font-display text-foreground">{normalizedStats.currentStreak} {streakLabel}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">My Interests</p>
                  {interestCards.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {interestCards.slice(0, 3).map((interest) => {
                        const Icon = interest.icon;
                        return (
                          <div
                            key={interest.label}
                            className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/35 px-2 py-1 shadow-sm"
                          >
                            <Icon className="w-3 h-3 text-primary" />
                            <span className="text-[10px] font-semibold text-foreground">{interest.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Add interests.</span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* AI Tutor + Quizzes */}
            <motion.div variants={itemVariants} className="xl:col-span-3 dashboard-panel p-4 flex flex-col gap-3 h-full min-h-0 overflow-hidden">
              <div className="flex flex-col gap-3 flex-1 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="w-4 h-4 text-primary" />
                  AI Tutor
                </div>
                <p className="text-xs text-muted-foreground">
                  {moodProfile.dashboard.tutorSubtitle}
                </p>
                <div className="mt-auto">
                  <Button
                    onClick={() => router.push("/chat")}
                    className="h-9 w-full rounded-full gradient-primary text-primary-foreground border-0 font-semibold text-xs"
                  >
                    Chat with Quizzy
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-3 flex-1 rounded-2xl border border-border/60 bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  Quizzes
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={() => { setQuizCreatorMode('learning'); setShowQuizCreator(true); }}
                    className="h-8 rounded-full gradient-primary text-primary-foreground border-0 font-semibold w-full text-xs"
                  >
                    Start quiz
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setQuizCreatorMode('custom'); setShowQuizCreator(true); }}
                    className="h-8 rounded-full font-semibold bg-background/70 w-full text-xs"
                  >
                    Custom quiz
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex-1 min-h-0 overflow-y-auto"
          >
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
            {/* Next steps + quick actions */}
            <motion.div variants={itemVariants} className="xl:col-span-7 dashboard-panel p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
                <Compass className="w-4 h-4 text-primary" />
                Next steps
              </div>
              <div className="space-y-3 text-sm">
                {weakestSubjects.length > 0 ? (
                  weakestSubjects.map((subject) => (
                    <div key={subject.label} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
                      <Flag className="w-4 h-4 text-rose-400 mt-0.5" />
                      <div>
                        <div className="font-semibold text-foreground">Focus on {subject.label}</div>
                        <div className="text-xs text-muted-foreground">
                          Low activity here — build strength with 2-3 quick analogies.
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-muted-foreground">
                    Start your first analogy to unlock tailored next steps.
                  </div>
                )}
              </div>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  onClick={() => router.push("/chat")}
                  className="h-11 rounded-full gradient-primary text-primary-foreground border-0 font-semibold"
                >
                  Start new analogy
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setQuizCreatorMode('learning'); setShowQuizCreator(true); }}
                  className="h-11 rounded-full font-semibold bg-background/70"
                >
                  Review mistakes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/calendar")}
                  className="h-11 rounded-full font-semibold bg-background/70"
                >
                  Check your schedule
                </Button>
              </div>
            </motion.div>

            {/* Category performance */}
            <motion.div variants={itemVariants} className="xl:col-span-5 dashboard-panel p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Subjects
                </div>
              </div>
              <div className="space-y-4">
                {hasSubjectActivity ? (
                  subjectPerformanceDesc.slice(0, 6).map((subject) => {
                    const barColor =
                      subject.percent >= 67
                        ? "bg-emerald-400"
                        : subject.percent >= 34
                          ? "bg-amber-400"
                          : "bg-rose-400";
                    return (
                      <div key={subject.label} className="flex items-center gap-4">
                        <div className="w-28 text-xs font-semibold text-foreground">{subject.label}</div>
                        <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
                          <div className={`h-full ${barColor}`} style={{ width: `${subject.percent}%` }} />
                        </div>
                        <div className="w-8 text-xs text-muted-foreground text-right">{subject.count}</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Your category performance will appear after your first chats.
                  </div>
                )}
              </div>
            </motion.div>

            {/* Recent activity */}
            <motion.div variants={itemVariants} className="xl:col-span-5 dashboard-panel p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
                <MessageCircle className="w-4 h-4 text-primary" />
                Recent activity
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Current streak</div>
                    <div className="text-xl font-display text-foreground">{normalizedStats.currentStreak} {streakLabel}</div>
                  </div>
                  <Zap className="w-5 h-5 text-amber-400" />
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Conversations</div>
                    <div className="text-xl font-display text-foreground">{normalizedStats.conversationsCount}</div>
                  </div>
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Quizzes completed</div>
                    <div className="text-xl font-display text-foreground">{normalizedStats.quizzesDone}</div>
                  </div>
                  <Medal className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
            </motion.div>

            {/* Highlights / badges */}
            <motion.div variants={itemVariants} className="xl:col-span-7 dashboard-panel p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Trophy className="w-4 h-4 text-primary" />
                  Highlights
                </div>
                <button
                  onClick={() => router.push("/achievements")}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  View all badges <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {recentAchievements.length > 0 ? (
                  recentAchievements.map((achievement) => (
                    <AchievementBadge
                      key={achievement.id}
                      icon={achievement.icon}
                      title={achievement.title}
                      description={achievement.description}
                      isUnlocked={true}
                    />
                  ))
                ) : (
                  <div className="col-span-2 md:col-span-4 text-center py-8 text-sm text-muted-foreground">
                    Earn badges by completing analogies and quizzes.
                  </div>
                )}
              </div>
            </motion.div>
            </div>
          </motion.div>
        )}
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
  );
};

export default Dashboard;
