import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type V = 'elevated' | 'filled' | 'outlined';
const vc: Record<V, string> = { elevated: 'm3-card m3-card-elevated', filled: 'm3-card m3-card-filled', outlined: 'm3-card m3-card-outlined' };

export const M3Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { variant?: V }>(({ className, variant = 'filled', ...p }, ref) => (
  <div ref={ref} className={cn(vc[variant], className)} {...p} />
));
M3Card.displayName = 'M3Card';

export const M3CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...p }, ref) => (
  <div ref={ref} className={cn('px-6 py-5', className)} {...p} />
));
M3CardContent.displayName = 'M3CardContent';
