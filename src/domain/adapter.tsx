import { type ReactNode, useCallback, useRef, useState } from 'react';
import { createAppointment } from './data/appointments';
import { findOpenSlots, isSlotOpen } from './data/availability';
import {
  getServiceById,
  getServices,
  getSettings,
  getStylistById,
  getStylists,
  getStylistsForService,
  useCatalog,
} from './data/catalog';
import { upsertCustomer } from './data/customers';
import { todayIso } from './data/time';
import { buildSystemPrompt } from './prompt';
import { ResultPanel } from './ResultPanel';
import { tools } from './tools';
import {
  type Appointment,
  CORE_INTAKE_FIELDS,
  type Intake,
  missingCoreFields,
  type Service,
  type Slot,
  type Stylist,
} from './types';

export interface DomainAdapter {
  systemPrompt: string;
  tools: unknown[];
  handleToolCall: (call: { name: string; args: unknown }) => Promise<unknown>;
  renderResultPanel: () => ReactNode;
  /**
   * App registers a function that injects a user utterance into the active
   * voice/text session. Tapping a choice card calls it so the conversation
   * continues as if the customer had said the choice.
   */
  registerUtteranceSink: (fn: (text: string) => void) => void;
  /** False until the catalog (services/stylists/settings) has loaded. */
  ready: boolean;
  /** Set when catalog loading failed. */
  catalogError: string | null;
  appTitle: string;
  signInTitle: string;
  signInSubtitle?: string;
  signInIconEmoji?: string;
  emptyHint?: string;
  emptyExample?: string;
}

