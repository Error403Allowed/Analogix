"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, Palette, Sparkles, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { applyThemeByName, themes } from "@/components/ThemeSelector";
import { cn } from "@/lib/utils";

/**
 * Light/dark mode + colour scheme controls for the profile page. Mirrors the
 * theme controls found in the desktop sidebar so mobile viewers can switch
 * appearance without opening the sidebar.
 */
const AppearanceSection = () => {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTheme, setActiveTheme] = useState("Classic Blue");
  const [paperMode, setPaperMode] = useState(false);
  const lastColorTheme = useRef<string>("Classic Blue");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const sync = () => {
      try {
        const saved = localStorage.getItem("app-theme") || "Classic Blue";
        const isPaper = localStorage.getItem("paper-mode") === "true";
        setPaperMode(isPaper);
        if (isPaper) {
          setActiveTheme("Paper");
        } else {
          setActiveTheme(saved);
          lastColorTheme.current = saved;
        }
      } catch {
        /* ignore localStorage errors */
      }
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("themeUpdated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("themeUpdated", sync);
    };
  }, []);

  const isDark = resolvedTheme === "dark";

  const handleThemeSelect = (name: string) => {
    if (paperMode) {
      setPaperMode(false);
      localStorage.setItem("paper-mode", "false");
    }
    lastColorTheme.current = name;
    setActiveTheme(name);
    applyThemeByName(name);
    window.dispatchEvent(new Event("themeUpdated"));
  };

  const handlePaperToggle = (checked: boolean) => {
    setPaperMode(checked);
    localStorage.setItem("paper-mode", String(checked));
    if (checked) {
      lastColorTheme.current = activeTheme === "Paper" ? lastColorTheme.current : activeTheme;
      applyThemeByName("Paper");
      setActiveTheme("Paper");
    } else {
      const prev = lastColorTheme.current || "Classic Blue";
      applyThemeByName(prev);
      setActiveTheme(prev);
    }
    window.dispatchEvent(new Event("themeUpdated"));
  };

  const colorThemes = themes.filter((t) => t.name !== "Paper");

  return (
    <section
      data-testid="appearance-section"
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Palette className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-black tracking-tight text-foreground">Appearance</h2>
      </div>

      <div className="space-y-5 px-4 py-4">
        {/* Light / dark mode */}
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Mode
          </p>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Mode">
            <button
              type="button"
              data-testid="theme-mode-option"
              data-mode="light"
              onClick={() => setTheme("light")}
              aria-pressed={mounted && !isDark}
              className={cn(
                "pressable flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all",
                mounted && !isDark
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/80 bg-card/40 text-foreground/80 hover:border-primary/50"
              )}
            >
              <Sun className="h-4 w-4" />
              Light
            </button>
            <button
              type="button"
              data-testid="theme-mode-option"
              data-mode="dark"
              onClick={() => setTheme("dark")}
              aria-pressed={mounted && isDark}
              className={cn(
                "pressable flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all",
                mounted && isDark
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/80 bg-card/40 text-foreground/80 hover:border-primary/50"
              )}
            >
              <Moon className="h-4 w-4" />
              Dark
            </button>
          </div>
        </div>

        {/* Paper mode */}
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 p-3">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                paperMode ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
              )}
            >
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Paper</p>
              <p className="text-[10px] text-muted-foreground">Distraction-free monochrome</p>
            </div>
          </div>
          <Switch
            data-testid="paper-mode-toggle"
            checked={paperMode}
            onCheckedChange={handlePaperToggle}
          />
        </div>

        {/* Colour scheme */}
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Colour scheme
          </p>
          <div className="grid grid-cols-2 gap-2">
            {colorThemes.map((theme) => (
              <button
                key={theme.name}
                type="button"
                data-testid="theme-option"
                data-theme-name={theme.name}
                onClick={() => handleThemeSelect(theme.name)}
                className={cn(
                  "pressable rounded-xl border p-2 text-left transition-all hover:scale-[1.02]",
                  activeTheme === theme.name && !paperMode
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : paperMode
                      ? "border-border/30 opacity-50"
                      : "border-primary/10 bg-primary/5 hover:border-primary/30"
                )}
              >
                <div
                  className="mb-1.5 h-8 w-full rounded-md"
                  style={{ backgroundImage: `linear-gradient(to right, ${theme.g[0]}, ${theme.g[1]}, ${theme.g[2]})` }}
                />
                <span className="block truncate text-[10px] font-bold text-foreground">{theme.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppearanceSection;
