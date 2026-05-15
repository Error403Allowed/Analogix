/* M3 Spacing System — 8dp grid, 4dp fine adjustments */

export type M3SpacingToken = '0' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';

export const spacingValues: Record<M3SpacingToken, string> = {
  '0': '0px',
  'xs': '4px',
  'sm': '8px',
  'md': '16px',
  'lg': '24px',
  'xl': '32px',
  '2xl': '40px',
  '3xl': '48px',
  '4xl': '56px',
  '5xl': '64px',
};

export function spacingCss(token: M3SpacingToken): string {
  return spacingValues[token];
}

export function generateSpacingCss(): string {
  let css = '';
  for (const [token, val] of Object.entries(spacingValues)) {
    css += `\n--md-sys-spacing-${token}: ${val};`;
  }
  return css;
}
