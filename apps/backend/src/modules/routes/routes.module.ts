import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutesService } from './routes.service';
import { RoutesController } from './routes.controller';
import { RouteEntity } from './entities/route.entity';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { RouteSuggestionsService } from './route-suggestions.service';

@Module({
  imports: [TypeOrmModule.forFeature([RouteEntity]), AuthModule, MailModule],
  providers: [RoutesService, RouteSuggestionsService],
  controllers: [RoutesController],
  exports: [RoutesService],
})
export class RoutesModule {}
