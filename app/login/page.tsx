'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, setTokens } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { access_token, refresh_token } = await login(email, password);
      setTokens(access_token, refresh_token);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 text-center">
          <p className="text-xs tracking-[0.25em] uppercase" style={{ color: '#6B7280' }}>
            BIZI
          </p>
          <h1 className="mt-2 text-2xl font-light tracking-tight" style={{ color: '#F5F3EE' }}>
            Benjamin
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-colors"
              style={{
                background: '#1C1C3A',
                border: '1px solid #2E2E58',
                color: '#F5F3EE',
              }}
              onFocus={e => (e.target.style.borderColor = '#4A7C6F')}
              onBlur={e  => (e.target.style.borderColor = '#2E2E58')}
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-colors"
              style={{
                background: '#1C1C3A',
                border: '1px solid #2E2E58',
                color: '#F5F3EE',
              }}
              onFocus={e => (e.target.style.borderColor = '#4A7C6F')}
              onBlur={e  => (e.target.style.borderColor = '#2E2E58')}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: '#C0524A' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-3 text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: '#4A7C6F', color: '#F5F3EE' }}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
