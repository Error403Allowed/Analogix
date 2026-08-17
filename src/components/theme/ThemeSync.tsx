import { useEffect } from "react";
import { applyThemeByName } from "@/components/theme/ThemeSelector";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

const ThemeSync = () => {
  const { user } = useAuth();

  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme") || "Classic Blue";
    applyThemeByName(savedTheme);

    // Load theme from the database (takes priority over localStorage).
    // This re-runs whenever the auth user changes so a theme picked in a
    // previous session is restored after sign-in, not just on app boot.
    if (user) {
      createClient()
        .from("user_preferences")
        .select("theme")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }: { data: any }) => {
          if (data?.theme) {
            applyThemeByName(data.theme);
          }
        });
    }

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
  }, [user]);

  return null;
};

export default ThemeSync;