"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  BookOpen,
  MessageCircle,
  Zap,
  Brain,
  Trophy,
  Calculator,
  FlaskConical,
  Landmark,
  Globe,
  HeartPulse,
  Cpu,
  Palette,
  Check,
  ChevronRight,
  Target,
  Rocket,
  Shield,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Head from "next/head";
import { ThemeToggle } from "@/components/ThemeToggle";
import CursorParticles from "@/components/CursorParticles";

const Landing = () => {
  const router = useRouter();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const smartSimpleRef = useRef(null);
  const ctaRef = useRef(null);

  const THEME_ORDER_KEY = "landingThemeOrder";
  const THEME_INDEX_KEY = "landingThemeIndex";

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
        if (Array.isArray(stored) && stored.length === themes.length) return stored;
      } catch {}
      const order = themes.map((_, i) => i).sort(() => Math.random() - 0.5);
      localStorage.setItem(THEME_ORDER_KEY, JSON.stringify(order));
      localStorage.setItem(THEME_INDEX_KEY, "0");
      return order;
    };

    const order = loadOrder();
    const rawIndex = Number(localStorage.getItem(THEME_INDEX_KEY) || "0");
    const index = Number.isFinite(rawIndex) ? rawIndex : 0;
    const themeIndex = order[index % order.length];
    localStorage.setItem(THEME_INDEX_KEY, String((index + 1) % order.length));

    const randomTheme = themes[themeIndex];
    const root = document.documentElement;
    root.style.setProperty("--p-h", randomTheme.p.h);
    root.style.setProperty("--p-s", randomTheme.p.s);
    root.style.setProperty("--p-l", randomTheme.p.l);
    root.style.setProperty("--g-1", randomTheme.g[0]);
    root.style.setProperty("--g-2", randomTheme.g[1]);
    root.style.setProperty("--g-3", randomTheme.g[2]);
  }, []);

  // Hero section animations
  const { scrollYProgress: heroScrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  const heroScale = useTransform(heroScrollYProgress, [0, 1], [1, 0.9]);
  const heroOpacity = useTransform(heroScrollYProgress, [0, 0.5], [1, 0]);

  const { scrollYProgress: smartSimpleScrollYProgress } = useScroll({
    target: smartSimpleRef,
    offset: ["start end", "end start"]
  });
  const smartSimpleOpacity = useTransform(smartSimpleScrollYProgress, [0, 0.3], [0, 1]);

  const { scrollYProgress: ctaScrollYProgress } = useScroll({
    target: ctaRef,
    offset: ["start end", "end start"]
  });
  const ctaScale = useTransform(ctaScrollYProgress, [0, 0.5], [0.9, 1]);
  const ctaOpacity = useTransform(ctaScrollYProgress, [0, 0.3], [0, 1]);

  const handleNav = (path: string) => {
    if (!isMounted) return;
    router.push(hasCompletedOnboarding ? path : "/onboarding");
  };

  const bentoFeatures = [
    {
      title: "Analogy Tutor",
      desc: "Complex topics explained through your hobbies. No jargon.",
      icon: MessageCircle,
      size: "lg",
      color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      image: true
    },
    {
      title: "Smart Calendar",
      desc: "Study plans that actually fit your life.",
      icon: Lightbulb,
      size: "sm",
      color: "bg-amber-500/10 text-amber-500 border-amber-500/20"
    },
    {
      title: "Knowledge Lab",
      desc: "Practice with quizzes that adapt to you.",
      icon: FlaskConical,
      size: "sm",
      color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
    },
    {
      title: "ACARA Aligned",
      desc: "Every subject mapped to the curriculum.",
      icon: Shield,
      size: "sm",
      color: "bg-purple-500/10 text-purple-500 border-purple-500/20"
    },
    {
      title: "Achievement System",
      desc: "Earn badges and level up your academic core.",
      icon: Trophy,
      size: "lg",
      color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      stats: true
    }
  ];

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30 font-sans text-foreground">
      <Head>
        <title>Analogix | Master the Curriculum</title>
        <meta name="description" content="The study upgrade for Australian students. Turn complex topics into simple analogies." />
      </Head>
      
      <CursorParticles />
      
      {/* Background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] dark:opacity-[0.05]" 
             style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-md border-b border-border/40 bg-background/80">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push("/")}
          >
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight font-display">
              Analogix
            </span>
          </motion.div>
          
          <div className="hidden md:flex items-center gap-8">
            {["Tutor", "Quizzes", "Calendar"].map((item) => (
              <button 
                key={item}
                onClick={() => handleNav(`/${item === 'Tutor' ? 'chat' : item.toLowerCase()}`)}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                {item}
              </button>
            ))}
            <div className="h-4 w-[1px] bg-border" />
            <ThemeToggle />
            <Button
              variant="default"
              size="sm"
              className="rounded-full px-6 font-semibold shadow-md shadow-primary/10"
              onClick={() => handleNav("/dashboard")}
            >
              {hasCompletedOnboarding ? "Dashboard" : "Get Started"}
            </Button>
          </div>
        </div>
      </nav>

      <main className="relative pt-12=8">
        {/* Hero Section */}
        <section ref={heroRef} className="max-w-7xl mx-auto px-6 py-20 lg:py-32 overflow-hidden relative z-10">
          <motion.div 
            style={{ scale: heroScale, opacity: heroOpacity }}
            className="text-center space-y-8"
          >
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4"
            >
              <Sparkles className="w-3.5 h-3.5" />
              The student upgrade
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl md:text-8xl lg:text-9xl font-bold font-display tracking-tight leading-[0.9] text-balance"
            >
              Actually <span className="text-primary italic">understand</span> <br className="hidden md:block" /> what you study.
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              We turn syllabus stress into simple analogies. <br className="hidden md:block" /> 
              The ultimate study buddy for the Australian Curriculum.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Button 
                size="lg" 
                className="h-14 px-8 text-lg font-bold rounded-2xl group transition-all duration-300 shadow-xl shadow-primary/20"
                onClick={() => handleNav("/onboarding")}
              >
                Start for free
                <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="h-14 px-8 text-lg font-bold rounded-2xl border-2"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                See features
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Bento Grid */}
        <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight mb-4">Everything to level up.</h2>
            <p className="text-muted-foreground">Modern tools built for how students actually think.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px]">
            {bentoFeatures.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "p-8 rounded-[2.5rem] bg-card border border-border shadow-sm flex flex-col justify-between overflow-hidden relative group hover:border-primary/30 transition-colors",
                  item.size === "lg" ? "md:col-span-2" : "md:col-span-1"
                )}
              >
                <div className="relative z-10">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border", item.color)}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold font-display mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm max-w-xs">{item.desc}</p>
                </div>
                
                {item.image && (
                   <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-br from-primary/20 to-transparent blur-3xl -mb-10 -mr-10 opacity-50 group-hover:opacity-100 transition-opacity" />
                )}
                
                {item.stats && (
                  <div className="absolute bottom-6 right-8 flex items-center gap-2">
                    <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: '75%' }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full bg-primary" 
                      />
                    </div>
                    <span className="text-[10px] font-bold text-primary">LVL 12</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* The "Smart but Simple" Section */}
        <section ref={smartSimpleRef} className="py-24 px-6 overflow-hidden relative">
          <motion.div style={{ opacity: smartSimpleOpacity }} className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div>
                <h2 className="text-4xl md:text-6xl font-bold font-display tracking-tight mb-8">
                  Built for the <br /> <span className="text-primary italic">way you learn.</span>
                </h2>
                <div className="space-y-6">
                  {[
                    { title: "Personalised for you", desc: "Your interests drive the explanations. Football, gaming, or art—we adapt to you." },
                    { title: "Curriculum Focused", desc: "Mapped directly to Year 7-12 Australian standards. No fluff, just results." },
                    { title: "Gamified Progress", desc: "Earn badges and level up as you master subjects. Because study shouldn't be boring." }
                  ].map((item, i) => (
                    <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 * i }}
                        className="flex gap-4"
                    >
                      <div className="mt-1 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold mb-1">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full" />
                <div className="relative grid grid-cols-2 gap-4">
                  <div className="space-y-4 pt-12">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="aspect-square rounded-3xl bg-card border border-border shadow-xl p-6 flex flex-col justify-between"
                    >
                      <Trophy className="w-8 h-8 text-amber-500" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Achieved</p>
                        <p className="text-lg font-bold">Science Pro</p>
                      </div>
                    </motion.div>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="aspect-square rounded-3xl bg-primary text-primary-foreground shadow-xl p-6 flex flex-col justify-between"
                    >
                      <Rocket className="w-8 h-8" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold opacity-70 uppercase tracking-widest">Momentum</p>
                        <p className="text-lg font-bold">5 Day Streak</p>
                      </div>
                    </motion.div>
                  </div>
                  <div className="space-y-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="aspect-[3/4] rounded-3xl bg-card border border-border shadow-xl p-6 flex flex-col justify-between overflow-hidden relative"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16" />
                      <Cpu className="w-8 h-8 text-emerald-500" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Lab Progress</p>
                        <p className="text-xl font-bold">84% Complete</p>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-2">
                           <motion.div initial={{ width: 0 }} whileInView={{ width: '84%' }} transition={{ duration: 1, delay: 0.5 }} className="h-full bg-emerald-500" />
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* CTA Section */}
        <section ref={ctaRef} className="py-32 px-6">
          <motion.div
            style={{ scale: ctaScale, opacity: ctaOpacity }}
            className="max-w-5xl mx-auto rounded-[3rem] bg-foreground text-background p-12 md:p-24 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10" 
                 style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            
            <div className="relative z-10 space-y-8">
              <h2 className="text-4xl md:text-7xl font-bold font-display tracking-tight leading-none">
                Stop guessing. <br /> Start mastering.
              </h2>
              <p className="text-lg md:text-xl text-background/70 max-w-xl mx-auto leading-relaxed">
                Join the students who are actually having fun while studying. No, seriously.
              </p>
              <Button 
                size="lg" 
                variant="secondary"
                className="h-16 px-12 text-xl font-bold rounded-2xl hover:scale-105 transition-transform"
                onClick={() => handleNav("/onboarding")}
              >
                Get Started for Free
              </Button>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-border/50">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              <span className="font-bold font-display">Analogix</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">© 2026 Analogix. Beyond Textbooks.</p>
            <div className="flex gap-8">
              {["Support", "Privacy", "Twitter"].map(item => (
                <button key={item} className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                  {item}
                </button>
              ))}
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

// Helper for class merging
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

export default Landing;
