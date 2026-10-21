interface AppConfigResult {
  plugins?: Array<string | [string, Record<string, unknown>]>;
}

type AppConfigFactory = (context: { config: AppConfigResult }) => AppConfigResult;

// app.config.js debe seguir exportando CommonJS para que Expo pueda evaluarlo.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const createAppConfig = require('../app.config.js') as AppConfigFactory;

const LEGAL_ENV_KEYS = [
  'EXPO_PUBLIC_APP_ENV',
  'EXPO_PUBLIC_LEGAL_RESPONSIBLE_NAME',
  'EXPO_PUBLIC_PRIVACY_EMAIL',
  'EXPO_PUBLIC_SUPPORT_EMAIL',
  'EXPO_PUBLIC_PRIVACY_POLICY_URL',
  'EXPO_PUBLIC_ACCOUNT_DELETION_URL',
  'GOOGLE_MAPS_API_KEY',
] as const;

const originalLegalEnvironment = Object.fromEntries(
  LEGAL_ENV_KEYS.map((key) => [key, process.env[key]]),
) as Record<(typeof LEGAL_ENV_KEYS)[number], string | undefined>;

afterEach(() => {
  for (const key of LEGAL_ENV_KEYS) {
    const original = originalLegalEnvironment[key];
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  }
});

describe('configuración legal de producción', () => {
  test('rechaza una build de producción sin contactos ni páginas públicas', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'production';
    for (const key of LEGAL_ENV_KEYS.slice(1)) delete process.env[key];

    expect(() => createAppConfig({ config: { plugins: [] } })).toThrow(
      'Configuración legal de producción incompleta',
    );
  });

  test('acepta los contactos públicos y las URLs HTTPS válidas', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'production';
    process.env.EXPO_PUBLIC_LEGAL_RESPONSIBLE_NAME = 'Responsable de prueba';
    process.env.EXPO_PUBLIC_PRIVACY_EMAIL = 'privacidad@example.com';
    process.env.EXPO_PUBLIC_SUPPORT_EMAIL = 'soporte@example.com';
    process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL = 'https://example.com/privacidad';
    process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL = 'https://example.com/eliminar-cuenta';
    process.env.GOOGLE_MAPS_API_KEY = 'test-only-map-key';

    expect(() => createAppConfig({ config: { plugins: [] } })).not.toThrow();
  });
});
