'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/api';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!getAccessToken()) router.push('/login');
  }, [router]);

  return (
    <div style={{ background: '#08090B', minHeight: '100vh', color: '#E8EBEF' }}>
      {children}
    </div>
  );
}
