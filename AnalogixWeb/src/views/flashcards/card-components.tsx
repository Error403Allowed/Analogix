"use client";

import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import MarkdownRenderer from "@/components/MarkdownRenderer";

function cardTextSize(text: string): string {
  const len = text.length;
  if (len < 80) return "text-2xl sm:text-3xl font-bold leading-snug";
  if (len < 200) return "text-xl sm:text-2xl font-bold leading-snug";
  if (len < 400) return "text-base sm:text-lg font-semibold leading-relaxed";
  return "text-sm sm:text-base font-semibold leading-relaxed";
}

export function StudyCardContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <MarkdownRenderer
      content={content}
      className={cn(
        "w-full max-w-full",
        "[&>div]:mb-0 [&>div+div]:mt-3",
        "[&_.katex-display]:my-4 [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto",
        "[&_.katex]:text-inherit",
        className,
      )}
    />
  );
}

export function FlipCard({ front, back, flipped, onClick }: {
  front: string; back: string; flipped: boolean; onClick: () => void;
}) {
  const minH = back.length > 300 ? 360 : 280;
  return (
    <div className="w-full cursor-pointer select-none" style={{ perspective: "1400px" }} onClick={onClick}>
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
        style={{ transformStyle: "preserve-3d", position: "relative", minHeight: minH }}
        className="w-full"
      >
        <div style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          className="absolute inset-0 w-full rounded-3xl border-2 border-primary/25 bg-gradient-to-br from-card via-card to-primary/5 shadow-2xl flex flex-col items-center justify-center p-8 sm:p-10 text-center overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 mb-4 shrink-0">Term</p>
          <div className="overflow-y-auto max-h-[calc(100%-80px)] w-full flex items-center justify-center">
            <StudyCardContent
              content={front}
              className={cn(cardTextSize(front), "text-foreground")}
            />
          </div>
          <p className="mt-6 text-xs text-muted-foreground/60 flex items-center gap-1.5 shrink-0">
            <Eye className="w-3.5 h-3.5" /> Click to flip
          </p>
        </div>
        <div style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          className="absolute inset-0 w-full rounded-3xl border-2 border-emerald-500/30 bg-gradient-to-br from-card via-card to-emerald-500/5 shadow-2xl flex flex-col items-center justify-center p-8 sm:p-10 text-center overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60 mb-4 shrink-0">Definition</p>
          <div className="overflow-y-auto max-h-[calc(100%-80px)] w-full flex items-center justify-center">
            <StudyCardContent
              content={back}
              className={cn(cardTextSize(back), "text-foreground")}
            />
          </div>
          <p className="mt-6 text-xs text-muted-foreground/60 flex items-center gap-1.5 shrink-0">
            <EyeOff className="w-3.5 h-3.5" /> Click to flip back
          </p>
        </div>
      </motion.div>
    </div>
  );
}
