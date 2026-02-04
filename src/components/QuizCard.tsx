import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import Confetti from "./Confetti";
import { Textarea } from "./ui/textarea";
import { Loader2, Send } from "lucide-react";
import { gradeShortAnswer } from "@/services/groq";
import MarkdownRenderer from "./MarkdownRenderer";

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuizCardProps {
  type?: "multiple_choice" | "short_answer";
  question: string;
  options?: QuizOption[];
  correctAnswer?: string;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (isCorrect: boolean) => void;
  hint?: string;
}

const QuizCard = ({ 
  type = "multiple_choice",
  question, 
  options = [], 
  correctAnswer,
  questionNumber, 
  totalQuestions, 
  onAnswer,
  hint 
}: QuizCardProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [shortAnswer, setShortAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isCorrectSA, setIsCorrectSA] = useState(false);

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
    }, 1200);
  };

  const handleShortAnswerSubmit = async () => {
    if (!shortAnswer.trim() || isGrading) return;
    
    setIsGrading(true);
    const result = await gradeShortAnswer(question, correctAnswer || "", shortAnswer);
    
    setIsCorrectSA(result.isCorrect);
    setAiFeedback(result.feedback);
    setShowResult(true);
    setIsGrading(false);

    if (result.isCorrect) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }

    setTimeout(() => {
      onAnswer(result.isCorrect);
      setShortAnswer("");
      setShowResult(false);
      setAiFeedback(null);
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
    
    if (type === "short_answer") {
      return aiFeedback;
    }

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
      <motion.div
        className="text-xl font-bold text-foreground mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <MarkdownRenderer content={question} />
      </motion.div>

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
            <div className="text-sm text-foreground flex gap-2">
                <span>💡</span>
                <MarkdownRenderer content={hint} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection Area */}
      {type === "multiple_choice" ? (
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
              <div className="flex items-center justify-between w-full">
                <span className="text-foreground font-medium flex-1">
                  <MarkdownRenderer content={option.text} />
                </span>
                {showResult && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                    className="ml-2"
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
      ) : (
        <div className="space-y-4 mb-6">
          <Textarea 
            placeholder="Type your answer here..."
            value={shortAnswer}
            onChange={(e) => setShortAnswer(e.target.value)}
            disabled={showResult || isGrading}
            className="min-h-[120px] glass font-medium text-foreground p-4 rounded-xl border-2 border-border focus:border-primary"
          />
          <Button 
            onClick={handleShortAnswerSubmit} 
            disabled={!shortAnswer.trim() || showResult || isGrading}
            className="w-full gradient-primary h-12 rounded-xl font-bold"
          >
            {isGrading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                AI is marking...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Answer
              </>
            )}
          </Button>
        </div>
      )}

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
