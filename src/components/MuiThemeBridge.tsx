"use client";

import { useState, useEffect, useCallback } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createMuiThemeFromCSS } from "@/utils/muiTheme";

export default function MuiThemeBridge({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState(createMuiThemeFromCSS);

  const refreshTheme = useCallback(() => {
    setTheme(createMuiThemeFromCSS());
  }, []);

  useEffect(() => {
    window.addEventListener("themeUpdated", refreshTheme);
    const observer = new MutationObserver(() => {
      if (document.documentElement.classList.contains("dark")) {
        refreshTheme();
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      window.removeEventListener("themeUpdated", refreshTheme);
      observer.disconnect();
    };
  }, [refreshTheme]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
