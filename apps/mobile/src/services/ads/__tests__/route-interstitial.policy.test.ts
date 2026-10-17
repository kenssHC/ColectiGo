import {
  RouteInterstitialPolicy,
  type KeyValueStorage,
  type RouteInterstitialRules,
} from '../route-interstitial.policy';

class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }
}

const permissiveRules: RouteInterstitialRules = {
  firstAdAfterSuccessfulSearches: 1,
  successfulSearchesBetweenAds: 1,
  minimumIntervalMs: 0,
  maximumImpressionsPer24Hours: 3,
};

describe('RouteInterstitialPolicy', () => {
  test('deja libres las dos primeras búsquedas y habilita la tercera', async () => {
    const policy = new RouteInterstitialPolicy(new MemoryStorage(), () => 1_000);

    await expect(policy.recordSuccessfulSearchAndCheckEligibility()).resolves.toBe(false);
    await expect(policy.recordSuccessfulSearchAndCheckEligibility()).resolves.toBe(false);
    await expect(policy.recordSuccessfulSearchAndCheckEligibility()).resolves.toBe(true);
  });

  test('exige tres búsquedas y quince minutos después de una impresión', async () => {
    let now = 1_000;
    const policy = new RouteInterstitialPolicy(new MemoryStorage(), () => now);

    await policy.recordSuccessfulSearchAndCheckEligibility();
    await policy.recordSuccessfulSearchAndCheckEligibility();
    await policy.recordSuccessfulSearchAndCheckEligibility();
    await policy.recordImpression();

    await expect(policy.recordSuccessfulSearchAndCheckEligibility()).resolves.toBe(false);
    await expect(policy.recordSuccessfulSearchAndCheckEligibility()).resolves.toBe(false);
    await expect(policy.recordSuccessfulSearchAndCheckEligibility()).resolves.toBe(false);

    now += 15 * 60 * 1000;
    await expect(policy.recordSuccessfulSearchAndCheckEligibility()).resolves.toBe(true);
  });

  test('limita las impresiones a tres por cada 24 horas', async () => {
    let now = 1_000;
    const policy = new RouteInterstitialPolicy(
      new MemoryStorage(),
      () => now,
      permissiveRules,
    );

    await policy.recordSuccessfulSearchAndCheckEligibility();
    for (let impression = 0; impression < 3; impression += 1) {
      await expect(policy.recordSuccessfulSearchAndCheckEligibility()).resolves.toBe(true);
      await policy.recordImpression();
      now += 1;
    }

    await expect(policy.recordSuccessfulSearchAndCheckEligibility()).resolves.toBe(false);
  });

  test('no muestra un anuncio en la primera búsqueda de una nueva sesión', async () => {
    const storage = new MemoryStorage();
    const firstSession = new RouteInterstitialPolicy(storage, () => 1_000, permissiveRules);
    await firstSession.recordSuccessfulSearchAndCheckEligibility();
    await firstSession.recordSuccessfulSearchAndCheckEligibility();
    await firstSession.recordImpression();

    const secondSession = new RouteInterstitialPolicy(storage, () => 2_000, permissiveRules);
    await expect(secondSession.recordSuccessfulSearchAndCheckEligibility()).resolves.toBe(false);
    await expect(secondSession.recordSuccessfulSearchAndCheckEligibility()).resolves.toBe(true);
  });

  test('mantiene la protección en memoria si el almacenamiento falla', async () => {
    const failingStorage: KeyValueStorage = {
      getItem: () => Promise.reject(new Error('offline')),
      setItem: () => Promise.reject(new Error('offline')),
    };
    const policy = new RouteInterstitialPolicy(failingStorage, () => 1_000);

    await expect(policy.recordSuccessfulSearchAndCheckEligibility()).resolves.toBe(false);
    await expect(policy.recordSuccessfulSearchAndCheckEligibility()).resolves.toBe(false);
    await expect(policy.recordSuccessfulSearchAndCheckEligibility()).resolves.toBe(true);
  });
});
