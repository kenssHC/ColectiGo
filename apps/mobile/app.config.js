function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value ?? '');
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function validateProductionLegalConfig() {
  if (process.env.EXPO_PUBLIC_APP_ENV !== 'production') return;

  const missingOrInvalid = [];
  if (!process.env.EXPO_PUBLIC_LEGAL_RESPONSIBLE_NAME?.trim()) {
    missingOrInvalid.push('EXPO_PUBLIC_LEGAL_RESPONSIBLE_NAME');
  }
  if (!isEmail(process.env.EXPO_PUBLIC_PRIVACY_EMAIL)) {
    missingOrInvalid.push('EXPO_PUBLIC_PRIVACY_EMAIL');
  }
  if (!isEmail(process.env.EXPO_PUBLIC_SUPPORT_EMAIL)) {
    missingOrInvalid.push('EXPO_PUBLIC_SUPPORT_EMAIL');
  }
  if (!isHttpsUrl(process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL)) {
    missingOrInvalid.push('EXPO_PUBLIC_PRIVACY_POLICY_URL (HTTPS)');
  }
  if (!isHttpsUrl(process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL)) {
    missingOrInvalid.push('EXPO_PUBLIC_ACCOUNT_DELETION_URL (HTTPS)');
  }

  if (missingOrInvalid.length > 0) {
    throw new Error(
      `[ColectiGO] Configuración legal de producción incompleta: ${missingOrInvalid.join(', ')}.`,
    );
  }
}

/** @param {import('expo/config').ConfigContext} context */
module.exports = ({ config }) => {
  validateProductionLegalConfig();
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON?.trim() || './google-services.json';
  const googleIosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME?.trim() ?? '';

  if (!googleMapsApiKey) {
    console.warn(
      '[ColectiGO] GOOGLE_MAPS_API_KEY no está disponible durante esta evaluación. ' +
        'Si está guardada como variable Sensitive/Secret de EAS, se inyectará en el builder; ' +
        'para builds locales, defínela en apps/mobile/.env.',
    );
  }

  return {
    ...config,
    android: {
      ...config.android,
      googleServicesFile,
    },
    plugins: [
      ...(config.plugins ?? []),
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
