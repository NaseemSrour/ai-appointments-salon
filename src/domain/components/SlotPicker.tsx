import type { Slot } from '../types';
import { getStylistById } from '../data/stylists';

interface Props {
  slots: Slot[];
}

const ARABIC_WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return `${ARABIC_WEEKDAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

export function SlotPicker({ slots }: Props) {
  if (slots.length === 0) {
    return (
      <div className="px-4 pb-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
          ما في مواعيد متاحة بالفترة المختارة
        </div>
      </div>
    );
  }

  // Group by date.
  const byDate = new Map<string, Slot[]>();
  for (const s of slots) {
    const list = byDate.get(s.date) ?? [];
    list.push(s);
    byDate.set(s.date, list);
  }

  return (
    <div className="space-y-3 px-4 pb-3">
      <h2 className="text-sm font-semibold text-slate-500">المواعيد المتاحة</h2>
      {Array.from(byDate.entries()).map(([date, daySlots]) => (
        <div key={date} className="rounded-2xl bg-white p-4 shadow-md">
          <div className="mb-2 text-sm font-bold text-slate-900">{formatDate(date)}</div>
          <div className="flex flex-wrap gap-2">
            {daySlots.map((s, i) => {
              const stylist = getStylistById(s.stylistId);
              return (
                <div
                  key={`${s.time}-${s.stylistId}-${i}`}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm"
                >
                  <span dir="ltr" className="font-medium text-blue-900">{s.time}</span>
                  {stylist && (
                    <span className="mr-2 text-xs text-slate-600">
                      · {stylist.name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
