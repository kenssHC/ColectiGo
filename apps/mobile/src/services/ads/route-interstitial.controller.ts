import type { RouteInterstitialPolicy } from './route-interstitial.policy';

export interface RouteInterstitialShowResult {
  outcome: 'closed' | 'failed';
  impressionRecorded: boolean;
}

export interface RouteInterstitialGateway {
  isReady(): boolean;
  preload(): Promise<void>;
  show(): Promise<RouteInterstitialShowResult>;
}

export type RouteInterstitialOutcome = 'shown' | 'skipped' | 'failed';

export class RouteInterstitialController {
  private operationInProgress = false;

  constructor(
    private readonly policy: RouteInterstitialPolicy,
    private readonly gateway: RouteInterstitialGateway,
    private readonly enabled: boolean,
  ) {}

  async preload(): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.gateway.preload();
    } catch {
      // La carga publicitaria nunca debe afectar al planificador.
    }
  }

  async maybeShowAfterSuccessfulSearch(): Promise<RouteInterstitialOutcome> {
    if (!this.enabled || this.operationInProgress) return 'skipped';
    this.operationInProgress = true;
    try {
      const eligible = await this.policy.recordSuccessfulSearchAndCheckEligibility();
      if (!eligible || !this.gateway.isReady()) {
        void this.preload();
        return 'skipped';
      }

      const result = await this.gateway.show();
      if (result.impressionRecorded) await this.policy.recordImpression();
      void this.preload();
      return result.outcome === 'closed' ? 'shown' : 'failed';
    } catch {
      void this.preload();
      return 'failed';
    } finally {
      this.operationInProgress = false;
    }
  }
}
