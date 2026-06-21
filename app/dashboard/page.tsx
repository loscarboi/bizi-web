'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  getContexto, getAccessToken, iniciarSesion, cerrarSesion,
  preguntarBenjamin, getProfile, computeAge, uploadGarminExport,
  getMarcadorHistorial,
  type GarminImportResult, type HistorialPunto,
} from '@/lib/api';
import type { ContextoResponse, Profile } from '@/lib/api';
import { fetchAppConfig, DEFAULT_CONFIG } from '@/lib/data';
import type { AppConfig } from '@/lib/data';
import AppShell from '@/components/AppShell';
import Topbar from '@/components/Topbar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const champ = '#CDB489';
const optimo  = '#9FC6AE';
const atencion = '#D49A7E';

function statColor(score: number | null): string {
  if (score == null) return 'rgba(232,235,239,.2)';
  if (score >= 75) return optimo;
  if (score >= 50) return champ;
  return atencion;
}
function statLabel(score: number | null): string {
  if (score == null) return 'Sin datos';
  if (score >= 75) return 'Óptimo';
  if (score >= 50) return 'Sólido';
  return 'Atención';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora mismo';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GaugeSVG({ score, color }: { score: number; color: string }) {
  const size = 76, stroke = 5, r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = c * (270 / 360);
  const off = arc * (1 - score / 100);
  const trans = `rotate(135 ${size / 2} ${size / 2})`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(232,235,239,.10)" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${arc} ${c}`} transform={trans} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${arc - off} ${c}`} transform={trans} />
    </svg>
  );
}

interface GaugeTileProps {
  sist:     { key: string; label: string; marcadores: string[] };
  score:    number | null;
  nData:    number;
  selected: boolean;
  onClick:  () => void;
}

function GaugeTile({ sist, score, nData, selected, onClick }: GaugeTileProps) {
  const color = statColor(score);
  const label = statLabel(score);
  return (
    <button onClick={onClick} style={{
      border: `1px solid ${selected ? champ : 'rgba(232,235,239,.08)'}`,
      borderRadius: 16, padding: '26px 28px',
      background: selected
        ? `linear-gradient(180deg, rgba(205,180,137,.10), rgba(205,180,137,.02))`
        : `linear-gradient(180deg, rgba(232,235,239,.025), transparent)`,
      boxShadow: selected ? `0 0 0 1px ${champ} inset, 0 18px 40px -24px rgba(205,180,137,.5)` : 'none',
      display: 'grid',
      gridTemplateColumns: 'auto 1fr',
      gridTemplateRows: 'auto auto',
      columnGap: 22, rowGap: 8,
      alignItems: 'center',
      width: '100%', textAlign: 'left', cursor: 'pointer',
      transition: '.2s', fontFamily: 'inherit', color: 'inherit',
    }}>
      {/* Gauge */}
      <div style={{ position: 'relative', width: 76, height: 76, gridRow: '1 / span 2', display: 'grid', placeItems: 'center' }}>
        <GaugeSVG score={score ?? 0} color={color} />
        <span style={{ position: 'absolute', fontSize: 24, fontWeight: 500, color: score == null ? '#4B5563' : '#E8EBEF' }}>
          {score ?? '–'}
        </span>
      </div>
      {/* Name */}
      <div style={{ fontSize: 22, fontWeight: 500, alignSelf: 'end', color: '#E8EBEF' }}>{sist.label}</div>
      {/* Status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: 'var(--font-mono), monospace', fontSize: 13,
        letterSpacing: '.1em', textTransform: 'uppercase', color,
        alignSelf: 'start', gridColumn: 2,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
        {label}
      </div>
      {/* Biomarcadores */}
      <div style={{
        gridColumn: '1 / -1',
        fontFamily: 'var(--font-mono), monospace', fontSize: 13.5,
        letterSpacing: '.03em', color: '#9298A0',
        paddingTop: 14, marginTop: 6,
        borderTop: '1px solid rgba(232,235,239,.07)',
      }}>
        {nData}/{sist.marcadores.length} biomarcadores
      </div>
    </button>
  );
}

type Tendencia = 'mejorando' | 'bajando' | 'estable' | 'insuficientes_datos';

