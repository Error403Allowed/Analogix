import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Shared base classes for the app's plain "card" containers - i.e. the ones
 * built as hand-rolled divs/motion.divs rather than the <Card> primitive
 * (typically because they need Framer Motion props the primitive doesn't
 * support). Reference these instead of re-typing the class string, so
 * radius/border/background stay consistent everywhere. Combine with cn()
 * for padding, hover states, and other per-usage modifiers, e.g.:
 *   className={cn(cardStyles.default, "p-5 hover:border-primary/40")}
 */
export const cardStyles = {
  /** Spacious/calm default - the app-wide standard. */
  default: "rounded-2xl border border-border bg-card",
  /** Notion-style dense exception - dashboard-style widget grids only. */
  compact: "rounded-xl border border-border bg-card",
} as const;
