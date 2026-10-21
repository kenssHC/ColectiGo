type AppEnvironment = 'development' | 'preview' | 'production';

export function shouldEnableTestAds(
  environment: AppEnvironment,
  requested: string | undefined,
): boolean {
  return environment !== 'production' && requested === 'true';
}

const configuredEnvironment = process.env.EXPO_PUBLIC_APP_ENV;
const appEnvironment: AppEnvironment =
  configuredEnvironment === 'development' ||
  configuredEnvironment === 'preview' ||
  configuredEnvironment === 'production'
    ? configuredEnvironment
    : __DEV__
      ? 'development'
      : 'production';

export const adsConfig = {
  appEnvironment,
  enabled: shouldEnableTestAds(appEnvironment, process.env.EXPO_PUBLIC_ADS_ENABLED),
  /** Bloqueo deliberado: esta implementación no admite IDs publicitarios reales. */
  testMode: true,
  requestNonPersonalizedAdsOnly: true,
} as const;
