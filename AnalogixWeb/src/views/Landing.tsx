'use client';

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, Sparkles, BookOpen, MessageCircle, Trophy,
  Calculator, Check,
  Lightbulb, Zap, Target, Clock, FileText, GraduationCap,
  Calendar, Layers, TrendingUp, BookMarked, Users, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const accentColors: Record<string, { bg: string; text: string; border: string; tag: string }> = {
  blue:   { bg: "bg-blue-500/8",   text: "text-blue-600",   border: "hover:border-blue-300", tag: "bg-blue-500/10 text-blue-600" },
  amber:  { bg: "bg-amber-500/8",  text: "text-amber-600",  border: "hover:border-amber-300", tag: "bg-amber-500/10 text-amber-600" },
  emerald:{ bg: "bg-emerald-500/8",text: "text-emerald-600",border: "hover:border-emerald-300",tag: "bg-emerald-500/10 text-emerald-600" },
  violet: { bg: "bg-violet-500/8", text: "text-violet-600", border: "hover:border-violet-300", tag: "bg-violet-500/10 text-violet-600" },
};

const featureAccents: Record<string, string> = {
  tutor: "blue", flashcards: "emerald", quiz: "amber", rooms: "violet",
  calendar: "amber", subjects: "blue", resources: "emerald",
  formulas: "violet", timer: "amber", achievements: "emerald",
};

const features = [
  {
    id: "tutor",
    icon: MessageCircle,
    label: "AI Tutor",
    headline: "Explains things using what YOU love",
    desc: "The AI tutor learns your hobbies and uses them as analogies to explain any concept. Maths using FIFA stats. Chemistry through cooking. History as game lore.",
    tags: ["Unlimited use", "Free", "Analogy-first"],
  },
  {
    id: "flashcards",
    icon: Layers,
    label: "Flashcards",
    headline: "Spaced repetition that actually works",
    desc: "Flip cards with built-in spaced repetition (SM-2 algorithm). Upload your notes and the AI builds your deck automatically.",
    tags: ["Smart scheduling", "Doc upload", "Learn + Test modes"],
  },
  {
    id: "quiz",
    icon: Target,
    label: "Adaptive Quiz",
    headline: "AI quizzes with analogy hints built in",
    desc: "Every question comes with an analogy hint tied to your interests. Choose difficulty, set a timer, and get a full AI-powered review.",
    tags: ["Configurable difficulty", "Timed mode", "AI review"],
  },
  {
    id: "rooms",
    icon: Users,
    label: "Study Rooms",
    headline: "Virtual study rooms with built-in AI help",
    desc: "Create a virtual study room, invite friends, and get an AI assistant that can answer questions, quiz you, or help with group projects.",
    tags: ["Group study", "AI assistant", "Virtual rooms"],
  },
  {
    id: "calendar",
    icon: Calendar,
    label: "Smart Calendar",
    headline: "Deadlines you won't forget",
    desc: "Import your school timetable via .ics, add exams and assignments manually, and get an overview of upcoming events.",
    tags: ["ICS import", "Term tracking", "Exam countdowns"],
  },
  {
    id: "subjects",
    icon: BookOpen,
    label: "Subject Workspace",
    headline: "Your notes, organised by subject",
    desc: "Create rich documents, AI-generated study guides, and flashcard sets — all organised by subject.",
    tags: ["AI study guides", "Rich editor", "Subject-organised"],
  },
  {
    id: "resources",
    icon: BookMarked,
    label: "Resources Hub",
    headline: "Past papers & textbooks, all in one place",
    desc: "Curated past papers and textbook links for every subject, filtered to your state's curriculum.",
    tags: ["Past papers", "Textbooks", "State-filtered"],
  },
  {
    id: "formulas",
    icon: Calculator,
    label: "Formula Sheets",
    headline: "Every formula, searchable, always ready",
    desc: "Instant access to formula sheets for Maths, Physics, Chemistry and more — all rendered in proper LaTeX.",
    tags: ["LaTeX rendering", "In-chat access", "All subjects"],
  },
  {
    id: "timer",
    icon: Clock,
    label: "Pomodoro Timer",
    headline: "Study smarter with structured focus",
    desc: "Built-in Pomodoro timer on your dashboard. Stay in the zone, track your sessions, and know when to take a break.",
    tags: ["Focus sessions", "Break reminders", "Dashboard widget"],
  },
  {
    id: "achievements",
    icon: Trophy,
    label: "Achievements",
    headline: "Get recognised for your hard work",
    desc: "Earn badges and build streaks as you study. An achievement system that rewards consistency — not just raw scores.",
    tags: ["Badges", "Streaks", "XP system"],
  },
];

