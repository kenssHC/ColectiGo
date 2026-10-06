import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { usePlannerStore } from '../stores/planner.store';
import { plannerService } from '../services/planner.service';

interface UseRouteSearchResult {
  canSearch: boolean;
  search: () => Promise<void>;
  errorMessage: string | null;
}

export function useRouteSearch(): UseRouteSearchResult {
  const { origin, destination, setResponse, setCalculating } = usePlannerStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSearch = origin !== null && destination !== null;

  const search = useCallback(async (): Promise<void> => {
    if (!origin || !destination) return;

    setCalculating(true);
    setErrorMessage(null);
    try {
      const response = await plannerService.calculate({ origin, destination });
      setResponse(response);
      router.push('/planner/results');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudieron calcular las rutas',
      );
    } finally {
      setCalculating(false);
    }
  }, [origin, destination, setResponse, setCalculating]);

  return { canSearch, search, errorMessage };
}
