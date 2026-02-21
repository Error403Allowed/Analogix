"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Check, Sparkles, User,
  Calculator, Microscope, Landmark, Zap, FlaskConical, BookOpen,
  Cpu, LineChart, Briefcase, Wallet, HeartPulse, Globe, Wrench,
  Stethoscope, Languages, Dumbbell, Gamepad2, Music, CookingPot,
  Palette, Film, Leaf, Laptop, Book, Plane,
  Mail, Loader2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import Confetti from "@/components/Confetti";
import { achievementStore } from "@/utils/achievementStore";
import { HOBBY_OPTIONS, POPULAR_INTERESTS } from "@/utils/interests";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// ── Typewriter ────────────────────────────────────────────────────────────────
const TypewriterText = ({ text, delay = 0 }: { text: string; delay?: number }) => {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    let i = 0;
    const t = setTimeout(function type() {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
        const ch = text[i - 1];
        const speed = ch === " " ? 30 : ch === "." || ch === "!" ? 150 : 50;
        setTimeout(type, speed);
      } else { setDone(true); }
    }, delay);
    return () => clearTimeout(t);
  }, [text, delay]);

  useEffect(() => {
    if (!done) return;
    const iv = setInterval(() => setCursor(p => !p), 530);
    const h = setTimeout(() => { setCursor(false); clearInterval(iv); }, 3000);
    return () => { clearInterval(iv); clearTimeout(h); };
  }, [done]);

  return (
    <span>
      {displayed}
      <motion.span animate={{ opacity: cursor ? 1 : 0 }} transition={{ duration: 0.1 }}
        className="inline-block w-[3px] h-[1em] ml-0.5 bg-primary align-middle rounded-sm"
        style={{ verticalAlign: "text-bottom" }} />
    </span>
  );
};
