// Configuración remota — fuente de verdad: GET /api/app/config (lib/app-config.js backend).
// Este archivo solo define los tipos y el hook de acceso.
// Las constantes hardcodeadas son el fallback para cuando la red no está disponible.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://grateful-charm-production.up.railway.app';

export interface SistemaConfig {
  key:        string;
  label:      string;
  desc:       string;
  marcadores: string[];
}

export interface AppConfig {
  version:    string;
  sistemas:   SistemaConfig[];
  marcadores: {
    nombres:  Record<string, string>;
    unidades: Record<string, string>;
    fuentes:  Record<string, string>;
  };
  sync: {
    max_dias_inicial: number;
    batch_size:       number;
  };
  features: {
    tts:         boolean;
    voice_input: boolean;
    cgm:         boolean;
    tanita:      boolean;
    vivoo:       boolean;
    imagen:      boolean;
  };
}

// ─── Fallback hardcodeado ─────────────────────────────────────────────────────

export const DEFAULT_CONFIG: AppConfig = {
  version: '0',
  sistemas: [
    { key: 'cardiovascular',    label: 'Cardiovascular',          desc: 'Eficiencia cardíaca, capacidad aeróbica y regulación autonómica',                                                                           marcadores: ['hrv_ms', 'fc_reposo', 'spo2_pct', 'vo2max', 'recovery_score'] },
    { key: 'metabolico',        label: 'Metabólico',              desc: 'Control glucémico, sensibilidad insulina y composición corporal metabólica',                                                               marcadores: ['cgm_tir_pct', 'cgm_glucosa_media', 'cgm_glucosa_ayunas', 'cgm_cv_pct', 'tanita_grasa_visceral', 'tanita_bmr', 'tanita_edad_metabolica'] },
    { key: 'musculoesqueletal', label: 'Músculo-Esqueletal',      desc: 'Masa muscular funcional, composición corporal y actividad física',                                                                          marcadores: ['tanita_masa_muscular', 'tanita_grasa_corporal', 'tanita_agua_corporal', 'pasos_diarios', 'calorias_activas_kcal', 'distancia_km'] },
    { key: 'regeneracion',      label: 'Regeneración',            desc: 'Calidad y arquitectura del sueño, recuperación nocturna y coherencia circadiana',                                                          marcadores: ['sueño_horas', 'sueño_calidad_pct', 'sueño_profundo_pct', 'sueño_rem_pct', 'sueño_latencia_min'] },
    { key: 'renal',             label: 'Renal y Depuración',      desc: 'Capacidad depurativa, equilibrio ácido-base e hidratación celular',                                                                        marcadores: ['vivoo_ph', 'vivoo_hidratacion', 'vivoo_sodio', 'vivoo_proteina'] },
    { key: 'oxidativo',         label: 'Oxidativo e Inflamatorio', desc: 'Equilibrio redox, capacidad antioxidante y estado inflamatorio de base',                                                                   marcadores: ['vivoo_estres_oxidativo', 'vivoo_vitamina_c', 'vivoo_magnesio', 'vivoo_calcio', 'vivoo_cetonas'] },
    { key: 'neurologico',       label: 'Resiliencia Neurológica',  desc: 'Proxies de neuroprotección: función glinfática (sueño profundo), BDNF (VO2max) y resistencia insulínica cerebral (glucosa)',              marcadores: ['sueño_horas', 'hrv_ms', 'vo2max', 'cgm_glucosa_media'] },
  ],
  marcadores: {
    nombres: {
      hrv_ms: 'HRV (RMSSD)', fc_reposo: 'FC en reposo', spo2_pct: 'Saturación de oxígeno',
      recovery_score: 'Recovery score', vo2max: 'VO2max',
      'sueño_horas': 'Horas de sueño', 'sueño_calidad_pct': 'Calidad del sueño',
      'sueño_profundo_pct': 'Sueño profundo', 'sueño_rem_pct': 'Sueño REM', 'sueño_latencia_min': 'Latencia de sueño',
      cgm_tir_pct: 'Tiempo en rango (TIR)', cgm_glucosa_media: 'Glucosa media',
      cgm_glucosa_ayunas: 'Glucosa en ayunas', cgm_cv_pct: 'Variabilidad glucémica',
      tanita_grasa_visceral: 'Grasa visceral', tanita_bmr: 'Metabolismo basal (BMR)',
      tanita_edad_metabolica: 'Edad metabólica', tanita_grasa_corporal: 'Grasa corporal',
      tanita_masa_muscular: 'Masa muscular', tanita_agua_corporal: 'Agua corporal',
      pasos_diarios: 'Pasos diarios', calorias_activas_kcal: 'Calorías activas', distancia_km: 'Distancia',
      vivoo_ph: 'pH urinario', vivoo_hidratacion: 'Hidratación', vivoo_sodio: 'Sodio urinario',
      vivoo_proteina: 'Proteína urinaria', vivoo_estres_oxidativo: 'Estrés oxidativo',
      vivoo_vitamina_c: 'Vitamina C', vivoo_magnesio: 'Magnesio', vivoo_calcio: 'Calcio',
      vivoo_cetonas: 'Cetonas', peso_kg: 'Peso',
    },
    unidades: {
      hrv_ms: 'ms', fc_reposo: 'ppm', spo2_pct: '%', recovery_score: '', vo2max: 'mL/kg/min',
      'sueño_horas': 'h', 'sueño_calidad_pct': '%', 'sueño_profundo_pct': '%',
      'sueño_rem_pct': '%', 'sueño_latencia_min': 'min',
      cgm_tir_pct: '%', cgm_glucosa_media: 'mg/dL', cgm_glucosa_ayunas: 'mg/dL', cgm_cv_pct: '%',
      tanita_grasa_visceral: '', tanita_bmr: 'kcal', tanita_edad_metabolica: 'años',
      tanita_grasa_corporal: '%', tanita_masa_muscular: 'kg', tanita_agua_corporal: '%',
      pasos_diarios: '', calorias_activas_kcal: 'kcal', distancia_km: 'km',
      vivoo_ph: 'pH', vivoo_hidratacion: '/10', vivoo_sodio: '/10', vivoo_proteina: '/10',
      vivoo_estres_oxidativo: '/10', vivoo_vitamina_c: '/10', vivoo_magnesio: '/10',
      vivoo_calcio: '/10', vivoo_cetonas: '/10', peso_kg: 'kg',
    },
    fuentes: {
      hrv_ms: 'Apple Watch', fc_reposo: 'Apple Watch', spo2_pct: 'Apple Watch',
      recovery_score: 'Apple Watch', vo2max: 'Apple Watch',
      'sueño_horas': 'Apple Watch', 'sueño_calidad_pct': 'Apple Watch',
      'sueño_profundo_pct': 'Apple Watch', 'sueño_rem_pct': 'Apple Watch', 'sueño_latencia_min': 'Apple Watch',
      pasos_diarios: 'Apple Watch', calorias_activas_kcal: 'Apple Watch', distancia_km: 'Apple Watch',
      cgm_tir_pct: 'Dexcom CGM', cgm_glucosa_media: 'Dexcom CGM', cgm_glucosa_ayunas: 'Dexcom CGM', cgm_cv_pct: 'Dexcom CGM',
      tanita_grasa_visceral: 'Tanita', tanita_grasa_corporal: 'Tanita', tanita_masa_muscular: 'Tanita',
      tanita_agua_corporal: 'Tanita', tanita_bmr: 'Tanita', tanita_edad_metabolica: 'Tanita',
      vivoo_ph: 'Vivoo', vivoo_hidratacion: 'Vivoo', vivoo_sodio: 'Vivoo', vivoo_proteina: 'Vivoo',
      vivoo_estres_oxidativo: 'Vivoo', vivoo_vitamina_c: 'Vivoo', vivoo_magnesio: 'Vivoo',
      vivoo_calcio: 'Vivoo', vivoo_cetonas: 'Vivoo', peso_kg: 'Tanita · Apple Watch',
    },
  },
  sync: { max_dias_inicial: 180, batch_size: 500 },
  features: { tts: true, voice_input: false, cgm: true, tanita: true, vivoo: true, imagen: false },
};

