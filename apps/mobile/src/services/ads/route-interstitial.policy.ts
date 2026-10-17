export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface RouteInterstitialRules {
  firstAdAfterSuccessfulSearches: number;
  successfulSearchesBetweenAds: number;
  minimumIntervalMs: number;
  maximumImpressionsPer24Hours: number;
}

interface FrequencyState {
  version: 1;
  totalSuccessfulSearches: number;
  successfulSearchesSinceLastImpression: number;
  lastImpressionAt: number | null;
  impressionTimestamps: number[];
}

export const ROUTE_INTERSTITIAL_STORAGE_KEY = '@collectigo/ads/route-interstitial-frequency-v1';
const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_ROUTE_INTERSTITIAL_RULES: RouteInterstitialRules = {
  firstAdAfterSuccessfulSearches: 3,
  successfulSearchesBetweenAds: 3,
  minimumIntervalMs: 15 * 60 * 1000,
  maximumImpressionsPer24Hours: 3,
};

function createInitialState(): FrequencyState {
  return {
    version: 1,
    totalSuccessfulSearches: 0,
    successfulSearchesSinceLastImpression: 0,
    lastImpressionAt: null,
    impressionTimestamps: [],
  };
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function parseState(serialized: string | null): FrequencyState {
  if (!serialized) return createInitialState();
  try {
    const value = JSON.parse(serialized) as Partial<FrequencyState>;
    if (
      value.version !== 1 ||
      !isNonNegativeFiniteNumber(value.totalSuccessfulSearches) ||
      !isNonNegativeFiniteNumber(value.successfulSearchesSinceLastImpression) ||
      !Array.isArray(value.impressionTimestamps)
    ) {
      return createInitialState();
    }

    return {
      version: 1,
      totalSuccessfulSearches: value.totalSuccessfulSearches,
      successfulSearchesSinceLastImpression: value.successfulSearchesSinceLastImpression,
      lastImpressionAt: isNonNegativeFiniteNumber(value.lastImpressionAt)
        ? value.lastImpressionAt
        : null,
      impressionTimestamps: value.impressionTimestamps.filter(isNonNegativeFiniteNumber),
    };
  } catch {
    return createInitialState();
  }
}

export class RouteInterstitialPolicy {
  private state: FrequencyState | null = null;
  private sessionSuccessfulSearches = 0;
  private operation: Promise<void> = Promise.resolve();

  constructor(
    private readonly storage: KeyValueStorage,
    private readonly now: () => number = Date.now,
    private readonly rules: RouteInterstitialRules = DEFAULT_ROUTE_INTERSTITIAL_RULES,
  ) {}

  recordSuccessfulSearchAndCheckEligibility(): Promise<boolean> {
    return this.runExclusive(async () => {
      const state = await this.getState();
      const now = this.now();
      this.sessionSuccessfulSearches += 1;
      state.totalSuccessfulSearches += 1;
      state.successfulSearchesSinceLastImpression += 1;
      state.impressionTimestamps = state.impressionTimestamps.filter(
        (timestamp) => now - timestamp < DAY_MS,
      );
      await this.persist(state);

      const waitedLongEnough =
        state.lastImpressionAt === null || now - state.lastImpressionAt >= this.rules.minimumIntervalMs;

      return (
        state.totalSuccessfulSearches >= this.rules.firstAdAfterSuccessfulSearches &&
        this.sessionSuccessfulSearches > 1 &&
        state.successfulSearchesSinceLastImpression >=
          this.rules.successfulSearchesBetweenAds &&
        waitedLongEnough &&
        state.impressionTimestamps.length < this.rules.maximumImpressionsPer24Hours
      );
    });
  }

  recordImpression(): Promise<void> {
    return this.runExclusive(async () => {
      const state = await this.getState();
      const now = this.now();
      state.lastImpressionAt = now;
      state.successfulSearchesSinceLastImpression = 0;
      state.impressionTimestamps = state.impressionTimestamps
        .filter((timestamp) => now - timestamp < DAY_MS)
        .concat(now);
      await this.persist(state);
    });
  }

  private runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const result = this.operation.then(task, task);
    this.operation = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async getState(): Promise<FrequencyState> {
    if (this.state) return this.state;
    try {
      this.state = parseState(await this.storage.getItem(ROUTE_INTERSTITIAL_STORAGE_KEY));
    } catch {
      this.state = createInitialState();
    }
    return this.state;
  }

  private async persist(state: FrequencyState): Promise<void> {
    try {
      await this.storage.setItem(ROUTE_INTERSTITIAL_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // La frecuencia sigue protegida en memoria aunque AsyncStorage no esté disponible.
    }
  }
}
