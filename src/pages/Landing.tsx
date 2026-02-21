"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  BookOpen,
  MessageCircle,
  Zap,
  Shield,
  Brain,
  Trophy,
  Star,
  Users,
  Calculator,
  FlaskConical,
  Landmark,
  Globe,
  HeartPulse,
  Cpu,
  Percent,
  Wrench,
  Stethoscope,
  Languages,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import CursorParticles from "@/components/CursorParticles";

const Landing = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const THEME_ORDER_KEY = "landingThemeOrder";
  const THEME_INDEX_KEY = "landingThemeIndex";

  // Random Theme Logic (no repeats until all themes cycle)
  useEffect(() => {
    setIsMounted(true);
    try {
      const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
      setHasCompletedOnboarding(Boolean(prefs?.onboardingComplete));
    } catch {
      setHasCompletedOnboarding(false);
    }

    const themes = [
      { p: { h: "199.2", s: "78.2%", l: "48.3%" }, g: ["#0ea5a6", "#2563eb", "#0f766e"] }, // Coastal
      { p: { h: "147", s: "56%", l: "38%" }, g: ["#15803d", "#16a34a", "#0f766e"] }, // Forest
      { p: { h: "32", s: "76%", l: "52%" }, g: ["#f59e0b", "#f97316", "#ea580c"] }, // Amber
    ];

    const loadOrder = () => {
      try {
        const stored = JSON.parse(localStorage.getItem(THEME_ORDER_KEY) || "[]");
        if (Array.isArray(stored) && stored.length === themes.length) {
          return stored;
        }
      } catch {}
      // Create a shuffled order
      const order = themes.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      localStorage.setItem(THEME_ORDER_KEY, JSON.stringify(order));
      localStorage.setItem(THEME_INDEX_KEY, "0");
      return order;
    };

    const order = loadOrder();
    const rawIndex = Number(localStorage.getItem(THEME_INDEX_KEY) || "0");
    const index = Number.isFinite(rawIndex) ? rawIndex : 0;
    const themeIndex = order[index % order.length];
    const nextIndex = (index + 1) % order.length;
    localStorage.setItem(THEME_INDEX_KEY, String(nextIndex));

    const randomTheme = themes[themeIndex];
    const root = document.documentElement;
    
    // Inject the random colors into the CSS variables
    root.style.setProperty("--p-h", randomTheme.p.h);
    root.style.setProperty("--p-s", randomTheme.p.s);
    root.style.setProperty("--p-l", randomTheme.p.l);
    root.style.setProperty("--g-1", randomTheme.g[0]);
    root.style.setProperty("--g-2", randomTheme.g[1]);
    root.style.setProperty("--g-3", randomTheme.g[2]);
  }, []);

  useEffect(() => {
    // Automatic redirect removed as per user request
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const handleNav = (path: string) => {
    if (!isMounted) return;
    if (!hasCompletedOnboarding) {
      router.push("/onboarding");
      return;
    }
    router.push(path);
  };

  const features = [
    {
      icon: Brain,
      title: "Learn Through Analogies",
      description: "Complex ideas explained through familiar references.",
      iconBgClass: "bg-primary/10",
      iconClass: "text-primary"
    },
    {
      icon: Zap,
      title: "Adaptive Practice",
      description: "Questions that respond to how you learn.",
      iconBgClass: "bg-primary/10",
      iconClass: "text-primary"
    },
    {
      icon: Shield,
      title: "ACARA Aligned",
      description: "Covering all Australian Curriculum subjects for Year 7-12.",
      iconBgClass: "bg-primary/10",
      iconClass: "text-primary"
    },
    {
      icon: Bot,
      title: "AI-Powered Tutor",
      description: "Trained on the Australian Curriculum and student data for personalized support.",
      iconBgClass: "bg-primary/10",
      iconClass: "text-primary"
    }
  ];

  const subjects = [
    { icon: BookOpen, label: "English" },
    { icon: Calculator, label: "Maths" },
    { icon: FlaskConical, label: "Science" },
    { icon: HeartPulse, label: "PDHPE" },
    { icon: Landmark, label: "History" },
    { icon: Globe, label: "Geography" },
    { icon: Trophy, label: "Commerce" },
    { icon: Cpu, label: "Digital Tech" },
    { icon: Wrench, label: "Engineering" },
    { icon: Stethoscope, label: "Medicine" },
    { icon: Languages, label: "Languages" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-background selection:bg-primary/30">
      <CursorParticles />
      {/* Background Blobs - Better distributed */}
      <div className="liquid-blob w-[600px] h-[600px] bg-primary/20 -top-72 -left-72 fixed blur-3xl" />
      <div className="liquid-blob w-[500px] h-[500px] bg-accent/20 top-1/3 -right-64 fixed blur-3xl opacity-30" style={{ animationDelay: "-2s" }} />
      <div className="liquid-blob w-[400px] h-[400px] bg-secondary/10 bottom-0 left-1/4 fixed blur-3xl" style={{ animationDelay: "-4s" }} />

      {/* Navigation */}
      <nav className="relative z-20 px-8 py-6 max-w-7xl mx-auto backdrop-blur-sm">
        <div className="flex items-center justify-between gap-6">
          <span className="text-2xl font-black gradient-text tracking-tighter">
            Analogix
          </span>
          <div className="hidden md:flex items-center gap-6 text-sm font-black text-muted-foreground">
            <button onClick={() => handleNav("/quiz")} className="hover:text-primary transition-colors">
              Quizzes
            </button>
            <button onClick={() => handleNav("/chat")} className="hover:text-primary transition-colors">
              Chat
            </button>
            <button onClick={() => handleNav("/calendar")} className="hover:text-primary transition-colors">
              Calendar
            </button>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button
              className="gradient-primary text-primary-foreground border-0 shadow-lg px-6 font-bold"
              onClick={() => handleNav("/dashboard")}
            >
              {hasCompletedOnboarding ? "Dashboard" : "Get Started"}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-8 pt-20 pb-32">
          <motion.div
            className="grid lg:grid-cols-2 gap-16 items-center"
            variants={containerVariants}
            initial={false}
            animate="visible"
          >
            <div className="space-y-8">
              <motion.div variants={itemVariants} initial={{ opacity: 1, y: 0 }}>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-sm mb-6">
                  <Sparkles className="w-4 h-4" />
                  Personal Learning Studio
                </span>
                <h1 className="text-6xl md:text-8xl font-black text-foreground leading-[0.9] tracking-tight mb-6">
                  Learn with <span className="gradient-text">clarity</span> and momentum.
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground max-w-lg leading-relaxed">
                  Turn complex ACARA subjects into clear, memorable analogies based on what you care about.
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-wrap gap-4 pt-4" initial={{ opacity: 1, y: 0 }}>
                <Button 
                  size="lg" 
                  className="h-16 px-10 text-xl font-black gradient-primary text-primary-foreground border-0 shadow-2xl hover:scale-105 transition-transform rounded-2xl"
                  onClick={() => router.push(hasCompletedOnboarding ? "/dashboard" : "/onboarding")}
                >
                  {hasCompletedOnboarding ? "Go to Dashboard" : "Start Learning Now"}
                  <ArrowRight className="ml-2 w-6 h-6" />
                </Button>
              </motion.div>

              <motion.div variants={itemVariants} className="flex items-center gap-8 pt-8 border-t border-border/50 mt-12" initial={{ opacity: 1, y: 0 }}>
                <div>
                  <div className="text-3xl font-black text-foreground">2,000+</div>
                  <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Students</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-foreground">98%</div>
                  <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Success Rate</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-foreground">50+</div>
                  <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Topics</div>
                </div>
              </motion.div>
            </div>

            <motion.div 
              variants={itemVariants}
              className="relative hidden lg:flex justify-center items-center"
              initial={{ opacity: 1, y: 0 }}
            >
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
              <motion.div
                animate={{ y: [0, -30, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10"
              >
              </motion.div>
              
              {/* Floating Interest Bubbles */}
              <motion.div 
                className="absolute -top-10 -right-4 glass-card p-5 flex items-center gap-4 shadow-2xl rotate-3"
                animate={{ y: [0, 15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="w-12 h-12 rounded-full gradient-accent grid place-items-center">
                  <Percent className="w-6 h-6 text-primary-foreground block" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-black uppercase">Study Score</p>
                  <p className="font-black text-lg">78% Retention Increase</p>
                </div>
              </motion.div>

              <motion.div 
                className="absolute -bottom-12 -left-4 glass-card p-5 flex items-center gap-4 shadow-2xl -rotate-3"
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <div className="w-12 h-12 rounded-full gradient-primary grid place-items-center">
                  <MessageCircle className="w-6 h-6 text-primary-foreground block" />
                </div>
                <div>   
                  <p className="text-xs text-muted-foreground font-black uppercase">Analogy Tutor</p>
                  <p className="font-black text-lg">Focused Explanations</p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="bg-muted/30 py-32 border-y border-border/50">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-20 space-y-4">
              <h2 className="text-4xl md:text-5xl font-black text-foreground">Built for focused study</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">We connect what you need to know with what you already understand.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-10">
              {features.map((feature, i) => (
                <motion.div 
                  key={i}
                  className="glass-card p-10 space-y-6 hover:border-primary/50 transition-all group"
                  initial={{ opacity: 1, y: 0 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-2xl ${feature.iconBgClass} grid place-items-center group-hover:scale-110 transition-transform`}>
                      <feature.icon className={`w-7 h-7 ${feature.iconClass} block`} />
                    </div>
                    <h3 className="text-2xl font-black">{feature.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-lg leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Subjects Grid */}
        <section className="py-32">
          <div className="max-w-7xl mx-auto px-8 text-center">
            <h2 className="text-4xl font-black mb-16">Master Every Subject</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-left">
              {subjects.map((sub, i) => (
                <motion.div 
                  key={i}
                  className="glass-card p-6 hover:bg-primary/5 transition-colors cursor-default"
                  whileHover={{ y: -5 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
                      <sub.icon className="w-5 h-5 block" />
                    </div>
                    <span className="text-lg font-black text-foreground">{sub.label}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 max-w-5xl mx-auto px-8">
          <motion.div 
            className="glass-card p-16 text-center relative overflow-hidden gradient-primary text-primary-foreground border-none"
            initial={{ opacity: 1, scale: 1 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent)] pointer-events-none" />
            <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">Ready to master high school?</h2>
            <p className="text-xl mb-12 opacity-90 max-w-2xl mx-auto">Join the new way of learning. No more boring textbooks. Just analogies that stick.</p>
            <Button 
               size="lg" 
               className="h-16 px-12 text-2xl font-black bg-white text-primary hover:bg-white/90 border-0 shadow-2xl rounded-2xl"
               onClick={() => router.push("/onboarding")}
            >
              Get Started Now
            </Button>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-border mt-20">
          <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary grid place-items-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-xl font-black text-foreground">Analogix</span>
            </div>
            <p className="text-muted-foreground font-bold">© 2024 Analogix. Focused academic support.</p>
            <div className="flex gap-8 font-bold text-muted-foreground">
              <button className="hover:text-primary transition-colors">Privacy</button>
              <button className="hover:text-primary transition-colors">Terms</button>
              <button className="hover:text-primary transition-colors">Contact</button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Landing;
