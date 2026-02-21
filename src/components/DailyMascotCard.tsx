import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAIGreeting } from "@/services/groq";
import { statsStore } from "@/utils/statsStore";
import TypewriterText from "@/components/TypewriterText";
import { cn } from "@/lib/utils";

interface DailyMascotCardProps {
  userName: string;
  onChatStart: () => void;
  subtitle?: string;
  className?: string;
}

const DailyMascotCard = ({ userName, onChatStart, subtitle, className }: DailyMascotCardProps) => {
  const [greeting, setGreeting] = useState("Welcome back. Ready to learn?");

  useEffect(() => {
    statsStore.get().then(stats => {
      getAIGreeting(userName, stats.currentStreak).then(setGreeting);
    });
  }, [userName]);

  return (
    <motion.div 
      className={cn("glass-card p-8 min-h-[350px] h-full relative overflow-hidden group border-primary/20 flex flex-col", className)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
       <div className="absolute -right-10 -top-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl group-hover:bg-accent/20 transition-all duration-700" />
       
       <div className="relative z-10 flex flex-col items-center text-center space-y-6 flex-1 justify-center">
          <motion.div
            className="w-20 h-20 rounded-3xl bg-primary/10 text-primary grid place-items-center"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="w-8 h-8" />
          </motion.div>
          
          <div>
            <h3 className="text-2xl font-black text-foreground max-w-[260px] leading-tight mx-auto mb-2">
              <TypewriterText text={greeting} delay={150} />
            </h3>
            <p className="text-sm text-muted-foreground">{subtitle || "Your personal study assistant, ready to help."}</p>
          </div>

          <Button 
            className="gradient-primary w-full h-12 text-base shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform"
            onClick={onChatStart}
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Chat with Quizzy
          </Button>
       </div>
    </motion.div>
  );
};

export default DailyMascotCard;
