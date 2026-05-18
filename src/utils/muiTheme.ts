import { createTheme, ThemeOptions } from "@mui/material/styles";

function hslToHex(hsl: string): string {
  const parts = hsl.trim().split(/\s+/);
  if (parts.length < 3) return "#000000";
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1].replace("%", "")) / 100;
  const l = parseFloat(parts[2].replace("%", "")) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function getCSSVar(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function createMuiThemeFromCSS(): ReturnType<typeof createTheme> {
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  const pH = getCSSVar("--p-h") || (isDark ? "221" : "221");
  const pS = getCSSVar("--p-s") || (isDark ? "83%" : "83%");
  const pL = getCSSVar("--p-l") || (isDark ? "53%" : "53%");

  const primaryHSL = `${pH} ${pS} ${pL}`;
  const primaryHex = hslToHex(primaryHSL);

  const bgHSL = getCSSVar("--background") || (isDark ? "0 0% 6%" : "0 0% 100%");
  const fgHSL = getCSSVar("--foreground") || (isDark ? "0 0% 95%" : "0 0% 10%");
  const mutedHSL = getCSSVar("--muted") || (isDark ? "0 0% 16%" : "0 0% 96%");
  const mutedFgHSL = getCSSVar("--muted-foreground") || (isDark ? "0 0% 55%" : "0 0% 45%");
  const borderHSL = getCSSVar("--border") || (isDark ? "0 0% 16%" : "0 0% 90%");
  const accentHSL = getCSSVar("--accent") || (isDark ? "250 80% 62%" : "250 80% 62%");
  const destructiveHSL = getCSSVar("--destructive") || "0 84% 60%";
  const successHSL = getCSSVar("--success") || "142 71% 45%";
  const warningHSL = getCSSVar("--warning") || "38 92% 55%";

  const themeOptions: ThemeOptions = {
    palette: {
      mode: isDark ? "dark" : "light",
      primary: {
        main: primaryHex,
        light: hslToHex(`${pH} ${Math.max(parseInt(pS) - 20, 0)}% ${Math.min(parseInt(pL) + 30, 95)}%`),
        dark: hslToHex(`${pH} ${Math.min(parseInt(pS) + 10, 100)}% ${Math.max(parseInt(pL) - 20, 10)}%`),
      },
      secondary: {
        main: hslToHex(accentHSL),
        light: hslToHex(accentHSL),
        dark: hslToHex(accentHSL),
      },
      error: {
        main: hslToHex(destructiveHSL),
        light: hslToHex(destructiveHSL),
        dark: hslToHex(destructiveHSL),
      },
      warning: {
        main: hslToHex(warningHSL),
      },
      success: {
        main: hslToHex(successHSL),
      },
      background: {
        default: hslToHex(bgHSL),
        paper: hslToHex(bgHSL),
      },
      text: {
        primary: hslToHex(fgHSL),
        secondary: hslToHex(mutedFgHSL),
      },
      divider: hslToHex(borderHSL),
    },
    shape: {
      borderRadius: 16,
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      h1: {
        fontSize: "2rem",
        fontWeight: 400,
        lineHeight: 1.3,
        letterSpacing: "-0.02em",
      },
      h2: {
        fontSize: "1.75rem",
        fontWeight: 400,
        lineHeight: 1.3,
        letterSpacing: "-0.01em",
      },
      h3: {
        fontSize: "1.5rem",
        fontWeight: 400,
        lineHeight: 1.4,
      },
      h4: {
        fontSize: "1.375rem",
        fontWeight: 400,
        lineHeight: 1.4,
      },
      h5: {
        fontSize: "1.125rem",
        fontWeight: 500,
        lineHeight: 1.5,
      },
      h6: {
        fontSize: "1rem",
        fontWeight: 600,
        lineHeight: 1.5,
        letterSpacing: "0.015em",
      },
      subtitle1: {
        fontSize: "1rem",
        fontWeight: 400,
        lineHeight: 1.5,
        letterSpacing: "0.015em",
      },
      subtitle2: {
        fontSize: "0.875rem",
        fontWeight: 500,
        lineHeight: 1.5,
        letterSpacing: "0.01em",
      },
      body1: {
        fontSize: "1rem",
        fontWeight: 400,
        lineHeight: 1.5,
        letterSpacing: "0.015em",
      },
      body2: {
        fontSize: "0.875rem",
        fontWeight: 400,
        lineHeight: 1.5,
        letterSpacing: "0.025em",
      },
      button: {
        fontSize: "0.875rem",
        fontWeight: 500,
        lineHeight: 1.4,
        letterSpacing: "0.01em",
        textTransform: "none",
      },
      caption: {
        fontSize: "0.75rem",
        fontWeight: 400,
        lineHeight: 1.4,
        letterSpacing: "0.04em",
      },
      overline: {
        fontSize: "0.6875rem",
        fontWeight: 500,
        lineHeight: 1.4,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          "*": { boxSizing: "border-box" },
          body: {
            margin: 0,
            padding: 0,
            backgroundColor: isDark ? "#1C1B1F" : "#FFFBFE",
            color: isDark ? "#E6E1E5" : "#1C1B1F",
          },
        },
      },
      MuiButtonBase: {
        defaultProps: {
          disableRipple: false,
        },
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 500,
            borderRadius: "20px",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: "20px",
            textTransform: "none",
            fontWeight: 500,
            letterSpacing: "0.01em",
            padding: "10px 24px",
            boxShadow: "none",
          },
          contained: {
            boxShadow: isDark ? "0 1px 2px rgba(0,0,0,0.3)" : "0 1px 2px rgba(0,0,0,0.12)",
            "&:hover": {
              boxShadow: isDark ? "0 2px 4px rgba(0,0,0,0.4)" : "0 2px 4px rgba(0,0,0,0.15)",
            },
          },
          outlined: {
            borderWidth: "1px",
            borderColor: isDark ? "#938F99" : "#79747E",
            "&:hover": {
              borderWidth: "1px",
              backgroundColor: isDark ? "rgba(232, 222, 248, 0.08)" : "rgba(103, 58, 183, 0.08)",
            },
          },
          text: {
            "&:hover": {
              backgroundColor: isDark ? "rgba(232, 222, 248, 0.08)" : "rgba(103, 58, 183, 0.08)",
            },
          },
          sizeSmall: {
            padding: "6px 16px",
            fontSize: "0.875rem",
          },
          sizeMedium: {
            padding: "10px 24px",
            fontSize: "0.875rem",
          },
          sizeLarge: {
            padding: "14px 28px",
            fontSize: "0.875rem",
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: "50%",
            transition: "background-color 0.2s, color 0.2s",
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            borderRadius: "16px",
            boxShadow: isDark ? "0 4px 8px rgba(0,0,0,0.4)" : "0 4px 8px rgba(0,0,0,0.15)",
          },
          primary: {
            backgroundColor: primaryHex,
            color: isDark ? "#062E6F" : "#FFFFFF",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: "12px",
            backgroundImage: "none",
            boxShadow: isDark ? "0 1px 2px rgba(0,0,0,0.3)" : "0 1px 2px rgba(0,0,0,0.08)",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            borderRadius: "12px",
          },
          elevation1: {
            boxShadow: isDark ? "0 1px 2px rgba(0,0,0,0.3)" : "0 1px 2px rgba(0,0,0,0.08)",
          },
          elevation2: {
            boxShadow: isDark ? "0 2px 4px rgba(0,0,0,0.35)" : "0 2px 4px rgba(0,0,0,0.1)",
          },
          elevation3: {
            boxShadow: isDark ? "0 4px 8px rgba(0,0,0,0.4)" : "0 4px 8px rgba(0,0,0,0.12)",
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: "12px",
              backgroundColor: isDark ? "#211F26" : "#FFFBFE",
            },
            "& .MuiFilledInput-root": {
              borderRadius: "12px 12px 0 0",
              backgroundColor: isDark ? "#211F26" : "#F7F2FA",
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: "12px",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: isDark ? "#49454F" : "#79747E",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: isDark ? "#938F99" : "#5B5B5B",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: primaryHex,
              borderWidth: "2px",
            },
          },
          input: {
            padding: "16px",
          },
        },
      },
      MuiFilledInput: {
        styleOverrides: {
          root: {
            borderRadius: "12px 12px 0 0",
            "&:before": {
              borderBottomColor: isDark ? "#49454F" : "#CAC4D0",
            },
          },
          input: {
            padding: "16px",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: "8px",
            fontWeight: 500,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: "28px",
            backgroundImage: "none",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: "none",
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: "28px",
            padding: "12px 16px",
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 500,
            minHeight: "48px",
            borderRadius: "8px",
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: "8px",
            padding: "8px 16px",
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: "12px",
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: "8px",
            margin: "2px 8px",
          },
        },
      },
      MuiSlider: {
        styleOverrides: {
          root: {
            height: "4px",
          },
          thumb: {
            width: "20px",
            height: "20px",
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            width: "52px",
            height: "32px",
          },
          thumb: {
            width: "24px",
            height: "24px",
          },
          track: {
            borderRadius: "16px",
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            height: "4px",
            borderRadius: "2px",
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            borderRadius: "50%",
          },
        },
      },
      MuiSnackbar: {
        styleOverrides: {
          root: {
            borderRadius: "12px",
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: "12px",
          },
        },
      },
      MuiTable: {
        styleOverrides: {
          root: {
            borderRadius: "12px",
          },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            borderRadius: "12px",
            "&:before": { display: "none" },
          },
        },
      },
      MuiPagination: {
        styleOverrides: {
          root: {
            "& .MuiPaginationItem-root": {
              borderRadius: "8px",
            },
          },
        },
      },
    },
  };

  return createTheme(themeOptions);
}