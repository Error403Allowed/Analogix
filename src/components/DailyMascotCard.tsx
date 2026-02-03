import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Mascot from "./Mascot";
import { getAIGreeting } from "@/services/groq";
import { statsStore } from "@/utils/statsStore";

interface DailyMascotCardProps {
  userName: string;
  onChatStart: () => void;
}

const DailyMascotCard = ({ userName, onChatStart }: DailyMascotCardProps) => {
  const [greeting, setGreeting] = useState("Hey there! Ready to learn?");

  useEffect(() => {
    const stats = statsStore.get();
    getAIGreeting(userName, stats.currentStreak).then(setGreeting);
  }, [userName]);

  return (
    <motion.div 
      className="glass-card p-6 relative overflow-hidden group border-primary/20"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
       {/* Background glow */}
       <div className="absolute -right-10 -top-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl group-hover:bg-accent/20 transition-all duration-700" />
       
       <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
             <Mascot size="md" mood="brain" />
          </motion.div>
          
          <div>
            <h3 className="text-xl font-black text-foreground max-w-[200px] leading-tight mx-auto mb-1">
              {greeting}
            </h3>
            <p className="text-xs text-muted-foreground">AI Tutor is online</p>
          </div>

          <Button 
            className="gradient-primary w-full shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform"
            onClick={onChatStart}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Chat with Quizzy
          </Button>
       </div>
    </motion.div>
  );
};

export default DailyMascotCard;
