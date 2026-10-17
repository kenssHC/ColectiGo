import { createHash } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource, QueryFailedError, Raw } from 'typeorm';
import type { EntityManager, FindOperator } from 'typeorm';
import { AuthService } from './auth.service';
import { GoogleTokenVerifierService } from './google-token-verifier.service';
import {
  AUTH_PROVIDER_GOOGLE,
  AuthIdentityEntity,
} from './entities/auth-identity.entity';
import { UserEntity } from '../users/entities/user.entity';
import type { FirebaseAuthPayload } from './interfaces/firebase-auth-payload.interface';
import type { VerifiedGoogleProfile } from './interfaces/google-profile.interface';

const PG_UNIQUE_VIOLATION = '23505';
const RECENT_PASSWORD_AUTH_SECONDS = 5 * 60;

interface PublicUser {
  id: string;
  firebaseUid: string;
  displayName: string;
  email: string;
  createdAt: Date;
}

export type GoogleAuthenticationResult =
  | {
      status: 'authenticated';
      firebaseCustomToken: string;
      user: PublicUser;
    }
  | {
      status: 'link_required';
      email: string;
      displayName: string;
    };

export interface GoogleLinkResult {
  status: 'linked';
  user: PublicUser;
}

class LinkRequiredError extends Error {}

function emailEquals(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function emailWhere(email: string): FindOperator<string> {
  // TypeORM tipa Raw como FindOperator<any>, aunque el operador se aplica a una columna string.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return Raw<string>((alias) => `LOWER(${alias}) = LOWER(:email)`, { email });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string } | undefined)?.code ===
      PG_UNIQUE_VIOLATION
  );
}

function googleFirebaseUid(subject: string): string {
  const digest = createHash('sha256').update(`google:${subject}`).digest('hex');
  return `google_${digest}`;
}

function publicUser(user: UserEntity): PublicUser {
  return {
    id: user.id,
    firebaseUid: user.firebaseUid,
    displayName: user.displayName,
    email: user.email,
    createdAt: user.createdAt,
  };
}

