import { apiClient } from './api.client';
import type { TransportRoute } from '@collectigo/shared';

export const routesService = {
  getAll: (): Promise<TransportRoute[]> => apiClient.get<TransportRoute[]>('/routes'),
  getById: (id: string): Promise<TransportRoute> => apiClient.get<TransportRoute>(`/routes/${id}`),
};
