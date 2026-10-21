import { createDatabaseConnectionSettings } from './database-connection';

describe('createDatabaseConnectionSettings', () => {
  it('mantiene la conexión local sin TLS por defecto', () => {
    const config = createDatabaseConnectionSettings({});

    expect(config).toMatchObject({
      url: '',
      host: 'localhost',
      port: 5432,
      poolSize: 10,
      ssl: false,
    });
  });

  it('admite una URL y valida el certificado del proveedor', () => {
    const config = createDatabaseConnectionSettings({
      DATABASE_URL: 'postgresql://user:secret@db.example.com:5432/collectigo',
      DATABASE_SSL: 'true',
      DATABASE_SSL_CA: 'BEGIN\\nCERTIFICATE\\nEND',
    });

    expect(config.url).toContain('db.example.com');
    expect(config.ssl).toEqual({
      rejectUnauthorized: true,
      ca: 'BEGIN\nCERTIFICATE\nEND',
    });
  });

  it('prioriza el socket Unix de Cloud SQL sobre el host TCP', () => {
    const config = createDatabaseConnectionSettings({
      DATABASE_SOCKET: '/cloudsql/collectigo:southamerica-west1:collectigo-db',
      DATABASE_HOST: 'ignored.example.com',
    });

    expect(config.host).toBe(
      '/cloudsql/collectigo:southamerica-west1:collectigo-db',
    );
    expect(config.ssl).toBe(false);
  });

  it('permite limitar explícitamente el pool de PostgreSQL', () => {
    const config = createDatabaseConnectionSettings({
      DATABASE_POOL_SIZE: '4',
    });

    expect(config.poolSize).toBe(4);
  });

  it('rechaza un tamaño de pool inválido', () => {
    expect(() =>
      createDatabaseConnectionSettings({ DATABASE_POOL_SIZE: '0' }),
    ).toThrow('DATABASE_POOL_SIZE debe estar entre 1 y 100');
  });
});
