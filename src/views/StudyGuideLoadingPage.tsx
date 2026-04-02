"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, AlertCircle, ArrowLeft } from "lucide-react";
import { generateStudyGuide, generateFlashcardsFromDocument, generateQuizFromDocument } from "@/services/groq";
import { subjectStore } from "@/utils/subjectStore";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { eventStore } from "@/utils/eventStore";
import { flashcardStore } from "@/utils/flashcardStore";
import {
  assessmentTypeToEventType,
  formatDateKey,
  getGenerationErrorMessage,
  parseAssessmentDate,
  pickStudyGuideTitle,
} from "@/utils/studyGuideGeneration";
import { studyGuideToMarkdown } from "@/utils/studyGuideMarkdown";
import {
  createBlockNoteContentParser,
  serialiseBN,
} from "@/components/blocknote/content";
import {
  type BlockNoteEditorBlock,
} from "@/components/blocknote/schema";

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

const STEP_DURATION_MS = 3000; // Faster cycling for continuous loop

// ── Particle background ───────────────────────────────────────────────────────
interface ParticleData {
  x: string;
  y: string;
  y1: string;
  y2: string;
  duration: number;
  delay: number;
}

function FloatingParticles() {
  const [particles, setParticles] = useState<ParticleData[]>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 20 }, () => ({
        x: `${Math.random() * 100}vw`,
        y: `${Math.random() * 100}vh`,
        y1: `${Math.random() * 100}vh`,
        y2: `${Math.random() * 100}vh`,
        duration: 4 + Math.random() * 6,
        delay: Math.random() * 4,
      }))
    );
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/20"
          initial={{
            x: particle.x,
            y: particle.y,
            opacity: 0,
          }}
          animate={{
            y: [particle.y1, particle.y2],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
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
  const [elapsed, setElapsed] = useState(0);
  const hasStarted = useRef(false);
  const startTimeRef = useRef<number>(Date.now());
  const savedDocRef = useRef<{ subjectId: string; docId: string } | null>(null);

  // Elapsed time tracker
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Step ticker - loops continuously until done
  useEffect(() => {
    if (done) return;
    
    const interval = setInterval(() => {
      setStepIdx(i => (i + 1) % STEPS.length);
    }, STEP_DURATION_MS);
    return () => clearInterval(interval);
  }, [done]);

  // Generation
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const safeLocalStorageGet = (key: string) => {
      try { return localStorage.getItem(key); } catch { return null; }
    };

    const safeLocalStorageSet = (key: string, value: string) => {
      try { localStorage.setItem(key, value); } catch { return undefined; }
    };

    const run = async () => {
      try {
        // Pull job from sessionStorage — retry briefly since the redirect that sets
        // sessionStorage and router.push() happen back-to-back and the component
        // can mount before sessionStorage is written in some tab-cache scenarios.
        let raw = sessionStorage.getItem("studyGuideJob");
        if (!raw) {
          await new Promise(r => setTimeout(r, 150));
          raw = sessionStorage.getItem("studyGuideJob");
        }
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

        const title = pickStudyGuideTitle(result.title, job.fileName.replace(/\.[^.]+$/, "") || "Study Guide");

        // Only create document AFTER successful generation
        const doc = await subjectStore.createDocument(job.subjectId, title);
        const markdown = (result as typeof result & { markdown?: string }).markdown || studyGuideToMarkdown(result);
        
        const parser = createBlockNoteContentParser();
        const blocks = parser.parse(markdown);
        const content = blocks ? serialiseBN(blocks as BlockNoteEditorBlock[]) : markdown;
        
        await subjectStore.updateDocument(job.subjectId, doc.id, {
          title,
          content,
          role: "study-guide",
          studyGuideMarkdown: markdown,
          studyGuideData: { ...result, title },
        });
        savedDocRef.current = { subjectId: job.subjectId, docId: doc.id };

        const assessmentDate = parseAssessmentDate(result.assessmentDate);
        const flashcardsKey = `docFlashcards:${doc.id}`;
        const quizKey = `docQuiz:${doc.id}`;

        const syncAssessmentEvent = async () => {
          if (!assessmentDate) return;

          try {
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
          } catch (eventError) {
            console.warn("[StudyGuideLoadingPage] failed to sync assessment event:", eventError);
          }
        };

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
          const guideSet = await flashcardStore.createSet(job.subjectId, job.fileName?.replace(/\.[^/.]+$/, "") || "Study Guide");
          if (guideSet) {
            await flashcardStore.add(
              cards.map(c => ({
                setId: guideSet.id,
                subjectId: job.subjectId,
                front: c.front,
                back: c.back,
                sourceSessionId: `doc:${doc.id}`,
              }))
            );
          }
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

        await Promise.allSettled([
          syncAssessmentEvent(),
          generateFlashcards(),
          generateQuiz(),
        ]);

        setDone(true);
        // Brief pause so the "Done!" step feels satisfying
        await new Promise(r => setTimeout(r, 800));
        router.replace(`/subjects/${job.subjectId}/document/${doc.id}`);
      } catch (err) {
        const savedDoc = savedDocRef.current;
        if (savedDoc) {
          console.warn("[StudyGuideLoadingPage] recovered from post-save error:", err);
          setDone(true);
          router.replace(`/subjects/${savedDoc.subjectId}/document/${savedDoc.docId}`);
          return;
        }

        setError(getGenerationErrorMessage(err));
      }
    };

    run();
  }, [router]);

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
                {done ? "Redirecting you now…" : (
                  <span>
                    This may take up to 60 seconds for complex documents
                    <span className="inline-block ml-2 px-2 py-0.5 bg-muted rounded-full text-xs font-medium">
                      {elapsed}s elapsed
                    </span>
                  </span>
                )}
              </p>
            </div>

            {/* ── Step list ─────────────────────────────────────────────────── */}
            <div className="w-full space-y-2.5">
              {STEPS.map((step, i) => {
                // When looping, only highlight current step, dim others
                const isCurrent = i === stepIdx && !done;
                const isDimmed = !done; // Don't show checkmarks while processing

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ 
                      opacity: isCurrent ? 1 : 0.4, 
                      x: 0,
                      scale: isCurrent ? 1.02 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-3 text-left"
                  >
                    {/* Status dot */}
                    <div className="relative shrink-0 w-5 h-5 flex items-center justify-center">
                      {isCurrent ? (
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
                        isCurrent ? "text-foreground font-semibold" : "text-muted-foreground/40"
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

            {/* ── Time estimate ─────────────────────────────────────────────── */}
            <div className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-3.5 h-3.5" />
              </motion.div>
              <span>Working on your document…</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
