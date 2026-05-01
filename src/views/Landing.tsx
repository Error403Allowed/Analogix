'use client';

import { useState, useEffect, useRef } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { motion, useScroll, useTransform, AnimatePresence, useSpring, useMotionValue, useInView } from "framer-motion";
import {
  ArrowRight, Sparkles, BookOpen, MessageCircle, Brain, Trophy,
  Calculator, FlaskConical, Check, ChevronRight, Rocket, Shield,
  Lightbulb, Zap, Target, Clock, FileText, GraduationCap,
  Calendar, Layers, Star, TrendingUp, BookMarked, PenTool, Cpu,
  BookOpenText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import CursorParticles from "@/components/CursorParticles";
import { useAuth } from "@/context/AuthContext";

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(" ");
}

function TiltCard({ children, className, delay = 0, onClick }: { children: React.ReactNode; className?: string; delay?: number; onClick?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const xSpring = useSpring(x, { stiffness: 300, damping: 20 });
  const ySpring = useSpring(y, { stiffness: 300, damping: 20 });
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const xPct = (e.clientX - rect.left - centerX) / centerX;
    const yPct = (e.clientY - rect.top - centerY) / centerY;
    x.set(xPct * 8);
    y.set(yPct * 8);
  };
  
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.95 }}
      transition={{ delay, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX: ySpring, rotateY: xSpring, perspective: 1000 }}
      whileHover={{ scale: 1.02 }}
    >
      {children}
    </motion.div>
  );
}

function MagneticButton({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const xSpring = useSpring(x, { stiffness: 300, damping: 20 });
  const ySpring = useSpring(y, { stiffness: 300, damping: 20 });
  
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    x.set((e.clientX - rect.left - centerX) * 0.3);
    y.set((e.clientY - rect.top - centerY) * 0.3);
  };
  
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };
  
  return (
    <motion.button
      ref={ref}
      className={className}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: xSpring, y: ySpring }}
    >
      {children}
    </motion.button>
  );
}

function StaggeredList({ children, className, staggerDelay = 0.05 }: { children: React.ReactNode; className?: string; staggerDelay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  return (
    <motion.div ref={ref} className={className} initial="hidden" animate={isInView ? "visible" : "hidden"} variants={{
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { staggerChildren: staggerDelay } }
    }}>
      {children}
    </motion.div>
  );
}

