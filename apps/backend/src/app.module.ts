import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { appConfig, databaseConfig, firebaseConfig, plannerConfig } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { AppController } from './app.controller';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RoutesModule } from './modules/routes/routes.module';
import { PlannerModule } from './modules/planner/planner.module';
import { UserEntity } from './modules/users/entities/user.entity';
import { RouteEntity } from './modules/routes/entities/route.entity';
import { RouteSuggestion } from './modules/routes/entities/route-suggestion.entity';
import { CompanyEntity } from './modules/routes/entities/company.entity';
import { FleetEntity } from './modules/routes/entities/fleet.entity';
import { RoutePathEntity } from './modules/routes/entities/route-path.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, firebaseConfig, plannerConfig],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        entities: [
          UserEntity,
          RouteEntity,
          RouteSuggestion,
          CompanyEntity,
          FleetEntity,
          RoutePathEntity,
        ],
        // El esquema se gestiona con migraciones: pnpm --filter backend migration:run
        synchronize: false,
        logging: config.get<string>('app.nodeEnv') === 'development',
      }),
    }),
    AuthModule,
    UsersModule,
    RoutesModule,
    PlannerModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Sintaxis de comodín de path-to-regexp v8 (Express 5 / Nest 11).
    consumer.apply(RequestIdMiddleware).forRoutes('{*path}');
  }
}
