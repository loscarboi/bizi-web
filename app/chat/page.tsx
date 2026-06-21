'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken, iniciarSesion, cerrarSesion, preguntarBenjamin } from '@/lib/api';
import AppShell from '@/components/AppShell';

interface Msg {
  role: 'user' | 'benjamin';
  text: string;
  ts:   number;
}

export default function ChatPage() {
  const router              = useRouter();
  const [msgs, setMsgs]     = useState<Msg[]>([]);
  const [input, setInput]   = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError]   = useState('');
  const bottomRef           = useRef<HTMLDivElement>(null);
  const textareaRef         = useRef<HTMLTextAreaElement>(null);

  const initSession = useCallback(async () => {
    if (!getAccessToken()) { router.push('/login'); return; }
    try {
      const { session_id } = await iniciarSesion();
      setSessionId(session_id);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'session_expired') { router.push('/login'); return; }
      setError('No se pudo iniciar sesión con Benjamin');
    }
  }, [router]);

  useEffect(() => { initSession(); }, [initSession]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  async function send() {
    const text = input.trim();
    if (!text || sending || !sessionId) return;

    setInput('');
    setSending(true);
    setError('');

    const userMsg: Msg = { role: 'user', text, ts: Date.now() };
    setMsgs(prev => [...prev, userMsg]);

    try {
      const { respuesta } = await preguntarBenjamin(sessionId, text);
      setMsgs(prev => [...prev, { role: 'benjamin', text: respuesta, ts: Date.now() }]);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'session_expired') { router.push('/login'); return; }
      setError(e.message ?? 'Error al contactar con Benjamin');
    } finally {
      setSending(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  async function handleClose() {
    if (sessionId) {
      try { await cerrarSesion(sessionId); } catch { /* ignore */ }
    }
    router.push('/dashboard');
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full max-w-2xl mx-auto">
        {/* Chat header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: '#2E2E58' }}
        >
          <div>
            <h1 className="text-base font-medium" style={{ color: '#F5F3EE' }}>Benjamin</h1>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
              {sessionId ? 'Sesión activa' : 'Iniciando…'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ background: '#1C1C3A', color: '#6B7280', border: '1px solid #2E2E58' }}
          >
            Cerrar sesión
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {msgs.length === 0 && !sending && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-center max-w-xs" style={{ color: '#4B5563' }}>
                Escribe lo que quieras. Benjamin tiene acceso a tus datos de hoy.
              </p>
            </div>
          )}

          {msgs.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
                style={
                  m.role === 'user'
                    ? { background: '#4A7C6F', color: '#F5F3EE', borderBottomRightRadius: 4 }
                    : { background: '#1C1C3A', color: '#F5F3EE', borderBottomLeftRadius: 4 }
                }
              >
                {m.text.split('\n').map((line, j) => (
                  <span key={j}>
                    {line}
                    {j < m.text.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div
                className="px-4 py-3 rounded-2xl text-sm"
                style={{ background: '#1C1C3A', borderBottomLeftRadius: 4 }}
              >
                <span className="inline-flex gap-1">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{
                        background: '#4A7C6F',
                        animationDelay: `${i * 0.15}s`,
                      }}
                    />
                  ))}
                </span>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-center" style={{ color: '#C0524A' }}>{error}</p>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t shrink-0" style={{ borderColor: '#2E2E58' }}>
          <div
            className="flex items-end gap-3 rounded-xl px-4 py-3"
            style={{ background: '#1C1C3A', border: '1px solid #2E2E58' }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje…"
              disabled={!sessionId || sending}
              rows={1}
              className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed disabled:opacity-40"
              style={{
                color: '#F5F3EE',
                maxHeight: '120px',
              }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 120) + 'px';
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending || !sessionId}
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-opacity disabled:opacity-30"
              style={{ background: '#4A7C6F', color: '#F5F3EE' }}
            >
              ↑
            </button>
          </div>
          <p className="text-[10px] mt-2 text-center" style={{ color: '#4B5563' }}>
            Enter para enviar · Shift+Enter nueva línea
          </p>
        </div>
      </div>
    </AppShell>
  );
}
