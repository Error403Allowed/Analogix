import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Check, Settings2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

type HSL = { h: string; s: string; l: string };
type Theme = {
  name: string;
  p: HSL;
  g: [string, string, string];
  accent: HSL;
  accent2: HSL;
  success: HSL;
  warning: HSL;
  danger: HSL;
  muted: HSL;
  mutedFg: HSL;
  charts?: string[];
  bg?: [string, string, string];
  bgDark?: [string, string, string];
  glass?: {
    bg?: string;
    tint?: string;
    border?: string;
    darkBg?: string;
    darkTint?: string;
    darkBorder?: string;
  };
};

const hsl = (h: number | string, s: number | string, l: number | string): HSL => ({
  h: String(h),
  s: typeof s === "number" ? `${s}%` : s,
  l: typeof l === "number" ? `${l}%` : l,
});

const hslValue = (value: HSL) => `${value.h} ${value.s} ${value.l}`;
const hslColor = (value: HSL) => `hsl(${hslValue(value)})`;

const hexToRgba = (hex: string, alpha: number) => {
  const cleaned = hex.replace("#", "");
  const full = cleaned.length === 3 ? cleaned.split("").map((c) => c + c).join("") : cleaned;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const withDerived = (theme: Theme): Theme => {
  const bg = theme.bg ?? [
    hexToRgba(theme.g[0], 0.16),
    hexToRgba(theme.g[1], 0.12),
    hexToRgba(theme.g[2], 0.1),
  ];
  const bgDark = theme.bgDark ?? [
    hexToRgba(theme.g[0], 0.045),
    hexToRgba(theme.g[1], 0.035),
    hexToRgba(theme.g[2], 0.025),
  ];
  const glass = theme.glass ?? {
    bg: "rgba(255,255,255,0.72)",
    tint: hexToRgba(theme.g[0], 0.12),
    border: hexToRgba(theme.g[0], 0.20),
    darkBg: "rgba(18,28,46,0.88)",
    darkTint: hexToRgba(theme.g[0], 0.06),
    darkBorder: hexToRgba(theme.g[0], 0.15),
  };
  const charts = theme.charts ?? [
    theme.g[0],
    theme.g[1],
    theme.g[2],
    hslColor(theme.accent),
    hslColor(theme.warning),
    hslColor(theme.danger),
  ];
  return { ...theme, bg, bgDark, glass, charts };
};

export const themes = [
  withDerived({
    name: "Classic Blue",
    p: hsl(221.2, 83.2, 53.3),
    g: ["#2563eb", "#4f46e5", "#4338ca"],
    accent: hsl(197, 82, 45),
    accent2: hsl(262, 83, 66),
    success: hsl(142, 71, 45),
    warning: hsl(38, 92, 55),
    danger: hsl(0, 84, 60),
    muted: hsl(220, 26, 96),
    mutedFg: hsl(215, 18, 42),
  }),
  withDerived({
    name: "Sunset Ember",
    p: hsl(15, 91, 60),
    g: ["#f97316", "#f43f5e", "#e11d48"],
    accent: hsl(330, 78, 58),
    accent2: hsl(38, 95, 60),
    success: hsl(142, 70, 42),
    warning: hsl(28, 90, 55),
    danger: hsl(0, 82, 58),
    muted: hsl(20, 30, 96),
    mutedFg: hsl(10, 18, 42),
  }),
  withDerived({
    name: "Oceanic Blue",
    p: hsl(199, 89, 48),
    g: ["#38bdf8", "#0ea5e9", "#0369a1"],
    accent: hsl(176, 72, 42),
    accent2: hsl(220, 78, 60),
    success: hsl(158, 64, 42),
    warning: hsl(40, 92, 56),
    danger: hsl(0, 82, 58),
    muted: hsl(205, 30, 95),
    mutedFg: hsl(210, 18, 42),
    bg: [
      hexToRgba("#38bdf8", 0.28),
      hexToRgba("#0ea5e9", 0.20),
      hexToRgba("#0369a1", 0.18),
    ],
    bgDark: [
      hexToRgba("#38bdf8", 0.10),
      hexToRgba("#0ea5e9", 0.08),
      hexToRgba("#0369a1", 0.06),
    ],
    glass: {
      bg: "rgba(235, 248, 255, 0.80)",
      tint: "rgba(56, 189, 248, 0.18)",
      border: "rgba(14, 165, 233, 0.25)",
      darkBg: "rgba(7, 20, 40, 0.88)",
      darkTint: "rgba(56, 189, 248, 0.10)",
      darkBorder: "rgba(56, 189, 248, 0.18)",
    },
  }),
  withDerived({
    name: "Forest Glow",
    p: hsl(142, 71, 45),
    g: ["#16a34a", "#22c55e", "#15803d"],
    accent: hsl(96, 62, 42),
    accent2: hsl(180, 70, 38),
    success: hsl(142, 72, 40),
    warning: hsl(45, 90, 55),
    danger: hsl(0, 82, 58),
    muted: hsl(140, 20, 95),
    mutedFg: hsl(150, 16, 40),
  }),
  withDerived({
    name: "Cyber Neon",
    p: hsl(292, 91, 50),
    g: ["#d946ef", "#c026d3", "#a21caf"],
    accent: hsl(186, 90, 45),
    accent2: hsl(320, 90, 60),
    success: hsl(152, 70, 40),
    warning: hsl(38, 92, 55),
    danger: hsl(0, 82, 58),
    muted: hsl(285, 18, 96),
    mutedFg: hsl(280, 16, 42),
  }),
  withDerived({
    name: "Midnight Gold",
    p: hsl(45, 93, 47),
    g: ["#fbbf24", "#f59e0b", "#d97706"],
    accent: hsl(210, 82, 45),
    accent2: hsl(18, 86, 58),
    success: hsl(152, 64, 42),
    warning: hsl(45, 92, 52),
    danger: hsl(0, 82, 58),
    muted: hsl(45, 25, 95),
    mutedFg: hsl(35, 20, 40),
  }),
  withDerived({
    name: "Coral Blush",
    p: hsl(3, 76, 70),
    g: ["#ef7b76", "#e8605a", "#f4a09c"],
    accent: hsl(340, 72, 60),
    accent2: hsl(28, 90, 60),
    success: hsl(150, 66, 45),
    warning: hsl(30, 90, 55),
    danger: hsl(0, 82, 58),
    muted: hsl(10, 24, 96),
    mutedFg: hsl(10, 18, 44),
  }),
  withDerived({
    name: "Cosmic Aurora",
    p: hsl(172, 88, 45),
    g: ["#2dd4bf", "#3b82f6", "#a855f7"],
    accent: hsl(250, 80, 62),
    accent2: hsl(200, 90, 50),
    success: hsl(152, 64, 42),
    warning: hsl(38, 92, 55),
    danger: hsl(0, 82, 58),
    muted: hsl(190, 24, 95),
    mutedFg: hsl(210, 18, 42),
  }),
  withDerived({
    name: "Candy Pop",
    p: hsl(316, 91, 60),
    g: ["#ec4899", "#facc15", "#06b6d4"],
    accent: hsl(50, 92, 55),
    accent2: hsl(185, 80, 45),
    success: hsl(152, 68, 42),
    warning: hsl(45, 92, 55),
    danger: hsl(0, 82, 58),
    muted: hsl(320, 20, 96),
    mutedFg: hsl(320, 18, 42),
  }),
  withDerived({
    name: "Prismatic",
    p: hsl(280, 90, 60),
    g: ["#ff005d", "#7c3aed", "#06b6d4"],
    accent: hsl(200, 90, 50),
    accent2: hsl(20, 90, 55),
    success: hsl(152, 64, 42),
    warning: hsl(45, 92, 55),
    danger: hsl(0, 82, 58),
    muted: hsl(280, 18, 96),
    mutedFg: hsl(275, 16, 42),
  }),
  // Paper — Notion-inspired monochrome, warm grays, distraction-free
  // Uses the same CSS variable system as all other themes — only the values differ
  withDerived({
    name: "Paper",
    p: hsl(40, 5, 20),
    g: ["#373530", "#787774", "#9B9B9B"],
    accent: hsl(40, 5, 96),
    accent2: hsl(30, 4, 85),
    success: hsl(145, 20, 35),
    warning: hsl(35, 50, 45),
    danger: hsl(5, 50, 50),
    muted: hsl(40, 5, 96),
    mutedFg: hsl(40, 4, 46),
    bg: ["rgba(120,119,116,0.06)", "rgba(120,119,116,0.04)", "rgba(120,119,116,0.02)"],
    bgDark: ["rgba(255,255,255,0.04)", "rgba(255,255,255,0.03)", "rgba(255,255,255,0.02)"],
    glass: {
      bg: "rgba(255,255,255,0.92)",
      tint: "rgba(55,53,48,0.03)",
      border: "rgba(55,53,48,0.08)",
      darkBg: "rgba(25,25,25,0.95)",
      darkTint: "rgba(255,255,255,0.03)",
      darkBorder: "rgba(255,255,255,0.06)",
    },
    charts: ["#373530", "#787774", "#9B9B9B", "#A6A299", "#C8C7C3", "#E9E9E7"],
  }),
];

export const applyThemeByName = (themeName: string) => {
  const theme = themes.find(t => t.name === themeName);
  if (!theme) return;

  const root = document.documentElement;

  const pickForeground = (l: string) => (parseFloat(l) >= 62 ? "222.2 47.4% 11.2%" : "210 40% 98%");

  root.style.setProperty("--p-h", theme.p.h);
  root.style.setProperty("--p-s", theme.p.s);
  root.style.setProperty("--p-l", theme.p.l);
  root.style.setProperty("--primary-foreground", pickForeground(theme.p.l));

  root.style.setProperty("--g-1", theme.g[0]);
  root.style.setProperty("--g-2", theme.g[1]);
  root.style.setProperty("--g-3", theme.g[2]);

  root.style.setProperty("--accent", hslValue(theme.accent));
  root.style.setProperty("--accent-2", hslValue(theme.accent2));
  root.style.setProperty("--accent-foreground", pickForeground(theme.accent.l));

  root.style.setProperty("--success", hslValue(theme.success));
  root.style.setProperty("--success-foreground", pickForeground(theme.success.l));
  root.style.setProperty("--warning", hslValue(theme.warning));
  root.style.setProperty("--warning-foreground", pickForeground(theme.warning.l));
  root.style.setProperty("--destructive", hslValue(theme.danger));
  root.style.setProperty("--destructive-foreground", pickForeground(theme.danger.l));

  root.style.setProperty("--muted-light", hslValue(theme.muted));
  root.style.setProperty("--muted-foreground-light", hslValue(theme.mutedFg));
  root.style.setProperty("--muted-dark", hslValue({ ...theme.muted, l: "20%" }));
  root.style.setProperty("--muted-foreground-dark", hslValue({ ...theme.mutedFg, l: "78%" }));

  root.style.setProperty("--bg-1", theme.bg?.[0] || "");
  root.style.setProperty("--bg-2", theme.bg?.[1] || "");
  root.style.setProperty("--bg-3", theme.bg?.[2] || "");
  root.style.setProperty("--bg-1-dark", theme.bgDark?.[0] || "");
  root.style.setProperty("--bg-2-dark", theme.bgDark?.[1] || "");
  root.style.setProperty("--bg-3-dark", theme.bgDark?.[2] || "");

  root.style.setProperty("--glass-bg-light", theme.glass?.bg || "");
  root.style.setProperty("--glass-tint-light", theme.glass?.tint || "");
  root.style.setProperty("--glass-border-light", theme.glass?.border || "");
  root.style.setProperty("--glass-bg-dark", theme.glass?.darkBg || "");
  root.style.setProperty("--glass-tint-dark", theme.glass?.darkTint || "");
  root.style.setProperty("--glass-border-dark", theme.glass?.darkBorder || "");

  (theme.charts || []).forEach((color, idx) => {
    root.style.setProperty(`--chart-${idx + 1}`, color);
  });

  localStorage.setItem("app-theme", themeName);

  // Set data-theme attribute for theme-specific CSS
  document.documentElement.setAttribute("data-theme", themeName.toLowerCase().replace(/\s+/g, "-"));
};

const ThemeSelector = () => {
  const [activeTheme, setActiveTheme] = useState(() => {
    if (typeof window === "undefined") return "Classic Blue";
    return localStorage.getItem("app-theme") || "Classic Blue";
  });
  const [paperMode, setPaperMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("paper-mode") === "true";
  });
  const lastColorTheme = useRef<string>(activeTheme);

  // On mount, apply saved theme
  useEffect(() => {
    const saved = localStorage.getItem("app-theme") || "Classic Blue";
    const isPaper = localStorage.getItem("paper-mode") === "true";
    if (isPaper) {
      applyThemeByName("Paper");
    } else {
      applyThemeByName(saved);
    }
  }, []);

  const handlePaperToggle = (checked: boolean) => {
    setPaperMode(checked);
    localStorage.setItem("paper-mode", String(checked));
    if (checked) {
      lastColorTheme.current = activeTheme;
      applyThemeByName("Paper");
      setActiveTheme("Paper");
    } else {
      const prev = lastColorTheme.current || "Classic Blue";
      applyThemeByName(prev);
      setActiveTheme(prev);
    }
  };

  const handleThemeSelect = (name: string) => {
    if (paperMode) {
      // Exit paper mode when selecting a color theme
      setPaperMode(false);
      localStorage.setItem("paper-mode", "false");
    }
    lastColorTheme.current = name;
    applyThemeByName(name);
    setActiveTheme(name);
  };

  const colorThemes = themes.filter(t => t.name !== "Paper");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full hover:bg-primary/10 group">
          <Palette className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-[var(--g-1)] transition-colors" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 glass-card border-none mt-2" align="end">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            <h4 className="font-bold text-sm">Choose Your Vibe</h4>
          </div>
        </div>

        {/* Paper mode toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${paperMode ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold">Paper</p>
              <p className="text-[10px] text-muted-foreground">Distraction-free monochrome</p>
            </div>
          </div>
          <Switch checked={paperMode} onCheckedChange={handlePaperToggle} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {colorThemes.map((theme) => (
            <button
              key={theme.name}
              onClick={() => handleThemeSelect(theme.name)}
              className={`relative p-2 rounded-xl border text-left transition-all hover:scale-105 ${
                activeTheme === theme.name && !paperMode
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : paperMode
                  ? "border-border/30 opacity-50"
                  : "border-primary/10 bg-primary/5 hover:border-primary/30"
              }`}
            >
              <div
                className="w-full h-8 rounded-md mb-2 bg-gradient-to-r"
                style={{ backgroundImage: `linear-gradient(to right, ${theme.g[0]}, ${theme.g[1]}, ${theme.g[2]})` }}
              />
              <span className="text-[10px] font-bold block truncate">{theme.name}</span>
              {activeTheme === theme.name && !paperMode && (
                <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5 shadow-lg">
                  <Check className="w-2 h-2 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ThemeSelector;
