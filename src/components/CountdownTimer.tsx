import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Calendar, Clock, BookOpen } from "lucide-react";

interface CountdownTimerProps {
  examDate: Date;
  examName: string;
  subject: string;
  icon?: ReactNode;
}

const CountdownTimer = ({ examDate, examName, subject, icon = <BookOpen className="w-6 h-6" /> }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const difference = examDate.getTime() - new Date().getTime();
    
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: true };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      isComplete: false,
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [examDate]);

  const getUrgencyColor = () => {
    if (timeLeft.days <= 1) return "from-destructive/20 to-accent/20 border-destructive/30";
    if (timeLeft.days <= 3) return "from-warning/20 to-accent/20 border-warning/30";
    if (timeLeft.days <= 7) return "from-secondary/20 to-primary/20 border-secondary/30";
    return "from-success/20 to-secondary/20 border-success/30";
  };

  const getMessage = () => {
    if (timeLeft.isComplete) return "Time to shine.";
    if (timeLeft.days === 0) return "Today's the day. You've got this.";
    if (timeLeft.days === 1) return "Tomorrow. Quick review time.";
    if (timeLeft.days <= 3) return "Almost there. Stay focused.";
    if (timeLeft.days <= 7) return "One week left. You're doing great.";
    return "Plenty of time. Keep up the good work.";
  };

  return (
    <motion.div
      className={`glass-card p-5 bg-gradient-to-br ${getUrgencyColor()} overflow-hidden relative`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.3 }}
    >
      {/* Decorative elements */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-primary/5 blur-2xl" />
      <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-secondary/5 blur-xl" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.span 
              className="text-primary"
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              {icon}
            </motion.span>
            <div>
              <h3 className="font-bold text-foreground text-lg">{examName}</h3>
              <p className="text-sm text-muted-foreground">{subject}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{examDate.toLocaleDateString()}</span>
          </div>
        </div>

        {/* Countdown */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { value: timeLeft.days, label: "Days" },
            { value: timeLeft.hours, label: "Hours" },
            { value: timeLeft.minutes, label: "Mins" },
            { value: timeLeft.seconds, label: "Secs" },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              className="text-center glass rounded-xl py-3"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <motion.div
                key={item.value}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-2xl font-bold gradient-text"
              >
                {String(item.value).padStart(2, "0")}
              </motion.div>
              <div className="text-xs text-muted-foreground">{item.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Message */}
        <motion.div
          className="flex items-center justify-center gap-2 text-sm font-medium text-foreground"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Clock className="w-4 h-4 text-primary" />
          {getMessage()}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default CountdownTimer;
