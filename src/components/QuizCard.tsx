import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import Confetti from "./Confetti";

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuizCardProps {
  question: string;
  options: QuizOption[];
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (isCorrect: boolean) => void;
  hint?: string;
}

const QuizCard = ({ 
  question, 
  options, 
  questionNumber, 
  totalQuestions, 
  onAnswer,
  hint 
}: QuizCardProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleSelect = (optionId: string) => {
    if (showResult) return;
    
    setSelectedOption(optionId);
    setShowResult(true);
    
    const isCorrect = options.find(o => o.id === optionId)?.isCorrect || false;
    
    if (isCorrect) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }
    
    setTimeout(() => {
      onAnswer(isCorrect);
      setSelectedOption(null);
      setShowResult(false);
      setShowHint(false);
    }, 2000);
  };

  const getOptionStyles = (option: QuizOption) => {
    if (!showResult) {
      return selectedOption === option.id
        ? "border-primary bg-primary/10"
        : "border-border hover:border-primary/50 hover:bg-primary/5";
    }
    
    if (option.isCorrect) {
      return "border-success bg-success/10";
    }
    
    if (selectedOption === option.id && !option.isCorrect) {
      return "border-destructive bg-destructive/10";
    }
    
    return "border-border opacity-50";
  };

  const getMessage = () => {
    if (!showResult) return null;
    
    const isCorrect = options.find(o => o.id === selectedOption)?.isCorrect;
    
    if (isCorrect) {
      const messages = [
        "Brilliant! You're on fire! 🔥",
        "Amazing work! High five! 🖐️",
        "Nailed it! You're a star! ⭐",
        "Perfect! Keep crushing it! 💪",
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    }
    
    const messages = [
      "Oops! Close but no cookie! 🍪",
      "Not quite, but you're learning! 📚",
      "Almost there! Try again next time! 🎯",
      "Good try! Mistakes help us grow! 🌱",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  return (
    <motion.div
      className="glass-card p-6 relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {showConfetti && <Confetti />}
      
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-medium text-muted-foreground">
          Question {questionNumber} of {totalQuestions}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <motion.div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < questionNumber ? "bg-primary" : "bg-muted"
              }`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05 }}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <motion.h2
        className="text-xl font-bold text-foreground mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {question}
      </motion.h2>

      {/* Hint button */}
      {hint && !showHint && !showResult && (
        <motion.button
          className="flex items-center gap-2 text-sm text-primary mb-4 hover:underline"
          onClick={() => setShowHint(true)}
          whileHover={{ x: 5 }}
        >
          <Lightbulb className="w-4 h-4" />
          Need a hint?
        </motion.button>
      )}

      {/* Hint */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20"
          >
            <p className="text-sm text-foreground">💡 {hint}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {options.map((option, index) => (
          <motion.button
            key={option.id}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${getOptionStyles(option)}`}
            onClick={() => handleSelect(option.id)}
            disabled={showResult}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={!showResult ? { scale: 1.02 } : {}}
            whileTap={!showResult ? { scale: 0.98 } : {}}
          >
            <div className="flex items-center justify-between">
              <span className="text-foreground font-medium">{option.text}</span>
              {showResult && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500 }}
                >
                  {option.isCorrect ? (
                    <Check className="w-5 h-5 text-success" />
                  ) : selectedOption === option.id ? (
                    <X className="w-5 h-5 text-destructive" />
                  ) : null}
                </motion.div>
              )}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Result message */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center py-3 rounded-xl bg-muted"
          >
            <p className="font-medium text-foreground">{getMessage()}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default QuizCard;
