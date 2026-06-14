// Catalog cache: services, stylists, and salon settings.
//
// These change rarely, so we load them once per session and cache in module
// scope. Keeping the cache module-level (not React state) means the ranking
// and prompt code can stay synchronous, and the two useDomainAdapter()
// instances in App share the same loaded data.
//
// When Firebase is unconfigured the cache is filled from bundled seed data, so
// the app still runs fully offline for local UI iteration.

import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { isFirebaseConfigured } from '../../lib/firebase';
import { getDb } from '../../lib/firestore';
import type { SalonSettings, Service, Stylist } from '../types';
import { DEFAULT_SETTINGS, SEED_SERVICES, SEED_STYLISTS } from './seed-data';

interface Catalog {
  services: Service[];
  stylists: Stylist[];
  settings: SalonSettings;
}

let cache: Catalog | null = null;
let loadPromise: Promise<Catalog> | null = null;

/**
 * Load the catalog once. Idempotent — concurrent callers share one promise and
 * later callers get the cached result immediately.
 */
export function loadCatalog(): Promise<Catalog> {
  if (cache) return Promise.resolve(cache);
  if (loadPromise) return loadPromise;
  loadPromise = (isFirebaseConfigured ? loadFromFirestore() : loadFromSeed())
    .then((c) => {
      cache = c;
      return c;
    })
    .catch((err) => {
      // Reset so a transient failure can be retried on the next mount.
      loadPromise = null;
      throw err;
    });
  return loadPromise;
}

async function loadFromSeed(): Promise<Catalog> {
  return {
    services: SEED_SERVICES,
    stylists: SEED_STYLISTS,
    settings: DEFAULT_SETTINGS,
  };
}

async function loadFromFirestore(): Promise<Catalog> {
  const db = getDb();
  const [servicesSnap, stylistsSnap, settingsSnap] = await Promise.all([
    getDocs(collection(db, 'services')),
    getDocs(collection(db, 'stylists')),
    getDoc(doc(db, 'settings', 'salon')),
  ]);

  const services = servicesSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Service,
  );
  const stylists = stylistsSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Stylist,
  );
  const settings = settingsSnap.exists()
    ? { ...DEFAULT_SETTINGS, ...(settingsSnap.data() as Partial<SalonSettings>) }
    : DEFAULT_SETTINGS;

  // If the collections haven't been seeded yet, fall back to bundled data so
  // the app is still usable (and the operator sees a console hint).
  if (services.length === 0 || stylists.length === 0) {
    console.warn(
      '[catalog] Firestore services/stylists empty — using bundled seed data. ' +
        'Run the one-time seed (open the app with ?seed=1) to populate Firestore.',
    );
    return {
      services: services.length ? services : SEED_SERVICES,
      stylists: stylists.length ? stylists : SEED_STYLISTS,
      settings,
    };
  }
  return { services, stylists, settings };
}

// --- Synchronous accessors (valid only after loadCatalog resolves) ---------

function requireCache(): Catalog {
  if (!cache) {
    throw new Error('catalog accessed before loadCatalog() resolved');
  }
  return cache;
}

export function isCatalogReady(): boolean {
  return cache !== null;
}

export function getServices(): Service[] {
  return requireCache().services;
}

export function getStylists(): Stylist[] {
  return requireCache().stylists;
}

export function getSettings(): SalonSettings {
  return requireCache().settings;
}

export function getServiceById(id: string): Service | undefined {
  return requireCache().services.find((s) => s.id === id);
}

export function getStylistById(id: string): Stylist | undefined {
  return requireCache().stylists.find((s) => s.id === id);
}

export function getStylistsForService(requiredSpecialties: string[]): Stylist[] {
  const all = requireCache().stylists;
  if (requiredSpecialties.length === 0) return all;
  return all.filter((s) =>
    s.specialties.some((sp) => requiredSpecialties.includes(sp)),
  );
}

// --- React integration -----------------------------------------------------

interface CatalogState {
  ready: boolean;
  error: string | null;
}

/**
 * Triggers the one-time catalog load and reports readiness so the UI can gate
 * the session start until services/stylists/settings are available.
 */
export function useCatalog(): CatalogState {
  const [state, setState] = useState<CatalogState>({
    ready: isCatalogReady(),
    error: null,
  });

  useEffect(() => {
    if (isCatalogReady()) return;
    let alive = true;
    loadCatalog()
      .then(() => alive && setState({ ready: true, error: null }))
      .catch(
        (err) =>
          alive &&
          setState({ ready: false, error: String(err?.message ?? err) }),
      );
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
