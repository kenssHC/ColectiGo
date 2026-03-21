import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { appConfig, databaseConfig, firebaseConfig, googleMapsConfig } from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RoutesModule } from './modules/routes/routes.module';
import { PlannerModule } from './modules/planner/planner.module';
import { UserEntity } from './modules/users/entities/user.entity';
import { RouteEntity } from './modules/routes/entities/route.entity';
import { RouteSuggestion } from './modules/routes/entities/route-suggestion.entity';
import { StopEntity } from './modules/stops/entities/stop.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, firebaseConfig, googleMapsConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        entities: [UserEntity, RouteEntity, RouteSuggestion, StopEntity],
        synchronize: config.get<string>('app.nodeEnv') === 'development',
        logging: config.get<string>('app.nodeEnv') === 'development',
      }),
    }),
    AuthModule,
    UsersModule,
    RoutesModule,
    PlannerModule,
  ],
})
export class AppModule {}
