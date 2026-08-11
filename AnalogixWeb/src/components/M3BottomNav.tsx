'use client';

import { useRouter, usePathname } from 'next/navigation';

const items = [
  { label: 'Home',     path: '/dashboard' },
  { label: 'Tutor',    path: '/chat' },
  { label: 'Quiz',     path: '/quiz' },
  { label: 'Calendar', path: '/calendar' },
  { label: 'Profile',  path: '/support' },
];

export default function M3BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-14 px-2 border-t" style={{
      background: 'var(--md-sys-color-surface)',
      borderColor: 'var(--md-sys-color-outline-variant)',
    }}>
      {items.map((item) => {
        const active = pathname.startsWith(item.path);
        const icons: Record<string, string> = {
          '/dashboard': 'home', '/chat': 'chat', '/quiz': 'quiz',
          '/calendar': 'calendar_today', '/support': 'person',
        };
        return (
          <button key={item.path} onClick={() => router.push(item.path)}
            className="flex flex-col items-center justify-center gap-0.5 h-10 px-3 rounded-xl transition-colors relative"
            style={{ color: active ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)' }}>
            {active && <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-sm" style={{ background: 'var(--md-sys-color-primary)' }} />}
            <span className="material-symbols-outlined text-xl">{icons[item.path]}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
