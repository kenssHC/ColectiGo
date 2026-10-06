import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import type { FirebaseAuthPayload } from './interfaces/firebase-auth-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly configService: ConfigService) {
    this.initializeFirebase();
  }

  async verifyToken(token: string): Promise<FirebaseAuthPayload> {
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      return {
        uid: decoded.uid,
        email: decoded.email ?? '',
        name: (decoded.name as string | undefined) ?? '',
        isAdmin: decoded.admin === true,
      };
    } catch (error) {
      this.logger.warn('Token de Firebase inválido', error);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  private initializeFirebase(): void {
    if (admin.apps.length > 0) {
      return;
    }

    const projectId = this.configService.get<string>('firebase.projectId');
    const clientEmail = this.configService.get<string>('firebase.clientEmail');
    const privateKey = this.configService.get<string>('firebase.privateKey');

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } catch (error) {
      throw new Error(
        'No se pudo inicializar Firebase Admin. Revisa FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY en el archivo .env. ' +
          `Detalle: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
