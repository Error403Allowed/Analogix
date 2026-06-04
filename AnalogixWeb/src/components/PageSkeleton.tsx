"use client";

import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export function PageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-3 animate-pulse"
    >
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
      <div className="h-3 bg-muted rounded w-5/6" />
    </motion.div>
  );
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-24 bg-muted/50 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 bg-muted/30 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function DocumentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse max-w-4xl mx-auto px-6 py-8">
      <div className="w-16 h-16 bg-muted rounded-2xl" />
      <div className="h-10 bg-muted rounded w-2/3" />
      <div className="h-4 bg-muted/50 rounded w-1/3" />
      <div className="space-y-3 pt-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-4 bg-muted/40 rounded" style={{ width: `${85 - i * 5}%` }} />
        ))}
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      <div className="h-14 bg-muted/30 border-b border-border/50" />
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
      </div>
    </div>
  );
}
