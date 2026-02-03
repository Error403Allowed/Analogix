import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Copy, FileText, Wand2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Mascot from "./Mascot";

interface QuizCreatorProps {
  onCreateQuiz: (content: string) => void;
  isLoading?: boolean;
}

const QuizCreator = ({ onCreateQuiz, isLoading }: QuizCreatorProps) => {
  const [content, setContent] = useState("");
  const [step, setStep] = useState<"input" | "processing" | "ready">("input");
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const userPrefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
  const hasPreferences = userPrefs.hobbies?.length > 0;

  const loadingMessages = [
    "Analyzing your content... 🔍",
    "Finding the perfect analogies... 🎯",
    hasPreferences ? `Connecting to your interests... ${userPrefs.hobbies?.[0] === 'gaming' ? '🎮' : '⚡'}` : "Brewing creative questions... ☕",
    "Adding a sprinkle of fun... ✨",
    "Almost there... 🚀",
  ];

  const handleSubmit = () => {
    if (!content.trim()) return;
    setStep("processing");
    onCreateQuiz(content);
  };

  useEffect(() => {
    if (step === "processing") {
      const interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [step, loadingMessages.length]);

  return (
    <motion.div
      className="glass-card p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <Mascot size="sm" mood={step === "processing" ? "thinking" : "happy"} />
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            Create a Quiz
            <Lightbulb className="w-5 h-5 text-warning" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Paste your study material and I'll create a quiz with <span className="text-primary font-medium">fun analogies</span>!
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Analogy hint box */}
            {hasPreferences && (
              <motion.div
                className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-sm text-foreground">
                  <span className="font-medium">✨ Personalized for you:</span>{" "}
                  Questions will include analogies based on your interests:{" "}
                  <span className="text-primary font-medium">
                    {userPrefs.hobbies?.slice(0, 3).join(", ")}
                  </span>
                </p>
              </motion.div>
            )}

            <Textarea
              placeholder="Paste your syllabus, notes, or study material here... 📚

Example:
- Chapter 5: Photosynthesis
- Key terms: chlorophyll, glucose, carbon dioxide
- Important dates for upcoming exam...

I'll transform this into an engaging quiz with analogies you'll love!"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[180px] mb-4 glass border-border focus:border-primary transition-colors resize-none"
            />

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.readText().then(setContent)}
                  className="gap-2 flex-1 sm:flex-none"
                >
                  <Copy className="w-4 h-4" />
                  Paste from clipboard
                </Button>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || isLoading}
                className="gap-2 gradient-primary text-primary-foreground border-0 hover:opacity-90"
              >
                <Wand2 className="w-4 h-4" />
                Generate Analogy Quiz
                <Sparkles className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-12"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-12 h-12 text-primary" />
            </motion.div>
            
            <motion.p
              key={loadingMessageIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-lg font-medium text-foreground mt-6"
            >
              {loadingMessages[loadingMessageIndex]}
            </motion.p>
            
            <p className="text-sm text-muted-foreground mt-2">
              This usually takes a few seconds...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default QuizCreator;
