// Shared display helpers for the admin + TV board.

// Re-export the canonical local-date helper so admin/display use the same
// "today" as the booking flow.
export { todayIso } from '../domain/data/time';

export const ARABIC_WEEKDAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

export const SPECIALTY_LABELS: Record<string, string> = {
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

export function specialtyLabel(key: string): string {
  return SPECIALTY_LABELS[key] ?? key;
}

export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return `${ARABIC_WEEKDAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

// Comma/Arabic-comma separated string <-> trimmed token array.
export function parseList(s: string): string[] {
  return s
    .split(/[,،]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function joinList(arr: string[] | undefined): string {
  return (arr ?? []).join('، ');
}
