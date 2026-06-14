import type { Intake } from '../types';

interface Props {
  intake: Intake;
}

const FIELD_LABELS: Record<keyof Intake, string> = {
  hairType: 'نوع الشعر',
  hairLength: 'الطول',
  hairDensity: 'الكثافة',
  scalpCondition: 'فروة الراس',
  currentColor: 'اللون الحالي',
  lastTreatmentDate: 'آخر زيارة صالون',
  recentTreatments: 'معالجات سابقة',
  allergies: 'حساسية',
  goal: 'الهدف',
  styleReference: 'الستايل المطلوب',
  occasionDate: 'تاريخ المناسبة',
  preferredStylistId: 'مصففة مفضلة',
  budgetRange: 'الميزانية',
  customerName: 'الاسم',
  customerPhone: 'التليفون',
};

const TYPE_LABELS: Record<string, string> = {
  straight: 'أملس',
  wavy: 'متموج',
  curly: 'مجعد',
  coily: 'جداً مجعد',
  pixie: 'بيكسي',
  short: 'قصير',
  medium: 'متوسط',
  long: 'طويل',
  'extra-long': 'طويل جداً',
  thin: 'خفيف',
  thick: 'كثيف',
  normal: 'عادي',
  dry: 'جاف',
  oily: 'دهني',
  sensitive: 'حساس',
  natural: 'طبيعي',
  colored: 'مصبوغ',
  highlighted: 'هاي لايتس',
  bleached: 'مبيّض',
  low: 'منخفضة',
  mid: 'متوسطة',
  premium: 'مرتفعة',
};

function pretty(value: unknown): string {
  if (Array.isArray(value)) return value.join('، ');
  if (typeof value === 'string') return TYPE_LABELS[value] ?? value;
  return String(value);
}

export function IntakePanel({ intake }: Props) {
  const fields = (Object.keys(FIELD_LABELS) as (keyof Intake)[]).filter(
    (f) => {
      const v = intake[f];
      if (v === undefined || v === null) return false;
      if (Array.isArray(v) && v.length === 0) return false;
      if (typeof v === 'string' && v.length === 0) return false;
      return true;
    },
  );
  if (fields.length === 0) return null;
  return (
    <div className="mx-4 mb-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-900">
        ملف الزبونة
      </h2>
      <dl className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f} className="flex items-baseline gap-2">
            <dt className="text-slate-600">{FIELD_LABELS[f]}:</dt>
            <dd className="font-medium text-slate-900">{pretty(intake[f])}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
