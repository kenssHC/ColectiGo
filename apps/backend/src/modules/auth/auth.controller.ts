import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GoogleTokenDto } from './dto/google-token.dto';
import { GoogleAuthService } from './google-auth.service';
import type { FirebaseAuthPayload } from './interfaces/firebase-auth-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly googleAuthService: GoogleAuthService) {}

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  authenticateWithGoogle(@Body() dto: GoogleTokenDto) {
    return this.googleAuthService.authenticate(dto.idToken);
  }

  @Post('google/link')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(FirebaseAuthGuard)
  linkGoogle(
    @Body() dto: GoogleTokenDto,
    @CurrentUser() currentUser: FirebaseAuthPayload,
  ) {
    return this.googleAuthService.link(dto.idToken, currentUser);
  }
}