@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly firebaseAuth: AuthService,
    private readonly googleVerifier: GoogleTokenVerifierService,
  ) {}

  async authenticate(idToken: string): Promise<GoogleAuthenticationResult> {
    const profile = await this.googleVerifier.verify(idToken);
    const identityRepository =
      this.dataSource.getRepository(AuthIdentityEntity);
    const userRepository = this.dataSource.getRepository(UserEntity);

    const knownIdentity = await identityRepository.findOne({
      where: {
        provider: AUTH_PROVIDER_GOOGLE,
        providerUserId: profile.subject,
      },
      relations: { user: true },
    });

    if (knownIdentity) {
      knownIdentity.providerEmail = profile.email;
      knownIdentity.lastUsedAt = new Date();
      await identityRepository.save(knownIdentity);
      return this.authenticated(knownIdentity.user);
    }

    const expectedFirebaseUid = googleFirebaseUid(profile.subject);
    const [firebaseByEmail, localByEmail] = await Promise.all([
      this.firebaseAuth.findUserByEmail(profile.email),
      userRepository.findOne({ where: { email: emailWhere(profile.email) } }),
    ]);

    if (
      (firebaseByEmail && firebaseByEmail.uid !== expectedFirebaseUid) ||
      (localByEmail && localByEmail.firebaseUid !== expectedFirebaseUid)
    ) {
      return this.linkRequired(profile);
    }

    await this.firebaseAuth.ensureGoogleUser({
      uid: expectedFirebaseUid,
      email: profile.email,
      displayName: profile.name,
      photoUrl: profile.picture,
    });

    try {
      const user = await this.dataSource.transaction((manager) =>
        this.createGoogleIdentity(manager, expectedFirebaseUid, profile),
      );
      return this.authenticated(user);
    } catch (error) {
      if (error instanceof LinkRequiredError) {
        return this.linkRequired(profile);
      }
      if (isUniqueViolation(error)) {
        const concurrent = await identityRepository.findOne({
          where: {
            provider: AUTH_PROVIDER_GOOGLE,
            providerUserId: profile.subject,
          },
          relations: { user: true },
        });
        if (concurrent) return this.authenticated(concurrent.user);
      }
      throw error;
    }
  }

  async link(
    idToken: string,
    currentUser: FirebaseAuthPayload,
  ): Promise<GoogleLinkResult> {
    const profile = await this.googleVerifier.verify(idToken);
    if (!currentUser.email || !emailEquals(currentUser.email, profile.email)) {
      throw new ConflictException(
        'La cuenta Google debe usar el mismo correo que la cuenta actual',
      );
    }

    const identityRepository =
      this.dataSource.getRepository(AuthIdentityEntity);
    const knownIdentity = await identityRepository.findOne({
      where: {
        provider: AUTH_PROVIDER_GOOGLE,
        providerUserId: profile.subject,
      },
      relations: { user: true },
    });

    if (knownIdentity) {
      if (knownIdentity.user.firebaseUid !== currentUser.uid) {
        throw new ConflictException(
          'Esta cuenta Google ya está vinculada a otro usuario',
        );
      }
      return { status: 'linked', user: publicUser(knownIdentity.user) };
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (
      currentUser.signInProvider !== 'password' ||
      nowSeconds - currentUser.authTime > RECENT_PASSWORD_AUTH_SECONDS
    ) {
      throw new UnauthorizedException(
        'Vuelve a ingresar tu contraseña antes de vincular Google',
      );
    }

    const user = await this.ensureCurrentUser(currentUser);
    const identityForUser = await identityRepository.findOne({
      where: { userId: user.id, provider: AUTH_PROVIDER_GOOGLE },
    });
    if (identityForUser && identityForUser.providerUserId !== profile.subject) {
      throw new ConflictException(
        'El usuario ya tiene otra cuenta Google vinculada',
      );
    }

    if (!identityForUser) {
      try {
        await identityRepository.save(
          identityRepository.create({
            userId: user.id,
            provider: AUTH_PROVIDER_GOOGLE,
            providerUserId: profile.subject,
            providerEmail: profile.email,
            lastUsedAt: new Date(),
          }),
        );
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        const concurrent = await identityRepository.findOne({
          where: {
            provider: AUTH_PROVIDER_GOOGLE,
            providerUserId: profile.subject,
          },
        });
        if (!concurrent || concurrent.userId !== user.id) {
          throw new ConflictException('Esta cuenta Google ya está vinculada');
        }
      }
    }

    await this.firebaseAuth.applyGoogleProfile(currentUser.uid, {
      displayName: profile.name,
      photoUrl: profile.picture,
    });

    return { status: 'linked', user: publicUser(user) };
  }

  private async authenticated(
    user: UserEntity,
  ): Promise<GoogleAuthenticationResult> {
    return {
      status: 'authenticated',
      firebaseCustomToken: await this.firebaseAuth.createCustomToken(
        user.firebaseUid,
      ),
      user: publicUser(user),
    };
  }

  private linkRequired(
    profile: VerifiedGoogleProfile,
  ): GoogleAuthenticationResult {
    return {
      status: 'link_required',
      email: profile.email,
      displayName: profile.name,
    };
  }

  private async createGoogleIdentity(
    manager: EntityManager,
    firebaseUid: string,
    profile: VerifiedGoogleProfile,
  ): Promise<UserEntity> {
    const userRepository = manager.getRepository(UserEntity);
    const identityRepository = manager.getRepository(AuthIdentityEntity);
    let user = await userRepository.findOne({ where: { firebaseUid } });

    if (!user) {
      const emailOwner = await userRepository.findOne({
        where: { email: emailWhere(profile.email) },
      });
      if (emailOwner && emailOwner.firebaseUid !== firebaseUid) {
        throw new LinkRequiredError();
      }
      user =
        emailOwner ??
        (await userRepository.save(
          userRepository.create({
            firebaseUid,
            email: profile.email,
            displayName: profile.name,
          }),
        ));
    }

    await identityRepository.save(
      identityRepository.create({
        userId: user.id,
        provider: AUTH_PROVIDER_GOOGLE,
        providerUserId: profile.subject,
        providerEmail: profile.email,
        lastUsedAt: new Date(),
      }),
    );
    return user;
  }

  private async ensureCurrentUser(
    currentUser: FirebaseAuthPayload,
  ): Promise<UserEntity> {
    const userRepository = this.dataSource.getRepository(UserEntity);
    const existing = await userRepository.findOne({
      where: { firebaseUid: currentUser.uid },
    });
    if (existing) return existing;

    try {
      return await userRepository.save(
        userRepository.create({
          firebaseUid: currentUser.uid,
          email: currentUser.email.trim().toLowerCase(),
          displayName: currentUser.name || currentUser.email.split('@')[0],
        }),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        const concurrent = await userRepository.findOne({
          where: { firebaseUid: currentUser.uid },
        });
        if (concurrent) return concurrent;
      }
      throw error;
    }
  }
}
