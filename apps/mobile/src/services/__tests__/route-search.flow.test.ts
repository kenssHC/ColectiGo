import { runRouteSearchFlow } from '../route-search.flow';

describe('runRouteSearchFlow', () => {
  test('guarda la respuesta antes de esperar el anuncio', async () => {
    const events: string[] = [];
    let closeAd: (() => void) | null = null;
    const ad = new Promise<void>((resolve) => {
      closeAd = resolve;
    });

    const flow = runRouteSearchFlow({
      calculate: async () => ({ id: 'route-result' }),
      onCalculated: () => events.push('stored'),
      maybeShowInterstitial: async () => {
        events.push('ad');
        await ad;
      },
    });

    await Promise.resolve();
    expect(events).toEqual(['stored', 'ad']);
    const resolveClose = closeAd as (() => void) | null;
    if (!resolveClose) throw new Error('No se creó el cierre diferido del anuncio');
    resolveClose();
    await expect(flow).resolves.toEqual({ id: 'route-result' });
  });

  test('conserva el resultado cuando el anuncio falla', async () => {
    let stored: { id: string } | null = null;

    await expect(
      runRouteSearchFlow({
        calculate: async () => ({ id: 'route-result' }),
        onCalculated: (response) => {
          stored = response;
        },
        maybeShowInterstitial: () => Promise.reject(new Error('ad failed')),
      }),
    ).resolves.toEqual({ id: 'route-result' });
    expect(stored).toEqual({ id: 'route-result' });
  });

  test('no intenta publicidad cuando falla el backend', async () => {
    const maybeShowInterstitial = jest.fn<Promise<void>, []>();

    await expect(
      runRouteSearchFlow({
        calculate: () => Promise.reject(new Error('backend offline')),
        onCalculated: () => undefined,
        maybeShowInterstitial,
      }),
    ).rejects.toThrow('backend offline');
    expect(maybeShowInterstitial).not.toHaveBeenCalled();
  });
});
