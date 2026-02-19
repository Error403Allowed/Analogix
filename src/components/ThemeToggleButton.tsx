"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ThemeToggleButtonProps {
  buttonClassName?: string;
  iconClassName?: string;
}

export function ThemeToggleButton({ buttonClassName, iconClassName }: ThemeToggleButtonProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render nothing on the server or until mounted on the client
    return null;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={buttonClassName}
    >
      {isDark ? (
        <Moon className={iconClassName} />
      ) : (
        <Sun className={iconClassName} />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
