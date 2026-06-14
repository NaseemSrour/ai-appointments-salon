// Generic app shell. Auth gate + realtime session + transcript + mic button.
// Knows NOTHING about the domain — everything domain-specific comes from
// `useDomainAdapter()` in src/domain/. To make a new project: edit only
// src/domain/* and (optionally) the env vars.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { MicButton } from './components/MicButton';
import { SignInPage } from './components/SignInPage';
import { Transcript, type Turn } from './components/Transcript';
import { AdminApp } from './admin/AdminApp';
import { DisplayBoard } from './display/DisplayBoard';
import { useDomainAdapter } from './domain/adapter';
import { seedFirestore, type SeedResult } from './domain/data/seed';
import { signOut, watchAuthState } from './lib/auth';
import { isFirebaseConfigured } from './lib/firebase';
import { RealtimeClient, type RealtimeStatus } from './lib/realtime';
import { useRoute } from './lib/router';

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY ?? '';
const MODEL = import.meta.env.VITE_REALTIME_MODEL ?? 'gpt-realtime-mini';
const VOICE = import.meta.env.VITE_REALTIME_VOICE ?? 'marin';

type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; email: string };

// Dev-only one-time Firestore seed: open the app with `?seed=1`.
const SEED_MODE =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).has('seed');

export default function App() {
  const domain = useDomainAdapter();
  const route = useRoute();

  // Auth gate. When Firebase isn't configured, skip auth and run in
  // mock-data mode — useful for local UI iteration.
  const [auth, setAuth] = useState<AuthState>(
    isFirebaseConfigured ? { status: 'loading' } : { status: 'signed-in', email: 'mock' },
  );

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return watchAuthState((user) => {
      if (user) {
        setAuth({ status: 'signed-in', email: user.email ?? user.uid });
      } else {
        setAuth({ status: 'signed-out' });
      }
    });
  }, []);

  if (SEED_MODE) return <SeedScreen />;

  if (auth.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <div className="text-slate-500">جاري التحميل...</div>
      </div>
    );
  }
  if (auth.status === 'signed-out') {
    return (
      <SignInPage
        title={domain.signInTitle}
        subtitle={domain.signInSubtitle}
        iconEmoji={domain.signInIconEmoji}
      />
    );
  }

  // Signed in — route to one of the three top-level views (all behind auth).
  const userEmail = auth.email === 'mock' ? null : auth.email;
  if (route === '/admin') {
    return <AdminApp userEmail={userEmail} onSignOut={() => void signOut()} />;
  }
  if (route === '/display') {
    return <DisplayBoard />;
  }
  return <MainApp userEmail={auth.email} />;
}

function MainApp({ userEmail }: { userEmail: string }) {
  const domain = useDomainAdapter();
  const [status, setStatus] = useState<RealtimeStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [connected, setConnected] = useState(false);

  const clientRef = useRef<RealtimeClient | null>(null);

  const onTranscript = useCallback((role: 'user' | 'assistant', text: string) => {
    setTurns((prev) => [...prev, { role, text }]);
  }, []);

  const connect = useCallback(async () => {
    if (!API_KEY) {
      setError('VITE_OPENAI_API_KEY غير مضبوط. ضيفه في .env.local وأعد التشغيل.');
      setStatus('error');
      return;
    }
    if (!domain.ready) {
      setError(
        domain.catalogError
          ? 'صار في مشكلة بتحميل بيانات الصالون. حدّثي الصفحة.'
          : 'لسا عم نحمّل بيانات الصالون، انتظري لحظة.',
      );
      return;
    }
    if (clientRef.current) return;

    const client = new RealtimeClient({
      apiKey: API_KEY,
      model: MODEL,
      voice: VOICE,
      instructions: domain.systemPrompt,
      tools: domain.tools,
      onStatus: setStatus,
      onTranscript: onTranscript,
      onToolCall: domain.handleToolCall,
      onError: (e) => setError(e),
    });

    clientRef.current = client;
    try {
      await client.connect();
      setConnected(true);
      setError(null);
    } catch {
      clientRef.current = null;
      setConnected(false);
    }
  }, [domain, onTranscript]);

  const disconnect = useCallback(async () => {
    await clientRef.current?.disconnect();
    clientRef.current = null;
    setConnected(false);
    setStatus('idle');
  }, []);

  const handleMicTap = useCallback(() => {
    if (!connected) {
      void connect();
    } else {
      void disconnect();
    }
  }, [connect, connected, disconnect]);

  const clearConversation = useCallback(() => {
    setTurns([]);
  }, []);

  const handleSignOut = useCallback(async () => {
    await clientRef.current?.disconnect();
    clientRef.current = null;
    setConnected(false);
    await signOut();
  }, []);

  useEffect(() => {
    return () => {
      void clientRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="flex h-full flex-col bg-slate-50" dir="rtl">
      <Header
        title={domain.appTitle}
        hasHistory={turns.length > 0}
        userEmail={userEmail === 'mock' ? null : userEmail}
        onClear={clearConversation}
        onSignOut={handleSignOut}
      />
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            {error}
          </div>
        )}
        <Transcript
          turns={turns}
          emptyHint={domain.emptyHint}
          emptyExample={domain.emptyExample}
        />
        {domain.renderResultPanel()}
        <Footer connected={connected} status={status} />
      </div>
      <MicButton status={status} connected={connected} onClick={handleMicTap} />
    </div>
  );
}

// Dev utility screen. Pushes bundled services/stylists/settings into Firestore
// once, then the app reads them live. Reached via `?seed=1` in dev builds.
function SeedScreen() {
  const [state, setState] = useState<
    | { status: 'idle' }
    | { status: 'running' }
    | { status: 'done'; result: SeedResult }
    | { status: 'error'; message: string }
  >({ status: 'idle' });

  const run = useCallback(async () => {
    setState({ status: 'running' });
    try {
      const result = await seedFirestore();
      setState({ status: 'done', result });
    } catch (e) {
      setState({ status: 'error', message: String((e as Error)?.message ?? e) });
    }
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
      <h1 className="text-lg font-bold text-slate-900">Firestore Seed</h1>
      {!isFirebaseConfigured && (
        <p className="max-w-sm text-sm text-amber-700">
          Firebase isn’t configured — set VITE_FIREBASE_* in .env.local first.
        </p>
      )}
      <button
        onClick={run}
        disabled={state.status === 'running' || !isFirebaseConfigured}
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {state.status === 'running' ? 'Seeding…' : 'Seed Firestore now'}
      </button>
      {state.status === 'done' && (
        <p className="text-sm text-green-700">
          Done — {state.result.services} services, {state.result.stylists}{' '}
          stylists, settings {state.result.settings ? '✓' : '✗'}. Remove{' '}
          <code>?seed=1</code> and reload.
        </p>
      )}
      {state.status === 'error' && (
        <p className="max-w-sm text-sm text-red-700">{state.message}</p>
      )}
    </div>
  );
}

function Footer({
  connected,
  status,
}: {
  connected: boolean;
  status: RealtimeStatus;
}) {
  return (
    <div className="px-6 py-4 text-center text-xs text-slate-500">
      <div>
        Model: {MODEL} · Voice: {VOICE}
      </div>
      <div>{connected ? `connected (${status})` : 'disconnected'}</div>
    </div>
  );
}
