import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Lock } from "lucide-react";

interface AchievementBadgeProps {
  icon: ReactNode;
  title: string;
  description: string;
  isUnlocked: boolean;
  isNew?: boolean;
}

const AchievementBadge = ({ icon, title, description, isUnlocked, isNew }: AchievementBadgeProps) => {
  return (
    <motion.div
      className={`relative p-4 rounded-2xl border-2 ${
        isUnlocked
          ? "glass border-primary/30 bg-primary/5"
          : "bg-muted/50 border-muted opacity-60"
      }`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={isUnlocked ? { scale: 1.05 } : {}}
    >
      {isNew && isUnlocked && (
        <motion.div
          className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-bold"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          NEW!
        </motion.div>
      )}
      
      <motion.div
        className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3 ${
          isUnlocked ? "gradient-primary" : "bg-muted"
        }`}
        animate={isUnlocked ? { rotate: [0, -10, 10, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
      >
        {isUnlocked ? icon : <Lock className="w-5 h-5 text-muted-foreground" />}
      </motion.div>
      
      <h4 className="font-bold text-foreground text-sm">{title}</h4>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </motion.div>
  );
};

export default AchievementBadge;
