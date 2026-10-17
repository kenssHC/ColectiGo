/** @param {import('expo/config').ConfigContext} context */
module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';
  const googleIosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME?.trim() ?? '';
  // IDs de aplicación oficiales de Google para pruebas. No generan ingresos ni
  // deben sustituirse por IDs reales hasta completar la revisión de privacidad.
  const googleMobileAdsTestAppId = {
    android: 'ca-app-pub-3940256099942544~3347511713',
    ios: 'ca-app-pub-3940256099942544~1458002511',
  };

  if (!googleMapsApiKey) {
    console.warn(
      '[ColectiGO] GOOGLE_MAPS_API_KEY no está disponible durante esta evaluación. ' +
        'Si está guardada como variable Sensitive/Secret de EAS, se inyectará en el builder; ' +
        'para builds locales, defínela en apps/mobile/.env.',
    );
  }

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      [
        'expo-build-properties',
        {
          android: {
            extraProguardRules: '-keep class com.google.android.gms.internal.consent_sdk.** { *; }',
          },
        },
      ],
      [
        'react-native-google-mobile-ads',
        {
          androidSdk: 'classic',
          androidAppId: googleMobileAdsTestAppId.android,
          iosAppId: googleMobileAdsTestAppId.ios,
          delayAppMeasurementInit: true,
          optimizeInitialization: true,
          optimizeAdLoading: true,
        },
      ],
      ...(googleIosUrlScheme
        ? [
            [
              'react-native-nitro-google-signin',
              {
                iosUrlScheme: googleIosUrlScheme,
              },
            ],
          ]
        : []),
      [
        'react-native-maps',
        {
          androidGoogleMapsApiKey: googleMapsApiKey,
        },
      ],
    ],
  };
};
