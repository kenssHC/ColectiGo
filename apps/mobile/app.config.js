/** @param {import('expo/config').ConfigContext} context */
module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';

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
        'react-native-maps',
        {
          androidGoogleMapsApiKey: googleMapsApiKey,
        },
      ],
    ],
  };
};
