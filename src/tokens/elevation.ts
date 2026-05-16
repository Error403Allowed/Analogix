/* M3 Elevation System — Levels 0-5 with shadows */

export interface M3ElevationLevel {
  dp: number;
  shadowLight: string;
  shadowDark: string;
}

export const elevationLevels: Record<number, M3ElevationLevel> = {
  0: {
    dp: 0,
    shadowLight: 'none',
    shadowDark: 'none',
  },
  1: {
    dp: 1,
    shadowLight: '0 1px 3px 1px rgba(0,0,0,0.15), 0 1px 2px 0 rgba(0,0,0,0.30)',
    shadowDark: '0 1px 3px 1px rgba(0,0,0,0.30), 0 1px 2px 0 rgba(0,0,0,0.50)',
  },
  2: {
    dp: 3,
    shadowLight: '0 3px 6px 2px rgba(0,0,0,0.15), 0 1px 3px 0 rgba(0,0,0,0.30)',
    shadowDark: '0 3px 6px 2px rgba(0,0,0,0.30), 0 1px 3px 0 rgba(0,0,0,0.50)',
  },
  3: {
    dp: 6,
    shadowLight: '0 6px 14px 2px rgba(0,0,0,0.15), 0 2px 4px 0 rgba(0,0,0,0.30)',
    shadowDark: '0 6px 14px 2px rgba(0,0,0,0.30), 0 2px 4px 0 rgba(0,0,0,0.50)',
  },
  4: {
    dp: 8,
    shadowLight: '0 8px 16px 2px rgba(0,0,0,0.15), 0 4px 8px 0 rgba(0,0,0,0.30)',
    shadowDark: '0 8px 16px 2px rgba(0,0,0,0.30), 0 4px 8px 0 rgba(0,0,0,0.50)',
  },
  5: {
    dp: 12,
    shadowLight: '0 12px 24px 4px rgba(0,0,0,0.15), 0 6px 12px 0 rgba(0,0,0,0.30)',
    shadowDark: '0 12px 24px 4px rgba(0,0,0,0.30), 0 6px 12px 0 rgba(0,0,0,0.50)',
  },
};

export function elevationCss(level: number): string {
  const e = elevationLevels[level];
  if (!e) return '';
  return `
  box-shadow: var(--md-elevation-level-${level}-shadow);
  `;
}

export function generateElevationCss(): string {
  let css = '';
  for (const [level, e] of Object.entries(elevationLevels)) {
    css += `
--md-elevation-level-${level}: ${e.dp}dp;
--md-elevation-level-${level}-shadow: ${e.shadowLight};
.dark {
  --md-elevation-level-${level}-shadow: ${e.shadowDark};
}
`;
  }
  return css;
}
