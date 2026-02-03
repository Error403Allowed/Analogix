import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Mascot from "./Mascot";

interface DailyMascotCardProps {
  userName: string;
  onChatStart: () => void;
}

const GREETINGS = [
  "What's up! Ready to get into it?",
  "Let's crush some goals today!",
  "Got a tough concept? I can help!",
  "Simulation theory or Calculus? Ask away!",
  "Your brain is a muscle. let's flex it!"
];

const DailyMascotCard = ({ userName, onChatStart }: DailyMascotCardProps) => {
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    // Pick random greeting on mount
    const random = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    setGreeting(random);
  }, []);

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
