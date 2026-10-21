import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import type { UserProfile } from './users.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { FirebaseAuthPayload } from '../auth/interfaces/firebase-auth-payload.interface';

const RECENT_AUTH_MAX_AGE_SECONDS = 5 * 60;

@Controller('users')
export class UsersController {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
  ) {}

  /** Crea (o devuelve) el usuario local a partir del token de Firebase. No requiere body. */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FirebaseAuthGuard)
  async sync(
    @CurrentUser() currentUser: FirebaseAuthPayload,
  ): Promise<UserProfile> {
    await this.usersService.createOrFind({
      firebaseUid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.name || currentUser.email.split('@')[0],
    });
    return this.usersService.getProfile(currentUser.uid);
  }

  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  getMe(@CurrentUser() currentUser: FirebaseAuthPayload): Promise<UserProfile> {
    return this.usersService.getProfile(currentUser.uid);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(FirebaseAuthGuard)
  async deleteMe(
    @CurrentUser() currentUser: FirebaseAuthPayload,
  ): Promise<void> {
    const tokenAgeSeconds =
      Math.floor(Date.now() / 1000) - currentUser.authTime;
    if (
      !Number.isFinite(tokenAgeSeconds) ||
      tokenAgeSeconds < 0 ||
      tokenAgeSeconds > RECENT_AUTH_MAX_AGE_SECONDS
    ) {
      throw new UnauthorizedException(
        'Por seguridad, vuelve a iniciar sesión antes de eliminar tu cuenta',
      );
    }

    await this.usersService.deleteAccount(currentUser.uid);
  }
}
