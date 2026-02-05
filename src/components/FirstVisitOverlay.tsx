import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "hasSeenImmersiveIntro";

const FirstVisitOverlay = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen) setIsOpen(true);
  }, []);

  const handleEnter = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-[#0c111b]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Lighting layers */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-32 -right-20 h-[60vh] w-[60vh] rounded-full bg-cyan-400/25 blur-[120px]" />
            <div className="absolute -bottom-40 -left-24 h-[70vh] w-[70vh] rounded-full bg-blue-500/20 blur-[140px]" />
            <div className="absolute top-1/3 left-1/2 h-[50vh] w-[50vh] -translate-x-1/2 rounded-full bg-emerald-400/15 blur-[160px]" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/40" />
          </div>

          <motion.div
            className="relative z-10 max-w-2xl px-6 text-center"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="mx-auto mb-6 h-px w-20 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white">
              Focused learning, with a calmer interface
            </h1>
            <p className="mt-4 text-base sm:text-lg text-white/70 leading-relaxed">
              Build momentum through clear explanations, tailored analogies, and
              a space that stays out of the way.
            </p>
            <div className="mt-8 flex items-center justify-center">
              <Button
                onClick={handleEnter}
                className="px-8 h-12 rounded-full bg-white text-slate-900 hover:bg-white/90 shadow-[0_20px_60px_-20px_rgba(255,255,255,0.45)]"
              >
                Enter
              </Button>
            </div>
            <div className="mt-8 mx-auto h-px w-28 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FirstVisitOverlay;
