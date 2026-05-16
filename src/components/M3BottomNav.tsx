'use client';

import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  HomeRounded, ChatRounded, QuizRounded, CalendarMonthRounded, PersonRounded,
} from '@mui/icons-material';

const items = [
  { label: 'Home',     icon: <HomeRounded />,          path: '/dashboard' },
  { label: 'Tutor',    icon: <ChatRounded />,          path: '/chat' },
  { label: 'Quiz',     icon: <QuizRounded />,          path: '/quiz' },
  { label: 'Calendar', icon: <CalendarMonthRounded />, path: '/calendar' },
  { label: 'Profile',  icon: <PersonRounded />,        path: '/support' },
];

export default function M3BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const activeIndex = items.findIndex(i => pathname.startsWith(i.path));

  return (
    <nav className="md:hidden m3-navbar">
      {items.map((item, i) => (
        <button
          key={item.label}
          onClick={() => router.push(item.path)}
          className={cn('m3-navbar-item', i === activeIndex && 'active')}
        >
          <span className="w-6 h-6 flex items-center justify-center">{item.icon}</span>
          <span className="text-[10px] leading-none">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
