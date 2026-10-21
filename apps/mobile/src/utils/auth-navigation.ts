import type { Href } from 'expo-router';

export type AuthReturnPath = '/profile/new-suggestion';

const AUTH_RETURN_PATHS = new Set<AuthReturnPath>(['/profile/new-suggestion']);

/** Solo acepta destinos internos conocidos para evitar redirecciones arbitrarias. */
export function parseAuthReturnPath(value: string | string[] | undefined): AuthReturnPath | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && AUTH_RETURN_PATHS.has(candidate as AuthReturnPath)
    ? (candidate as AuthReturnPath)
    : null;
}

export function loginHref(returnTo?: AuthReturnPath): Href {
  return returnTo ? { pathname: '/(auth)/login', params: { returnTo } } : '/(auth)/login';
}

export function registerHref(returnTo?: AuthReturnPath): Href {
  return returnTo ? { pathname: '/(auth)/register', params: { returnTo } } : '/(auth)/register';
}

export function authenticatedDestination(returnTo: AuthReturnPath | null): Href {
  return returnTo ?? '/(tabs)/map';
}
