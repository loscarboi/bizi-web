'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearTokens, logoutApi, getAccessToken } from '@/lib/api';
import AppShell from '@/components/AppShell';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://grateful-charm-production.up.railway.app';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold tracking-[0.15em] uppercase px-1" style={{ color: '#4B5563' }}>
        {title}
      </p>
      <div className="rounded-xl overflow-hidden" style={{ background: '#1C1C3A', border: '1px solid #2E2E58' }}>
        {children}
      </div>
    </div>
  );
}

function Row({
  label, value, chevron, danger, onClick,
}: {
  label: string;
  value?: string;
  chevron?: boolean;
  danger?: boolean;
  onClick?: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      className="flex w-full items-center justify-between px-4 py-3.5 border-b last:border-0 text-left transition-colors disabled:cursor-default"
      style={{
        borderColor: '#2E2E58',
        background: pressed ? '#252550' : 'transparent',
      }}
    >
      <span className="text-sm" style={{ color: danger ? '#C0524A' : '#F5F3EE' }}>{label}</span>
      <div className="flex items-center gap-2">
        {value && <span className="text-sm" style={{ color: '#4B5563' }}>{value}</span>}
        {chevron && <span className="text-lg" style={{ color: '#4B5563' }}>›</span>}
      </div>
    </button>
  );
}

export default function AjustesPage() {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleLogout() {
    const refresh = localStorage.getItem('bizi_refresh') ?? '';
    try { await logoutApi(refresh); } catch { /* ignore */ }
    clearTokens();
    router.push('/login');
  }

  async function handleEliminar() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      const token = getAccessToken();
      await fetch(`${API_URL}/api/auth/cuenta`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
    } catch { /* ignore */ }
    clearTokens();
    router.push('/login');
  }

  return (
    <AppShell>
      <div className="max-w-xl mx-auto px-6 py-8 space-y-8">
        <h1 className="text-xl font-light tracking-tight" style={{ color: '#F5F3EE' }}>Ajustes</h1>

        <Section title="Cuenta">
          <Row label="Cerrar sesión" chevron onClick={handleLogout} />
          {!confirmDelete ? (
            <Row label="Eliminar cuenta y todos mis datos" danger chevron onClick={handleEliminar} />
          ) : (
            <div className="px-4 py-4 border-t" style={{ borderColor: '#2E2E58' }}>
              <p className="text-sm mb-3" style={{ color: '#C0524A' }}>
                Se borrarán TODOS tus datos permanentemente. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2 rounded-lg text-sm"
                  style={{ background: '#252550', color: '#F5F3EE' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEliminar}
                  disabled={deleting}
                  className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{ background: '#C0524A', color: '#F5F3EE' }}
                >
                  {deleting ? 'Eliminando…' : 'Eliminar todo'}
                </button>
              </div>
            </div>
          )}
        </Section>

        <Section title="Información">
          <Row
            label="Preguntas frecuentes"
            chevron
            onClick={() => window.open('https://bizi.living/faq', '_blank')}
          />
          <Row
            label="Sobre Benjamin y el Libro Blanco"
            chevron
            onClick={() => window.open('https://bizi.living/benjamin', '_blank')}
          />
          <Row
            label="Cómo protegemos tu privacidad"
            chevron
            onClick={() => window.open('https://bizi.living/privacidad', '_blank')}
          />
        </Section>

        <p className="text-xs text-center" style={{ color: '#4B5563' }}>
          Bizi v1.0.0-beta · bizi.living
        </p>
      </div>
    </AppShell>
  );
}
