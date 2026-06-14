// Small time helpers shared by the availability engine and conflict checks.

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

// Today's date in the *local* timezone as YYYY-MM-DD. Do NOT use
// `new Date().toISOString().slice(0,10)` for this — that's the UTC date, which
// is off by a day for UTC+ timezones (e.g. Palestine) in the evening/early
// morning, making the model book the wrong day.
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function minutesToTime(total: number): string {
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

// Half-open intervals [startA, endA) and [startB, endB) overlap.
export function intervalsOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && startB < endA;
}

// Add `days` to an ISO date (YYYY-MM-DD) and return the new ISO date.
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekday(iso: string): number {
  return new Date(iso + 'T00:00:00').getDay();
}
