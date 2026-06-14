<div align="center">

# 💇‍♀️ AI Appointments Voice

### Talk to book. The salon's AI receptionist that never misses a call.

A ChatGPT-style **realtime voice assistant** that books appointments for a
women's hair salon — the customer just *talks*, in **Palestinian Arabic**
(with Hebrew code-switching for salon vocabulary), and the AI runs a full hair
consultation, recommends services and stylists, finds an open slot, and books
it. The salon sees everything live in an **admin dashboard** and on an
**always-on TV board**.

<br/>

![OpenAI Realtime](https://img.shields.io/badge/OpenAI-Realtime%20API-412991?logo=openai&logoColor=white&style=flat-square)
![WebRTC](https://img.shields.io/badge/WebRTC-voice-333333?style=flat-square)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white&style=flat-square)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white&style=flat-square)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black&style=flat-square)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white&style=flat-square)
![Status](https://img.shields.io/badge/status-Phase%203%20complete-success?style=flat-square)

</div>

---

## 🗣️ Just say it

Tap the mic and talk. The AI handles the rest — mixed Arabic/Hebrew, no menus, no forms.

> «بدي أحجز موعد لصبغة»  ·  «תלתלים شلي بدهم تجديد»  ·  «بدي تسريحة لعرس بكرا»

It welcomes the customer, asks about their hair (type → length → density → scalp
→ color → recent treatments → goal), recommends the right services, picks a
qualified stylist, finds a real open slot, takes a name + phone, and confirms —
all by voice.

---

## ✨ What's inside

| | Feature |
|---|---|
| 🎙️ | **Realtime voice** — ~300 ms round trip over a single WebRTC connection; the customer can interrupt mid-sentence |
| 🧠 | **Smart consultation** — the model drives the conversation; the app owns the intake state via tool calls |
| 🇵🇸 | **Palestinian Arabic** with built-in **Hebrew salon glossary** (תלתלים → curly, החלקה → straightening, צבע → color…) |
| 📅 | **Real, duration-aware availability** — open slots = working-hours window minus actual bookings, blocking each stylist for the full service length |
| 🔥 | **Firestore-backed** — services, stylists, settings, appointments & customers, with a conflict-checked booking commit |
| 🛠️ | **Admin dashboard** — manage appointments (cancel / no-show / reschedule / intake history), services, stylists, and salon hours, all live |
| 📺 | **TV board** — an always-on, auto-refreshing display of the day's bookings for the salon wall |

---

## 🧭 Three surfaces, one app

| Route | Who | What |
|---|---|---|
| `/` | Customer | The voice booking assistant |
| `/admin` | Staff | Manage appointments · services · stylists · settings (live over Firestore) |
| `/display` | The salon TV | Glanceable, dark, big-type board of today's (or the next) bookings |

All three sit behind the auth gate.

---

## ⚙️ How a booking flows

```
🎤 Customer speaks  →  🧠 Realtime model
                          │  calls tools as it learns / decides
                          ▼
   record_intake ─▶ recommend_services ─▶ recommend_stylists
        │                                        │
        ▼                                        ▼
   live intake panel                     check_availability  ──▶ real slots
                                                 │   (settings − bookings)
                                                 ▼
                                          book_appointment
                                                 │  re-checks the slot,
                                                 ▼  writes to Firestore
                                  ✅ appointment + 👤 customer upserted
                                                 │
                              ┌──────────────────┼──────────────────┐
                              ▼                                      ▼
                        🛠️ /admin                               📺 /display
```

The six tools (`record_intake`, `get_intake`, `recommend_services`,
`recommend_stylists`, `check_availability`, `book_appointment`) are the entire
contract between the model and the app.

---

## 🚀 Quick start

```sh
npm install
cp .env.example .env.local
# edit .env.local — at minimum VITE_OPENAI_API_KEY
npm run dev -- --host
```

Open the printed `https://<lan-ip>:5173` **on your phone** (same Wi-Fi), tap
through the self-signed cert warning, sign in (or leave Firebase blank to run on
bundled mock data), and tap the mic.

### 🔥 Firestore setup (for real persistence)

1. Enable **Firestore** (Native mode) in your Firebase console and fill
   `VITE_FIREBASE_*` in `.env.local`.
2. **Seed once:** open the dev server with `?seed=1`
   (`https://<lan-ip>:5173/?seed=1`) → **Seed Firestore** → remove `?seed=1`.
   This pushes the bundled services, stylists, and default salon settings.
3. Starter security rules (prototype — tighten before launch):

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       function signedIn() { return request.auth != null; }
       match /services/{id} { allow read: if true; allow write: if signedIn(); }
       match /stylists/{id} { allow read: if true; allow write: if signedIn(); }
       match /settings/{id} { allow read: if true; allow write: if signedIn(); }
       match /appointments/{id} { allow read, create, update, delete: if signedIn(); }
       match /customers/{id}    { allow read, write: if signedIn(); }
     }
   }
   ```

> 💡 Leave Firebase blank and the app still runs end-to-end on bundled seed
> data (bookings live in memory) — great for local UI work.

---

## 🧱 Tech stack

**React 18 + TypeScript + Vite** · **OpenAI Realtime API** over **WebRTC** ·
**Firebase Auth + Firestore** · **Tailwind CSS** (RTL-first) · installable
**PWA**. No backend required for the prototype.

Built on top of the [`voice_assistant_template`](../voice_assistant_template) —
the generic shell (auth + realtime wiring) is untouched; everything
salon-specific lives in [`src/domain/`](src/domain/).

---

## 📦 Project status

| Phase | Scope | Status |
|---|---|---|
| **1** | Mocked services/stylists/availability; conversation + booking flow proven | ✅ |
| **2** | Firestore data layer + real duration-aware availability | ✅ |
| **3** | `/admin` dashboard + `/display` TV board | ✅ |
| **4** | Admin-editable conversation flow · customer return flow · prod hardening | 🔜 |

Full architecture, decisions, intake schema, and the **production deployment
checklist** (anonymous customer sign-in, securing the OpenAI key, keeping
customers out of `/admin`, SPA hosting) live in **[DEVELOPMENT.md](DEVELOPMENT.md)**.

---

## 💸 Cost reality check

A typical 3–5 min consultation (incl. tool round-trips):
`gpt-realtime-mini` ≈ **$0.05–0.10** per booking · `gpt-realtime` ≈
**$0.20–0.40**. A salon doing 20 bookings/day on the cheap tier ≈ **~$45/mo** —
that's the ceiling; Firestore + hosting sit comfortably in free tier.

---

<div align="center">
<sub>Made for real salons · Palestinian Arabic first · voice over forms</sub>
</div>
