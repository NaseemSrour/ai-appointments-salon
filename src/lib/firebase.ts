// Shared Firebase app instance. Both auth and any data services use this so
// the SDK initializes exactly once per session.

import { initializeApp, type FirebaseApp } from 'firebase/app';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};

// When unconfigured, the app skips the auth gate and runs in mock mode —
// useful for local UI iteration without a Firebase project.
export const isFirebaseConfigured = Boolean(
  config.apiKey && config.projectId && config.authDomain,
);

let appInstance: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) appInstance = initializeApp(config);
  return appInstance;
}
