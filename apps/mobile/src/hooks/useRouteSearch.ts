import { useCallback } from 'react';
import { router } from 'expo-router';
import { usePlannerStore } from '../stores/planner.store';
import { MOCK_PLANNER_RESPONSE } from '../data/mock.data';

interface UseRouteSearchResult {
  canSearch: boolean;
  search: () => Promise<void>;
}

export function useRouteSearch(): UseRouteSearchResult {
  const { origin, destination, setResult, setCalculating } = usePlannerStore();

  const canSearch = origin !== null && destination !== null;

  const search = useCallback(async (): Promise<void> => {
    if (!origin || !destination) return;

    setCalculating(true);
    await new Promise((resolve) => setTimeout(resolve, 1400));
    setResult(MOCK_PLANNER_RESPONSE);
    setCalculating(false);
    router.push('/planner/results');
  }, [origin, destination, setResult, setCalculating]);

  return { canSearch, search };
}
