const REQUIRED_VARS = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
];

const PRODUCTION_REQUIRED_VARS = [
  'DATABASE_SSL',
  'DATABASE_POOL_SIZE',
  'GOOGLE_AUTH_WEB_CLIENT_ID',
  'CORS_ORIGINS',
  'WALK_ROUTING_PROVIDER',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM',
  'ROUTE_SUGGESTIONS_EMAIL',
];

const WALK_ROUTING_PROVIDERS = new Set(['osrm', 'google', 'none']);
const BOOLEAN_VALUES = new Set(['true', 'false']);
const DATABASE_REQUIRED_COMPONENT_VARS = [
  'DATABASE_PORT',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
  'DATABASE_NAME',
] as const;
const PUBLIC_DEVELOPMENT_ROUTING_HOSTS = new Set([
  'routing.openstreetmap.de',
  'router.project-osrm.org',
]);

function envString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return `${value}`;
  return '';
}

/**
 * Falla al arrancar (en vez de en el primer request) si faltan variables críticas.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const requiredVars =
    config.NODE_ENV === 'production'
      ? [...REQUIRED_VARS, ...PRODUCTION_REQUIRED_VARS]
      : REQUIRED_VARS;
  const missing = requiredVars.filter((key) => {
    const value = config[key];
    return (
      value === undefined || value === null || envString(value).trim() === ''
    );
  });

  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno requeridas: ${missing.join(', ')}. ` +
        'Copia apps/backend/.env.example a apps/backend/.env y completa las credenciales de Firebase.',
    );
  }

  if (
    config.NODE_ENV === 'production' &&
    !envString(config.DATABASE_URL).trim()
  ) {
    const missingDatabaseComponents: string[] =
      DATABASE_REQUIRED_COMPONENT_VARS.filter(
        (key) => !envString(config[key]).trim(),
      );
    if (
      !envString(config.DATABASE_HOST).trim() &&
      !envString(config.DATABASE_SOCKET).trim()
    ) {
      missingDatabaseComponents.unshift('DATABASE_HOST o DATABASE_SOCKET');
    }
    if (missingDatabaseComponents.length > 0) {
      throw new Error(
        'Configura DATABASE_URL o todos los campos de conexión: ' +
          missingDatabaseComponents.join(', '),
      );
    }
  }

  const databaseUrl = envString(config.DATABASE_URL).trim();
  if (databaseUrl) {
    let parsedDatabaseUrl: URL;
    try {
      parsedDatabaseUrl = new URL(databaseUrl);
    } catch {
      throw new Error('DATABASE_URL debe ser una URL válida de PostgreSQL');
    }
    if (!['postgres:', 'postgresql:'].includes(parsedDatabaseUrl.protocol)) {
      throw new Error(
        'DATABASE_URL debe usar el protocolo postgres o postgresql',
      );
    }
  }

  const port = config.PORT;
  if (port !== undefined && Number.isNaN(parseInt(envString(port), 10))) {
    throw new Error(`PORT debe ser un número, se recibió: ${envString(port)}`);
  }

  const smtpPort = config.SMTP_PORT;
  if (
    smtpPort !== undefined &&
    Number.isNaN(parseInt(envString(smtpPort), 10))
  ) {
    throw new Error(
      `SMTP_PORT debe ser un número, se recibió: ${envString(smtpPort)}`,
    );
  }

  const databasePoolSize = envString(config.DATABASE_POOL_SIZE).trim();
  if (
    databasePoolSize &&
    (!/^\d+$/.test(databasePoolSize) ||
      Number(databasePoolSize) < 1 ||
      Number(databasePoolSize) > 100)
  ) {
    throw new Error('DATABASE_POOL_SIZE debe ser un entero entre 1 y 100');
  }

  for (const key of ['DATABASE_SSL', 'DATABASE_SSL_REJECT_UNAUTHORIZED']) {
    if (
      config[key] !== undefined &&
      !BOOLEAN_VALUES.has(envString(config[key]).trim().toLowerCase())
    ) {
      throw new Error(`${key} debe ser true o false`);
    }
  }

  const databaseSslEnabled =
    envString(config.DATABASE_SSL).trim().toLowerCase() === 'true';
  if (envString(config.DATABASE_SSL_CA).trim() && !databaseSslEnabled) {
    throw new Error('DATABASE_SSL_CA requiere DATABASE_SSL=true');
  }

  if (
    config.SMTP_SECURE !== undefined &&
    !['true', 'false'].includes(envString(config.SMTP_SECURE).toLowerCase())
  ) {
    throw new Error('SMTP_SECURE debe ser true o false');
  }

  if (
    config.SMTP_REQUIRE_TLS !== undefined &&
    !['true', 'false'].includes(
      envString(config.SMTP_REQUIRE_TLS).toLowerCase(),
    )
  ) {
    throw new Error('SMTP_REQUIRE_TLS debe ser true o false');
  }

  const hasSmtpUser = envString(config.SMTP_USER).trim() !== '';
  const hasSmtpPassword = envString(config.SMTP_PASSWORD).trim() !== '';
  if (hasSmtpUser !== hasSmtpPassword) {
    throw new Error('SMTP_USER y SMTP_PASSWORD deben configurarse juntos');
  }

  const walkProvider = envString(config.WALK_ROUTING_PROVIDER)
    .trim()
    .toLowerCase();
  if (walkProvider && !WALK_ROUTING_PROVIDERS.has(walkProvider)) {
    throw new Error('WALK_ROUTING_PROVIDER debe ser osrm, google o none');
  }

  if (config.NODE_ENV === 'production') {
    if (
      databaseSslEnabled &&
      envString(config.DATABASE_SSL_REJECT_UNAUTHORIZED)
        .trim()
        .toLowerCase() === 'false'
    ) {
      throw new Error(
        'DATABASE_SSL_REJECT_UNAUTHORIZED no puede ser false en producción',
      );
    }
    const corsOrigins = envString(config.CORS_ORIGINS)
      .split(',')
      .map((origin) => origin.trim());
    if (corsOrigins.includes('*')) {
      throw new Error('CORS_ORIGINS no puede contener * en producción');
    }
    if (envString(config.SMTP_REQUIRE_TLS).toLowerCase() !== 'true') {
      throw new Error('SMTP_REQUIRE_TLS debe ser true en producción');
    }
    if (walkProvider === 'none') {
      throw new Error('WALK_ROUTING_PROVIDER no puede ser none en producción');
    }
    if (walkProvider === 'google') {
      if (!envString(config.GOOGLE_ROUTES_API_KEY).trim()) {
        throw new Error(
          'GOOGLE_ROUTES_API_KEY es requerida para el ruteo peatonal de Google',
        );
      }
    }
    if (walkProvider === 'osrm') {
      const walkRoutingUrl = envString(config.WALK_ROUTING_URL).trim();
      if (!walkRoutingUrl) {
        throw new Error(
          'WALK_ROUTING_URL es requerida para el proveedor OSRM en producción',
        );
      }
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(walkRoutingUrl);
      } catch {
        throw new Error('WALK_ROUTING_URL debe ser una URL válida');
      }
      if (parsedUrl.protocol !== 'https:') {
        throw new Error('WALK_ROUTING_URL debe usar HTTPS en producción');
      }
      if (PUBLIC_DEVELOPMENT_ROUTING_HOSTS.has(parsedUrl.hostname)) {
        throw new Error(
          'El servidor OSRM público solo puede utilizarse en desarrollo',
        );
      }
    }
  }

  return config;
}
