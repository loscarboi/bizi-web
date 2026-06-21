'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getContexto, getAccessToken } from '@/lib/api';
import type { ContextoResponse } from '@/lib/api';
import { fetchAppConfig, DEFAULT_CONFIG } from '@/lib/data';
import type { AppConfig } from '@/lib/data';
import AppShell from '@/components/AppShell';
import VitalAgeBadge from '@/components/dashboard/VitalAgeBadge';
import SistemaCard from '@/components/dashboard/SistemaCard';

export default function DashboardPage() {
  const router                          = useRouter();
  const [contexto, setContexto]         = useState<ContextoResponse | null>(null);
  const [appConfig, setAppConfig]       = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [refreshing, setRefreshing]     = useState(false);

  const load = useCallback(async (regenerar = false) => {
    if (!getAccessToken()) { router.push('/login'); return; }
    try {
      const data = await getContexto(regenerar);
      setContexto(data);
      setError('');
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'session_expired') { router.push('/login'); return; }
      setError(e.message ?? 'Error al cargar datos');
    }
  }, [router]);

  useEffect(() => {
    load().finally(() => setLoading(false));
    fetchAppConfig().then(setAppConfig).catch(() => {});
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }

  const ctx18a    = contexto?.contexto_18a ?? null;
  const marcadores = ctx18a?.marcadores   ?? {};
  const sistemas   = ctx18a?.scores?.sistemas ?? {};
  const vitalAge   = ctx18a?.vitalAge ?? ctx18a?.scores?.vitalAge ?? null;
  const obj6b      = contexto?.objetivos_6b ?? {};
  const alertas    = ctx18a?.alertas ?? [];
  const fecha      = contexto?.fecha ?? '';

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: '#F5F3EE' }}>
              Dashboard
            </h1>
            {fecha && (
              <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                {new Date(fecha).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="text-xs px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-40"
            style={{ background: '#1C1C3A', color: '#6B7280', border: '1px solid #2E2E58' }}
          >
            {refreshing ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div
              className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#4A7C6F', borderTopColor: 'transparent' }}
            />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="p-4 rounded-xl text-sm" style={{ background: '#3D1510', color: '#C0524A' }}>
            {error}
          </div>
        )}

        {/* Content */}
        {!loading && !error && contexto && (
          <div className="space-y-4">
            {/* VitalAge */}
            <VitalAgeBadge vitalAge={vitalAge} resumen={ctx18a?.resumen} />

            {/* Alertas */}
            {alertas.length > 0 && (
              <div className="space-y-2">
                {alertas.map((a, i) => (
                  <div
                    key={i}
                    className="px-4 py-3 rounded-lg text-sm"
                    style={{ background: '#3D2710', color: '#C9933A' }}
                  >
                    {a}
                  </div>
                ))}
              </div>
            )}

            {/* Sin datos */}
            {!ctx18a && (
              <div
                className="p-6 rounded-xl text-sm text-center"
                style={{ background: '#1C1C3A', color: '#6B7280' }}
              >
                Sin datos de hoy. Sincroniza tu Apple Watch desde la app iOS.
              </div>
            )}

            {/* Sistemas */}
            {appConfig.sistemas.map(sist => (
              <SistemaCard
                key={sist.key}
                sist={sist}
                detalle={sistemas[sist.key] ?? null}
                marcadores={marcadores}
                obj6b={obj6b}
                nombres={appConfig.marcadores.nombres}
                unidades={appConfig.marcadores.unidades}
                fuentes={appConfig.marcadores.fuentes}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
