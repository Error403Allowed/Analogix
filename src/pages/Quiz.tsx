import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Home, RotateCcw, Share2, Trophy, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import QuizCard from "@/components/QuizCard";
import Mascot from "@/components/Mascot";
import Confetti from "@/components/Confetti";

// Analogy-themed questions
const getAnalogyQuestions = () => {
  const userPrefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
  const hobbies = userPrefs.hobbies || ["gaming"];
  const isGamer = hobbies.includes("gaming");
  const isSports = hobbies.includes("sports");
  const isMusic = hobbies.includes("music");

  return [
    {
      id: 1,
      question: isGamer 
        ? "If photosynthesis were a video game mechanic, what would it do? 🎮" 
        : isSports 
        ? "If photosynthesis were a sports play, what would it be? ⚽"
        : "If photosynthesis were a superhero power, what would it do? 🦸‍♂️",
      analogy: isGamer
        ? "Think of it like collecting sunlight as 'mana' to craft glucose 'potions'!"
        : isSports
        ? "It's like a perfect assist—sunlight passes energy to create the winning goal (glucose)!"
        : "Plants absorb sunlight energy like a superhero absorbing power!",
      options: [
        { id: "a", text: "Convert sunlight into energy (glucose)", isCorrect: true },
        { id: "b", text: "Release carbon dioxide", isCorrect: false },
        { id: "c", text: "Consume oxygen for respiration", isCorrect: false },
        { id: "d", text: "Break down food for energy", isCorrect: false },
      ],
      hint: "Think about what plants need from the sky to make their food!",
    },
    {
      id: 2,
      question: isGamer
        ? "In the 'cell city' game, which organelle is the power generator? 💪"
        : isMusic
        ? "If a cell were a band, which organelle would be the drummer keeping energy going? 🥁"
        : "What's the powerhouse of the cell? 💪",
      analogy: isGamer
        ? "Like a power plant in a city-builder game, it converts resources into usable energy!"
        : isMusic
        ? "Just like a drummer powers the rhythm, this organelle powers the whole cell!"
        : "It's the factory that produces ATP—the cell's energy currency!",
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
      question: "Which planet would be the 'fire level' in a space exploration game? 🔴",
      analogy: "Its rusty, red surface looks like a desert wasteland—perfect for a Mars rover adventure!",
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
      question: isGamer
        ? "If you had 12 inventory slots and filled each with 12 items, how many total items? 🎒"
        : "What's 12 × 12? 🧮",
      analogy: "Think of it as stacking—12 rows of 12 items each creates a perfect square!",
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
      question: "Which Renaissance artist was basically the original 'multi-class' character? 🎨",
      analogy: "He painted AND invented things AND studied anatomy—the ultimate skill tree!",
      options: [
        { id: "a", text: "Vincent van Gogh", isCorrect: false },
        { id: "b", text: "Pablo Picasso", isCorrect: false },
        { id: "c", text: "Leonardo da Vinci", isCorrect: true },
        { id: "d", text: "Michelangelo", isCorrect: false },
      ],
      hint: "This genius painted the Mona Lisa and designed flying machines!",
    },
  ];
};

const Quiz = () => {
  const navigate = useNavigate();
  const [questions] = useState(getAnalogyQuestions);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showAnalogy, setShowAnalogy] = useState(true);

  const handleAnswer = (isCorrect: boolean) => {
    setAnswers([...answers, isCorrect]);
    if (isCorrect) setScore(score + 1);

    if (currentQuestion + 1 >= questions.length) {
      setTimeout(() => setIsComplete(true), 2000);
    } else {
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
        setShowAnalogy(true);
      }, 2000);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setScore(0);
    setIsComplete(false);
    setAnswers([]);
    setShowAnalogy(true);
  };

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
                question={questions[currentQuestion].question}
                options={questions[currentQuestion].options}
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
