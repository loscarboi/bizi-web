'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearTokens, logoutApi, getAccessToken } from '@/lib/api';
import AppShell from '@/components/AppShell';
import Topbar from '@/components/Topbar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://grateful-charm-production.up.railway.app';
const champ    = '#CDB489';
const atencion = '#D49A7E';
const optimo   = '#9FC6AE';

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
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      const token = getAccessToken();
      await fetch(`${BASE_URL}/api/auth/cuenta`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
    } catch { /* ignore */ }
    clearTokens();
    router.push('/login');
  }

  return (
    <AppShell>
      <Topbar />

      <div style={{ padding: '46px 56px 64px', maxWidth: 680 }}>

        <h1 style={{ fontSize: 44, fontWeight: 500, letterSpacing: '-.02em', color: '#E8EBEF', marginBottom: 8 }}>
          Ajustes
        </h1>
        <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 13, letterSpacing: '.04em', color: '#9298A0', marginBottom: 46 }}>
          Cuenta y privacidad
        </div>

        {/* Privacy */}
        <Section title="Privacidad">
          <InfoRow label="Tus datos de salud" value="Cifrados en reposo y tránsito" />
          <InfoRow label="Conversaciones con Benjamin" value="Efímeras · no se guardan" />
          <InfoRow label="Insights y biomarcadores" value="Cifrados · solo tú los ves" />
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            fontFamily: 'var(--font-mono), monospace', fontSize: 12, letterSpacing: '.04em',
            color: '#7C828A', lineHeight: 1.5, padding: '16px 0',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: optimo, flexShrink: 0, display: 'inline-block' }} />
            Arquitectura de triple base de datos — tu identidad nunca toca tus datos de salud.
          </div>
        </Section>

        {/* Account */}
        <Section title="Cuenta">
          <ActionRow label="Cerrar sesión" onClick={handleLogout} />
          {!confirmDelete ? (
            <div style={{ padding: '16px 0' }}>
              <button onClick={handleEliminar} style={{
                fontFamily: 'var(--font-mono), monospace', fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase',
                color: atencion, background: 'transparent',
                border: `1px solid rgba(212,154,126,.35)`, borderRadius: 12,
                padding: '14px 24px', cursor: 'pointer', transition: '.18s',
              }}>
                Eliminar cuenta y todos mis datos
              </button>
            </div>
          ) : (
            <div style={{ padding: '20px 0' }}>
              <p style={{ fontSize: 16, color: '#AEB4BC', marginBottom: 16, lineHeight: 1.5 }}>
                Esta acción es irreversible. Se borrarán TODOS tus datos permanentemente.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setConfirmDelete(false)} style={{
                  fontFamily: 'var(--font-mono), monospace', fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase',
                  color: '#C5CAD1', background: 'transparent',
                  border: '1px solid rgba(232,235,239,.2)', borderRadius: 12,
                  padding: '14px 24px', cursor: 'pointer',
                }}>Cancelar</button>
                <button onClick={handleEliminar} disabled={deleting} style={{
                  fontFamily: 'var(--font-mono), monospace', fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase',
                  color: '#08090B', background: atencion, border: 'none', borderRadius: 12,
                  padding: '14px 24px', cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? .7 : 1,
                }}>
                  {deleting ? 'Eliminando…' : 'Confirmar — eliminar todo'}
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* Info */}
        <Section title="Información">
          <InfoRow label="Versión" value="Bizi v1.0.0-beta" />
          <InfoRow label="Dominio" value="bizi.living" />
          <InfoRow label="Modelo IA" value="Benjamin — Claude Sonnet" />
        </Section>

        <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12, letterSpacing: '.04em', color: '#4B5563', marginTop: 40 }}>
          Bizi · bizi.living · v1.0.0-beta
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{
        fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase',
        color: '#9298A0', marginBottom: 16,
      }}>
        {title}
      </div>
      <div style={{
        border: '1px solid rgba(232,235,239,.08)', borderRadius: 16,
        background: 'linear-gradient(180deg, rgba(232,235,239,.022), transparent)',
        padding: '0 24px',
      }}>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px 0', borderBottom: '1px solid rgba(232,235,239,.06)',
    }}>
      <span style={{ fontSize: 15, color: '#C5CAD1' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 13, letterSpacing: '.03em', color: '#7C828A' }}>{value}</span>
    </div>
  );
}

function ActionRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px 0', borderBottom: '1px solid rgba(232,235,239,.06)',
      background: 'none', border: 'none',
      cursor: 'pointer', fontFamily: 'inherit',
    } as React.CSSProperties}>
      <span style={{ fontSize: 15, color: '#E8EBEF' }}>{label}</span>
      <span style={{ color: '#7C828A', fontSize: 20 }}>›</span>
    </button>
  );
}
