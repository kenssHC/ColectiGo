import { apiClient } from './api.client';
import type { RouteSuggestion, SuggestionType } from '@collectigo/shared';

export interface SuggestionWithRoute extends RouteSuggestion {
  route?: { id: string; name: string };
}

/** El backend serializa la entidad TypeORM; se normaliza al contrato shared. */
interface BackendSuggestion {
  id: string;
  type: SuggestionType;
  description: string;
  status: RouteSuggestion['status'];
  createdAt: string;
  route?: { id: string; name: string };
  user?: { id: string };
}

function mapSuggestion(raw: BackendSuggestion): SuggestionWithRoute {
  return {
    id: raw.id,
    userId: raw.user?.id ?? '',
    routeId: raw.route?.id ?? '',
    type: raw.type,
    description: raw.description,
    status: raw.status,
    createdAt: raw.createdAt,
    route: raw.route,
  };
}

export const suggestionsService = {
  mine: async (): Promise<SuggestionWithRoute[]> => {
    const data = await apiClient.get<BackendSuggestion[]>('/routes/suggestions/mine');
    return data.map(mapSuggestion);
  },

  create: async (
    routeId: string,
    payload: { type: SuggestionType; description: string },
  ): Promise<SuggestionWithRoute> => {
    const raw = await apiClient.post<BackendSuggestion>(
      `/routes/${routeId}/suggestions`,
      payload,
    );
    return mapSuggestion(raw);
  },
};