function TrendArrow({ tendencia }: { tendencia: Tendencia | undefined }) {
  if (!tendencia || tendencia === 'insuficientes_datos') return null;
  const arrow = tendencia === 'mejorando' ? '↑' : tendencia === 'bajando' ? '↓' : '→';
  const color = tendencia === 'mejorando' ? optimo : tendencia === 'bajando' ? atencion : '#7C828A';
  return (
    <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 15, color, marginLeft: 6, verticalAlign: 'middle' }}>
      {arrow}
    </span>
  );
}

interface ReadoutCardProps {
  name:      string;
  value:     number | null;
  unit:      string;
  src:       string;
  status:    string;
  tendencia: Tendencia | undefined;
  onClick:   () => void;
}

function ReadoutCard({ name, value, unit, src, status, tendencia, onClick }: ReadoutCardProps) {
  const color = status === 'Óptimo' ? optimo : status === 'Sólido' ? champ : status === 'Atención' ? atencion : '#7C828A';
  return (
    <button onClick={onClick} style={{
      border: '1px solid rgba(232,235,239,.08)', borderRadius: 14,
      padding: '24px 22px',
      background: 'rgba(232,235,239,.02)',
      textAlign: 'left', cursor: 'pointer', width: '100%',
      fontFamily: 'inherit', color: 'inherit', transition: '.15s',
    }}
    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(205,180,137,.22)')}
    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(232,235,239,.08)')}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{ fontSize: 40, fontWeight: 500, letterSpacing: '-.02em', color: value == null ? '#4B5563' : '#E8EBEF' }}>
          {value == null ? '–' : typeof value === 'number' ? (Number.isInteger(value) ? value : +value.toFixed(1)) : value}
        </span>
        {unit && <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12, color: '#7C828A' }}>{unit}</span>}
        <TrendArrow tendencia={tendencia} />
      </div>
      <div style={{ fontSize: 17, marginTop: 14, color: '#C5CAD1' }}>{name}</div>
      <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12.5, letterSpacing: '.03em', color: '#9298A0', marginTop: 8 }}>{src}</div>
      <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12.5, letterSpacing: '.12em', textTransform: 'uppercase', marginTop: 14, color }}>{status}</div>
    </button>
  );
}

// ─── Marker detail panel ──────────────────────────────────────────────────────

