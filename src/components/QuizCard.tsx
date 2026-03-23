import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import Confetti from "./Confetti";
import { Textarea } from "./ui/textarea";
import { Loader2, Send } from "lucide-react";
import { gradeShortAnswer } from "@/services/groq";
import MarkdownRenderer from "./MarkdownRenderer";
import type { QuizOption } from "@/types/quiz";

type QuizAnswerPayload = {
  isCorrect: boolean;
  userAnswer: string;
  feedback?: string;
};

interface QuizCardProps {
  type?: "multiple_choice" | "multiple_select" | "short_answer";
  question: string;
  options?: QuizOption[];
  correctAnswer?: string;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (payload: QuizAnswerPayload) => void;
  hint?: string;
  explanation?: string;
}

const QuizCard = ({
  type = "multiple_choice",
  question,
  options = [],
  correctAnswer,
  questionNumber,
  totalQuestions,
  onAnswer,
  hint,
  explanation
}: QuizCardProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [shortAnswer, setShortAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const safeOptions = Array.isArray(options) ? options : [];
  const isMultipleSelect = type === "multiple_select";

  const handleSelect = (optionId: string) => {
    if (showResult) return;

    if (isMultipleSelect) {
      // Multiple select - toggle selection
      setSelectedOptions(prev => 
        prev.includes(optionId) 
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      // Single choice
      setSelectedOption(optionId);
    }
  };

  const handleConfirmAnswer = () => {
    if (isMultipleSelect) {
      if (selectedOptions.length === 0) return;
      setShowResult(true);
      
      // Check if all correct answers are selected and no incorrect ones
      const correctIds = safeOptions.filter(o => o.isCorrect).map(o => o.id);
      const isCorrect = 
        selectedOptions.length === correctIds.length &&
        selectedOptions.every(id => correctIds.includes(id));
      
      if (isCorrect) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }
      
      const correctMessages = ["Brilliant work.", "Great job.", "Nailed it.", "Perfect. Keep going."];
      const incorrectMessages = ["Close. Keep going.", "Not quite, but you're learning.", "Almost there. Try again next time.", "Good try. Mistakes help us grow."];
      const pool = isCorrect ? correctMessages : incorrectMessages;
      setFeedbackMessage(pool[Math.floor(Math.random() * pool.length)]);
      
      onAnswer({
        isCorrect,
        userAnswer: selectedOptions.map(id => safeOptions.find(o => o.id === id)?.text).join(", "),
        feedback: explanation
      });
    } else if (selectedOption) {
      setShowResult(true);
      const selected = safeOptions.find(o => o.id === selectedOption);
      const isCorrect = selected?.isCorrect || false;

      if (isCorrect) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }

      const correctMessages = ["Brilliant work.", "Great job.", "Nailed it.", "Perfect. Keep going."];
      const incorrectMessages = ["Close. Keep going.", "Not quite, but you're learning.", "Almost there. Try again next time.", "Good try. Mistakes help us grow."];
      const pool = isCorrect ? correctMessages : incorrectMessages;
      setFeedbackMessage(pool[Math.floor(Math.random() * pool.length)]);

      onAnswer({
        isCorrect,
        userAnswer: selected?.text || "",
        feedback: explanation
      });
    }
  };

  const handleShortAnswerSubmit = async () => {
    if (!shortAnswer.trim() || isGrading || showResult) return;
    
    setIsGrading(true);
    const result = await gradeShortAnswer(question, correctAnswer || "", shortAnswer);
    
    setAiFeedback(result.feedback);
    setFeedbackMessage(result.feedback);
    setShowResult(true);
    setIsGrading(false);

    if (result.isCorrect) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }

    onAnswer({
      isCorrect: result.isCorrect,
      userAnswer: shortAnswer,
      feedback: result.feedback,
    });
  };

  const getOptionStyles = (option: QuizOption) => {
    if (!showResult) {
      return selectedOption === option.id
        ? "border-primary bg-primary/10"
        : "border-border hover:border-primary/50 hover:bg-primary/5";
    }
    
    if (!safeOptions.length) return "border-border";
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
      return aiFeedback || feedbackMessage;
    }
    return feedbackMessage;
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
        <MarkdownRenderer
          content={question}
          className="[&_.katex-display]:my-4 [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto"
        />
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
              <span aria-hidden="true">•</span>
              <MarkdownRenderer
                content={hint || ""}
                className="flex-1 [&>div]:mb-0 [&_.katex-display]:my-3 [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection Area */}
      {(type === "multiple_choice" || type === "multiple_select") && (
        <div className="space-y-3 mb-6">
          {safeOptions.map((option, index) => (
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
                <div className="flex items-center gap-3 flex-1">
                  {/* Checkbox for multiple_select, radio-style circle for multiple_choice */}
                  {isMultipleSelect ? (
                    <div className={`w-5 h-5 rounded flex items-center justify-center border-2 ${
                      selectedOptions.includes(option.id)
                        ? option.isCorrect && showResult
                          ? "border-success bg-success text-white"
                          : "border-primary bg-primary text-white"
                        : "border-border"
                    }`}>
                      {selectedOptions.includes(option.id) && (
                        <Check className="w-3.5 h-3.5" />
                      )}
                    </div>
                  ) : (
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedOption === option.id
                        ? option.isCorrect && showResult
                          ? "border-success bg-success text-white"
                          : "border-primary bg-primary"
                        : "border-border"
                    }`}>
                      {selectedOption === option.id && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                      )}
                    </div>
                  )}
                  <div className="text-foreground font-medium flex-1">
                    <MarkdownRenderer
                      content={option.text}
                      className="[&>div]:mb-0 [&_.katex-display]:my-3 [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto"
                    />
                  </div>
                </div>
                {showResult && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                    className="ml-2"
                  >
                    {option.isCorrect ? (
                      <Check className="w-5 h-5 text-success" />
                    ) : (isMultipleSelect ? selectedOptions.includes(option.id) : selectedOption === option.id) ? (
                      <X className="w-5 h-5 text-destructive" />
                    ) : null}
                  </motion.div>
                )}
              </div>
            </motion.button>
          ))}
          
          {/* Confirm button for multiple choice/select */}
          {!showResult && (
            <Button
              onClick={handleConfirmAnswer}
              disabled={isMultipleSelect ? selectedOptions.length === 0 : !selectedOption}
              className="w-full gradient-primary h-12 rounded-xl font-bold mt-4"
            >
              Confirm Answer
            </Button>
          )}
        </div>
      )}

      {/* Short Answer */}
      {type === "short_answer" && (
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
                Checking answer...
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
            <MarkdownRenderer
              content={getMessage() || ""}
              className="text-sm font-medium text-foreground [&>div]:mb-0 [&>div+div]:mt-2 [&_.katex-display]:my-3 [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default QuizCard;
