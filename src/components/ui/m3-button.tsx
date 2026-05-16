import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type V = 'filled' | 'tonal' | 'outlined' | 'text';
type S = 'sm' | 'md' | 'lg';
const vc: Record<V, string> = { filled: 'm3-btn m3-btn-filled', tonal: 'm3-btn m3-btn-tonal', outlined: 'm3-btn m3-btn-outlined', text: 'm3-btn m3-btn-text' };
const sc: Record<S, string> = { sm: 'h-9 px-4 text-xs', md: 'h-10 px-6', lg: 'm3-btn-lg' };

export const M3Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: V; size?: S }>(({ className, variant = 'filled', size = 'md', ...p }, ref) => (
  <button ref={ref} className={cn(vc[variant], sc[size], className)} {...p} />
));
M3Button.displayName = 'M3Button';
