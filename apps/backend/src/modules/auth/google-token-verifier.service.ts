import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import type { VerifiedGoogleProfile } from './interfaces/google-profile.interface';

@Injectable()
export class GoogleTokenVerifierService {
  private readonly logger = new Logger(GoogleTokenVerifierService.name);
  private readonly client = new OAuth2Client();

  constructor(private readonly configService: ConfigService) {}

  async verify(idToken: string): Promise<VerifiedGoogleProfile> {
    const audience = this.configService
      .get<string>('googleAuth.webClientId')
      ?.trim();
    if (!audience) {
      throw new ServiceUnavailableException(
        'El inicio con Google todavía no está configurado en el servidor',
      );
    }

    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience });
      const payload = ticket.getPayload();

      if (!payload?.sub || !payload.email) {
        throw new UnauthorizedException(
          'El token de Google no contiene una identidad válida',
        );
      }
      if (payload.email_verified !== true) {
        throw new UnauthorizedException(
          'Google no confirmó el correo de esta cuenta',
        );
      }

      return {
        subject: payload.sub,
        email: payload.email.trim().toLowerCase(),
        name: payload.name?.trim() || payload.email.split('@')[0],
        picture: payload.picture ?? null,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn(
        `Google rechazó una credencial: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new UnauthorizedException('Token de Google inválido o expirado');
    }
  }
}