// ─── Fetch (web — sin cache de AsyncStorage, usa React state) ────────────────

export async function fetchAppConfig(): Promise<AppConfig> {
  const res = await fetch(`${BASE_URL}/api/app/config`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Helpers de display (usados por componentes) ──────────────────────────────

export const ACUMULATIVAS = new Set(['pasos_diarios', 'calorias_activas_kcal', 'distancia_km']);

export function scoreColor(s: number | null): string {
  if (s == null) return '#2E2E58';
  if (s >= 75)   return '#4A7C6F';
  if (s >= 50)   return '#C9933A';
  return '#C0524A';
}

export function scoreLabel(s: number | null): string | null {
  if (s == null) return null;
  if (s >= 75)   return 'Óptimo';
  if (s >= 50)   return 'Bien';
  return 'Vigilar';
}

export function tendenciaIcon(t: string): string {
  if (t === 'mejorando') return '↑';
  if (t === 'bajando')   return '↓';
  if (t === 'estable')   return '→';
  return '';
}

export function tendenciaColor(t: string): string {
  if (t === 'mejorando') return '#4A7C6F';
  if (t === 'bajando')   return '#C0524A';
  return '#6B7280';
}

export function percentilLabel(p: string | null): string | null {
  if (!p) return null;
  const map: Record<string, string> = {
    '>P75': 'Óptimo', 'P50-P75': 'Bien', 'P25-P50': 'Mejorable',
    '<P25': 'Vigilar', 'en rango': 'En rango', '<rango': 'Bajo', '>rango': 'Alto',
  };
  return map[p] ?? null;
}

export function percentilColor(p: string | null): string {
  if (!p) return '#4B5563';
  if (p === '>P75' || p === 'en rango')    return '#4A7C6F';
  if (p === 'P50-P75' || p === 'P25-P50') return '#C9933A';
  return '#C0524A';
}

export function fmtValor(nombre: string, v: number): string {
  if (nombre === 'pasos_diarios')         return v.toLocaleString('es');
  if (nombre === 'distancia_km')          return v.toFixed(1);
  if (nombre === 'calorias_activas_kcal') return Math.round(v).toLocaleString('es');
  return String(Math.round(v * 10) / 10);
}
