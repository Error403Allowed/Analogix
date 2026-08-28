import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: "w-8 h-8 rounded-lg", icon: "w-4 h-4" },
  md: { box: "w-10 h-10 rounded-xl", icon: "w-5 h-5" },
  lg: { box: "w-12 h-12 rounded-xl", icon: "w-6 h-6" },
} as const;

const TONES = {
  primary: "bg-primary/10 text-primary",
  growth: "bg-growth/10 text-growth",
  filled: "gradient-primary text-white",
  muted: "bg-muted text-muted-foreground",
} as const;

export interface IconBadgeProps {
  /** A Lucide icon component. Omit and pass `children` instead for a
   *  DynamicIcon or any other custom icon element. */
  icon?: LucideIcon;
  children?: ReactNode;
  size?: keyof typeof SIZES;
  tone?: keyof typeof TONES;
  className?: string;
}

/**
 * Single source of truth for the app's "icon in a rounded square" motif -
 * section headers, list-item leading icons, card badges. New usages should
 * go through this rather than hand-rolling the
 * `rounded-xl bg-primary/10 flex items-center justify-center` div pattern,
 * so size/tone changes propagate everywhere at once.
 */
export function IconBadge({ icon: Icon, children, size = "md", tone = "primary", className }: IconBadgeProps) {
  const s = SIZES[size];
  return (
    <div className={cn(s.box, "flex items-center justify-center shrink-0", TONES[tone], className)}>
      {Icon ? <Icon className={s.icon} /> : children}
    </div>
  );
}
