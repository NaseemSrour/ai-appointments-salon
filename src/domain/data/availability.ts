// Phase 2 availability engine: real, duration-aware.
//
// Open slots = the salon working-hours window (from settings) minus the time
// each stylist is already booked. A candidate start is open for a stylist only
// if the whole service [start, start+duration) fits inside working hours and
// collides with none of that stylist's existing appointments.

import type { Slot } from '../types';
import { fetchAppointments } from './appointments';
import { getSettings, getStylists } from './catalog';
import { intervalsOverlap, minutesToTime, timeToMinutes, weekday } from './time';

export interface FindSlotsOpts {
  stylistIds?: string[]; // restrict to these stylists; default = all
  serviceDurationMinutes: number; // service length, drives fit + conflict
  fromDate: string; // ISO YYYY-MM-DD
  days?: number; // days forward to scan; default = 7
  maxSlots?: number; // hard cap on returned slots; default = 12
}

type BusyMap = Map<string, Array<[number, number]>>; // `${stylistId}|${date}` -> intervals

function busyKey(stylistId: string, date: string): string {
  return `${stylistId}|${date}`;
}

export async function findOpenSlots(opts: FindSlotsOpts): Promise<Slot[]> {
  const settings = getSettings();
  const duration = opts.serviceDurationMinutes;
  const days = opts.days ?? 7;
  const maxSlots = opts.maxSlots ?? 12;
  const closed = new Set(settings.closedDays);

  const start = new Date(opts.fromDate + 'T00:00:00');
  if (Number.isNaN(start.getTime()) || duration <= 0) return [];

  const stylistIds =
    opts.stylistIds && opts.stylistIds.length > 0
      ? opts.stylistIds
      : getStylists().map((s) => s.id);

  // Pull existing bookings for the window once, index by stylist+date.
  const appts = await fetchAppointments({
    stylistIds,
    fromDate: opts.fromDate,
    days,
  });
  const busy: BusyMap = new Map();
  for (const a of appts) {
    const aStart = timeToMinutes(a.time);
    const list = busy.get(busyKey(a.stylistId, a.date)) ?? [];
    list.push([aStart, aStart + a.durationMinutes]);
    busy.set(busyKey(a.stylistId, a.date), list);
  }

  const dayStart = settings.workStartHour * 60;
  const dayEnd = settings.workEndHour * 60;

  const out: Slot[] = [];
  for (let d = 0; d < days && out.length < maxSlots; d++) {
    const day = new Date(start);
    day.setDate(start.getDate() + d);
    const iso = day.toISOString().slice(0, 10);
    if (closed.has(weekday(iso))) continue;

    for (
      let t = dayStart;
      t + duration <= dayEnd && out.length < maxSlots;
      t += settings.slotMinutes
    ) {
      for (const sid of stylistIds) {
        const intervals = busy.get(busyKey(sid, iso));
        const free =
          !intervals ||
          !intervals.some(([bs, be]) => intervalsOverlap(t, t + duration, bs, be));
        if (free) {
          out.push({ date: iso, time: minutesToTime(t), stylistId: sid });
          if (out.length >= maxSlots) break;
        }
      }
    }
  }
  return out;
}

/**
 * Re-validate a specific slot at booking time: inside working hours, not on a
 * closed day, and free for the stylist for the full service duration.
 */
export async function isSlotOpen(
  slot: Slot,
  serviceDurationMinutes: number,
  excludeAppointmentId?: string,
): Promise<boolean> {
  const settings = getSettings();
  if (new Set(settings.closedDays).has(weekday(slot.date))) return false;

  const start = timeToMinutes(slot.time);
  const end = start + serviceDurationMinutes;
  if (start < settings.workStartHour * 60) return false;
  if (end > settings.workEndHour * 60) return false;

  const dayAppts = await fetchAppointments({
    stylistIds: [slot.stylistId],
    fromDate: slot.date,
    days: 1,
  });
  return !dayAppts.some((a) => {
    if (excludeAppointmentId && a.id === excludeAppointmentId) return false;
    const aStart = timeToMinutes(a.time);
    return intervalsOverlap(start, end, aStart, aStart + a.durationMinutes);
  });
}
