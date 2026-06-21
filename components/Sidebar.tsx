'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Dashboard',  icon: '◈' },
  { href: '/chat',      label: 'Benjamin',   icon: '◎' },
  { href: '/ajustes',   label: 'Ajustes',    icon: '⊙' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col w-56 shrink-0 h-full border-r"
      style={{ background: '#0D0D1A', borderColor: '#2E2E58' }}
    >
      {/* Brand */}
      <div className="px-6 py-6 border-b" style={{ borderColor: '#2E2E58' }}>
        <p className="text-xs tracking-[0.25em] uppercase" style={{ color: '#6B7280' }}>BIZI</p>
        <p className="text-base font-medium mt-0.5" style={{ color: '#F5F3EE' }}>Benjamin</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                active
                  ? 'font-medium'
                  : 'hover:opacity-80',
              )}
              style={{
                background: active ? '#1C1C3A' : 'transparent',
                color: active ? '#F5F3EE' : '#6B7280',
              }}
            >
              <span className="text-base w-4 text-center">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Version */}
      <div className="px-6 py-4 border-t" style={{ borderColor: '#2E2E58' }}>
        <p className="text-[10px]" style={{ color: '#4B5563' }}>Bizi v1.0.0-beta</p>
      </div>
    </aside>
  );
}
