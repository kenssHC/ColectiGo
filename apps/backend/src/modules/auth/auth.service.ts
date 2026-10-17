import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import type { UserRecord } from 'firebase-admin/auth';
import type { FirebaseAuthPayload } from './interfaces/firebase-auth-payload.interface';

interface EnsureFirebaseUserInput {
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
}

function firebaseErrorCode(error: unknown): string | undefined {
  return (error as { code?: string } | null)?.code;
}

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
        signInProvider: decoded.firebase?.sign_in_provider ?? '',
        authTime: decoded.auth_time,
      };
    } catch (error) {
      this.logger.warn('Token de Firebase inválido', error);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  createCustomToken(uid: string): Promise<string> {
    return admin.auth().createCustomToken(uid, { authProvider: 'google' });
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    try {
      return await admin.auth().getUserByEmail(email);
    } catch (error) {
      if (firebaseErrorCode(error) === 'auth/user-not-found') return null;
      throw error;
    }
  }

  async findUserByUid(uid: string): Promise<UserRecord | null> {
    try {
      return await admin.auth().getUser(uid);
    } catch (error) {
      if (firebaseErrorCode(error) === 'auth/user-not-found') return null;
      throw error;
    }
  }

  async ensureGoogleUser(input: EnsureFirebaseUserInput): Promise<UserRecord> {
    const existing = await this.findUserByUid(input.uid);
    if (existing) {
      if (existing.email?.toLowerCase() !== input.email.toLowerCase()) {
        throw new ConflictException(
          'La identidad Google está asociada a otro correo',
        );
      }
      return existing;
    }

    try {
      return await admin.auth().createUser({
        uid: input.uid,
        email: input.email,
        emailVerified: true,
        displayName: input.displayName,
        ...(input.photoUrl ? { photoURL: input.photoUrl } : {}),
      });
    } catch (error) {
      if (firebaseErrorCode(error) === 'auth/uid-already-exists') {
        const concurrent = await this.findUserByUid(input.uid);
        if (concurrent) return concurrent;
      }
      if (firebaseErrorCode(error) === 'auth/email-already-exists') {
        throw new ConflictException('Ya existe una cuenta con este correo');
      }
      throw error;
    }
  }

  async applyGoogleProfile(
    uid: string,
    profile: { displayName: string; photoUrl: string | null },
  ): Promise<void> {
    const current = await admin.auth().getUser(uid);
    await admin.auth().updateUser(uid, {
      emailVerified: true,
      ...(!current.displayName && profile.displayName
        ? { displayName: profile.displayName }
        : {}),
      ...(!current.photoURL && profile.photoUrl
        ? { photoURL: profile.photoUrl }
        : {}),
    });
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
