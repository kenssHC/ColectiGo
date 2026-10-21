import { validateEnv } from './env.validation';

const firebaseConfig = {
  FIREBASE_PROJECT_ID: 'collectigo-test',
  FIREBASE_CLIENT_EMAIL: 'firebase@example.test',
  FIREBASE_PRIVATE_KEY: 'private-key',
};

const productionConfig = {
  ...firebaseConfig,
  NODE_ENV: 'production',
  DATABASE_URL:
    'postgresql://collectigo:secret@database.internal:5432/collectigo',
  DATABASE_SSL: 'false',
  DATABASE_POOL_SIZE: '4',
  GOOGLE_AUTH_WEB_CLIENT_ID: 'client.apps.googleusercontent.com',
  CORS_ORIGINS: 'https://collectigo.example',
  WALK_ROUTING_PROVIDER: 'google',
  GOOGLE_ROUTES_API_KEY: 'routes-key',
  SMTP_HOST: 'smtp.example.test',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_REQUIRE_TLS: 'true',
  SMTP_USER: 'smtp-user',
  SMTP_PASSWORD: 'smtp-password',
  SMTP_FROM: 'ColectiGO <no-reply@collectigo.example>',
  ROUTE_SUGGESTIONS_EMAIL: 'soporte@collectigo.example',
};

describe('validateEnv', () => {
  it('acepta la configuración mínima de desarrollo', () => {
    expect(validateEnv({ ...firebaseConfig })).toEqual(firebaseConfig);
  });

  it('rechaza CORS abierto en producción', () => {
    expect(() =>
      validateEnv({ ...productionConfig, CORS_ORIGINS: '*' }),
    ).toThrow('CORS_ORIGINS no puede contener * en producción');
  });

  it('rechaza el OSRM público en producción', () => {
    expect(() =>
      validateEnv({
        ...productionConfig,
        WALK_ROUTING_PROVIDER: 'osrm',
        WALK_ROUTING_URL: 'https://routing.openstreetmap.de/routed-foot',
      }),
    ).toThrow('El servidor OSRM público solo puede utilizarse en desarrollo');
  });

  it('exige Routes API cuando Google calcula las caminatas', () => {
    expect(() =>
      validateEnv({ ...productionConfig, GOOGLE_ROUTES_API_KEY: '' }),
    ).toThrow(
      'GOOGLE_ROUTES_API_KEY es requerida para el ruteo peatonal de Google',
    );
  });

  it('exige TLS para el correo de producción', () => {
    expect(() =>
      validateEnv({ ...productionConfig, SMTP_REQUIRE_TLS: 'false' }),
    ).toThrow('SMTP_REQUIRE_TLS debe ser true en producción');
  });

  it('acepta campos individuales cuando no se proporciona DATABASE_URL', () => {
    const withoutUrl = Object.fromEntries(
      Object.entries(productionConfig).filter(
        ([key]) => key !== 'DATABASE_URL',
      ),
    );
    expect(
      validateEnv({
        ...withoutUrl,
        DATABASE_HOST: 'database.internal',
        DATABASE_PORT: '5432',
        DATABASE_USER: 'collectigo',
        DATABASE_PASSWORD: 'secret',
        DATABASE_NAME: 'collectigo',
      }),
    ).toBeDefined();
  });

  it('acepta el socket Unix de Cloud SQL en lugar de un host', () => {
    const withoutUrl = Object.fromEntries(
      Object.entries(productionConfig).filter(
        ([key]) => key !== 'DATABASE_URL',
      ),
    );

    expect(
      validateEnv({
        ...withoutUrl,
        DATABASE_SOCKET:
          '/cloudsql/collectigo:southamerica-west1:collectigo-db',
        DATABASE_PORT: '5432',
        DATABASE_USER: 'collectigo',
        DATABASE_PASSWORD: 'secret',
        DATABASE_NAME: 'collectigo',
      }),
    ).toBeDefined();
  });

  it('rechaza conexiones TLS inseguras en producción', () => {
    expect(() =>
      validateEnv({
        ...productionConfig,
        DATABASE_SSL: 'true',
        DATABASE_SSL_REJECT_UNAUTHORIZED: 'false',
      }),
    ).toThrow('DATABASE_SSL_REJECT_UNAUTHORIZED no puede ser false');
  });

  it('rechaza un pool de base de datos inválido', () => {
    expect(() =>
      validateEnv({ ...productionConfig, DATABASE_POOL_SIZE: '0' }),
    ).toThrow('DATABASE_POOL_SIZE debe ser un entero entre 1 y 100');
  });

  it('acepta una configuración de producción con Google Routes', () => {
    expect(validateEnv({ ...productionConfig })).toEqual(productionConfig);
  });
});
