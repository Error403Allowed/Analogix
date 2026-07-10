"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Plus, RefreshCw } from "lucide-react";

interface ChatHeaderProps {
  setSidebarOpen: (open: boolean) => void;
  sidebarOpen: boolean;
  router: any;
  selectedSubject: string | null;
  handleNewTopic: () => void;
  isInputLocked: boolean;
  handleStartNewChat: () => void;
}

const ChatHeader = ({
  setSidebarOpen,
  sidebarOpen,
  router,
  selectedSubject,
  handleNewTopic,
  isInputLocked,
  handleStartNewChat,
}: ChatHeaderProps) => {
  return (
    <>
      {/* Header */}
      <motion.header
        className="flex items-center justify-between py-2.5 px-4 border-b border-border/20"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            title="Toggle chat history"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Right: actions only */}
        <div className="flex items-center gap-1">
          {selectedSubject && (
            <button
              onClick={handleNewTopic}
              disabled={isInputLocked}
              className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all disabled:opacity-40"
              title="New topic"
            >
              <RefreshCw className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          )}
          <button
            onClick={handleStartNewChat}
            className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            title="New chat"
          >
            <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </motion.header>
    </>
  );
};

export default ChatHeader;
