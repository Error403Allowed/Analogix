import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MoodCheckProps {
  onMoodSelect: (mood: string) => void;
}

const moods = [
  { emoji: "😊", label: "Great", message: "Awesome! Let's make the most of it!" },
  { emoji: "😌", label: "Good", message: "Nice! Ready to learn something new?" },
  { emoji: "😐", label: "Okay", message: "We've got this! Small steps matter!" },
  { emoji: "😔", label: "Tired", message: "Take it easy—I'll keep it light today!" },
  { emoji: "😤", label: "Stressed", message: "Let's start slow and build momentum!" },
];

const MoodCheck = ({ onMoodSelect }: MoodCheckProps) => {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showMessage, setShowMessage] = useState(false);

  const handleSelect = (mood: typeof moods[0]) => {
    setSelectedMood(mood.label);
    setShowMessage(true);
    setTimeout(() => {
      onMoodSelect(mood.label);
    }, 2000);
  };

  const selectedMoodData = moods.find(m => m.label === selectedMood);

  return (
    <motion.div
      className="glass-card p-4 sm:p-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <AnimatePresence mode="wait">
        {!showMessage ? (
          <motion.div
            key="selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col sm:flex-row sm:items-center gap-4"
          >
            <div className="flex-shrink-0">
              <h3 className="text-base font-bold text-foreground">
                How's your study vibe today? 🎯
              </h3>
              <p className="text-xs text-muted-foreground">
                Let me personalize your experience!
              </p>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3 sm:ml-auto">
              {moods.map((mood, index) => (
                <motion.button
                  key={mood.label}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl glass border border-border hover:border-primary/50 transition-colors"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelect(mood)}
                >
                  <span className="text-xl">{mood.emoji}</span>
                  <span className="text-xs font-medium text-muted-foreground hidden sm:inline">{mood.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="message"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-3 py-2"
          >
            <motion.span
              className="text-3xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5 }}
            >
              {selectedMoodData?.emoji}
            </motion.span>
            <p className="text-base font-medium text-foreground">
              {selectedMoodData?.message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MoodCheck;
