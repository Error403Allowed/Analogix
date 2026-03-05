"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle, GraduationCap, Flame, BookOpen, Calendar, Target,
  LayoutDashboard, Timer, FileText, Zap, Brain, Plus, X, Check,
  ChevronDown, Link as LinkIcon, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

// ── All available pages in the app ─────────────────────────────────────────

export const APP_PAGES = [
  { label: "Analogy Tutor",  path: "/chat",          icon: "MessageCircle"  },
  { label: "My Subjects",    path: "/subjects",       icon: "GraduationCap"  },
  { label: "Dashboard",      path: "/dashboard",      icon: "LayoutDashboard"},
  { label: "Flashcards",     path: "/flashcards",     icon: "Brain"          },
  { label: "Quiz",           path: "/quiz",           icon: "Target"         },
  { label: "Calendar",       path: "/calendar",       icon: "Calendar"       },
  { label: "Achievements",   path: "/achievements",   icon: "Flame"          },
  { label: "Formulas",       path: "/formulas",       icon: "FileText"       },
  { label: "Resources",      path: "/resources",      icon: "BookOpen"       },
  { label: "Timer",          path: "/timer",          icon: "Timer"          },
] as const;

const ICON_MAP: Record<string, React.ElementType> = {
  MessageCircle, GraduationCap, Flame, BookOpen, Calendar,
  Target, LayoutDashboard, Timer, FileText, Zap, Brain, LinkIcon,
};

const DEFAULT_LINKS = ["/chat", "/subjects", "/achievements"];
const LS_KEY = "dashboardQuickLinks";

function loadLinks(): string[] {
  if (typeof window === "undefined") return DEFAULT_LINKS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_LINKS;
  } catch { return DEFAULT_LINKS; }
}

function saveLinks(links: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(links));
}

// ── Component ───────────────────────────────────────────────────────────────

export default function QuickLinks() {
  const router = useRouter();
  const [links, setLinks] = useState<string[]>(DEFAULT_LINKS);
  const [editing, setEditing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => { setLinks(loadLinks()); }, []);

  const toggle = (path: string) => {
    const next = links.includes(path)
      ? links.filter(l => l !== path)
      : [...links, path];
    setLinks(next);
    saveLinks(next);
  };

  const pageFor = (path: string) =>
    APP_PAGES.find(p => p.path === path);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          Quick links
        </span>
        <button
          onClick={() => { setEditing(e => !e); setPickerOpen(false); }}
          className={cn(
            "w-5 h-5 rounded flex items-center justify-center transition-colors",
            editing
              ? "text-primary bg-primary/10"
              : "text-muted-foreground/40 hover:text-muted-foreground"
          )}
          title={editing ? "Done editing" : "Customise links"}
        >
          {editing ? <Check className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
        </button>
      </div>

      {/* Link list */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
        <AnimatePresence initial={false}>
          {links.map(path => {
            const page = pageFor(path);
            if (!page) return null;
            const Icon = ICON_MAP[page.icon] ?? LinkIcon;
            return (
              <motion.div
                key={path}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/40 transition-colors group"
              >
                <button
                  onClick={() => !editing && router.push(path)}
                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                >
                  <Icon className="w-3.5 h-3.5 text-primary/60 group-hover:text-primary transition-colors shrink-0" />
                  <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors truncate">
                    {page.label}
                  </span>
                </button>
                {editing && (
                  <button
                    onClick={() => toggle(path)}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Add link button */}
        {editing && (
          <div className="relative">
            <button
              onClick={() => setPickerOpen(p => !p)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-dashed border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-colors text-muted-foreground/50 hover:text-primary"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-semibold">Add a page</span>
              <ChevronDown className={cn("w-3 h-3 ml-auto shrink-0 transition-transform", pickerOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {pickerOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
                >
                  {APP_PAGES.map(page => {
                    const Icon = ICON_MAP[page.icon] ?? LinkIcon;
                    const active = links.includes(page.path);
                    return (
                      <button
                        key={page.path}
                        onClick={() => { toggle(page.path); setPickerOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left",
                          active
                            ? "text-primary bg-primary/8 font-semibold"
                            : "text-foreground/70 hover:bg-muted/60 hover:text-foreground"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {page.label}
                        {active && <Check className="w-3 h-3 ml-auto shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
