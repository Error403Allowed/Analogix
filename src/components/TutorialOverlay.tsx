"use client";

import { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type Placement = "top" | "bottom" | "left" | "right" | "center";

interface Step {
  id: string;
  selector: string | null; // CSS selector of element to highlight, null = no highlight
  title: string;
  description: string;
  placement: Placement;
  padding?: number; // extra glow padding around target
}

interface Rect { top: number; left: number; width: number; height: number }

// ── Steps ─────────────────────────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    id: "welcome",
    selector: null,
    title: "Welcome to Analogix! 🎉",
    description: "Let's take a quick tour so you know where everything is. Use the arrows — or press ← → on your keyboard — to move through the steps.",
    placement: "center",
  },
  {
    id: "sidebar-nav",
    selector: "[data-tutorial='sidebar']",
    title: "Sidebar Navigation",
    description: "This is how you get around the app. Click the ☰ trigger in the top-left of the page to expand it. It collapses to icon-only so it never crowds your workspace.",
    placement: "right",
    padding: 8,
  },
  {
    id: "sidebar-trigger",
    selector: "[data-tutorial='sidebar-trigger']",
    title: "Expand the Sidebar",
    description: "Click this button any time to show or hide the full sidebar. The sidebar remembers its state between visits.",
    placement: "right",
    padding: 10,
  },
  {
    id: "calendar",
    selector: "[data-tutorial='calendar']",
    title: "Calendar & Schedule",
    description: "See today's classes, upcoming events, and deadlines. Click any date to view events for that day. You can import your Sentral timetable here via a .ics file.",
    placement: "bottom",
    padding: 6,
  },
  {
    id: "timer",
    selector: "[data-tutorial='timer']",
    title: "Pomodoro Study Timer",
    description: "Study in focused bursts. Set work and break intervals, hit Start, and Analogix tracks your sessions. Click the ⛶ icon to open a fullscreen timer view.",
    placement: "left",
    padding: 6,
  },
  {
    id: "streak",
    selector: "[data-tutorial='streak']",
    title: "Study Streak 🔥",
    description: "Your streak goes up every day you use Analogix. Come back daily to keep it alive — streaks unlock special achievements.",
    placement: "left",
    padding: 6,
  },
  {
    id: "subjects",
    selector: "[data-tutorial='subjects']",
    title: "My Subjects",
    description: "Quick-access cards for each of your enrolled subjects. Click any card to open that subject's page, or jump straight into a chat or quiz.",
    placement: "top",
    padding: 6,
  },
  {
    id: "ai-tutor",
    selector: "[data-tutorial='ai-tutor']",
    title: "AI Tutor — Quizzy",
    description: "Quizzy is your personal AI study buddy. Ask any question and it explains concepts using analogies tailored to YOUR hobbies. Pick a subject to start a session.",
    placement: "top",
    padding: 6,
  },
  {
    id: "quiz",
    selector: "[data-tutorial='quiz']",
    title: "Knowledge Lab — Quizzes",
    description: "Test yourself with AI-generated quizzes. \"Instant Assessment\" auto-generates a quiz from your subjects. \"Create Custom Quiz\" lets you set the topic, difficulty, and timer.",
    placement: "top",
    padding: 6,
  },
  {
    id: "profile",
    selector: "[data-tutorial='profile']",
    title: "Your Profile",
    description: "Click your name at the bottom of the sidebar to edit your profile — update your subjects, interests, year, and state. Quizzy instantly adapts its analogies to match.",
    placement: "right",
    padding: 8,
  },
  {
    id: "theme",
    selector: "[data-tutorial='theme']",
    title: "Colour Scheme & Theme",
    description: "Make Analogix yours! Expand the sidebar to see colour theme swatches — choose from Classic Blue, Sunset, Forest, Midnight, and more. Dark/light mode is right there too.",
    placement: "right",
    padding: 6,
  },
  {
    id: "achievements-nav",
    selector: "[data-tutorial='achievements-nav']",
    title: "Achievements",
    description: "Earn badges as you study! There are achievements for streaks, quiz completions, milestones, and more. Check back often to see what you've unlocked.",
    placement: "right",
    padding: 8,
  },
  {
    id: "done",
    selector: null,
    title: "You're all set! 🚀",
    description: "That's the full tour. Start by asking Quizzy a question — you might be surprised how clear things become when explained through your own interests. Happy studying!",
    placement: "center",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const CARD_W = 320;
const CARD_H_APPROX = 180; // estimate for positioning, actual height varies
const ARROW_SIZE = 36;
const VIEWPORT_PAD = 16;

function getCardPosition(
  placement: Placement,
  rect: Rect | null,
  vpW: number,
  vpH: number
): { top: number; left: number; arrowDir: Placement | null; arrowOffsetX: number; arrowOffsetY: number } {
  if (!rect || placement === "center") {
    return {
      top: vpH / 2 - CARD_H_APPROX / 2,
      left: vpW / 2 - CARD_W / 2,
      arrowDir: null,
      arrowOffsetX: 0,
      arrowOffsetY: 0,
    };
  }

  const GAP = 16;
  let top = 0;
  let left = 0;
  let arrowOffsetX = 0;
  let arrowOffsetY = 0;

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  switch (placement) {
    case "bottom":
      top = rect.top + rect.height + GAP;
      left = clamp(centerX - CARD_W / 2, VIEWPORT_PAD, vpW - CARD_W - VIEWPORT_PAD);
      arrowOffsetX = centerX - left - ARROW_SIZE / 2;
      break;
    case "top":
      top = rect.top - CARD_H_APPROX - GAP;
      left = clamp(centerX - CARD_W / 2, VIEWPORT_PAD, vpW - CARD_W - VIEWPORT_PAD);
      arrowOffsetX = centerX - left - ARROW_SIZE / 2;
      break;
    case "right":
      left = rect.left + rect.width + GAP;
      top = clamp(centerY - CARD_H_APPROX / 2, VIEWPORT_PAD, vpH - CARD_H_APPROX - VIEWPORT_PAD);
      left = clamp(left, VIEWPORT_PAD, vpW - CARD_W - VIEWPORT_PAD);
      arrowOffsetY = centerY - top - ARROW_SIZE / 2;
      break;
    case "left":
      left = rect.left - CARD_W - GAP;
      top = clamp(centerY - CARD_H_APPROX / 2, VIEWPORT_PAD, vpH - CARD_H_APPROX - VIEWPORT_PAD);
      left = clamp(left, VIEWPORT_PAD, vpW - CARD_W - VIEWPORT_PAD);
      arrowOffsetY = centerY - top - ARROW_SIZE / 2;
      break;
  }

  // Flip if off-screen
  if (placement === "bottom" && top + CARD_H_APPROX > vpH - VIEWPORT_PAD) {
    top = rect.top - CARD_H_APPROX - GAP;
  }
  if (placement === "top" && top < VIEWPORT_PAD) {
    top = rect.top + rect.height + GAP;
  }
  if (placement === "right" && left + CARD_W > vpW - VIEWPORT_PAD) {
    left = rect.left - CARD_W - GAP;
  }
  if (placement === "left" && left < VIEWPORT_PAD) {
    left = rect.left + rect.width + GAP;
  }

  return { top, left, arrowDir: placement, arrowOffsetX, arrowOffsetY };
}

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function getTargetRect(selector: string | null): Rect | null {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

// ── SVG Spotlight ─────────────────────────────────────────────────────────────

function Spotlight({ rect, padding = 8, vpW, vpH }: { rect: Rect | null; padding?: number; vpW: number; vpH: number }) {
  if (!rect) {
    // Full dim, no cutout
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" width={vpW} height={vpH}>
        <rect x={0} y={0} width={vpW} height={vpH} fill="rgba(0,0,0,0.72)" />
      </svg>
    );
  }

  const r = 14; // corner radius of highlight
  const x = rect.left - padding;
  const y = rect.top - padding;
  const w = rect.width + padding * 2;
  const h = rect.height + padding * 2;

  const clipId = "tour-clip";

  return (
    <svg className="absolute inset-0 pointer-events-none" width={vpW} height={vpH} style={{ zIndex: 0 }}>
      <defs>
        <clipPath id={clipId}>
          <path
            d={`M 0 0 H ${vpW} V ${vpH} H 0 Z M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`}
            fillRule="evenodd"
          />
        </clipPath>
      </defs>
      {/* Dimmed overlay with cutout */}
      <rect x={0} y={0} width={vpW} height={vpH} fill="rgba(0,0,0,0.72)" clipPath={`url(#${clipId})`} />
      {/* Glow ring around highlight */}
      <rect x={x} y={y} width={w} height={h} rx={r} fill="none" stroke="rgba(var(--primary-rgb, 99,102,241), 0.6)" strokeWidth="2" />
    </svg>
  );
}

// ── Arrow ─────────────────────────────────────────────────────────────────────

function Arrow({ dir, offsetX = 0, offsetY = 0 }: { dir: Placement | null; offsetX?: number; offsetY?: number }) {
  if (!dir || dir === "center") return null;

  const clampedOffsetX = clamp(offsetX, 8, CARD_W - ARROW_SIZE - 8);
  const clampedOffsetY = clamp(offsetY, 8, CARD_H_APPROX - ARROW_SIZE - 8);

  const arrowStyles: Record<Placement, React.CSSProperties> = {
    bottom: {
      top: -ARROW_SIZE + 2,
      left: clampedOffsetX,
      width: ARROW_SIZE,
      height: ARROW_SIZE,
    },
    top: {
      bottom: -ARROW_SIZE + 2,
      left: clampedOffsetX,
      width: ARROW_SIZE,
      height: ARROW_SIZE,
      transform: "rotate(180deg)",
    },
    right: {
      left: -ARROW_SIZE + 2,
      top: clampedOffsetY,
      width: ARROW_SIZE,
      height: ARROW_SIZE,
      transform: "rotate(-90deg)",
    },
    left: {
      right: -ARROW_SIZE + 2,
      top: clampedOffsetY,
      width: ARROW_SIZE,
      height: ARROW_SIZE,
      transform: "rotate(90deg)",
    },
    center: {},
  };

  return (
    <div className="absolute pointer-events-none" style={arrowStyles[dir]}>
      <svg width={ARROW_SIZE} height={ARROW_SIZE} viewBox="0 0 36 36" fill="none">
        {/* Tail */}
        <line x1="18" y1="30" x2="18" y2="10" stroke="rgba(var(--primary-rgb,99,102,241),0.9)" strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray="4 3" />
        {/* Arrowhead pointing UP (toward element for "bottom" placement) */}
        <path d="M10 16 L18 6 L26 16" stroke="rgba(var(--primary-rgb,99,102,241),0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TutorialOverlay({ onComplete }: { onComplete: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vpW, setVpW] = useState(0);
  const [vpH, setVpH] = useState(0);
  const [exiting, setExiting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const step = STEPS[stepIndex];
  const totalSteps = STEPS.length;
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  // Measure viewport and target element
  const measure = useCallback(() => {
    setVpW(window.innerWidth);
    setVpH(window.innerHeight);
    setRect(getTargetRect(STEPS[stepIndex]?.selector ?? null));
  }, [stepIndex]);

  useLayoutEffect(() => {
    measure();
  }, [stepIndex, measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  // Scroll target into view
  useEffect(() => {
    if (!step.selector) return;
    const el = document.querySelector(step.selector);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      // Re-measure after scroll settles
      const t = setTimeout(measure, 350);
      return () => clearTimeout(t);
    }
  }, [step.selector, measure]);

  const finish = useCallback(() => {
    setExiting(true);
    setTimeout(onComplete, 350);
  }, [onComplete]);

  const next = useCallback(() => {
    if (stepIndex < totalSteps - 1) setStepIndex(i => i + 1);
    else finish();
  }, [stepIndex, totalSteps, finish]);

  const back = useCallback(() => {
    if (stepIndex > 0) setStepIndex(i => i - 1);
  }, [stepIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") back();
      else if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back, finish]);

  const { top, left, arrowDir, arrowOffsetX, arrowOffsetY } = getCardPosition(
    step.placement,
    rect,
    vpW,
    vpH
  );

  if (vpW === 0) return null;

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          ref={containerRef}
          key="tutorial"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9999]"
          style={{ pointerEvents: "auto" }}
        >
          {/* Dimmed overlay + spotlight cutout */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`spotlight-${stepIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <Spotlight rect={rect} padding={step.padding} vpW={vpW} vpH={vpH} />
            </motion.div>
          </AnimatePresence>

          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-10">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          {/* Skip */}
          <button
            onClick={finish}
            className="absolute top-4 right-4 z-20 flex items-center gap-1.5 text-[11px] font-bold text-white/50 hover:text-white/90 transition-colors px-3 py-1.5 rounded-full border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10"
          >
            <X className="w-3 h-3" />
            Skip tour
          </button>

          {/* Step counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 text-[11px] font-black uppercase tracking-[0.2em] text-white/30 select-none">
            {stepIndex + 1} / {totalSteps}
          </div>

          {/* Tooltip card + arrow */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`card-${stepIndex}`}
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="absolute z-20"
              style={{ top: Math.round(top), left: Math.round(left), width: CARD_W }}
            >
              {/* Arrow pointing at element */}
              <Arrow dir={arrowDir} offsetX={arrowOffsetX} offsetY={arrowOffsetY} />

              {/* Card */}
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0d0d10]/95 shadow-[0_24px_64px_rgba(0,0,0,0.8)] backdrop-blur-sm">
                {/* Accent bar */}
                <div className="h-0.5 w-full bg-gradient-to-r from-primary via-primary/70 to-transparent" />
                <div className="p-5">
                  <h2 className="text-sm font-black text-white tracking-tight mb-2 leading-snug">{step.title}</h2>
                  <p className="text-xs text-white/65 leading-relaxed mb-5">{step.description}</p>

                  {/* Dot indicators */}
                  <div className="flex items-center gap-1 mb-4">
                    {STEPS.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setStepIndex(i)}
                        className={cn(
                          "rounded-full transition-all duration-300",
                          i === stepIndex ? "w-4 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"
                        )}
                      />
                    ))}
                  </div>

                  {/* Nav */}
                  <div className="flex items-center gap-2">
                    {stepIndex > 0 && (
                      <button
                        onClick={back}
                        className="flex items-center gap-1 text-[11px] font-bold text-white/40 hover:text-white/80 transition-colors px-3 py-2 rounded-xl hover:bg-white/5"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        Back
                      </button>
                    )}
                    <button
                      onClick={next}
                      className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-wider h-9 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
                    >
                      {stepIndex === totalSteps - 1 ? (
                        <><Sparkles className="w-3 h-3" /> Let's go!</>
                      ) : (
                        <>Next <ArrowRight className="w-3 h-3" /></>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
