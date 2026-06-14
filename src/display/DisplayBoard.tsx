import { useEffect, useMemo, useState } from 'react';
import { watchAppointments } from '../domain/data/appointments';
import { navigate } from '../lib/router';
import type { Appointment } from '../domain/types';
import { ARABIC_WEEKDAYS, todayIso } from '../admin/format';

// Always-on board for a salon wall TV. Read-only, dark, large type, live.
export function DisplayBoard() {
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [now, setNow] = useState(() => new Date());

  // Watch a two-week window so the board can roll forward to the next day
  // that has bookings (today may be a closed day, e.g. Sun/Mon).
  useEffect(
    () => watchAppointments({ fromDate: todayIso(), days: 14 }, setAppts),
    [],
  );

  // Tick the clock + re-evaluate "past" styling every 30s.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const today = todayIso();

  // Pick the day to show: today if it has bookings, otherwise the earliest
  // upcoming day that does. Keeps the TV from going blank on closed days.
  const { shownDate, visible } = useMemo(() => {
    const active = appts.filter(
      (a) => a.status === 'booked' || a.status === 'completed',
    );
    const dates = Array.from(new Set(active.map((a) => a.date))).sort();
    const target = dates.includes(today) ? today : dates[0];
    return {
      shownDate: target ?? today,
      visible: active.filter((a) => a.date === target),
    };
  }, [appts, today]);

  const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const isToday = shownDate === today;
  const shown = new Date(shownDate + 'T00:00:00');
  const dateLabel = `${ARABIC_WEEKDAYS[shown.getDay()]} ${shown.getDate()}/${shown.getMonth() + 1}`;
  const heading = isToday ? 'مواعيد اليوم' : 'أقرب المواعيد';

  return (
    <div
      dir="rtl"
      className="flex h-full flex-col bg-slate-900 text-white"
      onDoubleClick={() => navigate('/admin')}
      title="دبل كليك للإدارة"
    >
      <header className="flex items-center justify-between border-b border-white/10 px-10 py-6">
        <div>
          <h1 className="text-4xl font-bold">{heading}</h1>
          <p className="mt-1 text-xl text-white/60">{dateLabel}</p>
        </div>
        <div dir="ltr" className="text-6xl font-bold tabular-nums tracking-tight">
          {nowHM}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-10 py-6">
        {visible.length === 0 ? (
          <div className="flex h-full items-center justify-center text-3xl text-white/40">
            ما في مواعيد قادمة
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((a) => {
              const past = a.status === 'completed' || (isToday && a.time < nowHM);
              return (
                <li
                  key={a.id}
                  className={`flex items-center gap-6 rounded-2xl px-8 py-5 ${
                    past ? 'bg-white/5 text-white/40' : 'bg-white/10'
                  }`}
                >
                  <span
                    dir="ltr"
                    className="w-28 text-5xl font-bold tabular-nums"
                  >
                    {a.time}
                  </span>
                  <span className="flex-1 text-3xl font-semibold">
                    {a.customerName}
                  </span>
                  <span className="text-2xl text-white/80">{a.serviceName}</span>
                  <span className="flex items-center gap-2 text-2xl">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500/40 text-lg">
                      {a.stylistName.charAt(0)}
                    </span>
                    {a.stylistName}
                  </span>
                  {a.status === 'completed' && (
                    <span className="text-2xl text-green-400">✓</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
