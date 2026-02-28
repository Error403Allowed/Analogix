"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Home, RotateCcw, Trophy, Lightbulb, Loader2, Sparkles, Clock, Brain, AlertTriangle, ChevronRight, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import QuizCard from "@/components/QuizCard";
import Confetti from "@/components/Confetti";
import { statsStore } from "@/utils/statsStore";
import { achievementStore } from "@/utils/achievementStore";
import { generateQuiz, generateQuizReview } from "@/services/groq";
import TypewriterText from "@/components/TypewriterText";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { SUBJECT_CATALOG, SubjectId, getGradeBand } from "@/constants/subjects";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { QuizAnswerInput, QuizOption, QuizQuestion, QuizReview } from "@/types/quiz";

type QuizAnswerRecord = QuizAnswerInput & {
  options?: QuizOption[];
  feedback?: string;
};

const Quiz = () => {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showAnalogy, setShowAnalogy] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  const [answerRecords, setAnswerRecords] = useState<Array<QuizAnswerRecord | null>>([]);
  const [review, setReview] = useState<QuizReview | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);

  /* Quiz Configuration State */
  const [selectedSubject, setSelectedSubject] = useState<SubjectId>("math");
  const [numQuestions, setNumQuestions] = useState(5);
  const [timeLimit, setTimeLimit] = useState(5); // minutes
  const [difficulty, setDifficulty] = useState("intermediate");

  /* New State Variables */
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [pendingConfig, setPendingConfig] = useState<{
    topic?: string;
    subject?: string;
    numQuestions?: number;
    timerDuration?: number | null;
    difficulty?: string;
  } | null>(null);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  const userPrefs =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("userPreferences") || "{}")
      : {};
  
  const gradeBand = getGradeBand(userPrefs.grade);
  
  const difficultyOptions = {
    junior: [
      { id: "foundational", label: "Foundational", desc: "Core concepts & simple analogies" },
      { id: "intermediate", label: "Intermediate", desc: "Standard Year 7-8 level" },
      { id: "advanced", label: "Advanced", desc: "Challenge yourself" }
    ],
    middle: [
      { id: "foundational", label: "Revision", desc: "Refresh core concepts" },
      { id: "intermediate", label: "Standard", desc: "Year 9-10 curriculum level" },
      { id: "advanced", label: "Extended", desc: "Deep conceptual links" }
    ],
    senior: [
      { id: "foundational", label: "Standard", desc: "Year 11-12 basic concepts" },
      { id: "intermediate", label: "Advanced", desc: "Complex systems & analysis" },
      { id: "advanced", label: "Extension", desc: "Deep theoretical analogies" }
    ]
  }[gradeBand];

  const topic = pendingConfig?.topic || selectedSubject;
  const subjectLabel = SUBJECT_CATALOG.find(s => s.id === (pendingConfig?.subject || selectedSubject))?.label || "General";
  const numQuestionsTarget = pendingConfig?.numQuestions || numQuestions;
  const timerSetting = pendingConfig?.timerDuration ?? (timeLimit * 60);
  const quizDifficulty = pendingConfig?.difficulty || difficulty;
  const HISTORY_KEY = "recentQuizQuestions";
  const answeredRecords = useMemo(
    () => answerRecords.filter((record): record is QuizAnswerRecord => Boolean(record)),
    [answerRecords],
  );
  const score = useMemo(
    () => answeredRecords.reduce((sum, record) => sum + (record.isCorrect ? 1 : 0), 0),
    [answeredRecords],
  );
  const currentAnswer = answerRecords[currentQuestion] || null;

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("pendingQuizConfig");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setPendingConfig(parsed);
          setShowConfig(false); // Skip config if already provided (e.g. from Dashboard)
        }
      }
      sessionStorage.removeItem("pendingQuizConfig");
    } catch {
      // no-op
    } finally {
      setIsConfigLoaded(true);
    }
  }, []);

  const startQuiz = () => {
    setShowConfig(false);
    fetchQuiz();
  };

  const normalizeQuestion = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const getRecentQuestions = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const storeRecentQuestions = (questions: string[]) => {
    const trimmed = questions.slice(-200);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  };

  const fetchQuiz = async () => {
    setIsLoading(true);
    const recent = getRecentQuestions();
    const avoidList = recent.slice(-50);
    const baseSeed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const seenThisRun = new Set(recent);
    const collected: QuizQuestion[] = [];
    const normalizedCollected: string[] = [];

    const maxAttempts = 6;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const quizData = await generateQuiz(
        topic,
        {
          grade: userPrefs.grade,
          state: userPrefs.state,
          hobbies: userPrefs.hobbies || [],
          subject: pendingConfig?.subject || selectedSubject,
          difficulty: quizDifficulty
        },
        numQuestionsTarget,
        {
          diversitySeed: `${baseSeed}-${attempt}`,
          avoidQuestions: Array.from(seenThisRun).slice(-60),
        }
      );

      if (!quizData || !quizData.questions) continue;

      for (const question of quizData.questions as QuizQuestion[]) {
        const raw = question.question || "";
        if (/2\s*x\s*\+\s*5\s*=\s*11/i.test(raw)) continue;
        const normalized = normalizeQuestion(raw);
        if (!normalized) continue;
        if (seenThisRun.has(normalized)) continue;

        collected.push(question);
        normalizedCollected.push(normalized);
        seenThisRun.add(normalized);

        if (collected.length >= numQuestionsTarget) break;
      }

      if (collected.length >= numQuestionsTarget) break;
    }

    if (collected.length >= numQuestionsTarget) {
      storeRecentQuestions([...recent, ...normalizedCollected]);
      const nextQuestions = collected.slice(0, numQuestionsTarget);
      setQuestions(nextQuestions);
      setAnswerRecords(Array(nextQuestions.length).fill(null));
      setCurrentQuestion(0);
      setIsComplete(false);
      setReview(null);
      setReviewError(null);
      setIsReviewLoading(false);
      setShowAnalogy(true);
    } else {
      setQuestions([]);
      setAnswerRecords([]);
    }
    setIsLoading(false);
  };

  /* Timer Logic */
  useEffect(() => {
    if (timerSetting !== null && !isLoading && !isComplete && !showConfig) {
      setTimeLeft(timerSetting);
    }
  }, [timerSetting, isLoading, isComplete, showConfig]);

  useEffect(() => {
    if (timeLeft === null || isComplete || isLoading || showConfig) return;

    if (timeLeft <= 0) {
      setIsComplete(true);
      statsStore.addQuiz((score / (questions.length || 1)) * 100);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isComplete, isLoading, score, questions.length, showConfig]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCorrectAnswerText = (question: QuizQuestion) => {
    const type = question.type || "multiple_choice";
    if (type === "short_answer") return question.correctAnswer || "";
    return question.options?.find((option) => option.isCorrect)?.text || "";
  };

  useEffect(() => {
    if (!isConfigLoaded) return;
    if (pendingConfig) {
      fetchQuiz();
    }
  }, [isConfigLoaded]);

  useEffect(() => {
    if (!isComplete) return;
    if (isReviewLoading || review || reviewError) return;
    if (answeredRecords.length === 0) return;

    const answersForReview: QuizAnswerInput[] = answeredRecords.map((record) => ({
      id: record.id,
      type: record.type,
      question: record.question,
      correctAnswer: record.correctAnswer,
      userAnswer: record.userAnswer,
      isCorrect: record.isCorrect,
    }));

    setIsReviewLoading(true);
    generateQuizReview({
      grade: userPrefs.grade,
      subject: pendingConfig?.subject || selectedSubject,
      difficulty: quizDifficulty,
      answers: answersForReview,
    })
      .then((data) => {
        if (data) setReview(data);
        else setReviewError("Couldn't generate AI feedback right now.");
      })
      .catch(() => setReviewError("Couldn't generate AI feedback right now."))
      .finally(() => setIsReviewLoading(false));
  }, [
    isComplete,
    isReviewLoading,
    review,
    reviewError,
    answeredRecords,
    userPrefs.grade,
    pendingConfig?.subject,
    selectedSubject,
    quizDifficulty,
  ]);


  const handleAnswer = (payload: { isCorrect: boolean; userAnswer: string; feedback?: string }) => {
    const question = questions[currentQuestion];
    if (!question) return;

    setAnswerRecords((prev) => {
      if (prev[currentQuestion]) return prev;
      const next = [...prev];
      const type = question.type || "multiple_choice";
      const correctAnswer = getCorrectAnswerText(question);

      next[currentQuestion] = {
        id: question.id,
        type,
        question: question.question,
        options: question.options,
        userAnswer: payload.userAnswer,
        correctAnswer,
        isCorrect: payload.isCorrect,
        feedback: payload.feedback,
      };
      return next;
    });
  };

  const handleNext = () => {
    if (!currentAnswer) return;

    if (currentQuestion + 1 >= questions.length) {
      if (!isComplete) {
        setIsComplete(true);
        statsStore.addQuiz((score / (questions.length || 1)) * 100);
      }
      return;
    }

    setCurrentQuestion(currentQuestion + 1);
    setShowAnalogy(true);
  };

  const handleRestart = () => {
    window.location.reload(); // Quickest way to refetch AI quiz
  };

  if (showConfig && !isLoading) {
    return (
      <div className="min-h-full pb-4 relative overflow-hidden bg-background">
        <div className="liquid-blob w-80 h-80 bg-primary/20 -top-40 -right-40 fixed" />
        <div className="liquid-blob w-64 h-64 bg-accent/20 bottom-20 -left-32 fixed" />

        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 md:p-12"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
                <Settings2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-foreground tracking-tight">Configure Quiz</h1>
                <p className="text-muted-foreground">Tuned for Year {userPrefs.grade || "7"}</p>
              </div>
            </div>

            <div className="space-y-8">
              {/* Subject Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Subject</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SUBJECT_CATALOG.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSubject(s.id)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all",
                        selectedSubject === s.id
                          ? "border-primary bg-primary/10 shadow-md text-primary"
                          : "border-border/70 bg-card/80 text-foreground/85 hover:border-primary/50 hover:text-foreground"
                      )}
                    >
                      <s.icon className="w-4 h-4" />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount of Questions */}
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Amount</Label>
                  <span className="text-sm font-bold text-primary">{numQuestions} Questions</span>
                </div>
                <Slider
                  value={[numQuestions]}
                  onValueChange={([val]) => setNumQuestions(val)}
                  min={3}
                  max={20}
                  step={1}
                  className="py-4"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-8">
                {/* Time Limit */}
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Time Limit</Label>
                    <span className="text-sm font-bold text-primary">{timeLimit}m</span>
                  </div>
                  <Slider
                    value={[timeLimit]}
                    onValueChange={([val]) => setTimeLimit(val)}
                    min={1}
                    max={30}
                    step={1}
                    className="py-4"
                  />
                </div>

                {/* Difficulty */}
                <div className="space-y-3">
                  <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Difficulty</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger className="rounded-xl border-border/70 bg-card/80 h-12">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyOptions?.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          <div className="flex flex-col text-left">
                            <span className="font-bold">{opt.label}</span>
                            <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                size="lg"
                onClick={startQuiz}
                className="w-full h-16 rounded-[2rem] gradient-primary text-white font-black text-lg uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-transform gap-3"
              >
                Start Quiz
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
          
          <div className="mt-8 flex justify-center">
            <Button variant="ghost" onClick={() => router.push("/dashboard")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center bg-background p-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="mb-6"
        >
          <Loader2 className="w-16 h-16 text-primary" />
        </motion.div>
        <div className="mt-6 flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Brain className="w-7 h-7" />
          </div>
          <p className="text-sm text-muted-foreground">
            Making quiz for {subjectLabel}...
          </p>
        </div>
        <div className="mt-8 flex items-center gap-2 text-primary font-bold animate-pulse">
            <Sparkles className="w-5 h-5" />
            Generating Analogies...
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-4">
         <div className="flex flex-col items-center text-center gap-3">
           <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
             <AlertTriangle className="w-6 h-6" />
           </div>
           <p className="text-sm text-foreground/75">
             Oops! I couldn't generate a quiz right now. Try again later or check your internet .
           </p>
         </div>
         <Button onClick={() => router.push("/dashboard")} className="mt-6">Back to Dashboard</Button>
      </div>
    );
  }

  const getScoreMessage = () => {
    const percentage = (score / questions.length) * 100;
    if (percentage >= 80) return { emoji: "", message: "Outstanding. The analogies landed." };
    if (percentage >= 60) return { emoji: "", message: "Great work. Keep making connections." };
    if (percentage >= 40) return { emoji: "", message: "Good effort. Try another angle." };
    return { emoji: "", message: "Keep learning. Each pass builds clarity." };
  };

  const scoreData = getScoreMessage();
  const lastAnswer = answeredRecords[answeredRecords.length - 1];
  const encouragementMessage =
    answeredRecords.length === 0
      ? "Use the analogy hints to connect concepts."
      : lastAnswer?.isCorrect
      ? "Nice job, keep going!"
      : "No worries. Try a different angle.";
  const EncouragementIcon =
    answeredRecords.length === 0
      ? Lightbulb
      : lastAnswer?.isCorrect
      ? Sparkles
      : AlertTriangle;

  return (
    <div className="min-h-full pb-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="liquid-blob w-80 h-80 bg-primary/20 -top-40 -right-40 fixed" />
      <div className="liquid-blob w-64 h-64 bg-accent/20 bottom-20 -left-32 fixed" style={{ animationDelay: '-2s' }} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 relative z-10">
        {/* Header */}
        <motion.header
          className="glass-card px-5 py-3 mb-5"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center">
            <div className="justify-self-start">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </div>
            <div className="flex items-center justify-self-center">
              {timeLeft !== null ? (
                <div className={`flex items-center gap-2 font-mono font-bold text-xl ${
                  timeLeft < 30 ? "text-destructive animate-pulse" : "text-primary"
                }`}>
                  <Clock className="w-5 h-5" />
                  {formatTime(timeLeft)}
                </div>
              ) : (
                <span className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground/70">
                  Untimed
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 justify-self-end">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Score:</span>
                <motion.span
                  key={score}
                  initial={{ scale: 1.5 }}
                  animate={{ scale: 1 }}
                  className="font-bold text-primary"
                >
                  {score}/{questions.length}
                </motion.span>
              </div>
            </div>
          </div>
        </motion.header>

        <AnimatePresence mode="wait">
          {!isComplete ? (
            <motion.div
              key={`question-${currentQuestion}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
            >
              {/* Analogy hint */}
              {showAnalogy && (
                <motion.div
                  className="glass-card p-4 mb-4 border-l-4 border-warning"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Analogy Hint</p>
                      <div className="text-sm text-foreground/80">
                        <MarkdownRenderer content={questions[currentQuestion].analogy || ""} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              <QuizCard
                type={questions[currentQuestion].type}
                question={questions[currentQuestion].question}
                options={questions[currentQuestion].options}
                correctAnswer={questions[currentQuestion].correctAnswer}
                questionNumber={currentQuestion + 1}
                totalQuestions={questions.length}
                onAnswer={handleAnswer}
                hint={questions[currentQuestion].hint}
              />
              {currentAnswer && (
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleNext} className="gap-2">
                    {currentQuestion + 1 >= questions.length ? "Finish Quiz" : "Next Question"}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 text-center relative overflow-hidden"
            >
              <Confetti />
              
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles className="w-7 h-7" />
                </div>
                <p className="text-sm text-muted-foreground">{scoreData.message}</p>
              </div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="my-8"
              >
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  <TypewriterText text="Quiz Complete!" delay={120} />
                </h2>
                <p className="text-muted-foreground">
                  You scored{" "}
                  <span className="font-bold text-primary text-2xl">
                    {score}/{questions.length}
                  </span>
                </p>
              </motion.div>

              {/* Answer Summary */}
              <div className="flex justify-center gap-2 mb-8">
                {answerRecords.map((record, index) => {
                  const isCorrect = record?.isCorrect;
                  const bubbleClass = record
                    ? isCorrect
                      ? "bg-success/20 text-success"
                      : "bg-destructive/20 text-destructive"
                    : "bg-muted text-muted-foreground";
                  return (
                  <motion.div
                    key={index}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${bubbleClass}`}
                  >
                    {record ? (isCorrect ? "✓" : "✗") : "–"}
                  </motion.div>
                );
                })}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={handleRestart} className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => router.push("/dashboard")} className="gap-2">
                  <Home className="w-4 h-4" />
                  Dashboard
                </Button>
              </div>

              {(isReviewLoading || review || reviewError) && (
                <div className="mt-8 text-left space-y-4">
                  <div className="glass-card p-6">
                    <div className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">
                      AI Review
                    </div>
                    {isReviewLoading && (
                      <div className="flex items-center gap-2 text-primary font-semibold">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating feedback...
                      </div>
                    )}
                    {reviewError && (
                      <p className="text-sm text-destructive">{reviewError}</p>
                    )}
                    {review && (
                      <p className="text-sm text-foreground/80">{review.summary}</p>
                    )}
                  </div>

                  {questions.map((question, index) => {
                    const record = answerRecords[index];
                    const reviewItem = review?.questions?.find(
                      (item) => String(item.id) === String(question.id),
                    );
                    const correctAnswer = getCorrectAnswerText(question);
                    return (
                      <div key={question.id} className="glass-card p-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
                            Question {index + 1}
                          </span>
                          <span
                            className={`text-xs font-bold ${
                              record
                                ? record.isCorrect
                                  ? "text-success"
                                  : "text-destructive"
                                : "text-muted-foreground"
                            }`}
                          >
                            {record ? (record.isCorrect ? "Correct" : "Needs Review") : "Unanswered"}
                          </span>
                        </div>

                        <div className="text-sm font-semibold text-foreground mb-3">
                          <MarkdownRenderer content={question.question} />
                        </div>

                        <div className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                          Your Answer
                        </div>
                        <div className="text-sm text-foreground mb-3">
                          {record ? (
                            <MarkdownRenderer content={record.userAnswer} />
                          ) : (
                            "No answer submitted."
                          )}
                        </div>

                        <div className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                          Correct Answer
                        </div>
                        <div className="text-sm text-foreground mb-3">
                          {correctAnswer ? (
                            <MarkdownRenderer content={correctAnswer} />
                          ) : (
                            "Not available."
                          )}
                        </div>

                        {reviewItem?.feedback && (
                          <div className="text-sm text-foreground/80">
                            <span className="font-semibold text-foreground">Feedback:</span>{" "}
                            {reviewItem.feedback}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Achievement Unlocked */}
              {score >= 4 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  onAnimationComplete={() => achievementStore.unlock("quiz_1")} // Auto-unlock first step
                  className="mt-8 p-4 rounded-2xl gradient-accent text-accent-foreground"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Trophy className="w-5 h-5" />
                    <span className="font-bold">Achievement Unlocked: Analogy Master</span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Encouragement */}
        {!isComplete && (
          <motion.div
            className="mt-6 flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="glass-card px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <EncouragementIcon className="w-4 h-4" />
              </div>
              <span className="text-sm text-foreground/80">{encouragementMessage}</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Quiz;
