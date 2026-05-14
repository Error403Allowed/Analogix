type HSL = { h: string; s: string; l: string };

type StructuralMode = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  muted: string;
  mutedForeground: string;
  secondary: string;
  secondaryForeground: string;
  border: string;
  input: string;
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
};

type Theme = {
  name: string;
  p: HSL;
  g: [string, string, string];
  accent: HSL;
  accent2: HSL;
  success: HSL;
  warning: HSL;
  danger: HSL;
  muted: HSL;
  mutedFg: HSL;
  charts?: string[];
  bg?: [string, string, string];
  bgDark?: [string, string, string];
  glass?: {
    bg?: string;
    tint?: string;
    border?: string;
    darkBg?: string;
    darkTint?: string;
    darkBorder?: string;
  };
  light: StructuralMode;
  dark: StructuralMode;
};

const hsl = (h: number | string, s: number | string, l: number | string): HSL => ({
  h: String(h),
  s: typeof s === "number" ? `${s}%` : s,
  l: typeof l === "number" ? `${l}%` : l,
});

const hslValue = (value: HSL) => `${value.h} ${value.s} ${value.l}`;
const hslColor = (value: HSL) => `hsl(${hslValue(value)})`;

const hexToRgba = (hex: string, alpha: number) => {
  const cleaned = hex.replace("#", "");
  const full = cleaned.length === 3 ? cleaned.split("").map((c) => c + c).join("") : cleaned;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const s = (h: number, sat: number, l: number) => `${h} ${sat}% ${l}%`;

const struct = (vals: Partial<StructuralMode> & { background: string; foreground: string; muted: string; mutedForeground: string; border: string }): StructuralMode => ({
  card: vals.background,
  cardForeground: vals.foreground,
  popover: vals.background,
  popoverForeground: vals.foreground,
  secondary: vals.muted,
  secondaryForeground: vals.mutedForeground,
  input: vals.border,
  sidebarBackground: vals.background,
  sidebarForeground: vals.foreground,
  sidebarAccent: vals.muted,
  sidebarAccentForeground: vals.mutedForeground,
  sidebarBorder: vals.border,
  ...vals,
});

const withDerived = (theme: Theme): Theme => {
  const bg = theme.bg ?? [
    hexToRgba(theme.g[0], 0.16),
    hexToRgba(theme.g[1], 0.12),
    hexToRgba(theme.g[2], 0.1),
  ];
  const bgDark = theme.bgDark ?? [
    hexToRgba(theme.g[0], 0.045),
    hexToRgba(theme.g[1], 0.035),
    hexToRgba(theme.g[2], 0.025),
  ];
  const glass = theme.glass ?? {
    bg: "rgba(255,255,255,0.72)",
    tint: hexToRgba(theme.g[0], 0.12),
    border: hexToRgba(theme.g[0], 0.20),
    darkBg: "rgba(18,28,46,0.88)",
    darkTint: hexToRgba(theme.g[0], 0.06),
    darkBorder: hexToRgba(theme.g[0], 0.15),
  };
  const charts = theme.charts ?? [
    theme.g[0],
    theme.g[1],
    theme.g[2],
    hslColor(theme.accent),
    hslColor(theme.warning),
    hslColor(theme.danger),
  ];
  return { ...theme, bg, bgDark, glass, charts };
};

export const themes = [
  withDerived({
    name: "Blue",
    p: hsl(221.2, 83.2, 53.3),
    g: ["#2563eb", "#4f46e5", "#4338ca"],
    accent: hsl(197, 82, 45),
    accent2: hsl(262, 83, 66),
    success: hsl(142, 71, 45),
    warning: hsl(38, 92, 55),
    danger: hsl(0, 84, 60),
    muted: hsl(220, 26, 96),
    mutedFg: hsl(215, 18, 42),
    light: struct({
      background: s(0, 0, 100),
      foreground: s(222, 47, 11),
      muted: s(210, 40, 96),
      mutedForeground: s(215, 16, 47),
      border: s(214, 32, 91),
      sidebarBackground: s(210, 30, 98),
      sidebarBorder: s(214, 20, 91),
    }),
    dark: struct({
      background: s(222, 47, 11),
      foreground: s(210, 40, 98),
      muted: s(217, 33, 17),
      mutedForeground: s(215, 16, 65),
      border: s(217, 33, 17),
      sidebarBackground: s(222, 40, 14),
      sidebarBorder: s(217, 30, 20),
    }),
  }),
  withDerived({
    name: "Red",
    p: hsl(15, 91, 60),
    g: ["#f97316", "#f43f5e", "#e11d48"],
    accent: hsl(330, 78, 58),
    accent2: hsl(38, 95, 60),
    success: hsl(142, 70, 42),
    warning: hsl(28, 90, 55),
    danger: hsl(0, 82, 58),
    muted: hsl(20, 30, 96),
    mutedFg: hsl(10, 18, 42),
    light: struct({
      background: s(30, 30, 99),
      foreground: s(20, 30, 12),
      muted: s(25, 25, 96),
      mutedForeground: s(20, 15, 45),
      border: s(25, 20, 90),
      sidebarBackground: s(30, 20, 97),
      sidebarBorder: s(25, 15, 90),
    }),
    dark: struct({
      background: s(20, 30, 8),
      foreground: s(25, 20, 95),
      muted: s(20, 20, 16),
      mutedForeground: s(20, 12, 60),
      border: s(20, 15, 18),
      sidebarBackground: s(20, 25, 11),
      sidebarBorder: s(20, 15, 20),
    }),
  }),
  withDerived({
    name: "Light Blue",
    p: hsl(199, 89, 48),
    g: ["#38bdf8", "#0ea5e9", "#0369a1"],
    accent: hsl(217, 75, 58),
    accent2: hsl(220, 78, 60),
    success: hsl(158, 64, 42),
    warning: hsl(40, 92, 56),
    danger: hsl(0, 82, 58),
    muted: hsl(205, 30, 95),
    mutedFg: hsl(210, 18, 42),
    bg: [
      hexToRgba("#38bdf8", 0.28),
      hexToRgba("#0ea5e9", 0.20),
      hexToRgba("#0369a1", 0.18),
    ],
    bgDark: [
      hexToRgba("#38bdf8", 0.10),
      hexToRgba("#0ea5e9", 0.08),
      hexToRgba("#0369a1", 0.06),
    ],
    glass: {
      bg: "rgba(235, 248, 255, 0.80)",
      tint: "rgba(56, 189, 248, 0.18)",
      border: "rgba(14, 165, 233, 0.25)",
      darkBg: "rgba(7, 20, 40, 0.88)",
      darkTint: "rgba(56, 189, 248, 0.10)",
      darkBorder: "rgba(56, 189, 248, 0.18)",
    },
    light: struct({
      background: s(200, 40, 99),
      foreground: s(200, 60, 10),
      muted: s(200, 30, 96),
      mutedForeground: s(200, 20, 45),
      border: s(200, 20, 90),
      sidebarBackground: s(200, 30, 97),
      sidebarBorder: s(200, 20, 90),
    }),
    dark: struct({
      background: s(200, 60, 8),
      foreground: s(200, 30, 96),
      muted: s(200, 40, 16),
      mutedForeground: s(200, 20, 60),
      border: s(200, 30, 18),
      sidebarBackground: s(200, 50, 11),
      sidebarBorder: s(200, 30, 20),
    }),
  }),
  withDerived({
    name: "Forest Glow",
    p: hsl(142, 71, 45),
    g: ["#16a34a", "#22c55e", "#15803d"],
    accent: hsl(96, 62, 42),
    accent2: hsl(180, 70, 38),
    success: hsl(142, 72, 40),
    warning: hsl(45, 90, 55),
    danger: hsl(0, 82, 58),
    muted: hsl(140, 20, 95),
    mutedFg: hsl(150, 16, 40),
    light: struct({
      background: s(140, 20, 99),
      foreground: s(140, 40, 10),
      muted: s(140, 15, 96),
      mutedForeground: s(140, 12, 42),
      border: s(140, 12, 90),
      sidebarBackground: s(140, 15, 97),
      sidebarBorder: s(140, 10, 90),
    }),
    dark: struct({
      background: s(140, 40, 6),
      foreground: s(140, 20, 95),
      muted: s(140, 25, 14),
      mutedForeground: s(140, 12, 55),
      border: s(140, 15, 16),
      sidebarBackground: s(140, 30, 9),
      sidebarBorder: s(140, 15, 18),
    }),
  }),
  withDerived({
    name: "Pink",
    p: hsl(292, 91, 50),
    g: ["#d946ef", "#c026d3", "#a21caf"],
    accent: hsl(186, 90, 45),
    accent2: hsl(320, 90, 60),
    success: hsl(152, 70, 40),
    warning: hsl(38, 92, 55),
    danger: hsl(0, 82, 58),
    muted: hsl(285, 18, 96),
    mutedFg: hsl(280, 16, 42),
    light: struct({
      background: s(280, 20, 99),
      foreground: s(280, 50, 10),
      muted: s(280, 15, 96),
      mutedForeground: s(280, 20, 45),
      border: s(280, 15, 90),
      sidebarBackground: s(280, 15, 97),
      sidebarBorder: s(280, 12, 90),
    }),
    dark: struct({
      background: s(280, 50, 6),
      foreground: s(280, 20, 96),
      muted: s(280, 30, 14),
      mutedForeground: s(280, 15, 60),
      border: s(280, 25, 18),
      sidebarBackground: s(280, 40, 9),
      sidebarBorder: s(280, 25, 20),
    }),
  }),
  withDerived({
    name: "Yellow",
    p: hsl(45, 93, 47),
    g: ["#fbbf24", "#f59e0b", "#d97706"],
    accent: hsl(210, 82, 45),
    accent2: hsl(18, 86, 58),
    success: hsl(152, 64, 42),
    warning: hsl(45, 92, 52),
    danger: hsl(0, 82, 58),
    muted: hsl(45, 25, 95),
    mutedFg: hsl(35, 20, 40),
    light: struct({
      background: s(40, 20, 99),
      foreground: s(35, 30, 10),
      muted: s(40, 15, 96),
      mutedForeground: s(35, 15, 42),
      border: s(40, 12, 90),
      sidebarBackground: s(40, 15, 97),
      sidebarBorder: s(40, 10, 90),
    }),
    dark: struct({
      background: s(35, 30, 6),
      foreground: s(40, 15, 95),
      muted: s(35, 20, 14),
      mutedForeground: s(35, 12, 55),
      border: s(35, 15, 16),
      sidebarBackground: s(35, 25, 9),
      sidebarBorder: s(35, 15, 18),
    }),
  }),
  withDerived({
    name: "Coral",
    p: hsl(3, 76, 70),
    g: ["#ef7b76", "#e8605a", "#f4a09c"],
    accent: hsl(340, 72, 60),
    accent2: hsl(28, 90, 60),
    success: hsl(150, 66, 45),
    warning: hsl(30, 90, 55),
    danger: hsl(0, 82, 58),
    muted: hsl(10, 24, 96),
    mutedFg: hsl(10, 18, 44),
    light: struct({
      background: s(350, 20, 99),
      foreground: s(350, 30, 12),
      muted: s(350, 15, 96),
      mutedForeground: s(350, 15, 45),
      border: s(350, 12, 90),
      sidebarBackground: s(350, 15, 97),
      sidebarBorder: s(350, 10, 90),
    }),
    dark: struct({
      background: s(350, 30, 8),
      foreground: s(350, 15, 95),
      muted: s(350, 20, 16),
      mutedForeground: s(350, 12, 55),
      border: s(350, 12, 18),
      sidebarBackground: s(350, 25, 11),
      sidebarBorder: s(350, 12, 20),
    }),
  }),
  withDerived({
    name: "Blue + Green",
    p: hsl(172, 88, 45),
    g: ["#2dd4bf", "#3b82f6", "#a855f7"],
    accent: hsl(250, 80, 62),
    accent2: hsl(200, 90, 50),
    success: hsl(152, 64, 42),
    warning: hsl(38, 92, 55),
    danger: hsl(0, 82, 58),
    muted: hsl(190, 24, 95),
    mutedFg: hsl(210, 18, 42),
    light: struct({
      background: s(180, 20, 99),
      foreground: s(200, 30, 10),
      muted: s(190, 15, 96),
      mutedForeground: s(200, 15, 45),
      border: s(190, 12, 90),
      sidebarBackground: s(190, 15, 97),
      sidebarBorder: s(190, 10, 90),
    }),
    dark: struct({
      background: s(200, 30, 8),
      foreground: s(180, 15, 95),
      muted: s(200, 20, 15),
      mutedForeground: s(200, 12, 55),
      border: s(200, 12, 18),
      sidebarBackground: s(200, 25, 11),
      sidebarBorder: s(200, 12, 20),
    }),
  }),
  withDerived({
    name: "Green + Pink",
    p: hsl(316, 91, 60),
    g: ["#ec4899", "#facc15", "#06b6d4"],
    accent: hsl(50, 92, 55),
    accent2: hsl(185, 80, 45),
    success: hsl(152, 68, 42),
    warning: hsl(45, 92, 55),
    danger: hsl(0, 82, 58),
    muted: hsl(320, 20, 96),
    mutedFg: hsl(320, 18, 42),
    light: struct({
      background: s(320, 15, 99),
      foreground: s(320, 40, 10),
      muted: s(320, 10, 96),
      mutedForeground: s(320, 20, 45),
      border: s(320, 10, 90),
      sidebarBackground: s(320, 12, 97),
      sidebarBorder: s(320, 8, 90),
    }),
    dark: struct({
      background: s(320, 40, 8),
      foreground: s(320, 15, 95),
      muted: s(320, 25, 16),
      mutedForeground: s(320, 15, 60),
      border: s(320, 15, 18),
      sidebarBackground: s(320, 30, 11),
      sidebarBorder: s(320, 15, 20),
    }),
  }),
  withDerived({
    name: "Pink + Purple",
    p: hsl(280, 90, 60),
    g: ["#ff005d", "#7c3aed", "#06b6d4"],
    accent: hsl(200, 90, 50),
    accent2: hsl(20, 90, 55),
    success: hsl(152, 64, 42),
    warning: hsl(45, 92, 55),
    danger: hsl(0, 82, 58),
    muted: hsl(280, 18, 96),
    mutedFg: hsl(275, 16, 42),
    light: struct({
      background: s(0, 0, 99),
      foreground: s(0, 0, 10),
      muted: s(0, 0, 96),
      mutedForeground: s(0, 0, 45),
      border: s(0, 0, 90),
      sidebarBackground: s(0, 0, 97),
      sidebarBorder: s(0, 0, 90),
    }),
    dark: struct({
      background: s(0, 0, 6),
      foreground: s(0, 0, 95),
      muted: s(0, 0, 14),
      mutedForeground: s(0, 0, 55),
      border: s(0, 0, 16),
      sidebarBackground: s(0, 0, 9),
      sidebarBorder: s(0, 0, 18),
    }),
  }),
  withDerived({
    name: "Monochrome",
    p: hsl(40, 5, 20),
    g: ["#373530", "#787774", "#9B9B9B"],
    accent: hsl(40, 5, 96),
    accent2: hsl(30, 4, 85),
    success: hsl(145, 20, 35),
    warning: hsl(35, 50, 45),
    danger: hsl(5, 50, 50),
    muted: hsl(40, 5, 96),
    mutedFg: hsl(40, 4, 46),
    bg: ["rgba(120,119,116,0.06)", "rgba(120,119,116,0.04)", "rgba(120,119,116,0.02)"],
    bgDark: ["rgba(255,255,255,0.04)", "rgba(255,255,255,0.03)", "rgba(255,255,255,0.02)"],
    glass: {
      bg: "rgba(255,255,255,0.92)",
      tint: "rgba(55,53,48,0.03)",
      border: "rgba(55,53,48,0.08)",
      darkBg: "rgba(25,25,25,0.95)",
      darkTint: "rgba(255,255,255,0.03)",
      darkBorder: "rgba(255,255,255,0.06)",
    },
    charts: ["#373530", "#787774", "#9B9B9B", "#A6A299", "#C8C7C3", "#E9E9E7"],
    light: struct({
      background: s(40, 5, 99),
      foreground: s(40, 5, 20),
      muted: s(40, 5, 96),
      mutedForeground: s(40, 4, 46),
      border: s(40, 5, 92),
      sidebarBackground: s(40, 5, 97),
      sidebarBorder: s(40, 5, 92),
    }),
    dark: struct({
      background: s(0, 0, 9.8),
      foreground: s(0, 0, 83),
      muted: s(0, 0, 14.5),
      mutedForeground: s(0, 0, 60.8),
      border: s(0, 0, 18),
      sidebarBackground: s(0, 0, 12.5),
      sidebarBorder: s(0, 0, 18),
    }),
  }),
];

export const applyThemeByName = (themeName: string) => {
  const theme = themes.find(t => t.name === themeName);
  if (!theme) return;

  const root = document.documentElement;

  const pickForeground = (l: string) => (parseFloat(l) >= 62 ? "222.2 47.4% 11.2%" : "210 40% 98%");

  root.style.setProperty("--p-h", theme.p.h);
  root.style.setProperty("--p-s", theme.p.s);
  root.style.setProperty("--p-l", theme.p.l);
  root.style.setProperty("--primary-foreground", pickForeground(theme.p.l));

  root.style.setProperty("--g-1", theme.g[0]);
  root.style.setProperty("--g-2", theme.g[1]);
  root.style.setProperty("--g-3", theme.g[2]);

  root.style.setProperty("--accent", hslValue(theme.accent));
  root.style.setProperty("--accent-2", hslValue(theme.accent2));
  root.style.setProperty("--accent-foreground", pickForeground(theme.accent.l));

  root.style.setProperty("--success", hslValue(theme.success));
  root.style.setProperty("--success-foreground", pickForeground(theme.success.l));
  root.style.setProperty("--warning", hslValue(theme.warning));
  root.style.setProperty("--warning-foreground", pickForeground(theme.warning.l));
  root.style.setProperty("--destructive", hslValue(theme.danger));
  root.style.setProperty("--destructive-foreground", pickForeground(theme.danger.l));

  root.style.setProperty("--muted-light", hslValue(theme.muted));
  root.style.setProperty("--muted-foreground-light", hslValue(theme.mutedFg));
  root.style.setProperty("--muted-dark", hslValue({ ...theme.muted, l: "20%" }));
  root.style.setProperty("--muted-foreground-dark", hslValue({ ...theme.mutedFg, l: "78%" }));

  root.style.setProperty("--bg-1", theme.bg?.[0] || "");
  root.style.setProperty("--bg-2", theme.bg?.[1] || "");
  root.style.setProperty("--bg-3", theme.bg?.[2] || "");
  root.style.setProperty("--bg-1-dark", theme.bgDark?.[0] || "");
  root.style.setProperty("--bg-2-dark", theme.bgDark?.[1] || "");
  root.style.setProperty("--bg-3-dark", theme.bgDark?.[2] || "");

  root.style.setProperty("--glass-bg-light", theme.glass?.bg || "");
  root.style.setProperty("--glass-tint-light", theme.glass?.tint || "");
  root.style.setProperty("--glass-border-light", theme.glass?.border || "");
  root.style.setProperty("--glass-bg-dark", theme.glass?.darkBg || "");
  root.style.setProperty("--glass-tint-dark", theme.glass?.darkTint || "");
  root.style.setProperty("--glass-border-dark", theme.glass?.darkBorder || "");

  (theme.charts || []).forEach((color, idx) => {
    root.style.setProperty(`--chart-${idx + 1}`, color);
  });

  const oldStyle = document.getElementById("theme-structural");
  if (oldStyle) oldStyle.remove();

  const style = document.createElement("style");
  style.id = "theme-structural";
  style.textContent = `
:root {
  --background: ${theme.light.background};
  --foreground: ${theme.light.foreground};
  --card: ${theme.light.card};
  --card-foreground: ${theme.light.cardForeground};
  --popover: ${theme.light.popover};
  --popover-foreground: ${theme.light.popoverForeground};
  --muted: ${theme.light.muted};
  --muted-foreground: ${theme.light.mutedForeground};
  --secondary: ${theme.light.secondary};
  --secondary-foreground: ${theme.light.secondaryForeground};
  --border: ${theme.light.border};
  --input: ${theme.light.input};
  --sidebar-background: ${theme.light.sidebarBackground};
  --sidebar-foreground: ${theme.light.sidebarForeground};
  --sidebar-accent: ${theme.light.sidebarAccent};
  --sidebar-accent-foreground: ${theme.light.sidebarAccentForeground};
  --sidebar-border: ${theme.light.sidebarBorder};
}
.dark {
  --background: ${theme.dark.background};
  --foreground: ${theme.dark.foreground};
  --card: ${theme.dark.card};
  --card-foreground: ${theme.dark.cardForeground};
  --popover: ${theme.dark.popover};
  --popover-foreground: ${theme.dark.popoverForeground};
  --muted: ${theme.dark.muted};
  --muted-foreground: ${theme.dark.mutedForeground};
  --secondary: ${theme.dark.secondary};
  --secondary-foreground: ${theme.dark.secondaryForeground};
  --border: ${theme.dark.border};
  --input: ${theme.dark.input};
  --sidebar-background: ${theme.dark.sidebarBackground};
  --sidebar-foreground: ${theme.dark.sidebarForeground};
  --sidebar-accent: ${theme.dark.sidebarAccent};
  --sidebar-accent-foreground: ${theme.dark.sidebarAccentForeground};
  --sidebar-border: ${theme.dark.sidebarBorder};
}
`;
  document.head.appendChild(style);

  localStorage.setItem("app-theme", themeName);
  root.setAttribute("data-theme", themeName.toLowerCase().replace(/\s+/g, "-"));
};
