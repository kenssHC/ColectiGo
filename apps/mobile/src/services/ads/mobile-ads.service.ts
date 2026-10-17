import mobileAds, {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  MaxAdContentRating,
} from 'react-native-google-mobile-ads';
import { adsConfig } from './ads.config';

class MobileAdsService {
  private initialization: Promise<boolean> | null = null;

  initialize(): Promise<boolean> {
    if (!adsConfig.enabled) return Promise.resolve(false);
    this.initialization ??= this.initializeOnce();
    return this.initialization;
  }

  async isPrivacyOptionsRequired(): Promise<boolean> {
    if (!adsConfig.enabled) return false;
    await this.initialize();
    try {
      const consentInfo = await AdsConsent.getConsentInfo();
      return (
        consentInfo.privacyOptionsRequirementStatus ===
        AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
      );
    } catch {
      return false;
    }
  }

  async showPrivacyOptions(): Promise<boolean> {
    if (!(await this.isPrivacyOptionsRequired())) return false;
    try {
      await AdsConsent.showPrivacyOptionsForm();
      return true;
    } catch (error) {
      this.warn('No se pudieron abrir las opciones de privacidad de anuncios.', error);
      return false;
    }
  }

  private async initializeOnce(): Promise<boolean> {
    try {
      let canRequestAds = false;
      try {
        const consentInfo = await AdsConsent.gatherConsent();
        canRequestAds = consentInfo.canRequestAds;
      } catch (error) {
        this.warn('No se pudo actualizar el consentimiento de anuncios.', error);
        const previousConsent = await AdsConsent.getConsentInfo().catch(() => null);
        canRequestAds = previousConsent?.canRequestAds ?? false;
      }

      if (!canRequestAds) return false;

      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.PG,
      });
      await mobileAds().initialize();
      return true;
    } catch (error) {
      this.warn('Google Mobile Ads no pudo inicializarse; las rutas seguirán sin anuncios.', error);
      return false;
    }
  }

  private warn(message: string, error: unknown): void {
    // eslint-disable-next-line no-console
    if (__DEV__) console.warn(`[ColectiGO] ${message}`, error);
  }
}

export const mobileAdsService = new MobileAdsService();
