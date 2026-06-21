import {
  ACUMULATIVAS,
  tendenciaIcon, tendenciaColor, percentilLabel, percentilColor, fmtValor,
} from '@/lib/data';
import type { Marcador, Objetivo6b } from '@/lib/api';

interface Props {
  nombre:   string;
  marcador: Marcador | null;
  obj6b:    Objetivo6b | null;
  nombres:  Record<string, string>;
  unidades: Record<string, string>;
  fuentes:  Record<string, string>;
}

export default function MarcadorRow({ nombre, marcador, obj6b, nombres, unidades, fuentes }: Props) {
  const label  = obj6b?.nombre            ?? nombres[nombre]  ?? nombre;
  const unidad = obj6b?.unidad            ?? unidades[nombre] ?? '';
  const tend   = marcador?.tendencia      ?? 'insuficientes_datos';
  const perc   = obj6b?.percentil_aprox   ?? null;
  const obj    = obj6b?.objetivo          ?? null;
  const med    = obj6b?.mediana_poblacional ?? null;
  const fuente = fuentes[nombre]          ?? null;

  const esAcumulativa = ACUMULATIVAS.has(nombre);
  const valorAyer     = (marcador as Record<string, number | null> | null)?.valor_ayer ?? null;
  const valorMedia    = marcador?.valor ?? null;
  const valorDisplay  = esAcumulativa && valorAyer != null ? valorAyer : valorMedia;
  const hasData       = valorDisplay != null;

  const valorStr = hasData
    ? fmtValor(nombre, valorDisplay!) + (unidad ? ` ${unidad}` : '')
    : '–';

  const pLabel  = percentilLabel(perc);
  const pColor  = percentilColor(perc);
  const tIcon   = tendenciaIcon(tend);
  const tColor  = tendenciaColor(tend);

  return (
    <div
      className="flex items-center justify-between py-2.5 px-1 border-b last:border-0"
      style={{
        borderColor: '#1C1C3A',
        opacity: hasData ? 1 : 0.45,
      }}
    >
      {/* Left */}
      <div className="flex flex-col gap-0.5 min-w-0 mr-4">
        <span className="text-sm truncate" style={{ color: hasData ? '#F5F3EE' : '#6B7280' }}>
          {label}
        </span>

        {hasData && obj != null && (
          <span className="text-xs" style={{ color: '#6B7280' }}>
            objetivo {fmtValor(nombre, obj)}{unidad ? ` ${unidad}` : ''}
            {med != null ? ` · mediana ${fmtValor(nombre, med)}` : ''}
          </span>
        )}
        {hasData && esAcumulativa && valorMedia != null && valorAyer != null && (
          <span className="text-xs" style={{ color: '#6B7280' }}>
            media 7d: {fmtValor(nombre, valorMedia)}{unidad ? ` ${unidad}` : ''}
          </span>
        )}
        {!hasData && fuente && (
          <span className="text-xs" style={{ color: '#4B5563' }}>{fuente}</span>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-medium tabular-nums" style={{ color: hasData ? '#F5F3EE' : '#4B5563' }}>
          {valorStr}
        </span>
        {hasData && tIcon && (
          <span className="text-sm font-medium" style={{ color: tColor }}>{tIcon}</span>
        )}
        {hasData && pLabel && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{ background: pColor + '22', color: pColor }}
          >
            {pLabel}
          </span>
        )}
      </div>
    </div>
  );
}
