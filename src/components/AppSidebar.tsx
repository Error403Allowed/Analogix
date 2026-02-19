"use client";

import {
  LayoutDashboard, MessageCircle, BookOpen, Calendar,
  GraduationCap, User, Brain, Trophy, ChevronRight,
  ChevronDown, Palette, Sun, Moon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarGroup, SidebarGroupContent,
} from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useSidebar } from "@/components/ui/sidebar";
import { applyThemeByName } from "@/components/ThemeSelector";
import { themes } from "@/components/ThemeSelector";

const mainItems = [
  { title: "Dashboard",    url: "/dashboard", icon: LayoutDashboard },
  { title: "Analogy Tutor",url: "/chat",      icon: MessageCircle   },
  { title: "Quizzes",      url: "/quiz",      icon: BookOpen        },
  { title: "Calendar",     url: "/calendar",  icon: Calendar        },
  { title: "My Subjects",  url: "/subjects",   icon: GraduationCap   },
  { title: "Achievements", url: "/achievements", icon: Trophy        },
];

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { state } = useSidebar();
  const { setTheme: setMode, resolvedTheme } = useTheme();
  const [userData, setUserData] = useState<any>(null);
  const [activeThemeName, setActiveThemeName] = useState("Classic Blue");
  const [mounted, setMounted] = useState(false);
  const [themeOpen, setThemeOpen] = useState(true);
  const isCollapsed = state === "collapsed";
  const isDark = resolvedTheme === "dark";

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const loadPrefs = () => setUserData(JSON.parse(localStorage.getItem("userPreferences") || "{}"));
    loadPrefs();
    setActiveThemeName(localStorage.getItem("app-theme") || "Classic Blue");

    const onTheme = () => setActiveThemeName(localStorage.getItem("app-theme") || "Classic Blue");

    window.addEventListener("storage", loadPrefs);
    window.addEventListener("userPreferencesUpdated", loadPrefs);
    window.addEventListener("themeUpdated", onTheme);
    return () => {
      window.removeEventListener("storage", loadPrefs);
      window.removeEventListener("userPreferencesUpdated", loadPrefs);
      window.removeEventListener("themeUpdated", onTheme);
    };
  }, []);

  const handleThemeSelect = (name: string) => {
    setActiveThemeName(name);
    applyThemeByName(name);
    window.dispatchEvent(new Event("themeUpdated"));
  };

  const name = userData?.name || "Student";

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 bg-background/95 backdrop-blur-sm">
      {/* Logo */}
      <SidebarHeader className="h-20 flex items-center px-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center transition-all duration-300">
        <button onClick={() => router.push("/?force=true")}
          className="flex items-center gap-3 mt-4 group-data-[collapsible=icon]:mt-0 hover:opacity-80 transition-all active:scale-95 text-left">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-black gradient-text tracking-tighter group-data-[collapsible=icon]:hidden">Analogix</span>
        </button>
      </SidebarHeader>

      <SidebarContent className="px-2 overflow-x-hidden">

        {/* Learning nav */}
        <SidebarGroup>
          <p className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-2 group-data-[collapsible=icon]:hidden">Learning</p>
          <SidebarGroupContent tabIndex={-1}>
            <SidebarMenu>
              {mainItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <SidebarMenuButton isActive={pathname === item.url} onClick={() => router.push(item.url)}
                      className={cn("h-10 rounded-xl transition-all duration-200 group-data-[collapsible=icon]:justify-center overflow-hidden",
                        pathname === item.url ? "bg-primary/10 text-primary shadow-sm" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground")}>
                      <item.icon className={cn("w-5 h-5 shrink-0", pathname === item.url ? "text-primary" : "text-muted-foreground")} />
                      <span className="font-bold truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </SidebarMenuButton>
                  </motion.div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Colour Scheme ── */}
        {isCollapsed ? (
          <SidebarGroup className="mt-2">
            <SidebarGroupContent className="flex flex-col items-center gap-2">
              {mounted && (
                <button onClick={() => setMode(isDark ? "light" : "dark")}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground">
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              )}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground" title="Colour scheme">
                    <Palette className="w-5 h-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="right" align="start" className="w-64 p-4 glass-card border-white/10 ml-2 shadow-2xl">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">Colour Scheme</p>
                  <div className="grid grid-cols-2 gap-2">
                    {themes.map(t => (
                      <button key={t.name} onClick={() => handleThemeSelect(t.name)}
                        className={cn("flex flex-col gap-1.5 p-2 rounded-xl transition-all border text-left",
                          activeThemeName === t.name ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-white/5 bg-white/5 hover:bg-white/10")}>
                        <div className="w-full h-7 rounded-lg" style={{ background: `linear-gradient(135deg, ${t.g[0]}, ${t.g[1]})` }} />
                        <span className={cn("text-[8px] font-black uppercase tracking-tight truncate", activeThemeName === t.name ? "text-primary" : "text-muted-foreground")}>{t.name}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <SidebarGroup className="mt-2">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setThemeOpen(o => !o)}
              onKeyDown={e => (e.key === "Enter" || e.key === " ") && setThemeOpen(o => !o)}
              className="flex items-center justify-between w-full px-2 mb-2 group cursor-pointer"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">Colour Scheme</span>
              <div className="flex items-center gap-1.5">
                {mounted && (
                  <button onClick={e => { e.stopPropagation(); setMode(isDark ? "light" : "dark"); }}
                    className="hover:text-primary transition-colors p-0.5 text-muted-foreground/40">
                    {isDark ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                  </button>
                )}
                <ChevronDown className={cn("w-3 h-3 text-muted-foreground/40 transition-transform", themeOpen && "rotate-180")} />
              </div>
            </div>
            <AnimatePresence initial={false}>
              {themeOpen && (
                <motion.div key="theme-grid" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="px-1 grid grid-cols-2 gap-2 pb-2">
                    {themes.map(t => (
                      <button key={t.name} onClick={() => handleThemeSelect(t.name)}
                        className={cn("flex flex-col gap-1.5 p-2 rounded-xl transition-all border text-left group",
                          activeThemeName === t.name ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20")}>
                        <div className="w-full h-7 rounded-lg opacity-80 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(135deg, ${t.g[0]}, ${t.g[1]})` }} />
                        <span className={cn("text-[9px] font-black uppercase tracking-tighter truncate", activeThemeName === t.name ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}>
                          {t.name.split(" ")[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SidebarGroup>
        )}

      </SidebarContent>

      {/* User footer */}
      <SidebarFooter className="p-0 pb-8 mt-auto flex justify-center">
        <SidebarMenu className="w-full">
          <SidebarMenuItem className="flex justify-center">
            <SidebarMenuButton size="lg"
              className="h-14 w-full flex items-center justify-start px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 hover:bg-primary/5 transition-all overflow-hidden">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0 ml-3 group-data-[collapsible=icon]:hidden text-left overflow-hidden">
                <p className="text-sm font-black text-foreground truncate">{name}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Year {userData?.grade || "7-12"}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-data-[collapsible=icon]:hidden mr-2 shrink-0" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
