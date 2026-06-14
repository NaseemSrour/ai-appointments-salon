// Customers, keyed by phone number. Upserted on every booking so Phase 3 can
// recall a returning customer's last consultation. In-memory in mock mode.

import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { isFirebaseConfigured } from '../../lib/firebase';
import { getDb } from '../../lib/firestore';
import type { Customer, Intake } from '../types';

const memCustomers = new Map<string, Customer>();

// Phone digits make a stable, readable Firestore document id.
function customerId(phone: string): string {
  return phone.replace(/[^\d]/g, '') || phone.trim();
}

/**
 * Create or update the customer record for this phone number, refreshing the
 * stored name + last intake and bumping the booking count.
 */
export async function upsertCustomer(args: {
  phone: string;
  name: string;
  intake: Intake;
}): Promise<void> {
  const id = customerId(args.phone);
  const nowIso = new Date().toISOString();

  if (!isFirebaseConfigured) {
    const existing = memCustomers.get(id);
    memCustomers.set(id, {
      phone: args.phone,
      name: args.name,
      lastIntake: args.intake,
      bookingCount: (existing?.bookingCount ?? 0) + 1,
      firstSeenAt: existing?.firstSeenAt ?? nowIso,
      lastBookingAt: nowIso,
    });
    return;
  }

  const ref = doc(getDb(), 'customers', id);
  const snap = await getDoc(ref);
  const prev = snap.exists() ? (snap.data() as Partial<Customer>) : null;

  await setDoc(
    ref,
    {
      phone: args.phone,
      name: args.name,
      lastIntake: args.intake,
      bookingCount: (prev?.bookingCount ?? 0) + 1,
      firstSeenAt: prev?.firstSeenAt ?? nowIso,
      lastBookingAt: nowIso,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
