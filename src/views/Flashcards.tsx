"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, BookOpen, Check, Edit3, RotateCcw,
  Sparkles, Trash2, X, ChevronLeft, ChevronRight, Brain,
  Zap, Trophy, FileText, Plus, FolderOpen,
  CheckCircle2, XCircle, Loader2, AlertTriangle, Eye, EyeOff,
  Layers, Settings2, Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { flashcardStore, Flashcard, FlashcardRating } from "@/utils/flashcardStore";
import { generateFlashcardsFromDocument, generateQuiz } from "@/services/groq";
import QuizCard from "@/components/QuizCard";
import { statsStore } from "@/utils/statsStore";
import type { QuizAnswerInput, QuizOption, QuizQuestion } from "@/types/quiz";

const subjectLabel = (id: string) =>
  SUBJECT_CATALOG.find(s => s.id === id)?.label || id;

// Top-level page views
type View = "library" | "set-detail" | "create-set" | "flashcard-review" | "learn" | "test";
// Sub-tabs within a set detail page (like Quizlet)
type SetTab = "flashcards" | "learn" | "test";

interface CardSet {
  subjectId: string;
  cards: Flashcard[];
  dueCount: number;
  masteredCount: number;
}

type QuizAnswerRecord = QuizAnswerInput & {
  options?: QuizOption[];
  feedback?: string;
};

