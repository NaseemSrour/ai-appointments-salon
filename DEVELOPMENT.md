# AI Appointments Voice — Development Notes

A voice/text AI booking assistant for a women's hair salon. Replaces the
phone call between customer and salon. Customer talks to the AI; the AI
gathers needs and books; the stylist/owner sees the result in an admin
dashboard.

## Decisions

| Topic | Decision |
|---|---|
| Customer auth | Anonymous booking — collect name + phone, no verification (Phase 1). Phone-verification later if needed. |
| Stylist/owner UX | **Admin dashboard only** in production. NOT pushing to Google Calendar even in production. |
| DB | Firestore (consistent with existing infra) |
| Language | Palestinian Arabic primary. **Must handle Hebrew code-switching** for salon vocabulary (e.g., `תלתלים` → curly, `החלקה` → straightening, `צבע` → color, `גוונים` → highlights, `בליאז` → balayage, `תספורת` → haircut). |
| Returning customers | Skip for v1. Every booking is a fresh intake. |
| Service catalog | Draft sample for Phase 1; real catalog later. |
| Stylists | Draft sample (3–4) for Phase 1; real roster later. |
| Working hours | Sun + Mon closed; Tue–Sat open. Hours flexible — defaulting to 09:00–18:00 in 30-min slots. |

## Conversation strategy

Not a rigid state machine. The model drives the conversation, but the app
owns the intake state via tool calls. Pattern:

```
Customer speaks
    ↓
Model asks broad question (hair type → length → density → condition)
    ↓
Customer answers
    ↓
Model calls record_intake({...}) every time it learns something
    ↓
... continues with dynamic follow-ups ...
    ↓
When enough info gathered:
    Model calls recommend_services()
    ↓
Model presents 2-3 options; customer picks
    ↓
Model calls recommend_stylists(serviceId)
    ↓
Customer chooses (or "any")
    ↓
Model calls check_availability(stylistId, dateRange)
    ↓
Customer picks a slot
    ↓
Model gathers name + phone
    ↓
Model calls book_appointment(...)
    ↓
Model confirms verbally; UI shows the appointment card
```

The intake object is rendered live as a checklist so the customer sees
progress and during dev we can see exactly what's been captured.

## Intake fields

Broad → specific order. Each may trigger dynamic follow-ups.

| Field | Type | Notes |
|---|---|---|
| `hairType` | `straight` \| `wavy` \| `curly` \| `coily` | First thing to ask |
| `hairLength` | `pixie` \| `short` \| `medium` \| `long` \| `extra-long` |  |
| `hairDensity` | `thin` \| `medium` \| `thick` |  |
| `scalpCondition` | `normal` \| `dry` \| `oily` \| `sensitive` |  |
| `currentColor` | `natural` \| `colored` \| `highlighted` \| `bleached` |  |
| `lastTreatmentDate` | ISO date | "When was the last salon visit?" |
| `recentTreatments` | string[] | `keratin`, `color`, `bleach`, `perm`, `relaxer`, `botox`, `treatment` |
| `allergies` | string[] | e.g., `ammonia`, `PPD` |
| `goal` | free-form | "freshen up", "go blonde", "fix damage", "bridal" |
| `styleReference` | free-form | description of desired look |
| `occasionDate` | ISO date (optional) | wedding, event |
| `preferredStylistId` | string (optional) | only if customer asks for someone specific |
| `budgetRange` | `low` \| `mid` \| `premium` | optional |
| `customerName` | string | collected near end |
| `customerPhone` | string | collected near end |

## Dynamic follow-ups (rules baked into the system prompt)

- `hairType === 'curly'` → ask about curl care history, whether they've had a curly cut before
- `recentTreatments` contains `bleach` → warn about layering bleach with other chemicals; ask exact date
- `recentTreatments` contains chemical relaxer or keratin → ask which type, when
- `goal === 'color change'` → ask target shade
- `allergies` populated → ask exactly which substances
- `occasionDate` set → prioritize available slots before that date

## Tool surface

| Tool | Args | Returns |
|---|---|---|
| `record_intake` | partial Intake fields | `{ ok: true, intake: <merged> }` |
| `get_intake` | none | `{ intake: <current>, missing: <list of unset fields> }` |
| `recommend_services` | none (reads intake) | `{ services: [...] }` |
| `recommend_stylists` | `{ serviceId }` | `{ stylists: [...] }` |
| `check_availability` | `{ stylistId?: string, fromDate: ISO, days?: number }` | `{ slots: [{ date, time, stylistId }] }` |
| `book_appointment` | `{ serviceId, stylistId, date, time, customerName, customerPhone, notes? }` | `{ ok: true, appointment: {...} }` |

