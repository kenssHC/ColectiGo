const REQUIRED_VARS = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];

/**
 * Falla al arrancar (en vez de en el primer request) si faltan variables críticas.
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const missing = REQUIRED_VARS.filter((key) => {
    const value = config[key];
    return value === undefined || value === null || String(value).trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno requeridas: ${missing.join(', ')}. ` +
        'Copia apps/backend/.env.example a apps/backend/.env y completa las credenciales de Firebase.',
    );
  }

  const port = config.PORT;
  if (port !== undefined && Number.isNaN(parseInt(String(port), 10))) {
    throw new Error(`PORT debe ser un número, se recibió: ${String(port)}`);
  }

  return config;
}
