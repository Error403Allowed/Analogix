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
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <div className="h-14 bg-muted/30 border-b border-border/50 flex items-center px-4 gap-3">
        <div className="h-8 w-8 rounded-full bg-muted/40 animate-pulse" />
        <div className="h-4 bg-muted/40 rounded w-32 animate-pulse" />
        <div className="flex-1" />
        <div className="h-8 w-8 rounded-lg bg-muted/40 animate-pulse" />
      </div>
      {/* Messages skeleton */}
      <div className="flex-1 p-6 space-y-6 overflow-hidden">
        <div className="flex justify-start">
          <div className="max-w-[75%] space-y-3">
            <div className="h-3 bg-muted/30 rounded-full w-48 animate-pulse" />
            <div className="h-3 bg-muted/30 rounded-full w-36 animate-pulse" />
            <div className="h-3 bg-muted/30 rounded-full w-52 animate-pulse" />
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[60%] space-y-2">
            <div className="h-8 bg-primary/10 rounded-2xl w-40 animate-pulse" />
          </div>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[75%] space-y-3">
            <div className="h-3 bg-muted/30 rounded-full w-56 animate-pulse" />
            <div className="h-3 bg-muted/30 rounded-full w-44 animate-pulse" />
            <div className="h-3 bg-muted/30 rounded-full w-32 animate-pulse" />
            <div className="h-3 bg-muted/30 rounded-full w-48 animate-pulse" />
          </div>
        </div>
      </div>
      {/* Input skeleton */}
      <div className="p-4 border-t border-border/30">
        <div className="h-12 bg-muted/20 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}

export function FlashcardsSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted/40" />
        <div className="space-y-2">
          <div className="h-5 bg-muted/40 rounded w-36" />
          <div className="h-3 bg-muted/30 rounded w-24" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 rounded-2xl bg-muted/20 border border-border/30 p-5 space-y-4">
            <div className="h-4 bg-muted/30 rounded w-3/4" />
            <div className="h-3 bg-muted/20 rounded w-1/2" />
            <div className="h-20 bg-muted/15 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function QuizSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted/40" />
        <div className="space-y-2">
          <div className="h-5 bg-muted/40 rounded w-28" />
          <div className="h-3 bg-muted/30 rounded w-20" />
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/30 bg-card/50 p-5 space-y-3">
            <div className="h-4 bg-muted/30 rounded w-3/4" />
            <div className="space-y-2 pl-4">
              <div className="h-8 bg-muted/20 rounded-xl w-full" />
              <div className="h-8 bg-muted/20 rounded-xl w-5/6" />
              <div className="h-8 bg-muted/20 rounded-xl w-4/6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RoomsSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 bg-muted/40 rounded w-32" />
          <div className="h-3 bg-muted/30 rounded w-48" />
        </div>
        <div className="h-10 w-28 rounded-xl bg-muted/30" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-muted/20 border border-border/30 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted/30" />
              <div className="h-4 bg-muted/30 rounded w-24" />
            </div>
            <div className="h-3 bg-muted/20 rounded w-3/4" />
            <div className="h-3 bg-muted/20 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-6 bg-muted/40 rounded w-28" />
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded-lg bg-muted/30" />
          <div className="h-8 w-8 rounded-lg bg-muted/30" />
        </div>
      </div>
      <div className="rounded-2xl border border-border/30 bg-card/50 overflow-hidden">
        <div className="grid grid-cols-7 gap-px bg-border/30">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted/10 p-2">
              <div className="h-5 w-5 rounded-full bg-muted/20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AchievementsSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-6 bg-muted/40 rounded w-40" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-muted/20 border border-border/30 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-muted/30" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-muted/30 rounded w-24" />
                <div className="h-3 bg-muted/20 rounded w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SubjectsSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 bg-muted/40 rounded w-36" />
          <div className="h-3 bg-muted/30 rounded w-48" />
        </div>
        <div className="h-10 w-28 rounded-xl bg-muted/30" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted/20 border border-border/30 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-muted/30" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-muted/30 rounded w-20" />
                <div className="h-3 bg-muted/20 rounded w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormulasSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted/40" />
        <div className="space-y-2">
          <div className="h-5 bg-muted/40 rounded w-32" />
          <div className="h-3 bg-muted/30 rounded w-40" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-muted/20 border border-border/30 p-4 space-y-2">
            <div className="h-4 bg-muted/30 rounded w-1/3" />
            <div className="h-8 bg-muted/15 rounded-xl w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResourcesSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-6 bg-muted/40 rounded w-36" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 rounded-2xl bg-muted/20 border border-border/30 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-muted/30" />
              <div className="h-4 bg-muted/30 rounded w-20" />
            </div>
            <div className="h-3 bg-muted/20 rounded w-3/4" />
            <div className="h-3 bg-muted/20 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
