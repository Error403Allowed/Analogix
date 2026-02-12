import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Copy, Wand2, Lightbulb, Clock, List, BookOpen, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { buildInterestList } from "@/utils/interests";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface QuizConfiguration {
  content: string;
  subject: string;
  numQuestions: number;
  timerDuration: number | null; // in seconds
}

interface QuizCreatorProps {
  onCreateQuiz: (config: QuizConfiguration) => void;
  isLoading?: boolean;
  hideContentInput?: boolean;
}

const SUBJECT_LABELS: Record<string, string> = {
  math: "Mathematics",
  biology: "Biology",
  history: "History",
  physics: "Physics",
  chemistry: "Chemistry",
  english: "English",
  computing: "Computing",
  economics: "Economics",
  business: "Business Studies",
  commerce: "Commerce",
  pdhpe: "PDHPE",
  geography: "Geography"
};

const FALLBACK_SUBJECTS = [
  "Mathematics",
  "Science",
  "History",
  "Geography",
  "Computer Science",
  "English",
  "Languages",
  "Art",
  "Music",
  "General Knowledge",
  "Other"
];

const QuizCreator = ({ onCreateQuiz, isLoading, hideContentInput = false }: QuizCreatorProps) => {
  const userPrefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
  const subjectOptions =
    Array.isArray(userPrefs.subjects) && userPrefs.subjects.length > 0
      ? userPrefs.subjects.map((id: string) => SUBJECT_LABELS[id] || id)
      : FALLBACK_SUBJECTS;

  const [content, setContent] = useState("");
  const [subject, setSubject] = useState<string>(subjectOptions[0]);
  const [numQuestions, setNumQuestions] = useState(5);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [step, setStep] = useState<"input" | "processing" | "ready">("input");
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const interestList = buildInterestList(userPrefs, []);
  const hasPreferences = interestList.length > 0;

  const loadingMessages = [
    "Analyzing your content...",
    "Finding the right analogies...",
    hasPreferences ? "Connecting to your interests..." : "Drafting thoughtful questions...",
    "Shaping the final set...",
    "Almost there...",
  ];
  const angleOptions = [
    "real-world applications",
    "conceptual reasoning",
    "graph interpretation",
    "step-by-step problem solving",
    "comparisons and contrasts"
  ];

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const updateMinutes = (next: number) => {
    const clamped = clamp(next, 1, 60);
    setTimerMinutes(clamped);
    if (clamped === 60) {
      setTimerSeconds(0);
    }
  };

  const updateSeconds = (next: number) => {
    if (timerMinutes === 60) {
      setTimerSeconds(0);
      return;
    }
    setTimerSeconds(clamp(next, 0, 59));
  };

  const handleSubmit = () => {
    let finalSubject = subject;
    let finalContent = content;

    if (!content.trim()) {
      if (hideContentInput) {
        // If input is hidden (Start Learning Session), generate a topic string based on subject/grade
        const angle = angleOptions[Math.floor(Math.random() * angleOptions.length)];
        const hobbies = interestList.slice(0, 3).join(", ");
        finalContent = `Create a ${finalSubject} quiz for Year ${userPrefs.grade || "7-12"}. Pick varied subtopics and lean toward ${angle}.${hobbies ? ` Use analogies tied to: ${hobbies}.` : ""}`;
      } else {
        return;
      }
    }

    setStep("processing");
    onCreateQuiz({
      content: finalContent,
      subject: finalSubject,
      numQuestions,
      timerDuration: timerEnabled ? (timerMinutes * 60 + timerSeconds) : null
    });
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
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            Create a Quiz
            <Lightbulb className="w-5 h-5 text-warning" />
          </h2>
          <p className="text-sm text-muted-foreground">
            {hideContentInput 
              ? "Select a subject and I'll generate a quiz for your grade level!" 
              : "Paste your study material and I'll create a quiz with fun analogies!"}
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
                    {interestList.slice(0, 10).join(", ")}
                  </span>.
                </p>
              </motion.div>
            )}

            <div className="space-y-4 mb-4">
              {/* Subject Selection */}
              <div className="bg-background/20 p-3 rounded-xl border border-white/10">
                <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 mb-2">
                  <BookOpen className="w-3 h-3" /> Subject
                </label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger className="bg-transparent border-white/20">
                    <SelectValue placeholder="Select a subject..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectOptions.map((sub) => (
                      <SelectItem key={sub} value={sub}>
                        {sub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!hideContentInput && (
                <Textarea
                  placeholder="Paste your syllabus, notes, topic, or study material here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[120px] glass border-border focus:border-primary transition-colors resize-none"
                />
              )}
            </div>

            {/* Customization Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
               {/* Question Count */}
               <div className="bg-background/20 p-3 rounded-xl border border-white/10">
                  <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 mb-3">
                    <List className="w-3 h-3" /> Question Count: <span className="text-primary">{numQuestions}</span>
                  </label>
                  <Slider 
                    value={[numQuestions]} 
                    onValueChange={(vals) => setNumQuestions(vals[0])} 
                    min={5} 
                    max={30} 
                    step={1}
                    className="py-2"
                  />
               </div>

               {/* Timer */}
               <div className="bg-background/20 p-3 rounded-xl border border-white/10">
                  <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 mb-2">
                    <Clock className="w-3 h-3" /> Quiz Timer
                  </label>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Enable timer</span>
                    <Switch checked={timerEnabled} onCheckedChange={setTimerEnabled} />
                  </div>
                  <div className={`grid grid-cols-2 gap-4 ${!timerEnabled ? "opacity-40 pointer-events-none" : ""}`}>
                    <div className="flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateMinutes(timerMinutes + 1)}
                        className="h-7 w-10 rounded-lg border border-border/50 hover:bg-muted/60"
                        aria-label="Increase minutes"
                      >
                        <ChevronUp className="w-4 h-4 mx-auto" />
                      </button>
                      <div className="w-full text-center py-2 rounded-lg bg-background/40 border border-white/10 font-mono text-lg">
                        {String(timerMinutes).padStart(2, "0")}
                      </div>
                      <button
                        type="button"
                        onClick={() => updateMinutes(timerMinutes - 1)}
                        className="h-7 w-10 rounded-lg border border-border/50 hover:bg-muted/60"
                        aria-label="Decrease minutes"
                      >
                        <ChevronDown className="w-4 h-4 mx-auto" />
                      </button>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Min</span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateSeconds(timerSeconds + 1)}
                        className="h-7 w-10 rounded-lg border border-border/50 hover:bg-muted/60"
                        aria-label="Increase seconds"
                      >
                        <ChevronUp className="w-4 h-4 mx-auto" />
                      </button>
                      <div className="w-full text-center py-2 rounded-lg bg-background/40 border border-white/10 font-mono text-lg">
                        {String(timerSeconds).padStart(2, "0")}
                      </div>
                      <button
                        type="button"
                        onClick={() => updateSeconds(timerSeconds - 1)}
                        className="h-7 w-10 rounded-lg border border-border/50 hover:bg-muted/60"
                        aria-label="Decrease seconds"
                      >
                        <ChevronDown className="w-4 h-4 mx-auto" />
                      </button>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Sec</span>
                    </div>
                  </div>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {!hideContentInput && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.readText().then(setContent)}
                    className="gap-2 flex-1 sm:flex-none"
                  >
                    <Copy className="w-4 h-4" />
                    Paste from clipboard
                  </Button>
                )}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={(!content.trim() && !hideContentInput) || !subject || isLoading}
                className="gap-2 gradient-primary text-primary-foreground border-0 hover:opacity-90"
              >
                <Wand2 className="w-4 h-4" />
                Generate Quiz
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
              Cooking up {numQuestions} questions for {subject}...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default QuizCreator;
