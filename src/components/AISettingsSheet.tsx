"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, X } from "lucide-react";
import {
  Sheet, SheetContent, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { PersonalityEditor } from "@/components/PersonalityEditor";
import { MemoryManager } from "@/components/MemoryManager";
import { ScrollArea } from "@/components/ui/scroll-area";

type AITab = "personality" | "memory";

interface AISettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: AITab;
}

export default function AISettingsSheet({ open, onOpenChange, defaultTab = "personality" }: AISettingsSheetProps) {
  const [activeTab, setActiveTab] = useState<AITab>(defaultTab);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[420px] flex flex-col p-0 bg-background border-l border-border"
        aria-describedby="ai-settings-description"
      >
        <SheetDescription id="ai-settings-description" className="sr-only">
          Customize how the AI teaches and interacts with you
        </SheetDescription>

        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <SheetTitle className="text-base font-black tracking-tight">AI Tutor Settings</SheetTitle>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">Personality & memory for this chat</p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveTab("personality")}
              className={cn(
                "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === "personality"
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-muted/30 text-muted-foreground/70 border border-border/60 hover:border-primary/30 hover:text-foreground"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Personality
            </button>
            <button
              onClick={() => setActiveTab("memory")}
              className={cn(
                "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === "memory"
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-muted/30 text-muted-foreground/70 border border-border/60 hover:border-primary/30 hover:text-foreground"
              )}
            >
              <Brain className="w-3.5 h-3.5" />
              Memory
            </button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-4">
            <AnimatePresence mode="wait">
              {activeTab === "personality" ? (
                <motion.div
                  key="personality"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.15 }}
                >
                  <PersonalityEditor onClose={() => onOpenChange(false)} />
                </motion.div>
              ) : (
                <motion.div
                  key="memory"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.15 }}
                >
                  <MemoryManager onClose={() => onOpenChange(false)} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
