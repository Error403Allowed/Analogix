"use client";

import { Plus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileFABProps = {
  icon?: LucideIcon;
  label?: string;
  onClick: () => void;
  className?: string;
  "aria-label"?: string;
};

export default function MobileFAB({
  icon: Icon = Plus,
  label,
  onClick,
  className,
  "aria-label": ariaLabel,
}: MobileFABProps) {
  return (
    <button
      data-testid="mobile-fab"
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label ?? "Action"}
      className={cn(
        "pressable fixed z-40 md:hidden right-4 bottom-[calc(3.5rem+var(--safe-bottom)+1rem)] flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25",
        label ? "h-12 px-4 text-sm font-semibold" : "h-14 w-14 justify-center",
        className,
      )}
    >
      <Icon className={label ? "h-5 w-5" : "h-6 w-6"} />
      {label && <span>{label}</span>}
    </button>
  );
}
