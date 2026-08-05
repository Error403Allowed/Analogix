"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, BookOpen, Plus, Target,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import MobileFAB from "@/components/MobileFAB";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { flashcardStore, type Flashcard, type FlashcardRating } from "@/utils/flashcardStore";
import { generateFlashcardsFromDocument, generateQuiz, generateQuizFromDocument } from "@/services/groq";
import { extractFileText } from "@/utils/extractFileText";
import { statsStore } from "@/utils/statsStore";
import type { QuizAnswerInput, QuizOption, QuizQuestion } from "@/types/quiz";
import {
  AGENT_QUIZ_SESSION_KEY,
  type PendingAgentQuiz,
} from "@/lib/agentQuiz";
import { LibraryView } from "./flashcards/LibraryView";
import { SubjectDetailView } from "./flashcards/SubjectDetailView";
import { CreateSetView } from "./flashcards/CreateSetView";
import { QuizHubView } from "./flashcards/QuizHubView";
import { SetDetailView } from "./flashcards/SetDetailView";
import { subjectLabel, type CardSet, type TopView, type SetTab } from "./flashcards/types";

type QuizAnswerRecord = QuizAnswerInput & {
  options?: QuizOption[];
  feedback?: string;
};

const clampQuizInteger = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(value)));

const isEditableKeyboardTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    target.isContentEditable ||
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    tag === "OPTION" ||
    Boolean(target.closest("[contenteditable='true'], input, textarea, select, [role='textbox']"))
  );
};

