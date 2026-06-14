// Shared Firestore instance, built on the same Firebase app as auth so the
// SDK initializes once per session.

import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFirebaseApp } from './firebase';

let dbInstance: Firestore | null = null;

export function getDb(): Firestore {
  if (!dbInstance) dbInstance = getFirestore(getFirebaseApp());
  return dbInstance;
}