function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.4, ease: "easeOut" }} className={className}>
      {children}
    </motion.div>
  );
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
    id: "study-guides",
    icon: BookOpenText,
    label: "Study Guides",
    color: "violet",
    headline: "AI generates complete guides from any file",
    desc: "Upload your notes, slides, or textbook chapters and watch AI transform them into comprehensive study guides. Complete with summaries, practice questions, and study schedules — all in seconds.",
    tags: ["Auto-generated", "Any file type", "Practice questions"],
    size: "sm",
  },
  {
    id: "flashcards",
    icon: Layers,
    label: "Flashcards",
    color: "emerald",
    headline: "Spaced repetition that actually works",
    desc: "Flip cards with built-in spaced repetition (SM-2 algorithm). Upload your notes and the AI builds your deck automatically. Three study modes: Review, Learn, and AI-generated Test.",
    tags: ["Smart scheduling", "Doc upload", "Learn + Test modes"],
    size: "sm",
  },
  {
    id: "quiz",
    icon: Target,
    label: "Adaptive Quiz",
    color: "orange",
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

const hoverColors: Record<string, string> = {
  blue: "hover:border-blue-500/30",
  violet: "hover:border-violet-500/30",
  emerald: "hover:border-emerald-500/30",
  amber: "hover:border-amber-500/30",
  rose: "hover:border-rose-500/30",
  cyan: "hover:border-cyan-500/30",
  indigo: "hover:border-indigo-500/30",
  orange: "hover:border-orange-500/30",
  yellow: "hover:border-yellow-500/30",
};

const colorMap: Record<string, { bg: string; text: string; border: string; tag: string; hoverBorder: string }> = {
  blue:   { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/20",   tag: "bg-blue-500/10 text-blue-400",   hoverBorder: "hover:border-blue-500/30" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20", tag: "bg-violet-500/10 text-violet-400", hoverBorder: "hover:border-violet-500/30" },
  emerald:{ bg: "bg-emerald-500/10",text: "text-emerald-400",border: "border-emerald-500/20",tag: "bg-emerald-500/10 text-emerald-400",hoverBorder: "hover:border-emerald-500/30" },
  amber:  { bg: "bg-amber-500/10",  text: "text-amber-400",  border: "border-amber-500/20",  tag: "bg-amber-500/10 text-amber-400",  hoverBorder: "hover:border-amber-500/30" },
  rose:   { bg: "bg-rose-500/10",   text: "text-rose-400",   border: "border-rose-500/20",   tag: "bg-rose-500/10 text-rose-400",   hoverBorder: "hover:border-rose-500/30" },
  cyan:   { bg: "bg-cyan-500/10",   text: "text-cyan-400",   border: "border-cyan-500/20",   tag: "bg-cyan-500/10 text-cyan-400",   hoverBorder: "hover:border-cyan-500/30" },
  indigo: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/20", tag: "bg-indigo-500/10 text-indigo-400", hoverBorder: "hover:border-indigo-500/30" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", tag: "bg-orange-500/10 text-orange-400", hoverBorder: "hover:border-orange-500/30" },
  yellow: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20", tag: "bg-yellow-500/10 text-yellow-400", hoverBorder: "hover:border-yellow-500/30" },
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
  const containerRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const whyRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  
  const heroY = useTransform(scrollYProgress, [0, 0.15], ["0%", "15%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 1.05]);
  
  const featuresScroll = useScroll({ target: featuresRef, offset: ["start end", "end start"] });
  const featuresY = useTransform(featuresScroll.scrollYProgress, [0, 1], ["5%", "-3%"]);
  
  const whyScroll = useScroll({ target: whyRef, offset: ["start end", "end start"] });
  const whyY = useTransform(whyScroll.scrollYProgress, [0, 1], ["3%", "-2%"]);
  
  const orb1Y = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);
  const orb2Y = useTransform(scrollYProgress, [0, 1], ["0%", "-50%"]);
  const orb3Y = useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]);
  const orb1X = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);
  const orb2X = useTransform(scrollYProgress, [0, 1], ["0%", "-15%"]);
  
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

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

  // Split features: first two large cards, then rest
  const heroFeatures = features.filter(f => f.size === "lg");
  const restFeatures = features.filter(f => f.size !== "lg");

  return (
    <div ref={containerRef} className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <CursorParticles />
      
      {/* Scroll progress indicator */}
      <motion.div 
        className="fixed top-16 left-0 right-0 h-0.5 bg-primary z-[99] origin-left"
        style={{ scaleX: smoothProgress }}
      />

      {/* ── Parallax floating shapes (background) ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div 
          style={{ y: orb1Y, x: orb1X }}
          className="absolute top-[15%] left-[5%] w-72 h-72 rounded-full bg-primary/8 blur-[120px]" 
        />
        <motion.div 
          style={{ y: orb2Y, x: orb2X }}
          className="absolute top-[40%] right-[8%] w-96 h-96 rounded-full bg-emerald-500/6 blur-[140px]" 
        />
        <motion.div 
          style={{ y: orb3Y }}
          className="absolute bottom-[20%] left-[15%] w-64 h-64 rounded-full bg-amber-500/6 blur-[100px]" 
        />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }} />
      </div>

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-[100] border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -16, filter: "blur(4px)" }} 
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => router.push("/")}
          >
            <motion.div 
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ duration: 0.3 }}
              className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25"
            >
              <Brain className="w-4.5 h-4.5 text-primary-foreground" style={{ width: 18, height: 18 }} />
            </motion.div>
            <span className="text-lg font-black tracking-tight">Analogix</span>
          </motion.div>

          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((link, i) => (
              <motion.button 
                key={link.label}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                onClick={() => handleNav(undefined, link.id)}
                className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </motion.button>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, x: 16, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.4 }}
          >
            <Button size="sm" className="rounded-full px-5 font-bold shadow-md shadow-primary/15"
              onClick={() => handleNav("/dashboard")}>
              {user ? "Dashboard" : "Get Started"}
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </motion.div>
        </div>
      </nav>

      <main className="relative pt-16">
        {/* ── Hero ── */}
        <section ref={heroRef} className="relative max-w-7xl mx-auto px-6 py-24 lg:py-36 text-center overflow-hidden">
          <motion.div style={{ y: heroY, opacity: heroOpacity, scale: heroScale }} className="space-y-7 relative z-10">
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
              <motion.div 
                key={s.label}
                initial={{ opacity: 0, y: 8 }} 
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} 
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <span className="text-2xl font-black text-primary">{s.value}</span>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{s.label}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section ref={featuresRef} id="features" className="py-28 px-6 max-w-7xl mx-auto">
          <motion.div style={{ y: featuresY }} className="relative z-10">
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

          {/* Hero feature cards — first two large features */}
          {heroFeatures.map((feature, idx) => {
            const c = colorMap[feature.color];
            const Icon = feature.icon;
            const isTutor = feature.id === "tutor";
            
            return (
              <TiltCard key={feature.id} delay={idx * 0.15} className={cn("rounded-3xl border border-border bg-card overflow-hidden mb-5 group", c.hoverBorder, "transition-colors")}>
                <div className="grid lg:grid-cols-2 gap-0">
                  <div className="p-10 lg:p-14 flex flex-col justify-center">
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border", c.bg, c.border)}
                    >
                      <Icon className={cn("w-7 h-7", c.text)} />
                    </motion.div>
                    <h3 className="text-3xl font-black mb-3">{feature.label}</h3>
                    <p className="text-muted-foreground leading-relaxed mb-6">{feature.desc}</p>
                    <div className="flex flex-wrap gap-2 mb-8">
                      {feature.tags.map((tag, i) => (
                        <motion.span 
                          key={tag}
                          initial={{ opacity: 0, scale: 0.8 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.3 + i * 0.05 }}
                          className={cn("text-xs font-bold px-3 py-1 rounded-full", c.tag)}
                        >
                          {tag}
                        </motion.span>
                      ))}
                    </div>
                    <Button className="w-fit" onClick={() => handleNav(`/${feature.id}`)}>
                      {isTutor ? "Try the tutor" : "Get started"} <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  <div className={cn("relative lg:min-h-[360px] flex items-center justify-center p-10",
                    isTutor ? "bg-gradient-to-br from-blue-500/5 to-transparent" : "bg-gradient-to-br from-violet-500/5 to-transparent")}>
                    {isTutor ? (
                      <div className="w-full max-w-sm space-y-3">
                        {[
                          { role: "user", content: "Explain Newton's 3rd law" },
                          { role: "ai", content: "Think of it like two players going for a 50/50 tackle in football. When Player A charges into Player B, Player B pushes back with equal force — that's Newton's 3rd law." },
                        ].map((msg, i) => (
                          <motion.div key={i}
                            initial={{ opacity: 0, x: msg.role === "user" ? 12 : -12 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 + i * 0.2, type: "spring", stiffness: 200 }}
                            className={cn("rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[88%]",
                              msg.role === "user"
                                ? "ml-auto bg-primary text-primary-foreground rounded-br-sm"
                                : "mr-auto bg-card border border-border text-foreground rounded-bl-sm"
                            )}>
                            {msg.content}
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="w-full max-w-sm space-y-3">
                        {[
                          { title: "Chapter 5: Waves", pages: "12 pages" },
                          { title: "Key Concepts", pages: "8 found" },
                          { title: "Practice Questions", pages: "15 included" },
                        ].map((item, i) => (
                          <motion.div key={i}
                            initial={{ opacity: 0, y: 8 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 200 }}
                            className="rounded-xl bg-card border border-border p-3 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", c.bg)}>
                                <FileText className={cn("w-4 h-4", c.text)} />
                              </div>
                              <span className="text-sm font-semibold">{item.title}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{item.pages}</span>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TiltCard>
            );
          })}

          {/* Remaining features grid */}
          <StaggeredList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch" staggerDelay={0.08}>
            {restFeatures.map((feature, i) => {
              const c = colorMap[feature.color];
              const Icon = feature.icon;
              return (
                <StaggerItem key={feature.id}>
                  <TiltCard delay={i * 0.08}
                    className={cn(
                      "rounded-2xl border border-border bg-card p-7 flex flex-col gap-4 transition-all cursor-pointer group h-full",
                      hoverColors[feature.color] || ""
                    )}
                    onClick={() => handleNav(`/${feature.id}`)}
                  >
                    <motion.div 
                      whileHover={{ rotate: 15, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className={cn("w-11 h-11 rounded-xl flex items-center justify-center border transition-colors", c.bg, c.border)}
                    >
                      <Icon className={cn("w-5 h-5", c.text)} />
                    </motion.div>
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
                  </TiltCard>
                </StaggerItem>
              );
            })}
          </StaggeredList>
          </motion.div>
        </section>

        {/* ── "Built for the way you learn" section ── */}
        <section ref={whyRef} id="why-analogix" className="py-28 px-6 border-t border-border/30">
          <motion.div style={{ y: whyY }} className="relative z-10">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="text-xs font-black uppercase tracking-[0.25em] text-primary mb-4"
              >
                Why Analogix
              </motion.p>
              <motion.h2 
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-10"
              >
                Built for the way<br /><span className="text-primary italic">you</span> learn.
              </motion.h2>
              <StaggeredList className="space-y-6" staggerDelay={0.1}>
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
                  <StaggerItem key={i}>
                    <motion.div 
                      whileHover={{ x: 8, scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="flex gap-4"
                    >
                      <motion.div 
                        whileHover={{ rotate: 15, scale: 1.1 }}
                        className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"
                      >
                        <item.icon className="w-4 h-4 text-primary" />
                      </motion.div>
                      <div>
                        <h4 className="font-black mb-1">{item.title}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                      </div>
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggeredList>
            </div>

            {/* Stats cards visual */}
            <div className="relative grid grid-cols-2 gap-4">
              <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full" />
              <div className="space-y-4 pt-8">
                {[
                  { icon: Trophy, label: "Achievement", value: "Quiz Master", color: "text-amber-500" },
                  { icon: Rocket, label: "Momentum", value: "7 Day Streak", color: "text-primary", dark: true },
                ].map((card, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 * i, type: "spring", stiffness: 200 }}
                    whileHover={{ scale: 1.03, y: -4 }}
                    className={cn(
                      "rounded-3xl p-6 flex flex-col gap-8 shadow-xl cursor-pointer",
                      card.dark ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                    )}
                  >
                    <motion.div whileHover={{ rotate: 15, scale: 1.1 }}>
                      <card.icon className={cn("w-7 h-7", card.dark ? "text-primary-foreground" : card.color)} />
                    </motion.div>
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
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15 + 0.1 * i, type: "spring", stiffness: 200 }}
                    whileHover={{ scale: 1.03, y: -4 }}
                    className="rounded-3xl bg-card border border-border p-6 flex flex-col gap-6 shadow-xl cursor-pointer"
                  >
                    <motion.div whileHover={{ rotate: 15, scale: 1.1 }}>
                      <card.icon className="w-7 h-7 text-muted-foreground" />
                    </motion.div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{card.label}</p>
                      <p className="text-2xl font-black">{card.value}</p>
                      {card.progress !== undefined && (
                        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }} 
                            whileInView={{ width: `${card.progress}%` }}
                            viewport={{ once: true }} 
                            transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                            className={cn("h-full rounded-full", card.color)} 
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
          </motion.div>
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
