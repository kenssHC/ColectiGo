import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { usePlannerStore } from '../stores/planner.store';
import { plannerService } from '../services/planner.service';
import { routeInterstitialService } from '../services/ads/route-interstitial.service';
import { runRouteSearchFlow } from '../services/route-search.flow';

interface UseRouteSearchResult {
  canSearch: boolean;
  search: () => Promise<void>;
  errorMessage: string | null;
}

export function useRouteSearch(): UseRouteSearchResult {
  const { origin, destination, mode, isCalculating, setResponse, setCalculating } =
    usePlannerStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSearch = origin !== null && destination !== null && !isCalculating;

  useEffect(() => {
    void routeInterstitialService.preload();
  }, []);

  const search = useCallback(async (): Promise<void> => {
    if (!origin || !destination || isCalculating) return;

    setCalculating(true);
    setErrorMessage(null);
    try {
      await runRouteSearchFlow({
        calculate: () => plannerService.calculate({ origin, destination, mode }),
        onCalculated: setResponse,
        maybeShowInterstitial: () =>
          routeInterstitialService.maybeShowAfterSuccessfulSearch(),
      });
      router.push('/planner/results');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudieron calcular las rutas');
    } finally {
      setCalculating(false);
    }
  }, [origin, destination, mode, isCalculating, setResponse, setCalculating]);

  return { canSearch, search, errorMessage };
}
