import { AppDataSource } from './data-source';

async function migrate(): Promise<void> {
  await AppDataSource.initialize();

  try {
    const migrations = await AppDataSource.runMigrations({
      transaction: 'all',
    });
    console.log(`Migraciones aplicadas: ${migrations.length}`);
  } finally {
    await AppDataSource.destroy();
  }
}

migrate().catch((error: unknown) => {
  console.error('No se pudieron aplicar las migraciones', error);
  process.exitCode = 1;
});
