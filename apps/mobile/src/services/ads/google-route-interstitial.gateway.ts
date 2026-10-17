import {
  AdEventType,
  InterstitialAd,
  TestIds,
} from 'react-native-google-mobile-ads';
import { adsConfig } from './ads.config';
import { mobileAdsService } from './mobile-ads.service';
import type {
  RouteInterstitialGateway,
  RouteInterstitialShowResult,
} from './route-interstitial.controller';

type GatewayState = 'idle' | 'initializing' | 'loading' | 'loaded' | 'showing';

export class GoogleRouteInterstitialGateway implements RouteInterstitialGateway {
  private state: GatewayState = 'idle';
  private ad: InterstitialAd | null = null;
  private unsubscribeListeners: Array<() => void> = [];
  private pendingShow: ((result: RouteInterstitialShowResult) => void) | null = null;
  private impressionRecorded = false;

  isReady(): boolean {
    return this.state === 'loaded' && this.ad !== null;
  }

  async preload(): Promise<void> {
    if (this.state !== 'idle') return;
    this.state = 'initializing';

    if (!(await mobileAdsService.initialize())) {
      this.state = 'idle';
      return;
    }

    this.disposeAd();
    const ad = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL, {
      requestNonPersonalizedAdsOnly: adsConfig.requestNonPersonalizedAdsOnly,
    });
    this.ad = ad;
    this.state = 'loading';
    this.impressionRecorded = false;

    this.unsubscribeListeners = [
      ad.addAdEventListener(AdEventType.LOADED, () => {
        if (this.ad === ad) this.state = 'loaded';
      }),
      ad.addAdEventListener(AdEventType.OPENED, () => {
        if (this.ad === ad) this.state = 'showing';
      }),
      ad.addAdEventListener(AdEventType.IMPRESSION, () => {
        if (this.ad === ad) this.impressionRecorded = true;
      }),
      ad.addAdEventListener(AdEventType.CLOSED, () => {
        if (this.ad === ad) this.finishShow('closed');
      }),
      ad.addAdEventListener(AdEventType.ERROR, (error) => {
        if (this.ad !== ad) return;
        this.handleError(error);
      }),
    ];

    try {
      ad.load();
    } catch (error) {
      this.warn('El interstitial de prueba no pudo comenzar a cargar.', error);
      this.disposeAd();
    }
  }

  show(): Promise<RouteInterstitialShowResult> {
    if (!this.isReady() || !this.ad) {
      return Promise.resolve({ outcome: 'failed', impressionRecorded: false });
    }

    this.state = 'showing';
    return new Promise((resolve) => {
      this.pendingShow = resolve;
      try {
        void this.ad?.show().catch((error: unknown) => {
          this.warn('El interstitial de prueba no pudo mostrarse.', error);
          this.finishShow('failed');
        });
      } catch (error) {
        this.warn('El interstitial de prueba no pudo mostrarse.', error);
        this.finishShow('failed');
      }
    });
  }

  private handleError(error: unknown): void {
    const adError = error as { phase?: string; reason?: string };
    const isRoutineNoFill =
      adError.phase === 'load' &&
      (adError.reason === 'no-fill' || adError.reason === 'mediation-no-fill');
    if (!isRoutineNoFill) this.warn('Google Mobile Ads devolvió un error.', error);

    if (this.pendingShow) {
      this.finishShow('failed');
    } else {
      this.disposeAd();
    }
  }

  private finishShow(outcome: RouteInterstitialShowResult['outcome']): void {
    const resolve = this.pendingShow;
    const result = { outcome, impressionRecorded: this.impressionRecorded };
    this.pendingShow = null;
    this.disposeAd();
    resolve?.(result);
  }

  private disposeAd(): void {
    for (const unsubscribe of this.unsubscribeListeners) unsubscribe();
    this.unsubscribeListeners = [];
    this.ad?.destroy();
    this.ad = null;
    this.state = 'idle';
    this.impressionRecorded = false;
  }

  private warn(message: string, error: unknown): void {
    // eslint-disable-next-line no-console
    if (__DEV__) console.warn(`[ColectiGO] ${message}`, error);
  }
}
