// Appointments data access. In Firestore the source of truth is the
// `appointments` collection; when Firebase is unconfigured an in-memory array
// stands in so the booking flow still works for local dev (resets on reload).

import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { isFirebaseConfigured } from '../../lib/firebase';
import { getDb } from '../../lib/firestore';
import { isSlotOpen } from './availability';
import type { Appointment, AppointmentStatus } from '../types';
import { addDaysIso, intervalsOverlap, timeToMinutes } from './time';

// In-memory fallback store (mock mode only).
const memAppointments: Appointment[] = [];

export interface FetchOpts {
  stylistIds?: string[]; // restrict to these stylists; default = all
  fromDate: string; // ISO YYYY-MM-DD, inclusive
  days: number; // window length in days
}

/**
 * Active (status === 'booked') appointments overlapping the date window.
 * Filtering by stylist and status is done client-side so the Firestore query
 * stays a single-field range (no composite index required).
 */
export async function fetchAppointments(opts: FetchOpts): Promise<Appointment[]> {
  const endDate = addDaysIso(opts.fromDate, opts.days); // exclusive
  const wanted = opts.stylistIds ? new Set(opts.stylistIds) : null;

  let rows: Appointment[];
  if (isFirebaseConfigured) {
    const snap = await getDocs(
      query(
        collection(getDb(), 'appointments'),
        where('date', '>=', opts.fromDate),
        where('date', '<', endDate),
      ),
    );
    rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Appointment);
  } else {
    rows = memAppointments.filter(
      (a) => a.date >= opts.fromDate && a.date < endDate,
    );
  }

  return rows.filter(
    (a) =>
      a.status === 'booked' && (!wanted || wanted.has(a.stylistId)),
  );
}

/**
 * True if [time, time+durationMinutes) on `date` collides with an existing
 * booked appointment for `stylistId`.
 */
export async function hasConflict(args: {
  stylistId: string;
  date: string;
  time: string;
  durationMinutes: number;
}): Promise<boolean> {
  const dayAppts = await fetchAppointments({
    stylistIds: [args.stylistId],
    fromDate: args.date,
    days: 1,
  });
  const start = timeToMinutes(args.time);
  const end = start + args.durationMinutes;
  return dayAppts.some((a) => {
    const aStart = timeToMinutes(a.time);
    return intervalsOverlap(start, end, aStart, aStart + a.durationMinutes);
  });
}

/** Persist a new appointment and return it with its assigned id. */
export async function createAppointment(
  data: Omit<Appointment, 'id'>,
): Promise<Appointment> {
  if (isFirebaseConfigured) {
    const ref = await addDoc(collection(getDb(), 'appointments'), data);
    return { id: ref.id, ...data };
  }
  const appointment: Appointment = { id: `apt-${Date.now()}`, ...data };
  memAppointments.push(appointment);
  return appointment;
}

// --- Admin / display reads & writes ----------------------------------------

function byDateTime(a: Appointment, b: Appointment): number {
  return a.date === b.date
    ? a.time.localeCompare(b.time)
    : a.date.localeCompare(b.date);
}

/**
 * Live subscription to every appointment (any status) in a date window,
 * sorted by date+time. Returns an unsubscribe function. In mock mode it emits
 * the current in-memory list once.
 */
export function watchAppointments(
  opts: FetchOpts,
  cb: (appts: Appointment[]) => void,
): () => void {
  const endDate = addDaysIso(opts.fromDate, opts.days);
  const wanted = opts.stylistIds ? new Set(opts.stylistIds) : null;
  const shape = (rows: Appointment[]) =>
    rows
      .filter((a) => !wanted || wanted.has(a.stylistId))
      .sort(byDateTime);

  if (!isFirebaseConfigured) {
    cb(shape(memAppointments.filter((a) => a.date >= opts.fromDate && a.date < endDate)));
    return () => {};
  }

  return onSnapshot(
    query(
      collection(getDb(), 'appointments'),
      where('date', '>=', opts.fromDate),
      where('date', '<', endDate),
    ),
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Appointment);
      cb(shape(rows));
    },
  );
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
): Promise<void> {
  if (!isFirebaseConfigured) {
    const a = memAppointments.find((x) => x.id === id);
    if (a) a.status = status;
    return;
  }
  await updateDoc(doc(getDb(), 'appointments', id), { status });
}

/**
 * Move an appointment to a new date/time after checking the new slot is free
 * for its stylist (excluding the appointment itself). Returns false if the new
 * slot conflicts.
 */
export async function rescheduleAppointment(
  appt: Appointment,
  newDate: string,
  newTime: string,
): Promise<boolean> {
  const open = await isSlotOpen(
    { date: newDate, time: newTime, stylistId: appt.stylistId },
    appt.durationMinutes,
    appt.id,
  );
  if (!open) return false;

  if (!isFirebaseConfigured) {
    const a = memAppointments.find((x) => x.id === appt.id);
    if (a) {
      a.date = newDate;
      a.time = newTime;
    }
    return true;
  }
  await updateDoc(doc(getDb(), 'appointments', appt.id), {
    date: newDate,
    time: newTime,
  });
  return true;
}
