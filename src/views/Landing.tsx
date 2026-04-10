"use client";

import { useState, useEffect, useRef } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Sparkles, BookOpen, MessageCircle, Brain, Trophy,
  Calculator, FlaskConical, Check, ChevronRight, Rocket, Shield,
  Lightbulb, Zap, Target, Clock, FileText, GraduationCap,
  Calendar, Layers, Star, TrendingUp, BookMarked, PenTool, Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import CursorParticles from "@/components/CursorParticles";
import { useAuth } from "@/context/AuthContext";

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(" ");
}

// ── Feature Data ────────────────────────────────────────────────────────────

const features = [
  {
    id: "tutor",
    icon: MessageCircle,
    label: "AI Tutor",
    color: "blue",
    headline: "Explains things using what YOU love",
    desc: "The AI tutor learns your hobbies — gaming, sport, music — and uses them as analogies to explain any concept. Maths via FIFA stats. Chemistry via cooking. History via game lore. Finally, a tutor that actually speaks your language.",
    tags: ["Unlimited use", "Free", "Analogy-first"],
    size: "lg",
  },
  {
    id: "flashcards",
    icon: Layers,
    label: "Flashcards",
    color: "violet",
    headline: "Spaced repetition that actually works",
    desc: "Flip cards with built-in spaced repetition (SM-2 algorithm). Upload your notes and the AI builds your deck automatically. Three study modes: Review, Learn, and AI-generated Test.",
    tags: ["Smart scheduling", "Doc upload", "Learn + Test modes"],
    size: "sm",
  },
  {
    id: "quiz",
    icon: Target,
    label: "Adaptive Quiz",
    color: "emerald",
    headline: "AI quizzes with analogy hints built in",
    desc: "Every question comes with an analogy hint tied to your interests. Choose difficulty, set a timer, and get a full AI-powered review of where you went wrong.",
    tags: ["Configurable difficulty", "Timed mode", "AI review"],
    size: "sm",
  },
  {
    id: "calendar",
    icon: Calendar,
    label: "Smart Calendar",
    color: "amber",
    headline: "Deadlines you won't forget",
    desc: "Import your school timetable via .ics, add exams and assignments manually, and get an overview of upcoming events alongside Australian school term data — no more checking Sentral.",
    tags: ["ICS import", "Term tracking", "Exam countdowns"],
    size: "sm",
  },
  {
    id: "subjects",
    icon: BookOpen,
    label: "Subject Workspace",
    color: "rose",
    headline: "Your notes, organised by subject",
    desc: "Create rich documents, AI-generated study guides, and flashcard sets — all organised by subject. Upload a syllabus PDF and the AI builds a full study guide in seconds.",
    tags: ["AI study guides", "Rich editor", "Subject-organised"],
    size: "sm",
  },
  {
    id: "resources",
    icon: BookMarked,
    label: "Resources Hub",
    color: "cyan",
    headline: "Past papers & textbooks, all in one place",
    desc: "Curated past papers and textbook links for every subject, filtered to your state's curriculum. Stop Googling. Everything's already here.",
    tags: ["Past papers", "Textbooks", "State-filtered"],
    size: "sm",
  },
  {
    id: "formulas",
    icon: Calculator,
    label: "Formula Sheets",
    color: "indigo",
    headline: "Every formula, searchable, always ready",
    desc: "Instant access to formula sheets for Maths, Physics, Chemistry and more — all rendered in proper LaTeX. Pull them up inside the AI chat while you study.",
    tags: ["LaTeX rendering", "In-chat access", "All subjects"],
    size: "sm",
  },
  {
    id: "timer",
    icon: Clock,
    label: "Pomodoro Timer",
    color: "orange",
    headline: "Study smarter with structured focus",
    desc: "Built-in Pomodoro timer on your dashboard. Stay in the zone, track your sessions, and know when to take a break.",
    tags: ["Focus sessions", "Break reminders", "Dashboard widget"],
    size: "sm",
  },
  {
    id: "achievements",
    icon: Trophy,
    label: "Achievements",
    color: "yellow",
    headline: "Get recognised for your hard work",
    desc: "Earn badges and build streaks as you study. An achievement system that actually rewards consistency — not just raw scores.",
    tags: ["Badges", "Streaks", "XP system"],
    size: "sm",
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string; tag: string }> = {
  blue:   { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/20",   tag: "bg-blue-500/10 text-blue-400" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20", tag: "bg-violet-500/10 text-violet-400" },
  emerald:{ bg: "bg-emerald-500/10",text: "text-emerald-400",border: "border-emerald-500/20",tag: "bg-emerald-500/10 text-emerald-400" },
  amber:  { bg: "bg-amber-500/10",  text: "text-amber-400",  border: "border-amber-500/20",  tag: "bg-amber-500/10 text-amber-400" },
  rose:   { bg: "bg-rose-500/10",   text: "text-rose-400",   border: "border-rose-500/20",   tag: "bg-rose-500/10 text-rose-400" },
  cyan:   { bg: "bg-cyan-500/10",   text: "text-cyan-400",   border: "border-cyan-500/20",   tag: "bg-cyan-500/10 text-cyan-400" },
  indigo: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/20", tag: "bg-indigo-500/10 text-indigo-400" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", tag: "bg-orange-500/10 text-orange-400" },
  yellow: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20", tag: "bg-yellow-500/10 text-yellow-400" },
};

