import {
  RouteInterstitialController,
  type RouteInterstitialGateway,
  type RouteInterstitialShowResult,
} from '../route-interstitial.controller';
import {
  RouteInterstitialPolicy,
  type KeyValueStorage,
  type RouteInterstitialRules,
} from '../route-interstitial.policy';

class MemoryStorage implements KeyValueStorage {
  private value: string | null = null;
  async getItem(): Promise<string | null> {
    return this.value;
  }
  async setItem(_key: string, value: string): Promise<void> {
    this.value = value;
  }
}

class FakeGateway implements RouteInterstitialGateway {
  ready = true;
  preloadCalls = 0;
  showCalls = 0;
  preloadError: Error | null = null;
  showResult: RouteInterstitialShowResult = {
    outcome: 'closed',
    impressionRecorded: true,
  };
  deferredShow: Promise<RouteInterstitialShowResult> | null = null;

  isReady(): boolean {
    return this.ready;
  }
  async preload(): Promise<void> {
    this.preloadCalls += 1;
    if (this.preloadError) throw this.preloadError;
  }
  async show(): Promise<RouteInterstitialShowResult> {
    this.showCalls += 1;
    return this.deferredShow ?? this.showResult;
  }
}

const rules: RouteInterstitialRules = {
  firstAdAfterSuccessfulSearches: 1,
  successfulSearchesBetweenAds: 1,
  minimumIntervalMs: 0,
  maximumImpressionsPer24Hours: 3,
};

function createController(gateway: FakeGateway): RouteInterstitialController {
  const policy = new RouteInterstitialPolicy(new MemoryStorage(), () => 1_000, rules);
  return new RouteInterstitialController(policy, gateway, true);
}

describe('RouteInterstitialController', () => {
  test('muestra un anuncio listo y continúa después del cierre', async () => {
    const gateway = new FakeGateway();
    const controller = createController(gateway);

    await expect(controller.maybeShowAfterSuccessfulSearch()).resolves.toBe('skipped');
    await expect(controller.maybeShowAfterSuccessfulSearch()).resolves.toBe('shown');
    expect(gateway.showCalls).toBe(1);
  });

  test('continúa y solicita precarga cuando el anuncio no está listo', async () => {
    const gateway = new FakeGateway();
    gateway.ready = false;
    const controller = createController(gateway);

    await controller.maybeShowAfterSuccessfulSearch();
    await expect(controller.maybeShowAfterSuccessfulSearch()).resolves.toBe('skipped');
    expect(gateway.showCalls).toBe(0);
    expect(gateway.preloadCalls).toBeGreaterThan(0);
  });

  test('absorbe errores de carga, incluso sin red publicitaria', async () => {
    const gateway = new FakeGateway();
    gateway.preloadError = new Error('offline');
    const controller = createController(gateway);

    await expect(controller.preload()).resolves.toBeUndefined();
  });

  test('continúa si el anuncio falla al mostrarse', async () => {
    const gateway = new FakeGateway();
    gateway.showResult = { outcome: 'failed', impressionRecorded: false };
    const controller = createController(gateway);

    await controller.maybeShowAfterSuccessfulSearch();
    await expect(controller.maybeShowAfterSuccessfulSearch()).resolves.toBe('failed');
  });

  test('no inicia dos anuncios simultáneos', async () => {
    const gateway = new FakeGateway();
    let closeAd: ((result: RouteInterstitialShowResult) => void) | null = null;
    gateway.deferredShow = new Promise((resolve) => {
      closeAd = resolve;
    });
    const controller = createController(gateway);

    await controller.maybeShowAfterSuccessfulSearch();
    const showing = controller.maybeShowAfterSuccessfulSearch();
    await expect(controller.maybeShowAfterSuccessfulSearch()).resolves.toBe('skipped');
    for (let turn = 0; turn < 10 && gateway.showCalls === 0; turn += 1) {
      await Promise.resolve();
    }
    expect(gateway.showCalls).toBe(1);

    const resolveClose = closeAd as ((result: RouteInterstitialShowResult) => void) | null;
    if (!resolveClose) throw new Error('No se creó el cierre diferido del anuncio');
    resolveClose({ outcome: 'closed', impressionRecorded: true });
    await expect(showing).resolves.toBe('shown');
  });

  test('no registra frecuencia ni muestra anuncios cuando están deshabilitados', async () => {
    const gateway = new FakeGateway();
    const policy = new RouteInterstitialPolicy(new MemoryStorage(), () => 1_000, rules);
    const controller = new RouteInterstitialController(policy, gateway, false);

    await expect(controller.maybeShowAfterSuccessfulSearch()).resolves.toBe('skipped');
    expect(gateway.showCalls).toBe(0);
    expect(gateway.preloadCalls).toBe(0);
  });
});
