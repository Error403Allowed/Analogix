 
"use client";

import {
  LayoutDashboard, MessageCircle, Calendar,
  GraduationCap, Trophy, ChevronDown, Palette,
  Sun, Moon, User, Flame, Library, SigmaIcon, SquareStack, ClipboardList,
  Plus, Search, MoreHorizontal, Users, BookOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarGroup, SidebarGroupContent, SidebarSeparator,
} from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { useThemeSelector } from "@/hooks/useThemeSelector";
import ProfileSheet from "@/components/ProfileSheet";
import { NewPageModal } from "@/components/NewPageModal";
import ChatHistoryPanel from "@/components/ChatHistoryPanel";
import { useTabs, pathMeta } from "@/context/TabsContext";
import { subjectStore, type SubjectData } from "@/utils/subjectStore";
import { toast } from "sonner";

import { CommandMenu } from "@/components/CommandMenu";

const navGroups = [
  {
    label: "Learn",
    items: [
      { title: "Dashboard",     url: "/dashboard",    icon: LayoutDashboard, tutorial: "dashboard-nav"    },
      { title: "AI Tutor", url: "/chat",         icon: MessageCircle,   tutorial: "chat-nav"         },
      { title: "Flashcards",    url: "/flashcards",   icon: SquareStack,     tutorial: "flashcards-nav"   },
      { title: "Quiz Hub",      url: "/quiz",         icon: ClipboardList,   tutorial: "quiz-nav"         },
    ],
  },
  {
    label: "Study",
    items: [
      { title: "Formulas",      url: "/formulas",     icon: SigmaIcon,       tutorial: "formulas-nav"     },
      { title: "Resources",     url: "/resources",    icon: Library,         tutorial: "resources-nav"    },
      { title: "Study Rooms",   url: "/rooms",        icon: Users,           tutorial: "rooms-nav"        },
      { title: "My Subjects",   url: "/subjects",     icon: GraduationCap,   tutorial: "subjects-nav"     },
    ],
  },
  {
    label: "Plan",
    items: [
      { title: "Calendar",      url: "/calendar",     icon: Calendar,        tutorial: "calendar-nav"     },
      { title: "Achievements",  url: "/achievements", icon: Trophy,          tutorial: "achievements-nav" },
    ],
  },
];


