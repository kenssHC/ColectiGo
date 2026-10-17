export type AuthMethod = 'password' | 'google';

export interface User {
  id: string;
  firebaseUid: string;
  displayName: string;
  email: string;
  createdAt: string;
  authMethods?: AuthMethod[];
  avatarUrl?: string | null;
  emailVerified?: boolean;
}
