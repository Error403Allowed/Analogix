/* M3 Shape System — Corner shape scale */

export type M3ShapeToken = 'none' | 'extra-small' | 'extra-small-top' | 'small' | 'medium' | 'large' | 'extra-large' | 'full';

export const shapeValues: Record<M3ShapeToken, string> = {
  'none': '0px',
  'extra-small': '4px',
  'extra-small-top': '4px 4px 0 0',
  'small': '8px',
  'medium': '12px',
  'large': '16px',
  'extra-large': '28px',
  'full': '9999px',
};

export function shapeCss(token: M3ShapeToken): string {
  return `border-radius: ${shapeValues[token]};`;
}

export function generateShapeCss(): string {
  let css = '';
  for (const [token, val] of Object.entries(shapeValues)) {
    const className = `.m3-shape-${token.replace(/_/g, '-')}`;
    css += `\n${className} { border-radius: ${val}; }`;
  }
  return css;
}
