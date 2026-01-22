import { motion } from "framer-motion";
import { ArrowRight, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubjectCardProps {
  name: string;
  icon: string;
  progress: number;
  quizCount: number;
  streak?: number;
  onStudy: () => void;
}

const SubjectCard = ({ name, icon, progress, quizCount, streak = 0, onStudy }: SubjectCardProps) => {
  const getProgressColor = () => {
    if (progress >= 80) return "bg-success";
    if (progress >= 50) return "bg-secondary";
    return "bg-primary";
  };

  return (
    <motion.div
      className="glass-card p-5 group cursor-pointer relative overflow-hidden"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      onClick={onStudy}
    >
      {/* Background decoration */}
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors" />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-2xl shadow-lg"
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              {icon}
            </motion.div>
            <div>
              <h3 className="font-bold text-foreground text-lg">{name}</h3>
              <p className="text-sm text-muted-foreground">{quizCount} quizzes taken</p>
            </div>
          </div>
          
          {streak > 0 && (
            <motion.div
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-warning/20 text-warning text-xs font-medium"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🔥 {streak}
            </motion.div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Progress</span>
            <span className="text-sm font-medium text-foreground">{progress}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${getProgressColor()}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="w-4 h-4 text-warning" />
              <span>{Math.round(progress / 20)} stars</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4 text-success" />
              <span>+{Math.round(progress / 10)}%</span>
            </div>
          </div>
          
          <motion.div
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            whileHover={{ x: 5 }}
          >
            <Button size="sm" variant="ghost" className="text-primary">
              Study <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default SubjectCard;
