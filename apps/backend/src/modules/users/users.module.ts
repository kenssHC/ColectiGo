import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserEntity } from './entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { AuthIdentityEntity } from '../auth/entities/auth-identity.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, AuthIdentityEntity]),
    AuthModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
