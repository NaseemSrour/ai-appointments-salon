import type { SalonSettings, Service, Stylist } from '../types';

// Canonical seed/mock data. Two jobs:
//   1. Source for the one-time Firestore seed (see seed.ts).
//   2. Fallback catalog when Firebase is unconfigured, so the app still runs
//      fully on bundled data for local UI iteration (the Phase 1 dev mode).

export const SEED_SERVICES: Service[] = [
  {
    id: 'svc-haircut',
    name: 'قصة شعر',
    durationMinutes: 45,
    priceILS: 80,
    requiredSpecialties: ['haircut'],
    goodFor: ['any', 'trim', 'refresh'],
    description: 'قصة شعر عادية أو تجديد للستايل الحالي',
  },
  {
    id: 'svc-curly-cut',
    name: 'قصة كيرلي',
    durationMinutes: 75,
    priceILS: 150,
    requiredSpecialties: ['curly-cut'],
    goodFor: ['curly', 'coily', 'curl-specific'],
    description: 'قصة متخصصة للشعر المجعد، تحافظ على شكل الكيرل',
  },
  {
    id: 'svc-color',
    name: 'صبغة شعر',
    durationMinutes: 120,
    priceILS: 250,
    requiredSpecialties: ['color'],
    goodFor: ['color-change', 'gray-coverage', 'all-over-color'],
    description: 'صبغة كاملة للشعر، تغيير لون أو تجديد',
  },
  {
    id: 'svc-root-touchup',
    name: 'توتش أب جذور',
    durationMinutes: 90,
    priceILS: 180,
    requiredSpecialties: ['color'],
    goodFor: ['maintenance', 'gray-coverage', 'root-regrowth'],
    description: 'تجديد لون الجذور بس، للحفاظ على الصبغة',
  },
  {
    id: 'svc-highlights',
    name: 'هاي لايتس',
    durationMinutes: 150,
    priceILS: 350,
    requiredSpecialties: ['highlights', 'color'],
    goodFor: ['subtle-color', 'dimension', 'highlights'],
    description: 'خصلات ملونة للشعر، توتش بسيط أو واضح',
  },
  {
    id: 'svc-balayage',
    name: 'باليّاج',
    durationMinutes: 180,
    priceILS: 450,
    requiredSpecialties: ['balayage', 'highlights'],
    goodFor: ['natural-look', 'low-maintenance', 'sun-kissed', 'balayage'],
    description: 'تقنية باليّاج للحصول على إطلالة طبيعية وانتقال ناعم',
  },
  {
    id: 'svc-keratin',
    name: 'كيراتين',
    durationMinutes: 180,
    priceILS: 600,
    requiredSpecialties: ['keratin'],
    goodFor: ['frizz', 'smoothing', 'temporary-straightening'],
    description: 'علاج كيراتين لتنعيم الشعر وتقليل التطاير',
  },
  {
    id: 'svc-straightening',
    name: 'فرد شعر (החלקה)',
    durationMinutes: 240,
    priceILS: 800,
    requiredSpecialties: ['straightening'],
    goodFor: ['permanent-straightening', 'straighten', 'frizz'],
    description: 'فرد شعر دائم بمواد متخصصة',
  },
  {
    id: 'svc-treatment',
    name: 'علاج شعر',
    durationMinutes: 60,
    priceILS: 120,
    requiredSpecialties: ['treatment'],
    goodFor: ['damaged', 'dry', 'weak', 'repair'],
    description: 'ماسك علاجي ومرطب للشعر المتعب',
  },
  {
    id: 'svc-botox',
    name: 'بوتوكس شعر',
    durationMinutes: 150,
    priceILS: 500,
    requiredSpecialties: ['botox', 'treatment'],
    goodFor: ['damaged', 'smoothing', 'shine', 'repair'],
    description: 'علاج بوتوكس لإصلاح وتنعيم الشعر',
  },
  {
    id: 'svc-styling',
    name: 'تسريحة',
    durationMinutes: 60,
    priceILS: 100,
    requiredSpecialties: ['styling'],
    goodFor: ['event', 'occasion', 'blowout'],
    description: 'تسريحة شعر للمناسبات أو الخروج',
  },
  {
    id: 'svc-bridal',
    name: 'تسريحة عروس',
    durationMinutes: 120,
    priceILS: 400,
    requiredSpecialties: ['bridal', 'styling'],
    goodFor: ['wedding', 'bride', 'event'],
    description: 'تسريحة عروس كاملة مع تجربة قبل اليوم',
  },
];

export const SEED_STYLISTS: Stylist[] = [
  {
    id: 'st-nour',
    name: 'نور',
    specialties: ['color', 'highlights', 'balayage'],
    bio: 'مختصة بالصبغات والباليّاج',
  },
  {
    id: 'st-rima',
    name: 'ريما',
    specialties: ['curly-cut', 'haircut', 'treatment'],
    bio: 'مختصة بالشعر المجعد والعلاج',
  },
  {
    id: 'st-mira',
    name: 'ميرا',
    specialties: ['keratin', 'straightening', 'bridal', 'styling'],
    bio: 'مختصة بالفرد والكيراتين وتسريحات العرايس',
  },
  {
    id: 'st-sara',
    name: 'سارة',
    specialties: ['haircut', 'styling', 'treatment', 'botox'],
    bio: 'تسريحات عامة وعلاج وقصات',
  },
];

// Sun + Mon closed; Tue–Sat 09:00–18:00 in 30-min start slots.
export const DEFAULT_SETTINGS: SalonSettings = {
  workStartHour: 9,
  workEndHour: 18,
  slotMinutes: 30,
  closedDays: [0, 1],
};