function SparkLine({ puntos, color }: { puntos: HistorialPunto[]; color: string }) {
  const valid = puntos.filter(p => p.valor != null);
  if (valid.length < 2) return <div style={{ height: 80, display: 'grid', placeItems: 'center', color: '#5C6268', fontSize: 13 }}>Sin datos suficientes</div>;
  const vals = valid.map(p => p.valor!);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  const W = 400, H = 80, PAD = 4;
  const pts = valid.map((p, i) => {
    const x = PAD + (i / (valid.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (p.valor! - minV) / range) * (H - PAD * 2);
    return [x, y] as [number, number];
  });
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const lastPt = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={80} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${lastPt[0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`}
        fill="url(#sparkGrad)" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastPt[0]} cy={lastPt[1]} r="3.5" fill={color} />
    </svg>
  );
}

function MarcadorDetailPanel({ tipoDato, name, unit, tendencia, onClose }: {
  tipoDato:  string;
  name:      string;
  unit:      string;
  tendencia: Tendencia | undefined;
  onClose:   () => void;
}) {
  const [puntos,  setPuntos]  = useState<HistorialPunto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getMarcadorHistorial(tipoDato, 30)
      .then(d => setPuntos(d.puntos))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [tipoDato]);

  const valid = puntos.filter(p => p.valor != null);
  const last  = valid[valid.length - 1];
  const color = tendencia === 'mejorando' ? optimo : tendencia === 'bajando' ? atencion : champ;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: 'rgba(8,9,11,.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: '0 0 40px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 560, maxWidth: '96vw',
        background: '#101216',
        border: '1px solid rgba(205,180,137,.22)', borderRadius: 22,
        padding: '32px 34px',
        boxShadow: '0 -20px 80px -20px rgba(0,0,0,.7)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 500, color: '#E8EBEF' }}>
              {name}
              <TrendArrow tendencia={tendencia} />
            </div>
            <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7C828A', marginTop: 6 }}>
              Últimos 30 días
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9298A0', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {/* Current value */}
        {last && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 24 }}>
            <span style={{ fontSize: 56, fontWeight: 500, letterSpacing: '-.03em', color: '#E8EBEF' }}>
              {Number.isInteger(last.valor) ? last.valor : last.valor?.toFixed(1)}
            </span>
            {unit && <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 14, color: '#7C828A' }}>{unit}</span>}
            <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12, color: '#5C6268', marginLeft: 8 }}>
              {last.fecha}
            </span>
          </div>
        )}

        {/* Chart */}
        <div style={{ background: 'rgba(232,235,239,.025)', borderRadius: 12, padding: '18px 16px', marginBottom: 20 }}>
          {loading ? (
            <div style={{ height: 80, display: 'grid', placeItems: 'center' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${champ}`, borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : error ? (
            <div style={{ height: 80, display: 'grid', placeItems: 'center', color: '#5C6268', fontSize: 13 }}>Error al cargar</div>
          ) : (
            <SparkLine puntos={puntos} color={color} />
          )}
        </div>

        {/* Footer stats */}
        {valid.length >= 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Mínimo', value: Math.min(...valid.map(p => p.valor!)) },
              { label: 'Promedio', value: valid.reduce((a, b) => a + b.valor!, 0) / valid.length },
              { label: 'Máximo', value: Math.max(...valid.map(p => p.valor!)) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'rgba(232,235,239,.04)', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(232,235,239,.07)' }}>
                <div style={{ fontSize: 24, fontWeight: 500, color: '#E8EBEF', letterSpacing: '-.02em' }}>
                  {Number.isInteger(value) ? Math.round(value) : value.toFixed(1)}
                </div>
                <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7C828A', marginTop: 5 }}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add data modal ───────────────────────────────────────────────────────────

type ModalStep = 'sources' | 'manual' | 'sending' | 'done' | 'importing' | 'imported';

function AddDataModal({ open, onClose, onSend }: {
  open: boolean; onClose: () => void; onSend: (text: string) => Promise<void>;
}) {
  const [step,      setStep]      = useState<ModalStep>('sources');
  const [text,      setText]      = useState('');
  const [doneMsg,   setDoneMsg]   = useState('');
  const [importRes, setImportRes] = useState<GarminImportResult | null>(null);
  const [importErr, setImportErr] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) { setStep('sources'); setText(''); setDoneMsg(''); setImportRes(null); setImportErr(''); }
  }, [open]);

  async function handleSend() {
    if (!text.trim()) return;
    setStep('sending');
    try {
      await onSend(text.trim());
      setDoneMsg(text.trim());
      setStep('done');
    } catch { setStep('manual'); }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!e.target) return;
    (e.target as HTMLInputElement).value = '';
    if (!file) return;
    setStep('importing');
    setImportErr('');
    try {
      const result = await uploadGarminExport(file);
      setImportRes(result);
      setStep('imported');
    } catch (err: unknown) {
      setImportErr(err instanceof Error ? err.message : 'Error al importar');
      setStep('sources');
    }
  }

  if (!open) return null;

  const monoStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono), monospace', fontSize: 12.5,
    letterSpacing: '.1em', textTransform: 'uppercase',
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(8,9,11,.78)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 600, maxWidth: '100%',
        background: '#101216',
        border: '1px solid rgba(205,180,137,.32)', borderRadius: 22,
        padding: '34px 36px',
        boxShadow: '0 50px 130px -30px rgba(0,0,0,.85)',
      }}>
        {/* Hidden file input for Garmin ZIP/CSV */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,.csv"
          style={{ display: 'none' }}
          onChange={handleFileSelected}
        />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 25, fontWeight: 500, color: '#E8EBEF' }}>Añadir datos</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9298A0', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {importErr && (
          <div style={{ marginBottom: 14, padding: '12px 16px', borderRadius: 10, background: 'rgba(212,154,126,.1)', border: '1px solid rgba(212,154,126,.3)', color: atencion, fontSize: 14 }}>
            {importErr}
          </div>
        )}

        {step === 'sources' && (
          <>
            <p style={{ fontSize: 16, lineHeight: 1.55, color: '#AEB4BC', marginBottom: 26 }}>
              Sube un archivo de Garmin o escribe el dato directamente — Benjamin lo registra por ti.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                {
                  icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
                  label: 'Archivo Garmin', sub: 'ZIP · CSV',
                  action: () => fileInputRef.current?.click(),
                  highlight: true,
                },
                {
                  icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/></svg>,
                  label: 'Foto de analítica', sub: 'Descríbela',
                  action: () => setStep('manual'),
                },
                {
                  icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="13" y2="17"/></svg>,
                  label: 'Escribir dato', sub: 'Manual',
                  action: () => setStep('manual'),
                },
              ].map(({ icon, label, sub, action, highlight }) => (
                <button key={label} onClick={action} style={{
                  border: `1px solid ${highlight ? 'rgba(205,180,137,.4)' : 'rgba(232,235,239,.14)'}`,
                  borderRadius: 14, padding: '22px 14px', cursor: 'pointer',
                  background: highlight ? 'rgba(205,180,137,.06)' : 'rgba(232,235,239,.03)',
                  transition: '.18s', display: 'flex', flexDirection: 'column', alignItems: 'center',
                  fontFamily: 'inherit', color: 'inherit',
                }}>
                  <span style={{
                    width: 44, height: 44, marginBottom: 13, borderRadius: 11,
                    border: `1px solid ${highlight ? 'rgba(205,180,137,.6)' : 'rgba(205,180,137,.3)'}`,
                    display: 'grid', placeItems: 'center', color: champ,
                  }}>{icon}</span>
                  <span style={{ fontSize: 15, color: '#E2E5EA' }}>{label}</span>
                  <span style={{ ...monoStyle, fontSize: 11, color: '#7C828A', marginTop: 6 }}>{sub}</span>
                </button>
              ))}
            </div>
            <p style={{ ...monoStyle, fontSize: 11, color: '#5C6268', marginTop: 18, textAlign: 'center', letterSpacing: '.06em' }}>
              Garmin Connect → Actividades → Exportar formato original · o exportación completa de datos
            </p>
          </>
        )}

        {step === 'manual' && (
          <>
            <p style={{ fontSize: 15, lineHeight: 1.55, color: '#AEB4BC', marginBottom: 20 }}>
              Describe el valor que quieres registrar. Por ejemplo: "Mi HbA1c fue 5.2% y la glucosa en ayunas 88 mg/dL".
            </p>
            <textarea
              autoFocus value={text} onChange={e => setText(e.target.value)}
              placeholder="Describe los valores de tu analítica o medición…"
              rows={4}
              style={{
                width: '100%', background: 'rgba(8,9,11,.6)',
                border: '1px solid rgba(232,235,239,.14)', borderRadius: 12,
                padding: '16px 20px', color: '#E8EBEF',
                fontFamily: 'var(--font-sans), sans-serif', fontSize: 16,
                outline: 'none', resize: 'vertical', marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep('sources')} style={{
                flex: 1, background: 'transparent', border: '1px solid rgba(232,235,239,.2)',
                color: '#C5CAD1', borderRadius: 12, padding: 14, cursor: 'pointer', ...monoStyle,
              }}>Volver</button>
              <button onClick={handleSend} disabled={!text.trim()} style={{
                flex: 1, background: champ, border: 'none', color: '#08090B',
                borderRadius: 12, padding: 14, cursor: text.trim() ? 'pointer' : 'not-allowed',
                opacity: text.trim() ? 1 : .5, ...monoStyle,
              }}>Enviar a Benjamin</button>
            </div>
          </>
        )}

        {step === 'sending' && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9298A0', fontSize: 16 }}>
            Benjamin está procesando…
          </div>
        )}

        {step === 'importing' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ ...monoStyle, color: champ, marginBottom: 12 }}>Importando datos de Garmin…</div>
            <div style={{ color: '#7C828A', fontSize: 14 }}>Esto puede tardar unos segundos</div>
          </div>
        )}

        {step === 'imported' && importRes && (
          <div style={{ border: '1px solid rgba(205,180,137,.30)', borderRadius: 16, padding: '22px 24px', background: 'linear-gradient(180deg, rgba(205,180,137,.06), transparent)' }}>
            <div style={{ ...monoStyle, color: champ, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid rgba(205,180,137,.6)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-serif), serif', fontSize: 13, color: champ }}>✓</span>
              Importación completada
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Métricas importadas', value: importRes.registradas },
                { label: 'Actividades', value: importRes.workouts },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'rgba(232,235,239,.04)', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(232,235,239,.08)' }}>
                  <div style={{ fontSize: 32, fontWeight: 500, color: '#E8EBEF', letterSpacing: '-.02em' }}>{value}</div>
                  <div style={{ ...monoStyle, fontSize: 11, color: '#9298A0', marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
            {importRes.parsed.length > 0 && (
              <div style={{ ...monoStyle, fontSize: 11, color: '#7C828A', marginBottom: 16 }}>
                {importRes.parsed.join(' · ')}
              </div>
            )}
            <div style={{ ...monoStyle, fontSize: 11, color: '#5C6268', marginBottom: 20 }}>
              Benjamin actualizará tu contexto automáticamente en los próximos minutos.
            </div>
            <button onClick={onClose} style={{
              width: '100%', background: champ, border: 'none', color: '#08090B',
              borderRadius: 12, padding: 14, cursor: 'pointer', ...monoStyle,
            }}>Listo</button>
          </div>
        )}

        {step === 'done' && (
          <div style={{ border: '1px solid rgba(205,180,137,.30)', borderRadius: 16, padding: '22px 24px', background: 'linear-gradient(180deg, rgba(205,180,137,.06), transparent)', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...monoStyle, color: champ, marginBottom: 16 }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid rgba(205,180,137,.6)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-serif), serif', fontSize: 13, color: champ }}>B</span>
              Benjamin ha recibido el dato
            </div>
            <p style={{ fontSize: 16, color: '#C5CAD1', lineHeight: 1.5, marginBottom: 20 }}>"{doneMsg}"</p>
            <button onClick={onClose} style={{
              width: '100%', background: champ, border: 'none', color: '#08090B',
              borderRadius: 12, padding: 14, cursor: 'pointer', ...monoStyle,
            }}>Listo</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const CHIPS = [
  { label: '¿Por qué subió mi HRV?', alt: false },
  { label: 'Mi plan para esta semana', alt: false },
  { label: 'Solicitar informe', alt: true, href: '/insights' },
  { label: 'Revisión de insights', alt: true, href: '/insights' },
];

export default function DashboardPage() {
  const router = useRouter();

  const [contexto, setContexto]   = useState<ContextoResponse | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [profile, setProfile]     = useState<Profile | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle');
  const [selKey, setSelKey]       = useState('cardiovascular');
  const [addOpen, setAddOpen]     = useState(false);
  const [detailKey, setDetailKey] = useState<string | null>(null);

  // Benjamin inline
  const [benQuestion, setBenQuestion] = useState('');
  const [benNote, setBenNote]         = useState('');
  const [benLoading, setBenLoading]   = useState(false);
  const sessionRef = useRef<string | null>(null);

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
    Promise.all([
      load(),
      fetchAppConfig().then(setAppConfig).catch(() => {}),
      getProfile().then(setProfile).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [load]);

  async function handleSync() {
    setSyncState('syncing');
    await load(true);
    setSyncState('ok');
    setTimeout(() => setSyncState('idle'), 3000);
  }

  async function sendToBenjamin(texto: string) {
    if (!texto.trim()) return;
    setBenLoading(true);
    setBenNote('');
    try {
      if (!sessionRef.current) {
        const { session_id } = await iniciarSesion();
        sessionRef.current = session_id;
      }
      const { respuesta } = await preguntarBenjamin(sessionRef.current!, texto);
      setBenNote(respuesta);
    } catch {
      setBenNote('No pude conectar con Benjamin ahora mismo. Intenta de nuevo.');
    } finally {
      setBenLoading(false);
    }
  }

  async function handleSendBen() {
    const q = benQuestion.trim();
    if (!q) return;
    setBenQuestion('');
    await sendToBenjamin(q);
  }

  async function handleAddData(text: string) {
    await sendToBenjamin(`El usuario quiere registrar el siguiente dato de salud: ${text}`);
  }

  // Derived data
  const ctx18a    = contexto?.contexto_18a ?? null;
  const marcadores = ctx18a?.marcadores ?? {};
  const sistemas   = ctx18a?.scores?.sistemas ?? {};
  const vitalAge   = ctx18a?.vitalAge ?? ctx18a?.scores?.vitalAge ?? null;
  const obj6b      = contexto?.objetivos_6b ?? {};

  const chronoAge  = profile?.fecha_nacimiento
    ? computeAge(profile.fecha_nacimiento)
    : null;
  const delta      = vitalAge != null && chronoAge != null
    ? (chronoAge - vitalAge).toFixed(1)
    : null;

  const scores = appConfig.sistemas
    .map(s => sistemas[s.key]?.score)
    .filter((s): s is number => s != null);
  const avgScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  const synced = contexto?.generado_en
    ? `Sincronizado ${timeAgo(contexto.generado_en)}`
    : undefined;
  const userName = profile?.nombre ?? undefined;

  // Dial
  const dialR = 128, dialStroke = 3;
  const dc = 2 * Math.PI * dialR;
  const dialIndex = avgScore ?? 0;

  // Selected system
  const selSist    = appConfig.sistemas.find(s => s.key === selKey) ?? appConfig.sistemas[0];
  const selDetalle = sistemas[selKey] ?? null;
  const selScore   = selDetalle?.score ?? null;
  const selColor   = statColor(selScore);

  const benjaminNote = benNote || (ctx18a?.resumen ?? '');

  return (
    <AppShell>
      <Topbar
        userName={userName}
        syncMeta={synced}
        ctaLabel="Sincronizar"
        ctaLoading={syncState === 'syncing'}
        onCta={handleSync}
      />

      {/* Hero */}
      <section style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '64px 0 56px',
        borderBottom: '1px solid rgba(232,235,239,.07)',
        backgroundImage: 'radial-gradient(1200px 600px at 50% -8%, rgba(205,180,137,.06), transparent 70%)',
      }}>
        {/* Dial */}
        <div style={{ position: 'relative', width: 288, height: 288 }}>
          <svg width="288" height="288" viewBox="0 0 288 288">
            <circle cx="144" cy="144" r={dialR} fill="none"
              stroke="rgba(232,235,239,.08)" strokeWidth={dialStroke} />
            {vitalAge != null && (
              <circle cx="144" cy="144" r={dialR} fill="none"
                stroke={champ} strokeWidth={dialStroke}
                strokeLinecap="round"
                strokeDasharray={`${dc}`}
                strokeDashoffset={dc * (1 - dialIndex / 100)}
                transform="rotate(-90 144 144)" />
            )}
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 13, letterSpacing: '.2em', textTransform: 'uppercase', color: '#9AA0A8' }}>
              Edad biológica
            </div>
            <div style={{ fontSize: 96, lineHeight: 1, fontWeight: 500, letterSpacing: '-.03em', margin: '8px 0 6px', color: '#E8EBEF' }}>
              {vitalAge != null ? vitalAge.toFixed(1) : '–'}
            </div>
            <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 13, letterSpacing: '.12em', textTransform: 'uppercase', color: '#9AA0A8' }}>
              años · Vitalage™
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 38, marginTop: 34 }}>
          {[
            { label: 'Cronológica', value: chronoAge ?? '–', color: undefined },
            { label: 'Ventaja vital', value: delta != null ? `−${delta}` : '–', color: delta != null && parseFloat(delta) > 0 ? champ : undefined },
            { label: 'Índice', value: avgScore ?? '–', color: undefined },
            { label: 'Sincronización', value: synced ? synced.replace('Sincronizado ', '') : '–', small: true },
          ].map(({ label, value, color, small }, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 38 }}>
              {i > 0 && <div style={{ width: 1, height: 38, background: 'rgba(232,235,239,.10)' }} />}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12.5, letterSpacing: '.12em', textTransform: 'uppercase', color: '#9AA0A8' }}>
                  {label}
                </div>
                <div style={{
                  fontSize: small ? 15 : 38, fontWeight: small ? 400 : 500,
                  marginTop: 8, letterSpacing: '-.02em',
                  color: color ?? (small ? '#C5CAD1' : '#E8EBEF'),
                }}>
                  {String(value)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Error */}
      {!loading && error && (
        <div style={{ margin: '24px 56px', padding: '16px 20px', background: 'rgba(212,154,126,.1)', border: '1px solid rgba(212,154,126,.3)', borderRadius: 12, color: atencion, fontSize: 15 }}>
          {error}
        </div>
      )}

      {/* Benjamin module */}
      <div style={{ margin: '40px 56px 4px', padding: '30px 34px', border: '1px solid rgba(205,180,137,.30)', borderRadius: 18, background: 'linear-gradient(180deg, rgba(205,180,137,.07), rgba(205,180,137,.015))' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              border: '1px solid rgba(205,180,137,.6)', flexShrink: 0,
              display: 'grid', placeItems: 'center',
              fontFamily: 'var(--font-serif), serif', fontSize: 27, color: champ,
              background: 'radial-gradient(circle at 50% 35%, rgba(205,180,137,.20), transparent 70%)',
            }}>B</div>
            <div>
              <div style={{ fontSize: 21, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10, color: '#E8EBEF' }}>
                Benjamin
                <span style={{
                  fontFamily: 'var(--font-mono), monospace', fontSize: 11,
                  letterSpacing: '.16em', color: '#08090B',
                  background: champ, borderRadius: 5, padding: '3px 8px',
                }}>IA</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12.5, letterSpacing: '.05em', color: '#9AA0A8', marginTop: 6 }}>
                Tu guía en el viaje del rejuvenecimiento
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontFamily: 'var(--font-mono), monospace', fontSize: 11.5, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9298A0', whiteSpace: 'nowrap' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: optimo, display: 'inline-block' }} />
            Sesión efímera · no se guarda
          </div>
        </div>

        {/* Note */}
        <div style={{ fontSize: 21, lineHeight: 1.5, color: benLoading ? '#7C828A' : '#DDE1E6', margin: '24px 0', letterSpacing: '-.01em', minHeight: 60 }}>
          {benLoading ? 'Benjamin está pensando…' : (benjaminNote || (loading ? '' : `${userName ? `Hola ${userName}` : 'Hola'}. Carga tu contexto para que pueda acompañarte hoy.`))}
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setAddOpen(true)}
            title="Añadir datos"
            style={{
              width: 54, flexShrink: 0, border: '1px solid rgba(205,180,137,.42)',
              background: 'rgba(205,180,137,.07)', color: champ,
              borderRadius: 12, fontSize: 26, lineHeight: 1,
              cursor: 'pointer', display: 'grid', placeItems: 'center', transition: '.18s',
            }}
          >+</button>
          <input
            value={benQuestion}
            onChange={e => setBenQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendBen(); } }}
            placeholder="Pregúntale a Benjamin…"
            style={{
              flex: 1, background: 'rgba(8,9,11,.6)',
              border: '1px solid rgba(232,235,239,.14)', borderRadius: 12,
              padding: '16px 20px', color: '#E8EBEF',
              fontFamily: 'var(--font-sans), sans-serif', fontSize: 16, outline: 'none',
            }}
          />
          <button
            onClick={handleSendBen}
            disabled={benLoading || !benQuestion.trim()}
            style={{
              fontFamily: 'var(--font-mono), monospace', fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase',
              color: '#08090B', background: champ, border: 'none', borderRadius: 12,
              padding: '0 30px', cursor: benLoading || !benQuestion.trim() ? 'not-allowed' : 'pointer',
              opacity: benLoading || !benQuestion.trim() ? .6 : 1, transition: '.18s',
            }}
          >
            Preguntar
          </button>
        </div>

        {/* Help line */}
        <div
          onClick={() => setAddOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            fontFamily: 'var(--font-mono), monospace', fontSize: 12.5, letterSpacing: '.02em',
            color: '#9298A0', marginTop: 14, cursor: 'pointer', width: 'fit-content', transition: 'color .18s',
          }}
        >
          <span style={{ color: champ, fontSize: 16 }}>+</span>
          Adjunta una analítica, una foto o un documento — Benjamin lo registra por ti.
        </div>

        {/* Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
          {CHIPS.map(({ label, alt, href }) => (
            <button
              key={label}
              onClick={() => {
                if (href) { router.push(href); return; }
                setBenQuestion(label);
              }}
              style={{
                fontFamily: 'var(--font-mono), monospace', fontSize: 12.5, letterSpacing: '.03em',
                color: alt ? champ : '#C5CAD1',
                background: 'rgba(232,235,239,.04)',
                border: `1px solid ${alt ? 'rgba(205,180,137,.38)' : 'rgba(232,235,239,.12)'}`,
                borderRadius: 999, padding: '10px 18px',
                cursor: 'pointer', transition: '.18s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Systems grid */}
      <section style={{ padding: '46px 56px 8px' }}>
        <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 13, letterSpacing: '.16em', textTransform: 'uppercase', color: '#9AA0A8', marginBottom: 26 }}>
          Sistemas · {appConfig.sistemas.length} dominios
        </div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${champ}`, borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {appConfig.sistemas.map(sist => {
              const det = sistemas[sist.key];
              const n   = det?.marcadores_disponibles ?? sist.marcadores.filter(k => marcadores[k] != null).length;
              return (
                <GaugeTile
                  key={sist.key}
                  sist={sist}
                  score={det?.score ?? null}
                  nData={n}
                  selected={selKey === sist.key}
                  onClick={() => setSelKey(sist.key)}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Selected system detail */}
      {!loading && (
        <section style={{ padding: '44px 56px 60px' }}>
          <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 13, letterSpacing: '.16em', textTransform: 'uppercase', color: '#9AA0A8', marginBottom: 18 }}>
            {selSist.label} · lecturas en vivo
          </div>

          {/* Benjamin insight bar */}
          {selDetalle?.narrativa && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              margin: '0 0 26px',
              padding: '16px 20px',
              borderLeft: `2px solid ${champ}`,
              background: 'linear-gradient(90deg, rgba(205,180,137,.07), transparent)',
              borderRadius: '0 10px 10px 0',
            }}>
              <div style={{
                width: 34, height: 34, flexShrink: 0, borderRadius: '50%',
                border: '1px solid rgba(205,180,137,.6)',
                display: 'grid', placeItems: 'center',
                fontFamily: 'var(--font-serif), serif', fontSize: 17, color: champ,
              }}>B</div>
              <p style={{ margin: 0, fontSize: 17, lineHeight: 1.45, color: '#D6DAE0' }}>
                {selDetalle.narrativa}
              </p>
            </div>
          )}

          {/* Readouts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {selSist.marcadores.map(key => {
              const m     = marcadores[key];
              const ob    = obj6b?.[key];
              const name  = ob?.nombre ?? appConfig.marcadores.nombres[key] ?? key;
              const unit  = ob?.unidad ?? appConfig.marcadores.unidades[key] ?? '';
              const src   = appConfig.marcadores.fuentes[key] ?? '';
              const valor = m?.valor ?? null;
              const tend  = m?.tendencia as Tendencia | undefined;
              const stat  = tend === 'mejorando' ? 'Óptimo' : tend === 'bajando' ? 'Atención' : tend === 'estable' ? 'Sólido' : 'Sin datos';
              return (
                <ReadoutCard key={key} name={name} value={valor} unit={unit} src={src} status={stat} tendencia={tend} onClick={() => setDetailKey(key)} />
              );
            })}
          </div>

          {/* Action */}
          {selDetalle?.accion && (
            <div style={{
              marginTop: 28, padding: '16px 20px', borderRadius: 12,
              background: 'rgba(205,180,137,.06)',
              border: '1px solid rgba(205,180,137,.2)',
              fontSize: 16, color: '#C5B580', lineHeight: 1.5,
            }}>
              {selDetalle.accion}
            </div>
          )}
        </section>
      )}

      <AddDataModal open={addOpen} onClose={() => setAddOpen(false)} onSend={handleAddData} />

      {detailKey && (() => {
        const m    = marcadores[detailKey];
        const ob   = obj6b?.[detailKey];
        const name = ob?.nombre ?? appConfig.marcadores.nombres[detailKey] ?? detailKey;
        const unit = ob?.unidad ?? appConfig.marcadores.unidades[detailKey] ?? '';
        const tend = m?.tendencia as Tendencia | undefined;
        return (
          <MarcadorDetailPanel
            tipoDato={detailKey}
            name={name}
            unit={unit}
            tendencia={tend}
            onClose={() => setDetailKey(null)}
          />
        );
      })()}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppShell>
  );
}
