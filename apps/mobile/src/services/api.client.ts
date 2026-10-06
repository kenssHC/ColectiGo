import { firebaseAuth } from './firebase';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
const REQUEST_TIMEOUT_MS = 15_000;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const user = firebaseAuth.currentUser;
  if (user) {
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }
  return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { ...authHeaders, ...(options.headers as Record<string, string> | undefined) },
      signal: controller.signal,
    });
  } catch (error) {
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

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
};
