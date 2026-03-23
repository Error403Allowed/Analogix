"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CheckSquare,
  Flame,
  GraduationCap,
  LayoutGrid,
  List,
  MessageSquare,
  MoreHorizontal,
  Palette,
  Search,
  Send,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SUBJECT_CATALOG,
  getGradeBand,
  getSubjectDescription,
  type SubjectId,
} from "@/constants/subjects";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { statsStore } from "@/utils/statsStore";
import { getGroqCompletion } from "@/services/groq";
import type { ChatMessage } from "@/types/chat";
import { SubjectCustomizationSheet } from "@/components/SubjectCustomizationSheet";
import { subjectStore, type CustomSubject } from "@/utils/subjectStore";
import { ColorPicker, SUBJECT_COLORS } from "@/components/ColorPicker";
import { IconPicker, DynamicIcon } from "@/components/IconPicker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SubjectPagePrefs = {
  subjects?: string[];
  grade?: string;
  state?: string;
  hobbies?: string[];
  learningStyle?: string;
};

const SUBJECT_COVER_STYLES: Record<string, string> = {
  sunset: "bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500",
  ocean: "bg-gradient-to-r from-blue-400 via-cyan-500 to-teal-500",
  forest: "bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500",
  berry: "bg-gradient-to-r from-pink-500 via-rose-500 to-red-500",
  sky: "bg-gradient-to-r from-blue-300 via-blue-500 to-indigo-500",
  twilight: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500",
  fire: "bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500",
  midnight: "bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900",
  gold: "bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500",
};

const GRADE_STAGE_COPY: Record<ReturnType<typeof getGradeBand>, string> = {
  junior: "Foundation-first study spaces for building confidence early.",
  middle: "Connected subject workspaces for linking ideas across topics.",
  senior: "Exam-focused subject hubs built for revision, pace, and output.",
};

