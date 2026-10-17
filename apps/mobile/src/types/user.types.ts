import type { AuthMethod } from '@collectigo/shared';

export interface AuthUser {
  id: string;
  displayName: string;
  email: string;
  authMethods: AuthMethod[];
  avatarUrl: string | null;
  emailVerified: boolean;
}
