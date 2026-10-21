import { firebaseAuth } from './firebase';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
const REQUEST_TIMEOUT_MS = 15_000;
type AuthMode = 'none' | 'required';

async function getAuthHeaders(authMode: AuthMode): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authMode === 'none') return headers;

  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error('Inicia sesión para continuar');
  }
  headers.Authorization = `Bearer ${await user.getIdToken()}`;
  return headers;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authMode: AuthMode = 'none',
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    const authHeaders = await getAuthHeaders(authMode);
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { ...authHeaders, ...(options.headers as Record<string, string> | undefined) },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Inicia sesión para continuar') {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('El servidor tardó demasiado en responder');
    }
    throw new Error('No se pudo conectar con el servidor');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
    const message = (error as { message?: string | string[] }).message;
    throw new Error(
      Array.isArray(message) ? message.join(', ') : (message ?? `Error ${response.status}`),
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, authMode: AuthMode = 'none'): Promise<T> => request<T>(path, {}, authMode),
  post: <T>(path: string, body?: unknown, authMode: AuthMode = 'none'): Promise<T> =>
    request<T>(
      path,
      {
        method: 'POST',
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      authMode,
    ),
  patch: <T>(path: string, body: unknown, authMode: AuthMode = 'none'): Promise<T> =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, authMode),
  delete: <T>(path: string, authMode: AuthMode = 'none'): Promise<T> =>
    request<T>(path, { method: 'DELETE' }, authMode),
};
