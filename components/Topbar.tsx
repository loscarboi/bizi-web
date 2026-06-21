'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/insights',  label: 'Insights'  },
  { href: '/ajustes',   label: 'Ajustes'   },
];

interface TopbarProps {
  userName?:   string;
  syncMeta?:   string;
  ctaLabel?:   string;
  ctaLoading?: boolean;
  onCta?:      () => void;
}

export default function Topbar({ userName, syncMeta, ctaLabel, ctaLoading, onCta }: TopbarProps) {
  const pathname = usePathname();

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '28px 56px',
      borderBottom: '1px solid rgba(232,235,239,.07)',
    }}>
      {/* Brand */}
      <div style={{
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 13, letterSpacing: '.36em',
        color: '#AEB4BC',
      }}>
        BIZI
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', gap: 34 }}>
        {NAV.map(({ href, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href} style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 13, letterSpacing: '.12em',
              textTransform: 'uppercase',
              color: active ? '#E8EBEF' : '#9298A0',
              textDecoration: 'none',
              transition: 'color .18s',
            }}>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {userName && (
          <span style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 13, letterSpacing: '.06em', color: '#C5CAD1',
          }}>
            {userName}
          </span>
        )}
        {syncMeta && (
          <span style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 12, letterSpacing: '.06em', color: '#7C828A',
          }}>
            {syncMeta}
          </span>
        )}
        {ctaLabel && (
          <button
            onClick={onCta}
            disabled={ctaLoading}
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 13, letterSpacing: '.12em', textTransform: 'uppercase',
              color: '#08090B', background: '#CDB489',
              border: 'none', borderRadius: 999,
              padding: '13px 28px', cursor: ctaLoading ? 'not-allowed' : 'pointer',
              opacity: ctaLoading ? .7 : 1,
              transition: '.2s', display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {ctaLoading ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>
              </svg>
            ) : ctaLabel === 'Sincronizar' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>
              </svg>
            ) : null}
            {ctaLoading ? 'Sincronizando…' : ctaLabel}
          </button>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </header>
  );
}