// ── Stat ticker items ───────────────────────────────────────────────────────
const stats = [
  { value: "15", label: "Subjects covered" },
  { value: "100%", label: "Free to use" },
  { value: "8", label: "Study tools" },
  { value: "Y7–12", label: "All year levels" },
  { value: "ACARA", label: "Curriculum aligned" },
];

// ── Nav links ───────────────────────────────────────────────────────────────
const navLinks = [
  { label: "Features", id: "features" },
  { label: "Why Analogix", id: "why-analogix" },
];

// ── Main component ───────────────────────────────────────────────────────────

const Landing = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

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

  const forceLanding =
    searchParams?.get("force") === "true" || searchParams?.get("force") === "1";

  // Don't auto-redirect - let users explore the landing page
  // Only redirect on button click based on auth status

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--p-h", "199.2");
    root.style.setProperty("--p-s", "78.2%");
    root.style.setProperty("--p-l", "48.3%");
  }, []);

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const handleNav = (path?: string, sectionId?: string) => {
    if (!isMounted || loading) return;
    
    // If scrolling to a section on this page
    if (sectionId) {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    
    // If not signed in, redirect to onboarding
    // If signed in, go to dashboard
    if (!user) {
      router.push("/onboarding?step=2");
    } else {
      router.push(path || "/dashboard");
    }
  };

  // Split features: large AI Tutor card first, then rest
  const [heroFeature, ...restFeatures] = features;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <CursorParticles />

      {/* ── Ambient background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 10% 15%, rgba(37,99,235,0.15) 0%, transparent 45%)," +
              "radial-gradient(circle at 85% 20%, rgba(34,197,94,0.12) 0%, transparent 40%)," +
              "radial-gradient(circle at 65% 80%, rgba(245,158,11,0.14) 0%, transparent 45%)," +
              "radial-gradient(circle at 20% 82%, rgba(139,92,246,0.10) 0%, transparent 40%)"
          }} />
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }} />
      </div>

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-[100] border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => router.push("/")}
          >
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <Brain className="w-4.5 h-4.5 text-primary-foreground" style={{ width: 18, height: 18 }} />
            </div>
            <span className="text-lg font-black tracking-tight">Analogix</span>
          </motion.div>

          <div className="hidden md:flex items-center gap-7">
            {navLinks.map(link => (
              <button key={link.label}
                onClick={() => handleNav(undefined, link.id)}
                className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                {link.label}
              </button>
            ))}
          </div>

          <Button size="sm" className="rounded-full px-5 font-bold shadow-md shadow-primary/15"
            onClick={() => handleNav("/dashboard")}>
            {user ? "Dashboard" : "Get Started"}
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </nav>

      <main className="pt-16">
        {/* ── Hero ── */}
        <section ref={heroRef} className="relative max-w-7xl mx-auto px-6 py-24 lg:py-36 text-center overflow-hidden">
          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="space-y-7">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Built for all Australian students
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[0.92] text-balance">
              Actually <em className="text-primary not-italic">understand</em>
              <br className="hidden sm:block" /> what you study.
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Every tool you need to go from confused to confident — for free. Quizzes, flashcards, study guides, a smart calendar, and an AI tutor that actually speaks your language.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button size="lg" className="h-13 px-8 text-base font-black rounded-2xl shadow-xl shadow-primary/20 group"
                style={{ height: 52 }}
                onClick={() => handleNav("/onboarding")}>
                Start for free
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg" className="h-13 px-8 text-base font-bold rounded-2xl border-2"
                style={{ height: 52 }}
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
                See all features
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* ── Stats ticker ── */}
        <section className="border-y border-border/40 bg-card/40 backdrop-blur-sm py-4 overflow-hidden">
          <div className="flex items-center justify-center gap-10 sm:gap-16 flex-wrap px-6">
            {stats.map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3">
                <span className="text-2xl font-black text-primary">{s.value}</span>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{s.label}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="py-28 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="text-xs font-black uppercase tracking-[0.25em] text-primary mb-3">
              Everything in one place
            </motion.p>
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-4">
              Every tool you need to level up.
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground max-w-lg mx-auto">
              Not just an AI chat. Flashcards, quizzes, a calendar, study guides, resources, formula sheets — all working together.
            </motion.p>
          </div>

          {/* Hero feature card — AI Tutor */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-border bg-card overflow-hidden mb-5 group hover:border-blue-500/30 transition-colors"
          >
            <div className="grid lg:grid-cols-2 gap-0">
              <div className="p-10 lg:p-14 flex flex-col justify-center">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border",
                  colorMap.blue.bg, colorMap.blue.border)}>
                  <MessageCircle className={cn("w-7 h-7", colorMap.blue.text)} />
                </div>
                <h3 className="text-3xl font-black mb-3">AI Tutor</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  The AI tutor learns your hobbies — gaming, sport, music — and uses them as analogies to explain any concept. Maths via FIFA stats. Chemistry via cooking. History via game lore. Finally, a tutor that actually speaks your language.
                </p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {["Unlimited & free", "Analogy-powered", "ACARA aligned", "Streaming responses"].map(tag => (
                    <span key={tag} className={cn("text-xs font-bold px-3 py-1 rounded-full", colorMap.blue.tag)}>{tag}</span>
                  ))}
                </div>
                <Button className="w-fit" onClick={() => handleNav("/chat")}>
                  Try the tutor <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="relative bg-gradient-to-br from-blue-500/5 to-transparent lg:min-h-[360px] flex items-center justify-center p-10">
                <div className="w-full max-w-sm space-y-3">
                  {[
                    { role: "user", content: "Explain Newton's 3rd law" },
                    { role: "ai", content: "Think of it like two players going for a 50/50 tackle in football. When Player A charges into Player B, Player B pushes back with equal force in the opposite direction — that's Newton's 3rd law. Every action has an equal and opposite reaction." },
                  ].map((msg, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: msg.role === "user" ? 12 : -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.2 }}
                      className={cn("rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[88%]",
                        msg.role === "user"
                          ? "ml-auto bg-primary text-primary-foreground rounded-br-sm"
                          : "mr-auto bg-card border border-border text-foreground rounded-bl-sm"
                      )}>
                      {msg.content}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Remaining features grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {restFeatures.map((feature, i) => {
              const c = colorMap[feature.color];
              const Icon = feature.icon;
              return (
                <motion.div key={feature.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className={cn(
                    "rounded-2xl border border-border bg-card p-7 flex flex-col gap-4 hover:border-border/80 transition-all hover:-translate-y-0.5 cursor-pointer group",
                    `hover:border-${feature.color}-500/30`
                  )}
                  onClick={() => handleNav(`/${feature.id}`)}
                >
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center border", c.bg, c.border)}>
                    <Icon className={cn("w-5 h-5", c.text)} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-lg font-black">{feature.label}</h3>
                    </div>
                    <p className="text-xs font-bold text-muted-foreground mb-2">{feature.headline}</p>
                    <p className="text-sm text-muted-foreground/80 leading-relaxed">{feature.desc}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {feature.tags.map(tag => (
                      <span key={tag} className={cn("text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide", c.tag)}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── "Built for the way you learn" section ── */}
        <section id="why-analogix" className="py-28 px-6 border-t border-border/30">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                className="text-xs font-black uppercase tracking-[0.25em] text-primary mb-4">
                Why Analogix
              </motion.p>
              <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-10">
                Built for the way<br /><span className="text-primary italic">you</span> learn.
              </motion.h2>
              <div className="space-y-6">
                {[
                  {
                    icon: Sparkles,
                    title: "Personalised for your interests",
                    desc: "Your hobbies power the analogies. Football, gaming, art — the AI adapts every explanation to something you already understand."
                  },
                  {
                    icon: Shield,
                    title: "ACARA curriculum aligned",
                    desc: "Every subject, every year level, mapped directly to the Australian curriculum. No fluff — just what's in your exams."
                  },
                  {
                    icon: Trophy,
                    title: "Gamified to keep you going",
                    desc: "Badges, streaks, and achievements that reward consistent effort. Because study shouldn't feel like a punishment."
                  },
                  {
                    icon: Zap,
                    title: "Everything is free",
                    desc: "No subscriptions, no paywalls, no ads. Every single feature — AI tutor, flashcards, quizzes, all of it — completely free."
                  },
                ].map((item, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-4"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-black mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Stats cards visual */}
            <div className="relative grid grid-cols-2 gap-4">
              <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full" />
              <div className="space-y-4 pt-8">
                {[
                  { icon: Trophy, label: "Achievement", value: "Quiz Master", color: "text-amber-500" },
                  { icon: Rocket, label: "Momentum", value: "7 Day Streak", color: "text-primary", dark: true },
                ].map((card, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }} transition={{ delay: 0.1 * i }}
                    className={cn(
                      "rounded-3xl p-6 flex flex-col gap-8 shadow-xl",
                      card.dark ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                    )}>
                    <card.icon className={cn("w-7 h-7", card.dark ? "text-primary-foreground" : card.color)} />
                    <div>
                      <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1",
                        card.dark ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {card.label}
                      </p>
                      <p className="text-lg font-black">{card.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="space-y-4">
                {[
                  { icon: TrendingUp, label: "Accuracy", value: "87%", progress: 87, color: "bg-emerald-500" },
                  { icon: Target, label: "Quizzes done", value: "23", color: "bg-blue-500" },
                ].map((card, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }} transition={{ delay: 0.15 + 0.1 * i }}
                    className="rounded-3xl bg-card border border-border p-6 flex flex-col gap-6 shadow-xl">
                    <card.icon className="w-7 h-7 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{card.label}</p>
                      <p className="text-2xl font-black">{card.value}</p>
                      {card.progress !== undefined && (
                        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} whileInView={{ width: `${card.progress}%` }}
                            viewport={{ once: true }} transition={{ duration: 1, delay: 0.5 }}
                            className={cn("h-full rounded-full", card.color)} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-28 px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto rounded-[2.5rem] bg-foreground text-background p-14 md:p-24 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "36px 36px" }} />
            <div className="relative z-10 space-y-7">
              <h2 className="text-4xl sm:text-6xl font-black tracking-tight leading-none">
                Stop guessing.<br />Start mastering.
              </h2>
              <p className="text-lg text-background/70 max-w-md mx-auto leading-relaxed">
                Every tool, completely free. No signup walls, no paywalls. Just better study.
              </p>
              <Button size="lg" variant="secondary"
                className="h-14 px-12 text-lg font-black rounded-2xl hover:scale-105 transition-transform"
                onClick={() => handleNav("/onboarding")}>
                Get Started — It's Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        </section>

        {/* ── Footer ── */}
        <footer className="py-10 border-t border-border/40">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Brain className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-black">Analogix</span>
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              © 2026 Analogix · Built for all Australian students
            </p>
            <div className="flex gap-7">
              {["Support", "Privacy"].map(item => (
                <button key={item}
                  className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                  {item}
                </button>
              ))}
            </div>
          </div>
        </footer>
      </main>

      <SpeedInsights />
    </div>
  );
};

export default Landing;
