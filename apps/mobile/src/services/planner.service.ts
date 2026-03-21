import { apiClient } from './api.client';
import type { PlannerRequest, PlannerResponse } from '@collectigo/shared';

export const plannerService = {
  calculate: (data: PlannerRequest): Promise<PlannerResponse> =>
    apiClient.post<PlannerResponse>('/planner/calculate', data),
};
