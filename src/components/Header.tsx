import { motion } from "framer-motion";
import { Bell, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import Mascot from "./Mascot";

interface HeaderProps {
  userName?: string;
  streak?: number;
}

const Header = ({ userName = "Student", streak = 0 }: HeaderProps) => {
  return (
    <motion.header
      className="glass-card px-6 py-4 mb-6"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between">
        {/* Logo & Welcome */}
        <div className="flex items-center gap-4">
          <Mascot size="sm" mood="happy" />
          <div>
            <motion.h1
              className="text-xl font-bold gradient-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Quizzy
            </motion.h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, <span className="font-medium text-foreground">{userName}</span>! 👋
            </p>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-4">
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

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <motion.span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              3
            </motion.span>
          </Button>

          {/* Settings */}
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>

          {/* Profile */}
          <motion.button
            className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <User className="w-5 h-5 text-primary-foreground" />
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
