import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyThemeByName, getThemeByName } from "@/components/ThemeSelector";

const ThemeSync = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === "/") return;
    const saved = localStorage.getItem("app-theme");
    const fallback = "Classic Blue";
    const themeToApply = saved && getThemeByName(saved) ? saved : fallback;
    applyThemeByName(themeToApply);
  }, [pathname]);

  return null;
};

export default ThemeSync;
