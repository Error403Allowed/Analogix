import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Home, RotateCcw, Share2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import QuizCard from "@/components/QuizCard";
import Mascot from "@/components/Mascot";
import Confetti from "@/components/Confetti";

const sampleQuestions = [
  {
    id: 1,
    question: "If photosynthesis were a superhero, which power would it use to create glucose? 🦸‍♂️",
    options: [
      { id: "a", text: "Absorbing sunlight energy", isCorrect: true },
      { id: "b", text: "Releasing carbon dioxide", isCorrect: false },
      { id: "c", text: "Consuming oxygen", isCorrect: false },
      { id: "d", text: "Breaking down glucose", isCorrect: false },
    ],
    hint: "Think about what plants need from the sky to make their food!",
  },
  {
    id: 2,
    question: "What's the powerhouse of the cell? 💪",
    options: [
      { id: "a", text: "Nucleus", isCorrect: false },
      { id: "b", text: "Mitochondria", isCorrect: true },
      { id: "c", text: "Ribosome", isCorrect: false },
      { id: "d", text: "Cell membrane", isCorrect: false },
    ],
    hint: "This organelle is famous for producing ATP—the cell's energy currency!",
  },
  {
    id: 3,
    question: "Which planet is known as the Red Planet? 🔴",
    options: [
      { id: "a", text: "Venus", isCorrect: false },
      { id: "b", text: "Jupiter", isCorrect: false },
      { id: "c", text: "Mars", isCorrect: true },
      { id: "d", text: "Saturn", isCorrect: false },
    ],
    hint: "It shares its name with a Roman god of war!",
  },
  {
    id: 4,
    question: "What's 12 × 12? 🧮",
    options: [
      { id: "a", text: "124", isCorrect: false },
      { id: "b", text: "144", isCorrect: true },
      { id: "c", text: "132", isCorrect: false },
      { id: "d", text: "156", isCorrect: false },
    ],
    hint: "Think of a dozen dozens!",
  },
  {
    id: 5,
    question: "Who painted the Mona Lisa? 🎨",
    options: [
      { id: "a", text: "Vincent van Gogh", isCorrect: false },
      { id: "b", text: "Pablo Picasso", isCorrect: false },
      { id: "c", text: "Leonardo da Vinci", isCorrect: true },
      { id: "d", text: "Michelangelo", isCorrect: false },
    ],
    hint: "This Renaissance genius was also an inventor and scientist!",
  },
];

const Quiz = () => {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [answers, setAnswers] = useState<boolean[]>([]);

  const handleAnswer = (isCorrect: boolean) => {
    setAnswers([...answers, isCorrect]);
    if (isCorrect) setScore(score + 1);

    if (currentQuestion + 1 >= sampleQuestions.length) {
      setTimeout(() => setIsComplete(true), 2000);
    } else {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 2000);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setScore(0);
    setIsComplete(false);
    setAnswers([]);
  };

  const getScoreMessage = () => {
    const percentage = (score / sampleQuestions.length) * 100;
    if (percentage >= 80) return { emoji: "🎉", message: "Outstanding! You're a superstar!" };
    if (percentage >= 60) return { emoji: "🌟", message: "Great job! Keep up the good work!" };
    if (percentage >= 40) return { emoji: "💪", message: "Nice effort! Practice makes perfect!" };
    return { emoji: "📚", message: "Keep learning! You'll get there!" };
  };

  const scoreData = getScoreMessage();

  return (
    <div className="min-h-screen pb-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
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
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <h1 className="text-lg font-bold gradient-text">Quick Quiz 🧠</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Score:</span>
              <motion.span
                key={score}
                initial={{ scale: 1.5 }}
                animate={{ scale: 1 }}
                className="font-bold text-primary"
              >
                {score}/{sampleQuestions.length}
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
              <QuizCard
                question={sampleQuestions[currentQuestion].question}
                options={sampleQuestions[currentQuestion].options}
                questionNumber={currentQuestion + 1}
                totalQuestions={sampleQuestions.length}
                onAnswer={handleAnswer}
                hint={sampleQuestions[currentQuestion].hint}
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
                    {score}/{sampleQuestions.length}
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
                <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
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
                  className="mt-8 p-4 rounded-2xl gradient-accent text-accent-foreground"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Trophy className="w-5 h-5" />
                    <span className="font-bold">Achievement Unlocked: Quiz Champion! 🏆</span>
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
                  ? "You've got this! Let's go! 🚀"
                  : answers[answers.length - 1]
                  ? "Amazing! Keep it up! ⭐"
                  : "No worries, next one's yours! 💪"
              }
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Quiz;
