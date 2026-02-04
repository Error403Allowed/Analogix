import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Home, RotateCcw, Share2, Trophy, Lightbulb, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import QuizCard from "@/components/QuizCard";
import Mascot from "@/components/Mascot";
import Confetti from "@/components/Confetti";
import { statsStore } from "@/utils/statsStore";
import { achievementStore } from "@/utils/achievementStore";
import { generateQuiz } from "@/services/groq";

const Quiz = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showAnalogy, setShowAnalogy] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const userPrefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
  const topic = location.state?.topic || userPrefs.subjects?.[0] || "general school topics";

  useEffect(() => {
    const fetchQuiz = async () => {
      setIsLoading(true);
      const quizData = await generateQuiz(topic, {
        grade: userPrefs.grade,
        hobbies: userPrefs.hobbies || []
      });
      
      if (quizData && quizData.questions) {
        setQuestions(quizData.questions);
      } else {
        // Fallback or error state
        setQuestions([]);
      }
      setIsLoading(false);
    };

    fetchQuiz();
  }, [topic]);

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
      }, 2000);
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
        <Mascot size="lg" mood="thinking" message={`Quizzy is crafting a personalized ${topic} quiz just for you...`} />
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
         <Mascot size="lg" mood="thinking" message="Oops! I couldn't generate a quiz right now. Check your internet or API key!" />
         <Button onClick={() => navigate("/dashboard")} className="mt-6">Back to Dashboard</Button>
      </div>
    );
  }

  const getScoreMessage = () => {
    const percentage = (score / questions.length) * 100;
    if (percentage >= 80) return { emoji: "🎉", message: "Outstanding! Analogies made it click!" };
    if (percentage >= 60) return { emoji: "🌟", message: "Great job! Keep making connections!" };
    if (percentage >= 40) return { emoji: "💪", message: "Nice effort! Analogies help—let's try again!" };
    return { emoji: "📚", message: "Keep learning! Every analogy brings you closer!" };
  };

  const scoreData = getScoreMessage();

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
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-warning" />
              <h1 className="text-lg font-bold gradient-text">Analogy Quiz 🧠</h1>
            </div>
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
              
              <Mascot 
                size="lg" 
                mood={score >= 3 ? "celebrating" : "happy"} 
                message={scoreData.message}
              />

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="my-8"
              >
                <div className="text-6xl mb-4">{scoreData.emoji}</div>
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  Quiz Complete!
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
                <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2">
                  <Home className="w-4 h-4" />
                  Dashboard
                </Button>
                <Button variant="outline" className="gap-2">
                  <Share2 className="w-4 h-4" />
                  Share Score
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
                    <span className="font-bold">Achievement Unlocked: Analogy Master! 🏆</span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mascot Encouragement */}
        {!isComplete && (
          <motion.div
            className="mt-6 flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Mascot
              size="sm"
              mood={answers[answers.length - 1] === false ? "thinking" : "happy"}
              message={
                currentQuestion === 0
                  ? "Use the analogy hints to connect concepts! 🚀"
                  : answers[answers.length - 1]
                  ? "The analogy clicked! Keep going! ⭐"
                  : "No worries—try a different angle! 💪"
              }
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Quiz;
