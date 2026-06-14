import { type ReactNode, useEffect, useState } from 'react';
import {
  createService,
  deleteService,
  updateService,
  watchServices,
} from '../domain/data/admin';
import type { Service } from '../domain/types';
import { joinList, parseList, specialtyLabel } from './format';

type Draft = Omit<Service, 'id'>;

const EMPTY: Draft = {
  name: '',
  durationMinutes: 60,
  priceILS: 100,
  requiredSpecialties: [],
  goodFor: [],
  description: '',
};

export function ServicesAdmin() {
  const [services, setServices] = useState<Service[]>([]);
  const [editing, setEditing] = useState<Service | 'new' | null>(null);

  useEffect(() => watchServices(setServices), []);

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-500">
          الخدمات ({services.length})
        </h2>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
        >
          + إضافة خدمة
        </button>
      </div>

      {editing && (
        <ServiceForm
          initial={editing === 'new' ? EMPTY : editing}
          onClose={() => setEditing(null)}
          onSave={async (draft) => {
            if (editing === 'new') await createService(draft);
            else await updateService(editing.id, draft);
            setEditing(null);
          }}
        />
      )}

      {services.map((s) => (
        <div key={s.id} className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-slate-900">{s.name}</h3>
              <p className="mt-0.5 text-sm text-slate-600">{s.description}</p>
              <p className="mt-1 text-xs text-slate-400">
                التخصصات: {s.requiredSpecialties.map(specialtyLabel).join('، ') || '—'}
              </p>
            </div>
            <span dir="ltr" className="whitespace-nowrap text-sm text-slate-500">
              {s.priceILS}₪ · {s.durationMinutes}د
            </span>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(s)}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200"
            >
              تعديل
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`حذف خدمة "${s.name}"؟`)) void deleteService(s.id);
              }}
              className="rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100"
            >
              حذف
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ServiceForm({
  initial,
  onSave,
  onClose,
}: {
  initial: Draft;
  onSave: (draft: Draft) => Promise<void>;
  onClose: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!d.name.trim()) return;
    setBusy(true);
    try {
      await onSave(d);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
      <Field label="اسم الخدمة">
        <input
          value={d.name}
          onChange={(e) => setD({ ...d, name: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </Field>
      <div className="flex gap-3">
        <Field label="المدة (دقيقة)">
          <input
            type="number"
            value={d.durationMinutes}
            onChange={(e) => setD({ ...d, durationMinutes: Number(e.target.value) })}
            dir="ltr"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="السعر (₪)">
          <input
            type="number"
            value={d.priceILS}
            onChange={(e) => setD({ ...d, priceILS: Number(e.target.value) })}
            dir="ltr"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
      </div>
      <Field label="التخصصات المطلوبة (افصلي بفاصلة)">
        <input
          value={joinList(d.requiredSpecialties)}
          onChange={(e) => setD({ ...d, requiredSpecialties: parseList(e.target.value) })}
          dir="ltr"
          placeholder="color, highlights"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </Field>
      <Field label="مناسبة لـ (tags، افصلي بفاصلة)">
        <input
          value={joinList(d.goodFor)}
          onChange={(e) => setD({ ...d, goodFor: parseList(e.target.value) })}
          dir="ltr"
          placeholder="curly, repair"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </Field>
      <Field label="الوصف">
        <textarea
          value={d.description}
          onChange={(e) => setD({ ...d, description: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </Field>
      <FormActions busy={busy} onSave={save} onClose={onClose} />
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

export function FormActions({
  busy,
  onSave,
  onClose,
}: {
  busy: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        type="button"
        disabled={busy}
        onClick={onSave}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        حفظ
      </button>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700"
      >
        إلغاء
      </button>
    </div>
  );
}
