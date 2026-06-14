// Admin write/watch operations for the catalog (services, stylists) and salon
// settings. These talk to Firestore directly with live onSnapshot watchers, so
// the admin UI always reflects the source of truth — independent of the
// read-once `catalog.ts` cache that the voice flow uses.
//
// Editing here updates Firestore; the voice app picks up changes on its next
// session (it loads the catalog once per session).

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { isFirebaseConfigured } from '../../lib/firebase';
import { getDb } from '../../lib/firestore';
import type { SalonSettings, Service, Stylist } from '../types';
import { DEFAULT_SETTINGS } from './seed-data';

export const ADMIN_AVAILABLE = isFirebaseConfigured;

function requireFirestore(): void {
  if (!isFirebaseConfigured) {
    throw new Error('Admin actions require Firebase to be configured.');
  }
}

// --- Services --------------------------------------------------------------

export function watchServices(cb: (services: Service[]) => void): () => void {
  requireFirestore();
  return onSnapshot(collection(getDb(), 'services'), (snap) => {
    cb(
      snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Service)
        .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    );
  });
}

export async function createService(data: Omit<Service, 'id'>): Promise<void> {
  requireFirestore();
  await addDoc(collection(getDb(), 'services'), data);
}

export async function updateService(
  id: string,
  data: Omit<Service, 'id'>,
): Promise<void> {
  requireFirestore();
  await setDoc(doc(getDb(), 'services', id), data);
}

export async function deleteService(id: string): Promise<void> {
  requireFirestore();
  await deleteDoc(doc(getDb(), 'services', id));
}

// --- Stylists --------------------------------------------------------------

export function watchStylists(cb: (stylists: Stylist[]) => void): () => void {
  requireFirestore();
  return onSnapshot(collection(getDb(), 'stylists'), (snap) => {
    cb(
      snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Stylist)
        .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    );
  });
}

export async function createStylist(data: Omit<Stylist, 'id'>): Promise<void> {
  requireFirestore();
  await addDoc(collection(getDb(), 'stylists'), data);
}

export async function updateStylist(
  id: string,
  data: Omit<Stylist, 'id'>,
): Promise<void> {
  requireFirestore();
  await setDoc(doc(getDb(), 'stylists', id), data);
}

export async function deleteStylist(id: string): Promise<void> {
  requireFirestore();
  await deleteDoc(doc(getDb(), 'stylists', id));
}

// --- Settings --------------------------------------------------------------

export function watchSettings(cb: (settings: SalonSettings) => void): () => void {
  requireFirestore();
  return onSnapshot(doc(getDb(), 'settings', 'salon'), (snap) => {
    cb(
      snap.exists()
        ? { ...DEFAULT_SETTINGS, ...(snap.data() as Partial<SalonSettings>) }
        : DEFAULT_SETTINGS,
    );
  });
}

export async function saveSettings(settings: SalonSettings): Promise<void> {
  requireFirestore();
  await updateDoc(doc(getDb(), 'settings', 'salon'), { ...settings }).catch(
    // Doc may not exist yet on a fresh project — create it.
    async () => {
      await setDoc(doc(getDb(), 'settings', 'salon'), settings);
    },
  );
}
