interface AppConfigResult {
  plugins?: Array<string | [string, Record<string, unknown>]>;
}

type AppConfigFactory = (context: { config: AppConfigResult }) => AppConfigResult;

// app.config.js debe seguir exportando CommonJS para que Expo pueda evaluarlo.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const createAppConfig = require('../app.config.js') as AppConfigFactory;

describe('configuración nativa de anuncios', () => {
  test('usa exclusivamente los App ID oficiales de prueba de Google', () => {
    const previousMapsKey = process.env.GOOGLE_MAPS_API_KEY;
    process.env.GOOGLE_MAPS_API_KEY = 'test-only-map-key';
    const config = createAppConfig({ config: { plugins: [] } });
    if (previousMapsKey === undefined) delete process.env.GOOGLE_MAPS_API_KEY;
    else process.env.GOOGLE_MAPS_API_KEY = previousMapsKey;

    const plugin = config.plugins?.find(
      (entry): entry is [string, Record<string, unknown>] =>
        Array.isArray(entry) && entry[0] === 'react-native-google-mobile-ads',
    );

    expect(plugin?.[1]).toMatchObject({
      androidAppId: 'ca-app-pub-3940256099942544~3347511713',
      iosAppId: 'ca-app-pub-3940256099942544~1458002511',
      delayAppMeasurementInit: true,
    });
  });
});
