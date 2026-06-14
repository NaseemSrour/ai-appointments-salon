// Domain types for the salon appointments app.

export type HairType = 'straight' | 'wavy' | 'curly' | 'coily';
export type HairLength = 'pixie' | 'short' | 'medium' | 'long' | 'extra-long';
export type HairDensity = 'thin' | 'medium' | 'thick';
export type ScalpCondition = 'normal' | 'dry' | 'oily' | 'sensitive';
export type CurrentColor = 'natural' | 'colored' | 'highlighted' | 'bleached';
export type BudgetRange = 'low' | 'mid' | 'premium';

// What the AI gathers from the customer during the consultation.
// All fields are optional — they're populated incrementally.
export interface Intake {
  hairType?: HairType;
  hairLength?: HairLength;
  hairDensity?: HairDensity;
  scalpCondition?: ScalpCondition;
  currentColor?: CurrentColor;
  lastTreatmentDate?: string; // ISO YYYY-MM-DD
  recentTreatments?: string[]; // e.g., ['keratin', 'color', 'bleach', 'perm', 'relaxer']
  allergies?: string[];
  goal?: string;
  styleReference?: string;
  occasionDate?: string; // ISO YYYY-MM-DD (e.g., wedding date)
  preferredStylistId?: string;
  budgetRange?: BudgetRange;
  customerName?: string;
  customerPhone?: string;
}

// Service the salon offers.
export interface Service {
  id: string;
  name: string; // Arabic display name
  durationMinutes: number;
  priceILS: number;
  requiredSpecialties: string[]; // stylists must have at least one of these
  goodFor: string[]; // matching tags for recommendation scoring
  description: string;
}

// Stylist / employee.
export interface Stylist {
  id: string;
  name: string;
  specialties: string[];
  bio: string;
}

// One available time slot.
export interface Slot {
  date: string; // ISO YYYY-MM-DD
  time: string; // 24-hour HH:mm
  stylistId: string;
}

// A confirmed booking.
export interface Appointment {
  id: string;
  serviceId: string;
  serviceName: string;
  stylistId: string;
  stylistName: string;
  date: string;
  time: string;
  durationMinutes: number;
  priceILS: number;
  customerName: string;
  customerPhone: string;
  notes?: string;
  intakeSnapshot: Intake; // frozen copy of intake at booking time
  status: AppointmentStatus;
  createdAt: string;
}

export type AppointmentStatus = 'booked' | 'cancelled' | 'completed' | 'no-show';

// Salon-wide scheduling config. Stored at `settings/salon` in Firestore so the
// Phase 3 admin dashboard can edit it without a code change.
export interface SalonSettings {
  workStartHour: number; // 24h, inclusive (e.g. 9 = 09:00)
  workEndHour: number; // 24h, exclusive end of bookable window (e.g. 18 = last slot ends by 18:00)
  slotMinutes: number; // granularity of bookable start times
  closedDays: number[]; // weekday numbers closed; 0 = Sun … 6 = Sat
}

// One customer, keyed by phone number in Firestore. Lets Phase 3 recall a
// returning customer's last consultation.
export interface Customer {
  phone: string;
  name: string;
  lastIntake: Intake;
  bookingCount: number;
  firstSeenAt: string;
  lastBookingAt: string;
}

// Which intake fields are considered "core" — the AI is encouraged to
// gather these before calling recommend_services.
export const CORE_INTAKE_FIELDS: (keyof Intake)[] = [
  'hairType',
  'hairLength',
  'currentColor',
  'recentTreatments',
  'goal',
];

export function missingCoreFields(intake: Intake): (keyof Intake)[] {
  return CORE_INTAKE_FIELDS.filter((f) => {
    const v = intake[f];
    if (v === undefined || v === null) return true;
    if (Array.isArray(v) && v.length === 0) return true;
    return false;
  });
}
