"use client";

import {
  LayoutDashboard,
  MessageCircle,
  BookOpen,
  Calendar,
  GraduationCap,
  Timer,
  Settings,
  User,
  Sparkles,
  Brain,
  Trophy,
  ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const mainItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Analogy Tutor",
    url: "/chat",
    icon: MessageCircle,
  },
  {
    title: "Quizzes",
    url: "/quiz",
    icon: BookOpen,
  },
  {
    title: "Calendar",
    url: "/calendar",
    icon: Calendar,
  },
];

const schoolItems = [
  {
    title: "My Subjects",
    url: "/subjects",
    icon: GraduationCap,
  },
  {
    title: "Achievements",
    url: "/achievements",
    icon: Trophy,
  },
];

import { useTheme } from "next-themes";
import { Moon, Sun, Palette } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { moodProfiles, getStoredMoodId, applyMoodVisuals, MoodId } from "@/utils/mood";
import { applyThemeByName } from "@/components/ThemeSelector";

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { state } = useSidebar();
  const { theme: mode, setTheme: setMode, resolvedTheme } = useTheme();
  const [userData, setUserData] = useState<any>(null);
  const [selectedMood, setSelectedMood] = useState<MoodId>("focused");
  const [activeThemeName, setActiveThemeName] = useState("Classic Blue");
  const isCollapsed = state === "collapsed";

  useEffect(() => {
    const loadPrefs = () => {
      const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
      setUserData(prefs);
    };
    
    loadPrefs();
    const initialMood = getStoredMoodId();
    setSelectedMood(initialMood);
    applyMoodVisuals(initialMood);
    setActiveThemeName(localStorage.getItem("app-theme") || "Classic Blue");
    
    window.addEventListener("storage", loadPrefs);
    window.addEventListener("userPreferencesUpdated", loadPrefs);
    
    const handleMoodChange = () => setSelectedMood(getStoredMoodId());
    window.addEventListener("moodUpdated", handleMoodChange);

    const handleThemeChange = () => setActiveThemeName(localStorage.getItem("app-theme") || "Classic Blue");
    window.addEventListener("themeUpdated", handleThemeChange);
    
    return () => {
      window.removeEventListener("storage", loadPrefs);
      window.removeEventListener("userPreferencesUpdated", loadPrefs);
      window.removeEventListener("moodUpdated", handleMoodChange);
      window.removeEventListener("themeUpdated", handleThemeChange);
    };
  }, []);

  const handleMoodSelect = (moodId: MoodId) => {
    setSelectedMood(moodId);
    localStorage.setItem("mood-theme", moodId);
    applyThemeByName(moodProfiles[moodId].theme);
    applyMoodVisuals(moodId);
    window.dispatchEvent(new Event("moodUpdated"));
  };

  const handleThemeSelect = (themeName: string) => {
    setActiveThemeName(themeName);
    applyThemeByName(themeName);
    window.dispatchEvent(new Event("themeUpdated"));
  };

  const name = userData?.name || "Student";
  const isDark = resolvedTheme === "dark";

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 bg-background/95 backdrop-blur-sm">
      <SidebarHeader className="h-20 flex items-center px-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center transition-all duration-300">
        <button 
          onClick={() => router.push("/?force=true")}
          className="flex items-center gap-3 mt-4 group-data-[collapsible=icon]:mt-0 hover:opacity-80 transition-all active:scale-95 text-left"
        >
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-black gradient-text tracking-tighter group-data-[collapsible=icon]:hidden">
            Analogix
          </span>
        </button>
      </SidebarHeader>
      
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-2 group-data-[collapsible=icon]:hidden">
            Learning
          </SidebarGroupLabel>
          <SidebarGroupContent tabIndex={-1}>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <SidebarMenuButton
                      isActive={pathname === item.url}
                      tooltip={item.title}
                      onClick={() => router.push(item.url)}
                      className={cn(
                        "h-10 rounded-xl transition-all duration-200 group-data-[collapsible=icon]:justify-center",
                        pathname === item.url 
                          ? "bg-primary/10 text-primary shadow-sm" 
                          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn("w-5 h-5", pathname === item.url ? "text-primary" : "text-muted-foreground")} />
                      <span className="font-bold group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </SidebarMenuButton>
                  </motion.div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-2 group-data-[collapsible=icon]:hidden">
            School
          </SidebarGroupLabel>
          <SidebarGroupContent tabIndex={-1}>
            <SidebarMenu>
              {schoolItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <SidebarMenuButton
                      isActive={pathname === item.url}
                      tooltip={item.title}
                      onClick={() => router.push(item.url)}
                      className={cn(
                        "h-10 rounded-xl transition-all duration-200 group-data-[collapsible=icon]:justify-center",
                        pathname === item.url 
                          ? "bg-primary/10 text-primary shadow-sm" 
                          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn("w-5 h-5", pathname === item.url ? "text-primary" : "text-muted-foreground")} />
                      <span className="font-bold group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </SidebarMenuButton>
                  </motion.div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-8">
          <SidebarGroupLabel className="px-4 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 group-data-[collapsible=icon]:hidden">
            <span>Themes</span>
            <button 
              onClick={() => setMode(isDark ? "light" : "dark")}
              className="hover:text-primary transition-colors p-1"
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </SidebarGroupLabel>
          <SidebarGroupContent className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <SidebarMenu className="group-data-[collapsible=icon]:w-auto">
              <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                 <ThemeSelectorSidebar 
                   activeThemeName={activeThemeName} 
                   onSelect={handleThemeSelect} 
                   isDark={isDark} 
                   setMode={setMode}
                 />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-0 pb-8 mt-auto flex justify-center">
        <SidebarMenu className="w-full">
          <SidebarMenuItem className="flex justify-center">
            <SidebarMenuButton
              size="lg"
              className="h-14 w-full flex items-center justify-start px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 hover:bg-primary/5 transition-all"
            >
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0 ml-3 group-data-[collapsible=icon]:hidden text-left">
                <p className="text-sm font-black text-foreground truncate">{name}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Year {userData?.grade || "7-12"}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-data-[collapsible=icon]:hidden mr-2" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function ThemeSelectorSidebar({ activeThemeName, onSelect, isDark, setMode }: { 
  activeThemeName: string, 
  onSelect: (name: string) => void,
  isDark: boolean,
  setMode: (mode: string) => void
}) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-4">
        <button 
          onClick={() => setMode(isDark ? "light" : "dark")}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground">
              <Palette className="w-5 h-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" align="start" className="w-64 p-4 glass-card border-white/10 ml-2 shadow-2xl">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Select Colour</h4>
            <div className="grid grid-cols-2 gap-2">
              {themes.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => onSelect(theme.name)}
                  className={cn(
                    "flex flex-col gap-1.5 p-2 rounded-xl transition-all border text-left",
                    activeThemeName === theme.name 
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                      : "border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20"
                  )}
                >
                  <div 
                    className="w-full h-8 rounded-lg"
                    style={{ background: `linear-gradient(135deg, ${theme.g[0]}, ${theme.g[1]})` }}
                  />
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-tight truncate",
                    activeThemeName === theme.name ? "text-primary" : "text-muted-foreground"
                  )}>
                    {theme.name}
                  </span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="px-1 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {themes.map((theme) => (
          <button
            key={theme.name}
            onClick={() => onSelect(theme.name)}
            className={cn(
              "flex flex-col gap-2 p-2 rounded-xl transition-all border text-left group",
              activeThemeName === theme.name 
                ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                : "border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20"
            )}
          >
            <div 
              className="w-full h-8 rounded-lg opacity-80 group-hover:opacity-100 transition-opacity"
              style={{ background: `linear-gradient(135deg, ${theme.g[0]}, ${theme.g[1]})` }}
            />
            <span className={cn(
              "text-[9px] font-black uppercase tracking-tighter truncate",
              activeThemeName === theme.name ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            )}>
              {theme.name.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { themes } from "@/components/ThemeSelector";
