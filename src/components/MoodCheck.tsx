import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

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
      className="glass-card p-6"
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
          >
            <h3 className="text-lg font-bold text-foreground mb-2">
              How's your study vibe today? 🎯
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Let me know so I can personalize your experience!
            </p>

            <div className="flex flex-wrap gap-3">
              {moods.map((mood, index) => (
                <motion.button
                  key={mood.label}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl glass border border-border hover:border-primary/50 transition-colors"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelect(mood)}
                >
                  <span className="text-2xl">{mood.emoji}</span>
                  <span className="text-xs text-muted-foreground">{mood.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="message"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <motion.span
              className="text-5xl mb-4 block"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5 }}
            >
              {selectedMoodData?.emoji}
            </motion.span>
            <p className="text-lg font-medium text-foreground">
              {selectedMoodData?.message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MoodCheck;
