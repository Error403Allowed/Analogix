import { forwardRef, type HTMLAttributes, type ButtonHTMLAttributes } from 'react';

export const M3Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { variant?: 'elevated'|'filled'|'outlined' }>(
  ({ variant = 'filled', style, children, ...p }, ref) => {
    const bg = variant === 'filled' ? 'var(--md-sys-color-surface-variant)'
      : variant === 'elevated' ? 'var(--md-sys-color-surface)'
      : 'transparent';
    const border = variant === 'outlined' ? '1px solid var(--md-sys-color-outline)' : 'none';
    const shadow = variant === 'elevated' ? '0 1px 3px 1px rgba(0,0,0,0.08)' : 'none';
    return (
      <div ref={ref} style={{ background: bg, borderRadius: '28px', border, boxShadow: shadow, overflow: 'hidden', ...style }} {...p}>
        {children}
      </div>
    );
  }
);
M3Card.displayName = 'M3Card';

export const M3CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ style, ...p }, ref) => (
  <div ref={ref} style={{ padding: '20px 24px', ...style }} {...p} />
));
M3CardContent.displayName = 'M3CardContent';
