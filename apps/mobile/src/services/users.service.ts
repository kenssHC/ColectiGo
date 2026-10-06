import { apiClient } from './api.client';
import type { User } from '@collectigo/shared';

export const usersService = {
  /** Crea o recupera el usuario en el backend a partir del token de sesión. */
  sync: (): Promise<User> => apiClient.post<User>('/users/sync'),
  me: (): Promise<User> => apiClient.get<User>('/users/me'),
};
