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
  User,
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
  Calendar,
  Palette,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import Head from "next/head";
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
    
    // Inject random colours into the CSS variables
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
      icon: MessageCircle,
      title: "Analogy Tutor",
      description: "Explain anything with personalised analogies.",
      gradient: "from-violet-500 via-purple-500 to-indigo-500",
      bgGradient: "from-violet-500/5 via-purple-500/5 to-indigo-500/5",
      borderColor: "border-violet-500/20",
      delay: 0.1,
      iconAnimation: "flip"
    },
    {
      icon: Cpu,
      title: "Knowledge Lab",
      description: "Structured learning paths for any subject.",
      gradient: "from-emerald-500 via-teal-500 to-cyan-500",
      bgGradient: "from-emerald-500/5 via-teal-500/5 to-cyan-500/5",
      borderColor: "border-emerald-500/20",
      delay: 0.2,
      iconAnimation: "flip"
    },
    {
      icon: Calendar,
      title: "Smart Calendar",
      description: "Organised study schedule that adapts to you.",
      gradient: "from-amber-500 via-orange-500 to-red-500",
      bgGradient: "from-amber-500/5 via-orange-500/5 to-red-500/5",
      borderColor: "border-amber-500/20",
      delay: 0.3,
      iconAnimation: "flip"
    },
    {
      icon: Trophy,
      title: "Achievement System",
      description: "Unlock badges and track your academic growth. Gamified learning that actually works.",
      gradient: "from-yellow-400 via-amber-500 to-orange-500",
      bgGradient: "from-yellow-400/5 via-amber-500/5 to-orange-500/5",
      borderColor: "border-yellow-400/20",
      delay: 0.4,
      iconAnimation: "flip"
    },
    {
      icon: Palette,
      title: "Adaptive Moods",
      description: "Toggle between Focused, Creative, and Chill modes. The UI and tutor tone change with your vibe.",
      gradient: "from-pink-500 via-rose-500 to-purple-500",
      bgGradient: "from-pink-500/5 via-rose-500/5 to-purple-500/5",
      borderColor: "border-pink-500/20",
      delay: 0.5,
      iconAnimation: "flip"
    },
    {
      icon: Zap,
      title: "Instant Results",
      description: "Get immediate feedback on quizzes and real-time support from your personal AI assistant.",
      gradient: "from-blue-500 via-indigo-500 to-purple-500",
      bgGradient: "from-blue-500/5 via-indigo-500/5 to-purple-500/5",
      borderColor: "border-blue-500/20",
      delay: 0.6,
      iconAnimation: "flip"
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
    { icon: Cpu, label: "Digital Tech" }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-background selection:bg-primary/30">
      <Head>
        <title>Analogix | Learn with Clarity & Momentum</title>
        <meta name="description" content="Stop memorising. Start knowing. Analogix turns complex Australian Curriculum topics into analogies you actually care about." />
      </Head>
      <CursorParticles />
      
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            x: [0, 100, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="liquid-blob w-[800px] h-[800px] bg-primary/10 -top-96 -left-96 fixed blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            y: [0, 50, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="liquid-blob w-[600px] h-[600px] bg-accent/10 bottom-0 -right-48 fixed blur-[100px]" 
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black gradient-text tracking-tighter">
              Analogix
            </span>
          </motion.div>
          
          <div className="hidden md:flex items-center gap-8 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">
            {["Quizzes", "Tutor", "Calendar", "Badges"].map((item, i) => (
              <motion.button 
                key={item}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => handleNav(`/${item.toLowerCase() === 'tutor' ? 'chat' : item.toLowerCase() === 'badges' ? 'achievements' : item.toLowerCase()}`)}
                className="hover:text-primary transition-colors relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
              </motion.button>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <ThemeToggle />
            <Button
              className="gradient-primary text-primary-foreground border-0 shadow-xl px-8 h-12 rounded-full font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-transform"
              onClick={() => handleNav("/dashboard")}
            >
              {hasCompletedOnboarding ? "Go to Dashboard" : "Start Now"}
            </Button>
          </motion.div>
        </div>
      </nav>

      <main className="relative z-10 pt-10">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-8 py-12 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="space-y-10"
            >
              <motion.div variants={itemVariants}>
                <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-black text-[10px] uppercase tracking-[0.2em] mb-8">
                  <Sparkles className="w-3.5 h-3.5" />
                  Your New Academic Core
                </span>
                <h1 className="text-7xl md:text-9xl font-black text-foreground leading-[0.85] tracking-tighter mb-8">
                  Stop memorising. <br />
                  <span className="gradient-text">Start knowing.</span>
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground max-w-lg leading-relaxed font-medium">
                  We turn complex Australian Curriculum topics into analogies you actually care about. Maths through football. Chemistry through cooking.
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-wrap gap-6">
                <Button 
                  size="lg" 
                  className="h-16 px-10 text-lg font-black gradient-primary text-primary-foreground border-0 shadow-[0_20px_40px_-10px_rgba(var(--primary-rgb),0.5)] hover:scale-105 transition-transform rounded-[2rem]"
                  onClick={() => router.push(hasCompletedOnboarding ? "/dashboard" : "/onboarding")}
                >
                  Join the momentum
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <div className="flex -space-x-3 items-center">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-muted overflow-hidden flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                  ))}
                  <span className="ml-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">+2k Students</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Visual Hero Element */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="relative aspect-square max-w-[600px] mx-auto hidden lg:block"
            >
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-[100px]" />
              
              {/* Mock UI Cards */}
              <motion.div 
                animate={{ y: [0, -20, 0], rotate: [0, 2, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-10 left-0 w-80 glass-card p-6 shadow-2xl z-20"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Analogy Tutor</p>
                    <p className="font-bold text-sm">"Think of gravity as..."</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: "80%" }}
                      transition={{ delay: 1, duration: 2 }}
                      className="h-full bg-primary" 
                    />
                  </div>
                  <p className="text-[9px] font-bold text-primary uppercase">Tuned to your interests</p>
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 20, 0], rotate: [0, -2, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-10 right-0 w-80 glass-card p-6 shadow-2xl z-10"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Knowledge Lab</p>
                    <p className="font-bold text-sm">Assessment Complete</p>
                  </div>
                </div>
                <p className="text-2xl font-black text-emerald-500">92% Level Up!</p>
              </motion.div>

              <div className="absolute inset-0 grid place-items-center">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                  className="w-full h-full rounded-full border border-dashed border-primary/30" 
                />
                <Brain className="w-32 h-32 text-primary/40 absolute blur-[2px]" />
                <Brain className="w-32 h-32 text-primary" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Feature Grid - Enhanced */}
        <section className="bg-muted/30 py-32 border-y border-border/50 relative">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-24 space-y-6">
              <motion.h2 
                whileInView={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 20 }}
                viewport={{ once: true }}
                className="text-5xl md:text-7xl font-black text-foreground tracking-tighter"
              >
                Everything to <span className="gradient-text">level up.</span>
              </motion.h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
                Analogix is more than a tutor. It's an entire ecosystem built around how students actually learn.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ 
                    delay: feature.delay,
                    type: "spring",
                    stiffness: 100,
                    damping: 10
                  }}
                  whileHover={{ 
                    y: -15,
                    scale: 1.02,
                    rotateX: 5,
                    rotateY: 5,
                    transition: { duration: 0.3 }
                  }}
                  className={`relative group overflow-hidden rounded-3xl border ${feature.borderColor} bg-gradient-to-br ${feature.bgGradient} backdrop-blur-xl shadow-lg hover:shadow-2xl transition-all duration-300`}
                >
                  {/* Animated background pattern */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <motion.div
                      animate={{
                        background: [
                          `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
                          `radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
                          `radial-gradient(circle at 50% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
                        ]
                      }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0"
                    />
                  </div>
                  
                  {/* Floating particles */}
                  <div className="absolute inset-0 pointer-events-none">
                    {[...Array(3)].map((_, j) => (
                      <motion.div
                        key={j}
                        animate={{
                          y: [0, -20, 0],
                          x: [0, Math.random() * 10 - 5, 0],
                          opacity: [0, 1, 0]
                        }}
                        transition={{
                          duration: 3 + j,
                          repeat: Infinity,
                          delay: j * 0.5,
                          ease: "easeInOut"
                        }}
                        className={`absolute w-1 h-1 rounded-full bg-gradient-to-r ${feature.gradient}`}
                        style={{
                          top: `${20 + j * 30}%`,
                          left: `${10 + j * 30}%`
                        }}
                      />
                    ))}
                  </div>

                  <div className="relative p-10">
                    {/* Icon with enhanced animation */}
                    <motion.div 
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-8 shadow-xl group-hover:shadow-2xl transition-all duration-300`}
                      animate={{
                        rotateY: [0, 360]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      whileHover={{
                        rotateY: [0, 720],
                        transition: {
                          duration: 0.3,
                          ease: "easeInOut"
                        }
                      }}
                    >
                      <feature.icon className="w-8 h-8 text-white drop-shadow-lg" />
                    </motion.div>
                    
                    {/* Glow effect on hover */}
                    <motion.div 
                      className={`absolute top-10 left-10 w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300`}
                    />
                    
                    <motion.h3 
                      className="text-2xl font-black mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent"
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                    >
                      {feature.title}
                    </motion.h3>
                    
                    <motion.p 
                      className="text-muted-foreground leading-relaxed font-medium"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      {feature.description}
                    </motion.p>

                    {/* Interactive hover indicator */}
                    <motion.div 
                      className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      initial={{ scale: 0 }}
                      whileHover={{ scale: 1 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: feature.delay + 0.5 }}
                    >
                      <ArrowRight className={`w-5 h-5 bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`} />
                    </motion.div>
                  </div>

                  {/* Shimmer effect */}
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
                    animate={{
                      x: ['-100%', '200%']
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 5,
                      ease: "easeInOut"
                    }}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Subjects - Enhanced Interactive Icons */}
        <section className="py-32 overflow-hidden relative">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          
          <div className="max-w-7xl mx-auto px-8 relative z-10">
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-black text-center mb-20 uppercase tracking-[0.3em] opacity-40"
            >
              Tuned for ACARA
            </motion.h2>
            
            <div className="flex flex-wrap justify-center gap-6">
              {subjects.map((sub, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ 
                    delay: i * 0.05,
                    type: "spring",
                    stiffness: 200,
                    damping: 15
                  }}
                  whileHover={{ 
                    scale: 1.1,
                    rotate: 5,
                    y: -5
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-5 glass-card rounded-3xl flex items-center gap-4 hover:border-primary/40 transition-all cursor-pointer group relative overflow-hidden"
                >
                  {/* Hover glow effect */}
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl"
                  />
                  
                  {/* Animated icon */}
                  <motion.div
                    animate={{
                      rotate: [0, 5, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: "easeInOut"
                    }}
                    whileHover={{
                      rotate: 360,
                      scale: 1.2,
                      transition: { duration: 0.5 }
                    }}
                  >
                    <sub.icon className="w-5 h-5 text-primary group-hover:scale-125 transition-transform" />
                  </motion.div>
                  
                  <motion.span 
                    className="font-black text-sm uppercase tracking-widest relative z-10"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    {sub.label}
                  </motion.span>
                  
                  {/* Floating particles */}
                  <motion.div
                    className="absolute w-1 h-1 bg-primary rounded-full opacity-0 group-hover:opacity-100"
                    animate={{
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    style={{
                      top: '20%',
                      right: '20%'
                    }}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action - Intense */}
        <section className="py-32 px-8 max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-[4rem] gradient-primary p-20 text-center relative overflow-hidden shadow-[0_40px_100px_-20px_rgba(var(--primary-rgb),0.5)]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent)]" />
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-24 -right-24 w-64 h-64 border-4 border-white/10 rounded-full" 
            />
            
            <h2 className="text-5xl md:text-8xl font-black text-white mb-8 leading-[0.9] tracking-tighter relative z-10">
              Your future <br />
              self will <br />
              thank you.
            </h2>
            <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-2xl mx-auto font-medium relative z-10">
              Join thousands of students turning their study time into high-impact momentum.
            </p>
            <Button 
               size="lg" 
               className="h-20 px-16 text-2xl font-black bg-white text-primary hover:bg-white/90 border-0 shadow-2xl rounded-[2.5rem] relative z-10 hover:scale-105 transition-transform"
               onClick={() => router.push("/onboarding")}
            >
              Get Started Now
            </Button>
          </motion.div>
        </section>

        <footer className="py-20 border-t border-border/50">
          <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tighter">Analogix</span>
            </div>
            <p className="text-muted-foreground text-sm font-bold uppercase tracking-[0.2em] opacity-50">© 2026 Analogix Studio. Beyond textbooks.</p>
            <div className="flex gap-10">
              {["Privacy", "Terms", "Contact"].map(item => (
                <button key={item} className="text-sm font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
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

export default Landing;
