'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getContexto, getAccessToken } from '@/lib/api';
import type { ContextoResponse } from '@/lib/api';
import AppShell from '@/components/AppShell';
import Topbar from '@/components/Topbar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const champ   = '#CDB489';
const optimo  = '#9FC6AE';
const atencion = '#D49A7E';

type Tag = 'Prioridad' | 'Patrón' | 'Hábito' | 'Fortaleza' | 'En observación';

function tagStyle(t: Tag): React.CSSProperties {
  if (t === 'Prioridad')    return { color: '#08090B', background: champ, border: 'none' };
  if (t === 'Fortaleza' || t === 'Hábito')
    return { color: optimo, background: 'transparent', border: '1px solid rgba(159,198,174,.45)' };
  if (t === 'En observación')
    return { color: atencion, background: 'transparent', border: '1px solid rgba(212,154,126,.45)' };
  return { color: '#C5CAD1', background: 'transparent', border: '1px solid rgba(232,235,239,.22)' };
}

function insightTag(tipo: string): Tag {
  if (tipo.includes('prioridad') || tipo.includes('alerta')) return 'Prioridad';
  if (tipo.includes('patron') || tipo.includes('patrón'))    return 'Patrón';
  if (tipo.includes('habito') || tipo.includes('hábito'))    return 'Hábito';
  if (tipo.includes('fortaleza') || tipo.includes('positivo')) return 'Fortaleza';
  return 'En observación';
}

function confidenceColor(c: number): string {
  if (c >= 0.75) return optimo;
  if (c >= 0.50) return champ;
  return atencion;
}

// ─── Report modal ─────────────────────────────────────────────────────────────

function ReportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(8,9,11,.78)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 520, maxWidth: '100%',
        background: '#101216',
        border: '1px solid rgba(205,180,137,.32)', borderRadius: 22,
        padding: '34px 36px',
        boxShadow: '0 50px 130px -30px rgba(0,0,0,.85)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 25, fontWeight: 500, color: '#E8EBEF' }}>Solicitar informe</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9298A0', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        <p style={{ fontSize: 16, lineHeight: 1.55, color: '#AEB4BC', marginBottom: 28 }}>
          Benjamin reunirá tus insights y biomarcadores en un documento estructurado para compartir con tu médico. Recibirás una notificación cuando esté listo.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Informe completo de salud', desc: 'Todos los sistemas + tendencias + recomendaciones' },
            { label: 'Resumen ejecutivo', desc: 'VitalAge + top 5 palancas de mejora' },
            { label: 'Revisión metabólica', desc: 'CGM, Tanita, glucosa, biomarcadores lab' },
          ].map(({ label, desc }) => (
            <button key={label} onClick={onClose} style={{
              border: '1px solid rgba(232,235,239,.12)', borderRadius: 14, padding: '18px 20px',
              background: 'rgba(232,235,239,.03)', textAlign: 'left', cursor: 'pointer',
              fontFamily: 'inherit', color: 'inherit', transition: '.18s',
            }}>
              <div style={{ fontSize: 16, color: '#E2E5EA', marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12, letterSpacing: '.03em', color: '#7C828A' }}>{desc}</div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 16, fontFamily: 'var(--font-mono), monospace', fontSize: 12, letterSpacing: '.04em', color: '#7C828A', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: optimo, flexShrink: 0, display: 'inline-block' }} />
          Los informes se generan de forma asíncrona y quedan cifrados en tu perfil.
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const MOCK_REPORTS = [
  { name: 'Informe de salud — Junio 2026', meta: '04 JUN 2026 · 12 marcadores', state: 'Disponible' },
  { name: 'Revisión cardiovascular', meta: '01 MAY 2026 · 6 marcadores', state: 'Disponible' },
  { name: 'Informe metabólico Q1', meta: '28 MAR 2026 · 9 marcadores', state: 'Generado' },
];

