// Orchestrates the domain UI shown below the chat transcript.
// Shows the latest tool result most prominently; the intake summary stays
// visible across turns so the customer sees the running profile.

import { BookingConfirmation } from './components/BookingConfirmation';
import { IntakePanel } from './components/IntakePanel';
import { ServiceCards } from './components/ServiceCards';
import { SlotPicker } from './components/SlotPicker';
import { StylistCards } from './components/StylistCards';
import type { Appointment, Intake, Service, Slot, Stylist } from './types';

interface Props {
  intake: Intake;
  recommendedServices: Service[] | null;
  recommendedStylists: Stylist[] | null;
  availability: Slot[] | null;
  bookedAppointment: Appointment | null;
  bookingError: string | null;
}

export function ResultPanel({
  intake,
  recommendedServices,
  recommendedStylists,
  availability,
  bookedAppointment,
  bookingError,
}: Props) {
  return (
    <>
      <IntakePanel intake={intake} />
      {/* A booking failure stays visible until the next successful attempt, so
          a silent failure can't masquerade as a confirmed booking. */}
      {bookingError && !bookedAppointment && (
        <div className="px-4 pb-3">
          <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <h2 className="text-lg font-bold text-red-900">ما تم الحجز</h2>
            </div>
            <p className="mt-2 text-sm text-red-800">{bookingError}</p>
          </div>
        </div>
      )}
      {bookedAppointment ? (
        <BookingConfirmation appointment={bookedAppointment} />
      ) : availability ? (
        <SlotPicker slots={availability} />
      ) : recommendedStylists ? (
        <StylistCards stylists={recommendedStylists} />
      ) : recommendedServices ? (
        <ServiceCards services={recommendedServices} />
      ) : null}
    </>
  );
}
