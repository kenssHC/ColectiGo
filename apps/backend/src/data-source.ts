import 'dotenv/config';
import { DataSource } from 'typeorm';
import { UserEntity } from './modules/users/entities/user.entity';
import { RouteEntity } from './modules/routes/entities/route.entity';
import { RouteSuggestion } from './modules/routes/entities/route-suggestion.entity';
import { CompanyEntity } from './modules/routes/entities/company.entity';
import { FleetEntity } from './modules/routes/entities/fleet.entity';
import { RoutePathEntity } from './modules/routes/entities/route-path.entity';

/** DataSource para la CLI de TypeORM (migraciones y seeds). */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'collectigo',
  entities: [UserEntity, RouteEntity, RouteSuggestion, CompanyEntity, FleetEntity, RoutePathEntity],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
