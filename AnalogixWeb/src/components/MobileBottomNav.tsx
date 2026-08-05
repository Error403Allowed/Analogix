"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BookOpen,
  CircleUser,
  GraduationCap,
  Home,
  MessageSquare,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileNavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
};

export const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  { label: "Home", path: "/dashboard", icon: Home },
  { label: "Tutor", path: "/chat", icon: MessageSquare },
  { label: "Study", path: "/study", icon: BookOpen },
  { label: "Subjects", path: "/subjects", icon: GraduationCap },
  { label: "Rooms", path: "/rooms", icon: Users },
  { label: "Profile", path: "/profile", icon: CircleUser },
];

export function getActiveTabForPath(path: string): string | null {
  for (const item of MOBILE_NAV_ITEMS) {
    if (path === item.path) return item.path;
  }
  for (const item of MOBILE_NAV_ITEMS) {
    if (path.startsWith(`${item.path}/`)) return item.path;
  }
  return null;
}

export default function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const active = getActiveTabForPath(pathname);

  return (
    <nav
      data-testid="mobile-bottom-nav"
      aria-label="Primary"
      className="safe-bottom md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/50 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-14 max-w-lg items-stretch px-1">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = item.path === active;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              data-testid="mobile-nav-item"
              data-active={isActive ? "true" : "false"}
              aria-current={isActive ? "page" : undefined}
              onClick={() => router.push(item.path)}
              className={cn(
                "pressable relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-muted-foreground transition-colors",
                isActive && "text-primary"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="mobile-nav-pill"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="absolute inset-1 rounded-xl bg-primary/10"
                />
              )}
              <motion.span
                animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="relative z-10"
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 2} />
              </motion.span>
              <span className="relative z-10 text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