export function useDomainAdapter(): DomainAdapter {
  // --- STATE -----------------------------------------------------------
  const [intake, setIntake] = useState<Intake>({});
  const [recommendedServices, setRecommendedServices] = useState<Service[] | null>(null);
  const [recommendedStylists, setRecommendedStylists] = useState<Stylist[] | null>(null);
  const [availability, setAvailability] = useState<Slot[] | null>(null);
  const [bookedAppointment, setBookedAppointment] = useState<Appointment | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Tap-to-pick selection. State drives the highlight; the ref is the source
  // of truth read by book_appointment (so a tapped slot's exact date/time/
  // stylist can never be mangled by the model).
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedStylistId, setSelectedStylistId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Refs let tool handlers read latest values without re-creating handlers
  // on every state change.
  const intakeRef = useRef<Intake>({});
  const selectionRef = useRef<{
    serviceId: string | null;
    stylistId: string | null;
    slot: Slot | null;
  }>({ serviceId: null, stylistId: null, slot: null });

  // App wires this to the active voice/text client (see registerUtteranceSink).
  const utteranceSinkRef = useRef<((text: string) => void) | null>(null);
  const registerUtteranceSink = useCallback((fn: (text: string) => void) => {
    utteranceSinkRef.current = fn;
  }, []);

  function clearSelection() {
    selectionRef.current = { serviceId: null, stylistId: null, slot: null };
    setSelectedServiceId(null);
    setSelectedStylistId(null);
    setSelectedSlot(null);
  }

  // --- TAP-TO-PICK HANDLERS --------------------------------------------
  const onSelectService = useCallback((svc: Service) => {
    selectionRef.current.serviceId = svc.id;
    setSelectedServiceId(svc.id);
    utteranceSinkRef.current?.(`اخترت خدمة: ${svc.name}`);
  }, []);

  const onSelectStylist = useCallback((st: Stylist) => {
    selectionRef.current.stylistId = st.id;
    setSelectedStylistId(st.id);
    utteranceSinkRef.current?.(`اخترت المصففة: ${st.name}`);
  }, []);

  const onSelectSlot = useCallback((slot: Slot) => {
    selectionRef.current.slot = slot;
    selectionRef.current.stylistId = slot.stylistId;
    setSelectedSlot(slot);
    setSelectedStylistId(slot.stylistId);
    const name = getStylistById(slot.stylistId)?.name ?? '';
    utteranceSinkRef.current?.(
      `اخترت موعد: ${slotLabelAr(slot.date)} الساعة ${slot.time}${name ? ` مع ${name}` : ''}`,
    );
  }, []);

  // --- TOOL HANDLERS ---------------------------------------------------
  const handleToolCall = useCallback(
    async (call: { name: string; args: unknown }) => {
      console.log('[domain] tool call:', call.name, call.args);
      switch (call.name) {
        case 'record_intake':
          return doRecordIntake(call.args);
        case 'get_intake':
          return doGetIntake();
        case 'recommend_services':
          return doRecommendServices();
        case 'recommend_stylists':
          return doRecommendStylists(call.args);
        case 'check_availability':
          return doCheckAvailability(call.args);
        case 'book_appointment':
          return doBookAppointment(call.args);
        default:
          return { error: `unknown tool: ${call.name}` };
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function doRecordIntake(rawArgs: unknown) {
    const incoming = (rawArgs ?? {}) as Partial<Intake>;
    const merged: Intake = { ...intakeRef.current, ...incoming };
    intakeRef.current = merged;
    setIntake(merged);
    return {
      ok: true,
      intake: merged,
      missing: missingCoreFields(merged),
    };
  }

  function doGetIntake() {
    return {
      intake: intakeRef.current,
      missing: missingCoreFields(intakeRef.current),
      coreFields: CORE_INTAKE_FIELDS,
    };
  }

  function doRecommendServices() {
    const ranked = rankServices(intakeRef.current).slice(0, 4);
    setRecommendedServices(ranked);
    return {
      services: ranked.map((s) => ({
        id: s.id,
        name: s.name,
        durationMinutes: s.durationMinutes,
        priceILS: s.priceILS,
        description: s.description,
        goodFor: s.goodFor,
      })),
    };
  }

  function doRecommendStylists(rawArgs: unknown) {
    const args = (rawArgs ?? {}) as { serviceId?: string };
    const svc = args.serviceId ? getServiceById(args.serviceId) : null;
    const qualified = svc
      ? getStylistsForService(svc.requiredSpecialties)
      : getStylists();
    setRecommendedStylists(qualified);
    return {
      stylists: qualified.map((s) => ({
        id: s.id,
        name: s.name,
        specialties: s.specialties,
        bio: s.bio,
      })),
    };
  }

  async function doCheckAvailability(rawArgs: unknown) {
    const args = (rawArgs ?? {}) as {
      stylistId?: string;
      serviceId?: string;
      fromDate?: string;
      days?: number;
    };
    // Never scan from a past date even if the model passes one.
    const today = todayIso();
    const fromDate = args.fromDate && args.fromDate >= today ? args.fromDate : today;

    // Service duration drives both fit (slot must end before close) and
    // conflict blocking. Without a known service, fall back to one slot length.
    const svc = args.serviceId ? getServiceById(args.serviceId) : undefined;
    const serviceDurationMinutes = svc?.durationMinutes ?? getSettings().slotMinutes;

    // Scope: an explicit stylist wins; otherwise restrict to stylists qualified
    // for the chosen service; otherwise all stylists.
    let stylistIds: string[] | undefined;
    if (args.stylistId) {
      stylistIds = [args.stylistId];
    } else if (svc) {
      stylistIds = getStylistsForService(svc.requiredSpecialties).map((s) => s.id);
    }

    const slots = await findOpenSlots({
      stylistIds,
      serviceDurationMinutes,
      fromDate,
      days: args.days ?? 7,
      maxSlots: 12,
    });

    setAvailability(slots);
    return {
      // weekday + dateLabel are provided so the model never has to derive the
      // day-of-week from the ISO date (which it gets wrong). Use them verbatim.
      slots: slots.map((s) => ({
        date: s.date,
        weekday: weekdayAr(s.date),
        dateLabel: slotLabelAr(s.date),
        time: s.time,
        stylistId: s.stylistId,
        stylistName: getStylistById(s.stylistId)?.name ?? '',
      })),
    };
  }

  async function doBookAppointment(rawArgs: unknown) {
    const args = (rawArgs ?? {}) as {
      serviceId?: string;
      stylistId?: string;
      date?: string;
      time?: string;
      customerName?: string;
      customerPhone?: string;
      notes?: string;
    };
    // Clear any previous failure as we start a fresh attempt.
    setBookingError(null);

    // A tapped slot is authoritative: its exact date/time/stylist override
    // whatever the model passes, so a misheard or miscomputed date can't slip
    // through. A tapped service likewise fills in the serviceId.
    const sel = selectionRef.current;
    const serviceId = args.serviceId ?? sel.serviceId ?? undefined;
    const stylistId = sel.slot?.stylistId ?? args.stylistId ?? sel.stylistId ?? undefined;
    const date = sel.slot?.date ?? args.date;
    const time = sel.slot?.time ?? args.time;

    if (!serviceId || !stylistId || !date || !time || !args.customerName || !args.customerPhone) {
      return { ok: false, error: 'missing required fields' };
    }
    const svc = getServiceById(serviceId);
    const stylist = getStylistById(stylistId);
    if (!svc || !stylist) {
      return { ok: false, error: 'invalid serviceId or stylistId' };
    }

    // Guard against booking a day that already passed (model sometimes invents
    // a date). Availability never offers past days, so reject here too.
    if (date < todayIso()) {
      const message = 'ما بنقدر نحجز بتاريخ قديم، اختاري يوم من المواعيد المتاحة';
      setBookingError(message);
      return { ok: false, error: 'past_date', message };
    }

    // Everything from the slot re-check onward is wrapped: a thrown Firestore
    // error (e.g. a rules/permissions issue on the availability read) must
    // surface as a clean failure, not an uncaught rejection that silently
    // aborts the booking.
    try {
      // Re-check the slot at commit time — it may have been taken since
      // check_availability ran.
      const slot: Slot = { date, time, stylistId: stylist.id };
      const open = await isSlotOpen(slot, svc.durationMinutes);
      if (!open) {
        const message = 'هاد الموعد ما عاد متاح، اقترحي وقت ثاني';
        setBookingError(message);
        return { ok: false, error: 'slot_unavailable', message };
      }

      const data: Omit<Appointment, 'id'> = {
        serviceId: svc.id,
        serviceName: svc.name,
        stylistId: stylist.id,
        stylistName: stylist.name,
        date,
        time,
        durationMinutes: svc.durationMinutes,
        priceILS: svc.priceILS,
        customerName: args.customerName,
        customerPhone: args.customerPhone,
        // Omit `notes` entirely when absent — Firestore rejects undefined values.
        ...(args.notes ? { notes: args.notes } : {}),
        intakeSnapshot: { ...intakeRef.current },
        status: 'booked',
        createdAt: new Date().toISOString(),
      };

      const appointment = await createAppointment(data);
      // Best-effort customer record; don't fail the booking if it errors.
      void upsertCustomer({
        phone: args.customerPhone,
        name: args.customerName,
        intake: intakeRef.current,
      }).catch((e) => console.warn('[domain] upsertCustomer failed', e));

      clearSelection();
      setBookedAppointment(appointment);
      return { ok: true, appointment };
    } catch (e) {
      console.error('[domain] book_appointment failed', e);
      const message = 'صار في مشكلة بحفظ الحجز، جربي كمان مرة';
      setBookingError(e instanceof Error ? `${message} (${e.message})` : message);
      return {
        ok: false,
        error: 'save_failed',
        message,
        detail: e instanceof Error ? e.message : String(e),
      };
    }
  }

  // --- CATALOG / PROMPT ------------------------------------------------
  // The prompt embeds the service + stylist catalog, so it can only be built
  // once the catalog has loaded. The app gates the session on `ready`.
  const { ready, error: catalogError } = useCatalog();
  const today = todayIso();
  const systemPrompt = ready ? buildSystemPrompt({ today }) : '';

  // --- RENDER ----------------------------------------------------------
  const renderResultPanel = useCallback(
    () => (
      <ResultPanel
        intake={intake}
        recommendedServices={recommendedServices}
        recommendedStylists={recommendedStylists}
        availability={availability}
        bookedAppointment={bookedAppointment}
        bookingError={bookingError}
        selectedServiceId={selectedServiceId}
        selectedStylistId={selectedStylistId}
        selectedSlot={selectedSlot}
        onSelectService={onSelectService}
        onSelectStylist={onSelectStylist}
        onSelectSlot={onSelectSlot}
      />
    ),
    [
      intake,
      recommendedServices,
      recommendedStylists,
      availability,
      bookedAppointment,
      bookingError,
      selectedServiceId,
      selectedStylistId,
      selectedSlot,
      onSelectService,
      onSelectStylist,
      onSelectSlot,
    ],
  );

  return {
    systemPrompt,
    tools,
    handleToolCall,
    renderResultPanel,
    registerUtteranceSink,
    ready,
    catalogError,
    appTitle: 'مساعد الحجوزات',
    signInTitle: 'صالون الشعر',
    signInSubtitle: 'سجّلي دخول لحجز موعد',
    signInIconEmoji: '💇‍♀️',
    emptyHint: 'إكبسي عالميكروفون واحكي',
    emptyExample: 'بدي أحجز موعد لصبغة',
  };
}

// --- Date labels ----------------------------------------------------------
// The model is bad at deriving a weekday from an ISO date, so we hand it the
// weekday name with every slot and use the same label in tap confirmations.
const WEEKDAYS_AR = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

function weekdayAr(dateIso: string): string {
  const d = new Date(dateIso + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? '' : WEEKDAYS_AR[d.getDay()];
}

function slotLabelAr(dateIso: string): string {
  const d = new Date(dateIso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return dateIso;
  return `${WEEKDAYS_AR[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

// --- Service ranking ------------------------------------------------------
// Score each service by intake fit: tag overlap with intake-derived tags +
// soft text match on goal.
function rankServices(intake: Intake): Service[] {
  const intakeTags = derivedTagsFromIntake(intake);
  const goal = (intake.goal ?? '').toLowerCase();

  return getServices()
    .map((s) => {
      let score = 0;
      for (const t of s.goodFor) {
        if (intakeTags.has(t)) score += 2;
      }
      if (goal) {
        for (const t of s.goodFor) {
          if (goal.includes(t)) score += 1;
        }
        if (s.id === 'svc-haircut' && (goal.includes('قص') || goal.includes('شعر'))) score += 1;
        if (s.id === 'svc-color' && (goal.includes('صبغ') || goal.includes('لون'))) score += 2;
        if (s.id === 'svc-keratin' && (goal.includes('كيراتين') || goal.includes('تنعيم'))) score += 2;
        if (s.id === 'svc-treatment' && (goal.includes('علاج') || goal.includes('تالف'))) score += 2;
        if (s.id === 'svc-bridal' && (goal.includes('عرس') || goal.includes('عروس'))) score += 3;
        if (s.id === 'svc-styling' && (goal.includes('تسريحة') || goal.includes('مناسبة'))) score += 2;
      }
      return { service: s, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.service);
}

function derivedTagsFromIntake(intake: Intake): Set<string> {
  const tags = new Set<string>();
  if (intake.hairType === 'curly' || intake.hairType === 'coily') {
    tags.add('curly');
    tags.add('coily');
    tags.add('curl-specific');
  }
  if (intake.recentTreatments?.includes('bleach')) {
    tags.add('damaged');
    tags.add('repair');
  }
  if (intake.recentTreatments?.includes('keratin')) {
    tags.add('smoothing');
  }
  if (intake.currentColor === 'colored' || intake.currentColor === 'highlighted') {
    tags.add('maintenance');
    tags.add('root-regrowth');
  }
  if (intake.scalpCondition === 'dry') tags.add('dry');
  if (intake.scalpCondition === 'sensitive') tags.add('damaged');
  if (intake.occasionDate) {
    tags.add('event');
    tags.add('occasion');
  }
  return tags;
}