/* ─── FLIP CARD COMPONENT ────────────────────────────────────────── */
function FlipCard({
  front, back, flipped, onClick,
}: {
  front: string; back: string; flipped: boolean; onClick: () => void;
}) {
  return (
    <div className="w-full cursor-pointer select-none" style={{ perspective: "1400px" }} onClick={onClick}>
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        style={{ transformStyle: "preserve-3d", position: "relative" }}
        className="w-full"
      >
        {/* Front */}
        <div
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          className="w-full min-h-[300px] sm:min-h-[360px] rounded-3xl border-2 border-primary/25 bg-gradient-to-br from-card via-card to-primary/5 shadow-2xl flex flex-col items-center justify-center p-10 text-center"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 mb-6">Term</p>
          <p className="text-2xl sm:text-3xl font-bold text-foreground leading-relaxed">{front}</p>
          <p className="mt-10 text-xs text-muted-foreground/60 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Click to flip
          </p>
        </div>
        {/* Back */}
        <div
          style={{
            backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
            position: "absolute", inset: 0, transform: "rotateY(180deg)",
          }}
          className="w-full min-h-[300px] sm:min-h-[360px] rounded-3xl border-2 border-emerald-500/30 bg-gradient-to-br from-card via-card to-emerald-500/5 shadow-2xl flex flex-col items-center justify-center p-10 text-center"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60 mb-6">Definition</p>
          <p className="text-2xl sm:text-3xl font-bold text-foreground leading-relaxed">{back}</p>
          <p className="mt-10 text-xs text-muted-foreground/60 flex items-center gap-1.5">
            <EyeOff className="w-3.5 h-3.5" /> Click to flip back
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────── */
export default function Flashcards() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [view, setView] = useState<View>("library");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSubjects, setUserSubjects] = useState<string[]>([]);

  // Active set
  const [activeSetSubject, setActiveSetSubject] = useState<string | null>(null);
  const [activeSetTab, setActiveSetTab] = useState<SetTab>("flashcards");

  // Flashcard review
  const [reviewCards, setReviewCards] = useState<Flashcard[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewComplete, setReviewComplete] = useState(false);

  // Edit card (inline in set detail)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

  // Create set form
  const [newSetSubject, setNewSetSubject] = useState("");
  const [newSetCards, setNewSetCards] = useState([
    { front: "", back: "" },
    { front: "", back: "" },
    { front: "", back: "" },
    { front: "", back: "" },
    { front: "", back: "" },
  ]);
  const [savingSet, setSavingSet] = useState(false);

  // File upload
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadSubject, setUploadSubject] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Learn mode
  const [learnCards, setLearnCards] = useState<Flashcard[]>([]);
  const [learnIndex, setLearnIndex] = useState(0);
  const [learnFlipped, setLearnFlipped] = useState(false);
  const [learnComplete, setLearnComplete] = useState(false);
  const [learnAnswers, setLearnAnswers] = useState<("correct" | "incorrect" | null)[]>([]);

  // Test mode
  const [testSubject, setTestSubject] = useState("math");
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState("intermediate");
  const [testQuestions, setTestQuestions] = useState<QuizQuestion[]>([]);
  const [testCurrentQ, setTestCurrentQ] = useState(0);
  const [testAnswers, setTestAnswers] = useState<Array<QuizAnswerRecord | null>>([]);
  const [testLoading, setTestLoading] = useState(false);
  const [testComplete, setTestComplete] = useState(false);
  const [testStarted, setTestStarted] = useState(false);

  /* ── Load user subjects ── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const load = () => {
      try {
        const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
        setUserSubjects(Array.isArray(prefs.subjects) ? prefs.subjects : []);
      } catch { setUserSubjects([]); }
    };
    load();
    window.addEventListener("userPreferencesUpdated", load);
    return () => window.removeEventListener("userPreferencesUpdated", load);
  }, []);

  useEffect(() => {
    const subjectParam = searchParams.get("subject");
    if (subjectParam) { setActiveSetSubject(subjectParam); setView("set-detail"); }
  }, [searchParams]);

  /* ── Load all cards ── */
  const refresh = useCallback(async () => {
    const all = await flashcardStore.getAll();
    setCards(all);
    return all;
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  /* ── Derived ── */
  const subjectOptions = useMemo(() =>
    userSubjects.length > 0 ? userSubjects : SUBJECT_CATALOG.map(s => s.id),
    [userSubjects]);

  useEffect(() => {
    if (!subjectOptions.includes(newSetSubject)) setNewSetSubject(subjectOptions[0] || "");
    if (!subjectOptions.includes(uploadSubject)) setUploadSubject(subjectOptions[0] || "");
    if (!subjectOptions.includes(testSubject)) setTestSubject(subjectOptions[0] || "math");
  }, [subjectOptions]);

  const sets = useMemo<CardSet[]>(() => {
    const now = new Date().toISOString();
    const grouped: Record<string, Flashcard[]> = {};
    for (const card of cards) {
      if (!grouped[card.subjectId]) grouped[card.subjectId] = [];
      grouped[card.subjectId].push(card);
    }
    return Object.entries(grouped).map(([subjectId, subCards]) => ({
      subjectId, cards: subCards,
      dueCount: subCards.filter(c => c.nextReview <= now).length,
      masteredCount: subCards.filter(c => c.repetitions >= 3).length,
    }));
  }, [cards]);

  const activeSet = sets.find(s => s.subjectId === activeSetSubject);
  const totalCards = cards.length;
  const totalDue = useMemo(() => {
    const now = new Date().toISOString();
    return cards.filter(c => c.nextReview <= now).length;
  }, [cards]);

  /* ── Navigation helpers ── */
  const openSet = (subjectId: string, tab: SetTab = "flashcards") => {
    setActiveSetSubject(subjectId);
    setActiveSetTab(tab);
    setFlipped(false);
    setReviewComplete(false);
    setReviewIndex(0);
    setView("set-detail");
  };

  const goBackToSet = () => {
    setView("set-detail");
    setReviewComplete(false);
    setTestStarted(false);
    setTestComplete(false);
  };

  /* ── Flashcard review (tab inside set-detail) ── */
  const initReview = (setCards: Flashcard[]) => {
    const now = new Date().toISOString();
    const due = setCards.filter(c => c.nextReview <= now);
    setReviewCards(due.length > 0 ? due : setCards);
    setReviewIndex(0);
    setFlipped(false);
    setReviewComplete(false);
  };

  useEffect(() => {
    if (view === "set-detail" && activeSet && activeSetTab === "flashcards") {
      initReview(activeSet.cards);
    }
  }, [view, activeSetSubject, activeSetTab]);

  const handleRate = async (rating: FlashcardRating) => {
    const card = reviewCards[reviewIndex];
    if (!card) return;
    await flashcardStore.review(card.id, rating);
    setFlipped(false);
    if (reviewIndex + 1 >= reviewCards.length) {
      setReviewComplete(true);
      await refresh();
    } else {
      setReviewIndex(i => i + 1);
    }
  };

  /* ── Learn mode ── */
  const initLearn = (setCards: Flashcard[]) => {
    setLearnCards([...setCards].sort(() => Math.random() - 0.5));
    setLearnIndex(0);
    setLearnFlipped(false);
    setLearnComplete(false);
    setLearnAnswers(Array(setCards.length).fill(null));
  };

  useEffect(() => {
    if (view === "set-detail" && activeSet && activeSetTab === "learn") {
      initLearn(activeSet.cards);
    }
  }, [view, activeSetSubject, activeSetTab]);

  /* ── Test mode ── */
  useEffect(() => {
    if (view === "set-detail" && activeSet && activeSetTab === "test") {
      setTestSubject(activeSet.subjectId);
      setTestStarted(false);
      setTestComplete(false);
      setTestQuestions([]);
    }
  }, [view, activeSetSubject, activeSetTab]);

  const runTest = async () => {
    setTestLoading(true);
    setTestStarted(true);
    const prefs = typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("userPreferences") || "{}") : {};
    const quizData = await generateQuiz(
      testSubject,
      { grade: prefs.grade, state: prefs.state, hobbies: prefs.hobbies || [], subject: testSubject, difficulty },
      numQuestions,
    );
    if (quizData?.questions) {
      setTestQuestions(quizData.questions as QuizQuestion[]);
      setTestAnswers(Array(quizData.questions.length).fill(null));
      setTestCurrentQ(0);
    }
    setTestLoading(false);
  };

  const handleTestAnswer = (payload: { isCorrect: boolean; userAnswer: string; feedback?: string }) => {
    const q = testQuestions[testCurrentQ];
    if (!q || testAnswers[testCurrentQ]) return;
    const correctAnswer = q.options?.find(o => o.isCorrect)?.text || q.correctAnswer || "";
    setTestAnswers(prev => {
      const next = [...prev];
      next[testCurrentQ] = {
        id: q.id, type: q.type || "multiple_choice",
        question: q.question, options: q.options,
        userAnswer: payload.userAnswer, correctAnswer,
        isCorrect: payload.isCorrect, feedback: payload.feedback,
      };
      return next;
    });
  };

  const handleTestNext = () => {
    if (testCurrentQ + 1 >= testQuestions.length) {
      const score = testAnswers.filter(a => a?.isCorrect).length;
      statsStore.addQuiz((score / testQuestions.length) * 100);
      setTestComplete(true);
    } else {
      setTestCurrentQ(i => i + 1);
    }
  };

  const testScore = testAnswers.filter(a => a?.isCorrect).length;

  /* ── Create set ── */
  const addCardRow = () => setNewSetCards(prev => [...prev, { front: "", back: "" }]);
  const removeCardRow = (i: number) => setNewSetCards(prev => prev.filter((_, idx) => idx !== i));
  const updateCardRow = (i: number, field: "front" | "back", val: string) => {
    setNewSetCards(prev => { const next = [...prev]; next[i] = { ...next[i], [field]: val }; return next; });
  };

  const saveSet = async () => {
    const validCards = newSetCards.filter(c => c.front.trim() && c.back.trim());
    if (!newSetSubject || validCards.length === 0) return;
    setSavingSet(true);
    await flashcardStore.add(validCards.map(c => ({ subjectId: newSetSubject, front: c.front.trim(), back: c.back.trim() })));
    await refresh();
    setSavingSet(false);
    setNewSetCards([{ front: "", back: "" }, { front: "", back: "" }, { front: "", back: "" }, { front: "", back: "" }, { front: "", back: "" }]);
    openSet(newSetSubject);
  };

  /* ── File upload ── */
  const handleFileUpload = async (file: File) => {
    setUploadingFile(true);
    try {
      const text = await file.text();
      // Auto-detect subject from filename or use first available subject
      const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      const detectedSubject = userSubjects.find(s => fileName.toLowerCase().includes(s.toLowerCase())) || userSubjects[0] || "math";
      
      const result = await generateFlashcardsFromDocument({
        documentContent: text, fileName: file.name,
        subject: subjectLabel(detectedSubject), count: 20,
      });
      if (result.length > 0) {
        await flashcardStore.add(result.map(f => ({ subjectId: detectedSubject, front: f.front, back: f.back })));
        await refresh();
        openSet(detectedSubject);
      }
    } catch (err) { console.error(err); }
    finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    handleFileUpload(files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    handleFileUpload(files[0]);
  };

  /* ── Edit card ── */
  const beginEdit = (card: Flashcard) => { setEditingId(card.id); setEditFront(card.front); setEditBack(card.back); };
  const saveEdit = async () => {
    if (!editingId) return;
    await flashcardStore.update(editingId, { front: editFront.trim(), back: editBack.trim() });
    setEditingId(null);
    await refresh();
  };
  const deleteCard = async (id: string) => {
    if (!window.confirm("Delete this card?")) return;
    await flashcardStore.delete(id);
    await refresh();
  };

  const deleteSet = async (subjectId: string) => {
    if (!window.confirm(`Delete all cards in "${subjectLabel(subjectId)}"? This cannot be undone.`)) return;
    const setCards = cards.filter(c => c.subjectId === subjectId);
    await Promise.all(setCards.map(c => flashcardStore.delete(c.id)));
    await refresh();
  };

  /* ──────────────────────── RENDER ────────────────────────────── */
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Sticky top nav ── */}
      <div className="border-b border-border/40 bg-background/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">

          {/* Back button */}
          {view === "library" ? (
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}
              className="gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Dashboard</span>
            </Button>
          ) : view === "create-set" ? (
            <Button variant="ghost" size="sm" onClick={() => setView("library")}
              className="gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Library</span>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => { setView("library"); setActiveSetSubject(null); }}
              className="gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Library</span>
            </Button>
          )}

          {/* Title */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
            </div>
            <h1 className="text-sm font-black truncate text-foreground">
              {view === "library" && "Flashcards"}
              {view === "create-set" && "Create a new set"}
              {view === "set-detail" && (activeSet ? subjectLabel(activeSet.subjectId) : "Set")}
            </h1>
          </div>

          {/* Right actions */}
          {view === "library" && (
            <Button size="sm" onClick={() => setView("create-set")} className="gap-1.5 shrink-0">
              <Plus className="w-4 h-4" /> Create set
            </Button>
          )}
          {view === "set-detail" && activeSet && (
            <Button size="sm" variant="outline"
              onClick={() => { setNewSetSubject(activeSet.subjectId); setView("create-set"); }}
              className="gap-1.5 shrink-0 text-xs">
              <Plus className="w-3.5 h-3.5" /> Add cards
            </Button>
          )}
        </div>
      </div>

      {/* ── Page content ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">

          {/* ══════════════════ LIBRARY ══════════════════ */}
          {view === "library" && (
            <motion.div key="library"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
              className="space-y-8"
            >
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Cards", value: totalCards, color: "text-primary" },
                  { label: "Due today", value: totalDue, color: "text-amber-500" },
                  { label: "Sets", value: sets.length, color: "text-blue-500" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-2xl border border-border bg-card p-4 text-center">
                    <p className={cn("text-3xl font-black", color)}>{value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {/* AI generate from doc */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-black">Generate from document</p>
                    <p className="text-xs text-muted-foreground">Upload notes or a textbook page and we'll make a set for you.</p>
                  </div>
                </div>
                
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                    isDragOver ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-muted/30"
                  )}
                >
                  <input ref={fileInputRef} type="file" id="file-upload" className="hidden" accept=".txt,.pdf,.doc,.docx" onChange={handleFileInputChange} />
                  
                  {uploadingFile ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <div>
                        <p className="text-sm font-bold text-foreground">Generating flashcards...</p>
                        <p className="text-xs text-muted-foreground">AI is reading your document</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Drop your file here or click to browse</p>
                        <p className="text-xs text-muted-foreground mt-1">Supports .txt, .pdf, .doc, .docx</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sets */}
              <div>
                <h2 className="text-base font-black mb-4 text-muted-foreground uppercase tracking-widest text-[11px]">Your sets</h2>
                {loading ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Loading...
                  </div>
                ) : sets.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-border py-16 text-center">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/25" />
                    <p className="font-black text-lg mb-1">No sets yet</p>
                    <p className="text-sm text-muted-foreground mb-5">Create your first set to start studying</p>
                    <Button onClick={() => setView("create-set")}><Plus className="w-4 h-4 mr-2" /> Create set</Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sets.map(set => (
                      <motion.div key={set.subjectId}
                        whileHover={{ y: -4, boxShadow: "0 12px 32px rgba(0,0,0,0.12)" }}
                        whileTap={{ scale: 0.97 }}
                        className="rounded-2xl border border-border bg-card p-5 text-left cursor-pointer hover:border-primary/40 transition-all group relative w-full"
                      >
                        {/* Delete button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSet(set.subjectId); }}
                          className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all z-10"
                          title="Delete set"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div onClick={() => openSet(set.subjectId)}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Layers className="w-4 h-4 text-primary" />
                            </div>
                            {set.dueCount > 0 && (
                              <span className="text-[10px] font-black bg-amber-500/15 text-amber-600 border border-amber-500/30 rounded-full px-2 py-0.5">
                                {set.dueCount} due
                              </span>
                            )}
                          </div>
                          <p className="font-black text-base leading-tight mb-1 pr-6">{subjectLabel(set.subjectId)}</p>
                          <p className="text-xs text-muted-foreground mb-3">{set.cards.length} terms</p>
                          <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${set.cards.length > 0 ? (set.masteredCount / set.cards.length) * 100 : 0}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1.5">{set.masteredCount} mastered</p>
                        </div>
                      </motion.div>
                    ))}

                    {/* Create new set tile */}
                    <motion.button whileHover={{ y: -4 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setView("create-set")}
                      className="rounded-2xl border-2 border-dashed border-border bg-transparent p-5 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 min-h-[160px] w-full"
                    >
                      <Plus className="w-8 h-8 text-muted-foreground/30" />
                      <p className="text-sm font-bold text-muted-foreground">Create set</p>
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ══════════════════ CREATE SET ══════════════════ */}
          {view === "create-set" && (
            <motion.div key="create-set"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
              className="space-y-6"
            >
              {/* Set name / subject */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-xl font-black mb-1">New flashcard set</h2>
                <p className="text-xs text-muted-foreground mb-5">Pick a subject, then add as many cards as you like.</p>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subject</label>
                  <select
                    value={newSetSubject}
                    onChange={e => setNewSetSubject(e.target.value)}
                    className="mt-2 w-full sm:w-72 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {subjectOptions.map(id => <option key={id} value={id}>{subjectLabel(id)}</option>)}
                  </select>
                </div>
              </div>

              {/* Card rows — Quizlet style */}
              <div className="space-y-3">
                {newSetCards.map((card, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="rounded-2xl border border-border bg-card overflow-hidden"
                  >
                    {/* Row header */}
                    <div className="flex items-center justify-between px-5 pt-4 pb-2">
                      <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{i + 1}</span>
                      {newSetCards.length > 1 && (
                        <button onClick={() => removeCardRow(i)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {/* Fields */}
                    <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
                      <div className="px-5 pb-5 pt-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Term</p>
                        <textarea
                          value={card.front}
                          onChange={e => updateCardRow(i, "front", e.target.value)}
                          placeholder="Enter term"
                          rows={2}
                          className="w-full bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none border-b border-border/60 pb-1 focus:border-primary transition-colors"
                        />
                      </div>
                      <div className="px-5 pb-5 pt-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Definition</p>
                        <textarea
                          value={card.back}
                          onChange={e => updateCardRow(i, "back", e.target.value)}
                          placeholder="Enter definition"
                          rows={2}
                          className="w-full bg-transparent text-sm text-foreground/80 placeholder:text-muted-foreground/40 resize-none focus:outline-none border-b border-border/60 pb-1 focus:border-primary transition-colors"
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Add card row */}
              <button onClick={addCardRow}
                className="w-full rounded-2xl border-2 border-dashed border-border py-4 text-sm font-bold text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add card
              </button>

              {/* Save */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  {newSetCards.filter(c => c.front.trim() && c.back.trim()).length} / {newSetCards.length} cards ready
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setView("library")}>Cancel</Button>
                  <Button
                    onClick={saveSet}
                    disabled={savingSet || newSetCards.filter(c => c.front.trim() && c.back.trim()).length === 0}
                  >
                    {savingSet ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Check className="w-4 h-4 mr-2" /> Create set</>}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════════════════ SET DETAIL ══════════════════ */}
          {view === "set-detail" && activeSet && (
            <motion.div key="set-detail"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
              className="space-y-0"
            >
              {/* Set hero */}
              <div className="mb-6">
                <h2 className="text-3xl font-black mb-1">{subjectLabel(activeSet.subjectId)}</h2>
                <p className="text-sm text-muted-foreground">{activeSet.cards.length} terms</p>
              </div>

              {/* Study mode tabs — like Quizlet */}
              <div className="flex gap-1 border-b border-border mb-8">
                {([
                  { tab: "flashcards" as SetTab, label: "Flashcards", icon: Zap },
                  { tab: "learn" as SetTab, label: "Learn", icon: Brain },
                  { tab: "test" as SetTab, label: "Test", icon: FileText },
                ]).map(({ tab, label, icon: Icon }) => (
                  <button key={tab}
                    onClick={() => setActiveSetTab(tab)}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold transition-all border-b-2 -mb-px",
                      activeSetTab === tab
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">

                {/* ── FLASHCARDS TAB ── */}
                {activeSetTab === "flashcards" && (
                  <motion.div key="fc-tab"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    {reviewComplete ? (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16 space-y-4"
                      >
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
                          <Trophy className="w-16 h-16 mx-auto text-primary" />
                        </motion.div>
                        <h3 className="text-2xl font-black">You've reviewed all cards!</h3>
                        <p className="text-muted-foreground text-sm">Top effort. Ready for another round?</p>
                        <div className="flex gap-3 justify-center mt-4">
                          <Button variant="outline" onClick={() => initReview(activeSet.cards)}>
                            <RotateCcw className="w-4 h-4 mr-2" /> Study again
                          </Button>
                          <Button onClick={() => setActiveSetTab("learn")}>
                            <Brain className="w-4 h-4 mr-2" /> Try Learn mode
                          </Button>
                        </div>
                      </motion.div>
                    ) : reviewCards.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground text-sm">No cards to review.</div>
                    ) : (
                      <>
                        {/* Progress */}
                        <div>
                          <div className="flex justify-between text-xs font-bold text-muted-foreground mb-2">
                            <span>{reviewIndex + 1} / {reviewCards.length}</span>
                            <span>{Math.round((reviewIndex / reviewCards.length) * 100)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              animate={{ width: `${(reviewIndex / reviewCards.length) * 100}%` }}
                              className="h-full bg-primary rounded-full" transition={{ ease: "easeOut" }}
                            />
                          </div>
                        </div>

                        {/* Flip card */}
                        <AnimatePresence mode="wait">
                          <motion.div key={reviewCards[reviewIndex]?.id}
                            initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.22 }}
                          >
                            <FlipCard
                              front={reviewCards[reviewIndex]?.front || ""}
                              back={reviewCards[reviewIndex]?.back || ""}
                              flipped={flipped}
                              onClick={() => setFlipped(f => !f)}
                            />
                          </motion.div>
                        </AnimatePresence>

                        {/* Nav */}
                        <div className="flex items-center justify-center gap-4">
                          <button onClick={() => { setFlipped(false); if (reviewIndex > 0) setReviewIndex(i => i - 1); }}
                            disabled={reviewIndex === 0}
                            className="p-3 rounded-full border border-border hover:bg-muted/60 disabled:opacity-30 transition">
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button onClick={() => setFlipped(f => !f)}
                            className="px-6 py-2.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-bold hover:bg-primary/10 transition">
                            {flipped ? "Flip back" : "Flip"}
                          </button>
                          <button
                            onClick={() => { setFlipped(false); if (reviewIndex < reviewCards.length - 1) setReviewIndex(i => i + 1); else setReviewComplete(true); }}
                            className="p-3 rounded-full border border-border hover:bg-muted/60 transition">
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Rating (after flip) */}
                        <AnimatePresence>
                          {flipped && (
                            <motion.div
                              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }}
                            >
                              <p className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
                                How well did you know this?
                              </p>
                              <div className="grid grid-cols-4 gap-2">
                                {([
                                  { rating: 0 as FlashcardRating, label: "Again", cls: "bg-red-500 hover:bg-red-600" },
                                  { rating: 2 as FlashcardRating, label: "Hard", cls: "bg-orange-500 hover:bg-orange-600" },
                                  { rating: 3 as FlashcardRating, label: "Good", cls: "bg-blue-500 hover:bg-blue-600" },
                                  { rating: 5 as FlashcardRating, label: "Easy", cls: "bg-emerald-500 hover:bg-emerald-600" },
                                ]).map(({ rating, label, cls }) => (
                                  <motion.button key={rating}
                                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                    onClick={() => handleRate(rating)}
                                    className={cn("py-3.5 rounded-xl font-bold text-sm text-white transition-colors", cls)}
                                  >
                                    {label}
                                  </motion.button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    )}

                    {/* Terms list at bottom */}
                    <div className="pt-8 border-t border-border space-y-3">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                          Terms in this set ({activeSet.cards.length})
                        </h3>
                        <Button size="sm" variant="outline"
                          onClick={() => { setNewSetSubject(activeSet.subjectId); setView("create-set"); }}
                          className="text-xs gap-1">
                          <Plus className="w-3.5 h-3.5" /> Add
                        </Button>
                      </div>
                      {activeSet.cards.map(card => (
                        <div key={card.id} className="rounded-xl border border-border bg-card">
                          {editingId === card.id ? (
                            <div className="p-4 space-y-3">
                              <textarea value={editFront} onChange={e => setEditFront(e.target.value)} rows={2}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Term" />
                              <textarea value={editBack} onChange={e => setEditBack(e.target.value)} rows={3}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Definition" />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={saveEdit}><Check className="w-3.5 h-3.5 mr-1.5" /> Save</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-4 p-4">
                              <div className="flex-1 grid sm:grid-cols-2 gap-3 min-w-0">
                                <p className="text-sm font-semibold border-b border-border/50 pb-2 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">{card.front}</p>
                                <p className="text-sm text-foreground/75">{card.back}</p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button onClick={() => beginEdit(card)} className="p-1.5 rounded-lg hover:bg-muted/60 transition">
                                  <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                                <button onClick={() => deleteCard(card.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition">
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ── LEARN TAB ── */}
                {activeSetTab === "learn" && (
                  <motion.div key="learn-tab"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center"
                  >
                    {learnComplete ? (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16 space-y-4 w-full max-w-xl"
                      >
                        <Trophy className="w-16 h-16 mx-auto text-primary" />
                        <h3 className="text-2xl font-black">Learn session done!</h3>
                        <p className="text-muted-foreground">
                          {learnAnswers.filter(a => a === "correct").length} of {learnCards.length} correct
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 py-2">
                          {learnAnswers.map((ans, i) => (
                            <div key={i} className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                              ans === "correct" ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"
                            )}>{ans === "correct" ? "✓" : "✗"}</div>
                          ))}
                        </div>
                        <div className="flex gap-3 justify-center">
                          <Button variant="outline" onClick={() => initLearn(activeSet.cards)}>
                            <RotateCcw className="w-4 h-4 mr-2" /> Again
                          </Button>
                          <Button onClick={() => setActiveSetTab("test")}>
                            <FileText className="w-4 h-4 mr-2" /> Take a test
                          </Button>
                        </div>
                      </motion.div>
                    ) : learnCards.length === 0 ? (
                      <p className="py-16 text-muted-foreground text-sm">No cards to learn.</p>
                    ) : (
                      <div className="w-full max-w-2xl space-y-6">
                        <div>
                          <div className="flex justify-between text-xs font-bold text-muted-foreground mb-2">
                            <span>{learnIndex + 1} / {learnCards.length}</span>
                            <span className="text-blue-500 font-black">Learn</span>
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div animate={{ width: `${(learnIndex / learnCards.length) * 100}%` }}
                              className="h-full bg-blue-500 rounded-full" />
                          </div>
                        </div>

                        <AnimatePresence mode="wait">
                          <motion.div key={learnCards[learnIndex]?.id}
                            initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.22 }}
                          >
                            <FlipCard
                              front={learnCards[learnIndex]?.front || ""}
                              back={learnCards[learnIndex]?.back || ""}
                              flipped={learnFlipped}
                              onClick={() => setLearnFlipped(f => !f)}
                            />
                          </motion.div>
                        </AnimatePresence>

                        <AnimatePresence>
                          {learnFlipped && !learnAnswers[learnIndex] && (
                            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                              className="flex gap-3 justify-center"
                            >
                              <button
                                onClick={() => {
                                  const u = [...learnAnswers]; u[learnIndex] = "incorrect"; setLearnAnswers(u);
                                  setTimeout(() => { setLearnFlipped(false); if (learnIndex + 1 >= learnCards.length) setLearnComplete(true); else setLearnIndex(i => i + 1); }, 400);
                                }}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500/20 transition"
                              >
                                <XCircle className="w-5 h-5" /> Still learning
                              </button>
                              <button
                                onClick={() => {
                                  const u = [...learnAnswers]; u[learnIndex] = "correct"; setLearnAnswers(u);
                                  setTimeout(() => { setLearnFlipped(false); if (learnIndex + 1 >= learnCards.length) setLearnComplete(true); else setLearnIndex(i => i + 1); }, 400);
                                }}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold hover:bg-emerald-500/20 transition"
                              >
                                <CheckCircle2 className="w-5 h-5" /> Got it
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── TEST TAB ── */}
                {activeSetTab === "test" && (
                  <motion.div key="test-tab"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="max-w-2xl mx-auto space-y-5"
                  >
                    {/* Config */}
                    {!testStarted && !testLoading && (
                      <div className="rounded-2xl border border-border bg-card p-7 space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Settings2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg font-black">Test — {subjectLabel(activeSet.subjectId)}</h3>
                            <p className="text-xs text-muted-foreground">AI-generated questions based on your set</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Number of questions</label>
                            <span className="text-sm font-black text-primary">{numQuestions}</span>
                          </div>
                          <Slider value={[numQuestions]} onValueChange={([v]) => setNumQuestions(v)} min={3} max={15} step={1} />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Difficulty</label>
                          <Select value={difficulty} onValueChange={setDifficulty}>
                            <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="foundational">Foundational</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button size="lg" className="w-full" onClick={runTest}>
                          <Sparkles className="w-4 h-4 mr-2" /> Start test
                        </Button>
                      </div>
                    )}

                    {/* Loading */}
                    {testLoading && (
                      <div className="text-center py-20 space-y-3">
                        <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Generating your test...</p>
                      </div>
                    )}

                    {/* Error */}
                    {testStarted && !testLoading && testQuestions.length === 0 && !testComplete && (
                      <div className="text-center py-20 space-y-3">
                        <AlertTriangle className="w-10 h-10 mx-auto text-destructive/50" />
                        <p className="text-sm text-muted-foreground">Couldn't generate questions. Check your connection.</p>
                        <Button variant="outline" onClick={() => setTestStarted(false)}>Try again</Button>
                      </div>
                    )}

                    {/* Questions */}
                    {!testLoading && testQuestions.length > 0 && !testComplete && (
                      <>
                        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-3">
                          <span className="text-sm font-bold">{testCurrentQ + 1} / {testQuestions.length}</span>
                          <Badge variant="outline">{subjectLabel(testSubject)}</Badge>
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.div key={testCurrentQ}
                            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                          >
                            <QuizCard
                              type={testQuestions[testCurrentQ]?.type}
                              question={testQuestions[testCurrentQ]?.question}
                              options={testQuestions[testCurrentQ]?.options}
                              correctAnswer={testQuestions[testCurrentQ]?.correctAnswer}
                              questionNumber={testCurrentQ + 1}
                              totalQuestions={testQuestions.length}
                              onAnswer={handleTestAnswer}
                              hint={testQuestions[testCurrentQ]?.hint}
                            />
                          </motion.div>
                        </AnimatePresence>
                        {testAnswers[testCurrentQ] && (
                          <div className="flex justify-end">
                            <Button onClick={handleTestNext} className="gap-2">
                              {testCurrentQ + 1 >= testQuestions.length ? "Finish test" : "Next"}
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}

                    {/* Results */}
                    {testComplete && (
                      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                        className="rounded-2xl border border-border bg-card p-8 text-center space-y-5"
                      >
                        <Trophy className="w-14 h-14 mx-auto text-primary" />
                        <h3 className="text-2xl font-black">Test complete!</h3>
                        <p className="text-muted-foreground">
                          Score: <span className="text-2xl font-black text-primary">{testScore}/{testQuestions.length}</span>
                        </p>
                        <div className="flex justify-center gap-1.5 flex-wrap">
                          {testAnswers.map((ans, i) => (
                            <div key={i} className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                              ans?.isCorrect ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"
                            )}>{ans?.isCorrect ? "✓" : "✗"}</div>
                          ))}
                        </div>
                        <div className="flex gap-3 justify-center">
                          <Button variant="outline"
                            onClick={() => { setTestStarted(false); setTestComplete(false); setTestQuestions([]); }}>
                            <RotateCcw className="w-4 h-4 mr-2" /> New test
                          </Button>
                          <Button onClick={() => setActiveSetTab("flashcards")}>
                            <Zap className="w-4 h-4 mr-2" /> Study flashcards
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

              </AnimatePresence>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
