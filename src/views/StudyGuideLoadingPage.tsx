"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, AlertCircle, ArrowLeft } from "lucide-react";
import { generateStudyGuide, generateFlashcardsFromDocument, generateQuizFromDocument } from "@/services/groq";
import { subjectStore } from "@/utils/subjectStore";
import { studyGuideToHtml } from "@/utils/studyGuideHtml";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { eventStore } from "@/utils/eventStore";
import { AppEvent } from "@/types/events";
import { flashcardStore } from "@/utils/flashcardStore";

// ── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  { label: "Reading your document",       icon: "📄" },
  { label: "Identifying key concepts",    icon: "🔍" },
  { label: "Mapping assessment scope",    icon: "🗺️" },
  { label: "Building your study schedule",icon: "📅" },
  { label: "Writing practice questions",  icon: "✏️" },
  { label: "Generating flashcards",       icon: "🃏" },
  { label: "Drafting a quiz",             icon: "❓" },
  { label: "Polishing your guide",        icon: "✨" },
];

const STEP_DURATION_MS = 5000;

// ── Particle background ───────────────────────────────────────────────────────
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/20"
          initial={{
            x: `${Math.random() * 100}vw`,
            y: `${Math.random() * 100}vh`,
            opacity: 0,
          }}
          animate={{
            y: [`${Math.random() * 100}vh`, `${Math.random() * 100}vh`],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 4 + Math.random() * 6,
            repeat: Infinity,
            delay: Math.random() * 4,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────
export default function StudyGuideLoadingPage() {
  const router = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const hasStarted = useRef(false);

  // Step ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx(i => Math.min(i + 1, STEPS.length - 1));
    }, STEP_DURATION_MS);
    return () => clearInterval(interval);
  }, []);

  // Generation
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const formatDateKey = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    const parseAssessmentDate = (value?: string | null) => {
      if (!value) return null;
      const match = value.match(/\d{4}-\d{2}-\d{2}/);
      if (!match) return null;
      const [year, month, day] = match[0].split("-").map(Number);
      if (!year || !month || !day) return null;
      return new Date(year, month - 1, day, 9, 0, 0);
    };

    const assessmentTypeToEventType = (value?: string | null): AppEvent["type"] => {
      const type = (value || "").toLowerCase();
      if (/(exam|test|quiz|midterm|final)/.test(type)) return "exam";
      if (/(assignment|project|essay|report|presentation|practical|task|lab)/.test(type)) return "assignment";
      return "event";
    };

    const safeLocalStorageGet = (key: string) => {
      try { return localStorage.getItem(key); } catch { return null; }
    };

    const safeLocalStorageSet = (key: string, value: string) => {
      try { localStorage.setItem(key, value); } catch {}
    };

    const run = async () => {
      try {
        // Pull job from sessionStorage (set by whoever triggered the redirect)
        const raw = sessionStorage.getItem("studyGuideJob");
        if (!raw) { setError("No generation job found. Please try again."); return; }
        const job: {
          assessmentText: string;
          fileName: string;
          subjectId: string;
          grade?: string;
        } = JSON.parse(raw);
        sessionStorage.removeItem("studyGuideJob");

        const subjectLabel = SUBJECT_CATALOG.find(s => s.id === job.subjectId)?.label;

        const result = await generateStudyGuide({
          assessmentDetails: job.assessmentText,
          fileName: job.fileName,
          subject: subjectLabel,
          grade: job.grade,
        });

        if (!result || !result.title) {
          throw new Error("No guide returned - generation failed");
        }

        // Only create document AFTER successful generation
        const doc = await subjectStore.createDocument(job.subjectId, result.title);
        const html = studyGuideToHtml(result);
        await subjectStore.updateDocument(job.subjectId, doc.id, { content: html });

        const assessmentDate = parseAssessmentDate(result.assessmentDate);
        if (assessmentDate) {
          const title = result.title || "Assessment";
          const eventType = assessmentTypeToEventType(result.assessmentType);
          const subject = subjectLabel || "General";

          const existing = await eventStore.getAll();
          const dateKey = formatDateKey(assessmentDate);
          const alreadyAdded = existing.some(e =>
            e.title === title &&
            e.subject === subject &&
            formatDateKey(new Date(e.date)) === dateKey
          );

          if (!alreadyAdded) {
            await eventStore.add({
              id: Date.now().toString(),
              title,
              subject,
              date: assessmentDate,
              type: eventType,
              source: "manual",
              description: `Auto-added from study guide "${title}".`,
            });
          }
        }

        const flashcardsKey = `docFlashcards:${doc.id}`;
        const quizKey = `docQuiz:${doc.id}`;

        const generateFlashcards = async () => {
          if (safeLocalStorageGet(flashcardsKey)) return;
          const cards = await generateFlashcardsFromDocument({
            documentContent: job.assessmentText,
            fileName: job.fileName,
            subject: subjectLabel,
            grade: job.grade,
            count: 20,
          });
          if (cards.length === 0) return;
          await flashcardStore.add(
            cards.map(c => ({
              subjectId: job.subjectId,
              front: c.front,
              back: c.back,
              sourceSessionId: `doc:${doc.id}`,
            }))
          );
          safeLocalStorageSet(flashcardsKey, "1");
        };

        const generateQuiz = async () => {
          if (safeLocalStorageGet(quizKey)) return;
          const quiz = await generateQuizFromDocument({
            documentContent: job.assessmentText,
            fileName: job.fileName,
            subject: subjectLabel,
            grade: job.grade,
            numberOfQuestions: 10,
          });
          if (!quiz?.questions?.length) return;
          safeLocalStorageSet(quizKey, JSON.stringify(quiz));
        };

        await Promise.allSettled([generateFlashcards(), generateQuiz()]);

        setDone(true);
        // Brief pause so the "Done!" step feels satisfying
        await new Promise(r => setTimeout(r, 800));
        router.replace(`/subjects/${job.subjectId}/document/${doc.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    };

    run();
  }, [router]);

  const progress = done
    ? 100
    : ((stepIdx + 1) / STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <FloatingParticles />

      {/* Back button — only show if not done yet */}
      {!done && (
        <button
          onClick={() => router.back()}
          className="absolute top-5 left-5 z-20 flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Cancel
        </button>
      )}

      {/* Radial glow behind icon */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full px-8 text-center">

        {error ? (
          // ── Error state ────────────────────────────────────────────────────
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground mb-2">Generation failed</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-6 py-2.5 rounded-full bg-muted hover:bg-muted/80 text-sm font-bold text-foreground transition-colors"
            >
              Go back
            </button>
          </motion.div>
        ) : (
          <>
            {/* ── Icon ──────────────────────────────────────────────────────── */}
            <div className="relative">
              <motion.div
                animate={done ? { scale: [1, 1.15, 1] } : { scale: [1, 1.06, 1] }}
                transition={{ duration: done ? 0.4 : 2.4, repeat: done ? 0 : Infinity, ease: "easeInOut" }}
                className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center shadow-2xl shadow-primary/30"
              >
                <Sparkles className="w-10 h-10 text-white" />
              </motion.div>

              {/* Orbit rings */}
              {[1, 1.4, 1.8].map((scale, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-3xl border border-primary/10"
                  style={{ scale }}
                  animate={{ rotate: 360 * (i % 2 === 0 ? 1 : -1) }}
                  transition={{ duration: 6 + i * 2, repeat: Infinity, ease: "linear" }}
                />
              ))}
            </div>

            {/* ── Title ─────────────────────────────────────────────────────── */}
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                {done ? "Guide ready!" : "Building your guide"}
              </h1>
              <p className="text-sm text-muted-foreground/60">
                {done ? "Redirecting you now…" : "This usually takes about 30 seconds"}
              </p>
            </div>

            {/* ── Step list ─────────────────────────────────────────────────── */}
            <div className="w-full space-y-2.5">
              {STEPS.map((step, i) => {
                const isPast    = i < stepIdx;
                const isCurrent = i === stepIdx && !done;
                const isDone    = done || isPast;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: isDone || isCurrent ? 1 : 0.3, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 text-left"
                  >
                    {/* Status dot */}
                    <div className="relative shrink-0 w-5 h-5 flex items-center justify-center">
                      {isDone ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-4 h-4 rounded-full bg-primary flex items-center justify-center"
                        >
                          <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </motion.div>
                      ) : isCurrent ? (
                        <motion.div
                          animate={{ scale: [0.8, 1.1, 0.8] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                          className="w-3 h-3 rounded-full bg-primary"
                        />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
                      )}
                    </div>

                    <span
                      className={`text-sm font-medium transition-colors ${
                        isCurrent ? "text-foreground" :
                        isDone    ? "text-muted-foreground" :
                                    "text-muted-foreground/40"
                      }`}
                    >
                      {step.icon} {step.label}
                      {isCurrent && (
                        <motion.span
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                          className="ml-1 text-primary"
                        >
                          …
                        </motion.span>
                      )}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* ── Progress bar ──────────────────────────────────────────────── */}
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: "5%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
