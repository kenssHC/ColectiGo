import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { firebaseAuth } from './firebase';
import { usersService } from './users.service';
import type { AuthUser } from '../types/user.types';

function mapFirebaseUser(user: FirebaseUser): AuthUser {
  return {
    id: user.uid,
    displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Usuario',
    email: user.email ?? '',
  };
}

/**
 * Sincroniza el usuario con el backend sin bloquear el flujo de sesión:
 * si el backend no está disponible, la app sigue funcionando en modo consulta.
 */
async function syncWithBackend(): Promise<void> {
  try {
    await usersService.sync();
  } catch (error) {
    console.warn('No se pudo sincronizar el usuario con el backend', error);
  }
}

export const authService = {
  async signIn(email: string, password: string): Promise<AuthUser> {
    const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
    await syncWithBackend();
    return mapFirebaseUser(credential.user);
  },

  async register(email: string, password: string, displayName: string): Promise<AuthUser> {
    const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
    await updateProfile(credential.user, { displayName: displayName.trim() });
    await syncWithBackend();
    return { ...mapFirebaseUser(credential.user), displayName: displayName.trim() };
  },

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(firebaseAuth, email.trim());
  },

  async signOut(): Promise<void> {
    await signOut(firebaseAuth);
  },

  async getIdToken(): Promise<string | null> {
    const user = firebaseAuth.currentUser;
    if (!user) return null;
    return user.getIdToken();
  },

  subscribe(callback: (user: AuthUser | null) => void): () => void {
    return onAuthStateChanged(firebaseAuth, (user) => {
      callback(user ? mapFirebaseUser(user) : null);
    });
  },
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos',
  'auth/user-not-found': 'Correo o contraseña incorrectos',
  'auth/wrong-password': 'Correo o contraseña incorrectos',
  'auth/invalid-email': 'El correo electrónico no es válido',
  'auth/user-disabled': 'Esta cuenta fue deshabilitada',
  'auth/email-already-in-use': 'Este correo ya está registrado',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e intenta de nuevo',
  'auth/network-request-failed': 'Sin conexión. Revisa tu internet e intenta de nuevo',
};

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof FirebaseError) {
    return AUTH_ERROR_MESSAGES[error.code] ?? fallback;
  }
  return fallback;
}
