import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  rescheduleAppointment,
  updateAppointmentStatus,
  watchAppointments,
} from '../domain/data/appointments';
import type { Appointment, AppointmentStatus, Intake } from '../domain/types';
import { formatDate, todayIso } from './format';

const STATUS_META: Record<AppointmentStatus, { label: string; cls: string }> = {
  booked: { label: 'محجوز', cls: 'bg-blue-100 text-blue-800' },
  completed: { label: 'تمّ', cls: 'bg-green-100 text-green-800' },
  cancelled: { label: 'ملغى', cls: 'bg-slate-200 text-slate-500' },
  'no-show': { label: 'ما إجت', cls: 'bg-amber-100 text-amber-800' },
};

const INTAKE_LABELS: { key: keyof Intake; label: string }[] = [
  { key: 'hairType', label: 'نوع الشعر' },
  { key: 'hairLength', label: 'الطول' },
  { key: 'hairDensity', label: 'الكثافة' },
  { key: 'scalpCondition', label: 'فروة الراس' },
  { key: 'currentColor', label: 'اللون الحالي' },
  { key: 'recentTreatments', label: 'معالجات سابقة' },
  { key: 'allergies', label: 'حساسية' },
  { key: 'goal', label: 'الهدف' },
  { key: 'occasionDate', label: 'مناسبة بتاريخ' },
];

export function AppointmentsAdmin() {
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [showCancelled, setShowCancelled] = useState(false);

  useEffect(() => {
    // Live window: today + next two weeks.
    return watchAppointments({ fromDate: todayIso(), days: 14 }, setAppts);
  }, []);

  const visible = useMemo(
    () => appts.filter((a) => showCancelled || a.status !== 'cancelled'),
    [appts, showCancelled],
  );

  const byDate = useMemo(() => {
    const m = new Map<string, Appointment[]>();
    for (const a of visible) {
      const list = m.get(a.date) ?? [];
      list.push(a);
      m.set(a.date, list);
    }
    return Array.from(m.entries());
  }, [visible]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-500">
          المواعيد ({visible.length})
        </h2>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showCancelled}
            onChange={(e) => setShowCancelled(e.target.checked)}
          />
          إظهار الملغى
        </label>
      </div>

      {byDate.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">
          ما في مواعيد
        </div>
      )}

      {byDate.map(([date, list]) => (
        <div key={date} className="space-y-2">
          <h3 className="text-sm font-bold text-slate-700">{formatDate(date)}</h3>
          {list.map((a) => (
            <AppointmentRow key={a.id} appt={a} />
          ))}
        </div>
      ))}
    </div>
  );
}

function AppointmentRow({ appt }: { appt: Appointment }) {
  const [showIntake, setShowIntake] = useState(false);
  const [reschedule, setReschedule] = useState(false);
  const [newDate, setNewDate] = useState(appt.date);
  const [newTime, setNewTime] = useState(appt.time);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const meta = STATUS_META[appt.status];
  const dim = appt.status === 'cancelled' ? 'opacity-60' : '';

  async function setStatus(status: AppointmentStatus) {
    setBusy(true);
    try {
      await updateAppointmentStatus(appt.id, status);
    } finally {
      setBusy(false);
    }
  }

  async function doReschedule() {
    setBusy(true);
    setError(null);
    try {
      const ok = await rescheduleAppointment(appt, newDate, newTime);
      if (!ok) setError('الوقت الجديد متعارض أو خارج أوقات الدوام');
      else setReschedule(false);
    } finally {
      setBusy(false);
    }
  }

  const intakeRows = INTAKE_LABELS.map(({ key, label }) => {
    const v = appt.intakeSnapshot?.[key];
    const text = Array.isArray(v) ? v.join('، ') : v;
    return text ? { label, text: String(text) } : null;
  }).filter(Boolean) as { label: string; text: string }[];

  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ${dim}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span dir="ltr" className="text-base font-bold text-slate-900">
              {appt.time}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
              {meta.label}
            </span>
          </div>
          <div className="mt-1 text-sm text-slate-800">
            {appt.serviceName} · {appt.stylistName}
          </div>
          <div className="mt-0.5 text-sm text-slate-600">
            {appt.customerName}{' '}
            <span dir="ltr" className="text-slate-400">
              {appt.customerPhone}
            </span>
          </div>
          {appt.notes && (
            <div className="mt-1 text-xs text-slate-500">📝 {appt.notes}</div>
          )}
        </div>
        <div dir="ltr" className="text-left text-xs text-slate-400">
          {appt.durationMinutes}د · {appt.priceILS}₪
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {appt.status !== 'completed' && (
          <ActionBtn disabled={busy} onClick={() => setStatus('completed')}>
            ✓ تمّ
          </ActionBtn>
        )}
        {appt.status !== 'no-show' && (
          <ActionBtn disabled={busy} onClick={() => setStatus('no-show')}>
            ما إجت
          </ActionBtn>
        )}
        {appt.status !== 'booked' && (
          <ActionBtn disabled={busy} onClick={() => setStatus('booked')}>
            رجّعي محجوز
          </ActionBtn>
        )}
        {appt.status !== 'cancelled' && (
          <ActionBtn disabled={busy} danger onClick={() => setStatus('cancelled')}>
            إلغاء
          </ActionBtn>
        )}
        <ActionBtn disabled={busy} onClick={() => setReschedule((v) => !v)}>
          تغيير الوقت
        </ActionBtn>
        {intakeRows.length > 0 && (
          <ActionBtn onClick={() => setShowIntake((v) => !v)}>
            {showIntake ? 'إخفاء التفاصيل' : 'تفاصيل الشعر'}
          </ActionBtn>
        )}
      </div>

      {reschedule && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3">
          <label className="text-xs text-slate-600">
            التاريخ
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              dir="ltr"
              className="mt-1 block rounded-lg border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs text-slate-600">
            الساعة
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              dir="ltr"
              step={1800}
              className="mt-1 block rounded-lg border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={doReschedule}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            حفظ
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      )}

      {showIntake && intakeRows.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-slate-50 p-3 text-xs">
          {intakeRows.map((r) => (
            <div key={r.label} className="flex justify-between gap-2">
              <dt className="text-slate-500">{r.label}</dt>
              <dd className="font-medium text-slate-800">{r.text}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
        danger
          ? 'bg-red-50 text-red-700 hover:bg-red-100'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  );
}
