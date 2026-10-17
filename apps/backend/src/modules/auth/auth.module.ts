import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleAuthService } from './google-auth.service';
import { GoogleTokenVerifierService } from './google-token-verifier.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, GoogleAuthService, GoogleTokenVerifierService],
  exports: [AuthService],
})
export class AuthModule {}
