export interface RouteSearchFlowOptions<T> {
  calculate: () => Promise<T>;
  onCalculated: (response: T) => void;
  maybeShowInterstitial: () => Promise<unknown>;
}

/**
 * Conserva el resultado antes de intentar publicidad. Cualquier fallo del
 * interstitial se ignora deliberadamente para no bloquear la navegación.
 */
export async function runRouteSearchFlow<T>({
  calculate,
  onCalculated,
  maybeShowInterstitial,
}: RouteSearchFlowOptions<T>): Promise<T> {
  const response = await calculate();
  onCalculated(response);
  try {
    await maybeShowInterstitial();
  } catch {
    // La publicidad es opcional; el resultado ya está guardado.
  }
  return response;
}
