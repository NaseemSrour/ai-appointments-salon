import { useEffect, useState } from 'react';
import { saveSettings, watchSettings } from '../domain/data/admin';
import type { SalonSettings } from '../domain/types';
import { ARABIC_WEEKDAYS } from './format';

const SLOT_OPTIONS = [15, 20, 30, 45, 60];

export function SettingsAdmin() {
  const [settings, setSettings] = useState<SalonSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(
    () =>
      watchSettings((s) => {
        setSettings(s);
      }),
    [],
  );

  if (!settings) {
    return <div className="text-center text-sm text-slate-500">جاري التحميل…</div>;
  }

  function update(patch: Partial<SalonSettings>) {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
    setSaved(false);
  }

  function toggleClosed(day: number) {
    if (!settings) return;
    const set = new Set(settings.closedDays);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    update({ closedDays: Array.from(set).sort((a, b) => a - b) });
  }

  async function save() {
    if (!settings) return;
    setBusy(true);
    try {
      await saveSettings(settings);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <h2 className="text-sm font-semibold text-slate-500">إعدادات الصالون</h2>

      <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex gap-3">
          <NumField
            label="بداية الدوام (ساعة)"
            value={settings.workStartHour}
            min={0}
            max={23}
            onChange={(v) => update({ workStartHour: v })}
          />
          <NumField
            label="نهاية الدوام (ساعة)"
            value={settings.workEndHour}
            min={1}
            max={24}
            onChange={(v) => update({ workEndHour: v })}
          />
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            مدة الموعد الافتراضية (دقيقة)
          </span>
          <select
            value={settings.slotMinutes}
            onChange={(e) => update({ slotMinutes: Number(e.target.value) })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {SLOT_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m} دقيقة
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="mb-2 block text-xs font-medium text-slate-600">
            أيام الإغلاق
          </span>
          <div className="flex flex-wrap gap-2">
            {ARABIC_WEEKDAYS.map((name, day) => {
              const closed = settings.closedDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleClosed(day)}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    closed
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-50 text-green-700'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            الأحمر = مغلق، الأخضر = مفتوح
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'جاري الحفظ…' : 'حفظ الإعدادات'}
        </button>
        {saved && <span className="text-sm text-green-600">تم الحفظ ✓</span>}
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex-1">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        dir="ltr"
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </label>
  );
}
