import { apiClient } from './api.client';
import type { SuggestionType } from '@collectigo/shared';

interface SuggestionDeliveryResponse {
  success: true;
  message: string;
}

export const suggestionsService = {
  create: async (
    routeId: string,
    payload: { type: SuggestionType; description: string },
  ): Promise<SuggestionDeliveryResponse> => {
    return apiClient.post<SuggestionDeliveryResponse>(`/routes/${routeId}/suggestions`, payload);
  },
};
