'use client';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://grateful-charm-production.up.railway.app';

const KEY_ACCESS  = 'bizi_access';
const KEY_REFRESH = 'bizi_refresh';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEY_ACCESS);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(KEY_ACCESS,  access);
  localStorage.setItem(KEY_REFRESH, refresh);
}

export function clearTokens() {
  localStorage.removeItem(KEY_ACCESS);
  localStorage.removeItem(KEY_REFRESH);
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem(KEY_REFRESH);
  if (!refresh) return null;
  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) { clearTokens(); return null; }
  const { access_token } = await res.json();
  localStorage.setItem(KEY_ACCESS, access_token);
  return access_token;
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers as Record<string, string> ?? {}),
    },
  });

  if (res.status === 401 && retry) {
    const body = await res.json().catch(() => ({})) as Record<string, string>;
    if (body.code === 'account_deleted') {
      clearTokens();
      throw Object.assign(new Error('account_deleted'), { code: 'account_deleted' });
    }
    const newToken = await refreshAccessToken();
    if (newToken) return request<T>(path, init, false);
    throw Object.assign(new Error('session_expired'), { code: 'session_expired' });
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as Record<string, string>).error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const login = (email: string, password: string) =>
  request<{ access_token: string; refresh_token: string }>('/api/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  });

export const logoutApi = (refresh_token: string) =>
  request('/api/auth/logout', {
    method: 'POST', body: JSON.stringify({ refresh_token }),
  });

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Marcador {
  valor:      number | null;
  valor_ayer?: number | null;
  baseline:   number | null;
  tendencia:  'mejorando' | 'bajando' | 'estable' | 'insuficientes_datos';
  nota:       string | null;
}

export interface SistemaDetalle {
  nombre:                  string;
  score:                   number | null;
  confianza:               'alta' | 'media' | 'baja' | 'sin_datos';
  convergencia:            'convergente' | 'mixto' | 'divergente' | 'insuficiente';
  marcadores_disponibles:  number;
  marcadores_totales:      number;
  marcadores_favor:        string[];
  marcadores_contra:       string[];
  patron:                  string | null;
  patron_nombre:           string | null;
  narrativa:               string | null;
  accion:                  string | null;
  intervencion:            string | null;
  requiere_derivacion:     boolean;
  derivacion:              string | null;
}

export interface Scores {
  sistemas: Record<string, SistemaDetalle>;
  vitalAge: number | null;
}

export interface Contexto18a {
  fecha:             string;
  resumen:           string;
  marcadores:        Record<string, Marcador>;
  alertas:           string[];
  datos_disponibles: string[];
  fuente_contexto:   string;
  scores:            Scores;
  vitalAge:          number | null;
}

export interface Objetivo6b {
  nombre:               string;
  unidad:               string;
  sistema:              string;
  objetivo:             number | null;
  mediana_poblacional:  number | null;
  valor_actual:         number | null;
  percentil_aprox:      string | null;
  alcanzado:            boolean | null;
  mayor_es_mejor:       boolean | null;
  descripcion_objetivo: string;
  fuente:               string;
}

export interface ContextoResponse {
  pseudo2:       string;
  fecha:         string;
  contexto_18a:  Contexto18a | null;
  insights:      { tipo: string; observacion: string; confianza: number }[];
  objetivos_6b?: Record<string, Objetivo6b>;
  generado_en:   string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const getContexto = (regenerar = false) =>
  request<ContextoResponse>(`/api/contexto${regenerar ? '?regenerar=true' : ''}`);

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface Profile {
  nombre?:           string;
  apellidos?:        string;
  fecha_nacimiento?: string;
  sexo?:             string;
  altura_cm?:        number;
}

export function computeAge(fechaNacimiento: string): number {
  const birth = new Date(fechaNacimiento);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export const getProfile = () => request<Profile>('/api/auth/perfil');

// ─── Benjamin ────────────────────────────────────────────────────────────────

export interface GarminImportResult {
  ok: boolean;
  registradas: number;
  workouts: number;
  parsed: string[];
  skipped: string[];
}

export async function uploadGarminExport(file: File): Promise<GarminImportResult> {
  const token = getAccessToken();
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/api/garmin/import`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  });
  if (res.status === 401) throw Object.assign(new Error('session_expired'), { code: 'session_expired' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as Record<string, string>).error || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface HistorialPunto {
  fecha: string;
  valor: number | null;
}

export interface MarcadorHistorial {
  tipo_dato: string;
  dias:      number;
  puntos:    HistorialPunto[];
}

export const getMarcadorHistorial = (tipoDato: string, dias = 30) =>
  request<MarcadorHistorial>(`/api/marcador/${encodeURIComponent(tipoDato)}/historial?dias=${dias}`);

export const iniciarSesion = () =>
  request<{ session_id: string }>('/api/sesion/iniciar', { method: 'POST' });

export const cerrarSesion = (session_id: string) =>
  request<{ ok: boolean }>('/api/sesion/cerrar', {
    method: 'POST', body: JSON.stringify({ session_id }),
  });

export const preguntarBenjamin = (session_id: string, mensaje: string) =>
  request<{ respuesta: string; _conciencia: object }>('/api/benjamin', {
    method: 'POST',
    body: JSON.stringify({ session_id, mensaje }),
  });
