import { apiClient } from './api.client';
import type { User } from '@collectigo/shared';

export const usersService = {
  /** Crea o recupera el usuario en el backend a partir del token de sesión. */
  sync: (): Promise<User> => apiClient.post<User>('/users/sync', undefined, 'required'),
  me: (): Promise<User> => apiClient.get<User>('/users/me', 'required'),
  deleteMe: (): Promise<void> => apiClient.delete<void>('/users/me', 'required'),
};
