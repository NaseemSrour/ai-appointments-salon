import type { Service } from '../types';

interface Props {
  services: Service[];
}

export function ServiceCards({ services }: Props) {
  if (services.length === 0) return null;
  return (
    <div className="space-y-2 px-4 pb-3">
      <h2 className="text-sm font-semibold text-slate-500">الخدمات المقترحة</h2>
      {services.map((s) => (
        <div key={s.id} className="rounded-2xl bg-white p-4 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">{s.name}</h3>
            <span dir="ltr" className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-900">
              {s.priceILS} ₪ · {s.durationMinutes} د
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{s.description}</p>
        </div>
      ))}
    </div>
  );
}
