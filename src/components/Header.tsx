import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import Mascot from "./Mascot";
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
  const [greeting, setGreeting] = useState(`Welcome back, ${userName}! 👋`);

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
        <div className="flex items-center justify-between">
          {/* Logo & Welcome */}
          <div className="flex items-center gap-4">
            <Mascot size="sm" mood="study" />
            <div>
              <motion.h1
                className="text-xl font-bold gradient-text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Analogix
              </motion.h1>
              <p className="text-sm text-muted-foreground">
                {greeting}
              </p>
            </div>
          </div>

          {/* Stats & Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Streak Badge */}
            {streak > 0 && (
              <motion.div
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full gradient-warm text-warning-foreground"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="text-lg">🔥</span>
                <span className="font-bold">{streak} day streak!</span>
              </motion.div>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Settings */}
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
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
