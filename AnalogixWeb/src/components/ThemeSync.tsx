import { useEffect } from "react";
import { applyThemeByName } from "@/components/ThemeSelector";
import { createClient } from "@/lib/supabase/client";
import { getAuthUser } from "@/utils/authCache";

const ThemeSync = () => {
  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme") || "Classic Blue";
    applyThemeByName(savedTheme);

    // Load theme from database (takes priority over localStorage)
    getAuthUser().then(user => {
      if (!user) return;
      createClient()
        .from("user_preferences")
        .select("theme")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.theme) {
            applyThemeByName(data.theme);
          }
        });
    });

    const handleThemeChange = () => {
      const theme = localStorage.getItem("app-theme") || "Classic Blue";
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
