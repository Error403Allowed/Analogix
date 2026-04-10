"use client";

import {
  LayoutDashboard, MessageCircle, Calendar,
  GraduationCap, Trophy, ChevronDown, Palette,
  Sun, Moon, User, Flame, Library, SigmaIcon, SquareStack, ClipboardList,
  Plus, Search, MoreHorizontal, Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarGroup, SidebarGroupContent, SidebarSeparator,
} from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { applyThemeByName } from "@/components/ThemeSelector";
import { themes } from "@/components/ThemeSelector";
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
    label: "Reference",
    items: [
      { title: "Formulas",      url: "/formulas",     icon: SigmaIcon,       tutorial: "formulas-nav"     },
      { title: "Resources",     url: "/resources",    icon: Library,         tutorial: "resources-nav"    },
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
  const [userData,         setUserData]         = useState<any>(null);
  const [activeThemeName,  setActiveThemeName]  = useState("Cosmic Aurora");
  const [paperMode,        setPaperMode]        = useState(false);
  const lastColorRef = useRef<string>("Cosmic Aurora");
  const [mounted,          setMounted]          = useState(false);
  const [themeOpen,        setThemeOpen]        = useState(false);
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
      } catch {}
      const saved = localStorage.getItem("app-theme") || "Cosmic Aurora";
      const isPaper = localStorage.getItem("paper-mode") === "true";
      setPaperMode(isPaper);
      if (isPaper) {
        setActiveThemeName("Paper");
      } else {
        setActiveThemeName(saved);
        lastColorRef.current = saved;
      }
    };
    load();
    const onTheme = () => {
      const saved = localStorage.getItem("app-theme") || "Cosmic Aurora";
      const isPaper = localStorage.getItem("paper-mode") === "true";
      setPaperMode(isPaper);
      setActiveThemeName(isPaper ? "Paper" : saved);
    };
    window.addEventListener("storage", load);
    window.addEventListener("userPreferencesUpdated", load);
    window.addEventListener("statsUpdated", load);
    window.addEventListener("themeUpdated", onTheme);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("userPreferencesUpdated", load);
      window.removeEventListener("statsUpdated", load);
      window.removeEventListener("themeUpdated", onTheme);
    };
  }, []);

  const handleThemeSelect = (name: string) => {
    if (paperMode) {
      setPaperMode(false);
      localStorage.setItem("paper-mode", "false");
    }
    lastColorRef.current = name;
    setActiveThemeName(name);
    applyThemeByName(name);
    window.dispatchEvent(new Event("themeUpdated"));
  };

  const handlePaperToggle = (checked: boolean) => {
    setPaperMode(checked);
    localStorage.setItem("paper-mode", String(checked));
    if (checked) {
      lastColorRef.current = activeThemeName === "Paper" ? lastColorRef.current : activeThemeName;
      applyThemeByName("Paper");
      setActiveThemeName("Paper");
    } else {
      const prev = lastColorRef.current || "Cosmic Aurora";
      applyThemeByName(prev);
      setActiveThemeName(prev);
    }
    window.dispatchEvent(new Event("themeUpdated"));
  };

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
    /* Outer container — liquid glass pill matching the inspiration */
    <Sidebar
      collapsible="offcanvas"
      data-tutorial="sidebar"
      className="!border-r-0 !border-l-0 !border-none"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* Inner container — same solid bg as page */}
      <div className="flex flex-col h-full px-2 py-2 overflow-hidden"
        style={{ background: "hsl(var(--background))" }}
      >

        {/* ── Header: logo ──────────────────────────────────────── */}
        <SidebarHeader className="h-16 shrink-0 flex flex-col justify-center px-5">
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => router.push("/?force=true")}
              className="flex items-center gap-3.5 pl-1 hover:opacity-80 transition-all active:scale-95"
            >
              <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-lg shadow-primary/30">
                <img src="/tab-icon.png" alt="Analogix" className="w-full h-full object-cover" />
              </div>
              <span className="text-xl font-black gradient-text tracking-tighter">Analogix</span>
            </button>
          </div>
        </SidebarHeader>

        {/* ── Nav ───────────────────────────────────────────────────── */}
        <SidebarContent className="flex-1 px-2 py-3 overflow-y-auto overflow-x-hidden text-foreground custom-scrollbar">
          {navGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <p className="px-2 mb-1 mt-2 text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground/40">
                {group.label}
              </p>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {group.items.map(item => {
                    const activeTab = tabs.find(t => t.id === activeTabId);
                    const isActive = activeTab?.path === item.url || pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <motion.div whileTap={{ scale: 0.97 }} data-tutorial={item.tutorial}>
                          <SidebarMenuButton
                            isActive={false}
                            onClick={(e) => {
                              const meta = pathMeta(item.url);
                              openTab(item.url, meta.label, meta.emoji);
                              router.push(item.url);
                            }}
                            className={cn(
                              "h-9 rounded-xl transition-all duration-200 text-sidebar-foreground/70 font-semibold hover:text-sidebar-foreground"
                            )}
                          >
                            {isActive && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-sidebar-primary" />
                            )}
                            <item.icon
                              className={cn(
                                "w-4 h-4 shrink-0 ml-1 transition-transform",
                                isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70"
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
        <SidebarFooter className="shrink-0 p-3">
          <SidebarMenu className="gap-1.5 mb-2">
            {/* Search button */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setIsCommandMenuOpen(true)}
                className="h-9 rounded-xl transition-colors text-muted-foreground font-semibold text-sm hover:bg-muted/30"
              >
                <Search className="w-4 h-4 shrink-0" />
                <span className="truncate">Search</span>
                <span className="ml-auto text-[10px] opacity-40">⌘K</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* New page button */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setIsNewPageModalOpen(true)}
                className="h-9 rounded-xl transition-colors text-muted-foreground font-semibold text-sm hover:bg-muted/30"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="truncate">New page</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Dark/light toggle */}
            {mounted && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setMode(isDark ? "light" : "dark")}
                  className="h-9 rounded-xl transition-colors text-muted-foreground font-semibold text-sm hover:bg-muted/30"
                >
                  {isDark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
                  <span className="truncate">{isDark ? "Light mode" : "Dark mode"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Colour scheme */}
            <SidebarMenuItem>
              <Popover open={themeOpen} onOpenChange={setThemeOpen}>
                <PopoverTrigger asChild>
                  <SidebarMenuButton className="h-9 rounded-xl transition-colors text-muted-foreground font-semibold text-sm hover:bg-muted/30">
                    <Palette className="w-4 h-4 shrink-0" />
                    <span className="truncate">Colour scheme</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform ml-auto", themeOpen && "rotate-180")} />
                  </SidebarMenuButton>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-64 p-3 glass-card border-transparent shadow-2xl">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Theme</p>

                  {/* Paper toggle */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/40 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-6 h-6 rounded-md flex items-center justify-center transition-colors", paperMode ? "bg-foreground text-background" : "bg-muted text-muted-foreground")}>
                        <Sparkles className="w-3 h-3" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold">Paper</p>
                        <p className="text-[8px] text-muted-foreground">Monochrome</p>
                      </div>
                    </div>
                    <Switch checked={paperMode} onCheckedChange={handlePaperToggle} className="scale-75" />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {themes.filter(t => t.name !== "Paper").map(t => (
                      <button key={t.name} onClick={() => handleThemeSelect(t.name)}
                        className={cn("flex flex-col gap-1 p-1.5 rounded-xl transition-all border text-left",
                          activeThemeName === t.name && !paperMode ? "border-primary/50 bg-primary/8" : paperMode ? "border-border/20 opacity-40" : "border-primary/10 bg-primary/5 hover:bg-primary/10")}>
                        <div className="w-full h-6 rounded-lg" style={{ background: `linear-gradient(135deg, ${t.g[0]}, ${t.g[1]})` }} />
                        <span className={cn("text-[8px] font-black uppercase tracking-tight", activeThemeName === t.name && !paperMode ? "text-primary" : "text-muted-foreground")}>{t.name}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </SidebarMenuItem>
          </SidebarMenu>

          <SidebarSeparator className="my-2" />

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" onClick={() => setProfileOpen(true)} data-tutorial="profile"
                className="h-auto w-full flex items-center gap-3 p-2 rounded-2xl transition-all cursor-pointer">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-xl overflow-hidden">
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
                  <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest truncate">
                    Yr {userData?.grade || "?"} · {userData?.state || "—"}
                  </p>
                </div>
              </SidebarMenuButton>
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
            const [, docId, subjectId] = path.split(":");
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
