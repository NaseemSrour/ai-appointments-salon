import { useState } from 'react';
import { navigate } from '../lib/router';
import { ADMIN_AVAILABLE } from '../domain/data/admin';
import { AppointmentsAdmin } from './AppointmentsAdmin';
import { ServicesAdmin } from './ServicesAdmin';
import { SettingsAdmin } from './SettingsAdmin';
import { StylistsAdmin } from './StylistsAdmin';

type Tab = 'appointments' | 'services' | 'stylists' | 'settings';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'appointments', label: 'المواعيد', icon: '📅' },
  { id: 'services', label: 'الخدمات', icon: '✂️' },
  { id: 'stylists', label: 'المصففات', icon: '💇‍♀️' },
  { id: 'settings', label: 'الإعدادات', icon: '⚙️' },
];

interface Props {
  userEmail: string | null;
  onSignOut: () => void;
}

export function AdminApp({ userEmail, onSignOut }: Props) {
  const [tab, setTab] = useState<Tab>('appointments');

  return (
    <div className="flex h-full flex-col bg-slate-100" dir="rtl">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-slate-900">لوحة الإدارة</h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate('/display')}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              📺 شاشة العرض
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              🎙️ الحجز
            </button>
            {userEmail && (
              <button
                type="button"
                onClick={onSignOut}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                aria-label="تسجيل خروج"
                title={userEmail}
              >
                🚪
              </button>
            )}
          </div>
        </div>
        <nav className="flex gap-1 px-2 pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="ml-1">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {!ADMIN_AVAILABLE && (
          <div className="mx-auto mb-4 max-w-2xl rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            الإدارة بتحتاج إعداد Firebase. ضيفي قيم VITE_FIREBASE_* في .env.local.
          </div>
        )}
        {tab === 'appointments' && <AppointmentsAdmin />}
        {tab === 'services' && <ServicesAdmin />}
        {tab === 'stylists' && <StylistsAdmin />}
        {tab === 'settings' && <SettingsAdmin />}
      </main>
    </div>
  );
}
