"use client";

import {
  LayoutDashboard, MessageCircle, Calendar,
  GraduationCap, Trophy, ChevronDown, Palette,
  Sun, Moon, User, Flame, Library, SigmaIcon, SquareStack, ClipboardList,
  Plus, Search, Sparkles, Users, PanelLeft, X,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarGroup, SidebarGroupContent, SidebarSeparator,
  SidebarRail, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import { applyThemeByName } from "@/components/theme/ThemeSelector";
import { themes } from "@/components/theme/ThemeSelector";
import ProfileSheet from "@/components/settings/ProfileSheet";
import { NewPageModal } from "@/components/shared/NewPageModal";
import { useTabs, pathMeta } from "@/context/TabsContext";
import { subjectStore, type SubjectData } from "@/utils/subjectStore";
import { useProfileAvatar } from "@/hooks/useProfileAvatar";
import { toast } from "sonner";

import { CommandMenu } from "@/components/shared/CommandMenu";

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
  const [userData,         setUserData]         = useState<any>(null);
  const [activeThemeName,  setActiveThemeName]  = useState("Ocean");
  const [paperMode,        setPaperMode]        = useState(false);
  const lastColorRef = useRef<string>("Ocean");
  const [mounted,          setMounted]          = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [themeOpen,        setThemeOpen]        = useState(false);
  const [profileOpen,      setProfileOpen]      = useState(false);
  const [streak,           setStreak]           = useState(0);
  const [isNewPageModalOpen, setIsNewPageModalOpen] = useState(false);
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const load = () => {
      try {
        const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
        setUserData(prefs);
        const stats = JSON.parse(localStorage.getItem("analogix_user_stats_v1") || "{}");
        setStreak(Number(stats.currentStreak) || 0);
      } catch { /* ignore localStorage errors */ }
      const saved = localStorage.getItem("app-theme") || "Ocean";
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
      const saved = localStorage.getItem("app-theme") || "Ocean";
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
      const prev = lastColorRef.current || "Ocean";
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
      setOpenMobile(false);
      // Force refresh sidebar state
      const data = await subjectStore.getAll();
      setSubjects(data);
      openTab(`/subjects/${subjectId}/document/${created.id}`, title, "📄");
      router.push(`/subjects/${subjectId}/document/${created.id}`);
    } catch {
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
  const grade     = userData?.grade;
  const avatarUrl = useProfileAvatar() || userData?.avatarUrl || "";
  const { toggleSidebar, setOpenMobile, isMobile, state } = useSidebar();


  return (
    /* Outer container - cleaner dark-friendly glass panel */
    <Sidebar
      collapsible="icon"
      data-tutorial="sidebar"
      className="!border-r-0 !border-l-0 !border-none rounded-xl border border-white/10 bg-background/95 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl dark:border-slate-800/60 group-data-[collapsible=icon]:rounded-lg"
      style={{ background: "hsl(var(--background) / 0.95)" }}
    >
      {/* Inner container - clearer spacing and soft backdrop */}
      <div className="flex flex-col h-full px-3 py-3 overflow-hidden space-y-3 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-1.5 group-data-[collapsible=icon]:space-y-1.5"
        style={{ background: "hsl(var(--background) / 0.94)" }}
      >

        {/* ── Header: logo ──────────────────────────────────── */}
        <SidebarHeader className="h-20 shrink-0 flex flex-col justify-center px-4 pb-2 border-b border-muted/15 group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0.5 group-data-[collapsible=icon]:border-b-0">
          <div className="flex items-center w-full justify-between group-data-[collapsible=icon]:justify-center">
            <button
              onClick={() => {
                if (state === "expanded") {
                  router.push("/");
                  setOpenMobile(false);
                } else {
                  toggleSidebar();
                }
              }}
              className="group/logo flex items-center gap-3.5 rounded-3xl px-3 py-2 hover:bg-muted/30 transition-all active:scale-[0.98] group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-lg"
            >
              <div className="w-10 h-10 shrink-0 relative group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:h-6">
                <img src="/tab-icon.png" alt="Analogix" className="w-full h-full object-contain group-data-[collapsible=icon]:group-hover/logo:opacity-0 group-data-[collapsible=icon]:group-hover/logo:scale-75 transition-all duration-200" />
                <PanelLeft className="absolute inset-0 w-full h-full p-0 opacity-0 scale-75 group-data-[collapsible=icon]:group-hover/logo:opacity-100 group-data-[collapsible=icon]:group-hover/logo:scale-100 transition-all duration-200 text-primary" />
              </div>
              {state === "expanded" && (
                <span className="gradient-primary bg-clip-text text-xl font-black tracking-tight text-transparent">
                  Analogix
                </span>
              )}
            </button>
            {isMobile ? (
              <button
                type="button"
                onClick={() => setOpenMobile(false)}
                aria-label="Close sidebar"
                className="-mr-1 flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/30 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <SidebarTrigger className="-mr-1 group-data-[collapsible=icon]:hidden" />
            )}
          </div>
        </SidebarHeader>

        {/* ── Nav ───────────────────────────────────────────────────── */}
        <SidebarContent className="flex-1 px-1 py-2 overflow-y-auto overflow-x-hidden text-foreground custom-scrollbar group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0">
          {navGroups.map((group) => (
            <SidebarGroup key={group.label} className="rounded-xl border border-muted/15 bg-muted/10 p-3 mb-3 group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:mb-0">
              {state === "expanded" && (
                <p className="px-2 mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/70">
                  {group.label}
                </p>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-2 group-data-[collapsible=icon]:gap-1.5 group-data-[collapsible=icon]:items-center">
                  {group.items.map(item => {
                    const activeTab = tabs.find(t => t.id === activeTabId);
                    const isActive = activeTab?.path === item.url || pathname === item.url;
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          isActive={isActive}
                          tooltip={item.title}
                          onClick={() => {
                            const meta = pathMeta(item.url);
                            openTab(item.url, meta.label, meta.emoji);
                            router.push(item.url);
                            setOpenMobile(false);
                          }}
                          className={cn(
                            "min-h-[46px] rounded-xl px-4 transition-all duration-200 font-semibold text-sidebar-foreground/80 group-data-[collapsible=icon]:min-h-0 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:px-0",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-lg shadow-sidebar-accent/15"
                              : "bg-transparent hover:bg-sidebar-accent/20 hover:text-sidebar-foreground"
                          )}
                        >
                          <Icon
                            className={cn(
                              "w-5 h-5 shrink-0 transition-colors",
                              isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/70"
                            )}
                          />
                          <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        {/* ── Footer: user profile + streak ────────────────────────── */}
          <SidebarFooter className="shrink-0 px-4 py-4 space-y-3 border-t border-muted/15 bg-background/90 backdrop-blur-xl group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-1.5 group-data-[collapsible=icon]:space-y-1.5 group-data-[collapsible=icon]:overflow-hidden">
          <SidebarMenu className="gap-2 mb-1 group-data-[collapsible=icon]:gap-1.5 group-data-[collapsible=icon]:items-center">
            {/* Search button */}
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Search"
                onClick={() => setIsCommandMenuOpen(true)}
                className="min-h-[46px] rounded-2xl px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/30 group-data-[collapsible=icon]:min-h-0 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:px-0"
              >
                <Search className="w-4 h-4 shrink-0" />
                <span className="truncate group-data-[collapsible=icon]:hidden">Search</span>
                <span className="ml-auto text-[10px] opacity-50 group-data-[collapsible=icon]:hidden">⌘K</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* New page button */}
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="New page"
                onClick={() => setIsNewPageModalOpen(true)}
                className="min-h-[46px] rounded-2xl px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/30 group-data-[collapsible=icon]:min-h-0 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:px-0"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="truncate group-data-[collapsible=icon]:hidden">New page</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Dark/light toggle */}
            {mounted && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={isDark ? "Light mode" : "Dark mode"}
                  onClick={() => setMode(isDark ? "light" : "dark")}
                  className="min-h-[46px] rounded-2xl px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/30 group-data-[collapsible=icon]:min-h-0 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:px-0"
                >
                  {isDark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
                  <span className="truncate group-data-[collapsible=icon]:hidden">{isDark ? "Light mode" : "Dark mode"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Colour scheme */}
            <SidebarMenuItem>
              <Popover open={themeOpen} onOpenChange={setThemeOpen}>
                <PopoverTrigger asChild>
                  <SidebarMenuButton tooltip="Colour scheme" className="min-h-[46px] rounded-2xl px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/30 group-data-[collapsible=icon]:min-h-0 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:px-0">
                    <Palette className="w-4 h-4 shrink-0" />
                    <span className="truncate group-data-[collapsible=icon]:hidden">Colour scheme</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform ml-auto", themeOpen && "rotate-180", "group-data-[collapsible=icon]:hidden")} />
                  </SidebarMenuButton>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-64 p-3 glass-card border border-muted/20 shadow-2xl bg-background/95 backdrop-blur-xl">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">Theme</p>

                  {/* Paper toggle */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/40 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-2xl flex items-center justify-center transition-colors", paperMode ? "bg-foreground text-background" : "bg-muted text-muted-foreground") }>
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold">Paper</p>
                        <p className="text-[8px] text-muted-foreground">Monochrome mode</p>
                      </div>
                    </div>
                    <Switch checked={paperMode} onCheckedChange={handlePaperToggle} className="scale-95" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {themes.filter(t => t.name !== "Paper").map(t => (
                      <button key={t.name} onClick={() => handleThemeSelect(t.name)}
                        className={cn("flex flex-col gap-1.5 p-2 rounded-2xl transition-all border text-left",
                          activeThemeName === t.name && !paperMode ? "border-primary/50 bg-primary/10" : paperMode ? "border-border/20 opacity-50" : "border-muted/20 bg-muted/10 hover:bg-muted/20")}
                      >
                        <div className="w-full h-7 rounded-xl" style={{ background: `linear-gradient(135deg, ${t.g[0]}, ${t.g[1]})` }} />
                        <span className={cn("text-[9px] font-black uppercase tracking-tight", activeThemeName === t.name && !paperMode ? "text-primary" : "text-muted-foreground")}>{t.name}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </SidebarMenuItem>
          </SidebarMenu>

          <SidebarSeparator className="my-2 border-muted/15 group-data-[collapsible=icon]:my-1" />

          <SidebarMenu className="group-data-[collapsible=icon]:items-center">
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" tooltip={name} onClick={() => setProfileOpen(true)} data-tutorial="profile"
                className="h-auto w-full flex items-center gap-3 p-3 rounded-xl border border-muted/20 bg-muted/10 transition-all hover:bg-muted/20 text-foreground cursor-pointer group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:justify-center"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-2xl overflow-hidden bg-muted group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:rounded-lg">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full gradient-primary flex items-center justify-center">
                        <User className="w-4 h-4 text-white group-data-[collapsible=icon]:w-3.5 group-data-[collapsible=icon]:h-3.5" />
                      </div>
                    )}
                  </div>
                  {/* Streak badge - like the inspiration's percentage badge */}
                  {streak > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-gradient-to-br from-[var(--growth-light)] to-[var(--growth-deep)] flex items-center justify-center px-1 shadow-md group-data-[collapsible=icon]:-top-1 group-data-[collapsible=icon]:-right-1 group-data-[collapsible=icon]:min-w-[14px] group-data-[collapsible=icon]:h-[14px] group-data-[collapsible=icon]:px-0.5">
                      <span className="text-[8px] font-black text-white leading-none flex items-center gap-0.5 group-data-[collapsible=icon]:text-[6px]">
                        <Flame className="w-2.5 h-2.5 group-data-[collapsible=icon]:w-2 group-data-[collapsible=icon]:h-2" />{streak}
                      </span>
                    </div>
                  )}
                </div>
                {/* Name + meta */}
                {state === "expanded" && (
                  <div className="flex-1 min-w-0 text-foreground">
                    <p className="truncate text-sm font-bold leading-tight">{name}</p>
                    {grade ? (
                      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/80">
                        Year {grade}
                      </p>
                    ) : null}
                  </div>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

      </div>{/* end glass inner layer */}
      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />

      {typeof document !== "undefined" && createPortal(
        <>
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
              setOpenMobile(false);
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
        </>,
        document.body
      )}
      <SidebarRail />
    </Sidebar>
  );
}