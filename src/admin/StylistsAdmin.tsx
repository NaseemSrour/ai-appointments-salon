import { useEffect, useState } from 'react';
import {
  createStylist,
  deleteStylist,
  updateStylist,
  watchStylists,
} from '../domain/data/admin';
import type { Stylist } from '../domain/types';
import { Field, FormActions } from './ServicesAdmin';
import { joinList, parseList, specialtyLabel } from './format';

type Draft = Omit<Stylist, 'id'>;

const EMPTY: Draft = { name: '', specialties: [], bio: '' };

export function StylistsAdmin() {
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [editing, setEditing] = useState<Stylist | 'new' | null>(null);

  useEffect(() => watchStylists(setStylists), []);

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-500">
          المصففات ({stylists.length})
        </h2>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
        >
          + إضافة مصففة
        </button>
      </div>

      {editing && (
        <StylistForm
          initial={editing === 'new' ? EMPTY : editing}
          onClose={() => setEditing(null)}
          onSave={async (draft) => {
            if (editing === 'new') await createStylist(draft);
            else await updateStylist(editing.id, draft);
            setEditing(null);
          }}
        />
      )}

      {stylists.map((s) => (
        <div key={s.id} className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-pink-700">
              {s.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900">{s.name}</h3>
              <p className="text-xs text-slate-500">{s.bio}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {s.specialties.map((sp) => (
              <span
                key={sp}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
              >
                {specialtyLabel(sp)}
              </span>
            ))}
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
                if (confirm(`حذف "${s.name}"؟`)) void deleteStylist(s.id);
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

function StylistForm({
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
      <Field label="الاسم">
        <input
          value={d.name}
          onChange={(e) => setD({ ...d, name: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </Field>
      <Field label="التخصصات (افصلي بفاصلة)">
        <input
          value={joinList(d.specialties)}
          onChange={(e) => setD({ ...d, specialties: parseList(e.target.value) })}
          dir="ltr"
          placeholder="color, highlights, balayage"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </Field>
      <Field label="نبذة">
        <input
          value={d.bio}
          onChange={(e) => setD({ ...d, bio: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </Field>
      <FormActions busy={busy} onSave={save} onClose={onClose} />
    </div>
  );
}
