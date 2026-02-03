import { motion } from "framer-motion";

interface MascotProps {
  mood?: "happy" | "excited" | "thinking" | "celebrating" | "brain" | "study";
  message?: string;
  size?: "sm" | "md" | "lg";
}

const Mascot = ({ mood = "happy", message, size = "md" }: MascotProps) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-20 h-20",
    lg: "w-32 h-32",
  };

  const getMoodEmoji = () => {
    switch (mood) {
      case "excited":
        return "🎉";
      case "thinking":
        return "🤔";
      case "celebrating":
        return "🥳";
      case "brain":
        return "🧠";
      case "study":
        return "🎓";
      default:
        return "😊";
    }
  };

  const getAnimation = () => {
    switch (mood) {
      case "excited":
      case "celebrating":
        return {
          animate: { rotate: [-5, 5, -5], scale: [1, 1.1, 1] },
          transition: { duration: 0.5, repeat: Infinity } as const,
        };
      case "thinking":
      case "study":
        return {
          animate: { y: [0, -5, 0], rotate: mood === "study" ? [-2, 2, -2] : 0 },
          transition: { duration: 2, repeat: Infinity } as const,
        };
      default:
        return {
          animate: { y: [0, -8, 0] },
          transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const },
        };
    }
  };

  const animation = getAnimation();

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        className={`${sizeClasses[size]} relative`}
        animate={animation.animate}
        transition={animation.transition}
      >
        {/* Mascot Body - Cute Owl */}
        <div className="relative w-full h-full">
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
          
          {/* Main body */}
          <motion.div 
            className="relative w-full h-full rounded-full gradient-primary flex items-center justify-center shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Face */}
            <div className="text-2xl sm:text-3xl md:text-4xl">
              {getMoodEmoji()}
            </div>
          </motion.div>
          
          {/* Sparkles */}
          {(mood === "excited" || mood === "celebrating") && (
            <>
              <motion.div
                className="absolute -top-1 -right-1 text-sm"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                ✨
              </motion.div>
              <motion.div
                className="absolute -bottom-1 -left-1 text-sm"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
              >
                ⭐
              </motion.div>
            </>
          )}
        </div>
      </motion.div>
      
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card px-4 py-2 text-sm text-center max-w-xs"
        >
          <span className="text-foreground">{message}</span>
        </motion.div>
      )}
    </div>
  );
};

export default Mascot;
