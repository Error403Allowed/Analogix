import { forwardRef, type ButtonHTMLAttributes } from 'react';

const variants: Record<string, React.CSSProperties> = {
  filled: { background: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)' },
  tonal: { background: 'var(--md-sys-color-secondary-container)', color: 'var(--md-sys-color-on-secondary-container)' },
  outlined: { background: 'transparent', color: 'var(--md-sys-color-primary)', border: '1px solid var(--md-sys-color-outline)' },
  text: { background: 'transparent', color: 'var(--md-sys-color-primary)' },
};

export const M3Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }>(
  ({ variant = 'filled', style, children, ...p }, ref) => (
    <button ref={ref} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
      height: '40px', padding: '0 24px', borderRadius: '9999px', border: 'none', cursor: 'pointer',
      fontFamily: 'Roboto, system-ui, sans-serif', fontSize: '0.875rem', fontWeight: 500,
      lineHeight: '1.25rem', letterSpacing: '0.00625em',
      ...variants[variant] || variants.filled,
      ...style,
    }} {...p}>
      {children}
    </button>
  )
);
M3Button.displayName = 'M3Button';