`stylistId` is optional on `check_availability` — if omitted, returns slots
across all qualified stylists (model can use this for "any stylist" flow).

## Service catalog (sample for Phase 1)

| Service | Duration | Price | Good for |
|---|---|---|---|
| قصة شعر | 45 min | 80 ILS | any |
| قصة كيرلي | 75 min | 150 ILS | curly, coily |
| صبغة شعر | 120 min | 250 ILS | color-change, gray-coverage |
| توتش أب جذور | 90 min | 180 ILS | maintenance, gray-coverage |
| هاي لايتس | 150 min | 350 ILS | subtle-color, dimension |
| باليّاج | 180 min | 450 ILS | natural-look, low-maintenance |
| كيراتين | 180 min | 600 ILS | frizz, smoothing |
| فرد شعر (החלקה) | 240 min | 800 ILS | permanent-straightening |
| علاج شعر | 60 min | 120 ILS | damaged, dry, weak |
| بوتوكس شعر | 150 min | 500 ILS | damaged, smoothing |
| تسريحة | 60 min | 100 ILS | event, occasion |
| تسريحة عروس | 120 min | 400 ILS | wedding |

## Stylists (sample for Phase 1)

| Name | Specialties |
|---|---|
| نور | color, highlights, balayage |
| ريما | curly-cut, haircut, treatment |
| ميرا | keratin, straightening, bridal |
| سارة | haircut, styling, treatment |

## Phasing

- **Phase 1 — ✅ done**: Everything mocked in `src/domain/`. End-to-end voice flow works. Bookings stored in memory.
- **Phase 2 — ✅ done**: Firestore wiring. `services` + `stylists` + `settings/salon` read at startup (cached in `data/catalog.ts`); `appointments` written on book; `customers` upserted (phone-as-id). Availability rewritten to a real, duration-aware engine (`data/availability.ts`) that subtracts existing bookings from the settings working-hours window. With Firebase left blank the app still runs on bundled seed data (mock mode). Seed Firestore once via `?seed=1`.
- **Phase 3 — ✅ done**: Three routes behind the auth gate — `/` (booking), `/admin` (management), `/display` (TV board). Admin manages appointments (status + reschedule + intake view), services, stylists, and salon settings, all live over Firestore `onSnapshot`. TV board is a read-only, auto-refreshing today view.
- **Phase 4 — planned**: Admin-editable conversation flow (see below), customer return flow, SMS confirmation, App Check / production hardening.

## Phase 4 (planned): admin-editable conversation flow

The salon will want to tune the questions the AI asks. Today the system prompt
is hardcoded in `src/domain/prompt.ts`. The plan:

- Store the **editable parts** of the prompt in `settings/salon` (or a new
  `settings/prompt` doc): greeting line, the ordered list of intake questions,
  tone/dialect notes, and the dynamic-follow-up rules.
- Load them through `data/catalog.ts` (same path as the rest of settings) and
  have `buildSystemPrompt()` merge them into a **fixed scaffold**.
- Keep the tool-usage rules and the `record_intake → recommend_* →
  check_availability → book_appointment` contract **non-editable** — they're
  what makes the app work. Only the human-facing wording/order is editable.
- Add a "المحادثة" (Conversation) tab in `/admin` with a live preview.

Rationale for the scaffold split: full free-text prompt editing is powerful but
lets a non-technical operator accidentally break tool calling or the booking
flow. Editing only the question list + wording gives them control without that
risk. This is a deliberate design choice to confirm before building.

## Open questions for later

- Customer return flow (recognize by phone number, recall past intake — the
  `customers` collection already stores `lastIntake` for this)
- Multi-stylist / multi-location support
- SMS confirmation (Twilio or Firebase Extensions)
- Pricing variations (per stylist, per length)
- Walk-in vs appointment-only
- Per-stylist working hours (currently one salon-wide schedule in `settings/salon`)

## File map

