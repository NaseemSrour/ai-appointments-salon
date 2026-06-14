import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { getFirebaseApp } from './firebase';

export function watchAuthState(
  callback: (user: User | null) => void,
): () => void {
  return onAuthStateChanged(getAuth(getFirebaseApp()), callback);
}

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(
    getAuth(getFirebaseApp()),
    email.trim(),
    password,
  );
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getAuth(getFirebaseApp()));
}

// Map Firebase auth error codes to Arabic messages the end-user will
// actually understand.
export function authErrorMessage(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: unknown }).code)
      : '';
  switch (code) {
    case 'auth/invalid-email':
      return 'البريد الإلكتروني غلط';
    case 'auth/user-disabled':
      return 'الحساب موقوف';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'الإيميل أو كلمة السر غلط';
    case 'auth/too-many-requests':
      return 'محاولات كتير، انتظر شوي وجرّب كمان مرة';
    case 'auth/network-request-failed':
      return 'في مشكلة بالإنترنت';
    default:
      return 'صار في مشكلة بتسجيل الدخول';
  }
}
