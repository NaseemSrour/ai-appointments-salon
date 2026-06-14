import type { Service } from '../types';

interface Props {
  services: Service[];
  selectedServiceId?: string | null;
  onSelect?: (service: Service) => void;
}

export function ServiceCards({ services, selectedServiceId, onSelect }: Props) {
  if (services.length === 0) return null;
  return (
    <div className="space-y-2 px-4 pb-3">
      <h2 className="text-sm font-semibold text-slate-500">
        الخدمات المقترحة {onSelect && <span className="font-normal">— إكبسي لتختاري</span>}
      </h2>
      {services.map((s) => {
        const selected = s.id === selectedServiceId;
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
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {selected && <span className="ml-1 text-blue-600">✓</span>}
                {s.name}
              </h3>
              <span dir="ltr" className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-900">
                {s.priceILS} ₪ · {s.durationMinutes} د
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{s.description}</p>
          </button>
        );
      })}
    </div>
  );
}