export default function InsightsPage() {
  const router = useRouter();

  const [contexto, setContexto]       = useState<ContextoResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [reportOpen, setReportOpen]   = useState(false);

  const load = useCallback(async () => {
    if (!getAccessToken()) { router.push('/login'); return; }
    try {
      const data = await getContexto();
      setContexto(data);
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'session_expired') router.push('/login');
    }
  }, [router]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const insights = contexto?.insights ?? [];
  const ctx18a   = contexto?.contexto_18a ?? null;
  const vitalAge = ctx18a?.vitalAge ?? ctx18a?.scores?.vitalAge ?? null;

  return (
    <AppShell>
      <Topbar
        ctaLabel="Solicitar informe"
        onCta={() => setReportOpen(true)}
      />

      <div style={{ padding: '46px 56px 64px' }}>

        {/* Header */}
        <div style={{ marginBottom: 38 }}>
          <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 13, letterSpacing: '.2em', textTransform: 'uppercase', color: '#9AA0A8', marginBottom: 14 }}>
            Insights · Benjamin IA
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 500, letterSpacing: '-.02em', color: '#E8EBEF', margin: 0 }}>
            Lo que Benjamin ha aprendido de ti
          </h1>
          <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 13.5, letterSpacing: '.04em', color: '#9298A0', marginTop: 14 }}>
            {insights.length} insights activos · actualizado hoy
          </div>
        </div>

        {/* Trend card */}
        {vitalAge != null && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 48,
            alignItems: 'center',
            border: '1px solid rgba(232,235,239,.09)', borderRadius: 20, padding: '36px 40px',
            background: 'linear-gradient(180deg, rgba(232,235,239,.022), transparent)',
            marginBottom: 42,
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 13, letterSpacing: '.2em', textTransform: 'uppercase', color: '#9AA0A8', marginBottom: 18 }}>
                Edad biológica · tendencia
              </div>
              <div style={{ fontSize: 88, lineHeight: .95, fontWeight: 500, letterSpacing: '-.03em', color: champ, display: 'flex', alignItems: 'baseline', gap: 12 }}>
                {vitalAge.toFixed(1)}
                <span style={{ fontSize: 22, color: '#9AA0A8', letterSpacing: 0 }}>años</span>
              </div>
              <p style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 17, color: '#D6DAE0', margin: '22px 0 0', lineHeight: 1.45 }}>
                <span style={{
                  width: 30, height: 30, flexShrink: 0, borderRadius: '50%',
                  border: '1px solid rgba(205,180,137,.6)',
                  display: 'grid', placeItems: 'center',
                  fontFamily: 'var(--font-serif), serif', fontSize: 15, color: champ,
                }}>B</span>
                Seguimos en la dirección correcta. El ritmo es sostenible.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7C828A' }}>
                Historial de edad biológica disponible próximamente
              </div>
            </div>
          </div>
        )}

        {/* Two-col grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 28, alignItems: 'start' }}>

          {/* Insights feed */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 13, letterSpacing: '.16em', textTransform: 'uppercase', color: '#9AA0A8', marginBottom: 20 }}>
              Memoria de Benjamin · todos los sistemas
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${champ}`, borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                </div>
              )}
              {!loading && insights.length === 0 && (
                <div style={{
                  border: '1px solid rgba(232,235,239,.08)', borderRadius: 16, padding: '32px 26px',
                  color: '#7C828A', fontSize: 16, textAlign: 'center',
                }}>
                  Benjamin aún no ha registrado insights. Continúa conversando con él para que aprenda tu patrón.
                </div>
              )}
              {insights.map((ins, i) => {
                const tag   = insightTag(ins.tipo);
                const isPrio = tag === 'Prioridad';
                return (
                  <div key={i} style={{
                    border: `1px solid ${isPrio ? 'rgba(205,180,137,.42)' : 'rgba(232,235,239,.09)'}`,
                    borderRadius: 16, padding: '24px 26px',
                    background: isPrio
                      ? 'linear-gradient(180deg, rgba(205,180,137,.07), rgba(205,180,137,.01))'
                      : 'linear-gradient(180deg, rgba(232,235,239,.022), transparent)',
                  }}>
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15, flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        fontFamily: 'var(--font-mono), monospace', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase',
                        color: '#9298A0',
                      }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9298A0', display: 'inline-block' }} />
                        {ins.tipo}
                      </span>
                      <span style={{
                        ...tagStyle(tag),
                        fontFamily: 'var(--font-mono), monospace', fontSize: 11,
                        letterSpacing: '.12em', textTransform: 'uppercase',
                        borderRadius: 5, padding: '4px 10px',
                      }}>
                        {tag}
                      </span>
                      <span style={{
                        marginLeft: 'auto',
                        fontFamily: 'var(--font-mono), monospace', fontSize: 12, letterSpacing: '.04em', color: '#7C828A',
                      }}>
                        confianza {Math.round(ins.confianza * 100)}%
                        <span style={{
                          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                          background: confidenceColor(ins.confianza), marginLeft: 8,
                        }} />
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 19, lineHeight: 1.5, color: '#E2E5EA', letterSpacing: '-.005em' }}>
                      {ins.observacion}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reports aside */}
          <aside>
            <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 13, letterSpacing: '.16em', textTransform: 'uppercase', color: '#9AA0A8', marginBottom: 20 }}>
              Informes
            </div>

            {/* CTA card */}
            <div style={{
              border: '1px solid rgba(205,180,137,.32)', borderRadius: 18, padding: 26,
              background: 'linear-gradient(180deg, rgba(205,180,137,.07), rgba(205,180,137,.012))',
              marginBottom: 24,
            }}>
              <div style={{ fontSize: 21, fontWeight: 500, color: '#E8EBEF', marginBottom: 12 }}>Solicitar informe</div>
              <p style={{ fontSize: 15, lineHeight: 1.5, color: '#AEB4BC', marginBottom: 22 }}>
                Benjamin reúne tus insights y biomarcadores en un documento listo para tu médico o tu equipo.
              </p>
              <button onClick={() => setReportOpen(true)} style={{
                display: 'block', width: '100%',
                fontFamily: 'var(--font-mono), monospace', fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase',
                color: '#08090B', background: champ, border: 'none', borderRadius: 12,
                padding: 15, cursor: 'pointer', transition: '.18s', marginBottom: 10,
              }}>
                Generar informe nuevo
              </button>
              <button onClick={() => {}} style={{
                display: 'block', width: '100%',
                fontFamily: 'var(--font-mono), monospace', fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase',
                background: 'transparent', color: champ,
                border: '1px solid rgba(205,180,137,.4)', borderRadius: 12,
                padding: 15, cursor: 'pointer', transition: '.18s',
              }}>
                Revisión completa de insights
              </button>
            </div>

            {/* Reports list */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {MOCK_REPORTS.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                  padding: '18px 4px',
                  borderBottom: '1px solid rgba(232,235,239,.08)',
                  ...(i === 0 ? { borderTop: '1px solid rgba(232,235,239,.08)' } : {}),
                }}>
                  <div>
                    <div style={{ fontSize: 16, color: '#E2E5EA' }}>{r.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12, letterSpacing: '.03em', color: '#7C828A', marginTop: 5 }}>{r.meta}</div>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase',
                    color: r.state === 'Disponible' ? optimo : '#9298A0',
                    border: `1px solid ${r.state === 'Disponible' ? 'rgba(159,198,174,.45)' : 'rgba(232,235,239,.18)'}`,
                    borderRadius: 999, padding: '5px 12px', whiteSpace: 'nowrap',
                  }}>
                    {r.state}
                  </span>
                </div>
              ))}
            </div>

            {/* Privacy note */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 9,
              fontFamily: 'var(--font-mono), monospace', fontSize: 12, letterSpacing: '.04em',
              color: '#7C828A', lineHeight: 1.5, marginTop: 24,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: optimo, marginTop: 4, flexShrink: 0, display: 'inline-block' }} />
              Tus insights se guardan cifrados. La conversación con Benjamin, no.
            </div>
          </aside>
        </div>
      </div>

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppShell>
  );
}