const stats = [
  { value: "15", label: "Subjects covered" },
  { value: "100%", label: "Free to use" },
  { value: "8", label: "Study tools" },
  { value: "Y7–12", label: "All year levels" },
  { value: "ACARA", label: "Curriculum aligned" },
];

const navLinks = [
  { label: "Features", id: "features" },
  { label: "Why Analogix", id: "why-analogix" },
];

const GITHUB_URL = "https://github.com/Error403Allowed/Analogix";
const SUPPORT_URL = "/support";
const PRIVACY_URL = "/privacy";

const Landing = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
      setHasCompletedOnboarding(Boolean(prefs?.onboardingComplete));
    } catch {
      setHasCompletedOnboarding(false);
    } finally {
      setIsMounted(true);
    }
  }, []);

  const syncOnboardingFromDb = useCallback(async () => {
    if (!user || hasCompletedOnboarding) return;
    try {
      const supabase = createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete, name, grade, state, subjects, hobbies, hobby_ids, hobby_details, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.onboarding_complete) {
        setHasCompletedOnboarding(true);
        const existing = JSON.parse(localStorage.getItem("userPreferences") || "{}");
        const dbGrade = profile.grade;
        localStorage.setItem("userPreferences", JSON.stringify({
          ...existing,
          ...profile,
          grade: existing.grade || dbGrade || null,
          avatarUrl: profile?.avatar_url ?? existing.avatarUrl,
          onboardingComplete: true,
        }));
        window.dispatchEvent(new Event("userPreferencesUpdated"));
      }
    } catch { /* Silently skip */ }
  }, [user, hasCompletedOnboarding]);

  useEffect(() => {
    syncOnboardingFromDb();
  }, [syncOnboardingFromDb]);

  const handleNav = (path?: string, sectionId?: string) => {
    if (!isMounted || loading) return;
    if (sectionId) {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!user) {
      router.push("/onboarding");
      return;
    }
    if (path === "/dashboard" && !hasCompletedOnboarding) {
      router.push("/onboarding");
      return;
    }
    router.push(path || "/dashboard");
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => router.push("/")}
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
              <img src="/tab-icon.png" alt="Analogix" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-bold tracking-tight">Analogix</span>
          </div>

          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNav(undefined, link.id)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full hover:bg-primary flex items-center justify-center transition-colors text-muted-foreground hover:text-primary-foreground border border-border"
              title="View on GitHub"
            >
              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8"/></svg>
            </a>

            {loading || !isMounted ? (
              <div className="h-9 w-28 rounded-lg bg-muted animate-pulse" />
            ) : (
              <Button size="sm" className="rounded-lg px-5 font-bold shadow-md shadow-primary/15"
                onClick={() => handleNav("/dashboard")}>
                {user && hasCompletedOnboarding ? "Dashboard" : user && !hasCompletedOnboarding ? "Continue Setup" : "Get Started"}
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </nav>

      <main className="relative pt-16">
        {/* ── Hero ── */}
        <section className="max-w-7xl mx-auto px-6 py-28 lg:py-40 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Built for students, by a student
            </div>

            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.92] text-balance">
              Actually <span className="text-primary">understand</span>
              <br className="hidden sm:block" /> what you study.
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Every tool you need to go from confused to confident, for free. Quizzes, flashcards, study guides, a smart calendar, and an AI tutor that actually speaks your language.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button size="lg" className="h-13 px-8 text-base font-bold rounded-xl shadow-xl shadow-primary/20 group"
                style={{ height: 52 }}
                onClick={() => handleNav("/onboarding")}>
                Start for free
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg" className="h-13 px-8 text-base font-bold rounded-xl border-2"
                style={{ height: 52 }}
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
                See all features
              </Button>
            </div>
          </motion.div>
        </section>

        {/* ── Stats ticker ── */}
        <section className="border-y border-border/40 bg-muted/30 py-4 overflow-hidden">
          <div className="flex items-center justify-center gap-10 sm:gap-16 flex-wrap px-6">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-2xl font-bold text-primary">{s.value}</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="py-28 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary mb-3">
              Everything in one place
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-4">
              Every tool you need to level up.
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Not just an AI chat. Flashcards, quizzes, a calendar, study guides, resources, formula sheets — all working together.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              const accent = accentColors[featureAccents[feature.id] || "blue"];
              return (
                <div
                  key={feature.id}
                  onClick={() => handleNav(`/${feature.id}`)}
                  className={cn("rounded-xl border border-border bg-card p-6 flex flex-col gap-4 transition-all cursor-pointer hover:shadow-sm", accent.border)}
                >
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", accent.bg)}>
                    <Icon className={cn("w-5 h-5", accent.text)} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold mb-1">{feature.label}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{feature.headline}</p>
                    <p className="text-sm text-muted-foreground/80 leading-relaxed">{feature.desc}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {feature.tags.map((tag) => (
                      <span key={tag} className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", accent.tag)}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── "Built for the way you learn" section ── */}
        <section id="why-analogix" className="py-28 px-6 border-t border-border/30">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-start">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary mb-4">
                Why Analogix
              </p>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-10">
                Built for the way<br /><span className="text-primary italic">you</span> learn.
              </h2>
              <div className="space-y-6">
                {[
                  {
                    icon: Sparkles, color: "blue",
                    title: "Personalised for your interests",
                    desc: "Your hobbies power the analogies. Football, gaming, art — the AI adapts every explanation to something you already understand."
                  },
                  {
                    icon: Check, color: "emerald",
                    title: "ACARA curriculum aligned",
                    desc: "Every subject, every year level, mapped directly to the Australian curriculum. No fluff — just what's in your exams."
                  },
                  {
                    icon: Trophy, color: "amber",
                    title: "Gamified to keep you going",
                    desc: "Badges, streaks, and achievements that reward consistent effort. Because study shouldn't feel like a punishment."
                  },
                  {
                    icon: Zap, color: "violet",
                    title: "Everything is free",
                    desc: "No subscriptions, no paywalls, no ads. Every single feature — AI tutor, flashcards, quizzes, all of it — completely free."
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const a = accentColors[item.color];
                  return (
                    <div key={item.title} className="flex gap-4">
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5", a.bg)}>
                        <Icon className={cn("w-4 h-4", a.text)} />
                      </div>
                      <div>
                        <h4 className="font-bold mb-1">{item.title}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative grid grid-cols-2 gap-4">
              <div className="space-y-4 pt-8">
                {[
                  { icon: Trophy, label: "Achievement", value: "Quiz Master", color: "emerald", filled: true },
                  { icon: TrendingUp, label: "Momentum", value: "7 Day Streak", color: "amber", filled: false },
                ].map((card) => {
                  const Icon = card.icon;
                  const a = accentColors[card.color];
                  return (
                    <div
                      key={card.label}
                      className={cn(
                        "rounded-xl p-6 flex flex-col gap-6",
                        card.filled ? "bg-emerald-600 text-white" : "bg-card border border-border"
                      )}
                    >
                      <div>
                        <Icon className={cn("w-6 h-6", card.filled ? "text-white" : a.text)} />
                      </div>
                      <div>
                        <p className={cn("text-[10px] font-medium uppercase tracking-widest mb-1",
                          card.filled ? "text-white/70" : "text-muted-foreground")}>
                          {card.label}
                        </p>
                        <p className="text-base font-bold">{card.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-4">
                {[
                  { icon: TrendingUp, label: "Accuracy", value: "87%", progress: 87, color: "blue" },
                  { icon: Target, label: "Quizzes done", value: "23", color: "violet" },
                ].map((card) => {
                  const Icon = card.icon;
                  const a = accentColors[card.color];
                  return (
                    <div key={card.label} className="rounded-xl bg-card border border-border p-6 flex flex-col gap-6">
                      <div>
                        <Icon className={cn("w-6 h-6", a.text)} />
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-1">{card.label}</p>
                        <p className="text-2xl font-bold">{card.value}</p>
                        {card.progress !== undefined && (
                          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${card.progress}%` }} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-28 px-6">
          <div className="max-w-5xl mx-auto rounded-2xl bg-foreground text-background p-14 md:p-24 text-center relative overflow-hidden">
            <div className="relative z-10 space-y-7">
              <h2 className="text-4xl sm:text-6xl font-bold tracking-tight leading-none">
                Stop guessing.<br />Start mastering.
              </h2>
              <p className="text-lg text-background/70 max-w-md mx-auto leading-relaxed">
                Every tool, completely free. No signup walls, no paywalls. Just better study.
              </p>
              <Button size="lg" variant="secondary"
                className="h-14 px-12 text-lg font-bold rounded-xl hover:scale-105 transition-transform"
                onClick={() => handleNav("/onboarding")}>
                Get Started — It's Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="py-10 border-t border-border/40">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded overflow-hidden shrink-0">
                <img src="/tab-icon.png" alt="Analogix" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold">Analogix</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              © 2026 Analogix · Built for all Australian students
            </p>
            <div className="flex items-center gap-6">
              <a href={SUPPORT_URL} className="text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Support</a>
              <a href={PRIVACY_URL} className="text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title="GitHub">
                <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8"/></svg>
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Landing;
