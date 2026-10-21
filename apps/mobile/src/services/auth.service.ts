import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { firebaseAuth } from './firebase';
import { usersService } from './users.service';
import type { AuthUser } from '../types/user.types';
import type { AuthMethod, User } from '@collectigo/shared';
import { apiClient } from './api.client';
import { googleSignInService } from './google-sign-in.service';

interface GoogleAuthenticatedResponse {
  status: 'authenticated';
  firebaseCustomToken: string;
}

interface GoogleLinkRequiredResponse {
  status: 'link_required';
  email: string;
  displayName: string;
}

type GoogleBackendResponse = GoogleAuthenticatedResponse | GoogleLinkRequiredResponse;

interface PendingGoogleLink {
  idToken: string;
  email: string;
}

export type GoogleSignInResult =
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'link_required'; email: string }
  | { status: 'cancelled' };

let pendingGoogleLink: PendingGoogleLink | null = null;

function firebaseMethods(user: FirebaseUser): AuthMethod[] {
  const methods = new Set<AuthMethod>();
  if (user.providerData.some((provider) => provider.providerId === 'password')) {
    methods.add('password');
  }
  if (user.providerData.some((provider) => provider.providerId === 'google.com')) {
    methods.add('google');
  }
  return [...methods];
}

function mapFirebaseUser(user: FirebaseUser, profile?: User | null): AuthUser {
  return {
    id: user.uid,
    displayName: profile?.displayName ?? user.displayName ?? user.email?.split('@')[0] ?? 'Usuario',
    email: profile?.email ?? user.email ?? '',
    authMethods: profile?.authMethods ?? firebaseMethods(user),
    avatarUrl: profile?.avatarUrl ?? user.photoURL ?? null,
    emailVerified: profile?.emailVerified ?? user.emailVerified,
  };
}

/**
 * Sincroniza el usuario con el backend sin bloquear el flujo de sesión:
 * si el backend no está disponible, la app sigue funcionando en modo consulta.
 */
async function syncWithBackend(): Promise<User | null> {
  try {
    return await usersService.sync();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('No se pudo sincronizar el usuario con el backend', error);
    return null;
  }
}

export const authService = {
  async signIn(email: string, password: string): Promise<AuthUser> {
    const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
    const profile = await syncWithBackend();
    return mapFirebaseUser(credential.user, profile);
  },

  async register(email: string, password: string, displayName: string): Promise<AuthUser> {
    const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
    await updateProfile(credential.user, { displayName: displayName.trim() });
    const profile = await syncWithBackend();
    return {
      ...mapFirebaseUser(credential.user, profile),
      displayName: displayName.trim(),
    };
  },

  isGoogleSignInConfigured(): boolean {
    return googleSignInService.isConfigured();
  },

  getPendingGoogleLink(): PendingGoogleLink | null {
    return pendingGoogleLink;
  },

  clearPendingGoogleLink(): void {
    pendingGoogleLink = null;
  },

  async signInWithGoogle(): Promise<GoogleSignInResult> {
    const idToken = await googleSignInService.requestIdToken();
    if (!idToken) return { status: 'cancelled' };

    const result = await apiClient.post<GoogleBackendResponse>('/auth/google', { idToken });
    if (result.status === 'link_required') {
      pendingGoogleLink = { idToken, email: result.email };
      return { status: 'link_required', email: result.email };
    }

    const credential = await signInWithCustomToken(firebaseAuth, result.firebaseCustomToken);
    pendingGoogleLink = null;
    const profile = await usersService.me();
    return { status: 'authenticated', user: mapFirebaseUser(credential.user, profile) };
  },

  async linkGoogleWithPassword(password: string): Promise<AuthUser> {
    const pending = pendingGoogleLink;
    if (!pending) {
      throw new Error('Inicia nuevamente el acceso con Google');
    }

    const credential = await signInWithEmailAndPassword(firebaseAuth, pending.email, password);
    try {
      await apiClient.post('/auth/google/link', { idToken: pending.idToken }, 'required');
      const profile = await usersService.me();
      pendingGoogleLink = null;
      return mapFirebaseUser(credential.user, profile);
    } catch (error) {
      await signOut(firebaseAuth);
      throw error;
    }
  },

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(firebaseAuth, email.trim());
  },

  async signOut(): Promise<void> {
    pendingGoogleLink = null;
    await Promise.allSettled([googleSignInService.signOut(), signOut(firebaseAuth)]);
  },

  async deleteAccount(): Promise<void> {
    await usersService.deleteMe();
    pendingGoogleLink = null;
    await Promise.allSettled([googleSignInService.signOut(), signOut(firebaseAuth)]);
  },

  async getIdToken(): Promise<string | null> {
    const user = firebaseAuth.currentUser;
    if (!user) return null;
    return user.getIdToken();
  },

  subscribe(callback: (user: AuthUser | null) => void): () => void {
    return onAuthStateChanged(firebaseAuth, (user) => {
      if (!user) {
        callback(null);
        return;
      }

      callback(mapFirebaseUser(user));
      void usersService
        .me()
        .then((profile) => {
          if (firebaseAuth.currentUser?.uid === user.uid) {
            callback(mapFirebaseUser(user, profile));
          }
        })
        .catch(() => {
          if (firebaseAuth.currentUser?.uid === user.uid) {
            callback(mapFirebaseUser(user));
          }
        });
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
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
