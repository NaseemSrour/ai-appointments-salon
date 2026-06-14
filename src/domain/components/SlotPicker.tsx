import type { Slot } from '../types';
import { getStylistById } from '../data/stylists';

interface Props {
  slots: Slot[];
  selectedSlot?: Slot | null;
  onSelect?: (slot: Slot) => void;
}

const ARABIC_WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return `${ARABIC_WEEKDAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

function sameSlot(a: Slot | null | undefined, b: Slot): boolean {
  return !!a && a.date === b.date && a.time === b.time && a.stylistId === b.stylistId;
}

export function SlotPicker({ slots, selectedSlot, onSelect }: Props) {
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
      <h2 className="text-sm font-semibold text-slate-500">
        المواعيد المتاحة {onSelect && <span className="font-normal">— إكبسي لتختاري</span>}
      </h2>
      {Array.from(byDate.entries()).map(([date, daySlots]) => (
        <div key={date} className="rounded-2xl bg-white p-4 shadow-md">
          <div className="mb-2 text-sm font-bold text-slate-900">{formatDate(date)}</div>
          <div className="flex flex-wrap gap-2">
            {daySlots.map((s, i) => {
              const stylist = getStylistById(s.stylistId);
              const selected = sameSlot(selectedSlot, s);
              return (
                <button
                  key={`${s.time}-${s.stylistId}-${i}`}
                  type="button"
                  onClick={() => onSelect?.(s)}
                  disabled={!onSelect}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                    onSelect ? 'cursor-pointer hover:border-blue-400 active:scale-95' : ''
                  } ${
                    selected
                      ? 'border-blue-500 bg-blue-600 text-white'
                      : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <span dir="ltr" className={`font-medium ${selected ? 'text-white' : 'text-blue-900'}`}>
                    {s.time}
                  </span>
                  {stylist && (
                    <span className={`mr-2 text-xs ${selected ? 'text-blue-100' : 'text-slate-600'}`}>
                      · {stylist.name}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
