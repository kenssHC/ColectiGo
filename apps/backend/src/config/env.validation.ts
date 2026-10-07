const REQUIRED_VARS = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
];

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
      ? [
          ...REQUIRED_VARS,
          'SMTP_HOST',
          'SMTP_PORT',
          'SMTP_FROM',
          'ROUTE_SUGGESTIONS_EMAIL',
        ]
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

  if (
    config.SMTP_SECURE !== undefined &&
    !['true', 'false'].includes(envString(config.SMTP_SECURE).toLowerCase())
  ) {
    throw new Error('SMTP_SECURE debe ser true o false');
  }

  const hasSmtpUser = envString(config.SMTP_USER).trim() !== '';
  const hasSmtpPassword = envString(config.SMTP_PASSWORD).trim() !== '';
  if (hasSmtpUser !== hasSmtpPassword) {
    throw new Error('SMTP_USER y SMTP_PASSWORD deben configurarse juntos');
  }

  return config;
}
