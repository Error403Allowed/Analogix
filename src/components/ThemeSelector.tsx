import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Check, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const themes = [
  {
    name: "Classic Blue",
    p: { h: "221.2", s: "83.2%", l: "53.3%" },
    g: ["#2563eb", "#4f46e5", "#4338ca"]
  },
  {
    name: "Sunset Ember",
    p: { h: "15", s: "91%", l: "60%" },
    g: ["#f97316", "#f43f5e", "#e11d48"]
  },
  {
    name: "Oceanic",
    p: { h: "199", s: "89%", l: "48%" },
    g: ["#0ea5e9", "#0284c7", "#0369a1"]
  },
  {
    name: "Forest Glow",
    p: { h: "142", s: "71%", l: "45%" },
    g: ["#16a34a", "#22c55e", "#15803d"]
  },
  {
    name: "Cyber Neon",
    p: { h: "292", s: "91%", l: "50%" },
    g: ["#d946ef", "#c026d3", "#a21caf"]
  },
  {
    name: "Midnight Gold",
    p: { h: "45", s: "93%", l: "47%" },
    g: ["#fbbf24", "#f59e0b", "#d97706"]
  },
  {
    name: "Cosmic Aurora",
    p: { h: "172", s: "88%", l: "45%" },
    g: ["#2dd4bf", "#3b82f6", "#a855f7"]
  },
  {
    name: "Candy Pop",
    p: { h: "316", s: "91%", l: "60%" },
    g: ["#ec4899", "#facc15", "#06b6d4"]
  },
  {
    name: "Prismatic",
    p: { h: "280", s: "90%", l: "60%" },
    g: ["#ff0000", "#00ff00", "#0000ff"]
  }
];

export const applyThemeByName = (themeName: string) => {
  const theme = themes.find(t => t.name === themeName);
  if (!theme) return;

  const root = document.documentElement;
  root.style.setProperty("--p-h", theme.p.h);
  root.style.setProperty("--p-s", theme.p.s);
  root.style.setProperty("--p-l", theme.p.l);
  root.style.setProperty("--g-1", theme.g[0]);
  root.style.setProperty("--g-2", theme.g[1]);
  root.style.setProperty("--g-3", theme.g[2]);

  localStorage.setItem("app-theme", themeName);
};

const ThemeSelector = () => {
  const [activeTheme, setActiveTheme] = useState(() => {
    if (typeof window === "undefined") return "Classic Blue";
    return localStorage.getItem("app-theme") || "Classic Blue";
  });

  // On mount, apply saved theme
  useEffect(() => {
    const saved = localStorage.getItem("app-theme");
    if (saved) applyThemeByName(saved);
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full hover:bg-primary/10 group">
          <Palette className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-[var(--g-1)] transition-colors" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 glass-card border-none mt-2" align="end">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-4 h-4 text-primary" />
          <h4 className="font-bold text-sm">Choose Your Vibe</h4>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {themes.map((theme) => (
            <button
              key={theme.name}
              onClick={() => {
                applyThemeByName(theme.name);
                setActiveTheme(theme.name);
              }}
              className={`relative p-2 rounded-xl border text-left transition-all hover:scale-105 ${
                activeTheme === theme.name 
                  ? "border-primary bg-primary/5 ring-1 ring-primary" 
                  : "border-white/20 bg-white/5 hover:border-white/40"
              }`}
            >
              <div 
                className="w-full h-8 rounded-md mb-2 bg-gradient-to-r"
                style={{ backgroundImage: `linear-gradient(to right, ${theme.g[0]}, ${theme.g[1]}, ${theme.g[2]})` }}
              />
              <span className="text-[10px] font-bold block truncate">{theme.name}</span>
              {activeTheme === theme.name && (
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
