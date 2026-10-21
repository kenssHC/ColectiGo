export interface DatabaseTlsOptions {
  rejectUnauthorized: boolean;
  ca?: string;
}

export interface DatabaseConnectionSettings {
  url: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  poolSize: number;
  ssl: false | DatabaseTlsOptions;
}

function isEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

function parsePoolSize(value: string | undefined): number {
  const configured = value?.trim() || '10';
  if (!/^\d+$/.test(configured)) {
    throw new Error('DATABASE_POOL_SIZE debe ser un entero positivo');
  }
  const poolSize = Number(configured);
  if (poolSize < 1 || poolSize > 100) {
    throw new Error('DATABASE_POOL_SIZE debe estar entre 1 y 100');
  }
  return poolSize;
}

/**
 * Configuración compartida por Nest y la CLI de TypeORM.
 * DATABASE_URL tiene prioridad sobre los campos DATABASE_* individuales.
 */
export function createDatabaseConnectionSettings(
  environment: NodeJS.ProcessEnv = process.env,
): DatabaseConnectionSettings {
  const sslEnabled = isEnabled(environment.DATABASE_SSL);
  const unixSocket = environment.DATABASE_SOCKET?.trim();
  const certificateAuthority = environment.DATABASE_SSL_CA?.replace(
    /\\n/g,
    '\n',
  ).trim();

  return {
    url: environment.DATABASE_URL?.trim() ?? '',
    // Cloud Run mounts Cloud SQL as a Unix socket under /cloudsql. `pg`
    // accepts that directory in `host` and appends `.s.PGSQL.<port>`.
    host: unixSocket || environment.DATABASE_HOST || 'localhost',
    port: parseInt(environment.DATABASE_PORT ?? '5432', 10),
    username: environment.DATABASE_USER ?? 'postgres',
    password: environment.DATABASE_PASSWORD ?? 'postgres',
    database: environment.DATABASE_NAME ?? 'collectigo',
    poolSize: parsePoolSize(environment.DATABASE_POOL_SIZE),
    ssl: sslEnabled
      ? {
          rejectUnauthorized:
            environment.DATABASE_SSL_REJECT_UNAUTHORIZED?.trim().toLowerCase() !==
            'false',
          ...(certificateAuthority ? { ca: certificateAuthority } : {}),
        }
      : false,
  };
}
