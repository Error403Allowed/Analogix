"use client";

import { motion } from "framer-motion";
import { ArrowRight, Brain, BookOpen, ClipboardList, SquareStack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const pillars = [
  {
    title: "AI Tutor",
    copy: "Structured AI explanations with direct handoffs to quizzes and cards.",
    icon: Brain,
  },
  {
    title: "Study Map",
    copy: "Workflow-first subject navigation that surfaces what matters next.",
    icon: BookOpen,
  },
  {
    title: "Assessment Loops",
    copy: "Quiz diagnostics that route immediately into targeted practice.",
    icon: ClipboardList,
  },
  {
    title: "Memory System",
    copy: "Flashcard sessions designed for speed, retention, and consistency.",
    icon: SquareStack,
  },
];

export default function LandingV2() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="mx-auto grid w-full max-w-[1240px] gap-10 px-5 pb-16 pt-24 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">Analogix V2</p>
          <h1 className="mt-5 text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
            A next-generation study platform built for real learning flow.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Analogix unifies tutoring, revision, assessment, and subject planning into a single system that feels deliberate, fast, and student-first.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="rounded-xl px-6" onClick={() => router.push("/login")}>
              Start learning
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="rounded-xl px-6" onClick={() => router.push("/chat")}>
              Open AI Tutor
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-xl border border-border/60 bg-card/55 p-6"
        >
          <p className="text-sm font-medium text-muted-foreground">Learning Loop</p>
          <ol className="mt-5 space-y-4">
            {["Understand with Tutor", "Practice with Quizzes", "Retain with Flashcards", "Prioritize in Study Map"].map((item, index) => (
              <li key={item} className="flex items-center gap-3 rounded-md border border-border/60 bg-background px-4 py-3 text-sm">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">{index + 1}</span>
                {item}
              </li>
            ))}
          </ol>
        </motion.div>
      </section>

      <section className="border-t border-border/70">
        <div className="mx-auto grid w-full max-w-[1240px] gap-4 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {pillars.map((pillar, index) => (
            <motion.article
              key={pillar.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="rounded-lg border border-border/60 bg-card/55 p-5"
            >
              <pillar.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-4 text-xl font-semibold tracking-tight">{pillar.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pillar.copy}</p>
            </motion.article>
          ))}
        </div>
      </section>
    </div>
  );
}
