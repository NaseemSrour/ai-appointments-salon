import type { Stylist } from '../types';

interface Props {
  stylists: Stylist[];
  selectedStylistId?: string | null;
  onSelect?: (stylist: Stylist) => void;
}

const SPECIALTY_LABELS: Record<string, string> = {
  haircut: 'قصة',
  'curly-cut': 'قصة كيرلي',
  color: 'صبغة',
  highlights: 'هاي لايتس',
  balayage: 'بالياج',
  keratin: 'كيراتين',
  straightening: 'فرد',
  bridal: 'عرايس',
  styling: 'تسريحات',
  treatment: 'علاج',
  botox: 'بوتوكس',
};

export function StylistCards({ stylists, selectedStylistId, onSelect }: Props) {
  if (stylists.length === 0) return null;
  return (
    <div className="space-y-2 px-4 pb-3">
      <h2 className="text-sm font-semibold text-slate-500">
        المصففات المتاحات {onSelect && <span className="font-normal">— إكبسي لتختاري</span>}
      </h2>
      {stylists.map((s) => {
        const selected = s.id === selectedStylistId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect?.(s)}
            disabled={!onSelect}
            className={`block w-full rounded-2xl bg-white p-4 text-right shadow-md transition ${
              onSelect ? 'cursor-pointer hover:shadow-lg active:scale-[0.99]' : ''
            } ${selected ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-pink-700">
                {s.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  {selected && <span className="ml-1 text-blue-600">✓</span>}
                  {s.name}
                </h3>
                <p className="text-xs text-slate-500">{s.bio}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {s.specialties.map((sp) => (
                <span
                  key={sp}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                >
                  {SPECIALTY_LABELS[sp] ?? sp}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
