'use client';

import { useState } from 'react';
import { scoreColor, scoreLabel } from '@/lib/data';
import type { SistemaConfig } from '@/lib/data';
import type { SistemaDetalle, Marcador, Objetivo6b } from '@/lib/api';
import MarcadorRow from './MarcadorRow';

interface Props {
  sist:       SistemaConfig;
  detalle:    SistemaDetalle | null;
  marcadores: Record<string, Marcador>;
  obj6b:      Record<string, Objetivo6b>;
  nombres:    Record<string, string>;
  unidades:   Record<string, string>;
  fuentes:    Record<string, string>;
}

function convergenciaIcon(c: SistemaDetalle['convergencia'] | undefined) {
  if (c === 'convergente') return '◎';
  if (c === 'divergente')  return '◑';
  return null;
}

function convergenciaColor(c: SistemaDetalle['convergencia'] | undefined) {
  if (c === 'convergente') return '#4A7C6F';
  if (c === 'divergente')  return '#C0524A';
  return '#C9933A';
}

export default function SistemaCard({ sist, detalle, marcadores, obj6b, nombres, unidades, fuentes }: Props) {
  const [open, setOpen] = useState(false);

  const score    = detalle?.score ?? null;
  const color    = scoreColor(score);
  const slabel   = scoreLabel(score);
  const hasScore = score != null;

  const conDatos       = sist.marcadores.filter(k => marcadores[k] != null).length;
  const totalMarcadores = sist.marcadores.length;

  const conv  = detalle?.convergencia;
  const cIcon = convergenciaIcon(conv);
  const cCol  = convergenciaColor(conv);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: '#1C1C3A', borderLeft: `3px solid ${color}` }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-4 px-4 py-4 text-left transition-opacity hover:opacity-80"
      >
        {/* Score circle */}
        <div
          className="flex items-center justify-center w-11 h-11 rounded-full border-2 shrink-0"
          style={{ borderColor: hasScore ? color : '#2E2E58' }}
        >
          <span
            className="text-base font-semibold tabular-nums"
            style={{ color: hasScore ? color : '#4B5563' }}
          >
            {hasScore ? score : '–'}
          </span>
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: '#F5F3EE' }}>{sist.label}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {slabel && (
              <span className="text-xs font-medium" style={{ color }}>{slabel}</span>
            )}
            {cIcon && hasScore && (
              <span className="text-xs" style={{ color: cCol }}>{cIcon}</span>
            )}
          </div>
        </div>

        {/* Right meta */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs" style={{ color: '#4B5563' }}>
            {conDatos}/{totalMarcadores}
          </span>
          <span
            className="text-base transition-transform"
            style={{
              color: '#6B7280',
              transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            ›
          </span>
        </div>
      </button>

      {/* Expanded */}
      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: '#2E2E58' }}>
          {/* Narrativa */}
          {detalle?.narrativa && (
            <p className="text-sm pt-3 pb-2 leading-relaxed" style={{ color: '#6B7280' }}>
              {detalle.narrativa}
            </p>
          )}
          {/* Desc fallback */}
          {!detalle?.narrativa && (
            <p className="text-xs pt-3 pb-2" style={{ color: '#4B5563' }}>{sist.desc}</p>
          )}

          {/* Marcadores */}
          <div>
            {sist.marcadores.map(key => (
              <MarcadorRow
                key={key}
                nombre={key}
                marcador={marcadores[key] ?? null}
                obj6b={obj6b[key] ?? null}
                nombres={nombres}
                unidades={unidades}
                fuentes={fuentes}
              />
            ))}
          </div>

          {/* Acción */}
          {detalle?.accion && (
            <div
              className="mt-3 p-3 rounded-lg text-sm"
              style={{ background: '#102822', color: '#6A9E90' }}
            >
              {detalle.accion}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
