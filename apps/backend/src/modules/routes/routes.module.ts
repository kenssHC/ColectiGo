import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutesService } from './routes.service';
import { RoutesController } from './routes.controller';
import { RouteEntity } from './entities/route.entity';
import { RouteSuggestion } from './entities/route-suggestion.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { RouteSuggestionsService } from './route-suggestions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RouteEntity, RouteSuggestion]),
    AuthModule,
    UsersModule,
    MailModule,
  ],
  providers: [RoutesService, RouteSuggestionsService],
  controllers: [RoutesController],
  exports: [RoutesService],
})
export class RoutesModule {}
