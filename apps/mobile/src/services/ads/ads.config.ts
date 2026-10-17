export const adsConfig = {
  enabled: process.env.EXPO_PUBLIC_ADS_ENABLED !== 'false',
  /** Bloqueo deliberado: esta implementación no admite IDs publicitarios reales. */
  testMode: true,
  requestNonPersonalizedAdsOnly: true,
} as const;
