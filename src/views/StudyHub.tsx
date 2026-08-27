"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Layers,
  Library,
  Sigma,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type StudyTool = {
  label: string;
  description: string;
  path: string;
  icon: LucideIcon;
};

export const STUDY_TOOLS: StudyTool[] = [
  { label: "Flashcards", description: "Review and create card sets", path: "/flashcards", icon: Layers },
  { label: "Quiz", description: "Generate and take quizzes", path: "/quiz", icon: ClipboardList },
  { label: "Calendar", description: "Plan sessions and events", path: "/calendar", icon: CalendarDays },
  { label: "Formulas", description: "Browse formula sheets", path: "/formulas", icon: Sigma },
  { label: "Timer", description: "Focus with the pomodoro timer", path: "/timer", icon: Timer },
  { label: "Resources", description: "Past papers and textbooks", path: "/resources", icon: Library },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 260, damping: 20 },
  },
};

const StudyHub = () => {
  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-10">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="mb-3 flex items-center gap-4 text-4xl font-black tracking-tight text-foreground md:text-5xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary text-white md:h-14 md:w-14">
            <Layers className="h-6 w-6" />
          </div>
          Study Hub
        </h1>
        <p className="ml-1 text-sm text-muted-foreground italic md:text-lg">
          Every tool you need to learn, revise and stay on track.
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {STUDY_TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <motion.div key={tool.path} variants={item}>
              <Link
                href={tool.path}
                data-testid="study-tool"
                className={cn(
                  "pressable group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-6 transition-all duration-200",
                  "hover:-translate-y-1 hover:border-primary/30"
                )}
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1 font-bold text-foreground">{tool.label}</h3>
                <p className="mb-4 text-xs leading-relaxed text-muted-foreground">{tool.description}</p>
                <div className="mt-auto flex items-center gap-1 text-xs font-semibold text-primary opacity-70 transition-opacity group-hover:opacity-100">
                  Open <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default StudyHub;
