import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { UsersService } from './users.service';
import type { Repository } from 'typeorm';
import type { UserEntity } from './entities/user.entity';
import type { AuthIdentityEntity } from '../auth/entities/auth-identity.entity';
import type { AuthService } from '../auth/auth.service';

type MockRepository = {
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  delete: jest.Mock;
};

function makeUniqueViolation(): QueryFailedError {
  const driverError = Object.assign(new Error('duplicate key'), {
    code: '23505',
  });
  return new QueryFailedError('INSERT', [], driverError);
}

describe('UsersService', () => {
  let repository: MockRepository;
  let identityRepository: { find: jest.Mock };
  let authService: { findUserByUid: jest.Mock; deleteUser: jest.Mock };
  let service: UsersService;

  const dto = {
    firebaseUid: 'uid-1',
    email: 'test@correo.com',
    displayName: 'Test',
  };

  const savedUser = { id: 'user-1', ...dto } as unknown as UserEntity;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn(
        (input: typeof dto): UserEntity => input as unknown as UserEntity,
      ),
      save: jest.fn(),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    identityRepository = { find: jest.fn().mockResolvedValue([]) };
    authService = {
      findUserByUid: jest.fn().mockResolvedValue(null),
      deleteUser: jest.fn().mockResolvedValue(undefined),
    };
    service = new UsersService(
      repository as unknown as Repository<UserEntity>,
      identityRepository as unknown as Repository<AuthIdentityEntity>,
      authService as unknown as AuthService,
    );
  });

  describe('createOrFind', () => {
    it('devuelve el usuario existente sin crear otro', async () => {
      repository.findOne.mockResolvedValueOnce(savedUser);

      const result = await service.createOrFind(dto);

      expect(result).toBe(savedUser);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('crea el usuario cuando no existe', async () => {
      repository.findOne.mockResolvedValueOnce(null);
      repository.save.mockResolvedValueOnce(savedUser);

      const result = await service.createOrFind(dto);

      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(savedUser);
    });

    it('resuelve la carrera de creación concurrente devolviendo el usuario ya creado', async () => {
      repository.findOne.mockResolvedValueOnce(null);
      repository.save.mockRejectedValueOnce(makeUniqueViolation());
      repository.findOne.mockResolvedValueOnce(savedUser);

      const result = await service.createOrFind(dto);

      expect(result).toBe(savedUser);
    });

    it('lanza ConflictException si el email pertenece a otro usuario', async () => {
      repository.findOne.mockResolvedValueOnce(null);
      repository.save.mockRejectedValueOnce(makeUniqueViolation());
      repository.findOne.mockResolvedValueOnce(null);

      await expect(service.createOrFind(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('propaga errores que no son violaciones de unicidad', async () => {
      const unexpected = new Error('conexión perdida');
      repository.findOne.mockResolvedValueOnce(null);
      repository.save.mockRejectedValueOnce(unexpected);

      await expect(service.createOrFind(dto)).rejects.toBe(unexpected);
    });
  });

  describe('findByFirebaseUid', () => {
    it('devuelve el usuario cuando existe', async () => {
      repository.findOne.mockResolvedValueOnce(savedUser);

      await expect(service.findByFirebaseUid('uid-1')).resolves.toBe(savedUser);
    });

    it('lanza NotFoundException cuando no existe', async () => {
      repository.findOne.mockResolvedValueOnce(null);

      await expect(service.findByFirebaseUid('uid-x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getProfile', () => {
    it('combina los métodos de contraseña y Google sin duplicarlos', async () => {
      repository.findOne.mockResolvedValueOnce(savedUser);
      identityRepository.find.mockResolvedValueOnce([
        { provider: 'google' },
      ] as AuthIdentityEntity[]);
      authService.findUserByUid.mockResolvedValueOnce({
        providerData: [{ providerId: 'password' }],
        photoURL: 'https://example.com/avatar.png',
        emailVerified: true,
      });

      const result = await service.getProfile('uid-1');

      expect(result.authMethods).toEqual(['password', 'google']);
      expect(result.avatarUrl).toBe('https://example.com/avatar.png');
      expect(result.emailVerified).toBe(true);
    });
  });

  describe('deleteAccount', () => {
    it('elimina los datos locales antes de borrar la cuenta de Firebase', async () => {
      await service.deleteAccount('uid-1');

      expect(repository.delete).toHaveBeenCalledWith({ firebaseUid: 'uid-1' });
      expect(authService.deleteUser).toHaveBeenCalledWith('uid-1');
      expect(repository.delete.mock.invocationCallOrder[0]).toBeLessThan(
        authService.deleteUser.mock.invocationCallOrder[0],
      );
    });

    it('no borra Firebase si falla la eliminación local', async () => {
      repository.delete.mockRejectedValueOnce(new Error('database error'));

      await expect(service.deleteAccount('uid-1')).rejects.toThrow(
        'database error',
      );
      expect(authService.deleteUser).not.toHaveBeenCalled();
    });
  });
});
