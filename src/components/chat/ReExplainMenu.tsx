"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Wand2, X, Lightbulb } from "lucide-react";

interface ReExplainMenuProps {
  open: boolean;
  hobbies: string[];
  onSelect: (anchor?: string) => void;
  onClose: () => void;
}

export function ReExplainMenu({ open, hobbies, onSelect, onClose }: ReExplainMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          role="menu"
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className="absolute left-0 top-9 z-50 w-60 rounded-xl border border-border/80 bg-popover shadow-lg shadow-black/5 backdrop-blur-sm p-1.5"
        >
          <div className="flex items-center justify-between px-2.5 pt-1.5 pb-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Lightbulb className="w-3 h-3" />
              Explain differently
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => onSelect()}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-primary/10 text-left transition-colors group"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary shrink-0">
              <Wand2 className="w-3.5 h-3.5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-xs font-semibold text-foreground">Surprise me</span>
              <span className="block text-[10px] text-muted-foreground/70 truncate">
                Pick a fresh angle for me
              </span>
            </span>
            <Sparkles className="w-3 h-3 text-primary/50 shrink-0" />
          </button>

          {hobbies.length > 0 && (
            <>
              <div className="my-1.5 mx-1 h-px bg-border/60" />
              <p className="px-2.5 pt-0.5 pb-1 text-[10px] font-medium text-muted-foreground/70">
                Anchor it to an interest
              </p>
              <div className="max-h-44 overflow-y-auto pr-0.5">
                {hobbies.map(interest => (
                  <button
                    key={interest}
                    type="button"
                    role="menuitem"
                    onClick={() => onSelect(interest)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted/60 text-left transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                    <span className="text-xs text-foreground truncate">{interest}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