export default function SubjectsOverview() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState<"list" | "grid">("list");
  const [userSubjects, setUserSubjects] = useState<string[]>([]);
  const [userPrefs, setUserPrefs] = useState<SubjectPagePrefs>({});
  const [statsData, setStatsData] = useState<import("@/utils/statsStore").UserStats>({
    quizzesDone: 0,
    currentStreak: 0,
    accuracy: 0,
    conversationsCount: 0,
    topSubject: "None",
    subjectCounts: {},
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [customSubjects, setCustomSubjects] = useState<Record<string, CustomSubject>>({});
  const [customizeSubjectId, setCustomizeSubjectId] = useState<SubjectId | null>(null);
  const [iconPickerSubject, setIconPickerSubject] = useState<{ id: SubjectId; open: boolean } | null>(null);
  const [colorPickerSubject, setColorPickerSubject] = useState<{ id: SubjectId; open: boolean } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("subjectsLayout") as "list" | "grid" | null;
    if (saved === "grid") setLayout("grid");
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadPrefs = () => {
      try {
        const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}") as SubjectPagePrefs;
        if (!mounted) return;
        setUserPrefs(prefs);
        setUserSubjects(Array.isArray(prefs.subjects) ? prefs.subjects : []);
      } catch {
        if (!mounted) return;
        setUserPrefs({});
        setUserSubjects([]);
      }
    };

    const handleStatsUpdated = () => {
      statsStore.get().then((next) => {
        if (mounted) setStatsData(next);
      });
    };

    const loadCustomSubjects = async () => {
      const customs = await subjectStore.getAllCustomSubjects();
      if (mounted) setCustomSubjects(customs);
    };

    loadPrefs();
    handleStatsUpdated();
    loadCustomSubjects();

    window.addEventListener("statsUpdated", handleStatsUpdated);
    window.addEventListener("customSubjectsUpdated", loadCustomSubjects);
    window.addEventListener("userPreferencesUpdated", loadPrefs);

    return () => {
      mounted = false;
      window.removeEventListener("statsUpdated", handleStatsUpdated);
      window.removeEventListener("customSubjectsUpdated", loadCustomSubjects);
      window.removeEventListener("userPreferencesUpdated", loadPrefs);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const normalizedStats = useMemo(
    () => ({
      quizzesDone: Math.max(0, Number(statsData.quizzesDone || 0)),
      currentStreak: Math.max(0, Number(statsData.currentStreak || 0)),
      conversationsCount: Math.max(0, Number(statsData.conversationsCount || 0)),
      subjectCounts: statsData.subjectCounts || {},
    }),
    [statsData],
  );

  const getSubjectAppearance = useCallback((subject: typeof SUBJECT_CATALOG[number]) => {
    const custom = customSubjects[subject.id];
    const colorId = custom?.custom_color || "default";
    const colorData = SUBJECT_COLORS.find((color) => color.id === colorId) || SUBJECT_COLORS[0];

    return {
      icon: custom?.custom_icon || subject.iconName,
      color: colorData,
      title: custom?.custom_title || subject.label,
      cover: custom?.custom_cover,
    };
  }, [customSubjects]);

  const activeSubjectObjects = useMemo(
    () => SUBJECT_CATALOG.filter((subject) => userSubjects.includes(subject.id)),
    [userSubjects],
  );

  const getActivityCount = useCallback(
    (subject: { id: string; label: string }) =>
      // counts are keyed by subject ID since the fix; also check label variants
      // for any older data recorded before the fix
      normalizedStats.subjectCounts[subject.id] ||
      normalizedStats.subjectCounts[subject.label] ||
      normalizedStats.subjectCounts[subject.label.toLowerCase()] ||
      0,
    [normalizedStats.subjectCounts],
  );

  const subjectPerformance = useMemo(() => {
    const rows = activeSubjectObjects.map((subject) => ({
      ...subject,
      count: getActivityCount(subject),
    }));
    const max = Math.max(1, ...rows.map((row) => row.count));
    return rows
      .map((row) => ({ ...row, percent: Math.round((row.count / max) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [activeSubjectObjects, getActivityCount]);

  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activeSubjectObjects.filter((subject) => {
      if (!query) return true;
      const appearance = getSubjectAppearance(subject);
      const description = getSubjectDescription(subject.id, userPrefs.grade).toLowerCase();
      return (
        appearance.title.toLowerCase().includes(query) ||
        subject.label.toLowerCase().includes(query) ||
        description.includes(query)
      );
    });
  }, [activeSubjectObjects, getSubjectAppearance, search, userPrefs.grade]);

  const featuredSubjects = useMemo(
    () => subjectPerformance.filter((subject) => subject.count > 0).slice(0, 3),
    [subjectPerformance],
  );

  const gradeBand = getGradeBand(userPrefs.grade);
  const stageCopy = GRADE_STAGE_COPY[gradeBand];
  const visibleMaxActivity = Math.max(1, ...filteredSubjects.map((subject) => getActivityCount(subject)));
  const totalActivity = activeSubjectObjects.reduce((sum, subject) => sum + getActivityCount(subject), 0);
  const activeNowCount = activeSubjectObjects.filter((subject) => getActivityCount(subject) > 0).length;

  const buildContext = () => {
    const subjectList = activeSubjectObjects.map((subject) => subject.label).join(", ") || "none selected";
    const topSubjects =
      subjectPerformance
        .filter((subject) => subject.count > 0)
        .slice(0, 3)
        .map((subject) => `${subject.label} (${subject.count} sessions)`)
        .join(", ") || "no activity yet";

    return `You are a smart study assistant embedded in the student's My Subjects page of Analogix.\nEnrolled subjects: ${subjectList}\nStreak: ${normalizedStats.currentStreak}\nQuizzes: ${normalizedStats.quizzesDone}\nSessions: ${normalizedStats.conversationsCount}\nMost active: ${topSubjects}\nGrade: Year ${userPrefs.grade || "unknown"}\nState: ${userPrefs.state || "unknown"}`;
  };

  const openChat = () => {
    if (messages.length === 0) {
      const subjectList = activeSubjectObjects.map((subject) => subject.label).join(", ") || "no subjects yet";
      const topSubject = subjectPerformance.find((subject) => subject.count > 0);
      setMessages([
        {
          role: "assistant",
          content: `Hey! You're enrolled in **${subjectList}**.\n\nStreak: ${normalizedStats.currentStreak} day${normalizedStats.currentStreak !== 1 ? "s" : ""} · ${normalizedStats.quizzesDone} quiz${normalizedStats.quizzesDone !== 1 ? "zes" : ""}${topSubject ? ` · Most active in **${topSubject.label}**` : ""}.\n\nWhat do you want to work on?`,
        },
      ]);
    }
    setChatOpen(true);
  };

  const handleSend = async () => {
    if (!input.trim() || typing) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);
    const history = [...messages.slice(-8), userMsg];
    try {
      const response = await getGroqCompletion(history, {
        subjects: userSubjects,
        hobbies: userPrefs.hobbies || [],
        grade: userPrefs.grade,
        learningStyle: userPrefs.learningStyle || "visual",
        responseLength: 2,
        analogyIntensity: 0.1,
        pageContext: buildContext(),
      });
      setMessages((prev) => [...prev, response]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Couldn't reach AI. Try again." }]);
    } finally {
      setTyping(false);
    }
  };

  const toggleLayout = (nextLayout: "list" | "grid") => {
    setLayout(nextLayout);
    localStorage.setItem("subjectsLayout", nextLayout);
  };

  const emptyState = (
    <div className="relative overflow-hidden rounded-[32px] border border-dashed border-border/60 bg-card/70 px-8 py-16 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.09),_transparent_55%)]" />
      <div className="relative">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-background/80 shadow-sm">
          <BookOpen className="h-7 w-7 text-muted-foreground/60" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-foreground">No subjects yet</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground/75">
          Add subjects in your profile and this page will turn into a clean home base for documents,
          revision, and activity across each class.
        </p>
        <Button
          onClick={() => router.push("/dashboard")}
          variant="outline"
          className="mt-6 rounded-xl border-border/60 bg-background/90"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );

  return (
    <div className="relative mx-auto max-w-6xl pb-24">
      <div className="absolute inset-x-6 top-12 -z-10 h-64 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative overflow-hidden rounded-[36px] border border-border/60 bg-card/85 px-6 py-6 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.45)] backdrop-blur md:px-8 md:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.12),_transparent_38%)]" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-background/55 to-transparent" />

        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_360px]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground/60">
              <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">Workspace</span>
              {userPrefs.grade ? (
                <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
                  Year {userPrefs.grade}
                </span>
              ) : null}
              {userPrefs.state ? (
                <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
                  {userPrefs.state}
                </span>
              ) : null}
            </div>

            <div className="max-w-3xl">
              <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
                My Subjects
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground/80 sm:text-[15px]">
                {stageCopy}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: BookOpen,
                  label: "Subjects enrolled",
                  value: activeSubjectObjects.length,
                  note: `${gradeBand} track`,
                },
                {
                  icon: Flame,
                  label: "Current streak",
                  value: normalizedStats.currentStreak,
                  note: "days in motion",
                },
                {
                  icon: CheckSquare,
                  label: "Quizzes finished",
                  value: normalizedStats.quizzesDone,
                  note: `${normalizedStats.conversationsCount} study chats`,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[24px] border border-border/50 bg-background/75 px-4 py-5 shadow-sm backdrop-blur"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/50 bg-muted/40 mb-3">
                    <stat.icon className="h-4 w-4 text-foreground/75" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/55">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-3xl font-black tracking-tight text-foreground">{stat.value}</p>
                  <p className="mt-2 text-xs text-muted-foreground/70">{stat.note}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/45" />
                <Input
                  placeholder="Search by subject or topic focus"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-12 rounded-2xl border-border/50 bg-background/80 pl-11 text-sm shadow-sm"
                />
              </div>

              <div className="flex items-center justify-between gap-2 rounded-2xl border border-border/50 bg-background/80 p-1.5 shadow-sm md:justify-start">
                {([
                  ["list", List, "List"],
                  ["grid", LayoutGrid, "Grid"],
                ] as const).map(([nextLayout, Icon, label]) => (
                  <button
                    key={nextLayout}
                    onClick={() => toggleLayout(nextLayout)}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition-all",
                      layout === nextLayout
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-border/55 bg-background/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/50 bg-muted/40">
                <GraduationCap className="h-5 w-5 text-foreground/75" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground/55">
                  Study Pulse
                </p>
                <h2 className="text-lg font-bold tracking-tight text-foreground">Most active right now</h2>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {featuredSubjects.length > 0 ? (
                featuredSubjects.map((subject) => {
                  const appearance = getSubjectAppearance(subject);
                  return (
                    <button
                      key={subject.id}
                      onClick={() => router.push(`/subjects/${subject.id}`)}
                      className="group w-full rounded-[22px] border border-border/50 bg-card/70 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-border hover:bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/50 bg-background/90 shadow-sm">
                          <DynamicIcon name={appearance.icon} className={cn("h-5 w-5", appearance.color.text)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{appearance.title}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">
                            {getSubjectDescription(subject.id, userPrefs.grade)}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-foreground">{subject.count}</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/60">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            appearance.color.bg === "bg-muted/40" ? "bg-foreground/20" : appearance.color.bg,
                          )}
                          style={{ width: `${Math.max(subject.percent, 10)}%` }}
                        />
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-[22px] border border-dashed border-border/55 bg-card/60 p-5 text-center">
                  <p className="text-sm font-semibold text-foreground">No activity yet</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground/70">
                    Open a subject, create a document, or run a quiz and this panel will start showing momentum.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[22px] border border-border/50 bg-card/70 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/55">
                  Active spaces
                </p>
                <p className="mt-1 text-xl font-black tracking-tight text-foreground">{activeNowCount}</p>
                <p className="mt-1 text-xs text-muted-foreground/70">Subjects with recorded study activity</p>
              </div>
              <div className="rounded-[22px] border border-border/50 bg-card/70 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/55">
                  Total sessions
                </p>
                <p className="mt-1 text-xl font-black tracking-tight text-foreground">{totalActivity}</p>
                <p className="mt-1 text-xs text-muted-foreground/70">Tracked across your current subjects</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {userSubjects.length === 0 ? (
          emptyState
        ) : (
          <AnimatePresence mode="wait">
            {layout === "list" ? (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.16 }}
                className="space-y-4"
              >
                {filteredSubjects.map((subject, index) => {
                  const appearance = getSubjectAppearance(subject);
                  const activity = getActivityCount(subject);
                  const pct = Math.round((activity / visibleMaxActivity) * 100);
                  const description = getSubjectDescription(subject.id, userPrefs.grade);

                  return (
                    <motion.div
                      key={subject.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.035 }}
                      className="group relative overflow-hidden rounded-[30px] border border-border/55 bg-card/85 p-5 shadow-[0_20px_65px_-45px_rgba(15,23,42,0.55)] transition-all hover:-translate-y-0.5 hover:border-border hover:bg-card/95"
                    >
                      <div
                        className={cn(
                          "absolute inset-x-0 top-0 h-28 opacity-95",
                          appearance.cover ? SUBJECT_COVER_STYLES[appearance.cover] : "bg-gradient-to-r from-muted/45 via-background to-muted/25",
                        )}
                      />
                      <div className="absolute inset-x-0 top-24 h-20 bg-gradient-to-b from-background/0 via-background/85 to-background" />
                      <div className={cn("absolute -right-10 top-8 h-28 w-28 rounded-full blur-3xl opacity-25", appearance.color.bg)} />

                      <div className="relative">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start">
                          <button
                            onClick={() => router.push(`/subjects/${subject.id}`)}
                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-border/55 bg-background/90 shadow-sm backdrop-blur"
                          >
                            <DynamicIcon name={appearance.icon} className={cn("h-6 w-6", appearance.color.text)} />
                          </button>

                          <div
                            className="min-w-0 flex-1 cursor-pointer"
                            onClick={() => router.push(`/subjects/${subject.id}`)}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="truncate text-xl font-black tracking-tight text-foreground">
                                {appearance.title}
                              </h2>
                              <span className="rounded-full border border-border/50 bg-background/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/65">
                                {gradeBand}
                              </span>
                              {activity > 0 ? (
                                <span className="rounded-full border border-border/50 bg-background/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/65">
                                  {activity} sessions
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground/80">{description}</p>
                          </div>

                          <div className="flex items-center gap-2 self-start">
                            <Button
                              onClick={() => router.push(`/subjects/${subject.id}`)}
                              className="rounded-xl bg-foreground px-4 text-background hover:bg-foreground/90"
                            >
                              Open
                              <ArrowRight className="ml-1 h-4 w-4" />
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-background/80 text-muted-foreground transition-colors hover:text-foreground"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => setCustomizeSubjectId(subject.id)}>
                                  <Settings2 className="mr-2 h-3.5 w-3.5" />
                                  Customise
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIconPickerSubject({ id: subject.id, open: true })}>
                                  <Palette className="mr-2 h-3.5 w-3.5" />
                                  Change Icon
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setColorPickerSubject({ id: subject.id, open: true })}>
                                  <Palette className="mr-2 h-3.5 w-3.5" />
                                  Change Color
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1.4fr)_180px_180px]">
                          <div className="rounded-[22px] border border-border/50 bg-background/75 px-4 py-4">
                            <div className="flex items-center justify-between gap-3 text-xs">
                              <span className="font-semibold uppercase tracking-[0.18em] text-muted-foreground/55">
                                Activity this term
                              </span>
                              <span className="font-bold text-foreground">{activity}</span>
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/60">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  appearance.color.bg === "bg-muted/40" ? "bg-foreground/20" : appearance.color.bg,
                                )}
                                style={{ width: `${activity > 0 ? Math.max(pct, 10) : 0}%` }}
                              />
                            </div>
                          </div>

                          <div className="rounded-[22px] border border-border/50 bg-background/75 px-4 py-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/55">
                              Focus
                            </p>
                            <p className="mt-2 text-sm font-semibold text-foreground">
                              {activity > 0 ? "In motion" : "Needs a first session"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground/70">
                              {activity > 0 ? "Keep momentum going here." : "Good candidate for your next study block."}
                            </p>
                          </div>

                          <div className="rounded-[22px] border border-border/50 bg-background/75 px-4 py-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/55">
                              Track
                            </p>
                            <p className="mt-2 text-sm font-semibold text-foreground">Year {userPrefs.grade || "?"}</p>
                            <p className="mt-1 text-xs text-muted-foreground/70">
                              {description.toLowerCase()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {filteredSubjects.length === 0 && search ? (
                  <div className="rounded-[28px] border border-dashed border-border/60 bg-card/70 px-6 py-14 text-center">
                    <p className="text-lg font-bold tracking-tight text-foreground">No matches for “{search}”</p>
                    <p className="mt-2 text-sm text-muted-foreground/75">
                      Try a subject name or topic area instead.
                    </p>
                  </div>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.16 }}
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              >
                {filteredSubjects.map((subject, index) => {
                  const appearance = getSubjectAppearance(subject);
                  const activity = getActivityCount(subject);
                  const pct = Math.round((activity / visibleMaxActivity) * 100);

                  return (
                    <motion.div
                      key={subject.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="group relative overflow-hidden rounded-[30px] border border-border/55 bg-card/85 p-4 shadow-[0_20px_65px_-45px_rgba(15,23,42,0.55)] transition-all hover:-translate-y-1 hover:border-border hover:bg-card/95"
                    >
                      <div
                        className={cn(
                          "absolute inset-x-0 top-0 h-24",
                          appearance.cover ? SUBJECT_COVER_STYLES[appearance.cover] : "bg-gradient-to-r from-muted/45 via-background to-muted/25",
                        )}
                      />
                      <div className="absolute inset-x-0 top-20 h-16 bg-gradient-to-b from-background/0 via-background/85 to-background" />
                      <div className={cn("absolute -right-8 top-6 h-24 w-24 rounded-full blur-3xl opacity-25", appearance.color.bg)} />

                      <div className="relative">
                        <div className="flex items-start justify-between gap-3">
                          <button
                            onClick={() => router.push(`/subjects/${subject.id}`)}
                            className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-border/55 bg-background/90 shadow-sm"
                          >
                            <DynamicIcon name={appearance.icon} className={cn("h-5 w-5", appearance.color.text)} />
                          </button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/45 bg-background/80 text-muted-foreground transition-colors hover:text-foreground"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => setCustomizeSubjectId(subject.id)}>
                                <Settings2 className="mr-2 h-3.5 w-3.5" />
                                Customise
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setIconPickerSubject({ id: subject.id, open: true })}>
                                <Palette className="mr-2 h-3.5 w-3.5" />
                                Change Icon
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setColorPickerSubject({ id: subject.id, open: true })}>
                                <Palette className="mr-2 h-3.5 w-3.5" />
                                Change Color
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <button
                          onClick={() => router.push(`/subjects/${subject.id}`)}
                          className="mt-5 block w-full text-left"
                        >
                          <p className="text-lg font-black tracking-tight text-foreground">{appearance.title}</p>
                          <p className="mt-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground/55">
                            {getSubjectDescription(subject.id, userPrefs.grade)}
                          </p>
                          <p className="mt-2.5 text-sm leading-5 text-muted-foreground/80">
                            {activity > 0
                              ? `${activity} study session${activity === 1 ? "" : "s"} logged here.`
                              : "Fresh subject space ready for docs, flashcards, and quizzes."}
                          </p>
                        </button>

                        <div className="mt-6 rounded-[22px] border border-border/50 bg-background/75 px-4 py-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold uppercase tracking-[0.18em] text-muted-foreground/55">
                              Activity
                            </span>
                            <span className="font-bold text-foreground">{activity}</span>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/60">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                appearance.color.bg === "bg-muted/40" ? "bg-foreground/20" : appearance.color.bg,
                              )}
                              style={{ width: `${activity > 0 ? Math.max(pct, 10) : 0}%` }}
                            />
                          </div>
                        </div>

                        <Button
                          onClick={() => router.push(`/subjects/${subject.id}`)}
                          className="mt-4 w-full rounded-xl bg-foreground text-background hover:bg-foreground/90"
                        >
                          Open Subject
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}

                {filteredSubjects.length === 0 && search ? (
                  <div className="col-span-full rounded-[28px] border border-dashed border-border/60 bg-card/70 px-6 py-14 text-center">
                    <p className="text-lg font-bold tracking-tight text-foreground">No matches for “{search}”</p>
                    <p className="mt-2 text-sm text-muted-foreground/75">
                      Try a broader search or switch back to the full subject list.
                    </p>
                  </div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              className="flex h-[460px] w-80 flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl sm:w-96"
            >
              <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Page Assistant</p>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={cn(
                      "max-w-[88%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                      msg.role === "assistant"
                        ? "bg-muted/50 text-foreground"
                        : "ml-auto bg-primary/10 text-right text-foreground",
                    )}
                  >
                    {msg.content}
                  </div>
                ))}
                {typing ? (
                  <div className="w-12 rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    <span className="animate-pulse">···</span>
                  </div>
                ) : null}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-2 border-t border-border/40 p-3">
                <Input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleSend()}
                  placeholder="Ask about your subjects…"
                  className="h-9 rounded-lg border-border/50 text-sm"
                />
                <Button onClick={handleSend} size="icon" className="h-9 w-9 shrink-0 rounded-lg">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={chatOpen ? () => setChatOpen(false) : openChat}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-lg transition-all hover:bg-muted/40 hover:text-foreground"
        >
          <AnimatePresence mode="wait">
            {chatOpen ? (
              <motion.div
                key="x"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
              >
                <X className="h-4 w-4" />
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
              >
                <Sparkles className="h-4 w-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {customizeSubjectId ? (
        <SubjectCustomizationSheet
          subjectId={customizeSubjectId}
          open={!!customizeSubjectId}
          onOpenChange={(open) => setCustomizeSubjectId(open ? customizeSubjectId : null)}
          onCustomizationChange={() => {
            subjectStore.getAllCustomSubjects().then(setCustomSubjects);
          }}
        />
      ) : null}

      {iconPickerSubject ? (
        <IconPicker
          open={iconPickerSubject.open}
          onOpenChange={(open) => setIconPickerSubject(open ? iconPickerSubject : null)}
          selectedIcon={
            customSubjects[iconPickerSubject.id]?.custom_icon ||
            SUBJECT_CATALOG.find((subject) => subject.id === iconPickerSubject.id)?.iconName ||
            ""
          }
          onSelect={async (iconName) => {
            await subjectStore.saveCustomSubject(iconPickerSubject.id, { custom_icon: iconName });
            subjectStore.getAllCustomSubjects().then(setCustomSubjects);
          }}
        />
      ) : null}

      {colorPickerSubject ? (
        <ColorPicker
          open={colorPickerSubject.open}
          onOpenChange={(open) => setColorPickerSubject(open ? colorPickerSubject : null)}
          selectedColor={customSubjects[colorPickerSubject.id]?.custom_color || "default"}
          onSelect={async (colorId) => {
            await subjectStore.saveCustomSubject(colorPickerSubject.id, { custom_color: colorId });
            subjectStore.getAllCustomSubjects().then(setCustomSubjects);
          }}
        />
      ) : null}
    </div>
  );
}
