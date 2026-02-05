import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, User, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import ThemeSelector from "./ThemeSelector";
import { useNavigate } from "react-router-dom";
import SettingsDialog from "./SettingsDialog";
import { getAIGreeting } from "@/services/groq";

interface HeaderProps {
  userName?: string;
  streak?: number;
}

const Header = ({ userName = "Student", streak = 0 }: HeaderProps) => {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [greeting, setGreeting] = useState(`Welcome back, ${userName}.`);

  useEffect(() => {
    getAIGreeting(userName, streak).then(setGreeting);
  }, [userName, streak]);

  return (
    <>
      <motion.header
        className="glass px-6 py-4 mb-6 relative z-50 rounded-2xl shadow-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center">
          {/* Left: Greeting */}
          <div className="justify-self-start">
            <p className="text-sm text-muted-foreground">
              {greeting}
            </p>
          </div>

          {/* Centered Brand */}
          <motion.h1
            className="text-xl font-bold gradient-text cursor-pointer justify-self-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => navigate("/?force=true")}
          >
            Analogix
          </motion.h1>

          {/* Right: Stats & Actions */}
          <div className="flex items-center gap-2 sm:gap-4 justify-self-end">
            {/* Streak Badge */}
            {streak > 0 && (
              <motion.div
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full gradient-warm text-warning-foreground"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Flame className="w-4 h-4" />
                <span className="font-bold">{streak} day streak</span>
              </motion.div>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Accent Theme Selector */}
            <ThemeSelector />

            {/* Settings */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowSettings(true)}
              className="text-gray-500 dark:text-gray-400 hover:text-[var(--g-1)] transition-colors"
            >
              <Settings className="w-5 h-5" />
            </Button>

            {/* Profile */}
            <motion.button
              className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/onboarding")}
            >
              <User className="w-5 h-5 text-primary-foreground" />
            </motion.button>
          </div>
        </div>
      </motion.header>

      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </>
  );
};

export default Header;
