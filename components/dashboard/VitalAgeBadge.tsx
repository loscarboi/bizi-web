interface Props {
  vitalAge: number | null;
  resumen?: string;
}

export default function VitalAgeBadge({ vitalAge, resumen }: Props) {
  return (
    <div className="flex items-center gap-6 p-6 rounded-xl" style={{ background: '#1C1C3A' }}>
      <div
        className="flex flex-col items-center justify-center w-20 h-20 rounded-full border-2 shrink-0"
        style={{
          borderColor: vitalAge != null ? '#4A7C6F' : '#2E2E58',
          background: vitalAge != null ? '#102822' : '#0D0D1A',
        }}
      >
        {vitalAge != null ? (
          <>
            <span className="text-2xl font-light leading-none" style={{ color: '#4A7C6F' }}>
              {vitalAge}
            </span>
            <span className="text-[10px] mt-0.5" style={{ color: '#6A9E90' }}>años</span>
          </>
        ) : (
          <span className="text-xl" style={{ color: '#4B5563' }}>–</span>
        )}
      </div>

      <div>
        <p className="text-[10px] tracking-[0.2em] uppercase font-semibold mb-1" style={{ color: '#6B7280' }}>
          VitalAge™
        </p>
        <p className="text-sm leading-relaxed" style={{ color: vitalAge != null ? '#F5F3EE' : '#6B7280' }}>
          {vitalAge != null
            ? resumen ?? 'Edad biológica estimada · actualizada hoy'
            : 'Sincroniza datos para calcular tu edad biológica'}
        </p>
      </div>
    </div>
  );
}
