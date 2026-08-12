"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { applyThemeByName, themes } from "@/utils/theme";

export function useThemeSelector() {
  const [activeTheme, setActiveTheme] = useState("Blue + Green");
  const [themeOpen, setThemeOpen] = useState(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("app-theme") || "Blue + Green";
    setActiveTheme(saved);
  }, []);

  const handleThemeSelect = useCallback((name: string) => {
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }
    applyThemeByName(name);
    setActiveTheme(name);
    localStorage.setItem("app-theme", name);
    window.dispatchEvent(new Event("themeUpdated"));
    setThemeOpen(false);
  }, []);

  const handleThemeHover = useCallback((name: string) => {
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }
    applyThemeByName(name);
  }, []);

  const handleThemeHoverEnd = useCallback(() => {
    previewTimer.current = setTimeout(() => {
      applyThemeByName(activeTheme);
    }, 80);
  }, [activeTheme]);

  return {
    activeTheme,
    themeOpen,
    setThemeOpen,
    themes,
    handleThemeSelect,
    handleThemeHover,
    handleThemeHoverEnd,
  };
}
