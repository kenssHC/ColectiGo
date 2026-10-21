import 'dotenv/config';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { UserEntity } from './modules/users/entities/user.entity';
import { RouteEntity } from './modules/routes/entities/route.entity';
import { RouteSuggestion } from './modules/routes/entities/route-suggestion.entity';
import { CompanyEntity } from './modules/routes/entities/company.entity';
import { FleetEntity } from './modules/routes/entities/fleet.entity';
import { RoutePathEntity } from './modules/routes/entities/route-path.entity';
import { AuthIdentityEntity } from './modules/auth/entities/auth-identity.entity';
import { createDatabaseConnectionSettings } from './config/database-connection';

const database = createDatabaseConnectionSettings();

/** DataSource para la CLI de TypeORM (migraciones y seeds). */
export const AppDataSource = new DataSource({
  type: 'postgres',
  ...(database.url
    ? { url: database.url }
    : {
        host: database.host,
        port: database.port,
        username: database.username,
        password: database.password,
        database: database.database,
      }),
  ssl: database.ssl,
  poolSize: database.poolSize,
  entities: [
    UserEntity,
    AuthIdentityEntity,
    RouteEntity,
    RouteSuggestion,
    CompanyEntity,
    FleetEntity,
    RoutePathEntity,
  ],
  // Works with ts-node locally and with compiled JavaScript in Cloud Run.
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
  synchronize: false,
});