export function AppSidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { setTheme: setMode, resolvedTheme } = useTheme();
  const { openTab, tabs, activeTabId } = useTabs();
  const {
    activeTheme,
    themeOpen,
    setThemeOpen,
    themes,
    handleThemeSelect,
    handleThemeHover,
    handleThemeHoverEnd,
  } = useThemeSelector();

  const [userData,         setUserData]         = useState<any>(null);
  const [mounted,          setMounted]          = useState(false);
  const [profileOpen,      setProfileOpen]      = useState(false);
  const [streak,           setStreak]           = useState(0);
  const [isNewPageModalOpen, setIsNewPageModalOpen] = useState(false);
  const isDark = resolvedTheme === "dark";

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const load = () => {
      try {
        const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
        setUserData(prefs);
        const stats = JSON.parse(localStorage.getItem("analogix_user_stats_v1") || "{}");
        setStreak(Number(stats.currentStreak) || 0);
      } catch { /* ignore localStorage errors */ }
    };
    load();
    window.addEventListener("storage", load);
    window.addEventListener("userPreferencesUpdated", load);
    window.addEventListener("statsUpdated", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("userPreferencesUpdated", load);
      window.removeEventListener("statsUpdated", load);
    };
  }, []);

  const handleCreatePage = async (subjectId: string, title: string) => {
    try {
      const created = await subjectStore.createDocument(subjectId, title);
      toast.success(`Page "${title}" created!`);
      setIsNewPageModalOpen(false);
      // Force refresh sidebar state
      const data = await subjectStore.getAll();
      setSubjects(data);
      openTab(`/subjects/${subjectId}/document/${created.id}`, title, "📄");
      router.push(`/subjects/${subjectId}/document/${created.id}`);
    } catch (error) {
      toast.error("Failed to create page");
    }
  };

  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandMenuOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [subjects, setSubjects] = useState<Record<string, SubjectData>>({});

  const refreshSidebar = useCallback(async () => {
    const data = await subjectStore.getAll();
    setSubjects(data);
  }, []);

  useEffect(() => {
    refreshSidebar();
    window.addEventListener("subjectDataUpdated", refreshSidebar);
    return () => window.removeEventListener("subjectDataUpdated", refreshSidebar);
  }, [refreshSidebar]);

  const name      = userData?.name || "Student";
  const avatarUrl = userData?.avatarUrl || "";


  return (
    /* Outer container — cleaner dark-friendly glass panel */
    <Sidebar
      collapsible="offcanvas"
      data-tutorial="sidebar"
      className="!border-r-0 !border-l-0 !border-none rounded-[32px] border border-white/10 bg-background/95 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl dark:border-slate-800/60"
      style={{ background: "hsl(var(--background) / 0.95)" }}
    >
      {/* Inner container — clearer spacing and soft backdrop */}
      <div className="flex flex-col h-full px-3 py-3 overflow-hidden space-y-3"
        style={{ background: "hsl(var(--background) / 0.94)" }}
      >

        {/* ── Header: logo ──────────────────────────────────────── */}
        <SidebarHeader className="h-20 shrink-0 flex flex-col justify-center px-4 pb-2 border-b border-muted/15">
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => router.push("/?force=true")}
              className="flex items-center gap-3.5 rounded-3xl px-3 py-2 hover:bg-muted/30 transition-all active:scale-[0.98]"
            >
              <div className="w-11 h-11 rounded-2xl overflow-hidden shrink-0 shadow-xl shadow-primary/20">
                <img src="/tab-icon.png" alt="Analogix" className="w-full h-full object-cover" />
              </div>
              <span className="text-lg font-black tracking-tight text-foreground">Analogix</span>
            </button>
          </div>
        </SidebarHeader>

        {/* ── Nav ───────────────────────────────────────────────────── */}
        <SidebarContent className="flex-1 px-1 py-2 overflow-y-auto overflow-x-hidden text-foreground custom-scrollbar">
          {navGroups.map((group) => (
            <SidebarGroup key={group.label} className="rounded-[26px] border border-muted/15 bg-muted/10 p-3 mb-3">
              <p className="px-2 mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/70">
                {group.label}
              </p>
              <SidebarGroupContent>
                <SidebarMenu className="gap-2">
                  {group.items.map(item => {
                    const activeTab = tabs.find(t => t.id === activeTabId);
                    const isActive = activeTab?.path === item.url || pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <motion.div whileTap={{ scale: 0.98 }} data-tutorial={item.tutorial}>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => {
                              const meta = pathMeta(item.url);
                              openTab(item.url, meta.label, meta.emoji);
                              router.push(item.url);
                            }}
                            className={cn(
                              "min-h-[46px] rounded-2xl px-4 transition-all duration-200 font-semibold text-sidebar-foreground/80",
                              isActive
                                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-lg shadow-sidebar-accent/15"
                                : "bg-transparent hover:bg-sidebar-accent/20 hover:text-sidebar-foreground"
                            )}
                          >
                            <item.icon
                              className={cn(
                                "w-5 h-5 shrink-0 transition-colors",
                                isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/70"
                              )}
                            />
                            <span className="truncate">{item.title}</span>
                          </SidebarMenuButton>
                        </motion.div>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        {/* ── Footer: user profile + streak ────────────────────────── */}
        <SidebarFooter className="shrink-0 px-4 py-4 space-y-3 border-t border-muted/15 bg-background/90 backdrop-blur-xl">
          <SidebarMenu className="gap-2 mb-1">
            {/* Search button */}
            <SidebarMenuItem>
              <motion.div whileTap={{ scale: 0.97 }}>
                <SidebarMenuButton
                  onClick={() => setIsCommandMenuOpen(true)}
                  className="min-h-[46px] rounded-2xl px-4 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:bg-muted/30"
                >
                  <Search className="w-4 h-4 shrink-0" />
                  <span className="truncate">Search</span>
                  <span className="ml-auto text-[10px] font-medium text-muted-foreground/40">⌘K</span>
                </SidebarMenuButton>
              </motion.div>
            </SidebarMenuItem>

            {/* New page button */}
            <SidebarMenuItem>
              <motion.div whileTap={{ scale: 0.97 }}>
                <SidebarMenuButton
                  onClick={() => setIsNewPageModalOpen(true)}
                  className="min-h-[46px] rounded-2xl px-4 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:bg-muted/30"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span className="truncate">New page</span>
                </SidebarMenuButton>
              </motion.div>
            </SidebarMenuItem>

            {/* Dark/light toggle */}
            {mounted && (
              <SidebarMenuItem>
                <motion.div whileTap={{ scale: 0.97 }}>
                  <SidebarMenuButton
                    onClick={() => setMode(isDark ? "light" : "dark")}
                    className="min-h-[46px] rounded-2xl px-4 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:bg-muted/30 active:scale-[0.97]"
                  >
                    <motion.span
                      key={isDark ? "sun" : "moon"}
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {isDark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
                    </motion.span>
                    <span className="truncate">{isDark ? "Light mode" : "Dark mode"}</span>
                  </SidebarMenuButton>
                </motion.div>
              </SidebarMenuItem>
            )}

            {/* Colour scheme */}
            <SidebarMenuItem>
              <Sheet open={themeOpen} onOpenChange={setThemeOpen}>
                <SheetTrigger asChild>
                  <SidebarMenuButton className="min-h-[46px] rounded-2xl px-4 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:bg-muted/30 active:scale-[0.97]">
                    <Palette className="w-4 h-4 shrink-0" />
                    <span className="truncate">Colour scheme</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform ml-auto", themeOpen && "rotate-180")} />
                  </SidebarMenuButton>
                </SheetTrigger>
                <SheetContent side="bottom" className="w-full max-w-xl mx-auto rounded-t-3xl border border-muted/20 shadow-2xl bg-background/95 backdrop-blur-xl pb-8 pt-2">
                  <div className="flex justify-center mb-4">
                    <div className="w-8 h-1 rounded-full bg-muted-foreground/20" />
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Theme</p>
                    <div className="flex gap-0 overflow-x-auto pb-2">
                      {themes.map(t =>
                        <button
                          key={t.name}
                          onClick={() => handleThemeSelect(t.name)}
                          onMouseEnter={() => handleThemeHover(t.name)}
                          onMouseLeave={handleThemeHoverEnd}
                          aria-label={t.name}
                          className={cn(
                            "aspect-square min-w-[72px] max-w-[96px] flex-1 rounded-3xl transition-all border p-1 flex flex-col gap-[1px] overflow-hidden",
                            activeTheme === t.name
                              ? "border-primary/60 ring-1 ring-primary/30 scale-105"
                              : "border-muted/20 hover:scale-105"
                          )}
                        >
                          <div className="flex gap-[1px] w-full flex-1 min-h-0">
                            <div className="flex-1" style={{ background: t.g[0] }} />
                            <div className="flex-1" style={{ background: t.g[1] }} />
                          </div>
                          <div className="w-full h-[30%]" style={{ background: t.g[2] }} />
                        </button>
                      )}
                    </div>
                </SheetContent>
              </Sheet>
            </SidebarMenuItem>
          </SidebarMenu>

          <SidebarSeparator className="my-2 border-muted/15" />

          <SidebarMenu>
            <SidebarMenuItem>
              <motion.div whileTap={{ scale: 0.97 }}>
                <SidebarMenuButton size="lg" onClick={() => setProfileOpen(true)} data-tutorial="profile"
                  className="h-auto w-full flex items-center gap-3 p-3 rounded-[28px] border border-muted/20 bg-muted/10 transition-all duration-200 hover:bg-muted/20 hover:border-muted/30 text-foreground cursor-pointer"
                >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-2xl overflow-hidden bg-muted">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full gradient-primary flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  {/* Streak badge — like the inspiration's percentage badge */}
                  {streak > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-amber-500 flex items-center justify-center px-1 shadow-md">
                      <span className="text-[8px] font-black text-white leading-none flex items-center gap-0.5">
                        <Flame className="w-2.5 h-2.5" />{streak}
                      </span>
                    </div>
                  )}
                </div>
                {/* Name + meta */}
                <div className="flex-1 min-w-0 text-foreground">
                  <p className="text-sm font-black truncate leading-tight">{name}</p>
                  <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest truncate">
                  </p>
                </div>
              </SidebarMenuButton>
              </motion.div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

      </div>{/* end glass inner layer */}
      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />
      
      <NewPageModal
        open={isNewPageModalOpen}
        onClose={() => setIsNewPageModalOpen(false)}
        onCreate={handleCreatePage}
      />

      <CommandMenu
        open={isCommandMenuOpen}
        onClose={() => setIsCommandMenuOpen(false)}
        onNavigate={(path) => {
          setIsCommandMenuOpen(false);
          if (path === "new-event") {
            router.push("/calendar");
            setTimeout(() => window.dispatchEvent(new CustomEvent("openAddEvent")), 300);
          } else if (path.startsWith("doc:")) {
            // Parse "doc:docId:subjectId"
            const parts = path.split(":");
            const docId = parts[1];
            const subjectId = parts[2];
            
            if (!docId || !subjectId) {
              console.error("[AppSidebar] Invalid doc path format:", path);
              return;
            }
            
            // Get document title for tab label
            const allDocs = Object.values(subjects).flatMap(s => (s?.notes?.documents || []));
            const doc = allDocs.find(d => d.id === docId);
            const title = doc?.title || "Document";
            const icon = "📄";
            
            openTab(`/subjects/${subjectId}/document/${docId}`, title, icon);
            router.push(`/subjects/${subjectId}/document/${docId}`);
          } else if (path.startsWith("new-")) {
            router.push("/dashboard");
          } else {
            router.push(path);
          }
        }}
      />
    </Sidebar>
  );
}
