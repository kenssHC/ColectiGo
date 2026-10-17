/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { GoogleAuthService } from './google-auth.service';
import type { AuthService } from './auth.service';
import type { GoogleTokenVerifierService } from './google-token-verifier.service';
import { AuthIdentityEntity } from './entities/auth-identity.entity';
import { UserEntity } from '../users/entities/user.entity';
import type { FirebaseAuthPayload } from './interfaces/firebase-auth-payload.interface';

type MockRepository = {
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

describe('GoogleAuthService', () => {
  let identityRepository: MockRepository;
  let userRepository: MockRepository;
  let dataSource: { getRepository: jest.Mock; transaction: jest.Mock };
  let firebaseAuth: {
    findUserByEmail: jest.Mock;
    ensureGoogleUser: jest.Mock;
    createCustomToken: jest.Mock;
    applyGoogleProfile: jest.Mock;
  };
  let verifier: { verify: jest.Mock };
  let service: GoogleAuthService;

  const profile = {
    subject: 'google-sub-1',
    email: 'usuario@gmail.com',
    name: 'Usuario Google',
    picture: 'https://example.com/avatar.png',
  };
  const user = {
    id: 'user-1',
    firebaseUid: 'firebase-uid-1',
    email: profile.email,
    displayName: profile.name,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  } as UserEntity;

  beforeEach(() => {
    identityRepository = {
      findOne: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ ...user, ...value })),
    };
    dataSource = {
      getRepository: jest.fn((entity) =>
        entity === AuthIdentityEntity ? identityRepository : userRepository,
      ),
      transaction: jest.fn(),
    };
    firebaseAuth = {
      findUserByEmail: jest.fn(),
      ensureGoogleUser: jest.fn(),
      createCustomToken: jest.fn().mockResolvedValue('firebase-custom-token'),
      applyGoogleProfile: jest.fn(),
    };
    verifier = { verify: jest.fn().mockResolvedValue(profile) };
    service = new GoogleAuthService(
      dataSource as unknown as DataSource,
      firebaseAuth as unknown as AuthService,
      verifier as unknown as GoogleTokenVerifierService,
    );
  });

  it('inicia sesión para una identidad Google existente', async () => {
    identityRepository.findOne.mockResolvedValueOnce({
      user,
      providerEmail: profile.email,
      lastUsedAt: null,
    });

    const result = await service.authenticate('google-token');

    expect(result.status).toBe('authenticated');
    if (result.status === 'authenticated') {
      expect(result.firebaseCustomToken).toBe('firebase-custom-token');
    }
    expect(firebaseAuth.createCustomToken).toHaveBeenCalledWith(
      user.firebaseUid,
    );
  });

  it('exige vinculación si el correo ya pertenece a una cuenta tradicional', async () => {
    identityRepository.findOne.mockResolvedValueOnce(null);
    firebaseAuth.findUserByEmail.mockResolvedValueOnce({ uid: 'password-uid' });
    userRepository.findOne.mockResolvedValueOnce(user);

    await expect(service.authenticate('google-token')).resolves.toEqual({
      status: 'link_required',
      email: profile.email,
      displayName: profile.name,
    });
    expect(firebaseAuth.ensureGoogleUser).not.toHaveBeenCalled();
  });

  it('crea un usuario nuevo y emite una sesión Firebase', async () => {
    identityRepository.findOne.mockResolvedValueOnce(null);
    firebaseAuth.findUserByEmail.mockResolvedValueOnce(null);
    userRepository.findOne.mockResolvedValueOnce(null);
    dataSource.transaction.mockResolvedValueOnce(user);

    const result = await service.authenticate('google-token');

    expect(firebaseAuth.ensureGoogleUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: profile.email,
        displayName: profile.name,
      }),
    );
    expect(dataSource.transaction).toHaveBeenCalled();
    expect(result.status).toBe('authenticated');
  });

  it('rechaza vincular si no hubo autenticación reciente con contraseña', async () => {
    identityRepository.findOne.mockResolvedValueOnce(null);
    const currentUser = {
      uid: user.firebaseUid,
      email: user.email,
      name: user.displayName,
      isAdmin: false,
      signInProvider: 'custom',
      authTime: Math.floor(Date.now() / 1000),
    } satisfies FirebaseAuthPayload;

    await expect(
      service.link('google-token', currentUser),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('vincula Google después de comprobar una contraseña reciente', async () => {
    identityRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    userRepository.findOne.mockResolvedValueOnce(user);
    const currentUser = {
      uid: user.firebaseUid,
      email: user.email,
      name: user.displayName,
      isAdmin: false,
      signInProvider: 'password',
      authTime: Math.floor(Date.now() / 1000),
    } satisfies FirebaseAuthPayload;

    await expect(service.link('google-token', currentUser)).resolves.toEqual({
      status: 'linked',
      user: expect.objectContaining({ id: user.id }),
    });
    expect(identityRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        providerUserId: profile.subject,
      }),
    );
    expect(firebaseAuth.applyGoogleProfile).toHaveBeenCalled();
  });

  it('impide vincular una identidad Google que pertenece a otro usuario', async () => {
    identityRepository.findOne.mockResolvedValueOnce({
      user: { ...user, firebaseUid: 'other-firebase-uid' },
    });
    const currentUser = {
      uid: user.firebaseUid,
      email: user.email,
      name: user.displayName,
      isAdmin: false,
      signInProvider: 'password',
      authTime: Math.floor(Date.now() / 1000),
    } satisfies FirebaseAuthPayload;

    await expect(
      service.link('google-token', currentUser),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
