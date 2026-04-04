import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Zap, Brain, BookOpen } from "lucide-react";

const STORAGE_KEY = "hasSeenImmersiveIntro";

const FirstVisitOverlay = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState(0);

  const shouldSkip = [
    "/login", "/onboarding", "/auth/callback", "/dashboard", "/subjects",
    "/chat", "/flashcards", "/quiz", "/calendar", "/resources",
    "/formulas", "/achievements", "/timer", "/study-guide-loading",
  ].some(path => pathname === path || pathname.startsWith(path + "/"));

  useEffect(() => {
    if (shouldSkip) return;
    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen) setIsOpen(true);
  }, [shouldSkip]);

  const handleEnter = useCallback(() => {
    setPhase(1);
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, "true");
      const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
      prefs.landingVisited = true;
      localStorage.setItem("userPreferences", JSON.stringify(prefs));
      setIsOpen(false);
      router.push("/onboarding");
    }, 800);
  }, [router]);

  if (shouldSkip) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-[#060911] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6 }}
        >
          {/* Animated background */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Gradient orbs */}
            <motion.div
              className="absolute -top-32 -right-20 h-[60vh] w-[60vh] rounded-full bg-cyan-400/20 blur-[120px]"
              animate={{ scale: [1, 1.15, 1], x: [0, 30, 0], y: [0, -20, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -bottom-40 -left-24 h-[70vh] w-[70vh] rounded-full bg-blue-500/15 blur-[140px]"
              animate={{ scale: [1.1, 1, 1.1], x: [0, -25, 0], y: [0, 15, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute top-1/3 left-1/2 h-[50vh] w-[50vh] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[160px]"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                backgroundSize: "60px 60px",
              }}
            />

            {/* Floating particles */}
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white/20 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -30 - Math.random() * 40],
                  opacity: [0, 0.6, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 3 + Math.random() * 4,
                  repeat: Infinity,
                  delay: Math.random() * 5,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>

          {/* Content */}
          <motion.div
            className="relative z-10 max-w-3xl px-6 text-center"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            {/* Brand */}
            <motion.div
              className="flex items-center justify-center gap-2 mb-8"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-black text-white tracking-tight">Analogix</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.1]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.7 }}
            >
              Study smarter,
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
                not harder.
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="mt-6 text-base sm:text-lg text-white/60 leading-relaxed max-w-xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              AI-powered notes, flashcards, and quizzes — tailored to how you think.
            </motion.p>

            {/* Feature pills */}
            <motion.div
              className="flex flex-wrap items-center justify-center gap-3 mt-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
            >
              {[
                { icon: Brain, label: "AI Tutor" },
                { icon: Zap, label: "Flashcards" },
                { icon: BookOpen, label: "Smart Notes" },
                { icon: Sparkles, label: "Auto Quizzes" },
              ].map(({ icon: Icon, label }, i) => (
                <motion.div
                  key={label}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2 + i * 0.1 }}
                >
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-white/80 font-medium">{label}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.div
              className="mt-10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6 }}
            >
              <Button
                onClick={handleEnter}
                disabled={phase === 1}
                className="group px-8 h-13 rounded-full bg-white text-slate-900 hover:bg-white/90 shadow-[0_20px_60px_-20px_rgba(255,255,255,0.35)] text-base font-semibold gap-2 transition-all"
              >
                {phase === 1 ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </motion.div>

            {/* Bottom divider */}
            <motion.div
              className="mt-10 mx-auto h-px w-32 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1.8, duration: 0.6 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FirstVisitOverlay;
