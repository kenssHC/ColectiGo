import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { UsersService } from './users.service';
import type { Repository } from 'typeorm';
import type { UserEntity } from './entities/user.entity';

type MockRepository = {
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

function makeUniqueViolation(): QueryFailedError {
  const driverError = Object.assign(new Error('duplicate key'), { code: '23505' });
  return new QueryFailedError('INSERT', [], driverError);
}

describe('UsersService', () => {
  let repository: MockRepository;
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
      create: jest.fn((input) => input),
      save: jest.fn(),
    };
    service = new UsersService(repository as unknown as Repository<UserEntity>);
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

      await expect(service.createOrFind(dto)).rejects.toBeInstanceOf(ConflictException);
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

      await expect(service.findByFirebaseUid('uid-x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
