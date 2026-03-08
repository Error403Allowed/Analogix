"use client";

import {
  LayoutDashboard, MessageCircle, BookOpen, Calendar,
  GraduationCap, Brain, Trophy, ChevronDown, Palette,
  Sun, Moon, BookMarkedIcon, SigmaIcon, User, Flame, Library, Scan,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarGroup, SidebarGroupContent, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useSidebar } from "@/components/ui/sidebar";
import { applyThemeByName } from "@/components/ThemeSelector";
import { themes } from "@/components/ThemeSelector";
import ProfileSheet from "@/components/ProfileSheet";
import ChatHistoryPanel from "@/components/ChatHistoryPanel";

const navGroups = [
  {
    label: "Learn",
    items: [
      { title: "Dashboard",     url: "/dashboard",    icon: LayoutDashboard, tutorial: "dashboard-nav"    },
      { title: "Analogy Tutor", url: "/chat",         icon: MessageCircle,   tutorial: "chat-nav"         },
      { title: "Quizzes",       url: "/quiz",         icon: BookOpen,        tutorial: "quiz-nav"         },
      { title: "Flashcards",    url: "/flashcards",   icon: BookMarkedIcon,  tutorial: "flashcards-nav"   },
      { title: "AR Visualiser", url: "/ar",           icon: Scan,            tutorial: "ar-nav"           },
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
  const { state } = useSidebar();
  const { setTheme: setMode, resolvedTheme } = useTheme();
  const [userData,         setUserData]         = useState<any>(null);
  const [activeThemeName,  setActiveThemeName]  = useState("Cosmic Aurora");
  const [mounted,          setMounted]          = useState(false);
  const [themeOpen,        setThemeOpen]        = useState(false);
  const [profileOpen,      setProfileOpen]      = useState(false);
  const [streak,           setStreak]           = useState(0);
  const isCollapsed = state === "collapsed";
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
      setActiveThemeName(localStorage.getItem("app-theme") || "Cosmic Aurora");
    };
    load();
    const onTheme = () => setActiveThemeName(localStorage.getItem("app-theme") || "Cosmic Aurora");
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
    setActiveThemeName(name);
    applyThemeByName(name);
    window.dispatchEvent(new Event("themeUpdated"));
  };

  const name      = userData?.name || "Student";
  const avatarUrl = userData?.avatarUrl || "";


  return (
    /* Outer container — liquid glass pill matching the inspiration */
    <Sidebar
      collapsible="icon"
      data-tutorial="sidebar"
      className={cn(
        "border-r-0 bg-transparent group-data-[side=left]:border-r-0 group-data-[side=right]:border-l-0",
        /* The sidebar itself gets the glass treatment */
      )}
    >
      {/* Glass inner layer */}
      <div className="flex flex-col h-full mx-2 my-2 rounded-3xl glass-card border-0 shadow-2xl overflow-hidden">

        {/* ── Header: logo + collapse trigger ──────────────────────── */}
        <SidebarHeader className="h-16 shrink-0 flex flex-col justify-center px-5 group-data-[collapsible=icon]:px-2 border-b border-white/10 dark:border-white/5">
          <div className="flex items-center justify-between w-full group-data-[collapsible=icon]:justify-center">
            <button
              onClick={() => router.push("/?force=true")}
              className="flex items-center gap-3.5 pl-1 hover:opacity-80 transition-all active:scale-95 group-data-[collapsible=icon]:hidden"
            >
              <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-lg shadow-primary/30">
                <img src="/tab-icon.png" alt="Analogix" className="w-full h-full object-cover" />
              </div>
              <span className="text-xl font-black gradient-text tracking-tighter">Analogix</span>
            </button>
            <SidebarTrigger
              className="h-8 w-8 rounded-xl border border-primary/20 bg-primary/8 text-primary hover:bg-primary/15 transition-colors"
              data-tutorial="sidebar-trigger"
            />
          </div>
        </SidebarHeader>

        {/* ── Nav ───────────────────────────────────────────────────── */}
        <SidebarContent className="flex-1 px-2 py-3 overflow-x-hidden overflow-y-auto">
          {navGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <p className="px-2 mb-1 mt-2 text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground/40 group-data-[collapsible=icon]:hidden">
                {group.label}
              </p>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {group.items.map(item => {
                    const isActive = pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <motion.div whileTap={{ scale: 0.97 }} data-tutorial={item.tutorial}>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => router.push(item.url)}
                            className={cn(
                              "h-9 rounded-xl transition-all duration-200 relative group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:-translate-x-1.5",
                              isActive
                                ? "bg-primary/12 text-primary font-black"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/5 dark:hover:bg-white/5 font-semibold"
                            )}
                          >
                            {isActive && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-primary group-data-[collapsible=icon]:hidden" />
                            )}
                            <item.icon
                              className={cn(
                                "w-4 h-4 shrink-0 ml-1 transition-transform group-data-[collapsible=icon]:ml-0",
                                isActive ? "text-primary" : "text-muted-foreground/70"
                              )}
                            />
                            <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
                          </SidebarMenuButton>
                        </motion.div>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
          <SidebarGroup className="mt-3">
            <p className="px-2 mb-2 text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground/40 group-data-[collapsible=icon]:hidden">
              General
            </p>
            <SidebarGroupContent>
              {isCollapsed ? (
                <div className="flex flex-col items-center gap-1">
                  {mounted && (
                    <button onClick={() => setMode(isDark ? "light" : "dark")}
                      className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/8 transition-colors text-muted-foreground">
                      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                  )}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/8 transition-colors text-muted-foreground">
                        <Palette className="w-4 h-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start" className="w-56 p-3 glass-card border-white/10 ml-2 shadow-2xl">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Theme</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {themes.map(t => (
                          <button key={t.name} onClick={() => handleThemeSelect(t.name)}
                            className={cn("flex flex-col gap-1 p-1.5 rounded-xl transition-all border text-left",
                              activeThemeName === t.name ? "border-primary/50 bg-primary/8" : "border-white/5 bg-white/5 hover:bg-white/10")}>
                            <div className="w-full h-6 rounded-lg" style={{ background: `linear-gradient(135deg, ${t.g[0]}, ${t.g[1]})` }} />
                            <span className={cn("text-[8px] font-black uppercase tracking-tight", activeThemeName === t.name ? "text-primary" : "text-muted-foreground")}>{t.name}</span>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                <>
                  {/* Dark/light toggle row */}
                  {mounted && (
                    <button onClick={() => setMode(isDark ? "light" : "dark")}
                      className="w-full h-9 flex items-center gap-2.5 px-3 rounded-xl hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground font-semibold text-sm">
                      {isDark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
                      <span className="truncate">{isDark ? "Light mode" : "Dark mode"}</span>
                    </button>
                  )}
                  {/* Colour scheme collapsible */}
                  <button onClick={() => setThemeOpen(o => !o)}
                    className="w-full h-9 flex items-center gap-2.5 px-3 rounded-xl hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground font-semibold text-sm">
                    <Palette className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left truncate">Colour scheme</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform", themeOpen && "rotate-180")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {themeOpen && (
                      <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.2 }} className="overflow-hidden">
                        <div className="px-1 pt-1 grid grid-cols-2 gap-1.5 pb-1">
                          {themes.map(t => (
                            <button key={t.name} onClick={() => handleThemeSelect(t.name)}
                              className={cn("flex flex-col gap-1 p-1.5 rounded-xl transition-all border text-left",
                                activeThemeName === t.name ? "border-primary/50 bg-primary/8" : "border-white/5 bg-white/5 hover:bg-white/10")}>
                              <div className="w-full h-6 rounded-lg" style={{ background: `linear-gradient(135deg, ${t.g[0]}, ${t.g[1]})` }} />
                              <span className={cn("text-[8px] font-black uppercase tracking-tight", activeThemeName === t.name ? "text-primary" : "text-muted-foreground")}>{t.name}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>


        {/* ── Footer: user profile + streak ────────────────────────── */}
        <SidebarFooter className="shrink-0 p-3 border-t border-white/10 dark:border-white/5">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" onClick={() => setProfileOpen(true)} data-tutorial="profile"
                className="h-auto w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-white/8 transition-all cursor-pointer group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1.5">
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
                    <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-amber-500 flex items-center justify-center px-1 shadow-md group-data-[collapsible=icon]:hidden">
                      <span className="text-[8px] font-black text-white leading-none flex items-center gap-0.5">
                        <Flame className="w-2.5 h-2.5" />{streak}
                      </span>
                    </div>
                  )}
                </div>
                {/* Name + meta */}
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="text-sm font-black text-foreground truncate leading-tight">{name}</p>
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
    </Sidebar>
  );
}
