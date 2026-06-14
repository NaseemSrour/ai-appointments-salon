import { useState, type FormEvent } from 'react';
import { authErrorMessage, signIn } from '../lib/auth';

interface Props {
  title: string;
  subtitle?: string;
  iconEmoji?: string;
}

export function SignInPage({ title, subtitle, iconEmoji = '🎙️' }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      // App.tsx watches auth state and swaps to the main UI on success.
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md">
        <div className="mb-6 text-center">
          <div className="mb-2 text-4xl">{iconEmoji}</div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              الإيميل
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              dir="ltr"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-left focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              كلمة السر
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              dir="ltr"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-left focus:border-blue-500 focus:outline-none"
            />
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || !email || !password}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white shadow transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? '...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
}
