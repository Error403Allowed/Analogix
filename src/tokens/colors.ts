/* M3 Color System — Powered by Google's official HCT color science */
import {
  argbFromHex,
  themeFromSourceColor,
} from '@material/material-color-utilities';

export interface M3Scheme {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  outline: string;
  outlineVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
  scrim: string;
  shadow: string;
}

export interface M3Theme {
  name: string;
  seed: string;
  light: M3Scheme;
  dark: M3Scheme;
}

function rgbToHex(argb: number): string {
  const r = (argb >> 16) & 0xff;
  const g = (argb >> 8) & 0xff;
  const b = argb & 0xff;
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function hexToHsl(hex: string): string {
  const hexClean = hex.replace('#', '');
  const r = parseInt(hexClean.substring(0, 2), 16) / 255;
  const g = parseInt(hexClean.substring(2, 4), 16) / 255;
  const b = parseInt(hexClean.substring(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return `0 0% ${Math.round(l * 100)}%`;
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = 0;
  switch (mx) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const THEME_ROLES = [
  'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer',
  'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer',
  'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer',
  'error', 'onError', 'errorContainer', 'onErrorContainer',
  'surface', 'onSurface', 'surfaceVariant', 'onSurfaceVariant',
  'surfaceContainerLowest', 'surfaceContainerLow', 'surfaceContainer',
  'surfaceContainerHigh', 'surfaceContainerHighest',
  'outline', 'outlineVariant',
  'inverseSurface', 'inverseOnSurface', 'inversePrimary',
  'scrim', 'shadow',
] as const;

function extractScheme(scheme: any, _isDark: boolean): M3Scheme {
  const props = scheme.toJSON();
  const result: Record<string, string> = {};

  /* Map Scheme JSON keys to our M3Scheme format */
  const directMap: Record<string, string> = {
    primary: 'primary', onPrimary: 'onPrimary', primaryContainer: 'primaryContainer', onPrimaryContainer: 'onPrimaryContainer',
    secondary: 'secondary', onSecondary: 'onSecondary', secondaryContainer: 'secondaryContainer', onSecondaryContainer: 'onSecondaryContainer',
    tertiary: 'tertiary', onTertiary: 'onTertiary', tertiaryContainer: 'tertiaryContainer', onTertiaryContainer: 'onTertiaryContainer',
    error: 'error', onError: 'onError', errorContainer: 'errorContainer', onErrorContainer: 'onErrorContainer',
    surface: 'surface', onSurface: 'onSurface', surfaceVariant: 'surfaceVariant', onSurfaceVariant: 'onSurfaceVariant',
    outline: 'outline', outlineVariant: 'outlineVariant',
    inverseSurface: 'inverseSurface', inverseOnSurface: 'inverseOnSurface', inversePrimary: 'inversePrimary',
    scrim: 'scrim', shadow: 'shadow',
  };

  for (const [ourKey, srcKey] of Object.entries(directMap)) {
    const val = (props as any)[srcKey];
    result[ourKey] = val !== undefined ? rgbToHex(val as number) : '#000000';
  }

  /* Surface containers: use background for lowest, surface for low/container, 
     derive high/highest by interpolating between surface and surfaceVariant.
     This is the standard M3 approach when direct container tokens aren't available. */
  const surfaceHex = result.surface;
  const surfaceVarHex = result.surfaceVariant;
  result.surfaceContainerLowest = result.surface; /* surface = container-lowest in M3 spec */
  result.surfaceContainerLow = blendColors(surfaceHex, surfaceVarHex, 0.3);
  result.surfaceContainer = blendColors(surfaceHex, surfaceVarHex, 0.5);
  result.surfaceContainerHigh = blendColors(surfaceHex, surfaceVarHex, 0.7);
  result.surfaceContainerHighest = surfaceVarHex; /* surfaceVariant = container-highest */

  return result as unknown as M3Scheme;
}

function blendColors(c1: string, c2: string, t: number): string {
  const h1 = c1.replace('#', ''), h2 = c2.replace('#', '');
  const r1 = parseInt(h1.substring(0, 2), 16), g1 = parseInt(h1.substring(2, 4), 16), b1 = parseInt(h1.substring(4, 6), 16);
  const r2 = parseInt(h2.substring(0, 2), 16), g2 = parseInt(h2.substring(2, 4), 16), b2 = parseInt(h2.substring(4, 6), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

const themeSeeds: { name: string; seed: string }[] = [
  { name: 'Blue', seed: '#1565C0' },
  { name: 'Red', seed: '#C62828' },
  { name: 'Light Blue', seed: '#0288D1' },
  { name: 'Forest Glow', seed: '#2E7D32' },
  { name: 'Pink', seed: '#AD1457' },
  { name: 'Yellow', seed: '#F9A825' },
  { name: 'Coral', seed: '#D84315' },
  { name: 'Blue Green', seed: '#00695C' },
  { name: 'Green Pink', seed: '#6A1B9A' },
  { name: 'Pink Purple', seed: '#4527A0' },
  { name: 'Monochrome', seed: '#555555' },
];

export function buildThemes(): M3Theme[] {
  return themeSeeds.map(ts => {
    const theme = themeFromSourceColor(argbFromHex(ts.seed));
    return {
      name: ts.name,
      seed: ts.seed,
      light: extractScheme(theme.schemes.light, false),
      dark: extractScheme(theme.schemes.dark, true),
    };
  });
}

export const themes = buildThemes();

export function injectThemeVars(name: string): void {
  if (typeof window === 'undefined') return;
  const theme = themes.find(t => t.name === name);
  if (!theme) return;

  const isDark = document.documentElement.classList.contains('dark');
  const scheme = isDark ? theme.dark : theme.light;
  const root = document.documentElement;

  /* Set M3 color tokens */
  for (const [key, val] of Object.entries(scheme)) {
    const cssKey = `--md-sys-color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssKey, val);
  }
  root.style.setProperty('--md-sys-color-seed', theme.seed);

  /* Map M3 roles to shadcn-compatible HSL variables */
  const shadcnMap: Record<string, string> = {
    '--background': hexToHsl(scheme.surface),
    '--foreground': hexToHsl(scheme.onSurface),
    '--card': hexToHsl(scheme.surfaceContainer),
    '--card-foreground': hexToHsl(scheme.onSurface),
    '--popover': hexToHsl(scheme.surface),
    '--popover-foreground': hexToHsl(scheme.onSurface),
    '--primary': hexToHsl(scheme.primary),
    '--primary-foreground': hexToHsl(scheme.onPrimary),
    '--secondary': hexToHsl(scheme.secondary),
    '--secondary-foreground': hexToHsl(scheme.onSecondary),
    '--muted': hexToHsl(scheme.surfaceVariant),
    '--muted-foreground': hexToHsl(scheme.onSurfaceVariant),
    '--accent': hexToHsl(scheme.secondaryContainer),
    '--accent-foreground': hexToHsl(scheme.onSecondaryContainer),
    '--destructive': hexToHsl(scheme.error),
    '--destructive-foreground': hexToHsl(scheme.onError),
    '--success': hexToHsl('#2E7D32'),
    '--success-foreground': hexToHsl('#FFFFFF'),
    '--warning': hexToHsl('#F9A825'),
    '--warning-foreground': hexToHsl('#000000'),
    '--border': hexToHsl(scheme.outlineVariant),
    '--input': hexToHsl(scheme.outlineVariant),
    '--ring': hexToHsl(scheme.primary),
    '--sidebar-background': hexToHsl(scheme.surfaceContainerLow),
    '--sidebar-foreground': hexToHsl(scheme.onSurface),
    '--sidebar-primary': hexToHsl(scheme.primary),
    '--sidebar-primary-foreground': hexToHsl(scheme.onPrimary),
    '--sidebar-accent': hexToHsl(scheme.surfaceContainerHigh),
    '--sidebar-accent-foreground': hexToHsl(scheme.onSurface),
    '--sidebar-border': hexToHsl(scheme.outlineVariant),
    '--sidebar-ring': hexToHsl(scheme.primary),
  };

  for (const [prop, val] of Object.entries(shadcnMap)) {
    root.style.setProperty(prop, val);
  }

  root.dataset.theme = name;
  localStorage.setItem('app-theme', name);
}
