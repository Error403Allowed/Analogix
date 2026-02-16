"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Home, RotateCcw, Share2, Trophy, Lightbulb, Loader2, Sparkles, Clock, Brain, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import QuizCard from "@/components/QuizCard";
import Confetti from "@/components/Confetti";
import { statsStore } from "@/utils/statsStore";
import { achievementStore } from "@/utils/achievementStore";
import { generateQuiz } from "@/services/huggingface";
import TypewriterText from "@/components/TypewriterText";
import { getStoredMoodId } from "@/utils/mood";

const Quiz = () => {
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showAnalogy, setShowAnalogy] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  /* New State Variables */
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [pendingConfig, setPendingConfig] = useState<{
    topic?: string;
    subject?: string;
    numQuestions?: number;
    timerDuration?: number | null;
  } | null>(null);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  const userPrefs =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("userPreferences") || "{}")
      : {};
  const topic = pendingConfig?.topic || userPrefs.subjects?.[0] || "general school topics";
  const subject = pendingConfig?.subject || userPrefs.subjects?.[0] || "General";
  const numQuestionsTarget = pendingConfig?.numQuestions || 5;
  const timerSetting = pendingConfig?.timerDuration ?? null;
  const HISTORY_KEY = "recentQuizQuestions";

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("pendingQuizConfig");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setPendingConfig(parsed);
        }
      }
      sessionStorage.removeItem("pendingQuizConfig");
    } catch {
      // no-op
    } finally {
      setIsConfigLoaded(true);
    }
  }, []);

  const normalizeQuestion = (text: string) =>
    text.toLowerCase().replace(/\s+/g, " ").trim();

  const getRecentQuestions = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const storeRecentQuestions = (questions: string[]) => {
    const trimmed = questions.slice(-80);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  };

  /* Timer Logic */
  useEffect(() => {
    if (timerSetting !== null && !isLoading && !isComplete) {
       setTimeLeft(timerSetting); // Already in seconds
    }
  }, [timerSetting, isLoading, isComplete]);

  useEffect(() => {
    if (timeLeft === null || isComplete || isLoading) return;
    
    if (timeLeft <= 0) {
      setIsComplete(true);
      statsStore.addQuiz((score / (questions.length || 1)) * 100);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isComplete, isLoading, score, questions.length]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!isConfigLoaded) return;

    const fetchQuiz = async () => {
      setIsLoading(true);
      const recent = getRecentQuestions();
      const avoidList = recent.slice(-20);
      const baseSeed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      let quizData = null;
      let stored = false;

      for (let attempt = 0; attempt < 3; attempt++) {
        quizData = await generateQuiz(
          topic,
          {
            grade: userPrefs.grade,
            hobbies: userPrefs.hobbies || [],
            subject: subject,
            mood: getStoredMoodId()
          },
          numQuestionsTarget,
          { diversitySeed: `${baseSeed}-${attempt}`, avoidQuestions: avoidList }
        );

        if (!quizData || !quizData.questions) continue;
        const normalized = quizData.questions.map((q: any) =>
          normalizeQuestion(q.question || "")
        );
        const hasBanned = quizData.questions.some((q: any) =>
          /2\s*x\s*\+\s*5\s*=\s*11/i.test(q.question || "")
        );
        if (hasBanned) {
          continue;
        }
        const hasOverlap = normalized.some((q: string) => recent.includes(q));
        if (!hasOverlap) {
          storeRecentQuestions([...recent, ...normalized]);
          stored = true;
          break;
        }
      }

      if (quizData && quizData.questions) {
        if (!stored) {
          const normalized = quizData.questions.map((q: any) =>
            normalizeQuestion(q.question || "")
          );
          storeRecentQuestions([...recent, ...normalized]);
        }
        console.log("Generated Quiz Data:", quizData);
        (window as any).generatedQuizData = quizData;
        setQuestions(quizData.questions);
      } else {
        // Fallback or error state
        setQuestions([]);
      }
      setIsLoading(false);
    };

    fetchQuiz();
  }, [isConfigLoaded, numQuestionsTarget, subject, topic]);

  const handleAnswer = (isCorrect: boolean) => {
    setAnswers([...answers, isCorrect]);
    if (isCorrect) setScore(score + 1);

    if (currentQuestion + 1 >= questions.length) {
      setTimeout(() => {
        setIsComplete(true);
        // Record stats
        statsStore.addQuiz((score + (isCorrect ? 1 : 0)) / questions.length * 100);
      }, 2000);
    } else {
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
        setShowAnalogy(true);
      }, 1200); // Reduced delay for speed
    }
  };

  const handleRestart = () => {
    window.location.reload(); // Quickest way to refetch AI quiz
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
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
            Quizzy is crafting a personalized {topic} quiz...
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
         <div className="flex flex-col items-center text-center gap-3">
           <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
             <AlertTriangle className="w-6 h-6" />
           </div>
           <p className="text-sm text-muted-foreground">
             Oops! I couldn't generate a quiz right now. Check your internet or API key.
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
  const encouragementMessage =
    currentQuestion === 0
      ? "Use the analogy hints to connect concepts."
      : answers[answers.length - 1]
      ? "The analogy clicked. Keep going."
      : "No worries. Try a different angle.";
  const EncouragementIcon =
    currentQuestion === 0
      ? Lightbulb
      : answers[answers.length - 1]
      ? Sparkles
      : AlertTriangle;

  return (
    <div className="min-h-screen pb-8 relative overflow-hidden">
      {/* Background blobs */}
      <div className="liquid-blob w-80 h-80 bg-primary/20 -top-40 -right-40 fixed" />
      <div className="liquid-blob w-64 h-64 bg-accent/20 bottom-20 -left-32 fixed" style={{ animationDelay: '-2s' }} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 relative z-10">
        {/* Header */}
        <motion.header
          className="glass-card px-6 py-4 mb-6"
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
            <div className="flex items-center gap-2 justify-self-center">
              <Lightbulb className="w-5 h-5 text-warning" />
              <h1 className="text-lg font-bold gradient-text">
                <TypewriterText text="Analogy Quiz" delay={120} />
              </h1>
            </div>
            <div className="flex items-center gap-4 justify-self-end">
              {/* Timer Display */}
              {timeLeft !== null && (
                <div className={`flex items-center gap-2 font-mono font-bold text-xl ${
                  timeLeft < 30 ? "text-destructive animate-pulse" : "text-primary"
                }`}>
                  <Clock className="w-5 h-5" />
                  {formatTime(timeLeft)}
                </div>
              )}
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
                      <p className="text-sm text-muted-foreground">
                        {questions[currentQuestion].analogy}
                      </p>
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
                {answers.map((isCorrect, index) => (
                  <motion.div
                    key={index}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      isCorrect
                        ? "bg-success/20 text-success"
                        : "bg-destructive/20 text-destructive"
                    }`}
                  >
                    {isCorrect ? "✓" : "✗"}
                  </motion.div>
                ))}
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
              <span className="text-sm text-muted-foreground">{encouragementMessage}</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Quiz;
