import type { Appointment } from '../types';

interface Props {
  appointment: Appointment;
}

const ARABIC_WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return `${ARABIC_WEEKDAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function BookingConfirmation({ appointment: a }: Props) {
  return (
    <div className="px-4 pb-3">
      <div className="rounded-2xl border-2 border-green-300 bg-green-50 p-5 shadow-md">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-2xl">✅</span>
          <h2 className="text-lg font-bold text-green-900">تم تأكيد الحجز</h2>
        </div>
        <dl className="space-y-2 text-sm">
          <Row label="الخدمة" value={a.serviceName} />
          <Row label="المصففة" value={a.stylistName} />
          <Row label="التاريخ" value={formatDate(a.date)} />
          <Row label="الساعة" value={a.time} dir="ltr" />
          <Row label="المدة" value={`${a.durationMinutes} دقيقة`} />
          <Row label="السعر" value={`${a.priceILS} ₪`} dir="ltr" />
          <hr className="my-2 border-green-200" />
          <Row label="الاسم" value={a.customerName} />
          <Row label="التليفون" value={a.customerPhone} dir="ltr" />
          {a.notes && <Row label="ملاحظات" value={a.notes} />}
        </dl>
      </div>
    </div>
  );
}

function Row({ label, value, dir }: { label: string; value: string; dir?: 'ltr' | 'rtl' }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-slate-600">{label}:</dt>
      <dd dir={dir} className="font-semibold text-slate-900">
        {value}
      </dd>
    </div>
  );
}
