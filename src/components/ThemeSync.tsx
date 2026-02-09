import { useEffect } from "react";
import { applyThemeByName } from "@/components/ThemeSelector";
import { getMoodProfile, getStoredMoodId } from "@/utils/mood";

const applyMoodTheme = () => {
  const moodId = getStoredMoodId();
  const profile = getMoodProfile(moodId);
  applyThemeByName(profile.theme);
};

const ThemeSync = () => {
  useEffect(() => {
    applyMoodTheme();
    const handleMoodChange = () => applyMoodTheme();
    window.addEventListener("moodUpdated", handleMoodChange);
    window.addEventListener("storage", handleMoodChange);
    return () => {
      window.removeEventListener("moodUpdated", handleMoodChange);
      window.removeEventListener("storage", handleMoodChange);
    };
  }, []);

  return null;
};

export default ThemeSync;