export default function Flashcards() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [topView, setTopView] = useState<TopView>("library");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [dbSets, setDbSets] = useState<import("@/utils/flashcardStore").FlashcardSet[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userSubjects, setUserSubjects] = useState<string[]>([]);

  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [activeSetTab, setActiveSetTab] = useState<SetTab>("flashcards");

  const [reviewCards, setReviewCards] = useState<Flashcard[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewComplete, setReviewComplete] = useState(false);

  const [learnCards, setLearnCards] = useState<Flashcard[]>([]);
  const [learnIndex, setLearnIndex] = useState(0);
  const [learnFlipped, setLearnFlipped] = useState(false);
  const [learnComplete, setLearnComplete] = useState(false);
  const [learnAnswers, setLearnAnswers] = useState<("correct" | "incorrect" | null)[]>([]);
  const [learnReady, setLearnReady] = useState(false);

  const [newSetSubject, setNewSetSubject] = useState("");
  const [newSetName, setNewSetName] = useState("");
  const [newSetCards, setNewSetCards] = useState([
    { front: "", back: "" }, { front: "", back: "" }, { front: "", back: "" },
    { front: "", back: "" }, { front: "", back: "" },
  ]);
  const [savingSet, setSavingSet] = useState(false);

  const [uploadingFile, setUploadingFile] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPasteText, setPendingPasteText] = useState<string | null>(null);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [pickerSubject, setPickerSubject] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [pasteExpanded, setPasteExpanded] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

  const [quizSubject, setQuizSubject] = useState("");
  const [quizDocFile] = useState<File | null>(null);
  const [quizDocMode] = useState(false);
  const [quizNumQ, setQuizNumQ] = useState(5);
  const [quizDifficulty, setQuizDifficulty] = useState("intermediate");
  const [quizTopics, setQuizTopics] = useState("");
  const [quizTimeLimit, setQuizTimeLimit] = useState(0);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizCurrentQ, setQuizCurrentQ] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Array<QuizAnswerRecord | null>>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [quizTimeLeft, setQuizTimeLeft] = useState<number | null>(null);
  const pendingAgentQuizRef = useRef<PendingAgentQuiz | null>(null);
  const hasRecordedActivityRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const load = () => {
      try {
        const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
        const subs = Array.isArray(prefs.subjects) ? prefs.subjects : [];
        const fallbackSubject = subs[0] || SUBJECT_CATALOG[0]?.id || "math";
        setUserSubjects(subs);
        setQuizSubject((current) => current || fallbackSubject);
        setNewSetSubject((current) => current || fallbackSubject);
      } catch { setUserSubjects([]); }
    };
    load();
    window.addEventListener("userPreferencesUpdated", load);
    return () => window.removeEventListener("userPreferencesUpdated", load);
  }, []);

  useEffect(() => {
    const sub = searchParams.get("subject") || searchParams.get("subjectId");
    const tab = searchParams.get("tab");
    if (tab === "quiz") setTopView("quiz-hub");
    else if (sub) { setActiveSubjectId(sub); setTopView("subject-detail"); setTopView("set-detail"); setActiveSetTab("flashcards"); }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (searchParams.get("tab") !== "quiz") return;
    const raw = sessionStorage.getItem(AGENT_QUIZ_SESSION_KEY);
    if (!raw) return;
    try {
      const quiz = JSON.parse(raw) as PendingAgentQuiz;
      pendingAgentQuizRef.current = quiz;
      setTopView("quiz-hub");
      setQuizSubject(quiz.subjectId);
      setQuizTopics(quiz.topic);
      setQuizDifficulty(quiz.difficulty);
      setQuizNumQ(clampQuizInteger(quiz.numberOfQuestions, 3, 20));
      setQuizTimeLimit(clampQuizInteger(quiz.timeLimitMinutes, 0, 120));
    } catch {
      pendingAgentQuizRef.current = null;
    } finally {
      sessionStorage.removeItem(AGENT_QUIZ_SESSION_KEY);
    }
  }, [searchParams]);

  const refresh = useCallback(async () => {
    const orphansRemoved = await flashcardStore.removeOrphans();
    const duplicatesRemoved = await flashcardStore.removeDuplicates();
    const totalCleaned = orphansRemoved + duplicatesRemoved;
    if (totalCleaned > 0) setDuplicateCount(totalCleaned);
    const [all, allSets] = await Promise.all([
      flashcardStore.getAll(),
      flashcardStore.getSets(),
    ]);
    setCards(all);
    setDbSets(allSets);
    return all;
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("flashcardsUpdated", handler);
    window.addEventListener("subjectDataUpdated", handler);
    return () => {
      window.removeEventListener("flashcardsUpdated", handler);
      window.removeEventListener("subjectDataUpdated", handler);
    };
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "analogix_flashcard_update") {
        refresh();
      }
    };
    const channel = new BroadcastChannel("analogix_flashcards");
    const handleBroadcast = () => refresh();
    window.addEventListener("storage", handleStorageChange);
    channel.addEventListener("message", handleBroadcast);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      channel.removeEventListener("message", handleBroadcast);
      channel.close();
    };
  }, [refresh]);

  const subjectOptions = useMemo(() =>
    userSubjects.length > 0 ? userSubjects : SUBJECT_CATALOG.map(s => s.id), [userSubjects]);

  const sets = useMemo<CardSet[]>(() => {
    const now = new Date().toISOString();
    return dbSets.map(set => {
      const setCards = cards.filter(c => c.setId === set.id);
      return {
        set,
        subjectId: set.subjectId,
        cards: setCards,
        dueCount: setCards.filter(c => c.nextReview <= now).length,
        masteredCount: setCards.filter(c => c.repetitions >= 3).length,
      };
    });
  }, [cards, dbSets]);

  const setsBySubject = useMemo(() => {
    const map: Record<string, CardSet[]> = {};
    for (const s of sets) {
      const sid = s.set.subjectId;
      if (!map[sid]) map[sid] = [];
      map[sid].push(s);
    }
    return map;
  }, [sets]);

  const librarySubjects = useMemo(() => {
    const all = new Set([...userSubjects, ...Object.keys(setsBySubject)]);
    return Array.from(all);
  }, [userSubjects, setsBySubject]);

  const activeSet = sets.find(s => s.set.id === activeSetId);
  const activeSetRef = useRef(activeSet);
  activeSetRef.current = activeSet;
  const totalCards = cards.length;

  const openSubject = (subjectId: string) => {
    setActiveSubjectId(subjectId);
    setTopView("subject-detail");
  };

  const openSet = (setId: string, tab: SetTab = "flashcards") => {
    setActiveSetId(setId);
    setActiveSetTab(tab);
    setTopView("set-detail");
    resetReview();
    resetLearn();
  };

  const resetReview = () => { setFlipped(false); setReviewComplete(false); setReviewIndex(0); };
  const resetLearn = () => { setLearnReady(false); setLearnComplete(false); setLearnIndex(0); setLearnFlipped(false); setLearnAnswers([]); };

  useEffect(() => {
    const currentSet = activeSetRef.current;
    if (topView !== "set-detail" || activeSetTab !== "flashcards" || !currentSet) return;
    if (!hasRecordedActivityRef.current) {
      hasRecordedActivityRef.current = true;
      statsStore.recordActivity();
    }
    const now = new Date().toISOString();
    const due = currentSet.cards.filter(c => c.nextReview <= now);
    setReviewCards(due.length > 0 ? due : currentSet.cards);
    setReviewIndex(0);
    setFlipped(false);
    setReviewComplete(false);
  }, [topView, activeSetId, activeSetTab]);

  useEffect(() => {
    const currentSet = activeSetRef.current;
    if (topView !== "set-detail" || activeSetTab !== "learn" || !currentSet) return;
    const shuffled = [...currentSet.cards].sort(() => Math.random() - 0.5);
    setLearnCards(shuffled);
    setLearnIndex(0);
    setLearnFlipped(false);
    setLearnComplete(false);
    setLearnAnswers(Array(shuffled.length).fill(null));
    setLearnReady(true);
  }, [topView, activeSetId, activeSetTab]);

  const handleRate = useCallback(async (rating: FlashcardRating) => {
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
  }, [refresh, reviewCards, reviewIndex]);

  const handleLearnAnswer = useCallback((correct: boolean) => {
    const updated = [...learnAnswers];
    updated[learnIndex] = correct ? "correct" : "incorrect";
    setLearnAnswers(updated);
    setTimeout(() => {
      setLearnFlipped(false);
      if (learnIndex + 1 >= learnCards.length) {
        setLearnComplete(true);
      } else {
        setLearnIndex(i => i + 1);
      }
    }, 350);
  }, [learnAnswers, learnCards.length, learnIndex]);

  const goToPreviousReviewCard = useCallback(() => {
    setFlipped(false);
    if (reviewIndex > 0) {
      setReviewIndex(reviewIndex - 1);
    }
  }, [reviewIndex]);

  const goToNextReviewCard = useCallback(() => {
    setFlipped(false);
    if (reviewIndex < reviewCards.length - 1) {
      setReviewIndex(reviewIndex + 1);
      return;
    }
    setReviewComplete(true);
  }, [reviewCards.length, reviewIndex]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableKeyboardTarget(event.target)) return;
      if (topView !== "set-detail") return;

      if (activeSetTab === "flashcards" && !reviewComplete && reviewCards.length > 0) {
        if (event.code === "Space") {
          event.preventDefault();
          setFlipped((current) => !current);
          return;
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          goToPreviousReviewCard();
          return;
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          goToNextReviewCard();
        }
        return;
      }

      if (
        activeSetTab === "learn" &&
        learnReady &&
        !learnComplete &&
        learnCards.length > 0 &&
        learnAnswers[learnIndex] === null
      ) {
        if (event.code === "Space") {
          event.preventDefault();
          setLearnFlipped((current) => !current);
          return;
        }
        if (!learnFlipped) return;
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          handleLearnAnswer(false);
          return;
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          handleLearnAnswer(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeSetTab,
    goToNextReviewCard,
    goToPreviousReviewCard,
    handleLearnAnswer,
    learnAnswers,
    learnCards.length,
    learnComplete,
    learnFlipped,
    learnIndex,
    learnReady,
    reviewCards.length,
    reviewComplete,
    topView,
  ]);

  const seenQuestionsRef = useRef<string[]>([]);

  const runQuizHub = useCallback(async (preset?: Partial<PendingAgentQuiz>) => {
    const resolvedSubject = preset?.subjectId || quizSubject;
    const resolvedTopics = preset?.topic ?? quizTopics;
    const resolvedDifficulty = preset?.difficulty || quizDifficulty;
    const resolvedQuestionCount = preset?.numberOfQuestions ?? quizNumQ;
    const resolvedTimeLimit = preset?.timeLimitMinutes ?? quizTimeLimit;

    setQuizLoading(true);
    setQuizStarted(true);
    setQuizComplete(false);
    setQuizAnswers([]);
    setQuizCurrentQ(0);

    const prefs = typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("userPreferences") || "{}") : {};

    let quizData: import("@/types/quiz").QuizData | null = null;

    if (quizDocMode && quizDocFile && !preset) {
      try {
        const docContent = await extractFileText(quizDocFile);
        quizData = await generateQuizFromDocument({
          documentContent: docContent,
          fileName: quizDocFile.name,
          subject: subjectLabel(resolvedSubject),
          grade: prefs.grade,
          numberOfQuestions: resolvedQuestionCount,
        });
      } catch (err) {
        console.error("[runQuizHub] doc extraction failed:", err);
      }
    } else {
      const topicInput = resolvedTopics.trim()
        ? `Subject: ${subjectLabel(resolvedSubject)}. Focus on these specific topics: ${resolvedTopics}`
        : subjectLabel(resolvedSubject);

      const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${resolvedSubject}-${resolvedDifficulty}`;

      quizData = await generateQuiz(
        topicInput,
        { grade: prefs.grade, state: prefs.state, hobbies: prefs.hobbies || [],
          subject: resolvedSubject, difficulty: resolvedDifficulty },
        resolvedQuestionCount,
        { diversitySeed: seed, avoidQuestions: seenQuestionsRef.current.slice(-20) },
      );
    }

    if (quizData?.questions) {
      setQuizQuestions(quizData.questions as QuizQuestion[]);
      setQuizAnswers(Array(quizData.questions.length).fill(null));
      setQuizSubject(resolvedSubject);
      setQuizTopics(resolvedTopics);
      setQuizDifficulty(resolvedDifficulty);
      setQuizNumQ(resolvedQuestionCount);
      setQuizTimeLimit(resolvedTimeLimit);
      setQuizTimeLeft(resolvedTimeLimit > 0 ? resolvedTimeLimit * 60 : null);
    }
    setQuizLoading(false);
  }, [quizDifficulty, quizDocFile, quizDocMode, quizNumQ, quizSubject, quizTimeLimit, quizTopics]);

  useEffect(() => {
    if (!pendingAgentQuizRef.current) return;
    const pendingQuiz = pendingAgentQuizRef.current;
    pendingAgentQuizRef.current = null;
    void runQuizHub(pendingQuiz);
  }, [runQuizHub]);

  useEffect(() => {
    if (quizTimeLeft === null || quizComplete || quizLoading) return;
    if (quizTimeLeft <= 0) { setQuizComplete(true); return; }
    const t = setInterval(() => setQuizTimeLeft(p => (p !== null && p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [quizTimeLeft, quizComplete, quizLoading]);

  const handleQuizAnswer = (payload: { isCorrect: boolean; userAnswer: string; feedback?: string }) => {
    const q = quizQuestions[quizCurrentQ];
    if (!q || quizAnswers[quizCurrentQ]) return;
    const correct = q.options?.find(o => o.isCorrect)?.text || q.correctAnswer || "";
    setQuizAnswers(prev => {
      const next = [...prev];
      next[quizCurrentQ] = {
        id: q.id, type: q.type || "multiple_choice",
        question: q.question, options: q.options,
        userAnswer: payload.userAnswer, correctAnswer: correct,
        isCorrect: payload.isCorrect, feedback: payload.feedback,
      };
      return next;
    });
  };

  const handleQuizNext = () => {
    if (quizCurrentQ + 1 >= quizQuestions.length) {
      const score = quizAnswers.filter(a => a?.isCorrect).length;
      statsStore.addQuiz((score / quizQuestions.length) * 100);
      seenQuestionsRef.current = [
        ...seenQuestionsRef.current,
        ...quizQuestions.map(q => q.question),
      ].slice(-40);
      setQuizComplete(true);
    } else {
      setQuizCurrentQ(i => i + 1);
    }
  };

  const quizScore = quizAnswers.filter(a => a?.isCorrect).length;

  const addCardRow = () => setNewSetCards(prev => [...prev, { front: "", back: "" }]);
  const removeCardRow = (i: number) => setNewSetCards(prev => prev.filter((_, idx) => idx !== i));
  const updateCardRow = (i: number, field: "front" | "back", val: string) =>
    setNewSetCards(prev => { const n = [...prev]; n[i] = { ...n[i], [field]: val }; return n; });

  const saveSet = async () => {
    const valid = newSetCards.filter(c => c.front.trim() && c.back.trim());
    if (!newSetSubject || !newSetName.trim() || valid.length === 0) return;
    setSavingSet(true);
    const created = await flashcardStore.createSet(newSetSubject, newSetName.trim());
    if (created) {
      await flashcardStore.add(valid.map(c => ({ setId: created.id, subjectId: newSetSubject, front: c.front.trim(), back: c.back.trim() })));
      await refresh();
      setNewSetName("");
      setNewSetCards([{ front: "", back: "" }, { front: "", back: "" }, { front: "", back: "" }, { front: "", back: "" }, { front: "", back: "" }]);
      openSet(created.id);
    }
    setSavingSet(false);
  };

  const handleFileUpload = (file: File) => {
    setPendingFile(file);
    setPendingPasteText(null);
    const defaultSubject = userSubjects[0] || SUBJECT_CATALOG[0]?.id || "math";
    setPickerSubject(defaultSubject);
    setShowSubjectPicker(true);
  };

  const handlePasteGenerate = () => {
    if (!pasteText.trim()) return;
    setPendingPasteText(pasteText.trim());
    setPendingFile(null);
    const defaultSubject = userSubjects[0] || SUBJECT_CATALOG[0]?.id || "math";
    setPickerSubject(defaultSubject);
    setShowSubjectPicker(true);
  };

  const confirmGenerate = async () => {
    const subjectId = pickerSubject;
    setShowSubjectPicker(false);
    setUploadingFile(true);
    try {
      let content = "";
      let fileName = "Pasted text";
      if (pendingFile) {
        content = await extractFileText(pendingFile);
        fileName = pendingFile.name;
      } else if (pendingPasteText) {
        content = pendingPasteText;
      }
      if (!content) return;
      const result = await generateFlashcardsFromDocument({
        documentContent: content, fileName,
        subject: subjectLabel(subjectId), count: 20,
      });
      if (result.length > 0) {
        const setName = pendingFile ? pendingFile.name.replace(/\.[^/.]+$/, "") : "Pasted notes";
        const createdSet = await flashcardStore.createSet(subjectId, setName);
        if (createdSet) {
          await flashcardStore.add(result.map(f => ({ setId: createdSet.id, subjectId, front: f.front, back: f.back })));
          await refresh();
          openSet(createdSet.id);
        }
        setPasteText("");
        setPasteExpanded(false);
      }
    } catch (err) { console.error(err); }
    finally {
      setUploadingFile(false);
      setPendingFile(null);
      setPendingPasteText(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
  const deleteSet = async (setId: string, setName: string) => {
    if (!window.confirm(`Delete "${setName}" and all its cards? Can't be undone.`)) return;
    await flashcardStore.deleteSet(setId);
    await refresh();
  };

  const resetQuiz = () => {
    setQuizStarted(false);
    setQuizComplete(false);
    setQuizQuestions([]);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-40 border-b border-border/40 bg-background/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-3 flex items-center gap-3">
          {topView === "library" ? (
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Button>
          ) : topView === "subject-detail" ? (
            <Button variant="ghost" size="sm" onClick={() => setTopView("library")} className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> Library
            </Button>
          ) : topView === "set-detail" ? (
            <Button variant="ghost" size="sm"
              onClick={() => { setTopView("subject-detail"); setActiveSetId(null); }}
              className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> {activeSubjectId ? subjectLabel(activeSubjectId) : "Sets"}
            </Button>
          ) : topView === "create-set" ? (
            <Button variant="ghost" size="sm" onClick={() => setTopView(activeSubjectId ? "subject-detail" : "library")} className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setTopView("library")} className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> Library
            </Button>
          )}

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {topView === "quiz-hub"
                ? <Target className="w-3.5 h-3.5 text-primary" />
                : <BookOpen className="w-3.5 h-3.5 text-primary" />}
            </div>
            <h1 className="text-sm font-black truncate">
              {topView === "library" && "Flashcards & Quiz"}
              {topView === "create-set" && "Create a new set"}
              {topView === "quiz-hub" && "Quiz Hub"}
              {topView === "subject-detail" && (activeSubjectId ? subjectLabel(activeSubjectId) : "Sets")}
              {topView === "set-detail" && (activeSet ? activeSet.set.name : "Set")}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {topView === "library" && (
              <Button size="sm" onClick={() => setTopView("create-set")} className="gap-1.5">
                <Plus className="w-4 h-4" /> Create set
              </Button>
            )}
            {topView === "set-detail" && activeSet && (
              <Button size="sm" variant="outline"
                onClick={() => { setNewSetSubject(activeSet.set.subjectId); setTopView("create-set"); }}
                className="gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" /> Add cards
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">
          {topView === "library" && (
            <LibraryView
              totalCards={totalCards}
              setsCount={sets.length}
              duplicateCount={duplicateCount}
              loading={loading}
              userSubjects={userSubjects}
              librarySubjects={librarySubjects}
              setsBySubject={setsBySubject}
              subjectOptions={subjectOptions}
              uploadingFile={uploadingFile}
              isDragOver={isDragOver}
              pasteText={pasteText}
              pasteExpanded={pasteExpanded}
              showSubjectPicker={showSubjectPicker}
              pickerSubject={pickerSubject}
              pendingFile={pendingFile}
              pendingPasteText={pendingPasteText}
              fileInputRef={fileInputRef}
              onOpenSubject={openSubject}
              onCreateSet={() => setTopView("create-set")}
              onFileUpload={handleFileUpload}
              onPasteGenerate={handlePasteGenerate}
              onConfirmGenerate={confirmGenerate}
              onSetPasteText={setPasteText}
              onSetPasteExpanded={setPasteExpanded}
              onSetShowSubjectPicker={setShowSubjectPicker}
              onSetPickerSubject={setPickerSubject}
              onSetIsDragOver={setIsDragOver}
            />
          )}

          {topView === "subject-detail" && activeSubjectId && (
            <SubjectDetailView
              activeSubjectId={activeSubjectId}
              setsBySubject={setsBySubject}
              onOpenSet={openSet}
              onDeleteSet={deleteSet}
              onNewSet={(subjectId) => { setNewSetSubject(subjectId); setTopView("create-set"); }}
            />
          )}

          {topView === "create-set" && (
            <CreateSetView
              newSetName={newSetName}
              newSetSubject={newSetSubject}
              newSetCards={newSetCards}
              subjectOptions={subjectOptions}
              savingSet={savingSet}
              onSetNewSetName={setNewSetName}
              onSetNewSetSubject={setNewSetSubject}
              onUpdateCardRow={updateCardRow}
              onRemoveCardRow={removeCardRow}
              onAddCardRow={addCardRow}
              onSaveSet={saveSet}
              onCancel={() => setTopView(activeSubjectId ? "subject-detail" : "library")}
            />
          )}

          {topView === "quiz-hub" && (
            <QuizHubView
              quizSubject={quizSubject}
              quizTopics={quizTopics}
              quizNumQ={quizNumQ}
              quizDifficulty={quizDifficulty}
              quizTimeLimit={quizTimeLimit}
              subjectOptions={subjectOptions}
              quizStarted={quizStarted}
              quizLoading={quizLoading}
              quizQuestions={quizQuestions}
              quizComplete={quizComplete}
              quizCurrentQ={quizCurrentQ}
              quizAnswers={quizAnswers}
              quizTimeLeft={quizTimeLeft}
              quizScore={quizScore}
              onSetQuizSubject={setQuizSubject}
              onSetQuizTopics={setQuizTopics}
              onSetQuizNumQ={setQuizNumQ}
              onSetQuizDifficulty={setQuizDifficulty}
              onSetQuizTimeLimit={setQuizTimeLimit}
              onRunQuizHub={() => void runQuizHub()}
              onHandleQuizAnswer={handleQuizAnswer}
              onHandleQuizNext={handleQuizNext}
              onResetQuiz={resetQuiz}
              onBack={() => setTopView("library")}
            />
          )}

          {topView === "set-detail" && activeSet && (
            <SetDetailView
              activeSet={activeSet}
              activeSetTab={activeSetTab}
              reviewCards={reviewCards}
              reviewIndex={reviewIndex}
              reviewComplete={reviewComplete}
              flipped={flipped}
              learnCards={learnCards}
              learnIndex={learnIndex}
              learnComplete={learnComplete}
              learnFlipped={learnFlipped}
              learnAnswers={learnAnswers}
              learnReady={learnReady}
              editingId={editingId}
              editFront={editFront}
              editBack={editBack}
              onSetActiveSetTab={setActiveSetTab}
              onSetFlipped={setFlipped}
              onHandleRate={handleRate}
              onGoToPreviousReviewCard={goToPreviousReviewCard}
              onGoToNextReviewCard={goToNextReviewCard}
              onHandleLearnAnswer={handleLearnAnswer}
              onResetReview={resetReview}
              onResetLearn={() => {
                if (!activeSet) return;
                const shuffled = [...activeSet.cards].sort(() => Math.random() - 0.5);
                setLearnCards(shuffled);
                setLearnIndex(0); setLearnFlipped(false); setLearnComplete(false);
                setLearnAnswers(Array(shuffled.length).fill(null));
              }}
              onBeginEdit={beginEdit}
              onSaveEdit={saveEdit}
              onDeleteCard={deleteCard}
              onDeleteSet={deleteSet}
              onAddCards={(subjectId) => { setNewSetSubject(subjectId); setTopView("create-set"); }}
              onBack={() => { setTopView("subject-detail"); setActiveSetId(null); }}
              onSetEditingId={setEditingId}
              setEditFront={setEditFront}
              setEditBack={setEditBack}
            />
          )}
        </AnimatePresence>
      </div>

      {topView === "library" && (
        <MobileFAB label="Create set" onClick={() => setTopView("create-set")} />
      )}
      {topView === "subject-detail" && activeSubjectId && (
        <MobileFAB label="New set" onClick={() => { setNewSetSubject(activeSubjectId); setTopView("create-set"); }} />
      )}
    </div>
  );
}
