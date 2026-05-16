/* M3 Typography Scale — Exact values per spec */

export interface M3TypeStyle {
  fontFamily: string;
  fontWeight: number;
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
}

export type M3TypeToken =
  | 'display-large' | 'display-medium' | 'display-small'
  | 'headline-large' | 'headline-medium' | 'headline-small'
  | 'title-large' | 'title-medium' | 'title-small'
  | 'body-large' | 'body-medium' | 'body-small'
  | 'label-large' | 'label-medium' | 'label-small';

export const typeScale: Record<M3TypeToken, M3TypeStyle> = {
  'display-large': {
    fontFamily: 'var(--font-sans)',
    fontWeight: 400,
    fontSize: '3.5625rem',
    lineHeight: '4rem',
    letterSpacing: '-0.015625em',
  },
  'display-medium': {
    fontFamily: 'var(--font-sans)',
    fontWeight: 400,
    fontSize: '2.8125rem',
    lineHeight: '3.25rem',
    letterSpacing: '0',
  },
  'display-small': {
    fontFamily: 'var(--font-sans)',
    fontWeight: 400,
    fontSize: '2.25rem',
    lineHeight: '2.75rem',
    letterSpacing: '0',
  },
  'headline-large': {
    fontFamily: 'var(--font-sans)',
    fontWeight: 400,
    fontSize: '2rem',
    lineHeight: '2.5rem',
    letterSpacing: '0',
  },
  'headline-medium': {
    fontFamily: 'var(--font-sans)',
    fontWeight: 400,
    fontSize: '1.75rem',
    lineHeight: '2.25rem',
    letterSpacing: '0',
  },
  'headline-small': {
    fontFamily: 'var(--font-sans)',
    fontWeight: 400,
    fontSize: '1.5rem',
    lineHeight: '2rem',
    letterSpacing: '0',
  },
  'title-large': {
    fontFamily: 'var(--font-sans)',
    fontWeight: 400,
    fontSize: '1.375rem',
    lineHeight: '1.75rem',
    letterSpacing: '0',
  },
  'title-medium': {
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    fontSize: '1rem',
    lineHeight: '1.5rem',
    letterSpacing: '0.009375em',
  },
  'title-small': {
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    letterSpacing: '0.00625em',
  },
  'body-large': {
    fontFamily: 'var(--font-sans)',
    fontWeight: 400,
    fontSize: '1rem',
    lineHeight: '1.5rem',
    letterSpacing: '0.03125em',
  },
  'body-medium': {
    fontFamily: 'var(--font-sans)',
    fontWeight: 400,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    letterSpacing: '0.015625em',
  },
  'body-small': {
    fontFamily: 'var(--font-sans)',
    fontWeight: 400,
    fontSize: '0.75rem',
    lineHeight: '1rem',
    letterSpacing: '0.025em',
  },
  'label-large': {
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    letterSpacing: '0.00625em',
  },
  'label-medium': {
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    fontSize: '0.75rem',
    lineHeight: '1rem',
    letterSpacing: '0.03125em',
  },
  'label-small': {
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    fontSize: '0.6875rem',
    lineHeight: '1rem',
    letterSpacing: '0.03125em',
  },
};

export function typeStyleToCss(token: M3TypeToken): string {
  const s = typeScale[token];
  return `
  font-family: ${s.fontFamily};
  font-weight: ${s.fontWeight};
  font-size: ${s.fontSize};
  line-height: ${s.lineHeight};
  letter-spacing: ${s.letterSpacing};
  `;
}

export function generateTypeScaleCss(): string {
  let css = '';
  for (const [token, style] of Object.entries(typeScale)) {
    const className = `.m3-${token}`;
    css += `${className} {
  font-family: ${style.fontFamily};
  font-weight: ${style.fontWeight};
  font-size: ${style.fontSize};
  line-height: ${style.lineHeight};
  letter-spacing: ${style.letterSpacing};
}
`;
  }
  return css;
}