```
src/
├── App.tsx                     — routes /, /admin, /display behind the auth gate
├── lib/
│   ├── firebase.ts             — shared Firebase app + isFirebaseConfigured
│   ├── firestore.ts            — shared getDb() (Phase 2)
│   ├── auth.ts                 — email/password sign-in
│   ├── realtime.ts             — OpenAI Realtime (WebRTC) client
│   └── router.ts               — tiny path router (useRoute + navigate)
├── domain/                     🟧 salon-specific layer
│   ├── adapter.tsx             — useDomainAdapter(): state + tool handlers + catalog gate
│   ├── prompt.ts               — system prompt builder (reads catalog)
│   ├── tools.ts                — 6 tool schemas
│   ├── types.ts                — Intake, Service, Stylist, Slot, Appointment, SalonSettings, Customer
│   ├── ResultPanel.tsx         — orchestrates result components
│   ├── data/
│   │   ├── catalog.ts          — load-once cache: services + stylists + settings (Firestore or seed)
│   │   ├── seed-data.ts        — bundled services/stylists/default settings (seed + mock fallback)
│   │   ├── seed.ts             — one-time Firestore seed (?seed=1)
│   │   ├── services.ts         — re-exports catalog accessors
│   │   ├── stylists.ts         — re-exports catalog accessors
│   │   ├── availability.ts     — real duration-aware slot engine + isSlotOpen
│   │   ├── appointments.ts     — fetch/create/watch/updateStatus/reschedule + conflict checks
│   │   ├── customers.ts        — upsertCustomer (phone-as-id)
│   │   ├── admin.ts            — watch + CRUD for services/stylists/settings
│   │   └── time.ts             — interval/overlap helpers
│   └── components/             — IntakePanel, ServiceCards, StylistCards, SlotPicker, BookingConfirmation
├── admin/                      🟦 /admin dashboard
│   ├── AdminApp.tsx            — tabbed shell
│   ├── AppointmentsAdmin.tsx   — list, status actions, reschedule, intake snapshot
│   ├── ServicesAdmin.tsx       — services CRUD (+ shared Field/FormActions)
│   ├── StylistsAdmin.tsx       — stylists CRUD
│   ├── SettingsAdmin.tsx       — hours / closed days / slot length
│   └── format.ts               — shared labels + date/list helpers
└── display/
    └── DisplayBoard.tsx        — always-on TV board (read-only, live)
```

## Production deployment checklist

The app is currently a **prototype-grade** client-only SPA: the OpenAI key is in
the browser bundle, all three routes ship in one bundle, and Firestore is
protected only by a coarse "signed-in" rule. Before going customer-facing:

### 1. Anonymous sign-in for customers
Customers shouldn't see a login screen to book.
- Enable **Anonymous** provider in Firebase Auth.
- On the `/` (booking) route, call `signInAnonymously()` instead of showing
  `SignInPage`. Keep email/password for `/admin` + `/display`.
- This means the security rules can no longer treat "signed in" as "staff" —
  see #2.

### 2. Keep customers out of /admin and /display
**You cannot truly hide a route in a shared client bundle** — the JS for every
route is downloaded, so anyone can type `/admin`. Two layers fix this:
- **Real boundary = Firestore rules with a staff role.** Don't gate admin data
  on `request.auth != null` (anonymous customers satisfy that). Mark staff with
  a **custom claim** (`admin: true`) set via the Firebase Admin SDK / a Cloud
  Function, then gate appointment *reads*, customer reads, and all
  services/stylists/settings *writes* on `request.auth.token.admin == true`.
  Customers (anonymous) keep only: read services/stylists/settings, create their
  own appointment + customer doc.
- **Stronger: split the bundle.** Deploy `/admin` + `/display` as a **separate
  build / Firebase Hosting target / subdomain** (e.g. `admin.salon.com`) so the
  customer-facing bundle doesn't even contain the admin code. The booking app
  then ships none of the management UI. Also add the client-side route guard
  (hide /admin + /display unless the user has the admin claim) for UX.

### 3. Don't expose secrets
Two very different cases — don't conflate them:
- **Firebase web config (`apiKey`, etc.) is NOT a secret.** It's designed to ship
  in the client; it only identifies the project. Protect data with **Firestore
  security rules** + **App Check** (attestation) + optionally HTTP-referrer
  restrictions on the key in Google Cloud console. Nothing to "hide" here.
- **The OpenAI key IS a secret and is currently exposed.** `realtime.ts` mints
  the ephemeral token in the browser using `VITE_OPENAI_API_KEY`, so the real
  key is in the bundle. **Fix:** move *only* the ephemeral-token POST
  (`/v1/realtime/client_secrets`) into a **Firebase Function** (or any small
  backend) that holds the real key server-side; the browser calls that function,
  gets a short-lived ephemeral key, and does the WebRTC SDP exchange with it.
  The real key never reaches the client. Gate that function so only your app /
  authenticated sessions can call it (App Check, or require a Firebase ID token).

### 4. Hosting / SPA routing
On Firebase Hosting add a catch-all rewrite so `/admin` and `/display` resolve
on refresh:
```json
"rewrites": [{ "source": "**", "destination": "/index.html" }]
```
(Vite's dev server already does this; production hosting needs it explicitly.)
