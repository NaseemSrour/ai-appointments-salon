// One-time Firestore seeding. Pushes the bundled services, stylists, and
// default salon settings into Firestore using stable document ids. Safe to
// re-run: setDoc with merge keeps existing edits to the same fields from being
// wiped, while filling in any missing docs.
//
// Trigger it by opening the app with `?seed=1` (dev only — see App.tsx).

import { doc, getDocs, collection, setDoc } from 'firebase/firestore';
import { isFirebaseConfigured } from '../../lib/firebase';
import { getDb } from '../../lib/firestore';
import { DEFAULT_SETTINGS, SEED_SERVICES, SEED_STYLISTS } from './seed-data';

export interface SeedResult {
  services: number;
  stylists: number;
  settings: boolean;
  skipped: boolean;
}

export async function seedFirestore(): Promise<SeedResult> {
  if (!isFirebaseConfigured) {
    return { services: 0, stylists: 0, settings: false, skipped: true };
  }
  const db = getDb();

  await Promise.all(
    SEED_SERVICES.map(({ id, ...data }) =>
      setDoc(doc(db, 'services', id), data, { merge: true }),
    ),
  );
  await Promise.all(
    SEED_STYLISTS.map(({ id, ...data }) =>
      setDoc(doc(db, 'stylists', id), data, { merge: true }),
    ),
  );
  await setDoc(doc(db, 'settings', 'salon'), DEFAULT_SETTINGS, { merge: true });

  return {
    services: SEED_SERVICES.length,
    stylists: SEED_STYLISTS.length,
    settings: true,
    skipped: false,
  };
}

/** True if the catalog collections look empty (used for the seed hint). */
export async function isFirestoreEmpty(): Promise<boolean> {
  if (!isFirebaseConfigured) return false;
  const snap = await getDocs(collection(getDb(), 'services'));
  return snap.empty;
}
