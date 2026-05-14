import { useEffect } from "react";
import { applyThemeByName } from "@/utils/theme";

const ThemeSync = () => {
  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme") || "Blue + Green";
    applyThemeByName(savedTheme);

    const handleThemeChange = () => {
      const theme = localStorage.getItem("app-theme") || "Blue + Green";
      applyThemeByName(theme);
    };

    window.addEventListener("themeUpdated", handleThemeChange);
    window.addEventListener("storage", handleThemeChange);
    return () => {
      window.removeEventListener("themeUpdated", handleThemeChange);
      window.removeEventListener("storage", handleThemeChange);
    };
  }, []);

  return null;
};

export default ThemeSync;
